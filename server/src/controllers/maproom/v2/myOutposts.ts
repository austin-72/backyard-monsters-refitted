import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";

/** Auto-bank adds each outpost's amount every 10 seconds (client AutoBankManager.autobank). */
const AUTOBANK_TICKS_PER_HOUR = 360;

/**
 * (No question marks in here: the driver reads every "?" as a parameter.)
 * Monsters housed, added up in the database so the (large) monsters blocks never leave it. `housed` holds a
 * count per monster, or in older saves a list per monster (see housedCounts in services/base/defenderHealth.ts).
 */
const HOUSED_TOTAL = `
  COALESCE((
    SELECT SUM(
      CASE jsonb_typeof(h.v)
        WHEN 'array' THEN jsonb_array_length(h.v)
        WHEN 'number' THEN GREATEST(FLOOR((h.v #>> '{}')::numeric), 0)
        WHEN 'string' THEN CASE WHEN (h.v #>> '{}') ~ '^[0-9]+(\\.[0-9]+){0,1}$' THEN FLOOR((h.v #>> '{}')::numeric) ELSE 0 END
        ELSE 0
      END)
    FROM jsonb_each(CASE WHEN jsonb_typeof(s.monsters -> 'housed') = 'object' THEN s.monsters -> 'housed' ELSE '{}'::jsonb END) AS h(k, v)
  ), 0)`;

interface OutpostRow {
  baseid: string;
  empirevalue: number | null;
  protected: number | null;
  damage: number | null;
  housed: string | number;
}

/**
 * POST|GET worldmapv2/myoutposts: the player's outposts for the Outposts list (client IoOutpostsPopup).
 *
 * Per outpost: map position, empire value, what it adds to the main yard per hour (the auto-bank
 * amounts the game recorded the last time the outpost was open; null if it never was), seconds of
 * damage protection left, and monsters housed. Only the player's own outposts, in the order the main
 * save lists them (the order "Next outpost" goes through).
 *
 * Two plain queries and no entities: with 1,500 outposts it takes a few milliseconds of server time
 * (loading them as entities took about 100 ms and blocked the server meanwhile).
 */
export const myOutposts: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const now = getCurrentDateTime();
  const db = postgres.em.getConnection();
  const saveId = (user.save as any)?.basesaveid;

  const [main] = saveId
    ? await db.execute<{ outposts: unknown; buildingresources: unknown }[]>(
        `SELECT outposts, buildingresources FROM bym.save WHERE basesaveid = ?`,
        [saveId]
      )
    : [];
  const listed = (Array.isArray(main?.outposts) ? main.outposts : []) as [number, number, string | number][];
  const banked = (main?.buildingresources && typeof main.buildingresources === "object" ? main.buildingresources : {}) as Record<string, any>;

  const rows = listed.length
    ? await db.execute<OutpostRow[]>(
        `SELECT s.baseid, s.empirevalue, s.protected, s.damage, ${HOUSED_TOTAL} AS housed
           FROM bym.save s
          WHERE s.saveuserid = ? AND s.type = ?`,
        [user.userid, BaseType.OUTPOST]
      )
    : [];
  const byId = new Map(rows.map((row) => [String(row.baseid), row]));

  const outposts = [];
  for (const entry of listed) {
    if (!Array.isArray(entry)) continue;
    const [x, y, id] = entry;
    const save = byId.get(String(id));
    if (!save) continue;
    const rates = banked[`b${id}`];
    const production = rates
      ? [1, 2, 3, 4].map((r) => Math.max(0, Math.round(Number(rates[`r${r}`] ?? 0) * AUTOBANK_TICKS_PER_HOUR)))
      : null;
    outposts.push({
      baseid: String(id),
      x,
      y,
      value: Number(save.empirevalue ?? 0),
      production,
      protection: Math.max(0, Number(save.protected ?? 0) - now),
      monsters: Number(save.housed) || 0,
      damage: Number(save.damage ?? 0),
    });
  }

  ctx.status = Status.OK;
  ctx.body = { error: 0, outposts, time: now };
};
