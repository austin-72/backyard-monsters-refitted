// On-screen keyboard focus under phone emulation: node tools/test/keyboard-test.mjs
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
// close the welcome popup (modal) first
const ok = await page.evaluate(() => { let b = null; const B = window.__game.Button; const w = (o) => { if (!b && o instanceof B && o.stage && o.visible && o._txt && o._txt.text === "OK") b = o; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); if (!b) return null; const r = b.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
if (ok) { await page.touchscreen.tap(ok.x, ok.y); await page.waitForTimeout(800); }
const field = await page.evaluate(() => { let t = null; const TF = window.__classByName("flash.text::TextField"); const w = (o) => { if (!t && o instanceof TF && o.$type === "input" && o.stage && o.visible) t = o; for (const c of o.$children ?? []) w(c); }; w(window.__player.stage); window.__field = t; const r = t.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
const status = () => page.evaluate(() => { const a = document.activeElement, S = window.__player.stage; return { native: a && a.tagName, gameFocus: S.focus === window.__field, userSelect: getComputedStyle(document.querySelector("textarea")).webkitUserSelect || getComputedStyle(document.querySelector("textarea")).userSelect, text: window.__field.text }; });
await page.touchscreen.tap(field.x, field.y);
console.log("right after the tap:", JSON.stringify(await status()));
await page.waitForTimeout(1000);
console.log("one second later:  ", JSON.stringify(await status()));
await page.keyboard.type("hello from the phone");
await page.waitForTimeout(300);
console.log("after typing:      ", JSON.stringify(await status()));
await page.evaluate(() => document.querySelector("textarea").blur());   // like the iOS keyboard's "Done"
await page.waitForTimeout(200);
console.log("after 'Done' blur: ", JSON.stringify(await status()));
await page.touchscreen.tap(field.x, field.y); await page.waitForTimeout(300);
const vp = page.viewportSize();
await page.touchscreen.tap(vp.width / 2, vp.height / 3); await page.waitForTimeout(300);   // tap elsewhere on the game
console.log("tap elsewhere:     ", JSON.stringify(await status()));
console.log(errors.length ? "page errors: " + errors.slice(0, 3).join(" | ") : "no page errors");
await browser.close();
