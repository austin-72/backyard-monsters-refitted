// Admin test mode (switch next to the Admin button; server services/admin/testMode.ts, client
// com/monsters/admin/IoTestMode.as). Needs an admin account (InfernoOnlyConfig.admins) with a Compound, at
// least one outpost and a Map Room 2 world (another player's main yard near home is practice-attacked if there is one).
//   EMAIL=... PASSWORD=... ADMIN_NAME=<its username> node tools/test/admin-test-mode-test.mjs
// Checks: the switch and banner; unlimited resources and shiny; a second Compound placed and built at once;
// the Town Hall upgraded at once; every monster unlocked; the Compound without limit; the test tools
// (defenders, a wild attack now, attackers, repair, protection, fast-forward, take a cell, make it wild);
// practice attacks (a protected yard can be attacked, nothing is written to it); the leaderboards leave the
// admin out; switching off puts the account back as it was; a game still in test mode cannot save over it;
// switching account and logging in again switch it off too.
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const form = (body) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
const loginAs = async (email, password) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, form(`version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`))).json());
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
let page = null;

const settle = async () => {
  await page.waitForTimeout(4000);
  await page.mouse.click(857, 242); await page.waitForTimeout(600);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
};
const open = async () => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  const login = await loginAs(process.env.EMAIL, process.env.PASSWORD);
  await page.goto(`${server}?token=${login.token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await settle();
};
const g = (fn, arg) => page.evaluate(fn, arg);
// the server, with the game's own login
const api = (path, body) => g(async ([server, path, body]) => { const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body }); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, ...j }; }, [server, path, body]);
const textAt = (label) => g((label) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text === label) hit = o; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, label);
const click = async (label, wait = 800) => { const p = await textAt(label); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const allTexts = () => g(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out; });
const messages = () => g(() => { const M = window.__classByName("MESSAGE"), T = window.__classByName("flash.text::TextField"); const out = []; for (const m of window.__game.GLOBAL._layerTop.$children ?? []) if (m instanceof M) { const walk = (o) => { if (o instanceof T && o.text) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(m); } return out.join(" | "); });
const closeMessages = () => g(() => { const M = window.__classByName("MESSAGE"); for (const m of [...(window.__game.GLOBAL._layerTop.$children ?? [])]) if (m instanceof M) m.Hide(); });
const setField = (index, value) => g(([index, value]) => { const P = window.__classByName("com.monsters.admin::IoTestMode")._open; const f = [P._countField, P._hoursField, P._xField, P._yField][index]; f.text = value; }, [index, value]);
const state = () => g(() => { const G = window.__game.GLOBAL, B = window.__game.BASE, L = window.__classByName("CREATURELOCKER"), I = window.__classByName("com.monsters.managers::InstanceManager"), F = window.__classByName("BFOUNDATION"); const all = I.getInstancesByClass(F); return { on: G.ioTestMode(), hall: G.townHall ? G.townHall._lvl.Get() : 0, compounds: all.filter((b) => b._type == 128).length, buildings: all.length, outposts: G._mapOutpost.map((p) => [p.x, p.y]).sort().join(" "), unlocked: Object.keys(L._lockerData).filter((k) => L._lockerData[k].t == 2).sort().join(","), protectedUntil: B._isProtected }; });
const wallet = async () => { const a = await api("worldmapv2/getarea", "x=0&y=0&sendresources=1"); return { credits: a.credits, r1: a.resources && a.resources.r1, r4: a.resources && a.resources.r4 }; };
// ends a wild attack under way: its monsters are removed until it is over (they can arrive in waves)
const endAttack = async () => {
  // the attack may still be starting; and it is over only once it stays over
  await page.waitForFunction(() => window.__game.WMATTACK._inProgress, null, { timeout: 3000 }).catch(() => {});
  for (let round = 0; round < 3; round++) {
  for (let i = 0; i < 60 && (await g(() => window.__game.WMATTACK._inProgress)); i++) {
    await g(() => { const C = window.__game.CREEPS; for (const k in C._creeps) { const m = C._creeps[k]; if (m && !m._friendly) m.setHealth ? m.setHealth(0) : (m.health = 0); } });
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
  if (!(await g(() => window.__game.WMATTACK._inProgress))) break;
  }
  await closeMessages();
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
};
const waitReloaded = (on) => page.waitForFunction((on) => window.__game.GLOBAL.ioTestMode() === on && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading, on, { timeout: 60000 });

await open();
const before = await state();
const moneyBefore = await wallet();
check("starts with test mode off (a login switches it off)", !before.on, JSON.stringify(before));
check("the account has what the test needs (a Compound, an outpost)", before.compounds >= 1 && before.outposts.length > 0, JSON.stringify(before));

// ---- switch on
check("the switch is next to the Admin button", !!(await textAt("Test: OFF")));
await click("Test: OFF");
check("switching on asks first", /Switch on admin test mode/.test(await messages()));
await click("Switch on", 500);
await waitReloaded(true);
await settle();
const texts = await allTexts();
await page.screenshot({ path: `${OUT}/admin-test-on.png` });
check("on: banner, switch shows ON, Test tools button", texts.includes("TEST MODE  (undone when you switch it off)") && texts.includes("Test: ON") && texts.includes("Test tools"));
check("resources and shiny shown as Unlimited", texts.filter((t) => t === "Unlimited").length >= 5, String(texts.filter((t) => t === "Unlimited").length));
const money = await wallet();
check("the server gives unlimited shiny and resources", money.credits >= 9999999 && money.r1 >= 999999999, JSON.stringify(money));
const charge = await g(() => { const B = window.__game.BASE; const r = B._resources.r1.Get(); const got = B.Charge(1, 1000000000); return { got, same: B._resources.r1.Get() === r }; });
check("spending takes nothing", charge.got === 1000000000 && charge.same, JSON.stringify(charge));

// ---- build, upgrade, limits
check("no building limit (a second Compound is allowed)", await g(() => window.__game.BASE.CanBuild(128).error === false));
await g(() => { window.__game.BASE.addBuildingB(128); });
// find free ground for it (the building follows the mouse)
let spot = null;
for (let y = 180; y <= 560 && !spot; y += 40) for (let x = 220; x <= 1080 && !spot; x += 40) {
  await page.mouse.move(x, y); await page.waitForTimeout(40);
  if ((await g(() => { const b = window.__game.GLOBAL._newBuilding; return b ? window.__game.BASE.BuildBlockers(b, false) : "gone"; })) === "") spot = [x, y];
}
if (spot) { await page.mouse.click(spot[0], spot[1]); await page.waitForTimeout(1000); }
const placed = await g(() => { const I = window.__classByName("com.monsters.managers::InstanceManager"), F = window.__classByName("BFOUNDATION"); const c = I.getInstancesByClass(F).filter((b) => b._type == 128); const n = c[c.length - 1]; return { count: c.length, level: n._lvl.Get(), building: n._countdownBuild.Get() }; });
check("placed and built at once", placed.count === before.compounds + 1 && placed.level === 1 && placed.building === 0, JSON.stringify(placed));
const up = await g(() => { const th = window.__game.GLOBAL.townHall; const a = th._lvl.Get(); th.Upgrade(); return { from: a, to: th._lvl.Get(), counting: th._countdownUpgrade.Get() }; });
check("Town Hall upgraded at once", up.to === up.from + 1 && up.counting === 0, JSON.stringify(up));
const monsters = await g(() => { const L = window.__classByName("CREATURELOCKER"), H = window.__classByName("HOUSING"); return { korath: L._lockerData.IC9 && L._lockerData.IC9.t, drull: L._lockerData.IC10 && L._lockerData.IC10.t, rezghul: L._lockerData.C19 && L._lockerData.C19.t, capacity: H._housingCapacity.Get() }; });
check("every monster unlocked (Korath, Drull, Rezghul too)", monsters.korath == 2 && monsters.drull == 2 && monsters.rezghul == 2, JSON.stringify(monsters));
check("the Compound holds any number", monsters.capacity >= 9999999, String(monsters.capacity));

// ---- test tools
await click("Test tools", 1200);
await page.screenshot({ path: `${OUT}/admin-test-tools.png` });
check("the test tools open", (await allTexts()).includes("Test tools") && !!(await textAt("Attack now")));
const housed0 = await g(() => { const m = window.__game.GLOBAL.player.monsterListByID("IC1"); return m ? m.numCreeps : 0; });
await setField(0, "7");
await click("Defend", 1500);
const housed1 = await g(() => { const m = window.__game.GLOBAL.player.monsterListByID("IC1"); return m ? m.numCreeps : 0; });
check("Defend: monsters put in the Compound", housed1 === housed0 + 7, `${housed0} -> ${housed1}; ${await messages()}`);
await closeMessages();
// wild attack now: Moloch, levels 41+
for (let i = 0; i < 4; i++) await click("Hellionnaire", 200) || await click("Kozmodeus", 200) || await click("Abaddonakki", 200) || await click("Beelzenaut", 200);
if (!(await textAt("Moloch"))) for (let i = 0; i < 5 && !(await textAt("Moloch")); i++) { for (const n of ["Hellionnaire", "Kozmodeus", "Abaddonakki", "Beelzenaut"]) if (await click(n, 200)) break; }
for (let i = 0; i < 5 && !(await textAt("levels 41+")); i++) for (const n of ["levels 1-10", "levels 11-20", "levels 21-30", "levels 31-40"]) if (await click(n, 200)) break;
const creeps0 = await g(() => window.__game.CREEPS._creepCount);
await click("Attack now", 1500);
const wild = await g(() => { const W = window.__game.WMATTACK; const w = W.ioWild(); const want = Object.values(w.tribes.moloch[4].monsters).reduce((a, b) => a + b, 0); return { inProgress: W._inProgress, want, got: window.__game.CREEPS._creepCount, tribe: W._ioPlan && W._ioPlan.tribe }; });
check("Wild attack now (Moloch, levels 41+): comes at once with the configured monsters", wild.inProgress && wild.tribe === "moloch" && wild.got - creeps0 === wild.want, JSON.stringify({ ...wild, before: creeps0 }));
await endAttack();
check("the wild attack ends when its monsters are gone", !(await g(() => window.__game.WMATTACK._inProgress)));
// attackers of a chosen kind and level
await click("Test tools", 1200);
for (let i = 0; i < 12 && !(await textAt("Grokus")); i++) await g(() => window.__classByName("com.monsters.admin::IoTestMode")._open.nextMonster(null));
for (let i = 0; i < 6 && !(await textAt("level 3")); i++) await g(() => window.__classByName("com.monsters.admin::IoTestMode")._open.nextLevel(null));
await setField(0, "4");
const c1 = await g(() => window.__game.CREEPS._creepCount);
await click("Attack me", 1500);
const attackers = await g(() => { const C = window.__game.CREEPS, L = window.__classByName("CREATURELOCKER"), out = []; for (const k in C._creeps) { const m = C._creeps[k]; if (m && !m._friendly) out.push([m._creatureID, m.maxHealth, L._creatures[m._creatureID].props.health[2]]); } return out; });
check("Attack me: 4 Grokus at level 3", attackers.length === 4 && attackers.every((a) => a[0] === "IC6" && a[1] === a[2]), JSON.stringify(attackers));
await endAttack();
// repair, protection, fast-forward
await g(() => { const th = window.__game.GLOBAL.townHall; th.setHealth(Math.floor(th.maxHealth / 3)); });
await click("Test tools", 1200);
await page.screenshot({ path: `${OUT}/admin-test-tools-again.png` });
check("the test tools open again after an attack", !!(await textAt("Repair everything")), JSON.stringify(await g(() => ({ open: !!window.__classByName("com.monsters.admin::IoTestMode")._open, busy: window.__game.WMATTACK._inProgress }))));
await click("Repair everything", 1000);
check("Repair everything: at full health at once", await g(() => { const th = window.__game.GLOBAL.townHall; return th.health === th.maxHealth; }), await messages());
await closeMessages();
await click("Protection off", 1500);
const off = await g(() => window.__game.BASE._isProtected - window.__game.GLOBAL.Timestamp());
await closeMessages();
await click("Protection on", 1500);
const onP = await g(() => window.__game.BASE._isProtected - window.__game.GLOBAL.Timestamp());
await closeMessages();
check("Protection off, then on (7 days)", off <= 0 && onP > 6 * 86400, `${off}, ${onP}`);
const t0 = await g(() => window.__game.GLOBAL.Timestamp());
await setField(1, "24");
await click("Fast-forward", 1500);
const t1 = await g(() => window.__game.GLOBAL.Timestamp());
check("Fast-forward 24 hours", t1 - t0 >= 86400 && t1 - t0 < 86400 + 30, String(t1 - t0));
await closeMessages();
// take a tribe cell as an outpost, then make it wild again
const home = await g(() => [window.__game.GLOBAL._mapHome.x, window.__game.GLOBAL._mapHome.y]);
const area = await api("worldmapv2/getarea", `x=${Math.max(0, home[0] - 5)}&y=${Math.max(0, home[1] - 5)}`);
let tribe = null;
for (const x in area.data || {}) for (const y in area.data[x]) { const c = area.data[x][y]; if (!tribe && c.b == 1 && c.i > 99) tribe = [Number(x), Number(y), c.bid]; }
check("a tribe cell near home to test with", !!tribe, JSON.stringify(tribe));
if (tribe) {
  const n0 = await g(() => window.__game.GLOBAL._mapOutpost.length);
  await setField(2, `${tribe[0]}`); await setField(3, `${tribe[1]}`);
  await click("Take as outpost", 2000);
  const took = await g(() => window.__game.GLOBAL._mapOutpost.length);
  check("Take as outpost", took === n0 + 1 && /is now your outpost/.test(await messages()), `${n0} -> ${took}: ${await messages()}`);
  await closeMessages();
  const list = await api("worldmapv2/myoutposts", "x=1");
  check("the new outpost is in the Outposts list", (list.outposts || []).some((o) => o.x === tribe[0] && o.y === tribe[1]));
  await click("Make wild", 2000);
  const wilded = await g(() => window.__game.GLOBAL._mapOutpost.length);
  check("Make wild", wilded === n0 && /is wild again/.test(await messages()), `${wilded}: ${await messages()}`);
  await closeMessages();
  // practice attack on the tribe: nothing written to it
  const load = await api("base/load", `userid=&baseid=${tribe[2]}&type=wmattack&mapversion=2&attackData=${encodeURIComponent(JSON.stringify({ monsters: {}, champions: [] }))}`);
  const hit = await api("base/save", `baseid=${tribe[2]}&basesaveid=${load.basesaveid}&damage=77&destroyed=0&over=1`);
  const after = await api("worldmapv2/getarea", `x=${tribe[0]}&y=${tribe[1]}`);
  const cell = after.data && after.data[tribe[0]] && after.data[tribe[0]][tribe[1]];
  check("practice attack on a tribe: nothing written to it", !load.error && !hit.error && cell && !cell.d, JSON.stringify({ load: load.error, save: hit.error, damage: cell && cell.d }));
}
await click("Close", 600);
// practice attack on another player's main yard near home, if there is one (even under protection)
const area2 = await api("worldmapv2/getarea", `x=${Math.max(0, home[0] - 5)}&y=${Math.max(0, home[1] - 5)}`);
const me = await g(() => window.__classByName("LOGIN")._playerID);
let player = null;
for (const x in area2.data || {}) for (const y in area2.data[x]) { const c = area2.data[x][y]; if (!player && c.b == 2 && c.uid && c.uid != me) player = c; }
if (player) {
  const load2 = await api("base/load", `userid=&baseid=${player.bid}&type=attack&mapversion=2&attackData=${encodeURIComponent(JSON.stringify({ monsters: {}, champions: [] }))}`);
  const save2 = await api("base/save", `baseid=${player.bid}&basesaveid=${load2.basesaveid}&damage=80&destroyed=0&over=1`);
  check("practice attack on another player's yard (protection or not): allowed, nothing written", !load2.error && !save2.error && !save2.damage, JSON.stringify({ load: load2.error, save: save2.error, damage: save2.damage }));
}
// leaderboards leave the admin out
const world = await g(() => window.__game.GLOBAL._flags && window.__game.BASE.loadObject && window.__game.BASE.loadObject.worldid);
if (world) {
  const lb = await (await fetch(`${server}api/v1.7.3-beta/leaderboards?worldid=${world}&mapversion=2`)).json();
  const me = await g(() => window.__game.LOGIN ? null : null);
  check("the leaderboards leave a test-mode admin out", !(lb.leaderboard || []).some((r) => r.username === process.env.ADMIN_NAME), `${(lb.leaderboard || []).length} rows`);
}

// ---- switch off: everything back
await click("Test: ON");
check("switching off asks first", /Switch off admin test mode/.test(await messages()));
await click("Switch off", 500);
await waitReloaded(false);
await settle();
const back = await state();
const moneyBack = await wallet();
await page.screenshot({ path: `${OUT}/admin-test-off.png` });
check("off: yard as it was (Town Hall level, Compounds, buildings)", back.hall === before.hall && back.compounds === before.compounds && back.buildings === before.buildings, JSON.stringify([before, back]));
check("off: outposts as they were", back.outposts === before.outposts, back.outposts);
check("off: unlocks as they were", back.unlocked === before.unlocked, back.unlocked);
// (the yard produces a little in the seconds since)
check("off: shiny and resources as they were", moneyBack.credits === moneyBefore.credits && moneyBack.r4 >= moneyBefore.r4 && moneyBack.r4 < moneyBefore.r4 + 200000, JSON.stringify([moneyBefore, moneyBack]));
check("off: no banner, switch shows OFF", !(await allTexts()).includes("TEST MODE  (undone when you switch it off)") && !!(await textAt("Test: OFF")));

// ---- a game still in test mode cannot save over the account put back
// (switched on from inside the game: opening the game logs in, and a login switches it off)
const onInGame = async () => { await api("admin/testmode", "action=on"); await g(() => window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0)); await waitReloaded(true); await settle(); };
await onInGame();
await api("admin/testmode", "action=off");
const stale = await g(async (server) => { const B = window.__game.BASE; B._saveCounterA++; B.Save(0, false, true); await new Promise((r) => setTimeout(r, 2500)); return true; }, server);
const afterStale = await wallet();
check("a game still in test mode cannot save over the account put back", afterStale.credits === moneyBefore.credits, JSON.stringify(afterStale));

// ---- switching account and logging in again switch it off
await open();
await onInGame();
const token = await g(() => window.__classByName("LOGIN").token);
await g(() => window.__game.GAME.ioSwitchAccount());
await page.waitForTimeout(5000);
const s1 = await (await fetch(`${server}admin/testmode`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` }, body: "action=status" })).json();
check("Switch account switches test mode off", s1.on === false, JSON.stringify(s1));
const fresh = await loginAs(process.env.EMAIL, process.env.PASSWORD);
await fetch(`${server}admin/testmode`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${fresh.token}` }, body: "action=on" });
const again = await loginAs(process.env.EMAIL, process.env.PASSWORD);
const s2 = await (await fetch(`${server}admin/testmode`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${again.token}` }, body: "action=status" })).json();
check("logging in again switches it off", s2.on === false, JSON.stringify(s2));
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
