// Chat moderation (2 October): the [Admin] / [Mod] badges, Delete line and Mute from the name menu and
// /mute, the admin panel's chat moderator switch (live), what a moderator may not do, the admin log.
//   EMAIL=<admin> EMAIL2=<player> PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/chat-mod-test.mjs
// Both accounts in the same alliance; EMAIL an admin (it signs in to the admin panel to announce).
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const REDIS_DB = process.env.REDIS_DB || "1";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 400)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const redis = (...args) => execFileSync("redis-cli", ["-n", REDIS_DB, ...args]).toString().trim();
const tok = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const idA = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const idB = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL2}'`));
const nameA = sql(`SELECT username FROM bym."user" WHERE userid = ${idA}`);
const nameB = sql(`SELECT username FROM bym."user" WHERE userid = ${idB}`);
const allianceB = sql(`SELECT alliance_id FROM bym."user" WHERE userid = ${idB}`);
redis("srem", `chat-ignore:${idA}`, String(idB));
redis("del", `chat:mute:${idB}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) page.errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await tok(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForFunction(() => { const C = window.__classByName("com.monsters.chat::Chat"); const c = C && C._bymChat; return c && c._isConnected && c.sector_channel && c._ioAllianceChannel && c._ioGlobalJoined; }, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(300); }
  await page.evaluate(() => {
    window.__chat = () => window.__classByName("com.monsters.chat::Chat")._bymChat;
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
    window.__lines = () => window.__chat().chatBox._chatHistory.map((l) => ({ text: l.txt.text, html: l.msgData && l.msgData.msg, h: l.ioH, time: l.ioTime ? l.ioTime.text : null, user: l.msgData && l.msgData.userid, y: l.y }));
    // the chat open, on Global
    const c = window.__chat();
    if (!c._open) c.chatBox.toggleHide(null);
  });
  return page;
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const log = (page, tab) => ev(page, (tab) => window.__chat()._ioLogs[tab].map((l) => ({ kind: l.kind, html: l.html, user: l.user, ts: l.ts, mirror: !!l.mirror, id: l.id || null })), tab);
const waitLog = async (page, tab, test, timeout = 15000) => { const end = Date.now() + timeout; for (;;) { const l = await log(page, tab); if (test(l)) return l; if (Date.now() > end) return l; await sleep(300); } };
const inputAt = (page) => ev(page, () => window.__at(window.__chat().chatBox.input));
const typeLine = async (page, text, enter = true) => { const p = await inputAt(page); await page.mouse.click(p.x, p.y); await page.keyboard.type(text, { delay: 8 }); if (enter) await page.keyboard.press("Enter"); await sleep(150); };
const inputText = (page) => ev(page, () => window.__chat().chatBox.input.text);
// the game's message boxes (MESSAGE: "build a Map Room first"...) closed, as a player would
const closeMessages = (page) => ev(page, () => { const M = window.__classByName("MESSAGE"); const found = []; const walk = (o) => { if (!o) return; if (M && o instanceof M) found.push(o); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); for (const m of found) { try { m.Hide(); } catch (e) {} } return found.length; });
const tab = (page, which) => ev(page, (which) => window.__chat().ioSwitch(which), which);

// (with the admin's game's own token: logging in again would log that game out, and the quest book's
// requests would then show "Please reload" over the chat)
const adminSession = async (page) => {
  const token = await page.evaluate(() => window.__game.LOGIN.token);
  const code = (await (await fetch(`${server}admin/session`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })).json()).code;
  const signin = await fetch(`${server}admin/signin?code=${code}`, { redirect: "manual" });
  const session = (/bymr_admin=([a-f0-9]+)/.exec(signin.headers.get("set-cookie") || "") || [])[1];
  return (action, body) => fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) }).then((r) => r.json());
};
const nameHit = (page, uid, text) => ev(page, ([uid, text]) => { const box = window.__chat().chatBox; const line = [...box._chatHistory].reverse().find((l) => l.msgData && String(l.msgData.userid) === String(uid) && (!text || l.txt.text.includes(text))); if (!line) return null; const hit = line.$children.find((c) => c.label && c.bg && c.buttonMode); return hit ? window.__at(hit) : null; }, [uid, text]);
const menuTexts = (page) => ev(page, () => { const m = window.__named("ioChatMenu"); return m ? window.__texts(m) : null; });
const clickMenu = async (page, name) => { const p = await ev(page, (n) => { const b = window.__named(n); return b ? window.__at(b) : null; }, name); if (p) await page.mouse.click(p.x, p.y); await sleep(400); return !!p; };
const openMenu = async (page, uid, text) => { const p = await nameHit(page, uid, text); if (p) await page.mouse.click(p.x - 5, p.y); await sleep(500); return menuTexts(page); };
sql(`UPDATE bym."user" SET chat_mod = false WHERE userid IN (${idA}, ${idB})`);
redis("del", `chat:mute:${idA}`);

try {
  const A = await open(process.env.EMAIL);
  const B = await open(process.env.EMAIL2);
  await tab(A, "global");
  await tab(B, "global");
  const stamp = Date.now().toString(36);
  const admin = await adminSession(A);

  // ---- 1. badges
  check("the admin knows their role", (await ev(A, () => window.__chat().ioMyRole)) === "admin" && !(await ev(B, () => window.__chat().ioMyRole)));
  await typeLine(A, `from the admin ${stamp}`);
  const badge = (await waitLog(B, "global", (l) => l.some((x) => x.html.includes(`from the admin ${stamp}`)))).find((x) => x.html.includes(`from the admin ${stamp}`));
  check("an admin's line carries an [Admin] badge", badge && /\[Admin\]/.test(badge.html) && badge.id && /^g/.test(badge.id), JSON.stringify(badge && { html: badge.html.slice(0, 90), id: badge.id }));

  // ---- 2. the admin's menu: Delete line, Mute
  await typeLine(B, `rude line ${stamp}`);
  await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`rude line ${stamp}`)));
  const menu = await openMenu(A, idB, `rude line ${stamp}`);
  check("for staff the name menu has Moderation: Delete this line, Mute 10 min / 1 hour / 1 day, Unmute", menu && menu.includes("Moderation") && menu.includes("Delete this line") && menu.includes("Mute 10 minutes") && menu.includes("Mute 1 day") && menu.includes("Unmute"), JSON.stringify(menu));
  await A.screenshot({ path: `${OUT}/chat-mod-menu.png`, clip: { x: 0, y: 360, width: 520, height: 440 } });
  const rudeId = (await log(A, "global")).find((x) => x.html.includes(`rude line ${stamp}`)).id;
  await clickMenu(A, "ioChatMenuDelete");
  const goneA = await waitLog(A, "global", (l) => !l.some((x) => x.html.includes(`rude line ${stamp}`)));
  const goneB = await waitLog(B, "global", (l) => !l.some((x) => x.html.includes(`rude line ${stamp}`)));
  const channel = await ev(B, () => window.__chat().sector_channel.Name);
  check("Delete this line: gone from everyone's screen and from the room's history", !goneA.some((x) => x.html.includes(`rude line ${stamp}`)) && !goneB.some((x) => x.html.includes(`rude line ${stamp}`)) && !redis("lrange", `history:${channel}`, "0", "-1").includes(rudeId), rudeId);
  check("…in the admin log", sql(`SELECT count(*) FROM bym.admin_log WHERE action = 'chat-delete' AND details LIKE '%rude line ${stamp}%'`) === "1");

  // ---- 3. mute from the menu, unmute by command
  await typeLine(B, `second line ${stamp}`);
  await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`second line ${stamp}`)));
  const m2 = await openMenu(A, idB, `second line ${stamp}`);
  const muteAt = await ev(A, () => { const b = window.__named("ioChatMenuMute10"); if (!b) return null; const r = b.getBounds(window.__player.stage); return { r: [r.x, r.y, r.width, r.height], at: window.__at(b) }; });
  const clicked = await clickMenu(A, "ioChatMenuMute10");
  const stillOpen = !!(await menuTexts(A));
  const said = await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`${nameB} is muted for 10 minutes`)));
  check("Mute 10 minutes: done, and the moderator is told", said.some((x) => x.html.includes(`${nameB} is muted for 10 minutes`)) && Number(redis("get", `chat:mute:${idB}`)) > Date.now(), JSON.stringify({ m2, clicked, muteAt, stillOpen, last: said.slice(-2).map((x) => x.html.slice(0, 80)) }));
  await typeLine(B, `while muted ${stamp}`);
  check("…the player is told they are muted", (await waitLog(B, "global", (l) => l.some((x) => /You are muted in chat for 10 more minute/.test(x.html)))).some((x) => /You are muted in chat for 10 more minute/.test(x.html)));
  await typeLine(A, `/unmute ${nameB}`);
  await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`${nameB} can talk again`)));
  check("/unmute Name lifts it", redis("exists", `chat:mute:${idB}`) === "0");

  // ---- 4. the admin panel makes the player a moderator: live
  const on = await admin("chatMod", { id: idB, on: 1 });
  await B.waitForFunction(() => window.__chat().ioMyRole === "mod", null, { timeout: 15000 }).catch(() => {});
  check("the panel's switch makes a moderator, and their game knows at once", !on.error && (await ev(B, () => window.__chat().ioMyRole)) === "mod", JSON.stringify(on));
  await sleep(1200);
  await typeLine(B, `as a moderator ${stamp}`);
  const modLine = (await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`as a moderator ${stamp}`)))).find((x) => x.html.includes(`as a moderator ${stamp}`));
  check("…their lines carry a [Mod] badge", modLine && /\[Mod\]/.test(modLine.html), modLine && modLine.html.slice(0, 80));
  const panel = await admin("player", { id: idB });
  check("…the panel lists them", panel.chatMod === true && panel.chatMods.some((m) => m.id === idB));
  await sleep(600);
  const modMenu = await openMenu(B, idA, `from the admin ${stamp}`);
  check("a moderator can't mute an admin (no Mute in the menu)", modMenu && modMenu.includes("Delete this line") && !modMenu.includes("Mute 10 minutes"), JSON.stringify(modMenu));
  await ev(B, () => { const m = window.__classByName("com.monsters.chat.ui::IoChatMenu"); m.Hide(); });
  await typeLine(B, `/mute ${nameA} 60`);
  const refused = await waitLog(B, "global", (l) => l.some((x) => /You can't do that/.test(x.html)));
  check("…and /mute on an admin is refused by the server", refused.some((x) => /You can't do that/.test(x.html)) && redis("exists", `chat:mute:${idA}`) === "0");

  // ---- 5. off again
  await admin("chatMod", { id: idB, on: 0 });
  await B.waitForFunction(() => !window.__chat().ioMyRole, null, { timeout: 15000 }).catch(() => {});
  check("switched off: back to a player", !(await ev(B, () => window.__chat().ioMyRole)));
  await sleep(600);
  const plain = await openMenu(B, idA, `from the admin ${stamp}`);
  check("…whose menu has no Moderation", plain && !plain.includes("Moderation"), JSON.stringify(plain));
  await ev(B, () => window.__classByName("com.monsters.chat.ui::IoChatMenu").Hide());
  await typeLine(B, `/mute ${nameA} 5`);
  check("…and /mute says it is for staff", (await waitLog(B, "global", (l) => l.some((x) => /Only admins and chat moderators/.test(x.html)))).some((x) => /Only admins and chat moderators/.test(x.html)));

  check("no page errors", A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].slice(0, 3).join(" | "));
} finally {
  sql(`UPDATE bym."user" SET chat_mod = false WHERE userid IN (${idA}, ${idB})`);
  redis("del", `chat:mute:${idB}`);
  redis("del", `chat:mute:${idA}`);
  await browser.close();
}
