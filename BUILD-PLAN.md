# MASTER BUILD PLAN — Md. Mutaher Hossain
### Personal brand · Portfolio · Product design consultancy
Version 1.0 · 24 Sep 2026 · Status: **approved & built** (see README.md)

---

# PART A — CREATIVE BRIEF

## 1. Website overview

| | |
|---|---|
| **Client** | Md. Mutaher Hossain — Senior Product Design Consultant · AI First · Human Centered |
| **Site type** | Personal brand + portfolio + consultancy storefront (with creator/builder angle) |
| **Primary goal** | Win new clients: turn a first visit into a case-study read, a CV view, or an email |
| **Secondary goal** | Show range (strategy → UX → UI → AI prototyping → build) in one place and prove the craft through the site itself |
| **Audience** | Startup founders, product leads at SaaS / enterprise companies, agencies needing a senior design partner, recruiters |
| **Primary CTAs** | **See the work** (case studies) · **View my CV** (https://mutaher.figma.site/) |
| **Secondary CTA** | Email — mutaher.ux@gmail.com |
| **Deliverables** | `index.html`, `style.css`, `script.js`, `case.html` (case study template), `/admin` (vanilla-JS CMS), `/content` (data), `/assets` |
| **Quality bar** | Awwwards "Site of the Day" level craft **and** WCAG 2.2 AA — the site itself is his accessibility case study |

**The big idea — "Complexity → Clarity."**
Mutaher's whole career is untangling hard things: tax forms turned into flows, six admin tools merged into one, data-heavy screens made calm. The site *shows* this. Every scroll pulls chaos into order: scattered fragments line up into grids, grids turn into interfaces, and interfaces turn into a human face. The visitor feels the craft before they read about it.

## 2. Core positioning

**Positioning statement**
> For startups and product teams buried in complex systems, Mutaher Hossain is a senior product design consultant. He turns tangled technology into calm, human products, using research, business strategy, and AI-accelerated prototyping. Unlike pixel-only designers, he carries a product from the first user interview to a shipped, accessible, measurable result.

**One-liner (hero)**
> I make complex technology feel effortless.

**Supporting line**
> Senior product designer and consultant with 10+ years across Samsung, enterprise SaaS, and startups. I research, strategise, design, and prototype with AI, so your users get it right the first time.

**Proof pillars (why believe)**
1. **Scale:** Samsung Health for iOS, used by millions.
2. **Measured impact:** −45% upload errors, −40% context switching, −35% task time (Cefalo enterprise platforms, 2025).
3. **Range:** research → strategy → UX/UI → design systems → WCAG → AI prototyping → Webflow/HTML build.
4. **Human story:** a textile engineer who taught himself to weave interfaces instead of fabric.

**Messaging do's**
- Lead with outcomes and numbers, not tool lists.
- Say "you" and "your users". Short sentences. Confident, warm, never boastful.
- One idea per headline.

**Avoid:** "passionate", "pixel-perfect", "world-class", "guru", "ninja", lorem ipsum (the current Webflow site has placeholder copy, and the new site ships with none).

## 3. Brand personality

| Trait | Expressed as | Not |
|---|---|---|
| **Premium / luxury** | Generous negative space, slow confident easing, editorial serif italics, restrained palette | Gold foil, busy ornament |
| **Creative** | Kinetic type, particle morphs, custom cursor, surprising transitions | Random effects with no meaning |
| **Welcoming** | Warm light theme, human portrait, "Let's make it simple" tone, visible accessibility tools | Cold tech-bro darkness only |
| **Futuristic** | Canvas particle scene, mono data labels, glass-edge panels, soft glow | Neon cyberpunk, sci-fi clichés |
| **Bold** | 18–22vw display type, full-bleed sections, big numbers | Shouting, all-caps paragraphs |
| **Playful** | Magnetic buttons, cursor that "reads" hovered work, easter-egg Dhaka clock, hover-scramble text | Cartoon mascots, bounce everywhere |

**Voice sample**
> "Your users shouldn't need a manual. They need a product that already understands them. That's the part I design."

## 4. Visual direction

**Mood:** *a calm botanical lab at night.* Deep forest-black surfaces, soothing sage and mint light, soft film grain, frosted glass edges. The light theme is *morning in the same lab*: warm paper, deep green ink, sunlight-sage accents.

**Visual motifs**
1. **The thread → grid.** A nod to his textile past. Fine lines weave into layout grids and appear as section dividers, the timeline spine, and hover underlines.
2. **Particles that organise.** Chaos → order in the hero, and a smaller echo in the final CTA.
3. **Frosted panels.** Case study cards and the a11y panel use 1px light edges plus backdrop blur, applied sparingly.
4. **Mono metadata.** Every section carries a small `JetBrains Mono` index label (`01 — MISSION`), which reads as engineered and precise.
5. **Grain.** A 3–4% animated SVG noise overlay across the whole site, fixed and pointer-events none.

**Imagery**
- Portrait: `Media/Mutaher Hossain.png`, used in the hero particle morph, the story section, and as the OG image.
- Work: existing case study images from the Webflow CDN, downloaded into `/assets/work/<slug>/`.
- Confidential Cefalo projects (TellusR, Sensa Unity, Miros, Fished, ATS, HR Portal) have no public images, so they get **generative typographic covers**: project name set huge, a metric, and an abstract grid pattern drawn in CSS/SVG. When he adds real screens later, he uploads them through the CMS.

## 5. The cinematic sequence — one seamless shot: "Untangled"

A single continuous camera move in three beats. It is delivered in two forms:

**(a) Live in-browser version (built now, zero video weight).** A GPU-friendly `<canvas>` particle scene scrubbed by scroll. It works today, so no generated video is needed to launch.
**(b) Generated film version (optional upgrade).** Prompts below, for Veo 3 / Kling / Runway / Sora. Once the video path is set in the CMS (Hero → Cinematic video, e.g. `assets/video/untangled.mp4`), the site swaps the canvas for scroll-scrubbed video and keeps the particle layer as an overlay.

### Beat 1 — THE TANGLE (0–33% of hero scroll)
> Macro, slow drift through a dark void. Thousands of floating fragments hang in the air, all out of order: torn sticky notes, wireframe shards, spreadsheet cells, form fields, flowchart arrows, tangled glowing threads. Soothing sage-green bioluminescent light, soft volumetric haze, shallow depth of field. The camera glides forward through the chaos. Quiet, curious, not stressful. 35mm anamorphic, film grain, premium, calm.

*Canvas:* ~2,400 particles in noisy 3D drift with slight depth parallax; short "thread" lines connect near neighbours. Headline line 1 assembles letter by letter from scattered positions.

### Beat 2 — THE ORDER (33–66%)
> Without a cut, the fragments are pulled by an invisible force into perfect alignment. Threads straighten into a luminous grid, and shards snap into place and become a clean glass product interface with cards, charts, and navigation, glowing softly in mint light. The camera pushes through the centre of the interface as it resolves, like passing through a window.

*Canvas:* particles tween to target points sampled from a UI wireframe layout (nav bar, cards, chart bars, buttons), drawn off-screen and sampled. Grid lines fade in. A counter ticks "complexity 100% → 0%".

### Beat 3 — THE HUMAN (66–100%)
> On the other side of the interface, calm light. A South Asian man in his thirties with dark hair, a full beard, and black-rimmed glasses stands relaxed in a minimal sage-lit studio, wearing a beige check shirt. Frosted glass panels showing finished app screens float gently around him. The camera eases into a slow half-orbit and settles at eye level. He gives a warm, confident half-smile. Premium, welcoming, not corporate.

*Canvas:* particles re-target to points sampled from his portrait's luminance (dark pixels = beard, hair, glasses, which are strongly defined). The portrait forms in particles, then cross-fades into the real photo with a soft green duotone. The hero headline completes: **"I make complex technology feel effortless."**

**Continuity rules for generated video:** same colour temperature throughout (sage #7FCFA5 key, warm #E9C98B rim), no hard cuts, constant forward camera momentum, 8–10 s total, 24 fps, 1920×1080, then transcoded to all-intra H.264 for smooth scrubbing (see §22).

---

# PART B — EXPERIENCE DESIGN

## 6. Website structure

```
index.html (single scroll story)
 00  Preloader ............ counter 0→100, name reveal, sets theme
 01  Hero ................. pinned "Untangled" canvas scene (≈300vh)
 02  Stats strip .......... animated counters + infinite marquee
 03  Mission .............. scroll-lit manifesto, word by word
 04  Three pillars ........ Strategy · Design · Build (pinned horizontal cards)
 05  Story ................ "From threads to interfaces" horizontal timeline
 06  Services ............. three consulting offers
 07  Featured work ........ CMS-driven case study stack + full index
 08  Toolbox & learning ... tools + certifications marquee
 09  Final CTA ............ "Let's make it simple." + particle echo
 10  Footer ............... Dhaka clock, socials, a11y statement

case.html?slug=<id> ....... CMS-rendered case study template
admin/index.html .......... local CMS (content editor)
Global UI: nav, a11y/appearance panel, "Listen" reader, custom cursor, grain, page transitions
```

**Navigation:** fixed minimal bar. Left: "MH" monogram (hover morphs to "Mutaher Hossain"). Right: Work · About · Services · Contact · ◐ theme · ♿ Accessibility · ▶ Listen. On mobile: a full-screen menu with staggered giant links.

## 7. Hero section

- **Layout:** full-viewport pinned canvas. Mono label top-left `SENIOR PRODUCT DESIGN CONSULTANT — DHAKA / REMOTE`. Scroll cue bottom-centre (a thin thread line animating downward).
- **Headline (kinetic, assembles across the three beats):**
  - Beat 1: `I make` (letters drift in from particle positions)
  - Beat 2: `complex technology` (letters snap to the grid; "complex" briefly scrambles)
  - Beat 3: `feel effortless.` ("effortless" in Instrument Serif italic, mint)
- **Sub copy (fades in on beat 3):** "10+ years designing for Samsung, enterprise SaaS and startups. Research, strategy, UX/UI and AI prototyping, all under one roof."
- **CTAs:** `See the work ↘` (primary, magnetic, scrolls to §07) · `View my CV ↗` (secondary, opens figma.site in a new tab, labelled for screen readers).
- **Availability chip:** pulsing mint dot, "Available for new projects, Q4 2026".
- **Reduced motion:** static portrait composition with a grid backdrop and the full headline shown at once.

## 8. Animated stats strip

Counters count up once when 40% visible (tabular numerals). Below them is a slow infinite marquee of capabilities.

| Stat | Label |
|---|---|
| **10+** | Years designing products |
| **1M+** | People using products I've shaped (Samsung Health iOS) |
| **6** | Enterprise platforms redesigned at Cefalo in 2025 |
| **−45%** | Upload errors (Sensa Unity) |
| **−40%** | Context switching (TellusR) |
| **+25%** | Application completion (Cefalo ATS) |

*Stats come from his CV and are editable in the CMS (`content.stats`).*
Marquee: `Design thinking ✳ Service design ✳ UX research ✳ Business strategy ✳ AI product design ✳ Rapid prototyping ✳ Design systems ✳ WCAG ✳ Usability testing ✳ UX audits ✳`. Direction flips with scroll direction and speeds up with scroll velocity.

## 9. Mission section

Giant manifesto at ~5vw. Each word goes from 15% to 100% opacity as it's scrubbed through, and the key words turn mint.

> **Technology should bend to people, not the other way around.**
> I untangle complex products and turn them into calm, obvious experiences that users love and businesses can measure.

Small mono footnote: `03 — WHY I DO THIS`. On the right: a slowly rotating thread-knot SVG that untangles as you scroll.

## 10. Three pillars section

Pinned section. Three tall cards slide in horizontally (desktop) or stack (mobile). Each card has a big index number, a title, a promise, capabilities, and an outcome line. Hover tilts the card 3D (±6°) and moves a mint light that follows the cursor.

| | **01 — Strategy** | **02 — Design** | **03 — Build** |
|---|---|---|---|
| Promise | Know what to build before you build it | Interfaces people understand instantly | From idea to working prototype in days |
| Capabilities | User & market research · competitor analysis · personas · service design · business strategy · product ideation · product management | UX & UI design · design systems · interaction design · WCAG 2.2 accessibility · usability testing · UX audits | AI product design · AI-assisted rapid prototyping (Claude, Figma) · Webflow · HTML/CSS · dev handoff |
| Outcome | Less guesswork, sharper roadmap | Fewer errors, faster tasks | Validated ideas, faster launches |

## 11. Story section — "From threads to interfaces"

Horizontal scroll timeline (pinned). A single thread line runs through all chapters and "weaves" (SVG stroke-dashoffset) as you progress. The portrait appears in chapter 1 with a duotone mask reveal.

Intro copy:
> I started out weaving fabric. I studied Textile Technology, worked two years in the industry, and then taught myself HTML and CSS at night. Converting PSDs to code led me to UI, and UI led me to UX. I haven't looked back. Now I weave people, business, and technology into products that work.

| Chapter | Year | Title | Line |
|---|---|---|---|
| 1 | 2008–12 | B.Sc Textile Technology, AUST | Where I learned systems, patterns and precision |
| 2 | 2015–16 | PGD in IT, IIT, University of Dhaka | The switch: self-taught HTML/CSS becomes a career |
| 3 | 2016 | Graphic Designer, Arobil | First pixels for pay |
| 4 | 2016–17 | UX Engineer, Kikinben | E-commerce redesign, +15–20% conversion |
| 5 | 2017–18 | UI/UX Designer, Ethics Advance Technology | EdTech UX, 20% fewer iteration cycles |
| 6 | 2018–25 | UI/UX Designer, Samsung R&D Institute Bangladesh | Samsung Health iOS, Galaxy Buds, Bixby, used by millions |
| 7 | 2025– | Senior Product Designer, Cefalo | Six enterprise & AI platforms, measurable wins |
| 8 | Now | Independent consultant | Helping startups and teams make tech effortless. *Your project here?* |

Closing values line: "Self-taught. Ethical. Collaborative. I do good work that leaves things better."

## 12. Services section (consulting offers)

Three offer cards. Each has an "Ask about this →" link that pre-fills the email subject.

1. **UX & Accessibility Audit** (1–2 weeks): heuristic review, WCAG 2.2 check, usability tests, prioritised fix list. *Best for: live products losing users.*
2. **Product Design Sprint** (2–6 weeks): research → strategy → flows → UI → AI-built clickable prototype, tested with real users. *Best for: startups going 0→1 or pivoting.*
3. **Embedded Design Partner** (monthly): senior design leadership inside your team, covering design system, roadmap, and delivery. *Best for: scaling SaaS and enterprise teams.*

## 13. Featured work section

**CMS-driven.** All content comes from `content/content.js`.

**Presentation (desktop):** a sticky stacking-card deck. Each project card pins, scales down to 0.92 and dims as the next one slides over it. Card: cover image (or generative cover), category label, title, one-line summary, 1–3 metric chips, "Read case study →". Over any card, the custom cursor becomes a mint disc reading "VIEW".
Below the deck is a **Full index** list (text rows: year · project · role · tags). Hovering a row shows a floating image preview that follows the cursor with lerp. Filter chips: All · Enterprise & AI · Consumer · Passion projects · Resources.

**Initial content (from existing portfolio + CV):**

| Order | Project | Category | Hook | Status |
|---|---|---|---|---|
| 1 | TellusR — Enterprise LLM platform | Enterprise & AI | 3 admin tools → 1; −40% context switching | Confidential: metrics + generative cover |
| 2 | Samsung Health for iOS | Consumer | Android → native iOS, design system rebuilt in Sketch | Full case study |
| 3 | Tax Return BD | Consumer / Fintech | Bangladesh's first digital tax filing, for payers and agents | Full case study |
| 4 | Sensa Unity — Data Explorer | Enterprise & AI | −45% upload errors, +25% query success | Confidential |
| 5 | Nishchinte Delivery | Passion | End-to-end UCD for parcel delivery | Full case study |
| 6 | iVote | Passion | Secure online voting for student associations | Full case study |
| 7 | Miros — RangeFinder Portal | Enterprise | −40% time to critical metrics | Confidential |
| 8 | Fished — My Dev Portal | Enterprise | +35% data discoverability | Confidential |
| 9 | Cefalo Career & ATS | Enterprise | +20–25% application completion | Confidential |
| 10 | Cefalo HR Portal | Enterprise | −30–40% user effort | Confidential |
| 11 | Sales Force Automation | B2B | Web + mobile sales toolkit | Coming soon |
| 12 | Icon Bundle | Resources | Free custom icon set on Figma | External link |

**Case study template (`case.html`)**, built from reusable blocks the CMS can add, reorder, or remove:
`hero` (title, subtitle, cover, meta: role / type / duration / platform) · `text` (heading + rich paragraph) · `bullets` · `two-column` (e.g. Problems | Solutions) · `image` (full / contained, caption) · `gallery` (grid, 2–4 cols, lightbox) · `slider` (drag/swipe carousel) · `before-after` (drag comparison) · `metrics` (big numbers) · `quote` · `process` (steps: Empathize → Define → Ideate → Design → Test) · `video` · `embed` (Figma/prototype iframe) · `callout` · `divider`.
Case pages end with a "Next project" full-bleed card; dragging or scrolling into it transitions to the next case study.

## 14. Toolbox & learning

Two slim marquees. Tools: Figma · Claude · Claude Design · Sketch · After Effects · Photoshop · Illustrator · Webflow · Zeplin · HTML · CSS. Certifications: IxDF (Designing Experiences for AI, UX → Service Design, Don Norman: Design for the 21st Century, User Research, Mobile UX, UX Management, HCI) · Udemy (Product Management for AI & Data Science, 2026). The marquees pause on hover and focus, and each item is a real list for screen readers.

## 15. Final CTA section

Full-viewport. A smaller particle field drifts, then organises into the headline as the section enters.

> ### Let's make it **simple.**
> Got a product that feels harder than it should? Let's untangle it together over coffee, virtual or in Dhaka.

Buttons (magnetic): `See the work` · `View my CV ↗` · `mutaher.ux@gmail.com` (click copies with a toast "Copied, talk soon"; also a mailto link).

## 16. Footer

- A giant outlined wordmark, `MUTAHER`, fills when hovered.
- Columns: Navigate · Elsewhere (LinkedIn, Dribbble, Behance, CV) · Contact.
- Live **Dhaka time** ("It's 14:32 in Dhaka, I'm probably designing") that changes by hour: coffee, designing, sleeping.
- Accessibility statement link, "Built by hand with HTML, CSS & JS", © 2026, back-to-top (thread line rewinds).

---

# PART C — DESIGN SYSTEM

## 17. Complete visual style guide

### Colour tokens

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#0B100E` forest black | `#F5F2EA` warm paper | Page |
| `--bg-2` | `#111916` | `#ECE8DC` | Alt sections |
| `--surface` | `rgba(255,255,255,.04)` | `rgba(20,40,30,.04)` | Cards |
| `--line` | `rgba(200,235,215,.12)` | `rgba(20,50,35,.14)` | Hairlines |
| `--text` | `#E9F1EC` | `#0F1F18` | Body |
| `--text-2` | `#9DB3A7` | `#4A5E54` | Secondary (≥4.5:1 on bg) |
| `--accent` | `#7FCFA5` sage-mint | `#1E6B4B` deep green | Primary accent |
| `--accent-2` | `#B8E8CD` | `#2F8A62` | Hover / glow |
| `--warm` | `#E9C98B` | `#A8742A` | Single rare warm spark (availability, highlights) |
| `--focus` | `#FFE08A` | `#0047AB` | Focus ring (always 3px, 2px offset) |

Contrast is verified for every text/bg pair: AA at minimum, AAA for body copy.

### Colour-vision & contrast modes (`data-vision` on `<html>`)
Each mode remaps the accent and semantic tokens. It never relies on hue alone: metric chips carry ↑ ↓ icons and labels.

| Mode | Accent (dark / light) | Notes |
|---|---|---|
| Default | sage `#7FCFA5` / `#1E6B4B` | |
| Protanopia | blue `#7FB8FF` / `#0B5CAD` | red-green safe |
| Deuteranopia | blue-violet `#9FA8FF` / `#3B3FB3` | red-green safe |
| Tritanopia | coral `#FF9E9E` / `#B3261E` | blue-yellow safe |
| Monochrome | `#FFFFFF` / `#000000` + underlines | achromatopsia |
| High contrast | pure black/white, accent `#FFE600`, thicker borders, grain off, glass off | low vision |

### Spacing, radius, elevation
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 (`--s-1`…`--s-11`). Section padding `clamp(96px, 14vw, 220px)`.
- Grid: 12 columns, gutter `clamp(16px, 2vw, 32px)`, max content 1600px, side margin `clamp(16px, 5vw, 80px)`.
- Radius: 6 (chips) · 16 (images) · 28 (cards) · 999 (buttons).
- Elevation is done with light, not shadow: 1px `--line` borders, an inner top highlight, and a soft accent glow on hover (`0 0 60px -20px var(--accent)`).

### Buttons
- Primary: accent fill, `--bg` text, pill, 56px tall. On hover, a fill wipes in from the cursor direction, the label rolls up to a duplicate, and the arrow rotates 45°. Magnetic within a 1.2× radius.
- Secondary: 1px line border, text colour; on hover the border becomes accent and the background tints.
- Every button: min 44×44 target, visible focus ring, `aria-label` when icon-only.

## 18. Typography

| Role | Family | Weights | Size (clamp) | Tracking |
|---|---|---|---|---|
| Display | **Inter Tight** | 500–700 | `clamp(56px, 13vw, 260px)` | −0.05em, lh 0.88 |
| Display accent | **Instrument Serif** *italic* | 400 | matches display | −0.02em |
| H2 | Inter Tight | 600 | `clamp(40px, 7vw, 128px)` | −0.04em |
| H3 | Inter Tight | 600 | `clamp(24px, 2.6vw, 40px)` | −0.02em |
| Body L | Inter | 400 | `clamp(18px, 1.4vw, 22px)` | 0, lh 1.55 |
| Body | Inter | 400 | 17px | lh 1.6 |
| Label / mono | **JetBrains Mono** | 400–500 | 12–13px, uppercase | +0.08em |
| Numbers | Inter Tight | 600 | `tabular-nums` | |

All loaded from Google Fonts with `display=swap`, using `preconnect` and only the needed weights. A user text-size control scales the root from 100% to 150%, and the layout reflows without breaking.

## 19. Animation direction

**Principles:** slow in, confident out. Nothing bounces. Motion always *means* something: things organising, revealing, or responding to you.

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` (expo out, primary) |
| `--ease-in-out` | `cubic-bezier(.76, 0, .24, 1)` (transitions / curtains) |
| Durations | micro 200ms · UI 450ms · reveal 1000ms · cinematic 1400ms |
| Stagger | letters 0.02s · words 0.04s · items 0.08s |

**Signature moves**
1. **Line mask reveal:** headings split into lines, each rising from a `overflow:hidden` mask (yPercent 110 → 0).
2. **Letter assemble:** hero letters fly from particle coordinates into place.
3. **Scramble:** mono labels decode through random glyphs on reveal and hover.
4. **Scroll-lit words:** manifesto opacity is scrubbed per word.
5. **Image curtain:** covers are revealed by a clip-path inset with a 1.15 → 1 scale.
6. **Velocity skew:** large images and marquees skew slightly (max 4°) with scroll velocity, then settle.
7. **Page transition:** a mint curtain wipes up, the next page's title is visible mid-wipe, and the curtain exits upward.

## 20. Interaction design

- **Custom cursor:** a 10px dot plus a 40px lerped ring. States: default, link (ring grows), work card (mint disc "VIEW"), drag (slider "DRAG ←→"), text (thin I-beam). Hidden on touch devices and when reduced motion or high contrast is on; the native cursor stays available.
- **Magnetic elements:** buttons, nav links, and social icons pull toward the cursor (strength 0.3).
- **Hover previews:** the work index shows floating images; case cards get 3D tilt and a light spot.
- **Theme toggle:** a circular reveal from the toggle's position (View Transitions API, with a fallback crossfade). Preference is saved to localStorage and defaults to `prefers-color-scheme`.
- **Accessibility & Appearance panel (♿ in nav, shortcut `Alt+A`):**
  - Theme: Auto / Light / Dark
  - Colour vision: Default / Protanopia / Deuteranopia / Tritanopia / Monochrome
  - High contrast on/off
  - Text size: 100 / 115 / 130 / 150%
  - Motion: Full / Reduced / None (defaults from `prefers-reduced-motion`)
  - Dyslexia-friendly font (Atkinson Hyperlegible) and increased letter/line spacing
  - Underline all links
  - Grain & blur effects on/off
  - Reset
  - All settings persist in localStorage, are applied before first paint (inline script in `<head>`) so nothing flashes, and are fully operable by keyboard.
- **"Listen" reader (▶ in nav, `Alt+L`):** Web Speech API read-aloud with *voice auto-selection for the most natural voice available*: prefer voices whose names contain "Natural", "Neural", "Premium", "Enhanced", or "Google", then Samantha/Daniel, then the system default. A floating mini-player offers play/pause, previous/next section, speed 0.8–1.5×, and a voice picker. The sentence being read is highlighted in mint and scrolled into view. *Note: real screen-reader users keep their own screen reader and voice. This feature is an extra for everyone else and never interferes: it is `aria-hidden` when idle and announces its state via a live region.*
- **Keyboard navigation:**
  - A "Skip to content" and "Skip to work" link appears on first Tab.
  - Logical tab order; visible 3px focus ring everywhere; `:focus-visible` only.
  - Shortcuts (shown in a `?` dialog): `G W` work, `G A` about, `G C` contact, `T` theme, `Alt+A` accessibility panel, `Alt+L` listen, `Esc` closes any overlay.
  - Horizontal pinned sections have visible Prev/Next buttons, and arrow keys move between cards when focused.
  - Sliders: arrow keys, Home/End, `aria-roledescription="carousel"`, live-region slide announcements.
  - Menus and dialogs trap focus and return focus to their trigger on close.
- **Screen reader semantics:** landmark regions (`header`, `nav`, `main`, `section[aria-labelledby]`, `footer`). The canvas is `aria-hidden` with a text alternative describing the scene. Split-text keeps the original string in `aria-label` and hides the spans. Counters expose their final value. Every image has meaningful alt text, editable in the CMS; decorative images use `alt=""`.

## 21. Scroll behavior

- **Lenis** smooth scroll (`lerp: 0.085`, `wheelMultiplier: 1`, `smoothTouch: false`) synced to GSAP's ticker; `ScrollTrigger.update` on Lenis scroll.
- Lenis is disabled completely when Motion = None, and native scroll is used when reduced.
- **Pinned scenes:** Hero (300vh), Pillars (horizontal, 200vh), Story (horizontal, ~400vh). All other sections reveal in normal flow.
- Anchor links use `lenis.scrollTo` with offset and ease; focus moves to the target heading for keyboard and screen-reader users.
- A thin mint scroll-progress thread sits at the right edge, with section ticks (hover shows the section name, click jumps to it).
- Navigation bar hides on scroll down and returns on scroll up; it goes glass after 100px.
- `ScrollTrigger.refresh()` runs after fonts and images load and on resize (debounced).

## 22. Mobile behavior

- Breakpoints: 480 · 768 · 1024 · 1440.
- Hero: canvas particle count drops to ~900 (DPR capped at 1.5), pin length 200vh, and the portrait morph is kept because it's the signature moment.
- Horizontal pinned sections (Pillars, Story) become **vertical stacks** with snap-feel reveals below 1024px, which avoids scroll-jacking on touch.
- Stacking work cards become a simple vertical list with swipeable image sliders.
- No custom cursor, magnetic, or tilt on touch; tap targets are ≥48px.
- Full-screen menu with giant staggered links, the a11y panel, and Listen.
- Typography clamps keep display type ≥ 48px and never overflow (`overflow-wrap: anywhere` on long words).
- Test at 360×640, 390×844, 768×1024, 1440×900, and 1920×1080.

---

# PART D — IMPLEMENTATION INSTRUCTIONS FOR CLAUDE CODE

## 23. Technical implementation

### 23.1 File tree
```
Portfolio/
├── BUILD-PLAN.md
├── index.html
├── case.html
├── style.css
├── script.js              # home + global (nav, a11y, listen, cursor, lenis)
├── case.js                # case study renderer (block → DOM)
├── content/
│   └── content.js         # window.SITE_CONTENT = {...}  (works on file:// and servers)
├── admin/
│   ├── index.html         # CMS UI
│   ├── admin.css
│   └── admin.js
├── assets/
│   ├── img/portrait.webp (+ .jpg fallback, 1200px & 600px)
│   ├── img/og.jpg
│   ├── work/<slug>/*.webp # downloaded + converted case study images
│   ├── video/             # untangled.mp4 (optional, drop-in)
│   ├── icons/favicon.svg
│   └── noise.svg
└── Media/                 # original source photo (untouched)
```

### 23.2 Libraries (CDN, pinned versions, `defer`)
- GSAP 3 core + ScrollTrigger: `https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js`, `…/ScrollTrigger.min.js`
- Lenis: `https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js`
- Fonts: Google Fonts (Inter, Inter Tight, Instrument Serif, JetBrains Mono, Atkinson Hyperlegible; the last loaded only when enabled)
- No other dependencies. Text splitting is a custom ~40-line utility that preserves accessibility.

### 23.3 Hero canvas engine (`script.js › Untangled`)
1. Offscreen-sample three point clouds of N = 2400 (desktop) / 900 (mobile):
   - **A (chaos):** random 3D positions in a box, each with a noise seed.
   - **B (interface):** draw a wireframe UI (nav bar, sidebar, 3 cards, bar chart, button) with the Canvas 2D API at canvas size, then sample N pixels along strokes.
   - **C (portrait):** draw `portrait.webp` to an offscreen canvas, threshold luminance (dark features), and sample N points weighted by darkness. Centre on the right half (desktop) or top (mobile).
2. Store positions in `Float32Array`s. Progress `p ∈ [0,1]` comes from the ScrollTrigger scrub (`scrub: 1`).
3. Each frame: `pos = mix(A_noisy, B, ease(clamp(p*3-1)))`, then `mix(…, C, ease(clamp(p*3-2)))`. Draw 1.4px dots with the accent colour and alpha by depth; draw neighbour threads in beat 1 only (spatial hash, max 600 lines).
4. At p > 0.92, cross-fade the real portrait (CSS duotone via `mix-blend-mode` + gradient) above the canvas.
5. Render only while the hero is in view (IntersectionObserver); pause on `visibilitychange`; DPR ≤ 2 (≤ 1.5 mobile).
6. **Video upgrade:** if `content.hero.video` is set (optional `videoMobile` for phones), use `<video muted playsinline preload="auto">` and set `video.currentTime = p * duration` inside rAF (throttled to changed values), keeping particles at 35% opacity as an overlay. Encode with `ffmpeg -i in.mp4 -vf scale=1920:-2 -c:v libx264 -x264-params keyint=1 -crf 24 -pix_fmt yuv420p -movflags +faststart -an untangled.mp4`, plus a 960px mobile version.

### 23.4 CMS — content model & admin

**Why this approach:** the site must stay pure static HTML/CSS/JS with no server, and Mutaher needs to edit everything himself. So content lives in one data file, `content/content.js`, and a local admin app edits it visually.

**`content.js` shape**
```js
window.SITE_CONTENT = {
  site:   { name, title, tagline, email, cvUrl, availability, socials:[{label,url}] },
  hero:   { lines:["I make","complex technology","feel effortless."], sub, ctas:[...] },
  stats:  [{ value:10, prefix:"", suffix:"+", label:"Years designing products" }, ...],
  mission:{ text, highlights:["people","calm","measure"] },
  pillars:[{ title, promise, capabilities:[], outcome }],
  story:  { intro, chapters:[{ year, title, org, line, image? }] },
  services:[{ title, duration, description, bestFor }],
  tools:[], certifications:[{ year, title, issuer }],
  projects:[{
    slug, title, subtitle, category, year, role, type, duration, platforms:[],
    featured:true, order:1, status:"published|draft|coming-soon|confidential",
    cover:{ src, alt } | null, coverStyle:"image|generative", accentOverride?:"#hex",
    metrics:[{ value:"-45%", label:"upload errors" }], tags:[], externalUrl?,
    seo:{ title, description, ogImage },
    blocks:[ { type:"text", heading, body }, { type:"gallery", columns:3, images:[{src,alt,caption}] },
             { type:"slider", images:[...] }, { type:"bullets", heading, items:[] },
             { type:"two-column", left:{heading,items}, right:{heading,items} },
             { type:"metrics", items:[] }, { type:"before-after", before, after },
             { type:"quote", text, author }, { type:"process", steps:[{title,body}] },
             { type:"image", src, alt, caption, width:"full|contained" },
             { type:"video", src, poster }, { type:"embed", url, ratio }, { type:"callout", text }, { type:"divider" } ]
  }]
};
```

**Admin app (`admin/index.html`), all vanilla JS**
- Sidebar: Site settings · Hero · Stats · Mission · Pillars · Story · Services · Tools & certs · **Projects**.
- Projects list: search, filter by status, **drag to reorder**, duplicate, draft/publish toggle, featured star, delete (with confirm).
- Project editor: meta form, plus a **block builder**. "+ Add block" opens a menu of all block types; blocks can be dragged to reorder, collapsed, duplicated, or removed. Each block type has a tailored form: rich text (bold/italic/link/lists via `contenteditable` with a sanitised toolbar), bullet list editor, gallery/slider image manager (drag-drop upload, reorder, alt text **required**, caption), before/after pickers.
- **Images:** drag-drop or pick files. With the **File System Access API** (Chrome/Edge), the admin asks once for the `Portfolio` folder, writes resized WebP copies (canvas, max 2400px, quality 0.82) into `assets/work/<slug>/`, and writes `content/content.js` directly with **Save** (⌘S). In other browsers it falls back to *Download content.js* plus a ZIP of new images.
- **Live preview:** a split pane iframe renders `case.html` with unsaved content via `postMessage`, with desktop/tablet/mobile toggles.
- Validation: missing alt text, missing cover, and duplicate slug warnings. Autosaves a draft to localStorage, with **Undo/Redo** and export/import JSON backup.
- The admin is local-only: excluded from nav and marked `noindex`. When he deploys (Netlify/Vercel/GitHub Pages), he doesn't upload `/admin`, or protects it. A later upgrade path is documented: Decap CMS (CDN, Git-backed) reading the same schema.

### 23.5 Performance budget
- Home, first load (excluding fonts): **< 450 KB** JS+CSS+HTML gzipped; LCP < 2.0s on 4G; CLS < 0.02; INP < 150ms.
- Images: WebP, `srcset` 600/1200/2000, `loading="lazy"` + `decoding="async"` below the fold; hero portrait preloaded.
- One rAF loop shared by Lenis, the cursor, and the canvas. Canvas only renders when visible. No layout reads inside rAF.
- `content-visibility: auto` on long sections; `will-change` only while an element is animating.
- Fonts: `preconnect`, subset weights, `font-display: swap`, and size-adjusted fallbacks to avoid CLS.
- Scripts are `defer`red; the theme/a11y bootstrap is a tiny inline `<head>` script to prevent a flash.

### 23.6 Accessibility checklist (WCAG 2.2 AA; a ship blocker)
- [ ] Colour contrast AA across all 6 vision modes × 2 themes
- [ ] Every function works with keyboard only; no keyboard traps; focus always visible and not obscured (2.4.11)
- [ ] `prefers-reduced-motion` respected, plus the manual override; no flashing > 3/s
- [ ] Pause/stop for all auto-moving content (marquees, particles) (2.2.2)
- [ ] Target size ≥ 24px, primary ≥ 44px (2.5.8)
- [ ] Text resize to 200% without loss; reflow at 320px width
- [ ] Headings in order; one `h1`; landmarks; descriptive link text; external links announced
- [ ] Alt text on all informative images (CMS-enforced)
- [ ] Tested with VoiceOver (macOS/iOS) and keyboard only; Lighthouse a11y = 100, axe clean

### 23.7 SEO & sharing
Semantic HTML; `<title>` "Md. Mutaher Hossain — Senior Product Design Consultant"; meta description; OG/Twitter image (portrait + headline); JSON-LD `Person` (jobTitle, sameAs: LinkedIn/Dribbble/Behance); per-case-study meta from the CMS `seo` field; `sitemap.xml` + `robots.txt` (admin disallowed).

### 23.8 Build order
1. Asset prep: convert the portrait to WebP sizes; download the Webflow case study images into `assets/work/` and convert them to WebP.
2. `content/content.js` seeded with all copy from this plan and the four full case studies (Samsung Health, Tax Return BD, Nishchinte, iVote) mapped into blocks.
3. `index.html` semantic skeleton + `style.css` tokens, themes, vision modes, and layout. Must be fully readable with JS off.
4. `script.js`: a11y bootstrap → Lenis/GSAP → nav → reveals → stats → mission → pillars → story → work → CTA → footer clock.
5. Hero `Untangled` canvas engine + video drop-in hook.
6. Cursor, magnetic, tilt, page transitions.
7. Accessibility panel + Listen reader + keyboard shortcuts.
8. `case.html` + `case.js` block renderer (gallery lightbox, slider, before/after).
9. `admin/` CMS.
10. QA: responsive sweep, a11y audit, Lighthouse, reduced-motion pass, browser test (Chrome, Safari, Firefox).

### 23.9 Run locally
Open `index.html` directly, or serve with `npx serve .`. Open `admin/index.html` in Chrome/Edge for direct saving.
