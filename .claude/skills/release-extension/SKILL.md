---
name: release-extension
description: Cut a Taqvim release — bump the version in manifest.json AND package.json, write RELEASE-NOTES-<version>.md, run the gate, build dist/taqvim-<version>.zip with npm run package, open the PR, and know exactly what to check before uploading to the Chrome Web Store. Use whenever a version bump, release, packaging, zip, store upload, or "ship it" comes up, and when npm test or npm run check fails on this Mac (Node 22) even though CI is green.
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

**No git tags exist** (`git tag -l` is empty as of 2026-09-13). Tagging
`v<version>` on the merge commit is a sensible convention to start, but it is
a proposal, not an existing practice — say so.

## Steps

1. **Start from a fresh `origin/main`.** On 2026-09-13 the working checkout
   at `~/workspace/taqvim` sat five commits behind `origin/main` (still at
   0.1.3, with an untracked `CLAUDE.md` and a modified README that would
   conflict on pull). Check `git status` and `git log --oneline -1 origin/main`
   before touching a version.
2. **Branch.** Never commit to `main`; taqvim is not a trading repo, so the
   standing merge authority does not apply — stop at the PR URL. (The one
   grant here, 2026-09-13, covered only the `.claude/settings.json` PR.)
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

## The gate, and the Node 22 trap

```bash
npm run check          # = npm run smoke && npm test
```

**`npm test` fails on this Mac.** `package.json` defines it as
`node --test tests`; Node 20 (CI) accepts a bare directory, Node 21+ treats
positional args as globs, and this Mac runs Node 22.23.1 — so it dies with
`Cannot find module .../tests` and `npm run check` reports failure even when
everything passes. Verified 2026-09-13. Run the pieces yourself:

```bash
npm run smoke                        # scripts/smoke-test.mjs — "Smoke checks passed."
node --test 'tests/*.test.mjs'       # 15 tests, ~200 ms
```

(`node --test` with no argument also works and picks up 16 files because
`scripts/smoke-test.mjs` matches the default `*-test.mjs` pattern.) A green
CI run is the authoritative gate; the local run is to fail fast.

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
that is 33 files, 169,198 bytes. `scripts/`, `tests/`, `design/`,
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

## Dashboard access

Nothing in the repo records the developer-dashboard item id or account; ask
Pourya, do not guess a URL.
