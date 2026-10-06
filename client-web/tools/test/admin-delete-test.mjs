// Deleting an account from the admin panel (the user's, 6 October; controllers/admin/adminApi.ts deleteAccount,
// services/admin/deleteAccount.ts, services/admin/panel.html):
//  - refused without the username typed exactly, without a reason, for an admin, for the admin's own account
//  - an alliance leader with members: the account, every yard and map cell, mail, casino history and pets
//    gone; the alliance led by its next member; the world counts one player fewer; their sign-in ends; the
//    admin log says so
//  - the only member of an alliance: the alliance goes too
//  - in the panel's page: the Delete account card, the name typed, the reason, the confirmation: deleted
//   EMAIL=<an admin> ADMIN_NAME=... PASSWORD=... PGPASSWORD=... node tools/test/admin-delete-test.mjs
// Deletes three players of the test database (restore the dump after).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const post = async (url, body, token) => (await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body })).json();
const login = async (email) => (await post(`${server}api/v1.7.3-beta/player/getinfo`, `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const n = (q) => Number(sql(q) || 0);

const adminToken = await login(process.env.EMAIL);
const adminId = n(`SELECT userid FROM bym."user" WHERE username = '${process.env.ADMIN_NAME}'`);
const signinCode = (await post(`${server}admin/session`, "", adminToken)).code;
const signin = await fetch(`${server}admin/signin?code=${signinCode}`, { redirect: "manual" });
const session = ((signin.headers.get("set-cookie") || "").match(/bymr_admin=([a-f0-9]{64})/) || [])[1];
const panel = async (action, body) => (await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) })).json();
check("signed in to the admin panel", !!session);

// the players (none of them admins, each with a main yard): a leader of an alliance with an officer in it
// (made here if the database has none), a player alone in an alliance (made below), another
const pool = sql(`SELECT u.userid FROM bym."user" u WHERE u.userid <> ${adminId} AND u.username NOT IN ('IoTester', 'admintester') AND u.alliance_id IS NULL AND EXISTS (SELECT 1 FROM bym.save s WHERE s.saveuserid = u.userid AND s.type = 'main') ORDER BY u.userid DESC LIMIT 4`).split("\n").map(Number);
const name = (id) => sql(`SELECT username FROM bym."user" WHERE userid = ${id}`);
const email = (id) => sql(`SELECT email FROM bym."user" WHERE userid = ${id}`);
const [leader, officer, loner, third] = pool;
const allianceId = Number(sql(`INSERT INTO bym.alliance (name, leader_userid, leader_name, world_id, created_at) VALUES ('Deltest A${Date.now() % 100000}', ${leader}, '${name(leader)}', (SELECT worldid FROM bym.save WHERE saveuserid = ${leader} AND type = 'main'), now()) RETURNING id`).split("\n")[0]);
sql(`UPDATE bym."user" SET alliance_id = ${allianceId}, alliance_role = 'leader' WHERE userid = ${leader}`);
sql(`UPDATE bym."user" SET alliance_id = ${allianceId}, alliance_role = 'officer' WHERE userid = ${officer}`);
check("test players found (a leader with an officer, two others)", pool.length === 4 && pool.every((x) => x > 0) && allianceId > 0, JSON.stringify({ leader, officer, loner, third, allianceId }));
const L = { name: name(leader), email: email(leader) };
// what the leader has, to see it go
const theirs = () => ({
  user: n(`SELECT count(*) FROM bym."user" WHERE userid = ${leader}`),
  saves: n(`SELECT count(*) FROM bym.save WHERE saveuserid = ${leader} OR userid = ${leader}`),
  cells: n(`SELECT count(*) FROM bym.world_map_cell WHERE uid = ${leader}`),
  mail: n(`SELECT count(*) FROM bym.message WHERE userid = ${leader} OR targetid = ${leader}`),
  bets: n(`SELECT count(*) FROM bym.casino_bet WHERE user_id = ${leader}`),
  quests: n(`SELECT count(*) FROM bym.quest_progress WHERE userid = ${leader}`),
});
// a casino bet and a message, so there is something of each to delete
sql(`INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, status) VALUES (${leader}, 'del-test-${Date.now()}', 'slots', 5, 0, 0, '{}', 'settled')`);
const before = theirs();
const world = sql(`SELECT worldid FROM bym.save WHERE saveuserid = ${leader} AND type = 'main'`);
const players0 = n(`SELECT player_count FROM bym.world WHERE uuid = '${world}'`);
// a sign-in of theirs, as login.ts keeps it
const redis = (...args) => execFileSync("redis-cli", ["-n", "1", ...args]).toString().trim();
redis("set", `user-token:game:${L.email}`, "test-token");
const nextLeader = officer;

try {
  // ---- refusals
  let r = await panel("deleteAccount", { id: leader, confirm: L.name.toUpperCase() + "x", reason: "test" });
  const wrong = r.error;
  r = await panel("deleteAccount", { id: leader, confirm: L.name, reason: "" });
  const noReason = r.error;
  r = await panel("deleteAccount", { id: adminId, confirm: process.env.ADMIN_NAME, reason: "test" });
  const admin = r.error;
  check("refused: the name not typed exactly, no reason, an admin", /Type the username exactly/.test(wrong) && /reason/.test(noReason) && /Admins cannot be deleted/.test(admin) && theirs().user === 1, JSON.stringify([wrong, noReason, admin]));

  // ---- the leader
  check("the leader has yards, map cells and casino bets to lose", before.saves > 0 && before.cells > 0 && before.bets > 0, JSON.stringify(before));
  r = await panel("deleteAccount", { id: leader, confirm: L.name, reason: "test: asked to be deleted" });
  const after = theirs();
  check(`deleted ${L.name}: the account, every yard, map cell, message, bet and quest row`, r.error === 0 && r.deleted === L.name && Object.values(after).every((x) => x === 0), JSON.stringify([r, after]));
  const al = sql(`SELECT leader_userid || '|' || leader_name FROM bym.alliance WHERE id = ${allianceId}`);
  check("their alliance is led by its next member now (officers first), made its leader", al === `${nextLeader}|${name(nextLeader)}` && sql(`SELECT alliance_role FROM bym."user" WHERE userid = ${nextLeader}`) === "leader", al);
  check("the world counts one player fewer", n(`SELECT player_count FROM bym.world WHERE uuid = '${world}'`) === Math.max(0, players0 - 1), `${players0} -> ${n(`SELECT player_count FROM bym.world WHERE uuid = '${world}'`)}`);
  check("their sign-in has ended", redis("exists", `user-token:game:${L.email}`) === "0");
  const log = sql(`SELECT action || '|' || target_name || '|' || details FROM bym.admin_log WHERE action = 'delete-account' ORDER BY id DESC LIMIT 1`);
  check("the admin log: who, whom, why and what went", log.startsWith(`delete-account|${L.name}|test: asked to be deleted (`) && /yard\(s\)/.test(log), log);

  // ---- alone in an alliance: the alliance goes
  const aid = Number(sql(`INSERT INTO bym.alliance (name, leader_userid, leader_name, world_id, created_at) VALUES ('Deltest ${Date.now() % 100000}', ${loner}, '${name(loner)}', (SELECT worldid FROM bym.save WHERE saveuserid = ${loner} AND type = 'main'), now()) RETURNING id`).split("\n")[0]);
  sql(`UPDATE bym."user" SET alliance_id = ${aid}, alliance_role = 'leader' WHERE userid = ${loner}`);
  r = await panel("deleteAccount", { id: loner, confirm: name(loner), reason: "test" });
  check("the only member of an alliance: the alliance goes with them", r.error === 0 && n(`SELECT count(*) FROM bym.alliance WHERE id = ${aid}`) === 0 && n(`SELECT count(*) FROM bym."user" WHERE userid = ${loner}`) === 0, JSON.stringify(r));

  // ---- in the panel's page
  const T = { id: third, name: name(third) };
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.addCookies([{ name: "bymr_admin", value: session, url: `${server}admin` }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(`${server}admin`);
  await page.waitForTimeout(1500);
  await page.evaluate((id) => { show("Players"); return openPlayer(id); }, T.id);
  await page.waitForSelector("#delBtn", { timeout: 10000 });
  const card = await page.evaluate(() => [...document.querySelectorAll("#playerCard h2")].map((h) => h.textContent));
  await page.fill("#delName", T.name);
  await page.fill("#delReason", "test from the page");
  await page.locator("#delBtn").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/admin-delete-card.png` });
  await page.click("#delBtn");
  await page.waitForFunction(() => /was deleted/.test(document.querySelector("#playerCard").textContent), null, { timeout: 10000 });
  await page.screenshot({ path: `${shots}/admin-delete-done.png` });
  check("the page: a Delete account card; the name typed, a reason, confirmed: deleted", card.includes("Delete account") && n(`SELECT count(*) FROM bym."user" WHERE userid = ${T.id}`) === 0 && errors.length === 0, JSON.stringify([card, errors]));
  await browser.close();
} catch (e) {
  check("the test ran", false, e.stack);
}
