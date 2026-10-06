// Hell Freezes Over balance runs: the shared helpers (sim.mjs).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
export const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
export const server = process.env.SERVER || "http://localhost:3001/";
export const sql = (t) => execFileSync("psql", ["-h", process.env.PGHOST || "localhost", "-U", process.env.PGUSER || "postgres", "-d", process.env.PGDATABASE || "bymio", "-Atc", t], { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
export const login = async (email = process.env.EMAIL, password = process.env.PASSWORD) => {
  const r = await fetch(server + "api/v1.7.3-beta/player/getinfo", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `version=128&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}` });
  return (await r.json()).token;
};
export const openGame = async (browser, token, log = console.log) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => log("PAGEERROR " + e.message + " " + (e.stack || "").split("\n").slice(0, 4).join(" | ")));
  await page.goto(`${server}?token=${token}&language=english&shell=0`);
  await page.waitForFunction(() => window.__game && window.__game.GLOBAL._loadmode === "build" && !window.__game.BASE._loading && window.__game.BASE.buildings.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(3000);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { try { window.__game.POPUPS.Next(); } catch (e) {} }); await page.waitForTimeout(150); }
  return page;
};
