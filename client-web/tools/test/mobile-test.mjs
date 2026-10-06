// Phone emulation test: node tools/test/mobile-test.mjs ["iPhone 13 landscape" | "Pixel 7 landscape" | ...]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const deviceName = process.argv[2] || "iPhone 13 landscape";
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ ...devices[deviceName] });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${process.env.PAGE || server}?token=${token}&language=english`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(8000);
const state = () => page.evaluate(() => { const c = document.querySelector("canvas"), P = window.__player; return { mobile: document.documentElement.classList.contains("bw-m"), viewport: `${innerWidth}x${innerHeight}`, stage: `${P.stage.stageWidth}x${P.stage.stageHeight}`, canvas: `${c.width}x${c.height}`, dpr: devicePixelRatio, rotateTip: !!document.querySelector(".bw-rotate") }; });
console.log(deviceName, JSON.stringify(await state()));
const safe = (n) => n.replace(/\W+/g, "-");
await page.screenshot({ path: `/tmp/mobile-${safe(deviceName)}-1.png` });
// client position of a display object's centre
const clientOf = (fn) => page.evaluate((src) => { const f = new Function("return " + src)(); const o = f(); if (!o) return null; const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, fn.toString());
// tap the welcome popup's OK button
const ok = await clientOf(() => { let b = null; const B = window.__game.Button; const w = (o) => { if (!b && o instanceof B && o.stage && o.visible && o._txt && o._txt.text === "OK") b = o; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); return b; });
if (ok) { await page.touchscreen.tap(ok.x, ok.y); await page.waitForTimeout(800); }
console.log("tapped OK:", !!ok, "popup still open:", await page.evaluate(() => { let n = 0; const B = window.__game.Button; const w = (o) => { if (o instanceof B && o.stage && o.visible && o._txt && o._txt.text === "OK") n++; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); return n > 0; }));
// pinch (two fingers apart) over the yard: count wheel events the game receives
// (0 once the game installs IoPinchZoom: it switches to TOUCH_POINT and zooms itself; see pinch-zoom-test.mjs)
await page.evaluate(() => { window.__wheels = 0; const ED = window.__classByName("flash.events::EventDispatcher").prototype, o = ED.dispatchEvent; ED.dispatchEvent = function (e) { if (e.type === "mouseWheel") window.__wheels++; return o.call(this, e); }; });
const cdp = await ctx.newCDPSession(page);
const vp = page.viewportSize(); const cx = vp.width / 2, cy = vp.height / 2;
const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(30) });
for (let d = 30; d <= 150; d += 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) }); await page.waitForTimeout(30); }
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(500);
console.log("pinch -> wheel events delivered to the game:", await page.evaluate(() => window.__wheels));
// tap the chat input: the hidden textarea must take focus (that's what raises the phone keyboard)
const chat = await clientOf(() => { let t = null; const TF = window.__classByName("flash.text::TextField"); const w = (o) => { if (!t && o instanceof TF && o.$type === "input" && o.stage && o.visible) t = o; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); return t; });
if (chat) { await page.touchscreen.tap(chat.x, chat.y); await page.waitForTimeout(400); }
console.log("tapped a text field:", !!chat, "native input focused:", await page.evaluate(() => document.activeElement && document.activeElement.tagName));
await page.screenshot({ path: `/tmp/mobile-${safe(deviceName)}-2.png` });
console.log(errors.length ? "page errors: " + errors.slice(0, 3).join(" | ") : "no page errors");
await browser.close();
