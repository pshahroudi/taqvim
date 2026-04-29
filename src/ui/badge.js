import { toJalali } from "../calendar/jalali.js";
import { TEHRAN_TIME_ZONE, getDatePartsInTimeZone } from "../utils/dates.js";
import { formatNumber, formatPersianOrderedDate } from "../utils/format.js";
import { DEFAULT_SETTINGS } from "./storage.js";

function getBadgeText(dayNumber, usePersianNumerals) {
  return formatNumber(dayNumber, usePersianNumerals);
}

function formatTitle(now, usePersianNumerals) {
  return `Taqvim - Tehran date: ${formatPersianOrderedDate(now, {
    usePersianNumerals,
    timeZone: TEHRAN_TIME_ZONE
  })}`;
}

export async function updateBadge() {
  const settings = await chrome.storage.sync.get([
    "usePersianNumerals"
  ]);

  const usePersianNumerals =
    settings.usePersianNumerals ?? DEFAULT_SETTINGS.usePersianNumerals;
  const now = new Date();
  const tehranDate = getDatePartsInTimeZone(now, TEHRAN_TIME_ZONE);
  const jalali = toJalali(
    tehranDate.year,
    tehranDate.month,
    tehranDate.day
  );

  await chrome.action.setBadgeBackgroundColor({ color: "#9d745c" });
  await chrome.action.setBadgeText({
    text: getBadgeText(jalali.jd, usePersianNumerals)
  });
  await chrome.action.setTitle({
    title: formatTitle(now, usePersianNumerals)
  });
}
