import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class screenTransparent extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "screenTransparent" });
        as3.fields(this, { glare: null, canvas: null });
    }

    public glare: MovieClip;
    public canvas: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
