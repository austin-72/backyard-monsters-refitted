import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { CHESTS, questById } from "../quests/questBook.js";
import { listBackups } from "./backupStatus.js";
import { isAttackActive } from "../base/isAttackActive.js";

/**
 * Inferno-only (15 October, QoL #252, #505, #250): what the panel's player card reads about a player from what the
 * server already keeps. Read only, but for a yard copied or restored from the panel (QoL #250, 16 October, below).
 */

type Row = Record<string, unknown>;

const LIMIT = 300;

/** One query, an empty list when its table isn't there (a migration not run yet). */
const rows = async <T = Row>(sql: string, params: unknown[]): Promise<T[]> => {
  try {
    return (await postgres.em.getConnection().execute(sql, params, "all")) as T[];
  } catch {
    return [];
  }
};

const ms = (v: unknown) => {
  const t = v instanceof Date ? v.getTime() : typeof v === "number" ? v : new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : 0;
};

// ---------------------------------------------------------------------------------------------
// QoL #252: the Shiny ledger
// ---------------------------------------------------------------------------------------------

export interface LedgerLine {
  /** Epoch ms. */
  at: number;
  source: string;
  /** Shiny in (+) or out (-); null when the record doesn't say. */
  amount: number | null;
  details: string;
}

/**
 * Every Shiny change of a player's that the server has a record of, newest first (at most 300 of each kind): the admin
 * log's Shiny changes, the Brimstone Pit's bets and payouts, quest book rewards (quests and chests; the daily ones
 * keep no date), Moloch's Gauntlet and Hell Freezes Over rewards, and invite rewards (dated by the friend's joining).
 * `notLogged`: the ways Shiny changes that leave no record, so the ledger can't show them.
 */
export const shinyLedger = async (userid: number) => {
  const lines: LedgerLine[] = [];

  // the admin log: Shiny given or taken from the panel ("100 -> 600 (+500): note")
  for (const r of await rows<{ at: Date; admin_name: string; details: string }>(
    `SELECT at, admin_name, details FROM bym.admin_log WHERE target_id = ? AND action = 'credits' ORDER BY at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    const m = /\(([+-]?\d+)\)/.exec(String(r.details ?? ""));
    lines.push({ at: ms(r.at), source: "admin", amount: m ? Number(m[1]) : null, details: `by ${r.admin_name}: ${r.details}` });
  }

  // the Brimstone Pit: each bet (stake out, payout in; a refunded one gave the stake back)
  for (const r of await rows<{ id: number; game: string; stake: number; payout: number; status: string; created_at: Date; settled_at: Date | null }>(
    `SELECT id, game, stake, payout, status, created_at, settled_at FROM bym.casino_bet WHERE user_id = ? ORDER BY created_at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    const stake = Number(r.stake) || 0;
    const payout = Number(r.payout) || 0;
    const net = r.status === "refunded" ? 0 : r.status === "open" ? -stake : payout - stake;
    lines.push({
      at: ms(r.settled_at ?? r.created_at),
      source: "brimstone pit",
      amount: net,
      details: `${r.game} bet #${r.id}: stake ${stake}, ${r.status === "open" ? "not settled yet" : r.status === "refunded" ? "refunded" : `paid ${payout}`}`,
    });
  }

  // the quest book: quests and chests collected (their time), with the Shiny of their reward
  const q = await rows<{ claimed: Record<string, number> | string | null }>(`SELECT claimed FROM bym.quest_progress WHERE userid = ?`, [userid]);
  const claimedRaw = q[0]?.claimed ?? {};
  const claimed = (typeof claimedRaw === "string" ? JSON.parse(claimedRaw) : claimedRaw) as Record<string, number>;
  for (const [id, at] of Object.entries(claimed ?? {})) {
    const shiny = Number(questById.get(id)?.shiny ?? CHESTS.find((c) => c.id === id)?.shiny ?? 0);
    if (shiny > 0) lines.push({ at: Number(at) * 1000, source: "quest book", amount: shiny, details: `${CHESTS.some((c) => c.id === id) ? "chest" : "quest"} ${id}` });
  }

  // Moloch's Gauntlet and Hell Freezes Over: each reward paid
  for (const r of await rows<{ month: string; stage: number; shiny: number; claimed_at: Date }>(
    `SELECT month, stage, shiny, claimed_at FROM bym.gauntlet_claim WHERE userid = ? AND shiny > 0 ORDER BY claimed_at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    lines.push({ at: ms(r.claimed_at), source: "gauntlet", amount: Number(r.shiny), details: `${r.month}, stage ${r.stage}` });
  }
  for (const r of await rows<{ wave: number; shiny: number; claimed_at: Date }>(
    `SELECT wave, shiny, claimed_at FROM bym.hfo_claim WHERE userid = ? AND shiny > 0 ORDER BY claimed_at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    lines.push({ at: ms(r.claimed_at), source: "hfo", amount: Number(r.shiny), details: `wave ${r.wave}` });
  }

  // invites: each friend who joined through the player's link and was paid, and the player's own joining
  const shiny = Number(infernoOnlyConfig.referral?.shiny ?? 0);
  for (const r of await rows<{ userid: number; username: string; createtime: number | null }>(
    `SELECT u.userid, u.username, s.createtime FROM bym."user" u LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
      WHERE u.referred_by = ? AND u.referral_result = 'paid' ORDER BY u.userid DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    lines.push({ at: Number(r.createtime ?? 0) * 1000, source: "invite", amount: shiny || null, details: `${r.username} (#${r.userid}) joined through their link (the amount is today's setting)` });
  }
  for (const r of await rows<{ createtime: number | null; inviter: string | null }>(
    `SELECT s.createtime, i.username AS inviter FROM bym."user" u LEFT JOIN bym.save s ON s.basesaveid = u.save_basesaveid
       LEFT JOIN bym."user" i ON i.userid = u.referred_by
      WHERE u.userid = ? AND u.referral_result = 'paid'`,
    [userid]
  )) {
    lines.push({ at: Number(r.createtime ?? 0) * 1000, source: "invite", amount: shiny || null, details: `joined through ${r.inviter ?? "an invite"}'s link (the amount is today's setting)` });
  }

  lines.sort((a, b) => b.at - a.at);
  const balance = await rows<{ credits: number }>(`SELECT s.credits FROM bym."user" u JOIN bym.save s ON s.basesaveid = u.save_basesaveid WHERE u.userid = ?`, [userid]);
  return {
    credits: Number(balance[0]?.credits ?? 0),
    lines: lines.slice(0, 500),
    more: lines.length > 500,
    notLogged: [
      "the store in the game (instant finishes, protection, speed-ups, unlocks bought with Shiny: the save's purchase)",
      "the daily login reward (only the last day collected is kept)",
      "the quest book's daily tasks and daily bonus (no date kept)",
      "taking over or moving to a map cell with Shiny, and relocating",
      "alliance power-ups, pets, workers and D.A.V.E. Club looks bought with Shiny",
      "Map Room 3 attack costs paid in Shiny",
      "group compensations from the panel (the admin log has the group and amount, not each player)",
      "admin test mode (the account's Shiny is put back when it ends)",
    ],
  };
};

// ---------------------------------------------------------------------------------------------
// QoL #505: the player's actions
// ---------------------------------------------------------------------------------------------

/**
 * What a player did, from what the server keeps, newest first: the player log (relocations and abandoned outposts,
 * kept 90 days), the attacks they made (attack logs), and what admins did to their account (the admin log).
 * `notLogged`: actions with no record kept.
 */
export const playerActions = async (userid: number) => {
  const lines: { at: number; kind: string; action: string; details: string }[] = [];

  for (const r of await rows<{ id: number; at: Date; action: string; details: unknown }>(
    `SELECT id, at, action, details FROM bym.player_log WHERE userid = ? ORDER BY at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    lines.push({ at: ms(r.at), kind: "player", action: r.action, details: `#${r.id} ${typeof r.details === "string" ? r.details : JSON.stringify(r.details ?? {})}`.slice(0, 600) });
  }

  for (const r of await rows<{ attacktime: Date; defender_username: string; defender_userid: number; type: string; x: number | null; y: number | null; baseid: string | null; damage: number }>(
    `SELECT attacktime, defender_username, defender_userid, type, x, y, baseid, damage FROM bym.attack_logs WHERE attacker_userid = ? ORDER BY attacktime DESC LIMIT 100`,
    [userid]
  )) {
    const where = r.x != null && r.y != null ? ` at ${r.x},${r.y}` : "";
    lines.push({ at: ms(r.attacktime), kind: "attack", action: "attack", details: `${r.defender_userid ? r.defender_username : r.defender_username || "a tribe"}${where} (${r.type}), damage ${Number(r.damage) || 0}%` });
  }

  for (const r of await rows<{ at: Date; admin_name: string; action: string; details: string }>(
    `SELECT at, admin_name, action, details FROM bym.admin_log WHERE target_id = ? ORDER BY at DESC LIMIT ${LIMIT}`,
    [userid]
  )) {
    lines.push({ at: ms(r.at), kind: "admin", action: r.action, details: `by ${r.admin_name}${r.details ? `: ${r.details}` : ""}` });
  }

  lines.sort((a, b) => b.at - a.at);
  return {
    lines: lines.slice(0, 500),
    more: lines.length > 500,
    notLogged: [
      "building, upgrading, moving and selling buildings (only the yard as it is now is kept)",
      "training, hatching and unlocking monsters",
      "store purchases and resources spent",
      "taking over map cells and outposts, and joining or leaving alliances",
      "renaming themselves, and chat (the Chat tab keeps the last 30 days)",
      "logins are on the Logins card (90 days)",
    ],
  };
};

// ---------------------------------------------------------------------------------------------
// QoL #250: what copies of a player's yards exist (read only)
// ---------------------------------------------------------------------------------------------

/**
 * The copies of a player's yards the server has: the daily database backups (the whole database each, in the backup
 * folder), their outposts kept when they relocated or abandoned one, and copies of a yard made from the panel
 * (bym.player_log_save, 90 days), and an admin's test mode snapshot. (16 October, QoL #250: a kept copy of a yard
 * the player still has, their main yard or one of their outposts, can be restored: `restorable`; and `yards`, their
 * yards now, to copy.)
 */
export const yardBackups = async (userid: number) => {
  const kept = await rows<{ log_id: number; at: Date; action: string; baseid: string; type: string | null; savetime: number | null; buildings: number | null; restorable: boolean; by: string | null }>(
    `SELECT k.log_id, l.at, l.action, k.baseid, k.row->>'type' AS type, (k.row->>'savetime')::bigint AS savetime,
            (CASE WHEN jsonb_typeof(k.row->'buildingdata') = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(k.row->'buildingdata')) ELSE NULL END)::int AS buildings,
            (k.row->>'type' IN ('main', 'outpost') AND k.row->>'saveuserid' = l.userid::text AND EXISTS (
              SELECT 1 FROM bym.save s WHERE s.baseid = k.baseid AND s.saveuserid = l.userid AND s.type = k.row->>'type')) AS restorable,
            l.details->>'by' AS by
       FROM bym.player_log_save k JOIN bym.player_log l ON l.id = k.log_id
      WHERE l.userid = ? ORDER BY l.at DESC, k.baseid LIMIT ${LIMIT}`,
    [userid]
  );
  const yards = await rows<{ baseid: string; type: string; savetime: number | null; buildings: number | null }>(
    `SELECT s.baseid, s.type, s.savetime,
            (CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(s.buildingdata)) ELSE NULL END)::int AS buildings
       FROM bym.save s WHERE s.saveuserid = ? AND s.type IN ('main', 'outpost') ORDER BY (s.type = 'main') DESC, s.baseid`,
    [userid]
  );
  const snapshot = await rows<{ taken_at: Date; saves: number; cells: number }>(
    `SELECT taken_at, jsonb_array_length(saves)::int AS saves, jsonb_array_length(cells)::int AS cells FROM bym.admin_test_snapshot WHERE userid = ?`,
    [userid]
  );
  return {
    dumps: listBackups(),
    kept: kept.map((k) => ({
      logId: Number(k.log_id),
      at: ms(k.at),
      action: k.action,
      baseid: k.baseid,
      type: k.type ?? "",
      savedAt: k.savetime ? Number(k.savetime) * 1000 : null,
      buildings: k.buildings == null ? null : Number(k.buildings),
      restorable: !!k.restorable,
      by: k.by ?? null,
    })),
    yards: yards.map((y) => ({ baseid: String(y.baseid), type: y.type, savedAt: y.savetime ? Number(y.savetime) * 1000 : null, buildings: y.buildings == null ? null : Number(y.buildings) })),
    testSnapshot: snapshot[0] ? { at: ms(snapshot[0].taken_at), saves: Number(snapshot[0].saves), cells: Number(snapshot[0].cells) } : null,
  };
};

// ---------------------------------------------------------------------------------------------
// QoL #250 (16 October): a copy of a yard made now, and a yard restored to a copy
// ---------------------------------------------------------------------------------------------

export class YardRestoreError extends Error {}

/** A yard copy is kept in the player log (bym.player_log, 90 days) with the save row as it is (bym.player_log_save). */
export const YARD_COPY_ACTION = "yard-copy";
/** The yard as it was just before a restore (so the restore can itself be undone). */
export const YARD_UNDO_ACTION = "yard-before-restore";

/**
 * What a restore writes: the yard's buildings and what belongs with them, as the copy holds them. The buildings
 * (buildingdata), their damage (buildinghealthdata), their keys (buildingkeydata), the buildings in storage
 * (researchdata, BASE.getStoredBuildingsSaveData) and the warts (mushrooms). The rest (resources, Shiny, monsters,
 * the Strongbox and Academy, quests, the map, attacks) stays as it is now.
 */
export const YARD_FIELDS = ["buildingdata", "buildinghealthdata", "buildingkeydata", "researchdata", "mushrooms"] as const;

/** Unchanged this long, a yard's game isn't open (as the panel's monster changes use: adminApi.ts savesOverIt). */
const QUIET_SECONDS = 600;

type Em = typeof postgres.em;
const sql = async <T = Row>(em: Em, query: string, params: unknown[] = []) =>
  (await em.getConnection().execute(query, params, "all", em.getTransactionContext())) as T[];

/** The player's yard (main yard or outpost) by base id, locked: null when it isn't one of theirs. */
const lockYard = async (em: Em, userid: number, baseid: string) =>
  (
    await sql<{ basesaveid: number; baseid: string; type: string; savetime: number | null; attackid: number | null; attacks: unknown; buildings: number | null }>(
      em,
      `SELECT basesaveid, baseid, type, savetime, attackid, attacks,
              (CASE WHEN jsonb_typeof(buildingdata) = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(buildingdata)) ELSE NULL END)::int AS buildings
         FROM bym.save WHERE baseid = ? AND saveuserid = ? AND type IN ('main', 'outpost') FOR UPDATE`,
      [baseid, userid]
    )
  )[0] ?? null;

/** Keeps the yard's save row as it is now with a new player log row. Answers the row's id. */
const keepYard = async (em: Em, userid: number, username: string, action: string, basesaveid: number, details: Record<string, unknown>) => {
  const id = Number(
    (await sql<{ id: number }>(em, `INSERT INTO bym.player_log (userid, username, action, details) VALUES (?, ?, ?, CAST(? AS jsonb)) RETURNING id`, [userid, username ?? "", action, JSON.stringify(details)]))[0]?.id
  );
  if (!id) throw new YardRestoreError("The copy could not be kept: nothing was changed.");
  const kept = await sql(em, `INSERT INTO bym.player_log_save (log_id, baseid, row) SELECT ?, s.baseid, to_jsonb(s) FROM bym.save s WHERE s.basesaveid = ? RETURNING log_id`, [id, basesaveid]);
  if (!kept.length) throw new YardRestoreError("The copy could not be kept: nothing was changed.");
  return id;
};

/**
 * A copy of one of the player's yards (main yard or outpost) as it is saved now, kept 90 days: listed with the
 * player's yard copies, and restorable. Answers its log id.
 */
export const copyYard = async (userid: number, username: string, baseid: string, by: string) => {
  if (!/^\d{1,20}$/.test(baseid)) throw new YardRestoreError("No such yard.");
  return postgres.em.fork().transactional(async (em) => {
    const yard = await lockYard(em, userid, baseid);
    if (!yard) throw new YardRestoreError("That is not one of this player's yards (their main yard or an outpost).");
    const logId = await keepYard(em, userid, username, YARD_COPY_ACTION, yard.basesaveid, { by, baseid, type: yard.type, buildings: yard.buildings });
    return { logId, type: yard.type, buildings: yard.buildings };
  });
};

/**
 * One of the player's yards restored to a kept copy of it (`logId`: its player log row; `baseid`: the yard). Only a copy
 * of the player's own main yard or outpost, into that same yard, still theirs. Refused while the yard is attacked, or
 * an outpost was saved in the last 10 minutes (the caller checks the player isn't in the game: adminApi.ts savesOverIt).
 * First the yard as it is now is kept (YARD_UNDO_ACTION), then YARD_FIELDS are written from the copy; all in one
 * transaction, the yard locked. An outpost's line in the main yard's auto-bank record goes (its next save makes it
 * again, as a kit does: applyKit.ts). Answers the undo copy's log id and the buildings before and after.
 */
export const restoreYard = async (userid: number, username: string, logId: number, baseid: string, by: string) => {
  if (!Number.isInteger(logId) || logId <= 0 || !/^\d{1,20}$/.test(baseid)) throw new YardRestoreError("No such copy.");
  return postgres.em.fork().transactional(async (em) => {
    const copy = (
      await sql<{ type: string | null; owner: string | null; savetime: number | null; buildings: number | null; at: Date }>(
        em,
        `SELECT k.row->>'type' AS type, k.row->>'saveuserid' AS owner, (k.row->>'savetime')::bigint AS savetime, l.at,
                (CASE WHEN jsonb_typeof(k.row->'buildingdata') = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(k.row->'buildingdata')) ELSE NULL END)::int AS buildings
           FROM bym.player_log_save k JOIN bym.player_log l ON l.id = k.log_id
          WHERE k.log_id = ? AND k.baseid = ? AND l.userid = ? LIMIT 1`,
        [logId, baseid, userid]
      )
    )[0];
    if (!copy) throw new YardRestoreError("No such copy of this player's yards.");
    if (String(copy.owner) !== String(userid) || (copy.type !== "main" && copy.type !== "outpost")) throw new YardRestoreError("Only a copy of the player's own main yard or outpost can be restored.");
    if (copy.buildings == null) throw new YardRestoreError("That copy has no buildings to restore.");

    const yard = await lockYard(em, userid, baseid);
    if (!yard || yard.type !== copy.type) throw new YardRestoreError("That yard isn't the player's any more (relocated, abandoned or taken): there is nothing to restore it into.");
    const attacks = (() => {
      try {
        const a = typeof yard.attacks === "string" ? JSON.parse(yard.attacks) : yard.attacks;
        return Array.isArray(a) ? a : [];
      } catch {
        return [];
      }
    })();
    if (isAttackActive({ attackid: Number(yard.attackid) || 0, attacks } as unknown as Parameters<typeof isAttackActive>[0])) throw new YardRestoreError("That yard is being attacked. Try when the attack is over.");
    const now = Math.floor(Date.now() / 1000);
    if (yard.type === "outpost" && yard.savetime && now - Number(yard.savetime) < QUIET_SECONDS) throw new YardRestoreError("That outpost was saved in the last 10 minutes: the player's game may still be open there. Try again later.");

    const undoId = await keepYard(em, userid, username, YARD_UNDO_ACTION, yard.basesaveid, { by, baseid, type: yard.type, buildings: yard.buildings, restoring: logId });

    const set = YARD_FIELDS.map((f) => `${f} = CASE WHEN jsonb_exists(k.row, '${f}') THEN NULLIF(k.row -> '${f}', 'null'::jsonb) ELSE s.${f} END`).join(",\n             ");
    const done = await sql<{ buildings: number | null }>(
      em,
      `WITH k AS (SELECT p.row AS row FROM bym.player_log_save p WHERE p.log_id = ? AND p.baseid = ? LIMIT 1)
       UPDATE bym.save s SET ${set}
         FROM k WHERE s.basesaveid = ?
       RETURNING (CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(s.buildingdata)) ELSE NULL END)::int AS buildings`,
      [logId, baseid, yard.basesaveid]
    );
    if (!done.length) throw new YardRestoreError("The yard could not be written: nothing was changed.");

    // an outpost's harvesters, as the main yard's auto-bank record had them, go: its next save writes them again
    if (yard.type === "outpost") {
      await sql(
        em,
        `UPDATE bym.save SET buildingresources = buildingresources - CAST(? AS text)
          WHERE saveuserid = ? AND type = 'main' AND jsonb_typeof(buildingresources) = 'object' AND jsonb_exists(buildingresources, CAST(? AS text)) RETURNING basesaveid`,
        [`b${baseid}`, userid, `b${baseid}`]
      );
    }
    return {
      undoLogId: undoId,
      type: yard.type,
      copyAt: ms(copy.at),
      copySavedAt: copy.savetime ? Number(copy.savetime) * 1000 : null,
      before: yard.buildings,
      after: done[0].buildings,
    };
  });
};
