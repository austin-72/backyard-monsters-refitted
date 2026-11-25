import { User } from "../../database/models/user.model.js";
import { loadFailureErr } from "../../errors/errors.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { Status } from "../../enums/StatusCodes.js";
import { isAdmin } from "../admin/admin.js";
import { logger } from "../../utils/logger.js";
import { logAttackViolation } from "../base/reportManager.js";
import { monsterStats, mr3MonsterStats } from "../../game-data/stats/monsterStats.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

// Inferno-only: Rezghul is hatched for a flat magma cost. The client sends its monster stats with
// every attack and they are compared with this table in production, so the table has to say the same.
if (infernoOnlyConfig.enabled && infernoOnlyConfig.rezghul.enabled && monsterStats.C19)
  monsterStats.C19.props.cResource = [infernoOnlyConfig.rezghul.magmaCost];

import type { AttackData } from "../../schemas/AttackSchema.js";
import { type ChampionProps, championStats } from "../../game-data/stats/championStats.js";
import { MapRoomVersion } from "../../enums/MapRoom.js";
import { Env } from "../../enums/Env.js";

/**
 * Inferno-only (21 October): stats that differ, for an admin. The game and the server each have the monsters' tables;
 * when a change to them reaches the game (publish-web: a file copy) but not the server (in Docker its source is copied
 * into the image: `docker compose up --build -d`), every attack with that monster is refused, test mode's above all
 * (every monster in the army). An admin is told so, and isn't reported for tampering (nor banned, with
 * attackViolationBanAfter set). Anyone else: refused and reported, as before.
 */
const refuseStats = async (user: User, message: string, detail: string) => {
  if (isAdmin(user)) {
    logger.warn(`Attack refused for admin '${user.username}' (ID ${user.userid}): ${message} (the server out of date?)`);
    throw new ClientSafeError({
      message: `The server's monster stats don't match the game's (${detail}). If the game or the server was just updated, the server is probably out of date: rebuild it (in the server folder: docker compose up --build -d).`,
      status: Status.NOT_FOUND,
      data: {},
      isClientFriendly: true,
    });
  }
  await logAttackViolation(user, message);
  throw loadFailureErr();
};

// TODO:
// Validate monster count from flinger
type StatValue = number[] | string[];

/**
 * Validates the attack data sent by the client.
 * Ensures the structure is intact and all monster/champion stats match server-side definitions.
 * Logs and throws if data is invalid.
 * 
 * @param {User} user - The user initiating the attack.
 * @param {AttackData} attackData - The payload sent from the client for an attack.
 * @param {MapRoomVersion} [mapVersion] - The map version of the attack, if applicable.
 * @throws Will throw an error if the data is missing, malformed, or tampered with.
 */
export const validateAttack = async (user: User, attackData: AttackData, mapVersion?: MapRoomVersion) => {
  if (process.env.ENV === Env.LOCAL) return;

  if (!attackData || Object.keys(attackData).length === 0) {
    const message = "Attack payload was missing. Client modified.";
    await logAttackViolation(user, message);
    throw loadFailureErr();
  }

  if (!attackData.champions || !attackData.monsters) {
    const message = "Attack payload structure changed. Client modified.";
    await logAttackViolation(user, message);
    throw loadFailureErr();
  }

  const isInMaproom3 = mapVersion === MapRoomVersion.V3;

  if (attackData.monsters.length > 0) {
    for (const monster of attackData.monsters) {
      const { id, stats } = monster;

      // (Inferno-only, 22 October: a monster the server doesn't know, or not in Map Room 3's table there (that read
      // an undefined table: a 500): refused like a stat that differs, so an admin on an out-of-date server is told so)
      const expectedProps = monsterStats[id] ? (isInMaproom3 ? mr3MonsterStats[id]?.props : monsterStats[id].props) : undefined;
      if (!expectedProps) {
        const message = `Invalid monster ID: ${id}. Client modified.`;
        await refuseStats(user, message, `${id}: not in the server's monster table${isInMaproom3 ? " for Map Room 3" : ""}`);
        continue; // (not reached: refuseStats throws)
      }

      const monsterPropsKeys = Object.keys(expectedProps) as Array<keyof typeof expectedProps>;

      for (const key of monsterPropsKeys) {
        const received = stats[key];
        const expected = expectedProps[key];

        if (!isMonsterStatsEqual(received, expected)) {
          const message = `${id}'s stat '${key}' was modified. Received: ${stats[key]} but expected ${expected}`;
          await refuseStats(user, message, `${id} ${String(key)}: the game has ${stats[key]}, the server ${expected}`);
        }
      }
    }
  }

  if (attackData.champions.length > 0) {
    for (const champion of attackData.champions) {
      const { type, stats } = champion;

      if (!championStats[type]) {
        const message = `Invalid champion type: ${type}. Client modified.`;
        await refuseStats(user, message, `champion ${type}: not in the server's champion table`);
      }

      const championProps: ChampionProps = championStats[type].props;
      const championPropsKeys = Object.keys(championProps) as Array<keyof typeof championProps>;

      for (const key of championPropsKeys) {
        const received = stats[key];
        const expected = championProps[key];

        if (!isChampionStatsEqual(received, expected)) {
          const message = `${type}'s stat '${key}' was modified. Received: ${stats[key]} but expected ${championProps[key]}`;
          await refuseStats(user, message, `${type} ${String(key)}: the game has ${stats[key]}, the server ${championProps[key]}`);
        }
      }
    }
  }
};

/**
 * Compares two numeric arrays representing monster stats.
 * All monster stats are represented as arrays of numbers.
 * 
 * @param {number[]} arr1 - First array of numeric stats.
 * @param {number[]} arr2 - Second array of numeric stats.
 * @returns {boolean} - True if arrays are equal within 2 decimal places, otherwise false.
 */
const isMonsterStatsEqual = (arr1: number[], arr2: number[] | undefined) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length)
    return false;

  return arr1.every(
    (num, i) => Number(num.toFixed(2)) === Number(arr2[i].toFixed(2))
  );
};


/**
 * Compares champion stat values (number array, or string array) for equality.
 * 
 * @param {StatValue} val1 - First stat value.
 * @param {StatValue} val2 - Second stat value.
 * @returns {boolean} - True if values are considered equal, false otherwise.
 */
const isChampionStatsEqual = (val1: StatValue, val2: StatValue | undefined) => {
  if (!Array.isArray(val1) || !Array.isArray(val2) || val1.length !== val2.length) 
    return false;

  const isNumberArray = typeof val1[0] === "number";
  const isStringArray = typeof val1[0] === "string";

  if (isNumberArray) {
    return (val1 as number[]).every(
      (num, i) => Number(num.toFixed(2)) === Number((val2 as number[])[i].toFixed(2))
    );
  }

  if (isStringArray)
    return (val1 as string[]).every((str, i) => str === (val2 as string[])[i]);

  return false;
};
