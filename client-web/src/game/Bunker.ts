import * as as3 from "as3";
import { int } from "as3";
import { BFOUNDATION } from "@game";

export class Bunker extends BFOUNDATION {
    static {
        as3.fields(this, { _used: 0, _monstersDispatched: null, _monstersDispatchedTotal: 0 });
    }

    public _used: int;
    public _monstersDispatched: any;
    public _monstersDispatchedTotal: int;

    public $ctor(): void {
        super.$ctor();
    }
}
