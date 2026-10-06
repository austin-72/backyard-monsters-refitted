import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MapRoomCell } from "@game";

export class CellData extends ASObject {
    static {
        as3.fields(this, { cell: null, range: 0 });
    }

    public cell: MapRoomCell;
    public range: int;

    public $ctor(param1?: MapRoomCell, param2?: int): void {
        super.$ctor();
        this.cell = param1;
        this.range = param2;
    }
}
