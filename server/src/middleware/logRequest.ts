import type { Context, Next } from "koa";
import { inspect } from "util";
import { Env } from "../enums/Env.js";

/**
 * Middleware to log request data for debugging purposes.
 *
 * This middleware logs request information to the console in local environments
 * with formatted output for better readability.
 *
 * @param {string} [logMessage=""] - Optional label for the log entry.
 * @returns {Function} Koa middleware function.
 */
/** Request bodies are printed in local mode. Credentials never are. */
const SECRET_FIELDS = new Set(["password", "newPassword", "oldPassword", "confirmPassword", "token", "resetToken"]);

const redact = (body: unknown) => {
  if (!body || typeof body !== "object") return body;

  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [key, SECRET_FIELDS.has(key) ? "[hidden]" : value]),
  );
};

export const logRequest = async (ctx: Context, next: Next) => {
  if (process.env.ENV === Env.LOCAL) {
    console.log("=".repeat(70));
    console.log(`📦 ${ctx.method} ${ctx.path}`);

    if (ctx.request.body && Object.keys(ctx.request.body).length > 0) {
      console.log();
      console.log(inspect(redact(ctx.request.body), { colors: true, depth: 5, compact: false }));
    }

    console.log("=".repeat(70) + "\n");
  }
  await next();
};
