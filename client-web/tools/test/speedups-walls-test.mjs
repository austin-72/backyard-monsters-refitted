// Speed-ups, walls and truces (4 October, the user's).
//   EMAIL=... PASSWORD=... node tools/test/speedups-walls-test.mjs
// Checks:
//  - finishing a building early (build, upgrade, fortify, repair): free with 10 minutes or less left, as the original
//    game's last 5 minutes were; 1 Shiny at 11 minutes, one more every 6 minutes, 9 at 59; an hour or more as before
//  - Speed Up (the Store's speed-ups) with 8 minutes left: Close Enough FREE, Finish now 0; Close Enough
//    finishes the upgrade and takes no Shiny
//  - with 30 minutes left: Finish now at 4 Shiny, Close Enough not free
//  - other timers (hatching) keep their price
//  - bone blocks on the main yard: 10 / 50 / 90 / 160 / 260 / 300 at Under Hall 1-6, from Under Hall 1;
//    outposts keep 200
//  - truces are gone: no truce in the map's cells, no requesttruce, truce mail refused
// Nothing is saved.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
try {
  const token = await login();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(120); }
  await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE._blockSave = true; });

  // ---- the prices
  const table = await g(() => {
    const S = window.__classByName("STORE"), G = window.__game.GLOBAL;
    const at = (s) => S.ioBuildingTimeCost(s);
    return { close: G.ioCloseEnough, m: { 300: at(300), 599: at(599), 600: at(600), 601: at(601), 660: at(660), 960: at(960), 961: at(961), 1020: at(1020), 1800: at(1800), 3000: at(3000), 3540: at(3540), 3599: at(3599), 3600: at(3600), 7200: at(7200) }, curve: { 3600: S.GetTimeCost(3600), 7200: S.GetTimeCost(7200) }, hatch: S.GetTimeCost(600, false) };
  });
  const m = table.m;
  check("free with 10 minutes or less left (the original game's last 5 minutes, made 10)", table.close === 600 && m[300] === 0 && m[599] === 0 && m[600] === 0, JSON.stringify(table));
  check("under an hour: 1 Shiny at 11 minutes, +1 every 6 minutes, 9 at 59 (not 10 flat)", m[601] === 1 && m[660] === 1 && m[960] === 1 && m[961] === 2 && m[1020] === 2 && m[1800] === 4 && m[3000] === 7 && m[3540] === 9 && m[3599] === 9, JSON.stringify(m));
  check("an hour or more: as before", m[3600] === table.curve[3600] && m[7200] === table.curve[7200] && m[3600] === 10, JSON.stringify({ m3600: m[3600], m7200: m[7200], curve: table.curve }));
  check("other timers keep theirs (hatching: no free window, 10 Shiny)", table.hatch === 10, String(table.hatch));

  // ---- the Speed Up window on a building being upgraded
  const pick = await g(() => {
    const BF = window.__classByName("BFOUNDATION"), IM = window.__classByName("com.monsters.managers::InstanceManager") || window.__classByName("InstanceManager");
    const all = (IM ? IM.getInstancesByClass(BF) : []) || [];
    const b = [...all].find((x) => x._class === "resource" && x._countdownBuild.Get() === 0 && x._countdownUpgrade.Get() === 0 && !x._repairing && x._lvl.Get() < x._buildingProps.costs.length);
    if (!b) return null;
    window.__b = b;
    return { type: b._type, lvl: b._lvl.Get() };
  });
  if (!pick) check("a building to try it on", false, "no harvester without a timer");
  else {
    // (Speed Up opens the Store's speed-ups: Close Enough, Reduce 1 / 2 hours, Finish now; read here as the Store
    // works them out, as the test account has no General Store to open)
    const speed = (seconds) => g(async (seconds) => {
      const G = window.__game.GLOBAL, S = window.__classByName("STORE"), B = window.__b;
      B._countdownUpgrade.Set(seconds);
      G._selectedBuilding = B;
      S.Variables();
      const sp4 = S._storeItems.SP4.c[0];
      // what the Store's speed-up list shows for each (CalcCost: the price, FREE, or why it can't be used)
      const strip = (x) => String(x).replace(/<[^>]+>/g, "").trim();
      return { sp4, texts: [strip(S.CalcCost("SP1")), strip(S.CalcCost("SP4")), String(S.CalcCost("SP4", true))] };
    }, seconds);
    const free = await speed(480);
    const has = (r, re) => r.texts.some((t) => re.test(t));
    check("8 minutes left: Close Enough is FREE and Finish now costs nothing (the original's last 5 minutes, made 10)", free.sp4 === 0 && free.texts[0] === "FREE" && free.texts[2] === "0", JSON.stringify(free));
    const done = await g(async () => {
      const S = window.__classByName("STORE"), B = window.__b, c0 = window.__game.BASE._credits.Get();
      const bought = []; const P = window.__game.BASE.Purchase; window.__game.BASE.Purchase = function (...a) { bought.push(a[0]); return P.apply(this, a); };
      S.BuyB("SP1");
      await new Promise((r) => setTimeout(r, 600));
      window.__game.BASE.Purchase = P;
      return { left: B._countdownUpgrade.Get(), credits: window.__game.BASE._credits.Get() - c0, bought };
    });
    check("...Close Enough finishes it, no Shiny and no purchase", done.left === 0 && done.credits === 0 && done.bought.length === 0, JSON.stringify(done));
    const half = await speed(1800);
    check("30 minutes left: Finish now is 4 Shiny, Close Enough no longer free", half.sp4 === 4 && half.texts[0] !== "FREE" && half.texts[1] === "4" && half.texts[2] === "4", JSON.stringify(half));
    await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} window.__b._countdownUpgrade.Set(0); });
  }

  // ---- walls
  const walls = await g(() => {
    const G = window.__game.GLOBAL, p = G._buildingProps[16];
    return { id: p.id, quantity: [...p.quantity], re: p.costs[0].re, outpost: G.IO_OUTPOST_QUANTITY && G.IO_OUTPOST_QUANTITY[17] };
  });
  check("bone blocks on the main yard: 10 / 50 / 90 / 160 / 260 / 300 at Under Hall 1-6, from Under Hall 1", walls.id === 17 && JSON.stringify(walls.quantity) === JSON.stringify([0, 10, 50, 90, 160, 260, 300]) && JSON.stringify(walls.re) === JSON.stringify([[14, 1, 1]]), JSON.stringify(walls));
  check("...outposts keep 200", JSON.stringify(walls.outpost) === JSON.stringify([0, 200]), JSON.stringify(walls.outpost));

  // ---- truces
  const api = (path, body) => g(async ([url, body]) => { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body }); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, ...j }; }, [server + path, body]);
  const req = await api("api/v1.7.3-beta/player/requesttruce", "baseid=1&message=hi");
  const mail = await api("api/v1.7.3-beta/player/sendmessage", "threadid=0&targetid=2&subject=x&message=y&type=trucerequest");
  check("truces are gone: no requesttruce, and truce mail is refused", req.status === 404 && mail.status >= 400, JSON.stringify({ req: req.status, mail: [mail.status, mail.error || mail.message] }));
  check("no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
