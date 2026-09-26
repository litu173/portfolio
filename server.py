#!/usr/bin/env python3
"""Local server for the portfolio + Loom.

Serves the static site, lets the CMS / design system / palette lab / Loom save files into this
folder, and provides Loom accounts (sign up, log in, profile, password, delete account).

    python3 server.py            # http://localhost:5174
    python3 server.py 8080       # custom port

Loom AI: set ANTHROPIC_API_KEY (and `pip install anthropic`) to enable the agent team at /__ai/run
(signed-in users only, rate-limited). Without it, Loom uses its built-in local agents.

Writable paths: tokens.css, content/content.js, assets/work/**, assets/video/**,
loom/projects/*.json, loom/assets/**, sites/**. Loom paths require a signed-in user.
Accounts live in loom/data/ (git-ignored, never served over HTTP). Passwords are hashed with
PBKDF2-SHA256; sessions are random tokens in an HttpOnly, SameSite=Lax cookie.
It listens on localhost only. Production (e.g. GitHub Pages) stays a plain static site.
"""
import base64, hashlib, hmac, http.server, json, os, re, secrets, sys, threading, time
import loom_ai
from http.cookies import SimpleCookie
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
ALLOWED = [r'^tokens\.css$', r'^content/content\.js$', r'^assets/work/[\w./-]+\.(webp|png|jpe?g|gif|svg|mp4|webm)$', r'^assets/video/[\w./-]+\.(mp4|webm)$',
           # Loom editor: project files, uploaded images, published sites (signed-in users only)
           r'^loom/projects/[\w-]+\.json$', r'^loom/assets/[\w-]+/[\w.-]+\.(webp|png|jpe?g|gif)$', r'^sites/[\w-]+/[\w.-]+\.(html|css|js|xml|txt|svg)$']
LOOM_PATHS = ('loom/', 'sites/')
MAX_BYTES = 60 * 1024 * 1024
DATA = os.path.join(ROOT, 'loom', 'data')
USERS_F, SESS_F = os.path.join(DATA, 'users.json'), os.path.join(DATA, 'sessions.json')
SITES_F = os.path.join(DATA, 'sites.json')  # published site slug -> owner id
PROJ_DIR = os.path.join(ROOT, 'loom', 'projects')
INDEX_F = os.path.join(PROJ_DIR, 'index.json')
ID_RE = re.compile(r'^[\w-]{1,120}$')
COOKIE = 'loom_session'
SESSION_DAYS = 30
PBKDF2_ITERS = 310_000
LOCK = threading.Lock()
FAILS = {}  # email -> [timestamps] for simple brute-force protection


# ------------------------------------------------------------------ storage helpers
def _load(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _store(path, data):
    os.makedirs(DATA, exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1)
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def hash_pw(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERS)
    return f'pbkdf2_sha256${PBKDF2_ITERS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}'


def check_pw(password, stored):
    try:
        _, iters, salt, dk = stored.split('$')
        test = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), base64.b64decode(salt), int(iters))
        return hmac.compare_digest(test, base64.b64decode(dk))
    except Exception:  # noqa: BLE001
        return False


def public(u):
    return {k: u.get(k) for k in ('id', 'name', 'email', 'bio', 'avatarColor', 'prefs', 'created')}


EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # -------------------------------------------------------------- plumbing
    def end_headers(self):
        if urlparse(self.path).path.startswith('/sites/'):
            # Published sites are untrusted content: run them in an opaque origin so they can't use Loom sessions
            self.send_header('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def _json(self, code, data, cookie=None):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length', 0))
        if n > MAX_BYTES:
            raise ValueError('request too large')
        return json.loads(self.rfile.read(n) or b'{}')

    def _local(self):
        return self.client_address[0] in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

    def _same_origin(self):
        # Reject cross-site requests (CSRF): Origin, when present, must be this server
        origin = self.headers.get('Origin')
        if not origin:
            return True
        host = urlparse(origin).netloc
        return host == self.headers.get('Host')

    def _session_token(self):
        c = SimpleCookie(self.headers.get('Cookie', ''))
        return c[COOKIE].value if COOKIE in c else None

    def _user(self):
        tok = self._session_token()
        if not tok:
            return None
        with LOCK:
            sessions = _load(SESS_F, {})
            s = sessions.get(hashlib.sha256(tok.encode()).hexdigest())
            if not s or s['exp'] < time.time():
                return None
            return next((u for u in _load(USERS_F, []) if u['id'] == s['uid']), None)

    def _new_session(self, uid):
        tok = secrets.token_urlsafe(32)
        with LOCK:
            sessions = {k: v for k, v in _load(SESS_F, {}).items() if v['exp'] > time.time()}
            sessions[hashlib.sha256(tok.encode()).hexdigest()] = {'uid': uid, 'exp': time.time() + SESSION_DAYS * 86400, 'created': time.time()}
            _store(SESS_F, sessions)
        return f'{COOKIE}={tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_DAYS * 86400}'

    @staticmethod
    def _clear_cookie():
        return f'{COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'

    # -------------------------------------------------------------- GET
    def do_GET(self):
        path = urlparse(self.path).path
        real = os.path.realpath(self.translate_path(self.path))
        data_dir = os.path.realpath(DATA)
        if real == data_dir or real.startswith(data_dir + os.sep) or real.lower().startswith(data_dir.lower() + os.sep) or real.endswith('.tmp'):
            return self._json(404, {'ok': False, 'error': 'not found'})  # never serve account data, however the path is spelled
        if real.startswith(os.path.realpath(PROJ_DIR) + os.sep):
            return self._project_get(os.path.basename(real))
        if path == '/__save/ping':
            return self._json(200, {'ok': True, 'root': os.path.basename(ROOT), 'auth': True})
        if path == '/__auth/me':
            u = self._user()
            return self._json(200, {'ok': True, 'user': public(u) if u else None})  # 200 either way: signed-out is a normal state
        if path == '/__ai/status':
            return self._json(200, loom_ai.status())
        if path == '/__auth/export':
            u = self._user()
            if not u:
                return self._json(401, {'ok': False, 'error': 'not signed in'})
            idx = _load(INDEX_F, [])
            return self._json(200, {'ok': True, 'profile': public(u), 'projects': [p for p in idx if p.get('owner') == u['id'] and not p.get('deleted')]})
        return super().do_GET()

    # -------------------------------------------------------------- POST
    def do_POST(self):
        if not self._local():
            return self._json(403, {'ok': False, 'error': 'local only'})
        if not self._same_origin():
            return self._json(403, {'ok': False, 'error': 'cross-site request blocked'})
        path = urlparse(self.path).path
        try:
            if path.startswith('/__auth/'):
                return self._auth(path[len('/__auth/'):], self._body())
            if path.startswith('/__save'):
                return self._save(self._body())
            if path == '/__ai/run':
                return self._ai(self._body())
            return self._json(404, {'ok': False, 'error': 'not found'})
        except Exception as e:  # noqa: BLE001
            return self._json(500, {'ok': False, 'error': str(e)})

    def _project_get(self, name):
        u = self._user()
        if name == 'index.json':
            idx = _load(INDEX_F, [])
            return self._json(200, [p for p in idx if u and p.get('owner') == u['id'] and not p.get('deleted')])
        m = re.match(r'^([\w-]+)\.json$', name)
        p = _load(os.path.join(PROJ_DIR, name), None) if m else None
        if not u or not p or p.get('owner') != u['id']:
            return self._json(404, {'ok': False, 'error': 'not found'})
        return self._json(200, p)

    def _update_index(self, proj, uid):
        idx = [p for p in _load(INDEX_F, []) if p.get('id') != proj.get('id')]
        if not proj.get('deleted'):
            idx.insert(0, {'id': proj['id'], 'name': str(proj.get('name', ''))[:120], 'slug': str(proj.get('slug', ''))[:80], 'owner': uid,
                           'updated': proj.get('updated'), 'pages': len(proj.get('pages') or []), 'published': proj.get('published')})
        _store(INDEX_F, idx)

    def _save(self, req):
        rel = str(req.get('path', '')).replace('\\', '/').lstrip('/')
        if '..' in rel or not any(re.match(p, rel) for p in ALLOWED):
            return self._json(400, {'ok': False, 'error': f'path not allowed: {rel}'})
        if rel.startswith(LOOM_PATHS):
            u = self._user()
            if not u:
                return self._json(401, {'ok': False, 'error': 'sign in to save Loom projects'})
            data = base64.b64decode(req['base64']) if 'base64' in req else str(req.get('text', '')).encode('utf-8')
            m = re.match(r'^loom/projects/([\w-]+)\.json$', rel)
            if m and m.group(1) == 'index':
                return self._json(200, {'ok': True, 'ignored': True})  # the server maintains the index itself
            with LOCK:
                if m:
                    existing = _load(os.path.join(ROOT, rel), None)
                    if existing and existing.get('owner') and existing['owner'] != u['id']:
                        return self._json(403, {'ok': False, 'error': 'this project belongs to another account'})
                    try:
                        proj = json.loads(data)
                    except ValueError:
                        return self._json(400, {'ok': False, 'error': 'invalid project JSON'})
                    if not isinstance(proj, dict) or proj.get('id') != m.group(1):
                        return self._json(400, {'ok': False, 'error': 'project id does not match file name'})
                    proj['owner'] = u['id']
                    data = json.dumps(proj).encode('utf-8')
                    self._write(rel, data)
                    self._update_index(proj, u['id'])
                    return self._json(200, {'ok': True, 'path': rel, 'bytes': len(data)})
                site = re.match(r'^sites/([\w-]+)/', rel)
                if site:
                    owners = _load(SITES_F, {})
                    if owners.get(site.group(1), u['id']) != u['id']:
                        return self._json(403, {'ok': False, 'error': 'That site address is taken by another account. Rename the project and publish again.'})
                    if site.group(1) not in owners:
                        owners[site.group(1)] = u['id']; _store(SITES_F, owners)
                asset = re.match(r'^loom/assets/([\w-]+)/', rel)
                if asset:
                    proj = _load(os.path.join(PROJ_DIR, asset.group(1) + '.json'), None)
                    if proj and proj.get('owner') not in (None, u['id']):
                        return self._json(403, {'ok': False, 'error': 'this project belongs to another account'})
                self._write(rel, data)
            return self._json(200, {'ok': True, 'path': rel, 'bytes': len(data)})
        data = base64.b64decode(req['base64']) if 'base64' in req else str(req.get('text', '')).encode('utf-8')
        self._write(rel, data)
        return self._json(200, {'ok': True, 'path': rel, 'bytes': len(data)})

    def _write(self, rel, data):
        dest = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        tmp = dest + '.tmp'
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, dest)  # atomic: a half-written file never goes live
        self.log_message('saved %s (%d bytes)', rel, len(data))

    def _ai(self, req):
        u = self._user()
        if not u:
            return self._json(401, {'ok': False, 'error': 'Sign in to use Loom AI.'})
        st = loom_ai.status()
        if not st['available']:
            return self._json(503, {'ok': False, 'error': 'Loom AI is not configured on this server.', 'status': st})
        if not loom_ai.allowed(u['id']):
            return self._json(429, {'ok': False, 'error': 'AI limit reached (60 runs an hour). Try again later.'})
        try:
            r = loom_ai.run(str(req.get('agent', '')), req.get('request', ''), req.get('context', ''), req.get('mode'))
        except Exception as e:  # noqa: BLE001 — surface API errors without leaking the key
            self.log_message('ai error: %s', type(e).__name__)
            return self._json(502, {'ok': False, 'error': f'AI service error ({type(e).__name__}).'})
        self.log_message('ai %s by %s', req.get('agent'), u['id'])
        return self._json(200 if r.get('ok') else 422, r)

    def _auth(self, action, req):
        if action == 'signup':
            name = str(req.get('name', '')).strip()[:80]
            email = str(req.get('email', '')).strip().lower()
            pw = str(req.get('password', ''))
            if not name:
                return self._json(400, {'ok': False, 'error': 'Please enter your name.'})
            if not EMAIL_RE.match(email):
                return self._json(400, {'ok': False, 'error': 'Please enter a valid email address.'})
            if len(pw) < 8 or pw.lower() == pw or not re.search(r'\d', pw):
                return self._json(400, {'ok': False, 'error': 'Use at least 8 characters, with a capital letter and a number.'})
            if not req.get('acceptTerms'):
                return self._json(400, {'ok': False, 'error': 'Please accept the Terms and Privacy Policy.'})
            with LOCK:
                users = _load(USERS_F, [])
                if any(u['email'] == email for u in users):
                    return self._json(409, {'ok': False, 'error': 'An account with this email already exists. Try logging in.'})
                u = {'id': 'u-' + secrets.token_hex(6), 'name': name, 'email': email, 'pw': hash_pw(pw), 'bio': '', 'avatarColor': '#146EF5',
                     'prefs': {'marketing': False, 'productUpdates': True, 'editorTheme': 'dark', 'autosave': True}, 'created': int(time.time() * 1000)}
                users.append(u)
                _store(USERS_F, users)
            return self._json(200, {'ok': True, 'user': public(u)}, cookie=self._new_session(u['id']))

        if action == 'login':
            email = str(req.get('email', '')).strip().lower()
            pw = str(req.get('password', ''))
            now = time.time()
            recent = [t for t in FAILS.get(email, []) if now - t < 600]
            if len(recent) >= 5:
                return self._json(429, {'ok': False, 'error': 'Too many attempts. Please wait 10 minutes and try again.'})
            u = next((x for x in _load(USERS_F, []) if x['email'] == email), None)
            if not u or not check_pw(pw, u['pw']):
                FAILS[email] = recent + [now]
                return self._json(401, {'ok': False, 'error': 'Email or password is incorrect.'})
            FAILS.pop(email, None)
            return self._json(200, {'ok': True, 'user': public(u)}, cookie=self._new_session(u['id']))

        if action == 'logout':
            tok = self._session_token()
            if tok:
                with LOCK:
                    s = _load(SESS_F, {})
                    s.pop(hashlib.sha256(tok.encode()).hexdigest(), None)
                    _store(SESS_F, s)
            return self._json(200, {'ok': True}, cookie=self._clear_cookie())

        u = self._user()
        if not u:
            return self._json(401, {'ok': False, 'error': 'not signed in'})

        if action == 'profile':
            with LOCK:
                users = _load(USERS_F, [])
                me = next(x for x in users if x['id'] == u['id'])
                if 'name' in req:
                    me['name'] = str(req['name']).strip()[:80] or me['name']
                if 'bio' in req:
                    me['bio'] = str(req['bio'])[:280]
                if 'avatarColor' in req and re.match(r'^#[0-9a-fA-F]{6}$', str(req['avatarColor'])):
                    me['avatarColor'] = req['avatarColor']
                if 'email' in req:
                    email = str(req['email']).strip().lower()
                    if not EMAIL_RE.match(email):
                        return self._json(400, {'ok': False, 'error': 'Please enter a valid email address.'})
                    if any(x['email'] == email and x['id'] != me['id'] for x in users):
                        return self._json(409, {'ok': False, 'error': 'That email is used by another account.'})
                    me['email'] = email
                if isinstance(req.get('prefs'), dict):
                    me['prefs'] = {**me.get('prefs', {}), **{k: v for k, v in req['prefs'].items() if isinstance(v, (bool, str)) and len(str(v)) < 40}}
                _store(USERS_F, users)
            return self._json(200, {'ok': True, 'user': public(me)})

        if action == 'password':
            if not check_pw(str(req.get('current', '')), u['pw']):
                return self._json(401, {'ok': False, 'error': 'Your current password is incorrect.'})
            new = str(req.get('new', ''))
            if len(new) < 8 or new.lower() == new or not re.search(r'\d', new):
                return self._json(400, {'ok': False, 'error': 'Use at least 8 characters, with a capital letter and a number.'})
            with LOCK:
                users = _load(USERS_F, [])
                next(x for x in users if x['id'] == u['id'])['pw'] = hash_pw(new)
                _store(USERS_F, users)
                # sign out every other session
                keep = hashlib.sha256((self._session_token() or '').encode()).hexdigest()
                _store(SESS_F, {k: v for k, v in _load(SESS_F, {}).items() if v['uid'] != u['id'] or k == keep})
            return self._json(200, {'ok': True})

        if action == 'logout-all':
            with LOCK:
                _store(SESS_F, {k: v for k, v in _load(SESS_F, {}).items() if v['uid'] != u['id']})
            return self._json(200, {'ok': True}, cookie=self._clear_cookie())

        if action == 'delete':
            if not check_pw(str(req.get('password', '')), u['pw']):
                return self._json(401, {'ok': False, 'error': 'Password is incorrect.'})
            with LOCK:
                _store(USERS_F, [x for x in _load(USERS_F, []) if x['id'] != u['id']])
                _store(SESS_F, {k: v for k, v in _load(SESS_F, {}).items() if v['uid'] != u['id']})
                # delete by scanning real project files (never trust ids from the index)
                for name in os.listdir(PROJ_DIR):
                    m = re.match(r'^([\w-]+)\.json$', name)
                    if not m or name == 'index.json':
                        continue
                    pf = os.path.join(PROJ_DIR, name)
                    if (_load(pf, {}) or {}).get('owner') == u['id']:
                        os.remove(pf)
                _store(INDEX_F, [p for p in _load(INDEX_F, []) if p.get('owner') != u['id']])
                _store(SITES_F, {k: v for k, v in _load(SITES_F, {}).items() if v != u['id']})
            return self._json(200, {'ok': True}, cookie=self._clear_cookie())

        return self._json(404, {'ok': False, 'error': 'unknown action'})


if __name__ == '__main__':
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(('localhost', PORT), Handler)
    print(f'Portfolio + Loom running at http://localhost:{PORT}  (saving & accounts enabled — Ctrl+C to stop)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
