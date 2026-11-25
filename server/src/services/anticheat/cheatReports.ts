import { sendAlert } from "../admin/alerts.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { logger } from "../../utils/logger.js";
import { isTestMode } from "../admin/testMode.js";
import type { User } from "../../database/models/user.model.js";

/**
 * Inferno-only (9 October, the user's: "I want to have automatic cheat detection but with absolutely no false
 * positives. I want the reports to show up in the reports section for admins. Build a thorough anticheat.").
 *
 * Every rule here is a thing the game itself can never send: a field the game has no code to send, a number the
 * game can't reach whatever happens (lag, a lost answer sent again, a tab left in the background, a phone locked),
 * a clock running ahead of the server's. The limits have room to spare on top of the most a fair game can do, so a
 * finding is proof of a changed game or forged requests, never bad luck. Each finding is kept with that proof
 * (bym.cheat_report) and shown in the admin panel's Reports tab; nobody is punished automatically. Requests that
 * would gain something from it are also refused, or the impossible part left out (infernoOnlyConfig.anticheat.refuse).
 *
 * Players in admin test mode are never checked (their game is meant to do impossible things), nor are Designer
 * drafts, Hellgate Defense arenas or Siege yards (the server keeps nothing their game sends).
 */

export interface CheatRule {
  title: string;
  /** Why a fair game can't do it, for the admin reading the report. */
  why: string;
}

export const CHEAT_RULES: Record<string, CheatRule> = {
  save_unknown_fields: {
    title: "Save with fields the game never sends",
    why: "The game only ever sends a fixed list of fields with a yard save (BASE.SaveB). These came with fields outside that list (some, like the store record, outposts or home cell, would change what the server checks). The fields were not taken.",
  },
  clock_ahead: {
    title: "Game clock ahead of the server",
    why: "The game's clock starts from the server's time when the yard loads and counts seconds of real time from then, so it can only be behind the server, never ahead. A clock minutes ahead is a game running faster than real time (a speed hack), which makes timers and production run faster.",
  },
  resources_from_nowhere: {
    title: "Resources out of nowhere",
    why: "A save adds at most what the yard's storage holds (the game never funds past it, and a few saves resent after failures at most add up); this one added many times more than any yard of this player can store. The resources were not added.",
  },
  building_over_max_level: {
    title: "Building above its highest level",
    why: "A building was raised past the highest level the game's own building table has for it (read from the game itself: client-web/tools/anticheat/dump-building-props.mjs), which no upgrade, instant finish or kit can do.",
  },
  building_over_max_calcification: {
    title: "Building calcified past its highest level",
    why: "A building's calcification (its `fort` in the save) was raised past what the game's building table offers for it: four levels for the main yard's defensive towers, Resource Pods and Under Hall, none for anything else or in outposts. The game never sends that.",
  },
  mushroom_forged: {
    title: "Shiny wart forged",
    why: "The game sends a wart's shiny one wart at a time (more is refused by the game itself), and warts only grow in the main yard, one every 4.8 hours (3 times as fast in a Wart Bloom), 10 at most at once. More than that was claimed. The shiny was not paid.",
  },
  purchase_bad_quantity: {
    title: "Purchase of zero or fewer",
    why: "The game never sends a purchase of zero or a negative number (it refuses one itself before saving). A negative one takes items out of the store record, which lets a quest's Shiny be claimed again. The purchase was not taken.",
  },
  attack_save_without_attack: {
    title: "Attack save with no attack started",
    why: "Every attack the game makes starts with the server loading the yard to attack, which writes the attack log. This save wrote to a yard as an attack with no attack started on it by this player in the last two hours. The save was refused.",
  },
  loot_beyond_yard: {
    title: "More loot than the yard held",
    why: "Loot comes out of what the attacked yard holds: its resources (never more than it can store) and what its harvesters can hold. This attack brought back more than ten times all the yard could ever hold, past the low-level bonus and saves resent after failures. The loot was not added.",
  },
  map_room_3_cost: {
    title: "Map Room 3 attack payment from an Inferno game",
    why: "Map Room 3 (and its attack payment, which the server takes from the request) does not exist in the Inferno: the game can't be on it. The attack was refused.",
  },
  negative_price: {
    title: "Negative or invalid price",
    why: "The game always sends a price of zero or more (a takeover, a move). A negative price would have added resources instead of taking them. The request was refused.",
  },
  legacy_save_route: {
    title: "Yard saved through the old Inferno save route",
    why: "The Inferno-only game saves its own yards to /base/save; it never sends its own yard to the old Inferno route (/api/.../bm/base/save), which has fewer checks. The save was refused.",
  },
  arcade_score_impossible: {
    title: "Impossible Devil's Arcade score",
    why: "The score is far past what anyone can score in the time the run took (five times the arcade's own limit for that time, and growing with it), or a Valgos Golf score better than nine holes allow. Scores past the arcade's limits are refused anyway; this one was sent by something other than the game.",
  },
  hellgate_too_fast: {
    title: "Hellgate Defense waves faster than they come",
    why: "Each wave's monsters come one after the other, a fixed time apart, and a wave is only over once the last has come; even at double speed the waves claimed take at least twice the time the run took. The waves were cut down to what the time allows.",
  },
};

export type CheatRuleId = keyof typeof CHEAT_RULES;

export const anticheatOn = () => infernoOnlyConfig.enabled && infernoOnlyConfig.anticheat?.enabled !== false;
export const anticheatRefuses = () => anticheatOn() && infernoOnlyConfig.anticheat?.refuse !== false;

/** Whether this player is checked at all (not in admin test mode). */
export const checked = async (user: User | null | undefined) => {
  if (!anticheatOn() || !user) return false;
  try {
    return !(await isTestMode(user));
  } catch {
    return false;
  }
};

const SAMPLES = 5;

/**
 * A finding: added to the player's open report for the rule (or a new one), with its proof. Never throws: a
 * failure to write it leaves the request as it was.
 */
export const flagCheat = async (
  who: { userid: number; username?: string },
  rule: CheatRuleId,
  evidence: Record<string, unknown>,
  opts: { refused?: boolean } = {},
): Promise<void> => {
  if (!anticheatOn()) return;
  const proof = { at: new Date().toISOString(), ...evidence };
  try {
    const json = JSON.stringify(proof).slice(0, 4000);
    const refused = opts.refused ? 1 : 0;
    const rows = await postgres.em.getConnection().execute(
      `INSERT INTO bym.cheat_report (userid, username, rule, count, refused, evidence, samples)
       VALUES (?, ?, ?, 1, ?, CAST(? AS jsonb), jsonb_build_array(CAST(? AS jsonb)))
       ON CONFLICT (userid, rule) WHERE status = 'open' DO UPDATE SET
         count = bym.cheat_report.count + 1,
         refused = bym.cheat_report.refused + EXCLUDED.refused,
         last_at = now(),
         username = CASE WHEN EXCLUDED.username <> '' THEN EXCLUDED.username ELSE bym.cheat_report.username END,
         evidence = EXCLUDED.evidence,
         samples = (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
             SELECT x FROM jsonb_array_elements(bym.cheat_report.samples || EXCLUDED.evidence) WITH ORDINALITY t(x, n)
             ORDER BY n DESC LIMIT ${SAMPLES}) s)
       RETURNING id, count`,
      [who.userid, who.username ?? "", rule, refused, json, json],
      "all",
    ) as { id: number; count: number }[];
    // (QoL #268: a new report, to the operator's channel)
    if (Number(rows?.[0]?.count) === 1) sendAlert("cheat", `cheat detection: ${CHEAT_RULES[rule]?.title ?? rule} by ${who.username || "#" + who.userid} (report ${rows[0].id})`);
    logger.warn(`Anticheat: ${CHEAT_RULES[rule]?.title ?? rule}: ${who.username ?? ""} (#${who.userid})${opts.refused ? ", refused" : ""}: ${json.slice(0, 300)}`);
  } catch (e) {
    logger.error(`Anticheat: could not record ${rule} for #${who.userid}: ${e}`);
  }
};

/** The admin panel's list: open reports (or dismissed ones), newest first, with each rule's title and reason. */
export const listCheatReports = async (status: "open" | "dismissed" = "open", limit = 200) => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT c.*, COALESCE(NULLIF(c.username, ''), u.username) AS name, u.banned FROM bym.cheat_report c LEFT JOIN bym."user" u ON u.userid = c.userid
      WHERE c.status = ? ORDER BY c.last_at DESC LIMIT ?`,
    [status, limit],
    "all",
  )) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    userid: Number(r.userid),
    username: String(r.name ?? r.username ?? ""),
    banned: Boolean(r.banned),
    rule: String(r.rule),
    title: CHEAT_RULES[String(r.rule)]?.title ?? String(r.rule),
    why: CHEAT_RULES[String(r.rule)]?.why ?? "",
    count: Number(r.count),
    refused: Number(r.refused),
    first: r.first_at,
    last: r.last_at,
    evidence: r.evidence,
    samples: r.samples,
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
  }));
};

/** An admin has looked: the report is closed (a new finding opens a new one). */
export const dismissCheatReport = async (id: number, admin: string) => {
  const rows = (await postgres.em.getConnection().execute(
    `UPDATE bym.cheat_report SET status = 'dismissed', reviewed_by = ?, reviewed_at = now() WHERE id = ? AND status = 'open' RETURNING userid, username, rule, count`,
    [admin, id],
    "all",
  )) as { userid: number; username: string; rule: string; count: number }[];
  return rows[0] ?? null;
};

/** A player's open reports (the admin panel's player card). */
export const openCheatsOf = async (userid: number) =>
  (await postgres.em.getConnection().execute(
    `SELECT rule, count, last_at FROM bym.cheat_report WHERE userid = ? AND status = 'open' ORDER BY last_at DESC`,
    [userid],
    "all",
  )) as { rule: string; count: number; last_at: string }[];
