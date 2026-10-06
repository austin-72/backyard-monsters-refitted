import { User } from "../../database/models/user.model.js";
import { Save } from "../../database/models/save.model.js";
import { World } from "../../database/models/world.model.js";
import { WorldMapCell } from "../../database/models/worldmapcell.model.js";
import { BaseType } from "../../enums/Base.js";
import { MapRoom2, MapRoomCell, MapRoomVersion, Terrain } from "../../enums/MapRoom.js";
import { postgres, redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { generateBaseId } from "../../utils/generateBaseId.js";
import { tribeSaveHandler } from "../maproom/tribeSaveHandler.js";
import { generateNoise, getTerrainHeight } from "../maproom/v2/generateMap.js";
import { logger } from "../../utils/logger.js";
import { isAdmin, logAdminAction } from "./admin.js";
import { isWildAttackActive } from "../base/isAttackActive.js";
import { clearTestGauntlet } from "../events/gauntlet.js";

/**
 * Inferno-only admin test mode: a switch next to the game's Admin button. While it is on, the admin has
 * unlimited resources and shiny, builds and upgrades finish at once, placement limits are gone, every
 * monster is unlocked, attacks are practice (nothing is written to the yard attacked) and a few test tools
 * work (spawn monsters, a wild attack now, repair, protection, take a map cell or make it wild).
 *
 * Switching on takes a snapshot of the admin's own account (the main yard, outposts and their map cells,
 * shiny and resources are in those saves); switching off puts it back, so nothing done while testing stays.
 * It is switched off, and the snapshot put back, when the admin switches account in the game, or on their
 * next login (closing the game counts: the next start logs in again).
 *
 * State: test mode is on while the admin has a row in table `bym.admin_test_snapshot` (migration
 * 20260925_AddAdminTestMode), the snapshot itself; Redis set `admin:testmode:users` mirrors it for the
 * leaderboards. All snapshot and restore work is done in SQL, inside the database, in one transaction,
 * with the snapshot row locked, so two switch-offs at once (a login and the switch) restore once.
 * While it is on, other players can't attack the admin's yards (they hold the test shiny and resources).
 */

const KEY = (userid: number) => `admin:testmode:${userid}`;
export const TEST_USERS_KEY = "admin:testmode:users";

/** What the admin has while testing. */
export const TEST_SHINY = 9_999_999;
export const TEST_RESOURCES = 999_999_999;

/** Own saves the snapshot covers. */
const OWN_TYPES = `('${BaseType.MAIN}', '${BaseType.OUTPOST}', '${BaseType.INFERNO}')`;

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------

/** Test mode is on: the snapshot row exists (the database, not Redis, decides). */
export const isTestModeOn = async (userid: number) => {
  if (!Number.isInteger(userid) || userid <= 0) return false;
  const rows = await postgres.em.getConnection().execute<{ n: number }[]>(
    `SELECT 1 AS n FROM bym.admin_test_snapshot WHERE userid = ${userid} LIMIT 1`
  );
  return rows.length > 0;
};

/** Test mode is on for this user (an admin). Remembered on the user object for the rest of the request. */
export const isTestMode = async (user?: User | null): Promise<boolean> => {
  if (!user || !isAdmin(user)) return false;
  const cached = (user as unknown as { __ioTest?: boolean }).__ioTest;
  if (cached !== undefined) return cached;
  const on = await isTestModeOn(user.userid);
  (user as unknown as { __ioTest?: boolean }).__ioTest = on;
  return on;
};

/** Users in test mode, for queries that must leave them out (the leaderboards). */
export const testModeUserIds = async (): Promise<number[]> =>
  ((await redis.smembers(TEST_USERS_KEY)) ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);

const clearRankingCaches = async () => {
  try {
    // SCAN, not KEYS: KEYS blocks Redis while it walks every key.
    let cursor = "0";
    do {
      const [next, keys] = (await redis.send("SCAN", [cursor, "MATCH", "leaderboards_*", "COUNT", "500"])) as [string, string[]];
      cursor = String(next);
      if (keys && keys.length) await redis.send("DEL", keys);
    } while (cursor !== "0");
  } catch (err) {
    logger.warn(`Test mode: could not clear the leaderboard cache: ${err}`);
  }
};

// ---------------------------------------------------------------------------------------------
// Snapshot and restore
// ---------------------------------------------------------------------------------------------

/** A table's columns, read each time (a migration run against a live server adds some). */
const columns = async (table: string) => {
  const rows = await postgres.em.getConnection().execute<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'bym' AND table_name = ? ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((r) => r.column_name);
};

const upsertSet = (cols: string[], key: string) =>
  cols.filter((c) => c !== key).map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");

/**
 * Runs statements in one transaction. No question marks in the SQL text other than parameters.
 * With `lock`, that query runs first (a SELECT ... FOR UPDATE); when it finds no row, nothing runs and
 * the result is false.
 */
const inTransaction = async (statements: [string, unknown[]][], lock?: [string, unknown[]]) =>
  postgres.em.fork().transactional(async (em) => {
    const connection = em.getConnection();
    const ctx = em.getTransactionContext();
    if (lock) {
      const rows = (await connection.execute(lock[0], lock[1], "all", ctx)) as unknown[];
      if (!rows.length) return false;
    }
    for (const [sql, params] of statements) await connection.execute(sql, params, "run", ctx);
    return true;
  });

export const startTestMode = async (user: User) => {
  if (!isAdmin(user)) throw new Error("Admins only.");
  if (await isTestModeOn(user.userid)) return;

  const saveId = (user.save as unknown as { basesaveid?: number })?.basesaveid;
  if (!saveId) throw new Error("No main yard.");
  // Moloch's Gauntlet: a fresh test ladder each time.
  await clearTestGauntlet(user.userid);

  await inTransaction([
    [
      `INSERT INTO bym.admin_test_snapshot (userid, taken_at, saves, cells)
       VALUES (?, now(),
         (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM bym.save s WHERE s.saveuserid = ? AND s.type IN ${OWN_TYPES}),
         (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM bym.world_map_cell c WHERE c.uid = ?))
       ON CONFLICT (userid) DO NOTHING`,
      [user.userid, user.userid, user.userid],
    ],
    // Unlimited while testing: more shiny and resources than anything costs. Only when this transaction
    // took the snapshot (taken_at = now(), its start): a second switch-on at the same moment waits for
    // the first, inserts nothing, and must not count the test values as the account's own.
    [
      `UPDATE bym.save
          SET credits = ?,
              resources = coalesce(resources, '{}'::jsonb) || jsonb_build_object('r1', ?::bigint, 'r2', ?::bigint, 'r3', ?::bigint, 'r4', ?::bigint)
        WHERE basesaveid = ?
          AND EXISTS (SELECT 1 FROM bym.admin_test_snapshot t WHERE t.userid = ? AND t.taken_at = now())`,
      [TEST_SHINY, TEST_RESOURCES, TEST_RESOURCES, TEST_RESOURCES, TEST_RESOURCES, saveId, user.userid],
    ],
  ]);

  await redis.set(KEY(user.userid), JSON.stringify({ since: getCurrentDateTime() }));
  await redis.sadd(TEST_USERS_KEY, String(user.userid));
  await clearRankingCaches();
  await logAdminAction(user, "testModeOn", null, "admin test mode on (snapshot taken)");
};

/**
 * Switches test mode off and puts the snapshot back:
 *  1. own saves made while testing (outposts taken) are deleted, and their map cells;
 *  2. the snapshot's map cells are put back (a tribe cell stored at the same place meanwhile goes; a
 *     place another player has taken meanwhile is left to them, with the outpost that was there);
 *  3. the snapshot's saves are put back as they were (main yard, shiny and resources included).
 */
export const endTestMode = async (user: User, reason: string) => {
  if (!(await isTestModeOn(user.userid))) {
    // Redis may still say on (the database was put back, or a crash between the two): tidy it.
    await redis.del(KEY(user.userid));
    await redis.srem(TEST_USERS_KEY, String(user.userid));
    return false;
  }

  const saveCols = await columns("save");
  const cellCols = await columns("world_map_cell");
  const uid = user.userid;

  // The snapshot row is locked first; a second switch-off at the same moment waits, then finds it gone
  // and does nothing (without the lock it would delete every outpost as "made while testing").
  const restored = await inTransaction([
      // 1. saves and cells made while testing
      [
        `DELETE FROM bym.save s
          WHERE s.saveuserid = ? AND s.type IN ('${BaseType.OUTPOST}', '${BaseType.INFERNO}')
            AND s.basesaveid NOT IN (
              SELECT (e ->> 'basesaveid')::int FROM bym.admin_test_snapshot t, jsonb_array_elements(t.saves) e WHERE t.userid = ?)`,
        [uid, uid],
      ],
      [
        `DELETE FROM bym.world_map_cell c
          WHERE c.uid = ?
            AND c.cellid NOT IN (
              SELECT (e ->> 'cellid')::int FROM bym.admin_test_snapshot t, jsonb_array_elements(t.cells) e WHERE t.userid = ?)`,
        [uid, uid],
      ],
      // 2. cells: tribe cells stored meanwhile at the snapshot's places go (with their tribe saves)
      [
        `DELETE FROM bym.save s
          USING bym.admin_test_snapshot t, jsonb_array_elements(t.saves) e
          WHERE t.userid = ? AND s.baseid = e ->> 'baseid' AND s.type = '${BaseType.TRIBE}'`,
        [uid],
      ],
      [
        `DELETE FROM bym.world_map_cell c
          USING bym.admin_test_snapshot t, jsonb_array_elements(t.cells) e
          WHERE t.userid = ? AND c.cellid <> (e ->> 'cellid')::int
            AND c.world_id = e ->> 'world_id' AND c.map_version = (e ->> 'map_version')::int
            AND c.x = (e ->> 'x')::int AND c.y = (e ->> 'y')::int
            AND c.base_type = ${MapRoomCell.WM}`,
        [uid],
      ],
      [
        `INSERT INTO bym.world_map_cell (${cellCols.map((c) => `"${c}"`).join(", ")})
         SELECT r.* FROM bym.admin_test_snapshot t, jsonb_array_elements(t.cells) e,
                jsonb_populate_record(NULL::bym.world_map_cell, e) r
          WHERE t.userid = ?
            AND NOT EXISTS (
              SELECT 1 FROM bym.world_map_cell o
               WHERE o.cellid <> r.cellid AND o.world_id = r.world_id AND o.map_version = r.map_version
                 AND o.x = r.x AND o.y = r.y)
         ON CONFLICT (cellid) DO UPDATE SET ${upsertSet(cellCols, "cellid")}
           WHERE bym.world_map_cell.uid = EXCLUDED.uid`,
        [uid],
      ],
      // 3. saves (a save whose cell could not be put back keeps no cell link)
      [
        `INSERT INTO bym.save (${saveCols.map((c) => `"${c}"`).join(", ")})
         SELECT ${saveCols
           .map((c) =>
             c === "cell_cellid"
               ? `(SELECT c.cellid FROM bym.world_map_cell c WHERE c.cellid = r.cell_cellid)`
               : `r."${c}"`
           )
           .join(", ")}
           FROM bym.admin_test_snapshot t, jsonb_array_elements(t.saves) e,
                jsonb_populate_record(NULL::bym.save, e) r
          WHERE t.userid = ?
         ON CONFLICT (basesaveid) DO UPDATE SET ${upsertSet(saveCols, "basesaveid")}
           WHERE bym.save.saveuserid = EXCLUDED.saveuserid`,
        [uid],
      ],
      // An outpost another player took while the admin was testing stays theirs (the two upserts above
      // leave it alone): it leaves the admin's outpost list.
      [
        `UPDATE bym.save m
            SET outposts = coalesce((
              SELECT jsonb_agg(o) FROM jsonb_array_elements(m.outposts) o
               WHERE EXISTS (SELECT 1 FROM bym.save s
                              WHERE s.baseid = o ->> 2 AND s.saveuserid = m.saveuserid AND s.type = '${BaseType.OUTPOST}')
            ), '[]'::jsonb)
          WHERE m.saveuserid = ? AND m.type = '${BaseType.MAIN}' AND jsonb_typeof(m.outposts) = 'array'`,
        [uid],
      ],
      [`DELETE FROM bym.admin_test_snapshot WHERE userid = ?`, [uid]],
    ],
    [`SELECT userid FROM bym.admin_test_snapshot WHERE userid = ? FOR UPDATE`, [uid]]
  );

  await redis.del(KEY(user.userid));
  await redis.srem(TEST_USERS_KEY, String(user.userid));
  // Moloch's Gauntlet: the test ladder goes with test mode.
  await clearTestGauntlet(user.userid).catch((error) => logger.error(`Gauntlet test ladder not cleared for #${user.userid}: ${error}`));
  if (!restored) return false;
  await clearRankingCaches();
  await logAdminAction(user, "testModeOff", null, `admin test mode off (${reason}); account put back`);
  return true;
};

// ---------------------------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------------------------

export class TestModeError extends Error {}

/** Damage protection on the admin's main yard: a week, or none. */
export const setProtection = async (user: User, on: boolean) => {
  const save = await postgres.em.findOne(Save, { basesaveid: (user.save as unknown as { basesaveid: number }).basesaveid });
  if (!save) throw new TestModeError("No main yard.");
  save.protected = on ? getCurrentDateTime() + 7 * 24 * 3600 : 0;
  postgres.em.persist(save);
  await postgres.em.flush();
  return save.protected;
};

const findCell = async (worldid: string, x: number, y: number) =>
  postgres.em.findOne(
    WorldMapCell,
    { world: worldid, map_version: MapRoomVersion.V2, x, y },
    { populate: ["save", "world"] }
  );

const checkPlace = (x: number, y: number) => {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= MapRoom2.WIDTH || y >= MapRoom2.HEIGHT)
    throw new TestModeError(`${x}, ${y} is not on the map.`);
};

/** Makes any free cell (land, or a tribe) an outpost of the admin's, as a takeover does. */
export const takeCell = async (user: User, x: number, y: number) => {
  checkPlace(x, y);
  await postgres.em.populate(user, ["save"]);
  const userSave = user.save!;
  const worldid = userSave.worldid;
  if (!worldid) throw new TestModeError("You are not on a world map.");

  let cell = await findCell(worldid, x, y);
  if (cell && cell.uid === user.userid) throw new TestModeError("That place is already yours.");
  if (cell && cell.base_type !== MapRoomCell.WM) throw new TestModeError("Another player's yard: test mode leaves other players alone.");

  const world = cell?.world ?? (await postgres.em.findOne(World, { uuid: worldid }));
  if (!world) throw new TestModeError("World not found.");

  const terrain = cell ? cell.terrainHeight : getTerrainHeight(generateNoise(world.uuid), x, y);
  if (terrain <= Terrain.WATER3) throw new TestModeError("That place is water.");

  const baseid = cell?.baseid ?? generateBaseId(worldid, x, y);
  let save = cell?.save ?? (await postgres.em.findOne(Save, { baseid }));
  if (!save) save = await tribeSaveHandler(baseid, MapRoomVersion.V2, worldid, user);
  if (!save) throw new TestModeError("Could not make a yard there.");

  if (!cell) {
    cell = new WorldMapCell(world, x, y, terrain);
    cell.map_version = MapRoomVersion.V2;
    cell.baseid = baseid;
  }

  const now = getCurrentDateTime();
  save.saveuserid = user.userid;
  save.userid = userSave.userid;
  save.homebaseid = userSave.homebaseid;
  save.mapversion = MapRoomVersion.V2;
  save.name = userSave.name;
  save.worldid = worldid;
  save.createtime = now;
  save.protected = 0;
  save.attacks = [];
  save.resources = {};
  save.tutorialstage = 205;
  save.monsters = {};
  save.damage = 0;
  save.destroyed = 0;
  save.attackid = 0;
  save.takeoverDate = new Date();
  save.type = BaseType.OUTPOST;
  save.buildingdata = {};
  save.wmid = 0;
  save.cell = cell;

  cell.uid = user.userid;
  cell.base_type = MapRoomCell.OUTPOST;

  userSave.outposts = [...(userSave.outposts ?? []), [x, y, baseid]];

  postgres.em.persist([cell, save, userSave]);
  await postgres.em.flush();
  await logAdminAction(user, "testTakeCell", null, `test mode: took ${x},${y} (${baseid})`);
  return { baseid };
};

/** Makes one of the admin's outposts, or a tribe cell, wild again (a fresh tribe yard grows there). */
export const wildCell = async (user: User, x: number, y: number) => {
  checkPlace(x, y);
  await postgres.em.populate(user, ["save"]);
  const userSave = user.save!;
  const worldid = userSave.worldid;
  if (!worldid) throw new TestModeError("You are not on a world map.");

  const cell = await findCell(worldid, x, y);
  if (!cell) throw new TestModeError("That place is already wild.");
  if (cell.base_type === MapRoomCell.HOMECELL && cell.uid === user.userid) throw new TestModeError("That is your main yard.");
  if (cell.base_type !== MapRoomCell.WM && cell.uid !== user.userid) throw new TestModeError("Another player's yard: test mode leaves other players alone.");

  if (cell.uid === user.userid) {
    userSave.outposts = (userSave.outposts ?? []).filter(([ox, oy]) => !(ox === x && oy === y));
    if (userSave.buildingresources) delete userSave.buildingresources[`b${cell.baseid}`];
    postgres.em.persist(userSave);
  }

  const save = cell.save ?? (await postgres.em.findOne(Save, { baseid: cell.baseid }));
  if (save && save.type === BaseType.TRIBE && isWildAttackActive(save))
    throw new TestModeError("A player is attacking that yard right now. Try again in a few minutes.");
  if (save && save.type !== BaseType.MAIN) postgres.em.remove(save);
  postgres.em.remove(cell);
  await postgres.em.flush();
  await logAdminAction(user, "testWildCell", null, `test mode: made ${x},${y} wild`);
  return { baseid: cell.baseid };
};
