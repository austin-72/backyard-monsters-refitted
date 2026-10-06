/**
 * Inferno-only: attack replays (services/replays/replays.ts). Player-versus-player attacks (on a main yard or an
 * outpost) are recorded by the attacker's game; the attacker and the defender can watch them from the attack
 * logs, share them in chat, and download them to watch later. Server restart only.
 */
export const replayConfig = {
  enabled: true,
  /** Replays are kept this many days ... */
  keepDays: 7,
  /** ... except that each defender keeps at least this many of the newest, however old. */
  keepPerDefender: 10,
  /** An imported replay (a downloaded file opened again) is kept this long, for the player who opened it. */
  importedHours: 24,
  /** A recording no part has come for in this long is finished with what it has (the attacker's game closed). */
  staleMinutes: 30,
  /** The most a replay's parts can add up to (characters of the game's JSON), and one part. */
  maxBytes: 6_000_000,
  maxChunkBytes: 600_000,
  /** The largest file accepted to import. */
  maxImportBytes: 4_000_000,
};
