// The Brimstone Pit's Balthazar's Ascent in the game (milestone 4), played with the mouse (about a minute
// and a half: two rounds):
//  - at Pit level 4 Ascent is open; the round is shown counting down to take-off
//  - a bet placed by hand (the Shiny taken, "On board"); Balthazar takes off, the multiplier climbs and he
//    moves; "Cash out" shows the live payout; cashed out: paid what the server says
//  - shot down at the round's crash point (the round made to crash between 2.2x and 2.6x): the readout
//    shows it, the crash point is in the history strip
//  - the next round with an automatic 1.50x (made to crash between 1.8x and 2x): paid during the flight,
//    and shown in the players' list
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-m4-test.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHmac, createHash, randomBytes } from "node:crypto";
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
sql(`UPDATE bym.save SET credits = 5000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 4}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
const G = 0.00006;
const mult = (t) => Math.max(1, Math.floor(100 * Math.exp(G * Math.max(0, t)) + 1e-9) / 100);
const crashOf = (seed) => { const b = createHmac("sha256", seed).update("ascent:0:0").digest(); const u = b[0] / 256 + b[1] / 65536 + b[2] / 16777216 + b[3] / 4294967296; return Math.min(1000, Math.max(1, Math.floor((100 * 0.9999) / (1 - u) + 1e-9) / 100)); };
/**
 * What a win of `amount` on a round pays in whole Shiny: the part paid as one more Shiny when the first
 * number of HMAC(round seed, "pay:<bet id>:0:0") is under it (the seed and bet read from the database).
 */
const roundPay = (roundId, userid, amount) => {
  const [seed, id] = sql(`SELECT r.seed || '|' || b.id FROM bym.casino_round r JOIN bym.casino_bet b ON b.round_id = r.id WHERE r.id = ${roundId} AND b.user_id = ${userid}`).split("|");
  const h = createHmac("sha256", seed).update(`pay:${id}:0:0`).digest();
  const u = h[0] / 256 + h[1] / 65536 + h[2] / 16777216 + h[3] / 4294967296;
  const w = Math.floor(amount + 1e-9), p = Math.round((amount - w) * 1e6) / 1e6;
  return w + (u < p ? 1 : 0);
};
const flightOf = (c) => { if (c <= 1) return 0; let t = Math.max(0, Math.floor(Math.log(c) / G) - 2); while (mult(t) < c) t++; return t; };
/** The round now open for bets made to crash in [lo, hi). */
const forceCrash = (roundId, lo, hi) => {
  let seed, crash;
  do { seed = randomBytes(32).toString("hex"); crash = crashOf(seed); } while (crash < lo || crash >= hi);
  const f = flightOf(crash);
  sql(`UPDATE bym.casino_round SET seed = '${seed}', seed_hash = '${createHash("sha256").update(seed).digest("hex")}', params = '{"crash": ${crash}, "flight_ms": ${f}}'::jsonb, ends_at = starts_at + make_interval(secs => ${f / 1000}) WHERE id = ${roundId}`);
  return crash;
};
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /casino|brimstone/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
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
    window.__as = () => window.__named("casinoAscent", window.__cw());
    window.__classByName("com.monsters.casino::CasinoWindow").Show();
  });
  const clickNamed = async (name) => {
    const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
    if (!p) return false;
    await page.mouse.click(p.x, p.y);
    return true;
  };
  const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
  const view = () => g(() => { const a = window.__as(); const s = a._state || {}; return { phase: s.phase, round: s.round_id, left: s.starts_at - (Date.now() + a._offset), mult: window.__named("casinoAscentMultiplier", window.__cw()).text, status: window.__named("casinoAscentStatus", window.__cw()).text, action: a._actionMode, actionText: a._action.getChildAt(0).text, bx: a._balthazar.x, by: a._balthazar.y, mine: s.my_bet, shown: window.__C().credits() }; });
  const waitView = async (test, timeout = 60000) => { const end = Date.now() + timeout; for (;;) { const v = await view(); if (test(v)) return v; if (Date.now() > end) throw new Error("timed out: " + JSON.stringify(v)); await page.waitForTimeout(200); } };
  await page.waitForFunction(() => window.__cw() && window.__named("casinoTile:ascent", window.__cw()), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const open = await g(() => window.__named("casinoTile:ascent", window.__cw()).buttonMode);
  check("Pit level 4: Balthazar's Ascent open", open === true);
  await clickNamed("casinoTile:ascent");
  // a round with time to bet
  let v = await waitView((x) => x.phase === "betting" && x.left > 6000, 90000);
  check("the round counts down to take-off; BET ready", /TAKING OFF IN \d+s/.test(v.status) && v.action === "bet" && v.mult === "1.00x", JSON.stringify(v));
  const crash1 = forceCrash(v.round, 2.2, 2.6);
  await clickNamed("casinoChip:25");
  const c0 = await g(() => window.__C().credits());
  await clickNamed("casinoButton:BET");
  v = await waitView((x) => x.mine != null, 5000);
  check("a bet by hand: 25 taken, on board", v.shown === c0 - 25 && credits() === c0 - 25 && v.mine.stake === 25 && v.mine.auto === null && /On board/.test(await toast()), JSON.stringify(v.mine));
  await page.screenshot({ path: `${shots}/casino-m4-1-betting.png` });
  v = await waitView((x) => x.phase === "flying", 20000);
  await page.waitForTimeout(2500);
  const f1 = await view();
  await page.waitForTimeout(1500);
  const f2 = await view();
  await page.screenshot({ path: `${shots}/casino-m4-2-flying.png` });
  check("he flies: the multiplier climbs, he moves up and right; Cash out shows the live payout", parseFloat(f2.mult) > parseFloat(f1.mult) && f2.bx > f1.bx && f2.by < 245 && f2.action === "cashout" && /CASH OUT \d+/.test(f2.actionText), JSON.stringify([f1.mult, f2.mult, f2.bx, f2.by, f2.actionText]));
  await waitView((x) => parseFloat(x.mult) >= 1.4, 20000);
  await clickNamed("casinoButton:BET");
  v = await waitView((x) => x.mine && x.mine.cashed != null, 5000);
  check(`cashed out by hand at ${v.mine.cashed}x: paid 25 x that in whole Shiny (${v.mine.payout}), the server's Shiny`, v.mine.cashed >= 1.4 && v.mine.cashed < crash1 && v.mine.payout === roundPay(v.round, uid, 25 * v.mine.cashed) && v.shown === credits() && credits() === c0 - 25 + v.mine.payout && /Cashed out/.test(await toast()), JSON.stringify(v.mine));
  v = await waitView((x) => x.phase === "crashed", 30000);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${shots}/casino-m4-3-shotdown.png` });
  const hist = await g(() => window.__texts(window.__as()._history));
  check(`shot down at ${crash1}x: the readout and the history show it`, v.mult === `${crash1.toFixed(2)}x` && /SHOT DOWN AT/.test(v.status) && hist[0] === `${crash1.toFixed(2)}x`, JSON.stringify([v.mult, v.status, hist.slice(0, 3)]));
  // the next round: an automatic 1.50x
  v = await waitView((x) => x.phase === "betting" && x.left > 6000, 30000);
  forceCrash(v.round, 1.8, 2);
  await g(() => { window.__named("casinoAutoField", window.__cw()).text = "1.5"; });
  await clickNamed("casinoChip:10");
  const c1 = await g(() => window.__C().credits());
  await clickNamed("casinoButton:BET");
  v = await waitView((x) => x.mine != null, 5000);
  check("a bet with an automatic 1.50x", v.mine.auto === 1.5 && v.shown === c1 - 10, JSON.stringify(v.mine));
  v = await waitView((x) => x.mine && x.mine.cashed != null, 40000);
  const list = await g(() => window.__texts(window.__as()._players));
  await page.screenshot({ path: `${shots}/casino-m4-4-auto.png` });
  check("the automatic cash-out paid during the flight (15), in the players' list", v.phase === "flying" && v.mine.cashed === 1.5 && v.mine.payout === 15 && credits() === c1 - 10 + 15 && list.some((t) => /1\.50x \+15/.test(t)), JSON.stringify([v.phase, v.mine, list]));
  await waitView((x) => x.phase === "crashed", 30000);
  await clickNamed("casinoClose");
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-m4-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
}
