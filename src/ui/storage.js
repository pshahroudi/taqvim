export const DEFAULT_SETTINGS = {
  theme: "system",
  showHijri: false,
  usePersianNumerals: true,
  weekStart: "saturday",
  showHolidays: true,
  highlightWeekends: true,
  autoJumpToTodayOnOpen: true,
  compactMode: false,
  holidayTypes: {
    officialIran: true,
    cultural: true,
    islamic: false
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHolidayTypes(rawHolidayTypes = {}) {
  return {
    officialIran: Boolean(rawHolidayTypes.officialIran),
    cultural: Boolean(rawHolidayTypes.cultural),
    islamic: Boolean(rawHolidayTypes.islamic)
  };
}

export function normalizeSettings(raw = {}) {
  const merged = {
    ...deepClone(DEFAULT_SETTINGS),
    ...(raw || {})
  };

  const resolvedAutoJump = raw?.autoJumpToTodayOnOpen ?? raw?.autoJumpToToday;

  merged.holidayTypes = normalizeHolidayTypes({
    ...DEFAULT_SETTINGS.holidayTypes,
    ...(raw?.holidayTypes || {})
  });

  if (!["system", "light", "dark"].includes(merged.theme)) {
    merged.theme = DEFAULT_SETTINGS.theme;
  }

  if (!["saturday", "sunday", "monday"].includes(merged.weekStart)) {
    merged.weekStart = DEFAULT_SETTINGS.weekStart;
  }

  merged.showHijri = Boolean(merged.showHijri);
  merged.usePersianNumerals = Boolean(merged.usePersianNumerals);
  merged.showHolidays = Boolean(merged.showHolidays);
  merged.highlightWeekends = Boolean(merged.highlightWeekends);
  merged.compactMode = Boolean(merged.compactMode);
  merged.autoJumpToTodayOnOpen =
    resolvedAutoJump === undefined
      ? DEFAULT_SETTINGS.autoJumpToTodayOnOpen
      : Boolean(resolvedAutoJump);

  return merged;
}

function toStorageShape(settings) {
  const normalized = normalizeSettings(settings);

  return {
    ...normalized,
    autoJumpToToday: normalized.autoJumpToTodayOnOpen
  };
}

export async function getSettings() {
  const raw = await chrome.storage.sync.get(null);
  return normalizeSettings(raw);
}

export async function saveSettings(partial = {}) {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    ...partial,
    holidayTypes: {
      ...current.holidayTypes,
      ...(partial?.holidayTypes || {})
    }
  });

  await chrome.storage.sync.set(toStorageShape(next));
  return next;
}

export async function setSettings(partial = {}) {
  return saveSettings(partial);
}

export async function updateSettings(partial = {}) {
  return saveSettings(partial);
}

export async function resetSettings() {
  const next = deepClone(DEFAULT_SETTINGS);
  await chrome.storage.sync.clear();
  await chrome.storage.sync.set(toStorageShape(next));
  return next;
}

export function watchSettings(callback) {
  const handler = async (changes, areaName) => {
    if (areaName !== "sync") return;

    const nextPartial = {};

    for (const [key, change] of Object.entries(changes)) {
      nextPartial[key] = change.newValue;
    }

    callback(normalizeSettings(nextPartial));
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function getManifestVersion() {
  try {
    return chrome.runtime.getManifest().version || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export function normalizeWeekStart(weekStart) {
  return normalizeSettings({ weekStart }).weekStart;
}

export function settingsFromStorage(raw) {
  return normalizeSettings(raw);
}
