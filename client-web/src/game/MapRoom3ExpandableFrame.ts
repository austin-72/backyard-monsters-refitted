import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class MapRoom3ExpandableFrame extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3ExpandableFrame" });
        as3.fields(this, { background: null, contentsContainer: null, frameFooter: null, collapseExpandButton: null, frameBorders: null, headerText: null, frameHeader: null });
    }

    public background: MovieClip;
    public contentsContainer: MovieClip;
    public frameFooter: MovieClip;
    public collapseExpandButton: MovieClip;
    public frameBorders: MovieClip;
    public headerText: TextField;
    public frameHeader: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
