import { formatNumber } from "./format.js";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const DIRECTIONAL_MARKS = /[\u061c\u200e\u200f]/g;

export function parseIntegerInput(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(DIRECTIONAL_MARKS, "")
    .replace(/\u2212/g, "-")
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));

  if (!normalized || !/^-?\d+$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function normalizePersianDigitString(value) {
  return String(value ?? "")
    .replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)])
    .replace(
      /[٠-٩]/g,
      (digit) => PERSIAN_DIGITS[ARABIC_INDIC_DIGITS.indexOf(digit)]
    );
}

export function normalizeIntegerInputDisplay(value, usePersianNumerals = true) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  const parsedValue = parseIntegerInput(rawValue);
  if (Number.isInteger(parsedValue)) {
    return usePersianNumerals
      ? formatNumber(parsedValue, true).replace(DIRECTIONAL_MARKS, "")
      : String(parsedValue);
  }

  return usePersianNumerals ? normalizePersianDigitString(rawValue) : rawValue;
}
