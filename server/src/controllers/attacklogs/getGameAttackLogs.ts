import { AttackLogs } from "../../database/models/attacklogs.model.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { replaysForLogs } from "../../services/replays/replays.js";

/** The most recent this many of each side are listed. */
const LIMIT = 60;

const lootOf = (loot: unknown) => {
  const l = (loot ?? {}) as Record<string, unknown>;
  return ["r1", "r2", "r3", "r4"].map((k) => Math.max(0, Math.round(Number(l[k]) || 0)));
};

const seconds = (d: Date | null | undefined) => (d ? Math.floor(new Date(d).getTime() / 1000) : 0);

/**
 * Inferno-only: the game's attack logs (the top bar's Attack Logs button, IoAttackLogs.as). Always fresh,
 * the player's own only.
 *
 * - no `id`: { error: 0, now, mine: [...], onme: [...] }, the most recent first, each row
 *   [id, attacktime, other side's name, other side's userid (0: a tribe), yard type, x, y, level, damage,
 *    buildings destroyed, ended (0/1), [loot r1..r4], replay key ("": none)];
 * - `id`: { error: 0, id, report } the battle report of one of the player's logs (its html, as the attack's
 *   client wrote it: ATTACK.LogRead).
 */
export const getGameAttackLogs: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!infernoOnlyConfig.enabled) {
    ctx.body = { error: "There are no attack logs here." };
    return;
  }
  const { userid }: User = ctx.authUser;
  const params = { ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) } as Record<string, unknown>;
  const em = postgres.em.fork();

  const id = Math.floor(Number(params.id) || 0);
  if (id > 0) {
    const log = await em.findOne(AttackLogs, { id, $or: [{ attacker_userid: userid }, { defender_userid: userid }] });
    if (!log) {
      ctx.body = { error: "That attack log isn't here any more." };
      return;
    }
    const report = (log.attackreport ?? {}) as Record<string, unknown>;
    ctx.body = { error: 0, id, report: typeof report.html === "string" ? report.html : "" };
    return;
  }

  const fields = [
    "id", "attacktime", "attacker_userid", "attacker_username", "defender_userid", "defender_username",
    "type", "x", "y", "level", "damage", "destroyed", "ended", "loot",
  ] as const;
  const [mine, onme] = await Promise.all([
    em.find(AttackLogs, { attacker_userid: userid }, { orderBy: { attacktime: "DESC" }, limit: LIMIT, fields }),
    em.find(AttackLogs, { defender_userid: userid, attacker_userid: { $ne: userid } }, { orderBy: { attacktime: "DESC" }, limit: LIMIT, fields }),
  ]);
  // Inferno-only: the attacks with a replay (player against player) carry its key, last in the row
  const replays = await replaysForLogs([...mine, ...onme].map((l) => l.id));
  const row = (l: (typeof mine)[number], attacker: boolean) => [
    l.id,
    seconds(l.attacktime),
    attacker ? l.defender_username : l.attacker_username,
    attacker ? l.defender_userid : l.attacker_userid,
    l.type,
    l.x ?? -1,
    l.y ?? -1,
    l.level ?? 0,
    l.damage ?? 0,
    l.destroyed ?? 0,
    l.ended ? 1 : 0,
    lootOf(l.loot),
    replays.get(l.id) ?? "",
  ];
  ctx.body = {
    error: 0,
    now: Math.floor(Date.now() / 1000),
    mine: mine.map((l) => row(l, true)),
    onme: onme.map((l) => row(l, false)),
  };
};
