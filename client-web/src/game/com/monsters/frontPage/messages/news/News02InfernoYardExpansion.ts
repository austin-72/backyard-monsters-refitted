import * as as3 from "as3";
import { BASE, INFERNOPORTAL, KeywordMessage, MAPROOM_DESCENT, POPUPS } from "@game";

export class News02InfernoYardExpansion extends KeywordMessage {
    public $ctor(): void {
        let _loc1_: string = null;
        if (!BASE.isInfernoMainYardOrOutpost && MAPROOM_DESCENT.DescentPassed) {
            _loc1_ = "btn_gotoinferno";
        }
        super.$ctor("3_16_0", _loc1_);
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        INFERNOPORTAL.ToggleYard();
    }
}
