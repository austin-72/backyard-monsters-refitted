import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, GLOBAL, MONSTERBUNKER } from "@game";

export class BuildTree_12_MonsterBunker extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("bunker", MONSTERBUNKER.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 3 && BASE.hasNumBuildings(MONSTERBUNKER.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(MONSTERBUNKER.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
