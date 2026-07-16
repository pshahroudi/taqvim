import { TEHRAN_TIME_ZONE } from "../utils/dates.js";
import { padNumber, toPersianDigits } from "../utils/format.js";
import { getIconSvg } from "./icons.js";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TEHRAN_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric"
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  hour12: false
});

export function getTehranClockSnapshot(date = new Date()) {
  const [hourText, minuteText, secondText] = timeFormatter.format(date).split(":");
  const hour24 = Number(hourText) === 24 ? 0 : Number(hourText);
  const hour12 = hour24 % 12 || 12;
  const isMorning = hour24 < 12;
  const timeText = `${toPersianDigits(padNumber(hour12))}:${toPersianDigits(
    minuteText
  )}:${toPersianDigits(secondText)}`;

  return {
    timeText,
    meridiemLabel: isMorning ? "ق.ظ" : "ب.ظ",
    dateText: `${dateFormatter.format(date)} · ${TEHRAN_TIME_ZONE}`,
    isMorning,
    phaseIcon: isMorning ? "sun" : "moon",
    phaseLabel: isMorning ? "صبح در تهران" : "بعدازظهر در تهران"
  };
}

export function renderTehranClock(
  { timeElement, dateElement, persianDateElement, phaseIconElement },
  { date = new Date(), formatPersianDate }
) {
  if (!timeElement || !dateElement || !persianDateElement) return;

  const snapshot = getTehranClockSnapshot(date);
  timeElement.innerHTML =
    `<span class="tehran-time-number">${snapshot.timeText}</span>` +
    `<span class="tehran-time-meridiem">${snapshot.meridiemLabel}</span>`;
  dateElement.textContent = snapshot.dateText;
  persianDateElement.textContent = formatPersianDate(date);

  if (phaseIconElement) {
    phaseIconElement.innerHTML = getIconSvg(snapshot.phaseIcon);
    phaseIconElement.setAttribute("aria-label", snapshot.phaseLabel);
    phaseIconElement.title = snapshot.phaseLabel;
  }
}
