const DEFAULT_SETTINGS = {
  theme: "system",
  fontSize: "medium",
  showHijri: false,
  showTehranTime: true,
  usePersianNumerals: true,
  weekStart: "saturday",
  showHolidays: true,
  holidayTypes: {
    officialIran: true,
    cultural: true,
    islamic: true
  },
  highlightWeekends: true,
  autoJumpToTodayOnOpen: true
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toBooleanSetting(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(value);
}

function normalizeHolidayTypes(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    officialIran: toBooleanSetting(
      source.officialIran,
      DEFAULT_SETTINGS.holidayTypes.officialIran
    ),
    cultural: toBooleanSetting(
      source.cultural,
      DEFAULT_SETTINGS.holidayTypes.cultural
    ),
    islamic: toBooleanSetting(
      source.islamic,
      DEFAULT_SETTINGS.holidayTypes.islamic
    )
  };
}

export function normalizeSettings(input = {}) {
  const source = isPlainObject(input.settings) ? input.settings : input;

  return {
    ...DEFAULT_SETTINGS,
    ...source,
    theme: ["system", "light", "dark"].includes(source.theme)
      ? source.theme
      : DEFAULT_SETTINGS.theme,
    fontSize: ["small", "medium", "large"].includes(source.fontSize)
      ? source.fontSize
      : DEFAULT_SETTINGS.fontSize,
    showHijri: toBooleanSetting(source.showHijri, DEFAULT_SETTINGS.showHijri),
    showTehranTime: toBooleanSetting(
      source.showTehranTime,
      DEFAULT_SETTINGS.showTehranTime
    ),
    usePersianNumerals: toBooleanSetting(
      source.usePersianNumerals,
      DEFAULT_SETTINGS.usePersianNumerals
    ),
    weekStart: ["saturday", "sunday", "monday"].includes(source.weekStart)
      ? source.weekStart
      : DEFAULT_SETTINGS.weekStart,
    showHolidays: toBooleanSetting(
      source.showHolidays,
      DEFAULT_SETTINGS.showHolidays
    ),
    holidayTypes: normalizeHolidayTypes(source.holidayTypes),
    highlightWeekends: toBooleanSetting(
      source.highlightWeekends,
      DEFAULT_SETTINGS.highlightWeekends
    ),
    autoJumpToTodayOnOpen: toBooleanSetting(
      source.autoJumpToTodayOnOpen,
      DEFAULT_SETTINGS.autoJumpToTodayOnOpen
    )
  };
}

function mergeSettings(base, patch = {}) {
  const normalizedBase = normalizeSettings(base);
  const normalizedPatch = isPlainObject(patch) ? patch : {};

  return normalizeSettings({
    ...normalizedBase,
    ...normalizedPatch,
    holidayTypes: {
      ...normalizedBase.holidayTypes,
      ...(isPlainObject(normalizedPatch.holidayTypes) ? normalizedPatch.holidayTypes : {})
    }
  });
}

function toStoragePayload(settings) {
  const normalized = normalizeSettings(settings);
  return {
    theme: normalized.theme,
    fontSize: normalized.fontSize,
    showHijri: normalized.showHijri,
    showTehranTime: normalized.showTehranTime,
    usePersianNumerals: normalized.usePersianNumerals,
    weekStart: normalized.weekStart,
    showHolidays: normalized.showHolidays,
    holidayTypes: normalized.holidayTypes,
    highlightWeekends: normalized.highlightWeekends,
    autoJumpToTodayOnOpen: normalized.autoJumpToTodayOnOpen
  };
}

function needsMigration(raw) {
  if (!isPlainObject(raw)) return false;
  if (isPlainObject(raw.settings)) return true;

  const requiredKeys = [
    "theme",
    "fontSize",
    "showHijri",
    "showTehranTime",
    "usePersianNumerals",
    "weekStart",
    "showHolidays",
    "holidayTypes",
    "highlightWeekends",
    "autoJumpToTodayOnOpen"
  ];

  if (requiredKeys.some((key) => !(key in raw))) return true;

  const holidayTypes = isPlainObject(raw.holidayTypes) ? raw.holidayTypes : {};
  return Object.keys(DEFAULT_SETTINGS.holidayTypes).some((key) => !(key in holidayTypes));
}

async function writeSettings(settings, { removeLegacy = true } = {}) {
  const normalized = normalizeSettings(settings);
  const payload = toStoragePayload(normalized);

  if (removeLegacy) {
    try {
      await chrome.storage.sync.remove("settings");
    } catch {
      // ignore remove failures so settings can still be written
    }
  }

  await chrome.storage.sync.set(payload);
  return normalized;
}

export async function getSettings() {
  const raw = await chrome.storage.sync.get(null);
  const normalized = normalizeSettings(raw);

  if (needsMigration(raw)) {
    await writeSettings(normalized, { removeLegacy: true });
  }

  return normalized;
}

export async function saveSettingsPatch(patch) {
  const current = await getSettings();
  const next = mergeSettings(current, patch);
  return writeSettings(next, { removeLegacy: true });
}

export async function setSettings(settings) {
  return writeSettings(settings, { removeLegacy: true });
}

export { DEFAULT_SETTINGS };
