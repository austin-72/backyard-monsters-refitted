// The login page's "What's different?" button (Inferno, 2 October): top right, across from the language
// picker; it opens the overview of every change to the base game, as a PDF, in a new page (through the
// server's /whats-different, which points at the current copy in server/public/docs/).
//   node tools/test/whats-different-test.mjs
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${server}?language=english&shell=0`);
await page.waitForFunction(() => { let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === "ioWhatsDifferent") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player && window.__player.stage); return !!hit; }, null, { timeout: 60000 });
await page.waitForTimeout(1000);
const button = await page.evaluate(() => {
  let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === "ioWhatsDifferent") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage);
  const r = hit.getBounds(window.__player.stage); const T = window.__classByName("flash.text::TextField");
  let text = ""; for (const c of hit.$children) if (c instanceof T) text = c.text;
  return { text, x: r.x, y: r.y, w: r.width, h: r.height, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) };
});
await page.screenshot({ path: `${OUT}/whats-different-login.png` });
check("the button, top right", button.text === "WHAT'S DIFFERENT?" && button.y < 30 && button.x + button.w > 700, JSON.stringify(button));
// (the address the new page opened, from its own requests: headless Chromium's PDF viewer reports ":" as
// the page's address)
let pdfUrl = "";
context.on("response", (r) => { if (r.url().includes("/docs/") && r.status() === 200) pdfUrl = r.url(); });
const [popup] = await Promise.all([context.waitForEvent("page", { timeout: 15000 }), page.mouse.click(button.at.x, button.at.y)]);
await popup.waitForLoadState("domcontentloaded").catch(() => {});
await page.waitForTimeout(1500);
const url = /\.pdf/.test(popup.url()) ? popup.url() : pdfUrl;
check("it opens a new page on the PDF", /\/docs\/Inferno-Maproom-2-changes\.pdf\?v=\d+$/.test(url), url);
const r = await fetch(url);
const bytes = new Uint8Array(await r.arrayBuffer());
check("the PDF is served", r.ok && /pdf/.test(r.headers.get("content-type") || "") && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-", `${r.status} ${r.headers.get("content-type")} ${bytes.length} bytes`);
check("the game stays on the login page", page.url().startsWith(server) && !page.url().includes(".pdf"), page.url());
check("no page errors", errors.length === 0, errors.join("; "));
await browser.close();
