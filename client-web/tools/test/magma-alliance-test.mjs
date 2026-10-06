// Magma Towers at Under Hall 6, and the Alliances window's first tab (5 October, the user's).
//   EMAIL3 (or EMAIL)=... (an alliance member with an Under Hall 6 yard, e.g. show@example.com) TARGET=... (a player without
//   an alliance) PASSWORD=... node tools/test/magma-alliance-test.mjs
// Checks:
//  - the main yard builds 4 Magma Towers at Under Hall 6 (was 3): 0 / 0 / 0 / 1 / 2 / 2 / 4; outposts keep 4
//  - on that yard the building menu counts 4 for it
//  - the Alliances window (the top bar's Alliances): the first tab (Overview) is drawn the first time, and also
//    the second and third time it is opened (it stayed empty: its data came back from the store before the window
//    was on the stage)
//  - for a player without an alliance, the first tab (Browse) is drawn each time
// Nothing is saved.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const login = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];

async function open(email) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); }
  await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE._blockSave = true; });
  return { page, g };
}

/** Opens the Alliances window with the top bar's bar (a real click) and waits for its first tab to be drawn. */
async function allianceOpen(page, g) {
  const at = await g(() => { let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === "ioAlliances") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit || !hit.visible) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
  if (at) await page.mouse.click(at.x, at.y); else await g(() => window.__classByName("ALLIANCEWINDOW").Show());
  const state = () => g(() => {
    const mc = window.__classByName("ALLIANCEWINDOW")._mc; if (!mc) return null;
    const tab = mc._contentMC && mc._contentMC.numChildren ? mc._contentMC.getChildAt(0) : null;
    const lit = (mc._tabs || []).filter((t) => t.btn.Highlight).map((t) => t.index);
    return { active: mc._activeTab, lit, tab: tab ? tab.constructor.name.replace(/^_/, "") : null, drawn: tab ? tab.numChildren : 0 };
  });
  let s = null;
  for (let i = 0; i < 25; i++) { await page.waitForTimeout(200); s = await state(); if (s && s.drawn > 0 && i >= 2) break; }
  return { ...s, bar: !!at };
}
const allianceClose = async (page, g) => { await g(() => window.__classByName("ALLIANCEWINDOW").Hide()); await page.waitForTimeout(600); };

try {
  // ---- Magma Towers
  const { page, g } = await open(process.env.EMAIL3 || process.env.EMAIL);
  const magma = await g(() => {
    const G = window.__game.GLOBAL, p = G._buildingProps.find((x) => x.id === 132);
    const IM = window.__classByName("com.monsters.managers::InstanceManager") || window.__classByName("InstanceManager"), BF = window.__classByName("BFOUNDATION");
    const have = [...(IM.getInstancesByClass(BF) || [])].filter((b) => b._type === 132).length;
    const uh = G.GetBuildingTownHallLevel(p);
    return { quantity: [...p.quantity], outpost: G.IO_OUTPOST_QUANTITY && G.IO_OUTPOST_QUANTITY[132], uh, allowed: uh < p.quantity.length ? p.quantity[uh] : p.quantity[p.quantity.length - 1], have, th: G.townHall ? G.townHall._lvl.Get() : -1 };
  });
  check("Magma Towers on the main yard: 0 / 0 / 0 / 1 / 2 / 2 / 4 by Under Hall level (4 at Under Hall 6, was 3)", JSON.stringify(magma.quantity) === JSON.stringify([0, 0, 0, 1, 2, 2, 4]), JSON.stringify(magma));
  check("...outposts keep 4", JSON.stringify(magma.outpost) === JSON.stringify([0, 4]), JSON.stringify(magma.outpost));
  check("...an Under Hall 6 yard may have 4 (the building menu's count)", magma.uh === 6 && magma.allowed === 4 && magma.have <= 3, JSON.stringify(magma));

  // ---- the Alliances window, a member
  const first = await allianceOpen(page, g);
  check("Alliances (a member), first open: the Overview tab is drawn and lit", first.bar && first.tab === "IoOverviewTab" && first.drawn > 0 && first.lit.join() === "1", JSON.stringify(first));
  await allianceClose(page, g);
  const second = await allianceOpen(page, g);
  check("...second open: the Overview tab is drawn (it stayed empty)", second.tab === "IoOverviewTab" && second.drawn > 0 && second.lit.join() === "1", JSON.stringify(second));
  await allianceClose(page, g);
  const third = await allianceOpen(page, g);
  check("...third open: drawn too", third.tab === "IoOverviewTab" && third.drawn > 0, JSON.stringify(third));
  // another tab, then the window again: it opens on the first tab
  await g(() => { const mc = window.__classByName("ALLIANCEWINDOW")._mc; mc._switchTab(3); });
  await page.waitForTimeout(1500);
  await allianceClose(page, g);
  const fourth = await allianceOpen(page, g);
  check("...after another tab, opened again: back on the Overview, drawn", fourth.tab === "IoOverviewTab" && fourth.drawn > 0, JSON.stringify(fourth));
  await allianceClose(page, g);
  await page.close();

  // ---- a player without an alliance
  if (process.env.TARGET) {
    const p2 = await open(process.env.TARGET);
    const a = await allianceOpen(p2.page, p2.g);
    await allianceClose(p2.page, p2.g);
    const b = await allianceOpen(p2.page, p2.g);
    check("Alliances (no alliance), first and second open: the Browse tab is drawn", a.tab === "BrowseTab" && a.drawn > 0 && b.tab === "BrowseTab" && b.drawn > 0 && b.lit.join() === "0", JSON.stringify({ a, b }));
    await p2.page.close();
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
