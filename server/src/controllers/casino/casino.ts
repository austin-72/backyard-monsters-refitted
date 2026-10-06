import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";
import { casinoConfig } from "../../config/CasinoConfig.js";
import { parseInput } from "../../schemas/parseInput.js";
import { CasinoHistorySchema, MagmaDropSchema, RotateSeedSchema, RouletteSpinSchema, ScratchBuySchema, SlotsSpinSchema, FortuneSpinSchema, FavorSpinSchema, CasinoLiveSchema, BonePileStartSchema, BonePileRevealSchema, BonePileCashoutSchema, AscentBetSchema, AscentCashoutSchema, DerbyBetSchema } from "../../schemas/CasinoSchemas.js";
import { casinoErr, checkStake, pitState, requireCasino } from "../../services/casino/access.js";
import { betHistory, favorReady, jackpotPool, liveBets, sqlAll, playInstant, readSeed, revealedSeeds, rotateSeed, settleJackpot } from "../../services/casino/wallet.js";
import { playMagmaDrop } from "../../services/casino/games/magmaDrop.js";
import { playScratch } from "../../services/casino/games/scratchers.js";
import { playRoulette, rouletteTargets, rouletteWheel } from "../../services/casino/games/roulette.js";
import { FORTUNE_LINES, playFortune, playSlots, type FortuneOutcome, type SlotsOutcome } from "../../services/casino/games/slots.js";
import { ascentState, betAscent, cashoutAscent } from "../../services/casino/ascentRounds.js";
import { betDerby, derbyState } from "../../services/casino/derbyRounds.js";
import { cashoutBonePile, openBonePile, revealBonePile, settleIdleBonePiles, startBonePile } from "../../services/casino/bonePileSessions.js";
import { isShinyLocked, visibleCredits } from "../../services/user/shinyLock.js";

/**
 * The Brimstone Pit's endpoints (config/CasinoConfig.ts, services/casino/). Every outcome is decided
 * here; the game only shows what it is sent. Refusals come back as { error: "message" }.
 */

const balance = async (user: User): Promise<number> => {
  const rows = (await postgres.em.getConnection().execute(`SELECT credits FROM bym.save WHERE userid = ? AND type = ?`, [user.userid, BaseType.MAIN], "all")) as { credits: number }[];
  return visibleCredits(user, rows[0]?.credits ?? 0);
};

/** The shared games' rounds now, for the lobby's tiles ("Flying", "Next race in 3:12"). */
const liveRounds = async () => {
  const rows = (await postgres.em.getConnection().execute(
    `SELECT game, status, betting_opens_at, starts_at FROM bym.casino_round WHERE id IN (SELECT max(id) FROM bym.casino_round GROUP BY game)`, [], "all")) as
    { game: string; status: string; betting_opens_at: Date; starts_at: Date }[];
  const now = Date.now();
  const live: Record<string, { phase: string; starts_at: number }> = {};
  for (const r of rows) {
    const opens = new Date(r.betting_opens_at).getTime();
    live[r.game] = { phase: r.status === "running" ? "running" : r.status === "settled" || now < opens ? "between" : "betting", starts_at: new Date(r.starts_at).getTime() };
  }
  return { ...live, server_ts: now };
};

/** casino/state: the lobby's picture of the Pit, the player's seeds and every game's rules. */
export const casinoState: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const pit = await pitState(user);
  // (a Bone Pile game of theirs left alone for a day is settled before it is shown)
  await settleIdleBonePiles(user.userid);
  const seed = await readSeed(user.userid);
  const locked = isShinyLocked(user);
  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    enabled: casinoConfig.enabled,
    shiny_locked: locked,
    level: pit.level,
    closed: !casinoConfig.enabled ? "The Brimstone Pit is closed." : pit.closed,
    games: casinoConfig.lobby.map((g) => ({
      id: g.id,
      name: g.name,
      level: casinoConfig.unlockLevel[g.id] ?? g.level,
      open: casinoConfig.unlockLevel[g.id] != null,
      unlocked: casinoConfig.unlockLevel[g.id] != null && pit.level >= casinoConfig.unlockLevel[g.id],
    })),
    limits: { min_bet: casinoConfig.minBet, max_bet: casinoConfig.maxBet, max_multiplier: casinoConfig.maxMultiplier },
    rules: {
      magmadrop: casinoConfig.magmaDrop,
      scratch: casinoConfig.scratch,
      roulette: { ...casinoConfig.roulette, wheel: rouletteWheel(casinoConfig.roulette) },
      bonepile: { piles: casinoConfig.bonePile.piles, min_sabnox: casinoConfig.bonePile.minSabnox, max_sabnox: casinoConfig.bonePile.maxSabnox, rtp: casinoConfig.bonePile.rtp, max_multiplier: casinoConfig.maxMultiplier },
      slots: {
        strips: casinoConfig.slots.strips,
        pays: casinoConfig.slots.pays,
        two_spurtz: casinoConfig.slots.twoSpurtz,
        jackpot_rate: casinoConfig.slots.jackpotRate,
        jackpot_full_bet: casinoConfig.slots.jackpotFullBet,
        jackpot_max: casinoConfig.jackpotMax,
      },
      fortune: { lines: FORTUNE_LINES },
    },
    jackpot: await jackpotPool(),
    favor: await favorState(user, pit.level),
    bonepile: await openBonePile(user.userid),
    live: await liveRounds(),
    seed: { server_seed_hash: seed.server_seed_hash, client_seed: seed.client_seed, nonce: seed.nonce },
    credits: await balance(user),
    server_ts: Date.now(),
  };
};

/** casino/seed/rotate: shows the server seed in use, starts a new one. */
export const casinoRotateSeed: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  if (!casinoConfig.enabled) throw casinoErr("The Brimstone Pit is closed.", Status.FORBIDDEN);
  const { client_seed } = parseInput(RotateSeedSchema, ctx.request.body ?? {});
  const result = await rotateSeed(user.userid, client_seed || null);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...result, revealed_seeds: await revealedSeeds(user.userid), credits: await balance(user) };
};

/** casino/history: the player's last bets, and the seeds they have rotated out. */
export const casinoHistory: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { limit } = parseInput(CasinoHistorySchema, ctx.request.body ?? {});
  ctx.status = Status.OK;
  ctx.body = { error: 0, bets: await betHistory(user.userid, limit ?? casinoConfig.historyLimit), revealed_seeds: await revealedSeeds(user.userid) };
};

/** casino/magmadrop/play: one ball. */
export const magmaDropPlay: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, bet, risk } = parseInput(MagmaDropSchema, ctx.request.body);
  checkStake(bet);
  await requireCasino(user, "magmadrop");
  const r = await playInstant(user, "magmadrop", request_id, bet, (rng) => {
    const o = playMagmaDrop(casinoConfig.magmaDrop, rng, risk);
    return { multiplier: o.multiplier, outcome: o };
  });
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r.outcome, bet: r.stake, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** casino/scratch/buy: one card, already paid if it wins (scratching it is only for show). */
export const scratchBuy: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, tier } = parseInput(ScratchBuySchema, ctx.request.body);
  const t = casinoConfig.scratch.tiers[tier];
  const level = await requireCasino(user, "scratch");
  if (level < t.level) throw casinoErr(`That ticket needs Brimstone Pit level ${t.level}.`, Status.CONFLICT);
  const r = await playInstant(user, "scratch", request_id, t.price, (rng) => {
    const o = playScratch(casinoConfig.scratch.prizes, rng);
    return { multiplier: o.multiplier, outcome: { ...o, tier } };
  });
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r.outcome, price: r.stake, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** casino/roulette/spin: one spin, every bet on the slip settled on the segment drawn. */
export const rouletteSpin: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, bets } = parseInput(RouletteSpinSchema, ctx.request.body);
  const rules = casinoConfig.roulette;
  const targets = rouletteTargets(rules);
  // the same place twice on a slip is one bet of both amounts
  const slip = new Map<string, number>();
  for (const b of bets) {
    if (!targets.includes(b.on)) throw casinoErr("That is not a place to bet.");
    if (b.amount < casinoConfig.minBet) throw casinoErr(`The smallest bet is ${casinoConfig.minBet} Shiny.`);
    slip.set(b.on, (slip.get(b.on) ?? 0) + b.amount);
  }
  if (slip.size > rules.maxBets) throw casinoErr(`Up to ${rules.maxBets} places on one spin.`);
  const placed = [...slip].map(([on, amount]) => ({ on, amount }));
  const stake = placed.reduce((a, b) => a + b.amount, 0);
  checkStake(stake);
  await requireCasino(user, "roulette");
  const r = await playInstant(user, "roulette", request_id, stake, (rng) => {
    const o = playRoulette(rules, rng, placed);
    return { multiplier: o.payout / stake, payout: o.payout, outcome: o.outcome };
  });
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r.outcome, bet: r.stake, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** casino/slots/spin: one pull; a part of it goes into the jackpot pool, which three King Wormzer win. */
export const slotsSpin: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, bet } = parseInput(SlotsSpinSchema, ctx.request.body);
  checkStake(bet);
  await requireCasino(user, "slots");
  type Out = SlotsOutcome & { jackpot_won: number; jackpot_share: number; pool: number };
  const r = await playInstant<Out>(user, "slots", request_id, bet, (rng) => {
    const o = playSlots(casinoConfig.slots, rng);
    return { multiplier: o.multiplier, outcome: { ...o, jackpot_won: 0, jackpot_share: 0, pool: 0 } };
  }, async (em, played, stake, userid) => {
    const j = await settleJackpot(em, stake, played.outcome.line === "jackpot", userid);
    return { bonus: j.bonus, outcome: { ...played.outcome, jackpot_won: j.bonus, jackpot_share: j.share, pool: j.pool } };
  });
  ctx.status = Status.OK;
  // (a spin sent again: its own pool is old news, the pool now is shown)
  const pool = r.replayed ? await jackpotPool() : r.outcome.pool;
  ctx.body = { error: 0, ...r.outcome, pool, bet: r.stake, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/**
 * casino/fortune/spin: one pull of Korath's Fortune, five lines at a fifth of the stake each. The whole
 * stake feeds the shared jackpot pool; a line of three King Wormzer wins that line's share of it.
 */
export const fortuneSpin: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, bet } = parseInput(FortuneSpinSchema, ctx.request.body);
  checkStake(bet);
  await requireCasino(user, "fortune");
  type Out = FortuneOutcome & { jackpot_won: number; jackpot_share: number; pool: number };
  const r = await playInstant<Out>(user, "fortune", request_id, bet, (rng) => {
    const o = playFortune(casinoConfig.slots, rng);
    return { multiplier: o.multiplier, outcome: { ...o, jackpot_won: 0, jackpot_share: 0, pool: 0 } };
  }, async (em, played, stake, userid) => {
    const j = await settleJackpot(em, stake, played.outcome.line === "jackpot", userid, stake / FORTUNE_LINES.length);
    return { bonus: j.bonus, outcome: { ...played.outcome, jackpot_won: j.bonus, jackpot_share: j.share, pool: j.pool } };
  });
  ctx.status = Status.OK;
  const pool = r.replayed ? await jackpotPool() : r.outcome.pool;
  ctx.body = { error: 0, ...r.outcome, pool, bet: r.stake, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** Moloch's Favor as the lobby shows it: the bet it plays at, and whether today's is still there. */
const favorState = async (user: User, level: number) => {
  const f = casinoConfig.favor;
  const opens = casinoConfig.unlockLevel.slots;
  if (!f.enabled || opens == null || level < opens) return { enabled: false };
  return { enabled: true, bet: f.bet, ready: await favorReady(user.userid) };
};

/**
 * casino/favor/spin: today's free Magma Slots spin, of `favor.bet` Shiny (10). Played like any
 * spin (the same strips, pays and jackpot share) but it costs nothing and adds nothing to the pool.
 */
export const favorSpin: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id } = parseInput(FavorSpinSchema, ctx.request.body);
  if (!casinoConfig.favor.enabled) throw casinoErr("Moloch's Favor is not on.", Status.CONFLICT);
  await requireCasino(user, "slots");
  const bet = casinoConfig.favor.bet;
  type Out = SlotsOutcome & { jackpot_won: number; jackpot_share: number; pool: number; free_bet: number };
  const r = await playInstant<Out>(user, "favor", request_id, bet, (rng) => {
    const o = playSlots(casinoConfig.slots, rng);
    return { multiplier: o.multiplier, outcome: { ...o, jackpot_won: 0, jackpot_share: 0, pool: 0, free_bet: bet } };
  }, async (em, played, stake, userid) => {
    // today's, once (a request sent again is answered from the ledger before this)
    const day = await sqlAll(em,
      `INSERT INTO bym.casino_player (user_id, favor_day) VALUES (?, (now() AT TIME ZONE 'utc')::date)
       ON CONFLICT (user_id) DO UPDATE SET favor_day = EXCLUDED.favor_day, updated_at = now()
       WHERE bym.casino_player.favor_day IS DISTINCT FROM EXCLUDED.favor_day RETURNING user_id`, [userid]);
    if (!day.length) throw casinoErr("You have had today's Favor. Moloch smiles again tomorrow.", Status.CONFLICT);
    const j = await settleJackpot(em, 0, played.outcome.line === "jackpot", userid, stake);
    return { bonus: j.bonus, outcome: { ...played.outcome, jackpot_won: j.bonus, jackpot_share: j.share, pool: j.pool } };
  }, true);
  ctx.status = Status.OK;
  const pool = r.replayed ? await jackpotPool() : r.outcome.pool;
  ctx.body = { error: 0, ...r.outcome, pool, bet: r.outcome.free_bet ?? bet, free: true, payout: r.payout, nonce: r.nonce, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** casino/live: the latest bets in the Pit, every player's (the Live tab, polled while it is open). */
export const casinoLive: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { limit } = parseInput(CasinoLiveSchema, ctx.request.body ?? {});
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(await liveBets(user.userid, limit ?? 30)), jackpot: await jackpotPool(), server_ts: Date.now() };
};

/** casino/bonepile/start: the bet taken, the Sabnox hidden; the game's id and the layout's hash. */
export const bonePileStart: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, bet, sabnox } = parseInput(BonePileStartSchema, ctx.request.body);
  const r = casinoConfig.bonePile;
  if (sabnox < r.minSabnox || sabnox > r.maxSabnox) throw casinoErr(`Choose ${r.minSabnox} to ${r.maxSabnox} Sabnox.`);
  checkStake(bet);
  await requireCasino(user, "bonepile");
  const s = await startBonePile(user, request_id, bet, sabnox);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...s.view, replayed: s.replayed, credits: visibleCredits(user, s.credits) };
};

/** casino/bonepile/reveal: one pile opened. (A game once started can be finished even if the Pit is not open.) */
export const bonePileReveal: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { session_id, tile } = parseInput(BonePileRevealSchema, ctx.request.body);
  const r = await revealBonePile(user, session_id, tile);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r.view, tile, safe: r.safe, payout: r.payout, credits: visibleCredits(user, r.credits) };
};

/** casino/bonepile/cashout: paid at the multiplier reached; the layout shown. */
export const bonePileCashout: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { session_id } = parseInput(BonePileCashoutSchema, ctx.request.body);
  const r = await cashoutBonePile(user, session_id);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r.view, payout: r.payout, replayed: r.replayed, credits: visibleCredits(user, r.credits) };
};

/** casino/ascent/state: the round everyone is on (polled about once a second by the game). */
export const ascentStateCtl: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(await ascentState(user.userid)), credits: await balance(user) };
};

/** casino/ascent/bet: a bet on the round open for bets, with an automatic cash-out or none. */
export const ascentBet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, round_id, bet, auto_cashout } = parseInput(AscentBetSchema, ctx.request.body);
  checkStake(bet);
  let auto: number | null = null;
  if (auto_cashout != null && auto_cashout > 0) {
    auto = Math.floor(auto_cashout * 100 + 1e-9) / 100;
    const r = casinoConfig.ascent;
    if (auto < r.minAuto || auto > r.maxCrash) throw casinoErr(`An automatic cash-out is from ${r.minAuto.toFixed(2)}x to ${r.maxCrash}x.`);
  }
  await requireCasino(user, "ascent");
  const r = await betAscent(user, request_id, round_id, bet, auto);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r, credits: visibleCredits(user, r.credits) };
};

/** casino/ascent/cashout: cashed out by hand, at the server's multiplier now (or too late). */
export const ascentCashout: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { round_id } = parseInput(AscentCashoutSchema, ctx.request.body);
  const r = await cashoutAscent(user, round_id);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r, credits: visibleCredits(user, r.credits) };
};

/** casino/derby/state: the race everyone is on (polled by the game). */
export const derbyStateCtl: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...(await derbyState(user.userid)), credits: await balance(user) };
};

/** casino/derby/bet: a slip on the race open for bets (one or more runners to win). */
export const derbyBet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { request_id, round_id, bets } = parseInput(DerbyBetSchema, ctx.request.body);
  const slip = new Map<string, number>();
  for (const b of bets) {
    if (b.amount < casinoConfig.minBet) throw casinoErr(`The smallest bet is ${casinoConfig.minBet} Shiny.`);
    slip.set(b.on, (slip.get(b.on) ?? 0) + b.amount);
  }
  const placed = [...slip].map(([on, amount]) => ({ on, amount }));
  checkStake(placed.reduce((a, b) => a + b.amount, 0));
  await requireCasino(user, "derby");
  const r = await betDerby(user, request_id, round_id, placed);
  ctx.status = Status.OK;
  ctx.body = { error: 0, ...r, credits: visibleCredits(user, r.credits) };
};
