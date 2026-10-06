import * as as3 from "as3";
import { BASE, BUILDING23, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_15_LaserTower extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("laser", BUILDING23.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 4 && BASE.hasNumBuildings(BUILDING23.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(BUILDING23.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
