// The Brimstone Pit's Bone Pile in the game (milestone 3), played with the mouse:
//  - 25 piles; the Sabnox count set with - / + and the quick buttons, the first pile's multiplier shown
//  - a game started (the bet off the Shiny at once), two safe piles opened: magma crystals, the
//    multiplier the server says
//  - the page reloaded mid-game: the lobby says the game is open, and opening Bone Pile picks it up
//    where it was (the same piles open, cash-out ready)
//  - cashed out: the crystals fly to the Shiny, which ends where the server's is; the Sabnox shown
//  - a Sabnox opened: the bet lost, the Sabnox bursts out, the rest shown
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-m3-test.mjs
// The account's yard gets a level 2 Pit for the test (the yard's saving blocked); its Shiny is put back.
// (The test reads the player's secret seed from the database to know which piles are safe.)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const credits = () => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
const startCredits = credits();
const PIT_ID = 999141;
sql(`UPDATE bym.save SET credits = 5000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 2}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
sql(`UPDATE bym.casino_session SET status = 'refunded' WHERE user_id = ${uid} AND status = 'open'`);
const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; return () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; };
const nextMines = (m) => {
  const s = JSON.parse(sql(`SELECT row_to_json(s) FROM bym.casino_seed s WHERE user_id = ${uid}`));
  const next = stream(s.server_seed, s.client_seed, s.nonce);
  const order = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 24; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const mines = order.slice(0, m).sort((a, b) => a - b);
  // the bet's next number: whether a part of a Shiny won is paid
  mines.u = next();
  return mines;
};
const mult = (k, m) => { let r = 1; for (let i = 0; i < k; i++) r *= (25 - i) / (25 - m - i); return Math.min(1000, Math.floor(0.9999 * r * 100 + 1e-7) / 100); };
/** A win of `amount` in whole Shiny: the part paid as one more Shiny when the bet's number `u` is under it. */
const pay = (amount, u) => { const w = Math.floor(amount + 1e-9), p = Math.round((amount - w) * 1e6) / 1e6; return w + (u < p ? 1 : 0); };


// (a login token is taken by the game when it logs in: a new one for every page load)
const newToken = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
// (the seed row exists once the player has asked for casino/state)
await fetch(server + "casino/state", { method: "POST", headers: { Authorization: `Bearer ${await newToken()}` } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// (errors the game catches and reports as bug reports are written to the console)
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /casino|brimstone/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
const load = async () => {
  await page.goto(`${server}?token=${await newToken()}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => {
    window.__game.BASE._blockSave = true;
    window.__cw = () => window.__game.GLOBAL._layerTop.getChildByName("casinoWindow");
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
    window.__C = () => window.__classByName("com.monsters.casino::CASINO");
    window.__bp = () => window.__named("casinoBonePile", window.__cw());
    window.__classByName("com.monsters.casino::CasinoWindow").Show();
  });
  await page.waitForFunction(() => window.__cw() && window.__named("casinoTile:bonepile", window.__cw()), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
};
const clickNamed = async (name) => {
  const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
  if (!p) return false;
  await page.mouse.click(p.x, p.y);
  return true;
};
const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
const shown = () => g(() => window.__C().credits());
const info = () => g(() => window.__named("casinoBoneInfo", window.__cw()).text);
try {
  await load();
  await clickNamed("casinoTile:bonepile");
  await page.waitForTimeout(1500);
  const piles = await g(() => Array.from({ length: 25 }, (_, i) => !!window.__named("casinoPile:" + i, window.__cw())).filter(Boolean).length);
  check("Bone Pile: 25 piles", piles === 25, String(piles));
  await clickNamed("casinoSabnoxMore");
  await clickNamed("casinoSabnoxMore");
  const five = await g(() => window.__bp()._sabnox);
  await clickNamed("casinoToggle:3");
  const three = await g(() => window.__bp()._sabnox);
  check(`the Sabnox count: + twice makes 5, the quick 3 makes 3; the first pile shown at ${mult(1, 3)}x`, five === 5 && three === 3 && (await info()).includes(`FIRST PILE ${mult(1, 3)}x`), `${five} ${three} ${await info()}`);
  // a game
  const mines = nextMines(3);
  const safe = Array.from({ length: 25 }, (_, i) => i).filter((t) => !mines.includes(t));
  await clickNamed("casinoChip:10");
  const c0 = await shown();
  await clickNamed("casinoButton:START");
  await page.waitForFunction(() => window.__bp()._game != null, null, { timeout: 10000 });
  check("started: 10 off the Shiny at once, the server's balance", (await shown()) === c0 - 10 && credits() === c0 - 10);
  for (const t of safe.slice(0, 2)) { await clickNamed("casinoPile:" + t); await page.waitForFunction((n) => window.__bp()._game && window.__bp()._game.revealed.length === n && !window.__bp()._pending, safe.indexOf(t) + 1, { timeout: 10000 }); await page.waitForTimeout(500); }
  const two = await g((s) => ({ crystals: s.map((t) => window.__bp()._piles[t].crystal.visible), info: window.__named("casinoBoneInfo", window.__cw()).text }), safe.slice(0, 2));
  await page.screenshot({ path: `${shots}/casino-m3-1-two-safe.png` });
  check(`two safe piles: magma crystals, the multiplier ${mult(2, 3)}x`, two.crystals.every(Boolean) && two.info.includes(`${mult(2, 3)}x`), JSON.stringify(two));
  // reload mid-game
  await load();
  const tile = await g(() => window.__texts(window.__named("casinoTile:bonepile", window.__cw())));
  check("after a reload the lobby says the game is open", tile.includes("Your game is open"), JSON.stringify(tile));
  await clickNamed("casinoTile:bonepile");
  await page.waitForTimeout(1500);
  const resumed = await g((s) => { const b = window.__bp(); return { game: !!b._game, crystals: s.map((t) => b._piles[t].crystal.visible), cash: b._cashout.visible && b._cashout.casinoEnabled }; }, safe.slice(0, 2));
  check("opening Bone Pile picks the game up: the same piles open, cash-out ready", resumed.game && resumed.crystals.every(Boolean) && resumed.cash && /where you left it/.test(await toast()), JSON.stringify(resumed));
  // cash out
  const before = await shown();
  await clickNamed("casinoButton:CASH OUT");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/casino-m3-2-cashing.png` });
  await page.waitForTimeout(1500);
  const want = pay(10 * mult(2, 3), mines.u);
  const after = await g((m) => ({ shown: window.__C().credits(), sabnox: m.map((t) => window.__bp()._piles[t].sabnox.visible), game: window.__bp()._game }), mines);
  check(`cashed out: +${want}, the Shiny shown is the server's; the three Sabnox shown`, after.shown === before + want && after.shown === credits() && after.sabnox.every(Boolean) && after.game === null, JSON.stringify(after));
  await page.screenshot({ path: `${shots}/casino-m3-3-cashed.png` });
  // a Sabnox
  await clickNamed("casinoToggle:5");
  const mines2 = nextMines(5);
  const c1 = await shown();
  await clickNamed("casinoButton:START");
  await page.waitForFunction(() => window.__bp()._game != null, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  await clickNamed("casinoPile:" + mines2[0]);
  await page.waitForFunction(() => window.__bp()._over, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/casino-m3-4-sabnox.png` });
  const lost = await g((m) => ({ sabnox: m.map((t) => window.__bp()._piles[t].sabnox.visible), shown: window.__C().credits(), info: window.__named("casinoBoneInfo", window.__cw()).text }), mines2);
  check("a Sabnox: the bet lost, it and the other four shown", lost.sabnox.every(Boolean) && lost.shown === c1 - 10 && lost.shown === credits() && /SABNOX/.test(lost.info), JSON.stringify(lost));
  const ledger = sql(`SELECT string_agg(status || ':' || payout, ',' ORDER BY id) FROM (SELECT * FROM bym.casino_bet WHERE user_id = ${uid} AND game = 'bonepile' ORDER BY id DESC LIMIT 2) b`);
  check("the ledger: the game cashed out and the game lost", ledger === `settled:${want},settled:0`, ledger);
  await clickNamed("casinoClose");
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-m3-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.casino_session SET status = 'refunded' WHERE user_id = ${uid} AND status = 'open'`);
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
}
