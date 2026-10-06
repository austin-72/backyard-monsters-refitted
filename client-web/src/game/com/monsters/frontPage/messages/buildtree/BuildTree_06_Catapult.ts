import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_06_Catapult extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("catapult1", 51, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (BASE.hasNumBuildings(51) != 0) {
            return false;
        }
        return Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= 3;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(51);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
