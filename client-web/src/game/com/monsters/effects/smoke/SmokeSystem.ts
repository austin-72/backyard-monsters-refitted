import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Point } from "flash/geom";

export class SmokeSystem extends ASObject {
    static {
        as3.fields(this, { id: 0, position: null, life: 0, density: 0, basesize: 0, expand: NaN });
    }

    public id: int;
    public position: Point;
    public life: int;
    public density: int;
    public basesize: int;
    public expand: number;

    public $ctor(): void {
        super.$ctor();
    }
}
