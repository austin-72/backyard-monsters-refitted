/**
 * Inferno-only: when the Wart Bloom is (services/events/wartBloom.ts): every weekend, Friday 6 pm until Sunday
 * midnight, US Central time (daylight saving included). Pure: nothing here touches the server, so it can be
 * tested on its own. (QoL #399: the admin panel's override is handed in by wartBloom.ts.)
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

// ---------------------------------------------------------------------------------------------
// (QoL #399, 16 October) The admin panel's switch: a weekend skipped, a bloom now for some hours, another rate.
// Kept in Redis (admin:wartbloom) by wartBloom.ts, which hands it here (setBloomOverride); none set: as before.
// ---------------------------------------------------------------------------------------------

export interface BloomOverride {
  /** How much faster (2 to 10); none: WART_BLOOM.rate. The game has one rate for every bloom it is sent. */
  rate?: number | null;
  /** Weekend blooms skipped: the one starting at `start`, from `at` (before it started: all of it; during it: the rest). */
  skip?: { start: number; at: number }[];
  /** Blooms added, [start, end] (Unix seconds). */
  extra?: [number, number][];
}

/** The bloom rates the panel can set. */
export const BLOOM_RATE_MIN = 2;
export const BLOOM_RATE_MAX = 10;

let bloomOverride: BloomOverride | null = null;

/** wartBloom.ts: the override as Redis has it (null: none). */
export const setBloomOverride = (o: BloomOverride | null) => {
  bloomOverride = o;
};
export const getBloomOverride = () => bloomOverride;

/** The rate in use. */
export const bloomRate = (o: BloomOverride | null = bloomOverride) => {
  const r = Math.round(Number(o?.rate));
  return Number.isFinite(r) && r >= BLOOM_RATE_MIN && r <= BLOOM_RATE_MAX ? r : WART_BLOOM.rate;
};

/** Windows that overlap or touch made one (the game counts each window's seconds on their own: overlaps would count twice). */
const merged = (list: [number, number][]): [number, number][] => {
  const out: [number, number][] = [];
  for (const [s, e] of [...list].filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
};

/**
 * The blooms with an override applied: skipped weekends left out (or cut at the moment they were skipped), the
 * blooms added put in (those that ended over 8 days ago left out), all merged.
 */
export const applyBloomOverride = (windows: [number, number][], o: BloomOverride | null, nowMs = Date.now()): [number, number][] => {
  if (!o) return windows;
  const now = Math.floor(nowMs / 1000);
  const out: [number, number][] = [];
  for (const [start, end] of windows) {
    const skip = (o.skip ?? []).find((s) => Number(s.start) === start);
    if (!skip) out.push([start, end]);
    else if (Number(skip.at) > start) out.push([start, Math.min(end, Number(skip.at))]);
  }
  for (const x of o.extra ?? []) {
    if (Array.isArray(x) && Number(x[1]) > now - 8 * 86400) out.push([Number(x[0]), Number(x[1])]);
  }
  return merged(out);
};

/** The blooms around a moment as the game is sent them (the override in use applied). */
export const effectiveBloomWindows = (nowMs = Date.now()) => applyBloomOverride(bloomWindows(nowMs), bloomOverride, nowMs);

/** The bloom on now, or null. */
export const currentBloom = (nowMs = Date.now()) => {
  const now = Math.floor(nowMs / 1000);
  return effectiveBloomWindows(nowMs).find(([start, end]) => start <= now && now < end) ?? null;
};

/** The flag the game reads (JSON): {rate, w: [[start, end], ...]}. (QoL #399: with the admin panel's override) */
export const wartBloomFlag = (nowMs = Date.now()) => JSON.stringify({ rate: bloomRate(), w: effectiveBloomWindows(nowMs) });

/** "2 days 6 hours", "5 hours 30 minutes", "40 minutes". */
const span = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds / 60) * 60);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const unit = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (d > 0) return h > 0 ? `${unit(d, "day")} ${unit(h, "hour")}` : unit(d, "day");
  if (h > 0) return m > 0 ? `${unit(h, "hour")} ${unit(m, "minute")}` : unit(h, "hour");
  return unit(Math.max(1, m), "minute");
};

// (QoL #565: how long, rather than "until Sunday midnight (Central time)", which ran into Monday in Europe and
// Asia; the game's chip under the top bar gives the end in the player's own time)
// (QoL #399: the rate in use, 3 unless the admin panel set another)
export const bloomStartText = (secondsLeft: number, rate = WART_BLOOM.rate) => `Wart Bloom! For the next ${span(secondsLeft)}, warts grow ${rate} times as fast in your main yard.`;
export const bloomEndText = (secondsToNext: number) => `The Wart Bloom is over: warts grow at their usual pace again. The next one starts in ${span(secondsToNext)}.`;
