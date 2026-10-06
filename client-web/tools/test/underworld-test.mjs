// The Underworld, called the Depths of Hell in the game (Inferno-only, 4 October): a 10 x 10 layer below the map, cells 500-509, reached through portals
// at the centres of the biggest lava pools (server: services/maproom/v2/underworld.ts; game: IoUnderworld).
//   EMAIL3=<a player whose main yard has a portal in its Flinger range, with monsters and Shiny> PASSWORD=...
//   PGPASSWORD=... node tools/test/underworld-test.mjs
// (The test database bymio-underworld-ready.dump has show@example.com's yard at -157, -104, 5 from a portal.)
// Prints one line per check; each must end in "ok". It attacks and takes over an underworld cell (EMAIL3 gets an
// outpost there).
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
const email = process.env.EMAIL3;
const MRN = "com.monsters.maproom_advanced::MapRoom", UW = "com.monsters.maproom_advanced::IoUnderworld";
const ax = (x, y) => [x, y - (x - (x & 1)) / 2];
const hex = (x1, y1, x2, y2) => { const [q1, r1] = ax(x1, y1), [q2, r2] = ax(x2, y2); const dq = q2 - q1, dr = r2 - r1; return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)); };

const open = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await g(() => { window.__game.WMATTACK._enabled = false; });
  const api = (path, body) => g(async ([url, body]) => { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body }); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, ...j }; }, [server + path, body]);
  const openMap = async () => {
    await g(() => window.__game.GLOBAL.ShowMap());
    await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  };
  const jump = async (x, y) => {
    await g(([x, y, MRN]) => window.__classByName(MRN).JumpTo(new (window.__classByName("flash.geom::Point"))(x, y)), [x, y, MRN]);
    await page.waitForTimeout(4000);
    for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  };
  return { page, g, api, openMap, jump };
};

try {
  let { page, g, api, openMap, jump } = await open();
  const home = JSON.parse(sql(`SELECT s.homebase FROM bym.save s JOIN bym."user" u ON u.userid = s.userid WHERE u.email = '${email}' AND s.type = 'main'`)).map(Number);
  const homeBid = sql(`SELECT s.baseid FROM bym.save s JOIN bym."user" u ON u.userid = s.userid WHERE u.email = '${email}' AND s.type = 'main'`);

  // ---- the server: portals, the underworld's cells, what the yards reach
  const reach = await api("worldmapv2/ioreach", "");
  const portals = reach.portals || [];
  check("the world has about 10 portals, each a pair of ends", portals.length >= 8 && portals.length <= 12 && portals.every((p) => p.length === 4 && p[2] >= 500 && p[2] < 510 && p[3] >= 500 && p[3] < 510), JSON.stringify(portals));
  const near = portals.map((p, i) => ({ i, p, d: hex(home[0], home[1], p[0], p[1]) })).sort((a, b) => a.d - b.d)[0];
  const area = await api("worldmapv2/getarea", `x=500&y=500&zones=500,500;${Math.floor(near.p[0] / 10) * 10},${Math.floor(near.p[1] / 10) * 10}`);
  const under = (area.areas || []).find((a) => a.x === 500);
  const cells = under ? Object.entries(under.data).flatMap(([x, col]) => Object.entries(col).map(([y, c]) => ({ x: Number(x), y: Number(y), ...c }))) : [];
  const levels = {};
  cells.forEach((c) => { if (c.b === 1) levels[c.l] = (levels[c.l] || 0) + 1; });
  check("getarea sends the underworld's zone: 100 cells, every one Moloch's but the portals (empty land, as high: 125, neutral)", cells.length === 100 && cells.filter((c) => c.io_portal).length === portals.length && cells.filter((c) => !c.io_portal).every((c) => c.b === 1 && c.n === "Moloch" && c.u === 1 && c.i === 125) && cells.filter((c) => c.io_portal).every((c) => !c.b && c.i === 125), JSON.stringify({ n: cells.length, sample: cells.slice(0, 2) }));
  check("…at levels 38, 42, 46 and 50 (a quarter each, the easiest next to the portals)", Object.keys(levels).sort().join() === "38,42,46,50" && Object.values(levels).every((n) => n >= 20 && n <= 26), JSON.stringify(levels));
  check("…and where the underworld and its portals are (io_under)", area.io_under && area.io_under.o === 500 && area.io_under.s === 10 && area.io_under.p.length === portals.length, JSON.stringify(area.io_under));
  const overZone = (area.areas || []).find((a) => a.x !== 500);
  const portalCell = overZone && overZone.data[near.p[0]] && overZone.data[near.p[0]][near.p[1]];
  check("an overworld portal is a lava cell that says where it comes out", portalCell && portalCell.i <= 99 && portalCell.io_portal && portalCell.io_portal[3] === near.p[2], JSON.stringify(portalCell));
  check("ioreach: the main yard opens the portal in its range", near.d <= 12 && (reach.entry[String(near.i)] || []).some(([bid, d]) => String(bid) === homeBid && d === near.d) && reach.cells[homeBid], JSON.stringify({ near, entry: reach.entry }));

  // ---- the map: a portal, Enter, the underworld
  await openMap();
  await jump(near.p[0], near.p[1]);
  const tile = await g(([x, y, MRN]) => { const mc = window.__classByName(MRN)._mc; const c = (mc._cells || []).find((c) => c.X === x && c.Y === y); return c ? { portal: c._ioPortal, icon: !!c.mc.getChildByName("ioPortal") } : null; }, [near.p[0], near.p[1], MRN]);
  check("the map shows the portal on its cell", tile && tile.portal && tile.icon, JSON.stringify(tile));
  await page.screenshot({ path: `${shots}/underworld-portal.png` });
  const bubble = await g(([x, y, MRN]) => { const mc = window.__classByName(MRN)._mc; const c = (mc._cells || []).find((c) => c.X === x && c.Y === y); c.ioClick(); const b = mc._ioSpot; const go = b && b.getChildByName("ioPortalGo"); return { name: b && b.name, open: go && go.alpha === 1 }; }, [near.p[0], near.p[1], MRN]);
  check("clicking it: Portal to the Depths of Hell, Enter (a yard has it in range)", bubble.name === "ioPortalBubble" && bubble.open, JSON.stringify(bubble));
  await page.screenshot({ path: `${shots}/underworld-portal-bubble.png` });
  await g((MRN) => { const b = window.__classByName(MRN)._mc._ioSpot; b.getChildByName("ioPortalGo").dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click")); }, MRN);
  await page.waitForTimeout(5000);
  const mode = await g(([MRN, UW]) => ({ under: window.__classByName(UW).under, width: window.__classByName(MRN)._mapWidth, banner: !!window.__classByName(MRN)._mc.getChildByName("ioUnderBanner") }), [MRN, UW]);
  check("Enter: the map shows the underworld (1000 wide, nothing wraps, its banner)", mode.under && mode.width === 1000 && mode.banner, JSON.stringify(mode));
  await page.screenshot({ path: `${shots}/underworld-map.png` });

  const [ux, uy] = [near.p[2], near.p[3]];
  const adjacent = cells.filter((c) => !c.io_portal && hex(c.x, c.y, ux, uy) === 1).map((c) => [c.x, c.y]);
  const far = cells.filter((c) => !c.io_portal && portals.every((p) => hex(c.x, c.y, p[2], p[3]) >= 3)).map((c) => [c.x, c.y]);
  const view = await g(([adjacent, far, MRN]) => {
    const mc = window.__classByName(MRN)._mc;
    const at = (x, y) => (mc._cells || []).find((c) => c.X === x && c.Y === y);
    const outside = (mc._cells || []).find((c) => c.X >= 510 || c.Y >= 510 || c.X < 500 || c.Y < 500);
    const U = window.__classByName("com.monsters.maproom_advanced::IoUnderworld");
    return { adj: adjacent.map(([x, y]) => at(x, y) && at(x, y)._inRange), far: far.map(([x, y]) => at(x, y) && at(x, y)._inRange), outside: outside ? { h: outside._height, base: outside._base, void: !!(outside._ioVoid || U.isVoid(outside.X, outside.Y)), lava: !!outside._groundVariant && outside._groundVariant.bitmapData === U.depthsGround(outside.X, outside.Y) } : null };
  }, [adjacent, far, MRN]);
  check("the cells next to the portal's end are in range; those far from any portal are not", view.adj.length > 0 && view.adj.every(Boolean) && view.far.length > 0 && view.far.every((v) => !v), JSON.stringify(view));
  check("around the island: lava (at the island's level, drawn with the Depths' lava), nothing asked for", view.outside && view.outside.void && view.outside.h === 125 && view.outside.lava && !view.outside.base, JSON.stringify(view.outside));
  const target = adjacent[0];
  const attack = await g(async ([x, y, fx, fy, MRN]) => {
    const MR = window.__classByName(MRN), mc = MR._mc;
    const at = (x, y) => (mc._cells || []).find((c) => c.X === x && c.Y === y);
    mc.ShowInfoEnemy(at(fx, fy));
    const farRange = MR._flingerInRange;
    mc.HideInfoEnemy();
    mc.ShowInfoEnemy(at(x, y));
    const inRange = MR._flingerInRange;
    mc.HideInfoEnemy();
    mc.ShowAttack(at(x, y));
    const pa = mc._popupAttackA;
    for (let i = 0; i < 30 && !pa._enabled; i++) await new Promise((r) => setTimeout(r, 300));
    const sources = Array.from(pa._cellsInRange || []).filter((o) => o && o.cell && o.cell._mine).map((o) => [o.cell.X, o.cell.Y, o.range, String(o.cell._baseID)]);
    return { farRange, inRange, enabled: pa._enabled, sources, avail: Object.keys(window.__game.ATTACK._curCreaturesAvailable || {}).length };
  }, [target[0], target[1], far[0][0], far[0][1], MRN]);
  check("a cell next to the portal: in range, the attack offers the main yard's monsters through it", attack.inRange && attack.enabled && attack.sources.some((s) => s[3] === homeBid) && attack.avail > 0, JSON.stringify(attack));
  check("a cell far from the portals: out of range", attack.farRange === false, JSON.stringify(attack));
  await page.screenshot({ path: `${shots}/underworld-attack.png` });
  await g((MRN) => window.__classByName(MRN)._mc.HideAttack(), MRN);

  // ---- the server's range check (an attack's yard load)
  const bidOf = (x, y) => cells[0].bid.slice(0, -6) + String(x).padStart(3, "0") + String(y).padStart(3, "0");
  const load = (bid) => g(async ([bid]) => { const G = window.__game.GLOBAL; const r = await fetch(G._baseURL + "load", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body: `userid=&baseid=${bid}&type=attack&mapversion=2` }); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, error: j.error, message: j.message, buildings: j.buildingdata ? Object.keys(j.buildingdata).length : 0, wmid: j.wmid, level: j.level }; }, [bid]);
  const farLoad = await load(bidOf(far[0][0], far[0][1]));
  check("the server refuses an attack on an underworld cell nothing reaches", farLoad.status === 403 && /range/i.test(String(farLoad.message || farLoad.error)), JSON.stringify(farLoad));
  const portalLoad = await load(bidOf(ux, uy));
  check("…and on a portal", portalLoad.status === 403 && /range/i.test(String(portalLoad.error)), JSON.stringify(portalLoad));
  const tBid = bidOf(target[0], target[1]);
  const nearLoad = await load(tBid);
  const tLevel = cells.find((c) => c.x === target[0] && c.y === target[1]).l;
  check("…and lets the main yard attack the cell next to the portal: a Moloch stronghold of its level", !nearLoad.error && nearLoad.buildings > 20 && nearLoad.wmid === 51 && nearLoad.level === tLevel, JSON.stringify(nearLoad));

  // ---- a takeover there costs twice as much
  sql(`UPDATE bym.save SET damage = 100, destroyed = 1, attackid = 0 WHERE baseid = '${tBid}'`);
  await page.close();
  ({ page, g, api, openMap, jump } = await open());
  await openMap();
  await jump(target[0], target[1]);
  const price = await g(async ([x, y, MRN]) => {
    const mc = window.__classByName(MRN)._mc;
    const cell = (mc._cells || []).find((c) => c.X === x && c.Y === y);
    mc.ShowInfoEnemy(cell);
    const pe = mc._popupInfoEnemy;
    for (let i = 0; i < 20 && pe.bAttack._label !== undefined && false; i++) await new Promise((r) => setTimeout(r, 200));
    const PT = window.__classByName("com.monsters.maproom_advanced::PopupTakeover");
    const p = new PT(cell);
    return { resources: p._resourceCost.Get(), shiny: p._shinyCost.Get(), level: cell._level, destroyed: cell._destroyed, inRange: window.__classByName(MRN)._flingerInRange, text: p.tDescription.text };
  }, [target[0], target[1], MRN]);
  const base = Math.max(Math.round((price.level * 562500 - 14750000) / 250000) * 250000, 1000000);
  check("the takeover of an underworld cell costs twice as much (resources and Shiny), and says so", price.inRange && price.resources === base * 2 && price.shiny === 200 && /Depths of Hell: 2x/.test(price.text), JSON.stringify({ price, base }));
  const credits = Number(sql(`SELECT credits FROM bym.save WHERE baseid = '${homeBid}' AND type = 'main'`));
  const took = await api("worldmapv2/takeoverCell", `baseid=${tBid}&shiny=${price.shiny}&resources=${encodeURIComponent("{}")}`);
  const outposts = JSON.parse(sql(`SELECT outposts FROM bym.save WHERE baseid = '${homeBid}' AND type = 'main'`));
  check("taken over: an outpost of theirs in the underworld (200 Shiny)", took.error === 0 && outposts.some(([x, y, id]) => x === target[0] && y === target[1] && String(id) === String(tBid)) && Number(sql(`SELECT credits FROM bym.save WHERE baseid = '${homeBid}' AND type = 'main'`)) === credits - 200, JSON.stringify({ took, outposts }));

  // ---- the outpost: range 1, no Flinger, not a place to move to
  const area2 = await api("worldmapv2/getarea", "x=500&y=500");
  const mine = area2.data[target[0]][target[1]];
  check("the map shows it as theirs with range 1 (u, f: 1)", mine.mine === 1 && mine.b === 3 && mine.u === 1 && mine.f === 1, JSON.stringify(mine).slice(0, 300));
  const reach2 = await api("worldmapv2/ioreach", "");
  check("ioreach: it holds the portal next to it (the way out)", (reach2.exit[String(near.i)] || []).some(([bid]) => String(bid) === String(tBid)), JSON.stringify(reach2.exit));
  const migrate = await api("base/migrate", `baseid=${tBid}&type=main&shiny=0&resources=${encodeURIComponent("{}")}`);
  check("a main yard can't be moved there", migrate.status >= 400 && /Depths of Hell/.test(String(migrate.message || migrate.error)), JSON.stringify(migrate));

  await page.close();
  ({ page, g, api, openMap, jump } = await open());
  await openMap();
  await jump(target[0], target[1]);
  const own = await g(([x, y, MRN, UW]) => {
    const mc = window.__classByName(MRN)._mc;
    const at = (x, y) => (mc._cells || []).find((c) => c.X === x && c.Y === y);
    const cell = at(x, y);
    mc.ShowInfoMine(cell);
    const pm = mc._popupInfoMine;
    const relocate = pm.bRelocate.visible, invite = pm.bInviteMigrate.visible;
    mc.HideInfoMine();
    return { under: window.__classByName(UW).under, range: cell._flingerRange.Get(), ioUnder: cell._ioUnder, relocate, invite, label: window.__classByName("com.monsters.maproom_advanced::IoMapUi").coord(x, y) };
  }, [target[0], target[1], MRN, UW]);
  check("its cell on the map: range 1, no Relocate or Invite to move, called by its underworld numbers", own.under && own.range === 1 && own.ioUnder && !own.relocate && !own.invite && /^Depths of Hell \d+, \d+$/.test(own.label), JSON.stringify(own));
  const neighbours = cells.filter((c) => !c.io_portal && hex(c.x, c.y, target[0], target[1]) === 1 && hex(c.x, c.y, ux, uy) > 1).map((c) => [c.x, c.y]);
  const spread = await g(([list, MRN]) => { const mc = window.__classByName(MRN)._mc; return list.map(([x, y]) => { const c = (mc._cells || []).find((c) => c.X === x && c.Y === y); return c && c._inRange; }); }, [neighbours, MRN]);
  check("the cells next to the outpost are in range", spread.length > 0 && spread.every(Boolean), JSON.stringify({ neighbours, spread }));
  await page.screenshot({ path: `${shots}/underworld-outpost.png` });

  // out of a portal: an overworld cell within 5 of it is reached from the outpost below
  await jump(near.p[0], near.p[1]);
  const exit = await g(([x, y, MRN, UW]) => {
    const mc = window.__classByName(MRN)._mc;
    const cells = mc.GetCellsInRange(x, y, 10);
    const out = window.__classByName(UW).withReach(cells, x, y);
    return { under: window.__classByName(UW).under, width: window.__classByName(MRN)._mapWidth, sources: Array.from(out).filter((o) => o && o.cell && o.cell._ioUnder).map((o) => [o.cell.X, o.cell.Y, o.range]) };
  }, [near.p[0] + 2, near.p[1], MRN, UW]);
  check("back up (Home and portals: the overworld, 400 wide); a cell near the portal is reached from the outpost below", !exit.under && exit.width === 400 && exit.sources.some((s) => s[0] === target[0] && s[1] === target[1]), JSON.stringify(exit));

  // in the outpost (loaded with the map closed, as the Outposts list does): no Flinger to build
  await page.close();
  ({ page, g, api, openMap, jump } = await open());
  await g(([x, y]) => window.__game.BASE.ioLoadOutpost(x, y), [target[0], target[1]]);
  await page.waitForFunction(() => window.__game.GLOBAL.mode === "build" && !window.__game.BASE._loading && window.__game.BASE.isOutpost, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const build = await g(() => ({ outpost: window.__game.BASE.isOutpost, under: window.__game.BASE.ioInUnderworldOutpost(), flinger: window.__game.BASE.CanBuild(5) }));
  check("in the underworld outpost a Flinger can't be built", build.outpost && build.under && build.flinger.error && /no Flinger/.test(build.flinger.errorMessage), JSON.stringify(build));
  await page.screenshot({ path: `${shots}/underworld-in-outpost.png` });

  check("no game errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
