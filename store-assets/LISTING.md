# Store listing text

The listing for the Chrome Web Store and Microsoft Edge Add-ons, kept here so
both stores say the same thing and every claim can be checked against the
code. Change the code and this file together.

The name ("Taqvim") and the short description come from `manifest.json` and
cannot be edited in either dashboard; upload a new package to change them.

## Description

Use for both stores. Edge requires 250 to 10,000 characters.

```text
Taqvim is a Persian (Jalali) calendar for your browser toolbar.

Open it to see the current Jalali month, with Gregorian dates as secondary labels and, if you want them, Hijri dates in the day details. Select any day to see its details and its date in the other calendars.

Holidays: Iranian public holidays, cultural occasions and Islamic dates, each as its own layer that you can turn on or off. For Solar Hijri year 1405 Taqvim carries the official calendar published by the Calendar Council of the Institute of Geophysics, University of Tehran. Other years use recurring fixed dates and calculated Hijri dates, which can differ from official moon-sighting announcements.

Convert: change a date between Jalali, Gregorian and Hijri, with a copy button for each result.

Tehran time: a card with the current time and date in Tehran, which you can hide.

Toolbar badge: shows today's Jalali day, using your computer's local date, and refreshes at midnight.

Settings: light, dark or system theme; small, medium or large text; Persian or Latin numerals; a week that starts on Saturday, Sunday or Monday; weekend highlighting; and whether the popup opens on today or on the last month you viewed.

Private by design: no account, no analytics and no network requests. The holiday data and the font ship inside the extension, and its content security policy refuses requests to any server. It asks for two permissions only: storage, for your settings, and alarms, to refresh the badge at midnight.

The interface is mostly in Persian and reads right to left.

Source code (MIT): https://github.com/pshahroudi/taqvim
```

## Fields

| Field | Value |
|---|---|
| Category | Productivity |
| Website / Homepage URL | https://shahroudi.us/work/taqvim/ |
| Support | https://github.com/pshahroudi/taqvim/issues |
| Language | English listing; the interface is mostly Persian |

## Privacy

| Field | Value |
|---|---|
| Single purpose | Shows the Persian (Jalali) calendar in a toolbar popup, with Iranian holidays and conversion between Jalali, Gregorian and Hijri dates. |
| `storage` | Saves the user's settings (theme, text size, numerals, week start, holiday layers, Tehran card, opening behaviour) and the last month viewed. Nothing leaves the browser except through the browser's own settings sync. |
| `alarms` | One alarm at local midnight refreshes the toolbar badge to the new day. |
| Remote code | No. Manifest V3; every script ships in the package, and the policy is `script-src 'self'`. |
| Data collected | None. |
| Privacy policy URL | Not required: the extension collects no user data. |

## Search terms (Edge)

Edge allows at most 7 terms, 30 characters each, 21 words in total. Seven terms, 13 words:

`persian calendar`, `jalali calendar`, `shamsi calendar`, `solar hijri`, `iran holidays`, `date converter`, `تقویم`

## Notes for certification (Edge)

```text
No account or setup is needed. Click the toolbar icon to open the popup: the month grid, the Today button, the date picker and the Convert tab (Jalali, Gregorian and Hijri). Right-click the icon and choose Extension options for the settings page; each change shows "Saved". The interface is mostly in Persian and right to left. The toolbar badge shows today's Jalali day in the computer's local time. The extension makes no network requests and uses only the storage and alarms permissions.
```

## Images

Upload in this order. All are in `store-assets/`.

| Slot | File | Size |
|---|---|---|
| Extension logo (Edge) | `taqvim-store-logo-300.png` | 300x300 |
| Store icon (Chrome) | `taqvim-store-icon-128.png` | 128x128 |
| Small promotional tile | `taqvim-small-promo-440x280.png` | 440x280 |
| Large promotional tile / marquee | `taqvim-marquee-1400x560.png` | 1400x560 |
| Screenshots | `screenshots/01` to `05` | 1280x800 each |

## Before the first Edge submission (Pourya)

1. Register as an Edge extension developer in Partner Center (free for individuals; sign-in and identity check are yours).
2. Create a new extension and upload `dist/taqvim-<version>.zip` from `npm run package`.
3. Fill in the fields above, then submit. Microsoft says certification takes up to seven business days.
