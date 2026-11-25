import type { KoaController } from "../../../utils/KoaController.js";
import { Status } from "../../../enums/StatusCodes.js";
import { User } from "../../../database/models/user.model.js";
import { Save } from "../../../database/models/save.model.js";
import { BaseType } from "../../../enums/Base.js";
import { postgres } from "../../../server.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { healDefenders } from "../../../services/base/defenderHealth.js";
import { WOUNDED } from "./myOutposts.js";

/** An attack started this long ago (seconds) or less, with the yard still marked attacked, is under way. */
const ATTACK_WINDOW = 30 * 60;

/**
 * POST worldmapv2/healoutposts (Inferno-only, QoL #325, 14 October): the defenders left wounded in the player's
 * outposts are healed, as if the player had opened each one (baseLoad heals an owner's yard on load: see
 * services/base/defenderHealth.ts). Outposts being attacked are left as they are. Answers how many were healed.
 */
export const healOutposts: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const db = postgres.em.getConnection();
  const rows = await db.execute<{ baseid: string }[]>(
    `SELECT s.baseid FROM bym.save s WHERE s.saveuserid = ? AND s.type = ? AND ${WOUNDED}`,
    [user.userid, BaseType.OUTPOST]
  );
  const now = getCurrentDateTime();
  let healed = 0;
  let busy = 0;
  const ids = rows.map((r) => String(r.baseid));
  for (let i = 0; i < ids.length; i += 100) {
    const saves = await postgres.em.find(Save, { baseid: { $in: ids.slice(i, i + 100) }, saveuserid: user.userid, type: BaseType.OUTPOST });
    for (const save of saves) {
      const last = save.attacks?.at(-1);
      if (save.attackid && last && now - (last.starttime ?? 0) < ATTACK_WINDOW) {
        busy++;
        continue;
      }
      if (healDefenders(save)) {
        postgres.em.persist(save);
        healed++;
      }
    }
    await postgres.em.flush();
  }

  ctx.status = Status.OK;
  ctx.body = { error: 0, healed, busy };
};
