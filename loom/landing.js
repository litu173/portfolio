/* LOOM landing — interactions.
   Preloader · Lenis smooth scroll · kinetic hero (threads straighten into a grid as you scroll)
   · parallax UI pills · pinned product tour driving a live editor mock · spotlight bento
   · number tickers · draggable template rail with live previews · typed publish terminal
   · magnetic buttons · custom cursor · auth-aware nav. Everything degrades to static with reduced motion. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  doc.classList.add('js');
  if (reduce) doc.classList.add('no-motion');
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);

  /* ---------------------------------------------------------------- smooth scroll */
  let lenis = null;
  if (!reduce && window.Lenis && G) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ST.update); G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return;
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
    closeMenu(); lenis ? lenis.scrollTo(t, { offset: -10, duration: 1.4 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------------- FAQ: smooth accordion (same easing as the page scroll) */
  (() => {
    const items = $$('.faq details'); if (!items.length) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const EASE = 'cubic-bezier(.16, 1, .3, 1)';
    items.forEach((d) => {
      const sum = d.querySelector('summary'); const body = document.createElement('div'); body.className = 'faq__a';
      [...d.childNodes].filter((n) => n !== sum).forEach((n) => body.append(n)); d.append(body);
      let anim = null;
      const done = () => { anim = null; d.style.height = ''; d.style.overflow = ''; window.ScrollTrigger && ScrollTrigger.refresh(); };
      const run = (from, to, after) => {
        if (anim) anim.cancel(); d.style.overflow = 'hidden';
        anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: still ? 0 : Math.min(760, 380 + Math.abs(to - from) * 1.1), easing: EASE });
        anim.onfinish = () => { after && after(); done(); };
      };
      const open = () => {
        const from = d.offsetHeight; d.open = true; d.classList.add('is-opening');
        const to = from + body.offsetHeight; run(from, to, () => d.classList.remove('is-opening'));
        if (!still) body.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 620, delay: 60, easing: EASE, fill: 'backwards' });
      };
      const close = () => {
        const from = d.offsetHeight; d.classList.add('is-closing');
        if (!still) body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { this.cancel(); };
        run(from, from - body.offsetHeight, () => { d.open = false; d.classList.remove('is-closing'); });
      };
      sum.addEventListener('click', (e) => {
        e.preventDefault();
        if (d.open && !d.classList.contains('is-closing')) { close(); return; }
        items.forEach((o) => { if (o !== d && o.open && !o.classList.contains('is-closing')) o.querySelector('summary').click(); });
        open();
      });
    });
  })();

  /* ---------------------------------------------------------------- nav, menu, auth */
  const nav = $('[data-nav]');
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 30), { passive: true });
  const menu = $('#smenu'), burger = $('[data-burger]');
  // the drawer wipes open from the burger, links rise in one by one, and it animates closed again
  let menuT = 0;
  function openMenu() {
    clearTimeout(menuT); menu.hidden = false; void menu.offsetWidth; menu.classList.add('is-open'); document.documentElement.classList.add('smenu-open'); setTimeout(() => menu.classList.contains('is-open') && menu.classList.add('is-settled'), 900);
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu'); lenis && lenis.stop();
    setTimeout(() => { const f = menu.querySelector('a'); f && f.focus({ preventScroll: true }); }, 250);
  }
  function closeMenu(focusBurger) {
    if (menu.hidden) return; menu.classList.remove('is-open', 'is-settled'); document.documentElement.classList.remove('smenu-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); lenis && lenis.start();
    menuT = setTimeout(() => { menu.hidden = true; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 780);
    if (focusBurger) burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu(true); });
  addEventListener('resize', () => { if (innerWidth > 900 && menu.classList.contains('is-open')) closeMenu(); });
  (async () => {
    const u = window.LoomAuth ? await LoomAuth.me() : null;
    if (!u) {
      // Public site: accounts are off, so every CTA opens Loom directly in guest mode
      if (window.LoomAuth && !(await LoomAuth.server())) {
        $$('a[href^="auth.html"]').forEach((a) => { if (/Log in/i.test(a.textContent)) { a.closest('li') ? a.closest('li').remove() : a.remove(); } else { a.href = 'app.html'; if (/create (your free )?account/i.test(a.textContent)) a.firstChild.textContent = /free/i.test(a.textContent) ? 'Start building free ' : 'Open Loom'; } });
        const start = $('[data-nav-right] a[href="app.html"]'); if (start) start.textContent = 'Open Loom';
      }
      return;
    }
    const right = $('[data-nav-right]'); const b = right.querySelector('[data-burger]');
    right.innerHTML = '<a class="btn btn--shimmer btn--sm" href="app.html" data-mag>Open Loom</a><div data-user></div>'; right.append(b);
    LoomAuth.menu(right.querySelector('[data-user]'), u); bindMagnetic();
    $$('a[href^="auth.html"]').forEach((a) => { if (!a.closest('.sfoot')) a.href = 'app.html'; });
  })();
  if (new URLSearchParams(location.search).get('deleted')) toast('Your account was deleted.');
  function toast(m) { const t = $('.toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3200); }

  /* ---------------------------------------------------------------- text splitting */
  function splitWords(el) {
    const label = el.textContent.trim(); const words = [];
    const walk = (node, wrapper) => [...node.childNodes].map((n) => {
      if (n.nodeType === 3) return n.textContent.split(/(\s+)/).map((w) => { if (!w) return ''; if (/^\s+$/.test(w)) return ' '; const inner = `<span>${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`; words.push(1); return `<span class="w">${wrapper ? wrapper(inner) : inner}</span>`; }).join('');
      if (n.nodeType === 1) { const tag = n.tagName.toLowerCase(), grad = n.classList.contains('grad-text'); return walk(n, (x) => `<${tag}>${grad ? x.replace('<span>', '<span class="grad-text">') : x}</${tag}>`); }
      return '';
    }).join('');
    const html = walk(el);
    el.innerHTML = `<span class="sr">${label.replace(/</g, '&lt;')}</span><span aria-hidden="true">${html}</span>`;
    return $$('.w > span, .w > * > span', el).map((s) => s.closest('.w').firstElementChild);
  }

  /* ---------------------------------------------------------------- preloader + hero intro */
  const title = $('[data-hero-title]');
  // characters for the hero title (per word, per char)
  (function splitHero() {
    const label = title.textContent.trim();
    const walk = (node) => [...node.childNodes].map((n) => {
      if (n.nodeType === 3) return n.textContent.split(/(\s+)/).map((w) => (!w ? '' : /^\s+$/.test(w) ? ' ' : `<span class="wd">${[...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`)).join('');
      if (n.nodeType === 1) return `<${n.tagName.toLowerCase()} data-grad="${n.classList.contains('grad-text')}">${walk(n)}</${n.tagName.toLowerCase()}>`;
      return '';
    }).join('');
    title.innerHTML = `<span class="sr">${label}</span><span aria-hidden="true">${walk(title)}</span>`;
    // gradient words: colour each letter along the brand gradient (letters animate independently)
    const stops = [[59, 130, 246], [127, 207, 165], [242, 196, 109], [255, 143, 177]];
    title.querySelectorAll('[data-grad="true"]').forEach((em) => { const cs = [...em.querySelectorAll('.ch')]; cs.forEach((c, i) => { const t = cs.length > 1 ? i / (cs.length - 1) : 0, seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1))), lt = t * (stops.length - 1) - seg; const col = stops[seg].map((v, k) => Math.round(v + (stops[seg + 1][k] - v) * lt)); c.style.color = `rgb(${col.join(',')})`; }); });
  })();
  const chars = $$('.ch', title);
  function intro() {
    if (!G || reduce) { doc.classList.add('is-ready'); return; }
    // words sit below a mask edge, like the portfolio's page-transition titles
    G.set(chars, { yPercent: 115 });
    G.set('[data-hero-in]', { y: 24, opacity: 0 }); G.set('.fl', { opacity: 0, scale: 0.8 });
    lenis && lenis.stop();
    (window.LoomSplash ? LoomSplash.done : Promise.resolve()).then(() => play());
  }
  function play() {
    doc.classList.add('is-ready');
    const tl = G.timeline({ delay: 0.25 });
    // portfolio page-transition title: each word rises from behind its mask, one after another
    $$('.wd', title).forEach((w, i) => tl.to($$('.ch', w), { yPercent: 0, duration: 0.95, ease: 'expo.out' }, i * 0.09));
    tl.addLabel('words')
      .to('[data-hero-in]', { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.35)
      .to('.fl', { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.6)', stagger: 0.07 }, '-=0.9');
    tl.eventCallback('onComplete', () => lenis && lenis.start());
  }
  document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(intro) : intro();

  // hero threads straighten into a grid as you scroll through the hero
  let heroP = 0;
  const heroCanvas = $('[data-hero-canvas]');
  if (window.LoomWeave) LoomWeave.mount(heroCanvas, { progress: () => heroP });
  else if (window.LoomThreads) LoomThreads.mount(heroCanvas, { weft: 22, warp: 34, amp: 46, alpha: 0.5, progress: () => heroP });
  if (G && ST && !reduce) {
    ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { heroP = s.progress; } });
    G.to('.hero__inner', { yPercent: -18, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    // hero hover: letters lift near the cursor
    if (!touch) title.addEventListener('pointermove', (e) => chars.forEach((c) => { const r = c.getBoundingClientRect(); const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); G.to(c, { y: d < 120 ? -(1 - d / 120) * 14 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }); }));
    title.addEventListener('pointerleave', () => G.to(chars, { y: 0, duration: 0.8, ease: 'elastic.out(1,.5)' }));
  }
  // parallax pills follow the pointer
  if (!touch && !reduce && G) {
    const pills = $$('.fl');
    addEventListener('pointermove', (e) => { const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5; pills.forEach((p) => { const d = +p.dataset.depth || 1; G.to(p, { x: -nx * 40 * d, y: -ny * 30 * d, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }); }); }, { passive: true });
  }

  /* ---------------------------------------------------------------- section headings & reveals */
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    if (!G || reduce) return;
    G.set(words, { yPercent: 110 });
    ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => G.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05 }) });
  });
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('[data-rv]').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 0.07}s`; io.observe(el); });

  /* ---------------------------------------------------------------- product tour */
  const steps = $$('[data-steps] .tstep');
  const M = { canvas: $('[data-mcanvas]'), cards: $$('.mcard'), grid: $('[data-mcards]'), tiles: $$('[data-mtiles] span'), sel: $('[data-msel]'), cur: $('[data-mcursor]'), term: $('[data-mterm]'), bps: $$('[data-mbps] span'), pub: $('[data-mpub]'), rad: $('[data-mrad]'), radbar: $('[data-mradbar]'), bg: $('[data-mbg]'), cols: $('[data-mcols]'), bp: $('[data-mbp]'), bar: $('[data-tour-bar]'), stage: $('.mock__stage') };
  const BGS = ['#2A2C33', '#23304D', '#1F3A30', '#3A3122'];
  // the preview is designed at 1120 × 735 and scaled to fit, so it looks identical at every size
  const mockEl = $('.tour .mock'), mockIn = $('[data-mock-inner]'); let MS = 1;
  const fitMock = () => { if (!mockEl || !mockIn) return; MS = mockEl.clientWidth / 1120; mockIn.style.setProperty('--ms', MS.toFixed(4)); };
  fitMock(); if (window.ResizeObserver && mockEl) new ResizeObserver(() => { fitMock(); if (lastStep >= 0) tour(lastP); }).observe(mockEl);
  let lastP = 0;
  let lastStep = -1;
  function place(el, target, pad = 0) {
    const s = M.stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    Object.assign(el.style, { left: (r.left - s.left) / MS - pad + 'px', top: (r.top - s.top) / MS - pad + 'px', width: r.width / MS + pad * 2 + 'px', height: r.height / MS + pad * 2 + 'px' });
  }
  function cursorTo(target, dx = 0.5, dy = 0.5) { const s = M.stage.getBoundingClientRect(), r = target.getBoundingClientRect(); M.cur.style.transform = `translate(${(r.left - s.left + r.width * dx) / MS}px, ${(r.top - s.top + r.height * dy) / MS}px)`; }
  function tour(p) {
    lastP = p;
    const n = steps.length, sp = clamp(p) * n, step = Math.min(n - 1, Math.floor(sp)), t = sp - step;
    if (step !== lastStep) { steps.forEach((s, i) => s.classList.toggle('is-on', i === step)); lastStep = step; }
    M.bar.style.transform = `scaleX(${clamp(p)})`;
    // 0 — Add: tiles light up, cards appear
    const shown = step === 0 ? Math.floor(t * 4.2) : 3;
    M.cards.forEach((c, i) => { c.style.opacity = i < shown ? 1 : 0.08; c.style.transform = i < shown ? 'none' : 'translateY(10px) scale(.96)'; });
    M.tiles.forEach((tl, i) => tl.classList.toggle('lit', step === 0 && i === 7 && t < 0.95));
    // 1 — Style: selection + radius + colour
    const styleT = step === 1 ? t : step > 1 ? 1 : 0;
    const rad = Math.round(lerp(10, 26, clamp(styleT * 1.6)));
    const bi = step >= 1 ? Math.min(3, Math.floor(clamp(styleT * 1.25 - 0.2) * 4)) : 0;
    M.cards.forEach((c) => { c.style.setProperty('--mr', rad + 'px'); c.style.setProperty('--mc', BGS[bi]); });
    M.rad.textContent = rad + 'px'; M.radbar.style.width = (rad / 32) * 100 + '%'; M.bg.textContent = BGS[bi];
    M.sel.style.opacity = step === 1 || step === 2 ? 1 : 0;
    // 2 — Responsive: canvas shrinks, grid columns collapse
    const bp = step < 2 ? 0 : step === 2 ? (t < 0.35 ? 0 : t < 0.7 ? 1 : 2) : 2;
    const widths = ['100%', '64%', '38%'], cols = [3, 2, 1], names = ['Desktop', 'Tablet', 'Mobile'];
    M.canvas.style.width = widths[bp]; M.grid.style.gridTemplateColumns = `repeat(${cols[bp]}, 1fr)`;
    M.bps.forEach((b, i) => b.classList.toggle('on', i === bp)); M.cols.textContent = `${cols[bp]} col${cols[bp] > 1 ? 's' : ''}`; M.bp.textContent = names[bp];
    // 3 — Publish
    M.term.classList.toggle('on', step === 3 && t > 0.15);
    M.pub.style.boxShadow = step === 3 && t < 0.3 ? '0 0 0 4px rgba(20,110,245,.4)' : 'none';
    // selection box + cursor follow the story
    requestAnimationFrame(() => {
      place(M.sel, M.cards[1], 3);
      if (step === 0) cursorTo(t < 0.5 ? M.tiles[7] : M.cards[Math.min(2, shown - 1)] || M.cards[0]);
      else if (step === 1) cursorTo(M.cards[1], 0.8, 0.8);
      else if (step === 2) cursorTo(M.bps[bp]);
      else cursorTo(M.pub);
    });
  }
  if (G && ST && !reduce && matchMedia('(min-width: 901px)').matches) ST.create({ trigger: '.tour', start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: (s) => tour(s.progress) });
  else tour(0.99);
  addEventListener('resize', () => tour(ST ? (ST.getAll().find((s) => s.trigger === $('.tour')) || { progress: 0.99 }).progress : 0.99));

  /* ---------------------------------------------------------------- spotlight cards */
  $$('.spot').forEach((c) => c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--x', e.clientX - r.left + 'px'); c.style.setProperty('--y', e.clientY - r.top + 'px'); }));
  // class demo: cards recolour together
  const vc = $$('[data-vclass] i'); let vi = 0; const VC = ['#1f2937', '#3B82F6', '#7FCFA5', '#F2C46D', '#FF8FB1'];
  if (!reduce) setInterval(() => { vi = (vi + 1) % VC.length; vc.forEach((x) => (x.style.background = VC[vi])); }, 1600);

  /* ---------------------------------------------------------------- number tickers */
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count, suf = el.dataset.suffix || '';
    el.textContent = to + suf;
    if (!G || reduce) return;
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => { const o = { v: to === 0 ? 1000 : 0 }; G.to(o, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString() + suf) }); } });
  });

  /* ---------------------------------------------------------------- templates rail */
  const rail = $('[data-rail]'), filters = $('[data-tfilters]');
  // a curated showcase: two templates per design language, each from a different category
  const ALL = window.LoomTemplates ? LoomTemplates.list : [];
  const TL = []; const seenCat = new Set();
  const LG = window.LoomLangs ? Object.keys(LoomLangs.LANGS) : [];
  LG.forEach((lg) => { ALL.filter((t) => t.lang === lg).filter((t) => !seenCat.has(t.category + lg)).slice(0, 2).forEach((t) => { TL.push(t); seenCat.add(t.category + lg); }); });
  if (!TL.length) TL.push(...ALL.slice(0, 24));
  const cats = ['All', ...LG.map((k) => LoomLangs.LANGS[k].label)];
  filters.innerHTML = cats.map((c, i) => `<button class="chipf" type="button" aria-pressed="${i === 0}" data-cat="${c}">${c}</button>`).join('');
  const countEl = $('[data-tcount]'); if (countEl) countEl.textContent = String(ALL.length);
  rail.innerHTML = TL.map((t) => `<article class="tcard" data-cat="${t.langLabel || ''}">
    <div class="tcard__frame" data-cursor="view"><iframe sandbox="allow-same-origin" title="${t.name} template preview" tabindex="-1" loading="lazy"></iframe>
      <a class="btn btn--light btn--sm tcard__use" href="app.html?template=${t.id}">Use ${t.name} →</a></div>
    <div class="tcard__meta"><h3>${t.name}</h3><span>${t.langLabel || ''} · ${t.category}</span></div><p>${t.desc}</p></article>`).join('') + `<article class="tcard tcard--all" data-cat="All"><a class="tcard__frame tcard__allink" href="app.html?browse=1"><span><b>${ALL.length}</b> templates</span><em>Browse by category, style and colour →</em></a><div class="tcard__meta"><h3>The full library</h3><span>${window.LoomLangs ? LoomLangs.CATEGORIES.length : ''} categories · 12 design languages</span></div><p>Every template comes in 4 colourways and stays fully editable.</p></article>`;
  // live previews, scaled to the card; hovering scrolls the page inside
  $$('.tcard:not(.tcard--all)').forEach((card, i) => {
    const f = card.querySelector('iframe'), frame = card.querySelector('.tcard__frame');
    const load = () => { if (f.srcdoc) return; f.srcdoc = LoomTemplates.previewHTML(TL[i].id); };
    const scale = () => frame.clientWidth / 1280;
    // Only CSS variables here: the base transform and the hover scroll both live in CSS
    const fit = () => { const s = scale(); card.style.setProperty('--s', s); try { const h = f.contentDocument.documentElement.scrollHeight; f.style.height = h + 'px'; card.style.setProperty('--scroll', Math.max(0, h - frame.clientHeight / s) + 'px'); } catch (e) {} };
    new IntersectionObserver(([en]) => { if (en.isIntersecting) { load(); setTimeout(fit, 400); } }, { rootMargin: '200px' }).observe(card);
    // click the preview (not the button) to open the full, multi-page preview in a modal
    frame.setAttribute('role', 'button'); frame.tabIndex = 0; frame.setAttribute('aria-label', `Preview ${TL[i].name}`);
    const openIt = (e) => { if (e.target.closest('.tcard__use') || moved) return; openPreview(TL[i].id); };
    frame.addEventListener('click', openIt); frame.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(TL[i].id); } });
    new ResizeObserver(fit).observe(frame);
    f.addEventListener('load', () => setTimeout(fit, 50));
    // Use-template links go through sign-in if needed
    // app.html handles sign-in (or guest mode) itself, so the link can simply navigate
  });
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    $$('[data-cat]', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.tcard').forEach((c) => (c.hidden = b.dataset.cat !== 'All' && c.dataset.cat !== b.dataset.cat && !c.classList.contains('tcard--all')));
    rail.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  // drag to scroll (with momentum) + keyboard
  let down = false, sx = 0, sl = 0, vx = 0, lastX = 0, moved = false;
  rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = lastX = e.clientX; sl = rail.scrollLeft; rail.classList.add('dragging'); });
  addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; vx = e.clientX - lastX; lastX = e.clientX; rail.scrollLeft = sl - dx; });
  addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('dragging'); let v = -vx * 1.4; const glide = () => { if (Math.abs(v) < 0.5) return; rail.scrollLeft += v; v *= 0.93; requestAnimationFrame(glide); }; if (!reduce) glide(); });
  rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  rail.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 480, behavior: reduce ? 'auto' : 'smooth' }); } });
  rail.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation(); }, { passive: true });

  /* ---------------------------------------------------------------- template preview modal */
  const tpv = $('[data-tpv]'), tpvFrame = $('[data-tpv-frame]'); let tpvReturn = null;
  function openPreview(id) { tpvReturn = document.activeElement; tpvFrame.src = `preview.html?embed=1&t=${encodeURIComponent(id)}`; tpv.hidden = false; document.documentElement.classList.add('tpv-open'); lenis && lenis.stop(); setTimeout(() => $('[data-tpv-close]').focus(), 30); }
  function closePreview() { if (tpv.hidden) return; tpv.hidden = true; tpvFrame.src = 'about:blank'; document.documentElement.classList.remove('tpv-open'); lenis && lenis.start(); tpvReturn && tpvReturn.focus && tpvReturn.focus(); }
  $('[data-tpv-close]').addEventListener('click', closePreview);
  tpv.addEventListener('click', (e) => { if (e.target === tpv) closePreview(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });
  addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.loomPreview === 'close') closePreview(); });

  /* ---------------------------------------------------------------- templates: hover near an edge to glide */
  if (rail && !touch) {
    let dir = 0, speed = 0, rafE = 0;
    const loop = () => {
      speed += ((dir * 4) - speed) * 0.06;                 // ease in and out of the glide
      if (Math.abs(speed) > 0.05) { rail.scrollLeft += speed; rafE = requestAnimationFrame(loop); } else { speed = 0; rafE = 0; rail.style.scrollSnapType = ''; }
    };
    rail.addEventListener('pointermove', (e) => {
      if (down) return; const r = rail.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      // right edge → cards slide left (scroll forward); left edge → cards slide right (scroll back)
      dir = x > 0.8 ? Math.min(1, (x - 0.8) / 0.18) : x < 0.2 ? -Math.min(1, (0.2 - x) / 0.18) : 0;
      if (reduce) dir *= 0.4;
      if (dir && !rafE) { rail.style.scrollSnapType = 'none'; rafE = requestAnimationFrame(loop); }
    });
    rail.addEventListener('pointerleave', () => { dir = 0; });
  }

  /* ---------------------------------------------------------------- the code window: terminal → index.html → style.css, typed on a loop */
  const term = $('[data-term]'), tabs = $$('[data-term-tab]');
  // each scene: [class, text, pause-after-ms?]; '\n' ends a line
  const SCENES = [
    { tab: 0, speed: 16, lines: [
      ['c', '$ ', 0], ['cmd', 'loom publish mira-portfolio\n', 420],
      ['t', '→ ', 0], ['', 'weaving 3 pages · 24 classes · 4 breakpoints\n', 260],
      ['ok', '✓ ', 0], ['', 'index.html        8.4 kB   ', 0], ['c', 'semantic · a11y ✓\n', 120],
      ['ok', '✓ ', 0], ['', 'about.html        5.1 kB\n', 120], ['ok', '✓ ', 0], ['', 'work.html         6.7 kB\n', 120],
      ['ok', '✓ ', 0], ['', 'style.css         9.9 kB   ', 0], ['c', '4 media queries\n', 120],
      ['ok', '✓ ', 0], ['', 'loom-fx.js        12 kB    ', 0], ['c', 'motion, reduced-motion safe\n', 120],
      ['ok', '✓ ', 0], ['', 'sitemap.xml · robots.txt · CSP\n', 300],
      ['s', '★ ', 0], ['', 'Live at ', 0], ['url', 'https://mira.netlify.app', 0], ['', ' in 0.4s\n', 2400]] },
    { tab: 1, speed: 7, lines: [
      ['c', '<!-- written by Loom, readable by humans -->\n', 60],
      ['p', '<', 0], ['t', 'section', 0], ['a', ' class', 0], ['p', '=', 0], ['s', '"hero"', 0], ['p', '>\n', 0],
      ['', '  ', 0], ['p', '<', 0], ['t', 'h1', 0], ['a', ' class', 0], ['p', '=', 0], ['s', '"display"', 0], ['a', ' data-fx', 0], ['p', '=', 0], ['s', '"split"', 0], ['p', '>', 0], ['', 'Designing calm products.', 0], ['p', '</', 0], ['t', 'h1', 0], ['p', '>\n', 0],
      ['', '  ', 0], ['p', '<', 0], ['t', 'p', 0], ['a', ' class', 0], ['p', '=', 0], ['s', '"lead"', 0], ['p', '>', 0], ['', 'Independent designer, Lisbon.', 0], ['p', '</', 0], ['t', 'p', 0], ['p', '>\n', 0],
      ['', '  ', 0], ['p', '<', 0], ['t', 'a', 0], ['a', ' class', 0], ['p', '=', 0], ['s', '"btn"', 0], ['a', ' href', 0], ['p', '=', 0], ['s', '"work.html"', 0], ['p', '>', 0], ['', 'See the work', 0], ['p', '</', 0], ['t', 'a', 0], ['p', '>\n', 0],
      ['p', '</', 0], ['t', 'section', 0], ['p', '>\n', 2200]] },
    { tab: 2, speed: 7, lines: [
      ['c', '/* one stylesheet · real media queries */\n', 60],
      ['t', '.display', 0], ['p', ' {\n', 0],
      ['a', '  font-size', 0], ['p', ': ', 0], ['s', 'clamp(56px, 10vw, 188px)', 0], ['p', ';\n', 0],
      ['a', '  letter-spacing', 0], ['p', ': ', 0], ['s', '-0.06em', 0], ['p', ';\n', 0],
      ['a', '  text-wrap', 0], ['p', ': ', 0], ['s', 'balance', 0], ['p', ';\n}\n', 0],
      ['c', '@media', 0], ['p', ' (max-width: 767px) {\n', 0],
      ['t', '  .grid-3', 0], ['p', ' { ', 0], ['a', 'grid-template-columns', 0], ['p', ': ', 0], ['s', '1fr', 0], ['p', '; }\n}\n', 2400]] }
  ];
  const esc2 = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const paint = (parts, partial) => { term.innerHTML = parts.map(([c, t]) => (c ? `<span class="${c}">${esc2(t)}</span>` : esc2(t))).join('') + (partial || '') + '<span class="caret" aria-hidden="true"></span>'; };
  const setTab = (i) => tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', String(k === i)); });
  if (reduce) { setTab(0); paint(SCENES[0].lines); }
  else {
    let si = 0, li = 0, ci = 0, parts = [], running = false, timer = 0;
    const step = () => {
      if (!running) return;
      const sc = SCENES[si];
      if (li >= sc.lines.length) { si = (si + 1) % SCENES.length; li = 0; ci = 0; parts = []; setTab(SCENES[si].tab); timer = setTimeout(step, 350); return; }
      const [c, t, pause] = sc.lines[li];
      if (ci < t.length) { ci = Math.min(t.length, ci + (c === 'cmd' ? 1 : 2)); const cur = t.slice(0, ci); paint(parts, c ? `<span class="${c}">${esc2(cur)}</span>` : esc2(cur)); timer = setTimeout(step, c === 'cmd' ? 55 : sc.speed); return; }
      parts.push([c, t]); li++; ci = 0; paint(parts); timer = setTimeout(step, pause || 0);
    };
    setTab(0); paint([]);
    new IntersectionObserver(([en]) => { const vis = en.isIntersecting; if (vis && !running) { running = true; step(); } else if (!vis && running) { running = false; clearTimeout(timer); } }, { threshold: 0.25 }).observe(term);
  }

  /* ---------------------------------------------------------------- final CTA threads */
  const ctaCanvas = $('[data-cta-canvas]'); let ctaP = 0;
  if (window.LoomThreads) LoomThreads.mount(ctaCanvas, { weft: 16, warp: 24, amp: 60, alpha: 0.35, progress: () => ctaP });
  if (G && ST && !reduce) ST.create({ trigger: '.fcta', start: 'top bottom', end: 'center center', scrub: true, onUpdate: (s) => (ctaP = s.progress) });

  /* ---------------------------------------------------------------- hero prompt: describe → build */
  const EX = ['A calm dental clinic in Leeds with online booking…', 'A dark, premium AI startup with pricing and FAQ…', 'An online shop selling handmade candles…', 'A cosy Italian restaurant with menu and bookings…', 'A yoga studio with classes, coaches and memberships…', 'A developer API platform with usage pricing…'];
  const hpIn = $('[data-hp-in]');
  if (hpIn) {
    let ei = 0, ci = 0, del = false, typer = 0;
    const tick = () => { if (document.activeElement === hpIn || hpIn.value) { hpIn.placeholder = 'Describe your website…'; typer = setTimeout(tick, 1200); return; }
      const w = EX[ei]; ci += del ? -1 : 1; hpIn.placeholder = w.slice(0, ci) + (reduce ? '' : '▍');
      if (!del && ci >= w.length) { del = true; typer = setTimeout(tick, 1800); return; } if (del && ci <= 0) { del = false; ei = (ei + 1) % EX.length; }
      typer = setTimeout(tick, del ? 18 : 42); };
    if (reduce) hpIn.placeholder = EX[0]; else (window.LoomSplash ? LoomSplash.done : Promise.resolve()).then(() => setTimeout(tick, 1400));
    $('[data-hprompt]').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.currentTarget; if (f.classList.contains('is-thinking')) return; const b = hpIn.value.trim() || EX[ei].replace(/…$/, '');
      const target = 'app.html?brief=' + encodeURIComponent(b.slice(0, 400));
      // show the team spinning up before handing over to the dashboard
      let th = null;
      if (window.LoomThink) { f.classList.add('is-thinking'); th = LoomThink.create({ agents: ['director', 'architect', 'designer', 'brand', 'copy', 'motion'], size: 's', steps: ['Reading your idea', 'Assembling your team', 'Opening your workspace'], every: 560 }); th.el.classList.add('hprompt__think'); f.append(th.el); hpIn.setAttribute('aria-busy', 'true'); }
      const go = await (window.LoomThink ? LoomThink.pace(async () => { const u = window.LoomAuth ? await LoomAuth.me() : null; return u || !(await LoomAuth.server()) ? target : 'auth.html?mode=signup&next=' + encodeURIComponent(target); }, 1800) : Promise.resolve(target));
      location.href = go;
      setTimeout(() => { if (th) th.stop(); f.classList.remove('is-thinking'); hpIn.removeAttribute('aria-busy'); }, 1500);  // if they come back with the back button
    });
  }

  /* ---------------------------------------------------------------- AI team: roster + live orchestration demo */
  const grid = $('[data-agents]'), A = window.LoomAgents;
  if (grid && A) {
    grid.innerHTML = A.TEAM.map((a) => `<article class="agent${a.id === 'director' ? ' agent--dir' : ''}" data-agent="${a.id}" style="--c:${a.color}">
      <span class="agent__av" aria-hidden="true">${a.glyph}</span><div><h3>${a.name}<small>${a.role}</small></h3><p>${a.desc}</p></div><em class="agent__st mono" aria-hidden="true"></em></article>`).join('');
    const DEMO = ['Make it feel premium, add pricing, then run a launch check', 'Design a logo and add subtle animations', 'Sell handmade candles and write a launch marketing plan', 'Scan for security issues and improve SEO', 'Help me go live: hosting, domain and DNS'];
    const textEl = $('[data-orch-text]'), route = $('[data-orch-route]'); let di = 0, alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const card = (id) => grid.querySelector(`[data-agent="${id}"]`);
    async function demo() {
      while (alive) {
        const q = DEMO[di++ % DEMO.length]; textEl.textContent = '';
        grid.querySelectorAll('.agent').forEach((c) => { c.classList.remove('is-lit', 'is-busy', 'is-done'); c.querySelector('.agent__st').textContent = ''; });
        route.textContent = 'Director is listening…';
        for (let i = 1; i <= q.length; i++) { textEl.textContent = q.slice(0, i); await wait(reduce ? 0 : 28); }
        const plan = A.LOCAL.director(q); card('director').classList.add('is-lit', 'is-done');
        route.innerHTML = ['Director', ...plan.steps.map((st) => A.byId(st.agent).name)].map((n, i) => `<span style="--i:${i}">${n}</span>`).join('<b>→</b>');
        await wait(500);
        for (const st of plan.steps) {
          const c = card(st.agent); if (!c) continue; c.classList.add('is-lit', 'is-busy'); c.querySelector('.agent__st').textContent = 'working';
          await wait(reduce ? 300 : 850); c.classList.remove('is-busy'); c.classList.add('is-done'); c.querySelector('.agent__st').textContent = 'done ✓';
        }
        await wait(2200);
      }
    }
    new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); demo(); } }, { threshold: 0.25 }).observe(grid);
    // spotlight follows the pointer across the roster
    grid.addEventListener('pointermove', (e) => grid.querySelectorAll('.agent').forEach((c) => { const r = c.getBoundingClientRect(); c.style.setProperty('--x', `${e.clientX - r.left}px`); c.style.setProperty('--y', `${e.clientY - r.top}px`); }));
  }

  /* ---------------------------------------------------------------- magnetic + cursor */
  function bindMagnetic() {
    if (touch || reduce || !G) return;
    $$('[data-mag]').forEach((el) => {
      if (el._mag) return; el._mag = 1;
      const xt = G.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), yt = G.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xt((e.clientX - r.left - r.width / 2) * 0.3); yt((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });
  }
  bindMagnetic();
  if (!touch && !reduce && G) {
    doc.classList.add('has-lcur');
    const c = $('.lcur'), d = $('.lcur__d', c), r = $('.lcur__r', c), lab = $('span', r);
    let mx = -100, my = -100, rx = mx, ry = my, first = true;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (first) { rx = mx; ry = my; first = false; } }, { passive: true });
    G.ticker.add(() => { rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18); d.style.transform = `translate3d(${mx}px,${my}px,0)`; r.style.transform = `translate3d(${rx}px,${ry}px,0)`; });
    document.addEventListener('pointerover', (e) => {
      const l = e.target.closest('a, button, summary, [role="tab"], input, label'), v = !l && e.target.closest('[data-cursor="view"]');
      c.classList.toggle('is-view', !!v); c.classList.toggle('is-link', !v && !!l); lab.textContent = v ? 'PREVIEW' : '';
    });
    document.addEventListener('pointerleave', () => { mx = my = -100; });
  }
  addEventListener('load', () => ST && ST.refresh());
})();
