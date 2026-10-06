import * as as3 from "as3";
import { ASObject } from "as3";
import { Point } from "flash/geom";

export class SmokeParticle extends ASObject {
    static {
        as3.fields(this, { position: null, speed: NaN, decay: NaN, wind: NaN });
    }

    public position: Point;
    public speed: number;
    public decay: number;
    public wind: number;

    public $ctor(): void {
        super.$ctor();
    }
}
