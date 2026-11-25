import type { KoaController } from "../utils/KoaController.js";
import { User } from "../database/models/user.model.js";
import { Status } from "../enums/StatusCodes.js";
import { getAnnouncement, markAnnouncementSeen } from "../services/admin/admin.js";

/**
 * Inferno-only (15 October, QoL #485): the game has shown the admin panel's announcement to this account; it isn't
 * sent to it again, on any device. Only the announcement showing now can be marked.
 */
export const announcementSeen: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const now = await getAnnouncement();
  if (now && String(body.id ?? "") === String(now.id)) await markAnnouncementSeen(user.userid, String(now.id));
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
