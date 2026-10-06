import z from "zod";

/** A bet's own id, made by the client: the same id sent again is answered, not played again. */
const requestId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "That request is not valid.");
const stake = z.coerce.number({ message: "Choose a bet." }).int("Bets are whole Shiny.");

export const MagmaDropSchema = z.object({
  request_id: requestId,
  bet: stake,
  risk: z.enum(["low", "medium", "high"], { message: "Choose low, medium or high risk." }),
});

export const ScratchBuySchema = z.object({
  request_id: requestId,
  tier: z.enum(["bone", "obsidian", "magma"], { message: "Choose a ticket." }),
});

export const RotateSeedSchema = z.object({
  client_seed: z.string().regex(/^[A-Za-z0-9_-]{0,32}$/, "A client seed is up to 32 letters, digits, - or _.").optional(),
});

export const CasinoHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** A Roulette slip: `bets` as JSON, [{ "on": "spurtz" | "lava" | "ash" | "wormzer" | ..., "amount": 5 }, ...]. */
export const RouletteSpinSchema = z.object({
  request_id: requestId,
  bets: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    },
    z.array(z.object({ on: z.string().regex(/^[a-z]{2,16}$/, "That is not a place to bet."), amount: stake }), { message: "Place a bet first." })
      .min(1, "Place a bet first.")
      .max(20, "Too many bets on one spin."),
  ),
});

export const SlotsSpinSchema = z.object({
  request_id: requestId,
  bet: stake,
});

export const FortuneSpinSchema = SlotsSpinSchema;

export const FavorSpinSchema = z.object({
  request_id: requestId,
});

export const CasinoLiveSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const BonePileStartSchema = z.object({
  request_id: requestId,
  bet: stake,
  sabnox: z.coerce.number({ message: "Choose how many Sabnox." }).int("Choose how many Sabnox."),
});

export const BonePileRevealSchema = z.object({
  session_id: z.coerce.number().int().positive("That game could not be found."),
  tile: z.coerce.number().int().min(0, "That is not a pile.").max(24, "That is not a pile."),
});

export const BonePileCashoutSchema = z.object({
  session_id: z.coerce.number().int().positive("That game could not be found."),
});

export const AscentBetSchema = z.object({
  request_id: requestId,
  round_id: z.coerce.number().int().positive("That flight could not be found."),
  bet: stake,
  /** An automatic cash-out (1.01 and up), or empty / 0 for none. */
  auto_cashout: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ message: "The automatic cash-out is a number like 2.00." }).optional()),
});

export const AscentCashoutSchema = z.object({
  round_id: z.coerce.number().int().positive("That flight could not be found."),
});

/** A Derby slip: `bets` as JSON, [{ "on": "spurtz", "amount": 10 }, ...], the runners to win. */
export const DerbyBetSchema = z.object({
  request_id: requestId,
  round_id: z.coerce.number().int().positive("That race could not be found."),
  bets: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    },
    z.array(z.object({ on: z.string().regex(/^[a-z]{2,16}$/, "That monster is not running."), amount: stake }), { message: "Pick a monster first." })
      .min(1, "Pick a monster first.")
      .max(8, "Too many bets on one slip."),
  ),
});
