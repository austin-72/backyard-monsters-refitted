import * as as3 from "as3";
import { uint } from "as3";
import { BASE, BUILDING9, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_11_MonsterJuicer extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("juicer", BUILDING9.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        let _loc1_: uint = GLOBAL.townHall._lvl.Get() >>> 0;
        return _loc1_ >= 3 && _loc1_ <= 4 && BASE.hasNumBuildings(this._buildingType) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(this._buildingType);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
