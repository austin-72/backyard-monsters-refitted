// The redesigned Alliances window (Inferno, 2 October), with two players of the same alliance: A leads it,
// B starts as a plain member (both must be in one alliance, A its leader; see HANDOFF.md, "Testing").
//  - the header strip and the tabs (a member's, an officer's, and those of a player with no alliance)
//  - no chat in the window (the dock's Alliance tab is the chat)
//  - Members: sorting by a column; Actions -> Make officer; an officer gets Recruit and the board's buttons
//  - Board: New pin typed in (title, words, place), shown on the board, said in Alliance chat with its place,
//    counted on the other player's Board tab; Edit, Up / Down, Remove; Jump opens the map there
//  - Outposts: rows, the Lost filter, a member filter, more rows on scrolling down
//  - the map's Share bubble: "Pin to alliance board" opens the editor with the place filled in
//  - B leaves (Overview -> Leave): Browse, Invites and Create; then rejoins by invite (API)
// Takeovers themselves are written by the server (controllers/maproom/v2/takeoverCell.ts), checked apart.
//   EMAIL=... EMAIL2=... PASSWORD=... node tools/test/alliance-board-test.mjs
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const form = (o) => new URLSearchParams(o).toString();
const api = async (path, body, token, method = "POST") => {
  const r = await fetch(server + path, { method, headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: method === "POST" ? form(body || {}) : undefined });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t.slice(0, 200) }; }
};
const tok = async (email) => (await api("api/v1.7.3-beta/player/getinfo", { version: 128, email, password: process.env.PASSWORD })).token;
let tA = await tok(process.env.EMAIL);
let tB = await tok(process.env.EMAIL2);
const meA = (await api("alliance/myalliance", null, tA, "GET")).alliance;
const allianceName = meA?.name;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (email, token) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
  await sleep(6000);
  // (no wild monster attack popping up over the window halfway through)
  await page.evaluate(() => { window.__game.WMATTACK._enabled = false; });
  // (every popup waiting: the welcome, a repairman, a level-up ... any one left covers the window)
  await page.evaluate(() => { for (let i = 0; i < 8; i++) try { window.__game.POPUPS.Next(); } catch (e) {} const D = window.__classByName("com.monsters.daily::IoDailyPopup"); if (D && D._open) D._open.close(); });
  return page;
};
const A = await open(process.env.EMAIL, tA);
const B = await open(process.env.EMAIL2, tB);
const uidB = await B.evaluate(() => window.__game.LOGIN._playerID);
// (one session per player: the game's own token from here on)
tA = await A.evaluate(() => window.__game.LOGIN.token);
tB = await B.evaluate(() => window.__game.LOGIN.token);
// a clean start: B a plain member, the board empty
await api("alliance/setofficer", { userid: uidB, on: 0 }, tA);
for (const p of (await api("alliance/pins", {}, tA)).pins || []) await api("alliance/deletepin", { id: p.id }, tA);

// helpers: things on the stage by name, their texts, clicking them as a player would
const where = (page, name, within = null) => page.evaluate(([name, within]) => {
  let hit = null;
  const root = within ? eval(within) : window.__player.stage;
  const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name && o.stage) { hit = o; return; } for (const c of o.$children ?? []) walk(c); };
  walk(root);
  if (!hit) return null;
  const r = hit.getBounds(window.__player.stage);
  return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2);
}, [name, within]);
const click = async (page, name, within = null) => { const p = await where(page, name, within); if (p) { await page.mouse.click(p.x, p.y); await sleep(500); } return !!p; };
const texts = (page, root = "window.__game.ALLIANCEWINDOW._mc") => page.evaluate((root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const o0 = eval(root); if (!o0) return ""; const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(o0); return out.join(" | "); }, root);
const tabs = (page) => page.evaluate(() => { const mc = window.__game.ALLIANCEWINDOW._mc; return mc ? mc._tabs.map((t) => t.btn._txt ? t.btn._txt.text : "") : []; });
const messages = (page) => page.evaluate(() => { const M = window.__classByName("MESSAGE"); const out = []; const walk = (o) => { if (!o) return; if (M && o instanceof M) out.push(o); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out.length; });
// the game's message box: "yes" presses its first button, otherwise it is closed
const answer = (page, yes) => page.evaluate((yes) => { const M = window.__classByName("MESSAGE"); const found = []; const walk = (o) => { if (!o) return; if (M && o instanceof M) found.push(o); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); let text = ""; for (const m of found) { try { const T = window.__classByName("flash.text::TextField"); const w = (o) => { if (o instanceof T) text += o.text + " "; for (const c of o.$children ?? []) w(c); }; w(m); if (yes) m.Action(null); else m.Hide(); } catch (e) {} } return text; }, yes);
const show = (page) => page.evaluate(() => { if (!window.__game.ALLIANCEWINDOW._open) window.__game.ALLIANCEWINDOW.Show(); });
const hide = (page) => page.evaluate(() => window.__game.ALLIANCEWINDOW.Hide());
const tab = async (page, id) => { await page.evaluate((id) => window.__game.ALLIANCEWINDOW._mc.SelectTab(id), id); await sleep(1800); };
const typeInto = async (page, name, text) => { await click(page, name); await page.keyboard.press("Control+A"); await page.keyboard.type(text, { delay: 10 }); await sleep(200); };

// 1. the leader's window: the header, the tabs, no chat
await show(A);
await sleep(3000);
let t = await texts(A);
let tl = await tabs(A);
await A.screenshot({ path: `${OUT}/alliance-board-overview.png` });
check("header: name, standing, members online, outposts, empire", t.includes(allianceName) && /Rank: /.test(t) && /You: Leader/.test(t) && /Members online/.test(t) && /Outposts/.test(t) && /Empire value/.test(t), t.slice(0, 200));
check("a leader's tabs", tl.join(",").replace(/ \(\d+(\/\d+)?\)/g, "") === "Overview,Board,Outposts,Members,Power-Ups,Recruit,Invites,Browse", tl.join(","));
check("no chat in the window", !/Post\b/.test(t) && !/Connecting/.test(t), "");
check("overview: about, board, week, power-ups", /About the alliance/.test(t) && /Latest on the board/.test(t) && /Outposts this week/.test(t) && /Power-ups running/.test(t));

// 2. a plain member: no Recruit, no New pin
await show(B);
await sleep(3000);
tl = await tabs(B);
t = await texts(B);
check("a member's tabs (no Recruit)", !tl.some((x) => /Recruit/.test(x)) && tl.some((x) => /Board/.test(x)), tl.join(","));
check("a member is a Member", /You: Member/.test(t), "");
await tab(B, 6);
check("a member can't pin", !(await where(B, "ioNewPin")), "");

// 3. Members: sort by Empire, then make B an officer
await tab(A, 3);
await click(A, "ioSort_empire");
const empires = await A.evaluate(() => { const pane = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content; const T = window.__classByName("flash.text::TextField"); const out = []; for (const r of pane.$children) { const ts = []; const w = (o) => { if (o instanceof T) ts.push(o.text); for (const c of o.$children ?? []) w(c); }; w(r); out.push(Number((ts[4] || "0").replace(/,/g, ""))); } return out; });
check("members sorted by empire, biggest first", empires.length > 1 && empires.every((v, i) => i === 0 || empires[i - 1] >= v), empires.slice(0, 5).join(" "));
await A.screenshot({ path: `${OUT}/alliance-board-members.png` });
await A.evaluate((uid) => { const pane = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane; const row = pane.content.getChildByName("ioMember" + uid); if (row) pane.reveal(row.y, 34); }, uidB);
check("B's Actions", await click(A, "ioActions", `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content.getChildByName("ioMember${uidB}")`));
t = await texts(A, `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._popup`);
check("actions: message, jump, make officer, kick, make leader", /Send a message/.test(t) && /Jump to their yard/.test(t) && /Make officer/.test(t) && /Kick/.test(t) && /Make leader/.test(t), t);
await A.screenshot({ path: `${OUT}/alliance-board-actions.png` });
// the popup's buttons are unnamed: the third one is Make officer
const officerAt = await A.evaluate(() => { const p = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._popup; const T = window.__classByName("flash.text::TextField"); let hit = null; const w = (o) => { if (hit) return; if (o instanceof T && o.text === "Make officer") { hit = o.parent; return; } for (const c of o.$children ?? []) w(c); }; w(p); const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); });
await A.mouse.click(officerAt.x, officerAt.y);
await sleep(1500);
const said = await answer(A, false);
check("made an officer", /is now an officer/.test(said), said.trim());
const roleB = ((await api("alliance/myalliancemembers", null, tA, "GET")).members || []).find((m) => m.user_id === uidB)?.role;
check("the server has B as officer", roleB === "officer", roleB);
await sleep(1500);
t = await texts(A);
check("the roster shows Officer", /Officer/.test(t), "");

// 4. B, now an officer: Recruit, and the board's buttons
await hide(B);
await sleep(500);
await show(B);
await sleep(3000);
tl = await tabs(B);
t = await texts(B);
check("an officer's tabs (Recruit)", tl.some((x) => /Recruit/.test(x)), tl.join(","));
check("an officer is an Officer", /You: Officer/.test(t), "");

// 5. B pins something, typed in
// (a popup that turned up since, e.g. the Wild Monster Invasion notice, would cover the editor)
for (const P of [A, B]) await P.evaluate(() => { for (let i = 0; i < 8; i++) try { window.__game.POPUPS.Next(); } catch (e) {} });
await tab(B, 6);
check("New pin", await click(B, "ioNewPin"));
await sleep(600);
await typeInto(B, "ioPinTitle", "Raid at dawn");
await typeInto(B, "ioPinBody", "Meet at the rally point, bring flingers.");
await typeInto(B, "ioPinX", "150");
await typeInto(B, "ioPinY", "260");
await B.screenshot({ path: `${OUT}/alliance-board-editor.png` });
await click(B, "ioPinSave");
await sleep(2000);
t = await texts(B);
check("the pin is on the board", /Raid at dawn/.test(t) && /Meet at the rally point, bring flingers\./.test(t) && /Place: 150, 260/.test(t), t.slice(0, 300));
await B.screenshot({ path: `${OUT}/alliance-board-board.png` });

// 6. A hears of it in Alliance chat, and the Board tab counts it
await tab(A, 1);
await sleep(7000);
const line = await A.evaluate(() => { const c = window.__classByName("com.monsters.chat::Chat")._bymChat; const log = c._ioLogs.alliance || []; const l = log.filter((x) => x.kind === "shout_pinned").pop(); return l ? l.html : null; });
check("said in Alliance chat with its place", line && /pinned to the board: Raid at dawn/.test(line) && /\[map:150,260/.test(line), line);
tl = await tabs(A);
check("A's Board tab counts the new pin", tl.some((x) => x === "Board (1)"), tl.join(","));
t = await texts(A);
check("the Overview shows it", /Raid at dawn/.test(t), "");
await tab(A, 6);
tl = await tabs(A);
check("opening the Board clears its count", tl.some((x) => x === "Board"), tl.join(","));

// 7. Edit, Up / Down, Remove
await api("alliance/savepin", { title: "Second pin", body: "Below or above" }, tA);
await tab(A, 6);
let order = await A.evaluate(() => window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pins.map((p) => p.title));
check("a new pin goes on top", order[0] === "Second pin", order.join(" / "));
const firstId = await A.evaluate(() => window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pins[0].id);
await click(A, "ioDown", `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content.getChildByName("ioPin${firstId}")`);
await sleep(1500);
order = await A.evaluate(() => window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pins.map((p) => p.title));
check("Down moves it below", order[1] === "Second pin", order.join(" / "));
await click(A, "ioEdit", `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content.getChildByName("ioPin${firstId}")`);
await sleep(600);
const prefilled = await A.evaluate(() => { let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === "ioPinTitle") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit ? hit.text : null; });
check("Edit fills the editor in", prefilled === "Second pin", prefilled);
await typeInto(A, "ioPinTitle", "Second pin, changed");
await click(A, "ioPinSave");
await sleep(2000);
t = await texts(A);
check("the change is on the board", /Second pin, changed/.test(t) && /changed /.test(t), "");
await click(A, "ioRemove", `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content.getChildByName("ioPin${firstId}")`);
await sleep(600);
const confirm = await answer(A, true);
await sleep(1800);
t = await texts(A);
check("Remove asks, then takes it off", /Take "Second pin, changed" off the board\?/.test(confirm) && !/Second pin, changed/.test(t) && /Raid at dawn/.test(t), confirm.trim());

// 8. Jump: the window closes and the map opens there
const pinId = await A.evaluate(() => window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pins[0].id);
await click(A, "ioJump", `window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._pane.content.getChildByName("ioPin${pinId}")`);
await sleep(6000);
const map = await A.evaluate(() => { const MR = window.__classByName("com.monsters.maproom_advanced::MapRoom"); const mark = MR._mc && MR._mc._ioMarkCell ? [MR._mc._ioMarkCell.x, MR._mc._ioMarkCell.y] : null; return { window: window.__game.ALLIANCEWINDOW._open, map: window.__game.GLOBAL.isMapOpen(), mark }; });
await A.screenshot({ path: `${OUT}/alliance-board-jump.png` });
// (a yard without a Map Room is told to build one first, as from the chat's places)
const noMapRoom = map.map ? "" : await answer(A, false);
check("Jump opens the map (or asks for a Map Room)", map.window === false && (map.map === true || /Map Room/.test(noMapRoom)), JSON.stringify(map) + " " + noMapRoom.trim());

// 9. the map's Share bubble: Pin to alliance board
await A.evaluate(() => { const S = window.__classByName("com.monsters.maproom_advanced::IoMapShare"); const R = window.__classByName("flash.geom::Rectangle"); S.ShowChooser(window.__player.stage, 600, 400, new R(0, 0, 1200, 760), 150, 262); });
await sleep(600);
await A.screenshot({ path: `${OUT}/alliance-board-share.png` });
check("the Share bubble has Pin to alliance board", await click(A, "ioSharePin"));
await sleep(600);
const filled = await A.evaluate(() => { const get = (n) => { let hit = null; const walk = (o) => { if (hit || !o) return; if (o.name === n) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return hit ? hit.text : null; }; return [get("ioPinX"), get("ioPinY")]; });
check("the editor has the place", filled[0] === "150" && filled[1] === "262", filled.join(","));
await A.evaluate(() => window.__classByName("com.monsters.alliances.tabs::IoPinEditorPopup").Close(false));
await A.evaluate(() => { const MR = window.__classByName("com.monsters.maproom_advanced::MapRoom"); try { if (MR._mc) MR._mc.Hide(); } catch (e) {} });
await sleep(2500);

// 10. Outposts: rows, the Lost filter, a member, more on scrolling
await show(A);
await sleep(2500);
await tab(A, 7);
const rows = () => A.evaluate(() => { const t = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0); return t._events.map((e) => [e.kind, e.user_name]); });
let r = await rows();
check("outposts listed", r.length > 0, String(r.length));
await A.screenshot({ path: `${OUT}/alliance-board-outposts.png` });
await click(A, "ioFilter_kind_lost");
await sleep(1500);
r = await rows();
check("Lost shows only losses", r.length > 0 ? r.every((x) => x[0] === "lost") : true, String(r.length));
await click(A, "ioFilter_kind_all");
await sleep(1500);
const total = (await rows()).length;
await A.evaluate(() => { const t = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0); t._pane.scrollTo(1e6); });
await sleep(2000);
r = await rows();
check("more rows come on scrolling down", total < 50 || r.length > total, `${total} -> ${r.length}`);
await click(A, "ioFilterMember");
await sleep(500);
await A.screenshot({ path: `${OUT}/alliance-board-picker.png` });
const pick = await A.evaluate((name) => { const p = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._picker; if (!p) return -1; const T = window.__classByName("flash.text::TextField"); const rows = []; const w = (o) => { if (/^ioPick\d+$/.test(o.name)) rows.push(o); for (const c of o.$children ?? []) w(c); }; w(p); for (const row of rows) { let txt = ""; const w2 = (o) => { if (o instanceof T) txt += o.text; for (const c of o.$children ?? []) w2(c); }; w2(row); if (txt === name) return Number(row.name.slice(6)); } return -2; }, "IoTester");
if (pick >= 0) {
  await A.evaluate((i) => { const p = window.__game.ALLIANCEWINDOW._mc._contentMC.getChildAt(0)._picker; const pane = p.getChildAt(0); pane.reveal(i * 24, 24); }, pick);
  await click(A, "ioPick" + pick);
  await sleep(1500);
}
r = await rows();
check("a member's outposts only", pick >= 0 && r.length > 0 && r.every((x) => x[1] === "IoTester"), `${pick} ${r.length}`);
await click(A, "ioFilterMember");
await sleep(400);
await click(A, "ioPick0");
await sleep(1000);

// 11. B leaves: Browse, Invites and Create; then back in by invite
await tab(B, 1);
check("Leave", await click(B, "ioLeave"));
const leaveText = await answer(B, true);
await sleep(2500);
tl = await tabs(B);
t = await texts(B);
await B.screenshot({ path: `${OUT}/alliance-board-none.png` });
check("no alliance: Browse, Invites, Create", tl.join(",").replace(/ \(\d+\)/g, "") === "Browse,Invites,Create", tl.join(","));
check("no alliance: the header says so", /You are not in an alliance/.test(t), "");
const inv = await api("alliance/inviteuser", { userid: uidB }, tA);
const inbox = (await api("alliance/getmessages", null, tB, "GET")).messages || [];
const invite = inbox.find((m) => m.type === "invite" && m.status === "pending");
const back = invite ? await api("alliance/changeinvitestatus", { invite_id: invite.id ?? invite.invite_id, status: "accepted" }, tB) : null;
const again = (await api("alliance/myalliance", null, tB, "GET")).alliance;
check("back in by invite", again && again.alliance_id === meA.alliance_id, JSON.stringify(inv).slice(0, 120) + " " + JSON.stringify(back).slice(0, 120));

for (const p of (await api("alliance/pins", {}, tA)).pins || []) await api("alliance/deletepin", { id: p.id }, tA);
check("no page errors", A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].join("; "));
await browser.close();
