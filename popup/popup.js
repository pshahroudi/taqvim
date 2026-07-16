import {
  createLocalDate,
  getJalaliMonthLength,
  isSupportedJalaliYear,
  nextJalaliMonth,
  previousJalaliMonth,
  sameJalaliDate,
  toGregorian,
  toJalali,
} from "../src/calendar/jalali.js";
import {
  convertDate,
  getCalendarMonthLength,
} from "../src/calendar/converter.js";
import { formatHijriFull } from "../src/calendar/hijri.js";
import {
  dedupeHolidayRecords,
  enrichHolidayRecords,
  getHolidayCategoryLabel,
  getHolidayRecordsForDate as findHolidayRecordsForDate,
  getHolidayStatus,
  getHolidayStatusTone,
  hasObservance,
  hasPublicHoliday,
  normalizeHolidayDataset,
  normalizeOfficialYearDataset,
} from "../src/calendar/holidays.js";
import {
  getSettings,
  normalizeSettings,
  saveSettingsPatch,
} from "../src/ui/storage.js";
import {
  applyFontSize as applyFontSizeClass,
  getFontSizeIcon,
  getFontSizeLabel,
  getNextFontSize,
} from "../src/ui/font-size.js";
import {
  applyTheme as applyThemeClass,
  getNextTheme,
  getThemeIcon,
} from "../src/ui/theme.js";
import { renderTehranClock } from "../src/ui/tehran-clock.js";
import { TEHRAN_TIME_ZONE } from "../src/utils/dates.js";
import {
  normalizeIntegerInputDisplay,
  parseIntegerInput,
} from "../src/utils/numerals.js";
import {
  JALALI_MONTH_NAMES,
  WEEKDAY_LABELS,
  escapeHtml,
  formatGregorianNumeric,
  formatJalaliNumeric,
  formatNumber as formatDisplayNumber,
  formatPersianOrderedDate as formatOrderedPersianDate,
  padNumber,
} from "../src/utils/format.js";

const root = document.documentElement;

const calendarTabBtn = document.getElementById("calendarTab");
const convertTabBtn = document.getElementById("convertTab");
const calendarPanelEl = document.getElementById("calendarPanel");
const convertPanelEl = document.getElementById("convertPanel");

const fontSizeToggle = document.getElementById("fontSizeToggle");
const fontSizeToggleIcon = document.getElementById("fontSizeToggleIcon");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const openSettings = document.getElementById("openSettings");

const datePickerToggleEl = document.getElementById("datePickerToggle");
const datePickerValueEl = document.getElementById("datePickerValue");
const datePickerMetaEl = document.getElementById("datePickerMeta");
const miniDatePickerEl = document.getElementById("miniDatePicker");
const miniPickerCloseEl = document.getElementById("miniPickerClose");
const jumpDateFormEl = document.getElementById("jumpDateForm");
const jumpYearInputEl = document.getElementById("jumpYearInput");
const jumpMonthSelectEl = document.getElementById("jumpMonthSelect");
const jumpDaySelectEl = document.getElementById("jumpDaySelect");
const jumpDateErrorEl = document.getElementById("jumpDateError");
const jumpDatePreviewJalaliEl = document.getElementById(
  "jumpDatePreviewJalali",
);
const jumpDatePreviewGregorianEl = document.getElementById(
  "jumpDatePreviewGregorian",
);
const jumpDateGoBtn = document.getElementById("jumpDateGo");
const miniGoTodayBtn = document.getElementById("miniGoToday");

const weekdayRowEl = document.getElementById("weekdayRow");
const calendarGridEl = document.getElementById("calendarGrid");

const tehranTimeCardEl = document.getElementById("tehranTimeCard");
const tehranPhaseIconEl = document.getElementById("tehranPhaseIcon");
const tehranTimeEl = document.getElementById("tehranTime");
const tehranDateEl = document.getElementById("tehranDate");
const tehranPersianDateEl = document.getElementById("tehranPersianDate");

const selectedJalaliEl = document.getElementById("selectedJalali");
const selectedGregorianEl = document.getElementById("selectedGregorian");
const selectedHijriEl = document.getElementById("selectedHijri");
const selectedTodayBadgeEl = document.getElementById("selectedTodayBadge");
const selectedHolidayStatusEl = document.getElementById(
  "selectedHolidayStatus",
);
const selectedHolidayListEl = document.getElementById("selectedHolidayList");
const convertSelectedDateBtn = document.getElementById("convertSelectedDate");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const goTodayBtn = document.getElementById("goToday");

const convertSourceEl = document.getElementById("convertSource");
const convertUseSelectedBtn = document.getElementById("convertUseSelected");
const convertUseTodayBtn = document.getElementById("convertUseToday");
const convertClearBtn = document.getElementById("convertClear");
const convertYearEl = document.getElementById("convertYear");
const convertMonthEl = document.getElementById("convertMonth");
const convertDayEl = document.getElementById("convertDay");
const convertErrorEl = document.getElementById("convertError");
const convertJalaliEl = document.getElementById("convertJalali");
const convertGregorianEl = document.getElementById("convertGregorian");
const convertHijriEl = document.getElementById("convertHijri");

const todayDate = new Date();
todayDate.setHours(12, 0, 0, 0);

const todayJalali = toJalali(
  todayDate.getFullYear(),
  todayDate.getMonth() + 1,
  todayDate.getDate(),
);

const LAST_VIEW_STORAGE_KEY = "taqvimLastView";

const state = {
  activeTab: "calendar",
  view: {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
  },
  selected: {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd,
  },
  datePicker: {
    open: false,
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd,
  },
  converter: {
    lastValidCopy: {
      jalali: "",
      gregorian: "",
      hijri: "",
    },
  },
  settings: {
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
      islamic: true,
    },
    highlightWeekends: true,
    autoJumpToTodayOnOpen: true,
  },
  holidayData: {
    officialIran: [],
    officialVerified: [],
    officialSources: [],
    cultural: [],
    islamic: [],
  },
  tehranClockInterval: null,
};

const gregorianFullFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const gregorianMonthYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
});

const gregorianMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const gregorianYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
});

function formatPersianOrderedDate(date, { timeZone } = {}) {
  return formatOrderedPersianDate(date, {
    usePersianNumerals: state.settings.usePersianNumerals,
    timeZone,
  });
}

function formatNumber(value) {
  return formatDisplayNumber(value, state.settings.usePersianNumerals);
}

function getWeekIndex(jsDay) {
  switch (state.settings.weekStart) {
    case "sunday":
      return jsDay;
    case "monday":
      return (jsDay + 6) % 7;
    default:
      return (jsDay + 1) % 7;
  }
}

function isIranWeeklyHoliday(date) {
  return date.getDay() === 5;
}

function isWeekend(date) {
  return state.settings.highlightWeekends && isIranWeeklyHoliday(date);
}

function updateThemeToggleIcon() {
  if (!themeToggle) return;

  if (themeToggleIcon) {
    themeToggleIcon.textContent = getThemeIcon(state.settings.theme);
  }
  themeToggle.title = `Theme: ${state.settings.theme}`;
  themeToggle.setAttribute("aria-label", `Theme: ${state.settings.theme}`);
}

function updateFontSizeToggle() {
  if (!fontSizeToggle) return;

  const label = getFontSizeLabel(state.settings.fontSize);
  const nextLabel = getFontSizeLabel(getNextFontSize(state.settings.fontSize));

  if (fontSizeToggleIcon) {
    fontSizeToggleIcon.textContent = getFontSizeIcon(state.settings.fontSize);
  }

  fontSizeToggle.title = `Font size: ${label}`;
  fontSizeToggle.setAttribute(
    "aria-label",
    `Font size: ${label}. Click to switch to ${nextLabel}.`,
  );
}

function applyFontSize(fontSize) {
  const normalized = applyFontSizeClass(fontSize, root);
  state.settings = normalizeSettings({
    ...state.settings,
    fontSize: normalized,
  });
  updateFontSizeToggle();
}

function applyTheme(theme) {
  applyThemeClass(theme, root);
  updateThemeToggleIcon();
}

function updateTehranTimeVisibility() {
  tehranTimeCardEl?.classList.toggle("hidden", !state.settings.showTehranTime);
}

function updateTehranClock() {
  renderTehranClock(
    {
      timeElement: tehranTimeEl,
      dateElement: tehranDateEl,
      persianDateElement: tehranPersianDateEl,
      phaseIconElement: tehranPhaseIconEl,
    },
    {
      formatPersianDate: (date) =>
        formatPersianOrderedDate(date, { timeZone: TEHRAN_TIME_ZONE }),
    },
  );
}

function startTehranClock() {
  updateTehranTimeVisibility();
  updateTehranClock();

  if (state.tehranClockInterval) {
    clearInterval(state.tehranClockInterval);
  }

  state.tehranClockInterval = window.setInterval(updateTehranClock, 1000);
}

function toDisplayDateFromJalali(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return createLocalDate(g.gy, g.gm, g.gd);
}

function formatJalaliMonthYear(jy, jm) {
  return `${JALALI_MONTH_NAMES[jm - 1]} ${formatNumber(jy)}`;
}

function formatGregorianMonthYear(jy, jm) {
  const firstDate = toDisplayDateFromJalali(jy, jm, 1);
  const lastDate = toDisplayDateFromJalali(
    jy,
    jm,
    getJalaliMonthLength(jy, jm),
  );

  const firstMonth = gregorianMonthFormatter.format(firstDate);
  const lastMonth = gregorianMonthFormatter.format(lastDate);
  const firstYear = gregorianYearFormatter.format(firstDate);
  const lastYear = gregorianYearFormatter.format(lastDate);

  if (firstMonth === lastMonth && firstYear === lastYear) {
    return gregorianMonthYearFormatter.format(firstDate);
  }

  if (firstYear === lastYear) {
    return `${firstMonth}–${lastMonth} ${firstYear}`;
  }

  return `${firstMonth} ${firstYear}–${lastMonth} ${lastYear}`;
}

async function loadHolidayData() {
  const [officialIran, official1405, cultural, islamic] = await Promise.all([
    fetch(chrome.runtime.getURL("src/data/holidays-ir.json")).then((response) =>
      response.json(),
    ),
    fetch(
      chrome.runtime.getURL("src/data/holidays-official-1405.json"),
    ).then((response) => response.json()),
    fetch(chrome.runtime.getURL("src/data/holidays-cultural.json")).then(
      (response) => response.json(),
    ),
    fetch(chrome.runtime.getURL("src/data/holidays-islamic.json")).then(
      (response) => response.json(),
    ),
  ]);

  const verified1405 = normalizeOfficialYearDataset(official1405);
  const recurringOfficial = normalizeHolidayDataset(officialIran, "officialIran");
  const calculatedIslamic = normalizeHolidayDataset(islamic, "islamic");

  state.holidayData = {
    officialIran: recurringOfficial,
    officialVerified: enrichHolidayRecords(verified1405.records, [
      ...recurringOfficial,
      ...calculatedIslamic,
    ]),
    officialSources: verified1405.source ? [verified1405.source] : [],
    cultural: normalizeHolidayDataset(cultural, "cultural"),
    islamic: calculatedIslamic,
  };
}

function getHolidayRecordsForDate(date, jalaliDate) {
  return findHolidayRecordsForDate({
    date,
    jalaliDate,
    settings: state.settings,
    holidayData: state.holidayData,
  });
}

function renderWeekdayLabels(target) {
  const labels =
    WEEKDAY_LABELS[state.settings.weekStart] || WEEKDAY_LABELS.saturday;
  target.innerHTML = labels
    .map(
      (label) =>
        `<div class="rtl-text" dir="rtl" role="columnheader">${label}</div>`,
    )
    .join("");
}

function renderSelectedHolidayList(records) {
  const uniqueRecords = dedupeHolidayRecords(records);

  if (!uniqueRecords.length) {
    selectedHolidayListEl.innerHTML = "";
    selectedHolidayListEl.classList.add("hidden");
    return;
  }

  selectedHolidayListEl.innerHTML = uniqueRecords
    .map((record) => {
      const dotClass = record.isHoliday ? "public" : "observance";
      const category = getHolidayCategoryLabel(record.category);
      const description = record.description
        ? `<div class="holiday-item-body">${escapeHtml(record.description)}</div>`
        : "";
      const note = record.note
        ? `<div class="holiday-item-note">${escapeHtml(record.note)}</div>`
        : "";

      return `
        <div
          class="holiday-item"
          lang="fa"
          dir="rtl"
          aria-label="${escapeHtml(`${category}: ${record.title}`)}"
        >
          <div class="holiday-item-head">
            <span class="holiday-item-dot ${dotClass}" aria-hidden="true"></span>
            <div class="holiday-item-title">${escapeHtml(record.title)}</div>
          </div>
          ${description}
          ${note}
        </div>
      `;
    })
    .join("");

  selectedHolidayListEl.classList.remove("hidden");
}

function buildDayCell(jy, jm, jd, isMuted, cellIndex) {
  const g = toGregorian(jy, jm, jd);
  const date = createLocalDate(g.gy, g.gm, g.gd);
  const gDay = date.getDate();
  const records = getHolidayRecordsForDate(date, { jy, jm, jd });
  const isToday = sameJalaliDate({ jy, jm, jd }, todayJalali);
  const isSelected = sameJalaliDate({ jy, jm, jd }, state.selected);

  const classes = ["day"];
  if (isMuted) classes.push("muted");
  if (isToday) classes.push("today");
  if (isSelected) classes.push("selected");
  if (isWeekend(date)) classes.push("weekend");
  if (hasPublicHoliday(records)) classes.push("holiday-public");
  else if (hasObservance(records)) classes.push("holiday-observance");

  const markers = [];
  if (hasPublicHoliday(records)) {
    markers.push(
      '<span class="holiday-marker public" title="Public holiday"></span>',
    );
  }
  if (hasObservance(records)) {
    markers.push(
      '<span class="holiday-marker observance" title="Observance"></span>',
    );
  }

  const ariaCurrent = isToday ? ' aria-current="date"' : "";

  return `
    <div
      class="day-cell"
      role="gridcell"
      aria-rowindex="${Math.floor(cellIndex / 7) + 1}"
      aria-colindex="${(cellIndex % 7) + 1}"
      aria-selected="${isSelected}"
    >
      <button
        type="button"
        class="${classes.join(" ")}"
        data-jy="${jy}"
        data-jm="${jm}"
        data-jd="${jd}"
        aria-label="Jalali ${jy}/${jm}/${jd}"
        tabindex="${isSelected ? "0" : "-1"}"
        ${ariaCurrent}
      >
        <span class="day-j">${formatNumber(jd)}</span>
        <span class="day-g ltr-text" lang="en" dir="ltr">${String(gDay)}</span>
        <span class="holiday-marker-row">${markers.join("")}</span>
      </button>
    </div>
  `;
}

function buildEmptyDayCell(cellIndex) {
  return `
    <span
      class="day-cell day-empty"
      role="gridcell"
      aria-rowindex="${Math.floor(cellIndex / 7) + 1}"
      aria-colindex="${(cellIndex % 7) + 1}"
      aria-hidden="true"
    ></span>
  `;
}

function renderSelectedDetails() {
  const selectedDate = toDisplayDateFromJalali(
    state.selected.jy,
    state.selected.jm,
    state.selected.jd,
  );
  const selectedRecords = getHolidayRecordsForDate(
    selectedDate,
    state.selected,
  );
  const uniqueRecords = dedupeHolidayRecords(selectedRecords);
  const isSelectedWeeklyHoliday = isIranWeeklyHoliday(selectedDate);

  selectedJalaliEl.textContent = formatPersianOrderedDate(selectedDate);
  selectedGregorianEl.textContent = gregorianFullFormatter.format(selectedDate);
  selectedHijriEl.textContent = formatHijriFull(selectedDate);
  selectedHijriEl.classList.toggle("hidden", !state.settings.showHijri);
  selectedTodayBadgeEl?.classList.toggle(
    "hidden",
    !sameJalaliDate(state.selected, todayJalali),
  );

  selectedHolidayStatusEl.textContent = getHolidayStatus(uniqueRecords, {
    showHolidays: state.settings.showHolidays,
    isWeeklyHoliday: isSelectedWeeklyHoliday,
  });
  selectedHolidayStatusEl.dataset.tone = getHolidayStatusTone(uniqueRecords, {
    showHolidays: state.settings.showHolidays,
    isWeeklyHoliday: isSelectedWeeklyHoliday,
  });

  renderSelectedHolidayList(uniqueRecords);
}

function renderTabs() {
  const isCalendar = state.activeTab === "calendar";

  calendarTabBtn?.classList.toggle("active", isCalendar);
  convertTabBtn?.classList.toggle("active", !isCalendar);
  calendarTabBtn?.setAttribute("aria-selected", String(isCalendar));
  convertTabBtn?.setAttribute("aria-selected", String(!isCalendar));
  calendarTabBtn?.setAttribute("tabindex", isCalendar ? "0" : "-1");
  convertTabBtn?.setAttribute("tabindex", isCalendar ? "-1" : "0");
  calendarPanelEl?.classList.toggle("hidden", !isCalendar);
  convertPanelEl?.classList.toggle("hidden", isCalendar);
}

function setActiveTab(tab) {
  state.activeTab = tab;

  if (tab === "convert" && !convertYearEl.value) {
    setConverterFromSelectedDate();
  }

  render();
}

function setConverterFromJalaliDate(jalaliDate) {
  if (!convertSourceEl || !convertYearEl || !convertMonthEl || !convertDayEl)
    return;

  convertSourceEl.value = "jalali";
  convertYearEl.value = formatNumber(jalaliDate.jy);
  convertMonthEl.value = formatNumber(jalaliDate.jm);
  convertDayEl.value = formatNumber(jalaliDate.jd);
  updateConverterInputBounds();
  renderConverter();
}

function setConverterFromSelectedDate() {
  setConverterFromJalaliDate(state.selected);
}

function setConverterFromToday() {
  setConverterFromJalaliDate(todayJalali);
}

function clearConverterInputs() {
  if (!convertYearEl || !convertMonthEl || !convertDayEl) return;

  convertYearEl.value = "";
  convertMonthEl.value = "";
  convertDayEl.value = "";
  renderConverter();
  convertYearEl.focus();
}

function openConverterForSelectedDate() {
  setConverterFromSelectedDate();
  setActiveTab("convert");
}

function updateConverterInputBounds() {
  if (!convertSourceEl || !convertYearEl || !convertMonthEl || !convertDayEl)
    return;

  convertMonthEl.min = "1";
  convertMonthEl.max = "12";

  const year = parseIntegerInput(convertYearEl.value);
  const month = parseIntegerInput(convertMonthEl.value);
  const monthLength =
    Number.isInteger(year) && Number.isInteger(month)
      ? getCalendarMonthLength(convertSourceEl.value, year, month)
      : 31;

  convertDayEl.min = "1";
  convertDayEl.max = String(monthLength || 31);
}

function setConverterResults(result) {
  const usePersianNumerals = state.settings.usePersianNumerals;
  const jalaliNumeric = formatJalaliNumeric(result.jalali, usePersianNumerals);
  const gregorianNumeric = formatGregorianNumeric(result.gregorian);
  const hijriNumeric = `${result.hijri.hy}/${padNumber(result.hijri.hm)}/${padNumber(result.hijri.hd)}`;

  state.converter.lastValidCopy = {
    jalali: jalaliNumeric,
    gregorian: gregorianNumeric,
    hijri: hijriNumeric,
  };

  convertJalaliEl.textContent = `${jalaliNumeric} · ${formatPersianOrderedDate(result.date)}`;
  convertGregorianEl.textContent = `${gregorianNumeric} · ${gregorianFullFormatter.format(result.date)}`;
  convertHijriEl.textContent = `${hijriNumeric} · ${formatHijriFull(result.date)}`;

  resetCopyButtonFeedback();
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.disabled = false;
  });
}

function clearConverterResults() {
  state.converter.lastValidCopy = {
    jalali: "",
    gregorian: "",
    hijri: "",
  };

  convertJalaliEl.textContent = "--";
  convertGregorianEl.textContent = "--";
  convertHijriEl.textContent = "--";

  resetCopyButtonFeedback();
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.disabled = true;
  });
}

function renderConverter() {
  if (!convertSourceEl || !convertYearEl || !convertMonthEl || !convertDayEl)
    return;

  updateConverterInputBounds();

  const hasMissingInput = [
    convertYearEl.value,
    convertMonthEl.value,
    convertDayEl.value,
  ].some((value) => !String(value).trim());

  if (hasMissingInput) {
    convertErrorEl.textContent = "Enter a year, month, and day.";
    convertErrorEl.classList.remove("hidden");
    clearConverterResults();
    return;
  }

  const result = convertDate({
    source: convertSourceEl.value,
    year: parseIntegerInput(convertYearEl.value),
    month: parseIntegerInput(convertMonthEl.value),
    day: parseIntegerInput(convertDayEl.value),
  });

  if (result.error) {
    convertErrorEl.textContent = result.error;
    convertErrorEl.classList.remove("hidden");
    clearConverterResults();
    return;
  }

  convertErrorEl.textContent = "";
  convertErrorEl.classList.add("hidden");
  setConverterResults(result);
}

function renderDatePickerToggle() {
  datePickerValueEl.textContent = formatJalaliMonthYear(
    state.view.jy,
    state.view.jm,
  );
  datePickerMetaEl.textContent = formatGregorianMonthYear(
    state.view.jy,
    state.view.jm,
  );
}

function normalizeJumpYearInputDisplay() {
  jumpYearInputEl.value = normalizeIntegerInputDisplay(
    jumpYearInputEl.value,
    state.settings.usePersianNumerals,
  );
}

function normalizeConverterInputDisplay(input) {
  if (!input) return;
  input.value = normalizeIntegerInputDisplay(
    input.value,
    state.settings.usePersianNumerals,
  );
}

function resetCopyButtonFeedback() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    if (button.dataset.copyResetTimer) {
      window.clearTimeout(Number(button.dataset.copyResetTimer));
      delete button.dataset.copyResetTimer;
    }

    button.classList.remove("copied");
    button.textContent = button.dataset.defaultLabel || "Copy";
  });
}

function showCopyButtonFeedback(button) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim() || "Copy";
  }

  if (button.dataset.copyResetTimer) {
    window.clearTimeout(Number(button.dataset.copyResetTimer));
  }

  button.classList.add("copied");
  button.textContent = "Copied";
  button.dataset.copyResetTimer = String(
    window.setTimeout(() => {
      button.classList.remove("copied");
      button.textContent = button.dataset.defaultLabel || "Copy";
      delete button.dataset.copyResetTimer;
    }, 1200),
  );
}

function populateJumpMonthOptions() {
  if (jumpMonthSelectEl.options.length === 12) return;

  jumpMonthSelectEl.innerHTML = JALALI_MONTH_NAMES.map((monthName, index) => {
    const month = index + 1;
    return `<option value="${month}">${escapeHtml(monthName)}</option>`;
  }).join("");
}

function getJumpPickerInput() {
  return {
    jy: parseIntegerInput(jumpYearInputEl.value),
    jm: Number(jumpMonthSelectEl.value),
    jd: Number(jumpDaySelectEl.value),
  };
}

function validateJumpPickerDate({ jy, jm, jd }) {
  if (!Number.isInteger(jy) || !isSupportedJalaliYear(jy)) {
    return "Enter a supported Jalali year.";
  }

  if (!Number.isInteger(jm) || jm < 1 || jm > 12) {
    return "Choose a Jalali month.";
  }

  const maxDay = getJalaliMonthLength(jy, jm);
  if (!Number.isInteger(jd) || jd < 1 || jd > maxDay) {
    return `Choose a day between 1 and ${maxDay}.`;
  }

  return "";
}

function populateJumpDayOptions(preferredDay = state.datePicker.jd) {
  const jy = parseIntegerInput(jumpYearInputEl.value);
  const jm = Number(jumpMonthSelectEl.value);
  const maxDay =
    Number.isInteger(jy) && isSupportedJalaliYear(jy) && jm >= 1 && jm <= 12
      ? getJalaliMonthLength(jy, jm)
      : 31;
  const selectedDay = Math.min(Math.max(Number(preferredDay) || 1, 1), maxDay);

  jumpDaySelectEl.innerHTML = Array.from({ length: maxDay }, (_item, index) => {
    const day = index + 1;
    const selected = day === selectedDay ? " selected" : "";
    return `<option value="${day}"${selected}>${formatNumber(day)}</option>`;
  }).join("");
}

function renderJumpPickerPreview() {
  const input = getJumpPickerInput();
  const error = validateJumpPickerDate(input);

  jumpDateErrorEl.textContent = error;
  jumpDateErrorEl.classList.toggle("hidden", !error);
  jumpDateGoBtn.disabled = Boolean(error);

  if (error) {
    jumpDatePreviewJalaliEl.textContent = "Select a valid Jalali date";
    jumpDatePreviewGregorianEl.textContent = "";
    return;
  }

  const date = toDisplayDateFromJalali(input.jy, input.jm, input.jd);
  jumpDatePreviewJalaliEl.textContent = formatPersianOrderedDate(date);
  jumpDatePreviewGregorianEl.textContent = gregorianFullFormatter.format(date);
}

function refreshJumpPickerFromInputs() {
  populateJumpDayOptions(jumpDaySelectEl.value || state.datePicker.jd);
  renderJumpPickerPreview();
}

function renderJumpPickerForm() {
  populateJumpMonthOptions();

  jumpYearInputEl.value = formatNumber(state.datePicker.jy);
  jumpMonthSelectEl.value = String(state.datePicker.jm);
  populateJumpDayOptions(state.datePicker.jd);
  renderJumpPickerPreview();
}

function renderMiniDatePicker() {
  datePickerToggleEl.setAttribute(
    "aria-expanded",
    String(state.datePicker.open),
  );
  miniDatePickerEl.classList.toggle("hidden", !state.datePicker.open);

  if (!state.datePicker.open) {
    return;
  }

  renderJumpPickerForm();
}

function renderMonth() {
  const { jy, jm } = state.view;
  const daysInMonth = getJalaliMonthLength(jy, jm);

  const firstG = toGregorian(jy, jm, 1);
  const firstDate = createLocalDate(firstG.gy, firstG.gm, firstG.gd);
  const firstWeekdayIndex = getWeekIndex(firstDate.getDay());

  const prev = previousJalaliMonth(jy, jm);
  const next = nextJalaliMonth(jy, jm);
  const canRenderPrevious = isSupportedJalaliYear(prev.jy);
  const canRenderNext = isSupportedJalaliYear(next.jy);
  const prevMonthLength = canRenderPrevious
    ? getJalaliMonthLength(prev.jy, prev.jm)
    : 0;

  prevMonthBtn.disabled = !canRenderPrevious;
  nextMonthBtn.disabled = !canRenderNext;

  // Always render six calendar rows so day cells keep the same visual size
  // when switching between Jalali months.
  const totalCells = 42;
  let html = "";

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    if (cellIndex < firstWeekdayIndex) {
      if (!canRenderPrevious) {
        html += buildEmptyDayCell(cellIndex);
        continue;
      }
      const jd = prevMonthLength - firstWeekdayIndex + cellIndex + 1;
      html += buildDayCell(prev.jy, prev.jm, jd, true, cellIndex);
      continue;
    }

    const currentIndex = cellIndex - firstWeekdayIndex + 1;
    if (currentIndex <= daysInMonth) {
      html += buildDayCell(jy, jm, currentIndex, false, cellIndex);
      continue;
    }

    if (!canRenderNext) {
      html += buildEmptyDayCell(cellIndex);
      continue;
    }
    const jd = currentIndex - daysInMonth;
    html += buildDayCell(next.jy, next.jm, jd, true, cellIndex);
  }

  calendarGridEl.innerHTML = html;
}

function render() {
  applyTheme(state.settings.theme);
  applyFontSize(state.settings.fontSize);
  renderTabs();
  updateTehranTimeVisibility();
  updateTehranClock();
  renderWeekdayLabels(weekdayRowEl);
  renderDatePickerToggle();
  renderMiniDatePicker();
  renderMonth();
  renderSelectedDetails();
  renderConverter();
}

async function cycleTheme() {
  const nextTheme = getNextTheme(state.settings.theme);

  state.settings = normalizeSettings({ ...state.settings, theme: nextTheme });
  await saveSettingsPatch({ theme: nextTheme });
  applyTheme(state.settings.theme);
}

async function cycleFontSize() {
  const nextFontSize = getNextFontSize(state.settings.fontSize);

  state.settings = normalizeSettings({
    ...state.settings,
    fontSize: nextFontSize,
  });
  await saveSettingsPatch({ fontSize: nextFontSize });
  applyFontSize(state.settings.fontSize);
}

function syncDatePickerToView() {
  const maxDay = getJalaliMonthLength(state.view.jy, state.view.jm);

  state.datePicker.jy = state.view.jy;
  state.datePicker.jm = state.view.jm;
  state.datePicker.jd = Math.min(state.selected.jd || 1, maxDay);
}

function openDatePicker() {
  syncDatePickerToView();
  state.datePicker.open = true;
  render();
  window.requestAnimationFrame(() => {
    jumpYearInputEl.focus();
    jumpYearInputEl.select();
  });
}

function closeDatePicker(shouldRender = true, restoreFocus = false) {
  if (!state.datePicker.open) return;
  state.datePicker.open = false;
  if (shouldRender) {
    render();
  }
  if (restoreFocus) {
    window.requestAnimationFrame(() => datePickerToggleEl.focus());
  }
}

function isValidJalaliDate(jalaliDate) {
  if (
    !jalaliDate ||
    !Number.isInteger(jalaliDate.jy) ||
    !isSupportedJalaliYear(jalaliDate.jy) ||
    !Number.isInteger(jalaliDate.jm) ||
    !Number.isInteger(jalaliDate.jd) ||
    jalaliDate.jm < 1 ||
    jalaliDate.jm > 12
  ) {
    return false;
  }

  return (
    jalaliDate.jd >= 1 &&
    jalaliDate.jd <= getJalaliMonthLength(jalaliDate.jy, jalaliDate.jm)
  );
}

function normalizeLastView(value) {
  if (!value || typeof value !== "object") return null;

  const view = value.view || {};
  const selected = value.selected || {};
  const normalizedView = {
    jy: Number(view.jy),
    jm: Number(view.jm),
  };
  const normalizedSelected = {
    jy: Number(selected.jy),
    jm: Number(selected.jm),
    jd: Number(selected.jd),
  };

  if (
    !Number.isInteger(normalizedView.jy) ||
    !Number.isInteger(normalizedView.jm) ||
    normalizedView.jm < 1 ||
    normalizedView.jm > 12 ||
    !isValidJalaliDate(normalizedSelected)
  ) {
    return null;
  }

  return {
    view: normalizedView,
    selected: normalizedSelected,
  };
}

async function loadLastView() {
  try {
    const result = await chrome.storage.local.get(LAST_VIEW_STORAGE_KEY);
    return normalizeLastView(result[LAST_VIEW_STORAGE_KEY]);
  } catch (error) {
    console.warn("Taqvim could not restore the last popup date:", error);
    return null;
  }
}

function persistLastView() {
  if (state.settings.autoJumpToTodayOnOpen) return;

  chrome.storage.local
    .set({
      [LAST_VIEW_STORAGE_KEY]: {
        view: state.view,
        selected: state.selected,
      },
    })
    .catch((error) => {
      console.warn("Taqvim could not save the last popup date:", error);
    });
}

function focusSelectedDay() {
  const selector = `[data-jy="${state.selected.jy}"][data-jm="${state.selected.jm}"][data-jd="${state.selected.jd}"]`;
  calendarGridEl.querySelector(selector)?.focus();
}

function goToMonth(jy, jm) {
  if (!isSupportedJalaliYear(jy)) return;

  const maxDay = getJalaliMonthLength(jy, jm);

  state.view = { jy, jm };
  state.selected = {
    jy,
    jm,
    jd: Math.min(state.selected.jd, maxDay),
  };
  syncDatePickerToView();
  closeDatePicker(false);
  render();
  persistLastView();
}

function selectJalaliDate(jy, jm, jd, options = {}) {
  state.selected = { jy, jm, jd };
  state.view = { jy, jm };
  syncDatePickerToView();

  if (options.closePicker !== false) {
    state.datePicker.open = false;
  }

  render();
  persistLastView();

  if (options.focusSelected) {
    focusSelectedDay();
  }
}

function moveSelectedByDays(amount) {
  const date = toDisplayDateFromJalali(
    state.selected.jy,
    state.selected.jm,
    state.selected.jd,
  );
  date.setDate(date.getDate() + amount);

  let next;
  try {
    next = toJalali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
  } catch {
    return;
  }

  if (!isSupportedJalaliYear(next.jy)) return;

  selectJalaliDate(next.jy, next.jm, next.jd, { focusSelected: true });
}

function moveSelectedToMonthDay(day) {
  const jd =
    day === "end"
      ? getJalaliMonthLength(state.selected.jy, state.selected.jm)
      : 1;

  selectJalaliDate(state.selected.jy, state.selected.jm, jd, {
    focusSelected: true,
  });
}

function getCopyValue(targetId) {
  const keyMap = {
    convertJalali: "jalali",
    convertGregorian: "gregorian",
    convertHijri: "hijri",
  };
  const key = keyMap[targetId];

  return key ? state.converter.lastValidCopy[key] : "";
}

async function copyText(text) {
  if (!text) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function isEditingControl(target) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName);
}

calendarTabBtn.addEventListener("click", () => {
  setActiveTab("calendar");
});

convertTabBtn.addEventListener("click", () => {
  setActiveTab("convert");
});

[calendarTabBtn, convertTabBtn].forEach((tab, index, tabs) => {
  tab.addEventListener("keydown", (event) => {
    const keyToIndex = {
      ArrowLeft: Math.max(0, index - 1),
      ArrowRight: Math.min(tabs.length - 1, index + 1),
      Home: 0,
      End: tabs.length - 1,
    };

    if (!(event.key in keyToIndex)) return;
    event.preventDefault();
    event.stopPropagation();
    const nextTab = tabs[keyToIndex[event.key]];
    setActiveTab(nextTab === calendarTabBtn ? "calendar" : "convert");
    nextTab.focus();
  });
});

convertSelectedDateBtn?.addEventListener("click", openConverterForSelectedDate);
convertUseSelectedBtn?.addEventListener("click", setConverterFromSelectedDate);
convertUseTodayBtn?.addEventListener("click", setConverterFromToday);
convertClearBtn?.addEventListener("click", clearConverterInputs);

fontSizeToggle?.addEventListener("click", cycleFontSize);

themeToggle.addEventListener("click", cycleTheme);

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

datePickerToggleEl.addEventListener("click", () => {
  if (state.datePicker.open) {
    closeDatePicker();
    return;
  }

  openDatePicker();
});

miniPickerCloseEl.addEventListener("click", () => {
  closeDatePicker(true, true);
});

jumpYearInputEl.addEventListener("input", () => {
  normalizeJumpYearInputDisplay();
  refreshJumpPickerFromInputs();
});

jumpYearInputEl.addEventListener("change", () => {
  normalizeJumpYearInputDisplay();
  refreshJumpPickerFromInputs();
});

jumpYearInputEl.addEventListener("blur", normalizeJumpYearInputDisplay);

jumpMonthSelectEl.addEventListener("input", refreshJumpPickerFromInputs);
jumpMonthSelectEl.addEventListener("change", refreshJumpPickerFromInputs);

jumpDaySelectEl.addEventListener("change", renderJumpPickerPreview);

jumpDateFormEl.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = getJumpPickerInput();
  if (validateJumpPickerDate(input)) {
    renderJumpPickerPreview();
    return;
  }

  selectJalaliDate(input.jy, input.jm, input.jd, { focusSelected: true });
});

miniGoTodayBtn.addEventListener("click", () => {
  selectJalaliDate(todayJalali.jy, todayJalali.jm, todayJalali.jd, {
    focusSelected: true,
  });
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (state.settings.theme === "system") {
      applyTheme("system");
    }
  });

prevMonthBtn.addEventListener("click", () => {
  const prev = previousJalaliMonth(state.view.jy, state.view.jm);
  goToMonth(prev.jy, prev.jm);
});

nextMonthBtn.addEventListener("click", () => {
  const next = nextJalaliMonth(state.view.jy, state.view.jm);
  goToMonth(next.jy, next.jm);
});

goTodayBtn.addEventListener("click", () => {
  selectJalaliDate(todayJalali.jy, todayJalali.jm, todayJalali.jd);
});

convertSourceEl.addEventListener("input", renderConverter);
convertSourceEl.addEventListener("change", renderConverter);

[convertYearEl, convertMonthEl, convertDayEl].forEach((element) => {
  const normalizeAndRenderConverter = () => {
    normalizeConverterInputDisplay(element);
    renderConverter();
  };

  element.addEventListener("input", normalizeAndRenderConverter);
  element.addEventListener("change", normalizeAndRenderConverter);
  element.addEventListener("blur", normalizeAndRenderConverter);
});

document.querySelectorAll(".copy-btn").forEach((button) => {
  button.dataset.defaultLabel = button.textContent.trim() || "Copy";

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    const targetId = button.dataset.copyTarget;
    await copyText(getCopyValue(targetId));
    showCopyButtonFeedback(button);
  });
});

calendarGridEl.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-jy][data-jm][data-jd]");
  if (!cell) return;

  selectJalaliDate(
    Number(cell.dataset.jy),
    Number(cell.dataset.jm),
    Number(cell.dataset.jd),
  );
});

document.addEventListener("click", (event) => {
  if (!state.datePicker.open) return;

  const target = event.target;
  const clickedDatePickerToggle = datePickerToggleEl?.contains(target);
  const clickedMiniDatePicker = miniDatePickerEl?.contains(target);

  if (clickedDatePickerToggle || clickedMiniDatePicker) return;

  closeDatePicker();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDatePicker(true, true);
    return;
  }

  if (
    state.activeTab !== "calendar" ||
    isEditingControl(event.target) ||
    !calendarGridEl.contains(event.target)
  ) {
    return;
  }

  const movement = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };

  if (event.key in movement) {
    event.preventDefault();
    moveSelectedByDays(movement[event.key]);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    moveSelectedToMonthDay("start");
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    moveSelectedToMonthDay("end");
  }
});

chrome.storage.onChanged.addListener(async (_changes, areaName) => {
  if (areaName !== "sync") return;

  state.settings = await getSettings();
  render();
});

async function init() {
  state.settings = await getSettings();
  await loadHolidayData();

  if (state.settings.autoJumpToTodayOnOpen) {
    state.view = { jy: todayJalali.jy, jm: todayJalali.jm };
    state.selected = {
      jy: todayJalali.jy,
      jm: todayJalali.jm,
      jd: todayJalali.jd,
    };
  } else {
    const restored = await loadLastView();
    if (restored) {
      state.view = restored.view;
      state.selected = restored.selected;
    }
  }

  syncDatePickerToView();
  setConverterFromSelectedDate();
  startTehranClock();
  render();
}

init().catch((error) => {
  console.error("Taqvim popup init failed:", error);
  selectedHolidayStatusEl.textContent = "Could not load holiday data";
  tehranTimeEl.textContent = "--:--";
  tehranDateEl.textContent = TEHRAN_TIME_ZONE;
});
