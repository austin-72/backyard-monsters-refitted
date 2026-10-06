// CPU profile of a running game: node tools/test/profile.mjs <seconds> (env: PAGE, EMAIL, PASSWORD, PRE_EVAL, WAIT)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const secs = Number(process.argv[2] || 5);
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const base = process.env.PAGE || `http://localhost:8080/?serverUrl=${server}`;
await page.goto(`${base}${base.includes("?") ? "&" : "?"}token=${token}&language=english${process.env.SHELL === "1" ? "" : "&shell=0"}`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(8000);
await page.mouse.click(857, 242);
for (const c of (process.env.CLICKS || "").split(";").filter(Boolean)) { const [x, y, w] = c.split(",").map(Number); await page.mouse.click(x, y); await page.waitForTimeout(w || 1500); }
if (process.env.PRE_EVAL) await page.evaluate(process.env.PRE_EVAL);
await page.waitForTimeout(Number(process.env.WAIT || 3000));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await page.evaluate(() => { const s = window.__player.stats; s.frames = s.scriptMs = s.renderMs = 0; });
await cdp.send("Profiler.start");
await page.waitForTimeout(secs * 1000);
const { profile } = await cdp.send("Profiler.stop");
const st = await page.evaluate((secs) => { const s = window.__player.stats; const G = window.__game.GLOBAL; return `${(s.frames / secs).toFixed(1)} fps, script ${(s.scriptMs / s.frames).toFixed(1)} ms, render ${(s.renderMs / s.frames).toFixed(1)} ms, creeps ${window.__game.CREEPS._creepCount}, mode ${G.mode}`; }, secs);
// self time per function
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; let total = 0;
profile.samples.forEach((id, i) => { const n = byId.get(id); const cf = n.callFrame; const key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`; const d = dt[i] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
console.log(st);
console.log(`top self time (of ${(total / 1000).toFixed(0)} ms sampled):`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
await browser.close();
