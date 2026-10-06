// Opens the game already logged in (token FlashVar) and screenshots the base.
//   node tools/test/base.mjs [seconds] [width] [height]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const secs = Number(process.argv[2] || 12), W = Number(process.argv[3] || 1024), H = Number(process.argv[4] || 700);
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL || "tester@example.com")}&password=${encodeURIComponent(process.env.PASSWORD || "Hunter22!x")}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: (process.env.CHROME_ARGS || "").split(" ").filter(Boolean) });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 1) });
if (process.env.INIT_SCRIPT) await page.addInitScript(process.env.INIT_SCRIPT);
const seen = new Map();
const note = (k) => seen.set(k, (seen.get(k) || 0) + 1);
page.on("console", (m) => { if (!m.text().includes("Failed to load resource")) note(`[${m.type()}] ${m.text().slice(0, 600)}`); });
page.on("pageerror", (e) => note(`[pageerror] ${e.message} ${(e.stack || "").split("\n").slice(1, 4).join(" | ")}`));
page.on("response", (r) => { if (r.status() >= 400) note(`[http ${r.status()}] ${r.request().method()} ${r.url().replace(server, "/")}`); });
// PAGE: the client's address (default: the dev server, pointed at SERVER with the serverUrl FlashVar)
const base = process.env.PAGE || `http://localhost:8080/?serverUrl=${server}`;
await page.goto(`${base}${base.includes("?") ? "&" : "?"}token=${token}&language=${process.env.LANG_FILE || "english"}${process.env.SHELL === "1" ? "" : "&shell=0"}`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(secs * 1000);
// optional scripted clicks: CLICKS="x,y;x,y" (window coordinates), each followed by a short wait
for (const c of (process.env.CLICKS || "").split(";").filter(Boolean)) {
  const [x, y] = c.split(",").map(Number);
  await page.mouse.click(x, y);
  await page.waitForTimeout(1200);
}
if (process.env.PRE_EVAL) console.log("pre:", await page.evaluate(process.env.PRE_EVAL));
// optional step script: STEPS="c:x,y w:ms m:x,y s:name k:Key d:x,y u:x,y"
for (const step of (process.env.STEPS || "").split(/\s+/).filter(Boolean)) {
  const [op, arg] = [step[0], step.slice(2)];
  const [a, b] = arg.split(",").map(Number);
  if (op === "c") { await page.mouse.click(a, b); await page.waitForTimeout(400); }
  else if (op === "m") { await page.mouse.move(a, b, { steps: 5 }); await page.waitForTimeout(150); }
  else if (op === "d") { await page.mouse.move(a, b); await page.mouse.down(); }
  else if (op === "u") { await page.mouse.move(a, b, { steps: 10 }); await page.mouse.up(); }
  else if (op === "w") await page.waitForTimeout(a);
  else if (op === "k") await page.keyboard.press(arg);
  else if (op === "s") await page.screenshot({ path: `/tmp/step-${arg}.png` });
}
await page.screenshot({ path: process.env.OUT || "/tmp/base.png" });
if (process.env.EVAL) console.log(await page.evaluate(process.env.EVAL));
for (const [k, n] of seen) console.log(n > 1 ? `(x${n}) ${k}` : k);
await browser.close();
