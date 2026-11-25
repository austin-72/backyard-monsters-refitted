import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, KEYS } from "@game";

/**
 * Inferno-only (22 October, the user's): Builders' Guild, the alliance power-up: every member's builds and upgrades
 * take 15% less time, the stronger of it and Sharper Tools (GLOBAL.ioBuildTime). This is its line under the top bar's
 * icon.
 */
export class AllianceBuildersGuildBuff extends BaseBuff {
    public static readonly ID: uint = 41;

    public $ctor(param1: string = "", param2: string = ""): void {
        super.$ctor("ap_buildersguild");
    }

    public override get description(): string {
        return KEYS.Get("ap_buildersguild_desc");
    }
}
