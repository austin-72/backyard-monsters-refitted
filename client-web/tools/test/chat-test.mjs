// The chat dock, end to end with two players (2 October): the typing box, lines shown as text, times,
// mentions, the name menu, ignoring (kept after a reload), commands, the flood limit, the link to the server
// lost and found again, alliance changes while playing, announcements, the 200-character box, scrolling.
//   EMAIL=<admin> EMAIL2=<player> PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/chat-test.mjs
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

try {
  const A = await open(process.env.EMAIL);
  const B = await open(process.env.EMAIL2);
  await tab(A, "global");
  await tab(B, "global");
  const stamp = Date.now().toString(36);

  // ---- 1. the box: what was sent is gone from it (it used to come back in front of the next line)
  await typeLine(A, `first ${stamp}`);
  await typeLine(A, "second", false);
  check("after a line is sent, the next one starts in an empty box", (await inputText(A)) === "second", JSON.stringify(await inputText(A)));
  await ev(A, () => window.__chat().chatBox.clearInputText());

  // ---- 2. a player's words are text: markup is shown, not drawn
  await sleep(700);
  await typeLine(A, `<font size="40" color="#ff0000">BIG</font> <b>bold</b> ${stamp}`);
  let gB = await waitLog(B, "global", (l) => l.some((x) => x.html.includes(`${stamp}`) && x.html.includes("&lt;font")));
  const shown = await ev(B, (stamp) => window.__lines().find((l) => l.text.includes(stamp) && l.text.includes("<font")), stamp);
  check("markup in a message shows as text (no giant fonts, no links)", !!shown && shown.text.includes('<font size="40"') && shown.h <= 3 * 17, JSON.stringify(shown));
  check("…the first line also arrived, and the second never went", gB.some((x) => x.html.includes(`first ${stamp}`)) && !gB.some((x) => /first [a-z0-9]+second/.test(x.html)));

  // ---- 3. how long ago
  check("each line says how long ago it was said", !!shown && /^(now|\d+s)$/.test(shown.time || ""), shown && shown.time);
  const agos = await ev(B, () => { const CB = window.__classByName("com.monsters.chat.ui::ChatBox"); const now = window.__classByName("com.monsters.chat::BYMChat").ioNow(); return [33e3, 125e3, 4 * 3600e3 + 5e3, 3 * 86400e3 + 5e3, 1e3].map((d) => CB.ioAgo(now - d)); });
  check("…33s, 2m, 4h, 3d, now", JSON.stringify(agos) === JSON.stringify(["33s", "2m", "4h", "3d", "now"]), JSON.stringify(agos));

  // ---- 4. a mention: highlighted, counted with "@" on the other tab
  await tab(A, "alliance");
  await sleep(500);
  await typeLine(B, `hey @${nameA} look ${stamp}`);
  const gA = await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`look ${stamp}`)));
  const mention = gA.find((x) => x.html.includes(`look ${stamp}`));
  const tabs = await ev(A, () => window.__chat().chatBox._ioTabGlobal.text);
  check("a line naming the player is highlighted, and the tab counts it with @", mention && mention.kind === "mention" && /#B34700/i.test(mention.html) && /\(\d+\) @/.test(tabs), JSON.stringify({ kind: mention && mention.kind, tabs }));
  await tab(A, "global");
  check("…seeing the tab clears it", (await ev(A, () => window.__chat().chatBox._ioTabGlobal.text)) === "Global");
  await A.screenshot({ path: `${OUT}/chat-mention.png`, clip: { x: 0, y: 420, width: 430, height: 380 } });

  // ---- 5. the name menu
  const nameAt = await ev(A, (uid) => { const box = window.__chat().chatBox; const line = [...box._chatHistory].reverse().find((l) => l.msgData && String(l.msgData.userid) === String(uid)); if (!line) return null; const hit = line.$children.find((c) => c.label && c.bg && c.buttonMode); return hit ? window.__at(hit) : null; }, idB);
  if (nameAt) await A.mouse.click(nameAt.x - 10, nameAt.y);
  await sleep(500);
  const menu = await ev(A, () => { const m = window.__named("ioChatMenu"); return m ? window.__texts(m) : null; });
  check("clicking a name opens its menu: message, ignore, jump, leaderboards", menu && menu[0] === nameB && menu.includes("Send a message") && menu.includes("Ignore") && menu.includes("Jump to their yard") && menu.includes("Find on the leaderboards"), JSON.stringify(menu));
  await A.screenshot({ path: `${OUT}/chat-menu.png`, clip: { x: 0, y: 380, width: 520, height: 420 } });
  const findAt = await ev(A, () => { const b = window.__named("ioChatMenuFind"); return b ? window.__at(b) : null; });
  if (findAt) await A.mouse.click(findAt.x, findAt.y);
  await A.waitForFunction(() => { const L = window.__classByName("com.monsters.leaderboards::IoLeaderboards"); return L._open && L._data; }, null, { timeout: 20000 }).catch(() => {});
  await sleep(800);
  const found = await ev(A, (uid) => { const o = window.__classByName("com.monsters.leaderboards::IoLeaderboards")._open; if (!o) return null; const e = o._pool.find((e) => e.item && e.item.p && e.item.p.uid === uid && e.line.visible); return { menuGone: !window.__named("ioChatMenu"), flash: e ? e.flash : false, tab: window.__classByName("com.monsters.leaderboards::IoLeaderboards")._tab }; }, idB);
  check("…Find on the leaderboards opens them on that player's row, lit", found && found.menuGone && found.flash && found.tab === 0, JSON.stringify(found));
  await A.screenshot({ path: `${OUT}/chat-find.png` });
  await ev(A, () => window.__classByName("com.monsters.leaderboards::IoLeaderboards").CloseOpen());
  // Jump from B's side: the admin is on no leaderboard (no yard to go to); another player's yard on B's world
  await ev(B, (args) => window.__classByName("com.monsters.leaderboards::IoLeaderboards").JumpToPlayer(args[0], args[1]), [idA, nameA]);
  await B.waitForFunction(() => window.__texts(window.__player.stage).some((t) => /has no yard on a world map/.test(t)), null, { timeout: 20000 }).catch(() => {});
  const noYard = await ev(B, () => window.__texts(window.__player.stage).find((t) => /has no yard on a world map/.test(t)) || null);
  check("…Jump to an admin (on no leaderboard) says they have no yard on the map", !!noYard, noYard);
  await closeMessages(B);
  for (let i = 0; i < 3; i++) { await ev(B, () => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await sleep(200); }
  const other = Number(sql(`SELECT c.uid FROM bym.world_map_cell c WHERE c.base_type = 2 AND c.map_version = 2 AND c.destroyed_at IS NULL AND c.uid NOT IN (${idA}, ${idB}) LIMIT 1`));
  await ev(B, (uid) => window.__classByName("com.monsters.leaderboards::IoLeaderboards").JumpToPlayer(uid, "someone"), other);
  await sleep(2500);
  const jumped = await ev(B, () => ({ map: window.__game.GLOBAL.isMapOpen(), mapRoom: window.__texts(window.__player.stage).some((t) => /Map Room/.test(t)) }));
  check("…Jump to a player on the same world goes to the map (or the game asks for a Map Room)", jumped.map || jumped.mapRoom, JSON.stringify(jumped));
  await closeMessages(B);
  for (let i = 0; i < 3; i++) { await ev(B, () => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await sleep(200); }
  await sleep(500);

  // ---- 6. commands
  await typeLine(A, "/help");
  await typeLine(A, "/nope");
  const sys = await log(A, "global");
  check("/help lists the commands; an unknown one says so", sys.some((x) => x.kind === "system" && x.html.includes("/ignore Name")) && sys.some((x) => x.html.includes("There is no command /nope")));
  await typeLine(A, "/ignore nobody_called_this");
  const nobody = await waitLog(A, "global", (l) => l.some((x) => x.html.includes("There is no player called nobody_called_this")));
  check("/ignore a name nobody has: told so", nobody.some((x) => x.html.includes("There is no player called nobody_called_this")));
  await typeLine(A, "/clear");
  check("/clear empties the tab", (await ev(A, () => window.__chat().chatBox._chatHistory.length)) === 0 && (await log(A, "global")).length === 0);

  // ---- 7. ignore by name, kept after a reload, undone from the list
  await typeLine(B, `before ignore ${stamp}`);
  await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`before ignore ${stamp}`)));
  await typeLine(A, `/ignore ${nameB}`);
  const ign = await waitLog(A, "global", (l) => l.some((x) => x.html.includes(`You are ignoring ${nameB}`)));
  check("/ignore Name: hidden at once, and their lines go", ign.some((x) => x.html.includes(`You are ignoring ${nameB}`)) && !ign.some((x) => x.user === String(idB)) && redis("sismember", `chat-ignore:${idA}`, String(idB)) === "1");
  await A.close();
  const A2 = await open(process.env.EMAIL);
  const reloaded = await ev(A2, () => ({ list: window.__chat()._ignore_list, lines: window.__chat()._ioLogs.global.map((l) => l.html) }));
  check("…after a reload the list is applied (and not printed)", Array.isArray(reloaded.list) && reloaded.list.includes(String(idB)) && !reloaded.lines.some((h) => /not ignoring/.test(h)) && !reloaded.lines.some((h) => h.includes(`before ignore ${stamp}`)), JSON.stringify(reloaded.list));
  await typeLine(B, `while ignored ${stamp}`);
  await sleep(4000);
  check("…their new lines stay hidden", !(await log(A2, "global")).some((x) => x.html.includes(`while ignored ${stamp}`)));
  await typeLine(A2, "/list");
  await waitLog(A2, "global", (l) => l.some((x) => x.kind === "ignorelist"));
  const listAt = await ev(A2, (uid) => { const line = window.__chat().chatBox._chatHistory.find((l) => l.msgData && l.msgData.msgtype === "IgnoreList" && String(l.msgData.userid) === String(uid)); if (!line) return null; const hit = line.$children.find((c) => c.label && c.bg && c.buttonMode); return hit ? window.__at(hit) : null; }, idB);
  const listed = await ev(A2, () => window.__lines().filter((l) => l.text).map((l) => l.text).slice(-3));
  check("/list names who is ignored", listed.some((t) => t === nameB), JSON.stringify(listed));
  if (listAt) await A2.mouse.click(listAt.x - 5, listAt.y);
  await sleep(500);
  const menu2 = await ev(A2, () => { const m = window.__named("ioChatMenu"); return m ? window.__texts(m) : null; });
  check("…its name menu offers Unignore", menu2 && menu2.includes("Unignore") && !menu2.includes("Jump to their yard"), JSON.stringify(menu2));
  const unAt = await ev(A2, () => { const b = window.__named("ioChatMenuIgnore"); return b ? window.__at(b) : null; });
  if (unAt) await A2.mouse.click(unAt.x, unAt.y);
  const un = await waitLog(A2, "global", (l) => l.some((x) => x.html.includes(`${nameB} is no longer ignored`)));
  check("…Unignore: they show again", un.some((x) => x.html.includes(`${nameB} is no longer ignored`)) && redis("sismember", `chat-ignore:${idA}`, String(idB)) === "0");
  await typeLine(B, `after unignore ${stamp}`);
  check("…and their next line is shown", (await waitLog(A2, "global", (l) => l.some((x) => x.html.includes(`after unignore ${stamp}`)))).some((x) => x.html.includes(`after unignore ${stamp}`)));

  // ---- 8. the flood limit: a line too fast stays in the box, with a word why (the server refused it silently before)
  await sleep(2500);
  const refusedBefore = redis("get", "nothing") ; void refusedBefore;
  // (typed as fast as a player hammering Enter: the box filled and sent at once, six times)
  const inAt = await inputAt(A2);
  await A2.mouse.click(inAt.x, inAt.y);
  for (let i = 1; i <= 6; i++) {
    await ev(A2, (t) => { const b = window.__chat().chatBox; b.input.text = t; }, `flood ${i} ${stamp}`);
    await A2.keyboard.press("Enter");
  }
  const kept = await inputText(A2);
  const flood = await log(A2, "global");
  check("a line typed too fast stays in the box, and the chat says to slow down", /flood \d [a-z0-9]+$/.test(kept) && flood.some((x) => x.kind === "system" && /Slow down/.test(x.html)), JSON.stringify(kept));
  await ev(A2, () => window.__chat().chatBox.clearInputText());
  const gotFlood = await waitLog(B, "global", (l) => l.filter((x) => x.html.includes(stamp) && x.html.includes("flood")).length >= 3);
  check("…the lines that went all arrived", gotFlood.filter((x) => x.html.includes(stamp) && x.html.includes("flood")).length >= 3);

  // ---- 9. muted: said so
  redis("set", `chat:mute:${idB}`, String(Date.now() + 5 * 60000), "EX", "300");
  await sleep(1200);
  await typeLine(B, `muted line ${stamp}`);
  const muted = await waitLog(B, "global", (l) => l.some((x) => /You are muted in chat for \d+ more minute/.test(x.html)));
  check("a muted player is told so", muted.some((x) => /You are muted in chat for \d+ more minute/.test(x.html)));
  redis("del", `chat:mute:${idB}`);

  // ---- 10. the link to the chat server lost (server restart, a sleeping tab): back, alliance chat and all
  await tab(A2, "alliance");
  await tab(B, "alliance");
  // (A2 loaded while B was ignored: B's alliance history was hidden; a join again brings it, as unignored now)
  await ev(A2, () => { const C = window.__classByName("com.monsters.chat::Channel"); window.__classByName("com.monsters.chat::BYMChat").chatSystem.join(new C("alliance", "system")); });
  await sleep(4000);
  const before = (await log(A2, "alliance")).length;
  await sleep(1500);
  // (the session forgotten by the server, and a line sent straight into it; then typing goes on meanwhile)
  const at10 = await inputAt(A2);
  await A2.mouse.click(at10.x, at10.y);
  await ev(A2, (t) => { const sys = window.__classByName("com.monsters.chat::BYMChat").chatSystem; sys._sid = "gone-" + Math.random(); window.__chat().chatBox.input.text = t; }, `after the link came back ${stamp}`);
  await A2.keyboard.press("Enter");
  await A2.keyboard.type("still typing", { delay: 120 });
  const back = await waitLog(B, "alliance", (l) => l.some((x) => x.html.includes(`after the link came back ${stamp}`)), 20000);
  check("a lost chat session: logged in again, Alliance rejoined, the line typed meanwhile delivered", back.some((x) => x.html.includes(`after the link came back ${stamp}`)));
  check("…and what is being typed while it reconnects is left alone", (await inputText(A2)) === "still typing", JSON.stringify(await inputText(A2)));
  await ev(A2, () => window.__chat().chatBox.clearInputText());
  await sleep(1500);
  const after = await log(A2, "alliance");
  check("…without the alliance's history shown twice", after.length === before + 1, `${before} -> ${after.length}`);
  await typeLine(B, `alliance still works ${stamp}`);
  check("…and it keeps working both ways", (await waitLog(A2, "alliance", (l) => l.some((x) => x.html.includes(`alliance still works ${stamp}`)))).some((x) => x.html.includes(`alliance still works ${stamp}`)));
  const n0 = (await log(A2, "alliance")).length;
  await ev(A2, () => { const C = window.__classByName("com.monsters.chat::Channel"); window.__classByName("com.monsters.chat::BYMChat").chatSystem.join(new C("alliance", "system")); });
  await sleep(4000);
  check("joining again (the Alliances window does) adds no lines", (await log(A2, "alliance")).length === n0, `${n0} -> ${(await log(A2, "alliance")).length}`);

  // ---- 11. alliance changes while playing (the server moves the player; the tab follows)
  sql(`UPDATE bym."user" SET alliance_id = NULL WHERE userid = ${idB}`);
  redis("publish", "chat:control", JSON.stringify({ type: "alliance_evict", userId: idB }));
  await B.waitForFunction(() => !window.__chat()._ioAllianceChannel, null, { timeout: 15000 }).catch(() => {});
  const leftB = await ev(B, () => ({ ch: !!window.__chat()._ioAllianceChannel, lines: window.__chat()._ioLogs.alliance.map((l) => l.html) }));
  check("removed from the alliance: the Alliance tab says so and stops", !leftB.ch && leftB.lines.some((h) => /no longer in this alliance/.test(h)), JSON.stringify(leftB.lines.slice(-2)));
  sql(`UPDATE bym."user" SET alliance_id = ${allianceB} WHERE userid = ${idB}`);
  redis("publish", "chat:control", JSON.stringify({ type: "alliance_evict", userId: idB }));
  await B.waitForFunction(() => !!window.__chat()._ioAllianceChannel, null, { timeout: 15000 }).catch(() => {});
  const rejoined = await log(B, "alliance");
  check("joined (again): the tab is back on, with the alliance's history", rejoined.length > 5 && !rejoined.some((x) => /no longer in this alliance/.test(x.html)), rejoined.length);
  await typeLine(A2, `welcome back ${stamp}`);
  check("…and gets new lines", (await waitLog(B, "alliance", (l) => l.some((x) => x.html.includes(`welcome back ${stamp}`)))).some((x) => x.html.includes(`welcome back ${stamp}`)));
  const levels = await log(B, "alliance");
  check("alliance lines carry the yard level, as Global's do", levels.filter((x) => x.kind === "player" || x.kind === "own" || x.kind === "mention").every((x) => /<b>\[\d+\] /.test(x.html)), JSON.stringify(levels.slice(-2).map((x) => x.html)));

  // ---- 12. alliance entries in their colours (a shout of each kind drawn)
  await ev(B, () => { const box = window.__chat().chatBox; const now = window.__classByName("com.monsters.chat::BYMChat").ioNow(); for (const k of ["joined", "left", "kicked", "promoted", "created", "relationship", "powerup_activated", "powerup_purchase"]) box.ioAppend({ html: `A ${k} entry`, kind: "shout_" + k, ts: now }); });
  await sleep(300);
  await B.screenshot({ path: `${OUT}/chat-alliance-kinds.png`, clip: { x: 0, y: 420, width: 430, height: 380 } });
  await tab(B, "global");
  await tab(A2, "global");

  // ---- 13. an announcement from the admin panel: a banner on both tabs, kept in Global's history
  const code = (await (await fetch(`${server}admin/session`, { method: "POST", headers: { Authorization: `Bearer ${await tok(process.env.EMAIL)}` } })).json()).code;
  const signin = await fetch(`${server}admin/signin?code=${code}`, { redirect: "manual" });
  const session = (/bymr_admin=([a-f0-9]+)/.exec(signin.headers.get("set-cookie") || "") || [])[1];
  const admin = (action, body) => fetch(`${server}admin/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin": "1", Cookie: `bymr_admin=${session}` }, body: JSON.stringify(body) }).then((r) => r.json());
  const said = await admin("announce", { text: `Server maintenance tonight ${stamp}`, hours: 1, chat: true });
  const ann = await waitLog(B, "global", (l) => l.some((x) => x.kind === "announce" && x.html.includes(stamp)));
  const annA = await waitLog(A2, "alliance", (l) => l.some((x) => x.kind === "announce" && x.html.includes(stamp)));
  const hist = redis("lrange", `history:${await ev(B, () => window.__chat().sector_channel.Name)}`, "0", "0");
  check("an announcement: a banner in Global (shown on the Alliance tab too) and kept in the history", !said.error && ann.some((x) => x.kind === "announce" && /Announcement:/.test(x.html)) && annA.some((x) => x.kind === "announce" && x.mirror) && hist.includes(stamp) && hist.includes('"announce"'), JSON.stringify(said));
  await B.screenshot({ path: `${OUT}/chat-announce.png`, clip: { x: 0, y: 420, width: 430, height: 380 } });
  await admin("announceClear", {});

  // ---- 14. 200 characters, all of it in view as it is typed
  const long = ("The quick brown fox jumps over the lazy dog " + stamp + " ").repeat(6);
  const base = await ev(A2, () => { const b = window.__chat().chatBox; return { y: b.inputbar.y, h: b.input.height }; });
  await typeLine(A2, long.slice(0, 190), false);
  const grown = await ev(A2, () => { const b = window.__chat().chatBox; return { len: b.input.text.length, y: b.inputbar.y, h: b.input.height, th: b.input.textHeight, counter: b._ioCounter.visible ? b._ioCounter.text : null, maxChars: b.input.maxChars }; });
  check("the box takes 200 characters and grows so all of it shows, with a count near the end", grown.maxChars === 200 && grown.len === 190 && grown.h > base.h && grown.y < base.y && grown.th <= grown.h && grown.counter === "190/200", JSON.stringify({ base, grown }));
  await A2.screenshot({ path: `${OUT}/chat-long-input.png`, clip: { x: 0, y: 420, width: 430, height: 380 } });
  await A2.keyboard.type(long.slice(190, 230), { delay: 5 });
  const capped = (await inputText(A2)).length;
  await A2.keyboard.press("Enter");
  await sleep(300);
  const shrunk = await ev(A2, () => { const b = window.__chat().chatBox; return { y: b.inputbar.y, h: b.input.height, text: b.input.text }; });
  check("…200 at most; sent, the box is one line again", capped === 200 && shrunk.text === "" && shrunk.y === base.y && shrunk.h === base.h, JSON.stringify({ capped, shrunk }));
  const longGot = await waitLog(B, "global", (l) => l.some((x) => x.html.includes(long.slice(0, 60))));
  const longLine = longGot.find((x) => x.html.includes(long.slice(0, 60)));
  check("…and the whole line arrives", !!longLine && longLine.html.includes(long.slice(150, 199).replace(/ +$/, "")), longLine && longLine.html.slice(-120));

  // ---- 15. scrolling: the wheel, and reading back is not interrupted by new lines
  for (let i = 0; i < 12; i++) await ev(B, (i) => window.__chat().chatBox.ioAppend({ html: `<b>filler ${i}</b>`, kind: "system", ts: window.__classByName("com.monsters.chat::BYMChat").ioNow() }), i);
  const boxAt = await ev(B, () => window.__at(window.__chat().chatBox.background.mcMask));
  const y0 = await ev(B, () => window.__chat().chatBox._shell.y);
  await B.mouse.move(boxAt.x, boxAt.y);
  await B.mouse.wheel(0, -240);
  await sleep(300);
  const y1 = await ev(B, () => window.__chat().chatBox._shell.y);
  // (where a line in view is on the screen, before and after a new line comes)
  const seen = () => ev(B, () => { const b = window.__chat().chatBox; const l = b._chatHistory.find((x) => x.txt.text.includes("filler 3")); return l ? Math.round(b._shell.y + l.y) : null; });
  const v1 = await seen();
  await typeLine(A2, `while B reads back ${stamp}`);
  await waitLog(B, "global", (l) => l.some((x) => x.html.includes(`while B reads back ${stamp}`)));
  await sleep(300);
  const v2 = await seen();
  const y2 = await ev(B, () => window.__chat().chatBox._shell.y);
  const why = await ev(B, () => { const b = window.__chat().chatBox; return { open: b._open, top: (() => { const r = []; let o = null; return r; })(), mode: window.__chat()._ioMode, map: window.__game.GLOBAL.isMapOpen() }; });
  check("the wheel scrolls the chat back; a new line does not pull the reader down", y1 > y0 && v1 != null && v1 === v2, JSON.stringify({ y0, y1, y2, v1, v2, why }));
  await B.mouse.wheel(0, 2400);
  await sleep(300);

  check("no page errors", A2.errors.length === 0 && B.errors.length === 0 && A.errors.length === 0, [...A.errors, ...A2.errors, ...B.errors].slice(0, 3).join(" | "));
  await B.screenshot({ path: `${OUT}/chat-final.png`, clip: { x: 0, y: 420, width: 430, height: 380 } });
} finally {
  redis("srem", `chat-ignore:${idA}`, String(idB));
  redis("del", `chat:mute:${idB}`);
  sql(`UPDATE bym."user" SET alliance_id = ${allianceB} WHERE userid = ${idB}`);
  await browser.close();
}
