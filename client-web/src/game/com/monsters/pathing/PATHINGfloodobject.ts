import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";

export class PATHINGfloodobject extends ASObject {
    static {
        as3.fields(this, { pending: 0, depth: null, edge: null, edgeNext: null, minDepth: 9999999, startpoints: null, ignoreWalls: false });
    }

    public pending: int;
    /**
     * How far each cell of the 260 x 260 grid is from the target (index x * 260 + y), -1 where the flood
     * has not been yet. (It was an Object of a PATHINGobject per cell, keyed x * 1000 + y: tens of
     * thousands of objects per target, and every step of the flood listed all their keys again; fps pass,
     * 4 October.)
     */
    public depth: Vector<int>;
    /** The flood's edge (cell indexes), and the next one being built (swapped each round). */
    public edge: Vector<int>;
    public edgeNext: Vector<int>;
    public minDepth: int;
    public startpoints: any;
    public ignoreWalls: boolean;

    public $ctor(): void {
        this.startpoints = {};
        this.edge = new Vector<int>(0, false, int);
        this.edgeNext = new Vector<int>(0, false, int);
        super.$ctor();
    }
}
