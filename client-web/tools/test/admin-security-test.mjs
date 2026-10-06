// The admin panel's security (server services/admin/admin.ts, controllers/admin/adminApi.ts):
//  - admin names are exact: an account named like an admin but in other capitals is not one
//  - admin names are reserved: nobody registers one or renames to one, in any capitals
//  - `bun run admin:claim <account> <name>` gives a reserved name to an account, which is then an admin
//  - sign-in: one-time codes, an httpOnly SameSite=Strict cookie, no referrer, no framing, a content policy
//  - the API: its own tools only ("constructor" handed back the admin's account record), the X-Admin
//    header, a session
//   EMAIL=... PASSWORD=... ADMIN_NAME=... PGPASSWORD=... node tools/test/admin-security-test.mjs
// Needs: a local test server whose config has ADMIN_NAME (with a capital in it) and "admintester" as
// admins, "admintester" not registered, psql for the test database, and bun (runs the server's script,
// with this environment: give it the server's database settings, DB_NAME and the rest, if they are not
// the ones in server/.env).
// Registers one account (3 registrations: mind the limit of 3 a minute) and removes it again.
// Prints one line per check; every line must end in "ok".
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const server = process.env.SERVER || "http://localhost:3001/";
const serverDir = process.env.SERVER_DIR || fileURLToPath(new URL("../../../server", import.meta.url));
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
const claim = (...args) => spawnSync("bun", ["run", "admin:claim", ...args], { cwd: serverDir, encoding: "utf8" });
const taken = /already exists/;
const ADMIN = process.env.ADMIN_NAME;

// 1. reserved names can't be registered, in any capitals
for (const name of ["admintester", "AdminTester"]) {
  const r = await post(api + "register", `username=${name}&email=${name}${Date.now() % 100000}%40example.com&password=Hunter22!x`);
  check(`"${name}" can't be registered`, r.status === 409 && taken.test(r.error), JSON.stringify(r));
}
const suffix = Math.random().toString(36).slice(2, 8);
const name = `sec${suffix}`, email = `sec${suffix}@example.com`, password = "Hunter22!x";
const reg = await post(api + "register", `username=${name}&email=${encodeURIComponent(email)}&password=${password}`);
check("a new account to test with", reg.status === 200 && reg.user && reg.user.username === name, JSON.stringify({ status: reg.status, error: reg.error }));
const userid = reg.user && reg.user.userid;
let token = await login(email, password);
const rename = await post(api + "changeusername", "username=ADMINTESTER", token);
check("nobody can rename to an admin name, in any capitals", rename.status === 409 && taken.test(rename.error), JSON.stringify(rename));
check("a player is not an admin", (await post(`${server}admin/session`, "", token)).error === "Not an admin.");

// 2. the admin's name in other capitals is not an admin (an account from before names were checked)
sql(`UPDATE bym."user" SET username = '${ADMIN.toLowerCase()}' WHERE userid = ${userid}`);
const lookalike = await post(`${server}admin/session`, "", token);
check(`"${ADMIN.toLowerCase()}" is not the admin "${ADMIN}"`, lookalike.error === "Not an admin.", JSON.stringify(lookalike));
sql(`UPDATE bym."user" SET username = '${name}' WHERE userid = ${userid}`);

// 3. sign-in and the panel
const adminToken = await login(process.env.EMAIL, process.env.PASSWORD);
const code = (await post(`${server}admin/session`, "", adminToken)).code;
check("the admin gets a sign-in code", /^[a-f0-9]{48}$/.test(code || ""), String(code));
const signin = await fetch(`${server}admin/signin?code=${code}`, { redirect: "manual" });
const cookie = signin.headers.get("set-cookie") || "";
const session = (cookie.match(/bymr_admin=([a-f0-9]{64})/) || [])[1];
check("sign-in sets an httpOnly, SameSite=Strict session cookie for /admin", !!session && /httponly/i.test(cookie) && /samesite=strict/i.test(cookie) && /path=\/admin/i.test(cookie), cookie);
check("sign-in sends no referrer on", signin.headers.get("referrer-policy") === "no-referrer" && signin.status === 302);
const again = await (await fetch(`${server}admin/signin?code=${code}`, { redirect: "manual" })).text();
check("a sign-in code works once", /expired or was already used/.test(again) && !/bymr_admin=[a-f0-9]/.test(again));
const panel = await fetch(`${server}admin`);
const csp = panel.headers.get("content-security-policy") || "";
check("the panel page: not framed, no type guessing, a content policy", panel.headers.get("x-frame-options") === "DENY" && panel.headers.get("x-content-type-options") === "nosniff" && /frame-ancestors 'none'/.test(csp) && /default-src 'none'/.test(csp) && /connect-src 'self'/.test(csp), csp);

// 4. the API
const call = async (action, { header = true, withCookie = true } = {}) => {
  const r = await fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", ...(header ? { "X-Admin": "1" } : {}), ...(withCookie ? { Cookie: `bymr_admin=${session}` } : {}) }, body: "{}" });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, ...json };
};
check("whoami: the admin", (await call("whoami")).username === ADMIN);
check("without the X-Admin header: refused", (await call("whoami", { header: false })).status === 403);
check("without the session cookie: sign in", (await call("whoami", { withCookie: false })).error === "signin");
for (const action of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
  const r = await call(action);
  check(`"${action}" is not a tool (and hands back nothing)`, r.error === "Unknown action." && !/password|email/.test(r.text), r.text.slice(0, 120));
}

// 5. the server owner's command gives a reserved name to an account
const wrong = claim(name, "AdminTester");
check("admin:claim wants the name exactly as in the config", wrong.status !== 0 && /not in the config's admins/.test(wrong.stdout + wrong.stderr), (wrong.stdout + wrong.stderr).trim().slice(-160));
const ok = claim(name, "admintester");
check("admin:claim renames the account", ok.status === 0 && sql(`SELECT username FROM bym."user" WHERE userid = ${userid}`) === "admintester", (ok.stdout + ok.stderr).trim().slice(-160));
token = await login(email, password);
check("the account is an admin now", /^[a-f0-9]{48}$/.test((await post(`${server}admin/session`, "", token)).code || ""));
const clash = claim(process.env.ADMIN_NAME, "admintester");
check("admin:claim won't take a name another account has", clash.status !== 0, (clash.stdout + clash.stderr).trim().slice(-160));

// the test account goes again (and "admintester" is free for the next run)
sql(`DELETE FROM bym."user" WHERE userid = ${userid}`);
check("the test account is removed", sql(`SELECT count(*) FROM bym."user" WHERE userid = ${userid} OR lower(username) = 'admintester'`) === "0");
