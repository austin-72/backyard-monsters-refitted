import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, KEYS } from "@game";

/**
 * Inferno-only (22 October, the user's): Harvest Moon, the alliance power-up: every member's harvesters make 25% more,
 * the stronger of it and Production Overdrive (GLOBAL.ioHarvestMul). This is its line under the top bar's icon.
 */
export class AllianceHarvestMoonBuff extends BaseBuff {
    public static readonly ID: uint = 40;

    public $ctor(param1: string = "", param2: string = ""): void {
        super.$ctor("ap_harvestmoon");
    }

    public override get description(): string {
        return KEYS.Get("ap_harvestmoon_desc");
    }
}
