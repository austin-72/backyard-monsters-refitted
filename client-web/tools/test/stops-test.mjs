// Bug reports #15 #17 #18 #19: full screen without the browser API, a message window in full screen,
// back after a long time away, and a login replaced elsewhere. Phone emulation (iPhone Safari has no
// element full screen; the init script removes the API so Chromium behaves the same).
//   EMAIL=... PASSWORD=... node tools/test/stops-test.mjs ["iPhone 13 landscape"]
// Prints one line per check; every line must end in "ok".
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const deviceName = process.argv[2] || "iPhone 13 landscape";
const server = process.env.SERVER || "http://localhost:3001/";
const login = async () => {
  const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
  return (await res.json()).token;
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ ...devices[deviceName] });
await ctx.addInitScript(() => {
  for (const k of ["requestFullscreen", "webkitRequestFullscreen"]) { delete Element.prototype[k]; delete HTMLElement.prototype[k]; }
  Object.defineProperty(Document.prototype, "fullscreenEnabled", { get: () => false });
});
const page = await ctx.newPage();
const errors = [], reports = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => { if (r.url().includes("bugreport")) reports.push(decodeURIComponent((r.postData() || "").split("&").find((p) => p.startsWith("message=")) || "").slice(8, 120)); });
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);

const waitGame = async () => {
  await page.waitForFunction(() => window.__player && window.__game, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__game.GLOBAL._loadmode === "build", null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(4000);
};
// finds a display object on stage; returns its centre in page coordinates
const find = (src) => page.evaluate((src) => {
  const test = new Function("o", "g", "return " + src);
  let hit = null;
  const walk = (o) => { if (hit || !o.visible) return; if (test(o, window.__game)) { hit = o; return; } for (const c of o.$children ?? []) walk(c); };
  walk(window.__player.stage);
  if (!hit) return null;
  const r = hit.getBounds(window.__player.stage);
  return window.__player.stageToClient(r.x + r.width / 2, r.y + r.height / 2);
}, src);
const texts = () => page.evaluate(() => { const out = []; const T = window.__classByName("flash.text::TextField"); const walk = (o) => { if (!o.visible) return; if (o instanceof T) out.push(o.text); for (const c of o.$children ?? []) walk(c); }; walk(window.__player.stage); return out.join(" | "); });

await page.goto(`${server}?token=${await login()}&language=english`);
await waitGame();
const ok = await find(`o instanceof g.Button && o._txt && o._txt.text === "OK"`);
if (ok) { await page.touchscreen.tap(ok.x, ok.y); await page.waitForTimeout(800); }

// #15: the game's full-screen button, no full-screen API
const fsBtn = await find(`o instanceof g.buttonFullscreen`);
if (fsBtn) { await page.touchscreen.tap(fsBtn.x, fsBtn.y); await page.waitForTimeout(800); }
const tip = await page.evaluate(() => document.querySelector(".bw-rotate")?.textContent ?? "");
check("#15 full screen button found", !!fsBtn);
check("#15 no error, stage stays normal", errors.length === 0 && (await page.evaluate(() => window.__player.stage.displayState)) === "normal", errors.join("; "));
check("#15 tip shown", /Add to Home Screen/.test(tip), JSON.stringify(tip.slice(0, 60)));
await page.evaluate(() => document.querySelector(".bw-rotate button")?.click());

// #18: a message window while the stage is in full screen
const msgErr = await page.evaluate(() => {
  const stage = window.__player.stage;
  stage.$displayState = "fullScreen";
  try {
    const M = window.__classByName("com.monsters.mailbox::Message");
    const m = new M();
    window.__game.GLOBAL._layerTop.addChild(m);
    m.detectFS();
    const shown = m.contains(m.fsWarning);
    m.parent.removeChild(m);
    return shown ? "" : "warning not shown";
  } catch (e) { return String(e && e.message || e); } finally { stage.$displayState = "normal"; }
});
check("#18 Message.detectFS in full screen", msgErr === "", msgErr);

// #17: no frame for over 5 minutes (a locked phone)
const before = reports.length;
await page.evaluate(() => { window.__game.GLOBAL.lastTime -= 400000; });
await page.waitForTimeout(1500);
const away = await texts();
const shots = process.env.SHOTS || "/tmp";
await page.screenshot({ path: `${shots}/stops-away.png` });
check("#17 explained", /away from the game/.test(away), "");
check("#17 halted", await page.evaluate(() => window.__game.GLOBAL.isHalted));
await page.waitForTimeout(2500);
check("#17 no bug report", reports.length === before, reports.slice(before).join(" / "));
const reload = await find(`o instanceof g.popup_error`).then(() => find(`o.parent instanceof g.popup_error && o === o.parent.bAction`));
check("#17 Reload button", !!reload);
if (reload) await page.touchscreen.tap(reload.x, reload.y);
await page.waitForTimeout(1500);
await waitGame();
check("#17 Reload opens the yard again, still logged in", await page.evaluate(() => window.__game.GLOBAL._loadmode === "build" && !window.__game.GLOBAL.isHalted));

// #19: the account logs in somewhere else; the next poll gets 401
const before2 = reports.length;
await login();
await page.waitForFunction(() => window.__game.GLOBAL.isHalted, null, { timeout: 60000 }).catch(() => {});
const out = await texts();
await page.screenshot({ path: `${shots}/stops-logged-out.png` });
check("#19 explained", /logged out/.test(out), /Base\.Page/.test(out) ? "(Base.Page shown)" : "");
await page.waitForTimeout(2500);
check("#19 no bug report", reports.length === before2, reports.slice(before2).join(" / "));
const reload2 = await find(`o.parent instanceof g.popup_error && o === o.parent.bAction`);
if (reload2) await page.touchscreen.tap(reload2.x, reload2.y);
await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__player && window.__game, null, { timeout: 30000 });
await page.waitForTimeout(6000);
check("#19 Reload opens the login page", await page.evaluate(() => !window.__game.GLOBAL._loadmode && !!window.__game.LOGIN && !window.__game.GAME.sharedObj.data.token));
check("no page errors", errors.length === 0, errors.join("; "));
await page.screenshot({ path: process.env.OUT || "/tmp/stops.png" });
await browser.close();
