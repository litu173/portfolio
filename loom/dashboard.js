/* LOOM — dashboard: list, create, duplicate, rename, delete projects. */
(() => {
  'use strict';
  const L = window.Loom;
  const $ = (s, r = document) => r.querySelector(s);
  const toast = (m) => { const t = $('.toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); };
  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };
  let GUEST = false;
  const open = (id) => (location.href = `editor.html?project=${encodeURIComponent(id)}`);

  function thumb(p) {
    const wrap = document.createElement('div'); wrap.className = 'pcard__thumb'; wrap.title = 'Open in editor';
    const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-same-origin'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.loading = 'lazy';
    const home = p.pages.find((x) => x.slug === 'index') || p.pages[0];
    f.srcdoc = L.pageDoc(p, home, { extraHead: `<base href="${new URL(`../sites/${p.slug}/`, location.href).href}"><style>body{overflow:hidden}</style>` });
    wrap.append(f);
    new ResizeObserver(() => { f.style.transform = `scale(${wrap.clientWidth / 1280})`; }).observe(wrap);
    wrap.addEventListener('click', () => open(p.id));
    return wrap;
  }

  function codedCard() {
    const c = document.createElement('article'); c.className = 'pcard';
    c.innerHTML = `
      <div class="pcard__thumb" style="background:#0B100E"><iframe src="../index.html?preview=1" aria-hidden="true" tabindex="-1" loading="lazy"></iframe><span class="badge">Coded · GSAP</span></div>
      <div class="pcard__b"><h3>Mutaher Hossain — Portfolio</h3><p>Hand-coded cinematic site. Edit its content in the CMS, its look in the design system — or import it into Loom to design visually.</p></div>
      <div class="pcard__a">
        <a class="btn" href="../index.html" target="_blank" rel="noopener">View site ↗</a>
        <a class="btn" href="../admin/">Content CMS</a>
        <a class="btn" href="../design-system.html">Design system</a>
        <button class="btn btn--blue" type="button" data-import>Import into Loom</button>
      </div>`;
    const f = c.querySelector('iframe'); const w = c.querySelector('.pcard__thumb');
    new ResizeObserver(() => { f.style.transform = `scale(${w.clientWidth / 1280})`; }).observe(w);
    c.querySelector('[data-import]').addEventListener('click', async (e) => { e.target.disabled = true; e.target.textContent = 'Importing…'; const p = await L.portfolioProject(); await L.save(p); open(p.id); });
    return c;
  }

  async function render() {
    if (window.LoomHQ && render.done) LoomHQ.refresh(); render.done = true;
    $('[data-coded]').replaceChildren(codedCard());
    const box = $('[data-projects]'); const list = await L.list();
    if (!list.length) { box.innerHTML = '<p class="hint" style="font-size:13px">No projects yet. Plan one with the CTO, describe it above, or start from a template.</p>'; return; }
    box.innerHTML = '';
    for (const s of list) {
      const p = await L.load(s.id); if (!p || p.deleted) continue;
      const c = document.createElement('article'); c.className = 'pcard';
      c.append(thumb(p));
      const b = document.createElement('div'); b.className = 'pcard__b';
      b.innerHTML = `<h3>${L.esc(p.name)}</h3><p>${p.pages.length} page${p.pages.length > 1 ? 's' : ''} · edited ${ago(p.updated)}${p.published ? ` · ${GUEST ? 'exported' : 'published'} ${ago(p.published)}` : ''}</p>`;
      const a = document.createElement('div'); a.className = 'pcard__a';
      a.innerHTML = `<button class="btn btn--blue" type="button" data-a="open">Open editor</button>${p.published && !GUEST ? `<a class="btn" href="../sites/${L.esc(p.slug)}/index.html" target="_blank" rel="noopener">Live ↗</a>` : ''}${p.published ? '<span class="pcard__live">● Live</span>' : ''}`;
      a.querySelector('[data-a="open"]').addEventListener('click', () => open(p.id));
      const act = {
        rename: async () => { const n = prompt('Project name', p.name); if (n && n.trim()) { p.name = n.trim(); await L.save(p); render(); } },
        dup: async () => { const c2 = L.clone(p); c2.id = 'p-' + L.slug(p.name).slice(0, 20) + '-' + Math.random().toString(36).slice(2, 6); c2.name = p.name + ' copy'; c2.slug = L.slug(c2.name); c2.created = Date.now(); delete c2.published; await L.save(c2); render(); toast('Duplicated'); },
        exp: () => { L.exportProject(p); toast('Backup downloaded'); },
        del: async () => { if (confirm(`Delete “${p.name}”? This can't be undone.`)) { await L.remove(p.id); render(); toast('Deleted'); } }
      };
      if (window.LoomHQ) a.append(LoomHQ.more(p, [{ head: 'Project' }, { label: 'Rename', run: act.rename }, { label: 'Duplicate', run: act.dup }, { label: 'Export backup', run: act.exp }, { label: 'Delete', danger: true, run: act.del }]));
      c.append(b, a); box.append(c);
    }
  }

  // New project — built-in starters + template library (live previews)
  const modal = $('[data-modal]');
  // 200 templates: search + category + style filters, previews render only when scrolled into view
  let tplIO = null;
  function renderTemplates(pick) {
    const box = $('[data-tpls]'); const all = window.LoomTemplates ? LoomTemplates.list : [];
    if (!box.dataset.ready) {
      box.dataset.ready = '1';
      const bar = document.createElement('div'); bar.className = 'tplbar';
      const cats = [...new Set(all.map((t) => t.category))].sort(), langs = [...new Set(all.map((t) => t.langLabel).filter(Boolean))];
      bar.innerHTML = `<input class="in" type="search" placeholder="Search ${all.length} templates…" aria-label="Search templates" data-tq>
        <select class="in" aria-label="Category" data-tc><option value="">All categories</option>${cats.map((c) => `<option>${L.esc(c)}</option>`).join('')}</select>
        <select class="in" aria-label="Design language" data-tl><option value="">All styles</option>${langs.map((c) => `<option>${L.esc(c)}</option>`).join('')}</select>
        <span class="hint" data-tn aria-live="polite"></span>`;
      box.before(bar);
      tplIO = new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) return; const l = en.target; tplIO.unobserve(l); const f = l.querySelector('iframe'); if (f && !f.srcdoc) f.srcdoc = LoomTemplates.previewHTML(l.dataset.id, +(l.dataset.variant || 0)); }), { root: box, rootMargin: '300px' });
      all.forEach((t) => {
        const l = document.createElement('label'); l.className = 'tpl__t'; l.dataset.id = t.id;
        l.dataset.search = `${t.name} ${t.category} ${t.langLabel || ''} ${t.desc}`.toLowerCase(); l.dataset.cat = t.category; l.dataset.lang = t.langLabel || '';
        const vs = t.variants || [];
        l.innerHTML = `<input type="radio" name="tpl" value="${t.id}"><span class="tpl__prev"><iframe sandbox="allow-same-origin" aria-hidden="true" tabindex="-1"></iframe></span><b>${L.esc(t.name)}</b><span>${L.esc(t.langLabel || '')} · ${L.esc(t.category)} · ${t.pages} pages</span><a class="tpl__pv" href="preview.html?t=${encodeURIComponent(t.id)}" target="_blank" rel="noopener" data-pv>Preview in new tab ↗</a>${vs.length > 1 ? `<span class="tpl__vars" role="group" aria-label="${L.esc(t.name)} colour variations">${vs.map((v, i) => `<button type="button" class="tpl__var${i ? '' : ' is-on'}" data-var="${i}" title="${L.esc(v.name)}" aria-label="${L.esc(v.name)} colours" aria-pressed="${!i}" style="--a:${v.dots[0]};--b:${v.dots[1]};--c:${v.dots[2]}"></button>`).join('')}</span>` : ''}`;
        box.append(l);
        const f = l.querySelector('iframe'), w = l.querySelector('.tpl__prev');
        l.querySelectorAll('[data-var]').forEach((b) => b.addEventListener('click', (e) => {
          e.preventDefault(); l.querySelector('input').checked = true; l.dataset.variant = b.dataset.var;
          l.querySelectorAll('[data-var]').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
          f.srcdoc = LoomTemplates.previewHTML(t.id, +b.dataset.var); l.querySelector('[data-pv]').href = `preview.html?t=${encodeURIComponent(t.id)}&v=${b.dataset.var}`;
        }));
        l.querySelector('[data-pv]').addEventListener('click', (e) => e.stopPropagation());
        new ResizeObserver(() => { f.style.transform = `scale(${w.clientWidth / 1280})`; }).observe(w);
        tplIO.observe(l);
      });
      const apply = () => {
        const q = $('[data-tq]').value.trim().toLowerCase(), c = $('[data-tc]').value, lg = $('[data-tl]').value; let n = 0;
        box.querySelectorAll('.tpl__t').forEach((l) => { const show = (!q || l.dataset.search.includes(q)) && (!c || l.dataset.cat === c) && (!lg || l.dataset.lang === lg); l.hidden = !show; if (show) n++; });
        $('[data-tn]').textContent = `${n} template${n === 1 ? '' : 's'}`;
      };
      ['input', 'change'].forEach((ev) => bar.addEventListener(ev, apply)); apply();
    }
    const want = pick || 'starter'; const r = box.querySelector(`input[value="${CSS.escape(want)}"]`) || box.querySelector('input[value="starter"]'); r.checked = true;
    if (pick) { const lab = r.closest('label'); if (lab) setTimeout(() => lab.scrollIntoView({ block: 'center' }), 60); }
    const t = window.LoomTemplates && LoomTemplates.list.find((x) => x.id === want); if (t) $('#np-name').value = `My ${t.name} site`;
  }
  const openNew = (pick) => { renderTemplates(pick); modal.hidden = false; $('#np-name').select(); };
  $('[data-new]').addEventListener('click', () => openNew());
  $('[data-cancel]').addEventListener('click', () => (modal.hidden = true));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });
  $('[data-new-form]').addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const name = String(fd.get('name') || 'Untitled').trim();
    const tpl = fd.get('tpl'); const lab = $(`[data-tpls] input[value="${CSS.escape(String(tpl))}"]`); const variant = lab ? +(lab.closest('label').dataset.variant || 0) : 0;
    const p = tpl === 'blank' ? L.blankProject(name) : tpl === 'portfolio' ? await L.portfolioProject(name) : tpl === 'starter' ? L.starterProject(name) : LoomTemplates.create(tpl, name, variant);
    await L.save(p); open(p.id);
  });

  /* ---------------------------------------------------------------- describe → build (AI team) */
  const EXAMPLES = ['A dark, premium AI startup called “Synthex” with pricing and FAQ', 'Cosy Italian restaurant “Trattoria Blu” with menu and bookings, warm terracotta', 'Yoga and pilates studio with class timetable, coaches and memberships', 'Online shop selling handmade candles, soaps and mugs', 'Friendly dental clinic in Leeds called “Brightside”, soft teal', 'Developer API platform with docs-first feel and usage pricing'];
  function initBrief() {
    const team = $('[data-brief-team]'); if (team && window.LoomAgents) team.innerHTML = LoomAgents.TEAM.map((a, i) => `<span class="ai__av" style="--c:${a.color};--i:${i}"><span>${a.glyph}</span></span>`).join('');
    const eg = $('[data-brief-eg]'); eg.innerHTML = EXAMPLES.map((x) => `<button type="button" class="ai__chip">${L.esc(x)}</button>`).join('');
    eg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { $('#brief-in').value = b.textContent; $('#brief-in').focus(); }));
    LoomAgents.status().then((st) => { const m = $('[data-ai-mode]'); m.textContent = st.available ? '● Claude-powered agents' : '● Built-in agents'; m.className = 'top__status ' + (st.available ? 'ok' : 'dirty'); m.title = st.available ? `Running on ${st.model}` : 'Set ANTHROPIC_API_KEY for Claude-powered agents'; });
    $('[data-brief]').addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(e.target); const brief = String(fd.get('brief') || '').trim(); const name = String(fd.get('name') || '').trim() || undefined;
      if (brief.length < 4) { $('#brief-in').focus(); return; }
      build(brief, name);
    });
  }
  async function build(brief, name, template) {
      const ov = $('[data-build]'), list = $('[data-build-steps]'), bar = $('[data-build-bar]'); ov.hidden = false; list.innerHTML = ''; bar.style.width = '4%';
      const orb = ov.querySelector('.build__orb'); if (orb && window.LoomThink && !orb.dataset.live) { orb.dataset.live = '1'; orb.className = 'build__orb'; orb.append(LoomThink.create({ agents: ['architect', 'designer', 'brand', 'logo', 'motion', 'qa'], size: 'xl' }).el); }
      $('[data-build-name]').textContent = name || 'your site';
      let n = 1;
      const choose = (opts) => new Promise((resolve) => {
        const pick = $('[data-build-pick]'), cards = $('[data-build-cards]'); $('[data-build-sub]').textContent = 'Three directions are ready.';
        cards.innerHTML = opts.map((o, i) => { const G = window.LoomLangs && LoomLangs.LANGS[o.lang]; return `<div class="bcard"><div class="bcard__prev"><iframe sandbox="allow-same-origin" tabindex="-1" aria-hidden="true"></iframe></div><div class="bcard__meta"><b>${L.esc(G ? G.label : 'Direction ' + (i + 1))}</b><span>${L.esc(G ? G.desc : '')}</span></div><button class="btn btn--blue" type="button" data-pick="${i}">Use this direction</button></div>`; }).join('');
        cards.querySelectorAll('.bcard').forEach((c, i) => { const f = c.querySelector('iframe'), w = c.querySelector('.bcard__prev'); const pr = opts[i].project; f.srcdoc = L.pageDoc(pr, pr.pages[0], { extraHead: '<style>html,body{overflow:hidden}</style>' }); new ResizeObserver(() => { f.style.transform = `scale(${w.clientWidth / 1280})`; }).observe(w); });
        pick.hidden = false; $('[data-build-steps]').hidden = true; setTimeout(() => cards.querySelector('button').focus({ preventScroll: true }), 50);
        cards.addEventListener('click', function onPick(e) { const b = e.target.closest('[data-pick]'); if (!b) return; cards.removeEventListener('click', onPick); pick.hidden = true; $('[data-build-steps]').hidden = false; resolve(+b.dataset.pick); });
      });
      const p = await LoomAgents.createSite(brief, { name, template, choose, onEvent: (ev) => {
        if (ev.type === 'plan') { n = ev.plan.steps.length; list.innerHTML = ev.plan.steps.map((s, i) => { const a = LoomAgents.byId(s.agent); return `<li class="is-queued" data-i="${i}"><span class="ai__av" style="--c:${a.color}"><span>${a.glyph}</span></span><div><b>${L.esc(a.name)} <small>${L.esc(a.role)}</small></b><span data-t>${L.esc(s.task)}</span></div><em>queued</em></li>`; }).join(''); }
        if (ev.type === 'step') {
          const li = list.querySelector(`[data-i="${ev.index}"]`); if (!li) return;
          li.className = 'is-' + ev.state; li.querySelector('em').textContent = ev.state === 'done' ? '✓' : 'working';
          li.querySelector('.ai__av').classList.toggle('is-busy', ev.state === 'working');
          if (ev.state === 'done') { li.querySelector('[data-t]').textContent = ev.result.reply; bar.style.width = `${Math.round(((ev.index + 1) / n) * 100)}%`; }
          $('[data-build-sub]').textContent = ev.state === 'working' ? `${LoomAgents.byId(ev.agent).name} · ${ev.task}` : $('[data-build-sub]').textContent;
        }
        if (ev.type === 'done') $('[data-build-sub]').textContent = 'Done. Opening the editor…';
      } });
      if (p) { $('[data-build-name]').textContent = p.name; await L.save(p); setTimeout(() => open(p.id), 700); }
      else { ov.hidden = true; toast('Build failed. Please try again.'); }
  }
  window.LoomDash = { build, openNew: (pick) => openNew(pick), render: () => render() };

  (async () => {
    const user = await LoomAuth.require(); GUEST = !!user.guest;
    initBrief();
    LoomAuth.menu($('[data-user]'), user);
    const hr = new Date().getHours(); $('[data-hello]').textContent = `${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}${user.guest ? '' : ', ' + String(user.name).split(' ')[0]}`;
    const s = $('[data-server]'); s.textContent = user.guest ? '● Guest mode · saved in this browser' : '● Saving to your account'; s.className = 'top__status ' + (user.guest ? 'dirty' : 'ok');
    if (user.guest) s.title = 'Projects are stored in this browser only. Use Export on a project to keep a backup file, and Import to restore it.';
    const imp = document.createElement('input'); imp.type = 'file'; imp.accept = '.json,application/json'; imp.hidden = true;
    const ib = document.createElement('button'); ib.className = 'btn'; ib.type = 'button'; ib.textContent = 'Import'; ib.title = 'Import a .loom.json backup';
    ib.addEventListener('click', () => imp.click());
    imp.addEventListener('change', async () => { const f = imp.files[0]; imp.value = ''; if (!f) return; try { const p = await L.importProject(f); toast(`Imported “${p.name}”`); render(); } catch (e) { toast(e.message); } });
    $('[data-new]').before(ib, imp);
    await render();
    if (window.LoomHQ) LoomHQ.init(user);
    const qs = new URLSearchParams(location.search); const q = qs.get('template'); if (q) openNew(q); else if (qs.get('browse')) openNew();
    const b = qs.get('brief'); if (b) { $('#brief-in').value = b.slice(0, 1000); $('#brief-in').scrollIntoView({ block: 'center' }); $('#brief-in').focus(); }
  })();
})();
