import { SaveKeys } from "../../../../enums/SaveKeys.js";
import { Save } from "../../../../database/models/save.model.js";
import { RESOURCE_KEYS, type Resources } from "../../../../services/base/updateResources.js";

type ResourceType = SaveKeys.RESOURCES | SaveKeys.IRESOURCES;

type LootTarget = Partial<Pick<Save, ResourceType>>;

/**
 * The largest single-resource payout the client can produce from downing one building
 */
const MAX_LOOT_PER_RESOURCE = 10_000_000;

/**
 * Applies the resources looted from the defender during an attack.
 *
 * The delta is reported by the attacking client, so only losses are taken from it —
 * a positive delta would let an attacker top up the base they just hit. The client
 * also sends one on its own account: `fixNegativeResourceValues` funds the base back
 * up to zero when a save starts with a negative pool.
 *
 * The `rNmax` fields are ignored for the same reason; storage capacity is a property
 * of the defender's buildings, not of the attack.
 *
 * @param {Resources} reported - The defender's resource delta as reported by the attacker
 * @param {LootTarget} save - The save holding the defender's pool.
 * @param {ResourceType} [resourceType = SaveKeys.RESOURCES] - Which pool to draw from.
 */
export const defenderLootHandler = (reported: Resources, save: LootTarget, resourceType: ResourceType = SaveKeys.RESOURCES, credited?: Record<string, unknown> | null) => {
  const resources = save[resourceType] ?? {};

  for (const key of RESOURCE_KEYS) {
    const delta = Number(reported[key]);

    if (!Number.isFinite(delta) || delta >= 0) continue;

    // (18 October, SUSPECTED-BUGS.md: any loss the attacker's save said, 10,000,000 a resource a save, whatever was
    // looted) no more than this save's loot credited to the attacker, when the caller gives it
    const most = credited !== undefined ? Math.max(0, Number(credited?.[key]) || 0) : MAX_LOOT_PER_RESOURCE;
    const loss = Math.min(-delta, MAX_LOOT_PER_RESOURCE, most);
    const rawStored = Number(resources[key]);
    
    const stored = Number.isFinite(rawStored) ? rawStored : 0;

    resources[key] = Math.max(0, stored - loss);
  }

  save[resourceType] = resources;
};
