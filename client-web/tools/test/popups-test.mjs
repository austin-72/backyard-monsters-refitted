// The popups a player meets when idle, and the ones that stop the game: none may be a dead end.
//  - after 6 idle minutes (POPUPS.AFK): Invite Friends, whose button opens the top bar's Invite Friends
//    popup (invite link, Copy invite); never the Send FREE Gifts popup, not even with gifting switched on
//  - after 10 (POPUPS.Timeout, "Anyone home?"), Connection Lost (POPUPS.NoConnection), an error window, a
//    new version published, and closing any popup once the game has stopped: each one's Reload loads the
//    game again, still logged in
//   EMAIL=... PASSWORD=... node tools/test/popups-test.mjs
// Prints one line per check; every line must end in "ok". Reloads the game five times (about two minutes).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push(e.message));
const g = (fn, arg) => page.evaluate(fn, arg);

const inYard = async (timeout = 90000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      if (await g(() => !window.__reloadMark && !!window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.GLOBAL.isHalted)) return true;
    } catch (e) { /* the page is changing */ }
    await page.waitForTimeout(500);
  }
  return false;
};
const settle = async () => {
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
};
// The visible text fields under the stage, and where one is on the page.
const texts = () => g(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out; });
const findText = (label) => g((label) => { let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && o.text === label) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, label);
const click = async (label, wait = 800) => { const p = await findText(label); if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
const has = async (part) => (await texts()).some((t) => t.indexOf(part) >= 0);
const count = async (part) => (await texts()).filter((t) => t.indexOf(part) >= 0).length;
// The close button of the popup POPUPS shows now.
const closeX = () => g(() => { const m = window.__classByName("POPUPS")._mc; if (!m) return null; const f = m.mcFrame || m.mcBG; const b = f && f._buttonClose; if (!b || !b.parent || !b.parent.parent) return null; const r = b.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
const gifts = async () => (await has("FREE Gift")) || (await has("better to give")) || (await has("Send FREE"));
// Presses a Reload (or anything else that should reload) and waits for the game to be back on the yard.
const reloads = async (press) => {
  await g(() => { window.__reloadMark = 1; });
  await press();
  const back = await inYard();
  if (back) await settle();
  return back;
};

await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
check("the game opens on the yard", await inYard());
await settle();
await g(() => { window.__game.WMATTACK._enabled = false; });

// 1. Six idle minutes: Invite Friends, and its button opens the top bar's invite popup.
await g(() => { const G = window.__game.GLOBAL; G._promptedAFK = false; window.__game.POPUPS.AFK(); });
await page.waitForTimeout(800);
check("idle: the Invite Friends popup shows", await has("Having fun?"));
check("idle: not the Send FREE Gifts popup", !(await gifts()));
check("idle: its Invite Friends button opens the invite popup", (await click("Invite Friends", 1000)) && (await has("Invite a friend")) && !(await has("Having fun?")));
const link = await g(() => String(window.__game.GLOBAL._flags.io_invite));
check("the invite popup has the player's invite link", (await texts()).some((t) => t.indexOf(link) >= 0), link);
check("its Copy invite button copies", (await click("Copy invite")) && (await has("Copied!")));
let x = await closeX();
if (x) { await page.mouse.click(x.x, x.y); await page.waitForTimeout(800); }
check("its close button closes it", !!x && !(await has("Invite a friend")) && !(await g(() => window.__game.GLOBAL.isHalted)));

// 2. With gifting on (an old account's sendgift), still Invite Friends; the top bar's gift paths too.
await g(() => { const G = window.__game.GLOBAL; G._canGift = true; G._promptedAFK = false; window.__game.POPUPS.AFK(); });
await page.waitForTimeout(800);
check("idle, gifting on: Invite Friends, not Send FREE Gifts", (await has("Having fun?")) && !(await gifts()));
x = await closeX();
if (x) { await page.mouse.click(x.x, x.y); await page.waitForTimeout(800); }
check("the idle popup's close button closes it", !!x && !(await has("Having fun?")));
await g(() => { window.__game.POPUPS.Gift(true); });
await page.waitForTimeout(800);
check("the Send FREE Gifts popup is the invite one instead", (await has("Having fun?")) && !(await gifts()));
await g(() => { window.__game.POPUPS.Next(); });
await page.waitForTimeout(600);
await g(() => { window.__game.POPUPS.DisplayGiftSelect(); });
await page.waitForTimeout(800);
check("the gift dialog is the invite popup instead", (await has("Invite a friend")) && !(await gifts()));
await g(() => { window.__game.POPUPS.Next(); });
await page.waitForTimeout(600);
await g(() => { window.__game.GLOBAL._canGift = false; });

// 3. Ten idle minutes: "Anyone home?", with a Reload button that works.
await g(() => { window.__game.POPUPS.Timeout(); window.__game.POPUPS.Timeout(); });
await page.waitForTimeout(800);
check("ten idle minutes: Anyone home? shows, once", (await count("Anyone home?")) === 1 && (await g(() => window.__game.GLOBAL.isHalted)));
check("it offers Reload, not gifts or Facebook invites", !!(await findText("Reload")) && !(await gifts()) && !(await has("Invite Friends To Play")));
check("its Reload loads the game again, logged in", await reloads(() => click("Reload", 100)));

// 4. Connection Lost: one popup however often the check fails, with a Reload button.
await g(() => { window.__game.POPUPS.NoConnection(); window.__game.POPUPS.NoConnection(); window.__game.POPUPS.NoConnection(); });
await page.waitForTimeout(800);
check("Connection Lost shows, once", (await count("Connection Lost")) === 1 && (await g(() => window.__game.GLOBAL.isHalted)));
check("its Reload loads the game again, logged in", await reloads(() => click("Reload", 100)));

// 5. An error that only had the orange bar (no button): the error window with Reload.
await g(() => { const G = window.__game.GLOBAL; G.ErrorMessage("popups-test: an orange bar error", G.ERROR_ORANGE_BOX_ONLY, true); });
await page.waitForTimeout(1200);
check("an orange-bar error shows with a Reload button", (await has("popups-test: an orange bar error")) && !!(await findText("Reload")));
check("its Reload loads the game again, logged in", await reloads(() => click("Reload", 100)));

// 6. A new version published: Reload gets it.
await g(() => { const G = window.__game.GLOBAL; const f = Object.assign({}, G._flags); f.io_build = 99999999999999; G.SetFlags(f); });
await page.waitForTimeout(1200);
check("a new version: says so, with a Reload button", (await has("new version")) && (await has("Press Reload")) && !!(await findText("Reload")));
check("its Reload loads the game again, logged in", await reloads(() => click("Reload", 100)));

// 7. Closing a popup once the game has stopped (the old "reloadPage" call) reloads it too.
await g(() => { window.__game.GLOBAL.Halt(); });
check("closing a popup on a stopped game loads it again", await reloads(() => g(() => { window.__game.POPUPS.Next(); })));

check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
