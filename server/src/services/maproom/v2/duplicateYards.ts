import { infernoOnlyConfig } from "../../../config/InfernoOnlyConfig.js";
import { postgres } from "../../../server.js";
import { logger } from "../../../utils/logger.js";

/**
 * (18 October, SUSPECTED-BUGS.md: "The duplicate-yard fix leaves the second copy behind after a takeover") A wild
 * monster yard loaded twice at the same moment, before 16 October, was made twice: two saves and two map cells with
 * one base id (bug report #96). A takeover now removes the other copy (takeoverCell.ts); this clears the copies left
 * by takeovers before that: a tribe cell, and its save, that share a base id with an outpost's cell on the same
 * world. Run at start-up; it changes nothing when there are none.
 */
export const cleanDuplicateYards = async () => {
  if (!infernoOnlyConfig.enabled) return;
  try {
    const conn = postgres.orm.em.getConnection();
    const copies = (await conn.execute(
      `SELECT c.cellid, s.basesaveid, c.baseid FROM bym.world_map_cell c
         LEFT JOIN bym.save s ON s.cell_cellid = c.cellid AND s.type = 'tribe'
        WHERE c.base_type = 1 AND c.baseid IS NOT NULL
          AND EXISTS (SELECT 1 FROM bym.world_map_cell o WHERE o.baseid = c.baseid AND o.world_id IS NOT DISTINCT FROM c.world_id AND o.base_type = 3 AND o.cellid <> c.cellid)`,
      [],
      "all",
    )) as { cellid: number; basesaveid: number | null; baseid: string }[];
    if (!copies.length) return;
    const saves = copies.map((c) => c.basesaveid).filter((n): n is number => n != null);
    if (saves.length) await conn.execute(`DELETE FROM bym.save WHERE basesaveid IN (${saves.map(() => "?").join(",")}) AND type = 'tribe'`, saves);
    await conn.execute(`DELETE FROM bym.world_map_cell WHERE cellid IN (${copies.map(() => "?").join(",")}) AND base_type = 1`, copies.map((c) => c.cellid));
    logger.info(`Duplicate yards: ${copies.length} tribe cell(s) and ${saves.length} save(s) left beside a taken outpost removed (${[...new Set(copies.map((c) => c.baseid))].join(", ")})`);
  } catch (err) {
    logger.warn(`Duplicate yards: not cleared: ${err}`);
  }
};
