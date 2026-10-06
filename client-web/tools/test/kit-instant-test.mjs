// An outpost kit bought with resources is built at once, at the kit's levels, as one bought with shiny is
// (the user's, 6 October; popup_prefab.BuildKit, server controllers/maproom/v2/applyKit.ts):
//  - the kit's resources are taken, the outpost is rebuilt from the server
//  - every building of the kit stands at its kit level, nothing left to build up (no `prefab` in the save,
//    no building under construction), the popup says kits are built instantly
//   EMAIL=... (a player with an outpost) PASSWORD=... PGPASSWORD=... node tools/test/kit-instant-test.mjs
// The outpost's save and the player's resources are put back at the end.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const login = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const email = process.env.EMAIL;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`));
const [saveId, ox, oy] = sql(`SELECT s.basesaveid || ',' || c.x || ',' || c.y FROM bym.save s JOIN bym.world_map_cell c ON c.cellid = s.cell_cellid WHERE s.saveuserid = ${uid} AND s.type = 'outpost' ORDER BY s.basesaveid LIMIT 1`).split(",");
const keep = sql(`SELECT buildingdata::text FROM bym.save WHERE basesaveid = ${saveId}`);
const keepRes = sql(`SELECT resources::text FROM bym.save WHERE saveuserid = ${uid} AND type = 'main'`);
// plenty of resources to pay with
sql(`UPDATE bym.save SET resources = COALESCE(resources, '{}'::jsonb) || '{"r1": 90000000, "r2": 90000000, "r3": 90000000, "r4": 90000000}'::jsonb WHERE saveuserid = ${uid} AND type = 'main'`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const next = async () => { for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); } };
  await next();
  await g(() => { window.__game.WMATTACK._enabled = false; });
  await g(([x, y]) => window.__game.BASE.ioLoadOutpost(x, y), [Number(ox), Number(oy)]);
  await page.waitForFunction(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL.mode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await next();
  // the kit popup, and the first kit's buildings with the levels it is to be built at
  const kit = await g(() => {
    const P = window.__classByName("popup_prefab");
    const p = new P();
    window.__game.POPUPS.Push(p);
    window.__kitPopup = p;
    const b = p.GetBuildings(1);
    const levels = {};
    for (const k of Object.keys(b.buildings)) { const x = b.buildings[k]; if (x.t !== 112) levels[`${x.t}@${x.X},${x.Y}`] = x.prefab || x.l || 1; }
    const R = window.__game.GLOBAL._resources;
    return { levels, costs: b.costs.slice(0, 3).map((c) => c.Get()), notice: p.tInstantNotice.text, res: [R.r1.Get(), R.r2.Get(), R.r3.Get()] };
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/kit-instant-popup.png` });
  check("the kit popup says kits are built instantly with resources or shiny", /built instantly, whether you pay with resources or shiny/.test(kit.notice), kit.notice);
  // bought with resources (the warning about replacing the outpost skipped)
  await g(() => window.__kitPopup.Select(1));
  const charged = await g(() => { const R = window.__game.GLOBAL._resources; return [R.r1.Get(), R.r2.Get(), R.r3.Get()]; });
  check("the kit's resources are taken", charged.every((v, i) => v === kit.res[i] - kit.costs[i]), JSON.stringify([kit.res, kit.costs, charged]));
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL.mode === "build" && !window.__game.BASE._blockSave, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await next();
  const saved = JSON.parse(sql(`SELECT buildingdata::text FROM bym.save WHERE basesaveid = ${saveId}`));
  const rows = Object.values(saved).filter((b) => b.t !== 112);
  // (the game's save leaves out the level of a level 1 building)
  const lvl = (b) => (b.l == null ? 1 : b.l);
  const bad = rows.filter((b) => b.prefab != null || (kit.levels[`${b.t}@${b.X},${b.Y}`] != null && lvl(b) !== kit.levels[`${b.t}@${b.X},${b.Y}`]));
  const higher = rows.filter((b) => lvl(b) > 1).length;
  check(`the outpost's save: all ${rows.length} kit buildings at their kit levels (${higher} above level 1), none left to build up`, rows.length > 10 && higher > 5 && bad.length === 0, JSON.stringify(bad.slice(0, 5)));
  const yard = await g(() => {
    const F = window.__classByName("BFOUNDATION");
    const all = window.__classByName("com.monsters.managers::InstanceManager").getInstancesByClass(F);
    const list = [];
    for (const b of all) if (b._type !== 112) list.push({ t: b._type, l: b._lvl.Get(), building: b._countdownBuild.Get(), upgrading: b._countdownUpgrade.Get(), prefab: b._prefab ? b._prefab.Get ? b._prefab.Get() : b._prefab : 0 });
    return list;
  });
  const busy = yard.filter((b) => b.building > 0 || b.upgrading > 0 || b.l < 1);
  await page.screenshot({ path: `${shots}/kit-instant-built.png` });
  check(`in the yard: ${yard.length} buildings standing finished, none being built or upgraded`, yard.length > 10 && busy.length === 0, JSON.stringify(busy.slice(0, 5)));
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET buildingdata = '${keep.replace(/'/g, "''")}'::jsonb WHERE basesaveid = ${saveId}`);
  sql(`UPDATE bym.save SET resources = '${keepRes.replace(/'/g, "''")}'::jsonb WHERE saveuserid = ${uid} AND type = 'main'`);
}
