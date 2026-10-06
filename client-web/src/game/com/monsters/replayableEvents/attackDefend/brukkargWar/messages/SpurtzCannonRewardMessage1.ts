import * as as3 from "as3";
import { BASE, BuildingEvent, GLOBAL, KeywordMessage, LOGGER, POPUPS, SpurtzCannon, YARD_PROPS } from "@game";

export class SpurtzCannonRewardMessage1 extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarreward1", "btn_buildnow");
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        if (YARD_PROPS._yardProps[SpurtzCannon.TYPE - 1].blocked) {
            return;
        }
        BASE.addBuildingB(SpurtzCannon.TYPE, true);
        GLOBAL.eventDispatcher.addEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.constructedBuilding));
    }

    protected constructedBuilding(param1: BuildingEvent): void {
        LOGGER.StatB({ "st1": "ERS", "st2": "Brukkarg War", "st3": "cannon_placed" }, "Cannon_Placed");
        GLOBAL.eventDispatcher.removeEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.constructedBuilding));
        if (param1.building instanceof SpurtzCannon) {
            GLOBAL.Brag("event5-reward", "event_bruwarreward1_streamtitle", "event_bruwarreward1_streamdesc", "event_bruwarreward1_stream.png");
        }
    }
}
