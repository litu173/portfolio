/* LOOM — "the team is thinking" indicator, shared by every chat input.
   The agents' coloured orbs circle a glowing core, drift in, fuse into one bright pulse and split again,
   while a status line walks through what the team is doing. Reduced-motion users get a calm, static
   version. LoomThink.pace(work, ms) keeps the answer from appearing before the thinking has been seen. */
(() => {
  'use strict';
  const FALLBACK = ['#6E8BFF', '#A78BFA', '#FF8FB1', '#F2C46D', '#7FCFA5', '#4FC3F7'];
  const CSS = `
.lt { --s: 44px; display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
.lt__stage { position: relative; flex: none; width: var(--s); height: var(--s); isolation: isolate; }
.lt__core { position: absolute; inset: 30%; border-radius: 50%; background: conic-gradient(from 0deg, #6E8BFF, #7FCFA5, #F2C46D, #FF8FB1, #A78BFA, #6E8BFF); filter: blur(.3px); box-shadow: 0 0 18px 2px rgba(140,160,255,.55); animation: lt-spin 2.4s linear infinite, lt-core 2.8s cubic-bezier(.45,0,.2,1) infinite; }
.lt__halo { position: absolute; inset: -30%; border-radius: 50%; background: radial-gradient(closest-side, rgba(150,170,255,.35), rgba(150,170,255,0) 70%); animation: lt-halo 2.8s cubic-bezier(.45,0,.2,1) infinite; z-index: -1; }
.lt__ring { position: absolute; inset: 0; animation: lt-spin var(--d, 3s) linear infinite; animation-direction: var(--dir, normal); }
.lt__dot { position: absolute; left: 50%; top: 50%; width: calc(var(--s) * .2); height: calc(var(--s) * .2); margin: calc(var(--s) * -.1); border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c), 0 0 2px #fff inset; mix-blend-mode: screen; animation: lt-orbit 2.8s cubic-bezier(.45,0,.2,1) infinite; animation-delay: var(--dl, 0s); }
.lt__spark { position: absolute; left: 50%; top: 50%; width: 3px; height: 3px; margin: -1.5px; border-radius: 50%; background: #fff; opacity: 0; animation: lt-spark 2.8s ease-out infinite; animation-delay: var(--dl, 0s); }
.lt__txt { display: grid; min-width: 0; gap: 2px; }
.lt__who { font-weight: 600; font-size: 13px; color: inherit; }
.lt__step { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: linear-gradient(90deg, rgba(255,255,255,.45) 0%, #fff 45%, rgba(255,255,255,.45) 90%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lt-shine 1.8s linear infinite; }
.lt__step.is-in { animation: lt-shine 1.8s linear infinite, lt-in .45s cubic-bezier(.16,1,.3,1); }
.lt--s { --s: 28px; gap: 8px; } .lt--l { --s: 72px; gap: 16px; } .lt--xl { --s: 108px; }
.lt--light .lt__step { background-image: linear-gradient(90deg, rgba(20,20,30,.45) 0%, #111 45%, rgba(20,20,30,.45) 90%); }
@keyframes lt-spin { to { transform: rotate(360deg); } }
@keyframes lt-orbit { 0%, 100% { transform: rotate(var(--a)) translateX(calc(var(--s) * .44)) scale(1); } 45% { transform: rotate(var(--a)) translateX(calc(var(--s) * .5)) scale(.9); } 62% { transform: rotate(var(--a)) translateX(0) scale(.35); opacity: .6; } 74% { transform: rotate(var(--a)) translateX(calc(var(--s) * .54)) scale(1.15); opacity: 1; } }
@keyframes lt-core { 0%, 100% { transform: scale(.85); } 62% { transform: scale(1.35); box-shadow: 0 0 30px 8px rgba(170,190,255,.8); } 74% { transform: scale(.95); } }
@keyframes lt-halo { 0%, 100% { opacity: .5; transform: scale(.8); } 62% { opacity: 1; transform: scale(1.25); } }
@keyframes lt-spark { 0%, 60% { opacity: 0; transform: rotate(var(--a)) translateX(0); } 64% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateX(calc(var(--s) * .9)); } }
@keyframes lt-shine { to { background-position: -220% 0; } }
@keyframes lt-in { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .lt__core, .lt__halo, .lt__ring, .lt__dot, .lt__spark, .lt__step { animation: none !important; } .lt__dot { transform: rotate(var(--a)) translateX(calc(var(--s) * .44)); } .lt__step { color: inherit; background: none; } }`;
  function style() { if (document.getElementById('lt-css')) return; const s = document.createElement('style'); s.id = 'lt-css'; s.textContent = CSS; document.head.append(s); }
  const colors = (ids) => { const A = window.LoomAgents; const c = (ids || []).map((i) => A && A.byId(i) && A.byId(i).color).filter(Boolean); return (c.length ? c : FALLBACK).slice(0, 6); };

  /** Build the indicator. opts: { agents: [ids], who, steps: [text], size: 's'|'m'|'l'|'xl', light, every } */
  function create(opts = {}) {
    style();
    const cs = colors(opts.agents), n = cs.length;
    const el = document.createElement('div'); el.className = `lt lt--${opts.size || 'm'}${opts.light ? ' lt--light' : ''}`; el.setAttribute('role', 'status');
    const dots = cs.map((c, i) => `<span class="lt__ring" style="--d:${2.6 + (i % 3) * .7}s;--dir:${i % 2 ? 'reverse' : 'normal'}"><i class="lt__dot" style="--c:${c};--a:${Math.round((360 / n) * i)}deg;--dl:${(i * -0.07).toFixed(2)}s"></i></span>`).join('');
    const sparks = Array.from({ length: 8 }, (_, i) => `<i class="lt__spark" style="--a:${i * 45 + 20}deg;--dl:${(i * .03).toFixed(2)}s"></i>`).join('');
    const hasTxt = opts.who || (opts.steps && opts.steps.length);
    el.innerHTML = `<span class="lt__stage" aria-hidden="true"><span class="lt__halo"></span>${dots}<span class="lt__core"></span>${sparks}</span>${hasTxt ? `<span class="lt__txt">${opts.who ? `<span class="lt__who"></span>` : ''}<span class="lt__step" aria-live="polite"></span></span>` : ''}`;
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
