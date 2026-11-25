import {
  Entity,
  Property,
  PrimaryKey,
  OneToOne,
  Index,
} from "@mikro-orm/decorators/es";
import { PrimaryKeyProp, type Opt } from "@mikro-orm/core";

import { Save } from "./save.model.js";
import { FrontendKey } from "../../utils/FrontendKey.js";
import { AllianceRole } from "../../enums/Alliance.js";
import type { JsonObject } from "../../types/JsonObject.js";

@Entity({ tableName: "user" })
export class User {

  [PrimaryKeyProp]?: "userid";
  @FrontendKey
  @PrimaryKey({ autoincrement: true, type: "number" })
  userid!: number;

  @OneToOne(() => Save, { nullable: true })
  save?: Save | null;

  @OneToOne(() => Save, { nullable: true })
  infernosave?: Save | null;

  @Property({ type: "string", unique: true })
  @FrontendKey
  username!: string;

  @FrontendKey
  @Property({ type: "Date", nullable: true })
  username_changed_at?: Date | null;

  @Property({ type: "boolean", default: false })
  banned: Opt<boolean> = false;

  @Property({ type: "boolean", default: false })
  shiny_locked: Opt<boolean> = false;

  @Property({ type: "string", unique: true })
  @FrontendKey
  email!: string;

  @Property({ type: "string" })
  password!: string;

  @Property({ type: "boolean", default: false })
  discord_verified: Opt<boolean> = false;

  @Property({ type: "string", nullable: true })
  @Index()
  discord_id?: string | null;

  @Property({ type: "string", nullable: true })
  discord_tag?: string | null;

  @Property({ type: "Date", nullable: true })
  discord_avatar_checked_at?: Date | null;

  @Property({ type: "string", default: "" })
  @FrontendKey
  last_name: Opt<string> = "";

  @Property({ type: "string", default: "" })
  resetToken: Opt<string> = "";

  @FrontendKey
  @Property({ type: "string", nullable: true })
  pic_square?: string | null;

  @FrontendKey
  @Property({ type: "number", default: 0 })
  timeplayed: Opt<number> = 0;

  @FrontendKey
  @Property({ columnType: "jsonb", nullable: true })
  stats?: JsonObject | null = {};

  @FrontendKey
  @Property({ type: "number", default: 0 })
  friendcount: Opt<number> = 0;

  @FrontendKey
  @Property({ type: "number", default: 0 })
  sessioncount: Opt<number> = 0;

  @FrontendKey
  @Property({ type: "number", default: 100 })
  addtime: Opt<number> = 100;

  @FrontendKey
  @Property({ columnType: "jsonb", nullable: true })
  bookmarks?: JsonObject | null = {};

  @Property({ columnType: "jsonb" })
  blockedUsers: Opt<number[]> = [];

  @FrontendKey
  @Property({ type: "number", default: 0 })
  sendgift: Opt<number> = 0;

  @FrontendKey
  @Property({ type: "number", default: 0 })
  sendinvite: Opt<number> = 0;

  @Index()
  @Property({ type: "number", nullable: true })
  alliance_id?: number | null;

  @Property({ type: "string", nullable: true })
  alliance_role?: AllianceRole | null;

  // Inferno-only referrals (services/user/referrals.ts)
  @Property({ type: "string", nullable: true, length: 16 })
  referral_code?: string | null;

  @Property({ type: "number", nullable: true })
  referred_by?: number | null;

  @Property({ type: "boolean", default: false })
  referral_credited?: boolean;

  @Property({ type: "string", nullable: true, length: 400 })
  referral_notice?: string | null;

  /** "paid", "same-ip" or "no-inviter" once the referral is decided (the friend's first load); null before. */
  @Property({ type: "string", nullable: true, length: 16 })
  referral_result?: string | null;

  /** Barred by an admin from invite rewards (abuse of the invite link): friends joining through it pay nothing. */
  @Property({ type: "boolean", default: false })
  referral_barred?: boolean;

  @Property({ type: "string", nullable: true, length: 400 })
  referral_barred_reason?: string | null;

  @Property({ type: "string", nullable: true, length: 64 })
  registration_ip?: string | null;

  @Property({ type: "string", nullable: true, length: 64 })
  last_ip?: string | null;

  // Inferno-only daily login reward (services/user/dailyLogin.ts)
  @Property({ type: "number", default: 0 })
  login_streak?: number;

  /** UTC day (YYYY-MM-DD) the reward was last collected. */
  @Property({ type: "string", nullable: true, length: 10 })
  login_last_claim?: string | null;

  /**
   * (QoL #126) Streak savers held, 0 or 1: one is earned by each completed 14-day stretch and forgives a single missed
   * day (services/user/dailyLogin.ts). Migration 20261108_StreakSaver; ensureStreakSaver makes it at start too.
   */
  @Property({ type: "number", default: 0 })
  login_savers?: number;

  /** Shown to the player when a banned account tries to log in (set from the admin panel). */
  @Property({ type: "string", nullable: true, length: 400 })
  ban_reason?: string | null;

  /**
   * Inferno-only (QoL #261): the account's admin role, "owner", "admin" or "support" (the panel read only), or none
   * (migration 20261109_AdminRoles). Read through services/admin/admin.ts (adminRole): the names in
   * InfernoOnlyConfig.admins are owners whatever this says.
   */
  @Property({ type: "string", nullable: true, length: 16 })
  admin_role?: string | null;

  /** Inferno-only: the player's own saved outpost kits, 3 slots (services/maproom/v2/playerKits.ts). */
  @Property({ type: "json", nullable: true })
  player_kits?: (PlayerKit | null)[] | null;

  /**
   * Inferno-only (12 November, migration 20261115_OutpostLayouts): the Yard Planner's 10 outpost layouts, shared by all
   * the player's outposts (controllers/yardplanner/plannerSave.ts): [{ slotid, name, data, saved, from }], from: the
   * outpost (baseid) it was saved in. Null until first used (then filled from the outposts' own slots).
   */
  @Property({ type: "json", nullable: true })
  outpost_layouts?: any[] | null;
}

export interface PlayerKit {
  name: string;
  savedAt: number;
  /** Picture file name stem under public/assets/kits/player/ (a random id, so pictures cannot be guessed). */
  image?: string;
  buildings: Record<string, { t: number; X: number; Y: number; id: number; prefab?: number; fort?: number }>;
}
