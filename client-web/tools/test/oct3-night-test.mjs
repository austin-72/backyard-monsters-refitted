// The 3 October (night) features (Inferno-only):
//  - Magma Drop keeps up to 20 Spurtz in the air (was 6), and the Pit's rate limit lets them all through
//  - the Outposts list (the top bar's >> button): [◀ Previous] [Home] [Next outpost ▶], round from the last
//    outpost to the first, Home greyed in the main yard, Previous from the main yard to the last outpost
//  - the Wart Bloom: the flag io_wartbloom (Friday 6 pm to Sunday midnight Central), its hours counting
//    3 times towards the next wart (offline too), warts growing while the yard is open in a bloom, and the
//    start announced in Global chat ("Event:")
//   EMAIL=<a player with at least 2 outposts> EMAIL3=<a player with a Brimstone Pit and Shiny> PASSWORD=...
//   node tools/test/oct3-night-test.mjs
// Prints one line per check; each must end in "ok". Bets of 1 Shiny are placed; the yard is not saved
// except where an outpost is visited.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const email = process.env.EMAIL;
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const next = async () => { for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); } };
const settled = () => page.waitForFunction(() => { const G = window.__game; return G.GLOBAL.mode === "build" && !G.BASE._loading && G.BASE.buildings.length > 0 && !window.__classByName("PLEASEWAIT")._mc; }, null, { timeout: 60000 }).catch(() => null);

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  await next();
  await g(() => { window.__game.WMATTACK._enabled = false; });

  // ================= the Wart Bloom
  const flag = await g(() => {
    const M = window.__classByName("MUSHROOMS"), G = window.__game.GLOBAL;
    const raw = G._flags.io_wartbloom;
    const b = raw ? JSON.parse(raw) : null;
    return { raw, rate: b && b.rate, windows: b && b.w, now: G.Timestamp() };
  });
  const show = (s) => new Date(s * 1000).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" });
  const okWindows = flag.windows && flag.windows.length === 3 && flag.windows.every(([a, b]) => {
    const s = show(a), e = show(b);
    return /^Fri,? 6:00\s?PM/.test(s) && /^Mon,? 12:00\s?AM/.test(e);
  });
  check("the Wart Bloom's flag: rate 3, last week's, this week's and next week's Friday 6 pm to Sunday midnight Central", flag.rate === 3 && okWindows, JSON.stringify({ rate: flag.rate, w: (flag.windows || []).map(([a, b]) => `${show(a)} - ${show(b)}`) }));
  const math = await g(() => {
    const M = window.__classByName("MUSHROOMS");
    const G = window.__game.GLOBAL;
    const keep = G._flags.io_wartbloom;
    // a made-up bloom from t=1000 to t=2000
    G._flags.io_wartbloom = JSON.stringify({ rate: 3, w: [[1000, 2000]] });
    const r = { before: M.ioGrowth(0, 1000), across: M.ioGrowth(500, 1500), inside: M.ioGrowth(1200, 1800), after: M.ioGrowth(2000, 2600), whole: M.ioGrowth(0, 3000), on: !!M.ioBloomAt(1500), off: !!M.ioBloomAt(2000) };
    G._flags.io_wartbloom = keep;
    return r;
  });
  check("…a bloom's seconds count 3 times towards the next wart (none outside it)", math.before === 1000 && math.across === 500 + 1500 && math.inside === 1800 && math.after === 600 && math.whole === 5000 && math.on && !math.off, JSON.stringify(math));
  const inBloom = flag.windows && flag.windows.some(([a, b]) => a <= flag.now && flag.now < b);
  // the main yard: a wart due (1.6 hours of a bloom) grows while the yard is open; none without a bloom
  const grow = await g((inBloom) => {
    const M = window.__classByName("MUSHROOMS"), B = window.__game.BASE, G = window.__game.GLOBAL;
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), BM = window.__classByName("BMUSHROOM");
    const count = () => IM.getInstancesByClass(BM).length;
    B._blockSave = true;
    const keepSave = B.Save; B.Save = () => {};
    const keepFlag = G._flags.io_wartbloom;
    const now = G.Timestamp();
    // (a bloom now, for the test, whatever the day)
    G._flags.io_wartbloom = JSON.stringify({ rate: 3, w: [[now - 7200, now + 7200]] });
    // fewer than 10 warts: some picked off for the test
    const warts = IM.getInstancesByClass(BM).filter((w) => !(w instanceof window.__classByName("com.monsters.events.hfo::IoHfoIce")));
    for (const w of warts.slice(0, Math.max(0, warts.length - 5))) w.RecycleC();
    const start = count();
    B._lastSpawnedMushroom = now - 5800; // 1.6 hours (5,760 s) of a bloom: one wart's growth
    M.ioTick();
    const afterDue = count();
    B._lastSpawnedMushroom = now - 3000; // not yet
    M.ioTick();
    const afterEarly = count();
    G._flags.io_wartbloom = JSON.stringify({ rate: 3, w: [[now + 7200, now + 9000]] }); // no bloom now
    B._lastSpawnedMushroom = now - 20000; // (a wart due at the usual pace, but outside a bloom they grow only at a load)
    M.ioTick();
    const noBloom = count();
    G._flags.io_wartbloom = keepFlag;
    B.Save = keepSave;
    return { start, afterDue, afterEarly, noBloom };
  }, inBloom);
  check("…in a bloom a wart grows in the open yard once 1.6 hours have gone by (not before; outside a bloom only at a load)", grow.afterDue === grow.start + 1 && grow.afterEarly === grow.afterDue && grow.noBloom === grow.afterDue, JSON.stringify(grow));
  if (inBloom) {
    // the start, announced in Global chat
    await page.waitForTimeout(1500);
    const line = await g(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; const h = c.chatBox._chatHistory || []; const hit = h.find((l) => l && l.txt && /Event: Wart Bloom!/.test(l.txt.text)); return hit ? hit.txt.text : null; });
    check("…the bloom's start is in Global chat as an Event line", !!line, String(line));
  }

  // ================= Magma Drop: 20 at once (EMAIL3: a player with a Brimstone Pit, if not EMAIL)
  const pitEmail = process.env.EMAIL3 || email;
  const pitToken = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(pitEmail)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
  const pitPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pitPage.on("pageerror", (e) => errors.push(e.message));
  await pitPage.goto(`${server}?token=${pitToken}&language=english&shell=0`);
  await pitPage.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await pitPage.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await pitPage.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await pitPage.waitForTimeout(150); }
  const drop = await pitPage.evaluate(async () => {
    window.__game.BASE._blockSave = true;
    const W = window.__classByName("com.monsters.casino::CasinoWindow");
    W.Show();
    await new Promise((r) => setTimeout(r, 2000));
    const w = W._open;
    if (!w) return { none: true };
    w.openGame("magmadrop");
    await new Promise((r) => setTimeout(r, 800));
    const game = w._game;
    game._bet.setValue(1);
    const errs = [];
    const keepMsg = w.message; w.message = function (t, k) { errs.push(t); return keepMsg.apply(this, arguments); };
    let max = 0;
    for (let i = 0; i < 25; i++) { try { game.onDrop(); } catch (e) { errs.push("threw " + e.message); } max = Math.max(max, game._pending); }
    const pendingAt25 = game._pending;
    // all of them land
    for (let i = 0; i < 80 && (game._pending > 0 || game._balls.length > 0); i++) await new Promise((r) => setTimeout(r, 250));
    const r = { max, pendingAt25, left: game._pending, balls: game._balls.length, errs: errs.filter((t) => !/^Cup /.test(t)).slice(0, 4) };
    w.message = keepMsg;
    w.close();
    return r;
  });
  await pitPage.close();
  check("Magma Drop: 20 Spurtz in the air at once (the 21st waits), all paid with no 'too many bets'", drop.max === 20 && drop.pendingAt25 === 20 && drop.left === 0 && drop.errs.length === 0, JSON.stringify(drop));

  // ================= the Outposts list's buttons
  const ids = await g(() => ({ ids: (window.__game.GLOBAL._mapOutpostIDs || []).map(String), home: String(window.__game.GLOBAL._homeBaseID), here: String(window.__game.BASE._loadedBaseID) }));
  check("a player with at least 2 outposts (EMAIL)", ids.ids.length >= 2, JSON.stringify(ids));
  const openList = async () => {
    await g(() => window.__classByName("com.monsters.maproom_advanced::IoOutpostsPopup").Show());
    await page.waitForFunction(() => { const P = window.__classByName("com.monsters.maproom_advanced::IoOutpostsPopup"); return P._open && P._open._mc && P._open._mc.stage; }, null, { timeout: 20000 });
    await page.waitForTimeout(600);
  };
  const buttons = () => g(() => {
    const mc = window.__classByName("com.monsters.maproom_advanced::IoOutpostsPopup")._open._mc;
    const P = window.__classByName("flash.geom::Point");
    const out = {};
    for (const n of ["ioPrevious", "ioHome", "ioNext"]) { const b = mc.getChildByName(n); const p = b.localToGlobal(new P(b.width / 2, b.height / 2)); out[n] = { on: b.mouseEnabled, alpha: b.alpha, at: window.__player.stageToClient(p.x, p.y), x: Math.round(b.x) }; }
    return out;
  });
  const clickBtn = async (b) => { await page.mouse.click(b.at.x, b.at.y); await page.waitForTimeout(800); await settled(); await page.waitForTimeout(2500); await next(); };
  const here = () => g(() => String(window.__game.BASE._loadedBaseID));
  await openList();
  let b = await buttons();
  await page.screenshot({ path: `${shots}/oct3-outposts-buttons.png` });
  check("…the list has ◀ Previous, Home, Next outpost ▶ left to right; Home greyed in the main yard", b.ioPrevious.x < b.ioHome.x && b.ioHome.x < b.ioNext.x && !b.ioHome.on && b.ioHome.alpha < 1 && b.ioPrevious.on && b.ioNext.on, JSON.stringify(b));
  await clickBtn(b.ioPrevious);
  const last = await here();
  check("…Previous from the main yard opens the last outpost taken", last === ids.ids[ids.ids.length - 1], JSON.stringify({ last, ids: ids.ids }));
  await openList();
  b = await buttons();
  check("…in an outpost Home can be clicked", b.ioHome.on && b.ioHome.alpha === 1, JSON.stringify(b.ioHome));
  await clickBtn(b.ioNext);
  const wrapped = await here();
  check("…Next from the last outpost goes round to the first", wrapped === ids.ids[0], JSON.stringify({ wrapped, ids: ids.ids }));
  await openList();
  b = await buttons();
  await clickBtn(b.ioPrevious);
  const back = await here();
  check("…Previous from the first goes round to the last", back === ids.ids[ids.ids.length - 1], JSON.stringify({ back }));
  await openList();
  b = await buttons();
  await clickBtn(b.ioHome);
  const home = await g(() => ({ id: String(window.__game.BASE._loadedBaseID), main: window.__game.BASE.isMainYardOrInfernoMainYard }));
  check("…Home goes back to the main yard", home.main && home.id === ids.home, JSON.stringify(home));
  await openList();
  b = await buttons();
  await clickBtn(b.ioNext);
  const first = await here();
  check("…and Next from the main yard opens the first outpost", first === ids.ids[0], JSON.stringify({ first }));
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}
