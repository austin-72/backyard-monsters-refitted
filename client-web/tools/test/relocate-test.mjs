// Relocate, in the map room (server controllers/maproom/v2/relocateAnywhere.ts, client IoRelocate.as):
//  - a new place on the map the way a new player gets one (the spawn rules: near other players, not on top
//    of a main yard), bone / coal / sulfur / magma to 0 (storage kept), every outpost back to the wild tribes
//  - refused while the main yard is being attacked, in admin test mode, and twice at once
//  - in the game: the button under Home and Jump, the warning (resources and outposts named), and after
//    relocating the game starting again from the new place with nothing in store
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/test/relocate-test.mjs
// Needs a local test server and database (psql); EMAIL is an admin with at least one outpost (the map is
// opened from it; nothing of that account is relocated). Registers one account (mind the limit of 3
// registrations a minute), gives it outposts in the database, relocates it twice, and removes it again.
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const api = "api/v1.7.3-beta/player/";
const login = async (email, password) => (await post(api + "getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)).token;
const WIDTH = 400, HEIGHT = 400;
const dist = (a, b) => { const dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]); return Math.max(Math.min(dx, WIDTH - dx), Math.min(dy, HEIGHT - dy)); };

// 1. an account of its own, on the map
const suffix = Math.random().toString(36).slice(2, 8);
const email = `reloc${suffix}@example.com`, password = "Hunter22!x";
const reg = await post(api + "register", `username=reloc${suffix}&email=${encodeURIComponent(email)}&password=${password}`);
check("an account to relocate", reg.status === 200 && reg.user, JSON.stringify({ status: reg.status, error: reg.error }));
if (!reg.user) process.exit(1); // (the register limit: 3 a minute from one address)
const uid = reg.user.userid;
let token = await login(email, password);
const first = await post("base/load", "userid=&baseid=0&type=build&mapversion=2", token);
const main = () => { const [id, home, world, res, outposts] = sql(`SELECT basesaveid || '|' || homebase::text || '|' || worldid || '|' || resources::text || '|' || coalesce(outposts, '[]'::jsonb)::text FROM bym.save WHERE saveuserid = ${uid} AND type = 'main'`).split("|"); return { id: Number(id), home: JSON.parse(home).map(Number), world, res: JSON.parse(res), outposts: JSON.parse(outposts) }; };
let m = main();
check("it is on the map", first.status === 200 && m.home.length === 2 && !!m.world, JSON.stringify({ status: first.status, home: m.home }));

/** Outposts made in the database: the wild cells near home become this account's outposts. */
const template = Number(sql(`SELECT basesaveid FROM bym.save WHERE type = 'outpost' ORDER BY basesaveid LIMIT 1`));
const cols = sql(`SELECT string_agg(column_name, ',') FROM information_schema.columns WHERE table_schema = 'bym' AND table_name = 'save' AND column_name <> 'basesaveid'`).split(",");
const giveOutposts = async (count) => {
  m = main();
  const area = await post("worldmapv2/getarea", `x=${Math.max(0, m.home[0] - 6)}&y=${Math.max(0, m.home[1] - 6)}`, token);
  const wild = [];
  for (const x in area.data || {}) for (const y in area.data[x]) { const c = area.data[x][y]; if (c.b == 1 && c.bid && wild.length < count) wild.push([Number(x), Number(y), String(c.bid)]); }
  for (const [x, y, bid] of wild) {
    const over = { baseid: `'${bid}'`, saveuserid: uid, userid: uid, type: "'outpost'", worldid: `'${m.world}'`, name: `'reloc${suffix}'`, cell_cellid: "(SELECT cellid FROM c)", attackid: 0, damage: 0, destroyed: 0 };
    sql(`DELETE FROM bym.save WHERE baseid = '${bid}' AND type = 'tribe'`);
    sql(`WITH c AS (INSERT INTO bym.world_map_cell (baseid, map_version, uid, x, y, base_type, terrain_height, world_id) VALUES ('${bid}', 2, ${uid}, ${x}, ${y}, 3, 100, '${m.world}') RETURNING cellid)
         INSERT INTO bym.save (${cols.map((c) => `"${c}"`).join(",")}) SELECT ${cols.map((c) => (c in over ? over[c] : `t."${c}"`)).join(",")} FROM bym.save t WHERE t.basesaveid = ${template}`);
    sql(`UPDATE bym.save SET outposts = coalesce(outposts, '[]'::jsonb) || '${JSON.stringify([[x, y, bid]])}'::jsonb WHERE basesaveid = ${m.id}`);
  }
  sql(`UPDATE bym.save SET resources = resources || '{"r1": 500000, "r2": 400000, "r3": 300000, "r4": 200000}'::jsonb WHERE basesaveid = ${m.id}`);
  return wild;
};
const given = await giveOutposts(2);
const outpostCount = () => Number(sql(`SELECT count(*) FROM bym.save WHERE saveuserid = ${uid} AND type = 'outpost'`));
check("it has outposts and resources", given.length === 2 && outpostCount() === 2 && main().outposts.length === 2 && main().res.r1 === 500000, JSON.stringify(given));

// 2. refused while its main yard is being attacked
sql(`UPDATE bym.save SET attackid = 4242, attacks = '[{"name": "someone", "starttime": ${Math.floor(Date.now() / 1000) - 60}}]'::jsonb WHERE basesaveid = ${m.id}`);
const busy = await post("base/relocate", "confirm=1", token);
check("refused while the main yard is being attacked", busy.status === 409 && /being attacked/.test(busy.error || "") && outpostCount() === 2, JSON.stringify({ status: busy.status, error: busy.error }));
sql(`UPDATE bym.save SET attackid = 0, attacks = '[]'::jsonb WHERE basesaveid = ${m.id}`);

// 3. relocated: a new place, nothing in store, outposts wild again (twice at once: once)
const before = main();
const players = Number(sql(`SELECT player_count FROM bym.world WHERE uuid = '${before.world}'`));
const [r1, r2] = await Promise.all([post("base/relocate", "confirm=1", token), post("base/relocate", "confirm=1", token)]);
const done = [r1, r2].find((r) => r.status === 200);
const after = main();
check("relocated (twice at once: once, the other refused)", !!done && [r1, r2].filter((r) => r.status === 409 && /Already relocating/.test(r.error || "")).length === 1, JSON.stringify([r1.status, r2.status, r1.error || r2.error]));
check("a new place", done && JSON.stringify(done.coords) === JSON.stringify(after.home) && JSON.stringify(after.home) !== JSON.stringify(before.home), `${before.home} -> ${after.home}`);
check("one home cell, at the new place", sql(`SELECT count(*) || ':' || min(x) || ',' || min(y) FROM bym.world_map_cell WHERE uid = ${uid}`) === `1:${after.home[0]},${after.home[1]}`, sql(`SELECT count(*) FROM bym.world_map_cell WHERE uid = ${uid}`));
check("bone, coal, sulfur and magma at 0, storage kept", after.res.r1 === 0 && after.res.r2 === 0 && after.res.r3 === 0 && after.res.r4 === 0 && after.res.r1max === before.res.r1max, JSON.stringify(after.res));
check("every outpost gone: no outpost yards, no list, no cells", outpostCount() === 0 && after.outposts.length === 0 && Number(sql(`SELECT count(*) FROM bym.world_map_cell WHERE baseid IN (${given.map((g) => `'${g[2]}'`).join(",")})`)) === 0, `${outpostCount()} ${after.outposts.length}`);
const back = await post("worldmapv2/getarea", `x=${given[0][0]}&y=${given[0][1]}`, token);
const there = back.data && back.data[given[0][0]] && back.data[given[0][0]][given[0][1]];
check("...their places are wild tribes again", there && there.b == 1 && !there.uid, JSON.stringify(there && { b: there.b, uid: there.uid }));
// the spawn rules: near other players, not on top of a main yard
const mains = sql(`SELECT homebase::text FROM bym.save WHERE type = 'main' AND worldid = '${after.world}' AND saveuserid <> ${uid} AND homebase IS NOT NULL`).split("\n").filter(Boolean).map((h) => JSON.parse(h).map(Number));
const yards = sql(`SELECT x || ',' || y FROM bym.world_map_cell WHERE world_id = '${after.world}' AND uid <> ${uid} AND uid > 0 AND base_type IN (2, 3)`).split("\n").filter(Boolean).map((p) => p.split(",").map(Number));
const nearestMain = Math.min(...mains.map((h) => dist(h, after.home)));
const nearestYard = Math.min(...yards.map((p) => dist(p, after.home)));
check("placed like a new player: near other players, clear of their main yards", nearestMain > 5 && nearestYard <= 20, `nearest main yard ${nearestMain}, nearest yard ${nearestYard}`);
check("the world's player count is kept", Number(sql(`SELECT player_count FROM bym.world WHERE uuid = '${after.world}'`)) === players + (after.world === before.world ? 0 : 1), sql(`SELECT player_count FROM bym.world WHERE uuid = '${after.world}'`));

// 4. admin test mode: refused (its snapshot holds the old place)
const adminToken = await login(process.env.EMAIL, process.env.PASSWORD);
await post("admin/testmode", "action=on", adminToken);
const inTest = await post("base/relocate", "confirm=1", adminToken);
await post("admin/testmode", "action=off", adminToken);
check("refused in admin test mode", inTest.status === 409 && /test mode/.test(inTest.error || ""), JSON.stringify({ status: inTest.status, error: inTest.error }));

// 5. the game: the button and its warning (the admin's map, opened from an outpost; not relocated)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (tok) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${server}?token=${tok}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
  return { page, errors };
};
const texts = (page) => page.evaluate(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out; });
/** The text's middle on screen; of several, the one furthest right (a message's button, not the sidebar's). */
const find = (page, label) => page.evaluate((label) => { let best = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text === label) { const r = o.getBounds(window.__player.stage); if (!best || r.x > best.x) best = r; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return best && window.__player.stageToClient(best.x + best.width / 2, best.y + best.height / 2); }, label);
{
  const { page, errors } = await open(await login(process.env.EMAIL, process.env.PASSWORD));
  const outposts = await page.evaluate(() => window.__game.GLOBAL._mapOutpost.length);
  await page.evaluate(() => { window.__game.BASE.LoadNext(); });
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
  await page.evaluate(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  // (the map's own tutorial pages, the first time)
  for (let i = 0; i < 4; i++) { const c = await find(page, "Continue"); if (!c) break; await page.mouse.click(c.x, c.y); await page.waitForTimeout(600); }
  const layout = await page.evaluate(() => { const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc; const b = mc.getChildByName("ioRelocate"); const r = (o) => [Math.round(o.x), Math.round(o.y), Math.round(o.width), Math.round(o.height)]; return b && { relocate: r(b), home: r(mc.bHome), jump: r(mc.bJump), side: r(mc._ioSidebar) }; });
  check("the Relocate button: under Home and Jump, as wide as both, above the sidebar's lists", layout && layout.relocate[0] === layout.home[0] && Math.abs(layout.relocate[0] + layout.relocate[2] - (layout.jump[0] + layout.jump[2])) <= 2 && layout.relocate[1] > layout.home[1] + layout.home[3] - 1 && layout.side[1] >= layout.relocate[1] + layout.relocate[3], JSON.stringify(layout));
  await page.screenshot({ path: (process.env.SHOTS || "/tmp") + "/relocate-map.png" });
  const at = await find(page, "Relocate");
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(1200);
  const warning = (await texts(page)).find((t) => /Relocate your yard\?/.test(t)) || "";
  check("the warning: a new place, resources to 0, the outposts back to the wild tribes", /moved to a new place on the map/.test(warning) && /Bone, Coal, Sulfur and Magma go to 0/.test(warning) && new RegExp(`all ${outposts} of your outposts return to the wild tribes`).test(warning) && /can't be undone/.test(warning), warning.slice(0, 300));
  await page.screenshot({ path: (process.env.SHOTS || "/tmp") + "/relocate-warning.png" });
  await page.evaluate(() => { const M = window.__classByName("MESSAGE"); for (const m of [...(window.__game.GLOBAL._layerTop.$children ?? [])]) if (m instanceof M) m.Hide(); });
  await page.waitForTimeout(800);
  check("...closing it relocates nothing", sql(`SELECT count(*) FROM bym.save WHERE saveuserid = (SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}') AND type = 'outpost'`) === String(outposts), String(outposts));
  check("no page errors (map)", errors.length === 0, errors.slice(0, 3).join("; "));
  await page.close();
}

// 6. the game: relocating, then starting again from the new place with nothing in store
await giveOutposts(1);
{
  token = await login(email, password);
  const { page, errors } = await open(token);
  const before2 = main();
  await page.evaluate(() => window.__classByName("com.monsters.maproom_advanced::IoRelocate").Ask());
  await page.waitForTimeout(1000);
  const warn = (await texts(page)).find((t) => /Relocate your yard\?/.test(t)) || "";
  check("its warning names its one outpost", /your outpost returns to the wild tribes/.test(warn), warn.slice(0, 240));
  const go = await find(page, "Relocate");
  await page.mouse.click(go.x, go.y);
  await page.waitForFunction(() => { const T = window.__classByName("flash.text::TextField"); let hit = false; const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && /has been relocated/.test(o.text)) hit = true; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit; }, null, { timeout: 20000 }).catch(() => {});
  const told = (await texts(page)).find((t) => /has been relocated/.test(t)) || "";
  const moved = main();
  check("relocated from the game: it says where", new RegExp(`relocated to ${moved.home[0]}, ${moved.home[1]}`).test(told) && JSON.stringify(moved.home) !== JSON.stringify(before2.home), told);
  const ok = await find(page, "OK");
  await page.mouse.click(ok.x, ok.y);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.GLOBAL._resources, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const state = await page.evaluate(() => ({ r1: window.__game.GLOBAL._resources.r1.Get(), r4: window.__game.GLOBAL._resources.r4.Get(), home: window.__game.GLOBAL._mapHome && [window.__game.GLOBAL._mapHome.x, window.__game.GLOBAL._mapHome.y], outposts: window.__game.GLOBAL._mapOutpost.length }));
  check("the game starts again there: nothing in store, no outposts", state.r1 === 0 && state.r4 === 0 && state.outposts === 0 && JSON.stringify(state.home) === JSON.stringify(moved.home), JSON.stringify(state));
  check("no page errors (relocating)", errors.length === 0, errors.slice(0, 3).join("; "));
  await page.close();
}
await browser.close();

// the account goes again
const world = main().world;
sql(`DELETE FROM bym.world_map_cell WHERE uid = ${uid}`);
sql(`DELETE FROM bym.save WHERE saveuserid = ${uid} OR userid = ${uid}`);
sql(`DELETE FROM bym."user" WHERE userid = ${uid}`);
sql(`UPDATE bym.world SET player_count = greatest(player_count - 1, 0) WHERE uuid = '${world}'`);
check("the test account is removed", sql(`SELECT count(*) FROM bym."user" WHERE userid = ${uid}`) === "0");
