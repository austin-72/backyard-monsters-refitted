// Catapult and shiny checks on one yard (against a local server):
//  - an instant upgrade asks before spending shiny, and No spends nothing
//  - the Sulfur Bomb shield: invulnerable (red glow), then armour fading (orange, then yellow), then gone
//    with the speed back to normal (tried on a wild monster from a forced attack, with short times)
//  - the Catapult ammunition numbers from the server (jars in seconds, the Sulfur Bomb's armour), and the
//    row titles on one line
//   EMAIL=... PASSWORD=... node tools/test/catapult-test.mjs
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const OUT = process.env.SHOTS || "/tmp";
const token = (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const texts = () => page.evaluate(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out.join(" | "); });
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(7000);
await page.mouse.click(857, 242); await page.waitForTimeout(800);
const g = (src) => page.evaluate(src);

// 1. instant upgrade asks first
const before = await g(`(() => { const G = window.__game; const B = G.BASE; let b = null; for (const k in B._buildingsAll) { const x = B._buildingsAll[k]; if (x._type === 1 || x._type === 2) { b = x; break; } } window.__b = b; return { credits: B._credits.Get(), lvl: b && b._lvl.Get(), type: b && b._type }; })()`);
await g(`window.__game.BUILDINGOPTIONS.Show(window.__b, "upgrade")`);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/catapult-upgrade.png` });
await g(`window.__game.BUILDINGOPTIONS._do.ActionInstantUpgrade(null)`);
await page.waitForTimeout(1000);
const ask = await texts();
await page.screenshot({ path: `${OUT}/catapult-upgrade-confirm.png` });
check("instant upgrade asks", /Spend [\d,]+ Shiny.{0,6}to upgrade this instantly\?/.test(ask), (ask.match(/Spend[^|]*/) || [""])[0]);
// No
const no = await g(`(() => { let hit = null; const walk = (o) => { if (hit || !o.visible) return; if (o instanceof window.__game.Button && o._txt && o._txt.text === "No") { hit = o; return; } for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); if (!hit) return null; const r = hit.getBounds(window.__player.stage); return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2); })()`);
if (no) await page.mouse.click(no.x, no.y);
await page.waitForTimeout(800);
const after = await g(`({ credits: window.__game.BASE._credits.Get(), lvl: window.__b._lvl.Get(), up: !!window.__b._upgrading })`);
check("No keeps shiny and level", no && after.credits === before.credits && after.lvl === before.lvl && !after.up, JSON.stringify([before, after]));
await g(`window.__game.BUILDINGOPTIONS.Hide && window.__game.BUILDINGOPTIONS.Hide()`);
await page.waitForTimeout(600);

// 2. Strongbox data
const locker = await g(`(() => { const L = window.__classByName("CREATURELOCKER"); const c = L._creatures; const pick = (id) => c[id] ? { page: c[id].page, order: c[id].order, level: c[id].level, resource: c[id].resource, time: c[id].time, unlocked: !!(L._lockerData[id] && L._lockerData[id].t == 2) } : null; const out = {}; for (const id in c) { if (c[id].page >= 4) out[id] = pick(id); } return out; })()`);
check("Strongbox: Rezghul on page 4, Korath and Drull on page 5", locker.C19 && locker.C19.page === 4 && locker.IC9 && locker.IC9.page === 5 && locker.IC10 && locker.IC10.page === 5 && locker.IC9.resource === 12288000 && locker.C19.resource === 7372800, JSON.stringify({ C19: locker.C19, IC9: locker.IC9 }));
const props = await g(`(() => { const p = window.__game.GLOBAL._buildingProps[7]; return p ? { name: p.name, costs: p.costs && p.costs.length, last: p.costs && JSON.stringify(p.costs[p.costs.length - 1]), hp: JSON.stringify(p.hp) } : null; })()`);
check("Strongbox has 5 levels", props && props.costs === 5, JSON.stringify(props && props.hp));

// 3. Sulfur shield on a wild monster
// (launched directly: the game holds wild attacks back for the first minute after logging in)
await g(`(() => { const W = window.__game.WMATTACK, G = window.__game.GLOBAL; window.__game.BASE._blockSave = true; W._history.lastattack = 0; G._flags.io_wildlast = 0; W._queued = { type: 7, attack: { IC2: 1 }, attackTime: G.Timestamp(), degrees: 0, distances: { IC2: 100 }, warned: 1, t: 1, level: 10 }; W.LaunchQueuedAttack(); })()`);
await page.waitForTimeout(3000);
const s0 = await g(`(() => {
  const CR = window.__classByName("CREEPS"); let m = null;
  for (const k in CR._creeps) { const c = CR._creeps[k]; if (c && !c._dead && c.health > 1000) { m = c; break; } }
  if (!m) for (const c of CR.m_attackingCreeps) if (c && !c._dead) { m = c; break; }
  if (!m) return null;
  window.__m = m;
  const Sh = window.__classByName("com.monsters.monsters.components.abilities::IoSulfurShield");
  window.__speed0 = m.moveSpeedProperty.value;
  window.__sh = new Sh(1.5, 2, 6); // 2 s invulnerable, 6 s in all
  m.addComponent(window.__sh, "puttyBombEnrage");
  window.__t0 = performance.now();
  return { id: m._creatureID, hp: m.health, speed0: window.__speed0, speed1: m.moveSpeedProperty.value };
})()`);
check("a wild monster to try the shield on", !!s0, JSON.stringify(s0));
const probe = () => g(`(() => { const m = window.__m, sh = window.__sh; const h = m.health; m.modifyHealth(-10); const lost = h - m.health; if (lost > 0) m.modifyHealth(lost); const f = m._graphicMC.filters || []; return { t: Math.round(performance.now() - window.__t0), armor: sh.owner ? sh.armorPercent : null, lost: +lost.toFixed(2), glow: f.length ? f[f.length - 1].color.toString(16) : null, speed: m.moveSpeedProperty.value, has: !!m.getComponentByName("puttyBombEnrage") }; })()`);
const r = [];
for (const wait of [300, 2500, 1700, 2500]) { await page.waitForTimeout(wait); r.push(await probe()); }
if (s0) {
  check("invulnerable: red, no damage", r[0].armor === 100 && r[0].lost === 0 && r[0].glow === "ff2020", JSON.stringify(r[0]));
  check("fading: orange, part damage", r[1].armor < 100 && r[1].armor >= 45 && r[1].lost > 0 && r[1].lost < 6 && r[1].glow === "ff8c00", JSON.stringify(r[1]));
  check("late: yellow, more damage", r[2].armor < 45 && r[2].armor >= 1 && r[2].lost > r[1].lost && r[2].glow === "ffe000", JSON.stringify(r[2]));
  check("gone after total: no glow, speed back", !r[3].has && r[3].lost === 10 && r[3].glow === null && r[3].speed === s0.speed0, JSON.stringify(r[3]));
  check("speed boosted while on", s0.speed1 > s0.speed0, `${s0.speed0} -> ${s0.speed1}`);
}
// 4. catapult popup titles and ammo
const cat = await g(`(() => {
  const RB = window.__classByName("com.monsters.effects::ResourceBombs");
  const b = RB._bombs; const pick = (id) => JSON.stringify({ d: b[id].durability, s: b[id].seconds, c: b[id].costs, inv: b[id].invuln, arm: b[id].armor, len: b[id].speedlength, sp: b[id].speed });
  const out = { pb: ["pb0","pb1","pb2","pb3"].map(pick), pu: ["pu0","pu1","pu2","pu3"].map(pick) };
  try {
    const P = window.__classByName("CATAPULTPOPUP"); const p = new P(); window.__game.GLOBAL._layerTop.addChild(p); window.__cp = p;
    const mc = P._mc || p._mc || p.mc; out.found = !!mc;
    if (mc) { RB._bombid = "tw0"; try { p.Update(); } catch (e) { out.uerr = String(e.message); } const t = mc.tTitleTwig;  out.twig = { text: t.text, width: t.width, textWidth: t.textWidth, wrap: t.wordWrap, lines: t.numLines, h: t.height, auto: t.autoSize }; }
  } catch (e) { out.err = String(e && e.message || e); }
  return out;
})()`);
check("Candy Jars seconds and costs", cat.pb.join() === [[15, 100000], [25, 500000], [40, 2000000], [55, 5000000]].map(([s, c]) => JSON.stringify({ s, c: { r1: c, r2: c } })).join(), cat.pb.join(" "));
check("Sulfur Bomb costs and times", cat.pu.join() === [[100000, 0, 40, 15, 1.2], [500000, 4, 55, 25, 1.4], [5000000, 8, 70, 40, 1.8], [10000000, 12, 85, 55, 2]].map(([c, inv, arm, len, sp]) => JSON.stringify({ c: { r3: c }, inv, arm, len, sp })).join(), cat.pu.join(" "));
check("row title on one line", cat.twig && cat.twig.text === "Marilyn Monstroe" && cat.twig.lines === 1 && cat.twig.width >= cat.twig.textWidth, JSON.stringify(cat.twig));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/catapult-catapult.png` });
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "));
await browser.close();
