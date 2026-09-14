---
name: holiday-data-update
description: Edit, add, verify, or refresh Taqvim's bundled holiday data in src/data — the recurring officialIran/cultural/islamic files and the year-specific official file (holidays-official-1405.json from the University of Tehran calendar). Use for the yearly official-calendar refresh (adding 1406), fixing a wrong or missing holiday, understanding why a day shows or hides a holiday, the record contract, and checking what a given Jalali date renders. Any change under src/data or to src/calendar/holidays.js starts here.
---

# Holiday data

Taqvim ships **no network calls**: every holiday comes from four JSON files in
`src/data/`, fetched at popup start via `chrome.runtime.getURL`
(`popup/popup.js:343-372`, `loadHolidayData`). Get the file right and the
popup renders it; get it wrong and the record is **silently dropped** with a
`console.warn` (`isHolidayRecordValid` in `src/calendar/holidays.js`).

## The four files (counts as of 0.1.4)

| File | Shape | Category | Records | Calendar |
|---|---|---|---|---|
| `holidays-ir.json` | bare array | `officialIran` | 10, all `isHoliday: true` | jalali |
| `holidays-cultural.json` | bare array | `cultural` | 8, all observances | jalali |
| `holidays-islamic.json` | bare array | `islamic` | 17, all holidays | hijri |
| `holidays-official-1405.json` | `{schemaVersion, source, holidays}` | `officialIran` | 29 | jalali, each with `year: 1405` |

The first three are **recurring**: month/day only, no year, matched every
year. The official file is **verified for one year**: every record carries
`year` and `sourceId`, and the whole file is discarded if its `source` block
is malformed (`normalizeOfficialYearDataset`).

## Record contract (enforced twice — update both)

```json
{ "id": "nowruz-1", "calendar": "jalali", "month": 1, "day": 1,
  "title": "نوروز", "category": "officialIran", "isHoliday": true,
  "description": "…", "note": "…" }
```

- `id` string, **unique across all four files** (smoke test rejects a
  duplicate anywhere; runtime keeps the first and warns).
- `calendar` is `"jalali"` or `"hijri"`; a hijri record is matched by
  converting the cell's date through `getHijriParts` (Intl `islamic`
  calendar), so it lands on a different Jalali day each year.
- `month` 1-12, `day` 1-31 integers. `title` non-empty. `category` must equal
  the file's category. `isHoliday` boolean: `true` = day off (red), `false` =
  observance (marker only).
- `description` / `note` optional strings. Official-year records have no
  description of their own; see enrichment below.
- Official-year records additionally need integer `year` and `sourceId`
  **equal to `source.id`** — a mismatch drops that one record with a warning.
  `source` needs `id`, `title`, `publisher`, `url` starting `https://`;
  `retrieved` is informational (`2026-07-16` for 1405).

Validators: `validateHolidayRecord` in `scripts/smoke-test.mjs` (fails the
build) and `isHolidayRecordValid` in `src/calendar/holidays.js` (drops at
runtime). Change the shape in both, and in `tests/holidays.test.mjs`.

## Which records a day gets (`getHolidayRecordsForDate`)

1. `showHolidays` off → nothing.
2. If any verified record has `year === jy` the year is **verified**: the
   `officialIran` layer is the verified file, and the calculated `islamic`
   layer is **suppressed** (unless the user turned `officialIran` off).
   Reason: the official calendar already contains the religious public
   holidays on the days Iran actually observed them; showing the Intl
   calculation too would double them a day apart.
3. Otherwise the year is a **fallback** year: recurring `holidays-ir` +
   `cultural` + calculated `islamic`.

The one-day gap is real, not theoretical: for 1405/01/01 Intl's `islamic`
calendar says Shawwal **2**, while the official calendar puts Eid al-Fitr
(Shawwal 1) on that day. Calculated dates are approximations of moon
sightings; the verified file wins. 1405 also contains Eid al-Fitr **twice**
(Farvardin 1-2 and Esfand 19-20) because two Ramadans fall in one solar year
— that is correct, not a duplicate.

Descriptions: `enrichHolidayRecords` copies `description` onto a verified
record from the recurring record whose id equals the verified id with the
`official-<year>-` prefix stripped (`official-1405-nowruz-1` → `nowruz-1`),
or failing that from a recurring record with the **same title**. So name new
verified ids after their recurring twin, and the test
"verified official dates replace calculated duplicates" (which asserts every
1405/3/14 record has a description) keeps passing.

## See what a date renders

```bash
node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405 3      # one month
node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405 3 14   # one day
node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405        # year, holidays only
```

It loads the four files exactly as `popup.js` does and calls the same
`getHolidayRecordsForDate` with default settings, printing Gregorian and
Intl-Hijri equivalents, category, source and whether a description resolved.
`1405` prints 29 HOLIDAY lines; `1404 7` shows the fallback path (Mehregan
only, the Islamic layer computed live). For the browser view: load unpacked,
open the popup, use the mini date picker to reach the month, and click the
day — chips and the status line come from the same function.

## Validate

```bash
npm run smoke                      # contract, duplicate ids, source url
node --test 'tests/*.test.mjs'     # NOT `npm test` on Node 22 — see release-extension
```

`tests/holidays.test.mjs` hard-codes: 29 verified records, 1405 verified,
1404 not, publisher matches `/University of Tehran/`, url starts
`https://calendar.ut.ac.ir/`, and 1405/3/14 = Ghadir + Khomeini demise.
Editing the 1405 file changes those numbers; update the test on purpose.

## The yearly refresh (adding 1406)

Only 1405 is bundled (source: Calendar Council, Institute of Geophysics,
University of Tehran, `https://calendar.ut.ac.ir/documents/2139738/7092644/Calendar-1405.pdf`).
The 1406 PDF's URL is not derivable from that path — find it on
calendar.ut.ac.ir and record it in `source.url`. There is no import script;
the 1405 file was transcribed by hand from the PDF.

Every place that knows about one official file — all verified 2026-09-13:

1. `src/data/holidays-official-1406.json` — new file, `source.id`
   `ut-calendar-1406`, ids `official-1406-<recurring-id>`.
2. `popup/popup.js:343-372` — `loadHolidayData` fetches exactly one official
   file and builds `officialSources: [one]`. Fetch the new one, concatenate
   the records into `officialVerified`, push both sources.
   `hasVerifiedOfficialYear` already works per record year, so nothing in
   `holidays.js` changes.
3. `tests/holidays.test.mjs:20-27` — same single-file loader; and the count
   and `hasVerifiedOfficialYear(data, 1404) === false` assertions at 49-59.
4. `scripts/smoke-test.mjs:10-21` — `holidayFiles` list; add an entry with
   `collection: "holidays", requireYear: true`.
5. `README.md:48-52, 86-90` and `options/options.html:238` — the year named
   in prose. `RELEASE-NOTES-<version>.md` — it is a release.
6. Then `list-holidays.mjs 1406` and compare the count to the PDF.

Keep `holidays-islamic.json` as is: it is the fallback for every year without
a file, and it is what users of an unrefreshed build see after Esfand.
