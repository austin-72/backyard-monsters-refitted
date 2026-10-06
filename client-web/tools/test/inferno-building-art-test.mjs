// The Inferno's own art for six buildings that used the overworld's (27 September, the user's
// inferno_building_assets.zip): the General Store (12), Hatchery Control Center (16), Flinger (5, levels
// 1-4), Catapult (51, levels 1-3), Map Room (11) and Monster Juicer (9, with its churning anim strip).
//  - each draws from its new folder (buildings/i...) at every level, whole, damaged and destroyed
//  - every picture it asks for is served (no 404), and each state is drawn (the top has pixels)
//  - the Juicer's anim strip loads (51 frames)
//  - and the damaged and destroyed pictures that were missing (27 September, second round): the Bone
//    Cruncher's and Coal Extractor's from level 3, and the Magma Tower's damaged turret and base strips
//  - the Yard Planner's own Inferno art (27 September, third round: the user's inferno_yardplanner.zip)
//  - the four resource generators' art for each level band (29 September, the user's
//    inferno_resource_generators.zip): levels 1-2, 3-5, 6-9 and 10 of the Bone Cruncher, Coal and Sulfur
//    Extractors and Magma Extractor, each whole, damaged and destroyed, each tier from its own strip, and
//    every picture of the pack asked for and served
//  - no page errors
//   EMAIL=... PASSWORD=... SHOTS=dir [PGPASSWORD=...] node tools/test/inferno-building-art-test.mjs
// They are added to the test yard in the database and taken out after (the Under Hall made level 6
// and put back); the yard is not saved. Writes SHOTS/art-<building>.png, one picture per level and state.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
// [type, name, folder, levels to show, where]
const SET = [
  [12, "General Store", "igeneralstore", [1], [-420, -300]],
  [16, "Hatchery Control Center", "ihatcherycontrolcenter", [1], [-180, -300]],
  [11, "Map Room", "imaproom", [1], [60, -300]],
  [9, "Monster Juicer", "imonsterjuiceloosener", [1], [300, -300]],
  [5, "Flinger", "iflinger", [1, 2, 3, 4], [-420, 260]],
  [51, "Catapult", "icatapult", [1, 2, 3], [-150, 260]],
  [10, "Yard Planner", "iyardplanner", [1], [620, 280]],
  [1, "Bone Cruncher", "iboneharvester", [1, 3, 6, 10], [120, 260]],
  [2, "Coal Extractor", "icoalproducer", [1, 3, 6, 10], [360, 260]],
  [132, "Magma Tower", "imagmatower", [1], [540, -40]],
  [3, "Sulfur Extractor", "isulpherproducer", [1, 3, 6, 10], [-300, -20]],
  [4, "Magma Extractor", "imagmaproducer", [1, 3, 6, 10], [-540, 40]],
];
// each generator's level bands: the anim strip and its frames (the pack: 6-9 and 10 new for all four, 3-5 new for Magma)
const BANDS = {
  1: { 1: ["anim.1.v2.png", 47], 3: ["anim.2.png", 50], 6: ["anim.3.png", 50], 10: ["anim.4.png", 50] },
  2: { 1: ["anim.1.v2.png", 47], 3: ["anim.1.2.png", 45], 6: ["anim.3.png", 45], 10: ["anim.4.png", 45] },
  3: { 1: ["anim.1.v2.png", 51], 3: ["anim1.2.png", 45], 6: ["anim.3.png", 45], 10: ["anim.4.png", 45] },
  4: { 1: ["anim.1.v2.png", 49], 3: ["anim.2.v3.png", 49], 6: ["anim.3.png", 49], 10: ["anim.4.png", 49] },
};
const PACK = {
  iboneharvester: ["anim.3.png", "anim.4.png", "shadow.3.destroyed.jpg", "shadow.3.jpg", "shadow.4.destroyed.jpg", "shadow.4.jpg", "top.3.damaged.png", "top.3.destroyed.png", "top.3.png", "top.4.damaged.png", "top.4.destroyed.png", "top.4.png"],
  icoalproducer: ["anim.3.png", "anim.4.png", "shadow.3.damaged.jpg", "shadow.3.destroyed.jpg", "shadow.3.jpg", "shadow.4.damaged.jpg", "shadow.4.destroyed.jpg", "shadow.4.jpg", "top.3.damaged.png", "top.3.destroyed.png", "top.3.png", "top.4.damaged.png", "top.4.destroyed.png", "top.4.png"],
  isulpherproducer: ["anim.3.png", "anim.4.png", "shadow.3.damaged.jpg", "shadow.3.destroyed.jpg", "shadow.3.jpg", "shadow.4.damaged.jpg", "shadow.4.destroyed.jpg", "shadow.4.jpg", "top.3.damaged.png", "top.3.destroyed.png", "top.3.png", "top.4.damaged.png", "top.4.destroyed.png", "top.4.png"],
  imagmaproducer: ["anim.2.v3.png", "anim.3.png", "anim.4.png", "shadow.2.v3.damaged.jpg", "shadow.2.v3.destroyed.jpg", "shadow.2.v3.jpg", "shadow.3.damaged.jpg", "shadow.3.destroyed.jpg", "shadow.3.jpg", "shadow.4.damaged.jpg", "shadow.4.destroyed.jpg", "shadow.4.jpg", "top.2.v3.damaged.png", "top.2.v3.destroyed.png", "top.2.v3.png", "top.3.damaged.png", "top.3.destroyed.png", "top.3.png", "top.4.damaged.png", "top.4.destroyed.png", "top.4.png"],
};
const ART = SET.slice(0, 7); // the seven with new art (the Bone Cruncher, Coal Extractor and Magma Tower only had pictures missing; the generators are checked on their own below)
const ID = (t) => 998000 + t;
const add = (t, x, y, l) => `'{"${ID(t)}": {"X": ${x}, "Y": ${y}, "t": ${t}, "id": ${ID(t)}, "l": ${l}}}'::jsonb`;
const keep = sql(`SELECT buildingdata->'0'->>'l' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
let patch = "COALESCE(buildingdata, '{}'::jsonb)";
for (const [t, , , lv, [x, y]] of SET) patch += ` || ${add(t, x, y, lv[lv.length - 1])}`;
sql(`UPDATE bym.save SET buildingdata = jsonb_set(${patch}, '{0,l}', '6') WHERE userid = ${uid} AND type = 'main'`);
const restore = () => {
  let q = "buildingdata"; for (const [t] of SET) q += ` - '${ID(t)}'`;
  sql(`UPDATE bym.save SET buildingdata = jsonb_set(${q}, '{0,l}', '${keep || 1}'), buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb)${SET.map(([t]) => ` - '${ID(t)}'`).join("")} WHERE userid = ${uid} AND type = 'main'`);
};
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const asked = new Map();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { const u = r.url(); const m = u.match(/assets\/(buildings\/[^?]+)/); if (m) asked.set(m[1], r.status()); });
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; try { window.__game.WMATTACK._enabled = false; } catch (e) {} });
  const found = await g((ids) => { const B = window.__game.BASE; const out = {}; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; if (ids.includes(Number(b._id))) out[b._type] = { lvl: b._lvl.Get(), base: b._buildingProps.imageData.baseurl }; } return out; }, SET.map(([t]) => ID(t)));
  check(`the ${SET.length} are in the yard, each with its Inferno folder`, SET.every(([t, , f]) => found[t] && found[t].base === `buildings/${f}/`), JSON.stringify(found));

  const results = [];
  for (const [t, name, folder, levels] of SET) {
    const tiles = [];
    for (const lvl of levels) {
      for (const state of ["", "damaged", "destroyed"]) {
        const r = await g(async ([id, lvl, state]) => {
          const B = window.__game.BASE; let b = null; for (const k in B._buildingsAll) if (Number(B._buildingsAll[k]._id) === id) b = B._buildingsAll[k];
          b._lvl.Set(lvl);
          b.setHealth(state === "" ? b.maxHealth : state === "damaged" ? Math.max(1, b.maxHealth * 0.3) : 0);
          b.Render(state);
          const M = window.__classByName("MAP"); M._autoScroll = false; M.FocusTo(b._mc.x, b._mc.y, 0.01);
          // (waits for the top, and for the anim strip when the tier has one: the strips are the big pictures)
          const wantsAnim = () => { const im = b._buildingProps.imageData; let t = 0; for (const k in im) if (Number(k) <= lvl && Number(k) > t) t = Number(k); return !!(t && im[t]["anim" + (b._renderState || "")]); };
          for (let i = 0; i < 100; i++) { await new Promise((r) => setTimeout(r, 50)); const top = b._rasterData && b._rasterData[2]; if (top && top.data && top.data.width && (!wantsAnim() || b._animLoaded)) break; }
          await new Promise((r) => setTimeout(r, 400));
          const top = b._rasterData && b._rasterData[2];
          let px = 0; if (top && top.data && top.data.getPixel32) { const d = top.data; for (let y = 0; y < d.height; y += 3) for (let x = 0; x < d.width; x += 3) if ((d.getPixel32(x, y) >>> 24) > 100) px++; }
          // (the renderer draws the building; its clip is not on the stage, the map's ground layer is)
          const p = M._GROUND.localToGlobal({ x: b._mc.x, y: b._mc.y }); const c = window.__player.stageToClient(p.x, p.y);
          // the anim strip the building took for this level (its tier: the highest imageData key at or under it)
          const im = b._buildingProps.imageData; let tier = 0; for (const k in im) if (Number(k) <= lvl && Number(k) > tier) tier = Number(k);
          const key = "anim" + (b._renderState || ""); const strip = tier && im[tier][key] ? im[tier][key][0] : "";
          return { state: b._renderState, lvl: b._lvl.Get(), px, at: c, anim: b._animLoaded ? b._animFrames : 0, anim2: b._anim2Loaded ? b._anim2Frames : 0, tier, strip };
        }, [ID(t), lvl, state]);
        await page.waitForTimeout(250);
        const clip = { x: Math.max(0, Math.round(r.at.x - 110)), y: Math.max(0, Math.round(r.at.y - 130)), width: 220, height: 220 };
        const buf = await page.screenshot({ clip });
        tiles.push({ lvl, state: state || "whole", buf: buf.toString("base64"), r });
        results.push({ t, name, lvl, want: state || "whole", got: r.state, gotLvl: r.lvl, px: r.px, anim: r.anim, anim2: r.anim2, tier: r.tier, strip: r.strip });
      }
    }
    // one picture per building: its levels down, whole / damaged / destroyed across
    const html = `<body style="margin:0;background:#222;font:12px sans-serif;color:#eee"><div style="padding:6px 8px;font-weight:bold">${name} (${folder})</div><div style="display:grid;grid-template-columns:repeat(3,220px);gap:4px;padding:4px">${tiles.map((x) => `<div><div>L${x.lvl} ${x.state}</div><img src="data:image/png;base64,${x.buf}"></div>`).join("")}</div></body>`;
    const sheet = await browser.newPage({ viewport: { width: 3 * 224 + 8, height: 60 + Math.ceil(tiles.length / 3) * 240 } });
    await sheet.setContent(html); await sheet.screenshot({ path: `${shots}/art-${folder}.png`, fullPage: true }); await sheet.close();
  }
  const drawn = (r) => r.px >= 20 || (r.px > 0 && r.anim > 0); // (a small top over an anim strip, as the Coal Extractor from level 3)
  check("every level and state is drawn (the top picture has pixels, or a small top over its anim strip)", results.length === 3 * SET.reduce((n, x) => n + x[3].length, 0) && results.every(drawn), JSON.stringify(results.filter((r) => !drawn(r)).map((r) => [r.name, r.lvl, r.want, r.px])) + ` (${results.length} drawn)`);
  check("each is at the level and in the state asked for (whole, damaged, destroyed)", results.every((r) => r.gotLvl === r.lvl && r.got === (r.want === "whole" ? "" : r.want)), JSON.stringify(results.filter((r) => r.gotLvl !== r.lvl || r.got !== (r.want === "whole" ? "" : r.want)).map((r) => [r.name, r.lvl, r.want, r.got, r.gotLvl])));
  const mine = [...asked.entries()].filter(([u]) => ART.some(([, , f]) => u.startsWith(`buildings/${f}/`)));
  const old = [...asked.entries()].filter(([u]) => /^buildings\/(generalstore|hatcherycontrolcenter|flinger|catapult|maproom|monsterjuiceloosener|yardplanner)\//.test(u));
  check("every picture they ask for is served from the new folders", mine.length >= 40 && mine.every(([, s]) => s === 200), JSON.stringify(mine.filter(([, s]) => s !== 200)) + ` (${mine.length} pictures)`);
  check("none of them asks for the overworld art", old.length === 0, JSON.stringify(old));
  const juicer = results.find((r) => r.t === 9 && r.want === "whole");
  check("the Monster Juicer's churning strip loads (51 frames)", juicer && juicer.anim === 51, JSON.stringify(juicer && juicer.anim));
  const need = ["buildings/iboneharvester/top.2.damaged.png", "buildings/iboneharvester/top.2.destroyed.png", "buildings/icoalproducer/shadow.2.destroyed.jpg", "buildings/imagmatower/anim.1.damaged.v2.png", "buildings/imagmatower/anim.2.damaged.v2.png"];
  check("the pictures that were missing are asked for and served (Bone Cruncher, Coal Extractor, Magma Tower)", need.every((u) => asked.get(u) === 200), JSON.stringify(need.map((u) => [u, asked.get(u)])));
  const magma = results.find((r) => r.t === 132 && r.want === "damaged");
  check("a damaged Magma Tower shows both its damaged strips (the turret's 31 frames and the base's)", magma && magma.got === "damaged" && magma.anim === 31 && magma.anim2 === 31, JSON.stringify(magma));
  const gens = results.filter((r) => BANDS[r.t] && r.want === "whole");
  const band = (r) => BANDS[r.t][r.tier] || [];
  check("each generator draws each level band (1, 3, 6, 10) from its own anim strip, all its frames loaded", gens.length === 16 && gens.every((r) => r.tier === r.lvl && r.strip === band(r)[0] && r.anim === band(r)[1]), JSON.stringify(gens.filter((r) => r.tier !== r.lvl || r.strip !== band(r)[0] || r.anim !== band(r)[1]).map((r) => [r.name, r.lvl, r.tier, r.strip, r.anim])));
  check("each generator's four bands look different (whole, damaged and destroyed)", [1, 2, 3, 4].every((t) => ["whole", "damaged", "destroyed"].every((w) => new Set(results.filter((r) => r.t === t && r.want === w).map((r) => r.px)).size >= 3)), JSON.stringify(results.filter((r) => BANDS[r.t]).map((r) => [r.t, r.lvl, r.want, r.px])));
  const pack = Object.entries(PACK).flatMap(([f, list]) => list.map((n) => `buildings/${f}/${n}`));
  check("every picture of the generators' art pack is asked for and served", pack.every((u) => asked.get(u) === 200), JSON.stringify(pack.filter((u) => asked.get(u) !== 200).map((u) => [u, asked.get(u)])) + ` (${pack.length} pictures)`);
  const bone = ["shadow.2.damaged.jpg", "shadow.2.destroyed.jpg", "shadow.3.damaged.jpg", "shadow.4.damaged.jpg"].map((n) => `buildings/iboneharvester/${n}`);
  check("the Bone Cruncher's made shadows are drawn (damaged 3-5, 6-9 and 10, destroyed 3-5)", results.filter((r) => r.t === 1 && r.lvl === 3).length === 3 && bone.every((u) => asked.get(u) === 200), JSON.stringify(bone.map((u) => [u, asked.get(u)])));
  const missing = [...asked.entries()].filter(([u, st]) => SET.some(([, , f]) => u.startsWith(`buildings/${f}/`)) && st !== 200);
  check("nothing any of them asks for is missing", missing.length === 0, JSON.stringify(missing));
  check("no page errors", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await browser.close();
}
