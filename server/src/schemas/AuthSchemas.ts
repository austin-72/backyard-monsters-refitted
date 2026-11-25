import z from "zod";
import { SessionType } from "../enums/SessionType.js";

const emailError = "Invalid email address";

const passwordLengthError = "Password must be at least 8 characters long";
const passwordSpecialError = "Password must contain at least one special character";

/**
 * Schema to validate a new password (register, reset).
 * - Must be at least 8 characters long.
 * - Must contain at least one special character (any non-alphanumeric character).
 * (13 October: required: it was optional, and register or reset with none hashed undefined, a 500)
 */
const requiredPasswordSchema = z.preprocess(
  (input) => (input === "" || input === undefined || input === null ? "" : input),
  z.string()
    .trim()
    .min(8, passwordLengthError)
    // (QoL #527: bcrypt reads the first 72 bytes only: a longer one would be cut without a word)
    .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "Password must be at most 72 characters long")
    .regex(/[^a-zA-Z0-9]/, passwordSpecialError)
);

/**
 * Schema to validate email addresses.
 * - Must be a valid email format.
 * - Converts the email to lowercase.
 */
const emailSchema = z.email(emailError).trim().toLowerCase();

const usernameCharsetError = "Usernames can only contain letters, numbers and underscores";
const usernameLengthError = "Usernames must be between 2 and 12 characters";

/**
 * Schema to validate usernames.
 * - Must be 2 to 12 characters long.
 * - Letters, numbers and underscores only.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(2, usernameLengthError)
  .max(12, usernameLengthError)
  .regex(/^[a-zA-Z0-9_]+$/, usernameCharsetError);

/**
 * A password typed at login: any text. The rules for new passwords are checked when one is chosen
 * (register, reset); at login a password that breaks them is simply a wrong password.
 */
const loginPasswordSchema = z.preprocess(
  (input) => (input === "" ? undefined : input),
  z.string().trim().max(256).optional()
);

/**
 * Schema to validate user login data.
 * - Email is optional.
 * - Password is optional.
 * - Token is optional.
 * - sessionType distinguishes game sessions from launcher/website sessions.
 * The login controller answers any mismatch with "login credentials are incorrect", not a server error.
 */
export const UserLoginSchema = z.object({
  email: emailSchema.optional(),
  password: loginPasswordSchema,
  token: z.string().optional(),
  sessionType: z.enum([SessionType.GAME, SessionType.LAUNCHER]).default(SessionType.GAME),
});

/**
 * Schema to validate user registration data.
 * - Username must be between 2 and 12 characters.
 * - Email must meet the email schema requirements.
 * - Password must meet the password schema requirements.
 */
export const UserRegistrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: requiredPasswordSchema,
  /** Inferno-only: the invite code the game was started with (services/user/referrals.ts). */
  ref: z.string().max(32).optional(),
});

/**
 * Schema to validate a username change request.
 * - Username must meet the username schema requirements.
 */
export const ChangeUsernameSchema = z.object({ username: usernameSchema });

/**
 * Schema to validate an account settings update.
 * - Callers send the whole settings block, not a partial one.
 * - shinyLocked toggles no-shiny mode.
 */
export const UpdateSettingsSchema = z.object({
  shinyLocked: z.boolean(),
});

/**
 * Schema to validate password reset data.
 * - Password must meet the password schema requirements.
 * - Token must be a string.
 */
/** Inferno-only (QoL #198): a new password chosen while logged in, with the one it replaces. */
export const ChangePasswordSchema = z.object({
  oldPassword: z.string().trim().min(1, "Type your current password"), // (18 October: trimmed, as login does)
  newPassword: requiredPasswordSchema,
});

/**
 * Inferno-only (QoL #199): a new email chosen while logged in, with the current password. The email is checked as
 * at registration (lowercased); the password is only compared, so any password that signs in is accepted.
 */
export const ChangeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().trim().min(1, "Type your current password").max(256), // (18 October: trimmed, as login does)
});

/**
 * Inferno-only (QoL #197): the Shiny lock. `above`: spending more than this many Shiny asks for the password
 * (0 = off), set with the current password; or `check` the password before such a spend.
 */
export const ShinyLockSchema = z.object({
  password: z.string().trim().min(1, "Type your password").max(256), // (18 October: trimmed, as login does)
  above: z.coerce.number().int().min(0).max(1_000_000).optional(),
  check: z.preprocess((v) => v === true || v === "1" || v === 1, z.boolean()).optional(),
});

export const ResetPasswordSchema = z.object({
  password: requiredPasswordSchema,
  token: z.string(),
});

/**
 * Schema to validate forgot password data.
 * - Email must meet the email schema requirements.
 */
export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});
