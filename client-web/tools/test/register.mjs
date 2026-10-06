// Registers through the in-game form, optionally with an invite code: node tools/test/register.mjs <pageUrl> <user> <email> <password>
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const [url, user, email, pass] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const log = [];
page.on("request", (r) => { if (r.method() === "POST" && /register|getinfo/.test(r.url())) log.push(`>> ${r.url().replace(/^.*\/api\/[^/]+\//, "")} ${r.postData()}`); });
page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(2500);
// find display objects by text: [x, y] in window coordinates
const find = (pred) => page.evaluate((src) => {
  const f = new Function("o", `return (${src})(o)`);
  const out = [];
  const walk = (o) => { if (o.$visible === false) return; try { if (f(o)) { const p = o.localToGlobal({ x: (o.$bx || 0) + (o.$w || 0) / 2, y: (o.$by || 0) + (o.$h || 0) / 2 }); const r = document.querySelector("canvas").getBoundingClientRect(); out.push([p.x + (r.width - 760) / 2, p.y + (r.height - 670) / 2, o.$text]); } } catch {} for (const c of o.$children ?? []) walk(c); };
  walk(window.__player.stage);
  return out;
}, pred.toString());
const [link] = await find((o) => /Register here/.test(o.$text || ""));
await page.mouse.click(link[0], link[1]);
await page.waitForTimeout(1500);
const inputs = await find((o) => o.$type === "input");
log.push(`inputs: ${inputs.map((i) => JSON.stringify(i[2])).join(", ")}`);
const byText = (t) => inputs.find((i) => i[2] === t);
for (const [label, value] of [["Username", user], ["Email", email], ["Password", pass]]) {
  const f = byText(label);
  if (!f) { log.push(`no field ${label}`); continue; }
  await page.mouse.click(f[0], f[1]); await page.keyboard.type(value, { delay: 10 });
}
const [btn] = await find((o) => /^REGISTER$/i.test(o.$text || ""));
if (btn) await page.mouse.click(btn[0], btn[1]); else log.push("no REGISTER button");
await page.waitForTimeout(6000);
await page.screenshot({ path: "/tmp/register.png" });
console.log(log.join("\n"));
await browser.close();
