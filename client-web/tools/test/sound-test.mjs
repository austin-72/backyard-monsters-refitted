// Sound bugs: the embedded click sound loads, a sound that can't load does not use up the 32 channels,
// and music switched off stays silent when its loop starts again.
//   EMAIL=... PASSWORD=... node tools/test/sound-test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const server = process.env.SERVER || "http://localhost:3001/";
const res = await fetch(`${server}api/v1.7.3-beta/player/getinfo`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(process.env.EMAIL)}&password=${encodeURIComponent(process.env.PASSWORD)}` });
const { token } = await res.json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
await page.goto(`${server}?token=${token}&language=english&shell=0`);
await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build", null, { timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.click(857, 242);
await page.waitForTimeout(500);

const click = await page.evaluate(() => { const s = window.__game.SOUNDS._sounds.click1; return s.$buffer ? "loaded" : s.$failed ? "failed" : "loading"; });
check("embedded click sound loads", click === "loaded", click);

const free = await page.evaluate(async () => {
  const S = window.__classByName("flash.media::Sound"), R = window.__classByName("flash.net::URLRequest");
  const bad = new S(new R("nowhere/missing.mp3"));
  for (let i = 0; i < 40; i++) bad.play();          // while loading, then after the failure
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 40; i++) bad.play();
  const c = window.__game.SOUNDS._sounds.error1.play();
  const ok = !!c; if (c) c.stop();
  return ok;
});
check("sound effects still play after 80 plays of a missing sound", free);

const music = await page.evaluate(async () => {
  const G = window.__game, S = G.SOUNDS, E = window.__classByName("flash.events::Event");
  S.MuteUnmute(true, "music");
  for (let i = 0; i < 40 && !S._musicChannel; i++) await new Promise((r) => setTimeout(r, 100));
  const before = S._musicChannel ? S._musicChannel.soundTransform.volume : null;
  S._musicChannel?.dispatchEvent(new E(E.SOUND_COMPLETE));   // the song reached its end
  await new Promise((r) => setTimeout(r, 300));
  const after = S._musicChannel ? S._musicChannel.soundTransform.volume : null;
  S.MuteUnmute(false, "music");
  return { before, after };
});
check("switched-off music stays silent on its next loop", music.after === 0, JSON.stringify(music));
check("no page errors", errors.length === 0, errors.join("; "));
await browser.close();
