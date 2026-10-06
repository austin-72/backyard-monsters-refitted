// Pets (Inferno-only, 3-4 October): the Pets tab in the Buildings menu's Decorations, buying a pet for 500 Shiny
// (after a yes), at most five out in the main yard (a sixth goes to storage) and five of one monster, Out / Store,
// naming them (shown over them in the yard), the pets wandering the yard (on no building, inside the edge), the
// server refusing a sixth out, a sixth of one monster, a monster that can't be a pet, a bad name, and Hell Freezes
// Over's monsters before the event is won; another player seeing the yard's pets with their names.
//   EMAIL3=<a player with an outpost-free main yard, Hell Freezes Over not won> EMAIL2=<another player who can view it>
//   PASSWORD=... PGPASSWORD=... node tools/test/pets-test.mjs
// Prints one line per check; each must end in "ok". It gives EMAIL3 4,000 Shiny and buys six pets (3,000).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const shots = process.env.SHOTS || "/tmp";
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${String(detail).slice(0, 500)}`);
const email = process.env.EMAIL3 || process.env.EMAIL;
const sql = (q) => execFileSync("psql", ["-h", "localhost", "-U", "postgres", "bymio", "-At", "-c", q], { encoding: "utf8" }).trim();
const login = async (who) => (await (await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(who)}&password=${encodeURIComponent(process.env.PASSWORD)}` })).json()).token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const errors = [];

const open = async (who) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/UncaughtError|Error #\d+/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`${server}?token=${await login(who)}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 90000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  await page.evaluate(() => {
    window.__game.WMATTACK._enabled = false;
    window.__texts = (root) => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o || !o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(root); return out; };
  });
  return { page, g: (fn, arg) => page.evaluate(fn, arg) };
};

try {
  const userid = sql(`SELECT userid FROM bym."user" WHERE email = '${email}'`);
  sql(`DELETE FROM bym.pet WHERE user_id = ${userid}`);
  sql(`UPDATE bym.save SET credits = 4000 WHERE userid = ${userid} AND type = 'main'`);
  const { page, g } = await open(email);
  const shinyBefore = await g(() => window.__game.BASE._credits.Get());
  check("a player with 4,000 Shiny (EMAIL3)", shinyBefore === 4000, shinyBefore);

  // ---- the Pets tab: 12 monsters (no champions; Hell Freezes Over's only once it is won)
  await g(() => { const B = window.__classByName("BUILDINGS"); B._menuA = 4; B._menuB = 5; B._page = 0; B.Show(); });
  await page.waitForTimeout(2500);
  const cardsNow = () => g(() => { const mc = window.__classByName("BUILDINGS")._mc; const cards = []; for (let i = 0; i < mc._thumbnailsMC.numChildren; i++) cards.push(mc._thumbnailsMC.getChildAt(i).name); return { cards, pages: mc._pageCount }; });
  const tab2 = await g(() => {
    const B = window.__classByName("BUILDINGS"), mc = B._mc;
    const subs = []; for (let i = 0; i < mc._subButtonsMC.numChildren; i++) subs.push(mc._subButtonsMC.getChildAt(i));
    const cards = []; for (let i = 0; i < mc._thumbnailsMC.numChildren; i++) cards.push(mc._thumbnailsMC.getChildAt(i).name);
    return { subs: subs.length, last: window.__texts(subs[subs.length - 1]).join(), cards, pages: mc._pageCount };
  });
  await page.screenshot({ path: `${shots}/pets-tab.png` });
  check("Decorations has a sixth tab, Pets: ten pet cards a page, two pages, no champions", tab2.subs === 6 && /Pets/.test(tab2.last) && tab2.cards.length === 10 && tab2.pages === 2 && tab2.cards[0] === "ioPetCard_IC1" && !tab2.cards.includes("ioPetCard_IC9"), JSON.stringify(tab2));

  const P = "com.monsters.pets::IoPets";
  const clickIn = async (cardName, button) => {
    const at = await g(([cardName, button]) => {
      const mc = window.__classByName("BUILDINGS")._mc;
      const card = mc._thumbnailsMC.getChildByName(cardName); const b = card.getChildByName(button);
      const PT = window.__classByName("flash.geom::Point"); const p = b.localToGlobal(new PT(b.width / 2, b.height / 2));
      return window.__player.stageToClient(p.x, p.y);
    }, [cardName, button]);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(700);
  };
  const goPage = async (n) => { await g((n) => { const B = window.__classByName("BUILDINGS"); B._mc.SwitchB(4, 5, n); }, n); await page.waitForTimeout(800); };
  const yes = async () => { await g(() => { const L = window.__game.GLOBAL._layerTop; for (let i = L.numChildren - 1; i >= 0; i--) { const c = L.getChildAt(i); if (c.bAction) { c.bAction.dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click", true)); return; } } }); await page.waitForTimeout(1500); };
  const hideMessages = async () => { await g(() => { const L = window.__game.GLOBAL._layerTop; const msgs = []; for (let i = 0; i < L.numChildren; i++) { const c = L.getChildAt(i); if (c.bAction && typeof c.Hide === "function") msgs.push(c); } for (const c of msgs) c.Hide(); }); await page.waitForTimeout(500); };
  const state = () => g((P) => ({ pets: window.__classByName(P).pets.map((p) => p.slice(0, 3).join(":")), walking: window.__classByName(P).walking.map((w) => w.monster), shiny: window.__game.BASE._credits.Get() }), P);
  // (straight to the server, the answer given to the game as its own calls do)
  const call = (path, params) => g(([path, params]) => new Promise((res) => new (window.__classByName("URLLoaderApi"))().load(window.__game.GLOBAL.serverUrl + "pets/" + path, params, (r) => { if (r && r.error === 0) window.__classByName("com.monsters.pets::IoPets").apply(r); res(r); }, () => res({ error: "io" }))), [path, params]);
  await goPage(1);
  const page2 = await cardsNow();
  check("…the second page: Fusebug and Emberghoul, none of Hell Freezes Over's monsters (not won yet)", page2.cards.join() === "ioPetCard_IC15,ioPetCard_IC20", JSON.stringify(page2));
  await goPage(0);

  // ---- buying: a yes first, then 500 Shiny; five of one monster at most, five out
  await clickIn("ioPetCard_IC1", "ioPetBuy");
  const asked = await g(() => { const L = window.__game.GLOBAL._layerTop; for (let i = L.numChildren - 1; i >= 0; i--) { const c = L.getChildAt(i); if (c.bAction) return window.__texts(c).join(" "); } return null; });
  check("…Buy asks first (the price, five out at once, a name)", /Buy a Spurtz pet/.test(asked || "") && /500 Shiny/.test(asked || "") && /5 pets can be out/.test(asked || ""), asked);
  await yes();
  const one = await state();
  check("…once agreed: a Spurtz pet, out, wandering the yard; 500 Shiny gone", one.pets.length === 1 && /:IC1:1$/.test(one.pets[0]) && one.walking.join() === "IC1" && one.shiny === shinyBefore - 500, JSON.stringify(one));
  for (let i = 0; i < 4; i++) await call("buy", [["monster", "IC1"]]);
  await g(() => window.__classByName("BUILDINGS")._mc.SwitchB(4, 5, 0));
  await page.waitForTimeout(800);
  const five = await state();
  const buyButton = await g(() => { const card = window.__classByName("BUILDINGS")._mc._thumbnailsMC.getChildByName("ioPetCard_IC1"); const b = card.getChildByName("ioPetBuy"); return { text: window.__texts(b).join(), alpha: b.alpha, mouse: b.mouseEnabled }; });
  check("…five Spurtz pets, all five out; the card's Buy says you have 5 and is off", five.pets.length === 5 && five.walking.length === 5 && buyButton.alpha < 1 && !buyButton.mouse && /You have 5/.test(buyButton.text), JSON.stringify({ five, buyButton }));
  await goPage(1);
  await clickIn("ioPetCard_IC20", "ioPetBuy");
  await yes();
  const six = await state();
  const msg = await g(() => { const L = window.__game.GLOBAL._layerTop; for (let i = L.numChildren - 1; i >= 0; i--) { const c = L.getChildAt(i); const t = window.__texts(c).join(" "); if (/in storage/.test(t)) return t; } return null; });
  check("…a sixth pet goes to storage (five are out), and says so", six.pets.length === 6 && six.pets.filter((p) => /:1$/.test(p)).length === 5 && /:IC20:0$/.test(six.pets[5]) && six.walking.length === 5 && six.shiny === shinyBefore - 3000 && /in storage/.test(msg || ""), JSON.stringify({ six, msg }));
  await hideMessages();
  const db = sql(`SELECT string_agg(monster || ':' || (CASE WHEN "out" THEN 1 ELSE 0 END), ',' ORDER BY id) FROM bym.pet WHERE user_id = ${userid}`);
  check("…kept on the server", db === "IC1:1,IC1:1,IC1:1,IC1:1,IC1:1,IC20:0", db);

  // ---- the server's own checks
  const storedId = await g((P) => window.__classByName(P).pets.find((p) => !p[2])[0], P);
  const direct = {
    sixthOut: (await call("place", [["id", storedId], ["out", 1]])).error,
    sixthKind: (await call("buy", [["monster", "IC1"]])).error,
    champion: (await call("buy", [["monster", "IC9"]])).error,
    event: (await call("buy", [["monster", "IC26"]])).error,
    notMine: (await call("place", [["id", 999999], ["out", 0]])).error,
    badName: (await call("name", [["id", storedId], ["name", "<b>Bob</b>"]])).error,
    longName: (await call("name", [["id", storedId], ["name", "A name far too long for a pet"]])).error,
  };
  check("…the server refuses a sixth out, a sixth of one monster, a champion, an event monster, someone else's pet and bad names", /Only 5 pets/.test(direct.sixthOut) && /5 of these already/.test(direct.sixthKind) && /can't be a pet/.test(direct.champion) && /Win Hell Freezes Over/.test(direct.event) && /isn't yours/.test(direct.notMine) && /only have letters/.test(direct.badName) && /at most 16/.test(direct.longName), JSON.stringify(direct));
  check("…and nothing was paid for those", Number(sql(`SELECT credits FROM bym.save WHERE userid = ${userid} AND type = 'main'`)) === shinyBefore - 3000);

  // ---- names: the Name window, shown over the pet in the yard
  await goPage(0);
  await clickIn("ioPetCard_IC1", "ioPetName");
  const win = await g(() => { const L = window.__game.GLOBAL._layerTop; const box = L.getChildByName("ioPetNames"); if (!box) return null; const f0 = box.getChildByName("ioPetNameField0"); f0.text = "Sparky"; const f1 = box.getChildByName("ioPetNameField1"); f1.text = "Mr. Flames"; return { fields: box.numChildren, text: window.__texts(box).join("|") }; });
  check("…Name opens a box for each of the five Spurtz pets", win && /Name your Spurtz pets/.test(win.text) && /5 \(out\)/.test(win.text), JSON.stringify(win));
  await page.screenshot({ path: `${shots}/pets-names.png` });
  await g(() => { const box = window.__game.GLOBAL._layerTop.getChildByName("ioPetNames"); box.getChildByName("ioPetNamesSave").dispatchEvent(new (window.__classByName("flash.events::MouseEvent"))("click")); });
  await page.waitForTimeout(2500);
  const named = await g((P) => ({ box: !!window.__game.GLOBAL._layerTop.getChildByName("ioPetNames"), names: window.__classByName(P).walking.map((w) => w.petName).filter(Boolean).sort(), plates: window.__classByName(P).walking.filter((w) => w._nameRaster || w._nameField).length }), P);
  const dbNames = sql(`SELECT string_agg(name, ',' ORDER BY name) FROM bym.pet WHERE user_id = ${userid} AND name IS NOT NULL`);
  check("…Save names them (kept on the server) and their names show over them in the yard", !named.box && named.names.join() === "Mr. Flames,Sparky" && named.plates === 2 && dbNames === "Mr. Flames,Sparky", JSON.stringify({ named, dbNames }));
  const unnamed = await call("name", [["id", await g((P) => window.__classByName(P).pets.find((p) => p[3] === "Mr. Flames")[0], P)], ["name", ""]]);
  check("…an empty name takes it away", unnamed.error === 0 && sql(`SELECT count(*) FROM bym.pet WHERE user_id = ${userid} AND name IS NOT NULL`) === "1", JSON.stringify(unnamed.error));

  // ---- Store and Out
  await clickIn("ioPetCard_IC1", "ioPetStore");
  await yes();
  const stored = await state();
  check("…Store puts a Spurtz away (it leaves the yard)", stored.pets.filter((p) => /:1$/.test(p)).length === 4 && stored.walking.length === 4, JSON.stringify(stored));
  await goPage(1);
  await clickIn("ioPetCard_IC20", "ioPetOut");
  await page.waitForTimeout(1500);
  const outAgain = await state();
  check("…Out brings the stored Emberghoul into the yard", outAgain.walking.length === 5 && outAgain.walking.includes("IC20"), JSON.stringify(outAgain));
  await g(() => window.__classByName("BUILDINGS").Hide());
  await page.waitForTimeout(500);

  // ---- wandering: they move, stay in the yard and off the buildings
  const track = await g(async () => {
    const P = window.__classByName("com.monsters.pets::IoPets");
    const seen = [];
    for (let i = 0; i < 40; i++) {
      for (const w of P.walking) seen.push([w.petId, Math.round(w.gx), Math.round(w.gy), P.free(w.gx, w.gy) ? 1 : 0]);
      await new Promise((r) => setTimeout(r, 400));
    }
    return seen;
  });
  const moved = new Set(track.map((t) => t[0] + "@" + t[1] + "," + t[2])).size;
  // (a wart can grow where a pet rests in a Wart Bloom: it moves off within a second or so)
  const bad = track.filter((t) => !t[3]);
  check("…the pets wander (they move about), inside the yard and on no building (a moment at most)", moved > 10 && bad.length <= Math.max(2, track.length * 0.02), JSON.stringify({ moved, samples: track.length, bad: bad.slice(0, 5) }));
  await g((P) => { const w = window.__classByName(P).walking.find((w) => w.petName); try { window.__classByName("MAP").FocusTo(w.x, w.y, 0.2); } catch (e) {} }, P);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/pets-yard.png` });
  const reload = await g(async () => {
    window.__game.BASE.LoadBase(null, 0, 0, window.__game.GLOBAL.e_BASE_MODE.BUILD, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD);
    await new Promise((r) => setTimeout(r, 9000));
    const P = window.__classByName("com.monsters.pets::IoPets");
    return { n: P.walking.length, names: P.walking.map((w) => w.petName).filter(Boolean).join(), max: P.maxOut, perKind: P.perKind };
  });
  check("…and come back out, named, when the yard loads again (the limits from the server: 5 out, 5 a kind)", reload.n === 5 && reload.names === "Sparky" && reload.max === 5 && reload.perKind === 5, JSON.stringify(reload));

  // ---- Hell Freezes Over won: its monsters can be pets
  const hfoBefore = sql(`SELECT coalesce(hfo::text, '') FROM bym."user" WHERE userid = ${userid}`);
  sql(`UPDATE bym."user" SET hfo = '{"t0": 1, "day": 4, "done": 1}'::jsonb WHERE userid = ${userid}`);
  const listed = await call("list", [["x", 1]]);
  sql(hfoBefore ? `UPDATE bym."user" SET hfo = '${hfoBefore.replace(/'/g, "''")}'::jsonb WHERE userid = ${userid}` : `UPDATE bym."user" SET hfo = NULL WHERE userid = ${userid}`);
  check("once Hell Freezes Over is won, its six monsters can be pets too", listed.monsters && ["IC26", "IC27", "IC28", "IC29", "IC30", "IC31"].every((m) => listed.monsters.includes(m)) && listed.monsters.length === 18, JSON.stringify(listed.monsters));
  await page.close();

  // ---- another player sees them (an attack's view of the yard)
  if (process.env.EMAIL2) {
    const other = await open(process.env.EMAIL2);
    const baseid = sql(`SELECT baseid FROM bym.save WHERE userid = ${userid} AND type = 'main'`);
    const seen = await other.g(async (baseid) => {
      const G = window.__game;
      G.BASE.LoadBase(null, 0, baseid, G.GLOBAL.e_BASE_MODE.VIEW, false, window.__classByName("com.monsters.enums::EnumYardType").MAIN_YARD);
      for (let i = 0; i < 60 && (G.BASE._loading || String(G.BASE._loadedBaseID) !== String(baseid)); i++) await new Promise((r) => setTimeout(r, 500));
      await new Promise((r) => setTimeout(r, 4000));
      const P = window.__classByName("com.monsters.pets::IoPets");
      return { mode: G.GLOBAL.mode, walking: P.walking.length, names: P.walking.map((w) => w.petName).filter(Boolean).join(), tab: P.pets.length };
    }, baseid);
    check("another player viewing the yard sees its pets out with their names (not its stored ones), and can't manage them", seen.walking === 5 && seen.names === "Sparky" && seen.tab === 0, JSON.stringify(seen));
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}
