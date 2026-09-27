/* LOOM — "the team is thinking" indicator, shared by every chat input.
   A glass orb in the night sky: aurora light (green, cyan, violet, magenta) drifts and blends inside it
   the way the Siri orb does, northern-light curtains sweep across, a soft halo breathes around it and a few
   stars twinkle nearby. A status line in aurora colours walks through what the team is doing.
   Reduced-motion users get a still, lit orb. LoomThink.pace(work, ms) keeps the answer from appearing
   before the thinking has been seen. */
(() => {
  'use strict';
  const CSS = `
.lt { --s: 44px; display: inline-flex; align-items: center; gap: 14px; min-width: 0; }
.lt__stage { position: relative; flex: none; width: var(--s); height: var(--s); isolation: isolate; }
.lt__halo { position: absolute; inset: -28%; border-radius: 50%; z-index: -1; opacity: .55; filter: blur(calc(var(--s) * .2)) saturate(1.4);
  background: conic-gradient(from 0deg, #2BF5B4, #22C7FF, #6A5CFF, #C45CFF, #FF5FC1, #2BF5B4);
  animation: lt-spin 9s linear infinite, lt-halo 3.4s ease-in-out infinite; will-change: transform, opacity; }
.lt__orb { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; isolation: isolate;
  background: radial-gradient(120% 120% at 50% 110%, #0F2A3A 0%, #0A0E22 55%, #05060F 100%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 calc(var(--s) * -.12) calc(var(--s) * .3) rgba(80,255,200,.22) inset, 0 calc(var(--s) * .12) calc(var(--s) * .35) rgba(10,10,40,.8), 0 0 calc(var(--s) * .5) rgba(90,220,255,.28);
  animation: lt-breathe 3.4s ease-in-out infinite; will-change: transform; }
.lt__b { position: absolute; left: 50%; top: 50%; width: 64%; height: 64%; margin: -32%; border-radius: 50%; mix-blend-mode: screen; filter: blur(calc(var(--s) * .1)) saturate(1.35); opacity: .78;
  background: radial-gradient(circle at 50% 50%, var(--c) 0%, color-mix(in srgb, var(--c) 70%, transparent) 30%, transparent 66%);
  animation: lt-drift var(--d) cubic-bezier(.45,.05,.55,.95) infinite; animation-delay: var(--dl); animation-direction: var(--dir, normal); will-change: transform; }
.lt__aur { position: absolute; left: -30%; right: -30%; height: 34%; top: var(--y); mix-blend-mode: screen; filter: blur(calc(var(--s) * .06)); opacity: .7;
  background: linear-gradient(90deg, transparent 0%, rgba(43,245,180,0) 12%, rgba(43,245,180,.75) 32%, rgba(34,199,255,.6) 52%, rgba(196,92,255,.55) 72%, transparent 92%);
  border-radius: 50%; transform-origin: 50% 50%; animation: lt-curtain var(--d) ease-in-out infinite; animation-delay: var(--dl); will-change: transform, opacity; }
.lt__gloss { position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: radial-gradient(42% 28% at 34% 20%, rgba(255,255,255,.5) 0%, rgba(255,255,255,.08) 55%, transparent 70%), radial-gradient(80% 45% at 50% 108%, rgba(120,255,220,.18), transparent 60%); mix-blend-mode: screen; }
.lt__core { position: absolute; left: 50%; top: 50%; width: 18%; height: 18%; margin: -9%; border-radius: 50%; mix-blend-mode: screen; filter: blur(calc(var(--s) * .04));
  background: radial-gradient(circle, rgba(255,255,255,.85), rgba(160,255,230,.35) 45%, transparent 72%); animation: lt-core 3.4s ease-in-out infinite; }
.lt__star { position: absolute; left: var(--x); top: var(--y); width: var(--z); height: var(--z); border-radius: 50%; background: #fff; box-shadow: 0 0 6px 1px rgba(170,240,255,.9);
  opacity: 0; animation: lt-twinkle var(--d) ease-in-out infinite; animation-delay: var(--dl); }
.lt--s .lt__star, .lt--s .lt__aur:nth-of-type(n+2) { display: none; }
.lt__txt { display: grid; min-width: 0; gap: 3px; }
.lt__who { font-weight: 600; font-size: 13px; letter-spacing: .01em; color: inherit; }
.lt__step { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background: linear-gradient(90deg, #7CF5C8 0%, #7FD8FF 22%, #C3A8FF 44%, #FF9AD8 62%, #7FD8FF 80%, #7CF5C8 100%); background-size: 300% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent; animation: lt-shine 4s linear infinite; }
.lt__step.is-in { animation: lt-shine 4s linear infinite, lt-in .55s cubic-bezier(.16,1,.3,1); }
.lt--s { --s: 28px; gap: 8px; } .lt--l { --s: 76px; gap: 18px; } .lt--xl { --s: 112px; }
.lt--l .lt__who, .lt--xl .lt__who { font-size: 15px; } .lt--l .lt__step, .lt--xl .lt__step { font-size: 13.5px; }
.lt--light .lt__step { background-image: linear-gradient(90deg, #0E9F74, #1682C8, #6C4CE0, #C23C93, #1682C8, #0E9F74); }
@keyframes lt-spin { to { transform: rotate(360deg); } }
@keyframes lt-halo { 0%, 100% { opacity: .5; transform: scale(.9) rotate(0deg); } 50% { opacity: .85; transform: scale(1.08) rotate(180deg); } }
@keyframes lt-breathe { 0%, 100% { transform: scale(.97); } 50% { transform: scale(1.035); } }
@keyframes lt-drift {
  0% { transform: rotate(0deg) translate(36%, 0) scale(1); }
  25% { transform: rotate(90deg) translate(42%, 8%) scale(.8); }
  50% { transform: rotate(180deg) translate(26%, -10%) scale(1.15); }
  75% { transform: rotate(270deg) translate(40%, 6%) scale(.88); }
  100% { transform: rotate(360deg) translate(36%, 0) scale(1); } }
@keyframes lt-curtain {
  0%, 100% { transform: translateX(-18%) rotate(-18deg) scaleY(.7); opacity: .35; }
  50% { transform: translateX(18%) rotate(-6deg) scaleY(1.25); opacity: .95; } }
@keyframes lt-core { 0%, 100% { transform: scale(.7); opacity: .35; } 50% { transform: scale(1.3); opacity: .85; } }
@keyframes lt-twinkle { 0%, 100% { opacity: 0; transform: scale(.4); } 45% { opacity: 1; transform: scale(1); } 60% { opacity: .6; } }
@keyframes lt-shine { to { background-position: -300% 0; } }
@keyframes lt-in { from { opacity: 0; transform: translateY(6px); filter: blur(3px); } }
@media (prefers-reduced-motion: reduce) { .lt__halo, .lt__orb, .lt__b, .lt__aur, .lt__core, .lt__star, .lt__step { animation: none !important; } .lt__b { transform: translate(calc(var(--i) * 12% - 24%), 0); } .lt__star { opacity: .6; } }`;
  function style() { if (document.getElementById('lt-css')) { document.getElementById('lt-css').textContent = CSS; return; } const s = document.createElement('style'); s.id = 'lt-css'; s.textContent = CSS; document.head.append(s); }

  // northern-light palette: emerald, aqua, electric blue, violet, magenta
  const AURORA = ['#2BF5B4', '#22C7FF', '#5B6CFF', '#B45CFF', '#FF5FC1'];
  const STARS = [[-26, 8, 2, 2.6], [112, 18, 1.6, 3.4], [96, -18, 2.2, 2.9], [-14, 92, 1.4, 3.8], [118, 86, 1.8, 3.1], [44, -30, 1.4, 4.2], [58, 124, 1.6, 3.6]];

  /** Build the indicator. opts: { who, steps: [text], size: 's'|'m'|'l'|'xl', light, every } */
  function create(opts = {}) {
    style();
    const el = document.createElement('div'); el.className = `lt lt--${opts.size || 'm'}${opts.light ? ' lt--light' : ''}`; el.setAttribute('role', 'status');
    const blobs = AURORA.map((c, i) => `<i class="lt__b" style="--c:${c};--i:${i};--d:${(4.6 + i * 1.1).toFixed(1)}s;--dl:${(-i * 1.3).toFixed(1)}s;--dir:${i % 2 ? 'reverse' : 'normal'}"></i>`).join('');
    const curtains = [[18, 5.2, 0], [52, 6.4, -2.1]].map(([y, d, dl]) => `<i class="lt__aur" style="--y:${y}%;--d:${d}s;--dl:${dl}s"></i>`).join('');
    const stars = STARS.map(([x, y, z, d], i) => `<i class="lt__star" style="--x:${x}%;--y:${y}%;--z:${z}px;--d:${d}s;--dl:${(-i * .7).toFixed(1)}s"></i>`).join('');
    const hasTxt = opts.who || (opts.steps && opts.steps.length);
    el.innerHTML = `<span class="lt__stage" aria-hidden="true"><span class="lt__halo"></span>${stars}<span class="lt__orb">${blobs}${curtains}<i class="lt__core"></i><i class="lt__gloss"></i></span></span>${hasTxt ? `<span class="lt__txt">${opts.who ? `<span class="lt__who"></span>` : ''}<span class="lt__step" aria-live="polite"></span></span>` : ''}`;
    if (opts.who) el.querySelector('.lt__who').textContent = opts.who;
    const stepEl = el.querySelector('.lt__step'); let k = 0, timer = null;
    const show = (t) => { if (!stepEl) return; stepEl.textContent = t; stepEl.classList.remove('is-in'); void stepEl.offsetWidth; stepEl.classList.add('is-in'); };
    const steps = opts.steps || [];
    if (steps.length) { show(steps[0]); if (steps.length > 1) timer = setInterval(() => { k = Math.min(k + 1, steps.length - 1); show(steps[k]); if (k === steps.length - 1) clearInterval(timer); }, opts.every || 850); }
    return { el, set: (t) => { clearInterval(timer); show(t); }, stop: () => { clearInterval(timer); el.remove(); } };
  }
  /** Static markup of the orb only (for HTML strings that get redrawn often). */
  function markup(opts = {}) { const t = create(Object.assign({}, opts, { steps: [], who: '' })); t.el.setAttribute('aria-hidden', 'true'); t.el.removeAttribute('role'); return t.el.outerHTML; }
  /** Wait for `work` (a promise or function) and at least `ms`, so the thinking is actually visible. */
  async function pace(work, ms = 2000) {
    const t = new Promise((r) => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.min(ms, 600) : ms));
    const [v] = await Promise.all([typeof work === 'function' ? work() : work, t]); return v;
  }
  const jitter = (base, spread = 700) => base + Math.round(Math.random() * spread);
  window.LoomThink = { create, markup, pace, jitter };
})();
