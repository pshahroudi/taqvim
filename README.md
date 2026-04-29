# Taqvim

Taqvim is a lightweight Persian/Jalali calendar Chrome extension. It is built as a fast daily reference: a compact month grid, selected-day details, Tehran time/date, local holiday markers, a date converter, theme settings, and a toolbar badge.

## What It Does

- Shows the current Jalali month with Persian dates as the primary view.
- Shows Gregorian dates as secondary labels and optional Hijri dates in details.
- Uses local JSON holiday data only. No external APIs, Google login, or Google Calendar sync.
- Lets you choose theme, numerals, week start, holiday layers, weekend highlighting, and whether the popup opens to today or restores the last viewed date.
- Shows the toolbar badge using the Tehran Jalali date.

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

```powershell
npm run smoke
```

The smoke test checks holiday JSON shape and duplicate IDs, manifest/icon references, important JavaScript syntax, and Jalali conversion sanity cases.

## Clean Release Zip

Create the Chrome Web Store zip from a clean copy of the extension files, excluding development files and OS junk. One simple PowerShell option from the project root:

```powershell
$release = "dist/taqvim-release"
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $release | Out-Null
Copy-Item manifest.json,README.md -Destination $release
Copy-Item assets,background,options,popup,src -Destination $release -Recurse
Compress-Archive -Path "$release/*" -DestinationPath "dist/taqvim-chrome-web-store.zip" -Force
```

Do not zip `.git`, `node_modules`, `scripts`, `package.json`, development notes, test files, `.DS_Store`, `Thumbs.db`, or other OS-generated files.

## Current Limitations

- Holiday data is bundled locally and should be reviewed before publishing if completeness matters.
- Islamic dates can shift by official moon sighting, so local calculated dates may differ from official announcements.
- Taqvim does not include Google Calendar sync, Google login, reminders, or scheduling features.
