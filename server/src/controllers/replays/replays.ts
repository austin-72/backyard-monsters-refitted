import type { KoaController } from "../../utils/KoaController.js";
import type { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { addChunk, getReplay, importReplay, replayFile, replaysEnabled, ReplayError } from "../../services/replays/replays.js";
import { logger } from "../../utils/logger.js";

/**
 * Inferno-only: attack replays (services/replays/replays.ts). The game's requests answer { error: 0, ... } or
 * { error: "message" } (status 200: the game shows the message); the file download is the file itself.
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
    ctx.body = { error: "Something went wrong with the replay. Try again." };
  }
};

/** replays/chunk (key, seq, data, final, duration, damage): a part of the attacker's recording. */
export const replayChunk: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => {
    await addChunk(user, String(p.key ?? ""), Math.floor(Number(p.seq) || 0), String(p.data ?? ""), String(p.final) === "1", {
      duration: Number(p.duration),
      damage: Number(p.damage),
    });
    return {};
  });
};

/** replays/get (key): a replay to watch. */
export const replayGet: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const p = params(ctx);
  await answer(ctx, async () => ({ replay: await getReplay(user, String(p.key ?? "")) }));
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
