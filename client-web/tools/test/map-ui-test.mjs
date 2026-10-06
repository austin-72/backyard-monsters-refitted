// The map room's own panels (client: com/monsters/maproom_advanced/MapRoomPopup.as, IoMapZoomControl.as,
// IoMapSidebar.as, IoMapMinimap.as, IoMapLod.as, IoMapShare.as; chat: com/monsters/chat/BYMChat.as, ChatBox.as;
// server: controllers/maproom/v2/saveBookmarks.ts).
//   EMAIL=... PASSWORD=... PGPASSWORD=... node tools/test/map-ui-test.mjs
// Needs an account with a Map Room 2 outpost (the map is opened from it), other players on its world and the
// chat server (and redis-cli: the lines it posts are taken out of the global chat's history again). Leaves the
// account's bookmarks empty. Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execSync(`psql -h ${process.env.DB_HOST || "localhost"} -U ${process.env.DB_USER || "postgres"} ${process.env.DB_NAME || "bymio"} -tAc "set search_path=bym,public; ${q.replace(/"/g, '\\"')}"`).toString().trim().split("\n").pop();
const email = process.env.EMAIL;
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const storedBookmarks = () => JSON.parse(sql(`select coalesce(bookmarks::text, '{}') from \"user\" where email = '${email}'`) || "{}");
sql(`update \"user\" set bookmarks = '{}' where email = '${email}'`);
// flingers, for the range on the world map: the main yard's at level 3, the outposts' at 2
const flingers = sql(`select string_agg(baseid || ':' || flinger, ',') from save where userid = (select userid from \"user\" where email = '${email}')`);
sql(`update save set flinger = case when type = 'main' then 3 else 2 end where userid = (select userid from \"user\" where email = '${email}')`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const MR = "com.monsters.maproom_advanced::MapRoom";
const SNAP = "com.monsters.maproom_advanced::IoMapSnapshot";
const FILTERS = "com.monsters.maproom_advanced::IoMapFilters";
const g = (fn, arg) => page.evaluate(fn, arg);
const findText = (label, exact = true) => g(([label, exact]) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && (exact ? o.text === label : o.text.indexOf(label) >= 0)) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, [label, exact]);
const clickText = async (label, wait = 600, exact = true) => { const p = await findText(label, exact); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
// a text in the sidebar only (the world map's legend has the same words)
const clickIn = async (root, label, wait = 600) => { const p = await g(([MR, root, label]) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && o.text === label) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__classByName(MR)._mc[root]); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, [MR, root, label]); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const clickSide = (label, wait = 600) => clickIn("_ioSidebar", label, wait);
const toClient = (path, x = 0, y = 0) => g(([MR, path, x, y]) => { let o = window.__classByName(MR)._mc; for (const k of path) o = o[k]; const p = o.localToGlobal({ x, y }); return window.__player.stageToClient(p.x, p.y); }, [MR, path, x, y]);
const state = () => g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc.ioViewCentre(); return { level: mc._ioZoom.level, lod: !!mc._ioLod, zoom: mc._ioLod ? mc._ioLod.zoom : 0, scale: mc._cellContainer.scaleX, centre: [c.x, c.y] }; }, MR);
const mapPoint = (x, y) => toClient(["mcMask"], x, y);

await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
await page.waitForTimeout(5000);
await page.mouse.click(857, 242); await page.waitForTimeout(600);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE.LoadNext(); });
await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
await page.waitForTimeout(3000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
await g(() => window.__game.GLOBAL.ShowMap());
await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
await page.waitForFunction((SNAP) => window.__classByName(SNAP).ready, SNAP, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i++) { if (!(await clickText("Continue", 500))) break; }

// ---- 1. the layout
const layout = await g((MR) => {
  const mc = window.__classByName(MR)._mc, z = mc._ioZoom;
  const fullScreenX = mc.mcFrame.x + mc.mcFrame.width - 80;
  const right = mc._ioRight, left = mc.mcFrame2, map = mc.mcFrame;
  return { zoomRight: z.x + z.width, fullScreenX, zoomTop: z.y, frameTop: mc.mcFrame.y, level: z.level, sidebar: !!mc._ioSidebar && mc._ioSidebar.visible, minimap: !!mc._ioMinimap && mc._ioMinimap.visible, coords: !!mc._ioCoords, info: mc.mcInfo.visible, oldBookmarks: mc.bBookmarks.visible,
    panel: right ? { size: [Math.round(right.width), Math.round(right.height)], leftSize: [Math.round(left.width), Math.round(left.height)], gapLeft: Math.round(map.x - (left.x + left.width)), gapRight: Math.round(right.x - (map.x + map.width)), middle: (left.x + right.x + right.width) / 2 } : null,
    minimapIn: right ? mc._ioMinimap.x > right.x && mc._ioMinimap.x + mc._ioMinimap.size < right.x + right.width : false, infoUnder: mc.mcInfo.y > mc._ioMinimap.y + mc._ioMinimap.size && mc.mcInfo.x >= right.x, homeAboveSearch: mc.bHome.y + mc.bHome.height <= mc._ioSidebar.y, addButton: !!mc._ioSidebar._addButton,
    homeJump: [Math.round(mc.bHome.x - mc._ioSidebar.x), Math.round(mc._ioSidebar.x + mc._ioSidebar._w - (mc.bJump.x + mc.bJump.width)), Math.round(mc.bJump.x - (mc.bHome.x + mc.bHome.width))],
    filters: mc._ioFilters ? Math.round(z.x - (mc._ioFilters.x + 26)) : -1 };
}, MR);
check("the zoom control is on the window's top edge, just left of the full screen button", layout.zoomRight <= layout.fullScreenX && layout.fullScreenX - layout.zoomRight < 20 && Math.abs(layout.zoomTop - layout.frameTop) < 16 && layout.level === 4, JSON.stringify(layout));
check("the sidebar, the minimap, the cell information and the coordinates are shown (no Bookmarks button, no Bookmark this spot)", layout.sidebar && layout.minimap && layout.coords && layout.info && !layout.oldBookmarks && !layout.addButton, JSON.stringify(layout));
const pn = layout.panel;
check("right of the map, a panel the size of the sidebar's, as far from the map; the window keeps its middle", !!pn && pn.size[0] === pn.leftSize[0] && pn.size[1] === pn.leftSize[1] && Math.abs(pn.gapLeft - pn.gapRight) <= 1 && Math.abs(pn.middle - 380) <= 1, JSON.stringify(pn));
check("the minimap at the top of that panel, the cell information under it; Home and Jump above the search, in the middle", layout.minimapIn && layout.infoUnder && layout.homeAboveSearch && Math.abs(layout.homeJump[0] - layout.homeJump[1]) <= 1 && layout.homeJump[2] > 0 && layout.homeJump[2] <= 10, JSON.stringify(layout));
check("the Filters button is left of the - button", layout.filters >= 0 && layout.filters <= 10, JSON.stringify(layout.filters));
const zoomArt = await g((MR) => { const z = window.__classByName(MR)._mc._ioZoom; const minus = z._minus.getChildAt(0), plus = z._plus.getChildAt(0); return { minus: minus.constructor.name, frames: [minus.currentFrame, plus.currentFrame], plusOn: z._plus.mouseEnabled, minusOn: z._minus.mouseEnabled }; }, MR);
check("the control uses the yard's zoom art (-, +); + is off at the closest step", zoomArt.frames[0] === 1 && zoomArt.frames[1] === 2 && !zoomArt.plusOn && zoomArt.minusOn, JSON.stringify(zoomArt));
let p = await mapPoint(300, 200);
await page.mouse.move(p.x, p.y); await page.waitForTimeout(400);
const coords = await g((MR) => window.__classByName(MR)._mc._ioCoordsText.text, MR);
check("the coordinates show just the place under the pointer (plain numbers, 0-399)", /^\d+, \d+$/.test(coords), JSON.stringify(coords));
const cellInfo = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc._ioPointer && mc.ioCellAt(mc._ioPointer.x, mc._ioPointer.y); return { location: mc.mcInfo.tLocation.text, owner: mc.mcInfo.tOwner.text, type: mc._ioInfoType.text, more: mc._ioInfoMore.text, base: c ? c._base : -1, level: c ? c._level : -1, pointer: mc._ioPointer ? [mc._ioPointer.x, mc._ioPointer.y] : null, pic: Math.round(mc.mcInfo.mcProfilePic.width) }; }, MR);
check("the cell information shows the place under the pointer: owner (level), its type under it, a big picture, nothing more", !!cellInfo.pointer && cellInfo.location === `${cellInfo.pointer[0]} x ${cellInfo.pointer[1]}` && cellInfo.type.length > 0 && (cellInfo.base < 1 || cellInfo.owner.indexOf(" (" + cellInfo.level + ")") > 0) && !/Value|Protected|From home|Height|range/.test(cellInfo.more) && cellInfo.pic >= 100, JSON.stringify(cellInfo));
await page.screenshot({ path: `${OUT}/mapui-close.png` });

// ---- 2. zoom: the wheel, towards the pointer, through all five steps
const under = () => g((MR) => { const mc = window.__classByName(MR)._mc; return mc._ioPointer ? [mc._ioPointer.x, mc._ioPointer.y] : null; }, MR);
p = await mapPoint(420, 120);
await page.mouse.move(p.x, p.y); await page.waitForTimeout(300);
const beforeCell = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc.ioCellNear(420, 120); return [c.x, c.y]; }, MR);
await page.mouse.wheel(0, 120); await page.waitForTimeout(900);
const farState = await state();
const afterCell = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc.ioCellNear(420, 120); return [c.x, c.y]; }, MR);
check("the wheel zooms out one step (Far), and the place under the pointer stays under it", farState.level === 3 && farState.scale < 1 && Math.abs(afterCell[0] - beforeCell[0]) <= 1 && Math.abs(afterCell[1] - beforeCell[1]) <= 1, JSON.stringify({ farState, beforeCell, afterCell }));
const names = [];
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(900); const st = await state(); names.push(st.level + ":" + st.zoom); }
const worldState = await state();
check("three more steps out: World 4x, World 2x, World (the whole world)", names.join("|") === "2:4|1:2|0:1" && worldState.lod && worldState.zoom === 1 && worldState.level === 0, JSON.stringify({ names, worldState }));
const minusOff = await g((MR) => !window.__classByName(MR)._mc._ioZoom._minus.mouseEnabled, MR);
await page.mouse.wheel(0, 120); await page.waitForTimeout(600);
check("- is off at the widest step, and the wheel stops there", minusOff && (await state()).level === 0);
const homeLod = await g((MR) => { const l = window.__classByName(MR)._mc._ioLod; const h = window.__game.GLOBAL._mapHome; const q = l.localToGlobal({ x: l._world.x + (h.x + 0.5) * l._scale, y: l._world.y + (h.y + 0.5) * l._scale }); return window.__player.stageToClient(q.x, q.y); }, MR);
await page.mouse.move(homeLod.x + 1, homeLod.y + 1); await page.waitForTimeout(500);
const lodInfo = await g((MR) => { const mc = window.__classByName(MR)._mc; return { owner: mc.mcInfo.tOwner.text, type: mc._ioInfoType.text, relation: mc._ioInfoRelation.visible ? mc._ioInfoRelation.text : "", alliance: mc.mcInfo.tAlliance.text, minimap: mc._ioMinimap.visible, me: window.__game.LOGIN._playerName }; }, MR);
check("on the world map, the cell information shows the yard under the pointer (and the minimap stays)", lodInfo.minimap && lodInfo.owner.indexOf(lodInfo.me + " (") === 0 && lodInfo.type === "Main Yard" && (lodInfo.alliance === "No alliance" ? lodInfo.relation === "" : lodInfo.relation.length > 0), JSON.stringify(lodInfo));
// the + button
const plusAt = await toClient(["_ioZoom", "_plus"], 13, 13);
await page.mouse.click(plusAt.x, plusAt.y); await page.waitForTimeout(800);
const w2 = await state();
check("the + button zooms in one step (World 2x)", w2.lod && w2.zoom === 2 && w2.level === 1, JSON.stringify(w2));

// ---- 3. the world map: dragging, the minimap, filters, range, bookmarks
const c0 = await state();
const dragFrom = await mapPoint(300, 220);
await page.mouse.move(dragFrom.x, dragFrom.y); await page.mouse.down();
await page.mouse.move(dragFrom.x - 60, dragFrom.y - 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(500);
const c1 = await state();
check("zoomed in, the world map is dragged to move around (and a drag is not a click)", c1.lod && (c1.centre[0] !== c0.centre[0] || c1.centre[1] !== c0.centre[1]) && c1.centre[0] >= c0.centre[0] && c1.centre[1] >= c0.centre[1], JSON.stringify({ c0: c0.centre, c1: c1.centre }));
const box = await g((MR) => { const mc = window.__classByName(MR)._mc, m = mc._ioMinimap, l = mc._ioLod; return { vx: m._vx, vy: m._vy, cx: l.centreX, cy: l.centreY, shown: m.visible }; }, MR);
check("the minimap's box follows the world map", box.shown && Math.abs(box.vx - box.cx) < 1 && Math.abs(box.vy - box.cy) < 1, JSON.stringify(box));
const mini = await toClient(["_ioMinimap", "_body"], 0, 0);
const miniSize = await g((MR) => window.__classByName(MR)._mc._ioMinimap._size, MR);
await page.mouse.click(mini.x + miniSize * 0.75, mini.y + miniSize * 0.25); await page.waitForTimeout(600);
const c2 = await state();
const edge = await g((MR) => { const l = window.__classByName(MR)._mc._ioLod; const was = [l.centreX, l.centreY]; l.centreOn(0, 0); const at = [l.centreX, l.centreY]; l.centreOn(was[0], was[1]); return at; }, MR);
check("the world map can be moved until its edges are in the middle of the view", edge[0] === 0 && edge[1] === 0, JSON.stringify(edge));
check("clicking the minimap moves the world map there", c2.centre[0] > 250 && c2.centre[1] < 150, JSON.stringify(c2.centre));
const filterAt = await toClient(["_ioFilters"], 13, 13);
await page.mouse.click(filterAt.x, filterAt.y); await page.waitForTimeout(600);
check("the Filters button opens the filters", await g((MR) => window.__classByName(MR)._mc._ioFilters.isOpen, MR));
const dots = () => g(([MR, SNAP]) => { const l = window.__classByName(MR)._mc._ioLod; const S = window.__classByName(SNAP); const U = window.__classByName("com.monsters.maproom_advanced::IoMapUi"); let hostile = 0, all = 0; for (const k of Object.keys(l._byKey)) { const c = l._byKey[k]; const pl = S.PlayerInfo(c[3]) || {}; all++; if (U.relation(c[3], pl.alliance | 0) === U.HOSTILE) hostile++; } return { all, hostile }; }, [MR, SNAP]);
const d0 = await dots();
await clickIn("_ioFilters", "Hostile", 700);
const d1 = await dots();
check("unticking Hostile takes the hostile players' yards off the world map", d0.hostile > 0 && d1.hostile === 0 && d1.all === d0.all - d0.hostile, JSON.stringify({ d0, d1 }));
await page.screenshot({ path: `${OUT}/mapui-filters.png` });
await clickIn("_ioFilters", "Hostile", 500);
await g((FILTERS) => window.__classByName(FILTERS).reset(), FILTERS);
await g((MR) => { const mc = window.__classByName(MR)._mc; mc._ioFilters.Close(); mc.ioFiltersChanged(); }, MR);
// the snapshot is made on the server's fixed 5-minute clock: wait (up to a little over one turn of it) for one
// made after the flingers were set (the yard the
// map was opened from saves its own flinger, none, when it loads: another one of the player's yards keeps 2)
await page.waitForFunction((SNAP) => { const S = window.__classByName(SNAP); if (S.cells.some((c) => c[3] === window.__game.LOGIN._playerID && c[2] >= 2 && c[6] > 0)) return true; if (!window.__asked || Date.now() - window.__asked > 5000) { window.__asked = Date.now(); S.Request(true); } return false; }, SNAP, { timeout: 330000, polling: 1000 }).catch(() => {});
await g((MR) => window.__classByName(MR)._mc._ioLod.Redraw(), MR);
const range = await g(([MR, SNAP]) => {
  const l = window.__classByName(MR)._mc._ioLod, S = window.__classByName(SNAP), me = window.__game.LOGIN._playerID;
  const yard = S.cells.find((c) => c[3] === me && c[2] >= 2 && c[6] > 0);
  const px = (x, y) => l._rangeData ? l._rangeData.getPixel32((x + 400) % 400, (y + 400) % 400) >>> 0 : 0;
  if (!yard) return { yard: null };
  // range 2 (an outpost's flinger level 2): two cells away is in, four is not
  return { yard: [yard[0], yard[1], yard[2], yard[6]], visible: l._range.visible, at: px(yard[0], yard[1]), two: px(yard[0] + 2, yard[1]), four: yard[2] === 3 ? px(yard[0] + 4, yard[1] + 4) : 0, far: px(yard[0] + 150, yard[1] + 150) };
}, [MR, SNAP]);
check("your flinger range is drawn on the world map (around your yards, as far as they reach)", !!range.yard && range.visible && range.at !== 0 && range.two !== 0 && range.four === 0 && range.far === 0, JSON.stringify(range));
await page.screenshot({ path: `${OUT}/mapui-world2x.png` });

// ---- 4. bookmarks: added from the sidebar, no limit, scrolling, rename, remove, saved on the server
await clickSide("Bookmarks", 500);
await g((MR) => { const mc = window.__classByName(MR)._mc; mc.ioZoomStep(1); mc.ioZoomStep(1); mc.ioZoomStep(1); mc.ioGoHome(); }, MR); // to the map (Far), at home
await page.waitForTimeout(1500);
const spotCell = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc._cells.find((c) => c._updated && c._base === 0 && c._water); if (!c) return null; c.ioClick(); return [c.X, c.Y]; }, MR);
await page.waitForTimeout(400);
await clickText("Bookmark", 700);
const nameField = await g((MR) => { const pop = window.__classByName(MR)._mc._popupBookmarkAdd; if (!pop.parent) return null; const r = pop.tName.getBounds(window.__player.stage); return { name: pop.tName.text, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) }; }, MR);
if (nameField) { await page.mouse.click(nameField.at.x, nameField.at.y); await page.keyboard.press("Control+A"); await page.keyboard.type("Rally point"); await clickText("Save", 1200); }
const added = await g((MR) => window.__classByName(MR)._bookmarks.map((b) => [b.name, b.location.x, b.location.y]), MR);
check("an empty place's Bookmark opens the usual bookmark popup (named where it is), and adds it", !!spotCell && !!nameField && nameField.name === `${spotCell[0]}, ${spotCell[1]}` && added.length === 1 && added[0][0] === "Rally point" && added[0][1] === spotCell[0] && added[0][2] === spotCell[1], JSON.stringify({ spotCell, nameField: nameField && nameField.name, added }));
await g((MR) => { const M = window.__classByName(MR); for (let i = 0; i < 14; i++) M.ioAddBookmarkAt(10 + i * 7, 20 + i * 5, "Spot " + (i + 2)); window.__classByName(MR)._mc._ioSidebar.Refresh(true); }, MR);
await page.waitForTimeout(2500); // fourteen changes at once: the saves go one after the other
const list = await g((MR) => { const s = window.__classByName(MR)._mc._ioSidebar; const pane = s._pane; const h = pane._contentH; pane.scrollTo(99999); const off = pane.offset; pane.scrollTo(0); return { count: window.__classByName(MR)._bookmarks.length, contentH: h, viewH: pane.viewHeight, scrolled: off }; }, MR);
let stored = storedBookmarks();
check("more than eight bookmarks (no limit), in a list that scrolls", list.count === 15 && list.contentH > list.viewH && list.scrolled > 0 && stored.mbms === 15 && stored.mbmn14 === "Spot 15", JSON.stringify({ list, mbms: stored.mbms }));
await page.screenshot({ path: `${OUT}/mapui-bookmarks.png` });
// rename the first one in the list
await g((MR) => { const s = window.__classByName(MR)._mc._ioSidebar; s._renaming = 0; s.Refresh(true); }, MR);
await page.waitForTimeout(300);
await page.keyboard.press("Control+A");
await page.keyboard.type("Muster");
await page.keyboard.press("Enter");
await page.waitForTimeout(1200);
stored = storedBookmarks();
const rowShape = await g((MR) => { const s = window.__classByName(MR)._mc._ioSidebar; const row = s._pane.content.getChildAt(2); const kids = []; for (let i = 0; i < row.numChildren; i++) { const c = row.getChildAt(i); kids.push({ text: c.text, y: Math.round(c.y), x: Math.round(c.x), visible: c.visible }); } return kids; }, MR);
check("each bookmark is two lines: the name, then where it is with rename and remove (always shown) on the right", rowShape.length === 4 && rowShape[0].text === "Muster" && /^\d+, \d+$/.test(rowShape[1].text) && rowShape[1].y > rowShape[0].y && rowShape[2].visible && rowShape[3].visible && rowShape[2].y >= rowShape[1].y - 3 && rowShape[2].x > rowShape[1].x + 40, JSON.stringify(rowShape));
check("a bookmark is renamed in place", stored.mbmn0 === "Muster" && (await g((MR) => window.__classByName(MR)._bookmarks[0].name, MR)) === "Muster", JSON.stringify(stored.mbmn0));
await g((MR) => { const s = window.__classByName(MR)._mc._ioSidebar; s._confirming = 1; s.Refresh(true); }, MR);
await page.waitForTimeout(300);
await clickText("Yes", 1200);
stored = storedBookmarks();
check("a bookmark is removed (after Yes), and the rest move up", stored.mbms === 14 && stored.mbmn1 === "Spot 3" && !("mbmn14" in stored), JSON.stringify({ mbms: stored.mbms, mbmn1: stored.mbmn1 }));
const bad = await g(async () => { const r = await fetch("/api/v1.7.3-beta/player/savebookmarks", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Bearer " + window.__game.LOGIN.token }, body: "bookmarks=" + encodeURIComponent(JSON.stringify({ evil: "<script>" })) }); return r.status; }).catch(() => -1);
check("the server refuses bookmarks that are not the game's form", bad === 400 && storedBookmarks().mbms === 14, String(bad));
// a click on a bookmark goes there
const target = await g((MR) => { const b = window.__classByName(MR)._bookmarks[2]; return [b.location.x, b.location.y, b.name]; }, MR);
await clickText(target[2], 1000);
const went = await state();
check("clicking a bookmark goes there", Math.abs(went.centre[0] - target[0]) <= 1 && Math.abs(went.centre[1] - target[1]) <= 1, JSON.stringify({ target, centre: went.centre }));
// on the world map, as pins
await g((MR) => { const mc = window.__classByName(MR)._mc; mc.ioZoomStep(-1); mc.ioZoomStep(-1); }, MR);
await page.waitForTimeout(800);
const pins = await g((MR) => { const l = window.__classByName(MR)._mc._ioLod; return { labels: l._pins.numChildren, zoom: l.zoom }; }, MR);
check("bookmarks show on the world map as pins, named when zoomed in", pins.zoom === 4 && pins.labels === 14, JSON.stringify(pins));
await page.screenshot({ path: `${OUT}/mapui-pins.png` });

// ---- 5. find a player
const someone = await g((SNAP) => { const S = window.__classByName(SNAP); for (const uid of Object.keys(S.players)) { const y = S.YardsOf(+uid); if (+uid !== window.__game.LOGIN._playerID && y && y.main && y.outposts.length > 0) return { uid: +uid, name: S.players[uid].name, main: y.main }; } return null; }, SNAP);
const box2 = await findText("Find a player");
await page.mouse.click(box2.x, box2.y); await page.waitForTimeout(300);
const part = someone.name.substr(0, Math.min(4, someone.name.length));
await page.keyboard.type(part); await page.waitForTimeout(600);
const results = await g(([MR, part]) => { const s = window.__classByName(MR)._mc._ioSidebar; return { shown: s._results.visible, rows: s._resultsPane ? s._resultsPane.content.getChildAt(0).numChildren : 0, first: s.matches()[0] && s.matches()[0].name, all: s.matches().every((m) => m.name.toLowerCase().indexOf(part.toLowerCase()) >= 0) }; }, [MR, part]);
check("typing part of a name lists the players who match", results.shown && results.rows > 0 && results.all, JSON.stringify({ part, results }));
await page.screenshot({ path: `${OUT}/mapui-search.png` });
await page.keyboard.press("Control+A"); await page.keyboard.type(someone.name); await page.waitForTimeout(500);
await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
const found = await state();
check("Enter goes to the player's main yard, on the map", !found.lod && Math.abs(found.centre[0] - someone.main[0]) <= 1 && Math.abs(found.centre[1] - someone.main[1]) <= 1, JSON.stringify({ someone, centre: found.centre }));
await page.mouse.click(box2.x, box2.y); await page.keyboard.press("Control+A"); await page.keyboard.type("zzzqx"); await page.waitForTimeout(500);
check("no match says so", !!(await findText("NOTHING FOUND")));
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
check("Escape clears the search", !(await g((MR) => window.__classByName(MR)._mc._ioSidebar._results.visible, MR)));

// ---- 6. the alliance tab
await clickSide("Alliance", 700);
const ally = await g(([MR, SNAP]) => { const S = window.__classByName(SNAP); const id = window.__classByName("com.monsters.alliances::ALLIANCES")._allianceID; const members = Object.values(S.players).filter((p) => (p.alliance | 0) === id).length; const s = window.__classByName(MR)._mc._ioSidebar; const rows = s._pane.content.numChildren; return { id, members, rows }; }, [MR, SNAP]);
const allyText = await g((MR) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__classByName(MR)._mc._ioSidebar._pane.content); return out.join(" | "); }, MR);
check("the alliance's members are listed without their outposts", !/outpost/.test(allyText), allyText.slice(0, 200));
check("the Alliance tab lists your alliance's members on this world", ally.id > 0 ? ally.rows >= ally.members + 2 : !!(await findText("You are not in an alliance.", false)), JSON.stringify(ally));
await page.screenshot({ path: `${OUT}/mapui-alliance.png` });

// ---- 7. sharing a place in chat, and opening it from chat
await page.waitForFunction(() => { const c = window.__game.Chat?._bymChat ?? window.__classByName("com.monsters.chat::Chat")._bymChat; return c && c._isConnected && c.sector_channel; }, null, { timeout: 30000 }).catch(() => {});
await g((MR) => window.__classByName(MR)._mc.ioZoomStep(1), MR); // Close
await page.waitForTimeout(800);
const lava = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc._cells.find((c) => c._updated && c._base === 0 && c._water && c.visible); if (!c) return null; const r = c.mc.mcHit.getBounds(window.__player.stage); return { X: c.X, Y: c.Y, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) }; }, MR);
let spot = false;
if (lava) {
  await g(([MR, X, Y]) => window.__classByName(MR)._mc.ioCellAt(X, Y).ioClick(), [MR, lava.X, lava.Y]);
  await page.waitForTimeout(400);
  spot = await g((MR) => !!window.__classByName(MR)._mc._ioSpot, MR);
}
check("clicking an empty place (lava) offers Share in chat and Bookmark", spot, JSON.stringify(lava));
await page.screenshot({ path: `${OUT}/mapui-spot.png` });
await clickText("Share in chat", 500);
const chooser = await g((MR) => { const c = window.__classByName(MR)._mc.getChildByName("ioShareChooser"); return c ? [c.getChildAt(2).getChildAt(0).text, c.getChildAt(3).getChildAt(0).text] : null; }, MR);
check("Share in chat asks: Global or Alliance", !!chooser && chooser[0] === "Global" && chooser[1] === "Alliance", JSON.stringify(chooser));
await page.screenshot({ path: `${OUT}/mapui-chooser.png` });
const sent = [];
page.on("websocket", (ws) => ws.on("framesent", (f) => { if (typeof f.payload === "string" && f.payload.indexOf("[map:") >= 0) sent.push(f.payload); }));
const chooserGlobal = await g(() => { const T = window.__classByName("flash.text::TextField"); let hit = null; const walk = (o) => { if (hit) return; if (o.name === "ioShareChooser") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const b = hit.getChildAt(2); const r = b.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
await g(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; c.chatBox.input.text = "come help:"; });
await page.mouse.click(chooserGlobal.x, chooserGlobal.y);
await page.waitForTimeout(2500);
const line = await g(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; const h = c.chatBox._chatHistory; const last = h[h.length - 1]; return last ? { text: last.txt.text, raw: last.msgData.msg } : null; });
const tag = await g((SNAP) => window.__classByName(SNAP).worldTag, SNAP);
check("the place goes to the chat after what was typed, and shows as coordinates", !!line && line.raw.indexOf(`come help: [map:${lava?.X},${lava?.Y}:${tag}]`) >= 0 && line.text.indexOf(`${lava?.X},\u00A0${lava?.Y}`) >= 0, JSON.stringify(line));
check("a note says where it went", !!(await findText("Posted to Global chat")));
await page.screenshot({ path: `${OUT}/mapui-chat.png` });
// from chat: go home first, then click the place's pill
await g((MR) => window.__classByName(MR)._mc.ioGoHome(), MR);
await page.waitForTimeout(800);
await g(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; try { c.chatBox.Scrollbar.ScrollTo(1, true); } catch (e) {} }); // the newest lines in view
await page.waitForTimeout(300);
const pill = await g(([X]) => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; const h = c.chatBox._chatHistory; const view = c.chatBox.background.mcMask.getBounds(window.__player.stage); for (let n = h.length - 1; n >= 0; n--) { const t = h[n].txt; const i = t.text.indexOf("\u00A0" + X + ","); /* (the pin's spaces, then the numbers) */ if (i < 0) continue; const b = t.getCharBoundaries(i + 1); const p = t.localToGlobal({ x: b.x + b.width / 2, y: b.y + b.height / 2 }); if (p.y > view.y + 2 && p.y < view.y + view.height - 2) return window.__player.stageToClient(p.x, p.y); } return null; }, [lava?.X]); // a line with the place that is in view
await page.mouse.click(pill.x, pill.y); await page.waitForTimeout(1200);
const opened = await state();
check("clicking the place in chat moves the map there", Math.abs(opened.centre[0] - lava.X) <= 1 && Math.abs(opened.centre[1] - lava.Y) <= 1, JSON.stringify({ to: [lava.X, lava.Y], centre: opened.centre }));
// a yard's popup has a Share button
const yard = await g((MR) => { const mc = window.__classByName(MR)._mc; const c = mc._cells.find((c) => c._updated && !c._ioSnap && c._base === 1 && c.visible); return c ? [c.X, c.Y] : null; }, MR);
if (yard) await g(([MR, X, Y]) => window.__classByName(MR)._mc.ioCellAt(X, Y).ioClick(), [MR, yard[0], yard[1]]);
await page.waitForTimeout(600);
check("a yard's popup has a Share this place in chat button", !!yard && !!(await findText("Share this place in chat")), JSON.stringify(yard));
await page.screenshot({ path: `${OUT}/mapui-popup-share.png` });
await g((MR) => { try { window.__classByName(MR)._mc.HideInfoEnemy(); } catch (e) {} }, MR);

// ---- 8. pinch, towards the fingers
await g((MR) => window.__classByName(MR).ioPinch(false, NaN, NaN), MR);
await page.waitForTimeout(700);
const pinch = await state();
check("pinching out steps the zoom out (MapRoom.ioPinch)", pinch.level === 3, JSON.stringify(pinch));

// ---- tidy up
sql(`update \"user\" set bookmarks = '{}' where email = '${email}'`);
// the shared places this test posted, out of the global chat's history (other chat tests read it)
try { execSync(`redis-cli -n ${process.env.REDIS_DB || "1"} EVAL "local n=0 for _,v in ipairs(redis.call('lrange',KEYS[1],0,-1)) do if string.find(v,'[map:',1,true) then n=n+redis.call('lrem',KEYS[1],0,v) end end return n" 1 ${process.env.CHAT_HISTORY_KEY || "history:chat:mr2-global"}`); } catch (e) {}
for (const pair of flingers.split(",")) { const [baseid, level] = pair.split(":"); sql(`update save set flinger = ${+level} where baseid = '${+baseid}'`); }
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
