// The bug reports of 3 October (afternoon): the automatic ones (#62 Scratchers' coating after the game
// closed, #61 "Send now" with nothing queued) and the AI tester's list (B1 tribe names, B4 Close Enough's
// minutes, B6 what takes a yard, B11 an Attack greyed out, B12 the takeover price, B14 the idle invite popup,
// B15 the Alliances window on a narrow screen, B23 a harvester's Overdrive, B24 an outpost's worker,
// B26 a load with no answer, A10 a building's name: long, and centred).
//   EMAIL3=<a player with a developed Inferno yard and a Map Room> PASSWORD=... node tools/test/bugs-oct3b-test.mjs
// Prints one line per check; each must end in "ok". The yard is not saved.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const email = process.env.EMAIL3 || process.env.EMAIL;
const token = async () => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const open = async (w, h) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await token()}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(200); }
  await page.evaluate(() => {
    window.__game.BASE._blockSave = true;
    window.__game.WMATTACK._enabled = false;
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
    const G = window.__game.GLOBAL;
    window.__msgs = [];
    window.__keepMessage = G.Message;
    G.Message = function (text) { window.__msgs.push(text); return null; };
  });
  return { page, errors, g: (fn, arg) => page.evaluate(fn, arg) };
};

try {
  const { page, errors, g } = await open(1280, 800);

  // ---- #61: "Send now" again once the attack has started (nothing queued any more)
  const r61 = await g(() => { const W = window.__game.WMATTACK; const keep = W._queued; W._queued = null; let err = null; try { W.Attack(); } catch (e) { err = e.message; } W._queued = keep; return err; });
  check("#61: Send now with no attack queued does nothing (no error)", r61 === null, String(r61));

  // ---- #62: a Scratchers card's pictures arriving after the game was closed
  const r62 = await g(async () => {
    const W = window.__classByName("com.monsters.casino::CasinoWindow");
    W.Show();
    await new Promise((r) => setTimeout(r, 1500));
    const w = W._open;
    w.openGame("scratch");
    const game = w._game;
    w.openGame("magmadrop"); // (the History tab, another game: the card is closed)
    const BD = window.__classByName("flash.display::BitmapData");
    let err = null;
    try { game.coatingLoaded("casino/scratch/coating_bone.png", new BD(8, 8, true, 0), ["bone"]); game.tick(); } catch (e) { err = e.message; }
    w.close();
    return { err, disposed: game._disposed };
  });
  check("#62: a Scratchers coating arriving after the card was closed is ignored (no Invalid BitmapData)", r62.err === null && r62.disposed, JSON.stringify(r62));

  // ---- B4: Close Enough's minutes are the server's
  const b4 = await g(() => { const K = window.__game.KEYS, G = window.__game.GLOBAL; const m = Math.max(1, Math.floor(G.ioCloseEnough / 60)); return { m, texts: ["str_closeenough_desc", "str_closeenough_traindesc", "str_prob_morethan5", "tut_25"].map((k) => K.Get(k, { v1: "x", v2: "y" })) }; });
  check("B4: Close Enough's texts say the minutes it is offered at", b4.texts.every((t) => t.includes(`${b4.m} minute`) && !t.includes("#cm#")), JSON.stringify(b4));

  // ---- A10: a building's name is centred over its menu's buttons (x 6, 110 wide), whatever the menu's
  // width (a harvester's has an info box beside the buttons), and a long one is made to fit
  const a10 = await g(() => {
    const G = window.__game, BI = window.__classByName("BUILDINGINFO");
    const picks = [G.GLOBAL._bAcademy || G.BASE.buildings.find((x) => x._type === 26), ...[1, 2, 3, 4].map((t) => G.BASE.buildings.find((x) => x._type === t)), G.GLOBAL._bTownhall].filter(Boolean);
    return picks.map((b) => {
      BI.Show(b);
      const t = BI._mc.tName, bg = BI._mc.mcBG;
      const box = t.getBounds(BI._mc); // (the drawn box: the library's text box sits right of the field's x)
      const r = { type: b._type, text: t.text, tw: Math.round(t.textWidth), mid: Math.round(box.x + box.width / 2), bgw: Math.round(bg.width) };
      BI.Hide();
      return r;
    });
  });
  check("A10: building names are centred over their menu's buttons and fit", a10.length > 1 && a10.every((r) => Math.abs(r.mid - 61) <= 2 && r.tw <= 124), JSON.stringify(a10));

  // ---- B23: an idle harvester's button says Overdrive
  const b23 = await g(() => {
    const G = window.__game, BI = window.__classByName("BUILDINGINFO");
    const b = G.BASE.buildings.find((x) => x._buildingProps && x._buildingProps.type === "resource" && x._countdownBuild.Get() + x._countdownUpgrade.Get() === 0 && !x._repairing && x.health >= x.maxHealth);
    if (!b) return { none: true };
    G.GLOBAL._harvesterOverdrive = 0;
    BI.Show(b);
    const t = window.__texts(BI._mc);
    BI.Hide();
    return { t };
  });
  check("B23: an idle harvester's panel says Overdrive (it opens Production Overdrive), not Speed Up", b23.none || (b23.t.includes("Overdrive") && !b23.t.includes("Speed Up")), JSON.stringify(b23));

  // ---- B24: an outpost's busy worker: no General Store to hire another
  const b24 = await g(() => {
    const B = window.__game.BASE, Q = window.__classByName("QUEUE"), Y = window.__classByName("com.monsters.enums::EnumYardType");
    const keepType = B.m_yardType, keepStack = Q._stack;
    B.m_yardType = Y.OUTPOST;
    Q._stack = [{ active: true }];
    let r = null; try { r = Q.CanDo(); } catch (e) { r = { err: e.message }; }
    B.m_yardType = keepType; Q._stack = keepStack;
    return r;
  });
  check("B24: in an outpost the busy-worker message doesn't suggest a General Store", b24 && b24.error && !/General Store/.test(b24.errormessage), JSON.stringify(b24));

  // ---- B14: the idle invite popup never comes in an attack (it stacked on the attack's end popups)
  const b14 = await g(() => {
    const G = window.__game.GLOBAL, P = window.__classByName("POPUPS");
    const keepMode = G._mode, keepAFK = G._promptedAFK; let pushed = 0; const keepPush = P.Push; P.Push = function () { pushed++; };
    const keepInvite = P.ioCanInvite; P.ioCanInvite = () => true;
    G._mode = G.e_BASE_MODE.WMATTACK; G._promptedAFK = false; P.AFK(); const inAttack = pushed;
    const modeSet = G.mode === G.e_BASE_MODE.WMATTACK, stillDue = !G._promptedAFK;
    G._mode = keepMode; P.AFK(); const atHome = pushed;
    P.Push = keepPush; P.ioCanInvite = keepInvite; G._promptedAFK = keepAFK;
    return { inAttack, modeSet, stillDue, atHome };
  });
  check("B14: the idle \"Having fun?\" popup never comes in an attack; it waits for home", b14.modeSet && b14.inAttack === 0 && b14.stillDue && b14.atHome === 1, JSON.stringify(b14));

  // ---- the map: B1 tribe names, B11 out of range, B12 the takeover price, B6 the attack's end
  await g(() => window.__game.GLOBAL.ShowMap());
  await page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
  const map = await g(async () => {
    const MR = window.__classByName("com.monsters.maproom_advanced::MapRoom"), mc = MR._mc, TR = window.__classByName("com.monsters.ai::TRIBES");
    const cells = (mc._cells || []).filter((c) => c._updated && c._base === 1 && c._baseID && !c._destroyed);
    const c = cells.find((x) => x._inRange) || cells[0];
    if (!c) return { none: true };
    const out = { name: c._name, devil: TR.DisplayName(c._name) };
    const PA = window.__classByName("com.monsters.maproom_advanced::PopupAttackA");
    const pa = mc._popupAttackA;
    try { pa.Setup(c); } catch (e) { out.paErr = e.message; }
    out.attackText = pa.tAttackText ? pa.tAttackText.text : null;
    // B11: the Attack button's tip out of range
    const PE = mc._popupInfoEnemy;
    PE.Setup(c);
    const keep = MR._flingerInRange; MR._flingerInRange = false;
    const keepShow = PE.PopupShow; let tip = null; PE.PopupShow = function (...a) { tip = a.find((x) => typeof x === "string" && x.length > 10) || JSON.stringify(a).slice(0, 200); };
    const ME = window.__classByName("flash.events::MouseEvent");
    try { PE.ButtonInfo({ currentTarget: PE.bAttack }); } catch (e) { out.tipErr = e.message; }
    PE.PopupShow = keepShow; MR._flingerInRange = keep;
    out.tip = tip;
    // B12: the takeover popup says how its price is worked out
    const PT = window.__classByName("com.monsters.maproom_advanced::PopupTakeover");
    try { const t = new PT(c); const d = t.tDescription; out.takeover = d.text; out.takeoverFits = d.textHeight <= d.height - 2 && d.wordWrap; out.takeoverBox = [d.textHeight, d.height, d.wordWrap, d.getTextFormat().size]; } catch (e) { out.takeoverErr = e.message; }
    return out;
  });
  check("B1: \"Attack the ... tribe\" names the tribe as the Inferno calls it", map.none || (map.attackText && map.attackText.includes(`Attack the ${map.devil} tribe`) && map.devil !== map.name), JSON.stringify(map));
  check("B11: a greyed Attack says why (out of the Flinger's range)", map.none || /Out of range/.test(String(map.tip)), JSON.stringify(map.tip));
  check("B12: the takeover popup says how the price is worked out", map.none || (/The price goes by the yard's level/.test(String(map.takeover)) && map.takeoverFits), JSON.stringify([map.takeover || map.takeoverErr, map.takeoverFits, map.takeoverBox]));
  const b6 = await g(() => {
    const G = window.__game.GLOBAL, B = window.__game.BASE, P = window.__classByName("com.monsters.maproom_advanced::popup_attackend");
    const keepMode = G._mode, keepPct = B._percentDamaged;
    G._mode = G.e_BASE_MODE.WMATTACK; B._percentDamaged = 37;
    let text = null; try { const m = new P(false).tMessage; text = m.text + (m.textHeight <= m.height - 2 ? "" : " [DOES NOT FIT " + m.textHeight + " > " + m.height + "]"); } catch (e) { text = "threw " + e.message; }
    G._mode = keepMode; B._percentDamaged = keepPct;
    return text;
  });
  check("B6: a failed attack says how much is destroyed and that a yard falls at 90% (fitting its box)", /37% destroyed: a yard falls at 90%/.test(String(b6)) && !/DOES NOT FIT/.test(String(b6)), String(b6));
  check("no page errors", errors.length === 0, errors.slice(0, 4).join(" | "));
  await page.close();

  // ---- B15: the Alliances window on an 800-wide screen, over the map
  {
    const { page, errors, g } = await open(800, 910);
    await g(() => window.__classByName("ALLIANCEWINDOW").Show());
    await page.waitForTimeout(1500);
    const r = await g(() => { const W = window.__classByName("ALLIANCEWINDOW")._mc; const b = W.getBounds(window.__player.stage); const a = window.__player.stageToClient(b.x, b.y), z = window.__player.stageToClient(b.x + b.width, b.y + b.height); return { a, z, scale: W.scaleX }; });
    await page.screenshot({ path: `${shots}/oct3b-alliances-800.png` });
    check("B15: on an 800-wide screen the Alliances window (and its close button) is all on screen", r.a.x >= 0 && r.z.x <= 800 && r.scale < 1, JSON.stringify(r));
    await g(() => window.__classByName("ALLIANCEWINDOW").Hide());
    check("…no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await page.close();
  }

  // ---- B26: a yard's load with no answer (the server restarting): asked again, saying so
  {
    const { page, errors, g } = await open(1280, 800);
    let dropped = 0;
    await page.route("**/base/load", (route) => { if (dropped < 2) { dropped++; return route.abort("connectionrefused"); } return route.continue(); });
    await g(() => window.__game.BASE.LoadBase(null, 0, 0, window.__game.GLOBAL.e_BASE_MODE.BUILD, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD));
    await page.waitForTimeout(1500);
    const waiting = await g(() => { const P = window.__classByName("PLEASEWAIT"); return P._mc ? P._mc.tMessage.text : null; });
    await page.waitForFunction(() => window.__game.GLOBAL.mode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 5, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const done = await g(() => ({ loading: window.__game.BASE._loading, n: window.__game.BASE.buildings.length, oops: window.__texts(window.__player.stage).some((t) => /Oops/.test(t)), wait: !!window.__classByName("PLEASEWAIT")._mc }));
    check("B26: a load with no answer says the server may be restarting and tries again", dropped === 2 && /may be restarting/.test(String(waiting)), JSON.stringify({ dropped, waiting }));
    check("…and the yard loads once the server answers (no \"Oops\")", !done.loading && done.n > 5 && !done.oops && !done.wait, JSON.stringify(done));
    check("…no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await page.close();
  }
} catch (e) {
  check("the test ran through", false, String(e.stack || e).slice(0, 600));
}
await browser.close();
