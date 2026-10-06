import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class CarouselCategoryButton2 extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "CarouselCategoryButton2" });
        as3.fields(this, { mcHit: null, mcMask: null, tLabel: null, mcBar: null });
    }

    public mcHit: MovieClip;
    public mcMask: MovieClip;
    public tLabel: TextField;
    public mcBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
