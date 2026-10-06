import * as as3 from "as3";
import { ASObject, int } from "as3";

export class Particle extends ASObject {
    static {
        as3.fields(this, { x: NaN, y: NaN, vx: NaN, vy: NaN, life: 0, clock: NaN, next: null });
    }

    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: int;
    public clock: number;
    public next: Particle;

    public $ctor(param1?: number, param2?: number): void {
        super.$ctor();
        this.x = param1;
        this.y = param2;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.clock = Math.random() * Math.PI * 2;
    }
}
