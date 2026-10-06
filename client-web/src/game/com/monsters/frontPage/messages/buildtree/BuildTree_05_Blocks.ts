import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_05_Blocks extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("blocks1", 17, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (BASE.hasNumBuildings(17) != 0) {
            return false;
        }
        return GLOBAL.townHall._lvl.Get() >= 2;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(17);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
