// A game tab in the background must keep running at full speed. Browsers slow the timers of hidden
// tabs to once a second, and after a while to once a minute ("intensive throttling"): the game paused,
// and when the tab came back it raced to catch up (the attack timer ran fast).
//
// Needs a real browser window with its own tab switching, so this drives Chromium directly over the
// DevTools protocol (Playwright keeps every page "visible" and switches the throttling off), under a
// virtual display, with intensive throttling starting after 10 s instead of 5 minutes:
//   EMAIL=... PASSWORD=... CHROMIUM_PATH=... xvfb-run -a node tools/test/background-test.mjs [seconds hidden, default 90]
// Prints one line per check; every line must end in "ok".
import { spawn } from "node:child_process";
const server = process.env.SERVER || "http://localhost:3001/";
const hiddenSecs = Number(process.argv[2] || 90);
const port = 9300 + Math.floor(Math.random() * 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const chrome = spawn(process.env.CHROMIUM_PATH, [
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/bgtest-${Date.now()}`, "--no-first-run", "--no-default-browser-check", "--no-sandbox",
  "--enable-features=IntensiveWakeUpThrottling:grace_period_seconds/10", "--window-size=1280,900",
  `${server}?token=${token}&language=english&shell=0`,
], { stdio: "ignore" });
let targets = null;
for (let i = 0; i < 100 && !targets?.length; i++) { await sleep(200); try { targets = (await (await fetch(`http://localhost:${port}/json`)).json()).filter((t) => t.type === "page"); } catch {} }
const game = targets[0];
const ws = new WebSocket(game.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const waiting = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;
await send("Runtime.enable");
const errors = [];
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails?.exception?.description?.slice(0, 200)); });
for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__game && window.__game.GLOBAL._loadmode === "build")`)) break; await sleep(500); }
await sleep(6000);
// game seconds (GLOBAL.t: the one-second tick that also runs the attack timer), frames, time spent drawing
const sample = async () => ({ ...(await ev(`({ t: __game.GLOBAL.t, frames: __player.stats.frames, drawn: __player.stats.renderMs, vis: document.visibilityState, halted: __game.GLOBAL.isHalted })`)), at: Date.now() });

// another tab over the game
const blank = await (await fetch(`http://localhost:${port}/json/new?about:blank`, { method: "PUT" })).json();
await sleep(1000);
const a = await sample();
check("game tab is hidden", a.vis === "hidden", a.vis);
const mid = [];
for (let s = 0; s < hiddenSecs; s += 15) { await sleep(Math.min(15, hiddenSecs - s) * 1000); mid.push(await sample()); }
const b = mid[mid.length - 1];
const secs = (b.at - a.at) / 1000;
const fps = (b.frames - a.frames) / secs;
check(`game clock keeps time while hidden (${secs.toFixed(0)} s)`, Math.abs((b.t - a.t) - secs) <= 2, `${b.t - a.t} game seconds (${mid.map((m) => m.t - a.t).join(", ")})`);
check("frames keep running while hidden", fps > 15, `${fps.toFixed(1)} fps`);
check("nothing drawn while hidden", b.drawn - a.drawn < 100, `${(b.drawn - a.drawn).toFixed(0)} ms drawing`);

// back to the game
await fetch(`http://localhost:${port}/json/activate/${game.id}`);
await sleep(300);
const c = await sample();
await sleep(3000);
const d = await sample();
const back = (d.t - c.t) / ((d.at - c.at) / 1000);
check("game tab visible again", d.vis === "visible", d.vis);
check("no catch-up rush after coming back", back < 1.5, `${back.toFixed(2)} game seconds per second`);
check("game clock right overall", Math.abs((d.t - a.t) - (d.at - a.at) / 1000) <= 2, `${d.t - a.t} game s in ${((d.at - a.at) / 1000).toFixed(1)} s`);
check("drawing again", d.drawn > c.drawn);
check("not stopped", !d.halted);
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await fetch(`http://localhost:${port}/json/close/${blank.id}`).catch(() => {});
chrome.kill();
process.exit(0);
