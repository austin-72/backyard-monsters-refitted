import * as as3 from "as3";
import { ASObject, int } from "as3";

export class BitString extends ASObject {
    static {
        as3.fields(this, { len: 0, val: 0 });
    }

    public len: int;
    public val: int;

    public $ctor(): void {
        super.$ctor();
    }
}
