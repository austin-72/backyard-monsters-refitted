import { readFileSync, statSync } from "fs";
import path from "path";
import { inflateSync } from "zlib";

import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Version control for the game client (inferno-only).
 *
 * Every release build carries a stamp, the date and time it was built (client/scripts/IOBuild.as,
 * written by stamp-build.cmd). The server reads the stamp straight out of the SWF it serves
 * (public/client/bymr-stable.swf), so "the current version" is simply whatever was published:
 * nothing to configure, nothing to keep in step. A client older than that is told to restart,
 * at /init when it starts and through the io_build flag when it was already running.
 *
 * With no client published (players were given a SWF file instead), infernoOnlyConfig.minClientBuild
 * is the floor; 0 turns the check off.
 */

const PUBLISHED_CLIENT = path.resolve("public/client/bymr-stable.swf");
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

/** The build stamp of the published client; 0 when there is none, or it carries no stamp. */
export const getPublishedBuild = (): number => {
  let key: string;
  try {
    const info = statSync(PUBLISHED_CLIENT);
    key = `${info.size}-${info.mtimeMs}`;
  } catch {
    cachedKey = "";
    return 0;
  }

  if (key === cachedKey) return cachedBuild;

  try {
    cachedBuild = readStamp(PUBLISHED_CLIENT);
    logger.info(
      cachedBuild
        ? `Published client build: ${cachedBuild}. Older clients will be asked to restart.`
        : "The published client carries no build stamp: clients are not version checked against it."
    );
  } catch (error) {
    cachedBuild = 0;
    logger.error(`Could not read the published client's build stamp: ${error}`);
  }

  cachedKey = key;
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
