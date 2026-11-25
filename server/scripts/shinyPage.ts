/**
 * Writes server/public/docs/shiny.html (QoL #645, served at /shiny): how players earn Shiny and what it costs, every
 * number read from the server's settings, so the page never says something the game doesn't do.
 *
 *   bun server/scripts/shinyPage.ts        (from the project root; or `bun scripts/shinyPage.ts` from server/)
 *
 * publish-web.cmd / publish-web.sh run it after publishing the game. Run it yourself after changing a price or a
 * Shiny reward in InfernoOnlyConfig.ts (with Docker, before `docker compose up --build`: public/docs is in the image).
 *
 * Where the numbers come from:
 *  - InfernoOnlyConfig.ts: `prices`, `dailyLogin`, `referral`, `workerSacrificeShiny`, `gauntlet`, `startingShiny`
 *  - storeItems.ts: how long protection and the 24-hour power-ups last, the animated decorations' prices
 *  - questBook.ts: the daily quests' Shiny; purchaseKeys.ts: golden warts; CasinoConfig.ts: Moloch's Favor
 *
 * The page is plain HTML with the style of the other pages in public/docs (faq.html, schedule.html).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { infernoOnlyConfig } from "../src/config/InfernoOnlyConfig.js";
import { casinoConfig } from "../src/config/CasinoConfig.js";
import { storeItems } from "../src/game-data/store/storeItems.js";
import { mushroomCredits } from "../src/game-data/store/purchaseKeys.js";
import { DAILY_BONUS, DAILY_COUNT, DAILY_POOL } from "../src/services/quests/questBook.js";

const OUT = fileURLToPath(new URL("../public/docs/shiny.html", import.meta.url));

const cfg = infernoOnlyConfig;
const p = cfg.prices;

/** A row of a table: what, how much Shiny, and a line under it (optional). */
type Row = { what: string; shiny: string; note?: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });
const list = (xs: number[]) => xs.map(n).join(", ");
/** 3 and 8 -> "3 or 8"; 1, 2 and 3 -> "1, 2 or 3". */
const either = (xs: number[]) => (xs.length < 2 ? list(xs) : `${list(xs.slice(0, -1))} or ${n(xs[xs.length - 1])}`);
const unique = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

/** 86400 -> "24 hours", 604800 -> "7 days". */
const howLong = (seconds: number) => {
  const days = seconds / 86_400;
  if (Number.isInteger(days) && days > 1) return `${days} days`;
  const hours = seconds / 3_600;
  return `${n(hours)} hour${hours === 1 ? "" : "s"}`;
};

/** The first `count` multiples of `every` that are not multiples of `except` (the Daily Reward's bigger days). */
const daysOf = (every: number, except: number, count = 3) => {
  const out: number[] = [];
  for (let day = every; out.length < count && day <= every * 1_000; day += every) if (except <= 0 || day % except !== 0) out.push(day);
  return out;
};

// ---------------------------------------------------------------------------------------------------------------
// Shared with faq.html and schedule.html (written by hand: keep the three the same)
// ---------------------------------------------------------------------------------------------------------------

const footer = (current: "faq" | "shiny" | "schedule") => {
  const links: [string, string, string][] = [
    ["faq", "/faq", "FAQ"],
    ["shiny", "/shiny", "Shiny"],
    ["schedule", "/schedule", "When things happen"],
    ["", "/guide", "Player guide"],
    ["", "/rules", "Rules"],
    ["", "/", "Play"],
  ];
  return `    <footer>
      <nav aria-label="Help pages">
${links.map(([id, href, label]) => `        <a href="${href}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join("\n")}
      </nav>
      <p>Inferno Map Room 2, a Backyard Monsters Refitted server.</p>
    </footer>`;
};

const STYLE = `    @font-face { font-family: "Groboldov"; src: url("/web/fonts/groboldov.woff") format("woff"); font-display: swap; }
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body { margin: 0; min-height: 100vh; color: #f2dcc8; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(ellipse at 50% -10%, rgba(255, 90, 20, .24), transparent 65%), #0d0403; }
    .page { max-width: 760px; margin: 0 auto; padding: 20px 16px 40px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; }
    .top .home { font: 400 17px "Groboldov", Impact, sans-serif; color: #ffd8b0; text-decoration: none; text-shadow: 0 2px 0 #2d0602; }
    h1 { margin: 22px 0 10px; font: 400 clamp(28px, 6vw, 42px)/1.1 "Groboldov", Impact, sans-serif; letter-spacing: .3px;
      background: linear-gradient(#ffe9a0, #ff9a3a 55%, #e0401a); -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 2px 0 #2d0602); }
    h2 { margin: 30px 0 10px; font: 400 21px/1.2 "Groboldov", Impact, sans-serif; color: #ffb36b; text-shadow: 0 2px 0 #2d0602; }
    h3 { margin: 0 0 6px; font-size: 17px; line-height: 1.35; color: #ffd8b0; }
    p { margin: 0 0 12px; }
    a { color: #ffc27a; }
    a:hover { color: #ffe9a0; }
    .lead { color: #e8c9ad; }
    .note { font-size: 14px; color: #c9a98f; }
    .card { background: rgba(40, 8, 4, .72); border: 1px solid #6a2410; border-radius: 10px; padding: 14px 16px; margin: 0 0 12px; }
    .card p:last-child { margin-bottom: 0; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 0 0 12px; background: rgba(40, 8, 4, .72);
      border: 1px solid #6a2410; border-radius: 10px; overflow: hidden; }
    th, td { text-align: left; vertical-align: top; padding: 9px 12px; border-top: 1px solid rgba(106, 36, 16, .7); }
    thead th { border-top: 0; background: rgba(106, 36, 16, .4); color: #ffd8b0; font-weight: 600; font-size: 14px; }
    .num { text-align: right; white-space: nowrap; }
    td.num { color: #ffe9a0; font-weight: 600; }
    .sub { display: block; margin-top: 2px; font-size: 14px; color: #c9a98f; }
    footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #6a2410; font-size: 14px; color: #c9a98f; }
    footer nav { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 8px; }
    footer a[aria-current] { color: #f2dcc8; font-weight: 600; text-decoration: none; }
    @media (max-width: 480px) { th, td { padding: 8px 9px; } .card { padding: 12px 13px; } }`;

// ---------------------------------------------------------------------------------------------------------------
// Earning
// ---------------------------------------------------------------------------------------------------------------

const earn: Row[] = [];

if (cfg.startingShiny.max > 0) {
  const { min, max } = cfg.startingShiny;
  earn.push({ what: "A new account starts with", shiny: min === max ? n(min) : `${n(min)} to ${n(max)}` });
}

const daily = cfg.dailyLogin;
if (daily.shiny > 0) {
  earn.push({
    what: "Daily Reward, most days",
    shiny: n(daily.shiny),
    note: "Collected once a day from the popup on your main yard. A new day starts at midnight UTC.",
  });
  if (daily.weekDays > 0 && daily.weekShiny > 0) {
    earn.push({ what: `Daily Reward, day ${list(daysOf(daily.weekDays, daily.streakDays))}... of a streak`, shiny: n(daily.weekShiny) });
  }
  if (daily.streakDays > 0 && daily.streakShiny > 0) {
    earn.push({
      what: `Daily Reward, day ${list(daysOf(daily.streakDays, 0))}... of a streak`,
      shiny: n(daily.streakShiny),
      note: "The streak counts on for as long as you collect every day. Missing a day starts it again at day 1.",
    });
  }
}

const questShiny = unique(DAILY_POOL.map((q) => q.shiny));
if (questShiny.some((x) => x > 0)) {
  earn.push({
    what: `Each daily quest (${DAILY_COUNT} a day, in the Quest Book)`,
    shiny: either(questShiny),
    note: "New daily quests come at midnight UTC. One finished but not collected can still be collected the next day.",
  });
}
if (DAILY_BONUS.shiny > 0) earn.push({ what: `Collecting all ${DAILY_COUNT} of a day's daily quests (bonus)`, shiny: n(DAILY_BONUS.shiny) });

earn.push({ what: "Many other Quest Book quests, and the chests for finishing a category", shiny: "shown on each" });

if (cfg.mushrooms) {
  earn.push({ what: "Picking a golden wart (warts grow in your main yard; some are golden)", shiny: either(unique(Object.values(mushroomCredits))) });
}

const g = cfg.gauntlet;
if (g.enabled && (g.stageShiny > 0 || g.finalShiny > 0)) {
  if (g.stageShiny > 0) earn.push({ what: `Moloch's Gauntlet: each of its ${g.stages} stages beaten`, shiny: n(g.stageShiny) });
  if (g.finalShiny > 0) earn.push({ what: "Moloch's Gauntlet: the last stage, on top", shiny: n(g.finalShiny) });
  earn[earn.length - 1].note =
    `Up to ${n(g.stages * g.stageShiny + g.finalShiny)} a month (it opens for the first ${g.days} days of each month). ` +
    `A stage's reward is lost for the month after ${g.attempts} attempts without beating it.`;
}

if (cfg.referral.shiny > 0) {
  earn.push({
    what: "Inviting a friend: each of you, once they register from your invite link",
    shiny: n(cfg.referral.shiny),
    note: "Nothing is paid between accounts made on the same IP address.",
  });
}

if (cfg.workerSacrificeShiny > 0) {
  earn.push({
    what: "Sacrificing an idle worker to Moloch (click the worker in your main yard)",
    shiny: n(cfg.workerSacrificeShiny),
    note: "Never your last worker. The worker is gone for good: it can't be hired back.",
  });
}

if (casinoConfig.enabled && casinoConfig.favor.enabled && casinoConfig.favor.bet > 0) {
  earn.push({
    what: "Moloch's Favor: a free Magma Slots spin once a day (UTC), once your Brimstone Pit has the Slots",
    shiny: `a ${n(casinoConfig.favor.bet)} Shiny spin`,
    note: "The Brimstone Pit's other games are played with your own Shiny against the house, and are set to pay back a little under 100% of what is bet.",
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------------------------------------------

const protection: Row[] = [
  { what: `Daily Protection (${howLong(storeItems.PRO1.du)})`, shiny: n(p.protection.day) },
  { what: `Weekly Protection (${howLong(storeItems.PRO2.du)})`, shiny: n(p.protection.threeDays) },
  {
    what: `Ultimate Protection (${howLong(storeItems.PRO3.du)})`,
    shiny: n(p.protection.week),
    note: "Bought protection adds to any you already have. It ends as soon as you attack anyone.",
  },
];

const steps = storeItems.BIP.c.length;
const yard: Row[] = [
  { what: `Improved Packing Skills, each of the ${steps} steps (more storage)`, shiny: n(p.packing), note: `All ${steps}: ${n(p.packing * steps)}.` },
  { what: `Housing Expansion (${howLong(storeItems.EXHI.du)})`, shiny: n(p.housingExpansion) },
  { what: `Tower Overdrive (${howLong(storeItems.TODI.du)})`, shiny: n(p.towerOverdrive) },
  { what: "Repair all buildings now", shiny: n(p.repairAll) },
  ...p.topup.map((shiny, i) => ({ what: `Resource top-up: fill ${["10%", "50%", "100%"][i] ?? `level ${i + 1}`} of your storage`, shiny: n(shiny) })),
  { what: "Upgrade all walls: each wall from wood to stone", shiny: n(p.wallToStone) },
  {
    what: "Upgrade all walls: each wall from stone to iron",
    shiny: n(p.wallStoneToIron),
    note: `A wall still on wood pays both to reach iron: ${n(p.wallToStone + p.wallStoneToIron)}.`,
  },
];

const time: Row[] = [
  { what: `Anything with ${p.closeEnoughMinutes} minutes or less left ("Close enough")`, shiny: "free" },
  { what: "Reduce by 1 hour", shiny: n(p.reduce1h) },
  { what: "Reduce by 2 hours", shiny: n(p.reduce2h) },
  {
    what: "Finish now: the first hour left",
    shiny: n(p.finishNowFirstHour),
  },
  {
    what: "Finish now: each further hour left (part of an hour, part of the cost)",
    shiny: n(p.finishNowPerHour),
    note: "A building's build, upgrade, fortify or repair with less than an hour left costs less: the game shows how much.",
  },
];

const KIT_NAMES = ["Ember", "Brimstone", "Demon", "Damnation", "Underlord", "Apocalypse"];
const map: Row[] = [
  ...p.kits.map((shiny, i) => ({ what: `Outpost kit ${i + 1}${KIT_NAMES[i] ? ` (${KIT_NAMES[i]} Kit)` : ""}, bought outright`, shiny: n(shiny) })),
  { what: "Capturing an outpost with Shiny instead of resources", shiny: n(p.takeoverOutpost) },
  { what: "Moving your main yard onto one of your own outposts", shiny: n(p.moveOutpost) },
  {
    what: "Moving your main yard onto an alliance member's outpost (accepting their invite)",
    shiny: n(p.moveMainYard),
    note: "Both moves can be paid with resources instead. The Map Room's Relocate (a new place on the map) costs no Shiny: it empties your resources and lets your outposts go.",
  },
  { what: "Alliance power-ups, each hour bought", shiny: n(p.powerupHour) },
];

const decorations: Row[] = [];
for (let type = 157; type <= 169; type++) {
  const item = storeItems[`BUILDING${type}`];
  if (item && item.c.length) decorations.push({ what: item.t, shiny: n(item.c[0]) });
}

// ---------------------------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------------------------

const table = (rows: Row[], what = "What") =>
  `<table>
        <thead><tr><th scope="col">${what}</th><th scope="col" class="num">Shiny</th></tr></thead>
        <tbody>
${rows
  .map(
    (r) =>
      `          <tr><td>${esc(r.what)}${r.note ? `<span class="sub">${esc(r.note)}</span>` : ""}</td><td class="num">${esc(r.shiny)}</td></tr>`,
  )
  .join("\n")}
        </tbody>
      </table>`;

const updated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Shiny: how to earn it and what it costs - Inferno Map Room 2</title>
  <meta name="description" content="Every way to earn Shiny in Inferno Map Room 2, and what everything costs.">
  <meta name="theme-color" content="#1a0503">
  <meta name="color-scheme" content="dark">
  <!-- Made by server/scripts/shinyPage.ts from the server's settings: edit the script, not this file. -->
  <style>
${STYLE}
  </style>
</head>
<body>
  <div class="page">
    <header class="top">
      <a class="home" href="/">Inferno Map Room 2</a>
      <a href="/">Back to the game</a>
    </header>
    <main>
      <h1>Shiny: how to earn it and what it costs</h1>
      <p class="lead">Shiny can't be bought on this server: it is only earned in the game. Every number below is read from the server's own settings. Updated ${esc(updated)}.</p>

      <h2>Earning Shiny</h2>
      ${table(earn, "Where it comes from")}

      <h2>Damage protection</h2>
      ${table(protection)}

      <h2>Your yard</h2>
      ${table(yard)}

      <h2>Speeding things up</h2>
      ${table(time)}

      <h2>The map, outposts and alliances</h2>
      ${table(map)}
${
  decorations.length
    ? `
      <h2>Animated decorations</h2>
      <p>Bought when you place one from the build menu (Decorations, Animated).</p>
      ${table(decorations, "Decoration")}
`
    : ""
}
      <p class="note">Don't want to spend Shiny by accident? The page's settings (the gear at the top right of the game) have "Ask before spending Shiny".</p>
    </main>
${footer("shiny")}
  </div>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Wrote ${OUT}`);
