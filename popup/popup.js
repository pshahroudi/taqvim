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
import { formatHijriFull, getHijriParts } from "../src/calendar/hijri.js";
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
import { TEHRAN_TIME_ZONE } from "../src/utils/dates.js";
import {
  JALALI_MONTH_NAMES,
  WEEKDAY_LABELS,
  escapeHtml,
  formatGregorianNumeric,
  formatJalaliNumeric,
  formatNumber as formatDisplayNumber,
  formatPersianOrderedDate as formatOrderedPersianDate,
  padNumber,
  toPersianDigits,
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

const tehranPhaseIconEl = document.getElementById("tehranPhaseIcon");
const tehranTimeEl = document.getElementById("tehranTime");
const tehranDateEl = document.getElementById("tehranDate");
const tehranPersianDateEl = document.getElementById("tehranPersianDate");

const todayJalaliEl = document.getElementById("todayJalali");
const todayGregorianEl = document.getElementById("todayGregorian");
const todayHijriEl = document.getElementById("todayHijri");
const todayHolidayStatusEl = document.getElementById("todayHolidayStatus");
const todayHolidayChipsEl = document.getElementById("todayHolidayChips");

const selectedJalaliEl = document.getElementById("selectedJalali");
const selectedGregorianEl = document.getElementById("selectedGregorian");
const selectedHijriEl = document.getElementById("selectedHijri");
const selectedTodayBadgeEl = document.getElementById("selectedTodayBadge");
const selectedHolidayStatusEl = document.getElementById(
  "selectedHolidayStatus",
);
const selectedHolidayChipsEl = document.getElementById("selectedHolidayChips");
const selectedHolidayListEl = document.getElementById("selectedHolidayList");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const goTodayBtn = document.getElementById("goToday");

const convertSourceEl = document.getElementById("convertSource");
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
const VALID_HOLIDAY_CATEGORIES = ["officialIran", "cultural", "islamic"];
const VALID_HOLIDAY_CALENDARS = ["jalali", "hijri"];

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
    usePersianNumerals: true,
    weekStart: "saturday",
    showHolidays: true,
    holidayTypes: {
      officialIran: true,
      cultural: true,
      islamic: false,
    },
    highlightWeekends: true,
    autoJumpToTodayOnOpen: true,
  },
  holidayData: {
    officialIran: [],
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

const tehranTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const tehranDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TEHRAN_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const tehranHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  hour12: false,
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

function formatTehranClockTime(date) {
  const [hourText, minuteText, secondText] = tehranTimeFormatter
    .format(date)
    .split(":");
  const hour24 = Number(hourText) === 24 ? 0 : Number(hourText);
  const hour12 = hour24 % 12 || 12;
  const meridiemLabel = hour24 < 12 ? "ق.ظ" : "ب.ظ";
  const timeText = `${toPersianDigits(padNumber(hour12))}:${toPersianDigits(minuteText)}:${toPersianDigits(secondText)}`;

  return `<span class="tehran-time-number">${timeText}</span><span class="tehran-time-meridiem">${meridiemLabel}</span>`;
}

function getHolidayCategoryLabel(category) {
  switch (category) {
    case "officialIran":
      return "تعطیل رسمی";
    case "cultural":
      return "مناسبت فرهنگی";
    case "islamic":
      return "مناسبت اسلامی";
    default:
      return "مناسبت";
  }
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

function isWeekend(date) {
  return state.settings.highlightWeekends && date.getDay() === 5;
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
  state.settings = normalizeSettings({ ...state.settings, fontSize: normalized });
  updateFontSizeToggle();
}

function applyTheme(theme) {
  applyThemeClass(theme, root);
  updateThemeToggleIcon();
}

function updateTehranClock() {
  const now = new Date();
  const formattedHour = Number(tehranHourFormatter.format(now));
  const tehranHour = formattedHour === 24 ? 0 : formattedHour;
  const isAmInTehran = tehranHour < 12;

  tehranTimeEl.innerHTML = formatTehranClockTime(now);
  tehranDateEl.textContent = `${tehranDateFormatter.format(now)} · ${TEHRAN_TIME_ZONE}`;
  tehranPersianDateEl.textContent = formatPersianOrderedDate(now, {
    timeZone: TEHRAN_TIME_ZONE,
  });

  if (tehranPhaseIconEl) {
    tehranPhaseIconEl.textContent = isAmInTehran ? "☀" : "☾";
    tehranPhaseIconEl.setAttribute(
      "aria-label",
      isAmInTehran ? "صبح در تهران" : "بعدازظهر در تهران",
    );
    tehranPhaseIconEl.title = isAmInTehran
      ? "صبح در تهران"
      : "بعدازظهر در تهران";
  }
}

function startTehranClock() {
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
  return gregorianMonthYearFormatter.format(toDisplayDateFromJalali(jy, jm, 1));
}

function isHolidayRecordValid(record, expectedCategory) {
  return Boolean(
    record &&
    typeof record.id === "string" &&
    record.id.trim() &&
    VALID_HOLIDAY_CALENDARS.includes(record.calendar) &&
    Number.isInteger(record.month) &&
    record.month >= 1 &&
    record.month <= 12 &&
    Number.isInteger(record.day) &&
    record.day >= 1 &&
    record.day <= 31 &&
    typeof record.title === "string" &&
    record.title.trim() &&
    VALID_HOLIDAY_CATEGORIES.includes(record.category) &&
    record.category === expectedCategory &&
    typeof record.isHoliday === "boolean",
  );
}

function normalizeHolidayDataset(records, expectedCategory) {
  if (!Array.isArray(records)) {
    console.warn(
      `Taqvim holiday dataset for ${expectedCategory} is not an array.`,
    );
    return [];
  }

  const seenIds = new Set();
  const validRecords = [];

  for (const record of records) {
    if (!isHolidayRecordValid(record, expectedCategory)) {
      console.warn("Taqvim ignored invalid holiday record:", record);
      continue;
    }

    if (seenIds.has(record.id)) {
      console.warn(`Taqvim ignored duplicate holiday id: ${record.id}`);
      continue;
    }

    seenIds.add(record.id);
    validRecords.push(record);
  }

  return validRecords;
}

async function loadHolidayData() {
  const [officialIran, cultural, islamic] = await Promise.all([
    fetch(chrome.runtime.getURL("src/data/holidays-ir.json")).then((response) =>
      response.json(),
    ),
    fetch(chrome.runtime.getURL("src/data/holidays-cultural.json")).then(
      (response) => response.json(),
    ),
    fetch(chrome.runtime.getURL("src/data/holidays-islamic.json")).then(
      (response) => response.json(),
    ),
  ]);

  state.holidayData = {
    officialIran: normalizeHolidayDataset(officialIran, "officialIran"),
    cultural: normalizeHolidayDataset(cultural, "cultural"),
    islamic: normalizeHolidayDataset(islamic, "islamic"),
  };
}

function getActiveDatasets() {
  const active = [];
  if (state.settings.holidayTypes?.officialIran)
    active.push(...state.holidayData.officialIran);
  if (state.settings.holidayTypes?.cultural)
    active.push(...state.holidayData.cultural);
  if (state.settings.holidayTypes?.islamic)
    active.push(...state.holidayData.islamic);
  return active;
}

function getHolidayRecordsForDate(date, jalaliDate) {
  if (!state.settings.showHolidays) {
    return [];
  }

  const hijri = getHijriParts(date);

  return getActiveDatasets().filter((record) => {
    if (record.calendar === "jalali") {
      return record.month === jalaliDate.jm && record.day === jalaliDate.jd;
    }

    if (record.calendar === "hijri") {
      return record.month === hijri.hm && record.day === hijri.hd;
    }

    return false;
  });
}

function hasPublicHoliday(records) {
  return records.some((record) => record.isHoliday);
}

function hasObservance(records) {
  return records.some((record) => !record.isHoliday);
}

function dedupeHolidayRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    const key =
      record.id ||
      `${record.category}:${record.calendar}:${record.month}:${record.day}:${record.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getHolidayStatus(records, forToday = false) {
  if (!state.settings.showHolidays) {
    return "Holiday layer hidden";
  }

  if (!records.length) {
    return forToday ? "No holiday today" : "این روز تعطیل نیست";
  }

  if (hasPublicHoliday(records) && hasObservance(records)) {
    return "Public holiday and observances";
  }

  if (hasPublicHoliday(records)) {
    return "تعطیل رسمی";
  }

  return "مناسبت فرهنگی";
}

function getHolidayStatusTone(records) {
  if (!state.settings.showHolidays) return "muted";
  if (!records.length) return "empty";
  if (hasPublicHoliday(records) && hasObservance(records)) return "mixed";
  if (hasPublicHoliday(records)) return "public";
  return "observance";
}

function renderWeekdayLabels(target) {
  const labels =
    WEEKDAY_LABELS[state.settings.weekStart] || WEEKDAY_LABELS.saturday;
  target.innerHTML = labels
    .map((label) => `<div class="rtl-text" dir="rtl">${label}</div>`)
    .join("");
}

function renderHolidayChips(target, records) {
  if (!target) return;

  const uniqueRecords = dedupeHolidayRecords(records);

  if (!uniqueRecords.length) {
    target.innerHTML = "";
    target.classList.add("hidden");
    return;
  }

  target.innerHTML = uniqueRecords
    .map((record) => {
      const chipClass = record.isHoliday ? "public" : "observance";
      return `
        <span class="chip ${chipClass}" lang="fa" dir="rtl">
          <span class="chip-dot"></span>
          <span class="chip-text">${escapeHtml(record.title)}</span>
        </span>
      `;
    })
    .join("");

  target.classList.remove("hidden");
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
      const category = escapeHtml(getHolidayCategoryLabel(record.category));
      const description = record.description
        ? `<div class="holiday-item-body">${escapeHtml(record.description)}</div>`
        : "";
      const note = record.note
        ? `<div class="holiday-item-note">${escapeHtml(record.note)}</div>`
        : "";

      return `
        <div class="holiday-item" lang="fa" dir="rtl">
          <div class="holiday-item-head">
            <span class="holiday-item-dot ${dotClass}"></span>
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

function buildDayCell(jy, jm, jd, isMuted) {
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
    <button
      type="button"
      class="${classes.join(" ")}"
      data-jy="${jy}"
      data-jm="${jm}"
      data-jd="${jd}"
      aria-label="Jalali ${jy}/${jm}/${jd}"
      aria-selected="${isSelected}"
      ${ariaCurrent}
    >
      <span class="day-j">${formatNumber(jd)}</span>
      <span class="day-g ltr-text" lang="en" dir="ltr">${String(gDay)}</span>
      <span class="holiday-marker-row">${markers.join("")}</span>
    </button>
  `;
}

function buildMiniDayCell(jy, jm, jd, isMuted) {
  const date = toDisplayDateFromJalali(jy, jm, jd);
  const records = getHolidayRecordsForDate(date, { jy, jm, jd });
  const isToday = sameJalaliDate({ jy, jm, jd }, todayJalali);
  const isSelected = sameJalaliDate({ jy, jm, jd }, state.selected);

  const classes = ["mini-day"];
  if (isMuted) classes.push("muted");
  if (isToday) classes.push("today");
  if (isSelected) classes.push("selected");
  if (hasPublicHoliday(records)) classes.push("holiday-public");
  else if (hasObservance(records)) classes.push("holiday-observance");

  const ariaCurrent = isToday ? ' aria-current="date"' : "";

  return `
    <button
      type="button"
      class="${classes.join(" ")}"
      data-mini-jy="${jy}"
      data-mini-jm="${jm}"
      data-mini-jd="${jd}"
      aria-label="Jump to ${jy}/${jm}/${jd}"
      aria-selected="${isSelected}"
      ${ariaCurrent}
    >
      ${formatNumber(jd)}
    </button>
  `;
}

function renderTodayCard() {
  const todayRecords = getHolidayRecordsForDate(todayDate, todayJalali);

  todayJalaliEl.textContent = formatPersianOrderedDate(todayDate);
  todayGregorianEl.textContent = gregorianFullFormatter.format(todayDate);
  todayHijriEl.textContent = formatHijriFull(todayDate);
  todayHijriEl.classList.toggle("hidden", !state.settings.showHijri);

  todayHolidayStatusEl.textContent = getHolidayStatus(todayRecords, true);
  renderHolidayChips(todayHolidayChipsEl, todayRecords);
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

  selectedJalaliEl.textContent = formatPersianOrderedDate(selectedDate);
  selectedGregorianEl.textContent = gregorianFullFormatter.format(selectedDate);
  selectedHijriEl.textContent = formatHijriFull(selectedDate);
  selectedHijriEl.classList.toggle("hidden", !state.settings.showHijri);
  selectedTodayBadgeEl?.classList.toggle(
    "hidden",
    !sameJalaliDate(state.selected, todayJalali),
  );

  selectedHolidayStatusEl.textContent = getHolidayStatus(
    selectedRecords,
    false,
  );
  selectedHolidayStatusEl.dataset.tone = getHolidayStatusTone(selectedRecords);

  if (uniqueRecords.length > 1) {
    renderHolidayChips(selectedHolidayChipsEl, uniqueRecords);
  } else {
    selectedHolidayChipsEl.innerHTML = "";
    selectedHolidayChipsEl.classList.add("hidden");
  }

  renderSelectedHolidayList(uniqueRecords);
}

function renderTabs() {
  const isCalendar = state.activeTab === "calendar";

  calendarTabBtn?.classList.toggle("active", isCalendar);
  convertTabBtn?.classList.toggle("active", !isCalendar);
  calendarTabBtn?.setAttribute("aria-selected", String(isCalendar));
  convertTabBtn?.setAttribute("aria-selected", String(!isCalendar));
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

function setConverterFromSelectedDate() {
  if (!convertSourceEl || !convertYearEl || !convertMonthEl || !convertDayEl)
    return;

  convertSourceEl.value = "jalali";
  convertYearEl.value = String(state.selected.jy);
  convertMonthEl.value = String(state.selected.jm);
  convertDayEl.value = String(state.selected.jd);
  updateConverterInputBounds();
}

function updateConverterInputBounds() {
  if (!convertSourceEl || !convertYearEl || !convertMonthEl || !convertDayEl)
    return;

  convertMonthEl.min = "1";
  convertMonthEl.max = "12";

  const year = Number(convertYearEl.value);
  const month = Number(convertMonthEl.value);
  const monthLength = Number.isInteger(year)
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
    year: convertYearEl.value,
    month: convertMonthEl.value,
    day: convertDayEl.value,
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

function parseIntegerInput(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));

  if (!normalized || !/^-?\d+$/.test(normalized)) {
    return Number.NaN;
  }

  return Number(normalized);
}

function normalizePersianDigitString(value) {
  return String(value ?? "")
    .replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])
    .replace(/[٠-٩]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)]);
}

function normalizeJumpYearInputDisplay() {
  const rawValue = String(jumpYearInputEl.value ?? "").trim();

  if (!rawValue) {
    jumpYearInputEl.value = "";
    return;
  }

  const parsedYear = parseIntegerInput(rawValue);

  if (Number.isInteger(parsedYear)) {
    jumpYearInputEl.value = formatNumber(parsedYear);
    return;
  }

  jumpYearInputEl.value = normalizePersianDigitString(rawValue);
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
  const prevMonthLength = getJalaliMonthLength(prev.jy, prev.jm);

  // Always render six calendar rows so day cells keep the same visual size
  // when switching between Jalali months.
  const totalCells = 42;
  let html = "";

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    if (cellIndex < firstWeekdayIndex) {
      const jd = prevMonthLength - firstWeekdayIndex + cellIndex + 1;
      html += buildDayCell(prev.jy, prev.jm, jd, true);
      continue;
    }

    const currentIndex = cellIndex - firstWeekdayIndex + 1;
    if (currentIndex <= daysInMonth) {
      html += buildDayCell(jy, jm, currentIndex, false);
      continue;
    }

    const jd = currentIndex - daysInMonth;
    html += buildDayCell(next.jy, next.jm, jd, true);
  }

  calendarGridEl.innerHTML = html;
}

function render() {
  applyTheme(state.settings.theme);
  applyFontSize(state.settings.fontSize);
  renderTabs();
  updateTehranClock();
  renderWeekdayLabels(weekdayRowEl);
  renderDatePickerToggle();
  renderMiniDatePicker();
  renderTodayCard();
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
}

function closeDatePicker(shouldRender = true) {
  if (!state.datePicker.open) return;
  state.datePicker.open = false;
  if (shouldRender) {
    render();
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

  const next = toJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );

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
  closeDatePicker();
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

[convertSourceEl, convertYearEl, convertMonthEl, convertDayEl].forEach(
  (element) => {
    element.addEventListener("input", renderConverter);
    element.addEventListener("change", renderConverter);
  },
);

document.querySelectorAll(".copy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.dataset.copyTarget;
    await copyText(getCopyValue(targetId));
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
    closeDatePicker();
    return;
  }

  if (state.activeTab !== "calendar" || isEditingControl(event.target)) {
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
  todayHolidayStatusEl.textContent = "Could not load holiday data";
  selectedHolidayStatusEl.textContent = "Could not load holiday data";
  tehranTimeEl.textContent = "--:--";
  tehranDateEl.textContent = TEHRAN_TIME_ZONE;
});
