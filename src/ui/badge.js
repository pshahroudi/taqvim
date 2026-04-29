import { toJalali } from "../calendar/jalali.js";
import { TEHRAN_TIME_ZONE, getDatePartsInTimeZone } from "../utils/dates.js";
import { formatNumber, formatPersianOrderedDate } from "../utils/format.js";
import { DEFAULT_SETTINGS } from "./storage.js";

function getBadgeText(jalaliDate, usePersianNumerals) {
  return formatNumber(jalaliDate.jd, usePersianNumerals);
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

  await chrome.action.setBadgeBackgroundColor({ color: "#2f80ed" });

  try {
    const jalali = toJalali(
      tehranDate.year,
      tehranDate.month,
      tehranDate.day
    );

    await chrome.action.setBadgeText({
      text: getBadgeText(jalali, usePersianNumerals)
    });
    await chrome.action.setTitle({
      title: formatTitle(now, usePersianNumerals)
    });
  } catch (error) {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({
      title: "Taqvim - date unavailable"
    });
    console.warn("Taqvim badge update skipped:", error);
  }
}
