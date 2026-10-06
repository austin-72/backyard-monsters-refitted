import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class MapRoom3BookmarkDisplay extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3BookmarkDisplay" });
        as3.fields(this, { background: null, imageHolder: null, nameText: null, healthBar: null, descriptionText: null });
    }

    public background: MovieClip;
    public imageHolder: MovieClip;
    public nameText: TextField;
    public healthBar: MovieClip;
    public descriptionText: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
