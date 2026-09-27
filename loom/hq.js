/* LOOM HQ — the client's tech team in one place.
   Plan   · a CTO chat that turns a conversation into a project brief (requirements, budget, platform,
            domain, hosting), then builds the site from it.
   Build  · projects in progress (dashboard.js renders the cards).
   Live   · published sites with growth, SEO, health, sales and version services.
   Also   · change requests, domains/hosting/GitHub, growth & finance, brand kit, plan & usage, team & support.
   Nothing here buys domains, moves money or posts publicly: those come back as checklists to approve. */
(() => {
  'use strict';
  const L = window.Loom, A = window.LoomAgents, C = window.LoomCompose;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = L.esc;
  let USER = null, KEY = 'loom-hq:anon';
  const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* full */ } } };
  let S = { chat: [], brief: {}, requests: [], ops: {} };
  const save = () => store.set(S);
  const toast = (m) => { const t = $('.toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  const team = (ids) => `<span class="hq-team" aria-label="Agents on this: ${ids.map((i) => (A.byId(i) || {}).name).join(', ')}">${ids.map((i) => { const a = A.byId(i); return a ? `<span class="ai__av ai__av--s" style="--c:${a.color}" title="${esc(a.name)} · ${esc(a.role)}"><span>${a.glyph}</span></span>` : ''; }).join('')}</span>`;

  /* ================================================================ 1. PLAN: the CTO chat */
  const SLOTS = [
    { k: 'business', label: 'Business', q: 'Tell me about the business. What do you do, and who is it for?', chips: ['A restaurant in my city', 'A SaaS product', 'An online store', 'My personal portfolio', 'A clinic', 'A nonprofit'] },
    { k: 'goals', label: 'Main goal', q: 'What should the site achieve first?', chips: ['Get bookings', 'Sell products online', 'Generate leads', 'Build credibility', 'Hire people', 'Collect donations'] },
    { k: 'audience', label: 'Audience', q: 'Who are your ideal visitors?', chips: ['Local customers', 'Businesses (B2B)', 'Young professionals', 'Families', 'Investors', 'Everyone'] },
    { k: 'pages', label: 'Pages', q: 'Which pages do you need? Pick all that apply, or type your own.', chips: ['Home, About, Services, Contact', 'Add a Shop', 'Add a Blog', 'Add Pricing', 'Add Careers', 'Add Booking'] },
    { k: 'features', label: 'Features', q: 'Any features beyond pages?', chips: ['Online payments', 'Newsletter signup', 'Booking calendar', 'Customer login', 'Multiple languages', 'A dashboard', 'None for now'] },
    { k: 'style', label: 'Look & feel', q: 'How should it feel? You can name a style, a colour or a site you admire.', chips: ['Luxury', 'Minimal', 'Playful', 'Editorial', 'Bold & cinematic', 'Corporate & trustworthy'] },
    { k: 'budget', label: 'Budget', q: 'What budget are you working with, per month or in total?', chips: ['Free to start', 'Under $50/month', '$50–$200/month', '$1,000–$5,000 total', 'Not sure yet'] },
    { k: 'timeline', label: 'Timeline', q: 'When do you want to launch?', chips: ['This week', 'Within a month', 'In 2–3 months', 'No rush'] },
    { k: 'domain', label: 'Domain', q: 'Do you have a domain name already?', chips: ['Yes, I have one', 'No, help me choose', 'Not sure'] },
    { k: 'hosting', label: 'Hosting', q: 'Where should it live? I’ll recommend the right host for your needs.', chips: ['Recommend for me', 'GitHub Pages (free)', 'Netlify', 'Cloudflare Pages', 'My own server'] }
  ];
  const T = (s) => String(s || '').toLowerCase();
  // pull every slot we can recognise out of free text, not just the one we asked about
  function extract(text, asked) {
    const t = T(text), out = {};
    const put = (k, v) => { if (v && !out[k]) out[k] = v; };
    if (asked) put(asked, text.trim());
    const goals = [[/\b(sell|shop|store|e-?commerce|products?)\b/, 'Sell products online'], [/\b(book|booking|reservation|appointment)s?\b/, 'Get bookings'], [/\b(leads?|enquir|quote|clients?)\b/, 'Generate leads'], [/\b(hire|hiring|recruit|careers?)\b/, 'Hire people'], [/\b(donat|fundrais)/, 'Collect donations']];
    goals.forEach(([re, v]) => { if (re.test(t)) put('goals', v); });
    const pages = ['about', 'services', 'shop', 'blog', 'pricing', 'careers', 'contact', 'menu', 'portfolio', 'booking', 'faq', 'team'].filter((w) => new RegExp(`\\b${w}`).test(t));
    if (pages.length >= 2) put('pages', pages.map((w) => w[0].toUpperCase() + w.slice(1)).join(', '));
    const feats = [[/\b(payments?|checkout|stripe|pay)\b/, 'Online payments'], [/\b(newsletters?|mailing list)\b/, 'Newsletter'], [/\b(calendar|bookings?|reservations?)\b/, 'Booking'], [/\b(login|account|member)/, 'Customer login'], [/\b(multi.?lingual|languages?|translation)\b/, 'Multiple languages'], [/\b(dashboards?|analytics|admin)\b/, 'Dashboard']].filter(([re]) => re.test(t)).map((x) => x[1]);
    if (feats.length) put('features', feats.join(', '));
    const lang = window.LoomLangs && Object.keys(LoomLangs.KEYWORDS).find((k) => LoomLangs.KEYWORDS[k].test(t)); if (lang) put('style', LoomLangs.LANGS[lang].label);
    const money = /((under|around|about|max|up to)\s)?((\$|usd|bdt|৳|£|€)\s?\d[\d,.]*k?|\d[\d,.]*\s?(k|usd|dollars|taka|bdt)\b)(\s?(a|per|\/)\s?(month|year|mo))?|free to start/.exec(t); if (money) put('budget', money[0].replace(/\s?(a|per)\s?(month|mo)$/, '/month').replace(/\s?(a|per)\s?year$/, '/year'));
    const when = /\b(asap|this week|next week|this month|next month|(within|in)\s(a|one|two|three|\d+)\s(days?|weeks?|months?)|\d+\s*(days?|weeks?|months?)|no rush|by (january|february|march|april|may|june|july|august|september|october|november|december))\b/.exec(t); if (when) put('timeline', when[0]);
    const dom = /\b([a-z0-9][a-z0-9-]{1,40}\.(com|co|io|net|org|app|dev|studio|shop|store|design|ai|bd|uk|co\.uk|com\.bd))\b/.exec(t); if (dom) put('domain', dom[1]);
    const host = /\b(github pages|netlify|vercel|cloudflare|shopify|own server|my server|hostinger|bluehost)\b/.exec(t); if (host) put('hosting', host[1]);
    if (!asked && t.length > 18 && !S.brief.business && !/^(hi|hello|hey)\b/.test(t)) put('business', text.trim());
    return out;
  }
  function nextSlot() { return SLOTS.find((s) => !S.brief[s.k]); }
  function domainIdeas(base) {
    const b = L.slug(base || 'mybrand').replace(/-/g, '').slice(0, 20) || 'mybrand';
    return [`${b}.com`, `get${b}.com`, `${b}.co`, `${b}hq.com`, `${b}.studio`, `${b}.shop`];
  }
  function brandName() { const b = S.brief.business || ''; const m = /["“]([^"”]{2,40})["”]/.exec(b) || /\b(?:called|named)\s+([A-Z][\w&'-]*(?:\s[A-Z][\w&'-]*){0,2})/.exec(b); return m ? m[1] : ''; }
  function estimate() {
    const f = T(S.brief.features + ' ' + S.brief.goals + ' ' + S.brief.pages); const shop = /sell|shop|payment/.test(f), dash = /dashboard|login/.test(f);
    const loom = shop ? '$0 during beta, then Pro $50/month' : '$0 during beta';
    const extras = ['Domain ≈ $10–15/year', shop ? 'Payment fees ≈ 2.9% + 30¢ per order (Stripe)' : null, dash ? 'Logins/dashboard need a backend (Supabase free tier to start)' : null, 'Hosting: free on GitHub Pages, Netlify or Cloudflare Pages'].filter(Boolean);
    const agency = shop ? '$6,000–$25,000 + $300/month' : dash ? '$10,000–$40,000' : '$2,500–$9,000';
    return { loom, extras, agency };
  }
  function hostingAdvice() {
    const f = T(S.brief.features + ' ' + S.brief.goals);
    if (/login|dashboard/.test(f)) return 'You need accounts and data, so pair a static host (Netlify or Vercel) with a managed backend such as Supabase. Loom exports the front end; your CTO checklist covers the backend.';
    if (/sell|payment|shop/.test(f)) return 'For a store: host the site on Netlify or Cloudflare Pages (free, fast, HTTPS) and take payments with Stripe Payment Links or Shopify Buy Buttons. No server to maintain.';
    return 'Your site is static, the fastest and safest kind. GitHub Pages, Netlify or Cloudflare Pages host it free with automatic HTTPS. I’d pick Cloudflare Pages for speed or Netlify for the easiest drag-and-drop.';
  }
  // intents the CTO answers at any time
  function intent(text) {
    const t = T(text).trim();
    if (/^(build|build it|let'?s build|start building|go ahead|make it)\b/.test(t)) return { build: true };
    // answer a topic only when it's a question or a short command, not a statement that mentions it
    const asking = /\?|^(how|what|which|where|when|can|could|should|would|do|does|is|are|help|recommend|suggest|buy|purchase|register|find|estimate|tell me|explain|compare)\b/.test(t) || t.length < 40;
    if (!asking) return null;
    if (/\b(buy|purchase|register|get)\b.*\bdomain\b|\bdomain\b.*\b(buy|purchase|register)\b/.test(t)) {
      const ideas = domainIdeas(brandName() || S.brief.business);
      return { reply: `Here are domain ideas to check. I can’t buy one for you (you should own it in your name), but it takes two minutes:`, card: { kind: 'domains', ideas }, done: 'domain' };
    }
    if (/\b(host|hosting|server|deploy)\b/.test(t) && !/^(yes|no)/.test(t)) return { reply: hostingAdvice(), card: { kind: 'dns' } };
    if (/\b(cost|budget|price|how much|estimate|quote)\b/.test(t)) { const e = estimate(); return { reply: `Rough numbers for what you’ve described. With Loom: ${e.loom}. ${e.extras.join('. ')}. For comparison, a typical agency build would be ${e.agency}.` }; }
    if (/\b(platform|stack|wordpress|webflow|framework|react|tech)\b/.test(t)) return { reply: 'My recommendation: build in Loom and publish plain HTML, CSS and a tiny JS file. It’s faster and more secure than WordPress, cheaper than Webflow, and you own every line. If you later need a web app, we add a backend (Supabase) without rebuilding the site.' };
    if (/\b(secur|safe|hack|gdpr|privacy)\b/.test(t)) return { reply: 'Every Loom site ships with a strict Content-Security-Policy, HTTPS on any modern host, no trackers by default and accessible, semantic HTML. Sentinel scans again before each launch. For GDPR: keep forms minimal and add a privacy page (templates include one).' };
    return null;
  }
  async function send(text) {
    text = String(text || '').trim(); if (!text) return;
    S.chat.push({ who: 'you', text });
    const asked = S.pending || null;
    const st = await A.status();
    let reply = '', card = null;
    if (st.available) {
      try {
        const r = await fetch('/__ai/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ agent: 'cto', request: text, context: JSON.stringify({ brief: S.brief, chat: S.chat.slice(-12) }) }) }).then((x) => x.json());
        if (r.ok && r.data) { Object.assign(S.brief, Object.fromEntries(Object.entries(r.data.brief || {}).filter(([, v]) => v))); reply = r.data.reply; S.chips = r.data.chips || []; }
      } catch (e) { /* fall back to the local CTO */ }
    }
    if (!reply) {
      const slotChip = asked && SLOTS.find((x) => x.k === asked).chips.includes(text);  // a quick reply answers the question asked
      const it = slotChip ? null : intent(text);
      if (it && it.build) { S.chat.push({ who: 'cto', text: 'Great, building it now from your brief. You’ll pick one of three design directions.' }); save(); drawChat(); buildFromBrief(); return; }
      const got = extract(text, it ? null : asked); Object.assign(S.brief, Object.fromEntries(Object.entries(got).filter(([k]) => !S.brief[k] || k === asked)));
      if (it) { const again = intent(text); it.reply = again.reply; it.card = again.card; }  // re-answer with what we just learned
      if (it) { reply = it.reply; card = it.card || null; if (it.done && !S.brief[it.done]) S.brief[it.done] = 'Choosing (see ideas)'; }
      const n = nextSlot();
      const learned = Object.keys(got).filter((k) => k !== asked).map((k) => SLOTS.find((x) => x.k === k).label.toLowerCase());
      if (!it) reply = (learned.length ? `Noted${learned.length ? ` (and I picked up your ${learned.join(', ')})` : ''}. ` : 'Got it. ') + (n ? n.q : 'Your brief is complete. Want me to build it? I’ll design three directions for you to choose from.');
      else if (n) reply += `\n\nNext: ${n.q}`;
      S.pending = n ? n.k : null; S.chips = n ? n.chips : ['Build it', 'Estimate the cost', 'Recommend hosting', 'Help me buy a domain'];
      if (S.brief.business && !S.brief.category) { const lib = C.detect(S.brief.business); S.brief.category = lib ? lib.category : ''; }
    }
    S.chat.push({ who: 'cto', text: reply, card });
    save(); drawChat(); drawBrief();
  }
  function drawChat() {
    const box = $('[data-cto-thread]'); if (!box) return;
    if (!S.chat.length) { S.chat.push({ who: 'cto', text: `Hi${USER && !USER.guest ? ' ' + String(USER.name).split(' ')[0] : ''}, I’m your CTO. Let’s plan your site together: requirements, budget, platform, domain and hosting. ${SLOTS[0].q}` }); S.pending = 'business'; S.chips = SLOTS[0].chips; }
    box.innerHTML = S.chat.map((m) => `<div class="cto-msg cto-msg--${m.who}">${m.who === 'cto' ? '<span class="ai__av ai__av--s" style="--c:#F5F5F7" aria-hidden="true"><span>✦</span></span>' : ''}<div class="cto-bub">${esc(m.text).replace(/\n/g, '<br>')}${m.card ? cardHTML(m.card) : ''}</div></div>`).join('');
    const chips = $('[data-cto-chips]'); chips.innerHTML = (S.chips || []).map((c) => `<button type="button" class="ai__chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
    box.scrollTop = box.scrollHeight;
  }
  function cardHTML(c) {
    if (c.kind === 'domains') return `<div class="cto-card"><b>Domain ideas</b>${c.ideas.map((d) => `<div class="cto-dom"><code>${esc(d)}</code><span><a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noopener">Cloudflare</a> · <a href="https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}" target="_blank" rel="noopener">Namecheap</a> · <a href="https://porkbun.com/checkout/search?q=${encodeURIComponent(d)}" target="_blank" rel="noopener">Porkbun</a></span></div>`).join('')}<p>Buy it in your own name, turn on auto-renew and 2FA, then tell me the domain and I’ll give you the exact DNS records.</p></div>`;
    if (c.kind === 'dns') return `<div class="cto-card"><b>DNS for GitHub Pages</b><p>A records → 185.199.108.153 · .109.153 · .110.153 · .111.153<br>www → CNAME &lt;username&gt;.github.io</p><b>Netlify / Cloudflare Pages</b><p>www → CNAME &lt;site&gt;.netlify.app or &lt;project&gt;.pages.dev · apex → ALIAS / flattening. HTTPS is automatic.</p></div>`;
    return '';
  }
  function drawBrief() {
    const box = $('[data-brief-fields]'); if (!box) return;
    const filled = SLOTS.filter((s) => S.brief[s.k]).length;
    box.innerHTML = SLOTS.map((s) => `<div class="bf ${S.brief[s.k] ? 'is-set' : ''}"><dt>${esc(s.label)}</dt><dd>${S.brief[s.k] ? esc(S.brief[s.k]) : '<span>—</span>'}</dd>${S.brief[s.k] ? `<button type="button" class="bf__x" data-clear="${s.k}" aria-label="Clear ${esc(s.label)}">×</button>` : ''}</div>`).join('');
    $('[data-brief-bar]').style.width = `${Math.round((filled / SLOTS.length) * 100)}%`;
    $('[data-brief-count]').textContent = `${filled} of ${SLOTS.length}`;
    const e = estimate(); $('[data-brief-est]').innerHTML = S.brief.business ? `<b>Estimated cost with Loom:</b> ${esc(e.loom)} · ${esc(e.extras[0])}<br><span>Typical agency: ${esc(e.agency)}</span>` : '';
    $('[data-brief-build]').disabled = !S.brief.business;
  }
  function briefText() {
    const b = S.brief; return [b.business, b.goals && `Goal: ${b.goals}.`, b.audience && `Audience: ${b.audience}.`, b.pages && `Pages: ${b.pages}.`, b.features && `Features: ${b.features}.`, b.style && `Style: ${b.style}.`].filter(Boolean).join(' ');
  }
  function buildFromBrief() { if (!S.brief.business) { toast('Tell the CTO about your business first'); return; } const lib = C.detect(S.brief.business); window.LoomDash.build(briefText(), brandName() || undefined, lib && lib.id !== 'studio' ? lib.id : undefined); }
  function downloadBrief() {
    const lines = ['# Project brief', '', ...SLOTS.map((s) => `- **${s.label}:** ${S.brief[s.k] || '—'}`), '', `Estimated with Loom: ${estimate().loom}`, '', '## Conversation', ...S.chat.map((m) => `**${m.who === 'you' ? 'You' : 'CTO'}:** ${m.text}`)];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })); a.download = 'project-brief.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  /* ================================================================ 3. LIVE: published sites + services */
  let projects = [];
  async function loadProjects() { const list = await L.list(); projects = []; for (const s of list) { const p = await L.load(s.id); if (p && !p.deleted) projects.push(p); } }
  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };
  function drawLive() {
    const box = $('[data-live]'); if (!box) return;
    const live = projects.filter((p) => p.published);
    if (!live.length) { box.innerHTML = `<div class="hq-empty"><b>No live sites yet.</b><span>Publish (or export) a project from the editor and it appears here with growth, SEO, health and sales services.</span></div>`; return; }
    box.innerHTML = live.map((p) => `<article class="live" data-pid="${esc(p.id)}"><div class="live__h"><span class="live__dot" aria-hidden="true"></span><div><b>${esc(p.name)}</b><span>${USER && USER.guest ? 'Exported' : 'Published'} ${ago(p.published)} · ${p.pages.length} pages${p.meta && p.meta.siteUrl ? ` · ${esc(p.meta.siteUrl)}` : ''}</span></div>
      <a class="btn" href="editor.html?project=${encodeURIComponent(p.id)}">Open editor</a></div>
      <div class="live__acts">${[['seo', 'SEO boost'], ['marketing', 'Marketing plan'], ['health', 'Health check'], ['commerce', 'Sales & store'], ['reports', 'Reports'], ['versions', 'Versions & GitHub']].map(([k, l]) => `<button type="button" class="ai__chip" data-svc="${k}">${l}</button>`).join('')}</div>
      <div class="live__out" data-out hidden></div></article>`).join('');
  }
  const LEVEL = { pass: '✓', info: 'i', warn: '!', fail: '×' };
  const reportHTML = (rep) => `<ul class="hq-rep">${(rep || []).map((x) => `<li class="lv-${x.level}"><i>${LEVEL[x.level] || 'i'}</i><div><b>${esc(x.title)}</b>${x.detail ? `<span>${esc(x.detail)}</span>` : ''}</div></li>`).join('')}</ul>`;
  async function runService(pid, svc, out) {
    const P = projects.find((x) => x.id === pid); if (!P) return; out.hidden = false; out.innerHTML = '<p class="hint">Working…</p>';
    if (svc === 'reports') { out.innerHTML = reportHTML([{ level: 'info', title: 'Connect analytics', detail: 'Add Plausible, Fathom or Google Analytics: paste its script tag into a Code Embed. Loom’s strict CSP needs the analytics domain allowed; Relay can prepare that.' }, { level: 'info', title: 'Connect revenue', detail: 'Stripe or Shopify dashboards show orders and revenue. Link them here once connected.' }, { level: 'pass', title: `${P.pages.length} pages · ${P.pages.reduce((a, pg) => a + pg.tree.length, 0)} sections`, detail: `Last edited ${ago(P.updated)}.` }]); return; }
    if (svc === 'versions') { const repo = (S.ops[pid] || {}).repo || ''; out.innerHTML = `<div class="hq-form"><label>GitHub repository<input class="in" data-repo value="${esc(repo)}" placeholder="https://github.com/you/${esc(P.slug)}"></label><button class="btn" type="button" data-save-repo>Save</button></div>${reportHTML([{ level: 'info', title: 'Version workflow', detail: '1) Export the site (Publish). 2) Create a GitHub repo. 3) Upload the files, or: git init && git add . && git commit -m "Loom export" && git push. 4) Settings → Pages → Deploy from branch. Each export is a new commit, so you can roll back any time.' }, { level: 'info', title: 'Project backups', detail: 'Projects → Export gives a .loom.json you can keep in the same repo.' }])}`; return; }
    const agent = svc === 'health' ? ['qa', 'security'] : [svc];
    const outs = []; for (const ag of agent) outs.push(Object.assign(await A.runAgent(ag, ag === 'seo' ? 'improve seo' : ag === 'commerce' ? 'set up selling' : ag === 'marketing' ? 'launch marketing plan' : 'full audit', L.clone(P), {}), { ag }));
    const ops = outs.flatMap((o) => o.ops || []);
    out.innerHTML = outs.map((o) => `<p class="hq-reply"><b>${esc((A.byId(o.ag) || {}).name)}:</b> ${esc(o.reply || '')}</p>${reportHTML(o.report)}`).join('') + (ops.length ? `<button class="btn btn--blue" type="button" data-apply="${esc(svc)}">Apply ${ops.length} improvement${ops.length > 1 ? 's' : ''}</button>` : '');
    out._ops = ops;
  }

  /* ================================================================ other sections */
  function drawRequests() {
    const box = $('[data-requests]'); if (!box) return;
    const sel = $('[data-req-project]'); sel.innerHTML = projects.length ? projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('') : '<option value="">No projects yet</option>';
    const cols = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
    box.innerHTML = cols.map(([k, l]) => `<div class="req-col"><h4>${l} <span>${S.requests.filter((r) => r.status === k).length}</span></h4>${S.requests.filter((r) => r.status === k).map((r) => { const p = projects.find((x) => x.id === r.pid); return `<div class="req" data-rid="${r.id}"><p>${esc(r.text)}</p><span>${esc(p ? p.name : 'Unassigned')}</span><div class="req__a">${k !== 'done' && p ? `<a class="btn" href="editor.html?project=${encodeURIComponent(p.id)}&ask=${encodeURIComponent(r.text)}" data-do="${r.id}">Do it with Keeper</a>` : ''}${k !== 'done' ? `<button type="button" class="btn btn--ghost" data-move="${r.id}">${k === 'todo' ? 'Start' : 'Done'}</button>` : `<button type="button" class="btn btn--ghost" data-del="${r.id}">Clear</button>`}</div></div>`; }).join('') || '<p class="hint">Nothing here.</p>'}</div>`).join('');
  }
  function drawLaunch() {
    const box = $('[data-launch]'); if (!box) return;
    const p = projects[0]; const name = (p && p.name) || brandName() || 'mybrand';
    box.innerHTML = `<div class="hq-sub"><b>Domain ideas for ${esc(name)}</b>${domainIdeas(name).slice(0, 4).map((d) => `<div class="cto-dom"><code>${esc(d)}</code><span><a href="https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}" target="_blank" rel="noopener">Check</a></span></div>`).join('')}<p class="hint">You buy and own the domain; Relay prepares everything else.</p></div>
      <div class="hq-sub"><b>Recommended hosting</b><p>${esc(hostingAdvice())}</p></div>
      <div class="hq-sub"><b>Launch checklist</b><ul class="hq-check">${['Content proofread', 'Accessibility & QA pass (Probe)', 'Security scan (Sentinel)', 'Titles, descriptions & sitemap (Signal)', 'Domain connected + HTTPS', 'Analytics connected', 'Backups in GitHub'].map((x, i) => `<li><label><input type="checkbox" data-chk="${i}" ${((S.ops.check || {})[i]) ? 'checked' : ''}> ${x}</label></li>`).join('')}</ul></div>`;
  }
  function drawGrowth() {
    const box = $('[data-growth]'); if (!box) return; const live = projects.filter((p) => p.published).length;
    box.innerHTML = `<div class="hq-kpis"><div><span>Live sites</span><b>${live}</b></div><div><span>Visitors (30d)</span><b>—</b><em>Connect analytics</em></div><div><span>Revenue (30d)</span><b>—</b><em>Connect Stripe</em></div><div><span>Leads (30d)</span><b>—</b><em>Connect forms</em></div></div>
      <p class="hint">Numbers appear when you connect a provider. Loom never invents metrics.</p><div class="hq-row"><a class="btn" href="#live">Run an SEO boost</a><a class="btn" href="#live">Get a marketing plan</a></div>`;
  }
  function drawBrand() {
    const box = $('[data-brand]'); if (!box) return; const p = projects[0];
    if (!p) { box.innerHTML = '<div class="hq-empty"><b>No brand yet.</b><span>Your logo, colours and fonts appear here after your first project.</span></div>'; return; }
    box.innerHTML = `<div class="bk">${p.logo ? `<img class="bk__logo" src="data:image/svg+xml,${encodeURIComponent(p.logo)}" alt="${esc(p.name)} logo">` : `<span class="bk__logo bk__logo--txt">${esc(p.name.slice(0, 1))}</span>`}<div><b>${esc(p.name)}</b><span>${esc(p.fonts.heading)} · ${esc(p.fonts.body)}</span></div></div>
      <div class="bk__sw">${p.swatches.map((s) => `<span title="${esc(s.name)} ${esc(s.value)}" style="background:${esc(s.value)}"></span>`).join('')}</div>
      ${projects.length > 1 ? `<div class="hq-form"><label>Apply this brand to<select class="in" data-brand-to>${projects.slice(1).map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><button class="btn" type="button" data-brand-apply>Apply</button></div>` : '<p class="hint">Create another project to reuse this brand kit.</p>'}`;
  }
  function drawUsage() {
    const box = $('[data-usage]'); if (!box) return; const maxPages = Math.max(0, ...projects.map((p) => p.pages.length));
    const bar = (v, max, label) => `<div class="use${v > max ? ' is-over' : ''}"><div><span>${label}</span><b>${v} / ${max}</b></div><i><em style="width:${Math.min(100, (v / max) * 100)}%"></em></i></div>`;
    box.innerHTML = `<p><b>Beta plan · $0</b></p>${bar(projects.length, 1, 'Projects')}${bar(maxPages, 3, 'Pages in largest project')}<p class="hint">Limits are shown for planning; they aren’t enforced during the beta.</p><div class="hq-row"><a class="btn" href="index.html#pricing">Compare plans</a><a class="btn btn--blue" href="mailto:mutaher.ux@gmail.com?subject=Loom%20Pro%20waitlist">Join Pro waitlist</a></div>`;
  }
  function drawTeam() {
    const box = $('[data-team]'); if (!box) return;
    box.innerHTML = `<p>Invite colleagues, set roles and review together on the <b>Enterprise</b> plan.</p><div class="hq-form"><label>Invite by email<input class="in" type="email" placeholder="teammate@company.com" disabled></label><button class="btn" type="button" disabled>Invite</button></div><p class="hint">Team workspaces are coming soon.</p><div class="hq-row"><a class="btn" href="mailto:mutaher.ux@gmail.com?subject=Loom%20support">Contact support</a><a class="btn" href="index.html#faq">Help & FAQ</a></div>`;
  }

  /* ================================================================ wiring */
  function bind() {
    $$('[data-browse]').forEach((b) => b.addEventListener('click', () => window.LoomDash && LoomDash.openNew()));
    const form = $('[data-cto-form]'), input = $('[data-cto-in]');
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    $('[data-cto-chips]').addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) send(b.dataset.chip); });
    $('[data-brief-fields]').addEventListener('click', (e) => { const b = e.target.closest('[data-clear]'); if (!b) return; delete S.brief[b.dataset.clear]; save(); drawBrief(); });
    $('[data-brief-build]').addEventListener('click', buildFromBrief);
    $('[data-brief-dl]').addEventListener('click', downloadBrief);
    $('[data-brief-reset]').addEventListener('click', () => { if (!confirm('Start a new brief? The current conversation will be cleared.')) return; S.chat = []; S.brief = {}; S.pending = null; save(); drawChat(); drawBrief(); });
    $('[data-live]').addEventListener('click', async (e) => {
      const card = e.target.closest('[data-pid]'); if (!card) return; const out = $('[data-out]', card);
      const svc = e.target.closest('[data-svc]'); if (svc) { $$('[data-svc]', card).forEach((b) => b.classList.toggle('is-on', b === svc)); runService(card.dataset.pid, svc.dataset.svc, out); return; }
      const ap = e.target.closest('[data-apply]'); if (ap) { const P = projects.find((x) => x.id === card.dataset.pid); const r = A.applyOps(P, out._ops || []); await L.save(P); out.insertAdjacentHTML('afterbegin', `<p class="hq-ok">Applied ${r.done.length} change${r.done.length === 1 ? '' : 's'} and saved. Re-publish to put them live.</p>`); ap.remove(); return; }
      const sr = e.target.closest('[data-save-repo]'); if (sr) { S.ops[card.dataset.pid] = Object.assign(S.ops[card.dataset.pid] || {}, { repo: $('[data-repo]', card).value.trim() }); save(); toast('Repository saved'); }
    });
    $('[data-req-form]').addEventListener('submit', (e) => { e.preventDefault(); const t = $('[data-req-text]').value.trim(); if (!t) return; S.requests.unshift({ id: 'r' + Date.now().toString(36), text: t.slice(0, 400), pid: $('[data-req-project]').value, status: 'todo', at: Date.now() }); $('[data-req-text]').value = ''; save(); drawRequests(); });
    $('[data-requests]').addEventListener('click', (e) => {
      const mv = e.target.closest('[data-move]'); if (mv) { const r = S.requests.find((x) => x.id === mv.dataset.move); r.status = r.status === 'todo' ? 'doing' : 'done'; save(); drawRequests(); }
      const del = e.target.closest('[data-del]'); if (del) { S.requests = S.requests.filter((x) => x.id !== del.dataset.del); save(); drawRequests(); }
      const d0 = e.target.closest('[data-do]'); if (d0) { const r = S.requests.find((x) => x.id === d0.dataset.do); if (r) { r.status = 'doing'; save(); } }
    });
    $('[data-launch]').addEventListener('change', (e) => { const c = e.target.closest('[data-chk]'); if (!c) return; S.ops.check = Object.assign(S.ops.check || {}, { [c.dataset.chk]: c.checked }); save(); });
    $('[data-brand]').addEventListener('click', async (e) => { if (!e.target.closest('[data-brand-apply]')) return; const src = projects[0], to = projects.find((x) => x.id === $('[data-brand-to]').value); if (!src || !to) return; to.swatches = L.clone(src.swatches); to.fonts = L.clone(src.fonts); if (src.logo) to.logo = src.logo; await L.save(to); toast(`Brand applied to ${to.name}`); });
  }
  async function refresh() { await loadProjects(); drawLive(); drawRequests(); drawLaunch(); drawGrowth(); drawBrand(); drawUsage(); drawTeam(); }
  async function init(user) {
    USER = user; KEY = 'loom-hq:' + (user ? user.id : 'anon'); S = Object.assign({ chat: [], brief: {}, requests: [], ops: {} }, store.get());
    $$('[data-agents-of]').forEach((el) => (el.innerHTML = team(el.dataset.agentsOf.split(','))));
    bind(); drawChat(); drawBrief(); await refresh();
    const links = $$('.hq-nav a[href^="#"]'), io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => { const on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('is-on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }), { rootMargin: '-40% 0px -55% 0px' });
    links.forEach((a) => { const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) io.observe(t); });
  }
  window.LoomHQ = { init, refresh, send };
})();
