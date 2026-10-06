import "./config/normalizeEnv.js"; // first: every other module reads process.env.ENV as it loads
import { getPublishedBuild } from "./services/clientBuild.js";
import Koa, { type Next } from "koa";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import ormConfig from "./mikro-orm.config.js";
import router from "./app.routes.js";

import { RedisClient } from "bun";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";
import { logger } from "./utils/logger.js";
import { ascii_node } from "./utils/ascii_art.js";
import { ErrorInterceptor } from "./middleware/clientSafeError.js";
import { processLanguagesFile } from "./middleware/processLanguageFile.js";
import { logMissingAssets, requestLogging } from "./middleware/requestLogging.js";
import { corsCacheControl } from "./middleware/corsCacheControlSetup.js";
import { isStaticPath } from "./utils/staticPaths.js";
import { Env } from "./enums/Env.js";
import { initAnticheat } from "./scripts/anticheat/anticheat.js";
import { initialize as initVersionManifest } from "./config/VersionManifestConfig.js";
import { startChatServer } from "./chat/chatServer.js";
import { exitOnRedisReconnect } from "./utils/redisReconnectGuard.js";
import { startAdminNames } from "./services/admin/admin.js";
import { loadDesigns } from "./services/admin/designStore.js";
import { refreshKitPictures } from "./services/kits/refreshKitPictures.js";
import { prewarmMapLayers, startSnapshotClock } from "./services/maproom/v2/bulk/worldSnapshot.js";
import { startLeaderboards } from "./services/leaderboards/gameLeaderboards.js";
import { startCasinoJobs } from "./services/casino/bonePileSessions.js";
import { startAscent } from "./services/casino/ascentRounds.js";
import { startDerby } from "./services/casino/derbyRounds.js";
import { startTribeReset } from "./services/maproom/v2/tribeReset.js";
import { startWartBloom } from "./services/events/wartBloom.js";
import { startReplayCleanup } from "./services/replays/replays.js";

export const app = new Koa();
app.proxy = true;
app.proxyIpHeader = "CF-Connecting-IP";

export const PORT = process.env.PORT || 3001;
export const BASE_URL = process.env.BASE_URL;

// A server players can reach must not run on the defaults a laptop install uses.
{
  const secret = process.env.SECRET_KEY ?? "";
  const isPublic = Boolean(BASE_URL) && !/localhost|127\.0\.0\.1/.test(BASE_URL!);
  const warnings: string[] = [];

  if (secret.length < 24 || secret === "secret")
    warnings.push("SECRET_KEY is missing, short or the default. Anyone can forge logins. Set a long random value in server/.env.");
  if (isPublic && process.env.ENV === "local")
    warnings.push("BASE_URL is public but ENV=local. Set ENV=prod in server/.env: local mode is for testing on your own machine.");

  for (const warning of warnings) console.warn(`\n!!! SECURITY: ${warning}\n`);
}

export const postgres = {} as {
  orm: MikroORM<PostgreSqlDriver>;
  em: EntityManager<PostgreSqlDriver>;
};

export const redis = new RedisClient(process.env.REDIS_URL);

exitOnRedisReconnect(redis, "Redis", () => logger.info(`Connected to Redis server`));

redis.onclose = (err) => logger.error(`Redis disconnected: ${err.message}`);

// Initialize MikroORM, Redis, and start the Koa server
(async () => {
  postgres.orm = await MikroORM.init<PostgreSqlDriver>(ormConfig);
  postgres.em = postgres.orm.em;

  if (process.env.ENV !== Env.PROD) {
    try {
      await postgres.orm.migrator.up();
      logger.info("Database migrations applied");
    } catch (err) {
      logger.error(`Database migration failure: ${err}`);
    }
  }

  await redis.connect();

  startAdminNames();
  // The layouts admins designed (services/admin/designs.ts), before any yard is made from them.
  await loadDesigns();
  // Kit pictures drawn again when the building art changed (services/kits/refreshKitPictures.ts), in the background.
  setTimeout(() => refreshKitPictures(), 2000);

  // Map Room 2: the world map's fixed layers, built in the background a little after startup.
  setTimeout(() => prewarmMapLayers().catch((err) => logger.warn(`Could not prepare the world maps: ${err}`)), 15000);
  // Map Room 2: the world snapshots' 5-minute clock, and the leaderboards made from them at each turn.
  startLeaderboards();
  startSnapshotClock().catch((err) => logger.warn(`Could not start the map snapshots' clock: ${err}`));

  startChatServer();

  app.use(corsCacheControl);
  app.use(bodyParser({ enableTypes: ["json", "form"], jsonLimit: "8mb", formLimit: "8mb"}));
  app.use((_, next: Next) => RequestContext.create(postgres.orm.em, next));

  // Logs
  app.use(logMissingAssets);
  if (process.env.ENV !== Env.LOCAL) app.use(requestLogging);

  // Serve static files
  app.use(processLanguagesFile);

  const staticFiles = serve("public/");
  app.use((ctx, next) => isStaticPath(ctx.path) ? staticFiles(ctx, next) : next());

  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  });

  app.use(ErrorInterceptor);

  // Routes
  app.use(router.routes());
  app.use(router.allowedMethods());

  await initVersionManifest();
  await initAnticheat();

  // The Brimstone Pit: Bone Pile games left alone for a day are settled
  startCasinoJobs();
  // Balthazar's Ascent: the shared rounds' loop
  startAscent();
  // Magma Derby: a race every five minutes
  startDerby();
  // Map Room 2: tribe yards made fresh 12 hours after their last attack (Inferno-only)
  startTribeReset();
  // The Wart Bloom: its start and end announced in Global chat (Inferno-only)
  startWartBloom();
  // Attack replays: stale recordings finished, old replays forgotten (Inferno-only)
  startReplayCleanup();

  // Version control: report what is published at startup (also read again whenever the file changes).
  getPublishedBuild();

  app.listen(PORT, () => {
    console.log(`
${ascii_node}
Server running on: ${BASE_URL}:${PORT}
    `);
  });
})().catch((e) => {
  logger.error(`Startup failed: ${e}`);
  process.exit(1);
});
