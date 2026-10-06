// The Depths of Hell (4 October): the underworld renamed, its portals on the zoomed-out world map and the minimap
// as light purple dots, and any portal open to go down and look.
//   EMAIL3=<a player on the world map> PASSWORD=... node tools/test/depths-test.mjs
// Checks:
//  - the world snapshot's fixed layers carry the portals (mapdata layers=1)
//  - the minimap shows a light purple dot at each portal
//  - the world map (zoomed right out) shows them too, with "Portal to the Depths of Hell" in its legend and on hover
//  - a click on a portal's dot there goes down: the map shows the Depths of Hell at that portal's end
//  - a portal no yard of the player reaches: its bubble still offers "Enter the Depths of Hell", which works; the
//    cells down there are not in range (looking only)
//  - the banner, the coordinates and the bubble say "Depths of Hell"; its numbers go 0-9 (the world above 0-399, no minus)
//  - at the island's edge the lava round it draws at the island's own level, with the Depths' lava pictures (all 9)
// Nothing is saved.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 600)}`);
const login = async (who) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(who)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const MRN = "com.monsters.maproom_advanced::MapRoom", UW = "com.monsters.maproom_advanced::IoUnderworld";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const isPurple = ([r, g, b]) => r > 175 && g > 145 && b > 215 && b > g + 25 && r > g; // 0xD7B8FF and its smoothing
try {
  const token = await login(process.env.EMAIL3);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE._blockSave = true; });
  // the map's first-visit popups ("Increased Range"...): Continue until there are none
  const dismiss = async () => {
    for (let i = 0; i < 10; i++) {
      const at = await g(() => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o || !o.visible) return; if (o instanceof T && /^Continue$/.test(o.text.trim())) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
      if (!at) return;
      await page.mouse.click(at.x, at.y);
      await page.waitForTimeout(500);
    }
  };
  // the colours round a point of the page, read from the canvas
  const coloursAt = (x, y, r = 2) => g(([x, y, r]) => {
    const c = document.querySelector("canvas"), ctx = c.getContext("2d", { willReadFrequently: true });
    const rect = c.getBoundingClientRect(), sx = c.width / rect.width, sy = c.height / rect.height;
    const d = ctx.getImageData(Math.round((x - rect.left) * sx) - r, Math.round((y - rect.top) * sy) - r, r * 2 + 1, r * 2 + 1).data;
    const out = []; for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]); return out;
  }, [x, y, r]);

  // ---- the snapshot's layers
  const layers = await g(async () => {
    const r = await new Promise((res) => new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL._mapURL + "mapdata", [["layers", 1]], (x) => res(x), () => res(null)));
    return r && r.static ? { portals: r.static.portals } : null;
  });
  check("the world snapshot's fixed layers carry the portals", layers && Array.isArray(layers.portals) && layers.portals.length >= 8 && layers.portals.every((p) => p.length === 4 && p[2] >= 500 && p[2] < 510), JSON.stringify(layers && layers.portals));
  const portals = layers ? layers.portals : [];

  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await dismiss();
  await page.waitForFunction((MRN) => { const mc = window.__classByName(MRN)._mc; return mc && mc._ioMinimap && window.__classByName("com.monsters.maproom_advanced::IoMapSnapshot").ready; }, MRN, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // ---- the minimap
  const mini = await g(([MRN, UW, portals]) => {
    const mc = window.__classByName(MRN)._mc, m = mc._ioMinimap, S = window.__classByName("com.monsters.maproom_advanced::IoMapSnapshot");
    if (!m) return null;
    const scale = m.size / Math.max(S.width, S.height);
    return { known: window.__classByName(UW).portals.length, at: portals.map((p) => { const q = m._body.localToGlobal(new (window.__classByName("flash.geom::Point"))((p[0] + 0.5) * scale, (p[1] + 0.5) * scale)); return window.__player.stageToClient(q.x, q.y); }) };
  }, [MRN, UW, portals]);
  let miniPurple = 0;
  const miniSeen = [];
  for (const p of mini ? mini.at : []) { const c = await coloursAt(p.x, p.y, 1); miniSeen.push(c[4]); if (c.some(isPurple)) miniPurple++; }
  check("the minimap shows each portal as a light purple dot", mini && mini.known === portals.length && miniPurple === portals.length, JSON.stringify({ known: mini && mini.known, purple: miniPurple, of: portals.length, at: mini && mini.at.slice(0, 2), seen: miniSeen.slice(0, 3) }));
  await page.screenshot({ path: `${shots}/depths-minimap.png` });

  // ---- the world map, zoomed right out
  await g((MRN) => window.__classByName(MRN)._mc.ioEnterLod(1), MRN);
  await page.waitForTimeout(2500);
  const lod = await g(([MRN, portals]) => {
    const l = window.__classByName(MRN)._mc._ioLod;
    if (!l) return null;
    const PT = window.__classByName("flash.geom::Point");
    const T = window.__classByName("flash.text::TextField"); const legend = []; const walk = (o) => { if (o instanceof T) legend.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(l._legend);
    return { legend, at: portals.map((p) => { const q = l.localToGlobal(new PT(l._world.x + (p[0] + 0.5) * l._scale, l._world.y + (p[1] + 0.5) * l._scale)); return window.__player.stageToClient(q.x, q.y); }) };
  }, [MRN, portals]);
  let lodPurple = 0;
  for (const p of lod ? lod.at : []) if ((await coloursAt(p.x, p.y, 1)).some(isPurple)) lodPurple++;
  check("the world map (zoomed right out) shows each portal as a light purple dot, and its legend names them", lod && lodPurple === portals.length && lod.legend.includes("Portal to the Depths of Hell"), JSON.stringify({ purple: lodPurple, of: portals.length, legend: lod && lod.legend }));
  await page.screenshot({ path: `${shots}/depths-worldmap.png` });
  const target = portals[0];
  await page.mouse.move(lod.at[0].x, lod.at[0].y);
  await page.waitForTimeout(400);
  const tip = await g((MRN) => { const l = window.__classByName(MRN)._mc._ioLod; return l._tip.visible ? l._tipText.text : null; }, MRN);
  check("...hovering one says what it is", /Portal to the Depths of Hell/.test(tip || "") && /Click to go down/.test(tip || ""), JSON.stringify(tip));
  await page.mouse.click(lod.at[0].x, lod.at[0].y);
  await page.waitForTimeout(6000);
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  const down = await g(([MRN, UW]) => {
    const mc = window.__classByName(MRN)._mc, b = mc.getChildByName("ioUnderBanner");
    const T = window.__classByName("flash.text::TextField"); let banner = ""; const walk = (o) => { if (o instanceof T) banner += o.text; for (const c of o.$children ?? []) walk(c); }; if (b) walk(b);
    const c = mc.ioCentreCell();
    return { under: window.__classByName(UW).under, lod: !!mc._ioLod, banner, centre: [c.x, c.y], coords: window.__classByName("com.monsters.maproom_advanced::IoMapUi").coord(c.x, c.y) };
  }, [MRN, UW]);
  check("...a click on one goes down through it: the map shows the Depths of Hell at its end", down.under && !down.lod && Math.abs(down.centre[0] - target[2]) <= 2 && Math.abs(down.centre[1] - target[3]) <= 2, JSON.stringify(down));
  check("...its banner and coordinates say \"Depths of Hell\", numbered from 0 (0-9) like the world above", /THE DEPTHS OF HELL/.test(down.banner) && down.coords === `Depths of Hell ${down.centre[0] - 500}, ${down.centre[1] - 500}`, JSON.stringify(down));
  await page.screenshot({ path: `${shots}/depths-down.png` });
  const nums = await g(() => {
    const U = window.__classByName("com.monsters.maproom_advanced::IoMapUi");
    return { top: U.coord(0, 0), corner: U.coord(399, 399), place: U.coord(188, 201), first: U.coord(500, 500), last: U.coord(509, 509), box: U.location(504, 505), boxTop: U.location(188, 201), one: window.__game.GLOBAL.ioCoord(188) };
  });
  check("coordinates: the world above 0-399 with no minus, the Depths 0-9 (\"D4 x D5\" in the popups' Location boxes)",
    nums.top === "0, 0" && nums.corner === "399, 399" && nums.place === "188, 201" && nums.first === "Depths of Hell 0, 0" && nums.last === "Depths of Hell 9, 9" && nums.box === "D4 x D5" && nums.boxTop === "188 x 201" && nums.one === "188", JSON.stringify(nums));

  // ---- the island's edge: the lava round it at the island's own level, drawn with the same lava picture
  await g(([MRN]) => window.__classByName(MRN).JumpTo(new (window.__classByName("flash.geom::Point"))(501, 501)), [MRN]);
  await page.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  const edge = await g(([MRN, UW]) => {
    const mc = window.__classByName(MRN)._mc, U = window.__classByName(UW);
    const cs = (mc._cells || []).filter((k) => k.mc && k.mc.visible !== false && k._groundVariant);
    const isl = cs.filter((k) => U.isUnder(k.X, k.Y)), sea = cs.filter((k) => !U.isUnder(k.X, k.Y));
    return {
      under: U.under, island: isl.length, sea: sea.length,
      ys: [...new Set(cs.map((k) => Math.round(k.mc.y)))],
      heights: [...new Set(cs.map((k) => k._height))],
      seaLava: sea.filter((k) => k._groundVariant.bitmapData === U.depthsGround(k.X, k.Y)).length,
      lavas: new Set(sea.map((k) => k._groundVariant.bitmapData)).size,
      islandLava: isl.filter((k) => { const b = k._groundVariant.bitmapData; return sea.some((q) => q._groundVariant.bitmapData === b); }).length,
    };
  }, [MRN, UW]);
  check("the island's edge: the lava round it draws at the island's level (one height, one tile offset) with the Depths' lava pictures",
    edge.under && edge.island > 4 && edge.sea > 4 && edge.ys.length === 1 && edge.heights.length === 1 && edge.heights[0] === 125 && edge.seaLava === edge.sea && edge.islandLava === 0, JSON.stringify(edge));
  check("...all 9 lava textures used, mixed between cells (less repetitive)", edge.lavas === 9, JSON.stringify(edge.lavas));
  await page.screenshot({ path: `${shots}/depths-edge.png` });

  // ---- a portal none of the player's yards reach: still open to look
  // (which portals the player's yards open, as the bubble works it out; and no outpost of theirs down there)
  const open = await g((UW) => { const U = window.__classByName(UW); return { open: U.portals.map((p, i) => U.entryOpen(i)), below: U.hasOutpostBelow() }; }, UW);
  const closed = open.below ? null : portals.map((p, i) => ({ p, i })).find(({ i }) => !open.open[i]);
  if (!closed) check("a portal out of the player's range", false, "every portal is open to this player (in range, or an outpost below): test with another");
  else {
    await g(([MRN, x, y]) => window.__classByName(MRN).JumpTo(new (window.__classByName("flash.geom::Point"))(x, y)), [MRN, closed.p[0], closed.p[1]]);
    await page.waitForTimeout(5000);
    for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
    const bubble = await g(([MRN, x, y]) => {
      const mc = window.__classByName(MRN)._mc; const c = (mc._cells || []).find((c) => c.X === x && c.Y === y); if (!c) return null; c.ioClick();
      const b = mc._ioSpot; if (!b) return { none: true };
      const T = window.__classByName("flash.text::TextField"); const texts = []; const walk = (o) => { if (o instanceof T) texts.push(o.text); for (const k of o.$children ?? []) walk(k); }; walk(b);
      const go = b.getChildByName("ioPortalGo");
      return { name: b.name, texts, go: !!go, alpha: go && go.alpha };
    }, [MRN, closed.p[0], closed.p[1]]);
    check("a portal none of your yards reach: its bubble still offers Enter the Depths of Hell", bubble && bubble.name === "ioPortalBubble" && bubble.go && bubble.alpha === 1 && bubble.texts.some((t) => /Portal to the Depths of Hell/.test(t)) && bubble.texts.some((t) => /Enter the Depths of Hell/.test(t)) && bubble.texts.some((t) => /To attack down there/.test(t)), JSON.stringify(bubble));
    await page.screenshot({ path: `${shots}/depths-bubble.png` });
    await g((MRN) => { const b = window.__classByName(MRN)._mc._ioSpot; b.getChildByName("ioPortalGo").dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click")); }, MRN);
    await page.waitForTimeout(6000);
    const looked = await g(([MRN, UW, ux, uy]) => {
      const mc = window.__classByName(MRN)._mc; const c = mc.ioCentreCell();
      const next = (mc._cells || []).filter((k) => k.X >= 500 && k.Y >= 500 && k.X < 510 && k.Y < 510 && Math.abs(k.X - ux) <= 1 && Math.abs(k.Y - uy) <= 1 && !(k.X === ux && k.Y === uy));
      return { under: window.__classByName(UW).under, centre: [c.x, c.y], next: next.length, inRange: next.filter((k) => k._inRange).length };
    }, [MRN, UW, closed.p[2], closed.p[3]]);
    check("...Enter takes you down to look (the cells there out of range: no attacking)", looked.under && Math.abs(looked.centre[0] - closed.p[2]) <= 2 && looked.next > 0 && looked.inRange === 0, JSON.stringify(looked));
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
