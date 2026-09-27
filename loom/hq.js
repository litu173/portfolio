/* LOOM HQ — the client's tech team in one place.
   Plan   · the AI Agent (a CTO-style chat) that turns a conversation into a project brief (requirements, budget, platform,
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

  /* ================================================================ 1. PLAN: the AI Agent chat */
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
  function hostingAdvice(P) {
    const f = P ? `${P.shop ? 'shop' : ''} ${P.pages.some((pg) => JSON.stringify(pg.tree).includes('"cls":"dash"')) ? 'dashboard' : ''}` : T(S.brief.features + ' ' + S.brief.goals);
    if (/login|dashboard/.test(f)) return 'You need accounts and data, so pair a static host (Netlify or Vercel) with a managed backend such as Supabase. Loom exports the front end; your AI Agent’s checklist covers the backend.';
    if (/sell|payment|shop/.test(f)) return 'For a store: host the site on Netlify or Cloudflare Pages (free, fast, HTTPS) and take payments with Stripe Payment Links or Shopify Buy Buttons. No server to maintain.';
    return 'Your site is static, the fastest and safest kind. GitHub Pages, Netlify or Cloudflare Pages host it free with automatic HTTPS. I’d pick Cloudflare Pages for speed or Netlify for the easiest drag-and-drop.';
  }
  // intents the AI Agent answers at any time
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
  // what the AI Agent shows it is doing while it thinks, matched to the message
  function thinkingSteps(text) {
    const t = T(text);
    if (/domain/.test(t)) return ['Reading your message', 'Checking domain ideas', 'Comparing registrars', 'Writing a reply'];
    if (/\b(host|hosting|server|deploy)\b/.test(t)) return ['Reading your message', 'Matching hosts to your features', 'Checking costs and HTTPS', 'Writing a reply'];
    if (/\b(cost|budget|price|how much|estimate)\b/.test(t)) return ['Reading your message', 'Pricing your features', 'Comparing with agency rates', 'Writing a reply'];
    if (/^(build|build it|let'?s build|go ahead|make it)\b/.test(t)) return ['Reviewing your brief', 'Briefing the design team', 'Getting ready to build'];
    return ['Reading your message', 'Updating your brief', 'Weighing the options', 'Writing a reply'];
  }
  let thinking = false;
  async function send(text) {
    text = String(text || '').trim(); if (!text || thinking) return;
    S.chat.push({ who: 'you', text }); save(); drawChat();
    thinking = true; setComposer(false);
    const box = $('[data-cto-thread]'), row = document.createElement('div'); row.className = 'cto-msg cto-msg--cto cto-msg--think';
    const th = window.LoomThink ? LoomThink.create({ agents: ['director', 'architect', 'devops', 'commerce', 'brand', 'seo'], who: 'Your AI Agent is thinking', steps: thinkingSteps(text), every: 620 }) : null;
    if (th) { const bub = document.createElement('div'); bub.className = 'cto-bub cto-bub--think'; bub.append(th.el); row.append(bub); box.append(row); box.scrollTop = box.scrollHeight; }
    let build = false;
    try {
      const work = async () => {
        const asked = S.pending || null;
        const st = await A.status();
        let reply = '', card = null;
        if (st.available) {
          try {
            const r = await fetch('/__ai/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ agent: 'cto', request: text, context: JSON.stringify({ brief: S.brief, chat: S.chat.slice(-12) }) }) }).then((x) => x.json());
            if (r.ok && r.data) { Object.assign(S.brief, Object.fromEntries(Object.entries(r.data.brief || {}).filter(([, v]) => v))); reply = r.data.reply; S.chips = r.data.chips || []; }
          } catch (e) { /* fall back to the local AI Agent */ }
        }
        if (!reply) {
          const slotChip = asked && SLOTS.find((x) => x.k === asked).chips.includes(text);  // a quick reply answers the question asked
          const it = slotChip ? null : intent(text);
          if (it && it.build) { build = true; return { reply: 'Great, building it now from your brief. You’ll pick one of three design directions.' }; }
          const got = extract(text, it ? null : asked); Object.assign(S.brief, Object.fromEntries(Object.entries(got).filter(([k]) => !S.brief[k] || k === asked)));
          if (it) { const again = intent(text); it.reply = again.reply; it.card = again.card; }  // re-answer with what we just learned
          if (it) { reply = it.reply; card = it.card || null; if (it.done && !S.brief[it.done]) S.brief[it.done] = 'Choosing (see ideas)'; }
          const n = nextSlot();
          const learned = Object.keys(got).filter((k) => k !== asked).map((k) => SLOTS.find((x) => x.k === k).label.toLowerCase());
          if (!it) reply = (learned.length ? `Noted (and I picked up your ${learned.join(', ')}). ` : 'Got it. ') + (n ? n.q : 'Your brief is complete. Want me to build it? I’ll design three directions for you to choose from.');
          else if (n) reply += `\n\nNext: ${n.q}`;
          S.pending = n ? n.k : null; S.chips = n ? n.chips : ['Build it', 'Estimate the cost', 'Recommend hosting', 'Help me buy a domain'];
          if (S.brief.business && !S.brief.category) { const lib = C.detect(S.brief.business); S.brief.category = lib ? lib.category : ''; }
        }
        return { reply, card };
      };
      const res = window.LoomThink ? await LoomThink.pace(work, LoomThink.jitter(2100, 900)) : await work();
      S.chat.push({ who: 'cto', text: res.reply, card: res.card || null, fresh: true });
    } finally {
      if (th) th.stop(); row.remove(); thinking = false; setComposer(true);
    }
    save(); drawChat(); drawBrief();
    if (build) buildFromBrief();
  }
  function setComposer(on) { const f = $('[data-cto-form]'); if (!f) return; f.classList.toggle('is-busy', !on); $('button[type="submit"]', f).disabled = !on; $('[data-cto-chips]').classList.toggle('is-off', !on); if (on) $('[data-cto-in]').focus({ preventScroll: true }); }
  function drawChat() {
    const box = $('[data-cto-thread]'); if (!box) return;
    if (!S.chat.length) { S.chat.push({ who: 'cto', text: `Hi${USER && !USER.guest ? ' ' + String(USER.name).split(' ')[0] : ''}, I’m your AI Agent, your CTO and tech lead. Let’s plan your site together: requirements, budget, platform, domain and hosting. ${SLOTS[0].q}` }); S.pending = 'business'; S.chips = SLOTS[0].chips; }
    box.innerHTML = S.chat.map((m) => `<div class="cto-msg cto-msg--${m.who}${m.fresh ? ' is-new' : ''}">${m.who === 'cto' ? '<span class="ai__av ai__av--s" style="--c:#F5F5F7" aria-hidden="true"><span>✦</span></span>' : ''}<div class="cto-bub">${esc(m.text).replace(/\n/g, '<br>')}${m.card ? cardHTML(m.card) : ''}</div></div>`).join('');
    const chips = $('[data-cto-chips]'); chips.innerHTML = (S.chips || []).map((c) => `<button type="button" class="ai__chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
    S.chat.forEach((m) => delete m.fresh);
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
  function buildFromBrief() { if (!S.brief.business) { toast('Tell the AI Agent about your business first'); return; } const lib = C.detect(S.brief.business); window.LoomDash.build(briefText(), brandName() || undefined, lib && lib.id !== 'studio' ? lib.id : undefined); }
  function downloadBrief() {
    const lines = ['# Project brief', '', ...SLOTS.map((s) => `- **${s.label}:** ${S.brief[s.k] || '—'}`), '', `Estimated with Loom: ${estimate().loom}`, '', '## Conversation', ...S.chat.map((m) => `**${m.who === 'you' ? 'You' : 'AI Agent'}:** ${m.text}`)];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })); a.download = 'project-brief.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  /* ================================================================ projects, live sites, the More menu */
  let projects = [];
  async function loadProjects() { const list = await L.list(); projects = []; for (const s of list) { const p = await L.load(s.id); if (p && !p.deleted) projects.push(p); } }
  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };
  const ops = (pid) => (S.ops[pid] = S.ops[pid] || {});
  const SECTIONS = [
    { k: 'golive', label: 'Go live', agents: ['devops', 'security'] },
    { k: 'requests', label: 'Change requests', agents: ['maintainer', 'copy', 'qa'] },
    { k: 'versions', label: 'Versions & GitHub', agents: ['devops'] },
    { k: 'growth', label: 'Growth & finance', agents: ['marketing', 'commerce', 'seo'] },
    { k: 'brand', label: 'Brand kit', agents: ['brand', 'logo'] },
    { k: 'usage', label: 'Plan & usage', agents: [] },
    { k: 'team', label: 'Team & support', agents: [] }
  ];
  const SERVICES = { health: { label: 'Health check', agents: ['qa', 'security'], steps: ['Loading every page', 'Testing accessibility and contrast', 'Scanning for security issues', 'Writing the report'] }, seo: { label: 'SEO boost', agents: ['seo'], steps: ['Reading every page', 'Writing titles and descriptions', 'Adding social cards and structured data'] }, marketing: { label: 'Marketing plan', agents: ['marketing'], steps: ['Studying your brand', 'Choosing channels', 'Drafting posts and an email', 'Building the calendar'] }, commerce: { label: 'Sales & store', agents: ['commerce'], steps: ['Reviewing your products', 'Checking payments and shipping', 'Writing the selling plan'] }, reports: { label: 'Reports', agents: ['data'], steps: ['Gathering site stats', 'Checking connected providers'] } };

  const LV = () => window.LoomLive;
  const domainOf = (p) => (p.live && p.live.domain && p.live.domain.status === 'connected' ? p.live.domain.name : null);
  const hostOf = (p) => (p.live && p.live.hosting && p.live.hosting.status === 'active' ? (LV().HOSTING.find((h) => h.id === p.live.hosting.plan) || {}).name : null);
  function drawLive() {
    const box = $('[data-live]'); if (!box) return;
    const live = projects.filter((p) => p.published);
    const n = $('[data-live-n]'); if (n) n.textContent = live.length ? `· ${live.length}` : '';
    if (!live.length) { box.innerHTML = `<div class="hq-empty"><b>Nothing live yet.</b><span>Open a project and press <b>Publish</b>. It goes live on its Loom address, then you add a domain and hosting here.</span></div>`; return; }
    box.innerHTML = live.map((p) => {
      const url = (p.live && p.live.url) || ''; const dom = domainOf(p), host = hostOf(p);
      const step = (done, label, act) => `<li class="${done ? 'is-done' : ''}"><i aria-hidden="true">${done ? '✓' : ''}</i><span>${label}</span>${!done && act ? act : ''}</li>`;
      return `<article class="live" data-pid="${esc(p.id)}">
        <div class="live__h"><span class="live__dot" aria-hidden="true"></span><div><b>${esc(p.name)}</b>${url ? `<a class="live__url" href="${esc(url)}" target="_blank" rel="noopener">${esc(dom || (p.live && p.live.future) || url)}</a>` : `<span>Exported ${ago(p.published)}</span>`}</div><span data-more-slot></span></div>
        <p class="live__meta">${p.live ? `v${p.live.version} · published ${ago(p.live.at)}` : 'Exported before Loom addresses. Publish again to get one.'}</p>
        <ol class="live__steps" aria-label="Go-live steps">${step(!!p.live, p.live ? 'On its Loom address' : 'Publish to Loom', '')}${step(!!dom, dom ? `Domain · ${esc(dom)}` : 'Assign a domain', `<button type="button" class="btn" data-golive="domain">Assign</button>`)}${step(!!host, host ? `Hosting · ${esc(host)}` : 'Add hosting', `<button type="button" class="btn" data-golive="hosting">Add</button>`)}</ol>
        <div class="live__btns">${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Visit ↗</a>` : ''}<a class="btn" href="editor.html?project=${encodeURIComponent(p.id)}">Open editor</a></div>
        <details class="live__svc"><summary>Grow &amp; maintain</summary><div class="live__acts" role="group" aria-label="Services for ${esc(p.name)}">${Object.entries(SERVICES).map(([k, v]) => `<button type="button" class="ai__chip" data-svc="${k}">${v.label}</button>`).join('')}</div><div class="live__out" data-out hidden></div></details></article>`;
    }).join('');
    $$('.live', box).forEach((el) => { const p = projects.find((x) => x.id === el.dataset.pid); $('[data-more-slot]', el).replaceWith(more(p)); });
  }
  const LEVEL = { pass: '✓', info: 'i', warn: '!', fail: '×' };
  const reportHTML = (rep) => `<ul class="hq-rep">${(rep || []).map((x) => `<li class="lv-${x.level}"><i>${LEVEL[x.level] || 'i'}</i><div><b>${esc(x.title)}</b>${x.detail ? `<span>${esc(x.detail)}</span>` : ''}</div></li>`).join('')}</ul>`;
  async function runService(P, svc, out) {
    const def = SERVICES[svc]; out.hidden = false; out.innerHTML = ''; out._ops = [];
    const th = window.LoomThink ? LoomThink.create({ agents: def.agents.concat(['director']), who: `${def.agents.map((a) => A.byId(a).name).join(' & ')} ${def.agents.length > 1 ? 'are' : 'is'} working`, steps: def.steps, every: 700 }) : null;
    if (th) out.append(th.el);
    const work = async () => {
      if (svc === 'reports') return { html: reportHTML([{ level: 'info', title: 'Connect analytics', detail: 'Add Plausible, Fathom or Google Analytics with a Code Embed in the editor. Loom’s strict CSP needs the analytics domain allowed; Relay can prepare that.' }, { level: 'info', title: 'Connect revenue', detail: 'Stripe or Shopify dashboards show orders and revenue. Link them here once connected.' }, { level: 'pass', title: `${P.pages.length} pages · ${P.pages.reduce((a, pg) => a + pg.tree.length, 0)} sections`, detail: `Last edited ${ago(P.updated)}.` }]) };
      const outs = []; for (const ag of svc === 'health' ? ['qa', 'security'] : [svc]) outs.push(Object.assign(await A.runAgent(ag, ag === 'seo' ? 'improve seo' : ag === 'commerce' ? 'set up selling' : ag === 'marketing' ? 'launch marketing plan' : 'full audit', L.clone(P), {}), { ag }));
      const o = outs.flatMap((x) => x.ops || []);
      return { ops: o, html: outs.map((x) => `<p class="hq-reply"><b>${esc((A.byId(x.ag) || {}).name)}:</b> ${esc(x.reply || '')}</p>${reportHTML(x.report)}`).join('') + (o.length ? `<div class="hq-row"><button class="btn btn--blue" type="button" data-apply>Apply ${o.length} improvement${o.length > 1 ? 's' : ''}</button><a class="btn" href="editor.html?project=${encodeURIComponent(P.id)}">Review in editor</a></div>` : '') };
    };
    const r = window.LoomThink ? await LoomThink.pace(work, LoomThink.jitter(2300, 900)) : await work();
    if (th) th.stop(); out.innerHTML = `<div class="is-new">${r.html}</div>`; out._ops = r.ops || [];
  }
  async function applyService(P, out, btn) { const r = A.applyOps(P, out._ops || []); await L.save(P); out.insertAdjacentHTML('afterbegin', `<p class="hq-ok">Applied ${r.done.length} change${r.done.length === 1 ? '' : 's'} and saved. Re-publish to put them live.</p>`); btn.remove(); }

  /* ---------------------------------------------------------------- More menu (one shared popover) */
  let menuEl = null, menuFor = null;
  function closeMenu(focusBack = true) { if (!menuEl || menuEl.hidden) return; menuEl.hidden = true; if (menuFor) { menuFor.setAttribute('aria-expanded', 'false'); if (focusBack) menuFor.focus(); } menuFor = null; }
  function openMenu(btn, items) {
    if (!menuEl) {
      menuEl = document.createElement('div'); menuEl.className = 'hq-menu'; menuEl.setAttribute('role', 'menu'); menuEl.hidden = true; document.body.append(menuEl);
      document.addEventListener('pointerdown', (e) => { if (menuEl.hidden || menuEl.contains(e.target) || (menuFor && menuFor.contains(e.target))) return; closeMenu(false); });
      menuEl.addEventListener('keydown', (e) => {
        const its = $$('[role="menuitem"]', menuEl), i = its.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); } else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } else if (e.key === 'Tab') closeMenu(false);
      });
      addEventListener('resize', () => closeMenu(false)); addEventListener('scroll', () => closeMenu(false), true);
    }
    if (menuFor === btn) { closeMenu(); return; }
    closeMenu(false); menuFor = btn; btn.setAttribute('aria-expanded', 'true');
    menuEl.innerHTML = ''; items.forEach((it) => {
      if (it === '-') { const h = document.createElement('div'); h.className = 'hq-menu__sep'; h.setAttribute('role', 'separator'); menuEl.append(h); return; }
      if (it.head) { const h = document.createElement('div'); h.className = 'hq-menu__h'; h.textContent = it.head; menuEl.append(h); return; }
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.className = 'hq-menu__i' + (it.danger ? ' is-danger' : '');
      b.innerHTML = `<span>${esc(it.label)}</span>${it.agents && it.agents.length ? team(it.agents) : ''}`;
      b.addEventListener('click', () => { closeMenu(false); it.run(); }); menuEl.append(b);
    });
    menuEl.hidden = false; const r = btn.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    menuEl.style.left = `${Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw))}px`;
    menuEl.style.top = `${r.bottom + 6 + mh > innerHeight - 8 ? Math.max(8, r.top - mh - 6) : r.bottom + 6}px`;
    $('[role="menuitem"]', menuEl).focus();
  }
  /** The ⋯ button for a project: its tools (in a drawer), plus any card actions the caller adds. */
  function more(p, extra = []) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn hq-more'; b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', `More for ${p.name}`); b.innerHTML = '<span aria-hidden="true">•••</span>';
    b.addEventListener('click', (e) => { e.stopPropagation(); openMenu(b, [{ head: 'Project tools' }, ...SECTIONS.map((sec) => ({ label: sec.label, agents: sec.agents, run: () => openDrawer(p.id, sec.k) })), ...(extra.length ? ['-', ...extra] : [])]); });
    return b;
  }

  /* ---------------------------------------------------------------- project drawer */
  let drawerP = null, drawerK = 'requests', drawerReturn = null;
  function drawer() {
    let d = $('[data-drawer]'); if (d) return d;
    d = document.createElement('div'); d.className = 'hq-drawer'; d.dataset.drawer = ''; d.hidden = true;
    d.innerHTML = `<div class="hq-drawer__scrim" data-drawer-close></div><aside class="hq-drawer__box" role="dialog" aria-modal="true" aria-labelledby="dr-t"><header class="hq-drawer__h"><div><span class="hq-kicker">Project</span><h2 id="dr-t" data-dr-name></h2><span class="hint" data-dr-meta></span></div><div class="hq-row"><a class="btn btn--blue" data-dr-edit href="#">Open editor</a><button class="btn hq-drawer__x" type="button" data-drawer-close aria-label="Close">×</button></div></header><nav class="hq-drawer__tabs" role="tablist" aria-label="Project tools" data-dr-tabs></nav><div class="hq-drawer__body" role="tabpanel" data-dr-body tabindex="-1"></div></aside>`;
    document.body.append(d);
    d.addEventListener('click', (e) => { if (e.target.closest('[data-drawer-close]')) closeDrawer(); const t = e.target.closest('[data-dr-tab]'); if (t) { drawerK = t.dataset.drTab; drawDrawer(); } });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); }
      const tab = e.target.closest('[data-dr-tab]'); if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const ts = $$('[data-dr-tab]', d), i = ts.indexOf(tab); const nx = ts[(i + (e.key === 'ArrowRight' ? 1 : ts.length - 1)) % ts.length]; drawerK = nx.dataset.drTab; drawDrawer(); $(`[data-dr-tab="${drawerK}"]`, d).focus(); }
    });
    bindDrawer(d); return d;
  }
  async function openDrawer(pid, k, step) {
    if (!projects.some((x) => x.id === pid)) await loadProjects();
    drawerP = projects.find((x) => x.id === pid); if (!drawerP) return; drawerK = k || 'requests'; drawerReturn = document.activeElement;
    const d = drawer(); d.hidden = false; document.documentElement.classList.add('hq-lock'); drawDrawer(); requestAnimationFrame(() => d.classList.add('is-open')); $('[data-dr-body]', d).focus({ preventScroll: true });
    if (step) setTimeout(() => { const el = $(`[data-step="${step}"]`, d); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('is-flash'); } }, 350);
  }
  function closeDrawer() { const d = $('[data-drawer]'); if (!d || d.hidden) return; d.classList.remove('is-open'); document.documentElement.classList.remove('hq-lock'); setTimeout(() => (d.hidden = true), 250); if (drawerReturn && drawerReturn.focus) drawerReturn.focus(); }
  function drawDrawer() {
    const d = drawer(), P = drawerP;
    $('[data-dr-name]', d).textContent = P.name; $('[data-dr-meta]', d).textContent = `${P.pages.length} pages · edited ${ago(P.updated)}${P.published ? ` · live since ${ago(P.published)}` : ' · not published yet'}`;
    $('[data-dr-edit]', d).href = `editor.html?project=${encodeURIComponent(P.id)}`;
    $('[data-dr-tabs]', d).innerHTML = SECTIONS.map((sec) => `<button type="button" role="tab" data-dr-tab="${sec.k}" aria-selected="${sec.k === drawerK}" tabindex="${sec.k === drawerK ? 0 : -1}">${esc(sec.label)}</button>`).join('');
    const sec = SECTIONS.find((x) => x.k === drawerK);
    $('[data-dr-body]', d).innerHTML = `<div class="hq-drawer__sh"><h3>${esc(sec.label)}</h3>${sec.agents.length ? team(sec.agents) : ''}</div>` + VIEWS[drawerK](P);
  }
  const VIEWS = {
    golive(P) {
      if (!P.live) return `<div class="hq-empty"><b>Publish first.</b><span>Open the editor and press Publish. Your site goes live on a free Loom address, then you connect a domain and hosting here.</span></div><div class="hq-row"><a class="btn btn--blue" href="editor.html?project=${encodeURIComponent(P.id)}">Open editor</a></div>`;
      const D = P.live.domain || {}, Hs = P.live.hosting || {}; const dom = domainOf(P), host = hostOf(P);
      const final = dom ? `https://${dom}` : `https://${P.live.future}`;
      const dnsTable = (d) => `<table class="dns"><thead><tr><th>Type</th><th>Host</th><th>Value</th></tr></thead><tbody>${LV().dnsRecords(P.live.slug, d).map((r) => `<tr><td>${r.type}</td><td><code>${esc(r.host)}</code></td><td><code>${esc(r.value)}</code>${r.note ? ` <small>${esc(r.note)}</small>` : ''}</td></tr>`).join('')}</tbody></table>`;
      let domain = '';
      if (D.status === 'connected') domain = `<div class="gl-ok"><b>${esc(D.name)}</b> is connected${D.bought ? ` · registered to you until ${new Date(D.renews).toLocaleDateString()} (test)` : ''} · HTTPS active</div><div class="hq-row"><button class="btn btn--ghost" type="button" data-dom-remove>Remove domain</button></div>`;
      else if (D.mode === 'own' && D.name) domain = `<p class="hq-lead">Add these records at your domain registrar (where you bought <b>${esc(D.name)}</b>), then check.</p>${dnsTable(D.name)}<div class="hq-row"><button class="btn btn--blue" type="button" data-dom-check>Check DNS</button><button class="btn btn--ghost" type="button" data-dom-reset>Use a different domain</button></div><div data-dom-out>${D.checks ? '<p class="gl-warn">Not detected yet. DNS changes can take up to 48 hours. Check again later.</p>' : ''}</div>`;
      else if (D.mode === 'own') domain = `<div class="hq-form"><label>Your domain<input class="in" data-dom-name placeholder="example.com" autocomplete="off"></label><button class="btn btn--blue" type="button" data-dom-connect>Connect</button></div><button class="btn btn--ghost" type="button" data-dom-reset>Back</button>`;
      else if (D.mode === 'buy') domain = `<div class="hq-form"><label>Find a domain<input class="in" data-dom-q value="${esc(D.q || L.slug(P.name).replace(/-/g, ''))}" autocomplete="off"></label><button class="btn btn--blue" type="button" data-dom-search>Search</button></div><div class="gl-results" data-dom-results>${D.q ? resultsHTML(D.q) : ''}</div><button class="btn btn--ghost" type="button" data-dom-reset>Back</button>`;
      else domain = `<div class="gl-opts"><button type="button" class="gl-opt" data-dom-mode="own"><b>Connect a domain I own</b><span>Point your existing domain at Loom with a few DNS records.</span></button><button type="button" class="gl-opt" data-dom-mode="buy"><b>Get a new domain</b><span>Search and register one. Test mode during the beta.</span></button><div class="gl-opt is-static"><b>Keep the Loom address</b><span>${esc(P.live.future)} is free and already live.</span></div></div>`;
      const hosting = Hs.status === 'active' ? `<div class="gl-ok"><b>${esc(host)}</b> is active since ${new Date(Hs.at).toLocaleDateString()}${Hs.plan === 'loom-pro' ? ' · $9/month (test, not charged)' : ''}</div><div class="hq-row"><button class="btn btn--ghost" type="button" data-host-reset>Change plan</button></div>`
        : Hs.plan === 'self' ? `<p class="hq-lead">Download the code and deploy it anywhere:</p><ul class="gl-steps"><li><b>Netlify</b>: drag the unzipped folder onto app.netlify.com/drop.</li><li><b>Cloudflare Pages</b>: Create project → Direct upload.</li><li><b>GitHub Pages</b>: push to a repo, Settings → Pages.</li></ul><div class="hq-row"><button class="btn btn--blue" type="button" data-export>Export code (.zip)</button><button class="btn" type="button" data-host-done>I’ve deployed it</button><button class="btn btn--ghost" type="button" data-host-reset>Back</button></div>`
        : `<div class="gl-plans">${LV().HOSTING.map((h) => `<button type="button" class="gl-plan${h.rec ? ' is-rec' : ''}" data-host-pick="${h.id}"><span>${h.rec ? '<em>Recommended</em>' : ''}<b>${esc(h.name)}</b><strong>${esc(h.price)}</strong></span><small>${esc(h.note)}</small></button>`).join('')}</div><div data-host-out></div>`;
      return `<div class="gl-sum"><span class="live__dot" aria-hidden="true"></span><div><b>${dom && host ? 'Fully live' : 'Live on Loom'}</b><span>${esc(final)}${host ? ` · ${esc(host)}` : ''}</span></div><a class="btn" href="${esc(P.live.url)}" target="_blank" rel="noopener">Visit ↗</a></div>
        <p class="gl-test">Beta test mode: domain purchases, DNS checks and hosting plans are simulated. Nothing is bought, charged or connected.</p>
        <ol class="gl">
          <li class="is-done"><div class="gl__h"><i>✓</i><b>Loom address</b></div><div class="gl__b"><p class="hq-lead"><a href="${esc(P.live.url)}" target="_blank" rel="noopener">${esc(P.live.url.replace(/^https?:\/\//, ''))}</a> · version ${P.live.version} · at launch <b>${esc(P.live.future)}</b></p></div></li>
          <li class="${dom ? 'is-done' : 'is-now'}" data-step="domain"><div class="gl__h"><i>${dom ? '✓' : '2'}</i><b>Domain</b></div><div class="gl__b">${domain}</div></li>
          <li class="${host ? 'is-done' : dom ? 'is-now' : ''}" data-step="hosting"><div class="gl__h"><i>${host ? '✓' : '3'}</i><b>Hosting</b></div><div class="gl__b">${hosting}</div></li>
        </ol>`;
    },
    requests(P) {
      const mine = S.requests.filter((r) => r.pid === P.id), cols = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
      return `<p class="hq-lead">Write changes in plain words. Keeper makes them in the editor, and you review before publishing.</p>
        <form class="hq-form hq-form--req" data-req-form><label class="sr" for="req-text">New change request</label><input class="in" id="req-text" data-req-text placeholder="e.g. Update our opening hours to 9am–6pm on the Contact page" maxlength="400"><button class="btn btn--blue" type="submit">Add request</button></form>
        <div class="req-board">${cols.map(([k, l]) => `<div class="req-col"><h4>${l} <span>${mine.filter((r) => r.status === k).length}</span></h4>${mine.filter((r) => r.status === k).map((r) => `<div class="req"><p>${esc(r.text)}</p><span>${ago(r.at)}</span><div class="req__a">${k !== 'done' ? `<a class="btn" href="editor.html?project=${encodeURIComponent(P.id)}&ask=${encodeURIComponent(r.text)}" data-do="${r.id}">Do it in the editor</a><button type="button" class="btn btn--ghost" data-move="${r.id}">${k === 'todo' ? 'Start' : 'Mark done'}</button>` : `<button type="button" class="btn btn--ghost" data-del="${r.id}">Clear</button>`}</div></div>`).join('') || '<p class="hint">Nothing here.</p>'}</div>`).join('')}</div>`;
    },
    launch(P) {
      const chk = ops(P.id).check || {};
      return `<div class="hq-sub"><b>Domain ideas</b>${domainIdeas(P.name).slice(0, 5).map((d) => `<div class="cto-dom"><code>${esc(d)}</code><span><a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noopener">Cloudflare</a> · <a href="https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}" target="_blank" rel="noopener">Namecheap</a> · <a href="https://porkbun.com/checkout/search?q=${encodeURIComponent(d)}" target="_blank" rel="noopener">Porkbun</a></span></div>`).join('')}<p class="hint">Buy the domain in your own name with auto-renew and 2FA on. Loom never buys it for you.</p></div>
        <div class="hq-form"><label>Your domain<input class="in" data-domain value="${esc(ops(P.id).domain || '')}" placeholder="${esc(domainIdeas(P.name)[0])}"></label><button class="btn" type="button" data-save-domain>Save</button></div>
        <div class="hq-sub"><b>Recommended hosting</b><p>${esc(hostingAdvice(P))}</p></div>
        ${cardHTML({ kind: 'dns' })}
        <div class="hq-sub"><b>Launch checklist</b><ul class="hq-check">${['Content proofread', 'Accessibility & QA pass (Probe, in the editor)', 'Security scan (Sentinel)', 'Titles, descriptions & sitemap (Signal)', 'Domain connected + HTTPS', 'Analytics connected', 'Backups in GitHub'].map((x, i) => `<li><label><input type="checkbox" data-chk="${i}" ${chk[i] ? 'checked' : ''}> ${x}</label></li>`).join('')}</ul></div>`;
    },
    versions(P) {
      return `<div class="hq-form"><label>GitHub repository<input class="in" data-repo value="${esc(ops(P.id).repo || '')}" placeholder="https://github.com/you/${esc(P.slug)}"></label><button class="btn" type="button" data-save-repo>Save</button></div>
        ${reportHTML([{ level: 'info', title: 'Version workflow', detail: '1) Export or publish the site from the editor. 2) Create a GitHub repository. 3) Upload the files, or run: git init && git add . && git commit -m "Loom export" && git push. 4) Settings → Pages → Deploy from branch. Every export is a new commit, so you can roll back at any time.' }, { level: 'info', title: 'Project backups', detail: 'Download a .loom.json backup and keep it in the same repository.' }])}
        <div class="hq-row"><button class="btn" type="button" data-backup>Download project backup</button>${ops(P.id).repo ? `<a class="btn" href="${esc(ops(P.id).repo)}" target="_blank" rel="noopener">Open repository ↗</a>` : ''}</div>`;
    },
    growth(P) {
      return `<div class="hq-kpis"><div><span>Visitors (30d)</span><b>—</b><em>Connect analytics</em></div><div><span>Revenue (30d)</span><b>—</b><em>Connect Stripe</em></div><div><span>Leads (30d)</span><b>—</b><em>Connect forms</em></div><div><span>Status</span><b>${P.published ? 'Live' : 'Draft'}</b></div></div>
        <p class="hint">Numbers appear when you connect a provider. Loom never invents metrics.</p>
        <div class="live__acts" role="group" aria-label="Growth services">${['seo', 'marketing', 'commerce'].map((k) => `<button type="button" class="ai__chip" data-dsvc="${k}">${SERVICES[k].label}</button>`).join('')}</div><div class="live__out" data-dout hidden></div>`;
    },
    brand(P) {
      const others = projects.filter((x) => x.id !== P.id);
      return `<div class="bk">${P.logo ? `<img class="bk__logo" src="data:image/svg+xml,${encodeURIComponent(P.logo)}" alt="${esc(P.name)} logo">` : `<span class="bk__logo bk__logo--txt">${esc(P.name.slice(0, 1))}</span>`}<div><b>${esc(P.name)}</b><span>${esc(P.fonts.heading)} · ${esc(P.fonts.body)}</span></div></div>
        <div class="bk__sw">${P.swatches.map((s) => `<span title="${esc(s.name)} ${esc(s.value)}" style="background:${esc(s.value)}"></span>`).join('')}</div>
        <p class="hint">Change colours, fonts and the logo in the editor’s Style guide, or ask Hue and Mark there.</p>
        ${others.length ? `<div class="hq-form"><label>Apply this brand to<select class="in" data-brand-to>${others.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><button class="btn" type="button" data-brand-apply>Apply</button></div>` : ''}`;
    },
    usage() {
      const maxPages = Math.max(0, ...projects.map((p) => p.pages.length));
      const bar = (v, max, label) => `<div class="use${v > max ? ' is-over' : ''}"><div><span>${label}</span><b>${v} / ${max}</b></div><i><em style="width:${Math.min(100, (v / max) * 100)}%"></em></i></div>`;
      return `<p class="hq-lead"><b>Beta plan · $0</b></p>${bar(projects.length, 1, 'Projects')}${bar(maxPages, 3, 'Pages in largest project')}<p class="hint">Limits are shown for planning; they aren’t enforced during the beta.</p><div class="hq-row"><a class="btn" href="index.html#pricing">Compare plans</a><a class="btn btn--blue" href="mailto:mutaher.ux@gmail.com?subject=Loom%20Pro%20waitlist">Join the Pro waitlist</a></div>`;
    },
    team() {
      return `<p class="hq-lead">Invite colleagues, set roles and review together on the <b>Enterprise</b> plan.</p><div class="hq-form"><label>Invite by email<input class="in" type="email" placeholder="teammate@company.com" disabled></label><button class="btn" type="button" disabled>Invite</button></div><p class="hint">Team workspaces are coming soon.</p><div class="hq-row"><a class="btn" href="mailto:mutaher.ux@gmail.com?subject=Loom%20support">Contact support</a><a class="btn" href="index.html#faq">Help & FAQ</a></div>`;
    }
  };
  function resultsHTML(q) { return LV().searchDomains(q).map((r) => `<div class="gl-res${r.available ? '' : ' is-taken'}"><code>${esc(r.name)}</code><span>${r.available ? `$${r.price.toFixed(2)}/yr` : 'Taken'}</span>${r.available ? `<button type="button" class="btn" data-dom-buy="${esc(r.name)}" data-price="${r.price}">Buy (test)</button>` : ''}</div>`).join(''); }
  // a short "the team is on it" moment inside the drawer, then the result
  async function working(el, agents, who, steps, ms = 2400) { if (!window.LoomThink) return; const t = LoomThink.create({ agents, who, steps, every: 600 }); el.innerHTML = ''; el.append(t.el); await LoomThink.pace(Promise.resolve(), ms); t.stop(); }
  async function saveLive(P) { await L.save(P); drawDrawer(); drawLive(); }
  function bindDrawer(d) {
    d.addEventListener('submit', (e) => { const f = e.target.closest('[data-req-form]'); if (!f) return; e.preventDefault(); const t = $('[data-req-text]', f).value.trim(); if (!t) return; S.requests.unshift({ id: 'r' + Date.now().toString(36), text: t.slice(0, 400), pid: drawerP.id, status: 'todo', at: Date.now() }); save(); drawDrawer(); $('[data-req-text]', d).focus(); });
    d.addEventListener('click', async (e) => {
      const P = drawerP; if (!P) return;
      // ---- go live: domain
      const dm = e.target.closest('[data-dom-mode]'); if (dm) { P.live.domain = { mode: dm.dataset.domMode }; await saveLive(P); const f = $('[data-dom-name], [data-dom-q]', d); if (f) f.focus(); return; }
      if (e.target.closest('[data-dom-reset]')) { P.live.domain = null; await saveLive(P); return; }
      if (e.target.closest('[data-dom-connect]')) { const v = ($('[data-dom-name]', d).value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''); if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) { toast('Enter a domain like example.com'); return; } P.live.domain = { mode: 'own', name: v, status: 'pending', checks: 0 }; await saveLive(P); return; }
      if (e.target.closest('[data-dom-check]')) { const D = P.live.domain; const out = $('[data-dom-out]', d); await working(out, ['devops', 'security'], 'Relay is checking DNS', [`Looking up ${D.name}`, 'Checking the A and CNAME records', 'Verifying ownership', 'Issuing an HTTPS certificate']); D.checks = (D.checks || 0) + 1; if (D.checks >= 2) { D.status = 'connected'; D.at = Date.now(); toast(`${D.name} is connected (test)`); } await saveLive(P); return; }
      if (e.target.closest('[data-dom-search]')) { const q = $('[data-dom-q]', d).value.trim(); if (!q) return; const out = $('[data-dom-results]', d); await working(out, ['devops'], 'Relay is searching registrars', ['Checking availability', 'Comparing prices'], 1400); P.live.domain = { mode: 'buy', q }; await saveLive(P); return; }
      const buy = e.target.closest('[data-dom-buy]'); if (buy) { const name = buy.dataset.domBuy, price = +buy.dataset.price; if (!confirm(`Test purchase: register ${name} for $${price.toFixed(2)}/year?\n\nThis is beta test mode. No card is charged and no domain is registered.`)) return; const out = $('[data-dom-results]', d); await working(out, ['devops', 'security'], 'Relay is registering the domain (test)', [`Registering ${name}`, 'Setting up DNS automatically', 'Issuing an HTTPS certificate']); P.live.domain = { mode: 'buy', name, status: 'connected', bought: true, price, at: Date.now(), renews: Date.now() + 365 * 864e5 }; await saveLive(P); toast(`${name} is yours (test)`); return; }
      if (e.target.closest('[data-dom-remove]')) { if (!confirm(`Disconnect ${P.live.domain.name}? The site stays live on its Loom address.`)) return; P.live.domain = null; await saveLive(P); return; }
      // ---- go live: hosting
      const hp = e.target.closest('[data-host-pick]'); if (hp) { const plan = hp.dataset.hostPick; if (plan === 'self') { P.live.hosting = { plan: 'self', status: 'pending' }; await saveLive(P); return; } if (plan === 'loom-pro' && !confirm('Test mode: start Loom Hosting Pro at $9/month?\n\nNothing is charged during the beta.')) return; const out = $('[data-host-out]', d); await working(out, ['devops', 'security', 'qa'], 'Relay is setting up hosting', ['Provisioning the global CDN', `Deploying version ${P.live.version}`, 'Securing with HTTPS', 'Running a health check'], 2800); P.live.hosting = { plan, status: 'active', at: Date.now() }; await saveLive(P); toast('Hosting is active (test)'); return; }
      if (e.target.closest('[data-host-done]')) { P.live.hosting = { plan: 'self', status: 'active', at: Date.now() }; await saveLive(P); return; }
      if (e.target.closest('[data-host-reset]')) { P.live.hosting = null; await saveLive(P); return; }
      if (e.target.closest('[data-export]')) { await L.exportZip(P); toast('Code downloaded'); return; }
      const mv = e.target.closest('[data-move]'); if (mv) { const r = S.requests.find((x) => x.id === mv.dataset.move); r.status = r.status === 'todo' ? 'doing' : 'done'; save(); drawDrawer(); }
      const del = e.target.closest('[data-del]'); if (del) { S.requests = S.requests.filter((x) => x.id !== del.dataset.del); save(); drawDrawer(); }
      const d0 = e.target.closest('[data-do]'); if (d0) { const r = S.requests.find((x) => x.id === d0.dataset.do); if (r) { r.status = 'doing'; save(); } }
      if (e.target.closest('[data-save-repo]')) { ops(P.id).repo = $('[data-repo]', d).value.trim(); save(); drawDrawer(); toast('Repository saved'); }
      if (e.target.closest('[data-save-domain]')) { ops(P.id).domain = $('[data-domain]', d).value.trim().toLowerCase(); save(); toast('Domain saved'); }
      if (e.target.closest('[data-backup]')) { L.exportProject(P); toast('Backup downloaded'); }
      if (e.target.closest('[data-brand-apply]')) { const to = projects.find((x) => x.id === $('[data-brand-to]', d).value); if (!to) return; to.swatches = L.clone(P.swatches); to.fonts = L.clone(P.fonts); if (P.logo) to.logo = P.logo; await L.save(to); toast(`Brand applied to ${to.name}`); }
      const sv = e.target.closest('[data-dsvc]'); if (sv) { $$('[data-dsvc]', d).forEach((b) => b.classList.toggle('is-on', b === sv)); runService(P, sv.dataset.dsvc, $('[data-dout]', d)); }
      const ap = e.target.closest('[data-apply]'); if (ap) applyService(P, $('[data-dout]', d), ap);
    });
    d.addEventListener('change', (e) => { const c = e.target.closest('[data-chk]'); if (!c) return; const o = ops(drawerP.id); o.check = Object.assign(o.check || {}, { [c.dataset.chk]: c.checked }); save(); });
  }

  /* ---------------------------------------------------------------- tabs */
  function setTab(k, push) {
    $$('[data-tab]').forEach((t) => { const on = t.dataset.tab === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== k));
    if (push) history.replaceState(null, '', k === 'chat' ? '#chat' : location.pathname + location.search);
    if (k === 'chat') { const b = $('[data-cto-thread]'); b.scrollTop = b.scrollHeight; }
  }

  /* ================================================================ wiring */
  function bind() {
    $$('[data-browse]').forEach((b) => b.addEventListener('click', () => window.LoomDash && LoomDash.openNew()));
    const tabs = $$('[data-tab]');
    tabs.forEach((t) => { t.addEventListener('click', () => setTab(t.dataset.tab, true)); t.addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const n = tabs[(tabs.indexOf(t) + 1) % tabs.length]; setTab(n.dataset.tab, true); n.focus(); }); });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => { setTab(b.dataset.goto, true); if (b.dataset.goto === 'chat') $('[data-cto-in]').focus(); }));
    const form = $('[data-cto-form]'), input = $('[data-cto-in]');
    form.addEventListener('submit', (e) => { e.preventDefault(); if (thinking) return; const v = input.value; input.value = ''; send(v); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    $('[data-cto-chips]').addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) send(b.dataset.chip); });
    $('[data-brief-fields]').addEventListener('click', (e) => { const b = e.target.closest('[data-clear]'); if (!b) return; delete S.brief[b.dataset.clear]; save(); drawBrief(); });
    $('[data-brief-build]').addEventListener('click', buildFromBrief);
    $('[data-brief-dl]').addEventListener('click', downloadBrief);
    $('[data-brief-reset]').addEventListener('click', () => { if (!confirm('Start a new brief? The current conversation will be cleared.')) return; S.chat = []; S.brief = {}; S.pending = null; save(); drawChat(); drawBrief(); });
    $('[data-live]').addEventListener('click', async (e) => {
      const card = e.target.closest('[data-pid]'); if (!card) return; const out = $('[data-out]', card), P = projects.find((x) => x.id === card.dataset.pid);
      const gl = e.target.closest('[data-golive]'); if (gl) { openDrawer(P.id, 'golive', gl.dataset.golive); return; }
      const svc = e.target.closest('[data-svc]'); if (svc) { $$('[data-svc]', card).forEach((b) => b.classList.toggle('is-on', b === svc)); runService(P, svc.dataset.svc, out); return; }
      const ap = e.target.closest('[data-apply]'); if (ap) applyService(P, out, ap);
    });
  }
  async function refresh() { await loadProjects(); drawLive(); if (drawerP && !$('[data-drawer]').hidden) { drawerP = projects.find((x) => x.id === drawerP.id) || drawerP; drawDrawer(); } }
  async function init(user) {
    USER = user; KEY = 'loom-hq:' + (user ? user.id : 'anon'); S = Object.assign({ chat: [], brief: {}, requests: [], ops: {} }, store.get());
    delete S.ops.check;  // older, account-wide checklist
    $$('[data-agents-of]').forEach((el) => (el.innerHTML = team(el.dataset.agentsOf.split(','))));
    bind(); drawChat(); drawBrief(); await refresh();
    setTab(location.hash === '#chat' || location.hash === '#plan' ? 'chat' : 'projects');
    if (location.hash === '#live') setTimeout(() => $('#live').scrollIntoView({ block: 'start' }), 50);
    const q = new URLSearchParams(location.search); if (q.get('live')) { setTab('projects'); openDrawer(q.get('live'), 'golive', q.get('step') || ''); history.replaceState(null, '', location.pathname); }
  }
  window.LoomHQ = { init, refresh, send, more, openDrawer };
})();
