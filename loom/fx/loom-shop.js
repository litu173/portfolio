/* Loom Shop: a tiny cart for sites Loom publishes (no dependencies, strict-CSP friendly).
   Markup it understands:
     [data-add-to-cart] data-sku data-name data-price   → adds the item, announces it
     [data-cart-link]                                   → shows "Bag (n)"
     [data-cart-view] data-checkout-href data-shop-href → the bag: items, quantities, totals
     [data-cart-summary]                                → order summary beside checkout
     form[data-checkout]                                → validates, then confirms the order
   Payments are never taken here: connect Stripe, Shopify or PayPal and point checkout at them.
   The cart lives in localStorage for this site only. */
(() => {
  'use strict';
  const d = document, KEY = 'loom-cart:' + location.pathname.replace(/[^/]*$/, '');
  const FREE = 75, EXPRESS = 12;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage blocked */ } render(); };
  const money = (n) => '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let live = null;
  const announce = (msg) => { if (!live) { live = d.createElement('div'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;padding:12px 18px;border-radius:999px;background:var(--sw-ink,#111);color:var(--sw-paper,#fff);font:600 14px/1.2 var(--font-body,system-ui);box-shadow:0 20px 40px -16px rgba(0,0,0,.5);opacity:0;transition:opacity .3s'; d.body.append(live); } live.textContent = msg; live.style.opacity = '1'; clearTimeout(announce.t); announce.t = setTimeout(() => (live.style.opacity = '0'), 2200); };
  const totals = (c, express) => { const sub = c.reduce((a, i) => a + i.price * i.qty, 0); const ship = !c.length ? 0 : express ? EXPRESS : sub >= FREE ? 0 : 6; return { sub, ship, total: sub + ship, n: c.reduce((a, i) => a + i.qty, 0) }; };

  function render() {
    const c = load(), t = totals(c, false);
    d.querySelectorAll('[data-cart-link]').forEach((a) => { a.textContent = t.n ? `Bag (${t.n})` : 'Bag'; a.setAttribute('aria-label', `Shopping bag, ${t.n} item${t.n === 1 ? '' : 's'}`); });
    d.querySelectorAll('[data-cart-view]').forEach((v) => {
      const shop = v.dataset.shopHref || 'index.html', go = v.dataset.checkoutHref || 'checkout.html';
      if (!c.length) { v.innerHTML = `<p class="lshop__empty">Your bag is empty.</p><a class="lshop__go" href="${esc(shop)}">Continue shopping</a>`; return; }
      v.innerHTML = c.map((i, k) => `<div class="lshop__row"><span class="lshop__img" aria-hidden="true"></span><div><div class="lshop__name">${esc(i.name)}</div><div class="lshop__qty"><button type="button" data-q="${k}" data-d="-1" aria-label="Decrease quantity of ${esc(i.name)}">−</button><span aria-label="Quantity">${i.qty}</span><button type="button" data-q="${k}" data-d="1" aria-label="Increase quantity of ${esc(i.name)}">+</button><button type="button" class="lshop__rm" data-rm="${k}">Remove</button></div></div><b>${money(i.price * i.qty)}</b></div>`).join('')
        + `<div class="lshop__tot"><div><span>Subtotal</span><b>${money(t.sub)}</b></div><div><span>Shipping</span><span>${t.ship ? money(t.ship) : 'Free'}</span></div>${t.sub < FREE ? `<div><span style="color:var(--sw-muted)">Add ${money(FREE - t.sub)} for free shipping</span></div>` : ''}<div class="big"><span>Total</span><b>${money(t.total)}</b></div></div><a class="lshop__go" href="${esc(go)}">Checkout</a>`;
    });
    d.querySelectorAll('[data-cart-summary]').forEach((v) => {
      const form = d.querySelector('form[data-checkout]'); const ex = form && form.querySelector('input[name="ship"]:checked') && form.querySelector('input[name="ship"]:checked').value === 'express';
      const tt = totals(c, ex);
      v.innerHTML = `<h2 style="margin:0 0 8px;font-size:1.2em">Order summary</h2>${c.length ? c.map((i) => `<div class="lshop__tot" style="padding:6px 0"><div><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div></div>`).join('') : '<p class="lshop__empty">Your bag is empty.</p>'}<div class="lshop__tot"><div><span>Subtotal</span><b>${money(tt.sub)}</b></div><div><span>Shipping</span><span>${tt.ship ? money(tt.ship) : 'Free'}</span></div><div class="big"><span>Total</span><b>${money(tt.total)}</b></div></div>`;
    });
  }
  d.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-to-cart]');
    if (add) {
      e.preventDefault(); const c = load(); const sku = add.dataset.sku || add.dataset.name; const hit = c.find((i) => i.sku === sku);
      if (hit) hit.qty = Math.min(99, hit.qty + 1); else c.push({ sku, name: add.dataset.name || 'Item', price: parseFloat(add.dataset.price) || 0, qty: 1 });
      save(c); announce(`Added ${add.dataset.name || 'item'} to your bag`); return;
    }
    const q = e.target.closest('[data-q]'); if (q) { const c = load(); const i = c[+q.dataset.q]; if (i) { i.qty = Math.max(0, Math.min(99, i.qty + +q.dataset.d)); save(c.filter((x) => x.qty > 0)); } return; }
    const rm = e.target.closest('[data-rm]'); if (rm) { const c = load(); const it = c[+rm.dataset.rm]; c.splice(+rm.dataset.rm, 1); save(c); if (it) announce(`Removed ${it.name}`); }
  });
  d.addEventListener('change', (e) => { if (e.target.closest('form[data-checkout]')) render(); });
  d.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-checkout]'); if (!f) return; e.preventDefault();
    const err = f.querySelector('[data-checkout-error]'); const bad = [...f.querySelectorAll('[required]')].filter((x) => !x.value.trim() || (x.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.value)));
    f.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid')); bad.forEach((x) => x.setAttribute('aria-invalid', 'true'));
    if (!load().length) { err.textContent = 'Your bag is empty. Add something before checking out.'; return; }
    if (bad.length) { err.textContent = `Please complete ${bad.length} required field${bad.length > 1 ? 's' : ''}.`; bad[0].focus(); return; }
    const order = 'LM-' + Math.random().toString(36).slice(2, 8).toUpperCase(); const email = f.querySelector('[type="email"]').value;
    save([]); f.outerHTML = `<div class="lshop__done" role="status" tabindex="-1"><h2 style="margin:0 0 8px">Thank you, your order is placed.</h2><p style="margin:0 0 6px">Order <b>${order}</b>. A confirmation will be sent to <b>${esc(email)}</b>.</p><p class="lshop__note">Demo store: no payment was taken. Connect a payment provider in Loom before launch.</p></div>`;
    const done = d.querySelector('.lshop__done'); done && done.focus();
  });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', render); else render();
})();
