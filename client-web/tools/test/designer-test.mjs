// The Designer (admins): outpost kits, wild tribe levels and Moloch's bases, designed in the game.
//  - the list: 6 kits, every wild tribe level (19 with the default ladders), 13 Moloch bases; admins only
//  - a wild tribe level: Edit opens it as a yard of its own (the design bar says which), free and instant,
//    no building limits (8 more Magma Towers than a yard may have) and no yard edge (built far outside it);
//    Save: the layout is stored without countdowns or health, and a fresh yard of that tribe and level on the
//    map is made from it (another level is not); a yard already stored on the map is offered to be made again
//  - its monsters: the Monsters window lists every Inferno monster with its count and level and the Compounds'
//    room; ten level 6 Fusebugs, Apply: the draft reloads with them in its Compounds (its buildings kept);
//    Save stores them with the layout and a fresh yard has them; the server takes Inferno monsters only, at
//    levels 1-6; a kit has no Monsters; Reset puts the stock monsters back
//  - a Moloch base: the same, and a Moloch stronghold made from that base has it
//  - a kit: opens as an outpost with an outpost's limits and yard edge; Save writes the kit file the game
//    downloads (and its pictures); Reset puts the kit back as it was
//  - the admin's own account is untouched (shiny, resources, quests); the drafts go on Exit; nobody else can
//    open or load a draft
//  - no page errors
//   EMAIL=<admin> EMAIL2=<not an admin> PASSWORD=... SERVER_DIR=../server PGPASSWORD=... SHOTS=dir
//   node tools/test/designer-test.mjs
// The kit file and pictures are put back afterwards, and every layout changed here is reset.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const serverDir = resolve(process.env.SERVER_DIR || "../server");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const login = async (email) => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const design = (token, body) => post("admin/design", body, token);
const count = (bd, t) => Object.values(bd || {}).filter((b) => b && Number(b.t) === t).length;

let admin = await login(process.env.EMAIL);
const other = await login(process.env.EMAIL2);
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const world = sql(`SELECT worldid FROM bym.save WHERE userid = ${uid} AND type = 'main'`);

// The kit file and pictures, to put back afterwards.
const kitDir = join(serverDir, "public", "assets", "kits");
const backup = mkdtempSync(join(tmpdir(), "kits-"));
for (const f of readdirSync(kitDir)) if (/^(inferno-kits\.json|kit-\d-?(large)?\.png|kit-\d\.png)$/.test(f)) copyFileSync(join(kitDir, f), join(backup, f));

// Cells on the map: a Hellionnaire level 25 cell, a level 29 one, and a Moloch level 50 stronghold made from base 12.
const cells = JSON.parse(execFileSync("bun", ["-e", `
  import { tribeForCell } from "./src/services/maproom/v2/tribeForCell.ts";
  import { generateBaseId } from "./src/utils/generateBaseId.ts";
  import { infernoOnlyConfig } from "./src/config/InfernoOnlyConfig.ts";
  const world = ${JSON.stringify(world)};
  const used = new Set(${JSON.stringify(sql(`SELECT x || ',' || y FROM bym.world_map_cell WHERE world_id = '${world}'`).split("\n"))});
  const out = {};
  const levels = infernoOnlyConfig.moloch.levels;
  for (let x = 10; x < 490 && Object.keys(out).length < 4; x++) for (let y = 10; y < 490; y++) {
    if (used.has(x + "," + y)) continue;
    const t = tribeForCell(world, x, y);
    const at = { x, y, baseid: generateBaseId(world, x, y) };
    if (t.tribeIndex === 0 && t.level === 25 && !out.t25) out.t25 = at;
    else if (t.tribeIndex === 0 && t.level === 25 && out.t25 && !out.t25b) out.t25b = at;
    else if (t.tribeIndex === 0 && t.level === 29 && !out.t29) out.t29 = at;
    else if (t.wmid === 51 && t.level === 50 && !out.m50) {
      const bases = infernoOnlyConfig.moloch.descentBases[50];
      const tier = Math.floor(Math.abs(t.variant) / Math.max(1, levels.length)) % bases.length;
      if (bases[tier] === 12) out.m50 = at;
    }
  }
  console.log(JSON.stringify(out));
`], { cwd: serverDir }).toString().trim().split("\n").pop());
const view = async (baseid) => (await post("base/load", `userid=&baseid=${baseid}&type=wmview&mapversion=2`, admin));

// (resources grow on their own while the test runs: they are only checked not to have become the Designer's
// unlimited ones)
const account = () => { const [credits, quests, most] = sql(`SELECT credits || '|' || md5(COALESCE(quests::text, '')) || '|' || GREATEST((resources->>'r1')::bigint, (resources->>'r2')::bigint, (resources->>'r3')::bigint, (resources->>'r4')::bigint) FROM bym.save WHERE userid = ${uid} AND type = 'main'`).split("|"); return { credits, quests, most: Number(most) }; };
const accountBefore = account();

// 1. the list, admins only
for (const key of ["0-25", "12"]) await design(admin, `action=reset&kind=${key.includes("-") ? "tribe" : "moloch"}&key=${key}`); // (left from an earlier run)
await design(admin, "action=reset&kind=kit&key=1");
const list = await design(admin, "action=list");
check("the list: 6 kits, every wild tribe level (19), Moloch's 13 bases", list.error === 0 && list.kits.length === 6 && list.tribes.length === 19 && list.moloch.length === 13 && list.tribes[0].name === "Hellionnaire level 25" && /Gate XIII/.test(list.moloch[12].name), JSON.stringify({ e: list.error, k: list.kits?.length, t: list.tribes?.length, m: list.moloch?.length, first: list.tribes?.[0], last: list.moloch?.[12] }));
const refused = [await design(other, "action=list"), await design(other, "action=open&kind=tribe&key=0-25")];
check("not for other players", refused.every((r) => r.error === "Admins only."), JSON.stringify(refused));
const stock25 = list.tribes.find((t) => t.key === "0-25").buildings;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const texts = () => g(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out; });
const at = (pred) => g((src) => { const f = new Function("o", "T", "return " + src); let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (f(o, T)) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, pred);
const clickAt = async (p, wait = 800) => { if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const clickText = (label, wait) => at(`o instanceof T && o.text === ${JSON.stringify(label)}`).then((p) => clickAt(p, wait));
// a button with this label in a message box (not the bar's button of the same name)
const clickInMessage = (label, wait) => at(`o instanceof T && o.text === ${JSON.stringify(label)} && (() => { const M = window.__classByName("MESSAGE"); for (let p = o.parent; p; p = p.parent) if (p instanceof M) return true; return false; })()`).then((p) => clickAt(p, wait));
const clickNamed = (name, wait) => at(`o.name === ${JSON.stringify(name)}`).then((p) => clickAt(p, wait));
// the Edit button on the Designer's row with this name
const editRow = (name) => g((name) => {
  const T = window.__classByName("flash.text::TextField"); let row = null;
  const walk = (o) => { if (row || !o.visible) return; if (o instanceof T && o.text === name) { row = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__game.GLOBAL._layerTop);
  if (!row) return null;
  const list = row.parent; let edit = null;
  for (const c of list.$children) if (c.name === "io_Edit" && Math.abs(c.y - (row.y - 2)) < 4) edit = c;
  if (!edit) return null;
  const r = edit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2);
}, name);
const loaded = async (pred, timeout = 45000) => { const end = Date.now() + timeout; while (Date.now() < end) { try { if (await g(pred)) return true; } catch (e) {} await page.waitForTimeout(400); } return false; };
// closes every message box on screen (GLOBAL.Message)
const closeMessages = () => g(() => { const M = window.__classByName("MESSAGE"); const top = window.__game.GLOBAL._layerTop; let n = 0; for (const c of [...(top.$children ?? [])]) if (c instanceof M) { try { c.Hide(); n++; } catch (e) {} } return n; });
const settle = async () => { await page.waitForTimeout(3000); for (let i = 0; i < 3; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); } };
const state = () => g(() => { const G = window.__game.GLOBAL, B = window.__game.BASE; const d = G.ioDesign(); let n = 0; const types = {}; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; n++; types[b._type] = (types[b._type] || 0) + 1; } return { design: d && { kind: d.kind, key: d.key, free: d.free, title: d.title }, base: String(B._loadedBaseID), outpost: B.isOutpost, main: B.isMainYard, width: G._mapWidth, n, types, loadmode: G._loadmode }; });
// Builds `type` at yard units (gx, gy) the way the build menu does (the building follows the mouse, then is put down).
const build = (type, gx, gy) => g(([type, gx, gy]) => {
  const B = window.__game.BASE, R = window.__classByName("GRID"), M = window.__classByName("MAP");
  const before = Object.keys(B._buildingsAll).length;
  const b = B.addBuildingB(type);
  if (!b) return { ok: false, why: "not allowed" };
  const p = R.ToISO(gx, gy, 0); b._mc.x = p.x; b._mc.y = p.y; M._dragged = false;
  try { b.Place(); } catch (e) { return { ok: false, why: e.message }; }
  const placed = Object.keys(B._buildingsAll).length > before && b._id > 0 && B._buildingsAll["b" + b._id] === b;
  if (!placed && window.__game.GLOBAL._newBuilding === b) { try { b.Cancel(); } catch (e) {} window.__game.GLOBAL._newBuilding = null; }
  return { ok: placed, lvl: b._lvl.Get(), cB: b._countdownBuild.Get(), id: b._id };
}, [type, gx, gy]);

try {
  await page.goto(`${server}?token=${admin}&language=english&shell=0`);
  await loaded(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading);
  await settle();
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });
  // (the game's login replaces the token it was opened with: requests of the test's own use the game's)
  admin = (await g(() => window.__classByName("LOGIN").token)) || admin;
  const home = await state();

  // 2. the window
  check("the Designer button is in the top bar", !!(await clickNamed("ioDesignerButton", 2500)));
  let shown = await texts();
  check("it opens the Designer: the three lists, the tribes' first", shown.includes("Designer") && shown.includes("Outpost kits") && shown.includes("Hellionnaire level 25") && shown.includes("Beelzenaut level 44"), shown.filter((t) => /level|Designer|kits/.test(t)).slice(0, 6).join(" | "));
  await page.screenshot({ path: `${shots}/designer-1-list.png` });

  // 3. a wild tribe level
  await clickAt(await editRow("Hellionnaire level 25"), 500);
  const opened = await loaded(() => window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading);
  await settle();
  let s = await state();
  check("Edit opens it as a yard of its own, with the design bar", opened && s.design && s.design.kind === "tribe" && s.design.key === "0-25" && s.design.free === 1 && s.base.startsWith("8") && s.main && (await texts()).some((t) => t === "DESIGNING: Hellionnaire level 25"), JSON.stringify(s.design) + " " + s.base);
  check("...with the layout in use (the stock one here, every building of it)", s.n === stock25, `${s.n} / ${stock25}`);
  check("no yard edge: the yard is nearly the whole map (2400 across)", s.width === 2400, String(s.width));
  check("no warts grow in a draft (they got in the way of placing)", !s.types[7], String(s.types[7] || 0));
  const magma0 = s.types[132] || 0;
  const placed = [];
  for (let i = 0; i < 10 && placed.filter((p) => p.ok).length < 8; i++) placed.push({ ...(await build(132, 620 + (i % 5) * 110, (i < 5 ? -300 : 300))), gx: 620 + (i % 5) * 110, gy: i < 5 ? -300 : 300 });
  s = await state();
  check("no building limits: 8 more Magma Towers than any yard may have, far outside the normal yard's edge", placed.filter((p) => p.ok).length === 8 && (s.types[132] || 0) === magma0 + 8, JSON.stringify(placed));
  check("built at once and free", placed.filter((p) => p.ok).every((p) => p.lvl === 1 && p.cB === 0), JSON.stringify(placed.slice(0, 2)));
  const up = await g(() => { const B = window.__game.BASE; let t = null; for (const k in B._buildingsAll) if (B._buildingsAll[k]._type === 132) t = B._buildingsAll[k]; const before = t._lvl.Get(); try { t.Upgrade(); } catch (e) { return { err: e.message }; } return { before, after: t._lvl.Get(), cU: t._countdownUpgrade.Get() }; });
  check("upgraded at once", up.after === up.before + 1 && up.cU === 0, JSON.stringify(up));
  await g(() => { const M = window.__classByName("MAP"); M._autoScroll = false; M.FocusTo(0, 0, 0.1); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/designer-2-tribe.png` });

  // the monsters in its Compounds, and their levels (the Monsters window)
  const room0 = await g(() => { const H = window.__classByName("HOUSING"); H.HousingSpace(); return H._housingCapacity.Get(); });
  if (room0 < 200) { for (let i = 0; i < 3; i++) await build(128, -900 + i * 120, 700); await page.waitForTimeout(500); }
  await clickNamed("io_Monsters", 1200);
  const win = await g(() => {
    const T = window.__classByName("flash.text::TextField"); const names = []; let room = null;
    const walk = (o) => { if (!o || !o.visible) return; if (o.name && o.name.startsWith("ioMonCount_")) names.push(o.name.slice(11) + "=" + o.text); if (o.name === "ioMonRoom") room = o.text; for (const c of o.$children ?? []) walk(c); };
    walk(window.__game.GLOBAL._layerTop);
    return { names, room };
  });
  check("Monsters (tribes and Moloch): every Inferno monster with its count, level and room, and the Compounds' room", win.names.length >= 15 && win.names.some((n) => n.startsWith("IC15=")) && win.names.some((n) => n.startsWith("IC24=")) && /Room in the Compounds: \d+ of \d+/.test(win.room || ""), JSON.stringify(win));
  await page.screenshot({ path: `${shots}/designer-2b-monsters.png` });
  await clickNamed("ioMon_IC15_p10", 250);
  for (let i = 0; i < 5; i++) await clickNamed("ioMon_IC15_lp", 200);
  const set = await g(() => { let c = null, l = null; const walk = (o) => { if (!o) return; if (o.name === "ioMonCount_IC15") c = o.text; if (o.name === "ioMonLevel_IC15") l = o.text; for (const ch of o.$children ?? []) walk(ch); }; walk(window.__game.GLOBAL._layerTop); return [c, l]; });
  check("...ten Fusebugs (+10) at level 6 (the level's +, up to 6)", set.join() === "10,L6", JSON.stringify(set));
  const draftBefore = s.base;
  await clickNamed("io_Apply", 600);
  await loaded(() => !window.__game.BASE._loading && window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.player.monsterListByID && window.__game.GLOBAL.player.monsterListByID("IC15") && window.__game.GLOBAL.player.monsterListByID("IC15").numCreeps === 10, 30000);
  await settle();
  const housed = await g(() => {
    const G = window.__game.GLOBAL, C = window.__classByName("CREATURES"); let spawned = 0, lv = 0;
    for (const k in C._creatures) { const m = C._creatures[k]; if (m && m._creatureID === "IC15") { spawned++; lv = m.maxHealth; } }
    return { base: String(window.__game.BASE._loadedBaseID), n: G.player.monsterListByID("IC15") && G.player.monsterListByID("IC15").numCreeps, level: G.player.m_upgrades.IC15 && G.player.m_upgrades.IC15.level, spawned, hp: lv };
  });
  const draftRow = JSON.parse(sql(`SELECT json_build_object('m', monsters, 'a', academy)::text FROM bym.save WHERE baseid = '${draftBefore}' AND type = 'design'`) || "null");
  check("Apply: the draft has them (ten level 6 Fusebugs in its Compounds, 720 health each (balance pass, 30 September)) and still its buildings", housed.base === draftBefore && housed.n === 10 && housed.level === 6 && housed.spawned === 10 && housed.hp === 720 && draftRow && draftRow.m.IC15 === 10 && draftRow.a.IC15.level === 6, JSON.stringify({ housed, draftRow: draftRow && { m: draftRow.m.IC15, a: draftRow.a.IC15 } }));
  s = await state();
  check("...its layout kept (the 8 extra Magma Towers)", (s.types[132] || 0) === magma0 + 8, JSON.stringify(s.types[132]));
  // (a building past x 1000 used to be taken for off the yard and moved to the top corner on load: bug report #57)
  const where = await g((ids) => { const B = window.__game.BASE, R = window.__classByName("GRID"); return ids.map((id) => { const b = B._buildingsAll["b" + id]; if (!b) return null; const p = R.FromISO(b.x, b.y); return [Math.round(p.x), Math.round(p.y)]; }); }, placed.filter((p) => p.ok).map((p) => p.id));
  const wanted = placed.filter((p) => p.ok).map((p) => [p.gx, p.gy]);
  check("...each where it was put, the ones out east too (x past 1000)", where.every((w, i) => w && Math.abs(w[0] - wanted[i][0]) <= 20 && Math.abs(w[1] - wanted[i][1]) <= 20), JSON.stringify({ where, wanted }));
  const badDef = await design(admin, `action=defenders&baseid=${draftBefore}&monsters=${encodeURIComponent('{"C1": 5}')}&levels=${encodeURIComponent("{}")}`);
  const badLvl = await design(admin, `action=defenders&baseid=${draftBefore}&monsters=${encodeURIComponent('{"IC1": 5}')}&levels=${encodeURIComponent('{"IC1": 9}')}`);
  check("the server takes Inferno monsters only, at levels 1 to 6", /Not a monster/.test(badDef.error) && /level 1 to 6/.test(badLvl.error), JSON.stringify([badDef.error, badLvl.error]));
  // a yard of this level already on the map (made before the change), to be offered to be made again
  const cols = sql(`SELECT string_agg('"' || column_name || '"', ',') FROM information_schema.columns WHERE table_schema = 'bym' AND table_name = 'save' AND column_name NOT IN ('basesaveid', 'cell_cellid')`);
  const repl = { baseid: "'TESTREMAKE25'", type: "'tribe'", wmid: "1", level: "25", userid: "0", saveuserid: "0", destroyed: "0", attackid: "0" };
  const sel = cols.split(",").map((c) => repl[c.replace(/"/g, "")] ?? `s.${c}`).join(",");
  sql(`DELETE FROM bym.save WHERE baseid = 'TESTREMAKE25'`);
  sql(`INSERT INTO bym.save (${cols}) SELECT ${sel} FROM bym.save s WHERE s.userid = ${uid} AND s.type = 'main'`);

  // Save
  await clickNamed("io_Save", 400);
  await loaded(() => { const T = window.__classByName("flash.text::TextField"); let hit = false; const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && /Saved: Hellionnaire level 25/.test(o.text)) hit = true; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit; }, 20000);
  shown = await texts();
  check("Save: saved, and the yard already on the map is offered to be made again", shown.some((t) => /Saved: Hellionnaire level 25/.test(t)) && shown.some((t) => /1 yard of it on the map was made with the old layout/.test(t)), shown.filter((t) => /Saved|yard/.test(t)).join(" | "));
  await page.screenshot({ path: `${shots}/designer-3-saved.png` });
  await clickText("Make again", 1500);
  shown = await texts();
  check("...Make again: it is made again", shown.some((t) => /1 yard made again/.test(t)) && sql(`SELECT count(*) FROM bym.save WHERE baseid = 'TESTREMAKE25'`) === "0", shown.filter((t) => /again/.test(t)).join(" | "));
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  await closeMessages();
  await page.waitForTimeout(400);
  const stored = JSON.parse(sql(`SELECT buildingdata::text FROM bym.io_design WHERE kind = 'tribe' AND key = '0-25'`) || "null");
  const anyTimer = stored && Object.values(stored).some((b) => "cB" in b || "hp" in b || "cU" in b);
  check("stored: the new towers, the upgrade, no countdowns or health", stored && count(stored, 132) === magma0 + 8 && Object.values(stored).some((b) => Number(b.t) === 132 && Number(b.l) === 2) && !anyTimer, `${stored && count(stored, 132)} magma, timers ${anyTimer}`);
  const fresh = await view(cells.t25.baseid);
  const other29 = await view(cells.t29.baseid);
  check("a Hellionnaire level 25 yard on the map is made from it", fresh.error === 0 && count(fresh.buildingdata, 132) === magma0 + 8 && Object.keys(fresh.buildingdata).length === Object.keys(stored).length, `${count(fresh.buildingdata, 132)} magma, cell ${cells.t25.x},${cells.t25.y}`);
  const storedDef = JSON.parse(sql(`SELECT json_build_object('m', monsters, 'a', academy)::text FROM bym.io_design WHERE kind = 'tribe' AND key = '0-25'`) || "null");
  check("stored with it: its monsters and levels; a fresh yard on the map has them (ten level 6 Fusebugs)", storedDef && storedDef.m.IC15 === 10 && storedDef.a.IC15.level === 6 && fresh.monsters && Number(fresh.monsters.IC15) === 10 && fresh.academy && Number(fresh.academy.IC15.level) === 6, JSON.stringify({ stored: storedDef && storedDef.m, fresh: fresh.monsters, lv: fresh.academy && fresh.academy.IC15 }));
  check("...and a level 29 one is not (still its stock layout)", other29.error === 0 && count(other29.buildingdata, 132) !== magma0 + 8, `${count(other29.buildingdata, 132)} magma`);

  // 4. a Moloch base (from the list again, while in the tribe's draft: it asks first)
  await clickNamed("io_Designer", 2500);
  await clickText("Moloch's bases", 600);
  await page.screenshot({ path: `${shots}/designer-4-moloch-list.png` });
  await clickAt(await editRow("Gate XII: The Last Bastion"), 800);
  await page.screenshot({ path: `${shots}/designer-4b-leave.png` });
  await clickInMessage("Leave", 400);
  await loaded(() => window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.ioDesign().kind === "moloch" && !window.__game.BASE._loading);
  await settle();
  s = await state();
  check("a Moloch base opens (Gate XII), no limits either", s.design && s.design.kind === "moloch" && s.design.key === "12" && s.design.free === 1 && s.width === 2400, JSON.stringify(s.design));
  const mortar0 = s.types[145] || 0;
  const m = [];
  for (let i = 0; i < 8 && m.filter((p) => p.ok).length < 5; i++) m.push(await build(145, -1100 + i * 90, 900));
  await clickNamed("io_Save", 400);
  await loaded(() => { const T = window.__classByName("flash.text::TextField"); let hit = false; const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && /Saved: Moloch base 12/.test(o.text)) hit = true; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit; }, 20000);
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  await page.screenshot({ path: `${shots}/designer-5-moloch-saved.png` });
  await closeMessages();
  const strong = cells.m50 ? await view(cells.m50.baseid) : { error: "no cell" };
  check("saved, and a Moloch stronghold made from base 12 has it", m.filter((p) => p.ok).length === 5 && strong.error === 0 && count(strong.buildingdata, 145) === mortar0 + 5, `${m.filter((p) => p.ok).length} built; stronghold ${count(strong.buildingdata, 145)} mortars`);

  // 5. an outpost kit: an outpost's limits and yard edge
  const kitFile = join(kitDir, "inferno-kits.json");
  const kitBefore = JSON.parse(readFileSync(kitFile, "utf8")).kits[0];
  const picBefore = statSync(join(kitDir, "kit-1.png")).mtimeMs;
  await clickNamed("io_Designer", 2500);
  await clickText("Outpost kits", 600);
  await clickAt(await editRow(list.kits[0].name), 800);
  await clickInMessage("Leave", 400);
  await loaded(() => window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.ioDesign().kind === "kit" && !window.__game.BASE._loading);
  await settle();
  s = await state();
  check("a kit's bar has no Monsters (an outpost's monsters are its player's), and the server refuses them for a kit", !(await at(`o.name === "io_Monsters"`)) && /no monsters of its own/.test((await design(admin, `action=defenders&baseid=${s.base}&monsters=${encodeURIComponent('{"IC1": 1}')}&levels=${encodeURIComponent("{}")}`)).error || ""), s.base);
  check("a kit opens as an outpost, its buildings as in the kit", s.design && s.design.free === 0 && s.outpost && s.width < 2400 && s.n === Object.keys(kitBefore.buildings).length, JSON.stringify({ d: s.design, outpost: s.outpost, width: s.width, n: s.n, kit: Object.keys(kitBefore.buildings).length }));
  const edge = await build(21, Math.round(s.width / 2) + 100, 0);
  check("the outpost's yard edge holds: nothing is built outside it", !edge.ok, JSON.stringify(edge));
  const limit = await g(() => { const B = window.__game.BASE; const n = []; for (let i = 0; i < 6; i++) n.push(B.CanBuild(132).error); return { magma: n, props: window.__game.GLOBAL._buildingProps[131].quantity }; });
  const have = s.types[132] || 0;
  check("...and an outpost's limits (as many Magma Towers as an outpost may have)", have >= 4 ? limit.magma[0] === true : limit.magma[0] === false, JSON.stringify({ have, limit }));
  const sniper0 = s.types[21] || 0;
  let added = { ok: false };
  for (let i = 0; i < 40 && !added.ok; i++) added = await build(24, -400 + (i % 8) * 100, -300 + Math.floor(i / 8) * 150);
  await clickNamed("io_Save", 400);
  await loaded(() => { const T = window.__classByName("flash.text::TextField"); let hit = false; const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && /Saved: Outpost kit 1/.test(o.text)) hit = true; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit; }, 30000);
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  await page.screenshot({ path: `${shots}/designer-6-kit-saved.png` });
  await closeMessages();
  const kitAfter = JSON.parse(readFileSync(kitFile, "utf8")).kits[0];
  check("Save writes the kit the game downloads (a booby trap more, the name and price kept) and draws its pictures", added.ok && count(kitAfter.buildings, 24) === count(kitBefore.buildings, 24) + 1 && kitAfter.name === kitBefore.name && JSON.stringify(kitAfter.price) === JSON.stringify(kitBefore.price) && statSync(join(kitDir, "kit-1.png")).mtimeMs > picBefore, JSON.stringify({ added, traps: [count(kitBefore.buildings, 24), count(kitAfter.buildings, 24)] }));
  await clickNamed("io_Reset", 500);
  await clickInMessage("Reset", 400);
  await loaded(() => window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.ioDesign().kind === "kit" && !window.__game.BASE._loading, 30000);
  await settle();
  const kitReset = JSON.parse(readFileSync(kitFile, "utf8")).kits[0];
  s = await state();
  check("Reset puts the kit back as it was, and the draft with it", JSON.stringify(Object.values(kitReset.buildings).map((b) => [b.t, b.X, b.Y, b.prefab])) === JSON.stringify(Object.values(kitBefore.buildings).map((b) => [b.t, b.X, b.Y, b.prefab])) && s.n === Object.keys(kitBefore.buildings).length, `${Object.keys(kitReset.buildings).length} / ${Object.keys(kitBefore.buildings).length}`);

  // 6. nobody else opens a draft
  const draftId = s.base;
  const foreign = [await post("base/load", `userid=&baseid=${draftId}&type=build&mapversion=2`, other), await post("base/load", `userid=&baseid=${draftId}&type=wmview&mapversion=2`, other), await post("base/load", `userid=&baseid=${draftId}&type=wmattack&mapversion=2`, admin)];
  check("a draft is its admin's, in build mode only (not another player's, not viewed or attacked)", foreign.every((r) => r.status >= 400 || (r.error && r.error !== 0)), JSON.stringify(foreign.map((r) => [r.status, r.error])));

  // 7. Exit
  await clickNamed("io_Exit", 500);
  await clickInMessage("Leave", 400);
  await loaded(() => !window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading);
  await settle();
  s = await state();
  check("Exit: home, and the drafts are gone", !s.design && s.base === home.base && sql(`SELECT count(*) FROM bym.save WHERE type = 'design' AND userid = ${uid}`) === "0", `${s.base} / ${home.base}`);
  // the tribe yard made from the design, seen in the game (a wild yard's view): the tower out east (x 1060) where it was put, not moved
  // to the top corner as off the yard
  const far = await g(async ([baseid]) => {
    const G = window.__game, R = window.__classByName("GRID");
    G.GLOBAL._currentCell = null;
    G.BASE.LoadBase(null, 0, baseid, G.GLOBAL.e_BASE_MODE.WMVIEW, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD);
    const end = Date.now() + 40000;
    while (Date.now() < end && !(G.GLOBAL.mode === G.GLOBAL.e_BASE_MODE.WMVIEW && !G.BASE._loading && G.BASE.buildings.length > 0)) await new Promise((r) => setTimeout(r, 300));
    return G.BASE.buildings.filter((b) => b._type === 132).map((b) => { const p = R.FromISO(b.x, b.y); return [Math.round(p.x), Math.round(p.y)]; });
  }, [cells.t25.baseid]);
  check("the tribe yard made from it, seen in the game: its Magma Tower out east (x 1060) is where it was put", far.some((p) => Math.abs(p[0] - 1060) <= 20 && Math.abs(p[1] + 300) <= 20) && !far.some((p) => p[1] <= -1100), JSON.stringify(far));
  const accountAfter = account();
  check("the admin's own account is untouched (shiny and quests the same, resources nowhere near the Designer's unlimited)", accountAfter.credits === accountBefore.credits && accountAfter.quests === accountBefore.quests && accountAfter.most < 500000000, JSON.stringify([accountBefore, accountAfter]));

  // 8. Reset from the list: the stock layout again
  const reset = await design(admin, "action=reset&kind=tribe&key=0-25");
  const again = await view(cells.t25b.baseid);
  check("Reset (a tribe level): back to its stock layout (and its stock monsters)", reset.error === 0 && !(again.monsters && again.monsters.IC15) && count(again.buildingdata, 132) === magma0 && Object.keys(again.buildingdata).length === stock25, `${count(again.buildingdata, 132)} magma, ${Object.keys(again.buildingdata || {}).length} buildings`);
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/designer-error.png` }).catch(() => {});
} finally {
  await design(admin, "action=reset&kind=tribe&key=0-25").catch(() => {});
  await design(admin, "action=reset&kind=moloch&key=12").catch(() => {});
  await design(admin, "action=close").catch(() => {});
  sql(`DELETE FROM bym.save WHERE baseid = 'TESTREMAKE25'`);
  await design(admin, "action=reset&kind=kit&key=1").catch(() => {}); // (if the test stopped before its own Reset)
  for (const f of readdirSync(backup)) copyFileSync(join(backup, f), join(kitDir, f));
  await browser.close();
}
