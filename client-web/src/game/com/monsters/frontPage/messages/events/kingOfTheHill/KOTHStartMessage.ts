import * as as3 from "as3";
import { GLOBAL, KEYS, KOTHPromoMessage, MapRoomManager } from "@game";

export class KOTHStartMessage extends KOTHPromoMessage {
    public $ctor(): void {
        super.$ctor("event_kothstart");
        if (MapRoomManager.instance.isInMapRoom2or3) {
            this._action = as3.bind(this, this.openMapRoom);
            this._buttonCopy = KEYS.Get("btn_openmap");
        } else if (Boolean(GLOBAL._bMap) && GLOBAL.townHall._lvl.Get() >= 6) {
            this._buttonCopy = KEYS.Get("btn_upgradenow");
            this._action = as3.bind(this, this.upgradeMapRoom);
        }
        let _loc1_: boolean = false;
        if (_loc1_) {
            this.videoURL = "assets/popups/front_page/fp_event_kothstart.flv";
        } else {
            this.imageURL = "popups/front_page/fp_event_kothstart.v2.jpg";
        }
    }

    private openMapRoom(): void {
        GLOBAL.ShowMap();
    }
}
