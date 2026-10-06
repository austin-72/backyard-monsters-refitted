// Interaction test: fills the login form and presses LOGIN.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 760, height: 670 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("request", (r) => { if (r.method() === "POST") logs.push(`>> ${r.method()} ${r.url().replace(/^.*\/server\//, "/")} ${r.postData() ?? ""}`); });
const t0 = Date.now();
await page.goto("http://localhost:8080/?serverUrl=http://localhost:3001/");
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
logs.push(`player started after ${Date.now() - t0}ms`);
await page.waitForTimeout(1500);
await page.mouse.click(300, 420);          // email field
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/login-focus.png" });
await page.keyboard.type("tester@example.com", { delay: 20 });
await page.mouse.click(300, 475);          // password field
await page.waitForTimeout(100);
await page.keyboard.type("Hunter22!x", { delay: 20 });
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/login-filled.png" });
await page.mouse.move(380, 573);
await page.waitForTimeout(100);
const cursor = await page.evaluate(() => document.querySelector("canvas").style.cursor);
logs.push(`cursor over LOGIN: ${cursor}`);
await page.mouse.click(380, 573);          // LOGIN
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/login-after.png" });
console.log(logs.filter((l) => !l.includes("Failed to load")).join("\n"));
await browser.close();
