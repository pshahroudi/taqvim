import { createDateAtNoon } from "../utils/dates.js";

export function isLeapGregorianYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getGregorianMonthLength(year, month) {
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapGregorianYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function validateGregorianDate(year, month, day) {
  if (!Number.isInteger(year)) return "Enter a whole Gregorian year.";
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Gregorian month must be between 1 and 12.";
  }

  const monthLength = getGregorianMonthLength(year, month);
  if (!Number.isInteger(day) || day < 1 || day > monthLength) {
    return month === 2 && day === 29
      ? "February 29 is only valid in Gregorian leap years."
      : `Gregorian day must be between 1 and ${monthLength}.`;
  }

  return "";
}

export function toGregorianDate({ gy, gm, gd }) {
  return createDateAtNoon(gy, gm, gd);
}
