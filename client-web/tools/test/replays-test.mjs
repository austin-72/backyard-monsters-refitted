// Attack replays (Inferno-only, 3 October): a player-against-player attack is recorded by the attacker's game
// (IoReplayRecorder) and sent in parts; the attack logs (both sides) get a Replay button: Watch (the yard as it
// was, the battle played over it by puppets: IoReplayPlayer), Pause / Play, 1/4x to 4x, Restart, Share in chat (a
// pill anyone can click), Download, and opening the downloaded file again.
//   EMAIL3=<an attacker with monsters> TARGET=<a player's main yard in its Flinger's range: email> PASSWORD=...
//   PGPASSWORD=... node tools/test/replays-test.mjs
// Prints one line per check; each must end in "ok". It makes a real attack (EMAIL3 loses monsters, TARGET is hurt).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 600)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "bymio", "-At", "-c", q], { encoding: "utf8" }).trim();
const login = async (who) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(who)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const open = async (who) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(`${who}: ${e.message}`));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(who)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await g(() => {
    window.__game.WMATTACK._enabled = false;
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
    window.__at = (o) => { const P = window.__classByName("flash.geom::Point"); const p = o.localToGlobal(new P(o.width / 2, o.height / 2)); return window.__player.stageToClient(p.x, p.y); };
  });
  return { page, g };
};
const R = "com.monsters.replays::IoReplayPlayer", REC = "com.monsters.replays::IoReplayRecorder";

try {
  const attackerEmail = process.env.EMAIL3, targetEmail = process.env.TARGET;
  const target = sql(`SELECT s.baseid || ',' || c.x || ',' || c.y || ',' || u.userid || ',' || u.username FROM bym.save s JOIN bym."user" u ON u.userid = s.saveuserid JOIN bym.world_map_cell c ON c.cellid = s.cell_cellid WHERE u.email = '${targetEmail}' AND s.type = 'main'`).split(",");
  const [tBase, tx, ty, tUser, tName] = target;
  const attacker = sql(`SELECT userid FROM bym."user" WHERE email = '${attackerEmail}'`);
  const before = Number(sql(`SELECT count(*) FROM bym.replay`));
  const { page, g } = await open(attackerEmail);

  // ---- the attack (from the map, as a player would: Attack, then monsters flung)
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  await g(([x, y]) => { const MR = window.__classByName("com.monsters.maproom_advanced::MapRoom"); MR.JumpTo(new (window.__classByName("flash.geom::Point"))(x, y)); }, [Number(tx), Number(ty)]);
  await page.waitForTimeout(5000);
  const launched = await g(async ([x, y]) => {
    const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc;
    const cell = (mc._cells || []).find((c) => c.X === x && c.Y === y);
    if (!cell) return { none: true };
    mc.ShowAttack(cell);
    const pa = mc._popupAttackA;
    for (let i = 0; i < 30 && !pa._enabled; i++) await new Promise((r) => setTimeout(r, 300));
    if (!pa._enabled) return { disabled: true, name: cell._name };
    pa.DoAttack();
    return { ok: true, name: cell._name };
  }, [Number(tx), Number(ty)]);
  check("the attacker's Attack on the target player's yard is open (in range)", launched.ok, JSON.stringify(launched));
  // (a question first, if any: losing one's own damage protection, say: yes)
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(700);
    const asked = await g(() => { if (window.__game.GLOBAL.mode === "attack") return "attack"; for (const L of [window.__game.GLOBAL._layerTop, window.__game.GLOBAL._layerWindows]) for (let i = L.numChildren - 1; i >= 0; i--) { const c = L.getChildAt(i); if (c.bAction && c.bAction.visible) { const t = window.__texts(c).join(" "); c.bAction.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click", true)); return t; } } return null; });
    if (asked === "attack") break;
    if (asked) console.log("(answered: " + asked.slice(0, 160) + ")");
  }
  await page.waitForFunction(() => window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.ATTACK && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  const rec = await g((REC) => ({ on: window.__classByName(REC).recording, key: window.__classByName(REC).key }), REC);
  check("…the attack on a player's yard is being recorded (the load gave it a replay key)", rec.on && /^[0-9a-zA-Z]{12}$/.test(rec.key || ""), JSON.stringify(rec));
  // the catapult's three kinds of shot (as ResourceBombs.BombDrop notes them) and a glow on a monster
  const injectExtras = () => g((REC) => {
    const R = window.__classByName(REC), GR = window.__classByName("GRID"), GF = window.__classByName("flash.filters::GlowFilter");
    const p = GR.ToISO(0, 0, 0);
    R.shot({ radius: 120, particles: 12, resource: 3, group: 2, kind: "sulfur" }, p.x, p.y);
    R.shot({ kind: "jars", radius: 400, seconds: 6 }, p.x + 60, p.y);
    R.shot({ kind: "decoy", radius: 200, fuse: 6 }, p.x - 60, p.y + 30);
    let glowed = 0;
    for (const k in window.__game.CREEPS._creeps) { const c = window.__game.CREEPS._creeps[k]; if (c && c.health > 0) { c.addFilter(new GF(0x33FF66, 0.8, 8, 8, 4, 3)); glowed++; if (glowed >= 3) break; } }
    return { glowed };
  }, REC);
  let extrasIn = null;
  // waves of monsters, around the yard
  for (let w = 0; w < 4; w++) {
    await g((w) => {
      const A = window.__game.ATTACK, GR = window.__classByName("GRID"), PT = window.__classByName("flash.geom::Point");
      A._flingerCooling = 0;
      for (const id of Object.keys(A._curCreaturesAvailable)) for (let k = 0; k < 4 && A._curCreaturesAvailable[id] > 0; k++) A.BucketAdd(id);
      const ang = w * 1.4, p = GR.ToISO(Math.cos(ang) * 420, Math.sin(ang) * 340, 0);
      A.Spawn(new PT(p.x, p.y), 120);
    }, w);
    await page.waitForTimeout(w === 0 ? 1500 : 3000);
    if (w === 0) {
      extrasIn = await injectExtras();
    }
  }
  await page.waitForTimeout(20000);
  const midway = Number(sql(`SELECT size FROM bym.replay WHERE key = '${rec.key}'`));
  const battle = await g(() => ({ damage: window.__game.BASE._percentDamaged, creeps: window.__game.CREEPS._creepCount }));
  await page.screenshot({ path: `${shots}/replay-attack.png` });
  await g(() => { try { window.__game.ATTACK.End(); } catch (e) {} });
  await page.waitForTimeout(4000);
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} window.__game.BASE.LoadBase(null, 0, 0, window.__game.GLOBAL.e_BASE_MODE.BUILD, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD); });
  await page.waitForFunction(() => window.__game.GLOBAL.mode === "build" && !window.__game.BASE._loading, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  const row = sql(`SELECT status || ',' || size || ',' || octet_length(data) || ',' || duration || ',' || damage || ',' || attacker_userid || ',' || defender_userid || ',' || coalesce(attack_log_id, 0) FROM bym.replay WHERE key = '${rec.key}'`).split(",");
  check("…its parts reached the server while it went on, and the attack's end finished it (gzipped)", midway > 0 && row[0] === "done" && Number(row[2]) > 100 && Number(row[3]) >= 5 && row[5] === attacker && row[6] === tUser && Number(row[7]) > 0, JSON.stringify({ midway, row, battle }));
  check("…one replay for the attack", Number(sql(`SELECT count(*) FROM bym.replay`)) === before + 1, sql(`SELECT count(*) FROM bym.replay`));

  // ---- the attack logs: Replay -> Watch
  await g(() => window.__classByName("com.monsters.leaderboards::IoAttackLogs").Show());
  await page.waitForTimeout(3000);
  const rowInfo = await g(() => {
    const w = window.__classByName("com.monsters.leaderboards::IoAttackLogs")._open;
    const rows = w._rows; const r0 = rows.getChildByName("ioAlRow0"); const b = r0 && r0.getChildByName("ioAlReplay");
    return { has: !!b, at: b ? window.__at(b) : null, open: !!w.mc.getChildByName("ioAlOpenReplay"), log: w.logs()[0] };
  });
  check("the attacker's attack logs: the attack has a Replay button (and Open a replay file is there)", rowInfo.has && rowInfo.open && rowInfo.log.replay === rec.key, JSON.stringify({ has: rowInfo.has, open: rowInfo.open, replay: rowInfo.log && rowInfo.log.replay }));
  await page.mouse.click(rowInfo.at.x, rowInfo.at.y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/replay-menu.png` });
  const watchAt = await g(() => { const w = window.__classByName("com.monsters.leaderboards::IoAttackLogs")._open; const m = w._replayMenu; return { names: (() => { const out = []; for (let i = 0; i < m.numChildren; i++) out.push(m.getChildAt(i).name); return out; })(), at: window.__at(m.getChildByName("ioAlReplayWatch")) }; });
  check("…its menu: Watch, Share in Global chat, Share in Alliance chat, Download", ["ioAlReplayWatch", "ioAlReplayGlobal", "ioAlReplayAlliance", "ioAlReplayDownload"].every((n) => watchAt.names.includes(n)), JSON.stringify(watchAt.names));
  // (Watch waits for the yard's save to finish: "still saving" otherwise)
  await page.waitForFunction(() => { const B = window.__game.BASE; return !B._saving && !B._loading && B._saveCounterA === B._saveCounterB; }, null, { timeout: 30000 }).catch(() => {});
  await page.mouse.click(watchAt.at.x, watchAt.at.y);
  await page.waitForFunction((R) => window.__classByName(R).playing, R, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const view = await g((R) => { const P = window.__classByName(R), G = window.__game; return { mode: G.GLOBAL.mode, base: String(G.BASE._loadedBaseID), total: P.total, t: P.time, hud: !!G.GLOBAL._layerUI.getChildByName("ioReplayHud"), hudText: window.__texts(G.GLOBAL._layerUI.getChildByName("ioReplayHud")).join(" | ") }; }, R);
  check("…Watch: the target's yard in view mode, the replay playing, its bar at the top", view.mode === "view" && view.base === tBase && view.total >= 20 && view.hud && new RegExp(`attacked ${tName}`).test(view.hudText), JSON.stringify(view));
  // at 4x until the monsters are out
  await g((R) => window.__classByName(R).setSpeed(4), R);
  let seen = 0, maxActors = 0, hurt = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const s = await g((R) => { const P = window.__classByName(R); const hurtB = window.__game.BASE.buildings.filter((b) => b.maxHealth && b.health < b.maxHealth).length; return { n: P.actors.length, t: P.time, hurtB }; }, R);
    maxActors = Math.max(maxActors, s.n); hurt = Math.max(hurt, s.hurtB);
    if (s.n > 0) seen++;
    if (seen > 4 && hurt > 0) break;
  }
  await page.screenshot({ path: `${shots}/replay-playing.png` });
  check("…the monsters appear and move as puppets, and the buildings take their damage", maxActors > 0 && hurt > 0, JSON.stringify({ maxActors, hurt }));
  // the catapult's shots and the monsters' glows, played too
  const extras = await g(async (R) => {
    const P = window.__classByName(R);
    P.restart();
    P.setSpeed(4);
    const kinds = new Set(); let glowing = 0, filtered = 0, jarred = 0;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      for (const fx of P._effects) { kinds.add(fx.kind); if (fx.kind === "j") jarred = Math.max(jarred, fx.towers.length); }
      for (const a of P.actors) { if (a.glowKey) { glowing++; if (a.actor && a.actor._graphicMC && a.actor._graphicMC.filters.length) filtered++; } }
      if (kinds.size === 3 && filtered) break;
    }
    const BT = window.__classByName("BTOWER");
    const towers = window.__game.BASE.buildings.filter((b) => b instanceof BT && b._class === "tower").length;
    return { shots: P._shots.length, kinds: [...kinds].sort().join(), glowing, filtered, jarred, towers };
  }, R);
  await page.screenshot({ path: `${shots}/replay-catapult.png` });
  check("…the catapult's shots are thrown in the replay too (a bomb, Candy Jars on the towers, Marilyn)", extrasIn.glowed > 0 && extras.shots === 3 && extras.kinds === "b,d,j" && (extras.jarred > 0 || extras.towers === 0), JSON.stringify({ extrasIn, extras }));
  check("…and the monsters' glows show on their puppets", extras.filtered > 0, JSON.stringify(extras));
  const speedT = await g(async (R) => { const P = window.__classByName(R); P.restart(); P.setSpeed(0.25); const a = P.time; await new Promise((r) => setTimeout(r, 2000)); const b = P.time; P.setSpeed(4); const c = P.time; await new Promise((r) => setTimeout(r, 2000)); const d = P.time; P.togglePause(); const e = P.time; await new Promise((r) => setTimeout(r, 1000)); const f = P.time; P.togglePause(); return { slow: b - a, fast: d - c, paused: f - e, rate: 4 }; }, R);
  check("…1/4x is slow, 4x is fast (about 16 times as much), Pause stops it", speedT.fast > speedT.slow * 8 && speedT.paused === 0, JSON.stringify(speedT));
  const restart = await g(async (R) => { const P = window.__classByName(R); P.restart(); const t = P.time; const init = P._initial; let differ = 0, n = 0; for (const id in init) { const b = window.__game.BASE._buildingsAll["b" + id]; if (!b) continue; n++; if (b.health !== init[id][0] || Boolean(b._destroyed) !== Boolean(init[id][1])) differ++; } return { t, differ, n, actors: P.actors.length }; }, R);
  check("…Restart: back to the start, every building as it was, no monsters", restart.t === 0 && restart.actors === 0 && restart.differ === 0 && restart.n > 0, JSON.stringify(restart));

  // ---- shared in chat: a pill; clicking it watches the replay
  await g((key) => { window.__replayKey = key; }, rec.key);
  const shared2 = await g(async () => {
    const IR = window.__classByName("com.monsters.replays::IoReplays"); const C = window.__classByName("com.monsters.chat::Chat")._bymChat;
    IR.Share(window.__replayKey, "global");
    try { window.__game.POPUPS.Next(); } catch (e) {}
    const L = window.__game.GLOBAL._layerTop; const msgs = []; for (let i = 0; i < L.numChildren; i++) { const c = L.getChildAt(i); if (c.bAction && typeof c.Hide === "function") msgs.push(c); } for (const c of msgs) c.Hide();
    let line = null;
    for (let i = 0; i < 20 && !line; i++) {
      await new Promise((r) => setTimeout(r, 500));
      line = C.chatBox._chatHistory.find((l) => l && l.msgData && String(l.msgData.msg).indexOf("[replay:" + window.__replayKey + "]") >= 0) || null;
    }
    return { raw: line && line.msgData.msg, text: line && line.txt.text, msgs: window.__texts(window.__game.GLOBAL._layerTop).join(" ").slice(0, 200) };
  });
  check("…Share in Global chat: a line with the replay, shown as an \"Attack replay\" pill", shared2.raw && shared2.raw.indexOf(`[replay:${rec.key}]`) >= 0 && /Attack replay/.test(shared2.text || ""), JSON.stringify(shared2));
  await page.screenshot({ path: `${shots}/replay-chat.png` });

  // ---- downloading it, and opening the file again
  const file = Buffer.from(await (await fetch(`${server}replays/file?key=${rec.key}`)).arrayBuffer());
  const headers = (await fetch(`${server}replays/file?key=${rec.key}`)).headers.get("content-disposition");
  check("…Download gives the replay as a file (gzipped), with a name", file[0] === 0x1f && file[1] === 0x8b && /attachment; filename=".*\.bymreplay"/.test(headers || ""), JSON.stringify({ bytes: file.length, headers }));
  const imported = await g(async (b64) => {
    const out = await new Promise((res) => new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL.serverUrl + "replays/import", [["file", b64]], (r) => res(r), () => res({ error: "io" })));
    return out;
  }, file.toString("base64"));
  check("…the downloaded file opened again (imported): a new key, kept for this player", imported.error === 0 && /^[0-9a-zA-Z]{12}$/.test(imported.key || "") && imported.key !== rec.key, JSON.stringify(imported));
  await g((key) => window.__classByName("com.monsters.replays::IoReplays").Watch(key), imported.key);
  await page.waitForTimeout(3000);
  await page.waitForFunction((R) => window.__classByName(R).playing, R, { timeout: 60000 });
  const view2 = await g((R) => { const P = window.__classByName(R); return { total: P.total, base: String(window.__game.BASE._loadedBaseID) }; }, R);
  check("…and it plays like the first", view2.total === view.total && view2.base === tBase, JSON.stringify(view2));
  // Close goes home
  await g(() => { const hud = window.__game.GLOBAL._layerUI.getChildByName("ioReplayHud"); hud.getChildByName("ioReplayClose").dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click", true)); });
  await page.waitForFunction(() => window.__game.GLOBAL.mode === "build" && !window.__game.BASE._loading && window.__game.BASE.isMainYard, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  check("…Close goes home (no replay left playing)", !(await g((R) => window.__classByName(R).playing, R)), "");
  await page.close();

  // ---- the defender sees it too
  const def = await open(targetEmail);
  await def.g(() => { const L = window.__classByName("com.monsters.leaderboards::IoAttackLogs"); L.Show(); });
  await def.page.waitForTimeout(2500);
  const onme = await def.g(() => { const w = window.__classByName("com.monsters.leaderboards::IoAttackLogs")._open; w.selectTab(1); return null; });
  await def.page.waitForTimeout(2500);
  const theirs = await def.g(() => { const w = window.__classByName("com.monsters.leaderboards::IoAttackLogs")._open; const l = w.logs(); const r0 = w._rows.getChildByName("ioAlRow0"); return { replay: l[0] && l[0].replay, button: !!(r0 && r0.getChildByName("ioAlReplay")) }; });
  check("the defender's Attacks on me has the same replay to watch", theirs.replay === rec.key && theirs.button, JSON.stringify(theirs));
  await def.page.close();
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}
