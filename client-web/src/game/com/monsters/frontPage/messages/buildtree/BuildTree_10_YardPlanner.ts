import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL, PLANNER } from "@game";

export class BuildTree_10_YardPlanner extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("planner", PLANNER.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (GLOBAL._flags.yp_version == 2) {
            return false;
        }
        return GLOBAL.townHall._lvl.Get() >= 3 && BASE.hasNumBuildings(PLANNER.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(PLANNER.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
