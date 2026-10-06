import * as as3 from "as3";
import { BASE, FrontPageHandler, GLOBAL, KeywordMessage, STORE } from "@game";

export class BuildTree_18_MetalBlocks extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("blocks3", "btn_buildnow");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() >= 4 && BASE.hasNumBuildings(17, 1) >= 1 && BASE.hasNumBuildings(17, 3) <= 0;
    }

    protected override onButtonClick(): void {
        FrontPageHandler.closeAll();
        if (BASE.isInfernoMainYardOrOutpost) {
            STORE.ShowB(1, 0, ["BLK2I", "BLK3I"]);
        } else {
            STORE.ShowB(1, 0, ["BLK2", "BLK3", "BLK4", "BLK5"]);
        }
    }
}
