// List the holiday records Taqvim would show for a Jalali month or day,
// using the real modules and the real JSON, with default settings.
//
//   node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405 3      # whole month
//   node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405 3 14   # one day
//   node .claude/skills/holiday-data-update/scripts/list-holidays.mjs 1405        # whole year (holidays only)
//
// Mirrors popup.js loadHolidayData() exactly: same four files, same
// normalize/enrich calls, so what prints here is what the popup renders.
import { readFile } from "node:fs/promises";
import {
  enrichHolidayRecords,
  getHolidayRecordsForDate,
  hasVerifiedOfficialYear,
  normalizeHolidayDataset,
  normalizeOfficialYearDataset
} from "../../../../src/calendar/holidays.js";
import {
  createLocalDate,
  getJalaliMonthLength,
  isSupportedJalaliYear,
  toGregorian
} from "../../../../src/calendar/jalali.js";
import { getHijriParts } from "../../../../src/calendar/hijri.js";
import { normalizeSettings } from "../../../../src/ui/storage.js";

const root = new URL("../../../../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

const [jy, jm, jd] = process.argv.slice(2).map(Number);
if (!isSupportedJalaliYear(jy)) {
  console.error("usage: list-holidays.mjs <jalaliYear> [month] [day]");
  process.exit(2);
}

const [officialIran, officialYear, cultural, islamic] = await Promise.all([
  readJson("src/data/holidays-ir.json"),
  readJson("src/data/holidays-official-1405.json"),
  readJson("src/data/holidays-cultural.json"),
  readJson("src/data/holidays-islamic.json")
]);
const verified = normalizeOfficialYearDataset(officialYear);
const recurringOfficial = normalizeHolidayDataset(officialIran, "officialIran");
const calculatedIslamic = normalizeHolidayDataset(islamic, "islamic");
const holidayData = {
  officialIran: recurringOfficial,
  officialVerified: enrichHolidayRecords(verified.records, [...recurringOfficial, ...calculatedIslamic]),
  officialSources: verified.source ? [verified.source] : [],
  cultural: normalizeHolidayDataset(cultural, "cultural"),
  islamic: calculatedIslamic
};
const settings = normalizeSettings();

console.log(
  `Year ${jy}: ${hasVerifiedOfficialYear(holidayData, jy) ? "VERIFIED official layer (calculated Islamic layer suppressed)" : "no verified file; recurring + calculated Islamic fallback"}`
);

const months = Number.isInteger(jm) ? [jm] : Array.from({ length: 12 }, (_, i) => i + 1);
for (const month of months) {
  const days = Number.isInteger(jd) ? [jd] : Array.from({ length: getJalaliMonthLength(jy, month) }, (_, i) => i + 1);
  for (const day of days) {
    const jalaliDate = { jy, jm: month, jd: day };
    const g = toGregorian(jy, month, day);
    const date = createLocalDate(g.gy, g.gm, g.gd);
    const records = getHolidayRecordsForDate({ date, jalaliDate, settings, holidayData });
    if (!records.length && !Number.isInteger(jd) && !Number.isInteger(jm)) continue; // year view: holidays only
    if (!records.length && !Number.isInteger(jd)) continue; // month view: skip empty days
    const h = getHijriParts(date);
    const line = `${jy}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}  ${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}  hijri ${h.hy}/${h.hm}/${h.hd}`;
    if (!records.length) {
      console.log(`${line}  (no records)`);
      continue;
    }
    for (const r of records) {
      console.log(
        `${line}  ${r.isHoliday ? "HOLIDAY " : "observe "} ${r.category.padEnd(12)} ${r.calendar.padEnd(6)} ${r.id}${r.sourceId ? `  [${r.sourceId}]` : ""}  ${r.title}${r.description ? "" : "  (no description)"}`
      );
    }
  }
}
