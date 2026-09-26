/* LOOM — the Loom AI panel in the editor.
   Tell the team what you want. The Director plans the work, specialists run in turn, and every change
   lands on the canvas as normal, editable elements and classes. Each run can be undone as one step.
   ⌘K focuses the prompt from anywhere. Type @ to hand work to a specific agent. */
(() => {
  'use strict';
  const A = window.LoomAgents, E = () => window.LoomEditor, L = window.Loom;
  const esc = L.esc;
  const state = { runs: [], busy: false, ai: null, draft: '', pid: null };
  const KEY = () => 'loom-ai:' + (E().project ? E().project.id : 'x');
  const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY()) || '[]'); return Array.isArray(j) ? j.map((r) => Object.assign(r, { snap: null, restored: true })) : []; } catch (e) { return []; } };
  const persist = () => { try { localStorage.setItem(KEY(), JSON.stringify(state.runs.slice(-25).map(({ snap, ...r }) => r))); } catch (e) { /* storage full or blocked */ } };

  const SUGGEST = [
    ['Launch check', 'Run a full launch check: QA, accessibility, security and SEO'],
    ['Make it premium', 'Make it feel more premium and luxurious'],
    ['Design a logo', 'Design a logo for this brand'],
    ['Add motion', 'Add subtle scroll and hover animations'],
    ['Add pricing', 'Add a pricing section'],
    ['Security scan', 'Scan the site for security issues and harden it'],
    ['Marketing plan', 'Write a two-week launch marketing plan'],
    ['Start selling', 'Set up e-commerce to sell our products'],
    ['Go live', 'Help me launch: hosting, domain and DNS'],
    ['New colours', 'Try a fresh colour palette']
  ];
  const LEVEL = { pass: ['✓', 'ok'], info: ['i', 'info'], warn: ['!', 'warn'], fail: ['×', 'fail'] };

  /* ---------------------------------------------------------------- render */
  let root = null;
  function render(el) {
    root = el;
    if (state.pid !== (E().project && E().project.id)) { state.pid = E().project && E().project.id; state.runs = load(); }
    el.innerHTML = '';
    el.classList.add('ai-host');
    const wrap = document.createElement('div'); wrap.className = 'ai';
    wrap.innerHTML = `
      <div class="pane__h ai__h"><span class="ai__title"><span class="ai__orb" aria-hidden="true"></span>Loom AI</span><span class="ai__mode" data-mode>Checking…</span></div>
      <div class="ai__team" role="list" aria-label="Agent team">${A.TEAM.map((a) => `<button type="button" role="listitem" class="ai__av" style="--c:${a.color}" data-mention="${a.id}" title="${esc(a.name)} · ${esc(a.role)} — ${esc(a.desc)}" aria-label="Mention ${esc(a.name)}, ${esc(a.role)}"><span>${a.glyph}</span></button>`).join('')}</div>
      <div class="ai__thread" data-thread aria-live="polite"></div>
      <form class="ai__composer" data-form>
        <label class="sr" for="ai-in">Ask your AI team</label>
        <textarea id="ai-in" rows="2" placeholder="Tell the team what you want… e.g. “Make it feel premium, add pricing, then run a launch check”" data-in></textarea>
        <div class="ai__bar"><span class="hint">⌘K · @ mention an agent · ⇧⏎ new line</span><button class="btn btn--blue ai__send" type="submit" data-send>Run</button></div>
      </form>`;
    el.append(wrap);
    const input = wrap.querySelector('[data-in]'); input.value = state.draft;
    input.addEventListener('input', () => { state.draft = input.value; grow(input); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } e.stopPropagation(); });
    wrap.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    wrap.querySelectorAll('[data-mention]').forEach((b) => b.addEventListener('click', () => { const a = A.byId(b.dataset.mention); input.value = `@${a.id} ${input.value.replace(/^@\w+\s*/, '')}`; state.draft = input.value; input.focus(); }));
    grow(input); drawThread(); mode();
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight + 2) + 'px'; }
  async function mode() {
    const st = await A.status(); state.ai = !!st.available;
    const m = root && root.querySelector('[data-mode]'); if (!m) return;
    m.className = 'ai__mode ' + (state.ai ? 'is-ai' : 'is-local');
    m.textContent = state.ai ? '● Claude' : '● Local agents';
    m.title = state.ai ? `Agents run on ${st.model} through your Loom server.` : st.offline ? 'Server not reachable. Built-in agents run in your browser.' : 'Built-in agents. To use Claude: pip install anthropic, set ANTHROPIC_API_KEY, restart server.py.';
  }
  function welcome() {
    const d = document.createElement('div'); d.className = 'ai__welcome';
    d.innerHTML = `<div class="ai__hero"><span class="ai__orb ai__orb--xl" aria-hidden="true"></span><h3>Your AI software company</h3><p>${A.TEAM.length - 1} specialists, from architect and brand designer to QA, security, SEO, DevOps and commerce. Describe the outcome you want. They plan it, build it and check it, and you can still edit everything by hand.</p></div>
      <div class="ai__chips">${SUGGEST.map(([l, q]) => `<button type="button" class="ai__chip" data-q="${esc(q)}">${esc(l)}</button>`).join('')}</div>`;
    d.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => run(b.dataset.q)));
    return d;
  }
  function drawThread() {
    const th = root && root.querySelector('[data-thread]'); if (!th) return;
    th.innerHTML = '';
    if (!state.runs.length) th.append(welcome());
    state.runs.forEach((r, i) => th.append(runCard(r, i)));
    if (state.runs.length) { const more = document.createElement('div'); more.className = 'ai__chips ai__chips--end'; more.innerHTML = SUGGEST.slice(0, 5).map(([l, q]) => `<button type="button" class="ai__chip" data-q="${esc(q)}">${esc(l)}</button>`).join(''); more.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => run(b.dataset.q))); th.append(more); }
    th.scrollTop = th.scrollHeight;
  }
  function avatar(id, cls = '') { const a = A.byId(id) || A.byId('director'); return `<span class="ai__av ai__av--s ${cls}" style="--c:${a.color}" aria-hidden="true"><span>${a.glyph}</span></span>`; }
  function runCard(r, idx) {
    const c = document.createElement('article'); c.className = 'ai__run' + (r.undone ? ' is-undone' : '');
    const total = (r.results || []).reduce((a, x) => a + (x.applied || 0), 0);
    c.innerHTML = `<div class="ai__you">${esc(r.request)}</div>
      <div class="ai__dir">${avatar('director')}<div><b>Director</b><p>${esc((r.plan && r.plan.reply) || 'Planning…')}</p></div></div>
      <ol class="ai__steps">${(r.plan ? r.plan.steps : []).map((s, i) => step(r, s, i)).join('')}</ol>
      ${r.done ? `<div class="ai__foot"><span>${total} change${total === 1 ? '' : 's'} · ${r.ai ? 'Claude' : 'local'} · ${(r.ms / 1000).toFixed(1)}s</span>${r.undone ? '<span class="ai__undone">Undone</span>' : r.snap ? `<button type="button" class="btn btn--ghost" data-undo="${idx}">Undo run</button>` : ''}</div>` : ''}`;
    c.querySelectorAll('[data-undo]').forEach((b) => b.addEventListener('click', () => undoRun(+b.dataset.undo)));
    c.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.action === 'publish') E().publish(); }));
    return c;
  }
  function step(r, s, i) {
    const a = A.byId(s.agent) || A.byId('maintainer'); const res = (r.results || [])[i]; const st = res ? 'done' : r.current === i ? 'working' : 'queued';
    const rep = res && res.report && res.report.length ? `<details class="ai__rep"${res.report.some((x) => x.level === 'fail' || x.level === 'warn') || s.agent === 'marketing' || s.agent === 'devops' ? ' open' : ''}><summary>${res.report.length} note${res.report.length > 1 ? 's' : ''}</summary><ul>${res.report.map((x) => { const [g, k] = LEVEL[x.level] || LEVEL.info; return `<li class="lv-${k}"><i aria-label="${x.level}">${g}</i><div><b>${esc(x.title)}</b>${x.detail ? `<span>${esc(x.detail)}</span>` : ''}</div></li>`; }).join('')}</ul></details>` : '';
    const acts = res && res.actions && res.actions.length ? `<div class="ai__acts">${res.actions.map((x) => `<button type="button" class="btn" data-action="${esc(x.id)}">${esc(x.label)}</button>`).join('')}</div>` : '';
    return `<li class="ai__step is-${st}">${avatar(a.id, st === 'working' ? 'is-busy' : '')}<div class="ai__sbody"><div class="ai__sh"><b>${esc(a.name)}</b><small>${esc(a.role)}</small>${res ? `<em>${res.applied ? `${res.applied} change${res.applied > 1 ? 's' : ''}` : 'report'}${res.source === 'ai' ? ' · Claude' : ''}</em>` : st === 'working' ? '<em class="ai__dots">working</em>' : '<em>queued</em>'}</div>
      <p>${esc(res ? res.reply || 'Done.' : s.task || '')}</p>${rep}${acts}</div></li>`;
  }

  /* ---------------------------------------------------------------- run */
  function submit() { const input = root && root.querySelector('[data-in]'); const q = (input ? input.value : '').trim(); if (!q) return; run(q); }
  async function run(q) {
    if (state.busy) { E().toast('The team is still working…'); return; }
    state.busy = true; state.draft = '';
    const input = root && root.querySelector('[data-in]'); if (input) { input.value = ''; grow(input); }
    setBusy(true);
    const snap = E().checkpoint(); const t0 = performance.now();
    const r = { request: q, plan: null, results: [], current: -1, done: false, snap, ai: false, ms: 0, at: Date.now() };
    state.runs.push(r); drawThread();
    try {
      await A.orchestrate(q, E().project, {
        onEvent: (e) => {
          if (e.type === 'start') r.ai = e.ai;
          if (e.type === 'plan') r.plan = e.plan;
          if (e.type === 'step' && e.state === 'working') r.current = e.index;
          if (e.type === 'step' && e.state === 'done') { r.results[e.index] = e.result; if (e.result.applied) E().refresh(); }
          drawThread();
        }
      });
    } catch (err) {
      r.plan = r.plan || { reply: 'Something went wrong.', steps: [] }; r.results.push({ agent: 'director', reply: err.message, report: [], applied: 0 });
    }
    r.done = true; r.ms = performance.now() - t0; r.current = -1;
    const total = r.results.reduce((a, x) => a + (x.applied || 0), 0);
    if (total) E().refresh(); else r.snap = null;
    state.busy = false; setBusy(false); persist(); drawThread();
    E().toast(total ? `${total} change${total > 1 ? 's' : ''} applied. Undo any time.` : 'Report ready');
  }
  function undoRun(i) {
    const r = state.runs[i]; if (!r || !r.snap) return;
    if (i !== state.runs.length - 1 && !confirm('Undo this run? Later runs will be undone too, because they built on it.')) return;
    E().restore(r.snap);
    state.runs.slice(i).forEach((x) => { x.undone = true; x.snap = null; });
    persist(); drawThread(); E().toast('Run undone');
  }
  function setBusy(b) { const s = root && root.querySelector('[data-send]'); if (s) { s.disabled = b; s.textContent = b ? 'Working…' : 'Run'; } root && root.classList.toggle('is-busy', b); }
  function focus() { const i = root && root.querySelector('[data-in]'); if (i) { i.focus(); i.select(); } }

  window.LoomAIPanel = { render, focus, run };
})();
