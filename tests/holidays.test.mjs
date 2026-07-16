import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  enrichHolidayRecords,
  getHolidayRecordsForDate,
  hasVerifiedOfficialYear,
  normalizeHolidayDataset,
  normalizeOfficialYearDataset
} from "../src/calendar/holidays.js";
import { createLocalDate, toGregorian } from "../src/calendar/jalali.js";
import { getHijriParts } from "../src/calendar/hijri.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/ui/storage.js";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
}

async function loadHolidayData() {
  const [officialIran, official1405, cultural, islamic] = await Promise.all([
    readJson("src/data/holidays-ir.json"),
    readJson("src/data/holidays-official-1405.json"),
    readJson("src/data/holidays-cultural.json"),
    readJson("src/data/holidays-islamic.json")
  ]);
  const logger = { warn() {} };
  const verified = normalizeOfficialYearDataset(official1405, { logger });

  const recurringOfficial = normalizeHolidayDataset(officialIran, "officialIran", { logger });
  const calculatedIslamic = normalizeHolidayDataset(islamic, "islamic", { logger });

  return {
    officialIran: recurringOfficial,
    officialVerified: enrichHolidayRecords(verified.records, [
      ...recurringOfficial,
      ...calculatedIslamic
    ]),
    officialSources: [verified.source],
    cultural: normalizeHolidayDataset(cultural, "cultural", { logger }),
    islamic: calculatedIslamic
  };
}

function dateFromJalali({ jy, jm, jd }) {
  const gregorian = toGregorian(jy, jm, jd);
  return createLocalDate(gregorian.gy, gregorian.gm, gregorian.gd);
}

test("the official 1405 dataset is sourced, complete, and enabled by default", async () => {
  const data = await loadHolidayData();

  assert.equal(data.officialVerified.length, 29);
  assert.equal(hasVerifiedOfficialYear(data, 1405), true);
  assert.equal(hasVerifiedOfficialYear(data, 1404), false);
  assert.equal(DEFAULT_SETTINGS.holidayTypes.officialIran, true);
  assert.equal(DEFAULT_SETTINGS.holidayTypes.islamic, true);
  assert.match(data.officialSources[0].publisher, /University of Tehran/i);
  assert.match(data.officialSources[0].url, /^https:\/\/calendar\.ut\.ac\.ir\//);
});

test("verified official dates replace calculated duplicates in 1405", async () => {
  const data = await loadHolidayData();
  const jalaliDate = { jy: 1405, jm: 3, jd: 14 };
  const records = getHolidayRecordsForDate({
    date: dateFromJalali(jalaliDate),
    jalaliDate,
    settings: normalizeSettings(),
    holidayData: data
  });

  assert.deepEqual(
    records.map((record) => record.title).sort(),
    ["رحلت امام خمینی", "عید غدیر"].sort()
  );
  assert.ok(records.every((record) => record.sourceId === "ut-calendar-1405"));
  assert.ok(records.every((record) => record.description));
});

test("calculated Islamic holidays remain available as an unverified-year fallback", async () => {
  const data = await loadHolidayData();
  const jalaliDate = { jy: 1404, jm: 7, jd: 1 };
  const date = dateFromJalali(jalaliDate);
  const hijri = getHijriParts(date);
  data.islamic = [
    {
      id: "test-calculated-fallback",
      calendar: "hijri",
      month: hijri.hm,
      day: hijri.hd,
      title: "Calculated fallback",
      category: "islamic",
      isHoliday: true
    }
  ];

  const records = getHolidayRecordsForDate({
    date,
    jalaliDate,
    settings: normalizeSettings(),
    holidayData: data
  });

  assert.ok(records.some((record) => record.id === "test-calculated-fallback"));
});
