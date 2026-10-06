// An attack from the main yard when the main yard is off the map's screen (bug report, 3 October): the
// map is moved so the home yard is out of view and a yard in the Flinger's range is on screen; its Attack
// must offer the home yard's monsters (even with the map's stand-in for the home yard made from the world
// snapshot, before the home's zone arrived, as it was when the bug was reported). With FULL=1 the attack is made (three monsters flung) and, back
// home, the yard must have three fewer: this changes the account's yard.
//   EMAIL3=<a player with monsters and a yard in reach> PASSWORD=... [FULL=1] node tools/test/offscreen-attack-test.mjs
// Prints one line per check; each must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const email = process.env.EMAIL3 || process.env.EMAIL;
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const next = async () => { for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); } };
const housed = () => g(() => { const o = {}; const P = window.__game.GLOBAL.player; for (const id of Object.keys(window.__classByName("CREATURELOCKER")._creatures)) { const l = P.monsterListByID && P.monsterListByID(id); if (l && l.numCreeps) o[id] = l.numCreeps; } return o; });

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  await next();
  await g(() => { window.__game.WMATTACK._enabled = false; });
  const before = await housed();
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(5000);
  await next();
  const home = await g(() => {
    const H = window.__game.GLOBAL._mapHome, mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc;
    const tile = (mc._cells || []).find((c) => c.X === H.x && c.Y === H.y);
    return { x: H.x, y: H.y, range: tile && tile.flingerRange ? tile.flingerRange.Get() : 0 };
  });
  let r = null;
  for (const shift of [6, 5, 7, 4]) {
    // the map's centre moved right of home: its left edge is about 6 columns left of the centre
    await g(([x, y]) => { const MR = window.__classByName("com.monsters.maproom_advanced::MapRoom"); MR.JumpTo(new (window.__classByName("flash.geom::Point"))(x, y)); }, [home.x + home.range + shift, home.y]);
    await page.waitForTimeout(5000);
    r = await g(async (home) => {
      const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc;
      const ax = (x, y) => [x, y - (x - (x & 1)) / 2];
      const dist = (a, b) => { const [q1, r1] = ax(a.X, a.Y), [q2, r2] = ax(b.X, b.Y); const dq = q2 - q1, dr = r2 - r1; return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)); };
      const homeTile = (mc._cells || []).find((c) => c.X === home.x && c.Y === home.y && c.parent);
      if (homeTile) return { homeOnScreen: true };
      const H = { X: home.x, Y: home.y };
      const targets = (mc._cells || []).filter((c) => c._updated && c._base > 0 && !c._mine && !c._destroyed && dist(H, c) <= home.range && dist(H, c) >= home.range - 2);
      const target = targets[0];
      if (!target) return { noTarget: true };
      // (the stock stand-in for an off-screen home, made as when the map first drew before the home's
      // zone arrived: from the world snapshot, with no monsters; it is never made again: the bug)
      const SN = window.__classByName("com.monsters.maproom_advanced::IoMapSnapshot"), snap = SN.CellAt(home.x, home.y);
      mc._fallbackHomeCell = new (window.__classByName("com.monsters.maproom_advanced::MapRoomCell"))();
      mc._fallbackHomeCell.X = home.x;
      mc._fallbackHomeCell.Y = home.y;
      if (snap) mc._fallbackHomeCell.Setup(snap);
      mc.ShowAttack(target);
      const pa = mc._popupAttackA;
      for (let i = 0; i < 30 && !pa._enabled; i++) await new Promise((res) => setTimeout(res, 300));
      const mine = Array.from(pa._cellsInRange || []).filter((o) => o && o.cell && o.cell._mine).map((o) => [o.cell.X, o.cell.Y, o.range, !!o.cell.parent]);
      return { target: [target.X, target.Y, dist(H, target)], enabled: pa._enabled, avail: Object.assign({}, window.__game.ATTACK._curCreaturesAvailable), mine };
    }, home);
    if (r && r.target) break;
  }
  const homeCell = r && r.mine && r.mine.find((m) => m[0] === home.x && m[1] === home.y);
  check("the home yard is off screen and a yard in its Flinger's range is on screen", r && r.target, JSON.stringify({ home, r }));
  check("…its Attack is enabled, with the off-screen home yard among the yards in range", r && r.enabled && homeCell && !homeCell[3], JSON.stringify(r && r.mine));
  check("…and offers the home yard's monsters", r && Object.keys(before).length > 0 && Object.keys(before).every((id) => (r.avail[id] || 0) >= before[id]), JSON.stringify({ before, avail: r && r.avail }));

  if (process.env.FULL && r && r.enabled) {
    await g(() => window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc._popupAttackA.DoAttack());
    await page.waitForFunction(() => (window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.WMATTACK || window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.ATTACK) && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(4000);
    await next();
    const flung = await g(() => {
      const A = window.__game.ATTACK, R = window.__classByName("GRID"), PT = window.__classByName("flash.geom::Point");
      const id = Object.keys(A._curCreaturesAvailable).find((k) => A._curCreaturesAvailable[k] >= 3);
      for (let k = 0; k < 3; k++) A.BucketAdd(id);
      const p = R.ToISO(560, 0, 0);
      A.Spawn(new PT(p.x, p.y), 120);
      return id;
    });
    await page.waitForTimeout(8000);
    await g(() => { try { window.__game.ATTACK.End(); } catch (e) {} });
    await page.waitForTimeout(5000);
    await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} window.__game.BASE.LoadBase(null, 0, 0, window.__game.GLOBAL.e_BASE_MODE.BUILD, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD); });
    await page.waitForFunction(() => window.__game.GLOBAL.mode === "build" && !window.__game.BASE._loading, null, { timeout: 60000 });
    await page.waitForTimeout(4000);
    const after = await housed();
    check("FULL: the three monsters flung come out of the off-screen home yard", (after[flung] || 0) === before[flung] - 3, JSON.stringify({ flung, before: before[flung], after: after[flung] }));
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}
