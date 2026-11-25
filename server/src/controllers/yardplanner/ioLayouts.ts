import { createHash, randomBytes } from "crypto";

import { Status } from "../../enums/StatusCodes.js";
import { BaseType } from "../../enums/Base.js";
import { User } from "../../database/models/user.model.js";
import { postgres, redis } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import { PlayerKitError, previousPlayerKits, restorePlayerKit } from "../../services/maproom/v2/playerKits.js";
import { plannerSave } from "./plannerSave.js";
import { forgetPreviousLayout, keepPreviousLayout, PREVIOUS_SEC, previousLayout, previousLayouts } from "./plannerPrevious.js";

/**
 * Inferno-only (15 October): the Yard Planner's other ways in and out.
 * - QoL #492: `previous` lists the slots' (and the player kits') earlier versions, kept 7 days; `restoretemplate` puts
 *   one back (worldmapv2/restoreplayerkit for a kit).
 * - QoL #686: `layoutsources` lists the player's slots (the main yard's, and the 10 the outposts share), so Import can
 *   take a layout from any of them (the layout itself is read with gettemplates and that yard's baseid).
 * - QoL #688: `sharelayout` keeps a layout's Import code under a short key for a chat token, `sharedlayout` reads it.
 *   Kept in Redis with no expiry, `io:layout:<key>`; one code gets one key (`io:layout:h:<sha1>`).
 */

// ---- QoL #492

/** POST bm/yardplanner/previous {baseid}: { slots: [{slotid, name, saved, at, until, data}], kits: [...], days: 7 }. */
export const previousTemplates: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const save = await plannerSave(user, body.baseid);
  const [slots, kits] = await Promise.all([previousLayouts(String(save.baseid ?? "")), previousPlayerKits(user)]);
  ctx.status = Status.OK;
  ctx.body = { error: 0, slots, kits, days: Math.round(PREVIOUS_SEC / 86400) };
};

/**
 * POST bm/yardplanner/restoretemplate {baseid, slotid}: the slot gets its earlier version back; what it had becomes its
 * earlier version in turn (a Restore can be undone the same way). Answers the slots, as savetemplate does.
 */
export const restoreTemplate: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const save = await plannerSave(user, body.baseid);
  const baseid = String(save.baseid ?? "");
  const slot = Math.floor(Number(body.slotid));
  ctx.status = Status.OK;
  if (!Number.isInteger(slot) || slot < 0 || slot > 9) {
    ctx.body = { error: "That slot doesn't exist." };
    return;
  }
  const prev = await previousLayout(baseid, slot);
  if (!prev) {
    ctx.body = { error: "There's no earlier version of that slot (they are kept 7 days)." };
    return;
  }
  const templates = [...(save.savetemplate ?? [])];
  const at = templates.findIndex((template) => Number(template.slotid) === slot);
  const current = at === -1 ? null : templates[at];
  const entry = { slotid: slot, name: String(prev.name ?? "").slice(0, 60), data: prev.data, saved: prev.saved || Math.floor(Date.now() / 1000), ...(prev.from && { from: prev.from }) };
  if (at === -1) templates.push(entry);
  else templates[at] = entry;
  save.savetemplate = templates;
  await postgres.em.flush();
  if (current) await keepPreviousLayout(baseid, slot, current);
  else await forgetPreviousLayout(baseid, slot);
  ctx.body = {
    error: 0,
    ...templates,
  };
};

/** POST worldmapv2/restoreplayerkit {slot}: player kit 1-6 gets its earlier version back. { kits } as playerkits. */
export const restoreKit: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  ctx.status = Status.OK;
  try {
    const kits = await restorePlayerKit(user, parseInt(String(body.slot ?? "0")));
    ctx.body = { error: 0, kits };
  } catch (err) {
    if (!(err instanceof PlayerKitError)) throw err;
    ctx.body = { error: err.message };
  }
};

// ---- QoL #686

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** How many buildings a slot's layout places (its data: the client's JSON text of {0: node, 1: node, ...}). */
const countNodes = (data: unknown) => {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed && typeof parsed === "object" ? Object.keys(parsed).length : 0;
  } catch {
    return 0;
  }
};

/** A list of slots as layoutsources gives them: [{ slotid, name, saved, count }], the slots 0-9 with a layout. */
const slotList = (value: unknown) =>
  asArray(value)
    .map((t) => ({ slotid: Math.floor(Number(t.slotid)), name: String(t.name ?? ""), saved: Math.floor(Number(t.saved) || 0), count: countNodes(t.data) }))
    .filter((t) => Number.isInteger(t.slotid) && t.slotid >= 0 && t.slotid <= 9 && t.count > 0)
    .sort((a, b) => a.slotid - b.slotid);

/**
 * POST bm/yardplanner/layoutsources: { yards: [{ baseid, kind: "main" | "outposts", slots: [{ slotid, name, saved,
 * count }] }] }: the main yard's slots, then (12 November) the 10 slots the outposts share, when the player has an
 * outpost (baseid: one of them, for gettemplates). Only the player's own yards.
 */
export const layoutSources: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const listed = (Array.isArray(user.save?.outposts) ? user.save!.outposts : []) as [number, number, string | number][];
  const outpostIds = listed.filter(Array.isArray).map((entry) => String(entry[2]));
  const yards: Record<string, unknown>[] = [{ baseid: String(user.save?.baseid ?? ""), kind: "main", slots: slotList(user.save?.savetemplate) }];
  const rows = outpostIds.length
    ? await postgres.em
        .getConnection()
        .execute<{ baseid: string }[]>(`SELECT baseid FROM bym.save WHERE saveuserid = ? AND type = ?`, [user.userid, BaseType.OUTPOST])
    : [];
  const mine = new Set(rows.map((row) => String(row.baseid)));
  const first = outpostIds.find((id) => mine.has(id));
  if (first) {
    const shared = await plannerSave(user, first);
    yards.push({ baseid: first, kind: "outposts", slots: slotList(shared.savetemplate) });
  }
  ctx.status = Status.OK;
  ctx.body = { error: 0, yards };
};

// ---- QoL #688

const CODE_PREFIX = "BYML1:";
const CODE_MAX = 60000;
const ROWS_MAX = 1500;
const SHARES_A_DAY = 40;
const codeKey = (key: string) => `io:layout:${key}`;
const hashKey = (hash: string) => `io:layout:h:${hash}`;
const KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** How many buildings an Import code places, or 0 when it isn't one ("BYML1:" and base64 of [[type, x, y], ...]). */
const codeRows = (code: string) => {
  if (!code.startsWith(CODE_PREFIX) || code.length > CODE_MAX) return 0;
  try {
    const rows = JSON.parse(Buffer.from(code.slice(CODE_PREFIX.length), "base64").toString("utf8"));
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > ROWS_MAX) return 0;
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 3) return 0;
      const [t, x, y] = row.map(Number);
      if (!Number.isInteger(t) || t < 1 || t > 1000 || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 4000 || Math.abs(y) > 4000) return 0;
    }
    return rows.length;
  } catch {
    return 0;
  }
};

/** A layout's name in a chat token: letters, digits, space, . _ - (16 at most). */
const cleanName = (name: unknown) =>
  String(name ?? "")
    .replace(/[^0-9A-Za-z_. -]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, 16) || "Layout";

const newKey = () => {
  const bytes = randomBytes(10);
  let key = "";
  for (const b of bytes) key += KEY_CHARS[b % KEY_CHARS.length];
  return key;
};

/** (18 October) How long a shared layout code is kept without being read (90 days). */
const SHARE_KEEP_S = 90 * 86_400;

/** POST bm/yardplanner/sharelayout {code, name}: { key, name, count } (the same code again: the same key). 40 a day. */
export const shareLayout: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const code = String(body.code ?? "").replace(/\s+/g, "");
  const count = codeRows(code);
  const name = cleanName(body.name);
  ctx.status = Status.OK;
  if (!count) {
    ctx.body = { error: "That isn't a layout code." };
    return;
  }
  try {
    const hash = createHash("sha1").update(code).digest("hex");
    const known = await redis.get(hashKey(hash));
    if (known && (await redis.get(codeKey(String(known))))) {
      ctx.body = { error: 0, key: String(known), name, count };
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    const rateKey = `io:layout:rate:${user.userid}:${day}`;
    const made = Number(await redis.incr(rateKey));
    if (made === 1) await redis.expire(rateKey, 2 * 86400).catch(() => null);
    if (made > SHARES_A_DAY) {
      ctx.body = { error: `You can share ${SHARES_A_DAY} layouts a day. Try again tomorrow.` };
      return;
    }
    let key = "";
    for (let tries = 0; tries < 5 && !key; tries++) {
      const candidate = newKey();
      // (18 October, SUSPECTED-BUGS.md: kept for good, so Redis grew with every share) kept SHARE_KEEP_S, and that
      // long again each time someone reads it (sharedLayout)
      const stored = await redis.send("SET", [codeKey(candidate), JSON.stringify({ code, name, count, by: user.userid, at: Math.floor(Date.now() / 1000) }), "NX", "EX", String(SHARE_KEEP_S)]);
      if (stored === "OK") key = candidate;
    }
    if (!key) throw new Error("no free key");
    await redis.set(hashKey(hash), key, "EX", String(SHARE_KEEP_S));
    logger.info(`Yard Planner: user ${user.userid} shared a layout (${count} buildings) as ${key}.`);
    ctx.body = { error: 0, key, name, count };
  } catch (err) {
    logger.error(`Yard Planner: a layout could not be shared: ${err}`);
    ctx.body = { error: "The layout couldn't be shared just now. Try again." };
  }
};

/** POST (or GET) bm/yardplanner/sharedlayout {key}: { code, name, count }. */
export const sharedLayout: KoaController = async (ctx) => {
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const key = String(body.key ?? ctx.query.key ?? "");
  ctx.status = Status.OK;
  if (!/^[0-9A-Za-z]{6,16}$/.test(key)) {
    ctx.body = { error: "That isn't a shared layout." };
    return;
  }
  try {
    const raw = await redis.get(codeKey(key));
    // (18 October: read, so kept another while)
    if (raw) void redis.expire(codeKey(key), SHARE_KEEP_S).catch(() => null);
    const kept = raw ? (JSON.parse(String(raw)) as { code?: string; name?: string; count?: number }) : null;
    if (!kept || !kept.code) {
      ctx.body = { error: "That layout isn't on the server any more." };
      return;
    }
    ctx.body = { error: 0, code: kept.code, name: String(kept.name ?? "Layout"), count: Number(kept.count) || 0 };
  } catch {
    ctx.body = { error: "The layout couldn't be read just now. Try again." };
  }
};
