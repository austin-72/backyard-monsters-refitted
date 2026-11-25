import type { KoaController } from "../../utils/KoaController.js";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { verifyJwtToken } from "../../middleware/auth.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { accountOf, attachGameReport, clientOf, recordBug } from "../../services/admin/bugReports.js";
import { postgres } from "../../server.js";
import { serverNotesFor } from "../../middleware/slowRequests.js";

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
  let email: string | null = null;
  const auth = ctx.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      email = verifyJwtToken(auth.slice(7)).user?.email ?? null;
      if (email) user = (await postgres.em.fork().findOne(User, { email }, { fields: ["userid", "username"] })) ?? undefined;
    } catch {
      // An expired or bad token still gets the report recorded, just without the player.
    }
  }

  // (9 October, bug reports 81, 82, 84, 85) A request that failed slowly, or that never got an answer, gets what
  // the server noted of it (middleware/slowRequests.ts): what it was waiting on, or that it never ran long here.
  const slowPath =
    // (13 October: on the message's start only, the pattern bounded: 400,000 characters held the server for minutes)
    message.slice(0, 2000).match(/^HTTP (?:0|5\d\d|408|429) on (\/[^\s?(]+)[^(\n]{0,300}\((\d+) ms\)/)?.[1] ??
    (/chat polling keeps failing/.test(message) ? "/chat/poll" : null);
  // (first, so the report's length limit never cuts it)
  const serverSide = slowPath && (user || email) ? `${serverNotesFor(slowPath, user?.userid ?? null, email)}\n\n` : "";

  const context =
    `account: ${accountOf(user)} | client: ${clientOf(ctx.get("user-agent"), String(body.player ?? "").slice(0, 40))}\n` +
    serverSide + String(body.context ?? "");

  const ref = message.match(/\[ref ([0-9a-f]{8})\]/)?.[1];
  if (ref) {
    // The server's report is written just after it answers; give it a moment if it isn't there yet.
    if (await attachGameReport(ref, `${message.slice(0, 500)}\n${context}`)) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (await attachGameReport(ref, `${message.slice(0, 500)}\n${context}`)) return;
  }

  await recordBug({ message, context, build: String(body.build ?? ""), userid: user?.userid });
};
