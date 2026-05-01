import { toJalali } from "../calendar/jalali.js";
import { formatNumber, formatPersianOrderedDate } from "../utils/format.js";
import { DEFAULT_SETTINGS } from "./storage.js";

function getBadgeText(jalaliDate, usePersianNumerals) {
  return formatNumber(jalaliDate.jd, usePersianNumerals);
}

function formatTitle(now, usePersianNumerals) {
  return formatPersianOrderedDate(now, {
    usePersianNumerals,
  });
}

export async function updateBadge() {
  const settings = await chrome.storage.sync.get(["usePersianNumerals"]);

  const usePersianNumerals =
    settings.usePersianNumerals ?? DEFAULT_SETTINGS.usePersianNumerals;
  const now = new Date();

  await chrome.action.setBadgeBackgroundColor({ color: "#000000" });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });

  try {
    const jalali = toJalali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );

    await chrome.action.setBadgeText({
      text: getBadgeText(jalali, usePersianNumerals),
    });
    await chrome.action.setTitle({
      title: formatTitle(now, usePersianNumerals),
    });
  } catch (error) {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({
      title: "Taqvim - date unavailable",
    });
    console.warn("Taqvim badge update skipped:", error);
  }
}
