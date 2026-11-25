import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { postgres, redis } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { hellgateWavesIn, noteHellgateRun } from "../anticheat/requestChecks.js";
import { recordScore } from "../arcade/scores.js";
import { HellgateError, finishedBefore, keepFinished, tdBaseId } from "./hellgate.js";

/**
 * Inferno-only (10 October, the user's: "Build out Hellgate Defense 2 ... twice as much to it"): the sequel, a
 * cabinet of its own in the Devil's Arcade. It runs on Hellgate Defense's engine (the same "td" yard, base id 7e14 +
 * the user id; the game's com/monsters/td, with IoTd2 for what is new) and adds:
 *
 *  - four maps (MAPS): The Gate (Hellgate Defense's arena), Twin Gates (two ways in), Brimstone Ravine (a bigger
 *    arena with obsidian outcrops), Moloch's Crossroads (the Hall in the middle, monsters from all four corners).
 *    A map opens once wave 15 is reached on the one before it.
 *  - four difficulties (DIFFICULTIES); a map won (wave 40 cleared, the Hellgate Warden beaten) on one gives it
 *    that many skulls; Inferno opens with a win on Normal or harder.
 *  - the Daily Challenge: today's map and two modifiers (MUTATORS), Normal, no Hellforge perks; its own board.
 *  - the Hellforge: embers earned by every run buy perks for later runs (PERKS, three levels each).
 *  - twelve towers, four upgrade paths, spells, elite monsters, bosses with powers: all the game's (IoTd2).
 *
 * The run's settings live in Redis while it is open (RUN_KEY, td2/open writes them, base/load hands them to the
 * game as io_td.v2, td2/finish reads them); td2/finish records the run: the arcade boards (hellgate2: solo by
 * points, daily by waves), the player's profile in bym.td2_profile (embers, perks, each map's best and skulls).
 * Waves are checked against the run's time as Hellgate Defense's are.
 */

// ---------------------------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------------------------

/** The arena's corners: L (low X, high Y: the left, as drawn), R (high X, low Y: the right), T (top), B (bottom). */
const CORNER: Record<string, [number, number]> = { L: [-1, 1], R: [1, -1], T: [-1, -1], B: [1, 1] };

const WALL = 20;
const GAP = 80;
const HALL = 130;
const BORDER_LEVEL = 3;
const PLENTY = 999_999_999;

interface MapDef {
  id: string;
  name: string;
  blurb: string;
  half: number;
  /** The corners the monsters come in at. */
  entries: string[];
  /** The corner the Hall stands past, or "C": the Hall in the middle of the arena. */
  exit: string;
  walls: number;
  /** Outcrops of obsidian (walls of the arena's own, 20 x 20 each): their top left corners. */
  rocks: [number, number][];
  /** Opens once this map's best reaches this wave. */
  unlock: { map: string; wave: number } | null;
}

/** A line of rocks from (x0, y0) to (x1, y1), in 20-unit steps (one axis at a time). */
const line = (x0: number, y0: number, x1: number, y1: number): [number, number][] => {
  const out: [number, number][] = [];
  const sx = Math.sign(x1 - x0);
  const sy = Math.sign(y1 - y0);
  for (let x = x0, y = y0; ; x += sx * WALL, y += sy * WALL) {
    out.push([x, y]);
    if ((sx === 0 || x === x1) && (sy === 0 || y === y1)) break;
  }
  return out;
};
const block = (x: number, y: number, n = 2): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([x + i * WALL, y + j * WALL]);
  return out;
};

export const MAPS: MapDef[] = [
  { id: "gate", name: "The Gate", blurb: "The classic arena: in on the left, the Hall on the right.", half: 320, entries: ["L"], exit: "R", walls: 50, rocks: [], unlock: null },
  { id: "twin", name: "Twin Gates", blurb: "Two ways in, top and bottom, and one Hall on the left. Split your defences, or make them meet.", half: 320, entries: ["T", "B"], exit: "L", walls: 70, rocks: [], unlock: { map: "gate", wave: 15 } },
  {
    id: "ravine",
    name: "Brimstone Ravine",
    blurb: "A bigger arena broken by obsidian ridges. Use the rock: it walls for free.",
    half: 360,
    entries: ["L"],
    exit: "R",
    walls: 60,
    rocks: [
      // ridges from the edges, with gaps between them, and boulders
      ...line(-200, -360, -200, -140),
      ...line(40, 340, 40, 120),
      ...line(240, -360, 240, -100),
      ...line(-360, 60, -220, 60),
      ...line(220, 140, 340, 140),
      ...block(-80, -20),
      ...block(120, 20),
      ...block(-260, 200),
      ...block(160, 240),
      ...block(-40, -240),
    ],
    unlock: { map: "twin", wave: 15 },
  },
  { id: "cross", name: "Moloch's Crossroads", blurb: "The Hall stands in the middle. They come from all four corners at once.", half: 360, entries: ["L", "R", "T", "B"], exit: "C", walls: 90, rocks: [], unlock: { map: "ravine", wave: 15 } },
];

const mapOf = (id: unknown) => MAPS.find((m) => m.id === String(id ?? ""));

/** The Hall's top left: past the exit corner, or in the middle. */
const hallAt = (m: MapDef) => {
  if (m.exit === "C") return { X: -HALL / 2, Y: -HALL / 2 };
  const [ex, ey] = CORNER[m.exit];
  return { X: ex > 0 ? m.half + 50 : -m.half - 50 - HALL, Y: ey > 0 ? m.half + 50 : -m.half - 50 - HALL };
};

/** A border wall at (X, Y) is in an opening (a way in, or the way out past which the Hall stands). */
const inOpening = (m: MapDef, X: number, Y: number) => {
  const H = m.half;
  const corners = m.exit === "C" ? m.entries : [...m.entries, m.exit];
  for (const c of corners) {
    const [sx, sy] = CORNER[c];
    const sideX = sx < 0 ? -H - WALL : H;
    const sideY = sy < 0 ? -H - WALL : H;
    // along the side running in Y (x = sideX), near the corner's Y end
    if (X === sideX && (sy > 0 ? Y >= H + WALL - GAP : Y <= -H - WALL + GAP - WALL)) return true;
    // along the side running in X (y = sideY), near the corner's X end
    if (Y === sideY && (sx < 0 ? X <= -H - WALL + GAP - WALL : X >= H + WALL - GAP)) return true;
  }
  return false;
};

/** The map's buildings: the Hall (id 0), its border walls, its outcrops. */
export const arena2Buildings = (m: MapDef) => {
  const data: Record<string, { id: number; t: number; X: number; Y: number; l: number }> = {};
  const hall = hallAt(m);
  data["0"] = { id: 0, t: 14, X: hall.X, Y: hall.Y, l: 6 };
  let id = 1;
  const add = (X: number, Y: number) => {
    data[String(id)] = { id, t: 17, X, Y, l: BORDER_LEVEL };
    id++;
  };
  const H = m.half;
  for (let Y = -H - WALL; Y <= H; Y += WALL) {
    if (!inOpening(m, -H - WALL, Y)) add(-H - WALL, Y);
    if (!inOpening(m, H, Y)) add(H, Y);
  }
  for (let X = -H; X < H; X += WALL) {
    if (!inOpening(m, X, -H - WALL)) add(X, -H - WALL);
    if (!inOpening(m, X, H)) add(X, H);
  }
  const seen = new Set<string>();
  for (const [X, Y] of m.rocks) {
    const k = `${X},${Y}`;
    if (seen.has(k) || X < -H || Y < -H || X >= H || Y >= H) continue;
    seen.add(k);
    add(X, Y);
  }
  return data;
};

/** What the game is told about the map (IoTd paths the monsters with it). */
export const arena2Info = (m: MapDef) => {
  const H = m.half;
  const hall = hallAt(m);
  const at = (c: string, d: number) => [CORNER[c][0] * d, CORNER[c][1] * d];
  return {
    v: 2,
    map: m.id,
    half: H,
    wall: WALL,
    gap: GAP,
    hall: [hall.X, hall.Y, HALL],
    hallInside: m.exit === "C",
    // where each way in's monsters come up (outside its corner), and the corner cell they enter by
    spawns: m.entries.map((c) => at(c, H + 115)),
    entries: m.entries.map((c) => at(c, H + WALL - 5)),
    // the corner cell they leave by (none when the Hall is in the middle: they walk up to it)
    exit: m.exit === "C" ? null : at(m.exit, H + WALL - 5),
    beyond: m.exit === "C" ? null : at(m.exit, H + WALL + 12),
    spawn: at(m.entries[0], H + 115),
    walls: m.walls,
  };
};

// ---------------------------------------------------------------------------------------------
// Difficulties, perks, the Daily Challenge
// ---------------------------------------------------------------------------------------------

export const DIFFICULTIES = [
  { id: "easy", name: "Easy", lives: 40, gold: 1100, hp: 0.75, goldMult: 1.1, weight: 1, eliteFrom: 8 },
  { id: "normal", name: "Normal", lives: 20, gold: 800, hp: 1, goldMult: 1, weight: 1.5, eliteFrom: 5 },
  { id: "hard", name: "Hard", lives: 10, gold: 700, hp: 1.3, goldMult: 0.95, weight: 2, eliteFrom: 3 },
  { id: "inferno", name: "Inferno", lives: 5, gold: 650, hp: 1.65, goldMult: 0.9, weight: 3, eliteFrom: 1 },
];

const diffIndex = (id: unknown) => DIFFICULTIES.findIndex((d) => d.id === String(id ?? ""));

export const PERKS = [
  { id: "warchest", name: "War Chest", text: "+100 starting gold a level." },
  { id: "masonry", name: "Master Masons", text: "+10 starting walls a level." },
  { id: "bastion", name: "Bastion", text: "+2 lives a level." },
  { id: "bounty", name: "Bounty Hunter", text: "+6% gold for each kill a level." },
  { id: "arcana", name: "Arcana", text: "Spells recharge 10% faster a level." },
  { id: "engineers", name: "Hell's Engineers", text: "Towers cost 5% less a level." },
  { id: "veterans", name: "Veterans", text: "Towers rank up 30% faster a level." },
  { id: "interest", name: "Moloch's Interest", text: "Each wave cleared pays 2% of your gold a level (150 at most)." },
];
export const PERK_COST = [40, 100, 220];
export const PERK_MAX = 3;

/** The Daily Challenge's modifiers. */
export const MUTATORS = [
  { id: "swarming", name: "Swarming", text: "Half as many monsters again, each weaker." },
  { id: "ironhide", name: "Ironhide", text: "Every monster is Armored." },
  { id: "quicksilver", name: "Quicksilver", text: "Every monster is Swift." },
  { id: "famine", name: "Famine", text: "Kills pay 40% less; cleared waves pay 50% more." },
  { id: "bloodmoon", name: "Blood Moon", text: "A boss every 5th wave." },
  { id: "masons", name: "Masons' Strike", text: "30 more walls to start, none from waves." },
  { id: "spellbound", name: "Spellbound", text: "Spells recharge twice as fast." },
  { id: "brittle", name: "Brittle Hall", text: "Half the lives." },
];

const today = () => new Date().toISOString().slice(0, 10);

const hashOf = (text: string) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
};

/** Today's challenge (UTC): a map, two modifiers, and the seed the waves' elites are picked with. */
export const dailyOf = (day = today()) => {
  const h = hashOf(`hellgate2:${day}`);
  const map = MAPS[h % MAPS.length];
  const a = (h >>> 3) % MUTATORS.length;
  let b = (h >>> 9) % MUTATORS.length;
  if (b === a) b = (b + 1 + ((h >>> 15) % (MUTATORS.length - 1))) % MUTATORS.length;
  if (b === a) b = (a + 1) % MUTATORS.length;
  return { day, map: map.id, mapName: map.name, difficulty: "normal", mutators: [MUTATORS[a].id, MUTATORS[b].id], seed: (h % 2_147_483_000) + 1 };
};

// ---------------------------------------------------------------------------------------------
// The player's profile
// ---------------------------------------------------------------------------------------------

interface MapRecord {
  best: number;
  skulls: number;
  points: number;
}
interface Profile {
  embers: number;
  perks: Record<string, number>;
  maps: Record<string, MapRecord>;
  runs: number;
  victories: number;
  /** (QoL #498) when the last free respec was made (unix seconds; 0: never), kept in the perks column as `_respec`. */
  respecAt: number;
}

const profileOf = async (userid: number): Promise<Profile> => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT embers, perks, maps, runs, victories FROM bym.td2_profile WHERE user_id = ?`, [userid], "all")) as Record<string, unknown>[];
  const r = rows[0];
  const perks: Record<string, number> = {};
  const maps: Record<string, MapRecord> = {};
  const rp = (r?.perks ?? {}) as Record<string, unknown>;
  for (const p of PERKS) {
    const v = Math.floor(Number(rp[p.id] ?? 0));
    if (v > 0) perks[p.id] = Math.min(PERK_MAX, v);
  }
  const rm = (r?.maps ?? {}) as Record<string, Partial<MapRecord>>;
  for (const m of MAPS) {
    const x = rm[m.id];
    maps[m.id] = { best: Math.max(0, Math.floor(Number(x?.best ?? 0))), skulls: Math.max(0, Math.min(4, Math.floor(Number(x?.skulls ?? 0)))), points: Math.max(0, Math.floor(Number(x?.points ?? 0))) };
  }
  const respecAt = Math.max(0, Math.floor(Number(rp._respec ?? 0)) || 0);
  return { embers: Math.max(0, Math.floor(Number(r?.embers ?? 0))), perks, maps, runs: Math.floor(Number(r?.runs ?? 0)), victories: Math.floor(Number(r?.victories ?? 0)), respecAt };
};

/**
 * (18 October, SUSPECTED-BUGS.md: "Hellgate 2 profile writes overwrite each other") A finished run's gains, added to
 * the profile as they are now (embers, runs, victories) and its map's record set by itself: each writer read the
 * profile, changed it and wrote the whole row back, so a perk bought or a respec made at the same moment as a run's
 * finish lost one of them (or put the last respec's time back).
 */
const addRunToProfile = async (userid: number, gain: { embers: number; victory: boolean; map: string | null; rec: MapRecord | null }) => {
  const maps = gain.map && gain.rec ? { [gain.map]: gain.rec } : {};
  await postgres.em.getConnection().execute(
    `INSERT INTO bym.td2_profile (user_id, embers, perks, maps, runs, victories, updated_at)
       VALUES (?, ?, '{}'::jsonb, ?::jsonb, 1, ?, now())
     ON CONFLICT (user_id) DO UPDATE SET embers = bym.td2_profile.embers + EXCLUDED.embers,
       maps = bym.td2_profile.maps || EXCLUDED.maps, runs = bym.td2_profile.runs + 1,
       victories = bym.td2_profile.victories + EXCLUDED.victories, updated_at = now()`,
    [userid, Math.max(0, Math.floor(gain.embers)), JSON.stringify(maps), gain.victory ? 1 : 0],
  );
};

const unlocked = (p: Profile, m: MapDef) => !m.unlock || (p.maps[m.unlock.map]?.best ?? 0) >= m.unlock.wave;

/** Inferno opens with a win on Normal or harder, anywhere. */
const infernoOpen = (p: Profile) => Object.values(p.maps).some((r) => r.skulls >= 2);

const dailyBest = async (userid: number, day: string) => {
  const rows = (await postgres.em
    .getConnection()
    .execute(`SELECT best, best2, runs FROM bym.arcade_score WHERE user_id = ? AND game = 'hellgate2' AND mode = 'daily' AND period = ?`, [userid, day], "all")) as Record<string, unknown>[];
  return rows[0] ? { waves: Number(rows[0].best), kills: Number(rows[0].best2), runs: Number(rows[0].runs) } : { waves: 0, kills: 0, runs: 0 };
};

/** Everything the game's start screen shows. */
export const status2 = async (user: User) => {
  const p = await profileOf(user.userid);
  const daily = dailyOf();
  return {
    profile: p,
    maps: MAPS.map((m) => ({ id: m.id, name: m.name, blurb: m.blurb, entries: m.entries, exit: m.exit, half: m.half, rocks: m.rocks.length, rockList: m.rocks, unlocked: unlocked(p, m), unlock: m.unlock, record: p.maps[m.id] })),
    difficulties: DIFFICULTIES.map((d, i) => ({ ...d, unlocked: d.id !== "inferno" || infernoOpen(p), skulls: i + 1 })),
    perks: PERKS.map((x) => ({ ...x, level: p.perks[x.id] ?? 0, max: PERK_MAX, next: (p.perks[x.id] ?? 0) < PERK_MAX ? PERK_COST[p.perks[x.id] ?? 0] : 0 })),
    mutators: MUTATORS,
    daily: { ...daily, best: await dailyBest(user.userid, daily.day) },
    // (QoL #498: the weekly free respec)
    respec: respecOf(p),
  };
};

/** A Hellforge perk's next level, paid in embers. */
export const buyPerk = async (user: User, id: unknown) => {
  const perk = PERKS.find((x) => x.id === String(id ?? ""));
  if (!perk) throw new HellgateError("There is no such perk.");
  const p = await profileOf(user.userid);
  const level = p.perks[perk.id] ?? 0;
  if (level >= PERK_MAX) throw new HellgateError(`${perk.name} is already at its best.`);
  const cost = PERK_COST[level];
  if (p.embers < cost) throw new HellgateError(`${perk.name} costs ${cost} embers: you have ${p.embers}.`);
  // (18 October: the embers taken and the level raised as they are now, and only if the level is still the one read:
  // a whole-row write lost a run's embers or a respec finished at the same moment)
  const rows = (await postgres.em.getConnection().execute(
    `UPDATE bym.td2_profile SET embers = embers - ?, perks = jsonb_set(perks, ARRAY[?::text], to_jsonb(?::int)), updated_at = now()
      WHERE user_id = ? AND embers >= ? AND COALESCE((perks->>?)::int, 0) = ? RETURNING user_id`,
    [cost, perk.id, level + 1, user.userid, cost, perk.id, level],
    "all",
  )) as unknown[];
  if (!rows.length) throw new HellgateError(`${perk.name} was changed at the same moment: try again.`);
  return status2(user);
};

// (QoL #498, 15 October) The Hellforge's free respec: once in RESPEC_DAYS every perk is taken back and the embers
// spent on them given back (each level at the price it was bought at, PERK_COST). Checked here: the last one's time
// is kept with the perks (`_respec`), and written only if it is still the one read, so two sent at once give once.
export const RESPEC_DAYS = 7;

/** The embers the perks cost. */
const perkSpend = (p: Profile) => {
  let n = 0;
  for (const level of Object.values(p.perks)) for (let i = 0; i < Math.min(PERK_MAX, level); i++) n += PERK_COST[i];
  return n;
};

/** What the Hellforge shows: {free (one can be made now), next (unix seconds it can be, 0: now), refund}. */
const respecOf = (p: Profile, now = getCurrentDateTime()) => {
  const next = p.respecAt > 0 ? p.respecAt + RESPEC_DAYS * 24 * 60 * 60 : 0;
  return { free: next <= now, next: next > now ? next : 0, refund: perkSpend(p), days: RESPEC_DAYS };
};

export const respecPerks = async (user: User) => {
  const p = await profileOf(user.userid);
  const now = getCurrentDateTime();
  const r = respecOf(p, now);
  if (r.refund <= 0) throw new HellgateError("You have no perks to take back.");
  if (!r.free) {
    const hours = Math.ceil((r.next - now) / 3600);
    throw new HellgateError(`Your next free respec comes in ${hours >= 48 ? Math.ceil(hours / 24) + " days" : hours + " hour" + (hours === 1 ? "" : "s")}.`);
  }
  const rows = (await postgres.em.getConnection().execute(
    `UPDATE bym.td2_profile SET embers = embers + ?, perks = ?::jsonb, updated_at = now()
      WHERE user_id = ? AND COALESCE((perks->>'_respec')::bigint, 0) = ? RETURNING user_id`,
    [r.refund, JSON.stringify({ _respec: now }), user.userid, p.respecAt],
    "all",
  )) as unknown[];
  if (!rows.length) throw new HellgateError("That respec was made already.");
  logger.info(`Hellgate 2: ${user.username} took back their perks for ${r.refund} embers`);
  return { ...(await status2(user)), refunded: r.refund };
};

// ---------------------------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------------------------

const RUN_KEY = (userid: number) => `td2:run:${userid}`;
const RUN_TTL = 8 * 60 * 60;

interface RunMeta {
  map: string;
  difficulty: string;
  daily: string;
  mutators: string[];
  perks: Record<string, number>;
  seed: number;
  at: number;
}

/** The open run's settings (null: no Hellgate Defense 2 run open). */
export const runMeta = async (userid: number): Promise<RunMeta | null> => {
  const raw = await redis.get(RUN_KEY(userid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunMeta;
  } catch {
    return null;
  }
};

/** Hellgate Defense's own run opened: no sequel's run is open any more. */
export const forgetRun2 = async (userid: number) => {
  await redis.del(RUN_KEY(userid));
};

/** What base/load tells the game about a Hellgate Defense 2 run (io_td): the map, and how the run plays. */
export const td2Info = async (save: Save) => {
  const meta = await runMeta(Number(save.userid));
  const m = meta ? mapOf(meta.map) : null;
  if (!meta || !m || save.name !== "Hellgate Defense 2") return null;
  const d = DIFFICULTIES[Math.max(0, diffIndex(meta.difficulty))];
  return {
    arena: arena2Info(m),
    started: Number(save.createtime) || 0,
    v2: { map: m.id, mapName: m.name, difficulty: d, daily: meta.daily, mutators: meta.mutators, perks: meta.perks, seed: meta.seed },
  };
};

/** A new run: on a map (that is open to the player) at a difficulty, or today's challenge. */
export const openRun2 = async (user: User, mapId: unknown, difficulty: unknown, daily: unknown) => {
  const p = await profileOf(user.userid);
  let meta: RunMeta;
  if (Number(daily) === 1) {
    const d = dailyOf();
    meta = { map: d.map, difficulty: d.difficulty, daily: d.day, mutators: d.mutators, perks: {}, seed: d.seed, at: Date.now() };
  } else {
    const m = mapOf(mapId);
    if (!m) throw new HellgateError("There is no such map.");
    if (!unlocked(p, m)) throw new HellgateError(`${m.name} opens once you reach wave ${m.unlock!.wave} on ${mapOf(m.unlock!.map)!.name}.`);
    const di = diffIndex(difficulty);
    if (di < 0) throw new HellgateError("There is no such difficulty.");
    if (DIFFICULTIES[di].id === "inferno" && !infernoOpen(p)) throw new HellgateError("Inferno opens once you win a map on Normal or harder.");
    meta = { map: m.id, difficulty: DIFFICULTIES[di].id, daily: "", mutators: [], perks: p.perks, seed: Math.floor(Math.random() * 2_000_000_000) + 1, at: Date.now() };
  }
  const m = mapOf(meta.map)!;
  const baseid = tdBaseId(user.userid);
  const now = getCurrentDateTime();
  const em = postgres.em.fork();
  const home = await em.findOne(Save, { userid: user.userid, type: BaseType.MAIN }, { fields: ["homebaseid", "baseid", "worldid"] });
  if (!home) throw new HellgateError("Your yard isn't ready yet.");
  await em.nativeDelete(Save, { baseid, type: "td" });
  const run = em.create(
    Save,
    {
      baseid,
      type: "td",
      userid: user.userid,
      saveuserid: user.userid,
      worldid: null,
      wmid: 0,
      homebaseid: Number(home.homebaseid || home.baseid || 0),
      name: "Hellgate Defense 2",
      buildingdata: arena2Buildings(m),
      buildinghealthdata: {},
      buildingresources: {},
      resources: { r1: PLENTY, r2: PLENTY, r3: PLENTY, r4: PLENTY, r1max: PLENTY, r2max: PLENTY, r3max: PLENTY, r4max: PLENTY },
      iresources: { r1: 0, r2: 0, r3: 0, r4: 0, r1max: 0, r2max: 0, r3max: 0, r4max: 0 },
      researchdata: {},
      monsters: {},
      academy: {},
      aiattacks: {},
      attacks: [],
      damage: 0,
      destroyed: 0,
      attackid: 0,
      protected: 0,
      credits: 0,
      tutorialstage: 205,
      createtime: now,
      savetime: now,
    } as never,
    { partial: true },
  ) as Save;
  em.persist(run);
  await em.flush();
  await redis.set(RUN_KEY(user.userid), JSON.stringify(meta), "EX", String(RUN_TTL));
  return { baseid, map: m.id, daily: meta.daily, profile: p };
};

/** The waves that make a win: wave 40 cleared and the Hellgate Warden in it killed. */
export const VICTORY_WAVE = 40;
const MIN_WAVE_SECONDS = 6;
const MAX_WAVE = 999;

/** Points on the board: waves times the difficulty's weight, and a win's bonus. */
export const pointsOf = (waves: number, difficulty: string, victory: boolean) => {
  const d = DIFFICULTIES[Math.max(0, diffIndex(difficulty))];
  return Math.round(waves * d.weight * 10) + (victory ? 100 * (diffIndex(difficulty) + 1) : 0);
};

/** Embers for a run: a wave's worth by difficulty, a win's bonus, a map's first win at a difficulty. */
export const embersOf = (waves: number, difficulty: string, victory: boolean, newSkulls: boolean, daily: boolean) => {
  if (daily) return waves + (waves >= 10 ? 15 : 0);
  const di = Math.max(0, diffIndex(difficulty));
  return Math.floor(waves * DIFFICULTIES[di].weight) + (victory ? 40 * (di + 1) : 0) + (newSkulls ? 25 : 0);
};

/**
 * The run is over (the Hall fell, or the player left): `wave` waves cleared, `kills` killed, `won` 1 if the 40th
 * wave's Warden was killed. Recorded once (the run's settings go with it), its yard deleted. `runId` (QoL #459):
 * the run's id (io_td.started); the same run finished again is answered as the first time (`repeat: true`).
 */
export const finishRun2 = async (user: User, wave: unknown, kills: unknown, won: unknown = 0, runId: unknown = 0) => {
  const baseid = tdBaseId(user.userid);
  const em = postgres.em.fork();
  const run = await em.findOne(Save, { baseid, type: "td", userid: user.userid });
  const meta = await runMeta(user.userid);
  if (!run || !meta) {
    if (run) await em.nativeDelete(Save, { baseid, type: "td" });
    // (QoL #459: recorded already, its answer lost on the way; the embers as they are now)
    const kept = run ? null : await finishedBefore(user.userid, runId, true);
    if (kept) return { ...kept, profile: await profileOf(user.userid), repeat: true };
    return { recorded: false, profile: await profileOf(user.userid) };
  }
  // (13 October) the run claimed first: of two finishes sent at once only the one that takes its yard records it
  // (both found the run and both paid its embers and counted it)
  const claimed = await em.nativeDelete(Save, { baseid, type: "td", userid: user.userid });
  await redis.del(RUN_KEY(user.userid));
  const before = await profileOf(user.userid);
  if (claimed !== 1) {
    // (QoL #459: the other one's answer, once it has it)
    const kept = await finishedBefore(user.userid, runId, true, true);
    if (kept) return { ...kept, profile: await profileOf(user.userid), repeat: true };
    return { recorded: false, profile: before };
  }
  const elapsed = Math.max(0, getCurrentDateTime() - Number(run.createtime || 0));
  let waves = Math.floor(Number(wave));
  if (!Number.isFinite(waves) || waves < 0) waves = 0;
  await noteHellgateRun(user, waves, elapsed);
  // (18 October: and no more than the game's own timing allows, services/anticheat hellgateWavesIn)
  const possible = Math.min(Math.floor(elapsed / MIN_WAVE_SECONDS), hellgateWavesIn(elapsed));
  if (waves > possible) {
    logger.warn(`Hellgate 2: ${user.username} reported ${waves} waves in ${elapsed} s; counted ${possible}`);
    waves = possible;
  }
  waves = Math.min(MAX_WAVE, waves);
  let killed = Math.floor(Number(kills));
  if (!Number.isFinite(killed) || killed < 0) killed = 0;
  // (wave w holds at most about 2 x 105 monsters, its splits and broods included)
  killed = Math.min(killed, (waves + 1) * 260);

  // (a win: wave 40 cleared with the Warden killed; the game says whether it was)
  const victory = waves >= VICTORY_WAVE && Number(won) === 1;
  const daily = Boolean(meta.daily);
  const p = before;
  const rec = p.maps[meta.map] ?? { best: 0, skulls: 0, points: 0 };
  const di = Math.max(0, diffIndex(meta.difficulty));
  const skullsNow = victory && !daily ? di + 1 : 0;
  const newSkulls = skullsNow > rec.skulls;
  const points = daily ? waves : pointsOf(waves, meta.difficulty, victory);
  const embers = embersOf(waves, meta.difficulty, victory, newSkulls, daily);
  const newBest = !daily && waves > rec.best;
  if (!daily) {
    rec.best = Math.max(rec.best, waves);
    rec.skulls = Math.max(rec.skulls, skullsNow);
    rec.points = Math.max(rec.points, points);
    p.maps[meta.map] = rec;
  }
  await addRunToProfile(user.userid, { embers, victory: victory && !daily, map: daily ? null : meta.map, rec: daily ? null : rec });
  const after = await profileOf(user.userid);
  if (waves > 0 || killed > 0) {
    if (daily) await recordScore(user.userid, "hellgate2", "daily", meta.daily, waves, killed);
    else await recordScore(user.userid, "hellgate2", "solo", "", points, waves);
  }
  await redis.del(RUN_KEY(user.userid));
  await em.nativeDelete(Save, { baseid, type: "td" });
  const answer = { recorded: true, wave: waves, kills: killed, points, embers, victory, skulls: skullsNow, newSkulls, newBest, daily: meta.daily, profile: after };
  // (QoL #459: kept for a finish of this run sent again)
  await keepFinished(user.userid, Number(run.createtime) || 0, true, answer);
  return answer;
};
