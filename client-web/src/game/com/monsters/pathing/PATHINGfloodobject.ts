import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";

export class PATHINGfloodobject extends ASObject {
    static {
        as3.fields(this, { pending: 0, depth: null, edge: null, edgeNext: null, minDepth: 9999999, startpoints: null, ignoreWalls: false, lastUsed: 0, ioAsked: 0, ioGen: -1, ioAskedStep: 0, ioDanger: null });
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
    /** Inferno-only (18 October): when a search last asked for this flood (getTimer), so the oldest can be let go. */
    public lastUsed: int;
    /**
     * Inferno-only (21 October): the background thread's flood asked for it (its id; 0: none, or given up waiting:
     * flooded here), on the grid of generation ioGen, at PATHING's step ioAskedStep.
     */
    public ioAsked: int;
    public ioGen: int;
    public ioAskedStep: int;
    /**
     * Inferno-only (21 November): a flood for a monster that keeps out of the defenses' reach when it can (Malphus,
     * IoTargets): the cells inside it (1), each step into one costing IoTargets.DANGER_COST more. Never the worker's.
     */
    public ioDanger: Uint8Array;

    public $ctor(): void {
        this.startpoints = {};
        this.edge = new Vector<int>(0, false, int);
        this.edgeNext = new Vector<int>(0, false, int);
        super.$ctor();
    }
}
