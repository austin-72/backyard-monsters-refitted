// 29 September (late), the assets that were missing, remade:
//  - the 24 quest-list icons (missionicon/, 40 x 32): served, and every Inferno quest's icon is there; the quest list
//    asks for nothing that is missing
//  - the Academy animates (while training) at level 1 (anim1.1, anim2.1) and level 2 (anim1.2, anim2.2) and has its damaged and
//    destroyed shadows at both levels
//  - the Magma Tower's destroyed shadow
//  - the Inferno Portal's level-4 shadow (the typo) and every other file the Inferno's buildings name is there
//  - Rezghul's projectile (monsters/projectiles/rezghul_projectile.png, 20 x 20)
//  - a yard with no tribe id (Moloch's Gauntlet's) is Moloch's, not the Brukkarg's (whose picture is missing)
//  - no picture asked for is missing; no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir SERVER_DIR=... node tools/test/remade-assets-test.mjs
// Two Academies (levels 1 and 2) and a Magma Tower are added to the test yard (Under Hall 6) and taken out after.
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
const scripts = path.join(serverDir, "..", "client", "scripts");
const ASSETS = path.join(serverDir, "public", "assets");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const md5 = (buf) => createHash("md5").update(buf).digest("hex");
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

// --- static: the icons, every file the Inferno's buildings name, the projectile
const quests = readFileSync(path.join(scripts, "INFERNO_QUESTS.as"), "utf8");
const icons = [...new Set([...quests.matchAll(/"questicon":\s*"([^"]+)"/g)].map((m) => m[1]).filter(Boolean))];
const iconInfo = icons.map((f) => { const p = path.join(ASSETS, "missionicon", f); return { f, there: existsSync(p), size: existsSync(p) ? pngSize(readFileSync(p)).join("x") : null }; });
check("every quest-list icon the Inferno quests name is there, 40 x 32", icons.length >= 25 && iconInfo.every((i) => i.there && i.size === "40x32"), JSON.stringify(iconInfo.filter((i) => !i.there || i.size !== "40x32")));
const props = readFileSync(path.join(scripts, "INFERNOYARDPROPS.as"), "utf8").replace(/\/\/[^\n]*/g, "");
const named = [];
for (const m of props.matchAll(/"baseurl":\s*"(buildings\/i[^"]*)"([\s\S]*?)(?="baseurl"|$)/g)) for (const f of m[2].slice(0, 6000).matchAll(/"([A-Za-z0-9_.@-]+\.(?:png|jpg))"/g)) named.push(m[1] + f[1]);
const gone = [...new Set(named)].filter((f) => !existsSync(path.join(ASSETS, f)));
check("every file the Inferno's buildings name is there (the Portal's level-4 shadow too)", named.includes("buildings/iportal/shadow.4.v2.jpg") && gone.length === 0, JSON.stringify(gone));

const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const keep = sql(`SELECT buildingdata->'0'->>'l' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const ADD = { 998026: { X: 300, Y: -300, t: 26, l: 1 }, 998126: { X: -300, Y: -300, t: 26, l: 2 }, 998132: { X: 300, Y: 60, t: 132, l: 1 } };
let patch = "buildingdata";
for (const [id, b] of Object.entries(ADD)) patch = `(${patch} || '{"${id}": {"X": ${b.X}, "Y": ${b.Y}, "t": ${b.t}, "id": ${id}, "l": ${b.l}}}'::jsonb)`;
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
const got = (f) => asked.get(f)?.[0] === 200;

try {
  const proj = await fetch(`${server}assets/monsters/projectiles/rezghul_projectile.png`);
  const pbuf = Buffer.from(await proj.arrayBuffer());
  check("Rezghul's projectile is served (20 x 20)", proj.status === 200 && pngSize(pbuf).join("x") === "20x20", `${proj.status} ${proj.status === 200 ? pngSize(pbuf) : ""}`);

  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await settle();
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });
  await wait(2000);
  const shownIcons = [...asked.keys()].filter((u) => u.startsWith("missionicon/"));
  check("the quest list shows its icons (none missing)", shownIcons.length > 0 && shownIcons.every(got), JSON.stringify(shownIcons.map((u) => [u, asked.get(u)[0]])));

  const tribe = await g(() => { const t = window.__classByName("com.monsters.ai::TRIBES").TribeForBaseID(0); return { name: t.name, pic: t.profilepic }; });
  const pic = await fetch(`${server}assets/${tribe.pic}`);
  check("a yard with no tribe id (Moloch's Gauntlet's) is Moloch's, with his picture (not the Brukkarg's, whose picture is missing)", /Moloch/.test(tribe.name) && pic.status === 200, JSON.stringify({ ...tribe, status: pic.status }));

  const building = (id) => `(() => { const B = window.__game.BASE; for (const k in B._buildingsAll) if (B._buildingsAll[k]._id === ${id}) return B._buildingsAll[k]; return null; })()`;
  const shoot = async (id, name) => {
    const at = await g((B) => { const b = eval(B); const p = window.__game.MAP._GROUND.localToGlobal({ x: b._mc.x, y: b._mc.y }); return window.__player.stageToClient(p.x, p.y); }, building(id));
    return page.screenshot({ path: `${shots}/${name}.png`, clip: { x: Math.round(at.x - 150), y: Math.round(at.y - 170), width: 300, height: 260 } });
  };
  const states = {};
  for (const [id, name] of [[998026, "academy1"], [998126, "academy2"], [998132, "magmatower"]]) {
    // (the Academy animates while it trains a monster, as in the original game; a real training, with its
    // time, since the Academy drops a "training" mark that has no training behind it; not saved)
    await g((B) => {
      const b = eval(B), G = window.__game; G.MAP.Focus(b._mc.x, b._mc.y - 30);
      if (b._type === 26) {
        const up = G.GLOBAL.player.m_upgrades, S = window.__classByName("com.cc.utils::SecNum");
        G.BASE._blockSave = true; window.__ioSavedIC1 = up.IC1;
        up.IC1 = { level: (up.IC1 && up.IC1.level) || 1, time: new S(G.GLOBAL.Timestamp() + 3600) };
        b._upgrading = "IC1";
      }
    }, building(id));
    await wait(2000);
    states[name] = {};
    states[name].whole = md5(await shoot(id, `remade-${name}-whole`));
    await wait(700);
    states[name].later = md5(await shoot(id, `remade-${name}-later`));
    for (const st of ["damaged", "destroyed"]) {
      await g(([B, st]) => { const b = eval(B); const max = b._buildingProps.hp[b._lvl.Get() - 1]; b.setHealth(st === "destroyed" ? 0 : Math.round(max * 0.2)); b.Render(st); }, [building(id), st]);
      await wait(2000);
      states[name][st] = md5(await shoot(id, `remade-${name}-${st}`));
    }
    await g((B) => { const b = eval(B), G = window.__game; if (b._type === 26) { const up = G.GLOBAL.player.m_upgrades; if (window.__ioSavedIC1) up.IC1 = window.__ioSavedIC1; else delete up.IC1; b._upgrading = null; G.BASE._blockSave = false; } b.setHealth(b._buildingProps.hp[b._lvl.Get() - 1]); b.Render(""); }, building(id));
  }
  const acad = (lvl, files) => files.map((f) => `buildings/iacademy/${f}`).every(got) && states[`academy${lvl}`].whole !== states[`academy${lvl}`].later && new Set([states[`academy${lvl}`].whole, states[`academy${lvl}`].damaged, states[`academy${lvl}`].destroyed]).size === 3;
  check("the Academy animates while training at level 1 and has its damaged and destroyed shadows", acad(1, ["anim1.1.png", "anim2.1.png", "shadow.1.damaged.jpg", "shadow.1.destroyed.jpg"]), JSON.stringify(states.academy1));
  check("the Academy animates while training at level 2 and has its damaged and destroyed shadows", acad(2, ["anim1.2.png", "anim2.2.png", "shadow.2.damaged.jpg", "shadow.2.destroyed.jpg"]), JSON.stringify(states.academy2));
  check("the Magma Tower has its destroyed shadow", got("buildings/imagmatower/shadow.1.destroyed.v2.jpg"), JSON.stringify(asked.get("buildings/imagmatower/shadow.1.destroyed.v2.jpg")));

  const missing = [...asked.entries()].filter(([, [s]]) => s >= 400);
  check("no picture the game asked for was missing", missing.length === 0, JSON.stringify(missing));
  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await browser.close();
}
