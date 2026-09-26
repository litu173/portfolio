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

  /* ---------------------------------------------------------------- nav, menu, auth */
  const nav = $('[data-nav]');
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 30), { passive: true });
  const menu = $('#smenu'), burger = $('[data-burger]');
  function closeMenu() { if (!menu.hidden) { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); } }
  burger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; burger.setAttribute('aria-expanded', String(open)); open ? lenis && lenis.stop() : lenis && lenis.start(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
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
    G.set(chars, { opacity: 0 });
    title.querySelectorAll('[data-grad="true"] .ch').forEach((c) => c.classList.add('is-ghost'));
    G.set('[data-hero-in]', { y: 24, opacity: 0 }); G.set('.fl', { opacity: 0, scale: 0.8 });
    lenis && lenis.stop();
    (window.LoomSplash ? LoomSplash.done : Promise.resolve()).then(() => play());
  }
  function play() {
    doc.classList.add('is-ready');
    const tl = G.timeline({ delay: 0.25 });
    // like the portfolio headline: letters untangle from scattered positions, then outlined letters turn solid
    const ghosts = [...title.querySelectorAll('.ch.is-ghost')];
    tl.fromTo(chars, { x: () => (Math.random() - 0.5) * 320, y: () => (Math.random() - 0.5) * 220, rotate: () => (Math.random() - 0.5) * 70, opacity: 0 },
      { x: 0, y: 0, rotate: 0, opacity: 1, duration: 1.6, ease: 'expo.out', stagger: { each: 0.028, from: 'random' } })
      .add(() => ghosts.forEach((c, i) => setTimeout(() => c.classList.remove('is-ghost'), i * 85)), 0.95)
      .to('[data-hero-in]', { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=0.9')
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
  const BGS = ['#F2F4F8', '#DCE7FF', '#DFF5E9', '#FFF0D6'];
  let lastStep = -1;
  function place(el, target, pad = 0) {
    const s = M.stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    Object.assign(el.style, { left: r.left - s.left - pad + 'px', top: r.top - s.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
  }
  function cursorTo(target, dx = 0.5, dy = 0.5) { const s = M.stage.getBoundingClientRect(), r = target.getBoundingClientRect(); M.cur.style.transform = `translate(${r.left - s.left + r.width * dx}px, ${r.top - s.top + r.height * dy}px)`; }
  function tour(p) {
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
  const TL = window.LoomTemplates ? LoomTemplates.list : [];
  const cats = ['All', ...new Set(TL.map((t) => t.category))];
  filters.innerHTML = cats.map((c, i) => `<button class="chipf" type="button" aria-pressed="${i === 0}" data-cat="${c}">${c}</button>`).join('');
  rail.innerHTML = TL.map((t) => `<article class="tcard" data-cat="${t.category}">
    <div class="tcard__frame" data-cursor="view"><iframe sandbox="allow-same-origin" title="${t.name} template preview" tabindex="-1" loading="lazy"></iframe>
      <a class="btn btn--light btn--sm tcard__use" href="app.html?template=${t.id}">Use ${t.name} →</a></div>
    <div class="tcard__meta"><h3>${t.name}</h3><span>${t.category} · ${t.pages} page${t.pages > 1 ? 's' : ''}</span></div><p>${t.desc}</p></article>`).join('');
  // live previews, scaled to the card; hovering scrolls the page inside
  $$('.tcard').forEach((card, i) => {
    const f = card.querySelector('iframe'), frame = card.querySelector('.tcard__frame');
    const load = () => { if (f.srcdoc) return; f.srcdoc = LoomTemplates.previewHTML(TL[i].id); };
    const scale = () => frame.clientWidth / 1280;
    // Only CSS variables here: the base transform and the hover scroll both live in CSS
    const fit = () => { const s = scale(); card.style.setProperty('--s', s); try { const h = f.contentDocument.documentElement.scrollHeight; f.style.height = h + 'px'; card.style.setProperty('--scroll', Math.max(0, h - frame.clientHeight / s) + 'px'); } catch (e) {} };
    new IntersectionObserver(([en]) => { if (en.isIntersecting) { load(); setTimeout(fit, 400); } }, { rootMargin: '200px' }).observe(card);
    new ResizeObserver(fit).observe(frame);
    f.addEventListener('load', () => setTimeout(fit, 50));
    // Use-template links go through sign-in if needed
    card.querySelector('.tcard__use').addEventListener('click', async (e) => { const u = window.LoomAuth ? await LoomAuth.me() : null; if (!u) { e.preventDefault(); location.href = `auth.html?mode=signup&next=${encodeURIComponent('app.html?template=' + TL[i].id)}`; } });
  });
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    $$('[data-cat]', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.tcard').forEach((c) => (c.hidden = b.dataset.cat !== 'All' && c.dataset.cat !== b.dataset.cat));
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

  /* ---------------------------------------------------------------- typed terminal */
  const term = $('[data-term]');
  const LINES = [['c', '$ loom publish "mira-portfolio"'], ['', ''], ['t', '→ '], ['', 'building 3 pages · 24 classes · 4 breakpoints'], ['ok', '✓ '], ['', 'sites/mira-portfolio/index.html      8.4 kB'], ['ok', '✓ '], ['', 'sites/mira-portfolio/about.html      5.1 kB'], ['ok', '✓ '], ['', 'sites/mira-portfolio/work.html       6.7 kB'], ['ok', '✓ '], ['', 'sites/mira-portfolio/style.css       9.9 kB'], ['', ''], ['s', '★ '], ['', 'Published in 0.4s — plain HTML & CSS, ready to host anywhere.']];
  const renderTerm = (html) => (term.innerHTML = html + '<span class="caret"></span>');
  const finalTerm = () => LINES.reduce((acc, [c, t], i) => acc + (c ? `<span class="${c}">${t}</span>` : t) + ((c === '' && i > 0) || c === 'c' ? '\n' : ''), '');
  if (reduce) renderTerm(finalTerm());
  else new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return; obs.disconnect();
    let html = '', li = 0, ci = 0;
    const tick = () => {
      if (li >= LINES.length) { renderTerm(html); return; }
      const [c, t] = LINES[li];
      if (ci < t.length) { ci += c === 'c' ? 1 : 3; renderTerm(html + (c ? `<span class="${c}">${t.slice(0, ci)}</span>` : t.slice(0, ci))); setTimeout(tick, c === 'c' ? 38 : 12); return; }
      html += (c ? `<span class="${c}">${t}</span>` : t) + ((c === '' && li > 0) || c === 'c' ? '\n' : ''); li++; ci = 0; setTimeout(tick, c === 'c' ? 380 : c === '' ? 140 : 0);
    };
    tick();
  }, { threshold: 0.4 }).observe(term);

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
      e.preventDefault(); const b = hpIn.value.trim() || EX[ei].replace(/…$/, '');
      const target = 'app.html?brief=' + encodeURIComponent(b.slice(0, 400));
      const u = window.LoomAuth ? await LoomAuth.me() : null;
      location.href = u || !(await LoomAuth.server()) ? target : 'auth.html?mode=signup&next=' + encodeURIComponent(target);
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
      const v = e.target.closest('[data-cursor="view"]'), l = e.target.closest('a, button, summary, [role="tab"], input, label');
      c.classList.toggle('is-view', !!v); c.classList.toggle('is-link', !v && !!l); lab.textContent = v ? 'PREVIEW' : '';
    });
    document.addEventListener('pointerleave', () => { mx = my = -100; });
  }
  addEventListener('load', () => ST && ST.refresh());
})();
