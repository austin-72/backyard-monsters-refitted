// Bug reports of 30 September / 1 October (the Bugs tab, #49 to #59):
//  - #49: getarea for a zone outside the world (x=-320 y=-90) was refused; the server answers with no cells
//    and the map never asks for one
//  - #53: the main yard opened after an outpost, with no yard kind given, came up as an outpost and stopped
//    on "outpost w TH": the yard is the kind the server says
//  - #54: the stock game's way back to a separate Inferno yard ("ibuild") was refused and halted: it goes home
//  - #56/#58: login sent twice (the button clicked twice): one login only
//  - #57: a monster's splat after its yard's layers were gone (MAP._EFFECTS null)
//  - #50/#52/#55/#59: a request with no answer (the connection dropped) is "log", not a bug report, and /init
//    tries again before "Failed to connect to the server."
//   EMAIL=... PASSWORD=... node tools/test/bugs-oct1-test.mjs
// The account needs an outpost. Saving is blocked in the game; nothing is changed. Prints one line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const MR = "com.monsters.maproom_advanced::MapRoom";

// ---- 1. the server: getarea outside the world (#49)
const token = await login();
const area = async (body) => { const r = await fetch(`${server}worldmapv2/getarea`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` }, body }); let j = {}; try { j = await r.json(); } catch {} return { status: r.status, j }; };
const out = await area("x=-320&y=-90&sendresources=0");
check("getarea outside the world: answered, no cells", out.status === 200 && out.j.error === 0 && Object.keys(out.j.data || {}).length === 0, JSON.stringify({ status: out.status, error: out.j.error, keys: Object.keys(out.j.data || {}).length }));
const far = await area("x=99990&y=10&sendresources=0");
check("...past the far edge too", far.status === 200 && far.j.error === 0, JSON.stringify({ status: far.status, error: far.j.error }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  // ---- 2. /init with no answer twice: tried again, the login page opens with no "Failed to connect" (#59)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    let inits = 0;
    await page.route(/\/init(\?|$)/, (r) => { inits++; return inits <= 2 ? r.abort("connectionreset") : r.continue(); });
    await page.goto(`${server}?language=english&shell=0`);
    const t0 = Date.now();
    while (inits < 3 && Date.now() - t0 < 30000) await page.waitForTimeout(500);
    await page.waitForTimeout(4000);
    const err = await page.evaluate(() => (window.__game ? window.__game.GLOBAL.initError : "?"));
    check("/init without an answer twice: tried again, no \"Failed to connect\"", inits === 3 && err === "", JSON.stringify({ inits, err }));
    await page.close();
  }

  // ---- 3. one login for two clicks (#56/#58)
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  const g = (fn, arg) => page.evaluate(fn, arg);
  let getinfo = 0;
  page.on("request", (r) => { if (/player\/getinfo/.test(r.url())) getinfo++; });
  await page.goto(`${server}?language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.LOGIN && window.__game.GLOBAL._apiURL, null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  getinfo = 0;
  await g(([email, password]) => { const L = window.__game.LOGIN; const a = [["email", email], ["password", password]]; L.AuthenticateUser(a); L.AuthenticateUser(a); }, [process.env.EMAIL, process.env.PASSWORD]);
  const loaded = await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 }).then(() => true, () => false);
  await page.waitForTimeout(4000);
  check("login asked twice at once: one login, the yard loads", loaded && getinfo === 1, JSON.stringify({ loaded, getinfo }));
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }

  // the game's own reports and stops from here on
  await g(() => {
    const G = window.__game.GLOBAL, Lg = window.__game.LOGGER;
    window.__seen = { errs: [], logs: [], stops: [] };
    const log = Lg.Log; Lg.Log = function (t, m) { (t === "err" ? window.__seen.errs : window.__seen.logs).push(String(m)); return log.apply(this, arguments); };
    const stop = G.ErrorMessage; G.ErrorMessage = function (m) { window.__seen.stops.push(String(m)); return stop.apply(this, arguments); };
    window.__game.BASE._blockSave = true; window.__game.WMATTACK._enabled = false;
  });
  const seen = () => g(() => window.__seen);
  const waitYard = (outpost) => page.waitForFunction((o) => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0 && (o === null || window.__game.BASE.isMainYard === !o), outpost, { timeout: 60000 }).then(() => true, () => false);

  // ---- 4. the main yard after an outpost, no kind given (#53)
  await g(() => window.__game.BASE.LoadNext());
  const atOutpost = await waitYard(true);
  await page.waitForTimeout(2500);
  const home = await g(() => window.__game.GLOBAL._homeBaseID);
  await g((home) => { window.__game.BASE.LoadBase(null, 0, home, "build", false, -1); }, home);
  await page.waitForFunction(() => !window.__game.BASE._loading, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  let s = await seen();
  const main = await g(() => ({ main: window.__game.BASE.isMainYard, outpost: window.__game.BASE.isOutpost, id: window.__game.BASE._loadedBaseID }));
  check("the main yard opened after an outpost with no kind given: a main yard, no stop", atOutpost && main.main && !main.outpost && String(main.id) === String(home) && !s.stops.length && !s.errs.some((e) => /outpost w TH/.test(e)), JSON.stringify({ atOutpost, home, main, stops: s.stops, errs: s.errs.slice(0, 3) }));

  // ---- 5. the stock game's way back to an Inferno yard goes home (#54)
  await g(() => window.__game.BASE.LoadNext());
  await waitYard(true);
  await page.waitForTimeout(2000);
  await g(() => { const G = window.__game.GLOBAL; window.__game.BASE.LoadBase(G._infBaseURL, 0, 0, "ibuild", false, 2); });
  await page.waitForFunction(() => !window.__game.BASE._loading, null, { timeout: 60000 }).catch(() => {});
  const wentHome = await waitYard(false);
  await page.waitForTimeout(2500);
  s = await seen();
  const where = await g(() => ({ mode: window.__game.GLOBAL.mode, main: window.__game.BASE.isMainYard, id: window.__game.BASE._loadedBaseID }));
  check("an Inferno-yard load goes home: the main yard in build mode, no stop", wentHome && where.mode === "build" && where.main && String(where.id) === String(home) && !s.stops.length, JSON.stringify({ where, stops: s.stops, logs: s.logs.filter((l) => /Inferno yard/.test(l)) }));

  // ---- 6. a splat with the yard's layers gone (#57)
  const splat = await g(() => { const M = window.__game.MAP, keep = M._EFFECTS; M._EFFECTS = null; try { window.__game.EFFECTS.SplatParticle(10, 0, 0, 0, 0); return "ok"; } catch (e) { return String(e.message); } finally { M._EFFECTS = keep; } });
  check("a splat with the yard's layers gone does nothing", splat === "ok", splat);

  // ---- 7. no answer: "log", not a bug report (#50/#52/#55)
  await page.route("**/base/updatesaved", (r) => r.abort("connectionreset"));
  await g(() => { const G = window.__game.GLOBAL; new window.__game.URLLoaderApi().load(G._baseURL + "updatesaved", [["baseid", "0"]], function () {}, function () {}); });
  await page.waitForTimeout(2500);
  await page.unroute("**/base/updatesaved");
  s = await seen();
  check("a request with no answer is written as log, not err", s.logs.some((l) => /No answer from the server on \/base\/updatesaved/.test(l)) && !s.errs.some((l) => /No answer/.test(l)), JSON.stringify({ logs: s.logs.filter((l) => /No answer/.test(l)), errs: s.errs.filter((l) => /No answer/.test(l)) }));

  // ---- 8. the map never asks for a zone outside the world (#49) (opened from an outpost, as map-ui-test:
  // the test yard's Map Room may be down; the map waits for saves to finish)
  await g(() => { window.__game.BASE._blockSave = false; window.__game.BASE.LoadNext(); });
  await waitYard(true);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }
  let negative = 0;
  page.on("request", (r) => { if (/getarea/.test(r.url())) { const b = r.postData() || ""; if (/(^|&)(x|y)=-/.test(b) || /zones=[^&]*-/.test(decodeURIComponent(b))) negative++; } });
  await g(() => window.__game.GLOBAL.ShowMap());
  const mapOpen = await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 }).then(() => true, () => false);
  await page.waitForTimeout(3000);
  const asked = await g((MR) => { const M = window.__classByName(MR); try { M.GetCell(-320, -90, true); M.GetCell(-1, 5, true); M.GetCell(5, -1, true); return "ok"; } catch (e) { return String(e.message); } }, MR);
  await page.waitForTimeout(2500);
  check("the map asks for no zone outside the world", mapOpen && asked === "ok" && negative === 0, JSON.stringify({ mapOpen, asked, negative }));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/bugs-oct1.png` });
}
catch (e) {
  check("the test ran", false, String(e.stack || e).slice(0, 400));
}
await browser.close();
