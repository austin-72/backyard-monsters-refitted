import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class MapRoom3RelocateMainYardPopupFriendItemDisplay extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3RelocateMainYardPopupFriendItemDisplay" });
        as3.fields(this, { worldText: null, imageHolder: null, nameText: null, levelIcon: null, coordinatesText: null, relocateButton: null });
    }

    public worldText: TextField;
    public imageHolder: MovieClip;
    public nameText: TextField;
    public levelIcon: MovieClip;
    public coordinatesText: TextField;
    public relocateButton: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}
