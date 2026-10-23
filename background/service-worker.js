import { updateBadge } from "../src/ui/badge.js";
import { getSettings } from "../src/ui/storage.js";

const MIDNIGHT_ALARM = "taqvim-midnight-refresh";

// getSettings() writes defaults for any missing key and migrates the legacy
// nested shape, so reading once is enough.
async function ensureDefaultSettings() {
  await getSettings();
}

function getNextMidnightTimestamp() {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 5, 0);

  return tomorrow.getTime();
}

async function scheduleNextMidnightRefresh() {
  await chrome.alarms.clear(MIDNIGHT_ALARM);
  await chrome.alarms.create(MIDNIGHT_ALARM, {
    when: getNextMidnightTimestamp()
  });
}

async function ensureMidnightRefreshScheduled() {
  const alarm = await chrome.alarms.get(MIDNIGHT_ALARM);

  if (!alarm || alarm.scheduledTime <= Date.now()) {
    await scheduleNextMidnightRefresh();
  }
}

async function refreshBadge() {
  await updateBadge();
  await scheduleNextMidnightRefresh();
}

async function initializeWorker() {
  await ensureDefaultSettings();
  await updateBadge();
  await ensureMidnightRefreshScheduled();
}

initializeWorker().catch((error) => {
  console.warn("Taqvim background initialization skipped:", error);
});

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
