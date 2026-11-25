import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BUILDING5, GLOBAL, IoMapSnapshot, LOGIN, POWERUPS } from "@game";

/**
 * Inferno-only: what the world map shows (the Filters button over the map, IoMapFiltersPopup). Kept for
 * the whole session, so the map opens the way it was left.
 *
 * (QoL #73, 15 October) Also which yards are worth a look as targets: a level range, no protected yards, no
 * locked ones (being played or attacked), only those in your flinger range. Your own yards always pass. A yard
 * these leave out is drawn faint on the map and on the world map, or (Hide) left off the world map.
 *
 * (QoL #72, 15 October) Damaged tribe yards, and those ready to take over, on the world map and the minimap (`camps`).
 */
export class IoMapFilters extends ASObject {
    /** Which owners' yards show, by IoMapUi relation (YOU ... NONE). */
    public static relations: any[] = [true, true, true, true, true, true];

    public static mains: boolean = true;

    public static outposts: boolean = true;

    public static range: boolean = true;

    public static bookmarks: boolean = true;

    /** (QoL #72) damaged tribe yards, and those ready to take over, marked on the world map and the minimap. */
    public static camps: boolean = true;

    /** (QoL #73) the level range (0: no limit at that end). */
    public static minLevel: int = 0;

    public static maxLevel: int = 0;

    /** (QoL #73) leave out protected yards, locked yards (being played or attacked), yards out of flinger range. */
    public static hideProtected: boolean = false;

    public static hideLocked: boolean = false;

    public static inRangeOnly: boolean = false;

    /** (QoL #73) what happens to a yard the target filters leave out: drawn faint (true), or off the world map. */
    public static dim: boolean = true;

    /** How faint a left-out yard is drawn. */
    public static readonly FAINT: number = 0.28;

    /** The highest level the level range goes to. */
    public static readonly LEVEL_TOP: int = 99;

    /** Your flinger range on the world map: your blue, see-through (IoMapLod draws it). */
    public static readonly RANGE_ARGB: uint = 1714980839;

    /** Goes up with every change, so the world map knows to redraw. */
    public static version: int = 0;

    /** The cells your flingers reach (RANGE_ARGB, else 0), for the snapshot version it was worked out for. */
    private static _range: Vector<uint> = null;

    private static _rangeVersion: int = -1;

    private static _rangeW: int = 0;

    private static _rangeH: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static changed(): void {
        ++IoMapFilters.version;
    }

    /** Whether a yard (a snapshot cell) passes the filters. */
    public static shows(relation: int, main: boolean): boolean {
        if (!IoMapFilters.relations[relation]) {
            return false;
        }
        return main ? IoMapFilters.mains : IoMapFilters.outposts;
    }

    /** (QoL #73) Whether any of the target filters is on. */
    public static get targeting(): boolean {
        return IoMapFilters.minLevel > 0 || IoMapFilters.maxLevel > 0 || IoMapFilters.hideProtected || IoMapFilters.hideLocked || IoMapFilters.inRangeOnly;
    }

    /**
     * (QoL #73) Whether a yard passes the target filters: its level, protected, locked (by someone else) and place.
     * Your own yards always do. Tribe yards have no protection or lock: pass false for those.
     */
    public static targetOk(level: int, isProtected: boolean, locked: boolean, cellX: int, cellY: int, mine: boolean): boolean {
        if (mine || !IoMapFilters.targeting) {
            return true;
        }
        if (IoMapFilters.minLevel > 0 && level < IoMapFilters.minLevel) {
            return false;
        }
        if (IoMapFilters.maxLevel > 0 && level > IoMapFilters.maxLevel) {
            return false;
        }
        if (IoMapFilters.hideProtected && isProtected) {
            return false;
        }
        if (IoMapFilters.hideLocked && locked) {
            return false;
        }
        if (IoMapFilters.inRangeOnly && !IoMapFilters.inRange(cellX, cellY)) {
            return false;
        }
        return true;
    }

    /** (QoL #73) The same for a cell of the map (MapRoomCell): open ground and lava always pass. */
    public static cellOk(cell: any): boolean {
        if (!cell || (cell._base | 0) < 1 || cell._water || !IoMapFilters.targeting) {
            return true;
        }
        let player: boolean = (cell._base | 0) >= 2;
        return IoMapFilters.targetOk(cell._level | 0, player && (cell._protected | 0) != 0, player && cell._locked != 0 && cell._locked != LOGIN._playerID, cell.X | 0, cell.Y | 0, player && Boolean(cell._mine));
    }

    /**
     * (QoL #73) Is a cell within your flingers' range, as the world map draws it? Not known yet (no snapshot), or a
     * cell off the world above (the Depths of Hell): counted as in range, so nothing is left out for it.
     */
    public static inRange(cellX: int, cellY: int): boolean {
        let pixels: Vector<uint> = IoMapFilters.rangePixels();
        if (!pixels || cellX < 0 || cellY < 0 || cellX >= IoMapFilters._rangeW || cellY >= IoMapFilters._rangeH) {
            return true;
        }
        return (as3.vget(pixels, cellY * IoMapFilters._rangeW + cellX) >>> 0) != 0;
    }

    /**
     * Every cell one of your yards' flingers reaches, as MapRoomPopup highlights them on the map: the main yard's
     * range from its flinger level (as upgraded in the yard), an outpost's from its own, both with the alliance war
     * powerup. One pixel per cell (RANGE_ARGB where reached), worked out once per snapshot; null before the snapshot.
     * (QoL #73: moved here from IoMapLod, so the target filter can use it without the world map.)
     */
    public static rangePixels(): Vector<uint> {
        let w: int = IoMapSnapshot.width;
        let h: int = IoMapSnapshot.height;
        let cell: any[] = null;
        let main: boolean = false;
        let level: int = 0;
        let range: int = 0;
        if (!IoMapSnapshot.ready) {
            return IoMapFilters._range;
        }
        if (IoMapFilters._range && IoMapFilters._rangeVersion == IoMapSnapshot.version && IoMapFilters._rangeW == w && IoMapFilters._rangeH == h) {
            return IoMapFilters._range;
        }
        let pixels: Vector<uint> = new Vector<uint>(w * h, true, uint);
        for (cell of as3.values(IoMapSnapshot.cells)) {
            if ((cell[2] | 0) < 2 || (cell[3] | 0) != LOGIN._playerID) {
                continue;
            }
            main = (cell[2] | 0) == 2;
            level = cell[6] | 0;
            if (main && GLOBAL._playerFlingerLevel) {
                level = Math.max(level, GLOBAL._playerFlingerLevel.Get()) | 0;
            }
            if (level <= 0) {
                continue;
            }
            range = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [BUILDING5.getFlingerRange(level, main)]) | 0;
            IoMapFilters.markRange(pixels, w, h, cell[0] | 0, cell[1] | 0, range);
        }
        IoMapFilters._range = pixels;
        IoMapFilters._rangeVersion = IoMapSnapshot.version;
        IoMapFilters._rangeW = w;
        IoMapFilters._rangeH = h;
        return pixels;
    }

    /** The cells within a hex distance of a cell (odd-q offset rows, as the map; the world wraps). */
    private static markRange(pixels: Vector<uint>, w: int, h: int, fromX: int, fromY: int, range: int): void {
        let q: int = fromX;
        let r: int = (fromY - (fromX - (fromX & 1)) / 2) | 0;
        let dq: int = (-range) | 0;
        let dr: int = 0;
        let x: int = 0;
        let y: int = 0;
        while (dq <= range) {
            dr = Math.max(-range, -dq - range) | 0;
            while (dr <= Math.min(range, -dq + range)) {
                x = (q + dq) | 0;
                y = (r + dr + (x - (x & 1)) / 2) | 0;
                x = ((x % w + w) % w) | 0;
                y = ((y % h + h) % h) | 0;
                as3.vset(pixels, y * w + x, IoMapFilters.RANGE_ARGB);
                dr++;
            }
            dq++;
        }
    }

    /** Whether any yards are filtered out (the Filters button says so). */
    public static get active(): boolean {
        for (const $value of as3.values(IoMapFilters.relations)) {
            let on: boolean = Boolean($value);
            if (!on) {
                return true;
            }
        }
        // (QoL #73: and the target filters)
        return !IoMapFilters.mains || !IoMapFilters.outposts || IoMapFilters.targeting;
    }

    public static reset(): void {
        IoMapFilters.relations = [true, true, true, true, true, true];
        IoMapFilters.mains = IoMapFilters.outposts = true;
        // (QoL #73)
        IoMapFilters.minLevel = IoMapFilters.maxLevel = 0;
        IoMapFilters.hideProtected = IoMapFilters.hideLocked = IoMapFilters.inRangeOnly = false;
        IoMapFilters.changed();
    }
}
