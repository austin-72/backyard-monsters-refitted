import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * Everything made in the Designer, in one file
 * ====================================================================
 * The wild tribe and Moloch layouts (table bym.io_design, with the monsters chosen for their Compounds) and the
 * outpost kits (public/assets/kits/inferno-kits.json), as they are on this server now, so they can be made the
 * game's defaults and kept with the code.
 *
 *   docker compose exec -T web bun src/scripts/export-designs.ts > inferno-designs.json      (Docker)
 *   bun src/scripts/export-designs.ts > inferno-designs.json                                  (from server/)
 *   bun src/scripts/export-designs.ts out=<file>                                              (straight to a file)
 *
 * The JSON goes to standard output (so `> file` saves it on the machine the command runs from); what it did
 * goes to standard error. Nothing on the server changes.
 *
 * The file:
 *   { "format": "inferno-designs", "version": 1, "exportedAt": "<ISO time>",
 *     "designs": [ { "kind": "tribe" | "moloch" | "kit-original", "key": "...", "buildingdata": {...},
 *                    "monsters": {...} | null, "academy": {...} | null, "updatedBy": "...", "updatedAt": "..." } ],
 *     "kits": <inferno-kits.json as it is, or null> }
 * Tribe keys are "<tribe index>-<level>" (tribe 0 Hellionnaire, 1 Kozmodeus, 2 Abaddonakki, 3 Beelzenaut);
 * Moloch keys are the descent base 1-13; kit-original rows are the kits as they were before they were first changed.
 * ====================================================================
 */

// The JSON must be the only thing on standard output: anything else that prints goes to standard error.
const write = process.stdout.write.bind(process.stdout);
console.log = console.info = console.debug = (...args: unknown[]) => console.error(...args);

const { MikroORM } = await import("@mikro-orm/postgresql");
const { default: ormConfig } = await import("../mikro-orm.config.js");

let out: string | undefined;
for (const arg of process.argv.slice(2)) {
  const [key, ...rest] = arg.split("=");
  if (key === "out" && rest.length) out = rest.join("=");
  else {
    console.error(`Unknown argument "${arg}". Usage: bun src/scripts/export-designs.ts [out=<file>]`);
    process.exit(1);
  }
}

const parse = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const orm = await MikroORM.init({ ...ormConfig, debug: false });
try {
  const conn = orm.em.fork().getConnection();
  let rows: Record<string, unknown>[];
  try {
    rows = (await conn.execute(`SELECT kind, key, buildingdata, monsters, academy, updated_by, updated_at FROM bym.io_design ORDER BY kind, key`, [], "all")) as Record<string, unknown>[];
  } catch {
    try {
      // (before migration 20261001_AddDesignDefenders: the layouts without their monsters)
      rows = (await conn.execute(`SELECT kind, key, buildingdata, updated_by, updated_at FROM bym.io_design ORDER BY kind, key`, [], "all")) as Record<string, unknown>[];
    } catch (err) {
      console.error(`No designs table (bym.io_design) on this database: has the 20260930_AddDesigns migration run? (${(err as Error).message}) Only the kits are exported.`);
      rows = [];
    }
  }
  const designs = rows.map((row) => ({
    kind: String(row.kind),
    key: String(row.key),
    buildingdata: parse(row.buildingdata),
    monsters: parse(row.monsters),
    academy: parse(row.academy),
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : null,
  }));
  const kitFile = path.join(process.cwd(), "public", "assets", "kits", "inferno-kits.json");
  const kits = existsSync(kitFile) ? JSON.parse(readFileSync(kitFile, "utf8")) : null;
  const json = JSON.stringify({ format: "inferno-designs", version: 1, exportedAt: new Date().toISOString(), designs, kits }, null, 1);
  if (out) writeFileSync(out, json);
  else write(json + "\n");
  const count = (kind: string) => designs.filter((d) => d.kind === kind).length;
  console.error(
    `Exported ${count("tribe")} wild tribe layouts, ${count("moloch")} Moloch bases, ${count("kit-original")} kit originals` +
      ` and ${kits ? (kits.kits ?? []).filter(Boolean).length : 0} kits${out ? ` to ${out}` : ""}.`,
  );
} finally {
  await orm.close(true);
}
