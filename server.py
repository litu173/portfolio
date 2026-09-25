#!/usr/bin/env python3
"""Local server for the portfolio: serves the static site AND lets the CMS, design system
and palette lab save files straight into this folder (works in any browser, no folder picker).

    python3 server.py            # http://localhost:5174
    python3 server.py 8080       # custom port

Only these paths can be written: tokens.css, content/content.js, assets/work/**, assets/video/**.
It listens on localhost only. Deploy the folder afterwards — production stays a plain static site.
"""
import base64, http.server, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
ALLOWED = [r'^tokens\.css$', r'^content/content\.js$', r'^assets/work/[\w./-]+\.(webp|png|jpe?g|gif|svg|mp4|webm)$', r'^assets/video/[\w./-]+\.(mp4|webm)$']
MAX_BYTES = 60 * 1024 * 1024


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # Always revalidate so edits show up immediately (no stale pages while designing)
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/__save/ping'):
            return self._json(200, {'ok': True, 'root': os.path.basename(ROOT)})
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith('/__save'):
            return self._json(404, {'ok': False, 'error': 'not found'})
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            return self._json(403, {'ok': False, 'error': 'local only'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            if n > MAX_BYTES:
                return self._json(413, {'ok': False, 'error': 'file too large'})
            req = json.loads(self.rfile.read(n))
            rel = str(req.get('path', '')).replace('\\', '/').lstrip('/')
            if '..' in rel or not any(re.match(p, rel) for p in ALLOWED):
                return self._json(400, {'ok': False, 'error': f'path not allowed: {rel}'})
            data = base64.b64decode(req['base64']) if 'base64' in req else str(req.get('text', '')).encode('utf-8')
            dest = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            tmp = dest + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, dest)  # atomic: a half-written file never goes live
            self.log_message('saved %s (%d bytes)', rel, len(data))
            return self._json(200, {'ok': True, 'path': rel, 'bytes': len(data)})
        except Exception as e:  # noqa: BLE001
            return self._json(500, {'ok': False, 'error': str(e)})


if __name__ == '__main__':
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(('localhost', PORT), Handler)
    print(f'Portfolio running at http://localhost:{PORT}  (saving enabled — Ctrl+C to stop)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
