import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Point, Rectangle } from "flash/geom";

/**
 * Inferno-only (Hellgate Defense, IoTd): the arena's maze as a grid of 10-unit cells, and how far each cell is
 * from the way out. The grid covers the arena and its border ring (the openings are free cells in the ring);
 * cells under a wall or a tower are blocked. The distances are walked out from the exit corner (8 ways, never
 * cutting a corner past a blocked cell; a cell beside a blocked one costs a little more, so the monsters keep
 * to the middle of a wide corridor), so any monster anywhere in the maze finds its way out by going downhill.
 *
 * The game's own pathing makes walls only dearer to cross, never impassable (monsters break through walls);
 * in the arena the walls are the maze, so the monsters walk this one instead.
 */
export class IoTdPath extends ASObject {
    static {
        as3.fields(this, { _min: 0, _n: 0, _blocked: null, _dist: null, _entry: 0, _exit: 0, _heap: null, _heapSize: 0, _entries: null, _exits: null });
    }

    public static readonly CELL: int = 10;

    private static readonly FAR: number = 1e9;

    private static readonly DIAGONAL: number = 1.41421356;

    /** Extra cost of a cell next to a blocked one. */
    private static readonly HUG: number = 0.35;
    /** The grid's top left, in grid units, and how many cells along each side. */
    private _min: int;
    private _n: int;
    private _blocked: Vector<int>;
    private _dist: Vector<number>;
    private _entry: int;
    private _exit: int;
    // (the search's heap: cell indexes ordered by distance)
    private _heap: Vector<int>;
    private _heapSize: int;
    /**
     * Hellgate Defense 2 (10 October): its maps have more than one way in (all of them must reach the way out), and
     * on one the Hall stands in the middle: the way out is then every cell around it (IoTd.hallExits).
     */
    private _entries: any[];
    private _exits: any[];

    public $ctor(half?: int, wall?: int, entries: any[] = null, exit: Point = null): void {
        super.$ctor();
        this._min = (-half - wall) | 0;
        this._n = Math.ceil((half + wall) * 2 / IoTdPath.CELL) | 0;
        this._blocked = new Vector<int>(this._n * this._n, true, int);
        this._dist = new Vector<number>(this._n * this._n, true, Number);
        this._heap = new Vector<int>(this._n * this._n * 8, false, int);
        // the openings' corner cells: in at the left corner (low X, high Y), out at the right (high X, low Y)
        this._entry = this.cellAt(this._min + IoTdPath.CELL / 2, -this._min - IoTdPath.CELL / 2);
        this._exit = this.cellAt(-this._min - IoTdPath.CELL / 2, this._min + IoTdPath.CELL / 2);
        this._entries = [this._entry];
        this._exits = [this._exit];
        if (entries && entries.length) {
            this._entries = [];
            for (let e of as3.values(entries)) {
                let c: int = this.cellAt(Number(e[0]), Number(e[1]));
                if (c >= 0) {
                    this._entries.push(c);
                }
            }
            this._entry = this._entries.length ? this._entries[0] | 0 : this._entry;
        }
        if (exit) {
            this._exit = this.cellAt(exit.x, exit.y);
            this._exits = [this._exit];
        }
    }

    /** The way out is every one of these grid points' cells (a Hall in the middle: the cells round it). */
    public setExits(points: any[]): void {
        this._exits = [];
        for (let p of as3.values(points)) {
            let c: int = this.cellAt(Number(p.x), Number(p.y));
            if (c >= 0 && this._exits.indexOf(c) < 0) {
                this._exits.push(c);
            }
        }
        this._exit = this._exits.length ? this._exits[0] | 0 : -1;
    }

    /** The ways in (cells). */
    public get entries(): any[] {
        return this._entries;
    }

    /** The cell of way in number i. */
    public entryOf(i: int): int {
        return this._entries.length ? this._entries[Math.max(0, i) % this._entries.length] | 0 : this._entry;
    }

    /** A cell that is the way out (or one of them). */
    public isExit(cell: int): boolean {
        return cell >= 0 && this._exits.indexOf(cell) >= 0;
    }

    public get size(): int {
        return this._n;
    }

    public get entry(): int {
        return this._entry;
    }

    public get exit(): int {
        return this._exit;
    }

    /** The cell at grid point (x, y), or -1 off the grid. */
    public cellAt(x: number, y: number): int {
        let cx: int = Math.floor((x - this._min) / IoTdPath.CELL) | 0;
        let cy: int = Math.floor((y - this._min) / IoTdPath.CELL) | 0;
        if (cx < 0 || cy < 0 || cx >= this._n || cy >= this._n) {
            return -1;
        }
        return (cx + cy * this._n) | 0;
    }

    /** A cell's middle, in grid units. */
    public middle(cell: int): Point {
        return new Point(this._min + (cell % this._n) * IoTdPath.CELL + IoTdPath.CELL / 2, this._min + ((cell / this._n) | 0) * IoTdPath.CELL + IoTdPath.CELL / 2);
    }

    public clear(): void {
        let i: int = this._blocked.length | 0;
        while (--i >= 0) {
            as3.vset(this._blocked, i, 0);
        }
    }

    /** Blocks the cells a building covers (its top left and size in grid units; a hair's overlap doesn't count). */
    public block(x: number, y: number, w: number, h: number, on: boolean = true): void {
        let x0: int = Math.floor((x + 1 - this._min) / IoTdPath.CELL) | 0;
        let y0: int = Math.floor((y + 1 - this._min) / IoTdPath.CELL) | 0;
        let x1: int = Math.floor((x + w - 1 - this._min) / IoTdPath.CELL) | 0;
        let y1: int = Math.floor((y + h - 1 - this._min) / IoTdPath.CELL) | 0;
        for (let cy: int = Math.max(0, y0) | 0; cy <= Math.min(this._n - 1, y1); cy++) {
            for (let cx: int = Math.max(0, x0) | 0; cx <= Math.min(this._n - 1, x1); cx++) {
                (($v: any, $i: any) => as3.vset($v, $i, (as3.vget($v, $i) + (on ? 1 : -1)) | 0))(this._blocked, cx + cy * this._n);
            }
        }
    }

    public blocked(cell: int): boolean {
        return cell < 0 || as3.vget(this._blocked, cell) > 0;
    }

    /** How far the cell is from the way out (grid units), or a huge number when it has none. */
    public distance(cell: int): number {
        return cell < 0 ? IoTdPath.FAR : as3.vget(this._dist, cell) * IoTdPath.CELL;
    }

    public reaches(cell: int): boolean {
        return cell >= 0 && as3.vget(this._dist, cell) < IoTdPath.FAR;
    }

    /** The maze's length: from the way in to the way out, in grid units (0: there is no way through). With more ways in, the shortest. */
    public get length(): number {
        let best: number = 0;
        for (let e of as3.values(this._entries)) {
            let c: int = e | 0;
            if (!this.reaches(c)) {
                return 0;
            }
            let d: number = as3.vget(this._dist, c) * IoTdPath.CELL;
            if (best == 0 || d < best) {
                best = d;
            }
        }
        return best;
    }

    /** Walks the distances out from the exit. True if the way in reaches it. */
    public solve(): boolean {
        let n: int = this._n;
        let i: int = this._dist.length | 0;
        while (--i >= 0) {
            as3.vset(this._dist, i, IoTdPath.FAR);
        }
        this._heapSize = 0;
        let any: boolean = false;
        for (let x of as3.values(this._exits)) {
            let ex: int = x | 0;
            if (ex < 0 || as3.vget(this._blocked, ex) > 0) {
                continue;
            }
            as3.vset(this._dist, ex, 0);
            this.push(ex);
            any = true;
        }
        if (!any) {
            return false;
        }
        while (this._heapSize > 0) {
            let cell: int = this.pop();
            let cx: int = (cell % n) | 0;
            let cy: int = (cell / n) | 0;
            let here: number = as3.vget(this._dist, cell);
            for (let dy: int = -1; dy <= 1; dy++) {
                for (let dx: int = -1; dx <= 1; dx++) {
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    let nx: int = (cx + dx) | 0;
                    let ny: int = (cy + dy) | 0;
                    if (nx < 0 || ny < 0 || nx >= n || ny >= n) {
                        continue;
                    }
                    let next: int = (nx + ny * n) | 0;
                    if (as3.vget(this._blocked, next) > 0) {
                        continue;
                    }
                    // (no cutting a corner past a blocked cell)
                    if (dx != 0 && dy != 0 && (as3.vget(this._blocked, cx + dx + cy * n) > 0 || as3.vget(this._blocked, cx + (cy + dy) * n) > 0)) {
                        continue;
                    }
                    let step: number = (dx != 0 && dy != 0 ? IoTdPath.DIAGONAL : 1) * (this.hugs(nx, ny) ? 1 + IoTdPath.HUG : 1);
                    if (here + step < as3.vget(this._dist, next)) {
                        as3.vset(this._dist, next, here + step);
                        this.push(next);
                    }
                }
            }
        }
        for (let e of as3.values(this._entries)) {
            if (!this.reaches(e | 0)) {
                return false;
            }
        }
        return true;
    }

    /**
     * The straight line from a to b (grid units) runs through a blocked cell of the grid, a good way in (not a corner
     * grazed): IoTd's check that no monster heads through a wall. Off the grid counts as open.
     */
    public crossesWall(a: Point, b: Point, skip: Rectangle = null): boolean {
        let d: number = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
        let steps: int = Math.ceil(d / 3) | 0;
        let run: int = 0;
        for (let i: int = 1; i < steps; i++) {
            let x: number = a.x + (b.x - a.x) * i / steps;
            let y: number = a.y + (b.y - a.y) * i / steps;
            let c: int = this.cellAt(x, y);
            if (c >= 0 && as3.vget(this._blocked, c) > 0 && !(skip && skip.contains(x, y))) {
                if (++run >= 3) {
                    return true;
                }
            } else {
                run = 0;
            }
        }
        return false;
    }

    /** A blocked cell beside it (or the grid's edge). */
    private hugs(cx: int, cy: int): boolean {
        let n: int = this._n;
        if (cx == 0 || cy == 0 || cx == n - 1 || cy == n - 1) {
            return true;
        }
        return as3.vget(this._blocked, cx - 1 + cy * n) > 0 || as3.vget(this._blocked, cx + 1 + cy * n) > 0 || as3.vget(this._blocked, cx + (cy - 1) * n) > 0 || as3.vget(this._blocked, cx + (cy + 1) * n) > 0;
    }

    /** The nearest cell to this one that has a way out (itself if it has), or -1. */
    public nearestReaching(cell: int, at: Point = null): int {
        if (cell < 0) {
            return -1;
        }
        if (this.reaches(cell)) {
            return cell;
        }
        let n: int = this._n;
        let cx: int = (cell % n) | 0;
        let cy: int = (cell / n) | 0;
        // (a monster standing in a wall, pushed there or come up there: the free cell nearest where it stands, on its
        // own side of the wall. The cell nearest the way out among those round it could be the far side: it walked
        // straight through the wall to it; 11 October)
        if (at) {
            for (let r: int = 1; r < n; r++) {
                let near: int = -1;
                let nearD: number = IoTdPath.FAR;
                for (let y: int = (cy - r) | 0; y <= cy + r; y++) {
                    for (let x: int = (cx - r) | 0; x <= cx + r; x++) {
                        if (x < 0 || y < 0 || x >= n || y >= n || Math.max(Math.abs(x - cx), Math.abs(y - cy)) != r) {
                            continue;
                        }
                        let c: int = (x + y * n) | 0;
                        if (!this.reaches(c)) {
                            continue;
                        }
                        let m: Point = this.middle(c);
                        let d: number = (m.x - at.x) * (m.x - at.x) + (m.y - at.y) * (m.y - at.y);
                        if (d < nearD) {
                            nearD = d;
                            near = c;
                        }
                    }
                }
                if (near >= 0) {
                    return near;
                }
            }
            return -1;
        }
        for (let r: int = 1; r < n; r++) {
            let best: int = -1;
            let bestD: number = IoTdPath.FAR;
            for (let y: int = (cy - r) | 0; y <= cy + r; y++) {
                for (let x: int = (cx - r) | 0; x <= cx + r; x++) {
                    if (x < 0 || y < 0 || x >= n || y >= n || Math.max(Math.abs(x - cx), Math.abs(y - cy)) != r) {
                        continue;
                    }
                    let c: int = (x + y * n) | 0;
                    if (this.reaches(c) && as3.vget(this._dist, c) < bestD) {
                        bestD = as3.vget(this._dist, c);
                        best = c;
                    }
                }
            }
            if (best >= 0) {
                return best;
            }
        }
        return -1;
    }

    /**
     * The way out from a cell, downhill: the turning points (grid units), the exit cell's middle last. Straight
     * runs are one leg each.
     */
    public route(cell: int, at: Point = null): Vector<Point> {
        let out: Vector<Point> = new Vector<Point>(0, false, Point);
        let n: int = this._n;
        cell = this.nearestReaching(cell, at);
        if (cell < 0) {
            return out;
        }
        let path: Vector<int> = new Vector<int>(0, false, int);
        path.push(cell);
        if (at && this.blocked(this.cellAt(at.x, at.y))) {
            out.push(this.middle(cell));
        }
        let guard: int = (n * n) | 0;
        while (!this.isExit(cell) && guard-- > 0) {
            let cx: int = (cell % n) | 0;
            let cy: int = (cell / n) | 0;
            let best: int = -1;
            let bestD: number = as3.vget(this._dist, cell);
            for (let dy: int = -1; dy <= 1; dy++) {
                for (let dx: int = -1; dx <= 1; dx++) {
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    let nx: int = (cx + dx) | 0;
                    let ny: int = (cy + dy) | 0;
                    if (nx < 0 || ny < 0 || nx >= n || ny >= n) {
                        continue;
                    }
                    let next: int = (nx + ny * n) | 0;
                    if (as3.vget(this._blocked, next) > 0 || as3.vget(this._dist, next) >= bestD) {
                        continue;
                    }
                    if (dx != 0 && dy != 0 && (as3.vget(this._blocked, cx + dx + cy * n) > 0 || as3.vget(this._blocked, cx + (cy + dy) * n) > 0)) {
                        continue;
                    }
                    bestD = as3.vget(this._dist, next);
                    best = next;
                }
            }
            if (best < 0) {
                break;
            }
            cell = best;
            path.push(cell);
        }
        // straight runs become one leg
        let lastDx: int = 99;
        let lastDy: int = 99;
        for (let i: int = 1; i < path.length; i++) {
            let ddx: int = (as3.vget(path, i) % n - as3.vget(path, i - 1) % n) | 0;
            let ddy: int = (((as3.vget(path, i) / n) | 0) - ((as3.vget(path, i - 1) / n) | 0)) | 0;
            if (ddx != lastDx || ddy != lastDy) {
                if (i > 1) {
                    out.push(this.middle(as3.vget(path, i - 1)));
                }
                lastDx = ddx;
                lastDy = ddy;
            }
        }
        out.push(this.middle(as3.vget(path, path.length - 1)));
        return out;
    }

    // ---- the heap
    private push(cell: int): void {
        if (this._heapSize >= this._heap.length) {
            as3.vsetLength(this._heap, (this._heap.length * 2) >>> 0);
        }
        let i: int = (this._heapSize++) | 0;
        as3.vset(this._heap, i, cell);
        let d: number = as3.vget(this._dist, cell);
        while (i > 0) {
            let parent: int = (i - 1) >> 1;
            if (as3.vget(this._dist, as3.vget(this._heap, parent)) <= d) {
                break;
            }
            as3.vset(this._heap, i, as3.vget(this._heap, parent));
            as3.vset(this._heap, parent, cell);
            i = parent;
        }
    }

    private pop(): int {
        let top: int = as3.vget(this._heap, 0);
        let last: int = as3.vget(this._heap, --this._heapSize);
        if (this._heapSize > 0) {
            let i: int = 0;
            let d: number = as3.vget(this._dist, last);
            as3.vset(this._heap, 0, last);
            while (true) {
                let l: int = (i * 2 + 1) | 0;
                let r: int = (l + 1) | 0;
                let m: int = i;
                if (l < this._heapSize && as3.vget(this._dist, as3.vget(this._heap, l)) < as3.vget(this._dist, as3.vget(this._heap, m))) {
                    m = l;
                }
                if (r < this._heapSize && as3.vget(this._dist, as3.vget(this._heap, r)) < as3.vget(this._dist, as3.vget(this._heap, m))) {
                    m = r;
                }
                if (m == i) {
                    break;
                }
                as3.vset(this._heap, i, as3.vget(this._heap, m));
                as3.vset(this._heap, m, last);
                i = m;
            }
        }
        return top;
    }
}
