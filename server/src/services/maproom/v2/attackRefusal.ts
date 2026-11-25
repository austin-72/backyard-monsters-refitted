import { BaseType } from "../../../enums/Base.js";
import { Save } from "../../../database/models/save.model.js";
import { redis } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { isAttackActive } from "../../base/isAttackActive.js";
import { isTestModeOn } from "../../admin/testMode.js";
import { baseProtectedErr, baseUnderAttackErr, userOnlineErr } from "../../../errors/errors.js";
import { liveAttacksOn } from "../../replays/liveAttacks.js";

/**
 * Why a player's yard or outpost can't be attacked now, thrown as the error the attack's load answers with: under
 * damage protection, an admin testing in it, already under attack, or its player online (not with live attacks on:
 * InfernoOnlyConfig.liveAttacks). Nothing for a tribe's
 * yard. Shared by the attack's load (controllers/base/load/modes/baseModeAttack.ts) and the map's check before it
 * leaves (QoL #69, controllers/maproom/v2/canAttack.ts), so the two can't disagree.
 */
export const checkAttackTarget = async (save: Save): Promise<void> => {
  if (save.type === BaseType.TRIBE) return;
  if (save.protected > getCurrentDateTime()) throw baseProtectedErr();

  // An admin testing (services/admin/testMode.ts): their yards hold the test shiny and resources.
  if (await isTestModeOn(save.saveuserid)) throw baseProtectedErr();

  if (isAttackActive(save)) throw baseUnderAttackErr();

  // (18 October, the user's: with live attacks on, a player online can be attacked, and watches it: liveAttacks.ts)
  if (save.type === BaseType.MAIN && !liveAttacksOn()) {
    const lastSeen = await redis.get(`last-seen:${BaseType.MAIN}:${save.userid}`);
    if (lastSeen && parseInt(lastSeen) >= getCurrentDateTime() - 60) throw userOnlineErr();
  }
};
