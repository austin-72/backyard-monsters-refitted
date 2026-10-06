import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { GLOBAL, SPECIALEVENT, UI_BAITERSCAREAWAY_CLIP } from "@game";

export class UI_BAITERSCAREAWAY extends UI_BAITERSCAREAWAY_CLIP {
    public $ctor(param1: boolean = true): void {
        super.$ctor();
        if (param1) {
            this.bReturn.SetupKey("bait_scareaway");
        } else {
            this.bReturn.SetupKey("wmi_surrenderbtn");
        }
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent.active) {
            this.bReturn.SetupKey("wmi_surrenderbtn");
        }
        this.bReturn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onReturnDown));
    }

    private onReturnDown(param1: MouseEvent): void {
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        let _loc2_: boolean = Boolean(activeEvent.active);
        if (_loc2_) {
            activeEvent.Surrender();
            return;
        }
        this.dispatchEvent(new Event("scareAway"));
    }

    public Resize(): void {
        GLOBAL.RefreshScreen();
        this.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this.mcBG.width - 10;
        this.y = GLOBAL._SCREENHUD.y - (this.mcBG.height + 10);
    }
}
