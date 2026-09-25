/* Shared "save to project" helper for the CMS, design system and palette lab.
   1) server.py running → POST /__save (works in every browser)
   2) otherwise the File System Access API (Chrome/Edge folder picker), remembered in IndexedDB
   3) otherwise returns { ok:false } so the caller can offer a download. */
(() => {
  'use strict';
  // Resolve the site root from this script's own URL, so pages in /admin work too
  const ROOT = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;
  let serverUp = null;

  async function server() {
    if (serverUp !== null) return serverUp;
    if (location.protocol === 'file:') return (serverUp = false);
    try { const r = await fetch(ROOT + '__save/ping', { cache: 'no-store' }); serverUp = r.ok && (await r.json()).ok === true; }
    catch (e) { serverUp = false; }
    return serverUp;
  }

  const toBase64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });

  // --- File System Access fallback (shares the folder handle with the CMS) ---
  const idb = (mode, fn) => new Promise((res, rej) => { const r = indexedDB.open('mh-cms', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
  async function folder(ask) {
    if (!window.showDirectoryPicker) return null;
    let dir = null; try { dir = await idb('readonly', (s) => s.get('dir')); } catch (e) {}
    if (dir) {
      const o = { mode: 'readwrite' }; let perm = await dir.queryPermission(o);
      if (perm !== 'granted' && ask) perm = await dir.requestPermission(o);
      if (perm !== 'granted') dir = null;
    }
    if (!dir && ask) {
      try { dir = await window.showDirectoryPicker({ id: 'mh-portfolio', mode: 'readwrite' }); await idb('readwrite', (s) => s.put(dir, 'dir')); }
      catch (e) { return null; }
    }
    return dir;
  }
  async function writeFS(dir, path, data) {
    const parts = path.split('/'); const file = parts.pop();
    let d = dir; for (const p of parts) d = await d.getDirectoryHandle(p, { create: true });
    const fh = await d.getFileHandle(file, { create: true }); const w = await fh.createWritable(); await w.write(data); await w.close();
  }

  /** Save text or a Blob to a project path. Returns { ok, via, error }. */
  async function save(path, data, { askFolder = true } = {}) {
    if (await server()) {
      try {
        const body = typeof data === 'string' ? { path, text: data } : { path, base64: await toBase64(data) };
        const r = await fetch(ROOT + '__save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json(); if (j.ok) return { ok: true, via: 'server' };
        return { ok: false, via: 'server', error: j.error };
      } catch (e) { serverUp = false; }
    }
    const dir = await folder(askFolder);
    if (dir) { try { await writeFS(dir, path, data); return { ok: true, via: 'folder' }; } catch (e) { return { ok: false, via: 'folder', error: e.message }; } }
    return { ok: false, via: 'none', error: 'No save method available — run “python3 server.py” in the Portfolio folder.' };
  }

  /** Replace custom-property values inside the dark (:root) and light blocks of a tokens.css text. */
  function patchTokens(css, { dark = {}, light = {} }) {
    const patchBlock = (text, startRe, vars) => {
      const m = startRe.exec(text); if (!m) return text;
      const start = m.index + m[0].length, end = text.indexOf('}', start);
      let block = text.slice(start, end);
      Object.entries(vars).forEach(([k, v]) => {
        const re = new RegExp(`(--${k.replace(/[-]/g, '\\-')}:\\s*)([^;]+)(;)`);
        block = re.test(block) ? block.replace(re, `$1${v}$3`) : block.replace(/\s*$/, `\n  --${k}: ${v};\n`);
      });
      return text.slice(0, start) + block + text.slice(end);
    };
    let out = patchBlock(css, /:root\s*\{/, dark);
    out = patchBlock(out, /:root\[data-theme="light"\]\s*\{/, light);
    return out;
  }
  const readVar = (css, block, k) => {
    const m = (block === 'light' ? /:root\[data-theme="light"\]\s*\{([^}]*)\}/ : /:root\s*\{([^}]*)\}/).exec(css);
    const v = m && new RegExp(`--${k}:\\s*([^;]+);`).exec(m[1]); return v ? v[1].trim() : null;
  };

  /** Build the tokens.css text with a new brand colour (needs palette-lab.js for the generator). */
  async function brandCSS(hex, opts = {}) {
    const P = window.MHPalette; if (!P) throw new Error('palette-lab.js not loaded');
    const css = await fetch(ROOT + 'tokens.css', { cache: 'no-store' }).then((r) => r.text());
    const g = P.generate(hex, opts);
    const keys = ['accent', 'accent-2', 'accent-deep'].concat(opts.tint ? ['bg', 'bg-2', 'bg-3', 'surface', 'surface-2', 'line', 'line-2', 'text', 'text-2', 'text-3'] : []);
    const pick = (o) => Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, o[k]]));
    const dark = pick(g.dark), light = pick(g.light);
    dark['accent-ink'] = dark.bg || readVar(css, 'dark', 'bg') || g.dark['accent-ink'];
    light['accent-ink'] = light.bg || readVar(css, 'light', 'bg') || g.light['accent-ink'];
    return { css: patchTokens(css, { dark, light }), dark, light };
  }
  /** Save a brand colour permanently to tokens.css → site, CMS and design system all pick it up. */
  async function saveBrandColour(hex, opts = {}) {
    const { css, dark, light } = await brandCSS(hex, opts);
    const r = await save('tokens.css', css);
    return Object.assign(r, { css, dark, light });
  }
  /** Preview-only CSS (same variables) for live previews before saving. */
  async function brandPreviewCSS(hex, opts = {}) {
    const { dark, light } = await brandCSS(hex, opts);
    const block = (v) => Object.entries(v).map(([k, x]) => `  --${k}: ${x};`).join('\n');
    return `:root:not([data-theme="light"]) {\n${block(dark)}\n}\n:root[data-theme="light"] {\n${block(light)}\n}`;
  }

  window.MHSave = { save, server, patchTokens, readVar, brandCSS, brandPreviewCSS, saveBrandColour, ROOT };
})();
