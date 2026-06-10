const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function utcParts(iso: string) {
  const d = new Date(iso);
  return {
    dow:   DAYS[d.getUTCDay()],
    dowLong: DAYS_LONG[d.getUTCDay()],
    day:   d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    monthNum: d.getUTCMonth(),
    year:  d.getUTCFullYear(),
    hh:    pad(d.getUTCHours()),
    mm:    pad(d.getUTCMinutes()),
  };
}

/** "HH:mm" in UTC */
export function fmtUTCTime(iso: string): string {
  const { hh, mm } = utcParts(iso);
  return `${hh}:${mm}`;
}

/** "d MMM · HH:mm" in UTC — used in bet slip and history */
export function fmtUTCDateTimeShort(iso: string): string {
  const { day, month, hh, mm } = utcParts(iso);
  return `${day} ${month} · ${hh}:${mm}`;
}

/** "MMM d, HH:mm" in UTC — used in admin tables */
export function fmtUTCDateTimeAdmin(iso: string): string {
  const { day, month, hh, mm } = utcParts(iso);
  return `${month} ${day}, ${hh}:${mm}`;
}

/** "EEE d MMM · HH:mm" in UTC — used in fixture detail header */
export function fmtUTCDateTimeLong(iso: string): string {
  const { dow, day, month, hh, mm } = utcParts(iso);
  return `${dow} ${day} ${month} · ${hh}:${mm}`;
}

/** "yyyy-MM-dd" date key using UTC date — for grouping fixtures */
export function utcDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Human-readable day label from a UTC date key */
export function utcDateLabel(key: string): string {
  const today    = utcDateKey(new Date().toISOString());
  const tomorrow = utcDateKey(new Date(Date.now() + 86_400_000).toISOString());
  if (key === today)    return "Today";
  if (key === tomorrow) return "Tomorrow";
  const d = new Date(key + "T12:00:00Z");
  const dow  = DAYS_LONG[d.getUTCDay()];
  const day  = d.getUTCDate();
  const mon  = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${dow}, ${day} ${mon} ${year}`;
}

/** "d Mon" — compact date for print slip */
export function fmtUTCDateCompact(iso: string): string {
  const { day, month } = utcParts(iso);
  return `${day} ${month}`;
}
