import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { Button, KEYS, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoGoal2Complete extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
        this.isOnlySeenOnce = true;
    }

    public override getCopy(param1: int): string {
        return "mm_goal2_completed";
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupVideo(MonsterMadnessPopupInfo.KOGOTH_SPINNING_FIREBALL_VIDEO);
    }

    public override setupButton(param1: Button, param2: int): void {
        param1.Setup(KEYS.Get("btn_brag"));
        param1.Highlight = true;
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickBrag));
    }

    protected onClickBrag(param1: MouseEvent): void {
        this.ShowBrag("mm_g2_complete", "mm_korathability1_streamtitle", "mm_korathability1_streambody", MonsterMadnessPopupInfo.KOGOTH_BRAG_IMAGE2);
    }
}
