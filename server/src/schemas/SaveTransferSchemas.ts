import z from "zod";

import { SAVE_CODE_PREFIX } from "../config/SaveTransferConfig.js";

const finite = z.number().finite();

/**
 * The contents of a jsonb column: any JSON value.
 *
 * Not narrowed to objects or arrays. The save route stores whatever the client sends,
 * falling back to the raw string when it isn't JSON. So a real save can hold a number,
 * string or boolean in any of these columns, and an export must never fail because of
 * it. The value always comes from Postgres or JSON.parse, so it is JSON by construction;
 * walking every building of a large yard with z.json() also cost more than reading,
 * compressing and signing it put together.
 */
const json = z.custom<any>((value) => value !== undefined && typeof value !== "function" && typeof value !== "symbol");

/** Counters the database stores as strings but the client sometimes sends as numbers. */
const numericString = z.union([z.string(), finite]).transform(String);

/**
 * The parts of a yard that carry over between servers: buildings, research, monsters,
 * resources, quests, achievements, champions, store items and so on.
 *
 * Deliberately left out, because they only mean something on the server that made them:
 * row and base ids, the owner's ids and name, world membership and map cells, outposts
 * and captured MR3 resources, wild monster tribe status, in-flight attacks and reports,
 * and mail and gift state.
 *
 * krallen is kept: it holds the Krallen tier and win streak, which decide on every load
 * whether the player keeps the Krallen champion. Rounds follow the calendar, not the
 * server, so the importing server settles it exactly as the exporting one would.
 *
 * Empty columns (null) are left out of the export, so the importing server keeps its
 * new-player default for them.
 */
export const PortableSaveSchema = z
  .object({
    // Progress counters
    level: finite,
    points: numericString,
    basevalue: numericString,
    empirevalue: finite,
    empiredestroyed: finite,
    tutorialstage: finite,
    timeplayed: finite,
    version: finite,
    credits: finite,
    purchasecomplete: finite,

    // Yard state. Building countdowns are stored as time remaining at savetime, so the
    // two travel together and a reader can bring timers forward to the present.
    savetime: finite,
    id: finite,
    seed: finite,
    baseseed: finite,
    basename: z.string(),
    catapult: finite,
    flinger: finite,
    destroyed: finite,
    damage: finite,
    protected: finite,
    protect: finite,
    over: finite,
    healtime: finite,
    mapversion: finite,
    mr2upgraded: z.boolean(),

    // jsonb objects
    buildingdata: json,
    buildingkeydata: json,
    buildinghealthdata: json,
    researchdata: json,
    stats: json,
    academy: json,
    rewards: json,
    aiattacks: json,
    monsters: json,
    resources: json,
    iresources: json,
    lockerdata: json,
    events: json,
    inventory: json,
    monsterbaiter: json,
    loot: json,
    storedata: json,
    coords: json,
    quests: json,
    player: json,
    siege: json,
    mushrooms: json,
    frontpage: json,
    krallen: json,

    // jsonb arrays (nullable in the database)
    champion: json,
    savetemplate: json,
    effects: json,
    achieved: json,
    fbpromos: json,
  })
  .partial();

export type PortableSave = z.infer<typeof PortableSaveSchema>;

/** The save keys copied by an export. */
export const PORTABLE_SAVE_KEYS = Object.keys(PortableSaveSchema.shape) as (keyof PortableSave)[];

/**
 * The signed contents of a save code, before compression.
 */
export const SaveCodePayloadSchema = z.object({
  format: z.literal(SAVE_CODE_PREFIX),
  version: z.number().int(),
  /** Unique per export. */
  exportId: z.uuid(),
  /** ISO 8601 time the export was made. */
  exportedAt: z.iso.datetime(),
  issuer: z.object({ name: z.string().max(255), keyId: z.string() }),
  /** The player's account on the exporting server. `userid` is what imports are counted by. */
  account: z.object({
    userid: z.number().int().positive().max(2_147_483_647),
    username: z.string().max(64),
    timeplayed: finite,
    stats: json,
  }),
  saves: z.object({
    main: PortableSaveSchema,
    inferno: PortableSaveSchema.nullable(),
  }),
});

export type SaveCodePayload = z.infer<typeof SaveCodePayloadSchema>;
