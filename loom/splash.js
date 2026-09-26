/* LOOM — splash screen ("the grand welcome").
   Threads fly in from every edge and weave themselves into the Loom mark. A shuttle of light runs
   through the cloth, the name rises, the agent team checks in one by one, and then the splash
   pulls apart in thread-bands to reveal the page.
   The first visit in a session gets the full ~3.6s welcome; later visits get a short one. Skip it
   with any key, a click, or the Skip button. Reduced motion skips it entirely.
   Exposes window.LoomSplash.done, a promise that resolves as the reveal starts. */
(() => {
  'use strict';
  const el = document.querySelector('[data-splash]');
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  window.LoomSplash = { done };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false; try { seen = sessionStorage.getItem('loom-welcomed') === '1'; sessionStorage.setItem('loom-welcomed', '1'); } catch (e) { /* storage blocked */ }
  if (!el || reduce) { if (el) el.remove(); resolveDone(); return; }
  document.documentElement.classList.add('has-splash');
  const TEAM = [['✦', '#F5F5F7'], ['⌘', '#6E8BFF'], ['◐', '#A78BFA'], ['◆', '#FF8FB1'], ['¶', '#F2C46D'], ['◎', '#FF6B4A'], ['✎', '#5ED6C4'], ['∿', '#7FCFA5'], ['✓', '#4FC3F7'], ['⛨', '#FF5C7A'], ['⌕', '#C6F36B'], ['↗', '#FFB86B'], ['⇪', '#9AA4FF'], ['⊕', '#E6A6FF'], ['▦', '#56B4E9'], ['⟲', '#B8C0CC']];
  const team = el.querySelector('[data-splash-team]');
  if (team) team.innerHTML = TEAM.map(([g, c], i) => `<span style="--c:${c};--i:${i}">${g}</span>`).join('');

  const cv = el.querySelector('canvas'); const ctx = cv.getContext('2d');
  const STOPS = [[110, 139, 255], [127, 207, 165], [242, 196, 109], [255, 143, 177], [167, 139, 250]];
  const col = (t) => { const n = STOPS.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i, a = STOPS[i], b = STOPS[i + 1]; return a.map((v, k) => Math.round(v + (b[k] - v) * f)); };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const eo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
  size(); addEventListener('resize', size);

  const N = 7; // 7 × 7 weave
  const T = seen ? { weave: 0.7, shuttle: 0.35, shrink: 0.45, hold: 0.4, total: 2.2 } : { weave: 1.7, shuttle: 0.9, shrink: 0.7, hold: 5.2, total: 8.6 };
  const t0 = performance.now(); let exiting = false, raf = 0;

  function draw(now) {
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const shrinkT = eio(clamp((t - T.weave - T.shuttle) / T.shrink));
    const big = Math.min(W, H) * 0.34, small = Math.min(92, Math.min(W, H) * 0.16);
    const S = big + (small - big) * shrinkT;                                // woven square size
    const cx = W / 2, cy = H / 2 - (H * 0.2) * shrinkT;                     // rises to make room for the text
    const gap = S / N, rw = gap * 0.64, x0 = cx - S / 2 + gap / 2, y0 = cy - S / 2 + gap / 2;
    const rot = (1 - shrinkT) * 0.0 + Math.sin(t * 0.8) * 0.02 * (1 - shrinkT);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot - 0.0); ctx.translate(-cx, -cy);
    // each thread flies in from off-screen with a stagger; wefts from left/right, warps from top/bottom
    const k = (idx, isWarp) => eo(clamp((t - (isWarp ? 0.12 : 0) - idx * 0.07) / (T.weave * 0.75)));
    const band = (x1, y1, x2, y2, rgb, a, w) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(6,6,10,${a})`; ctx.lineWidth = w + 3; ctx.stroke(); ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; ctx.lineWidth = w; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${a * 0.35})`; ctx.lineWidth = w * 0.2; ctx.stroke(); };
    const half = S / 2 + gap * 0.1;
    const weft = (j) => { const p = k(j, false), dir = j % 2 ? 1 : -1, off = (1 - p) * W * dir, y = y0 + j * gap + (1 - p) * Math.sin(j * 2.1) * 80; return [cx - half + off, y, cx + half + off, y, p]; };
    const warp = (i) => { const p = k(i, true), dir = i % 2 ? 1 : -1, off = (1 - p) * H * dir, x = x0 + i * gap + (1 - p) * Math.cos(i * 1.7) * 80; return [x, cy - half + off, x, cy + half + off, p]; };
    const lightRow = clamp((t - T.weave) / T.shuttle) * (N + 1) - 0.5;
    const glow = (j) => Math.max(0, 1 - Math.abs(lightRow - j) * 0.9) * (t > T.weave && t < T.weave + T.shuttle + 0.3 ? 1 : 0);
    for (let j = 0; j < N; j++) { const [a, b, c, d, p] = weft(j); band(a, b, c, d, col(j / (N - 1) * 0.55), clamp(p * 1.4) * (0.95), rw); }
    for (let i = 0; i < N; i++) { const [a, b, c, d, p] = warp(i); band(a, b, c, d, col(0.45 + i / (N - 1) * 0.55), clamp(p * 1.4) * 0.95, rw); }
    // over-under: redraw the weft where it passes over (only once threads have landed)
    for (let j = 0; j < N; j++) { const [, y, , , p] = weft(j); if (p < 0.98) continue; for (let i = (j + 1) % 2; i < N; i += 2) { const x = x0 + i * gap; band(x - gap * 0.5, y, x + gap * 0.5, y, col(j / (N - 1) * 0.55), 0.95, rw); } }
    // shuttle light
    if (t > T.weave && t < T.weave + T.shuttle + 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < N; j++) { const g = glow(j); if (g <= 0) continue; const y = y0 + j * gap; const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.55 * g})`); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = lg; ctx.fillRect(cx - half, y - rw / 2, half * 2, rw); }
      const sy = y0 + clamp(lightRow, 0, N - 1) * gap, sx = cx + Math.sin(t * 16) * half * 0.9;
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, gap * 2.2); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(1, 'rgba(160,180,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, gap * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // soft halo behind the mark
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.4); halo.addColorStop(0, `rgba(110,139,255,${0.16 + 0.1 * shrinkT})`); halo.addColorStop(1, 'rgba(110,139,255,0)');
    ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    if (!exiting || t < T.total + 1.2) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // text + team choreography (CSS classes drive transitions)
  const at = (s, fn) => setTimeout(fn, s * 1000);
  const textAt = T.weave + T.shuttle + T.shrink * 0.4;
  at(textAt, () => el.classList.add('is-text'));
  at(textAt + (seen ? 0.05 : 0.35), () => el.classList.add('is-team'));
  // the story: what Loom does, in four beats, lighting the agents who do each part
  const BEATS = [
    ['Describe your idea in one sentence.', [0]],
    ['Specialists design, write and build it.', [1, 2, 3, 4, 5, 6, 7]],
    ['They test, secure and optimise every page.', [8, 9, 10, 14]],
    ['You refine every pixel, then launch.', [11, 12, 13, 15]]
  ];
  const beatEl = el.querySelector('[data-splash-beat]'), dots = el.querySelector('[data-splash-dots]');
  if (dots) dots.innerHTML = BEATS.map(() => '<i></i>').join('');
  const beatStart = textAt + (seen ? 0.2 : 1.1), beatLen = seen ? 0 : (T.total - beatStart - 0.35) / BEATS.length;
  if (!seen && beatEl) BEATS.forEach(([line, who], i) => at(beatStart + i * beatLen, () => {
    beatEl.classList.remove('is-on'); void beatEl.offsetWidth; beatEl.textContent = line; beatEl.classList.add('is-on');
    team && [...team.children].forEach((sp, k) => sp.classList.toggle('is-lit', who.includes(k)));
    dots && [...dots.children].forEach((d, k) => d.classList.toggle('is-on', k <= i));
  }));
  const exitTimer = at(T.total, exit);
  function exit() {
    if (exiting) return; exiting = true; clearTimeout(exitTimer);
    el.classList.add('is-out'); resolveDone();
    document.documentElement.classList.remove('has-splash');
    setTimeout(() => { cancelAnimationFrame(raf); el.remove(); }, 1300);
  }
  const skip = (e) => { if (e.type === 'keydown' && ['Shift', 'Meta', 'Control', 'Alt'].includes(e.key)) return; exit(); };
  el.querySelector('[data-splash-skip]').addEventListener('click', (e) => { e.stopPropagation(); exit(); });
  el.addEventListener('click', skip); addEventListener('keydown', skip, { once: true });
  // screen readers: announce and let focus go straight to the page
  el.setAttribute('aria-hidden', 'true');
})();
