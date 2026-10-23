# CLAUDE.md

Guidance for Claude Code in this repository. Taqvim is a Manifest V3 Chrome
extension: a Persian/Jalali calendar with bundled holiday JSON, no network,
no accounts. Current version 0.1.6 (manifest and package.json must agree).

## Skills

Load the matching skill before starting; each is grounded in this tree and
carries the line numbers, commands and traps:

- `release-extension` — version bump, release notes, `npm run package`, CI, PR, Chrome Web Store checklist. Also explains why the `npm test` glob must stay unquoted.
- `holiday-data-update` — the four `src/data` files, the record contract, verified-year precedence, the yearly 1406 refresh. Script: `list-holidays.mjs`.
- `jalali-date-math` — `src/calendar`, supported range, leap years, noon pinning, Hijri asymmetry, badge vs Tehran time. Script: `convert-date.mjs`.
- `regenerate-store-assets` — icons, promo tiles and the five screenshots via headless Chrome.
- `add-user-setting` — the `storage.js` funnel and every other place a setting must be wired.

## Commands

```bash
npm run smoke                      # scripts/smoke-test.mjs: data contract, manifest, icons, DOM ids, syntax
npm test                           # node --test tests/*.test.mjs: 18 node:test cases, passes on Node 20 and 22
npm run test:browser               # scripts/browser-test.mjs: loads the extension in headless Chrome over CDP
npm run package                    # validated dist/taqvim-<version>.zip from an allowlist
npm run assets                     # regenerate icons + store screenshots (needs local Chrome)
```

No bundler, no dependencies, no `node_modules`: Chrome loads the ES modules
in `src/`, `popup/`, `options/` and `background/` directly. Edit, then reload
in `chrome://extensions` (Developer mode → Load unpacked → this folder).
CI (`.github/workflows/quality.yml`) runs smoke + tests + package on Node 20
for every push and PR, rebuilds the zip to prove it is reproducible, and runs
the browser test on the unzipped package. Pushing tag `v<version>` runs
`.github/workflows/release.yml`, which publishes the CI-built zip and its
sha256 as a GitHub Release (first used for v0.1.6).

## Architecture

Three entry points share `src/`:

| Entry | Owns |
|---|---|
| `popup/popup.js` (~1400 lines) | Month grid, day details, Tehran clock, converter tab, mini date picker |
| `options/options.js` | Settings form only |
| `background/service-worker.js` | Toolbar badge + one-shot midnight refresh alarm |

`src/calendar/` is pure conversion math and holiday matching, `src/ui/`
settings/theme/font/badge, `src/utils/` formatting and time zones,
`src/data/` the holiday JSON.

**Settings** are flat keys in `chrome.storage.sync`; `src/ui/storage.js` is
the only reader and normalizes everything against `DEFAULT_SETTINGS` (a legacy
nested `settings` object is migrated away on read). Popup and options both
listen on `chrome.storage.onChanged` and re-read. The last-viewed month is
separate, in `chrome.storage.local` under `taqvimLastView`.

**Calendar**: `jalali.js` is the jalaali-js algorithm, Jalali years -61..3177,
`jalCal` throws outside that and only `convertDate()` catches it. Every
`Date` is built at 12:00 via `createLocalDate`/`createDateAtNoon` — never a
bare `new Date(y, m, d)`. Hijri display is Intl's `islamic` calendar; the
reverse conversion scans ±45 days until Intl agrees.

**Holidays**: three recurring files (`holidays-ir`, `-cultural`, `-islamic`)
plus a verified per-year file (`holidays-official-1405.json`, University of
Tehran calendar). In a verified year the official file replaces the
recurring official list and suppresses the calculated Islamic layer.
The record contract is enforced in `scripts/smoke-test.mjs` and, at runtime,
in `src/calendar/holidays.js` (`isHolidayRecordValid`, which drops silently).

**Popup rendering**: one mutable `state` and a single `render()` that runs
every sub-renderer; mutate state, call `render()`. `popup.js` shadows the
imported `formatNumber`/`formatPersianOrderedDate` with local wrappers that
bake in `usePersianNumerals` — inside `popup.js` use the local names.

**Badge and alarm use local system time** (`new Date()`, `setHours(24,0,5,0)`)
on purpose; only the popup's Tehran card is pinned to `Asia/Tehran`. Do not
move the badge to Tehran time.

## Constraints

- No network, no APIs, no accounts. CSP is `script-src 'self'`; the tests
  reject any `http(s)://` in CSS or the manifest CSP.
- Permissions are exactly `storage` + `alarms`; the smoke test asserts
  `host_permissions` is absent.
- UI strings are Persian and RTL; Latin values sit in `.ltr-text`.
- Work arrives as a branch and a PR, never a commit on `main`. The
  screenshots in `store-assets/` are committed outputs — regenerate them when
  the UI changes, and expect binary diffs.
- The repo is public. Every commit must carry the GitHub noreply address
  (`5138993+pshahroudi@users.noreply.github.com`), never a personal email.
  The local `user.email` is set to it, and GitHub merges use it because the
  account's "Keep my email addresses private" is on (since 2026-10-22; with
  it off, a merge stamps the account's Gmail). Merge with
  `gh pr merge N --squash --delete-branch`, then check
  `git log --format='%ae %ce' -1`.
