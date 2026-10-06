import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, KEYS, MapRoomManager } from "@game";

export class AllianceDeclareWarBuff extends BaseBuff {
    public static readonly ID: uint = 11;

    public $ctor(param1: string = "", param2: string = ""): void {
        super.$ctor("ap_declarewar");
    }

    public override get description(): string {
        return KEYS.Get(MapRoomManager.instance.isInMapRoom2 ? "ap_declarewar_desc" : "nwm_ap_declarewar_desc");
    }

    public override apply(): void {
    }

    public override clear(): void {
    }
}
