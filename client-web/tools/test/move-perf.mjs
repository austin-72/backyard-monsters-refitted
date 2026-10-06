// Frame rate and CPU profile while moving buildings in the yard (not the Yard Planner):
//   idle, the pointer moving over the yard, dragging a building in move mode, placing a new one.
// The yard gets a ring of walls (added in the page, not saved) so it has as many buildings as a big yard.
//   EMAIL=... PASSWORD=... node tools/test/move-perf.mjs [seconds]
// env: CPU_SLOWDOWN (default 4, like a phone), WALLS (default 220), TOP (functions listed, default 14),
//      ONLY (idle,hover,move,place), MIN_FPS (with it, prints check lines: every case at least that),
//      FLAGS (server flags to override in the page, e.g. FLAGS=io_shadows=1,io_fullredraw=1 for the yard as
//      it was drawn before: shadows on, the whole yard drawn again every frame)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const secs = Number(process.argv[2] || 4);
const server = process.env.SERVER || "http://localhost:3001/";
const slow = Number(process.env.CPU_SLOWDOWN || 4);
const TOP = Number(process.env.TOP || 14);
const only = (process.env.ONLY || "idle,hover,move,place").split(",");
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const g = (fn, a) => page.evaluate(fn, a);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
const count = await g((n) => {
  const B = window.__game.BASE; B._blockSave = true; window.__game.WMATTACK._enabled = false;
  let id = 5000, added = 0;
  const add = (X, Y) => { if (added >= n) return; const b = B.addBuildingC(17); if (b) { b.Setup({ X, Y, t: 17, l: 1, id: id++ }); added++; } };
  for (let x = -400; x <= 400; x += 10) { add(x, -330); add(x, 330); }
  for (let y = -320; y < 330; y += 10) { add(-400, y); add(400, y); }
  return window.__classByName("com.monsters.managers::InstanceManager").getInstancesByClass(window.__classByName("BFOUNDATION")).length;
}, Number(process.env.WALLS || 220));
await page.waitForTimeout(1500);
await g(() => { for (let i = 0; i < 5; i++) try { window.__game.POPUPS.Next(); } catch (e) {} });
if (process.env.FLAGS) await g((pairs) => { for (const p of pairs.split(",")) { const [k, v] = p.split("="); window.__game.GLOBAL._flags[k] = Number(v); } }, process.env.FLAGS);
console.log(`${count} buildings in the yard, CPU slowed ${slow}x, ${secs} s a case`);

const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 300 });
if (slow > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });

/** The pointer going round and round over the yard's middle while it measures. */
const measure = async (name, pointer) => {
  await g(() => { const s = window.__player.stats; s.frames = s.scriptMs = s.renderMs = 0; });
  await cdp.send("Profiler.start");
  const t0 = Date.now();
  let a = 0;
  while (Date.now() - t0 < secs * 1000) {
    if (pointer) { a += 0.09; await page.mouse.move(640 + Math.cos(a) * 220, 400 + Math.sin(a) * 140); }
    else await page.waitForTimeout(16);
  }
  const { profile } = await cdp.send("Profiler.stop");
  const took = (Date.now() - t0) / 1000;
  const st = await g((took) => { const s = window.__player.stats; return { fps: s.frames / took, script: s.scriptMs / Math.max(1, s.frames), render: s.renderMs / Math.max(1, s.frames) }; }, took);
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map(); let total = 0;
  profile.samples.forEach((id, i) => { const cf = byId.get(id).callFrame; const key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop().replace(/\?.*/, "")}:${cf.lineNumber + 1}`; const d = profile.timeDeltas[i] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
  console.log(`\n== ${name}: ${st.fps.toFixed(1)} fps, script ${st.script.toFixed(1)} ms, render ${st.render.toFixed(1)} ms a frame`);
  for (const [k, v] of [...self].sort((x, y) => y[1] - x[1]).slice(0, TOP)) console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
  if (process.env.INCLUSIVE) {
    // time spent inside each game function (with what it calls), counted once per sample
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const incl = new Map();
    profile.samples.forEach((id, i) => { const d = profile.timeDeltas[i] || 0; const seen = new Set(); for (let n = id; n; n = parent.get(n)) { const cf = byId.get(n).callFrame; if (!/game\./.test(cf.url)) continue; const key = `${cf.functionName || "(anon)"}:${cf.lineNumber + 1}`; if (seen.has(key)) continue; seen.add(key); incl.set(key, (incl.get(key) || 0) + d); } });
    console.log("  inclusive:");
    for (const [k, v] of [...incl].sort((x, y) => y[1] - x[1]).slice(0, Number(process.env.INCLUSIVE))) console.log(`${(v / total * 100).toFixed(1).padStart(7)}%  ${k}`);
  }
  return st;
};

const results = {};
if (only.includes("idle")) results.idle = await measure("idle", false);
if (only.includes("hover")) results.hover = await measure("pointer moving over the yard", true);
if (only.includes("move")) {
  // move mode on a building near the middle (not a wall), picked up where the pointer is
  const picked = await g(() => {
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION");
    const all = IM.getInstancesByClass(BF).filter((b) => b._type !== 17 && b._type !== 14 && b._class !== "decoration" && b._mc);
    all.sort((a, b) => Math.abs(a._mc.x) + Math.abs(a._mc.y) - (Math.abs(b._mc.x) + Math.abs(b._mc.y)));
    const b = all[0]; window.__moving = b; window.__movedFrom = [b._mc.x, b._mc.y];
    const p = window.__game.MAP._GROUND.localToGlobal({ x: b._mc.x, y: b._mc.y }); return { type: b._type, n: all.length, at: window.__player.stageToClient(p.x, p.y) };
  });
  await page.mouse.move(picked.at.x, picked.at.y);
  await g(() => window.__moving.StartMove());
  results.move = await measure(`dragging a building in move mode (type ${picked.type})`, true);
  // put down where it was picked up (putting it down saves the yard)
  await g(() => { const b = window.__moving; try { b._mc.x = window.__movedFrom[0]; b._mc.y = window.__movedFrom[1]; b._ioFollowKey = "stop"; b.StopMoveB(); } catch (e) {} window.__game.BASE._blockSave = true; });
}
if (only.includes("place")) {
  // (a type the yard can still build: a silo, else a harvester, else ...)
  const placed = await g(() => { const B = window.__game.BASE; const t = [6, 3, 4, 21, 5].find((t) => !B.CanBuild(t, false).error); return (window.__placing = t ? B.addBuildingB(t) : null) ? t : 0; });
  if (!placed) console.log("placing: FAILED no building type can be built in this yard");
  results.place = await measure(`placing a new building (type ${placed}) from the build menu`, true);
  await g(() => { try { window.__placing.Cancel(); } catch (e) {} });
}
if (process.env.MIN_FPS) {
  const min = Number(process.env.MIN_FPS);
  for (const [k, v] of Object.entries(results)) console.log(`${k} at least ${min} fps: ${v.fps >= min ? "ok" : "FAILED"} ${v.fps.toFixed(1)}`);
  console.log(`no page errors: ${errors.length === 0 ? "ok" : "FAILED"} ${errors.slice(0, 2).join("; ")}`);
}
else if (errors.length) console.log("page errors:", errors.slice(0, 3).join("; "));
await browser.close();
