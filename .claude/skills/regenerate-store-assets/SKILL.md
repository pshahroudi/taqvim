---
name: regenerate-store-assets
description: Regenerate Taqvim's icons, promotional tiles, and the five Chrome Web Store screenshots from the sources in design/ and the real popup/options pages, using headless Chrome via npm run assets:render and npm run assets:capture. Use after any change to popup or options UI (screenshots), to the SVG artwork in design/ (icons and promos), when the smoke test complains about PNG dimensions or alpha, or when the store listing needs fresh media.
---

# Regenerate store assets

Artwork is vector-first: PNGs are outputs, sources live in `design/`, and
both are committed. The scripts arrived with 0.1.4 (2026-07-16) and need a
local Google Chrome — nothing is installed from npm (there is no
`node_modules`, and none is wanted).

## Two commands, two triggers

```bash
npm run assets:render     # design/ SVG + HTML → assets/icons/*.png, store tiles
npm run assets:capture    # real popup/options → store-assets/screenshots/*.png
npm run assets            # both
```

**Changed the icon or promo SVGs** (`design/icons/*.svg`,
`design/icons/render-*.html`, `design/store/*.svg`) → `assets:render`.
`scripts/render-brand-assets.mjs` renders: 16 and 32 from
`render-toolbar.html` (the simplified optical variant), 48 from
`render-icon.html`, 128 from `taqvim-icon.svg` (keeps the store's 16 px
transparent padding), `promo-small` → 440x280, `promo-marquee` → 1400x560,
then copies `icon128.png` to `store-assets/taqvim-store-icon-128.png`.

**Changed anything the user sees** in `popup/` or `options/` (HTML, CSS, JS,
data, font) → `assets:capture`. `scripts/capture-store-assets.mjs` launches
Chrome `--headless=new` with `--remote-debugging-pipe`, a throwaway
`--user-data-dir`, a 1280x800 window, opens `popup/popup.html` and
`options/options.html` as `file://` URLs, and injects a `chrome.*` shim
(in-memory `storage.sync`/`local`, `runtime.getManifest` with the real
version, `runtime.getURL` resolving to the repo) so the pages run outside an
extension. It captures, in order: 01 light calendar, 02 dark calendar, 03
converter, 04 date picker, 05 settings, and refuses any frame that is not
exactly 1280x800.

## Things that bite

- **Screenshots use the live date.** Nothing pins "today", so every capture
  shows the day it was run and the PNGs differ on each regeneration even with
  no UI change (`5ce17e9` on 2026-07-16 rewrote three of them for a
  one-attribute fix). Regenerate all five together, once, at the end of a UI
  change — not per commit — and expect a binary diff.
- **Chrome discovery**: `CHROME_PATH` first, then
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS,
  `Program Files` paths on Windows, `/usr/bin/google-chrome[-stable]` or
  `/usr/bin/chromium` on Linux; otherwise
  `Google Chrome was not found. Set CHROME_PATH and retry.` CI does not run
  these scripts — only `npm run check` and `npm run package`.
- The capture also **fails on an invalid `pattern` attribute** in the popup
  (it evaluates every `input[pattern]`); that is the guard added after the
  hyphen-in-class exception. A capture failure after an HTML edit is usually
  that, not Chrome.
- The smoke test asserts every icon is square at 16/32/48/128 with an alpha
  channel (PNG colour type 6) and every store PNG has its exact size
  (`expectedStoreAssets` in `scripts/smoke-test.mjs`). `npm run package`
  re-checks the icons. Run `npm run smoke` after regenerating.
- `design/` and `store-assets/` are **never in the zip**; the four
  `assets/icons/*.png` are. `.gitignore` lists `design/previews/`, but no
  script writes there (grep 2026-09-13) — it is a leftover, not a step.

## After regenerating

1. `npm run smoke` — dimensions and alpha.
2. Look at the five screenshots; they are what the store shows and no test
   reads their content.
3. Reload the unpacked extension and check the toolbar badge (navy
   `#173A70`, white text) still reads over the icon's quiet lower-right.
4. Upload changed files per `store-assets/README.md`; the listing is not
   updated by publishing a new zip.
