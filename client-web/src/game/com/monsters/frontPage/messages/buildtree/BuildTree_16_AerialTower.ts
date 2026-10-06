import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_16_AerialTower extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("aerial", 115, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (BASE.hasNumBuildings(115) != 0) {
            return false;
        }
        return GLOBAL.townHall._lvl.Get() >= 4;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(115);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
