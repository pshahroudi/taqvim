import { getHijriParts } from "./hijri.js";

const VALID_HOLIDAY_CATEGORIES = ["officialIran", "cultural", "islamic"];
const VALID_HOLIDAY_CALENDARS = ["jalali", "hijri"];

export const EMPTY_HOLIDAY_DATA = Object.freeze({
  officialIran: [],
  officialVerified: [],
  officialSources: [],
  cultural: [],
  islamic: []
});

export function isHolidayRecordValid(record, expectedCategory, { requireYear = false } = {}) {
  const hasValidYear =
    record?.year === undefined || (Number.isInteger(record.year) && record.year > 0);

  return Boolean(
    record &&
      typeof record.id === "string" &&
      record.id.trim() &&
      VALID_HOLIDAY_CALENDARS.includes(record.calendar) &&
      hasValidYear &&
      (!requireYear || Number.isInteger(record.year)) &&
      Number.isInteger(record.month) &&
      record.month >= 1 &&
      record.month <= 12 &&
      Number.isInteger(record.day) &&
      record.day >= 1 &&
      record.day <= 31 &&
      typeof record.title === "string" &&
      record.title.trim() &&
      VALID_HOLIDAY_CATEGORIES.includes(record.category) &&
      record.category === expectedCategory &&
      typeof record.isHoliday === "boolean"
  );
}

export function normalizeHolidayDataset(
  records,
  expectedCategory,
  { requireYear = false, logger = console } = {}
) {
  if (!Array.isArray(records)) {
    logger.warn?.(`Taqvim holiday dataset for ${expectedCategory} is not an array.`);
    return [];
  }

  const seenIds = new Set();
  const validRecords = [];

  for (const record of records) {
    if (!isHolidayRecordValid(record, expectedCategory, { requireYear })) {
      logger.warn?.("Taqvim ignored invalid holiday record:", record);
      continue;
    }

    if (seenIds.has(record.id)) {
      logger.warn?.(`Taqvim ignored duplicate holiday id: ${record.id}`);
      continue;
    }

    seenIds.add(record.id);
    validRecords.push(record);
  }

  return validRecords;
}

export function normalizeOfficialYearDataset(payload, { logger = console } = {}) {
  const source = payload?.source;
  const sourceIsValid = Boolean(
    source &&
      typeof source.id === "string" &&
      source.id.trim() &&
      typeof source.title === "string" &&
      source.title.trim() &&
      typeof source.publisher === "string" &&
      source.publisher.trim() &&
      typeof source.url === "string" &&
      source.url.startsWith("https://")
  );

  if (!sourceIsValid) {
    logger.warn?.("Taqvim ignored an official holiday dataset with invalid source metadata.");
    return { source: null, records: [] };
  }

  const records = normalizeHolidayDataset(payload.holidays, "officialIran", {
    requireYear: true,
    logger
  }).filter((record) => {
    if (record.sourceId === source.id) return true;
    logger.warn?.(`Taqvim ignored ${record.id}: sourceId does not match ${source.id}.`);
    return false;
  });

  return { source, records };
}

export function hasPublicHoliday(records) {
  return records.some((record) => record.isHoliday);
}

export function hasObservance(records) {
  return records.some((record) => !record.isHoliday);
}

export function dedupeHolidayRecords(records) {
  const seen = new Set();

  return records.filter((record) => {
    const key =
      record.id ||
      `${record.category}:${record.calendar}:${record.year || "recurring"}:${record.month}:${record.day}:${record.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function enrichHolidayRecords(records, references) {
  const referenceById = new Map(references.map((record) => [record.id, record]));
  const referenceByTitle = new Map(
    references.map((record) => [record.title, record])
  );

  return records.map((record) => {
    const recurringId = record.id.replace(/^official-\d+-/, "");
    const reference =
      referenceById.get(recurringId) || referenceByTitle.get(record.title);
    return {
      ...record,
      ...(record.description || !reference?.description
        ? {}
        : { description: reference.description })
    };
  });
}

function recordMatchesDate(record, date, jalaliDate) {
  if (record.year !== undefined && record.year !== jalaliDate.jy) return false;

  if (record.calendar === "jalali") {
    return record.month === jalaliDate.jm && record.day === jalaliDate.jd;
  }

  const hijri = getHijriParts(date);
  return record.month === hijri.hm && record.day === hijri.hd;
}

export function hasVerifiedOfficialYear(holidayData, jalaliYear) {
  return holidayData.officialVerified.some((record) => record.year === jalaliYear);
}

export function getHolidayRecordsForDate({ date, jalaliDate, settings, holidayData }) {
  if (!settings.showHolidays) return [];

  const active = [];
  const verifiedYear = hasVerifiedOfficialYear(holidayData, jalaliDate.jy);

  if (settings.holidayTypes?.officialIran) {
    active.push(
      ...(verifiedYear ? holidayData.officialVerified : holidayData.officialIran)
    );
  }

  if (settings.holidayTypes?.cultural) {
    active.push(...holidayData.cultural);
  }

  // Verified official calendars already contain their religious public holidays.
  // Keep the calculated Hijri layer available when the verified layer is disabled
  // or when a selected year has no bundled official calendar.
  if (
    settings.holidayTypes?.islamic &&
    (!verifiedYear || !settings.holidayTypes?.officialIran)
  ) {
    active.push(...holidayData.islamic);
  }

  return active.filter((record) => recordMatchesDate(record, date, jalaliDate));
}

export function getHolidayCategoryLabel(category) {
  switch (category) {
    case "officialIran":
      return "تعطیل رسمی";
    case "cultural":
      return "مناسبت فرهنگی";
    case "islamic":
      return "مناسبت اسلامی";
    default:
      return "مناسبت";
  }
}

export function getHolidayStatus(
  records,
  { showHolidays = true, forToday = false, isWeeklyHoliday = false } = {}
) {
  if (!showHolidays) return "Holiday layer hidden";
  if (!records.length) {
    if (isWeeklyHoliday) return "تعطیل رسمی هفتگی";
    return forToday ? "No holiday today" : "این روز تعطیل رسمی نیست";
  }
  if (hasPublicHoliday(records) && hasObservance(records)) return "تعطیل رسمی و مناسبت";
  if (hasPublicHoliday(records)) return "تعطیل رسمی";
  if (isWeeklyHoliday) return "تعطیل رسمی هفتگی";
  return "مناسبت فرهنگی";
}

export function getHolidayStatusTone(
  records,
  { showHolidays = true, isWeeklyHoliday = false } = {}
) {
  if (!showHolidays) return "muted";
  if (hasPublicHoliday(records) && hasObservance(records)) return "mixed";
  if (hasPublicHoliday(records)) return "public";
  if (isWeeklyHoliday) return "weekly";
  if (!records.length) return "empty";
  return "observance";
}
