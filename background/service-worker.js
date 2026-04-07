const DEFAULT_SETTINGS = {
  theme: "system",
  showHijri: false,
  usePersianNumerals: true,
  weekStart: "saturday",
  showHolidays: true,
  holidayTypes: {
    officialIran: true,
    cultural: true,
    islamic: false,
  },
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get([
    "theme",
    "showHijri",
    "usePersianNumerals",
    "weekStart",
    "showHolidays",
    "holidayTypes",
  ]);

  const updates = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
});
