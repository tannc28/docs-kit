# docs-kit

A small kit for self-contained HTML documents: design tokens and components in `doc.css`, behaviours and a
component loader in `doc.js`, one custom element per file in `components/`, and pinned third-party libraries in
`vendor/`. Documents open straight from disk (`file://`) — no build step, no server.

`gallery.html` runs every component and is the page to check after changing anything.

## Use it

Link the two files; everything else loads on demand, relative to `doc.js`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/tannc28/docs-kit@v0.1.N/doc.css">
<script src="https://cdn.jsdelivr.net/gh/tannc28/docs-kit@v0.1.N/doc.js" defer></script>
```

Replace `v0.1.N` with a release tag. A tagged URL never changes content. Locally, a checkout works the same way
(`../shared/doc.css` when `shared` points at this repo).

A document's own script that needs `window.Docs` waits for the `docs:ready` event (or runs at once when
`Docs.ready` is true).

## Layout

| Path | What |
|---|---|
| `doc.css` | tokens (light/dark) and class components |
| `doc.js` | core behaviours, labels (`#doc-labels` overrides), icons, and the `<doc-*>` component loader |
| `components/` | one custom element per file; the file header is its attribute reference |
| `vendor/` | pinned libraries, listed with URL, license and sha256 in `vendor/manifest.json` |
| `bin/` | `doc-name.sh`, `doc-move.py`, `verify.py`, `vendor-fetch.py`, `gallery-check.sh` |

Libraries must be classic UMD/IIFE builds (ES modules and `fetch` fail over `file://`) under a permissive license.
Add one to `vendor/manifest.json`, run `bin/vendor-fetch.py --pin`, and register it in the `LIBS` table of `doc.js`.

## Checks and releases

`.github/workflows/ci.yml` runs on every push:

1. `bin/verify.py --kit` — the kit is English-only
2. `bin/vendor-fetch.py` — every vendored file matches its pinned sha256
3. `node --check` on every script
4. `bin/gallery-check.sh` — the gallery renders in headless Chrome and every kind of component drew

A push to `main` that passes is tagged `v0.1.<run>`, released on GitHub, and requested once from jsDelivr so the
CDN copy is ready. Versions stay at 0.x while nothing depends on the kit publicly: any release may change markup.
