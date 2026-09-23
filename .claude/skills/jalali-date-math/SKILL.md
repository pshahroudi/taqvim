---
name: jalali-date-math
description: Work on Taqvim's calendar arithmetic — Jalali/Gregorian conversion (src/calendar/jalali.js), Hijri (hijri.js), the converter and its validation messages, leap years, month lengths, the supported year range, time-zone and DST pinning, the Tehran clock vs the local badge, Persian numeral parsing — and how to prove a date is right with the tests or the convert-date script. Use for any "wrong date", off-by-one, leap-year, Esfand 30, Hijri mismatch, badge, midnight, or converter bug, and before touching anything under src/calendar or src/utils/dates.js.
---

# Jalali date math

All conversion is pure JavaScript with no dependency; Chrome loads the ES
modules directly. Read the module before changing it — every function below
is small, and most "bugs" reported here are one of the known behaviours.

## Where things live

| Concern | File | Notes |
|---|---|---|
| Jalali ↔ Gregorian | `src/calendar/jalali.js` | jalaali-js algorithm; `BREAKS` table of leap-cycle boundaries |
| Gregorian validation | `src/calendar/gregorian.js` | month lengths, Feb 29 message |
| Hijri | `src/calendar/hijri.js` | Intl-based display, scanned reverse conversion |
| Convert tab | `src/calendar/converter.js` | `convertDate({source, year, month, day})` → `{jalali, gregorian, hijri, date}` or `{error}` |
| Time zones | `src/utils/dates.js` | `Asia/Tehran` parts, `createDateAtNoon` |
| Digits | `src/utils/numerals.js`, `src/utils/format.js` | Persian/Arabic-Indic parsing and `Intl.NumberFormat` rendering |
| Badge | `src/ui/badge.js` + `background/service-worker.js` | today's Jalali day number |

## Facts that decide most bugs

- **Supported Jalali years are -61 to 3177** (`MIN_JALALI_YEAR = BREAKS[0]`,
  `MAX_JALALI_YEAR = 3178 - 1`). `jalCal` **throws**
  `"Jalali year out of supported range."` outside it. `convertDate` is the
  only caller that catches it (`converter.js:105-110`) — and it matches on the
  message text, so do not reword that string. New call sites must guard with
  `isSupportedJalaliYear` first; `previousJalaliMonth(-61, 1)` happily
  returns year -62, which then throws on the next `toGregorian`.
- **Leap year** = `jalCal(jy).leap === 0` (yes, zero). 1399 and 1403 are
  leap; 1400 and 1404 are not. Months 1-6 have 31 days, 7-11 have 30, Esfand
  has 29 or 30. "Esfand 30 is only valid in Jalali leap years." is the
  converter's message for 1404/12/30.
- **Anchors the smoke test pins**: 2026-04-29 = 1405/2/9; 2025-03-20 =
  1403/12/30; 2026-03-20 = 1404/12/29 (so Nowruz 1405 = 2026-03-21).
- **Every Date is pinned to 12:00 local.** `createLocalDate` (`jalali.js:165`)
  and `createDateAtNoon` (`dates.js:26`) are two identical implementations of
  `new Date(y, m-1, d, 12, 0, 0, 0)`. A bare `new Date(y, m, d)` is midnight,
  and a DST transition can push it to 23:00 the day before. Never construct
  one.
- **Hijri is asymmetric on purpose.** Display uses `Intl.DateTimeFormat` with
  `en-US-u-ca-islamic-nu-latn`; `hijriToGregorian` computes a civil
  (tabular) approximation, then scans ±45 days until `getHijriParts` agrees,
  so the round trip always matches what is rendered. Intl's `islamic`
  calendar is an astronomical estimate: it differs from Iran's announced
  dates by a day at times (1405/01/01 renders as Shawwal 2; officially it was
  Eid al-Fitr, Shawwal 1). That is data, not a math bug — the verified
  holiday file exists for it. `validateHijriDate` accepts day 1-30 in every
  month and the converter reports every Hijri month as 30 days long.
- **The badge is local time; only the Tehran card is Tehran.** The service
  worker sets the badge from `new Date()` and re-arms the one-shot
  `taqvim-midnight-refresh` alarm with `setHours(24, 0, 5, 0)` — local
  midnight + 5 s (`service-worker.js:22-27`). `getNextTehranMidnightTimestamp`
  in `dates.js` is exported and tested but **nothing in the extension calls
  it** (grep 2026-09-13). Do not "fix" the badge to Tehran; README says the
  badge follows the computer's own day.
- Tehran is UTC+3:30 with no DST (abolished 2022); the test fixes
  2026-07-16T20:45Z → Tehran 2026-07-17 00:15 and next midnight
  2026-07-17T20:30:05Z.
- **Numerals**: `parseIntegerInput` accepts Latin, Persian (۰-۹) and
  Arabic-Indic (٠-٩) digits and both `-` and `−` (U+2212). The HTML `pattern`
  attributes must write those as `[-−]` — a raw hyphen inside the
  class is invalid under pattern v-mode and threw in Chrome (commit
  `5ce17e9`, "Fix exception", 2026-07-16). The smoke test and the screenshot
  capture both assert it now.

## Prove it

```bash
node .claude/skills/jalali-date-math/scripts/convert-date.mjs jalali 1403 12 30
node .claude/skills/jalali-date-math/scripts/convert-date.mjs gregorian 2026 3 20
node .claude/skills/jalali-date-math/scripts/convert-date.mjs hijri 1447 10 1
```

Runs the real `convertDate`, prints all three calendars, weekday, leap
status and month length, and the exact user-facing error for invalid input
(exit 1). Works on this Mac's Node 22; the Hijri line needs full ICU, which
stock Node has.

Then the suite:

```bash
npm run smoke
npm test                           # all 15 tests, including tests/calendar.test.mjs
```

`tests/calendar.test.mjs` round-trips **every day from 1900 to 2100**
(73,414 days, asserted count) and Hijri every 17th day 2020-2030 (237). If
you change `BREAKS`, `jalCal`, `g2d`/`d2g` or the Hijri scan, that suite is
the proof; add the reported date as a new anchor in
`scripts/smoke-test.mjs` `checkJalaliConversions` so it stays pinned.

## When the report is "the popup shows the wrong day"

Before touching math: is it the holiday layer (see `holiday-data-update`),
the badge (local time, above), a month-boundary render, or the settings
`weekStart`? The grid, details, and converter all derive from `state.selected`
in `popup/popup.js`; `render()` re-renders everything unconditionally, so
mutate state and call `render()` — there is no partial update to miss.
