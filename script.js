/* ==========================================================================
   Md. Mutaher Hossain — Portfolio core
   Shared by index.html and case.html. Content comes from content/content.js.
   Sections: utils · prefs · dialogs · listen · chrome · home · boot
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ UTILS */
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PAGE = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // CMS visibility helpers: items with hidden:true, strings listed in obj.hiddenItems[key], fields in obj.hiddenFields
  const shown = (arr) => (arr || []).filter((x) => !(x && typeof x === 'object' && x.hidden));
  const strs = (obj, key) => ((obj && obj[key]) || []).filter((v) => !(((obj.hiddenItems || {})[key]) || []).includes(v));
  const fieldOn = (obj, key) => !!obj && !(obj.hiddenFields || []).includes(key) && obj[key] !== '' && obj[key] != null;
  const DEFAULT_LAYOUT = ['hero', 'stats', 'marquee', 'mission', 'pillars', 'story', 'services', 'work', 'toolbox', 'cta'];
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const motion = () => doc.dataset.motion || 'full';
  const fullMotion = () => motion() === 'full';
  const hasGSAP = () => !!(window.gsap && window.ScrollTrigger);
  const ARROW_NE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  // Content (+ live preview override from /admin)
  let C = window.SITE_CONTENT || {};
  if (params.get('preview') === '1') {
    try { const s = sessionStorage.getItem('mh-preview'); if (s) C = JSON.parse(s); } catch (e) {}
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'mh-brand-preview') { brandPreview(e.data.css); return; }
      if (e.data && e.data.type === 'mh-scroll') {
        const el = $(e.data.target); if (!el) return;
        const y = el.getBoundingClientRect().top + scrollY - (e.data.target === '#top' ? 0 : 10);
        window.MH.lenis ? window.MH.lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' });
        return;
      }
      if (!e.data || e.data.type !== 'mh-preview') return;
      try {
        sessionStorage.setItem('mh-preview', JSON.stringify(e.data.content));
        sessionStorage.setItem('mh-preview-y', String(scrollY));
        if (e.data.slug) { const u = new URL(location.href); u.searchParams.set('slug', e.data.slug); history.replaceState(null, '', u); }
      } catch (err) {}
      location.reload();
    });
  }
  window.MH = { content: C, esc, shown, strs, fieldOn };
  function brandPreview(css) {
    let st = document.getElementById('brand-preview');
    if (!css) { st && st.remove(); try { sessionStorage.removeItem('mh-brand-preview'); } catch (e) {} }
    else { if (!st) { st = document.createElement('style'); st.id = 'brand-preview'; document.head.appendChild(st); } st.textContent = css; }
    doc.dataset.palette = 'brand-' + Date.now(); // repaint canvases
  }
  if (params.get('preview') === '1') { try { const bp = sessionStorage.getItem('mh-brand-preview'); if (bp) brandPreview(bp); } catch (e) {} }

  function announce(msg) { const el = $('[data-announce]'); if (!el) return; el.textContent = ''; setTimeout(() => (el.textContent = msg), 60); }
  function toast(msg) {
    const t = $('.toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  /** Split an element's text into masked words for reveals; keeps a screen-reader copy. */
  function splitWords(el) {
    if (!el || el.dataset.splitDone) return [];
    const label = el.textContent.trim();
    const frag = document.createDocumentFragment();
    const words = [];
    const walk = (node, wrapTag) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word line';
            const inner = document.createElement(wrapTag || 'span'); inner.className = 'line__in'; inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w); words.push(inner);
          });
        } else if (n.nodeType === 1) walk(n, n.tagName.toLowerCase());
      });
    };
    walk(el);
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.appendChild(frag);
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
    el.textContent = ''; el.append(sr, vis); el.dataset.splitDone = '1';
    return words;
  }

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/—+*';
  function scramble(el, dur = 900) {
    if (!fullMotion()) return;
    const final = el.dataset.final || el.textContent; el.dataset.final = final;
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', final);
    const start = performance.now();
    cancelAnimationFrame(el._scr);
    const tick = (now) => {
      const p = clamp((now - start) / dur);
      const n = Math.floor(p * final.length);
      el.textContent = final.slice(0, n) + final.slice(n).replace(/[^\s—-]/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      if (p < 1) el._scr = requestAnimationFrame(tick); else el.textContent = final;
    };
    el._scr = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ PREFS */
  const Prefs = {
    key: 'mh-prefs',
    read() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } },
    write(p) { try { localStorage.setItem(this.key, JSON.stringify(p)); } catch (e) {} },
    set(k, v) { const p = this.read(); p[k] = v; this.write(p); this.apply(p, k); },
    reset() { const m = this.read().motion; this.write({}); this.apply({}, 'reset'); if (m) reloadKeepingScroll(); },
    resolvedTheme(p) { const t = p.theme || 'auto'; return t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t; },
    apply(p = this.read(), changed) {
      const prevMotion = doc.dataset.motion;
      doc.dataset.theme = this.resolvedTheme(p);
      doc.dataset.vision = p.vision || 'default';
      doc.dataset.contrast = p.contrast ? 'high' : 'normal';
      doc.dataset.font = p.font ? 'readable' : 'default';
      doc.dataset.links = p.links ? 'underline' : 'default';
      doc.dataset.fx = p.fx === false ? 'off' : 'on';
      doc.style.fontSize = p.textSize && p.textSize !== '100' ? p.textSize + '%' : '';
      const m = p.motion || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full');
      doc.dataset.motion = m;
      if (p.font) loadReadableFont();
      const meta = $('meta[name="theme-color"]'); if (meta) meta.content = getComputedStyle(doc).getPropertyValue('--bg').trim();
      syncPanel(p);
      if (changed === 'motion' && prevMotion !== m) { toast('Applying motion setting…'); setTimeout(reloadKeepingScroll, 500); }
      if (changed === 'textSize' && hasGSAP()) setTimeout(() => ScrollTrigger.refresh(), 100);
    }
  };
  function loadReadableFont() {
    if ($('#atkinson')) return;
    const l = document.createElement('link'); l.id = 'atkinson'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(l);
  }
  function reloadKeepingScroll() { try { sessionStorage.setItem('mh-y', String(scrollY)); } catch (e) {} location.reload(); }
  function syncPanel(p) {
    const panel = $('#a11y-panel'); if (!panel) return;
    const val = { theme: p.theme || 'auto', vision: p.vision || 'default', textSize: String(p.textSize || '100'), motion: doc.dataset.motion };
    Object.entries(val).forEach(([k, v]) => { const r = panel.querySelector(`input[name="${k}"][value="${v}"]`); if (r) r.checked = true; });
    const chk = { contrast: !!p.contrast, font: !!p.font, links: !!p.links, fx: p.fx !== false };
    Object.entries(chk).forEach(([k, v]) => { const c = panel.querySelector(`input[type="checkbox"][data-pref="${k}"]`); if (c) c.checked = v; });
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if ((Prefs.read().theme || 'auto') === 'auto') Prefs.apply(); });

  function toggleTheme(originEl) {
    const next = doc.dataset.theme === 'dark' ? 'light' : 'dark';
    const run = () => Prefs.set('theme', next);
    if (!document.startViewTransition || !fullMotion()) { run(); announce(`${next} theme`); return; }
    const r = (originEl || document.body).getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(run);
    vt.ready.then(() => {
      doc.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' });
    });
    announce(`${next} theme`);
  }

  /* ---------------------------------------------------------------- DIALOGS */
  const Dialog = {
    open: null,
    show(el, trigger) {
      if (this.open) this.hide(this.open);
      el.hidden = false; this.open = el; el._trigger = trigger || document.activeElement;
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      if (el.classList.contains('menu')) requestAnimationFrame(() => el.classList.add('is-open'));
      const f = el.querySelector('input:checked, a, button, input, select, [tabindex]:not([tabindex="-1"])');
      setTimeout(() => f && f.focus(), 30);
      window.MH.lenis && el.matches('.menu, .shortcuts, .lightbox') && window.MH.lenis.stop();
    },
    hide(el) {
      if (!el || el.hidden) return;
      const done = () => { el.hidden = true; };
      if (el.classList.contains('menu')) { el.classList.remove('is-open'); setTimeout(done, fullMotion() ? 900 : 0); } else done();
      const t = el._trigger; if (t) { t.setAttribute('aria-expanded', 'false'); t.focus({ preventScroll: true }); }
      if (this.open === el) this.open = null;
      window.MH.lenis && window.MH.lenis.start();
    },
    trap(e) {
      const el = Dialog.open; if (!el || e.key !== 'Tab') return;
      const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', el).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  window.MH.Dialog = Dialog;

  /* ----------------------------------------------------------------- LISTEN */
  const Listen = {
    supported: 'speechSynthesis' in window,
    items: [], i: 0, playing: false, paused: false, voice: null, rate: 1, current: null,
    el: null,
    scoreVoice(v) {
      let s = 0; const n = v.name;
      if (/natural|neural/i.test(n)) s += 100;
      if (/premium|enhanced|siri/i.test(n)) s += 80;
      if (/google/i.test(n)) s += 60;
      if (/samantha|daniel|karen|moira|serena|ava|zoe|allison|aria|jenny|guy|sonia|libby|ryan/i.test(n)) s += 40;
      if (/en[-_](US|GB)/i.test(v.lang)) s += 6;
      if (/compact|espeak|novelty|bad news|bells|boing|bubbles|cellos|whisper|zarvox|trinoids|jester|organ|superstar|wobble|albert|bahh|fred/i.test(n)) s -= 200;
      return s;
    },
    loadVoices() {
      if (!this.supported) return;
      const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      if (!all.length) return;
      all.sort((a, b) => this.scoreVoice(b) - this.scoreVoice(a));
      const saved = (() => { try { return localStorage.getItem('mh-voice'); } catch (e) { return null; } })();
      this.voice = all.find((v) => v.name === saved) || all[0];
      const sel = $('[data-listen="voice"]');
      if (sel) sel.innerHTML = all.slice(0, 24).map((v) => `<option value="${esc(v.name)}" ${v === this.voice ? 'selected' : ''}>${esc(v.name.replace(/\s*\(.*\)/, ''))} · ${esc(v.lang)}</option>`).join('');
    },
    collect() {
      const sel = 'h1, h2, h3, p, li, blockquote, figcaption, dt, dd';
      const root = $('main');
      return $$(sel, root).filter((el) => {
        if (el.closest('[aria-hidden="true"], [hidden], noscript, .listen, .hero__meta, [data-noread]')) return false;
        if (el.querySelector(sel.split(', ').map((s) => ':scope ' + s).join(','))) return false;
        return !!this.text(el);
      });
    },
    text(el) {
      const c = el.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      return c.textContent.replace(/\s+/g, ' ').trim();
    },
    target(el) { const sr = el.closest('.sr-only'); return sr ? (sr === el ? el.parentElement : sr.parentElement.closest(':not(.sr-only)')) : el; },
    start() {
      if (!this.supported) { toast("Read-aloud isn't supported in this browser"); return; }
      this.items = this.collect();
      // Start from the first element in view
      const idx = this.items.findIndex((el) => this.target(el).getBoundingClientRect().bottom > 80);
      this.i = Math.max(0, idx); this.playing = true; this.paused = false;
      this.el.hidden = false; this.el.classList.remove('is-paused');
      $('[data-action="listen"]').setAttribute('aria-pressed', 'true');
      announce('Reading the page aloud. Use the player at the bottom to pause or skip.');
      this.speak();
    },
    speak() {
      speechSynthesis.cancel();
      const el = this.items[this.i]; if (!el) { this.stop(); return; }
      this.highlight(el);
      const sentences = this.text(el).match(/[^.!?…]+[.!?…]*["”’)]?\s*/g) || [this.text(el)];
      let k = 0;
      const next = () => {
        if (!this.playing) return;
        if (k >= sentences.length) { this.i++; this.speak(); return; }
        const u = new SpeechSynthesisUtterance(sentences[k++].trim());
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; }
        u.rate = this.rate; u.pitch = 1;
        u.onend = () => next();
        u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') next(); };
        this.current = u; speechSynthesis.speak(u);
      };
      next();
    },
    highlight(el) {
      $$('.is-reading').forEach((n) => n.classList.remove('is-reading'));
      const t = this.target(el); t.classList.add('is-reading');
      const r = t.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight - 110) {
        const y = scrollY + r.top - innerHeight * 0.3;
        window.MH.lenis ? window.MH.lenis.scrollTo(y, { duration: 1.1 }) : scrollTo({ top: y, behavior: fullMotion() ? 'smooth' : 'auto' });
      }
    },
    toggle() {
      if (!this.playing) return this.start();
      if (this.paused) { this.paused = false; this.el.classList.remove('is-paused'); $('[data-listen="toggle"]').setAttribute('aria-label', 'Pause'); this.speak(); }
      else { this.paused = true; speechSynthesis.cancel(); this.el.classList.add('is-paused'); $('[data-listen="toggle"]').setAttribute('aria-label', 'Play'); }
    },
    jump(dir) {
      const cur = this.items[this.i]; if (!cur) return;
      const sec = cur.closest('section, footer, article, .blk');
      let j = this.i;
      if (dir > 0) { while (j < this.items.length && this.items[j].closest('section, footer, article, .blk') === sec) j++; }
      else {
        j--; while (j > 0 && this.items[j].closest('section, footer, article, .blk') === sec) j--;
        const prevSec = this.items[Math.max(0, j)].closest('section, footer, article, .blk');
        while (j > 0 && this.items[j - 1].closest('section, footer, article, .blk') === prevSec) j--;
      }
      this.i = clamp(j, 0, this.items.length - 1); this.paused = false; this.el.classList.remove('is-paused'); this.speak();
    },
    stop() {
      this.playing = false; this.paused = false; speechSynthesis.cancel();
      $$('.is-reading').forEach((n) => n.classList.remove('is-reading'));
      if (this.el) this.el.hidden = true;
      const b = $('[data-action="listen"]'); if (b) { b.setAttribute('aria-pressed', 'false'); }
      announce('Reading stopped');
    },
    init() {
      this.el = $('.listen'); if (!this.el) return;
      if (this.supported) { this.loadVoices(); speechSynthesis.onvoiceschanged = () => this.loadVoices(); }
      this.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-listen]'); if (!b || b.tagName === 'SELECT') return;
        const a = b.dataset.listen;
        if (a === 'toggle') this.toggle(); else if (a === 'next') this.jump(1); else if (a === 'prev') this.jump(-1); else if (a === 'stop') this.stop();
      });
      $('[data-listen="rate"]').addEventListener('change', (e) => { this.rate = +e.target.value; if (this.playing && !this.paused) this.speak(); });
      $('[data-listen="voice"]').addEventListener('change', (e) => {
        this.voice = speechSynthesis.getVoices().find((v) => v.name === e.target.value) || this.voice;
        try { localStorage.setItem('mh-voice', this.voice.name); } catch (err) {}
        if (this.playing && !this.paused) this.speak();
      });
      addEventListener('pagehide', () => this.supported && speechSynthesis.cancel());
    }
  };

  /* ----------------------------------------------------------------- CHROME */
  function initLenis() {
    if (!hasGSAP()) return;
    gsap.registerPlugin(ScrollTrigger);
    if (!fullMotion() || !window.Lenis) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.MH.lenis = lenis;
  }

  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target; if (!el) return;
    const done = () => {
      const h = el.matches('h1,h2,h3,[tabindex]') ? el : el.querySelector('h1, h2') || el;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    };
    if (window.MH.lenis) window.MH.lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -10, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: done });
    else { el.scrollIntoView({ behavior: motion() === 'none' ? 'auto' : 'smooth' }); setTimeout(done, 600); }
  }
  window.MH.scrollTo = scrollToTarget;

  function initChrome() {
    doc.classList.add('js');
    // Year / socials / email / cv
    $$('[data-year]').forEach((n) => (n.textContent = new Date().getFullYear()));
    const site = C.site || {};
    $$('[data-cv]').forEach((a) => (a.href = site.cvUrl || '#'));
    $$('[data-email]').forEach((a) => { a.href = `mailto:${site.email}?subject=${encodeURIComponent("Let's work together")}`; a.textContent = site.email; });
    const socials = shown(site.socials).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}<span class="sr-only"> (opens in a new tab)</span></a>`);
    $$('[data-socials]').forEach((n) => (n.innerHTML = socials.join('')));
    $$('[data-social-list]').forEach((n) => (n.innerHTML = socials.map((s) => `<li>${s}</li>`).join('')));

    // Panel prefs
    const panel = $('#a11y-panel');
    if (panel) {
      syncPanel(Prefs.read());
      panel.addEventListener('change', (e) => {
        const t = e.target;
        if (t.type === 'radio') Prefs.set(t.name, t.value);
        else if (t.type === 'checkbox') Prefs.set(t.dataset.pref, t.checked);
        if (t.name !== 'motion') announce('Setting saved');
      });
      panel.querySelector('[data-reset]').addEventListener('click', () => { Prefs.reset(); announce('Settings reset'); });
      panel.querySelector('[data-close]').addEventListener('click', () => Dialog.hide(panel));
      document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !e.target.closest('[data-action="a11y"]')) Dialog.hide(panel); });
    }

    // Action buttons
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]'); if (!b) return;
      const a = b.dataset.action;
      if (a === 'theme') toggleTheme(b);
      else if (a === 'a11y') { const p = $('#a11y-panel'); p.hidden ? Dialog.show(p, $('.nav [data-action="a11y"]')) : Dialog.hide(p); }
      else if (a === 'listen') { Listen.playing ? Listen.stop() : Listen.start(); }
      else if (a === 'menu') { const m = $('#menu'); m.hidden || !m.classList.contains('is-open') ? Dialog.show(m, b) : Dialog.hide(m); }
      else if (a === 'top') scrollToTarget('#top') ;
    });
    const sc = $('.shortcuts'); if (sc) sc.querySelector('[data-close]').addEventListener('click', () => Dialog.hide(sc));

    // Anchor links (smooth + focus management)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href'); if (id.length < 2) { e.preventDefault(); return; }
      const t = $(id); if (!t) return;
      e.preventDefault();
      const m = $('#menu'); if (m && !m.hidden) Dialog.hide(m);
      scrollToTarget(t);
      history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
    });

    // Copy email
    $$('[data-copy-email]').forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(site.email); toast('Copied — talk soon'); } catch (e) { toast(site.email); }
    }));

    // Keyboard
    let gPending = 0;
    document.addEventListener('keydown', (e) => {
      Dialog.trap(e);
      if (e.key === 'Escape') {
        if (Dialog.open) { Dialog.hide(Dialog.open); return; }
        if (Listen.playing) { Listen.stop(); return; }
      }
      const typing = e.target.closest('input, textarea, select, [contenteditable="true"]');
      if (e.altKey && e.code === 'KeyA') { e.preventDefault(); $('.nav [data-action="a11y"]').click(); return; }
      if (e.altKey && e.code === 'KeyL') { e.preventDefault(); Listen.playing ? Listen.stop() : Listen.start(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (gPending && Date.now() - gPending < 900) {
        gPending = 0;
        const map = { w: '#work', a: '#about', c: '#contact', s: '#services', h: '#top' };
        if (map[k]) {
          e.preventDefault();
          if ($(map[k])) scrollToTarget(map[k]); else location.href = 'index.html' + map[k];
        }
        return;
      }
      if (k === 'g') { gPending = Date.now(); return; }
      if (k === 't') toggleTheme($('.nav [data-action="theme"]'));
      if (e.key === '?') { const s = $('.shortcuts'); s && (s.hidden ? Dialog.show(s) : Dialog.hide(s)); }
    });

    // Nav hide/show
    const nav = $('[data-nav]'); let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      lastY = y;
      const bar = $('.progress > i'); if (bar) bar.style.transform = `scaleY(${clamp(y / (doc.scrollHeight - innerHeight || 1))})`;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    Listen.init();
    initCursor();
    initMagnetic();
    initTransitions();
  }

  function initCursor() {
    if (isTouch || !fullMotion() || doc.dataset.contrast === 'high' || !hasGSAP()) return;
    const cur = $('.cursor'); if (!cur) return;
    doc.classList.add('has-cursor');
    const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), label = $('.cursor__label', cur);
    let mx = -100, my = -100, rx = mx, ry = my, state = '', first = true;
    cur.classList.add('is-hidden');
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (first) { rx = mx; ry = my; first = false; } cur.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    gsap.ticker.add(() => {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, label, select, input[type="range"]');
      let s = '', l = '';
      if (t) { s = t.dataset.cursor || 'link'; l = t.dataset.cursorLabel || (s === 'view' ? 'VIEW' : s === 'drag' ? 'DRAG' : ''); }
      if (s !== state) { cur.classList.remove('is-link', 'is-view', 'is-drag'); if (s) cur.classList.add('is-' + s); state = s; }
      label.textContent = l;
    });
  }

  function initMagnetic() {
    if (isTouch || !fullMotion() || !hasGSAP()) return;
    const bind = (el) => {
      if (el._mag) return; el._mag = 1;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    };
    $$('[data-magnetic]').forEach(bind);
    window.MH.bindMagnetic = () => $$('[data-magnetic]').forEach(bind);
  }

  /** Fill the curtain title with masked words (last word in italic serif, like the preloader). */
  function curtainWords(text) {
    const t = $('.curtain__title'); t.textContent = '';
    const ws = String(text || '').trim().split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => {
      const o = document.createElement('span'), n = document.createElement('span');
      o.className = 'cw' + (i === ws.length - 1 && ws.length > 1 ? ' cw--em' : ''); n.textContent = w; o.appendChild(n); t.appendChild(o);
    });
    return $$('.cw > span', t);
  }

  // Resolves when the arrival curtain has mostly moved away — page entrance animations wait for it.
  let curtainResolve; window.MH.curtainDone = new Promise((r) => (curtainResolve = r));

  function initTransitions() {
    const curtain = $('.curtain');
    const arriving = doc.classList.contains('is-arriving');
    window.MH.arrived = arriving;
    try { sessionStorage.removeItem('mh-curtain'); } catch (e) {}
    if (!curtain || !hasGSAP()) { doc.classList.remove('is-arriving'); curtain && (curtain.style.transform = ''); curtainResolve(); return; }
    // GSAP owns the transform: y is pinned to 0 so it never stacks with the CSS translateY(100%)
    curtain.style.transform = '';
    gsap.set(curtain, { y: 0, yPercent: arriving ? 0 : 100 });
    if (arriving) {
      const words = $$('.curtain__title .cw > span');
      const fonts = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);
      // With a #section target, give the jump underneath time to settle before lifting the curtain
      const ready = Promise.all([fonts, new Promise((r) => setTimeout(r, location.hash ? 850 : 250))]);
      ready.then(() => {
        gsap.timeline({ onComplete: () => { gsap.set(curtain, { yPercent: 100 }); curtainWords(''); doc.classList.remove('is-arriving'); } })
          .to(words, { yPercent: -110, duration: 0.6, ease: 'expo.in', stagger: 0.06 }, 0)
          .to(curtain, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, 0.4)
          .call(curtainResolve, null, 0.95);
      });
    } else curtainResolve();

    let leaving = false;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || leaving) return;
      if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname) || (url.pathname === location.pathname && url.search === location.search)) return;
      if (motion() === 'none') return;
      e.preventDefault(); leaving = true; doc.classList.add('is-leaving');
      const title = a.dataset.title || a.textContent.trim().split('\n')[0] || '';
      try { sessionStorage.setItem('mh-curtain', title || ' '); } catch (err) {}
      const words = curtainWords(title);
      gsap.set(words, { yPercent: 110 });
      window.MH.lenis && window.MH.lenis.stop();
      gsap.timeline()
        .fromTo(curtain, { y: 0, yPercent: 100 }, { y: 0, yPercent: 0, duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(words, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.45)
        .call(() => (location.href = url.href), null, 1.2);
    });
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      // Back/forward cache: the page returns still covered — lift the curtain instead of snapping it away
      leaving = false; doc.classList.remove('is-leaving'); window.MH.lenis && window.MH.lenis.start();
      const words = $$('.curtain__title .cw > span');
      gsap.timeline({ onComplete: () => { gsap.set(curtain, { yPercent: 100 }); curtainWords(''); } })
        .to(words, { yPercent: -110, duration: 0.5, ease: 'expo.in', stagger: 0.05 }, 0)
        .to(curtain, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 0.25);
    });
  }

  /** Generic reveals shared by all pages. Call after content is in the DOM. */
  function initReveals(root = document) {
    // Split & hide now (under the curtain); start triggers only once the curtain has moved away
    const splits = $$('[data-split]', root).map((el) => {
      const words = splitWords(el);
      if (hasGSAP() && motion() !== 'none' && words.length) gsap.set(words, { yPercent: 110 });
      return [el, words];
    });
    (window.MH.curtainDone || Promise.resolve()).then(() => {
      splits.forEach(([el, words]) => {
        if (!hasGSAP() || motion() === 'none' || !words.length) return;
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
          onEnter: () => gsap.to(words, { yPercent: 0, duration: motion() === 'full' ? 1.2 : 0.6, ease: 'expo.out', stagger: 0.045 }) });
      });
      const arrived = !!window.MH.arrived;
      $$('[data-scramble]', root).forEach((el) => {
        if (!hasGSAP()) return;
        if (arrived && el.getBoundingClientRect().top < innerHeight) { gsap.from(el, { opacity: 0, y: 12, duration: 0.9, ease: 'expo.out' }); el.addEventListener('pointerenter', () => scramble(el, 500)); return; }
        ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scramble(el) });
        el.addEventListener('pointerenter', () => scramble(el, 500));
      });
      const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px' });
      $$('[data-reveal], [data-curtain]', root).forEach((el) => io.observe(el));
    });
  }
  window.MH.initReveals = initReveals;

  /* ------------------------------------------------------------------- HOME */
  function renderHome() {
    applyLayout();
    $$('[data-bind]').forEach((el) => {
      const path = el.dataset.bind.split('.'), key = path.pop(), obj = get(C, path.join('.'));
      const v = obj && obj[key];
      if (v != null) el.textContent = v;
      const target = el.closest('.chip') || el;
      if (!fieldOn(obj, key)) target.setAttribute('data-cms-hidden', '');
    });

    // Hero title
    const h = $('[data-hero-title]'), lines = strs(C.hero, 'lines');
    h.innerHTML = `<span class="sr-only">${esc(lines.join(' '))}</span><span aria-hidden="true">${lines.map((l, i) =>
      `<span class="hl ${i > 0 ? 'hl--ghost' : ''} ${i === lines.length - 1 ? 'hl--accent' : ''}" data-line="${i}">${l.split(' ').map((w) => `<span class="hw">${[...w].map((ch) => `<span class="char">${esc(ch)}</span>`).join('')}</span>`).join(' ')}</span>`).join('')}</span>`;

    // Stats
    $('[data-stats]').innerHTML = shown(C.stats).map((s) =>
      `<li class="stat" data-reveal><p class="stat__num" aria-hidden="true"><span class="affix">${esc(s.prefix)}</span><span data-to="${+s.value}">${+s.value}</span><span class="affix">${esc(s.suffix)}</span></p>
       <p class="stat__label"><span class="sr-only">${esc(s.prefix)}${esc(s.value)}${esc(s.suffix)} — </span>${esc(s.label)}</p></li>`).join('');

    const mItems = strs(C, 'marquee');
    $('[data-marquee] .marquee__track').innerHTML = marqueeHTML(mItems.map(esc));
    $('[data-marquee-list]').innerHTML = mItems.map((m) => `<li>${esc(m)}</li>`).join('');

    // Mission
    const hl = ((C.mission && C.mission.highlights) || []).map((w) => w.toLowerCase());
    const mt = (C.mission && C.mission.text) || '';
    $('[data-mission]').innerHTML = `<span class="sr-only">${esc(mt)}</span><span aria-hidden="true">${mt.split(/\s+/).map((w) =>
      `<span class="w ${hl.includes(w.toLowerCase()) ? 'is-hl' : ''}">${esc(w)}</span>`).join(' ')}</span>`;

    // Pillars
    $('[data-pillars]').innerHTML = shown(C.pillars).map((p, i) => `
      <li class="pillar" data-tilt>
        <span class="pillar__num" aria-hidden="true">0${i + 1}</span>
        <h3 class="pillar__title">${esc(p.title)}</h3>
        <p class="pillar__promise">${esc(p.promise)}</p>
        <ul class="pillar__caps" aria-label="${esc(p.title)} capabilities">${strs(p, 'capabilities').map((c) => `<li class="tag">${esc(c)}</li>`).join('')}</ul>
        <p class="pillar__outcome"><span>${esc(p.outcome)}</span><span aria-hidden="true">↗</span></p>
      </li>`).join('');

    // Story
    $('[data-chapters]').innerHTML = shown(C.story && C.story.chapters).map((c) => `
      <li class="chapter">
        <p class="chapter__year">${esc(c.year)}</p>
        <h3 class="chapter__title">${esc(c.title)}</h3>
        <p class="chapter__org">${esc(c.org)}</p>
        <p class="chapter__line">${esc(c.line)}</p>
      </li>`).join('');

    // Services
    const email = (C.site && C.site.email) || '';
    $('[data-services]').innerHTML = shown(C.services).map((s, i) => `
      <li class="service" data-reveal style="transition-delay:${i * 0.1}s">
        <div class="service__top"><span class="mono" style="color:var(--accent)">0${i + 1}</span><span class="tag">${esc(s.duration)}</span></div>
        <h3 class="service__title">${esc(s.title)}</h3>
        <p class="service__desc">${esc(s.description)}</p>
        <p class="service__best"><b>Best for</b>${esc(s.bestFor)}</p>
        <a class="service__link" href="mailto:${esc(email)}?subject=${encodeURIComponent('Enquiry: ' + s.title)}">Ask about this<span class="sr-only"> — ${esc(s.title)}</span></a>
      </li>`).join('');

    renderWork();

    // Toolbox
    $('[data-tools] .marquee__track').innerHTML = marqueeHTML(strs(C, 'tools').map(esc));
    $('[data-certs] .marquee__track').innerHTML = marqueeHTML(shown(C.certifications).map((c) => `<span class="cert-issuer">${esc(c.issuer)} ${esc(c.year)}</span>${esc(c.title)}`));
    $('[data-tools-list]').innerHTML = strs(C, 'tools').map((t) => `<li>${esc(t)}</li>`).join('');
    $('[data-certs-list]').innerHTML = shown(C.certifications).map((c) => `<li>${esc(c.title)} — ${esc(c.issuer)}, ${esc(c.year)}</li>`).join('');

    // CTA
    const cta = C.cta || {};
    $('[data-cta-title]').innerHTML = `${fieldOn(cta, 'title') ? esc(cta.title) : ''} ${fieldOn(cta, 'accent') ? `<em>${esc(cta.accent)}</em>` : ''}`;
    $('[data-cta-title]').setAttribute('data-split', '');
  }

  /** Reorder and hide home sections from C.layout (set in the CMS). */
  function applyLayout() {
    const main = $('main'); if (!main) return;
    const saved = (C.layout && C.layout.sections) || [];
    const ids = [...saved.map((x) => x.id).filter((id) => DEFAULT_LAYOUT.includes(id)), ...DEFAULT_LAYOUT.filter((id) => !saved.some((x) => x.id === id))];
    ids.forEach((id) => {
      const parts = $$(`main > [data-section="${id}"]`);
      const hidden = (saved.find((x) => x.id === id) || {}).hidden;
      parts.forEach((el) => { main.appendChild(el); el.hidden = !!hidden; });
    });
    // Hide nav / menu / footer links that point at hidden sections
    $$('a[href^="#"]').forEach((a) => {
      const t = $(a.getAttribute('href').length > 1 ? a.getAttribute('href') : 'x-none'); if (!t) return;
      const sec = t.closest('[data-section]'); const li = a.closest('li');
      if (sec && sec.hidden && !a.closest('main')) (li || a).setAttribute('data-cms-hidden', '');
    });
  }

  function marqueeHTML(items) {
    const one = items.map((m) => `<span class="marquee__item">${m}<span class="marquee__star" aria-hidden="true">✳</span></span>`).join('');
    return `<div class="marquee__group" style="display:flex">${one}</div><div class="marquee__group" style="display:flex">${one}</div>`;
  }

  function coverHTML(p, i) {
    if (p.cover && p.cover.src && p.coverStyle !== 'generative') {
      return `<img src="${esc(p.cover.src)}" alt="${esc(p.cover.alt || '')}" loading="${i < 1 ? 'eager' : 'lazy'}" decoding="async">`;
    }
    const m = (p.metrics && p.metrics[0]) || { value: p.year, label: p.category };
    const seed = [...p.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
    return `<div class="gen" style="--gx:${20 + (seed % 60)}%;--gy:${15 + (seed % 50)}%" aria-hidden="true">
      <span class="gen__label mono">${esc(p.type || 'Confidential')}</span>
      <span class="gen__metric">${esc(m.value)}<small>${esc(m.label)}</small></span>
      <span class="gen__word">${esc(p.title.split(/\s/)[0])}</span></div>`;
  }
  window.MH.coverHTML = coverHTML;

  function projectHref(p) { return p.externalUrl ? p.externalUrl : `case.html?slug=${encodeURIComponent(p.slug)}`; }

  function renderWork() {
    const projects = shown(C.projects).filter((p) => p.status !== 'draft');
    const featured = projects.filter((p) => p.featured);
    $('[data-work-stack]').innerHTML = featured.map((p, i) => {
      const ext = !!p.externalUrl;
      return `<li class="wcard" style="--i:${i}">
        <a class="wcard__link" href="${esc(projectHref(p))}" ${ext ? 'target="_blank" rel="noopener"' : ''} data-cursor="view" data-title="${esc(p.title)}">
          <div class="wcard__media">${coverHTML(p, i)}</div>
          <div class="wcard__body">
            <p class="wcard__meta mono"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></p>
            <h3 class="wcard__title">${esc(p.title)}</h3>
            <p class="wcard__sub">${esc(p.subtitle)}</p>
            <p class="wcard__sum">${esc(p.summary)}</p>
            ${shown(p.metrics).length ? `<ul class="wcard__metrics" aria-label="Results">${shown(p.metrics).map((m) => `<li class="metric-chip"><b>${esc(m.value)}</b>${esc(m.label)}</li>`).join('')}</ul>` : ''}
            <p class="wcard__cta"><span>${p.status === 'confidential' ? 'See the results' : 'Read case study'}</span>${ARROW_NE}</p>
          </div>
        </a></li>`;
    }).join('');

    const cats = ['All', ...new Set(projects.map((p) => p.category))];
    $('[data-filters]').innerHTML = cats.map((c, i) => `<button class="filter" type="button" aria-pressed="${i === 0}" data-filter="${esc(c)}">${esc(c)}</button>`).join('');
    $('[data-index]').innerHTML = projects.map((p) => {
      const inner = `<span class="irow__year">${esc(String(p.year).slice(0, 4))}</span>
        <span class="irow__title">${esc(p.title)}</span>
        <span class="irow__role">${esc(p.role)}</span>
        <span class="irow__cat">${p.status === 'coming-soon' ? '<span class="irow__soon">Coming soon</span>' : esc(p.category)}</span>
        <svg class="irow__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
      const img = p.cover && p.cover.src ? esc(p.cover.src) : '';
      return `<li class="irow" data-cat="${esc(p.category)}">${p.status === 'coming-soon' ? `<div>${inner}</div>` :
        `<a href="${esc(projectHref(p))}" ${p.externalUrl ? 'target="_blank" rel="noopener"' : ''} data-preview="${img}" data-title="${esc(p.title)}">${inner}${p.externalUrl ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a>`}</li>`;
    }).join('');

    $('[data-filters]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      let n = 0;
      $$('.irow').forEach((r) => { const show = b.dataset.filter === 'All' || r.dataset.cat === b.dataset.filter; r.hidden = !show; n += show; });
      $('[data-filter-status]').textContent = `Showing ${n} project${n === 1 ? '' : 's'}`;
      hasGSAP() && ScrollTrigger.refresh();
    });
  }

  /* --- Hero: "Untangled" particle engine -------------------------------- */
  function Untangled(canvas, stage, portraitEl) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const S = { p: 0, visible: true, t: 0, mx: -9999, my: -9999, W: 0, H: 0, dpr: 1, N: 0, ready: false };
    let A, B, Cc, Z, SEED, WGT, col = '#7FCFA5', dark = true;
    const img = new Image(); img.src = 'assets/img/portrait-600.webp';

    const readColor = () => { const cs = getComputedStyle(doc); col = cs.getPropertyValue('--accent').trim() || col; dark = doc.dataset.theme !== 'light'; };

    function targetRect() {
      const sr = stage.getBoundingClientRect(), pr = portraitEl.getBoundingClientRect();
      return { x: pr.left - sr.left, y: pr.top - sr.top, w: pr.width, h: pr.height };
    }

    function sampleUI(N, r) {
      const W = S.W, H = S.H, oc = document.createElement('canvas'); oc.width = W; oc.height = H;
      const o = oc.getContext('2d'); o.strokeStyle = '#fff'; o.fillStyle = '#fff'; o.lineWidth = 2;
      const w = Math.min(r.w * 1.9, W * 0.62), h = Math.min(w * 0.66, H * 0.7), x = clamp(r.x + r.w / 2 - w / 2, 12, W - w - 12), y = r.y + r.h / 2 - h / 2;
      const rr = (X, Y, Ww, Hh, R) => { o.beginPath(); o.roundRect ? o.roundRect(X, Y, Ww, Hh, R) : o.rect(X, Y, Ww, Hh); o.stroke(); };
      rr(x, y, w, h, 18);
      o.beginPath(); o.moveTo(x, y + h * 0.1); o.lineTo(x + w, y + h * 0.1); o.stroke();
      [0, 1, 2].forEach((k) => { o.beginPath(); o.arc(x + 20 + k * 16, y + h * 0.05, 4, 0, 7); o.fill(); });
      o.beginPath(); o.moveTo(x + w * 0.22, y + h * 0.1); o.lineTo(x + w * 0.22, y + h); o.stroke();
      for (let k = 0; k < 6; k++) { o.fillRect(x + w * 0.04, y + h * (0.18 + k * 0.1), w * (0.12 - (k % 2) * 0.03), 3); }
      const cx0 = x + w * 0.26, cw = w * 0.22;
      for (let k = 0; k < 3; k++) rr(cx0 + k * (cw + w * 0.02), y + h * 0.16, cw, h * 0.2, 10);
      const bx = cx0, by = y + h * 0.92, bw = w * 0.34;
      for (let k = 0; k < 9; k++) { const bh = h * (0.12 + ((k * 37) % 23) / 60); o.fillRect(bx + k * (bw / 9), by - bh, bw / 9 - 6, bh); }
      o.beginPath(); for (let k = 0; k <= 10; k++) { const X = x + w * 0.64 + k * (w * 0.032), Y = y + h * (0.78 - Math.sin(k * 0.8) * 0.12 - k * 0.02); k ? o.lineTo(X, Y) : o.moveTo(X, Y); } o.stroke();
      rr(x + w * 0.64, y + h * 0.43, w * 0.3, h * 0.12, 999);
      rr(x + w * 0.26, y + h * 0.43, w * 0.34, h * 0.12, 8);
      const d = o.getImageData(0, 0, W, H).data, pts = [];
      for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (d[(yy * W + xx) * 4 + 3] > 120) pts.push(xx, yy);
      const out = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { const k = ((Math.random() * pts.length) / 2 | 0) * 2; out[i * 2] = pts[k] + (Math.random() - 0.5); out[i * 2 + 1] = pts[k + 1] + (Math.random() - 0.5); }
      return out;
    }

    function samplePortrait(N, r) {
      const out = new Float32Array(N * 2), wgt = new Float32Array(N);
      if (!img.complete || !img.naturalWidth) return null;
      const w = Math.max(2, Math.round(r.w)), h = Math.max(2, Math.round(r.h));
      const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const o = oc.getContext('2d');
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      o.drawImage(img, (w - iw) / 2, (h - ih) * 0.2, iw, ih);
      const d = o.getImageData(0, 0, w, h).data;
      let i = 0, tries = 0;
      while (i < N && tries < N * 80) {
        tries++;
        const x = (Math.random() * w) | 0, y = (Math.random() * h) | 0, k = (y * w + x) * 4;
        const lum = (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255;
        const wv = Math.pow(clamp((0.84 - lum) / 0.62), 1.3);
        const edgeFade = clamp(Math.min(y / (h * 0.08), (h - y) / (h * 0.25)));
        if (Math.random() < wv * edgeFade) { out[i * 2] = r.x + x; out[i * 2 + 1] = r.y + y; wgt[i] = 0.35 + wv * 0.65; i++; }
      }
      for (; i < N; i++) { out[i * 2] = r.x + Math.random() * w; out[i * 2 + 1] = r.y + h * (0.6 + Math.random() * 0.4); wgt[i] = 0.1; }
      return { out, wgt };
    }

    function build() {
      const r = stage.getBoundingClientRect();
      S.dpr = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.5 : 2);
      S.W = Math.round(r.width); S.H = Math.round(r.height);
      canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      const N = (S.N = S.W < 768 ? 900 : S.W < 1280 ? 1700 : 2400);
      A = new Float32Array(N * 2); Z = new Float32Array(N); SEED = new Float32Array(N);
      for (let i = 0; i < N; i++) { A[i * 2] = Math.random() * S.W; A[i * 2 + 1] = Math.random() * S.H; Z[i] = 0.2 + Math.random() * 0.8; SEED[i] = Math.random() * 100; }
      const tr = targetRect();
      B = sampleUI(N, tr);
      const pc = samplePortrait(N, tr);
      if (pc) { Cc = pc.out; WGT = pc.wgt; } else { Cc = B; WGT = new Float32Array(N).fill(0.6); }
      readColor(); S.ready = true;
    }

    function frame(dt) {
      if (!S.ready || !S.visible) return;
      S.t += dt;
      const p = S.p, t = S.t, W = S.W, H = S.H, N = S.N;
      const k1 = easeIO(clamp((p - 0.12) / 0.36)), k2 = easeIO(clamp((p - 0.52) / 0.34));
      const chaos = 1 - k1;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      ctx.fillStyle = col; ctx.strokeStyle = col;
      const fade = 1 - clamp((p - 0.9) / 0.1) * 0.75;
      const R2 = 90 * 90;
      const X = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) {
        const z = Z[i], s = SEED[i];
        const drift = 26 * z * chaos;
        const ax = A[i * 2] + Math.sin(t * 0.35 + s) * drift - p * 140 * z * chaos;
        const ay = A[i * 2 + 1] + Math.cos(t * 0.28 + s * 1.3) * drift - p * 220 * z * chaos;
        let x = lerp(ax, B[i * 2], k1), y = lerp(ay, B[i * 2 + 1], k1);
        x = lerp(x, Cc[i * 2], k2); y = lerp(y, Cc[i * 2 + 1], k2);
        const dx = x - S.mx, dy = y - S.my, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const f = (1 - d2 / R2) * 18; const dd = Math.sqrt(d2) || 1; x += (dx / dd) * f; y += (dy / dd) * f; }
        X[i * 2] = x; X[i * 2 + 1] = y;
        const a = (lerp(0.18 + z * 0.55, 0.75, k1) * (1 - k2) + WGT[i] * k2) * fade;
        const sz = lerp(0.8 + z * 1.8, 1.5, k1) * (1 - k2) + (1.1 + WGT[i] * 0.9) * k2;
        ctx.globalAlpha = a; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      if (chaos > 0.02) {
        ctx.globalAlpha = 0.16 * chaos; ctx.lineWidth = 0.6; ctx.beginPath();
        for (let i = 0; i < N - 1; i += 3) {
          const x1 = X[i * 2], y1 = X[i * 2 + 1], x2 = X[i * 2 + 2], y2 = X[i * 2 + 3];
          const dx = x2 - x1, dy = y2 - y1; if (dx * dx + dy * dy < 5200) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    let resizeT;
    const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(build, 200); };
    addEventListener('resize', onResize);
    stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); S.mx = e.clientX - r.left; S.my = e.clientY - r.top; });
    stage.addEventListener('pointerleave', () => { S.mx = S.my = -9999; });
    new IntersectionObserver(([en]) => (S.visible = en.isIntersecting)).observe(stage);
    document.addEventListener('visibilitychange', () => (S.visible = !document.hidden));
    new MutationObserver(readColor).observe(doc, { attributes: true, attributeFilter: ['data-theme', 'data-vision', 'data-contrast', 'data-palette'] });
    img.decode ? img.decode().then(build).catch(build) : (img.onload = build);
    return { S, frame, build };
  }

  function initHero() {
    const stage = $('.hero__stage'), canvas = $('.hero__canvas'), portrait = $('.hero__portrait');
    const chars = (i) => $$(`[data-line="${i}"] .char`);
    const l1 = chars(0), l2 = chars(1), l3 = chars(2);
    const cx = $('[data-complexity]');

    if (!fullMotion() || !hasGSAP()) {
      canvas.hidden = true; portrait.style.setProperty('--tone', '0'); [...l1, ...l2, ...l3].forEach((c) => c.classList.add('is-solid'));
      if (cx) cx.textContent = '0';
      return;
    }
    const eng = Untangled(canvas, stage, portrait);
    gsap.ticker.add((_, dt) => eng.frame(Math.min(dt, 50) / 1000));

    // Ghost chars get random offsets that "snap to grid" as the beat progresses
    const offs = new Map();
    [...l2, ...l3].forEach((c) => offs.set(c, { x: (Math.random() - 0.5) * 34, y: (Math.random() - 0.5) * 26, r: (Math.random() - 0.5) * 14 }));

    // Optional generated film: drop assets/video/untangled.mp4 and it takes over
    const video = $('.hero__video'); let useVideo = false;
    video.addEventListener('loadedmetadata', () => { useVideo = true; video.hidden = false; canvas.style.opacity = '.35'; });
    video.addEventListener('error', () => {}, { once: true });
    const vsrc = C.hero && (innerWidth < 768 && C.hero.videoMobile ? C.hero.videoMobile : C.hero.video);
    if (vsrc) { video.preload = 'auto'; video.src = vsrc; }

    const apply = (p) => {
      eng.S.p = p;
      const a = (lineChars, s, e) => {
        const k = clamp((p - s) / (e - s)), n = lineChars.length;
        lineChars.forEach((c, i) => {
          const local = clamp(k * n * 1.15 - i * 1.0 + 0.5);
          c.classList.toggle('is-solid', local > 0.55);
          const o = offs.get(c); const m = 1 - easeIO(local);
          c.style.transform = `translate(${o.x * m}px, ${o.y * m}px) rotate(${o.r * m}deg)`;
        });
      };
      a(l2, 0.2, 0.52); a(l3, 0.58, 0.86);
      if (cx) cx.textContent = String(Math.round(100 * (1 - clamp((p - 0.1) / 0.78))));
      // Portrait fades in as a duotone, then warms into full colour as you keep scrolling
      portrait.style.opacity = clamp((p - 0.82) / 0.08);
      portrait.style.setProperty('--tone', String(1 - easeIO(clamp((p - 0.9) / 0.1))));
      if (useVideo && video.duration) { const tt = p * video.duration; if (Math.abs(video.currentTime - tt) > 0.03) video.currentTime = tt; }
    };
    apply(0);
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (st) => apply(st.progress) });

    // Intro: line 1 assembles from scattered positions
    const intro = gsap.timeline({ paused: true, delay: doc.classList.contains('is-arriving') ? 0 : (window.MH.introDelay || 0.2) });
    intro.from(l1, { x: () => (Math.random() - 0.5) * 300, y: () => (Math.random() - 0.5) * 200, rotate: () => (Math.random() - 0.5) * 60, opacity: 0, duration: 1.6, ease: 'expo.out', stagger: 0.04 }, 0)
      .from('.hero__bottom > *, .hero__meta', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, 0.4);
    intro.progress(0).pause();
    window.MH.curtainDone.then(() => intro.play());
  }

  function initStats() {
    if (!hasGSAP() || motion() === 'none') return;
    $$('[data-to]').forEach((el) => {
      const to = +el.dataset.to; el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => {
        const o = { v: 0 }; gsap.to(o, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      } });
    });
  }

  function initMarquees() {
    const ms = $$('.marquee'); if (!ms.length) return;
    let paused = motion() !== 'full', vel = 0, lastY = scrollY, dir = 1;
    const btn = $('[data-action="pause-marquee"]');
    if (btn) {
      if (paused) { btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Play motion'; }
      btn.addEventListener('click', () => { paused = !paused; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? 'Play motion' : 'Pause motion'; });
    }
    const st = ms.map((m) => ({ m, x: 0, hover: false, track: $('.marquee__track', m), rev: m.classList.contains('marquee--reverse') }));
    st.forEach((s) => { s.m.addEventListener('pointerenter', () => (s.hover = true)); s.m.addEventListener('pointerleave', () => (s.hover = false)); });
    if (motion() === 'none') return;
    const tick = () => {
      const y = scrollY, d = y - lastY; lastY = y; if (Math.abs(d) > 0.5) dir = d > 0 ? 1 : -1;
      vel = lerp(vel, Math.min(Math.abs(d), 60), 0.1);
      st.forEach((s) => {
        if (paused || s.hover) return;
        const half = s.track.scrollWidth / 2 || 1;
        s.x -= (0.6 + vel * 0.25) * dir * (s.rev ? -1 : 1);
        if (s.x <= -half) s.x += half; if (s.x > 0) s.x -= half;
        s.track.style.transform = `translate3d(${s.x}px,0,0) skewX(${clamp(-vel * 0.08 * dir, -4, 4)}deg)`;
      });
    };
    hasGSAP() ? gsap.ticker.add(tick) : (function loop() { tick(); requestAnimationFrame(loop); })();
  }

  function initMission() {
    const words = $$('[data-mission] .w');
    if (!hasGSAP() || motion() === 'none' || motion() === 'reduced') { words.forEach((w) => w.classList.add('is-lit')); return; }
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.mission', start: 'top 70%', end: 'bottom 70%', scrub: 0.6,
      onUpdate: (s) => { const n = Math.floor(s.progress * words.length * 1.05); words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); } } });
    tl.to(words, { opacity: 1, stagger: 0.1, ease: 'none', duration: 0.3 });
    const knot = $('[data-knot]');
    if (knot) {
      const L = knot.getTotalLength(); knot.style.strokeDasharray = L;
      gsap.fromTo(knot, { strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.mission', start: 'top 80%', end: 'bottom 40%', scrub: 1 } });
      gsap.to('.mission__knot', { rotate: 180, ease: 'none', scrollTrigger: { trigger: '.mission', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    }
  }

  /* Horizontal pinned sections (desktop + full motion) — vertical stack otherwise */
  function initHorizontal() {
    const sections = $$('.hscroll');
    const enable = hasGSAP() && fullMotion();
    const setMode = (h) => { doc.classList.toggle('is-h', h); doc.classList.toggle('no-h', !h); };
    setMode(false);
    if (!enable) { bindHNav(sections, false); return; }
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      setMode(true);
      const cleanups = sections.map((sec) => {
        const track = $('.hscroll__track', sec), thread = $('.story__thread', sec);
        // scrollWidth ignores a flex track's end padding, so measure the last card + gutter
        const dist = () => { const last = track.lastElementChild; const pr = parseFloat(getComputedStyle(track).paddingRight) || 0; return Math.max(0, last.offsetLeft + last.offsetWidth + pr - innerWidth); };
        const size = () => { sec.style.setProperty('--h-len', `${dist() + innerHeight}px`); };
        size();
        if (thread) {
          const path = $('path', thread), W = track.scrollWidth + innerWidth * 0.2;
          thread.setAttribute('viewBox', `0 0 ${W} 40`); thread.style.width = W + 'px';
          let d = 'M0 20'; for (let x = 60; x <= W; x += 60) d += ` Q ${x - 30} ${x % 120 ? 6 : 34} ${x} 20`;
          path.setAttribute('d', d);
          const L = path.getTotalLength(); path.style.strokeDasharray = L;
        }
        const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true, onRefreshInit: size } });
        tl.to(track, { x: () => -dist(), ease: 'none' }, 0);
        if (thread) {
          const path = $('path', thread), L = path.getTotalLength();
          tl.to(thread, { x: () => -dist(), ease: 'none' }, 0).fromTo(path, { strokeDashoffset: L }, { strokeDashoffset: L * 0.08, ease: 'none' }, 0);
        }
        $$('.pillar, .chapter', track).forEach((c) => c.setAttribute('tabindex', '0'));
        return () => { sec.style.removeProperty('--h-len'); $$('.pillar, .chapter', track).forEach((c) => c.removeAttribute('tabindex')); };
      });
      bindHNav(sections, true);
      return () => { cleanups.forEach((f) => f()); setMode(false); };
    });
    mm.add('(max-width: 1023px)', () => { setMode(false); });
  }

  function bindHNav(sections, horizontal) {
    sections.forEach((sec) => {
      if (sec._hnav) { sec._hnav.h = horizontal; return; }
      sec._hnav = { h: horizontal };
      const track = $('.hscroll__track', sec);
      const cards = () => $$(':scope > li', track);
      const goTo = (card) => {
        if (!sec._hnav.h) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        const last = track.lastElementChild, dist = Math.max(0, last.offsetLeft + last.offsetWidth + (parseFloat(getComputedStyle(track).paddingRight) || 0) - innerWidth);
        const off = clamp(card.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), 0, dist);
        const y = sec.getBoundingClientRect().top + scrollY + off;
        window.MH.lenis ? window.MH.lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' });
      };
      const current = () => {
        const cs = cards(); let best = 0, bd = Infinity;
        cs.forEach((c, i) => { const d = Math.abs(c.getBoundingClientRect().left - innerWidth * 0.1); if (d < bd) { bd = d; best = i; } });
        return best;
      };
      $$('[data-h]', sec).forEach((b) => b.addEventListener('click', () => {
        const cs = cards(); const i = clamp(current() + (b.dataset.h === 'next' ? 1 : -1), 0, cs.length - 1); goTo(cs[i]);
        cs[i].hasAttribute('tabindex') && cs[i].focus({ preventScroll: true });
      }));
      track.addEventListener('focusin', (e) => { const c = e.target.closest('.hscroll__track > li'); if (c && sec._hnav.h) goTo(c); });
      sec.addEventListener('keydown', (e) => {
        if (!sec._hnav.h || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
        const cs = cards(), i = clamp(current() + (e.key === 'ArrowRight' ? 1 : -1), 0, cs.length - 1);
        e.preventDefault(); cs[i].focus({ preventScroll: true }); goTo(cs[i]);
      });
    });
  }

  function initTilt() {
    if (isTouch || !fullMotion() || !hasGSAP()) return;
    $$('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
      gsap.set(el, { transformPerspective: 1200 });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`);
        ry((px - 0.5) * 12); rx(-(py - 0.5) * 12);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  function initWork() {
    if (hasGSAP() && fullMotion()) {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const cards = $$('.wcard');
        cards.forEach((c, i) => {
          const next = cards[i + 1]; if (!next) return;
          gsap.to($('.wcard__link', c), { scale: 0.9, '--dim': 0.7, ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
        });
        cards.forEach((c) => {
          const img = $('.wcard__media img', c);
          img && gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
    }
    // Hover preview on the index
    const pv = $('.index__preview'); if (!pv || isTouch || motion() === 'none') return;
    const pimg = $('img', pv); let tx = 0, ty = 0, x = 0, y = 0, on = false;
    $('[data-index]').addEventListener('pointerover', (e) => {
      const a = e.target.closest('a[data-preview]');
      if (a && a.dataset.preview) { if (pimg.getAttribute('src') !== a.dataset.preview) pimg.src = a.dataset.preview; pv.classList.add('is-on'); on = true; }
      else if (!a) { pv.classList.remove('is-on'); on = false; }
    });
    $('[data-index]').addEventListener('pointerleave', () => { pv.classList.remove('is-on'); on = false; });
    addEventListener('pointermove', (e) => { tx = e.clientX + 24; ty = e.clientY - 120; }, { passive: true });
    const tick = () => { if (!on) return; x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14); pv.style.left = x + 'px'; pv.style.top = y + 'px'; };
    hasGSAP() && gsap.ticker.add(tick);
  }

  /* CTA ambient field — particles that reach toward the cursor */
  function initCTACanvas() {
    const cv = $('.cta__canvas'); if (!cv || !fullMotion() || !hasGSAP()) return;
    const ctx = cv.getContext('2d'); let W, H, dpr, pts = [], vis = false, mx = -999, my = -999, col = '#7FCFA5', dark = true;
    const read = () => { col = getComputedStyle(doc).getPropertyValue('--accent').trim(); dark = doc.dataset.theme !== 'light'; };
    const size = () => {
      const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio, 2); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = W < 768 ? 60 : 140;
      pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }));
    };
    size(); read(); addEventListener('resize', size);
    new MutationObserver(read).observe(doc, { attributes: true, attributeFilter: ['data-theme', 'data-vision', 'data-contrast', 'data-palette'] });
    new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(cv);
    cv.parentElement.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', () => { mx = my = -999; });
    gsap.ticker.add(() => {
      if (!vis) return;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy);
        if (d < 220) { p.x += dx * 0.004; p.y += dy * 0.004; ctx.globalAlpha = (1 - d / 220) * 0.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.lineWidth = 0.6; ctx.stroke(); }
        ctx.globalAlpha = 0.55; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    });
  }

  function initClock() {
    const tz = (C.site && C.site.timezone) || 'Asia/Dhaka', city = ((C.site && C.site.location) || 'Dhaka').split(',')[0];
    const c = $('[data-clock]'), s = $('[data-status]'); if (!c) return;
    const upd = () => {
      const now = new Date();
      c.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(now) + ` · ${city}`;
      const h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now);
      s.textContent = h < 6 ? "Probably asleep — I'll reply in the morning." : h < 9 ? 'Morning coffee, then design.' : h < 13 ? "Deep in design work right now." : h < 14 ? 'Lunch break — back soon.' : h < 19 ? 'Probably designing something.' : h < 23 ? 'Building side projects.' : "Winding down — I'll reply tomorrow.";
    };
    upd(); setInterval(upd, 30000);
  }

  function initProgressTicks() {
    const ol = $('.progress__ticks'); if (!ol) return;
    const place = () => {
      const H = doc.scrollHeight - innerHeight || 1;
      ol.innerHTML = $$('main > section[id]').map((s) => `<li style="top:${clamp((s.offsetTop) / H) * 100}%"></li>`).join('');
    };
    place(); addEventListener('load', place);
    hasGSAP() && ScrollTrigger.addEventListener('refresh', place);
    // aria-current on nav
    const links = $$('.nav__links a');
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((l) => (l.getAttribute('href') === '#' + en.target.id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => io.observe(s));
  }

  function preloader() {
    const pl = $('.preloader');
    return new Promise((resolve) => {
      let seen = false; try { seen = !!sessionStorage.getItem('mh-seen'); sessionStorage.setItem('mh-seen', '1'); } catch (e) {}
      if (!pl || !hasGSAP() || motion() === 'none' || params.get('preview') === '1' || doc.classList.contains('is-arriving')) { doc.classList.add('is-loaded'); window.MH.introDelay = 0.1; return resolve(); }
      const count = $('[data-count]', pl), bar = $('.preloader__bar i', pl), dur = seen ? 0.6 : 1.8;
      const o = { v: 0 };
      window.MH.lenis && window.MH.lenis.stop();
      const ready = Promise.race([new Promise((r) => setTimeout(r, 2500)), Promise.all([document.fonts ? document.fonts.ready : 0, new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = 'assets/img/portrait-600.webp'; })])]);
      const failsafe = setTimeout(() => { doc.classList.add('is-loaded'); window.MH.lenis && window.MH.lenis.start(); resolve(); }, 6000);
      gsap.from($$('.preloader__name > *', pl), { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08 });
      gsap.to(o, { v: 100, duration: dur, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(o.v); bar.style.transform = `scaleX(${o.v / 100})`; },
        onComplete: () => ready.then(() => {
          clearTimeout(failsafe);
          window.MH.introDelay = 0.35;
          window.MH.lenis && window.MH.lenis.start();
          gsap.to(pl, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', onComplete: () => { doc.classList.add('is-loaded'); } });
          resolve();
        }) });
    });
  }

  /* ------------------------------------------------------------------- BOOT */
  function boot() {
    Prefs.apply(Prefs.read());
    initLenis();
    if (PAGE === 'home') renderHome();
    if (PAGE === 'case' && window.MHCase) window.MHCase.render(C, params.get('slug'));
    initChrome();
    const go = () => {
      if (PAGE === 'home') {
        initHero(); initStats(); initMarquees(); initMission(); initHorizontal(); initTilt(); initWork(); initCTACanvas(); initProgressTicks();
      }
      if (PAGE === 'case' && window.MHCase) window.MHCase.enhance();
      initReveals();
      initClock();
      window.MH.bindMagnetic && window.MH.bindMagnetic();
      // Restore scroll after a settings reload / preview refresh
      let y = null; try { y = sessionStorage.getItem('mh-y') || sessionStorage.getItem('mh-preview-y'); sessionStorage.removeItem('mh-y'); sessionStorage.removeItem('mh-preview-y'); } catch (e) {}
      if (hasGSAP()) { ScrollTrigger.refresh(); }
      if (y) requestAnimationFrame(() => { window.MH.lenis ? window.MH.lenis.scrollTo(+y, { immediate: true }) : scrollTo(0, +y); });
      else if (location.hash && $(location.hash)) {
        const el = $(location.hash);
        const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
        Promise.all([loaded, document.fonts ? document.fonts.ready : 0]).then(() => {
          hasGSAP() && ScrollTrigger.refresh();
          // Layout keeps settling (pinned sections size themselves), so re-jump a few times unless the visitor scrolls first
          let userMoved = false; const stop = () => (userMoved = true);
          ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, stop, { once: true, passive: true }));
          const jump = () => { if (userMoved) return; if (Math.abs(el.getBoundingClientRect().top) > 2) window.MH.lenis ? window.MH.lenis.scrollTo(el, { immediate: true, force: true }) : el.scrollIntoView(); };
          [0, 150, 400, 800, 1400, 2200].forEach((t) => setTimeout(() => requestAnimationFrame(jump), t));
        });
      }
    };
    if (PAGE === 'home') preloader().then(go); else { doc.classList.add('is-loaded'); go(); }
    addEventListener('load', () => hasGSAP() && ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => hasGSAP() && ScrollTrigger.refresh());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
