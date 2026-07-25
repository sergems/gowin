/**
 * Recurring lottery schedule helpers.
 *
 * drawTime accepts one or more comma-separated local times, for example:
 * "11:00,23:00".
 */

const DAY_OF_WEEK: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: DAY_OF_WEEK[get("weekday")] ?? -1,
  };
}

function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const naive = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0),
  );
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(naive);
  const get = (type: string) =>
    Number(localParts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    ),
  );

  return new Date(naive.getTime() + (naive.getTime() - localAsUtc.getTime()));
}

export function getDrawTimes(drawTime: string | null | undefined): string[] {
  return (drawTime ?? "")
    .split(",")
    .map((time) => time.trim())
    .filter((time) => /^\d{1,2}:\d{2}$/.test(time))
    .sort((a, b) => {
      const [ah, am] = a.split(":").map(Number);
      const [bh, bm] = b.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
}

export function computeNextLotteryDraw(
  drawTime: string | null | undefined,
  drawDays: number[] | null | undefined,
  timezone: string | null | undefined,
  from = new Date(),
): Date | null {
  const times = getDrawTimes(drawTime);
  if (times.length === 0) return null;

  const tz = timezone || "UTC";
  const days = Array.isArray(drawDays) ? drawDays : [];

  for (let offset = 0; offset <= 8; offset++) {
    const trial = new Date(from.getTime() + offset * 86_400_000);
    const local = localDateParts(trial, tz);
    if (days.length > 0 && !days.includes(local.weekday)) continue;

    for (const time of times) {
      const [hour, minute] = time.split(":").map(Number);
      const candidate = localTimeToUtc(
        local.year,
        local.month,
        local.day,
        hour,
        minute,
        tz,
      );
      if (candidate > from) return candidate;
    }
  }

  return null;
}