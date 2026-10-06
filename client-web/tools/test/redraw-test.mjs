// Drives the game through many screens and, after each step, compares the incrementally drawn screen
// with a full redraw (__player.verifyRedraw). Every line should report diff 0.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.PAGE || `http://localhost:8080/?serverUrl=${server}`;
await page.goto(`${base}${base.includes("?") ? "&" : "?"}token=${token}&language=english${process.env.SHELL === "1" ? "" : "&shell=0"}`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(9000);
let bad = 0;
const check = async (label) => {
  const r = await page.evaluate(() => { window.__player.render(); return window.__player.verifyRedraw(); });
  // (up to 4 pixels: a text field's clip on a half pixel is smoothed a shade differently when the screen
  // is drawn again in parts; anything bigger is something not drawn again)
  const differs = r.diff > 4;
  if (differs) bad++;
  console.log(`${differs ? "DIFF" : "ok  "} ${label}${r.diff ? `: ${r.diff} px in ${JSON.stringify(r.box)}` : ""}`);
};
const step = async (label, fn, wait = 800) => { await fn(); await page.waitForTimeout(wait); await check(label); };
await check("yard after load (welcome popup)");
await step("close welcome popup", () => page.mouse.click(857, 242));
await step("yard idle 3 s", async () => {}, 3000);
await step("mouse over yard", async () => { for (let i = 0; i < 20; i++) await page.mouse.move(500 + i * 10, 400 + i * 5); });
await step("open daily reward", () => page.mouse.click(38, 313), 2500);
await step("close daily reward", () => page.mouse.click(951, 199), 1500);
await step("open map", () => page.mouse.click(1232, 565), 12000);
await step("close map intro", () => page.mouse.click(832, 127), 1500);
await step("hover map cells", async () => { for (let i = 0; i < 30; i++) await page.mouse.move(600 + i * 8, 250 + i * 4); });
await step("zoom out", () => page.mouse.click(494, 103), 3000);
await step("drag map", async () => { await page.mouse.move(700, 350); await page.mouse.down(); for (let i = 0; i < 15; i++) await page.mouse.move(700 - i * 10, 350 - i * 6); await page.mouse.up(); }, 1500);
await step("zoom in", () => page.mouse.click(494, 103), 3000);
await step("map idle 3 s", async () => {}, 3000);
await step("close map", () => page.mouse.click(993, 91), 6000);
await step("forced monster attack", () => page.evaluate(() => { const W = window.__game.WMATTACK; W.quickly = true; W.TriggerType(2); }), 10000);
await step("attack continues", async () => {}, 2000);
console.log(`\n${bad ? `${bad} step(s) differ` : "all steps match a full redraw"}${errors.length ? `; page errors: ${errors.slice(0, 3).join(" | ")}` : ""}`);
await browser.close();
