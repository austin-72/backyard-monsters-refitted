import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, GLOBAL, KEYS, POPUPS, popup_protected } from "@game";

export class buttonProtection extends MovieClip {
    public $ctor(): void {
        super.$ctor();
        this.stop();
        this.mouseChildren = false;
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Show));
        this.buttonMode = true;
    }

    public Show(param1: MouseEvent = null): void {
        let _loc2_: popup_protected = new popup_protected();
        _loc2_.tA.htmlText = "<b>" + KEYS.Get("pop_protection_title") + "</b>";
        if (BASE._isSanctuary) {
            _loc2_.tB.htmlText = KEYS.Get("pop_protection_body", { "v1": GLOBAL.ToTime((BASE._isProtected - GLOBAL.Timestamp()) | 0, false, false) });
        } else {
            _loc2_.tB.htmlText = KEYS.Get("pop_starterprotection_body", { "v1": GLOBAL.ToTime((BASE._isProtected - GLOBAL.Timestamp()) | 0, false, false) });
        }
        POPUPS.Push(_loc2_, null, null, "", "greenbouncer.png");
    }
}
