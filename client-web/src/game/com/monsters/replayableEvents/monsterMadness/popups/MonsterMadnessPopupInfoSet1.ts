import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Button, MonsterMadnessPopup, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoSet1 extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
    }

    public override getCopy(param1: int): string {
        let _loc2_: string = null;
        switch (param1) {
            case MonsterMadnessPopup.MR2_AND_INFERNO:
                _loc2_ = "mm_pop_both1";
                break;
            case MonsterMadnessPopup.MR2:
                _loc2_ = "mm_pop_mronly1";
                break;
            case MonsterMadnessPopup.INFERNO:
                _loc2_ = "mm_pop_infonly1";
                break;
            case MonsterMadnessPopup.TOWNHALL_GREATER_THAN_5:
                _loc2_ = "mm_pop_neitherclose1";
                break;
            case MonsterMadnessPopup.TOWNHALL_LESS_THAN_5:
                _loc2_ = "mm_pop_neither1";
                break;
            default:
                _loc2_ = "invalid userstate";
        }
        return _loc2_;
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupVideo(MonsterMadnessPopupInfo.KOGOTH_SPINNING_VIDEO);
    }

    public override setupButton(param1: Button, param2: int): void {
        if (param2 == MonsterMadnessPopup.MR2 || param2 == MonsterMadnessPopup.MR2_AND_INFERNO) {
            this.setupRSVPButton(param1);
        } else if (param2 == MonsterMadnessPopup.INFERNO || param2 == MonsterMadnessPopup.TOWNHALL_GREATER_THAN_5) {
            this.setupUpgradeButton(param1);
        } else {
            param1.visible = false;
        }
    }
}
