import { toJalali } from "../calendar/jalali.js";
import { formatNumber, formatPersianOrderedDate } from "../utils/format.js";
import { getSettings } from "./storage.js";

function getBadgeText(jalaliDate, usePersianNumerals) {
  return formatNumber(jalaliDate.jd, usePersianNumerals);
}

function formatTitle(now, usePersianNumerals) {
  return formatPersianOrderedDate(now, {
    usePersianNumerals,
  });
}

export async function updateBadge() {
  const { usePersianNumerals } = await getSettings();
  const now = new Date();

  await chrome.action.setBadgeBackgroundColor({ color: "#173A70" });

  if (typeof chrome.action.setBadgeTextColor === "function") {
    await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  }

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
