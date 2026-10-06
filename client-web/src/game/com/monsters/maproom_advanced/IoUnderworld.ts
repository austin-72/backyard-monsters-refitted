import * as as3 from "as3";
import { ASObject, Class, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip } from "flash/display";
import { IOErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { CellData, DepthsTile_bridge_n, DepthsTile_bridge_ne, DepthsTile_bridge_nw, DepthsTile_bridge_s, DepthsTile_bridge_se, DepthsTile_bridge_sw, DepthsTile_lava, DepthsTile_lava_2, DepthsTile_lava_3, DepthsTile_lava_4, DepthsTile_lava_5, DepthsTile_lava_6, DepthsTile_lava_7, DepthsTile_lava_8, DepthsTile_lava_9, DepthsTile_platform_1, DepthsTile_platform_2, DepthsTile_platform_3, DepthsTile_platform_4, GLOBAL, HellTileVariants, ImageCache, MapRoomCell, POWERUPS, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: the Underworld, called the Depths of Hell in the game (the user's name, 4 October; the code
 * keeps "underworld") (server: services/maproom/v2/underworld.ts, config/UnderworldConfig.ts).
 *
 * A 10 x 10 layer of the map below the Inferno. Its cells are in the same world as the overworld's, at x and y
 * 500-509, so taking them over, their outposts and attacks work as anywhere. The map shows one layer at a time:
 * it shows the underworld when it goes to a cell there (MapRoomPopup.GenerateCells: a portal, an outpost there
 * from the Outposts list, a link in chat), and the overworld again when it goes to one up here (Home...). While
 * it shows the underworld the map is 1000 cells wide (nothing wraps: around the island is lava, never asked for).
 *
 * Portals sit on lava at the centres of the world's biggest lava pools (io_portal on both ends' cells: [number,
 * overworld x, y, underworld x, y]). Range through them (ioreach tells which of the player's yards reach what):
 *  - in: an overworld yard with a portal within its Flinger range reaches the underworld cells next to its end;
 *  - in the underworld: an outpost there has no Flinger and reaches the cells next to it (range 1, no Declare War);
 *  - out: an underworld outpost next to a portal reaches the overworld cells within 5 of the portal.
 * Underworld takeovers cost twice as much (PopupTakeover).
 */
export class IoUnderworld extends ASObject {
    /** The underworld's top left cell and size (the server's; getarea's io_under says so). */
    public static origin: int = 500;

    public static size: int = 10;

    /** An underworld outpost's range, and how far out of a portal an attack can go. */
    public static outpostRange: int = 1;

    public static exitRange: int = 5;

    /** How many times as much a takeover in the underworld costs. */
    public static costMultiplier: int = 2;

    /** Every portal: [overworld x, y, underworld x, y]. */
    public static portals: any[] = [];

    /** The map is showing the underworld. */
    public static under: boolean = false;

    /** The map's width and height while it shows the underworld (no wrapping: the island is in the middle). */
    private static readonly UNDER_MAP: int = 1000;

    private static _overWidth: int = 400;

    private static _overHeight: int = 400;

    /**
     * Around the island: lava, the same object for every cell. At the island's own level (125) and drawn with the
     * Depths' lava picture (depthsGround), so the lava sea and the lava between the platforms are one surface.
     */
    private static readonly VOID: any = { "i": 125, "io_void": 1 };

    /** What the player's yards reach through the portals (ioreach), and when it came. */
    private static _reach: any = null;

    private static _reachAt: int = 0;

    private static _reachBusy: boolean = false;

    /** The yards ioreach sent, made into map cells (by baseid): never on screen (the other layer). */
    private static _reachCells: any = {};

    private static readonly PORTAL_ICON: string = "ioPortal";

    /** What the game calls the underworld. */
    public static readonly NAME: string = "Depths of Hell";

    // ---- the Depths' own ground (the user's, 4 October)
    /**
     * A cell of the Depths of Hell drawn its own way: a stone platform (one of four pictures, as no cell of the
     * world above looks) standing in lava, with a small bridge to every neighbour on the island, so the cells
     * stand apart with lava between them. Four layers (hellmap/DepthsTile_*: one of 9 lavas, a bridge half towards each
     * neighbour, the platform) made into one picture per variant and set of neighbours, kept. Portals stand on
     * a platform like any other cell (the server gives them the island's height).
     */
    private static _depthsCache: any = {};

    private static readonly BRIDGES: any[] = [["n", DepthsTile_bridge_n], ["ne", DepthsTile_bridge_ne], ["se", DepthsTile_bridge_se], ["s", DepthsTile_bridge_s], ["sw", DepthsTile_bridge_sw], ["nw", DepthsTile_bridge_nw]];

    private static readonly PLATFORMS: any[] = [DepthsTile_platform_1, DepthsTile_platform_2, DepthsTile_platform_3, DepthsTile_platform_4];

    /** Every lava texture of the map (3 depths x 3 looks; the user's, 4 October), so the lava doesn't repeat. */
    private static readonly LAVAS: any[] = [DepthsTile_lava, DepthsTile_lava_2, DepthsTile_lava_3, DepthsTile_lava_4, DepthsTile_lava_5, DepthsTile_lava_6, DepthsTile_lava_7, DepthsTile_lava_8, DepthsTile_lava_9];

    private static _layers: any = {};

    public $ctor(): void {
        super.$ctor();
    }

    public static isUnder(cellX: int, cellY: int): boolean {
        return cellX >= IoUnderworld.origin && cellY >= IoUnderworld.origin && cellX < IoUnderworld.origin + IoUnderworld.size && cellY < IoUnderworld.origin + IoUnderworld.size;
    }

    /** Is this zone (its top left cell) the underworld's? */
    public static isUnderZone(zone: Point): boolean {
        return Boolean(zone && zone.x == IoUnderworld.origin && zone.y == IoUnderworld.origin);
    }

    /** A cell of the map outside the island while the map shows the underworld: lava, never asked for. */
    public static isVoid(cellX: int, cellY: int): boolean {
        return IoUnderworld.under && !IoUnderworld.isUnder(cellX, cellY);
    }

    public static get voidCell(): any {
        return IoUnderworld.VOID;
    }

    /** The Depths' own numbers for a cell there: 0 to 9 each way, from 0 like the world above (0 to 399). */
    public static label(cellX: int, cellY: int): string {
        return IoUnderworld.NAME + " " + (cellX - IoUnderworld.origin) + ", " + (cellY - IoUnderworld.origin);
    }

    /** getarea's io_under: where the underworld is and its portals. */
    public static setInfo(info: any): void {
        if (!info) {
            return;
        }
        IoUnderworld.origin = info.o | 0 || IoUnderworld.origin;
        IoUnderworld.size = info.s | 0 || IoUnderworld.size;
        IoUnderworld.outpostRange = info.r | 0 || IoUnderworld.outpostRange;
        IoUnderworld.exitRange = info.e | 0 || IoUnderworld.exitRange;
        IoUnderworld.costMultiplier = info.k | 0 || IoUnderworld.costMultiplier;
        if (as3.is(info.p, Array)) {
            IoUnderworld.setPortals(as3.as(info.p, Array));
        }
    }

    /** The portals arrived (getarea, ioreach, the world snapshot's layers): the minimap shows them. */
    public static setPortals(list: any[]): void {
        let changed: boolean = !list || list.length != IoUnderworld.portals.length;
        IoUnderworld.portals = list || [];
        if (changed && MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
            MapRoom._mc.ioSnapshotChanged();
        }
    }

    /** The portal with an end at this cell (its number in `portals`), or -1. */
    public static portalIndexAt(cellX: int, cellY: int): int {
        for (let i: int = 0; i < IoUnderworld.portals.length; i++) {
            let p: any[] = as3.as(IoUnderworld.portals[i], Array);
            if (p && ((p[0] | 0) == cellX && (p[1] | 0) == cellY || (p[2] | 0) == cellX && (p[3] | 0) == cellY)) {
                return i;
            }
        }
        return -1;
    }

    // ---- which layer the map shows
    /** The map goes to a cell (MapRoomPopup.GenerateCells): it shows that cell's layer. Null: the map closes. */
    public static modeFor(point: Point): void {
        let want: boolean = GLOBAL.INFERNO_ONLY && point != null && IoUnderworld.isUnder(point.x | 0, point.y | 0);
        if (want == IoUnderworld.under) {
            return;
        }
        if (want) {
            IoUnderworld._overWidth = MapRoom._mapWidth > 0 && MapRoom._mapWidth != IoUnderworld.UNDER_MAP ? MapRoom._mapWidth : 400;
            IoUnderworld._overHeight = MapRoom._mapHeight > 0 && MapRoom._mapHeight != IoUnderworld.UNDER_MAP ? MapRoom._mapHeight : 400;
            MapRoom._mapWidth = IoUnderworld.UNDER_MAP;
            MapRoom._mapHeight = IoUnderworld.UNDER_MAP;
        } else {
            MapRoom._mapWidth = IoUnderworld._overWidth;
            MapRoom._mapHeight = IoUnderworld._overHeight;
        }
        IoUnderworld.under = want;
        if (want) {
            IoUnderworld.requestReach();
        }
    }

    // ---- range through the portals
    private static declareWarBonus(): int {
        return POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL") ? POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0]) | 0 : 0;
    }

    /** Asks what the player's yards reach (at most every 20 seconds unless forced: after an attack, the map opening). */
    public static requestReach(force: boolean = false): void {
        if (!GLOBAL.INFERNO_ONLY || IoUnderworld._reachBusy || MapRoom._viewOnly) {
            return;
        }
        if (!force && IoUnderworld._reach && GLOBAL.Timestamp() - IoUnderworld._reachAt < 20) {
            return;
        }
        IoUnderworld._reachBusy = true;
        new URLLoaderApi().load(GLOBAL._mapURL + "ioreach", [["v", 1]], (response: any): void => {
            let bid: string = null;
            let entry: any = null;
            let cell: MapRoomCell = null;
            let keep: MapRoomCell = null;
            IoUnderworld._reachBusy = false;
            if (!response || (response.error !== 0 && response.error !== "0")) {
                return;
            }
            if (as3.is(response.portals, Array)) {
                IoUnderworld.setPortals(as3.as(response.portals, Array));
            }
            IoUnderworld.origin = response.origin | 0 || IoUnderworld.origin;
            IoUnderworld.size = response.size | 0 || IoUnderworld.size;
            IoUnderworld._reachCells = {};
            for (bid in response.cells) {
                entry = response.cells[bid];
                if (!entry || !entry.data) {
                    continue;
                }
                cell = new MapRoomCell();
                cell.X = entry.x | 0;
                cell.Y = entry.y | 0;
                keep = MapRoom._homeCell;
                cell.Setup(entry.data);
                if (keep) {
                    MapRoom._homeCell = keep;
                }
                IoUnderworld._reachCells[bid] = cell;
            }
            IoUnderworld._reach = response;
            IoUnderworld._reachAt = GLOBAL.Timestamp();
            if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
                MapRoom._mc.ioReachArrived();
            }
        }, (e: IOErrorEvent): void => {
            IoUnderworld._reachBusy = false;
        });
    }

    /** The map has closed or an attack began: what was reached is asked for again next time. */
    public static forgetReach(): void {
        IoUnderworld._reach = null;
        IoUnderworld._reachCells = {};
    }

    /** Does reaching this cell take the portals (it is in the underworld, or near a portal up here)? */
    public static needsReach(cellX: int, cellY: int): boolean {
        if (IoUnderworld.isUnder(cellX, cellY)) {
            return true;
        }
        for (let p of as3.values(IoUnderworld.portals)) {
            if (IoUnderworld.hexDistanceWrapped(p[0] | 0, p[1] | 0, cellX, cellY) <= IoUnderworld.exitRange) {
                return true;
            }
        }
        return false;
    }

    /** Still waiting for ioreach for a cell that needs it (an attack popup waits a moment, as for yards off screen). */
    public static reachPending(cellX: int, cellY: int): boolean {
        if (!GLOBAL.INFERNO_ONLY || !IoUnderworld.needsReach(cellX, cellY)) {
            return false;
        }
        IoUnderworld.requestReach();
        return IoUnderworld._reach == null;
    }

    /**
     * The yards that can attack a cell (MapRoomPopup.GetCellsInRange's, for PopupInfoEnemy and PopupAttackA), with
     * the underworld's rules: an underworld outpost's range is 1 whatever Declare War says (its distance is made
     * longer by the bonus the checks add), and the yards that reach the cell through a portal are added, each at
     * a distance the checks (range + Declare War >= distance) and the attack's save (BASE) count it in at.
     */
    public static withReach(cells: Vector<CellData>, cellX: int, cellY: int): Vector<CellData> {
        let out: Vector<CellData> = new Vector<CellData>(0, false, CellData);
        let bonus: int = IoUnderworld.declareWarBonus();
        let cd: CellData = null;
        let best: any = {};
        let order: any[] = [];
        let i: int = 0;
        let p: any[] = null;
        let source: any[] = null;
        let cell: MapRoomCell = null;
        let d: int = 0;
        let bid: string = null;
        for (cd of (cells ?? [])) {
            if (cd && cd.cell && cd.cell._ioUnder) {
                out.push(new CellData(cd.cell, (cd.range + bonus) | 0));
            } else {
                out.push(cd);
            }
        }
        if (!IoUnderworld._reach) {
            if (IoUnderworld.needsReach(cellX, cellY)) {
                IoUnderworld.requestReach();
            }
            return out;
        }
        IoUnderworld.requestReach();
        // (fresh enough, or asked for again)
        let into: boolean = IoUnderworld.isUnder(cellX, cellY);
        for (i = 0; i < IoUnderworld.portals.length; i++) {
            p = as3.as(IoUnderworld.portals[i], Array);
            let lists: any = into ? IoUnderworld._reach.entry : IoUnderworld._reach.exit;
            let list: any[] = lists ? as3.as(lists[String(i)], Array) : null;
            if (!p || !list) {
                continue;
            }
            if (into ? IoUnderworld.hexDistance(p[2] | 0, p[3] | 0, cellX, cellY) > 1 : IoUnderworld.hexDistanceWrapped(p[0] | 0, p[1] | 0, cellX, cellY) > IoUnderworld.exitRange) {
                continue;
            }
            for (source of as3.values(list)) {
                bid = String(source[0]);
                cell = as3.as(IoUnderworld._reachCells[bid], MapRoomCell);
                if (!cell) {
                    continue;
                }
                d = (into ? source[1] | 0 : (source[1] | 0) + bonus) | 0;
                if (best[bid] == null) {
                    order.push(bid);
                    best[bid] = d;
                } else {
                    best[bid] = Math.min(best[bid] | 0, d);
                }
            }
        }
        for (const $value of as3.values(order)) {
            bid = as3.str($value);
            out.push(new CellData(as3.as(IoUnderworld._reachCells[bid], MapRoomCell), best[bid] | 0));
        }
        return out;
    }

    /** Is this portal opened from above: one of the player's overworld yards has it in range? */
    public static entryOpen(index: int): boolean {
        let list: any[] = IoUnderworld._reach && IoUnderworld._reach.entry ? as3.as(IoUnderworld._reach.entry[String(index)], Array) : null;
        let bonus: int = IoUnderworld.declareWarBonus();
        for (let source of as3.values(list)) {
            let cell: MapRoomCell = as3.as(IoUnderworld._reachCells[String(source[0])], MapRoomCell);
            if (cell && cell._flingerRange && cell._flingerRange.Get() > 0 && cell._flingerRange.Get() + bonus >= (source[1] | 0)) {
                return true;
            }
        }
        return false;
    }

    /** Is this portal held from below: an underworld outpost of the player is next to its end? */
    public static exitOpen(index: int): boolean {
        let list: any[] = IoUnderworld._reach && IoUnderworld._reach.exit ? as3.as(IoUnderworld._reach.exit[String(index)], Array) : null;
        return list != null && list.length > 0;
    }

    /** Does the player have an outpost in the underworld? */
    public static hasOutpostBelow(): boolean {
        for (let p of as3.values(GLOBAL._mapOutpost)) {
            if (p && IoUnderworld.isUnder(p.x | 0, p.y | 0)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The range the map shows through the portals, on the layer it shows: [x, y, range] for each (the cells
     * next to an underworld portal opened from above; the cells within 5 of an overworld portal held from below).
     */
    public static highlights(): any[] {
        let out: any[] = [];
        if (!IoUnderworld._reach) {
            return out;
        }
        for (let i: int = 0; i < IoUnderworld.portals.length; i++) {
            let p: any[] = as3.as(IoUnderworld.portals[i], Array);
            if (IoUnderworld.under && IoUnderworld.entryOpen(i)) {
                out.push([p[2] | 0, p[3] | 0, 1]);
            } else if (!IoUnderworld.under && IoUnderworld.exitOpen(i)) {
                out.push([p[0] | 0, p[1] | 0, IoUnderworld.exitRange]);
            }
        }
        return out;
    }

    // ---- distances (the map's hex cells: odd columns half a cell down)
    public static hexDistance(x1: int, y1: int, x2: int, y2: int): int {
        let q1: int = x1;
        let r1: int = (y1 - (x1 - (x1 & 1)) / 2) | 0;
        let q2: int = x2;
        let r2: int = (y2 - (x2 - (x2 & 1)) / 2) | 0;
        let dq: int = (q2 - q1) | 0;
        let dr: int = (r2 - r1) | 0;
        return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) | 0;
    }

    /** Across the overworld's wrapped edges (its width is even: columns keep their parity). */
    public static hexDistanceWrapped(x1: int, y1: int, x2: int, y2: int): int {
        let w: int = IoUnderworld.under ? IoUnderworld._overWidth : MapRoom._mapWidth;
        let h: int = IoUnderworld.under ? IoUnderworld._overHeight : MapRoom._mapHeight;
        let best: int = int.MAX_VALUE;
        for (let sx: int = -1; sx <= 1; sx++) {
            for (let sy: int = -1; sy <= 1; sy++) {
                best = Math.min(best, IoUnderworld.hexDistance(x1, y1, (x2 + sx * w) | 0, (y2 + sy * h) | 0)) | 0;
            }
        }
        return best;
    }

    /** Which lava picture a cell has: always the same for a cell, mixed up between neighbours. */
    private static lavaIndex(cellX: int, cellY: int): int {
        // (products kept under 2^53, so every runtime works it out the same)
        let h: uint = (cellX * 374761393 + cellY * 668265263) >>> 0;
        h = (((h ^ (h >>> 13)) >>> 0) % 1000003) >>> 0;
        h = (h * 2654435 + 12345) >>> 0;
        return (((h ^ (h >>> 7)) >>> 0) % IoUnderworld.LAVAS.length) | 0;
    }

    private static layer(cls: any): BitmapData {
        let key: string = String(cls);
        if (!IoUnderworld._layers[key]) {
            IoUnderworld._layers[key] = as3.as(new cls(), BitmapData);
        }
        return as3.as(IoUnderworld._layers[key], BitmapData);
    }

    /** The ground picture of a cell of the Depths (150 x 100, the map's tile size). */
    public static depthsGround(cellX: int, cellY: int): BitmapData {
        let lavaAt: int = IoUnderworld.lavaIndex(cellX, cellY);
        if (!IoUnderworld.isUnder(cellX, cellY)) {
            return IoUnderworld.layer(as3.as(IoUnderworld.LAVAS[lavaAt], Class));
        }
        let variant: int = HellTileVariants.variantIndex(cellX, cellY);
        let odd: int = cellX & 1;
        // neighbours on the map's hex layout (odd columns half a cell down): N, NE, SE, S, SW, NW
        let around: any[] = [[cellX, cellY - 1], [cellX + 1, cellY - 1 + odd], [cellX + 1, cellY + odd], [cellX, cellY + 1], [cellX - 1, cellY + odd], [cellX - 1, cellY - 1 + odd]];
        let mask: int = 0;
        let i: int = 0;
        for (i = 0; i < 6; i++) {
            if (IoUnderworld.isUnder(around[i][0] | 0, around[i][1] | 0)) {
                mask |= 1 << i;
            }
        }
        let key: int = ((lavaAt * 4 + variant) * 64 + mask) | 0;
        let out: BitmapData = as3.as(IoUnderworld._depthsCache[key], BitmapData);
        if (out) {
            return out;
        }
        let lava: BitmapData = IoUnderworld.layer(as3.as(IoUnderworld.LAVAS[lavaAt], Class));
        let origin: Point = new Point(0, 0);
        out = new BitmapData(lava.width, lava.height, true, 0);
        out.copyPixels(lava, lava.rect, origin);
        for (i = 0; i < 6; i++) {
            if (mask & (1 << i)) {
                let bridge: BitmapData = IoUnderworld.layer(as3.as(IoUnderworld.BRIDGES[i][1], Class));
                out.copyPixels(bridge, bridge.rect, origin, null, null, true);
            }
        }
        let platform: BitmapData = IoUnderworld.layer(as3.as(IoUnderworld.PLATFORMS[variant], Class));
        out.copyPixels(platform, platform.rect, origin, null, null, true);
        IoUnderworld._depthsCache[key] = out;
        return out;
    }

    /** Is this map cell drawn as the Depths (the map shows them: the island, and the lava round it)? */
    public static drawsDepths(cellX: int, cellY: int): boolean {
        return GLOBAL.INFERNO_ONLY && IoUnderworld.under;
    }

    // ---- the portals' picture on their cells
    /**
     * Shows a portal on a cell's tile, or takes it off (portal null): a swirl going down in the overworld, one
     * going up in the underworld (assets/worldmap/icons/io_portal_*.png).
     */
    public static portalIcon(tile: MovieClip, portal: any[], cellX: int, cellY: int): void {
        let existing: DisplayObject = null;
        let key: string = null;
        if (!tile) {
            return;
        }
        key = portal ? (IoUnderworld.isUnder(cellX, cellY) ? "up" : "down") : null;
        existing = tile.getChildByName(IoUnderworld.PORTAL_ICON);
        tile.ioPortalKey = key;
        if (existing && as3.cast(existing, MovieClip).ioKey != key) {
            tile.removeChild(existing);
            existing = null;
        }
        if (key && !existing) {
            ImageCache.GetImageWithCallBack("worldmap/icons/io_portal_" + key + ".png", IoUnderworld.portalLoaded, true, 1, "", [tile, key]);
        }
    }

    private static portalLoaded(url: string, image: BitmapData, args: any[]): void {
        let tile: MovieClip = as3.as(args[0], MovieClip);
        let key: string = as3.as(args[1], String);
        if (!tile || tile.ioPortalKey != key || tile.getChildByName(IoUnderworld.PORTAL_ICON)) {
            return;
        }
        let holder: MovieClip = new MovieClip();
        let picture: Bitmap = new Bitmap(image, "auto", true);
        holder.name = IoUnderworld.PORTAL_ICON;
        holder.ioKey = key;
        // MovieClip is dynamic
        holder.mouseEnabled = false;
        holder.mouseChildren = false;
        // On the middle of the tile's top (a 150 x 75 hex; the picture is 120 x 84, its opening low in it).
        picture.x = 15;
        picture.y = -18;
        if (key == "up") {
            // in the Depths, over a platform (smaller than a cell): smaller, round the same middle
            picture.scaleX = picture.scaleY = 0.75;
            picture.x = 75 - 45;
            picture.y = 24 - 31.5;
        }
        holder.addChild(picture);
        tile.addChild(holder);
    }
}
