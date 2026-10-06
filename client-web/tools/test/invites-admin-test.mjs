// The admin panel's Friends invited card (server controllers/admin/adminApi.ts `player`, services/admin/panel.html,
// services/user/referrals.ts):
//  - a friend who registers through the admin's invite link is listed under the admin's invites at once,
//    as "hasn't loaded the game yet"
//  - once the friend loads the game the result is kept: two accounts on one connection -> "same-ip" (nothing
//    paid); a friend on another connection -> "paid", 250 shiny each
//  - the count of accepted invites, how many paid, and who accepted them; the friend's card names who invited them
//  - the panel shows it (screenshot)
//  - the player list has each player's invites accepted (and paid), and sorts by it (most first; again: fewest)
//  - an admin can bar a player from invite rewards (a reason required): a friend joining through the link
//    afterwards is kept as "barred" and nothing is paid to either side; the card says so; lifting it clears it
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... SHOTS=dir node tools/test/invites-admin-test.mjs
// Needs: a local test server with referrals on (referral.shiny > 0), the account EMAIL as an admin
// (ADMIN_NAME), psql for the test database. Registers two accounts, which stay (they have yards now); the
// admin's 250 shiny from the paid one is taken back. Prints one line per check.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const api = `${server}api/v1.7.3-beta/player/`;
const post = async (url, body, token) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, ...json };
};
const login = async (email, password) => (await post(api + "getinfo", `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)).token;

const adminToken = await login(process.env.EMAIL, process.env.PASSWORD);
const adminId = Number(sql(`SELECT userid FROM bym."user" WHERE username = '${process.env.ADMIN_NAME}'`));
if (!sql(`SELECT referral_code FROM bym."user" WHERE userid = ${adminId}`)) sql(`UPDATE bym."user" SET referral_code = 'invtest${adminId}' WHERE userid = ${adminId}`);
const code = sql(`SELECT referral_code FROM bym."user" WHERE userid = ${adminId}`);

// the admin panel's API
const signinCode = (await post(`${server}admin/session`, "", adminToken)).code;
const signin = await fetch(`${server}admin/signin?code=${signinCode}`, { redirect: "manual" });
const session = ((signin.headers.get("set-cookie") || "").match(/bymr_admin=([a-f0-9]{64})/) || [])[1];
const panel = async (action, body) => (await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) })).json();
check("signed in to the admin panel", !!session);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];
const loadGame = async (token) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.close();
};

try {
  // two friends join through the link; the second is on another connection
  const suffix = Math.random().toString(36).slice(2, 7);
  const friends = [];
  for (const n of ["a", "b"]) {
    const name = `inv${n}${suffix}`, email = `${name}@example.com`;
    const reg = await post(api + "register", `username=${name}&email=${encodeURIComponent(email)}&password=Hunter22!x&ref=${code}`);
    friends.push({ name, email, id: reg.user && reg.user.userid, ok: reg.status === 200 });
  }
  check("two friends register through the invite link", friends.every((f) => f.ok && sql(`SELECT referred_by FROM bym."user" WHERE userid = ${f.id}`) === String(adminId)), JSON.stringify(friends));

  let card = await panel("player", { id: adminId });
  const listed = (id) => card.invites.accepted.find((f) => f.id === id);
  check("listed at once, as not yet loaded", friends.every((f) => listed(f.id) && listed(f.id).status === "waiting"), JSON.stringify(card.invites));

  const shinyBefore = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${adminId} AND type = 'main'`));
  await loadGame(await login(friends[0].email, "Hunter22!x"));
  sql(`UPDATE bym."user" SET registration_ip = '203.0.113.77' WHERE userid = ${friends[1].id}`);
  await loadGame(await login(friends[1].email, "Hunter22!x"));
  const shinyAfter = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${adminId} AND type = 'main'`));

  card = await panel("player", { id: adminId });
  check("one connection: kept as same-ip, nothing paid", listed(friends[0].id)?.status === "same-ip", JSON.stringify(listed(friends[0].id)));
  check("another connection: kept as paid, 250 shiny to the inviter", listed(friends[1].id)?.status === "paid" && shinyAfter - shinyBefore === 250, `${JSON.stringify(listed(friends[1].id))} shiny +${shinyAfter - shinyBefore}`);
  check("joined dates are the friends' yards'", friends.every((f) => /^\d{4}-/.test(listed(f.id)?.joined || "")));
  const friendCard = await panel("player", { id: friends[1].id });
  check("the friend's card names who invited them", friendCard.invites.invitedBy?.id === adminId && friendCard.invites.invitedBy?.status === "paid", JSON.stringify(friendCard.invites.invitedBy));

  // the panel
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().addCookies([{ name: "bymr_admin", value: session, url: `${server}admin` }]);
  await page.goto(`${server}admin`);
  await page.waitForTimeout(1500);
  await page.evaluate((id) => { show("Players"); return openPlayer(id); }, adminId);
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => { const h = [...document.querySelectorAll("#playerCard .card h2")].find((e) => e.textContent === "Friends invited"); return h ? h.parentElement.innerText : ""; });
  check("the panel shows the Friends invited card", /Accepted:\s*\d+/.test(text) && friends.every((f) => text.includes(f.name)) && /paid/.test(text) && /same connection/.test(text), text.slice(0, 200).replace(/\n/g, " | "));
  await page.locator("#playerCard .card").filter({ has: page.locator("h2", { hasText: /^Friends invited$/ }) }).screenshot({ path: `${shots}/invites-admin.png` });

  // the player list: invites accepted (and paid) per player, sortable in the page
  const list = await panel("players", {});
  const me = list.players.find((p) => p.id === adminId);
  check("the player list has invites accepted and paid", me && me.invites === card.invites.accepted.length && me.invitesPaid === card.invites.accepted.filter((f) => f.status === "paid").length && list.players.every((p) => typeof p.invites === "number"), JSON.stringify(me));
  await page.locator("#sort_invites").click();
  await page.waitForTimeout(300);
  const firstRows = async () => page.evaluate(() => [...document.querySelectorAll("#results tr")].slice(1, 6).map((tr) => Number((tr.children[2].textContent.match(/^\s*(\d+)/) || [0, 0])[1])));
  const most = await firstRows();
  const max = Math.max(...list.players.map((p) => p.invites));
  check("...sorted by invites accepted, most first", most[0] === max && most.every((n, i) => i === 0 || n <= most[i - 1]), JSON.stringify(most));
  await page.locator("#sort_invites").click();
  await page.waitForTimeout(300);
  const fewest = await firstRows();
  check("...and again, fewest first", fewest[0] === Math.min(...list.players.map((p) => p.invites)) && fewest.every((n, i) => i === 0 || n >= fewest[i - 1]), JSON.stringify(fewest));

  // barred from invite rewards
  const noReason = await panel("inviteBar", { id: adminId, reason: "" });
  await panel("inviteBar", { id: adminId, reason: "invite-test: invited own accounts" });
  card = await panel("player", { id: adminId });
  check("barring needs a reason; then the card says barred, with it", !!noReason.error && card.invites.barred === true && /own accounts/.test(card.invites.barredReason), JSON.stringify([noReason.error, card.invites.barred, card.invites.barredReason]));
  const third = `invc${suffix}`, thirdEmail = `${third}@example.com`;
  const reg3 = await post(api + "register", `username=${third}&email=${encodeURIComponent(thirdEmail)}&password=Hunter22!x&ref=${code}`);
  const thirdId = reg3.user && reg3.user.userid;
  sql(`UPDATE bym."user" SET registration_ip = '203.0.113.78' WHERE userid = ${thirdId}`);
  const shinyBarred0 = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${adminId} AND type = 'main'`));
  await loadGame(await login(thirdEmail, "Hunter22!x"));
  const shinyBarred1 = Number(sql(`SELECT credits FROM bym.save WHERE userid = ${adminId} AND type = 'main'`));
  card = await panel("player", { id: adminId });
  const thirdCard = await panel("player", { id: thirdId });
  const paidList = (await panel("players", {})).players.find((p) => p.id === adminId);
  check("a friend joining through a barred player's link: kept as barred, nothing paid to either side", listed(thirdId)?.status === "barred" && shinyBarred1 === shinyBarred0 && thirdCard.invites.invitedBy?.status === "barred" && paidList.invites === me.invites + 1 && paidList.invitesPaid === me.invitesPaid,
    `${JSON.stringify(listed(thirdId))} inviter shiny ${shinyBarred0} -> ${shinyBarred1}, friend shiny ${thirdCard.credits}`);
  // the panel: the card's Invite rewards part, barred
  await page.evaluate((id) => openPlayer(id), adminId);
  await page.waitForTimeout(1200);
  const barText = await page.evaluate(() => { const h = [...document.querySelectorAll("#playerCard .card h2")].find((e) => e.textContent === "Friends invited"); return h ? h.parentElement.innerText : ""; });
  check("...the panel shows it (barred, the reason, Lift; the friend not paid: barred)", /Barred/.test(barText) && /own accounts/.test(barText) && /Lift/.test(barText) && /inviter barred/.test(barText), barText.slice(-300).replace(/\n/g, " | "));
  await page.locator("#playerCard .card").filter({ has: page.locator("h2", { hasText: /^Friends invited$/ }) }).screenshot({ path: `${shots}/invites-admin-barred.png` });
  await panel("inviteUnbar", { id: adminId });
  card = await panel("player", { id: adminId });
  check("lifting it clears it", card.invites.barred === false && card.invites.barredReason === "", JSON.stringify([card.invites.barred, card.invites.barredReason]));

  sql(`UPDATE bym.save SET credits = GREATEST(0, credits - 250) WHERE userid = ${adminId} AND type = 'main'`);
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
}
catch (e) {
  check("run", false, String(e).slice(0, 300));
}
await browser.close();
