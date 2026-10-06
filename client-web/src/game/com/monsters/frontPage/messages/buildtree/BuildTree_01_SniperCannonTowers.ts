import * as as3 from "as3";
import { BASE, BUILDING20, BuildingEvent, GLOBAL, KeywordMessage, LOGGER } from "@game";

export class BuildTree_01_SniperCannonTowers extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("snipercannon", "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 1 && BASE.hasNumBuildings(BUILDING20.TYPE) <= 0;
    }

    protected override onButtonClick(): void {
        this.buyMenu(3, 1, 0);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction), false, 0, true);
    }

    protected placedForConstruction(param1: BuildingEvent): void {
        if (param1.building._type == BUILDING20.TYPE) {
            GLOBAL.eventDispatcher.removeEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction));
            LOGGER.StatB({ "st1": "GTP", "st2": "Action", "value": 1 }, this._buttonCopy);
        }
    }
}
