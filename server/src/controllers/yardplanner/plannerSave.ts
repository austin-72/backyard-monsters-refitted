import { Save } from "../../database/models/save.model.js";
import { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { postgres } from "../../server.js";

/**
 * Where a request's Yard Planner slots live: `savetemplate` (the slots, [{ slotid, name, data, saved, from? }]) and
 * `baseid` (the key their earlier versions are kept under, plannerPrevious.ts). Changed in place, kept with
 * postgres.em.flush().
 */
export interface PlannerSlots {
  baseid: string;
  savetemplate: any[];
  /** The outpost being planned (baseid), when these are the shared outpost slots: a slot saved now records it. */
  from?: string;
}

/** The key the shared outpost slots' earlier versions are kept under (a baseid is digits only). */
export const outpostSlotsKey = (userid: number) => `o${userid}`;

/**
 * The slots a request is about. The main yard keeps its own 10 slots on the main save (as it always did). The
 * outposts (12 November) share 10 slots, kept on the player (user.outpost_layouts): a layout saved in one outpost can
 * be loaded in another. A layout records building ids, which differ from one outpost to the next, so each slot records
 * the outpost it was saved in (from) and the game places a slot from another outpost by kind of building, nearest
 * first, as Import does. The client sends the base it is planning; anything but one of the player's own outposts
 * means the main yard.
 */
export const plannerSave = async (user: User, baseid: unknown): Promise<PlannerSlots> => {
  const id = String(baseid ?? "").trim();
  if (/^\d+$/.test(id)) {
    const outpost = await postgres.em.findOne(Save, { baseid: id, type: BaseType.OUTPOST, saveuserid: user.userid });
    if (outpost) {
      if (!Array.isArray(user.outpost_layouts)) {
        user.outpost_layouts = await firstOutpostSlots(user);
        await postgres.em.flush();
      }
      return {
        baseid: outpostSlotsKey(user.userid),
        from: id,
        get savetemplate() {
          return Array.isArray(user.outpost_layouts) ? user.outpost_layouts : [];
        },
        set savetemplate(slots: any[]) {
          user.outpost_layouts = slots;
        },
      };
    }
  }
  await postgres.em.populate(user, ["save"]);
  return mainSlots(user.save!);
};

const mainSlots = (save: Save): PlannerSlots => ({
  baseid: String(save.baseid ?? ""),
  get savetemplate() {
    return Array.isArray(save.savetemplate) ? save.savetemplate : [];
  },
  set savetemplate(slots: any[]) {
    save.savetemplate = slots;
  },
});

/**
 * The shared slots the first time they are used: what the player's outposts had in their own slots, the most
 * recently saved first, 10 at most; each keeps its slot when that is free, or takes the first free one.
 */
const firstOutpostSlots = async (user: User): Promise<any[]> => {
  const rows = await postgres.em
    .getConnection()
    .execute<{ baseid: string; savetemplate: unknown }[]>(`SELECT baseid, savetemplate FROM bym.save WHERE saveuserid = ? AND type = ?`, [
      user.userid,
      BaseType.OUTPOST,
    ]);
  const found: any[] = [];
  for (const row of rows) {
    let slots: unknown = row.savetemplate;
    if (typeof slots === "string") {
      try {
        slots = JSON.parse(slots);
      } catch {
        slots = [];
      }
    }
    for (const slot of Array.isArray(slots) ? slots : []) {
      if (slot && typeof slot === "object" && slot.data != null && slot.data !== "") found.push({ ...slot, from: String(row.baseid) });
    }
  }
  found.sort((a, b) => (Number(b.saved) || 0) - (Number(a.saved) || 0));
  const out: any[] = [];
  const taken = new Set<number>();
  for (const slot of found) {
    if (out.length >= 10) break;
    let at = Math.floor(Number(slot.slotid));
    if (!Number.isInteger(at) || at < 0 || at > 9 || taken.has(at)) {
      at = [...Array(10).keys()].find((n) => !taken.has(n)) ?? -1;
    }
    if (at < 0) break;
    taken.add(at);
    out.push({ ...slot, slotid: at });
  }
  return out.sort((a, b) => a.slotid - b.slotid);
};
