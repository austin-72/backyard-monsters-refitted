// The Map Room 2 world snapshot and the world map (client: com/monsters/maproom_advanced/IoMapSnapshot.as,
// IoMapLod.as; server: /worldmapv2/mapdata, services/maproom/v2/bulk/worldSnapshot.ts).
//   EMAIL=... PASSWORD=... node tools/test/map-snapshot-test.mjs
// Needs an account with at least one Map Room 2 outpost (the map is opened from it: a main yard needs a
// working Map Room) and other players on its world. Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const requests = [];
page.on("request", (r) => { if (/worldmapv2\/(mapdata|getarea)/.test(r.url())) requests.push({ at: Date.now(), what: r.url().replace(/^.*\//, ""), body: r.postData() }); });
// getarea answers late (3 s), so what the map shows first can only come from the snapshot
let slowGetarea = true;
let failGetarea = 0;
const answered = [];
page.on("response", (r) => { if (/worldmapv2\/getarea/.test(r.url())) answered.push({ at: Date.now(), status: r.status() }); });
await page.route(/worldmapv2\/getarea/, async (route) => { if (failGetarea > 0) { failGetarea--; return route.abort("connectionreset"); } if (slowGetarea) await new Promise((r) => setTimeout(r, 3000)); route.continue(); });

const MR = "com.monsters.maproom_advanced::MapRoom";
const SNAP = "com.monsters.maproom_advanced::IoMapSnapshot";
const g = (fn, arg) => page.evaluate(fn, arg);
const findText = (label) => g((label) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && o.text === label) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, label);
const clickText = async (label, wait = 800) => { const p = await findText(label); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const grid = () => g((MR) => { const mc = window.__classByName(MR)._mc; const cells = mc._cells; return { n: cells.length, updated: cells.filter((c) => c._updated).length, snap: cells.filter((c) => c._updated && c._ioSnap).length, players: cells.filter((c) => c._base >= 2).length }; }, MR);

await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
await page.waitForTimeout(5000);
await page.mouse.click(857, 242); await page.waitForTimeout(600);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE.LoadNext(); });
await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
await page.waitForTimeout(3000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }

// ---- 1. the map opens with the whole world at once
requests.length = 0;
const t0 = Date.now();
await g(() => window.__game.GLOBAL.ShowMap());
await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
await page.waitForFunction((MR) => { const mc = window.__classByName(MR)._mc; return mc && mc._cells.every((c) => c._updated); }, MR, { timeout: 2500 }).catch(() => {});
const first = await grid();
const firstMs = Date.now() - t0;
check("the map asks for the world snapshot with its layers when it opens", requests.some((r) => r.what === "mapdata" && /layers=1/.test(r.body)), JSON.stringify(requests.slice(0, 3)));
check("every cell on screen is drawn before getarea answers (from the snapshot)", first.updated === first.n && first.snap === first.n && first.players > 0, JSON.stringify({ ...first, ms: firstMs }));
// the snapshot's cells, before getarea replaces them
const before = await g((MR) => { const mc = window.__classByName(MR)._mc; const out = {}; for (const c of mc._cells) if (c._ioShownData) out[c.X + "," + c.Y] = c._ioShownData; return JSON.parse(JSON.stringify(out)); }, MR);
for (let i = 0; i < 4; i++) { const c = await findText("Continue"); if (c) { await page.mouse.click(c.x, c.y); await page.waitForTimeout(500); } }

// ---- 2. a click on a yard known only from the snapshot waits for its zone
const target = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc._cells.find((c) => c._ioSnap && c._base >= 1 && !c._mine && c.visible); if (!c) return null; const p = c.mc.mcHit.localToGlobal({ x: 0, y: 0 }); const r = c.mc.mcHit.getBounds(window.__player.stage); return { X: c.X, Y: c.Y, base: c._base, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) }; }, MR);
let clickOk = false, clickDetail = "no snapshot cell on screen";
if (target) {
  await g(([MR, X, Y]) => { const cell = window.__classByName(MR)._mc.ioCellAt(X, Y); cell.Click(null); }, [MR, target.X, target.Y]);
  const shownAtOnce = await g((MR) => { const mc = window.__classByName(MR)._mc; return !!(mc._popupInfoEnemy && mc._popupInfoEnemy.parent); }, MR);
  await page.waitForFunction((MR) => { const mc = window.__classByName(MR)._mc; return !!(mc._popupInfoEnemy && mc._popupInfoEnemy.parent); }, MR, { timeout: 12000 }).catch(() => {});
  const shownLater = await g((MR) => { const mc = window.__classByName(MR)._mc; return !!(mc._popupInfoEnemy && mc._popupInfoEnemy.parent); }, MR);
  clickOk = !shownAtOnce && shownLater;
  clickDetail = JSON.stringify({ target: [target.X, target.Y, target.base], shownAtOnce, shownLater });
  await page.screenshot({ path: `${OUT}/snapshot-click.png` });
  await g((MR) => { const mc = window.__classByName(MR)._mc; try { mc.HideInfoEnemy(); } catch (e) {} }, MR);
  await page.waitForTimeout(500);
}
check("clicking a yard known only from the snapshot opens its popup once getarea has answered", clickOk, clickDetail);

// ---- 3. getarea then replaces the snapshot's cells, and says the same about them
await page.waitForFunction((MR) => window.__classByName(MR)._mc._cells.every((c) => !c._ioSnap), MR, { timeout: 20000 }).catch(() => {});
const after = await g((MR) => { const mc = window.__classByName(MR)._mc; const out = {}; for (const c of mc._cells) if (c._ioShownData) out[c.X + "," + c.Y] = c._ioShownData; return JSON.parse(JSON.stringify(out)); }, MR);
const settled = await grid();
check("getarea replaces the snapshot's cells on screen", settled.snap === 0, JSON.stringify(settled));
const fields = ["i", "b", "bid", "uid", "n", "l", "aid", "f", "c", "v", "dm", "d", "p"];
const differences = [];
let compared = 0;
for (const key of Object.keys(before)) {
  const a = before[key], b = after[key];
  if (!a || !b) continue;
  compared++;
  for (const f of fields) {
    const va = a[f] ?? (f === "aid" ? 0 : undefined), vb = b[f] ?? (f === "aid" ? 0 : undefined);
    // (the snapshot is up to 5 minutes old: a yard's empire value may have grown a little since)
    if (f === "v" && Number(va) > 0 && Math.abs(Number(va) - Number(vb)) / Number(va) < 0.02) continue;
    if (String(va ?? "") !== String(vb ?? "")) differences.push(`${key}.${f}: ${va} / ${vb}`);
  }
}
check("the snapshot's cells say what getarea says (terrain, yard, owner, tribe, level, damage...)", compared > 50 && differences.length === 0, `${compared} cells compared; ${differences.slice(0, 6).join("; ")}`);
const areaRequests = requests.filter((r) => r.what === "getarea");
const askedZones = areaRequests.flatMap((r) => { const z = /zones=([^&]*)/.exec(r.body); return z ? decodeURIComponent(z[1]).split(";") : [/x=(\d+)&y=(\d+)/.exec(r.body).slice(1).join(",")]; });
check("getarea asked only for the zones on screen, together in one request", askedZones.length <= 9 && areaRequests.length <= 2 && new Set(askedZones).size === askedZones.length, `${areaRequests.length} request(s): ${askedZones.join(" ")}`);
slowGetarea = false;

// ---- 4. the world map (the zoom control's widest steps)
const zoomSteps = async (dir, n) => { for (let i = 0; i < n; i++) { await g(([MR, dir]) => window.__classByName(MR)._mc.ioZoomStep(dir), [MR, dir]); await page.waitForTimeout(400); } };
check("the zoom control is on the window, showing the close view", await g((MR) => { const z = window.__classByName(MR)._mc._ioZoom; return !!z && z.level === 4 && !!z.parent; }, MR));
await zoomSteps(-1, 4);
await page.waitForTimeout(800);
const lod = await g(([MR, SNAP]) => { const mc = window.__classByName(MR)._mc, l = mc._ioLod, S = window.__classByName(SNAP); if (!l) return null; const yards = S.cells.filter((c) => c[2] >= 2).length; return { yards, dots: Object.keys(l._byKey).length, gridHidden: !mc._cellContainer.visible, zoom: l.zoom, level: mc._ioZoom.level, scale: l._scale, loadingShown: l._loading.visible }; }, [MR, SNAP]);
check("the world map shows every player yard and outpost as a dot (no wild monster yards)", !!lod && lod.dots === lod.yards && lod.yards > 0 && !lod.loadingShown, JSON.stringify(lod));
check("the cell grid is hidden and asks for nothing meanwhile", !!lod && lod.gridHidden && lod.zoom === 1 && lod.level === 0);
requests.length = 0;
await page.waitForTimeout(3000);
check("no getarea while the world map is shown", !requests.some((r) => r.what === "getarea"), requests.map((r) => r.what).join(","));
await page.screenshot({ path: `${OUT}/world-map.png` });
const lodPoint = (cx, cy) => g(([MR, cx, cy]) => { const l = window.__classByName(MR)._mc._ioLod; const p = l.localToGlobal({ x: l._world.x + cx * l._scale, y: l._world.y + cy * l._scale }); return window.__player.stageToClient(p.x, p.y); }, [MR, cx, cy]);
const homeCell = await g(() => ({ x: window.__game.GLOBAL._mapHome.x, y: window.__game.GLOBAL._mapHome.y }));
const home = await lodPoint(homeCell.x + 0.5, homeCell.y + 0.5);
await page.mouse.move(home.x + 1, home.y + 1); await page.waitForTimeout(500);
const tip = await g((MR) => { const l = window.__classByName(MR)._mc._ioLod; return l._tip.visible ? l._tipText.text : null; }, MR);
check("hovering your main yard names you with your level", !!tip && tip.indexOf("level") > 0 && /Main yard/.test(tip), JSON.stringify(tip));
await page.screenshot({ path: `${OUT}/world-map-hover.png` });
const far = await lodPoint(300.5, 300.5);
await page.mouse.click(far.x, far.y); await page.waitForTimeout(1500);
const back = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc.ioCentreCell(); return { lod: !!mc._ioLod, grid: mc._cellContainer.visible, level: mc._ioZoom.level, centre: [c.x, c.y] }; }, MR);
check("clicking the world map goes back to the map there", !back.lod && back.grid && back.level >= 3 && Math.abs(back.centre[0] - 300) <= 3 && Math.abs(back.centre[1] - 300) <= 3, JSON.stringify(back));
// pinch: out twice from the zoomed-out map reaches the world map (4x, then 2x), in twice comes back
await g(() => { const M = window.__classByName("com.monsters.maproom_advanced::MapRoom"); M.ioPinch(false); M.ioPinch(false); });
await page.waitForTimeout(800);
const pinchedOut = await g((MR) => { const mc = window.__classByName(MR)._mc; return !!mc._ioLod && mc._ioLod.zoom === 2; }, MR);
await g(() => { const M = window.__classByName("com.monsters.maproom_advanced::MapRoom"); M.ioPinch(true); M.ioPinch(true); });
await page.waitForTimeout(800);
const pinchedIn = await g((MR) => { const mc = window.__classByName(MR)._mc; return { lod: !!mc._ioLod, scale: mc._cellContainer.scaleX }; }, MR);
check("pinching out twice from the zoomed-out map shows the world map, pinching in twice comes back", pinchedOut && !pinchedIn.lod && pinchedIn.scale < 1, JSON.stringify({ pinchedOut, pinchedIn }));
await g(() => window.__classByName("com.monsters.maproom_advanced::MapRoom").ioPinch(true));
await page.waitForTimeout(500);

// ---- 5. the snapshot: not asked for again before the server's next (5 minutes at least), then asked for
//         again without the layers (the server's 5-minute clock, 2 October)
requests.length = 0;
await g((SNAP) => { const S = window.__classByName(SNAP); S._requestedAt = 0; }, SNAP);
await page.waitForTimeout(2500);
const early = requests.filter((r) => r.what === "mapdata");
check("the snapshot is not asked for again before the server's next one (5 minutes at least)", early.length === 0, JSON.stringify(early));
await g((SNAP) => { const S = window.__classByName(SNAP); S._requestedAt = 0; S._fetchedAt -= 400; S._dueAt = window.__game.GLOBAL.Timestamp() - 1; }, SNAP);
await page.waitForTimeout(2500);
const again = requests.filter((r) => r.what === "mapdata");
check("…then it is asked for again, without the world's layers", again.length === 1 && /layers=0/.test(again[0].body), JSON.stringify(again));
// ---- 6. a getarea that fails does not stop the map asking (the queue used to stay stuck on it)
failGetarea = 1;
answered.length = 0;
await g((MR) => { const M = window.__classByName(MR); M.ioClearCells(); for (const c of M._mc._cells) c._dataAge = 0; M._mc.Update(true); }, MR);
await page.waitForTimeout(6000);
check("after a getarea fails, the map asks again and gets its zones", failGetarea === 0 && answered.some((a) => a.status === 200), JSON.stringify(answered));
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
