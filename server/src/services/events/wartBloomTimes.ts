/**
 * Inferno-only: when the Wart Bloom is (services/events/wartBloom.ts): every weekend, Friday 6 pm until Sunday
 * midnight, US Central time (daylight saving included). Pure: nothing here touches the server, so it can be
 * tested on its own.
 */
export const WART_BLOOM = {
  /** How much faster warts grow in a bloom. */
  rate: 3,
  timeZone: "America/Chicago",
  /** Friday (0 is Sunday) at 18:00 ... */
  startDay: 5,
  startHour: 18,
  /** ... until the Monday's 00:00 (Sunday midnight): 54 hours. */
  lengthDays: 3,
};

const DAY_MS = 86_400_000;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: WART_BLOOM.timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The wall clock in the bloom's time zone at a moment. */
const wallClock = (ms: number) => {
  const p: Record<string, string> = {};
  for (const part of partsFormat.formatToParts(new Date(ms))) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
};

/** The moment (ms) a wall-clock time in the bloom's time zone happens (its UTC offset found by trying). */
const fromWallClock = (year: number, month: number, day: number, hour: number) => {
  const wanted = Date.UTC(year, month - 1, day, hour);
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const w = wallClock(guess);
    const shown = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
    guess += wanted - shown;
  }
  return guess;
};

/** The bloom that starts in the week of `ms` (its Friday), as [start, end] in Unix seconds. */
const bloomOfWeek = (ms: number): [number, number] => {
  const w = wallClock(ms);
  // the Friday on or before this day (a Sunday's is two days back: its bloom is still on)
  const back = (w.weekday - WART_BLOOM.startDay + 7) % 7;
  const friday = new Date(Date.UTC(w.year, w.month - 1, w.day) - back * DAY_MS);
  const y = friday.getUTCFullYear();
  const m = friday.getUTCMonth() + 1;
  const d = friday.getUTCDate();
  const end = new Date(Date.UTC(y, m - 1, d) + WART_BLOOM.lengthDays * DAY_MS);
  return [
    Math.floor(fromWallClock(y, m, d, WART_BLOOM.startHour) / 1000),
    Math.floor(fromWallClock(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), 0) / 1000),
  ];
};

/**
 * The blooms around a moment: last week's, this week's and next week's, [start, end] in Unix seconds. The
 * game only needs the last two days or so (10 warts at most: 48 hours' growth), and the next for its banner.
 */
export const bloomWindows = (nowMs = Date.now()): [number, number][] => {
  const seen = new Set<number>();
  const out: [number, number][] = [];
  for (const offset of [-7, 0, 7]) {
    const w = bloomOfWeek(nowMs + offset * DAY_MS);
    if (seen.has(w[0])) continue;
    seen.add(w[0]);
    out.push(w);
  }
  return out.sort((a, b) => a[0] - b[0]);
};

/** The bloom on now, or null. */
export const currentBloom = (nowMs = Date.now()) => {
  const now = Math.floor(nowMs / 1000);
  return bloomWindows(nowMs).find(([start, end]) => start <= now && now < end) ?? null;
};

/** The flag the game reads (JSON): {rate, w: [[start, end], ...]}. */
export const wartBloomFlag = (nowMs = Date.now()) => JSON.stringify({ rate: WART_BLOOM.rate, w: bloomWindows(nowMs) });

