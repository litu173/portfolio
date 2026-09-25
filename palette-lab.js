/* PALETTE LAB — temporary colour explorer.
   Floating "Palette" button (bottom-left). Try accent colours site-wide from brand presets, modern
   palettes, colour harmonies, tonal steps or raw OKLCH sliders (with optional vivid Display-P3).
   Turn it off in the CMS: Site settings → "Show palette lab". When off, no widget and no overrides.
   The design system can import the chosen colour and make it permanent. */
(() => {
  'use strict';
  const KEY = 'mh-palette-lab';
  const doc = document.documentElement;

  /* ---------- colour math: sRGB ⇄ HSL ⇄ OKLCH ---------- */
  const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function hexToOklch(hex) {
    const [r, g, b] = hexToRgb(hex).map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
  }
  function oklchToRgbLin(L, C, H) {
    const h = (H * Math.PI) / 180, A = C * Math.cos(h), B = C * Math.sin(h);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
  /** OKLCH → sRGB hex, reducing chroma until it fits the sRGB gamut. Returns [hex, clamped]. */
  function oklchToHex(L, C, H) {
    let c = C, rgb = oklchToRgbLin(L, c, H), clamped = false;
    while (!inGamut(rgb) && c > 0) { c -= 0.002; rgb = oklchToRgbLin(L, c, H); clamped = true; }
    return [rgbToHex(...rgb.map((v) => toGam(Math.max(0, Math.min(1, v))) * 255)), clamped];
  }
  const oklchStr = (L, C, H) => `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
  const lum = (hex) => { const c = hexToRgb(hex).map(toLin); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  function fit(h, s, l, bg, min, dir) { let L = l, hex = hslToHex(h, s, L); for (let i = 0; i < 100 && contrast(hex, bg) < min; i++) { L += dir; hex = hslToHex(h, s, Math.max(2, Math.min(98, L))); } return hex; }

  /** Build full dark + light token sets from one accent colour. */
  function generate(accent, opts = {}) {
    const [h, s0, l0] = rgbToHsl(...hexToRgb(accent));
    const s = Math.max(s0, 8);
    const tint = !!opts.tint, warm = opts.warmPaper !== false;
    const dark = {}, light = {};
    const dh = tint ? h : 153, lh = tint && !warm ? h : 43;
    dark.bg = tint ? hslToHex(dh, 18, 5) : '#0B100E';
    dark['bg-2'] = tint ? hslToHex(dh, 17, 8) : '#111916';
    dark['bg-3'] = tint ? hslToHex(dh, 15, 11.5) : '#17221D';
    const dLine = tint ? hslToHex(dh, 40, 86) : '#C8EBD7';
    dark.line = rgba(dLine, 0.13); dark['line-2'] = rgba(dLine, 0.24);
    dark.text = tint ? hslToHex(dh, 18, 93) : '#E9F1EC';
    dark['text-2'] = tint ? hslToHex(dh, 12, 68) : '#A3B8AC';
    dark['text-3'] = tint ? hslToHex(dh, 9, 54) : '#7C9186';
    light.bg = tint && !warm ? hslToHex(lh, 25, 95) : '#F5F2EA';
    light['bg-2'] = tint && !warm ? hslToHex(lh, 20, 90) : '#ECE8DC';
    light['bg-3'] = tint && !warm ? hslToHex(lh, 18, 85) : '#E2DDCD';
    const lLine = tint ? hslToHex(h, 45, 14) : '#14321F';
    light.line = rgba(lLine, 0.14); light['line-2'] = rgba(lLine, 0.26);
    light.surface = rgba(lLine, 0.035); light['surface-2'] = rgba(lLine, 0.07);
    light.text = tint ? hslToHex(h, 35, 9) : '#0F1F18';
    light['text-2'] = tint ? hslToHex(h, 14, 29) : '#3F5449';
    light['text-3'] = tint ? hslToHex(h, 10, 39) : '#5B6F64';
    dark.accent = fit(h, s, Math.max(l0, 45), dark.bg, 6.5, +1);
    dark['accent-2'] = hslToHex(h, Math.min(s, 70), Math.min(92, rgbToHsl(...hexToRgb(dark.accent))[2] + 16));
    dark['accent-ink'] = dark.bg;
    dark['accent-deep'] = hslToHex(h, Math.min(s, 60) * 0.7, 30);
    light.accent = fit(h, Math.min(s, 80), Math.min(l0, 40), light.bg, 5.5, -1);
    light['accent-2'] = hslToHex(h, Math.min(s, 80), Math.min(60, rgbToHsl(...hexToRgb(light.accent))[2] + 8));
    light['accent-ink'] = light.bg;
    light['accent-deep'] = hslToHex(h, Math.min(s, 60) * 0.6, 87);
    dark.glow = `0 0 80px -24px ${dark.accent}`;
    light.glow = `0 0 80px -30px ${rgba(light.accent, 0.6)}`;
    return { dark, light };
  }
  /** Vivid Display-P3 variant: same lightness/hue, chroma pushed beyond sRGB (browser maps to the screen). */
  const vividOf = (hex) => { const [L, C, H] = hexToOklch(hex); return oklchStr(L, Math.min(0.37, C * 1.35 + 0.02), H); };

  const toCSS = (vars) => Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  function apply(state) {
    let el = document.getElementById('mh-palette');
    if (!state || !state.hex) { el && el.remove(); doc.dataset.palette = 'off'; try { localStorage.removeItem('mh-palette-css'); } catch (e) {} return; }
    const t = generate(state.hex, state);
    if (!el) { el = document.createElement('style'); el.id = 'mh-palette'; document.head.appendChild(el); }
    const base = ':root[data-vision="default"]:not([data-contrast="high"])';
    let css = `${base}[data-theme="dark"] {\n${toCSS(t.dark)}\n}\n${base}[data-theme="light"] {\n${toCSS(t.light)}\n}`;
    if (state.vivid) css += `\n@media (color-gamut: p3) {\n  ${base}[data-theme="dark"] { --accent: ${vividOf(t.dark.accent)}; --accent-2: ${vividOf(t.dark['accent-2'])}; }\n  ${base}[data-theme="light"] { --accent: ${vividOf(t.light.accent)}; }\n}`;
    el.textContent = css;
    try { localStorage.setItem('mh-palette-css', css); } catch (e) {} // applied in <head> on the next page → no colour flash
    doc.dataset.palette = state.hex + (state.tint ? '-t' : '') + (state.vivid ? '-p3' : '');
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = getComputedStyle(doc).getPropertyValue('--bg').trim();
  }
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = (s) => { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} };

  window.MHPalette = { generate, contrast, hexToRgb, rgbToHex, rgbToHsl, hslToHex, hexToOklch, oklchToHex, oklchStr, read, apply, KEY };

  if (document.body.dataset.noPalette != null) return; // design-system.html imports it manually
  const content = (window.MH && window.MH.content) || window.SITE_CONTENT || {};
  if (content.site && content.site.paletteLab === false) { apply(null); return; } // switched off in the CMS
  apply(read());

  /* ---------- palettes ---------- */
  const BRAND = [['Sage', '#7FCFA5'], ['Emerald', '#34D399'], ['Jade', '#5CC8A0'], ['Teal', '#4FD1C5'], ['Ocean', '#6FB3FF'], ['Indigo', '#8C9EFF'], ['Violet', '#B39DFF'], ['Rose', '#FF8FB1'], ['Coral', '#FF9A7A'], ['Amber', '#F2C46D'], ['Gold', '#D4B26A'], ['Lime', '#C5E86C'], ['Moss', '#A3C47A'], ['Pearl', '#D9D4C7']];
  const MODERN = [
    ['Mocha Mousse', '#A47864', 'Pantone 2025'], ['Peach Fuzz', '#FFBE98', 'Pantone 2024'], ['Viva Magenta', '#BB2649', 'Pantone 2023'], ['Very Peri', '#6667AB', 'Pantone 2022'],
    ['Digital Lavender', '#B8A9E8', 'Trend'], ['Neo Mint', '#A8E6CF', 'Trend'], ['Cyber Lime', '#D4F55B', 'Trend'], ['Aurora Teal', '#5EEAD4', 'Trend'],
    ['Electric Cobalt', '#3B6CFF', 'Tech'], ['Ultraviolet', '#8B5CF6', 'Tech'], ['Signal Orange', '#FF6B35', 'Tech'], ['Solar Yellow', '#FFD23F', 'Tech'],
    ['Terracotta', '#D2694A', 'Earth'], ['Sandstone', '#D8C3A5', 'Earth'], ['Olive Grove', '#9BA86A', 'Earth'], ['Clay Rose', '#C98B8B', 'Earth'],
    ['Glacier', '#9ED8F0', 'Calm'], ['Rosewater', '#F3B5C0', 'Calm'], ['Seafoam', '#8FD9C4', 'Calm'], ['Lilac Mist', '#C9B6E4', 'Calm'],
    ['Deep Emerald', '#0E9F6E', 'Luxe'], ['Champagne', '#E8D3A2', 'Luxe'], ['Bordeaux', '#9E2A4B', 'Luxe'], ['Sapphire', '#2F5BD3', 'Luxe']
  ];
  const HARMONY = [['Base', 0], ['Analogous −30°', -30], ['Analogous +30°', 30], ['Complement', 180], ['Split 150°', 150], ['Split 210°', 210], ['Triadic 120°', 120], ['Triadic 240°', 240], ['Square 90°', 90], ['Square 270°', 270]];

  /* ---------- widget ---------- */
  const css = `
  .pl-fab{position:fixed;left:16px;bottom:16px;z-index:260;display:flex;align-items:center;gap:8px;height:44px;padding:0 16px 0 10px;border-radius:999px;border:1px solid var(--line-2);background:color-mix(in srgb,var(--bg-2) 90%,transparent);backdrop-filter:blur(14px);color:var(--text);font:600 13px var(--f-body);box-shadow:0 20px 40px -20px rgba(0,0,0,.5)}
  .pl-fab i{width:22px;height:22px;border-radius:50%;background:conic-gradient(#7FCFA5,#6FB3FF,#B39DFF,#FF8FB1,#F2C46D,#7FCFA5)}
  .pl{position:fixed;left:16px;bottom:70px;z-index:260;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 100px);overflow:auto;overscroll-behavior:contain;padding:18px;border-radius:20px;border:1px solid var(--line-2);background:color-mix(in srgb,var(--bg-2) 96%,transparent);backdrop-filter:blur(20px);color:var(--text);font:14px/1.45 var(--f-body);box-shadow:0 40px 80px -30px rgba(0,0,0,.6)}
  .pl[hidden]{display:none}
  .pl h2{font:600 16px var(--f-display);margin:0 0 2px}.pl p{margin:0 0 12px;color:var(--text-2);font-size:12px}
  .pl__tabs{display:flex;gap:4px;padding:3px;border:1px solid var(--line);border-radius:999px;margin-bottom:12px}
  .pl__tabs button{flex:1;height:30px;border-radius:999px;border:0;background:none;color:var(--text-2);font:500 12px var(--f-body)}
  .pl__tabs button[aria-selected=true]{background:var(--accent);color:var(--accent-ink);font-weight:600}
  .pl__sw{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:12px}
  .pl__sw--named{grid-template-columns:repeat(4,1fr)}
  .pl__sw label{position:relative;display:grid;gap:4px;justify-items:center;font-size:10px;color:var(--text-2);text-align:center;line-height:1.2}
  .pl__sw input{position:absolute;opacity:0;pointer-events:none}
  .pl__sw span.c{display:block;width:100%;aspect-ratio:1;border-radius:50%;border:2px solid transparent;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2);transition:transform .2s}
  .pl__sw label:hover span.c{transform:scale(1.08)}
  .pl__sw input:checked+span.c{border-color:var(--text)}
  .pl__sw input:focus-visible+span.c{outline:3px solid var(--focus);outline-offset:2px}
  .pl__tones{display:flex;gap:4px;margin:0 0 12px}.pl__tones button{flex:1;height:28px;border-radius:6px;border:2px solid transparent}
  .pl__tones button[aria-pressed=true]{border-color:var(--text)}
  .pl__lbl{font:500 10px var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-2);margin:4px 0 6px}
  .pl__row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .pl__row input[type=color]{width:44px;height:36px;border:1px solid var(--line-2);border-radius:10px;background:none;padding:2px}
  .pl__row input[type=text]{flex:1;min-width:0;height:36px;border-radius:10px;border:1px solid var(--line-2);background:var(--bg);color:var(--text);padding:0 10px;font:12px var(--f-mono)}
  .pl__sl{display:grid;grid-template-columns:18px 1fr 52px;gap:8px;align-items:center;margin-bottom:8px;font:12px var(--f-mono);color:var(--text-2)}
  .pl__sl input{width:100%;height:14px;-webkit-appearance:none;appearance:none;border-radius:999px;border:1px solid var(--line-2)}
  .pl__sl input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #000;box-shadow:0 1px 4px rgba(0,0,0,.4)}
  .pl__read{font:12px var(--f-mono);color:var(--text-2);margin-bottom:10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
  .pl__chk{display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:8px}
  .pl__cr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
  .pl__cr div{padding:10px;border-radius:12px;border:1px solid var(--line)}
  .pl__cr b{display:block;font:600 16px var(--f-display)}.pl__cr small{color:var(--text-2);font-size:11px}
  .pl__btns{display:flex;flex-wrap:wrap;gap:6px}
  .pl__btns button,.pl__btns a{display:inline-flex;align-items:center;height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line-2);background:none;color:var(--text);font:500 12px var(--f-body);text-decoration:none}
  .pl__btns button:hover,.pl__btns a:hover{border-color:var(--accent)}
  .pl__btns .pri{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:600}
  .pl__btns button[disabled]{opacity:.5}
  .pl__msg{font-size:12px;color:var(--text-2)}
  @media print{.pl,.pl-fab{display:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  let state = Object.assign({ hex: '', tint: false, warmPaper: true, vivid: false, tab: 'brand' }, read() || {});
  const cur = () => state.hex || '#7FCFA5';

  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'pl-fab'; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'palette-lab');
  fab.innerHTML = '<i aria-hidden="true"></i>Palette';
  const panel = document.createElement('div');
  panel.id = 'palette-lab'; panel.className = 'pl'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Palette lab — try accent colours');
  document.body.append(fab, panel);

  const sw = (name, hex, sub) => `<label title="${name}${sub ? ' · ' + sub : ''} ${hex}"><input type="radio" name="pl-sw" value="${hex}" aria-label="${name} ${hex}" ${hex.toUpperCase() === cur().toUpperCase() ? 'checked' : ''}><span class="c" style="background:${hex}"></span>${sub !== undefined ? `<span>${name}</span>` : ''}</label>`;
  function tabBody() {
    const [L, C, H] = hexToOklch(cur());
    if (state.tab === 'brand') return `<div class="pl__sw">${BRAND.map(([n, c]) => sw(n, c)).join('')}</div>`;
    if (state.tab === 'modern') return `<div class="pl__sw pl__sw--named">${MODERN.map(([n, c, g]) => sw(n, c, g)).join('')}</div>`;
    if (state.tab === 'harmony') return `<p>Colours that work with your current base, calculated in OKLCH so they look equally bright.</p><div class="pl__sw pl__sw--named">${HARMONY.map(([n, d]) => sw(n, oklchToHex(L, C, (H + d + 360) % 360)[0], '')).join('')}</div>`;
    const [hex, clamped] = oklchToHex(L, C, H);
    const grad = (fn) => `linear-gradient(90deg, ${Array.from({ length: 9 }, (_, i) => fn(i / 8)).join(',')})`;
    return `<p>Perceptual colour space: equal steps look equally different. Values outside sRGB are pulled back in (or shown vividly on P3 screens).</p>
      <div class="pl__sl"><span>L</span><input type="range" min="0.3" max="0.95" step="0.005" value="${L.toFixed(3)}" data-ok="L" aria-label="Lightness" style="background:${grad((t) => oklchToHex(0.3 + t * 0.65, C, H)[0])}"><span>${(L * 100).toFixed(0)}%</span></div>
      <div class="pl__sl"><span>C</span><input type="range" min="0" max="0.32" step="0.002" value="${C.toFixed(3)}" data-ok="C" aria-label="Chroma" style="background:${grad((t) => oklchToHex(L, t * 0.32, H)[0])}"><span>${C.toFixed(3)}</span></div>
      <div class="pl__sl"><span>H</span><input type="range" min="0" max="360" step="1" value="${H.toFixed(0)}" data-ok="H" aria-label="Hue" style="background:${grad((t) => oklchToHex(L, Math.min(C, 0.14), t * 360)[0])}"><span>${H.toFixed(0)}°</span></div>
      <div class="pl__read"><span>${oklchStr(L, C, H)}</span><span>${hex}${clamped ? ' · clamped to sRGB' : ' · in sRGB'}</span></div>`;
  }
  function render() {
    const hex = cur(), [L, C, H] = hexToOklch(hex);
    const tones = [0.45, 0.55, 0.65, 0.72, 0.8, 0.87, 0.93].map((l) => oklchToHex(l, Math.min(C, 0.2), H)[0]);
    const t = generate(hex, state);
    const rate = (c) => (c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : 'Fails AA');
    const cd = contrast(t.dark.accent, t.dark.bg), cl = contrast(t.light.accent, t.light.bg);
    const p3 = matchMedia('(color-gamut: p3)').matches;
    panel.innerHTML = `
      <h2>Palette lab</h2><p>Temporary: try accent colours across the whole site. Contrast is auto-corrected for both themes.</p>
      <div class="pl__tabs" role="tablist" aria-label="Palette source">${[['brand', 'Brand'], ['modern', 'Modern'], ['harmony', 'Harmony'], ['oklch', 'OKLCH']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${l}</button>`).join('')}</div>
      <div role="tabpanel">${tabBody()}</div>
      <p class="pl__lbl">Tones of this hue</p>
      <div class="pl__tones">${tones.map((c) => `<button type="button" data-hex="${c}" style="background:${c}" aria-label="Tone ${c}" aria-pressed="${c === hex.toUpperCase()}"></button>`).join('')}</div>
      <div class="pl__row"><input type="color" data-pl="pick" value="${hex}" aria-label="Custom accent colour"><input type="text" data-pl="hex" value="${state.hex}" aria-label="Hex or oklch() value" placeholder="#7FCFA5 or oklch(78% 0.11 158)" spellcheck="false"></div>
      <label class="pl__chk"><input type="checkbox" data-pl="tint" ${state.tint ? 'checked' : ''}> Tint backgrounds &amp; neutrals to this hue</label>
      <label class="pl__chk"><input type="checkbox" data-pl="warm" ${state.warmPaper !== false ? 'checked' : ''}> Keep warm paper in light theme</label>
      <label class="pl__chk"><input type="checkbox" data-pl="vivid" ${state.vivid ? 'checked' : ''}> Vivid Display-P3 accent ${p3 ? '<small style="color:var(--text-2)">(your screen supports P3)</small>' : '<small style="color:var(--text-2)">(no effect on this screen)</small>'}</label>
      <div class="pl__cr" aria-live="polite"><div><small>Dark theme accent</small><b style="color:${t.dark.accent}">${t.dark.accent}</b><small>${cd.toFixed(1)}:1 · ${rate(cd)}</small></div><div><small>Light theme accent</small><b>${t.light.accent}</b><small>${cl.toFixed(1)}:1 · ${rate(cl)}</small></div></div>
      <div class="pl__btns">
        <button type="button" data-pl="theme">Flip theme</button>
        <button type="button" data-pl="copy">Copy tokens</button>
        <button type="button" data-pl="reset">Reset to default</button>
        <button type="button" class="pri" data-pl="save">Save to site ✓</button>
        <a href="design-system.html?import=palette">Fine-tune in design system →</a>
      </div>
      <p class="pl__msg" data-pl="msg" role="status" style="margin:10px 0 0"></p>
      <div>
      </div>`;
  }
  const commit = (rerender = true) => { write(state.hex ? state : null); apply(state.hex ? state : null); if (rerender) { const f = document.activeElement && document.activeElement.dataset; const key = f && (f.ok || f.tab || f.pl); render(); if (key) (panel.querySelector(`[data-ok="${key}"],[data-tab="${key}"],[data-pl="${key}"]`) || fab).focus(); } };
  const setHex = (h) => { state.hex = h.toUpperCase(); commit(); };

  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pl-sw') setHex(t.value);
    else if (t.dataset.pl === 'tint') { state.tint = t.checked; commit(); }
    else if (t.dataset.pl === 'warm') { state.warmPaper = t.checked; commit(); }
    else if (t.dataset.pl === 'vivid') { state.vivid = t.checked; commit(); }
  });
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pl === 'pick') { state.hex = t.value.toUpperCase(); commit(false); panel.querySelector('[data-pl="hex"]').value = state.hex; }
    if (t.dataset.pl === 'hex') {
      const v = t.value.trim(); let hex = null;
      if (/^#?[0-9a-f]{6}$/i.test(v)) hex = v[0] === '#' ? v : '#' + v;
      const m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
      if (m) hex = oklchToHex(m[2] ? +m[1] / 100 : +m[1], +m[3], +m[4])[0];
      if (hex) { state.hex = hex.toUpperCase(); commit(false); }
    }
    if (t.dataset.ok) {
      const [L, C, H] = hexToOklch(cur()); const v = { L, C, H }; v[t.dataset.ok] = +t.value;
      state.hex = oklchToHex(v.L, v.C, v.H)[0]; write(state); apply(state);
      clearTimeout(panel._t); panel._t = setTimeout(() => commit(), 250);
    }
  });
  panel.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; write(state.hex ? state : null); render(); panel.querySelector(`[data-tab="${state.tab}"]`).focus(); return; }
    const tone = e.target.closest('[data-hex]'); if (tone) { setHex(tone.dataset.hex); return; }
    const b = e.target.closest('button[data-pl]'); if (!b) return;
    if (b.dataset.pl === 'reset') { state = { hex: '', tint: false, warmPaper: true, vivid: false, tab: state.tab }; write(null); apply(null); render(); }
    if (b.dataset.pl === 'theme') { const btn = document.querySelector('[data-action="theme"]'); btn ? btn.click() : (doc.dataset.theme = doc.dataset.theme === 'dark' ? 'light' : 'dark'); setTimeout(() => apply(state.hex ? state : null), 50); }
    if (b.dataset.pl === 'save') { saveToSite(b); return; }
    if (b.dataset.pl === 'copy') {
      const t = generate(cur(), state);
      const txt = `:root {\n${toCSS(t.dark)}\n}\n:root[data-theme="light"] {\n${toCSS(t.light)}\n}`;
      navigator.clipboard.writeText(txt).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => (b.textContent = 'Copy tokens'), 1500); });
    }
  });
  /** Bake the chosen colour into tokens.css so the site, CMS and design system all use it permanently. */
  async function saveToSite(btn) {
    const msg = panel.querySelector('[data-pl="msg"]');
    if (!state.hex) { msg.textContent = 'Pick a colour first.'; return; }
    if (!window.MHSave) { msg.textContent = 'save.js is missing on this page.'; return; }
    btn.disabled = true; msg.textContent = 'Saving…';
    try {
      const r = await MHSave.saveBrandColour(state.hex, state);
      const next = r.css, g = { dark: r.dark };
      if (!r.ok) {
        if (r.via === 'none') {
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([next], { type: 'text/css' })); a.download = 'tokens.css'; document.body.append(a); a.click(); a.remove();
          msg.textContent = 'Downloaded tokens.css — replace the file in your Portfolio folder. Tip: run “python3 server.py” to save directly.';
        } else msg.textContent = 'Save failed: ' + r.error;
        btn.disabled = false; return;
      }
      // Saved: the colour now lives in tokens.css, so drop the temporary override and reload
      const tab = state.tab; state = { hex: '', tint: false, warmPaper: true, vivid: false, tab }; write(null); apply(null);
      msg.textContent = `Saved ✓ ${g.dark.accent} is now your brand colour everywhere. Reloading…`;
      setTimeout(() => location.reload(), 900);
    } catch (e) { msg.textContent = 'Save failed: ' + e.message; btn.disabled = false; }
  }

  const toggle = (open) => { panel.hidden = !open; fab.setAttribute('aria-expanded', String(open)); if (open) { render(); (panel.querySelector('[aria-selected="true"]') || panel).focus(); } };
  fab.addEventListener('click', () => toggle(panel.hidden));
  // Let the wheel scroll the panel, not the page behind it (Lenis)
  panel.setAttribute('data-lenis-prevent', '');
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); fab.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) toggle(false); });
})();
