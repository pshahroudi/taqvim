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
Nothing else may read `chrome.storage.sync` for settings — the one exception
is `badge.js`, which reads only `usePersianNumerals`.

The reference change is commit `5aa87d7` ("show/hide tehran time now"),
which added `showTehranTime`: 6 files, 104 insertions. Follow it.

## The places (all must change, in this order)

1. **`src/ui/storage.js`** — four spots:
   - `DEFAULT_SETTINGS` (line 1-16): the default value.
   - `normalizeSettings()`: coercion — `toBooleanSetting(source.x, DEFAULT_SETTINGS.x)`
     for booleans, or an allow-list ternary like `theme`/`fontSize`/`weekStart`.
   - `toStoragePayload()`: the explicit list of keys written; a key missing
     here is normalized on read but **never persisted**.
   - `needsMigration()` `requiredKeys`: a key missing here means an old
     install keeps the old shape until something else triggers migration.
   Nested objects (like `holidayTypes`) also need `mergeSettings` to deep-merge
   the patch, or `saveSettingsPatch({holidayTypes: {cultural: false}})` wipes
   the siblings — `tests/settings.test.mjs` asserts this for holidayTypes.
2. **`popup/popup.js:163-178`** — the `state.settings` literal duplicates
   `DEFAULT_SETTINGS` on purpose so the popup renders before storage
   resolves; add the key there too. Then use it in the renderer:
   `showTehranTime` toggles `.hidden` on the card at line 281.
3. **`options/options.html`** — the control, with matching `id` and `name`
   (`#showTehranTime` / `input[name='showTehranTime']`, lines 57-58).
4. **`options/options.js`** — three spots: `controls` via `findControl([...])`
   (line 23), `setValueIfPresent(controls.x, settings.x)` in the fill step
   (line 123), and a `bindCheckbox`/select binding that calls
   `savePatch({x: value})` (line 188). `savePatch` shows "Saved"; the
   `chrome.storage.onChanged` listener (line 235) re-fills every control, so
   an open popup and the options page stay in sync without extra code.
5. **`background/service-worker.js`** `ensureDefaultSettings` derives its key
   list from `Object.keys(DEFAULT_SETTINGS)` and writes defaults when any is
   `undefined`, so it needs no edit — but if the badge should react to the
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
node --test 'tests/*.test.mjs'     # settings + holidays tests (npm test is broken on Node 22)
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
