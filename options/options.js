import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettingsPatch,
  setSettings
} from "../src/ui/storage.js";
import { applyTheme } from "../src/ui/theme.js";

const root = document.documentElement;
const saveStatusEl = document.getElementById("saveStatus");
const appVersionEl = document.getElementById("appVersion");
const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");

const controls = {
  theme: findControl(["#theme", "#themeSelect", "select[name='theme']"]),
  showHijri: findControl(["#showHijri", "#showHijriDate", "input[name='showHijri']"]),
  usePersianNumerals: findControl(["#usePersianNumerals", "input[name='usePersianNumerals']"]),
  weekStart: findControl(["#weekStart", "#weekStartsOn", "select[name='weekStart']"]),
  showHolidays: findControl(["#showHolidays", "input[name='showHolidays']"]),
  highlightWeekends: findControl(["#highlightWeekends", "input[name='highlightWeekends']"]),
  autoJumpToTodayOnOpen: findControl([
    "#autoJumpToTodayOnOpen",
    "#autoJumpToToday",
    "input[name='autoJumpToTodayOnOpen']"
  ]),
  holidayOfficialIran: findControl([
    "#holidayOfficialIran",
    "#officialIran",
    "input[name='holidayOfficialIran']",
    "input[name='officialIran']"
  ]),
  holidayCultural: findControl([
    "#holidayCultural",
    "#cultural",
    "input[name='holidayCultural']",
    "input[name='cultural']"
  ]),
  holidayIslamic: findControl([
    "#holidayIslamic",
    "#islamic",
    "input[name='holidayIslamic']",
    "input[name='islamic']"
  ])
};

let statusTimer = null;

function findControl(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function setValueIfPresent(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
    return;
  }
  element.value = value;
}

function showStatus(message) {
  if (!saveStatusEl) return;

  saveStatusEl.textContent = message;
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    saveStatusEl.textContent = "";
  }, 2400);
}

function setVersion() {
  if (!appVersionEl) return;

  try {
    appVersionEl.textContent = chrome.runtime.getManifest().version;
  } catch {
    appVersionEl.textContent = "0.1.0";
  }
}

function updateHolidayCategoryState(showHolidays) {
  [
    controls.holidayOfficialIran,
    controls.holidayCultural,
    controls.holidayIslamic
  ].forEach((element) => {
    if (!element) return;
    element.disabled = !showHolidays;
    element.closest(".setting-row")?.classList.toggle("disabled-setting", !showHolidays);
  });
}

function applyControls(settings) {
  setValueIfPresent(controls.theme, settings.theme);
  setValueIfPresent(controls.showHijri, settings.showHijri);
  setValueIfPresent(controls.usePersianNumerals, settings.usePersianNumerals);
  setValueIfPresent(controls.weekStart, settings.weekStart);
  setValueIfPresent(controls.showHolidays, settings.showHolidays);
  setValueIfPresent(controls.highlightWeekends, settings.highlightWeekends);
  setValueIfPresent(controls.autoJumpToTodayOnOpen, settings.autoJumpToTodayOnOpen);
  setValueIfPresent(controls.holidayOfficialIran, settings.holidayTypes.officialIran);
  setValueIfPresent(controls.holidayCultural, settings.holidayTypes.cultural);
  setValueIfPresent(controls.holidayIslamic, settings.holidayTypes.islamic);

  updateHolidayCategoryState(settings.showHolidays);
  applyTheme(settings.theme, root);
}

async function savePatch(patch, message = "Saved") {
  const settings = await saveSettingsPatch(patch);
  applyControls(settings);
  showStatus(message);
}

function bindCheckbox(element, onChange) {
  if (!element) return;

  element.addEventListener("change", async () => {
    await onChange(Boolean(element.checked));
  });
}

function bindSelect(element, onChange) {
  if (!element) return;

  element.addEventListener("change", async () => {
    await onChange(element.value);
  });
}

async function resetDefaults() {
  const settings = await setSettings(DEFAULT_SETTINGS);
  applyControls(settings);
  showStatus("Reset to defaults");
}

async function init() {
  setVersion();
  applyControls(await getSettings());

  bindSelect(controls.theme, async (value) => {
    await savePatch({ theme: value });
  });

  bindCheckbox(controls.showHijri, async (checked) => {
    await savePatch({ showHijri: checked });
  });

  bindCheckbox(controls.usePersianNumerals, async (checked) => {
    await savePatch({ usePersianNumerals: checked });
  });

  bindSelect(controls.weekStart, async (value) => {
    await savePatch({ weekStart: value });
  });

  bindCheckbox(controls.showHolidays, async (checked) => {
    await savePatch({ showHolidays: checked });
  });

  bindCheckbox(controls.highlightWeekends, async (checked) => {
    await savePatch({ highlightWeekends: checked });
  });

  bindCheckbox(controls.autoJumpToTodayOnOpen, async (checked) => {
    await savePatch({ autoJumpToTodayOnOpen: checked });
  });

  bindCheckbox(controls.holidayOfficialIran, async (checked) => {
    await savePatch({ holidayTypes: { officialIran: checked } });
  });

  bindCheckbox(controls.holidayCultural, async (checked) => {
    await savePatch({ holidayTypes: { cultural: checked } });
  });

  bindCheckbox(controls.holidayIslamic, async (checked) => {
    await savePatch({ holidayTypes: { islamic: checked } });
  });

  resetDefaultsBtn?.addEventListener("click", resetDefaults);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async () => {
    const settings = await getSettings();
    if (settings.theme === "system") {
      applyTheme("system", root);
    }
  });

  chrome.storage.onChanged.addListener(async (_changes, areaName) => {
    if (areaName !== "sync") return;
    applyControls(await getSettings());
  });
}

init().catch((error) => {
  console.error("Taqvim options init failed:", error);
});
