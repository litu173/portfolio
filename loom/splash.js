/* LOOM — immersive intro ("the grand welcome").
   1. A globe woven from over-under ribbons (the hero weave, wrapped into a sphere) turns at the centre.
      While nobody scrolls, it beats like a heart, with a light flash blooming behind it.
   2. Scrolling (wheel, trackpad, touch, arrows, Page Down, Space) pulls the elements orbiting it —
      UI chips, agent badges, swatches and thread streaks — into the globe. Each one flashes as it's
      woven in, and the globe grows with every one.
   3. Scroll further and the camera passes through the cloth into a bright galaxy, where Loom
      introduces itself and its team, then opens the home page on its own.
   Esc or “Skip intro” jumps straight to the page. Later visits in a session get an automatic short
   version. Reduced motion skips it entirely. Exposes window.LoomSplash.done (resolves at reveal). */
(() => {
  'use strict';
  const el = document.querySelector('[data-splash]');
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  window.LoomSplash = { done };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false; try { seen = sessionStorage.getItem('loom-welcomed') === '1'; sessionStorage.setItem('loom-welcomed', '1'); } catch (e) { /* storage blocked */ }
  if (!el || reduce) { if (el) el.remove(); resolveDone(); return; }
  const H = document.documentElement; H.classList.add('has-splash');

  /* ---------------------------------------------------------------- team (for the welcome) */
  const TEAM = [['✦', '#F5F5F7'], ['⌘', '#6E8BFF'], ['◐', '#A78BFA'], ['◆', '#FF8FB1'], ['¶', '#F2C46D'], ['◎', '#FF6B4A'], ['✎', '#5ED6C4'], ['∿', '#7FCFA5'], ['✓', '#4FC3F7'], ['⛨', '#FF5C7A'], ['⌕', '#C6F36B'], ['↗', '#FFB86B'], ['⇪', '#9AA4FF'], ['⊕', '#E6A6FF'], ['▦', '#56B4E9'], ['⟲', '#B8C0CC']];
  const team = el.querySelector('[data-splash-team]');
  if (team) team.innerHTML = TEAM.map(([g, c], i) => `<span style="--c:${c};--i:${i}">${g}</span>`).join('');

  /* ---------------------------------------------------------------- canvas + helpers */
  const cv = el.querySelector('canvas'); const ctx = cv.getContext('2d');
  const STOPS = [[110, 139, 255], [127, 207, 165], [242, 196, 109], [255, 143, 177], [167, 139, 250], [110, 139, 255]];
  const col = (t) => { t = ((t % 1) + 1) % 1; const n = STOPS.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i, a = STOPS[i], b = STOPS[i + 1]; return a.map((v, k) => Math.round(v + (b[k] - v) * f)); };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const eo = (t) => 1 - Math.pow(1 - clamp(t), 3), eio = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const rnd = (() => { let s = 20260926; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  let W = 0, Hh = 0, dpr = 1, galaxy = null;
  function size() { dpr = Math.min(1.75, devicePixelRatio || 1); W = innerWidth; Hh = innerHeight; cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; galaxy = null; }
  size(); addEventListener('resize', size);

  /* ---------------------------------------------------------------- scroll-driven progress */
  let target = 0, p = 0, lastInput = -1e9, exiting = false, welcomeAt = 0;
  const autoplay = seen;
  const PASS = 0.8;                                  // past this point the journey completes on its own
  const nudge = (d) => { if (exiting) return; if (p < PASS) target = clamp(target + d, 0, 1); lastInput = performance.now(); el.classList.add('is-moving'); };
  const onWheel = (e) => { e.preventDefault(); nudge((e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY) / (innerHeight * 4.5)); };
  let ty = null; const onTouchStart = (e) => { ty = e.touches[0].clientY; }; const onTouchMove = (e) => { if (ty == null) return; e.preventDefault(); const y = e.touches[0].clientY; nudge((ty - y) / (innerHeight * 3.2)); ty = y; };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); exit(); return; }
    const k = { ArrowDown: 0.06, PageDown: 0.14, ' ': 0.1, ArrowUp: -0.06, PageUp: -0.14, Enter: 0.2 }[e.key];
    if (k != null) { e.preventDefault(); nudge(k); }
  };
  addEventListener('wheel', onWheel, { passive: false }); addEventListener('touchstart', onTouchStart, { passive: true }); addEventListener('touchmove', onTouchMove, { passive: false }); addEventListener('keydown', onKey);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / W - 0.5; mouse.ty = e.clientY / Hh - 0.5; }, { passive: true });

  /* ---------------------------------------------------------------- the flying elements */
  const LABELS = ['Hero', 'Grid · 3 cols', '.card', 'Tablet ≤ 991', 'WCAG AA ✓', 'Publish ✓', 'Navbar', ':hover', 'SEO 100', 'CSP on', 'Dashboard', 'Pricing', 'flex', 'Logo', 'Motion', 'Palette', 'Aa', 'H1', '</>', 'Checkout', 'FAQ', 'Mobile', '24px', 'KPI ▲ 12%', 'Sitemap', 'Alt text', 'Button', 'Fonts', 'Brand', 'Launch'];
  const SW = ['#6E8BFF', '#7FCFA5', '#F2C46D', '#FF8FB1', '#A78BFA', '#5ED6C4', '#FF6B4A'];
  const items = [];
  const N = Math.min(96, Math.round(56 + (W * Hh) / 36000));
  for (let i = 0; i < N; i++) {
    const kind = i % 7 === 0 ? 'agent' : i % 5 === 0 ? 'swatch' : i % 4 === 0 ? 'thread' : i % 9 === 0 ? 'spark' : 'chip';
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), dist = 1.9 + rnd() * 3.2;
    items.push({ kind, th, ph, dist, spin: (rnd() - 0.5) * 0.5 + (rnd() < 0.5 ? 0.18 : -0.18), bob: rnd() * 6.28,
      t0: (i / N) * 0.46 + rnd() * 0.04, label: LABELS[i % LABELS.length], agent: TEAM[i % TEAM.length], color: SW[i % SW.length], gone: false });
  }
  let ripple = 0; // brightness pulse when an element is woven in

  /* ---------------------------------------------------------------- 3D */
  const F = 900; let rotY = 0, rotX = 0.35;
  function proj(x, y, z, cx, cy) {
    const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX);
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY; const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
    const s = F / Math.max(40, F + z2); return [cx + x1 * s, cy + y1 * s, z2, s];
  }

  /* ---------------------------------------------------------------- the woven globe */
  const LAT = 11, LON = 18;
  function drawGlobe(R, cx, cy, alpha, beat, inside) {
    const seg = 56;
    const lat = (i) => -Math.PI / 2 + ((i + 1) / (LAT + 1)) * Math.PI;
    const ptLat = (i, a) => { const la = lat(i); return proj(R * Math.cos(la) * Math.cos(a), R * Math.sin(la), R * Math.cos(la) * Math.sin(a), cx, cy); };
    const ptLon = (j, b) => { const lo = (j / LON) * Math.PI * 2; return proj(R * Math.cos(b) * Math.cos(lo), R * Math.sin(b), R * Math.cos(b) * Math.sin(lo), cx, cy); };
    const bw = Math.max(1.2, (R * Math.PI) / (LAT + 1) * 0.42);
    const stroke = (pts, rgb, a, w) => {
      if (pts.length < 2) return; w = Math.min(w, 400);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.lineWidth = w + 2.5; ctx.strokeStyle = `rgba(4,4,10,${a * 0.85})`; ctx.stroke();
      ctx.lineWidth = w; ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; ctx.stroke();
      ctx.lineWidth = Math.max(0.7, w * 0.16); ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`; ctx.stroke();
    };
    // split a band into runs on the near side (z ≤ 0) or far side
    const runs = (sample, n, near) => { const out = []; let cur = []; for (let k = 0; k <= n; k++) { const q = sample(k / n); const isNear = q[2] <= 0; if (isNear === near && q[2] > -F + 60) cur.push(q); else if (cur.length) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; };
    const passes = inside ? [true] : [false, true];
    passes.forEach((near) => {
      const a0 = alpha * (near ? 1 : 0.22);
      for (let i = 0; i < LAT; i++) { const rgb = col(i / LAT * 0.8); runs((t) => ptLat(i, t * Math.PI * 2), seg, near).forEach((r) => stroke(r, rgb, a0, bw * r[r.length >> 1][3])); }
      for (let j = 0; j < LON; j++) { const rgb = col(0.35 + j / LON * 0.8); runs((t) => ptLon(j, -Math.PI / 2 + 0.2 + t * (Math.PI - 0.4)), seg, near).forEach((r) => stroke(r, rgb, a0, bw * 0.9 * r[r.length >> 1][3])); }
      if (!near) return;
      // over-under: where a latitude passes over a longitude, redraw that short stretch of latitude
      for (let i = 0; i < LAT; i++) {
        const rgb = col(i / LAT * 0.8);
        for (let j = (i % 2); j < LON; j += 2) {
          const a = (j / LON) * Math.PI * 2, d = (Math.PI * 2 / LON) * 0.42;
          const q = [ptLat(i, a - d), ptLat(i, a), ptLat(i, a + d)]; if (q.some((x) => x[2] > 0 || x[2] < -F + 60)) continue;
          stroke(q, rgb, a0, bw * q[1][3]);
        }
      }
    });
    // heartbeat / ripple sheen over the surface
    const glow = beat * 0.55 + ripple * 0.5;
    if (glow > 0.01 && !inside) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05); g.addColorStop(0, `rgba(255,255,255,${0.22 * glow})`); g.addColorStop(0.6, `rgba(150,170,255,${0.12 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------------------------------------------------------------- galaxy (bright) */
  function buildGalaxy() {
    const g = document.createElement('canvas'); g.width = W * dpr; g.height = Hh * dpr; const c = g.getContext('2d'); c.scale(dpr, dpr);
    const bg = c.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, Math.max(W, Hh) * 0.8); bg.addColorStop(0, '#34247E'); bg.addColorStop(0.45, '#171046'); bg.addColorStop(1, '#06051A'); c.fillStyle = bg; c.fillRect(0, 0, W, Hh);
    c.globalCompositeOperation = 'lighter';
    [[0.2, 0.28, '#FF5FA8'], [0.8, 0.24, '#4FC3F7'], [0.68, 0.8, '#A78BFA'], [0.28, 0.76, '#5ED6C4'], [0.52, 0.5, '#FFB86B']].forEach(([x, y, color]) => {
      for (let k = 0; k < 5; k++) { const r = Math.max(W, Hh) * (0.18 + rnd() * 0.22); const gx = W * x + (rnd() - 0.5) * W * 0.14, gy = Hh * y + (rnd() - 0.5) * Hh * 0.14; const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, color + '3a'); gr.addColorStop(1, color + '00'); c.fillStyle = gr; c.fillRect(0, 0, W, Hh); }
    });
    for (let i = 0; i < 900; i++) { const x = rnd() * W, y = rnd() * Hh, r = rnd() < 0.96 ? rnd() * 1.1 + 0.2 : rnd() * 2.2 + 1; c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.65})`; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); if (r > 1.8) { const s = c.createRadialGradient(x, y, 0, x, y, r * 6); s.addColorStop(0, 'rgba(200,220,255,.5)'); s.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = s; c.fillRect(x - r * 6, y - r * 6, r * 12, r * 12); } }
    return g;
  }
  const arms = []; for (let i = 0; i < 1400; i++) { const arm = i % 4, t = Math.pow(rnd(), 0.7); arms.push({ a: arm * (Math.PI / 2) + t * 5.2 + (rnd() - 0.5) * 0.5, r: t, s: rnd() * 1.6 + 0.3, c: col(t * 0.9 + arm * 0.1) }); }
  function drawGalaxy(alpha, time) {
    if (!galaxy) galaxy = buildGalaxy();
    ctx.globalAlpha = alpha; ctx.drawImage(galaxy, 0, 0, W, Hh); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const cx = W / 2, cy = Hh / 2, R = Math.min(W, Hh) * 0.62, rot = time * 0.06;
    arms.forEach((s) => { const a = s.a + rot, x = cx + Math.cos(a) * s.r * R, y = cy + Math.sin(a) * s.r * R * 0.42; ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${alpha * (1 - s.r * 0.6)})`; ctx.fillRect(x, y, s.s, s.s); });
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35); core.addColorStop(0, `rgba(255,245,230,${0.42 * alpha})`); core.addColorStop(0.3, `rgba(255,190,240,${0.18 * alpha})`); core.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = core; ctx.fillRect(0, 0, W, Hh);
    ctx.globalCompositeOperation = 'source-over';
    // a soft dark lens behind the welcome text keeps it readable (AA) on the bright nebula
    const lens = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy * 0.9, Math.min(W, Hh) * 0.62); lens.addColorStop(0, `rgba(10,8,34,${0.62 * alpha})`); lens.addColorStop(0.6, `rgba(10,8,34,${0.35 * alpha})`); lens.addColorStop(1, 'rgba(10,8,34,0)'); ctx.fillStyle = lens; ctx.fillRect(0, 0, W, Hh);
  }

  /* ---------------------------------------------------------------- elements */
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawItem(it, q, a) {
    const [x, y, , s] = q; const k = clamp(s, 0.35, 2.4);
    ctx.globalAlpha = a;
    if (it.kind === 'chip') {
      ctx.font = `500 ${Math.round(13 * k)}px "JetBrains Mono", ui-monospace, monospace`; const w = ctx.measureText(it.label).width + 30 * k, h = 30 * k;
      roundRect(x - w / 2, y - h / 2, w, h, 9 * k); ctx.fillStyle = 'rgba(18,18,26,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = it.color; ctx.fillRect(x - w / 2 + 10 * k, y - 3 * k, 6 * k, 6 * k);
      ctx.fillStyle = 'rgba(235,238,245,.92)'; ctx.textBaseline = 'middle'; ctx.fillText(it.label, x - w / 2 + 21 * k, y + 0.5);
    } else if (it.kind === 'agent') {
      const r = 17 * k; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = 'rgba(12,12,20,.9)'; ctx.fill(); ctx.strokeStyle = it.agent[1]; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = it.agent[1]; ctx.font = `${Math.round(15 * k)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.agent[0], x, y + 1); ctx.textAlign = 'left';
    } else if (it.kind === 'swatch') {
      const r = 11 * k; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = it.color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (it.kind === 'thread') {
      const len = 46 * k, ang = it.bob; ctx.lineCap = 'round'; ctx.lineWidth = 6 * k; ctx.strokeStyle = it.color; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); ctx.quadraticCurveTo(x + Math.sin(ang) * 10 * k, y - Math.cos(ang) * 10 * k, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); ctx.stroke(); ctx.lineCap = 'butt';
    } else {
      const r = 3 * k; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- heartbeat: lub-dub every ~1.15 s */
  const heart = (t) => { const ph = (t % 1.15) / 1.15; const bump = (c, w) => Math.exp(-Math.pow((ph - c) / w, 2)); return clamp(bump(0.08, 0.045) + 0.65 * bump(0.26, 0.05)); };
  let beatAmt = 1; // fades out while scrolling, back in when idle

  /* ---------------------------------------------------------------- frame */
  const t0 = performance.now(); let raf = 0;
  const hint = el.querySelector('[data-splash-hint]'), bar = el.querySelector('[data-splash-bar]');
  function frame(now) {
    const time = (now - t0) / 1000;
    if (autoplay && !exiting) target = clamp((time - 0.3) / 2);
    if (p >= PASS && !exiting) target = 1;
    p += (target - p) * (p >= PASS ? 0.05 : 0.085); if (Math.abs(target - p) < 0.0005) p = target;
    const idle = now - lastInput > 900; if (idle) el.classList.remove('is-moving');
    beatAmt += ((idle && p < 0.5 && !autoplay ? 1 : 0) - beatAmt) * 0.06;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    rotY = time * (0.18 + p * 0.9) + mouse.x * 0.9; rotX = 0.35 + mouse.y * 0.5;
    ripple *= 0.9;
    const beat = heart(time) * beatAmt;
    const cx = W / 2, cy = Hh / 2, base = Math.min(W, Hh) * 0.2;
    // the globe grows as elements are woven in, then the camera passes through it
    const grow = eo(p / 0.55), pass = eio((p - 0.52) / 0.3);
    const scale = 1 + pass * 9;
    const R = base * (1 + grow * 1.1) * (1 + beat * 0.06) * scale;
    const inside = pass > 0.62;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05050A'; ctx.fillRect(0, 0, W, Hh);
    // background light flash with each heartbeat (and each woven-in element)
    const flashA = beat * 0.55 + ripple * 0.25;
    if (flashA > 0.01) { const g = ctx.createRadialGradient(cx, cy, base * 0.4, cx, cy, Math.max(W, Hh) * 0.7); g.addColorStop(0, `rgba(170,180,255,${0.75 * flashA})`); g.addColorStop(0.3, `rgba(140,150,255,${0.38 * flashA})`); g.addColorStop(0.6, `rgba(255,143,177,${0.16 * flashA})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); }
    // the galaxy fades in as we pass through the cloth
    const gal = clamp((p - 0.66) / 0.18); if (gal > 0) drawGalaxy(gal, time);
    // elements: back ones, then globe, then front ones
    const front = [], back = [];
    items.forEach((it) => {
      if (it.gone) return;
      const k = eio((p - it.t0) / 0.2);
      if (k >= 1) { it.gone = true; ripple = Math.min(1, ripple + 0.35); return; }
      const d = R * (it.dist * (1 - k) + 0.85 * k);
      const th = it.th + time * it.spin * (1 - k), ph = it.ph + Math.sin(time * 0.6 + it.bob) * 0.08;
      const q = proj(d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph), d * Math.sin(ph) * Math.sin(th), cx, cy);
      if (q[2] < -F + 60) return;
      const a = clamp(1 - k * 1.1) * clamp(1 - pass * 2) * clamp(time / 1.2);
      (q[2] > 0 ? back : front).push([it, q, a]);
    });
    back.sort((a, b) => b[1][2] - a[1][2]).forEach(([it, q, a]) => drawItem(it, q, a * 0.6));
    const globeA = clamp(time / 0.9) * (1 - clamp((p - 0.8) / 0.08));
    if (globeA > 0) drawGlobe(R, cx, cy, globeA * (inside ? 0.8 : 1), beat, inside);
    front.sort((a, b) => b[1][2] - a[1][2]).forEach(([it, q, a]) => drawItem(it, q, a));
    // white-out as we break through the cloth
    const wo = Math.max(0, 1 - Math.abs(p - 0.78) / 0.07) * 0.85; if (wo > 0) { ctx.fillStyle = `rgba(255,255,255,${wo})`; ctx.fillRect(0, 0, W, Hh); }
    if (hint) hint.style.opacity = String(autoplay ? 0 : clamp(1 - p * 6) * clamp((time - 0.8) / 1));
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (p > 0.86 && !welcomeAt) welcome(now);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  /* ---------------------------------------------------------------- welcome in the galaxy, then home */
  const BEATS = [['Describe your idea in one sentence.', [0]], ['Specialists design, write and build it.', [1, 2, 3, 4, 5, 6, 7]], ['They test, secure and optimise every page.', [8, 9, 10, 14]], ['You refine every pixel, then launch.', [11, 12, 13, 15]]];
  const beatEl = el.querySelector('[data-splash-beat]'), dots = el.querySelector('[data-splash-dots]');
  if (dots) dots.innerHTML = BEATS.map(() => '<i></i>').join('');
  const timers = []; const at = (s, fn) => timers.push(setTimeout(fn, s * 1000));
  function welcome(now) {
    welcomeAt = now; el.classList.add('is-galaxy', 'is-text'); at(0.35, () => el.classList.add('is-team'));
    const len = seen ? 0 : 0.95;
    if (!seen && beatEl) BEATS.forEach(([line, who], i) => at(0.8 + i * len, () => {
      beatEl.classList.remove('is-on'); void beatEl.offsetWidth; beatEl.textContent = line; beatEl.classList.add('is-on');
      team && [...team.children].forEach((sp, k) => sp.classList.toggle('is-lit', who.includes(k)));
      dots && [...dots.children].forEach((d, k) => d.classList.toggle('is-on', k <= i));
    }));
    at(seen ? 1.1 : 0.8 + BEATS.length * len + 0.9, exit);
  }
  function exit() {
    if (exiting) return; exiting = true; timers.forEach(clearTimeout);
    el.classList.add('is-out'); resolveDone(); H.classList.remove('has-splash');
    removeEventListener('wheel', onWheel); removeEventListener('touchmove', onTouchMove); removeEventListener('keydown', onKey); removeEventListener('touchstart', onTouchStart);
    setTimeout(() => { cancelAnimationFrame(raf); el.remove(); }, 1300);
  }
  el.querySelector('[data-splash-skip]').addEventListener('click', (e) => { e.stopPropagation(); exit(); });
})();
