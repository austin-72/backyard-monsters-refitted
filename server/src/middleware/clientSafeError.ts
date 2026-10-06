import type { Context, Next } from "koa";
import { logger } from "../utils/logger.js";
import { Status } from "../enums/StatusCodes.js";

interface ConstructorParams {
  status: number;
  data: object;
  internalInfo?: Error;
  message: string;
  isClientFriendly?: boolean;
}

/**
 * Error which is marked and formatted to be safe for the client
 * Removes internal details while logging them for debugging on our end
 */
export class ClientSafeError extends Error {
  status: number;
  data: object;
  internalInfo?: Error;
  error: string;
  isClientFriendly: boolean;

  constructor({
    message = "Something went wrong, please contact support.",
    status = Status.INTERNAL_SERVER_ERROR,
    data = {},
    internalInfo,
    isClientFriendly: isNiceError = false,
  }: ConstructorParams) {
    super(message);
    this.name = "ClientSafeError";
    this.status = status;
    this.data = data;
    this.internalInfo = internalInfo;
    this.error = message;
    this.isClientFriendly = isNiceError;
  }

  // Create the json to return safely to client
  toSafeJson() {
    const responseBody = {
      error: undefined as string | undefined,
      status: this.status,
      data: this.data,
      // The stack stays on the server (log and the admin panel's Bugs tab); it is sent to the game only
      // when running locally.
      internalInfo: process.env.ENV === "local" ? this.internalInfo?.stack : undefined,
      message: this.message,
    };

    if (!this.isClientFriendly) responseBody.error = this.message;

    return responseBody;
  }
}

/**
 * Middleware to intercept errors and hide them from the user unless they are specifically thrown as ClientSafeErrors.
 *
 * @param {Context} ctx - The Koa context object.
 * @param {Next} next - The Koa next middleware function.
 */
export const ErrorInterceptor = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    // Check if the error is client safe
    const isSafe = err instanceof ClientSafeError;
    let clientError = isSafe
      ? err
      : new ClientSafeError({
          message: "Something went wrong, please contact support.",
          status: Status.INTERNAL_SERVER_ERROR,
          data: {},
          internalInfo: err instanceof Error ? err : undefined,
          isClientFriendly: true,
        });
    const errorObj = clientError.toSafeJson();

    if (!isSafe) {
      logger.error("Unhandled error on {method} {path}: {error}", {
        method: ctx.method,
        path: ctx.path,
        error: err,
      });
    }

    console.error(
      `ErrorInterceptor error: ${errorObj.message} | status: ${errorObj.status}`
    );

    // Server failures (500s) go to the admin panel's Bugs tab too, with the stack, grouped like the
    // game's own reports. Never lets a failure to record hide the answer.
    let ref: string | undefined;
    if (!isSafe || errorObj.status >= 500) {
      const authUser = (ctx as unknown as { authUser?: { userid?: number; username?: string } }).authUser;
      const cause = err instanceof Error ? err : new Error(String(err));
      const body = (ctx.request as unknown as { body?: Record<string, unknown> }).body;
      const fields = body && typeof body === "object"
        ? Object.keys(body).filter((k) => k !== "password" && k !== "token").slice(0, 40).join(", ")
        : "";
      // The request's short values (ids, types, coordinates; never passwords, tokens or whole yards), so
      // the report says what was asked for, not only which fields came.
      const values = body && typeof body === "object"
        ? Object.entries(body)
            .filter(([k, v]) => !/password|token|email/i.test(k) && (typeof v === "number" || (typeof v === "string" && v.length <= 40)))
            .slice(0, 12)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(" ")
        : "";
      // Loaded when needed: this module is imported by modules the server itself loads first.
      const reports = import("../services/admin/bugReports.js");
      ref = await reports.then(({ newBugRef }) => newBugRef()).catch(() => undefined);
      reports.then(async ({ recordBug, rememberBugRef, accountOf, clientOf }) => {
        const id = await recordBug({
          message: `Server ${errorObj.status} on ${ctx.method} ${ctx.path}: ${cause.message}`,
          context:
            `account: ${accountOf(authUser)} | client: ${clientOf(ctx.get("user-agent"))}` +
            (ref ? ` | ref: ${ref}` : "") +
            `\n\nserver stack:\n${(cause.stack ?? "").slice(0, 3000)}\n\nrequest fields: ${fields}` +
            (values ? `\nrequest values: ${values}` : ""),
          build: "server",
          userid: authUser?.userid,
        });
        if (ref && id) await rememberBugRef(ref, id);
      }).catch((e) => logger.warn(`Could not record a server error as a bug: ${e}`));
    }

    // Put me in jail for my sins - this is bad to accomdate for the client
    ctx.status = errorObj.error ? Status.OK : errorObj.status;
    ctx.body = { error: errorObj.message, errorDetails: errorObj, ...(ref ? { ref } : {}) };
  }
};
