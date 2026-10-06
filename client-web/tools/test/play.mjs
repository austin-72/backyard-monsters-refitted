// End-to-end: log in through the UI against a local server and watch the base load.
//   node tools/test/play.mjs [seconds] [serverUrl]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const secs = Number(process.argv[2] || 15);
const server = process.argv[3] || "http://localhost:3001/";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 760, height: 670 } });
const seen = new Map();
const note = (k) => seen.set(k, (seen.get(k) || 0) + 1);
page.on("console", (m) => { if (!m.text().includes("Failed to load resource")) note(`[${m.type()}] ${m.text().slice(0, 500)}`); });
page.on("pageerror", (e) => note(`[pageerror] ${e.message} ${(e.stack || "").split("\n").slice(1, 4).join(" | ")}`));
page.on("response", (r) => { if (r.status() >= 400) note(`[http ${r.status()}] ${r.request().method()} ${r.url().replace(server, "/")}`); });
page.on("request", (r) => { if (r.url().startsWith(server) && !/\.(png|jpg|mp3|json)$/.test(r.url())) note(`>> ${r.method()} ${r.url().replace(server, "/")}`); });
await page.goto(`http://localhost:8080/?serverUrl=${server}`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.mouse.click(300, 420);
await page.keyboard.type(process.env.EMAIL || "tester@example.com");
await page.mouse.click(300, 475);
await page.keyboard.type(process.env.PASSWORD || "Hunter22!x");
await page.mouse.click(380, 573);
for (let t = 1; t <= secs; t++) {
  await page.waitForTimeout(1000);
  if (t % 5 === 0 || t === secs) await page.screenshot({ path: `/tmp/play-${t}.png` });
}
for (const [k, n] of seen) console.log(n > 1 ? `(x${n}) ${k}` : k);
await browser.close();
