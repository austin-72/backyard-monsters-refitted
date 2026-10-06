import {
  type Resources,
  RESOURCE_KEYS,
  updateResources,
} from "../../../../services/base/updateResources.js";
import { logger } from "../../../../utils/logger.js";
import { Save } from "../../../../database/models/save.model.js";
import { SaveKeys } from "../../../../enums/SaveKeys.js";

/**
 * Options controlling where a delta lands and how much of it is applied.
 */
interface ResourceOptions {
  key?: SaveKeys.RESOURCES | SaveKeys.IRESOURCES;

  /**
   * Drop the `rNmax` fields. Set when the delta came from an outpost session: the client
   * computes capacity from the buildings in the yard it currently has loaded, so an
   * outpost's caps are not the main yard's caps.
   */
  skipCapacity?: boolean;
}

type ResourceDelta = Resources | string | undefined;

/**
 * Applies a client resource delta to a save.
 *
 * @param {Save} save - The save to write to
 * @param {ResourceDelta} resourceDelta - The delta, stringified or not
 * @param {ResourceOptions} [options = {}] - Pool selection and capacity handling
 */
export const resourcesHandler = (save: Save, resourceDelta: ResourceDelta, options: ResourceOptions = {}) => {
  const { key = SaveKeys.RESOURCES, skipCapacity = false } = options;

  let resourceData: Resources | null = null;

  if (resourceDelta) {
    try {
      resourceData = JSON.parse(resourceDelta as string);
    } catch {
      resourceData = resourceDelta as Resources;
    }
  }

  if (resourceData) {
    if (skipCapacity) {
      const { r1max, r2max, r3max, r4max, ...amounts } = resourceData;
      resourceData = amounts;
    }

    const updated = updateResources(resourceData, save[key] ?? {}) as Record<string, unknown>;

    // Never keep a negative amount. Spending sent by the game can land after the amount went down on the
    // server in the meantime (another tab or device, a raid): the game used to be sent the negative number
    // and put it back to zero itself on its next save (bug reports "Negative twigs reset").
    for (const resource of RESOURCE_KEYS) {
      const amount = Number(updated[resource]);
      if (Number.isFinite(amount) && amount < 0) {
        logger.warn(`Save ${save.basesaveid}: ${resource} would be ${amount}, kept at 0`);
        updated[resource] = 0;
      }
    }

    save[key] = updated as Save[typeof key];
  }
};
