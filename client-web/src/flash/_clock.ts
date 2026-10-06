/**
 * Timers that keep running while the tab is in the background.
 *
 * Browsers slow the timers of a hidden page down to once a second, and after a few minutes to once a
 * minute ("intensive throttling"). Everything in the game runs on timers (the frame loop in
 * player/Player.ts, flash.utils.Timer, setTimeout / setInterval), so a hidden tab nearly stopped: an
 * attack paused, and when the tab came back the game's one-second clock (GLOBAL.Tick, driven by a 50 ms
 * Timer that owes one tick per missed second) raced to catch up.
 *
 * Every timer is set twice: an ordinary one, and an entry here. While the page is hidden a small worker
 * sends a message every few milliseconds (a worker's timers are not slowed down, and neither are
 * messages from it), and each message runs the entries that are due. Whichever comes first runs the
 * timer; the other is cancelled. While the page is visible the worker is stopped and the ordinary
 * timers do the work, as before.
 *
 * Nothing can keep a page running when the browser freezes it outright (phones do this to background
 * tabs and locked screens); the game's own "away too long" stop covers that.
 */
type Job = { due: number; fn: () => void; native: number };

const jobs = new Map<number, Job>();
const intervals = new Map<number, number>();
let seq = 0;
let worker: Worker | null = null;
let workerFailed = false;
let pulsing = false;

const WORKER_SOURCE = "let h=0;onmessage=(e)=>{clearInterval(h);h=e.data?setInterval(()=>postMessage(0),8):0};";

function run(id: number): void {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  globalThis.clearTimeout(job.native);
  job.fn();
}

/** A worker message while hidden: runs every timer that is due, earliest first. */
function pulse(): void {
  if (!jobs.size) return;
  const now = performance.now();
  const due: [number, Job][] = [];
  for (const entry of jobs) if (entry[1].due <= now) due.push(entry);
  if (!due.length) return;
  due.sort((x, y) => x[1].due - y[1].due || x[0] - y[0]);
  for (const [id] of due) run(id);
}

function setPulsing(on: boolean): void {
  if (on === pulsing) return;
  if (on && !worker && !workerFailed) {
    try {
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })));
      worker.onmessage = pulse;
    } catch {
      workerFailed = true; // no workers (or blocked): hidden tabs are slowed down as before
    }
  }
  if (!worker) return;
  pulsing = on;
  worker.postMessage(on ? 1 : 0);
}

/** Whether the page is hidden (another tab in front, window minimised). */
export function pageHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => setPulsing(pageHidden()));
  if (pageHidden()) setPulsing(true);
}

/** Runs `fn` once after `ms` milliseconds, in the background too. Returns an id for cancelTimer. */
export function later(fn: () => void, ms: number): number {
  const id = ++seq;
  const delay = Math.max(0, +ms || 0);
  jobs.set(id, { due: performance.now() + delay, fn, native: globalThis.setTimeout(() => run(id), delay) as unknown as number });
  return id;
}

/** Runs `fn` every `ms` milliseconds (at least 1), in the background too. Returns an id for cancelTimer. */
export function every(fn: () => void, ms: number): number {
  const id = ++seq;
  const delay = Math.max(1, +ms || 0);
  const arm = () => {
    intervals.set(id, later(() => {
      if (!intervals.has(id)) return;
      arm();
      fn();
    }, delay));
  };
  arm();
  return id;
}

/** Cancels a timer from later() or every(). Unknown ids are ignored. */
export function cancelTimer(id: number): void {
  const current = intervals.get(id);
  if (current !== undefined) {
    intervals.delete(id);
    id = current;
  }
  const job = jobs.get(id);
  if (job) {
    jobs.delete(id);
    globalThis.clearTimeout(job.native);
  }
}
