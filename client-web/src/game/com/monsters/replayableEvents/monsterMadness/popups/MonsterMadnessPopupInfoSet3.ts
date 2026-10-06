import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Button, MonsterMadnessPopup, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoSet3 extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
    }

    public override getCopy(param1: int): string {
        let _loc2_: string = null;
        switch (param1) {
            case MonsterMadnessPopup.MR2_AND_INFERNO:
                _loc2_ = "mm_pop_both3";
                break;
            case MonsterMadnessPopup.MR2:
                _loc2_ = "mm_pop_mronly3";
                break;
            case MonsterMadnessPopup.INFERNO:
                _loc2_ = "mm_pop_infonly3";
                break;
            case MonsterMadnessPopup.TOWNHALL_GREATER_THAN_5:
                _loc2_ = "mm_pop_neitherclose3";
                break;
            case MonsterMadnessPopup.TOWNHALL_LESS_THAN_5:
                _loc2_ = "mm_pop_neither3";
                break;
            default:
                _loc2_ = "invalid userstate";
        }
        return _loc2_;
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupImage("specialevent/monstermadness/pop_one_destroyedbases.png");
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
