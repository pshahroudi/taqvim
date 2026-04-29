import {
  createLocalDate,
  getJalaliMonthLength,
  isSupportedJalaliYear,
  toGregorian,
  toJalali
} from "./jalali.js";
import {
  getGregorianMonthLength,
  toGregorianDate,
  validateGregorianDate
} from "./gregorian.js";
import { getHijriParts, hijriToGregorian } from "./hijri.js";

function validateJalaliDate(year, month, day) {
  if (!Number.isInteger(year)) return "Enter a whole Jalali year.";
  if (!isSupportedJalaliYear(year)) {
    return "Jalali year is outside the supported range.";
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Jalali month must be between 1 and 12.";
  }

  const monthLength = getJalaliMonthLength(year, month);
  if (!Number.isInteger(day) || day < 1 || day > monthLength) {
    return month === 12 && day === 30
      ? "Esfand 30 is only valid in Jalali leap years."
      : `Jalali day must be between 1 and ${monthLength}.`;
  }

  return "";
}

export function getCalendarMonthLength(calendar, year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 0;
  if (calendar === "jalali" && !isSupportedJalaliYear(year)) return 0;
  if (calendar === "jalali") return month >= 1 && month <= 12 ? getJalaliMonthLength(year, month) : 0;
  if (calendar === "gregorian") return getGregorianMonthLength(year, month);
  if (calendar === "hijri") return month >= 1 && month <= 12 ? 30 : 0;
  return 0;
}

export function convertDate({ source, year, month, day }) {
  const parsed = {
    year: Number(year),
    month: Number(month),
    day: Number(day)
  };

  if (!Number.isFinite(parsed.year) || !Number.isFinite(parsed.month) || !Number.isFinite(parsed.day)) {
    return { error: "Enter a year, month, and day." };
  }

  const wholeDate = {
    year: Math.trunc(parsed.year),
    month: Math.trunc(parsed.month),
    day: Math.trunc(parsed.day)
  };

  if (
    wholeDate.year !== parsed.year ||
    wholeDate.month !== parsed.month ||
    wholeDate.day !== parsed.day
  ) {
    return { error: "Date fields must be whole numbers." };
  }

  let gregorian;
  let jalali;
  let date;

  try {
    if (source === "jalali") {
      const error = validateJalaliDate(wholeDate.year, wholeDate.month, wholeDate.day);
      if (error) return { error };

      jalali = {
        jy: wholeDate.year,
        jm: wholeDate.month,
        jd: wholeDate.day
      };
      gregorian = toGregorian(jalali.jy, jalali.jm, jalali.jd);
      date = createLocalDate(gregorian.gy, gregorian.gm, gregorian.gd);
    } else if (source === "gregorian") {
      const error = validateGregorianDate(wholeDate.year, wholeDate.month, wholeDate.day);
      if (error) return { error };

      gregorian = {
        gy: wholeDate.year,
        gm: wholeDate.month,
        gd: wholeDate.day
      };
      date = toGregorianDate(gregorian);
      jalali = toJalali(gregorian.gy, gregorian.gm, gregorian.gd);
    } else if (source === "hijri") {
      const result = hijriToGregorian(wholeDate.year, wholeDate.month, wholeDate.day);
      if (result.error) return { error: result.error };

      gregorian = result;
      date = createLocalDate(gregorian.gy, gregorian.gm, gregorian.gd);
      jalali = toJalali(gregorian.gy, gregorian.gm, gregorian.gd);
    } else {
      return { error: "Choose a source calendar." };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Jalali year out of supported range")) {
      return { error: "This date is outside the supported Jalali conversion range." };
    }
    throw error;
  }

  return {
    source,
    date,
    jalali,
    gregorian,
    hijri: getHijriParts(date)
  };
}
