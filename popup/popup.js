import {
  createLocalDate,
  getJalaliMonthLength,
  nextJalaliMonth,
  previousJalaliMonth,
  sameJalaliDate,
  toGregorian,
  toJalali
} from "../src/calendar/jalali.js";
import { getSettings, normalizeSettings } from "../src/ui/storage.js";

const root = document.documentElement;

const themeToggle = document.getElementById("themeToggle");
const openSettings = document.getElementById("openSettings");

const datePickerToggleEl = document.getElementById("datePickerToggle");
const datePickerValueEl = document.getElementById("datePickerValue");
const datePickerMetaEl = document.getElementById("datePickerMeta");
const miniDatePickerEl = document.getElementById("miniDatePicker");
const miniPickerCloseEl = document.getElementById("miniPickerClose");
const miniPrevMonthBtn = document.getElementById("miniPrevMonth");
const miniNextMonthBtn = document.getElementById("miniNextMonth");
const miniPickerTitleEl = document.getElementById("miniPickerTitle");
const miniPickerSubtitleEl = document.getElementById("miniPickerSubtitle");
const miniWeekdayRowEl = document.getElementById("miniWeekdayRow");
const miniCalendarGridEl = document.getElementById("miniCalendarGrid");
const miniGoTodayBtn = document.getElementById("miniGoToday");

const weekdayRowEl = document.getElementById("weekdayRow");
const calendarGridEl = document.getElementById("calendarGrid");

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
const selectedHolidayStatusEl = document.getElementById("selectedHolidayStatus");
const selectedHolidayChipsEl = document.getElementById("selectedHolidayChips");
const selectedHolidayListEl = document.getElementById("selectedHolidayList");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const goTodayBtn = document.getElementById("goToday");

const todayDate = new Date();
todayDate.setHours(12, 0, 0, 0);

const todayJalali = toJalali(
  todayDate.getFullYear(),
  todayDate.getMonth() + 1,
  todayDate.getDate()
);

const TEHRAN_TIME_ZONE = "Asia/Tehran";

const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
];

const WEEKDAY_LABELS = {
  saturday: ["ش", "ی", "د", "س", "چ", "پ", "ج"],
  sunday: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
  monday: ["د", "س", "چ", "پ", "ج", "ش", "ی"]
};

const state = {
  view: {
    jy: todayJalali.jy,
    jm: todayJalali.jm
  },
  selected: {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd
  },
  datePicker: {
    open: false,
    jy: todayJalali.jy,
    jm: todayJalali.jm
  },
  settings: {
    theme: "system",
    showHijri: false,
    usePersianNumerals: true,
    weekStart: "saturday",
    showHolidays: true,
    holidayTypes: {
      officialIran: true,
      cultural: true,
      islamic: false
    },
    highlightWeekends: true,
    autoJumpToTodayOnOpen: true
  },
  holidayData: {
    officialIran: [],
    cultural: [],
    islamic: []
  },
  tehranClockInterval: null
};

const gregorianFullFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
});

const gregorianMonthYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long"
});

const hijriFullFormatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-nu-latn", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const hijriPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

const tehranTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const tehranDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TEHRAN_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric"
});

function getTehranPersianDateFormatter() {
  return new Intl.DateTimeFormat(
    state.settings.usePersianNumerals ? "fa-IR-u-ca-persian" : "fa-IR-u-ca-persian-nu-latn",
    {
      timeZone: TEHRAN_TIME_ZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}

function getJalaliFormatter(usePersianNumerals) {
  return new Intl.DateTimeFormat(
    usePersianNumerals ? "fa-IR-u-ca-persian" : "fa-IR-u-ca-persian-nu-latn",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    state.settings.usePersianNumerals ? "fa-IR" : "en-US",
    { useGrouping: false }
  ).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function applyTheme(theme) {
  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (theme === "light") {
    root.classList.remove("dark");
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", prefersDark);
}

function updateTehranClock() {
  const now = new Date();
  tehranTimeEl.textContent = tehranTimeFormatter.format(now);
  tehranDateEl.textContent = `${tehranDateFormatter.format(now)} · ${TEHRAN_TIME_ZONE}`;
  tehranPersianDateEl.textContent = getTehranPersianDateFormatter().format(now);
}

function startTehranClock() {
  updateTehranClock();

  if (state.tehranClockInterval) {
    clearInterval(state.tehranClockInterval);
  }

  state.tehranClockInterval = window.setInterval(updateTehranClock, 30000);
}

function toDisplayDateFromJalali(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return createLocalDate(g.gy, g.gm, g.gd);
}

function getHijriParts(date) {
  const parts = hijriPartsFormatter.formatToParts(date);
  const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    hy: valueOf("year"),
    hm: valueOf("month"),
    hd: valueOf("day")
  };
}

function formatJalaliMonthYear(jy, jm) {
  return `${JALALI_MONTH_NAMES[jm - 1]} ${formatNumber(jy)}`;
}

function formatGregorianMonthYear(jy, jm) {
  return gregorianMonthYearFormatter.format(toDisplayDateFromJalali(jy, jm, 1));
}

async function loadHolidayData() {
  const [officialIran, cultural, islamic] = await Promise.all([
    fetch(chrome.runtime.getURL("src/data/holidays-ir.json")).then((response) => response.json()),
    fetch(chrome.runtime.getURL("src/data/holidays-cultural.json")).then((response) => response.json()),
    fetch(chrome.runtime.getURL("src/data/holidays-islamic.json")).then((response) => response.json())
  ]);

  state.holidayData = { officialIran, cultural, islamic };
}

function getActiveDatasets() {
  const active = [];
  if (state.settings.holidayTypes?.officialIran) active.push(...state.holidayData.officialIran);
  if (state.settings.holidayTypes?.cultural) active.push(...state.holidayData.cultural);
  if (state.settings.holidayTypes?.islamic) active.push(...state.holidayData.islamic);
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
    const key = `${record.category}:${record.title}`;
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
    return forToday ? "No holiday today" : "No holiday on this day";
  }

  if (hasPublicHoliday(records) && hasObservance(records)) {
    return "Public holiday and observances";
  }

  if (hasPublicHoliday(records)) {
    return "Public holiday";
  }

  return "Observance";
}

function renderWeekdayLabels(target) {
  const labels = WEEKDAY_LABELS[state.settings.weekStart] || WEEKDAY_LABELS.saturday;
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
    .map((record) => `
      <div class="holiday-item" lang="fa" dir="rtl">
        <div class="holiday-item-title">${escapeHtml(record.title)}</div>
        ${record.description ? `<div class="holiday-item-body">${escapeHtml(record.description)}</div>` : ""}
        <div class="holiday-item-foot">
          ${escapeHtml(getHolidayCategoryLabel(record.category))}
          ${record.note ? ` • ${escapeHtml(record.note)}` : ""}
        </div>
      </div>
    `)
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
    markers.push('<span class="holiday-marker public" title="Public holiday"></span>');
  }
  if (hasObservance(records)) {
    markers.push('<span class="holiday-marker observance" title="Observance"></span>');
  }

  return `
    <button
      type="button"
      class="${classes.join(" ")}"
      data-jy="${jy}"
      data-jm="${jm}"
      data-jd="${jd}"
      aria-label="Jalali ${jy}/${jm}/${jd}"
    >
      <span class="day-j">${formatNumber(jd)}</span>
      <span class="day-g">${formatNumber(gDay)}</span>
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

  return `
    <button
      type="button"
      class="${classes.join(" ")}"
      data-mini-jy="${jy}"
      data-mini-jm="${jm}"
      data-mini-jd="${jd}"
      aria-label="Jump to ${jy}/${jm}/${jd}"
    >
      ${formatNumber(jd)}
    </button>
  `;
}

function renderTodayCard() {
  const jalaliFormatter = getJalaliFormatter(state.settings.usePersianNumerals);
  const todayRecords = getHolidayRecordsForDate(todayDate, todayJalali);

  todayJalaliEl.textContent = jalaliFormatter.format(todayDate);
  todayGregorianEl.textContent = gregorianFullFormatter.format(todayDate);
  todayHijriEl.textContent = hijriFullFormatter.format(todayDate);
  todayHijriEl.classList.toggle("hidden", !state.settings.showHijri);

  todayHolidayStatusEl.textContent = getHolidayStatus(todayRecords, true);
  renderHolidayChips(todayHolidayChipsEl, todayRecords);
}

function renderSelectedDetails() {
  const selectedDate = toDisplayDateFromJalali(
    state.selected.jy,
    state.selected.jm,
    state.selected.jd
  );
  const selectedRecords = getHolidayRecordsForDate(selectedDate, state.selected);
  const jalaliFormatter = getJalaliFormatter(state.settings.usePersianNumerals);

  selectedJalaliEl.textContent = jalaliFormatter.format(selectedDate);
  selectedGregorianEl.textContent = gregorianFullFormatter.format(selectedDate);
  selectedHijriEl.textContent = hijriFullFormatter.format(selectedDate);
  selectedHijriEl.classList.toggle("hidden", !state.settings.showHijri);

  selectedHolidayStatusEl.textContent = getHolidayStatus(selectedRecords, false);
  renderHolidayChips(selectedHolidayChipsEl, selectedRecords);
  renderSelectedHolidayList(selectedRecords);
}

function renderDatePickerToggle() {
  datePickerValueEl.textContent = formatJalaliMonthYear(state.view.jy, state.view.jm);
  datePickerMetaEl.textContent = formatGregorianMonthYear(state.view.jy, state.view.jm);
}

function renderMiniDatePicker() {
  datePickerToggleEl.setAttribute("aria-expanded", String(state.datePicker.open));
  miniDatePickerEl.classList.toggle("hidden", !state.datePicker.open);

  if (!state.datePicker.open) {
    return;
  }

  miniPickerTitleEl.textContent = formatJalaliMonthYear(state.datePicker.jy, state.datePicker.jm);
  miniPickerSubtitleEl.textContent = formatGregorianMonthYear(state.datePicker.jy, state.datePicker.jm);
  renderWeekdayLabels(miniWeekdayRowEl);

  const { jy, jm } = state.datePicker;
  const daysInMonth = getJalaliMonthLength(jy, jm);
  const firstG = toGregorian(jy, jm, 1);
  const firstDate = createLocalDate(firstG.gy, firstG.gm, firstG.gd);
  const firstWeekdayIndex = getWeekIndex(firstDate.getDay());
  const prev = previousJalaliMonth(jy, jm);
  const next = nextJalaliMonth(jy, jm);
  const prevMonthLength = getJalaliMonthLength(prev.jy, prev.jm);
  const totalCells = Math.ceil((firstWeekdayIndex + daysInMonth) / 7) * 7;

  let html = "";
  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    if (cellIndex < firstWeekdayIndex) {
      const jd = prevMonthLength - firstWeekdayIndex + cellIndex + 1;
      html += buildMiniDayCell(prev.jy, prev.jm, jd, true);
      continue;
    }

    const currentIndex = cellIndex - firstWeekdayIndex + 1;
    if (currentIndex <= daysInMonth) {
      html += buildMiniDayCell(jy, jm, currentIndex, false);
      continue;
    }

    const jd = currentIndex - daysInMonth;
    html += buildMiniDayCell(next.jy, next.jm, jd, true);
  }

  miniCalendarGridEl.innerHTML = html;
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

  const totalCells = Math.ceil((firstWeekdayIndex + daysInMonth) / 7) * 7;
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
  updateTehranClock();
  renderWeekdayLabels(weekdayRowEl);
  renderDatePickerToggle();
  renderMiniDatePicker();
  renderTodayCard();
  renderMonth();
  renderSelectedDetails();
}

async function cycleTheme() {
  const order = ["system", "light", "dark"];
  const currentIndex = order.indexOf(state.settings.theme);
  const nextTheme = order[(currentIndex + 1) % order.length];

  state.settings.theme = nextTheme;
  await chrome.storage.sync.set({ theme: nextTheme });
  applyTheme(nextTheme);
}

function syncDatePickerToView() {
  state.datePicker.jy = state.view.jy;
  state.datePicker.jm = state.view.jm;
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

function goToMonth(jy, jm) {
  const maxDay = getJalaliMonthLength(jy, jm);

  state.view = { jy, jm };
  state.selected = {
    jy,
    jm,
    jd: Math.min(state.selected.jd, maxDay)
  };
  syncDatePickerToView();
  closeDatePicker(false);
  render();
}

function selectJalaliDate(jy, jm, jd, options = {}) {
  state.selected = { jy, jm, jd };
  state.view = { jy, jm };
  syncDatePickerToView();

  if (options.closePicker !== false) {
    state.datePicker.open = false;
  }

  render();
}

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

miniPrevMonthBtn.addEventListener("click", () => {
  const prev = previousJalaliMonth(state.datePicker.jy, state.datePicker.jm);
  state.datePicker.jy = prev.jy;
  state.datePicker.jm = prev.jm;
  render();
});

miniNextMonthBtn.addEventListener("click", () => {
  const next = nextJalaliMonth(state.datePicker.jy, state.datePicker.jm);
  state.datePicker.jy = next.jy;
  state.datePicker.jm = next.jm;
  render();
});

miniGoTodayBtn.addEventListener("click", () => {
  selectJalaliDate(todayJalali.jy, todayJalali.jm, todayJalali.jd);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
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

calendarGridEl.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-jy][data-jm][data-jd]");
  if (!cell) return;

  selectJalaliDate(
    Number(cell.dataset.jy),
    Number(cell.dataset.jm),
    Number(cell.dataset.jd)
  );
});

miniCalendarGridEl.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-mini-jy][data-mini-jm][data-mini-jd]");
  if (!cell) return;

  selectJalaliDate(
    Number(cell.dataset.miniJy),
    Number(cell.dataset.miniJm),
    Number(cell.dataset.miniJd)
  );
});

document.addEventListener("click", (event) => {
  if (!state.datePicker.open) return;
  if (event.target.closest(".date-picker-anchor")) return;
  closeDatePicker();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDatePicker();
  }
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "sync") return;

  const updates = {};
  for (const [key, change] of Object.entries(changes)) {
    updates[key] = change.newValue;
  }

  state.settings = normalizeSettings({ ...state.settings, ...updates });
  render();
});

async function init() {
  state.settings = await getSettings();
  await loadHolidayData();

  if (state.settings.autoJumpToTodayOnOpen) {
    state.view = { jy: todayJalali.jy, jm: todayJalali.jm };
    state.selected = { jy: todayJalali.jy, jm: todayJalali.jm, jd: todayJalali.jd };
  }

  syncDatePickerToView();
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
