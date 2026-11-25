import z from "zod";

import { SAVE_CODE_PREFIX } from "../config/SaveTransferConfig.js";

const finite = z.number().finite();

/**
 * Any value a jsonb column can hold. The save route stores non-JSON client data as a
 * raw string, so this can't be narrowed to objects or arrays.
 */
const json = z.custom<any>((value) => value !== undefined && typeof value !== "function" && typeof value !== "symbol");

const numericString = z.union([z.string(), finite]).transform(String);

/**
 * The save fields that carry over between servers. Fields tied to the exporting server
 * (ids, world and map state, outposts, attacks, mail) are left out.
 */
export const PortableSaveSchema = z
  .object({
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
    champion: json,
    savetemplate: json,
    effects: json,
    achieved: json,
    fbpromos: json,
  })
  .partial();

export type PortableSave = z.infer<typeof PortableSaveSchema>;

export const PORTABLE_SAVE_KEYS = Object.keys(PortableSaveSchema.shape) as (keyof PortableSave)[];

/**
 * The signed contents of a save code.
 */
export const SaveCodePayloadSchema = z.object({
  format: z.literal(SAVE_CODE_PREFIX),
  version: z.number().int(),
  exportId: z.uuid(),
  exportedAt: z.iso.datetime(),
  issuer: z.object({ name: z.string().max(255), keyId: z.string() }),
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
