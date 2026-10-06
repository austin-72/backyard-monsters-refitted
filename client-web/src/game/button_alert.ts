import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { button_spinner } from "@game";

export class button_alert extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "button_alert" });
        as3.fields(this, { mcSpin: null, mcCounter: null });
    }

    public mcSpin: button_spinner;
    public mcCounter: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
