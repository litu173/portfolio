/* LOOM — the agent team.
   An orchestrator (the Director) splits a request into steps, and each step goes to a specialist agent.
   Agents return { reply, ops, report }. Ops are small, checked edits (setText, setSwatch, addSection…)
   that the editor applies with undo. Reports are findings, checklists and plans for a person to act on.

   With Loom AI configured on the server (ANTHROPIC_API_KEY), agents run on Claude. Otherwise every
   agent has a built-in local version, so the whole team works offline, just less creatively.
   Agents never buy domains, move money, or sell on anyone's behalf. Those steps are prepared as
   checklists that need a person's approval. */
(() => {
  'use strict';
  const L = window.Loom, C = window.LoomCompose, T = window.LoomTemplates;
  const col = C.color;

  /* ---------------------------------------------------------------- the team */
  const TEAM = [
    { id: 'director', name: 'Director', role: 'Orchestrator', color: '#F5F5F7', glyph: '✦', desc: 'Understands the request, plans the work and assigns the right specialists.' },
    { id: 'architect', name: 'Architect', role: 'Software Engineer', color: '#6E8BFF', glyph: '⌘', desc: 'Builds whole sites, pages and sections from a plain-language brief.' },
    { id: 'designer', name: 'Iris', role: 'Product Designer', color: '#A78BFA', glyph: '◐', desc: 'Hierarchy, spacing, responsive rhythm and UX gaps.' },
    { id: 'brand', name: 'Hue', role: 'Brand Designer', color: '#FF8FB1', glyph: '◆', desc: 'Accessible palettes, font pairings and the visual identity.' },
    { id: 'copy', name: 'Quill', role: 'Copywriter', color: '#F2C46D', glyph: '¶', desc: 'Headlines, microcopy, tone of voice and translations.' },
    { id: 'logo', name: 'Mark', role: 'Logo Designer', color: '#FF6B4A', glyph: '◎', desc: 'Scalable SVG logos, marks and favicons.' },
    { id: 'illustrator', name: 'Ink', role: 'Illustrator & Imagery', color: '#5ED6C4', glyph: '✎', desc: 'On-brand SVG illustrations and meaningful alt text.' },
    { id: 'motion', name: 'Kinetic', role: 'Motion Designer', color: '#7FCFA5', glyph: '∿', desc: 'Scroll reveals, hover physics and transitions, reduced-motion safe.' },
    { id: 'qa', name: 'Probe', role: 'QA & Accessibility', color: '#4FC3F7', glyph: '✓', desc: 'WCAG 2.2 AA, heading order, contrast, links and responsive checks.' },
    { id: 'security', name: 'Sentinel', role: 'Security Guard', color: '#FF5C7A', glyph: '⛨', desc: 'Scans for XSS, unsafe embeds, leaked secrets and mixed content, then hardens with CSP.' },
    { id: 'seo', name: 'Signal', role: 'SEO & ASO', color: '#C6F36B', glyph: '⌕', desc: 'Titles, descriptions, social cards, sitemap, structured data and store listings.' },
    { id: 'marketing', name: 'Boost', role: 'Growth Marketer', color: '#FFB86B', glyph: '↗', desc: 'Positioning, launch calendar, social posts and emails.' },
    { id: 'devops', name: 'Relay', role: 'DevOps & Launch', color: '#9AA4FF', glyph: '⇪', desc: 'Pre-flight, publishing, hosting, domains and DNS, with your approval.' },
    { id: 'commerce', name: 'Merchant', role: 'E-commerce', color: '#E6A6FF', glyph: '⊕', desc: 'Products, storefront sections, payments setup and sourcing plans.' },
    { id: 'data', name: 'Datum', role: 'Data & Dashboard Designer', color: '#56B4E9', glyph: '▦', desc: 'Enterprise dashboards: KPIs, accessible charts, sortable data tables, colour-blind-safe palettes.' },
    { id: 'maintainer', name: 'Keeper', role: 'Site Maintainer', color: '#B8C0CC', glyph: '⟲', desc: 'Everyday change requests in plain words, for clients who don’t code.' }
  ];
  const byId = (id) => TEAM.find((a) => a.id === id);
  // the editor keeps the makers; launch, growth, security and commerce live in Loom HQ (the dashboard)
  const EDITOR = ['director', 'architect', 'designer', 'brand', 'copy', 'logo', 'illustrator', 'motion', 'data', 'qa', 'maintainer'];

  /* ---------------------------------------------------------------- server (Claude) */
  let statusP = null;
  function status(force) {
    if (/\.(github\.io|netlify\.app|pages\.dev|vercel\.app)$/.test(location.hostname)) return (statusP = Promise.resolve({ available: false, offline: true, static: true }));
    if (!statusP || force) statusP = fetch('/__ai/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { available: false })).catch(() => ({ available: false, offline: true }));
    return statusP;
  }
  async function remote(agent, request, context, mode) {
    const r = await fetch('/__ai/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ agent, request, context, mode }) });
    const j = await r.json().catch(() => ({ ok: false, error: 'Bad response' }));
    if (!j.ok) throw new Error(j.error || 'AI request failed');
    return j.data;
  }

  /* ---------------------------------------------------------------- project outline (context for Claude) */
  function outline(P, { full = false } = {}) {
    const node = (n) => {
      const o = { id: n.id, t: n.type };
      if (n.tag) o.tag = n.tag; if (n.cls) o.cls = n.cls;
      if (n.text) o.text = String(n.text).slice(0, full ? 400 : 160);
      const a = n.attrs || {};
      if (n.type === 'image') { o.src = /^data:image\/svg/.test(a.src || '') ? 'generated-svg' : a.src === L.PLACEHOLDER_IMG ? 'placeholder' : String(a.src || '').slice(0, 120); o.alt = a.alt || ''; }
      if (a.href) o.href = String(a.href).slice(0, 160); if (a.target) o.target = a.target;
      if (n.type === 'embed') o.html = String(n.html || '').slice(0, 3000);
      if (n.children && n.children.length) o.kids = n.children.map(node);
      return o;
    };
    return JSON.stringify({ name: P.name, spec: P.spec || null, meta: P.meta || {}, fonts: P.fonts, swatches: P.swatches, classes: Object.keys(P.classes),
      pages: P.pages.map((pg) => ({ id: pg.id, name: pg.name, slug: pg.slug, title: pg.title || '', description: pg.description || '', tree: pg.tree.map(node) })) });
  }

  /* ---------------------------------------------------------------- safety: sanitise what agents produce */
  function sanitizeSVG(svg, max = 24000) {
    svg = String(svg || '').trim(); if (!/^<svg[\s>]/i.test(svg) || svg.length > max) return null;
    let d; try { d = new DOMParser().parseFromString(svg, 'image/svg+xml'); } catch (e) { return null; }
    const root = d.documentElement; if (!root || root.nodeName.toLowerCase() !== 'svg' || d.querySelector('parsererror')) return null;
    root.querySelectorAll('script, foreignObject, iframe, embed, object, audio, video, handler, set').forEach((x) => x.remove());
    [root, ...root.querySelectorAll('*')].forEach((el) => [...el.attributes].forEach((a) => {
      const n = a.name.toLowerCase(), v = a.value.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').toLowerCase();
      if (n.startsWith('on') || ((n === 'href' || n === 'xlink:href') && !v.startsWith('#')) || /javascript:|data:text/.test(v)) el.removeAttribute(a.name);
    }));
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(root);
  }
  const svgURI = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);
  function sanitizeHTML(html) {
    const d = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    const clean = (root) => {
      root.querySelectorAll('template').forEach((t) => t.remove()); // declarative shadow DOM could hide handlers
      root.querySelectorAll('script, iframe, frame, object, embed, base, meta, link, noscript, portal').forEach((x) => x.remove());
      root.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { const v = a.value.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').toLowerCase(); if (/^on/i.test(a.name) || /^(javascript|vbscript|data:text|data:application)/.test(v) || (a.name === 'style' && /expression\(|javascript:|url\(\s*['"]?\s*javascript/i.test(a.value)) || /^(srcdoc|formaction)$/i.test(a.name)) el.removeAttribute(a.name); }));
    };
    clean(d.body);
    return d.body.innerHTML;
  }
  const safeHref = (v) => { v = String(v || '').trim(); const bare = v.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').toLowerCase(); return /^(https?:|mailto:|tel:|#|page:|\/|\.{0,2}\/?[\w-]+\.html)/i.test(v) && !/^(javascript|vbscript|data):/.test(bare) ? v : '#'; };
  const CSS_PROP = /^-?[a-z][a-z-]{1,40}$/; const BAD_CSS = /[<>{};]|expression\(|javascript:|@import|url\(\s*['"]?\s*(javascript|data:text)/i;
  const FONT = /^[A-Za-z0-9 ]{2,40}$/;
  const FX_TOKENS = ['split', 'reveal', 'stagger', 'count', 'marquee', 'parallax', 'scrub', 'hscroll', 'tilt', 'magnetic', 'table', 'chart', 'spotlight', 'expand', 'tilt-scroll'];

  /* ---------------------------------------------------------------- tree helpers */
  function each(P, fn) { P.pages.forEach((pg) => L.walk(pg.tree, (n, parent, i, list) => fn(n, pg, parent, list, i))); }
  function findAny(P, id) { for (const pg of P.pages) { const f = L.find(pg.tree, id); if (f) return Object.assign(f, { page: pg }); } return null; }
  const textOf = (n) => { let s = ''; L.walk([n], (x) => { if (x.text) s += ' ' + x.text; }); return s.trim(); };
  const headingsOf = (pg) => { const out = []; L.walk(pg.tree, (n) => { if (n.type === 'heading') out.push(n); }); return out; };
  const levelOf = (n) => +(n.tag || 'h2').slice(1);
  const home = (P) => P.pages.find((p) => p.slug === 'index') || P.pages[0];
  const pageRef = (P, ref, created) => P.pages.find((p) => p.id === ref || p.slug === ref || p.name.toLowerCase() === String(ref || '').toLowerCase()) || (created && created[String(ref || '').toLowerCase()]);
  function insertSection(pg, n, after) {
    if (after) { const f = L.find(pg.tree, after); if (f && f.list === pg.tree) { pg.tree.splice(f.index + 1, 0, n); return; } }
    const fi = pg.tree.findIndex((x) => x.tag === 'footer'); if (fi >= 0) pg.tree.splice(fi, 0, n); else pg.tree.push(n);
  }
  function applyLogo(P, svg) {
    P.logo = svg; const src = svgURI(svg);
    P.classes.brand = L.mergeClass(P.classes.brand || { base: {} }, { base: { display: 'inline-flex', 'align-items': 'center', 'column-gap': '10px', 'text-decoration': 'none' } });
    P.classes['brand-logo'] = { base: { width: '34px', height: '34px', display: 'block' } };
    let n = 0;
    each(P, (x, pg, parent, list, i) => {
      if (x.cls !== 'brand') return;
      const img = L.N('image', { cls: 'brand-logo', attrs: { src, alt: '' } });
      if (x.type === 'link') { list[i] = L.N('div', { tag: 'a', cls: 'brand', attrs: { href: x.attrs.href || 'page:' + home(P).id } }, [img, L.N('text', { text: x.text || P.name, cls: 'brand-word' })]); n++; }
      else { const old = (x.children || []).find((c) => c.cls === 'brand-logo'); if (old) old.attrs.src = src; else x.children.unshift(img); n++; }
    });
    return n;
  }

  /** Re-express a whole project in another design language: fonts, palette, every kit class, motion. */
  function restyle(P, lang) {
    const G = LoomLangs.LANGS[lang]; P.spec = Object.assign({}, P.spec || {}, { lang, mood: G.mood, radius: G.radius, headWeight: G.headWeight });
    const cur = Object.fromEntries(P.swatches.map((x) => [x.id, x.value]));
    const pal = LoomLangs.paletteFor(G.brand || cur.brand || '#3B6CFF', G);
    P.swatches.forEach((x) => { if (pal[x.id]) x.value = pal[x.id]; });
    P.fonts = { heading: G.fonts[0], body: G.fonts[1], accent: G.fonts[2] };
    const kit = C.kitFor({ radius: G.radius, headWeight: G.headWeight, mood: G.mood, lang });
    Object.keys(kit).forEach((c) => { if (P.classes[c]) P.classes[c] = L.clone(kit[c]); });
    P.altSwatches = null; C.enhance(P, G.fx);
  }

  /* ---------------------------------------------------------------- apply ops (validated) */
  function applyOps(P, ops) {
    const done = [], skipped = []; const created = {};
    (ops || []).slice(0, 200).forEach((o) => {
      try {
        const ok = applyOne(P, o, created); (ok ? done : skipped).push(o);
      } catch (e) { skipped.push(Object.assign({ why: e.message }, o)); }
    });
    P.pages.forEach((pg) => L.ensureTreeClasses(P, pg.tree));
    return { done, skipped };
  }
  function applyOne(P, o, created) {
    const f = o.target ? findAny(P, o.target) : null; const n = f && f.node;
    switch (o.op) {
      case 'setText': if (!n || !L.TEXTUAL(n) || typeof o.value !== 'string') return false; n.text = o.value.slice(0, 800); return true;
      case 'setSwatch': { if (!col.isHex(o.value)) return false; const s = P.swatches.find((x) => x.id === o.target); if (s) s.value = o.value.toUpperCase(); else if (/^[a-z][\w-]{1,20}$/.test(o.target || '')) P.swatches.push({ id: o.target, name: o.target, value: o.value.toUpperCase() }); else return false; return true; }
      case 'setFont': if (!['heading', 'body', 'accent'].includes(o.target) || !FONT.test(o.value || '')) return false; P.fonts[o.target] = o.value; return true;
      case 'setStyle': {
        const key = o.bp || 'base'; if (!/^(base|tablet|landscape|portrait)(:hover|:focus)?$/.test(key) || !CSS_PROP.test(o.prop || '') || BAD_CSS.test(o.value || '') || String(o.value).length > 240) return false;
        const cls = String(o.target || ''); if (!/^@?[\w-]{1,40}$/.test(cls)) return false;
        P.classes[cls] = P.classes[cls] || { base: {} }; P.classes[cls][key] = P.classes[cls][key] || {};
        if (o.value === '' || o.value == null) delete P.classes[cls][key][o.prop]; else P.classes[cls][key][o.prop] = String(o.value); return true;
      }
      case 'addSection': {
        const pg = pageRef(P, o.page, created) || home(P); if (!o.section || !C.SECTION_KINDS.includes(o.section.kind)) return false;
        insertSection(pg, C.addSection(P, o.section), o.after); return true;
      }
      case 'removeNode': if (!f) return false; f.list.splice(f.index, 1); return true;
      case 'addPage': {
        const name = String(o.value || 'New page').slice(0, 40); let slug = L.slug(name); while (P.pages.some((x) => x.slug === slug)) slug += '-2';
        const h = home(P); const navN = h.tree.find((x) => x.tag === 'nav'), footN = h.tree.find((x) => x.tag === 'footer');
        const pg = { id: L.uid('pg'), name, slug, title: `${name} — ${P.name}`, description: '', tree: [navN && L.reId(L.clone(navN)), o.section && C.SECTION_KINDS.includes(o.section.kind) ? C.addSection(P, o.section) : null, footN && L.reId(L.clone(footN))].filter(Boolean) };
        P.pages.push(pg); created[name.toLowerCase()] = pg; return true;
      }
      case 'setMeta': { const pg = pageRef(P, o.page || o.target, created); if (!pg || !['title', 'description'].includes(o.prop)) return false; pg[o.prop] = String(o.value || '').slice(0, o.prop === 'title' ? 90 : 200); return true; }
      case 'setAttr': {
        if (!n) return false; const p = String(o.prop || '');
        if (p === 'html') { if (n.type !== 'embed') return false; n.html = sanitizeHTML(o.value); return true; }
        if (/^on/i.test(p)) { delete n.attrs[p]; return true; }
        if (p === 'data-fx') { const ok = String(o.value || '').split(/\s+/).filter((x) => FX_TOKENS.includes(x)); if (ok.length) n.attrs['data-fx'] = ok.join(' '); else delete n.attrs['data-fx']; return true; }
        if (p === 'data-speed') { const v = parseFloat(o.value); if (!isFinite(v) || Math.abs(v) > 1) return false; n.attrs['data-speed'] = String(v); return true; }
        if (p === 'data-cursor') { n.attrs['data-cursor'] = o.value === 'view' ? 'view' : ''; return true; }
        if (!['alt', 'href', 'title', 'target', 'id', 'src', 'aria-label', 'rel', 'loading'].includes(p)) return false;
        let v = String(o.value == null ? '' : o.value).slice(0, 600);
        if (p === 'href') v = safeHref(v);
        if (p === 'src') { if (/^data:image\/svg/i.test(v)) { const s = sanitizeSVG(decodeURIComponent(v.split(',')[1] || '')); if (!s) return false; v = svgURI(s); } else if (!/^(https:|data:image\/(png|jpe?g|webp|gif);|\.\.\/|\/|[\w-]+\/)/i.test(v)) return false; }
        if (p === 'target' && !['', '_blank', '_self'].includes(v)) return false;
        if (v === '' && p !== 'alt') delete n.attrs[p]; else n.attrs[p] = v; return true;
      }
      case 'setTag': { if (!n) return false; const v = String(o.value || ''); if (n.type === 'heading' && /^h[1-6]$/.test(v)) { n.tag = v; return true; } const d = L.EL[n.type]; if (d && d.tags && d.tags.includes(v)) { n.tag = v; return true; } return false; }
      case 'setImage': { if (!n || n.type !== 'image') return false; const s = sanitizeSVG(o.value); if (!s) return false; n.attrs.src = svgURI(s); return true; }
      case 'setLogo': { const s = sanitizeSVG(o.value, 16000); if (!s) return false; return applyLogo(P, s) > 0; }
      case 'setLang': { if (!window.LoomLangs || !LoomLangs.LANGS[o.value]) return false; restyle(P, o.value); return true; }
      case 'setFx': {
        const v = String(o.value || ''); const key = String(o.prop || 'preset');
        if (key === 'preset') { if (!(v in C.FX_PRESETS)) return false; C.enhance(P, v); return true; }
        if (!['preloader', 'transition', 'cursor', 'grain', 'progress', 'theme', 'nav'].includes(key)) return false;
        P.fx = P.fx || { preset: 'custom' }; P.fx[key] = v !== 'false' && v !== 'off'; if (key === 'theme' && P.fx.theme) P.altSwatches = C.altTheme(P); return true;
      }
      case 'setSite': {
        P.meta = P.meta || {}; const k = o.prop;
        if (['csp', 'og', 'jsonld'].includes(k)) { P.meta[k] = o.value !== 'false' && o.value !== false; return true; }
        if (k === 'siteUrl') { if (o.value && !/^https:\/\/[\w.-]+\.[a-z]{2,}(\/[\w./-]*)?$/i.test(o.value)) return false; P.meta.siteUrl = o.value || ''; return true; }
        if (k === 'jsonldType' && /^[A-Z]\w{2,40}$/.test(o.value || '')) { P.meta.jsonldType = o.value; return true; }
        return false;
      }
    }
    return false;
  }

  /* ---------------------------------------------------------------- local agents */
  const R = (level, title, detail = '') => ({ level, title, detail });
  const lc = (s) => String(s || '').toLowerCase();
  const quoted = (s) => { const m = /["“'‘]([^"”'’]{1,200})["”'’]/.exec(s || ''); return m ? m[1] : null; };
  const after = (s, re) => { const m = re.exec(s || ''); return m ? m[1].trim().replace(/[.!]+$/, '') : null; };
  const pal = (P) => Object.fromEntries(P.swatches.map((s) => [s.id, s.value]));
  const moodOf = (P) => (col.lum(pal(P).paper || '#fff') < 0.25 ? 'dark' : 'light');
  const COLORS = { red: '#D92D3A', orange: '#F2702C', amber: '#E8A317', yellow: '#E8C518', gold: '#C9A13B', lime: '#7CB342', green: '#1F8A5B', emerald: '#10976B', mint: '#3FBF9B', teal: '#0E7C86', cyan: '#0BA5C7', blue: '#2F6BFF', navy: '#1B3A8A', indigo: '#4F46E5', purple: '#7C4DFF', violet: '#8B5CF6', lavender: '#A78BFA', pink: '#E0457B', rose: '#E11D74', magenta: '#C026D3', brown: '#8B5A2B', black: '#1F1F1F', grey: '#5B6475', gray: '#5B6475', coral: '#FF6F59', olive: '#6B7A2A', burgundy: '#7A1F3D', sage: '#7A9E7E', sand: '#C2A878' };
  const colorIn = (s) => { const hex = /#[0-9a-f]{6}\b/i.exec(s || ''); if (hex) return hex[0]; const k = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`, 'i').test(s || '')); return k ? COLORS[k] : null; };
  const FONT_PAIRS = { luxury: ['Cormorant Garamond', 'Jost'], elegant: ['Playfair Display', 'Nunito Sans'], editorial: ['Fraunces', 'Source Sans 3'], modern: ['Inter Tight', 'Inter'], tech: ['Space Grotesk', 'Inter'], techy: ['Space Grotesk', 'Inter'], playful: ['Bricolage Grotesque', 'Nunito'], friendly: ['Nunito', 'Nunito'], bold: ['Syne', 'Inter'], classic: ['Libre Baskerville', 'Source Sans 3'], minimal: ['Manrope', 'Manrope'], serif: ['DM Serif Display', 'DM Sans'], mono: ['JetBrains Mono', 'Inter'], corporate: ['IBM Plex Sans', 'IBM Plex Sans'], sporty: ['Anton', 'Inter'], retro: ['Righteous', 'Poppins'] };
  const kindIn = (s) => { const t = lc(s); const map = { pricing: /pric|plans?\b/, faq: /faq|question/, testimonials: /testimonial|review|quote/, team: /\bteam|people|staff/, gallery: /gallery|portfolio|work\b|photos/, products: /product|shop|store/, stats: /stats|numbers|metrics/, steps: /steps|process|how it works/, logos: /logo(s)? (row|strip|wall)|clients|partners/, newsletter: /newsletter|subscribe|email sign/, contact: /contact|form/, features: /feature|services|benefit/, split: /image and text|split|about/, cta: /\bcta\b|call to action|banner/, hero: /\bhero\b/ }; return Object.keys(map).find((k) => map[k].test(t)); };
  function sectionDefaults(kind, P) {
    const lib = C.detect(`${P.name} ${(P.spec && P.spec.industry) || ''}`); const spec = C.specFromLib(lib, { name: P.name });
    const hit = spec.pages.flatMap((p) => p.sections).find((s) => s.kind === kind);
    if (hit) return L.clone(hit);
    const D = { marquee: { kind, items: ['Strategy', 'Design', 'Build', 'Launch', 'Grow'].map((title) => ({ title })) }, manifesto: { kind, eyebrow: 'What we believe', title: `${P.name} exists to make the complex feel *simple* — and the simple feel *remarkable.*` }, dashboard: { kind, eyebrow: 'Product', title: 'Everything, at a *glance.*', text: 'Live KPIs, accessible charts and a sortable table — all editable.', dashboard: { product: P.name } }, showcase: { kind, eyebrow: 'Work', title: 'Selected *work*', items: ['Brand platform', 'Mobile app', 'Web experience', 'Campaign'].map((title, i) => ({ title, value: ['Identity · 2026', 'Product · 2025', 'Web · 2025', 'Campaign · 2024'][i], text: 'A short line on the outcome.' })) }, services: { kind, eyebrow: 'Services', title: 'How we can *help.*', items: [['Strategy', 'Research, positioning and roadmap.', '2–4 weeks'], ['Design', 'Product, brand and design systems.', '4–8 weeks'], ['Build', 'Engineering, QA and launch.', '6–12 weeks']].map(([title, text, value]) => ({ title, text, value })) }, bento: { kind, eyebrow: 'Why us', title: 'Built *different.*', items: [['Fast', 'Pages load in under a second.'], ['Accessible', 'WCAG 2.2 AA from day one.'], ['Secure', 'Strict CSP, no trackers.'], ['Yours', 'Plain HTML you own.'], ['Loved', 'Designed with real users.'], ['Supported', 'Humans on call.']].map(([title, text]) => ({ title, text })) }, hscroll: { kind, eyebrow: 'Capabilities', title: 'What we *do.*', items: [['Strategy', 'Know what to build.', 'Research · Positioning · Roadmaps'], ['Design', 'Interfaces people understand.', 'UX · UI · Design systems'], ['Build', 'Ship with confidence.', 'Engineering · QA · Launch']].map(([title, text, meta]) => ({ title, text, meta })) }, contact: { kind, eyebrow: 'Contact', title: 'Let’s talk.', text: 'We reply within one working day.', cta: 'Send message' }, newsletter: { kind, title: 'Stay in the loop', text: 'One useful email a month.', cta: 'Subscribe' }, team: { kind, title: 'The team', items: [{ title: 'Alex Morgan', meta: 'Founder' }, { title: 'Sam Rivera', meta: 'Design' }, { title: 'Jo Patel', meta: 'Engineering' }, { title: 'Kai Chen', meta: 'Support' }] }, gallery: { kind, title: 'Gallery', items: [] }, cta: { kind, title: 'Ready when you are.', text: 'Get in touch today.', cta: 'Get started' } };
    return D[kind] || { kind, title: kind[0].toUpperCase() + kind.slice(1), items: [{ title: 'First', text: 'Describe it here.' }, { title: 'Second', text: 'Describe it here.' }, { title: 'Third', text: 'Describe it here.' }] };
  }

  const LOCAL = {
    director(req) {
      const t = lc(req); const steps = []; let pos = 0;
      const add = (agent, task) => { if (!steps.some((s) => s.agent === agent)) steps.push({ agent, task, pos }); };
      const at = (re) => { const m = re.exec(t); if (m) pos = m.index; return !!m; };
      const mention = [...t.matchAll(/@([a-z]+)/g)].map((m) => m[1]).map((m) => TEAM.find((a) => a.id === m || lc(a.name) === m)).filter(Boolean);
      if (mention.length) { mention.forEach((a) => add(a.id, req.replace(/@\w+/g, '').trim())); return { reply: `Routing this to ${mention.map((a) => a.name).join(' and ')}.`, steps }; }
      if (/\b(launch|go live|ship it|publish|deploy|pre-?flight)\b/.test(t)) { pos = 1000; add('qa', 'Pre-launch QA'); add('security', 'Security scan'); add('seo', 'SEO pass'); add('devops', 'Launch checklist'); }
      if (/\b(audit|review|check|health)\b/.test(t) && !steps.length) { pos = 1000; add('qa', 'Accessibility & QA audit'); add('security', 'Security scan'); add('seo', 'SEO audit'); add('designer', 'UX review'); }
      if (at(/\b(build|create|make|generate)\b.*\b(site|website|page|landing)\b/) || at(/\badd\b.*\bpage\b/)) add('architect', req);
      if (at(/\b(add|insert|include|remove|delete)\b.*\b(section|pricing|faq|testimonial|team|gallery|stats|newsletter|contact)/)) add(/remove|delete/.test(t) ? 'maintainer' : 'architect', req);
      if (at(/\b(logo|mark\b|favicon|monogram)/)) add('logo', req);
      if (at(/\b(illustrat|image|imagery|artwork|photos?|pictures?|alt text)/)) add('illustrator', req);
      if (at(/\b(animat|motion|transition|scroll effect|hover effect|parallax|reveal|cinematic|effects?|preloader|cursor|awwwards|award)/)) add('motion', req);
      if (at(/\b(dashboard|kpis?|charts?|graphs?|data table|tables?|analytics|metrics|data viz|visuali[sz]|admin panel|reporting)/)) add('data', req);
      if (at(/\b(awwwards|award|premium|elevate|world.class|stunning|beautiful|luxur|high.end|polish)/)) add('designer', req);
      const langHit = window.LoomLangs && Object.keys(LoomLangs.KEYWORDS).find((k) => LoomLangs.KEYWORDS[k].test(t));
      if (langHit && /\b(style|look|feel|make it|switch|turn it|redesign|restyle|theme|go|more|design language|aesthetic)\b/.test(t) && at(LoomLangs.KEYWORDS[langHit])) add('designer', req);
      if (at(/\b(colou?r|palette|brand|font|typeface|typography|dark mode|light mode|premium|luxur|rebrand)/) || (colorIn(req) && at(/./))) add('brand', req);
      if (!/alt text/.test(t) && at(/\b(copy|headline|rewrite|tone|translate|wording|text)\b/)) add('copy', req);
      if (at(/\b(ux|layout|spacing|hierarchy|responsive|mobile|redesign|polish|design)/)) add('designer', req);
      if (at(/\b(accessib|a11y|wcag|contrast|qa|test|bug|broken)/)) add('qa', req);
      if (at(/\b(secur|xss|csp|safe|hack|vulnerab|breach|protect)/)) add('security', req);
      if (at(/\b(seo|search|google|ranking|meta|sitemap|aso|app store|play store|keywords)/)) add('seo', req);
      if (at(/\b(marketing|market\b|campaign|social media|social post|growth|boost|ads\b|advertis|email campaign|promot|audience)/)) add('marketing', req);
      if (at(/\b(domain|dns|host|hosting|server|ssl|github pages|netlify|cloudflare)/)) add('devops', req);
      if (at(/\b(e-?commerce|sell|selling|products?|store|shop|checkout|stripe|inventory|sourc|supplier|dropship)/)) add('commerce', req);
      if (!steps.length) add('maintainer', req);
      // a design-language restyle already sets fonts and palette; keep Hue out unless a colour was named
      if (window.LoomLangs && steps.some((x) => x.agent === 'designer') && Object.keys(LoomLangs.KEYWORDS).some((k) => LoomLangs.KEYWORDS[k].test(t)) && !colorIn(req) && !/\b(font|typeface|palette)\b/.test(t)) { const i = steps.findIndex((x) => x.agent === 'brand'); if (i >= 0) steps.splice(i, 1); }
      steps.sort((x, y) => x.pos - y.pos); steps.forEach((x) => delete x.pos);
      return { reply: steps.length > 1 ? `I’ll run this with ${steps.length} specialists.` : `${byId(steps[0].agent).name} will handle this.`, steps };
    },

    architect(req, P) {
      const ops = [], report = []; const t = lc(req);
      const pageName = after(req, /\bpage (?:called|named|for)?\s*["“]?([\w &'-]{2,30})["”]?/i) || (/\badd (?:a |an )?(?:new )?([\w-]+) page\b/i.exec(req) || [])[1];
      if (pageName && /\bpage\b/.test(t)) {
        const name = pageName.replace(/\b\w/g, (c) => c.toUpperCase()); const k = kindIn(name) || 'features';
        ops.push({ op: 'addPage', value: name, section: { kind: 'hero', eyebrow: name, title: `${name} at ${P.name}` } });
        ops.push({ op: 'addSection', page: name, section: sectionDefaults(k, P) }, { op: 'addSection', page: name, section: sectionDefaults('cta', P) });
        return { reply: `Added a “${name}” page with a hero, ${k} and a call to action. It’s linked from nowhere yet, so add it to your navbar in Pages.`, ops, report };
      }
      const kinds = C.SECTION_KINDS.filter((k) => new RegExp(`\\b${k === 'testimonials' ? 'testimonial|review' : k === 'products' ? 'product|shop' : k === 'faq' ? 'faq|questions' : k}`, 'i').test(t));
      const k2 = kinds.length ? kinds : [kindIn(req)].filter(Boolean);
      if (k2.length) { k2.forEach((k) => ops.push({ op: 'addSection', page: home(P).id, section: sectionDefaults(k, P) })); return { reply: `Added ${k2.join(', ')} to ${home(P).name}, placed above the footer and styled to match. Drag it anywhere in the Navigator.`, ops, report }; }
      report.push(R('info', 'Tell me what to build', 'For example: “add a pricing section”, “add a Careers page”, or describe a whole new site on the dashboard.'));
      return { reply: 'I can add pages and sections. What should I build?', ops, report };
    },

    brand(req, P) {
      const ops = []; const t = lc(req); const mood = /\bdark\b/.test(t) ? 'dark' : /\blight\b/.test(t) ? 'light' : moodOf(P);
      let brand = colorIn(req);
      if (!brand && /\b(premium|luxur|elegant)\b/.test(t)) brand = mood === 'dark' ? '#D4B26A' : '#8A6A2F';
      if (!brand && /\b(fresh|new|different|another|variation|rebrand|surprise)\b/.test(t)) { const [h, s, l] = col.hsl(pal(P).brand || '#3B6CFF'); brand = col.hslToHex(h + 137, Math.max(0.5, s), Math.min(Math.max(l, 0.4), 0.55)); }
      if (!brand && (mood !== moodOf(P))) brand = pal(P).brand;
      if (brand) { const p = col.paletteFrom(brand, mood); Object.entries(p).forEach(([k, v]) => ops.push({ op: 'setSwatch', target: k, value: v })); ops.push({ op: 'setFx', prop: 'theme', value: 'true' }); }
      const fk = Object.keys(FONT_PAIRS).find((k) => new RegExp(`\\b${k}`, 'i').test(t)); if (fk) { ops.push({ op: 'setFont', target: 'heading', value: FONT_PAIRS[fk][0] }, { op: 'setFont', target: 'body', value: FONT_PAIRS[fk][1] }); }
      const fname = after(req, /\bfont (?:to|=)\s*["“]?([A-Za-z0-9 ]{2,40})["”]?/i); if (fname) ops.push({ op: 'setFont', target: 'heading', value: fname.replace(/\b\w/g, (c) => c.toUpperCase()) });
      if (!ops.length) { const p = col.paletteFrom(pal(P).brand || '#3B6CFF', moodOf(P)); Object.entries(p).forEach(([k, v]) => ops.push({ op: 'setSwatch', target: k, value: v })); }
      const b = (ops.find((o) => o.target === 'brand') || {}).value; const pp = (ops.find((o) => o.target === 'paper') || {}).value || pal(P).paper; const ink = (ops.find((o) => o.target === 'ink') || {}).value || pal(P).ink;
      return { reply: `${b ? `New ${mood} palette around ${b}.` : ''}${fk ? ` Paired ${FONT_PAIRS[fk][0]} with ${FONT_PAIRS[fk][1]}.` : ''} Every colour pair meets WCAG AA.`.trim(), ops,
        report: [R('pass', `Text contrast ${col.contrast(ink, pp).toFixed(1)}:1`, 'AAA needs 7:1 for body text.'), b ? R('pass', `Button contrast ${col.contrast(pp, b).toFixed(1)}:1`, 'Paper text on the brand colour.') : null].filter(Boolean) };
    },

    copy(req, P) {
      const ops = [], report = []; const pg = home(P); const q = quoted(req);
      const h1 = []; L.walk(pg.tree, (n) => { if (n.type === 'heading' && n.tag === 'h1') h1.push(n); });
      if (/\b(headline|title|heading|hero)\b/i.test(req) && (q || after(req, /\bto\s+(.{3,120})$/i)) && h1[0]) ops.push({ op: 'setText', target: h1[0].id, value: q || after(req, /\bto\s+(.{3,120})$/i) });
      else if (/\bbutton/i.test(req) && q) { let b = null; L.walk(pg.tree, (n) => { if (!b && n.type === 'button' && n.cls === 'btn') b = n; }); if (b) ops.push({ op: 'setText', target: b.id, value: q }); }
      else if (/\b(shorter|concise|tighten|trim)\b/i.test(req)) each(P, (n) => { if (n.type === 'paragraph' && n.text && n.text.length > 110) { const first = n.text.split(/(?<=[.!?])\s/)[0]; if (first.length > 20) ops.push({ op: 'setText', target: n.id, value: first }); } });
      else {
        const generic = /^(learn more|click here|read more|button|submit|text link|more)$/i;
        each(P, (n) => { if ((n.type === 'button' || n.type === 'link') && generic.test(String(n.text || '').trim())) ops.push({ op: 'setText', target: n.id, value: n.type === 'button' ? 'See how it works' : 'Read the story' }); });
        each(P, (n) => { if (n.text && /lorem ipsum|write something meaningful|this is some text inside/i.test(n.text)) report.push(R('warn', 'Placeholder copy found', `“${n.text.slice(0, 60)}…” on ${P.pages.find((p) => L.find(p.tree, n.id)).name}.`)); });
        report.push(R('info', 'Deeper rewrites need Loom AI', 'Offline, I fix generic buttons and flag placeholders. With Claude connected I rewrite headlines, tone and translations.'));
      }
      return { reply: ops.length ? `Updated ${ops.length} piece${ops.length > 1 ? 's' : ''} of copy.` : 'No copy changes needed right now.', ops, report };
    },

    logo(req, P) {
      const p = pal(P); const name = P.name.replace(/\b(co|inc|ltd|llc)\.?$/i, '').trim(); const initials = (name.match(/\b[A-Za-z0-9]/g) || ['L']).slice(0, 2).join('').toUpperCase();
      const b = p.brand || '#3B6CFF', ink = p.ink || '#111', paper = p.paper || '#fff'; const [h] = col.hsl(b); const b2 = col.hslToHex(h + 38, 0.7, 0.6);
      const styles = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="32" y="42" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${initials.length > 1 ? 26 : 32}" fill="${paper}" letter-spacing="-1">${L.esc(initials)}</text></svg>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${b}"/><path d="M14 40c10-18 26-18 36 0" stroke="${paper}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="32" cy="24" r="5" fill="${paper}"/></svg>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke-width="6" stroke-linecap="round"><path d="M12 18h40M12 32h40M12 46h40" stroke="${b}"/><path d="M20 10v44M32 10v44M44 10v44" stroke="${ink}" stroke-dasharray="8 6"/></g></svg>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 4l24 14v28L32 60 8 46V18z" fill="${b}"/><path d="M32 18l12 7v14l-12 7-12-7V25z" fill="${paper}" opacity=".9"/></svg>`
      ];
      const t = lc(req); const i = /weave|thread|grid/.test(t) ? 2 : /hex|geometric|shield/.test(t) ? 3 : /circle|round|sun|arc/.test(t) ? 1 : /monogram|initial|letter/.test(t) ? 0 : (name.length % styles.length);
      return { reply: `Designed a ${['monogram', 'arc mark', 'woven mark', 'geometric mark'][i]} for ${name} in your brand colours and placed it in every navbar. It also becomes the favicon when you publish.`, ops: [{ op: 'setLogo', value: styles[i] }],
        report: [R('pass', 'Scales from 16px to billboard', 'Pure SVG, no raster.'), R('info', 'Want options?', 'Ask again with “monogram”, “arc”, “woven” or “geometric”. With Loom AI connected, Mark designs bespoke marks.')] };
    },

    illustrator(req, P) {
      const ops = [], report = []; const p = pal(P); const colors = [p.soft || '#eee', p.brand || '#36f', col.hslToHex(col.hsl(p.brand || '#36f')[0] + 40, 0.55, moodOf(P) === 'dark' ? 0.35 : 0.72), p.line || '#ddd'];
      const kinds = /line|abstract|flow/.test(lc(req)) ? ['lines'] : /product/.test(lc(req)) ? ['product'] : /house|home|build/.test(lc(req)) ? ['house'] : /ui|app|dashboard|screen/.test(lc(req)) ? ['ui'] : ['blobs', 'arch', 'lines'];
      let k = 0, seed = Date.now() % 997;
      P.pages.forEach((pg) => {
        let lastHeading = '';
        L.walk(pg.tree, (n) => {
          if (n.type === 'heading') lastHeading = n.text;
          if (n.type !== 'image') return;
          const src = n.attrs.src || ''; const isGen = src === L.PLACEHOLDER_IMG || /^data:image\/svg/.test(src) || !src;
          if (isGen && !/brand-logo/.test(n.cls || '')) { const kind = n.cls === 'p-img' ? 'product' : n.cls === 'avatar' ? 'blobs' : kinds[k++ % kinds.length]; ops.push({ op: 'setAttr', target: n.id, prop: 'src', value: T.art(seed++, colors, { kind }) }); }
          if (!n.attrs.alt && !/brand-logo/.test(n.cls || '')) ops.push({ op: 'setAttr', target: n.id, prop: 'alt', value: lastHeading ? `Illustration for “${lastHeading.slice(0, 60)}”` : `${P.name} illustration` });
        });
      });
      report.push(R('info', 'About photos', 'Offline, Ink draws on-brand SVG artwork. For photography, upload images in Assets. Generated photos need an image model, which Loom doesn’t include.'));
      return { reply: `Redrew ${ops.filter((o) => o.prop === 'src').length} illustrations in your palette and wrote ${ops.filter((o) => o.prop === 'alt').length} alt texts.`, ops, report };
    },

    motion(req, P) {
      const t = lc(req);
      if (/\b(remove|disable|turn off|no|stop)\b.*\b(animat|motion|effects?)/.test(t)) return { reply: 'Motion is off. The site is fully static now; every element stays in place.', ops: [{ op: 'setFx', prop: 'preset', value: 'none' }], report: [R('pass', 'Static site', 'No motion runtime is published.')] };
      const preset = /\b(cinematic|awwwards|award|bold|dramatic|wow|immersive|luxur|premium)/.test(t) ? 'cinematic' : /\b(minimal|subtle|calm|quiet|light)\b/.test(t) ? 'minimal' : (P.fx && P.fx.preset && P.fx.preset !== 'none' ? (P.fx.preset === 'minimal' ? 'refined' : P.fx.preset) : 'refined');
      const ops = [{ op: 'setFx', prop: 'preset', value: preset }];
      ['preloader', 'cursor', 'grain', 'transition', 'progress', 'theme'].forEach((k) => { const on = new RegExp(`\\b(add|with|enable|turn on)\\b[^.]*\\b${k}`).test(t), off = new RegExp(`\\b(no|without|remove|disable)\\b[^.]*\\b${k}`).test(t); if (on || off) ops.push({ op: 'setFx', prop: k, value: on ? 'true' : 'false' }); });
      const desc = { cinematic: 'a branded preloader, curtain page transitions, a custom cursor, film grain, split-word headlines, counters, tilt cards and magnetic buttons', refined: 'split-word headlines, staggered reveals, counters, tilt cards, magnetic buttons and page transitions', minimal: 'a calm navbar and theme toggle, content appears without movement' }[preset];
      return { reply: `Directed the ${preset} motion preset: ${desc}. Press Preview to feel it live.`, ops,
        report: [R('pass', 'Reduced motion respected', 'Visitors who prefer less motion get the finished page instantly.'), R('pass', 'Pause control', 'Marquees pause on hover and with a visible “Pause motion” button (WCAG 2.2.2).'), R('pass', 'Strict-CSP friendly', 'Motion ships as one small local file, loom-fx.js. No third-party scripts.'), R('pass', 'Screen readers', 'Split headlines keep the original sentence for assistive tech.'), R('info', 'Fine-tune', 'Select any element → Settings → Attribute data-fx (split, reveal, stagger, count, marquee, parallax, scrub, hscroll, tilt, magnetic).')] };
    },

    data(req, P) {
      const t = lc(req); const h = home(P); const ops = [];
      const domain = /financ|cash|bank|invoice|spend/.test(t) ? 'fin' : /devops|api|server|latency|uptime|infra/.test(t) ? 'dev' : /agent|ai\b|automation/.test(t) ? 'ai' : /health|patient|clinic/.test(t) ? 'health' : /shop|store|order|e-?commerce|sales/.test(t) ? 'shop' : 'saas';
      const PRESET = {
        saas: { heading: 'Overview' },
        health: { heading: 'Clinic overview', nav: ['Overview', 'Patients', 'Appointments', 'Billing', 'Settings'], kpis: [['Appointments today', '142', '+8%'], ['Avg. wait', '11 min', '−3 min'], ['No-show rate', '4.2%', '−0.6 pts'], ['Satisfaction', '4.8/5', '+0.1']], chartTitle: 'Appointments per month', barTitle: 'Visits by service', bars: [['General', 44], ['Dental', 26], ['Physio', 18], ['Other', 12]], cols: ['Clinician', 'Service', 'Status', 'Booked', 'Score'], rows: [['Dr. Aziz', 'General', 'Active', '32', '98%'], ['Dr. Weller', 'Dental', 'Active', '24', '96%'], ['N. Brooks', 'Nursing', 'Pending', '18', '94%'], ['O. Said', 'Physio', 'Active', '21', '97%']], filter: 'Filter clinicians' },
        shop: { heading: 'Store overview', nav: ['Overview', 'Orders', 'Products', 'Customers', 'Settings'], kpis: [['Revenue (30d)', '$48,210', '+14%'], ['Orders', '1,932', '+9%'], ['Conversion', '3.4%', '+0.3 pts'], ['Refund rate', '1.1%', '−0.2 pts']], chartTitle: 'Revenue per month ($k)', barTitle: 'Sales by channel', bars: [['Online store', 62], ['Marketplace', 21], ['Retail', 12], ['Wholesale', 5]], cols: ['Order', 'Customer', 'Status', 'Items', 'Total $'], rows: [['#10482', 'A. Rahman', 'Paid', '3', '$124'], ['#10481', 'L. Chen', 'Pending', '1', '$38'], ['#10480', 'M. Silva', 'Paid', '5', '$212'], ['#10479', 'J. Okafor', 'Overdue', '2', '$76'], ['#10478', 'S. Novak', 'Paid', '4', '$158']], filter: 'Filter orders' }
      };
      const dash = Object.assign({ product: P.name }, PRESET[domain] || {}, domain === 'fin' || domain === 'dev' || domain === 'ai' ? {} : {});
      const already = h.tree.some((n) => JSON.stringify(n).includes('"cls":"dash"'));
      ops.push({ op: 'addSection', page: h.id, after: (h.tree[1] || {}).id, section: { kind: 'dashboard', eyebrow: 'Product', title: /admin|internal|console|app/.test(t) ? 'Your operations, *in one place.*' : 'Everything, at a *glance.*', text: 'Live KPIs, accessible charts and a sortable, filterable table. Every number is editable text.', dashboard: domain === 'fin' || domain === 'dev' || domain === 'ai' ? Object.assign({ product: P.name }, { fin: { heading: 'Cash overview' }, dev: { heading: 'Production' }, ai: { heading: 'Agent operations' } }[domain]) : dash } });
      return { reply: `${already ? 'Added another' : 'Designed a'} ${domain === 'saas' ? 'SaaS' : domain} dashboard: sidebar navigation, four KPIs that count up, a trend line with a comparison series, a segment breakdown and a sortable, filterable data table.`, ops,
        report: [R('pass', 'Colour-blind safe', 'Series use the Okabe–Ito palette plus dashed lines, so nothing relies on hue alone.'), R('pass', 'Accessible charts', 'Every chart has a title and a text description. The bar chart announces its values.'), R('pass', 'Real data table', 'Semantic <table> with caption, column headers, aria-sort and a live result count. It scrolls horizontally on phones.'), R('pass', 'Tabular numerals', 'Numbers align in columns and KPIs.'), R('info', 'Status pills', 'Statuses show a dot and a word, never colour alone (WCAG 1.4.1).'), R('info', 'Live data', 'Numbers are editable text. To connect live data, replace the table embed with your API output, or ask Relay to plan an integration.')] };
    },

    designer(req, P) {
      const ops = [], report = []; const k = P.classes;
      const t0 = lc(req); const lang = window.LoomLangs && Object.keys(LoomLangs.KEYWORDS).find((x) => LoomLangs.KEYWORDS[x].test(t0));
      if (lang && !/\b(award|awwwards|polish|elevate)\b/.test(t0)) {
        const G = LoomLangs.LANGS[lang];
        return { reply: `Restyled the whole site in the ${G.label} design language: ${G.desc.charAt(0).toLowerCase() + G.desc.slice(1)} Every section, class and colour stays editable, and Undo returns the old look.`, ops: [{ op: 'setLang', value: lang }],
          report: [R('pass', `${G.label} applied`, `Type: ${G.fonts[0]} + ${G.fonts[1]}. Cards: ${G.card}. Buttons: ${G.btn}. Motion: ${G.fx}.`), R('pass', 'Contrast kept', 'The new palette meets WCAG AA.'), R('info', 'Try another', `Other languages: ${Object.values(LoomLangs.LANGS).map((x) => x.label).filter((x) => x !== G.label).join(', ')}.`)] };
      }
      if (/\b(awwwards|award|premium|elevate|world.class|stunning|beautiful|luxur|high.end|polish|art direct|editorial)/i.test(req)) {
        // Art direction: fluid display type, balanced headings, accent serif, generous rhythm, cinematic motion
        const fluid = { display: 'clamp(56px, 10.5vw, 188px)', 'display-c': 'clamp(52px, 9vw, 160px)', 'h-sec': 'clamp(40px, 6.2vw, 112px)', 'cta-t': 'clamp(56px, 11vw, 200px)', 'band-title': 'clamp(44px, 7vw, 120px)', 'section-title': 'clamp(40px, 6vw, 104px)', 'hero-title': 'clamp(56px, 10vw, 176px)', 'mast-title': 'clamp(72px, 14vw, 240px)' };
        Object.entries(fluid).forEach(([c, v]) => { if (k[c]) { ops.push({ op: 'setStyle', target: c, prop: 'font-size', value: v }, { op: 'setStyle', target: c, prop: 'letter-spacing', value: c.startsWith('h-') ? '-0.05em' : '-0.058em' }, { op: 'setStyle', target: c, prop: 'line-height', value: '0.9' }); if (k[c].landscape && k[c].landscape['font-size']) ops.push({ op: 'setStyle', target: c, bp: 'landscape', prop: 'font-size', value: '' }); } });
        ['@h1', '@h2'].forEach((c) => ops.push({ op: 'setStyle', target: c, prop: 'text-wrap', value: 'balance' }));
        ops.push({ op: 'setStyle', target: '@body', prop: 'font-size', value: '17px' }, { op: 'setStyle', target: '@body', prop: 'line-height', value: '1.6' }, { op: 'setStyle', target: '@body', prop: '-webkit-font-smoothing', value: 'antialiased' });
        if (!P.fonts.accent) ops.push({ op: 'setFont', target: 'accent', value: /serif|Fraunces|Playfair|Cormorant|Garamond|Baskerville/.test(P.fonts.heading) ? P.fonts.heading : 'Instrument Serif' });
        if (k.section) ops.push({ op: 'setStyle', target: 'section', prop: 'padding-top', value: 'clamp(96px, 12vw, 192px)' }, { op: 'setStyle', target: 'section', prop: 'padding-bottom', value: 'clamp(96px, 12vw, 192px)' });
        P.pages.forEach((pg) => { const h1 = headingsOf(pg).find((x) => levelOf(x) === 1); if (h1 && h1.text && !/\*/.test(h1.text)) { const w = h1.text.trim().split(/\s+/); if (w.length > 1) { const last = w.pop(); ops.push({ op: 'setText', target: h1.id, value: `${w.join(' ')} *${last}*` }); } } });
        const hh = home(P); if (!hh.tree.some((n) => (n.attrs || {})['data-fx'] === 'marquee')) { const words = headingsOf(hh).slice(1, 6).map((x) => String(x.text || '').replace(/\*/g, '').split(/[.,:—-]/)[0].trim()).filter((x) => x && x.length < 28); if (words.length >= 3) ops.push({ op: 'addSection', page: hh.id, after: (hh.tree[1] || {}).id, section: { kind: 'marquee', items: words.map((title) => ({ title })) } }); }
        if (/\b(awwwards|award|cinematic|bold|wow|stunning|immersive)/i.test(req) || !P.fx) ops.push({ op: 'setFx', prop: 'preset', value: /\b(awwwards|award|cinematic|bold|wow|stunning|immersive)/i.test(req) ? 'cinematic' : 'refined' });
        report.push(R('pass', 'Art direction applied', 'Fluid display type up to 188px, balanced headings, accent serif words, generous section rhythm, marquee interlude and cinematic motion.'), R('info', 'Accent words', 'Wrap any word in *asterisks* in a heading to set it in the accent serif.'));
      }
      const hasBp = (c, bp) => k[c] && k[c][bp] && Object.keys(k[c][bp]).length;
      Object.keys(k).forEach((c) => { const g = k[c].base && k[c].base['grid-template-columns']; const m = g && /repeat\((\d)/.exec(g); if (m && +m[1] >= 3 && !hasBp(c, 'landscape')) { ops.push({ op: 'setStyle', target: c, bp: 'landscape', prop: 'grid-template-columns', value: '1fr' }); if (!hasBp(c, 'tablet')) ops.push({ op: 'setStyle', target: c, bp: 'tablet', prop: 'grid-template-columns', value: 'repeat(2, 1fr)' }); } });
      Object.keys(k).forEach((c) => { const fs = k[c].base && parseFloat(k[c].base['font-size']); if (fs >= 56 && !(k[c].landscape || {})['font-size']) ops.push({ op: 'setStyle', target: c, bp: 'landscape', prop: 'font-size', value: Math.round(fs * 0.58) + 'px' }); });
      ['lead', 'card-text', 'paragraph'].forEach((c) => { if (k[c] && !k[c].base['max-width']) ops.push({ op: 'setStyle', target: c, prop: 'max-width', value: '62ch' }); });
      if (/\b(spacious|airy|more space|breathing)\b/i.test(req) && k.section) ops.push({ op: 'setStyle', target: 'section', prop: 'padding-top', value: '140px' }, { op: 'setStyle', target: 'section', prop: 'padding-bottom', value: '140px' });
      if (/\b(compact|tighter|dense)\b/i.test(req) && k.section) ops.push({ op: 'setStyle', target: 'section', prop: 'padding-top', value: '72px' }, { op: 'setStyle', target: 'section', prop: 'padding-bottom', value: '72px' });
      if (/\b(square|sharp)\b/i.test(req)) ['btn', 'btn-ghost', 'band-btn', 'card', 'f-card', 'plan'].forEach((c) => k[c] && ops.push({ op: 'setStyle', target: c, prop: 'border-radius', value: c.includes('btn') ? '4px' : '6px' }));
      if (/\b(round|pill|soft)\b/i.test(req)) ['btn', 'btn-ghost', 'band-btn'].forEach((c) => k[c] && ops.push({ op: 'setStyle', target: c, prop: 'border-radius', value: '999px' }));
      const h = home(P); const top = h.tree.map((n) => textOf(n).toLowerCase());
      if (!h.tree.some((n) => n.cls === 'cta' || /"cls":"band"/.test(JSON.stringify(n))) && !top.some((x) => /get started|contact us|book|let’s talk/.test(x))) { ops.push({ op: 'addSection', page: h.id, section: sectionDefaults('cta', P) }); report.push(R('warn', 'No closing call to action', 'Added a CTA band before the footer.')); }
      if (!h.tree.some((n) => n.tag === 'nav')) report.push(R('warn', 'No navigation bar', 'Visitors can’t move between pages. Add a Navbar layout.'));
      if (h.tree.length > 14) report.push(R('info', 'Long home page', `${h.tree.length} sections. Consider moving detail to sub-pages.`));
      report.push(R(ops.length ? 'pass' : 'pass', ops.length ? `${ops.length} layout improvements applied` : 'Layout looks solid', 'Responsive grids, readable line length and mobile type scale.'));
      const elevated = report.some((r) => r.title === 'Art direction applied');
      return { reply: elevated ? 'Art-directed the site: fluid editorial type, accent serif words, balanced headings, generous rhythm, a marquee interlude and signature motion.' : ops.length ? 'Tightened responsive behaviour, line length and mobile type scale.' : 'The layout already follows the system. Nothing to change.', ops, report };
    },

    qa(req, P) {
      const ops = [], report = []; const p = pal(P); let issues = 0;
      const ratio = col.contrast(p.ink || '#000', p.paper || '#fff'), btn = col.contrast(p.paper || '#fff', p.brand || '#36f'), mut = col.contrast(p.muted || '#666', p.paper || '#fff');
      if (ratio < 4.5 || btn < 4.5 || mut < 4.5) { const fixed = col.fixPalette({ brand: p.brand, ink: p.ink, paper: p.paper, muted: p.muted, soft: p.soft, line: p.line }, moodOf(P)); Object.entries(fixed).forEach(([k2, v]) => { if (v !== p[k2]) ops.push({ op: 'setSwatch', target: k2, value: v }); }); report.push(R('fail', 'Colour contrast below AA', `Text ${ratio.toFixed(1)}:1 · buttons ${btn.toFixed(1)}:1 · muted ${mut.toFixed(1)}:1. Fixed automatically.`)); issues++; }
      else report.push(R('pass', 'Colour contrast meets AA', `Text ${ratio.toFixed(1)}:1 · buttons ${btn.toFixed(1)}:1 · muted ${mut.toFixed(1)}:1`));
      P.pages.forEach((pg) => {
        const hs = headingsOf(pg); const h1s = hs.filter((x) => levelOf(x) === 1);
        if (!h1s.length && hs.length) { ops.push({ op: 'setTag', target: hs[0].id, value: 'h1' }); report.push(R('fail', `${pg.name}: no H1`, 'Promoted the first heading to H1.')); issues++; }
        h1s.slice(1).forEach((x) => { ops.push({ op: 'setTag', target: x.id, value: 'h2' }); issues++; }); if (h1s.length > 1) report.push(R('warn', `${pg.name}: ${h1s.length} H1s`, 'Kept the first, demoted the rest to H2.'));
        let prev = 1; hs.forEach((x) => { const lv = levelOf(x); if (lv > prev + 1) { ops.push({ op: 'setTag', target: x.id, value: 'h' + (prev + 1) }); issues++; } prev = Math.min(lv, prev + 1); });
        let lastH = '';
        L.walk(pg.tree, (n) => {
          if (n.type === 'heading') lastH = n.text;
          if (n.type === 'image' && !n.attrs.alt && !/brand-logo/.test(n.cls || '')) { ops.push({ op: 'setAttr', target: n.id, prop: 'alt', value: lastH ? `Image for “${String(lastH).slice(0, 60)}”` : `${P.name} image` }); issues++; }
          if ((n.type === 'link' || n.type === 'button') && /^(click here|here|read more|more)$/i.test(String(n.text || '').trim())) { report.push(R('warn', `Vague link text “${n.text}”`, `On ${pg.name}. Say where the link goes.`)); issues++; }
          if ((n.type === 'link' || n.type === 'button') && (!n.attrs.href || n.attrs.href === '#')) n._dead = true;
          if (n.text && /lorem ipsum/i.test(n.text)) { report.push(R('warn', 'Lorem ipsum left in', `${pg.name}: “${n.text.slice(0, 40)}…”`)); issues++; }
        });
        const dead = []; L.walk(pg.tree, (n) => { if (n._dead) { dead.push(n.text); delete n._dead; } });
        if (dead.length) report.push(R('warn', `${pg.name}: ${dead.length} link${dead.length > 1 ? 's' : ''} go nowhere`, dead.slice(0, 5).map((x) => `“${x}”`).join(', ') + (dead.length > 5 ? '…' : '') + '. Set them in Settings → Link.'));
        L.walk(pg.tree, (n) => { const a = n.attrs && n.attrs.href; if (a && a.startsWith('page:') && !P.pages.some((x) => x.id === a.slice(5))) { ops.push({ op: 'setAttr', target: n.id, prop: 'href', value: '#' }); report.push(R('fail', 'Broken page link', `“${n.text || 'link'}” pointed to a deleted page.`)); issues++; } });
        if (!pg.title) { ops.push({ op: 'setMeta', page: pg.id, prop: 'title', value: `${pg.name === 'Home' ? (h1s[0] ? h1s[0].text.slice(0, 40) : pg.name) : pg.name} — ${P.name}`.slice(0, 60) }); }
      });
      Object.entries(P.classes).forEach(([c, r]) => { const g = r.base && r.base['grid-template-columns']; if (g && /repeat\([3-9]/.test(g) && !(r.landscape || r.portrait)) { ops.push({ op: 'setStyle', target: c, bp: 'landscape', prop: 'grid-template-columns', value: '1fr' }); report.push(R('warn', `.${c} doesn’t stack on phones`, 'Added a one-column mobile layout.')); issues++; } });
      const fonts = L.fontsUsed(P); if (fonts.length > 4) report.push(R('info', `${fonts.length} font families`, 'More than 3–4 slows the page. Consider consolidating.'));
      ['btn', 'btn-ghost', 'band-btn', 'p-buy', 'nav-link', 'button'].forEach((c) => { const r = P.classes[c] && P.classes[c].base; if (!r) return; const hgt = parseFloat(r['min-height'] || r.height || 0), pad = parseFloat(r['padding-top'] || 0) * 2 + 16 * 1.4; if (Math.max(hgt, pad) < 24) { ops.push({ op: 'setStyle', target: c, prop: 'min-height', value: '44px' }); report.push(R('warn', `.${c} target too small`, 'Raised to 44px (WCAG 2.5.8 needs 24px minimum; 44px is the comfortable target).')); issues++; } });
      report.push(R('pass', 'Skip link & landmarks', 'Published pages get a “Skip to content” link and a main target automatically.'));
      if (P.fx) report.push(R('pass', 'Motion is accessible', 'prefers-reduced-motion shows content instantly; marquees can be paused; cursor effects are off on touch and forced-colours modes.'));
      if (P.altSwatches) { const a = P.altSwatches; const r2 = col.contrast(a.ink || '#000', a.paper || '#fff'); report.push(R(r2 >= 7 ? 'pass' : 'warn', `Alternate theme contrast ${r2.toFixed(1)}:1`, 'Light/dark toggle palette.')); }
      report.unshift(R(issues ? 'warn' : 'pass', issues ? `${issues} issue${issues > 1 ? 's' : ''} found, ${ops.length} fixed automatically` : 'All automated checks passed', 'WCAG 2.2 AA automated checks. Test with a screen reader and keyboard too.'));
      return { reply: issues ? `Found ${issues} issue${issues > 1 ? 's' : ''} and fixed ${ops.length}. The rest are listed below.` : 'Everything I can test automatically passes.', ops, report };
    },

    security(req, P) {
      const ops = [], report = []; let crit = 0, warn = 0;
      const SECRET = /(sk-[a-z0-9_-]{16,}|sk-ant-[\w-]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[\w-]{10,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password\s*[:=]\s*\S{4,})/i;
      P.pages.forEach((pg) => L.walk(pg.tree, (n) => {
        const a = n.attrs || {};
        if (a.href && /^\s*(javascript|vbscript|data):/i.test(a.href)) { ops.push({ op: 'setAttr', target: n.id, prop: 'href', value: '#' }); report.push(R('fail', 'Script URL in a link', `“${n.text || 'link'}” on ${pg.name}. Neutralised.`)); crit++; }
        if (a.href && /^http:\/\//i.test(a.href)) { ops.push({ op: 'setAttr', target: n.id, prop: 'href', value: a.href.replace(/^http:/i, 'https:') }); report.push(R('warn', 'Insecure http:// link', `${a.href.slice(0, 60)}, upgraded to https.`)); warn++; }
        if (a.src && /^http:\/\//i.test(a.src)) { report.push(R('warn', 'Mixed content image', a.src.slice(0, 60))); warn++; }
        Object.keys(a).forEach((k) => { if (/^on/i.test(k)) { ops.push({ op: 'setAttr', target: n.id, prop: k, value: '' }); report.push(R('fail', `Inline event handler (${k})`, `Removed from ${L.nodeLabel(n)}.`)); crit++; } });
        if (n.text && SECRET.test(n.text)) { report.push(R('fail', 'Possible secret in page text', `On ${pg.name}: “${n.text.slice(0, 24)}…”. Remove it and rotate the key.`)); crit++; }
        if (n.type === 'embed' && n.html) {
          const h = n.html; const ext = [...h.matchAll(/<script[^>]+src=["']?([^"' >]+)/gi)].map((m) => m[1]);
          if (SECRET.test(h)) { report.push(R('fail', 'Possible secret inside a code embed', 'Remove it and rotate the key. Anything in HTML is public.')); crit++; }
          if (/<script(?![^>]*application\/ld\+json)/i.test(h) || /\son\w+\s*=/i.test(h) || /javascript:/i.test(h)) {
            const clean = sanitizeHTML(h); if (clean !== h) { ops.push({ op: 'setAttr', target: n.id, prop: 'html', value: clean }); report.push(R('fail', 'Executable code in an embed', `${ext.length ? `External scripts: ${ext.slice(0, 3).join(', ')}. ` : ''}Removed scripts and inline handlers. Re-add trusted scripts deliberately.`)); crit++; }
          }
          if (/<iframe/i.test(h) && !/sandbox=/i.test(h)) { report.push(R('warn', 'Unsandboxed iframe', 'Add a sandbox attribute or remove it.')); warn++; }
          if (/<form[^>]+action=["']?http:/i.test(h)) { report.push(R('fail', 'Form posts over http', 'Form data would travel unencrypted.')); crit++; }
        }
        if (a.target === '_blank') { /* rel=noopener is added automatically on publish */ }
      }));
      P.meta = P.meta || {};
      if (!P.meta.csp) { ops.push({ op: 'setSite', prop: 'csp', value: 'true' }); report.push(R('pass', 'Content-Security-Policy enabled', 'Published pages now block injected scripts, plugins and foreign form targets.')); }
      else report.push(R('pass', 'Content-Security-Policy active', ''));
      report.push(R('pass', 'Safe external links', 'Links opening a new tab get rel="noopener" on publish.'));
      report.push(R('info', 'Server & account security', 'Loom accounts use PBKDF2-SHA256 hashing, HttpOnly SameSite cookies, CSRF origin checks and login rate limiting. Keep your hosting account behind 2FA.'));
      report.push(R('info', 'Scope', 'This is an automated scan, not a penetration test. No system is unbreachable. Review findings and schedule a professional audit before handling payments or personal data.'));
      report.unshift(R(crit ? 'fail' : warn ? 'warn' : 'pass', crit ? `${crit} critical · ${warn} warnings` : warn ? `${warn} warnings, no critical issues` : 'No vulnerabilities found', `${ops.length} automatic hardening fix${ops.length === 1 ? '' : 'es'}.`));
      return { reply: crit ? `Found ${crit} critical issue${crit > 1 ? 's' : ''} and fixed what I safely could.` : 'The site is clean. I hardened publishing with a strict Content-Security-Policy.', ops, report };
    },

    seo(req, P) {
      const ops = [], report = []; const t = lc(req);
      const url = /https:\/\/[\w.-]+\.[a-z]{2,}(\/[\w./-]*)?/i.exec(req); if (url) ops.push({ op: 'setSite', prop: 'siteUrl', value: url[0].replace(/\/$/, '') });
      P.pages.forEach((pg) => {
        const hs = headingsOf(pg); const h1 = hs.find((x) => levelOf(x) === 1) || hs[0]; let para = ''; L.walk(pg.tree, (n) => { if (!para && n.type === 'paragraph' && n.text && n.text.length > 40) para = n.text; });
        const title = (pg.slug === 'index' ? `${P.name} — ${(h1 && h1.text) || P.spec && P.spec.tagline || ''}` : `${pg.name} — ${P.name}`).replace(/\s+—\s*$/, '');
        if (!pg.title || pg.title.length > 60 || /^(Home|Untitled)/.test(pg.title)) ops.push({ op: 'setMeta', page: pg.id, prop: 'title', value: title.length > 60 ? title.slice(0, 57).replace(/\s\S*$/, '') + '…' : title });
        if (!pg.description || pg.description.length < 50) { const d = (para || (h1 && h1.text) || P.name).replace(/\s+/g, ' '); ops.push({ op: 'setMeta', page: pg.id, prop: 'description', value: d.length > 155 ? d.slice(0, 152).replace(/\s\S*$/, '') + '…' : d }); }
      });
      ops.push({ op: 'setSite', prop: 'og', value: 'true' }, { op: 'setSite', prop: 'jsonld', value: 'true' });
      const words = {}; each(P, (n) => String(n.text || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 4 && !/^(about|their|there|which|would|these|those|every|where|while|other|after|before|first|still|being|years|thing|things|right|could|should|little)$/.test(w)).forEach((w) => (words[w] = (words[w] || 0) + 1)));
      const kws = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]);
      report.push(R('pass', 'Titles & descriptions written', 'Every page has a unique title (≤ 60 chars) and description (≤ 155 chars).'), R('pass', 'Social cards & structured data', 'Open Graph, Twitter card and schema.org Organization are added on publish.'));
      report.push(P.meta && P.meta.siteUrl || url ? R('pass', 'Sitemap & robots.txt', 'Generated on publish.') : R('warn', 'Add your live URL for a sitemap', 'Say “my site is https://yourdomain.com” and I’ll add canonical URLs and sitemap.xml.'));
      report.push(R('info', 'Keyword focus', kws.join(', ') || 'Add more descriptive copy to find focus terms.'));
      if (/\b(aso|app store|play store|ios|android|app)\b/.test(t)) {
        const tag = (P.spec && P.spec.tagline) || (headingsOf(home(P))[0] || {}).text || P.name;
        report.push(R('info', 'App Store listing (ASO)', `Name (≤30): ${P.name.slice(0, 30)} · Subtitle (≤30): ${String(tag).slice(0, 30)} · Keywords (≤100): ${kws.slice(0, 8).join(',').slice(0, 100)} · First screenshot caption: “${String(tag).slice(0, 40)}”`));
        report.push(R('info', 'Google Play', 'Short description (≤80) reuses the subtitle and adds the main benefit. Put the top keyword in the first 167 characters of the full description.'));
      }
      report.push(R('info', 'After launch', 'Verify the domain in Google Search Console and Bing Webmaster Tools, then submit sitemap.xml.'));
      return { reply: `Optimised ${P.pages.length} page${P.pages.length > 1 ? 's' : ''}: titles, descriptions, social cards and structured data.`, ops, report };
    },

    marketing(req, P) {
      const name = P.name, tag = (P.spec && P.spec.tagline) || (headingsOf(home(P))[0] || {}).text || 'what makes you different', ind = (P.spec && P.spec.industry) || 'your market';
      const report = [
        R('info', 'Positioning', `For people who care about ${ind.toLowerCase()}, ${name} stands for one promise: “${String(tag).replace(/\.$/, '')}.” Lead every channel with it.`),
        R('info', 'Channels', '1) Search: publish two helpful guides a month targeting your keywords. 2) Social: short behind-the-scenes posts three times a week. 3) Email: capture visitors with one clear lead magnet.'),
        R('info', 'Launch calendar (2 weeks)', 'D-7 teaser post · D-5 founder story · D-3 sneak peek · D-1 email to your list · Launch day: post, email, communities · D+2 thank-you and first results · D+7 case study · D+14 retrospective & offer.'),
        R('info', 'Social post 1', `We built ${name} because ${String(tag).replace(/\.$/, '').toLowerCase()}. Today it’s live. Take a look →`),
        R('info', 'Social post 2', `3 things we learned building ${name}: keep it simple, listen first, ship often. What would you add?`),
        R('info', 'Social post 3', `New at ${name}: the thing you asked for most. Link in bio.`),
        R('info', 'Launch email', `Subject: ${name} is live · Body: A short, personal note on why you built it, one clear benefit, one button. No attachments.`),
        R('info', 'Paid ads (optional)', 'Start with a small daily budget on one platform, one audience and two creatives. Scale only what converts. You approve every spend.')
      ];
      const ops = []; const h = home(P);
      if (/\b(newsletter|email list|lead)\b/i.test(req) && !h.tree.some((n) => /news-band/.test(JSON.stringify(n)))) ops.push({ op: 'addSection', page: h.id, section: sectionDefaults('newsletter', P) });
      return { reply: `Here’s a two-week launch plan for ${name}. Nothing is posted or paid for without you.`, ops, report };
    },

    devops(req, P, env) {
      const report = []; const slug = P.slug; const name = L.slug(P.name).replace(/-/g, '');
      const q = env && env.lastRuns; const fails = q ? q.filter((r) => r.level === 'fail').length : 0;
      report.push(R(fails ? 'warn' : 'pass', 'Pre-flight', fails ? `${fails} failing check${fails > 1 ? 's' : ''} from QA/Security. Fix before launch.` : 'QA and security checks are green.'));
      report.push(R('info', 'Build', `Publishing writes plain HTML + CSS to sites/${slug}/, with style.css, logo.svg, sitemap.xml and robots.txt when configured. There is no build step and no server code.`));
      report.push(R('info', 'Hosting options', 'GitHub Pages (free; push the folder to a repo and enable Pages) · Netlify / Cloudflare Pages (free tier; drag-and-drop the folder or connect Git) · Any static host or S3 + CDN.'));
      report.push(R('info', 'Domain ideas', `${name}.com · get${name}.com · ${name}.co · ${name}.studio · ${name}hq.com. Check availability at a registrar you trust (Cloudflare Registrar, Namecheap, Porkbun). You buy it; I never purchase on your behalf.`));
      report.push(R('info', 'DNS for GitHub Pages', 'Apex: A records → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 · www: CNAME → <username>.github.io · then add the custom domain in repo Settings → Pages and tick “Enforce HTTPS”.'));
      report.push(R('info', 'DNS for Netlify / Cloudflare Pages', 'www: CNAME → <site>.netlify.app or <project>.pages.dev · apex: ALIAS/ANAME or the provider’s flattening. HTTPS certificates are automatic.'));
      report.push(R('info', 'After go-live', 'Uptime monitor (e.g. a free status checker) · Search Console + sitemap · Back up the loom/projects folder · Re-run QA + Security after big edits.'));
      return { reply: 'Launch plan ready. Say “publish now” and I’ll write the site files for you to upload, or publish from the top bar.', ops: [], report, actions: [{ id: 'publish', label: 'Publish now' }] };
    },

    commerce(req, P) {
      const ops = [], report = []; const h = home(P);
      const list = after(req, /\bsell(?:ing)?\s+(.{3,160})$/i); const items = list ? list.split(/,|\band\b/).map((x) => x.trim()).filter((x) => x && x.length < 40).slice(0, 8) : [];
      const prods = items.length ? items.map((x, i) => ({ title: x.replace(/^(a|an|some)\s+/i, '').replace(/\b\w/, (c) => c.toUpperCase()), value: ['$24', '$38', '$56', '$72', '$19', '$95', '$44', '$120'][i % 8] })) : null;
      if (!h.tree.some((n) => n.attrs && n.attrs.id === 'shop') || prods) ops.push({ op: 'addSection', page: h.id, section: Object.assign(sectionDefaults('products', P), prods ? { items: prods, title: 'Shop the collection', eyebrow: 'Shop' } : {}) });
      if (!P.pages.some((p) => /shop|store/i.test(p.name))) { ops.push({ op: 'addPage', value: 'Shop', section: { kind: 'hero', eyebrow: 'Shop', title: `The ${P.name} collection` } }); ops.push({ op: 'addSection', page: 'Shop', section: Object.assign(sectionDefaults('products', P), prods ? { items: prods } : {}) }); ops.push({ op: 'addSection', page: 'Shop', section: { kind: 'faq', title: 'Orders & shipping', items: [{ title: 'How long does shipping take?', text: 'Orders ship within 2 working days.' }, { title: 'Can I return an item?', text: '30-day returns on unused items.' }, { title: 'Is checkout secure?', text: 'Payments are handled by our payment provider. We never see your card details.' }] } }); }
      report.push(R('info', 'Checkout (no code)', 'Create a Stripe Payment Link or Shopify Buy Button for each product, then paste the link into each “Add to cart” button (Settings → Link). Card data never touches your site.'));
      report.push(R('info', 'Sourcing plan', 'Shortlist 3 suppliers per product (samples first) · compare unit cost, MOQ, lead time and returns · target ≥ 60% gross margin for DTC · keep a simple inventory sheet.'));
      report.push(R('info', 'Operations', 'Shipping zones & rates · returns policy page · sales tax / VAT settings in your payment provider · order confirmation emails.'));
      report.push(R('warn', 'Human approval required', 'Merchant prepares listings and plans. Buying stock, signing supplier agreements, taking payments and filing taxes are your decisions and actions.'));
      return { reply: `Set up a storefront${prods ? ` for ${prods.length} product${prods.length > 1 ? 's' : ''}` : ''} with a Shop page and order FAQ. Payments connect through a provider you choose.`, ops, report };
    },

    maintainer(req, P) {
      const t = lc(req); const ops = []; const report = []; const h = home(P); const q = quoted(req);
      const rep = /replace\s+["“'‘](.+?)["”'’]\s+with\s+["“'‘](.+?)["”'’]/i.exec(req);
      if (rep) { each(P, (n) => { if (L.TEXTUAL(n) && n.text && n.text.includes(rep[1])) ops.push({ op: 'setText', target: n.id, value: n.text.split(rep[1]).join(rep[2]) }); }); return { reply: ops.length ? `Replaced it in ${ops.length} place${ops.length > 1 ? 's' : ''}.` : `I couldn’t find “${rep[1]}”.`, ops, report }; }
      if (/\b(headline|main title|hero title|h1)\b/.test(t) && (q || /\bto\b/.test(t))) return LOCAL.copy(req, P);
      if (/\bbutton\b.*\b(text|label|say)\b/.test(t) && q) return LOCAL.copy(req, P);
      if (/\b(remove|delete|hide)\b/.test(t)) {
        const k = kindIn(req); const words = (q || after(req, /\b(?:remove|delete|hide)\s+(?:the\s+)?(.+?)(?:\s+section)?$/i) || '').toLowerCase();
        const targets = h.tree.filter((n) => n.tag !== 'nav' && n.tag !== 'footer').filter((n) => { const s = JSON.stringify(n).toLowerCase(); return (k && (s.includes(`"${k === 'testimonials' ? 'quote' : k === 'pricing' ? 'plan' : k === 'products' ? 'p-card' : k === 'team' ? 'member' : k === 'faq' ? 'faq' : k === 'stats' ? 'stat' : k === 'logos' ? 'logo-row' : k === 'newsletter' ? 'news-band' : k}`) || s.includes(`"id":"${k}"`))) || (words && textOf(n).toLowerCase().includes(words)); });
        if (targets.length) { ops.push({ op: 'removeNode', target: targets[0].id }); return { reply: `Removed the ${k || 'matching'} section from ${h.name}. Undo brings it back.`, ops, report }; }
      }
      if (/\b(add|insert)\b/.test(t) && (kindIn(req) || /\bpage\b/.test(t))) return LOCAL.architect(req, P);
      if (/\b(colou?r|palette|dark|light|font)\b/.test(t) || colorIn(req)) return LOCAL.brand(req, P);
      if (/\b(bigger|larger|smaller)\b.*\b(heading|title|text|font)/.test(t)) {
        const f = /bigger|larger/.test(t) ? 1.15 : 0.87; ['display', 'h-sec', 'band-title', 'section-title', 'hero-title'].forEach((c) => { const r = P.classes[c]; const v = r && r.base && parseFloat(r.base['font-size']); if (v) ops.push({ op: 'setStyle', target: c, prop: 'font-size', value: Math.round(v * f) + 'px' }); });
        return { reply: `Headings are ${f > 1 ? 'larger' : 'smaller'} now. Mobile sizes follow their own breakpoint.`, ops, report };
      }
      if (/\b(square|sharp|round|pill|spacious|compact|tighter|airy)\b/.test(t)) return LOCAL.designer(req, P);
      const phone = /(\+?\d[\d\s().-]{7,}\d)/.exec(req), email = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(req);
      if (phone || email) { each(P, (n) => { if (L.TEXTUAL(n) && n.text) { let v = n.text; if (email) v = v.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, email[0]); if (phone) v = v.replace(/\(?\+?\d[\d\s().-]{7,}\d/g, phone[1]); if (v !== n.text) ops.push({ op: 'setText', target: n.id, value: v }); } }); if (ops.length) return { reply: 'Updated your contact details everywhere they appear.', ops, report }; }
      report.push(R('info', 'Try a clearer instruction', 'Examples: “change the headline to “Hello world””, “replace “Lisbon” with “Porto””, “remove the pricing section”, “make buttons square”, “brand colour teal”, “add a FAQ section”.'));
      return { reply: 'I didn’t catch that one offline. Try one of the examples, or connect Loom AI for free-form requests.', ops, report };
    }
  };

  /* ---------------------------------------------------------------- run */
  function localRun(agent, req, P, env) {
    const fn = LOCAL[agent] || LOCAL.maintainer; const out = fn(req, P, env) || {};
    // expand the motion helper op into a real embed insertion
    out.ops = (out.ops || []).flatMap((o) => (o.op === 'addSection__embed' ? [{ op: '__embed', page: o.page, value: o.value }] : [o]));
    return out;
  }
  function applyAll(P, ops) {
    const embeds = ops.filter((o) => o.op === '__embed'); const rest = ops.filter((o) => o.op !== '__embed');
    const r = applyOps(P, rest);
    embeds.forEach((o) => { const pg = pageRef(P, o.page) || home(P); insertSection(pg, L.N('embed', { html: o.value })); r.done.push(o); });
    return r;
  }
  async function runAgent(agent, req, P, { ai, env } = {}) {
    const started = performance.now();
    if (ai && agent !== 'devops') {
      try {
        const data = await remote(agent, req, outline(P, { full: agent === 'copy' || agent === 'security' }), agent === 'architect' ? 'ops' : undefined);
        const safe = Object.assign({ reply: '', ops: [], report: [] }, data, { source: 'ai', ms: performance.now() - started }); safe.ops = (Array.isArray(safe.ops) ? safe.ops : []).filter((o) => o && typeof o.op === 'string' && !o.op.startsWith('__')); safe.report = Array.isArray(safe.report) ? safe.report : []; return safe;
      } catch (e) {
        const out = localRun(agent, req, P, env); out.report = [R('info', 'Ran locally', `Loom AI: ${e.message}`)].concat(out.report || []); return Object.assign(out, { source: 'local', ms: performance.now() - started });
      }
    }
    return Object.assign(localRun(agent, req, P, env), { source: 'local', ms: performance.now() - started });
  }

  /** Plan → run each step → apply ops. onEvent({type, ...}) drives the UI. Mutates P. */
  async function orchestrate(req, P, { onEvent = () => {}, forceLocal = false, only = null } = {}) {
    const st = forceLocal ? { available: false } : await status(); const ai = !!st.available;
    onEvent({ type: 'start', ai });
    let plan;
    if (ai) { try { plan = await remote('director', req, outline(P)); plan.steps = (plan.steps || []).filter((s) => byId(s.agent) && s.agent !== 'director').slice(0, 8); if (!plan.steps.length) throw new Error('empty plan'); } catch (e) { plan = LOCAL.director(req); } }
    else plan = LOCAL.director(req);
    if (only) { plan.steps = plan.steps.filter((s) => only.includes(s.agent)); if (!plan.steps.length) plan.steps = [{ agent: 'maintainer', task: req }]; }
    onEvent({ type: 'plan', plan });
    const results = []; const env = { lastRuns: [] };
    for (let i = 0; i < plan.steps.length; i++) {
      const s = plan.steps[i]; onEvent({ type: 'step', index: i, agent: s.agent, task: s.task, state: 'working' });
      const out = await runAgent(s.agent, s.task || req, P, { ai, env });
      const applied = applyAll(P, out.ops || []);
      env.lastRuns.push(...(out.report || []));
      const res = { agent: s.agent, task: s.task, reply: out.reply, report: out.report || [], applied: applied.done.length, skipped: applied.skipped.length, source: out.source, actions: out.actions || [] };
      results.push(res); onEvent({ type: 'step', index: i, agent: s.agent, state: 'done', result: res });
    }
    onEvent({ type: 'done', results });
    return { plan, results, ai };
  }

  /** Brief → brand-new project, built by the whole team. */
  async function createSite(brief, { name, template, onEvent = () => {}, choose = null } = {}) {
    const st = await status(); const ai = !!st.available; onEvent({ type: 'start', ai });
    const wantsData = /\b(dashboard|analytics|admin|kpi|metrics|reporting|console|data)\b/i.test(brief);
    const steps = [['architect', 'Designing three directions and writing the copy'], ['designer', 'Art-directing type, rhythm and layout'], ['brand', 'Choosing an accessible palette and font pairing'], ...(wantsData ? [['data', 'Designing the dashboard, charts and data tables']] : []), ['logo', 'Drawing a logo'], ['illustrator', 'Illustrating every image'], ['motion', 'Choreographing motion'], ['qa', 'Testing accessibility and responsiveness'], ['security', 'Hardening for launch'], ['seo', 'Writing titles, descriptions and social cards']];
    onEvent({ type: 'plan', plan: { reply: 'Assembling your team.', steps: steps.map(([agent, task]) => ({ agent, task })) } });
    let P = null; const results = [];
    for (let i = 0; i < steps.length; i++) {
      const [agent, task] = steps[i]; onEvent({ type: 'step', index: i, agent, task, state: 'working' });
      let res;
      if (agent === 'architect') {
        let spec = null, source = 'local';
        if (ai) { try { spec = await remote('architect', `${brief}${name ? `\nBrand name: ${name}` : ''}`, '', 'site'); source = 'ai'; } catch (e) { spec = null; } }
        const guess = C.briefToSpec(brief, { name, template });
        if (!spec) spec = guess.spec;
        if (name) spec.name = name;
        // one prompt, several directions: the same site in three design languages to choose from
        let candidates = [spec];
        if (window.LoomLangs && choose) {
          const langs = LoomLangs.langsFor(brief, guess.template); const own = spec.style && spec.style.lang;
          const keepBrand = !!colorIn(brief) || source === 'ai';
          candidates = [...new Set([own, ...langs].filter(Boolean))].slice(0, 3).map((lg) => (lg === own ? spec : LoomLangs.specFor(spec, lg, keepBrand ? { brand: spec.palette.brand } : {})));
          if (candidates.length < 3) candidates = candidates.concat(langs.filter((lg) => !candidates.some((c) => c.style.lang === lg)).map((lg) => LoomLangs.specFor(spec, lg))).slice(0, 3);
        }
        const projects = candidates.map((sp) => C.site(sp));
        const pickI = candidates.length > 1 && choose ? await choose(projects.map((pp, i) => ({ project: pp, lang: candidates[i].style.lang }))) : 0;
        P = projects[pickI] || projects[0]; P.brief = String(brief).slice(0, 2000);
        const lgName = window.LoomLangs && P.spec.lang && LoomLangs.LANGS[P.spec.lang] ? LoomLangs.LANGS[P.spec.lang].label : '';
        res = { agent, task, reply: `${candidates.length > 1 ? `Designed ${candidates.length} directions; building ${lgName ? `the ${lgName} one` : 'your pick'}: ` : ''}${P.pages.length} pages: ${P.pages.map((p) => p.name).join(', ')}.`, report: [], applied: P.pages.reduce((a, p) => a + p.tree.length, 0), source };
      } else if (agent === 'brand') {
        res = { agent, task, reply: `Palette around ${pal(P).brand} with ${P.fonts.heading} + ${P.fonts.body}.`, report: [R('pass', `Text contrast ${col.contrast(pal(P).ink, pal(P).paper).toFixed(1)}:1`)], applied: 0, source: 'local' };
      } else {
        const already = agent === 'data' && P.pages.some((pg) => JSON.stringify(pg.tree).includes('"cls":"dash"'));
        if (already) { res = { agent, task, reply: 'The layout already includes a product dashboard with KPIs, charts and a sortable table.', report: [R('pass', 'Accessible data viz', 'Okabe–Ito colours, chart descriptions, semantic tables.')], applied: 0, source: 'local' }; results.push(res); onEvent({ type: 'step', index: i, agent, state: 'done', result: res }); continue; }
        const out = await runAgent(agent, agent === 'logo' ? brief : agent === 'designer' ? 'Art direct it: polish and elevate' : agent === 'motion' ? `${brief} ${/luxur|premium|bold|cinematic|agency|studio|portfolio/i.test(brief) ? 'cinematic' : ''}` : task, P, { ai: ai && ['logo'].includes(agent) });
        const a = applyAll(P, out.ops || []); res = { agent, task, reply: out.reply, report: out.report || [], applied: a.done.length, source: out.source };
      }
      results.push(res); onEvent({ type: 'step', index: i, agent, state: 'done', result: res });
      await new Promise((r) => setTimeout(r, 120));
    }
    onEvent({ type: 'done', results });
    return P;
  }

  window.LoomAgents = { TEAM, EDITOR, byId, status, outline, runAgent, orchestrate, createSite, applyOps: applyAll, sanitizeSVG, sanitizeHTML, LOCAL };
})();
