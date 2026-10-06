// Server checks for the fixes of 25 September 2026 (bug report #27, a 500 on /base/save during a wild
// monster attack, and what the review found). Talks to the server only (no browser) and reads/changes the
// test database with psql, so run it against a local test server and database only.
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... node tools/test/server-fixes-test.mjs
// Optional: SERVER (http://localhost:3001/), PGHOST (localhost), PGUSER (postgres), PGDATABASE (bymio).
// Needs: the account is an admin (InfernoOnlyConfig.admins) with a main yard on a Map Room 2 world, test
// mode off, and one other player with a main yard. Prints one line per check; every line must end in "ok".
import { execFileSync } from "node:child_process";

const server = process.env.SERVER || "http://localhost:3001/";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const sql = (text) =>
  execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", text], { encoding: "utf8" }).trim();
const post = async (path, body, token) => {
  const r = await fetch(server + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, size: text.length, ...json };
};
const login = async () => (await post("api/v1.7.3-beta/player/getinfo", `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}`)).token;
const enc = (o) => encodeURIComponent(JSON.stringify(o));

let token = await login();
const me = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const [mainId, homeX, homeY, flinger0] = sql(`SELECT s.basesaveid, c.x, c.y, s.flinger FROM bym.save s JOIN bym.world_map_cell c ON c.uid = s.saveuserid AND c.base_type = 2 WHERE s.saveuserid = ${me} AND s.type = 'main'`).split("|").map(Number);

// ---- 1. a wild monster attack on a yard last attacked long ago (bug #27) ----
sql(`UPDATE bym.save SET flinger = 1 WHERE basesaveid = ${mainId}`); // range 4 (+2) from home for the test
const area = await post("worldmapv2/getarea", `x=${Math.floor(homeX / 10) * 10}&y=${Math.floor(homeY / 10) * 10}`, token);
let tribe = null;
for (const x in area.data || {}) for (const y in area.data[x]) {
  const c = area.data[x][y];
  if (!tribe && c.b == 1 && c.i > 99 && Math.abs(x - homeX) <= 5 && Math.abs(y - homeY) <= 5) tribe = { x: Number(x), y: Number(y), bid: c.bid };
}
check("a wild monster yard near home to attack", !!tribe, JSON.stringify(tribe));
const attackData = enc({ monsters: {}, champions: [] });
if (tribe) {
  // stored once, then made "last attacked 14 hours ago" (a template's savetime was that old too)
  let first = await post("base/load", `userid=&baseid=${tribe.bid}&type=wmattack&mapversion=2&attackData=${attackData}`, token);
  await post("base/save", `baseid=${tribe.bid}&basesaveid=${first.basesaveid}&attackid=${first.attackid}&damage=0&destroyed=0&over=1`, token);
  sql(`UPDATE bym.save SET savetime = extract(epoch from now())::int - 50400, attackid = 0 WHERE baseid = '${tribe.bid}'`);
  const load = await post("base/load", `userid=&baseid=${tribe.bid}&type=wmattack&mapversion=2&attackData=${attackData}`, token);
  check("attack loads", load.status === 200 && !load.error && load.basesaveid > 0, JSON.stringify({ status: load.status, error: load.error }));
  // the attacker's own half-minute poll during the attack (it rebuilt the yard, deleting the one attacked)
  const poll = await post("base/updatesaved", `baseid=${tribe.bid}&version=128&lastupdate=0&type=attack&mapversion=2`, token);
  check("the poll during the attack", poll.status === 200 && poll.error === 0, JSON.stringify({ status: poll.status, error: poll.error }));
  check("the poll's reply is small (no yard in it)", poll.buildingdata === undefined && poll.size < 20000 && poll.flags !== undefined, `${poll.size} bytes`);
  const stillThere = sql(`SELECT count(*) FROM bym.save WHERE basesaveid = ${load.basesaveid}`);
  check("the yard attacked is still stored", stillThere === "1", stillThere);
  // an attack save, with a map cell update that has no yard id and a value the browser build sends as text
  const hit = await post("base/save", `baseid=${tribe.bid}&basesaveid=${load.basesaveid}&attackid=${load.attackid}&damage=12&destroyed=0&over=0` +
    `&monsterupdate=${enc([{ baseid: null, m: {} }, null])}&buildinghealthdata=undefined&attackloot=${enc({ r1: 5 })}`, token);
  check("attack save (bug #27: was a 500)", hit.status === 200 && hit.error === 0, JSON.stringify({ status: hit.status, error: hit.error }));
  check("the save's reply is small (no yard in it)", hit.buildingdata === undefined && hit.size < 5000 && hit.basesaveid === load.basesaveid, `${hit.size} bytes`);
  const health = sql(`SELECT coalesce(jsonb_typeof(buildinghealthdata), 'none') FROM bym.save WHERE basesaveid = ${load.basesaveid}`);
  check("building health sent as the text \"undefined\" is not stored", health !== "string", health);
  // a second on: the next save brings the yard's countdowns forward (it broke on a stored text)
  await new Promise((r) => setTimeout(r, 1100));
  const end = await post("base/save", `baseid=${tribe.bid}&basesaveid=${load.basesaveid}&attackid=${load.attackid}&damage=15.6&destroyed=0&over=1`, token);
  const damage = sql(`SELECT damage FROM bym.save WHERE basesaveid = ${load.basesaveid}`);
  check("last attack save (a fraction for an integer column)", end.status === 200 && end.error === 0 && damage === "16", JSON.stringify({ status: end.status, error: end.error, damage }));
  // a yard reset while attacked: a clear answer, not a 500
  const again = await post("base/load", `userid=&baseid=${tribe.bid}&type=wmattack&mapversion=2&attackData=${attackData}`, token);
  sql(`DELETE FROM bym.save WHERE basesaveid = ${again.basesaveid}`);
  const gone = await post("base/save", `baseid=${tribe.bid}&basesaveid=${again.basesaveid}&attackid=${again.attackid}&damage=1&destroyed=0&over=0`, token);
  check("a yard reset during the attack: 409 with a message", gone.status === 409 && /reset/.test(gone.error || ""), JSON.stringify({ status: gone.status, error: gone.error }));
}
// out of range: an answer (403), and nothing written first
sql(`UPDATE bym.save SET flinger = 0 WHERE basesaveid = ${mainId}`);
if (tribe) {
  // (an attack takes the attacker's own damage protection away: an attack refused must not)
  const protected0 = sql(`SELECT protected FROM bym.save WHERE basesaveid = ${mainId}`);
  sql(`UPDATE bym.save SET protected = extract(epoch from now())::int + 3600 WHERE basesaveid = ${mainId}`);
  const shield = sql(`SELECT protected FROM bym.save WHERE basesaveid = ${mainId}`);
  const far = await post("base/load", `userid=&baseid=${tribe.bid}&type=wmattack&mapversion=2&attackData=${attackData}`, token);
  check("out of range: 403 with a message (was a 500)", far.status === 403 && /out of range/.test(far.error || ""), JSON.stringify({ status: far.status, error: far.error }));
  const shieldAfter = sql(`SELECT protected FROM bym.save WHERE basesaveid = ${mainId}`);
  check("out of range: nothing written (the attacker keeps their protection)", shieldAfter === shield, `${shield} -> ${shieldAfter}`);
  sql(`UPDATE bym.save SET protected = ${protected0 || 0} WHERE basesaveid = ${mainId}`);
}
sql(`UPDATE bym.save SET flinger = ${flinger0} WHERE basesaveid = ${mainId}`);

// ---- 2. another player's yard: only the player whose attack it is writes to it ----
const [otherId, otherSave, otherName] = sql(`SELECT u.userid, s.basesaveid, u.username FROM bym."user" u JOIN bym.save s ON s.saveuserid = u.userid AND s.type = 'main' WHERE u.userid <> ${me} ORDER BY u.userid LIMIT 1`).split("|");
if (otherSave) {
  const before = sql(`SELECT damage, attackid, attacks FROM bym.save WHERE basesaveid = ${otherSave}`);
  const now = Math.floor(Date.now() / 1000);
  sql(`UPDATE bym.save SET attackid = 4242, attacks = '[{"name":"SomeoneElse","starttime":${now},"count":1,"friend":0,"seen":false}]'::jsonb WHERE basesaveid = ${otherSave}`);
  const foreign = await post("base/save", `baseid=x&basesaveid=${otherSave}&attackid=4242&damage=100&destroyed=1&over=1&protected=0`, token);
  const after = sql(`SELECT damage FROM bym.save WHERE basesaveid = ${otherSave}`);
  check(`a save to ${otherName}'s yard during someone else's attack: refused`, foreign.status === 403 && after === before.split("|")[0], JSON.stringify({ status: foreign.status, damage: after }));
  sql(`UPDATE bym.save SET attackid = 0, attacks = '[]'::jsonb WHERE basesaveid = ${otherSave}`);
}

// ---- 3. a server failure is a bug report in the admin panel, without the stack in the answer ----
sql(`DELETE FROM bym.bug_report WHERE title LIKE 'Server # on POST /base/save%'`);
const broken = await post("base/save", `nothing=1`, token);
await new Promise((r) => setTimeout(r, 800));
const bug = sql(`SELECT title FROM bym.bug_report WHERE title LIKE 'Server # on POST /base/save%'`);
check("a 500 is recorded in the Bugs tab", broken.status === 500 && /^Server # on POST \/base\/save/.test(bug), JSON.stringify({ status: broken.status, bug }));
sql(`DELETE FROM bym.bug_report WHERE title LIKE 'Server # on POST /base/save%'`);

// ---- 4. an admin's name with other capitals can't be registered ----
const admin = process.env.ADMIN_NAME || "";
if (admin) {
  const variant = admin === admin.toLowerCase() ? admin.toUpperCase() : admin.toLowerCase();
  const reg = await post("api/v1.7.3-beta/player/register", `username=${encodeURIComponent(variant)}&email=${encodeURIComponent(`case${Date.now()}@example.com`)}&password=${encodeURIComponent("Hunter22!x")}`);
  const made = sql(`SELECT count(*) FROM bym."user" WHERE username = '${variant}'`);
  check(`registering "${variant}" (the admin is "${admin}"): refused`, !!reg.error && made === "0", JSON.stringify({ status: reg.status, error: reg.error }));
  if (made !== "0") sql(`DELETE FROM bym."user" WHERE username = '${variant}'`);
}

// ---- 5. test mode: two switch-ons, then two switch-offs, at the same moment ----
token = await login();
const account = () => sql(`SELECT s.credits, s.resources ->> 'r1', (SELECT count(*) FROM bym.save o WHERE o.saveuserid = ${me}), (SELECT count(*) FROM bym.world_map_cell c WHERE c.uid = ${me}) FROM bym.save s WHERE s.basesaveid = ${mainId}`);
const start = account();
await Promise.all([post("admin/testmode", "action=on", token), post("admin/testmode", "action=on", token)]);
const during = account();
check("two switch-ons at once: test values", during.split("|")[0] === "9999999", during);
await Promise.all([post("admin/testmode", "action=off", token), post("admin/testmode", "action=off", token)]);
const end = account();
check("two switch-offs at once: the account exactly as before (yards and map cells kept)", end === start, `${start} -> ${end}`);
check("test mode is off", sql(`SELECT count(*) FROM bym.admin_test_snapshot WHERE userid = ${me}`) === "0");
