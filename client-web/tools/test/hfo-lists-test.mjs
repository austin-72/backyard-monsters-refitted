// Hell Freezes Over: where Rimegrave (IC25) and the ice cretins (IC26-IC31) show up in the player's windows:
//  - the cretins: never, in the Strongbox (any page), the Compound, the Incubator, the Incubation Control Station
//    or the Academy, before, during and after the event, and in admin test mode too
//  - Rimegrave: in none of them before the event, nor during it (12 of 13 waves won), and the game won't start his
//    unlock; once all 13 are won he is on Strongbox page 5 (locked, after Ashkarr), in the Compound, the
//    Incubator, the Incubation Control Station and the Academy (with the padlock until unlocked); his unlock
//    starts in the Strongbox and finishes (the server keeps it); then the Academy trains him and the Incubator
//    makes him
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/test/hfo-lists-test.mjs
// A Strongbox (level 5), an Academy (level 5), an Incubator and an Incubation Control Station are added to the
// test yard (Under Hall 6) and taken out after; the account's locker, academy, resources and event progress
// are put back.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const q = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const post = async (path, body, token) => { const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body }); let o = {}; try { o = await r.json(); } catch {} return { status: r.status, ...o }; };
// (a fresh login for each page: the game trades the link's token for its own)
const login = async () => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
let token = await login();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const now = () => Math.floor(Date.now() / 1000);
const ICE = ["IC26", "IC27", "IC28", "IC29", "IC30", "IC31"];
const RIME = "IC25";
const QUALIFY = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC15", "IC12", "IC14", "IC20", "C19", "IC9", "IC10", "IC24"];

const saved = sql(`SELECT json_build_object('b', buildingdata, 'k', lockerdata, 'a', academy, 'r', resources)::text FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const savedHfo = sql(`SELECT COALESCE(hfo::text, '') FROM bym."user" WHERE userid = ${uid}`);
const ADD = { 997008: { X: -400, Y: -300, t: 8, l: 5 }, 997026: { X: -200, Y: -300, t: 26, l: 5 }, 997013: { X: 0, Y: -300, t: 13, l: 3 }, 997016: { X: 200, Y: -300, t: 16, l: 1 } };
const restore = () => {
  const s = JSON.parse(saved);
  sql(`UPDATE bym.save SET buildingdata = ${q(s.b)}, lockerdata = ${q(s.k)}, academy = ${s.a === null ? "NULL" : q(s.a)}, resources = ${s.r === null ? "NULL" : q(s.r)} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
  sql(`UPDATE bym."user" SET hfo = ${savedHfo ? `'${savedHfo.replace(/'/g, "''")}'::jsonb` : "NULL"} WHERE userid = ${uid} RETURNING userid`);
};
{
  const s = JSON.parse(saved);
  const b = { ...s.b };
  for (const [id, x] of Object.entries(ADD)) b[id] = { ...x, id: Number(id) };
  b["0"] = { ...b["0"], l: 6 };
  sql(`UPDATE bym.save SET buildingdata = ${q(b)}, lockerdata = ${q(Object.fromEntries(QUALIFY.map((k) => [k, { t: 2 }])))}, academy = ${q({ IC10: { level: 2 } })} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
}
const hfoState = (won, done) => {
  const t = now();
  const st = { t0: t - 5 * 86400, day: 4, dayAt: [1, 2, 3, 4, t - 3600], small: { spawned: 12, cleared: 12, patches: [] }, big: { spawned: 5, patches: [], tried: [] }, towers: { iced: [], thawed: [] }, decks: { d1: { left: [], heard: [1, 2, 3, 4, 5, 6] }, d2: { left: [], heard: [1, 2, 3, 4, 5] }, d3: { left: [], heard: [1, 2, 3, 4] } }, waves: {}, fight: null, last: null, done: done ? t : 0, seen: done ? { frozen: t, reveal: t } : { frozen: t }, nextId: 20 };
  for (let w = 1; w <= won; w++) st.waves[String(w)] = { t: 1, won: t };
  return st;
};
const setHfo = (s) => sql(`UPDATE bym."user" SET hfo = ${s === null ? "NULL" : q(s)} WHERE userid = ${uid} RETURNING userid`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
let page = null;
const open = async () => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => { errors.push(e.message); console.log("PAGEERROR " + e.message); });
  token = await login();
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 150000 }).catch(async (e) => {
    await page.screenshot({ path: `${shots}/hfo-lists-stuck.png` });
    console.log("STUCK " + JSON.stringify(await page.evaluate(() => { const G = window.__game; return G ? { mode: G.GLOBAL._loadmode, loading: G.BASE._loading, b: G.BASE.buildings && G.BASE.buildings.length } : null; })));
    throw e;
  });
  await page.waitForTimeout(4000);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
};
// every monster each window offers
const lists = () => page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const G = window.__game, C = window.__classByName("CREATURELOCKER");
  const building = (t) => { for (const k in G.BASE._buildingsAll) if (G.BASE._buildingsAll[k]._type === t) return G.BASE._buildingsAll[k]; return null; };
  const out = {};
  C.Show(); await sleep(1200);
  const p = C._mc; const before = C._page; out.box = {};
  for (let pg = 1; pg <= 5; pg++) { C._page = pg; p.List(); out.box[pg] = p._tempCreatureList.map((c) => c.id); }
  C._page = before; p.List();
  C.Hide(); await sleep(400);
  const H = window.__classByName("HOUSING"); H.Show(); await sleep(1200);
  out.compound = Object.keys(H._housingPopup._creatureData); H.Hide(); await sleep(400);
  const A = window.__classByName("ACADEMY"), P = window.__classByName("ACADEMYPOPUP");
  A.Show(building(26)); await sleep(1200);
  out.academy = []; for (let i = 1; i <= 24; i++) { const id = P.pageID(i); if (id && !out.academy.includes(id)) out.academy.push(id); }
  A.Hide(); await sleep(400);
  const HA = window.__classByName("HATCHERY"); HA.Show(building(13)); await sleep(1200);
  const slots = HA._mc._monsterSlots.length;
  out.incubator = C.GetSortedCreatures(true).filter((c) => !c.blocked).map((c) => c.id).slice(0, slots);
  HA.Hide(); await sleep(400);
  const CC = window.__classByName("HATCHERYCC"); CC.Show(); await sleep(1200);
  out.ics = CC._mc._monsterSlots.map((s) => s.id); CC.Hide(); await sleep(400);
  return out;
});
const all = (l) => [...Object.values(l.box).flat(), ...l.compound, ...l.academy, ...l.incubator, ...l.ics];
const where = (l, id) => ["box", "compound", "academy", "incubator", "ics"].filter((k) => (k === "box" ? Object.values(l.box).flat() : l[k]).includes(id));

try {
  await post("admin/testmode", "action=off", token);
  // ---- before the event
  setHfo(null);
  await open();
  const l0 = await lists();
  check("the windows list their monsters (Strongbox pages 1-5, Compound, Academy, Incubator, Incubation Control Station)", l0.box[5].includes("IC9") && l0.compound.includes("IC1") && l0.academy.includes("IC9") && l0.incubator.includes("IC1") && l0.ics.length > 0, JSON.stringify({ box5: l0.box[5], compound: l0.compound.length, academy: l0.academy.length, incubator: l0.incubator.length, ics: l0.ics.length }));
  check("before the event: no ice cretin anywhere", ICE.every((id) => where(l0, id).length === 0), JSON.stringify(ICE.map((id) => [id, where(l0, id)]).filter((x) => x[1].length)));
  check("...and no Rimegrave anywhere", where(l0, RIME).length === 0, where(l0, RIME).join(","));
  // ---- during the event
  setHfo(hfoState(12, false));
  await open();
  const l1 = await lists();
  check("during the event (12 of 13 won): no ice cretin anywhere", ICE.every((id) => where(l1, id).length === 0));
  check("...and no Rimegrave anywhere", where(l1, RIME).length === 0, where(l1, RIME).join(","));
  const early = await page.evaluate(() => { const G = window.__game; G.BASE._resources.r3.Set(500000000); return window.__classByName("CREATURELOCKER").Start("IC25"); });
  check("...his unlock can't be started", early === false && !(await page.evaluate(() => window.__classByName("CREATURELOCKER")._lockerData.IC25)));
  await page.screenshot({ path: `${shots}/hfo-lists-during.png` });
  // ---- admin test mode (every monster unlocked for the admin): the cretins still in none of these windows
  await post("admin/testmode", "action=on", token);
  await open();
  const lt = await lists();
  check("admin test mode: still no ice cretin in any of these windows (they are for attacks and the Designer)", ICE.every((id) => where(lt, id).length === 0), JSON.stringify(ICE.map((id) => [id, where(lt, id)]).filter((x) => x[1].length)));
  const offered = await page.evaluate(() => window.__classByName("CREATURELOCKER").ioTestMonsterIds());
  check("...but test mode's attacks offer Rimegrave and all six", [RIME, ...ICE].every((id) => offered.includes(id)));
  await post("admin/testmode", "action=off", token);
  // ---- all 13 won
  setHfo(hfoState(13, true));
  await open();
  const l2 = await lists();
  check("all 13 won: Rimegrave on Strongbox page 5, after Ashkarr", l2.box[5].includes(RIME) && l2.box[5].indexOf(RIME) > l2.box[5].indexOf("IC24"), JSON.stringify(l2.box[5]));
  check("...in the Compound, the Academy, the Incubator and the Incubation Control Station", ["compound", "academy", "incubator", "ics"].every((k) => where(l2, RIME).includes(k)), where(l2, RIME).join(","));
  check("...still no ice cretin anywhere", ICE.every((id) => where(l2, id).length === 0));
  const box = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const C = window.__classByName("CREATURELOCKER"); C.Show(); await sleep(1200);
    const p = C._mc; C._page = 5; p.List();
    const i = p._tempCreatureList.findIndex((c) => c.id === "IC25");
    const row = i >= 0 ? p._mcList.$children[i].tLabel.text : "";
    p.ShowB("IC25"); await sleep(800);
    const info = { row, name: p.tName ? p.tName.text : "", costs: p.tCosts ? p.tCosts.text : "" };
    C.Hide();
    return info;
  });
  await page.screenshot({ path: `${shots}/hfo-lists-strongbox.png` });
  check("...his Strongbox row: named, locked, with the champions' unlock", /Rimegrave/i.test(box.row + box.name) && /Locked/i.test(box.row) && !/Break the curse/i.test(box.costs), JSON.stringify(box));
  const started = await page.evaluate(() => { window.__game.BASE._resources.r3.Set(500000000); const C = window.__classByName("CREATURELOCKER"); const ok = C.Start("IC25"); return { ok, data: JSON.parse(JSON.stringify(C._lockerData.IC25 || null)) }; });
  check("...his unlock starts in the Strongbox", started.ok === true && started.data && started.data.t == 1, JSON.stringify(started));
  // finished (as the champions' test does: the end brought forward)
  await page.evaluate(() => { const L = window.__classByName("CREATURELOCKER"), now = window.__game.GLOBAL.Timestamp(); L._lockerData.IC25.e = now + 2; L._lockerData.IC25.s = now - 10; });
  await page.waitForFunction(() => window.__classByName("CREATURELOCKER")._lockerData.IC25.t == 2, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const B = window.__game.BASE; B._saveCounterA++; B.Save(0, false, true); });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => !window.__game.BASE._saving, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await open();
  const kept = await page.evaluate(() => { const d = window.__classByName("CREATURELOCKER")._lockerData.IC25; return d ? Number(d.t) : 0; });
  check("...his unlock finishes and the server keeps it", kept === 2 && sql(`SELECT lockerdata->'IC25'->>'t' FROM bym.save WHERE userid = ${uid} AND type = 'main'`) === "2", String(kept));
  const use = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const G = window.__game; const out = {};
    const building = (t) => { for (const k in G.BASE._buildingsAll) if (G.BASE._buildingsAll[k]._type === t) return G.BASE._buildingsAll[k]; return null; };
    G.BASE._resources.r3.Set(500000000); G.BASE._resources.r4.Set(500000000);
    const A = window.__classByName("ACADEMY"); const ac = building(26); ac._upgrading = null;
    A.Show(ac); await sleep(1000);
    const r = A.StartMonsterUpgrade("IC25");
    out.academy = { error: r && r.error, msg: r && r.errorMessage, training: !!(G.GLOBAL.player.m_upgrades.IC25 && G.GLOBAL.player.m_upgrades.IC25.time) };
    A.CancelMonsterUpgrade("IC25");
    A.Hide(); await sleep(400);
    const HA = window.__classByName("HATCHERY"); const h = building(13); HA.Show(h); await sleep(1200);
    HA._mc.QueueAdd(25)();
    // (the first one goes straight into production)
    out.queue = JSON.parse(JSON.stringify(h._monsterQueue));
    out.making = h._inProduction;
    HA.Hide();
    return out;
  });
  check("...the Academy trains him", !use.academy.error && use.academy.training, JSON.stringify(use.academy));
  check("...the Incubator makes him", use.making === RIME || use.queue.some((e) => e[0] === RIME), JSON.stringify({ making: use.making, queue: use.queue }));
  const l3 = await lists();
  check("...unlocked: in every window, the cretins in none", ["box", "compound", "academy", "incubator", "ics"].every((k) => where(l3, RIME).includes(k)) && ICE.every((id) => where(l3, id).length === 0));
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("the test ran", false, String(e.stack || e).slice(0, 600));
} finally {
  await browser.close();
  await post("admin/testmode", "action=off", token);
  restore();
}
