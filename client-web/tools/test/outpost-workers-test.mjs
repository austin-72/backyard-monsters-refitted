// Two workers in an outpost, and the bug reports of 5 October (the user's).
//   EMAIL=... (a player with an outpost on a Map Room 2 world, and the Depths on) PASSWORD=... PGPASSWORD=...
//   node tools/test/outpost-workers-test.mjs
// Checks:
//  - an outpost has 2 workers (the two icons at the top, two in the queue), and its save says when each is free
//    again (monsters.finishtimes)
//  - the Map Room shows an idle worker by the outpost, and a second one stacked behind it when both are idle;
//    one when one is busy, none when both are; a save from before (one finish time) counts as 2 workers
//  - bug report 68: the map's info panel for every cell, on the world and in the Depths (open ground there has
//    no owner's name: the game stopped)
//  - bug report 65: a speed-up bought with no building selected any more takes nothing and doesn't stop the game
//  - bug report 66: an attack the server refuses (the yard is protected) is a message and the player goes home,
//    not the Oops window; the server marks the refusal (data.io_refused)
//  - bug reports 63 / 64 / 67: 30 Magma Drop balls at once from one player are all played, while another
//    player's requests still answer quickly; past 40 waiting, the player is told to slow down
// The outpost's save is put back at the end.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const login = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const email = process.env.EMAIL;
const row = sql(`SELECT s.basesaveid || ',' || c.x || ',' || c.y || ',' || s.baseid FROM bym.save s JOIN bym.world_map_cell c ON c.cellid = s.cell_cellid JOIN bym."user" u ON u.userid = s.saveuserid WHERE u.email = '${email}' AND s.type = 'outpost' ORDER BY s.basesaveid LIMIT 1`);
const [saveId, ox, oy, obaseid] = row.split(",");
const keepMonsters = sql(`SELECT monsters::text FROM bym.save WHERE basesaveid = ${saveId}`);
// (another player's outpost, for the refused attack)
const [otherSaveId, otherBaseId] = sql(`SELECT s.basesaveid || ',' || s.baseid FROM bym.save s JOIN bym."user" u ON u.userid = s.saveuserid WHERE s.type = 'outpost' AND u.email <> '${email}' ORDER BY s.basesaveid LIMIT 1`).split(",");
const keepProtected = sql(`SELECT protected FROM bym.save WHERE basesaveid = ${otherSaveId}`);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  const token = await login(email);
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const next = async () => { for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); } };
  await next();
  await g(() => { window.__game.WMATTACK._enabled = false; });

  // ---- the outpost's two workers
  await g(([x, y]) => window.__game.BASE.ioLoadOutpost(x, y), [Number(ox), Number(oy)]);
  await page.waitForFunction(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL.mode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await next();
  const w = await g(() => {
    const W = window.__classByName("UI_WORKERS"), Q = window.__classByName("QUEUE"), WK = window.__classByName("WORKERS"), B = window.__game.BASE;
    const save = B.getHousingSaveData();
    return { outpost: B.isOutpost, icons: W._workers.length, shown: !!(W._mc && W._mc.stage && W._mc.visible), queue: Q._stack.length, walking: WK._workers.length, finishtimes: save.finishtimes, purchased: W._workers.map((x) => x.purchased) };
  });
  check("an outpost has 2 workers: two icons at the top, two in the queue, two walking", w.outpost && w.icons === 2 && w.shown && w.queue === 2 && w.walking === 2 && w.purchased.every(Boolean), JSON.stringify(w));
  check("...its save says when each is free again (both idle: 0, 0)", Array.isArray(w.finishtimes) && w.finishtimes.length === 2 && w.finishtimes.every((t) => t === 0), JSON.stringify(w.finishtimes));
  await page.screenshot({ path: `${shots}/outpost-workers-yard.png` });
  // the map, from the outpost (once its save is done)
  await page.waitForFunction(() => { const B = window.__game.BASE; return !B._saving && !B._loading && B._saveCounterA == B._saveCounterB; }, null, { timeout: 30000 }).catch(() => {});

  // ---- the Map Room's idle workers by the outpost
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  await next();
  const MR = "com.monsters.maproom_advanced::MapRoom";
  await g(([MR, x, y]) => window.__classByName(MR).JumpTo(new (window.__classByName("flash.geom::Point"))(x, y)), [MR, Number(ox), Number(oy)]);
  await page.waitForTimeout(6000);
  const markers = (times, legacy) => g(([x, y, times, legacy]) => {
    let popup = null; const walk = (o) => { if (popup || !o) return; if (o._cells && o._cellLookup) popup = o; for (const c of o.$children ?? []) walk(c); };
    walk(window.__player.stage);
    const cell = (popup._cells || []).find((c) => c.X === x && c.Y === y);
    if (!cell) return { cell: false };
    const now = window.__game.GLOBAL.Timestamp();
    if (!cell._monsterData) cell._monsterData = {};
    if (legacy) { delete cell._monsterData.finishtimes; cell._monsterData.finishtime = times[0] ? now + 600 : 0; }
    else { cell._monsterData.finishtimes = times.map((t) => (t ? now + 600 : 0)); cell._monsterData.finishtime = cell._monsterData.finishtimes[0]; }
    cell.Update();
    const a = cell.mc.mcPlayer.mcWorker, b = cell._ioWorker2;
    const r = a.getBounds(window.__player.stage);
    return { cell: true, mine: !!cell._mine, base: cell._base, idle: cell.ioIdleWorkers(), first: a.visible, second: !!(b && b.visible && b.parent === a.parent), behind: b && b.parent ? b.parent.getChildIndex(b) < a.parent.getChildIndex(a) : null, offset: b ? [Math.round(b.x - a.x), Math.round(b.y - a.y)] : null, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) };
  }, [Number(ox), Number(oy), times, legacy]);
  // (the map's first-visit popups out of the way)
  for (let i = 0; i < 6; i++) {
    const at = await g(() => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o || !o.visible) return; if (o instanceof T && /^(Continue|OK)$/.test(o.text.trim())) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
    if (!at) break;
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(400);
  }
  await page.mouse.move(2, 2);
  const both = await markers([0, 0]);
  check("the map: both workers idle, two workers by the outpost, the second stacked behind the first", both.cell && both.mine && both.base === 3 && both.idle === 2 && both.first && both.second && both.behind === true, JSON.stringify(both));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/outpost-workers-map-full.png` });
  if (both.at) await page.screenshot({ path: `${shots}/outpost-workers-map.png`, clip: { x: Math.max(0, both.at.x - 120), y: Math.max(0, both.at.y - 80), width: 240, height: 160 } });
  const one = await markers([1, 0]);
  check("...one busy: one worker", one.idle === 1 && one.first && !one.second, JSON.stringify(one));
  const none = await markers([1, 1]);
  check("...both busy: none", none.idle === 0 && !none.first && !none.second, JSON.stringify(none));
  const oldBusy = await markers([1], true), oldIdle = await markers([0], true);
  check("...a save from before (one finish time): 2 workers, the first busy or not", oldBusy.idle === 1 && oldBusy.first && !oldBusy.second && oldIdle.idle === 2 && oldIdle.second, JSON.stringify({ oldBusy, oldIdle }));
  await markers([0, 0]);

  // ---- bug report 68: the info panel on every cell, the world and the Depths
  const sweep = () => g(() => {
    let popup = null; const walk = (o) => { if (popup || !o) return; if (o._cells && o._cellLookup) popup = o; for (const c of o.$children ?? []) walk(c); };
    walk(window.__player.stage);
    const out = { cells: 0, failed: [] };
    for (const c of popup._cells || []) { out.cells++; try { popup.ShowInfo(c); } catch (e) { if (out.failed.length < 3) out.failed.push(`${c.X},${c.Y}: ${e.message}`); } }
    return out;
  });
  const world = await sweep();
  await g((MR) => window.__classByName(MR).JumpTo(new (window.__classByName("flash.geom::Point"))(504, 504)), MR);
  await page.waitForTimeout(7000);
  const depths = await sweep();
  check("bug 68: the map's info panel for every cell, the world and the Depths (open ground with no name)", world.cells > 50 && depths.cells > 50 && !world.failed.length && !depths.failed.length, JSON.stringify({ world, depths }));
  await g(() => { try { window.__game.GLOBAL.CloseMap ? window.__game.GLOBAL.CloseMap() : window.__classByName("com.monsters.maproom_manager::MapRoomManager").instance.HideMapRoom(); } catch (e) {} });
  await page.waitForTimeout(3000);

  // ---- bug report 65: a speed-up with no building selected
  const sp = await g(() => {
    const S = window.__classByName("STORE"), G = window.__game.GLOBAL, B = window.__game.BASE;
    G._selectedBuilding = null;
    const before = B._credits.Get();
    let err = null;
    try { S.BuyB("SP1"); } catch (e) { err = e.message; }
    return { err, before, after: B._credits.Get() };
  });
  await page.waitForTimeout(500);
  const spMsg = await g(() => { const T = window.__classByName("flash.text::TextField"); let txt = ""; const walk = (o) => { if (!o) return; if (o instanceof T && o.visible && /isn't being worked on/.test(o.text)) txt = o.text; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return txt; });
  check("bug 65: a speed-up with no building selected any more: no error, nothing taken, a message", !sp.err && sp.before === sp.after && /nothing was bought/.test(spMsg), JSON.stringify({ ...sp, spMsg }));
  await next();

  // ---- bug report 66: the server refuses an attack on a protected yard
  sql(`UPDATE bym.save SET protected = ${Math.floor(Date.now() / 1000) + 3600} WHERE basesaveid = ${otherSaveId}`);
  // the map's Attack: the game loads the yard to attack, and the server refuses
  const answers = [];
  page.on("response", async (r) => { if (/\/base\/load/.test(r.url())) { try { answers.push(await r.json()); } catch (e) {} } });
  await g(() => { const EM = window.__classByName("ERRORMESSAGE"); window.__oops = 0; if (!EM.prototype.__io) { EM.prototype.__io = EM.prototype.Show; EM.prototype.Show = function (...a) { window.__oops++; return EM.prototype.__io.apply(this, a); }; } });
  await g((id) => window.__game.BASE.LoadBase(null, 0, Number(id), window.__game.GLOBAL.e_BASE_MODE.ATTACK, false, window.__classByName("com.monsters.enums::EnumYardType").OUTPOST), otherBaseId);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => window.__game.BASE.isMainYard && !window.__game.BASE._loading && window.__game.GLOBAL.mode === "build", null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const msg = await g(() => { const T = window.__classByName("flash.text::TextField"); let txt = ""; const walk = (o) => { if (!o) return; if (o instanceof T && o.visible && /damage protection|out of range/.test(o.text)) txt = o.text; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return txt; });
  const home = await g(() => ({ main: window.__game.BASE.isMainYard, mode: window.__game.GLOBAL.mode, oops: window.__oops }));
  const refused = answers.find((a) => a && a.error && a.error !== 0) || {};
  const mark = refused.errorDetails && refused.errorDetails.data;
  check("bug 66: the server marks a refused attack (errorDetails.data.io_refused)", mark && /^(protected|range)$/.test(mark.io_refused) && /damage protection|out of range/.test(refused.error || ""), JSON.stringify({ error: refused.error, mark }));
  check("bug 66: ...the game says so and goes home (no Oops window)", home.oops === 0 && /damage protection|out of range/.test(msg) && home.main && home.mode === "build", JSON.stringify({ msg: msg.slice(0, 80), home }));
  await next();

  // ---- bug reports 63 / 64 / 67: one player's burst of bets doesn't hold up the server
  const gambler = await login(process.env.EMAIL3 || "show@example.com");
  const play = async (n, bet = 1) => {
    const t0 = Date.now();
    const all = await Promise.all(Array.from({ length: n }, (_, i) => fetch(`${server}casino/magmadrop/play`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${gambler}` }, body: `request_id=burst${Date.now()}x${i}&bet=${bet}&risk=low` }).then((r) => r.json()).catch((e) => ({ error: String(e) }))));
    return { ms: Date.now() - t0, ok: all.filter((x) => x.error === 0).length, slow: all.filter((x) => /Easy there/.test(x.error || "")).length, other: all.filter((x) => x.error !== 0 && !/Easy there/.test(x.error || "")).map((x) => x.error).slice(0, 3) };
  };
  const other = await login(email);
  const burst = play(30);
  await new Promise((r) => setTimeout(r, 150));
  const t0 = Date.now();
  const ping = await (await fetch(`${server}changelog`)).json().then(() => Date.now() - t0).catch(() => -1);
  const o0 = Date.now();
  const otherState = await fetch(`${server}casino/state`, { method: "POST", headers: { Authorization: `Bearer ${other}` } }).then((r) => r.json()).then((j) => ({ ok: j.error === 0, ms: Date.now() - o0 })).catch((e) => ({ ok: false, err: String(e) }));
  const b30 = await burst;
  check("bugs 63/64/67: 30 Magma Drop balls at once from one player are all played", b30.ok === 30 && !b30.other.length, JSON.stringify(b30));
  check("...meanwhile the server and another player's casino answer quickly", ping >= 0 && ping < 3000 && otherState.ok && otherState.ms < 3000, JSON.stringify({ ping, otherState }));
  const b60 = await play(60);
  check("...60 at once: the ones past 40 waiting are told to slow down, the rest are played", b60.ok >= 40 && b60.slow >= 1 && b60.ok + b60.slow === 60 && !b60.other.length, JSON.stringify(b60));
  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  try {
    execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-v", `m=${keepMonsters}`], { env: { ...process.env }, input: `UPDATE bym.save SET monsters = :'m'::jsonb WHERE basesaveid = ${saveId};\nUPDATE bym.save SET protected = ${keepProtected || 0} WHERE basesaveid = ${otherSaveId};\n` });
  } catch (e) {}
  await browser.close();
}
