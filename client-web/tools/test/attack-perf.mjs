// Attack benchmark: opens the map, starts an attack on a tribe yard the way the Attack button does
// (BASE.LoadBase ... "wmattack"), spawns N monsters around the yard with CREEPS.Spawn (as flinging does),
// then measures and CPU-profiles the battle.
//   node tools/test/attack-perf.mjs <monsters> [seconds]      (env: PAGE, EMAIL, PASSWORD, W, H, QUERY)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const N = Number(process.argv[2] || 160), secs = Number(process.argv[3] || 5);
const W = Number(process.env.W || 1280), H = Number(process.env.H || 800);
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.PAGE || `http://localhost:8080/?serverUrl=${server}`;
await page.goto(`${base}${base.includes("?") ? "&" : "?"}token=${token}&language=english${process.env.SHELL === "1" ? "" : "&shell=0"}${process.env.QUERY || ""}`);
await page.waitForFunction(() => window.__player, null, { timeout: 30000 });
await page.waitForTimeout(8000);
await page.mouse.click(W / 2 + 217, H / 2 - 158); await page.waitForTimeout(800);          // welcome popup
await page.mouse.click(W - 48, H - 235); await page.waitForTimeout(12000);                  // Map
const started = await page.evaluate(() => {
  const G = window.__game;
  let popup = null;
  const walk = (o) => { if (popup) return; if (o._cells && o._cellLookup) popup = o; for (const c of o.$children ?? []) walk(c); };
  walk(window.__player.stage);
  if (!popup) return "no map popup";
  const cell = (popup._cells || []).find((c) => c._base === 1 && c._baseID > 0 && c._level >= 30) || (popup._cells || []).find((c) => c._base === 1 && c._baseID > 0);
  if (!cell) return "no tribe cell";
  G.BASE.LoadBase(null, 0, cell._baseID, "wmattack", false, G.EnumYardType.MAIN_YARD);
  return `attacking tribe base ${cell._baseID} (level ${cell._level})`;
});
console.log(started);
await page.waitForFunction(() => window.__game.GLOBAL.mode === "wmattack" && window.__game.BASE._buildingCount > 5, null, { timeout: 60000 });
await page.waitForTimeout(6000);
const spawned = await page.evaluate((n) => {
  const G = window.__game, Point = window.__classByName("flash.geom::Point");
  const types = ["IC1", "IC2", "IC4"];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = 560 + (i % 5) * 20;
    const p = G.GRID.ToISO(Math.cos(a) * r, Math.sin(a) * r, 0);
    G.CREEPS.Spawn(types[i % types.length], G.MAP._BUILDINGTOPS, "bounce", new Point(p.x, p.y), Math.random() * 360);
  }
  return G.CREEPS._creepCount;
}, N);
console.log(`monsters on the field: ${spawned}, buildings: ${await page.evaluate(() => window.__game.BASE._buildingCount)}`);
await page.waitForTimeout(4000);
if (process.env.EXTRA_EVAL) console.log(await page.evaluate(process.env.EXTRA_EVAL));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
await page.evaluate(() => { const s = window.__player.stats; s.frames = s.scriptMs = s.renderMs = 0; window.__t0 = performance.now(); });
await cdp.send("Profiler.start");
await page.waitForTimeout(secs * 1000);
const { profile } = await cdp.send("Profiler.stop");
const st = await page.evaluate(() => { const s = window.__player.stats, wall = performance.now() - window.__t0; return `${(s.frames / (wall / 1000)).toFixed(1)} fps, script ${(s.scriptMs / s.frames).toFixed(1)} ms, render ${(s.renderMs / s.frames).toFixed(1)} ms, frame ${(wall / s.frames).toFixed(1)} ms, monsters alive ${window.__game.CREEPS._creepCount}, ticks/frame ${window.__game.GLOBAL._loops}`; });
console.log(st);
await page.screenshot({ path: "/tmp/attack-perf.png" });
const byId = new Map(profile.nodes.map((x) => [x.id, x])); const self = new Map(); let total = 0;
profile.samples.forEach((id, i) => { const cf = byId.get(id).callFrame; const k = `${cf.functionName || "(anon)"}${cf.url ? ":" + (cf.lineNumber + 1) : ""}`; const d = profile.timeDeltas[i] || 0; total += d; self.set(k, (self.get(k) || 0) + d); });
console.log([...self].sort((x, y) => y[1] - x[1]).slice(0, Number(process.env.TOP || 25)).map(([k, v]) => `${(v / total * 100).toFixed(1).padStart(5)}% ${k}`).join("\n"));
if (errors.length) console.log(`page errors: ${[...new Set(errors)].slice(0, 5).join(" | ")}`);
await browser.close();
