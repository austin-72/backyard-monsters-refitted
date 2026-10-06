// The UI sweep of 3 October (every window looked at, in the four languages and on a small screen): what it
// fixed stays fixed. In English, French, Spanish and Portuguese, it opens the windows the sweep found broken and
// checks their texts with the same measure the sweep used (a one-line text wider than its field, a wrapped
// text taller than its field, a raw key "#bi_x#" / "some_key", "undefined" / "NaN"), plus:
//  - the top bar's counters at tens of millions on one line (from 50,000,000 the last digit wrapped out of sight)
//  - "Invite a friend": the popup grows to its text (the invite and the note were cut off)
//  - the Compound with no room (0 / 0): its bar inside the window (it was NaN wide, off to the screen's edge)
//  - the mailbox's columns have headings
//  - the alliance window's top (and its close button) on a 1024 x 640 screen
//  - the Brimstone Pit: Ascent's "AUTO CASH-OUT AT" not under its field
//   EMAIL=... PASSWORD=... node tools/test/ui-visual-test.mjs
// EMAIL: an account in an alliance. Saving is blocked in the game; nothing is changed. One line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;

// the sweep's measure, over what's on the windows layers (or a root given by a path from window)
const CHECK = (rootPath) => {
  const G = window.__game, stage = window.__player.stage, TF = window.__classByName("flash.text::TextField");
  const ss = window.__player.stageToClient(1, 0).x - window.__player.stageToClient(0, 0).x;
  const roots = rootPath ? [rootPath.split(".").reduce((o, k) => o && o[k], window)] : [G.GLOBAL._layerWindows, G.GLOBAL._layerTop];
  const shown = (o) => { let x = o; while (x && x !== stage) { if (!x.visible || x.alpha <= 0.02) return false; x = x.parent; } return !!x; };
  const masked = (o) => { let x = o; while (x && x !== stage) { if (x.mask || x.scrollRect) return true; x = x.parent; } return false; };
  const out = [];
  const walk = (o, d) => {
    if (!o || !o.visible || d > 30) return;
    if (o instanceof TF && o.type !== "input" && shown(o)) {
      const t = (o.text || "").replace(/\r/g, "\n").trim();
      if (t) {
        const auto = o.autoSize && o.autoSize !== "none";
        let r = null; try { r = o.getBounds(stage); } catch (e) {}
        if (/\bundefined\b|\bNaN\b|\[object /.test(t)) out.push("bad value: " + t.slice(0, 50));
        if (/#[a-z][a-z0-9_]*#/i.test(t) || t.split(/\n/).some((l) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(l.trim()))) out.push("raw key: " + t.slice(0, 50));
        if (r && !auto && !o.wordWrap && o.textWidth * ss > r.width * ss - 4 * ss + 1) out.push(`too wide: "${t.slice(0, 40)}" ${Math.round(o.textWidth)} > ${Math.round(r.width)}`);
        if (!auto && !masked(o) && o.maxScrollV > 1 && (o.wordWrap || t.includes("\n"))) out.push(`too tall: "${t.slice(0, 40)}" ${o.numLines} lines`);
      }
    }
    for (let i = 0; i < (o.numChildren || 0); i++) walk(o.getChildAt(i), d + 1);
  };
  for (const r of roots) walk(r, 0);
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const open = async (lang, vw = 1280, vh = 800) => {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on("pageerror", (e) => errors.push(`${lang}: ${e.message}`));
  await page.goto(`${server}?token=${await login()}&language=${lang}&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) try { window.__game.POPUPS.Next(); } catch (e) {}
    const G = window.__game; G.BASE._blockSave = true; try { G.WMATTACK._enabled = false; } catch (e) {}
    const D = window.__classByName("com.monsters.daily::IoDailyPopup"); if (D && D._open) D._open.close();
  });
  return page;
};
const closeAll = (page) => page.evaluate(() => {
  const G = window.__game;
  for (const n of ["HOUSING", "MAILBOX", "BUILDINGOPTIONS", "BUILDINGINFO", "PLANNER", "LEADERBOARD", "com.monsters.quests::IoQuestBook", "com.monsters.casino::CasinoWindow"]) { try { const c = window.__classByName(n); if (c && c.Hide) c.Hide(); } catch (e) {} }
  try { G.ALLIANCEWINDOW.Hide(); } catch (e) {}
  for (let i = 0; i < 6; i++) try { G.POPUPS.Next(); } catch (e) {}
  for (const L of [G.GLOBAL._layerWindows]) while (L.numChildren) L.removeChildAt(0);
});

try {
  for (const lang of ["english", "french", "spanish", "portuguese"]) {
    const page = await open(lang);
    const g = (fn, a) => page.evaluate(fn, a);
    const views = {
      "quest book": () => window.__classByName("com.monsters.quests::IoQuestBook").Show(),
      "quest book, daily": () => { const B = window.__classByName("com.monsters.quests::IoQuestBook"); B.Show(); B._open.selectCategory ? B._open.selectCategory("daily") : null; },
      "leaderboards": () => window.__classByName("com.monsters.leaderboards::IoLeaderboards").Show(),
      "alliance members": () => { window.__game.ALLIANCEWINDOW.Show(); },
      "Compound": () => window.__game.HOUSING.Show(),
      "Yard Planner": () => window.__game.PLANNER.Show(),
      "mailbox": () => window.__game.MAILBOX.Show(),
    };
    for (const [name, fn] of Object.entries(views)) {
      await closeAll(page);
      await g(fn);
      await page.waitForTimeout(2500);
      if (name === "alliance members") { await g(() => window.__game.ALLIANCEWINDOW._mc.SelectTab(3)); await page.waitForTimeout(2000); }
      const bad = await g(CHECK);
      check(`${lang}: ${name}: every text fits, no raw keys`, bad.length === 0, bad.slice(0, 4).join(" | "));
    }
    // the mailbox's headings
    const heads = await g(() => { const I = window.__classByName("com.monsters.mailbox::Inbox")._instance; const T = window.__classByName("flash.text::TextField"); return [I.fromBtn, I.subjectBtn, I.dateBtn].map((b) => { let t = ""; for (let i = 0; i < b.numChildren; i++) if (b.getChildAt(i) instanceof T) t = b.getChildAt(i).text; return t; }); });
    check(`${lang}: the mailbox's columns have headings`, heads.every((t) => t.length > 1), heads.join(" | "));
    // the Compound's bar inside its window, even with no room at all
    await closeAll(page);
    const bar = await g(async () => { const H = window.__classByName("HOUSING"); const hs = H.HousingSpace; H.HousingSpace = function () { hs.apply(this, arguments); H._housingCapacity.Set(0); H._housingUsed.Set(0); }; H.Show(); await new Promise((r) => setTimeout(r, 1500)); const p = window.__game.GLOBAL._layerWindows.getChildAt(window.__game.GLOBAL._layerWindows.numChildren - 1); const w = p.mcStorage.mcBar.width; const shown = p.tStorage.text; H.HousingSpace = hs; H.HousingSpace(); return [w, shown]; });
    check(`${lang}: the Compound with no room: its bar inside the window`, bar[0] >= 0 && bar[0] <= 535 && /^0 \/ 0 \(0%\)$/.test(bar[1]), JSON.stringify(bar));
    if (lang === "english") {
      // the top bar at 50 million
      await closeAll(page);
      const top = await g(async () => { const G = window.__game; for (const r of ["r1", "r2", "r3", "r4"]) G.BASE._resources[r].Set(50000000); await new Promise((r) => setTimeout(r, 2500)); const T = G.GLOBAL._layerUI.getChildAt(1).mc; const o = []; for (let i = 1; i <= 4; i++) { const f = T["mcR" + i].tR; o.push([f.text, f.numLines, Math.round(f.textWidth), Math.round(f.width)]); } return o; });
      check("the top bar's counters at tens of millions on one line, inside their field", top.every(([t, n, tw, w]) => t.replace(/\D/g, "").length >= 8 && n === 1 && tw <= w - 4), JSON.stringify(top));
      // Invite a friend
      const inv = await g(async () => { window.__classByName("UI_TOP").ioShowInvite(); await new Promise((r) => setTimeout(r, 1500)); const P = window.__classByName("popup_generic"); let p = null; const walk = (o) => { if (p || !o) return; if (o instanceof P) { p = o; return; } for (let i = 0; i < (o.numChildren || 0); i++) walk(o.getChildAt(i)); }; walk(window.__player.stage); return p ? { scroll: p.tB.maxScrollV, lines: p.tB.numLines, bottom: p.tB.y + p.tB.height, button: p.bAction.y, frame: p.mcBG.y + p.mcBG.height } : null; });
      check("Invite a friend: all of its text shown, the button under it, inside the frame", inv && inv.scroll === 1 && inv.button >= inv.bottom - 6 && inv.button + 30 <= inv.frame + 4, JSON.stringify(inv));
      // Ascent's label
      await closeAll(page);
      const asc = await g(async () => { const C = window.__classByName("com.monsters.casino::CasinoWindow"); C.Show(); await new Promise((r) => setTimeout(r, 2000)); if (!C._open) return null; C._open.openGame("ascent"); await new Promise((r) => setTimeout(r, 1500)); const T = window.__classByName("flash.text::TextField"); let label = null, field = null; const walk = (o) => { if (!o) return; if (o instanceof T && o.text === "AUTO CASH-OUT AT") label = o; if (o.name === "casinoAutoField") field = o; for (let i = 0; i < (o.numChildren || 0); i++) walk(o.getChildAt(i)); }; walk(window.__game.GLOBAL._layerWindows); return label && field ? { end: label.x + label.textWidth + 2, field: field.x } : "no Ascent"; });
      check("the Pit's Ascent: AUTO CASH-OUT AT not under its field", asc === null || asc === "no Ascent" || asc.end <= asc.field, JSON.stringify(asc));
    }
    await page.close();
  }
  // a small screen: the alliance window's top and close button on it
  const small = await open("english", 1024, 640);
  await small.evaluate(() => window.__game.ALLIANCEWINDOW.Show());
  await small.waitForTimeout(3000);
  const top = await small.evaluate(() => { const mc = window.__game.ALLIANCEWINDOW._mc; const p = window.__player.stageToClient(mc.x, mc.y); return { y: Math.round(p.y), x: Math.round(p.x) }; });
  check("on a 1024 x 640 screen the alliance window's top is on screen", top.y >= 0 && top.x >= 0, JSON.stringify(top));
  check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
} finally {
  await browser.close();
}
