import { updateBadge } from "../src/ui/badge.js";
import { DEFAULT_SETTINGS, normalizeSettings, setSettings } from "../src/ui/storage.js";
import { getNextTehranMidnightTimestamp } from "../src/utils/dates.js";

const MIDNIGHT_ALARM = "taqvim-midnight-refresh";

async function ensureDefaultSettings() {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const current = await chrome.storage.sync.get(null);
  const normalized = normalizeSettings(current);
  const holidayTypeKeys = Object.keys(DEFAULT_SETTINGS.holidayTypes);
  const holidayTypes = current.holidayTypes || {};
  const shouldWriteDefaults =
    Boolean(current.settings) ||
    keys.some((key) => current[key] === undefined) ||
    holidayTypeKeys.some((key) => holidayTypes[key] === undefined);

  if (shouldWriteDefaults) {
    await setSettings(normalized);
  }
}

function getNextMidnightTimestamp() {
  // The badge intentionally reflects the Tehran calendar date, so refresh at
  // Tehran midnight rather than the browser machine's local midnight.
  return getNextTehranMidnightTimestamp();
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
    "usePersianNumerals"
  ];

  if (!Object.keys(changes).some((key) => relevant.includes(key))) {
    return;
  }

  await updateBadge();
});
