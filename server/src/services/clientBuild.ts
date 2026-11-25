import { readFileSync, statSync } from "fs";
import path from "path";
import { inflateSync } from "zlib";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Version control for the game client (inferno-only).
 *
 * Every release build carries a stamp, the date and time it was built (client-web/src/game/IOBuild.ts, written by
 * stamp-build). The server reads the stamp of the game it publishes, the browser build's public/web/version.json
 * (and, while it is still there, the last Flash client published, public/client/bymr-stable.swf: the newer of the
 * two counts), so "the current version" is simply whatever was published: nothing to configure, nothing to keep
 * in step. A client older than that is told to restart, at /init when it starts and through the io_build flag
 * when it was already running. (The Flash client is no longer built: once a browser build newer than it is
 * published, it is told to update like any old client.)
 *
 * With no client published, infernoOnlyConfig.minClientBuild is the floor; 0 turns the check off.
 */

const PUBLISHED_CLIENT = path.resolve("public/client/bymr-stable.swf");
const PUBLISHED_WEB = path.resolve("public/web/version.json");
const MARKER = /IOBUILD:(\d{8,14}):/;

let cachedKey = "";
let cachedBuild = 0;

const readStamp = (file: string): number => {
  const bytes = readFileSync(file);
  const signature = bytes.subarray(0, 3).toString("latin1");

  // CWS: zlib after the 8 byte header (what the Flex compiler writes). FWS: not compressed.
  let body: Buffer;
  if (signature === "CWS") body = inflateSync(bytes.subarray(8));
  else if (signature === "FWS") body = bytes.subarray(8);
  else throw new Error(`unsupported SWF compression "${signature}"`);

  const match = MARKER.exec(body.toString("latin1"));
  return match ? Number(match[1]) : 0;
};

/** The stamp in a published file, cached until the file changes; 0 when there is none, or it carries no stamp. */
const stampCache = new Map<string, { key: string; build: number }>();
const publishedStamp = (file: string, read: (file: string) => number, what: string): number => {
  let key: string;
  try {
    const info = statSync(file);
    key = `${info.size}-${info.mtimeMs}`;
  } catch {
    stampCache.delete(file);
    return 0;
  }
  const cached = stampCache.get(file);
  if (cached?.key === key) return cached.build;
  let build = 0;
  try {
    build = read(file);
    logger.info(build ? `Published ${what} build: ${build}.` : `The published ${what} carries no build stamp.`);
  } catch (error) {
    logger.error(`Could not read the published ${what}'s build stamp: ${error}`);
  }
  stampCache.set(file, { key, build });
  return build;
};

const readWebStamp = (file: string): number => {
  const v = JSON.parse(readFileSync(file, "utf8")) as { build?: unknown };
  const build = Number(v.build);
  return Number.isFinite(build) && build > 0 ? build : 0;
};

/** The build stamp of the published client (the newer of the browser build and the last Flash one); 0 when none. */
export const getPublishedBuild = (): number => {
  const build = Math.max(publishedStamp(PUBLISHED_WEB, readWebStamp, "browser client"), publishedStamp(PUBLISHED_CLIENT, readStamp, "Flash client"));
  const key = String(build);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedBuild = build;
    if (build) logger.info(`Current client build: ${build}. Older clients will be asked to restart.`);
  }
  return cachedBuild;
};

/** The oldest client build this server accepts; 0 = any. */
export const getRequiredBuild = (): number => {
  if (!infernoOnlyConfig.enabled) return 0;
  return Math.max(getPublishedBuild(), Number(infernoOnlyConfig.minClientBuild) || 0);
};

export const isOutdated = (clientBuild: unknown): boolean => {
  const required = getRequiredBuild();
  if (!required) return false;

  const build = Number(clientBuild);
  return !Number.isFinite(build) || build < required;
};
