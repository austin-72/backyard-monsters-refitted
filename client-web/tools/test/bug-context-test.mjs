// Bug reports of 26 September, and reports that say more:
//  - #36/#37: "Ascend monsters" sent an inferno-only player's monsters to a separate Inferno yard that
//    doesn't exist (a 500): the game doesn't offer it, and the server answers instead of failing
//  - #35: an outdated client told to update (/init) is not a bug report
//  - #33: a monster cleared twice ("m_children is not iterable"), #32: the map tutorial's picture arriving
//    after its window closed, #31: a browser with only webkitAudioContext (older Safari) or no Web Audio
//  - a report says who (account), with what (the browser), where (mode, yard, popup), what the player
//    clicked, the last popups and requests; a server failure's report gets the game's side added (ref)
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... node tools/test/bug-context-test.mjs
// Needs a local test server and database (psql). Prints one line per check; every line must end in "ok".
// Removes the bug reports it makes.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const login = async () => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const token = await login();
const lastBug = () => Number(sql("SELECT coalesce(max(id), 0) FROM bym.bug_report"));
const firstBug = lastBug();
const since = sql("SELECT now()"); // reports made or counted again by this test

// 1. the server: no Inferno yard to send monsters up from is an answer, not a 500
const get = await post("api/v1.7.3-beta/bm/base/infernomonsters", "type=get", token);
check("infernomonsters get: nothing there, no error", get.status === 200 && get.error === 0 && JSON.stringify(get.imonsters) === "{}", JSON.stringify(get));
const set = await post("api/v1.7.3-beta/bm/base/infernomonsters", `type=set&imonsters=${encodeURIComponent("{\"IC1\":1}")}`, token);
check("infernomonsters set: a clear 404, not a 500", set.status === 404 && /can't be sent up/.test(set.error || ""), JSON.stringify({ status: set.status, error: set.error }));
// an old client's /init "update now" answer, reported: not kept
await post("bugreport", `message=${encodeURIComponent("URLLoaderApi HTTP status 500 Internal Server Error /init")}&context=x&build=1`);
await post("bugreport", `message=${encodeURIComponent("[v128r0] URLLoader Load Error (HTTP 500) https://inferno.example.com/init")}&context=x&build=1`);
check("an outdated client's /init answer is not a bug report", lastBug() === firstBug, `${lastBug()} vs ${firstBug}`);

// 2. the game
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (init) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (init) await page.addInitScript(init);
  // (a fresh login each time: the game that logs in with one replaces it)
  await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
  const ok = await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 }).then(() => true, () => false);
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
  return { page, errors, ok };
};
const { page, errors } = await open();
const g = (fn, arg) => page.evaluate(fn, arg);
const asked = [];
page.on("request", (r) => { if (/infernomonsters/.test(r.url())) asked.push(r.url()); });

await g(() => { window.__classByName("INFERNOPORTAL").AscendMonsters(); });
await page.waitForTimeout(1500);
check("Ascend monsters asks the server nothing on an inferno-only yard", asked.length === 0 && !(await g(() => window.__classByName("PLEASEWAIT")._mc && window.__classByName("PLEASEWAIT")._mc.parent)), JSON.stringify(asked));
const tut = await g(() => { const T = window.__classByName("com.monsters.maproom_advanced::Tutorial"); try { T.prototype.ImageLoaded.call({ _currImageUrl: "ui/x.png", _bigPopup: null }, "ui/x.png", null); return "ok"; } catch (e) { return e.message; } });
check("the map tutorial's picture after its window closed: nothing happens", tut === "ok", tut);
const twice = await g(() => { const G = window.__classByName("com.monsters::GameObject"); try { const o = new G(); o.clear(); o.clear(); return "ok"; } catch (e) { return e.message; } });
check("a monster cleared twice: no error", twice === "ok", twice);

// a click, a popup, a message: in the report
await page.mouse.click(640, 500);
await page.waitForTimeout(300);
await g(() => { window.__game.GLOBAL.Message("bug-context-test says hello"); });
await page.waitForTimeout(500);
const trail = await g(() => { const R = window.__classByName("com.monsters.debug::IoBugReport"); return { clicks: R._clicks.slice(), screens: R._screens.slice(), requests: R._requests.slice() }; });
check("clicks are noted", trail.clicks.length > 0 && /^\d\d:\d\d:\d\d \S/.test(trail.clicks[trail.clicks.length - 1]), JSON.stringify(trail.clicks.slice(-2)));
check("messages and yards are noted", trail.screens.some((l) => /message: bug-context-test says hello/.test(l)) && trail.screens.some((l) => /yard: build base/.test(l)), JSON.stringify(trail.screens.slice(-3)));
check("requests are noted, repeats counted", trail.requests.length > 0 && trail.requests.every((l) => /^\d\d:\d\d:\d\d \/\S* (\d{3}|no answer) \d+ ms( x\d+)?$/.test(l)), JSON.stringify(trail.requests.slice(-3)));

// a server failure, as the game meets it: one report, with both sides
await page.waitForTimeout(2500);
await g(() => { new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL._infBaseURL + "infernomonsters", [["io", "bug-context-test"]], () => {}, () => {}); });
await page.waitForTimeout(6000);
const sctx = sql(`SELECT replace(context, E'\\n', ' ') FROM bym.bug_report WHERE last_seen >= '${since}' AND title LIKE 'Server # on POST %infernomonsters%' ORDER BY last_seen DESC LIMIT 1`);
check("the server's report of its 500: account, client, the request's values", /account: \S+ \(#\d+\) \| client: browser: Mozilla/.test(sctx) && /request values: io=bug-context-test/.test(sctx) && /ref: [0-9a-f]{8}/.test(sctx), sctx.slice(0, 200));
check("the game's side is added to it: where, clicks, requests, log", /In the game:/.test(sctx) && /HTTP 500 on \/api\/\S+\/infernomonsters/.test(sctx) && /Last clicks:/.test(sctx) && /Last requests:/.test(sctx) && /mode: build \| yard: inferno main/.test(sctx), sctx.slice(sctx.indexOf("In the game:"), sctx.indexOf("In the game:") + 300));
const dup = sql(`SELECT count(*) FROM bym.bug_report WHERE last_seen >= '${since}' AND title LIKE 'HTTP # on %infernomonsters%'`);
check("not a second report of the same failure", dup === "0", dup);

// an error in the game: the report says who, with what, where
await page.waitForTimeout(2500);
await g(() => { window.__game.LOGGER.Log("err", "bug-context-test: an error in the game"); });
await page.waitForTimeout(4000);
const own = sql(`SELECT replace(context, E'\\n', ' ') FROM bym.bug_report WHERE last_seen >= '${since}' AND title LIKE 'bug-context-test: an error%' LIMIT 1`);
check("a game error's report: account and browser first", /^account: \S+ \(#\d+\) \| client: browser: Mozilla/.test(own), own.slice(0, 160));
check("...then where the player is", /mode: build \| yard: inferno main \(type \d+\)/.test(own) && /\| running: \d+ min/.test(own), own.slice(0, 400));
check("...and the popups, messages and yards before", /Last popups, messages and yards: .*message: bug-context-test says hello/.test(own), "");
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await page.close();

// 3. browsers without AudioContext: older Safari (webkitAudioContext only), and none at all
for (const [what, init] of [
  ["only webkitAudioContext (older Safari)", () => { window.webkitAudioContext = window.AudioContext; delete window.AudioContext; }],
  ["no Web Audio at all", () => { delete window.AudioContext; delete window.webkitAudioContext; }],
]) {
  const b = await open(init);
  await b.page.evaluate(() => { try { window.__game.SOUNDS.Play("click1"); } catch (e) {} });
  await b.page.mouse.click(640, 500);
  await b.page.waitForTimeout(1500);
  check(`${what}: the game runs, no errors`, b.ok && b.errors.length === 0, b.errors.slice(0, 2).join("; "));
  await b.page.close();
}

await browser.close();
sql(`DELETE FROM bym.bug_report WHERE first_seen >= '${since}' OR title LIKE 'bug-context-test%' OR (title LIKE 'Server # on POST %infernomonsters%' AND details LIKE '%invalid_type%')`);
check("the test's bug reports are removed", sql(`SELECT count(*) FROM bym.bug_report WHERE first_seen >= '${since}'`) === "0");
