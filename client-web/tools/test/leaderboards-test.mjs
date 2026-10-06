// The leaderboards (client: com/monsters/leaderboards/IoLeaderboards.as, the top bar's button in UI_TOP;
// server: /leaderboards/game, services/leaderboards/gameLeaderboards.ts, made on the map snapshots' 5-minute clock).
//   EMAIL=<admin> EMAIL2=<player> PASSWORD=... PGPASSWORD=... SHOTS=dir node tools/test/leaderboards-test.mjs
// EMAIL2 is a player (not an admin) with a main yard on a Map Room 2 world, in an alliance, with bets in the
// Brimstone Pit; EMAIL an admin (InfernoOnlyConfig.admins). Prints one line per check; each must end in "ok".
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 400)}`);
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", q], { env: { ...process.env } }).toString().trim();
const login = async (email) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const LB = "com.monsters.leaderboards::IoLeaderboards";
const MR = "com.monsters.maproom_advanced::MapRoom";
const SNAP = "com.monsters.maproom_advanced::IoMapSnapshot";

const byName = (a, b) => { const x = a.name.toLowerCase(), y = b.name.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; };
const byOutposts = (a, b) => b.outposts - a.outposts || b.empire - a.empire || byName(a, b);
const byEmpire = (a, b) => b.empire - a.empire || b.outposts - a.outposts || byName(a, b);
const byGambled = (a, b) => b.wagered - a.wagered || b.net - a.net || byName(a, b);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const open = async (email) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  const requests = [];
  const answers = [];
  page.on("request", (r) => { if (/leaderboards\/game|worldmapv2\/mapdata/.test(r.url())) requests.push({ at: Date.now(), what: /leaderboards/.test(r.url()) ? "lb" : "map" }); });
  page.on("response", async (r) => { if (/leaderboards\/game/.test(r.url())) { try { answers.push(await r.json()); } catch (e) {} } if (/worldmapv2\/mapdata/.test(r.url())) { try { answers.push({ map: await r.json() }); } catch (e) {} } });
  const g = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(`${server}?token=${await login(email)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(400); }
  await g(() => {
    window.__game.BASE._blockSave = true;
    window.__named = (name, root) => { let hit = null; const walk = (o) => { if (hit || !o || !o.visible) return; if (o.name === name) { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(root || window.__player.stage); return hit; };
    window.__at = (o) => { const r = o.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); };
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
  });
  const clickAt = async (p, wait = 500) => { if (!p) return false; await page.mouse.click(p.x, p.y); await page.waitForTimeout(wait); return true; };
  const clickNamed = async (name, wait) => clickAt(await g((n) => { const o = window.__named(n); return o ? window.__at(o) : null; }, name), wait);
  return { page, g, errors, requests, answers, clickAt, clickNamed };
};

try {
  // ======== a player
  const { page, g, errors, requests, answers, clickAt, clickNamed } = await open(process.env.EMAIL2);
  const me = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL2}'`));
  const admins = sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`).split("\n").map(Number);

  const bar = await g(() => { const top = window.__game.GLOBAL._ROOT ? null : null; const b = window.__named("ioLeaderboards"); const ui = b && b.parent; const r5 = ui && ui.mcR5; return b ? { x: b.x, y: b.y, w: b.width, h: b.height, r5: r5 ? [r5.x, r5.y, r5.bAdd && !r5.bAdd.visible ? r5.mcBG.x + r5.mcBG.width : r5.width, r5.height] : null, admin: !!window.__named("Admin") } : null; });
  check("the leaderboards button is in the top bar, just right of the Shiny counter's box", bar && bar.r5 && bar.x >= bar.r5[0] + bar.r5[2] && bar.x < bar.r5[0] + bar.r5[2] + 20 && Math.abs(bar.y + bar.h / 2 - (bar.r5[1] + bar.r5[3] / 2)) < 6, JSON.stringify(bar));
  if (bar) { const p = await g(() => window.__at(window.__named("ioLeaderboards"))); await page.screenshot({ path: `${shots}/lb-button.png`, clip: { x: Math.max(0, p.x - 260), y: Math.max(0, p.y - 40), width: 520, height: 80 } }); }

  // ---- opens, asks once
  requests.length = 0;
  await clickNamed("ioLeaderboards", 300);
  await page.waitForFunction((LB) => { const C = window.__classByName(LB); return C._open && C._data; }, LB, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const data = answers.find((a) => a.players);
  check("the button opens the window and it asks the server once", requests.filter((r) => r.what === "lb").length === 1 && !!data, JSON.stringify(requests));
  await page.screenshot({ path: `${shots}/lb-outposts.png` });
  check("the server's leaderboards: worlds named, the next at the 5-minute mark", data && data.worlds.length >= 1 && data.worlds.every((w) => w[1]) && data.nextAt % 300 === 0 && data.nextAt > data.generatedAt && data.nextAt - data.generatedAt <= 300, JSON.stringify(data && { worlds: data.worlds, generatedAt: data.generatedAt, nextAt: data.nextAt }));
  check("admins are on no list", data && !data.players.some((p) => admins.includes(p[0])) && !data.gamblers.some((r) => admins.includes(r[0])), JSON.stringify(admins));

  // ---- Outposts
  const players = data.players.map((p) => ({ uid: p[0], name: p[1], w: p[2], alliance: p[3], outposts: p[4], empire: p[5], x: p[6], y: p[7] }));
  const want0 = [...players].sort(byOutposts).map((p) => p.uid);
  const list0 = await g((LB) => window.__classByName(LB)._open._list.map((i) => i.p.uid), LB);
  check("Outposts: every player, most outposts first, ties to the higher empire value", JSON.stringify(list0) === JSON.stringify(want0) && list0.length === players.length, `${list0.length} rows; top ${JSON.stringify(list0.slice(0, 5))}`);
  const ties = [...players].sort(byOutposts).filter((p, i, a) => i > 0 && a[i - 1].outposts === p.outposts).length;
  check("…the list has ties on outposts, broken by empire value", ties > 0, `${ties} ties`);
  const topRow = await g((LB) => { const o = window.__classByName(LB)._open; const e = o._pool.find((e) => e.index === 0); return e.cells.map((c) => c.text); }, LB);
  const top = players.find((p) => p.uid === want0[0]);
  check("…the first row on screen: rank, name, world, alliance, outposts, empire value", topRow[0] === "1" && topRow[1] === top.name && topRow[2] === data.worlds[top.w][1] && topRow[4] === String(top.outposts) && topRow[5].replace(/,/g, "") === String(top.empire), JSON.stringify(topRow));
  // empire value = main yard + outposts (against the database's cells)
  const dbEmpire = Number(sql(`SELECT COALESCE(SUM(s.empirevalue), -1) FROM bym.world_map_cell c JOIN bym.save s ON s.cell_cellid = c.cellid WHERE c.uid = ${top.uid} AND c.map_version = 2 AND c.destroyed_at IS NULL AND c.base_type >= 2`) || -1);
  const dbOutposts = Number(sql(`SELECT COUNT(*) FROM bym.world_map_cell WHERE uid = ${top.uid} AND map_version = 2 AND destroyed_at IS NULL AND base_type = 3`) || -1);
  check("…its outposts and empire value (main yard and outposts together) as the database has them", dbOutposts === top.outposts && dbEmpire === top.empire, JSON.stringify({ dbOutposts, listed: top.outposts, dbEmpire, empire: top.empire }));
  const count0 = await g(() => window.__texts(window.__named("ioLeaderboardsWindow")).find((t) => / players$/.test(t)));
  check("…the count", count0 === `${players.length.toLocaleString("en-US")} players`, count0);

  // ---- scrolling (the rows are reused)
  const listAt = await g((LB) => { const o = window.__classByName(LB)._open; return window.__at(o._holder); }, LB);
  await page.mouse.move(listAt.x - 100, listAt.y);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(150); }
  const scrolled = await g((LB) => { const o = window.__classByName(LB)._open; const shown = o._pool.filter((e) => e.line.visible).map((e) => e.index); return { offset: o._offset, first: Math.min(...shown), pool: o._pool.length }; }, LB);
  check("the wheel scrolls the list; only the rows in view exist", scrolled.offset > 0 && scrolled.first > 0 && scrolled.pool <= 14, JSON.stringify(scrolled));

  // ---- Find me
  await clickNamed("ioLbFindMe", 500);
  const found = await g(([LB, me]) => { const o = window.__classByName(LB)._open; const e = o._pool.find((e) => e.item && e.item.p && e.item.p.uid === me && e.line.visible); return e ? { index: e.index, flash: e.flash, y: e.line.y } : null; }, [LB, me]);
  check("Find me scrolls to the player's own row and lights it up", found && found.flash && found.y >= 0 && found.y < 300, JSON.stringify(found));
  await page.screenshot({ path: `${shots}/lb-findme.png` });

  // ---- Alliances
  await clickNamed("ioLbTab1", 500);
  const groups = data.alliances.map((a) => { const members = a[4].map((u) => players.find((p) => p.uid === u)).filter(Boolean); return { id: a[0], name: a[1], w: a[3], members, outposts: members.reduce((s, m) => s + m.outposts, 0), empire: members.reduce((s, m) => s + m.empire, 0) }; });
  const want1 = [...groups].sort(byEmpire).map((a) => a.id + "@" + a.w);
  const list1 = await g((LB) => window.__classByName(LB)._open._list.map((i) => ({ kind: i.kind, key: i.a.id + "@" + i.a.w, outposts: i.a.outposts, empire: i.a.empire })), LB);
  check("Alliances: the highest total empire value first, with the members' outposts added up", JSON.stringify(list1.map((i) => i.key)) === JSON.stringify(want1) && list1.every((i) => { const a = groups.find((x) => x.id + "@" + x.w === i.key); return a.outposts === i.outposts && a.empire === i.empire; }), JSON.stringify(list1.slice(0, 4)));
  const firstAlliance = await g((LB) => window.__at(window.__classByName(LB)._open._pool.find((e) => e.index === 0).cells[1]), LB);
  await clickAt(firstAlliance, 500);
  const expanded = await g((LB) => window.__classByName(LB)._open._list.filter((i) => i.kind === "member").map((i) => ({ uid: i.p.uid, empire: i.p.empire, outposts: i.p.outposts })), LB);
  const g0 = [...groups].sort(byEmpire)[0];
  check("…the arrow opens an alliance's members, the highest empire value first, each with outposts", expanded.length === g0.members.length && JSON.stringify(expanded.map((m) => m.uid)) === JSON.stringify([...g0.members].sort(byEmpire).map((m) => m.uid)), `${expanded.length} of ${g0.members.length}`);
  const memberRow = await g((LB) => { const e = window.__classByName(LB)._open._pool.find((e) => e.index === 1); return e.cells.map((c) => c.text); }, LB);
  check("…a member's row shows their empire value and outposts", memberRow[0] === "" && memberRow[1].trim() === [...g0.members].sort(byEmpire)[0].name && memberRow[4] !== "" && memberRow[5] !== "", JSON.stringify(memberRow));
  await page.screenshot({ path: `${shots}/lb-alliances.png` });
  await clickAt(firstAlliance, 500);
  check("…and closes them again", await g((LB) => window.__classByName(LB)._open._list.every((i) => i.kind === "alliance"), LB));
  await clickNamed("ioLbFindMe", 500);
  const mineOpen = await g(([LB, me]) => { const o = window.__classByName(LB)._open; return o._list.some((i) => i.kind === "member" && i.p.uid === me) && o._pool.some((e) => e.item && e.item.p && e.item.p.uid === me && e.flash); }, [LB, me]);
  check("…Find me opens the player's alliance and lights their row", mineOpen);

  // ---- Gamblers (against the Pit's ledger)
  await clickNamed("ioLbTab2", 500);
  const ledger = sql(`SELECT user_id || ',' || SUM(stake) || ',' || SUM(payout - stake) || ',' || COUNT(*) FROM bym.casino_bet WHERE status = 'settled' GROUP BY user_id`).split("\n").filter(Boolean).map((l) => l.split(",").map(Number)).filter((r) => !admins.includes(r[0]));
  const list2 = await g((LB) => window.__classByName(LB)._open._list.map((i) => ({ uid: i.g.uid, name: i.g.name, wagered: i.g.wagered, net: i.g.net, bets: i.g.bets })), LB);
  check("Gamblers: everyone with a settled bet (no admins), totals as the ledger has them", list2.length === ledger.length && ledger.every((r) => { const x = list2.find((y) => y.uid === r[0]); return x && x.wagered === r[1] && x.net === r[2] && x.bets === r[3]; }), JSON.stringify({ list2, ledger }));
  check("…the most gambled first", JSON.stringify(list2.map((x) => x.uid)) === JSON.stringify([...list2].sort(byGambled).map((x) => x.uid)));
  const netCell = await g((LB) => { const e = window.__classByName(LB)._open._pool.find((e) => e.index === 0); return e ? { text: e.cells[5].text, colour: e.cells[5].defaultTextFormat.color } : null; }, LB);
  check("…the lifetime net signed and coloured", netCell && (list2[0].net > 0 ? /^\+/.test(netCell.text) : list2[0].net < 0 ? /^-/.test(netCell.text) : true), JSON.stringify(netCell));
  await page.screenshot({ path: `${shots}/lb-gamblers.png` });

  // ---- the world filter
  await clickNamed("ioLbTab0", 400);
  await clickNamed("ioLbWorld", 400);
  const choices = await g(() => { const l = window.__named("ioLbWorldList"); return l ? window.__texts(l) : null; });
  check("the World button lists All worlds and every world by its name", choices && choices[0] === "All worlds" && data.worlds.every((w) => choices.includes(w[1])), JSON.stringify(choices));
  await page.screenshot({ path: `${shots}/lb-worlds.png` });
  await clickNamed("ioLbWorld0", 400);
  const filtered = await g((LB) => { const o = window.__classByName(LB)._open; return { n: o._list.length, all0: o._list.every((i) => i.p.w === 0), label: o._worldLabel.text }; }, LB);
  check("…one world keeps the list to its players", filtered.all0 && filtered.n === players.filter((p) => p.w === 0).length && filtered.label.includes(data.worlds[0][1]), JSON.stringify(filtered));
  await clickNamed("ioLbWorld", 400);
  await clickNamed("ioLbWorld-1", 400);
  check("…All worlds lists everyone again", await g((LB) => window.__classByName(LB)._open._list.length, LB) === players.length);

  // ---- the footer, the cadence
  const footer = await g(() => window.__named("ioLbFooter").text);
  check("the footer says how old the leaderboards are and when the next are due", /^Updated \d+ min(ute)?s? ago {2}· {2}next in \d+:\d\d$/.test(footer) || /^Updated .+ ago {2}· {2}next in \d+:\d\d$/.test(footer), footer);
  const clock = await g((LB) => { const C = window.__classByName(LB); return { fetchedAt: C._fetchedAt, nextAt: C._nextAt, dueAt: C._dueAt, now: window.__game.GLOBAL.Timestamp() }; }, LB);
  check("the next request waits for the server's next leaderboards (a few seconds after), and 5 minutes at least", clock.nextAt === data.nextAt && clock.dueAt >= Math.max(clock.nextAt, clock.fetchedAt + 300) + 3 && clock.dueAt <= Math.max(clock.nextAt, clock.fetchedAt + 300) + 21, JSON.stringify(clock));
  await clickNamed("ioLbClose", 400);
  for (let i = 0; i < 3; i++) { await clickNamed("ioLeaderboards", 600); await clickNamed("ioLbClose", 300); }
  check("opening it again within 5 minutes asks nothing", requests.filter((r) => r.what === "lb").length === 1, JSON.stringify(requests));
  // past the server's next: asked again (time moved by the test)
  await clickNamed("ioLeaderboards", 400);
  await g((LB) => { const C = window.__classByName(LB); C._fetchedAt -= 400; C._dueAt = window.__game.GLOBAL.Timestamp() - 1; }, LB);
  await page.waitForFunction(() => true);
  await page.waitForTimeout(2500);
  check("…once 5 minutes have passed and the server's next is out, it asks again (while open)", requests.filter((r) => r.what === "lb").length === 2, JSON.stringify(requests));

  // ---- Jump (a yard on the player's own world); a player without a Map Room gets the game's own message
  const target = await g(([LB, me]) => { const o = window.__classByName(LB)._open; const e = o._pool.find((e) => e.line.visible && e.jump.visible && e.item.p.uid !== me); return e ? { uid: e.item.p.uid, at: window.__at(e.jump) } : null; }, [LB, me]);
  check("Jump shows on rows of the player's world", target != null, JSON.stringify(target));
  if (target) {
    await clickAt(target.at, 1500);
    const said = await g(() => window.__texts(window.__player.stage).find((t) => /Map Room/.test(t)) || null);
    const mapRoom = await g(() => !!window.__game.GLOBAL._bMap);
    check("…it closes the window (without a Map Room the game says to build one)", !(await g((LB) => window.__classByName(LB)._open, LB)) && (mapRoom || !!said), JSON.stringify({ mapRoom, said }));
  }
  check("no page errors (player)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();

  // ======== an admin: the Admin buttons move right of the leaderboards button; the admin is on no list
  const A = await open(process.env.EMAIL);
  const row = await A.g(() => { const b = window.__named("ioLeaderboards"); const a = b && b.parent.getChildByName ? null : null; const kids = b ? b.parent.$children : []; const admin = kids.find((c) => c.$children && window.__texts(c).includes("Admin")); return b ? { lb: [b.x, b.width], admin: admin ? admin.x : null } : null; });
  check("for admins the Admin button sits right of the leaderboards button", row && row.admin != null && row.admin >= row.lb[0] + 34, JSON.stringify(row));
  const p = await A.g(() => window.__at(window.__named("ioLeaderboards")));
  await A.page.screenshot({ path: `${shots}/lb-admin-bar.png`, clip: { x: Math.max(0, p.x - 260), y: Math.max(0, p.y - 40), width: 700, height: 80 } });
  await A.clickNamed("ioLeaderboards", 300);
  await A.page.waitForFunction((LB) => window.__classByName(LB)._data, LB, { timeout: 30000 });
  await A.clickNamed("ioLbFindMe", 600);
  const notListed = await A.g(() => window.__texts(window.__player.stage).some((t) => /not on this list/.test(t)));
  check("…Find me tells an admin they are not listed", notListed);
  for (let i = 0; i < 4; i++) { await A.g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await A.page.waitForTimeout(300); }
  await A.clickNamed("ioLbClose", 400);
  // to an outpost (it opens the map), the map opened once (the leaderboards know the admin's world from it)
  await A.g(() => { window.__game.WMATTACK._enabled = false; window.__game.BASE.LoadNext(); });
  await A.page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && !window.__game.BASE.isMainYard && window.__game.BASE.buildings.length > 0, null, { timeout: 60000 });
  await A.page.waitForTimeout(3000);
  for (let i = 0; i < 4; i++) { await A.g(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await A.page.waitForTimeout(300); }
  A.answers.length = 0;
  A.requests.length = 0;
  await A.g(() => window.__game.GLOBAL.ShowMap());
  await A.page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await A.page.waitForTimeout(3000);
  const map = A.answers.filter((a) => a.map).pop();
  const snap = await A.g((SNAP) => { const C = window.__classByName(SNAP); return { fetchedAt: C._fetchedAt, nextAt: C._nextAt, dueAt: C._dueAt, world: C.world }; }, SNAP);
  check("the map snapshot says when the server's next one is out; the map asks again after that, 5 minutes at least", map && map.map.nextAt > map.map.generatedAt && map.map.nextAt - Math.floor(Date.now() / 1000) <= 300 && snap.nextAt === map.map.nextAt && snap.dueAt >= Math.max(snap.nextAt, snap.fetchedAt + 300) + 3 && snap.dueAt <= Math.max(snap.nextAt, snap.fetchedAt + 300) + 21, JSON.stringify({ nextAt: map && map.map.nextAt, generatedAt: map && map.map.generatedAt, snap }));
  await A.g(() => { window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc.Hide(); });
  await A.page.waitForTimeout(1500);
  await A.g(() => window.__game.GLOBAL.ShowMap());
  await A.page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 });
  await A.page.waitForTimeout(1500);
  check("…opening the map again within 5 minutes asks nothing", A.requests.filter((r) => r.what === "map").length === 1, JSON.stringify(A.requests));
  await A.g(() => { window.__classByName("com.monsters.maproom_advanced::MapRoom")._mc.Hide(); });
  await A.page.waitForTimeout(1500);
  await A.clickNamed("ioLeaderboards", 600);
  await A.page.waitForFunction((LB) => window.__classByName(LB)._open, LB, { timeout: 10000 });
  const jt = await A.g((LB) => { const o = window.__classByName(LB)._open; const e = o._pool.find((e) => e.line.visible && e.jump.visible); return e ? { uid: e.item.p.uid, x: e.item.p.x, y: e.item.p.y, at: window.__at(e.jump) } : null; }, LB);
  check("an admin's Jump buttons (their world from the map)", jt != null, JSON.stringify(jt));
  if (jt) {
    await A.clickAt(jt.at, 500);
    await A.page.waitForFunction(() => window.__game.GLOBAL.isMapOpen(), null, { timeout: 30000 }).catch(() => {});
    await A.page.waitForTimeout(3000);
    const there = await A.g((MR) => { const mc = window.__classByName(MR)._mc; if (!mc) return null; const c = mc.ioCentreCell(); return { centre: [c.x, c.y], open: window.__game.GLOBAL.isMapOpen() }; }, MR);
    check("…Jump closes the window and opens the map on that yard", there && there.open && Math.abs(there.centre[0] - jt.x) <= 2 && Math.abs(there.centre[1] - jt.y) <= 2 && !(await A.g((LB) => window.__classByName(LB)._open, LB)), JSON.stringify({ there, jt }));
    await A.page.screenshot({ path: `${shots}/lb-jump.png` });
  }
  check("no page errors (admin)", A.errors.length === 0, A.errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}
