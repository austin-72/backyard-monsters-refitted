import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { postgres } from "../../server.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { referralsEnabled } from "../../services/user/referrals.js";

/**
 * Inferno-only (QoL #520): who an invite code belongs to, for the sign-up form a friend's invite link opens
 * ("Ann invited you: you both get 250 Shiny"), before anyone is logged in. Answers the inviter's name and the Shiny
 * each side gets (config referral.shiny), or an empty name when the code is no one's, invites pay nothing on this
 * server, or the inviter is barred from invite rewards (nothing would be paid). One lookup on an indexed column.
 *
 * GET /invite/:code -> { error: 0, name: "Ann", shiny: 250 }
 */
export const inviter: KoaController = async (ctx) => {
  const code = String(ctx.params?.code ?? "").trim().toLowerCase();
  let name = "";
  if (referralsEnabled() && /^[a-z0-9]{6,16}$/.test(code)) {
    const rows = await postgres.em.getConnection().execute<{ username: string; barred: boolean | null }[]>(
      `SELECT username, referral_barred AS barred FROM bym."user" WHERE referral_code = ? LIMIT 1`,
      [code]
    );
    if (rows[0] && !rows[0].barred) name = String(rows[0].username ?? "");
  }
  ctx.set("Cache-Control", "public, max-age=300");
  ctx.status = Status.OK;
  ctx.body = { error: 0, name, shiny: name ? infernoOnlyConfig.referral.shiny : 0 };
};
