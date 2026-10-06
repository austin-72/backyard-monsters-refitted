import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { KEYS, POPUPS, popup_prefab, popup_prefab_help_CLIP } from "@game";

export class popup_prefab_help extends popup_prefab_help_CLIP {
    public $ctor(): void {
        super.$ctor();
        this.b1.SetupKey("newmap_sk_btn");
        this.b1.Highlight = true;
        this.b1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Next));
        this.tTitle.htmlText = KEYS.Get("newmap_sk_title");
        this.tMessage.htmlText = KEYS.Get("newmap_sk_hlp");
    }

    private Next(param1: MouseEvent = null): void {
        this.b1.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Next));
        POPUPS.Next();
        POPUPS.Push(new popup_prefab());
    }
}
