import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Button, MonsterMadnessPopup, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoGoal1 extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
    }

    public override getCopy(param1: int): string {
        return param1 == MonsterMadnessPopup.MR2 || param1 == MonsterMadnessPopup.MR2_AND_INFERNO ? "mm_goal1_desc" : "mm_nomr2_desc";
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupVideo(MonsterMadnessPopupInfo.KOGOTH_SPINNING_VIDEO);
    }

    public override setupButton(param1: Button, param2: int): void {
        this.setupCloseButtton(param1);
    }
}
