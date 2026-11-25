import type { JsonObject } from "../../types/JsonObject.js";

export interface Resources {
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
  r1max?: number;
  r2max?: number;
  r3max?: number;
  r4max?: number;
}

export enum Operation {
  ADD = "add",
  SUBTRACT = "subtract",
}

export const RESOURCE_KEYS = ["r1", "r2", "r3", "r4"] as const;

/**
 * Updates the resources with the delta sent from the client.
 * 
 * @param {Resources} resources - The request body containing the resources.
 * @param {JsonObject} saveResources - The existing saved resources.
 * @param {Operation} [operation = Resource.ADD] - The type of operation to perform (add or subtract).
 * @returns {JsonObject} Updated resources after applying the delta.
 */
export const updateResources = (
  resources: Resources,
  saveResources: JsonObject,
  operation: Operation = Operation.ADD
) => {
  if (resources && typeof resources === "object") {
    Object.keys(resources).forEach((key) => {
      const resourceKey = key as keyof Resources;
      // (18 October) only the four resources and their capacities, and only as numbers: a change sent as text
      // ("5000") was joined to the stored amount as text, "123" + "5000" = "1235000"
      if (!/^r[1-4](max)?$/.test(key)) return;
      const change = Number(resources[resourceKey]);
      if (!Number.isFinite(change)) return;
      if (key.endsWith("max")) {
        saveResources[resourceKey] = change;
      } else {
        const stored = Number(saveResources[resourceKey]);
        const before = Number.isFinite(stored) ? stored : 0;
        saveResources[resourceKey] = before + (operation === Operation.ADD ? change : -change);
      }
    });
  }
  return saveResources;
};
