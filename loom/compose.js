/* LOOM — composer.
   Turns a SiteSpec (what the Architect agent, AI or local, designs) into a normal, fully editable
   Loom project, and holds the industry library that powers the offline agents, the spec-built
   templates and their colour variations.

   SiteSpec = { name, tagline, industry, palette:{brand,ink,paper,muted,soft,line}, fonts:{heading,body},
                style:{radius:'sharp'|'soft'|'round', mood:'light'|'dark', headWeight}, nav:{links[], cta},
                pages:[{ name, title, description, sections:[Section] }], footer }
   Section  = { kind, eyebrow?, title, text?, cta?, items?:[{ title, text?, value?, meta? }] }        */
(() => {
  'use strict';
  const L = window.Loom, T = window.LoomTemplates;
  const { N } = L;
  const { nav, sec, H, Pp, Tx, Btn, Img, D, footer, cta } = T.build;
  const PAD = T.PAD;

  /* ---------------------------------------------------------------- colour */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  function hexToRgb(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  function hslToHex(h, s, l) { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255); }
  const hsl = (hex) => rgbToHsl(...hexToRgb(hex));
  function lum(hex) { return hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Nudge `fg` lighter/darker until it reaches `ratio` against `bg`. */
  function ensureContrast(fg, bg, ratio = 4.5) {
    let [h, s, l] = hsl(fg); const dark = lum(bg) > 0.4;
    for (let i = 0; i < 40 && contrast(hslToHex(h, s, l), bg) < ratio; i++) l = clamp(l + (dark ? -0.025 : 0.025));
    return hslToHex(h, s, l);
  }
  const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || '').trim());
  /** A full accessible palette from one brand colour. */
  function paletteFrom(brand, mood = 'light') {
    const [h, s] = hsl(brand);
    const p = mood === 'dark'
      ? { paper: hslToHex(h, Math.min(s, 0.25), 0.06), ink: hslToHex(h, 0.12, 0.94), muted: hslToHex(h, 0.1, 0.68), soft: hslToHex(h, Math.min(s, 0.22), 0.11), line: hslToHex(h, 0.14, 0.2) }
      : { paper: hslToHex(h, Math.min(s, 0.3), 0.985), ink: hslToHex(h, 0.35, 0.1), muted: hslToHex(h, 0.1, 0.4), soft: hslToHex(h, Math.min(s, 0.45), 0.95), line: hslToHex(h, 0.2, 0.89) };
    p.brand = mood === 'dark' ? ensureContrast(brand, p.paper, 4.5) : brand;
    return fixPalette(p, mood);
  }
  /** Guarantee WCAG AA: ink/paper ≥ 7, muted/paper ≥ 4.5, paper on brand (buttons) ≥ 4.5. */
  function fixPalette(p, mood) {
    const o = Object.assign({}, p);
    Object.keys(o).forEach((k) => { if (!isHex(o[k])) o[k] = { brand: '#3B6CFF', ink: '#0F172A', paper: '#FFFFFF', muted: '#5B6475', soft: '#F2F4F8', line: '#E2E6EE' }[k]; });
    o.ink = ensureContrast(o.ink, o.paper, 7); o.muted = ensureContrast(o.muted, o.paper, 4.5);
    if (mood !== 'dark' && contrast(o.paper, o.brand) < 4.5) o.brand = ensureContrast(o.brand, o.paper, 4.5);
    return o;
  }
  /** Colour variations of a palette: same structure, new hue families. */
  function variantsOf(palette, mood, names = ['Original', 'Ocean', 'Forest', 'Ember']) {
    const [h] = hsl(palette.brand);
    const hues = [null, 212, 152, 18].map((x, i) => (i === 0 ? null : Math.abs(x - h) < 25 ? (x + 120) % 360 : x));
    return names.map((name, i) => {
      if (i === 0) return { name, dots: [palette.brand, palette.paper, palette.ink], swatches: palette };
      const [, s, l] = hsl(palette.brand); const v = paletteFrom(hslToHex(hues[i], Math.max(s, 0.5), clamp(l, 0.38, 0.55)), mood);
      return { name, dots: [v.brand, v.paper, v.ink], swatches: v };
    });
  }

  /* ---------------------------------------------------------------- Loom Design System v2 (tokens → classes)
     Fluid type (clamp), an 8-pt spacing rhythm, a 1320px grid with fluid gutters, three shape
     scales, and WCAG-first defaults: 17px body, 1.6 line height, ≤ 62ch measure, 44px+ targets. */
  const radiusOf = (r) => ({ sharp: ['4px', '4px'], soft: ['18px', '12px'], round: ['28px', '999px'] }[r] || ['18px', '999px']);
  const GUT = 'clamp(20px, 5vw, 80px)';
  const B = (w, c = 'var(--sw-line)') => ({ 'border-top-width': w, 'border-right-width': w, 'border-bottom-width': w, 'border-left-width': w, 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': c, 'border-right-color': c, 'border-bottom-color': c, 'border-left-color': c });
  const BT = (c = 'var(--sw-line)') => ({ 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': c });
  const PX = (y, x = GUT) => ({ 'padding-top': y, 'padding-bottom': y, 'padding-left': x, 'padding-right': x });
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  function kitFor(style = {}) {
    const [rad, btnRad] = radiusOf(style.radius); const hw = style.headWeight || '700'; const dark = style.mood === 'dark';
    const hf = { 'font-family': 'var(--font-heading)', 'font-weight': hw };
    const k = {
      '@body': { base: { 'font-family': 'var(--font-body)', color: 'var(--sw-ink)', 'background-color': 'var(--sw-paper)', 'font-size': '17px', 'line-height': '1.6', '-webkit-font-smoothing': 'antialiased', 'text-rendering': 'optimizeLegibility', 'overflow-x': 'clip' } },
      '@h1': { base: { 'text-wrap': 'balance' } }, '@h2': { base: { 'text-wrap': 'balance' } }, '@p': { base: { 'text-wrap': 'pretty' } },
      nav: { base: { position: 'sticky', top: '0', 'z-index': '50', ...PX('18px'), 'background-color': 'color-mix(in srgb, var(--sw-paper) 84%, transparent)' } },
      'nav-in': { base: { width: '100%', 'max-width': '1440px', 'margin-left': 'auto', 'margin-right': 'auto', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'column-gap': '24px' } },
      brand: { base: { ...hf, 'font-size': '21px', 'letter-spacing': '-0.035em', 'text-decoration': 'none', color: 'var(--sw-ink)', display: 'inline-flex', 'align-items': 'center', 'column-gap': '10px' } },
      'nav-links': { base: { display: 'flex', 'align-items': 'center', 'column-gap': '32px' } },
      'nav-link': { base: { 'text-decoration': 'none', 'font-size': '15px', 'font-weight': '500', color: 'var(--sw-muted)', transition: 'color .25s', 'padding-top': '10px', 'padding-bottom': '10px' }, 'base:hover': { color: 'var(--sw-ink)' }, tablet: { display: 'none' } },
      btn: { base: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'column-gap': '10px', 'min-height': '54px', ...PX('0', '28px'), 'border-radius': btnRad, 'background-color': 'var(--sw-brand)', color: 'var(--sw-paper)', 'font-weight': '600', 'font-size': '15px', 'letter-spacing': '-0.01em', 'text-decoration': 'none', transition: `background-color .35s, color .35s, transform .5s ${EASE}` }, 'base:hover': { 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)' } },
      'btn-ghost': { base: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'min-height': '54px', ...PX('0', '28px'), 'border-radius': btnRad, ...B('1px', 'var(--sw-line)'), color: 'var(--sw-ink)', 'font-weight': '600', 'font-size': '15px', 'text-decoration': 'none', transition: `background-color .35s, color .35s, border-color .35s, transform .5s ${EASE}` }, 'base:hover': { 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)', 'border-top-color': 'var(--sw-ink)', 'border-right-color': 'var(--sw-ink)', 'border-bottom-color': 'var(--sw-ink)', 'border-left-color': 'var(--sw-ink)' } },
      'btn-xl': { base: { display: 'inline-flex', 'align-items': 'center', 'min-height': '76px', ...PX('0', '44px'), 'border-radius': btnRad, 'background-color': 'var(--sw-brand)', color: 'var(--sw-paper)', 'font-weight': '600', 'font-size': '19px', 'text-decoration': 'none', transition: `background-color .35s, transform .5s ${EASE}` }, 'base:hover': { 'background-color': 'var(--sw-ink)' } },
      section: { base: PX('clamp(96px, 12vw, 192px)') },
      'section-tight': { base: PX('clamp(48px, 6vw, 96px)') },
      container: { base: { width: '100%', 'max-width': '1320px', 'margin-left': 'auto', 'margin-right': 'auto' } },
      eyebrow: { base: { 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '0.16em', 'text-transform': 'uppercase', color: 'var(--sw-muted)', 'margin-bottom': '28px' } },
      display: { base: { ...hf, 'font-size': 'clamp(56px, 10.5vw, 188px)', 'line-height': '0.88', 'letter-spacing': '-0.06em', 'margin-bottom': '0', 'max-width': '13ch' } },
      'display-c': { base: { ...hf, 'font-size': 'clamp(52px, 9vw, 160px)', 'line-height': '0.9', 'letter-spacing': '-0.058em', 'margin-bottom': '28px', 'max-width': '14ch', 'margin-left': 'auto', 'margin-right': 'auto', 'text-align': 'center' } },
      'h-sec': { base: { ...hf, 'font-size': 'clamp(40px, 6.2vw, 112px)', 'line-height': '0.94', 'letter-spacing': '-0.05em', 'margin-bottom': '28px', 'max-width': '15ch' } },
      'h-sub': { base: { ...hf, 'font-size': 'clamp(22px, 2vw, 32px)', 'line-height': '1.15', 'letter-spacing': '-0.025em', 'margin-bottom': '12px' } },
      lead: { base: { 'font-size': 'clamp(18px, 1.5vw, 23px)', 'line-height': '1.55', color: 'var(--sw-muted)', 'max-width': '52ch', 'margin-bottom': '0' } },
      'card-text': { base: { color: 'var(--sw-muted)', 'font-size': '16px', 'line-height': '1.6', 'margin-bottom': '0', 'max-width': '62ch' } },
      actions: { base: { display: 'flex', 'flex-wrap': 'wrap', 'column-gap': '12px', 'row-gap': '12px', 'align-items': 'center' } },
      'sec-head': { base: { display: 'grid', 'grid-template-columns': '1fr 1fr', 'column-gap': '48px', 'align-items': 'end', 'margin-bottom': 'clamp(48px, 6vw, 96px)' }, tablet: { 'grid-template-columns': '1fr' } },
      'sec-head-c': { base: { display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'text-align': 'center', 'margin-bottom': 'clamp(48px, 6vw, 88px)' } },
      // hero
      'hero-ed': { base: { ...PX('clamp(56px, 8vw, 120px)'), 'padding-top': 'clamp(96px, 12vw, 180px)', 'min-height': '92vh', display: 'flex', 'flex-direction': 'column', 'justify-content': 'flex-end' } },
      'hero-meta': { base: { display: 'flex', 'justify-content': 'space-between', 'column-gap': '24px', 'row-gap': '8px', 'flex-wrap': 'wrap', 'padding-bottom': '20px', 'margin-bottom': 'clamp(32px, 5vw, 72px)', 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-line)', color: 'var(--sw-muted)', 'font-size': '14px', 'letter-spacing': '0.02em' } },
      'hero-foot': { base: { display: 'grid', 'grid-template-columns': 'minmax(0, 1.1fr) auto', 'column-gap': '48px', 'row-gap': '32px', 'align-items': 'end', 'margin-top': 'clamp(40px, 5vw, 80px)' }, tablet: { 'grid-template-columns': '1fr' } },
      'hero-split': { base: { ...PX('clamp(64px, 8vw, 120px)'), 'padding-top': 'clamp(96px, 10vw, 160px)' } },
      split: { base: { display: 'grid', 'grid-template-columns': '1fr 1fr', 'column-gap': 'clamp(32px, 6vw, 112px)', 'row-gap': '48px', 'align-items': 'center' }, tablet: { 'grid-template-columns': '1fr' } },
      half: { base: { 'min-width': '0' } },
      'hero-art': { base: { width: '100%', 'aspect-ratio': '4 / 5', 'object-fit': 'cover', 'border-radius': rad }, tablet: { 'aspect-ratio': '4 / 3' } },
      'hero-c': { base: { ...PX('clamp(64px, 8vw, 120px)'), 'padding-top': 'clamp(96px, 12vw, 180px)', display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'text-align': 'center' } },
      'lead-c': { base: { 'font-size': 'clamp(18px, 1.5vw, 23px)', 'line-height': '1.55', color: 'var(--sw-muted)', 'max-width': '46ch', 'margin-left': 'auto', 'margin-right': 'auto', 'margin-bottom': '40px' } },
      'actions-c': { base: { display: 'flex', 'flex-wrap': 'wrap', 'column-gap': '12px', 'row-gap': '12px', 'justify-content': 'center' } },
      'hero-wide': { base: { width: '100%', 'max-width': '1320px', 'margin-top': 'clamp(56px, 7vw, 104px)', 'aspect-ratio': '16 / 8', 'object-fit': 'cover', 'border-radius': rad, 'box-shadow': dark ? '0 60px 140px -60px rgba(0,0,0,.9)' : '0 60px 120px -60px rgba(20,24,40,.45)' }, landscape: { 'aspect-ratio': '4 / 3' } },
      'hero-media': { base: { position: 'relative', overflow: 'hidden', 'min-height': '100vh', display: 'flex', 'align-items': 'flex-end', ...PX('clamp(56px, 8vw, 120px)'), 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)' } },
      'media-bg': { base: { position: 'absolute', top: '-8%', left: '0', width: '100%', height: '116%', 'object-fit': 'cover', opacity: '0.7' } },
      'media-in': { base: { position: 'relative', 'z-index': '1', width: '100%', 'max-width': '1320px', 'margin-left': 'auto', 'margin-right': 'auto' } },
      'lead-inv': { base: { 'font-size': 'clamp(18px, 1.5vw, 23px)', 'line-height': '1.55', opacity: '0.82', 'max-width': '50ch', 'margin-bottom': '36px' } },
      // marquee + manifesto
      marquee: { base: { 'padding-top': 'clamp(22px, 2.6vw, 40px)', 'padding-bottom': 'clamp(22px, 2.6vw, 40px)', 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'var(--sw-line)', 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-line)', overflow: 'hidden', display: 'flex', 'flex-wrap': 'nowrap', 'white-space': 'nowrap' } },
      'mq-item': { base: { ...hf, 'font-weight': '500', 'font-size': 'clamp(32px, 5vw, 88px)', 'line-height': '1', 'letter-spacing': '-0.04em', 'padding-right': 'clamp(24px, 3vw, 56px)', 'white-space': 'nowrap', flex: 'none' } },
      'mq-alt': { base: { 'font-family': 'var(--font-accent, var(--font-heading))', 'font-style': 'italic', 'font-weight': '400', 'font-size': 'clamp(32px, 5vw, 88px)', 'line-height': '1', 'letter-spacing': '-0.02em', color: 'var(--sw-muted)', 'padding-right': 'clamp(24px, 3vw, 56px)', 'white-space': 'nowrap', flex: 'none' } },
      'mq-star': { base: { color: 'var(--sw-brand)', 'font-size': 'clamp(18px, 2.4vw, 40px)', 'padding-right': 'clamp(24px, 3vw, 56px)', flex: 'none', 'align-self': 'center' } },
      manifesto: { base: { ...hf, 'font-weight': '500', 'font-size': 'clamp(32px, 4.8vw, 84px)', 'line-height': '1.08', 'letter-spacing': '-0.038em', 'max-width': '22ch', 'margin-bottom': '0' } },
      // bento
      bento: { base: { display: 'grid', 'grid-template-columns': 'repeat(6, 1fr)', 'column-gap': '16px', 'row-gap': '16px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' }, landscape: { 'grid-template-columns': '1fr' } },
      ...['b-wide', 'b-mid', 'b-small'].reduce((o, c, i) => Object.assign(o, { [c]: { base: { 'grid-column': `span ${[4, 3, 2][i]}`, ...PX('clamp(28px, 3vw, 44px)', 'clamp(24px, 2.6vw, 40px)'), 'border-radius': rad, 'background-color': 'var(--sw-soft)', ...B('1px'), 'min-height': '300px', display: 'flex', 'flex-direction': 'column', 'justify-content': 'space-between', 'row-gap': '32px', transition: `transform .6s ${EASE}, border-color .4s` }, 'base:hover': { 'border-top-color': 'var(--sw-brand)', 'border-right-color': 'var(--sw-brand)', 'border-bottom-color': 'var(--sw-brand)', 'border-left-color': 'var(--sw-brand)' }, tablet: { 'grid-column': i === 0 ? 'span 2' : 'span 1' }, landscape: { 'grid-column': 'span 1', 'min-height': '220px' } } }), {}),
      'b-num': { base: { 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '0.14em', color: 'var(--sw-brand)' } },
      'b-title': { base: { ...hf, 'font-size': 'clamp(26px, 2.6vw, 44px)', 'line-height': '1.02', 'letter-spacing': '-0.035em', 'margin-bottom': '12px' } },
      // work showcase
      'work-grid': { base: { display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'column-gap': 'clamp(24px, 3vw, 48px)', 'row-gap': 'clamp(56px, 7vw, 112px)' }, landscape: { 'grid-template-columns': '1fr' } },
      'work-card': { base: { display: 'block', 'text-decoration': 'none', color: 'inherit' } },
      'work-media': { base: { 'border-radius': rad, overflow: 'hidden', 'background-color': 'var(--sw-soft)', 'aspect-ratio': '4 / 3', 'margin-bottom': '22px' } },
      'work-img': { base: { width: '100%', height: '100%', 'object-fit': 'cover', transition: `transform 1.4s ${EASE}` } },
      'work-row': { base: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'baseline', 'column-gap': '16px' } },
      'work-title': { base: { ...hf, 'font-size': 'clamp(24px, 2.4vw, 38px)', 'letter-spacing': '-0.03em', 'line-height': '1.1', 'margin-bottom': '6px' } },
      'work-meta': { base: { color: 'var(--sw-muted)', 'font-size': '14px', 'white-space': 'nowrap' } },
      // pinned horizontal cards
      'hs-track': { base: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'column-gap': '20px', 'row-gap': '20px' }, tablet: { 'grid-template-columns': '1fr' } },
      'hs-card': { base: { ...PX('clamp(32px, 3vw, 48px)', 'clamp(28px, 2.6vw, 44px)'), 'border-radius': rad, ...B('1px'), 'background-color': 'var(--sw-soft)', 'min-height': '440px', display: 'flex', 'flex-direction': 'column', 'row-gap': '18px' } },
      'hs-title': { base: { ...hf, 'font-size': 'clamp(36px, 3.6vw, 64px)', 'line-height': '0.95', 'letter-spacing': '-0.05em', 'margin-bottom': '0' } },
      'hs-list': { base: { 'padding-left': '0', 'list-style-type': 'none', color: 'var(--sw-muted)', 'line-height': '2', 'margin-top': 'auto', 'margin-bottom': '0', ...BT() , 'padding-top': '18px' } },
      // service rows
      svc: { base: { display: 'grid', 'grid-template-columns': '72px minmax(0, 1fr) minmax(0, 1.1fr) auto', 'column-gap': '32px', 'row-gap': '10px', 'align-items': 'baseline', ...PX('clamp(28px, 3vw, 44px)', '0'), ...BT(), transition: `padding .6s ${EASE}, background-color .4s` }, 'base:hover': { 'padding-left': '18px' }, tablet: { 'grid-template-columns': '48px 1fr' } },
      'svc-num': { base: { 'font-size': '14px', 'font-weight': '600', color: 'var(--sw-brand)', 'letter-spacing': '0.08em' } },
      'svc-title': { base: { ...hf, 'font-size': 'clamp(26px, 3vw, 48px)', 'line-height': '1.02', 'letter-spacing': '-0.035em', 'margin-bottom': '0' } },
      'svc-meta': { base: { color: 'var(--sw-muted)', 'font-size': '14px', 'white-space': 'nowrap' }, tablet: { 'grid-column': '2' } },
      // stats
      'stats-grid': { base: { display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'column-gap': '24px', 'row-gap': '48px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' } },
      stat: { base: { ...BT(), 'padding-top': '28px' } },
      'stat-v': { base: { ...hf, 'font-size': 'clamp(52px, 6.4vw, 112px)', 'line-height': '1', 'letter-spacing': '-0.055em', 'margin-bottom': '14px', 'font-variant-numeric': 'tabular-nums' } },
      'stat-l': { base: { color: 'var(--sw-muted)', 'font-size': '15px', 'max-width': '24ch' } },
      // cards (features, steps)
      'grid-2': { base: { display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'column-gap': '20px', 'row-gap': '20px' }, landscape: { 'grid-template-columns': '1fr' } },
      'grid-3': { base: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'column-gap': '20px', 'row-gap': '20px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' }, landscape: { 'grid-template-columns': '1fr' } },
      'grid-4': { base: { display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'column-gap': '20px', 'row-gap': '32px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' }, portrait: { 'grid-template-columns': '1fr' } },
      'f-card': { base: { ...PX('clamp(28px, 3vw, 40px)', 'clamp(24px, 2.6vw, 36px)'), 'border-radius': rad, 'background-color': 'var(--sw-soft)', ...B('1px'), transition: `transform .6s ${EASE}, border-color .4s` }, 'base:hover': { 'border-top-color': 'var(--sw-brand)', 'border-right-color': 'var(--sw-brand)', 'border-bottom-color': 'var(--sw-brand)', 'border-left-color': 'var(--sw-brand)' } },
      'f-ico': { base: { width: '48px', height: '48px', 'border-radius': btnRad === '999px' ? '999px' : rad, 'background-color': 'var(--sw-brand)', 'margin-bottom': '56px' } },
      'card-title': { base: { ...hf, 'font-size': 'clamp(21px, 1.7vw, 27px)', 'line-height': '1.15', 'letter-spacing': '-0.025em', 'margin-bottom': '10px' } },
      num: { base: { 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '0.14em', color: 'var(--sw-brand)', 'margin-bottom': '40px' } },
      'img-r': { base: { width: '100%', 'aspect-ratio': '5 / 4', 'object-fit': 'cover', 'border-radius': rad } },
      'plan-list': { base: { 'padding-left': '1.1em', 'margin-top': '16px', 'margin-bottom': '28px', 'line-height': '1.9', color: 'var(--sw-muted)' } },
      // quotes
      quote: { base: { ...PX('clamp(32px, 3vw, 44px)', 'clamp(28px, 2.6vw, 40px)'), 'border-radius': rad, ...B('1px'), display: 'flex', 'flex-direction': 'column', 'justify-content': 'space-between', 'row-gap': '32px' } },
      'quote-t': { base: { ...hf, 'font-weight': '500', 'font-size': 'clamp(20px, 1.8vw, 28px)', 'line-height': '1.3', 'letter-spacing': '-0.02em', 'margin-bottom': '0' } },
      'quote-m': { base: { color: 'var(--sw-muted)', 'font-size': '14px', 'font-weight': '600' } },
      // pricing
      plan: { base: { ...PX('40px', '34px'), 'border-radius': rad, ...B('1px'), 'background-color': 'var(--sw-soft)', display: 'flex', 'flex-direction': 'column', 'row-gap': '8px' } },
      'plan-hot': { base: { ...PX('40px', '34px'), 'border-radius': rad, 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)', display: 'flex', 'flex-direction': 'column', 'row-gap': '8px', transform: 'translateY(-12px)', 'box-shadow': '0 40px 80px -40px rgba(0,0,0,.5)' }, tablet: { transform: 'none' } },
      'plan-v': { base: { ...hf, 'font-size': 'clamp(44px, 4.4vw, 64px)', 'letter-spacing': '-0.05em', 'line-height': '1', 'margin-bottom': '4px', 'font-variant-numeric': 'tabular-nums' } },
      'band-btn': { base: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'min-height': '54px', ...PX('0', '28px'), 'background-color': 'var(--sw-paper)', color: 'var(--sw-ink)', 'border-radius': btnRad, 'font-weight': '600', 'text-decoration': 'none', transition: `transform .5s ${EASE}, opacity .3s` }, 'base:hover': { opacity: '0.88' } },
      // faq
      'faq-list': { base: { 'max-width': '880px', ...BT() } },
      faq: { base: { ...PX('26px', '0'), 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-line)' } },
      'faq-q': { base: { ...hf, 'font-weight': '600', 'font-size': 'clamp(18px, 1.6vw, 24px)', 'letter-spacing': '-0.015em', cursor: 'pointer', 'list-style-type': 'none', 'min-height': '44px', display: 'flex', 'align-items': 'center' } },
      'faq-a': { base: { color: 'var(--sw-muted)', 'margin-top': '10px', 'margin-bottom': '0', 'max-width': '68ch' } },
      // gallery, products, team
      'g-img': { base: { width: '100%', 'aspect-ratio': '1 / 1', 'object-fit': 'cover', 'border-radius': rad } },
      'p-card': { base: { display: 'flex', 'flex-direction': 'column', 'row-gap': '10px' } },
      'p-img': { base: { width: '100%', 'aspect-ratio': '4 / 5', 'object-fit': 'cover', 'border-radius': rad, 'background-color': 'var(--sw-soft)' } },
      'p-row': { base: { display: 'flex', 'justify-content': 'space-between', 'font-weight': '600', 'column-gap': '12px', 'margin-top': '6px' } },
      'p-buy': { base: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'min-height': '46px', ...PX('0', '18px'), 'border-radius': btnRad, ...B('1px', 'var(--sw-ink)'), color: 'var(--sw-ink)', 'font-weight': '600', 'font-size': '14px', 'text-decoration': 'none', transition: 'background-color .3s, color .3s' }, 'base:hover': { 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)' } },
      member: { base: {} },
      avatar: { base: { width: '100%', 'aspect-ratio': '4 / 5', 'border-radius': rad, 'object-fit': 'cover', 'margin-bottom': '18px' } },
      // cta + newsletter + contact
      'cta-x': { base: { ...PX('clamp(120px, 16vw, 260px)'), 'text-align': 'center', display: 'flex', 'flex-direction': 'column', 'align-items': 'center' } },
      'cta-t': { base: { ...hf, 'font-size': 'clamp(56px, 11vw, 200px)', 'line-height': '0.88', 'letter-spacing': '-0.062em', 'max-width': '11ch', 'margin-bottom': '32px' } },
      'news-band': { base: { 'background-color': 'var(--sw-soft)', ...PX('clamp(40px, 5vw, 72px)', 'clamp(28px, 4vw, 64px)'), 'border-radius': rad, display: 'grid', 'grid-template-columns': '1fr 1fr', 'align-items': 'center', 'column-gap': '48px', 'row-gap': '24px' }, tablet: { 'grid-template-columns': '1fr' } },
      'contact-list': { base: { 'list-style-type': 'none', 'padding-left': '0', 'line-height': '2', color: 'var(--sw-muted)', 'margin-top': '24px' } },
      // logos
      'logo-cap': { base: { 'text-align': 'center', color: 'var(--sw-muted)', 'font-size': '14px', 'margin-bottom': '28px' } },
      'logo-row': { base: { display: 'flex', 'justify-content': 'center', 'flex-wrap': 'wrap', 'column-gap': 'clamp(32px, 5vw, 72px)', 'row-gap': '16px', color: 'var(--sw-muted)', ...hf, 'font-size': 'clamp(20px, 2vw, 28px)', 'letter-spacing': '-0.03em', opacity: '0.85' } },
      // footer
      foot: { base: { ...PX('clamp(64px, 8vw, 112px)'), 'padding-bottom': '32px', ...BT(), overflow: 'hidden' } },
      'foot-grid': { base: { display: 'grid', 'grid-template-columns': '1.4fr 1fr 1fr', 'column-gap': '48px', 'row-gap': '32px', 'margin-bottom': 'clamp(48px, 7vw, 112px)' }, landscape: { 'grid-template-columns': '1fr' } },
      'foot-h': { base: { 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '0.14em', 'text-transform': 'uppercase', color: 'var(--sw-muted)', 'margin-bottom': '16px' } },
      'foot-links': { base: { display: 'flex', 'flex-direction': 'column', 'row-gap': '6px' } },
      'foot-link': { base: { 'text-decoration': 'none', color: 'var(--sw-ink)', 'font-size': '16px', 'padding-top': '4px', 'padding-bottom': '4px', transition: 'color .25s' }, 'base:hover': { color: 'var(--sw-brand)' } },
      'foot-word': { base: { ...hf, 'font-size': 'clamp(72px, 18vw, 320px)', 'line-height': '0.78', 'letter-spacing': '-0.075em', color: 'transparent', '-webkit-text-stroke': '1px var(--sw-muted)', 'white-space': 'nowrap', 'margin-bottom': '32px', 'user-select': 'none' } },
      'foot-row': { base: { display: 'flex', 'justify-content': 'space-between', 'flex-wrap': 'wrap', 'column-gap': '24px', 'row-gap': '8px', color: 'var(--sw-muted)', 'font-size': '14px', ...BT(), 'padding-top': '24px' } },
      // dashboard (enterprise product UI)
      dash: { base: { display: 'grid', 'grid-template-columns': '232px minmax(0, 1fr)', 'border-radius': '20px', ...B('1px'), 'background-color': 'var(--sw-paper)', overflow: 'hidden', 'box-shadow': dark ? '0 60px 140px -60px rgba(0,0,0,.95)' : '0 50px 120px -50px rgba(16,24,40,.35)', 'font-size': '14px', 'text-align': 'left' }, tablet: { 'grid-template-columns': '1fr' } },
      'dash-side': { base: { 'background-color': 'var(--sw-soft)', ...PX('22px', '14px'), display: 'flex', 'flex-direction': 'column', 'row-gap': '2px', 'border-right-width': '1px', 'border-right-style': 'solid', 'border-right-color': 'var(--sw-line)' }, tablet: { display: 'none' } },
      'dash-logo': { base: { ...hf, 'font-size': '16px', ...PX('8px', '12px'), 'margin-bottom': '14px', 'letter-spacing': '-0.02em' } },
      'dash-link': { base: { ...PX('10px', '12px'), 'border-radius': '8px', color: 'var(--sw-muted)', 'text-decoration': 'none', 'font-weight': '500' }, 'base:hover': { 'background-color': 'var(--sw-paper)', color: 'var(--sw-ink)' } },
      'dash-on': { base: { ...PX('10px', '12px'), 'border-radius': '8px', 'background-color': 'var(--sw-paper)', color: 'var(--sw-ink)', 'text-decoration': 'none', 'font-weight': '600', 'box-shadow': '0 1px 0 var(--sw-line)' } },
      'dash-main': { base: { ...PX('26px', '28px'), display: 'flex', 'flex-direction': 'column', 'row-gap': '18px', 'min-width': '0' }, landscape: PX('18px', '16px') },
      'dash-top': { base: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'column-gap': '16px', 'flex-wrap': 'wrap', 'row-gap': '10px' } },
      'dash-h': { base: { ...hf, 'font-size': '22px', 'letter-spacing': '-0.02em', 'margin-bottom': '2px' } },
      'dash-sub': { base: { color: 'var(--sw-muted)', 'font-size': '13px' } },
      'dash-chip': { base: { display: 'inline-flex', 'align-items': 'center', 'min-height': '36px', ...PX('0', '14px'), 'border-radius': '999px', ...B('1px'), color: 'var(--sw-muted)', 'font-size': '13px', 'font-weight': '500' } },
      kpis: { base: { display: 'grid', 'grid-template-columns': 'repeat(4, minmax(0, 1fr))', 'column-gap': '14px', 'row-gap': '14px' }, landscape: { 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' } },
      kpi: { base: { ...PX('18px', '18px'), 'border-radius': '14px', ...B('1px'), 'background-color': 'var(--sw-paper)' } },
      'kpi-l': { base: { color: 'var(--sw-muted)', 'font-size': '13px', 'font-weight': '500', 'margin-bottom': '8px' } },
      'kpi-v': { base: { ...hf, 'font-size': 'clamp(24px, 2.2vw, 32px)', 'letter-spacing': '-0.03em', 'line-height': '1', 'font-variant-numeric': 'tabular-nums', 'margin-bottom': '8px' } },
      'kpi-d': { base: { 'font-size': '12.5px', 'font-weight': '600', color: 'var(--sw-good, #1B8A5A)' } },
      'kpi-dn': { base: { 'font-size': '12.5px', 'font-weight': '600', color: 'var(--sw-bad, #C2410C)' } },
      'dash-row': { base: { display: 'grid', 'grid-template-columns': 'minmax(0, 1.65fr) minmax(0, 1fr)', 'column-gap': '14px', 'row-gap': '14px' }, tablet: { 'grid-template-columns': '1fr' } },
      panel: { base: { ...PX('18px', '18px'), 'border-radius': '14px', ...B('1px'), 'background-color': 'var(--sw-paper)', 'min-width': '0' } },
      'hero-wide-dash': { base: { width: '100%', 'max-width': '1240px', 'margin-top': 'clamp(56px, 7vw, 104px)', 'margin-left': 'auto', 'margin-right': 'auto' } },
      'panel-h': { base: { 'font-weight': '600', 'font-size': '14px', 'margin-bottom': '12px', display: 'flex', 'justify-content': 'space-between' } }
    };
    return k;
  }
  const CHART_OK = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00']; // Okabe–Ito: colour-blind safe

  /* ---------------------------------------------------------------- data-viz builders (accessible SVG + real tables) */
  function lineChart({ series = [], labels = [], title = 'Trend', unit = '', brand = '#3B6CFF', ink = '#111', muted = '#667', line = '#ddd' }) {
    const w = 640, h = 240, pl = 44, pr = 12, pt = 16, pb = 30; const all = series.flatMap((s) => s.data); const max = Math.max(...all) * 1.12, min = 0;
    const x = (i, n) => pl + (i / (n - 1)) * (w - pl - pr), y = (v) => pt + (1 - (v - min) / (max - min)) * (h - pt - pb);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => { const v = min + t * (max - min); return `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" style="stroke:${line}" stroke-width="1"/><text x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" style="fill:${muted}">${Math.round(v)}${unit}</text>`; }).join('');
    const xl = labels.map((l, i) => (i % Math.ceil(labels.length / 6) === 0 ? `<text x="${x(i, labels.length).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="11" style="fill:${muted}">${L.esc(l)}</text>` : '')).join('');
    const cols = [brand, ...CHART_OK.filter((c) => c.toLowerCase() !== String(brand).toLowerCase())];
    const paths = series.map((s, si) => { const pts = s.data.map((v, i) => `${x(i, s.data.length).toFixed(1)},${y(v).toFixed(1)}`); const c = cols[si % cols.length];
      return `${si === 0 ? `<path d="M${pts[0]} L${pts.join(' L')} L${x(s.data.length - 1, s.data.length).toFixed(1)},${y(0).toFixed(1)} L${pl},${y(0).toFixed(1)}Z" style="fill:${c}" opacity=".10"/>` : ''}<path ${si ? '' : 'class="fx-draw" '}d="M${pts.join(' L')}" fill="none" style="--len:1400;stroke:${c}" stroke-width="${si === 0 ? 2.5 : 2}" ${si ? 'stroke-dasharray="6 5"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
    const legend = series.map((s, si) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="width:14px;height:${si ? 0 : 3}px;border-top:${si ? `2px dashed ${cols[si]}` : 'none'};background:${si ? 'none' : cols[0]};border-radius:2px;display:inline-block"></i>${L.esc(s.name)}</span>`).join('');
    const desc = series.map((s) => `${s.name}: ${s.data[0]}${unit} to ${s.data[s.data.length - 1]}${unit}`).join('; ');
    return `<div data-fx="chart" style="font:12px/1.4 inherit;color:${muted}"><div style="margin-bottom:8px">${legend}</div><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-labelledby="t" style="display:block;overflow:visible"><title>${L.esc(title)}</title><desc>${L.esc(desc)}</desc>${grid}${xl}${paths}</svg></div>`;
  }
  function barChart({ bars = [], title = 'Breakdown', brand = '#3B6CFF', muted = '#667', line = '#ddd', unit = '%' }) {
    const max = Math.max(...bars.map((b) => b[1])) || 1;
    return `<div data-fx="chart" role="img" aria-label="${L.esc(title)}: ${bars.map((b) => `${b[0]} ${b[1]}${unit}`).join(', ')}" style="display:grid;gap:12px">${bars.map(([l, v], i) => `<div style="display:grid;grid-template-columns:96px 1fr 44px;align-items:center;gap:10px;font-size:13px"><span style="color:${muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${L.esc(l)}</span><svg viewBox="0 0 100 10" preserveAspectRatio="none" height="10" width="100%" aria-hidden="true"><rect width="100" height="10" rx="5" style="fill:${line}"/><rect class="fx-bar" width="${(v / max * 100).toFixed(1)}" height="10" rx="5" style="--i:${i};fill:${i === 0 ? brand : CHART_OK[i % CHART_OK.length]}"/></svg><b style="font-variant-numeric:tabular-nums;text-align:right">${v}${unit}</b></div>`).join('')}</div>`;
  }
  function dataTable({ cols = [], rows = [], caption = 'Data', filter = 'Filter', ink = '#111', muted = '#667', line = '#ddd', soft = '#f4f4f6', brand = '#3B6CFF' }) {
    const pill = (v) => { const m = { Active: '#1B8A5A', Healthy: '#1B8A5A', Paid: '#1B8A5A', Trial: '#B45309', Pending: '#B45309', 'At risk': '#C2410C', Overdue: '#C2410C', Churned: '#6B7280' }[v]; return m ? `<span style="display:inline-flex;align-items:center;gap:6px;font-weight:600;color:${m}"><i style="width:7px;height:7px;border-radius:50%;background:${m};display:inline-block"></i>${L.esc(v)}</span>` : L.esc(v); };
    return `<style>.ldt{font-size:13.5px}.ldt__bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}.ldt input{min-height:40px;min-width:220px;padding:0 14px;border-radius:10px;border:1px solid ${line};background:transparent;color:${ink};font:inherit}.ldt input:focus-visible{outline:2px solid ${brand};outline-offset:1px}.ldt__wrap{overflow-x:auto}.ldt table{width:100%;border-collapse:collapse;min-width:560px}.ldt th{text-align:left;font-weight:600;color:${muted};font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:10px 12px;border-bottom:1px solid ${line};white-space:nowrap}.ldt td{padding:12px;border-bottom:1px solid ${line};white-space:nowrap}.ldt td.n,.ldt th.n{text-align:right;font-variant-numeric:tabular-nums}.ldt tbody tr:hover{background:${soft}}</style>
<div class="ldt" data-fx="table"><div class="ldt__bar"><input type="search" data-fx-filter placeholder="${L.esc(filter)}" aria-label="${L.esc(filter)}"><span data-fx-count aria-live="polite" style="color:${muted}">${rows.length} results</span></div><div class="ldt__wrap" tabindex="0" role="region" aria-label="${L.esc(caption)}"><table><caption class="fx-sr">${L.esc(caption)}</caption><thead><tr>${cols.map((c, i) => `<th scope="col"${/\$|%|#|Seats|MRR|Usage|Score/i.test(c) ? ' class="n"' : ''}>${L.esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td${/\$|%|#|Seats|MRR|Usage|Score/i.test(cols[i]) ? ' class="n"' : ''}>${i === 0 ? `<b>${L.esc(v)}</b>` : pill(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }

  /* ---------------------------------------------------------------- sections */
  const txt = (v, d = '') => String(v == null ? d : v).slice(0, 600);
  const head = (s, center) => D(center ? 'sec-head-c' : 'sec-head', center ? [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h2', txt(s.title), 'h-sec'), s.text ? Pp(txt(s.text), 'lead-c') : null].filter(Boolean)
    : [D('half', [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h2', txt(s.title), 'h-sec')].filter(Boolean)), s.text ? Pp(txt(s.text), 'lead') : D('half', [])]);
  let seedN = 1; const seed = () => (seedN = (seedN * 7 + 13) % 997) + 1;
  const fx = (n, v) => { n.attrs = n.attrs || {}; n.attrs['data-fx'] = v; return n; };
  const secW = (kids, cls = 'section', id) => { const n = N('section', { cls }, [N('container', {}, kids)]); if (id) n.attrs.id = id; return n; };
  function sectionNode(s, ctx) {
    const items = (s.items || []).slice(0, 12); const col = ctx.art; const kinds = ctx.artKinds;
    const artImg = (alt, cls, kind) => Img(T.art(seed(), col, { kind: kind || kinds[seedN % kinds.length] }), alt, cls);
    const primary = (cls = 'btn') => Btn(txt(s.cta || ctx.navCta || 'Get started'), cls, ctx.contactHref);
    const variant = s.layout || (s.kind === 'hero' ? ctx.heroLayout : '');
    switch (s.kind) {
      case 'hero': {
        const second = Btn(txt(items[0] && items[0].title, 'Explore'), 'btn-ghost', ctx.secondHref || '#features');
        if (variant === 'editorial') return N('section', { cls: 'hero-ed' }, [N('container', {}, [D('hero-meta', [Tx(txt(s.eyebrow, ctx.name)), Tx(txt(s.meta, ctx.tagline || ''))]), H('h1', txt(s.title), 'display'), D('hero-foot', [s.text ? Pp(txt(s.text), 'lead') : D('half', []), D('actions', [primary(), second])])])]);
        if (variant === 'media') return N('section', { cls: 'hero-media' }, [fx(artImg(`${ctx.name} hero artwork`, 'media-bg', 'blobs'), 'parallax'), D('media-in', [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h1', txt(s.title), 'display'), s.text ? Pp(txt(s.text), 'lead-inv') : null, D('actions', [primary('band-btn')])].filter(Boolean))]);
        if (variant === 'center') return N('section', { cls: 'hero-c' }, [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h1', txt(s.title), 'display-c'), s.text ? Pp(txt(s.text), 'lead-c') : null, D('actions-c', [primary(), second]), s.dashboard ? D('hero-wide-dash', [dashboardNode(s.dashboard, ctx)]) : artImg(`${ctx.name} product preview`, 'hero-wide', 'ui')].filter(Boolean));
        return N('section', { cls: 'hero-split' }, [N('container', {}, [D('split', [D('half', [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h1', txt(s.title), 'display'), s.text ? Pp(txt(s.text), 'lead') : null, D('actions', [primary(), second])].filter(Boolean)), D('half', [artImg(`${ctx.name} hero artwork`, 'hero-art')])])])]);
      }
      case 'marquee': { const n = N('div', { cls: 'marquee' }, (items.length ? items : [{ title: ctx.name }]).flatMap((i, k) => [Tx(txt(i.title), k % 2 ? 'mq-alt' : 'mq-item'), Tx('✦', 'mq-star')])); return fx(n, 'marquee'); }
      case 'manifesto': return secW([s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, fx(H('h2', txt(s.title), 'manifesto'), 'scrub')].filter(Boolean));
      case 'logos': return secW([Tx(txt(s.title), 'logo-cap'), D('logo-row', (items.length ? items : [{ title: 'Northwind' }, { title: 'Lumen' }, { title: 'Kestrel' }, { title: 'Orbit' }]).map((i) => Tx(txt(i.title))))], 'section-tight');
      case 'bento': { const shape = ['b-wide', 'b-small', 'b-small', 'b-wide', 'b-mid', 'b-mid']; return secW([head(s), D('bento', items.map((i, k) => D(shape[k % shape.length], [Tx(String(k + 1).padStart(2, '0'), 'b-num'), D('half', [H('h3', txt(i.title), 'b-title'), Pp(txt(i.text), 'card-text')])])))], 'section', 'features'); }
      case 'features': return secW([head(s), D(items.length === 4 ? 'grid-2' : 'grid-3', items.map((i) => D('f-card', [D('f-ico', []), H('h3', txt(i.title), 'card-title'), Pp(txt(i.text), 'card-text')])))], 'section', 'features');
      case 'showcase': return secW([head(s), D('work-grid', items.map((i, k) => { const card = D('work-card', [D('work-media', [i.src ? Img(i.src, txt(i.alt || i.title), 'work-img') : artImg(txt(i.title) + ' cover', 'work-img')]), D('work-row', [H('h3', txt(i.title), 'work-title'), Tx(txt(i.value), 'work-meta')]), Tx(txt(i.text || i.meta), 'card-text')], 'a'); card.attrs.href = i.href || '#'; card.attrs['data-cursor'] = 'view'; return card; }))], 'section', 'work');
      case 'hscroll': { const n = secW([head(s), D('hs-track', items.map((i, k) => D('hs-card', [Tx(String(k + 1).padStart(2, '0'), 'b-num'), H('h3', txt(i.title), 'hs-title'), Pp(txt(i.text), 'card-text'), i.meta ? N('list', { cls: 'hs-list' }, txt(i.meta).split(/\s*[·•|;]\s*/).filter(Boolean).slice(0, 8).map((x) => N('listitem', { text: x }))) : null].filter(Boolean))))]); n.attrs['data-fx'] = 'hscroll'; n.children[0].children[1].attrs['data-fx-track'] = ''; return n; }
      case 'services': return secW([head(s), D('svc-list', items.map((i, k) => D('svc', [Tx(String(k + 1).padStart(2, '0'), 'svc-num'), H('h3', txt(i.title), 'svc-title'), Pp(txt(i.text), 'card-text'), Tx(txt(i.value || i.meta), 'svc-meta')])))], 'section', 'services');
      case 'split': return secW([D('split', [D('half', [fx(artImg(txt(s.title) + ' illustration', 'img-r'), 'reveal')]), D('half', [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h2', txt(s.title), 'h-sec'), s.text ? Pp(txt(s.text), 'lead') : null, ...(items.length ? [N('list', { cls: 'plan-list' }, items.map((i) => N('listitem', { text: txt(i.title) })))] : []), s.cta ? primary() : null].filter(Boolean))])]);
      case 'stats': return secW([s.title ? head(s) : null, D('stats-grid', items.map((i) => { const numText = !i.value && /\d/.test(i.text || '') && !/\d/.test(i.title || ''); const v = i.value || (numText ? i.text : i.title), l = i.value ? i.title : numText ? i.title : i.text; return D('stat', [H('h3', txt(v), 'stat-v'), Tx(txt(l), 'stat-l')]); }))].filter(Boolean), 'section-tight');
      case 'steps': return secW([head(s), D('grid-4', items.map((i, k) => D('f-card', [Tx(String(k + 1).padStart(2, '0'), 'num'), H('h3', txt(i.title), 'card-title'), Pp(txt(i.text), 'card-text')])))]);
      case 'testimonials': return secW([head(s), D('grid-3', items.map((i) => D('quote', [Pp(`“${txt(i.text || i.title).replace(/^“|”$/g, '')}”`, 'quote-t'), Tx(txt(i.meta || i.title), 'quote-m')])))]);
      case 'pricing': return secW([head(s, true), D('grid-3', items.map((i, k) => { const hot = items.length > 2 ? k === 1 : false; return D(hot ? 'plan-hot' : 'plan', [Tx(txt(i.title), 'eyebrow'), H('h3', txt(i.value, '—'), 'plan-v'), Tx(txt(i.meta), 'card-text'), N('list', { cls: 'plan-list' }, txt(i.text).split(/\s*[·•|;]\s*/).filter(Boolean).slice(0, 6).map((x) => N('listitem', { text: x }))), Btn(hot ? 'Choose ' + txt(i.title) : 'Get started', hot ? 'band-btn' : 'btn', ctx.contactHref)]); }))], 'section', 'pricing');
      case 'faq': return secW([head(s), D('faq-list', items.map((i) => N('div', { tag: 'details', cls: 'faq' }, [N('text', { tag: 'summary', text: txt(i.title), cls: 'faq-q' }), Pp(txt(i.text), 'faq-a')])))], 'section', 'faq');
      case 'gallery': return secW([head(s), D('grid-3', (items.length ? items : [1, 2, 3, 4, 5, 6].map((x) => ({ title: `Gallery image ${x}` }))).map((i) => artImg(txt(i.title), 'g-img')))]);
      case 'products': return secW([head(s), D('grid-4', items.map((i) => D('p-card', [artImg(txt(i.title) + ' product image', 'p-img', 'product'), D('p-row', [Tx(txt(i.title)), Tx(txt(i.value))]), i.text ? Tx(txt(i.text), 'card-text') : null, Btn('Add to cart', 'p-buy', '#buy')].filter(Boolean))))], 'section', 'shop');
      case 'team': return secW([head(s), D('grid-4', items.map((i) => D('member', [artImg(`Portrait of ${txt(i.title)}`, 'avatar', 'blobs'), H('h3', txt(i.title), 'card-title'), Tx(txt(i.meta || i.text), 'card-text')])))]);
      case 'dashboard': return secW([s.title ? head(s, true) : null, dashboardNode(s.dashboard || {}, ctx)].filter(Boolean), 'section', 'product');
      case 'newsletter': return secW([D('news-band', [D('half', [H('h2', txt(s.title), 'h-sub'), s.text ? Pp(txt(s.text), 'card-text') : null].filter(Boolean)), N('embed', { html: `${FORM_CSS(ctx.btnRad)}<form class="lf" action="#"><div class="lf-row"><input type="email" name="email" placeholder="you@company.com" aria-label="Email address" autocomplete="email" required><button type="submit">${L.esc(txt(s.cta, 'Subscribe'))}</button></div></form>` })])], 'section-tight');
      case 'contact': return secW([D('split', [D('half', [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h2', txt(s.title), 'h-sec'), s.text ? Pp(txt(s.text), 'lead') : null, N('list', { cls: 'contact-list' }, (items.length ? items : [{ title: 'hello@example.com' }]).map((i) => N('listitem', { text: txt(i.value ? `${i.title}: ${i.value}` : i.title) })))].filter(Boolean)), D('half', [N('embed', { html: `${FORM_CSS(ctx.btnRad)}<form class="lf" action="#"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Message<textarea name="message" required></textarea></label><button type="submit">${L.esc(txt(s.cta, 'Send message'))}</button></form>` })])])], 'section', 'contact');
      case 'cta': default: return N('section', { cls: 'cta-x' }, [s.eyebrow ? Tx(txt(s.eyebrow), 'eyebrow') : null, H('h2', txt(s.title), 'cta-t'), s.text ? Pp(txt(s.text), 'lead-c') : null, Btn(txt(s.cta || ctx.navCta || 'Get started'), 'btn-xl', ctx.contactHref)].filter(Boolean));
    }
  }
  /** Enterprise dashboard: sidebar, KPIs (count up), line + bar charts (accessible SVG), sortable/filterable table. */
  function dashboardNode(dsp, ctx) {
    const brand = 'var(--sw-brand)', ink = 'var(--sw-ink)', muted = 'var(--sw-muted)', line = 'var(--sw-line)', soft = 'var(--sw-soft)';
    const nav = dsp.nav || ['Overview', 'Customers', 'Revenue', 'Reports', 'Settings'];
    const kpis = dsp.kpis || [['Monthly revenue', '$84,200', '+12.4%'], ['Active accounts', '1,284', '+3.1%'], ['Net retention', '118%', '+2.0 pts'], ['Churn', '1.9%', '−0.4 pts']];
    const months = dsp.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const series = dsp.series || [{ name: 'This year', data: [42, 46, 45, 51, 55, 58, 62, 61, 68, 72, 77, 84] }, { name: 'Last year', data: [30, 33, 35, 34, 38, 41, 43, 45, 47, 50, 52, 55] }];
    const bars = dsp.bars || [['Enterprise', 46], ['Mid-market', 31], ['Startup', 17], ['Self-serve', 6]];
    const cols = dsp.cols || ['Customer', 'Plan', 'Status', 'Seats', 'MRR'];
    const rows = dsp.rows || [['Northwind', 'Enterprise', 'Healthy', '420', '$18,400'], ['Lumen Labs', 'Growth', 'Active', '86', '$4,120'], ['Kestrel', 'Enterprise', 'At risk', '310', '$12,900'], ['Parallax', 'Growth', 'Trial', '24', '$0'], ['Orbit Health', 'Enterprise', 'Healthy', '640', '$26,300'], ['Fernway', 'Starter', 'Active', '12', '$480'], ['Quanta', 'Growth', 'Overdue', '58', '$2,760'], ['Brightpath', 'Starter', 'Churned', '8', '$0']];
    const tone = (d) => (/^[−-]/.test(d) ? (/(churn|risk|cost|error|time)/i.test(d) ? 'kpi-d' : 'kpi-dn') : 'kpi-d');
    return D('dash', [
      D('dash-side', [Tx(dsp.product || ctx.name, 'dash-logo'), ...nav.map((l, i) => N('link', { text: l, cls: i === 0 ? 'dash-on' : 'dash-link', attrs: { href: '#' } }))]),
      D('dash-main', [
        D('dash-top', [D('half', [H('h3', dsp.heading || 'Overview', 'dash-h'), Tx(dsp.sub || 'Last 12 months · updated just now', 'dash-sub')]), D('actions', [Tx('Last 12 months', 'dash-chip'), Tx('Export CSV', 'dash-chip')])]),
        fx(D('kpis', kpis.map(([l, v, d], i) => D('kpi', [Tx(l, 'kpi-l'), fx(Tx(v, 'kpi-v'), 'count'), Tx(`${/^[−-]/.test(d) ? '▼' : '▲'} ${d} vs last period`, /churn/i.test(l) ? (/^[−-]/.test(d) ? 'kpi-d' : 'kpi-dn') : tone(d))]))), 'stagger'),
        D('dash-row', [D('panel', [D('panel-h', [Tx(dsp.chartTitle || 'Revenue ($k)'), Tx('Monthly', 'dash-sub')]), N('embed', { html: lineChart({ series, labels: months, title: dsp.chartTitle || 'Monthly revenue in thousands of dollars', unit: '', brand, ink, muted, line }) })]),
          D('panel', [D('panel-h', [Tx(dsp.barTitle || 'Revenue by segment')]), N('embed', { html: barChart({ bars, title: dsp.barTitle || 'Revenue by segment', brand, muted, line }) })])]),
        D('panel', [D('panel-h', [Tx(dsp.tableTitle || 'Accounts'), Tx('Sortable · click a column', 'dash-sub')]), N('embed', { html: dataTable({ cols, rows, caption: dsp.tableTitle || 'Accounts', filter: dsp.filter || 'Filter accounts', ink, muted, line, soft, brand }) })])
      ])
    ]);
  }

  /* ---------------------------------------------------------------- enhance: art direction + motion for any project */
  const FX_PRESETS = {
    cinematic: { preloader: true, transition: true, cursor: true, grain: true, progress: true, nav: true, theme: true },
    refined: { transition: true, progress: true, nav: true, theme: true },
    minimal: { nav: true, theme: true },
    none: null
  };
  /** Adds Loom FX attributes (split headlines, reveals, counters, tilt, magnetic CTAs, parallax) and site effects. */
  function enhance(p, preset = 'refined') {
    p.fx = FX_PRESETS[preset] === undefined ? FX_PRESETS.refined : FX_PRESETS[preset] ? Object.assign({ preset }, FX_PRESETS[preset]) : null;
    if (!p.fx) { p.pages.forEach((pg) => L.walk(pg.tree, (n) => { if (n.attrs && n.attrs['data-fx'] && !/marquee|table|chart|hscroll/.test(n.attrs['data-fx'])) delete n.attrs['data-fx']; })); return p; }
    if (!p.altSwatches) p.altSwatches = altTheme(p);
    const SPLIT = /^(display|display-c|h-sec|cta-t|band-title|mast-title|campaign-t|hero-title|section-title|cta-title|principle)$/;
    const TILT = /^(work-card|card|work-item|f-card|p-card|quote|plan|b-wide|b-mid|b-small|hs-card|price|bento-card|bento-wide)$/;
    const REVEAL = /^(lead|lead-c|lead-inv|eyebrow|hero-meta|hero-foot|actions|actions-c|img-r|hero-art|hero-wide|split-image|hero-img|shot|news-band|band|faq-list|logo-row|svc-list|dash|news)$/;
    const STAG = /^(grid-2|grid-3|grid-4|cards|work-grid|bento|stats-grid|stats|kpis|logos|svc-list|contact-list)$/;
    const MAG = /^(btn|btn-xl|band-btn|nav-cta)$/;
    p.pages.forEach((pg) => L.walk(pg.tree, (n, parent) => {
      const c = n.cls || ''; const a = n.attrs = n.attrs || {}; if (a['data-fx']) return;
      const inNav = parent && /^(nav|nav-in|nav-links|navbar|navbar-inner)$/.test(parent.cls || '');
      if (n.type === 'heading' && SPLIT.test(c)) a['data-fx'] = 'split';
      else if (STAG.test(c)) a['data-fx'] = 'stagger';
      else if (/^(stat-v|stat-value|kpi-v)$/.test(c) && /\d/.test(n.text || '')) a['data-fx'] = 'count';
      else if (TILT.test(c) && !(parent && STAG.test(parent.cls || '') && /^(f-card|quote|plan|p-card)$/.test(c))) a['data-fx'] = 'tilt';
      else if (MAG.test(c) && !inNav) a['data-fx'] = 'magnetic';
      else if (REVEAL.test(c) && !(parent && STAG.test(parent.cls || ''))) a['data-fx'] = 'reveal';
    }));
    return p;
  }
  /** Counterpart theme for the light/dark toggle, keeping the brand hue and AA contrast. */
  function altTheme(p) {
    const sw = Object.fromEntries(p.swatches.map((s) => [s.id, s.value])); if (!sw.brand || !sw.paper) return null;
    const mood = lum(sw.paper) < 0.2 ? 'light' : 'dark';
    const alt = paletteFrom(sw.brand, mood); const out = {}; ['brand', 'ink', 'paper', 'muted', 'soft', 'line'].forEach((k) => { if (sw[k]) out[k] = alt[k]; });
    if (mood === 'light' && contrast(out.paper, out.brand) < 4.5) out.brand = ensureContrast(out.brand, out.paper, 4.5);
    return out;
  }
  const FORM_CSS = (btnRad) => `<style>.lf{display:grid;gap:12px;width:100%;max-width:560px}.lf label{font-size:14px;font-weight:600;display:grid;gap:8px}.lf input,.lf textarea{width:100%;min-height:52px;padding:14px 18px;border-radius:${btnRad === '999px' ? '14px' : btnRad};border:1px solid var(--sw-line);background:var(--sw-paper);color:var(--sw-ink);font:inherit}.lf input:focus-visible,.lf textarea:focus-visible{outline:2px solid var(--sw-brand);outline-offset:2px}.lf textarea{min-height:150px;resize:vertical}.lf button{justify-self:start;min-height:54px;padding:0 28px;border:0;border-radius:${btnRad};background:var(--sw-brand);color:var(--sw-paper);font-weight:600;cursor:pointer}.lf-row{display:flex;gap:8px;flex-wrap:wrap}.lf-row input{flex:1 1 240px}</style>`;

  /* ---------------------------------------------------------------- site */
  const FONT_OK = /^[A-Za-z0-9 ]{2,40}$/;
  function normalize(spec) {
    const s = Object.assign({ name: 'New site', style: {}, nav: {}, pages: [], fonts: {} }, spec || {});
    s.style = Object.assign({ radius: 'soft', mood: 'light', headWeight: '700' }, s.style);
    s.palette = fixPalette(s.palette && isHex(s.palette.brand) ? s.palette : paletteFrom((s.palette && s.palette.brand) || '#3B6CFF', s.style.mood), s.style.mood);
    s.fonts = { heading: FONT_OK.test(s.fonts.heading || '') ? s.fonts.heading : 'Inter Tight', body: FONT_OK.test(s.fonts.body || '') ? s.fonts.body : 'Inter', accent: FONT_OK.test(s.fonts.accent || '') ? s.fonts.accent : 'Instrument Serif' };
    if (!s.pages.length) s.pages = [{ name: 'Home', sections: [{ kind: 'hero', title: s.tagline || s.name }, { kind: 'cta', title: 'Let’s talk.' }] }];
    s.pages = s.pages.slice(0, 8).map((p) => Object.assign({}, p, { sections: (p.sections || []).slice(0, 16) }));
    return s;
  }
  function ctxFor(s) {
    const pal = s.palette; const [, btnRad] = radiusOf(s.style.radius);
    const contact = s.pages.find((pg) => /contact/i.test(pg.name));
    return { name: s.name, tagline: s.tagline, navCta: s.nav.cta, btnRad, heroLayout: s.style.hero || 'editorial', colors: pal,
      contactHref: contact ? 'page:' + L.slug(contact.name) : '#contact',
      art: [pal.soft, pal.brand, hslToHex(hsl(pal.brand)[0] + 40, 0.55, s.style.mood === 'dark' ? 0.35 : 0.72), pal.line], artKinds: s.art || ['blobs', 'lines', 'arch'] };
  }
  function linkFor(label, s) { const pg = s.pages.find((p) => p.name.toLowerCase() === String(label).toLowerCase()); return pg ? 'page:' + (s.pages.indexOf(pg) === 0 ? 'home' : L.slug(pg.name)) : '#' + L.slug(label); }
  function navNode(s) {
    const n = nav(s.name, (s.nav.links || []).slice(0, 6), s.nav.cta);
    const links = n.children[0].children[1].children;
    const contact = s.pages.find((pg) => /contact|visit|book/i.test(pg.name));
    links.forEach((a) => { if (a.type === 'link') a.attrs.href = linkFor(a.text, s); else if (a.type === 'button') { a.attrs.href = contact ? 'page:' + L.slug(contact.name) : '#contact'; a.cls = 'btn'; } });
    return n;
  }
  function footerNode(s) {
    const links = (s.nav.links || []).slice(0, 5); const year = new Date().getFullYear();
    return N('section', { tag: 'footer', cls: 'foot' }, [N('container', {}, [
      D('foot-grid', [D('half', [H('h2', txt(s.footerTitle || s.tagline || s.name), 'h-sub'), Pp(txt(s.footerText || 'Say hello — we reply within one working day.'), 'card-text')]),
        D('half', [Tx('Explore', 'foot-h'), D('foot-links', links.map((l) => N('link', { text: l, cls: 'foot-link', attrs: { href: linkFor(l, s) } })))]),
        D('half', [Tx('Connect', 'foot-h'), D('foot-links', (s.socials || [['Instagram', '#'], ['LinkedIn', '#'], ['Email', 'mailto:hello@example.com']]).map(([l, u]) => N('link', { text: l, cls: 'foot-link', attrs: { href: u } })))])]),
      Tx(txt(s.wordmark || s.name).toUpperCase(), 'foot-word'),
      D('foot-row', [Tx(txt(s.footer || `© ${year} ${s.name}`)), Tx('Built with Loom')])
    ])]);
  }
  /** SiteSpec → Loom project. */
  function site(spec, meta = {}) {
    const s = normalize(spec); seedN = (s.name.length * 31) % 997;
    const k = kitFor(s.style);
    const ctx = ctxFor(s);
    const pages = s.pages.map((pg) => ({ name: pg.name, tree: [navNode(s), ...pg.sections.map((x) => sectionNode(x, ctx)), footerNode(s)] }));
    const pal = s.palette;
    const p = T.make({ id: meta.id || 'ai', name: s.name }, s.fonts, [['brand', 'Brand', pal.brand], ['ink', 'Ink', pal.ink], ['paper', 'Paper', pal.paper], ['muted', 'Muted', pal.muted], ['soft', 'Soft', pal.soft], ['line', 'Line', pal.line]], k, pages);
    p.pages.forEach((pg, i) => { const sp = s.pages[i]; pg.title = txt(sp.title); pg.description = txt(sp.description); });
    if (!meta.id) delete p.template;
    p.spec = { industry: s.industry || '', tagline: s.tagline || '', mood: s.style.mood, radius: s.style.radius, headWeight: s.style.headWeight, kit: 2 };
    enhance(p, s.style.fx || 'refined');
    return p;
  }
  /** Compose one section into an existing project (merging any classes it needs). */
  function addSection(p, section) {
    const style = { radius: (p.spec && p.spec.radius) || 'soft', headWeight: (p.spec && p.spec.headWeight) || '700', mood: (p.spec && p.spec.mood) || 'light' };
    const k = kitFor(style);
    const pal = Object.fromEntries(p.swatches.map((x) => [x.id, x.value]));
    const ctx = { name: p.name, btnRad: radiusOf(style.radius)[1], heroLayout: 'split', contactHref: '#contact', colors: pal, art: [pal.soft || '#eee', pal.brand || '#36f', pal.muted || '#999', pal.line || '#ddd'], artKinds: ['blobs', 'lines', 'arch'] };
    const n = sectionNode(section, ctx);
    L.walk([n], (x) => { if (x.cls) x.cls.split(' ').forEach((c) => { if (!p.classes[c] && k[c]) p.classes[c] = L.clone(k[c]); }); });
    if (!p.classes['band-lead']) p.classes['band-lead'] = { base: { color: 'inherit', opacity: '0.72' } };
    L.ensureTreeClasses(p, [n]);
    if (p.fx) { const tmp = { pages: [{ tree: [n] }], swatches: p.swatches, altSwatches: p.altSwatches, fx: null }; enhance(tmp, p.fx.preset || 'refined'); }
    return n;
  }

  /* ---------------------------------------------------------------- industry library (offline Architect + spec templates) */
  const I = (o) => o;
  const LIB = [
    I({ id: 'nova', name: 'Nova', category: 'AI & Startups', desc: 'Dark, glowing launch site for an AI product.', kw: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'agent', 'gpt', 'copilot', 'automation', 'startup'],
      brand: '#8B7CFF', mood: 'dark', radius: 'round', fonts: ['Space Grotesk', 'Inter'], art: ['lines', 'ui'], hero: 'center',
      links: ['Product', 'Pricing', 'Docs'], cta: 'Start free',
      home: [['hero', 'Now in public beta', 'Your team’s work, done by agents you can trust.', '{name} plans, drafts and ships routine work — with approvals, audit trails and your data kept private.'],
        ['logos', 'Trusted by teams moving fast', [['Northwind'], ['Lumen'], ['Kestrel'], ['Parallax'], ['Orbit']]],
        ['features', 'Why {name}', 'Automation that explains itself.', 'Every action is visible, reversible and yours to approve.', [['Agents that ask first', 'Nothing ships without the approvals you set.'], ['Grounded in your docs', 'Answers cite the source, every time.'], ['Private by default', 'Your data never trains shared models.']]],
        ['stats', '', '', '', [['Hours saved / week', '12'], ['Setup time', '5 min'], ['Integrations', '40+'], ['Uptime goal', '99.9%']]],
        ['steps', 'How it works', 'From request to done in three steps.', '', [['Connect', 'Link the tools you already use.'], ['Describe', 'Say what you need in plain words.'], ['Approve', 'Review, tweak and ship.']]],
        ['pricing', 'Pricing', 'Start free. Scale when it works.', '', [['Starter', 'Up to 3 seats · 500 tasks / month · Community support', '$0', 'free forever'], ['Team', 'Unlimited seats · 10k tasks · Approvals & audit log', '$49', 'per month'], ['Enterprise', 'SSO & SCIM · Private deployment · Dedicated support', 'Custom', 'annual']]],
        ['faq', 'FAQ', 'Questions, answered.', '', [['Is my data used for training?', 'No. Your workspace data stays yours.'], ['Can agents act without approval?', 'Only if you allow it, per workflow.'], ['Do you offer SSO?', 'Yes, on the Enterprise plan.'], ['Can I cancel any time?', 'Yes — no contracts on monthly plans.']]],
        ['cta', '', 'Put your busywork on autopilot.', 'Free for small teams. No card needed.']], pages: ['Pricing', 'Contact'] }),
    I({ id: 'pulse', name: 'Pulse', category: 'Health & Fitness', desc: 'High-energy gym and training studio site.', kw: ['gym', 'fitness', 'training', 'workout', 'coach', 'yoga', 'pilates', 'crossfit', 'sport'],
      brand: '#E8FF3A', mood: 'dark', radius: 'sharp', fonts: ['Anton', 'Inter'], art: ['blobs', 'arch'], hero: 'split', headWeight: '400',
      links: ['Classes', 'Coaches', 'Membership'], cta: 'Book a free class',
      home: [['hero', 'Strength · Conditioning · Recovery', 'Train like it matters.', 'Small-group coaching at {name} — built around your goals, your schedule and your body.'],
        ['stats', '', '', '', [['Weekly classes', '60+'], ['Certified coaches', '12'], ['Members', '1,800'], ['Free first class', '1']]],
        ['features', 'Programs', 'Pick your path.', '', [['Strength', 'Progressive programming that actually progresses.'], ['HIIT', '45 minutes. Everything you’ve got.'], ['Mobility', 'Move better, hurt less, last longer.']]],
        ['team', 'Coaches', 'Coached by people who care.', '', [['Maya Chen', '', '', 'Head of strength'], ['Leo Park', '', '', 'Conditioning'], ['Ava Stone', '', '', 'Mobility'], ['Sam Idris', '', '', 'Nutrition']]],
        ['pricing', 'Membership', 'No joining fee. Cancel any time.', '', [['Drop-in', '1 class · All programs', '$25', 'per class'], ['Unlimited', 'All classes · Open gym · App tracking', '$129', 'per month'], ['10-pack', '10 classes · Valid 3 months', '$199', 'one-off']]],
        ['testimonials', 'Members', 'Real progress, real people.', '', [['I finally stuck with it for a whole year.', '', '', 'Member since 2024'], ['The coaches notice everything — in a good way.', '', '', 'Morning crew'], ['Stronger at 52 than at 30.', '', '', 'Strength program']]],
        ['cta', '', 'Your first class is on us.', 'Book in 30 seconds. Bring water and curiosity.']], pages: ['Membership', 'Contact'] }),
    I({ id: 'harbor', name: 'Harbor', category: 'Food & Hospitality', desc: 'Warm restaurant site with menu highlights and bookings.', kw: ['restaurant', 'cafe', 'coffee', 'bakery', 'bistro', 'bar', 'food', 'kitchen', 'dining', 'menu', 'catering'],
      brand: '#B4532A', mood: 'light', radius: 'soft', fonts: ['Fraunces', 'DM Sans'], art: ['arch', 'blobs'], hero: 'split', headWeight: '600',
      links: ['Menu', 'About', 'Visit'], cta: 'Book a table',
      home: [['hero', 'Seasonal kitchen · Open Tue–Sun', 'Simple food, cooked with care.', '{name} cooks with what’s good this week — from growers we know by name.'],
        ['split', 'Our kitchen', 'Short menu. Long lunches.', 'We change the menu every week and cook everything in-house, from bread to ice cream.', [['Local, seasonal produce'], ['Natural wines by the glass'], ['Vegetarian-friendly']]],
        ['products', 'This week', 'Menu highlights', '', [['Charred leeks, hazelnut', '$14'], ['Handmade pappardelle', '$22'], ['Market fish, brown butter', '$29'], ['Burnt honey tart', '$11']]],
        ['testimonials', 'Guests', 'Kind words', '', [['The kind of place you plan a week around.', '', '', 'Regular guest'], ['Best bread in town, and they know it.', '', '', 'Local food guide'], ['Warm, unfussy, delicious.', '', '', 'First visit']]],
        ['contact', 'Visit', 'Find us', 'Walk-ins welcome at the bar. Book for groups of 5+.', [['Address', '12 Harbour Row'], ['Hours', 'Tue–Sun, 12–10pm'], ['Phone', '(555) 010-2030']]],
        ['cta', '', 'Hungry yet?', 'Tables go fast on weekends.']], pages: ['Menu', 'Contact'] }),
    I({ id: 'lumen', name: 'Lumen', category: 'Health & Wellness', desc: 'Calm, trustworthy clinic and practice site.', kw: ['clinic', 'dental', 'dentist', 'doctor', 'health', 'therapy', 'therapist', 'wellness', 'medical', 'physio', 'care', 'spa'],
      brand: '#2F7D6D', mood: 'light', radius: 'round', fonts: ['Manrope', 'Manrope'], art: ['blobs'], hero: 'split',
      links: ['Services', 'Team', 'Visit'], cta: 'Book an appointment',
      home: [['hero', 'Now accepting new patients', 'Care that listens first.', 'Unhurried appointments, clear explanations and a team that remembers your name at {name}.'],
        ['features', 'Services', 'Everything under one roof.', '', [['General care', 'Check-ups, prevention and advice.'], ['Specialist care', 'Referrals handled for you.'], ['Same-week appointments', 'Book online in a minute.']]],
        ['steps', 'Your first visit', 'What to expect', '', [['Book online', 'Choose a time that suits you.'], ['Meet your clinician', 'A proper conversation, not a rush.'], ['Get a clear plan', 'Written down, no jargon.']]],
        ['team', 'Our team', 'Meet the clinicians', '', [['Dr. Rana Aziz', '', '', 'Lead clinician'], ['Dr. Tom Weller', '', '', 'Specialist'], ['Nia Brooks', '', '', 'Practice nurse'], ['Omar Said', '', '', 'Patient care']]],
        ['faq', 'FAQ', 'Good to know', '', [['Do you take insurance?', 'We work with most major providers — ask us about yours.'], ['Can I book the same week?', 'Usually, yes. Online booking shows live availability.'], ['Is there parking?', 'Free parking behind the building.'], ['What should I bring?', 'ID and any recent test results.']]],
        ['cta', '', 'Ready when you are.', 'New patient appointments this week.']], pages: ['Services', 'Contact'] }),
    I({ id: 'vault', name: 'Vault', category: 'Finance & Fintech', desc: 'Precise, trustworthy fintech product site.', kw: ['finance', 'fintech', 'bank', 'payments', 'invest', 'accounting', 'insurance', 'crypto', 'wealth', 'money', 'tax'],
      brand: '#0A5CFF', mood: 'light', radius: 'soft', fonts: ['IBM Plex Sans', 'IBM Plex Sans'], art: ['ui', 'lines'], hero: 'center',
      links: ['Product', 'Security', 'Pricing'], cta: 'Open an account',
      home: [['hero', 'Business finance, simplified', 'Know where every dollar is — in real time.', '{name} brings cards, invoices and cash flow into one calm dashboard.'],
        ['logos', 'Backed by operators from', [['Ledgerly'], ['Brightpath'], ['Fernway'], ['Quanta']]],
        ['features', 'Product', 'Built for finance teams of one to one hundred.', '', [['Smart cards', 'Limits and receipts, automatically.'], ['Invoices that chase themselves', 'Polite reminders, faster payment.'], ['Live cash flow', 'See next month before it happens.'], ['Accounting sync', 'Clean books, zero copy-paste.']]],
        ['split', 'Security', 'Security you can explain to your board.', 'Encryption in transit and at rest, role-based access, and a full audit trail.', [['Two-factor sign-in'], ['Granular permissions'], ['Independent security reviews']]],
        ['pricing', 'Pricing', 'Transparent pricing', '', [['Essentials', 'Accounts · Cards · Invoicing', '$0', 'per month'], ['Growth', 'Approvals · Multi-entity · Integrations', '$39', 'per month'], ['Scale', 'Custom roles · Priority support · API', '$149', 'per month']]],
        ['cta', '', 'Finance, finally under control.', 'Open an account in minutes.']], pages: ['Pricing', 'Contact'] }),
    I({ id: 'scholar', name: 'Scholar', category: 'Education', desc: 'Friendly online course and academy site.', kw: ['course', 'school', 'academy', 'education', 'learn', 'teaching', 'tutor', 'bootcamp', 'university', 'workshop', 'lesson'],
      brand: '#F2552C', mood: 'light', radius: 'round', fonts: ['Bricolage Grotesque', 'Inter'], art: ['blobs', 'arch'], hero: 'split',
      links: ['Courses', 'Mentors', 'Pricing'], cta: 'Enroll now',
      home: [['hero', 'Next cohort starts soon', 'Learn the skills that get you hired.', 'Live, project-based courses at {name} — taught by people who do the job every day.'],
        ['stats', '', '', '', [['Graduates', '3,200'], ['Live hours', '80'], ['Projects built', '6'], ['Mentor ratio', '1:8']]],
        ['features', 'Courses', 'Pick a track', '', [['Product design', '12 weeks · Portfolio-ready projects'], ['Front-end development', '14 weeks · Ship real apps'], ['Data analysis', '10 weeks · From SQL to stories']]],
        ['steps', 'How it works', 'Learn by doing', '', [['Join a cohort', 'Small groups, fixed start date.'], ['Build projects', 'Real briefs, real feedback.'], ['Get career support', 'Portfolio reviews and interview prep.']]],
        ['testimonials', 'Students', 'Where they are now', '', [['I switched careers in six months.', '', '', 'Product design grad'], ['The feedback was honest and useful.', '', '', 'Front-end grad'], ['Best money I’ve spent on myself.', '', '', 'Data grad']]],
        ['faq', 'FAQ', 'Before you enroll', '', [['Do I need experience?', 'No — tracks start from the basics.'], ['Is it live or recorded?', 'Live sessions, recorded for replay.'], ['Can I pay monthly?', 'Yes, interest-free instalments.'], ['What if I fall behind?', 'Mentors help you catch up.']]],
        ['cta', '', 'Your next chapter starts here.', 'Applications close soon.']], pages: ['Courses', 'Contact'] }),
    I({ id: 'kin', name: 'Kin', category: 'Nonprofit & Community', desc: 'Hopeful nonprofit site with impact and donations.', kw: ['nonprofit', 'charity', 'foundation', 'community', 'ngo', 'volunteer', 'donate', 'cause', 'church', 'mission'],
      brand: '#1F8A5B', mood: 'light', radius: 'soft', fonts: ['Libre Franklin', 'Libre Franklin'], art: ['blobs', 'arch'], hero: 'split',
      links: ['Our work', 'Impact', 'Get involved'], cta: 'Donate',
      home: [['hero', 'Community-led since 2012', 'Small acts. Lasting change.', '{name} helps neighbours help each other — with food, skills and a place to belong.'],
        ['stats', '', '', '', [['Meals shared', '48k'], ['Volunteers', '620'], ['Families supported', '1,300'], ['Of every $ to programs', '89¢']]],
        ['features', 'Our work', 'Where your support goes', '', [['Food security', 'Weekly pantries and hot meals.'], ['Skills & jobs', 'Free classes and mentoring.'], ['Youth programs', 'Safe, fun, after-school spaces.']]],
        ['split', 'Get involved', 'Give an hour, change a week.', 'Volunteer shifts fit around your life — mornings, evenings or weekends.', [['No experience needed'], ['Training provided'], ['Family-friendly roles']], 'Volunteer with us'],
        ['newsletter', 'Stay close to the work', 'One story a month. No spam, ever.', 'Subscribe'],
        ['cta', '', 'Every gift goes further here.', 'Donate once or monthly. Tax-deductible where applicable.']], pages: ['Impact', 'Contact'] }),
    I({ id: 'wander', name: 'Wander', category: 'Travel & Hospitality', desc: 'Dreamy boutique hotel and travel site.', kw: ['hotel', 'travel', 'tour', 'resort', 'villa', 'airbnb', 'retreat', 'hostel', 'trip', 'adventure', 'bnb'],
      brand: '#0E7C86', mood: 'light', radius: 'round', fonts: ['Playfair Display', 'Nunito Sans'], art: ['arch', 'blobs'], hero: 'center', headWeight: '600',
      links: ['Stay', 'Experiences', 'Journal'], cta: 'Check availability',
      home: [['hero', 'Boutique stays by the sea', 'Slow mornings. Salt air. Nowhere to be.', 'Twelve rooms, one long table and the quiet you’ve been craving at {name}.'],
        ['gallery', 'The place', 'A glimpse inside', '', [['Sea-view suite'], ['Garden terrace'], ['Long table dinners'], ['Morning pool'], ['Reading room'], ['Coastal trail']]],
        ['features', 'Experiences', 'Days worth remembering', '', [['Sunrise kayak', 'Guided, gentle, unforgettable.'], ['Chef’s table', 'Five courses from the garden.'], ['Coastal walks', 'Maps and picnic packed for you.']]],
        ['testimonials', 'Guests', 'From the guestbook', '', [['We extended our stay twice.', '', '', 'Guest, summer'], ['The quietest, kindest place.', '', '', 'Guest, spring'], ['Food we still talk about.', '', '', 'Guest, autumn']]],
        ['cta', '', 'Your room with a view is waiting.', 'Best rates when you book direct.']], pages: ['Stay', 'Contact'] }),
    I({ id: 'forge', name: 'Forge', category: 'Developer Tools', desc: 'Terminal-inspired dev tool with docs-first feel.', kw: ['developer', 'api', 'sdk', 'devtool', 'open source', 'cli', 'database', 'hosting', 'cloud', 'infrastructure', 'platform'],
      brand: '#3DDC97', mood: 'dark', radius: 'sharp', fonts: ['JetBrains Mono', 'Inter'], art: ['ui', 'lines'], hero: 'center',
      links: ['Docs', 'Pricing', 'Changelog'], cta: 'Get an API key',
      home: [['hero', 'v2 is here', 'Ship the backend you’d build yourself — in an afternoon.', '{name} gives you auth, storage and queues behind one typed API.'],
        ['logos', 'Powering teams at', [['Hexagon'], ['Driftly'], ['Cobalt'], ['Mono']]],
        ['features', 'Why developers switch', 'Boring infrastructure, done right.', '', [['Typed SDKs', 'Autocomplete for everything.'], ['Local-first dev', 'Same stack on your laptop and in prod.'], ['Observability built in', 'Traces and logs without extra setup.']]],
        ['steps', 'Quickstart', 'Three commands to production', '', [['Install', 'One package, zero config.'], ['Define', 'Models and routes in code.'], ['Deploy', 'Push to main. Done.']]],
        ['pricing', 'Pricing', 'Pay for what you use', '', [['Hobby', '1 project · Community support', '$0', 'free'], ['Pro', 'Unlimited projects · Branch previews · Email support', '$25', 'per month'], ['Enterprise', 'SLA · SSO · Audit logs', 'Custom', 'annual']]],
        ['cta', '', 'Stop gluing services together.', 'Free tier forever. No card needed.']], pages: ['Pricing', 'Contact'] }),
    I({ id: 'bloom', name: 'Bloom', category: 'Beauty & Lifestyle', desc: 'Soft, elegant salon and beauty brand site.', kw: ['salon', 'beauty', 'florist', 'flowers', 'skincare', 'cosmetics', 'nails', 'hair', 'barber', 'wedding', 'bridal', 'makeup'],
      brand: '#C0487A', mood: 'light', radius: 'round', fonts: ['Cormorant Garamond', 'Jost'], art: ['blobs', 'arch'], hero: 'split', headWeight: '600',
      links: ['Services', 'Gallery', 'Book'], cta: 'Book now',
      home: [['hero', 'Studio open six days a week', 'Feel like yourself, only more so.', 'Thoughtful treatments and honest advice at {name} — in a studio designed for calm.'],
        ['features', 'Services', 'Treatments', '', [['Signature cut & style', 'Consultation included.'], ['Colour & gloss', 'Low-damage, long-lasting.'], ['Facials', 'Tailored to your skin today.']]],
        ['gallery', 'Gallery', 'Recent work', '', []],
        ['pricing', 'Menu', 'Prices', '', [['Essentials', 'Wash · Cut · Blow-dry', '$65', 'from'], ['Colour', 'Consultation · Colour · Gloss', '$140', 'from'], ['Ritual', 'Facial · Massage · Styling', '$180', 'from']]],
        ['testimonials', 'Clients', 'Kind words', '', [['I leave feeling brand new, every time.', '', '', 'Client of 3 years'], ['They actually listen.', '', '', 'New client'], ['The calmest hour of my month.', '', '', 'Facial client']]],
        ['cta', '', 'Your chair is ready.', 'Online booking, instant confirmation.']], pages: ['Services', 'Contact'] }),
    I({ id: 'studio', name: 'Studio', category: 'Portfolio & Agency', desc: 'Bold creative agency and freelancer portfolio.', kw: ['agency', 'portfolio', 'designer', 'freelance', 'creative', 'photographer', 'photography', 'architect', 'branding', 'consultant', 'personal'],
      brand: '#FF4D2E', mood: 'light', radius: 'sharp', fonts: ['Syne', 'Inter'], art: ['blobs', 'lines', 'arch'], hero: 'split',
      links: ['Work', 'Services', 'About'], cta: 'Start a project',
      home: [['hero', 'Independent studio · Available for new work', 'Ideas with edges.', '{name} designs brands, products and campaigns for teams that would rather be remembered than blend in.'],
        ['gallery', 'Selected work', 'Recent projects', '', [['Brand identity for a coffee roaster'], ['Mobile banking app'], ['Museum exhibition graphics'], ['Launch campaign'], ['E-commerce redesign'], ['Packaging system']]],
        ['features', 'Services', 'What we do', '', [['Brand identity', 'Names, logos, voice, systems.'], ['Digital product', 'Research, UX, UI, prototypes.'], ['Campaigns', 'Ideas that travel across channels.']]],
        ['stats', '', '', '', [['Years in practice', '10+'], ['Projects shipped', '140'], ['Countries', '12'], ['Awards', '9']]],
        ['testimonials', 'Clients', 'In their words', '', [['They made us look like the company we wanted to be.', '', '', 'Founder, coffee brand'], ['Fast, thoughtful and honest.', '', '', 'Head of product, fintech'], ['Our best launch yet.', '', '', 'Marketing lead']]],
        ['cta', '', 'Have a project in mind?', 'Tell us about it — we reply within two days.']], pages: ['Work', 'Contact'] }),
    I({ id: 'market', name: 'Market', category: 'Retail & E-commerce', desc: 'Clean online store with product grid and perks.', kw: ['shop', 'store', 'ecommerce', 'e-commerce', 'sell', 'products', 'boutique', 'brand', 'fashion', 'jewelry', 'candles', 'handmade', 'merch', 'dropship'],
      brand: '#1F1F1F', mood: 'light', radius: 'soft', fonts: ['Outfit', 'Outfit'], art: ['product'], hero: 'split',
      links: ['Shop', 'About', 'Help'], cta: 'Shop now',
      home: [['hero', 'Free shipping over $75', 'Everyday goods, made to last.', 'Thoughtfully made essentials from {name} — designed in small batches, built for years of use.'],
        ['products', 'Bestsellers', 'Shop the favourites', '', [['Everyday tote', '$68'], ['Ceramic mug set', '$42'], ['Linen throw', '$120'], ['Soy candle', '$28']]],
        ['features', 'Why shop with us', 'The small print, made big.', '', [['Free returns', '30 days, no questions.'], ['Carbon-neutral shipping', 'Every order, every time.'], ['Repair program', 'We fix what we make.']]],
        ['testimonials', 'Reviews', 'Loved by customers', '', [['Quality you can feel straight away.', '', '', 'Verified buyer'], ['Arrived fast, beautifully packed.', '', '', 'Verified buyer'], ['My third order this year.', '', '', 'Verified buyer']]],
        ['newsletter', 'Get 10% off your first order', 'New drops and restocks, twice a month.', 'Sign up'],
        ['cta', '', 'Find something you’ll keep.', 'New arrivals every Friday.']], pages: ['Shop', 'Contact'] })
  ];
  const tr = (s, name) => String(s || '').replace(/\{name\}/g, name);
  const toItems = (arr) => (arr || []).map((x) => (Array.isArray(x) ? { title: x[0], text: x[1] || '', value: x[2] || '', meta: x[3] || '' } : x));
  function sectionsFrom(lib, name) {
    return lib.home.map((row) => {
      const [kind, a, b, c, d, e] = row;
      if (kind === 'hero') return Object.assign({ kind, eyebrow: a, title: tr(b, name), text: tr(c, name), cta: lib.cta, meta: lib.meta || '' }, lib.heroExtra || {});
      if (kind === 'marquee') return { kind, title: 'Marquee', items: toItems((a || []).map((x) => [x])) };
      if (kind === 'manifesto') return { kind, eyebrow: a, title: tr(b, name) };
      if (kind === 'dashboard') return { kind, eyebrow: a, title: tr(b, name), text: tr(c, name), dashboard: d || {} };
      if (kind === 'logos') return { kind, title: a, items: toItems(b) };
      if (kind === 'newsletter') return { kind, title: a, text: b, cta: c };
      if (kind === 'cta') return { kind, title: tr(b, name), text: tr(c, name), cta: lib.cta };
      return { kind, eyebrow: a, title: tr(b, name), text: tr(c, name), items: toItems(d), cta: e };
    });
  }
  function extraPage(lib, pageName, home) {
    const find = (k) => home.find((s) => s.kind === k);
    if (/contact|visit|book/i.test(pageName)) return [{ kind: 'contact', eyebrow: 'Contact', title: 'Let’s talk.', text: 'Send a message and we’ll get back to you within one working day.', cta: 'Send message', items: [{ title: 'Email', value: `hello@${L.slug(lib.brandName || lib.name)}.com` }, { title: 'Hours', value: 'Mon–Fri, 9–6' }] }, find('faq') || { kind: 'faq', title: 'Common questions', items: [{ title: 'How fast do you reply?', text: 'Within one working day.' }, { title: 'Can we meet in person?', text: 'Yes — just ask.' }] }];
    const hit = home.find((s) => ['pricing', 'products', 'gallery', 'features', 'team'].includes(s.kind) && s.kind !== 'hero');
    const pick = /pric|member|menu/i.test(pageName) ? find('pricing') || find('products') : /shop|menu|stay/i.test(pageName) ? find('products') || find('gallery') : /work|gallery|impact/i.test(pageName) ? find('gallery') || find('stats') : null;
    return [{ kind: 'hero', eyebrow: pageName, title: pageName === 'Pricing' ? 'Simple, honest pricing.' : `${pageName} at ${lib.brandName}`, text: lib.home[0][3] ? tr(lib.home[0][3], lib.brandName) : '' }, pick || hit, find('faq'), find('cta')].filter(Boolean);
  }
  /** Industry preset → SiteSpec. opts: { name, brand, mood } */
  function specFromLib(lib, opts = {}) {
    const name = opts.name || lib.name; const mood = opts.mood || lib.mood;
    const home = sectionsFrom(lib, name);
    const withName = Object.assign({}, lib, { brandName: name });
    const pages = [{ name: 'Home', title: `${name} — ${home[0].title.replace(/\*/g, '')}`.slice(0, 70), description: String(home[0].text || '').slice(0, 155), sections: home }]
      .concat(lib.pages.map((pn) => ({ name: pn, title: `${pn} — ${name}`, description: `${pn} at ${name}.`, sections: extraPage(withName, pn, home) })));
    return { name, tagline: home[0].title.replace(/\*/g, ''), industry: lib.category, palette: opts.palette || paletteFrom(opts.brand || lib.brand, mood), fonts: { heading: lib.fonts[0], body: lib.fonts[1], accent: lib.fonts[2] || 'Instrument Serif' },
      style: { radius: opts.radius || lib.radius, mood, headWeight: lib.headWeight || '700', hero: opts.hero || lib.hero, fx: opts.fx || lib.fx || 'refined' }, art: lib.art, nav: { links: lib.links, cta: lib.cta }, pages, footer: `© ${new Date().getFullYear()} ${name}` };
  }


  /* ---------------------------------------------------------------- art direction for the library (v2)
     Each template gets a signature hero, rhythm sections (marquee, manifesto, bento, showcase),
     an accent serif, a motion preset and *accent* words in its headlines. */
  const DASH = {
    ai: { product: 'Nova Console', heading: 'Agent operations', sub: 'All workspaces · live', nav: ['Overview', 'Agents', 'Approvals', 'Audit log', 'Settings'], kpis: [['Tasks completed', '12,480', '+18%'], ['Hours saved', '3,210', '+22%'], ['Approval rate', '97.4%', '+1.2 pts'], ['Escalations', '41', '−12%']], chartTitle: 'Tasks per week (thousands)', barTitle: 'Tasks by team', bars: [['Support', 38], ['Finance', 24], ['Sales ops', 21], ['HR', 17]], cols: ['Agent', 'Workflow', 'Status', 'Runs', 'Score'], rows: [['Triage', 'Support inbox', 'Healthy', '4,120', '98%'], ['Reconcile', 'Finance close', 'Active', '860', '96%'], ['Enrich', 'CRM hygiene', 'Healthy', '2,340', '99%'], ['Draft', 'Proposals', 'Pending', '310', '91%'], ['Screen', 'Hiring', 'At risk', '190', '84%'], ['Route', 'Tickets', 'Healthy', '5,020', '97%']], filter: 'Filter agents' },
    fin: { product: 'Vault', heading: 'Cash overview', sub: 'All entities · USD', nav: ['Overview', 'Cards', 'Invoices', 'Cash flow', 'Accounting'], kpis: [['Cash balance', '$2.48M', '+6.2%'], ['Burn (monthly)', '$184k', '−4.1%'], ['Runway', '19 mo', '+2 mo'], ['Overdue invoices', '7', '−3']], chartTitle: 'Cash balance ($k)', series: [{ name: 'Balance', data: [1900, 1960, 2010, 1980, 2090, 2150, 2210, 2190, 2300, 2360, 2420, 2480] }, { name: 'Forecast', data: [1850, 1900, 1950, 1990, 2030, 2080, 2120, 2170, 2220, 2270, 2330, 2390] }], barTitle: 'Spend by category', bars: [['Payroll', 58], ['Software', 16], ['Travel', 9], ['Office', 7]], cols: ['Vendor', 'Category', 'Status', 'Due', 'Amount $'], rows: [['Figma', 'Software', 'Paid', 'Oct 01', '$4,800'], ['AWS', 'Infrastructure', 'Pending', 'Oct 03', '$12,420'], ['WeWork', 'Office', 'Paid', 'Oct 05', '$9,100'], ['Delta', 'Travel', 'Overdue', 'Sep 28', '$2,310'], ['Gusto', 'Payroll', 'Paid', 'Sep 30', '$142,000'], ['Notion', 'Software', 'Pending', 'Oct 09', '$1,240']], filter: 'Filter vendors' },
    dev: { product: 'Forge', heading: 'Production', sub: 'us-east · eu-west', nav: ['Overview', 'Deployments', 'Logs', 'Queues', 'Settings'], kpis: [['Requests / min', '48.2k', '+9%'], ['p95 latency', '84 ms', '−11%'], ['Error rate', '0.03%', '−0.01 pts'], ['Uptime (30d)', '99.99%', '+0.01 pts']], chartTitle: 'Requests per minute (k)', barTitle: 'Traffic by region', bars: [['us-east', 44], ['eu-west', 31], ['ap-south', 15], ['sa-east', 10]], cols: ['Service', 'Region', 'Status', 'Deploys', 'Usage %'], rows: [['api', 'us-east', 'Healthy', '42', '61%'], ['auth', 'eu-west', 'Healthy', '18', '38%'], ['queue', 'us-east', 'Active', '27', '72%'], ['search', 'ap-south', 'At risk', '9', '91%'], ['media', 'eu-west', 'Healthy', '12', '44%']], filter: 'Filter services' }
  };
  const UP = {
    nova: { hero: 'center', fx: 'cinematic', fonts: ['Space Grotesk', 'Inter', 'Instrument Serif'], title: 'Work, done by agents you can *trust.*', heroExtra: { dashboard: DASH.ai }, meta: 'SOC 2 · GDPR ready', swap: { features: 'bento' }, insert: [[2, ['marquee', ['Approvals built in', 'Audit trails', 'Private by default', 'Grounded answers', 'Human in the loop']]], [4, ['manifesto', 'Why we built it', 'Automation should feel like a *colleague,* not a black box. Every action explained, every change reversible, every decision *yours.*']]] },
    pulse: { hero: 'media', fx: 'cinematic', fonts: ['Anton', 'Inter', 'Instrument Serif'], title: 'Train like it *matters.*', insert: [[1, ['marquee', ['Strength', 'Conditioning', 'Mobility', 'Recovery', 'Community']]]] },
    harbor: { hero: 'editorial', fx: 'refined', fonts: ['Fraunces', 'DM Sans', 'Fraunces'], title: 'Simple food, cooked with *care.*', meta: 'Tue–Sun · 12–10pm', insert: [[1, ['marquee', ['Wood-fired', 'Seasonal', 'Natural wine', 'Handmade pasta', 'Long lunches']]], [3, ['manifesto', 'Our kitchen', 'We cook what’s *good this week,* from growers we know by name — and we never rush a *long lunch.*']]] },
    lumen: { hero: 'split', fx: 'refined', fonts: ['Manrope', 'Manrope', 'Instrument Serif'], title: 'Care that *listens* first.' },
    vault: { hero: 'center', fx: 'refined', fonts: ['IBM Plex Sans', 'IBM Plex Sans', 'Instrument Serif'], title: 'Know where every dollar is, *in real time.*', heroExtra: { dashboard: DASH.fin }, swap: { features: 'bento' } },
    scholar: { hero: 'editorial', fx: 'refined', fonts: ['Bricolage Grotesque', 'Inter', 'Instrument Serif'], title: 'Learn the skills that get you *hired.*', meta: 'Next cohort · 3 Nov', swap: { features: 'hscroll' } },
    kin: { hero: 'media', fx: 'refined', fonts: ['Libre Franklin', 'Libre Franklin', 'Instrument Serif'], title: 'Small acts. *Lasting* change.', insert: [[2, ['manifesto', 'What we believe', 'Everyone deserves *food on the table,* a skill to share and a place to *belong.*']]] },
    wander: { hero: 'media', fx: 'cinematic', fonts: ['Playfair Display', 'Nunito Sans', 'Playfair Display'], title: 'Slow mornings. Salt air. *Nowhere to be.*', insert: [[1, ['marquee', ['Sea-view suites', 'Chef’s table', 'Sunrise kayak', 'Coastal trails', 'Reading room']]]] },
    forge: { hero: 'center', fx: 'cinematic', fonts: ['JetBrains Mono', 'Inter', 'Instrument Serif'], title: 'Ship the backend you’d build yourself, *in an afternoon.*', heroExtra: { dashboard: DASH.dev }, swap: { features: 'bento' } },
    bloom: { hero: 'editorial', fx: 'refined', fonts: ['Cormorant Garamond', 'Jost', 'Cormorant Garamond'], headWeight: '600', title: 'Feel like yourself, *only more so.*', meta: 'Open six days a week', insert: [[1, ['marquee', ['Cut & style', 'Colour & gloss', 'Facials', 'Bridal', 'Rituals']]]] },
    studio: { hero: 'editorial', fx: 'cinematic', fonts: ['Syne', 'Inter', 'Instrument Serif'], title: 'Ideas with *edges.*', meta: 'Brand · Product · Campaign', swap: { gallery: 'showcase', features: 'services' }, insert: [[1, ['marquee', ['Brand identity', 'Digital product', 'Campaigns', 'Art direction', 'Motion']]], [4, ['manifesto', 'Our belief', 'The best brands are *felt* before they are understood. We design for that first *feeling* — then make it last.']]] },
    market: { hero: 'split', fx: 'refined', fonts: ['Outfit', 'Outfit', 'Instrument Serif'], title: 'Everyday goods, made to *last.*', insert: [[1, ['marquee', ['Free returns', 'Carbon-neutral shipping', 'Repair for life', 'Small batches']]]] }
  };
  LIB.forEach((lib) => {
    const u = UP[lib.id]; if (!u) return;
    Object.assign(lib, { hero: u.hero, fx: u.fx, fonts: u.fonts, meta: u.meta, heroExtra: u.heroExtra }); if (u.headWeight) lib.headWeight = u.headWeight;
    if (u.title) lib.home[0][2] = u.title;
    if (u.swap) lib.home.forEach((row) => { if (u.swap[row[0]]) row[0] = u.swap[row[0]]; });
    (u.insert || []).slice().sort((a, b) => b[0] - a[0]).forEach(([at, row]) => lib.home.splice(at, 0, row));
  });
  // Studio showcase: give the work items descriptive meta
  (LIB.find((l) => l.id === 'studio').home.find((r) => r[0] === 'showcase') || [])[4]?.forEach((it, i) => { it[2] = ['Identity · 2026', 'Product · 2025', 'Exhibition · 2025', 'Campaign · 2024', 'E-commerce · 2024', 'Packaging · 2024'][i]; });
  // Enterprise templates
  LIB.push(
    I({ id: 'atlas', name: 'Atlas', category: 'Enterprise SaaS', desc: 'Analytics platform site with a live product dashboard.', kw: ['analytics', 'dashboard', 'saas', 'b2b', 'enterprise', 'platform', 'crm', 'data', 'metrics', 'reporting', 'bi'],
      brand: '#4F46E5', mood: 'light', radius: 'soft', fonts: ['Inter Tight', 'Inter', 'Instrument Serif'], art: ['ui', 'lines'], hero: 'center', fx: 'refined', meta: 'SOC 2 Type II',
      heroExtra: { dashboard: { product: 'Atlas' } }, links: ['Product', 'Customers', 'Pricing'], cta: 'Book a demo',
      home: [['hero', 'Revenue analytics for B2B teams', 'Every number your board asks for, *already answered.*', '{name} unifies billing, CRM and product data into one trusted source — with dashboards your whole company can read.'],
        ['logos', 'Trusted by revenue teams at', [['Northwind'], ['Lumen'], ['Kestrel'], ['Parallax'], ['Orbit'], ['Quanta']]],
        ['bento', 'Platform', 'One model of your business.', 'Connect once. Every team sees the same numbers, defined the same way.', [['Metrics layer', 'Define MRR, churn and NRR once — reuse everywhere.'], ['Live dashboards', 'Sub-second queries on billions of rows.'], ['Alerts', 'Know when a metric moves, before the meeting.'], ['Row-level security', 'Everyone sees exactly what they should.'], ['Warehouse-native', 'Your data never leaves your cloud.'], ['Audit trail', 'Every change tracked and reversible.']]],
        ['stats', '', '', '', [['Faster month-end close', '4×'], ['Data sources', '140+'], ['Queries per day', '2.1B'], ['Customer NPS', '72']]],
        ['steps', 'Implementation', 'Live in two weeks, not two quarters.', '', [['Connect', 'Billing, CRM, product and warehouse.'], ['Model', 'We map your metrics with your finance team.'], ['Launch', 'Dashboards rolled out by team.'], ['Scale', 'Governance and alerts as you grow.']]],
        ['testimonials', 'Customers', 'Loved by finance and ops.', '', [['Board prep went from a week to an afternoon.', '', '', 'CFO, Series C fintech'], ['Finally one definition of churn.', '', '', 'VP RevOps, SaaS'], ['The security review was the easiest we’ve done.', '', '', 'CISO, healthcare']]],
        ['pricing', 'Pricing', 'Plans that scale with your data.', '', [['Team', 'Up to 20 seats · 10 sources · Email support', '$490', 'per month'], ['Business', 'Unlimited seats · Alerts · SSO', '$1,490', 'per month'], ['Enterprise', 'Private cloud · SCIM · 99.99% SLA', 'Custom', 'annual']]],
        ['faq', 'FAQ', 'Before your security review', '', [['Where is my data stored?', 'In your own warehouse. Atlas queries it in place.'], ['Do you support SSO and SCIM?', 'Yes, on Business and Enterprise.'], ['Is Atlas accessible?', 'Dashboards meet WCAG 2.2 AA, with keyboard navigation and screen-reader data tables.'], ['How long is onboarding?', 'Most teams are live in two weeks.']]],
        ['cta', '', 'See your business, *clearly.*', 'A 30-minute demo with your own metrics.']], pages: ['Pricing', 'Contact'] }),
    I({ id: 'console', name: 'Console', category: 'Enterprise SaaS', desc: 'Admin dashboard product UI: KPIs, charts and data tables.', kw: ['admin', 'console', 'internal tool', 'back office', 'portal', 'web app', 'app ui'],
      brand: '#0F766E', mood: 'light', radius: 'soft', fonts: ['Inter Tight', 'Inter', 'Instrument Serif'], art: ['ui'], hero: 'split', fx: 'minimal', links: ['Overview', 'Customers', 'Reports'], cta: 'New report',
      home: [['dashboard', '', '', '', { product: 'Console', heading: 'Overview', sub: 'Workspace · Acme Inc.' }],
        ['dashboard', 'Customers', 'Accounts at a glance', 'Filter, sort and export every account. Built on real tables for screen readers and keyboards.', { product: 'Console', heading: 'Customers', nav: ['Overview', 'Customers', 'Revenue', 'Reports', 'Settings'], kpis: [['Accounts', '1,284', '+3.1%'], ['At risk', '38', '−6'], ['Avg. seats', '42', '+4'], ['Expansion', '$22.4k', '+9%']] }]], pages: ['Reports'] })
  );
  /* ---------------------------------------------------------------- brief → spec (offline Architect) */
  const COLORS = { red: '#D92D3A', crimson: '#B3122E', orange: '#F2702C', amber: '#E8A317', yellow: '#E8C518', gold: '#C9A13B', lime: '#8BC34A', green: '#1F8A5B', emerald: '#10976B', mint: '#3FBF9B', teal: '#0E7C86', cyan: '#0BA5C7', blue: '#2F6BFF', navy: '#1B3A8A', indigo: '#4F46E5', purple: '#7C4DFF', violet: '#8B5CF6', lavender: '#A78BFA', pink: '#E0457B', rose: '#E11D74', magenta: '#C026D3', brown: '#8B5A2B', black: '#1F1F1F', grey: '#5B6475', gray: '#5B6475' };
  function detect(brief) {
    const b = ' ' + String(brief || '').toLowerCase() + ' ';
    let best = null, score = 0;
    LIB.forEach((lib) => { const s = lib.kw.reduce((a, k) => a + (b.includes(' ' + k) || b.includes(k + ' ') ? (k.length > 5 ? 2 : 1) : 0), 0); if (s > score) { score = s; best = lib; } });
    return best || LIB.find((x) => x.id === 'studio');
  }
  function nameFrom(brief) {
    const b = String(brief || '');
    const m = /["“']([^"”']{2,40})["”']/.exec(b) || /\b(?:called|named|brand(?:ed)? as|for)\s+([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,3})/.exec(b) || /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:is|—|-)\s/.exec(b);
    return m ? m[1].trim() : null;
  }
  function briefToSpec(brief, opts = {}) {
    const lib = opts.template ? LIB.find((x) => x.id === opts.template) || detect(brief) : detect(brief);
    const b = String(brief || '').toLowerCase();
    const color = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`).test(b));
    const hex = (/#([0-9a-f]{6})\b/i.exec(brief || '') || [])[0];
    const mood = /\b(dark|night|black|moody|neon)\b/.test(b) ? 'dark' : /\b(light|bright|airy|white|clean)\b/.test(b) ? 'light' : lib.mood;
    const radius = /\b(sharp|brutal|brutalist|editorial|square)\b/.test(b) ? 'sharp' : /\b(playful|friendly|round|soft|bubbly)\b/.test(b) ? 'round' : lib.radius;
    const name = opts.name || nameFrom(brief) || lib.name + (lib.name === 'Studio' ? ' North' : ' Co.');
    const spec = specFromLib(lib, { name, brand: hex || (color && COLORS[color]) || null, mood, radius });
    if (/\b(luxury|premium|elegant)\b/.test(b)) { spec.fonts = { heading: 'Cormorant Garamond', body: 'Jost' }; spec.style.headWeight = '600'; }
    if (/\b(shop|store|sell|products|e-?commerce)\b/.test(b) && !spec.pages[0].sections.some((s) => s.kind === 'products')) spec.pages[0].sections.splice(2, 0, { kind: 'products', eyebrow: 'Shop', title: 'Bestsellers', items: toItems([['Signature item', '$48'], ['Starter kit', '$89'], ['Gift card', '$25'], ['Limited edition', '$120']]) });
    if (/\b(pricing|plans|subscription)\b/.test(b) && !spec.pages[0].sections.some((s) => s.kind === 'pricing')) spec.pages[0].sections.splice(-1, 0, { kind: 'pricing', eyebrow: 'Pricing', title: 'Simple pricing', items: toItems([['Basic', 'Core features · Email support', '$9', 'per month'], ['Pro', 'Everything in Basic · Priority support', '$29', 'per month'], ['Business', 'Team seats · SSO · SLA', '$99', 'per month']]) });
    // honour any other sections the brief names
    const WANT = { newsletter: /\b(newsletter|mailing list|subscribe)/, testimonials: /\b(testimonials?|reviews?)\b/, team: /\b(team|staff|our people)\b/, faq: /\b(faq|questions)\b/, gallery: /\b(gallery|portfolio|photos)\b/, contact: /\b(contact|booking|book online|reservations?)\b/, stats: /\b(stats|numbers|metrics)\b/ };
    const homeS = spec.pages[0].sections; const libAll = LIB.flatMap((l) => sectionsFrom(l, name));
    Object.entries(WANT).forEach(([k, re]) => { if (re.test(b) && !homeS.some((s) => s.kind === k)) { const ex = libAll.find((s) => s.kind === k); homeS.splice(homeS.length - 1, 0, ex ? Object.assign({}, ex) : { kind: k, title: k === 'contact' ? 'Get in touch' : k[0].toUpperCase() + k.slice(1) }); } });
    if (/\b(blog|journal|news|articles)\b/.test(b)) spec.pages.splice(1, 0, { name: 'Journal', title: `Journal — ${name}`, sections: [{ kind: 'hero', eyebrow: 'Journal', title: 'Notes, news and ideas.' }, { kind: 'features', title: 'Latest posts', items: toItems([['Behind the scenes', 'How we work, honestly.'], ['What’s new', 'Updates from this season.'], ['Guides', 'Practical, short and useful.']]) }, { kind: 'newsletter', title: 'Get new posts by email', cta: 'Subscribe' }] });
    return { spec, template: lib };
  }


  /* ---------------------------------------------------------------- import the coded portfolio (faithful to its design system) */
  function loadContent() {
    return new Promise((res) => { if (window.SITE_CONTENT) return res(window.SITE_CONTENT); const sc = document.createElement('script'); sc.src = '../content/content.js?t=' + Date.now(); sc.onload = () => res(window.SITE_CONTENT || {}); sc.onerror = () => res({}); document.head.appendChild(sc); });
  }
  async function portfolioProject(name = 'Mutaher Portfolio (Loom)') {
    const C = await loadContent(); const site0 = C.site || {};
    const tok = await fetch('../tokens.css', { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
    const block = (light) => { const m = (light ? /:root\[data-theme="light"\]\s*\{([^}]*)\}/ : /:root\s*\{([^}]*)\}/).exec(tok); return m ? m[1] : ''; };
    const v = (k, light) => { const x = new RegExp(`--${k}:\\s*([^;]+);`).exec(block(light)); return x ? x[1].trim() : null; };
    const dark = { brand: v('accent') || '#D4F55B', ink: v('text') || '#E9F1EC', paper: v('bg') || '#0B100E', muted: v('text-2') || '#A3B8AC', soft: v('bg-2') || '#111916', line: '#26332C' };
    const light = { brand: v('accent', true) || '#52650B', ink: v('text', true) || '#0F1F18', paper: v('bg', true) || '#F5F2EA', muted: v('text-2', true) || '#3F5449', soft: v('bg-2', true) || '#ECE8DC', line: '#D6D2C4' };
    const R = '../../'; // published sites live in sites/<slug>/, the portfolio assets at the root
    const star = (text, words) => { let t = String(text || ''); (words || []).forEach((w) => { const clean = w.replace(/[.,]$/, ''); t = t.replace(new RegExp(`(^|\\s)(${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([.,]?)(?=\\s|$)`), (m, a, b, c) => `${a}*${b}${c}*`); }); return t; };
    const h = C.hero || {}; const lines = (h.lines || []).join(' ');
    const title = h.accentWord ? lines.replace(h.accentWord, `*${h.accentWord}*`) : lines;
    const projects = (C.projects || []).filter((x) => x.status !== 'draft' && !x.hidden).slice(0, 6);
    const spec = {
      name: site0.shortName || 'Mutaher', tagline: site0.title, industry: 'Portfolio', palette: dark,
      fonts: { heading: 'Inter Tight', body: 'Inter', accent: 'Instrument Serif' }, style: { radius: 'round', mood: 'dark', headWeight: '600', hero: 'editorial', fx: 'cinematic' },
      nav: { links: ['Work', 'Services', 'About', 'Contact'], cta: 'Let’s talk' }, socials: (site0.socials || []).map((x) => [x.label, x.url]).concat(site0.email ? [['Email', `mailto:${site0.email}`]] : []),
      wordmark: site0.shortName || 'Mutaher', footerTitle: site0.title, footerText: `${site0.location || ''} · ${site0.tagline || ''}`, footer: `© ${new Date().getFullYear()} ${site0.name || ''}`,
      pages: [{ name: 'Home', title: `${site0.name} — ${site0.title}`, description: String(h.sub || '').slice(0, 155), sections: [
        { kind: 'hero', layout: 'editorial', eyebrow: h.eyebrow, meta: site0.tagline, title, text: h.sub, cta: 'View case studies', items: [{ title: 'View my CV' }] },
        { kind: 'stats', items: (C.stats || []).slice(0, 6).map((x) => ({ title: x.label, value: `${x.prefix || ''}${x.value}${x.suffix || ''}` })) },
        { kind: 'marquee', items: (C.marquee || []).map((x) => ({ title: x })) },
        { kind: 'manifesto', eyebrow: (C.mission || {}).eyebrow, title: star((C.mission || {}).text, (C.mission || {}).highlights) },
        { kind: 'hscroll', eyebrow: '04 — Expertise', title: 'Strategy. Design. *Build.*', items: (C.pillars || []).map((x) => ({ title: x.title, text: `${x.promise} ${x.outcome || ''}`.trim(), meta: (x.capabilities || []).join(' · ') })) },
        { kind: 'split', eyebrow: '05 — Story', title: (C.story || {}).title, text: (C.story || {}).intro, image: R + 'assets/img/portrait-1200.webp' },
        { kind: 'services', eyebrow: '06 — Services', title: 'Three ways to *untangle* your product.', items: (C.services || []).map((x) => ({ title: x.title, text: `${x.description}${x.bestFor ? ` Best for: ${x.bestFor}.` : ''}`, value: x.duration })) },
        { kind: 'showcase', eyebrow: '07 — Work', title: 'Selected *work*', items: projects.map((x) => ({ title: x.title, text: x.subtitle, value: `${x.category || ''} · ${x.year || ''}`, src: x.cover && x.cover.src ? R + x.cover.src : '', alt: (x.cover && x.cover.alt) || `${x.title} case study cover`, href: `${R}case.html?slug=${x.slug}` })) },
        { kind: 'marquee', items: (C.tools || []).map((x) => ({ title: x })) },
        { kind: 'marquee', reverse: true, items: (C.certifications || []).slice(0, 10).map((x) => ({ title: `${x.title} · ${x.issuer}` })) },
        { kind: 'cta', eyebrow: '08 — Contact', title: `${(C.cta || {}).title || 'Let’s make it'} *${(C.cta || {}).accent || 'simple.'}*`, text: (C.cta || {}).text, cta: 'Say hello' }
      ] }]
    };
    const p = site(spec); p.name = name; p.slug = L.slug(name);
    p.altSwatches = light; p.fonts.accent = 'Instrument Serif';
    p.classes['stats-grid'].base['grid-template-columns'] = 'repeat(3, 1fr)';
    const home0 = p.pages[0];
    L.walk(home0.tree, (n) => {
      if (n.type === 'button' && n.text === 'View case studies') n.attrs.href = '#work';
      if (n.type === 'button' && n.text === 'View my CV') { n.attrs.href = site0.cvUrl || '#'; n.attrs.target = '_blank'; }
      if (n.type === 'button' && n.text === 'Say hello') n.attrs.href = site0.email ? `mailto:${site0.email}` : '#';
    });
    // story image → real portrait; ids for in-page nav
    const story = home0.tree.find((n) => JSON.stringify(n).includes('05 — Story')); if (story) { story.attrs.id = 'about'; L.walk([story], (n) => { if (n.type === 'image') { n.attrs.src = R + 'assets/img/portrait-1200.webp'; n.attrs.alt = `Portrait of ${site0.name || 'Mutaher'}`; } }); }
    const cta = home0.tree.find((n) => n.cls === 'cta-x'); if (cta) cta.attrs.id = 'contact';
    const mqs = home0.tree.filter((n) => n.cls === 'marquee'); if (mqs[2]) mqs[2].attrs['data-reverse'] = '';
    p.meta = Object.assign({}, p.meta, { csp: true, og: true, jsonld: true, jsonldType: 'Person' });
    p.template = 'portfolio';
    return p;
  }
  L.portfolioProject = portfolioProject;
  /* ---------------------------------------------------------------- register spec templates + colour variations */
  LIB.forEach((lib) => {
    const base = specFromLib(lib);
    T.register({ id: lib.id, name: lib.name, category: lib.category, desc: lib.desc, pages: base.pages.length, variants: variantsOf(base.palette, lib.mood), build() { return site(specFromLib(lib), { id: lib.id }); } });
  });
  // Hand-built templates get Loom FX art direction too
  ['noir', 'launchpad', 'journal', 'counsel', 'haven', 'atelier'].forEach((id) => { const t = T._byId && T._byId(id); if (!t || t._fx) return; const b = t.build; t._fx = true; t.build = function () { const p = b.call(this); if (!p.fonts.accent) p.fonts.accent = 'Instrument Serif'; return enhance(p, id === 'noir' || id === 'atelier' ? 'cinematic' : 'refined'); }; });
  // Colour variations for the hand-built templates too
  T.list.filter((t) => !t.variants || !t.variants.length).forEach((t) => {
    const sw = Object.fromEntries(T.swatchesOf(t.id).map((x) => [x.id, x.value])); if (!sw.brand) return;
    const mood = lum(sw.paper || '#fff') < 0.2 ? 'dark' : 'light';
    T.setVariants(t.id, variantsOf(Object.assign({ brand: sw.brand, ink: sw.ink, paper: sw.paper, muted: sw.muted, soft: sw.soft, line: sw.line }, sw), mood));
  });

  window.LoomCompose = { site, addSection, sectionNode, briefToSpec, specFromLib, detect, LIB, enhance, altTheme, kitFor, dashboardNode, lineChart, barChart, dataTable, FX_PRESETS, SECTION_KINDS: ['hero', 'logos', 'marquee', 'manifesto', 'features', 'bento', 'showcase', 'hscroll', 'services', 'split', 'stats', 'steps', 'testimonials', 'pricing', 'faq', 'gallery', 'products', 'team', 'dashboard', 'cta', 'newsletter', 'contact'],
    color: { hexToRgb, rgbToHex, hsl, hslToHex, contrast, ensureContrast, paletteFrom, fixPalette, variantsOf, lum, isHex } };
})();
