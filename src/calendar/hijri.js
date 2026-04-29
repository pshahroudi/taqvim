import { createDateAtNoon } from "../utils/dates.js";

const hijriPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

const hijriFullFormatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-nu-latn", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const ISLAMIC_EPOCH = 1948439.5;

function div(a, b) {
  return Math.floor(a / b);
}

function gregorianToJulianDay(year, month, day) {
  const a = div(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return day + div(153 * m + 2, 5) + 365 * y + div(y, 4) - div(y, 100) + div(y, 400) - 32045;
}

function julianDayToGregorian(jdn) {
  const a = jdn + 32044;
  const b = div(4 * a + 3, 146097);
  const c = a - div(146097 * b, 4);
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);

  return {
    gy: 100 * b + d - 4800 + div(m, 10),
    gm: m + 3 - 12 * div(m, 10),
    gd: e - div(153 * m + 2, 5) + 1
  };
}

function islamicCivilToJulianDay(year, month, day) {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    div(3 + 11 * year, 30) +
    ISLAMIC_EPOCH -
    1
  );
}

function getApproximateGregorianDateFromHijri(year, month, day) {
  const jdn = Math.floor(islamicCivilToJulianDay(year, month, day));
  return julianDayToGregorian(jdn);
}

export function getHijriParts(date) {
  const parts = hijriPartsFormatter.formatToParts(date);
  const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    hy: valueOf("year"),
    hm: valueOf("month"),
    hd: valueOf("day")
  };
}

export function sameHijriDate(a, b) {
  return a.hy === b.hy && a.hm === b.hm && a.hd === b.hd;
}

export function formatHijriFull(date) {
  return hijriFullFormatter.format(date);
}

export function validateHijriDate(year, month, day) {
  if (!Number.isInteger(year)) return "Enter a whole Hijri year.";
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Hijri month must be between 1 and 12.";
  }
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    return "Hijri day must be between 1 and 30.";
  }

  return "";
}

export function hijriToGregorian(year, month, day) {
  const baseError = validateHijriDate(year, month, day);
  if (baseError) {
    return { error: baseError };
  }

  const approximate = getApproximateGregorianDateFromHijri(year, month, day);
  const approximateDate = createDateAtNoon(approximate.gy, approximate.gm, approximate.gd);

  for (let delta = -45; delta <= 45; delta += 1) {
    const candidate = new Date(approximateDate);
    candidate.setDate(approximateDate.getDate() + delta);

    if (sameHijriDate(getHijriParts(candidate), { hy: year, hm: month, hd: day })) {
      return {
        gy: candidate.getFullYear(),
        gm: candidate.getMonth() + 1,
        gd: candidate.getDate()
      };
    }
  }

  return {
    error: "This Hijri date was not found in the local calendar calculation."
  };
}
