---
name: release-extension
description: Cut a Taqvim release — bump the version in manifest.json AND package.json, write RELEASE-NOTES-<version>.md, run the gate, build dist/taqvim-<version>.zip with npm run package, open the PR, and know exactly what to check before uploading to the Chrome Web Store. Use whenever a version bump, release, packaging, zip, store upload, or "ship it" comes up, and when npm test or npm run check passes on one Node version but fails on the other (this Mac runs Node 22, CI runs Node 20).
---

# Release Taqvim

Taqvim is a Manifest V3 extension with no build step: the zip is the source
tree, filtered. The release path has been scripted since 0.1.4 (commit
`3ec2390`, 2026-07-16); before that the README carried a PowerShell
`Compress-Archive` snippet, which is gone. Do not hand-zip.

## Version numbers: two files, and commit messages lie

The version lives in **two places that must match**: `manifest.json` line 4
and `package.json` line 3. Both `scripts/smoke-test.mjs` (`checkManifest`)
and `scripts/package-extension.mjs` (`validateRelease`) assert equality and
fail the run otherwise. The options page shows the manifest version at runtime
(`options/options.js:99`, `chrome.runtime.getManifest().version`), so nothing
else hard-codes it.

The shipped sequence is `0.1.0 → 0.1.1 → 0.1.2 → 0.1.3 → 0.1.4` (every
`manifest.json` change in `git log -p`). Commit messages call the same
releases "1.1", "2.0", "1.3" — those are Pourya's marketing numbers, not the
manifest. When he says "1.3 was just released" the manifest says `0.1.3`.
Bump the manifest form; ask only if the jump is bigger than a patch.

**Tags start at v0.1.6.** After Pourya merges the release PR, tag the merge
commit `v<version>` and push the tag (with his approval): that runs
`.github/workflows/release.yml`, which checks the tag matches the manifest,
runs the gate, builds the zip and publishes it with its `.sha256` as a GitHub
Release whose notes are `RELEASE-NOTES-<version>.md`. Upload that release's
zip to the stores, so the store package and the published hash are the same
bytes. Earlier releases (0.1.0 to 0.1.5) have no tags.

## Steps

1. **Start from a fresh `origin/main`.** Check `git status` and
   `git log --oneline -1 origin/main` before touching a version; a stale
   checkout has happened here before.
2. **Branch.** Never commit to `main`. Stop at the PR URL; Pourya merges.
3. **Bump** `manifest.json` and `package.json` to the same string.
4. **Write `RELEASE-NOTES-<version>.md`** at the repo root, following
   `RELEASE-NOTES-0.1.4.md`: Highlights, Permissions and privacy (it is a
   selling point that permissions are still only `storage` + `alarms`),
   Deployment. The old notes file stays; do not delete it.
5. **Refresh text that names a version or a dataset year**: README.md
   (Holiday Data and Current Limitations sections, lines 48-52 and 86-90),
   `options/options.html:238` (the "Holiday sources" card names year 1405).
6. **If any UI changed, regenerate the store screenshots** — see the
   `regenerate-store-assets` skill. The screenshots are committed and the
   smoke test asserts their dimensions, but not their content; stale
   screenshots ship silently.
7. **Run the gate** (below). Then `npm run package`.
8. **Push the branch and open the PR.** CI (`.github/workflows/quality.yml`)
   runs `npm run check` and `npm run package` on `ubuntu-latest` with Node 20
   and uploads the zip as workflow artifact `taqvim-<sha>`. It runs on every
   push and PR; it was green on `main` on 2026-09-13 (run 34781505511, 21 s).
9. After Pourya merges: build the zip from `main` (or download the CI
   artifact of the merge commit — same bytes, same allowlist) and upload.

## The gate

```bash
npm run check          # = npm run smoke && npm test
```

It passes on this Mac (Node 22.23.1) and in CI (Node 20): "Smoke checks
passed.", then 18 tests in about 300 ms. `npm run test:browser` loads the
extension in headless Chrome (local Chrome needed); CI runs it on the unzipped
package. A green CI run is the authoritative
gate; the local run is to fail fast.

**Keep the `npm test` glob unquoted.** `package.json` runs
`node --test tests/*.test.mjs`, and npm's shell (`sh`) expands the glob into
a list of files before Node starts. The two tempting edits each break one
version (checked 2026-09-14 on Node 20.18.0 and 22.23.1):

- Quoting it, as the Node docs suggest, leaves the glob to Node, and Node 20
  does not expand globs: `Could not find '.../tests/*.test.mjs'`, exit 1.
- A bare directory, `node --test tests` (the old script), works on Node 20,
  but Node 22 reads the argument as a glob that matches the folder itself and
  fails with `Cannot find module '.../tests'`.

On Windows npm runs scripts through cmd.exe, which does not expand globs, so
Node gets the pattern as typed, the quoted case above: fine on Node 22, fails
on Node 20 (inferred, not run on Windows). Bare `node --test` with no
argument also picks up `scripts/smoke-test.mjs` and `scripts/browser-test.mjs`
through its default `*-test.mjs` pattern, so do not use it.

What the smoke test proves (`scripts/smoke-test.mjs`): holiday JSON contract
and no duplicate ids across all four data files; three Jalali conversion
anchors; manifest is MV3 with `storage`+`alarms` and **no `host_permissions`**;
versions match; CSP has no `http(s)://`; the four icons exist at 16/32/48/128
with an alpha channel; the eight store PNGs have the right dimensions; every
`getElementById` in `popup.js` has a matching id in `popup.html`; and
`node --check` parses the 19 important JS files.

## What `npm run package` does

`scripts/package-extension.mjs` writes `dist/taqvim-<manifest version>.zip`
— it **deletes `dist/` first**, so anything else there is gone. It zips an
explicit allowlist and nothing else: `manifest.json`, `README.md`, `assets/`,
`background/`, `options/`, `popup/`, `src/`, skipping any dotfile. At 0.1.4
that was 33 files, 169,198 bytes. Every entry is stamped 1980-01-01 00:00, so
the archive is reproducible, and `dist/taqvim-<version>.zip.sha256` is written
beside it; CI rebuilds after touching every file and fails if the hash moves. `scripts/`, `tests/`, `design/`,
`store-assets/`, `package.json`, release notes and `.github/` never enter.

Before writing it re-validates: MV3, version match, `assets/fonts/Vazirmatn.woff2`
plus its `OFL-Vazirmatn.txt` licence present, each manifest icon present and
square at its declared size with RGBA, no `http(s)://` in any bundled `.css`,
no remote origin in the CSP. `dist/` is gitignored.

## Before the Chrome Web Store upload

- **Unzip and load it.** Extract `dist/taqvim-<version>.zip` to a temp folder
  and load *that* unpacked in `chrome://extensions` — not the repo. This is
  the only check that the allowlist still covers everything the popup imports.
  Then walk the README "Manual QA" list: month navigation, Go Today, date
  picker, theme button, Convert tab with all three sources, every options
  toggle shows "Saved", Reset to defaults, badge shows today's Jalali day.
- The store rejects a version that is not greater than the published one, so
  the bump is not optional even for a screenshot-only change.
- Listing media is separate from the zip: `store-assets/README.md` lists the
  128 icon, the required 440x280 tile, the optional 1400x560 marquee and the
  five 1280x800 screenshots, in filename order. Re-upload only what changed.
- Permissions justification on the dashboard: `storage` (settings sync),
  `alarms` (one-shot midnight badge refresh). No host permissions, no remote
  code — the CSP is `script-src 'self'` and the smoke test keeps it so.
- The manifest `description` ends with "By Pourya Shahroudi"; the store name
  is "Taqvim". No account, no analytics, no network calls: say so in the
  privacy section, it is true and tested (`tests/static-quality.test.mjs`).

- The listing's **Homepage URL** (Store listing, Additional fields) is set
  in the dashboard and should be `https://shahroudi.us/work/taqvim/`. The
  manifest's `homepage_url` does not fill it; that key only sets the website
  link on `chrome://extensions`.

## Microsoft Edge Add-ons

The same zip ships to Edge (Partner Center), which runs Chrome MV3 extensions unchanged. The listing text, field values, permission justifications, search terms and certification notes are in `store-assets/LISTING.md`; keep it in step with the code. Edge's extension logo is `store-assets/taqvim-store-logo-300.png`. The store also rejects a version that is not greater than the published one.

## Dashboard access

Nothing in the repo records the developer-dashboard item id or account; ask
Pourya, do not guess a URL.
