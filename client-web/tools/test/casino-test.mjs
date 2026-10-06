// The Brimstone Pit in the game (milestone 1): the building, its "Enter the Pit" button, the lobby, Magma
// Drop and Brimstone Scratchers, History and Fairness, played with the mouse as a player would:
//  - the Pit (building 141) loads as a BRIMSTONEPIT; its info panel has "Enter the Pit", which opens the lobby
//  - the lobby: 7 tiles with their art, the two games of level 1 open, the others locked or coming soon
//  - Magma Drop: the cups show the risk's multipliers; three drops fall and land; the Shiny shown ends
//    where the server's is; the ledger has the three bets
//  - Scratchers: a ticket is bought, scratched with the mouse until it shows itself, and pays what the
//    server says; "Reveal all" on a second; Magma tickets are not sold at level 1
//  - History lists the bets; Fairness shows the seed's hash; changing seeds shows the old server seed,
//    whose SHA-256 is the hash shown before
//  - no page errors, no failed requests
//   EMAIL=... PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/casino-test.mjs
// The account's yard gets a Pit for the test (in the database, the yard's saving blocked) and loses it
// after; its Shiny is put back as it was. Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
sql(`UPDATE bym.save SET credits = 3000, buildingdata = COALESCE(buildingdata, '{}'::jsonb) || '{"${PIT_ID}": {"X": 380, "Y": 380, "t": 141, "id": ${PIT_ID}, "l": 1}}'::jsonb, buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
sql(`UPDATE bym."user" SET shiny_locked = false WHERE userid = ${uid}`);
const lastBet = Number(sql(`SELECT COALESCE(max(id), 0) FROM bym.casino_bet`));

const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// (errors the game catches and reports as bug reports are written to the console)
page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
// (the Pit's requests and pictures: others, such as mission icons some servers lack, are not this test's)
page.on("response", (r) => { if (r.status() >= 400 && /casino|brimstone|ibrimstonepit|buildingthumbs\/141/.test(r.url())) errors.push(`http ${r.status()} ${r.url()}`); });
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => { window.__game.BASE._blockSave = true; });
  // helpers: a display object by name (in the casino window), its middle on the page
  await g(() => {
    window.__cw = () => window.__game.GLOBAL._layerTop.getChildByName("casinoWindow");
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
  });
  const clickNamed = async (name) => {
    const p = await g((n) => { const o = window.__named(n, window.__cw()); return o ? window.__at(o) : null; }, name);
    if (!p) return false;
    await page.mouse.click(p.x, p.y);
    return true;
  };
  const toast = () => g(() => { const t = window.__named("casinoToast", window.__cw()); return t ? t.text : null; });
  const shown = () => g(() => window.__classByName("com.monsters.casino::CASINO").credits());

  // 1. the building and its button
  const pit = await g(() => {
    const B = window.__classByName("BRIMSTONEPIT"); let pit = null;
    for (const k in window.__game.BASE._buildingsAll) { const b = window.__game.BASE._buildingsAll[k]; if (b && b._type === 141) pit = b; }
    window.__pit = pit;
    return pit && { cls: pit instanceof B, name: pit._buildingProps.name, level: pit._lvl.Get() };
  });
  check("the Pit loads as a Brimstone Pit", pit && pit.cls && pit.name === "Brimstone Pit", JSON.stringify(pit));
  await g(() => window.__classByName("BUILDINGINFO").Show(window.__pit));
  await page.waitForTimeout(1200);
  const enter = await g(() => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.labelKey === "btn_openbrimstonepit") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; return { at: window.__at(hit), text: window.__texts(hit).join(" ") }; });
  check("its info panel has \"Enter the Pit\"", enter && /Enter the Pit/.test(enter.text), JSON.stringify(enter));
  await page.screenshot({ path: `${shots}/casino-0-info.png` });
  if (enter) await page.mouse.click(enter.at.x, enter.at.y);
  await page.waitForFunction(() => window.__cw && window.__cw() && window.__named("casinoTile:derby", window.__cw()), null, { timeout: 15000 });
  await page.waitForTimeout(2500);

  // 2. the lobby
  const lobby = await g(() => {
    const B = window.__classByName("flash.display::Bitmap");
    const ids = ["magmadrop", "scratch", "roulette", "bonepile", "slots", "ascent", "derby", "fortune"];
    return ids.map((id) => { const t = window.__named("casinoTile:" + id, window.__cw()); let art = false; const walk = (o) => { if (o instanceof B && o.bitmapData && o.bitmapData.width > 100) art = true; for (const c of o.$children ?? []) walk(c); }; if (t) walk(t); return { id, art, text: t ? window.__texts(t).join("|") : null, button: t ? t.buttonMode : null }; });
  });
  check("the lobby: 8 tiles, each with its art", lobby.length === 8 && lobby.every((t) => t.text && t.art), JSON.stringify(lobby.map((t) => [t.id, t.art])));
  check("level 1: Magma Drop and Scratchers open, the rest locked or coming soon", lobby[0].button && lobby[1].button && lobby.slice(2).every((t) => !t.button && /Pit level|Coming soon/.test(t.text)), JSON.stringify(lobby.map((t) => t.text)));
  const header = await g(() => window.__texts(window.__cw()).filter((t) => /BRIMSTONE|Level|JACKPOT|Shiny/.test(t)));
  check("the header and the jackpot", header.some((t) => /THE BRIMSTONE PIT/.test(t)) && header.some((t) => /JACKPOT/.test(t)), JSON.stringify(header));
  await page.screenshot({ path: `${shots}/casino-1-lobby.png` });

  // 3. Magma Drop
  await clickNamed("casinoTile:magmadrop");
  await page.waitForTimeout(1500);
  const cups = async () => g(() => [0, 5, 10].map((k) => window.__texts(window.__named("casinoCup:" + k, window.__cw())).join("")));
  const low = await cups();
  check("Magma Drop: the cups show the low risk's multipliers", JSON.stringify(low) === JSON.stringify(["9.4x", "0.5x", "9.4x"]), JSON.stringify(low));
  await clickNamed("casinoToggle:HIGH");
  await page.waitForTimeout(300);
  const high = await cups();
  check("high risk: 60.7x at the edges, 0.2x in the middle", JSON.stringify(high) === JSON.stringify(["60.7x", "0.2x", "60.7x"]), JSON.stringify(high));
  const before = await shown();
  for (let i = 0; i < 3; i++) { await clickNamed("casinoButton:DROP"); await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
  const falling = await g(() => { let n = 0; const walk = (o) => { if (o.name === "casinoBall") n++; for (const c of o.$children ?? []) walk(c); }; walk(window.__cw()); return n; });
  const during = await shown();
  await page.screenshot({ path: `${shots}/casino-2-magmadrop.png` });
  check("the balls fall; the Shiny shown dropped by the bets as they were sent", falling >= 2 && during < before, `falling ${falling}, ${before} -> ${during}`);
  await page.waitForTimeout(5000);
  const drops = sql(`SELECT count(*), COALESCE(sum(stake), 0), COALESCE(sum(payout), 0) FROM bym.casino_bet WHERE id > ${lastBet} AND user_id = ${uid} AND game = 'magmadrop'`).split("|").map(Number);
  const after = await shown();
  check("the ledger has the three drops of 10", drops[0] === 3 && drops[1] === 30, JSON.stringify(drops));
  check("once they have landed, the Shiny shown is the server's (bets and prizes)", after === credits() && after === before - drops[1] + drops[2], `${before} - ${drops[1]} + ${drops[2]} = ${after}, server ${credits()}`);
  check("the landing is told", /Cup/.test(await toast()), await toast());
  await page.screenshot({ path: `${shots}/casino-3-landed.png` });

  // 4. Scratchers
  await clickNamed("casinoButton:LOBBY");
  await page.waitForTimeout(800);
  await clickNamed("casinoTile:scratch");
  await page.waitForTimeout(1500);
  await clickNamed("casinoToggle:MAGMA");
  await page.waitForTimeout(300);
  check("Magma tickets: not sold at Pit level 1", /level 3/.test(await toast()), await toast());
  await clickNamed("casinoToggle:BONE");
  const s0 = await shown();
  await clickNamed("casinoButton:BUY");
  await page.waitForFunction(() => { const s = window.__named("casinoScratchers", window.__cw()); return s && s._ticket; }, null, { timeout: 10000 });
  await page.waitForTimeout(800);
  const ticket = await g(() => { const s = window.__named("casinoScratchers", window.__cw()); return { grid: s._ticket.grid, prize: s._ticket.prize, payout: s._ticket.payout, revealed: s._revealed, shown: window.__classByName("com.monsters.casino::CASINO").credits() }; });
  check("a Bone ticket bought: 5 Shiny off at once, a card of nine under its coating", ticket.grid.length === 9 && !ticket.revealed && ticket.shown === s0 - 5, JSON.stringify(ticket));
  const card = await g(() => { const c = window.__named("casinoScratchCard", window.__cw()); const r = c.getBounds(window.__player.stage); const a = window.__player.stageToClient(r.x, r.y), b = window.__player.stageToClient(r.x + r.width, r.y + r.height); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; });
  // scratch the top half with the mouse, back and forth
  const rub = async (y0, y1) => {
    for (let y = y0; y <= y1; y += 0.07) {
      await page.mouse.move(card.x + card.w * 0.1, card.y + card.h * y);
      await page.mouse.down();
      await page.mouse.move(card.x + card.w * 0.9, card.y + card.h * y, { steps: 8 });
      await page.mouse.up();
    }
  };
  await rub(0.1, 0.45);
  const half = await g(() => { const s = window.__named("casinoScratchers", window.__cw()); return { scratched: s.scratched, revealed: s._revealed }; });
  await page.screenshot({ path: `${shots}/casino-4-scratching.png` });
  check("scratching with the mouse rubs the coating off (not yet all)", half.scratched > 0.2 && !half.revealed, JSON.stringify(half));
  await rub(0.5, 0.92);
  await page.waitForTimeout(1200);
  const done = await g(() => { const s = window.__named("casinoScratchers", window.__cw()); return { scratched: s.scratched, revealed: s._revealed, shown: window.__classByName("com.monsters.casino::CASINO").credits(), texts: window.__texts(s).filter((t) => /WIN/.test(t)) }; });
  check("past 70% the card shows itself and its result", done.revealed && done.texts.length === 1 && (ticket.prize ? /WIN \d/.test(done.texts[0]) : /NO WIN/.test(done.texts[0])), JSON.stringify(done));
  check("the Shiny shown is the server's, prize paid", done.shown === credits() && done.shown === s0 - 5 + ticket.payout, `${s0} - 5 + ${ticket.payout} = ${done.shown}, server ${credits()}`);
  await page.screenshot({ path: `${shots}/casino-5-scratched.png` });
  // a second, revealed at once
  await clickNamed("casinoToggle:OBSIDIAN");
  await clickNamed("casinoButton:BUY");
  await page.waitForFunction(() => { const s = window.__named("casinoScratchers", window.__cw()); return s && s._ticket && !s._revealed; }, null, { timeout: 10000 });
  await page.waitForTimeout(600);
  await clickNamed("casinoButton:REVEAL ALL");
  await page.waitForTimeout(1200);
  const second = await g(() => { const s = window.__named("casinoScratchers", window.__cw()); return { revealed: s._revealed, price: s._ticket.price, tier: s._ticket.tier, shown: window.__classByName("com.monsters.casino::CASINO").credits() }; });
  check("an Obsidian ticket (25), shown whole with \"Reveal all\"", second.revealed && second.price === 25 && second.tier === "obsidian" && second.shown === credits(), JSON.stringify(second));
  await page.screenshot({ path: `${shots}/casino-6-revealall.png` });
  const ledger = sql(`SELECT count(*) FROM bym.casino_bet WHERE id > ${lastBet} AND user_id = ${uid} AND game = 'scratch'`);
  check("the ledger has the two tickets", ledger === "2", ledger);

  // 5. History and Fairness
  await clickNamed("casinoToggle:History");
  await page.waitForTimeout(1500);
  const hist = await g(() => window.__texts(window.__cw()).filter((t) => t === "Magma Drop" || t === "Scratchers").length);
  check("History lists the five bets", hist >= 5, String(hist));
  await page.screenshot({ path: `${shots}/casino-7-history.png` });
  await clickNamed("casinoToggle:Fairness");
  await page.waitForTimeout(800);
  const hash = await g(() => window.__classByName("com.monsters.casino::CASINO").state.seed.server_seed_hash);
  const fair = await g((h) => window.__texts(window.__cw()).includes(h), hash);
  check("Fairness shows the server seed's hash", fair, hash);
  await clickNamed("casinoButton:CHANGE SEEDS");
  await page.waitForTimeout(2000);
  const revealedText = await g(() => window.__texts(window.__cw()).find((t) => /^server [0-9a-f]{64}/.test(t)) || "");
  const seed = (revealedText.match(/^server ([0-9a-f]{64})/) || [])[1];
  check("changing seeds shows the old server seed, and its SHA-256 is the hash shown before", seed && createHash("sha256").update(seed).digest("hex") === hash, seed);
  await page.screenshot({ path: `${shots}/casino-8-fairness.png` });
  await clickNamed("casinoClose");
  await page.waitForTimeout(800);
  check("the window closes", !(await g(() => !!window.__cw())));
  check("no page errors, no failed requests", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  check("the test ran", false, e.stack);
  await page.screenshot({ path: `${shots}/casino-error.png` }).catch(() => {});
} finally {
  await browser.close();
  sql(`UPDATE bym.save SET credits = ${startCredits}, buildingdata = buildingdata - '${PIT_ID}', buildinghealthdata = COALESCE(buildinghealthdata, '{}'::jsonb) - '${PIT_ID}' WHERE userid = ${uid} AND type = 'main'`);
}
