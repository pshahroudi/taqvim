import {
  createLocalDate,
  getJalaliMonthLength,
  nextJalaliMonth,
  previousJalaliMonth,
  sameJalaliDate,
  toGregorian,
  toJalali,
} from "../src/calendar/jalali.js";

const root = document.documentElement;

const themeToggle = document.getElementById("themeToggle");
const openSettings = document.getElementById("openSettings");

const todayJalaliEl = document.getElementById("todayJalali");
const todayGregorianEl = document.getElementById("todayGregorian");
const todayHijriEl = document.getElementById("todayHijri");
const holidayStatusEl = document.getElementById("holidayStatus");

const monthTitleEl = document.getElementById("monthTitle");
const monthSubtitleEl = document.getElementById("monthSubtitle");
const calendarGridEl = document.getElementById("calendarGrid");

const selectedJalaliEl = document.getElementById("selectedJalali");
const selectedGregorianEl = document.getElementById("selectedGregorian");
const selectedHijriEl = document.getElementById("selectedHijri");
const selectedHolidayEl = document.getElementById("selectedHoliday");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const goTodayBtn = document.getElementById("goToday");

const jalaliFullFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const jalaliMonthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
});

const gregorianFullFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const gregorianMonthFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
});

const gregorianMonthNameFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const hijriFullFormatter = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const todayDate = new Date();
todayDate.setHours(12, 0, 0, 0);

const todayJalali = toJalali(
  todayDate.getFullYear(),
  todayDate.getMonth() + 1,
  todayDate.getDate(),
);

const state = {
  view: {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
  },
  selected: {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd,
  },
  settings: {
    theme: "system",
    showHijri: false,
  },
};

async function getSettings() {
  const result = await chrome.storage.sync.get(["theme", "showHijri"]);

  return {
    theme: result.theme || "system",
    showHijri: result.showHijri ?? false,
  };
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

function toDisplayDateFromJalali(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return createLocalDate(g.gy, g.gm, g.gd);
}

function getSaturdayIndex(jsDay) {
  return (jsDay + 1) % 7;
}

function getGregorianMonthSubtitle(jy, jm) {
  const daysInMonth = getJalaliMonthLength(jy, jm);

  const firstG = toGregorian(jy, jm, 1);
  const lastG = toGregorian(jy, jm, daysInMonth);

  const firstDate = createLocalDate(firstG.gy, firstG.gm, firstG.gd);
  const lastDate = createLocalDate(lastG.gy, lastG.gm, lastG.gd);

  if (
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth()
  ) {
    return gregorianMonthFormatter.format(firstDate);
  }

  if (firstDate.getFullYear() === lastDate.getFullYear()) {
    return `${gregorianMonthNameFormatter.format(firstDate)} – ${gregorianMonthNameFormatter.format(lastDate)} ${lastDate.getFullYear()}`;
  }

  return `${gregorianMonthFormatter.format(firstDate)} – ${gregorianMonthFormatter.format(lastDate)}`;
}

function renderTodayCard() {
  todayJalaliEl.textContent = jalaliFullFormatter.format(todayDate);
  todayGregorianEl.textContent = gregorianFullFormatter.format(todayDate);
  todayHijriEl.textContent = hijriFullFormatter.format(todayDate);
  todayHijriEl.classList.toggle("hidden", !state.settings.showHijri);
  holidayStatusEl.textContent = "Holiday data comes next";
}

function renderSelectedDetails() {
  const selectedDate = toDisplayDateFromJalali(
    state.selected.jy,
    state.selected.jm,
    state.selected.jd,
  );

  selectedJalaliEl.textContent = jalaliFullFormatter.format(selectedDate);
  selectedGregorianEl.textContent = gregorianFullFormatter.format(selectedDate);
  selectedHijriEl.textContent = hijriFullFormatter.format(selectedDate);
  selectedHijriEl.classList.toggle("hidden", !state.settings.showHijri);
  selectedHolidayEl.textContent = "Holiday data comes next";
}

function buildDayCell(jy, jm, jd, isMuted) {
  const g = toGregorian(jy, jm, jd);
  const date = createLocalDate(g.gy, g.gm, g.gd);
  const gDay = date.getDate();
  const isToday = sameJalaliDate({ jy, jm, jd }, todayJalali);
  const isSelected = sameJalaliDate({ jy, jm, jd }, state.selected);
  const isWeekend = getSaturdayIndex(date.getDay()) === 6;

  const classes = ["day"];
  if (isMuted) classes.push("muted");
  if (isToday) classes.push("today");
  if (isSelected) classes.push("selected");
  if (isWeekend) classes.push("weekend");

  return `
    <button
      type="button"
      class="${classes.join(" ")}"
      data-jy="${jy}"
      data-jm="${jm}"
      data-jd="${jd}"
      aria-label="Jalali ${jy}/${jm}/${jd}"
    >
      <span class="day-j">${jd}</span>
      <span class="day-g">${gDay}</span>
    </button>
  `;
}

function renderMonth() {
  const { jy, jm } = state.view;
  const daysInMonth = getJalaliMonthLength(jy, jm);

  const firstG = toGregorian(jy, jm, 1);
  const firstDate = createLocalDate(firstG.gy, firstG.gm, firstG.gd);
  const firstWeekdayIndex = getSaturdayIndex(firstDate.getDay());

  const prev = previousJalaliMonth(jy, jm);
  const next = nextJalaliMonth(jy, jm);
  const prevMonthLength = getJalaliMonthLength(prev.jy, prev.jm);

  monthTitleEl.textContent = jalaliMonthFormatter.format(firstDate);
  monthSubtitleEl.textContent = getGregorianMonthSubtitle(jy, jm);

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
    jd: Math.min(state.selected.jd, maxDay),
  };

  render();
}

themeToggle.addEventListener("click", cycleTheme);

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
  state.view = {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
  };

  state.selected = {
    jy: todayJalali.jy,
    jm: todayJalali.jm,
    jd: todayJalali.jd,
  };

  render();
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

async function init() {
  state.settings = await getSettings();
  render();
}

init();
