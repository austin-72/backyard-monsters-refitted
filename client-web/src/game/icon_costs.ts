import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class icon_costs extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "icon_costs" });
        as3.fields(this, { tTitle: null, tValue: null });
    }

    public tTitle: TextField;
    public tValue: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}
