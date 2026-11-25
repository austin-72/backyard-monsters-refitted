import { hellgateWavesIn } from "../anticheat/requestChecks.js";
import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { finishRun, tdBaseId } from "./hellgate.js";
import { finishRun2, runMeta } from "./hellgate2.js";

/**
 * Inferno-only (QoL #289, 14 October): a Hellgate Defense run's checkpoint. A reload or a closed tab at wave 45
 * recorded nothing: the run's result only came with td/finish. The game now reports every wave it clears
 * (td/checkpoint: the waves and kills so far, kept on the run's own yard row, which nothing else writes); a run
 * still open with a checkpoint when the player next opens Hellgate Defense (td/status, open, status2, open2) is
 * recorded then, as the run had been left at that wave (td/finish's checks all apply).
 */
export const saveCheckpoint = async (user: User, wave: unknown, kills: unknown) => {
  const waves = Math.max(0, Math.floor(Number(wave)) || 0);
  const killed = Math.max(0, Math.floor(Number(kills)) || 0);
  if (waves <= 0) return { saved: false };
  const em = postgres.em.fork();
  const baseid = tdBaseId(user.userid);
  const run = await em.findOne(Save, { baseid, type: "td", userid: user.userid }, { fields: ["aiattacks", "createtime"] });
  if (!run) return { saved: false };
  // (18 October, SUSPECTED-BUGS.md: any wave was kept, and recorded later when the run was settled) no more than the
  // time since the run began allows
  if (waves > hellgateWavesIn(getCurrentDateTime() - (Number(run.createtime) || 0))) return { saved: false };
  const before = Number((run.aiattacks as Record<string, { wave?: number }> | null)?.cp?.wave ?? 0);
  // (only forwards: a checkpoint from a stale tab doesn't lower it)
  if (waves < before) return { saved: false };
  await em.nativeUpdate(Save, { baseid, type: "td", userid: user.userid }, { aiattacks: { cp: { wave: waves, kills: killed, at: getCurrentDateTime() } } } as never);
  return { saved: true };
};

/** A run left open with a checkpoint is recorded now. Answers {wave, v2} when one was, else null. */
export const settleAbandoned = async (user: User): Promise<{ wave: number; v2: boolean } | null> => {
  const em = postgres.em.fork();
  const run = await em.findOne(Save, { baseid: tdBaseId(user.userid), type: "td", userid: user.userid }, { fields: ["aiattacks"] });
  const cp = (run?.aiattacks as Record<string, { wave?: number; kills?: number }> | null)?.cp;
  if (!run || !cp || !(Number(cp.wave) > 0)) return null;
  if (await runMeta(user.userid)) {
    const r = (await finishRun2(user, cp.wave, cp.kills, 0)) as { recorded?: boolean };
    return r.recorded ? { wave: Number(cp.wave), v2: true } : null;
  }
  // (15 October, QoL #459: finishRun's answer may be a repeat's, without the wave)
  const r = (await finishRun(user, cp.wave, cp.kills, 0)) as { recorded?: boolean; wave?: number };
  return r.recorded ? { wave: r.wave ?? Number(cp.wave), v2: false } : null;
};
