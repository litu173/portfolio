/* LOOM — immersive intro.
   Screen 1: far away in a dark galaxy, a small globe spun from hundreds of fine woven threads turns
             on its own, with UI elements floating around it. Beneath it, a light at the centre of the
             screen beats in a heart rhythm (lub-dub), and each beat spreads across the screen like a
             ripple on water.
   Scroll:   everything is scrubbed by scroll, never automatic. Scrolling forward (wheel, trackpad,
             touch, arrows, Page Down, Space) smoothly draws the floating elements into the globe and
             grows it. Scrolling back reverses it, frame by frame.
   Screen 2: the globe dissolves into a very dark galaxy lit by drifting northern lights. “Welcome to
             Loom”, the agent team and a Get started button appear. Get started (or Esc / Skip)
             opens the home page, whose headline then assembles itself.
   It plays on every visit and reload. Reduced motion goes straight to the page.
   Exposes window.LoomSplash.done: a promise that resolves as the home page is revealed. */
(() => {
  'use strict';
  const el = document.querySelector('[data-splash]');
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  window.LoomSplash = { done };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce) { if (el) el.remove(); resolveDone(); return; }
  const H = document.documentElement; H.classList.add('has-splash');

  /* ---------------------------------------------------------------- team */
  const TEAM = [['✦', '#F5F5F7', 'Director'], ['⌘', '#6E8BFF', 'Architect'], ['◐', '#A78BFA', 'Iris'], ['◆', '#FF8FB1', 'Hue'], ['¶', '#F2C46D', 'Quill'], ['◎', '#FF6B4A', 'Mark'], ['✎', '#5ED6C4', 'Ink'], ['∿', '#7FCFA5', 'Kinetic'], ['✓', '#4FC3F7', 'Probe'], ['⛨', '#FF5C7A', 'Sentinel'], ['⌕', '#C6F36B', 'Signal'], ['↗', '#FFB86B', 'Boost'], ['⇪', '#9AA4FF', 'Relay'], ['⊕', '#E6A6FF', 'Merchant'], ['▦', '#56B4E9', 'Datum'], ['⟲', '#B8C0CC', 'Keeper']];
  const team = el.querySelector('[data-splash-team]');
  if (team) team.innerHTML = TEAM.map(([g, c, n]) => `<span style="--c:${c}" title="${n}">${g}</span>`).join('');

  /* ---------------------------------------------------------------- canvas + maths */
  const cv = el.querySelector('canvas'); const ctx = cv.getContext('2d');
  const STOPS = [[110, 139, 255], [127, 207, 165], [242, 196, 109], [255, 143, 177], [167, 139, 250], [110, 139, 255]];
  const col = (t) => { t = ((t % 1) + 1) % 1; const n = STOPS.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i, a = STOPS[i], b = STOPS[i + 1]; return a.map((v, k) => Math.round(v + (b[k] - v) * f)); };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rnd = (() => { let s = 20260926; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  let W = 0, Hh = 0, dpr = 1, sky = null, auroraTex = null;
  function size() { dpr = Math.min(1.75, devicePixelRatio || 1); W = innerWidth; Hh = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; sky = null; }
  size(); addEventListener('resize', size);

  /* ---------------------------------------------------------------- input → target progress (scrub only) */
  let target = 0, p = 0, exiting = false;
  const setT = (v) => { if (!exiting) target = clamp(v); };
  const onWheel = (e) => { e.preventDefault(); setT(target + (e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY) / (innerHeight * 5)); };
  let ty = null; const onTouchStart = (e) => { ty = e.touches[0].clientY; }; const onTouchMove = (e) => { if (ty == null) return; e.preventDefault(); const y = e.touches[0].clientY; setT(target + (ty - y) / (innerHeight * 3.4)); ty = y; };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); exit(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-splash] button')) return; // let buttons work
    const k = { ArrowDown: 0.05, PageDown: 0.14, ' ': 0.09, ArrowUp: -0.05, PageUp: -0.14, Home: -1, End: 1 }[e.key];
    if (k != null) { e.preventDefault(); setT(target + k); }
  };
  addEventListener('wheel', onWheel, { passive: false }); addEventListener('touchstart', onTouchStart, { passive: true }); addEventListener('touchmove', onTouchMove, { passive: false }); addEventListener('keydown', onKey);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / W - 0.5; mouse.ty = e.clientY / Hh - 0.5; }, { passive: true });

  /* ---------------------------------------------------------------- floating elements (positions are pure functions of p → reversible) */
  const LABELS = ['AI', 'Python', 'Java', 'E-commerce', 'Sales', 'Robot', 'Dashboard', 'Website', 'Client', 'Enterprise', 'Team', 'Cloud', 'API', 'Data', 'SaaS', 'Startup', 'Mobile app', 'Analytics', 'Security', 'Marketing', 'Payments', 'CRM', 'JavaScript', 'Growth', 'Automation', 'Brand', 'Investors', 'Customers', 'Launch', 'Product'];
  const SW = ['#6E8BFF', '#7FCFA5', '#F2C46D', '#FF8FB1', '#A78BFA', '#5ED6C4', '#FF6B4A'];
  const items = [];
  const N = Math.min(46, Math.round(26 + (W * Hh) / 60000));
  for (let i = 0; i < N; i++) {
    const kind = ['chip', 'spark', 'agent', 'thread', 'swatch', 'spark', 'chip', 'thread'][i % 8];
    items.push({ kind, th: rnd() * Math.PI * 2, ph: 0.35 + rnd() * (Math.PI - 0.7), dist: 2.3 + rnd() * 2.3, spin: (0.06 + rnd() * 0.12) * (rnd() < 0.5 ? 1 : -1), bob: rnd() * 6.28,
      t0: 0.03 + (i / N) * 0.5 + rnd() * 0.03, label: LABELS[i % LABELS.length], agent: TEAM[i % TEAM.length], color: SW[i % SW.length] });
  }

  /* ---------------------------------------------------------------- 3D */
  const F = 1000; let rotY = 0, rotX = 0;
  const HEARTBEAT = false; // the light beat is paused for now; set true to bring it back
  function proj(x, y, z, cx, cy) {
    const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX);
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY; const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
    const s = F / Math.max(60, F + z2); return [cx + x1 * s, cy + y1 * s, z2, s];
  }

  /* ---------------------------------------------------------------- the globe: hundreds of fine woven threads */
  const LAT = 30, LON = 46, SEG = 84;
  function drawGlobe(R, cx, cy, alpha, glow, time = 0) {
    const lat = (i) => -Math.PI / 2 + ((i + 1) / (LAT + 1)) * Math.PI;
    const ptLat = (i, a) => { const la = lat(i); return proj(R * Math.cos(la) * Math.cos(a), R * Math.sin(la), R * Math.cos(la) * Math.sin(a), cx, cy); };
    const ptLon = (j, b) => { const lo = (j / LON) * Math.PI * 2; return proj(R * Math.cos(b) * Math.cos(lo), R * Math.sin(b), R * Math.cos(b) * Math.sin(lo), cx, cy); };
    const bw = clamp(R * 0.011, 0.55, 5.5);
    const path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); };
    const runs = (sample, n, near) => { const out = []; let cur = []; for (let k = 0; k <= n; k++) { const q = sample(k / n); const isNear = q[2] <= 0; if (isNear === near && q[2] > -F + 80) cur.push(q); else if (cur.length) { out.push(cur); cur = []; } } if (cur.length > 1) out.push(cur); return out; };
    ctx.lineCap = 'round';
    [false, true].forEach((near) => {
      const a0 = alpha * (near ? 0.95 : 0.2);
      for (let i = 0; i < LAT; i++) { const c = col(i / LAT * 0.85 + 0.02); ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a0})`; runs((t) => ptLat(i, t * Math.PI * 2), SEG, near).forEach((r) => { if (r.length < 2) return; ctx.lineWidth = bw * r[r.length >> 1][3]; path(r); ctx.stroke(); }); }
      for (let j = 0; j < LON; j++) { const c = col(0.4 + j / LON * 0.85); ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a0})`; runs((t) => ptLon(j, -Math.PI / 2 + 0.12 + t * (Math.PI - 0.24)), SEG, near).forEach((r) => { if (r.length < 2) return; ctx.lineWidth = bw * 0.85 * r[r.length >> 1][3]; path(r); ctx.stroke(); }); }
      if (!near) return;
      // over–under: where a latitude crosses over a longitude, lift it with a tiny shadow gap
      for (let i = 0; i < LAT; i++) {
        const c = col(i / LAT * 0.85 + 0.02);
        for (let j = i % 2; j < LON; j += 2) {
          const a = (j / LON) * Math.PI * 2, d = (Math.PI * 2 / LON) * 0.36;
          const q0 = ptLat(i, a - d), q1 = ptLat(i, a), q2 = ptLat(i, a + d); if (q1[2] > -R * 0.12 || bw * q1[3] < 1.1) continue;
          const w = bw * q1[3];
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]);
          ctx.lineWidth = w + Math.min(1.6, w * 0.6); ctx.strokeStyle = `rgba(3,4,12,${alpha * 0.75})`; ctx.stroke();
          ctx.lineWidth = w; ctx.strokeStyle = `rgba(${Math.min(255, c[0] + 30)},${Math.min(255, c[1] + 30)},${Math.min(255, c[2] + 30)},${alpha})`; ctx.stroke();
        }
      }
    });
    drawLightning(R, cx, cy, alpha, time, ptLon, bw);
    ctx.lineCap = 'butt';
    if (glow > 0.01) { // inner light as elements are woven in
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1); g.addColorStop(0, `rgba(190,200,255,${0.28 * glow * alpha})`); g.addColorStop(0.7, `rgba(150,120,255,${0.08 * glow * alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------------------------------------------------------------- lightning: energy runs down the threads
     Every longitude thread has its own slow rhythm: now and then a soft pulse in that thread's colour glides from
     the top pole down to the bottom pole with a fading trail, so different threads light up at different moments
     (something is being made in there). The poles themselves stay dark. */
  const h01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const BOLTS = Array.from({ length: LON }, (_, j) => ({ period: 5.5 + h01(j) * 7, off: h01(j + 91) * 12, dur: 2.8 + h01(j + 47) * 1.6 }));
  const B0 = -Math.PI / 2 + 0.12, B1 = Math.PI / 2 - 0.12;
  const poleGlow = (q, r, a, rgb) => { const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(0.35, `rgba(${rgb},${(a * 0.35).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.283); ctx.fill(); };
  function drawLightning(R, cx, cy, alpha, time, ptLon, bw) {
    if (alpha < 0.02) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    BOLTS.forEach((bo, j) => {
      const tt = (time + bo.off) % bo.period; if (tt > bo.dur) return;
      const u = tt / bo.dur;                                        // 0 at the top pole → 1 at the bottom
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // slow start, glide, slow landing
      const head = e * 1.16 - 0.08;
      const env = Math.min(1, u / 0.12, (1 - u) / 0.14);            // fades in at the source, out at the bottom
      const trail = 0.22 + 0.1 * h01(j + 7), N = 22;
      const c = col(0.4 + j / LON * 0.85), rgb = `${c[0]},${c[1]},${c[2]}`;
      let prev = null;
      for (let k = 0; k <= N; k++) {
        const t = head - trail + (k / N) * trail; if (t < 0 || t > 1) { prev = null; continue; }
        const q = ptLon(j, B0 + t * (B1 - B0)); const near = q[2] <= 0;
        if (prev) {
          const f = k / N, a = alpha * env * f * f * (near ? 0.6 : 0.16), w = bw * q[3];
          if (a > 0.008) {
            ctx.strokeStyle = `rgba(${rgb},${(a * 0.3).toFixed(3)})`; ctx.lineWidth = w * 4;
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
            ctx.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`; ctx.lineWidth = w * 1.35;
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          }
          if (k === N && a > 0.015) poleGlow(q, w * 4.5, a * 0.7, rgb);   // soft tip in the thread's colour
        }
        prev = q;
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------------------------------------------------------- deep sky (stars + faint nebula), northern lights */
  // tiny, dense starfield in three depth layers; the nearer layers drift slowly (flying through space)
  const stars = []; for (let i = 0; i < 1400; i++) { const layer = i % 3; stars.push({ x: rnd(), y: rnd(), r: layer === 0 ? 0.35 + rnd() * 0.35 : layer === 1 ? 0.5 + rnd() * 0.45 : 0.7 + rnd() * 0.6, a: 0.2 + rnd() * 0.7, tw: rnd() * 6.28, sp: 0.4 + rnd() * 1.8, v: [0.004, 0.009, 0.018][layer] }); }
  const shooters = []; let nextShot = 1.2;
  function buildSky() {
    const g = document.createElement('canvas'); g.width = Math.round(W * dpr); g.height = Math.round(Hh * dpr); const c = g.getContext('2d'); c.scale(dpr, dpr);
    c.fillStyle = '#010106'; c.fillRect(0, 0, W, Hh); c.globalCompositeOperation = 'lighter';
    [[0.2, 0.25, '#1E1650'], [0.8, 0.3, '#0A2A40'], [0.6, 0.85, '#241034']].forEach(([x, y, color]) => { const r = Math.max(W, Hh) * 0.6; const gr = c.createRadialGradient(W * x, Hh * y, 0, W * x, Hh * y, r); gr.addColorStop(0, color + '24'); gr.addColorStop(1, color + '00'); c.fillStyle = gr; c.fillRect(0, 0, W, Hh); });
    return g;
  }
  function drawStars(time, dt, dim) {
    for (const s of stars) {
      s.x -= s.v * dt * 0.35; s.y += s.v * dt * 0.12; if (s.x < -0.01) s.x += 1.02; if (s.y > 1.01) s.y -= 1.02;
      const a = s.a * (0.55 + 0.45 * Math.sin(time * s.sp + s.tw)) * dim; if (a < 0.03) continue;
      ctx.fillStyle = `rgba(230,236,255,${a.toFixed(3)})`; ctx.fillRect(s.x * W, s.y * Hh, s.r, s.r);
    }
    // shooting stars: a thin bright streak with a fading tail, every few seconds
    if (time > nextShot) { nextShot = time + 1.6 + rnd() * 3.2; const ang = Math.PI * (0.12 + rnd() * 0.18) * (rnd() < 0.5 ? 1 : -1) + (rnd() < 0.5 ? 0 : Math.PI); shooters.push({ x: rnd() * W, y: rnd() * Hh * 0.7, vx: Math.cos(ang) * (650 + rnd() * 500), vy: Math.abs(Math.sin(ang)) * (260 + rnd() * 240), life: 0, max: 0.7 + rnd() * 0.6, len: 90 + rnd() * 140 }); }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const m = shooters[i]; m.life += dt; if (m.life > m.max) { shooters.splice(i, 1); continue; }
      m.x += m.vx * dt; m.y += m.vy * dt; const k = m.life / m.max, a = Math.sin(k * Math.PI) * dim;
      const sp = Math.hypot(m.vx, m.vy), tx = m.x - (m.vx / sp) * m.len, ty = m.y - (m.vy / sp) * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty); g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(0.2, `rgba(190,205,255,${0.4 * a})`); g.addColorStop(1, 'rgba(160,180,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(m.x - 0.8, m.y - 0.8, 1.6, 1.6);
    }
  }
  function buildAurora() {
    const t = document.createElement('canvas'); t.width = 1; t.height = 256; const c = t.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.35)'); g.addColorStop(0.88, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 1, 256); return t;
  }
  const CURTAINS = [{ c: '#35F2A2', y: 0.34, amp: 0.1, f: 1.6, s: 0.16, h: 0.36, ph: 0 }, { c: '#22C7E0', y: 0.28, amp: 0.08, f: 2.3, s: -0.12, h: 0.28, ph: 2 }, { c: '#8A5CFF', y: 0.46, amp: 0.12, f: 1.2, s: 0.09, h: 0.32, ph: 4 }, { c: '#2BE39A', y: 0.62, amp: 0.07, f: 2.8, s: -0.2, h: 0.22, ph: 1 }];
  const tinted = new Map();
  function tint(color) { if (tinted.has(color)) return tinted.get(color); if (!auroraTex) auroraTex = buildAurora(); const t = document.createElement('canvas'); t.width = 1; t.height = 256; const c = t.getContext('2d'); c.drawImage(auroraTex, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, 1, 256); tinted.set(color, t); return t; }
  function drawAurora(alpha, time) {
    ctx.globalCompositeOperation = 'lighter';
    CURTAINS.forEach((cu) => {
      const tex = tint(cu.c); const step = Math.max(2, Math.round(W / 480));
      for (let x = -20; x < W + 20; x += step) {
        const u = x / W; const wave = Math.sin(u * cu.f * 6.283 + time * cu.s * 6.283 + cu.ph) * 0.6 + Math.sin(u * cu.f * 2.1 * 6.283 - time * cu.s * 3 + cu.ph * 2) * 0.4;
        const y = Hh * (cu.y + wave * cu.amp); const hgt = Hh * cu.h * (0.55 + 0.45 * Math.sin(u * 9 + time * 0.7 + cu.ph));
        const shimmer = 0.5 + 0.5 * Math.pow(Math.sin(u * 7 + time * 0.9 + cu.ph) * 0.5 + 0.5, 1.6) * (0.85 + 0.15 * Math.sin(u * 31 + time * 2 + cu.ph));
        ctx.globalAlpha = alpha * 0.42 * shimmer; ctx.drawImage(tex, x, y - hgt, step + 1, hgt);
      }
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------------------------------------------------------- the heart: a sleeping soul in the galaxy
     A slow resting beat (about 48 bpm): a soft “lub”, a fainter “dub”, then a long quiet exhale.
     Each beat lifts the light of the whole screen from a source beneath the globe, then lets it sink. */
  const BEAT = 1.25;
  const heartAt = (t) => { const ph = t % BEAT; const env = (c, rise, fall) => { const d = ph - c; return d < 0 ? Math.exp(-Math.pow(d / rise, 2)) : Math.exp(-d / fall); };
    return clamp(env(0.1, 0.07, 0.34) + 0.55 * env(0.42, 0.07, 0.5) - 0.08); };
  function drawHeart(time, cx, cy, amp) {
    if (amp < 0.01) return 0;
    const b = heartAt(time) * amp, breath = (0.5 + 0.5 * Math.sin(time * 0.35)) * amp; // beat + very slow breathing
    ctx.globalCompositeOperation = 'lighter';
    // the whole screen glows from the source, deepest at the centre, never a hard edge
    const R = Math.hypot(W, Hh) * (0.62 + 0.1 * b);
    const g = ctx.createRadialGradient(cx, cy + Hh * 0.04, 0, cx, cy + Hh * 0.04, R);
    g.addColorStop(0, `rgba(150,160,255,${0.025 + 0.32 * b + 0.02 * breath})`);
    g.addColorStop(0.18, `rgba(110,110,235,${0.01 + 0.2 * b})`);
    g.addColorStop(0.5, `rgba(80,60,170,${0.1 * b})`);
    g.addColorStop(1, `rgba(40,30,90,${0.03 * b})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    // the source itself: a small warm-white core beneath the globe
    const cr = Math.min(W, Hh) * (0.09 + 0.05 * b);
    const c = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr); c.addColorStop(0, `rgba(245,240,255,${0.12 + 0.5 * b})`); c.addColorStop(1, 'rgba(160,150,255,0)');
    ctx.fillStyle = c; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    ctx.globalCompositeOperation = 'source-over';
    return b;
  }

  /* ---------------------------------------------------------------- elements */
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawItem(it, x, y, k, a) {
    if (a < 0.01) return; ctx.globalAlpha = a;
    if (it.kind === 'chip') {
      ctx.font = `500 ${Math.max(8, Math.round(12 * k))}px "JetBrains Mono", ui-monospace, monospace`; const w = ctx.measureText(it.label).width + 26 * k, h = 26 * k;
      roundRect(x - w / 2, y - h / 2, w, h, 8 * k); ctx.fillStyle = 'rgba(14,15,26,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = it.color; ctx.fillRect(x - w / 2 + 9 * k, y - 2.5 * k, 5 * k, 5 * k);
      ctx.fillStyle = 'rgba(232,236,246,.9)'; ctx.textBaseline = 'middle'; ctx.fillText(it.label, x - w / 2 + 18 * k, y + 0.5);
    } else if (it.kind === 'agent') {
      const r = 15 * k; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = 'rgba(10,11,20,.9)'; ctx.fill(); ctx.strokeStyle = it.agent[1]; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = it.agent[1]; ctx.font = `${Math.round(13 * k)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.agent[0], x, y + 1); ctx.textAlign = 'left';
    } else if (it.kind === 'swatch') {
      ctx.beginPath(); ctx.arc(x, y, 9 * k, 0, 6.283); ctx.fillStyle = it.color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (it.kind === 'thread') {
      const len = 40 * k, ang = it.bob; ctx.lineCap = 'round'; ctx.lineWidth = 2.2 * k; ctx.strokeStyle = it.color; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); ctx.quadraticCurveTo(x + Math.sin(ang) * 9 * k, y - Math.cos(ang) * 9 * k, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); ctx.stroke(); ctx.lineCap = 'butt';
    } else {
      const r = 2.4 * k; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- DOM layer of screen 2 */
  const txt = el.querySelector('.splash__text'), parts = txt ? [...txt.querySelectorAll('[data-reveal]')] : [];
  const go = el.querySelector('[data-splash-go]'), hint = el.querySelector('[data-splash-hint]'), bar = el.querySelector('[data-splash-bar]');
  const teamIcons = team ? [...team.children] : [];
  let goOn = false;
  function paintDOM(tt) {
    parts.forEach((n, i) => { const k = smooth(i * 0.12, i * 0.12 + 0.45, tt); n.style.opacity = k.toFixed(3); n.style.transform = `translate3d(0, ${((1 - k) * 26).toFixed(1)}px, 0)`; n.style.filter = k < 0.99 ? `blur(${((1 - k) * 8).toFixed(1)}px)` : ''; });
    teamIcons.forEach((n, i) => { const k = smooth(0.35 + i * 0.022, 0.62 + i * 0.022, tt); n.style.opacity = k.toFixed(3); n.style.transform = `translate3d(0, ${((1 - k) * 18).toFixed(1)}px, 0) scale(${(0.7 + 0.3 * k).toFixed(3)})`; });
    const on = tt > 0.92; if (on !== goOn) { goOn = on; go.tabIndex = on ? 0 : -1; go.setAttribute('aria-hidden', String(!on)); el.classList.toggle('is-ready', on); }
    txt.style.visibility = tt > 0.001 ? 'visible' : 'hidden';
  }

  /* ---------------------------------------------------------------- frame */
  let raf = 0, last = performance.now(); const t0 = last;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const time = (now - t0) / 1000;
    p += (target - p) * (1 - Math.exp(-dt * 4.2)); if (Math.abs(target - p) < 0.0002) p = target;   // butter-smooth scrub
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3)); mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
    rotY = time * 0.14 + p * 2.4 + mouse.x * 0.5; rotX = mouse.y * 0.45;   // mouse at centre → straight-on front view
    const cx = W / 2 + mouse.x * -18, cy = Hh / 2 + Math.sin(time * 0.55) * 6 + mouse.y * -12;
    const base = Math.min(W, Hh) * 0.12;
    const grow = Math.pow(smooth(0, 0.78, p), 1.35), bloom = smooth(0.55, 0.95, p);
    const R = base * (1 + grow * 4.8) * (1 + bloom * 5);
    const loom = smooth(0.66, 0.97, p);                      // screen 2 blend
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!sky) sky = buildSky();
    ctx.drawImage(sky, 0, 0, W, Hh);
    // tiny drifting stars + shooting stars (dimmer on screen 2 so it reads very dark)
    drawStars(time, dt, 1 - loom * 0.3);
    // heartbeat light underneath the globe (fades as the journey begins)
    const heartAmp = HEARTBEAT ? (1 - smooth(0.05, 0.5, p)) * smooth(0, 1.5, time) : 0;
    const beatNow = drawHeart(time, cx, cy, heartAmp) || 0;
    // elements: pure functions of p, so every frame is reversible
    let glow = 0; const back = [], front = [];
    items.forEach((it) => {
      const k = smooth(it.t0, it.t0 + 0.26, p); glow += Math.exp(-Math.pow((k - 0.85) / 0.12, 2)) * 0.08;
      const orbit = base * (1 + grow * 1.6) * it.dist, surface = R * 0.96;
      const d = orbit + (surface - orbit) * k;
      const th = it.th + time * it.spin * (1 - k * 0.7), ph = it.ph + Math.sin(time * 0.4 + it.bob) * 0.12;
      const q = proj(d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph), d * Math.sin(ph) * Math.sin(th), cx, cy);
      if (q[2] < -F + 90) return;
      const a = (1 - smooth(0.72, 1, k)) * smooth(0, 1.4, time) * (1 - loom);
      (q[2] > 0 ? back : front).push([it, q, a, clamp(q[3], 0.45, 1.1) * 0.78 * (0.7 + 0.3 * (1 - k))]);
    });
    back.sort((a, b) => b[1][2] - a[1][2]).forEach(([it, q, a, k]) => drawItem(it, q[0], q[1], k, a * 0.55));
    const globeA = smooth(0, 1.1, time) * (1 - smooth(0.62, 0.92, p));
    if (globeA > 0.005) drawGlobe(R, cx, cy, globeA, clamp(glow + bloom * 0.8 + beatNow * 0.5), time);
    front.sort((a, b) => b[1][2] - a[1][2]).forEach(([it, q, a, k]) => drawItem(it, q[0], q[1], k, a));
    // screen 2: very dark galaxy + northern lights, blended in (never a cut)
    if (loom > 0.001) {
      ctx.fillStyle = `rgba(1,2,8,${(loom * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, W, Hh);
      drawAurora(loom, time);
      const v = ctx.createRadialGradient(W / 2, Hh * 0.5, Math.min(W, Hh) * 0.1, W / 2, Hh * 0.5, Math.max(W, Hh) * 0.75); v.addColorStop(0, `rgba(2,3,10,${0.35 * loom})`); v.addColorStop(1, `rgba(0,0,0,${0.55 * loom})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, Hh);
    }
    // soft light bloom while passing into the globe (bridges the two screens)
    const pass = Math.max(0, 1 - Math.abs(p - 0.8) / 0.14) * 0.32;
    if (pass > 0.005) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) * 0.7); g.addColorStop(0, `rgba(220,225,255,${pass})`); g.addColorStop(1, 'rgba(220,225,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); }
    if (hint) hint.style.opacity = String((1 - smooth(0.01, 0.08, p)) * smooth(1, 2.2, time));
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (txt) paintDOM(smooth(0.8, 1, p));
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  /* ---------------------------------------------------------------- leave → home (headline assembles itself) */
  function exit() {
    if (exiting) return; exiting = true;
    el.classList.add('is-out'); H.classList.remove('has-splash');
    removeEventListener('wheel', onWheel); removeEventListener('touchmove', onTouchMove); removeEventListener('keydown', onKey); removeEventListener('touchstart', onTouchStart);
    setTimeout(resolveDone, 250);
    setTimeout(() => { cancelAnimationFrame(raf); el.remove(); }, 1400);
  }
  go.addEventListener('click', exit);
  el.querySelector('[data-splash-skip]').addEventListener('click', (e) => { e.stopPropagation(); exit(); });
})();
