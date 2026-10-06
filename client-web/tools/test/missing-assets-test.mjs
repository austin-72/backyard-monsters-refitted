// 29 September (evening), the user's inferno-missing-assets.zip and inferno_juicer_v2.zip:
//  - the Monster Locker's shadow, damaged and destroyed art, drawn (and served) in each state
//  - the Monster Juicer's restyled art (v2) served, at its new offsets, in each state
//  - a building not unlocked yet (and not in the yard) shows its silhouette picture in the build menu (the pack's, or the two made here
//    for the Blast Tower and the Compound), not the live drawing; no menu picture is missing
//  - the monster popup pictures (popups/IC1-150.png ... IC8-150.png) and the pictures the Inferno quests point at
//    are served, as the pack has them; every Inferno quest's picture is there
//  - pictures are asked for as version 9 (pictures replaced under the same names)
//  - the kit pictures drawn again (drawing 3, the juicer's new art)
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir SERVER_DIR=... [PACK=dir of the unzipped pack] node tools/test/missing-assets-test.mjs
// A Monster Locker and a Juicer are added to the test yard (Under Hall 6) and taken out after; for the build menu the
// Under Hall is made level 1 in the game (so most buildings are locked), not saved.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const serverDir = process.env.SERVER_DIR || path.resolve("../server");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const md5 = (buf) => createHash("md5").update(buf).digest("hex");
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const keep = sql(`SELECT buildingdata->'0'->>'l' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const ADD = { 998008: { X: 300, Y: -300, t: 8 }, 998009: { X: -300, Y: -300, t: 9 } };
let patch = "buildingdata";
for (const [id, b] of Object.entries(ADD)) patch = `(${patch} || '{"${id}": {"X": ${b.X}, "Y": ${b.Y}, "t": ${b.t}, "id": ${id}, "l": 1}}'::jsonb)`;
sql(`UPDATE bym.save SET buildingdata = jsonb_set(${patch}, '{0,l}', '6') WHERE userid = ${uid} AND type = 'main'`);
const restore = () => { let q = "buildingdata"; for (const id of Object.keys(ADD)) q += ` - '${id}'`; sql(`UPDATE bym.save SET buildingdata = jsonb_set(${q}, '{0,l}', '${keep || 1}') WHERE userid = ${uid} AND type = 'main'`); };
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const asked = new Map();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { const u = r.url(); const m = u.match(/assets\/([^?]+)(\?[^#]*)?/); if (m) asked.set(m[1], [r.status(), m[2] || ""]); });
const g = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const settle = async () => { await wait(3000); for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(300); } };

const ASSETS = path.join(serverDir, "public", "assets");
const PACK = [
  ...["top.1.damaged.v2.png", "top.1.destroyed.v2.png", "shadow.1.v2.jpg", "shadow.1.damaged.v2.jpg", "shadow.1.destroyed.v2.jpg"].map((f) => `buildings/imonsterlab/${f}`),
  ...["bone_crusher.v2", "coal_producer.v2", "sulfur.v2", "magma_producer.v2", "sillo.v2", "monster_locker.v2", "hatchery.v2", "townhall_L1.v2", "coal_wall.v3", "sniper_tower.v2", "booby_trap.v2"].map((f) => `buildingbuttons/${f}.silhouette.jpg`),
  "buildingbuttons/inferno_monster_academy.silhouette.jpg",
  "buildingbuttons/townhall_L1.v2.jpg",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `popups/IC${i}-150.png`),
  ...["building-under_hall1", "building-under_hall2", "building-under_hall3", "building_inferno_academy", "building-magma_tower", "building-quake_tower"].map((f) => `popups/${f}.png`),
  ...[2, 3, 4, 5, 6, 7, 8].map((i) => `popups/inferno_monster${i}.png`),
  ...["anim.2.png", "top.2.png", "top.2.damaged.png", "top.2.destroyed.png", "shadow.2.jpg", "shadow.2.damaged.jpg", "shadow.2.destroyed.jpg"].map((f) => `buildings/imonsterjuiceloosener/${f}`),
];

try {
  // --- served, as the packs have them (compared with the unzipped packs when PACK is given)
  const served = [];
  for (const f of PACK) {
    const r = await fetch(`${server}assets/${f}?v=9`);
    const buf = Buffer.from(await r.arrayBuffer());
    let same = null;
    if (process.env.PACK) {
      const src = [path.join(process.env.PACK, "server/public/assets", f), path.join(process.env.PACK, "inferno_juicer_v2", f.replace("buildings/", ""))].find((p) => existsSync(p));
      same = src ? md5(readFileSync(src)) === md5(buf) : null;
    }
    served.push({ f, status: r.status, same });
  }
  check("every file of the two packs is served (and, given PACK, is the pack's)", served.every((s) => s.status === 200 && s.same !== false), JSON.stringify(served.filter((s) => s.status !== 200 || s.same === false)));

  // --- every Inferno quest's picture is there
  const quests = readFileSync(path.join(serverDir, "..", "client", "scripts", "INFERNO_QUESTS.as"), "utf8");
  const qimgs = [...new Set([...quests.matchAll(/"questimage":\s*"([^"]+)"/g)].map((m) => m[1]).filter(Boolean))];
  const qmissing = qimgs.filter((f) => !existsSync(path.join(ASSETS, "popups", f)));
  check("every picture the Inferno quests point at is there", qimgs.length >= 13 && qmissing.length === 0, JSON.stringify({ n: qimgs.length, qmissing }));

  // --- the kit pictures drawn again
  const kits = JSON.parse(readFileSync(path.join(ASSETS, "kits", "inferno-kits.json"), "utf8"));
  check("the kit pictures are drawn again with the juicer's new art (drawing 3)", Number(kits.pictures) >= 3, String(kits.pictures));

  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await settle();
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });
  const v = await g(() => window.__game.GLOBAL.ioVersioned("x.png"));
  check("pictures are asked for as version 9", /v=9/.test(v), v);

  // --- the Monster Locker and the Juicer in each state
  const building = (t) => `(() => { const B = window.__game.BASE; for (const k in B._buildingsAll) if (B._buildingsAll[k]._type === ${t}) return B._buildingsAll[k]; return null; })()`;
  // (the yard is drawn by the renderer, not the display list: pictures of the building's spot are compared)
  const shoot = async (t, name) => {
    const at = await g((B) => { const b = eval(B); const p = window.__game.MAP._GROUND.localToGlobal({ x: b._mc.x, y: b._mc.y }); return window.__player.stageToClient(p.x, p.y); }, building(t));
    const clip = { x: Math.round(at.x - 150), y: Math.round(at.y - 130), width: 300, height: 250 };
    if (process.env.DEBUG) console.log(name, JSON.stringify(at));
    return page.screenshot({ path: `${shots}/${name}.png`, clip });
  };
  const states = {};
  for (const [t, name] of [[8, "locker"], [9, "juicer"]]) {
    await g((B) => { const b = eval(B); window.__game.MAP.Focus(b._mc.x, b._mc.y); }, building(t));
    await wait(1500);
    states[name] = {};
    for (const st of ["", "damaged", "destroyed"]) {
      await g(([B, st]) => { const b = eval(B); const max = b._buildingProps.hp[0]; b.setHealth(st === "destroyed" ? 0 : st === "damaged" ? Math.round(max * 0.2) : max); b.Render(st); }, [building(t), st]);
      await wait(2000);
      states[name][st || "whole"] = md5(await shoot(t, `missing-${name}-${st || "whole"}`));
    }
    await g((B) => { const b = eval(B); b.setHealth(b._buildingProps.hp[0]); b.Render(""); }, building(t));
  }
  const differ = (o) => new Set(Object.values(o)).size === 3;
  const got = (f) => asked.get(f)?.[0] === 200 && /v=9/.test(asked.get(f)?.[1] || "");
  const lockerFiles = ["shadow.1.v2.jpg", "top.1.damaged.v2.png", "shadow.1.damaged.v2.jpg", "top.1.destroyed.v2.png", "shadow.1.destroyed.v2.jpg"].map((f) => `buildings/imonsterlab/${f}`);
  check("the Monster Locker draws its new shadow, damaged and destroyed art", lockerFiles.every(got) && differ(states.locker), JSON.stringify({ files: lockerFiles.map((f) => [f, asked.get(f)]), states: states.locker }));
  const juicer = await g((B) => { const d = eval(B)._buildingProps.imageData[1]; return [d.top[1].x, d.top[1].y, d.topdamaged[1].y, d.shadowdestroyed[1].y]; }, building(9));
  const juicerFiles = ["top.2.png", "shadow.2.jpg", "top.2.damaged.png", "top.2.destroyed.png"].map((f) => `buildings/imonsterjuiceloosener/${f}`);
  check("the Monster Juicer draws its restyled art at the new offsets", juicerFiles.every(got) && juicer.join() === "-46,-7,-7,5" && differ(states.juicer), JSON.stringify({ juicer, states: states.juicer }));

  // --- the build menu at Under Hall 1: the locked buildings show their silhouette pictures
  const menu = async (a, b, p) => { await g(([a, b, p]) => { const B = window.__classByName("BUILDINGS"); if (!B._open) B.Show(); B._mc.SwitchB(a, b, p); }, [a, b, p]); await wait(2500); };
  const buttons = () => g(() => {
    const B = window.__classByName("BUILDINGS"); const G = window.__game.GLOBAL; const BASE = window.__game.BASE;
    return B._mc._thumbnailsMC.$children.filter((c) => c._id).map((c) => { const p = G._buildingProps[c._id - 1]; const u = p.upgradeImgData; let lo = Infinity; for (const k in u || {}) if (!isNaN(+k)) lo = Math.min(lo, +k); const sil = u && u[lo] && u[lo].silhouette_img; let built = 0; for (const k in BASE._buildingsAll) if (BASE._buildingsAll[k]._type === c._id) built++; const locked = !!sil && built === 0 && !BASE.HasRequirements(p.costs[0]) && !p.rewarded; return { id: c._id, locked, sil: locked ? u.baseurl + sil : null, live: !!c.ioArt }; });
  });
  const hall = await g(() => { const h = window.__game.GLOBAL._bTownhall; const was = h._lvl.Get(); h._lvl.Set(1); return was; });
  const all = [];
  for (const [a, b, p] of [[1, 0, 0], [2, 0, 0], [2, 0, 1], [3, 0, 0], [3, 0, 1]]) {
    try { await menu(a, b, p); all.push(...(await buttons())); } catch (e) {}
    if (a === 1) await page.screenshot({ path: `${shots}/missing-menu-resources.png` });
    if (a === 3 && p === 0) await page.screenshot({ path: `${shots}/missing-menu-defensive.png` });
  }
  await g((lvl) => { const B = window.__classByName("BUILDINGS"); B.Hide(); window.__game.GLOBAL._bTownhall._lvl.Set(lvl); }, hall);
  const locked = all.filter((b) => b.locked);
  check("a building not unlocked yet shows its silhouette picture in the build menu (not the live drawing), and it is there", locked.length >= 5 && locked.every((b) => !b.live && asked.get(b.sil)?.[0] === 200), JSON.stringify(locked.map((b) => [b.id, b.sil, b.live, asked.get(b.sil)])));
  const missing = [...asked.entries()].filter(([u, [s]]) => s !== 200 && /^(buildingbuttons|buildings\/i|popups)\//.test(u));
  check("no picture the game asked for was missing", missing.length === 0, JSON.stringify(missing));

  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await browser.close();
}
