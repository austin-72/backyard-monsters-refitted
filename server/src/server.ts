import "./config/normalizeEnv.js"; // first: every other module reads process.env.ENV as it loads
import { countServerErrors } from "./services/admin/health.js";
import { ensureYardHelp } from "./services/yard/yardHelp.js";
import { ensureAllianceTag } from "./services/alliance/allianceTag.js";
import { ensureAllianceCrest } from "./services/alliance/allianceCrest.js";
import { ensureInviteColumns } from "./services/alliance/allianceInvites.js";
import { ensureStreakSaver } from "./services/user/dailyLogin.js";
import { ensureTrickOrTreat } from "./services/events/trickOrTreat.js";
import { ensureDevilContract } from "./services/devil/devilContract.js";
import { ensureIoShop } from "./services/shop/ioShop.js";
import { startBackupWatch } from "./services/admin/backupStatus.js";
import { startPowerupWatch } from "./services/alliance/powerupWatch.js";
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
import { seo } from "./middleware/seo.js";
import { slowRequests } from "./middleware/slowRequests.js";
import { compressReplies } from "./middleware/compressReplies.js";
import { scanAssets } from "./services/assetMap.js";
import { infernoOnlyConfig } from "./config/InfernoOnlyConfig.js";
import { Env } from "./enums/Env.js";
import { initAnticheat } from "./scripts/anticheat/anticheat.js";
import { initialize as initVersionManifest } from "./config/VersionManifestConfig.js";
import { startChatServer } from "./chat/chatServer.js";
import { exitOnRedisReconnect } from "./utils/redisReconnectGuard.js";
import { clearRestartNotice, installRestartNotice, restartNoticeHeader } from "./services/admin/restartNotice.js";
import { startAdminNames } from "./services/admin/admin.js";
import { loadDesigns } from "./services/admin/designStore.js";
import { refreshKitPictures } from "./services/kits/refreshKitPictures.js";
import { prewarmMapLayers, startSnapshotClock } from "./services/maproom/v2/bulk/worldSnapshot.js";
import { startLeaderboards } from "./services/leaderboards/gameLeaderboards.js";
import { startCasinoJobs } from "./services/casino/bonePileSessions.js";
import { startCardGameJobs } from "./services/casino/cardSessions.js";
import { startAscent } from "./services/casino/ascentRounds.js";
import { startDerby } from "./services/casino/derbyRounds.js";
import { startDice } from "./services/casino/diceRounds.js";
import { startTribeReset } from "./services/maproom/v2/tribeReset.js";
import { cleanDuplicateYards } from "./services/maproom/v2/duplicateYards.js";
import { startWartBloom } from "./services/events/wartBloom.js";
import { startReplayCleanup } from "./services/replays/replays.js";
import { attachArcadeSocket } from "./services/arcade/hub.js";
import { ensureAppearOffline } from "./services/user/presence.js";
import { startSessions } from "./services/user/sessionStore.js";

export const app = new Koa();
app.proxy = true;
app.proxyIpHeader = "CF-Connecting-IP";

/**
 * (24 October) Koa's own printing of a request's error: a browser that closed a page while a file was still being
 * sent printed "Error: Premature close" and its stack, dozens of times a session, burying real errors in the log.
 * Those (a closed connection: nothing to do) are left out; the rest are logged as Koa would print them.
 */
app.on("error", (err: unknown, ctx?: { method?: string; path?: string }) => {
  const e = (err ?? {}) as { code?: string; message?: string; status?: number; expose?: boolean; stack?: string };
  if (e.status === 404 || e.expose) return;
  if (["ERR_STREAM_PREMATURE_CLOSE", "ECONNRESET", "EPIPE", "ECONNABORTED"].includes(String(e.code)) || /^(Premature close|aborted)$/i.test(String(e.message ?? ""))) return;
  logger.error(`Request ${ctx?.method ?? ""} ${ctx?.path ?? ""} failed: ${e.stack ?? String(err)}`);
});

/**
 * (18 October, SUSPECTED-BUGS.md) The player's address comes from CF-Connecting-IP only when the request came from a
 * proxy we trust: this machine, a private network (the tunnel's container), or an address in TRUSTED_PROXY
 * (comma-separated). From anyone else the header is dropped, and their own address is used: a caller reaching the
 * server directly could set any address, and get past every limit kept per address (logins, sign-ups, the panel).
 */
const TRUSTED_PROXIES = new Set((process.env.TRUSTED_PROXY ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const isTrustedPeer = (addr: string | undefined) => {
  const a = String(addr ?? "").replace(/^::ffff:/, "");
  if (!a) return false;
  if (TRUSTED_PROXIES.has(a)) return true;
  return (
    a === "127.0.0.1" || a === "::1" || a.startsWith("10.") || a.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(a) || /^f[cd][0-9a-f]{2}:/i.test(a)
  );
};
app.use(async (ctx, next) => {
  if (!isTrustedPeer(ctx.req.socket?.remoteAddress)) {
    delete ctx.req.headers["cf-connecting-ip"];
    delete ctx.req.headers["x-forwarded-for"];
  }
  await next();
});

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
  } else {
    // (QoL #265: production doesn't migrate at start, Docker's db-init does; said loudly when some are still missing)
    try {
      const pending = await postgres.orm.migrator.getPending();
      if (pending.length) {
        logger.warn(`!!! ${pending.length} database migration(s) not applied: ${pending.map((m) => m.name).join(", ")}. Run \`bun run migration:up\` in server (Docker: docker compose up -d runs db-init).`);
      }
    } catch (err) {
      logger.warn(`Could not check for missing database migrations: ${err}`);
    }
  }

  await redis.connect();
  // (a restart said before this server started is over)
  await clearRestartNotice();

  // Logins kept on disk as well as in Redis (services/user/sessionStore.ts): before the first request is answered.
  try {
    await startSessions();
  } catch (err) {
    logger.error(`Sessions: could not prepare the logins kept on disk: ${err}`);
  }

  // (13 October: the alliance tag's column, also where the migrations are not run at start: production)
  await ensureAllianceTag().catch((err) => logger.error(`Alliance tags: column not ready: ${err}`));
  await ensureAllianceCrest().catch((err) => logger.error(`Alliance crests: column not ready: ${err}`));
  await ensureInviteColumns().catch((err) => logger.error(`Alliance invites: columns not ready: ${err}`));
  // (QoL #126: the streak savers' column, also where the migrations are not run at start: production)
  await ensureStreakSaver().catch((err) => logger.error(`Daily reward: streak savers' column not ready: ${err}`));
  // (18 October: "appear offline" kept on the account, Redis's set made from it)
  await ensureAppearOffline().catch((err) => logger.error(`Presence: appearing offline not ready: ${err}`));
  // (20 October: Trick or Treat's column, also where the migrations are not run at start: production)
  await ensureTrickOrTreat().catch((err) => logger.error(`Trick or Treat: column not ready: ${err}`));
  // (22 October: the Store's Extras, the pets' coats and tags, Harvest Moon and Builders' Guild)
  await ensureIoShop().catch((err) => logger.error(`Shop: columns not ready: ${err}`));
  await ensureDevilContract().catch((err) => logger.error(`Devil's Contract: column not ready: ${err}`));
  // (27 November: helping out with another player's jobs, services/yard/yardHelp.ts)
  await ensureYardHelp().catch((err) => logger.error(`Yard help: table not ready: ${err}`));

  startAdminNames();
  // (QoL #268: an alert when the backups fail or are late, with ALERT_WEBHOOK_URL set)
  startBackupWatch();
  // (QoL #180: alliance power-ups ended or charged, said in the alliance chat)
  startPowerupWatch();
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
  // (16 October: a restart coming said on every answer, X-Io-Restart, so the games hold their requests)
  app.use(restartNoticeHeader);
  app.use(bodyParser({ enableTypes: ["json", "form"], jsonLimit: "8mb", formLimit: "8mb"}));
  app.use((_, next: Next) => RequestContext.create(postgres.orm.em, next));

  // Logs
  app.use(logMissingAssets);
  if (process.env.ENV !== Env.LOCAL) app.use(requestLogging);

  // Serve static files
  app.use(processLanguagesFile);

  // The front page with its address filled in, robots.txt, sitemap.xml (middleware/seo.ts)
  app.use(seo);

  const staticFiles = serve("public/");
  app.use((ctx, next) => isStaticPath(ctx.path) ? staticFiles(ctx, next) : next());

  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  });

  // (the game's replies compressed: middleware/compressReplies.ts)
  app.use(compressReplies);
  // (requests still running after 15 seconds noted, with what they wait on: middleware/slowRequests.ts)
  app.use(slowRequests);
  // (QoL #269: answers counted per hour, 5xx apart, for the admin panel's Health tab: services/admin/health.ts)
  app.use(countServerErrors);
  app.use(ErrorInterceptor);

  // Routes
  app.use(router.routes());
  app.use(router.allowedMethods());

  await initVersionManifest();
  // (Inferno-only, 23 October: the pictures' versions read once now, rather than at the first picture asked for)
  if (infernoOnlyConfig.enabled) scanAssets();
  await initAnticheat();

  // The Brimstone Pit: Bone Pile games left alone for a day are settled
  startCasinoJobs();
  startCardGameJobs();
  // Balthazar's Ascent: the shared rounds' loop
  startAscent();
  // Magma Derby: a race every five minutes
  startDerby();
  // Devil's Dice: the tables' rounds
  startDice();
  // Map Room 2: tribe yards made fresh 12 hours after their last attack (Inferno-only)
  startTribeReset();
  // (18 October) wild monster yards made twice and left beside an outpost taken from them (Inferno-only)
  void cleanDuplicateYards();
  // The Wart Bloom: its start and end announced in Global chat (Inferno-only)
  startWartBloom();
  // Attack replays: stale recordings finished, old replays forgotten (Inferno-only)
  startReplayCleanup();

  // Version control: report what is published at startup (also read again whenever the file changes).
  getPublishedBuild();

  const httpServer = app.listen(PORT, () => {
    console.log(`
${ascii_node}
Server running on: ${BASE_URL}:${PORT}
    `);
  });
  // The Devil's Arcade's live games: a WebSocket on this same port (/arcade/ws), so it goes through the tunnel
  attachArcadeSocket(httpServer);
  // Told to stop: the games told first (X-Io-Restart for a few seconds), then stopped (services/admin/restartNotice.ts)
  installRestartNotice(httpServer);
})().catch((e) => {
  logger.error(`Startup failed: ${e}`);
  process.exit(1);
});
