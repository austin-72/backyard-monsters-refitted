import { Status } from "../../../enums/StatusCodes.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { postgres } from "../../../server.js";
import { User } from "../../../database/models/user.model.js";

interface Bookmark { bookmarks: string };

/**
 * The stored bookmarks are the game's own form: `mbms` (how many), `mbm0`, `mbm1`... (x * 10000 + y) and
 * `mbmn0`, `mbmn1`... (names). The map room has no limit on how many (Inferno-only); this cap only keeps
 * one player's row a sensible size (about 6,000 bookmarks).
 */
const MAX_BYTES = 256 * 1024;
const KEY = /^mbm(s|\d{1,5}|n\d{1,5})$/;
const MAX_NAME = 40;

const badRequest = (ctx: Parameters<KoaController>[0], error: string) => {
  ctx.status = Status.BAD_REQUEST;
  ctx.body = { error };
};

/**
 * Controller to save bookmarks on the Map Room for a user.
 * Updates the user's bookmarks in the database and returns a success response.
 * Anything that is not the game's bookmark form (or is far too big) is refused with a 400, not stored.
 *
 * @param {Context} ctx - The Koa context object
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if bookmarks are not found in the request body.
 */
export const saveBookmarks: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const { bookmarks } = ctx.request.body as Bookmark;

  if (!bookmarks) throw new Error("Bookmarks not found");

  if (typeof bookmarks !== "string") return badRequest(ctx, "Bookmarks are not valid");
  if (bookmarks.length > MAX_BYTES) return badRequest(ctx, "Too many bookmarks");

  let parsed: unknown;
  try {
    parsed = JSON.parse(bookmarks);
  } catch {
    return badRequest(ctx, "Bookmarks are not valid");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return badRequest(ctx, "Bookmarks are not valid");

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!KEY.test(key)) return badRequest(ctx, "Bookmarks are not valid");
    if (key.startsWith("mbmn")) {
      if (typeof value !== "string" || value.length > MAX_NAME) return badRequest(ctx, "Bookmarks are not valid");
    } else if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99_999_999) {
      return badRequest(ctx, "Bookmarks are not valid");
    }
  }

  user.bookmarks = parsed as User["bookmarks"];
  postgres.em.persist(user);
  await postgres.em.flush();

  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
