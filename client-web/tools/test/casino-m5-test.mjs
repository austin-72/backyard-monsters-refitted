// The Brimstone Pit's Magma Derby in the game (milestone 5), played with the mouse (about a minute: the
// test brings the race's start forward):
//  - at Pit level 5 the Derby is open, the lobby shows the Ascent and Derby rounds live; the odds board
//    shows six runners, the clock counts down
//  - chips put on two monsters (one the winner, read from the database), the bet placed: the Shiny taken,
//    the slip shown
//  - the race: the runners set off and move along the track, the view follows the leader
//  - the finish: the podium with the winner, the board marks it, the player's winnings shown, the Shiny
//    the server's
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-m5-test.mjs
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

const PIT_ID = 999141;
sql(`UPDATE bym.save SET credits = 5000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 5}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
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
    window.__dg = () => window.__named("casinoDerby", window.__cw());
    window.__classByName("com.monsters.casino::CasinoWindow").Show();
  });
  const clickNamed = async (name) => {
    const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
    if (!p) return false;
    await page.mouse.click(p.x, p.y);
    return true;
  };
  const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
  const view = () => g(() => { const d = window.__dg(); const s = d._state || {}; return { phase: s.phase, round: s.round_id, left: s.starts_at - (Date.now() + d._offset), runners: (s.runners || []).map((r) => r.id), status: window.__named("casinoDerbyStatus", window.__cw()).text, mine: window.__named("casinoDerbyMine", window.__cw()).text, groundX: d._ground.x, xs: Object.fromEntries(Object.entries(d._runners).map(([k, o]) => [k, Math.round(o.s.x)])), shown: window.__C().credits() }; });
  const waitView = async (test, timeout = 60000) => { const end = Date.now() + timeout; for (;;) { const v = await view(); if (test(v)) return v; if (Date.now() > end) throw new Error("timed out: " + JSON.stringify(v)); await page.waitForTimeout(250); } };
  await page.waitForFunction(() => window.__cw() && window.__named("casinoTile:derby", window.__cw()), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  check("Pit level 5: Magma Derby open", await g(() => window.__named("casinoTile:derby", window.__cw()).buttonMode) === true);
  const lines = await g(() => ["ascent", "derby"].map((id) => window.__named("casinoLive:" + id, window.__cw()).text));
  check("the lobby's tiles show the shared rounds live (Ascent's flight, the Derby's next race)", /^(Flying: \d+\.\d\dx|Taking off in \d+s|Next flight soon)$/.test(lines[0]) && /^(Next race in \d:\d\d|Racing now!|Next race soon)$/.test(lines[1]), JSON.stringify(lines));
  await clickNamed("casinoTile:derby");
  let v = await waitView((x) => x.phase === "betting" && x.left > 20000, 120000);
  const board = await g(() => ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox", "wormzer"].filter((m) => window.__named("casinoOdds:" + m, window.__cw())));
  check("the odds board: six runners; the clock counts down", board.length === 6 && board.every((m) => v.runners.includes(m)) && /RACE IN \d:\d\d/.test(v.status), JSON.stringify([board, v.status]));
  const race = JSON.parse(sql(`SELECT params FROM bym.casino_round WHERE id = ${v.round}`));
  const winner = race.order[0], other = race.order[3];
  const odds = Object.fromEntries(race.runners.map((x) => [x.id, x.odds]));
  await clickNamed("casinoChip:10");
  await clickNamed("casinoOdds:" + winner);
  await clickNamed("casinoOdds:" + winner);
  await clickNamed("casinoOdds:" + other);
  await page.waitForTimeout(300);
  const c0 = await g(() => window.__C().credits());
  const slip = await g(() => window.__texts(window.__cw()).filter((t) => /Shiny$/.test(t)));
  await clickNamed("casinoButton:PLACE BET");
  v = await waitView((x) => /Your bets/.test(x.mine), 8000);
  await page.screenshot({ path: `${shots}/casino-m5-1-betting.png` });
  check("20 on the winner and 10 on another: 30 on the slip, placed, the Shiny taken", slip.includes("30 Shiny") && v.shown === c0 - 30 && credits() === c0 - 30 && /Bet placed/.test(await toast()), JSON.stringify([slip, v.mine]));
  // the race, brought forward
  sql(`UPDATE bym.casino_round SET starts_at = now() + interval '3 seconds', ends_at = now() + interval '43 seconds' WHERE id = ${v.round}`);
  v = await waitView((x) => x.phase === "racing", 20000);
  await page.waitForTimeout(9000);
  const r1 = await view();
  await page.waitForTimeout(3000);
  const r2 = await view();
  await page.screenshot({ path: `${shots}/casino-m5-2-racing.png` });
  const moved = Object.keys(r2.xs).every((k) => r2.xs[k] > r1.xs[k] && r1.xs[k] > 40);
  check("the race: every runner moves along the track, the view follows", moved && r2.groundX < r1.groundX && r2.status === "RACING!", JSON.stringify([r1.xs, r2.xs, r1.groundX, r2.groundX]));
  v = await waitView((x) => x.phase === "results" && x.round === r2.round, 60000);
  await page.waitForTimeout(1500);
  v = await view();
  await page.screenshot({ path: `${shots}/casino-m5-3-podium.png` });
  const want = roundPay(v.round, uid, 20 * odds[winner]);
  const podium = await g(() => window.__texts(window.__dg()._podium));
  const boardText = await g((w) => window.__texts(window.__named("casinoOdds:" + w, window.__cw())), winner);
  check(`the finish: ${winner} on the podium and marked on the board; the winnings shown`, podium.some((t) => / WINS!$/.test(t)) && boardText.includes("WINNER") && v.mine === `You won ${want.toLocaleString("en-US")} Shiny!` && new RegExp("WINNER").test(v.status), JSON.stringify([podium, boardText, v.mine, v.status]));
  check(`paid 20 x ${odds[winner]} = ${want}: the Shiny shown is the server's`, v.shown === credits() && credits() === c0 - 30 + want, `${v.shown} ${credits()}`);
  await clickNamed("casinoClose");
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-m5-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
}
