import { gunzip } from "node:zlib";
import { promisify } from "node:util";

/** (21 October) unpacked on Node's background threads, not the server's one thread for everything. */
const gunzipAsync = promisify(gunzip);
import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { addChunk, favouriteReplay, getReplay, getReplayMeta, importReplay, liveReplay, replayFile, replayLimits, replaysEnabled, ReplayError, startRaidReplay } from "../../services/replays/replays.js";
import { liveAttacksOf, liveAttacksOn } from "../../services/replays/liveAttacks.js";
import { issueLiveTicket } from "../../services/live/liveStream.js";
import { watchersOf } from "../../services/live/liveWatchers.js";
import { isFrameWanted, isRecordingWatched, listActivities, reportActivity, viewFrame, watchOn } from "../../services/live/liveActivity.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: attack replays (services/replays/replays.ts). The game's requests answer { error: 0, ... } or
 * { error: "message" } (status 200: the game shows the message); the file download is the file itself.
 * (QoL #455, 15 October: a failure of the server's own, not of the request, also says `again: 1`: the game's
 * recorder sends that part again later, as when no answer came.)
 */

type Ctx = Parameters<KoaController>[0];

const params = (ctx: Ctx) => ({ ...(ctx.query ?? {}), ...((ctx.request.body as Record<string, unknown>) ?? {}) }) as Record<string, unknown>;

const answer = async (ctx: Ctx, work: () => Promise<Record<string, unknown>>) => {
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  if (!replaysEnabled()) {
    ctx.body = { error: "Replays are off." };
    return;
  }
  try {
    ctx.body = { error: 0, ...(await work()) };
  } catch (e) {
    if (e instanceof ReplayError) {
      ctx.body = { error: e.message };
      return;
    }
    logger.error(`Replays: ${e}`);
    ctx.body = { error: "Something went wrong with the replay. Try again.", again: 1 };
  }
};

/**
 * replays/chunk (key, seq, data, final, duration, damage, cut): a part of the attacker's recording. Answers the size
 * limits the parts go under (QoL #539: limits { part, total }, characters of the JSON) and whether the replay is cut
 * short (cut: 1, a part over them or cut=1 from the game: it stopped at its own limits).
 * (QoL #92, 15 October: a wild raid's last part also has destroyed (buildings wrecked) and loot (JSON [r1..r4]
 * taken), for its attack log.)
 */
export const replayChunk: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => {
    let loot: unknown = p.loot;
    if (typeof loot === "string" && loot.length) {
      try {
        loot = JSON.parse(loot.slice(0, 400));
      } catch {
        loot = null;
      }
    }
    // (18 October, the user's: z=1, the part's data gzipped and in base64, a fraction of its size; unpacked here, to no
    // more than a few parts: one over the limit is cut short as before, addChunk)
    let data = String(p.data ?? "");
    if (String(p.z) === "1") {
      try {
        data = (await gunzipAsync(Buffer.from(data, "base64"), { maxOutputLength: replayLimits().part * 4 + 1024 })).toString("utf8");
      } catch {
        throw new ReplayError("That part of the replay couldn't be read.");
      }
    }
    const got = await addChunk(user, String(p.key ?? ""), Math.floor(Number(p.seq) || 0), data, String(p.final) === "1", {
      duration: Number(p.duration),
      damage: Number(p.damage),
      destroyed: Number(p.destroyed),
      loot,
    }, String(p.cut) === "1");
    // (18 October: live: 1, the defender is watching: the game sends short parts, LiveAttacks)
    return { limits: replayLimits(), ...(got.cut ? { cut: 1 } : {}), ...(got.live ? { live: 1 } : {}) };
  });
};

/**
 * Inferno-only (QoL #96, 15 October): replays/raid (baseid, t: the raiding tribe's wmid): a wild raid has begun on
 * the player's own yard; its replay's key for the player's game to record under, and the size limits.
 */
export const replayRaid: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => ({ ...(await startRaidReplay(user, String(p.baseid ?? ""), Number(p.t))), limits: replayLimits() }));
};

/** replays/get (key): a replay to watch; with meta=1 (QoL #98) its details only (a chat link's names and damage). */
export const replayGet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  if (String(p.meta) === "1") {
    await answer(ctx, async () => ({ replay: await getReplayMeta(user, String(p.key ?? "")) }));
    return;
  }
  await answer(ctx, async () => ({ replay: await getReplay(user, String(p.key ?? "")) }));
};

/**
 * Inferno-only (QoL #97, 15 October): replays/favourite (key, on: 1 / 0): the player's ★ on a replay, kept beyond
 * the clean-up. { fav, full (at the most: nothing changed), count, max }.
 */
export const replayFavourite: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => await favouriteReplay(user, String(p.key ?? "").slice(0, 24), String(p.on) === "1"));
};

/** replays/import (file: base64 of a downloaded replay file): kept a day for this player; its key. */
export const replayImport: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => {
    const file = Buffer.from(String(p.file ?? ""), "base64");
    return { key: await importReplay(user, file) };
  });
};

/** replays/file?key=...: the replay as a file to download (anyone with the key, as with watching it). */
export const replayDownload: KoaController = async (ctx) => {
  ctx.set("Cache-Control", "no-store");
  if (!replaysEnabled()) {
    ctx.status = Status.NOT_FOUND;
    ctx.body = "Replays are off.";
    return;
  }
  try {
    const file = await replayFile(String(params(ctx).key ?? ""));
    ctx.status = Status.OK;
    ctx.set("Content-Type", "application/octet-stream");
    ctx.set("Content-Disposition", `attachment; filename="${file.name}"`);
    ctx.body = file.data;
  } catch (e) {
    ctx.status = Status.NOT_FOUND;
    ctx.body = e instanceof ReplayError ? e.message : "That replay isn't here any more.";
  }
};

/**
 * (18 October, the user's) replays/live (key, after, t, defs): an attack on the player's own yard as it goes, for
 * their game to show (services/replays/replays.ts liveReplay). Only the yard's player.
 */
export const replayLive: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => ({
    replay: await liveReplay(user, String(p.key ?? ""), Number.isFinite(Number(p.after)) ? Number(p.after) : -1, Number.isFinite(Number(p.t)) ? Number(p.t) : -1, Number(p.defs) || 0),
  }));
};

/**
 * (18 October, the user's) attackwatch/status: the attacks running now on the player's yards (main yard and
 * outposts), for their game to say so and show them (services/replays/liveAttacks.ts). Asked every few seconds.
 */
export const attackWatchStatus: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  // (the Watch menu: what this player's game is doing now, for others to watch; and whether someone watches its
  // pictures: stream: 1, services/live/liveActivity.ts)
  if (watchOn()) await reportActivity(user, p.act);
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  ctx.body = {
    error: 0,
    on: liveAttacksOn() ? 1 : 0,
    attacks: liveAttacksOn() ? await liveAttacksOf(user.userid) : [],
    ...(watchOn() && (await isFrameWanted(user.userid)) ? { stream: 1 } : {}),
    // (someone watches the attack this player's game is recording: its parts go short at once)
    ...(watchOn() && (await isRecordingWatched(user.userid)) ? { recWatched: 1 } : {}),
  };
  // (18 October: who is watching this player now, for the list their game shows)
  if (watchOn()) {
    const who = await watchersOf(user.userid).catch(() => null);
    if (who) (ctx.body as Record<string, unknown>).watchers = who;
  }
};

/** (18 October, the user's) live/list: everything live now, the longest going first (the Watch menu). */
export const liveList: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  ctx.body = { error: 0, on: watchOn() ? 1 : 0, now: Math.floor(Date.now() / 1000), items: await listActivities(user.userid) };
};

/** (18 October) live/ticket: a ticket for the Watch socket (/live/ws: services/live/liveStream.ts). */
export const liveTicket: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  ctx.body = watchOn() ? { error: 0, ...(await issueLiveTicket(user)) } : { error: "Watching isn't on." };
};

/** (18 October) live/view (uid): what a player is doing now (its pictures come over the Watch socket). */
export const liveView: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  const got = await viewFrame(user, Math.floor(Number(p.uid) || 0));
  ctx.status = Status.OK;
  ctx.set("Cache-Control", "no-store");
  ctx.body = { error: 0, act: got.act };
};
