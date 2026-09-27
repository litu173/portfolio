/* Loom FX: the motion and interaction runtime shipped with every site Loom publishes.
   No dependencies, about 12 KB. Behaviour is declared in HTML, so agents and people can switch
   effects on without writing code:

   Site-wide, on <html data-fx-site="preloader cursor grain progress transition theme nav">
     preloader   name + counter curtain on the first visit of a session
     transition  brand-colour curtain between pages
     cursor      dot + ring cursor that reacts to links and [data-cursor="view"]
     grain       film grain overlay
     progress    reading-progress bar
     theme       light/dark toggle in the navbar (remembers the choice)
     nav         navbar hides on scroll down, shows on scroll up

   Per element, data-fx="…" (combine with spaces):
     split        words rise into place         reveal     fade + rise on enter
     stagger      children reveal in sequence   count      numbers count up
     marquee      infinite ticker               parallax   drifts at data-speed (-1…1)
     scrub        words light up as you scroll  hscroll    pinned horizontal scroll
     tilt         3D tilt on hover              magnetic   element leans toward the cursor
     table        sortable (and filterable) data table      chart   SVG lines draw, bars grow

   Accessibility: everything respects prefers-reduced-motion (content simply appears). Split
   text keeps the original sentence for screen readers. Marquees can be paused. The theme toggle
   is a real button with aria-pressed. Without JavaScript, the page is complete and static. */
(() => {
  'use strict';
  const d = document, H = d.documentElement, W = window;
  const reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const site = (H.getAttribute('data-fx-site') || '').split(/\s+/).filter(Boolean);
  const has = (k) => site.includes(k);
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } } };
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } } };
  H.classList.add('fx'); if (reduce) H.classList.add('fx-reduce');
  // theme before first paint (no flash)
  const savedTheme = ls.get('loom-theme'); if (has('theme') && savedTheme) H.setAttribute('data-theme', savedTheme);
  // hold the first paint while a preloader or page curtain is on its way
  const arriving = has('transition') && ss.get('loom-fx-leave') === '1';
  const firstVisit = has('preloader') && !ss.get('loom-fx-seen') && !reduce;
  if (arriving || firstVisit) { H.classList.add('fx-hold'); setTimeout(() => H.classList.remove('fx-hold'), 4000); } // failsafe: never hide the page for long

  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const fxOf = (el) => (el.getAttribute('data-fx') || '').split(/\s+/);
  const title = () => (d.querySelector('nav a, .brand') || {}).textContent || d.title.split('—')[0];

  function onReady(fn) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn); else fn(); }
  onReady(() => { try { init(); } catch (e) { H.classList.remove('fx-hold', 'fx-loading'); if (W.console) console.warn('Loom FX:', e); } });
  function init() {
    /* ------------------------------------------------ split text */
    $$('[data-fx~="split"], [data-fx~="scrub"]').forEach((el) => {
      if (el.dataset.fxDone) return; el.dataset.fxDone = '1';
      const label = el.textContent.trim().replace(/\s+/g, ' ');
      let i = 0;
      const wrap = (node) => {
        if (node.nodeType === 3) {
          const frag = d.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return; if (/^\s+$/.test(w)) { frag.append(' '); return; }
            const o = d.createElement('span'); o.className = 'fx-w'; const n = d.createElement('span'); n.className = 'fx-wi'; n.style.setProperty('--i', i++); n.textContent = w; o.append(n); frag.append(o);
          });
          node.replaceWith(frag);
        } else if (node.nodeType === 1) [...node.childNodes].forEach(wrap);
      };
      const vis = d.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.className = 'fx-vis';
      [...el.childNodes].forEach((c) => vis.append(c)); wrap(vis);
      const sr = d.createElement('span'); sr.className = 'fx-sr'; sr.textContent = label;
      el.append(sr, vis); el.style.setProperty('--n', i);
    });
    /* ------------------------------------------------ stagger children */
    $$('[data-fx~="stagger"]').forEach((el) => [...el.children].forEach((c, i) => c.style.setProperty('--i', i)));
    /* ------------------------------------------------ enter observer */
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); if (fxOf(e.target).includes('count')) count(e.target); if (fxOf(e.target).includes('chart')) e.target.classList.add('fx-drawn'); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    $$('[data-fx~="split"], [data-fx~="reveal"], [data-fx~="stagger"], [data-fx~="count"], [data-fx~="chart"]').forEach((el) => (reduce ? (el.classList.add('fx-in', 'fx-drawn'), fxOf(el).includes('count') && count(el, true)) : io.observe(el)));
    /* ------------------------------------------------ count */
    function count(el, instant) {
      if (el.dataset.fxCounted) return; el.dataset.fxCounted = '1';
      const raw = el.textContent; const m = /^(\D*?)(-?[\d,.]+)(.*)$/.exec(raw.trim()); if (!m) return;
      const [, pre, num, suf] = m; const to = parseFloat(num.replace(/,/g, '')); const dec = (num.split('.')[1] || '').length; const comma = num.includes(',');
      el.setAttribute('aria-label', raw.trim()); if (instant || !isFinite(to)) return;
      const fmt = (v) => { const s = v.toFixed(dec); return comma ? Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s; };
      const t0 = performance.now(), dur = 1800; el.style.fontVariantNumeric = 'tabular-nums';
      const step = (now) => { const t = clamp((now - t0) / dur); el.textContent = pre + fmt(to * ease(t)) + suf; if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    /* ------------------------------------------------ marquee */
    $$('[data-fx~="marquee"]').forEach((el) => {
      if (el.dataset.fxDone) return; el.dataset.fxDone = '1';
      const track = d.createElement('div'); track.className = 'fx-track'; track.setAttribute('aria-hidden', 'true');
      const items = [...el.children]; const list = d.createElement('ul'); list.className = 'fx-sr'; items.forEach((c) => { const li = d.createElement('li'); li.textContent = c.textContent; list.append(li); });
      for (let k = 0; k < 2; k++) { const g = d.createElement('div'); g.className = 'fx-group'; items.forEach((c) => g.append(c.cloneNode(true))); track.append(g); }
      items.forEach((c) => c.remove()); el.append(list, track);
      const speed = +(el.dataset.speed || 60); const fit = () => track.style.setProperty('--dur', `${Math.max(12, track.scrollWidth / 2 / speed)}s`); fit(); addEventListener('resize', fit);
      if (el.dataset.reverse != null) track.classList.add('fx-rev');
    });
    /* ------------------------------------------------ scroll-driven: parallax, scrub, hscroll, progress, nav */
    const par = $$('[data-fx~="parallax"]'), scrub = $$('[data-fx~="scrub"]'), expand = $$('[data-fx~="expand"]'), tiltScroll = $$('[data-fx~="tilt-scroll"]');
    const hs = fine && innerWidth > 900 && !reduce ? $$('[data-fx~="hscroll"]') : [];
    hs.forEach((sec) => {
      const track = sec.querySelector('[data-fx-track]') || sec.querySelector('.grid-3, .grid-4, .grid-2, .hs-track') || sec.firstElementChild; if (!track) return;
      const sticky = d.createElement('div'); sticky.className = 'fx-hs-sticky'; [...sec.childNodes].forEach((c) => sticky.append(c)); sec.append(sticky); sec.classList.add('fx-hs'); track.classList.add('fx-hs-track');
      sec._track = track; sec._sticky = sticky;
      const fit = () => { const extra = Math.max(0, track.scrollWidth - sticky.clientWidth + 80); sec.style.height = `${sticky.offsetHeight + extra}px`; sec._extra = extra; }; fit(); addEventListener('resize', fit); addEventListener('load', fit);
    });
    const bar = has('progress') ? d.body.appendChild(Object.assign(d.createElement('div'), { className: 'fx-progress' })) : null;
    const nav = d.querySelector('body > nav, body > section[class*="nav"], nav');
    let lastY = scrollY, ticking = false;
    function onScroll() {
      ticking = false; const y = scrollY, vh = innerHeight;
      if (bar) bar.style.transform = `scaleX(${clamp(y / Math.max(1, d.documentElement.scrollHeight - vh))})`;
      if (nav) { nav.classList.toggle('fx-scrolled', y > 24); if (has('nav')) nav.classList.toggle('fx-hidden', y > lastY && y > 320); }
      lastY = y;
      if (reduce) return;
      par.forEach((el) => { const r = el.getBoundingClientRect(); const c = r.top + r.height / 2 - vh / 2; el.style.transform = `translate3d(0, ${(-c * (+(el.dataset.speed || 0.15))).toFixed(1)}px, 0)`; });
      scrub.forEach((el) => { const r = el.getBoundingClientRect(); const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35)); const n = +el.style.getPropertyValue('--n') || 1; const lit = Math.round(p * n); el.querySelectorAll('.fx-wi').forEach((w, i) => w.classList.toggle('is-lit', i < lit)); });
      // expand: media grows from an inset card to full bleed as it scrolls into view
      expand.forEach((el) => { const r = el.getBoundingClientRect(); const p = clamp((vh - r.top) / (vh * 0.85)); const ins = (1 - p) * 9; el.style.clipPath = `inset(${(ins * 0.6).toFixed(2)}% ${ins.toFixed(2)}% round ${(28 * (1 - p) + 4).toFixed(1)}px)`; });
      // tilt-scroll: a device frame leans back, then settles flat as you scroll (container scroll)
      tiltScroll.forEach((el) => { const r = el.getBoundingClientRect(); const p = clamp((vh - r.top) / (vh * 0.9)); el.style.transform = `perspective(1400px) rotateX(${((1 - p) * 26).toFixed(2)}deg) scale(${(0.88 + 0.12 * p).toFixed(3)}) translateY(${((1 - p) * 40).toFixed(1)}px)`; });
      hs.forEach((sec) => { if (!sec._track) return; const r = sec.getBoundingClientRect(); const p = clamp(-r.top / Math.max(1, r.height - vh)); sec._track.style.transform = `translate3d(${(-p * sec._extra).toFixed(1)}px,0,0)`; });
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    /* ------------------------------------------------ spotlight: a soft light follows the cursor across cards */
    if (fine) $$('[data-fx~="spotlight"]').forEach((el) => el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); }));
    /* ------------------------------------------------ hover: tilt + magnetic */
    if (fine && !reduce) {
      $$('[data-fx~="tilt"]').forEach((el) => {
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-4px)`; el.style.setProperty('--mx', `${(x + 0.5) * 100}%`); el.style.setProperty('--my', `${(y + 0.5) * 100}%`); });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
      $$('[data-fx~="magnetic"]').forEach((el) => {
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px)`; });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }
    /* ------------------------------------------------ cursor */
    if (has('cursor') && fine && !reduce) {
      const c = d.createElement('div'); c.className = 'fx-cursor'; c.setAttribute('aria-hidden', 'true'); c.innerHTML = '<i class="fx-cursor__ring"><span></span></i><i class="fx-cursor__dot"></i>'; d.body.append(c); H.classList.add('fx-has-cursor');
      const ring = c.firstElementChild, dot = c.lastElementChild, lab = ring.firstElementChild; let mx = -99, my = -99, rx = -99, ry = -99;
      addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (rx < -90) { rx = mx; ry = my; } }, { passive: true });
      const loop = () => { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; ring.style.transform = `translate3d(${rx}px,${ry}px,0)`; requestAnimationFrame(loop); }; loop();
      d.addEventListener('pointerover', (e) => { const v = e.target.closest('[data-cursor="view"]'), l = e.target.closest('a, button, summary, input, textarea, select, label, [role="button"]'); c.classList.toggle('is-view', !!v); c.classList.toggle('is-link', !v && !!l); lab.textContent = v ? (v.dataset.cursorLabel || 'View') : ''; });
      d.addEventListener('pointerleave', () => { mx = my = -99; });
    }
    /* ------------------------------------------------ grain */
    if (has('grain')) d.body.append(Object.assign(d.createElement('div'), { className: 'fx-grain' }));
    /* ------------------------------------------------ theme toggle */
    if (has('theme')) {
      const b = d.createElement('button'); b.type = 'button'; b.className = 'fx-theme';
      const sync = () => { const alt = H.getAttribute('data-theme') === 'alt'; b.setAttribute('aria-pressed', String(alt)); b.setAttribute('aria-label', 'Switch colour theme'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'; };
      b.addEventListener('click', () => { const alt = H.getAttribute('data-theme') !== 'alt'; if (alt) H.setAttribute('data-theme', 'alt'); else H.removeAttribute('data-theme'); ls.set('loom-theme', alt ? 'alt' : ''); sync(); });
      sync(); const slot = nav && (nav.querySelector('.nav-side-r') || nav.querySelector('.nav-links') || nav.querySelector('div')); (slot || d.body).append(b);
    }
    /* ------------------------------------------------ data table: sort + filter */
    $$('[data-fx~="table"] table, table[data-fx~="table"]').forEach((t) => {
      const body = t.tBodies[0]; if (!body) return;
      $$('thead th', t).forEach((th, ci) => {
        th.setAttribute('aria-sort', 'none'); const btn = d.createElement('button'); btn.type = 'button'; btn.className = 'fx-sort'; while (th.firstChild) btn.append(th.firstChild); th.append(btn);
        btn.addEventListener('click', () => {
          const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
          $$('thead th', t).forEach((x) => x.setAttribute('aria-sort', 'none')); th.setAttribute('aria-sort', dir);
          const num = (s) => parseFloat(String(s).replace(/[^\d.-]/g, ''));
          const rows = [...body.rows].sort((a, b) => { const x = a.cells[ci].textContent.trim(), y = b.cells[ci].textContent.trim(); const nx = num(x), ny = num(y); const r = !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y); return dir === 'ascending' ? r : -r; });
          rows.forEach((r) => body.append(r));
        });
      });
      const wrap = t.closest('[data-fx~="table"]') || t.parentElement; const f = wrap && wrap.querySelector('input[data-fx-filter]');
      if (f) f.addEventListener('input', () => { const q = f.value.toLowerCase(); let n = 0; [...body.rows].forEach((r) => { const show = r.textContent.toLowerCase().includes(q); r.hidden = !show; if (show) n++; }); const out = wrap.querySelector('[data-fx-count]'); if (out) out.textContent = `${n} result${n === 1 ? '' : 's'}`; });
    });
    /* ------------------------------------------------ marquee pause control (WCAG 2.2.2) */
    const mq = $$('[data-fx~="marquee"]');
    if (mq.length && !reduce) {
      const p = d.createElement('button'); p.type = 'button'; p.className = 'fx-pause'; p.setAttribute('aria-pressed', 'false'); p.textContent = 'Pause motion';
      p.addEventListener('click', () => { const on = H.classList.toggle('fx-paused'); p.setAttribute('aria-pressed', String(on)); p.textContent = on ? 'Play motion' : 'Pause motion'; });
      mq[mq.length - 1].after(p);
    }
    /* ------------------------------------------------ preloader, page curtain */
    const brand = title().trim().slice(0, 40);
    const curtain = (mode) => { const c = d.createElement('div'); c.className = 'fx-curtain is-' + mode; c.setAttribute('aria-hidden', 'true'); c.innerHTML = `<span class="fx-curtain__name">${brand.replace(/[<&]/g, '')}</span>${mode === 'pre' ? '<span class="fx-curtain__count">0</span><i class="fx-curtain__bar"></i>' : ''}`; d.body.append(c); return c; };
    if (firstVisit) {
      ss.set('loom-fx-seen', '1'); const c = curtain('pre'); H.classList.remove('fx-hold'); H.classList.add('fx-loading');
      const n = c.querySelector('.fx-curtain__count'), b = c.querySelector('.fx-curtain__bar'); const t0 = performance.now(), dur = 1500;
      const step = (now) => { const t = clamp((now - t0) / dur); n.textContent = Math.round(ease(t) * 100); b.style.transform = `scaleX(${ease(t)})`; if (t < 1) requestAnimationFrame(step); else { c.classList.add('is-out'); H.classList.remove('fx-loading'); setTimeout(() => c.remove(), 1200); } };
      requestAnimationFrame(step);
    } else if (arriving) {
      ss.set('loom-fx-leave', ''); const c = curtain('page'); c.classList.add('is-cover'); H.classList.remove('fx-hold');
      requestAnimationFrame(() => requestAnimationFrame(() => { c.classList.add('is-out'); setTimeout(() => c.remove(), 1100); }));
    } else H.classList.remove('fx-hold');
    if (has('transition') && !reduce) {
      d.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
        const u = new URL(a.href, location.href); if (u.origin !== location.origin || u.pathname === location.pathname || !/\.html?$|\/$/.test(u.pathname)) return;
        e.preventDefault(); ss.set('loom-fx-leave', '1'); const c = curtain('page'); requestAnimationFrame(() => c.classList.add('is-in')); setTimeout(() => (location.href = u.href), 650);
      });
      addEventListener('pageshow', (e) => { if (e.persisted) $$('.fx-curtain').forEach((c) => c.remove()); });
    }
  }
})();
