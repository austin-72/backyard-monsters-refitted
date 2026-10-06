// The Strongbox (monster locker) and the Academy, busy rules (30 September; the user's bug report: the locker
// sometimes didn't animate while unlocking, sometimes unlocked two monsters at once, sometimes let itself be
// upgraded while unlocking):
//  Strongbox
//  - Rezghul (C19, unlocked in the Strongbox here) counts as an unlock: the Strongbox animates, a second unlock is
//    refused, the Strongbox can't be upgraded (also not instantly with shiny), and his unlock finishes
//  - an instant unlock while another monster unlocks leaves that unlock running: a third is still refused
//  - an instant unlock clicked twice is paid once
//  - nothing is unlocked while the Strongbox is being upgraded
//  Academy
//  - one training at a time; the Academy can't be upgraded while it trains (also not instantly), and it animates
//  - a training whose "busy" mark was lost gets it back within a second (no second training, no upgrade)
//  - instant training clicked twice (one level below the Academy's last) trains one level
//  - a cancel answered twice refunds once
//  - no training while the Academy is being upgraded
//  - Speed Up never points at a finished training
//  Two Academies (allowed from Under Hall 4)
//  - each trains its own monster: two trainings at once, a third refused in either
//  - each can't be upgraded while it trains, the idle one can
//  - a lost mark goes back to the Academy that lost it, not to the one training something else
//  - no page errors
//   EMAIL=... PASSWORD=... node tools/test/locker-academy-test.mjs
// Saving is blocked and purchases are only counted; a Strongbox and an Academy are put in the yard for the test if it has none. Prints one
// line per check.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (/UncaughtError|Error #\d+|TypeError/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const g = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);

try {
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await wait(5000);
  for (let i = 0; i < 6; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await wait(250); }
  await g(() => {
    const G = window.__game;
    G.BASE._blockSave = true;
    G.WMATTACK._enabled = false;
    // every message box answered at once, as a click on its button would
    window.__messages = [];
    const keep = G.GLOBAL.Message;
    G.GLOBAL.Message = function (text, ...rest) { window.__messages.push(String(text)); return null; };
    window.__restoreMessage = () => (G.GLOBAL.Message = keep);
    if (!G.GLOBAL._bLocker) { const b = G.BASE.addBuildingC(8); b.Setup({ X: -300, Y: 300, id: 980, t: 8, l: 5 }); }
    if (!G.GLOBAL._bAcademy) { const b = G.BASE.addBuildingC(26); b.Setup({ X: -450, Y: 300, id: 981, t: 26, l: 5 }); }
    for (const b of [G.GLOBAL._bLocker, G.GLOBAL._bAcademy]) { b.setHealth(b.maxHealth); b.Render("default"); }
    // purchases counted, not made (the test's shiny is not the server's: a real purchase would fail and stop the game)
    window.__purchases = [];
    G.BASE.Purchase = function (item) { window.__purchases.push(item); };
    G.BASE._resources.r3.Set(500000000);
    G.BASE._credits.Set(100000);
    G.GLOBAL.ioConfirmShiny = () => true;
  });
  const L = "CREATURELOCKER";

  // ---------- Strongbox
  // 1. Rezghul
  const rez = await g(async (L) => {
    const C = window.__classByName(L), G = window.__game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const id of ["C19", "IC4", "IC5", "IC7"]) delete C._lockerData[id];
    C._unlocking = null;
    const started = C.Start("C19");
    await sleep(1600);
    const box = G.GLOBAL._bLocker;
    const t0 = box._animTick; await sleep(1500); const t1 = box._animTick;
    window.__messages.length = 0;
    const second = C.Start("IC4");
    const lvl = box._lvl.Get(); box._lvl.Set(1); // something to upgrade to
    const can = G.BASE.CanUpgrade(box);
    box._lvl.Set(lvl);
    return { started, unlocking: C._unlocking, animated: t0 !== t1, second, secondData: !!C._lockerData.IC4, upgradeRefused: can.error, why: can.errorMessage, messages: window.__messages.slice() };
  }, L);
  check("Rezghul's unlock counts as the Strongbox's unlock", rez.started && rez.unlocking === "C19", JSON.stringify({ started: rez.started, unlocking: rez.unlocking }));
  check("the Strongbox animates while Rezghul unlocks", rez.animated);
  check("a second unlock is refused while Rezghul unlocks", !rez.second && !rez.secondData && /already unlocking/.test(rez.messages.join(" ")), rez.messages.join(" | "));
  check("the Strongbox can't be upgraded while Rezghul unlocks", rez.upgradeRefused && /unlocking the Rezghul/.test(rez.why), rez.why);
  const instantUp = await g(async () => {
    const G = window.__game, box = G.GLOBAL._bLocker;
    const lvl = box._lvl.Get(); box._lvl.Set(1); // something to upgrade to
    const P = window.__classByName("BUILDINGOPTIONSPOPUP");
    let refused = null;
    try {
      window.__classByName("BUILDINGOPTIONS")._building = box;
      const pop = new P("upgrade");
      pop._building = box;
      const before = box._lvl.Get(), credits = G.BASE._credits.Get();
      window.__messages.length = 0;
      pop.ActionInstantUpgrade(null);
      refused = box._lvl.Get() === before && G.BASE._credits.Get() === credits;
      return { refused, messages: window.__messages.slice() };
    } catch (e) { return { err: String(e).slice(0, 200) }; }
    finally { box._lvl.Set(lvl); }
  });
  check("nor instantly with shiny", instantUp.refused === true && /unlocking/.test((instantUp.messages || []).join(" ")), JSON.stringify(instantUp));
  const rezDone = await g(async (L) => {
    const C = window.__classByName(L), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    C._lockerData.C19.e = window.__game.GLOBAL.Timestamp() - 1;
    await sleep(2200);
    for (let i = 0; i < 4; i++) { try { window.__game.POPUPS.Next(); } catch (e) {} }
    return { t: C._lockerData.C19.t, unlocking: C._unlocking, level: window.__game.GLOBAL.player.m_upgrades.C19 && window.__game.GLOBAL.player.m_upgrades.C19.level };
  }, L);
  check("Rezghul's unlock finishes", rezDone.t === 2 && rezDone.unlocking === null && rezDone.level >= 1, JSON.stringify(rezDone));

  // 2. instant unlock while another unlocks, and twice
  const inst = await g(async (L) => {
    const C = window.__classByName(L), G = window.__game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const P = window.__classByName("CREATURELOCKERPOPUP");
    C.Show();
    await sleep(800);
    const pop = C._mc;
    C.Start("IC4");
    pop.ShowB("IC5");
    window.__purchases.length = 0;
    pop.InstantUnlock(null);
    pop.InstantUnlock(null); // the second click
    const bought = window.__purchases.filter((p) => p === "IUN").length;
    const unlockingAfter = C._unlocking;
    window.__messages.length = 0;
    const third = C.Start("IC7");
    C.Hide();
    return { unlockingAfter, ic5: C._lockerData.IC5 && C._lockerData.IC5.t, third, thirdData: !!C._lockerData.IC7, paidOnce: bought === 1, bought, messages: window.__messages.slice() };
  }, L);
  check("an instant unlock leaves the running unlock running", inst.ic5 === 2 && inst.unlockingAfter === "IC4", JSON.stringify(inst));
  check("so a third unlock is still refused", !inst.third && !inst.thirdData, inst.messages.join(" | "));
  check("an instant unlock clicked twice is paid once", inst.paidOnce, "bought " + inst.bought);

  // 3. no unlock while the Strongbox upgrades
  const upg = await g(async (L) => {
    const C = window.__classByName(L), G = window.__game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    C._unlocking = null; delete C._lockerData.IC4; delete C._lockerData.IC7;
    await sleep(1200);
    const box = G.GLOBAL._bLocker;
    box._countdownUpgrade.Set(3600);
    window.__messages.length = 0;
    const started = C.Start("IC7");
    box._countdownUpgrade.Set(0);
    return { started, data: !!C._lockerData.IC7, messages: window.__messages.slice() };
  }, L);
  check("nothing is unlocked while the Strongbox is upgraded", !upg.started && !upg.data && /being upgraded/.test(upg.messages.join(" ")), upg.messages.join(" | "));

  // ---------- Academy
  const acad = await g(async () => {
    const G = window.__game, A = window.__classByName("ACADEMY"), C = window.__classByName("CREATURELOCKER"), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const ac = G.GLOBAL._bAcademy, up = G.GLOBAL.player.m_upgrades, out = {};
    for (const id of ["IC1", "IC2"]) { C._lockerData[id] = { t: 2 }; up[id] = { level: 1 }; }
    ac._upgrading = null;
    A.Show(ac);
    await sleep(800);
    out.first = A.StartMonsterUpgrade("IC1");
    out.second = A.StartMonsterUpgrade("IC2");
    out.secondTraining = !!up.IC2.time;
    const t0 = ac._animTick; await sleep(1500); out.animated = ac._animTick !== t0;
    const alvl = ac._lvl.Get(); ac._lvl.Set(1);
    out.upgradeRefused = G.BASE.CanUpgrade(ac).errorMessage;
    ac._lvl.Set(alvl);
    // the mark lost
    ac._upgrading = null;
    out.lostStart = A.StartMonsterUpgrade("IC2").error;
    await sleep(1300);
    out.restored = ac._upgrading;
    out.afterRestoreStart = A.StartMonsterUpgrade("IC2").error;
    ac._lvl.Set(1);
    out.afterRestoreUpgrade = /currently training/.test(G.BASE.CanUpgrade(ac).errorMessage || "");
    ac._lvl.Set(alvl);
    // cancel answered twice
    G.BASE._resources.r3.Set(1000); // room below the cap for the refund
    const r0 = G.BASE._resources.r3.Get();
    A.CancelMonsterUpgrade("IC1");
    const r1 = G.BASE._resources.r3.Get();
    A.CancelMonsterUpgrade("IC1");
    const r2 = G.BASE._resources.r3.Get();
    out.refundOnce = r1 > r0 && r2 === r1;
    out.refunds = [r0, r1, r2];
    G.BASE._resources.r3.Set(500000000);
    await sleep(1200);
    out.idleAfterCancel = ac._upgrading;
    // stale speed up target
    A._monsterID = "IC1";
    await sleep(1200);
    out.speedUpTarget = A._monsterID;
    // instant training twice, from the last level the Academy allows
    // one level below the last one the Academy allows (a level 5 Academy trains to 6 since 3 October)
    const lastAllowed = ac._lvl.Get() >= 5 && window.__classByName("CREATURELOCKER").ioReachesLevel6("IC2") ? 6 : ac._lvl.Get();
    up.IC2 = { level: lastAllowed - 1 };
    const startLevel = up.IC2.level;
    const pop = A._mc;
    pop.Setup("IC2");
    window.__purchases.length = 0;
    pop.InstantMonsterUpgrade(null);
    pop.InstantMonsterUpgrade(null);
    out.instantLevels = [startLevel, up.IC2.level];
    out.instantPaid = window.__purchases.filter((p) => p === "ITR").length;
    // no training while the Academy upgrades
    up.IC1 = { level: 1 };
    ac._countdownUpgrade.Set(3600);
    out.whileUpgrading = A.StartMonsterUpgrade("IC1");
    ac._countdownUpgrade.Set(0);
    A.Hide();
    return out;
  });
  check("one training at a time", !acad.first.error && acad.second.error && !acad.secondTraining, JSON.stringify([acad.first, acad.second]));
  check("the Academy animates while it trains", acad.animated);
  check("the Academy can't be upgraded while it trains", /currently training/.test(acad.upgradeRefused || ""), acad.upgradeRefused);
  check("a training whose busy mark was lost gets it back", acad.restored === "IC1" && acad.afterRestoreStart && acad.afterRestoreUpgrade, JSON.stringify({ lostStart: acad.lostStart, restored: acad.restored }));
  check("a cancel answered twice refunds once", acad.refundOnce && acad.idleAfterCancel == null, JSON.stringify({ idle: acad.idleAfterCancel, refunds: acad.refunds }));
  check("Speed Up never points at a finished training", acad.speedUpTarget == null, String(acad.speedUpTarget));
  check("instant training clicked twice trains one level, paid once", acad.instantLevels[1] === acad.instantLevels[0] + 1 && acad.instantPaid === 1, JSON.stringify(acad.instantLevels) + " bought " + acad.instantPaid);
  check("no training while the Academy is upgraded", acad.whileUpgrading.error && /Upgrading/.test(acad.whileUpgrading.errorMessage), JSON.stringify(acad.whileUpgrading));

  // ---------- two Academies
  const two = await g(async () => {
    const G = window.__game, A = window.__classByName("ACADEMY"), C = window.__classByName("CREATURELOCKER"), B26 = window.__classByName("BUILDING26");
    const IM = window.__classByName("com.monsters.managers::InstanceManager"), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const up = G.GLOBAL.player.m_upgrades, out = {};
    let list = IM.getInstancesByClass(B26).slice();
    if (list.length < 2) { const b = G.BASE.addBuildingC(26); b.Setup({ X: -450, Y: 450, id: 982, t: 26, l: 5 }); b.setHealth(b.maxHealth); }
    list = IM.getInstancesByClass(B26).slice(0, 2);
    const [a1, a2] = list;
    for (const id of ["IC1", "IC2", "IC3"]) { C._lockerData[id] = { t: 2 }; up[id] = { level: 1 }; }
    for (const a of list) { a._upgrading = null; a._countdownUpgrade.Set(0); }
    await sleep(1200);
    A._building = a1; out.first = A.StartMonsterUpgrade("IC1").error;
    A._building = a2; out.second = A.StartMonsterUpgrade("IC2").error;
    out.marks = [a1._upgrading, a2._upgrading];
    // long trainings, whatever the server's time divisor
    out.left = [];
    for (const id of ["IC1", "IC2"]) if (up[id].time) { out.left.push(up[id].time.Get() - G.GLOBAL.Timestamp()); up[id].time.Set(G.GLOBAL.Timestamp() + 3600); }
    A._building = a1; out.thirdIn1 = A.StartMonsterUpgrade("IC3").error;
    A._building = a2; out.thirdIn2 = A.StartMonsterUpgrade("IC3").error;
    out.ic3Training = !!up.IC3.time;
    // the "can't upgrade while training" refusal, asked at level 1 (so there is a level to go to), put back at once
    const training = (a) => { const l = a._lvl.Get(); a._lvl.Set(1); const m = G.BASE.CanUpgrade(a).errorMessage; a._lvl.Set(l); return /currently training/.test(m || ""); };
    out.up1 = training(a1); out.up2 = training(a2);
    // a1's mark lost: it comes back to a1
    a1._upgrading = null;
    await sleep(1300);
    out.afterLoss = [a1._upgrading, a2._upgrading];
    // a2's training cancelled: a2 can be upgraded, a1 still can't
    A.CancelMonsterUpgrade("IC2");
    await sleep(1300);
    out.afterCancel = [a1._upgrading, a2._upgrading];
    out.up1b = training(a1); out.up2b = training(a2);
    A.CancelMonsterUpgrade("IC1");
    return out;
  });
  check("two Academies train two monsters at once", !two.first && !two.second && two.marks[0] === "IC1" && two.marks[1] === "IC2", JSON.stringify({ first: two.first, second: two.second, marks: two.marks, left: two.left }));
  check("a third training is refused in either Academy", two.thirdIn1 && two.thirdIn2 && !two.ic3Training);
  check("neither can be upgraded while training", two.up1 && two.up2);
  check("a lost mark goes back to the Academy that lost it", two.afterLoss[0] === "IC1" && two.afterLoss[1] === "IC2", JSON.stringify(two.afterLoss));
  check("the idle Academy can be upgraded, the training one can't", two.afterCancel[0] === "IC1" && two.afterCancel[1] == null && two.up1b && !two.up2b, JSON.stringify({ marks: two.afterCancel, up1: two.up1b, up2: two.up2b }));

  await g(() => window.__restoreMessage());
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("run", false, String(e).slice(0, 400));
}
await browser.close();
