import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_JALALI_YEAR,
  MIN_JALALI_YEAR,
  getJalaliMonthLength,
  isLeapJalaliYear,
  isSupportedJalaliYear,
  nextJalaliMonth,
  previousJalaliMonth,
  toGregorian,
  toJalali
} from "../src/calendar/jalali.js";
import { convertDate } from "../src/calendar/converter.js";
import { getHijriParts, hijriToGregorian } from "../src/calendar/hijri.js";

test("Gregorian and Jalali conversion round-trips every day from 1900 through 2100", () => {
  let checked = 0;

  for (
    let timestamp = Date.UTC(1900, 0, 1, 12);
    timestamp <= Date.UTC(2100, 11, 31, 12);
    timestamp += 86_400_000
  ) {
    const date = new Date(timestamp);
    const jalali = toJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const gregorian = toGregorian(jalali.jy, jalali.jm, jalali.jd);

    assert.deepEqual(gregorian, {
      gy: date.getUTCFullYear(),
      gm: date.getUTCMonth() + 1,
      gd: date.getUTCDate()
    });
    checked += 1;
  }

  assert.equal(checked, 73_414);
});

test("Jalali leap years and month lengths are validated", () => {
  assert.equal(isLeapJalaliYear(1399), true);
  assert.equal(getJalaliMonthLength(1399, 12), 30);
  assert.equal(getJalaliMonthLength(1400, 12), 29);

  assert.match(
    convertDate({ source: "jalali", year: 1400, month: 12, day: 30 }).error,
    /leap years/i
  );
  assert.equal(convertDate({ source: "gregorian", year: 2024, month: 2, day: 29 }).error, undefined);
  assert.match(
    convertDate({ source: "gregorian", year: 2025, month: 2, day: 29 }).error,
    /leap years/i
  );
});

test("supported Jalali boundaries are explicit", () => {
  assert.equal(isSupportedJalaliYear(MIN_JALALI_YEAR), true);
  assert.equal(isSupportedJalaliYear(MAX_JALALI_YEAR), true);
  assert.equal(isSupportedJalaliYear(MIN_JALALI_YEAR - 1), false);
  assert.equal(isSupportedJalaliYear(MAX_JALALI_YEAR + 1), false);
  assert.deepEqual(previousJalaliMonth(MIN_JALALI_YEAR, 1), {
    jy: MIN_JALALI_YEAR - 1,
    jm: 12
  });
  assert.deepEqual(nextJalaliMonth(MAX_JALALI_YEAR, 12), {
    jy: MAX_JALALI_YEAR + 1,
    jm: 1
  });
});

test("Hijri conversion round-trips representative dates", () => {
  let checked = 0;

  for (
    let timestamp = Date.UTC(2020, 0, 1, 12);
    timestamp <= Date.UTC(2030, 11, 31, 12);
    timestamp += 17 * 86_400_000
  ) {
    const date = new Date(timestamp);
    const hijri = getHijriParts(date);
    const gregorian = hijriToGregorian(hijri.hy, hijri.hm, hijri.hd);

    assert.deepEqual(gregorian, {
      gy: date.getUTCFullYear(),
      gm: date.getUTCMonth() + 1,
      gd: date.getUTCDate()
    });
    checked += 1;
  }

  assert.equal(checked, 237);
});
