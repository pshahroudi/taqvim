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
Release whose notes are `RELEASE-NOTES-<version>.md`. Its second job,
`chrome-web-store`, downloads that release's zip, checks the sha256, uploads
it to the Chrome Web Store and submits it for review, so the store package
and the published hash are the same bytes (see "Chrome Web Store API" below).
Edge is still uploaded by hand from the same release zip. Earlier releases
(0.1.0 to 0.1.5) have no tags; 0.1.6 went to the store by hand.

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
9. After Pourya merges: tag the merge commit and push the tag. The release
   workflow does the GitHub Release and the Chrome Web Store submission; check
   both jobs are green, then `npm run store -- status` shows the new version
   as `PENDING_REVIEW`. Upload the release zip to Edge by hand.

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
`node --check` parses the 20 important JS files.

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

## Chrome Web Store API

`scripts/chrome-web-store.mjs` talks to API v2
(`chromewebstore.googleapis.com`, scope
`https://www.googleapis.com/auth/chromewebstore`). `status` prints the
published and submitted revisions; `publish <zip>` refuses while a submission
is `PENDING_REVIEW`, uploads, polls `fetchStatus` while the upload is
`IN_PROGRESS`, checks the store read the manifest version, then calls
`:publish` with `DEFAULT_PUBLISH` (goes live as soon as review passes). The
enum values are the discovery document's (`SUCCEEDED`, `IN_PROGRESS`, not the
`UPLOAD_`-prefixed names the prose docs use). Item id
`chfmbjcjehmdkcgfmfpdhmipgfaljlbi` is the default; `CWS_PUBLISHER_ID` and
`CWS_ACCESS_TOKEN` come from the environment.

**Auth is a service account, reached keylessly.** The dashboard lets one
service account act for the publisher (Account section). GitHub Actions gets
an OIDC token, `google-github-actions/auth@v3` trades it through a Workload
Identity pool for a short-lived access token of that service account, and
nothing long-lived exists to leak or expire. Do not switch to the OAuth
client + refresh token route: with the consent screen in "Testing", Google
expires refresh tokens after 7 days and the release job dies a week later.

The release job runs only when the repository variable `CWS_SERVICE_ACCOUNT`
is set, in the `chrome-web-store` environment, and needs three repository
variables (not secrets; none of them is a credential):

| Variable | Value |
|---|---|
| `CWS_PUBLISHER_ID` | `54dbdafc-c7b2-40b5-a5c8-2d75f6377699` (the id in the dashboard URL) |
| `CWS_SERVICE_ACCOUNT` | `taqvim-publisher@taqvim-publisher.iam.gserviceaccount.com` |
| `CWS_WORKLOAD_IDENTITY_PROVIDER` | `projects/666712701118/locations/global/workloadIdentityPools/github/providers/taqvim` |

All set on 2026-11-09. The Cloud project is `taqvim-publisher` (number
666712701118), owned by Pourya's personal Google account, no billing account; the
GitHub environment `chrome-web-store` accepts `v*` tags only.

How it was set up (`gcloud` signed in as that account; rerun only to
rebuild it):

```bash
gcloud services enable chromewebstore.googleapis.com iamcredentials.googleapis.com sts.googleapis.com
gcloud iam service-accounts create taqvim-publisher --display-name="Taqvim Chrome Web Store publisher"
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc taqvim --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping=google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref \
  --attribute-condition="assertion.repository_id=='1430585695' && assertion.ref.startsWith('refs/tags/v') && assertion.workflow_ref.startsWith('pshahroudi/taqvim/.github/workflows/release.yml@refs/tags/v')"
gcloud iam service-accounts add-iam-policy-binding taqvim-publisher@taqvim-publisher.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/666712701118/locations/global/workloadIdentityPools/github/attribute.repository_id/1430585695"
```

The condition admits only `release.yml` in this repository (matched by id
too, so a fork cannot pass) on a `v*` tag; renaming the repo or the workflow
file breaks the `workflow_ref` clause, so update the provider with it. Two traps from the first setup: on a brand-new
project the pool create returns `IAM_PERMISSION_DENIED` for a minute or two
even for the owner (retry, it is propagation); and owner does NOT include
`iam.serviceAccounts.getAccessToken`, despite the Chrome docs, so the local
status check needed `roles/iam.serviceAccountTokenCreator` on the service
account for that personal account (granted), which also takes minutes to
apply. Then add the service account's email in the
Developer Dashboard's Account section (Chrome blocks every extension,
Claude in Chrome included, on Web Store pages, so Pourya does that click),
and set the three variables with `gh variable set`.

Local status check, as the project owner:

```bash
CWS_PUBLISHER_ID=54dbdafc-c7b2-40b5-a5c8-2d75f6377699 CWS_ACCESS_TOKEN="$(gcloud auth print-access-token \
  --impersonate-service-account=taqvim-publisher@taqvim-publisher.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/chromewebstore)" npm run store -- status
```

## Dashboard access

The dashboard is Pourya's personal Chrome profile ("Browser 1" in Claude in
Chrome), not the La Bouchée profile. Claude cannot read or click it: Chrome
blocks extensions on `chrome.google.com/webstore`, so dashboard steps are his.
