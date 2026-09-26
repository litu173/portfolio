/* LOOM — visual editor
   Layout (Webflow-style): top bar · icon rail · left panel (Add / Navigator / Pages / Style guide / Assets)
   · canvas with breakpoints · right panel (Style / Settings) · breadcrumb bar.
   Styling is class-based: editing an element's style edits its class for the current breakpoint + state,
   so every element sharing the class updates. Desktop is the base; smaller breakpoints override it. */
(() => {
  'use strict';
  const L = window.Loom;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  }

  /* ------------------------------------------------------------ icons */
  const ICON = {
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
    add: '<path d="M12 5v14M5 12h14"/>', nav: '<path d="M4 6h16M8 12h12M12 18h8"/><path d="M4 6v12h4"/>', pages: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    style: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="14" cy="9" r="1.2" fill="currentColor"/><circle cx="15.5" cy="13.5" r="1.2" fill="currentColor"/><path d="M12 20c-1-2 0-4 2-4"/>',
    assets: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>', tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
    landscape: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M18 11v2"/>', portrait: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    section: '<rect x="3" y="6" width="18" height="12" rx="1"/>', container: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 6v12M17 6v12"/>', div: '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2"/>',
    grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
    flex: '<rect x="3" y="7" width="5" height="10"/><rect x="10" y="7" width="5" height="10"/><rect x="17" y="7" width="4" height="10"/>', columns: '<rect x="3" y="5" width="8" height="14"/><rect x="13" y="5" width="8" height="14"/>',
    heading: '<path d="M6 4v16M18 4v16M6 12h12"/>', paragraph: '<path d="M13 4v16M17 4v16M13 4H9a4 4 0 0 0 0 8h4"/>', text: '<path d="M5 6h14M12 6v12"/><path d="M8 18h8"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="18" r="1" fill="currentColor"/>',
    listitem: '<path d="M9 12h11"/><circle cx="5" cy="12" r="1" fill="currentColor"/>', button: '<rect x="3" y="8" width="18" height="8" rx="4"/>', image: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2"/>', divider: '<path d="M3 12h18"/>', embed: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    body: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', chev: '<path d="m6 9 6 6 6-6"/>',
    alignL: '<path d="M4 5h16M4 10h10M4 15h16M4 20h10"/>', alignC: '<path d="M4 5h16M7 10h10M4 15h16M7 20h10"/>', alignR: '<path d="M4 5h16M10 10h10M4 15h16M10 20h10"/>', alignJ: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>',
    row: '<path d="M4 12h14M14 8l4 4-4 4"/>', col: '<path d="M12 4v14M8 14l4 4 4-4"/>', plus: '<path d="M12 5v14M5 12h14"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  const ic = (k) => h('span', { html: `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.div}</svg>`, style: { display: 'contents' } });

  /* ------------------------------------------------------------ state */
  let P = null, page = null, sel = null, hov = null, bp = 'base', state = '', leftTab = 'ai', rightTab = 'style', preview = false;
  const closed = new Set(); let clip = null; let editingText = null;
  const hist = { s: [], i: -1, t: null };
  const frame = $('[data-canvas]');
  const doc = () => frame.contentDocument;
  const cur = () => (sel && sel !== 'body' ? L.find(page.tree, sel) : null);
  const curNode = () => { const f = cur(); return f && f.node; };
  const bpIndex = () => L.BPS.findIndex((b) => b.id === bp);

  function toast(msg) { const t = $('.toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }

  /* ------------------------------------------------------------ history & saving */
  function snapshot() { return JSON.stringify({ P, pageId: page.id }); }
  function pushHistory() {
    clearTimeout(hist.t); hist.t = null;
    const s = snapshot(); if (hist.s[hist.i] === s) return;
    hist.s = hist.s.slice(0, hist.i + 1); hist.s.push(s); if (hist.s.length > 120) hist.s.shift(); hist.i = hist.s.length - 1;
  }
  function undo(step) {
    if (hist.t) pushHistory();
    const ni = hist.i + step; if (ni < 0 || ni >= hist.s.length) return;
    hist.i = ni; const d = JSON.parse(hist.s[ni]); P = d.P; page = P.pages.find((x) => x.id === d.pageId) || P.pages[0];
    if (sel && sel !== 'body' && !L.find(page.tree, sel)) sel = null;
    mountFrame(); renderAll(); markDirty();
  }
  let saveT = null, dirty = false;
  function markDirty() {
    dirty = true; setStatus('Unsaved…', 'dirty');
    clearTimeout(saveT); saveT = setTimeout(() => save(false), 1200);
  }
  async function save(explicit) {
    clearTimeout(saveT);
    setStatus('Saving…', 'dirty');
    const r = await L.save(P);
    dirty = false;
    if (r.ok) setStatus(r.via === 'server' ? 'Saved' : 'Saved in browser', 'ok');
    else setStatus('Save failed', 'dirty');
    if (explicit) toast(r.ok ? (r.via === 'server' ? 'Saved to loom/projects ✓' : 'Saved in this browser — run python3 server.py to save files') : 'Save failed: ' + r.error);
  }
  function setStatus(t, c) { const s = $('[data-status]'); s.textContent = t; s.className = 'top__status ' + (c || ''); }
  addEventListener('beforeunload', (e) => { if (dirty) { save(false); e.preventDefault(); e.returnValue = ''; } });

  /** Apply a change. kind: 'css' (styles only) | 'tree' (structure/content) */
  function commit(kind = 'tree', { panels = true } = {}) {
    if (kind === 'tree') refreshTree(); else refreshCSS();
    if (panels) { renderLeft(); renderCrumbs(); if (kind === 'tree') renderRight(); }
    requestAnimationFrame(drawOverlay);
    clearTimeout(hist.t); hist.t = setTimeout(pushHistory, 350);
    markDirty();
  }

  /* ------------------------------------------------------------ canvas */
  const EDITOR_CSS = `
[data-lid]{cursor:default}
.loom-empty{min-height:64px;outline:1px dashed rgba(20,110,245,.5);outline-offset:-1px;background:repeating-linear-gradient(45deg,rgba(20,110,245,.05) 0 8px,transparent 8px 16px)}
body.loom-empty-body{min-height:100vh}
body.loom-empty-body::before{content:"Drag an element or layout here — or click one in the Add panel";display:flex;align-items:center;justify-content:center;min-height:60vh;margin:24px;border:1px dashed #9db8ec;border-radius:8px;color:#5b6475;font:14px Inter,system-ui,sans-serif;text-align:center;padding:20px}
#loom-ui{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}
.loom-box{position:absolute;display:none;pointer-events:none;box-sizing:border-box}
.loom-hov{box-shadow:0 0 0 1px #146ef5}
.loom-sel{box-shadow:0 0 0 2px #146ef5}
.loom-tag{position:absolute;left:-2px;bottom:100%;background:#146ef5;color:#fff;font:600 10.5px/18px Inter,system-ui,sans-serif;padding:0 6px;border-radius:3px 3px 0 0;white-space:nowrap;letter-spacing:0}
.loom-sel.tag-in .loom-tag{bottom:auto;top:0;left:0;border-radius:0 0 3px 0}
.loom-drop{position:absolute;display:none;background:#146ef5;pointer-events:none;border-radius:1px}
.loom-drop.inside{background:rgba(20,110,245,.12);box-shadow:inset 0 0 0 2px #146ef5}
[contenteditable="true"]{outline:2px solid #146ef5!important;outline-offset:2px;cursor:text!important}
.loom-embed{pointer-events:none}
.loom-preview #loom-ui{display:none!important}
.loom-preview .loom-empty{outline:0;background:none}`;
  const baseHref = () => new URL(`../sites/${P.slug}/`, location.href).href;
  function mountFrame() {
    frame.onload = () => { bindFrame(); drawOverlay(); };
    frame.srcdoc = L.pageDoc(P, page, { editor: true, extraHead: `<base href="${baseHref()}"><style id="loom-editor-css">${EDITOR_CSS}</style>` });
    sizeFrame();
  }
  function ensureUI(d) {
    if (d.getElementById('loom-ui')) return;
    d.documentElement.insertAdjacentHTML('beforeend', '<div id="loom-ui"><div class="loom-box loom-hov"></div><div class="loom-box loom-sel"><span class="loom-tag"></span></div><div class="loom-drop"></div></div>');
  }
  let fontSig = '';
  function refreshCSS() {
    const d = doc(); if (!d || !d.getElementById('loom-css')) return;
    d.getElementById('loom-css').textContent = L.cssFor(P);
    const sig = L.fontsUsed(P).join('|');
    if (sig !== fontSig) { fontSig = sig; $$('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]', d).forEach((l) => l.remove()); d.head.insertAdjacentHTML('afterbegin', L.fontsLink(P)); }
  }
  function refreshTree() {
    const d = doc(); if (!d || !d.body) return;
    const y = d.defaultView.scrollY;
    d.body.innerHTML = L.treeHTML(page.tree, true, P.pages);
    d.body.classList.toggle('loom-empty-body', !page.tree.length);
    refreshCSS();
    d.defaultView.scrollTo(0, y);
  }
  function elOf(id) { const d = doc(); if (!d) return null; return id === 'body' ? d.body : d.querySelector(`[data-lid="${id}"]`); }
  function place(box, el) {
    if (!el) { box.style.display = 'none'; return null; }
    const d = doc(), r = el.getBoundingClientRect(), w = d.defaultView;
    Object.assign(box.style, { display: 'block', left: r.left + w.scrollX + 'px', top: r.top + w.scrollY + 'px', width: r.width + 'px', height: Math.max(r.height, 2) + 'px' });
    return r;
  }
  function drawOverlay() {
    const d = doc(); if (!d || !d.body) return; ensureUI(d);
    d.body.classList.toggle('loom-preview', preview);
    const hb = d.querySelector('.loom-hov'), sb = d.querySelector('.loom-sel');
    place(hb, hov && hov !== sel && !preview ? elOf(hov) : null);
    const r = place(sb, sel && !preview ? elOf(sel) : null);
    if (r) {
      const n = sel === 'body' ? null : curNode();
      sb.querySelector('.loom-tag').textContent = n ? `${L.EL[n.type] ? L.EL[n.type].label : n.type}${n.cls ? ' · ' + n.cls : ''}` : 'Body';
      sb.classList.toggle('tag-in', r.top < 20);
    }
  }
  function sizeFrame() {
    const stage = $('[data-stage]'), wrap = $('[data-wrap]'), fw = $('[data-frame]');
    const avail = Math.max(120, stage.clientWidth - 32), availH = Math.max(200, stage.clientHeight - 32);
    const B = L.BPS[bpIndex()];
    const w = B.canvas || Math.max(avail, 1200);
    const s = Math.min(1, avail / w);
    fw.style.width = w + 'px'; fw.style.height = availH / s + 'px'; fw.style.transform = `scale(${s})`;
    wrap.style.width = w * s + 'px'; wrap.style.height = availH + 'px';
    $('[data-width]').textContent = `${w}px${s < 1 ? ` · ${Math.round(s * 100)}%` : ''}`;
    requestAnimationFrame(drawOverlay);
  }
  addEventListener('resize', sizeFrame);

  function bindFrame() {
    const d = doc(), w = d.defaultView;
    ensureUI(d); fontSig = L.fontsUsed(P).join('|');
    let raf = 0; const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { drawOverlay(); syncNavHover(); }); };
    d.addEventListener('mousemove', (e) => { if (preview) return; const el = e.target.closest && e.target.closest('[data-lid]'); const id = el ? el.dataset.lid : 'body'; if (id !== hov) { hov = id; redraw(); } });
    d.addEventListener('mouseleave', () => { hov = null; redraw(); });
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (a) e.preventDefault();
      if (preview) return;
      if (editingText && editingText.contains(e.target)) return;
      e.preventDefault();
      const el = e.target.closest('[data-lid]'); select(el ? el.dataset.lid : 'body');
    });
    d.addEventListener('dblclick', (e) => { if (preview) return; const el = e.target.closest('[data-lid]'); if (!el) return; const f = L.find(page.tree, el.dataset.lid); if (f && L.TEXTUAL(f.node)) startTextEdit(el, f.node); });
    d.addEventListener('keydown', onKey);
    w.addEventListener('scroll', redraw, { passive: true });
    w.addEventListener('resize', redraw);
    // Drag & drop from the Add panel / navigator onto the canvas
    d.addEventListener('dragover', (e) => { if (!dragData) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; showDrop(dropTarget(e.clientX, e.clientY)); });
    d.addEventListener('dragleave', (e) => { if (e.target === d.documentElement || !e.relatedTarget) showDrop(null); });
    d.addEventListener('drop', (e) => { if (!dragData) return; e.preventDefault(); const t = dropTarget(e.clientX, e.clientY); showDrop(null); applyDrop(dragData, t); dragData = null; });
    new w.ResizeObserver(redraw).observe(d.body);
  }

  /* ------------------------------------------------------------ inline text editing */
  function startTextEdit(el, node) {
    if (editingText) editingText.blur();
    if (/\*/.test(node.text || '')) el.textContent = node.text; // edit the raw text, keeping *accent* markers
    editingText = el; el.contentEditable = 'true'; el.focus();
    const r = doc().createRange(); r.selectNodeContents(el); const s = doc().getSelection(); s.removeAllRanges(); s.addRange(r);
    const original = node.text;
    const multi = node.type === 'paragraph' || node.type === 'text';
    const done = (keep) => {
      el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onK);
      el.contentEditable = 'false'; el.removeAttribute('contenteditable'); editingText = null;
      const txt = el.innerText.replace(/ /g, ' ').replace(/\n$/, '');
      if (keep && txt !== original) { node.text = txt; commit('tree'); } else refreshTree();
    };
    const onBlur = () => done(true);
    const onK = (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); done(false); } else if (e.key === 'Enter' && !e.shiftKey && !multi) { e.preventDefault(); el.blur(); } };
    el.addEventListener('blur', onBlur); el.addEventListener('keydown', onK);
  }

  /* ------------------------------------------------------------ drag & drop */
  let dragData = null; // { kind:'el'|'layout'|'move', value }
  function dropTarget(x, y) {
    const d = doc();
    let el = d.elementFromPoint(x, y); el = el && el.closest ? el.closest('[data-lid]') : null;
    while (el && dragData && dragData.kind === 'move') { const f = L.find(page.tree, dragData.value); if (f && L.contains(f.node, el.dataset.lid)) el = el.parentElement && el.parentElement.closest('[data-lid]'); else break; }
    if (!el) return { id: null, where: 'inside', el: d.body };
    const f = L.find(page.tree, el.dataset.lid), r = el.getBoundingClientRect();
    const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const horiz = pcs && /flex/.test(pcs.display) && !/column/.test(pcs.flexDirection);
    const rel = horiz ? (x - r.left) / r.width : (y - r.top) / r.height;
    if (L.HAS_KIDS(f.node) && (rel > 0.25 && rel < 0.75 || !f.node.children.length)) return { id: f.node.id, where: 'inside', el };
    return { id: f.node.id, where: rel < 0.5 ? 'before' : 'after', el, horiz };
  }
  function showDrop(t) {
    const d = doc(); if (!d) return; ensureUI(d);
    const bar = d.querySelector('.loom-drop'); if (!t) { bar.style.display = 'none'; return; }
    const r = t.el.getBoundingClientRect(), w = d.defaultView;
    bar.className = 'loom-drop' + (t.where === 'inside' ? ' inside' : '');
    if (t.where === 'inside') Object.assign(bar.style, { display: 'block', left: r.left + w.scrollX + 'px', top: r.top + w.scrollY + 'px', width: r.width + 'px', height: Math.max(r.height, 24) + 'px' });
    else if (t.horiz) Object.assign(bar.style, { display: 'block', left: (t.where === 'before' ? r.left : r.right) + w.scrollX - 1 + 'px', top: r.top + w.scrollY + 'px', width: '3px', height: r.height + 'px' });
    else Object.assign(bar.style, { display: 'block', left: r.left + w.scrollX + 'px', top: (t.where === 'before' ? r.top : r.bottom) + w.scrollY - 1 + 'px', width: r.width + 'px', height: '3px' });
  }
  function build(spec) {
    if (spec.kind === 'layout') return L.addLayout(P, spec.value);
    const n = L.N(spec.value); L.ensureTreeClasses(P, [n]); return n;
  }
  function placeNode(n, targetId, where) {
    if (!targetId) { page.tree.push(n); return; }
    const t = L.find(page.tree, targetId); if (!t) { page.tree.push(n); return; }
    if (where === 'inside') t.node.children.push(n); else t.list.splice(t.index + (where === 'after' ? 1 : 0), 0, n);
  }
  function applyDrop(spec, t) {
    if (spec.kind === 'move') {
      const src = L.find(page.tree, spec.value); if (!src || (t.id && L.contains(src.node, t.id))) return;
      src.list.splice(src.index, 1); placeNode(src.node, t.id, t.where); select(src.node.id, false); commit('tree'); return;
    }
    const n = build(spec); placeNode(n, t.id, t.where); select(n.id, false); commit('tree');
  }
  /** Click-to-add: inside the selected container, or after the selected element. */
  function insert(spec) {
    const n = build(spec); const f = cur();
    if (!f) page.tree.push(n);
    else if (L.HAS_KIDS(f.node) && spec.kind !== 'layout') f.node.children.push(n);
    else { let t = f; if (spec.kind === 'layout') { const top = L.path(page.tree, f.node.id)[0]; t = L.find(page.tree, top.id); } t.list.splice(t.index + 1, 0, n); }
    select(n.id, false); commit('tree');
    requestAnimationFrame(() => { const el = elOf(n.id); el && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  }

  /* ------------------------------------------------------------ element actions */
  function select(id, render = true) {
    if (editingText) editingText.blur();
    sel = id; state = '';
    if (id && id !== 'body') L.path(page.tree, id).slice(0, -1).forEach((n) => closed.delete(n.id));
    if (render) { renderRight(); renderLeft(); renderCrumbs(); }
    requestAnimationFrame(drawOverlay);
  }
  function del() {
    const f = cur(); if (!f) return;
    f.list.splice(f.index, 1);
    sel = f.list[Math.min(f.index, f.list.length - 1)]?.id || (f.parent ? f.parent.id : null);
    commit('tree');
  }
  function duplicate() {
    const f = cur(); if (!f) return;
    const c = L.reId(L.clone(f.node)); f.list.splice(f.index + 1, 0, c); select(c.id, false); commit('tree');
  }
  function move(dir) {
    const f = cur(); if (!f) return; const j = f.index + dir; if (j < 0 || j >= f.list.length) return;
    [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]]; commit('tree');
  }
  function selectParent() { const f = cur(); if (f) select(f.parent ? f.parent.id : 'body'); }
  function copy(cut) { const f = cur(); if (!f) return; clip = L.clone(f.node); if (cut) del(); toast(cut ? 'Cut' : 'Copied'); }
  function paste() { if (!clip) return; const n = L.reId(L.clone(clip)); const f = cur(); if (!f) page.tree.push(n); else if (L.HAS_KIDS(f.node)) f.node.children.push(n); else f.list.splice(f.index + 1, 0, n); select(n.id, false); commit('tree'); }

  function onKey(e) {
    const t = e.target, typing = t && (t.closest ? t.closest('input, textarea, select, [contenteditable="true"]') : null);
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(true); return; }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); if (preview) togglePreview(false); if (leftTab !== 'ai') setLeftTab('ai'); window.LoomAIPanel && LoomAIPanel.focus(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); undo(1); return; }
    if (e.key === 'Escape') { if (preview) togglePreview(false); else selectParent(); return; }
    if (!sel || sel === 'body') { if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); } return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
    else if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copy(false); }
    else if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); copy(true); }
    else if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); }
    else if ((mod || e.altKey) && e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if ((mod || e.altKey) && e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'Enter') { const n = curNode(); const el = elOf(sel); if (n && L.TEXTUAL(n) && el) { e.preventDefault(); startTextEdit(el, n); } }
  }
  document.addEventListener('keydown', onKey);

  /* ------------------------------------------------------------ top bar */
  function renderTop() {
    $('.top__proj').textContent = P.name;
    const ps = $('[data-page-select]'); ps.innerHTML = '';
    P.pages.forEach((pg) => ps.append(h('option', { value: pg.id, selected: pg.id === page.id }, `${pg.name}${pg.slug === 'index' ? ' (Home)' : ''}`)));
    const bps = $('[data-bps]'); bps.innerHTML = '';
    L.BPS.forEach((b) => bps.append(h('button', { type: 'button', class: b.id === bp ? 'is-on' : '', title: `${b.label} — ${b.hint}`, 'aria-label': b.label, 'aria-pressed': String(b.id === bp), onclick: () => setBp(b.id) }, ic(b.id === 'base' ? 'desktop' : b.id))));
    $('[data-act="undo"]').replaceChildren(ic('undo')); $('[data-act="redo"]').replaceChildren(ic('redo')); $('[data-act="preview"]').replaceChildren(ic('eye'));
  }
  function setBp(id) { bp = id; renderTop(); sizeFrame(); renderRight(); }
  $('[data-page-select]').addEventListener('change', (e) => switchPage(e.target.value));
  function switchPage(id) { page = P.pages.find((p) => p.id === id) || P.pages[0]; sel = null; hov = null; mountFrame(); renderAll(); }
  function togglePreview(on = !preview) {
    preview = on; $('#ed').classList.toggle('preview', on); $('[data-act="preview"]').setAttribute('aria-pressed', String(on)); if (on) sel = null;
    // Preview runs the real site: Loom FX motion, cursor, preloader-free
    if (on && P.fx) { frame.onload = null; const pv = Object.assign({}, P, { fx: Object.assign({}, P.fx, { preloader: false, transition: false }) }); frame.srcdoc = L.pageDoc(pv, page, { extraHead: `<base href="${baseHref()}">`, fxSrc: new URL('fx/loom-fx.js', L.FX_BASE).href }); }
    else if (!on && P.fx) mountFrame();
    setTimeout(() => { sizeFrame(); drawOverlay(); }, 30); if (on) toast(P.fx ? 'Live preview with motion — press Esc to exit' : 'Preview — press Esc to exit');
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'undo') undo(-1); else if (a === 'redo') undo(1); else if (a === 'preview') togglePreview();
    else if (a === 'save') save(true);
    else if (a === 'rename') { const n = prompt('Project name', P.name); if (n && n.trim()) { P.name = n.trim(); renderTop(); commit('css', { panels: false }); } }
    else if (a === 'publish') {
      await save(false); b.disabled = true; b.textContent = 'Publishing…';
      const r = await L.publish(P); b.disabled = false; b.textContent = 'Publish';
      if (r.ok) { modal(`<h2>Published ✓</h2><p style="margin:0;color:var(--ui-text-2)">${P.pages.length} page(s) written to <code>sites/${L.esc(P.slug)}/</code> — plain HTML + CSS you can upload anywhere.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" type="button" data-close>Close</button><a class="btn btn--blue" href="${r.url}" target="_blank" rel="noopener">Open site ↗</a></div>`); }
      else { const html = L.pageDoc(P, page, {}); const a2 = h('a', { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: `${page.slug}.html` }); document.body.append(a2); a2.click(); a2.remove(); toast(r.error + ' Downloaded this page instead.'); }
    }
  });
  function modal(html) { const m = $('[data-modal]'); $('[data-modal-box]').innerHTML = html; m.hidden = false; const f = $('[data-modal-box] input, [data-modal-box] a, [data-modal-box] button'); f && f.focus(); }
  $('[data-modal]').addEventListener('click', (e) => { if (e.target.matches('[data-modal]') || e.target.closest('[data-close]')) $('[data-modal]').hidden = true; });

  /* ------------------------------------------------------------ left rail + panels */
  const TABS = [['ai', 'Loom AI — your agent team (⌘K)', 'spark'], ['add', 'Add elements', 'add'], ['nav', 'Navigator', 'nav'], ['pages', 'Pages', 'pages'], ['guide', 'Style guide — fonts, swatches, classes', 'style'], ['assets', 'Assets', 'assets']];
  function renderRail() {
    const r = $('[data-rail]'); r.innerHTML = '';
    TABS.forEach(([id, label, icon]) => r.append(h('button', { class: 'ico' + (leftTab === id ? ' is-on' : ''), type: 'button', title: label, 'aria-label': label, 'aria-pressed': String(leftTab === id), onclick: () => setLeftTab(id) }, ic(icon))));
    $('#ed').classList.toggle('ai-wide', leftTab === 'ai');
  }
  function setLeftTab(id) { const was = leftTab; leftTab = id; renderRail(); renderLeft(); if ((was === 'ai') !== (id === 'ai')) setTimeout(() => { sizeFrame(); drawOverlay(); }, 20); }
  function renderLeft() {
    const el = $('[data-left]'); const sc = el.scrollTop;
    if (leftTab === 'ai') { if (window.LoomAIPanel) LoomAIPanel.render(el); return; }
    el.innerHTML = '';
    ({ add: panelAdd, nav: panelNav, pages: panelPages, guide: panelGuide, assets: panelAssets })[leftTab](el);
    el.scrollTop = sc;
  }
  const draggable = (node, spec) => { node.draggable = true; node.addEventListener('dragstart', (e) => { dragData = spec; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', spec.value); }); node.addEventListener('dragend', () => { dragData = null; showDrop(null); clearNavDrop(); }); return node; };

  function panelAdd(el) {
    el.append(h('div', { class: 'pane__h' }, 'Add', h('small', {}, 'Click or drag onto the canvas')));
    const groups = {};
    Object.entries(L.EL).forEach(([k, d]) => { if (!d.hidden) (groups[d.group] = groups[d.group] || []).push([k, d]); });
    Object.entries(groups).forEach(([g, items]) => {
      el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, g), h('div', { class: 'tiles' }, ...items.map(([k, d]) => draggable(h('button', { type: 'button', class: 'tile', title: `Add ${d.label}`, onclick: () => insert({ kind: 'el', value: k }) }, ic(k), d.label), { kind: 'el', value: k })))));
    });
    const thumbs = { navbar: [[4, 6, 18, 5], [60, 6, 40, 5]], hero: [[8, 8, 60, 8], [8, 20, 45, 4], [8, 28, 20, 5]], features: [[6, 10, 28, 20], [38, 10, 28, 20], [70, 10, 28, 20]], split: [[6, 8, 40, 24], [54, 10, 38, 6], [54, 20, 30, 4]], stats: [[6, 12, 18, 12], [30, 12, 18, 12], [54, 12, 18, 12], [78, 12, 18, 12]], cta: [[25, 10, 50, 8], [38, 24, 24, 6]], footer: [[6, 16, 30, 5], [60, 16, 34, 5]] };
    el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, 'Layouts', h('span', { class: 'hint' }, 'Ready-made sections')), h('div', { class: 'lay' }, ...L.LAYOUTS.map((l) =>
      draggable(h('button', { type: 'button', class: 'lay__i', title: `Add ${l.label}`, onclick: () => insert({ kind: 'layout', value: l.id }) },
        h('span', { class: 'lay__thumb' }, ...(thumbs[l.id] || []).map(([x, y, w, hh]) => h('i', { style: { left: x + '%', top: y + 'px', width: w + '%', height: hh + 'px' } }))),
        h('span', {}, h('b', {}, l.label), h('span', {}, l.desc))), { kind: 'layout', value: l.id })))));
  }

  /* Navigator */
  let navDrag = null;
  function clearNavDrop() { $$('.nrow.drop-before, .nrow.drop-after, .nrow.drop-inside').forEach((r) => r.classList.remove('drop-before', 'drop-after', 'drop-inside')); }
  function panelNav(el) {
    el.append(h('div', { class: 'pane__h' }, 'Navigator', h('small', {}, page.name)));
    const tree = h('div', { class: 'nav-tree', role: 'tree', 'aria-label': 'Page structure' });
    const bodyRow = h('div', { class: 'nrow' + (sel === 'body' ? ' is-sel' : ''), role: 'treeitem', tabindex: '0', style: { paddingLeft: '6px' }, 'data-id': 'body', onclick: () => select('body'), onmouseenter: () => { hov = 'body'; drawOverlay(); } }, h('span', { class: 'nrow__tw' }), h('span', { class: 'nrow__ic' }, ic('body')), h('span', { class: 'nrow__l' }, 'Body'));
    navDropZone(bodyRow, null);
    tree.append(bodyRow);
    const rec = (nodes, depth) => nodes.forEach((n) => {
      const d = L.EL[n.type] || {}; const kids = (n.children || []).length; const isClosed = closed.has(n.id);
      const snippet = d.textual ? (n.text || '').slice(0, 24) : n.tag && n.tag !== d.tag ? n.tag : '';
      const row = h('div', { class: 'nrow' + (sel === n.id ? ' is-sel' : '') + (isClosed ? ' is-closed' : ''), role: 'treeitem', tabindex: '0', 'aria-selected': String(sel === n.id), 'aria-expanded': kids ? String(!isClosed) : null, 'data-id': n.id, style: { paddingLeft: 6 + depth * 12 + 'px' },
        onclick: () => select(n.id), onmouseenter: () => { hov = n.id; drawOverlay(); }, onkeydown: (e) => { if (e.key === 'Enter') select(n.id); } },
        kids ? h('button', { class: 'nrow__tw', type: 'button', 'aria-label': isClosed ? 'Expand' : 'Collapse', onclick: (e) => { e.stopPropagation(); isClosed ? closed.delete(n.id) : closed.add(n.id); renderLeft(); } }, ic('chev')) : h('span', { class: 'nrow__tw' }),
        h('span', { class: 'nrow__ic' }, ic(n.type)), h('span', { class: 'nrow__l' }, L.nodeLabel(n), snippet ? h('em', {}, snippet) : ''),
        h('button', { class: 'ico nrow__x', type: 'button', title: 'Delete', 'aria-label': 'Delete element', onclick: (e) => { e.stopPropagation(); sel = n.id; del(); } }, ic('x')));
      row.draggable = true;
      row.addEventListener('dragstart', (e) => { navDrag = n.id; dragData = { kind: 'move', value: n.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', n.id); });
      row.addEventListener('dragend', () => { navDrag = null; dragData = null; clearNavDrop(); showDrop(null); });
      navDropZone(row, n);
      tree.append(row);
      if (kids && !isClosed) rec(n.children, depth + 1);
    });
    rec(page.tree, 1);
    tree.addEventListener('mouseleave', () => { hov = null; drawOverlay(); });
    el.append(tree);
    const s = tree.querySelector('.is-sel'); s && requestAnimationFrame(() => s.scrollIntoView({ block: 'nearest' }));
  }
  function navDropZone(row, n) {
    const zone = (e) => {
      if (!n) return 'inside';
      const r = row.getBoundingClientRect(), rel = (e.clientY - r.top) / r.height;
      if (L.HAS_KIDS(n) && rel > 0.3 && rel < 0.7) return 'inside';
      return rel < 0.5 ? 'before' : 'after';
    };
    row.addEventListener('dragover', (e) => {
      if (!dragData) return; if (dragData.kind === 'move' && n) { const src = L.find(page.tree, dragData.value); if (src && L.contains(src.node, n.id)) return; }
      e.preventDefault(); clearNavDrop(); row.classList.add('drop-' + zone(e));
    });
    row.addEventListener('drop', (e) => { if (!dragData) return; e.preventDefault(); const w = zone(e); clearNavDrop(); applyDrop(dragData, { id: n ? n.id : null, where: w }); dragData = null; });
  }
  function syncNavHover() { $$('.nrow.is-hover').forEach((r) => r.classList.remove('is-hover')); if (hov) { const r = $(`.nrow[data-id="${hov}"]`); r && r.classList.add('is-hover'); } }

  /* Pages */
  function panelPages(el) {
    el.append(h('div', { class: 'pane__h' }, 'Pages', h('button', { class: 'btn', type: 'button', onclick: addPage }, ic('plus'), 'Page')));
    const box = h('div', { class: 'grp' });
    P.pages.forEach((pg) => {
      const open = pg._open;
      box.append(h('div', { class: 'pg' + (pg.id === page.id ? ' is-cur' : ''), onclick: () => switchPage(pg.id) }, ic('pages'),
        h('span', { class: 'pg__n' }, pg.name, h('small', {}, `/${pg.slug === 'index' ? '' : pg.slug + '.html'}${pg.slug === 'index' ? '  · Home' : ''}`)),
        h('button', { class: 'ico', type: 'button', title: 'Page settings', 'aria-label': `Settings for ${pg.name}`, onclick: (e) => { e.stopPropagation(); pg._open = !open; renderLeft(); } }, ic('gear'))));
      if (open) {
        const upd = (k) => (e) => { let v = e.target.value; if (k === 'slug') { v = L.slug(v); if (P.pages.some((x) => x !== pg && x.slug === v)) { toast('That slug is taken'); return; } e.target.value = v; } pg[k] = v; renderTop(); commit('css', { panels: false }); };
        box.append(h('div', { class: 'grp', style: { background: 'var(--ui-bg)', borderRadius: '6px', margin: '4px 0 8px', border: '1px solid var(--ui-line)' } },
          h('div', { class: 'kv' },
            h('label', {}, 'Name'), h('input', { class: 'in', value: pg.name, onchange: upd('name') }),
            h('label', {}, 'Slug'), h('input', { class: 'in', value: pg.slug, disabled: pg.slug === 'index', onchange: upd('slug') }),
            h('label', {}, 'Title'), h('input', { class: 'in', value: pg.title || '', placeholder: `${pg.name} — ${P.name}`, onchange: upd('title') }),
            h('label', {}, 'Description'), h('input', { class: 'in', value: pg.description || '', placeholder: 'For search engines', onchange: upd('description') })),
          h('div', { style: { display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' } },
            h('button', { class: 'btn', type: 'button', onclick: () => { const c = L.clone(pg); c.id = L.uid('pg'); c.name += ' copy'; c.slug = L.slug(c.name); delete c._open; c.tree.forEach(L.reId); P.pages.push(c); commit('css'); renderTop(); renderLeft(); } }, 'Duplicate'),
            pg.slug !== 'index' ? h('button', { class: 'btn', type: 'button', onclick: () => { const home = P.pages.find((x) => x.slug === 'index'); if (home) home.slug = L.slug(home.name === 'Home' ? 'home' : home.name); pg.slug = 'index'; renderTop(); commit('css'); renderLeft(); } }, 'Set as home') : '',
            P.pages.length > 1 ? h('button', { class: 'btn btn--danger', type: 'button', onclick: () => { if (!confirm(`Delete page “${pg.name}”?`)) return; P.pages = P.pages.filter((x) => x !== pg); if (!P.pages.some((x) => x.slug === 'index')) P.pages[0].slug = 'index'; if (page === pg) switchPage(P.pages[0].id); commit('css'); renderTop(); renderLeft(); } }, 'Delete') : '')));
      }
    });
    el.append(box, h('p', { class: 'hint', style: { padding: '0 12px' } }, 'Link to a page from any Link or Button: Settings → Link → Page.'));
  }
  function addPage() {
    const name = prompt('Page name', 'New page'); if (!name) return;
    let s = L.slug(name), i = 2; while (P.pages.some((x) => x.slug === s)) s = `${L.slug(name)}-${i++}`;
    const pg = { id: L.uid('pg'), name, slug: s, title: '', tree: [] }; P.pages.push(pg); switchPage(pg.id); commit('css');
  }

  /* Style guide: fonts, swatches, classes */
  const FONTS = ['Inter', 'Inter Tight', 'Manrope', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Sora', 'Outfit', 'Poppins', 'Montserrat', 'Work Sans', 'IBM Plex Sans', 'Source Sans 3', 'Figtree', 'Syne', 'Unbounded', 'Archivo', 'Bricolage Grotesque', 'Playfair Display', 'Fraunces', 'Instrument Serif', 'DM Serif Display', 'Cormorant Garamond', 'Newsreader', 'JetBrains Mono', 'IBM Plex Mono', 'Space Mono'];
  function panelGuide(el) {
    el.append(h('div', { class: 'pane__h' }, 'Style guide'));
    const fontSel = (k) => h('select', { class: 'in', onchange: (e) => { P.fonts[k] = e.target.value; commit('css'); } }, ...[...new Set([P.fonts[k], ...FONTS])].map((f) => h('option', { selected: f === P.fonts[k] }, f)));
    el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, 'Fonts'), h('div', { class: 'kv' }, h('label', {}, 'Body'), fontSel('body'), h('label', {}, 'Headings'), fontSel('heading')),
      h('p', { class: 'hint', style: { margin: '8px 0 0' } }, 'Use them in Typography as “Body font” / “Heading font”.')));
    const sw = h('div', { class: 'sw-list' });
    P.swatches.forEach((s, i) => sw.append(h('div', { class: 'sw-row' },
      h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(s.value) ? s.value : '#000000', 'aria-label': `${s.name} colour`, oninput: (e) => { s.value = e.target.value.toUpperCase(); e.target.closest('.sw-row').querySelector('[data-v]').value = s.value; commit('css', { panels: false }); } }),
      h('input', { class: 'in', value: s.name, 'aria-label': 'Swatch name', onchange: (e) => { s.name = e.target.value; commit('css'); } }),
      h('input', { class: 'in', 'data-v': '', value: s.value, 'aria-label': 'Swatch value', style: { fontFamily: 'var(--ui-mono)', fontSize: '11px' }, onchange: (e) => { s.value = e.target.value.trim(); commit('css'); renderLeft(); } }),
      h('button', { class: 'ico', type: 'button', title: 'Delete swatch', 'aria-label': `Delete ${s.name}`, onclick: () => { if (confirm(`Delete swatch “${s.name}”? Elements using it lose that colour.`)) { P.swatches.splice(i, 1); commit('css'); renderLeft(); } } }, ic('x')))));
    el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, 'Swatches', h('button', { class: 'btn', type: 'button', onclick: () => { const name = prompt('Swatch name', 'Accent'); if (!name) return; let id = L.slug(name), i = 2; while (P.swatches.some((x) => x.id === id)) id = L.slug(name) + '-' + i++; P.swatches.push({ id, name, value: '#146EF5' }); commit('css'); renderLeft(); } }, ic('plus'), 'Swatch')), sw,
      h('p', { class: 'hint', style: { margin: '8px 0 0' } }, 'Swatches are global: change one and every element using it updates.')));
    const cls = Object.keys(P.classes).filter((c) => !c.startsWith('@')).sort();
    el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, `Classes (${cls.length})`),
      ...cls.map((c) => { const u = L.usage(P, c); return h('div', { class: 'cls-row' }, h('code', {}, '.' + c), h('span', {}, u ? `${u}×` : 'unused'),
        h('button', { class: 'ico', type: 'button', title: 'Rename class', 'aria-label': `Rename ${c}`, onclick: () => renameClass(c) }, ic('gear')),
        h('button', { class: 'ico', type: 'button', title: 'Delete class', 'aria-label': `Delete ${c}`, onclick: () => { if (u && !confirm(`“${c}” is used on ${u} element(s). Delete it and remove it from them?`)) return; delete P.classes[c]; P.pages.forEach((pg) => L.walk(pg.tree, (n) => { if (n.cls === c) delete n.cls; })); commit('tree'); } }, ic('x'))); })));
  }
  function renameClass(c) {
    const n = L.slug(prompt('New class name', c) || ''); if (!n || n === c) return;
    if (P.classes[n]) { toast(`“${n}” already exists`); return; }
    P.classes[n] = P.classes[c]; delete P.classes[c];
    P.pages.forEach((pg) => L.walk(pg.tree, (x) => { if (x.cls === c) x.cls = n; })); commit('tree');
  }

  /* Assets */
  function panelAssets(el) {
    P.assets = P.assets || [];
    const up = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => { for (const f of e.target.files) await uploadAsset(f); renderLeft(); } });
    el.append(h('div', { class: 'pane__h' }, 'Assets', h('button', { class: 'btn', type: 'button', onclick: () => up.click() }, ic('plus'), 'Upload'), up));
    const g = h('div', { class: 'assets' }, ...P.assets.map((a) => h('button', { class: 'asset', type: 'button', title: `${a.name} — click to use`, style: { backgroundImage: `url("${new URL(a.src, baseHref()).href}")` }, 'aria-label': `Use ${a.name}`, onclick: () => useAsset(a) })));
    el.append(h('div', { class: 'grp' }, P.assets.length ? g : h('p', { class: 'hint', style: { margin: 0 } }, 'Upload images here, then click one to insert it (or to replace the selected image).')));
  }
  async function toWebP(file, max = 2400, q = 0.82) {
    if (/svg|gif/.test(file.type)) return { blob: file, ext: file.type.includes('svg') ? 'svg' : 'gif' };
    const bmp = await createImageBitmap(file); const s = Math.min(1, max / bmp.width);
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/webp', q)); return { blob: blob || file, ext: blob ? 'webp' : 'png' };
  }
  async function uploadAsset(file) {
    const { blob, ext } = await toWebP(file);
    const name = `${Date.now().toString(36)}-${L.slug(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    let src;
    const r = window.MHSave ? await MHSave.save(`loom/assets/${P.id}/${name}`, blob, { askFolder: false }) : { ok: false };
    if (r.ok) src = `../../loom/assets/${P.id}/${name}`;
    else { src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); toast('Stored inside the project (run server.py to save image files)'); }
    const a = { name: file.name, src }; P.assets.push(a); commit('css', { panels: false }); return a;
  }
  function useAsset(a) {
    const n = curNode();
    if (n && n.type === 'image') { n.attrs.src = a.src; if (!n.attrs.alt) n.attrs.alt = a.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '); commit('tree'); }
    else { const img = L.N('image', { attrs: { src: a.src, alt: a.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') } }); const f = cur(); if (!f) page.tree.push(img); else if (L.HAS_KIDS(f.node)) f.node.children.push(img); else f.list.splice(f.index + 1, 0, img); select(img.id, false); commit('tree'); }
  }

  /* ------------------------------------------------------------ breadcrumbs */
  function renderCrumbs() {
    const c = $('[data-crumbs]'); c.innerHTML = '';
    c.append(h('button', { type: 'button', class: sel === 'body' ? 'is-cur' : '', onclick: () => select('body') }, 'Body'));
    if (sel && sel !== 'body') L.path(page.tree, sel).forEach((n) => { c.append(h('i', {}, '›'), h('button', { type: 'button', class: n.id === sel ? 'is-cur' : '', onclick: () => select(n.id), onmouseenter: () => { hov = n.id; drawOverlay(); } }, L.nodeLabel(n))); });
  }

  /* ------------------------------------------------------------ right panel: style */
  const UNITLESS = new Set(['line-height', 'opacity', 'z-index', 'font-weight', 'flex-grow', 'flex-shrink', 'order']);
  const targetClass = () => (sel === 'body' ? '@body' : (curNode() || {}).cls || null);
  const ruleKey = (b = bp, s = state) => (s ? `${b}:${s}` : b);
  function getSet(prop) { const c = targetClass(); const r = c && P.classes[c] && P.classes[c][ruleKey()]; return r ? r[prop] : undefined; }
  /** Value this element would get from the cascade if nothing were set on the current breakpoint + state.
      Order (most specific first): same state on larger breakpoints, then no-state on this and larger breakpoints. */
  function getInherited(prop) {
    const c = targetClass(); if (!c || !P.classes[c]) return undefined;
    const C = P.classes[c], i = bpIndex(), cands = [];
    if (state) { for (let k = i - 1; k >= 0; k--) cands.push([k, state]); for (let k = i; k >= 0; k--) cands.push([k, '']); }
    else for (let k = i - 1; k >= 0; k--) cands.push([k, '']);
    for (const [k, st] of cands) { const b = L.BPS[k].id, v = (C[st ? `${b}:${st}` : b] || {})[prop]; if (v != null) return { v, from: L.BPS[k].label + (st ? ' · ' + st : '') }; }
    return undefined;
  }
  function computed(prop) { const el = elOf(sel); if (!el) return ''; try { return doc().defaultView.getComputedStyle(el).getPropertyValue(prop); } catch (e) { return ''; } }
  const effective = (prop) => { const s = getSet(prop); if (s != null) return s; const i = getInherited(prop); return i ? i.v : undefined; };
  function autoClassName(n) { const base = L.slug((L.EL[n.type] || {}).label || n.type); let name = base, i = 2; while (P.classes[name]) name = `${base}-${i++}`; return name; }
  function setProp(prop, value, { render = true } = {}) {
    let c = targetClass(), tree = false;
    if (!c) { const n = curNode(); if (!n) return; c = autoClassName(n); n.cls = c; P.classes[c] = { base: {} }; tree = true; }
    if (!P.classes[c]) P.classes[c] = { base: {} };
    const k = ruleKey(); const r = P.classes[c][k] = P.classes[c][k] || {};
    if (value === '' || value == null) delete r[prop]; else r[prop] = value;
    if (!Object.keys(r).length && k !== 'base') delete P.classes[c][k];
    commit(tree ? 'tree' : 'css', { panels: tree });
    if (render && !tree) renderRight();
  }
  function setMany(obj) { Object.entries(obj).forEach(([k, v], i, arr) => setProp(k, v, { render: i === arr.length - 1 })); }
  function normalize(prop, v) { v = String(v).trim(); if (/^-?\d*\.?\d+$/.test(v) && !UNITLESS.has(prop)) return v + 'px'; return v; }

  // ----- control builders
  function lbl(text, props) {
    props = [].concat(props);
    const set = props.some((p) => getSet(p) != null), inh = !set && props.some((p) => getInherited(p));
    const from = inh ? (getInherited(props.find((p) => getInherited(p))) || {}).from : '';
    return h('button', { type: 'button', class: 'lbl' + (set ? ' is-set' : inh ? ' is-inh' : ''), title: set ? `Set on ${L.BPS[bpIndex()].label}${state ? ' · ' + state : ''} — click to reset` : inh ? `Inherited from ${from}` : text,
      onclick: () => { if (set) { props.forEach((p) => getSet(p) != null && setProp(p, '', { render: false })); renderRight(); } } }, text);
  }
  function unit(prop, { ph = '', key } = {}) {
    const set = getSet(prop), inh = getInherited(prop);
    const inp = h('input', { class: 'in' + (set == null && inh ? ' inherited' : ''), value: set ?? '', placeholder: inh ? inh.v : (computed(prop) || ph), 'data-fk': key || prop, spellcheck: 'false', 'aria-label': prop });
    inp.addEventListener('change', () => setProp(prop, normalize(prop, inp.value)));
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const src = inp.value || inp.placeholder || '0'; const m = String(src).match(/^(-?\d*\.?\d+)([a-z%]*)$/i); if (!m) return;
      e.preventDefault(); const step = (e.shiftKey ? 10 : e.altKey ? 0.1 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      const num = Math.round((parseFloat(m[1]) + step) * 100) / 100; inp.value = num + (m[2] || (UNITLESS.has(prop) ? '' : 'px')); setProp(prop, inp.value, { render: false });
    });
    return h('div', { class: 'unit' }, inp);
  }
  function select_(prop, options, { key } = {}) {
    const set = getSet(prop), inh = getInherited(prop);
    const s = h('select', { class: 'in', 'data-fk': key || prop, 'aria-label': prop, onchange: (e) => setProp(prop, e.target.value) },
      h('option', { value: '' }, inh ? `— ${labelOf(options, inh.v)}` : '—'), ...options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: set === v }, l); }));
    return s;
  }
  const labelOf = (opts, v) => { const o = opts.find((x) => (Array.isArray(x) ? x[0] : x) === v); return o ? (Array.isArray(o) ? o[1] : o) : v; };
  function seg(prop, options) {
    const set = getSet(prop), eff = effective(prop) ?? computed(prop);
    return h('div', { class: 'seg', role: 'group', 'aria-label': prop }, ...options.map(([v, label, icon]) => h('button', { type: 'button', class: eff === v ? 'is-on' : '', title: label, 'aria-pressed': String(eff === v), style: set !== v && eff === v ? { opacity: 0.7 } : null, onclick: () => setProp(prop, set === v ? '' : v) }, icon ? ic(icon) : label)));
  }
  const swatchValue = (v) => { const m = /var\(--sw-([\w-]+)\)/.exec(v || ''); if (!m) return v; const s = P.swatches.find((x) => x.id === m[1]); return s ? s.value : v; };
  function color(prop, onSet) {
    const put = onSet || ((v, o) => setProp(prop, v, o));
    const set = getSet(prop), inh = getInherited(prop), eff = set ?? (inh && inh.v) ?? '';
    const shown = swatchValue(eff) || computed(prop);
    const hex = toHexColor(shown);
    const txt = h('input', { class: 'in' + (set == null && inh ? ' inherited' : ''), value: set ?? '', placeholder: inh ? inh.v : computed(prop), 'data-fk': prop, spellcheck: 'false', style: { fontFamily: 'var(--ui-mono)', fontSize: '11px' }, 'aria-label': prop, onchange: (e) => put(e.target.value.trim()) });
    const pick = h('input', { type: 'color', value: hex || '#000000', 'aria-label': `${prop} picker`, oninput: (e) => { txt.value = e.target.value.toUpperCase(); put(txt.value, { render: false }); sw.querySelector('i').style.background = txt.value; }, onchange: () => renderRight() });
    const sw = h('span', { class: 'color__sw' }, h('i', { style: { background: shown || 'transparent' } }), pick);
    return h('div', { class: 'color' }, sw, txt, h('div', { class: 'color__swatches' }, ...P.swatches.map((s) => { const v = `var(--sw-${s.id})`; return h('button', { type: 'button', class: set === v ? 'is-on' : '', title: `${s.name} ${s.value}`, 'aria-label': `Use swatch ${s.name}`, style: { background: s.value }, onclick: () => put(set === v ? '' : v) }); })));
  }
  function toHexColor(c) {
    if (!c) return ''; c = String(c).trim(); if (/^#[0-9a-f]{6}$/i.test(c)) return c; if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
    const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const [r, g, b] = m[1].split(/[\s,/]+/).map(Number); return '#' + [r, g, b].map((v) => Math.round(v || 0).toString(16).padStart(2, '0')).join(''); }
    return '';
  }
  const row = (label, props, ctl) => h('div', { class: 'row' }, lbl(label, props), ctl);
  const sec = (id, title, props, body) => {
    const isClosed = secClosed.has(id);
    const anySet = props.some((p) => getSet(p) != null);
    const s = h('div', { class: 'sec' + (isClosed ? ' is-closed' : '') }, h('button', { type: 'button', class: 'sec__h', 'aria-expanded': String(!isClosed), onclick: () => { isClosed ? secClosed.delete(id) : secClosed.add(id); renderRight(); } }, h('span', {}, title, anySet ? h('span', { class: 'dot', title: 'Has styles on this breakpoint' }) : ''), ic('chev')), h('div', { class: 'sec__b' }, body()));
    return s;
  };
  const secClosed = new Set(['position', 'effects', 'backgrounds', 'borders']);

  function spacingBox() {
    const inp = (prop, side) => { const set = getSet(prop), inh = getInherited(prop);
      const i = h('input', { 'data-side': side, 'data-fk': prop, class: set != null ? 'is-set' : inh ? 'is-inh' : '', value: set != null ? set.replace(/px$/, '') : '', placeholder: inh ? String(inh.v).replace(/px$/, '') : (computed(prop) || '0').replace(/px$/, ''), 'aria-label': prop, title: prop, spellcheck: 'false' });
      i.addEventListener('change', () => setProp(prop, normalize(prop, i.value)));
      i.addEventListener('keydown', (e) => { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); const n = parseFloat(i.value || i.placeholder || '0') || 0; const v = n + (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1); i.value = v; setProp(prop, v + 'px', { render: false }); });
      return i; };
    return h('div', { class: 'box' }, h('span', { class: 'box__lab' }, 'Margin'), inp('margin-top', 'top'), inp('margin-right', 'right'), inp('margin-bottom', 'bottom'), inp('margin-left', 'left'),
      h('div', { class: 'box__inner' }, h('span', { class: 'box__lab' }, 'Padding'), inp('padding-top', 'top'), inp('padding-right', 'right'), inp('padding-bottom', 'bottom'), inp('padding-left', 'left'), h('div', { class: 'box__core' })));
  }

  function renderRight() {
    const el = $('[data-right]'); const sc = el.scrollTop; const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
    el.innerHTML = '';
    el.append(h('div', { class: 'tabs', role: 'tablist' }, ...[['style', 'Style'], ['settings', 'Settings']].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(rightTab === k), onclick: () => { rightTab = k; renderRight(); } }, l))));
    if (!sel) { el.append(h('div', { class: 'empty' }, 'Select an element on the canvas, in the Navigator or in the breadcrumb bar to style it.', h('br'), h('br'), h('span', { class: 'hint' }, 'Tip: double-click text to edit it. ⌘D duplicates, ⌫ deletes, Esc selects the parent.'))); return; }
    if (rightTab === 'style') renderStyle(el); else renderSettings(el);
    el.scrollTop = sc;
    if (fk) { const f = el.querySelector(`[data-fk="${CSS.escape(fk)}"]`); f && f.focus(); }
  }
  function renderStyle(el) {
    const n = curNode(); const c = targetClass(); const B = L.BPS[bpIndex()];
    // Selector
    const input = h('input', { placeholder: c ? 'Add or switch class…' : 'Add a class to style this element…', 'aria-label': 'Class name', list: 'loom-classes', onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) { assignClass(L.slug(input.value)); } } });
    const dl = h('datalist', { id: 'loom-classes' }, ...Object.keys(P.classes).filter((x) => !x.startsWith('@')).map((x) => h('option', { value: x })));
    const box = h('div', { class: 'sel__box' },
      c ? h('span', { class: 'chip' + (c.startsWith('@') ? ' is-tag' : '') }, c.startsWith('@') ? c.slice(1).replace(/^./, (m) => m.toUpperCase()) + ' (all pages)' : c,
        !c.startsWith('@') ? h('button', { type: 'button', title: 'Rename class', 'aria-label': 'Rename class', onclick: () => renameClass(c) }, '✎') : '',
        !c.startsWith('@') ? h('button', { type: 'button', title: 'Remove class from element', 'aria-label': 'Remove class', onclick: () => { delete n.cls; commit('tree'); } }, '×') : '') : '',
      sel === 'body' ? '' : input, dl);
    const uses = c && !c.startsWith('@') ? L.usage(P, c) : 0;
    el.append(h('div', { class: 'sel' }, h('div', { class: 'sel__h' }, h('span', {}, 'Selector'),
      h('select', { class: 'in', style: { width: 'auto', height: '24px' }, 'aria-label': 'State', onchange: (e) => { state = e.target.value; renderRight(); } }, ...L.STATES.map((s) => h('option', { value: s.id, selected: s.id === state }, s.label)))),
      box, h('div', { class: 'sel__meta' }, h('span', {}, c ? (uses > 1 ? `Used on ${uses} elements — edits update all of them` : c.startsWith('@') ? 'Base styles for the whole site' : 'Used on 1 element') : 'Styles will create a new class'),
        h('b', { class: bp === 'base' ? 'is-base' : '' }, `${B.label}${state ? ' · ' + state : ''}`))));
    const display = effective('display') || computed('display');
    el.append(sec('layout', 'Layout', ['display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'column-gap', 'row-gap', 'grid-template-columns', 'grid-template-rows'], () => {
      const out = [row('Display', 'display', seg('display', [['block', 'Block'], ['flex', 'Flex'], ['grid', 'Grid'], ['inline-block', 'Inline'], ['none', 'None']]))];
      if (/flex/.test(display)) out.push(
        row('Direction', 'flex-direction', seg('flex-direction', [['row', 'Horizontal', 'row'], ['column', 'Vertical', 'col'], ['row-reverse', 'Row reverse', null], ['column-reverse', 'Column reverse', null]].map(([v, l, i]) => [v, i ? l : l.includes('Row') ? '←' : '↑', i]))),
        row('Align', 'align-items', select_('align-items', [['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['stretch', 'Stretch'], ['baseline', 'Baseline']])),
        row('Justify', 'justify-content', select_('justify-content', [['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['space-between', 'Space between'], ['space-around', 'Space around'], ['space-evenly', 'Space evenly']])),
        row('Wrap', 'flex-wrap', seg('flex-wrap', [['nowrap', "Don't wrap"], ['wrap', 'Wrap']])),
        h('div', { class: 'row--2' }, row('Col', 'column-gap', unit('column-gap')), row('Row', 'row-gap', unit('row-gap'))));
      if (/grid/.test(display)) {
        const cols = (effective('grid-template-columns') || '').match(/^repeat\((\d+),\s*1fr\)$/);
        const n = h('input', { class: 'in', type: 'number', min: 1, max: 12, value: cols ? cols[1] : '', placeholder: '#', 'data-fk': 'grid-cols', 'aria-label': 'Number of columns', onchange: (e) => setProp('grid-template-columns', e.target.value ? `repeat(${Math.max(1, Math.min(12, +e.target.value))}, 1fr)` : '') });
        out.push(row('Columns', 'grid-template-columns', h('div', { style: { display: 'grid', gridTemplateColumns: '54px 1fr', gap: '6px' } }, n, unit('grid-template-columns', { key: 'gtc' }))),
          row('Rows', 'grid-template-rows', unit('grid-template-rows', { ph: 'auto' })),
          h('div', { class: 'row--2' }, row('Col', 'column-gap', unit('column-gap')), row('Row', 'row-gap', unit('row-gap'))),
          row('Align', 'align-items', select_('align-items', [['start', 'Start'], ['center', 'Center'], ['end', 'End'], ['stretch', 'Stretch']])),
          row('Justify', 'justify-items', select_('justify-items', [['start', 'Start'], ['center', 'Center'], ['end', 'End'], ['stretch', 'Stretch']])));
      }
      const pd = sel !== 'body' && elOf(sel) && elOf(sel).parentElement ? getComputedStyle(elOf(sel).parentElement).display : '';
      if (/flex|grid/.test(pd)) out.push(h('p', { class: 'hint', style: { margin: '4px 0 0' } }, `As a ${pd.includes('grid') ? 'grid' : 'flex'} child`),
        pd.includes('grid') ? row('Span', 'grid-column', select_('grid-column', [['span 1', 'Span 1'], ['span 2', 'Span 2'], ['span 3', 'Span 3'], ['span 4', 'Span 4'], ['1 / -1', 'Full row']])) : row('Sizing', 'flex', select_('flex', [['0 1 auto', 'Shrink if needed'], ['1 1 0', 'Grow & fill'], ['0 0 auto', "Don't shrink or grow"]])),
        row('Align self', 'align-self', select_('align-self', [['auto', 'Auto'], ['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['stretch', 'Stretch']])),
        row('Order', 'order', unit('order', { ph: '0' })));
      return out;
    }));
    el.append(sec('spacing', 'Spacing', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'], () => [spacingBox(), h('p', { class: 'hint', style: { margin: 0 } }, 'Type a value, or use ↑/↓ (Shift ×10). Blue = set here, orange = inherited.')]));
    el.append(sec('size', 'Size', ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'overflow', 'object-fit', 'aspect-ratio'], () => [
      h('div', { class: 'row--2' }, row('W', 'width', unit('width', { ph: 'auto' })), row('H', 'height', unit('height', { ph: 'auto' })), row('Min W', 'min-width', unit('min-width')), row('Min H', 'min-height', unit('min-height')), row('Max W', 'max-width', unit('max-width', { ph: 'none' })), row('Max H', 'max-height', unit('max-height', { ph: 'none' }))),
      row('Overflow', 'overflow', seg('overflow', [['visible', 'Visible'], ['hidden', 'Hidden'], ['auto', 'Scroll']])),
      row('Ratio', 'aspect-ratio', select_('aspect-ratio', [['1 / 1', '1:1'], ['4 / 3', '4:3'], ['3 / 2', '3:2'], ['16 / 9', '16:9'], ['21 / 9', '21:9'], ['3 / 4', '3:4 portrait']])),
      n && (n.type === 'image' || n.type === 'video') ? row('Fit', 'object-fit', select_('object-fit', [['fill', 'Fill'], ['cover', 'Cover'], ['contain', 'Contain'], ['none', 'None']])) : '']));
    el.append(sec('position', 'Position', ['position', 'top', 'right', 'bottom', 'left', 'z-index'], () => {
      const pos = effective('position') || 'static';
      return [row('Position', 'position', select_('position', [['static', 'Static'], ['relative', 'Relative'], ['absolute', 'Absolute'], ['fixed', 'Fixed'], ['sticky', 'Sticky']])),
        pos !== 'static' ? h('div', { class: 'row--2' }, row('T', 'top', unit('top', { ph: 'auto' })), row('R', 'right', unit('right', { ph: 'auto' })), row('B', 'bottom', unit('bottom', { ph: 'auto' })), row('L', 'left', unit('left', { ph: 'auto' }))) : '',
        row('Z-index', 'z-index', unit('z-index', { ph: 'auto' }))];
    }));
    const fontOpts = [['var(--font-body)', `Body font (${P.fonts.body})`], ['var(--font-heading)', `Heading font (${P.fonts.heading})`], ...FONTS.map((f) => [`"${f}", sans-serif`, f]), ['inherit', 'Inherit'], ['system-ui, sans-serif', 'System UI']];
    el.append(sec('type', 'Typography', ['font-family', 'font-weight', 'font-size', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-transform', 'font-style', 'text-decoration'], () => [
      row('Font', 'font-family', select_('font-family', fontOpts)),
      row('Weight', 'font-weight', select_('font-weight', [['300', '300 Light'], ['400', '400 Regular'], ['500', '500 Medium'], ['600', '600 Semibold'], ['700', '700 Bold'], ['800', '800 Extra bold']])),
      h('div', { class: 'row--2' }, row('Size', 'font-size', unit('font-size')), row('Height', 'line-height', unit('line-height'))),
      row('Spacing', 'letter-spacing', unit('letter-spacing', { ph: 'normal' })),
      row('Color', 'color', color('color')),
      row('Align', 'text-align', seg('text-align', [['left', 'Left', 'alignL'], ['center', 'Center', 'alignC'], ['right', 'Right', 'alignR'], ['justify', 'Justify', 'alignJ']])),
      row('Style', 'font-style', seg('font-style', [['normal', 'Regular'], ['italic', 'Italic']])),
      row('Case', 'text-transform', select_('text-transform', [['none', 'None'], ['uppercase', 'UPPERCASE'], ['lowercase', 'lowercase'], ['capitalize', 'Capitalize']])),
      row('Decoration', 'text-decoration', select_('text-decoration', [['none', 'None'], ['underline', 'Underline'], ['line-through', 'Strike']]))]));
    el.append(sec('backgrounds', 'Backgrounds', ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat'], () => [
      row('Color', 'background-color', color('background-color')),
      row('Image', 'background-image', unit('background-image', { ph: 'url(…) or gradient' })),
      h('div', { class: 'hint' }, 'e.g. url("../../loom/assets/…") or linear-gradient(135deg, #146ef5, #7fcfa5)'),
      row('Size', 'background-size', select_('background-size', [['cover', 'Cover'], ['contain', 'Contain'], ['auto', 'Auto']])),
      row('Position', 'background-position', select_('background-position', [['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']])),
      row('Repeat', 'background-repeat', seg('background-repeat', [['no-repeat', 'None'], ['repeat', 'Repeat']]))]));
    const sides = ['top', 'right', 'bottom', 'left'];
    el.append(sec('borders', 'Borders', ['border-radius', ...sides.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`])], () => [
      row('Radius', 'border-radius', unit('border-radius')),
      row('Width', sides.map((s) => `border-${s}-width`), allSides('width', 'unit')),
      row('Style', sides.map((s) => `border-${s}-style`), allSides('style', 'select')),
      row('Color', sides.map((s) => `border-${s}-color`), allSides('color', 'color')),
      h('p', { class: 'hint', style: { margin: 0 } }, 'Applies to all four sides.')]));
    el.append(sec('effects', 'Effects', ['opacity', 'box-shadow', 'transform', 'transition', 'cursor'], () => [
      row('Opacity', 'opacity', h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 52px', gap: '6px', alignItems: 'center' } },
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: effective('opacity') ?? 1, 'aria-label': 'Opacity', oninput: (e) => { setProp('opacity', e.target.value, { render: false }); e.target.nextSibling.value = e.target.value; }, onchange: () => renderRight() }), h('input', { class: 'in', value: getSet('opacity') ?? '', placeholder: effective('opacity') ?? '1', 'data-fk': 'opacity', onchange: (e) => setProp('opacity', e.target.value) }))),
      row('Shadow', 'box-shadow', select_('box-shadow', [['none', 'None'], ['0 1px 2px rgba(0,0,0,.08)', 'Subtle'], ['0 8px 24px -8px rgba(0,0,0,.18)', 'Soft'], ['0 24px 60px -20px rgba(0,0,0,.35)', 'Deep'], ['0 0 0 1px rgba(0,0,0,.08), 0 12px 32px -12px rgba(0,0,0,.25)', 'Card']])),
      row('Transform', 'transform', unit('transform', { ph: 'e.g. translateY(-4px) scale(1.02)' })),
      row('Transition', 'transition', select_('transition', [['all .2s ease', 'All · 0.2s'], ['all .4s cubic-bezier(.16,1,.3,1)', 'All · 0.4s smooth'], ['opacity .2s', 'Opacity · 0.2s'], ['transform .3s ease', 'Transform · 0.3s']])),
      row('Cursor', 'cursor', select_('cursor', [['pointer', 'Pointer'], ['default', 'Default'], ['text', 'Text'], ['not-allowed', 'Not allowed']])),
      h('p', { class: 'hint', style: { margin: 0 } }, 'Tip: switch the Selector state to “Hover” to design hover effects.')]));
  }
  function allSides(part, kind) {
    const sides = ['top', 'right', 'bottom', 'left'], props = sides.map((s) => `border-${s}-${part}`);
    const v = getSet(props[0]), inh = getInherited(props[0]);
    const apply = (val) => { const o = {}; props.forEach((p) => (o[p] = val)); setMany(o); };
    if (kind === 'select') return h('select', { class: 'in', 'data-fk': 'b-style', 'aria-label': 'Border style', onchange: (e) => apply(e.target.value) }, h('option', { value: '' }, inh ? `— ${inh.v}` : '—'), ...['solid', 'dashed', 'dotted', 'none'].map((o) => h('option', { selected: v === o }, o)));
    if (kind === 'color') return color(props[0], (val, o) => { const obj = {}; props.forEach((p) => (obj[p] = val)); Object.entries(obj).forEach(([k, x], j, arr) => setProp(k, x, { render: j === arr.length - 1 && !(o && o.render === false) })); });
    const i = h('input', { class: 'in', value: v ?? '', placeholder: inh ? inh.v : computed(props[0]), 'data-fk': 'b-width', 'aria-label': 'Border width', onchange: (e) => apply(normalize('border-width', e.target.value)) });
    return h('div', { class: 'unit' }, i);
  }
  function assignClass(name) {
    const n = curNode(); if (!n || !name) return;
    const existed = !!P.classes[name];
    if (!existed) { P.classes[name] = n.cls && P.classes[n.cls] ? L.clone(P.classes[n.cls]) : { base: {} }; }
    n.cls = name; commit('tree'); toast(existed ? `Using existing class “${name}”` : `Created class “${name}”`);
  }

  /* ------------------------------------------------------------ right panel: settings */
  function renderSettings(el) {
    if (sel === 'body') { el.append(h('div', { class: 'empty' }, 'Body settings live in the Pages panel (name, slug, SEO title). Style the Body to set site-wide fonts, colours and background.')); return; }
    const n = curNode(); if (!n) return; const d = L.EL[n.type] || {};
    const set = (fn) => (e) => { fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value); commit('tree'); };
    const g = h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, `${d.label || n.type} settings`));
    const f = (label, ctl, hint) => h('div', { class: 'field' }, h('label', {}, label), ctl, hint ? h('span', { class: 'hint' }, hint) : '');
    if (d.tags) g.append(f('Tag', h('select', { class: 'in', onchange: set((v) => { if (v === d.tag) delete n.tag; else n.tag = v; }) }, ...d.tags.map((t) => h('option', { selected: (n.tag || d.tag) === t }, t)))));
    if (d.textual) g.append(f('Text', h('textarea', { class: 'in', style: { fontFamily: 'var(--ui-font)', fontSize: '12px' }, onchange: set((v) => (n.text = v)) }, n.text || ''), 'Or double-click the text on the canvas.'));
    if (n.type === 'link' || n.type === 'button' || (n.tag === 'a')) {
      const href = n.attrs.href || '';
      g.append(f('Link to page', h('select', { class: 'in', onchange: set((v) => { if (v) n.attrs.href = 'page:' + v; }) }, h('option', { value: '' }, href.startsWith('page:') ? '—' : 'Choose a page…'), ...P.pages.map((pg) => h('option', { value: pg.id, selected: href === 'page:' + pg.id }, pg.name)))),
        f('Or URL', h('input', { class: 'in', value: href.startsWith('page:') ? '' : href, placeholder: 'https://…, mailto:…, #section', onchange: set((v) => (n.attrs.href = v)) })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: n.attrs.target === '_blank', onchange: set((v) => { if (v) n.attrs.target = '_blank'; else delete n.attrs.target; }) }), 'Open in new tab'));
    }
    if (n.type === 'image') {
      const up = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const a = await uploadAsset(e.target.files[0]); n.attrs.src = a.src; commit('tree'); } });
      g.append(f('Image source', h('input', { class: 'in', value: n.attrs.src && n.attrs.src.startsWith('data:') ? '(embedded image)' : n.attrs.src || '', onchange: set((v) => (n.attrs.src = v)) })),
        h('div', { style: { display: 'flex', gap: '6px' } }, h('button', { class: 'btn', type: 'button', onclick: () => up.click() }, 'Upload…'), h('button', { class: 'btn', type: 'button', onclick: () => { leftTab = 'assets'; renderRail(); renderLeft(); } }, 'From assets'), up),
        f('Alt text', h('input', { class: 'in' + (!n.attrs.alt ? ' warn' : ''), value: n.attrs.alt || '', placeholder: 'Describe the image (required for accessibility)', onchange: set((v) => (n.attrs.alt = v)) }), n.attrs.alt ? '' : '⚠ Missing alt text — screen readers need it. Leave empty only if decorative.'));
    }
    if (n.type === 'video') g.append(f('Video URL', h('input', { class: 'in', value: n.attrs.src || '', placeholder: 'https://…/video.mp4', onchange: set((v) => (n.attrs.src = v)) })),
      ...['controls', 'autoplay', 'muted', 'loop'].map((k) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!n.attrs[k], onchange: set((v) => { if (v) n.attrs[k] = k; else delete n.attrs[k]; }) }), k)));
    if (d.embed) g.append(f('HTML code', h('textarea', { class: 'in', style: { minHeight: '160px' }, onchange: set((v) => (n.html = v)) }, n.html || ''), 'Scripts run on the published site. Paste embeds (maps, forms, videos) here.'));
    g.append(f('ID', h('input', { class: 'in', value: n.attrs.id || '', placeholder: 'For #anchor links', onchange: set((v) => { v = L.slug(v); if (v) n.attrs.id = v; else delete n.attrs.id; }) })));
    el.append(g);
    el.append(h('div', { class: 'grp' }, h('p', { class: 'grp__t' }, 'Element'), h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', { class: 'btn', type: 'button', onclick: () => move(-1), title: 'Move up (⌥↑)' }, ic('up'), 'Up'), h('button', { class: 'btn', type: 'button', onclick: () => move(1), title: 'Move down (⌥↓)' }, ic('down'), 'Down'),
      h('button', { class: 'btn', type: 'button', onclick: selectParent, title: 'Select parent (Esc)' }, 'Parent'), h('button', { class: 'btn', type: 'button', onclick: duplicate, title: 'Duplicate (⌘D)' }, ic('copy'), 'Duplicate'),
      h('button', { class: 'btn btn--danger', type: 'button', onclick: del, title: 'Delete (⌫)' }, ic('trash'), 'Delete'))));
  }

  /* ------------------------------------------------------------ boot */
  function renderAll() { renderTop(); renderRail(); renderLeft(); renderRight(); renderCrumbs(); }

  /* ------------------------------------------------------------ bridge for Loom AI (ai-panel.js) */
  window.LoomEditor = {
    get project() { return P; }, get page() { return page; }, get user() { return window.__loomUser || null; },
    checkpoint() { pushHistory(); return JSON.stringify({ P, pageId: page.id }); },
    /** Re-render everything after agents changed P in place. */
    refresh() {
      P.pages.forEach((pg) => L.ensureTreeClasses(P, pg.tree));
      page = P.pages.find((x) => x.id === page.id) || P.pages[0];
      if (sel && sel !== 'body' && !L.find(page.tree, sel)) sel = null;
      mountFrame(); renderTop(); renderRight(); renderCrumbs(); pushHistory(); markDirty();
    },
    restore(snap) { const d = JSON.parse(snap); P = d.P; page = P.pages.find((x) => x.id === d.pageId) || P.pages[0]; sel = null; mountFrame(); renderTop(); renderRight(); renderCrumbs(); pushHistory(); markDirty(); },
    switchPage: (id) => switchPage(id), select: (id) => select(id), toast,
    publish: () => $('[data-act="publish"]').click()
  };
  (async () => {
    const user = await LoomAuth.require(); window.__loomUser = user;
    LoomAuth.menu($('[data-user]'), user);
    const id = new URLSearchParams(location.search).get('project');
    P = id ? await L.load(id) : null;
    if (!P) { document.body.innerHTML = `<div class="empty" style="padding:80px">Project not found in your account. <a href="app.html" style="color:#5aa2ff">Back to projects</a></div>`; return; }
    document.title = `${P.name} — Loom`;
    page = P.pages.find((x) => x.slug === 'index') || P.pages[0];
    renderAll(); mountFrame(); pushHistory();
    setStatus(user.guest ? 'Guest — saved in browser' : 'Saved', 'ok');
  })();
})();
