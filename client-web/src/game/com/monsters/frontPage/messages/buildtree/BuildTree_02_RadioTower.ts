import * as as3 from "as3";
import { uint } from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_02_RadioTower extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("radiotower", 113, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        let _loc1_: uint = GLOBAL.townHall._lvl.Get() >>> 0;
        return BASE.hasNumBuildings(this._buildingType) <= 0 && _loc1_ >= 1 && _loc1_ <= 3 && Boolean(GLOBAL._flags.radio);
    }

    protected override onButtonClick(): void {
        this.buyBuilding(this._buildingType);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
