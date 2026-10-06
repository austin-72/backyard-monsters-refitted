import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { BUILDINGS, Button, CHAMPIONCAGE, CHAMPIONCHAMBER, CREATURES, GLOBAL, KEYS, MonsterMadnessPopupInfo } from "@game";

export class MonsterMadnessPopupInfoGoal1Complete extends MonsterMadnessPopupInfo {
    public $ctor(): void {
        super.$ctor();
        this.isOnlySeenOnce = true;
    }

    protected onClickBrag(param1: MouseEvent): void {
        this.ShowBrag("mm_g1_complete", "mm_korathunlocked_streamtitle", "mm_korathunlocked_streambody", MonsterMadnessPopupInfo.KOGOTH_BRAG_IMAGE1);
    }

    public override getCopy(param1: int): string {
        let _loc2_: string = null;
        if (GLOBAL._bCage) {
            if (CREATURES._guardian) {
                if (GLOBAL._bChamber) {
                    _loc2_ = "mm_goal1_completed4";
                } else {
                    _loc2_ = "mm_goal1_completed2";
                }
            } else {
                _loc2_ = "mm_goal1_completed3";
            }
        } else {
            _loc2_ = "mm_goal1_completed1";
        }
        return _loc2_;
    }

    public override getMedia(param1: int): DisplayObject {
        return this.setupVideo(MonsterMadnessPopupInfo.KOGOTH_SPINNING_VIDEO);
    }

    public override setupButton(param1: Button, param2: int): void {
        param1.Setup(KEYS.Get("btn_brag"));
        param1.Highlight = true;
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickBrag));
    }

    private buildCage(param1: MouseEvent): void {
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.buildCage));
        this.close();
        BUILDINGS._buildingID = 114;
        BUILDINGS.Show();
    }

    private buildChamber(param1: MouseEvent): void {
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.buildChamber));
        this.close();
        BUILDINGS._buildingID = 119;
        BUILDINGS.Show();
    }

    private openChamber(param1: MouseEvent): void {
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.openChamber));
        this.close();
        CHAMPIONCHAMBER.Show();
    }

    private openCage(param1: MouseEvent): void {
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.openCage));
        this.close();
        CHAMPIONCAGE.Show();
    }
}
