import { getPublishedBuild } from "./services/clientBuild.js";
import "./config/normalizeEnv.js"; // first: every other module reads process.env.ENV as it loads
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
