import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_04_BoobyTraps extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("booby", 24, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (BASE.hasNumBuildings(24) != 0 || Boolean(BASE.hasNumBuildings(117))) {
            return false;
        }
        return GLOBAL.townHall._lvl.Get() >= 2;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(24);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
