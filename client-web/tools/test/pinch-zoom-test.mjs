// Phone emulation: pinch together / apart over the yard with the game's IoPinchZoom installed.
//   node tools/test/pinch-zoom-test.mjs ["Pixel 7 landscape"]
// Expects: TOUCH_POINT mode, exactly one zoom step per pinch (GLOBAL._zoomed toggles), no wheel events.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const deviceName = process.argv[2] || "Pixel 7 landscape";
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ ...devices[deviceName] });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${process.env.PAGE || server}?token=${token}&language=english`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(10000);
await page.evaluate(() => { window.__wheels = 0; const ED = window.__classByName("flash.events::EventDispatcher").prototype, o = ED.dispatchEvent; ED.dispatchEvent = function (e) { if (e.type === "mouseWheel") window.__wheels++; return o.call(this, e); }; });
const zoomed = () => page.evaluate(() => window.__game.GLOBAL._zoomed);
const mode = await page.evaluate(() => window.__classByName("flash.ui::Multitouch").inputMode);
const cdp = await ctx.newCDPSession(page);
const vp = page.viewportSize(); const cx = vp.width / 2, cy = vp.height / 2 + 40;
const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
const pinch = async (from, to) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(from) });
  const step = from < to ? 10 : -10;
  for (let d = from; step > 0 ? d <= to : d >= to; d += step) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) }); await page.waitForTimeout(30); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1500);
};
const z0 = await zoomed();
await pinch(160, 30);            // fingers together: zoom out one step
const z1 = await zoomed();
await pinch(30, 160);            // fingers apart: zoom in one step
const z2 = await zoomed();
console.log(JSON.stringify({ deviceName, mode, zoomedStart: z0, afterPinchIn: z1, afterPinchOut: z2, wheelEvents: await page.evaluate(() => window.__wheels), errors }));
await page.screenshot({ path: process.env.OUT || "/tmp/pinch.png" });
await browser.close();
