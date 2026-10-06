// The changes of 29 September (afternoon), the user's list:
//  - the Emberghoul's and Ashkarr's new pictures (Strongbox and the rest) are served
//  - the outpost hall's animated Inferno art (buildings/ioutpost/, 24 frames that play)
//  - the build menu draws the Inferno's own art (IoMenuArt) where the buttons were the overworld's; towers that turn
//    follow the mouse; buildings that animate play (the Quake Tower drops once, then waits 4 s); the Cinder Coil and
//    Obsidian Mortar drawn at the scale of every other tower; the building window of those buildings too
//  - "Hatchery Control Center" is the "Incubation Control Station"
//  - the Monster Juicer juices Inferno monsters in the Inferno (the new, bigger juicer art)
//  - shapes of several style layers drawn layer by layer (no outline across the resource boxes' pictures or the
//    kit table)
//  - the kit table has a row for the Cinder Coil and Obsidian Mortar; the kit pictures are drawn again with the new art
//  - the map room's cell box uses the tribes' large pictures
//  - the chat shows its newest line (at the start, on a new line) and its tabs use the Quests title's font
//  - Rezghul listed between King Wormzer and the Emberghoul; the Incubation Control Station's list four across and
//    its description wider
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir SERVER_DIR=../server node tools/test/menu-art-test.mjs
// A General Store, Incubation Control Station and Monster Juicer are added to the test yard (Under Hall level 6)
// and taken out after; the yard's monsters and magma are put back.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const serverDir = resolve(process.env.SERVER_DIR || "../server");
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const outpost = sql(`SELECT baseid FROM bym.save WHERE userid = ${uid} AND type = 'outpost' ORDER BY baseid LIMIT 1`);
const saved = sql(`SELECT json_build_object('l', buildingdata->'0'->>'l', 'm', monsters, 'r', resources)::text FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const ADD = { 998012: { X: -420, Y: -300, t: 12 }, 998016: { X: -180, Y: -300, t: 16 }, 998009: { X: 60, Y: -300, t: 9 } };
let patch = "buildingdata";
for (const [id, b] of Object.entries(ADD)) patch = `(${patch} || '{"${id}": {"X": ${b.X}, "Y": ${b.Y}, "t": ${b.t}, "id": ${id}, "l": 1}}'::jsonb)`;
sql(`UPDATE bym.save SET buildingdata = jsonb_set(${patch}, '{0,l}', '6') WHERE userid = ${uid} AND type = 'main'`);
const restore = () => {
  const s = JSON.parse(saved);
  let q = "buildingdata"; for (const id of Object.keys(ADD)) q += ` - '${id}'`;
  sql(`UPDATE bym.save SET buildingdata = jsonb_set(${q}, '{0,l}', '${s.l || 1}'), monsters = '${JSON.stringify(s.m).replace(/'/g, "''")}'::jsonb, resources = '${JSON.stringify(s.r).replace(/'/g, "''")}'::jsonb WHERE userid = ${uid} AND type = 'main'`);
};
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const asked = new Map();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { const m = r.url().match(/assets\/([^?]+)/); if (m) asked.set(m[1], r.status()); });
const g = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const loaded = async (pred, timeout = 45000) => { const end = Date.now() + timeout; while (Date.now() < end) { try { if (await g(pred)) return true; } catch (e) {} await wait(400); } return false; };
const settle = async () => { await wait(3000); for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(300); } };
const fileBytes = (rel) => readFileSync(resolve(serverDir, "public/assets", rel));

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await settle();
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });

  // --- the new pictures
  const pics = [];
  for (const f of ["monsters/IC20-150.jpg", "monsters/IC20-medium.jpg", "monsters/IC24-150.jpg", "monsters/IC24-medium.jpg", "popups/IC20-150.png", "popups/IC24-150.png"]) {
    const r = await fetch(server + "assets/" + f); pics.push([f, r.status, Buffer.from(await r.arrayBuffer()).equals(fileBytes(f))]);
  }
  check("the Emberghoul's and Ashkarr's new pictures are served (Strongbox and lists)", pics.every(([, s, same]) => s === 200 && same), JSON.stringify(pics));

  // --- the name
  const names = await g(() => [window.__game.KEYS.Get("#b_hcc#"), window.__game.KEYS.Get("hcc_title")]);
  check('"Hatchery Control Center" is the "Incubation Control Station"', names[0] === "Incubation Control Station" && /INCUBATION CONTROL STATION/.test(names[1]), JSON.stringify(names));

  // --- the chat: the newest line in view; the tabs in the Quests font
  const chatAt = () => g(() => {
    const C = window.__classByName("com.monsters.chat::Chat")._bymChat; if (!C || !C.chatBox) return null;
    const box = C.chatBox; const hist = box._chatHistory; if (!hist || !hist.length) return { n: 0 };
    const last = hist[hist.length - 1]; const st = window.__player.stage;
    const lb = last.getBounds(st), mb = box.background.mcMask.getBounds(st);
    const tf = box._ioTabGlobal ? box._ioTabGlobal.getTextFormat(0, 1) : null;
    return { n: hist.length, lastBottom: Math.round(lb.y + lb.height), maskBottom: Math.round(mb.y + mb.height), maskTop: Math.round(mb.y), tall: box._shell.height > box.background.mcMask.height, font: tf && tf.font, embed: box._ioTabGlobal && box._ioTabGlobal.embedFonts };
  });
  await loaded(async () => true, 1);
  for (let i = 0; i < 14; i++) await g((i) => { const C = window.__classByName("com.monsters.chat::Chat")._bymChat; C.chatBox.push("test line " + i, null, null, "System", true); }, i);
  await wait(400);
  const chat = await chatAt();
  check("the chat shows its newest line (after lines arrive; history at the start goes the same way)", chat && chat.tall && Math.abs(chat.lastBottom - chat.maskBottom) <= 3, JSON.stringify(chat));
  check("  its Global / Alliance tabs use the Quests title's font (Groboldov)", chat && chat.font === "Groboldov" && chat.embed, JSON.stringify(chat));

  // --- monster order: Rezghul between King Wormzer and the Emberghoul
  const order = await g(() => window.__classByName("CREATURELOCKER").GetSortedCreatures(true).map((c) => c.id));
  const k = order.indexOf("IC8");
  check("Rezghul is listed between King Wormzer and the Emberghoul", k >= 0 && order[k + 1] === "C19" && order[k + 2] === "IC20", order.join(","));

  // --- the Incubation Control Station: four across, the description wider
  const ics = await g(() => {
    const H = window.__classByName("HATCHERYCC"); H.Show(); const p = H._mc; p.MonsterInfoB("IC20");
    const xs = [...new Set(p._monsterSlots.map((s) => Math.round(s.x)))].sort((a, b) => a - b);
    return { columns: xs.length, descWidth: Math.round(p.mcMonsterInfo.tDescription.width), infoX: Math.round(p.mcMonsterInfo.x), lines: p.mcMonsterInfo.tDescription.numLines, text: p.mcMonsterInfo.tDescription.textHeight, h: p.mcMonsterInfo.tDescription.height };
  });
  await wait(800);
  await page.screenshot({ path: `${shots}/menu-art-ics.png` });
  check("the Incubation Control Station's list is four across, its description a column wider and not cut off", ics.columns === 4 && ics.descWidth >= 190 && ics.text <= ics.h, JSON.stringify(ics));
  await g(() => window.__classByName("HATCHERYCC").Hide());

  // --- the Monster Juicer takes Inferno monsters in the Inferno
  const juice = await g(async () => {
    const G = window.__game.GLOBAL; const P = G.player; const id = "IC1";
    // two Fire Imps hatched into the Compound (as the Incubator does)
    const Hs = window.__classByName("HOUSING"); const Pt = window.__classByName("flash.geom::Point");
    for (let i = 0; i < 2; i++) Hs.HousingStore(id, new Pt(0, 0));
    await new Promise((r) => setTimeout(r, 300));
    if (!P.monsterListByID(id)) return { none: true };
    const before = P.monsterListByID(id).numCreeps;
    const r4 = G._resources.r4.Get();
    window.__classByName("HOUSING").Show();
    await new Promise((r) => setTimeout(r, 800));
    const H = window.__classByName("HOUSING")._housingPopup;
    const msgs = []; const M = window.__classByName("MESSAGE"); const top = G._layerTop;
    H.JuicerAdd(id)();
    for (const c of top.$children ?? []) if (c instanceof M) msgs.push(c);
    const listed = H._juiceList[id] | 0; const enabled = H.bJuice.Enabled;
    H.Juice();
    const after = P.monsterListByID(id).numCreeps;
    for (let i = 0; i < 60 && G._resources.r4.Get() <= r4; i++) await new Promise((r) => setTimeout(r, 500));
    return { id, juicer: !!G._bJuicer, listed, enabled, before, after, refused: msgs.length, magma: [r4, G._resources.r4.Get()] };
  });
  check("the Monster Juicer juices an Inferno monster in the Inferno (it goes, magma comes)", juice.juicer && juice.listed === 1 && juice.enabled && juice.refused === 0 && juice.after === juice.before - 1 && juice.magma[1] > juice.magma[0], JSON.stringify(juice));
  const juicer = await g(() => { const B = window.__game.BASE; for (const k in B._buildingsAll) { const b = B._buildingsAll[k]; if (b._type === 9) return { top: b._buildingProps.imageData[1].top[1].x, anim: b._animFrames }; } return null; });
  check("  in its new, bigger art", juicer && juicer.top === -46 && asked.get("buildings/imonsterjuiceloosener/top.2.png") === 200, JSON.stringify(juicer));

  // --- the build menu
  const menu = async (a, b, p) => { await g(([a, b, p]) => { const B = window.__classByName("BUILDINGS"); if (!B._open) B.Show(); B._mc.SwitchB(a, b, p); }, [a, b, p]); await wait(2500); };
  const buttons = () => g(() => { const B = window.__classByName("BUILDINGS"); return B._mc._thumbnailsMC.$children.filter((c) => c._id).map((c) => { const a = c.ioArt; const hold = a && a.$children[0]; const r = a && a.getBounds(c); return { id: c._id, art: !!a, ready: a ? a.ready : false, turns: a ? a.turns : false, animates: a ? a.animates : false, frame: a ? a.frame : -1, scale: hold ? +hold.scaleX.toFixed(2) : 0, h: r ? Math.round(r.height) : 0 }; }); });
  await menu(2, 0, 0);
  await page.screenshot({ path: `${shots}/menu-art-buildings.png` });
  const b2 = await buttons();
  await menu(2, 0, 1);
  b2.push(...(await buttons()));
  const overworld = [12, 16, 5, 51, 11, 10, 9];
  check("the build menu draws the Inferno's own art where its buttons were the overworld's (General Store, Incubation Control Station, Flinger, Catapult, Map Room, Yard Planner, Juicer)", overworld.every((id) => b2.find((b) => b.id === id && b.art && b.ready)), JSON.stringify(b2.filter((b) => overworld.includes(b.id))));
  const noOld = [...asked.keys()].filter((u) => /^buildingbuttons\/(12|16|5|51|11|10|9)\.jpg$/.test(u));
  check("  and no longer asks for their overworld pictures", noOld.length === 0, JSON.stringify(noOld));
  await menu(3, 0, 0);
  const b3 = await buttons();
  await page.screenshot({ path: `${shots}/menu-art-defensive.png` });
  const tower = async (id, dx) => {
    const at = await g((id) => { const B = window.__classByName("BUILDINGS"); const c = B._mc._thumbnailsMC.$children.find((c) => c._id === id); const p = c.ioArt.$children[0].localToGlobal({ x: 0, y: 0 }); return window.__player.stageToClient(p.x, p.y); }, id);
    await page.mouse.move(at.x + dx, at.y + 5); await wait(300);
    return g((id) => { const B = window.__classByName("BUILDINGS"); return B._mc._thumbnailsMC.$children.find((c) => c._id === id).ioArt.frame; }, id);
  };
  const turns = {};
  for (const id of [21, 130, 144, 145]) turns[id] = [await tower(id, 200), await tower(id, -200)];
  check("towers that turn follow the mouse (Sharpshooter, Blast Tower, Cinder Coil, Obsidian Mortar)", Object.values(turns).every(([r, l]) => r >= 0 && l >= 0 && r !== l), JSON.stringify(turns));
  // the Quake Tower: one drop (frames 0 to the last), then 4 s on the first frame
  const quake = await g(async () => {
    const B = window.__classByName("BUILDINGS"); const a = B._mc._thumbnailsMC.$children.find((c) => c._id === 129).ioArt;
    const seen = []; const t0 = performance.now();
    while (performance.now() - t0 < 7000) { seen.push([Math.round(performance.now() - t0), a.frame]); await new Promise((r) => setTimeout(r, 50)); }
    let restAt = -1, restEnd = -1;
    for (let i = 1; i < seen.length; i++) { if (seen[i][1] === 0 && seen[i - 1][1] > 20 && restAt < 0) restAt = seen[i][0]; if (restAt >= 0 && restEnd < 0 && seen[i][0] > restAt && seen[i][1] > 0) restEnd = seen[i][0]; }
    return { max: Math.max(...seen.map((s) => s[1])), restAt, restEnd, rest: restEnd - restAt };
  });
  check("the Quake Tower drops its hammer once, then waits about 4 s", quake.max >= 30 && quake.rest >= 3500 && quake.rest <= 4800, JSON.stringify(quake));
  const size = Object.fromEntries(b3.filter((b) => [21, 130, 144, 145, 129].includes(b.id)).map((b) => [b.id, [b.scale, b.h]]));
  // (the Sharpshooter, the tallest, a little smaller still to fit its button)
  check("the Cinder Coil and Obsidian Mortar are drawn at the scale of the other towers (no longer filling their buttons)", [130, 129, 144, 145].every((id) => size[id] && size[id][0] === 0.72) && size[21][0] <= 0.72, JSON.stringify(size));
  await menu(1, 0, 0);
  const b1 = await buttons();
  const f1 = b1.map((b) => b.frame);
  await wait(1200);
  const f2 = (await buttons()).map((b) => b.frame);
  check("buildings that animate play in the menu (the four generators)", b1.filter((b) => [1, 2, 3, 4].includes(b.id)).length >= 2 && b1.every((b, i) => ![1, 2, 3, 4].includes(b.id) || (b.animates && f1[i] !== f2[i])), JSON.stringify([b1.map((b) => [b.id, b.animates]), f1, f2]));
  // the building window of a building that had the overworld's picture
  await menu(2, 0, 0);
  const win = await g(async () => {
    const B = window.__classByName("BUILDINGS"); B._mc.ShowInfo(12); await new Promise((r) => setTimeout(r, 2500));
    const w = B._mc._buildingInfoMC; const A = window.__classByName("com.monsters.display::IoMenuArt");
    let art = null; const walk = (o) => { if (art) return; if (o instanceof A) { art = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(w);
    return { art: !!art, ready: art && art.ready };
  });
  await page.screenshot({ path: `${shots}/menu-art-window.png` });
  check("  and the building window shows the Inferno art too (General Store)", win.art && win.ready, JSON.stringify(win));
  await g(() => { const B = window.__classByName("BUILDINGS"); try { B._mc.HideInfo(); } catch (e) {} B.Hide(); });

  // --- the map room's cell box: the tribes' large pictures
  const tribe = await g(async () => {
    const T = window.__classByName("com.monsters.maproom_advanced::InfernoMapTheme"); const MC = window.__classByName("flash.display::MovieClip");
    const out = {};
    for (const name of ["Legionnaire", "Kozu", "Abunakki", "Dreadnaut", "Moloch"]) {
      const mc = new MC(); const ok = T.tribeCellPicture(name, mc);
      await new Promise((r) => setTimeout(r, 700));
      const bmp = mc.$children[1]; out[name] = [ok, bmp ? Math.round(bmp.height) : 0, bmp ? bmp.bitmapData.height : 0];
    }
    return out;
  });
  check("the map room's cell box uses each tribe's large picture (150 high), made 50 high", Object.values(tribe).every(([ok, h, src]) => ok && h === 50 && src === 150) && asked.get("popups/tribe_legionnaire.v2.png") === 200, JSON.stringify(tribe));

  // --- an outpost: the hall's animated art; the kit popup's table
  await g((b) => window.__game.BASE.LoadBase(null, 0, Number(b), "build", false, 1), outpost);
  await loaded(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading && window.__game.GLOBAL._loadmode === "build");
  await g(() => { const G = window.__game.GLOBAL; if (!G._currentCell) G._currentCell = { cellHeight: 100 }; });
  await settle();
  const hall = await g(async () => {
    const B = window.__game.BASE; let h = null; for (const k in B._buildingsAll) if (B._buildingsAll[k]._type === 112) h = B._buildingsAll[k];
    const t0 = h._animTick; await new Promise((r) => setTimeout(r, 1500));
    return { base: h._buildingProps.imageData.baseurl, frames: h._animFrames, loaded: h._animLoaded, moved: h._animTick !== t0 };
  });
  check("the outpost hall draws its animated Inferno art (brazier and banner, 24 frames, playing)", hall.base === "buildings/ioutpost/" && hall.frames === 24 && hall.loaded && hall.moved && asked.get("buildings/ioutpost/anim.1.png") === 200, JSON.stringify(hall));
  const kit = await g(async () => {
    const P = window.__classByName("popup_prefab"); const pop = new P(); window.__game.POPUPS.Push(pop); await new Promise((r) => setTimeout(r, 3000));
    const f = pop.tCol2.getTextFormat(0, 1);
    return { labels: pop.tCol1.text.split("\r").filter(Boolean), rows: pop._ioTable ? true : false, leading: +(f.leading || 0).toFixed(1), coil: pop.tCol2.text.split("\r")[2] };
  });
  await page.screenshot({ path: `${shots}/menu-art-kits.png` });
  check("the kit table has a row for the Cinder Coil and Obsidian Mortar (eleven rows, drawn to fit)", kit.labels.length === 11 && kit.labels[2] === "Coil/Mortar" && kit.labels.includes("Incubation CS") && kit.rows && Math.abs(kit.leading - 6.3) < 0.2, JSON.stringify(kit));
  const layered = await g(() => { let n = 0; const walk = (o) => { for (const c of o.$children ?? []) { if (c.$shapeDef && (c.$shapeDef.fills.some((f) => f.L !== undefined))) n++; walk(c); } }; walk(window.__game.GLOBAL._layerWindows); walk(window.__game.GLOBAL._layerTop); return n; });
  check("shapes of several style layers carry their layers (drawn in order: no outline over the kit table or the resource boxes)", layered > 0, String(layered));
  const kitFile = JSON.parse(fileBytes("kits/inferno-kits.json").toString());
  const pic = statSync(resolve(serverDir, "public/assets/kits/kit-1-large.png"));
  check("the kit pictures were drawn again with the new art at the server's start", kitFile.pictures >= 2 && pic.mtimeMs > Date.parse("2026-09-29T12:00:00Z"), JSON.stringify({ pictures: kitFile.pictures, drawn: new Date(pic.mtimeMs).toISOString() }));

  await g(() => { window.__game.GLOBAL._currentCell = null; window.__game.BASE.LoadBase(null, 0, window.__game.GLOBAL._homeBaseID, "build", false, 0); });
  await loaded(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isOutpost);
  await settle();
  const bad = errors.filter((e) => !/updateBuildingResources/.test(e)); // (the outpost opened without a map cell)
  check("no page errors", bad.length === 0, bad.slice(0, 4).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await browser.close();
}
