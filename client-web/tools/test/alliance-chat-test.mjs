// Chat tabs, Alliances Members and the invite text, with two players (against a local server):
//  - Global / Alliance tabs: history from joining is not counted as new, messages on the other tab are
//    ("Alliance (2)"), switching shows that tab's lines and clears its count
//  - clicking a player's name in the chat, then "Send a message", opens an in-game message to them
//  - Browse -> Actions -> Members lists the alliance's members
//  - the Daily Reward popup's two rows (days 15-28 around day 27) and the Invite Friends text
// Both accounts must be in the same alliance (see HANDOFF.md, "Testing").
//   EMAIL=... EMAIL2=... PASSWORD=... [ALLIANCE_ID=1 ALLIANCE_NAME=...] node tools/test/alliance-chat-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const tok = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const open = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.errors = []; page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(`${server}?token=${await tok(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  return page;
};
const texts = (page, root) => page.evaluate((root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root ? eval(root) : window.__player.stage); return out.join(" | "); }, root);
const A = await open(process.env.EMAIL);
const B = await open(process.env.EMAIL2);

// daily popup: 14 days in two rows
await A.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} });
await A.waitForTimeout(1000);
for (const [day, collected] of [[13, 0], [14, 1], [15, 0], [27, 0]]) {
  await A.evaluate(([day, collected]) => {
    const D = window.__classByName("com.monsters.daily::IoDailyPopup");
    D.Show(collected ? { day, collected: 1, streakDays: 14, shiny: 10, weekDays: 7, weekShiny: 100, streakShiny: 200 } : { day: day - 1, collected: 0, offerDay: day, offerShiny: day % 14 == 0 ? 200 : day % 7 == 0 ? 100 : 10, streakDays: 14, shiny: 10, weekDays: 7, weekShiny: 100, streakShiny: 200 });
  }, [day, collected]);
  await A.waitForTimeout(1200);
  await A.screenshot({ path: `${OUT}/alliance-chat-daily-${day}.png` });
}

// chat
const chatState = (page) => page.evaluate(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; const box = c.chatBox; return { connected: c._isConnected, open: c._open, mode: c._ioMode, alliance: !!c._ioAllianceChannel, g: box._ioTabGlobal && box._ioTabGlobal.text, a: box._ioTabAlliance && box._ioTabAlliance.text, unread: JSON.stringify(c._ioUnread) }; });
const days = await texts(A);
check("daily popup shows days 15 to 28", /Day 15 /.test(days + " ") && /Day 28/.test(days) && /\+200/.test(days), "");
await A.evaluate(() => { const D = window.__classByName("com.monsters.daily::IoDailyPopup"); if (D._open) D._open.close(); });
await A.waitForTimeout(600);
const s0 = await chatState(A);
check("history not counted as new", s0.a === "Alliance" && s0.alliance, s0.a);
await B.evaluate(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; c.default_chat("hello global from B"); });
await B.waitForTimeout(500);
await B.evaluate(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; c.ioSwitch("alliance"); c.default_chat("hello alliance from B"); });
await B.waitForTimeout(900);
await B.evaluate(() => { window.__classByName("com.monsters.chat::Chat")._bymChat.default_chat("second alliance line"); });
await A.waitForTimeout(6000);
let s = await chatState(A);
check("alliance count on A's tab", /Alliance \(2\)/.test(s.a), s.a);
await A.screenshot({ path: `${OUT}/alliance-chat-chat-counts.png` });
await A.evaluate(() => window.__classByName("com.monsters.chat::Chat")._bymChat.ioSwitch("alliance"));
await A.waitForTimeout(800);
s = await chatState(A);
const lines = await texts(A, `(() => { let b = window.__classByName("com.monsters.chat::Chat")._bymChat.chatBox; return b; })()`);
check("alliance tab shows B's line, count cleared", /hello alliance from B/.test(lines) && !/hello global from B/.test(lines) && s.a === "Alliance", s.a + " / " + lines.slice(0, 200));
await A.screenshot({ path: `${OUT}/alliance-chat-chat-alliance.png` });
// B's global line is on the global tab
await A.evaluate(() => window.__classByName("com.monsters.chat::Chat")._bymChat.ioSwitch("global"));
await A.waitForTimeout(800);
const glines = await texts(A, `window.__classByName("com.monsters.chat::Chat")._bymChat.chatBox`);
check("global tab shows B's global line", /hello global from B/.test(glines), glines.slice(0, 200));
// click B's name
const nameAt = await A.evaluate(() => {
  const N = window.__classByName("ChatBox_msg_name_CLIP") || window.__classByName("::ChatBox_msg_name_CLIP");
  // a name inside the chat's message area (older lines are scrolled out of it)
  const box = window.__classByName("com.monsters.chat::Chat")._bymChat.chatBox, area = box.background.mcMask.getBounds(window.__player.stage);
  const hits = []; const walk = (o) => { if (!o.visible) return; if (N && o instanceof N) hits.push(o); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage);
  for (const hit of hits.reverse()) { const r = hit.getBounds(window.__player.stage); const y = r.y + r.height / 2; if (y > area.y + 4 && y < area.y + area.height - 4) return window.__player.stageToClient(r.x + Math.min(10, r.width / 2), y); }
  return null;
});
check("name clip found", !!nameAt, JSON.stringify(nameAt));
if (nameAt) { await A.mouse.click(nameAt.x, nameAt.y); await A.waitForTimeout(800); }
// (a name opens its menu since 2 October: "Send a message" opens the message)
const sendAt = await A.evaluate(() => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === "ioChatMenuMessage") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
if (sendAt) { await A.mouse.click(sendAt.x, sendAt.y); await A.waitForTimeout(1500); }
const msgOpen = await A.evaluate(() => { const M = window.__classByName("com.monsters.mailbox::Message"); let hit = null; const walk = (o) => { if (hit) return; if (o instanceof M) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit ? "yes" : null; });
await A.screenshot({ path: `${OUT}/alliance-chat-chat-name-click.png` });
check("name click opens a message", !!msgOpen);
const mt = await texts(A);
const names2 = { b: await B.evaluate(() => window.__game.LOGIN._playerName || "") };
check("message addressed to the other player", names2.b && mt.includes(names2.b.toUpperCase()) || mt.includes(names2.b), names2.b);
await A.evaluate(() => { const M = window.__classByName("com.monsters.mailbox::Message"); const walk = (o) => { for (const c of [...(o.$children ?? [])]) { if (c instanceof M) { c.parent.removeChild(c); window.__game.GLOBAL.BlockerRemove(); } else walk(c); } }; walk(window.__player.stage); });

// members: the Browse action popup and Members
await A.evaluate(([id, name]) => { window.__aid = id; window.__aname = name; }, [process.env.ALLIANCE_ID || "1", process.env.ALLIANCE_NAME || ""]);
await A.evaluate(() => {
  const P = window.__classByName("com.monsters.alliances.tabs::BrowseActionPopup");
  const p = new P({ alliance_id: Number(window.__aid), name: window.__aname, image: 3 }, () => { if (p.parent) p.parent.removeChild(p); }, null);
  p.x = 500; p.y = 250; window.__game.GLOBAL._layerTop.addChild(p); window.__bap = p;
});
await A.waitForTimeout(800);
await A.screenshot({ path: `${OUT}/alliance-chat-browse-actions.png` });
await A.evaluate(() => window.__bap._onMembers(null));
await A.waitForTimeout(2500);
const mem = await texts(A);
await A.screenshot({ path: `${OUT}/alliance-chat-members.png` });
const names = await Promise.all([A, B].map((p) => p.evaluate(() => window.__game.LOGIN._playerName || "")));
check("members popup lists both", names.every((n) => n && mem.includes(n)), names.join(", "));

// invite popup
await A.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} window.__classByName("UI_TOP").ioShowInvite(); });
await A.waitForTimeout(1500);
const inv = await texts(A);
await A.screenshot({ path: `${OUT}/alliance-chat-invite.png` });
check("invite text", /Join me on maproom 2 in the inferno! - A custom backyard monsters refitted server\.\s*Play in your browser at https:\/\/inferno\.maproom2\.com\/\?ref=/.test(inv), (inv.match(/Join me[^|]*/) || [""])[0].slice(0, 220));
check("no page errors", A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].join("; "));
await browser.close();
