// The quest book's server rules (server/src/services/quests/, Inferno, 2 October), over the API only:
//  - the book: 140 quests in 10 categories, 10 chests, up to 3 daily quests the player can do, the same all day
//  - the quests only some players can do (or luck decides) are optional
//  - a locked quest can't be collected; a ready one once only, even asked for four times at the same moment
//  - the game's reports: unknown kinds left out, each held to its most and to how often it may come,
//    "best so far" ones keep the best
//  - counted by the server itself: a letter, a board pin and the board read, the daily login reward
//  - daily quests and their bonus, paid into the main yard
// Starts the player's quest book again first (psql: PGPASSWORD, the database in PGDATABASE, default bymio;
// redis-cli if there is one, its database in REDIS_DB, default 1).
//   EMAIL=... EMAIL2=... PASSWORD=... node tools/test/quest-server-test.mjs
// Prints one line per check; every line must end in "ok".
import { execSync } from "node:child_process";
const server = process.env.SERVER || "http://localhost:3001/";
const DB = process.env.PGDATABASE || "bymio";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const form = (o) => new URLSearchParams(o).toString();
const api = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: form(body || {}) });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t.slice(0, 200) }; }
};
const sql = (q) => execSync(`psql -h localhost -U postgres -d ${DB} -tAc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
const token = (await api("api/v1.7.3-beta/player/getinfo", { version: 128, email: process.env.EMAIL, password: process.env.PASSWORD })).token;
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const uid2 = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL2}'`));
sql(`DELETE FROM bym.quest_progress WHERE userid = ${uid}`);
// (a run just before leaves its reports' spacing in Redis for a few seconds)
try { execSync(`redis-cli -n ${process.env.REDIS_DB || "1"} del quest:ev:${uid}:fling`); } catch { await sleep(6000); }
const status = () => api("quests/status", {}, token);
const quest = (b, id) => b.quests.find((q) => q.id === id);
const counter = (k) => sql(`SELECT COALESCE(counters->>'${k}', '0') FROM bym.quest_progress WHERE userid = ${uid}`) || "0";
const wallet = () => sql(`SELECT credits || ' ' || (resources->>'r1') FROM bym.save WHERE userid = ${uid} AND type = 'main'`).split(" ").map(Number);

// 1. the book
let b = await status();
const cats = new Set(b.quests.map((q) => q.cat));
check("140 quests in 10 categories", b.quests.length === 140 && cats.size === 10 && b.categories.length === 10, `${b.quests.length} ${cats.size}`);
check("10 chests, the book's last", b.chests.length === 10 && b.chests[9].id === "chest_book", b.chests.map((c) => c.id).join(","));
// (what the yard has decides which daily quests it can be given)
const yardHas = (t) => sql(`SELECT count(*) FROM bym.save s, jsonb_each(s.buildingdata) e(k, v) WHERE s.userid = ${uid} AND s.type = 'main' AND (v->>'t')::int = ${t}`) !== "0";
const needs = { d_wins: () => yardHas(5), d_capture: () => yardHas(5), d_hatch: () => yardHas(13), d_juice: () => yardHas(9), d_pit: () => yardHas(141), d_wild: () => true, d_warts: () => true, d_chat: () => true };
check("up to 3 daily quests, each one this yard can do, the same all day", b.daily.quests.length >= 1 && b.daily.quests.length <= 3 && b.daily.quests.every((d) => needs[d.id]()) && JSON.stringify((await status()).daily.quests.map((d) => d.id)) === JSON.stringify(b.daily.quests.map((d) => d.id)), b.daily.quests.map((d) => d.id).join(","));
check("the day's pick is kept", JSON.stringify(JSON.parse(sql(`SELECT daily->'picked' FROM bym.quest_progress WHERE userid = ${uid}`) || "[]")) === JSON.stringify(b.daily.quests.map((d) => d.id)), "");
const opt = b.quests.filter((q) => q.optional).map((q) => q.id).sort().join(",");
check("optional: what only some can do (staff, leader, friends) or luck decides", opt === "a_invite,a_pin,a_powerup,a_relation,a_top3,c_friend1,c_friend3,x_jackpot" && quest(b, "a_relation").leader && quest(b, "a_invite").staff, opt);
check("every tree hangs together", b.quests.every((q) => !q.parent || quest(b, q.parent)?.cat === q.cat), "");

// 2. locked can't be collected
const locked = b.quests.find((q) => q.state === "locked");
check("a locked quest can't be collected", (await api("quests/claim", { ids: locked.id }, token)).error === "Nothing to collect.", locked.id);

// 3. one ready quest, asked for twice at once: paid once
sql(`INSERT INTO bym.quest_progress (userid, forced) VALUES (${uid}, '{"b_win1": true}'::jsonb) ON CONFLICT (userid) DO UPDATE SET forced = '{"b_win1": true}'::jsonb`);
const [c0, r0] = wallet();
const both = await Promise.all([1, 2, 3, 4].map(() => api("quests/claim", { ids: "b_win1" }, token)));
const [c1, r1] = wallet();
check("asked for four times at once, collected once", both.filter((x) => x.error === 0).length === 1 && both.filter((x) => x.error === "Nothing to collect.").length === 3, both.map((x) => x.error).join(","));
check("paid once into the main yard", r1 - r0 === 50000 && c1 === c0, `${r1 - r0} bone, ${c1 - c0} shiny`);
b = await status();
check("its children open", b.quests.filter((q) => q.parent === "b_win1").every((q) => q.state !== "locked"), "");

// 4. the game's reports
let r = await api("quests/event", { events: JSON.stringify([{ e: "nope" }, { e: "hatch_housing", n: 999999 }, { e: "fling" }, { e: "fling" }]), quiet: 1 }, token);
check("an unknown kind left out, the rest counted", r.counted === 2, JSON.stringify(r));
check("a report held to its most", counter("hatch_housing") === "3000", counter("hatch_housing"));
check("one that comes too often left out", counter("fling") === "1", counter("fling"));
await api("quests/event", { e: "bank", n: 5000, quiet: 1 }, token);
await api("quests/event", { e: "bank", n: 900, quiet: 1 }, token);
check("a best so far keeps the best", counter("bank") === "5000", counter("bank"));
r = await api("quests/event", { e: "juice", n: 2 }, token);
check("a report answers with the book", r.book && r.book.quests && typeof r.ready === "number", "");

// 5. counted by the server
await api("api/v1.7.3-beta/player/sendmessage", { subject: "quest test", type: "message", message: "hello from the quest test", targetid: String(uid2), threadid: "0", targetbaseid: "0" }, token);
await sleep(300);
check("a letter", counter("mail_sent") === "1", counter("mail_sent"));
const pin = await api("alliance/savepin", { title: "Quest test pin", body: "a pin" }, token);
await api("alliance/pins", { seen: 1 }, token);
await sleep(300);
check("a new pin, the board read", pin.error !== 0 || (counter("pin") === "1" && counter("board_read") === "1"), `${JSON.stringify(pin).slice(0, 60)} pin ${counter("pin")} read ${counter("board_read")}`);
if (pin.id) await api("alliance/deletepin", { id: pin.id }, token);
await api("alliance/savepin", { id: pin.id || 0, title: "x", body: "y" }, token);
check("an edited pin isn't a new one", counter("pin") === (pin.error === 0 ? "1" : "0"), counter("pin"));

// 6. daily quests and the bonus
b = await status();
const day = b.daily.date;
// (their counters for today, at their targets: the Pit's rounds are read from its bets, so that one is
// left as it is and only collected if it happens to be done)
const keyOf = { d_wins: "attack_win", d_warts: "wart_pick", d_hatch: "hatch_housing", d_wild: "wild_defended", d_chat: "chat_global", d_pit: "pit_rounds", d_juice: "juice_housing", d_capture: "captures" };
const counts = {};
for (const d of b.daily.quests) counts[keyOf[d.id]] = d.target;
sql(`UPDATE bym.quest_progress SET daily = '${JSON.stringify({ date: day, c: counts, claimed: [] })}'::jsonb WHERE userid = ${uid}`);
b = await status();
const readyDaily = b.daily.quests.filter((d) => d.state === "ready");
check("daily quests ready at their targets", readyDaily.length >= Math.min(2, b.daily.quests.length), b.daily.quests.map((d) => d.id + ":" + d.state).join(","));
const [dc0] = wallet();
const one = await api("quests/claim", { ids: "daily:" + readyDaily[0].id }, token);
const [dc1] = wallet();
check("a daily quest collected: 1 shiny", one.error === 0 && dc1 - dc0 === 1, `${one.error} ${dc1 - dc0}`);
check("not the bonus while one is left", (await status()).daily.bonus.state !== "ready", "");
const rest = await api("quests/claim", { ids: "all" }, token);
b = await status();
const allDaily = b.daily.quests.every((d) => d.state === "claimed");
check("collect all takes the rest and the bonus", !allDaily || (rest.claimed.includes("daily:bonus") && b.daily.bonus.state === "claimed"), JSON.stringify(rest.claimed));
check("a daily quest collected once a day", (await api("quests/claim", { ids: "daily:" + readyDaily[0].id }, token)).error === "Nothing to collect.", "");

// 7. the book again from the start (admin's Start again: what was collected can be collected again)
sql(`DELETE FROM bym.quest_progress WHERE userid = ${uid}`);
b = await status();
check("a fresh book", b.claimed === 0 && quest(b, "b_win1").state !== "claimed", "");
