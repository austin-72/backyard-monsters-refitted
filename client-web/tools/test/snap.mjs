// Loads the client in headless Chromium, prints console output, saves a screenshot.
//   node tools/test/snap.mjs [url] [out.png] [waitMs]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const url = process.argv[2] || "http://localhost:8080/?serverUrl=http://localhost:8080/server/";
const out = process.argv[3] || "/tmp/snap.png";
const wait = Number(process.argv[4] || 4000);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 760, height: 670 } });
const seen = new Map();
page.on("console", (m) => { const k = `[${m.type()}] ${m.text()}`.slice(0, 400); seen.set(k, (seen.get(k) || 0) + 1); });
page.on("pageerror", (e) => { const k = `[pageerror] ${e.message}\n${(e.stack || "").split("\n").slice(0, 6).join("\n")}`; seen.set(k, (seen.get(k) || 0) + 1); });
await page.goto(url);
await page.waitForTimeout(wait);
await page.screenshot({ path: out });
if (process.env.DUMP) {
  const tree = await page.evaluate((maxDepth) => {
    const lines = [];
    const walk = (o, d) => {
      if (d > maxDepth) return;
      const b = (() => { try { const r = o.getBounds(o.stage || o); return `${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`; } catch (e) { return "?"; } })();
      const extra = o.$text !== undefined ? ` text=${JSON.stringify(o.$text.slice(0, 40))} font=${o.$runs?.[0]?.fmt?.font ?? o.$default?.font} embed=${o.$embedFonts}` : "";
      const g = o.$graphics && !o.$graphics.$isEmpty ? ` gfx=${o.$graphics.$cmds.length}` : "";
      lines.push(`${"  ".repeat(d)}${o.constructor.name}${o.$name && !o.$name.startsWith("instance") ? " '" + o.$name + "'" : ""} vis=${o.$visible} a=${o.$alpha} [${b}]${g}${extra}`);
      for (const c of o.$children ?? []) walk(c, d + 1);
    };
    walk(window.__player.stage, 0);
    return lines.join("\n");
  }, Number(process.env.DUMP));
  console.log(tree);
}
for (const [k, n] of seen) console.log(n > 1 ? `(x${n}) ${k}` : k);
await browser.close();
