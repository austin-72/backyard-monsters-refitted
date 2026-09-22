import z from "zod";

import { User } from "../../database/models/user.model.js";
import type { KoaController } from "../../utils/KoaController.js";
import { postgres } from "../../server.js";
import { joinOrCreateWorld } from "../../services/maproom/v2/joinOrCreateWorld.js";
import { leaveWorld } from "../../services/maproom/v2/leaveWorld.js";
import { FilterFrontendKeys } from "../../utils/FrontendKey.js";
import { MapRoomVersion } from "../../enums/MapRoom.js";
import { Status } from "../../enums/StatusCodes.js";
import { Env } from "../../enums/Env.js";
import { joinNewWorldMap } from "../../services/maproom/v3/joinNewWorldMap.js";
import { extractTownHall } from "../../utils/extractTownHall.js";
import {
  discordAgeErr,
  mustLeaveAllianceToChangeWorldErr,
  townHallLevelErr,
} from "../../errors/errors.js";
import { Maproom } from "../../database/models/maproom.model.js";
import { clearPendingInvites } from "../../services/alliance/allianceInvites.js";
import { MAX_RESOURCE_CAPACITY } from "../../config/MapRoom2Config.js";
import { RESOURCE_KEYS } from "../../services/base/updateResources.js";
import { infernoOnlyConfig, mapRoom3Enabled } from "../../config/InfernoOnlyConfig.js";
import { permissionErr } from "../../errors/errors.js";

/**
 * Schema for validating the request body when setting the map version.
 */
const SetMapVersionSchema = z.object({
  version: z.string().transform((version) => parseInt(version)),
});

/**
 * Sets the player's Map Room version and performs the associated world transition.
 *
 * - NONE: Leaves the current MR2 world and resets mapversion to V1.
 * - V1:   Sets mapversion to 1, no world ops.
 * - V2:   Requires Town Hall level 6. Joins or creates an MR2 world and marks mr2upgraded.
 * - V3:   Requires Town Hall level 6. Joins the MR3 world map.
 *
 * @param {Context} ctx - The Koa context object
 * @returns {Promise<void>} - A promise that resolves when the controller is complete.
 */
export const setMapVersion: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);

  const save = user.save!;

  const { version } = SetMapVersionSchema.parse(ctx.request.body);

  if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();

  // Inferno-only: everyone lives on Map Room 2, permanently, from the first load.
  //  - leaving (0) and Map Room 3 are refused
  //  - 1 ("I just built a Map Room") and 2 ("I upgraded it") change nothing and simply succeed;
  //    in particular 2 must not run joinOrCreateWorld again, which could move the yard to another world
  if (infernoOnlyConfig.enabled && version !== MapRoomVersion.V1 && version !== MapRoomVersion.V2) throw permissionErr();
  if (version === MapRoomVersion.V3 && !mapRoom3Enabled()) throw permissionErr();

  const alreadyPlaced = save.mapversion === MapRoomVersion.V2 && Boolean(save.worldid);
  const nothingToDo = infernoOnlyConfig.enabled && (version === MapRoomVersion.V1 || alreadyPlaced);

  switch (nothingToDo ? -1 : version) {
    case MapRoomVersion.NONE: {
      if (user.alliance_id) throw mustLeaveAllianceToChangeWorldErr();

      await clearPendingInvites(user.userid);

      if (save.mapversion === MapRoomVersion.V3 && save.resources) {
        for (const key of RESOURCE_KEYS) {
          if (Number(save.resources[key]) > MAX_RESOURCE_CAPACITY)
            save.resources[key] = MAX_RESOURCE_CAPACITY;
        }
      }

      save.mapversion = MapRoomVersion.V1;
      await leaveWorld(user, save);
      break;
    }

    case MapRoomVersion.V1:
      save.mapversion = MapRoomVersion.V1;
      break;

    case MapRoomVersion.V2: {
      if (save.mapversion === MapRoomVersion.V3) break;

      if (user.alliance_id) throw mustLeaveAllianceToChangeWorldErr();

      await clearPendingInvites(user.userid);

      const townHall = extractTownHall(save.buildingdata ?? {});

      if (!infernoOnlyConfig.enabled && !save.mr2upgraded && (!townHall || townHall.l < 6)) throw townHallLevelErr();
      
      await joinOrCreateWorld(user, save);
      save.mr2upgraded = true;
      save.mapversion = MapRoomVersion.V2;

      const maproom1 = await postgres.em.findOne(Maproom, { userid: user.userid });

      if (maproom1) postgres.em.remove(maproom1);
      break;
    }

    case MapRoomVersion.V3:
      if (user.alliance_id) throw mustLeaveAllianceToChangeWorldErr();

      await clearPendingInvites(user.userid);

      const townHall = extractTownHall(save.buildingdata ?? {});

      if (!save.mr2upgraded && (!townHall || townHall.l < 6)) throw townHallLevelErr();

      await joinNewWorldMap(user, save);
      save.mapversion = MapRoomVersion.V3;

      const maproom1 = await postgres.em.findOne(Maproom, { userid: user.userid });

      if (maproom1) postgres.em.remove(maproom1);
      break;
  }
  postgres.em.persist(save);
  await postgres.em.flush();

  const filteredSave = FilterFrontendKeys(save);

  const baseurl =
    process.env.ENV === Env.PROD
      ? `${process.env.BASE_URL}/base/`
      : `${process.env.BASE_URL}:${process.env.PORT}/base/`;

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    id: filteredSave.basesaveid,
    baseurl,
    ...filteredSave,
  };
};
