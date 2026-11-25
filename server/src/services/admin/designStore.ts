import { logger } from "../../utils/logger.js";
import { DEFAULT_DESIGNS } from "../../game-data/designs/defaultDesigns.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

const infernoOnly = () => infernoOnlyConfig.enabled;

/**
 * Inferno-only: layouts designed by admins in the game (services/admin/designs.ts, the Designer window).
 * Stored in `bym.io_design` (migration 20260930_AddDesigns), one row per layout:
 *
 *   kind "tribe",  key "<tribe index>-<level>"   a wild tribe yard at one level of its ladder
 *   kind "moloch", key "1".."13"                 a Moloch descent base (Gauntlet gate N, Moloch strongholds)
 *   kind "kit-original", key "1".."6"            an outpost kit as it was before an admin first changed it
 *                                                (the kits themselves live in public/assets/kits/inferno-kits.json)
 *
 * The stock tribe and Moloch layouts are the ones designed up to 29 September, shipped as defaults
 * (game-data/designs/defaultDesigns.ts, the user's call of 2 October: stockDesign). A row here comes first;
 * Reset deletes the row, so the layout goes back to the default.
 *
 * A tribe or Moloch row can also carry the monsters in the yard's Compounds (`monsters`: {id: how many}) and
 * their levels (`academy`: {id: {level}}), migration 20261001_AddDesignDefenders; null: the stock yard's.
 *
 * QoL #412: the last HISTORY_KEPT saved versions of each layout are kept in the same table, as rows of kind
 * "hist-tribe", "hist-moloch" or "hist-kit" with the key "<layout key>@<when it was kept, ms>" (kits: the kit's
 * buildings as a yard's, kitToYard). Each keeps the version's own updated_by / updated_at (when it was saved).
 * Nothing but the Designer reads them (designHistory); the yard generators only ever ask for "tribe" / "moloch".
 *
 * Kept in memory (one server process): read once at startup and after every change, so the yard
 * generators (tribeSaveV2, molochStrongholds, gauntlet) can use them without waiting. The database is only
 * reached from here when reading or writing (the server module is loaded then, not with this file), so the
 * game data that uses the designs can still be imported by scripts on their own.
 */

const sql = async (query: string, params: unknown[] = []) => {
  const { postgres } = await import("../../server.js");
  return postgres.em.fork().getConnection().execute(query, params, "all");
};

export type DesignKind = "tribe" | "moloch" | "kit-original";

/** QoL #412: the layouts whose saved versions are kept. */
export type HistoryKind = "tribe" | "moloch" | "kit";

/** How many saved versions of each layout are kept (the one in use not counted). */
export const HISTORY_KEPT = 5;

export type BuildingData = Record<string, Record<string, unknown>>;

/** The monsters in a yard's Compounds ({id: how many}) and their levels ({id: {level}}). */
export interface Defenders {
  monsters: Record<string, number>;
  academy: Record<string, { level: number }>;
}

interface DesignRow {
  kind: string;
  key: string;
  buildingdata: unknown;
  monsters?: unknown;
  academy?: unknown;
  updated_by: string | null;
  updated_at: Date | string | null;
}

export interface StoredDesign {
  buildingdata: BuildingData;
  /** Set when the admin chose the yard's monsters (else the stock yard's). */
  defenders: Defenders | null;
  updatedBy: string | null;
  updatedAt: number;
}

const cache = new Map<string, StoredDesign>();
const listeners: (() => void)[] = [];
let loaded = false;

const id = (kind: DesignKind, key: string) => `${kind}:${key}`;

const parse = (value: unknown): BuildingData | null => {
  return parseObject(value) as BuildingData | null;
};

const parseObject = (value: unknown): Record<string, unknown> | null => {
  let data = value;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
};

/** Reads every design into memory. Called at startup; a missing table (migration not run yet) means none. */
export const loadDesigns = async () => {
  try {
    let rows: DesignRow[];
    try {
      rows = (await sql(`SELECT kind, key, buildingdata, monsters, academy, updated_by, updated_at FROM bym.io_design`)) as DesignRow[];
    } catch {
      // (20261001_AddDesignDefenders not run yet: the layouts still work, without their monsters)
      rows = (await sql(`SELECT kind, key, buildingdata, updated_by, updated_at FROM bym.io_design`)) as DesignRow[];
    }
    cache.clear();
    for (const row of rows) {
      const buildingdata = parse(row.buildingdata);
      if (!buildingdata) continue;
      const monsters = parseObject(row.monsters) as Record<string, number> | null;
      const academy = parseObject(row.academy) as Record<string, { level: number }> | null;
      cache.set(`${row.kind}:${row.key}`, {
        buildingdata,
        defenders: monsters ? { monsters, academy: academy ?? {} } : null,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
      });
    }
    loaded = true;
    // (QoL #412: the kept versions are not layouts in use)
    const inUse = rows.filter((row) => !String(row.kind).startsWith("hist-")).length;
    if (inUse) logger.info(`Designs: ${inUse} admin-designed layouts in use`);
  } catch (err) {
    logger.warn(`Designs could not be read (has the 20260930_AddDesigns migration run?): ${(err as Error).message}`);
  }
  for (const fn of listeners) fn();
};

export const designsLoaded = () => loaded;

/** Something that caches yards made from the designs (the Moloch strongholds) is told when they change. */
export const onDesignsChanged = (fn: () => void) => {
  listeners.push(fn);
};

export const getDesign = (kind: DesignKind, key: string) => cache.get(id(kind, key)) ?? null;

export const saveDesign = async (kind: DesignKind, key: string, buildingdata: BuildingData, by: string, defenders: Defenders | null = null) => {
  if (defenders) {
    await sql(
      `INSERT INTO bym.io_design (kind, key, buildingdata, monsters, academy, updated_by, updated_at)
       VALUES (?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, now())
       ON CONFLICT (kind, key) DO UPDATE SET buildingdata = EXCLUDED.buildingdata, monsters = EXCLUDED.monsters,
         academy = EXCLUDED.academy, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [kind, key, JSON.stringify(buildingdata), JSON.stringify(defenders.monsters), JSON.stringify(defenders.academy), by]
    );
  } else {
    await sql(
      `INSERT INTO bym.io_design (kind, key, buildingdata, updated_by, updated_at)
       VALUES (?, ?, CAST(? AS jsonb), ?, now())
       ON CONFLICT (kind, key) DO UPDATE SET buildingdata = EXCLUDED.buildingdata, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [kind, key, JSON.stringify(buildingdata), by]
    );
  }
  await loadDesigns();
};

export const deleteDesign = async (kind: DesignKind, key: string) => {
  await sql(`DELETE FROM bym.io_design WHERE kind = ? AND key = ?`, [kind, key]);
  await loadDesigns();
};

/**
 * QoL #412: a layout written exactly as given: `defenders` null means the stock yard's monsters (the row's monsters
 * and academy set to NULL), unlike saveDesign, which leaves them as they were. For putting a kept version back
 * and for imports.
 */
export const putDesign = async (kind: "tribe" | "moloch", key: string, buildingdata: BuildingData, by: string, defenders: Defenders | null) => {
  await sql(
    `INSERT INTO bym.io_design (kind, key, buildingdata, monsters, academy, updated_by, updated_at)
     VALUES (?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, now())
     ON CONFLICT (kind, key) DO UPDATE SET buildingdata = EXCLUDED.buildingdata, monsters = EXCLUDED.monsters,
       academy = EXCLUDED.academy, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [kind, key, JSON.stringify(buildingdata), defenders ? JSON.stringify(defenders.monsters) : null, defenders ? JSON.stringify(defenders.academy) : null, by]
  );
  await loadDesigns();
};

/** QoL #412: one kept version of a layout (`id`: when it was kept, ms, as text). */
export interface DesignVersion extends StoredDesign {
  id: string;
}

const historyPrefix = (kind: HistoryKind, key: string) => `hist-${kind}:${key}@`;

/** QoL #412: the kept versions of a layout, newest first (fresh copies). */
export const designHistory = (kind: HistoryKind, key: string): DesignVersion[] => {
  const prefix = historyPrefix(kind, key);
  const out: DesignVersion[] = [];
  for (const [k, v] of cache) {
    if (k.startsWith(prefix)) out.push({ id: k.slice(prefix.length), ...(structuredClone(v) as StoredDesign) });
  }
  return out.sort((a, b) => Number(b.id) - Number(a.id));
};

/**
 * QoL #412: keeps a version of a layout (the one about to be replaced), with who saved it and when (`at`, unix
 * seconds; 0: now). The oldest past HISTORY_KEPT go.
 */
export const addHistory = async (kind: HistoryKind, key: string, buildingdata: BuildingData, defenders: Defenders | null, by: string | null, at: number) => {
  const older = designHistory(kind, key);
  for (const old of older.slice(HISTORY_KEPT - 1)) {
    await sql(`DELETE FROM bym.io_design WHERE kind = ? AND key = ?`, [`hist-${kind}`, `${key}@${old.id}`]);
  }
  let stamp = Date.now();
  while (older.some((v) => v.id === String(stamp))) stamp++;
  const when = new Date(at > 0 ? at * 1000 : Date.now()).toISOString();
  if (defenders) {
    await sql(
      `INSERT INTO bym.io_design (kind, key, buildingdata, monsters, academy, updated_by, updated_at)
       VALUES (?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, CAST(? AS timestamptz)) ON CONFLICT (kind, key) DO NOTHING`,
      [`hist-${kind}`, `${key}@${stamp}`, JSON.stringify(buildingdata), JSON.stringify(defenders.monsters), JSON.stringify(defenders.academy), by, when]
    );
  } else {
    await sql(
      `INSERT INTO bym.io_design (kind, key, buildingdata, updated_by, updated_at)
       VALUES (?, ?, CAST(? AS jsonb), ?, CAST(? AS timestamptz)) ON CONFLICT (kind, key) DO NOTHING`,
      [`hist-${kind}`, `${key}@${stamp}`, JSON.stringify(buildingdata), by, when]
    );
  }
  await loadDesigns();
};

/** QoL #412: one kept version taken out (it was put back in use). */
export const dropHistory = async (kind: HistoryKind, key: string, id: string) => {
  await sql(`DELETE FROM bym.io_design WHERE kind = ? AND key = ?`, [`hist-${kind}`, `${key}@${id}`]);
  await loadDesigns();
};

/**
 * QoL #420: the layouts in use (tribe, Moloch and kit-original rows; not the kept versions), as the export script
 * (scripts/export-designs.ts) writes them, sorted by kind and key.
 */
export const allDesigns = () =>
  [...cache.entries()]
    .map(([id, d]) => {
      const at = id.indexOf(":");
      return { kind: id.slice(0, at), key: id.slice(at + 1), d };
    })
    .filter((row) => !row.kind.startsWith("hist-"))
    .sort((a, b) => (a.kind === b.kind ? (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : a.kind < b.kind ? -1 : 1))
    .map(({ kind, key, d }) => ({
      kind,
      key,
      buildingdata: structuredClone(d.buildingdata),
      monsters: d.defenders ? structuredClone(d.defenders.monsters) : null,
      academy: d.defenders ? structuredClone(d.defenders.academy) : null,
      updatedBy: d.updatedBy ?? null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt * 1000).toISOString() : null,
    }));

/** A fresh copy of a design's buildings (every yard made from it gets its own, attacks change them). */
const copy = (design: StoredDesign | null) => (design ? (structuredClone(design.buildingdata) as BuildingData) : null);

/**
 * The shipped default layout (and the monsters in its Compounds) of a tribe level or Moloch base, a fresh copy,
 * or null where there is none (then the template's own). The defaults are Inferno yards: inferno-only servers.
 */
export const stockDesign = (kind: "tribe" | "moloch", key: string): { buildingdata: BuildingData; defenders: Defenders | null } | null => {
  if (!infernoOnly()) return null;
  const d = DEFAULT_DESIGNS[`${kind}:${key}`];
  if (!d) return null;
  return {
    buildingdata: structuredClone(d.buildingdata) as BuildingData,
    defenders: d.monsters ? { monsters: { ...d.monsters }, academy: structuredClone(d.academy ?? {}) } : null,
  };
};

/** A stock yard (a template) with its shipped default layout and defenders on it, if it has one. */
export const withStockDesign = <T extends object>(kind: "tribe" | "moloch", key: string, save: T): T => {
  const d = stockDesign(kind, key);
  if (!d) return save;
  let out = { ...save, buildingdata: d.buildingdata, buildinghealthdata: {} } as T;
  if (d.defenders) out = { ...out, monsters: d.defenders.monsters, academy: d.defenders.academy } as T;
  return out;
};

/** The designed layout of a wild tribe's yard at this level of its ladder, or null for the stock one. */
export const tribeDesign = (tribeIndex: number, level: number) => copy(getDesign("tribe", `${tribeIndex}-${level}`));

/** The designed layout of Moloch descent base `number` (1-13), or null for the stock one. */
export const molochDesign = (number: number) => copy(getDesign("moloch", String(number)));

const copyDefenders = (design: StoredDesign | null): Defenders | null =>
  design && design.defenders ? (structuredClone(design.defenders) as Defenders) : null;

/** The monsters an admin put in this tribe level's Compounds and their levels, or null for the stock ones. */
export const tribeDefenders = (tribeIndex: number, level: number) => copyDefenders(getDesign("tribe", `${tribeIndex}-${level}`));

/** The same for Moloch descent base `number`. */
export const molochDefenders = (number: number) => copyDefenders(getDesign("moloch", String(number)));
