// 29 September (second afternoon round), the user's list:
//  - the padlock (lock-icon-assets.zip, the gold "overworld" one everywhere) on every monster not unlocked yet:
//    the Incubator, the Incubation Control Station, the Compound, the Academy and the Strongbox; a locked tile
//    drawn grey
//  - the Emberghoul's and Ashkarr's new pictures reach everyone: pictures are asked for with ?v=8 or later (assetVersion,
//    raised because pictures were replaced under the same names and caches kept the old ones)
//  - the map room: the cell information right of the map shows a tribe's large picture (the popup's small
//    picture is as it was)
//  - "Goo" reads "Magma" in the Monster Juicer and the Incubation Control Station
//  - the Academy lists Rezghul between King Wormzer and the Emberghoul too
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/locks-test.mjs
// An Incubator, Incubation Control Station, Academy, Strongbox and Juicer are added to the test yard (Under Hall 6)
// and taken out after.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const keep = sql(`SELECT buildingdata->'0'->>'l' FROM bym.save WHERE userid = ${uid} AND type = 'main'`);
const ADD = { 998013: { X: -420, Y: -300, t: 13 }, 998016: { X: -180, Y: -300, t: 16 }, 998026: { X: 60, Y: -300, t: 26 }, 998008: { X: 300, Y: -300, t: 8 }, 998009: { X: 300, Y: 60, t: 9 }, 998011: { X: -420, Y: 60, t: 11 } };
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
// every monster tile in a window: id, locked (the Strongbox says), padlock shown, grey
const LOCKS = `(() => { const L = window.__classByName("com.monsters.display::IoLockIcon"); return { L, locked: (id) => L.lockedMonster(id), marked: (t) => L.marked(t), grey: (t) => (t.filters || []).length > 0 }; })()`;

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await settle();
  await g(() => { try { window.__game.WMATTACK._enabled = false; } catch (e) {} });
  const building = (t) => `(() => { const B = window.__game.BASE; for (const k in B._buildingsAll) if (B._buildingsAll[k]._type === ${t}) return B._buildingsAll[k]; return null; })()`;

  // --- the Incubator
  const inc = await g(async ([B13, LOCKS]) => {
    const b = eval(B13), K = eval(LOCKS); const H = window.__classByName("HATCHERY"); H.Show(b); await new Promise((r) => setTimeout(r, 1500));
    const p = H._mc; const ids = window.__classByName("CREATURELOCKER").GetSortedCreatures(true).filter((c) => !c.blocked).map((c) => c.id);
    const tiles = p._monsterSlots.map((t, i) => ({ id: ids[i], locked: K.locked(ids[i]), marked: K.marked(t), grey: K.grey(t) }));
    return tiles;
  }, [building(13), LOCKS]);
  await page.screenshot({ path: `${shots}/locks-incubator.png` });
  const incLocked = inc.filter((t) => t.locked);
  check("the Incubator: a padlock on every monster not unlocked yet, and only on those (the tile grey)", incLocked.length > 0 && inc.every((t) => t.marked === t.locked && t.grey === t.locked), JSON.stringify(inc));
  const lockAsked = asked.get("ui/lock_icon@2x.png");
  check("  the gold padlock (the overworld's), served", lockAsked && lockAsked[0] === 200 && ![...asked.keys()].some((u) => /lock_icon_inferno/.test(u)), JSON.stringify([lockAsked, [...asked.keys()].filter((u) => /lock/i.test(u))]));
  await g(() => window.__classByName("HATCHERY").Hide());
  await wait(500);

  // --- the Incubation Control Station (and "Goo" is "Magma")
  const ics = await g(async (LOCKS) => {
    const K = eval(LOCKS); const H = window.__classByName("HATCHERYCC"); H.Show(); await new Promise((r) => setTimeout(r, 1500));
    const p = H._mc;
    const tiles = p._monsterSlots.map((s) => ({ id: s.id, locked: K.locked(s.id), marked: K.marked(s.mcMonster) }));
    return { tiles, goo: [p.tGooLabel.text, p.txtGoo.text] };
  }, LOCKS);
  await page.screenshot({ path: `${shots}/locks-ics.png` });
  check("the Incubation Control Station: the padlock on every locked monster, only those", ics.tiles.some((t) => t.locked) && ics.tiles.every((t) => t.marked === t.locked), JSON.stringify(ics.tiles));
  check("  it says Magma, not Goo", /Magma Usage/.test(ics.goo[0]) && /Magma/.test(ics.goo[1]) && !/Goo/.test(ics.goo.join(" ")), JSON.stringify(ics.goo));
  await g(() => window.__classByName("HATCHERYCC").Hide());
  await wait(500);

  // --- the Compound (and the juicer's words)
  const cmp = await g(async (LOCKS) => {
    const K = eval(LOCKS); window.__classByName("HOUSING").Show(); await new Promise((r) => setTimeout(r, 1500));
    const p = window.__classByName("HOUSING")._housingPopup; const out = [];
    for (const id in p._creatureData) { const row = p._creatureList["m" + id]; if (row) out.push({ id, locked: K.locked(id), marked: K.marked(row.mcIcon) }); }
    const k = window.__game.KEYS;
    return { rows: out, words: [k.Get("mh_juicemonstersX_btn", { v1: 2, v2: 90 }), k.Get("msg_juicegoo", { v1: 2, v2: 90 }), p.juicefooter_desc_txt ? p.juicefooter_desc_txt.text : ""] };
  }, LOCKS);
  await page.screenshot({ path: `${shots}/locks-compound.png` });
  check("the Compound: the padlock on every locked monster, only those", cmp.rows.some((r) => r.locked) && cmp.rows.every((r) => r.marked === r.locked), JSON.stringify(cmp.rows));
  check("  the Monster Juicer says Magma, not Goo", cmp.words.slice(0, 2).every((w) => /Magma/.test(w) && !/Goo/.test(w)), JSON.stringify(cmp.words));
  await g(() => window.__classByName("HOUSING").Hide());
  await wait(500);

  // --- the Academy: a locked monster's portrait; Rezghul's place
  const acad = await g(async ([B26, LOCKS]) => {
    const b = eval(B26), K = eval(LOCKS); const A = window.__classByName("ACADEMY"); A.Show(b); await new Promise((r) => setTimeout(r, 1500));
    const p = A._mc; const P = window.__classByName("ACADEMYPOPUP");
    const roster = []; for (let i = 1; i <= 16; i++) roster.push(P.pageID(i));
    const lockedId = roster.find((id) => id && K.locked(id)); const openId = roster.find((id) => id && !K.locked(id));
    const show = async (id) => { p.Setup(id); for (let i = 0; i < 30 && !(p._portraitImage && p._portraitImage.bitmapData && p._portraitImage.bitmapData.width > 1); i++) await new Promise((r) => setTimeout(r, 100)); await new Promise((r) => setTimeout(r, 300)); return K.marked(p._portraitImage); };
    return { roster, lockedId, lockedMarked: lockedId ? await show(lockedId) : null, openId, openMarked: openId ? await show(openId) : null };
  }, [building(26), LOCKS]);
  const k8 = acad.roster.indexOf("IC8");
  check("the Academy: a locked monster's portrait has the padlock, an unlocked one's not", acad.lockedMarked === true && acad.openMarked === false, JSON.stringify(acad));
  check("  and Rezghul is between King Wormzer and the Emberghoul there too", k8 >= 0 && acad.roster[k8 + 1] === "C19" && acad.roster[k8 + 2] === "IC20", acad.roster.join(","));
  await g(() => window.__classByName("ACADEMY").Hide());
  await wait(500);

  // --- the Strongbox: the rows and the portrait
  const box = await g(async (LOCKS) => {
    const K = eval(LOCKS); const C = window.__classByName("CREATURELOCKER"); C.Show(); await new Promise((r) => setTimeout(r, 1500));
    const p = C._mc; const rows = p._mcList.$children.map((r, i) => ({ id: p._tempCreatureList[i].id, text: r.tLabel.text.split("\r")[1], marked: K.marked(r.mcTick) }));
    const lockedId = rows.find((r) => /Locked/.test(r.text)); let portrait = null;
    if (lockedId) { p.ShowB(lockedId.id); for (let i = 0; i < 30 && !(p._portraitImage && p._portraitImage.bitmapData); i++) await new Promise((r) => setTimeout(r, 100)); await new Promise((r) => setTimeout(r, 300)); portrait = K.marked(p._portraitImage); }
    return { rows, portrait };
  }, LOCKS);
  await page.screenshot({ path: `${shots}/locks-strongbox.png` });
  check("the Strongbox: a padlock on every locked row (where an unlocked one's tick goes), and on a locked monster's portrait", box.rows.some((r) => r.marked) && box.rows.every((r) => r.marked === /Locked/.test(r.text)) && box.portrait === true, JSON.stringify(box));
  await g(() => window.__classByName("CREATURELOCKER").Hide());
  await wait(500);

  // --- the new pictures reach everyone
  const v = await g(() => window.__game.GLOBAL.ioVersioned("x.png"));
  const ic20 = [...asked.entries()].filter(([u]) => /^monsters\/IC(20|24)-|^popups\/IC(20|24)-/.test(u));
  const ver = Number((v.match(/v=(\d+)/) || [])[1]);
  check("pictures are asked for with the asset version, 8 or later (the Emberghoul's and Ashkarr's new pictures replace cached ones)", ver >= 8 && ic20.length > 0 && ic20.every(([, [s, q]]) => s === 200 && q === `?v=${ver}`), JSON.stringify({ v, ic20 }));

  // --- the map room: the cell information right of the map
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await wait(3000);
  const cell = await g(async () => {
    const mc = window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc; const img = mc.mcInfo.mcProfilePic.mcImage;
    while (img.numChildren) img.removeChildAt(0);
    mc.TribePic("Legionnaire"); await new Promise((r) => setTimeout(r, 1000));
    const B = window.__classByName("flash.display::Bitmap"); const bmp = img.$children.find((c) => c instanceof B);
    const r = mc.mcInfo.mcProfilePic.getBounds(mc);
    return { source: bmp ? bmp.bitmapData.height : 0, drawn: bmp ? Math.round(bmp.height) : 0, panel: [Math.round(r.width), Math.round(r.height)] };
  });
  await page.screenshot({ path: `${shots}/locks-map.png` });
  check("the map room's cell information (right of the map) shows a tribe's large picture (150 high, not 50)", cell.source === 150 && cell.drawn === 50 && cell.panel[0] > 100 && asked.get("popups/tribe_legionnaire.v2.png")?.[0] === 200, JSON.stringify(cell));
  await g(() => { try { window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc.Hide(); } catch (e) {} });
  await wait(2000);

  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
} finally {
  restore();
  await browser.close();
}
