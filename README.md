# Mutaher Hossain — Portfolio

Static site: `index.html` · `case.html` · `style.css` · `script.js` · `case.js` · `/content` · `/assets` · `/admin`.
GSAP, ScrollTrigger and Lenis come from jsDelivr. There is no build step.

## Run locally
```bash
cd "Portfolio"
python3 server.py
```
Then open http://localhost:5174. `server.py` serves the site and lets the CMS, design system and palette lab **save straight into this folder** from any browser, with no folder picker. It only runs on your computer, and it can only write `tokens.css`, `content/content.js` and files in `assets/work/` and `assets/video/`. Plain `python3 -m http.server` still shows the site, but saving then falls back to Chrome's folder picker or a download.

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
