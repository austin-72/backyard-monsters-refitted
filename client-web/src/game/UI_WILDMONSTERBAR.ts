import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { KEYS, UI_WILDMONSTERBAR_CLIP, WMATTACK } from "@game";

export class UI_WILDMONSTERBAR extends UI_WILDMONSTERBAR_CLIP {
    public $ctor(): void {
        super.$ctor();
        this.info.addEventListener(MouseEvent.CLICK, as3.bind(this, this.infoDown));
        this.tA.htmlText = KEYS.Get("ai_monsterbar_title");
        this.info.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.infoOver));
        this.info.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.infoOut));
        this.info.tA.htmlText = "<b>" + KEYS.Get("ai_monsterbar_sendnow_btn") + "</b>";
        this.info.mouseChildren = false;
        this.info.useHandCursor = true;
    }

    private infoOver(param1: MouseEvent): void {
        this.info.gotoAndStop(2);
    }

    private infoOut(param1: MouseEvent): void {
        this.info.gotoAndStop(1);
    }

    private infoDown(param1: MouseEvent): void {
        WMATTACK.Attack();
    }
}
