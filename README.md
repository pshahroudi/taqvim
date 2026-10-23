# Taqvim

Taqvim is a lightweight Persian/Jalali calendar Chrome extension. It is built as a fast daily reference: a compact month grid, selected-day details, Tehran time/date, local holiday markers, a date converter, theme settings, and a toolbar badge.

- **Install:** [Taqvim on the Chrome Web Store](https://chromewebstore.google.com/detail/taqvim/chfmbjcjehmdkcgfmfpdhmipgfaljlbi)
- **How it was built:** [the case study on shahroudi.us](https://shahroudi.us/work/taqvim/)

Plain JavaScript ES modules, Manifest V3, no bundler and no dependencies. It makes no network requests and asks for two permissions, `storage` and `alarms`. Tests, a smoke check and the release package run in GitHub Actions on every push.

## What It Does

- Shows the current Jalali month with Persian dates as the primary view.
- Shows Gregorian dates as secondary labels and optional Hijri dates in details.
- Uses bundled holiday data and fonts only. It makes no runtime requests to external APIs and does not require a Taqvim account.
- Lets you choose theme, numerals, week start, holiday layers, weekend highlighting, and whether the popup opens to today or restores the last viewed date.
- Shows the current Tehran time and date in a dedicated popup card.
- Uses the computer's local date for Today, calendar highlighting, and the toolbar badge.
- Shows selected-day details and conversions for the date selected in the calendar.

## Load Unpacked In Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this project folder.
5. Pin Taqvim from the Chrome toolbar if you want the badge visible.

## Manual QA

- Open the popup and check month navigation, day selection, Go Today, mini date picker, theme button, and settings button.
- Open the Convert tab and try Jalali, Gregorian, and Hijri source dates.
- Open the options page and toggle each setting. You should see “Saved”.
- Turn off **Show holidays** and confirm the holiday category checkboxes are visually disabled without losing their stored values.
- Click **Reset to defaults** and confirm controls update without a page refresh.
- Reload the extension in `chrome://extensions` and confirm the toolbar badge appears and the popup has no console errors.

## Smoke Test

If Node.js is available:

```bash
npm run smoke
```

The smoke test checks holiday JSON shape and duplicate IDs, manifest/icon dimensions and alpha channels, store-asset dimensions, important JavaScript syntax, and Jalali conversion sanity cases.

Run the complete test suite with:

```bash
npm test
```

## Holiday Data

Taqvim includes a year-specific official holiday calendar for Solar Hijri year 1405. It is sourced from the Calendar Council of the Institute of Geophysics, University of Tehran:

<https://calendar.ut.ac.ir/documents/2139738/7092644/Calendar-1405.pdf>

When a selected year does not have a bundled verified calendar, Taqvim falls back to recurring fixed dates and calculated Hijri dates. Calculated lunar dates can differ from official announcements.

## Clean Release Zip

Create a validated Chrome Web Store archive with:

```bash
npm run package
```

The release script verifies manifest/package version consistency, required icons and fonts, and the absence of remote runtime CSS or CSP origins. It writes `dist/taqvim-<version>.zip` from an explicit production allowlist, excluding development scripts, tests, repository metadata, and OS-generated files.

The GitHub Actions quality workflow runs the complete checks, builds the same archive, and uploads it as a workflow artifact on every push and pull request.

## Visual Assets

Taqvim uses a vector-first icon system with separate large and toolbar artwork. The 128px icon keeps the Chrome Web Store's recommended 16px transparent padding, while the 16px and 32px exports use a simplified optical variant. Popup controls use inline SVG instead of platform-dependent Unicode symbols.

Regenerate the extension icons, store icon, and promotional tiles with:

```bash
npm run assets:render
```

Regenerate the five Chrome Web Store screenshots from the real popup and options interfaces with:

```bash
npm run assets:capture
```

Run both steps with `npm run assets`. Chrome can be supplied with the `CHROME_PATH` environment variable when it is not installed in a standard location. Editable sources live in `design/`; upload-ready listing media lives in `store-assets/`. Neither folder is included in the extension ZIP.

## Current Limitations

- The verified official dataset currently covers Solar Hijri year 1405; other years use recurring and calculated fallback data.
- Calculated Islamic dates can shift based on official moon sighting announcements.
- Taqvim does not include Google Calendar sync, Google login, reminders, or scheduling features.

## License

The code is under the [MIT License](LICENSE). The bundled Vazirmatn font is under the SIL Open Font License; see [`assets/fonts/OFL-Vazirmatn.txt`](assets/fonts/OFL-Vazirmatn.txt).
