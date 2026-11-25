import { ATTACK_TIMEOUT } from "../../../services/base/isAttackActive.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { cellHeight, hexDistance, isUnder, portalsFor, underworldOn } from "../../../services/maproom/v2/underworld.js";
import { underworldConfig } from "../../../config/UnderworldConfig.js";
import { outpostNames } from "../../../services/maproom/v2/outpostNames.js";
import { harvesterRates, type HarvesterRow } from "../../../services/maproom/v2/outpostProduction.js";
import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";

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

/**
 * (QoL #319, 14 October) The jobs under way in an outpost when it was last saved and still running now: buildings
 * whose build, upgrade or fortify countdown (cB, cU, cF: seconds left at the save) is longer than the time since.
 * The list shows the outpost's idle workers from it.
 */
const num = (f: string) => `CASE WHEN (b.v ->> '${f}') ~ '^[0-9]+(\\.[0-9]+){0,1}$' THEN (b.v ->> '${f}')::numeric ELSE 0 END`;
const BUSY_JOBS = (now: number) => `
  COALESCE((
    SELECT count(*)
    FROM jsonb_each(CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN s.buildingdata ELSE '{}'::jsonb END) AS b(k, v)
    WHERE jsonb_typeof(b.v) = 'object'
      AND GREATEST(${num("cB")}, ${num("cU")}, ${num("cF")}) > (${Math.floor(now)} - COALESCE(s.savetime, 0))
  ), 0)`;

/**
 * (QoL #325, 14 October) Defenders left wounded by an attack: a health record per monster in place of the count
 * (`housed` lists), or a Monster Bunker's wounded (`mh`). Opening the outpost heals them (defenderHealth.ts), and so
 * does healOutposts.ts for all of them at once.
 */
export const WOUNDED = `(
  (jsonb_typeof(s.monsters -> 'housed') = 'object'
    AND EXISTS (SELECT 1 FROM jsonb_each(s.monsters -> 'housed') AS h(k, v) WHERE jsonb_typeof(h.v) = 'array'))
  OR (jsonb_typeof(s.buildingdata) = 'object'
    AND EXISTS (SELECT 1 FROM jsonb_each(s.buildingdata) AS w(k, v) WHERE jsonb_typeof(w.v) = 'object' AND (w.v -> 'mh') IS NOT NULL))
)`;

/**
 * (QoL #320, #321, 15 October) What the list shows of each outpost's room for monsters and its incubators: the
 * Compounds' levels (types 15 and 128, as [type, level]), the monsters housed by kind (the client knows each kind's
 * size), and the incubators (type 13) with those that have a queue (`mq`).
 */
const lvl = `CASE WHEN (b.v ->> 'l') ~ '^[0-9]+$' THEN (b.v ->> 'l')::int ELSE 1 END`;
const OF_BUILDINGS = `jsonb_each(CASE WHEN jsonb_typeof(s.buildingdata) = 'object' THEN s.buildingdata ELSE '{}'::jsonb END) AS b(k, v)`;
const COMPOUNDS = `
  COALESCE((
    SELECT jsonb_agg(jsonb_build_array((b.v ->> 't')::int, ${lvl}))
    FROM ${OF_BUILDINGS}
    WHERE jsonb_typeof(b.v) = 'object' AND (b.v ->> 't') IN ('15', '128')
  ), '[]'::jsonb)`;
const HOUSED_BY = `
  COALESCE((
    SELECT jsonb_object_agg(h.k,
      CASE jsonb_typeof(h.v)
        WHEN 'array' THEN jsonb_array_length(h.v)
        WHEN 'number' THEN GREATEST(FLOOR((h.v #>> '{}')::numeric), 0)
        WHEN 'string' THEN CASE WHEN (h.v #>> '{}') ~ '^[0-9]+(\\.[0-9]+){0,1}$' THEN FLOOR((h.v #>> '{}')::numeric) ELSE 0 END
        ELSE 0
      END)
    FROM jsonb_each(CASE WHEN jsonb_typeof(s.monsters -> 'housed') = 'object' THEN s.monsters -> 'housed' ELSE '{}'::jsonb END) AS h(k, v)
  ), '{}'::jsonb)`;
const INCUBATORS = `
  COALESCE((
    SELECT jsonb_build_array(count(*), count(*) FILTER (WHERE jsonb_typeof(b.v -> 'mq') = 'array' AND jsonb_array_length(b.v -> 'mq') > 0))
    FROM ${OF_BUILDINGS}
    WHERE jsonb_typeof(b.v) = 'object' AND (b.v ->> 't') = '13'
  ), '[0, 0]'::jsonb)`;

/**
 * (QoL #323, 15 October) The outpost's towers for the list's Towers column: how many (sharpshooter, quake, blast,
 * magma, cinder coil, obsidian mortar: the towers an outpost can build, IO_OUTPOST_QUANTITY in the game) and the
 * lowest fortification among them (`fort`; 0 when none is fortified), as [count, lowest fort].
 */
const fortLevel = `CASE WHEN (b.v ->> 'fort') ~ '^[0-9]+$' THEN (b.v ->> 'fort')::int ELSE 0 END`;
const DEFENCES = `
  COALESCE((
    SELECT jsonb_build_array(count(*), COALESCE(min(${fortLevel}), 0))
    FROM ${OF_BUILDINGS}
    WHERE jsonb_typeof(b.v) = 'object' AND (b.v ->> 't') IN ('21', '129', '130', '132', '144', '145')
  ), '[0, 0]'::jsonb)`;

/**
 * (QoL #322, 15 October) The outpost's harvesters (types 1-4) as [type, l, prefab, cU, health], health from
 * buildinghealthdata when it has the building, else the building's own `hp` (null: whole), as the game reads them
 * (BASE's load, BFOUNDATION.Setup). For an outpost the game has never written an auto-bank line for, its production
 * is worked out from them (services/maproom/v2/outpostProduction.ts).
 */
const HARVESTERS = `
  COALESCE((
    SELECT jsonb_agg(jsonb_build_array(b.v -> 't', b.v -> 'l', b.v -> 'prefab', b.v -> 'cU',
      CASE WHEN jsonb_typeof(s.buildinghealthdata) = 'object' AND (s.buildinghealthdata -> b.k) IS NOT NULL
        THEN s.buildinghealthdata -> b.k ELSE b.v -> 'hp' END))
    FROM ${OF_BUILDINGS}
    WHERE jsonb_typeof(b.v) = 'object' AND (b.v ->> 't') IN ('1', '2', '3', '4')
  ), '[]'::jsonb)`;

interface OutpostRow {
  baseid: string;
  empirevalue: number | null;
  protected: number | null;
  damage: number | null;
  housed: string | number;
  busy: string | number;
  wounded: boolean;
  /** (QoL #103) being attacked now (as isAttackActive) */
  attacked: boolean;
  compounds: [number, number][] | null;
  housedby: Record<string, number> | null;
  incubators: [number, number] | null;
  defences: [number, number] | null;
  /** (QoL #322) */
  harvesters: HarvesterRow[] | null;
}

/**
 * POST|GET worldmapv2/myoutposts: the player's outposts for the Outposts list (client IoOutpostsPopup).
 *
 * Per outpost: map position, empire value, what it adds to the main yard per hour (the auto-bank
 * amounts the game recorded the last time the outpost was open; null if it never was), seconds of
 * damage protection left, and monsters housed. Only the player's own outposts, in the order the main
 * save lists them (the order "Next outpost" goes through). (QoL #326) `name`: the name the player gave it, if any.
 * (QoL #322) An outpost with no auto-bank line (never opened since it was taken): its production worked out from its
 * harvesters, with `estimated: 1` (it adds nothing to the main yard until the game has written the line).
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
    ? await db.execute<{ outposts: unknown; buildingresources: unknown; worldid: string | null }[]>(
        `SELECT outposts, buildingresources, worldid FROM bym.save WHERE basesaveid = ?`,
        [saveId]
      )
    : [];
  const listed = (Array.isArray(main?.outposts) ? main.outposts : []) as [number, number, string | number][];
  const banked = (main?.buildingresources && typeof main.buildingresources === "object" ? main.buildingresources : {}) as Record<string, any>;

  const rows = listed.length
    ? await db.execute<OutpostRow[]>(
        `SELECT s.baseid, s.empirevalue, s.protected, s.damage, ${HOUSED_TOTAL} AS housed, ${BUSY_JOBS(now)} AS busy, ${WOUNDED} AS wounded,
                ${COMPOUNDS} AS compounds, ${HOUSED_BY} AS housedby, ${INCUBATORS} AS incubators, ${DEFENCES} AS defences,
                ${HARVESTERS} AS harvesters,
                (s.attackid <> 0 AND jsonb_typeof(s.attacks::jsonb) = 'array'
                  AND coalesce((s.attacks::jsonb -> -1 ->> 'starttime')::bigint, 0) > ${now - ATTACK_TIMEOUT}) AS attacked
           FROM bym.save s
          WHERE s.saveuserid = ? AND s.type = ?`,
        [user.userid, BaseType.OUTPOST]
      )
    : [];
  const byId = new Map(rows.map((row) => [String(row.baseid), row]));
  // (QoL #326, 15 October) the names the player gave their outposts (services/maproom/v2/outpostNames.ts)
  const names: Record<string, string> = listed.length ? await outpostNames(user.userid) : {};

  // (QoL #342, 15 October) a Depths outpost next to a portal's underworld end holds it (it opens the way back up:
  // services/maproom/v2/underworld.ts openExits); the list marks it with the portal's number
  const portals = underworldOn() && main?.worldid ? portalsFor(main.worldid) : [];
  const portalHeld = (x: number, y: number): number | undefined => {
    if (!portals.length || !isUnder(x, y)) return undefined;
    return portals.find((p) => hexDistance(x, y, p.ux, p.uy) <= underworldConfig.outpostRange)?.i;
  };

  const outposts = [];
  for (const entry of listed) {
    if (!Array.isArray(entry)) continue;
    const [x, y, id] = entry;
    const save = byId.get(String(id));
    if (!save) continue;
    const rates = banked[`b${id}`];
    let production = rates
      ? [1, 2, 3, 4].map((r) => Math.max(0, Math.round(Number(rates[`r${r}`] ?? 0) * AUTOBANK_TICKS_PER_HOUR)))
      : null;
    // (QoL #322, 15 October) never opened since it was taken: worked out from its harvesters and its cell's height
    let estimated = false;
    if (!production && infernoOnlyConfig.enabled) {
      const height = main?.worldid ? cellHeight(main.worldid, Number(x), Number(y)) : 0;
      const worked = harvesterRates(Array.isArray(save.harvesters) ? save.harvesters : [], height);
      production = [1, 2, 3, 4].map((r) => Math.max(0, Math.round(Number(worked[`r${r}`] ?? 0) * AUTOBANK_TICKS_PER_HOUR)));
      estimated = true;
    }
    const portal = portalHeld(Number(x), Number(y));
    outposts.push({
      baseid: String(id),
      x,
      y,
      value: Number(save.empirevalue ?? 0),
      production,
      // (QoL #322) worked out on the server, not yet added to the main yard
      ...(estimated && { estimated: 1 }),
      protection: Math.max(0, Number(save.protected ?? 0) - now),
      monsters: Number(save.housed) || 0,
      damage: Number(save.damage ?? 0),
      busy: Number(save.busy) || 0,
      wounded: save.wounded ? 1 : 0,
      attacked: save.attacked ? 1 : 0,
      compounds: Array.isArray(save.compounds) ? save.compounds : [],
      housedBy: save.housedby && typeof save.housedby === "object" ? save.housedby : {},
      incubators: Array.isArray(save.incubators) ? save.incubators.map((n) => Number(n) || 0) : [0, 0],
      // (QoL #323) [towers, lowest fortification]
      defences: Array.isArray(save.defences) ? save.defences.map((n) => Number(n) || 0) : [0, 0],
      // (QoL #342) the portal it holds, when it does
      ...(portal !== undefined && { portal }),
      // (QoL #326) its name, when the player gave it one
      ...(names[String(id)] && { name: names[String(id)] }),
    });
  }

  ctx.status = Status.OK;
  ctx.body = { error: 0, outposts, time: now };
};
