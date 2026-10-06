// The 3 October features (Inferno-only):
//  - attack logs: a tribe attack is logged (server), its saves add damage, buildings destroyed, loot and the
//    battle report, the last one ends it; the top bar's Attack Log bar (left of the Leaderboard's) opens
//    the window: My attacks / Attacks on me, Report, Jump (IoAttackLogs.as, /attacklogs/game)
//  - Upgrade All (Resources) for walls: the exact cost, paid, every wall upgraded at once (IoWallUpgrade)
//  - traps set off stay, disarmed (saved "fd": 1), re-armed all at once for their build cost (IoTrapRearm);
//    an attack's save keeps a trap it set off, disarmed (buildingDataHandler)
//  - the Incubator: hold a monster down to keep adding it (HATCHERYPOPUP.ioHold*)
//  - the Incubation Control Station: left / right arrows move a monster in the queue (HATCHERYCCPOPUP)
//  - the Yard Planner's Export / Import (BYML1: base64 of [type, x, y], no decorations); a layout with buildings
//    past the importer's yard edge or overlapping is refused, and a plan like that isn't applied
//  - decorations take 0 s to build; the Under Hall is 130 square, as the overworld's Town Hall
//  - every Inferno monster trains to level 6 in the Academy
//  - the worker icon shows in an outpost
//   EMAIL3=<a player with a developed Inferno yard: walls, Incubators, an Incubation Control Station, an Academy,
//   a Map Room; every building inside the yard, none overlapping> EMAIL=<a player with an outpost> PASSWORD=... PGPASSWORD=... SERVER_DIR=... node tools/test/oct3-features-test.mjs
// Prints one line per check; each must end in "ok". The yard is saved only where a check needs it.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const email = process.env.EMAIL3 || process.env.EMAIL;
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const AL = "com.monsters.leaderboards::IoAttackLogs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const token = await login();
const me = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`));

const helpers = () => g(() => {
  window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
  window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
  window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
  // messages caught (text, buttons) instead of shown
  const G = window.__game.GLOBAL;
  window.__msgs = [];
  if (!window.__keepMessage) window.__keepMessage = G.Message;
  G.Message = function (text, b1, f1, a1, b2, f2, a2) { window.__msgs.push({ text, b1, f1, a1, b2, f2, a2 }); return null; };
});
const home = async () => {
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading, null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }
  await helpers();
};
const clickAt = async (p, wait = 500) => { if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const clickNamed = async (name, wait) => clickAt(await g((n) => { const o = window.__named(n); return o ? window.__at(o) : null; }, name), wait);

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await home();
  await g(() => { window.__game.WMATTACK._enabled = false; });

  // ================= the static ones
  const statics = await g(() => {
    const G = window.__game, L = window.__classByName("CREATURELOCKER"), B14 = window.__classByName("BUILDING14");
    const th = window.__classByName("com.monsters.managers::InstanceManager").getInstancesByClass(B14)[0];
    const props = G.GLOBAL._buildingProps;
    const decos = props.filter((p) => p && p.type === "decoration");
    const ids = Object.keys(L._creatures).filter((id) => /^IC|^C19$/.test(id) || L._creatures[id].inferno);
    return {
      hall: th ? [th._footprint[0].width, th._footprint[0].height] : null,
      decos: decos.length, decoTimes: decos.filter((p) => (p.costs || []).some((c) => c.time && (c.time.Get ? c.time.Get() : c.time) > 0)).map((p) => p.id),
      six: ids.filter((id) => L._creatures[id].trainingCosts && L._creatures[id].trainingCosts.length >= 5).map((id) => [id, L.ioReachesLevel6(id)]),
    };
  });
  check("the Under Hall stands on 130 x 130, as the overworld's Town Hall", statics.hall && statics.hall[0] === 130 && statics.hall[1] === 130, JSON.stringify(statics.hall));
  check("decorations take 0 s to build", statics.decos > 0 && statics.decoTimes.length === 0, JSON.stringify(statics));
  check("every Inferno monster with its training levels goes to level 6", statics.six.length >= 10 && statics.six.every((x) => x[1]), JSON.stringify(statics.six));
  const kitHall = execFileSync("bun", ["-e", "import {infernoOnlyConfig} from './src/config/InfernoOnlyConfig.ts'; const s = await Bun.file('./src/services/kits/kitPreview.ts').text(); console.log(infernoOnlyConfig.enabled, /14: infernoOnlyConfig.enabled \\? 130 : 160/.test(s))"], { cwd: process.env.SERVER_DIR }).toString().trim();
  check("…and so on the server (kits, devilified yards)", kitHall === "true true", kitHall);

  // a decoration placed: built at once
  const deco = await g(async () => {
    const G = window.__game, B = G.BASE;
    const props = G.GLOBAL._buildingProps.find((p) => p && p.type === "decoration" && B.CanBuild(p.id).error === false);
    if (!props) return { none: true };
    G.BASE._blockSave = true;
    const b = B.addBuildingC(props.id);
    b.Setup({ X: 900, Y: 900, id: 99901, t: props.id, l: 0 });
    return { id: props.id, build: b._countdownBuild.Get(), lvl: b._lvl.Get() };
  });
  check("a decoration set in the yard is there at once (no build time)", deco.none || deco.build === 0, JSON.stringify(deco));

  // ================= walls for resources
  const walls = await g(() => {
    const G = window.__game, IM = window.__classByName("com.monsters.managers::InstanceManager"), W = window.__classByName("BWALL");
    const list = IM.getInstancesByClass(W).filter((b) => b._buildingProps.type === "wall");
    if (list.length < 8) return { none: true };
    G.BASE._blockSave = true;
    // five walls down to level 1, three to level 2
    list.slice(0, 5).forEach((b) => b._lvl.Set(1));
    list.slice(5, 8).forEach((b) => b._lvl.Set(2));
    const costs = list[0]._buildingProps.costs;
    const v = (c, r) => (c[r] ? (c[r].Get ? c[r].Get() : Number(c[r])) : 0);
    const want3 = [1, 2, 3, 4].map((r) => 5 * (v(costs[1], "r" + r) + v(costs[2], "r" + r)) + 3 * v(costs[2], "r" + r));
    const want2 = [1, 2, 3, 4].map((r) => 5 * v(costs[1], "r" + r));
    for (let r = 1; r <= 4; r++) G.BASE._resources["r" + r].Set(Math.max(G.BASE._resources["r" + r].Get(), want3[r - 1] + 1000));
    const U = window.__classByName("com.monsters.walls::IoWallUpgrade");
    const c3 = U.cost(3), c2 = U.cost(2);
    window.__msgs = [];
    U.Show();
    const m = window.__msgs[0];
    return { n: list.length, levels: costs.length, want3, want2, c3: [c3.n, c3.r, c3.ok], c2: [c2.n, c2.r, c2.ok], msg: m && { text: m.text, b1: m.b1, b2: m.b2, a1: m.a1, a2: m.a2 } };
  });
  if (walls.none) throw new Error("this test needs a yard with at least eight walls (EMAIL3)");
  check("walls: the exact cost of taking them all to level 3 (each wall's remaining steps added up)", walls.c3[0] === 8 && JSON.stringify(walls.c3[1]) === JSON.stringify(walls.want3) && walls.c3[2], JSON.stringify(walls));
  check("…and to level 2 (only the five below it)", walls.c2[0] === 5 && JSON.stringify(walls.c2[1]) === JSON.stringify(walls.want2), JSON.stringify(walls.c2));
  check("…the choice lists both levels with their cost, a button each", walls.msg && /Level 2/.test(walls.msg.text) && /Level 3/.test(walls.msg.text) && walls.msg.b1 === "Level 3" && walls.msg.b2 === "Level 2", JSON.stringify(walls.msg));
  // the wall's info panel has the button
  const wallBtn = await g(() => {
    const G = window.__game, IM = window.__classByName("com.monsters.managers::InstanceManager"), W = window.__classByName("BWALL");
    const b = IM.getInstancesByClass(W).find((b) => b._buildingProps.type === "wall");
    const BI = window.__classByName("BUILDINGINFO");
    BI.Show(b);
    const texts = window.__texts(BI._mc);
    return texts.filter((t) => /Upgrade All/.test(t));
  });
  check("…the wall's panel: Upgrade All and Upgrade All (Resources)", wallBtn.includes("Upgrade All (Resources)") && wallBtn.some((t) => t === "Upgrade All" || /^Upgrade All$/.test(t.trim())), JSON.stringify(wallBtn));
  await page.screenshot({ path: `${shots}/oct3-wall-panel.png` });
  await g(() => { try { window.__classByName("BUILDINGINFO").Hide(); } catch (e) {} });
  const bought = await g(() => {
    const G = window.__game, IM = window.__classByName("com.monsters.managers::InstanceManager"), W = window.__classByName("BWALL");
    const before = [1, 2, 3, 4].map((r) => G.BASE._resources["r" + r].Get());
    const U = window.__classByName("com.monsters.walls::IoWallUpgrade");
    const c = U.cost(3);
    window.__msgs = [];
    U.Buy(3);
    const after = [1, 2, 3, 4].map((r) => G.BASE._resources["r" + r].Get());
    const list = IM.getInstancesByClass(W).filter((b) => b._buildingProps.type === "wall");
    return { spent: before.map((b, i) => b - after[i]), cost: c.r, levels: [...new Set(list.map((b) => b._lvl.Get()))], busy: list.filter((b) => b._countdownUpgrade.Get() > 0 || b._countdownBuild.Get() > 0).length, msg: window.__msgs.map((m) => m.text) };
  });
  check("…bought: exactly that cost, every wall at level 3 at once (nothing left building)", JSON.stringify(bought.spent) === JSON.stringify(bought.cost) && bought.levels.join() === "3" && bought.busy === 0 && /8 walls upgraded to Level 3/.test(bought.msg.join()), JSON.stringify(bought));

  // ================= traps
  const trap = await g(async () => {
    const G = window.__game, B = G.BASE;
    const T = window.__classByName("BTRAP");
    const props = G.GLOBAL._buildingProps.find((p) => p && p.id === 24);
    const t = B.addBuildingC(24);
    t.Setup({ X: 860, Y: 980, id: 99902, t: 24, l: 1 });
    const t2 = B.addBuildingC(24);
    t2.Setup({ X: 880, Y: 1010, id: 99903, t: 24, l: 1 });
    // set off in the owner's yard (a wild monster attack): Explode with a monster in range
    window.__realRange = window.__classByName("Targeting").getCreepsInRange;
    const fake = Object.create(window.__classByName("com.monsters.monsters::MonsterBase").prototype);
    Object.defineProperty(fake, "health", { value: 100, writable: true, configurable: true });
    fake.modifyHealth = function (n) { this.health += n; return n; };
    window.__classByName("Targeting").getCreepsInRange = () => ({ a: { creep: fake, dist: 5, pos: t._position } });
    try { t.Explode(); fake.health = 100; t2.Explode(); } finally { window.__classByName("Targeting").getCreepsInRange = window.__realRange; }
    const R = window.__classByName("com.monsters.walls::IoTrapRearm");
    return { inYard: B.buildings.includes(t) || !!window.__classByName("com.monsters.managers::InstanceManager").getInstancesByClass(T).includes(t), disarmed: t.ioDisarmed, alpha: t._mc.alpha, exp: t.Export().fd, list: R.disarmed().length, cost: R.cost(), props: props && [1, 2, 3, 4].map((r) => props.costs[0]["r" + r] ? props.costs[0]["r" + r].Get() : 0) };
  });
  check("traps: one set off in your own yard stays, disarmed (drawn faded), saved with fd 1", trap.inYard && trap.disarmed && trap.alpha < 0.5 && trap.exp === 1, JSON.stringify(trap));
  check("…re-arming all of them costs each one's build cost, added up", trap.list >= 2 && JSON.stringify(trap.cost) === JSON.stringify(trap.props.map((n) => n * trap.list)), JSON.stringify(trap));
  const trapBtn = await g(() => {
    const G = window.__game, IM = window.__classByName("com.monsters.managers::InstanceManager"), T = window.__classByName("BTRAP");
    const t = IM.getInstancesByClass(T).find((t) => t._id === 99902);
    const BI = window.__classByName("BUILDINGINFO");
    BI.Show(t);
    return window.__texts(BI._mc).filter((x) => /Re-arm/.test(x));
  });
  check("…a disarmed trap's panel has Re-arm All", trapBtn.includes("Re-arm All"), JSON.stringify(trapBtn));
  await page.screenshot({ path: `${shots}/oct3-trap-panel.png` });
  await g(() => { try { window.__classByName("BUILDINGINFO").Hide(); } catch (e) {} });
  const rearm = await g(() => {
    const G = window.__game, R = window.__classByName("com.monsters.walls::IoTrapRearm");
    const before = [1, 2, 3, 4].map((r) => G.BASE._resources["r" + r].Get());
    const cost = R.cost(), n = R.disarmed().length;
    window.__msgs = [];
    R.Show();
    const ask = window.__msgs[0];
    ask.f1();
    const after = [1, 2, 3, 4].map((r) => G.BASE._resources["r" + r].Get());
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), T = window.__classByName("BTRAP");
    const t = IM.getInstancesByClass(T).find((t) => t._id === 99902);
    return { ask: ask.text, button: ask.b1, n, spent: before.map((b, i) => b - after[i]), cost, left: R.disarmed().length, armed: !t.ioDisarmed && !t._fired, alpha: t._mc.alpha, fd: t.Export().fd, done: window.__msgs.slice(1).map((m) => m.text) };
  });
  check("…Re-arm All: asked with the count and the cost, paid, every trap armed again", /traps went off/.test(rearm.ask) && rearm.button === "Re-arm All" && JSON.stringify(rearm.spent) === JSON.stringify(rearm.cost) && rearm.left === 0 && rearm.armed && rearm.alpha === 1 && rearm.fd === undefined && /traps re-armed/.test(rearm.done.join()), JSON.stringify(rearm));
  // the attack save keeps a trap it set off (server)
  const srvTrap = execFileSync("bun", ["-e", `import {buildingDataHandler} from './src/controllers/base/save/handlers/buildingDataHandler.ts'; const save = {buildingdata: {"1": {t: 24, X: 0, Y: 0, l: 1}, "2": {t: 117, X: 10, Y: 0, l: 1}, "3": {t: 24, X: 20, Y: 0, l: 1}, "4": {t: 6, X: 30, Y: 0, l: 2}}}; buildingDataHandler({"3": {t: 24}, "4": {t: 6}}, save); console.log(JSON.stringify(save.buildingdata));`], { cwd: process.env.SERVER_DIR }).toString().trim();
  const st = JSON.parse(srvTrap);
  check("…an attack's save keeps the traps it set off, disarmed (fd 1); the others as they were", st["1"] && st["1"].fd === 1 && st["2"] && st["2"].fd === 1 && st["3"] && !st["3"].fd && st["4"] && st["4"].l === 2, srvTrap);
  const setupFd = await g(() => {
    const G = window.__game, B = G.BASE;
    const t = B.addBuildingC(24);
    t.Setup({ X: 900, Y: 1040, id: 99904, t: 24, l: 1, fd: 1 });
    return { disarmed: t.ioDisarmed, health: t.health === t.maxHealth, destroyed: t._destroyed };
  });
  check("…a trap loaded with fd 1 comes up disarmed (not broken)", setupFd.disarmed && setupFd.health && !setupFd.destroyed, JSON.stringify(setupFd));
  const attackSkip = await g(() => {
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), T = window.__classByName("BTRAP");
    const t = IM.getInstancesByClass(T).find((t) => t._id === 99904);
    let found = 0; const keep = t.FindTargets; t.FindTargets = function () { found++; return keep.call(this); };
    for (let i = 0; i < 30; i++) t.TickAttack();
    t.FindTargets = keep;
    return found;
  });
  check("…and does not go off again until re-armed", attackSkip === 0, String(attackSkip));

  // ================= the Incubator: hold to add
  const hatch = await g(async () => {
    const G = window.__game, IM = window.__classByName("com.monsters.managers::InstanceManager"), B13 = window.__classByName("BUILDING13"), H = window.__classByName("HATCHERY");
    const b = IM.getInstancesByClass(B13).find((b) => b._countdownBuild.Get() === 0 && b._lvl.Get() >= 1 && b._monsterQueue);
    if (!b) return { none: true };
    b._monsterQueue.length = 0;
    G.BASE._resources.r4.Set(100000000);
    // (production stopped while this is looked at: the hatcheries would take the queue's monsters away)
    window.__frozen = IM.getInstancesByClass(B13).concat(G.GLOBAL._bHatcheryCC ? [G.GLOBAL._bHatcheryCC] : []);
    for (const h of window.__frozen) { h.__tick = h.Tick; h.Tick = function () {}; }
    H.Show(b);
    await new Promise((r) => setTimeout(r, 1200));
    const pop = H._mc;
    const slot = pop._monsterSlots.find((s) => s.buttonMode);
    window.__hatchSlot = slot;
    window.__saves = 0; const keepSave = G.BASE.Save; window.__keepSave = keepSave; G.BASE.Save = function () { window.__saves++; };
    return { cap: 1 + b._lvl.Get(), slot: !!slot };
  });
  if (hatch.none) check("an Incubator to test with", false, "none");
  else {
    const p = await g(() => window.__at(window.__hatchSlot));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(400);
    const during = await g(() => window.__game.HATCHERY._mc._hatchery._monsterQueue.map((e) => e.slice()));
    await page.waitForTimeout(2600);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await g(() => ({ q: window.__game.HATCHERY._mc._hatchery._monsterQueue.map((e) => e.slice()), saves: window.__saves, holding: window.__game.HATCHERY._mc._ioHolding }));
    await page.waitForTimeout(800);
    const later = await g(() => window.__game.HATCHERY._mc._hatchery._monsterQueue.reduce((s, e) => s + e[1], 0));
    const total = after.q.reduce((s, e) => s + e[1], 0);
    check("the Incubator: holding a monster down keeps adding it (20 to a place, then the next place)", total > 20 && after.q.every((e) => e[1] <= 20) && after.q.length <= hatch.cap, JSON.stringify({ during, after }));
    check("…let go, it stops (and the yard is saved once for the lot, not once each)", !after.holding && later === total && after.saves === 1, JSON.stringify({ total, later, saves: after.saves }));
    await page.screenshot({ path: `${shots}/oct3-incubator.png` });
    await g(() => { window.__game.BASE.Save = window.__keepSave; window.__game.HATCHERY._mc._hatchery._monsterQueue.length = 0; window.__game.HATCHERY.Hide(); });
  }

  // ================= the Incubation Control Station: arrows
  const ics = await g(async () => {
    const G = window.__game, CC = window.__classByName("HATCHERYCC");
    const b = G.GLOBAL._bHatcheryCC;
    if (!b) return { none: true };
    window.__keepSave = window.__keepSave || G.BASE.Save; window.__saves = 0; G.BASE.Save = function () { window.__saves++; };
    b._monsterQueue = [["IC1", 5], ["IC2", 3], ["IC5", 2]];
    CC.Show();
    await new Promise((r) => setTimeout(r, 1500));
    const pop = CC._mc;
    const arrows = pop._ioArrows.map((a) => ({ name: a.name, x: Math.round(a.x), y: Math.round(a.y) }));
    const slots = [1, 2, 3].map((i) => { const s = pop["slot" + i]; return { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width), h: Math.round(s.height) }; });
    const counts = [1, 2, 3].map((i) => { const c = pop["mcCount" + i]; const r = c.getBounds(pop); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
    const ar0 = 0;
    const ar = pop._ioArrows.map((a) => { const r = a.getBounds(pop); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const overlap = ar.some((a) => counts.some((c) => a.x < c.x + c.w && a.x + a.w > c.x && a.y < c.y + c.h && a.y + a.h > c.y));
    return { arrows, slots, overlap };
  });
  if (ics.none) check("an Incubation Control Station to test with", false, "none");
  else {
    check("the Control Station: a right arrow under every monster but the last, a left one under every one but the first", ics.arrows.length === 4 && ics.arrows.filter((a) => a.name === "ioQueueLeft").length === 2 && !ics.overlap, JSON.stringify(ics));
    await page.screenshot({ path: `${shots}/oct3-ics.png` });
    const clip = await g(() => window.__at(window.__game.HATCHERYCC._mc));
    await page.screenshot({ path: `${shots}/oct3-ics-zoom.png`, clip: { x: Math.max(0, clip.x - 380), y: Math.max(0, clip.y - 250), width: 760, height: 500 } });
    // the first one's right arrow: it moves one place on
    const right = await g(() => { const a = window.__game.HATCHERYCC._mc._ioArrows.find((a) => a.name === "ioQueueRight"); return window.__at(a); });
    await clickAt(right, 600);
    const moved = await g(() => ({ q: window.__game.GLOBAL._bHatcheryCC._monsterQueue.map((e) => e.join(":")), saves: window.__saves }));
    check("…the first one's right arrow moves it one place on (and saves)", moved.q.join() === "IC2:3,IC1:5,IC5:2" && moved.saves >= 1, JSON.stringify(moved));
    const left = await g(() => { const L = window.__game.HATCHERYCC._mc._ioArrows.filter((a) => a.name === "ioQueueLeft"); return window.__at(L[L.length - 1]); });
    await clickAt(left, 600);
    const moved2 = await g(() => window.__game.GLOBAL._bHatcheryCC._monsterQueue.map((e) => e.join(":")));
    check("…the last one's left arrow moves it one place back; a click on an arrow removes nothing", moved2.join() === "IC2:3,IC5:2,IC1:5", JSON.stringify(moved2));
    await g(() => { window.__game.BASE.Save = window.__keepSave; window.__game.GLOBAL._bHatcheryCC._monsterQueue = []; window.__game.HATCHERYCC.Hide(); for (const h of window.__frozen || []) h.Tick = h.__tick; });
  }

  // ================= the Yard Planner: Export / Import
  await g(() => window.__game.PLANNER.Show());
  await page.waitForTimeout(2500);
  // (the decoration and traps this test set past the yard's edge, ids 999xx, are left off the plan)
  await g(() => {
    const pop = window.__game.PLANNER.basePlanner.popup, t = pop._plannerTemplate;
    for (let i = t.displayData.length - 1; i >= 0; i--) { const b = t.displayData[i].building; if (b && b._id >= 99900 && b._id < 100000) t.displayData.splice(i, 1); }
    pop.designView.ioRebuild();
  });
  const exp = await g(() => {
    const pop = window.__game.PLANNER.basePlanner.popup, t = pop._plannerTemplate;
    const keep = window.__classByName("flash.system::System").setClipboard; let clip = null;
    window.__classByName("flash.system::System").setClipboard = (s) => { clip = s; };
    const P = window.__classByName("com.monsters.kits::IoTextPrompt");
    const keepShow = P.Show; P.Show = function (...a) { window.__prompt = keepShow.apply(this, a); return window.__prompt; };
    pop.ioExportLayout();
    P.Show = keepShow;
    window.__classByName("flash.system::System").setClipboard = keep;
    const placed = t.displayData.filter((n) => n.category !== "decoration" && n.type !== "decoration").map((n) => [n.type, n.x, n.y]);
    return { clip, placed: placed.length, decos: t.displayData.length - placed.length };
  });
  let decoded = null;
  try { decoded = JSON.parse(Buffer.from(exp.clip.replace(/^BYML1:/, ""), "base64").toString()); } catch (e) {}
  check("the planner's Export: the layout as text (BYML1: then base64), copied, building types and places only", exp.clip && exp.clip.startsWith("BYML1:") && decoded && decoded.length === exp.placed && decoded.every((r) => r.length === 3), JSON.stringify({ clip: exp.clip && exp.clip.slice(0, 40), n: decoded && decoded.length, placed: exp.placed }));
  await page.screenshot({ path: `${shots}/oct3-export.png` });
  const imp = await g((text) => {
    const pop = window.__game.PLANNER.basePlanner.popup, t = pop._plannerTemplate;
    const shown = window.__prompt ? window.__texts(window.__prompt) : [];
    try { window.__prompt.close(); } catch (e) {}
    const before = t.displayData.map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ");
    window.__beforeBuildings = t.displayData.filter((n) => n.category !== "decoration").map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ");
    // everything moved (40 to the right, or as far as stays in the yard) first, then the exported layout brought back in
    const rows0 = JSON.parse(atob(text.slice(6)));
    const fp = {}; for (const n of t.displayData) if (n.building && n.building._footprint) fp[n.type] = n.building._footprint[0].width;
    const halfW = window.__game.GLOBAL._mapWidth / 2;
    const dx = [40, -40, 20, -20, 10, -10, 5, -5].find((d) => rows0.every((r) => r[1] + d >= -halfW && r[1] + d <= halfW - (fp[r[0]] || 20))) || 0;
    const moved = rows0.map((r) => [r[0], r[1] + dx, r[2]]);
    window.__msgs = [];
    pop.ioApplyLayout("BYML1:" + btoa(JSON.stringify(moved)));
    const shifted = t.displayData.filter((n) => n.type !== "decoration").map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ");
    pop.ioApplyLayout(text);
    const back = t.displayData.map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ");
    const keyOf = (list) => list.filter((n) => n.category !== "decoration").map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ");
    const sameBuildings = keyOf(t.displayData) === window.__beforeBuildings;
    const decosStored = t.inventoryData.filter((n) => n.category === "decoration").length;
    const wrongBefore = pop.designView.ioInvalidNodes().length;
    // a layout with only some of the buildings: the others stay where they are, and the plan can be applied
    const part = JSON.parse(atob(text.slice(6))).slice(0, 12);
    pop.ioApplyLayout("BYML1:" + btoa(JSON.stringify(part)));
    const partial = { wrongBefore, storedBuildings: t.inventoryData.filter((n) => n.category !== "decoration" && n.category !== "misc").length, applicable: pop._isTemplateApplicable, msg: window.__msgs[window.__msgs.length - 1] };
    pop.ioApplyLayout(text);
    let bad = null; try { pop.ioApplyLayout("not a layout"); } catch (e) { bad = "threw " + e.message; }
    return { same: sameBuildings, decosStored, partial, changed: shifted !== before, msgs: window.__msgs.map((m) => m.text).slice(0, 3), bad, refused: /isn't a layout/.test(window.__msgs.map((m) => m.text).join()), shown };
  }, exp.clip);
  check("…Import puts every building where the layout has it (moved and back: as it was; decorations in the way stored); nonsense is refused", imp.same && imp.changed && !imp.bad && imp.refused && imp.shown.some((t) => /^BYML1:/.test(t)), JSON.stringify(imp));
  check("…a layout with only some of your buildings leaves the others where they were, and the plan can be applied", imp.partial.storedBuildings === 0 && imp.partial.applicable === true && /Apply it/.test(imp.partial.msg && imp.partial.msg.text), JSON.stringify(imp.partial));
  // a layout with a building past this yard's edge, or two that overlap, isn't imported at all; nor is a plan
  // like that applied
  const refuse = await g((text) => {
    const G = window.__game, pop = G.PLANNER.basePlanner.popup, t = pop._plannerTemplate;
    const key = () => t.displayData.map((n) => `${n.type}@${n.x},${n.y}`).sort().join(" ") + "|" + t.inventoryData.length;
    const rows = JSON.parse(atob(text.slice(6)));
    const k0 = key();
    const big = rows.findIndex((r) => r[0] !== 17 && r[0] !== 24);
    const other = rows.findIndex((r, i) => i !== big && r[0] !== 17 && r[0] !== 24);
    const out = rows.map((r) => r.slice()); out[big][1] = G.GLOBAL._mapWidth / 2 - 10;
    const over = rows.map((r) => r.slice()); over[other][1] = over[big][1] + 10; over[other][2] = over[big][2] + 10;
    const msg = (code) => { window.__msgs = []; pop.ioApplyLayout("BYML1:" + btoa(JSON.stringify(code))); const m = window.__msgs[window.__msgs.length - 1]; return { text: m && m.text, same: key() === k0 }; };
    const r = { outside: msg(out), overlap: msg(over) };
    // the plan itself: one building moved past the edge, then Apply
    const node = t.displayData.find((n) => n.type === rows[big][0] && n.x === rows[big][1] && n.y === rows[big][2]);
    const keepX = node.x; node.x = G.GLOBAL._mapWidth / 2 + 50;
    let applied = 0; const keepD = pop.dispatchEvent; pop.dispatchEvent = function (e) { if (e.type === "apply" || /apply/i.test(e.type)) { applied++; return true; } return keepD.call(this, e); };
    window.__msgs = []; pop.onApplyClick(null);
    pop.dispatchEvent = keepD; node.x = keepX;
    r.apply = { text: window.__msgs.length ? window.__msgs[window.__msgs.length - 1].text : null, applied, applicable: pop._isTemplateApplicable };
    return r;
  }, exp.clip);
  check("…a layout with a building past your yard's edge isn't imported (the plan doesn't change)", refuse.outside.same && /can't be imported/.test(refuse.outside.text) && /outside your yard/.test(refuse.outside.text), JSON.stringify(refuse.outside));
  check("…nor one with two buildings overlapping", refuse.overlap.same && /can't be imported/.test(refuse.overlap.text) && /overlap/.test(refuse.overlap.text), JSON.stringify(refuse.overlap));
  check("…nor is a plan with a building past the edge applied", refuse.apply.applied === 0 && /can't be applied/.test(refuse.apply.text || ""), JSON.stringify(refuse.apply));
  await g(() => { try { window.__game.PLANNER.Hide(); } catch (e) {} try { window.__game.PLANNER.basePlanner.popup.Hide(); } catch (e) {} });
  await page.waitForTimeout(600);

  // ================= the attack logs: an attack on a tribe yard
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  const wild = await g(() => {
    const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc;
    const cells = (mc._cells || []).filter((c) => c._updated && c._base > 0 && !c._userID && c._baseID && !c._destroyed && c._inRange);
    const c = cells[1] || cells[0]; if (!c) return null;
    const G = window.__game; G.GLOBAL._currentCell = c;
    G.BASE.LoadBase(null, 0, c._baseID, G.GLOBAL.e_BASE_MODE.WMATTACK, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD);
    return { at: [c.X, c.Y], level: c._level, base: String(c._baseID) };
  });
  check("a tribe yard to attack", !!wild, JSON.stringify(wild));
  await page.waitForFunction(() => window.__game.GLOBAL.mode === window.__game.GLOBAL.e_BASE_MODE.WMATTACK && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < 4; i++) await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  const started = sql(`SELECT id || '|' || defender_userid || '|' || defender_username || '|' || type || '|' || x || '|' || y || '|' || level || '|' || (CASE WHEN ended THEN 't' ELSE 'f' END) FROM bym.attack_logs WHERE attacker_userid = ${me} AND baseid = '${wild.base}' ORDER BY id DESC LIMIT 1`).split("|");
  const tribeName = sql(`SELECT wmid FROM bym.save WHERE baseid = '${wild.base}' AND type = 'tribe'`);
  const names = { 1: "Hellionnaire", 11: "Kozmodeus", 21: "Abaddonakki", 31: "Beelzenaut", 51: "Moloch" };
  check("the attack started is logged: no defender, the tribe's name, the yard's place and level", started[1] === "0" && started[2] === names[tribeName] && started[3] === "tribe" && Number(started[4]) === wild.at[0] && Number(started[5]) === wild.at[1] && Number(started[6]) === wild.level && started[7] === "f", JSON.stringify({ started, tribeName, wild }));
  // buildings knocked down by the game's own code (as monsters would), loot taken, then the game's saves
  const fought = await g(async () => {
    const G = window.__game, R = window.__classByName("BRESOURCE");
    const list = G.BASE.buildings.filter((b) => b.maxHealth > 0 && b._type !== 7 && b.health > 0 && !(b instanceof window.__classByName("BWALL")) && !(b instanceof window.__classByName("BTRAP")));
    let downed = 0;
    for (const b of list.slice(0, 6)) { b.modifyHealth(-b.health - 1); downed++; }
    G.ATTACK.Loot(1, 1234, 0, 0, 10, null, true);
    G.ATTACK.Loot(2, 567, 0, 0, 10, null, true);
    window.__saveCalls = 0;
    G.BASE.Save();
    await new Promise((r) => setTimeout(r, 9000));
    return { downed, loot: [G.ATTACK._loot.r1.Get(), G.ATTACK._loot.r2.Get()], report: G.ATTACK.LogRead().slice(0, 200) };
  });
  const mid = sql(`SELECT damage || '|' || destroyed || '|' || (CASE WHEN ended THEN 't' ELSE 'f' END) || '|' || COALESCE(loot::text, '') || '|' || COALESCE(attackreport->>'html', '') FROM bym.attack_logs WHERE id = ${started[0]}`).split("|");
  check("…an attack save adds the damage, buildings destroyed, loot and the battle report so far", Number(mid[0]) > 0 && Number(mid[1]) === 6 && mid[2] === "f" && /"r1": 1\d\d\d/.test(mid[3]) && mid.slice(4).join("|").length > 20, JSON.stringify({ mid: mid.map((s) => s.slice(0, 160)), fought }));
  await g(() => { try { window.__game.ATTACK.End(); } catch (e) {} });
  await page.waitForTimeout(6000);
  const ended = sql(`SELECT damage || '|' || destroyed || '|' || (CASE WHEN ended THEN 't' ELSE 'f' END) || '|' || COALESCE(loot::text, '') || '|' || (CASE WHEN endtime IS NOT NULL THEN 't' ELSE 'f' END) FROM bym.attack_logs WHERE id = ${started[0]}`).split("|");
  check("…the last save ends it", ended[2] === "t" && ended[4] === "t" && Number(ended[1]) >= 6, JSON.stringify(ended));
  const lootRow = JSON.parse(ended[3] || "{}");
  await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} window.__game.BASE.LoadBase(null, 0, 0, window.__game.GLOBAL.e_BASE_MODE.BUILD, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD); });
  await home();

  // ---- the button, the window
  const bar = await g(() => { const a = window.__named("ioAttackLogs"), l = window.__named("ioLeaderboards"); return a ? { a: [a.x, a.y, a.width, a.height], l: l ? [l.x, l.y] : null } : null; });
  // (since 4 October, evening: the shortcut bars go Alliances, Attack Log, Leaderboard, Change Log)
check("the Attack Log bar is in the top bar, left of the leaderboard's", bar && (!bar.l || (bar.l[0] === bar.a[0] + bar.a[2] + 6 && bar.a[1] === bar.l[1])), JSON.stringify(bar));
  if (bar) { const p = await g(() => window.__at(window.__named("ioAttackLogs"))); await page.screenshot({ path: `${shots}/oct3-al-button.png`, clip: { x: Math.max(0, p.x - 220), y: Math.max(0, p.y - 30), width: 440, height: 60 } }); }
  const tip = await g(async () => { const b = window.__named("ioAttackLogs"); b.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("mouseOver")); await new Promise((r) => setTimeout(r, 300)); const t = window.__texts(window.__player.stage).filter((x) => /Every attack you made/.test(x)); b.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("mouseOut")); return t; });
  check("…its tip says what it is", tip.length > 0, JSON.stringify(tip));
  // (the tip away first, as moving the mouse off would: it can lie over the button)
  await g(() => { const b = window.__named("ioAttackLogs"); b.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("mouseOut")); });
  // (and no wild monster attack's alert in the way: they are off for the test, again after the reload)
  await g(() => { const WM = window.__game.WMATTACK; WM._enabled = false; try { WM.HideWarning(); } catch (e) {} for (let i = 0; i < 4; i++) { try { window.__game.POPUPS.Next(); } catch (e) {} } });
  await page.waitForTimeout(300);
  await clickNamed("ioAttackLogs", 300);
  await page.waitForFunction((AL) => { const C = window.__classByName(AL); return C._open && C._open._data; }, AL, { timeout: 20000 });
  await page.waitForTimeout(800);
  const win = await g((AL) => { const o = window.__classByName(AL)._open; return { mine: o._data.mine.length, first: o._data.mine[0], rows: o._rows.numChildren, texts: window.__texts(o._rows.getChildAt(0)) }; }, AL);
  check("the window: My attacks, the newest first: the tribe, the yard, the damage, the loot", win.first && win.first.id === Number(started[0]) && win.rows === win.mine && win.texts[0] === "just now" && win.texts[1] === names[tribeName] && win.texts[2] === `Tribe, level ${wild.level}` && win.texts[3] === `${ended[0]}%` && win.texts[4] === (Object.values(lootRow).reduce((a, b) => a + b, 0)).toLocaleString("en-US"), JSON.stringify({ win, lootRow }));
  await page.screenshot({ path: `${shots}/oct3-al-mine.png` });
  // Attacks on me (a log made by hand: another player's attack on this one)
  sql(`INSERT INTO bym.attack_logs (attacker_userid, attacker_username, defender_userid, defender_username, type, x, y, loot, attackreport, attacktime, baseid, level, damage, destroyed, ended) VALUES (999999, 'TestRaider', ${me}, 'me', 'main', 3, 4, '{"r1": 50000, "r3": 2500}', '{"html": "<ul><li>raid</li></ul>"}', now() - interval '3 hours', 'x', 30, 42, 7, true)`);
  await clickNamed("ioAlRefresh", 1500);
  await clickNamed("ioAlTab1", 600);
  const onme = await g((AL) => { const o = window.__classByName(AL)._open; return { n: o._data.onme.length, texts: o._rows.numChildren ? window.__texts(o._rows.getChildAt(0)) : [] }; }, AL);
  check("…Attacks on me: the attacker, the yard, the damage, the loot lost", onme.n >= 1 && onme.texts[0] === "3 h ago" && onme.texts[1] === "TestRaider" && onme.texts[2] === "Main yard" && onme.texts[3] === "42%" && onme.texts[4] === "52,500", JSON.stringify(onme));
  await page.screenshot({ path: `${shots}/oct3-al-onme.png` });
  // a report
  await clickNamed("ioAlReport", 1500);
  const rep = await g(() => { const d = window.__named("ioAlDetail"); return d ? window.__texts(d) : null; });
  check("…Report: the details (destroyed, loot lost) and the battle report", rep && rep.some((t) => /TestRaider's attack on you/.test(t)) && rep.includes("7") && rep.some((t) => /50,000 .+, 2,500 /.test(t)) && rep.some((t) => /raid/.test(t)), JSON.stringify(rep));
  await page.screenshot({ path: `${shots}/oct3-al-report-onme.png` });
  await clickNamed("ioAlBack", 400);
  await clickNamed("ioAlTab0", 600);
  await clickNamed("ioAlReport", 2000);
  const rep2 = await g(() => { const d = window.__named("ioAlDetail"); return d ? window.__texts(d) : null; });
  check("…and of my attack: the game's own battle log (buildings destroyed, resources looted)", rep2 && rep2.some((t) => /Your attack on/.test(t)) && rep2.some((t) => /Resources Looted/i.test(t) || /destroyed/i.test(t)), JSON.stringify(rep2 && rep2.slice(-3)));
  await page.screenshot({ path: `${shots}/oct3-al-report.png` });
  // someone else's log can't be read
  const other = sql(`SELECT id FROM bym.attack_logs WHERE attacker_userid <> ${me} AND defender_userid <> ${me} LIMIT 1`);
  if (other) { const r = await (await fetch(`${server}attacklogs/game`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" }, body: `id=${other}` })).json(); check("…someone else's report is not given out", !!r.error, JSON.stringify(r)); }
  // Jump
  await clickNamed("ioAlDetailJump", 300);
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const jumped = await g((AL) => ({ map: window.__game.GLOBAL.isMapOpen(), open: !!window.__classByName(AL)._open }), AL);
  check("…Jump closes the window and opens the map on the yard", jumped.map && !jumped.open, JSON.stringify(jumped));
  sql(`DELETE FROM bym.attack_logs WHERE attacker_userid = 999999`);

  // ================= the Academy: level 5 to 6 for a monster that used to stop at 5
  const acad = await g(() => {
    const G = window.__game, A = window.__classByName("ACADEMY"), L = window.__classByName("CREATURELOCKER");
    const b = G.GLOBAL._bAcademy;
    if (!b) return { none: true };
    const id = "IC1", up = G.GLOBAL.player.m_upgrades;
    const keep = up[id] ? { level: up[id].level, time: up[id].time } : null, keepLock = L._lockerData[id], keepUp = b._upgrading, keepLvl = b._lvl.Get();
    G.BASE._blockSave = true;
    up[id] = up[id] || {}; up[id].level = 5; up[id].time = null; L._lockerData[id] = { t: 2 }; b._upgrading = null; b._lvl.Set(5);
    G.BASE._resources.r3.Set(Math.max(G.BASE._resources.r3.Get(), 1e9));
    A._building = b;
    const five = A.StartMonsterUpgrade(id, true);
    up[id].level = 6;
    const six = A.StartMonsterUpgrade(id, true);
    if (keep) { up[id].level = keep.level; up[id].time = keep.time; } L._lockerData[id] = keepLock; b._upgrading = keepUp; b._lvl.Set(keepLvl);
    return { five: [five.error, five.errorMessage], six: [six.error, six.status], stats: ["health", "damage", "speed"].map((k) => L._creatures[id].props[k] && L._creatures[id].props[k].length) };
  });
  check("the Academy trains a Spurtz at level 5 on to level 6 (and no further); its stats go to 6", acad.none || (!acad.five[0] && acad.six[0] && /fully/i.test(acad.six[1]) && acad.stats.every((n) => n >= 6)), JSON.stringify(acad));

  // ================= chat: a line that never comes back is not lost (bug report A2)
  const chatOk = await g(async () => {
    const C = window.__classByName("com.monsters.chat::Chat")._bymChat;
    if (!C || !C._isConnected) return { none: true };
    if (!C._open) C.chatBox.toggleHide(null);
    C.ioSwitch("global");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const word = "oct3 " + Date.now();
    C.ioProcessInput(word);
    await sleep(7500);
    const log1 = C._ioLogs.global.map((l) => l.html || "");
    const fine = log1.some((h) => h.includes(word)) && !log1.some((h) => /didn't get through/.test(h));
    // the next one lost on the way (the server never sends it back)
    const sys = window.__classByName("com.monsters.chat::BYMChat")._chat;
    const keep = sys.say; sys.say = function () {};
    const lost = "lost " + Date.now();
    C.ioProcessInput(lost);
    const cleared = C.chatBox.inputText === "";
    await sleep(7000);
    sys.say = keep;
    const log2 = C._ioLogs.global.map((l) => l.html || "");
    const back = C.chatBox.inputText;
    C.chatBox.clearInputText();
    return { fine, cleared, said: log2.some((h) => /didn't get through/.test(h)), back };
  });
  check("chat: a line sent comes back as usual (nothing said)", chatOk.none || chatOk.fine, JSON.stringify(chatOk));
  check("…a line that never comes back is put back in the box, and the chat says so", chatOk.none || (chatOk.cleared && chatOk.said && /^lost /.test(chatOk.back)), JSON.stringify(chatOk));

  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
} catch (e) {
  check("the test ran through", false, String(e.stack || e).slice(0, 600));
  await page.screenshot({ path: `${shots}/oct3-fail.png` }).catch(() => {});
}

// ================= an outpost: its worker shows (EMAIL: a player with an outpost on a Map Room 2 world)
if (process.env.EMAIL3 && process.env.EMAIL) {
  const cell = sql(`SELECT c.x || ',' || c.y FROM bym.save s JOIN bym.world_map_cell c ON c.cellid = s.cell_cellid JOIN bym."user" u ON u.userid = s.saveuserid WHERE u.email = '${process.env.EMAIL}' AND s.type = 'outpost' LIMIT 1`);
  if (cell) {
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs2 = []; p2.on("pageerror", (e) => errs2.push(e.message));
    const t2 = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
    await p2.goto(`${server}?token=${t2}&language=english&shell=0`);
    await p2.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
    await p2.waitForTimeout(6000);
    for (let i = 0; i < 8; i++) { await p2.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await p2.waitForTimeout(200); }
    const [x, y] = cell.split(",").map(Number);
    await p2.evaluate(([x, y]) => window.__game.BASE.ioLoadOutpost(x, y), [x, y]);
    await p2.waitForFunction(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL.mode === "build", null, { timeout: 60000 }).catch(() => {});
    await p2.waitForTimeout(4000);
    const w = await p2.evaluate(() => { const W = window.__classByName("UI_WORKERS"); const r = W._mc && W._mc.getBounds(window.__player.stage); return { outpost: window.__game.BASE.isOutpost, n: W._workers ? W._workers.length : -1, shown: !!(W._mc && W._mc.stage && W._mc.visible), at: r && [Math.round(r.x), Math.round(r.y)] }; });
    check("in an outpost the worker icons show (its two workers, since 5 October)", w.outpost && w.n === 2 && w.shown, JSON.stringify(w));
    await p2.screenshot({ path: `${shots}/oct3-outpost-workers.png` });
    check("…no page errors there", errs2.length === 0, errs2.slice(0, 3).join(" | "));
  }
}
await browser.close();
