/* LOOM — accounts (client).
   Talks to server.py (/__auth/*). If the Loom server isn't running (e.g. on GitHub Pages),
   visitors can use a clearly-labelled guest mode where everything stays in this browser.
   All pages that need an account call LoomAuth.require(). */
(() => {
  'use strict';
  const ROOT = new URL('..', document.currentScript ? document.currentScript.src : location.href).href; // site root
  const HERE = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;  // /loom/
  const GUEST = 'loom-guest';
  let serverUp = null, cache;

  async function server() {
    if (serverUp !== null) return serverUp;
    if (location.protocol === 'file:' || /\.(github\.io|netlify\.app|pages\.dev|vercel\.app)$/.test(location.hostname)) return (serverUp = false);
    try { const r = await fetch(ROOT + '__save/ping', { cache: 'no-store' }); const j = r.ok ? await r.json() : {}; serverUp = !!j.auth; } catch (e) { serverUp = false; }
    return serverUp;
  }
  async function call(action, body) {
    const r = await fetch(ROOT + '__auth/' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.ok) throw new Error(j.error || `Request failed (${r.status})`);
    cache = undefined; return j;
  }
  const guestUser = () => { try { const g = JSON.parse(localStorage.getItem(GUEST) || 'null'); return g ? Object.assign({ id: 'guest', guest: true, prefs: {} }, g) : null; } catch (e) { return null; } };

  async function me() {
    if (cache !== undefined) return cache;
    if (await server()) {
      try { const r = await fetch(ROOT + '__auth/me', { cache: 'no-store', credentials: 'same-origin' }); cache = r.ok ? (await r.json()).user : null; } catch (e) { cache = null; }
    } else cache = guestUser();
    return cache;
  }
  /** Redirect to the sign-in page unless someone is signed in. Resolves with the user. */
  async function require() {
    let u = await me();
    // Public site (no Loom server): start a guest session straight away, no sign-in wall
    if (!u && !(await server())) { startGuest('Guest'); u = await me(); }
    if (!u) { location.replace(HERE + 'auth.html?next=' + encodeURIComponent(location.pathname + location.search)); return new Promise(() => {}); }
    if (window.Loom && Loom.setUser) Loom.setUser(u);
    return u;
  }
  const signup = (d) => call('signup', d).then((j) => j.user);
  const login = (d) => call('login', d).then((j) => j.user);
  async function logout() {
    if (await server()) { try { await call('logout'); } catch (e) {} } else localStorage.removeItem(GUEST);
    cache = null; location.href = HERE + 'index.html';
  }
  async function update(d) {
    if (await server()) return (await call('profile', d)).user;
    const g = Object.assign(guestUser() || {}, d, { prefs: Object.assign((guestUser() || {}).prefs || {}, d.prefs || {}) });
    localStorage.setItem(GUEST, JSON.stringify(g)); cache = undefined; return guestUser();
  }
  const password = (current, next) => call('password', { current, new: next });
  const logoutAll = () => call('logout-all');
  const deleteAccount = (pw) => call('delete', { password: pw });
  async function exportData() {
    if (await server()) { const r = await fetch(ROOT + '__auth/export', { credentials: 'same-origin' }); return r.json(); }
    return { profile: guestUser(), projects: Object.values(JSON.parse(localStorage.getItem('loom-projects:guest') || '{}')) };
  }
  function startGuest(name) { localStorage.setItem(GUEST, JSON.stringify({ name: name || 'Guest', created: Date.now() })); cache = undefined; }

  const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  /** Avatar button + dropdown (Profile, Settings, legal, Log out). */
  function menu(host, u) {
    if (!host || !u) return;
    const id = 'um-' + Math.random().toString(36).slice(2, 7);
    host.innerHTML = `<div class="um">
      <button class="um__btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" title="${escapeHTML(u.name)}">
        <span class="um__av" style="background:${/^#[0-9a-f]{6}$/i.test(u.avatarColor || '') ? u.avatarColor : '#146EF5'}">${initials(u.name)}</span>
      </button>
      <div class="um__menu" id="${id}" role="menu" hidden>
        <div class="um__who"><b>${escapeHTML(u.name)}</b><span>${u.guest ? 'Guest · saved in this browser' : escapeHTML(u.email || '')}</span></div>
        <a role="menuitem" href="${HERE}app.html">Projects</a>
        <a role="menuitem" href="${HERE}account.html#profile">Profile</a>
        <a role="menuitem" href="${HERE}account.html#settings">Settings</a>
        <hr>
        <a role="menuitem" href="${HERE}legal/privacy.html">Privacy policy</a>
        <a role="menuitem" href="${HERE}legal/terms.html">Terms &amp; conditions</a>
        <hr>
        <button role="menuitem" type="button" data-logout>${u.guest ? 'Exit guest mode' : 'Log out'}</button>
      </div></div>`;
    const btn = host.querySelector('.um__btn'), m = host.querySelector('.um__menu');
    const set = (open) => { m.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) m.querySelector('a').focus(); };
    btn.addEventListener('click', () => set(m.hidden));
    document.addEventListener('pointerdown', (e) => { if (!host.contains(e.target)) set(false); });
    host.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { set(false); btn.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const items = [...m.querySelectorAll('[role=menuitem]')]; const i = items.indexOf(document.activeElement); e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    });
    host.querySelector('[data-logout]').addEventListener('click', logout);
  }
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.LoomAuth = { server, me, require, signup, login, logout, update, password, logoutAll, deleteAccount, exportData, startGuest, menu, initials };
})();
