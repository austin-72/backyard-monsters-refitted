import z from "zod";

import { getFlags } from "../../../game-data/flags.js";
import { addPlayerFlags } from "../../../services/user/playerFlags.js";
import { BaseMode, BaseType } from "../../../enums/Base.js";
import { Status } from "../../../enums/StatusCodes.js";
import { saveFailureErr } from "../../../errors/errors.js";
import { Save } from "../../../database/models/save.model.js";
import { User } from "../../../database/models/user.model.js";
import { postgres, redis } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { baseModeBuild } from "../load/modes/baseModeBuild.js";
import { baseModeView } from "../load/modes/baseModeView.js";
import { infernoModeView } from "../load/modes/infernoModeView.js";
import { extractTownHall } from "../../../utils/extractTownHall.js";
import { mapSaveData, pickKeys, PAGE_REPLY_KEYS } from "../../../services/base/mapSaveData.js";
import { getAllianceData } from "../../../services/alliance/allianceData.js";
import { runningPowerups } from "../../../services/alliance/powerups.js";
import { visibleCredits } from "../../../services/user/shinyLock.js";
import { isDesignBaseId, parseDesignBaseId } from "../../../services/admin/designs.js";
import { isAdmin } from "../../../services/admin/admin.js";

const UpdateSavedSchema = z.object({
  type: z.string(),
  version: z.string(),
  lastupdate: z.string(),
  baseid: z.string(),
  mapversion: z.coerce.number(),
});

/**
 * Controller responsible for handling periodic polling updates from the client every 30 seconds.
 * The update can occur in either "build" or "view" mode, depending on the type sent from the client.
 *
 * @param {object} ctx - The Koa context object.
 * @throws Will throw an error if the save operation fails.
 */
export const updateSaved: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);

  const userSave = user.save!;
  const worldid = user.save?.worldid;
  const { baseid, type, mapversion } = UpdateSavedSchema.parse(ctx.request.body);

  // A Designer draft (services/admin/designs.ts) is its admin's alone, and only in build mode.
  if (isDesignBaseId(baseid) && (type !== BaseMode.BUILD || !isAdmin(user) || parseDesignBaseId(baseid)!.userid !== user.userid))
    throw saveFailureErr();

  let baseSave: Save | null = null;

  switch (type) {
    case BaseMode.BUILD:
      baseSave = await baseModeBuild(user, baseid);
      redis.setex(`last-seen:main:${user.userid}`, 120, getCurrentDateTime().toString());
      break;

    case BaseMode.IVIEW:
    case BaseMode.IATTACK:
      baseSave = await infernoModeView(user, baseid);
      break;

    default:
      baseSave = await baseModeView(baseid, mapversion, worldid, user);
      break;
  }

  if (!baseSave) throw saveFailureErr();

  const isOwner = user.userid === baseSave.userid;
  const isInferno = baseSave.type === BaseType.INFERNO;

  const filteredSave = await mapSaveData(baseSave, user);
  const savetime = getCurrentDateTime();

  filteredSave.savetime = savetime;
  filteredSave.id = savetime;

  const flags = getFlags();
  flags.discordOldEnough = Number(ctx.meetsDiscordAgeCheck);

  // (The Town Hall is only looked for when the save isn't on Map Room 2 already: always, inferno-only.)
  flags.maproom2 = userSave.mr2upgraded || (extractTownHall(userSave.buildingdata || {})?.l ?? 0) >= 6 ? 1 : 0;
  flags.mr2upgraded = userSave.mr2upgraded ? 1 : 0;

  // Per-player inferno-only flags, or the client loses them with this reply (services/user/playerFlags.ts).
  await addPlayerFlags(flags, user, isOwner && type === BaseMode.BUILD);

  const credits = visibleCredits(user, userSave.credits);

  const isOwnMainYard = isOwner && !isInferno;
  
  const alliance = isOwnMainYard ? await getAllianceData(user) : null;
  const powerups = isOwnMainYard ? await runningPowerups(user.alliance_id) : null;

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    flags,
    ...pickKeys(filteredSave as Record<string, unknown>, PAGE_REPLY_KEYS),
    credits,
    ...(alliance && { alliancedata: alliance }),
    ...(powerups && { powerups }),
  };
};
