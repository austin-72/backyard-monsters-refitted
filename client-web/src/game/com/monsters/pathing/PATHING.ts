import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BitmapData, DisplayObject } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BFOUNDATION, BMUSHROOM, GLOBAL, GRID, InstanceManager, PATHINGfloodobject, PATHINGobject } from "@game";

export class PATHING extends ASObject {
    private static _poolPathing: Vector<PATHINGobject>;

    private static _poolPathingB: Vector<PATHINGobject>;

    private static _poolPathingLength: int;

    public static floodDisplay: DisplayObject;

    public static floodBMD: BitmapData;

    public static costDisplay: DisplayObject;

    public static costBMD: BitmapData;

    public static pathmc: DisplayObject;

    private static PI: number; // const

    private static c180PI: number; // const

    private static cPI180: number; // const

    private static _gridWidth: int;

    private static _gridHeight: int;

    private static _floods: any;

    private static _costs: any;

    private static _framenumber: int;

    private static _clicked: boolean;

    private static _resetRequested: boolean;

    private static _dirtyMinX: int;

    private static _dirtyMinY: int;

    private static _dirtyMaxX: int;

    private static _dirtyMaxY: int;

    // ---- fps pass (4 October) -------------------------------------------------------------------------
    // The floods are kept in flat lists (PATHINGfloodobject.depth / edge, cell index x * 260 + y) and the
    // cells' costs in _costGrid, a copy of _costs[].cost kept by Cost() and Tick(): one flood step used to
    // make an object for every cell it reached and list every key of its edge again. And every pending
    // flood was given at least 15 ms of every simulation step (two a frame), so a battle with ten new
    // targets spent 300 ms a frame finding paths. Now all of them share FLOOD_BUDGET_MS a step, in turn.
    /** Milliseconds of each simulation step the floods may use between them. */
    private static FLOOD_BUDGET_MS: int; // const

    private static _costGrid: Vector<int>;

    /** The flood to start with next step (so that with many, each gets its turn). */
    private static _floodTurn: int;

    private static _pendingList: Vector<PATHINGfloodobject>;

    static {
        as3.lazyStatics(this, { _poolPathing: null, _poolPathingB: null, _poolPathingLength: 0, floodDisplay: null, floodBMD: null, costDisplay: null, costBMD: null, pathmc: null, PI: NaN, c180PI: NaN, cPI180: NaN, _gridWidth: 0, _gridHeight: 0, _floods: null, _costs: null, _framenumber: 0, _clicked: false, _resetRequested: false, _dirtyMinX: 0, _dirtyMinY: 0, _dirtyMaxX: 0, _dirtyMaxY: 0, FLOOD_BUDGET_MS: 0, _costGrid: null, _floodTurn: 0, _pendingList: null }, () => {
            PATHING.PI = Math.PI;
            PATHING.c180PI = 180 / PATHING.PI;
            PATHING.cPI180 = PATHING.PI / 180;
            PATHING._gridWidth = 260;
            PATHING._gridHeight = 260;
            PATHING._floods = {};
            PATHING._costs = {};
            PATHING._framenumber = 0;
            PATHING._clicked = false;
            PATHING._resetRequested = false;
            PATHING._dirtyMinX = int.MAX_VALUE;
            PATHING._dirtyMinY = int.MAX_VALUE;
            PATHING._dirtyMaxX = int.MIN_VALUE;
            PATHING._dirtyMaxY = int.MIN_VALUE;
            PATHING.FLOOD_BUDGET_MS = 5;
            PATHING._floodTurn = 0;
            PATHING._pendingList = new Vector<PATHINGfloodobject>(0, false, PATHINGfloodobject);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Empties the dirty region: the bounding box of cells Cost() has raised above the base
     * cost of 10. Tracking it lets Tick() reset just those cells rather than all
     * _gridWidth * _gridHeight of them on every ResetCosts.
     *
     * Cost() is the only writer of PATHINGobject.cost, and the box only grows around cells it
     * actually wrote, so it cannot under cover and strand a raised cost. Empty is min > max,
     * which makes the reset loops skip themselves.
     */
    private static ClearDirtyRegion(): void {
        PATHING._dirtyMinX = int.MAX_VALUE;
        PATHING._dirtyMinY = int.MAX_VALUE;
        PATHING._dirtyMaxX = int.MIN_VALUE;
        PATHING._dirtyMaxY = int.MIN_VALUE;
    }

    public static Setup(): void {
        PATHING.ClearDirtyRegion();
        for (let widthIdx: int = 0; widthIdx < PATHING._gridWidth; widthIdx++) {
            for (let heightIdx: int = 0; heightIdx < PATHING._gridHeight; heightIdx++) {
                let gridKey: int = (widthIdx * 1000 + heightIdx) | 0;
                let gridSpace: PATHINGobject = new PATHINGobject();
                gridSpace.pointX = widthIdx;
                gridSpace.pointY = heightIdx;
                gridSpace.cost = 10;
                PATHING._costs[gridKey] = gridSpace;
            }
        }
        PATHING._costGrid = new Vector<int>(PATHING._gridWidth * PATHING._gridHeight, false, int);
        for (let c: int = 0; c < PATHING._costGrid.length; c++) {
            as3.vset(PATHING._costGrid, c, 10);
        }
        PATHING._poolPathing = new Vector<PATHINGobject>(0, false, PATHINGobject);
        PATHING._poolPathingB = new Vector<PATHINGobject>(0, false, PATHINGobject);
        PATHING._poolPathingLength = 0;
    }

    public static Cost(buildingPoint: Point, buildingRegion: Rectangle, regionCost: int): Rectangle {
        let convertPoint: Point = PATHING.FromISO(buildingPoint);
        convertPoint.x += buildingRegion.x;
        convertPoint.y += buildingRegion.y;
        let gridPoint: Point = PATHING.GlobalLocal(convertPoint);
        let gridRegion: Rectangle = new Rectangle(gridPoint.x, gridPoint.y, buildingRegion.width * 0.1, buildingRegion.height * 0.1);
        for (let xIdx: int = gridRegion.x | 0; xIdx < gridRegion.x + gridRegion.width; xIdx++) {
            for (let yIdx: int = gridRegion.y | 0; yIdx < gridRegion.y + gridRegion.height; yIdx++) {
                let gridKey: int = (xIdx * 1000 + yIdx) | 0;
                if (PATHING._costs[gridKey]) {
                    PATHING._costs[gridKey].cost += regionCost;
                    if (PATHING._costs[gridKey].cost < 2) {
                        PATHING._costs[gridKey].cost = 2;
                    }
                    if (PATHING._costGrid) {
                        as3.vset(PATHING._costGrid, xIdx * PATHING._gridHeight + yIdx, PATHING._costs[gridKey].cost | 0);
                    }

                    if (xIdx < PATHING._dirtyMinX) {
                        PATHING._dirtyMinX = xIdx;
                    }
                    if (xIdx > PATHING._dirtyMaxX) {
                        PATHING._dirtyMaxX = xIdx;
                    }
                    if (yIdx < PATHING._dirtyMinY) {
                        PATHING._dirtyMinY = yIdx;
                    }
                    if (yIdx > PATHING._dirtyMaxY) {
                        PATHING._dirtyMaxY = yIdx;
                    }
                }
            }
        }
        return gridRegion;
    }

    public static RegisterBuilding(region: Rectangle, building: BFOUNDATION, register: boolean): void {
        let gridEndPoint: Point = PATHING.GlobalLocal(PATHING.FromISO(new Point(region.x, region.y)));
        region.width *= 0.1;
        region.height *= 0.1;
        for (let xIdx: int = gridEndPoint.x | 0; xIdx < gridEndPoint.x + region.width; xIdx++) {
            for (let yIdx: int = gridEndPoint.y | 0; yIdx < gridEndPoint.y + region.height; yIdx++) {
                let gridKey: int = (xIdx * 1000 + yIdx) | 0;
                if (PATHING._costs[gridKey]) {
                    if (register) {
                        PATHING._costs[gridKey].building = building;
                    } else {
                        delete PATHING._costs[gridKey].building;
                    }
                }
            }
        }
    }

    public static Tick(): void {
        if (PATHING._resetRequested) {
            PATHING._resetRequested = false;
            PATHING.Clear();
            let resetMinX: int = PATHING._dirtyMinX;
            let resetMinY: int = PATHING._dirtyMinY;
            let resetMaxX: int = PATHING._dirtyMaxX;
            let resetMaxY: int = PATHING._dirtyMaxY;
            PATHING.ClearDirtyRegion();

            for (let widthIdx: int = resetMinX; widthIdx <= resetMaxX; widthIdx++) {
                for (let heightIdx: int = resetMinY; heightIdx <= resetMaxY; heightIdx++) {
                    PATHING._costs[widthIdx * 1000 + heightIdx].cost = 10;
                    if (PATHING._costGrid) {
                        as3.vset(PATHING._costGrid, widthIdx * PATHING._gridHeight + heightIdx, 10);
                    }
                }
            }
            let allBuildings: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
            let buildingPoint: Point = new Point(0, 0);
            for (let building of (allBuildings ?? [])) {
                if (Boolean(building._gridCost) && (building.health > 0 || building instanceof BMUSHROOM)) {
                    for (let regionCostArray of as3.values(building._gridCost)) {
                        buildingPoint.x = building.x;
                        buildingPoint.y = building.y;
                        PATHING.Cost(buildingPoint, as3.cast(regionCostArray[0], Rectangle), regionCostArray[1] | 0);
                    }
                }
            }
        }
        PATHING.ProcessFlood();
    }

    public static GetPath(startPoint: Point, targetRect: Rectangle, callback: Function = null, ignoreWalls: boolean = false, targetBuilding: BFOUNDATION = null): any[] {
        let originalStart: Point = startPoint;
        let originalTarget: Point = new Point(targetRect.x, targetRect.y);
        startPoint.x = startPoint.x | 0;
        startPoint.y = startPoint.y | 0;
        let gridStart: Point = PATHING.GlobalLocal(PATHING.FromISO(startPoint));
        targetRect.x = targetRect.x | 0;
        targetRect.y = targetRect.y | 0;
        let gridTargetPoint: Point = PATHING.GlobalLocal(PATHING.FromISO(new Point(targetRect.x, targetRect.y)));
        let gridTargetRect: Rectangle = targetRect;
        gridTargetRect.x = gridTargetPoint.x;
        gridTargetRect.y = gridTargetPoint.y;
        gridTargetRect.width *= 0.1;
        gridTargetRect.height *= 0.1;
        PATHING.GetPathB(gridStart, gridTargetRect, originalStart, originalTarget, callback, ignoreWalls, targetBuilding);
        return [];
    }

    public static GetPathB(gridStart: Point, gridTargetRect: Rectangle, originalStart: Point, originalTarget: Point, callback: Function = null, ignoreWalls: boolean = false, targetBuilding: BFOUNDATION = null): void {
        PATHING.RenderCosts();
        let gridKeyStart: int = (gridStart.x * 1000 + gridStart.y) | 0;
        let gridKeyTarget: int = (gridTargetRect.x * 1000 + gridTargetRect.y) | 0;
        if (!PATHING._costs[gridKeyStart] && !PATHING._costs[gridKeyTarget]) {
            callback([originalStart, originalTarget], targetBuilding);
            PATHING.RenderPath([originalStart, originalTarget]);
            return;
        }
        if (!PATHING._costs[gridKeyStart]) {
            // Starting point is out of bounds, nudge it towards the target to move it in bounds.
            // Step one cell at a time instead of 5, the path is built from wherever this lands and the monster
            // walks to it in a straight line with no wall checks, so overshooting the boundary
            // lets it cut through anything in between.
            let angle: number = 90 - Math.atan2(gridTargetRect.y - gridStart.y, gridTargetRect.x - gridStart.x) * 57.2957795;
            let moveX: number = Math.sin(angle * 0.0174532925);
            let moveY: number = Math.cos(angle * 0.0174532925);
            let attempts: int = 0;
            while (!PATHING._costs[gridKeyStart] && attempts < 2000) {
                attempts += 1;
                gridStart.x += moveX;
                gridStart.y += moveY;
                gridKeyStart = ((gridStart.x | 0) * 1000 + (gridStart.y | 0)) | 0;
            }
            gridStart.x = gridStart.x | 0;
            gridStart.y = gridStart.y | 0;
        }
        if (!PATHING._costs[gridKeyTarget]) {
            callback([originalStart, originalTarget], targetBuilding);
            PATHING.RenderPath([originalStart, originalTarget]);
            return;
        }
        if (ignoreWalls) {
            // Separate floods that calculate walls differently
            gridKeyTarget += 1000000;
        }
        // Does no other monster have this target position?
        if (!PATHING._floods[gridKeyTarget]) {
            let newFlood: PATHINGfloodobject = new PATHINGfloodobject();
            let cells: int = (PATHING._gridWidth * PATHING._gridHeight) | 0;
            newFlood.depth = new Vector<int>(cells, false, int);
            for (let c: int = 0; c < cells; c++) {
                as3.vset(newFlood.depth, c, -1);
            }
            // the target's cells, at depth 0 (inside the grid)
            for (let widthIdx: int = 0; widthIdx < gridTargetRect.width; widthIdx++) {
                for (let heightIdx: int = 0; heightIdx < gridTargetRect.height; heightIdx++) {
                    let tx: int = (gridTargetRect.x + widthIdx) | 0;
                    let ty: int = (gridTargetRect.y + heightIdx) | 0;
                    if (tx < 0 || ty < 0 || tx >= PATHING._gridWidth || ty >= PATHING._gridHeight) {
                        continue;
                    }
                    let ti: int = (tx * PATHING._gridHeight + ty) | 0;
                    if (as3.vget(newFlood.depth, ti) < 0) {
                        as3.vset(newFlood.depth, ti, 0);
                        newFlood.edge.push(ti);
                    }
                }
            }
            newFlood.ignoreWalls = ignoreWalls;
            PATHING._floods[gridKeyTarget] = newFlood;
        }
        // Does no other monster have this starting position?
        if (!PATHING._floods[gridKeyTarget].startpoints[gridKeyStart]) {
            PATHING._floods[gridKeyTarget].startpoints[gridKeyStart] = { "startID": gridKeyStart, "callbackfunctions": [], "startPoint": gridStart };
        }
        // Prevent duplicate callback registration
        let callbacks: any[] = as3.cast(PATHING._floods[gridKeyTarget].startpoints[gridKeyStart].callbackfunctions, Array);
        let alreadyAdded: boolean = false;
        for (let idx: int = 0; idx < callbacks.length; idx++) {
            if (callbacks[idx][0] === callback) {
                alreadyAdded = true;
                break;
            }
        }
        if (!alreadyAdded) {
            callbacks.push([callback, ignoreWalls, targetBuilding, originalTarget]);
            PATHING._floods[gridKeyTarget].pending += 1;
        }
    }

    /**
     * Floods towards each target that monsters are waiting on (one flood per target cell, shared by every
     * monster going there) until it reaches where they stand; then each gets its path (Path).
     * All the pending floods share FLOOD_BUDGET_MS of each simulation step, at least 1 ms each, taking
     * turns when there are many (fps pass, 4 October: each used to get at least 15 ms of every step).
     */
    private static ProcessFlood(param1: Event = null): void {
        let currentFloodObject: PATHINGfloodobject = null;
        let list: Vector<PATHINGfloodobject> = PATHING._pendingList;
        let count: int = 0;
        let stepStart: int = getTimer();
        let slice: number = 0;
        let i: int = 0;
        let k: int = 0;
        let sliceStart: int = 0;
        as3.vsetLength(list, 0);
        for (currentFloodObject of as3.values(PATHING._floods)) {
            if (currentFloodObject.pending > 0) {
                list.push(currentFloodObject);
            }
        }
        count = list.length | 0;
        if (count == 0) {
            return;
        }
        // the step's budget shared out, each flood at least 1 ms; the one after the last served goes first
        slice = Math.max(1, PATHING.FLOOD_BUDGET_MS / count);
        PATHING._floodTurn = (PATHING._floodTurn % count) | 0;
        k = 0;
        while (k < count) {
            if (getTimer() - stepStart >= PATHING.FLOOD_BUDGET_MS && k > 0) {
                break;
            }
            i = ((PATHING._floodTurn + k) % count) | 0;
            currentFloodObject = as3.vget(list, i);
            sliceStart = getTimer();
            do {
                if (!PATHING.ExpandFlood(currentFloodObject)) {
                    // nothing left to reach: whatever still waits can never be reached; it goes straight there
                    PATHING.CheckStartReached(currentFloodObject);
                    PATHING.GiveUp(currentFloodObject);
                    break;
                }
                PATHING.CheckStartReached(currentFloodObject);
            } while (currentFloodObject.pending > 0 && getTimer() - sliceStart < slice);
            k++;
        }
        PATHING._floodTurn = ((PATHING._floodTurn + k) % Math.max(1, count)) | 0;
    }

    /**
     * One round of the flood (as before): every cell of the edge at the lowest depth so far reaches its 8
     * neighbours not yet flooded (diagonals cost 1.5 times as much); the others wait on the edge.
     * False when the edge is empty (the whole grid is flooded).
     */
    private static ExpandFlood(f: PATHINGfloodobject): boolean {
        let edge: Vector<int> = f.edge;
        let next: Vector<int> = f.edgeNext;
        let depth: Vector<int> = f.depth;
        let costs: Vector<int> = PATHING._costGrid;
        let n: int = edge.length | 0;
        let minDepth: int = 9999999;
        let limit: int = f.minDepth;
        let gw: int = PATHING._gridWidth;
        let gh: int = PATHING._gridHeight;
        let i: int = 0;
        let idx: int = 0;
        let d: int = 0;
        let cx: int = 0;
        let cy: int = 0;
        let nx: int = 0;
        let ny: int = 0;
        let ni: int = 0;
        let cost: int = 0;
        let nd: int = 0;
        let cell: any = null;
        if (n == 0) {
            return false;
        }
        as3.vsetLength(next, 0);
        while (i < n) {
            idx = as3.vget(edge, i++);
            d = as3.vget(depth, idx);
            if (d <= limit) {
                cx = (idx / gh) | 0;
                cy = (idx - cx * gh) | 0;
                nx = (cx - 1) | 0;
                while (nx <= cx + 1) {
                    if (nx >= 0 && nx < gw) {
                        ny = (cy - 1) | 0;
                        while (ny <= cy + 1) {
                            if (ny >= 0 && ny < gh && !(nx == cx && ny == cy)) {
                                ni = (nx * gh + ny) | 0;
                                if (as3.vget(depth, ni) < 0) {
                                    cost = as3.vget(costs, ni);
                                    if (f.ignoreWalls) {
                                        cell = PATHING._costs[nx * 1000 + ny];
                                        if (Boolean(cell) && Boolean(cell.building)) {
                                            cost = 20;
                                        }
                                    }
                                    if (nx != cx && ny != cy) {
                                        cost = (cost * 1.5) | 0;
                                    }
                                    nd = (d + cost) | 0;
                                    as3.vset(depth, ni, nd);
                                    next.push(ni);
                                    if (nd < minDepth) {
                                        minDepth = nd;
                                    }
                                }
                            }
                            ny++;
                        }
                    }
                    nx++;
                }
            } else {
                next.push(idx);
                if (d < minDepth) {
                    minDepth = d;
                }
            }
        }
        f.edgeNext = edge;
        f.edge = next;
        f.minDepth = minDepth;
        return true;
    }

    /** A flood with nothing left to reach and callers still waiting: they go straight to the target. */
    private static GiveUp(floodFill: PATHINGfloodobject): void {
        let pathingStart: any = null;
        let callback: any[] = null;
        let waiting: any[] = [];
        for (pathingStart of as3.values(floodFill.startpoints)) {
            if (pathingStart) {
                waiting.push(pathingStart);
            }
        }
        for (pathingStart of as3.values(waiting)) {
            for (callback of as3.values(pathingStart.callbackfunctions)) {
                --floodFill.pending;
                callback[0](callback[3] ? [PATHING.ToISO(PATHING.LocalGlobal(new Point(pathingStart.startPoint.x, pathingStart.startPoint.y)), 0), callback[3]] : [], callback[2]);
            }
            pathingStart.callbackfunctions = [];
            delete floodFill.startpoints[pathingStart.startID];
        }
        floodFill.pending = 0;
    }

    private static CheckStartReached(floodFill: PATHINGfloodobject): int {
        let pathingStart: any = null;
        let callback: any[] = null;
        let found: int = 0;
        let reached: any[] = null;
        for (pathingStart of as3.values(floodFill.startpoints)) {
            if (Boolean(pathingStart) && PATHING.depthAt(floodFill, pathingStart.startID | 0) >= 0) {
                (reached = reached || []).push(pathingStart);
            }
        }
        for (pathingStart of as3.values(reached)) {
            for (callback of as3.values(pathingStart.callbackfunctions)) {
                PATHING.Path(floodFill, pathingStart.startID | 0, callback[0], Boolean(callback[1]), as3.cast(callback[2], BFOUNDATION), as3.cast(callback[3], Point));
                --floodFill.pending;
                found += 1;
            }
            pathingStart.callbackfunctions = [];
            delete floodFill.startpoints[pathingStart.startID];
        }
        return found;
    }

    /** Depth of the flood at a grid key (x * 1000 + y), -1 outside it. */
    private static depthAt(f: PATHINGfloodobject, gridKey: int): int {
        let x: int = (gridKey / 1000) | 0;
        let y: int = (gridKey - x * 1000) | 0;
        if (x < 0 || y < 0 || x >= PATHING._gridWidth || y >= PATHING._gridHeight) {
            return -1;
        }
        return as3.vget(f.depth, x * PATHING._gridHeight + y);
    }

    public static Path(flood: PATHINGfloodobject, startId: int, callback: Function, ignoreWalls: boolean = false, targetBuilding: BFOUNDATION = null, originalTarget: Point = null): void {
        let startX: int = 0;
        let startY: int = 0;
        let gridPoint: Point = new Point(0, 0);
        let currentDepth: int = 0;
        let currentX: int = 0;
        let currentY: int = 0;
        let foundLowerDepth: boolean = false;
        let buildPath: boolean = false;
        let path: any[] = [];
        let nd: int = 0;
        if (PATHING.depthAt(flood, startId) >= 0) {
            startX = (startId / 1000) | 0;
            startY = (startId - startX * 1000) | 0;
            currentDepth = PATHING.depthAt(flood, startId);
            path.push(PATHING.ToISO(PATHING.LocalGlobal(new Point(startX, startY)), 0));
            buildPath = true;
        }
        while (buildPath) {
            buildPath = false;
            for (let offsetX: int = -1; offsetX < 2; offsetX++) {
                for (let offsetY: int = -1; offsetY < 2; offsetY++) {
                    if (offsetX == 0 && offsetY == 0) {
                        continue;
                    }

                    gridPoint.x = startX + offsetX;
                    gridPoint.y = startY + offsetY;
                    let gridKey: int = (gridPoint.x * 1000 + gridPoint.y) | 0;
                    nd = PATHING.depthAt(flood, gridKey);
                    if (nd >= 0 && nd < currentDepth && nd > 0) {
                        currentX = gridPoint.x | 0;
                        currentY = gridPoint.y | 0;
                        foundLowerDepth = true;
                        currentDepth = nd;
                        buildPath = true;
                        if (!ignoreWalls && path.length > 1 && PATHING._costs[gridKey]) {
                            let wall: BFOUNDATION = as3.cast(PATHING._costs[gridKey].building, BFOUNDATION);
                            if (wall && wall.health > 0) {
                                callback(path, wall);
                                PATHING.RenderPath(path);
                                return;
                            }
                        }
                        if (!ignoreWalls && currentDepth < 20) {
                            if (Math.random() < 0.6) {
                                let nearbyGridSpaces: any[] = new Array();
                                for (let nearbyOffsetX: int = -3; nearbyOffsetX < 4; nearbyOffsetX++) {
                                    for (let nearbyOffsetY: int = -3; nearbyOffsetY < 4; nearbyOffsetY++) {
                                        // Monsters scatter towards diagonal positions
                                        if (nearbyOffsetX == 0 || nearbyOffsetY == 0) {
                                            continue;
                                        }

                                        let nearbyGridKey: int = ((currentX + nearbyOffsetX) * 1000 + currentY + nearbyOffsetY) | 0;
                                        nd = PATHING.depthAt(flood, nearbyGridKey);
                                        if (nd >= 0 && nd < 20 && nd > 0) {
                                            nearbyGridSpaces.push(new Point(currentX + nearbyOffsetX, currentY + nearbyOffsetY));
                                        }
                                    }
                                }
                                if (nearbyGridSpaces.length > 0) {
                                    let randIdx: int = (Math.random() * nearbyGridSpaces.length) | 0;
                                    currentX = nearbyGridSpaces[randIdx].x | 0;
                                    currentY = nearbyGridSpaces[randIdx].y | 0;
                                }
                            }
                        }
                    }
                }
            }
            if (foundLowerDepth) {
                startX = currentX;
                startY = currentY;
                path.push(PATHING.ToISO(PATHING.LocalGlobal(PATHING.Jiggle(currentX, currentY)), 0));
            }
        }
        if (originalTarget) {
            gridPoint = PATHING.GlobalLocal(PATHING.FromISO(originalTarget));
            if (!targetBuilding || !PATHING._costs[gridPoint.x * 1000 + gridPoint.y]) {
                path.push(originalTarget);
            }
        }
        PATHING.RenderFlood();
        PATHING.RenderPath(path);
        callback(path, targetBuilding);
    }

    private static Jiggle(x: int, y: int): Point {
        return new Point(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.4);
    }

    public static GetBuildingFromISO(isoPoint: Point): BFOUNDATION {
        let gridPoint: Point = PATHING.GlobalLocal(PATHING.FromISO(isoPoint));
        let gridKey: int = (1000 * gridPoint.x + gridPoint.y) | 0;
        if (PATHING._costs[gridKey]) {
            return as3.cast(PATHING._costs[gridKey].building, BFOUNDATION);
        }
        return null;
    }

    /*
     * Clears all existing flood fill pathfinding data and invokes any collected callback functions.
     *
     * Purpose:
     * _______________________________________________________________
     *
     * - The `Clear` function is responsible for resetting the flood fill objects stored in the `_floods` collection.
     * - It collects any callback functions that were registered for flood fill pathfinding tasks.
     * - These callback functions are then invoked with an empty path and `null` as the building parameter, indicating a reset or cancellation.
     *
     * Steps:
     * _______________________________________________________________
     *
     * 1. Iterates through each flood fill object in the `_floods` collection.
     *
     * 2. For each flood fill object, it goes through its `startpoints` to gather any associated callback functions.
     *
     * 3. Collects all the callback functions into an array (`collectedCallbacks`).
     *
     * 4. Clears the `_floods` collection to remove all existing flood fill data.
     *
     * 5. Invokes each collected callback function with an empty path (`[]`), `null` for the building parameter,
     *    and a `true` flag to indicate the process has been cleared or cancelled.
     *
     * Note:
     * - This function is typically called when a reset or cleanup of flood fill pathfinding data is needed
     */
    public static Clear(): void {
        let floodObject: PATHINGfloodobject = null;
        let startPoint: any = null;
        let collectedCallbacks: any[] = [];

        // Iterate over each flood fill object in the _floods object
        for (floodObject of as3.values(PATHING._floods)) {
            // Iterate over the start points in the flood fill object
            for (startPoint of as3.values(floodObject.startpoints)) {
                // Check if there are callback functions associated with the start point
                if (startPoint.callbackfunctions) {
                    let callbackFunctions: any[] = as3.cast(startPoint.callbackfunctions, Array);
                    // Add each callback function to the collectedCallbacks array
                    for (let functionIndex: int = 0; functionIndex < callbackFunctions.length; functionIndex++) {
                        collectedCallbacks.push(callbackFunctions[functionIndex][0]);
                    }
                }
            }
        }
        PATHING._floods = {};

        // Invoke each callback function with an empty path and null as the building parameter
        for (let callbackIndex: int = 0; callbackIndex < collectedCallbacks.length; callbackIndex++) {
            collectedCallbacks[callbackIndex]([], null, true);
        }
    }

    public static Cleanup(): void {
        let gridSpace: any = undefined;
        for (gridSpace of as3.values(PATHING._costs)) {
            delete PATHING._costs[gridSpace];
        }
        PATHING._costs = {};
        PATHING._floods = {};
        PATHING.ClearDirtyRegion();
    }

    public static LineOfSight(startX: int, startY: int, targetX: int, targetY: int, targetBuilding: BFOUNDATION = null, includeAllBuildings: boolean = false): boolean {
        let gridStart: Point = PATHING.GlobalLocal(PATHING.FromISO(new Point(startX, startY)));
        let gridTarget: Point = PATHING.GlobalLocal(PATHING.FromISO(new Point(targetX, targetY)));
        let difX: number = gridTarget.x - gridStart.x;
        let difY: number = gridTarget.y - gridStart.y;
        let angle: number = Math.atan2(difY, difX) * PATHING.c180PI;
        let totalDistance: number = Math.sqrt(difX * difX + difY * difY);
        for (let currentDistance: int = 0; currentDistance < totalDistance; currentDistance++) {
            let gridX: int = (gridStart.x + Math.cos(angle * PATHING.cPI180) * currentDistance) | 0;
            let gridY: int = (gridStart.y + Math.sin(angle * PATHING.cPI180) * currentDistance) | 0;
            let gridKey: int = (gridX * 1000 + gridY) | 0;
            if (!PATHING._costs[gridKey]) {
                return true;
            }
            let wall: BFOUNDATION = as3.cast(PATHING._costs[gridKey].building, BFOUNDATION);
            if (Boolean(wall) && wall.health > 0) {
                if (!(Boolean(targetBuilding) && wall == targetBuilding)) {
                    if (wall._type == 17 || includeAllBuildings) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public static ResetCosts(): void {
        PATHING._resetRequested = true;
    }

    public static Wander(param1: Point, param2: int = 50, param3: Function = null): void {
        let _loc7_: Point = null;
        param1.x = param1.x | 0;
        param1.y = param1.y | 0;
        let _loc4_: any[] = [];
        let _loc5_: int = (0 - param2) | 0;
        while (_loc5_ < param2) {
            if (!GRID.Blocked(param1.add(new Point(_loc5_, 0 - param2)))) {
                _loc4_.push(param1.add(new Point(_loc5_, 0 - param2)));
            }
            if (!GRID.Blocked(param1.add(new Point(_loc5_, param2)))) {
                _loc4_.push(param1.add(new Point(_loc5_, param2)));
            }
            if (!GRID.Blocked(param1.add(new Point(0 - param2, _loc5_)))) {
                _loc4_.push(param1.add(new Point(0 - param2, _loc5_)));
            }
            if (!GRID.Blocked(param1.add(new Point(param2, _loc5_)))) {
                _loc4_.push(param1.add(new Point(param2, _loc5_)));
            }
            _loc5_ += 10;
        }
        let _loc6_: Point = param1;
        if (_loc4_.length > 0) {
            _loc7_ = as3.cast(_loc4_[(Math.random() * _loc4_.length) | 0], Point);
            PATHING.GetPath(param1, new Rectangle(_loc7_.x, _loc7_.y, 10, 10), param3);
        }
    }

    public static RenderFlood(): void {
        if (GLOBAL._catchup) {
        }
    }

    public static RenderCosts(): void {
    }

    public static RenderPath(param1: any[], param2: boolean = false): void {
    }

    public static getNumberAsHexString(param1: uint, param2: uint = 1, param3: boolean = true): string {
        let _loc4_: string = as3.str(param1.toString(16).toUpperCase());
        while (param2 > _loc4_.length) {
            _loc4_ = "0" + _loc4_;
        }
        if (param3) {
            _loc4_ = "0x" + _loc4_;
        }
        return _loc4_;
    }

    private static GlobalLocal(toGridPoint: Point): Point {
        toGridPoint.x *= 0.1;
        toGridPoint.y *= 0.1;
        toGridPoint.x += PATHING._gridWidth >> 1;
        toGridPoint.y += PATHING._gridHeight >> 1;
        toGridPoint.x = toGridPoint.x | 0;
        toGridPoint.y = toGridPoint.y | 0;
        return toGridPoint;
    }

    public static LocalGlobal(toCartPoint: Point): Point {
        toCartPoint.x -= PATHING._gridWidth >> 1;
        toCartPoint.y -= PATHING._gridHeight >> 1;
        toCartPoint.x *= 10;
        toCartPoint.y *= 10;
        return toCartPoint;
    }

    public static ToISO(cartPoint: Point, offset: int): Point {
        let isoY: int = ((cartPoint.x + cartPoint.y) * 0.5 - offset) | 0;
        let isoX: int = (cartPoint.x - cartPoint.y) | 0;
        return new Point(isoX, isoY);
    }

    public static FromISO(isoPoint: Point): Point {
        let cartY: int = (isoPoint.y - isoPoint.x * 0.5) | 0;
        let cartX: int = (isoPoint.x * 0.5 + isoPoint.y) | 0;
        return new Point(cartX, cartY);
    }

    public static PlotRandom(param1: MouseEvent): void {
        let Done: Function = null;
        let e: MouseEvent = param1;
        Done = (param1: any[]): void => {
        };
        let p: Point = PATHING.ToISO(new Point(260, 260), 0);
        PATHING.GetPath(PATHING.ToISO(new Point(-2000, -2000), 0), new Rectangle(p.x, p.y, 10, 10), Done);
    }
}
