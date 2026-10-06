// Frame rate survey: every demanding place in the game, measured the same way (frames a second, game code and
// drawing per frame, the slowest frame, frames over budget) with a CPU profile of each, at CPU_SLOWDOWN (4: like
// a phone or an old laptop). Not a pass/fail test: it prints a table, and SURVEY_OUT=file.json writes the numbers.
//   EMAIL3=<a player with a big yard, a Brimstone Pit, replays> EMAIL4=<a player with an outpost> PASSWORD=...
//   node tools/test/fps-survey.mjs [seconds a case]
// env: ONLY (comma list of case names, see CASES), CPU_SLOWDOWN (4), TOP (profile lines, 8), QUERY (extra page
//      parameters, e.g. &interp=2), PROFILE=0 (no profiles), REPLAY=<key> (a replay to watch)
// Nothing is saved: the yard's saves are blocked; added buildings are only in the page.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const secs = Number(process.argv[2] || 5);
const server = process.env.SERVER || "http://localhost:3001/";
const slow = Number(process.env.CPU_SLOWDOWN || 4);
const TOP = Number(process.env.TOP || 8);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const want = (n) => !ONLY || ONLY.includes(n);
const results = [];
const login = async (who) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(who)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function openGame(email) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  const g = (fn, a) => page.evaluate(fn, a);
  await page.goto(`${server}?token=${await login(email)}&language=english&shell=0${process.env.QUERY || ""}`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const settle = async () => { for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); } await g(() => { try { window.__game.WMATTACK._enabled = false; window.__game.WMATTACK.HideWarning(); } catch (e) {} }); };
  await settle();
  await g(() => {
    window.__game.BASE._blockSave = true;
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__labelled = (re) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o || !o.visible) return; if (o instanceof T && re.test(o.text)) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit ? window.__at(hit) : null; };
    // Fills the yard to its limits: every building type it may still build, as many as it may, at the top level
    window.__fill = () => {
      const G = window.__game, B = G.BASE, GR = window.__classByName("GRID"), PT = window.__classByName("flash.geom::Point");
      const keepMode = G.GLOBAL._aiDesignMode; G.GLOBAL._aiDesignMode = false;
      const spots = [];
      for (let r = 0; r < 60; r++) for (let a = 0; a < Math.max(1, r * 6); a++) { const t = (a / Math.max(1, r * 6)) * Math.PI * 2; spots.push([Math.cos(t) * r * 14, Math.sin(t) * r * 9]); }
      let id = 70000, added = 0, si = 0;
      const props = Object.values(G.GLOBAL._buildingProps).filter((p) => p && !p.block && p.type !== "taunt" && p.type !== "gift" && p.type !== "decoration" && p.id !== 14 && p.costs && p.costs.length);
      for (const p of props) {
        for (let guard = 0; guard < 600; guard++) {
          const ok = B.CanBuild(p.id, false); if (ok.error) break;
          const b = B.addBuildingC(p.id); if (!b) break;
          let placed = false;
          while (si < spots.length) { const [x, y] = spots[si++]; if (!GR.FootprintBlocked(b._footprint, new PT(x, y), true)) { b.Setup({ X: Math.round(x), Y: Math.round(y), t: p.id, l: p.costs.length, id: id++ }); placed = true; break; } }
          if (!placed) { try { b.clear(); } catch (e) {} break; }
          added++;
        }
      }
      G.GLOBAL._aiDesignMode = keepMode;
      return { added, buildings: Object.keys(B._buildingsAll).length };
    };
  });
  return { page, g, errors, settle };
}

let cdp = null, cur = null;
// where each class of the game's bundle starts (to name a profile's line as Class.method)
let classAt = null;
async function loadClasses(page) {
  const src = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((u) => /game\.[0-9a-f]+\.js/.test(u)));
  if (!src) return;
  const text = await (await fetch(src)).text();
  classAt = [];
  text.split("\n").forEach((l, i) => { const m = /^\s*(?:var\s+)?([\w$]+)\s*=\s*class\b/.exec(l); if (m) classAt.push([i + 1, m[1]]); });
}
const owner = (line) => { if (!classAt) return ""; let lo = 0, hi = classAt.length - 1, best = ""; while (lo <= hi) { const mid = (lo + hi) >> 1; if (classAt[mid][0] <= line) { best = classAt[mid][1]; lo = mid + 1; } else hi = mid - 1; } return best; };
const RUNTIME = /^(\(anon\)|loop|frame\d*|dispatchEvent|invoke|broadcast|guard|run|later|\(program\)|\(idle\)|\(garbage collector\))$/;
async function measure(name, act) {
  const { page, g } = cur;
  if (!classAt) await loadClasses(page).catch(() => {});
  if (!cdp) {
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 400 });
    if (slow > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });
  }
  if (process.env.COUNT === "1") await g(() => { if (window.__calls) return; window.__calls = {}; const P = CanvasRenderingContext2D.prototype; for (const k of ["drawImage", "save", "restore", "clearRect", "fillRect", "clip", "getImageData", "putImageData"]) { const o = P[k]; window.__calls[k] = 0; P[k] = function (...a) { window.__calls[k]++; return o.apply(this, a); }; } });
  await g(() => { if (window.__calls) for (const k in window.__calls) window.__calls[k] = 0; });
  await g(() => { const s = window.__player.stats; s.frames = s.scriptMs = s.renderMs = s.maxFrameMs = s.late = s.drawnPx = s.fullFrames = 0; const R = window.__classByName("com.monsters.rendering::Renderer"); window.__rs0 = R ? { ...R.ioStats } : null; window.__t0 = performance.now(); window.__ip0 = window.__player.interp ? window.__player.interp.stats.shown : 0; });
  const prof = process.env.PROFILE !== "0";
  if (prof) await cdp.send("Profiler.start");
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < secs * 1000) { if (act) await act(i++); else await page.waitForTimeout(50); }
  const profile = prof ? (await cdp.send("Profiler.stop")).profile : null;
  const st = await g(() => { const s = window.__player.stats, calls = window.__calls ? Object.fromEntries(Object.entries(window.__calls).map(([k, v]) => [k, Math.round(v / Math.max(1, s.frames))])) : null; if (window.__calls) for (const k in window.__calls) window.__calls[k] = 0; const wall = (performance.now() - window.__t0) / 1000; return { fps: s.frames / wall, script: s.scriptMs / Math.max(1, s.frames), render: s.renderMs / Math.max(1, s.frames), max: s.maxFrameMs, late: s.late / Math.max(1, s.frames) * 100, shown: window.__player.interp ? (window.__player.interp.stats.shown - window.__ip0) / wall : 0, px: s.drawnPx / Math.max(1, s.frames) / 1e3, calls, full: s.fullFrames, yard: (() => { const R = window.__classByName("com.monsters.rendering::Renderer"); if (!R || !window.__rs0) return null; const a = R.ioStats, b = window.__rs0; const n = (a.full - b.full) + (a.partial - b.partial) + (a.idle - b.idle); return { full: a.full - b.full, partial: a.partial - b.partial, idle: a.idle - b.idle, kpx: Math.round((a.area - b.area) / Math.max(1, n) / 1e3), rects: +((a.rects - b.rects) / Math.max(1, n)).toFixed(1), swept: Math.round((a.swept - b.swept) / Math.max(1, n) / 1e3) }; })() }; });
  let top = [];
  if (profile) {
    const byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map(); let total = 0;
    profile.samples.forEach((id, k) => { const cf = byId.get(id).callFrame; const game = /game\./.test(cf.url); const key = game ? `${owner(cf.lineNumber + 1)}.${cf.functionName || "(anon)"}:${cf.lineNumber + 1}` : `${cf.functionName || "(anon)"}`; const d = profile.timeDeltas[k] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
    top = [...self].sort((x, y) => y[1] - x[1]).slice(0, TOP).map(([k, v]) => `${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
    // inclusive time of the game's own functions (with what they call)
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const incl = new Map();
    profile.samples.forEach((id, k) => { const d = profile.timeDeltas[k] || 0; const seen = new Set(); for (let n = id; n; n = parent.get(n)) { const cf = byId.get(n).callFrame; if (!/game\./.test(cf.url) || RUNTIME.test(cf.functionName || "(anon)")) continue; const key = `${owner(cf.lineNumber + 1)}.${cf.functionName || "(anon)"}:${cf.lineNumber + 1}`; if (seen.has(key)) continue; seen.add(key); incl.set(key, (incl.get(key) || 0) + d); } });
    // canvas calls (drawImage, clearRect...) by the game function that made them, two levels up
    const native = new Map();
    profile.samples.forEach((id, k) => { const cf0 = byId.get(id).callFrame; if (cf0.url || !/^(drawImage|clearRect|save|restore|getContext|fillRect|setTransform|getImageData|putImageData|clip|transform)$/.test(cf0.functionName)) return; const d = profile.timeDeltas[k] || 0; const chain = []; for (let n = parent.get(id); n && chain.length < 3; n = parent.get(n)) { const cf = byId.get(n).callFrame; if (!/game\./.test(cf.url) || RUNTIME.test(cf.functionName || "(anon)")) continue; chain.push(`${owner(cf.lineNumber + 1)}.${cf.functionName || "(anon)"}`); } const key = `${cf0.functionName} < ${chain.join(" < ")}`; native.set(key, (native.get(key) || 0) + d); });
    st.native = [...native].sort((x, y) => y[1] - x[1]).slice(0, Number(process.env.NATIVE || 10)).map(([k, v]) => `${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
    st.incl = [...incl].sort((x, y) => y[1] - x[1]).slice(0, Number(process.env.INCL || 16)).map(([k, v]) => `${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
  }
  const row = { name, ...st, top };
  results.push(row);
  console.log(`\n== ${name}: ${st.fps.toFixed(1)} fps${st.shown ? ` (${st.shown.toFixed(0)} shown)` : ""}, script ${st.script.toFixed(1)} ms, render ${st.render.toFixed(1)} ms, slowest ${st.max.toFixed(0)} ms, late ${st.late.toFixed(0)}%; screen ${st.px.toFixed(0)}k px a frame (${st.full} whole); yard ${JSON.stringify(st.yard)}${st.calls ? "; canvas calls a frame " + JSON.stringify(st.calls) : ""}`);
  for (const l of top) console.log(l);
  if (st.incl) { console.log("  game, inclusive:"); for (const l of st.incl) console.log("  " + l); }
  if (st.native && st.native.length) { console.log("  canvas calls by caller:"); for (const l of st.native) console.log("  " + l); }
  return row;
}
const circle = (page, cx = 640, cy = 400, rx = 220, ry = 140) => async (i) => { const a = i * 0.12; await page.mouse.move(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); };
const dragLoop = (page, cx = 640, cy = 420) => {
  let down = false;
  return async (i) => {
    if (!down) { await page.mouse.move(cx, cy); await page.mouse.down(); down = true; }
    const a = i * 0.08; await page.mouse.move(cx + Math.cos(a) * 180, cy + Math.sin(a) * 110);
    if (i % 60 === 59) { await page.mouse.up(); down = false; }
  };
};
const release = async (page) => { try { await page.mouse.up(); } catch (e) {} };

try {
  cur = await openGame(process.env.EMAIL3);
  const { page, g } = cur;
  const filled = process.env.FILL === "0" ? "not filled" : await g(() => window.__fill());
  await page.waitForTimeout(3000);
  await cur.settle();
  console.log(`CPU slowed ${slow}x, ${secs} s a case; the yard filled to its limits: ${JSON.stringify(filled)}`);

  if (want("yard")) await measure("maxed yard, idle", null);
  if (want("yardhover")) await measure("maxed yard, pointer moving", circle(page));
  if (want("yarddrag")) { await measure("maxed yard, dragging the view", dragLoop(page)); await release(page); }
  if (want("warts")) {
    await g(() => { for (let i = 0; i < 40; i++) window.__game.MUSHROOMS.Spawn(1); });
    await measure("maxed yard with 40 warts (Wart Bloom)", null);
  }
  if (want("planner")) {
    await g(() => window.__game.PLANNER.Show()); await page.waitForTimeout(3000);
    await measure("Yard Planner, idle", null);
    await measure("Yard Planner, dragging the view", dragLoop(page)); await release(page);
    const p = await g(() => {
      const dv = window.__game.PLANNER.basePlanner.popup.designView; dv.ioClearSelection();
      const walls = []; for (const it of dv.displayInventory) if (it.node && it.node.type === 17) walls.push(it);
      walls.sort((a, b) => a.y - b.y || a.x - b.x); const sel = walls.slice(0, 80); for (const it of sel) dv._ioSelection.push(it);
      window.__sel = sel; const r = sel[0].getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2);
    });
    await page.mouse.move(p.x, p.y);
    await g(() => window.__game.PLANNER.basePlanner.popup.designView.ioGroupPickUp(window.__sel[0]));
    await measure("Yard Planner, moving 80 walls", circle(page, p.x, p.y + 60, 90, 50));
    await g(() => { const dv = window.__game.PLANNER.basePlanner.popup.designView; try { dv.ioGroupDrop(); } catch (e) {} try { window.__game.PLANNER.Hide(); } catch (e) {} });
    await page.waitForTimeout(1500); await cur.settle();
  }
  if (want("ics")) {
    await g(() => window.__classByName("HATCHERYCC").Show()); await page.waitForTimeout(2000);
    await measure("Incubation Control Station", circle(page));
    await g(() => { try { window.__classByName("HATCHERYCC").Hide(); } catch (e) {} }); await cur.settle();
  }
  if (want("quests")) {
    await g(() => window.__classByName("com.monsters.quests::IoQuestBook").Show()); await page.waitForTimeout(2500);
    await measure("Quest book", circle(page));
    await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} try { window.__classByName("com.monsters.quests::IoQuestBook").Hide(); } catch (e) {} }); await cur.settle();
  }
  if (want("chat") || want("allychat")) {
    await g(() => {
      const C = window.__classByName("com.monsters.chat::Chat")._bymChat; if (!C._open) C.chatBox.toggleHide(null);
      window.__chatAdd = (n) => { const b = C.chatBox; for (let i = 0; i < n; i++) b.push("Line " + (window.__ln = (window.__ln || 0) + 1) + ": the quick brown fox jumps over the lazy dog, again and again", "Speaker" + (i % 7), null, null); };
      window.__chatAdd(150);
    });
    await page.waitForTimeout(1500);
    const box = await g(() => window.__at(window.__classByName("com.monsters.chat::Chat")._bymChat.chatBox));
    if (want("chat")) await measure("Global chat, 150 lines, a new one every half second, scrolling", async (i) => { if (i % 10 === 0) await g(() => window.__chatAdd(1)); await page.mouse.move(box.x, box.y); await page.mouse.wheel(0, i % 20 < 10 ? -120 : 120); await page.waitForTimeout(40); });
    if (want("allychat")) {
      await g(() => { const b = window.__classByName("com.monsters.chat::Chat")._bymChat.chatBox; try { b._ioTabAlliance && b._ioTabAlliance.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click")); } catch (e) {} });
      await measure("Alliance chat tab", async (i) => { if (i % 10 === 0) await g(() => window.__chatAdd(1)); await page.waitForTimeout(50); });
    }
  }
  if (want("alliance")) {
    await g(() => window.__classByName("ALLIANCEWINDOW").Show()); await page.waitForTimeout(2500);
    await measure("Alliance window", circle(page));
    await g(() => { try { window.__classByName("ALLIANCEWINDOW").Hide(); } catch (e) {} try { window.__game.POPUPS.Next(); } catch (e) {} }); await cur.settle();
  }
  if (want("pit")) {
    const pit = await g(() => { let pit = null; for (const k in window.__game.BASE._buildingsAll) { const b = window.__game.BASE._buildingsAll[k]; if (b && b._type === 141) pit = b; } window.__pit = pit; if (pit) window.__classByName("BUILDINGINFO").Show(pit); return !!pit; });
    if (pit) {
      await page.waitForTimeout(1200);
      const enter = await g(() => window.__labelled(/Enter the Pit/));
      if (enter) await page.mouse.click(enter.x, enter.y);
      else console.log("pit: no Enter the Pit button");
      await page.waitForFunction(() => window.__named("casinoTile:magmadrop"), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const cw = () => window.__game.GLOBAL._layerTop.getChildByName("casinoWindow");
      await measure("Brimstone Pit lobby", circle(page));
      const tile = await g(() => { const t = window.__named("casinoTile:magmadrop"); return t ? window.__at(t) : null; });
      if (!tile) console.log("pit: no Magma Drop tile", await g(() => { const w = window.__game.GLOBAL._layerTop.getChildByName("casinoWindow"); return w ? "window open" : "no window"; }));
      if (tile) {
        await page.mouse.click(tile.x, tile.y); await page.waitForTimeout(1500);
        const drop = await g(() => { const t = window.__named("casinoButton:DROP"); return t ? window.__at(t) : null; });
        await measure("Brimstone Pit: Magma Drop, dropping a ball every 0.3 s", async (i) => { if (drop && i % 6 === 0) await page.mouse.click(drop.x, drop.y); await page.waitForTimeout(50); });
      }
      for (const game of ["slots", "derby", "ascent", "bonepile"]) {
        const back = await g(() => { const t = window.__named("casinoButton:LOBBY"); return t ? window.__at(t) : null; });
        if (back) { await page.mouse.click(back.x, back.y); await page.waitForTimeout(1200); }
        const t = await g((id) => { const t = window.__named("casinoTile:" + id); return t ? window.__at(t) : null; }, game);
        if (!t) continue;
        await page.mouse.click(t.x, t.y); await page.waitForTimeout(2000);
        const spin = await g(() => { for (const n of ["casinoButton:SPIN", "casinoButton:START"]) { const t = window.__named(n); if (t) return window.__at(t); } return null; });
        await measure(`Brimstone Pit: ${game}${spin ? ", playing" : ""}`, async (i) => { if (spin && i % 20 === 0) await page.mouse.click(spin.x, spin.y); await page.waitForTimeout(50); });
      }
      await g(() => { try { const w = window.__game.GLOBAL._layerTop.getChildByName("casinoWindow"); if (w) w.parent.removeChild(w); } catch (e) {} });
      await cur.settle();
    }
  }
  if (want("hfo")) {
    const ok = await g(() => {
      const Wv = window.__classByName("com.monsters.events.hfo::IoHfoWaves");
      try { Wv.begin({ wave: 13, id: -1 }); return true; } catch (e) { return String(e); }
    });
    await page.waitForTimeout(6000);
    await measure(`Hell Freezes Over wave 13${ok === true ? "" : " (" + ok + ")"}`, null);
    await g(() => { try { const Wv = window.__classByName("com.monsters.events.hfo::IoHfoWaves"); Wv._fight = null; for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); } catch (e) {} });
    await page.waitForTimeout(2000); await cur.settle();
  }
  if (want("replay")) {
    const key = process.env.REPLAY || await g(async () => {
      const r = await new Promise((res) => new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL.serverUrl + "attacklogs/game", [["v", "1"]], (x) => res(x), () => res(null)));
      const all = r ? [].concat(r.attacks || [], r.defences || [], r.mine || [], r.onme || [], r.logs || []) : [];
      const l = all.find((l) => l && l.replay); return l ? l.replay : null;
    });
    if (key) {
      await g((k) => window.__classByName("com.monsters.replays::IoReplays").Watch(k), key);
      await page.waitForFunction(() => window.__classByName("com.monsters.replays::IoReplayPlayer").playing, null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await measure("Attack replay", null);
      await g(() => { try { window.__classByName("com.monsters.replays::IoReplayPlayer").setSpeed(4); } catch (e) {} });
      await measure("Attack replay at 4x", null);
    } else console.log("\n== Attack replay: no replay found (REPLAY=key)");
  }
  if (want("map")) {
    await g(() => window.__game.GLOBAL.ShowMap());
    await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
    await page.waitForTimeout(6000);
    for (let i = 0; i < 8; i++) { const c = await g(() => window.__labelled(/^Continue$|^OK$|^Got it/)); if (!c) break; await page.mouse.click(c.x, c.y); await page.waitForTimeout(300); }
    await measure("Map Room, idle", null);
    await measure("Map Room, dragging the map", dragLoop(page, 640, 400)); await release(page);
    await measure("Map Room, clicking cells", async (i) => { await page.mouse.click(400 + (i * 97) % 500, 250 + (i * 61) % 300); await page.waitForTimeout(120); if (i % 3 === 2) await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); });
  }
  if (want("attack") || want("attack500")) {
    if (!(await g(() => window.__game.GLOBAL.isMapOpen()))) {
      await g(() => window.__game.GLOBAL.ShowMap());
      await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
      await page.waitForTimeout(8000);
    }
    const started = await g(() => {
      const G = window.__game; let popup = null;
      const walk = (o) => { if (popup) return; if (o._cells && o._cellLookup) popup = o; for (const c of o.$children ?? []) walk(c); };
      walk(window.__player.stage);
      if (!popup) { G.GLOBAL.ShowMap(); return "map"; }
      const cells = (popup._cells || []).filter((c) => c._base === 1 && c._baseID > 0).sort((a, b) => b._level - a._level);
      if (!cells.length) return "no tribe cell";
      G.BASE.LoadBase(null, 0, cells[0]._baseID, "wmattack", false, G.EnumYardType.MAIN_YARD);
      return `tribe yard level ${cells[0]._level}`;
    });
    await page.waitForFunction(() => window.__game.GLOBAL.mode === "wmattack" && window.__game.BASE._buildingCount > 5 && !window.__game.BASE._loading, null, { timeout: 60000 });
    await page.waitForTimeout(5000); await cur.settle();
    const spawn = (n) => g((n) => {
      const G = window.__game, Point = window.__classByName("flash.geom::Point"), types = ["IC1", "IC2", "IC4", "IC5", "IC7", "IC12"];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = 560 + (i % 5) * 20; const p = G.GRID.ToISO(Math.cos(a) * r, Math.sin(a) * r, 0); G.CREEPS.Spawn(types[i % types.length], G.MAP._BUILDINGTOPS, "bounce", new Point(p.x, p.y), Math.random() * 360); }
      return G.CREEPS._creepCount;
    }, n);
    if (want("attack")) {
      console.log(`\nattack: ${started}, ${await spawn(160)} monsters`);
      await page.waitForTimeout(4000);
      await measure("Attacking with 160 monsters", null);
      await g(() => { for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); }); await page.waitForTimeout(2500);
    }
    if (want("attack500")) {
      console.log(`\nattack: ${await spawn(500)} monsters`);
      await page.waitForTimeout(3000);
      const bombs = async (i) => {
        if (i % 8 === 0) await g((i) => {
          const RB = window.__classByName("com.monsters.effects::ResourceBombs"), G = window.__game, PT = window.__classByName("flash.geom::Point");
          const ids = ["pb3", "tb3", "tb2", "pb2", "pu3", "tb1"]; const b = RB._bombs[ids[i % ids.length]] || RB._bombs[Object.keys(RB._bombs)[i % Object.keys(RB._bombs).length]];
          const a = i * 0.7, p = G.GRID.ToISO(Math.cos(a) * 250, Math.sin(a) * 250, 0);
          try { RB.Trigger(G.MAP._BUILDINGBASES, new PT(p.x, p.y), b, 2); } catch (e) { window.__bombErr = String(e); }
        }, i);
        await page.waitForTimeout(50);
      };
      await measure("Attacking with 500 monsters and a catapult shot every 0.4 s", bombs);
    }
  }
} catch (e) {
  console.log("survey stopped:", e.stack || e);
}
if (cur && cur.errors.length) console.log("\npage errors:", [...new Set(cur.errors)].slice(0, 6).join(" | "));

// ---- a maxed outpost (another player)
if (process.env.EMAIL4 && want("outpost")) {
  try {
    if (cur) await cur.page.close();
    cdp = null;
    cur = await openGame(process.env.EMAIL4);
    const { page, g } = cur;
    const loaded = await g(() => {
      const G = window.__game;
      if (!(G.GLOBAL._mapOutpostIDs || []).length) return "none";
      G.BASE._blockSave = false; // (leaving the yard saves it first)
      G.BASE.ioLoadNextOutpost();
      return String(G.GLOBAL._mapOutpostIDs[0]);
    });
    if (loaded !== "none") {
      await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.isOutpost, null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(4000); await cur.settle();
      await g(() => { window.__game.BASE._blockSave = true; });
      const filled = await g(() => window.__fill());
      await page.waitForTimeout(2500); await cur.settle();
      console.log(`\noutpost ${loaded}: ${JSON.stringify(filled)}`);
      await measure("maxed outpost, idle", null);
      await measure("maxed outpost, dragging the view", dragLoop(page)); await release(page);
    } else console.log("\n== outpost: this player has none");
  } catch (e) { console.log("outpost stopped:", e.stack || e); }
}
if (process.env.SURVEY_OUT) writeFileSync(process.env.SURVEY_OUT, JSON.stringify(results, null, 1));
console.log("\n" + results.map((r) => `${r.name.padEnd(62)} ${r.fps.toFixed(1).padStart(5)} fps  script ${r.script.toFixed(1).padStart(5)}  render ${r.render.toFixed(1).padStart(5)}  max ${r.max.toFixed(0).padStart(4)}  late ${r.late.toFixed(0).padStart(3)}%`).join("\n"));
await browser.close();
