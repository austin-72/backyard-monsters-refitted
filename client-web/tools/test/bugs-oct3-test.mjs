// Bug reports of 3 October (the Bugs tab, #60 and #61):
//  - #60 (Flash Player only): the Quest Book put a flag on a Sprite by name ("ioReady"); Flash Player refuses
//    that (Error #1056: a Sprite is sealed), the browser allows it. Ready quests and chests are now drawn on
//    MovieClips (dynamic), and no Inferno code reads or writes a made-up property by name on a sealed class
//    (checked over the whole AS3, without a server)
//  - #61: a bunker's range ring, due a quarter second after the mouse came over it, drawn after the yard had
//    gone (into an attack: no footprint layer). The same for towers and the Monster Baiter's twin (BUILDING22)
//  - the bug report's times from Flash Player read "9 2026 U": its toUTCString isn't the browser's
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/test/bugs-oct3-test.mjs
// Uses the account's quest book (one quest marked done for a moment: psql) and puts it back. Prints one line
// per check.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const server = process.env.SERVER || "http://localhost:3001/";
const DB = process.env.PGDATABASE || "bymio";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);

// ---- 1. sealed classes (#60): no made-up property by name on a Sprite, Shape, TextField ... or on a game class
// that isn't dynamic. (A typed write the compiler checks; one by name, obj["x"], it can't.)
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../client/scripts");
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".as")) files.push(p); } };
  walk(root);
  const sealed = new Set(["Sprite", "Shape", "TextField", "SimpleButton", "Bitmap", "BitmapData", "Point", "Rectangle", "Sound", "Loader", "Timer", "Matrix", "Stage", "DisplayObject", "DisplayObjectContainer", "InteractiveObject", "URLLoader", "TextFormat", "Graphics"]);
  const srcs = files.map((p) => [p, readFileSync(p, "utf8")]);
  for (const [, s] of srcs) for (const m of s.matchAll(/^\s*(?:public\s+|internal\s+)?(?:final\s+)?(dynamic\s+)?(?:final\s+)?class\s+(\w+)/gm)) if (!m[1]) sealed.add(m[2]);
  const hits = [];
  for (const [p, s] of srcs) {
    const types = {};
    for (const m of s.matchAll(/\b(\w+)\s*:\s*(\w+)/g)) (types[m[1]] ??= new Set()).add(m[2]);
    const own = (s.match(/class\s+(\w+)/) || [])[1];
    s.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/\b(\w+)\[\s*"(\w+)"\s*\]/g)) {
        const t = m[1] === "this" ? new Set([own]) : types[m[1]];
        // (declared ones are fine: CellData's "cell" and "range")
        if (t && t.size && [...t].every((x) => sealed.has(x)) && !new RegExp(`(var|function get)\\s+${m[2]}\\b`).test(srcs.find(([q]) => [...t].some((x) => q.endsWith("/" + x + ".as")))?.[1] || "")) hits.push(`${path.relative(root, p)}:${i + 1} ${m[1]}["${m[2]}"]`);
      }
    });
  }
  // (typed Sprite but made by CasinoUI.button, a MovieClip)
  const known = ["casino/games/AscentGame.as:"];
  const left = hits.filter((h) => !known.some((k) => h.includes(k)));
  check("no made-up property by name on a sealed class (Flash Player's Error #1056 / #1069)", left.length === 0, left.join(", "));
}

const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const sql = (q) => execSync(`psql -h localhost -U postgres -d ${DB} -tAc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const forced0 = sql(`SELECT COALESCE(forced::text, '') FROM bym.quest_progress WHERE userid = ${uid}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Flash Player's toUTCString ("Sat Oct 3 07:47:59 2026 UTC"), to show the report's times don't depend on it
  await page.addInitScript(() => { Date.prototype.toUTCString = function () { const d = this; const p = (n) => String(n).padStart(2, "0"); return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()} UTC`; }; });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  const g = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(`${server}?language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.LOGIN && window.__game.GLOBAL._apiURL, null, { timeout: 90000 });
  await page.waitForTimeout(3000);
  await g(([email, password]) => window.__game.LOGIN.AuthenticateUser([["email", email], ["password", password]]), [process.env.EMAIL, process.env.PASSWORD]);
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }

  // ---- 2. the report's times (Flash's toUTCString in place)
  await page.mouse.click(640, 500);
  await g(() => window.__game.GLOBAL.Message("bugs-oct3-test"));
  await page.waitForTimeout(500);
  const trail = await g(() => { const R = window.__classByName("com.monsters.debug::IoBugReport"); return R._clicks.concat(R._screens, R._requests); });
  check("the report's times are hh:mm:ss with Flash Player's dates", trail.length > 2 && trail.every((l) => /^\d\d:\d\d:\d\d /.test(l)), JSON.stringify(trail.slice(-2)));

  // ---- 3. range rings (#61)
  const kinds = await g(() => {
    const out = {};
    for (const b of window.__game.BASE.buildings) for (const k of ["HOUSINGBUNKER", "BTOWER", "BUILDING22"]) if (!out[k] && b instanceof window.__classByName(k) && b._lvl.Get() > 0 && b._countdownBuild.Get() === 0 && b._countdownUpgrade.Get() === 0 && b._countdownFortify.Get() === 0 && b.health > 0) out[k] = b._id;
    return out;
  });
  // (each one the yard has is tried: a yard with towers, a bunker and a BUILDING22 tries all three)
  check("the yard has a bunker or a tower to try", Object.keys(kinds).length > 0, JSON.stringify(kinds));
  const ringNow = (id) => g(async (id) => {
    const MAP = window.__game.MAP; const b = window.__game.BASE.buildings.find((x) => x._id === id);
    const n0 = MAP._BUILDINGFOOTPRINTS.numChildren;
    b.Over(null);
    await new Promise((r) => setTimeout(r, 600));
    const n1 = MAP._BUILDINGFOOTPRINTS.numChildren;
    b.Out(null);
    return n1 - n0;
  }, id);
  const ringGone = (id) => g(async (id) => {
    const MAP = window.__game.MAP; const b = window.__game.BASE.buildings.find((x) => x._id === id);
    b.Over(null);
    // the yard goes (as BASE does on the way to an attack) before the quarter second is up
    const layer = MAP._BUILDINGFOOTPRINTS;
    MAP._BUILDINGFOOTPRINTS = null;
    await new Promise((r) => setTimeout(r, 600));
    MAP._BUILDINGFOOTPRINTS = layer;
    b.Out(null);
    return "ok";
  }, id);
  for (const k of ["HOUSINGBUNKER", "BTOWER", "BUILDING22"]) {
    if (kinds[k] == null) continue;
    const e0 = errors.length;
    const drawn = await ringNow(kinds[k]);
    await ringGone(kinds[k]);
    await page.waitForTimeout(300);
    check(`${k}: its ring in the yard, and nothing once the yard has gone`, drawn >= 1 && errors.length === e0, `${drawn} ${errors.slice(e0).join("; ").slice(0, 200)}`);
  }

  // ---- 4. the Quest Book with a ready quest (#60): drawn on MovieClips, ioReady on them
  sql(`INSERT INTO bym.quest_progress (userid, forced) VALUES (${uid}, '{"b_win1": true}'::jsonb) ON CONFLICT (userid) DO UPDATE SET forced = COALESCE(bym.quest_progress.forced, '{}'::jsonb) || '{"b_win1": true}'::jsonb`);
  await g(() => window.__classByName("com.monsters.quests::IoQuests").refresh(true));
  await page.waitForTimeout(1500);
  await g(() => window.__classByName("com.monsters.quests::IoQuestBook").Show(null, "b_win1"));
  await page.waitForFunction(() => { const B = window.__classByName("com.monsters.quests::IoQuestBook")._open; return B && B._nodeSprites && B._nodeSprites.b_win1; }, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  const node = await g(() => { const MC = window.__classByName("flash.display::MovieClip"); const s = window.__classByName("com.monsters.quests::IoQuestBook")._open._nodeSprites.b_win1; return { mc: s instanceof MC, ready: s.ioReady === true }; });
  check("a ready quest on the tree: a MovieClip carrying ioReady", node.mc && node.ready, JSON.stringify(node));
  check("no page errors", errors.length === 0, errors.join("; ").slice(0, 300));
} finally {
  sql(forced0 ? `UPDATE bym.quest_progress SET forced = '${forced0}'::jsonb WHERE userid = ${uid}` : `UPDATE bym.quest_progress SET forced = '{}'::jsonb WHERE userid = ${uid}`);
  await browser.close();
}
