import z from "zod";

import { AllianceInviteStatus, AllianceStance } from "../enums/Alliance.js";

/**
 * Schema to validate alliance creation data.
 */
export const CreateAllianceSchema = z.object({
  alliance_name: z.string().trim(),
  alliance_image: z.coerce.number().int().min(1).max(41),
  alliance_desc: z.string().trim().min(1).max(255),
  /** Inferno-only (14 October): a designed crest (services/alliance/allianceCrest.ts), or none. */
  alliance_crest: z.string().max(32).optional(),
});

/**
 * Schema to validate alliance edit data.
 */
export const EditAllianceSchema = z.object({
  alliance_image: z.coerce.number().int().min(1).max(41),
  alliance_desc: z.string().trim().min(1).max(255),
  /** Inferno-only (13 October): a new name (renaming), and the chat tag; a game from before sends neither. */
  alliance_name: z.string().trim().max(64).optional(),
  alliance_tag: z.string().max(32).optional(),
  /** Inferno-only (14 October): the crest designed ("" for the preset shield again); a game from before sends none. */
  alliance_crest: z.string().max(32).optional(),
});

/**
 * Schema to validate Browse-tab search/pagination params. `world` limits results
 * to the player's own world - the tab's "This World" filter, as opposed to "All".
 */
export const SearchAlliancesSchema = z.object({
  search: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(0).catch(0),

  // TODO: this is shit, this is a string because alliance calls use URLLoaderApi.load (form-encoded).
  // Moving them to invokeApiRequest (JSON) would make this a plain z.boolean(), but that
  // first needs invokeApiRequest to route server error bodies to onComplete the way load()
  // does, or the tabs lose their error messages. Change both together - stringbool() rejects
  // a real boolean, so the filter would silently stop working.
  world: z.stringbool().catch(false),
});

/**
 * Schema for the Browse tab's Request to Join button.
 */
export const RequestJoinSchema = z.object({
  alliance_id: z.coerce.number().int().positive(),
  /** Inferno-only (QoL #169): a few words to the leader, optional. */
  message: z.string().max(400).optional(),
});

/**
 * Schema for the Members and Suggested tabs' Invite button.
 */
export const InviteUserSchema = z
  .object({
    userid: z.coerce.number().int().positive().optional(),
    // (Inferno-only, QoL #162: invite by name from the Recruit tab)
    username: z.string().trim().min(2).max(12).regex(/^[a-zA-Z0-9_]+$/).optional(),
  })
  .refine((v) => v.userid !== undefined || v.username !== undefined);

/**
 * Schema for the Members tab's leader-only Kick and Promote buttons.
 */
export const MemberActionSchema = z.object({
  userid: z.coerce.number().int().positive(),
});

/**
 * Schema for answering a pending invite or request. The original sent only
 * "accepted" or "declined" here - pending is not a status a player may set.
 */
export const ChangeInviteStatusSchema = z.object({
  invite_id: z.coerce.number().int().positive(),
  status: z.enum([AllianceInviteStatus.ACCEPTED, AllianceInviteStatus.DECLINED]),
});

/**
 * Schema for the Invites tab's Delete button, which posts the checked rows as a
 * comma-separated list of ids.
 */
export const DeleteMessagesSchema = z.object({
  invite_ids: z
    .string()
    .transform((ids) => ids.split(",").map(Number))
    .pipe(z.array(z.number().int().positive()).max(100)),
});

/**
 * Schema for the Browse tab's leader-only Foe / Neutral / Ally buttons.
 */
export const ChangeRelationshipSchema = z.object({
  target_alliance_id: z.coerce.number().int().positive(),
  relationship: z.coerce.number().int().pipe(z.enum(AllianceStance)),
});

/**
 * Schema for the Power-Ups tab's leader-only Activate button.
 */
export const ActivatePowerupSchema = z.object({
  powerup_id: z.coerce.number().int().positive(),
  // (Inferno-only, 22 October: 2 runs longer and charges longer after; anything else is 1)
  tier: z.coerce.number().int().optional(),
});

/** Inferno-only (22 October): a power-up's planned start (at: seconds; 0 cancels it). */
export const PlanPowerupSchema = z.object({
  powerup_id: z.coerce.number().int().positive(),
  at: z.coerce.number().int().nonnegative(),
  tier: z.coerce.number().int().optional(),
});

/**
 * Schema for the Speed Up dialog's Buy button.
 */
export const PurchasePowerupSchema = z.object({
  powerup_id: z.coerce.number().int().positive(),
  purchase_hours: z.coerce.number().int().positive(),
});

/**
 * Inferno-only: which alliance's roster to list (Browse -> Actions -> Members).
 */
export const AllianceMembersSchema = z.object({
  alliance_id: z.coerce.number().int().positive(),
});
