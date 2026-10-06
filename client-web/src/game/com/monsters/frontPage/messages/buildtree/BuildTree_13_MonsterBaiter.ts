import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL, MONSTERBAITER } from "@game";

export class BuildTree_13_MonsterBaiter extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("baiter", MONSTERBAITER.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 4 && Boolean(BASE.hasNumBuildings(8, 1)) && BASE.hasNumBuildings(MONSTERBAITER.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(MONSTERBAITER.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
