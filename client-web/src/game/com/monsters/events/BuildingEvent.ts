import * as as3 from "as3";
import { Event } from "flash/events";
import { BFOUNDATION } from "@game";

export class BuildingEvent extends Event {
    static {
        as3.fields(this, { _building: null });
    }

    public static readonly UPGRADED: string = "buildingUpgraded";

    public static readonly PLACED_FOR_CONSTRUCTION: string = "buildingPlacedForConstruction";

    public static ATTEMPT_RECYCLE: string = "attemptedToRecycleBuilding";

    public static ENTER_MR2: string = "enterMaproom2";

    public static DESTROY_MAPROOM: string = "destroyMaproom";
    private _building: BFOUNDATION;

    public $ctor(param1?: string, param2?: any /* BFOUNDATION */): void {
        super.$ctor(param1);
        this._building = param2;
    }

    public get building(): BFOUNDATION {
        return this._building;
    }
}
