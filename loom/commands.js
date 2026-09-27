/* LOOM — command engine: plain words → real edits.
   "Say it. Weave it." A request is split into clauses ("change the headline to 'Hello' and make it bigger"),
   each clause is classified (text, style, add, remove, move, duplicate, link, image, page, nav, editor action)
   and handed to the specialist who owns that kind of work. Targets are resolved when the step runs, against
   the live project, the page you're on, the element you've selected, and "it" (whatever was changed last).
   Everything becomes validated ops (agents.js applyOps), so every change is undoable. */
(() => {
  'use strict';
  const L = window.Loom, A = () => window.LoomAgents, U = () => window.LoomAgents.util;
  const lc = (s) => String(s || '').toLowerCase();
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const short = (s, n = 48) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /* ---------------------------------------------------------------- splitting */
  const VERB = 'add|insert|put|place|create|include|append|change|set|update|edit|make|turn|rename|replace|remove|delete|drop|hide|show|move|swap|duplicate|clone|copy|link|point|connect|use|give|increase|decrease|reduce|enlarge|shrink|center|centre|align|go|open|switch|preview|publish|undo|select|rewrite|write|translate|bold|italicize|underline|capitalize|uppercase';
  function protect(s) { const q = []; const t = String(s).replace(/(["“‘])([^"”’]*?)(["”’])|(^|\s)'([^']+?)'(?=[\s.,!?;:]|$)/g, (m, a, b, c, pre, d) => { q.push(b !== undefined ? b : d); return `${pre || ''}§${q.length - 1}§`; }); return { t, q }; }
  const restore = (s, q) => String(s).replace(/§(\d+)§/g, (m, i) => `"${q[+i]}"`);
  function split(req) {
    const { t, q } = protect(String(req || '').trim());
    const parts = t.split(new RegExp(`\\s*(?:\\n+|;|\\.\\s+|,?\\s+(?:and\\s+)?then\\s+|,\\s*(?:and\\s+)?(?=(?:${VERB})\\b)|\\s+and\\s+(?:also\\s+)?(?=(?:${VERB})\\b)|\\s+also\\s+(?=(?:${VERB})\\b))\\s*`, 'i'));
    return parts.map((p) => restore(p, q).replace(/^\s*(please|pls|kindly|can you|could you|would you|will you|i want (?:you )?to|i'?d like (?:you )?to|i need (?:you )?to|we need to|let'?s|lets|now|also|and|just|go ahead and|try to)\s+/i, '').replace(/^\s*(please|can you|could you)\s+/i, '').replace(/[\s.!?]+$/, '').replace(/\s+please$/i, '').trim()).filter((p) => p.length > 1);
  }
  const quote = (s) => { const m = /["“‘]([^"”’]*)["”’]/.exec(s || ''); return m ? m[1] : null; };
  const unq = (s) => String(s || '').trim().replace(/^["“‘']|["”’']$/g, '').trim();

  /* ---------------------------------------------------------------- tree helpers */
  const home = (P) => P.pages.find((p) => p.slug === 'index') || P.pages[0];
  const flat = (list) => { const out = []; L.walk(list, (n, parent, i, arr) => out.push({ n, parent, list: arr })); return out; };
  const textOf = (n) => { let s = ''; L.walk([n], (x) => { if (x.text) s += ' ' + x.text; }); return s.trim(); };
  const clsIn = (n) => { const out = []; L.walk([n], (x) => { if (x.cls) out.push(x.cls); if (x.tag) out.push(x.tag); }); return out.join(' ').toLowerCase(); };
  const isNav = (n) => n.tag === 'nav' || /(^|\s|-)nav(\s|-|$)/.test(n.cls || '') && n.type === 'section';
  const isFoot = (n) => n.tag === 'footer' || /^foot/.test(n.cls || '') && n.type === 'section';
  const sections = (pg) => pg.tree.filter((n) => !isNav(n) && !isFoot(n));
  const findAll = (P, id) => { for (const pg of P.pages) { const f = L.find(pg.tree, id); if (f) return Object.assign(f, { page: pg }); } return null; };
  const topOf = (pg, id) => pg.tree.find((s) => L.contains(s, id));
  const SIG = { hero: /hero|display|poster/, pricing: /plan|pric|tier/, faq: /faq|accord|details/, testimonials: /quote|testi|review/, team: /member|team|person/, products: /p-card|product|shop|pdp/, stats: /stat|num|kpi/, logos: /logo-row|logos|client/, newsletter: /news|subscribe/, gallery: /gallery|work|shot/, features: /feat|card|benefit/, steps: /step|process/, contact: /contact|form|field/, cta: /cta|band/, marquee: /marquee/, manifesto: /manifesto/, showcase: /showcase|case/, bento: /bento/, dashboard: /dash|chart/, services: /service/, split: /split/, hscroll: /hscroll/, cart: /lshop|cart/, checkout: /co-grid|checkout/ };
  const KIND_WORDS = { hero: /\b(hero|banner|intro section|top section|header section)\b/, pricing: /\b(pricing|prices|plans?)\b/, faq: /\b(faqs?|questions)\b/, testimonials: /\b(testimonials?|reviews?|quotes?)\b/, team: /\b(team|people|staff)\b/, products: /\b(products?|shop|store)\b/, stats: /\b(stats|statistics|numbers|metrics)\b/, logos: /\b(logos|clients|partners)\b/, newsletter: /\b(newsletter|subscribe|mailing list)\b/, gallery: /\b(gallery|portfolio|photos)\b/, features: /\b(features?|benefits?)\b/, steps: /\b(steps|process|how it works)\b/, contact: /\b(contact|form)\b/, cta: /\b(cta|call to action)\b/, marquee: /\b(marquee|ticker)\b/, manifesto: /\b(manifesto|belief)\b/, showcase: /\b(showcase|case studies|work)\b/, bento: /\b(bento)\b/, dashboard: /\b(dashboard|charts?|kpis?)\b/, services: /\b(services)\b/, split: /\b(split|image and text|about section)\b/ };
  function kindOfSection(pg, s) { const i = sections(pg).indexOf(s); if (i === 0) return 'hero'; const c = clsIn(s); return Object.keys(SIG).find((k) => k !== 'hero' && SIG[k].test(c)) || null; }
  function sectionByKind(pg, k) { if (k === 'hero') return sections(pg)[0]; return sections(pg).find((s, i) => i > 0 && kindOfSection(pg, s) === k) || sections(pg).find((s) => SIG[k] && SIG[k].test(clsIn(s))); }
  const ORD = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4, last: -1, final: -1 };
  const ordOf = (t) => { const m = /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last|final)\b/.exec(t); return m ? ORD[m[1]] : null; };
  const pick = (arr, o) => (o == null ? arr[0] : o < 0 ? arr[arr.length - 1] : arr[o]);

  function pageNamed(P, words) {
    const t = lc(words).replace(/\b(the|page|tab|screen)\b/g, '').trim(); if (!t) return null;
    if (/^(home|homepage|landing|index|main)$/.test(t)) return home(P);
    return P.pages.find((p) => lc(p.name) === t || p.slug === L.slug(t)) || P.pages.find((p) => lc(p.name).includes(t) || t.includes(lc(p.name)));
  }

  /** Resolve a phrase ("the button in the hero", "it", "the 'Our story' heading") to nodes. */
  function resolve(phrase, P, ctx) {
    let t = lc(phrase).trim(); const q = quote(phrase);
    let pg = ctx.page(P);
    // page scope: "... on the about page"
    const pm = /\s+(?:on|in|from|of)\s+(?:the\s+)?([\w &'-]+?)\s+page\b/.exec(t); if (pm) { const p2 = pageNamed(P, pm[1]); if (p2) { pg = p2; t = t.replace(pm[0], ''); } }
    const out = (nodes, label, extra = {}) => ({ nodes: nodes.filter(Boolean), page: pg, label, ...extra });
    // this / it / selection
    if (/^(this|that|the selected|selected) section$/.test(t) && ctx.sel) { const f = findAll(P, ctx.sel); if (f) { const top = topOf(f.page, ctx.sel); return { nodes: [top], page: f.page, label: describeSection(f.page, top) }; } }
    if (/^(it|this|that|them|these|those|this one|that one|the same|selected|selection|the selected element|the selected one|the selection|this element|that element|the element|this item|that item)$/.test(t)) {
      const ids = /^(it|them|that|those|the same)\b/.test(t) && ctx.last && ctx.last.length ? ctx.last : ctx.sel ? [ctx.sel] : ctx.last || [];
      const nodes = ids.map((id) => findAll(P, id)).filter(Boolean); if (nodes.length) pg = nodes[0].page;
      return out(nodes.map((f) => f.node), nodes.length === 1 ? describe(nodes[0].node) : 'the selection');
    }
    // section scope: "the button in the hero", "the heading of the pricing section"
    let scope = null;
    const sm = /\s+(?:in|inside|within|of|from|under|at)\s+(?:the\s+)?(.+)$/.exec(t);
    if (sm && !/^(?:the\s+)?(top|bottom|end|start)\b/.test(sm[1])) { const r = resolveSection(sm[1], pg, P); if (r) { scope = r; t = t.slice(0, sm.index); } }
    if (!scope && /\b(footer|nav|navbar|navigation|menu|header)\b/.test(t) && t.replace(/\b(the|footer|nav|navbar|navigation|menu|header|'s)\b/g, '').trim()) { const reg = /\bfooter\b/.test(t) ? pg.tree.find(isFoot) : pg.tree.find(isNav); if (reg) { scope = reg; t = t.replace(/\b(in|of|on)?\s*(the\s+)?(footer|nav|navbar|navigation|menu|header)('s)?\b/g, ' ').replace(/\s+/g, ' ').trim() || 'text'; } }
    if (!scope && /\b(this|selected) section\b/.test(t) && ctx.sel) { const f = findAll(P, ctx.sel); if (f) { pg = f.page; scope = topOf(pg, ctx.sel); } }
    const pool = scope ? flat([scope]) : flat(pg.tree);
    const within = (fn) => pool.filter((x) => fn(x.n)).map((x) => x.n);
    const o = ordOf(t); const plural = /\b(all|every|each)\b/.test(t) || /\b(buttons|headings|headlines|images|photos|pictures|links|paragraphs|titles|cards|sections)\b/.test(t);
    const ret = (arr, label) => out(plural ? arr : [pick(arr, o)], label, { plural });
    // quoted text
    if (q) {
      const hits = within((n) => L.TEXTUAL(n) && n.text && lc(n.text).includes(lc(q)));
      const exact = hits.filter((n) => lc(n.text).trim() === lc(q).trim());
      const best = exact.length ? exact : hits;
      if (best.length) {
        if (/\bsection\b/.test(t)) { const s = topOf(pg, best[0].id); return out([s], `the “${short(q, 30)}” section`); }
        return ret(best, `“${short(best[0].text, 40)}”`);
      }
    }
    // whole regions
    if (/\b(nav|navbar|navigation|menu|header|top bar)\b/.test(t) && !/\b(link|item|button)s?\b/.test(t)) return out([pg.tree.find(isNav)], 'the navigation');
    if (/\bfooter\b/.test(t) && !/\b(link|text)s?\b/.test(t)) return out([pg.tree.find(isFoot)], 'the footer');
    const kind = Object.keys(KIND_WORDS).find((k) => KIND_WORDS[k].test(t));
    const isSectionWord = /\b(section|block|area|band|part|strip|row)\b/.test(t);
    // elements
    if (/\b(logo|brand ?name|wordmark)\b/.test(t)) return out(within((n) => n.cls === 'brand'), 'the logo');
    if (/\b(headline|main heading|main title|hero (title|heading|headline)|big title|page heading|h1)\b/.test(t) || (/\btitle\b/.test(t) && !/\b(page|seo|meta|section|card)\b/.test(t) && !scope)) {
      const h1 = within((n) => n.type === 'heading' && (n.tag || 'h2') === 'h1'); const any = within((n) => n.type === 'heading');
      return ret(h1.length ? h1 : any, 'the headline');
    }
    const hm = /\bh([1-6])s?\b/.exec(t); if (hm) return ret(within((n) => n.type === 'heading' && (n.tag || 'h2') === 'h' + hm[1]), `the H${hm[1]}`);
    if (/\b(sub-?headings?|sub-?titles?|sub-?headlines?|taglines?|intro text|lead text|hero text|hero paragraph|description|sub ?text|supporting text)\b/.test(t)) {
      const sc = scope || sections(pg)[0]; const ps = flat([sc]).map((x) => x.n).filter((n) => n.type === 'paragraph' || n.type === 'text');
      return ret(ps, 'the subheading');
    }
    if (/\b(buttons?|cta|call to action|ctas)\b/.test(t)) {
      let bs = within((n) => n.type === 'button'); if (!scope && !plural) { const hero = sections(pg)[0]; const hb = hero ? flat([hero]).map((x) => x.n).filter((n) => n.type === 'button') : []; if (hb.length && !/\b(nav|menu|header)\b/.test(t)) bs = hb; }
      if (/\b(secondary|second|ghost|outline)\b/.test(t) && bs.length > 1 && o == null) return out([bs[1]], 'the secondary button');
      if (/\b(nav|menu|header)\b/.test(t)) { const nv = pg.tree.find(isNav); bs = nv ? flat([nv]).map((x) => x.n).filter((n) => n.type === 'button') : []; }
      return ret(bs, plural ? 'the buttons' : 'the button');
    }
    if (/\b(images?|photos?|pictures?|illustrations?|graphics?|hero image)\b/.test(t)) { let im = within((n) => n.type === 'image' && n.cls !== 'brand-logo'); if (!scope && !plural && /\bhero\b/.test(t)) im = flat([sections(pg)[0]]).map((x) => x.n).filter((n) => n.type === 'image'); return ret(im, 'the image'); }
    if (/\b(videos?)\b/.test(t)) return ret(within((n) => n.type === 'video'), 'the video');
    if (/\b(menu items?|nav links?|navigation links?)\b/.test(t)) { const nv = pg.tree.find(isNav); return out(nv ? flat([nv]).map((x) => x.n).filter((n) => n.type === 'link' && n.cls !== 'brand') : [], 'the menu links', { plural: true }); }
    if (/\blinks?\b/.test(t)) return ret(within((n) => n.type === 'link' && n.cls !== 'brand'), 'the link');
    if (/\b(paragraphs?|body text|copy|text)\b/.test(t) && !isSectionWord) return ret(within((n) => n.type === 'paragraph' || n.type === 'text'), 'the text');
    if (/\b(headings?|titles?)\b/.test(t) && !isSectionWord) return ret(within((n) => n.type === 'heading'), 'the heading');
    if (/\bcards?\b/.test(t)) return ret(within((n) => /card|item|cell|plan|member|tile/.test(n.cls || '') && L.HAS_KIDS(n)), 'the card');
    if (/\b(dividers?|lines?|separators?)\b/.test(t)) return ret(within((n) => n.type === 'divider'), 'the divider');
    // sections
    if (scope && !kind && !/\w/.test(t.replace(/\b(the|a|an)\b/g, ''))) return out([scope], describeSection(pg, scope));
    if (kind || isSectionWord) {
      if (kind) { const s = sectionByKind(pg, kind); if (s) return out([s], `the ${kind === 'hero' ? 'hero' : kind} section`); }
      if (isSectionWord) { const ss = sections(pg); if (/\ball sections\b/.test(t)) return out(ss, 'every section', { plural: true }); const s = pick(ss, o); if (s && o != null) return out([s], `the ${Object.keys(ORD).find((k) => ORD[k] === o) || ''} section`); }
    }
    if (/\b(page|site|website|whole thing|everything|body)\b/.test(t)) return out([], 'the site', { site: true });
    if (scope) return out([scope], describeSection(pg, scope));
    // fuzzy: words that appear in a text node
    const words = t.replace(/\b(the|a|an|my|our|that|which|says?|text|with|of)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (words.length > 3) { const hit = within((n) => L.TEXTUAL(n) && n.text && lc(n.text).includes(words)); if (hit.length) return ret(hit, `“${short(hit[0].text, 40)}”`); }
    return out([], phrase);
  }
  function resolveSection(words, pg, P) {
    const t = lc(words); const q = quote(words);
    if (q) { const hit = flat(pg.tree).find((x) => L.TEXTUAL(x.n) && x.n.text && lc(x.n.text).includes(lc(q))); if (hit) return topOf(pg, hit.n.id); }
    if (/\b(nav|navbar|navigation|menu|header)\b/.test(t)) return pg.tree.find(isNav);
    if (/\bfooter\b/.test(t)) return pg.tree.find(isFoot);
    const kind = Object.keys(KIND_WORDS).find((k) => KIND_WORDS[k].test(t)); if (kind) return sectionByKind(pg, kind);
    const o = ordOf(t); if (o != null && /\bsection\b/.test(t)) return pick(sections(pg), o);
    // a section whose heading contains these words
    const w = t.replace(/\b(the|section|block|area)\b/g, '').trim();
    if (w.length > 2) { const hit = flat(pg.tree).find((x) => x.n.type === 'heading' && lc(x.n.text).includes(w)); if (hit) return topOf(pg, hit.n.id); }
    return null;
  }
  function describe(n) { if (!n) return 'it'; if (n.type === 'heading') return `the heading “${short(n.text, 32)}”`; if (n.type === 'button') return `the “${short(n.text, 24)}” button`; if (L.TEXTUAL(n)) return `“${short(n.text, 36)}”`; if (n.type === 'image') return 'the image'; if (n.tag === 'nav') return 'the navigation'; if (n.tag === 'footer') return 'the footer'; return `the ${L.nodeLabel(n)}`; }
  function describeSection(pg, s) { const k = kindOfSection(pg, s); if (k) return `the ${k} section`; const h = flat([s]).find((x) => x.n.type === 'heading'); return h ? `the “${short(h.n.text, 28)}” section` : 'the section'; }

  /* ---------------------------------------------------------------- values */
  const EXTRA_COLORS = { white: '#FFFFFF', 'off-white': '#F7F5F0', cream: '#F4EEDC', beige: '#E8DCC4', charcoal: '#222428', silver: '#C0C4CC', maroon: '#7A1F2B', turquoise: '#1FB5AC', peach: '#FFB38A', salmon: '#FA8072', skyblue: '#5EB7FF', 'sky blue': '#5EB7FF', 'light blue': '#8EC5FF', 'dark blue': '#123A7A', 'dark green': '#135C3A', 'light green': '#9BE3B0', 'light grey': '#D5D8DE', 'light gray': '#D5D8DE', 'dark grey': '#3A3D44', 'dark gray': '#3A3D44' };
  function colorVal(t) {
    t = lc(t); const hex = /#(?:[0-9a-f]{3}){1,2}\b/i.exec(t); if (hex) return hex[0].toUpperCase();
    const rgb = /rgba?\([\d\s.,%]+\)/.exec(t); if (rgb) return rgb[0];
    const sw = /\b(brand|accent|primary|ink|paper|muted|soft|line)\b(?:\s+colou?r)?/.exec(t); if (sw && !/\bcolou?r\s+(to|of)\b/.test(t.slice(sw.index - 8, sw.index))) return `var(--sw-${sw[1] === 'primary' || sw[1] === 'accent' ? 'brand' : sw[1]})`;
    const ex = Object.keys(EXTRA_COLORS).sort((a, b) => b.length - a.length).find((k) => new RegExp(`\\b${k}\\b`).test(t)); if (ex) return EXTRA_COLORS[ex];
    const c = U().colorIn(t); if (c) return c;
    if (/\bdark\b/.test(t)) return 'var(--sw-ink)'; if (/\blight\b/.test(t)) return 'var(--sw-paper)';
    if (/\btransparent|no background|none\b/.test(t)) return 'transparent';
    return null;
  }
  const lum = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex === 'var(--sw-ink)' ? 0 : hex === 'var(--sw-paper)' ? 1 : 0.5; const v = parseInt(m[1], 16); const ch = [v >> 16, (v >> 8) & 255, v & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]; };
  const len = (t) => { const m = /(-?\d+(?:\.\d+)?)\s*(px|rem|em|%|vw|vh)?\b/.exec(t); return m ? m[1] + (m[2] || 'px') : null; };
  function scaled(v, f, fallback) { const base = v && String(v).trim() || fallback; if (!base) return null; const m = /^calc\((.+) \* ([\d.]+)\)$/.exec(base); if (m) { const nf = Math.round(parseFloat(m[2]) * f * 100) / 100; return nf === 1 ? m[1] : `calc(${m[1]} * ${nf})`; } const px = /^(\d+(?:\.\d+)?)px$/.exec(base); if (px) return Math.round(parseFloat(px[1]) * f) + 'px'; return `calc(${base} * ${f})`; }
  const styleOf = (P, n, prop, bp = 'base') => { const c = n && n.cls && P.classes[n.cls]; return c && ((c[bp] && c[bp][prop]) || (c.base && c.base[prop])) || ''; };
  const BP = (t) => (/\b(mobile|phones?|small screens?)\b/.test(t) ? 'landscape' : /\b(tablets?|ipad)\b/.test(t) ? 'tablet' : 'base');
  const HOVER = (t) => (/\b(on hover|hover|when hovered|mouse ?over)\b/.test(t) ? ':hover' : '');
  const FONT_SIZE_DEF = (n) => (n.type === 'heading' ? { h1: '64px', h2: '40px', h3: '28px', h4: '22px', h5: '18px', h6: '16px' }[n.tag || 'h2'] : n.type === 'button' ? '16px' : '17px');

  /* ---------------------------------------------------------------- style parsing */
  // returns [{prop, value}] for one node, or null if the clause is not about style
  function styleFor(t, n, P) {
    const out = []; const add = (prop, value) => value != null && out.push({ prop, value });
    const isText = n && (L.TEXTUAL(n) && n.type !== 'button'); const isBox = n && !isText;
    const f = /\b(much|way|a lot|lot|significantly)\b/.test(t) ? 1.5 : /\b(slightly|a bit|a little|bit|little)\b/.test(t) ? 1.1 : 1.25;
    const col = colorVal(t.replace(/\b(dark|light)\s+(mode|theme)\b/, ''));
    if (/\b(background|bg|backdrop|fill)\b/.test(t) && col) { add('background-color', col); if (n && n.type !== 'button' && !isText) { const l = lum(col); if (l < 0.25 || col === 'var(--sw-ink)') add('color', 'var(--sw-paper)'); else if (l > 0.6) add('color', 'var(--sw-ink)'); } }
    else if (/\b(border|outline)\s*colou?r\b/.test(t) && col) add('border-color', col);
    else if (/\b(text|font)\s*colou?r\b/.test(t) && col) add('color', col);
    else if (col) add(isBox ? 'background-color' : 'color', col);
    if (/\b(outline|ghost|outlined)\b/.test(t) && n && n.type === 'button') { add('background-color', 'transparent'); add('color', 'currentColor'); add('border', '1.5px solid currentColor'); }
    // size
    const px = /\b(\d+(?:\.\d+)?)\s*(px|rem|em)\b/.exec(t);
    if (/\b(font ?size|text size|size)\b/.test(t) && px && isText) add('font-size', px[1] + px[2]);
    else if (/\b(bigger|larger|huge|enlarge|increase (the )?(font|text|size)|grow)\b/.test(t) && n) { if (n.type === 'image') add('width', '100%'); else add('font-size', scaled(styleOf(P, n, 'font-size'), f, FONT_SIZE_DEF(n))); if (n.type === 'button') { add('padding-top', scaled(styleOf(P, n, 'padding-top'), f, '14px')); add('padding-bottom', scaled(styleOf(P, n, 'padding-bottom'), f, '14px')); add('padding-left', scaled(styleOf(P, n, 'padding-left'), f, '26px')); add('padding-right', scaled(styleOf(P, n, 'padding-right'), f, '26px')); } }
    else if (/\b(smaller|tiny|shrink|reduce (the )?(font|text|size)|decrease (the )?(font|text|size))\b/.test(t) && n) { if (n.type === 'image') add('max-width', '60%'); else add('font-size', scaled(styleOf(P, n, 'font-size'), 1 / f, FONT_SIZE_DEF(n))); }
    // type
    if (/\b(bold|bolder|heavier)\b/.test(t) && !/\bnot bold|unbold\b/.test(t)) add('font-weight', /\bextra|very|heav/.test(t) ? '800' : '700');
    if (/\b(not bold|unbold|lighter weight|thin(ner)?|regular weight)\b/.test(t)) add('font-weight', /thin/.test(t) ? '300' : '400');
    if (/\bitalic/.test(t)) add('font-style', /\bnot italic|no italic/.test(t) ? 'normal' : 'italic');
    if (/\bunderline/.test(t)) add('text-decoration', /\bno underline|remove (the )?underline/.test(t) ? 'none' : 'underline');
    if (/\b(uppercase|all caps|capitals|caps)\b/.test(t)) add('text-transform', 'uppercase'); else if (/\blowercase\b/.test(t)) add('text-transform', 'lowercase'); else if (/\b(capitali[sz]e|title case)\b/.test(t)) add('text-transform', 'capitalize');
    const fam = /\b(?:font(?: family)?|typeface)\s+(?:to|as|in)\s+["“]?([a-z][a-z0-9 ]{2,30}?)["”]?$/.exec(t) || /\b(?:use|in|with)\s+(?:the\s+)?["“]?([a-z][a-z0-9]+(?: [a-z][a-z0-9]+){0,2})["”]?\s+(?:font|typeface)\b/.exec(t);
    if (fam && n && !/^(a|the|bigger|smaller|different|new|serif|sans|nice|better)$/.test(fam[1])) add('font-family', `"${fam[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())}", var(--font-body)`);
    // alignment
    const al = /\b(center|centre|centered|centred|middle)\b/.test(t) ? 'center' : /\bleft\b/.test(t) && /\balign|left[- ]aligned|to the left\b/.test(t) ? 'left' : /\bright\b/.test(t) && /\balign|right[- ]aligned|to the right\b/.test(t) ? 'right' : /\bjustif/.test(t) ? 'justify' : null;
    if (al && /\b(align|center|centre|centered|centred|middle|left|right|justif)/.test(t)) { add('text-align', al); if (n && L.HAS_KIDS(n) && !isText) { const disp = styleOf(P, n, 'display'); if (/flex/.test(disp)) add('justify-content', al === 'center' ? 'center' : al === 'right' ? 'flex-end' : 'flex-start'); } if (n && n.type === 'button') { add('display', 'table'); add('margin-left', al === 'left' ? '0' : 'auto'); add('margin-right', al === 'right' ? '0' : 'auto'); } }
    // shape
    if (/\b(rounded|round|pill|curved|soft corners?)\b/.test(t)) add('border-radius', /\bpill|fully\b/.test(t) ? '999px' : /\bslightly|a bit|little\b/.test(t) ? '6px' : '14px');
    if (/\b(square|sharp|no radius|straight corners?)\b/.test(t)) add('border-radius', '0');
    const rad = /\b(?:radius|corners?)\s+(?:to|of)?\s*(\d+)\s*px/.exec(t); if (rad) add('border-radius', rad[1] + 'px');
    // spacing
    const more = /\b(more|bigger|larger|extra|increase|add)\b.*\b(padding|space|spacing|breathing room|room)\b|\b(padding|space|spacing)\b.*\b(more|bigger|larger|increase)\b|\bspacious|airy|roomier\b/.test(t);
    const less = /\b(less|smaller|reduce|decrease|tighter|tighten|remove)\b.*\b(padding|space|spacing|gap)\b|\b(padding|space|spacing)\b.*\b(less|smaller|reduce|decrease)\b|\bcompact|tighter\b/.test(t);
    const pv = /\bpadding\s+(?:to|of)?\s*(\d+\s*(?:px|rem|em)?)/.exec(t);
    if (pv && n) { const v = len(pv[1]); ['padding-top', 'padding-bottom', ...(n.type !== 'section' ? ['padding-left', 'padding-right'] : [])].forEach((p) => add(p, v)); }
    else if ((more || less) && n && !/\bgap\b/.test(t)) { const k = more ? f : 1 / f; const d = n.type === 'section' || isNav(n) ? '96px' : '16px'; ['padding-top', 'padding-bottom'].forEach((p) => add(p, scaled(styleOf(P, n, p), k, d))); }
    if (/\bgap\b/.test(t) && (more || less || len(t)) && n) { const v = len(t.replace(/.*\bgap\b/, '')); add('gap', v || scaled(styleOf(P, n, 'gap') || styleOf(P, n, 'column-gap'), more ? f : 1 / f, '24px')); }
    const mg = /\bmargin(?:[- ](top|bottom))?\s+(?:to|of)?\s*(\d+\s*(?:px|rem|em)?)/.exec(t); if (mg) add(mg[1] ? `margin-${mg[1]}` : 'margin', len(mg[2]));
    // box
    if (/\bfull[- ]?width\b/.test(t)) { add('width', '100%'); if (n && n.type !== 'image') add('max-width', 'none'); }
    const w = /\bwidth\s+(?:to|of)?\s*(\d+\s*(?:px|%|rem|vw)?)/.exec(t); if (w) add('width', len(w[1]));
    const mw = /\bmax[- ]width\s+(?:to|of)?\s*(\d+\s*(?:px|%|rem)?)/.exec(t); if (mw) add('max-width', len(mw[1]));
    const hh = /\bheight\s+(?:to|of)?\s*(\d+\s*(?:px|%|vh|rem)?)/.exec(t); if (hh) add('height', len(hh[1]));
    if (/\b(shadow|elevat|lift|float)\b/.test(t)) add('box-shadow', /\bno shadow|remove (the )?shadow\b/.test(t) ? 'none' : '0 20px 50px -20px rgba(0,0,0,.35)');
    if (/\bborder\b/.test(t) && !/\bborder\s*colou?r\b/.test(t) && !/\bradius\b/.test(t)) add('border', /\bno border|remove (the )?border\b/.test(t) ? '0' : `1px solid ${col || 'var(--sw-line)'}`);
    const op = /\b(?:opacity|transparen\w*)\s+(?:to|of)?\s*(\d+)\s*%?/.exec(t); if (op) add('opacity', String(Math.min(100, +op[1]) / 100)); else if (/\b(semi-?transparent|faded|fade it)\b/.test(t)) add('opacity', '0.6');
    const ls = /\b(letter[- ]spacing|tracking)\b/.test(t); if (ls) add('letter-spacing', /\b(tight|less|reduce|decrease)\b/.test(t) ? '-0.02em' : len(t.replace(/.*(spacing|tracking)/, '')) || '0.08em');
    const lh = /\bline[- ]height\s+(?:to|of)?\s*([\d.]+)/.exec(t); if (lh) add('line-height', lh[1]); else if (/\b(more|increase)\b.*\bline[- ]height|\bline[- ]height\b.*\b(more|increase)|\bmore leading\b/.test(t)) add('line-height', '1.7');
    return out.length ? out : null;
  }

  /* ---------------------------------------------------------------- element specs */
  const EL_WORDS = [['button', /\b(button|cta|call to action)\b/], ['heading', /\b(sub-?heading|heading|headline|title)\b/], ['image', /\b(image|photo|picture|illustration|graphic)\b/], ['video', /\bvideo\b/], ['divider', /\b(divider|separator|horizontal line|line|rule)\b/], ['list', /\b(list|bullet points|bullets)\b/], ['link', /\blink\b/], ['paragraph', /\b(paragraph|text|copy|description|sentence|line of text|caption|note)\b/], ['spacer', /\b(spacer|space|gap|whitespace)\b/], ['embed', /\b(embed|code|html|widget|iframe|map)\b/], ['grid', /\bgrid\b/], ['columns', /\bcolumns?\b/], ['div', /\b(container|box|card|div|wrapper|block)\b/]];
  function elementOf(t) { for (const [k, re] of EL_WORDS) if (re.test(t)) return k; return null; }
  const DEFAULT_TEXT = { button: 'Get started', heading: 'A clear, useful heading', paragraph: 'Say one useful thing here, in a short sentence your visitors will remember.', link: 'Learn more' };

  function hrefFor(P, words) {
    const t = unq(words).trim(); if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t; if (/^www\./i.test(t)) return 'https://' + t;
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return 'mailto:' + t; if (/^\+?[\d\s()-]{7,}$/.test(t)) return 'tel:' + t.replace(/[^\d+]/g, '');
    if (/^#[\w-]+$/.test(t)) return t;
    const pg = pageNamed(P, t.replace(/\s+page$/i, '')); if (pg) return 'page:' + pg.id;
    if (/^[\w-]+\.(com|net|org|io|co|app|dev|design|studio|shop|bd|uk)(\/\S*)?$/i.test(t)) return 'https://' + t;
    return null;
  }
  const textAfter = (s) => { const q = quote(s); if (q != null) return q; const m = /\b(?:saying|that says|which says|reading|that reads|called|named|titled|label(?:l)?ed|with (?:the )?(?:text|label|title|words?))\s*:?\s+(.+?)(?:\s+(?:linking|that links|which links|that goes|going|pointing)\s+to\b.*)?$/i.exec(s); return m ? unq(m[1]) : null; };
  const linkAfter = (s) => { const m = /\b(?:linking|that links|which links|that goes|going|goes|pointing|points|link(?:ed)?|leading)\s+to\s+(?:the\s+)?(.+?)$/i.exec(s); return m ? m[1] : null; };

  /** Where does a new element go? Returns {target, pos, page} for insertNode. */
  function placeFor(type, posWord, anchorPhrase, P, ctx) {
    const pg = ctx.page(P);
    let anchor = null, apage = pg;
    if (anchorPhrase) { const r = resolve(anchorPhrase, P, ctx); anchor = r.nodes[0] || null; apage = r.page; }
    else if (ctx.sel) { const f = findAll(P, ctx.sel); if (f) { anchor = f.node; apage = f.page; if (!posWord) posWord = L.HAS_KIDS(anchor) && anchor.tag !== 'nav' ? 'in' : 'after'; } }
    if (!anchor) { anchor = sections(pg)[0]; posWord = posWord || 'in'; }
    if (!anchor) return { page: pg };
    const pw = lc(posWord || 'in');
    const isTop = apage.tree.includes(anchor);
    if (/^(in|into|inside|to|within|at the (?:bottom|end) of|on)$/.test(pw) || (isTop && !/^(after|below|under|beneath|before|above)$/.test(pw))) {
      // put it where similar things already live in that section
      const inner = flat([anchor]).map((x) => x);
      const same = inner.filter((x) => x.n.type === type && x.n !== anchor);
      if (same.length) { const ref = type === 'button' || type === 'image' ? same[same.length - 1].n : same[0].n; return { target: ref.id, pos: 'after', page: apage, cls: ref.cls, tag: ref.tag }; }
      const txt = inner.filter((x) => (x.n.type === 'paragraph' || x.n.type === 'heading' || x.n.type === 'button') && x.n !== anchor);
      if (txt.length) return { target: txt[txt.length - 1].n.id, pos: 'after', page: apage };
      if (L.HAS_KIDS(anchor)) return { target: anchor.id, pos: 'inside', page: apage };
      return { target: anchor.id, pos: 'after', page: apage };
    }
    if (/^at the (?:top|start|beginning) of$/.test(pw)) { const firstText = flat([anchor]).find((x) => x.n !== anchor && (L.TEXTUAL(x.n) || x.n.type === 'image')); return firstText ? { target: firstText.n.id, pos: 'before', page: apage } : { target: anchor.id, pos: 'first', page: apage }; }
    if (/^(before|above|on top of)$/.test(pw)) return { target: anchor.id, pos: 'before', page: apage };
    return { target: anchor.id, pos: 'after', page: apage }; // after / below / under / beneath / next to
  }

  /* ---------------------------------------------------------------- the handlers */
  // Each returns null (not mine) or { agent, run(P, ctx) → { ops, reply, report?, actions?, focus? } }.
  const H = [];
  const def = (agent, test, run) => H.push({ agent, test, run });
  const R = (level, title, detail = '') => ({ level, title, detail });
  const miss = (what) => ({ ops: [], reply: `I couldn’t find ${what} on this page.`, report: [R('info', 'Tip', 'Select the element on the canvas and say “this”, or quote its text, e.g. change “Our story” to “About us”.')] });

  // editor actions
  def('director', (t) => /^(show (me )?(a |the )?preview|preview( it| the site| mode)?|open preview)$/.test(t), () => ({ ops: [], reply: 'Opening the live preview. Press Esc to come back.', actions: [{ id: 'preview' }] }));
  def('devops', (t) => /^(publish|publish (it|the site|this|my site)|go live|make it live|launch( it)?)$/.test(t), () => ({ ops: [], reply: 'Opening Publish. Your site goes live on its Loom address first; domain and hosting come next.', actions: [{ id: 'publish' }] }));
  def('director', (t) => /^(go to|open|show( me)?|switch to|navigate to|take me to|edit)\s+(the\s+)?.+?\s*page$|^(go to|open|switch to|take me to)\s+(the\s+)?(home|homepage)$/.test(t), (t, raw, P) => { const pg = pageNamed(P, raw.replace(/^(go to|open|show( me)?|switch to|navigate to|take me to|edit)\s+/i, '')); return pg ? { ops: [], reply: `Opening the ${pg.name} page.`, actions: [{ id: 'goto', page: pg.id }] } : { ops: [], reply: 'I couldn’t find that page.', report: [R('info', 'Pages', P.pages.map((p) => p.name).join(', '))] }; });
  def('director', (t) => /^select\s+/.test(t), (t, raw, P, ctx) => { const r = resolve(raw.replace(/^select\s+/i, ''), P, ctx); return r.nodes[0] ? { ops: [], reply: `Selected ${r.label}.`, actions: [{ id: 'select', node: r.nodes[0].id, page: r.page.id }], focus: [r.nodes[0].id] } : miss(r.label); });

  // pages
  def('architect', (t) => /\b(add|create|make|build|new)\b.*\bpages?\b/.test(t) && !/\b(to|in|on)\s+(the\s+)?\w+\s+page\b/.test(t), (t, raw, P) => {
    let name = textAfter(raw) || (/(?:called|named|titled|for)\s+(?:an?\s+|the\s+)?(.+?)$/i.exec(raw) || [])[1] || (/(?:add|create|make|build|new)\s+(?:a|an|another|the)?\s*(?:new\s+)?(.+?)\s+pages?\b/i.exec(raw) || [])[1];
    name = unq(String(name || 'New page').replace(/\s+page$/i, '').replace(/\b(with|that|which|including)\b.*$/i, '')).trim(); name = cap(name).slice(0, 40) || 'New page';
    if (P.pages.some((p) => lc(p.name) === lc(name))) return { ops: [], reply: `There’s already a ${name} page.`, actions: [{ id: 'goto', page: pageNamed(P, name).id }] };
    const rest = lc(raw.split(/\b(with|including|that has)\b/i).slice(2).join(' '));
    const kind = Object.keys(KIND_WORDS).find((k) => k !== 'hero' && KIND_WORDS[k].test(rest)) || Object.keys(KIND_WORDS).find((k) => k !== 'hero' && KIND_WORDS[k].test(lc(name)));
    const ops = [{ op: 'addPage', value: name, section: { kind: 'hero', eyebrow: name, title: name === 'Careers' ? 'Do the best work of your career.' : `${name}`, text: `Everything you need to know about ${name.toLowerCase()} at ${P.name}.`, cta: 'Get in touch' } }];
    if (kind) ops.push({ op: 'addSection', page: name, section: Object.assign(U().sectionDefaults(kind, P), {}) });
    ops.push({ op: 'addSection', page: name, section: { kind: 'cta', title: 'Ready when you are.', text: 'Talk to us today.', cta: 'Contact us' } });
    ops.push({ op: 'addNavLink', page: name, value: name });
    return { ops, reply: `Added a ${name} page${kind ? ` with a ${kind} section` : ''} and put it in the menu on every page.`, actions: [{ id: 'goto', page: name }] };
  });
  def('architect', (t) => /^rename\b.*\bpage\b|\bpage name\b.*\bto\b/.test(t), (t, raw, P) => {
    const m = /rename\s+(?:the\s+)?(.+?)\s+page\s+(?:to|as)\s+(.+)$/i.exec(raw) || /rename\s+(?:the\s+)?page\s+(.+?)\s+(?:to|as)\s+(.+)$/i.exec(raw) || /(?:change|set)\s+(?:the\s+)?(.+?)\s+page(?:'s)?\s+name\s+to\s+(.+)$/i.exec(raw) || /(?:change|set)\s+(?:the\s+)?page name\s+(?:of\s+)?(.*?)\s*to\s+(.+)$/i.exec(raw);
    if (!m) return null; const pg = m[1] ? pageNamed(P, m[1]) : null; const cur = pg || null; const v = cap(unq(m[2]));
    if (!cur) return { ops: [], reply: `I couldn’t find the ${unq(m[1])} page.` };
    return { ops: [{ op: 'renamePage', page: cur.id, value: v }], reply: `Renamed the ${cur.name} page to ${v}, and updated its menu links.` };
  });
  def('architect', (t) => /\b(delete|remove|get rid of)\b.*\bpage\b/.test(t) && !/\b(from|on|in)\s+(the\s+)?\w+\s+page\b/.test(t), (t, raw, P) => {
    const m = /(?:delete|remove|get rid of)\s+(?:the\s+)?(.+?)\s+page\b/i.exec(raw) || /(?:delete|remove)\s+(?:the\s+)?page\s+(.+)$/i.exec(raw); const pg = m && pageNamed(P, m[1]);
    if (!pg) return { ops: [], reply: 'Which page? I couldn’t find it.', report: [R('info', 'Pages', P.pages.map((p) => p.name).join(', '))] };
    if (pg.slug === 'index') return { ops: [], reply: 'The home page can’t be deleted, but I can clear or rebuild it.' };
    return { ops: [{ op: 'removePage', page: pg.id }], reply: `Deleted the ${pg.name} page and removed its menu links. Undo brings it back.` };
  });
  def('seo', (t) => /\b(seo title|page title|meta title|title tag|meta description|seo description|page description)\b/.test(t), (t, raw, P, ctx) => {
    const pg = ctx.page(P); const v = quote(raw) || unq((/\b(?:to|as)\s+(.+)$/i.exec(raw) || [])[1] || ''); if (!v) return null;
    const prop = /description/.test(t) ? 'description' : 'title';
    return { ops: [{ op: 'setMeta', page: pg.id, prop, value: v }], reply: `Set the ${pg.name} page’s ${prop === 'title' ? 'SEO title' : 'meta description'}.` };
  });
  def('architect', (t) => /\b(add|put|include)\b.+\b(to|in|into)\s+(the\s+)?(menu|nav|navbar|navigation|header)\b/.test(t), (t, raw, P) => {
    const m = /(?:add|put|include)\s+(?:a\s+)?(?:link\s+(?:to|for)\s+)?(?:the\s+)?(.+?)(?:\s+page)?(?:\s+link)?\s+(?:to|in|into)\s+(?:the\s+)?(?:menu|nav|navbar|navigation|header)/i.exec(raw); if (!m) return null;
    const label = cap(unq(m[1])); const pg = pageNamed(P, label);
    return { ops: pg ? [{ op: 'addNavLink', page: pg.id, value: pg.name }] : [{ op: 'addPage', value: label }, { op: 'addNavLink', page: label, value: label }], reply: pg ? `Added ${pg.name} to the menu on every page.` : `There was no ${label} page, so I created one and added it to the menu.` };
  });

  // add sections / elements
  def('architect', (t) => /^(add|insert|put|place|create|include|append|give (it|me|us))\b/.test(t) && !!Object.keys(KIND_WORDS).find((k) => KIND_WORDS[k].test(t.replace(/\b(to|in|into|after|before|below|above|under)\b.*$/, ''))) && (/\bsection\b/.test(t) || !elementOf(t.replace(/\b(to|in|into|after|before|below|above|under)\b.*$/, ''))), (t, raw, P, ctx) => {
    const head = t.replace(/\s+(to|in|into|after|before|below|above|under|at the (?:top|bottom|end))\b.*$/, '');
    const kind = Object.keys(KIND_WORDS).find((k) => KIND_WORDS[k].test(head)) || 'features';
    let pg = ctx.page(P); const pm = /\bon\s+(?:the\s+)?([\w &-]+?)\s+page\b/i.exec(raw); if (pm && pageNamed(P, pm[1])) pg = pageNamed(P, pm[1]);
    const section = U().sectionDefaults(kind === 'hero' ? 'cta' : kind, P); const q = quote(raw); if (q) section.title = q;
    let afterId; const pos = /\b(after|below|under|before|above|at the top|at the start|at the bottom|at the end)\b\s*(?:of\s+)?(?:the\s+)?(.*)$/i.exec(raw);
    if (pos) { const w = lc(pos[1]); const r = pos[2] ? resolveSection(pos[2].replace(/\s+on\s+.*page$/i, ''), pg, P) : null;
      if (/top|start/.test(w)) { const nav = pg.tree.find(isNav); afterId = (nav || {}).id; if (!nav) afterId = undefined; }
      else if (r && /before|above/.test(w)) { const i = pg.tree.indexOf(r); afterId = i > 0 ? pg.tree[i - 1].id : undefined; }
      else if (r) afterId = r.id; }
    else if (ctx.sel) { const s = topOf(pg, ctx.sel); if (s) afterId = s.id; }
    return { ops: [{ op: 'addSection', page: pg.id, after: afterId, section }], reply: `Added a ${kind} section to ${pg.name}${afterId ? ` ${pos && /before|above/i.test(pos[1]) ? 'before' : 'after'} ${describeSection(pg, findAll(P, afterId) ? findAll(P, afterId).node : null)}` : ''}. The copy is a starting point; ask Quill to rewrite it.`, pageFocus: pg.id };
  });
  const ADD_STYLE = /\b(shadow|border|padding|margin|radius|rounded corners|corners|background|colou?r|underline|outline|animation|motion|effects?|hover|gradient|spacing)\b/;
  def('maintainer', (t) => /^(add|insert|put|place|create|include|append)\b/.test(t) && !ADD_STYLE.test(t.replace(/\s+(to|in|into|on|below|above|after|before)\s+.*$/, '')) && !!elementOf(t.replace(/§\d+§/g, '').replace(/["“].*?["”]/g, '')), (t, raw, P, ctx) => {
    const clean = raw.replace(/["“‘][^"”’]*["”’]/g, (m) => m.replace(/\s/g, ' '));
    const pm = /\s+(to|into|in|inside|within|under|below|beneath|after|above|before|on top of|next to|beside|at the (?:top|bottom|end|start|beginning) of)\s+(?:the\s+)?(.+)$/i.exec(clean.replace(/\s+(?:linking|that links|which links|that goes|going|pointing)\s+to\s+.*$/i, ''));
    const elPhrase = lc(pm ? clean.slice(0, pm.index) : clean);
    let type = elementOf(elPhrase.replace(/["“].*?["”]/g, '')); if (!type) return null;
    const text = textAfter(raw) || (type === 'heading' && /sub-?heading/.test(elPhrase) ? 'A supporting subheading' : DEFAULT_TEXT[type]);
    const place = placeFor(type === 'spacer' ? 'div' : type, pm && pm[1], pm && pm[2].replace(/ /g, ' '), P, ctx);
    const node = { type: type === 'spacer' ? 'div' : type, text: L.EL[type] && L.EL[type].textual ? text : undefined, attrs: {} };
    if (place.cls && place.cls !== 'brand') node.cls = place.cls; if (type === 'heading') node.tag = /sub-?heading|small heading/.test(elPhrase) ? 'h3' : place.tag || 'h2';
    if (type === 'spacer') node.style = { height: len(elPhrase) || '48px' };
    if (type === 'button' && !node.cls) { const any = flat(ctx.page(P).tree).find((x) => x.n.type === 'button' && x.n.cls); if (any) node.cls = any.n.cls; }
    const lk = linkAfter(raw); if (lk && (type === 'button' || type === 'link')) node.attrs.href = hrefFor(P, lk) || '#';
    if (type === 'image') { const u = /(https:\/\/\S+\.(?:png|jpe?g|webp|gif|svg))/i.exec(raw); node.attrs.src = u ? u[1] : L.PLACEHOLDER_IMG; node.attrs.alt = text && text !== DEFAULT_TEXT.image ? text : ''; }
    if (type === 'embed') node.html = '<!-- Paste your embed code here -->';
    const where = place.target ? `${place.pos === 'before' ? 'above' : place.pos === 'inside' || place.pos === 'first' ? 'inside' : 'below'} ${describe(findAll(P, place.target) && findAll(P, place.target).node)}` : `on ${place.page.name}`;
    return { ops: [{ op: 'insertNode', target: place.target, pos: place.pos, page: place.page.id, node }], reply: `Added ${type === 'image' ? 'an image' : `a ${type === 'div' ? 'box' : type}`}${node.text ? ` “${short(node.text, 40)}”` : ''} ${where}${node.attrs.href && node.attrs.href !== '#' ? `, linking to ${lk}` : ''}.`, pageFocus: place.page.id };
  });

  // remove / hide / show
  def('maintainer', (t) => /^(remove|delete|drop|get rid of|take out|erase|clear)\b/.test(t) && !/^(remove|delete|drop|take out)\s+(the\s+|a\s+|any\s+)?(underline|shadow|border|padding|margin|background|bold|italic|radius|rounded corners|spacing|gap|outline|uppercase|colou?r)\b/.test(t), (t, raw, P, ctx) => {
    const r = resolve(raw.replace(/^(remove|delete|drop|get rid of|take out|erase|clear)\s+/i, ''), P, ctx); if (!r.nodes.length || r.site) return miss(r.label);
    return { ops: r.nodes.slice(0, 40).map((n) => ({ op: 'removeNode', target: n.id })), reply: `Removed ${r.plural && r.nodes.length > 1 ? `${r.nodes.length} ${r.label.replace(/^the /, '').replace(/s?$/, 's')}` : r.label}. Undo brings ${r.nodes.length > 1 ? 'them' : 'it'} back.`, pageFocus: r.page.id };
  });
  def('designer', (t) => /^(hide|show|unhide)\b/.test(t), (t, raw, P, ctx) => {
    const hide = /^hide/.test(t); const phrase = raw.replace(/^(hide|show|unhide)\s+/i, '').replace(/\s+(on|for)\s+(mobile|phones?|tablets?|desktop|small screens?).*$/i, ''); const r = resolve(phrase, P, ctx);
    if (!r.nodes.length) return miss(r.label); const bp = BP(t); const where = bp === 'base' ? '' : bp === 'tablet' ? ' on tablets and phones' : ' on phones';
    return { ops: r.nodes.map((n) => ({ op: 'setNodeStyle', target: n.id, prop: 'display', value: hide ? 'none' : (n.type === 'button' || n.type === 'link' ? 'inline-block' : 'block'), bp, all: r.plural })), reply: `${hide ? 'Hid' : 'Showing'} ${r.label}${where}.${hide && bp === 'base' ? ' It’s still in the Navigator if you want it back.' : ''}`, focus: r.nodes.map((n) => n.id) };
  });
  // move
  def('maintainer', (t) => /^(move|shift|bring|push|put)\b.*\b(up|down|higher|lower|top|bottom|above|below|before|after|first|last)\b/.test(t) && !/^(put|place)\s+(a|an)\b/.test(t), (t, raw, P, ctx) => {
    const m = /^(?:move|shift|bring|push|put)\s+(.+?)\s+(up|down|higher|lower|to the top|to the bottom|to the start|to the end|first|last|above|below|before|after|under|over)\b\s*(?:the\s+)?(.*)$/i.exec(raw); if (!m) return null;
    const r = resolve(m[1], P, ctx); if (!r.nodes.length) return miss(r.label); const n = r.nodes[0]; const w = lc(m[2]);
    if (/above|below|before|after|under|over/.test(w) && m[3]) { const a = resolve(m[3], P, ctx).nodes[0]; if (!a) return miss(m[3]); const aTop = r.page.tree.includes(n) ? topOf(r.page, a.id) || a : a; return { ops: [{ op: 'moveNode', target: n.id, [/above|before|over/.test(w) ? 'before' : 'after']: aTop.id }], reply: `Moved ${r.label} ${/above|before|over/.test(w) ? 'above' : 'below'} ${describe(aTop)}.`, focus: [n.id] }; }
    const v = /up|higher/.test(w) ? 'up' : /down|lower/.test(w) ? 'down' : /top|start|first/.test(w) ? 'top' : 'bottom';
    return { ops: [{ op: 'moveNode', target: n.id, value: v }], reply: `Moved ${r.label} ${v === 'up' || v === 'down' ? v : `to the ${v}`}.`, focus: [n.id] };
  });
  def('maintainer', (t) => /^(duplicate|clone|copy)\b/.test(t) && !/\bcopy\s*(writing|text)?\b\s*(to|as)\b/.test(t), (t, raw, P, ctx) => {
    const times = +((/\b(\d+)\s*(times|x)\b/.exec(t) || [])[1] || (/\btwice\b/.test(t) ? 2 : /\bthrice|three times\b/.test(t) ? 3 : 1));
    const r = resolve(raw.replace(/^(duplicate|clone|copy)\s+/i, '').replace(/\s+(\d+\s*(times|x)|twice|thrice|three times)$/i, ''), P, ctx); if (!r.nodes.length) return miss(r.label);
    return { ops: Array.from({ length: Math.min(times, 6) }, () => ({ op: 'duplicateNode', target: r.nodes[0].id })), reply: `Duplicated ${r.label}${times > 1 ? ` ${times} times` : ''}.` };
  });
  // links
  def('maintainer', (t) => /^(link|point|connect|make)\b.+\b(to|go to|link to|point to|open)\b/.test(t) && /\b(link|point|go|connect|open)\b/.test(t) && !/\bcolou?r|size|bold\b/.test(t) || /\blink\b.*\bto\b/.test(t) && /^(change|set|update)\b/.test(t) || /\bopen\b.+\bin (a )?new (tab|window)\b/.test(t), (t, raw, P, ctx) => {
    if (/\bnew (tab|window)\b/.test(t)) { const r = resolve(raw.replace(/^(make|let)\s+/i, '').replace(/\s+open.*$/i, '').replace(/^open\s+/i, '').replace(/\s+in (a )?new (tab|window).*$/i, ''), P, ctx); if (!r.nodes.length) return miss(r.label); return { ops: r.nodes.map((n) => ({ op: 'setAttr', target: n.id, prop: 'target', value: /\bsame\b/.test(t) ? '' : '_blank' })), reply: `${cap(r.label)} now open${r.nodes.length > 1 ? '' : 's'} in a new tab.`, focus: r.nodes.map((n) => n.id) }; }
    const m = /^(?:link|point|connect)\s+(.+?)\s+to\s+(.+)$/i.exec(raw) || /^make\s+(.+?)\s+(?:go|link|point|lead)\s+to\s+(.+)$/i.exec(raw) || /^(?:change|set|update)\s+(?:the\s+)?(.*?)\s*(?:link|url|href)\s+(?:of\s+(.+?)\s+)?to\s+(.+)$/i.exec(raw);
    if (!m) return null; let targetPhrase = m[1], dest = m[m.length - 1]; if (m.length === 4) targetPhrase = m[2] || m[1] || 'the button';
    const r = resolve(targetPhrase || 'the button', P, ctx); if (!r.nodes.length) return miss(r.label);
    const d = unq(dest); let href = hrefFor(P, d); const ops = [];
    if (!href) { const s = resolveSection(d, r.page, P); if (s) { const id = (s.attrs && s.attrs.id) || L.slug(kindOfSection(r.page, s) || 'section'); if (!s.attrs || !s.attrs.id) ops.push({ op: 'setAttr', target: s.id, prop: 'id', value: id }); href = '#' + id; } }
    if (!href) return { ops: [], reply: `Where should it go? I couldn’t find a page or section called “${d}”.`, report: [R('info', 'Pages', P.pages.map((p) => p.name).join(', '))] };
    const linkable = r.nodes.filter((n) => n.type === 'button' || n.type === 'link' || n.tag === 'a'); if (!linkable.length) return { ops: [], reply: `${cap(r.label)} isn’t a link or a button. Select a button or link, or add one first.` };
    linkable.forEach((n) => ops.push({ op: 'setAttr', target: n.id, prop: 'href', value: href }));
    return { ops, reply: `${cap(r.label)} now link${linkable.length > 1 ? '' : 's'} to ${href.startsWith('page:') ? `the ${P.pages.find((p) => 'page:' + p.id === href).name} page` : href.startsWith('#') ? 'that section' : d}.`, focus: linkable.map((n) => n.id) };
  });
  // images
  def('illustrator', (t) => /\b(image|photo|picture|logo image|illustration|graphic)\b/.test(t) && /\b(replace|change|swap|set|update|use)\b/.test(t) && /(https?:\/\/\S+|\balt\b)/.test(t), (t, raw, P, ctx) => {
    const alt = /\balt(?: text)?\b.*?\bto\s+(.+)$/i.exec(raw); const u = /(https?:\/\/\S+)/i.exec(raw);
    const r = resolve(raw.replace(/(https?:\/\/\S+)/, '').replace(/\balt(?: text)?\b.*$/i, 'image').replace(/^(replace|change|swap|set|update|use)\s+/i, '').replace(/\s+(with|to|for)\s*$/i, ''), P, ctx);
    const imgs = r.nodes.filter((n) => n.type === 'image'); if (!imgs.length) return miss('an image');
    if (alt) return { ops: imgs.map((n) => ({ op: 'setAttr', target: n.id, prop: 'alt', value: unq(alt[1]) })), reply: `Updated the alt text.`, focus: imgs.map((n) => n.id) };
    return { ops: [{ op: 'setAttr', target: imgs[0].id, prop: 'src', value: u[1].replace(/[.,)]+$/, '') }], reply: 'Swapped the image. Add alt text so screen readers can describe it.', focus: [imgs[0].id] };
  });
  // heading level
  def('designer', (t) => /\b(make|turn|change|set)\b.+\b(into\s+|to\s+)?(an?\s+)?h[1-6]\b/.test(t), (t, raw, P, ctx) => {
    const m = /^(?:make|turn|change|set)\s+(.+?)\s+(?:into\s+|to\s+|as\s+)?(?:an?\s+)?h([1-6])\b/i.exec(raw); if (!m) return null; const r = resolve(m[1], P, ctx); const hs = r.nodes.filter((n) => n.type === 'heading'); if (!hs.length) return miss('that heading');
    return { ops: hs.map((n) => ({ op: 'setTag', target: n.id, value: 'h' + m[2] })), reply: `${cap(r.label)} is now an H${m[2]}.`, focus: hs.map((n) => n.id) };
  });
  // replace A with B everywhere
  def('copy', (t, raw) => /^(replace|swap)\s+["“‘].+?["”’]\s+(with|for|by)\s+["“‘].+?["”’](\s+everywhere)?$/i.test(raw), (t, raw, P) => {
    const m = /["“‘](.+?)["”’]\s+(?:with|for|by)\s+["“‘](.+?)["”’]/.exec(raw); const ops = [];
    P.pages.forEach((pg) => L.walk(pg.tree, (n) => { if (L.TEXTUAL(n) && n.text && n.text.includes(m[1])) ops.push({ op: 'setText', target: n.id, value: n.text.split(m[1]).join(m[2]) }); }));
    return { ops, reply: ops.length ? `Replaced “${short(m[1], 30)}” with “${short(m[2], 30)}” in ${ops.length} place${ops.length > 1 ? 's' : ''}.` : `I couldn’t find “${m[1]}” anywhere.` };
  });
  // style (must come before text: "change the button colour to red")
  const STYLE_WORDS = /\b(colou?r|background|bg|bigger|larger|smaller|tiny|huge|bold|bolder|italic|underline|uppercase|lowercase|capitali[sz]e|all caps|center|centre|centered|centred|align|aligned|left|right|rounded|round|pill|square|sharp|radius|corners?|padding|spacing|space|spacious|compact|tighter|margin|gap|width|height|full[- ]width|shadow|border|outline|ghost|opacity|transparent|faded|letter[- ]spacing|tracking|line[- ]height|font size|text size|font|typeface|red|orange|amber|yellow|gold|lime|green|emerald|mint|teal|cyan|blue|navy|indigo|purple|violet|lavender|pink|rose|magenta|brown|black|white|gr[ae]y|coral|olive|burgundy|sage|sand|cream|beige|charcoal|maroon|turquoise|peach|salmon|dark|light|#[0-9a-f]{3,6})\b/i;
  const TARGET_WORDS = /\b(it|this|that|them|headline|heading|headings|title|subheading|subtitle|tagline|button|buttons|cta|image|images|photo|link|links|text|paragraph|paragraphs|nav|navbar|navigation|menu|header|footer|hero|section|sections|card|cards|logo|h[1-6]|pricing|faq|testimonials?|team|features?|stats|contact|newsletter|gallery|products?|selected|selection|description)\b|["“‘]/i;
  const STYLE_VERB = /^(make|turn|change|set|give|use|paint|color|colour|increase|decrease|reduce|add|remove|center|centre|align|bold|italicize|underline|capitalize|uppercase|enlarge|shrink|round|put)\b/;
  const SITE_LOOK = /\b(brand|palette|theme|site|website|whole|everything|design language|look|feel|mode|typography)\b/;
  function isStyle(t, raw, ctx) {
    const bare = t.replace(/"…"/g, ' '); if (/\b(say|says|read|reads)\b/.test(bare) || !STYLE_VERB.test(t) || !STYLE_WORDS.test(bare)) return false;
    if (/\b(to|into|as|with)\s+"…"\s*$/.test(t) && !/#[0-9a-f]{3,6}/i.test(raw)) return false;
    const mt = /^(?:change|set|update|turn|make|rename)\s+(.+?)\s+(?:to|into|as)\s+(.+)$/.exec(bare);
    if (mt && !/\b(colou?r|background|bg|size|font|padding|spacing|margin|width|height|radius|border|shadow|opacity|alignment|weight)\b/.test(mt[1])) { const y = mt[2].trim(); if (!(y.split(/\s+/).length <= 4 && (STYLE_WORDS.test(y) || /^\d/.test(y)))) return false; }
    const hasTarget = TARGET_WORDS.test(t.replace(/"…"/g, '"')) || (ctx && ctx.sel);
    if (!hasTarget) return false;
    if (SITE_LOOK.test(bare) && !TARGET_WORDS.test(bare)) return false;
    return true;
  }
  def('designer', (t, raw, ctx) => isStyle(t, raw, ctx), (t, raw, P, ctx) => {
    // split target from style: "make [the hero headline] [bigger and blue]"
    const noQ = raw.replace(/["“‘]([^"”’]*)["”’]/g, (m) => m.replace(/\s/g, ' '));
    let m = /^(?:make|turn|paint|color|colour|round|bold|italicize|underline|capitalize|uppercase|enlarge|shrink|center|centre|align)\s+(.+?)\s+(?=(?:a\s+(?:bit|little|lot)\s+|much\s+|way\s+|slightly\s+|more\s+|less\s+|very\s+|extra\s+|fully\s+)?(?:bigger|larger|smaller|tiny|huge|bold|bolder|italic|underlined|uppercase|lowercase|all caps|centered|centred|center|centre|left|right|rounded|round|pill|square|sharp|spacious|compact|tighter|full[- ]width|shadowed|outlined|ghost|transparent|faded|semi|red|orange|amber|yellow|gold|lime|green|emerald|mint|teal|cyan|blue|navy|indigo|purple|violet|lavender|pink|rose|magenta|brown|black|white|gr[ae]y|coral|olive|burgundy|sage|sand|cream|beige|charcoal|maroon|turquoise|peach|salmon|dark|light|#|brand|ink|paper|muted|\d))/i.exec(noQ)
      || /^(?:make|turn|paint)\s+(?:the\s+)?(.+?)(?:'s)?\s+(?:background|bg|text|font|border|corners?|buttons?\s+(?=colou?r))\b/i.exec(noQ)
      || /^(?:remove|add|put)\s+(?:the\s+|a\s+|an\s+|some\s+|more\s+|less\s+)?(?:underline|shadow|border|padding|margin|background|radius|rounded corners|spacing|space|gap|outline)\s+(?:from|to|on|around|in|under|below|above)\s+(.+)$/i.exec(noQ)
      || /^(?:change|set|update|give|increase|decrease|reduce|add|remove|use|put)\s+(?:the\s+)?(?:colou?r|background(?:\s+colou?r)?|bg|text colou?r|font(?:\s+size)?|text size|size|padding|spacing|space|margin|gap|width|height|radius|corners?|border|shadow|opacity|letter[- ]spacing|line[- ]height|font weight|alignment)\s+(?:of|on|for|in|to)\s+(.+?)\s+(?:to|as|of)\b/i.exec(noQ)
      || /^(?:change|set|update|give|increase|decrease|reduce|add|remove|put)\s+(.+?)(?:'s)?\s+(?:colou?r|background|bg|text colou?r|font(?:\s+size)?|text size|size|padding|spacing|margin|gap|width|height|radius|corners?|border|shadow|opacity|alignment)\b/i.exec(noQ)
      || /^(?:give|add)\s+(.+?)\s+(?:a|an|more|less|some|rounded|round|bigger|smaller)\b/i.exec(noQ)
      || /^(?:center|centre|align|bold|italicize|underline|capitalize|uppercase|enlarge|shrink|round)\s+(.+?)(?:\s+(?:to the\s+)?(?:left|right|center|centre))?$/i.exec(noQ);
    let phrase = m ? m[1].replace(/ /g, ' ') : 'it'; const bp = BP(t), hv = HOVER(t);
    phrase = phrase.replace(/\s+(on|for)\s+(mobile|phones?|tablets?|desktop)\b.*$/i, '').replace(/\s+(on hover|when hovered)$/i, '');
    const r = resolve(phrase, P, ctx);
    if (r.site) return null; // site-wide look → Hue / Iris
    if (!r.nodes.length) return miss(r.label);
    const styleText = lc(raw.replace(/["“‘][^"”’]*["”’]/g, (x) => (/#/.test(x) ? x.replace(/["“‘”’]/g, '') : '')));
    const ops = []; let first = null;
    r.nodes.slice(0, 40).forEach((n) => { const st = styleFor(styleText.replace(lc(phrase), ' '), n, P); if (!st) return; first = first || st; st.forEach((s) => ops.push({ op: 'setNodeStyle', target: n.id, prop: s.prop, value: s.value, bp: bp + hv, all: r.plural })); });
    if (!ops.length) return null;
    const what = first.map((s) => ({ color: 'text colour', 'background-color': 'background', 'font-size': 'size', 'font-weight': 'weight', 'border-radius': 'corners', 'text-align': 'alignment', 'padding-top': 'spacing', 'box-shadow': 'shadow', 'font-family': 'font', 'text-transform': 'letter case', display: 'visibility' }[s.prop] || s.prop.replace(/-/g, ' '))).filter((x, i, a) => a.indexOf(x) === i && x !== 'padding bottom' && x !== 'padding left' && x !== 'padding right');
    const kindWord = { heading: 'headings', button: 'buttons', paragraph: 'paragraphs', text: 'text blocks', image: 'images', link: 'links', section: 'sections' }[r.nodes[0].type] || 'of them';
    const shared = !r.plural && r.nodes[0].cls && L.usage(P, r.nodes[0].cls) > 1;
    const list = what.slice(0, 3); const said = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
    const PL = { heading: 'headings', button: 'buttons', paragraph: 'paragraphs', text: 'text blocks', image: 'images', link: 'links', section: 'sections', div: 'cards' };
    return { ops, reply: `Updated the ${said} of ${r.plural && r.nodes.length > 1 ? `all ${r.nodes.length} ${PL[r.nodes[0].type] || 'elements'}` : r.label}${bp !== 'base' ? (bp === 'tablet' ? ' on tablets and phones' : ' on phones') : ''}${hv ? ' on hover' : ''}.${shared ? ` Only this one changed. Say “all ${kindWord}” to change every one.` : ''}`, focus: r.nodes.map((n) => n.id) };
  });
  // text
  def('copy', (t, raw) => !/^(?:change|set|update|make|turn|use)\s+(?:the\s+)?(?:(?:site|website|page)(?:'s)?\s+)?(brand|primary|accent|main|site|theme|heading|body)?\s*(colou?rs?|palette|fonts?|typeface|typography|theme|style|look|design|language|mode)\b/.test(t) && (/^(change|set|update|edit|make|rename|rewrite|replace|turn|write|let|have)\b.+\b(to|as|into|with|say|says|read|reads)\b/.test(t) || /^.{2,40}?\s+(should|must|needs to)\s+(say|read)\b/.test(t) || /^(headline|heading|title|subheading|subtitle|tagline|button|cta|footer text)\s*:\s*.+/i.test(raw)), (t, raw, P, ctx) => {
    const m = /^(?:change|set|update|edit|make|rename|rewrite|replace|turn|write)\s+(.+?)\s+(?:to say|to read|so it says|so it reads|to|as|into|with)\s*:?\s+(.+)$/i.exec(raw) || /^(?:make|let|have)\s+(.+?)\s+(?:say|read)\s*:?\s+(.+)$/i.exec(raw) || /^(.+?)\s+(?:should|must|needs to)\s+(?:say|read)\s*:?\s+(.+)$/i.exec(raw) || /^([\w\s]{2,30}):\s*(.+)$/.exec(raw);
    if (!m) return null;
    let [, phrase, value] = m; value = unq(value.replace(/\s+(instead|please)$/i, ''));
    if (/^(say|read)\s+/i.test(value)) value = unq(value.replace(/^(say|read)\s+/i, ''));
    const r = resolve(phrase.replace(/\s+(text|copy|label|wording)$/i, '').replace(/^(the\s+)?(text|copy|label|wording)\s+(of|on|in)\s+/i, ''), P, ctx);
    if (r.site) return null;
    let nodes = r.nodes.filter((n) => L.TEXTUAL(n));
    if (!nodes.length && r.nodes.length) { const inner = flat([r.nodes[0]]).map((x) => x.n).find((n) => n.type === 'heading') || flat([r.nodes[0]]).map((x) => x.n).find((n) => L.TEXTUAL(n)); if (inner) nodes = [inner]; }
    if (!nodes.length) return miss(r.label);
    if (/\b(shorter|punchier|better|clearer|more (exciting|professional|friendly|formal|casual|fun))\b/.test(lc(value)) && !quote(raw)) return null; // a rewrite, not a literal value → Quill
    return { ops: nodes.slice(0, r.plural ? 30 : 1).map((n) => ({ op: 'setText', target: n.id, value })), reply: `Changed ${r.label} to “${short(value, 60)}”.`, focus: nodes.slice(0, 1).map((n) => n.id), pageFocus: r.page.id };
  });

  /* ---------------------------------------------------------------- public API */
  /** Split a request into clauses this engine understands; the rest goes to the Director's specialists. */
  function parse(req, ctx) {
    const clauses = split(req); const steps = [], rest = [];
    clauses.forEach((c) => { const t = lc(c).replace(/["“‘][^"”’]*["”’]/g, (m) => (/#/.test(m) ? m : '"…"')); const h = H.find((x) => { try { return x.test(t, c, ctx); } catch (e) { return false; } }); if (h) steps.push({ agent: h.agent, task: c, clause: { text: c, h: H.indexOf(h) } }); else rest.push(c); });
    return { steps, rest };
  }
  /** Run one parsed clause against the live project. */
  function run(clause, P, ctx) {
    const h = H[clause.h]; const t = lc(clause.text);
    let out = null; try { out = h.run(t, clause.text, P, ctx); } catch (e) { out = { ops: [], reply: 'Something went wrong on my side with that one.', report: [R('warn', 'Error', e.message)] }; }
    if (!out) { // the handler declined after looking closer: let the classic specialist try
      const d = A().LOCAL.director(clause.text); const ag = (d.steps[0] || {}).agent || 'maintainer'; const o = A().LOCAL[ag] ? A().LOCAL[ag](clause.text, P, {}) : { ops: [] }; return Object.assign({ report: [] }, o, { agentOverride: ag });
    }
    return Object.assign({ report: [], actions: [] }, out);
  }
  const ctxFor = (E) => ({ sel: E && E.selected, pageId: E && E.page && E.page.id, last: [], page(P) { return P.pages.find((p) => p.id === this.pageId) || home(P); } });
  window.LoomCommands = { parse, run, split, resolve, ctxFor, styleFor };
})();
