/* LOOM — core
   Data model, element library, layout presets, CSS/HTML generation and storage.
   Shared by the dashboard (loom/index.html) and the editor (loom/editor.html).

   Project = { id, name, slug, created, updated, fonts:{body,heading}, swatches:[{id,name,value}],
               classes:{ name: { base:{prop:val}, 'base:hover':{}, tablet:{}, landscape:{}, portrait:{} } },
               pages:[{ id, name, slug, title, tree:[Node] }] }
   Node    = { id, type, tag?, cls?, text?, html?, attrs:{}, children:[] }
   Class names starting with "@" are tag selectors (e.g. "@body").                                    */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- basics */
  const FX_BASE = (document.currentScript && document.currentScript.src) || location.href; // loom/ folder, for fx/loom-fx.js
  const BPS = [
    { id: 'base', label: 'Desktop', hint: 'Base breakpoint — styles cascade down to smaller screens', canvas: null, media: null },
    { id: 'tablet', label: 'Tablet', hint: '991px and down', canvas: 768, media: '(max-width: 991px)' },
    { id: 'landscape', label: 'Mobile landscape', hint: '767px and down', canvas: 568, media: '(max-width: 767px)' },
    { id: 'portrait', label: 'Mobile portrait', hint: '478px and down', canvas: 360, media: '(max-width: 478px)' }
  ];
  const STATES = [{ id: '', label: 'None' }, { id: 'hover', label: 'Hover' }, { id: 'focus', label: 'Focused' }];
  const uid = (p = 'n') => p + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-4);
  const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('page-' + [...String(s || 'x')].reduce((h, c) => ((h * 31 + c.codePointAt(0)) >>> 0), 7).toString(36).slice(0, 6));
  /** Unique page slugs within a project: only the first page is 'index', no duplicates. */
  function uniqueSlugs(pages) { const seen = new Set(); pages.forEach((pg, i) => { let s = i === 0 ? 'index' : (pg.slug && pg.slug !== 'index' ? pg.slug : slug(pg.name)); if (i > 0 && s === 'index') s = 'home-2'; let k = s, n = 2; while (seen.has(k)) k = `${s}-${n++}`; pg.slug = k; seen.add(k); }); return pages; }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#E8ECF3"/><path d="M300 330l90-110 70 80 50-55 90 85z" fill="#C3CBD9"/><circle cx="520" cy="180" r="36" fill="#C3CBD9"/></svg>');

  /* ---------------------------------------------------------------- elements */
  const EL = {
    section:   { label: 'Section', group: 'Structure', tag: 'section', kids: true, cls: 'section', tags: ['section', 'header', 'footer', 'main', 'article', 'aside', 'nav', 'div'] },
    container: { label: 'Container', group: 'Structure', tag: 'div', kids: true, cls: 'container' },
    div:       { label: 'Div Block', group: 'Structure', tag: 'div', kids: true, tags: ['div', 'header', 'footer', 'nav', 'main', 'article', 'aside', 'section', 'figure'] },
    grid:      { label: 'Grid', group: 'Layout', tag: 'div', kids: true, cls: 'grid', make: () => [N('div', { cls: 'cell' }), N('div', { cls: 'cell' })] },
    flex:      { label: 'Flex Box', group: 'Layout', tag: 'div', kids: true, cls: 'flex' },
    columns:   { label: 'Columns', group: 'Layout', tag: 'div', kids: true, cls: 'columns', make: () => [N('div', { cls: 'column' }), N('div', { cls: 'column' })] },
    heading:   { label: 'Heading', group: 'Typography', tag: 'h2', text: 'Heading', textual: true, tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    paragraph: { label: 'Paragraph', group: 'Typography', tag: 'p', text: 'Write something meaningful here. Short sentences, real outcomes, one idea at a time.', textual: true },
    text:      { label: 'Text Block', group: 'Typography', tag: 'div', text: 'This is some text inside of a div block.', textual: true },
    link:      { label: 'Text Link', group: 'Typography', tag: 'a', text: 'Text link', textual: true, attrs: { href: '#' } },
    list:      { label: 'List', group: 'Typography', tag: 'ul', kids: true, tags: ['ul', 'ol'], make: () => [N('listitem'), N('listitem'), N('listitem')] },
    listitem:  { label: 'List Item', group: 'Typography', tag: 'li', text: 'List item', textual: true, hidden: true },
    button:    { label: 'Button', group: 'Basic', tag: 'a', text: 'Button', textual: true, attrs: { href: '#' }, cls: 'button' },
    image:     { label: 'Image', group: 'Media', tag: 'img', void: true, attrs: { src: PLACEHOLDER_IMG, alt: '' } },
    video:     { label: 'Video', group: 'Media', tag: 'video', void: false, media: true, attrs: { src: '', controls: 'controls', playsinline: 'playsinline' }, cls: 'video' },
    divider:   { label: 'Divider', group: 'Basic', tag: 'hr', void: true, cls: 'divider' },
    embed:     { label: 'Code Embed', group: 'Advanced', tag: 'div', embed: true, html: '<!-- Paste any HTML here -->' }
  };
  const TEXTUAL = (n) => !!(EL[n.type] && EL[n.type].textual);
  const HAS_KIDS = (n) => !!(EL[n.type] && EL[n.type].kids);

  /** Build a node. opts: { cls, text, tag, attrs, html } */
  function N(type, opts = {}, children) {
    const d = EL[type] || EL.div;
    const n = { id: uid(), type, attrs: Object.assign({}, d.attrs || {}, opts.attrs || {}), children: [] };
    if (opts.tag && opts.tag !== d.tag) n.tag = opts.tag;
    const cls = opts.cls !== undefined ? opts.cls : d.cls; if (cls) n.cls = cls;
    if (d.textual) n.text = opts.text !== undefined ? opts.text : d.text;
    if (d.embed) n.html = opts.html !== undefined ? opts.html : d.html;
    if (d.kids) n.children = children || (d.make ? d.make() : []);
    return n;
  }

  /* Built-in classes created on first use (like Webflow's element presets) */
  const PRESETS = {
    '@body': { base: { 'font-family': 'var(--font-body)', 'color': 'var(--sw-ink)', 'background-color': 'var(--sw-paper)', 'font-size': '16px', 'line-height': '1.55' } },
    section: { base: { 'padding-top': '96px', 'padding-bottom': '96px', 'padding-left': '24px', 'padding-right': '24px' }, landscape: { 'padding-top': '64px', 'padding-bottom': '64px' } },
    container: { base: { 'width': '100%', 'max-width': '1140px', 'margin-left': 'auto', 'margin-right': 'auto' } },
    grid: { base: { 'display': 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'column-gap': '24px', 'row-gap': '24px' }, landscape: { 'grid-template-columns': '1fr' } },
    cell: { base: { 'min-height': '80px' } },
    flex: { base: { 'display': 'flex', 'align-items': 'center', 'column-gap': '16px', 'row-gap': '16px' } },
    columns: { base: { 'display': 'flex', 'column-gap': '32px', 'row-gap': '32px' }, landscape: { 'flex-direction': 'column' } },
    column: { base: { 'flex': '1 1 0', 'min-width': '0' } },
    button: { base: { 'display': 'inline-block', 'padding-top': '14px', 'padding-bottom': '14px', 'padding-left': '26px', 'padding-right': '26px', 'background-color': 'var(--sw-brand)', 'color': 'var(--sw-paper)', 'border-radius': '999px', 'font-weight': '600', 'text-decoration': 'none', 'transition': 'opacity .2s' }, 'base:hover': { 'opacity': '0.85' } },
    divider: { base: { 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'var(--sw-line)', 'border-bottom-width': '0', 'border-left-width': '0', 'border-right-width': '0', 'margin-top': '32px', 'margin-bottom': '32px' } },
    video: { base: { 'width': '100%', 'display': 'block' } }
  };
  function ensureClass(p, name) {
    if (!name) return;
    if (!p.classes[name]) p.classes[name] = clone(PRESETS[name] || { base: {} });
  }
  function ensureTreeClasses(p, nodes) { walk(nodes, (n) => ensureClass(p, n.cls)); }

  /* ---------------------------------------------------------------- tree utils */
  function walk(nodes, fn, parent = null) { (nodes || []).forEach((n, i) => { fn(n, parent, i, nodes); walk(n.children, fn, n); }); }
  function find(nodes, id, parent = null) {
    for (let i = 0; i < (nodes || []).length; i++) {
      const n = nodes[i];
      if (n.id === id) return { node: n, list: nodes, index: i, parent };
      const r = find(n.children, id, n); if (r) return r;
    }
    return null;
  }
  function path(nodes, id) { const out = []; const rec = (list) => { for (const n of list || []) { out.push(n); if (n.id === id || rec(n.children)) return true; out.pop(); } return false; }; rec(nodes); return out; }
  function reId(n) { n.id = uid(); (n.children || []).forEach(reId); return n; }
  function contains(n, id) { return n.id === id || (n.children || []).some((c) => contains(c, id)); }
  function usage(p, cls) { let c = 0; p.pages.forEach((pg) => walk(pg.tree, (n) => { if (n.cls === cls) c++; })); return c; }
  function nodeLabel(n) { return n.cls ? n.cls : (EL[n.type] ? EL[n.type].label : n.type); }

  /* ---------------------------------------------------------------- layout presets */
  const LAYOUTS = [
    { id: 'navbar', label: 'Navbar', desc: 'Logo + links', build: () => N('section', { tag: 'nav', cls: 'navbar' }, [N('container', { cls: 'navbar-inner' }, [N('link', { text: 'Brand', cls: 'brand' }), N('flex', { cls: 'nav-links' }, [N('link', { text: 'Work', cls: 'nav-link' }), N('link', { text: 'About', cls: 'nav-link' }), N('link', { text: 'Contact', cls: 'nav-link' })])])]),
      classes: { navbar: { base: { 'padding-top': '20px', 'padding-bottom': '20px', 'padding-left': '24px', 'padding-right': '24px' } }, 'navbar-inner': { base: { 'display': 'flex', 'justify-content': 'space-between', 'align-items': 'center' } }, brand: { base: { 'font-family': 'var(--font-heading)', 'font-weight': '700', 'font-size': '20px', 'text-decoration': 'none' } }, 'nav-links': { base: { 'column-gap': '28px' } }, 'nav-link': { base: { 'text-decoration': 'none', 'font-weight': '500' }, 'base:hover': { 'color': 'var(--sw-brand)' } } } },
    { id: 'hero', label: 'Hero', desc: 'Big headline + CTA', build: () => N('section', { cls: 'hero' }, [N('container', {}, [N('text', { text: 'Product designer · Available now', cls: 'eyebrow' }), N('heading', { tag: 'h1', text: 'I make complex technology feel effortless.', cls: 'hero-title' }), N('paragraph', { text: 'Research, strategy, UX/UI and AI prototyping — under one roof.', cls: 'lead' }), N('flex', { cls: 'actions' }, [N('button', { text: 'See the work' }), N('button', { text: 'Contact', cls: 'button-ghost' })])])]),
      classes: { hero: { base: { 'padding-top': '140px', 'padding-bottom': '120px', 'padding-left': '24px', 'padding-right': '24px' } }, eyebrow: { base: { 'text-transform': 'uppercase', 'letter-spacing': '0.12em', 'font-size': '12px', 'font-weight': '600', 'color': 'var(--sw-muted)', 'margin-bottom': '20px' } }, 'hero-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '76px', 'line-height': '1', 'letter-spacing': '-0.04em', 'font-weight': '700', 'max-width': '14ch', 'margin-bottom': '24px' }, tablet: { 'font-size': '56px' }, portrait: { 'font-size': '40px' } }, lead: { base: { 'font-size': '20px', 'color': 'var(--sw-muted)', 'max-width': '52ch', 'margin-bottom': '36px' } }, actions: { base: { 'flex-wrap': 'wrap' } }, 'button-ghost': { base: { 'display': 'inline-block', 'padding-top': '13px', 'padding-bottom': '13px', 'padding-left': '25px', 'padding-right': '25px', 'border-top-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '1px', 'border-right-width': '1px', 'border-top-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-right-style': 'solid', 'border-top-color': 'var(--sw-line)', 'border-bottom-color': 'var(--sw-line)', 'border-left-color': 'var(--sw-line)', 'border-right-color': 'var(--sw-line)', 'border-radius': '999px', 'font-weight': '600', 'text-decoration': 'none' }, 'base:hover': { 'border-top-color': 'var(--sw-brand)', 'border-bottom-color': 'var(--sw-brand)', 'border-left-color': 'var(--sw-brand)', 'border-right-color': 'var(--sw-brand)' } } } },
    { id: 'features', label: '3 Cards', desc: 'Grid of feature cards', build: () => N('section', {}, [N('container', {}, [N('heading', { text: 'What I do', cls: 'section-title' }), N('grid', { cls: 'cards' }, [1, 2, 3].map((i) => N('div', { cls: 'card' }, [N('heading', { tag: 'h3', text: ['Strategy', 'Design', 'Build'][i - 1], cls: 'card-title' }), N('paragraph', { text: 'A short, outcome-focused description of this service.', cls: 'card-text' })])))])]),
      classes: { 'section-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '44px', 'letter-spacing': '-0.03em', 'margin-bottom': '40px' }, landscape: { 'font-size': '32px' } }, cards: { base: { 'display': 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'column-gap': '24px', 'row-gap': '24px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' }, landscape: { 'grid-template-columns': '1fr' } }, card: { base: { 'padding-top': '32px', 'padding-bottom': '32px', 'padding-left': '28px', 'padding-right': '28px', 'border-radius': '20px', 'background-color': 'var(--sw-soft)' } }, 'card-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '24px', 'margin-bottom': '10px' } }, 'card-text': { base: { 'color': 'var(--sw-muted)' } } } },
    { id: 'split', label: 'Image + Text', desc: 'Two columns', build: () => N('section', {}, [N('container', {}, [N('columns', { cls: 'split' }, [N('div', { cls: 'column' }, [N('image', { cls: 'split-image' })]), N('div', { cls: 'column split-copy' }, [N('heading', { text: 'Tell the story', cls: 'section-title' }), N('paragraph', { text: 'Explain the problem, the approach and the result in a few calm sentences.' }), N('link', { text: 'Read more →', cls: 'more-link' })])])])]),
      classes: { split: { base: { 'align-items': 'center' } }, 'split-image': { base: { 'width': '100%', 'border-radius': '20px' } }, 'split-copy': { base: {} }, 'more-link': { base: { 'color': 'var(--sw-brand)', 'font-weight': '600', 'text-decoration': 'none' } } } },
    { id: 'stats', label: 'Stats', desc: '4 numbers', build: () => N('section', {}, [N('container', {}, [N('grid', { cls: 'stats' }, [['10+', 'Years'], ['1M+', 'Users'], ['−45%', 'Errors'], ['+25%', 'Conversion']].map(([v, l]) => N('div', { cls: 'stat' }, [N('heading', { tag: 'h3', text: v, cls: 'stat-value' }), N('text', { text: l, cls: 'stat-label' })])))])]),
      classes: { stats: { base: { 'display': 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'column-gap': '24px', 'row-gap': '32px' }, landscape: { 'grid-template-columns': 'repeat(2, 1fr)' } }, stat: { base: {} }, 'stat-value': { base: { 'font-family': 'var(--font-heading)', 'font-size': '56px', 'letter-spacing': '-0.04em', 'line-height': '1', 'margin-bottom': '8px' } }, 'stat-label': { base: { 'color': 'var(--sw-muted)' } } } },
    { id: 'cta', label: 'CTA Band', desc: 'Centered call to action', build: () => N('section', { cls: 'cta' }, [N('container', { cls: 'cta-inner' }, [N('heading', { text: 'Let’s make it simple.', cls: 'cta-title' }), N('paragraph', { text: 'Got a product that feels harder than it should? Let’s talk.', cls: 'lead' }), N('button', { text: 'Get in touch' })])]),
      classes: { cta: { base: { 'background-color': 'var(--sw-ink)', 'color': 'var(--sw-paper)', 'padding-top': '120px', 'padding-bottom': '120px', 'padding-left': '24px', 'padding-right': '24px' } }, 'cta-inner': { base: { 'text-align': 'center', 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center' } }, 'cta-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '64px', 'letter-spacing': '-0.04em', 'margin-bottom': '16px' }, landscape: { 'font-size': '40px' } } } },
    { id: 'footer', label: 'Footer', desc: 'Copyright + links', build: () => N('section', { tag: 'footer', cls: 'footer' }, [N('container', { cls: 'footer-inner' }, [N('text', { text: '© 2026 Your Name' }), N('flex', { cls: 'nav-links' }, [N('link', { text: 'LinkedIn', cls: 'nav-link' }), N('link', { text: 'Dribbble', cls: 'nav-link' }), N('link', { text: 'Email', cls: 'nav-link' })])])]),
      classes: { footer: { base: { 'padding-top': '40px', 'padding-bottom': '40px', 'padding-left': '24px', 'padding-right': '24px', 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'var(--sw-line)', 'color': 'var(--sw-muted)', 'font-size': '14px' } }, 'footer-inner': { base: { 'display': 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'flex-wrap': 'wrap', 'row-gap': '12px' } } } }
  ];
  /** Merge rule sets per breakpoint/state key (b wins). */
  function mergeClass(a = {}, b = {}) { const out = clone(a); Object.entries(b).forEach(([k, r]) => (out[k] = Object.assign({}, out[k] || {}, r))); return out; }
  function addLayout(p, id) {
    const Lo = LAYOUTS.find((l) => l.id === id); if (!Lo) return null;
    const n = Lo.build();
    // An element given a custom class keeps its element preset (e.g. a Flex Box keeps display:flex)
    walk([n], (x) => {
      const def = EL[x.type] && EL[x.type].cls;
      if (x.cls && !p.classes[x.cls]) p.classes[x.cls] = def && def !== x.cls ? mergeClass(PRESETS[def], (Lo.classes || {})[x.cls]) : clone((Lo.classes || {})[x.cls] || PRESETS[x.cls] || { base: {} });
    });
    ensureTreeClasses(p, [n]); return n;
  }

  /* ---------------------------------------------------------------- CSS generation */
  const selOf = (name) => (name.startsWith('@') ? name.slice(1) : '.' + name.replace(/[^\w-]/g, ''));
  const RESET = `*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;min-height:100vh}
img,video{max-width:100%;height:auto;display:block}h1,h2,h3,h4,h5,h6{margin:0 0 .4em;line-height:1.1}p{margin:0 0 1em}ul,ol{margin:0 0 1em;padding-left:1.3em}
a{color:inherit}button,input,select,textarea{font:inherit}`;
  function fontsUsed(p) {
    const set = new Set([p.fonts.body, p.fonts.heading, p.fonts.accent].filter(Boolean));
    Object.values(p.classes).forEach((c) => Object.values(c).forEach((r) => { const f = r['font-family']; if (f && !/^var\(|inherit|system-ui|serif|sans-serif|monospace/.test(f)) set.add(f.replace(/["']/g, '').split(',')[0].trim()); }));
    return [...set].filter((f) => !/^(system-ui|Arial|Helvetica|Georgia|Times New Roman)$/i.test(f));
  }
  function fontsLink(p) {
    const f = fontsUsed(p); if (!f.length) return '';
    return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.map((x) => `family=${encodeURIComponent(x).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&')}&display=swap">`;
  }
  /* Loom FX stylesheet: pre-reveal states apply only under html.fx (set by loom-fx.js), so the
     editor canvas, thumbnails and no-JS visitors always see the finished page. */
  const FX_CSS = `
:root{--fx-ease:cubic-bezier(.16,1,.3,1);--fx-ease-io:cubic-bezier(.76,0,.24,1)}
html{scroll-padding-top:96px}
em{font-family:var(--font-accent,var(--font-heading));font-style:italic;font-weight:400;letter-spacing:-.01em;color:var(--sw-brand)}
:focus-visible{outline:2px solid var(--sw-brand);outline-offset:3px;border-radius:2px}
.loom-skip{position:fixed;left:16px;top:-80px;z-index:10000;padding:12px 18px;border-radius:10px;background:var(--sw-ink);color:var(--sw-paper);font-weight:600;text-decoration:none;transition:top .2s}
.loom-skip:focus{top:16px}
.fx-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.fx-w{display:inline-block;overflow:hidden;vertical-align:top;padding:.08em .02em .12em;margin:-.08em -.02em -.12em}
.fx-wi{display:inline-block}
html.fx [data-fx~="split"] .fx-wi{transform:translate3d(0,112%,0) rotate(4deg);transform-origin:0 100%}
html.fx [data-fx~="split"].fx-in .fx-wi{transform:none;transition:transform 1.15s var(--fx-ease) calc(var(--i) * 45ms)}
html.fx [data-fx~="reveal"]{opacity:0;transform:translate3d(0,44px,0)}
html.fx [data-fx~="reveal"].fx-in{opacity:1;transform:none;transition:opacity 1s var(--fx-ease),transform 1.2s var(--fx-ease)}
html.fx [data-fx~="stagger"]>*{opacity:0;transform:translate3d(0,40px,0)}
html.fx [data-fx~="stagger"].fx-in>*{opacity:1;transform:none;transition:opacity .9s var(--fx-ease) calc(var(--i) * 90ms),transform 1.1s var(--fx-ease) calc(var(--i) * 90ms)}
html.fx [data-fx~="scrub"] .fx-wi{opacity:.16;transition:opacity .35s,color .35s}
html.fx [data-fx~="scrub"] .fx-wi.is-lit{opacity:1}
html.fx [data-fx~="scrub"] em .fx-wi.is-lit{color:var(--sw-brand)}
[data-fx~="marquee"]{overflow:hidden;display:flex}
.fx-track{display:flex;width:max-content;animation:fx-marq var(--dur,30s) linear infinite}
.fx-track.fx-rev{animation-direction:reverse}
.fx-group{display:flex;flex:none}
[data-fx~="marquee"]:hover .fx-track,html.fx-paused .fx-track{animation-play-state:paused}
@keyframes fx-marq{to{transform:translate3d(-50%,0,0)}}
[data-fx~="tilt"]{transition:transform .6s var(--fx-ease);transform-style:preserve-3d;will-change:transform}
[data-fx~="tilt"]:hover{transition:transform .15s linear}
[data-fx~="magnetic"]{transition:transform .5s var(--fx-ease)}
[data-fx~="parallax"]{will-change:transform}
[data-fx~="expand"]{will-change:clip-path}
[data-fx~="tilt-scroll"]{transform-origin:50% 0;will-change:transform}
[data-fx~="spotlight"]{position:relative;isolation:isolate}
[data-fx~="spotlight"]::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--sw-brand) 22%,transparent),transparent 62%)}
[data-fx~="spotlight"]:hover::after{opacity:1}
.fx-shimmer{background:linear-gradient(100deg,currentColor 40%,color-mix(in srgb,currentColor 35%,var(--sw-brand)) 50%,currentColor 60%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fx-shimmer 4.5s linear infinite}
@keyframes fx-shimmer{to{background-position:-150% 0}}
.fx-hs{position:relative}
.fx-hs-sticky{position:sticky;top:0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.fx-hs-track{display:flex!important;flex-wrap:nowrap!important;width:max-content;will-change:transform}
.fx-hs-track>*{width:min(620px,80vw);flex:none}
html.fx [data-fx~="chart"] .fx-draw{stroke-dasharray:var(--len,1200);stroke-dashoffset:var(--len,1200)}
html.fx [data-fx~="chart"].fx-drawn .fx-draw{stroke-dashoffset:0;transition:stroke-dashoffset 2.2s var(--fx-ease)}
html.fx [data-fx~="chart"] .fx-bar{transform:scaleY(0);transform-origin:50% 100%;transform-box:fill-box}
html.fx [data-fx~="chart"].fx-drawn .fx-bar{transform:none;transition:transform 1.2s var(--fx-ease) calc(var(--i,0) * 60ms)}
.fx-sort{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.fx-sort::after{content:"↕";opacity:.4;font-size:.85em}
th[aria-sort="ascending"] .fx-sort::after{content:"↑";opacity:1}
th[aria-sort="descending"] .fx-sort::after{content:"↓";opacity:1}
.fx-sort:focus-visible{outline:2px solid var(--sw-brand);outline-offset:2px}
.fx-progress{position:fixed;left:0;top:0;z-index:9990;height:2px;width:100%;background:var(--sw-brand);transform:scaleX(0);transform-origin:0 50%;pointer-events:none}
nav.fx-scrolled,section.fx-scrolled{box-shadow:0 1px 0 var(--sw-line);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px)}
nav,section[class*="nav"]{transition:transform .6s var(--fx-ease),background-color .4s,box-shadow .4s}
.fx-hidden{transform:translate3d(0,-110%,0)}
.fx-grain{position:fixed;inset:-50%;z-index:9980;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:fx-grain 1s steps(6) infinite}
@keyframes fx-grain{0%{transform:translate(0,0)}33%{transform:translate(-4%,3%)}66%{transform:translate(3%,-5%)}100%{transform:translate(0,0)}}
.fx-has-cursor,.fx-has-cursor a,.fx-has-cursor button{cursor:none}
.fx-cursor{position:fixed;inset:0;z-index:9999;pointer-events:none}
.fx-cursor i{position:absolute;left:0;top:0;border-radius:50%}
.fx-cursor__dot{width:6px;height:6px;margin:-3px 0 0 -3px;background:var(--sw-brand)}
.fx-cursor__ring{width:40px;height:40px;margin:-20px 0 0 -20px;border:1px solid color-mix(in srgb,var(--sw-ink) 40%,transparent);display:grid;place-items:center;transition:width .45s var(--fx-ease),height .45s var(--fx-ease),margin .45s var(--fx-ease),background-color .3s,border-color .3s}
.fx-cursor__ring span{font:600 11px/1 var(--font-body);letter-spacing:.06em;text-transform:uppercase;color:var(--sw-paper);opacity:0;transition:opacity .2s}
.fx-cursor.is-link .fx-cursor__ring{width:64px;height:64px;margin:-32px 0 0 -32px;border-color:var(--sw-brand)}
.fx-cursor.is-view .fx-cursor__ring{width:96px;height:96px;margin:-48px 0 0 -48px;background:var(--sw-brand);border-color:var(--sw-brand)}
.fx-cursor.is-view .fx-cursor__ring span{opacity:1}
.fx-cursor.is-view .fx-cursor__dot{opacity:0}
.fx-theme{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1px solid var(--sw-line);background:transparent;color:var(--sw-ink);cursor:pointer;flex:none}
.fx-theme svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}
.fx-theme:hover{border-color:var(--sw-ink)}
.fx-pause{display:block;margin:14px auto 0;padding:8px 16px;border-radius:999px;border:1px solid var(--sw-line);background:transparent;color:var(--sw-muted);font:500 13px var(--font-body);cursor:pointer}
html.fx-hold body{opacity:0}
.fx-curtain{position:fixed;inset:0;z-index:10001;display:grid;place-items:center;background:var(--sw-brand);color:var(--sw-paper);transition:transform 1.05s var(--fx-ease-io)}
.fx-curtain__name{font:700 clamp(44px,10vw,180px)/.9 var(--font-heading);letter-spacing:-.055em;overflow:hidden}
.fx-curtain__count{position:absolute;right:clamp(16px,4vw,56px);bottom:clamp(16px,4vw,48px);font:500 clamp(14px,1.3vw,18px) var(--font-body);font-variant-numeric:tabular-nums;opacity:.7}
.fx-curtain__count::after{content:"%"}
.fx-curtain__bar{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--sw-paper);transform:scaleX(0);transform-origin:0 50%}
.fx-curtain.is-page{background:var(--sw-ink);color:var(--sw-paper);transform:translate3d(0,100%,0)}
.fx-curtain.is-page.is-in,.fx-curtain.is-page.is-cover{transform:none}
.fx-curtain.is-page .fx-curtain__name{font-size:clamp(28px,5vw,72px)}
.fx-curtain.is-out{transform:translate3d(0,-100%,0)!important}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}.fx-track{animation:none;flex-wrap:wrap}.fx-grain{display:none}}
@media (forced-colors:active){.fx-cursor,.fx-grain{display:none}}
`;
  function cssFor(p) {
    const vars = [`--font-body:"${p.fonts.body}",system-ui,sans-serif`, `--font-heading:"${p.fonts.heading}",system-ui,sans-serif`, ...(p.fonts.accent ? [`--font-accent:"${p.fonts.accent}",Georgia,serif`] : []), ...p.swatches.map((s) => `--sw-${s.id}:${s.value}`)];
    let out = `${RESET}\n:root{${vars.join(';')}}\n`;
    // alternate theme (light ⇄ dark), switched by the fx theme toggle
    if (p.altSwatches && Object.keys(p.altSwatches).length) out += `:root[data-theme="alt"]{${Object.entries(p.altSwatches).map(([k, v]) => `--sw-${k}:${v}`).join(';')}}\nhtml{transition:background-color .5s}body{transition:background-color .5s,color .5s}\n`;
    if (p.fx) out += FX_CSS;
    const rule = (sel, r) => { const body = Object.entries(r || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}:${v}`).join(';'); return body ? `${sel}{${body}}\n` : ''; };
    BPS.forEach((bp) => {
      let chunk = '';
      Object.entries(p.classes).forEach(([name, c]) => {
        const s = selOf(name);
        chunk += rule(s, c[bp.id]);
        STATES.slice(1).forEach((st) => (chunk += rule(`${s}:${st.id}`, c[`${bp.id}:${st.id}`])));
      });
      out += bp.media ? (chunk ? `@media ${bp.media}{\n${chunk}}\n` : '') : chunk;
    });
    return out;
  }

  /* ---------------------------------------------------------------- HTML generation */
  const ATTR_ORDER = ['id', 'href', 'target', 'rel', 'src', 'alt', 'title', 'poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline'];
  function nodeHTML(n, ed, pages) {
    const d = EL[n.type] || EL.div;
    const tag = n.tag || d.tag;
    const cls = [n.cls, ed && HAS_KIDS(n) && !(n.children || []).length ? 'loom-empty' : ''].filter(Boolean).join(' ');
    const a = Object.assign({}, n.attrs || {});
    if (a.href && a.href.startsWith('page:')) { const pg = (pages || []).find((x) => x.id === a.href.slice(5)); a.href = pg ? `${pg.slug === 'index' ? 'index' : pg.slug}.html` : '#'; }
    if (a.target === '_blank') a.rel = 'noopener';
    if (ed && tag === 'a') a['data-href'] = a.href, (a.href = '#');
    const attrs = ATTR_ORDER.concat(Object.keys(a).filter((k) => !ATTR_ORDER.includes(k))).filter((k) => a[k] !== undefined && a[k] !== '' && a[k] !== false)
      .map((k) => (a[k] === true || a[k] === k ? ` ${k}` : ` ${k}="${esc(a[k])}"`)).join('');
    const open = `<${tag}${cls ? ` class="${esc(cls)}"` : ''}${attrs}${ed ? ` data-lid="${n.id}"` : ''}`;
    if (d.void) return `${open}>`;
    let inner = '';
    if (d.textual) inner = esc(n.text || '').replace(/\*([^*\n]{1,120})\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
    else if (d.embed) inner = ed ? `<div class="loom-embed">${n.html || ''}</div>` : (n.html || '');
    else inner = (n.children || []).map((c) => nodeHTML(c, ed, pages)).join('');
    return `${open}>${inner}</${tag}>`;
  }
  const treeHTML = (nodes, ed, pages) => (nodes || []).map((n) => nodeHTML(n, ed, pages)).join('\n');
  function fxSite(p) { const f = p.fx || {}; return ['preloader', 'transition', 'cursor', 'grain', 'progress', 'theme', 'nav'].filter((k) => f[k] && (k !== 'theme' || p.altSwatches)).join(' '); }
  function pageDoc(p, page, { editor = false, cssHref = null, extraHead = '', fxSrc = null } = {}) {
    const tree = editor ? page.tree : page.tree.map((n, i, all) => (i === all.findIndex((x) => x.tag !== 'nav' && !/(^|\s)(nav|banner)(\s|$)/.test(x.cls || '')) && !(n.attrs || {}).id ? Object.assign({}, n, { attrs: Object.assign({}, n.attrs, { id: 'main' }) }) : n));
    const mainId = editor ? '' : ((tree.find((n) => n.tag !== 'nav' && !/(^|\s)(nav|banner)(\s|$)/.test(n.cls || '')) || {}).attrs || {}).id;
    return `<!doctype html>
<html lang="${esc((p.meta && p.meta.lang) || 'en')}"${!editor && p.fx && fxSite(p) ? ` data-fx-site="${fxSite(p)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title || `${page.name} — ${p.name}`)}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}">` : ''}
<meta name="generator" content="Loom">
${fontsLink(p)}
${cssHref ? `<link rel="stylesheet" href="${cssHref}">` : `<style id="loom-css">${cssFor(p)}</style>`}
${editor ? '' : headMeta(p, page)}
${!editor && p.fx && fxSrc ? `<script src="${fxSrc}"></script>` : ''}
${extraHead}
</head>
<body${editor && !page.tree.length ? ' class="loom-empty-body"' : ''}>
${!editor && mainId ? `<a class="loom-skip" href="#${esc(mainId)}">Skip to content</a>\n` : ''}${treeHTML(tree, editor, p.pages)}
</body>
</html>`;
  }

  /** Published-only head tags set by the SEO and Security agents (p.meta). */
  function headMeta(p, page) {
    const m = p.meta || {}; const out = [];
    const base = m.siteUrl ? String(m.siteUrl).replace(/\/+$/, '') + '/' : '';
    const file = page.slug === 'index' ? '' : `${page.slug}.html`;
    if (p.logo) out.push(`<link rel="icon" href="logo.svg" type="image/svg+xml">`);
    const paper = (p.swatches.find((x) => x.id === 'paper') || {}).value; if (paper) out.push(`<meta name="theme-color" content="${esc(paper)}">`);
    if (m.csp) out.push(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https:; upgrade-insecure-requests">`, '<meta name="referrer" content="strict-origin-when-cross-origin">');
    if (m.og) {
      const t = page.title || `${page.name} — ${p.name}`;
      out.push(`<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(p.name)}"><meta property="og:title" content="${esc(t)}">`);
      if (page.description) out.push(`<meta property="og:description" content="${esc(page.description)}">`);
      if (base) out.push(`<meta property="og:url" content="${esc(base + file)}"><link rel="canonical" href="${esc(base + file)}">`);
      out.push('<meta name="twitter:card" content="summary">');
    }
    if (m.jsonld && page.slug === 'index') out.push(`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': m.jsonldType || 'Organization', name: p.name, url: base || undefined, description: page.description || undefined }).replace(/</g, '\\u003c')}</script>`);
    return out.join('\n');
  }
  function sitemap(p) {
    const base = String((p.meta && p.meta.siteUrl) || '').replace(/\/+$/, ''); if (!base) return null;
    const day = new Date(p.updated || Date.now()).toISOString().slice(0, 10);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${p.pages.map((pg) => `  <url><loc>${esc(base + '/' + (pg.slug === 'index' ? '' : pg.slug + '.html'))}</loc><lastmod>${day}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  }

  /* ---------------------------------------------------------------- projects & templates */
  const DEFAULT_SWATCHES = [
    { id: 'brand', name: 'Brand', value: '#3B6CFF' }, { id: 'ink', name: 'Ink', value: '#0F172A' }, { id: 'paper', name: 'Paper', value: '#FFFFFF' },
    { id: 'muted', name: 'Muted', value: '#5B6475' }, { id: 'soft', name: 'Soft', value: '#F2F4F8' }, { id: 'line', name: 'Line', value: '#E2E6EE' }
  ];
  function blankProject(name = 'Untitled project') {
    const p = { id: 'p-' + slug(name).slice(0, 24) + '-' + Math.random().toString(36).slice(2, 6), name, created: Date.now(), updated: Date.now(),
      fonts: { body: 'Inter', heading: 'Inter Tight' }, swatches: clone(DEFAULT_SWATCHES), classes: {}, pages: [{ id: uid('pg'), name: 'Home', slug: 'index', title: '', tree: [] }] };
    p.slug = slug(name);
    ensureClass(p, '@body');
    return p;
  }
  function starterProject(name) {
    const p = blankProject(name);
    p.pages[0].tree = ['navbar', 'hero', 'stats', 'features', 'split', 'cta', 'footer'].map((id) => addLayout(p, id));
    p.pages.push({ id: uid('pg'), name: 'About', slug: 'about', title: '', tree: ['navbar', 'split', 'footer'].map((id) => addLayout(p, id)) });
    return p;
  }
  /** Build a Loom project from the coded portfolio's content.js + tokens.css. */
  async function portfolioProject(name = 'Mutaher Portfolio (Loom)') {
    const C = await loadPortfolioContent();
    const tok = await fetch('../tokens.css', { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
    const v = (k, light) => { const m = (light ? /:root\[data-theme="light"\]\s*\{([^}]*)\}/ : /:root\s*\{([^}]*)\}/).exec(tok); const x = m && new RegExp(`--${k}:\\s*([^;]+);`).exec(m[1]); return x ? x[1].trim() : null; };
    const p = blankProject(name);
    p.fonts = { body: 'Inter', heading: 'Inter Tight' };
    p.swatches = [
      { id: 'brand', name: 'Accent', value: v('accent') || '#7FCFA5' }, { id: 'ink', name: 'Text', value: v('text') || '#E9F1EC' }, { id: 'paper', name: 'Background', value: v('bg') || '#0B100E' },
      { id: 'muted', name: 'Muted', value: v('text-2') || '#A3B8AC' }, { id: 'soft', name: 'Surface', value: v('bg-2') || '#111916' }, { id: 'line', name: 'Line', value: '#26322D' }
    ];
    p.classes['@body'].base['background-color'] = 'var(--sw-paper)';
    const tree = [];
    const nav = addLayout(p, 'navbar'); nav.children[0].children[0].text = (C.site && C.site.shortName) || 'Mutaher'; tree.push(nav);
    const hero = addLayout(p, 'hero'); const hc = hero.children[0].children;
    hc[0].text = (C.hero && C.hero.eyebrow) || hc[0].text; hc[1].text = ((C.hero && C.hero.lines) || []).join(' ') || hc[1].text; hc[2].text = (C.hero && C.hero.sub) || hc[2].text;
    hc[3].children[1].text = 'View my CV'; hc[3].children[1].attrs.href = (C.site && C.site.cvUrl) || '#'; tree.push(hero);
    const stats = addLayout(p, 'stats'); stats.children[0].children[0].children = (C.stats || []).slice(0, 4).map((s) => N('div', { cls: 'stat' }, [N('heading', { tag: 'h3', text: `${s.prefix || ''}${s.value}${s.suffix || ''}`, cls: 'stat-value' }), N('text', { text: s.label, cls: 'stat-label' })])); tree.push(stats);
    const feat = addLayout(p, 'features'); feat.children[0].children[1].children = (C.pillars || []).map((x) => N('div', { cls: 'card' }, [N('heading', { tag: 'h3', text: x.title, cls: 'card-title' }), N('paragraph', { text: x.promise, cls: 'card-text' })])); tree.push(feat);
    // Work grid from projects
    p.classes['work-card'] = { base: { 'display': 'block', 'text-decoration': 'none', 'border-radius': '24px', 'overflow': 'hidden', 'background-color': 'var(--sw-soft)' }, 'base:hover': { 'opacity': '0.9' } };
    p.classes['work-image'] = { base: { 'width': '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover' } };
    p.classes['work-body'] = { base: { 'padding-top': '20px', 'padding-bottom': '24px', 'padding-left': '24px', 'padding-right': '24px' } };
    const work = N('section', {}, [N('container', {}, [N('heading', { text: 'Selected work', cls: 'section-title' }), N('grid', { cls: 'cards' },
      (C.projects || []).filter((x) => x.status !== 'draft' && !x.hidden && x.cover && x.cover.src).slice(0, 6).map((x) => N('div', { tag: 'a', cls: 'work-card', attrs: { href: `../../case.html?slug=${x.slug}` } }, [N('image', { cls: 'work-image', attrs: { src: '../../' + x.cover.src, alt: x.cover.alt || x.title } }), N('div', { cls: 'work-body' }, [N('heading', { tag: 'h3', text: x.title, cls: 'card-title' }), N('paragraph', { text: x.subtitle || '', cls: 'card-text' })])])))])]);
    work.children[0].children[1].children.forEach((c) => { c.tag = 'a'; });
    tree.push(work);
    const cta = addLayout(p, 'cta'); cta.children[0].children[0].text = `${(C.cta && C.cta.title) || 'Let’s make it'} ${(C.cta && C.cta.accent) || 'simple.'}`; cta.children[0].children[1].text = (C.cta && C.cta.text) || ''; cta.children[0].children[2].attrs.href = `mailto:${(C.site && C.site.email) || ''}`; tree.push(cta);
    p.classes.cta.base['background-color'] = 'var(--sw-soft)'; p.classes.cta.base.color = 'var(--sw-ink)';
    const foot = addLayout(p, 'footer'); foot.children[0].children[0].text = `© ${new Date().getFullYear()} ${(C.site && C.site.name) || ''}`;
    foot.children[0].children[1].children = ((C.site && C.site.socials) || []).map((s) => N('link', { text: s.label, cls: 'nav-link', attrs: { href: s.url, target: '_blank' } })); tree.push(foot);
    ensureTreeClasses(p, tree);
    p.pages[0].tree = tree;
    return p;
  }
  function loadPortfolioContent() {
    return new Promise((res) => {
      if (window.SITE_CONTENT) return res(window.SITE_CONTENT);
      const s = document.createElement('script'); s.src = '../content/content.js?t=' + Date.now();
      s.onload = () => res(window.SITE_CONTENT || {}); s.onerror = () => res({}); document.head.appendChild(s);
    });
  }

  /* ---------------------------------------------------------------- storage */
  // Projects belong to the signed-in user (set by LoomAuth.require()). Guests save in this browser only.
  let USER = null;
  const setUser = (u) => { USER = u; };
  const LS = () => 'loom-projects:' + (USER ? USER.id : 'anon');
  const localAll = () => { try { return JSON.parse(localStorage.getItem(LS()) || '{}'); } catch (e) { return {}; } };
  const localPut = (p) => { const all = localAll(); all[p.id] = p; try { localStorage.setItem(LS(), JSON.stringify(all)); return true; } catch (e) { console.warn('Local storage full', e); return false; } };
  const localDel = (id) => { const all = localAll(); delete all[id]; try { localStorage.setItem(LS(), JSON.stringify(all)); } catch (e) {} };
  const canRemote = async () => !!(USER && !USER.guest && window.MHSave && (await MHSave.server()));
  const summary = (p) => ({ id: p.id, name: p.name, slug: p.slug, owner: p.owner || null, updated: p.updated, pages: p.pages.length, published: p.published || null });
  async function remoteIndex() { try { const r = await fetch('projects/index.json?t=' + Date.now(), { cache: 'no-store' }); return r.ok ? await r.json() : []; } catch (e) { return []; } }
  async function remoteGet(id) { try { const r = await fetch(`projects/${id}.json?t=${Date.now()}`, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  async function list() {
    const map = new Map(); if (await canRemote()) (await remoteIndex()).filter((s) => s.owner === USER.id).forEach((s) => map.set(s.id, Object.assign({ remote: true }, s)));
    Object.values(localAll()).forEach((p) => { const cur = map.get(p.id); if (!cur || (p.updated || 0) > (cur.updated || 0)) map.set(p.id, Object.assign({ local: true, remote: !!cur }, summary(p))); });
    return [...map.values()].filter((s) => !s.deleted).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }
  async function load(id) {
    const local = localAll()[id], remote0 = (await canRemote()) ? await remoteGet(id) : null;
    const remote = remote0 && (!remote0.owner || remote0.owner === USER.id) ? remote0 : null;
    const p = !remote ? local : !local ? remote : (local.updated || 0) >= (remote.updated || 0) ? local : remote;
    return p ? migrate(p) : null;
  }
  function migrate(p) { p.fonts = p.fonts || { body: 'Inter', heading: 'Inter Tight' }; p.swatches = p.swatches || clone(DEFAULT_SWATCHES); p.classes = p.classes || {}; ensureClass(p, '@body'); p.slug = p.slug || slug(p.name); return p; }
  /** Save locally, and to the project folder when server.py (or folder access) is available. */
  async function save(p, { remote = true } = {}) {
    p.updated = Date.now(); if (USER && !p.owner) p.owner = USER.id; const stored = localPut(p);
    if (!remote || !(await canRemote())) return stored ? { ok: true, via: 'local' } : { ok: false, via: 'local', error: 'This browser’s storage is full. Export a backup (Projects → Export), remove large images or delete old projects.' };
    const r = await MHSave.save(`loom/projects/${p.id}.json`, JSON.stringify(p), { askFolder: false });
    if (!r.ok) return r;
    const idx = (await remoteIndex()).filter((s) => s.id !== p.id); idx.unshift(summary(p));
    await MHSave.save('loom/projects/index.json', JSON.stringify(idx, null, 1), { askFolder: false });
    return { ok: true, via: 'server' };
  }
  async function remove(id) {
    localDel(id);
    if (await canRemote()) {
      const idx = (await remoteIndex()).filter((s) => s.id !== id);
      await MHSave.save('loom/projects/index.json', JSON.stringify(idx, null, 1), { askFolder: false });
      await MHSave.save(`loom/projects/${id}.json`, JSON.stringify({ id, deleted: true }), { askFolder: false });
    }
  }
  /** Every file of the published site: pages, style.css, loom-fx.js, logo, sitemap, robots. */
  async function siteFiles(p, { absoluteAssets = false } = {}) {
    const root = new URL('../', FX_BASE).href; // the folder that holds loom/ and the portfolio assets
    const fix = (html) => (absoluteAssets ? html.replace(/(src|href|srcset)="\.\.\/\.\.\//g, `$1="${root}`) : html);
    const files = [{ path: 'style.css', data: fix(cssFor(p)) }];
    if (p.fx) { const js = await fetch(new URL('fx/loom-fx.js', FX_BASE).href, { cache: 'no-store' }).then((x) => (x.ok ? x.text() : '')).catch(() => ''); if (js) files.push({ path: 'loom-fx.js', data: js }); }
    p.pages.forEach((pg) => files.push({ path: `${pg.slug === 'index' ? 'index' : pg.slug}.html`, data: fix(pageDoc(p, pg, { cssHref: 'style.css', fxSrc: 'loom-fx.js' })) }));
    if (p.logo) files.push({ path: 'logo.svg', data: p.logo });
    const sm = sitemap(p); if (sm) files.push({ path: 'sitemap.xml', data: sm });
    if (p.meta && (p.meta.og || sm)) files.push({ path: 'robots.txt', data: `User-agent: *\nAllow: /\n${sm ? `Sitemap: ${String(p.meta.siteUrl).replace(/\/+$/, '')}/sitemap.xml\n` : ''}` });
    return files;
  }
  /* Minimal ZIP writer (stored, no compression): no dependencies, works offline. */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(); const parts = [], central = []; let offset = 0;
    const d = new Date(); const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.path), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name); offset += 30 + name.length + data.length;
    });
    const size = central.reduce((a, x) => a + x.length, 0);
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  /** Download the whole site as a ZIP (works everywhere, including guest mode on GitHub Pages). */
  async function exportZip(p) { const files = await siteFiles(p, { absoluteAssets: true }); download(zip(files), `${p.slug || 'site'}.zip`); return { ok: true, zip: true, files: files.length }; }
  /** Publish: with server.py, write sites/<slug>/; otherwise download the site ZIP. */
  async function publish(p) {
    uniqueSlugs(p.pages.slice().sort((a, b) => (a.slug === 'index' ? -1 : b.slug === 'index' ? 1 : 0)));
    if (!(await canRemote())) { const r = await exportZip(p); p.published = Date.now(); await save(p); return r; }
    const dir = `sites/${p.slug}`;
    for (const f of await siteFiles(p)) { const r = await MHSave.save(`${dir}/${f.path}`, f.data, { askFolder: false }); if (!r.ok) return r; }
    p.published = Date.now(); await save(p);
    return { ok: true, url: `../${dir}/index.html` };
  }
  /** Project backup files (.loom.json) for guests: browser storage can be cleared. */
  function exportProject(p) { download(new Blob([JSON.stringify({ loom: 1, exported: Date.now(), project: p })], { type: 'application/json' }), `${p.slug || 'project'}.loom.json`); }
  async function importProject(file) {
    if (file.size > 25 * 1024 * 1024) throw new Error('That file is larger than 25 MB.');
    let j; try { j = JSON.parse(await file.text()); } catch (e) { throw new Error('That isn’t a Loom project file.'); }
    const p = j && j.loom && j.project; if (!p || !Array.isArray(p.pages) || !p.classes) throw new Error('That isn’t a Loom project file.');
    p.id = 'p-' + slug(p.name || 'imported').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 6); delete p.owner; delete p.published;
    const m = migrate(p); const r = await save(m); if (!r.ok) throw new Error(r.error || 'Could not save the project.'); return m;
  }

  window.Loom = { setUser, mergeClass, BPS, STATES, EL, PRESETS, LAYOUTS, N, uid, slug, esc, clone, walk, find, path, reId, contains, usage, nodeLabel, TEXTUAL, HAS_KIDS,
    ensureClass, ensureTreeClasses, addLayout, cssFor, headMeta, sitemap, fxSite, FX_BASE, FX_CSS, fontsLink, fontsUsed, nodeHTML, treeHTML, pageDoc, blankProject, starterProject, portfolioProject,
    uniqueSlugs, list, load, save, remove, publish, exportZip, siteFiles, zip, exportProject, importProject, migrate, PLACEHOLDER_IMG };
})();
