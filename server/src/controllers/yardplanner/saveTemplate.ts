import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { plannerSave } from "./plannerSave.js";

interface RequestBody {
  slotid: number;
  name: string;
  data: Record<string, {}>;
  baseid?: string;
}

/** Saves a layout into a slot of the yard being planned (baseid; main yard by default). */
export const saveTemplate: KoaController = async (ctx) => {
  const { slotid, name, data, baseid } = ctx.request.body as RequestBody;
  const user: User = ctx.authUser;
  const save = await plannerSave(user, baseid);

  const templates = [...(save.savetemplate ?? [])];
  const entry = { slotid: Number(slotid), name: String(name ?? "").slice(0, 60), data };
  const existingSlotIndex = templates.findIndex((template) => Number(template.slotid) === entry.slotid);

  if (existingSlotIndex !== -1) templates[existingSlotIndex] = entry;
  else templates.push(entry);

  save.savetemplate = templates;
  await postgres.em.flush();

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    ...templates,
  };
};
