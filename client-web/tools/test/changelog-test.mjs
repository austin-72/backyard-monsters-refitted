// The Changelog (4 October, the user's): a top bar button that lists every change ever made, day by day.
//   EMAIL=... PASSWORD=... node tools/test/changelog-test.mjs
// Checks:
//  - the server's /changelog: the file's days, newest first, each change with an area, a title and a text;
//    Hell Freezes Over only as "[ CLASSIFIED ]"
//  - the top bar has the Changelog button right of the attack logs button, with its tip; the shortcut bars like the
//    Shiny counter (Alliances, Attack Log, Leaderboard, Change Log), and Alliances opens the Alliances window; on a
//    phone they are badges (just their gold pictures) with no names, clear of the page's menu button
//  - a click opens the window: every day on the left, every change on the right, the count in the heading
//  - a day on the left scrolls the list to that day; the wheel scrolls it; Close closes it
// Nothing is saved.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
try {
  // ---- the server
  const data = await (await fetch(`${server}changelog`)).json();
  const items = (data.entries || []).flatMap((e) => e.items || []);
  const dates = (data.entries || []).map((e) => e.date);
  const sorted = dates.every((d, i) => i === 0 || dates[i - 1] > d);
  check("the server's changelog: days newest first, every change with an area, a title and a text", !data.error && dates.length >= 10 && sorted && items.length >= 150 && items.every((x) => x.area && x.title && x.text) && dates[0] === "2026-10-06" && dates[1] === "2026-10-05" && dates[2] === "2026-10-04" && dates[dates.length - 1] <= "2026-09-23", JSON.stringify({ days: dates.length, items: items.length, first: dates[0], last: dates[dates.length - 1] }));
  const hfo = JSON.stringify(data).match(/Hell Freezes Over|[Ff]roz|[Tt]haw/g) || [];
  const hfoItems = items.filter((x) => /Hell Freezes Over/.test(x.title + x.text));
  check("...Hell Freezes Over only as [ CLASSIFIED ]", hfoItems.length >= 1 && hfoItems.every((x) => x.title === "Hell Freezes Over" && x.text === "[ CLASSIFIED ]") && hfo.length === hfoItems.length, JSON.stringify({ hfo, hfoItems }));
  const day = (date) => data.entries.find((e) => e.date === date) || {};
  check("...4 October's changes are in it (speed-ups, truces, walls, the Gauntlet's catapults, the Depths, this button)", ["speed", "truce", "wall|bone block", "catapult", "lava", "changelog"].every((w) => (day("2026-10-04").items || []).some((x) => new RegExp(w, "i").test(x.title + " " + x.text))), day("2026-10-04").headline);
  check("...and 5 October's (the fourth Magma Tower, the Alliances window's first tab)", ["magma tower", "alliances"].every((w) => (day("2026-10-05").items || []).some((x) => new RegExp(w, "i").test(x.title + " " + x.text))), day("2026-10-05").headline);
  check("...and 6 October's (kits built at once with resources, deleting accounts)", ["kit", "delete an account"].every((w) => (day("2026-10-06").items || []).some((x) => new RegExp(w, "i").test(x.title + " " + x.text))), day("2026-10-06").headline);

  // ---- the game
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); }
  await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE._blockSave = true; });
  const button = await g(() => {
    const find = (o, n) => { if (!o) return null; if (o.name === n) return o; for (const c of o.$children ?? []) { const f = find(c, n); if (f) return f; } return null; };
    const st = window.__player.stage, b = find(st, "ioChangelog"), a = find(st, "ioAttackLogs");
    if (!b) return null;
    const r = b.getBounds(st), ra = a && a.getBounds(st);
    return { visible: b.visible, x: r.x, y: r.y, w: r.width, a: ra && { x: ra.x, y: ra.y }, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) };
  });
  check("the top bar's Changelog button, right of the attack logs", button && button.visible && button.a && button.x > button.a.x && Math.abs(button.y - button.a.y) < 3, JSON.stringify(button));
  // the shortcut bars, drawn like the Shiny counter: Alliances, Attack Log, Leaderboard, Change Log, each its name
  // over a bar with its picture on the left
  const bars = await g(() => {
    const find = (o, n) => { if (!o) return null; if (o.name === n) return o; for (const c of o.$children ?? []) { const f = find(c, n); if (f) return f; } return null; };
    const st = window.__player.stage, r5 = find(st, "mcR5");
    const shiny = r5.mcBG.getBounds(st); // (the counter's box: its "+" is hidden)
    return { shinyRight: shiny.x + shiny.width, font: r5.tR.defaultTextFormat.font, bars: ["ioAlliances", "ioAttackLogs", "ioLeaderboards", "ioChangelog"].map((n) => {
      const b = find(st, n); if (!b) return { n };
      const t = b.getChildByName("label"), bar = b.getChildByName("bar"), icon = b.getChildByName("icon"), r = b.getBounds(st);
      return { n, x: Math.round(r.x), y: Math.round(r.y), label: t && t.visible ? t.text : null, font: t && t.defaultTextFormat.font, bar: !!bar && bar.visible && bar.numChildren > 0, iconX: icon ? Math.round(icon.getBounds(st).x) : null, textX: t ? Math.round(t.getBounds(st).x) : null, at: window.__player.stageToClient(r.x + 20, r.y + r.height / 2) };
    }) };
  });
  const B = bars.bars;
  check("the top bar's shortcuts, like the Shiny counter: Alliances, Attack Log, Leaderboard, Change Log, in that order, each its name over a bar, its picture on the left",
    B.map((b) => b.label).join("|") === "Alliances|Attack Log|Leaderboard|Change Log" && B.every((b, i) => b.bar && b.font === bars.font && b.iconX < b.textX && (i === 0 ? b.x >= bars.shinyRight - 2 : b.x > B[i - 1].x) && Math.abs(b.y - B[0].y) < 2), JSON.stringify(bars));
  await page.mouse.click(B[0].at.x, B[0].at.y);
  await page.waitForTimeout(2500);
  const ally = await g(() => !!window.__game.ALLIANCEWINDOW._open);
  check("...Alliances opens the Alliances window", ally, String(ally));
  await g(() => { try { window.__game.ALLIANCEWINDOW.Hide(); } catch (e) {} });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/top-bar.png`, clip: { x: 0, y: 0, width: 1280, height: 60 } });
  await page.mouse.move(button.at.x, button.at.y);
  await page.waitForTimeout(500);
  const tip = await g(() => { const T = window.__classByName("flash.text::TextField"); let hit = ""; const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T && /every change ever made/i.test(o.text)) hit = o.text; for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit; });
  check("...its tip says what it is", /Changelog/.test(tip) && /every change ever made/i.test(tip), JSON.stringify(tip));
  await page.mouse.click(button.at.x, button.at.y);
  await page.waitForTimeout(2500);
  const shown = await g(() => {
    const L = window.__classByName("com.monsters.leaderboards::IoChangelog");
    const w = L._open; if (!w || !w.mc) return null;
    const T = window.__classByName("flash.text::TextField"); const texts = []; const walk = (o) => { if (o instanceof T) texts.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(w.mc);
    const days = w._days.content.numChildren;
    return { days, heads: texts.filter((t) => /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) \d+ \w+ 2026$/.test(t)), sub: w._sub.text, total: w._list.total, h: w._list.h, today: texts.includes("Sunday 4 October 2026"), titles: texts.filter((t) => t === "Changelog button").length };
  });
  check("a click opens it: every day on the left, each day's heading and changes on the right, the count on top", shown && shown.days === dates.length && shown.heads.length === dates.length && shown.today && shown.titles === 1 && new RegExp(`${items.length} changes over ${dates.length} days`).test(shown.sub) && shown.total > shown.h * 5, JSON.stringify(shown && { ...shown, heads: shown.heads.slice(0, 3) }));
  await page.screenshot({ path: `${shots}/changelog-window.png` });
  const jump = await g(() => {
    const w = window.__classByName("com.monsters.leaderboards::IoChangelog")._open;
    const last = w._dayTops.length - 1;
    w._days.content.getChildByName("ioClGo" + last).dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click"));
    const head = w._list.content.getChildByName("ioClDay" + last);
    return { offset: w._list.offset, headY: head.y, contentY: w._list.content.y };
  });
  check("a day on the left goes to that day", jump.offset > 0 && Math.abs(jump.offset - Math.min(jump.headY - 4, shown.total - shown.h)) < 2, JSON.stringify(jump));
  await page.screenshot({ path: `${shots}/changelog-first-day.png` });
  const before = await g(() => window.__classByName("com.monsters.leaderboards::IoChangelog")._open._list.offset);
  await g(() => { const w = window.__classByName("com.monsters.leaderboards::IoChangelog")._open; w._list.offset = 0; w._list.place(); });
  const box = await g(() => { const w = window.__classByName("com.monsters.leaderboards::IoChangelog")._open; const r = w._list.content.parent.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + 100, r.y + 100); });
  await page.mouse.move(box.x, box.y);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(400);
  const after = await g(() => window.__classByName("com.monsters.leaderboards::IoChangelog")._open._list.offset);
  check("...and the wheel scrolls it", before > 0 && after > 0, JSON.stringify({ before, after }));
  await g(() => { const w = window.__classByName("com.monsters.leaderboards::IoChangelog")._open; const find = (o) => { if (o.name === "ioClClose") return o; for (const c of o.$children ?? []) { const f = find(c); if (f) return f; } return null; }; find(w.mc).dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click")); });
  await page.waitForTimeout(300);
  check("Close closes it", await g(() => !window.__classByName("com.monsters.leaderboards::IoChangelog").isOpen));
  // ---- on a phone (the page's menu button at the top centre): badges, no names; the Shiny counter as it is
  const phone = await browser.newContext({ ...devices["iPhone 13 landscape"] });
  const pp = await phone.newPage();
  pp.on("pageerror", (e) => errors.push(e.message));
  await pp.goto(`${server}?token=${await login()}&language=english`);
  await pp.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await pp.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await pp.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await pp.waitForTimeout(120); }
  await pp.waitForTimeout(600);
  const small = await pp.evaluate(() => {
    const find = (o, n) => { if (!o) return null; if (o.name === n) return o; for (const c of o.$children ?? []) { const f = find(c, n); if (f) return f; } return null; };
    const st = window.__player.stage, P = window.__player, r5 = find(st, "mcR5");
    const fab = document.querySelector(".bw-fab"), fr = fab && fab.getBoundingClientRect();
    const bars = ["ioAlliances", "ioAttackLogs", "ioLeaderboards", "ioChangelog"].map((n) => { const b = find(st, n); const bar = b.getChildByName("bar"), icon = b.getChildByName("icon"), t = b.getChildByName("label"); const r = icon.getBounds(st); const c = P.stageToClient(r.x + r.width, 0); return { n, badge: icon.visible && icon.numChildren > 0 && !bar.visible, name: t.visible, right: c.x }; });
    return { phone: window.__game.GLOBAL.ioOnPhone, shiny: r5.tR.visible && r5.tR.text, fabLeft: fr ? fr.left : null, bars };
  });
  check("on a phone: the shortcuts are badges with no names, clear of the page's menu button; the Shiny counter keeps its number", small.phone && /\d/.test(small.shiny || "") && small.fabLeft != null && small.bars.every((b) => b.badge && !b.name) && small.bars[small.bars.length - 1].right < small.fabLeft, JSON.stringify(small));
  await pp.screenshot({ path: `${shots}/top-bar-phone.png`, clip: { x: 0, y: 0, width: 750, height: 40 } });
  await phone.close();
  check("no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
