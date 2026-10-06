import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { plannerSave } from "./plannerSave.js";

/**
 * Clears a layout slot of the yard being planned. The client has always called this ("Clear slot"),
 * but the server had no such route, so clearing a slot silently did nothing.
 */
export const deleteTemplate: KoaController = async (ctx) => {
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const user: User = ctx.authUser;
  const save = await plannerSave(user, body.baseid);
  const slotid = Number(body.slotid);

  const templates = (save.savetemplate ?? []).filter((template) => Number(template.slotid) !== slotid);
  save.savetemplate = templates;
  await postgres.em.flush();

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    ...templates,
  };
};
