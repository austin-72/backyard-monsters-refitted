// The Outposts list (the top bar's "Next outpost" button): one row per outpost with position, value,
// production per hour, protection and monsters; sorting by any column; View opens that outpost; Map opens
// the world map on it. Needs an account with at least two outposts; with more than a screenful it also
// checks scrolling (only the rows in view exist, so it reads the list's own row records for that).
//   EMAIL=... PASSWORD=... node tools/test/outposts-test.mjs
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.click(857, 242); await page.waitForTimeout(800);
for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(500); }
await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
const at = (src) => page.evaluate((src) => { const o = eval(src); if (!o) return null; const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, src);
// the list's own text fields, top to bottom (rows are "X | Y | value | bone | coal | sulfur | magma | protected | monsters | View | Map")
const listTexts = () => page.evaluate(() => { const T = window.__classByName("flash.text::TextField"); const out = []; let root = null; const find = (o) => { if (root) return; if (o instanceof T && /^Outposts \(\d+\)$/.test(o.text)) { root = o.parent; return; } for (const c of o.$children ?? []) find(c); }; find(window.__player.stage); if (!root) return null; const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; });
const textAt = (label) => page.evaluate((label) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && o.text.replace(/ [▲▼]$/, "") === label && o.parent && o.parent.parent) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, label);
const rows = (t) => { const out = []; for (let i = 0; i < t.length; i++) if (/^(\d+|D\d)$/.test(t[i]) && /^(\d+|D\d)$/.test(t[i + 1])) { out.push(t.slice(i, i + 9)); i += 10; } return out; };
const known = await page.evaluate(() => window.__game.GLOBAL._mapOutpost.length);

const next = await at("window.__game.UI2._top.mc.mcOutposts.bNext");
await page.mouse.click(next.x, next.y); await page.waitForTimeout(2500);
let t = await listTexts();
await page.screenshot({ path: `${OUT}/outposts-list.png` });
check("the button opens the list", !!t, t ? t[0] : "");
const r0 = rows(t || []);
const listed = t ? parseInt(t[0].match(/\d+/)[0]) : 0;
check("one row per outpost", listed === known && known >= 2 && r0.length >= Math.min(known, 9) && r0.length <= known, `${listed} listed, ${r0.length} rows on screen, ${known} outposts`);
check("value and production in short form (1.3m, 43k)", r0.every((r) => /^(\d+(\.\d)?[kmb]?|\?)$/.test(r[2]) && r.slice(3, 7).every((v) => /^(\d+(\.\d)?[kmb]?|\?)$/.test(v))), JSON.stringify(r0[0]));
check("protection as time left or No", r0.every((r) => /^(No|(\d+d )?(\d+h )?\d+m|\d+d \d+h)$/.test(r[7])), r0.map((r) => r[7]).join(", "));
const num = (s) => (s === "?" ? -1 : parseFloat(s) * (s.endsWith("b") ? 1e9 : s.endsWith("m") ? 1e6 : s.endsWith("k") ? 1e3 : 1));
for (const [title, col, desc] of [["Value", 2, true], ["Bone/h", 3, true], ["Monsters", 8, true], ["X", 0, false], ["Y", 1, false]]) {
  const h = await textAt(title); await page.mouse.click(h.x, h.y); await page.waitForTimeout(600);
  const r = rows(await listTexts()), vals = r.map((x) => (col < 2 ? parseInt(x[col]) : num(x[col])));
  const sorted = vals.every((v, i) => i === 0 || (desc ? vals[i - 1] >= v : vals[i - 1] <= v));
  check(`sort by ${title}`, sorted, vals.join(", "));
}
for (let i = 0; i < 2; i++) { const h = await textAt("Value"); await page.mouse.click(h.x, h.y); await page.waitForTimeout(600); }
const again = rows(await listTexts()).map((x) => num(x[2]));
check("clicking the same title again reverses it", again.every((v, i) => i === 0 || again[i - 1] <= v), again.join(", "));

// a long list: the wheel moves three rows a step, the bar's handle goes to the end
const shown = () => page.evaluate(() => { const P = window.__classByName("com.monsters.maproom_advanced::IoOutpostsPopup")._open; return P._pool.filter((e) => e.line.visible).map((e) => e.index); });
if (known > 10) {
  await page.mouse.move(640, 380);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(80); }
  const wheel = await shown();
  check("the wheel scrolls the list", wheel[0] === 15, wheel.join(","));
  const thumb = await page.evaluate(() => { const P = window.__classByName("com.monsters.maproom_advanced::IoOutpostsPopup")._open; const r = P._thumb.getBounds(window.__player.stage), k = P._track.getBounds(window.__player.stage); return [window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2), window.__player.stageToClient(k.x + k.width / 2, k.y + k.height + 40)]; });
  await page.mouse.move(thumb[0].x, thumb[0].y); await page.mouse.down(); await page.mouse.move(thumb[1].x, thumb[1].y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  const end = await shown(), endRows = rows(await listTexts()).map((x) => num(x[2]));
  check("dragging the handle to the end shows the last outposts, still in order", end[end.length - 1] === known - 1 && endRows.every((v, i) => i === 0 || endRows[i - 1] <= v), `${end.join(",")} of ${known}`);
  const back = await textAt("Value"); await page.mouse.click(back.x, back.y); await page.waitForTimeout(400);
  check("sorting again goes back to the top", (await shown())[0] === 0);
}

// View the first row
const first = rows(await listTexts())[0];
const view = await textAt("View"); await page.mouse.click(view.x, view.y);
await page.waitForFunction(() => window.__game.BASE.isOutpost && !window.__game.BASE._loading, null, { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(4000);
const loaded = await page.evaluate(() => ({ outpost: window.__game.BASE.isOutpost, cell: window.__game.BASE._currentCellLoc && [window.__game.BASE._currentCellLoc.x, window.__game.BASE._currentCellLoc.y] }));
check("View opens that outpost", loaded.outpost && loaded.cell && loaded.cell[0] === parseInt(first[0]) && loaded.cell[1] === parseInt(first[1]), JSON.stringify([loaded, first.slice(0, 2)]));

// the list in that outpost marks it, and Map opens the map on a row
for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
const next2 = await at("window.__game.UI2._top.mc.mcOutposts.bNext");
await page.mouse.click(next2.x, next2.y); await page.waitForTimeout(2500);
t = await listTexts();
check("the outpost you are in is marked Here", !!t && t.includes("Here"));
const r1 = rows(t || []);
// a row other than the one you are in (the list opens scrolled to that one, second from the top)
const hereRow = (() => { let n = -1; for (let i = 0, k = 0; t && i < t.length; i++) if (/^(\d+|D\d)$/.test(t[i]) && /^(\d+|D\d)$/.test(t[i + 1])) { if (t[i + 9] === "Here") n = k; k++; i += 10; } return n; })();
const other = hereRow === 0 ? 1 : 0;
const target = r1[other];
const maps = await page.evaluate(() => { const T = window.__classByName("flash.text::TextField"); const out = []; const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text === "Map" && o.parent && o.parent.parent && o.parent.parent.parent) { const r = o.getBounds(window.__player.stage); out.push(window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2)); } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out.sort((a, b) => a.y - b.y); });
const rowMap = maps.filter((m) => m.y > 200 && m.y < 600)[other];
await page.mouse.click(rowMap.x, rowMap.y); await page.waitForTimeout(8000);
for (let i = 0; i < 6; i++) { const c = await textAt("Continue"); if (!c) break; await page.mouse.click(c.x, c.y); await page.waitForTimeout(600); }
await page.waitForTimeout(1500);
const centre = await page.evaluate(() => { const MP = window.__classByName("com.monsters.maproom_advanced::MapRoomPopup"), C = window.__classByName("com.monsters.maproom_advanced::MapRoomCell"); let pop = null; const walk = (o) => { if (pop) return; if (o instanceof MP) { pop = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!pop) return null; const m = pop.mcMask.getBounds(window.__player.stage), cx = m.x + m.width / 2, cy = m.y + m.height / 2; let best = null, bd = 1e9; const w = (o) => { if (o instanceof C) { const r = o.getBounds(window.__player.stage), d = Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy); if (d < bd) { bd = d; best = [o.X, o.Y]; } } for (const c of o.$children ?? []) w(c); }; w(pop); return best; });
await page.screenshot({ path: `${OUT}/outposts-map.png` });
check("Map opens the world map at that outpost", !!centre && Math.abs(centre[0] - parseInt(target[0])) <= 3 && Math.abs(centre[1] - parseInt(target[1])) <= 3, JSON.stringify([centre, target.slice(0, 2)]));
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
