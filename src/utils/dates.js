export const TEHRAN_TIME_ZONE = "Asia/Tehran";

const timeZonePartFormatters = new Map();

function getTimeZonePartFormatter(timeZone) {
  if (!timeZonePartFormatters.has(timeZone)) {
    timeZonePartFormatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23"
      })
    );
  }

  return timeZonePartFormatters.get(timeZone);
}

export function createDateAtNoon(year, month, day) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function getDatePartsInTimeZone(date, timeZone) {
  const parts = getTimeZonePartFormatter(timeZone).formatToParts(date);
  const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const hour = valueOf("hour");

  return {
    year: valueOf("year"),
    month: valueOf("month"),
    day: valueOf("day"),
    hour: hour === 24 ? 0 : hour,
    minute: valueOf("minute"),
    second: valueOf("second")
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

export function getUtcTimestampForTimeZoneDate(
  { year, month, day, hour = 0, minute = 0, second = 0 },
  timeZone
) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    guess = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }

  return guess;
}

export function addDaysToPlainDate({ year, month, day }, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function getNextTehranMidnightTimestamp(now = new Date()) {
  const tehranToday = getDatePartsInTimeZone(now, TEHRAN_TIME_ZONE);
  const tehranTomorrow = addDaysToPlainDate(tehranToday, 1);

  return getUtcTimestampForTimeZoneDate(
    {
      ...tehranTomorrow,
      hour: 0,
      minute: 0,
      second: 5
    },
    TEHRAN_TIME_ZONE
  );
}
