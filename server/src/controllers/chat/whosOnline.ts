import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { isHidden, ONLINE_SECONDS, onlineNow, presenceSince, RECENT_SECONDS, setHidden } from "../../services/user/presence.js";
import type { User } from "../../database/models/user.model.js";
import { tagsOfUsers } from "../../services/alliance/allianceTag.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { permissionErr } from "../../errors/errors.js";
import { endActivity } from "../../services/live/liveActivity.js";
import { stopWatchersOf } from "../../services/live/liveStream.js";

/** At most this many are listed (the most recently active). */
const MAX_LISTED = 300;

/**
 * Inferno-only (13 October): Who's Online, the chat bar's list: the players active in the last 24 hours, most recent
 * first, each with their alliance tag and whether they are online (active in the last 5 minutes:
 * services/user/presence.ts). Banned accounts are left out.
 *
 * Answers { error: 0, now, onlineSeconds, hidden, players: [{ id, name, tag?, aid?, at, online, hidden? }] }. `hide=1` (or 0):
 * the player appears offline (or not) from now on: on nobody else's list, a grey dot in chat.
 *
 * (QoL #477) `brief=1`: only { error: 0, hidden, online } (how many are online now, as others see them), for the chat
 * bar's Offline chip and the count on the folded chat, which asks every minute.
 */
export const whosOnline: KoaController = async (ctx) => {
  if (!infernoOnlyConfig.enabled) throw permissionErr();
  const me: User = ctx.authUser;
  // (13 October: "appear offline", the window's button: hide=1, or hide=0 to be seen again)
  const hide = String((ctx.request.body as Record<string, unknown> | undefined)?.hide ?? "");
  if (hide === "1" || hide === "0") await setHidden(me.userid, hide === "1");
  // (18 October: off the Watch list at once, and nobody watches them any more)
  if (hide === "1") {
    await endActivity(me.userid);
    stopWatchersOf(me.userid);
  }
  if (String((ctx.request.body as Record<string, unknown> | undefined)?.brief ?? "") === "1") {
    const [hiddenNow, online] = await Promise.all([isHidden(me.userid), onlineNow()]);
    ctx.status = Status.OK;
    ctx.body = { error: 0, hidden: hiddenNow, online: online.size };
    return;
  }
  const all = await presenceSince(RECENT_SECONDS, MAX_LISTED * 2);
  // (a player appearing offline is on nobody's list but their own)
  const active = all.filter((p) => !p.hidden || p.id === me.userid);
  const ids = active.map((p) => p.id);
  const now = Math.floor(Date.now() / 1000);
  const users = ids.length
    ? await postgres.em
        .getConnection()
        .execute<{ userid: number; username: string }[]>(
          `SELECT userid, username FROM bym."user" WHERE userid IN (${ids.map(() => "?").join(",")}) AND NOT COALESCE(banned, false)`,
          ids
        )
    : [];
  const names = new Map(users.map((u) => [Number(u.userid), u.username]));
  const tags = await tagsOfUsers(ids).catch(() => new Map());
  const players = active
    .filter((p) => names.has(p.id))
    .slice(0, MAX_LISTED)
    .map(({ id, at, online, hidden }) => {
      const t = tags.get(id);
      // (the player's own row: online as they are, marked as appearing offline)
      const mine = id === me.userid;
      return { id, name: names.get(id)!, ...(t && { tag: t.tag, aid: t.allianceId }), at, online: mine ? now - at <= ONLINE_SECONDS : online, ...(mine && hidden && { hidden: true }) };
    });
  const hidden = all.some((p) => p.id === me.userid && p.hidden) || hide === "1";
  ctx.status = Status.OK;
  ctx.body = { error: 0, now, onlineSeconds: ONLINE_SECONDS, hidden: hide === "0" ? false : hidden, players };
};
