// Hell Freezes Over fixes (Inferno-only, 4 October): the towers counter inside its bar, the heat count on two lines,
// the event's button gone once Rimegrave is unlocked, the Slushgut's ice trail gone, Rimegrave's and the Sleetwing's
// strikes thrown as ice orbs, four cretins standing (not walking) while they strike, and the Compound's monsters
// frozen under its ice during a wave.
//   EMAIL3=<a player with monsters in the Compound> PASSWORD=... node tools/test/hfo-fixes-test.mjs
// Prints one line per check; each must end in "ok". Nothing is saved (the yard's saves are blocked).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 600)}`);
const login = async (who) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(who)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const H = "com.monsters.events.hfo::IoHfoUi", HFO = "com.monsters.events.hfo::IoHfo", WAVES = "com.monsters.events.hfo::IoHfoWaves", ART = "com.monsters.events.hfo::IoHfoArt";
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(process.env.EMAIL3)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  for (let i = 0; i < 8; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE._blockSave = true; });

  // ---- the towers counter: inside its bar
  const hud = await g((H) => {
    const G = window.__game.GLOBAL;
    G._flags.io_hfo = JSON.stringify({ day: 3, towers: { iced: [1, 2, 3, 4, 5, 6, 7], thawed: [1, 2] }, waves: [], current: 1, tries: 3 });
    window.__classByName(H).Hud();
    const h = G._layerUI.getChildByName("ioHfoHud");
    const t = h && h.getChildAt(0);
    const bar = h && h.getBounds(h);
    return t ? { text: t.text, left: t.x, right: t.x + t.width, textWidth: t.textWidth, barLeft: bar.x, barRight: bar.x + bar.width } : null;
  }, H);
  check("Day 3: the towers counter is inside its bar, centred", hud && hud.text === "Towers thawed: 2 / 7" && hud.left >= hud.barLeft && hud.right <= hud.barRight && Math.abs(hud.left + hud.right) < 2 && hud.textWidth < hud.right - hud.left, JSON.stringify(hud));
  await page.screenshot({ path: `${shots}/hfo-fix-hud.png`, clip: { x: 300, y: 60, width: 680, height: 120 } });

  // ---- the window: the heat count on two lines; the button gone once Rimegrave is unlocked
  const heat = await g(async (H) => {
    const G = window.__game.GLOBAL;
    const w = []; for (let i = 0; i < 13; i++) w.push([1, 1, 0]);
    G._flags.io_hfo = JSON.stringify({ day: 4, towers: {}, waves: w, current: 14, tries: 0, done: 1 });
    window.__classByName(H).HudOff();
    window.__classByName(H).ShowWindow();
    await new Promise((r) => setTimeout(r, 2000));
    const T = window.__classByName("flash.text::TextField");
    let found = null;
    const walk = (o) => { if (!o) return; if (o instanceof T && /Heat restored/.test(o.text)) found = { text: o.text, w: o.width, tw: o.textWidth, h: o.height, th: o.textHeight }; for (const c of o.$children ?? []) walk(c); };
    walk(G._layerTop);
    return found;
  }, H);
  check("the window's heat count fits, on two lines (Heat restored: / 13 / 13)", heat && /^Heat restored:[\r\n]13 \/ 13$/.test(heat.text) && heat.tw <= heat.w && heat.th <= heat.h, JSON.stringify(heat));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/hfo-fix-window.png` });
  await g((H) => window.__classByName(H).CloseWindow(), H);
  const button = await g((HFO) => {
    const L = window.__game.CREATURELOCKER;
    const before = window.__classByName(HFO).buttonShown();
    const keep = L._lockerData.IC25;
    L._lockerData.IC25 = { t: 2 };
    const after = window.__classByName(HFO).buttonShown();
    if (keep) L._lockerData.IC25 = keep; else delete L._lockerData.IC25;
    return { before, after };
  }, HFO);
  check("the event's button shows after the waves, and is gone once Rimegrave is unlocked in the Strongbox", button.before === true && button.after === false, JSON.stringify(button));

  // ---- the Compound frozen: its monsters still, under the ice
  const frozen = await g(async ([WAVES]) => {
    const Wv = window.__classByName(WAVES);
    const pen = [];
    const list = window.__game.CREATURES._creatures || {};
    for (const k in list) { const c = list[k]; if (c && (c._behaviour === "pen" || c._behaviour === "housing")) pen.push(c); }
    if (!pen.length) return { none: true };
    Wv._fight = { wave: 1 };
    Wv.freezeCompounds();
    await new Promise((r) => setTimeout(r, 300));
    const before = pen.map((c) => [c._tmpPoint.x, c._tmpPoint.y, c._frameNumber]);
    await new Promise((r) => setTimeout(r, 3000));
    const after = pen.map((c) => [c._tmpPoint.x, c._tmpPoint.y, c._frameNumber]);
    const ice = Wv._compoundIce.map((h) => h.top.depth);
    const depths = pen.map((c) => c._rasterData ? c._rasterData.depth : 0);
    const still = before.every((b, i) => b[0] === after[i][0] && b[1] === after[i][1] && b[2] === after[i][2]);
    const shot = true;
    return { n: pen.length, still, ice, maxMonster: Math.max(...depths), shot };
  }, [WAVES]);
  check("during a wave the monsters in the Compound are still (no moving, no animation)", frozen.still === true, JSON.stringify(frozen));
  check("...and the Compound's ice is drawn over all of them", frozen.ice && frozen.ice.length > 0 && frozen.ice.every((d) => d > frozen.maxMonster), JSON.stringify(frozen));
  await page.screenshot({ path: `${shots}/hfo-fix-compound.png` });
  const thawed = await g(async ([WAVES]) => {
    const Wv = window.__classByName(WAVES);
    Wv._fight = null;
    Wv.thawCompounds(false);
    const pen = [];
    const list = window.__game.CREATURES._creatures || {};
    for (const k in list) { const c = list[k]; if (c && c._behaviour === "pen") pen.push(c); }
    const before = pen.map((c) => c._frameNumber);
    await new Promise((r) => setTimeout(r, 1500));
    return pen.some((c, i) => c._frameNumber !== before[i]);
  }, [WAVES]);
  check("...and move again once the wave is over", thawed === true, String(thawed));
  // ---- the cretins and Rimegrave fighting
  await g((ART) => {
    window.__played = [];
    const A = window.__classByName(ART);
    const play = A.play;
    A.play = function (name, ...rest) { window.__played.push(name); return play.call(this, name, ...rest); };
    window.__orbs = 0;
    const F = window.__game.FIREBALLS;
    for (const fn of ["Spawn", "Spawn2"]) {
      const orig = F[fn];
      F[fn] = function (...args) { const b = orig.apply(this, args); if (b && b._type === "iceorb") window.__orbs++; return b; };
    }
  }, ART);
  await g(() => {
    const C = window.__game.CREEPS;
    const at = (i) => ({ x: -200 + i * 70, y: 250 });
    ["IC26", "IC27", "IC28", "IC31", "IC29", "IC25"].forEach((id, i) => C.Spawn(id, window.__game.MAP._BUILDINGTOPS, "bounce", at(i), 90, 1, true, false, 1));
  });
  const watch = await g(async () => {
    const C = window.__game.CREEPS;
    const rows = {};
    const attacking = {};
    for (let t = 0; t < 60; t++) {
      for (const k in C._creeps) {
        const c = C._creeps[k];
        if (!c || !c._creatureID || c.health <= 0) continue;
        if (c._attacking || c._atTarget) {
          attacking[c._creatureID] = (attacking[c._creatureID] || 0) + 1;
          if (c.m_sheet) {
            const row = Math.floor(c.m_lastCell / 30);
            (rows[c._creatureID] = rows[c._creatureID] || {})[row] = 1;
          }
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return { rows, attacking, orbs: window.__orbs, played: window.__played.filter((n) => /melt/.test(n)).length };
  });
  const standing = ["IC26", "IC27", "IC28", "IC31"].filter((id) => watch.rows[id]);
  check("Shivling, Slushgut, Rimeclaw and Permafrost Hulk stand (row 0) while they strike, not walking", standing.length >= 3 && standing.every((id) => Object.keys(watch.rows[id]).join() === "0"), JSON.stringify(watch.rows));
  check("the Sleetwing still flaps while it strikes", !watch.rows.IC29 || Object.keys(watch.rows.IC29).some((r) => r !== "0"), JSON.stringify(watch.rows.IC29));
  check("Rimegrave's and the Sleetwing's strikes are thrown as ice orbs that fly to the target", watch.orbs > 0 && (watch.attacking.IC25 || watch.attacking.IC29), JSON.stringify(watch));
  check("the Slushgut leaves no ice behind as it walks", watch.played === 0, JSON.stringify(watch.played));
  await page.screenshot({ path: `${shots}/hfo-fix-fight.png` });
  await g(() => { const C = window.__game.CREEPS; for (const k in C._creeps) C._creeps[k].setHealth(0); });
  await page.waitForTimeout(1500);

  check("no game errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("test ran", false, e.stack || e);
} finally {
  await browser.close();
}
