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

const monthSelectEl = document.getElementById("monthSelect");
const yearSelectEl = document.getElementById("yearSelect");
const weekdayRowEl = document.getElementById("weekdayRow");
const calendarGridEl = document.getElementById("calendarGrid");

const tehranTimeEl = document.getElementById("tehranTime");
const tehranDateEl = document.getElementById("tehranDate");

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

const YEAR_RANGE = { min: 1300, max: 1500 };
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

function formatYearOption(value) {
  return new Intl.NumberFormat(
    state.settings.usePersianNumerals ? "fa-IR" : "en-US",
    { useGrouping: false, maximumFractionDigits: 0 }
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

function renderWeekdayHeader() {
  const labels = WEEKDAY_LABELS[state.settings.weekStart] || WEEKDAY_LABELS.saturday;
  weekdayRowEl.innerHTML = labels
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

function renderJumpControls() {
  monthSelectEl.innerHTML = JALALI_MONTH_NAMES.map((monthName, index) => {
    const jm = index + 1;
    return `<option value="${jm}">${monthName}</option>`;
  }).join("");

  yearSelectEl.innerHTML = Array.from(
    { length: YEAR_RANGE.max - YEAR_RANGE.min + 1 },
    (_, index) => YEAR_RANGE.min + index
  )
    .map((year) => `<option value="${year}">${formatYearOption(year)}</option>`)
    .join("");

  monthSelectEl.value = String(state.view.jm);
  yearSelectEl.value = String(state.view.jy);
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
  renderJumpControls();
}

function render() {
  applyTheme(state.settings.theme);
  renderWeekdayHeader();
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

function goToMonth(jy, jm) {
  const maxDay = getJalaliMonthLength(jy, jm);

  state.view = { jy, jm };
  state.selected = {
    jy,
    jm,
    jd: Math.min(state.selected.jd, maxDay)
  };

  render();
}

themeToggle.addEventListener("click", cycleTheme);

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
  state.view = {
    jy: todayJalali.jy,
    jm: todayJalali.jm
  };

  state.selected = {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd
  };

  render();
});

monthSelectEl.addEventListener("change", () => {
  goToMonth(state.view.jy, Number(monthSelectEl.value));
});

yearSelectEl.addEventListener("change", () => {
  goToMonth(Number(yearSelectEl.value), state.view.jm);
});

calendarGridEl.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-jy][data-jm][data-jd]");
  if (!cell) return;

  const jy = Number(cell.dataset.jy);
  const jm = Number(cell.dataset.jm);
  const jd = Number(cell.dataset.jd);

  state.selected = { jy, jm, jd };

  if (jy !== state.view.jy || jm !== state.view.jm) {
    state.view = { jy, jm };
  }

  render();
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
