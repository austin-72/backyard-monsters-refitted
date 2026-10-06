import { logger } from "../utils/logger.js";

/**
 * Retired: the monthly 500-shiny grant has been replaced by the daily login reward
 * (services/user/dailyLogin.ts, InfernoOnlyConfig.dailyLogin).
 *
 * This file is kept only so an existing cron job or systemd timer that still runs it exits cleanly
 * instead of failing. It grants nothing. Remove that timer from the host when convenient.
 */
logger.info("monthly-shiny is retired (replaced by the daily login reward); no credits granted.");
process.exit(0);
