// Multitouch input modes under phone emulation: node tools/test/touch-modes-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ ...devices["iPhone 13 landscape"] });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${server}?token=${token}&language=english`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(8000);
await page.evaluate(() => {
  const S = window.__player.stage; window.__log = [];
  const types = ["touchBegin", "touchMove", "touchEnd", "touchTap", "gestureZoom", "gesturePan", "gestureRotate", "mouseDown", "mouseUp", "click", "mouseWheel"];
  for (const t of types) S.addEventListener(t, (e) => window.__log.push({ t, id: e.touchPointID, primary: e.isPrimaryTouchPoint, phase: e.phase, sx: e.scaleX, sid: Math.round(e.stageX) }), true);
  const M = window.__classByName("flash.ui.Multitouch");
  window.__caps = `supportsTouchEvents ${M.supportsTouchEvents}, supportsGestureEvents ${M.supportsGestureEvents}, maxTouchPoints ${M.maxTouchPoints}, gestures ${M.supportedGestures && M.supportedGestures.length}`;
});
console.log(await page.evaluate(() => window.__caps));
const cdp = await ctx.newCDPSession(page);
const vp = page.viewportSize(); const cx = vp.width / 2, cy = vp.height / 2;
const two = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
const run = async (mode) => {
  await page.evaluate((m) => { window.__classByName("flash.ui.Multitouch").inputMode = m; window.__log = []; }, mode);
  // one-finger tap
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(100);
  // two-finger pinch out from 40 to 120 px apart (x3)
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [two(40)[0]] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: two(40) });
  for (let d = 40; d <= 120; d += 8) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: two(d) }); await page.waitForTimeout(20); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
  const log = await page.evaluate(() => window.__log);
  const count = (t) => log.filter((e) => e.t === t).length;
  const zoom = log.filter((e) => e.t === "gestureZoom" && e.phase === "update").reduce((a, e) => a * e.sx, 1);
  const phases = [...new Set(log.filter((e) => e.t === "gestureZoom").map((e) => e.phase))].join("/");
  console.log(`${mode.padEnd(10)} touchBegin ${count("touchBegin")} (primary ${log.filter((e) => e.t === "touchBegin" && e.primary).length}), touchMove ${count("touchMove")}, touchEnd ${count("touchEnd")}, touchTap ${count("touchTap")} | mouseDown ${count("mouseDown")}, click ${count("click")}, wheel ${count("mouseWheel")} | gestureZoom ${count("gestureZoom")} [${phases}] total scale ${zoom.toFixed(2)}`);
};
for (const m of ["none", "touchPoint", "gesture"]) await run(m);
console.log(errors.length ? "page errors: " + errors.slice(0, 3).join(" | ") : "no page errors");
await browser.close();
