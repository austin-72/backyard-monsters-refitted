import * as as3 from "as3";
import { ASObject, int } from "as3";

export class WaveObj extends ASObject {
    static {
        as3.fields(this, { creatureID: null, behavior: null, numCreep: 0, direction: 0, level: 0, powerLevel: 0, cameraFocus: false });
    }

    public static readonly DIR: any = { "N": 270, "S": 90, "E": 0, "W": 180 };
    public creatureID: string;
    public behavior: string;
    public numCreep: int;
    public direction: int;
    public level: int;
    public powerLevel: int;
    public cameraFocus: boolean;

    public $ctor(param1?: string, param2?: string, param3?: int, param4?: int, param5: int = 0, param6: int = 0, param7: boolean = false): void {
        super.$ctor();
        this.creatureID = param1;
        this.behavior = param2;
        this.numCreep = param3;
        this.direction = param4;
        this.level = param5;
        this.powerLevel = param6;
        this.cameraFocus = param7;
    }
}
