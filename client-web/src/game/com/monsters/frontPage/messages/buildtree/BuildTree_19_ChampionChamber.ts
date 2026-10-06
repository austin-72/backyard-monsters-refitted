import * as as3 from "as3";
import { BASE, BuildTreeMessage, BuildingEvent, CHAMPIONCAGE, CHAMPIONCHAMBER, GLOBAL } from "@game";

export class BuildTree_19_ChampionChamber extends BuildTreeMessage {
    public $ctor(): void {
        super.$ctor("chamber", CHAMPIONCHAMBER.TYPE, "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 4 && BASE.hasNumBuildings(CHAMPIONCHAMBER.TYPE) <= 0 && BASE.hasNumBuildings(CHAMPIONCAGE.TYPE, 1) >= 1;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(CHAMPIONCHAMBER.TYPE);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }
}
