// Hell Freezes Over (server services/events/hfo.ts, client com/monsters/events/hfo and creeps/inferno/hfo), from
// the admin switch to Rimegrave:
//  - off by default; the admin panel turns it on, and it starts for a player who has every Strongbox monster on
//    pages 1-5 (not before); Start now / Next day / Reset
//  - Day 1: small patches placed on free ground and kept by the server (6, then one per 2 hours); a worker
//    clears one and says a Day 1 line; Day 2: 5 big patches, a worker's try counts once and the patch holds
//  - Day 3: the frozen ground, every tower sealed (and freed by a worker), the counter, the tomb; the last tower
//    opens the waves ("Hell has frozen over!")
//  - the waves: a try counted at the start, a win pays 5 shiny once, three losses skip the wave, a replay pays
//    nothing; every ice cretin spawns and is drawn; the Hulk splits into Shivlings; the stragglers melt two
//    minutes after the last surge
//  - the ice powers: a tower hit waits a reload and then breaks free; a monster hit is frozen for a second
//  - Rimegrave: locked in the Strongbox (and refused by the server) until all 13 are won; then the reveal plays
//    once and he unlocks; drawn at his Academy level
//  - no page errors
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... node tools/test/hfo-test.mjs
// Needs a local test server and database (psql). Changes the test account's event progress, locker and
// academy, and puts them back at the end. Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token, json = false) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": json ? "application/json" : "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let out = {};
  try { out = await r.json(); } catch {}
  return { status: r.status, ...out };
};
const login = async () => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const token = await login();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const signinCode = (await post("admin/session", "", token)).code;
const signin = await fetch(`${server}admin/signin?code=${signinCode}`, { redirect: "manual" });
const session = ((signin.headers.get("set-cookie") || "").match(/bymr_admin=([a-f0-9]{64})/) || [])[1];
const panel = async (action, body = {}) => (await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) })).json();
const state = () => JSON.parse(sql(`SELECT COALESCE(hfo::text, 'null') FROM bym."user" WHERE userid = ${uid}`));
const setState = (s) => sql(`UPDATE bym."user" SET hfo = ${s === null ? "NULL" : `'${JSON.stringify(s).replace(/'/g, "''")}'::jsonb`} WHERE userid = ${uid} RETURNING userid`);
const now = () => Math.floor(Date.now() / 1000);
// the server, with the game's own login
const api = (path, body) => page.evaluate(async ([server, path, body]) => { const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body }); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, ...j }; }, [server, path, body]);
const lockerWith = (extra) => encodeURIComponent(JSON.stringify({ ...Object.fromEntries(QUALIFY.map((k) => [k, { t: 2 }])), ...extra }));

// put back at the end
const saved = sql(`SELECT json_build_object('locker', lockerdata, 'academy', academy, 'credits', credits, 'buildings', buildingdata)::text FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const savedHfo = sql(`SELECT COALESCE(hfo::text, '') FROM bym."user" WHERE userid = ${uid}`);
const restore = () => {
  const s = JSON.parse(saved);
  sql(`UPDATE bym.save SET lockerdata = '${JSON.stringify(s.locker).replace(/'/g, "''")}'::jsonb, academy = '${JSON.stringify(s.academy).replace(/'/g, "''")}'::jsonb, credits = ${Number(s.credits)}, buildingdata = '${JSON.stringify(s.buildings).replace(/'/g, "''")}'::jsonb WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  sql(`UPDATE bym."user" SET hfo = ${savedHfo ? `'${savedHfo.replace(/'/g, "''")}'::jsonb` : "NULL"} WHERE userid = ${uid} RETURNING userid`);
  sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
};
sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
setState(null);

// three defence towers for Day 3 (put back at the end)
sql(`UPDATE bym.save SET buildingdata = buildingdata || '{"901":{"X":-220,"Y":-220,"t":21,"id":901,"l":1},"902":{"X":220,"Y":-220,"t":21,"id":902,"l":1},"903":{"X":-220,"Y":220,"t":21,"id":903,"l":1}}'::jsonb WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
const QUALIFY = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC15", "IC12", "IC14", "IC20", "C19", "IC9", "IC10", "IC24"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => { errors.push(e.message); console.log("PAGEERROR " + e.message + " " + (e.stack || "").split("\n").slice(0, 4).join(" | ")); });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE " + m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const HFO = "com.monsters.events.hfo::IoHfo";
const UI = "com.monsters.events.hfo::IoHfoUi";
const WAVES = "com.monsters.events.hfo::IoHfoWaves";
const loaded = () => page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 });
const reload = async () => {
  await g(() => { window.__game.BASE.LoadBase(null, 0, 0, "build", false, 0); });
  await page.waitForTimeout(1500);
  await loaded();
  await page.waitForTimeout(4000);
};
const closePopups = async () => { for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); } };
const ices = () => g((HFO) => window.__classByName(HFO).ices().map((i) => ({ kind: i.kind, id: i.ioServerId, x: i._mc.x, y: i._mc.y })), HFO);
const flag = () => g((HFO) => window.__classByName(HFO).flag(), HFO);
const PREFIX = { small: "hfo_ice_small_msg", big: "hfo_ice_big_msg", tower: "hfo_ice_tower_msg" };
// sends a worker to the event's ice of `kind` and waits for the worker's event line (the first "on my way" line aside)
const sendAndWait = async (kind, which = 0) => {
  await g(([HFO, kind, which, prefix]) => {
    const list = window.__classByName(HFO).ices().filter((i) => i.kind === kind);
    const K = window.__game.KEYS;
    window.__hfoLines = [];
    for (let n = 1; n <= 6; n++) { const t = String(K.Get(prefix + n)); if (t && t !== prefix + n) window.__hfoLines.push(t); }
    window.__lastSaid = null;
    const W = window.__game.WORKERS;
    if (!W.__wrapped) { const say = W.Say; W.Say = function (t) { if (window.__hfoLines && window.__hfoLines.indexOf(String(t)) >= 0) window.__lastSaid = String(t); return say.apply(this, arguments); }; W.__wrapped = true; }
    window.__game.MUSHROOMS.PickWorker(list[which]);
  }, [HFO, kind, which, PREFIX[kind]]);
  return page.waitForFunction(() => Boolean(window.__lastSaid), null, { timeout: 90000 }).then(() => g(() => window.__lastSaid), () => null);
};

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await loaded();
  await page.waitForTimeout(4000);
  await closePopups();
  await g(() => { window.__game.BASE._blockSave = false; window.__game.WMATTACK._enabled = false; });

  // ---- 1. off by default; qualifying; the switch
  const off = await panel("status");
  check("off by default (admin Status card)", off.hfo && off.hfo.enabled === false, JSON.stringify(off.hfo));
  sql(`UPDATE bym.save SET lockerdata = (SELECT jsonb_object_agg(k, '{"t":2}'::jsonb) FROM unnest(ARRAY[${QUALIFY.map((k) => `'${k}'`).join(",")}]) k), academy = COALESCE(academy, '{}'::jsonb) || '{"IC9":{"level":1},"IC10":{"level":1},"IC24":{"level":1}}'::jsonb WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  await reload();
  check("...off: not started even when the player qualifies", state() === null && !(await flag()), JSON.stringify(state()));
  await panel("hfo", { state: "on" });
  await reload();
  const started = state();
  check("on: every monster unlocked (champions at Academy level 1): it starts on the next load (day 0, Day 1 a day later)", started && started.day === 0 && Math.abs(started.t0 - now()) < 60, JSON.stringify(started && { day: started.day, t0: started.t0 }));
  const card = await panel("player", { id: uid });
  check("...the player's card shows it", card.hfo && card.hfo.day === 0, JSON.stringify(card.hfo));
  check("...nothing in the yard yet, no button", (await ices()).length === 0 && !(await g((HFO) => window.__classByName(HFO).buttonShown(), HFO)));

  // ---- 2. Day 1 (as if it began 3 hours ago: 6 + 1 patches due)
  const s1 = state();
  s1.day = 1; s1.dayAt[1] = now() - 3 * 3600 - 60; s1.t0 = now() - 86400 - 3 * 3600;
  setState(s1);
  await reload();
  await page.waitForFunction((HFO) => window.__classByName(HFO).ices().length >= 7, HFO, { timeout: 20000 }).catch(() => {});
  const day1 = await ices();
  const st1 = state();
  check("Day 1: 7 small patches placed (6 + one for 2 hours) and kept by the server", day1.filter((i) => i.kind === "small").length === 7 && st1.small.spawned === 7 && st1.small.patches.length === 7, JSON.stringify({ placed: day1.length, server: st1.small.spawned }));
  const blocked = await g((HFO) => window.__classByName(HFO).ices().every((i) => window.__game.GRID.FootprintBlocked([{ x: 0, y: 0, width: 30, height: 30 }], { x: i._mc.x, y: i._mc.y }, true) || true), HFO);
  await page.screenshot({ path: `${shots}/hfo-day1.png` });
  const said1 = await sendAndWait("small");
  await page.waitForTimeout(1500);
  const st1b = state();
  check("...a worker clears one: it goes, the server counts it, the worker says a Day 1 line", st1b.small.cleared === 1 && st1b.small.patches.length === 6 && (await ices()).length === 6 && st1b.decks.d1.heard.length === 1 && Boolean(said1), JSON.stringify({ cleared: st1b.small.cleared, said: said1 }));
  await reload();
  check("...placed again where they were after a reload (6)", (await ices()).filter((i) => i.kind === "small").length === 6);

  // ---- 3. Day 2
  const s2 = state();
  s2.day = 2; s2.dayAt[2] = now(); s2.small.cleared = 12; s2.small.spawned = 12; s2.small.patches = []; s2.decks.d1.heard = [1, 2, 3, 4, 5, 6];
  setState(s2);
  await reload();
  await page.waitForFunction((HFO) => window.__classByName(HFO).ices().filter((i) => i.kind === "big").length >= 5, HFO, { timeout: 20000 }).catch(() => {});
  const st2 = state();
  check("Day 2: 5 big patches placed and kept", (await ices()).filter((i) => i.kind === "big").length === 5 && st2.big.spawned === 5, JSON.stringify(st2.big));
  const said2 = await sendAndWait("big");
  await page.waitForTimeout(2500);
  const said2b = await sendAndWait("big");
  await page.waitForTimeout(2500);
  const st2b = state();
  check("...a worker tries one: it holds, the try counts once (twice tried, one counted), two Day 2 lines", (await ices()).filter((i) => i.kind === "big").length === 5 && st2b.big.tried.length === 1 && st2b.decks.d2.heard.length === 2 && said2 && said2b, JSON.stringify({ tried: st2b.big.tried, heard: st2b.decks.d2.heard }));
  await page.screenshot({ path: `${shots}/hfo-day2.png` });

  // ---- 4. Day 3
  const s3 = state();
  s3.day = 3; s3.dayAt[3] = now(); s3.big.tried = s3.big.patches.map((p) => p[0]); s3.decks.d2.heard = [1, 2, 3, 4, 5];
  setState(s3);
  await reload();
  await page.waitForFunction(() => window.__game, null, {});
  await page.waitForTimeout(3000);
  const towers = await g((HFO) => window.__classByName(HFO).defenceTowers().map((t) => t._id), HFO);
  const st3 = state();
  const towerIce = (await ices()).filter((i) => i.kind === "tower");
  check("Day 3: every tower sealed (the server keeps which), the ground frozen, the counter shown", st3.towers.iced && st3.towers.iced.length === towers.length && towerIce.length === towers.length && towers.length > 0 && (await g(() => window.__game.MAP.texture)) === "hfo_frozen" && (await g(() => { const h = window.__game.GLOBAL._layerUI.getChildByName("ioHfoHud"); return h ? h.getChildAt(0).text : ""; })).indexOf("0 / " + towers.length) >= 0, JSON.stringify({ towers: towers.length, iced: st3.towers.iced && st3.towers.iced.length, ice: towerIce.length }));
  check("...the event's button shows from Day 3", await g((HFO) => window.__classByName(HFO).buttonShown(), HFO));
  await page.screenshot({ path: `${shots}/hfo-day3.png` });
  const said3 = await sendAndWait("tower");
  await page.waitForTimeout(2000);
  const st3b = state();
  check("...a worker frees a tower: its ice goes, a Day 3 line", st3b.towers.thawed.length === 1 && (await ices()).filter((i) => i.kind === "tower").length === towers.length - 1 && Boolean(said3), JSON.stringify({ thawed: st3b.towers.thawed, said: said3 }));
  // every tower but one freed, then the last
  const s3c = state();
  s3c.towers.thawed = s3c.towers.iced.slice(0, -1);
  s3c.decks.d3.heard = [1, 2, 3, 4];
  setState(s3c);
  await reload();
  const saidLast = await sendAndWait("tower");
  await page.waitForTimeout(2500);
  const st3d = state();
  const popupTitle = await g(() => { const T = window.__classByName("flash.text::TextField"); let found = ""; const walk = (o) => { if (!o) return; if (o instanceof T && /frozen over/i.test(o.text)) found = o.text; for (const c of o.$children ?? []) walk(c); }; walk(window.__game.GLOBAL._layerTop); return found; });
  check("...the last tower: the waves open and \"Hell has frozen over!\" shows", st3d.day === 4 && /frozen over/i.test(popupTitle) && Boolean(saidLast), JSON.stringify({ day: st3d.day, popupTitle }));
  await page.screenshot({ path: `${shots}/hfo-frozen-popup.png` });
  await closePopups();
  await reload();
  await closePopups();

  // ---- 5. the waves
  const credits0 = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
  await g((WAVES) => window.__classByName(WAVES).Start(1), WAVES);
  await page.waitForFunction((WAVES) => window.__classByName(WAVES).running && window.__game.CREEPS._creepCount > 0, WAVES, { timeout: 20000 }).catch(() => {});
  const spawned = await g(() => { const ids = {}; for (const k in window.__game.CREEPS._creeps) { const c = window.__game.CREEPS._creeps[k]; ids[c._creatureID] = (ids[c._creatureID] || 0) + 1; } return ids; });
  check("wave 1 starts: a try counted, 32 Shivlings", state().waves["1"].t === 1 && spawned.IC26 === 32, JSON.stringify(spawned));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${shots}/hfo-wave1.png` });
  // the stragglers melt: two minutes after the last surge (brought forward here)
  const melt = await g(async (WAVES) => {
    const W = window.__classByName(WAVES); const C = window.__game.CREEPS;
    const hp = () => { let n = 0; for (const k in C._creeps) n += Math.max(0, C._creeps[k].health); return n; };
    const before = hp();
    W._lastSurgeAt = W.fightSeconds - W.MELT_AFTER - 0.01;
    await new Promise((r) => setTimeout(r, 1500));
    const after = hp();
    const hud = window.__game.UI2._warning && window.__game.UI2._warning.$children ? window.__game.UI2._warning.$children.map((c) => c.text || "").join(" ") : "";
    return { before, after, hud, melted: W._melted };
  }, WAVES);
  check("...two minutes after a wave's last surge the cretins left start melting", melt.after < melt.before && melt.melted >= 1, JSON.stringify(melt));
  await g(() => { for (const k in window.__game.CREEPS._creeps) { const c = window.__game.CREEPS._creeps[k]; c.setHealth(0); } });
  await page.waitForFunction(() => !window.__game.WMATTACK._inProgress, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const st5 = state();
  const credits1 = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
  check("...every cretin gone: won, 5 shiny paid once (a claim row)", st5.waves["1"].won > 0 && credits1 - credits0 === 5 && sql(`SELECT count(*) FROM bym.hfo_claim WHERE userid = ${uid} AND wave = 1`) === "1", JSON.stringify({ won: st5.waves["1"], paid: credits1 - credits0 }));
  await closePopups();
  // wave 2: three losses skip it
  for (let i = 0; i < 3; i++) {
    await g((WAVES) => window.__classByName(WAVES).Start(2), WAVES);
    await page.waitForFunction((WAVES) => window.__classByName(WAVES).running, WAVES, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await g(() => { window.__game.UI2._scareAway && window.__game.UI2._scareAway.dispatchEvent(new (window.__classByName("flash.events::Event"))("scareAway")); });
    await page.waitForFunction((WAVES) => !window.__classByName(WAVES).running, WAVES, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await closePopups();
    await g(() => { for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); });
    await page.waitForTimeout(1500);
  }
  const st5b = state();
  check("wave 2 given up three times: skipped, wave 3 is next, nothing paid", st5b.waves["2"].skipped === true && st5b.waves["2"].t === 3 && !st5b.waves["2"].won && (await flag()).current === 3 && sql(`SELECT count(*) FROM bym.hfo_claim WHERE userid = ${uid} AND wave = 2`) === "0", JSON.stringify(st5b.waves["2"]));
  // every ice cretin drawn
  const drawn = await g(() => {
    const out = {};
    for (const id of ["IC26", "IC27", "IC28", "IC29", "IC30", "IC31"]) {
      const m = window.__game.CREEPS.Spawn(id, window.__game.MAP._BUILDINGTOPS, "bounce", { x: -300 + Object.keys(out).length * 120, y: 400 }, 90, 1, true, false, 1);
      out[id] = { cls: m.constructor.name, w: m._graphic.width, h: m._graphic.height, health: m.health };
    }
    return out;
  });
  await page.waitForTimeout(5000);
  const lit = await g(() => { const out = {}; for (const k in window.__game.CREEPS._creeps) { const c = window.__game.CREEPS._creeps[k]; let n = 0; const b = c._graphic; for (let x = 0; x < b.width; x += 3) for (let y = 0; y < b.height; y += 3) if ((b.getPixel32(x, y) >>> 24) > 0) n++; out[c._creatureID] = n; } return out; });
  await page.screenshot({ path: `${shots}/hfo-cretins.png` });
  check("every ice cretin is drawn from its own sheet at its own size", Object.keys(drawn).length === 6 && Object.values(lit).every((n) => n > 5) && drawn.IC31.w === 84 && drawn.IC26.w === 32, JSON.stringify({ drawn, lit }));
  // the ice powers
  const powers = await g(() => {
    const IoIce = window.__classByName("com.monsters.monsters.creeps.inferno.hfo::IoIce");
    const tower = window.__classByName("com.monsters.events.hfo::IoHfo").defenceTowers()[0];
    let monster = null;
    for (const k in window.__game.CREEPS._creeps) { monster = window.__game.CREEPS._creeps[k]; break; }
    IoIce.hit(null, tower);
    const iced = tower.ioIced;
    let held = 0;
    for (let i = 0; i < 5000 && tower.ioIceTick(); i++) held++;
    IoIce.hit(null, monster);
    const frozen = monster.getComponentByName("ioFreeze");
    const speed = monster.moveSpeedProperty.value;
    return { iced, held, rate: tower._rate, freed: !tower.ioIced, frozen: Boolean(frozen), left: frozen ? frozen.left : 0, cooldown: monster.attackCooldown, speed };
  });
  check("the ice powers: a tower hit waits one reload, then breaks free; a monster hit is frozen for a second", powers.iced && powers.held >= Math.max(19, powers.rate * 2 - 1) && powers.freed && powers.frozen && powers.left === 80 && powers.cooldown >= 2, JSON.stringify(powers));
  // the Hulk splits
  const split = await g(() => {
    let hulk = null;
    for (const k in window.__game.CREEPS._creeps) if (window.__game.CREEPS._creeps[k]._creatureID === "IC31") hulk = window.__game.CREEPS._creeps[k];
    const before = Object.values(window.__game.CREEPS._creeps).filter((c) => c._creatureID === "IC26").length;
    hulk.setHealth(0);
    hulk.dispatchEvent(new (window.__classByName("flash.events::Event"))("monsterDeath"));
    return before;
  });
  await page.waitForTimeout(3000);
  const after = await g(() => Object.values(window.__game.CREEPS._creeps).filter((c) => c._creatureID === "IC26" && c.health > 0).length);
  check("...the Permafrost Hulk shatters into 4 Shivlings", after - split >= 4, JSON.stringify({ before: split, after }));
  await g(() => { for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); });
  await page.waitForTimeout(3000);
  await closePopups();
  // a replay of the skipped wave: no try, no pay
  await g((WAVES) => window.__classByName(WAVES).Start(2), WAVES);
  await page.waitForFunction((WAVES) => window.__classByName(WAVES).running, WAVES, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const credits2 = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
  await g(() => { for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); });
  await page.waitForFunction(() => !window.__game.WMATTACK._inProgress, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const st5c = state();
  check("a skipped wave replayed and won: counts for the champion, no try, no shiny", st5c.waves["2"].won > 0 && st5c.waves["2"].t === 3 && Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`)) === credits2, JSON.stringify(st5c.waves["2"]));
  await closePopups();
  // the window
  await g((UI) => window.__classByName(UI).ShowWindow(), UI);
  await page.waitForTimeout(3000);
  const win = await g(() => { const w = window.__game.GLOBAL._layerTop.getChildByName("ioHfoWindow"); if (!w) return null; let rows = 0; for (const c of w.$children ?? []) if (/^ioHfoWave/.test(c.name)) rows++; return rows; });
  await page.screenshot({ path: `${shots}/hfo-window.png` });
  check("the event's window: 13 waves", win === 13, String(win));
  await g((UI) => window.__classByName(UI).CloseWindow(), UI);

  // ---- 6. Rimegrave
  const lockedTry = await g(() => window.__game.CREATURELOCKER.Start("IC25"));
  check("Rimegrave can't be unlocked before the curse is broken", lockedTry === false);
  await closePopups();
  // the server refuses a save that unlocks him
  const [forged, mainBase, points, basevalue] = sql(`SELECT basesaveid || '|' || baseid || '|' || points || '|' || basevalue FROM bym.save WHERE userid = ${uid} AND type = 'main'`).split("|");
  const sv = await api("base/save", `basesaveid=${forged}&baseid=${mainBase}&points=${points}&basevalue=${basevalue}&lockerdata=${lockerWith({ IC25: { t: 2 } })}`);
  check("...and the server refuses a save that unlocks him", sv.status === 200 && sql(`SELECT COALESCE(lockerdata->'IC25'->>'t', 'none') FROM bym.save WHERE userid = ${uid} AND type = 'main'`) === "none", JSON.stringify({ status: sv.status, error: sv.error }));
  // all 13 won: the reveal
  const s6 = state();
  for (let w = 1; w <= 13; w++) s6.waves[String(w)] = { t: 1, won: now() };
  s6.done = now();
  s6.seen.frozen = now();
  delete s6.seen.reveal;
  setState(s6);
  await reload();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${shots}/hfo-reveal.png` });
  const champ = await g(() => { const T = window.__classByName("flash.text::TextField"); let found = ""; const walk = (o) => { if (!o) return; if (o instanceof T && /champion/i.test(o.text)) found = o.text; for (const c of o.$children ?? []) walk(c); }; walk(window.__game.GLOBAL._layerTop); return found; });
  const st6 = state();
  check("all 13 won: the reveal plays once (the ice bursts, the champion popup) and the ground thaws", st6.seen.reveal > 0 && /champion/i.test(champ) && (await ices()).filter((i) => i.kind === "big").length === 0, JSON.stringify({ seen: st6.seen, champ }));
  await closePopups();
  await reload();
  check("...not again on the next load; the ground is lava again", (await g(() => window.__game.MAP.texture)) === "lava" && !(await g(() => { const T = window.__classByName("flash.text::TextField"); let f = false; const walk = (o) => { if (!o) return; if (o instanceof T && /champion awakens/i.test(o.text)) f = true; for (const c of o.$children ?? []) walk(c); }; walk(window.__game.GLOBAL._layerTop); return f; })));
  // (the test yard has no Strongbox to press Unlock in: the gate CREATURELOCKER.Start asks, then the save)
  const free = await g((HFO) => window.__classByName(HFO).championFree(), HFO);
  const sv2 = await api("base/save", `basesaveid=${forged}&baseid=${mainBase}&points=${points}&basevalue=${basevalue}&lockerdata=${lockerWith({ IC25: { t: 2 } })}`);
  check("...Rimegrave can be unlocked in the Strongbox now, and the server keeps it", free === true && sv2.status === 200 && sql(`SELECT COALESCE(lockerdata->'IC25'->>'t', 'none') FROM bym.save WHERE userid = ${uid} AND type = 'main'`) === "2", JSON.stringify({ free, status: sv2.status }));
  await closePopups();
  // drawn at his level
  const rime = await g(() => {
    const out = [];
    for (const lvl of [1, 6]) {
      window.__game.GLOBAL.player.m_upgrades.IC25 = { level: lvl };
      const m = window.__game.CREEPS.Spawn("IC25", window.__game.MAP._BUILDINGTOPS, "bounce", { x: 200 + lvl * 60, y: 300 }, 90, 1, true, false, lvl);
      out.push({ level: m.level, w: m._graphic.width, h: m._graphic.height, cls: m.constructor.name });
    }
    return out;
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${shots}/hfo-rimegrave.png` });
  check("Rimegrave is drawn at his Academy level (level 1: 86 x 96, level 6: 164 x 182)", rime[0].level === 1 && rime[0].w === 86 && rime[1].level === 6 && rime[1].w === 164, JSON.stringify(rime));
  await g(() => { for (const k in window.__game.CREEPS._creeps) window.__game.CREEPS._creeps[k].setHealth(0); });
  await page.waitForTimeout(2000);

  // ---- 7. admin tools
  await panel("hfoReset", { id: uid });
  check("admin Reset clears the progress", state() === null);
  await panel("hfo", { state: "off" });
  await panel("hfoStart", { id: uid });
  check("admin Start now starts it even with the switch off", state() && state().day === 0);
  await panel("hfoNextDay", { id: uid });
  await reload();
  check("admin Next day: Day 1 begins on the next load", state().day === 1, String(state().day));
  const offAgain = await panel("status");
  check("...turned off: the player who started keeps going", offAgain.hfo.enabled === false && state().day === 1);

  // admin test mode: Rimegrave and the cretins on offer (the Designer asks the same list)
  const offer = () => g(() => { const L = window.__game.CREATURELOCKER; const ids = L.ioTestMonsterIds().filter((i) => /^IC(2[5-9]|3[01])$/.test(i)); return { ids, blocked: ["IC26", "IC27", "IC28", "IC29", "IC30", "IC31"].map((i) => L._creatures[i].blocked) }; });
  await api("admin/testmode", "action=on");
  await reload();
  const tm = await offer();
  check("admin test mode: Rimegrave and the six cretins on offer for attacks (still kept out of the player's windows)", tm.ids.length === 7 && tm.blocked.every((b) => b === true), JSON.stringify(tm));
  await api("admin/testmode", "action=off");
  await reload();
  const tmOff = await offer();
  check("...test mode off: the cretins still kept out of them", tmOff.blocked.every((b) => b === true), JSON.stringify(tmOff));
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("the test ran", false, String(e.stack || e).slice(0, 600));
}
finally {
  await browser.close();
  restore();
  await panel("hfo", { state: "off" });
}
