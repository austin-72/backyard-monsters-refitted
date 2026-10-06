import * as as3 from "as3";
import { UI_WARNING_CLIP } from "@game";

export class UI_WARNING extends UI_WARNING_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public Update(param1: string): void {
        this.mc.tText.htmlText = param1;
    }
}
