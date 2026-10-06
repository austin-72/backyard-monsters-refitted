import * as as3 from "as3";
import { ASObject, int } from "as3";

export class MapRoom3TileSetRange extends ASObject {
    static {
        as3.fields(this, { start: 0, end: 0, options: null });
    }

    public start: int;
    public end: int;
    public options: any[];

    public $ctor(param1?: int, param2?: int): void {
        super.$ctor();
        this.start = param1;
        this.end = param2;
        this.options = new Array();
    }
}
