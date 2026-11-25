import z from "zod";
import { LockMode } from "@mikro-orm/core";

import type { KoaController } from "../../../utils/KoaController.js";
import { postgres } from "../../../server.js";
import { Save } from "../../../database/models/save.model.js";
import { Status } from "../../../enums/StatusCodes.js";
import type { User } from "../../../database/models/user.model.js";
import { logger } from "../../../utils/logger.js";
import { ClientSafeError } from "../../../middleware/clientSafeError.js";
import { isAttackActive } from "../../../services/base/isAttackActive.js";
import { baseUnderAttackErr } from "../../../errors/errors.js";

interface Monster {
  hid: number[];
  saved: number;
  housed: Record<string, number>;
  hstage: number[];
}

type MonstersTransfer = [Monster[], Monster[]];

const TransferMonstersScema = z.object({
  frombaseid: z.string(),
  tobaseid: z.string(),
  monsters: z.string().transform((monsters) => JSON.parse(monsters)),
});

/**
 * Controller to handle the transfer of monsters between outposts and main yards.
 *
 * @param {Object} ctx - The Koa context object.
 * @returns {Promise<void>}
 */
export const transferMonsters: KoaController = async (ctx) => {
  const { frombaseid, tobaseid, monsters } = TransferMonstersScema.parse(
    ctx.request.body
  );

  const [fromMonsters, toMonsters]: MonstersTransfer = monsters;

  // Fetch the bases to transfer the monsters between. (14 October, QoL #441: matched by id. The order came from
  // comparing the ids as text, so "999" > "1000" put the two the wrong way round and wrote each yard's monsters
  // into the other.)
  // (24 October, SUSPECTED-BUGS.md "Monster transfers: two at once": the two yards are read locked, in one transaction
  // with the write, so a second transfer sent at the same moment waits and is checked against what the first left,
  // instead of both checked against the same "before": 100 monsters could become 200.)
  const refused = await postgres.em.transactional(async (em) => {
    const found = await em.find(Save, {
      baseid: { $in: [frombaseid, tobaseid] },
    }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    const fromBase = found.find((s) => String(s.baseid) === String(frombaseid));
    const toBase = found.find((s) => String(s.baseid) === String(tobaseid));

    if (!fromBase || !toBase) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = { error: 1 };
      throw new Error(`One or both bases not found. From: ${frombaseid}, To: ${tobaseid}`);
    }

    // Both bases the caller's own (8 October: from looking over the base game's #160, which only checked that the
    // two were the same player's: anyone signed in could overwrite another player's monsters with two of their base
    // ids). saveuserid is a yard's owner, an outpost's too (takeoverCell).
    const user: User = ctx.authUser;
    if (!user || fromBase.saveuserid !== user.userid || toBase.saveuserid !== user.userid) {
      return true;
    }

    // Verify that both bases belong to the same user
    if (fromBase.saveuserid !== toBase.saveuserid) {
      ctx.status = Status.FORBIDDEN;
      ctx.body = { error: 1 };
      throw new Error(`Bases belong to different users. From: ${frombaseid} with SaveId: ${fromBase.saveuserid}, To: ${tobaseid} with SaveId: ${toBase.saveuserid}`);
    }

    // (18 October) not while either yard is being attacked: the attack's save would write its own count over this one
    if (isAttackActive(fromBase) || isAttackActive(toBase)) throw baseUnderAttackErr();

    // (QoL #441: what moved is logged, with both yards' housed monsters before and after, so a transfer that lost
    // monsters (a stale second tab, a client slip) can be seen and put right. Kinds not housed in either before
    // can't appear from nowhere.)
    // (22 October: counts read as the yard's load reads them (housedCounts: "500" is 500), the stored ones and the ones
    // sent; a sent one that isn't a whole number of 0 or more (or a list) refused: "500" counted as none here, passed,
    // and became 500 monsters on the next load)
    const storedHoused = (m: unknown): Record<string, number> => {
      const h = (m as { housed?: unknown } | null)?.housed;
      const out: Record<string, number> = {};
      if (h && typeof h === "object") for (const [k, v] of Object.entries(h as Record<string, unknown>)) out[k] = Array.isArray(v) ? v.length : Math.max(0, Math.floor(Number(v) || 0));
      return out;
    };
    for (const sent of [fromMonsters, toMonsters]) {
      const h = (sent as { housed?: unknown } | null)?.housed;
      if (h !== undefined && h !== null && (typeof h !== "object" || Array.isArray(h))) throw new ClientSafeError({ message: "That transfer isn't right. Open the map again.", status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
      if (h && Object.values(h as Record<string, unknown>).some((v) => !Array.isArray(v) && !((typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isInteger(Number(v)) && Number(v) >= 0))) {
        logger.warn(`Monster transfer by #${user.userid} refused: a count that isn't a whole number (${JSON.stringify(h).slice(0, 200)})`);
        throw new ClientSafeError({ message: "That transfer isn't right. Open the map again.", status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
      }
    }
    const before = [storedHoused(fromBase.monsters), storedHoused(toBase.monsters)];
    const after = [storedHoused(fromMonsters), storedHoused(toMonsters)];
    const kinds = new Set([...Object.keys(before[0]), ...Object.keys(before[1]), ...Object.keys(after[0]), ...Object.keys(after[1])]);
    const diff: Record<string, number> = {};
    for (const k of kinds) {
      const d = (after[0][k] ?? 0) + (after[1][k] ?? 0) - (before[0][k] ?? 0) - (before[1][k] ?? 0);
      if (d !== 0) diff[k] = d;
      if ((after[0][k] ?? 0) < 0 || (after[1][k] ?? 0) < 0) throw new Error(`transferMonsters: negative count for ${k}`);
    }
    logger.info(`Monster transfer by #${user.userid} from ${frombaseid} to ${tobaseid}: before ${JSON.stringify(before)}, after ${JSON.stringify(after)}${Object.keys(diff).length ? `, totals changed by ${JSON.stringify(diff)}` : ""}`);

    // (18 October, SUSPECTED-BUGS.md: the two yards' monsters were written as the game sent them, so a transfer could
    // make any monsters at all. A transfer moves monsters: no kind may come out with more than the two yards had.)
    const gained = Object.entries(diff).filter(([, d]) => d > 0);
    if (gained.length) {
      logger.warn(`Monster transfer by #${user.userid} refused: more monsters after than before (${JSON.stringify(Object.fromEntries(gained))})`);
      throw new ClientSafeError({
        message: "Your monsters have changed since the map showed them. Open the map again and try once more.",
        status: Status.CONFLICT,
        data: {},
        isClientFriendly: true,
      });
    }

    // (18 October: only the housed monsters move (and the time they were saved); the rest of each yard's monster data stays as the server has it, so
    // a transfer can't fill a hatchery's queue either)
    const moved = (stored: unknown, sent: unknown) => ({
      ...((stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>),
      housed: (sent as { housed?: unknown } | null)?.housed ?? {},
      ...(typeof (sent as { saved?: unknown } | null)?.saved === "number" && { saved: (sent as { saved: number }).saved }),
    });
    fromBase.monsters = moved(fromBase.monsters, fromMonsters) as Save["monsters"];
    toBase.monsters = moved(toBase.monsters, toMonsters) as Save["monsters"];

    em.persist([fromBase, toBase]);
    return false;
  });
  if (refused) {
    ctx.status = Status.FORBIDDEN;
    ctx.body = { error: 1 };
    return;
  }

  ctx.status = Status.OK;
  ctx.body = { error: 0 };
};
