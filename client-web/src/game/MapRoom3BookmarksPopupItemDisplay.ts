import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MapRoom3BookmarksPopupItemDisplay extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3BookmarksPopupItemDisplay" });
        as3.fields(this, { background: null, nameText: null, removeButton: null, coordinatesText: null });
    }

    public background: MovieClip;
    public nameText: TextField;
    public removeButton: Button_CLIP;
    public coordinatesText: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
