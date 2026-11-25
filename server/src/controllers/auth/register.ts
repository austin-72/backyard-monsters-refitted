import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { recordReferral } from "../../services/user/referrals.js";
import bcrypt from "bcrypt";
import type { KoaController } from "../../utils/KoaController.js";
import { postgres, redis } from "../../server.js";
import { Env } from "../../enums/Env.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { User } from "../../database/models/user.model.js";
import { FilterFrontendKeys } from "../../utils/FrontendKey.js";
import { emailUniqueErr, usernameUniqueErr } from "../../errors/errors.js";
import { isReservedAdminName, usernameTakenIgnoringCase } from "../../services/admin/admin.js";
import { logger } from "../../utils/logger.js";
import { Status } from "../../enums/StatusCodes.js";
import { UserRegistrationSchema } from "../../schemas/AuthSchemas.js";
import { parseInput } from "../../schemas/parseInput.js";
import { BYMR_CDN } from "../../services/discord/fetchDiscordAvatar.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { randomInt } from "crypto";

/**
 * Controller to handle user registration.
 *
 * This controller registers a new user based on the provided input. It hashes the user's
 * password, saves the user to the database, and returns the filtered user information.
 * If registration fails, it throws an authentication failure error.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 * @throws {Error} - Throws an error if registration fails or if the request body is invalid.
 */
const defaultAvatarHost = () => {
  const base = (process.env.BASE_URL ?? "").replace(/\/+$/, "");
  // Local installs are reached on BASE_URL:PORT; a public one sits behind a proxy on BASE_URL itself.
  return /localhost|127\.0\.0\.1/.test(base) ? `${base}:${process.env.PORT ?? 3001}` : base || BYMR_CDN;
};

/**
 * Accounts made from one address: 5 an hour in prod (a minute elsewhere). Only accounts actually made count
 * (QoL #508); the refusal says how long is left in plain words.
 */
const MADE_MAX = 5;
const madeWindow = () => (process.env.ENV === Env.PROD ? 3600 : 60);
const madeKey = (ip: string) => `register:made:${ip}`;

const checkMade = async (ip: string) => {
  const made = Number((await redis.get(madeKey(ip)).catch(() => null)) ?? 0);
  if (made < MADE_MAX) return;
  const left = Math.max(1, Number(await redis.ttl(madeKey(ip)).catch(() => madeWindow())));
  const minutes = Math.ceil(left / 60);
  throw new ClientSafeError({
    message: `${MADE_MAX} accounts have been made from this connection in the last hour. You can make another in ${minutes <= 1 ? "a minute" : `${minutes} minutes`}.`,
    status: Status.TOO_MANY_REQUESTS,
    data: {},
    isClientFriendly: true,
  });
};

/**
 * (18 October, SUSPECTED-BUGS.md: the count was read first and raised after the account was made, so sign-ups sent
 * at once all passed) An account's place in the hour's count is taken before it is made, and given back if making
 * it fails.
 */
const reserveMade = async (ip: string) => {
  const key = madeKey(ip);
  const n = await redis.incr(key).catch(() => 0);
  if (n === 1) await redis.expire(key, madeWindow()).catch(() => null);
  if (n > MADE_MAX) {
    await redis.decr(key).catch(() => 0);
    await checkMade(ip);
  }
};
const unreserveMade = async (ip: string) => {
  await redis.decr(madeKey(ip)).catch(() => 0);
};

/**
 * Inferno-only (QoL #514): up to three free names like a taken one ("ann" -> "ann42", "ann_7", "ann318"), asked for
 * in one query. Never an admin's reserved name. Empty when none of the ones tried is free.
 */
const suggestNames = async (wanted: string): Promise<string[]> => {
  const stem = wanted.replace(/[^a-zA-Z0-9_]/g, "") || "player";
  const fit = (tail: string) => stem.slice(0, Math.max(1, 12 - tail.length)) + tail;
  const tails = [
    String(randomInt(10, 100)),
    "_" + randomInt(1, 10),
    String(randomInt(100, 1000)),
    String(randomInt(10, 100)),
    "_" + randomInt(10, 100),
    String(randomInt(1000, 10000)),
    "x",
    "_" + randomInt(100, 1000),
  ];
  const tried = [...new Set(tails.map(fit))].filter((n) => /^[a-zA-Z0-9_]{2,12}$/.test(n) && n.toLowerCase() !== wanted.toLowerCase());
  if (!tried.length) return [];
  const rows = await postgres.em.getConnection().execute<{ name: string }[]>(
    `SELECT lower(username) AS name FROM bym."user" WHERE lower(username) IN (${tried.map(() => "?").join(", ")})`,
    tried.map((n) => n.toLowerCase())
  );
  const taken = new Set(rows.map((r) => String(r.name)));
  return tried.filter((n) => !taken.has(n.toLowerCase()) && !isReservedAdminName(n)).slice(0, 3);
};

/**
 * Inferno-only (QoL #513, #514): every problem with the sign-up at once, each for its own field, so the game shows each
 * under that field: a name or an address that breaks the rules, a name and an address already taken (both checked in
 * the same answer), and free names like a taken one. The message is the first problem's, as before, for older games;
 * the details are in data.io: { fields: { username?, email?, password? }, taken: { username, email }, suggestions }.
 */
const checkAllProblems = async (body: unknown) => {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const shape = UserRegistrationSchema.shape;
  const fields: Record<string, string> = {};
  const name = shape.username.safeParse(raw.username);
  const email = shape.email.safeParse(raw.email);
  const password = shape.password.safeParse(raw.password);
  if (!name.success) fields.username = name.error.issues[0]?.message || "Usernames must be between 2 and 12 characters";
  if (!email.success) fields.email = email.error.issues[0]?.message || "Invalid email address";
  if (!password.success) fields.password = password.error.issues[0]?.message || "Password must be at least 8 characters long";

  let nameTaken = false;
  let emailTaken = false;
  let suggestions: string[] = [];
  if (name.success) {
    // (as below: the same name in any capitals, or an admin's reserved one)
    nameTaken = isReservedAdminName(name.data) || (await usernameTakenIgnoringCase(name.data));
    if (nameTaken) {
      fields.username = usernameUniqueErr().message;
      suggestions = await suggestNames(name.data).catch(() => []);
    }
  }
  if (email.success) {
    emailTaken = !!(await postgres.em.findOne(User, { email: email.data }));
    if (emailTaken) fields.email = emailUniqueErr().message;
  }

  const first = fields.username || fields.email || fields.password;
  if (!first) return;
  throw new ClientSafeError({
    message: first,
    status: nameTaken || emailTaken ? Status.CONFLICT : Status.BAD_REQUEST,
    data: { io: { fields, taken: { username: nameTaken, email: emailTaken }, suggestions } },
    isClientFriendly: true,
  });
};

export const register: KoaController = async (ctx) => {
  // (Inferno-only, QoL #513, #514: all the problems in one answer; the checks below then pass)
  if (infernoOnlyConfig.enabled) {
    await checkMade(ctx.ip);
    await checkAllProblems(ctx.request.body);
  }
  const { ref, ...registeredUser } = parseInput(UserRegistrationSchema, ctx.request.body);
  if (!infernoOnlyConfig.enabled) await checkMade(ctx.ip);

  // Find user by username or email
  const existingUser = await postgres.em.findOne(User, {
    $or: [
      { username: registeredUser.username },
      { email: registeredUser.email },
    ],
  });

  // If user exists, check if username or email is already taken
  if (existingUser) {
    const isUsernameTaken = existingUser.username === registeredUser.username;
    const isEmailTaken = existingUser.email === registeredUser.email;

    if (isUsernameTaken) throw usernameUniqueErr();
    if (isEmailTaken) throw emailUniqueErr();
  }

  // A name that differs from an existing one only in capitals is taken too (an admin's name above all).
  if (registeredUser.username && (await usernameTakenIgnoringCase(registeredUser.username))) throw usernameUniqueErr();
  // The configured admin names are reserved, in any capitals (services/admin/admin.ts).
  if (isReservedAdminName(registeredUser.username)) throw usernameUniqueErr();

  const hash = await bcrypt.hash(registeredUser.password!, 10);

  // Create new user record
  const user = postgres.em.create(User, {
    ...registeredUser,
    // Served by this server (public/assets), so a private server does not lean on the upstream project's CDN.
    pic_square: `${defaultAvatarHost()}/assets/bym-refitted-assets/placeholder.jpg`,
    password: hash,
    registration_ip: ctx.ip,
  });

  await reserveMade(ctx.ip);
  postgres.em.persist(user);
  try {
    await postgres.em.flush();
  } catch (err) {
    await unreserveMade(ctx.ip);
    // (two sign-ups with the same name or email at once: the second is told it is taken, not a 500)
    if (err instanceof UniqueConstraintViolationException) {
      if (/email/i.test(String((err as Error).message))) throw emailUniqueErr();
      throw usernameUniqueErr();
    }
    throw err;
  }
  await recordReferral(user, ref);
  const filteredUser = FilterFrontendKeys(user);
  logger.info(
    `User ${filteredUser.username} registered successfully | ID: ${filteredUser.userid} | Email: ${filteredUser.email} | IP Address: ${ctx.ip}`
  );

  ctx.status = Status.OK;
  ctx.body = { user: filteredUser };
};
