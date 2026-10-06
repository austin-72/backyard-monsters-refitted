// Recycling in outposts is for the Designer only (29 September), and two errors from the bug reports:
//  - an outpost kit draft (the Designer): its buildings can be recycled (the Recycle button asks, then the
//    building goes); construction can be stopped there too; the outpost hall still cannot be recycled
//  - a player's own outpost: its buildings cannot be recycled (the stock message), as before
//  - #47 "Cannot read properties of null (reading 'x') at Scroll": two base loads in flight both built a
//    yard, and the first one's map ground kept calling MAP.Scroll once the map was cleared for the next yard:
//    only the latest answer builds now, a ground set up again lets go of the old one, and a stray Scroll does
//    nothing (and lets go)
//  - #42/#43 "costs[_lvl.Get()] is undefined" in BuildingOverlay.Update: a building under construction comes
//    back from a save at level 1 (a save holds no level 0), and the overlay timed its build by that level's
//    cost; a Map Room (one cost only) threw on every frame. Viewing a yard with one no longer throws, and the
//    build bar is timed by the building's construction (its first cost)
//  - no page errors (other than the ones provoked on purpose, which must not appear)
//   EMAIL=<admin> EMAIL2=<another player> PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/designer-recycle-test.mjs
// The friend's yard gets a Map Room under construction for the test, taken out after; the kit draft is Reset.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const login = async (email) => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
let admin = await login(process.env.EMAIL);
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const fid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL2}'`));
const friendBase = sql(`SELECT baseid FROM bym.save WHERE userid = ${fid} AND type = 'main'`);
const outpost = sql(`SELECT baseid FROM bym.save WHERE userid = ${uid} AND type = 'outpost' ORDER BY baseid LIMIT 1`);
const MR = 997011;
// a Map Room under construction, as a save holds it: no level (the save leaves out level 0 and 1 alike), a build countdown
// (saved just now, so catching the yard up to now does not finish it)
const savedAt = sql(`SELECT savetime FROM bym.save WHERE userid = ${fid} AND type = 'main'`);
sql(`UPDATE bym.save SET buildingdata = buildingdata || '{"${MR}": {"X": 60, "Y": 60, "t": 11, "id": ${MR}, "cB": 50000}}'::jsonb, savetime = extract(epoch from now())::int WHERE userid = ${fid} AND type = 'main'`);
const restore = () => sql(`UPDATE bym.save SET buildingdata = buildingdata - '${MR}', savetime = ${savedAt || 0} WHERE userid = ${fid} AND type = 'main'`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const loaded = async (pred, timeout = 45000) => { const end = Date.now() + timeout; while (Date.now() < end) { try { if (await g(pred)) return true; } catch (e) {} await page.waitForTimeout(400); } return false; };
const settle = async () => { await page.waitForTimeout(3000); for (let i = 0; i < 3; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); } };
const closeMessages = () => g(() => { const M = window.__classByName("MESSAGE"); const top = window.__game.GLOBAL._layerTop; let n = 0; for (const c of [...(top.$children ?? [])]) if (c instanceof M) { try { c.Hide(); n++; } catch (e) {} } return n; });
// the text of the message box on screen, and its buttons
const message = () => g(() => { const M = window.__classByName("MESSAGE"); const T = window.__classByName("flash.text::TextField"); const top = window.__game.GLOBAL._layerTop; const out = []; for (const c of top.$children ?? []) if (c instanceof M) { const walk = (o) => { if (o instanceof T && o.text) out.push(o.text); for (const k of o.$children ?? []) walk(k); }; walk(c); } return out.join(" | "); });
const key = (k) => g((k) => window.__game.KEYS.Get(k), k);
// Asks the building to recycle (as its Recycle button does) and says what the game answered.
const recycle = (id) => g((id) => { const B = window.__game.BASE; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; if (Number(b._id) === id) { b.Recycle(); return { blocked: !!b._blockRecycle, type: b._type }; } } return null; }, id);
const buildings = () => g(() => { const B = window.__game.BASE; const out = []; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; out.push({ id: Number(b._id), t: b._type, blocked: !!b._blockRecycle, cB: b._countdownBuild.Get(), lvl: b._lvl.Get() }); } return out; });

try {
  await page.goto(`${server}?token=${admin}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await settle();
  admin = (await g(() => window.__classByName("LOGIN").token)) || admin; // (the game's session token, from its login)
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });

  // --- #47: two base loads in flight (a yard opened while another was still loading): both answers built a
  // yard, and the first one's map ground was left listening; its Scroll then ran into the next cleared map
  errors = [];
  const race = await g(async ([friend]) => {
    const B = window.__game.BASE, G = window.__game.GLOBAL, M = window.__classByName("MAP");
    // every map ground made from now on (a ground is the sprite MAP.Scroll is put on)
    const grounds = []; const E = window.__classByName("flash.events::EventDispatcher").prototype; const add = E.addEventListener;
    E.addEventListener = function (type, fn, ...rest) { if (type === "enterFrame" && fn === M.Scroll && !grounds.includes(this)) grounds.push(this); return add.call(this, type, fn, ...rest); };
    // (LoadBase refuses a second load while one is loading; the game's other ways in do not: BASE.Load straight)
    B.LoadBase(null, 0, Number(friend), "view", false, 0); // (its answer comes back after the next load started)
    G.Setup("build"); B.Load(null, 0, G._homeBaseID, 0);
    for (let i = 0; i < 150 && (B._loading || !M._GROUND); i++) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 1500));
    E.addEventListener = add;
    const maps = grounds;
    return { base: String(B._loadedBaseID), home: String(G._homeBaseID), mode: G._loadmode, built: maps.length, listening: maps.filter((c) => c.hasEventListener("enterFrame")).length };
  }, [friendBase]);
  check("#47: of two loads in flight only the latest builds its yard (one map, listening once)", race.base === race.home && race.mode === "build" && race.built === 1 && race.listening === 1, JSON.stringify(race));
  await settle();
  // a map ground left over anyway (set up again without the map cleared between, or a stray listener)
  const stale = await g(async () => {
    const M = window.__classByName("MAP"), S = window.__classByName("flash.display::Sprite");
    const first = M._GROUND;
    new M("lava"); // (a second set-up without MAP.Clear between)
    const stray = new S(); stray.addEventListener("enterFrame", M.Scroll);
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 30));
    return { two: first !== M._GROUND, firstStillListens: first.hasEventListener("enterFrame"), strayStillListens: stray.hasEventListener("enterFrame") };
  });
  await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0));
  await loaded(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__classByName("MAP")._GROUND);
  await settle();
  const scrollErrors = errors.filter((e) => /Scroll|reading 'x'/.test(e));
  check("#47: a ground set up again lets go of the old one, a stray Scroll lets go of itself, and nothing throws while the next yard loads", stale.two && !stale.firstStillListens && !stale.strayStillListens && scrollErrors.length === 0, JSON.stringify({ ...stale, scrollErrors: scrollErrors.slice(0, 2) }));

  // --- #42/#43: a friend's yard with a Map Room under construction, viewed
  errors = [];
  await g((b) => window.__game.BASE.LoadBase(null, 0, b, "view", false, 0), friendBase);
  await loaded(() => window.__game.GLOBAL._loadmode === "view" && !window.__game.BASE._loading);
  await settle();
  await page.waitForTimeout(2500);
  const mr = await g((id) => {
    const B = window.__game.BASE; let b = null; for (const k in B._buildingsAll) if (Number(B._buildingsAll[k]._id) === id) b = B._buildingsAll[k];
    if (!b) return null;
    const O = window.__classByName("com.monsters.display::BuildingOverlay");
    const o = O && O._buildings ? O._buildings[b._id] : null;
    return { lvl: b._lvl.Get(), cB: b._countdownBuild.Get(), costs: b._buildingProps.costs.length, first: b._buildingProps.costs[0].time.Get(), text: o ? o.indextext : null };
  }, MR);
  await page.screenshot({ path: `${shots}/recycle-view-maproom.png` });
  const costErrors = errors.filter((e) => /costs|"time"|'time'/.test(e));
  check("#42/#43: viewing a yard with a Map Room under construction (saved at level 1, one cost) throws nothing", mr && mr.cB > 0 && mr.costs === 1 && costErrors.length === 0, JSON.stringify({ mr, costErrors: costErrors.slice(0, 2) }));
  check("  its bar says it is being built", mr && mr.text === "building", JSON.stringify(mr));

  // --- a player's own outpost: no recycling (stock)
  await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0));
  await loaded(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading);
  await settle();
  await g((b) => window.__game.BASE.LoadBase(null, 0, Number(b), "build", false, 1), outpost);
  await loaded(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL._loadmode === "build");
  // (opened straight, not from the map, so there is no map cell: a stand-in one for the outpost's saves)
  await g(() => { const G = window.__game.GLOBAL; if (!G._currentCell) G._currentCell = { cellHeight: 100 }; });
  await settle();
  const own = await buildings();
  const ownOne = own.find((b) => b.t !== 112 && b.cB === 0);
  const ownFlag = await g(() => ({ recycling: window.__game.GLOBAL.outpostRecycling, design: window.__game.GLOBAL.ioDesignMode() }));
  await closeMessages();
  const ownAnswer = ownOne ? await recycle(ownOne.id) : null;
  const ownText = await message();
  const noRecycle = await key("msg_recycleoutpostbuilding");
  check("a player's outpost: its buildings cannot be recycled (the stock message)", !ownFlag.recycling && !ownFlag.design && ownOne && own.filter((b) => b.t !== 112).every((b) => b.blocked) && ownAnswer.blocked && ownText.includes(noRecycle.slice(0, 30)), JSON.stringify({ ownFlag, ownOne, ownAnswer, ownText: ownText.slice(0, 120), n: own.length, where: await g(() => [String(window.__game.BASE._loadedBaseID), window.__game.BASE.isOutpost, window.__game.BASE._loading, window.__game.GLOBAL._loadmode]) }));
  await closeMessages();

  // --- an outpost kit in the Designer: recycling allowed
  await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0));
  await g(() => { window.__game.GLOBAL._currentCell = null; });
  await loaded(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isOutpost);
  await settle();
  await post("admin/design", "action=reset&kind=kit&key=1", admin);
  const opened = await post("admin/design", "action=open&kind=kit&key=1", admin);
  await g((b) => window.__game.BASE.LoadBase(null, 0, Number(b), "build", false, 1), opened.baseid);
  await loaded(() => window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.ioDesign().kind === "kit" && !window.__game.BASE._loading);
  await settle();
  const kit = await buildings();
  const kitFlag = await g(() => ({ recycling: window.__game.GLOBAL.outpostRecycling, outpost: window.__game.BASE.isOutpostOrInfernoOutpost, design: window.__game.GLOBAL.ioDesign() && window.__game.GLOBAL.ioDesign().kind, base: String(window.__game.BASE._loadedBaseID) }));
  kitFlag.want = String(opened.baseid); kitFlag.opened = JSON.stringify(opened).slice(0, 200);
  const kitOne = kit.find((b) => b.t !== 112 && b.cB === 0);
  await closeMessages();
  const kitAnswer = kitOne ? await recycle(kitOne.id) : null;
  const kitText = await message();
  const askRecycle = await key("msg_recyclebuilding_btn");
  check("an outpost kit in the Designer: its buildings can be recycled (Recycle asks)", kitFlag.recycling && kitFlag.outpost && kitOne && kit.filter((b) => b.t !== 112).every((b) => !b.blocked) && kitAnswer && !kitAnswer.blocked && kitText.includes(askRecycle), JSON.stringify({ kitFlag, kitOne, kitAnswer, kitText: kitText.slice(0, 160) }));
  // the answer: yes (RecycleB, as the message's button)
  await g((id) => { const B = window.__game.BASE; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; if (Number(b._id) === id) b.RecycleB(); } }, kitOne.id);
  await closeMessages();
  await page.waitForTimeout(1500);
  const after = await buildings();
  check("  and Recycle takes it away", !after.some((b) => b.id === kitOne.id) && after.length === kit.length - 1, JSON.stringify({ before: kit.length, after: after.length }));
  const hall = after.find((b) => b.t === 112);
  const hallAnswer = hall ? await recycle(hall.id) : null;
  const hallText = await message();
  check("  the outpost hall still cannot be recycled", hall && !hallText.includes(askRecycle) && hallText.length > 0, JSON.stringify({ hall, hallAnswer, hallText: hallText.slice(0, 120) }));
  await closeMessages();
  // stopping construction too: a building put down in the draft is finished at once (free build), so a countdown is set by hand
  const stop = await g(() => { const B = window.__game.BASE; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; if (b._type !== 112) { b._countdownBuild.Set(500); b.Recycle(); const r = b._countdownBuild.Get(); return r; } } return null; });
  const stopText = await message();
  check("  and construction can be stopped there", stop > 0 && stopText.includes(await key("msg_destroybuilding_btn")), stopText.slice(0, 160));
  await closeMessages();
  await page.screenshot({ path: `${shots}/recycle-kit.png` });

  await post("admin/design", "action=reset&kind=kit&key=1", admin);
  await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0));
  await loaded(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.GLOBAL.ioDesignMode());
  await settle();
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await post("admin/design", "action=reset&kind=kit&key=1", admin).catch(() => {});
  await browser.close();
}
