/* Design system editor.
   Source of truth = tokens.css (loaded by every page). This page reads the live token values,
   lets you edit them by clicking tokens/components, previews instantly, and writes tokens.css back
   (File System Access API — Chrome/Edge) or downloads it. It also exports DESIGN-SYSTEM.md. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const doc = document.documentElement;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = window.MHPalette;

  /* ------------------------------------------------------------ TOKEN MODEL */
  const T = [
    // colour (themed)
    { k: 'bg', g: 'color', l: 'Background', d: 'Page background. Everything sits on this.', themed: true },
    { k: 'bg-2', g: 'color', l: 'Background 2', d: 'Alternate section and panel background.', themed: true },
    { k: 'bg-3', g: 'color', l: 'Background 3', d: 'Deepest inset — image wells, generative covers.', themed: true },
    { k: 'surface', g: 'color', l: 'Surface', d: 'Card fill (translucent).', themed: true },
    { k: 'surface-2', g: 'color', l: 'Surface 2', d: 'Hover / pressed fill, metric chips.', themed: true },
    { k: 'line', g: 'color', l: 'Line', d: 'Hairline borders and dividers.', themed: true },
    { k: 'line-2', g: 'color', l: 'Line 2', d: 'Stronger borders — buttons, outlines.', themed: true },
    { k: 'text', g: 'color', l: 'Text', d: 'Primary text. Must be ≥ 7:1 on Background.', themed: true, cr: true },
    { k: 'text-2', g: 'color', l: 'Text 2', d: 'Secondary text. Must be ≥ 4.5:1 on Background.', themed: true, cr: true },
    { k: 'text-3', g: 'color', l: 'Text 3', d: 'Tertiary labels and metadata (large/mono only).', themed: true, cr: true },
    { k: 'accent', g: 'color', l: 'Accent', d: 'Brand colour: primary buttons, highlights, italic accents, particles.', themed: true, cr: true },
    { k: 'accent-2', g: 'color', l: 'Accent 2', d: 'Brighter accent for hover and glow.', themed: true },
    { k: 'accent-ink', g: 'color', l: 'Accent ink', d: 'Text placed on an accent fill.', themed: true },
    { k: 'accent-deep', g: 'color', l: 'Accent deep', d: 'Deep tint — portrait duotone, subtle fills.', themed: true },
    { k: 'warm', g: 'color', l: 'Warm spark', d: 'A rare warm highlight (confidential dot, “coming soon”).', themed: true },
    { k: 'focus', g: 'color', l: 'Focus ring', d: 'Keyboard focus outline. Must contrast with every surface.', themed: true },
    { k: 'grain-opacity', g: 'color', l: 'Grain opacity', d: 'Film-grain overlay strength (0–0.1).', themed: true, type: 'number', min: 0, max: 0.12, step: 0.005 },
    // type
    { k: 'f-display', g: 'type', l: 'Display font', d: 'Headlines, numbers, buttons.', type: 'font', fonts: ['Inter Tight', 'Space Grotesk', 'Manrope', 'Sora', 'Plus Jakarta Sans', 'DM Sans', 'Syne', 'Outfit', 'Unbounded', 'Archivo', 'Bricolage Grotesque'] },
    { k: 'f-serif', g: 'type', l: 'Accent serif', d: 'Italic accent words and pull quotes.', type: 'font', fonts: ['Instrument Serif', 'Fraunces', 'Playfair Display', 'DM Serif Display', 'Cormorant Garamond', 'Libre Caslon Text', 'Newsreader'] },
    { k: 'f-body', g: 'type', l: 'Body font', d: 'Paragraphs and UI text.', type: 'font', fonts: ['Inter', 'DM Sans', 'Manrope', 'Source Sans 3', 'IBM Plex Sans', 'Atkinson Hyperlegible', 'Figtree'] },
    { k: 'f-mono', g: 'type', l: 'Mono font', d: 'Eyebrows, labels, metadata.', type: 'font', fonts: ['JetBrains Mono', 'IBM Plex Mono', 'Space Mono', 'DM Mono', 'Fira Code'] },
    { k: 'fw-display', g: 'type', l: 'Display weight', d: 'Weight of all display type.', type: 'select', options: ['400', '500', '600', '700', '800'] },
    { k: 'fs-h1', g: 'type', l: 'H1 size', d: 'Fluid clamp(min, preferred, max).', type: 'text' },
    { k: 'fs-h2', g: 'type', l: 'H2 size', d: 'Section headings.', type: 'text' },
    { k: 'fs-h3', g: 'type', l: 'H3 size', d: 'Sub-headings.', type: 'text' },
    { k: 'fs-lead', g: 'type', l: 'Lead size', d: 'Intro paragraphs.', type: 'text' },
    { k: 'fs-body', g: 'type', l: 'Body size', d: 'Base paragraph size.', type: 'text' },
    // space
    { k: 'gutter', g: 'space', l: 'Page gutter', d: 'Left/right page padding.', type: 'text' },
    { k: 'gap', g: 'space', l: 'Grid gap', d: 'Gap between cards and columns.', type: 'text' },
    { k: 'section', g: 'space', l: 'Section spacing', d: 'Vertical padding of major sections.', type: 'text' },
    { k: 'nav-h', g: 'space', l: 'Nav height', d: 'Fixed header height.', type: 'px', min: 56, max: 110 },
    // shape
    { k: 'r-chip', g: 'shape', l: 'Radius — chip', d: 'Tags and small labels.', type: 'px', min: 0, max: 24 },
    { k: 'r-img', g: 'shape', l: 'Radius — image', d: 'Content images and galleries.', type: 'px', min: 0, max: 40 },
    { k: 'r-card', g: 'shape', l: 'Radius — card', d: 'Pillar, service, process cards.', type: 'px', min: 0, max: 48 },
    { k: 'r-card-lg', g: 'shape', l: 'Radius — large card', d: 'Work cards and case covers.', type: 'px', min: 0, max: 64 },
    { k: 'r-btn', g: 'shape', l: 'Radius — button', d: '999px = pill.', type: 'px', min: 0, max: 999 },
    { k: 'btn-h', g: 'shape', l: 'Button height', d: 'Default button height (sm = 0.79×, lg = 1.21×). Keep ≥ 44px.', type: 'px', min: 40, max: 72 },
    // motion
    { k: 'ease-out', g: 'motion', l: 'Ease out', d: 'Primary easing for reveals.', type: 'select', options: ['cubic-bezier(.16, 1, .3, 1)', 'cubic-bezier(.22, 1, .36, 1)', 'cubic-bezier(.33, 1, .68, 1)', 'ease-out'] },
    { k: 'ease-io', g: 'motion', l: 'Ease in-out', d: 'Curtains and page transitions.', type: 'select', options: ['cubic-bezier(.76, 0, .24, 1)', 'cubic-bezier(.65, 0, .35, 1)', 'ease-in-out'] },
    { k: 't-micro', g: 'motion', l: 'Duration — micro', d: 'Hover colour changes.', type: 'text' },
    { k: 't-ui', g: 'motion', l: 'Duration — UI', d: 'Panels, toggles.', type: 'text' },
    { k: 't-reveal', g: 'motion', l: 'Duration — reveal', d: 'Scroll reveals.', type: 'text' }
  ];
  const TK = Object.fromEntries(T.map((t) => [t.k, t]));
  const GROUPS = { color: 'Colour', type: 'Typography', space: 'Space & layout', shape: 'Shape', motion: 'Motion' };
  const DEFAULT_FONTS = ['Inter Tight', 'Inter', 'Instrument Serif', 'JetBrains Mono'];

  /* ------------------------------------------------------------ COMPONENTS */
  const ARROW = '<svg class="btn__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 8v9H8"/></svg>';
  const btn = (cls, text, arrow = true) => `<a class="btn ${cls}" href="#"><span class="btn__label"><span class="btn__text" data-text="${text}">${text}</span></span>${arrow ? ARROW : ''}</a>`;
  const C = [
    { id: 'button', name: 'Button', group: 'Actions', desc: 'Pill button with a rolling label and rotating arrow on hover. Primary = accent fill; ghost = outline. Sizes: sm, default, lg.',
      tokens: ['btn-h', 'r-btn', 'accent', 'accent-ink', 'text', 'line-2', 'f-display', 'fw-display'],
      html: `<div class="ds-row">${btn('btn--primary', 'See the work')}${btn('btn--ghost', 'View my CV')}${btn('btn--primary btn--sm', 'Small', false)}${btn('btn--ghost btn--lg', 'Large')}</div>`,
      a11y: ['Min target 44×44px (btn-h ≥ 44).', 'Label text stays readable; the rolled duplicate is hidden from screen readers.', 'Icon-only buttons need aria-label.'],
      dos: ['One primary per view.', 'Verb-first labels: “See the work”.'], donts: ['Don’t use accent fill for destructive actions.', 'Don’t shrink below 44px.'] },
    { id: 'icon-button', name: 'Icon button', group: 'Actions', desc: 'Round 44px button for tools (theme, accessibility, listen). Pressed/expanded state fills with accent.',
      tokens: ['line', 'accent', 'accent-ink', 'text'],
      html: `<div class="ds-row"><button class="icon-btn" type="button" aria-label="Theme"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/></svg></button><button class="icon-btn" type="button" aria-pressed="true" aria-label="Listen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg></button></div>`,
      a11y: ['Always set aria-label.', 'Use aria-pressed / aria-expanded for state.'], dos: ['1.6px strokes, round caps.'], donts: ['Don’t mix filled and outline icon styles.'] },
    { id: 'chip', name: 'Status chip', group: 'Labels', desc: 'Rounded status with a pulsing accent dot (availability).',
      tokens: ['line', 'surface', 'text-2', 'accent'],
      html: `<p class="chip"><i class="chip__dot" aria-hidden="true"></i><span>Available for new projects — Q4 2026</span></p>`,
      a11y: ['Pulse stops when motion is reduced.'], dos: ['Keep to one short sentence.'], donts: ['Don’t use more than one per screen.'] },
    { id: 'tag', name: 'Tag', group: 'Labels', desc: 'Mono uppercase capability/skill label.',
      tokens: ['r-chip', 'line', 'text-2', 'f-mono'],
      html: `<div class="ds-row"><span class="tag">UX research</span><span class="tag">Design systems</span><span class="tag">WCAG 2.2</span></div>`,
      a11y: ['Group in a list with an aria-label.'], dos: ['2–4 words max.'], donts: ['Don’t make tags clickable without a button role.'] },
    { id: 'metric-chip', name: 'Metric chip', group: 'Labels', desc: 'A compact result: bold value + label. Used on work cards and case heroes.',
      tokens: ['surface-2', 'text', 'text-2', 'f-display'],
      html: `<ul class="wcard__metrics"><li class="metric-chip"><b>−45%</b>upload errors</li><li class="metric-chip"><b>+25%</b>query success</li></ul>`,
      a11y: ['Direction is in the sign (−/+), never colour alone.'], dos: ['Real numbers only.'], donts: ['No more than 3 per card.'] },
    { id: 'eyebrow', name: 'Eyebrow', group: 'Typography', desc: 'Mono section index above headings, with a leading rule. Decodes (scrambles) on reveal.',
      tokens: ['f-mono', 'text-2'],
      html: `<p class="eyebrow mono">04 — What I do</p>`,
      a11y: ['Scramble keeps the real text in aria-label.'], dos: ['Format: “NN — Label”.'], donts: ['Don’t use as the only heading.'] },
    { id: 'headings', name: 'Headings & accents', group: 'Typography', desc: 'Huge tight display type with an italic serif accent word (em).',
      tokens: ['f-display', 'fw-display', 'fs-h1', 'fs-h2', 'fs-h3', 'f-serif', 'accent', 'fs-lead', 'text-2'],
      html: `<h2 class="h1">Selected <em>work</em></h2><h2 class="h2" style="margin-top:24px">Three ways to <em>untangle</em> your product.</h2><h3 class="h3" style="margin-top:24px">Self-taught. Ethical. Collaborative.</h3><p class="lead" style="margin-top:16px">Research, strategy, UX/UI and AI prototyping — under one roof.</p>`,
      a11y: ['One h1 per page; keep heading order.', 'Split-text keeps a screen-reader copy.'], dos: ['One accent word per heading.'], donts: ['Don’t accent more than two words.', 'No all-caps headlines.'] },
    { id: 'pillar', name: 'Pillar card', group: 'Cards', desc: 'Large card with outlined index number, serif promise, tag cloud and outcome. 3D tilt + cursor light on hover.',
      tokens: ['r-card', 'surface', 'line', 'line-2', 'accent', 'f-serif'],
      html: `<div class="pillar" data-tilt><span class="pillar__num" aria-hidden="true">02</span><h3 class="pillar__title">Design</h3><p class="pillar__promise">Interfaces people understand instantly.</p><ul class="pillar__caps"><li class="tag">UX &amp; UI</li><li class="tag">Design systems</li><li class="tag">WCAG 2.2</li></ul><p class="pillar__outcome"><span>Fewer errors. Faster tasks.</span><span aria-hidden="true">↗</span></p></div>`,
      a11y: ['Focusable in horizontal mode; arrow keys move between cards.'], dos: ['Exactly three in a row.'], donts: ['Don’t exceed ~8 tags.'] },
    { id: 'service', name: 'Service card', group: 'Cards', desc: 'Offer card: index, duration tag, title, description, “best for”, and an enquiry link. Lifts + glows on hover.',
      tokens: ['r-card', 'surface', 'line', 'accent', 'text-2', 'text-3'],
      html: `<div class="service"><div class="service__top"><span class="mono" style="color:var(--accent)">01</span><span class="tag">1–2 weeks</span></div><h3 class="service__title">UX &amp; Accessibility Audit</h3><p class="service__desc">Heuristic review, WCAG 2.2 check and usability tests — delivered as a prioritised fix list.</p><p class="service__best"><b>Best for</b>Live products losing users</p><a class="service__link" href="#">Ask about this</a></div>`,
      a11y: ['Link text includes the service name for screen readers.'], dos: ['Lead with the outcome.'], donts: ['No prices on cards.'] },
    { id: 'work-card', name: 'Work card', group: 'Cards', desc: 'Case-study card: media left, meta/title/serif subtitle/summary/metrics right. Stacks and dims while scrolling.',
      tokens: ['r-card-lg', 'bg-2', 'bg-3', 'line', 'accent', 'f-display'],
      html: `<div class="wcard"><a class="wcard__link" href="#"><div class="wcard__media"><div class="gen" style="--gx:60%;--gy:30%" aria-hidden="true"><span class="gen__label mono">Cefalo — Confidential</span><span class="gen__metric">−40%<small>context switching</small></span><span class="gen__word">TellusR</span></div></div><div class="wcard__body"><p class="wcard__meta mono"><span>Enterprise &amp; AI</span><span>2025</span></p><h3 class="wcard__title">TellusR</h3><p class="wcard__sub">Unifying an enterprise LLM platform</p><p class="wcard__sum">Consolidated multiple admin systems into one calm workspace.</p><ul class="wcard__metrics"><li class="metric-chip"><b>−40%</b>context switching</li></ul><p class="wcard__cta"><span>See the results</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></p></div></a></div>`,
      a11y: ['Whole card is one link; cover images need alt text.'], dos: ['Use generative cover for NDA work.'], donts: ['Don’t nest links inside.'] },
    { id: 'stat', name: 'Stat', group: 'Data', desc: 'Huge counting number with accent affixes and a short label.',
      tokens: ['f-display', 'fw-display', 'accent', 'line', 'text-2'],
      html: `<ul class="stats__grid" style="grid-template-columns:repeat(3,1fr);padding:0"><li class="stat"><p class="stat__num"><span class="affix"></span><span>10</span><span class="affix">+</span></p><p class="stat__label">Years designing digital products</p></li><li class="stat"><p class="stat__num"><span class="affix">−</span><span>45</span><span class="affix">%</span></p><p class="stat__label">Upload errors on Sensa Unity</p></li><li class="stat"><p class="stat__num"><span class="affix"></span><span>1</span><span class="affix">M+</span></p><p class="stat__label">People using products I’ve shaped</p></li></ul>`,
      a11y: ['Final value is exposed to screen readers; animation is visual only.'], dos: ['Tabular numerals.'], donts: ['Never invent numbers.'] },
    { id: 'metrics', name: 'Metrics block', group: 'Data', desc: 'Case-study results: very large accent values with explanations.',
      tokens: ['accent', 'line-2', 'text-2', 'fw-display'],
      html: `<ul class="metrics"><li class="metric"><b>−45%</b><span>Upload errors with a new validation &amp; preview system</span></li><li class="metric"><b>+20%</b><span>Adoption of advanced features</span></li></ul>`,
      a11y: ['Each metric keeps its label in the same list item.'], dos: ['State the cause in the label.'], donts: ['Max 4 per block.'] },
    { id: 'chapter', name: 'Timeline chapter', group: 'Data', desc: 'Story step with year, role, org and a serif one-liner; ring marker on a woven thread.',
      tokens: ['accent', 'text-2', 'f-mono', 'f-serif'],
      html: `<ol class="hscroll__track story__track" style="padding:0"><li class="chapter"><p class="chapter__year">2018–25</p><h3 class="chapter__title">UI/UX Designer</h3><p class="chapter__org">Samsung R&amp;D Institute Bangladesh</p><p class="chapter__line">Samsung Health iOS — used by millions.</p></li><li class="chapter"><p class="chapter__year">Now</p><h3 class="chapter__title">Independent Consultant</h3><p class="chapter__org">Your team?</p><p class="chapter__line">Making tech effortless.</p></li></ol>`,
      a11y: ['Ordered list; horizontal scroll has visible prev/next buttons.'], dos: ['One line per chapter.'], donts: ['Don’t exceed ~10 chapters.'] },
    { id: 'process', name: 'Process steps', group: 'Content', desc: 'Auto-numbered cards for methods and pain-point → solution steps.',
      tokens: ['r-card', 'surface', 'line', 'accent', 'text-2'],
      html: `<ol class="process"><li><h3>Empathize</h3><p>Interviews revealed a communication gap.</p></li><li><h3>Define</h3><p>Persona, journey map and user flow.</p></li><li><h3>Ideate</h3><p>Mind maps and storyboards.</p></li></ol>`,
      a11y: ['Numbers come from an ordered list.'], dos: ['3–5 steps.'], donts: ['Don’t write paragraphs in steps.'] },
    { id: 'quote', name: 'Pull quote', group: 'Content', desc: 'Large italic serif quote with accent marks and mono attribution.',
      tokens: ['f-serif', 'accent', 'text-2'],
      html: `<div class="blk-quote" style="padding:0"><blockquote><p>The hardest part was each form’s layout.</p><cite>— Hours of iteration with tax experts</cite></blockquote></div>`,
      a11y: ['Use blockquote + cite.'], dos: ['Under 25 words.'], donts: ['Don’t fake testimonials.'] },
    { id: 'callout', name: 'Callout', group: 'Content', desc: 'Dashed note with a warm spark — NDAs, notes, asides.',
      tokens: ['line-2', 'surface', 'warm'],
      html: `<p class="callout">Screens are under NDA. Happy to walk through the process on a call.</p>`,
      a11y: ['Plain paragraph — no role needed.'], dos: ['One per page section.'], donts: ['Don’t use for errors.'] },
    { id: 'two-column', name: 'Two-column list', group: 'Content', desc: 'Side-by-side bullet lists (Problems | Solutions).',
      tokens: ['line', 'accent', 'f-display'],
      html: `<div class="blk-two" style="padding:0"><div><h3>Problems</h3><ul><li>Manual counts invite errors</li><li>Physical voting is chaotic</li></ul></div><div><h3>Solution</h3><ul><li>Automatic, accurate counting</li><li>Vote from anywhere</li></ul></div></div>`,
      a11y: ['Each column has its own heading.'], dos: ['Parallel items left/right.'], donts: ['Don’t exceed 6 items per side.'] },
    { id: 'segmented', name: 'Segmented control', group: 'Forms', desc: 'Radio group styled as a pill switcher (settings panel).',
      tokens: ['line', 'accent', 'accent-ink', 'surface-2', 'focus'],
      html: `<fieldset class="seg" style="max-width:360px"><legend>Theme</legend><label><input type="radio" name="ds-seg" checked><span>Auto</span></label><label><input type="radio" name="ds-seg"><span>Light</span></label><label><input type="radio" name="ds-seg"><span>Dark</span></label></fieldset>`,
      a11y: ['Native radios — arrow keys work.', 'Focus ring on the visible pill.'], dos: ['2–5 options.'], donts: ['Don’t use for actions.'] },
    { id: 'toggle', name: 'Toggle switch', group: 'Forms', desc: 'Checkbox styled as a switch.',
      tokens: ['surface-2', 'line-2', 'accent', 'accent-ink', 'focus'],
      html: `<div class="toggles" style="max-width:320px"><label class="toggle"><input type="checkbox" checked><span class="toggle__ui" aria-hidden="true"></span><span>High contrast</span></label><label class="toggle"><input type="checkbox"><span class="toggle__ui" aria-hidden="true"></span><span>Underline all links</span></label></div>`,
      a11y: ['Native checkbox; label is clickable.'], dos: ['Immediate effect, no save.'], donts: ['Don’t use for multi-state.'] },
    { id: 'marquee', name: 'Marquee', group: 'Motion', desc: 'Infinite ribbon alternating grotesk and italic serif, speed follows scroll velocity. Pausable.',
      tokens: ['f-display', 'f-serif', 'accent', 'line', 'text-2'],
      html: `<div class="marquee"><div class="marquee__track"><span class="marquee__item">Design thinking<span class="marquee__star">✳</span></span><span class="marquee__item">Service design<span class="marquee__star">✳</span></span><span class="marquee__item">UX research<span class="marquee__star">✳</span></span></div></div>`,
      a11y: ['Duplicate content is aria-hidden; a real list exists for screen readers.', 'Pause control (WCAG 2.2.2).'], dos: ['Short phrases.'], donts: ['Never the only place content appears.'] }
  ];

  /* ------------------------------------------------------------ STATE */
  let vals = { dark: {}, light: {}, shared: {} };
  let saved = null;
  const hist = { s: [], i: -1 };
  let selected = null;

  function readTokens() {
    const out = { dark: {}, light: {}, shared: {} };
    const was = doc.dataset.theme;
    ['dark', 'light'].forEach((th) => {
      doc.dataset.theme = th; const cs = getComputedStyle(doc);
      T.filter((t) => t.themed).forEach((t) => (out[th][t.k] = cs.getPropertyValue('--' + t.k).trim()));
    });
    doc.dataset.theme = 'dark'; const cs = getComputedStyle(doc);
    T.filter((t) => !t.themed).forEach((t) => (out.shared[t.k] = cs.getPropertyValue('--' + t.k).trim()));
    doc.dataset.theme = was;
    return out;
  }
  const fontName = (v) => (String(v).match(/"([^"]+)"|'([^']+)'|^([^,]+)/) || []).slice(1).find(Boolean)?.trim();
  function fontImports() {
    const fams = ['f-display', 'f-serif', 'f-body', 'f-mono'].map((k) => fontName(vals.shared[k])).filter((f) => f && !DEFAULT_FONTS.includes(f));
    if (!fams.length) return '';
    return `@import url("https://fonts.googleapis.com/css2?${[...new Set(fams)].map((f) => `family=${f.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&')}&display=swap");\n`;
  }
  function toCSS() {
    const line = (k, v) => `  --${k}: ${v};`;
    const g = (grp) => T.filter((t) => t.g === grp && !t.themed).map((t) => line(t.k, vals.shared[t.k])).join('\n');
    const col = (th) => T.filter((t) => t.themed).map((t) => line(t.k, vals[th][t.k])).join('\n');
    return `${fontImports()}/* ==========================================================================
   DESIGN TOKENS — Mutaher Hossain design system
   Edited visually in design-system.html. Loaded before style.css on every page.
   Generated ${new Date().toISOString().slice(0, 10)}
   ========================================================================== */
:root {
  /* Colour — dark (default) */
${col('dark')}
  --glow: 0 0 80px -24px var(--accent);

  /* Typography */
${g('type')}

  /* Space & layout */
${g('space')}

  /* Shape */
${g('shape')}

  /* Motion */
${g('motion')}
  color-scheme: dark;
}
:root[data-theme="light"] {
  /* Colour — light */
${col('light')}
  --glow: 0 0 80px -30px color-mix(in srgb, var(--accent) 60%, transparent);
  color-scheme: light;
}
`;
  }
  function applyLive() {
    let st = $('#ds-live');
    if (!st) { st = document.createElement('style'); st.id = 'ds-live'; $('#tokens-link').after(st); }
    st.textContent = toCSS();
    $('#tokens-link').disabled = true;
    // Preview fonts that aren't loaded yet
    const imp = fontImports();
    if (imp) { const href = imp.match(/url\("([^"]+)"/)[1]; if (!$(`link[data-font-preview="${CSS.escape(href)}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.fontPreview = href; document.head.appendChild(l); } }
    const dirty = JSON.stringify(vals) !== saved;
    const s = $('[data-ds-status]'); s.classList.toggle('dirty', dirty);
    s.textContent = dirty ? 'Unsaved changes — press “Save to site” to update every page.' : 'Click any token or component to edit it — changes apply to every page once saved.';
    refreshSwatches();
  }
  function commit() {
    const snap = JSON.stringify(vals);
    if (hist.s[hist.i] === snap) return;
    hist.s = hist.s.slice(0, hist.i + 1); hist.s.push(snap); hist.i = hist.s.length - 1;
    try { localStorage.setItem('mh-ds-draft', snap); } catch (e) {}
  }
  let commitT;
  function set(scope, k, v) { vals[scope][k] = v; applyLive(); clearTimeout(commitT); commitT = setTimeout(commit, 300); }

  /* ------------------------------------------------------------ COLOUR HELPERS */
  function toHex(v) {
    v = String(v).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
    const m = v.match(/rgba?\(([^)]+)\)/); if (m) { const [r, g, b] = m[1].split(',').map((x) => parseFloat(x)); return P.rgbToHex(r, g, b); }
    return '#000000';
  }
  const alphaOf = (v) => { const m = String(v).match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/); return m ? +m[1] : 1; };
  const withAlpha = (hex, a) => { if (a >= 1) return hex.toUpperCase(); const [r, g, b] = P.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const ratio = (fg, bg) => P.contrast(toHex(fg), toHex(bg));

  /* ------------------------------------------------------------ RENDER */
  function renderNav() {
    const sec = [['intro', 'Overview'], ...Object.entries(GROUPS).map(([g, l]) => ['tok-' + g, l])];
    const comps = [...new Set(C.map((c) => c.group))];
    $('[data-ds-nav]').innerHTML = `<p>Foundations</p>${sec.map(([id, l]) => `<a href="#${id}">${l}</a>`).join('')}<p>Components</p>${comps.map((g) => `<a href="#cg-${g.toLowerCase()}">${g}</a>`).join('')}`;
  }
  function renderMain() {
    const m = $('[data-ds-main]');
    const colorSw = (t) => `<button class="ds-swatch" type="button" data-token="${t.k}"><span class="ds-swatch__c"><i data-sw="${t.k}"></i></span><span class="ds-swatch__m"><b>${esc(t.l)}</b><code>--${t.k}</code><code data-swv="${t.k}"></code></span></button>`;
    const tokenRow = (t, sample) => `<div class="ds-type-row" data-token="${t.k}" role="button" tabindex="0"><code>--${t.k}<br><span data-val="${t.k}"></span></code><div>${sample}</div></div>`;
    const comps = [...new Set(C.map((c) => c.group))];
    m.innerHTML = `
      <section id="intro" class="ds-intro">
        <p class="eyebrow mono">Mutaher Hossain — Design system v1</p>
        <h1>Complexity → <em>clarity.</em></h1>
        <p>The single source of truth for colours, type, space, shape, motion and components used across this portfolio. Click any token or component to edit it in the inspector. <b>Save to site</b> rewrites <code>tokens.css</code>, which every page loads — so a change here updates the whole site. Download the markdown to reuse the system in other projects.</p>
      </section>
      <section id="tok-color"><div class="ds-h"><h2>Colour</h2><p>Two themes; every text/background pair is contrast-checked. Colour-vision and high-contrast modes override the accent on top of these.</p></div>
        <div class="ds-grid">${T.filter((t) => t.g === 'color' && t.type !== 'number').map(colorSw).join('')}</div>
        <div style="margin-top:16px">${tokenRow(TK['grain-opacity'], '<span class="mono">Film grain strength</span>')}</div>
      </section>
      <section id="tok-type"><div class="ds-h"><h2>Typography</h2><p>A tight grotesk for display, an italic serif for accents, a neutral sans for reading, and mono for metadata.</p></div>
        ${tokenRow(TK['f-display'], '<span style="font:var(--fw-display) 56px/1 var(--f-display);letter-spacing:-.045em">Make it simple</span>')}
        ${tokenRow(TK['f-serif'], '<em style="font-size:52px;line-height:1">effortless.</em>')}
        ${tokenRow(TK['f-body'], '<p style="max-width:52ch">I untangle complex products and turn them into calm, obvious experiences that users love and businesses can measure.</p>')}
        ${tokenRow(TK['f-mono'], '<span class="mono">04 — What I do · 2025 · Enterprise &amp; AI</span>')}
        ${tokenRow(TK['fw-display'], '<span style="font:var(--fw-display) 40px var(--f-display)">Weight 400 500 600 700</span>')}
        ${tokenRow(TK['fs-h1'], '<span class="h1" style="display:block">H1</span>')}
        ${tokenRow(TK['fs-h2'], '<span class="h2" style="display:block">H2 heading</span>')}
        ${tokenRow(TK['fs-h3'], '<span class="h3" style="display:block">H3 sub-heading</span>')}
        ${tokenRow(TK['fs-lead'], '<p class="lead">Lead paragraph for introductions.</p>')}
        ${tokenRow(TK['fs-body'], '<p>Body copy — 1.6 line height, 60–75 characters per line.</p>')}
      </section>
      <section id="tok-space"><div class="ds-h"><h2>Space &amp; layout</h2><p>Fluid gutters and section rhythm. 12-column mental grid, max width 1680px.</p></div>
        ${['gutter', 'gap', 'section', 'nav-h'].map((k) => tokenRow(TK[k], `<i style="display:block;height:18px;width:var(--${k});background:var(--accent);opacity:.7;border-radius:4px"></i>`)).join('')}
      </section>
      <section id="tok-shape"><div class="ds-h"><h2>Shape</h2><p>Radii get larger as surfaces get larger. Buttons are pills.</p></div>
        <div class="ds-scale">${['r-chip', 'r-img', 'r-card', 'r-card-lg', 'r-btn'].map((k) => `<div data-token="${k}" role="button" tabindex="0"><i style="width:96px;height:72px;border-radius:var(--${k})"></i>--${k}<span data-val="${k}"></span></div>`).join('')}
          <div data-token="btn-h" role="button" tabindex="0"><i style="width:120px;height:var(--btn-h);border-radius:var(--r-btn)"></i>--btn-h<span data-val="btn-h"></span></div></div>
      </section>
      <section id="tok-motion"><div class="ds-h"><h2>Motion</h2><p>Slow in, confident out. Nothing bounces. Everything respects reduced-motion.</p></div>
        ${['ease-out', 'ease-io', 't-micro', 't-ui', 't-reveal'].map((k) => tokenRow(TK[k], `<span class="ds-motion" style="display:block;width:40px;height:40px;border-radius:50%;background:var(--accent)"></span>`)).join('')}
        <p class="ds-empty" style="margin-top:10px">Hover a row to preview the curve.</p>
      </section>
      ${comps.map((g) => `<section id="cg-${g.toLowerCase()}"><div class="ds-h"><h2>${g}</h2><p>Click a component to see its tokens, code and rules.</p></div>
        ${C.filter((c) => c.group === g).map((c) => `<div class="ds-spec" data-comp="${c.id}" tabindex="0" role="button" aria-label="Inspect ${esc(c.name)}"><span class="ds-spec__label">${esc(c.name)}</span><div class="ds-stage">${c.html}</div></div>`).join('')}
      </section>`).join('')}`;
    // Motion preview
    $$('#tok-motion .ds-type-row').forEach((r) => r.addEventListener('pointerenter', () => {
      const dot = $('.ds-motion', r), k = r.dataset.token;
      const ease = k.startsWith('ease') ? `var(--${k})` : 'var(--ease-out)', dur = k.startsWith('t-') ? `var(--${k})` : '1s';
      dot.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(320px)' }], { duration: parseFloat(getComputedStyle(doc).getPropertyValue(k.startsWith('t-') ? '--' + k : '--t-reveal')) * 1000 || 1000, easing: getComputedStyle(doc).getPropertyValue(k.startsWith('ease') ? '--' + k : '--ease-out').trim() || 'ease', fill: 'both', direction: 'alternate', iterations: 2 });
      void ease; void dur;
    }));
    refreshSwatches();
  }
  function refreshSwatches() {
    const th = doc.dataset.theme;
    $$('[data-sw]').forEach((i) => { const k = i.dataset.sw; i.style.background = vals[th][k]; });
    $$('[data-swv]').forEach((c) => { const k = c.dataset.swv; c.textContent = vals[th][k]; });
    $$('[data-val]').forEach((c) => { const k = c.dataset.val; c.textContent = vals.shared[k] ?? vals[th][k] ?? ''; });
  }

  /* ------------------------------------------------------------ INSPECTOR */
  function control(t) {
    const wrap = document.createElement('div'); wrap.className = 'ds-tok';
    const crInfo = (th) => {
      if (!t.cr) return '';
      const r = ratio(vals[th][t.k], vals[th].bg), min = t.k === 'text' ? 7 : t.k === 'text-3' ? 3 : 4.5;
      return `<span class="ds-cr ${r < min ? 'bad' : ''}">${r.toFixed(2)}:1 on bg ${r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : '✕'}</span>`;
    };
    const row = (scope, label) => {
      const v = vals[scope][t.k] ?? '';
      if (t.g === 'color' && t.type !== 'number') {
        return `<div class="ds-ctl"><span>${label}</span><div class="in"><input type="color" value="${toHex(v)}" data-scope="${scope}" data-k="${t.k}" data-kind="color" aria-label="${esc(t.l)} ${label}"><input type="text" value="${esc(v)}" data-scope="${scope}" data-k="${t.k}" data-kind="text" aria-label="${esc(t.l)} ${label} value" spellcheck="false"></div></div>${crInfo(scope)}`;
      }
      if (t.type === 'number' || t.type === 'px') {
        const n = parseFloat(v) || 0;
        return `<div class="ds-ctl"><span>${label}</span><div class="in"><input type="range" min="${t.min}" max="${t.max}" step="${t.step || 1}" value="${n}" data-scope="${scope}" data-k="${t.k}" data-kind="${t.type}" aria-label="${esc(t.l)}"><input type="text" value="${esc(v)}" data-scope="${scope}" data-k="${t.k}" data-kind="text" style="max-width:90px" aria-label="${esc(t.l)} value"></div></div>`;
      }
      if (t.type === 'font') {
        const cur = fontName(v);
        const opts = [...new Set([cur, ...t.fonts])].map((f) => `<option ${f === cur ? 'selected' : ''}>${esc(f)}</option>`).join('');
        return `<div class="ds-ctl"><span>${label}</span><div class="in"><select data-scope="${scope}" data-k="${t.k}" data-kind="font" aria-label="${esc(t.l)}">${opts}</select></div></div><div class="ds-ctl"><span>stack</span><div class="in"><input type="text" value="${esc(v)}" data-scope="${scope}" data-k="${t.k}" data-kind="text" aria-label="${esc(t.l)} full stack"></div></div>`;
      }
      if (t.type === 'select') {
        const opts = [...new Set([v, ...t.options])].map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
        return `<div class="ds-ctl"><span>${label}</span><div class="in"><select data-scope="${scope}" data-k="${t.k}" data-kind="text" aria-label="${esc(t.l)}">${opts}</select></div></div>`;
      }
      return `<div class="ds-ctl"><span>${label}</span><div class="in"><input type="text" value="${esc(v)}" data-scope="${scope}" data-k="${t.k}" data-kind="text" aria-label="${esc(t.l)}" spellcheck="false"></div></div>`;
    };
    wrap.innerHTML = `<div class="ds-tok__h"><b>${esc(t.l)}</b><code>--${t.k}</code></div><span class="ds-desc" style="margin:0">${esc(t.d)}</span>${t.themed ? row('dark', 'dark') + row('light', 'light') : row('shared', 'value')}`;
    return wrap;
  }
  function inspectToken(k) {
    const t = TK[k]; selected = { token: k };
    const used = C.filter((c) => c.tokens.includes(k)).map((c) => `<li><a href="#" data-goto="${c.id}">${esc(c.name)}</a></li>`).join('');
    const ins = $('[data-ds-insp]'); ins.innerHTML = `<p class="eyebrow mono">Token · ${GROUPS[t.g]}</p><h3>${esc(t.l)}</h3><p class="ds-desc">${esc(t.d)}</p>`;
    ins.append(control(t));
    ins.insertAdjacentHTML('beforeend', `<h4>Used by</h4>${used ? `<ul class="ds-list">${used}</ul>` : '<p class="ds-empty">Global — used throughout style.css.</p>'}<h4>CSS</h4><code class="ds-code">var(--${k})</code>`);
    markSel();
  }
  function inspectComp(id) {
    const c = C.find((x) => x.id === id); selected = { comp: id };
    const ins = $('[data-ds-insp]');
    ins.innerHTML = `<p class="eyebrow mono">Component · ${esc(c.group)}</p><h3>${esc(c.name)}</h3><p class="ds-desc">${esc(c.desc)}</p><h4>Tokens</h4>`;
    c.tokens.forEach((k) => ins.append(control(TK[k])));
    ins.insertAdjacentHTML('beforeend', `
      <h4>Accessibility</h4><ul class="ds-list">${c.a11y.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>Do</h4><ul class="ds-list">${c.dos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>Don't</h4><ul class="ds-list">${c.donts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>HTML</h4><code class="ds-code">${esc(pretty(c.html))}</code>
      <div class="ds-row" style="margin-top:10px"><button class="btn btn--ghost btn--sm" type="button" data-copy="${c.id}"><span class="btn__label"><span class="btn__text" data-text="Copy HTML">Copy HTML</span></span></button></div>`);
    markSel();
  }
  const pretty = (h) => h.replace(/></g, '>\n<');
  function markSel() {
    $$('.ds-spec').forEach((s) => s.classList.toggle('is-sel', !!selected && s.dataset.comp === selected.comp));
  }
  function inspectEmpty() {
    $('[data-ds-insp]').innerHTML = `<p class="eyebrow mono">Inspector</p><h3>Select something</h3><p class="ds-desc">Click a colour swatch, a type row, a radius, or any component on the left. Edits preview instantly across this page; <b>Save to site</b> writes them to <code>tokens.css</code> so every page updates.</p>
      <h4>Tips</h4><ul class="ds-list"><li>Colour tokens have separate dark and light values.</li><li>Contrast ratios update live — red means it fails WCAG.</li><li>“Import palette lab” pulls the colour you picked on the site.</li><li>“Edit copy” lets you type into the specimens (not saved).</li></ul>`;
  }

  /* ------------------------------------------------------------ EVENTS */
  document.addEventListener('input', (e) => {
    const el = e.target; if (!el.dataset.k) return;
    const { scope, k, kind } = el.dataset; let v = el.value;
    if (kind === 'color') { v = withAlpha(el.value, alphaOf(vals[scope][k])); const txt = el.parentElement.querySelector('[data-kind="text"]'); if (txt) txt.value = v; }
    if (kind === 'px') { v = el.value + 'px'; const txt = el.parentElement.querySelector('[data-kind="text"]'); if (txt) txt.value = v; }
    if (kind === 'number') { v = el.value; const txt = el.parentElement.querySelector('[data-kind="text"]'); if (txt) txt.value = v; }
    if (kind === 'font') { const fb = { 'f-display': '"Inter", system-ui, sans-serif', 'f-serif': '"Times New Roman", serif', 'f-body': 'system-ui, -apple-system, "Segoe UI", sans-serif', 'f-mono': 'ui-monospace, "SF Mono", Menlo, monospace' }[k]; v = `"${el.value}", ${fb}`; const txt = el.closest('.ds-tok').querySelectorAll('[data-kind="text"]')[0]; if (txt) txt.value = v; }
    if (kind === 'text') {
      const col = el.parentElement.querySelector('[data-kind="color"]'); if (col) col.value = toHex(v);
      const rng = el.parentElement.querySelector('input[type="range"]'); if (rng) rng.value = parseFloat(v) || 0;
    }
    set(scope, k, v);
    // refresh contrast readouts without rebuilding the inspector (keeps focus)
    $$('.ds-tok').forEach((w) => { const cr = $$('.ds-cr', w); if (!cr.length) return; });
  });
  document.addEventListener('change', (e) => { if (e.target.dataset.k && selected) setTimeout(() => (selected.token ? inspectToken(selected.token) : inspectComp(selected.comp)), 0); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.ds-stage a'); if (a) e.preventDefault();
    const tok = e.target.closest('[data-token]'); if (tok) { inspectToken(tok.dataset.token); return; }
    const go = e.target.closest('[data-goto]'); if (go) { e.preventDefault(); inspectComp(go.dataset.goto); $(`.ds-spec[data-comp="${go.dataset.goto}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const cp = e.target.closest('[data-copy]'); if (cp) { navigator.clipboard.writeText(pretty(C.find((c) => c.id === cp.dataset.copy).html)).then(() => toast('HTML copied')); return; }
    const spec = e.target.closest('.ds-spec'); if (spec && !document.body.classList.contains('editing')) { inspectComp(spec.dataset.comp); return; }
    const b = e.target.closest('[data-ds]'); if (!b) return;
    const cmd = b.dataset.ds;
    if (cmd === 'theme') { doc.dataset.theme = doc.dataset.theme === 'dark' ? 'light' : 'dark'; refreshSwatches(); if (selected) selected.token ? inspectToken(selected.token) : inspectComp(selected.comp); }
    if (cmd === 'edit') { const on = document.body.classList.toggle('editing'); b.setAttribute('aria-pressed', String(on)); $$('.ds-stage').forEach((s) => $$('h2,h3,p,span,b,li,cite', s).forEach((n) => (on ? n.setAttribute('contenteditable', 'true') : n.removeAttribute('contenteditable')))); toast(on ? 'Type into any specimen (not saved)' : 'Copy editing off'); }
    if (cmd === 'undo' || cmd === 'redo') { commit(); const ni = hist.i + (cmd === 'undo' ? -1 : 1); if (ni >= 0 && ni < hist.s.length) { hist.i = ni; vals = JSON.parse(hist.s[ni]); applyLive(); selected ? (selected.token ? inspectToken(selected.token) : inspectComp(selected.comp)) : inspectEmpty(); } }
    if (cmd === 'reset') { if (confirm('Revert all unsaved changes to the saved tokens.css?')) { vals = JSON.parse(saved); commit(); applyLive(); inspectEmpty(); } }
    if (cmd === 'palette') importPalette();
    if (cmd === 'css') download('tokens.css', toCSS(), 'text/css');
    if (cmd === 'md') download('DESIGN-SYSTEM.md', toMD(), 'text/markdown');
    if (cmd === 'save') save();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-token][role="button"], .ds-spec')) { e.preventDefault(); e.target.click(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  addEventListener('beforeunload', (e) => { if (JSON.stringify(vals) !== saved) { e.preventDefault(); e.returnValue = ''; } });

  function importPalette() {
    const st = P.read();
    if (!st || !st.hex) { toast('No palette chosen yet — open the site and use the Palette button'); return; }
    const g = P.generate(st.hex, st);
    ['dark', 'light'].forEach((th) => Object.entries(g[th]).forEach(([k, v]) => { if (TK[k]) vals[th][k] = v; }));
    commit(); applyLive(); inspectToken('accent'); toast(`Imported ${st.hex}${st.tint ? ' (tinted neutrals)' : ''}`);
  }

  function toast(msg) { const t = $('.ds-toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); }

  /* ------------------------------------------------------------ SAVE (File System Access) */
  const idb = (mode, fn) => new Promise((res, rej) => { const r = indexedDB.open('mh-cms', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
  async function save() {
    commit();
    const css = toCSS();
    if (window.MHSave) {
      const r = await MHSave.save('tokens.css', css);
      if (r.ok) { saved = JSON.stringify(vals); applyLive(); try { localStorage.removeItem('mh-ds-draft'); } catch (e) {} toast('Saved ✓ — every page (site, CMS, design system) now uses the new tokens'); return; }
      if (r.via !== 'none') { toast('Save failed: ' + r.error); return; }
      download('tokens.css', css, 'text/css'); toast('Downloaded tokens.css — run “python3 server.py” to save directly next time'); return;
    }
    if (!window.showDirectoryPicker) { download('tokens.css', css, 'text/css'); toast('Downloaded — replace tokens.css in your Portfolio folder'); return; }
    try {
      let dir = null; try { dir = await idb('readonly', (s) => s.get('dir')); } catch (e) {}
      if (dir && (await dir.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') dir = null;
      if (!dir) { dir = await window.showDirectoryPicker({ id: 'mh-portfolio', mode: 'readwrite' }); await idb('readwrite', (s) => s.put(dir, 'dir')); }
      try { await dir.getFileHandle('style.css'); } catch (e) { if (!confirm(`“${dir.name}” doesn't look like the Portfolio folder (no style.css). Save anyway?`)) return; }
      const fh = await dir.getFileHandle('tokens.css', { create: true }); const w = await fh.createWritable(); await w.write(css); await w.close();
      saved = JSON.stringify(vals); applyLive(); try { localStorage.removeItem('mh-ds-draft'); } catch (e) {}
      toast('Saved ✓ — every page now uses the new tokens');
    } catch (e) { if (e.name !== 'AbortError') { console.error(e); toast('Save failed: ' + e.message); } }
  }

  /* ------------------------------------------------------------ MARKDOWN EXPORT */
  function toMD() {
    const d = new Date().toISOString().slice(0, 10);
    const colorRows = T.filter((t) => t.g === 'color').map((t) => {
      const cr = (th) => (t.cr ? ` (${ratio(vals[th][t.k], vals[th].bg).toFixed(1)}:1)` : '');
      return `| \`--${t.k}\` | ${t.l} | \`${vals.dark[t.k]}\`${cr('dark')} | \`${vals.light[t.k]}\`${cr('light')} | ${t.d} |`;
    }).join('\n');
    const shared = (g) => T.filter((t) => t.g === g).map((t) => `| \`--${t.k}\` | ${t.l} | \`${vals.shared[t.k]}\` | ${t.d} |`).join('\n');
    const comps = C.map((c) => `### ${c.name}
*${c.group}* — ${c.desc}

**Tokens:** ${c.tokens.map((k) => `\`--${k}\``).join(', ')}

**Accessibility**
${c.a11y.map((x) => `- ${x}`).join('\n')}

**Do:** ${c.dos.join(' ')}
**Don't:** ${c.donts.join(' ')}

\`\`\`html
${pretty(c.html)}
\`\`\`
`).join('\n');
    return `# Mutaher Hossain — Design System
Version 1.0 · exported ${d}

> **Complexity → clarity.** A premium, calm, accessible system: huge tight display type, an italic serif accent, soothing accent colour on deep neutrals, film grain, and motion that organises rather than decorates.

---

## 1. Principles
1. **Clarity over cleverness** — every effect must make the content easier to understand.
2. **One accent** — a single brand colour carries emphasis; neutrals do the rest.
3. **Big type, quiet UI** — display type is the hero; controls stay small and consistent.
4. **Motion with meaning** — slow in, confident out, nothing bounces; everything honours reduced motion.
5. **Accessible by default** — WCAG 2.2 AA minimum, AAA for body text; keyboard-first; colour-vision modes.

## 2. Voice
Short sentences. Outcomes and real numbers. Warm, confident, never boastful. Say "you" and "your users". Avoid "passionate", "pixel-perfect", "world-class", lorem ipsum.

## 3. Colour
Two themes. Dark is default (\`:root\`), light is \`:root[data-theme="light"]\`. Ratios are against \`--bg\`.

| Token | Name | Dark | Light | Use |
|---|---|---|---|---|
${colorRows}

**Colour-vision modes** (\`html[data-vision]\`) remap the accent: \`protan\` → blue, \`deutan\` → blue-violet, \`tritan\` → coral, \`mono\` → greyscale + underlines. \`html[data-contrast="high"]\` switches to pure black/white with a yellow accent. Never communicate with hue alone.

## 4. Typography
| Token | Name | Value | Use |
|---|---|---|---|
${shared('type')}

- Display: tracking −0.045 to −0.06em, line-height 0.86–0.92. Headlines in sentence case.
- One italic serif **accent word** per heading, wrapped in \`<em>\`.
- Labels: mono, uppercase, +0.08em tracking.
- Body: 1.6 line-height, 60–75 characters per line.

## 5. Space & layout
| Token | Name | Value | Use |
|---|---|---|---|
${shared('space')}

12-column mental grid · max content width 1680px · generous section rhythm.

## 6. Shape
| Token | Name | Value | Use |
|---|---|---|---|
${shared('shape')}

Elevation comes from **light, not shadow**: 1px \`--line\` borders, surface fills, and a soft accent glow on hover.

## 7. Motion
| Token | Name | Value | Use |
|---|---|---|---|
${shared('motion')}

Signature moves: masked word reveals (yPercent 110 → 0, stagger 0.045s), scramble-decode on mono labels, image curtain (clip-path inset + scale 1.18 → 1), stacking cards, velocity-skewed marquees, magnetic buttons, circular theme reveal. Libraries: GSAP + ScrollTrigger + Lenis (smooth scroll). \`prefers-reduced-motion\` → no smooth scroll, no pinning, no particles.

## 8. Components
${comps}

## 9. Accessibility checklist
- [ ] Text contrast AA everywhere (AAA for body) in both themes and all vision modes
- [ ] Visible 3px focus ring (\`--focus\`) on every interactive element
- [ ] Targets ≥ 44px; keyboard reachable; no traps; Esc closes overlays
- [ ] Auto-moving content can be paused; reduced motion respected
- [ ] Split/animated text keeps an accessible copy; decorative layers \`aria-hidden\`
- [ ] Every informative image has alt text

## 10. Using this system in another project
1. Copy **tokens.css** (below) into the new project and load it before your stylesheet.
2. Load the fonts: Google Fonts \`${['f-display', 'f-serif', 'f-body', 'f-mono'].map((k) => fontName(vals.shared[k])).join(', ')}\`.
3. Reference tokens only — \`var(--accent)\`, \`var(--r-card)\` — never hard-coded values.
4. Swap brand colour by changing \`--accent\`, \`--accent-2\`, \`--accent-deep\` in both themes; check contrast.

\`\`\`css
${toCSS()}\`\`\`
`;
  }

  /* ------------------------------------------------------------ BOOT */
  const init = () => {
    vals = readTokens(); saved = JSON.stringify(vals);
    try { const d = localStorage.getItem('mh-ds-draft'); if (d && d !== saved && confirm('Restore your unsaved design-system changes?')) vals = JSON.parse(d); } catch (e) {}
    commit();
    renderNav(); renderMain(); inspectEmpty(); applyLive();
    if (new URLSearchParams(location.search).get('import') === 'palette') importPalette();
  };
  document.fonts && document.fonts.ready ? document.fonts.ready.then(init) : init();
})();
