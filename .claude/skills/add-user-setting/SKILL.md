---
name: add-user-setting
description: Add, rename, or remove a user-facing setting in Taqvim (options page toggle, theme, numerals, holiday layer, week start, Tehran card) and wire it through the single normalization funnel in src/ui/storage.js, the popup's pre-storage state literal, the options page, the service worker defaults, and the tests. Use whenever a change touches DEFAULT_SETTINGS, normalizeSettings, chrome.storage.sync keys, options.html controls, or a "setting isn't saving / isn't applied / reset to default" bug.
---

# Add a user setting

Settings are **flat keys in `chrome.storage.sync`** (not nested), and
`src/ui/storage.js` is the sole authority: every read goes through
`normalizeSettings()`, which coerces each field against its allowed values
and falls back to `DEFAULT_SETTINGS`. A legacy nested `{settings: {...}}`
shape is detected by `needsMigration` and rewritten flat on the next read.
Nothing else may read `chrome.storage.sync` for settings; since 0.1.6 the
badge and the service worker go through `getSettings()` too, so there is no
exception left.

The reference change is the 0.1.6 `weekendDays` setting (commit `a5fe6d0`,
a select with two allowed values). It touches storage.js, options.html,
options.js, the popup renderer and tests/settings.test.mjs.

## The places (all must change, in this order)

1. **`src/ui/storage.js`** — two spots:
   - `DEFAULT_SETTINGS` (top of the file): the default value.
   - `normalizeSettings()`: coercion — `toBooleanSetting(source.x, DEFAULT_SETTINGS.x)`
     for booleans, or an allow-list ternary like `theme`/`weekStart`/`weekendDays`.
   `toStoragePayload()` and `needsMigration()` derive their key lists from
   `Object.keys(DEFAULT_SETTINGS)` (since 0.1.6), so a new key is persisted,
   and written for existing installs on their next read, with no further edit.
   Nested objects (like `holidayTypes`) also need `mergeSettings` to deep-merge
   the patch, or `saveSettingsPatch({holidayTypes: {cultural: false}})` wipes
   the siblings — `tests/settings.test.mjs` asserts this for holidayTypes.
2. **`popup/popup.js`** — the initial `state.settings` is
   `normalizeSettings()`, so the popup renders defaults before storage
   resolves with no edit. Use the key in the renderer: `showTehranTime`
   toggles `.hidden` in `updateTehranTimeVisibility`, `weekendDays` feeds
   `isWeeklyHoliday`.
3. **`options/options.html`** — the control, with matching `id` and `name`.
4. **`options/options.js`** — three spots: `controls` (one
   `document.getElementById` per key), `setValueIfPresent(controls.x, settings.x)`
   in `applyControls`, and a `bindCheckbox`/`bindSelect` binding in `init`
   that calls `savePatch({x: value})`. `savePatch` shows "Saved"; the
   `chrome.storage.onChanged` listener re-fills every control, so
   an open popup and the options page stay in sync without extra code.
5. **`background/service-worker.js`** `ensureDefaultSettings` is a
   `getSettings()` call, so it needs no edit — but if the badge should react to the
   new key, add it to the `relevant` array in the `onChanged` handler (only
   `usePersianNumerals` today).
6. **Tests** — `tests/settings.test.mjs`: the first test feeds invalid values
   and expects defaults; add yours. The migration test asserts
   `stored.fontSize === "medium"` after migration; a new key with a default
   is the same shape of assertion.
7. **Screenshots** — the settings page is screenshot 05; regenerate
   (`regenerate-store-assets`) if the options page changed visibly.

## Verify

```bash
npm run smoke                      # popup getElementById ids vs popup.html, JS parses
npm test                           # all 18 tests, including the settings + holidays tests
npm run test:browser               # the real extension in headless Chrome
```

Then load unpacked, open options, toggle the control (expect "Saved"), open
the popup and confirm it applied live, click **Reset to defaults** and
confirm the control snaps back without a reload. The README "Manual QA"
section is the checklist. The capture script's `chrome.storage` shim starts
empty, so defaults are what the screenshots show.

## Do not

- Read `chrome.storage.sync.get("x")` from a new place; go through
  `getSettings()` / `normalizeSettings()`.
- Store the last-viewed month here: that lives in `chrome.storage.local`
  under `taqvimLastView`, written only when `autoJumpToTodayOnOpen` is off.
- Add a permission. `storage` and `alarms` are the whole list, asserted by
  the smoke test and advertised in the store listing.
