import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";

/**
 * The save whose Yard Planner layouts a request is about. A layout records building ids, and those
 * differ from one yard to the next, so each yard keeps its own slots: the main yard's live on the
 * main save (as they always did) and each outpost's on that outpost's save. The client sends the base
 * it is planning; anything but one of the player's own outposts means the main yard.
 */
export const plannerSave = async (user: User, baseid: unknown): Promise<Save> => {
  const id = String(baseid ?? "").trim();
  if (/^\d+$/.test(id)) {
    const outpost = await postgres.em.findOne(Save, { baseid: id, type: BaseType.OUTPOST, saveuserid: user.userid });
    if (outpost) return outpost;
  }
  await postgres.em.populate(user, ["save"]);
  return user.save!;
};
