import { getSettings, saveSettingsPatch } from "../src/ui/storage.js";

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

function bindCheckbox(selectors, onChange) {
  const element = findControl(selectors);
  if (!element) return null;

  element.addEventListener("change", async () => {
    await onChange(Boolean(element.checked));
  });

  return element;
}

function bindSelect(selectors, onChange) {
  const element = findControl(selectors);
  if (!element) return null;

  element.addEventListener("change", async () => {
    await onChange(element.value);
  });

  return element;
}

async function init() {
  const settings = await getSettings();

  const themeEl = bindSelect(
    ["#theme", "#themeSelect", "select[name='theme']"],
    async (value) => {
      await saveSettingsPatch({ theme: value });
    }
  );

  const showHijriEl = bindCheckbox(
    ["#showHijri", "#showHijriDate", "input[name='showHijri']"],
    async (checked) => {
      await saveSettingsPatch({ showHijri: checked });
    }
  );

  const usePersianNumeralsEl = bindCheckbox(
    ["#usePersianNumerals", "input[name='usePersianNumerals']"],
    async (checked) => {
      await saveSettingsPatch({ usePersianNumerals: checked });
    }
  );

  const weekStartEl = bindSelect(
    ["#weekStart", "#weekStartsOn", "select[name='weekStart']"],
    async (value) => {
      await saveSettingsPatch({ weekStart: value });
    }
  );

  const showHolidaysEl = bindCheckbox(
    ["#showHolidays", "input[name='showHolidays']"],
    async (checked) => {
      await saveSettingsPatch({ showHolidays: checked });
    }
  );

  const highlightWeekendsEl = bindCheckbox(
    ["#highlightWeekends", "input[name='highlightWeekends']"],
    async (checked) => {
      await saveSettingsPatch({ highlightWeekends: checked });
    }
  );

  const autoJumpEl = bindCheckbox(
    ["#autoJumpToTodayOnOpen", "#autoJumpToToday", "input[name='autoJumpToTodayOnOpen']"],
    async (checked) => {
      await saveSettingsPatch({ autoJumpToTodayOnOpen: checked });
    }
  );

  const officialIranEl = bindCheckbox(
    [
      "#holidayOfficialIran",
      "#officialIran",
      "input[name='holidayOfficialIran']",
      "input[name='officialIran']"
    ],
    async (checked) => {
      await saveSettingsPatch({ holidayTypes: { officialIran: checked } });
    }
  );

  const culturalEl = bindCheckbox(
    [
      "#holidayCultural",
      "#cultural",
      "input[name='holidayCultural']",
      "input[name='cultural']"
    ],
    async (checked) => {
      await saveSettingsPatch({ holidayTypes: { cultural: checked } });
    }
  );

  const islamicEl = bindCheckbox(
    [
      "#holidayIslamic",
      "#islamic",
      "input[name='holidayIslamic']",
      "input[name='islamic']"
    ],
    async (checked) => {
      await saveSettingsPatch({ holidayTypes: { islamic: checked } });
    }
  );

  setValueIfPresent(themeEl, settings.theme);
  setValueIfPresent(showHijriEl, settings.showHijri);
  setValueIfPresent(usePersianNumeralsEl, settings.usePersianNumerals);
  setValueIfPresent(weekStartEl, settings.weekStart);
  setValueIfPresent(showHolidaysEl, settings.showHolidays);
  setValueIfPresent(highlightWeekendsEl, settings.highlightWeekends);
  setValueIfPresent(autoJumpEl, settings.autoJumpToTodayOnOpen);
  setValueIfPresent(officialIranEl, settings.holidayTypes.officialIran);
  setValueIfPresent(culturalEl, settings.holidayTypes.cultural);
  setValueIfPresent(islamicEl, settings.holidayTypes.islamic);

  chrome.storage.onChanged.addListener(async (_changes, areaName) => {
    if (areaName !== "sync") return;

    const latest = await getSettings();
    setValueIfPresent(themeEl, latest.theme);
    setValueIfPresent(showHijriEl, latest.showHijri);
    setValueIfPresent(usePersianNumeralsEl, latest.usePersianNumerals);
    setValueIfPresent(weekStartEl, latest.weekStart);
    setValueIfPresent(showHolidaysEl, latest.showHolidays);
    setValueIfPresent(highlightWeekendsEl, latest.highlightWeekends);
    setValueIfPresent(autoJumpEl, latest.autoJumpToTodayOnOpen);
    setValueIfPresent(officialIranEl, latest.holidayTypes.officialIran);
    setValueIfPresent(culturalEl, latest.holidayTypes.cultural);
    setValueIfPresent(islamicEl, latest.holidayTypes.islamic);
  });
}

init().catch((error) => {
  console.error("Taqvim options init failed:", error);
});
