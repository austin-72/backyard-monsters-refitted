// The Brimstone Pit's Wormzer Roulette and Magma Slots in the game (milestone 2), played with the mouse:
//  - the lobby at Pit level 3: Roulette and Slots open
//  - Roulette: chips placed on Lava and Spurtz, the total shown; the wheel turns and the ball drops;
//    the wheel stops with the segment the server drew under the pointer, the ball in it; the Shiny shown
//    ends where the server's is; "Again" puts the same chips back; King Wormzer (a seed found for it)
//    bursts out of the wheel
//  - Slots: the jackpot on the idol's brow is the server's; the lever spins; the reels stop left to right
//    on the stops the server drew; the Shiny shown ends where the server's is; the jackpot (a seed found
//    for it) is celebrated, paid, and the brow shows the pool back at 500
//  - no page errors
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-m2-test.mjs
// The account's yard gets a level 3 Pit for the test (the yard's saving blocked); its Shiny, seeds and
// the pool are put back after. Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHmac, createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const credits = () => Number(sql(`SELECT credits FROM bym.save WHERE userid = ${uid} AND type = 'main'`));
const startCredits = credits();
const savedSeed = sql(`SELECT row_to_json(s) FROM bym.casino_seed s WHERE user_id = ${uid}`);
const savedPool = sql(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`);
const PIT_ID = 999141;
sql(`UPDATE bym.save SET credits = 5000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 3}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
sql(`UPDATE bym.casino_jackpot SET pool = 777 WHERE id = 1`);
const lastBet = () => sql(`SELECT game || '|' || stake || '|' || payout || '|' || outcome::text FROM bym.casino_bet WHERE user_id = ${uid} ORDER BY id DESC LIMIT 1`);
const stream = (seed, client, nonce) => { let block = 0, bytes = Buffer.alloc(0), at = 0; return () => { if (at + 4 > bytes.length) { bytes = createHmac("sha256", seed).update(`${client}:${nonce}:${block++}`).digest(); at = 0; } const f = bytes[at] / 256 + bytes[at + 1] / 65536 + bytes[at + 2] / 16777216 + bytes[at + 3] / 4294967296; at += 4; return f; }; };
/** Seeds whose next bet (nonce 0) passes `test` on its numbers; set as the player's. */
const forceSeed = (tag, test) => {
  const seed = createHash("sha256").update("m2-test-" + tag).digest("hex");
  for (let n = 0; ; n++) {
    const client = `${tag}${n}`;
    if (test(stream(seed, client, 0))) {
      sql(`INSERT INTO bym.casino_seed (user_id, server_seed, server_seed_hash, client_seed, nonce) VALUES (${uid}, '${seed}', '${createHash("sha256").update(seed).digest("hex")}', '${client}', 0) ON CONFLICT (user_id) DO UPDATE SET server_seed = EXCLUDED.server_seed, server_seed_hash = EXCLUDED.server_seed_hash, client_seed = EXCLUDED.client_seed, nonce = 0`);
      return;
    }
  }
};

const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// (errors the game catches and reports as bug reports are written to the console)
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
    window.__classByName("com.monsters.casino::CasinoWindow").Show();
  });
  const clickNamed = async (name) => {
    const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
    if (!p) return false;
    await page.mouse.click(p.x, p.y);
    return true;
  };
  const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
  const shown = () => g(() => window.__C().credits());
  await page.waitForFunction(() => window.__cw() && window.__named("casinoTile:slots", window.__cw()), null, { timeout: 15000 });
  await page.waitForTimeout(2000);
  const open = await g(() => ["roulette", "slots", "bonepile", "ascent"].map((id) => window.__named("casinoTile:" + id, window.__cw()).buttonMode));
  check("Pit level 3: Roulette, Slots and Bone Pile open (Ascent still to come)", open[0] && open[1] && open[2] && !open[3], JSON.stringify(open));

  // 1. Roulette
  await clickNamed("casinoTile:roulette");
  await page.waitForTimeout(1500);
  const places = await g(() => ["spurtz", "zagnoid", "valgos", "malphus", "balthazar", "grokus", "sabnox", "lava", "ash", "wormzer"].filter((p) => window.__named("casinoPlace:" + p, window.__cw())).length);
  check("Roulette: ten places on the table", places === 10, String(places));
  await clickNamed("casinoChip:10");
  await clickNamed("casinoPlace:lava");
  await clickNamed("casinoPlace:lava");
  await clickNamed("casinoPlace:spurtz");
  await page.waitForTimeout(300);
  const table = await g(() => window.__texts(window.__cw()).filter((t) => /Shiny$/.test(t)));
  check("chips placed: 20 on Lava, 10 on Spurtz, 30 on the table", table.includes("30 Shiny"), JSON.stringify(table));
  const before = await shown();
  await clickNamed("casinoButton:SPIN");
  await page.waitForTimeout(1500);
  const mid = await g(() => { const r = window.__named("casinoRoulette", window.__cw()); return { spinning: !!r._spinning, ball: r._ball.visible, rot: r._wheel.rotation, shown: window.__C().credits() }; });
  await page.screenshot({ path: `${shots}/casino-m2-1-spinning.png` });
  check("the wheel turns, the ball runs, the 30 are off the Shiny shown", mid.spinning && mid.ball && mid.shown === before - 30, JSON.stringify(mid));
  await page.waitForFunction(() => !window.__named("casinoRoulette", window.__cw())._spinning, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  const [game, stake, payout, outcome] = lastBet().split("|");
  const o = JSON.parse(outcome);
  const end = await g(() => { const r = window.__named("casinoRoulette", window.__cw()); return { rot: r._wheel.rotation, bx: r._ball.x, by: r._ball.y, text: r._resultText.text, shown: window.__C().credits() }; });
  const top = (((end.rot + o.segment * 360 / 29) % 360) + 360) % 360;
  check("the ledger: one spin of 30", game === "roulette" && stake === "30", `${game} ${stake} ${payout}`);
  check("the wheel stopped with the segment drawn under the pointer, the ball in it", (top < 1 || top > 359) && Math.abs(end.bx - 345) < 3 && end.by < 162 - 60, JSON.stringify({ segment: o.segment, top, ball: [end.bx, end.by] }));
  check("the result is named and the Shiny shown is the server's", end.text.length > 3 && end.shown === credits() && end.shown === before - 30 + Number(payout), `${end.text}: ${before} - 30 + ${payout} = ${end.shown}`);
  await page.screenshot({ path: `${shots}/casino-m2-2-landed.png` });
  await clickNamed("casinoButton:AGAIN");
  await page.waitForTimeout(300);
  const again = await g(() => window.__texts(window.__cw()).filter((t) => /Shiny$/.test(t)));
  check("\"Again\" puts the same chips back", again.includes("30 Shiny"), JSON.stringify(again));
  // King Wormzer
  forceSeed("wormzer", (next) => Math.floor(next() * 29) === 0);
  await g(() => { window.__C().state.seed.nonce = 0; });
  await clickNamed("casinoButton:CLEAR");
  await clickNamed("casinoChip:5");
  await clickNamed("casinoPlace:wormzer");
  const bw = await shown();
  await clickNamed("casinoButton:SPIN");
  await page.waitForFunction(() => !window.__named("casinoRoulette", window.__cw())._spinning && window.__named("casinoRoulette", window.__cw())._burstT > 0, null, { timeout: 15000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${shots}/casino-m2-3-wormzer.png` });
  const kw = await g(() => { const r = window.__named("casinoRoulette", window.__cw()); return { burst: r._burst.numChildren, text: r._resultText.text, shown: window.__C().credits() }; });
  const kwPay = Number(lastBet().split("|")[2]);
  check("King Wormzer: he bursts out, 5 on him pays 144.95 (144, or 145 with the chance of the part)", kw.burst > 0 && /KING WORMZER/.test(kw.text) && (kwPay === 144 || kwPay === 145) && kw.shown === bw - 5 + kwPay && kw.shown === credits(), JSON.stringify([kw, kwPay]));
  await page.waitForTimeout(2000);

  // 2. Slots
  await clickNamed("casinoButton:LOBBY");
  await page.waitForTimeout(800);
  await clickNamed("casinoTile:slots");
  await page.waitForTimeout(2000);
  const brow = await g(() => window.__named("casinoJackpot", window.__cw()).text);
  check("Slots: the idol's brow shows the jackpot pool", brow === "777", brow);
  await clickNamed("casinoChip:25");
  const s0 = await shown();
  await clickNamed("casinoLever");
  await page.waitForTimeout(700);
  const spinning = await g(() => { const s = window.__named("casinoSlots", window.__cw()); return { spinning: !!s._spinning, states: s._reels.map((r) => r.state), shown: window.__C().credits() }; });
  await page.screenshot({ path: `${shots}/casino-m2-4-reels.png` });
  check("the lever: the reels spin, 25 off the Shiny shown", spinning.spinning && spinning.states.every((x) => x === "spin") && spinning.shown === s0 - 25, JSON.stringify(spinning));
  await page.waitForFunction(() => !window.__named("casinoSlots", window.__cw())._spinning, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const [sg, sst, spay, sout] = lastBet().split("|");
  const so = JSON.parse(sout);
  const reels = await g(() => { const s = window.__named("casinoSlots", window.__cw()); return { line: s._reels.map((r) => r.cells[2].sym), offsets: s._reels.map((r) => r.o % 32), shown: window.__C().credits() }; });
  check("the reels stopped on the stops the server drew", sg === "slots" && sst === "25" && reels.line.join() === so.symbols.join() && reels.offsets.join() === so.stops.join(), JSON.stringify({ reels, so }));
  check("the Shiny shown is the server's", reels.shown === credits() && reels.shown === s0 - 25 + Number(spay), `${s0} - 25 + ${spay} = ${reels.shown}`);
  const brow2 = await g(() => window.__named("casinoJackpot", window.__cw()).text);
  const rate = await g(() => window.__C().state.rules.slots.jackpot_rate);
  check(`${rate * 100}% of the spin went into the pool (777 + ${25 * rate})`, brow2 === String(Math.floor(777 + 25 * rate)) && Math.abs(Number(sql(`SELECT pool FROM bym.casino_jackpot WHERE id = 1`)) - (777 + 25 * rate)) < 1e-6, brow2);
  await page.screenshot({ path: `${shots}/casino-m2-5-stopped.png` });
  // a win of two Spurtz, then three Malphus: the reels show three Malphus (they showed the Spurtz of the
  // win before, under the glow, while paying the Malphus)
  const strips = await g(() => window.__C().state.rules.slots.strips);
  const spinTo = async (tag, test) => {
    forceSeed(tag, test);
    await g(() => { window.__C().state.seed.nonce = 0; });
    await clickNamed("casinoButton:SPIN");
    await page.waitForFunction(() => !window.__named("casinoSlots", window.__cw())._spinning, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
  };
  await clickNamed("casinoChip:10");
  await spinTo("twosp", (next) => [0, 1, 2].map((k) => strips[k][Math.floor(next() * 32)]).filter((x) => x === "spurtz").length === 2);
  await spinTo("malphus", (next) => [0, 1, 2].every((k) => strips[k][Math.floor(next() * 32)] === "malphus"));
  // (13x: the window's BIG WIN is put away first, so the reels themselves are compared)
  await g(() => { window.__classByName("com.monsters.casino::CasinoWindow")._open._bigT = 0; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/casino-m2-5b-malphus.png` });
  const px = await g(() => {
    const s = window.__named("casinoSlots", window.__cw());
    const cvs = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    const rect = cvs.getBoundingClientRect(), k = cvs.width / rect.width;
    const sample = (c) => { const p = window.__at(c.s); return cvs.getContext("2d").getImageData(Math.round((p.x - rect.left) * k) - 20, Math.round((p.y - rect.top) * k) - 20, 40, 40).data; };
    const line = s._reels.map((r) => sample(r.cells[2]));
    const above = sample(s._reels[0].cells[3]);
    const diff = (x, y) => { let t = 0; for (let i = 0; i < x.length; i++) t += Math.abs(x[i] - y[i]); return t / x.length; };
    return { line: s._reels.map((r) => r.cells[2].sym), same1: diff(line[0], line[1]), same2: diff(line[0], line[2]), other: diff(line[0], above), aboveSym: s._reels[0].cells[3].sym };
  });
  check("after a win of two Spurtz, three Malphus are drawn as three Malphus (the line's three pictures alike, unlike the one above)",
    px.line.every((x) => x === "malphus") && px.aboveSym !== "malphus" && Math.max(px.same1, px.same2) * 3 < px.other, JSON.stringify(px));

  // the jackpot
  sql(`UPDATE bym.casino_jackpot SET pool = 5000 WHERE id = 1`);
  forceSeed("jackpot", (next) => [0, 1, 2].every((k) => strips[k][Math.floor(next() * 32)] === "wormzer"));
  await g(() => { window.__C().state.seed.nonce = 0; });
  await clickNamed("casinoChip:100");
  const j0 = await shown();
  await clickNamed("casinoButton:SPIN");
  await page.waitForFunction(() => { const s = window.__named("casinoSlots", window.__cw()); return !s._spinning && s._celebrate > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/casino-m2-6-jackpot.png` });
  const jp = await g(() => { const s = window.__named("casinoSlots", window.__cw()); return { line: s._reels.map((r) => r.cells[2].sym), banner: window.__texts(s._banner), rain: s._rain.length, shown: window.__C().credits() }; });
  check("the jackpot: three King Wormzer, the banner and a rain of Shiny", jp.line.every((x) => x === "wormzer") && jp.banner.some((t) => /JACKPOT/.test(t)) && jp.rain > 0, JSON.stringify(jp));
  check(`... ${5000 + 100 * rate} paid (the pool and the spin's ${100 * rate}), and it is the server's Shiny`, jp.shown === j0 - 100 + 5000 + 100 * rate && jp.shown === credits(), `${j0} - 100 + ${5000 + 100 * rate} = ${jp.shown}`);
  check("... the message says so", /JACKPOT/.test(await toast()), await toast());
  // (the celebration runs 200 frames, 5 s at the game's 40 a second, longer where frames drop)
  await page.waitForFunction(() => window.__named("casinoSlots", window.__cw())._celebrate === 0, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const brow3 = await g(() => window.__named("casinoJackpot", window.__cw()).text);
  check("... and the brow shows the pool back at 500", brow3 === "500", brow3);
  await clickNamed("casinoClose");
  await page.waitForTimeout(600);
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-m2-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
  sql(`UPDATE bym.casino_jackpot SET pool = ${savedPool} WHERE id = 1`);
  if (savedSeed) { const s = JSON.parse(savedSeed); sql(`UPDATE bym.casino_seed SET server_seed = '${s.server_seed}', server_seed_hash = '${s.server_seed_hash}', client_seed = '${s.client_seed}', nonce = ${s.nonce} WHERE user_id = ${uid}`); }
  else sql(`DELETE FROM bym.casino_seed WHERE user_id = ${uid}`);
}
