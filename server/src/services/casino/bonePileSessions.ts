import type { User } from "../../database/models/user.model.js";
import { noteCasinoWin } from "../../chat/chatBroadcasts.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { logger } from "../../utils/logger.js";
import { casinoErr } from "./access.js";
import { fairStream, hashSeed, wholeShiny } from "./rng.js";
import { lockSeed, sqlAll, type Em } from "./wallet.js";
import { bonePileLayout, bonePileMultiplier, bonePileSafeChance } from "./games/bonePile.js";

/**
 * Bone Pile games, played over several requests (casino_session, one open per player). The bet is taken
 * and the Sabnox placed when the game starts (from the player's seeds, so it can be checked afterwards);
 * each pile opened is checked against that layout; cashing out pays the multiplier reached. The layout
 * never leaves the server until the game is over: the game is sent its hash (with the server seed in it,
 * so the few possible layouts cannot be tried against it).
 */

interface SessionRow {
  id: string;
  user_id: number;
  bet_id: string;
  stake: number;
  config: { sabnox: number; nonce: number; layout_hash: string };
  /** Where the Sabnox are, and the number that pays a part of a Shiny won (wholeShiny); both secret while open. */
  layout: { mines: number[]; u?: number };
  revealed: number[];
  status: string;
  updated_at: string;
}

const rules = () => casinoConfig.bonePile;
const cap = () => casinoConfig.maxMultiplier;

/** What the game is shown of a session: never where the Sabnox are while it is open. */
export const sessionView = (s: SessionRow) => {
  const m = s.config.sabnox;
  const k = s.revealed.length;
  const view: Record<string, unknown> = {
    session_id: Number(s.id),
    stake: s.stake,
    sabnox: m,
    revealed: s.revealed,
    multiplier: bonePileMultiplier(rules(), k, m, cap()),
    next_multiplier: k < rules().piles - m ? bonePileMultiplier(rules(), k + 1, m, cap()) : null,
    safe_chance: k < rules().piles - m ? bonePileSafeChance(rules(), k, m) : 0,
    layout_hash: s.config.layout_hash,
    nonce: s.config.nonce,
    status: s.status,
  };
  if (s.status !== "open") view.layout = s.layout.mines;
  return view;
};

const lockSession = async (em: Em, userid: number, sessionId: number): Promise<SessionRow> => {
  const rows = await sqlAll<SessionRow>(em, `SELECT * FROM bym.casino_session WHERE id = ? AND user_id = ? AND game = 'bonepile' FOR UPDATE`, [sessionId, userid]);
  if (!rows.length) throw casinoErr("That Bone Pile game could not be found.", Status.NOT_FOUND);
  return rows[0];
};

const balance = async (em: Em, userid: number): Promise<number> =>
  (await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [userid, BaseType.MAIN]))[0]?.credits ?? 0;

const mirror = (user: User | null, credits: number) => {
  if (user?.save && typeof user.save === "object" && "credits" in user.save) (user.save as { credits: number }).credits = credits;
};

/** Pays the multiplier reached (`status` won), or gives the stake back (`status` refunded). */
const settle = async (em: Em, s: SessionRow, status: "won" | "refunded"): Promise<{ payout: number; credits: number }> => {
  const k = s.revealed.length;
  const mult = status === "won" ? bonePileMultiplier(rules(), k, s.config.sabnox, cap()) : 1;
  // a game started before the part was drawn (no u) is paid rounded down
  let payout = status === "won" ? wholeShiny(s.stake * mult, s.layout.u ?? 1) : s.stake;
  if (status === "won" && casinoConfig.maxPayout > 0) payout = Math.min(payout, casinoConfig.maxPayout);
  const paid = await sqlAll<{ credits: number }>(em, `UPDATE bym.save SET credits = credits + ? WHERE userid = ? AND type = ? RETURNING credits`, [payout, s.user_id, BaseType.MAIN]);
  await sqlAll(em,
    `UPDATE bym.casino_bet SET payout = ?, multiplier = ?, status = ?, settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
    [payout, mult.toFixed(2), status === "won" ? "settled" : "refunded", JSON.stringify({ layout: s.layout.mines, revealed: s.revealed, end: status }), s.bet_id]);
  await sqlAll(em, `UPDATE bym.casino_session SET status = ?, updated_at = now() WHERE id = ? RETURNING id`, [status, s.id]);
  s.status = status;
  if (status === "won") noteCasinoWin({ userid: s.user_id, game: "bonepile", stake: s.stake, payout });
  return { payout, credits: paid[0]?.credits ?? 0 };
};

/** The player's open game, or null. */
export const openBonePile = async (userid: number) => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT * FROM bym.casino_session WHERE user_id = ? AND game = 'bonepile' AND status = 'open' LIMIT 1`, [userid], "all")) as SessionRow[];
  return rows.length ? sessionView(rows[0]) : null;
};

/** Starts a game: the bet taken, the Sabnox placed. A request sent twice answers with the same game. */
export const startBonePile = async (user: User, requestId: string, stake: number, sabnox: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const seed = await lockSeed(em, user.userid);
    const seen = await sqlAll<{ id: string; game: string }>(em, `SELECT id, game FROM bym.casino_bet WHERE user_id = ? AND request_id = ?`, [user.userid, requestId]);
    if (seen.length) {
      if (seen[0].game !== "bonepile") throw casinoErr("That request was already used.", Status.CONFLICT);
      const s = await sqlAll<SessionRow>(em, `SELECT * FROM bym.casino_session WHERE bet_id = ?`, [seen[0].id]);
      return { view: sessionView(s[0]), credits: await balance(em, user.userid), replayed: true };
    }
    const open = await sqlAll(em, `SELECT id FROM bym.casino_session WHERE user_id = ? AND status = 'open' FOR UPDATE`, [user.userid]);
    if (open.length) throw casinoErr("Finish the Bone Pile game you have open first.", Status.CONFLICT);
    const bal = await sqlAll<{ credits: number }>(em, `SELECT credits FROM bym.save WHERE userid = ? AND type = ? FOR UPDATE`, [user.userid, BaseType.MAIN]);
    if (!bal.length) throw casinoErr("Your yard could not be found.", Status.CONFLICT);
    if (bal[0].credits < stake) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    const rng = fairStream(seed.server_seed, seed.client_seed, seed.nonce);
    const mines = bonePileLayout(rules(), rng, sabnox);
    // the bet's next number: whether a part of a Shiny won at the cash-out is paid
    const u = rng.next();
    const layoutHash = hashSeed(`${seed.server_seed}:${seed.client_seed}:${seed.nonce}:${mines.join(",")}`);
    const paid = await sqlAll<{ credits: number }>(em,
      `UPDATE bym.save SET credits = credits - ? WHERE userid = ? AND type = ? AND credits >= ? RETURNING credits`, [stake, user.userid, BaseType.MAIN, stake]);
    if (paid.length !== 1) throw casinoErr("You do not have enough Shiny for that bet.", Status.CONFLICT);
    const bet = await sqlAll<{ id: string }>(em,
      `INSERT INTO bym.casino_bet (user_id, request_id, game, stake, payout, multiplier, outcome, seed_hash, client_seed, nonce, status)
       VALUES (?, ?, 'bonepile', ?, 0, 0, CAST(? AS jsonb), ?, ?, ?, 'open') RETURNING id`,
      [user.userid, requestId, stake, JSON.stringify({ sabnox, layout_hash: layoutHash }), seed.server_seed_hash, seed.client_seed, seed.nonce]);
    const ses = await sqlAll<SessionRow>(em,
      `INSERT INTO bym.casino_session (user_id, game, bet_id, stake, config, layout, revealed, status)
       VALUES (?, 'bonepile', ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), '[]'::jsonb, 'open') RETURNING *`,
      [user.userid, bet[0].id, stake, JSON.stringify({ sabnox, nonce: seed.nonce, layout_hash: layoutHash }), JSON.stringify({ mines, u })]);
    await sqlAll(em, `UPDATE bym.casino_seed SET nonce = nonce + 1 WHERE user_id = ? RETURNING nonce`, [user.userid]);
    return { view: sessionView(ses[0]), credits: paid[0].credits, replayed: false };
  });
  mirror(user, result.credits);
  return result;
};

/**
 * Opens a pile. Safe: the pile is kept and the multiplier goes up (every safe pile opened: cashed out at
 * once). A Sabnox: the bet is lost and the layout shown. A pile opened already, or a game already over,
 * is answered as it stands.
 */
export const revealBonePile = async (user: User, sessionId: number, tile: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId);
    if (s.status !== "open" || s.revealed.includes(tile)) {
      return { view: sessionView(s), credits: await balance(em, user.userid), safe: !s.layout.mines.includes(tile), payout: null as number | null };
    }
    if (s.layout.mines.includes(tile)) {
      await sqlAll(em,
        `UPDATE bym.casino_bet SET payout = 0, multiplier = 0, status = 'settled', settled_at = now(), outcome = outcome || CAST(? AS jsonb) WHERE id = ? RETURNING id`,
        [JSON.stringify({ layout: s.layout.mines, revealed: s.revealed, bust: tile, end: "lost" }), s.bet_id]);
      await sqlAll(em, `UPDATE bym.casino_session SET status = 'lost', updated_at = now() WHERE id = ? RETURNING id`, [s.id]);
      s.status = "lost";
      return { view: sessionView(s), credits: await balance(em, user.userid), safe: false, payout: 0 };
    }
    s.revealed = [...s.revealed, tile];
    await sqlAll(em, `UPDATE bym.casino_session SET revealed = CAST(? AS jsonb), updated_at = now() WHERE id = ? RETURNING id`, [JSON.stringify(s.revealed), s.id]);
    if (s.revealed.length >= rules().piles - s.config.sabnox) {
      const done = await settle(em, s, "won");
      return { view: sessionView(s), credits: done.credits, safe: true, payout: done.payout };
    }
    return { view: sessionView(s), credits: await balance(em, user.userid), safe: true, payout: null as number | null };
  });
  mirror(user, result.credits);
  return result;
};

/** Cashes out at the multiplier reached (a pile must have been opened). A game already over: as it stands. */
export const cashoutBonePile = async (user: User, sessionId: number) => {
  const result = await postgres.em.fork().transactional(async (em) => {
    const s = await lockSession(em, user.userid, sessionId);
    if (s.status !== "open") {
      const bet = await sqlAll<{ payout: number }>(em, `SELECT payout FROM bym.casino_bet WHERE id = ?`, [s.bet_id]);
      return { view: sessionView(s), credits: await balance(em, user.userid), payout: bet[0]?.payout ?? 0, replayed: true };
    }
    if (!s.revealed.length) throw casinoErr("Open a pile before cashing out.", Status.CONFLICT);
    const done = await settle(em, s, "won");
    return { view: sessionView(s), credits: done.credits, payout: done.payout, replayed: false };
  });
  mirror(user, result.credits);
  return result;
};

/**
 * Settles games left alone for `idleHours` (all players', or one player's): cashed out if a pile was
 * opened, the bet given back if not. A game being played at that moment is skipped (its row is locked).
 */
export const settleIdleBonePiles = async (userid: number | null = null): Promise<number> => {
  const ids = (await postgres.em.getConnection().execute(
    `SELECT id FROM bym.casino_session WHERE game = 'bonepile' AND status = 'open' AND updated_at < now() - make_interval(hours => ?)${userid != null ? " AND user_id = ?" : ""} LIMIT 500`,
    userid != null ? [rules().idleHours, userid] : [rules().idleHours], "all")) as { id: string }[];
  let settled = 0;
  for (const { id } of ids) {
    try {
      await postgres.em.fork().transactional(async (em) => {
        const rows = await sqlAll<SessionRow>(em,
          `SELECT * FROM bym.casino_session WHERE id = ? AND status = 'open' AND updated_at < now() - make_interval(hours => ?) FOR UPDATE SKIP LOCKED`, [id, rules().idleHours]);
        if (!rows.length) return;
        await settle(em, rows[0], rows[0].revealed.length ? "won" : "refunded");
        settled++;
      });
    } catch (e) {
      logger.error(`Bone Pile: could not settle idle game ${id}: ${e}`);
    }
  }
  return settled;
};

let timer: ReturnType<typeof setInterval> | null = null;

/** Every 10 minutes, settles idle Bone Pile games (started with the server). */
export const startCasinoJobs = () => {
  if (timer) return;
  const run = () =>
    settleIdleBonePiles()
      .then((n) => {
        if (n) logger.info(`Bone Pile: ${n} idle game(s) settled`);
      })
      .catch((e) => logger.error(`Bone Pile: idle settlement failed: ${e}`));
  timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 30 * 1000).unref?.();
};
