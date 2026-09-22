/**
 * Must be the first import of the server: every other module reads process.env.ENV as it loads.
 *
 * The code knows exactly two values, "local" and "production". Anything else (the natural typo is
 * "prod") used to fall between them: not local, so no request logging and real token checks, but
 * not production either, so every database query, with player emails and password hashes in it,
 * was still written to the log, and registration limits stayed at their test values.
 * Spellings of the same intent are mapped onto the two real values; an unknown value is treated
 * as production, which is the safe side to be wrong on.
 */
const raw = (process.env.ENV ?? "").trim().toLowerCase();

if (["", "local", "dev", "development", "test"].includes(raw)) {
  process.env.ENV = "local";
} else {
  if (!["production", "prod", "live", "release"].includes(raw))
    console.warn(`\n!!! ENV="${process.env.ENV}" is not a known value. Treating it as "production".\n`);

  process.env.ENV = "production";
}

export {};
