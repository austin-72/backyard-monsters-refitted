import * as as3 from "as3";
import { int } from "as3";
import { Point, Rectangle } from "flash/geom";
import { BRESOURCE, BSTORAGE, BuildingItem } from "@game";
import { planEstimateHere, planWorkerStats } from "flash/_planPaths";

/**
 * Inferno-only (20 October): the Yard Planner's path estimates. Where a ground monster set down at a point would
 * go on this plan, and which walls it would break on the way, worked out as the game's own monsters do it, on the
 * plan's layout instead of the yard's:
 *
 * - its target (MonsterBase.findTarget): of the buildings it goes for, the nearest by a straight line to the middle
 *   less half the building's size; "towers" goes for defences (towers, the Monster Bunker and the Compound),
 *   "loot" for what can be looted (harvesters, Resource Pods, the Under Hall: BRESOURCE and BSTORAGE), "any" for
 *   whatever is nearest. With none of its own kind left it goes for anything. Of the two nearest, the one with the
 *   shorter path is taken, unless that path ends at a wall (MonsterBase.setWaypoints);
 * - its path (PATHING): the costs of every building on the plan, from the buildings' own (BFOUNDATION._gridCost:
 *   10 a cell of open ground, more inside buildings, a wall's middle by its level), flooded out from the target's
 *   cells (diagonals 1.5 times as dear, a cell's depth fixed when it's first reached), then walked down from the
 *   monster's cell; a wall met after its first step stops it there to break the wall (PATHING.Path);
 * - then again: a wall broken or a building destroyed is gone from the costs, and the monster looks for its next
 *   target from where it stands, up to MAX_STOPS stops.
 *
 * It leaves out what the plan doesn't know (monsters defending, traps, flying and burrowing monsters, the small
 * random step a monster takes near its target), so it's an estimate.
 */
export class IoPlanPaths {
    public static readonly KINDS: string[] = ["towers", "loot", "any"];

    /** One cell of the pathing grid, in yard (plan) units, as the game's (PATHING: 10). */
    public static readonly CELL: int = 10;

    /** Stops (buildings destroyed and walls broken) worked out for one estimate, at most. */
    public static readonly MAX_STOPS: int = 12;

    /** Whether `item` is one a monster of `kind` goes for first. */
    public static wants(kind: string, item: BuildingItem): boolean {
        if (!IoPlanPaths.target(item)) {
            return false;
        }
        if (kind == "towers") {
            return String(item.props.type) == "tower";
        }
        if (kind == "loot") {
            let b: any = item.node ? item.node.building : null;
            return b instanceof BRESOURCE || b instanceof BSTORAGE;
        }
        return true;
    }

    /** Whether a monster attacks `item` at all (findTarget's "anything": no decorations, walls, traps...). */
    public static target(item: BuildingItem): boolean {
        if (!item || !item.props || !item.node || !item.node.building) {
            return false;
        }
        let t: string = String(item.props.type);
        return t != "decoration" && t != "immovable" && t != "enemy" && t != "wall" && t != "trap" && t != "mushroom" && t != "gift" && t != "taunt" && t != "cage" && item.node.type != 7;
    }

    /**
     * Where a monster of `kind` set down at `start` goes on the plan made of `items` (the buildings on it, not those
     * in storage), worked out inside `area` (plan units). Legs, in order: {points: [x, y, x, y, ...] (plan units),
     * item: the building it destroys or the wall it breaks, wall: true for a wall, cells: the leg's length in cells};
     * and whether it had none of its own kind to go for (fallback).
     */
    public static estimate(items: BuildingItem[], start: Point, kind: string, area: Rectangle): any {
        // (21 October: worked out by flash/_planPaths, the same code the planner's background thread runs)
        return IoPlanPaths.estimateFast(items, start, kind, area);
    }

    /**
     * (21 October) The plan as plain rows, for the estimates' working out (flash/_planPaths: here, or in a background
     * thread): each building's place, footprint, kind and costs, as the estimate reads them from it.
     */
    public static snapshot(items: BuildingItem[]): any[] {
        let rows: any[] = [];
        for (let item of items) {
            let b: any = item && item.node ? item.node.building : null;
            let f: Rectangle = b && b._footprint && b._footprint[0] ? as3.cast(b._footprint[0], Rectangle) : new Rectangle(0, 0, item.size.width, item.size.height);
            let costs: any[] = [];
            if (b && b._gridCost) {
                for (let row of as3.values(b._gridCost)) {
                    let r: Rectangle = as3.cast(row[0], Rectangle);
                    costs.push([r.x, r.y, r.width, r.height, row[1] | 0]);
                }
            }
            rows.push({
                "x": item.x, "y": item.y, "fx": f.x, "fy": f.y, "fw": f.width, "fh": f.height,
                "type": String(item.props ? item.props.type : ""), "p": !!item.props, "b": !!b, "nt": item.node ? item.node.type : 0,
                "loot": b instanceof BRESOURCE || b instanceof BSTORAGE, "costs": costs,
            });
        }
        return rows;
    }

    /** The answer of an estimate worked out from snapshot rows, its legs' items the plan's own again. */
    public static withItems(items: BuildingItem[], r: any): any {
        if (r && r.legs) {
            for (let leg of r.legs) {
                leg.item = items[leg.item | 0];
            }
        }
        return r;
    }

    /** For tests (21 October): the estimates worked out in the planner's background thread. */
    public static get ioWorkerStats(): any {
        return planWorkerStats;
    }

    /** estimate(), worked out from the plan's rows (flash/_planPaths): the same answers. */
    public static estimateFast(items: BuildingItem[], start: Point, kind: string, area: Rectangle): any {
        return IoPlanPaths.withItems(items, planEstimateHere(IoPlanPaths.snapshot(items), start.x, start.y, kind, area.x, area.y, area.width, area.height));
    }
}
