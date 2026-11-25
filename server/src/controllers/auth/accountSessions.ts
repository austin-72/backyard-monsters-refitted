import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { endSessionOfType, playSessionsOf } from "../../services/user/sessionStore.js";
import { endSavedLogins, findSavedLogin, savedLoginsOf } from "../../services/user/savedLogins.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (16 October, QoL #200): the player's own signed-in browsers, in the page's settings (Account >
 * Signed-in browsers, client-web/src/player/Shell.ts), after verifyUserAuth: only the account of the token asking.
 *
 *   GET or POST player/sessions       -> { sessions: [{ id, kind, agent, since, lastUsed, current }] }
 *   POST player/sessions/end {id}     -> that one ended; {others: 1}: every one but this game and this browser
 *
 * What is listed:
 *  - "play": where the account is playing now, one per kind (the game; the launcher app), services/user/sessionStore.ts.
 *    The game's is the one asking (an account plays in one place at a time) unless it is asked from the launcher.
 *  - "saved": the browsers that sign in by the account's name on the login page (saved logins, 14 days from their
 *    last use; services/user/savedLogins.ts), this browser's marked. Ended, that browser asks for the password.
 * Where from is not kept (only which browser on which system), so it is not shown.
 */

const tokenOf = (ctx: Parameters<KoaController>[0]) => String(ctx.headers.authorization ?? "").replace("Bearer ", "");

const listFor = async (ctx: Parameters<KoaController>[0], user: User) => {
  const mineType = verifyJwtToken(tokenOf(ctx)).user.sessionType;
  const mineSaved = await findSavedLogin(ctx, user.email).catch(() => null);
  const play = await playSessionsOf(user.email);
  const saved = await savedLoginsOf(user.email);
  return [
    ...play.map((p) => ({
      id: `play:${p.sessionType}`,
      kind: "play",
      type: p.sessionType,
      agent: p.agent,
      since: p.since.toISOString(),
      lastUsed: null as string | null,
      current: p.sessionType === mineType,
    })),
    ...saved.map((s) => ({
      id: `saved:${s.id}`,
      kind: "saved",
      type: "saved",
      agent: s.agent,
      since: s.created.toISOString(),
      lastUsed: s.lastUsed.toISOString(),
      current: !!mineSaved && mineSaved.id === s.id,
    })),
  ];
};

export const mySessions: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.body = { error: 0, sessions: await listFor(ctx, user) };
};

export const endMySessions: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const mineType = verifyJwtToken(tokenOf(ctx)).user.sessionType;
  const others = body.others === true || body.others === 1 || String(body.others ?? "") === "1";
  let ended = 0;
  ctx.status = Status.OK;
  if (others) {
    // every play session but this one's kind, every saved login but this browser's
    const mineSaved = await findSavedLogin(ctx, user.email).catch(() => null);
    for (const p of await playSessionsOf(user.email)) {
      if (p.sessionType !== mineType && (await endSessionOfType(p.sessionType, user.email))) ended++;
    }
    ended += await endSavedLogins(user.email, { allBut: mineSaved ? mineSaved.id : null });
  } else {
    const id = String(body.id ?? "").slice(0, 40);
    const play = /^play:([a-z]{1,16})$/.exec(id);
    const saved = /^saved:(\d{1,15})$/.exec(id);
    if (play) {
      if (play[1] === mineType) {
        ctx.body = { error: "That is this game: use Switch account to sign it out." };
        return;
      }
      if (await endSessionOfType(play[1], user.email)) ended++;
    } else if (saved) {
      ended += await endSavedLogins(user.email, { id: Number(saved[1]) });
    } else {
      ctx.body = { error: "Choose a browser to sign out." };
      return;
    }
  }
  logger.info(`${user.username} signed out ${ended} other login(s) from their settings${others ? " (all others)" : ""}`);
  ctx.body = { error: 0, ended, sessions: await listFor(ctx, user) };
};
