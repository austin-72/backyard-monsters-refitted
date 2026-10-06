import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class icon_invite extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "icon_invite" });
        as3.fields(this, { mcHit: null, mcSpinner: null });
    }

    public mcHit: MovieClip;
    public mcSpinner: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}
