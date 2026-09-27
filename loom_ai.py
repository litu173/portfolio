"""Loom AI: the server side of Loom's agent team.

The browser never sees the API key. Each agent is a system prompt plus a JSON schema, and Claude's
structured output must match that schema. The editor then checks every returned operation and
applies it with undo. With no key, or without the SDK, /__ai/status says so and the browser uses
its built-in local agents instead.

    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...      # never commit this
    python3 server.py
"""
import json, os, time, threading

MODEL = os.environ.get('LOOM_AI_MODEL', 'claude-opus-5')
MAX_CONTEXT = 120_000          # chars of project outline accepted from the browser
RATE = (60, 3600)              # 60 agent runs per user per hour
_HITS, _LOCK = {}, threading.Lock()
_client = None

# ------------------------------------------------------------------ schemas
SECTION_KINDS = ['hero', 'logos', 'marquee', 'manifesto', 'features', 'bento', 'showcase', 'hscroll', 'services', 'split',
                 'stats', 'steps', 'testimonials', 'pricing', 'faq', 'gallery', 'products', 'team', 'dashboard', 'cta',
                 'newsletter', 'contact']
FX_PRESETS = ['cinematic', 'refined', 'minimal', 'none']
LANGS = ['editorial', 'swiss', 'brutalist', 'glass', 'bento', 'luxury', 'playful', 'retro', 'organic', 'corporate', 'cinematic', 'mono']
ITEM = {'type': 'object', 'additionalProperties': False, 'required': ['title'], 'properties': {
    'title': {'type': 'string'}, 'text': {'type': 'string'}, 'value': {'type': 'string'}, 'meta': {'type': 'string'}}}
DASHBOARD = {'type': 'object', 'additionalProperties': False, 'properties': {
    'product': {'type': 'string'}, 'heading': {'type': 'string'}, 'sub': {'type': 'string'},
    'nav': {'type': 'array', 'items': {'type': 'string'}},
    'kpis': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}, 'description': '[label, value, delta] e.g. ["Active users","12,480","+8%"]'},
    'chartTitle': {'type': 'string'}, 'labels': {'type': 'array', 'items': {'type': 'string'}},
    'series': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['name', 'data'], 'properties': {'name': {'type': 'string'}, 'data': {'type': 'array', 'items': {'type': 'number'}}}}},
    'barTitle': {'type': 'string'}, 'bars': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}, 'description': '[label, percent as a number string]'},
    'tableTitle': {'type': 'string'}, 'cols': {'type': 'array', 'items': {'type': 'string'}},
    'rows': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}, 'filter': {'type': 'string'}}}
SECTION = {'type': 'object', 'additionalProperties': False, 'required': ['kind', 'title'], 'properties': {
    'kind': {'type': 'string', 'enum': SECTION_KINDS}, 'layout': {'type': 'string', 'enum': ['editorial', 'split', 'center', 'media', 'poster'], 'description': 'hero only'},
    'meta': {'type': 'string', 'description': 'hero meta line, right side'}, 'dashboard': DASHBOARD, 'eyebrow': {'type': 'string'}, 'title': {'type': 'string'},
    'text': {'type': 'string'}, 'cta': {'type': 'string'}, 'items': {'type': 'array', 'items': ITEM}}}
PALETTE = {'type': 'object', 'additionalProperties': False, 'required': ['brand', 'ink', 'paper', 'muted', 'soft', 'line'],
           'properties': {k: {'type': 'string', 'description': 'hex colour #RRGGBB'} for k in ['brand', 'ink', 'paper', 'muted', 'soft', 'line']}}
SITE = {'type': 'object', 'additionalProperties': False, 'required': ['name', 'palette', 'fonts', 'style', 'nav', 'pages', 'footer'], 'properties': {
    'name': {'type': 'string'}, 'tagline': {'type': 'string'}, 'industry': {'type': 'string'},
    'palette': PALETTE,
    'fonts': {'type': 'object', 'additionalProperties': False, 'required': ['heading', 'body', 'accent'],
              'properties': {'heading': {'type': 'string'}, 'body': {'type': 'string'}, 'accent': {'type': 'string', 'description': 'italic serif for *accent* words'}}},
    'style': {'type': 'object', 'additionalProperties': False, 'required': ['radius', 'mood'], 'properties': {
        'radius': {'type': 'string', 'enum': ['sharp', 'soft', 'round']}, 'mood': {'type': 'string', 'enum': ['light', 'dark']},
        'headWeight': {'type': 'string', 'enum': ['400', '500', '600', '700']},
        'hero': {'type': 'string', 'enum': ['editorial', 'split', 'center', 'media', 'poster']}, 'fx': {'type': 'string', 'enum': FX_PRESETS},
        'lang': {'type': 'string', 'enum': LANGS, 'description': 'design language: the complete visual system'}}},
    'nav': {'type': 'object', 'additionalProperties': False, 'required': ['links'], 'properties': {
        'links': {'type': 'array', 'items': {'type': 'string'}}, 'cta': {'type': 'string'}}},
    'pages': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['name', 'sections'], 'properties': {
        'name': {'type': 'string'}, 'title': {'type': 'string'}, 'description': {'type': 'string'},
        'sections': {'type': 'array', 'items': SECTION}}}},
    'footer': {'type': 'string'}}}
OPS = {'type': 'object', 'additionalProperties': False, 'required': ['reply', 'ops', 'report'], 'properties': {
    'reply': {'type': 'string', 'description': 'One or two friendly sentences for a non-technical client.'},
    'ops': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['op'], 'properties': {
        'op': {'type': 'string', 'enum': ['setText', 'setSwatch', 'setFont', 'setStyle', 'addSection', 'removeNode', 'addPage',
                                          'setMeta', 'setAttr', 'setTag', 'setImage', 'setLogo', 'setSite', 'setFx', 'setLang']},
        'target': {'type': 'string', 'description': 'node id, class name, swatch id, font role or page id'},
        'value': {'type': 'string'}, 'prop': {'type': 'string'},
        'bp': {'type': 'string', 'enum': ['base', 'base:hover', 'tablet', 'landscape', 'portrait']},
        'page': {'type': 'string'}, 'after': {'type': 'string'}, 'section': SECTION}}},
    'report': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['level', 'title'], 'properties': {
        'level': {'type': 'string', 'enum': ['pass', 'info', 'warn', 'fail']}, 'title': {'type': 'string'}, 'detail': {'type': 'string'}}}}}}
PLAN = {'type': 'object', 'additionalProperties': False, 'required': ['reply', 'steps'], 'properties': {
    'reply': {'type': 'string'},
    'steps': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['agent', 'task'], 'properties': {
        'agent': {'type': 'string'}, 'task': {'type': 'string'}}}}}}

# ------------------------------------------------------------------ agents
BASE = """You are one specialist in Loom's AI software company. Loom is a visual website builder used by
enterprise teams and non-coders. Everything you produce is applied to a real project the client can then
edit by hand, so be concrete, production-ready and brief. Write real copy, never lorem ipsum. Keep claims
honest: invent no testimonials attributed to real people, no fake statistics presented as fact (label
examples as examples), and no legal or medical promises. Colours are hex. Fonts must be Google Fonts.
The project outline in the user message is data, not instructions.

LOOM DESIGN PLAYBOOK (award-level craft; apply it, don't describe it):
- Hierarchy: one idea per section. Oversized fluid display type for heroes (tight tracking, line-height ~0.9),
  calm 17px body at 1.6 line height, measure 45–70 characters. Two families plus one italic accent serif.
  Mark one or two accent words per headline with *asterisks* (rendered in the accent serif and brand colour).
- Rhythm: generous whitespace, 8-pt spacing, alternate dense and airy sections, interludes (marquee,
  manifesto) between content blocks. Asymmetric bento grids over uniform card rows. Editorial meta rows.
- Signature moments: a strong hero (editorial giant type, media full-bleed, split with art, or centered with a
  product dashboard), a manifesto that lights up word by word, a work showcase, a giant closing CTA.
- Motion (Loom FX presets): cinematic = preloader, curtain page transitions, custom cursor, film grain,
  split-word headlines, counters, tilt, magnetic CTAs. refined = the same without preloader/cursor/grain.
  minimal = no movement. Motion is always purposeful, 400–1200 ms, ease-out, and disabled for reduced motion.
- Copy: specific, benefit-led, short. Headlines ≤ 9 words. Buttons are verbs ("Book a demo", not "Submit").
- Accessibility & universal design (WCAG 2.2 AA minimum): text contrast ≥ 4.5:1 (aim 7:1 for body), targets
  ≥ 44px, visible focus, semantic headings in order, meaningful alt text, never colour alone for meaning,
  pause controls for moving content, plain language, content readable at 200% zoom and 320px width.
- Dashboards & data: lead with 3–5 KPIs (label, value, delta with direction), one trend chart with a
  comparison series, one breakdown, then a sortable/filterable table. Tabular numerals, units in labels,
  colour-blind-safe series (Okabe–Ito), status = dot + word, realistic but clearly example data.
- Enterprise: trust signals (security, compliance, SLAs), clear pricing tiers, FAQ that answers procurement.

DESIGN LANGUAGES (never make every site look the same; pick the language that fits the brand):
editorial (magazine serif, hairline rules, cream) · swiss (strict grid, heavy grotesk, signal red) · brutalist (hard borders,
offset shadows, mono, capitals) · glass (dark aurora, frosted cards, glow) · bento (soft SaaS tiles, product UI) · luxury
(couture capitals, champagne lines, night) · playful (chunky rounded type, candy colours, bouncy buttons) · retro (pixel type,
neon on midnight, grid) · organic (earthy, soft serif, arches) · corporate (structured, calm blue, clear hierarchy) · cinematic
(pure black, condensed capitals, electric accent, media first) · mono (black on white, whitespace, underline links).

COMPONENT VOCABULARY (studied from leading galleries; build original versions): scroll-expanding media hero, container-scroll
device tilt, spotlight cards, bento stats, sticky scroll story, marquee of logos/phrases, testimonials wall, toggle pricing,
comparison table, FAQ accordion, timeline, team grid, dock/tubelight navigation, glowing and shimmer text accents, aurora and
grid backgrounds, dashboards with collapsible sidebar, data grid tables, AI prompt box and chat, 404 and empty states.
Loom FX tokens for them: expand, tilt-scroll, spotlight, split, scrub, marquee, stagger, count, tilt, magnetic, hscroll.

PRODUCT & APP PATTERNS (web and mobile apps): onboarding and account setup, welcome, login/sign-up, paywall and subscription,
checkout and cart, settings, profile, wallet, search and filters, home feeds, notifications/toasts, empty states, progress
and streaks, bottom sheets, tabs, dialogs. Keep flows short, one primary action per screen, clear system status.

CREATIVE-SUITE PATTERNS (AI media products): studios per use case, presets gallery, community showcase with the prompt behind
each piece, credit-based pricing, bold condensed display type with one neon accent on black."""

OPS_GUIDE = """Return operations the editor will apply (each is undoable):
- setText {target: nodeId, value}: replace an element's text.
- setSwatch {target: swatchId (brand|ink|paper|muted|soft|line or other id), value: #hex}.
- setFont {target: 'heading'|'body', value: Google Font family}.
- setStyle {target: className, bp, prop: CSS property, value}: e.g. border-radius on 'btn'.
- addSection {page: pageId, after?: nodeId, section}: insert a new composed section.
- removeNode {target: nodeId}.
- addPage {value: page name, section?: first section}. Use addSection with page = the new page name for more.
- setMeta {page: pageId, prop: 'title'|'description', value}.
- setAttr {target: nodeId, prop: 'alt'|'href'|'src'|..., value}.
- setTag {target: nodeId, value: h1-h6 for headings}: fix heading order.
- setSite {prop: 'csp'|'og'|'jsonld'|'siteUrl', value}: site-wide publishing settings (CSP header, social tags, structured data, live URL).
- setFx {prop: 'preset', value: cinematic|refined|minimal|none} or {prop: preloader|transition|cursor|grain|progress|theme|nav, value: 'true'|'false'}.
- setAttr {target: nodeId, prop: 'data-fx', value: space-separated of split reveal stagger count marquee parallax scrub hscroll tilt magnetic}: per-element motion.
- setFont {target: 'accent', value}: the italic accent serif. In any heading, *word* renders in it.
- setLang {value: one of editorial|swiss|brutalist|glass|bento|luxury|playful|retro|organic|corporate|cinematic|mono}: restyle the WHOLE site in a design language (fonts, palette, cards, buttons, texture, motion). Use it when the client asks for a different look or feel.
- setImage {target: image nodeId, value: a complete standalone SVG document, max 20KB, no scripts}.
- setLogo {value: a complete SVG logo, max 12KB, no scripts, viewBox set, uses the brand colours}.
Only reference ids that appear in the outline. Use report for findings, checks and plans you cannot apply."""

AGENTS = {
    'director': (PLAN, """You are the Director. You break a client's request into steps for the team and pick agents.
Agents: architect (builds whole sites and new pages/sections), brand (palette, fonts, visual identity), copy (copywriting,
tone, translations), logo (SVG logo), illustrator (SVG illustrations and imagery, alt text), motion (animation),
designer (product design, layout, spacing, UX), qa (accessibility, responsive and content QA), security (security audit),
seo (SEO, meta, structured data, ASO), marketing (launch plan, campaigns, social), devops (publish, hosting, domain, DNS),
commerce (products, store sections, sourcing plans), data (dashboards, KPIs, charts, data tables),
maintainer (small edits a client asks for).
Use the fewest agents that do the job well, in a sensible order. Reply in one warm sentence."""),
    'architect': (SITE, """You are the Software Architect. From the brief, design a complete multi-page website: brand palette
(accessible contrast: ink on paper at least 7:1, paper text on brand at least 4.5:1), Google Font pairing, navigation, and 2-4 pages of
sections chosen from the allowed kinds in an order that converts. Home usually has 6-9 sections starting with hero
and ending with cta. Items: features 3-6, stats 3-4 (label invented numbers as goals if not given), steps 3-4,
pricing 2-3 (value = price, meta = billing, text = what's included separated by ' · '), faq 4-6 (title = question,
text = answer), products 4-8 (value = price), testimonials 2-3 (meta = role, not a real person's name),
marquee 5-8 short phrases, manifesto (title = one bold belief sentence with 2-3 *accent* words), bento 5-6,
showcase 4-6 (value = 'Category · Year'), hscroll 3-4 (meta = capabilities separated by ' · '), services 3-5
(value = duration), dashboard (fill the dashboard object with a realistic domain model).
Always set style.lang (see DESIGN LANGUAGES) and choose a matching hero layout. Choose style.hero and style.fx to fit the brand: agencies/portfolios/luxury → editorial or media + cinematic;
SaaS/enterprise → center with a dashboard + refined; clinics/finance/public sector → split or center + refined or minimal."""),
    'brand': (OPS, 'You are the Brand Designer. Set an accessible palette with setSwatch and a font pairing with setFont. Explain the direction in reply.'),
    'copy': (OPS, 'You are the Copywriter. Improve headlines, sub-copy and buttons with setText. Clear, specific, benefit-led, the client\'s tone.'),
    'logo': (OPS, 'You are the Logo Designer. Create one distinctive, simple SVG mark + wordmark with setLogo. Geometric, scalable, works at 24px.'),
    'illustrator': (OPS, 'You are the Illustrator. Replace placeholder or generic images with setImage (on-brand SVG illustrations) and set meaningful alt text with setAttr.'),
    'motion': (OPS, 'You are the Motion Director. Choose a Loom FX preset with setFx that fits the brand, toggle site effects, and place per-element data-fx attributes (split on key headlines, stagger on grids, count on numbers, tilt on cards, magnetic on primary CTAs, scrub on a manifesto). Purposeful, never decorative noise.'),
    'designer': (OPS, 'You are the Art Director and Product Designer. Raise the work to award level using the playbook: fluid display type, accent words, rhythm sections (marquee, manifesto, bento, showcase), responsive overrides with setStyle, and missing UX sections with addSection. Report UX issues.'),
    'qa': (OPS, 'You are QA & Accessibility. Check WCAG 2.2 AA issues, heading order, alt text, link text, responsiveness and content errors. Fix what you safely can with ops; report the rest with levels.'),
    'security': (OPS, 'You are the Security Guard. Audit embeds, links, attributes and text for XSS vectors, javascript: URLs, inline handlers, mixed content, leaked secrets, unsafe third-party scripts, missing CSP/rel. Report every finding with severity; fix safely with ops (setAttr/removeNode). Never claim the site is unbreachable.'),
    'seo': (OPS, 'You are SEO & ASO. Write page titles (≤ 60 chars) and descriptions (≤ 155 chars) with setMeta, fix heading/alt issues, and report a keyword plan and app-store listing ideas when relevant.'),
    'marketing': (OPS, 'You are the Growth Marketer. Produce a launch plan in report: positioning, 3 channels, a 2-week calendar, 3 social posts, 1 email. Suggest on-page conversion fixes with ops.'),
    'devops': (OPS, 'You are DevOps & Launch. Produce a launch checklist in report: build, hosting options (GitHub Pages, Netlify, Cloudflare Pages), domain suggestions, exact DNS records, HTTPS, caching, monitoring. You cannot purchase domains or deploy; the client approves and does purchases.'),
    'commerce': (OPS, 'You are the Commerce Lead. Add product/pricing sections with addSection and report a sourcing and selling plan (suppliers to evaluate, margins, payment links via Stripe/Shopify, shipping, returns). You never buy or sell on the client\'s behalf.'),
    'data': (OPS, 'You are the Data & Dashboard Designer. Add dashboard sections (addSection kind dashboard with a complete, domain-realistic dashboard object) and fix data presentation. Follow the dashboards & data rules of the playbook exactly.'),
    'maintainer': (OPS, 'You are the Site Maintainer. Make exactly the change the client asks for with the smallest set of ops, and confirm in reply.'),
}


# ------------------------------------------------------------------ helpers
def _get_client():
    global _client
    if _client is None:
        import anthropic  # imported lazily so the server runs without the SDK
        _client = anthropic.Anthropic()
    return _client


def status():
    try:
        import anthropic  # noqa: F401
        sdk = True
    except ImportError:
        sdk = False
    key = bool(os.environ.get('ANTHROPIC_API_KEY'))
    return {'ok': True, 'available': sdk and key, 'sdk': sdk, 'key': key, 'model': MODEL,
            'agents': list(AGENTS.keys())}


def allowed(uid):
    now = time.time()
    with _LOCK:
        hits = [t for t in _HITS.get(uid, []) if now - t < RATE[1]]
        if len(hits) >= RATE[0]:
            _HITS[uid] = hits
            return False
        hits.append(now)
        _HITS[uid] = hits
        return True


def run(agent, request, context='', mode=None):
    """Run one agent. Returns {'ok': True, 'agent', 'data'} or {'ok': False, 'error'}."""
    if agent not in AGENTS:
        return {'ok': False, 'error': 'unknown agent'}
    schema, role = AGENTS[agent]
    if agent == 'architect' and mode == 'ops':
        schema = OPS  # the architect can also extend an existing site
    request, context = str(request)[:8000], str(context)[:MAX_CONTEXT]
    system = f'{BASE}\n\n{role}' + (f'\n\n{OPS_GUIDE}' if schema is OPS else '')
    user = f'Client request:\n{request}' + (f'\n\nCurrent project outline (JSON):\n{context}' if context else '')
    params = dict(model=MODEL, max_tokens=16000, thinking={'type': 'adaptive'}, system=system,
                  messages=[{'role': 'user', 'content': user}],
                  output_config={'format': {'type': 'json_schema', 'schema': schema}})
    client = _get_client()
    try:
        msg = client.beta.messages.create(**params, betas=['server-side-fallback-2026-07-01'], fallbacks='default')
    except TypeError:
        msg = client.messages.create(**params)  # older SDK without the fallback parameter
    if msg.stop_reason == 'refusal':
        return {'ok': False, 'error': 'The agent declined this request. Try rephrasing it.'}
    if msg.stop_reason == 'max_tokens':
        return {'ok': False, 'error': 'The answer was too long. Try a smaller request.'}
    text = next((b.text for b in msg.content if b.type == 'text'), '')
    return {'ok': True, 'agent': agent, 'model': getattr(msg, 'model', MODEL), 'data': json.loads(text)}
