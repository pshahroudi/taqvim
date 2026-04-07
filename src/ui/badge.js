import { toJalali } from "../calendar/jalali.js";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function createTodayDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

function getBadgeText(dayNumber, usePersianNumerals) {
  return usePersianNumerals ? toPersianDigits(dayNumber) : String(dayNumber);
}

function formatTitle(date, usePersianNumerals) {
  const locale = usePersianNumerals ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian";
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return `Taqvim — ${formatter.format(date)}`;
}

export async function updateBadge() {
  const settings = await chrome.storage.sync.get([
    "usePersianNumerals"
  ]);

  const usePersianNumerals = settings.usePersianNumerals ?? true;
  const today = createTodayDate();
  const jalali = toJalali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  await chrome.action.setBadgeText({
    text: getBadgeText(jalali.jd, usePersianNumerals)
  });
  await chrome.action.setTitle({
    title: formatTitle(today, usePersianNumerals)
  });
}
