import test from "node:test";
import assert from "node:assert/strict";
import {
  TEHRAN_TIME_ZONE,
  getDatePartsInTimeZone,
  getNextTehranMidnightTimestamp
} from "../src/utils/dates.js";
import {
  normalizeIntegerInputDisplay,
  normalizePersianDigitString,
  parseIntegerInput
} from "../src/utils/numerals.js";
import { getTehranClockSnapshot } from "../src/ui/tehran-clock.js";

test("Persian, Arabic-Indic, and Latin integer inputs normalize consistently", () => {
  assert.equal(parseIntegerInput("۱۴۰۵"), 1405);
  assert.equal(parseIntegerInput("١٤٠٥"), 1405);
  assert.equal(parseIntegerInput("-61"), -61);
  assert.equal(parseIntegerInput("‎−۶۱"), -61);
  assert.equal(Number.isNaN(parseIntegerInput("14.05")), true);
  assert.equal(normalizePersianDigitString("1405/٠٤"), "۱۴۰۵/۰۴");
  assert.equal(normalizeIntegerInputDisplay("1405", true), "۱۴۰۵");
  assert.equal(normalizeIntegerInputDisplay("۱۴۰۵", false), "1405");
  assert.equal(normalizeIntegerInputDisplay("-61", true), "−۶۱");
  assert.equal(parseIntegerInput(normalizeIntegerInputDisplay("-61", true)), -61);
});

test("Tehran date parts and next midnight are independent of the machine time zone", () => {
  const instant = new Date("2026-07-16T20:45:00.000Z");

  assert.deepEqual(getDatePartsInTimeZone(instant, TEHRAN_TIME_ZONE), {
    year: 2026,
    month: 7,
    day: 17,
    hour: 0,
    minute: 15,
    second: 0
  });
  assert.equal(
    new Date(getNextTehranMidnightTimestamp(instant)).toISOString(),
    "2026-07-17T20:30:05.000Z"
  );
});

test("Tehran clock snapshot uses the Tehran day phase and Persian clock digits", () => {
  const snapshot = getTehranClockSnapshot(new Date("2026-07-16T20:45:00.000Z"));

  assert.equal(snapshot.timeText, "۱۲:۱۵:۰۰");
  assert.equal(snapshot.meridiemLabel, "ق.ظ");
  assert.equal(snapshot.isMorning, true);
  assert.equal(snapshot.phaseIcon, "☀");
  assert.match(snapshot.dateText, /Fri, Jul 17 · Asia\/Tehran/);
});
