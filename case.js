/* Case study renderer — turns a project's `blocks` (from content.js) into the page.
   Block types: text, bullets, two-column, image, gallery, slider, before-after,
   metrics, quote, process, video, embed, callout, divider. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Allow-list sanitiser for CMS rich text. */
  const ALLOWED = { P: [], STRONG: [], B: [], EM: [], I: [], U: [], A: ['href'], UL: [], OL: [], LI: [], BR: [], H3: [], BLOCKQUOTE: [], CODE: [] };
  function sanitize(html) {
    const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const clean = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1 || !ALLOWED[n.tagName]) { n.replaceWith(...(n.nodeType === 1 ? [...n.childNodes] : [])); return clean(node); }
        [...n.attributes].forEach((a) => { if (!ALLOWED[n.tagName].includes(a.name)) n.removeAttribute(a.name); });
        if (n.tagName === 'A') {
          const h = n.getAttribute('href') || '';
          if (!/^(https?:|mailto:|#|\/|[\w.-]+\.html)/i.test(h)) n.removeAttribute('href');
          if (/^https?:/i.test(h)) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
        }
        clean(n);
      });
    };
    const root = d.body.firstChild; clean(root);
    return root.innerHTML;
  }

  const img = (im, cls = '', lazy = true) => im && im.src
    ? (/\.svg$/i.test(im.src)
      ? `<img class="${cls}" src="${esc(im.src)}" alt="${esc(im.alt || '')}" ${lazy ? 'loading="lazy"' : ''}>`
      : `<img class="${cls}" src="${esc(im.src)}" alt="${esc(im.alt || '')}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`)
    : '';
  const head = (b) => (on(b, 'heading') ? `<h2 class="blk-head" data-split>${esc(b.heading)}</h2>` : '');
  const list = (items) => `<ul>${shown(items).filter((i) => typeof i === 'string').map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

  let galleryImages = [];
  const shown = (arr) => (arr || []).filter((x) => !(x && typeof x === 'object' && x.hidden));
  const strs = (obj, key) => ((obj && obj[key]) || []).filter((v) => !(((obj.hiddenItems || {})[key]) || []).includes(v));
  const on = (obj, key) => !!obj && !(obj.hiddenFields || []).includes(key) && obj[key] !== '' && obj[key] != null;

  const R = {
    text: (b) => `<section class="blk blk-text" data-reveal>${on(b, 'heading') ? `<h2 data-split>${esc(b.heading)}</h2>` : '<div></div>'}<div class="prose">${on(b, 'body') ? sanitize(b.body) : ''}</div></section>`,
    bullets: (b) => `<section class="blk blk-bullets" data-reveal>${head(b)}${list(strs(b, 'items'))}</section>`,
    'two-column': (b) => `<section class="blk blk-two" data-reveal>
      <div>${on(b.left, 'heading') ? `<h3>${esc(b.left.heading)}</h3>` : ''}${list(strs(b.left, 'items'))}</div>
      <div>${on(b.right, 'heading') ? `<h3>${esc(b.right.heading)}</h3>` : ''}${list(strs(b.right, 'items'))}</div></section>`,
    image: (b) => `<section class="blk blk-image ${b.width === 'contained' ? 'is-contained' : ''} ${/\.svg$/i.test(b.src || '') ? 'is-svg' : ''}">
      ${head(b)}<figure data-curtain>${img(b)}</figure>${on(b, 'caption') ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</section>`,
    gallery: (b) => `<section class="blk blk-gallery" data-reveal>${head(b)}<ul class="gallery" style="--cols:${Math.min(6, Math.max(1, +b.columns || 3))}">
      ${shown(b.images).map((im) => { const i = galleryImages.push(im) - 1; return `<li><figure><button type="button" data-lightbox="${i}" data-cursor="view" data-cursor-label="OPEN" aria-label="Open image: ${esc(im.alt || 'image')}">${img(im)}</button>${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure></li>`; }).join('')}
      </ul></section>`,
    slider: (b) => {
      const imgs = shown(b.images); const wide = imgs.some((im) => /visual|design-\d|landing/i.test(im.src || '')) || b.layout === 'wide';
      return `<section class="blk blk-slider" data-reveal>${head(b)}
      <div class="slider" role="region" aria-roledescription="carousel" aria-label="${esc(b.heading || 'Image slider')}">
        <div class="slider__viewport" data-cursor="drag" tabindex="0" aria-label="Use left and right arrow keys to move slides">
          <ul class="slider__track">${imgs.map((im, i, a) => `<li class="slider__slide ${wide ? 'is-wide' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${a.length}">${img(im)}${im.caption ? `<p class="cap">${esc(im.caption)}</p>` : ''}</li>`).join('')}</ul>
        </div>
        <div class="slider__ctrl">
          <button class="icon-btn" type="button" data-s="prev" aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button class="icon-btn" type="button" data-s="next" aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
          <span class="slider__count" aria-live="polite">1 / ${imgs.length}</span>
          <span class="slider__bar" aria-hidden="true"><i></i></span>
        </div>
      </div></section>`;
    },
    'before-after': (b) => `<section class="blk blk-ba" data-reveal>${head(b)}
      <div class="ba">${img(b.before)}<div class="ba__after">${img(b.after)}</div>
        <input type="range" min="0" max="100" value="50" aria-label="Reveal before and after: slide to compare">
        <span class="ba__handle" aria-hidden="true"></span></div>
      <p class="ba__labels mono"><span>${esc((b.before && b.before.label) || 'Before')}</span><span>${esc((b.after && b.after.label) || 'After')}</span></p></section>`,
    metrics: (b) => `<section class="blk blk-metrics">${head(b)}<ul class="metrics">${shown(b.items).map((m) => `<li class="metric" data-reveal><b>${esc(m.value)}</b><span>${esc(m.label)}</span></li>`).join('')}</ul></section>`,
    quote: (b) => `<section class="blk blk-quote" data-reveal><blockquote><p>${esc(b.text)}</p>${b.author ? `<cite>— ${esc(b.author)}</cite>` : ''}</blockquote></section>`,
    process: (b) => `<section class="blk blk-process">${head(b)}<ol class="process">${shown(b.steps).map((s, i) => `<li data-reveal style="transition-delay:${i * 0.08}s"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('')}</ol></section>`,
    video: (b) => `<section class="blk blk-video" data-reveal>${head(b)}<div class="vwrap"><video src="${esc(b.src)}" ${b.poster ? `poster="${esc(b.poster)}"` : ''} controls playsinline preload="metadata"></video></div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}</section>`,
    embed: (b) => {
      const u = String(b.url || ''); if (!/^https:\/\//i.test(u)) return '';
      const src = /figma\.com/.test(u) && !/embed/.test(u) ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u)}` : u;
      return `<section class="blk blk-embed" data-reveal>${head(b)}<div class="embed" style="--ratio:${esc(b.ratio || '16/9')}"><iframe src="${esc(src)}" title="${esc(b.heading || 'Embedded prototype')}" loading="lazy" allowfullscreen></iframe></div></section>`;
    },
    callout: (b) => `<section class="blk blk-callout" data-reveal><p class="callout">${esc(b.text)}</p></section>`,
    divider: () => `<div class="blk" aria-hidden="true"><div class="divider"></div></div>`
  };

  function render(C, slug) {
    const main = $('[data-case]'); if (!main) return;
    const all = shown(C.projects).filter((p) => p.status !== 'draft' || new URLSearchParams(location.search).get('preview') === '1');
    const i = all.findIndex((p) => p.slug === slug);
    const p = all[i];
    if (!p) {
      main.innerHTML = `<section class="notfound"><div><p class="eyebrow mono" style="justify-content:center">404</p><h1 class="h2">This project took a <em>detour.</em></h1><p class="lead" style="margin:24px auto">It might have moved or been renamed.</p><a class="btn btn--primary" href="index.html#work"><span class="btn__label"><span class="btn__text" data-text="See all work">See all work</span></span></a></div></section>`;
      document.title = 'Not found — Md. Mutaher Hossain';
      return;
    }
    galleryImages = [];
    document.title = `${(p.seo && p.seo.title) || p.title} — Md. Mutaher Hossain`;
    const md = $('meta[name="description"]'); if (md) md.content = (p.seo && p.seo.description) || p.summary || p.subtitle || '';
    if (p.accentOverride) document.documentElement.style.setProperty('--accent', p.accentOverride);

    const meta = [['Role', on(p, 'role') && p.role], ['Project', on(p, 'type') && p.type], ['Duration', on(p, 'duration') ? p.duration : on(p, 'year') && p.year], ['Platform', on(p, 'platforms') && strs(p, 'platforms').join(' · ')]].filter((m) => m[1]);
    const cover = !on(p, 'cover') ? '' : p.cover && p.cover.src && p.coverStyle !== 'generative'
      ? `<figure class="case-cover" data-curtain>${img(p.cover, '', false)}</figure>`
      : `<div class="case-cover">${window.MH.coverHTML(p, 0)}</div>`;
    const next = all.slice(i + 1).concat(all.slice(0, i)).find((x) => x.status !== 'coming-soon' && !x.externalUrl);

    main.innerHTML = `
      <article>
        <header class="case-hero wrap">
          <a class="case-hero__back mono" href="index.html#work" data-title="Work">← All work</a>
          <p class="eyebrow mono" data-scramble>${esc(p.category)} — ${esc(p.year)}</p>
          <h1 class="case-hero__title" data-split>${esc(p.title)}</h1>
          ${on(p, 'subtitle') ? `<p class="case-hero__sub" data-reveal>${esc(p.subtitle)}</p>` : ''}
          <dl class="case-meta" data-reveal>${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          ${on(p, 'metrics') && shown(p.metrics).length ? `<ul class="wcard__metrics" style="margin-top:28px" aria-label="Results" data-reveal>${shown(p.metrics).map((m) => `<li class="metric-chip"><b>${esc(m.value)}</b>${esc(m.label)}</li>`).join('')}</ul>` : ''}
        </header>
        ${cover}
        <div class="case-body">
          ${on(p, 'summary') ? `<section class="blk blk-text" data-reveal><h2 class="sr-only">Summary</h2><div></div><p class="lead" style="color:var(--text);font-size:clamp(22px,2.2vw,36px);line-height:1.3;letter-spacing:-.02em;max-width:34ch">${esc(p.summary)}</p></section>` : ''}
          ${shown(p.blocks).map((b) => (R[b.type] ? R[b.type](b) : '')).join('')}
          ${(p.blocks || []).length ? '' : `<section class="blk blk-callout" data-reveal><p class="callout">The full case study is on its way. Want a walkthrough in the meantime? <a class="linklike" href="mailto:${esc(C.site && C.site.email)}">Let's talk.</a></p></section>`}
        </div>
      </article>
      ${next ? `<a class="next" href="case.html?slug=${encodeURIComponent(next.slug)}" data-title="${esc(next.title)}" data-cursor="view" data-cursor-label="NEXT">
        <span class="next__label mono">Next project</span>
        <span class="next__title" style="display:block">${esc(next.title)}</span>
        ${next.cover && next.cover.src ? `<span class="next__img" aria-hidden="true"><img src="${esc(next.cover.src)}" alt="" loading="lazy"></span>` : ''}
      </a>` : ''}`;
  }

  function enhance() {
    // Sliders — drag, buttons, keyboard
    $$('.slider').forEach((sl) => {
      const vp = $('.slider__viewport', sl), track = $('.slider__track', sl), slides = $$('.slider__slide', sl);
      const count = $('.slider__count', sl), bar = $('.slider__bar i', sl);
      let x = 0, idx = 0, dragging = false, sx = 0, sxv = 0, moved = 0, startIdx = 0;
      const max = () => Math.max(0, track.scrollWidth - vp.clientWidth);
      const set = (nx, anim = true) => {
        x = Math.max(-max(), Math.min(0, nx));
        track.style.transition = anim ? 'transform .8s cubic-bezier(.16,1,.3,1)' : 'none';
        track.style.transform = `translate3d(${x}px,0,0)`;
        idx = slides.reduce((best, s, i) => (Math.abs(s.offsetLeft + x) < Math.abs(slides[best].offsetLeft + x) ? i : best), 0);
        count.textContent = `${idx + 1} / ${slides.length}`;
        bar.style.transform = `scaleX(${max() ? -x / max() : 1})`;
      };
      const go = (i) => { idx = Math.max(0, Math.min(slides.length - 1, i)); set(-slides[idx].offsetLeft); };
      $('[data-s="prev"]', sl).addEventListener('click', () => go(idx - 1));
      $('[data-s="next"]', sl).addEventListener('click', () => go(idx + 1));
      vp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
        else if (e.key === 'Home') { e.preventDefault(); go(0); } else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
      });
      vp.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; sx = e.clientX; sxv = x; startIdx = idx; vp.setPointerCapture(e.pointerId); });
      vp.addEventListener('pointermove', (e) => { if (!dragging) return; moved = e.clientX - sx; set(sxv + moved, false); });
      const end = () => { if (!dragging) return; dragging = false; if (Math.abs(moved) > 40) go(startIdx + (moved < 0 ? 1 : -1)); else go(startIdx); };
      vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
      addEventListener('resize', () => set(x, false));
      set(0, false);
    });

    // Before / after
    $$('.ba').forEach((ba) => {
      const r = $('input', ba);
      const upd = () => { ba.style.setProperty('--pos', r.value + '%'); r.setAttribute('aria-valuetext', `${r.value}% after`); };
      r.addEventListener('input', upd); upd();
    });

    // Lightbox
    const lb = $('.lightbox'); if (!lb) return;
    const lbImg = $('img', lb), cap = $('.lightbox__cap', lb);
    let cur = 0;
    const show = (i) => { cur = (i + galleryImages.length) % galleryImages.length; const im = galleryImages[cur]; lbImg.src = im.src; lbImg.alt = im.alt || ''; cap.textContent = im.caption || `${cur + 1} / ${galleryImages.length}`; };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lightbox]');
      if (b) { show(+b.dataset.lightbox); window.MH.Dialog.show(lb, b); return; }
      const a = e.target.closest('[data-lb]'); if (!a) return;
      if (a.dataset.lb === 'close') window.MH.Dialog.hide(lb); else show(cur + (a.dataset.lb === 'next' ? 1 : -1));
    });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
    lb.addEventListener('click', (e) => { if (e.target === lb) window.MH.Dialog.hide(lb); });
  }

  window.MHCase = { render, enhance, sanitize };
})();
