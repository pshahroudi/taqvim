export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
];

export const WEEKDAY_LABELS = {
  saturday: ["ش", "ی", "د", "س", "چ", "پ", "ج"],
  sunday: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
  monday: ["د", "س", "چ", "پ", "ج", "ش", "ی"]
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function formatNumber(value, usePersianNumerals = true) {
  return new Intl.NumberFormat(usePersianNumerals ? "fa-IR" : "en-US", {
    useGrouping: false
  }).format(value);
}

export function padNumber(value) {
  return String(value).padStart(2, "0");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getPersianCalendarFormatter(usePersianNumerals = true, timeZone) {
  return new Intl.DateTimeFormat(
    usePersianNumerals ? "fa-IR-u-ca-persian" : "fa-IR-u-ca-persian-nu-latn",
    {
      ...(timeZone ? { timeZone } : {}),
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}

export function formatPersianOrderedDate(
  date,
  { usePersianNumerals = true, timeZone } = {}
) {
  const formatter = getPersianCalendarFormatter(usePersianNumerals, timeZone);
  const parts = formatter.formatToParts(date);
  const partValue = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = partValue("weekday");
  const day = partValue("day");
  const month = partValue("month");
  const year = partValue("year");

  return `${weekday}، ${day} ${month} ${year}`;
}

export function formatJalaliNumeric({ jy, jm, jd }, usePersianNumerals = false) {
  const year = formatNumber(jy, usePersianNumerals);
  const month = usePersianNumerals
    ? formatNumber(jm, true)
    : padNumber(jm);
  const day = usePersianNumerals
    ? formatNumber(jd, true)
    : padNumber(jd);

  return `${year}/${month}/${day}`;
}

export function formatGregorianNumeric({ gy, gm, gd }) {
  return `${gy}-${padNumber(gm)}-${padNumber(gd)}`;
}
