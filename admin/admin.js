/* Portfolio CMS — vanilla JS, local-only.
   Edits window.SITE_CONTENT and writes ../content/content.js through the File System Access API
   (Chrome / Edge). Other browsers: download content.js and replace the file by hand. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const rel = (src) => (!src ? '' : /^(https?:|data:|blob:|\/)/.test(src) ? src : '../' + src);

  /* ------------------------------------------------------------ STATE */
  const DRAFT_KEY = 'mh-cms-draft';
  let C = clone(window.SITE_CONTENT || {});
  let view = { kind: 'section', id: 'site' };
  let dirty = false, dir = null, serverMode = false;
  const history = { stack: [JSON.stringify(C)], i: 0 };
  const blobUrls = new Map(); // path -> objectURL for images not yet written to disk
  const pendingFiles = new Map(); // path -> Blob (fallback mode)

  function toast(msg, err) { const t = $('.toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600); }
  function setStatus() {
    const s = $('[data-status]');
    s.className = dirty ? 'dirty' : dir ? 'ok' : '';
    if (serverMode) { s.textContent = dirty ? 'Unsaved changes — press Save' : 'Saving directly to your project (local server) — all changes saved'; document.title = (dirty ? '• ' : '') + 'Portfolio CMS — Mutaher'; return; }
    s.textContent = dir ? (dirty ? `Unsaved changes — ${dir.name}` : `Connected to “${dir.name}” — all changes saved`) : (dirty ? 'Unsaved draft (kept in this browser). Connect your folder to save.' : 'Not connected — changes are kept as a draft in this browser');
    document.title = (dirty ? '• ' : '') + 'Portfolio CMS — Mutaher';
  }

  let commitT, previewT;
  function changed() {
    dirty = true; setStatus();
    clearTimeout(commitT); commitT = setTimeout(commit, 350);
    clearTimeout(previewT); previewT = setTimeout(pushPreview, 700);
  }
  function commit() {
    const s = JSON.stringify(C);
    if (s === history.stack[history.i]) return;
    history.stack = history.stack.slice(0, history.i + 1); history.stack.push(s);
    if (history.stack.length > 80) history.stack.shift(); history.i = history.stack.length - 1;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), content: C })); } catch (e) {}
    validate(); renderSide();
  }
  function undo(step) {
    commit();
    const ni = history.i + step; if (ni < 0 || ni >= history.stack.length) return;
    history.i = ni; C = JSON.parse(history.stack[ni]); dirty = true; setStatus();
    if (view.kind === 'project' && !C.projects[view.index]) view = { kind: 'section', id: 'site' };
    renderSide(); renderEditor(); pushPreview(); validate();
  }

  /* ------------------------------------------------------------ SCHEMAS */
  const S = {
    site: { label: 'Site settings', desc: 'Name, contact details and links used across the site.', fields: [
      { k: 'name', l: 'Full name' }, { k: 'shortName', l: 'Short name' },
      { k: 'title', l: 'Job title' }, { k: 'tagline', l: 'Tagline' },
      { k: 'email', l: 'Email', t: 'email' }, { k: 'cvUrl', l: 'CV link', t: 'url' },
      { k: 'location', l: 'Location' }, { k: 'timezone', l: 'Timezone (IANA)', hint: 'e.g. Asia/Dhaka — drives the footer clock' },
      { k: 'availability', l: 'Availability chip', full: true },
      { k: 'paletteLab', l: 'Show palette lab (temporary colour tester on the site)', t: 'bool', def: true },
      { k: 'socials', l: 'Social links', t: 'list', full: true, title: (i) => i.label, item: [{ k: 'label', l: 'Label' }, { k: 'url', l: 'URL', t: 'url' }] }
    ] },
    hero: { label: 'Hero', desc: 'The cinematic first screen. Three lines assemble as visitors scroll; the last line is set in italic accent.', fields: [
      { k: 'eyebrow', l: 'Top label', full: true }, { k: 'lines', l: 'Headline lines (exactly 3 works best)', t: 'strings', full: true },
      { k: 'sub', l: 'Supporting line', t: 'textarea', full: true },
      { k: 'video', l: 'Cinematic video (optional)', t: 'file', accept: 'video/mp4', full: true, hint: 'Scroll-scrubbed film that replaces the particle scene, e.g. assets/video/untangled.mp4' },
      { k: 'videoMobile', l: 'Mobile video (optional)', t: 'file', accept: 'video/mp4', full: true, hint: 'Smaller 960px version for phones' }
    ] },
    stats: { label: 'Stats strip', desc: 'Animated numbers under the hero.', root: true, fields: [
      { k: '_', l: 'Stats', t: 'list', full: true, title: (i) => `${i.prefix || ''}${i.value}${i.suffix || ''} — ${i.label}`, item: [
        { k: 'value', l: 'Number', t: 'number' }, { k: 'label', l: 'Label' }, { k: 'prefix', l: 'Prefix', hint: 'e.g. − or +' }, { k: 'suffix', l: 'Suffix', hint: 'e.g. %, +, M+' }] }
    ] },
    marquee: { label: 'Capabilities marquee', desc: 'The scrolling ribbon of skills.', root: true, fields: [{ k: '_', l: 'Items', t: 'strings', full: true }] },
    mission: { label: 'Mission', desc: 'Scroll-lit manifesto. Highlight words (exactly as written, incl. punctuation) turn italic accent.', fields: [
      { k: 'eyebrow', l: 'Label', full: true }, { k: 'text', l: 'Manifesto', t: 'textarea', full: true }, { k: 'highlights', l: 'Highlighted words', t: 'strings', full: true }
    ] },
    pillars: { label: 'Three pillars', desc: 'Strategy · Design · Build cards.', root: true, fields: [
      { k: '_', l: 'Pillars', t: 'list', full: true, title: (i) => i.title, item: [
        { k: 'title', l: 'Title' }, { k: 'promise', l: 'Promise' }, { k: 'capabilities', l: 'Capabilities', t: 'strings', full: true }, { k: 'outcome', l: 'Outcome', full: true }] }
    ] },
    story: { label: 'Story', desc: 'Your journey — the horizontal timeline.', fields: [
      { k: 'title', l: 'Title', full: true }, { k: 'intro', l: 'Intro', t: 'textarea', full: true }, { k: 'values', l: 'Values line', t: 'textarea', full: true },
      { k: 'chapters', l: 'Chapters', t: 'list', full: true, title: (i) => `${i.year} — ${i.title}`, item: [
        { k: 'year', l: 'Year' }, { k: 'title', l: 'Title' }, { k: 'org', l: 'Organisation' }, { k: 'line', l: 'One-liner' }] }
    ] },
    services: { label: 'Services', desc: 'Your consulting offers.', root: true, fields: [
      { k: '_', l: 'Services', t: 'list', full: true, title: (i) => i.title, item: [
        { k: 'title', l: 'Title' }, { k: 'duration', l: 'Duration' }, { k: 'description', l: 'Description', t: 'textarea', full: true }, { k: 'bestFor', l: 'Best for', full: true }] }
    ] },
    work: { label: 'Selected work', desc: 'Case-study cards and the full project index. Edit, hide (eye) or reorder individual projects in the Projects list below — ★ puts a project in the big card stack.', virtual: true, fields: [] },
    toolbox: { label: 'Toolbox & certifications', desc: 'Two marquees near the end of the page.', virtual: true, fields: [
      { k: 'tools', l: 'Tools', t: 'strings', full: true, abs: true },
      { k: 'certifications', l: 'Certifications', t: 'list', full: true, abs: true, title: (i) => `${i.year} — ${i.title}`, item: [{ k: 'year', l: 'Year' }, { k: 'issuer', l: 'Issuer' }, { k: 'title', l: 'Title', full: true }] }
    ] },
    cta: { label: 'Final CTA', desc: '“Let’s make it simple.”', fields: [
      { k: 'title', l: 'Title' }, { k: 'accent', l: 'Accent word (italic)' }, { k: 'text', l: 'Text', t: 'textarea', full: true }
    ] }
  };

  const IMG_FIELDS = [{ k: '_img', l: 'Image', t: 'imageFlat', full: true }, { k: 'caption', l: 'Caption (optional)', full: true }];
  const BLOCKS = {
    text: { l: 'Text', d: 'Heading + rich paragraph', title: (b) => b.heading, fields: [{ k: 'heading', l: 'Heading', full: true }, { k: 'body', l: 'Body', t: 'rich', full: true }], make: () => ({ heading: 'New section', body: '<p>Write something great.</p>' }) },
    bullets: { l: 'Bullet list', d: 'Heading + points', title: (b) => b.heading, fields: [{ k: 'heading', l: 'Heading', full: true }, { k: 'items', l: 'Points', t: 'strings', full: true }], make: () => ({ heading: 'Key points', items: [] }) },
    'two-column': { l: 'Two columns', d: 'e.g. Problems | Solutions', title: (b) => `${b.left?.heading || ''} | ${b.right?.heading || ''}`, fields: [
      { k: 'left', l: 'Left column', t: 'group', full: true, fields: [{ k: 'heading', l: 'Heading', full: true }, { k: 'items', l: 'Points', t: 'strings', full: true }] },
      { k: 'right', l: 'Right column', t: 'group', full: true, fields: [{ k: 'heading', l: 'Heading', full: true }, { k: 'items', l: 'Points', t: 'strings', full: true }] }],
      make: () => ({ left: { heading: 'Problems', items: [] }, right: { heading: 'Solutions', items: [] } }) },
    image: { l: 'Image', d: 'Full-width or contained', title: (b) => b.caption || b.alt, fields: [{ k: 'heading', l: 'Heading (optional)', full: true }, ...IMG_FIELDS, { k: 'width', l: 'Width', t: 'select', options: ['full', 'contained'] }], make: () => ({ src: '', alt: '', caption: '', width: 'full' }) },
    gallery: { l: 'Gallery', d: 'Grid with lightbox', title: (b) => `${b.heading || 'Gallery'} · ${(b.images || []).length} images`, fields: [
      { k: 'heading', l: 'Heading (optional)' }, { k: 'columns', l: 'Columns', t: 'select', options: ['2', '3', '4', '5'] },
      { k: 'images', l: 'Images', t: 'list', full: true, multiUpload: true, title: (i) => i.alt || i.src, item: IMG_FIELDS }],
      make: () => ({ heading: '', columns: 3, images: [] }) },
    slider: { l: 'Slider', d: 'Swipeable carousel', title: (b) => `${b.heading || 'Slider'} · ${(b.images || []).length} slides`, fields: [
      { k: 'heading', l: 'Heading (optional)' }, { k: 'layout', l: 'Slide size', t: 'select', options: ['auto', 'wide'] },
      { k: 'images', l: 'Slides', t: 'list', full: true, multiUpload: true, title: (i) => i.caption || i.alt || i.src, item: IMG_FIELDS }],
      make: () => ({ heading: '', layout: 'auto', images: [] }) },
    'before-after': { l: 'Before / after', d: 'Drag to compare', title: (b) => b.heading, fields: [
      { k: 'heading', l: 'Heading (optional)', full: true },
      { k: 'before', l: 'Before', t: 'group', full: true, fields: [{ k: '_img', l: 'Image', t: 'imageFlat', full: true }, { k: 'label', l: 'Label' }] },
      { k: 'after', l: 'After', t: 'group', full: true, fields: [{ k: '_img', l: 'Image', t: 'imageFlat', full: true }, { k: 'label', l: 'Label' }] }],
      make: () => ({ heading: '', before: { src: '', alt: '', label: 'Before' }, after: { src: '', alt: '', label: 'After' } }) },
    metrics: { l: 'Metrics', d: 'Big result numbers', title: (b) => (b.items || []).map((m) => m.value).join(' · '), fields: [
      { k: 'heading', l: 'Heading (optional)', full: true },
      { k: 'items', l: 'Metrics', t: 'list', full: true, title: (i) => `${i.value} ${i.label}`, item: [{ k: 'value', l: 'Value', hint: 'e.g. −45%' }, { k: 'label', l: 'Label' }] }],
      make: () => ({ items: [{ value: '+0%', label: 'describe the result' }] }) },
    quote: { l: 'Quote', d: 'Pull quote / testimonial', title: (b) => b.text, fields: [{ k: 'text', l: 'Quote', t: 'textarea', full: true }, { k: 'author', l: 'Author / source', full: true }], make: () => ({ text: '', author: '' }) },
    process: { l: 'Process steps', d: 'Numbered cards', title: (b) => b.heading, fields: [
      { k: 'heading', l: 'Heading (optional)', full: true },
      { k: 'steps', l: 'Steps', t: 'list', full: true, title: (i) => i.title, item: [{ k: 'title', l: 'Title', full: true }, { k: 'body', l: 'Text', t: 'textarea', full: true }] }],
      make: () => ({ heading: 'Process', steps: [{ title: 'Empathize', body: '' }, { title: 'Define', body: '' }, { title: 'Ideate', body: '' }, { title: 'Design', body: '' }] }) },
    video: { l: 'Video', d: 'MP4 with controls', title: (b) => b.src, fields: [{ k: 'heading', l: 'Heading (optional)', full: true }, { k: 'src', l: 'Video path', t: 'file', accept: 'video/mp4,video/webm', full: true, hint: 'Upload or type a path like assets/work/slug/demo.mp4' }, { k: 'poster', l: 'Poster image path', full: true }, { k: 'caption', l: 'Caption', full: true }], make: () => ({ src: '', poster: '', caption: '' }) },
    embed: { l: 'Embed', d: 'Figma / prototype / YouTube', title: (b) => b.url, fields: [{ k: 'heading', l: 'Heading (optional)', full: true }, { k: 'url', l: 'https:// URL', t: 'url', full: true, hint: 'Figma file/prototype links are converted to embeds automatically' }, { k: 'ratio', l: 'Aspect ratio', t: 'select', options: ['16/9', '4/3', '1/1', '9/16'] }], make: () => ({ url: '', ratio: '16/9' }) },
    callout: { l: 'Callout', d: 'Highlighted note', title: (b) => b.text, fields: [{ k: 'text', l: 'Text', t: 'textarea', full: true }], make: () => ({ text: '' }) },
    divider: { l: 'Divider', d: 'Thin line', title: () => '—', fields: [], make: () => ({}) },
    team: { l: 'Team grid', d: 'Cards with glyph, name, role', title: (b) => `${b.heading || 'Team'} · ${(b.items || []).length}`, fields: [
      { k: 'heading', l: 'Heading', full: true }, { k: 'text', l: 'Intro', t: 'textarea', full: true },
      { k: 'items', l: 'Members', t: 'list', full: true, title: (i) => i.name, item: [{ k: 'glyph', l: 'Glyph' }, { k: 'color', l: 'Colour', hint: '#hex' }, { k: 'name', l: 'Name' }, { k: 'role', l: 'Role' }, { k: 'body', l: 'What they do', t: 'textarea', full: true }] }],
      make: () => ({ heading: 'The team', text: '', items: [] }) },
    demo: { l: 'AI demo', d: 'Typed prompt → agents → canvas', title: (b) => b.heading, fields: [
      { k: 'heading', l: 'Heading', full: true }, { k: 'text', l: 'Intro', t: 'textarea', full: true },
      { k: 'prompts', l: 'Requests', t: 'list', full: true, title: (i) => i.label || i.ask, item: [{ k: 'label', l: 'Chip label' }, { k: 'ask', l: 'Typed request', full: true }, { k: 'lines', l: 'Agent lines (Agent|text)', t: 'strings', full: true }] }],
      make: () => ({ heading: 'Say it. Weave it.', text: '', prompts: [] }) }
  };

  const PROJECT = [
    { card: 'Basics', fields: [
      { k: 'title', l: 'Title' }, { k: 'slug', l: 'URL slug', hint: 'case.html?slug=…', slug: true },
      { k: 'subtitle', l: 'Subtitle', full: true }, { k: 'summary', l: 'Card summary', t: 'textarea', full: true },
      { k: 'status', l: 'Status', t: 'select', options: ['published', 'draft', 'confidential', 'coming-soon'], hint: 'Drafts are hidden from the site' },
      { k: 'featured', l: 'Featured on home page', t: 'bool' },
      { k: 'category', l: 'Category', list: 'cats', hint: 'Used for the filter chips' }, { k: 'year', l: 'Year' },
      { k: 'role', l: 'Your role' }, { k: 'type', l: 'Project type / client' }, { k: 'duration', l: 'Duration' },
      { k: 'platforms', l: 'Platforms', t: 'strings' }, { k: 'tags', l: 'Tags', t: 'strings', full: true },
      { k: 'externalUrl', l: 'External link (optional)', t: 'url', full: true, hint: 'If set, cards link out instead of to a case page' }] },
    { card: 'Cover', fields: [
      { k: 'coverStyle', l: 'Cover style', t: 'select', options: ['image', 'generative'], hint: 'Generative = typographic cover for NDA work' },
      { k: 'accentOverride', l: 'Accent colour override', t: 'color', hint: 'Optional per-project accent on its case page' },
      { k: 'cover', l: 'Cover image', t: 'image', full: true }] },
    { card: 'Results', fields: [{ k: 'metrics', l: 'Headline metrics (1–3)', t: 'list', full: true, title: (i) => `${i.value} ${i.label}`, item: [{ k: 'value', l: 'Value' }, { k: 'label', l: 'Label' }] }] },
    { card: 'SEO', fields: [{ k: 'seo', l: '', t: 'group', full: true, fields: [{ k: 'title', l: 'Page title', full: true }, { k: 'description', l: 'Meta description', t: 'textarea', full: true }] }] }
  ];

  /* ------------------------------------------------------------ FIELD RENDERERS */
  let uid = 0;
  function field(def, obj, ctx = {}) {
    const id = 'f' + (++uid);
    const wrap = h('div', { class: 'f' + (def.full ? ' f--full' : '') });
    const label = def.l ? h('label', { for: id }, def.l, def.hint ? h('span', { class: 'hint' }, def.hint) : null) : null;
    const set = (v) => { obj[def.k] = v; changed(); ctx.onChange && ctx.onChange(); };
    const t = def.t || 'text';
    // Hide / clear tools for content fields (not settings like slug, status, selects or toggles)
    if (ctx.tools !== false && !def.slug && ['text', 'url', 'email', 'textarea', 'rich', 'strings', 'image', 'list', 'file'].includes(t)) {
      const hid = () => (obj.hiddenFields || []).includes(def.k);
      const paint = () => { wrap.classList.toggle('is-off', hid()); eye.setAttribute('aria-pressed', String(hid())); eye.textContent = hid() ? '◌ Hidden' : '👁'; eye.title = hid() ? 'Hidden on the site — click to show' : 'Hide on the site'; };
      const eye = h('button', { type: 'button', class: 'ft', 'aria-label': `Hide ${def.l || def.k} on the site`, onclick: () => {
        const hf = new Set(obj.hiddenFields || []); hid() ? hf.delete(def.k) : hf.add(def.k); obj.hiddenFields = [...hf]; if (!obj.hiddenFields.length) delete obj.hiddenFields; paint(); changed();
      } });
      const del = h('button', { type: 'button', class: 'ft ft--del', title: 'Delete this content', 'aria-label': `Delete ${def.l || def.k}`, onclick: () => {
        if (!confirm(`Delete “${def.l || def.k}”? (Undo is available)`)) return;
        obj[def.k] = t === 'strings' || t === 'list' ? [] : t === 'image' ? { src: '', alt: '' } : '';
        changed(); const sc = $('#editor').scrollTop; renderEditor(); $('#editor').scrollTop = sc;
      } }, '🗑');
      wrap.append(h('span', { class: 'ftools' }, eye, del)); paint();
    }

    if (t === 'text' || t === 'url' || t === 'email' || t === 'number') {
      const inp = h('input', { id, type: t === 'number' ? 'number' : t === 'email' ? 'email' : t === 'url' ? 'url' : 'text', value: obj[def.k] ?? '', list: def.list ? 'dl-' + def.list : null, 'data-key': def.slug ? 'slug' : null });
      inp.addEventListener('input', () => {
        let v = t === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value;
        if (def.slug) { v = slugify(v); delete obj._autoSlug; }
        set(v);
      });
      if (def.slug) inp.addEventListener('blur', () => (inp.value = obj[def.k] || ''));
      wrap.append(label, inp);
      if (def.list === 'cats') wrap.append(h('datalist', { id: 'dl-cats' }, ...[...new Set(C.projects.map((p) => p.category).filter(Boolean))].map((c) => h('option', { value: c }))));
    } else if (t === 'textarea') {
      const ta = h('textarea', { id }); ta.value = obj[def.k] ?? '';
      ta.addEventListener('input', () => set(ta.value)); wrap.append(label, ta);
    } else if (t === 'select') {
      const sel = h('select', { id }, ...def.options.map((o) => h('option', { value: o, selected: String(obj[def.k] ?? def.options[0]) === String(o) }, o)));
      sel.addEventListener('change', () => set(/^\d+$/.test(sel.value) && def.k === 'columns' ? +sel.value : sel.value)); wrap.append(label, sel);
    } else if (t === 'bool') {
      const cb = h('input', { id, type: 'checkbox', checked: obj[def.k] ?? def.def ?? false });
      cb.addEventListener('change', () => set(cb.checked));
      wrap.append(h('span', { class: 'lbl' }, ' '), h('label', { class: 'check', for: id }, cb, def.l));
    } else if (t === 'color') {
      const val = obj[def.k] || '';
      const txt = h('input', { id, type: 'text', value: val, placeholder: 'none' });
      const col = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#7fcfa5', 'aria-label': def.l + ' picker' });
      col.addEventListener('input', () => { txt.value = col.value; set(col.value); });
      txt.addEventListener('input', () => set(txt.value.trim() || undefined));
      wrap.append(label, h('div', { class: 'color-row' }, col, txt));
    } else if (t === 'rich') {
      wrap.append(h('span', { class: 'lbl' }, def.l), rich(obj, def.k, set));
    } else if (t === 'strings') {
      if (!Array.isArray(obj[def.k])) obj[def.k] = [];
      wrap.append(h('span', { class: 'lbl' }, def.l, h('span', { class: 'hint' }, 'Enter to add · drag to reorder')), chips(obj[def.k], () => { changed(); ctx.onChange && ctx.onChange(); }, ctx.hideOwner || obj, ctx.hideKey || def.k));
    } else if (t === 'image') {
      if (!obj[def.k] || typeof obj[def.k] !== 'object') obj[def.k] = { src: '', alt: '' };
      wrap.append(h('span', { class: 'lbl' }, def.l), imageField(obj[def.k], ctx));
    } else if (t === 'imageFlat') {
      wrap.append(h('span', { class: 'lbl' }, def.l), imageField(obj, ctx));
    } else if (t === 'file') {
      const inp = h('input', { id, type: 'text', value: obj[def.k] || '' });
      inp.addEventListener('input', () => set(inp.value));
      const up = h('input', { type: 'file', accept: def.accept, hidden: true });
      up.addEventListener('change', async () => { const f = up.files[0]; if (!f) return; const p = await storeFile(f, ctx.slug || 'media', f.name); inp.value = p; set(p); });
      wrap.append(label, inp, h('div', { class: 'img__btns' }, h('button', { class: 'b b--sm', type: 'button', onclick: () => up.click() }, 'Upload file…'), up));
    } else if (t === 'group') {
      if (!obj[def.k] || typeof obj[def.k] !== 'object') obj[def.k] = {};
      const g = h('div', { class: 'fields card', style: 'margin:0;background:var(--bg)' });
      def.fields.forEach((fd) => g.append(field(fd, obj[def.k], { ...ctx, tools: ctx.tools === false ? false : true })));
      wrap.append(def.l ? h('span', { class: 'lbl' }, def.l) : '', g);
    } else if (t === 'list') {
      if (!Array.isArray(obj[def.k])) obj[def.k] = [];
      wrap.append(h('span', { class: 'lbl' }, def.l), list(obj[def.k], def, ctx));
    }
    return wrap;
  }

  function rich(obj, key, set) {
    const area = h('div', { class: 'rich__area', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', html: obj[key] || '' });
    const cmd = (c, v) => { area.focus(); document.execCommand(c, false, v); set(area.innerHTML); };
    const bar = h('div', { class: 'rich__bar', role: 'toolbar', 'aria-label': 'Formatting' },
      h('button', { type: 'button', title: 'Bold', onclick: () => cmd('bold') }, h('b', {}, 'B')),
      h('button', { type: 'button', title: 'Italic (serif accent)', onclick: () => cmd('italic') }, h('i', {}, 'I')),
      h('button', { type: 'button', title: 'Link', onclick: () => { const u = prompt('Link URL (https://… or mailto:…)'); if (u) cmd('createLink', u); } }, '🔗'),
      h('button', { type: 'button', title: 'Bulleted list', onclick: () => cmd('insertUnorderedList') }, '• List'),
      h('button', { type: 'button', title: 'Numbered list', onclick: () => cmd('insertOrderedList') }, '1. List'),
      h('button', { type: 'button', title: 'New paragraph', onclick: () => cmd('formatBlock', 'p') }, '¶'),
      h('button', { type: 'button', title: 'Clear formatting', onclick: () => cmd('removeFormat') }, '⌫ Format'));
    area.addEventListener('input', () => set(area.innerHTML));
    area.addEventListener('paste', (e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertHTML', false, t.split(/\n{2,}/).map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')}</p>`).join('')); });
    return h('div', { class: 'rich' }, bar, area);
  }

  function chips(arr, onChange, owner, key) {
    const box = h('div', { class: 'chips' });
    const hiddenSet = () => new Set(((owner && owner.hiddenItems) || {})[key] || []);
    const toggleHide = (v) => {
      if (!owner) return; const hs = hiddenSet(); hs.has(v) ? hs.delete(v) : hs.add(v);
      owner.hiddenItems = owner.hiddenItems || {}; owner.hiddenItems[key] = [...hs];
      if (!owner.hiddenItems[key].length) delete owner.hiddenItems[key]; if (!Object.keys(owner.hiddenItems).length) delete owner.hiddenItems;
    };
    const inp = h('input', { type: 'text', placeholder: 'Type and press Enter…', 'aria-label': 'Add item' });
    const draw = () => {
      box.innerHTML = '';
      arr.forEach((v, i) => {
        const off = hiddenSet().has(v);
        const c = h('span', { class: 'chip' + (off ? ' is-off' : ''), draggable: 'true', title: 'Double-click to edit' }, v,
          h('button', { type: 'button', 'aria-pressed': String(off), 'aria-label': `${off ? 'Show' : 'Hide'} ${v}`, title: off ? 'Hidden — click to show' : 'Hide on the site', onclick: () => { toggleHide(v); draw(); onChange(); } }, off ? '◌' : '👁'),
          h('button', { type: 'button', 'aria-label': `Delete ${v}`, title: 'Delete', onclick: () => { arr.splice(i, 1); draw(); onChange(); } }, '×'));
        c.addEventListener('dblclick', () => { const nv = prompt('Edit item', v); if (nv != null && nv.trim()) { arr[i] = nv.trim(); draw(); onChange(); } });
        dnd(c, i, arr, () => { draw(); onChange(); });
        box.append(c);
      });
      box.append(inp);
    };
    inp.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) { e.preventDefault(); arr.push(inp.value.trim()); inp.value = ''; draw(); onChange(); inp.focus(); }
      else if (e.key === 'Backspace' && !inp.value && arr.length) { arr.pop(); draw(); onChange(); inp.focus(); }
    });
    inp.addEventListener('blur', () => { if (inp.value.trim()) { arr.push(inp.value.trim()); inp.value = ''; draw(); onChange(); } });
    draw();
    return box;
  }

  /** HTML5 drag & drop reordering for an element representing arr[i]. */
  let dragSrc = null;
  function dnd(el, i, arr, after, handle) {
    const start = handle || el;
    if (handle) { handle.addEventListener('mousedown', () => el.setAttribute('draggable', 'true')); el.addEventListener('dragend', () => el.removeAttribute('draggable')); }
    el.addEventListener('dragstart', (e) => { if (handle && el.getAttribute('draggable') !== 'true') return; e.stopPropagation(); dragSrc = { arr, i }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => { if (!dragSrc || dragSrc.arr !== arr) return; e.preventDefault(); e.stopPropagation(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
      el.classList.remove('drag-over'); if (!dragSrc || dragSrc.arr !== arr) return; e.preventDefault(); e.stopPropagation();
      const [m] = arr.splice(dragSrc.i, 1); arr.splice(i, 0, m); dragSrc = null; after();
    });
    void start;
  }

  function list(arr, def, ctx) {
    const box = h('div', { class: 'list' });
    const draw = () => {
      box.innerHTML = '';
      arr.forEach((item, i) => {
        const grip = h('span', { class: 'grip', title: 'Drag to reorder', 'aria-hidden': 'true' }, '⋮⋮');
        const title = h('span', { class: 't' }, (def.title && def.title(item)) || `Item ${i + 1}`);
        const move = (d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; draw(); changed(); };
        const tools = h('span', { class: 'item__tools' },
          h('button', { type: 'button', class: 'eye', title: item.hidden ? 'Hidden — click to show' : 'Hide on the site', 'aria-pressed': String(!!item.hidden), 'aria-label': item.hidden ? 'Show item' : 'Hide item', onclick: (e) => { e.stopPropagation(); item.hidden = !item.hidden; if (!item.hidden) delete item.hidden; draw(); changed(); } }, item.hidden ? '◌' : '👁'),
          h('button', { type: 'button', title: 'Move up', 'aria-label': 'Move up', onclick: (e) => { e.stopPropagation(); move(-1); } }, '↑'),
          h('button', { type: 'button', title: 'Move down', 'aria-label': 'Move down', onclick: (e) => { e.stopPropagation(); move(1); } }, '↓'),
          h('button', { type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', onclick: (e) => { e.stopPropagation(); arr.splice(i + 1, 0, clone(item)); draw(); changed(); } }, '⧉'),
          h('button', { type: 'button', class: 'del', title: 'Delete', 'aria-label': 'Delete', onclick: (e) => { e.stopPropagation(); if (confirm('Delete this item?')) { arr.splice(i, 1); draw(); changed(); } } }, '✕'));
        const body = h('div', { class: 'item__body' }, h('div', { class: 'fields' }, ...def.item.map((fd) => field(fd, item, { ...ctx, tools: false, hideOwner: null, hideKey: null, onChange: () => { title.textContent = (def.title && def.title(item)) || `Item ${i + 1}`; } }))));
        const head = h('div', { class: 'item__head', role: 'button', tabindex: '0', 'aria-expanded': 'false' }, grip, h('span', { class: 'caret', 'aria-hidden': 'true' }, '▾'), title, tools);
        const el = h('div', { class: 'item collapsed' + (item.hidden ? ' is-off' : '') }, head, body);
        const toggle = () => { el.classList.toggle('collapsed'); head.setAttribute('aria-expanded', String(!el.classList.contains('collapsed'))); };
        head.addEventListener('click', toggle); head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        dnd(el, i, arr, () => { draw(); changed(); }, grip);
        box.append(el);
      });
      const row = h('div', { class: 'add-row' }, h('button', { class: 'b b--sm', type: 'button', onclick: () => { const n = {}; def.item.forEach((f) => (n[f.k === '_img' ? 'src' : f.k] = f.t === 'strings' ? [] : f.t === 'number' ? 0 : '')); if (def.item.some((f) => f.t === 'imageFlat')) n.alt = ''; arr.push(n); draw(); changed(); box.querySelectorAll('.item')[arr.length - 1]?.classList.remove('collapsed'); } }, '+ Add'));
      if (def.multiUpload) {
        const up = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
        up.addEventListener('change', async () => {
          for (const f of up.files) { const src = await storeImage(f, ctx.slug || 'media'); arr.push({ src, alt: '', caption: '' }); }
          draw(); changed(); toast(`${up.files.length} image(s) added — remember to write alt text`);
        });
        row.append(h('button', { class: 'b b--sm', type: 'button', onclick: () => up.click() }, '⇪ Upload several images'), up);
      }
      box.append(row);
    };
    draw();
    return box;
  }

  function imageField(obj, ctx) {
    const thumb = h('div', { class: 'img__thumb', role: 'img', 'aria-label': 'Image preview' });
    const src = h('input', { type: 'text', value: obj.src || '', placeholder: 'assets/work/…/image.webp', 'aria-label': 'Image path' });
    const alt = h('input', { type: 'text', value: obj.alt || '', placeholder: 'Describe the image for screen-reader users (required)', 'aria-label': 'Alt text' });
    const altWrap = h('div', { class: 'f' + (obj.src && !obj.alt ? ' invalid' : '') }, alt);
    const paint = () => {
      const u = blobUrls.get(obj.src) || rel(obj.src);
      thumb.style.backgroundImage = obj.src ? `url("${u}")` : ''; thumb.textContent = obj.src ? '' : 'Drop image here';
      altWrap.classList.toggle('invalid', !!obj.src && !obj.alt);
    };
    src.addEventListener('input', () => { obj.src = src.value; paint(); changed(); });
    alt.addEventListener('input', () => { obj.alt = alt.value; paint(); changed(); });
    const up = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const take = async (f) => { if (!f || !/^image\//.test(f.type)) return; obj.src = await storeImage(f, ctx.slug || 'media'); src.value = obj.src; paint(); changed(); if (!obj.alt) alt.focus(); };
    up.addEventListener('change', () => take(up.files[0]));
    thumb.addEventListener('dragover', (e) => { e.preventDefault(); thumb.classList.add('drop'); });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drop'));
    thumb.addEventListener('drop', (e) => { e.preventDefault(); thumb.classList.remove('drop'); take(e.dataTransfer.files[0]); });
    paint();
    return h('div', { class: 'img' }, thumb, h('div', { class: 'img__side' }, src, altWrap,
      h('div', { class: 'img__btns' },
        h('button', { class: 'b b--sm', type: 'button', onclick: () => up.click() }, obj.src ? 'Replace…' : 'Upload…'),
        h('button', { class: 'b b--sm', type: 'button', onclick: () => { obj.src = ''; obj.alt = ''; src.value = ''; alt.value = ''; paint(); changed(); } }, 'Remove'), up)));
  }

  /* ------------------------------------------------------------ FILES */
  async function toWebP(file, max = 2400, q = 0.82) {
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return { blob: file, ext: file.type === 'image/gif' ? 'gif' : 'svg' };
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / bmp.width);
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/webp', q));
    return { blob: blob || file, ext: blob ? 'webp' : file.name.split('.').pop() };
  }
  async function storeImage(file, slug) {
    const { blob, ext } = await toWebP(file);
    const name = `${Date.now().toString(36)}-${slugify(file.name.replace(/\.[^.]+$/, '')) || 'image'}.${ext}`;
    return storeBlob(blob, `assets/work/${slugify(slug) || 'media'}/${name}`);
  }
  async function storeFile(file, slug, name) { return storeBlob(file, `assets/work/${slugify(slug) || 'media'}/${Date.now().toString(36)}-${slugify(name.replace(/\.[^.]+$/, ''))}.${name.split('.').pop()}`); }
  async function storeBlob(blob, path) {
    blobUrls.set(path, URL.createObjectURL(blob));
    if (window.MHSave && (await MHSave.server())) {
      const r = await MHSave.save(path, blob); if (r.ok) { toast('Image saved to ' + path); return path; }
    }
    if (dir && (await ensurePerm())) {
      try { await writeFile(path, blob); toast('Image saved to ' + path); return path; } catch (e) { console.error(e); toast('Could not write image — kept for download', true); }
    }
    pendingFiles.set(path, blob);
    toast('Image added. Connect your folder (or download it) to keep it.');
    return path;
  }
  async function writeFile(path, data) {
    const parts = path.split('/'); const file = parts.pop();
    let d = dir; for (const p of parts) d = await d.getDirectoryHandle(p, { create: true });
    const fh = await d.getFileHandle(file, { create: true }); const w = await fh.createWritable(); await w.write(data); await w.close();
  }
  const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));
  const serialize = () => `/* Site content — edited by /admin. Safe to hand-edit too: it's a plain JS object. */\nwindow.SITE_CONTENT = ${JSON.stringify(clean(C), null, 2)};\n`;
  function download(name, data, type = 'text/javascript') {
    const a = h('a', { href: URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type })), download: name }); document.body.append(a); a.click(); a.remove();
  }

  // Folder handle persistence (IndexedDB)
  const idb = (mode, fn) => new Promise((res, rej) => { const r = indexedDB.open('mh-cms', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
  async function ensurePerm() {
    if (!dir) return false;
    const o = { mode: 'readwrite' };
    if ((await dir.queryPermission(o)) === 'granted') return true;
    return (await dir.requestPermission(o)) === 'granted';
  }
  async function connect() {
    if (!window.showDirectoryPicker) { toast('Direct saving needs Chrome or Edge. Use More → Download content.js instead.', true); return; }
    try {
      let d = await window.showDirectoryPicker({ id: 'mh-portfolio', mode: 'readwrite' });
      if (d.name === 'content' || d.name === 'admin') { toast('Pick the main Portfolio folder (the one with index.html)', true); return; }
      try { await d.getDirectoryHandle('content'); } catch (e) { if (!confirm(`“${d.name}” has no content folder. Use it anyway?`)) return; }
      dir = d; await idb('readwrite', (s) => s.put(d, 'dir'));
      setStatus(); toast('Connected to ' + d.name);
      if (pendingFiles.size) { for (const [p, b] of pendingFiles) await writeFile(p, b); toast(`${pendingFiles.size} pending image(s) written`); pendingFiles.clear(); }
    } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); }
  }
  async function save() {
    commit();
    const issues = validate();
    if (issues.some((i) => i.err) && !confirm('Some content has errors (see Checks). Save anyway?')) return;
    // 1) local server (python3 server.py) — works in every browser
    if (window.MHSave && (await MHSave.server())) {
      for (const [p, b] of pendingFiles) { const r = await MHSave.save(p, b); if (!r.ok) { toast('Image save failed: ' + r.error, true); return; } }
      pendingFiles.clear();
      const r = await MHSave.save('content/content.js', serialize());
      if (!r.ok) { toast('Save failed: ' + r.error, true); return; }
      dirty = false; setStatus(); try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      toast('Saved ✓ — refresh your site to see it'); return;
    }
    // 2) folder access (Chrome/Edge)  3) download
    if (!dir) {
      if (window.showDirectoryPicker) { await connect(); if (!dir) return; }
      else { download('content.js', serialize()); for (const [p, b] of pendingFiles) download(p.split('/').pop(), b); toast('Downloaded — replace content/content.js (and put images in ' + 'assets/work/…)'); return; }
    }
    if (!(await ensurePerm())) { toast('Permission denied', true); return; }
    try {
      for (const [p, b] of pendingFiles) await writeFile(p, b); pendingFiles.clear();
      await writeFile('content/content.js', serialize());
      dirty = false; setStatus(); try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      toast('Saved ✓ — refresh your site to see it');
    } catch (e) { console.error(e); toast('Save failed: ' + e.message, true); }
  }

  /* ------------------------------------------------------------ VALIDATION */
  function validate() {
    const out = [];
    const slugs = new Map();
    (C.projects || []).forEach((p, pi) => {
      const go = { kind: 'project', index: pi };
      if (!p.title) out.push({ err: true, msg: `Project #${pi + 1} has no title`, go });
      if (!p.slug) out.push({ err: true, msg: `“${p.title || 'Untitled'}” has no URL slug`, go });
      else if (slugs.has(p.slug)) out.push({ err: true, msg: `Duplicate slug “${p.slug}”`, go }); else slugs.set(p.slug, 1);
      if (p.coverStyle !== 'generative' && !(p.cover && p.cover.src)) out.push({ msg: `“${p.title}” has no cover image (it will use a generative cover)`, go });
      if (p.cover && p.cover.src && !p.cover.alt) out.push({ err: true, msg: `“${p.title}” cover is missing alt text`, go });
      (p.blocks || []).forEach((b, bi) => {
        const imgs = [b, b.before, b.after, ...(b.images || [])].filter((x) => x && x.src && (b.type !== 'video'));
        imgs.forEach((im) => { if (!im.alt && !/\.(mp4|webm)$/.test(im.src)) out.push({ err: true, msg: `“${p.title}” › block ${bi + 1} (${b.type}): image missing alt text`, go }); });
        if (b.type === 'embed' && b.url && !/^https:\/\//.test(b.url)) out.push({ err: true, msg: `“${p.title}” › embed must start with https://`, go });
      });
      if (p.featured && p.status === 'draft') out.push({ msg: `“${p.title}” is featured but still a draft (hidden)`, go });
    });
    if (!(C.hero && C.hero.lines && C.hero.lines.length)) out.push({ err: true, msg: 'Hero headline is empty', go: { kind: 'section', id: 'hero' } });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((C.site && C.site.email) || '')) out.push({ err: true, msg: 'Site email looks invalid', go: { kind: 'section', id: 'site' } });
    const badge = $('[data-issues-count]'); badge.textContent = out.length; badge.classList.toggle('has', out.length > 0);
    const ul = $('[data-issues-list]'); ul.innerHTML = '';
    if (!out.length) ul.append(h('li', { class: 'empty' }, 'All good — no problems found.'));
    out.forEach((i) => ul.append(h('li', {}, h('button', { type: 'button', onclick: () => { view = i.go; renderSide(); renderEditor(); } }, h('span', { class: 'lvl' + (i.err ? ' err' : '') }, i.err ? 'ERROR' : 'TIP'), i.msg))));
    return out;
  }

  /* ------------------------------------------------------------ PAGE LAYOUT */
  const LAYOUT_IDS = ['hero', 'stats', 'marquee', 'mission', 'pillars', 'story', 'services', 'work', 'toolbox', 'cta'];
  const SCHEMA_OF = { hero: 'hero', stats: 'stats', marquee: 'marquee', mission: 'mission', pillars: 'pillars', story: 'story', services: 'services', work: 'work', toolbox: 'toolbox', cta: 'cta' };
  const LAYOUT_OF = Object.fromEntries(Object.entries(SCHEMA_OF).map(([a, b]) => [b, a]));
  const DOM_OF = { site: '#top', hero: '#top', stats: '#stats', marquee: '#capabilities', mission: '#mission', pillars: '#expertise', story: '#about', services: '#services', work: '#work', toolbox: '#toolbox', cta: '#contact' };
  /** C.layout.sections — ordered [{id, hidden}] for the home page; missing ids are appended. */
  function layoutList() {
    C.layout = C.layout || {};
    let list = (C.layout.sections || []).filter((x) => LAYOUT_IDS.includes(x.id));
    LAYOUT_IDS.forEach((id) => { if (!list.some((x) => x.id === id)) list.push({ id }); });
    C.layout.sections = list; return list;
  }
  const layoutEntry = (id) => layoutList().find((x) => x.id === id);

  /* ------------------------------------------------------------ SIDEBAR */
  function renderSide() {
    const secs = $('[data-sections]'); secs.innerHTML = '';
    const go = (id) => { view = { kind: 'section', id }; renderSide(); renderEditor(); previewGoTo(id); };
    const item = (id) => h('button', { class: 'side__item', type: 'button', 'aria-current': String(view.kind === 'section' && view.id === id), onclick: () => go(id) }, h('span', { class: 't' }, S[id].label));
    secs.append(h('li', { class: 'side__row' }, h('span', { class: 'grip grip--off', 'aria-hidden': 'true' }), item('site')));
    const order = layoutList();
    order.forEach((entry, i) => {
      const id = SCHEMA_OF[entry.id]; if (!id || !S[id]) return;
      const grip = h('span', { class: 'grip', title: 'Drag to reorder section', 'aria-hidden': 'true' }, '⋮⋮');
      const eye = h('button', { class: 'star eye', type: 'button', 'aria-pressed': String(!entry.hidden), 'aria-label': `${entry.hidden ? 'Show' : 'Hide'} section ${S[id].label}`, title: entry.hidden ? 'Hidden — click to show' : 'Visible — click to hide', onclick: (e) => { e.stopPropagation(); entry.hidden = !entry.hidden; if (!entry.hidden) delete entry.hidden; changed(); renderSide(); if (view.id === id) renderEditor(); } }, entry.hidden ? '◌' : '👁');
      const up = h('button', { class: 'star mv', type: 'button', 'aria-label': `Move ${S[id].label} up`, title: 'Move up', onclick: (e) => { e.stopPropagation(); if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; changed(); renderSide(); } } }, '↑');
      const li = h('li', { class: 'side__row' + (entry.hidden ? ' is-off' : '') }, grip, eye, item(id), up);
      dnd(li, i, order, () => { changed(); renderSide(); }, grip);
      secs.append(li);
    });
    const q = ($('[data-search]').value || '').toLowerCase();
    const ul = $('[data-projects]'); ul.innerHTML = '';
    C.projects.forEach((p, i) => {
      if (q && !`${p.title} ${p.category} ${p.tags?.join(' ')}`.toLowerCase().includes(q)) return;
      const star = h('button', { class: 'star', type: 'button', 'aria-pressed': String(!!p.featured), 'aria-label': `Featured: ${p.title}`, title: 'Featured on home', onclick: (e) => { e.stopPropagation(); p.featured = !p.featured; changed(); renderSide(); if (view.kind === 'project' && view.index === i) renderEditor(); } }, '★');
      const grip = h('span', { class: 'grip', 'aria-hidden': 'true' }, '⋮⋮');
      const btn = h('button', { class: 'side__item', type: 'button', 'aria-current': String(view.kind === 'project' && view.index === i), onclick: () => { view = { kind: 'project', index: i }; renderSide(); renderEditor(); pushPreview(); } },
        h('span', { class: 't' }, p.title || 'Untitled'), h('span', { class: `st st--${p.status}` }, p.status === 'published' ? 'live' : p.status === 'coming-soon' ? 'soon' : p.status === 'confidential' ? 'nda' : p.status));
      const peye = h('button', { class: 'star eye', type: 'button', 'aria-pressed': String(!p.hidden), 'aria-label': `${p.hidden ? 'Show' : 'Hide'} ${p.title}`, title: p.hidden ? 'Hidden — click to show' : 'Visible — click to hide', onclick: (e) => { e.stopPropagation(); p.hidden = !p.hidden; if (!p.hidden) delete p.hidden; changed(); renderSide(); } }, p.hidden ? '◌' : '👁');
      const li = h('li', { class: 'side__row' + (p.hidden ? ' is-off' : '') }, grip, peye, star, btn);
      dnd(li, i, C.projects, () => { if (view.kind === 'project') view.index = C.projects.indexOf(cur); renderSide(); changed(); }, grip);
      const cur = view.kind === 'project' ? C.projects[view.index] : null;
      ul.append(li);
    });
  }

  /* ------------------------------------------------------------ EDITOR */
  function renderEditor() {
    const ed = $('#editor'); ed.innerHTML = ''; uid = 0;
    if (restoreBanner) ed.append(restoreBanner);
    if (view.kind === 'section') {
      const s = S[view.id];
      const lay = LAYOUT_OF[view.id] && layoutEntry(LAYOUT_OF[view.id]);
      ed.append(h('div', { class: 'editor__head' }, h('div', {}, h('h1', {}, s.label), h('p', { class: 'sub' }, s.desc)),
        lay ? h('div', { class: 'row' }, h('button', { class: 'b b--sm', type: 'button', 'aria-pressed': String(!!lay.hidden), onclick: () => { lay.hidden = !lay.hidden; changed(); renderSide(); renderEditor(); } }, lay.hidden ? '◌ Section hidden — show' : '👁 Hide section')) : ''));
      if (lay && lay.hidden) ed.append(h('div', { class: 'banner' }, 'This section is hidden on the site. You can still edit it.'));
      const card = h('div', { class: 'card' }); const grid = h('div', { class: 'fields' }); card.append(grid);
      if (s.root) {
        // Edits a top-level array/value: wrap it so field() can bind by key
        const holder = { _: C[view.id] }; const def = { ...s.fields[0] };
        grid.append(field(def, holder, { tools: false, hideOwner: C, hideKey: view.id, onChange: () => (C[view.id] = holder._) }));
        C[view.id] = holder._;
      } else if (s.virtual) {
        s.fields.forEach((fd) => grid.append(field(fd, C, { tools: false })));
        if (!s.fields.length) grid.append(h('p', { class: 'sub f--full', style: 'margin:0' }, `${C.projects.filter((p) => !p.hidden && p.status !== 'draft').length} projects visible · ${C.projects.filter((p) => p.featured && !p.hidden && p.status !== 'draft').length} featured in the card stack.`));
      } else {
        C[view.id] = C[view.id] || {};
        s.fields.forEach((fd) => grid.append(field(fd, C[view.id])));
      }
      ed.append(card);
      if (view.id === 'site') ed.append(brandCard());
    } else {
      const p = C.projects[view.index]; if (!p) return;
      p.blocks = p.blocks || [];
      const ctx = { get slug() { return p.slug; } };
      ed.append(h('div', { class: 'editor__head' },
        h('div', {}, h('h1', {}, p.title || 'Untitled project'), h('p', { class: 'sub' }, `case.html?slug=${p.slug}`)),
        h('div', { class: 'row' },
          h('a', { class: 'b b--sm', href: p.externalUrl || `../case.html?slug=${encodeURIComponent(p.slug)}`, target: '_blank', rel: 'noopener' }, 'Open page ↗'),
          h('button', { class: 'b b--sm', type: 'button', onclick: () => { const c = clone(p); c.title += ' (copy)'; c.slug = uniqueSlug(c.slug + '-copy'); c.status = 'draft'; C.projects.splice(view.index + 1, 0, c); view.index++; changed(); renderSide(); renderEditor(); } }, 'Duplicate'),
          h('button', { class: 'b b--sm b--danger', type: 'button', onclick: () => { if (confirm(`Delete “${p.title}”? You can undo this.`)) { C.projects.splice(view.index, 1); view = { kind: 'section', id: 'site' }; changed(); renderSide(); renderEditor(); } } }, 'Delete'))));
      PROJECT.forEach((grp) => {
        const card = h('div', { class: 'card' }, h('h2', {}, grp.card)); const grid = h('div', { class: 'fields' });
        grp.fields.forEach((fd) => {
          const auto = fd.k === 'title' ? { ...ctx, onChange: () => { if (p._autoSlug) { p.slug = uniqueSlug(slugify(p.title), p); const s = $('#editor [data-key="slug"]'); if (s) s.value = p.slug; $('#editor .sub').textContent = `case.html?slug=${p.slug}`; } $('#editor h1').textContent = p.title || 'Untitled project'; renderSide(); } } : ctx;
          grid.append(field(fd, p, auto));
        });
        card.append(grid); ed.append(card);
      });
      // Blocks
      const bcard = h('div', { class: 'card' }, h('h2', {}, `Case study blocks (${p.blocks.length})`));
      const blist = h('div', { class: 'list' });
      const drawBlocks = () => {
        blist.innerHTML = ''; bcard.querySelector('h2').textContent = `Case study blocks (${p.blocks.length})`;
        p.blocks.forEach((b, i) => {
          const def = BLOCKS[b.type] || { l: b.type, fields: [], title: () => '' };
          const title = h('span', { class: 't' }, strip(def.title(b)) || def.l);
          const grip = h('span', { class: 'grip', title: 'Drag to reorder', 'aria-hidden': 'true' }, '⋮⋮');
          const move = (d) => { const j = i + d; if (j < 0 || j >= p.blocks.length) return; [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]]; drawBlocks(); changed(); };
          const head = h('div', { class: 'item__head', role: 'button', tabindex: '0', 'aria-expanded': 'false' }, grip, h('span', { class: 'caret', 'aria-hidden': 'true' }, '▾'), h('span', { class: 'ty' }, def.l), title,
            h('span', { class: 'item__tools' },
              h('button', { type: 'button', class: 'eye', 'aria-pressed': String(!!b.hidden), 'aria-label': b.hidden ? 'Show block' : 'Hide block', title: b.hidden ? 'Hidden — click to show' : 'Hide on the site', onclick: (e) => { e.stopPropagation(); b.hidden = !b.hidden; if (!b.hidden) delete b.hidden; drawBlocks(); changed(); } }, b.hidden ? '◌' : '👁'),
              h('button', { type: 'button', 'aria-label': 'Move block up', title: 'Move up', onclick: (e) => { e.stopPropagation(); move(-1); } }, '↑'),
              h('button', { type: 'button', 'aria-label': 'Move block down', title: 'Move down', onclick: (e) => { e.stopPropagation(); move(1); } }, '↓'),
              h('button', { type: 'button', 'aria-label': 'Duplicate block', title: 'Duplicate', onclick: (e) => { e.stopPropagation(); p.blocks.splice(i + 1, 0, clone(b)); drawBlocks(); changed(); } }, '⧉'),
              h('button', { type: 'button', class: 'del', 'aria-label': 'Delete block', title: 'Delete', onclick: (e) => { e.stopPropagation(); if (confirm('Delete this block?')) { p.blocks.splice(i, 1); drawBlocks(); changed(); } } }, '✕')));
          const body = h('div', { class: 'item__body' }, h('div', { class: 'fields' }, ...def.fields.map((fd) => field(fd, b, { ...ctx, onChange: () => (title.textContent = strip(def.title(b)) || def.l) }))));
          const el = h('div', { class: 'item collapsed' + (b.hidden ? ' is-off' : '') }, head, body);
          const toggle = () => { el.classList.toggle('collapsed'); head.setAttribute('aria-expanded', String(!el.classList.contains('collapsed'))); };
          head.addEventListener('click', toggle); head.addEventListener('keydown', (e) => { if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
          dnd(el, i, p.blocks, () => { drawBlocks(); changed(); }, grip);
          blist.append(el);
        });
      };
      drawBlocks();
      const menu = h('div', { class: 'add-menu', hidden: true }, ...Object.entries(BLOCKS).map(([type, d]) => h('button', { type: 'button', onclick: () => {
        p.blocks.push({ type, ...d.make() }); menu.hidden = true; drawBlocks(); changed();
        const last = blist.lastElementChild; last.classList.remove('collapsed'); last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } }, h('b', {}, d.l), h('span', {}, d.d))));
      bcard.append(blist, h('div', { class: 'add-row' }, h('button', { class: 'b', type: 'button', onclick: () => (menu.hidden = !menu.hidden) }, '+ Add block')), menu);
      ed.append(bcard);
    }
    ed.scrollTop = 0;
  }
  /* Brand colour: pick, preview live (CMS + preview pane), save permanently to tokens.css */
  const BRAND_SWATCHES = ['#7FCFA5', '#34D399', '#4FD1C5', '#6FB3FF', '#3B6CFF', '#8C9EFF', '#B39DFF', '#FF8FB1', '#FF9A7A', '#F2C46D', '#D4B26A', '#C5E86C', '#A47864', '#BB2649'];
  let brandDraft = null;
  function brandCard() {
    const current = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const hex = brandDraft ? brandDraft.hex : (/^#[0-9a-f]{6}$/i.test(current) ? current : '#7FCFA5');
    const card = h('div', { class: 'card' }, h('h2', {}, 'Brand colour'),
      h('p', { class: 'sub', style: 'margin:0 0 12px' }, 'Changes the accent colour across the whole project — site, case studies, CMS and design system. Contrast is auto-corrected for dark and light themes.'));
    const col = h('input', { type: 'color', value: hex, 'aria-label': 'Brand colour' });
    const txt = h('input', { type: 'text', value: hex, 'aria-label': 'Hex value', spellcheck: 'false', style: 'max-width:120px' });
    const tint = h('input', { type: 'checkbox', checked: !!(brandDraft && brandDraft.tint) });
    const info = h('p', { class: 'sub', style: 'margin:10px 0 0', role: 'status' }, brandDraft ? 'Previewing — not saved yet.' : `Current: ${hex}`);
    const sw = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px' }, ...BRAND_SWATCHES.map((c) => h('button', { type: 'button', title: c, 'aria-label': `Use ${c}`, style: `width:28px;height:28px;border-radius:50%;border:2px solid ${c.toUpperCase() === hex.toUpperCase() ? 'var(--text)' : 'transparent'};background:${c};cursor:pointer`, onclick: () => preview(c) })));
    const saveBtn = h('button', { class: 'b b--primary', type: 'button', disabled: !brandDraft, onclick: async () => {
      saveBtn.disabled = true; info.textContent = 'Saving…';
      try {
        const r = await MHSave.saveBrandColour(brandDraft.hex, { tint: brandDraft.tint });
        if (!r.ok) { if (r.via === 'none') { download('tokens.css', r.css, 'text/css'); info.textContent = 'Downloaded tokens.css — replace it in your Portfolio folder (or run python3 server.py to save directly).'; } else info.textContent = 'Save failed: ' + r.error; saveBtn.disabled = false; return; }
        brandDraft = null; setBrandPreview(''); info.textContent = `Saved ✓ ${r.dark.accent} is now the brand colour everywhere.`; toast('Brand colour saved');
        // reload our copy of tokens.css and the preview so everything shows the saved colour
        const l = document.querySelector('link[href$="tokens.css"], link[href*="tokens.css?"]'); if (l) l.href = '../tokens.css?t=' + Date.now();
        frame.src = frame.src;
      } catch (e) { info.textContent = 'Save failed: ' + e.message; saveBtn.disabled = false; }
    } }, 'Save colour to site');
    const resetBtn = h('button', { class: 'b', type: 'button', onclick: () => { brandDraft = null; setBrandPreview(''); const sc = $('#editor').scrollTop; renderEditor(); $('#editor').scrollTop = sc; } }, 'Cancel preview');
    async function preview(c) {
      if (!/^#[0-9a-f]{6}$/i.test(c)) return;
      brandDraft = { hex: c.toUpperCase(), tint: tint.checked };
      try { setBrandPreview(await MHSave.brandPreviewCSS(brandDraft.hex, brandDraft)); } catch (e) { info.textContent = e.message; return; }
      const sc = $('#editor').scrollTop; renderEditor(); $('#editor').scrollTop = sc;
    }
    col.addEventListener('change', () => preview(col.value));
    txt.addEventListener('change', () => preview(txt.value.trim().startsWith('#') ? txt.value.trim() : '#' + txt.value.trim()));
    tint.addEventListener('change', () => preview(brandDraft ? brandDraft.hex : hex));
    card.append(sw, h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, col, txt,
      h('label', { class: 'check', style: 'min-height:0' }, tint, 'Tint backgrounds to this hue'), saveBtn, brandDraft ? resetBtn : ''), info);
    return card;
  }
  function setBrandPreview(css) {
    let st = document.getElementById('brand-preview');
    if (!css) { st && st.remove(); } else { if (!st) { st = document.createElement('style'); st.id = 'brand-preview'; document.head.appendChild(st); } st.textContent = css; }
    try { frame.contentWindow.postMessage({ type: 'mh-brand-preview', css }, '*'); } catch (e) {}
  }

  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').slice(0, 90);
  function uniqueSlug(base, self) { let s = base || 'project', n = 2; while (C.projects.some((p) => p !== self && p.slug === s)) s = `${base}-${n++}`; return s; }

  function newProject() {
    const p = { slug: uniqueSlug('new-project'), title: 'New project', subtitle: '', category: 'Consumer', year: String(new Date().getFullYear()), role: 'Product Designer', type: '', duration: '', platforms: [], featured: false, status: 'draft', cover: { src: '', alt: '' }, coverStyle: 'image', metrics: [], tags: [], summary: '', seo: { title: '', description: '' }, blocks: [{ type: 'text', ...BLOCKS.text.make(), heading: 'Overview' }], _autoSlug: true };
    C.projects.unshift(p); view = { kind: 'project', index: 0 }; changed(); renderSide(); renderEditor();
    setTimeout(() => { const t = $('#editor input'); t && (t.focus(), t.select()); }, 50);
  }

  /* ------------------------------------------------------------ PREVIEW */
  const frame = $('[data-preview]');
  let frameUrl = '';
  function pushPreview() {
    if ($('.layout').classList.contains('no-preview') || getComputedStyle($('.preview')).display === 'none') return;
    const out = clean(C);
    const p = view.kind === 'project' ? C.projects[view.index] : null;
    const anchor = view.kind === 'section' && DOM_OF[view.id] !== '#top' ? DOM_OF[view.id] || '' : '';
    const url = p && !p.externalUrl ? `../case.html?preview=1&slug=${encodeURIComponent(p.slug)}` : `../index.html?preview=1${anchor}`;
    const send = () => frame.contentWindow.postMessage({ type: 'mh-preview', content: out, slug: p ? p.slug : null }, '*');
    try { const bp = document.getElementById('brand-preview'); bp ? sessionStorage.setItem('mh-brand-preview', bp.textContent) : sessionStorage.removeItem('mh-brand-preview'); } catch (e) {}
    try { sessionStorage.setItem('mh-preview', JSON.stringify(out)); } catch (e) {}
    if (url.split('#')[0] !== frameUrl.split('#')[0]) { frameUrl = url; frame.src = url; }
    else send();
  }
  /** Scroll the live preview to a home-page section (loading the home page first if needed). */
  function previewGoTo(id) {
    if ($('.layout').classList.contains('no-preview') || getComputedStyle($('.preview')).display === 'none') return;
    const target = DOM_OF[id] || '#top';
    if (/index\.html/.test(frameUrl) && frame.contentWindow) { frame.contentWindow.postMessage({ type: 'mh-scroll', target }, '*'); return; }
    try { sessionStorage.setItem('mh-preview', JSON.stringify(clean(C))); sessionStorage.removeItem('mh-preview-y'); } catch (e) {}
    frameUrl = `../index.html?preview=1${target === '#top' ? '' : target}`; frame.src = frameUrl;
  }
  $$('[data-device]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-device]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); frame.style.width = b.dataset.device;
  }));

  /* ------------------------------------------------------------ COMMANDS */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    const c = b.dataset.cmd;
    if (c === 'save') save();
    else if (c === 'connect') connect();
    else if (c === 'undo') undo(-1);
    else if (c === 'redo') undo(1);
    else if (c === 'new-project') newProject();
    else if (c === 'issues') { const p = $('[data-issues]'); p.hidden = !p.hidden; $$('[data-cmd="issues"]').forEach((x) => x.setAttribute('aria-expanded', String(!p.hidden))); validate(); }
    else if (c === 'export') download(`portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(clean(C), null, 2), 'application/json');
    else if (c === 'download') { download('content.js', serialize()); for (const [p, bl] of pendingFiles) download(p.split('/').pop(), bl); }
    else if (c === 'discard') { if (confirm('Discard the unsaved draft and reload the content from disk?')) { try { localStorage.removeItem(DRAFT_KEY); } catch (err) {} location.reload(); } }
    else if (c === 'toggle-preview') { const l = $('.layout'); l.classList.toggle('no-preview'); b.textContent = l.classList.contains('no-preview') ? 'Show' : 'Hide'; b.setAttribute('aria-pressed', String(!l.classList.contains('no-preview'))); if (!l.classList.contains('no-preview')) pushPreview(); }
    if (b.closest('.menu-d')) b.closest('.menu-d').open = false;
  });
  $('[data-import]').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (!d.projects) throw new Error('Not a portfolio backup'); C = d; changed(); renderSide(); renderEditor(); toast('Backup imported — Save to apply'); } catch (err) { toast(err.message, true); }
  });
  $('[data-search]').addEventListener('input', renderSide);
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    else if (mod && e.key.toLowerCase() === 'z' && !e.target.closest('input, textarea, [contenteditable="true"]')) { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
    else if (e.key === 'Escape') { $('[data-issues]').hidden = true; }
  });
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ------------------------------------------------------------ RESIZABLE COLUMNS */
  (function resizers() {
    const lay = $('.layout'); const KEY = 'mh-cms-cols';
    let cols = {}; try { cols = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    const apply = () => { if (cols.side) lay.style.setProperty('--side-w', cols.side + 'px'); if (cols.prev) lay.style.setProperty('--prev-w', cols.prev + 'px'); place(); };
    const mk = (which, label) => { const r = h('div', { class: 'rz rz--' + which, role: 'separator', 'aria-orientation': 'vertical', 'aria-label': label, tabindex: '0', title: 'Drag to resize · double-click to reset' }); lay.append(r); return r; };
    const rs = mk('side', 'Resize sidebar'), rp = mk('prev', 'Resize preview');
    function place() {
      const side = $('.side').getBoundingClientRect(), prev = $('.preview').getBoundingClientRect(), L = lay.getBoundingClientRect();
      rs.style.left = side.right - L.left - 4 + 'px';
      rp.style.left = prev.left - L.left - 4 + 'px'; rp.hidden = lay.classList.contains('no-preview') || getComputedStyle($('.preview')).display === 'none';
      rs.setAttribute('aria-valuenow', Math.round(side.width)); rp.setAttribute('aria-valuenow', Math.round(prev.width));
    }
    const clampW = (which, w) => which === 'side' ? Math.max(180, Math.min(480, w)) : Math.max(280, Math.min(lay.clientWidth - (cols.side || 270) - 380, w));
    const drag = (which) => (e) => {
      e.preventDefault(); lay.classList.add('resizing'); const r = which === 'side' ? rs : rp; r.setPointerCapture(e.pointerId);
      const L = lay.getBoundingClientRect();
      const move = (ev) => { cols[which] = clampW(which, which === 'side' ? ev.clientX - L.left : L.right - ev.clientX); apply(); };
      const up = () => { lay.classList.remove('resizing'); r.removeEventListener('pointermove', move); r.removeEventListener('pointerup', up); try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch (err) {} };
      r.addEventListener('pointermove', move); r.addEventListener('pointerup', up);
    };
    const key = (which) => (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
      const cur = which === 'side' ? $('.side').offsetWidth : $('.preview').offsetWidth, d = (e.key === 'ArrowRight' ? 1 : -1) * (which === 'side' ? 16 : -16);
      cols[which] = clampW(which, cur + d); apply(); try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch (err) {}
    };
    const reset = (which) => () => { delete cols[which]; lay.style.removeProperty(which === 'side' ? '--side-w' : '--prev-w'); try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch (err) {} place(); };
    rs.addEventListener('pointerdown', drag('side')); rp.addEventListener('pointerdown', drag('prev'));
    rs.addEventListener('keydown', key('side')); rp.addEventListener('keydown', key('prev'));
    rs.addEventListener('dblclick', reset('side')); rp.addEventListener('dblclick', reset('prev'));
    addEventListener('resize', place); new ResizeObserver(place).observe(lay);
    document.addEventListener('click', (e) => { if (e.target.closest('[data-cmd="toggle-preview"]')) setTimeout(place, 0); });
    apply();
  })();

  /* ------------------------------------------------------------ BOOT */
  let restoreBanner = null;
  (async () => {
    if (!window.SITE_CONTENT) { document.body.innerHTML = '<p style="padding:40px">Could not load ../content/content.js. Open this page from inside your Portfolio folder (ideally through a local server, e.g. <code>python3 -m http.server</code>).</p>'; return; }
    C.projects = C.projects || [];
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d && JSON.stringify(d.content) !== JSON.stringify(window.SITE_CONTENT)) {
        restoreBanner = h('div', { class: 'banner' }, h('span', {}, `You have an unsaved draft from ${new Date(d.at).toLocaleString()}.`),
          h('span', { class: 'row', style: 'display:flex;gap:6px' },
            h('button', { class: 'b b--sm b--primary', type: 'button', onclick: () => { C = d.content; restoreBanner = null; history.stack = [JSON.stringify(C)]; history.i = 0; dirty = true; setStatus(); renderSide(); renderEditor(); pushPreview(); validate(); } }, 'Restore draft'),
            h('button', { class: 'b b--sm', type: 'button', onclick: () => { localStorage.removeItem(DRAFT_KEY); restoreBanner.remove(); restoreBanner = null; } }, 'Discard')));
      }
    } catch (e) {}
    try { const d = await idb('readonly', (s) => s.get('dir')); if (d) { dir = d; } } catch (e) {}
    if (window.MHSave && (await MHSave.server())) { serverMode = true; const cb = $('[data-cmd="connect"]'); if (cb) cb.hidden = true; }
    setStatus(); renderSide(); renderEditor(); validate(); pushPreview();
    if (location.protocol === 'file:') toast('Tip: run a local server for the live preview (see README)');
  })();
})();
