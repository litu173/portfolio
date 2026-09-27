/* Loom preview bridge: runs only inside the editor's live preview.
   Links to the project's own pages ask the editor to open that page; links to other sites open in a
   new tab; forms don't submit. Nothing here ships with published sites. */
(() => {
  'use strict';
  const post = (msg) => { try { parent.postMessage(Object.assign({ loomPreview: 1 }, msg), '*'); } catch (e) { /* no parent */ } };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) return; // in-page anchors scroll as usual
    const m = /^(?:\.\/)?([\w-]+)\.html(#[\w-]*)?$/.exec(href);
    if (m) { e.preventDefault(); post({ nav: m[1], hash: m[2] || '' }); return; }
    if (/^(mailto:|tel:)/i.test(href)) return;
    if (/^https?:\/\//i.test(href)) { e.preventDefault(); window.open(href, '_blank', 'noopener'); return; }
    e.preventDefault();
  }, true);
  document.addEventListener('submit', (e) => { if (e.target.closest('form[data-checkout]')) return; e.preventDefault(); post({ note: 'Forms are disabled in preview. They work on your published site.' }); }, true);
  const hm = document.querySelector('meta[name="loom-hash"]'); const hash = hm && hm.content;
  if (hash && /^#[\w-]+$/.test(hash)) addEventListener('load', () => { const t = document.querySelector(hash); if (t) t.scrollIntoView(); });
})();
