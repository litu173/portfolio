# Mutaher Hossain — Portfolio

Static site: `index.html` · `case.html` · `style.css` · `script.js` · `case.js` · `/content` · `/assets` · `/admin`.
GSAP, ScrollTrigger and Lenis come from jsDelivr. There is no build step.

## Run locally
```bash
cd "Portfolio"
python3 server.py
```
Then open http://localhost:5174. `server.py` serves the site and lets the CMS, design system and palette lab **save straight into this folder** from any browser, with no folder picker. It only runs on your computer, and it can only write `tokens.css`, `content/content.js` and files in `assets/work/` and `assets/video/`. Plain `python3 -m http.server` still shows the site, but saving then falls back to Chrome's folder picker or a download.

## Loom — AI software company + visual website editor
| Page | What it is |
|---|---|
| `loom/index.html` | **Landing page:** splash screen, woven hero with "describe your site" prompt, AI team demo, product tour, features, templates, pricing, FAQ |
| `loom/auth.html` | Log in / create account (guest mode if no server) |
| `loom/app.html` | Dashboard: **Describe your website** (the AI team builds it), templates with colour variations, your projects |
| `loom/editor.html` | The Webflow-style editor with the **Loom AI** panel (⌘K) |
| `loom/account.html` | Profile, settings, password, sign out everywhere, export data, delete account |
| `loom/legal/` | Terms & Conditions, Privacy Policy, Cookie Policy (templates: have a lawyer review before launch) |

### Loom AI: the agent team
Tell Loom what you want in plain words. The **Director** plans the work and hands each step to a specialist. Every change arrives as normal, editable elements and classes, and every run can be undone in one click.

| Agent | Role | What it does |
|---|---|---|
| Director | Orchestrator | Plans the request and routes it (type `@seo`, `@logo`… to pick agents yourself) |
| Architect | Software engineer | Builds whole sites, pages and sections from a brief |
| Iris | Art director & product designer | "Make it award-level": fluid editorial type, accent serif words, rhythm sections, responsive fixes |
| Hue | Brand designer | Accessible palettes (WCAG AA guaranteed), font pairings |
| Quill | Copywriter | Headlines, buttons, tone (rewrites and translation need Claude) |
| Mark | Logo designer | SVG logos placed in every navbar; the logo becomes the favicon |
| Ink | Illustrator | On-brand SVG artwork and alt text (photos: upload in Assets) |
| Kinetic | Motion director | Picks a Loom FX preset (cinematic / refined / minimal) and places per-element effects |
| Probe | QA & accessibility | Contrast, heading order, alt text, dead links, responsive checks, with auto-fixes |
| Sentinel | Security guard | Scans for script URLs, inline handlers, unsafe embeds, leaked secrets and mixed content; turns on a strict Content-Security-Policy |
| Signal | SEO & ASO | Titles, descriptions, Open Graph, schema.org, sitemap.xml, robots.txt, app-store listing drafts |
| Boost | Growth marketer | Positioning, channels, 2-week launch calendar, posts, email |
| Relay | DevOps & launch | Pre-flight, publish, hosting options, domain ideas, exact DNS records |
| Merchant | E-commerce | Product sections, Shop page, payment-link setup, sourcing plan |
| Datum | Data & dashboards | Enterprise dashboards: KPIs that count up, accessible SVG charts (Okabe–Ito colours), sortable and filterable data tables |
| Keeper | Site maintainer | Everyday edits for non-coders: "replace 'Lisbon' with 'Porto'", "remove the pricing section" |

**Two modes:**
- **Built-in agents (default):** run in the browser, work offline and cost nothing.
- **Claude-powered:** set up the server as below, and the same agents run on `claude-opus-5` with structured JSON outputs.
  ```bash
  pip install anthropic
  export ANTHROPIC_API_KEY=sk-ant-...   # never commit this
  python3 server.py
  ```
  The key stays on the server and never reaches the browser. `/__ai/run` requires a signed-in user, blocks cross-site requests and is rate-limited to 60 runs per user per hour. If a Claude call fails, that step falls back to the built-in agent.

**Safety by design:**
- Agents return small operations (`setText`, `setSwatch`, `addSection`…), not code. `loom/agents.js` validates each one before applying it.
- Links can't use `javascript:`, CSS values can't break out of their rule, and SVG and HTML are sanitised.
- Agents never buy domains, take payments, order stock or spend on ads. Those steps come back as checklists for a person to approve.
- The security scan is automated, not a penetration test. No system is unbreachable, so get a professional audit before handling payments or personal data.

**Files:**
- `loom_ai.py`: agent prompts, JSON schemas, Claude calls.
- `loom/agents.js`: team, orchestrator, built-in agents, op validator.
- `loom/compose.js`: site spec → project, industry library, colour maths.
- `loom/ai-panel.js`: the editor panel.
- `loom/splash.js`: splash screen (about 8.6 s on the first visit, telling the four-beat story of what Loom does; about 2 s on later visits; skippable).
- `loom/fx/loom-fx.js`: the motion and interaction runtime published with every site.
- `loom/weave.js`: hero weave.

**Public site (GitHub Pages):**
- Loom runs in **guest mode** there, because accounts need `server.py`. Opening Loom starts a guest session straight away, and projects are saved in that visitor's browser.
- **Publish** downloads the whole site as a ZIP: pages, `style.css`, `loom-fx.js`, logo, `robots.txt` and `sitemap.xml`. Drop it on Netlify, GitHub Pages or Cloudflare Pages.
- **Export / Import** on the dashboard saves and restores `.loom.json` backups, because browser storage can be cleared.
- Hosted accounts (a real database) are planned for later.

**Accounts** run through `server.py`:
- Passwords are stored as salted PBKDF2-SHA256 hashes, and sessions use an HttpOnly, SameSite cookie.
- Sign-in is rate-limited, and cross-site requests are blocked.
- User data lives in `loom/data/`, which is git-ignored and never served over HTTP.
- Loom projects are owned by their user:
  - the server keeps the project index itself;
  - project files are only served to their owner;
  - a published site address and its asset folder belong to one account.
- Published sites under `/sites/` are served with `Content-Security-Policy: sandbox`, so their scripts can't use Loom sessions.
- Account data is blocked by real file path, so encoded or oddly spelled URLs can't reach it.
- Without the server (e.g. on GitHub Pages), Loom offers **guest mode**: everything is saved in the browser only, and publishing is unavailable.

### Loom FX and Design System v2 (what makes the output premium)
- **`loom/fx/loom-fx.js`** (~12 KB, no dependencies) ships with every published site. Effects are declared in HTML, so agents and people turn them on without code.
  - **Site-wide** (`<html data-fx-site>`): preloader, curtain page transitions, custom cursor, film grain, reading progress, light/dark theme toggle, hide-on-scroll navbar.
  - **Per element** (`data-fx`): `split` headline words, `reveal`, `stagger`, `count`, `marquee`, `parallax`, `scrub` (a manifesto that lights up word by word), `hscroll` (pinned horizontal scroll), `tilt`, `magnetic`, `table` (sortable + filterable), `chart` (lines draw, bars grow).
  - **Presets:** cinematic (everything), refined (no preloader, cursor or grain), minimal (no movement), none.
  - **Accessibility:**
    - Reduced motion shows the finished page instantly.
    - Marquees can be paused (WCAG 2.2.2).
    - Split text keeps the real sentence for screen readers.
    - The cursor and grain switch off on touch devices and in forced-colours mode.
    - Without JavaScript the page is complete.
- **Design System v2** (`kitFor` in `loom/compose.js`):
  - Fluid `clamp()` type up to 188px, with an italic accent serif: write `*word*` in any heading.
  - Body text at 17px / 1.6, a 1320px grid with fluid gutters, and three shape scales.
  - 44px+ targets and visible focus.
  - A light/dark theme pair generated with AA contrast.
  - Every published page gets a skip link and a main landmark.
- **Section kinds:**
  - Hero in four layouts: editorial, media, split, or centre with a product dashboard.
  - Marquee, manifesto, bento, showcase, hscroll, services, stats, steps, features, testimonials, pricing, FAQ, gallery, products and team.
  - Dashboard, giant CTA, newsletter and contact.
- **Import into Loom** rebuilds your coded portfolio faithfully:
  - Its tokens: dark green, lime accent, Inter Tight + Instrument Serif, and the light theme as the alternate.
  - Its sections, with your real stats, capabilities, mission, pillars, story portrait, services, case-study covers, tools, certifications and CTA.
  - Cinematic motion.
- **Editor Preview** (eye icon) runs the real motion; the canvas stays static for precise editing.

### Design languages and the 200-template library (`loom/library.js`)
- **Why:** sites no longer look alike. A *design language* is a complete visual system: type pairing, case and tracking, colour world, card treatment, button style, background texture, hero composition, motion preset and section rhythm.
- **The 12 languages:** Editorial, Swiss, Brutalist, Glass, Bento, Luxury, Playful, Retro Arcade, Organic, Corporate, Cinematic, Mono.
- **Templates = category packs × languages:**
  - 30 packs × 6 languages = 180 new templates, plus the 20 art-directed originals, for **200** in total.
  - They span 34 categories modelled on Webflow's taxonomy, including Architecture, Arts, Music, Media & Creators, Docs, Environment, Government, Home Services, HR, Launch, Personal, Transportation, Weddings, Web3, Mobile Apps and Legal.
  - Each template has 4 colourways.
- **Originality:** patterns were studied from public galleries (Webflow templates, 21st.dev components and templates, Mobbin app patterns, Higgsfield's creative suite). All layouts, copy and artwork are original; nothing is copied.
- **One prompt, three directions:** the dashboard builds the site in three design languages side by side, and you pick one before the team finishes it.
- **One-sentence restyle:** "make it brutalist" (or glass, luxury…) re-skins the whole project through the `setLang` op, in one undoable step.
- **New Loom FX tokens:** `spotlight` (cursor-lit cards), `expand` (media grows to full bleed on scroll) and `tilt-scroll` (device frame settles flat, container-scroll style).
- **Browsing:** the template browser has search, category and style filters, and previews render lazily as they scroll into view.

**Templates (originals):** 20 original, fully editable designs, each with 4 colour variations (80 in total): the six hand-built ones plus the industry library below, plus **Atlas** (enterprise analytics SaaS with a live dashboard) and **Console** (admin product UI).

**Templates (details):** 18 original, fully editable designs, each with 4 colour variations (72 in total). Six are hand-built in `loom/templates.js`:
- Noir, Launchpad, Journal, Counsel, Haven, Atelier.

Twelve more are built from the industry library in `loom/compose.js`:
- Nova (AI), Pulse (fitness), Harbor (restaurant), Lumen (clinic), Vault (fintech), Scholar (education).
- Kin (nonprofit), Wander (travel), Forge (dev tools), Bloom (beauty), Studio (agency), Market (e-commerce).

**Editor:**
- **Left rail:** Loom AI, Add (elements and layouts), Navigator, Pages, Style guide, Assets.
- **Centre:** the canvas with Desktop / Tablet / Mobile breakpoints.
- **Right:** Style (classes, hover and focus states, layout, spacing, size, position, typography, backgrounds, borders, effects) and Settings.
- **How styling works:** styles live on classes, so editing one element updates every element with that class. Desktop is the base; smaller breakpoints override it.
- **Publishing:** Publish writes plain HTML + CSS to `sites/<project>/`, plus `logo.svg`, and `sitemap.xml` / `robots.txt` when SEO is set up. Pages carry the CSP, social and structured-data tags your agents enabled.

## Change the brand colour (everywhere)
Any of these writes the colour into `tokens.css`, which the site, the CMS and the design system all load:
- **CMS → Site settings → Brand colour:** pick a swatch or any hex, preview it live, then click **Save colour to site**.
- **Palette lab** (if switched on) → **Save to site ✓**.
- **Design system** → edit the Accent token, then **Save to site**.

Contrast is corrected automatically for both themes. To publish the change, upload the updated `tokens.css` (or the whole folder) to your host.

## Edit content (CMS)
Open http://localhost:5174/admin/ in **Chrome or Edge**.
1. Click **Connect project folder** and pick this `Portfolio` folder (you only do this once).
2. Edit any section or project. You can add, reorder, duplicate and delete case-study blocks: text, bullets, two columns, image, gallery, slider, before/after, metrics, quote, process, video, embed, callout and divider.
3. Upload images by dropping them in. They are converted to WebP and saved to `assets/work/<slug>/`.
4. Press **Save** (⌘S). This writes `content/content.js`. Refresh the site to see the changes.

**Hide, delete, reorder:**
- **Sections:** in the sidebar, drag ⋮⋮ (or use ↑) to reorder home-page sections, and click 👁 to hide one.
- **Fields:** every content field has 👁 (hide on the site) and 🗑 (delete) at its top-right.
- **List items, blocks and tags:** each has its own 👁 next to delete.
- **Projects:** click 👁 in the Projects list to hide a whole project.

Clicking a section scrolls the live preview to it. Drag the thin dividers between columns to resize them; double-click a divider to reset it.

Drafts auto-save in the browser, and undo/redo is available. **Checks** flags missing alt text and duplicate slugs.
Safari and Firefox can't write files directly, so use **More → Download content.js** and replace the file yourself.

## Design system
Open http://localhost:5174/design-system.html.
- Click any colour, type row, radius or component to edit it in the inspector. Changes preview live.
- Press **Save to site** (⌘S) to rewrite `tokens.css`. Every page loads that file, so the whole site updates.
- **DESIGN-SYSTEM.md ↓** exports the full system (tokens, components, HTML, rules) for reuse in other projects. **tokens.css ↓** downloads just the variables.

## Palette lab (temporary)
The round **Palette** button (bottom-left on every page) lets you try accent colours site-wide. It offers brand presets, modern palettes, colour harmonies, tones and OKLCH sliders, plus an optional vivid Display-P3 accent. Switch it on or off in CMS → Site settings → *Show palette lab*. Contrast is auto-corrected for both themes.
Once you've picked one, open the design system, click **Import palette lab**, then **Save to site**.
To remove the lab, click **Reset to default** in it, then delete the `<script src="palette-lab.js…">` lines from `index.html` and `case.html`.

## Cinematic video (optional)
Right now the hero runs a live particle scene. To use a generated film instead, first create it from the prompts in `BUILD-PLAN.md §5`. Then encode it for smooth scrubbing:
```bash
ffmpeg -i in.mp4 -vf scale=1920:-2 -c:v libx264 -x264-params keyint=1 -crf 24 -pix_fmt yuv420p -movflags +faststart -an assets/video/untangled.mp4
```
Finally, set **Hero → Cinematic video** in the CMS to `assets/video/untangled.mp4`.

## Deploy
Upload the folder to Netlify, Vercel, Cloudflare Pages or GitHub Pages. **Leave out `/admin` and `design-system.html`**, or password-protect them.
