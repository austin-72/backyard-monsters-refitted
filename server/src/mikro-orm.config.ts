import path from "path";
import { existsSync, readFileSync } from "fs";

import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { Save } from "./database/models/save.model.js";
import { User } from "./database/models/user.model.js";
import { WorldMapCell } from "./database/models/worldmapcell.model.js";
import { World } from "./database/models/world.model.js";
import { Env } from "./enums/Env.js";
import { Report } from "./database/models/report.model.js";
import { InfernoMaproom } from "./database/models/infernomaproom.model.js";
import { Maproom } from "./database/models/maproom.model.js";
import { Message } from "./database/models/message.model.js";
import { Thread } from "./database/models/thread.model.js";
import { AttackLogs } from "./database/models/attacklogs.model.js";
import { JobRun } from "./database/models/jobrun.model.js";
import { Alliance } from "./database/models/alliance.model.js";
import { AllianceInvite } from "./database/models/allianceinvite.model.js";
import { AllianceMessage } from "./database/models/alliancemessage.model.js";
import { AlliancePowerup } from "./database/models/alliancepowerup.model.js";
import { AllianceRelationship } from "./database/models/alliancerelationship.model.js";
import { AllianceStats } from "./database/models/alliancestats.view.js";
import { ApiConsumer } from "./database/models/apiconsumer.model.js";
import { AdminLog } from "./database/models/adminlog.model.js";
import { BugReport } from "./database/models/bugreport.model.js";

/**
 * `bun run` loads `.env` on its own, but the MikroORM CLI started through `bun x` (db:init,
 * migration:up, schema:drop) may not, and then fails with "No database specified". Fill in
 * whatever is still missing from `.env` so the CLI works without exporting variables by hand.
 * Values already present in the environment always win.
 */
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2];
    const quoted = value.match(/^(['"])(.*)\1/);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "");

    process.env[match[1]] = value;
  }
}

/**
 * List of entities to be used with MikroORM.
 * These entities represent the database tables.
 */
const entities = [
  User,
  Save,
  World,
  WorldMapCell,
  Report,
  InfernoMaproom,
  Maproom,
  Message,
  Thread,
  AttackLogs,
  JobRun,
  Alliance,
  AllianceInvite,
  AllianceMessage,
  AlliancePowerup,
  AllianceRelationship,
  AllianceStats,
  ApiConsumer,
  AdminLog,
  BugReport,
];

/**
 * Configuration for MikroORM.
 *
 * Uses defineConfig from the PostgreSQL driver package for type-safe config.
 * ES stage 3 decorators are used; explicit types are provided on each @Property decorator instead.
 * Migrator is registered as an extension to enable orm.migrator usage.
 */
export default defineConfig({
  schema: "bym",
  allowGlobalContext: false,
  entities,
  extensions: [Migrator],
  debug: process.env.ENV !== Env.PROD,
  dbName: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // (20: 10 was easily taken by a few slow requests at once; DB_POOL_MAX to change it)
  pool: { min: 2, max: Number(process.env.DB_POOL_MAX) || 20 },
  // (9 October, bug reports 84 and 85: requests that hung for over 100 seconds, which the proxy answered with HTTP
  // 524.) A request now gives up, with an error the server records, rather than wait for ever: 30 seconds for a
  // connection when all of the pool's are in use, 30 seconds for a row another transaction has locked; and a
  // connection left in a transaction doing nothing for 2 minutes (its locks held all the while) is closed by the
  // database. middleware/slowRequests.ts notes what a request still waiting after 15 seconds waits on.
  driverOptions: {
    connectionTimeoutMillis: 30_000,
    lock_timeout: 30_000,
    idle_in_transaction_session_timeout: 120_000,
  },
  migrations: {
    path: path.join(import.meta.dirname, "./database/migrations"),
    pathTs: path.join(import.meta.dirname, "./database/migrations"),
    glob: "*.ts",
  },
});
