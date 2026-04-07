import {
  DEFAULT_SETTINGS,
  getSettings,
  getManifestVersion,
  resetSettings,
  saveSettings,
  watchSettings
} from "../src/ui/storage.js";

const form = document.getElementById("settingsForm");
const saveStatus = document.getElementById("saveStatus");
const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
const appVersionEl = document.getElementById("appVersion");

const fields = {
  theme: document.getElementById("theme"),
  showHijri: document.getElementById("showHijri"),
  usePersianNumerals: document.getElementById("usePersianNumerals"),
  weekStart: document.getElementById("weekStart"),
  showHolidays: document.getElementById("showHolidays"),
  autoJumpToToday: document.getElementById("autoJumpToToday"),
  highlightWeekends: document.getElementById("highlightWeekends"),
  holidayOfficialIran: document.getElementById("holidayOfficialIran"),
  holidayCultural: document.getElementById("holidayCultural"),
  holidayIslamic: document.getElementById("holidayIslamic")
};

let saveTimer;
let isHydrating = false;

function setStatus(message) {
  saveStatus.textContent = message;
  window.clearTimeout(saveTimer);

  if (!message) return;

  saveTimer = window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 1800);
}

function applySettingsToForm(settings) {
  isHydrating = true;

  fields.theme.value = settings.theme;
  fields.showHijri.checked = settings.showHijri;
  fields.usePersianNumerals.checked = settings.usePersianNumerals;
  fields.weekStart.value = settings.weekStart;
  fields.showHolidays.checked = settings.showHolidays;
  fields.autoJumpToToday.checked = settings.autoJumpToToday;
  fields.highlightWeekends.checked = settings.highlightWeekends;
  fields.holidayOfficialIran.checked = settings.holidayTypes.officialIran;
  fields.holidayCultural.checked = settings.holidayTypes.cultural;
  fields.holidayIslamic.checked = settings.holidayTypes.islamic;

  isHydrating = false;
}

function readFormValues() {
  return {
    theme: fields.theme.value,
    showHijri: fields.showHijri.checked,
    usePersianNumerals: fields.usePersianNumerals.checked,
    weekStart: fields.weekStart.value,
    showHolidays: fields.showHolidays.checked,
    autoJumpToToday: fields.autoJumpToToday.checked,
    highlightWeekends: fields.highlightWeekends.checked,
    holidayTypes: {
      officialIran: fields.holidayOfficialIran.checked,
      cultural: fields.holidayCultural.checked,
      islamic: fields.holidayIslamic.checked
    }
  };
}

async function persistFromForm() {
  const values = readFormValues();
  await saveSettings(values);
  setStatus("Settings saved");
}

form.addEventListener("change", async () => {
  if (isHydrating) return;
  await persistFromForm();
});

form.addEventListener("input", async (event) => {
  if (isHydrating) return;
  if (event.target.tagName !== "SELECT") return;
  await persistFromForm();
});

resetDefaultsBtn.addEventListener("click", async () => {
  await resetSettings();
  applySettingsToForm(DEFAULT_SETTINGS);
  setStatus("Defaults restored");
});

watchSettings((settings) => {
  applySettingsToForm(settings);
});

async function init() {
  appVersionEl.textContent = getManifestVersion();
  const settings = await getSettings();
  applySettingsToForm(settings);
}

init();
