// Korath (IC9), Drull (IC10) and Rezghul (C19) are unlocked in the Strongbox only (server migration
// 20260925_RelockChampions took everyone's old unlocks away; services/base/lockedMonsters.ts guards saves):
//  - a save that marks one unlocked without the unlock ever being started is refused (a game left open
//    from before the relock, or a changed one)
//  - an unlock started in the Strongbox and finished is kept, with the Academy level trained before
//  - an instant unlock bought with shiny (store item IUN) is kept
//   EMAIL=... PASSWORD=... node tools/test/champion-lock-test.mjs
// Needs an account with at least two of the three still locked and a few shiny (the instant unlock
// spends 5). Prints one line per check; every line must end in "ok". Takes back the unlocks it made.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const login = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
let page = null;
const open = async () => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${server}?token=${await login()}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.mouse.click(857, 242); await page.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
};
const locker = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__classByName("CREATURELOCKER")._lockerData)));
const save = async () => { await page.evaluate(() => { const B = window.__game.BASE; B._saveCounterA++; B.Save(0, false, true); }); await page.waitForTimeout(500); await page.waitForFunction(() => !window.__game.BASE._saving, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1000); };

await open();
const start = await locker();
const free = ["IC9", "IC10", "C19"].filter((id) => !start[id]);
check("the account has two of them locked to test with", free.length >= 2, `locked: ${free.join(", ")}`);
if (free.length >= 2) {
  const [a, b] = free;
  // 1. marked unlocked without starting
  await page.evaluate((a) => { window.__classByName("CREATURELOCKER")._lockerData[a] = { t: 2 }; }, a);
  await save(); await open();
  check(`${a} marked unlocked without the Strongbox: refused`, !(await locker())[a], JSON.stringify((await locker())[a]));

  // 2. started in the Strongbox, finished: kept, Academy level kept
  const level = await page.evaluate((a) => { const P = window.__game.GLOBAL.player; P.m_upgrades[a] = { level: 3 }; const L = window.__classByName("CREATURELOCKER"), now = window.__game.GLOBAL.Timestamp(); L._lockerData[a] = { t: 1, s: now, e: now + 3 }; return 3; }, a);
  await save();
  await page.waitForFunction((a) => window.__classByName("CREATURELOCKER")._lockerData[a].t == 2, a, { timeout: 20000 }).catch(() => {});
  await save(); await open();
  const after = await page.evaluate((a) => ({ t: window.__classByName("CREATURELOCKER")._lockerData[a] && window.__classByName("CREATURELOCKER")._lockerData[a].t, level: window.__game.GLOBAL.player.m_upgrades[a] && window.__game.GLOBAL.player.m_upgrades[a].level }), a);
  check(`${a} unlocked in the Strongbox: kept`, after.t == 2, JSON.stringify(after));
  check(`${a} keeps the Academy level it was trained to`, after.level === level, JSON.stringify(after));

  // 3. instant unlock with shiny
  const credits = await page.evaluate((b) => { const B = window.__game.BASE; const c = B._credits.Get(); window.__classByName("CREATURELOCKER")._lockerData[b] = { t: 2 }; B.Purchase("IUN", 5, "creaturelocker"); return c; }, b);
  await page.waitForTimeout(1000); await page.waitForFunction(() => !window.__game.BASE._saving, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1000);
  await open();
  const bought = await page.evaluate((b) => ({ t: window.__classByName("CREATURELOCKER")._lockerData[b] && window.__classByName("CREATURELOCKER")._lockerData[b].t, credits: window.__game.BASE._credits.Get() }), b);
  check(`${b} bought with shiny (instant unlock): kept`, bought.t == 2 && bought.credits === credits - 5, JSON.stringify({ ...bought, before: credits }));

  // take the test's unlocks back (taking one away is always accepted)
  await page.evaluate(([a, b]) => { const L = window.__classByName("CREATURELOCKER"); delete L._lockerData[a]; delete L._lockerData[b]; }, [a, b]);
  await save(); await open();
  const end = await locker();
  check("the test's unlocks are taken back", !end[a] && !end[b], JSON.stringify(end));
}
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
