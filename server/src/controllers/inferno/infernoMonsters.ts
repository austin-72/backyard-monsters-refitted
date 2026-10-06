import z from "zod";
import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { BaseType } from "../../enums/Base.js";
import { Save } from "../../database/models/save.model.js";
import { ClientSafeError } from "../../middleware/clientSafeError.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";

const InfernoMonstersSchema = z.object({
  type: z.string(),
  imonsters: z.string().optional().transform((data) => (data ? JSON.parse(data) : {})),
});

export const infernoMonsters: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  let { type, imonsters } = InfernoMonstersSchema.parse(ctx.request.body);

  let infernoSave = await postgres.em.findOne(
    Save,
    { userid: user.userid, type: BaseType.INFERNO },
    { fields: ["monsters"] },
  );

  // No separate Inferno yard: an inferno-only server's main yard is the Inferno yard, so there is nothing
  // to send monsters up from (the client no longer offers "Ascend monsters" there). An answer, not a 500.
  if (!infernoSave) {
    if (type === BaseType.GET && infernoOnlyConfig.enabled) {
      ctx.status = Status.OK;
      ctx.body = { error: 0, imonsters: {} };
      return;
    }
    throw new ClientSafeError({
      message: infernoOnlyConfig.enabled ? "Monsters can't be sent up from the Inferno on this server." : "Inferno save not found",
      status: Status.NOT_FOUND,
      data: {},
      isClientFriendly: true,
    });
  }

  if (type === BaseType.GET) imonsters = infernoSave.monsters;

  if (type === BaseType.SET) {
    infernoSave.monsters = imonsters;
    postgres.em.persist(infernoSave);
    await postgres.em.flush();
  }

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    imonsters,
  };
};
