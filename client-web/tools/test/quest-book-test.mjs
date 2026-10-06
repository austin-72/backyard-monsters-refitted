// The quest book (Inferno, 2 October): the server's book (server/src/services/quests/) drawn by the game
// (client/scripts/com/monsters/quests/).
//  - the dock's rows and the Quests button's badge
//  - the window: categories with counts, a category's tree, the quest picked, its reward
//  - Collect: the server pays it, the yard shown here gets it at once, the next quests open
//  - the daily quests; Hide finished; dragging round the tree
//  - Collect all, which goes on down a tree and opens its chest
//  - something the game reports counted by the server (once), an unknown one left out; a wart picked
//  - the notice when a quest becomes ready; "Go there"
// Starts the player's quest book again first (psql: PGPASSWORD, the database in PGDATABASE, default bymio).
//   EMAIL=... PASSWORD=... node tools/test/quest-book-test.mjs
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const DB = process.env.PGDATABASE || "bymio";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const form = (o) => new URLSearchParams(o).toString();
const api = async (path, body, token, method = "POST") => {
  const r = await fetch(server + path, { method, headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: method === "POST" ? form(body || {}) : undefined });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t.slice(0, 200) }; }
};
const sql = (q) => execSync(`psql -h localhost -U postgres -d ${DB} -tAc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
let token = (await api("api/v1.7.3-beta/player/getinfo", { version: 128, email: process.env.EMAIL, password: process.env.PASSWORD })).token;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
sql(`DELETE FROM bym.quest_progress WHERE userid = ${uid}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.errors = [];
page.on("pageerror", (e) => page.errors.push(e.message));
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await sleep(6000);
await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} const D = window.__classByName("com.monsters.daily::IoDailyPopup"); if (D && D._open) D._open.close(); });
token = await page.evaluate(() => window.__game.LOGIN.token);

const Q = "window.__classByName('com.monsters.quests::IoQuests')";
const BOOK = "window.__classByName('com.monsters.quests::IoQuestBook')._open";
const where = (name, within = null) => page.evaluate(([name, within]) => {
  let hit = null;
  const root = within ? eval(within) : window.__player.stage;
  const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name && o.stage) { hit = o; return; } for (const c of o.$children ?? []) walk(c); };
  walk(root);
  if (!hit) return null;
  const r = hit.getBounds(window.__player.stage);
  return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2);
}, [name, within]);
const click = async (name, within = null) => { const p = await where(name, within); if (p) { await page.mouse.click(p.x, p.y); await sleep(600); } return !!p; };
const texts = (root) => page.evaluate((root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const o0 = eval(root); if (!o0) return ""; const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(o0); return out.join(" | "); }, root);
const names = (root, prefix) => page.evaluate(([root, prefix]) => { const out = []; const o0 = eval(root); if (!o0) return out; const walk = (o) => { if (o.name && o.name.indexOf(prefix) === 0) out.push(o.name); for (const c of o.$children ?? []) walk(c); }; walk(o0); return out; }, [root, prefix]);
const status = () => api("quests/status", {}, token);
const quest = (book, id) => book.quests.find((q) => q.id === id);
const resources = () => page.evaluate(() => ({ r1: window.__game.BASE._resources.r1.Get(), credits: window.__game.BASE._credits.Get() }));

// 1. the book arrives; the dock and the Quests button
await page.waitForFunction((Q) => eval(Q).book != null, Q, { timeout: 30000 });
await sleep(1500);
const dockRows = await names("window.__player.stage", "ioQuestRow");
check("the dock shows the book's rows", dockRows.includes("ioQuestRowBook") && dockRows.length >= 2, dockRows.join(","));
const ready0 = await page.evaluate((Q) => eval(Q).ready, Q);
check("some quests ready at once (done before the book counted)", ready0 > 0, String(ready0));
await page.screenshot({ path: `${OUT}/quest-dock.png` });

// 2. the window
await page.evaluate(() => window.__game.QUESTS.Show());
await sleep(1500);
let t = await texts(BOOK + ".mc");
check("the Quests button opens the quest book", /Quest Book/.test(t) && /Collect all \(\d+\)/.test(t), t.slice(0, 160));
check("categories with counts", /Start/.test(t) && /Alliances/.test(t) && /The Pit/.test(t) && /\d+\/\d+/.test(t), "");
await click("ioQuestCat:start");
let nodes = await names(BOOK + ".mc", "ioQuestNode:");
check("Start's tree: ten quests", nodes.length === 10 && nodes.includes("ioQuestNode:s_sharp"), nodes.length + "");
await page.screenshot({ path: `${OUT}/quest-book-start.png` });

// 3. collect one: Alliances' first quest (the player is in one)
await click("ioQuestCat:alliances");
await click("ioQuestNode:a_join");
t = await texts(BOOK + "._panel");
check("the quest picked: name, state, what to do, reward", /Join an alliance/.test(t) && /Ready to collect/.test(t) && /Reward/.test(t) && /shiny/.test(t), t.slice(0, 200));
await page.screenshot({ path: `${OUT}/quest-book-alliances.png` });
const before = await resources();
await click("ioQuestCollect");
await sleep(2500);
const after = await resources();
let book = await status();
check("collected on the server", quest(book, "a_join").state === "claimed", quest(book, "a_join").state);
check("the yard shown has the reward at once", after.r1 - before.r1 >= 250000 && after.r1 - before.r1 < 252000 && after.credits - before.credits === 10, `${after.r1 - before.r1} bone, ${after.credits - before.credits} shiny`);
t = await texts(BOOK + ".mc");
check("the window says what was collected", /Collected: /.test(t), "");
const opened = book.quests.filter((q) => q.parent === "a_join").map((q) => q.state);
check("its children opened", opened.length > 0 && !opened.includes("locked"), opened.join(","));
const again = await api("quests/claim", { ids: "a_join" }, token);
check("collected once only", again.error === "Nothing to collect.", JSON.stringify(again).slice(0, 80));

// 4. today's daily quests
await click("ioQuestCat:daily");
const daily = await names(BOOK + ".mc", "ioQuestDaily:");
t = await texts(BOOK + ".mc");
check("the daily quests (up to three), the countdown, the bonus", daily.length >= 1 && daily.length <= 3 && /new ones in \d+/.test(t) && /Finish all three/.test(t), daily.join(","));
await page.screenshot({ path: `${OUT}/quest-book-daily.png` });

// 5. moving round a big tree; Hide finished
await click("ioQuestCat:yard");
const x0 = await page.evaluate((B) => eval(B)._content.x, BOOK);
const c = await where("ioQuestCanvas");
await page.mouse.move(c.x, c.y);
await page.mouse.down();
await page.mouse.move(c.x - 150, c.y - 60, { steps: 6 });
await page.mouse.up();
await sleep(400);
const x1 = await page.evaluate((B) => eval(B)._content.x, BOOK);
check("dragging moves round the tree", x1 !== x0, `${x0} -> ${x1}`);

// 6. Collect all (the Pit's quests are done already: the bets are there; Start's are marked done here, so
// collecting goes on down its tree and opens its chest), then the Pit is all done
const startIds = (await status()).quests.filter((q) => q.cat === "start").map((q) => q.id);
sql(`UPDATE bym.quest_progress SET forced = forced || '${JSON.stringify(Object.fromEntries(startIds.map((id) => [id, true])))}'::jsonb WHERE userid = ${uid}`);
await page.evaluate((Q) => eval(Q).refresh(true), Q);
await sleep(2000);
const readyBefore = (await status()).ready;
await click("ioQuestCollectAll");
await sleep(3000);
book = await status();
check("Collect all", book.claimed > 1 && book.ready < readyBefore, `ready ${readyBefore} -> ${book.ready}, claimed ${book.claimed}`);
check("down the tree and its chest", book.quests.filter((q) => q.cat === "start").every((q) => q.state === "claimed") && book.chests.find((c) => c.id === "chest_start").state === "claimed", "");
await click("ioQuestCat:pit");
const pitDone = book.quests.filter((q) => q.cat === "pit").every((q) => q.state === "claimed");
if (pitDone) {
  await click("ioQuestHideDone");
  t = await texts(BOOK + ".mc");
  check("Hide finished folds a finished category away", /Every quest here is finished/.test(t), "");
  await click("ioQuestHideDone");
}
else check("Hide finished (the Pit isn't finished here)", true, "skipped");

// 7. something the game reports (here as the map's zoom does when it shows the whole world), counted by the
// server once however often it is reported; one the server doesn't know is left out
await page.evaluate((B) => eval(B).close(), BOOK);
await page.evaluate((Q) => { const q = eval(Q); q.once("map_world"); q.once("map_world"); q.event("not_a_quest_event"); }, Q);
await sleep(4500);
book = await status();
check("a reported event counted once", quest(book, "p_world").value === 1 && sql(`SELECT counters->>'map_world' FROM bym.quest_progress WHERE userid = ${uid}`) === "1", String(quest(book, "p_world").value));
check("an unknown event left out", sql(`SELECT counters ? 'not_a_quest_event' FROM bym.quest_progress WHERE userid = ${uid}`) === "f", "");
// a wart picked in the yard (the game's own pick: MUSHROOMS.Pick), counted for the Start quest and today's
const picked = await page.evaluate(() => { const ms = window.__game.BASE._buildingsMushrooms; for (const k in ms) { if (ms[k]) { window.__game.MUSHROOMS.Pick(ms[k]); return true; } } return false; });
if (picked) {
  await sleep(4500);
  check("a wart picked counts", sql(`SELECT counters->>'wart_pick' FROM bym.quest_progress WHERE userid = ${uid}`) === "1", "");
  await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
}
else check("a wart picked counts (no wart in the yard)", true, "skipped");

// 8. a quest becomes ready: the notice
sql(`UPDATE bym.quest_progress SET forced = forced || '{"a_chat": true}'::jsonb WHERE userid = ${uid}`);
await page.waitForFunction(() => window.__game.GLOBAL.mode === "build", null, { timeout: 30000 }).catch(() => {});
await page.evaluate((Q) => eval(Q).refresh(true), Q);
await sleep(2500);
const toast = await where("ioQuestToast");
check("a notice for the quest now ready", !!toast, "");
await page.screenshot({ path: `${OUT}/quest-toast.png` });
if (toast) {
  await page.mouse.click(toast.x, toast.y);
  await sleep(1500);
  t = await texts(BOOK + "._panel");
  check("the notice opens the book at it", /Alliance chat/.test(t), t.slice(0, 80));
}

// 9a. the old list is still there
await page.evaluate(() => window.__game.QUESTS.Show());
await sleep(1200);
const linked = await click("ioQuestOld");
await sleep(1200);
const oldOpen = await page.evaluate(() => window.__game.QUESTS._open);
check("the old quest list opens from the book", linked && oldOpen === true, `${linked} ${oldOpen}`);
await page.evaluate(() => window.__game.QUESTS.Hide());

await page.evaluate(() => window.__game.QUESTS.Show());
await sleep(1200);
// 9. Go there: a building quest for a building the yard hasn't got opens the build menu at it
const toBuild = (await status()).quests.find((q) => q.tmpl === "build" && q.state !== "claimed" && q.value === 0);
await page.evaluate((id) => window.__classByName("com.monsters.quests::IoQuestBook").Show(null, id), toBuild.id);
await sleep(1500);
await click("ioQuestGo");
await sleep(1500);
const went = await page.evaluate(() => ({ book: !!window.__classByName("com.monsters.quests::IoQuestBook")._open, buildings: !!window.__game.BUILDINGS._open, id: window.__game.BUILDINGS._buildingID }));
check("Go there closes the book and opens the build menu at it", !went.book && went.buildings && "build:" + went.id === toBuild.go, `${toBuild.id} ${JSON.stringify(went)}`);
await page.screenshot({ path: `${OUT}/quest-go.png` });
await page.evaluate(() => { try { window.__game.BUILDINGS.Hide(); } catch (e) {} });

check("no errors on the page", page.errors.length === 0, page.errors.slice(0, 3).join(" / "));
await browser.close();
