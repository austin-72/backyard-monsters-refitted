import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Button, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoEventComplete extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
    }

    public override getCopy(param1: int): string {
        return "mm_goal3_completed2";
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupVideo(MonsterMadnessPopupInfo.KOGOTH_SPINNING_STOMP_VIDEO);
    }

    public override setupButton(param1: Button, param2: int): void {
        this.setupCloseButtton(param1);
    }
}
