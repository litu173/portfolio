/* LOOM — hero weave.
   A woven silk field: warp (vertical) and weft (horizontal) ribbons interlace over and under, with
   crossings drawn in the right order. The fabric breathes in 3D, tilts toward the cursor and dips
   under it like cloth. A shuttle of light runs row by row and leaves woven light behind it.
   As you scroll, progress() goes 0 → 1 and the fabric pulls taut into a precise grid.
   LoomWeave.mount(canvas, { progress: () => number }) → { destroy } */
(() => {
  'use strict';
  const STOPS = [[59, 130, 246], [127, 207, 165], [242, 196, 109], [255, 143, 177], [167, 139, 250]];
  const grad = (t) => { t = ((t % 1) + 1) % 1; const n = STOPS.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i, a = STOPS[i], b = STOPS[i + 1]; return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)); };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function mount(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const progress = opts.progress || (() => 0);
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, gap = 40, raf = 0, visible = true, t0 = performance.now();
    const ptr = { x: 0.5, y: 0.42, tx: 0.5, ty: 0.42, px: -9999, py: -9999, on: 0, ton: 0 };
    const lit = []; const shuttle = { row: 0, t: 0, speed: 0.55 };

    function size() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(1.75, devicePixelRatio || 1);
      W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gap = W < 700 ? 40 : W < 1200 ? 52 : 60;
      cols = Math.ceil(W / gap) + 6; rows = Math.ceil(H / gap) + 6;
      lit.length = rows; for (let j = 0; j < rows; j++) lit[j] = lit[j] || 0;
      shuttle.row = Math.floor(rows / 2);
    }
    // 3D fabric → screen
    function P(x, y, time, flat, rx, ry) {
      const cx = W / 2, cy = H * 0.46; const amp = (1 - flat);
      let z = Math.sin(x * 0.0042 + time * 0.55) * Math.cos(y * 0.0051 - time * 0.42) * 70 * amp + Math.sin((x + y) * 0.0023 - time * 0.3) * 36 * amp;
      const dx = x - ptr.px, dy = y - ptr.py; z += 90 * ptr.on * amp * Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
      let X = x - cx, Y = y - cy, Z = z;
      const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
      let x1 = X * cY + Z * sY, z1 = -X * sY + Z * cY; let y1 = Y * cX - z1 * sX, z2 = Y * sX + z1 * cX;
      const f = 1100, s = f / (f + z2); return [cx + x1 * s, cy + y1 * s, s, z];
    }
    function frame(now) {
      const time = reduce ? 1.2 : (now - t0) / 1000;
      const pr = clamp(progress()), flat = ease(clamp(pr * 1.15));
      ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06; ptr.on += (ptr.ton - ptr.on) * 0.05;
      const rx = (0.42 - (ptr.y - 0.5) * 0.35) * (1 - flat) + 0.0, ry = (ptr.x - 0.5) * 0.42 * (1 - flat);
      const zoom = 1 + flat * 0.35;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H * 0.46); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H * 0.46);
      const ox = (W - (cols - 1) * gap) / 2, oy = (H - (rows - 1) * gap) / 2;
      const wig = 7 * (1 - flat);
      // sample every half-gap so crossings and mid-points are exact
      const warpX = (i, j2, tm) => ox + i * gap + Math.sin(j2 * 0.5 * 0.7 + tm * 0.9 + i * 0.45) * wig;
      const weftY = (j, i2, tm) => oy + j * gap + Math.cos(i2 * 0.5 * 0.6 - tm * 0.8 + j * 0.5) * wig;
      const rw = gap * 0.4, alphaBase = 0.13 + 0.12 * (1 - flat);
      const ribbon = (pts, rgb, a, w) => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.strokeStyle = `rgba(4,4,8,${Math.min(0.7, a * 2.4)})`; ctx.lineWidth = w + 2.5; ctx.stroke();
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; ctx.lineWidth = w; ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.45})`; ctx.lineWidth = Math.max(0.8, w * 0.12); ctx.stroke();
      };
      const weftPts = (j, i0, i1) => { const out = []; for (let i2 = i0 * 2; i2 <= i1 * 2; i2++) { const x = ox + i2 * gap / 2; const p = P(x, weftY(j, i2, time), time, flat, rx, ry); out.push(p); } return out; };
      const warpPts = (i, j0, j1) => { const out = []; for (let j2 = j0 * 2; j2 <= j1 * 2; j2++) { const y = oy + j2 * gap / 2; const p = P(warpX(i, j2, time), y, time, flat, rx, ry); out.push(p); } return out; };
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      // 1) weft ribbons
      for (let j = 0; j < rows; j++) { const pts = weftPts(j, 0, cols - 1); const s = pts[pts.length >> 1][2]; ribbon(pts, grad(j / rows * 0.9 + 0.05), alphaBase + lit[j] * 0.55, rw * s * 0.92); }
      // 2) warp ribbons (on top everywhere)
      for (let i = 0; i < cols; i++) { const pts = warpPts(i, 0, rows - 1); const s = pts[pts.length >> 1][2]; ribbon(pts, grad(i / cols * 0.9 + 0.35), alphaBase * 0.95, rw * s * 0.92); }
      // 3) where the weft goes over, redraw that short stretch of weft
      for (let j = 0; j < rows; j++) {
        const rgb = grad(j / rows * 0.9 + 0.05), a = alphaBase + lit[j] * 0.55;
        for (let i = (j + 1) % 2; i < cols; i += 2) {
          const x0 = ox + (i - 0.45) * gap, x1 = ox + (i + 0.45) * gap;
          const pts = [P(x0, weftY(j, i * 2 - 1, time), time, flat, rx, ry), P(ox + i * gap, weftY(j, i * 2, time), time, flat, rx, ry), P(x1, weftY(j, i * 2 + 1, time), time, flat, rx, ry)];
          ribbon(pts, rgb, a, rw * pts[1][2] * 0.92);
        }
      }
      // shuttle of light
      if (!reduce && flat < 0.98) {
        shuttle.t += 0.016 * shuttle.speed; if (shuttle.t > 1) { shuttle.t = 0; lit[shuttle.row] = 1; shuttle.row = (shuttle.row + 3 + Math.floor(Math.random() * (rows - 6))) % rows; }
        const fx = ox + shuttle.t * (cols - 1) * gap; const j = shuttle.row; const i2 = (fx - ox) / (gap / 2);
        const sp = P(fx, weftY(j, i2, time), time, flat, rx, ry);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 80 * sp[2]); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.15, 'rgba(200,220,255,.45)'); g.addColorStop(1, 'rgba(120,140,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp[0], sp[1], 80 * sp[2], 0, Math.PI * 2); ctx.fill();
        // trail
        const tr = weftPts(j, Math.max(0, Math.floor((fx - ox) / gap) - 5), Math.max(0, Math.floor((fx - ox) / gap)));
        if (tr.length > 1) { ctx.beginPath(); ctx.moveTo(tr[0][0], tr[0][1]); tr.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(sp[0], sp[1]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = rw * 0.35 * sp[2]; ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < rows; k++) lit[k] *= 0.992;
      }
      ctx.restore();
      // readability + vignette: fade the centre behind the title and the edges into the page
      ctx.globalCompositeOperation = 'destination-out';
      const cg = ctx.createRadialGradient(W / 2, H * 0.47, 0, W / 2, H * 0.47, Math.max(W * 0.55, H * 0.5));
      cg.addColorStop(0, 'rgba(0,0,0,.94)'); cg.addColorStop(0.5, 'rgba(0,0,0,.72)'); cg.addColorStop(0.8, 'rgba(0,0,0,.25)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      const eg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
      eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, H * 0.72, 0, H); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); ptr.tx = (e.clientX - r.left) / r.width; ptr.ty = (e.clientY - r.top) / r.height; ptr.px = e.clientX - r.left; ptr.py = e.clientY - r.top; ptr.ton = 1; };
    const onLeave = () => { ptr.tx = 0.5; ptr.ty = 0.42; ptr.ton = 0; };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 });
    size(); io.observe(canvas); start();
    const ro = new ResizeObserver(() => { size(); if (reduce) start(); }); ro.observe(canvas);
    addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    return { destroy() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); } };
  }
  window.LoomWeave = { mount, grad };
})();
