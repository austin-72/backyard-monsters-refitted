import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../database/models/user.model.js";
import { postgres } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { plannerSave } from "./plannerSave.js";
import { keepPreviousLayout } from "./plannerPrevious.js";

interface RequestBody {
  slotid: number;
  name: string;
  data: Record<string, {}>;
  baseid?: string;
  rename?: unknown;
}

/** (18 October) A planner slot's most buildings and size (shareLayout takes codes of 1,500 buildings, 60,000 characters). */
const PLANNER_MAX_NODES = 2_000;
const PLANNER_MAX_BYTES = 200_000;

/** Saves a layout into a slot of the yard being planned (baseid; main yard by default; the outposts share theirs). */
export const saveTemplate: KoaController = async (ctx) => {
  const { slotid, name, data, baseid, rename } = ctx.request.body as RequestBody;
  const user: User = ctx.authUser;
  const save = await plannerSave(user, baseid);

  const templates = [...(save.savetemplate ?? [])];
  // (saved: when, in seconds, shown by the slot; Inferno-only, 10 October: 10 slots, 0 to 9)
  const slot = Math.floor(Number(slotid));
  if (!Number.isInteger(slot) || slot < 0 || slot > 9) {
    ctx.status = Status.OK;
    ctx.body = { error: "That slot doesn't exist." };
    return;
  }
  // (QoL #680: rename=1 renames a saved slot: only its name changes, its layout and when it was saved stay)
  if (String(rename ?? "") === "1") {
    const at = templates.findIndex((template) => Number(template.slotid) === slot);
    if (at === -1) {
      ctx.status = Status.OK;
      ctx.body = { error: "That slot is empty." };
      return;
    }
    templates[at] = { ...templates[at], name: String(name ?? "").slice(0, 60) };
    save.savetemplate = templates;
    await postgres.em.flush();
    ctx.status = Status.OK;
    ctx.body = {
      error: 0,
      ...templates,
    };
    return;
  }
  // (18 October, SUSPECTED-BUGS.md: whatever was sent was stored, up to the 8 MB body limit, and sent with every load
  // of the yard) a layout: an object of at most PLANNER_MAX_NODES buildings, PLANNER_MAX_BYTES at most as JSON
  // (the game sends the layout as JSON text: {"0": building, "1": ...}; an object is taken too)
  const sent: unknown = data;
  let layout: unknown = sent;
  if (typeof layout === "string") {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = null;
    }
  }
  const size = typeof sent === "string" ? sent.length : (() => {
    try {
      return JSON.stringify(sent ?? null).length;
    } catch {
      return Infinity;
    }
  })();
  if (!layout || typeof layout !== "object" || Array.isArray(layout) || Object.keys(layout).length > PLANNER_MAX_NODES || size > PLANNER_MAX_BYTES) {
    ctx.status = Status.OK;
    ctx.body = { error: "That layout is too big to keep." };
    return;
  }
  // (12 November: a shared outpost slot records the outpost it was saved in)
  const entry = { slotid: slot, name: String(name ?? "").slice(0, 60), data, saved: Math.floor(Date.now() / 1000), ...(save.from && { from: save.from }) };
  const existingSlotIndex = templates.findIndex((template) => Number(template.slotid) === entry.slotid);

  if (existingSlotIndex !== -1) {
    // (QoL #492: what the slot had is kept 7 days, for Restore; not when the same layout is saved again)
    await keepPreviousLayout(String(save.baseid ?? ""), slot, templates[existingSlotIndex], data);
    templates[existingSlotIndex] = entry;
  } else templates.push(entry);

  save.savetemplate = templates;
  await postgres.em.flush();

  ctx.status = Status.OK;
  ctx.body = {
    error: 0,
    ...templates,
  };
};
