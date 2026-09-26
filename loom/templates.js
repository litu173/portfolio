/* LOOM — template library.
   Original templates in the categories people reach for most (portfolio & agency, SaaS, editorial,
   professional services, real estate, retail). Each builds a normal, fully editable Loom project:
   elements + classes + swatches + fonts, desktop-first with tablet/mobile overrides.
   Artwork is generated SVG (no stock images, no licensing). */
(() => {
  'use strict';
  const L = window.Loom;
  const { N } = L;

  /* ---------------------------------------------------------------- generated artwork */
  function art(seed, colors, { w = 1200, h = 800, kind = 'blobs' } = {}) {
    let x = seed * 9301 + 49297; const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    const [bg, a, b, c] = colors;
    let shapes = '';
    if (kind === 'blobs') for (let i = 0; i < 5; i++) shapes += `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${120 + rnd() * 320}" fill="${[a, b, c][i % 3]}" opacity="${0.55 + rnd() * 0.4}"/>`;
    if (kind === 'arch') shapes = `<rect x="${w * 0.3}" y="${h * 0.18}" width="${w * 0.4}" height="${h * 0.9}" rx="${w * 0.2}" fill="${a}"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.12}" fill="${b}"/><rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="${c}" opacity=".7"/>`;
    if (kind === 'house') shapes = `<rect width="${w}" height="${h * 0.62}" fill="${a}"/><path d="M${w * 0.2} ${h * 0.62}V${h * 0.38}L${w * 0.45} ${h * 0.2}L${w * 0.7} ${h * 0.38}V${h * 0.62}Z" fill="${b}"/><rect x="${w * 0.4}" y="${h * 0.44}" width="${w * 0.1}" height="${h * 0.18}" fill="${c}"/><rect x="${w * 0.25}" y="${h * 0.42}" width="${w * 0.1}" height="${h * 0.08}" fill="${c}" opacity=".8"/><rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${c}" opacity=".35"/>`;
    if (kind === 'product') shapes = `<ellipse cx="${w / 2}" cy="${h * 0.82}" rx="${w * 0.28}" ry="${h * 0.05}" fill="#000" opacity=".12"/><rect x="${w * 0.36}" y="${h * 0.18}" width="${w * 0.28}" height="${h * 0.6}" rx="${w * 0.06}" fill="${a}"/><rect x="${w * 0.42}" y="${h * 0.1}" width="${w * 0.16}" height="${h * 0.12}" rx="12" fill="${b}"/><rect x="${w * 0.4}" y="${h * 0.42}" width="${w * 0.2}" height="${h * 0.1}" rx="6" fill="${c}"/>`;
    if (kind === 'ui') shapes = `<rect x="${w * 0.08}" y="${h * 0.1}" width="${w * 0.84}" height="${h * 0.85}" rx="24" fill="${a}"/><rect x="${w * 0.08}" y="${h * 0.1}" width="${w * 0.2}" height="${h * 0.85}" rx="24" fill="${b}"/><rect x="${w * 0.33}" y="${h * 0.18}" width="${w * 0.25}" height="${h * 0.22}" rx="14" fill="${c}"/><rect x="${w * 0.61}" y="${h * 0.18}" width="${w * 0.25}" height="${h * 0.22}" rx="14" fill="${c}" opacity=".6"/><rect x="${w * 0.33}" y="${h * 0.46}" width="${w * 0.53}" height="${h * 0.4}" rx="14" fill="${c}" opacity=".35"/>`;
    if (kind === 'lines') for (let i = 0; i < 14; i++) shapes += `<path d="M0 ${h * (i / 14)} C ${w * 0.3} ${h * (i / 14) + 120 * rnd()}, ${w * 0.7} ${h * (i / 14) - 120 * rnd()}, ${w} ${h * (i / 14)}" stroke="${[a, b, c][i % 3]}" stroke-width="${2 + rnd() * 6}" fill="none" opacity=".8"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><filter id="b"><feGaussianBlur stdDeviation="${kind === 'blobs' ? 60 : 0}"/></filter></defs><rect width="${w}" height="${h}" fill="${bg}"/><g filter="url(#b)">${shapes}</g></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------------- shared kit (all use swatch/font variables) */
  const T = (a) => ({ 'border-top-width': a, 'border-top-style': 'solid', 'border-top-color': 'var(--sw-line)' });
  const PAD = (t, r = t, b = t, l = r) => ({ 'padding-top': t, 'padding-right': r, 'padding-bottom': b, 'padding-left': l });
  function kit(o = {}) {
    const rad = o.radius || '16px', btnRad = o.btnRadius || '999px';
    return {
      nav: { base: { ...PAD('22px', '24px'), position: 'sticky', top: '0', 'z-index': '10', 'background-color': 'var(--sw-paper)', ...(o.navLine ? { 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-line)' } : {}) } },
      'nav-in': { base: { width: '100%', 'max-width': '1200px', 'margin-left': 'auto', 'margin-right': 'auto', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'column-gap': '24px' } },
      brand: { base: { 'font-family': 'var(--font-heading)', 'font-size': o.brandSize || '22px', 'font-weight': o.headWeight || '700', 'text-decoration': 'none', 'letter-spacing': '-0.02em' } },
      'nav-links': { base: { display: 'flex', 'align-items': 'center', 'column-gap': '28px' }, landscape: { display: 'none' } },
      'nav-link': { base: { 'text-decoration': 'none', 'font-size': '15px', 'font-weight': '500', color: 'var(--sw-muted)', transition: 'color .2s' }, 'base:hover': { color: 'var(--sw-ink)' } },
      btn: { base: { display: 'inline-block', ...PAD('14px', '26px'), 'background-color': 'var(--sw-brand)', color: o.btnInk || 'var(--sw-paper)', 'border-radius': btnRad, 'font-weight': '600', 'font-size': '15px', 'text-decoration': 'none', transition: 'all .25s ease' }, 'base:hover': { transform: 'translateY(-2px)', 'box-shadow': '0 12px 30px -12px var(--sw-brand)' } },
      'btn-ghost': { base: { display: 'inline-block', ...PAD('13px', '25px'), 'border-radius': btnRad, 'font-weight': '600', 'font-size': '15px', 'text-decoration': 'none', 'border-top-width': '1px', 'border-right-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '1px', 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': 'var(--sw-line)', 'border-right-color': 'var(--sw-line)', 'border-bottom-color': 'var(--sw-line)', 'border-left-color': 'var(--sw-line)', transition: 'all .25s' }, 'base:hover': { 'border-top-color': 'var(--sw-ink)', 'border-right-color': 'var(--sw-ink)', 'border-bottom-color': 'var(--sw-ink)', 'border-left-color': 'var(--sw-ink)' } },
      section: { base: PAD(o.sectionPad || '112px', '24px'), landscape: PAD('72px', '20px') },
      container: { base: { width: '100%', 'max-width': '1200px', 'margin-left': 'auto', 'margin-right': 'auto' } },
      eyebrow: { base: { 'font-size': '12px', 'font-weight': '600', 'letter-spacing': '0.14em', 'text-transform': 'uppercase', color: 'var(--sw-brand)', 'margin-bottom': '18px' } },
      display: { base: { 'font-family': 'var(--font-heading)', 'font-size': o.displaySize || '88px', 'line-height': '0.98', 'letter-spacing': o.displayTrack || '-0.045em', 'font-weight': o.headWeight || '700', 'margin-bottom': '28px', 'max-width': o.displayMax || '14ch' }, tablet: { 'font-size': '64px' }, landscape: { 'font-size': '46px' }, portrait: { 'font-size': '38px' } },
      'h-sec': { base: { 'font-family': 'var(--font-heading)', 'font-size': '48px', 'line-height': '1.05', 'letter-spacing': '-0.035em', 'font-weight': o.headWeight || '700', 'margin-bottom': '20px', 'max-width': '20ch' }, landscape: { 'font-size': '34px' } },
      lead: { base: { 'font-size': '20px', 'line-height': '1.55', color: 'var(--sw-muted)', 'max-width': '56ch', 'margin-bottom': '36px' }, landscape: { 'font-size': '17px' } },
      muted: { base: { color: 'var(--sw-muted)' } },
      actions: { base: { display: 'flex', 'flex-wrap': 'wrap', 'column-gap': '12px', 'row-gap': '12px', 'align-items': 'center' } },
      'grid-2': { base: { display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'column-gap': '28px', 'row-gap': '28px' }, landscape: { 'grid-template-columns': '1fr' } },
      'grid-3': { base: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'column-gap': '24px', 'row-gap': '24px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' }, landscape: { 'grid-template-columns': '1fr' } },
      'grid-4': { base: { display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'column-gap': '20px', 'row-gap': '28px' }, tablet: { 'grid-template-columns': 'repeat(2, 1fr)' } },
      card: { base: { 'border-radius': rad, overflow: 'hidden', 'background-color': 'var(--sw-soft)', display: 'block', 'text-decoration': 'none', transition: 'transform .35s cubic-bezier(.16,1,.3,1)' }, 'base:hover': { transform: 'translateY(-4px)' } },
      'card-img': { base: { width: '100%', 'aspect-ratio': o.imgRatio || '4 / 3', 'object-fit': 'cover' } },
      'card-body': { base: PAD('22px', '24px', '26px') },
      'card-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '22px', 'letter-spacing': '-0.02em', 'font-weight': o.headWeight || '700', 'margin-bottom': '8px' } },
      'card-text': { base: { color: 'var(--sw-muted)', 'font-size': '15px', 'margin-bottom': '0' } },
      tag: { base: { display: 'inline-block', ...PAD('5px', '12px'), 'border-radius': '999px', 'background-color': 'var(--sw-paper)', 'font-size': '12px', 'font-weight': '600', 'margin-bottom': '14px', color: 'var(--sw-ink)' } },
      split: { base: { display: 'flex', 'column-gap': '64px', 'row-gap': '40px', 'align-items': 'center' }, tablet: { 'flex-direction': 'column', 'align-items': 'stretch' } },
      half: { base: { flex: '1 1 0', 'min-width': '0' } },
      'img-r': { base: { width: '100%', 'border-radius': rad } },
      center: { base: { display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'text-align': 'center' } },
      row: { base: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'baseline', 'column-gap': '24px', ...T('1px'), ...PAD('28px', '0') }, landscape: { 'flex-direction': 'column', 'row-gap': '8px' } },
      num: { base: { 'font-family': 'var(--font-heading)', 'font-size': '14px', color: 'var(--sw-brand)', 'min-width': '48px' } },
      'row-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '34px', 'letter-spacing': '-0.03em', flex: '1 1 0', 'font-weight': o.headWeight || '700' }, landscape: { 'font-size': '26px' } },
      stat: { base: {} }, 'stat-v': { base: { 'font-family': 'var(--font-heading)', 'font-size': '56px', 'letter-spacing': '-0.045em', 'line-height': '1', 'margin-bottom': '8px', 'font-weight': o.headWeight || '700' } }, 'stat-l': { base: { color: 'var(--sw-muted)', 'font-size': '15px' } },
      band: { base: { 'background-color': 'var(--sw-ink)', color: 'var(--sw-paper)', 'border-radius': o.bandRadius || '28px', ...PAD('96px', '32px'), 'text-align': 'center', display: 'flex', 'flex-direction': 'column', 'align-items': 'center' }, landscape: PAD('64px', '20px') },
      'band-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '64px', 'letter-spacing': '-0.045em', 'line-height': '1', 'margin-bottom': '20px', 'font-weight': o.headWeight || '700', 'max-width': '16ch' }, landscape: { 'font-size': '40px' } },
      'band-btn': { base: { display: 'inline-block', ...PAD('15px', '28px'), 'background-color': 'var(--sw-paper)', color: 'var(--sw-ink)', 'border-radius': btnRad, 'font-weight': '600', 'text-decoration': 'none', transition: 'opacity .2s' }, 'base:hover': { opacity: '0.85' } },
      footer: { base: { ...PAD('48px', '24px'), ...T('1px'), color: 'var(--sw-muted)', 'font-size': '14px' } },
      'footer-in': { base: { width: '100%', 'max-width': '1200px', 'margin-left': 'auto', 'margin-right': 'auto', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'flex-wrap': 'wrap', 'row-gap': '12px' } },
      ...(o.extra || {})
    };
  }
  // tiny builders
  const nav = (brand, links, cta) => N('section', { tag: 'nav', cls: 'nav' }, [N('div', { cls: 'nav-in' }, [N('link', { cls: 'brand', text: brand, attrs: { href: 'page:home' } }), N('div', { cls: 'nav-links' }, [...links.map((l) => N('link', { cls: 'nav-link', text: l })), ...(cta ? [N('button', { cls: 'btn', text: cta })] : [])])])]);
  const sec = (kids, cls = 'section', tag) => N('section', { cls, tag }, [N('container', {}, kids)]);
  const H = (tag, text, cls) => N('heading', { tag, text, cls });
  const Pp = (text, cls) => N('paragraph', { text, cls });
  const Tx = (text, cls) => N('text', { text, cls });
  const Btn = (text, cls = 'btn', href) => N('button', { text, cls, attrs: href ? { href } : undefined });
  const Img = (src, alt, cls = 'card-img') => N('image', { cls, attrs: { src, alt } });
  const D = (cls, kids, tag) => N('div', { cls, tag }, kids);
  const footer = (left, links) => N('section', { tag: 'footer', cls: 'footer' }, [D('footer-in', [Tx(left), D('nav-links', links.map((l) => N('link', { cls: 'nav-link', text: l })))])]);
  const cta = (title, text, btn) => N('section', { cls: 'section' }, [N('container', {}, [D('band', [H('h2', title, 'band-title'), Pp(text, 'lead band-lead'), Btn(btn, 'band-btn')])])]);

  function make(meta, fonts, swatches, classes, pages) {
    const p = L.blankProject(meta.name);
    p.fonts = fonts; p.swatches = swatches.map(([id, name, value]) => ({ id, name, value }));
    Object.assign(p.classes, classes);
    p.classes['band-lead'] = { base: { color: 'inherit', opacity: '0.72' } };
    p.pages = L.uniqueSlugs(pages.map((pg, i) => ({ id: L.uid('pg'), name: pg.name, slug: i === 0 ? 'index' : L.slug(pg.name), title: '', tree: pg.tree })));
    // resolve page:home / page:<slug> links to page ids
    const bySlug = Object.fromEntries(p.pages.map((pg) => [pg.slug === 'index' ? 'home' : pg.slug, pg.id]));
    p.pages.forEach((pg) => L.walk(pg.tree, (n) => { const h = n.attrs && n.attrs.href; if (h && h.startsWith('page:') && bySlug[h.slice(5)]) n.attrs.href = 'page:' + bySlug[h.slice(5)]; }));
    p.pages.forEach((pg) => L.ensureTreeClasses(p, pg.tree));
    p.template = meta.id;
    return p;
  }

  /* ---------------------------------------------------------------- templates */
  const TEMPLATES = [
    {
      id: 'noir', name: 'Noir', category: 'Portfolio & Agency', desc: 'Dark, editorial studio portfolio with serif display type.', pages: 2,
      build() {
        const col = ['#141414', '#E8D5B0', '#6D5B45', '#2B2B2B'];
        const k = kit({ headWeight: '400', displaySize: '112px', displayTrack: '-0.03em', radius: '6px', btnInk: '#0E0E0E', extra: {
          'hero-noir': { base: { ...PAD('150px', '24px', '96px') } },
          'work-img': { base: { width: '100%', 'aspect-ratio': '5 / 4', 'object-fit': 'cover', 'border-radius': '6px', 'margin-bottom': '18px', transition: 'opacity .3s' }, 'base:hover': { opacity: '0.85' } },
          'work-meta': { base: { display: 'flex', 'justify-content': 'space-between', color: 'var(--sw-muted)', 'font-size': '14px' } },
          'work-item': { base: { display: 'block', 'text-decoration': 'none' } }
        } });
        const work = [['Maison Aurel', 'Identity · 2026', 11], ['Field & Form', 'Web · 2025', 22], ['Octave Audio', 'Product · 2025', 33], ['Studio Saline', 'Campaign · 2024', 44]];
        const home = [nav('Noir Studio', ['Work', 'Studio', 'Contact']),
          N('section', { cls: 'hero-noir' }, [N('container', {}, [Tx('Independent design studio — Lisbon', 'eyebrow'), H('h1', 'We design quiet, confident brands.', 'display'), Pp('Identity, digital products and campaigns for companies who would rather be remembered than noticed.', 'lead'), D('actions', [Btn('See selected work'), Btn('Start a project', 'btn-ghost')])])]),
          sec([D('grid-2', work.map(([t, m, s]) => D('work-item', [Img(art(s, col), `${t} project artwork`, 'work-img'), H('h3', t, 'card-title'), D('work-meta', [Tx(m), Tx('View →')])], 'a')))]),
          sec([Tx('What we do', 'eyebrow'), ...[['01', 'Brand identity'], ['02', 'Digital products'], ['03', 'Art direction'], ['04', 'Campaigns']].map(([n, t]) => D('row', [Tx(n, 'num'), H('h3', t, 'row-title'), Tx('Strategy → system → launch', 'muted')]))]),
          cta('Have something worth doing well?', 'We take on four projects a year. Tell us about yours.', 'hello@noir.studio'),
          footer('© 2026 Noir Studio', ['Instagram', 'Behance', 'LinkedIn'])];
        const studio = [nav('Noir Studio', ['Work', 'Studio', 'Contact']), sec([D('split', [D('half', [Tx('The studio', 'eyebrow'), H('h1', 'Small team. Long relationships.', 'h-sec'), Pp('Six designers, one table, no account managers. We work directly with founders and keep projects small enough to care about every detail.', 'lead')]), D('half', [Img(art(55, col, { kind: 'arch' }), 'Abstract arch artwork', 'img-r')])])]), footer('© 2026 Noir Studio', ['Instagram', 'Behance', 'LinkedIn'])];
        return make(this, { body: 'Inter', heading: 'Instrument Serif' }, [['brand', 'Champagne', '#E8D5B0'], ['ink', 'Ivory', '#F2EFEA'], ['paper', 'Black', '#0E0E0E'], ['muted', 'Stone', '#8A857D'], ['soft', 'Graphite', '#181818'], ['line', 'Line', '#2A2A2A']], k, [{ name: 'Home', tree: home }, { name: 'Studio', tree: studio }]);
      }
    },
    {
      id: 'launchpad', name: 'Launchpad', category: 'Technology & SaaS', desc: 'Bright product launch page with bento features and pricing.', pages: 1,
      build() {
        const col = ['#EEF0FF', '#FFFFFF', '#E3E6FB', '#5B5BF7'];
        const k = kit({ radius: '20px', displaySize: '80px', displayMax: '16ch', navLine: true, extra: {
          'hero-c': { base: { ...PAD('120px', '24px', '72px'), display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'text-align': 'center' } },
          badge: { base: { display: 'inline-block', ...PAD('6px', '14px'), 'border-radius': '999px', 'background-color': 'var(--sw-soft)', color: 'var(--sw-brand)', 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '24px' } },
          shot: { base: { width: '100%', 'max-width': '1100px', 'margin-top': '56px', 'border-radius': '24px', 'box-shadow': '0 40px 100px -40px rgba(40,40,120,.45)' } },
          bento: { base: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'column-gap': '20px', 'row-gap': '20px' }, tablet: { 'grid-template-columns': '1fr' } },
          'bento-card': { base: { ...PAD('32px', '30px'), 'border-radius': '24px', 'background-color': 'var(--sw-soft)', 'min-height': '240px', display: 'flex', 'flex-direction': 'column', 'justify-content': 'flex-end' } },
          'bento-wide': { base: { 'grid-column': 'span 2', ...PAD('32px', '30px'), 'border-radius': '24px', 'background-color': 'var(--sw-brand)', color: '#FFFFFF', 'min-height': '240px', display: 'flex', 'flex-direction': 'column', 'justify-content': 'flex-end' }, tablet: { 'grid-column': 'span 1' } },
          price: { base: { ...PAD('36px', '32px'), 'border-radius': '24px', 'border-top-width': '1px', 'border-right-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '1px', 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': 'var(--sw-line)', 'border-right-color': 'var(--sw-line)', 'border-bottom-color': 'var(--sw-line)', 'border-left-color': 'var(--sw-line)' } },
          'price-hot': { base: { ...PAD('36px', '32px'), 'border-radius': '24px', 'background-color': 'var(--sw-ink)', color: '#FFFFFF', transform: 'translateY(-12px)' }, tablet: { transform: 'none' } },
          'price-v': { base: { 'font-family': 'var(--font-heading)', 'font-size': '52px', 'letter-spacing': '-0.04em', 'font-weight': '700', 'margin-bottom': '8px' } },
          logos: { base: { display: 'flex', 'justify-content': 'center', 'flex-wrap': 'wrap', 'column-gap': '48px', 'row-gap': '16px', color: 'var(--sw-muted)', 'font-family': 'var(--font-heading)', 'font-weight': '700', 'font-size': '20px', opacity: '0.6' } }
        } });
        const tree = [nav('Launchpad', ['Product', 'Pricing', 'Docs'], 'Start free'),
          N('section', { cls: 'hero-c' }, [Tx('✦ New — Workflows 2.0 are live', 'badge'), H('h1', 'Ship your roadmap, not your weekends.', 'display'), Pp('Launchpad turns scattered requests into a calm, prioritised plan your whole team can see.', 'lead'), D('actions', [Btn('Start free — no card'), Btn('Watch the 2-min tour', 'btn-ghost')]), Img(art(7, col, { kind: 'ui' }), 'Launchpad dashboard showing a prioritised roadmap', 'shot')]),
          sec([D('logos', ['Northwind', 'Lumen', 'Kestrel', 'Parallax', 'Orbit'].map((t) => Tx(t)))], 'section'),
          sec([Tx('Features', 'eyebrow'), H('h2', 'Everything your team needs to decide faster.', 'h-sec'),
            D('bento', [D('bento-wide', [H('h3', 'One inbox for every request', 'card-title'), Pp('Slack, email and support tickets land in one place — deduplicated automatically.', 'band-lead')]), D('bento-card', [H('h3', 'Impact scoring', 'card-title'), Pp('Rank ideas by reach and effort.', 'card-text')]), D('bento-card', [H('h3', 'Live roadmaps', 'card-title'), Pp('Share a link, not a slide deck.', 'card-text')]), D('bento-wide', [H('h3', 'Automations that stay out of the way', 'card-title'), Pp('Close the loop with customers when their request ships.', 'band-lead')])])]),
          sec([D('grid-4', [['3×', 'faster planning'], ['42%', 'fewer status meetings'], ['2 min', 'to set up'], ['99.9%', 'uptime']].map(([v, l]) => D('stat', [H('h3', v, 'stat-v'), Tx(l, 'stat-l')])))]),
          sec([D('center', [Tx('Pricing', 'eyebrow'), H('h2', 'Simple pricing that scales with you.', 'h-sec')]), D('grid-3', [['Starter', '$0', 'For small teams getting organised.', 'price'], ['Team', '$12', 'Per seat / month. Everything in Starter plus automations.', 'price-hot'], ['Scale', 'Custom', 'SSO, audit logs and a dedicated partner.', 'price']].map(([t, v, d, c]) => D(c, [Tx(t, 'eyebrow'), H('h3', v, 'price-v'), Pp(d, 'card-text'), Btn(t === 'Scale' ? 'Talk to us' : 'Choose ' + t, t === 'Team' ? 'band-btn' : 'btn-ghost')])))]),
          cta('Your next launch starts here.', 'Free for teams up to 5. Set up in two minutes.', 'Start free'),
          footer('© 2026 Launchpad Inc.', ['Privacy', 'Terms', 'Status'])];
        return make(this, { body: 'Inter', heading: 'Plus Jakarta Sans' }, [['brand', 'Violet', '#5B5BF7'], ['ink', 'Ink', '#0B1220'], ['paper', 'White', '#FFFFFF'], ['muted', 'Slate', '#5A6478'], ['soft', 'Mist', '#F4F5FB'], ['line', 'Line', '#E6E8F0']], k, [{ name: 'Home', tree }]);
      }
    },
    {
      id: 'journal', name: 'Journal', category: 'Blog & Editorial', desc: 'Warm magazine layout with featured story and article grid.', pages: 2,
      build() {
        const col = ['#F2ECE3', '#D8A48F', '#B5452B', '#6E665C'];
        const k = kit({ headWeight: '600', displaySize: '96px', radius: '4px', btnRadius: '4px', extra: {
          mast: { base: { ...PAD('56px', '24px', '40px'), 'text-align': 'center', 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'var(--sw-ink)' } },
          'mast-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '120px', 'line-height': '0.9', 'letter-spacing': '-0.04em', 'font-weight': '600', 'margin-bottom': '10px' }, landscape: { 'font-size': '64px' } },
          'article-title': { base: { 'font-family': 'var(--font-heading)', 'font-size': '26px', 'line-height': '1.15', 'font-weight': '600', 'margin-bottom': '10px' } },
          'news': { base: { 'background-color': 'var(--sw-soft)', ...PAD('64px', '32px'), 'border-radius': '4px', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'column-gap': '32px', 'row-gap': '20px' }, tablet: { 'flex-direction': 'column', 'align-items': 'flex-start' } },
          prose: { base: { 'font-size': '20px', 'line-height': '1.75', 'max-width': '68ch', 'margin-left': 'auto', 'margin-right': 'auto' } }
        } });
        const posts = [['Culture', 'The slow return of the letter', 61], ['Design', 'Why every city needs a good bench', 62], ['Food', 'A season of bitter greens', 63], ['Travel', 'Night trains are back — here’s why', 64], ['Ideas', 'Against the productivity gospel', 65], ['Books', 'Six novels for long evenings', 66]];
        const home = [N('section', { cls: 'mast' }, [N('container', {}, [Tx('Issue 14 · Autumn 2026', 'eyebrow'), H('h1', 'The Journal', 'mast-title'), Tx('Essays on culture, craft and living well', 'muted')])]),
          sec([D('split', [D('half', [Img(art(60, col, { kind: 'arch' }), 'Featured story artwork', 'img-r')]), D('half', [Tx('Featured · 12 min read', 'eyebrow'), H('h2', 'What we lose when everything is optimised', 'h-sec'), Pp('An argument for inefficiency, boredom and the long way round — and what it gives back.', 'lead'), N('link', { text: 'Read the essay →', cls: 'nav-link', attrs: { href: 'page:story' } })])])]),
          sec([Tx('Latest', 'eyebrow'), D('grid-3', posts.map(([c, t, s]) => D('work-item', [Img(art(s, col), `${t} illustration`, 'card-img'), D('card-body', [Tx(c, 'tag'), H('h3', t, 'article-title'), Tx('By The Journal · 6 min', 'muted')])], 'a')))]),
          sec([D('news', [D('half', [H('h2', 'One good essay, every Sunday.', 'h-sec'), Pp('No noise. Unsubscribe any time.', 'card-text')]), Btn('Subscribe free')])]),
          footer('© 2026 The Journal', ['About', 'Archive', 'RSS'])];
        home[2].children[0].children[1].children.forEach((c) => (c.cls = 'card'));
        const story = [nav('The Journal', ['Latest', 'Archive', 'About']), sec([D('center', [Tx('Ideas · 12 min read', 'eyebrow'), H('h1', 'What we lose when everything is optimised', 'h-sec')]), Img(art(60, col, { kind: 'arch' }), 'Story artwork', 'img-r'), Pp('It starts innocently: a shortcut here, an automation there. Then one day the long walk is gone, the wrong turn is gone, and so is the conversation you had because the train was late. This essay is about getting a little of that back.', 'prose')]), footer('© 2026 The Journal', ['About', 'Archive', 'RSS'])];
        return make(this, { body: 'Source Sans 3', heading: 'Fraunces' }, [['brand', 'Rust', '#B5452B'], ['ink', 'Ink', '#1D1A16'], ['paper', 'Paper', '#FBF8F3'], ['muted', 'Taupe', '#6E665C'], ['soft', 'Linen', '#F2ECE3'], ['line', 'Line', '#E4DCD0']], k, [{ name: 'Home', tree: home }, { name: 'Story', tree: story }]);
      }
    },
    {
      id: 'counsel', name: 'Counsel', category: 'Professional Services', desc: 'Calm, trustworthy site for consultancies and law firms.', pages: 1,
      build() {
        const col = ['#E7EEEC', '#0F5C4E', '#8FB8AD', '#C9D9D4'];
        const k = kit({ radius: '14px', btnRadius: '10px', displaySize: '72px', displayMax: '18ch', headWeight: '700', navLine: true, extra: {
          step: { base: { ...PAD('28px', '24px'), 'border-radius': '14px', 'background-color': 'var(--sw-soft)' } },
          'step-n': { base: { 'font-family': 'var(--font-heading)', 'font-size': '40px', 'font-weight': '700', color: 'var(--sw-brand)', 'margin-bottom': '14px' } },
          principle: { base: { 'font-family': 'var(--font-heading)', 'font-size': '40px', 'line-height': '1.2', 'letter-spacing': '-0.02em', 'max-width': '28ch', 'font-weight': '600' }, landscape: { 'font-size': '28px' } },
          check: { base: { display: 'flex', 'flex-direction': 'column', 'row-gap': '12px', 'padding-left': '0', 'list-style-type': 'none', 'margin-top': '24px' } }
        } });
        const tree = [nav('Counsel & Co.', ['Services', 'Approach', 'Team'], 'Book a consultation'),
          sec([D('split', [D('half', [Tx('Advisory · Strategy · Compliance', 'eyebrow'), H('h1', 'Clear advice for complicated decisions.', 'display'), Pp('We help growing companies navigate regulation, restructuring and risk — in plain language, on a fixed fee.', 'lead'), D('actions', [Btn('Book a free consultation'), Btn('Our services', 'btn-ghost')])]), D('half', [Img(art(71, col, { kind: 'lines' }), 'Abstract flowing lines', 'img-r')])])]),
          sec([Tx('Services', 'eyebrow'), H('h2', 'Focused expertise, no surprises on the invoice.', 'h-sec'), D('grid-3', [['Corporate advisory', 'Structuring, fundraising and board support.'], ['Regulatory compliance', 'GDPR, sector licensing and audits.'], ['Disputes & risk', 'Early resolution before it gets expensive.']].map(([t, d]) => D('card', [D('card-body', [H('h3', t, 'card-title'), Pp(d, 'card-text')])])))]),
          sec([Tx('How we work', 'eyebrow'), D('grid-4', [['01', 'Listen', 'A free 30-minute call.'], ['02', 'Scope', 'A fixed fee, in writing.'], ['03', 'Deliver', 'Weekly updates, no jargon.'], ['04', 'Review', 'We check in after 90 days.']].map(([n, t, d]) => D('step', [Tx(n, 'step-n'), H('h3', t, 'card-title'), Pp(d, 'card-text')])))]),
          sec([Tx('Our principles', 'eyebrow'), H('h2', '“If we can’t explain it simply, we haven’t understood it yet.”', 'principle')]),
          cta('Talk it through — the first call is on us.', 'Thirty minutes, no obligation, real answers.', 'Book a consultation'),
          footer('© 2026 Counsel & Co. · Registered in England', ['Privacy', 'Complaints', 'LinkedIn'])];
        return make(this, { body: 'Manrope', heading: 'Manrope' }, [['brand', 'Evergreen', '#0F5C4E'], ['ink', 'Navy', '#0F1B2D'], ['paper', 'Cloud', '#F7F8F9'], ['muted', 'Slate', '#5B6675'], ['soft', 'Sage', '#E7EEEC'], ['line', 'Line', '#DDE3E1']], k, [{ name: 'Home', tree }]);
      }
    },
    {
      id: 'haven', name: 'Haven', category: 'Real Estate', desc: 'Listings, neighbourhoods and agent contact for property brands.', pages: 1,
      build() {
        const col = ['#EAD9C3', '#C0843D', '#7A5A3A', '#F5F1EB'];
        const k = kit({ headWeight: '400', displaySize: '96px', radius: '18px', btnInk: '#FFFFFF', extra: {
          'hero-h': { base: { ...PAD('0', '24px', '0'), } },
          'hero-img': { base: { width: '100%', 'aspect-ratio': '21 / 9', 'object-fit': 'cover', 'border-radius': '28px' }, landscape: { 'aspect-ratio': '4 / 3' } },
          search: { base: { display: 'flex', 'column-gap': '8px', 'row-gap': '8px', ...PAD('10px', '10px'), 'border-radius': '999px', 'background-color': '#FFFFFF', 'box-shadow': '0 20px 50px -20px rgba(0,0,0,.25)', 'max-width': '720px', 'margin-top': '-44px', 'margin-left': 'auto', 'margin-right': 'auto', position: 'relative', 'align-items': 'center' }, landscape: { 'border-radius': '20px', 'flex-direction': 'column', 'align-items': 'stretch' } },
          field: { base: { flex: '1 1 0', ...PAD('12px', '18px'), color: 'var(--sw-muted)', 'font-size': '15px' } },
          price: { base: { 'font-family': 'var(--font-heading)', 'font-size': '28px', 'margin-bottom': '4px' } },
          specs: { base: { color: 'var(--sw-muted)', 'font-size': '14px', 'margin-bottom': '0' } }
        } });
        const homes = [['$1,250,000', '4 bd · 3 ba · 2,400 sqft', 'Hillside, Oakland', 81], ['$845,000', '3 bd · 2 ba · 1,650 sqft', 'Mission, San Francisco', 82], ['$2,100,000', '5 bd · 4 ba · 3,900 sqft', 'Mill Valley', 83]];
        const tree = [nav('Haven', ['Buy', 'Sell', 'Neighbourhoods'], 'Talk to an agent'),
          sec([D('center', [Tx('Bay Area homes', 'eyebrow'), H('h1', 'Find a place that feels like yours.', 'display')]), Img(art(80, col, { kind: 'house' }), 'Illustrated modern house at sunset', 'hero-img'), D('search', [Tx('📍 Neighbourhood or city', 'field'), Tx('🏠 Any type', 'field'), Tx('$ Any price', 'field'), Btn('Search homes')])], 'section'),
          sec([Tx('Featured listings', 'eyebrow'), H('h2', 'New this week', 'h-sec'), D('grid-3', homes.map(([p, s, a, seed]) => D('card', [Img(art(seed, col, { kind: 'house' }), `Home in ${a}`), D('card-body', [H('h3', p, 'price'), Tx(a, 'card-title'), Pp(s, 'specs')])], 'a')))]),
          sec([D('split', [D('half', [Img(art(84, col), 'Neighbourhood map artwork', 'img-r')]), D('half', [Tx('Neighbourhood guides', 'eyebrow'), H('h2', 'Know the street before you know the house.', 'h-sec'), Pp('Schools, commute times, cafés and the best sunset spots — written by agents who live there.', 'lead'), Btn('Explore guides', 'btn-ghost')])])]),
          cta('Selling? Get a free valuation.', 'A local agent will call you within one working day.', 'Request valuation'),
          footer('© 2026 Haven Realty · DRE #01234567', ['Instagram', 'Contact', 'Fair housing'])];
        return make(this, { body: 'DM Sans', heading: 'DM Serif Display' }, [['brand', 'Copper', '#B8732F'], ['ink', 'Charcoal', '#1C1C1C'], ['paper', 'White', '#FFFFFF'], ['muted', 'Grey', '#6B6B6B'], ['soft', 'Sand', '#F5F1EB'], ['line', 'Line', '#E8E2D8']], k, [{ name: 'Home', tree }]);
      }
    },
    {
      id: 'atelier', name: 'Atelier', category: 'Retail & Shop', desc: 'Bold product-first storefront with grid and campaign banner.', pages: 1,
      build() {
        const col = ['#E9E5DF', '#111111', '#FF5A36', '#CFC8BE'];
        const k = kit({ headWeight: '700', displaySize: '132px', displayTrack: '-0.06em', displayMax: '10ch', radius: '0px', btnRadius: '0px', btnInk: '#FFFFFF', extra: {
          'hero-a': { base: { ...PAD('80px', '24px', '40px') } },
          banner: { base: { 'background-color': 'var(--sw-brand)', color: '#FFFFFF', ...PAD('14px', '24px'), 'text-align': 'center', 'font-weight': '600', 'font-size': '14px', 'letter-spacing': '0.04em' } },
          'p-card': { base: { display: 'block', 'text-decoration': 'none' } },
          'p-img': { base: { width: '100%', 'aspect-ratio': '3 / 4', 'object-fit': 'cover', 'background-color': 'var(--sw-soft)', 'margin-bottom': '14px', transition: 'transform .5s cubic-bezier(.16,1,.3,1)' }, 'base:hover': { transform: 'scale(1.02)' } },
          'p-row': { base: { display: 'flex', 'justify-content': 'space-between', 'font-weight': '600' } },
          campaign: { base: { display: 'flex', 'align-items': 'flex-end', 'min-height': '520px', ...PAD('48px', '48px'), 'background-image': `url("${art(95, ['#FF5A36', '#111111', '#FFB199', '#FF8A66'])}")`, 'background-size': 'cover', 'background-position': 'center', color: '#FFFFFF' }, landscape: { 'min-height': '380px', ...PAD('28px', '24px') } },
          'campaign-t': { base: { 'font-family': 'var(--font-heading)', 'font-size': '88px', 'line-height': '0.9', 'letter-spacing': '-0.05em', 'max-width': '10ch', 'margin-bottom': '0' }, landscape: { 'font-size': '52px' } }
        } });
        const products = [['Everyday Tote', '$68', 91], ['Field Jacket', '$240', 92], ['Merino Crew', '$120', 93], ['Canvas Cap', '$38', 94]];
        const tree = [Tx('Free shipping over $100 · Carbon-neutral delivery', 'banner'), nav('ATELIER', ['Shop', 'Journal', 'Stores'], 'Bag (0)'),
          N('section', { cls: 'hero-a' }, [N('container', {}, [H('h1', 'Made to be worn out.', 'display'), Pp('Durable everyday pieces, cut in small batches and repaired for free — forever.', 'lead'), Btn('Shop the collection')])]),
          sec([D('grid-4', products.map(([t, p, s]) => D('p-card', [Img(art(s, col, { kind: 'product' }), `${t} product photo`, 'p-img'), D('p-row', [Tx(t), Tx(p)])], 'a')))]),
          sec([D('campaign', [H('h2', 'Autumn repair week', 'campaign-t')])]),
          footer('© 2026 Atelier Goods', ['Shipping', 'Returns', 'Instagram'])];
        return make(this, { body: 'Inter', heading: 'Syne' }, [['brand', 'Signal', '#FF5A36'], ['ink', 'Black', '#111111'], ['paper', 'Bone', '#F3F1EE'], ['muted', 'Ash', '#6F6A63'], ['soft', 'Stone', '#E9E5DF'], ['line', 'Line', '#DAD4CB']], k, [{ name: 'Home', tree }]);
      }
    }
  ];

  const byId = (id) => TEMPLATES.find((t) => t.id === id);
  /** Colour variation: swap the swatch values, keep everything else. */
  function recolor(p, variant) { if (variant && variant.swatches) p.swatches.forEach((s) => { if (variant.swatches[s.id]) s.value = variant.swatches[s.id]; }); return p; }
  function create(id, name, variantIdx) {
    const t = byId(id); if (!t) return null; const p = t.build();
    if (variantIdx && t.variants && t.variants[variantIdx]) recolor(p, t.variants[variantIdx]);
    if (name) { p.name = name; p.slug = L.slug(name); } return p;
  }
  /** Live preview HTML (home page) for thumbnails. */
  function previewHTML(id, variantIdx) { const p = create(id, null, variantIdx); return L.pageDoc(p, p.pages[0], { extraHead: '<style>html,body{overflow:hidden}</style>' }); }
  const meta = ({ id, name, category, desc, pages, variants }) => ({ id, name, category, desc, pages, variants: (variants || []).map((v) => ({ name: v.name, dots: v.dots })) });
  /** Add templates at runtime (compose.js registers the spec-built library). */
  function register(t) { if (!byId(t.id)) { TEMPLATES.push(t); API.list.push(meta(t)); } }

  function setVariants(id, v) { const t = byId(id); if (!t) return; t.variants = v; const m = API.list.find((x) => x.id === id); if (m) m.variants = meta(t).variants; }
  const swatchesOf = (id) => { const t = byId(id); return t ? t.build().swatches : []; };

  const API = { _byId: byId, list: TEMPLATES.map(meta), create, previewHTML, register, setVariants, swatchesOf, recolor, art, kit, make, PAD, T, build: { nav, sec, H, Pp, Tx, Btn, Img, D, footer, cta } };
  window.LoomTemplates = API;
})();
