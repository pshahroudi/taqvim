// Convert one date through Taqvim's real converter and print all three calendars.
//
//   node .claude/skills/jalali-date-math/scripts/convert-date.mjs jalali 1403 12 30
//   node .claude/skills/jalali-date-math/scripts/convert-date.mjs gregorian 2026 3 20
//   node .claude/skills/jalali-date-math/scripts/convert-date.mjs hijri 1447 10 1
//
// Uses src/calendar/converter.js convertDate(), so validation messages and the
// supported-range guard are the ones users see in the Convert tab.
import { convertDate } from "../../../../src/calendar/converter.js";
import {
  MAX_JALALI_YEAR,
  MIN_JALALI_YEAR,
  getJalaliMonthLength,
  isLeapJalaliYear,
  isSupportedJalaliYear
} from "../../../../src/calendar/jalali.js";
import { formatHijriFull } from "../../../../src/calendar/hijri.js";

const [source, year, month, day] = process.argv.slice(2);
if (!["jalali", "gregorian", "hijri"].includes(source) || !year || !month || !day) {
  console.error("usage: convert-date.mjs <jalali|gregorian|hijri> <year> <month> <day>");
  console.error(`supported Jalali years: ${MIN_JALALI_YEAR}..${MAX_JALALI_YEAR}`);
  process.exit(2);
}

const result = convertDate({ source, year, month, day });
if (result.error) {
  console.log(`error: ${result.error}`);
  process.exit(1);
}

const { jalali, gregorian, hijri, date } = result;
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
console.log(`jalali     ${jalali.jy}/${jalali.jm}/${jalali.jd}`);
console.log(`gregorian  ${gregorian.gy}-${String(gregorian.gm).padStart(2, "0")}-${String(gregorian.gd).padStart(2, "0")}  (${weekday})`);
console.log(`hijri      ${hijri.hy}/${hijri.hm}/${hijri.hd}  (${formatHijriFull(date)}, Intl "islamic" calendar)`);
if (isSupportedJalaliYear(jalali.jy)) {
  console.log(
    `jalali ${jalali.jy}: ${isLeapJalaliYear(jalali.jy) ? "LEAP (Esfand has 30 days)" : "common (Esfand has 29 days)"}; month ${jalali.jm} has ${getJalaliMonthLength(jalali.jy, jalali.jm)} days`
  );
}
console.log(`local Date  ${date.toString()}  (pinned to 12:00 by createLocalDate)`);
