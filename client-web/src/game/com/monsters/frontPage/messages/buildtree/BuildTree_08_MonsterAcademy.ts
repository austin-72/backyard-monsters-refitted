import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL } from "@game";

export class BuildTree_08_MonsterAcademy extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("academy", 26, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        if (BASE.hasNumBuildings(26) != 0) {
            return false;
        }
        return Boolean(GLOBAL.townHall && GLOBAL.townHall._lvl.Get() >= 3 && Boolean(GLOBAL._bLocker) && GLOBAL._bLocker._lvl.Get() >= 2);
    }

    protected override onButtonClick(): void {
        this.buyBuilding(26);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
