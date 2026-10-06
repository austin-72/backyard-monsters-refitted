import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class MapRoom3ResourcesDisplay extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MapRoom3ResourcesDisplay" });
        as3.fields(this, { resourceDisplay4: null, resourceDisplay2: null, resourceDisplay3: null, resourceDisplay1: null });
    }

    public resourceDisplay4: MovieClip;
    public resourceDisplay2: MovieClip;
    public resourceDisplay3: MovieClip;
    public resourceDisplay1: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
