import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import type { KoaController } from "../../utils/KoaController.js";
import { plannerSave } from "./plannerSave.js";

/** GET or POST: the Yard Planner layouts of the yard being planned (baseid; main yard by default). */
export const getTemplates: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const save = await plannerSave(user, body.baseid ?? ctx.query.baseid);

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    ...(save.savetemplate ?? []),
  };
};
