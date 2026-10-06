// The Brimstone Pit's 5 October additions in the game, played with the mouse (about two minutes):
//  - Pit level 6: eight tiles (Korath's Fortune's with its art); the jackpot and Moloch's Favor in the lobby
//  - FREE SPIN: the Slots open and spin free; the Shiny only gains; the button then counts to tomorrow
//  - the Live tab: everyone's latest bets (the player's free spin on it), the day's biggest wins, the
//    last jackpots; asked again while it is open
//  - Korath's Fortune: SPIN, then SPIN again (STOP): the result at once; its lines drawn; AUTO plays a
//    run of spins by itself (counted in the ledger) and stops
//  - the close calls: a pair on the first two reels holds the last one back (longer for King Wormzer)
//  - a big win told across the window (BIG / MEGA / EPIC WIN), the Shiny counting up
//  - Balthazar's Ascent: the sky never runs out as it scrolls; the Sharpshooter's turret follows him
//  - the Magma Derby: who is betting on the race, and what is on each runner
//  - no page errors
//   EMAIL2=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-oct5-test.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const email = process.env.EMAIL2;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`));
const credits = () => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
const bets = (game) => Number(sql(`SELECT count(*) FROM bym.casino_bet WHERE user_id = ${uid} AND game = '${game}'`));
const startCredits = credits();
const PIT_ID = 999141;
sql(`UPDATE bym.save SET credits = 20000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 6}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
sql(`DELETE FROM bym.casino_player WHERE user_id = ${uid}`);
// someone else's bet, so the Live tab has more than the player's
// (not an admin: their bets are never shown; the test server's admins are IoTester and admintester)
const other = Number(sql(`SELECT userid FROM bym."user" WHERE userid <> ${uid} AND username NOT IN ('IoTester', 'admintester') ORDER BY userid LIMIT 1`));
sql(`INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, status) VALUES (${other}, '${randomBytes(8).toString("hex")}', 'roulette', 25, 181, 7.24, '{}', 'settled')`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("response", (r) => { if (r.status() >= 400 && /casino|brimstone/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
const sleep = (ms) => page.waitForTimeout(ms);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await sleep(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await sleep(400); }
  await g(() => {
    window.__game.BASE._blockSave = true;
    window.__cw = () => window.__game.GLOBAL._layerTop.getChildByName("casinoWindow");
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__all = (prefix, root) => { const out = []; const walk = (o) => { if (!o || !o.visible) return; if (typeof o.name === "string" && o.name.startsWith(prefix)) out.push(o); for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return out; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
    window.__C = () => window.__classByName("com.monsters.casino::CASINO");
    window.__W = () => window.__classByName("com.monsters.casino::CasinoWindow")._open;
    window.__classByName("com.monsters.casino::CasinoWindow").Show();
  });
  const clickNamed = async (name) => {
    const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
    if (!p) return false;
    await page.mouse.click(p.x, p.y);
    return true;
  };
  const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
  const waitFor = async (fn, arg, timeout = 15000) => { const end = Date.now() + timeout; for (;;) { const v = await g(fn, arg); if (v) return v; if (Date.now() > end) return null; await sleep(150); } };
  await page.waitForFunction(() => window.__cw() && window.__named("casinoTile:fortune", window.__cw()), null, { timeout: 15000 });
  await sleep(2500);

  // ---- the lobby
  const lobby = await g(() => window.__all("casinoTile:", window.__cw()).map((t) => ({ id: t.name.split(":")[1], art: t.$children.some((c) => c.$children && c.$children.length > 0 && c.$children[0].bitmapData) })));
  const favorBtn = await g(() => { const b = window.__named("casinoFavor", window.__cw()); return b ? { on: b.casinoEnabled, text: window.__texts(b)[0] } : null; });
  await page.screenshot({ path: `${shots}/casino-oct5-1-lobby.png` });
  check("Pit level 6: eight tiles, Korath's Fortune's with its art, open", lobby.length === 8 && lobby[7].id === "fortune" && lobby.every((t) => t.art) && await g(() => window.__named("casinoTile:fortune", window.__cw()).buttonMode) === true, JSON.stringify(lobby));
  check("the lobby: Moloch's Favor ready (FREE SPIN)", favorBtn && favorBtn.on && favorBtn.text === "FREE SPIN", JSON.stringify(favorBtn));

  // ---- the free spin
  const c0 = credits();
  await clickNamed("casinoFavor");
  const fav = await waitFor(() => { const s = window.__named("casinoSlots", window.__cw()); return s && !s._spinning && window.__C().state.favor.ready === false && s._reels.every((r) => r.state === "still") ? true : null; }, null, 20000);
  await sleep(600);
  const favRow = sql(`SELECT stake || '|' || payout FROM bym.casino_bet WHERE user_id = ${uid} AND game = 'favor' ORDER BY id DESC LIMIT 1`).split("|").map(Number);
  check("FREE SPIN: the Slots open and spin free; the Shiny only gains what it paid", fav && favRow[0] === 0 && credits() === c0 + favRow[1] && await g(() => window.__C().credits()) === credits() && /Moloch's Favor/.test(await toast()), JSON.stringify([favRow, c0, credits(), await toast()]));
  check("the machine's own FREE SPIN gone", await g(() => { const b = window.__named("casinoSlots", window.__cw())._favorBtn; return !b.visible; }));
  await clickNamed("casinoButton:LOBBY");
  await sleep(1500);
  const next = await g(() => window.__texts(window.__cw()).find((t) => /^Next free spin in \d+:\d\d:\d\d$/.test(t)) || null);
  check("back in the lobby: the Favor counts down to tomorrow", next !== null && await g(() => window.__named("casinoFavor", window.__cw()).casinoEnabled) === false, next);

  // ---- the Live tab
  await clickNamed("casinoToggle:Live");
  const rows = await waitFor(() => { const r = window.__all("casinoLiveRow:", window.__cw()); return r.length ? r.map((x) => window.__texts(x)) : null; }, null, 8000);
  await sleep(800);
  await page.screenshot({ path: `${shots}/casino-oct5-2-live.png` });
  const side = await g(() => window.__texts(window.__named("casinoLive", window.__cw())));
  check("Live: everyone's latest bets, the player's free spin on it, another player's too", rows && rows.some((r) => r[1] === "Moloch's Favor" && r[2] === "FREE") && rows.some((r) => r[1] === "Roulette" && r[2] === "25"), JSON.stringify(rows && rows.slice(0, 4)));
  check("Live: the day's biggest wins and the last jackpots", side.includes("BIGGEST WINS TODAY") && side.includes("LAST JACKPOTS") && side.some((t) => /^\+[\d,]+$/.test(t)), JSON.stringify(side.slice(0, 12)));
  sql(`INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, status) VALUES (${other}, '${randomBytes(8).toString("hex")}', 'magmadrop', 40, 0, 0, '{}', 'settled')`);
  const fresh = await waitFor(() => { const r = window.__all("casinoLiveRow:", window.__cw()); return r.length && window.__texts(r[0])[1] === "Magma Drop" ? window.__texts(r[0]) : null; }, null, 6000);
  check("Live: a new bet comes in by itself (asked again every 2 seconds)", fresh && fresh[2] === "40", JSON.stringify(fresh));

  // ---- Korath's Fortune
  await clickNamed("casinoToggle:Games");
  await sleep(800);
  await clickNamed("casinoTile:fortune");
  await waitFor(() => window.__named("casinoFortune", window.__cw()) ? true : null);
  await sleep(1500);
  const title = await g(() => window.__texts(window.__named("casinoFortune", window.__cw())).filter((t) => /FORTUNE|LINE/.test(t)));
  check("Korath's Fortune: its name, its lines' numbers, the shared jackpot", title.includes("KORATH'S FORTUNE") && title.some((t) => /THREE ON A LINE/.test(t)) && await g(() => window.__named("casinoFortune", window.__cw())._lines.length) === 5, JSON.stringify(title));
  await clickNamed("casinoChip:25");
  const f0 = bets("fortune");
  await clickNamed("casinoButton:SPIN");
  await sleep(120);
  const label = await g(() => window.__texts(window.__named("casinoButton:SPIN", window.__cw()))[0]);
  const t0 = Date.now();
  await clickNamed("casinoButton:SPIN");
  const done = await waitFor(() => { const s = window.__named("casinoFortune", window.__cw()); return !s._spinning ? true : null; }, null, 6000);
  const took = Date.now() - t0;
  await sleep(300);
  await page.screenshot({ path: `${shots}/casino-oct5-3-fortune.png` });
  const last = JSON.parse(sql(`SELECT outcome FROM bym.casino_bet WHERE user_id = ${uid} AND game = 'fortune' ORDER BY id DESC LIMIT 1`));
  const shownLines = await g(() => window.__named("casinoFortune", window.__cw())._lines.map((l) => l.visible));
  check(`SPIN, then STOP: the result at once (${took} ms), on the server's stops`, label === "STOP" && done && took < 900 && bets("fortune") === f0 + 1 && await g((st) => window.__named("casinoFortune", window.__cw())._reels.every((r, i) => ((Math.round(r.o) % 32) + 32) % 32 === st[i]), last.stops), JSON.stringify([label, took, last.stops]));
  check("the paying lines drawn, the others not", JSON.stringify(shownLines) === JSON.stringify([0, 1, 2, 3, 4].map((i) => last.wins.some((w) => w.line === i))), JSON.stringify([shownLines, last.wins.map((w) => w.line)]));
  // AUTO
  await clickNamed("casinoChip:5");
  await clickNamed("casinoAuto:10");
  const a0 = bets("fortune");
  await clickNamed("casinoButton:AUTO");
  await sleep(1200);
  const running = await g(() => window.__texts(window.__named("casinoButton:AUTO", window.__cw()))[0]);
  await waitFor(() => { const s = window.__named("casinoFortune", window.__cw()); return s._auto === 0 && !s._spinning && s._autoWait === 0 ? true : null; }, null, 90000);
  await sleep(500);
  const played = bets("fortune") - a0;
  const big = await g(() => window.__W()._bigT > 0);
  check(`AUTO 10: ${played} spins played by themselves (STOP while running), then it stops`, /^STOP \d+$/.test(running) && (played === 10 || (played > 0 && big)) && await g(() => window.__texts(window.__named("casinoButton:AUTO", window.__cw()))[0]) === "AUTO", `${running} ${played}`);
  check("the Shiny shown is the server's", await g(() => window.__C().credits()) === credits(), `${await g(() => window.__C().credits())} ${credits()}`);

  // ---- close calls (the draw is the server's: only how long the last reel spins)
  const cc = await g(() => {
    const s = window.__named("casinoFortune", window.__cw());
    const w = (top, mid, bot) => [top, mid, bot];
    return [
      s.closeCall({ window: w(["zagnoid", "spurtz", "valgos"], ["grokus", "grokus", "spurtz"], ["malphus", "valgos", "zagnoid"]) }).extra,
      s.closeCall({ window: w(["wormzer", "spurtz", "valgos"], ["grokus", "wormzer", "spurtz"], ["malphus", "valgos", "zagnoid"]) }).extra,
      s.closeCall({ window: w(["zagnoid", "spurtz", "valgos"], ["grokus", "balthazar", "spurtz"], ["malphus", "valgos", "zagnoid"]) }).extra,
    ];
  });
  check("close calls: a pair on a line holds the last reel back (longer for King Wormzer, not at all for none)", cc[0] > 0 && cc[1] > cc[0] && cc[2] === 0, JSON.stringify(cc));

  // ---- the Magma Slots' close call, seen: an answer with Grokus on the first two reels (the call itself
  // stood in for: nothing is bet), the two lit while the last reel spins on
  await g(() => { window.__W()._bigT = 0; });
  await sleep(300);
  await clickNamed("casinoButton:LOBBY");
  await sleep(800);
  await clickNamed("casinoTile:slots");
  await waitFor(() => window.__named("casinoSlots", window.__cw()) ? true : null);
  await sleep(1200);
  await g(() => {
    const C = window.__C();
    window.__realSlots = C.slots;
    C.slots = (bet, done) => setTimeout(() => done({ error: 0, stops: [6, 5, 0], symbols: ["grokus", "grokus", "zagnoid"], line: "none", multiplier: 0, payout: 0, bet, credits: C.credits() + bet, pool: C.state.jackpot }), 50);
  });
  await clickNamed("casinoButton:SPIN");
  const tease = await waitFor(() => { const s = window.__named("casinoSlots", window.__cw()); return s._tease.length === 2 && s._reels[2].state !== "still" ? s._spinning.t : null; }, null, 6000);
  await sleep(500);
  await page.screenshot({ path: `${shots}/casino-oct5-3b-closecall.png` });
  const stillT = await waitFor(() => { const s = window.__named("casinoSlots", window.__cw()); return !s._spinning ? true : null; }, null, 8000);
  const lit = await g(() => window.__named("casinoSlots", window.__cw())._tease.length);
  check("the Magma Slots: two Grokus on the line light up while the last reel spins on, then it stops (nothing lit after)", tease && stillT && lit === 0 && /Nothing on the line/.test(await toast()), `${tease}`);
  await g(() => { window.__C().slots = window.__realSlots; });

  // ---- a big win
  await g(() => window.__W().bigWin(1250, 10));
  await sleep(4000);
  const bw = await g(() => window.__texts(window.__named("casinoBigWin", window.__cw())));
  await page.screenshot({ path: `${shots}/casino-oct5-4-bigwin.png` });
  check("a big win told across the window: MEGA WIN at 125x, the Shiny counted up", bw.includes("MEGA WIN!") && bw.includes("+1,250 SHINY"), JSON.stringify(bw));
  await clickNamed("casinoBigWin");
  await waitFor(() => (!window.__W()._big.visible ? true : null), null, 4000);
  check("a click goes through it and puts it away; a small win is not celebrated", await g(() => !window.__W()._big.visible && window.__W().bigWin(50, 10) === false));

  // ---- Balthazar's Ascent
  await clickNamed("casinoButton:LOBBY");
  await sleep(800);
  await clickNamed("casinoTile:ascent");
  await waitFor(() => window.__named("casinoSharpshooter", window.__cw()) ? true : null);
  await sleep(2500);
  const sky = await g(() => {
    const a = window.__named("casinoAscent", window.__cw()) || window.__cw()._game || window.__W()._game;
    const out = [];
    // the scene's sky at every point of its scroll: something behind every part of the 480 px view
    for (let x = 0; x > -1920; x -= 60) {
      let covered = true;
      for (let v = 0; v <= 480; v += 40) {
        const sx = v - x;
        if (!a._sky.$children.some((c) => { const b = c.getBounds(a._sky); return b.width > 0 && sx >= b.x - 0.5 && sx <= b.x + b.width + 0.5; })) covered = false;
      }
      out.push(covered);
    }
    return { tiles: a._sky.numChildren, covered: out.every(Boolean), frame: a._turretFrame, hasArt: Boolean(a._turretSheet) };
  });
  check("the sky is there at every point of its scroll (three tiles: the loop never shows a gap)", sky.tiles === 3 && sky.covered, JSON.stringify(sky));
  const [f1, f2, f3] = await g(() => {
    // (the game aims at Balthazar every frame: each aimed and read at once)
    const a = window.__W()._game;
    const out = [];
    a.aimAt(a._tower.x - 400, a._tower.y - 115 * 0.85);
    out.push(a._turretFrame);
    a.aimAt(a._tower.x - 300, a._tower.y - 300);
    out.push(a._turretFrame);
    a.aimAt(a._tower.x + 200, a._tower.y - 160);
    out.push(a._turretFrame);
    return out;
  });
  await page.screenshot({ path: `${shots}/casino-oct5-5-ascent.png` });
  check("the Sharpshooter Tower: its yard art, the turret turning to where it aims (left 10, up-left ~14, right ~24)", sky.hasArt && sky.frame >= 0 && f1 >= 9 && f1 <= 11 && f2 >= 11 && f2 <= 17 && f3 >= 22 && f3 <= 26, JSON.stringify([f1, f2, f3]));

  // ---- the Derby
  await clickNamed("casinoButton:LOBBY");
  await sleep(800);
  await clickNamed("casinoTile:derby");
  const dv = await waitFor(() => { const d = window.__named("casinoDerby", window.__cw()); return d && d._state && d._state.phase === "betting" ? true : null; }, null, 240000);
  if (dv) {
    const round = await g(() => window.__named("casinoDerby", window.__cw())._state.round_id);
    const runner = await g(() => window.__named("casinoDerby", window.__cw())._state.runners[0].id);
    sql(`INSERT INTO bym.casino_bet (user_id, request_id, game, round_id, stake, payout, multiplier, outcome, status) VALUES (${other}, '${randomBytes(8).toString("hex")}', 'derby', ${round}, 120, 0, 0, '{"bets":[{"on":"${runner}","amount":120}]}', 'open')`);
    const list = await waitFor((r) => { const b = window.__named("casinoDerbyBettors", window.__cw()); const t = b ? window.__texts(b) : []; return t.some((x) => /PLAYER/.test(x)) && t.includes("120") ? t : null; }, null, 8000);
    const note = await g((r) => window.__texts(window.__named("casinoOdds:" + r, window.__cw())), runner);
    await page.screenshot({ path: `${shots}/casino-oct5-6-derby.png` });
    check("the Derby: who is betting on the race, and what is on each runner", list && note.some((t) => /^[\d,]+ bet$/.test(t)), JSON.stringify([list, note]));
  }
  else check("the Derby: a race open for bets", false);
  await clickNamed("casinoClose");
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-oct5-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
}
