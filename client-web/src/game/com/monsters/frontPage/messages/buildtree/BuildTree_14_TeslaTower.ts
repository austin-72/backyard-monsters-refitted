import * as as3 from "as3";
import { BASE, BUILDING25, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_14_TeslaTower extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("tesla", BUILDING25.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 4 && BASE.hasNumBuildings(BUILDING25.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(BUILDING25.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
