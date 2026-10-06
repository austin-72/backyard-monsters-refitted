// Moloch's Gauntlet, the monthly event (server services/events/gauntlet.ts, client IoGauntlet.as):
//  - opened and closed from the admin panel (and by the calendar: the first 7 days of each month)
//  - 13 stages, 90% destroyed to beat one, its reward: 5 shiny and resources growing to 30M (15M magma),
//    +150 shiny at the last; paid once, into the main yard; no loot from the yards
//  - 3 attempts a yard: its damage stays between them; the third failure heals it and loses its reward,
//    and beating it afterwards opens the next stage but pays nothing; attacks that never ended count too
//  - only the stage to fight now; nobody else's yard; closed means closed; a new month starts again
//  - paid once whatever the player does: the same last save five times at once, sent again later, a stage
//    already beaten attacked again or opened another way, a save from an older attack, an attack that
//    never ended settled by several requests at once, an admin's "Start again"; a new month pays again
//  - in the game: the button on the main yard (under the fifth worker), while closed a popup
//    saying only when it starts, the window ("The Descent": 13 gates, the legend, the chosen gate with its
//    prize and attempts left), the attack from the main yard, the destruction bar, and the result at home
//  - admin test mode: a test ladder of its own, always open, played for real but paying nothing, gone when
//    test mode goes off
//   EMAIL=... PASSWORD=... EMAIL2=... PGPASSWORD=... node tools/test/gauntlet-test.mjs
// Needs a local test server and database (psql); EMAIL is an admin. Puts the account's shiny and resources
// back, and the Gauntlet back to the calendar. Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const login = async (email, password) => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)).token;
let token = await login(process.env.EMAIL, process.env.PASSWORD);
const userid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const before = sql(`SELECT credits || '|' || resources::text || '|' || monsters::text FROM bym.save WHERE saveuserid = ${userid} AND type = 'main'`);
const money = () => { const [c, r] = sql(`SELECT credits || '|' || resources::text FROM bym.save WHERE saveuserid = ${userid} AND type = 'main'`).split("|"); const res = JSON.parse(r); return { credits: Number(c), r1: res.r1, r4: res.r4 }; };

// the admin panel
const code = (await post("admin/session", "", token)).code;
const cookie = ((await fetch(`${server}admin/signin?code=${code}`, { redirect: "manual" })).headers.get("set-cookie") || "").match(/bymr_admin=[a-f0-9]+/)?.[0];
const admin = async (action, body = {}) => (await (await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: cookie }, body: JSON.stringify(body) })).json());
await admin("gauntletReset", { id: userid });
sql(`DELETE FROM bym.gauntlet_claim WHERE userid = ${userid}`); // (a clean month for the account)
const closed = await admin("gauntlet", { state: "closed" });
const status = () => post("gauntlet/status", "", token);
let s = await status();
check("closed from the admin panel: closed", closed.gauntlet && !closed.gauntlet.open && s.open === false, JSON.stringify(closed.gauntlet));
const nextFirst = (() => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000; })();
check("...until the 1st at most: it always opens then", s.opensAt === nextFirst && closed.gauntlet.opensAt === nextFirst, `${s.opensAt} vs ${nextFirst}`);
const attackLoad = (baseid, t = token) => post("base/load", `userid=&baseid=${baseid}&type=attack&mapversion=2&attackData=${encodeURIComponent(JSON.stringify({ monsters: [], champions: [] }))}`, t);
const closedLoad = await attackLoad(s.stages[0].baseid);
check("no attack while it is closed", closedLoad.status === 409 && /closed/.test(closedLoad.error || ""), JSON.stringify({ status: closedLoad.status, error: closedLoad.error }));
const opened = await admin("gauntlet", { state: "open" });
s = await status();
check("opened from the admin panel: open for 7 days", opened.gauntlet.open && s.open && Math.abs(s.closesAt - s.now - 7 * 86400) < 60, JSON.stringify(opened.gauntlet));

// the ladder
check("13 stages, the first to fight, 3 attempts each", s.stages.length === 13 && s.current === 1 && s.stages.every((x) => x.attemptsLeft === 3 && !x.won) && s.winPercent === 90, `${s.stages.length} ${s.current}`);
check("rewards: 5 shiny and resources growing to 30M / 15M magma", JSON.stringify(s.stages[0].reward) === JSON.stringify({ shiny: 5, r1: 2300000, r2: 2300000, r3: 2300000, r4: 1200000 }) && JSON.stringify(s.stages[12].reward) === JSON.stringify({ shiny: 155, r1: 30000000, r2: 30000000, r3: 30000000, r4: 15000000 }), JSON.stringify([s.stages[0].reward, s.stages[6].reward, s.stages[12].reward]));
check("the player's main yard comes with it (to attack from)", s.home && s.home.mine === 1 && s.home.b === 2 && typeof s.home.x === "number", JSON.stringify(s.home && { b: s.home.b, x: s.home.x, y: s.home.y }));
const early = await attackLoad(s.stages[1].baseid);
check("only the stage to fight now", early.status === 409, JSON.stringify({ status: early.status, error: early.error }));

// stage 1 beaten
const m0 = money();
const fight = async (stage, damage, over = true) => {
  const yard = await attackLoad(s.stages[stage - 1].baseid);
  if (!over) return yard;
  const health = damage > 0 ? encodeURIComponent(JSON.stringify({ "0": 0 })) : encodeURIComponent("{}");
  const saved = await post("base/save", `basesaveid=${yard.basesaveid}&baseid=${yard.baseid}&attackid=${yard.attackid}&damage=${damage}&destroyed=${damage >= 90 ? 1 : 0}&over=1&buildinghealthdata=${health}&attackloot=${encodeURIComponent(JSON.stringify({ r1: 999999, r2: 999999, r3: 999999, r4: 999999 }))}`, token);
  return { yard, saved };
};
const claims = () => Number(sql(`SELECT count(*) FROM bym.gauntlet_claim WHERE userid = ${userid}`));
const lastSave = (yard, damage, extra = "") => `basesaveid=${yard.basesaveid}&baseid=${yard.baseid}&attackid=${yard.attackid}&damage=${damage}&destroyed=${damage >= 90 ? 1 : 0}&over=1&buildinghealthdata=${encodeURIComponent(JSON.stringify({ "0": 0 }))}${extra}`;
const oneYard = await attackLoad(s.stages[0].baseid);
check("an attack loads the player's own copy of the yard", oneYard.status === 200 && oneYard.type === "tribe" && /Moloch's Gauntlet 1/.test(oneYard.name || "") && Object.keys(oneYard.buildingdata || {}).length > 10, JSON.stringify({ status: oneYard.status, name: oneYard.name }));
const wrongId = await post("base/save", lastSave({ ...oneYard, attackid: oneYard.attackid + 1 }, 95), token);
check("a save that isn't from the attack running is refused", wrongId.status === 409 && /already ended/.test(wrongId.error || "") && money().credits === m0.credits, JSON.stringify({ status: wrongId.status, error: wrongId.error }));
// the winning save five times at once (a double click, a resend, two games)
const burst = await Promise.all(Array.from({ length: 5 }, () => post("base/save", lastSave(oneYard, 95, `&attackloot=${encodeURIComponent(JSON.stringify({ r1: 999999, r2: 999999, r3: 999999, r4: 999999 }))}`), token)));
const m1 = money();
s = await status();
check("90% destroyed: beaten, the next stage opens", s.current === 2 && s.stages[0].won && s.stages[0].paid && s.last && s.last.result === "won", JSON.stringify(s.last));
check("its reward is paid into the main yard, and no loot", m1.credits - m0.credits === 5 && m1.r1 - m0.r1 === 2300000 && m1.r4 - m0.r4 === 1200000, JSON.stringify([m0, m1]));
check("the same last save five times at once: one taken, paid once", burst.filter((r) => r.status === 200).length === 1 && burst.filter((r) => r.status === 409 || r.status === 403).length === 4 && claims() === 1, burst.map((r) => r.status).join(","));
const replay = await post("base/save", lastSave(oneYard, 95), token);
check("the last save sent again later: refused, nothing paid", replay.status >= 400 && money().credits === m1.credits, JSON.stringify({ status: replay.status, error: replay.error }));
const again = await attackLoad(s.stages[0].baseid);
check("a stage beaten can't be attacked again", again.status === 409 && money().credits === m1.credits, JSON.stringify({ status: again.status, error: again.error }));
const otherModes = [];
for (const type of ["view", "wmview", "iattack", "iwmattack", "iwmview"]) otherModes.push((await post("base/load", `userid=&baseid=${s.stages[0].baseid}&type=${type}&mapversion=2`, token)).status);
check("...nor opened any other way (view, inferno attack)", otherModes.every((x) => x === 403), otherModes.join(","));
check("paid once", money().credits === m1.credits && claims() === 1);

// stage 2: three failures heal it and lose its reward; beaten afterwards, it pays nothing
let f = await fight(2, 30);
s = await status();
check("a failed attempt: 2 left, its damage stays", s.stages[1].attemptsLeft === 2 && s.stages[1].damage === 30 && !s.stages[1].lost && s.last.result === "failed", JSON.stringify(s.stages[1]));
const kept = await attackLoad(s.stages[1].baseid);
check("the yard is loaded as it was left", kept.damage === 30 && JSON.stringify(kept.buildinghealthdata) === JSON.stringify({ "0": 0 }), JSON.stringify({ damage: kept.damage, health: kept.buildinghealthdata }));
await post("base/save", `basesaveid=${kept.basesaveid}&baseid=${kept.baseid}&attackid=${kept.attackid}&damage=50&destroyed=0&over=1`, token);
s = await status();
check("the second failure: 1 left", s.stages[1].attemptsLeft === 1 && s.stages[1].damage === 50, JSON.stringify(s.stages[1]));
f = await fight(2, 60);
s = await status();
check("the third failure: healed, its reward lost, 3 attempts again", s.stages[1].lost && s.stages[1].attemptsLeft === 3 && s.stages[1].damage === 0 && s.last.result === "healed", JSON.stringify(s.stages[1]));
const healed = await attackLoad(s.stages[1].baseid);
check("healed: no damage, its defenders back", healed.damage === 0 && JSON.stringify(healed.buildinghealthdata) === "{}", JSON.stringify({ damage: healed.damage, health: healed.buildinghealthdata }));
await post("base/save", `basesaveid=${healed.basesaveid}&baseid=${healed.baseid}&attackid=${healed.attackid}&damage=0&destroyed=0&over=1`, token);
const m2 = money();
await fight(2, 92);
s = await status();
check("beaten after that: the next stage opens, no reward", s.current === 3 && s.stages[1].won && !s.stages[1].paid && money().credits === m2.credits && s.last.result === "won" && !s.last.reward, JSON.stringify(s.last));

// attacks that never end count too: each new attack ends the one before; the last is ended 30 minutes on
const age = () => sql(`UPDATE bym."user" SET gauntlet = jsonb_set(gauntlet, '{fight,at}', to_jsonb(extract(epoch from now())::int - 1900)) WHERE userid = ${userid}`);
for (let i = 0; i < 3; i++) await fight(3, 0, false);
s = await status();
check("an attack still running: its attempt counted, not ended yet", s.stages[2].attemptsLeft === 0 && !s.stages[2].lost, JSON.stringify(s.stages[2]));
age();
s = await status();
check("three attacks that never ended: shown healed and lost", s.stages[2].lost && s.stages[2].attemptsLeft === 3, JSON.stringify(s.stages[2]));
const running = await fight(3, 0, false);
s = await status();
check("the next attack heals it (2 left after it)", s.stages[2].lost && s.stages[2].attemptsLeft === 2, JSON.stringify(s.stages[2]));
// catapults: a shot's cost comes off the main yard (it used to be dropped with the loot, so shots were free)
const mc0 = money();
const shot = await post("base/save", `basesaveid=${running.basesaveid}&baseid=${running.baseid}&attackid=${running.attackid}&damage=3&destroyed=0&over=0&attackloot=${encodeURIComponent(JSON.stringify({ r1: -50000, r4: -12000 }))}`, token);
const mc1 = money();
check("catapult shots in the Gauntlet cost what they cost: Bone and Magma taken off the main yard", shot.status === 200 && mc0.r1 - mc1.r1 === 50000 && mc0.r4 - mc1.r4 === 12000, JSON.stringify({ status: shot.status, error: shot.error, mc0, mc1 }));
const looted = await post("base/save", `basesaveid=${running.basesaveid}&baseid=${running.baseid}&attackid=${running.attackid}&damage=4&destroyed=0&over=0&attackloot=${encodeURIComponent(JSON.stringify({ r1: 999999, r4: -1000 }))}`, token);
const mc2 = money();
check("...and still no loot there: only the spending of a save is kept", looted.status === 200 && mc2.r1 === mc1.r1 && mc1.r4 - mc2.r4 === 1000, JSON.stringify({ status: looted.status, mc1, mc2 }));

// nobody else's yard
const other = await login(process.env.EMAIL2, process.env.PASSWORD);
const theirs = await attackLoad(s.stages[2].baseid, other);
check("another player can't attack someone's Gauntlet yard", theirs.status === 403, JSON.stringify({ status: theirs.status, error: theirs.error }));
const mine = await attackLoad(s.stages[2].baseid);
const foreign = await post("base/save", `basesaveid=${mine.basesaveid}&baseid=${mine.baseid}&attackid=${mine.attackid}&damage=99&destroyed=1&over=1`, other);
check("...nor save to it", foreign.status === 403, JSON.stringify({ status: foreign.status, error: foreign.error }));

// the map's "reset every tribe yard" leaves them
await admin("resetTribes", { all: true });
check("resetting the tribe yards leaves the Gauntlet's", Number(sql(`SELECT count(*) FROM bym.save WHERE baseid LIKE '9%' AND length(baseid) = 15`)) >= 3);

// 4. the game: button, window, attack, bar, result
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const g = (fn, a) => page.evaluate(fn, a);
// (the test account houses no monsters: the window is given some to attack with)
await page.route(/gauntlet\/status/, async (route) => { const r = await route.fetch(); const j = await r.json(); if (j.home) j.home.m = Object.assign({}, j.home.m, { housed: { IC1: 40 } }); await route.fulfill({ response: r, json: j }); });
await page.goto(`${server}?token=${await login(process.env.EMAIL, process.env.PASSWORD)}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
await g(() => { window.__game.WMATTACK._enabled = false; });
const texts = () => g(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T && o.text) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out; });
const find = (re) => g((src) => { const re = new RegExp(src); let hit = null; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (hit || !o.visible) return; if (o instanceof T && re.test(o.text)) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, re.source);
const button = await g(() => { const b = window.__classByName("UI2")._top._ioGauntlet; if (!b || !b.visible) return null; const r = b.getBounds(window.__player.stage); return { spin: b.mcSpinner.visible, at: window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2) }; });
check("the button is on the main yard, turning while it is open", button && button.spin, JSON.stringify(button));
await page.mouse.click(button.at.x, button.at.y);
await page.waitForTimeout(2500);
let shown = await texts();
check("the window: the legend, the gate to fight with its prize and attempts left", shown.includes("MOLOCH'S GAUNTLET") && shown.some((t) => /^Once each moon, Moloch throws open the gates/.test(t)) && shown.includes("Gate III: The Cinder Wall") && shown.some((t) => /^1 attempt left · prize lost$/.test(t)) && shown.some((t) => /^Prize: 5 shiny, 6.9M bone, coal and sulfur, 3.5M magma$/.test(t)) && shown.includes("ENTER THE GATE"), shown.filter((t) => /Gate|left|Prize|GAUNTLET/.test(t)).slice(0, 8).join(" | "));
const gates = await g(() => { const w = window.__game.GLOBAL._layerTop.getChildByName("ioGauntletWindow"); const out = []; for (let n = 1; n <= 13; n++) { const s = w.getChildByName("ioGate" + n); if (s) out.push(n); } return out; });
check("13 gates", gates.length === 13, gates.join(","));
const gateAt = async (n) => g((n) => { const s = window.__game.GLOBAL._layerTop.getChildByName("ioGauntletWindow").getChildByName("ioGate" + n); const r = s.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); }, n);
await page.mouse.click(...Object.values(await gateAt(1)));
await page.waitForTimeout(500);
shown = await texts();
check("a gate beaten, chosen: broken, its prize yours", shown.includes("Gate I: The Ashen Gate") && shown.includes("Broken · its prize is yours") && !shown.includes("ENTER THE GATE"), shown.filter((t) => /Gate|Broken/.test(t)).join(" | "));
await page.mouse.click(...Object.values(await gateAt(2)));
await page.waitForTimeout(500);
shown = await texts();
check("...and one whose prize was lost", shown.includes("Broken · its prize was lost"), shown.filter((t) => /Broken/.test(t)).join(" | "));
await page.mouse.click(...Object.values(await gateAt(5)));
await page.waitForTimeout(500);
shown = await texts();
check("...and one further down: sealed", shown.includes("Sealed · break gate III first"), shown.filter((t) => /Sealed/.test(t)).join(" | "));
await page.mouse.click(...Object.values(await gateAt(3)));
await page.waitForTimeout(500);
await page.mouse.click(...Object.values(await find(/^ENTER THE GATE$/)));
await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "wmattack" && window.__game.BASE._buildingCount > 0, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
const attack = await g(() => ({ mode: window.__game.GLOBAL._loadmode, base: String(window.__game.BASE._loadedBaseID), avail: Object.assign({}, window.__game.ATTACK._curCreaturesAvailable) }));
check("Attack: the stage's yard, with the main yard's monsters", attack.mode === "wmattack" && attack.base === s.stages[2].baseid && attack.avail.IC1 === 40, JSON.stringify(attack));
shown = await texts();
check("the bar: how much is destroyed and the line to reach", shown.some((t) => /^Gate III: \d+% destroyed, 90% breaks it$/.test(t)), shown.filter((t) => /Gate/.test(t)).join(" | "));
await g(() => { const IM = window.__classByName("com.monsters.managers::InstanceManager"), BF = window.__classByName("BFOUNDATION"); for (const b of IM.getInstancesByClass(BF)) if (b._class !== "wall") { try { b.modifyHealth(-b.health); } catch (e) {} } });
await page.waitForTimeout(1500);
shown = await texts();
check("...filling up as buildings fall", shown.some((t) => /^Gate III: (9\d|100)% destroyed/.test(t)), shown.filter((t) => /Gate/.test(t)).join(" | "));
await g(() => { window.__game.ATTACK.End(); });
await page.waitForTimeout(3500);
shown = await texts();
check("the attack's end: the gate falls, home next", shown.includes("Gate III falls!") && shown.includes("Return Home"), shown.filter((t) => /Gate|Return/.test(t)).join(" | "));
await page.mouse.click(...Object.values(await find(/^Return Home$/)));
await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build", null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(5000);
shown = await texts();
check("home: the window again with what happened, the next gate chosen", shown.some((t) => /^Gate III falls, but its prize was lost\. The next gate awaits\.$/.test(t)) && shown.includes("Gate IV: The Iron Maw") && shown.includes("3 attempts left") && shown.includes("ENTER THE GATE"), shown.filter((t) => /Gate|left/.test(t)).join(" | "));
const bar = await g(() => { const L = window.__game.GLOBAL._layerUI; let found = false; const walk = (o) => { if (o.name === "ioGauntletBar") found = true; for (const c of o.$children ?? []) walk(c); }; walk(L); return found; });
check("no bar at home", !bar);
// the button; closed, a popup saying only when it starts
const line = await g(() => { const top = window.__classByName("UI2")._top; const mid = (o) => { const r = o.mcHit.getBounds(window.__player.stage); return [r.x + r.width / 2, r.width]; }; const gb = top._ioGauntlet.getBounds(window.__player.stage); const gi = top._ioGauntlet; return { invite: mid(top._buttonIcons.find((b) => b.name === "bInvite")), gauntletX: gi.localToGlobal({ x: 20.75, y: 20.75 }).x, gauntletW: gb.width }; });
// (its place, under the fifth worker since 27 September, is checked by ui-fixes-test.mjs)
check("the button: on the main yard", line.gauntletW > 30 && await g(() => window.__classByName("UI2")._top._ioGauntlet.visible), JSON.stringify(line));
await g(() => { const G = window.__classByName("com.monsters.maproom_advanced::IoGauntlet"); if (G._open) G._open.close(); });
await page.waitForTimeout(600);
await admin("gauntlet", { state: "closed" });
const at = await g(() => { const b = window.__classByName("UI2")._top._ioGauntlet; const r = b.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
await page.mouse.click(at.x, at.y);
await page.waitForTimeout(2500);
shown = await texts();
check("closed: the button says when it starts, and nothing else", shown.some((t) => /^Moloch's Gauntlet starts in \d+d \d+h\.$/.test(t)) && !shown.includes("MOLOCH'S GAUNTLET") && !shown.includes("ENTER THE GATE"), shown.filter((t) => /Gauntlet|GAUNTLET/.test(t)).join(" | "));
await admin("gauntlet", { state: "open" });
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();

// a new month starts again (a fresh login: the game logging in replaced the one above)
token = await login(process.env.EMAIL, process.env.PASSWORD);
sql(`UPDATE bym."user" SET gauntlet = jsonb_set(gauntlet, '{month}', '"2020-01"') WHERE userid = ${userid}`);
sql(`UPDATE bym.gauntlet_claim SET month = '2020-01' WHERE userid = ${userid}`);
s = await status();
const ids = s.stages.map((x) => `'${x.baseid}'`).join(",");
check("a new month: from stage 1 again, last month's yards gone", s.current === 1 && s.stages.every((x) => !x.won && !x.paid && x.attemptsLeft === 3) && Number(sql(`SELECT count(*) FROM bym.save WHERE baseid IN (${ids})`)) === 0, `${s.current}`);

// an attack left at 95% without its last save (the game closed), then several requests at once
const m3 = money();
const left95 = await attackLoad(s.stages[0].baseid);
const mid = await post("base/save", `basesaveid=${left95.basesaveid}&baseid=${left95.baseid}&attackid=${left95.attackid}&damage=95&destroyed=1&over=0`, token);
age();
const rush = await Promise.all([status(), status(), attackLoad(s.stages[0].baseid), attackLoad(s.stages[0].baseid), status()]);
s = await status();
check("an attack left at 95% is beaten when it ends: the new month pays again, once", mid.status === 200 && s.stages[0].won && s.stages[0].paid && money().credits - m3.credits === 5 && claims() === 2, JSON.stringify({ mid: mid.status, rush: rush.map((r) => r.status), got: money().credits - m3.credits }));
const late = await post("base/save", `basesaveid=${left95.basesaveid}&baseid=${left95.baseid}&attackid=${left95.attackid}&damage=95&destroyed=1&over=1`, token);
check("...and its last save arriving after that: refused, nothing more", late.status === 409 && money().credits - m3.credits === 5, JSON.stringify({ status: late.status }));

// an admin's "Start again": the ladder again, but a reward paid this month is not paid again
await admin("gauntletReset", { id: userid });
const m4 = money();
const redo = await fight(1, 97);
s = await status();
check("Start again: beaten again, not paid again", redo.saved.status === 200 && s.stages[0].won && s.stages[0].paid && s.last.already && money().credits === m4.credits && claims() === 2, JSON.stringify(s.last));

// admin test mode: a test ladder of its own, always open, paying nothing; the real one left alone
await admin("gauntlet", { state: "closed" });
const realBefore = sql(`SELECT gauntlet - 'test' FROM bym."user" WHERE userid = ${userid}`);
await post("admin/testmode", "action=on", token);
let ts = await status();
check("test mode: the test ladder, open while the Gauntlet is closed", ts.open && ts.test && ts.current === 1 && ts.stages[0].baseid !== s.stages[0].baseid && ts.stages.every((x) => !x.won), JSON.stringify({ open: ts.open, test: ts.test, baseid: ts.stages[0].baseid }));
const realYard = await attackLoad(s.stages[0].baseid);
check("...the real ladder's yards are not played in test mode", realYard.status === 409 && /test ladder/.test(realYard.error || ""), JSON.stringify({ status: realYard.status, error: realYard.error }));
const m5 = money(), c5 = claims();
const testYard = await attackLoad(ts.stages[0].baseid);
const testWin = await post("base/save", lastSave(testYard, 96), token);
ts = await status();
check("...played for real: beaten, the next gate opens, what it would pay shown", testWin.status === 200 && ts.current === 2 && ts.stages[0].won && ts.stages[0].paid && ts.last.test && ts.last.reward && ts.last.reward.shiny === 5, JSON.stringify(ts.last));
check("...paying nothing, claiming nothing", money().credits === m5.credits && claims() === c5, JSON.stringify([m5, money(), c5, claims()]));
const testFail = await attackLoad(ts.stages[1].baseid);
await post("base/save", lastSave(testFail, 20), token);
ts = await status();
check("...attempts counted as for real", ts.stages[1].attemptsLeft === 2 && ts.stages[1].damage === 20, JSON.stringify(ts.stages[1]));
check("...the real ladder untouched", sql(`SELECT gauntlet - 'test' FROM bym."user" WHERE userid = ${userid}`) === realBefore);
const testIds = ts.stages.map((x) => `'${x.baseid}'`).join(",");
await post("admin/testmode", "action=off", token);
token = await login(process.env.EMAIL, process.env.PASSWORD);
check("test mode off: the test ladder and its yards are gone", Number(sql(`SELECT count(*) FROM bym.save WHERE baseid IN (${testIds})`)) === 0 && sql(`SELECT coalesce(gauntlet ? 'test', false) FROM bym."user" WHERE userid = ${userid}`) === "f", "");
const stale = await attackLoad(ts.stages[0].baseid);
check("...and can't be played any more", stale.status === 409, JSON.stringify({ status: stale.status, error: stale.error }));

// put things back
await admin("gauntletReset", { id: userid });
sql(`DELETE FROM bym.gauntlet_claim WHERE userid = ${userid}`);
await admin("gauntlet", { state: "auto" });
const [credits, resources, monsters] = before.split("|");
sql(`UPDATE bym.save SET credits = ${credits}, resources = '${resources}'::json, monsters = '${monsters}'::json WHERE saveuserid = ${userid} AND type = 'main'`);
s = await status();
check("back to the calendar", !s.forced && s.stages.every((x) => !x.won), `open: ${s.open}`);
