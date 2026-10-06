import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { accountOf, attachGameReport, clientOf, recordBug } from "../../services/admin/bugReports.js";
import { postgres } from "../../server.js";

/**
 * POST /bugreport {message, context, build, player}: an error the game client hit
 * (services/admin/bugReports.ts). Works before login too; when the player's token comes with it, the
 * report counts them and names them. The report starts with who (account) and what (Flash Player, or the
 * browser from its User-Agent). A game report of a server failure ("[ref 1a2b3c4d]" in its message) is
 * added to the server's own report of it, which has the server's side (stack, request).
 */
export const reportBug: KoaController = async (ctx) => {
  ctx.status = Status.OK;
  ctx.body = { error: 0 };
  if (!infernoOnlyConfig.enabled) return;

  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const message = String(body.message ?? "").trim();
  if (!message) return;

  let user: { userid: number; username: string } | undefined;
  const auth = ctx.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const email = verifyJwtToken(auth.slice(7)).user?.email;
      if (email) user = (await postgres.em.fork().findOne(User, { email }, { fields: ["userid", "username"] })) ?? undefined;
    } catch {
      // An expired or bad token still gets the report recorded, just without the player.
    }
  }

  const context =
    `account: ${accountOf(user)} | client: ${clientOf(ctx.get("user-agent"), String(body.player ?? "").slice(0, 40))}\n` +
    String(body.context ?? "");

  const ref = message.match(/\[ref ([0-9a-f]{8})\]/)?.[1];
  if (ref) {
    // The server's report is written just after it answers; give it a moment if it isn't there yet.
    if (await attachGameReport(ref, `${message.slice(0, 500)}\n${context}`)) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (await attachGameReport(ref, `${message.slice(0, 500)}\n${context}`)) return;
  }

  await recordBug({ message, context, build: String(body.build ?? ""), userid: user?.userid });
};
