import * as as3 from "as3";
import { BASE, BuildingEvent, GLOBAL, KeywordMessage, LOGGER, POPUPS, SpurtzCannon, YARD_PROPS } from "@game";

export class SpurtzCannonRewardMessage2 extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarreward2", "btn_buildnow");
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
            GLOBAL.Brag("event5-reward", "event_bruwarreward2_streamtitle", "event_bruwarreward2_streamdesc", "event_bruwarreward2_stream.png");
        }
    }
}
