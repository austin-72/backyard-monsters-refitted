import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class UI_MISSIONMENU_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "UI_MISSIONMENU_CLIP" });
        as3.fields(this, { footer: null, frame: null });
    }

    public footer: MovieClip;
    public frame: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
