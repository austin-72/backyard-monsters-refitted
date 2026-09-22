import type { Context, Next } from "koa";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

import { getPublishedBuild } from "../../services/clientBuild.js";

/**
 * Serving the game client, so players start the standalone Flash Player from a web address and
 * always run the current build.
 *
 *   /play.swf                    the launcher (public/client/launcher.swf): 2 KB, no game code. It asks
 *   /bymr-stable.swf             /client/version which build is current and loads exactly that one:
 *   /bymr-stable.swf?v=<build>   the game (public/client/bymr-stable.swf).
 *
 * Why a launcher: the Flash projector was seen running an old game from its cache although the file
 * is served "always revalidate". A cache can only be stale for an address it has seen. The game's
 * address now contains its build, so a new build is an address no cache has anything for, and the
 * question "which build?" is a POST, which is never cached. The launcher itself never changes, so a
 * cached launcher is as good as a fresh one; it is still sent "do not store".
 *
 * Everything lives in public/client/, which docker-compose binds to the host: publishing a build is
 * copying one file (publish-client.cmd), no image rebuild, no restart.
 */

const CLIENT_DIR = path.resolve("public/client");
const GAME = "bymr-stable.swf";
const LAUNCHER = "launcher.swf";

/** Addresses players open. Both give the launcher when there is one. */
const ENTRY_POINTS = new Set(["play.swf", GAME]);

/** Only plain "<name>.swf" file names: nothing that could climb out of the client folder. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.swf$/;

const fileInfo = async (name: string) => {
  const file = path.join(CLIENT_DIR, name);
  const info = await stat(file).catch(() => null);
  return info?.isFile() ? { file, info } : null;
};

/** What identifies the published game file: its build stamp and when it was written. */
const gameVersion = async () => {
  const game = await fileInfo(GAME);
  if (!game) return null;
  return `${getPublishedBuild()}-${Math.floor(game.info.mtimeMs).toString(36)}${game.info.size.toString(36)}`;
};

/** POST /client/version: which game should the launcher load? */
export const clientVersion = async (ctx: Context) => {
  const v = await gameVersion();

  ctx.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  ctx.set("Pragma", "no-cache");
  ctx.status = 200;
  ctx.body = v
    ? { build: getPublishedBuild(), v, file: GAME }
    : { error: "The game has not been published on this server yet." };
};

export const serveGameClient = async (ctx: Context, next: Next) => {
  // The Flash projector keeps a closing quote that was put around the address on its command line
  // and asks for bymr-stable.swf" (seen in the wild as /bymr-stable.swf%22). Serve what was meant.
  const name = String(ctx.params.file ?? "").replace(/["']+$/, "");

  // The route matches every one-segment path; only "<name>.swf" is ours.
  if (!SAFE_NAME.test(name)) return next();

  const versioned = typeof ctx.query.v === "string" && ctx.query.v !== "";
  const launcher = await fileInfo(LAUNCHER);

  // An entry point without a build in its address gets the launcher, when there is one.
  const wanted = ENTRY_POINTS.has(name) && !versioned && launcher ? launcher : await fileInfo(name === "play.swf" ? GAME : name);

  if (!wanted) {
    ctx.status = 404;
    ctx.type = "text/plain";
    ctx.body = `${name} has not been published. Copy the built SWF into server/public/client/ (publish-client.cmd does it).`;
    return;
  }

  const { file, info } = wanted;
  const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;

  if (versioned && (await gameVersion()) === ctx.query.v) {
    // This address names exactly this file. It can be kept: the next build has another address.
    ctx.set("Cache-Control", "public, max-age=86400");
  } else {
    ctx.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    ctx.set("Pragma", "no-cache");
    ctx.set("Expires", "0");
  }
  ctx.set("ETag", etag);
  ctx.set("Last-Modified", info.mtime.toUTCString());

  if (ctx.get("If-None-Match") === etag) {
    ctx.status = 304;
    return;
  }

  ctx.status = 200;
  ctx.type = "application/x-shockwave-flash";
  ctx.length = info.size;
  if (ctx.method !== "HEAD") ctx.body = createReadStream(file);
};
