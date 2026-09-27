/* LOOM — design languages + the template library.
   Why sites looked alike: one visual language everywhere. A design language is a complete visual
   system (type pairing, case and tracking, colour world, card treatment, button style, background
   texture, hero composition, motion preset and section rhythm) applied on top of the Loom design
   system. Same content in two languages reads as two different studios made it.

   Templates = category packs × design languages. 30 packs × 6 languages = 180 original templates,
   plus the 20 hand-built/art-directed ones = 200. Patterns were studied from public galleries
   (Webflow categories, 21st.dev component vocabulary, Mobbin app patterns, Higgsfield's creative
   suite), and every layout, copy block and artwork here is original. */
(() => {
  'use strict';
  const L = window.Loom, C = window.LoomCompose, T = window.LoomTemplates;
  const { hexToRgb, rgbToHex, hsl, hslToHex, paletteFrom, fixPalette, variantsOf, lum } = C.color;
  const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------------------------------------------------------- the 12 design languages */
  const LANGS = {
    editorial: { label: 'Editorial', nick: 'Journal', desc: 'Magazine serif, hairline rules, cream paper.', fonts: ['Fraunces', 'Source Sans 3', 'Fraunces'], mood: 'light', radius: 'sharp', headWeight: '500', hero: 'editorial', fx: 'refined', paper: '#F5F0E6', ink: '#1C1813', card: 'rule', btn: 'square', display: { track: '-0.035em', scale: 0.9 }, eyebrow: { track: '0.22em' }, deco: 'none', swap: { features: 'services', bento: 'services' }, adds: ['manifesto'] },
    swiss: { label: 'Swiss', nick: 'Grid', desc: 'International style: strict grid, heavy grotesk, signal red.', fonts: ['Inter Tight', 'Inter', 'Instrument Serif'], mood: 'light', radius: 'sharp', headWeight: '800', hero: 'poster', fx: 'refined', brand: '#E4002B', paper: '#FFFFFF', ink: '#0A0A0A', card: 'rule', btn: 'square', display: { track: '-0.075em', scale: 1.08 }, eyebrow: { track: '0.08em' }, deco: 'grid', swap: {}, adds: ['stats'] },
    brutalist: { label: 'Brutalist', nick: 'Raw', desc: 'Hard borders, offset shadows, mono type, zero polish.', fonts: ['Space Grotesk', 'Space Mono', 'Space Grotesk'], mood: 'light', radius: 'sharp', headWeight: '700', hero: 'poster', fx: 'refined', brand: '#FF5A1F', paper: '#F2EFE6', ink: '#0B0B0B', card: 'hard', btn: 'hard', display: { case: 'upper', track: '-0.045em', scale: 0.88 }, eyebrow: { track: '0.06em' }, deco: 'none', swap: {}, adds: ['marquee'] },
    glass: { label: 'Glass', nick: 'Aurora', desc: 'Dark aurora gradients, frosted glass cards, glow.', fonts: ['Manrope', 'Manrope', 'Instrument Serif'], mood: 'dark', radius: 'round', headWeight: '700', hero: 'center', fx: 'cinematic', card: 'glass', btn: 'glow', display: { track: '-0.055em', scale: 0.92 }, eyebrow: { track: '0.18em' }, deco: 'orbs', swap: { features: 'bento' }, adds: [] },
    bento: { label: 'Bento', nick: 'Bento', desc: 'Soft SaaS: rounded tiles, product UI, calm shadows.', fonts: ['Plus Jakarta Sans', 'Inter', 'Instrument Serif'], mood: 'light', radius: 'round', headWeight: '700', hero: 'center', fx: 'refined', paper: '#FAFAFB', card: 'soft', btn: 'pill', display: { track: '-0.055em', scale: 0.88 }, eyebrow: { track: '0.14em' }, deco: 'dots', swap: { features: 'bento', services: 'bento' }, adds: ['logos'] },
    luxury: { label: 'Luxury', nick: 'Maison', desc: 'Couture serif in capitals, champagne hairlines, night.', fonts: ['Cormorant Garamond', 'Jost', 'Cormorant Garamond'], mood: 'dark', radius: 'sharp', headWeight: '500', hero: 'media', fx: 'cinematic', brand: '#C9A96E', paper: '#0E0C0A', ink: '#F1EADD', card: 'line', btn: 'outline', display: { case: 'upper', track: '0.02em', scale: 0.74 }, eyebrow: { track: '0.34em' }, deco: 'none', swap: { features: 'services', bento: 'services', stats: 'manifesto' }, adds: ['manifesto'] },
    playful: { label: 'Playful', nick: 'Pop', desc: 'Chunky rounded type, candy colours, bouncy buttons.', fonts: ['Bricolage Grotesque', 'Nunito', 'Instrument Serif'], mood: 'light', radius: 'round', headWeight: '800', hero: 'split', fx: 'refined', paper: '#FFF8EE', card: 'blob', btn: 'pop', display: { track: '-0.05em', scale: 0.95 }, eyebrow: { track: '0.1em' }, deco: 'dots', swap: {}, adds: ['marquee'] },
    retro: { label: 'Retro Arcade', nick: 'Arcade', desc: 'Pixel headings, neon on midnight, CRT grid.', fonts: ['Silkscreen', 'Space Mono', 'Silkscreen'], mood: 'dark', radius: 'sharp', headWeight: '700', hero: 'poster', fx: 'cinematic', brand: '#3DFF8F', paper: '#0A0A18', ink: '#E8F7EE', card: 'pixel', btn: 'hard', display: { case: 'upper', track: '0em', scale: 0.56 }, eyebrow: { track: '0.12em' }, deco: 'grid', swap: {}, adds: ['marquee'] },
    organic: { label: 'Organic', nick: 'Grove', desc: 'Earthy tones, soft serif, arched imagery.', fonts: ['Fraunces', 'DM Sans', 'Fraunces'], mood: 'light', radius: 'round', headWeight: '400', hero: 'split', fx: 'refined', brand: '#5C7A4A', paper: '#F2ECE1', card: 'arch', btn: 'pill', display: { track: '-0.035em', scale: 0.9 }, eyebrow: { track: '0.18em' }, deco: 'none', swap: {}, adds: [] },
    corporate: { label: 'Corporate', nick: 'Trust', desc: 'Structured, trustworthy, calm blue, clear hierarchy.', fonts: ['IBM Plex Sans', 'IBM Plex Sans', 'IBM Plex Serif'], mood: 'light', radius: 'soft', headWeight: '600', hero: 'split', fx: 'minimal', brand: '#0B5CD6', card: 'outline', btn: 'rounded', display: { track: '-0.035em', scale: 0.72 }, eyebrow: { track: '0.1em' }, deco: 'none', swap: {}, adds: ['logos'] },
    cinematic: { label: 'Cinematic', nick: 'Noir', desc: 'Pure black, condensed capitals, electric accent, media first.', fonts: ['Anton', 'Inter', 'Instrument Serif'], mood: 'dark', radius: 'soft', headWeight: '400', hero: 'media', fx: 'cinematic', brand: '#D7FF3A', paper: '#050505', ink: '#F4F4F2', card: 'media', btn: 'pill', display: { case: 'upper', track: '-0.01em', scale: 1.02 }, eyebrow: { track: '0.2em' }, deco: 'none', swap: { gallery: 'showcase', features: 'bento' }, adds: ['marquee'] },
    mono: { label: 'Mono', nick: 'Mono', desc: 'Black on white, whitespace, underline links, quiet type.', fonts: ['Inter', 'Inter', 'Instrument Serif'], mood: 'light', radius: 'sharp', headWeight: '500', hero: 'editorial', fx: 'minimal', brand: '#111111', paper: '#FFFFFF', ink: '#0B0B0B', card: 'rule', btn: 'underline', display: { track: '-0.06em', scale: 0.88 }, eyebrow: { track: '0.14em' }, deco: 'none', swap: { features: 'services' }, adds: [] }
  };
  // structure per language: navbar style, footer style and the rhythm of home sections
  const STRUCT = {
    editorial: { nav: 'center', footer: 'centered', order: ['manifesto', 'showcase', 'services', 'split', 'testimonials', 'newsletter', 'faq'] },
    swiss: { nav: 'classic', footer: 'wordmark', order: ['stats', 'services', 'showcase', 'steps', 'pricing', 'faq'] },
    brutalist: { nav: 'classic', footer: 'wordmark', order: ['marquee', 'bento', 'products', 'showcase', 'testimonials', 'pricing', 'faq'] },
    glass: { nav: 'pill', footer: 'columns', order: ['logos', 'bento', 'dashboard', 'stats', 'steps', 'pricing', 'faq'] },
    bento: { nav: 'pill', footer: 'columns', order: ['logos', 'bento', 'dashboard', 'steps', 'testimonials', 'pricing', 'faq'] },
    luxury: { nav: 'center', footer: 'centered', order: ['manifesto', 'gallery', 'showcase', 'services', 'testimonials', 'contact'] },
    playful: { nav: 'pill', footer: 'columns', order: ['marquee', 'steps', 'features', 'bento', 'testimonials', 'pricing', 'faq'] },
    retro: { nav: 'classic', footer: 'wordmark', order: ['marquee', 'bento', 'stats', 'showcase', 'products', 'faq'] },
    organic: { nav: 'center', footer: 'centered', order: ['split', 'features', 'manifesto', 'gallery', 'testimonials', 'newsletter'] },
    corporate: { nav: 'classic', footer: 'columns', order: ['logos', 'features', 'stats', 'steps', 'services', 'testimonials', 'faq'] },
    cinematic: { nav: 'classic', footer: 'wordmark', order: ['marquee', 'showcase', 'gallery', 'bento', 'stats', 'pricing'] },
    mono: { nav: 'minimal', footer: 'minimal', order: ['services', 'showcase', 'testimonials', 'faq'] }
  };
  Object.keys(STRUCT).forEach((k) => Object.assign(LANGS[k], STRUCT[k]));
  const LANG_KEYWORDS = { editorial: /\b(editorial|magazine|journal|newspaper|serif)\b/, swiss: /\b(swiss|international style|grid system|bauhaus)\b/, brutalist: /\b(brutal|brutalist|raw|anti.design|neo.?brutal)/, glass: /\b(glass|glassmorph|aurora|futuristic|neon glow|web3)\b/, bento: /\b(bento|saas|product.led|clean saas)\b/, luxury: /\b(luxury|luxurious|premium|couture|high.end|elegant|exclusive)\b/, playful: /\b(playful|fun|friendly|colou?rful|kids|bubbly|cute)\b/, retro: /\b(retro|pixel|8.?bit|arcade|y2k|vintage game)\b/, organic: /\b(organic|natural|earthy|eco|botanical|calm)\b/, corporate: /\b(corporate|trustworthy|professional|enterprise|formal|institutional)\b/, cinematic: /\b(cinematic|film|movie|dramatic|bold|dark and bold|studio)\b/, mono: /\b(minimal|minimalist|monochrome|black and white|simple)\b/ };

  /* ---------------------------------------------------------------- applying a language to a kit */
  const scaleSize = (v, f) => String(v).replace(/(\d+(?:\.\d+)?)(px|vw)/g, (m, n, u) => (parseFloat(n) * f).toFixed(u === 'vw' ? 2 : 0) + u);
  const B = (w, c) => ({ 'border-top-width': w, 'border-right-width': w, 'border-bottom-width': w, 'border-left-width': w, 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': c, 'border-right-color': c, 'border-bottom-color': c, 'border-left-color': c });
  const NOB = { 'border-top-width': '0', 'border-right-width': '0', 'border-bottom-width': '0', 'border-left-width': '0' };
  const set = (k, c, bp, props) => { if (!k[c]) return; k[c][bp] = Object.assign({}, k[c][bp] || {}, props); };
  const BIG = ['display', 'display-c', 'poster-t', 'cta-t'], SEC = ['h-sec', 'manifesto'], UPPER = ['display', 'display-c', 'poster-t', 'cta-t', 'h-sec', 'hs-title', 'svc-title', 'b-title', 'mq-item', 'foot-word'];
  const CARDS = ['f-card', 'b-wide', 'b-mid', 'b-small', 'quote', 'plan', 'hs-card', 'kpi', 'panel', 'news-band', 'dash'];
  const MEDIA = ['img-r', 'hero-art', 'g-img', 'avatar', 'work-media', 'p-img', 'poster-art', 'hero-wide'];
  const BTNS = ['btn', 'btn-xl', 'band-btn'];
  function apply(k, style) {
    const G = LANGS[style.lang]; if (!G) return k;
    const d = G.display || {};
    BIG.forEach((c) => { if (!k[c]) return; if (d.scale) k[c].base['font-size'] = scaleSize(k[c].base['font-size'], d.scale); if (d.track) k[c].base['letter-spacing'] = d.track; if (d.case === 'upper') { k[c].base['text-transform'] = 'uppercase'; k[c].base['line-height'] = d.scale < 0.7 ? '1.08' : '0.9'; } });
    SEC.forEach((c) => { if (!k[c]) return; if (d.scale) k[c].base['font-size'] = scaleSize(k[c].base['font-size'], 1 + (d.scale - 1) * 0.6); if (d.track) k[c].base['letter-spacing'] = d.track; });
    if (d.case === 'upper') UPPER.forEach((c) => set(k, c, 'base', { 'text-transform': 'uppercase' }));
    if (G.eyebrow) set(k, 'eyebrow', 'base', { 'letter-spacing': G.eyebrow.track });
    if (style.lang === 'luxury' || style.lang === 'mono') set(k, 'eyebrow', 'base', { 'font-weight': '500' });
    if (style.lang === 'retro' || style.lang === 'brutalist') set(k, 'eyebrow', 'base', { 'font-family': 'var(--font-body)' });
    // buttons
    const btn = { square: { 'border-radius': '0' }, rounded: { 'border-radius': '10px' }, pill: { 'border-radius': '999px' },
      hard: { 'border-radius': '0', ...B('2px', 'var(--sw-ink)'), 'box-shadow': '5px 5px 0 var(--sw-ink)', 'text-transform': 'uppercase', 'letter-spacing': '0.04em' },
      outline: { 'border-radius': '0', 'background-color': 'transparent', color: 'var(--sw-brand)', ...B('1px', 'var(--sw-brand)'), 'text-transform': 'uppercase', 'letter-spacing': '0.22em', 'font-size': '13px', 'font-weight': '500' },
      underline: { 'border-radius': '0', 'background-color': 'transparent', color: 'var(--sw-ink)', 'padding-left': '0', 'padding-right': '0', ...NOB, 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-ink)', 'min-height': '44px' },
      pop: { 'border-radius': '999px', 'box-shadow': '0 6px 0 var(--sw-ink)', ...B('2px', 'var(--sw-ink)') },
      glow: { 'border-radius': '999px', 'box-shadow': '0 0 0 1px color-mix(in srgb, var(--sw-brand) 60%, transparent), 0 12px 40px -10px var(--sw-brand)' } }[G.btn];
    const hover = { hard: { transform: 'translate(-2px, -2px)', 'box-shadow': '7px 7px 0 var(--sw-ink)', 'background-color': 'var(--sw-brand)', color: 'var(--sw-paper)' }, pop: { transform: 'translateY(2px)', 'box-shadow': '0 3px 0 var(--sw-ink)' }, outline: { 'background-color': 'var(--sw-brand)', color: 'var(--sw-paper)' }, underline: { 'background-color': 'transparent', color: 'var(--sw-brand)', 'border-bottom-color': 'var(--sw-brand)' }, glow: { 'box-shadow': '0 0 0 1px var(--sw-brand), 0 16px 50px -8px var(--sw-brand)' } }[G.btn];
    if (btn) BTNS.concat(['btn-ghost', 'p-buy']).forEach((c) => { if (!k[c]) return; const ghost = c === 'btn-ghost' || c === 'p-buy'; const b = Object.assign({}, btn); if (ghost && (G.btn === 'hard' || G.btn === 'pop')) b['background-color'] = 'var(--sw-paper)', b.color = 'var(--sw-ink)'; if (ghost && G.btn === 'outline') b.color = 'var(--sw-ink)', Object.assign(b, B('1px', 'var(--sw-line)')); if (ghost && G.btn === 'glow') delete b['box-shadow']; set(k, c, 'base', b); if (hover) set(k, c, 'base:hover', hover); });
    // cards + media
    const card = {
      rule: { 'border-radius': '0', 'background-color': 'transparent', ...NOB, 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'var(--sw-ink)', 'padding-left': '0', 'padding-right': '0', 'box-shadow': 'none' },
      hard: { 'border-radius': '0', 'background-color': 'var(--sw-paper)', ...B('2px', 'var(--sw-ink)'), 'box-shadow': '6px 6px 0 var(--sw-ink)' },
      glass: { 'background-color': 'rgba(255,255,255,.055)', ...B('1px', 'rgba(255,255,255,.12)'), 'backdrop-filter': 'blur(18px) saturate(1.4)', '-webkit-backdrop-filter': 'blur(18px) saturate(1.4)', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.12), 0 30px 60px -30px rgba(0,0,0,.6)' },
      soft: { 'background-color': '#FFFFFF', ...B('1px', 'rgba(15,23,42,.06)'), 'box-shadow': '0 1px 2px rgba(15,23,42,.04), 0 18px 40px -22px rgba(15,23,42,.22)' },
      line: { 'border-radius': '0', 'background-color': 'transparent', ...B('1px', 'color-mix(in srgb, var(--sw-brand) 40%, transparent)') },
      blob: { 'border-radius': '32px', ...B('2px', 'var(--sw-ink)'), 'box-shadow': '0 8px 0 var(--sw-ink)' },
      pixel: { 'border-radius': '0', 'background-color': 'transparent', ...B('2px', 'var(--sw-brand)'), 'box-shadow': '0 0 0 4px var(--sw-paper), 0 0 0 6px color-mix(in srgb, var(--sw-brand) 40%, transparent), 0 0 30px -6px var(--sw-brand)' },
      arch: { 'border-radius': '28px', ...NOB },
      media: { 'border-radius': '14px', ...NOB, 'background-color': 'var(--sw-soft)' },
      outline: { 'border-radius': '10px', 'background-color': 'var(--sw-paper)', ...B('1px', 'var(--sw-line)') }
    }[G.card];
    if (card) CARDS.forEach((c) => set(k, c, 'base', card));
    const media = { hard: { 'border-radius': '0', ...B('2px', 'var(--sw-ink)') }, pixel: { 'border-radius': '0', ...B('2px', 'var(--sw-brand)') }, arch: { 'border-radius': '999px 999px 24px 24px' }, rule: { 'border-radius': '0' }, line: { 'border-radius': '0' }, blob: { 'border-radius': '36px', ...B('2px', 'var(--sw-ink)') }, glass: { 'border-radius': '24px', ...B('1px', 'rgba(255,255,255,.12)') } }[G.card];
    if (media) MEDIA.forEach((c) => set(k, c, 'base', media));
    if (G.card === 'arch') ['avatar', 'img-r'].forEach((c) => set(k, c, 'base', { 'border-radius': '999px 999px 20px 20px' }));
    // section rhythm + texture
    const deco = { grid: { 'background-image': 'linear-gradient(color-mix(in srgb, var(--sw-line) 70%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--sw-line) 70%, transparent) 1px, transparent 1px)', 'background-size': '72px 72px', 'background-attachment': 'fixed' },
      dots: { 'background-image': 'radial-gradient(color-mix(in srgb, var(--sw-ink) 12%, transparent) 1px, transparent 1.4px)', 'background-size': '22px 22px' },
      orbs: { 'background-image': 'radial-gradient(40% 50% at 12% 8%, color-mix(in srgb, var(--sw-brand) 28%, transparent), transparent 70%), radial-gradient(35% 40% at 90% 30%, color-mix(in srgb, var(--sw-accent2, #22C7E0) 22%, transparent), transparent 70%), radial-gradient(40% 40% at 50% 100%, color-mix(in srgb, var(--sw-brand) 16%, transparent), transparent 70%)', 'background-attachment': 'fixed' } }[G.deco];
    if (deco) set(k, '@body', 'base', deco);
    if (style.lang === 'luxury') { set(k, 'nav', 'base', { 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'color-mix(in srgb, var(--sw-brand) 30%, transparent)' }); set(k, 'brand', 'base', { 'text-transform': 'uppercase', 'letter-spacing': '0.28em', 'font-size': '18px' }); }
    if (style.lang === 'swiss') set(k, 'eyebrow', 'base', { color: 'var(--sw-brand)', 'font-weight': '700' });
    if (style.lang === 'cinematic') { set(k, 'eyebrow', 'base', { color: 'var(--sw-brand)' }); set(k, 'section', 'base', { 'padding-top': 'clamp(80px, 10vw, 160px)', 'padding-bottom': 'clamp(80px, 10vw, 160px)' }); }
    if (style.lang === 'mono' || style.lang === 'swiss') set(k, 'nav', 'base', { 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-ink)' });
    if (style.lang === 'retro') ['lead', 'card-text', 'lead-c'].forEach((c) => set(k, c, 'base', { 'font-family': 'var(--font-body)', 'letter-spacing': '-0.01em' }));
    return k;
  }
  function paletteFor(brand, G) {
    const base = paletteFrom(brand, G.mood);
    if (!G.paper) return base;
    const paper = G.paper, ink = G.ink || base.ink;
    return fixPalette({ brand: brand, ink, paper, muted: mix(ink, paper, 0.42), soft: mix(paper, ink, G.mood === 'dark' ? 0.07 : 0.045), line: mix(paper, ink, G.mood === 'dark' ? 0.16 : 0.12) }, G.mood);
  }
  /** Re-express a spec in a design language (fonts, palette, style, hero, section rhythm). */
  function specFor(spec, lang, opts = {}) {
    const G = LANGS[lang]; if (!G) return spec; const s = clone(spec);
    const brand = opts.brand || G.brand || (s.palette && s.palette.brand) || '#3B6CFF';
    s.palette = opts.palette || paletteFor(brand, G);
    s.fonts = { heading: G.fonts[0], body: G.fonts[1], accent: G.fonts[2] };
    s.style = Object.assign({}, s.style, { lang, mood: G.mood, radius: G.radius, headWeight: G.headWeight, hero: opts.hero || G.hero, fx: G.fx, nav: G.nav, footer: G.footer });
    s.pages.forEach((pg, pi) => {
      pg.sections = pg.sections.map((x) => (G.swap[x.kind] && !(x.kind === 'features' && G.swap.features === 'services' && !(x.items || []).length) ? Object.assign({}, x, { kind: G.swap[x.kind] }) : x)).map((x) => (x.kind === 'services' ? Object.assign({}, x, { items: (x.items || []).map((i, n) => Object.assign({ value: i.value || ['2–4 weeks', 'Ongoing', 'On request', 'Monthly', 'Per project', 'Tailored'][n % 6] }, i)) }) : x));
      if (pi !== 0) return;
      // re-order home sections into this language's rhythm (hero first, closing CTA last)
      if (G.order) { const first = pg.sections[0], last = pg.sections[pg.sections.length - 1].kind === 'cta' ? pg.sections.pop() : null; const rest = pg.sections.slice(1); const rank = (x) => { const i = G.order.indexOf(x.kind); return i < 0 ? 50 + rest.indexOf(x) : i; }; pg.sections = [first, ...rest.sort((a, b) => rank(a) - rank(b))]; if (last) pg.sections.push(last); }
      (G.adds || []).forEach((kind) => {
        if (pg.sections.some((x) => x.kind === kind)) return;
        const words = pg.sections.slice(1).map((x) => String(x.eyebrow || '').replace(/[*—]/g, '').trim()).filter((w) => w && w.length < 26).slice(0, 6);
        if (kind === 'marquee' && words.length >= 3) pg.sections.splice(1, 0, { kind, items: words.concat([s.name]).map((title) => ({ title })) });
        if (kind === 'manifesto') pg.sections.splice(Math.min(3, pg.sections.length - 1), 0, { kind, eyebrow: 'What we believe', title: `${s.name} exists to make the *extraordinary* feel effortless, and the everyday feel *considered.*` });
        if (kind === 'logos') pg.sections.splice(1, 0, { kind, title: 'Trusted by teams at', items: ['Northwind', 'Lumen', 'Kestrel', 'Parallax', 'Orbit', 'Quanta'].map((title) => ({ title })) });
        if (kind === 'stats' && !pg.sections.some((x) => x.kind === 'stats')) pg.sections.splice(2, 0, { kind, items: [['Years of practice', '12'], ['Projects delivered', '340'], ['Countries', '18'], ['Client rating', '4.9']].map(([title, value]) => ({ title, value })) });
      });
    });
    return s;
  }

  /* ---------------------------------------------------------------- 16 new category packs (original copy) */
  const I = (o) => o;
  const PACKS = [
    I({ id: 'atelier-arch', name: 'Plinth', category: 'Architecture & Design', desc: 'architecture and interiors studio', kw: ['architect', 'architecture', 'interior', 'interiors', 'furniture', 'building'], brand: '#8A6A4F', mood: 'light', radius: 'sharp', fonts: ['Inter Tight', 'Inter'], art: ['arch', 'lines'], hero: 'editorial', links: ['Projects', 'Studio', 'Contact'], cta: 'Start a project',
      home: [['hero', 'Architecture · Interiors · Objects', 'Spaces that hold *quiet* light.', '{name} designs homes, workplaces and objects with restraint, craft and a lot of daylight.'],
        ['showcase', 'Projects', 'Selected *work*', '', [['Casa Norte', 'A courtyard house in stone and oak.', 'Residential · 2026'], ['Harbour Offices', 'A converted warehouse for 200 people.', 'Workplace · 2025'], ['Linen Store', 'A retail interior of timber and linen.', 'Retail · 2025'], ['Hill Pavilion', 'A timber pavilion for a sculpture park.', 'Cultural · 2024']]],
        ['manifesto', 'Approach', 'We design from the *site* outward: light first, then material, then everything else.'],
        ['services', 'Services', 'From first sketch to final *handover.*', '', [['Architecture', 'New builds, extensions and restorations.', 'RIBA 0–7'], ['Interiors', 'Spatial planning, joinery and lighting.', '8–20 weeks'], ['Objects', 'Furniture and fittings made to order.', 'Made to order']]],
        ['stats', '', '', '', [['Buildings completed', '64'], ['Design awards', '11'], ['Years in practice', '15'], ['Repeat clients', '70%']]],
        ['cta', '', 'Let’s draw something *together.*', 'Tell us about the site and what you imagine.']], pages: ['Projects', 'Contact'],
      langs: ['editorial', 'swiss', 'mono', 'luxury', 'organic', 'brutalist'] }),
    I({ id: 'gallery-arts', name: 'Vesper', category: 'Arts & Entertainment', desc: 'gallery, museum and cultural venue', kw: ['museum', 'gallery', 'art', 'theatre', 'theater', 'exhibition', 'festival', 'culture'], brand: '#B6325A', mood: 'dark', radius: 'sharp', fonts: ['Syne', 'Inter'], art: ['blobs', 'arch'], hero: 'poster', links: ['Exhibitions', 'Visit', 'Tickets'], cta: 'Book tickets',
      home: [['hero', 'Now showing · Until 12 Jan', 'Look *longer.*', 'Contemporary art, performance and film at {name}. Free for under-25s, every day.'],
        ['marquee', ['New exhibition', 'Late openings Fridays', 'Artist talks', 'Family Sundays', 'Free for under-25s']],
        ['gallery', 'On view', 'Exhibitions', '', [['Soft Machines — installation'], ['After Rain — photography'], ['Signal — video works'], ['The Weight of Colour — painting'], ['Loop — sound piece'], ['Common Ground — community show']]],
        ['split', 'Visit', 'Plan your *visit.*', 'Open Tuesday to Sunday, 10am–6pm, and until 10pm on Fridays. Step-free access throughout.', [['Café and bookshop'], ['Audio guides in 6 languages'], ['Quiet hours every morning']], 'Book tickets'],
        ['newsletter', 'Hear about openings first', 'One email a month. Private views, talks and new shows.', 'Subscribe'],
        ['cta', '', 'Art is better *in person.*', 'Tickets from free to €14.']], pages: ['Exhibitions', 'Contact'],
      langs: ['cinematic', 'editorial', 'brutalist', 'swiss', 'luxury', 'glass'] }),
    I({ id: 'sound-music', name: 'Resonant', category: 'Music & Audio', desc: 'artist, label or audio studio', kw: ['music', 'band', 'artist', 'album', 'label', 'podcast', 'audio', 'studio', 'dj', 'producer'], brand: '#FF3D6E', mood: 'dark', radius: 'soft', fonts: ['Anton', 'Inter'], art: ['lines', 'blobs'], hero: 'media', links: ['Music', 'Tour', 'Store'], cta: 'Listen now',
      home: [['hero', 'New album out now', 'Turn it *all* the way up.', '{name} returns with a new record, a world tour and the loudest year yet.'],
        ['marquee', ['New album', 'World tour', 'Limited vinyl', 'Live sessions', 'Behind the record']],
        ['showcase', 'Discography', 'The *records*', '', [['Night Swim', 'Album · 12 tracks', '2026'], ['Paper Suns', 'EP · 5 tracks', '2025'], ['Live at the Roundhouse', 'Live album', '2024'], ['Glasshouse', 'Album · 10 tracks', '2023']]],
        ['services', 'Tour', 'On the *road.*', '', [['London — Brixton Academy', '12 March', 'Tickets'], ['Berlin — Columbiahalle', '15 March', 'Tickets'], ['Paris — Olympia', '18 March', 'Sold out'], ['New York — Terminal 5', '2 April', 'Tickets']]],
        ['products', 'Store', 'Limited *merch*', '', [['Night Swim vinyl', '$34'], ['Tour tee', '$38'], ['Poster set', '$22'], ['Signed CD', '$25']]],
        ['cta', '', 'See you *out there.*', 'Join the list for presales and new music.']], pages: ['Music', 'Contact'],
      langs: ['cinematic', 'retro', 'brutalist', 'glass', 'playful', 'swiss'] }),
    I({ id: 'media-studio', name: 'Frameworks', category: 'Media & Creators', desc: 'AI video and creative studio', kw: ['video', 'film', 'content', 'creator', 'ugc', 'ads', 'motion graphics', 'vfx', 'production', 'influencer'], brand: '#C8FF2E', mood: 'dark', radius: 'soft', fonts: ['Anton', 'Inter'], art: ['blobs', 'lines'], hero: 'media', links: ['Studios', 'Showcase', 'Pricing'], cta: 'Start creating',
      home: [['hero', 'AI creative studio', 'One idea in. *A campaign out.*', '{name} turns a single brief into films, ads and visuals, then versions them for every channel.'],
        ['marquee', ['Cinema studio', 'Ad studio', 'Product shots', 'UGC videos', 'Motion graphics', 'Upscale 4K']],
        ['bento', 'Studios', 'A studio for every *format.*', 'Presets built by directors, tuned for real campaigns.', [['Cinema', 'Camera moves, lenses and grade.'], ['Ads', 'Hooks, cuts and captions for paid social.'], ['Product', 'Studio-quality product shots from one photo.'], ['UGC', 'Authentic creator-style videos.'], ['Motion', 'Titles, logos and loops.'], ['Upscale', 'Clean 4K from any source.']]],
        ['showcase', 'Showcase', 'Made with *{name}*', '', [['Night Market', 'Brand film · 60s', 'Cinema'], ['Glow Serum', 'Paid social · 6 cuts', 'Ads'], ['Trail Runner', 'Product launch', 'Product'], ['City Loop', 'Motion identity', 'Motion']]],
        ['pricing', 'Pricing', 'Create at any *scale.*', '', [['Creator', '200 credits · 1080p · Community presets', '$19', 'per month'], ['Studio', '1,200 credits · 4K · Commercial licence', '$79', 'per month'], ['Brand', 'Unlimited seats · API · Brand kit', 'Custom', 'annual']]],
        ['cta', '', 'Your next campaign is *one brief away.*', 'Start free. No credit card.']], pages: ['Pricing', 'Contact'],
      langs: ['cinematic', 'glass', 'brutalist', 'retro', 'bento', 'swiss'] }),
    I({ id: 'docs-kb', name: 'Manual', category: 'Documentation', desc: 'product docs and knowledge base', kw: ['documentation', 'docs', 'knowledge base', 'help center', 'guide', 'manual', 'tutorial'], brand: '#2F6BFF', mood: 'light', radius: 'soft', fonts: ['Inter Tight', 'Inter'], art: ['ui'], hero: 'center', links: ['Guides', 'API', 'Changelog'], cta: 'Get started',
      home: [['hero', 'Documentation', 'Everything you need to *ship with {name}.*', 'Guides, API reference and examples, written by the engineers who built it.'],
        ['bento', 'Start here', 'Pick your *path.*', '', [['Quickstart', 'From zero to your first request in 5 minutes.'], ['Guides', 'Step-by-step recipes for real use cases.'], ['API reference', 'Every endpoint, parameter and response.'], ['SDKs', 'Official libraries for 6 languages.'], ['Changelog', 'What’s new, every week.'], ['Community', 'Ask questions, share solutions.']]],
        ['steps', 'Quickstart', 'Three steps to *hello world.*', '', [['Install', 'One package for your language.'], ['Authenticate', 'Create a key in the dashboard.'], ['Call the API', 'Copy an example and run it.']]],
        ['faq', 'Help', 'Common questions', '', [['Where do I find my API key?', 'Dashboard → Settings → API keys.'], ['Is there a sandbox?', 'Yes, every account has a free test mode.'], ['What are the rate limits?', '100 requests per second on paid plans.'], ['How do I get support?', 'Email us or ask in the community forum.']]],
        ['cta', '', 'Stuck? *We’re here.*', 'Our engineers answer every support ticket.']], pages: ['Guides', 'Contact'],
      langs: ['mono', 'bento', 'corporate', 'swiss', 'glass', 'editorial'] }),
    I({ id: 'climate-env', name: 'Canopy', category: 'Environment', desc: 'climate, conservation and sustainability', kw: ['climate', 'environment', 'sustainability', 'conservation', 'renewable', 'solar', 'carbon', 'green energy', 'ocean'], brand: '#1E7F4F', mood: 'light', radius: 'round', fonts: ['Fraunces', 'DM Sans'], art: ['blobs', 'arch'], hero: 'split', links: ['Our work', 'Impact', 'Join'], cta: 'Take action',
      home: [['hero', 'Restoring what matters', 'Give nature *room* to recover.', '{name} protects forests, rivers and coastlines with the communities who live beside them.'],
        ['stats', '', '', '', [['Hectares restored', '48,000'], ['Trees planted', '12M'], ['Communities partnered', '140'], ['CO₂ removed (t)', '2.1M']]],
        ['features', 'Our work', 'Where we *focus*', '', [['Forests', 'Native reforestation that lasts.'], ['Rivers', 'Clean water, healthy habitats.'], ['Coasts', 'Mangroves and reefs as natural defences.']]],
        ['manifesto', 'Our promise', 'Every project is led *locally,* measured *independently* and reported *openly.*'],
        ['newsletter', 'Field notes from the frontline', 'Stories from our restoration sites, once a month.', 'Subscribe'],
        ['cta', '', 'The best time to act was then. *The next best is now.*', 'Donate, volunteer or partner with us.']], pages: ['Impact', 'Contact'],
      langs: ['organic', 'editorial', 'swiss', 'bento', 'cinematic', 'corporate'] }),
    I({ id: 'civic-gov', name: 'Civic', category: 'Government', desc: 'public service, council or agency', kw: ['government', 'council', 'public service', 'city', 'municipal', 'agency', 'policy', 'politician', 'campaign'], brand: '#1D4F91', mood: 'light', radius: 'soft', fonts: ['IBM Plex Sans', 'IBM Plex Sans'], art: ['lines'], hero: 'split', links: ['Services', 'News', 'Contact'], cta: 'Find a service',
      home: [['hero', 'Official service', 'Public services, *made simple.*', 'Apply, pay, report and book online with {name}. Clear steps, plain language, open 24/7.'],
        ['features', 'Popular services', 'What do you need to *do?*', '', [['Apply for a permit', 'Building, parking and events.'], ['Pay a bill', 'Council tax, fines and fees.'], ['Report a problem', 'Potholes, lights and waste.'], ['Book an appointment', 'In person or by video.']]],
        ['steps', 'How it works', 'Three steps, *no queues.*', '', [['Choose a service', 'Every service in one place.'], ['Tell us the details', 'We only ask what we need.'], ['Track progress', 'Updates by email or text.']]],
        ['faq', 'Help', 'Frequently asked', '', [['Is this service free?', 'Most services are free; fees are always shown upfront.'], ['Can someone apply for me?', 'Yes, with your permission.'], ['Is my data safe?', 'We follow national data protection law.'], ['Need another language?', 'Every page can be translated.']]],
        ['contact', 'Contact', 'Talk to a *person*', 'Phone lines open Monday to Friday, 8am to 6pm.', [['Phone', '0300 123 4567'], ['Email', 'help@civic.example']]]], pages: ['Services', 'Contact'],
      langs: ['corporate', 'swiss', 'mono', 'bento', 'editorial', 'organic'] }),
    I({ id: 'trades-home', name: 'Foreman', category: 'Home Services', desc: 'contractor, renovation and repair', kw: ['contractor', 'builder', 'plumber', 'electrician', 'renovation', 'roofing', 'cleaning', 'handyman', 'repair', 'landscaping'], brand: '#F07A1A', mood: 'light', radius: 'soft', fonts: ['Archivo', 'Inter'], art: ['house', 'lines'], hero: 'split', links: ['Services', 'Projects', 'Quote'], cta: 'Get a free quote',
      home: [['hero', 'Licensed · Insured · 5★ rated', 'Renovations done *right,* the first time.', '{name} handles kitchens, bathrooms, roofs and repairs, with fixed quotes and a 10-year guarantee.'],
        ['stats', '', '', '', [['Homes renovated', '1,900'], ['Average rating', '4.9'], ['Years trading', '22'], ['Guarantee (years)', '10']]],
        ['services', 'Services', 'What we *do*', '', [['Kitchens', 'Design, fit and finish.', 'From $12k'], ['Bathrooms', 'Wet rooms, tiling, plumbing.', 'From $8k'], ['Roofing', 'Repairs and full replacements.', 'Free survey'], ['Repairs', 'Same-week handyman visits.', 'From $95']]],
        ['testimonials', 'Reviews', 'Neighbours say', '', [['On time, on budget and spotless.', '', '', 'Kitchen, Oakwood'], ['They fixed what two others couldn’t.', '', '', 'Roof repair'], ['Clear quote, no surprises.', '', '', 'Bathroom refit']]],
        ['contact', 'Free quote', 'Tell us about the *job*', 'We reply within one working day with a fixed quote.', [['Phone', '(555) 010-4455'], ['Hours', 'Mon–Sat, 7am–7pm']]]], pages: ['Services', 'Contact'],
      langs: ['brutalist', 'corporate', 'bento', 'playful', 'swiss', 'organic'] }),
    I({ id: 'talent-hr', name: 'Hireline', category: 'HR & Hiring', desc: 'careers page and recruiting platform', kw: ['hiring', 'recruiting', 'careers', 'jobs', 'hr', 'talent', 'recruitment', 'job board'], brand: '#6D4AFF', mood: 'light', radius: 'round', fonts: ['Plus Jakarta Sans', 'Inter'], art: ['ui', 'blobs'], hero: 'center', links: ['Jobs', 'Culture', 'Benefits'], cta: 'See open roles',
      home: [['hero', 'We’re hiring', 'Do the best work of *your career.*', 'Join {name}: 400 people across 12 countries building tools millions rely on.'],
        ['stats', '', '', '', [['Open roles', '38'], ['Countries', '12'], ['Remote-friendly', '100%'], ['Glassdoor rating', '4.7']]],
        ['bento', 'Benefits', 'We take care of *our people.*', '', [['Remote first', 'Work where you do your best work.'], ['Learning budget', '$2,000 every year.'], ['Health', 'Full cover for you and family.'], ['Time off', '30 days plus your birthday.'], ['Equity', 'Everyone is an owner.'], ['Gear', 'The setup you need, day one.']]],
        ['services', 'Open roles', 'Find your *team*', '', [['Senior Product Designer', 'Design · Remote', 'Apply'], ['Staff Engineer, Platform', 'Engineering · Remote', 'Apply'], ['Customer Success Lead', 'Success · London', 'Apply'], ['Data Scientist', 'Data · Remote', 'Apply']]],
        ['testimonials', 'Life here', 'From the team', '', [['I shipped more in a year here than in five elsewhere.', '', '', 'Engineer, 3 years'], ['Real trust, real flexibility.', '', '', 'Designer, 2 years'], ['The kindest high-performing team.', '', '', 'Product manager']]],
        ['cta', '', 'Your next chapter *starts here.*', 'Don’t see your role? Send us a note anyway.']], pages: ['Jobs', 'Contact'],
      langs: ['bento', 'playful', 'glass', 'corporate', 'editorial', 'mono'] }),
    I({ id: 'waitlist-launch', name: 'Countdown', category: 'Launch & Coming Soon', desc: 'pre-launch waitlist page', kw: ['coming soon', 'waitlist', 'launch', 'pre-launch', 'beta', 'early access', 'kickstarter'], brand: '#7C5CFF', mood: 'dark', radius: 'round', fonts: ['Space Grotesk', 'Inter'], art: ['blobs'], hero: 'center', links: ['Features', 'FAQ'], cta: 'Join the waitlist',
      home: [['hero', 'Launching this spring', 'Something *new* is coming.', '{name} is almost ready. Join the waitlist for early access and founding-member pricing.'],
        ['newsletter', 'Get early access', 'Be first in line. We’ll only email you about the launch.', 'Join the waitlist'],
        ['bento', 'Sneak peek', 'Built for *what’s next.*', '', [['Fast', 'Instant, everywhere.'], ['Private', 'Your data stays yours.'], ['Beautiful', 'Designed down to the pixel.'], ['Open', 'Works with the tools you love.']]],
        ['faq', 'FAQ', 'Before we launch', '', [['When is launch?', 'Early access opens this spring.'], ['Will it be free?', 'There will be a generous free plan.'], ['How do I get early access?', 'Join the waitlist; we invite in waves.']]],
        ['cta', '', 'See you *on launch day.*', 'Founding members get 40% off for life.']], pages: ['FAQ'],
      langs: ['glass', 'retro', 'brutalist', 'mono', 'cinematic', 'playful'] }),
    I({ id: 'cv-personal', name: 'Profile', category: 'Personal', desc: 'personal site, CV and résumé', kw: ['resume', 'cv', 'personal site', 'about me', 'freelancer', 'personal brand', 'biography'], brand: '#2E7D6B', mood: 'light', radius: 'soft', fonts: ['Inter Tight', 'Inter'], art: ['blobs'], hero: 'editorial', links: ['Work', 'About', 'Contact'], cta: 'Get in touch',
      home: [['hero', 'Designer & engineer · Lisbon', 'I build calm software for *busy people.*', 'Hi, I’m {name}. Ten years designing and building products for startups and enterprises.'],
        ['services', 'Experience', 'Where I’ve *worked*', '', [['Head of Design — Northwind', 'Led a team of 12 across web and mobile.', '2022 — now'], ['Senior Designer — Lumen', 'Design system and onboarding.', '2019 — 2022'], ['Product Designer — Kestrel', 'Payments and dashboards.', '2016 — 2019']]],
        ['showcase', 'Selected work', 'Case *studies*', '', [['Onboarding that halved drop-off', 'Fintech app', '2025'], ['A design system for 40 teams', 'Enterprise SaaS', '2024'], ['Checkout redesign', 'E-commerce', '2023'], ['Clinic booking app', 'Healthcare', '2022']]],
        ['testimonials', 'Kind words', 'What people *say*', '', [['The rare designer who ships.', '', '', 'CTO, Northwind'], ['Made the complex feel obvious.', '', '', 'VP Product, Lumen'], ['A joy to work with.', '', '', 'Founder, Kestrel']]],
        ['cta', '', 'Let’s make something *good.*', 'Available for select projects from next month.']], pages: ['Work', 'Contact'],
      langs: ['mono', 'editorial', 'swiss', 'retro', 'organic', 'glass'] }),
    I({ id: 'freight-logistics', name: 'Freightline', category: 'Transportation', desc: 'logistics, fleet and mobility', kw: ['logistics', 'shipping', 'freight', 'transport', 'delivery', 'fleet', 'trucking', 'automotive', 'car', 'mobility', 'ev'], brand: '#FFB400', mood: 'dark', radius: 'soft', fonts: ['Archivo', 'Inter'], art: ['lines', 'ui'], hero: 'center', links: ['Solutions', 'Network', 'Track'], cta: 'Get a quote',
      home: [['hero', 'Road · Air · Ocean', 'Freight that arrives *when you said.*', '{name} moves goods across 60 countries with live tracking, fixed prices and one point of contact.'],
        ['stats', '', '', '', [['Shipments a year', '2.4M'], ['On-time delivery', '98.6%'], ['Countries', '60'], ['Warehouses', '140']]],
        ['dashboard', 'Live tracking', 'Every shipment, *in view.*', 'ETAs, exceptions and documents in one dashboard.', { product: '{name}', heading: 'Shipments', nav: ['Overview', 'Shipments', 'Quotes', 'Invoices', 'Settings'], kpis: [['In transit', '1,284', '+6%'], ['On time', '98.6%', '+0.4 pts'], ['Exceptions', '12', '−5'], ['Avg. transit', '3.2 days', '−0.3']], cols: ['Shipment', 'Route', 'Status', 'ETA', 'Weight'], rows: [['FL-20931', 'Rotterdam → Lyon', 'Active', 'Today', '4,200 kg'], ['FL-20930', 'Shanghai → LA', 'Pending', 'Mon', '18,000 kg'], ['FL-20927', 'Hamburg → Oslo', 'Healthy', 'Tomorrow', '2,600 kg'], ['FL-20919', 'Dubai → Nairobi', 'At risk', 'Wed', '7,900 kg']], filter: 'Filter shipments' }],
        ['features', 'Solutions', 'Built for *every lane*', '', [['Full truckload', 'Dedicated capacity, fixed price.'], ['Air freight', 'Next-flight-out, worldwide.'], ['Ocean', 'FCL and LCL with customs handled.']]],
        ['cta', '', 'Ship with *certainty.*', 'Instant quotes, 24/7 support.']], pages: ['Solutions', 'Contact'],
      langs: ['corporate', 'cinematic', 'swiss', 'bento', 'brutalist', 'glass'] }),
    I({ id: 'events-wedding', name: 'Vow', category: 'Weddings & Events', desc: 'wedding, venue and event planning', kw: ['wedding', 'event', 'venue', 'planner', 'conference', 'party', 'celebration', 'rsvp'], brand: '#B08968', mood: 'light', radius: 'sharp', fonts: ['Cormorant Garamond', 'Jost'], art: ['arch', 'blobs'], hero: 'media', links: ['Venue', 'Weddings', 'Enquire'], cta: 'Check dates',
      home: [['hero', 'A country house for celebrations', 'Days you’ll tell your *grandchildren* about.', 'Weddings and gatherings for up to 180 guests at {name}, with gardens, a lake and a kitchen that cares.'],
        ['gallery', 'The venue', 'A place to *gather*', '', [['Lakeside ceremony'], ['Orangery dinner'], ['Walled garden'], ['Bridal suite'], ['Barn dancefloor'], ['Evening lanterns']]],
        ['pricing', 'Packages', 'Wedding *packages*', '', [['Intimate', 'Up to 40 guests · Ceremony & dinner', '£6,500', 'midweek'], ['Classic', 'Up to 120 guests · Full day', '£14,000', 'weekends'], ['Grand', 'Up to 180 guests · Two-day exclusive', '£24,000', 'exclusive use']]],
        ['testimonials', 'Couples', 'Love notes', '', [['Every detail was perfect.', '', '', 'Maya & Tom'], ['Our guests still talk about the food.', '', '', 'Priya & Sam'], ['Calm, kind and brilliant.', '', '', 'Léa & Noor']]],
        ['cta', '', 'Your date is *waiting.*', 'Book a private viewing.']], pages: ['Weddings', 'Contact'],
      langs: ['luxury', 'editorial', 'organic', 'playful', 'mono', 'glass'] }),
    I({ id: 'web3-crypto', name: 'Ledger', category: 'Web3 & Crypto', desc: 'crypto exchange, wallet or protocol', kw: ['crypto', 'web3', 'blockchain', 'defi', 'nft', 'wallet', 'token', 'exchange', 'bitcoin', 'ethereum'], brand: '#7B61FF', mood: 'dark', radius: 'round', fonts: ['Space Grotesk', 'Inter'], art: ['ui', 'lines'], hero: 'center', links: ['Trade', 'Earn', 'Security'], cta: 'Open the app',
      home: [['hero', 'Self-custody · Audited · Open source', 'Own your money. *Truly.*', '{name} is a wallet and exchange where your keys never leave your device.'],
        ['logos', 'Audited by', [['Trail of Bits'], ['OpenZeppelin'], ['Certik'], ['Halborn']]],
        ['dashboard', 'Portfolio', 'Your assets, *one view.*', 'Balances, swaps and staking across chains.', { product: '{name}', heading: 'Portfolio', nav: ['Portfolio', 'Swap', 'Earn', 'Activity', 'Settings'], kpis: [['Balance', '$48,210', '+4.2%'], ['24h change', '+$1,940', '+4.2%'], ['Staking APY', '5.8%', '+0.3 pts'], ['Gas saved', '$212', '+18%']], chartTitle: 'Portfolio value ($k)', bars: [['ETH', 48], ['BTC', 31], ['SOL', 12], ['Stable', 9]], barTitle: 'Allocation', cols: ['Asset', 'Chain', 'Status', 'Amount', 'Value $'], rows: [['ETH', 'Ethereum', 'Active', '8.2', '$26,400'], ['BTC', 'Bitcoin', 'Healthy', '0.24', '$15,100'], ['SOL', 'Solana', 'Active', '38', '$5,800'], ['USDC', 'Base', 'Healthy', '910', '$910']], filter: 'Filter assets' }],
        ['bento', 'Why {name}', 'Security you can *verify.*', '', [['Self-custody', 'Keys stay on your device.'], ['Audited', 'Four independent audits.'], ['Multi-chain', '20+ networks.'], ['Open source', 'Every line public.']]],
        ['faq', 'FAQ', 'Good questions', '', [['What if I lose my phone?', 'Restore with your recovery phrase.'], ['Are there fees?', 'A 0.25% swap fee; staking is free.'], ['Is it regulated?', 'We comply with local rules where we operate.']]],
        ['cta', '', 'Your keys. *Your future.*', 'Download for iOS, Android and desktop.']], pages: ['Security', 'Contact'],
      langs: ['glass', 'retro', 'cinematic', 'brutalist', 'bento', 'mono'] }),
    I({ id: 'app-mobile', name: 'Pocket', category: 'Mobile Apps', desc: 'mobile app landing page', kw: ['mobile app', 'ios', 'android', 'app store', 'habit', 'fitness app', 'budget app', 'productivity app', 'app'], brand: '#FF6B3D', mood: 'light', radius: 'round', fonts: ['Plus Jakarta Sans', 'Inter'], art: ['ui', 'blobs'], hero: 'split', links: ['Features', 'Reviews', 'Pricing'], cta: 'Download free',
      home: [['hero', '★★★★★ 4.9 on the App Store', 'Good habits, *finally* stick.', '{name} turns tiny daily wins into lasting change, with streaks, reminders and a coach in your pocket.'],
        ['stats', '', '', '', [['Downloads', '3M+'], ['App Store rating', '4.9'], ['Daily streaks kept', '18M'], ['Countries', '140']]],
        ['steps', 'How it works', 'Onboarding in *60 seconds.*', '', [['Pick a goal', 'Sleep, move, focus or read.'], ['Get a plan', 'Tiny steps, tuned to you.'], ['Keep the streak', 'Gentle nudges, no guilt.']]],
        ['bento', 'Features', 'Designed for *real life.*', '', [['Smart reminders', 'At the moment you’re most likely to act.'], ['Streaks', 'Celebrate the small wins.'], ['Widgets', 'Your habits on your home screen.'], ['Insights', 'See what’s working, weekly.']]],
        ['pricing', 'Pricing', 'Free to start. *Premium to grow.*', '', [['Free', '3 habits · Reminders · Streaks', '$0', 'forever'], ['Premium', 'Unlimited habits · Coach · Insights', '$4.99', 'per month'], ['Family', 'Up to 6 people · Shared goals', '$9.99', 'per month']]],
        ['cta', '', 'Your best habits are *one tap away.*', 'Free on iOS and Android.']], pages: ['Pricing', 'Contact'],
      langs: ['playful', 'bento', 'glass', 'retro', 'organic', 'swiss'] }),
    I({ id: 'law-firm', name: 'Statute', category: 'Legal', desc: 'law firm and legal services', kw: ['law', 'lawyer', 'attorney', 'legal', 'law firm', 'solicitor', 'litigation', 'immigration'], brand: '#7A2E2E', mood: 'light', radius: 'sharp', fonts: ['Libre Baskerville', 'Source Sans 3'], art: ['lines', 'arch'], hero: 'editorial', links: ['Practice areas', 'Team', 'Contact'], cta: 'Book a consultation',
      home: [['hero', 'Counsel since 1987', 'Clear advice when it *matters most.*', '{name} advises families and businesses on disputes, property, employment and immigration.'],
        ['services', 'Practice areas', 'How we *help*', '', [['Disputes', 'Negotiation first, court when needed.', 'Fixed fees'], ['Property', 'Purchases, leases and planning.', 'From £1,200'], ['Employment', 'For employers and employees.', 'Free first call'], ['Immigration', 'Visas, citizenship and appeals.', 'Fixed fees']]],
        ['stats', '', '', '', [['Years in practice', '38'], ['Cases resolved', '9,400'], ['Partners', '14'], ['Client satisfaction', '97%']]],
        ['team', 'Team', 'Meet the *partners*', '', [['Eleanor Hart', '', '', 'Managing partner'], ['Rafael Osei', '', '', 'Disputes'], ['Mei Tanaka', '', '', 'Immigration'], ['David Kerr', '', '', 'Property']]],
        ['faq', 'FAQ', 'Before you call', '', [['How much does advice cost?', 'Most matters have a fixed fee, agreed upfront.'], ['Do you offer free consultations?', 'Yes, a free 20-minute first call.'], ['Can we meet online?', 'Yes, by phone or video.']]],
        ['cta', '', 'Talk to someone who *listens.*', 'Free 20-minute first consultation.']], pages: ['Practice areas', 'Contact'],
      langs: ['corporate', 'editorial', 'luxury', 'mono', 'swiss', 'organic'] })
  ];

  PACKS.push(
    I({ id: 'ent-corp', name: 'Meridian', category: 'Enterprise', desc: 'global corporate group', kw: ['corporation', 'corporate group', 'holding', 'conglomerate', 'enterprise', 'group company', 'investor relations'], brand: '#0F4C81', mood: 'light', radius: 'soft', fonts: ['Inter Tight', 'Inter'], art: ['lines', 'ui'], hero: 'split', links: ['Businesses', 'Sustainability', 'Investors'], cta: 'Contact us',
      home: [['hero', 'Operating in 42 countries', 'Building what the *next century* runs on.', '{name} brings together energy, infrastructure and technology businesses that serve 90 million people.'],
        ['logos', 'Our businesses', [['Meridian Energy'], ['Meridian Infra'], ['Meridian Digital'], ['Meridian Capital']]],
        ['stats', '', '', '', [['Revenue (2025)', '$48B'], ['Employees', '120,000'], ['Countries', '42'], ['Net-zero target', '2040']]],
        ['features', 'What we do', 'Four businesses, *one purpose.*', '', [['Energy', 'Renewables and grid modernisation.'], ['Infrastructure', 'Ports, rail and water.'], ['Digital', 'Cloud, data centres and networks.'], ['Capital', 'Long-term investment in essential assets.']]],
        ['split', 'Sustainability', 'Progress you can *audit.*', 'Our climate targets are science-based and independently assured every year.', [['Science-based targets'], ['Annual assured report'], ['Supplier code of conduct']], 'Read the report'],
        ['services', 'Investors', 'For *shareholders*', '', [['Annual report 2025', 'Results, strategy and governance.', 'PDF'], ['Q2 results', 'Presentation and webcast.', 'August'], ['AGM', 'Notice and voting.', 'May']]],
        ['cta', '', 'Partner with *{name}.*', 'Talk to our partnerships team.']], pages: ['Businesses', 'Investors', 'Contact'],
      langs: ['corporate', 'swiss', 'mono', 'bento', 'editorial', 'glass'] }),
    I({ id: 'ent-industrial', name: 'Forgeworks', category: 'Enterprise', desc: 'manufacturing and industrial', kw: ['manufacturing', 'industrial', 'factory', 'engineering', 'machinery', 'supply chain', 'automotive parts', 'aerospace'], brand: '#E2661B', mood: 'dark', radius: 'sharp', fonts: ['Archivo', 'Inter'], art: ['lines', 'ui'], hero: 'poster', links: ['Capabilities', 'Industries', 'Quality'], cta: 'Request a quote',
      home: [['hero', 'ISO 9001 · AS9100 · IATF 16949', 'Precision parts at *production scale.*', '{name} machines, forms and assembles components for aerospace, automotive and energy, from prototype to a million units.'],
        ['stats', '', '', '', [['Parts shipped / year', '38M'], ['Tolerance', '±5 µm'], ['On-time delivery', '99.2%'], ['Plants', '9']]],
        ['services', 'Capabilities', 'From prototype to *mass production*', '', [['CNC machining', '5-axis, micron tolerances.', '24h quotes'], ['Sheet metal', 'Laser, bend, weld, finish.', 'Low to high volume'], ['Assembly', 'Sub-assemblies and kitting.', 'Turnkey'], ['Testing', 'CMM, NDT and full traceability.', 'Certified']]],
        ['features', 'Industries', 'Trusted where failure *isn’t an option*', '', [['Aerospace', 'AS9100 flight-critical parts.'], ['Automotive', 'IATF-certified series production.'], ['Energy', 'Components for turbines and grids.']]],
        ['dashboard', 'Customer portal', 'Every order, *traceable.*', 'Live order status, certificates and quality data.', { product: '{name} Portal', heading: 'Orders', nav: ['Orders', 'Quotes', 'Quality', 'Documents', 'Settings'], kpis: [['Open orders', '64', '+4'], ['On time', '99.2%', '+0.3 pts'], ['NCRs (30d)', '2', '−3'], ['Lead time', '11 days', '−2']], cols: ['Order', 'Part', 'Status', 'Qty', 'Due'], rows: [['PO-44120', 'Bracket AL-7', 'Active', '12,000', '14 Oct'], ['PO-44117', 'Housing TI-2', 'Pending', '800', '21 Oct'], ['PO-44102', 'Shaft ST-9', 'Healthy', '40,000', '3 Nov'], ['PO-44091', 'Flange SS-4', 'At risk', '2,400', '8 Oct']], filter: 'Filter orders' }],
        ['cta', '', 'Send a drawing. *Get a quote tomorrow.*', 'NDA-protected, engineer-reviewed quotes.']], pages: ['Capabilities', 'Quality', 'Contact'],
      langs: ['cinematic', 'brutalist', 'swiss', 'corporate', 'mono', 'glass'] }),
    I({ id: 'ent-insurance', name: 'Harborline', category: 'Enterprise', desc: 'insurance and risk', kw: ['insurance', 'insurer', 'policy', 'claims', 'risk', 'underwriting', 'coverage', 'broker'], brand: '#0E7A6B', mood: 'light', radius: 'round', fonts: ['Plus Jakarta Sans', 'Inter'], art: ['blobs', 'ui'], hero: 'split', links: ['Personal', 'Business', 'Claims'], cta: 'Get a quote',
      home: [['hero', 'Rated A+ for financial strength', 'Cover that shows up *when it counts.*', '{name} insures homes, cars and businesses, with claims paid in days, not months.'],
        ['stats', '', '', '', [['Customers', '4.2M'], ['Claims paid in 5 days', '92%'], ['Trustpilot', '4.8'], ['Years protecting', '70']]],
        ['bento', 'Cover', 'Protection for *every part of life.*', '', [['Home', 'Buildings and contents, one policy.'], ['Car', 'Comprehensive cover, courtesy car included.'], ['Business', 'Liability, property and cyber.'], ['Travel', 'Annual cover for the whole family.']]],
        ['steps', 'Claims', 'Claim in *three steps*', '', [['Tell us', 'Online or by phone, 24/7.'], ['Upload', 'Photos and receipts from your phone.'], ['Get paid', 'Most claims settled within 5 days.']]],
        ['faq', 'FAQ', 'Questions, answered', '', [['How fast are claims paid?', '92% within 5 working days.'], ['Can I pay monthly?', 'Yes, with no interest.'], ['Is there a cooling-off period?', '14 days, full refund.']]],
        ['cta', '', 'Get covered in *five minutes.*', 'Instant quotes, no call centre queues.']], pages: ['Business', 'Claims', 'Contact'],
      langs: ['bento', 'corporate', 'glass', 'playful', 'mono', 'organic'] }),
    I({ id: 'ent-consulting', name: 'Northgate', category: 'Enterprise', desc: 'management consulting firm', kw: ['consulting', 'consultancy', 'advisory', 'strategy firm', 'transformation', 'management consulting'], brand: '#1B2A4A', mood: 'light', radius: 'sharp', fonts: ['Libre Baskerville', 'Inter'], art: ['lines', 'arch'], hero: 'editorial', links: ['Insights', 'Industries', 'Careers'], cta: 'Talk to us',
      home: [['hero', 'Strategy · Operations · Technology', 'Hard problems, *clear answers.*', '{name} helps leadership teams make the few decisions that matter, and then makes them happen.'],
        ['services', 'Capabilities', 'Where we *help*', '', [['Strategy', 'Growth, portfolio and M&A.', 'CEO agenda'], ['Operations', 'Cost, supply chain and performance.', 'Measurable'], ['Technology', 'AI, data and digital transformation.', 'End to end'], ['People', 'Organisation, culture and leadership.', 'Lasting']]],
        ['stats', '', '', '', [['Fortune 500 clients', '180'], ['Offices', '34'], ['Consultants', '6,000'], ['Client retention', '91%']]],
        ['showcase', 'Insights', 'Latest *thinking*', '', [['The AI operating model', 'How leaders are reorganising for AI.', 'Report'], ['Resilient supply chains', 'Lessons from five disruptions.', 'Article'], ['The next decade of energy', 'Scenarios for 2035.', 'Research'], ['Board-ready data', 'A practical guide.', 'Guide']]],
        ['testimonials', 'Clients', 'What leaders *say*', '', [['They changed how our board makes decisions.', '', '', 'CEO, FTSE 100'], ['Rigorous, fast and humble.', '', '', 'CFO, global retailer'], ['Impact we could measure in a quarter.', '', '', 'COO, logistics group']]],
        ['cta', '', 'Let’s talk about *what’s next.*', 'A conversation with a partner, not a pitch.']], pages: ['Insights', 'Industries', 'Contact'],
      langs: ['editorial', 'corporate', 'mono', 'swiss', 'luxury', 'bento'] })
  );

  /* ---------------------------------------------------------------- languages for the existing packs */
  const EXISTING = { nova: ['glass', 'cinematic', 'bento', 'brutalist', 'mono', 'swiss'], pulse: ['cinematic', 'brutalist', 'retro', 'playful', 'swiss', 'bento'], harbor: ['editorial', 'organic', 'luxury', 'playful', 'mono', 'brutalist'],
    lumen: ['organic', 'corporate', 'bento', 'mono', 'editorial', 'glass'], vault: ['corporate', 'glass', 'bento', 'swiss', 'mono', 'luxury'], scholar: ['playful', 'bento', 'editorial', 'corporate', 'retro', 'swiss'],
    kin: ['organic', 'editorial', 'playful', 'swiss', 'corporate', 'brutalist'], wander: ['luxury', 'organic', 'editorial', 'cinematic', 'glass', 'mono'], forge: ['retro', 'brutalist', 'glass', 'mono', 'swiss', 'cinematic'],
    bloom: ['luxury', 'organic', 'playful', 'editorial', 'glass', 'mono'], studio: ['swiss', 'brutalist', 'editorial', 'cinematic', 'mono', 'retro'], market: ['bento', 'playful', 'brutalist', 'luxury', 'mono', 'organic'],
    atlas: ['bento', 'glass', 'corporate', 'swiss', 'mono', 'cinematic'], console: ['corporate', 'glass', 'mono', 'bento', 'retro', 'swiss'] };
  PACKS.forEach((p) => { C.LIB.push(p); });
  const hueShift = (hex, deg) => { const [h, s, l] = hsl(hex); return hslToHex(h + deg, Math.max(0.45, s), Math.min(0.56, Math.max(0.38, l))); };

  /* ---------------------------------------------------------------- register 180 templates */
  const made = [];
  C.LIB.forEach((lib) => {
    const langs = lib.langs || EXISTING[lib.id]; if (!langs) return;
    langs.slice(0, 6).forEach((lang, i) => {
      const G = LANGS[lang]; const id = `${lib.id}-${lang}`; if (T._byId(id)) return;
      const brand = G.brand || hueShift(lib.brand, i * 47);
      const name = `${lib.name} ${G.nick}`;
      const opts = { lang, brand, name };
      const pal = paletteFor(brand, G);
      const t = { id, name, category: lib.category, desc: `${G.label} ${lib.desc || lib.category.toLowerCase()} site. ${G.desc}`, lang, pages: 1 + (lib.pages || []).length, variants: variantsOf(pal, G.mood), build() { return C.site(C.specFromLib(lib, opts), { id }); } };
      T.register(t); made.push(id);
    });
  });
  // language + category metadata on every template (hand-built ones default to their own look)
  T.list.forEach((m) => { const src = T._byId(m.id); m.lang = src.lang || ''; m.langLabel = src.lang ? LANGS[src.lang].label : 'Signature'; });

  /* ---------------------------------------------------------------- the Architect's taste: pick languages for a brief */
  function langsFor(brief, lib) {
    const b = String(brief || '').toLowerCase();
    const hit = Object.keys(LANG_KEYWORDS).filter((k) => LANG_KEYWORDS[k].test(b));
    const prefs = (lib && (lib.langs || EXISTING[lib.id])) || ['bento', 'editorial', 'glass'];
    const out = [...new Set(hit.concat(prefs))];
    return out.slice(0, 3);
  }

  window.LoomLangs = { LANGS, apply, specFor, paletteFor, langsFor, KEYWORDS: LANG_KEYWORDS, PACKS, made, CATEGORIES: [...new Set(T.list.map((t) => t.category))].sort() };
})();
