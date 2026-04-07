import { updateBadge } from "../src/ui/badge.js";

const DEFAULT_SETTINGS = {
  theme: "system",
  showHijri: false,
  usePersianNumerals: true,
  weekStart: "saturday",
  showHolidays: true,
  holidayTypes: {
    officialIran: true,
    cultural: true,
    islamic: false
  }
};

const MIDNIGHT_ALARM = "taqvim-midnight-refresh";

async function ensureDefaultSettings() {
  const current = await chrome.storage.sync.get([
    "theme",
    "showHijri",
    "usePersianNumerals",
    "weekStart",
    "showHolidays",
    "holidayTypes"
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
}

function getNextMidnightTimestamp() {
  const next = new Date();
  next.setHours(24, 0, 5, 0);
  return next.getTime();
}

async function scheduleNextMidnightRefresh() {
  await chrome.alarms.clear(MIDNIGHT_ALARM);
  await chrome.alarms.create(MIDNIGHT_ALARM, {
    when: getNextMidnightTimestamp()
  });
}

async function refreshBadge() {
  await updateBadge();
  await scheduleNextMidnightRefresh();
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultSettings();
  await refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshBadge();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== MIDNIGHT_ALARM) return;
  await refreshBadge();
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "sync") return;

  const relevant = [
    "usePersianNumerals",
    "showHolidays",
    "holidayTypes"
  ];

  if (!Object.keys(changes).some((key) => relevant.includes(key))) {
    return;
  }

  await updateBadge();
});
