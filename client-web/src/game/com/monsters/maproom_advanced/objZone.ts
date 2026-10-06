import * as as3 from "as3";
import { ASObject, int } from "as3";

export class objZone extends ASObject {
    static {
        as3.fields(this, { updated: 0, data: null });
    }

    public updated: int;
    public data: any;

    public $ctor(): void {
        super.$ctor();
    }
}
