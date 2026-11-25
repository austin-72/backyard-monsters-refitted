import { AllianceMessageType, AlliancePowerupType } from "../../enums/Alliance.js";
import { AlliancePowerup } from "../../database/models/alliancepowerup.model.js";
import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import {
  notEnoughShinyErr,
  powerupNotReadyErr,
  powerupReadyErr,
  powerupRunningErr,
  powerupUnknownErr,
  powerupNoPlanErr,
  powerupPlanTimeErr,
  powerupPlanChargeErr,
} from "../../errors/errors.js";
import { POWERUP_PLAN, POWERUP_RULES, powerupTier, rechargeTimeOf, runTimeOf, type PowerupRules } from "../../config/AllianceConfig.js";
import { announceShout } from "./allianceMessages.js";
import { notePowerupRan } from "./powerupWatch.js";

interface Powerup {
  rules: PowerupRules;
  status: AlliancePowerup;
}

export interface PowerupPurchase {
  allianceId: number;
  author: User;
  userSave: PayingSave;
  powerupId: number;
  hours: number;
}

export interface PowerupActivation {
  allianceId: number;
  author: User;
  powerupId: number;
  /** Inferno-only (22 October): 2 runs longer and charges longer after (AllianceConfig POWERUP_TIER2). */
  tier?: number;
}


interface RunningPowerup {
  id: AlliancePowerupType;
  endtime: number;
}

type PayingSave = Pick<Save, "credits"> & Partial<Pick<Save, "basesaveid">>;

/**
 * Loads an alliance's power-ups, seeding and expiring them as it goes.
 
 * A power-up an alliance has never held is created charging from now rather than
 * from the alliance's creation date, so alliances that predate this table start a
 * charge instead of appearing instantly ready.
 *
 * @param {number} allianceId - The alliance whose power-ups are being read.
 * @returns {Promise<Powerup[]>} All the power-ups (POWERUP_RULES), in tab order.
 */
export const alliancePowerup = async (allianceId: number): Promise<Powerup[]> => {
  const rows = await postgres.em.find(AlliancePowerup, { alliance_id: allianceId });

  const now = getCurrentDateTime();

  const powerups: Powerup[] = [];
  for (const rules of POWERUP_RULES) {
    let status = rows.find((row) => row.powerup === rules.type);

    if (!status) {
      status = postgres.em.create(AlliancePowerup, {
        alliance_id: allianceId,
        powerup: rules.type,
        active: false,
        end_time: now + rules.recharge_time,
        tier: 1,
        updated_at: new Date(),
      });

      postgres.em.persist(status);
    } else if (status.active && status.end_time <= now) {
      // (18 October, SUSPECTED-BUGS.md: a run's end was written from a copy read without a lock, so Shiny paid for
      // hours at that moment (the purchase locks the row) could be written over: one conditional update now)
      const [row] = await powerupSql<{ active: boolean; end_time: number }>(
        `UPDATE bym.alliance_powerup SET active = false, end_time = end_time + (CASE WHEN tier = 2 THEN ? ELSE ? END), updated_at = now()
          WHERE alliance_id = ? AND powerup = ? AND active AND end_time <= ? RETURNING active, end_time`,
        [rechargeTimeOf(rules, 2), rules.recharge_time, allianceId, rules.type, now]
      );
      const cur = row ?? (await powerupSql<{ active: boolean; end_time: number }>(`SELECT active, end_time FROM bym.alliance_powerup WHERE alliance_id = ? AND powerup = ?`, [allianceId, rules.type]))[0];
      if (cur) told(status, { active: Boolean(cur.active), end_time: Number(cur.end_time) });
    } else if (!status.active && status.end_time > now + rechargeTimeOf(rules, status.tier)) {
      // A charge started under a longer recharge time (the rules were shortened): cap it. (Inferno-only, 22 October:
      // the charge after a Tier II run is its own, longer one)
      status.end_time = now + rechargeTimeOf(rules, status.tier);
    }

    powerups.push({ rules, status });
  }

  await postgres.em.flush();

  return powerups;
};

const powerupSql = async <T>(query: string, params: unknown[]) => (await postgres.em.getConnection().execute(query, params, "all")) as T[];

/** Tells an entity values the database already has, without a write of its own: its next flush must not set them back. */
const told = (entity: object, values: Record<string, unknown>) => {
  Object.assign(entity, values);
  try {
    const meta = postgres.em.getUnitOfWork().getOriginalEntityData(entity as Save);
    if (meta) Object.assign(meta as Record<string, unknown>, values);
  } catch {
    // (no original data: nothing to set back)
  }
};

/**
 * Starts a charged power-up, buffing every member of the alliance for its running time.
 *
 * @param {number} allianceId - The alliance starting it.
 * @param {number} powerupId - Which power-up, from the getpowerups rows.
 * @returns {Promise<Powerup[]>} All the alliance's power-ups, the started one updated.
 * @throws {ClientSafeError} When the id is unknown, or it is already running or still charging.
 */
export const startPowerup = async ({ allianceId, author, powerupId, tier: tier0 }: PowerupActivation): Promise<Powerup[]> => {
  const powerups: Powerup[] = await alliancePowerup(allianceId);

  const powerup = powerups.find(({ rules }) => rules.powerup_id === powerupId);
  
  if (!powerup) throw powerupUnknownErr();

  const { rules, status } = powerup;
  const now = getCurrentDateTime();

  if (status.active) throw powerupRunningErr();
  if (status.end_time > now) throw powerupNotReadyErr();

  // (18 October, SUSPECTED-BUGS.md: two activations at once both started it: two "activated" lines, the quest
  // counted twice) started only if it still isn't running and is charged
  // (Inferno-only, 22 October: at a tier; a start planned for it is spent)
  const tier = powerupTier(tier0);
  const [started] = await powerupSql<{ end_time: number }>(
    `UPDATE bym.alliance_powerup SET active = true, end_time = ?, tier = ?, plan_at = NULL, plan_tier = NULL, plan_by = NULL, updated_at = now()
      WHERE alliance_id = ? AND powerup = ? AND NOT active AND end_time <= ? RETURNING end_time`,
    [now + runTimeOf(rules, tier), tier, allianceId, rules.type, now]
  );
  if (!started) throw powerupRunningErr();
  told(status, { active: true, end_time: Number(started.end_time), tier, plan_at: null, plan_tier: null, plan_by: null });
  // (QoL #180: so its end is announced in the alliance's chat)
  await notePowerupRan(allianceId, rules.type, status.end_time);

  await announceShout({
    allianceId,
    author,
    type: AllianceMessageType.POWERUP_ACTIVATED,
    // (a Tier II start says so: JSON then; a plain start is the type alone, as before)
    body: tier === 2 ? JSON.stringify({ powerup: rules.type, tier, hours: Math.round(runTimeOf(rules, tier) / 3600) }) : rules.type,
  });

  return powerups;
};

/**
 * Inferno-only (22 October, the user's pick "C"): plans (or, at 0, cancels) a power-up's start. It must not be running,
 * and must be charged by then; from POWERUP_PLAN.soonest to .latest ahead. Told in the alliance's chat.
 */
export const planPowerup = async ({ allianceId, author, powerupId, tier: tier0, at }: PowerupActivation & { at: number }): Promise<Powerup[]> => {
  const powerups: Powerup[] = await alliancePowerup(allianceId);
  const powerup = powerups.find(({ rules }) => rules.powerup_id === powerupId);
  if (!powerup) throw powerupUnknownErr();
  const { rules, status } = powerup;
  const now = getCurrentDateTime();
  const tier = powerupTier(tier0);
  if (!at) {
    if (!status.plan_at) throw powerupNoPlanErr();
    await powerupSql(`UPDATE bym.alliance_powerup SET plan_at = NULL, plan_tier = NULL, plan_by = NULL WHERE alliance_id = ? AND powerup = ? RETURNING 1`, [allianceId, rules.type]);
    told(status, { plan_at: null, plan_tier: null, plan_by: null });
    await announceShout({ allianceId, author, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: rules.type, state: "unplanned" }) });
    return powerups;
  }
  at = Math.floor(at);
  if (status.active) throw powerupRunningErr();
  if (at < now + POWERUP_PLAN.soonest || at > now + POWERUP_PLAN.latest) {
    throw powerupPlanTimeErr();
  }
  if (status.end_time > at) {
    throw powerupPlanChargeErr();
  }
  const [row] = await powerupSql<{ plan_at: number }>(
    `UPDATE bym.alliance_powerup SET plan_at = ?, plan_tier = ?, plan_by = ? WHERE alliance_id = ? AND powerup = ? AND NOT active AND end_time <= ? RETURNING plan_at`,
    [at, tier, author.userid, allianceId, rules.type, at]
  );
  if (!row) throw powerupRunningErr();
  told(status, { plan_at: at, plan_tier: tier, plan_by: author.userid });
  await announceShout({ allianceId, author, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: rules.type, state: "planned", at, tier, hours: Math.round(runTimeOf(rules, tier) / 3600) }) });
  return powerups;
};

/**
 * Inferno-only (22 October): the planned starts that are due, started (the power-up watch, every 15 seconds), and a
 * reminder in chat POWERUP_PLAN.remindBefore ahead. A start that can't happen then (still charging, already running)
 * is dropped and said so.
 */
export const runPlannedPowerups = async (): Promise<number> => {
  const now = getCurrentDateTime();
  const rows = await powerupSql<{ alliance_id: number; powerup: string; plan_at: number; plan_tier: number; plan_by: number }>(
    `SELECT alliance_id, powerup, plan_at, plan_tier, plan_by FROM bym.alliance_powerup WHERE plan_at IS NOT NULL AND plan_at <= ?`,
    [now + POWERUP_PLAN.remindBefore]
  );
  let started = 0;
  // (outside a request: its own EntityManager, as the power-up watch's notices have)
  const em = postgres.orm.em.fork();
  for (const row of rows) {
    const rules = POWERUP_RULES.find((r) => r.type === row.powerup);
    if (!rules) continue;
    const author = await em.findOne(User, { userid: row.plan_by });
    if (Number(row.plan_at) > now) {
      // (the reminder, once)
      const first = (await redis.set(`alliance:pwsoon:${row.alliance_id}:${row.powerup}:${row.plan_at}`, "1", "EX", String(2 * 86_400), "NX")) === "OK";
      if (first && author) {
        await announceShout({ allianceId: row.alliance_id, author, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: row.powerup, state: "soon", at: row.plan_at }), em });
      }
      continue;
    }
    // (taken by one server only: the plan cleared as it's taken)
    const [took] = await powerupSql<{ plan_at: number }>(
      `UPDATE bym.alliance_powerup SET plan_at = NULL, plan_tier = NULL, plan_by = NULL WHERE alliance_id = ? AND powerup = ? AND plan_at = ? RETURNING plan_at`,
      [row.alliance_id, row.powerup, row.plan_at]
    );
    if (!took) continue;
    const tier = powerupTier(row.plan_tier);
    const [ok] = await powerupSql<{ end_time: number }>(
      `UPDATE bym.alliance_powerup SET active = true, end_time = ?, tier = ?, updated_at = now()
        WHERE alliance_id = ? AND powerup = ? AND NOT active AND end_time <= ? RETURNING end_time`,
      [now + runTimeOf(rules, tier), tier, row.alliance_id, row.powerup, now]
    );
    if (!author) continue;
    if (ok) {
      started++;
      await notePowerupRan(row.alliance_id, row.powerup, Number(ok.end_time));
      await announceShout({ allianceId: row.alliance_id, author, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: row.powerup, state: "plan_started", tier, hours: Math.round(runTimeOf(rules, tier) / 3600) }), em });
    } else {
      await announceShout({ allianceId: row.alliance_id, author, type: AllianceMessageType.POWERUP_STATE, body: JSON.stringify({ powerup: row.powerup, state: "plan_failed" }), em });
    }
  }
  return started;
};

/** One getpowerups row for the client (the Power-ups tab): its rules at its tier, the two tiers, a planned start. */
export const powerupRow = ({ rules, status }: Powerup) => ({
  powerup_id: rules.powerup_id,
  type: rules.type,
  active: status.active,
  endTime: status.end_time,
  hourly_cost: rules.hourly_cost,
  total_running_time: runTimeOf(rules, status.tier),
  total_recharge_time: rechargeTimeOf(rules, status.tier),
  tier: powerupTier(status.tier),
  // (Inferno-only, 22 October: what each tier runs and charges, and a planned start)
  tiers: [1, 2].map((t) => ({ tier: t, run: runTimeOf(rules, t), recharge: rechargeTimeOf(rules, t) })),
  plan_at: status.plan_at ?? 0,
  plan_tier: status.plan_tier ?? 0,
});

/**
 * Spends Shiny to bring a charging power-up closer to ready.
 *
 * @param {PowerupPurchase} purchase - Alliance, paying save, power-up and hours asked for.
 * @returns {Promise<Powerup[]>} All the alliance's power-ups, the sped-up one updated.
 * @throws {ClientSafeError} When the id is unknown, it is running or already charged, or Shiny is short.
 */
export const reducePowerupCharge = async ({ allianceId, author, userSave, powerupId, hours }: PowerupPurchase) => {
  const powerups = await alliancePowerup(allianceId);

  const powerup = powerups.find(({ rules }) => rules.powerup_id === powerupId);
  if (!powerup) throw powerupUnknownErr();

  const { rules, status } = powerup;
  const now = getCurrentDateTime();

  if (status.active) throw powerupRunningErr();

  if (status.end_time <= now) throw powerupReadyErr();

  // (13 October) the charge is read under a row lock and the Shiny taken in the same transaction, in the database:
  // the balance read and written back whole let three speed-ups sent at once be paid once (each read the same
  // balance) and put back Shiny another request had taken meanwhile; and the charge, read before and written
  // after, let two speed-ups at once each be paid while the charge came down once
  type Row = { active: boolean; end_time: number };
  let boughtHours = 0;
  let endTime = status.end_time;
  if (userSave.basesaveid) {
    const basesaveid = userSave.basesaveid;
    const credits = await postgres.em.fork().transactional(async (tx) => {
      const run = async <T>(sql: string, params: unknown[]) =>
        (await tx.getConnection().execute(sql, params, "all", tx.getTransactionContext())) as T[];
      const [row] = await run<Row>(
        `SELECT active, end_time FROM bym.alliance_powerup WHERE alliance_id = ? AND powerup = ? FOR UPDATE`,
        [allianceId, rules.type]
      );
      if (!row) throw powerupUnknownErr();
      if (row.active) throw powerupRunningErr();
      if (row.end_time <= now) throw powerupReadyErr();
      boughtHours = Math.min(hours, Math.ceil((row.end_time - now) / 3600));
      const cost = boughtHours * rules.hourly_cost;
      const paid = await run<{ credits: number }>(
        `UPDATE bym.save SET credits = credits - ? WHERE basesaveid = ? AND credits >= ? RETURNING credits`,
        [cost, basesaveid, cost]
      );
      if (paid.length !== 1) throw notEnoughShinyErr();
      endTime = Math.max(now, row.end_time - boughtHours * 3600);
      await run(
        `UPDATE bym.alliance_powerup SET end_time = ?, updated_at = now() WHERE alliance_id = ? AND powerup = ?`,
        [endTime, allianceId, rules.type]
      );
      return paid[0].credits;
    });
    // (the entities told the new values without writes of their own: their next flush must not set them back)
    told(userSave, { credits });
    told(status, { end_time: endTime });
  } else {
    const remainingHours = Math.ceil((status.end_time - now) / 3600);
    boughtHours = Math.min(hours, remainingHours);
    const cost = boughtHours * rules.hourly_cost;
    if (userSave.credits < cost) throw notEnoughShinyErr();
    userSave.credits -= cost;
    status.end_time = Math.max(now, status.end_time - boughtHours * 3600);
  }

  await postgres.em.flush();

  await announceShout({
    allianceId,
    author,
    type: AllianceMessageType.POWERUP_PURCHASE,
    body: JSON.stringify({ powerup: rules.type, hours: boughtHours }),
  });

  return powerups;
};

/**
 * The alliance's running power-ups, in the shape base load hands the client.
 *
 * @param {User["alliance_id"]} allianceId - The viewing player's alliance, if any.
 * @returns {Promise<RunningPowerup[]>} Rows for POWERUPS.Setup.
 */
export const runningPowerups = async (allianceId: User["alliance_id"]): Promise<RunningPowerup[]> => {
  if (!allianceId) return [];

  const now = getCurrentDateTime();

  // Read only: this runs on every base load and every half-minute poll of every member. Running means
  // started and not ended, whatever state the row's charge is in; the rows are brought up to date (and
  // written) by the alliance's power-up window, not here. It used to flush the whole unit of work (the
  // player's full save included) on every poll.
  const rows = await postgres.em.fork().find(
    AlliancePowerup,
    { alliance_id: allianceId, active: true, end_time: { $gt: now } },
    { fields: ["powerup", "end_time"] }
  );

  return rows.map((row) => ({ id: row.powerup, endtime: row.end_time }));
};
