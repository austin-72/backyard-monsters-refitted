import type { KoaController } from "../utils/KoaController.js";
import { Status } from "../enums/StatusCodes.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";

/** Only http(s) addresses are passed on. */
const safeUrl = (u: unknown): string => (typeof u === "string" && /^https?:\/\/[^\s"'<>]+$/.test(u.trim()) ? u.trim() : "");

/**
 * Inferno-only (15 October, QoL #202): this server's community links (config `community`), for the login page and the
 * game's help links, before anyone is logged in. Empty strings for links not set.
 */
export const community: KoaController = async (ctx) => {
  const c = (infernoOnlyConfig as { community?: { discordUrl?: string; statusUrl?: string } }).community ?? {};
  ctx.set("Cache-Control", "public, max-age=300");
  ctx.status = Status.OK;
  ctx.body = { error: 0, discord: safeUrl(c.discordUrl), status: safeUrl(c.statusUrl) };
};
