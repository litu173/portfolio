/* LOOM — woven threads canvas.
   Warp (vertical) and weft (horizontal) threads flow like fabric, bend away from the cursor, and —
   as `progress` goes 0 → 1 — straighten into a precise layout grid (chaos → structure).
   LoomThreads.mount(canvas, { weft, warp, amp, progress: () => 0..1, grid: {cols, rows} }) */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#3B82F6', '#7FCFA5', '#F2C46D', '#FF8FB1'];

  function mount(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const o = Object.assign({ weft: 26, warp: 38, amp: 42, alpha: 0.5, progress: () => 0, speed: 1 }, opts);
    let W = 0, H = 0, dpr = 1, t = 0, mx = -1e4, my = -1e4, vis = true, raf = 0, last = performance.now();
    const size = () => {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); addEventListener('resize', size);
    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener('pointerleave', () => { mx = my = -1e4; });
    new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && !raf) loop(); }).observe(canvas);

    const gradient = (x0, y0, x1, y1, a) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); COLORS.forEach((c, i) => g.addColorStop(i / (COLORS.length - 1), c)); ctx.globalAlpha = a; return g; };
    function thread(horizontal, i, n, p) {
      const len = horizontal ? W : H, cross = horizontal ? H : W;
      const base = ((i + 0.5) / n) * cross;
      const phase = i * 0.7, f = 0.006 + (i % 5) * 0.0012;
      const amp = o.amp * (1 - p) * (0.6 + ((i * 37) % 10) / 20);
      ctx.beginPath();
      for (let s = 0; s <= len; s += 14) {
        let off = Math.sin(s * f + t * (0.6 + (i % 3) * 0.2) + phase) * amp + Math.sin(s * f * 2.3 - t * 0.5 + phase) * amp * 0.35;
        let x = horizontal ? s : base + off, y = horizontal ? base + off : s;
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy, R = 140;
        if (d2 < R * R) { const k = (1 - Math.sqrt(d2) / R) * 34 * (1 - p * 0.6); if (horizontal) y += (dy >= 0 ? 1 : -1) * k; else x += (dx >= 0 ? 1 : -1) * k; }
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    function draw() {
      const p = Math.max(0, Math.min(1, o.progress()));
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      ctx.strokeStyle = gradient(0, 0, W, H, o.alpha * (0.55 + p * 0.25));
      for (let i = 0; i < o.warp; i++) thread(false, i, o.warp, p);
      ctx.strokeStyle = gradient(W, 0, 0, H, o.alpha * (0.45 + p * 0.3));
      for (let i = 0; i < o.weft; i++) thread(true, i, o.weft, p);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function loop(now = performance.now()) {
      raf = 0; if (!vis || document.hidden) return;
      t += Math.min(50, now - last) / 1000 * o.speed; last = now;
      draw(); if (!reduce) raf = requestAnimationFrame(loop);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { last = performance.now(); loop(); } });
    loop();
    return { redraw: draw };
  }
  window.LoomThreads = { mount };
  // Auto-mount any <canvas data-threads>
  const auto = () => document.querySelectorAll('canvas[data-threads]').forEach((c) => mount(c, { weft: +c.dataset.weft || 18, warp: +c.dataset.warp || 26, amp: +c.dataset.amp || 38, alpha: +c.dataset.alpha || 0.45 }));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', auto) : auto();
})();
