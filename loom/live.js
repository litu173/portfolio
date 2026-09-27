/* LOOM Live — publishing, the way Webflow does it.
   Publish puts a frozen version of the project on its Loom address (…/loom/s/?your-site, and at launch
   your-site.loom.site). Edits stay private until you publish again. From there a site gets a domain and
   hosting. During the beta, domain purchase, DNS checks and hosting plans run in TEST MODE: nothing is bought,
   charged or connected, so you can see the whole journey before it's real. */
(() => {
  'use strict';
  const L = window.Loom;
  const HERE = (document.currentScript && document.currentScript.src) || location.href;
  const REG = 'loom-live:index', SNAP = (slug) => 'loom-live:' + slug;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { localStorage.setItem(k, v); }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } } };
  const reg = () => { try { return JSON.parse(ls.get(REG) || '{}'); } catch (e) { return {}; } };
  const esc = L.esc;

  const address = (slug) => new URL(`s/?${encodeURIComponent(slug)}`, HERE).href;
  const futureAddress = (slug) => `${slug}.loom.site`;
  const cleanSlug = (s) => L.slug(s).slice(0, 40).replace(/^-+|-+$/g, '');
  function slugFree(slug, pid) { const r = reg(); return !r[slug] || r[slug] === pid; }
  function suggestSlug(P) { let base = cleanSlug(P.live && P.live.slug || P.name) || 'my-site', s = base, i = 2; while (!slugFree(s, P.id)) s = `${base}-${i++}`; return s; }

  /** Publish a new version. Returns { ok, url, version } or { ok:false, error }. */
  async function publish(P, slug) {
    slug = cleanSlug(slug || suggestSlug(P)); if (!slug) return { ok: false, error: 'Choose an address first.' };
    if (!slugFree(slug, P.id)) return { ok: false, error: `${slug} is taken by another of your sites.` };
    L.uniqueSlugs(P.pages.slice().sort((a, b) => (a.slug === 'index' ? -1 : b.slug === 'index' ? 1 : 0)));
    const prev = P.live || {}; const version = (prev.version || 0) + 1; const at = Date.now();
    const snap = L.clone(P); delete snap.live;
    try { ls.set(SNAP(slug), JSON.stringify({ at, version, project: snap })); } catch (e) { return { ok: false, error: 'This browser is out of storage for the live copy. Remove large images or export the site.' }; }
    const r = reg(); if (prev.slug && prev.slug !== slug) { delete r[prev.slug]; ls.del(SNAP(prev.slug)); } r[slug] = P.id; ls.set(REG, JSON.stringify(r));
    // with a Loom account + server, the files are also written for real hosting
    let files = null; try { if (L.canRemote && (await L.canRemote())) { const res = await L.publish(P); if (res && res.ok) files = res.url; } } catch (e) { /* the Loom address still works */ }
    P.live = Object.assign({ domain: null, hosting: null }, prev, { slug, url: address(slug), future: futureAddress(slug), version, at, files, history: [{ version, at }].concat(prev.history || []).slice(0, 12) });
    P.published = at; await L.save(P);
    return { ok: true, url: P.live.url, version };
  }
  async function unpublish(P) { const s = P.live && P.live.slug; if (s) { ls.del(SNAP(s)); const r = reg(); delete r[s]; ls.set(REG, JSON.stringify(r)); } P.live = null; P.published = null; await L.save(P); }
  function snapshot(slug) { try { return JSON.parse(ls.get(SNAP(slug)) || 'null'); } catch (e) { return null; } }

  /* ---------------------------------------------------------------- test-mode domain + hosting */
  const hash = (s) => [...String(s)].reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7);
  const TLDS = [['.com', 12.98], ['.co', 24.5], ['.io', 39], ['.studio', 26], ['.shop', 4.99], ['.store', 3.99], ['.app', 14], ['.design', 42], ['.net', 13.5], ['.org', 10.98]];
  function searchDomains(q) {
    const base = cleanSlug(String(q || '').replace(/\.[a-z.]+$/i, '')).replace(/-/g, '') || 'mysite';
    const want = /\.[a-z.]{2,}$/i.exec(q || ''); const list = want ? [[want[0].toLowerCase(), (TLDS.find((t) => t[0] === want[0].toLowerCase()) || [0, 15])[1]], ...TLDS.filter((t) => t[0] !== want[0].toLowerCase())] : TLDS;
    return list.slice(0, 7).map(([tld, price]) => { const name = base + tld; return { name, price, available: hash(name) % 5 !== 0 }; });
  }
  const dnsRecords = (slug, domain) => [{ type: 'A', host: '@', value: '76.76.21.21', note: 'Loom edge (test value)' }, { type: 'CNAME', host: 'www', value: `${slug}.loom.site` }, { type: 'TXT', host: '_loom', value: `loom-verify=${hash(domain + slug).toString(36)}` }];
  const HOSTING = [
    { id: 'loom-beta', name: 'Loom Hosting · Beta', price: 'Free', note: 'Global CDN, automatic HTTPS, 10 GB bandwidth, “Built with Loom” credit.', rec: true },
    { id: 'loom-pro', name: 'Loom Hosting · Pro', price: '$9 / month', note: 'Everything in Beta plus your domain, 100 GB bandwidth, form inbox, backups and no credit.' },
    { id: 'self', name: 'Host it yourself', price: 'Your provider', note: 'Export the code and deploy to Netlify, Cloudflare Pages, GitHub Pages or your own server.' }
  ];
  const liveHost = (P) => (P.live && P.live.domain && P.live.domain.status === 'connected' ? P.live.domain.name : P.live ? P.live.future : '');

  /* ---------------------------------------------------------------- publish dialog (editor) */
  const LEVEL = { pass: '✓', info: 'i', warn: '!', fail: '×' };
  /** Render the publish flow into `box`. opts: { save: async () => {}, close: () => {}, toast } */
  async function dialog(box, P, opts = {}) {
    const again = !!(P.live && P.live.version);
    const slug0 = suggestSlug(P);
    box.innerHTML = `<div class="lpub">
      <h2>${again ? 'Publish an update' : 'Publish to Loom'}</h2>
      <p class="lpub__lead">${again ? `Version ${P.live.version} is live. Publishing puts your latest edits live as version ${P.live.version + 1}.` : 'Your site goes live on a free Loom address. Then connect a domain and choose hosting.'}</p>
      <label class="lpub__addr"><span>Loom address</span><span class="lpub__url"><span><bdi dir="ltr">${esc(new URL('s/?', HERE).href.replace(/^https?:\/\//, ''))}</bdi></span><input data-slug value="${esc(slug0)}" aria-label="Site address" spellcheck="false" maxlength="40"></span><small>At launch this becomes <b data-future>${esc(futureAddress(slug0))}</b></small></label>
      <div class="lpub__checks" data-checks></div>
      <p class="lpub__note">Beta sites carry a small “Built with Loom” credit in the footer. Edits stay private until you publish again.</p>
      <div class="lpub__acts"><button class="btn" type="button" data-export title="Download the site as HTML, CSS and JS">Export code</button>${again ? '<button class="btn btn--danger" type="button" data-unpub>Unpublish</button>' : ''}<span style="flex:1"></span><button class="btn" type="button" data-cancel>Cancel</button><button class="btn btn--blue" type="button" data-go disabled>${again ? `Publish v${P.live.version + 1}` : 'Publish'}</button></div>
    </div>`;
    const $ = (s) => box.querySelector(s);
    const inp = $('[data-slug]'), go = $('[data-go]'); let checked = false;
    const sync = () => { const s = cleanSlug(inp.value); $('[data-future]').textContent = futureAddress(s || '…'); const ok = !!s && slugFree(s, P.id); inp.setAttribute('aria-invalid', String(!ok)); go.disabled = !ok || !checked; };
    inp.addEventListener('input', sync);
    $('[data-cancel]').addEventListener('click', () => opts.close && opts.close());
    $('[data-export]').addEventListener('click', async () => { await L.exportZip(P); opts.toast && opts.toast('Code downloaded'); });
    if ($('[data-unpub]')) $('[data-unpub]').addEventListener('click', async () => { if (!confirm('Take this site offline? Its Loom address stops working until you publish again.')) return; await unpublish(P); opts.toast && opts.toast('Site unpublished'); opts.close && opts.close(); opts.changed && opts.changed(); });
    // pre-flight by the team
    const ck = $('[data-checks]');
    const think = window.LoomThink ? LoomThink.create({ agents: ['qa', 'security', 'seo'], who: 'Probe, Sentinel and Signal are checking', steps: ['Testing accessibility and contrast', 'Scanning for security issues', 'Checking titles and social cards'], every: 650 }) : null;
    if (think) ck.append(think.el);
    const res = await (window.LoomThink ? LoomThink.pace(async () => { const A = window.LoomAgents; if (!A) return []; const out = []; for (const ag of ['qa', 'security', 'seo']) { const r = await A.runAgent(ag, 'pre-launch check', L.clone(P), {}); out.push({ ag, r }); } return out; }, 2200) : Promise.resolve([]));
    if (think) think.stop();
    const counts = res.map(({ ag, r }) => { const rep = r.report || []; const bad = rep.filter((x) => x.level === 'fail').length, warn = rep.filter((x) => x.level === 'warn').length; return { name: window.LoomAgents.byId(ag).name, role: { qa: 'Accessibility & QA', security: 'Security', seo: 'SEO' }[ag], bad, warn, top: rep.find((x) => x.level === 'fail' || x.level === 'warn') }; });
    ck.innerHTML = `<ul class="lpub__list">${counts.map((c) => `<li class="lv-${c.bad ? 'fail' : c.warn ? 'warn' : 'pass'}"><i>${c.bad ? LEVEL.fail : c.warn ? LEVEL.warn : LEVEL.pass}</i><div><b>${esc(c.role)}</b><span>${c.bad || c.warn ? `${c.bad ? `${c.bad} to fix` : ''}${c.bad && c.warn ? ', ' : ''}${c.warn ? `${c.warn} to review` : ''}${c.top ? ` · ${esc(c.top.title)}` : ''}` : 'All clear'} <em>${esc(c.name)}</em></span></div></li>`).join('')}</ul>${counts.some((c) => c.bad || c.warn) ? '<p class="lpub__hint">You can still publish. Ask Loom AI to “run a QA check” to fix these.</p>' : ''}`;
    checked = true; sync(); go.focus();
    go.addEventListener('click', async () => {
      const slug = cleanSlug(inp.value); box.querySelector('.lpub').classList.add('is-busy');
      const t2 = window.LoomThink ? LoomThink.create({ agents: ['devops', 'security', 'director'], who: 'Relay is publishing', steps: [`Bundling ${P.pages.length} page${P.pages.length > 1 ? 's' : ''}`, 'Optimising styles and motion', 'Deploying to the Loom beta network', 'Securing with HTTPS'], every: 620, size: 'l' }) : null;
      box.innerHTML = '<div class="lpub lpub--center" data-pubbing></div>'; if (t2) box.querySelector('[data-pubbing]').append(t2.el);
      if (opts.save) await opts.save();
      const r = await (window.LoomThink ? LoomThink.pace(() => publish(P, slug), 2800) : publish(P, slug)); if (t2) t2.stop();
      if (!r.ok) { box.innerHTML = `<div class="lpub"><h2>Couldn’t publish</h2><p class="lpub__lead">${esc(r.error)}</p><div class="lpub__acts"><span style="flex:1"></span><button class="btn" type="button" data-cancel>Close</button></div></div>`; box.querySelector('[data-cancel]').onclick = () => opts.close && opts.close(); return; }
      opts.changed && opts.changed();
      const hq = (step) => `app.html?live=${encodeURIComponent(P.id)}&step=${step}`;
      box.innerHTML = `<div class="lpub lpub--done">
        <span class="lpub__ok" aria-hidden="true">✓</span>
        <h2>You’re live</h2>
        <p class="lpub__lead">Version ${r.version} of <b>${esc(P.name)}</b> is published.</p>
        <div class="lpub__live"><a href="${esc(r.url)}" target="_blank" rel="noopener" data-visit>${esc(r.url.replace(/^https?:\/\//, ''))}</a><button class="btn" type="button" data-copy>Copy link</button><a class="btn btn--blue" href="${esc(r.url)}" target="_blank" rel="noopener">Visit site ↗</a></div>
        <p class="lpub__hint">Beta: the Loom address works in this browser. Public Loom hosting arrives with accounts; until then, share it by exporting the code or connecting hosting.</p>
        <h3>Next steps</h3>
        <div class="lpub__next">
          <a class="lpub__step" href="${hq('domain')}"><b>1 · Assign a domain</b><span>Connect one you own, or find a new one.</span></a>
          <a class="lpub__step" href="${hq('hosting')}"><b>2 · Add hosting</b><span>Loom Hosting, or your own provider.</span></a>
        </div>
        <div class="lpub__acts"><span style="flex:1"></span><button class="btn" type="button" data-cancel>Keep editing</button></div></div>`;
      box.querySelector('[data-cancel]').onclick = () => opts.close && opts.close();
      box.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(r.url); opts.toast && opts.toast('Link copied'); } catch (e) { opts.toast && opts.toast(r.url); } };
    });
  }

  window.LoomLive = { publish, unpublish, snapshot, address, futureAddress, suggestSlug, slugFree, cleanSlug, searchDomains, dnsRecords, HOSTING, liveHost, dialog };
})();
