// Fixes for problems sent in by the automatic bug reports (admin panel, Bugs tab):
//  - a Compound bunker still being built (level 0) under attack stopped the game ("reading 'range'")
//  - login with a mistyped email (john..doe@x.com) or a password that breaks the rules for new ones answered
//    500 "Something went wrong" (reported as "URLLoaderApi HTTP status 500"); registration did the same
//    instead of saying what is wrong
//  - the line about a failed request says which request it was ("HTTP 404 on /path: ... (12 ms)")
//  - resources: the server never keeps a negative amount; the game's own "Negative ... reset" line says
//    what the server last sent
//   EMAIL=... PASSWORD=... node tools/test/bug-reports-test.mjs
// Prints one line per check; every line must end in "ok". Leaves the account's resources as they were.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const api = `${server}api/v1.7.3-beta/player/`;
const form = (body) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);

// the server's answers
const answer = async (path, body) => { const r = await fetch(api + path, form(body)); let j = {}; try { j = await r.json(); } catch (e) {} return { status: r.status, error: j.error }; };
const credentials = /login credentials are incorrect/;
for (const [what, email, password] of [["mistyped email", "john..doe@example.com", "Hunter22!x"], ["email ending in a dot before @", "john.@example.com", "Hunter22!x"], ["short password", process.env.EMAIL, "abc"], ["empty password", process.env.EMAIL, ""]]) {
  const a = await answer("getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
  check(`login, ${what}: "credentials are incorrect", not a server error`, a.status === 409 && credentials.test(a.error), JSON.stringify(a));
}
for (const [what, body, message] of [["short password", "username=abcd&email=new1%40example.com&password=short", /at least 8 characters/], ["one-letter name", "username=a&email=new2%40example.com&password=Hunter22!x", /between 2 and 12/], ["mistyped email", "username=abcd&email=bad..x%40example.com&password=Hunter22!x", /Invalid email/]]) {
  const a = await answer("register", body);
  check(`register, ${what}: says what is wrong`, a.status === 400 && message.test(a.error), JSON.stringify(a));
}

const login = await (await fetch(api + "getinfo", form(`version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`))).json();
const token = login.token;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.click(857, 242); await page.waitForTimeout(800);
for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
const g = (fn, arg) => page.evaluate(fn, arg);
// asked from the page with the game's own login (the game logging in replaces the one above)
const serverBone = () => g(async (server) => (await (await fetch(`${server}worldmapv2/getarea`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${window.__classByName("LOGIN").token}` }, body: "x=0&y=0&sendresources=1" })).json()).resources.r1, server);

// a bunker still being built (level 0, full health) looking for targets
const bunker = await g(() => { const B = window.__classByName("HOUSINGBUNKER"); const b = new B(); b._lvl.Set(0); try { b.FindTargets(3); return { ok: true, creeps: b._targetCreeps.length, flyers: b._targetFlyers.length }; } catch (e) { return { ok: false, error: e.message }; } });
check("a bunker being built (level 0) looks for targets without stopping the game", bunker.ok && bunker.creeps === 0 && bunker.flyers === 0, JSON.stringify(bunker));

// the failed request's path is in the status line
await g(() => { new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL.serverUrl + "io-no-such-page?x=1", [], () => {}, () => {}); });
await page.waitForTimeout(2500);
const line = await g(() => window.__classByName("com.monsters.debug::IoBugReport")._recent.filter((l) => /HTTP 404 on/.test(l)).pop() || "");
check("the HTTP status line says which request failed (an answer, so not an error)", /\[log\] HTTP 404 on \/io-no-such-page(: .*)? \(\d+ ms\)$/.test(line), line);

// the game's own reset line says what the server last sent
const reset = await g(() => { const B = window.__game.BASE, R = window.__classByName("com.monsters.debug::IoBugReport"); B._blockSave = true; const before = B._resources.r1.Get(), delta = B._deltaResources.r1 ? B._deltaResources.r1.Get() : null, hp = B._hpDeltaResources.r1; B._resources.r1.Set(-50); B.fixNegativeResourceValues(); const l = R._recent.filter((x) => /Negative twigs reset/.test(x)).pop() || ""; const after = B._resources.r1.Get(); B._resources.r1.Set(before); B._hpResources.r1 = before; if (delta === null) delete B._deltaResources.r1; else B._deltaResources.r1.Set(delta); B._hpDeltaResources.r1 = hp; B._blockSave = false; return { line: l, after }; });
check("the negative reset line says what the server last sent", reset.after === 0 && /Negative twigs reset: -50 \(server last sent (load|save|update) -?\d+\/-?\d+\/-?\d+\/-?\d+ at \d+, now \d+\)/.test(reset.line), reset.line);

// the server never keeps a negative amount: spend more bone than the server has
const bone = await serverBone();
const spend = (amount) => g((amount) => { const B = window.__game.BASE, S = window.__classByName("com.cc.utils::SecNum"); B._deltaResources.r1 = new S(amount); B._hpDeltaResources.r1 = amount; B._deltaResources.dirty = true; B._hpDeltaResources.dirty = true; B.Save(0, false, true); }, amount);
await spend(-(bone + 5000));
await page.waitForFunction(() => !window.__game.BASE._saving, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1500);
const floor = await serverBone();
await spend(bone);
await page.waitForFunction(() => !window.__game.BASE._saving, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1500);
const back = await serverBone();
check("spending more than the server has leaves 0 there, not a negative amount", floor === 0, `had ${bone}, then ${floor}`);
check("the bone is put back", back === bone, `${back} (was ${bone})`);
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
