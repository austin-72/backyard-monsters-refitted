import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { ALLIANCES, GLOBAL, IoUnderworld, LOGIN, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: the whole Map Room 2 world at once (server: /worldmapv2/mapdata,
 * services/maproom/v2/bulk/worldSnapshot.ts).
 *
 * The map used to know a cell only once getarea had answered for its 10 x 10 zone, so it opened on
 * dark placeholder tiles that filled in zone by zone. Now it asks for the world snapshot when it opens
 * and, while it is open, each time the server makes a new one (every 5 minutes): every player yard and
 * outpost with its owner, level and alliance, damaged wild monster camps, and the world's alliances. The first time for a world it also gets the
 * world's fixed layers: the terrain height and the tribe and level of every cell. With those, CellAt()
 * gives any cell of the world straight away, in the shape getarea gives it (at most 5 minutes old).
 * getarea still runs for the zones on screen and brings them up to date with what only it knows
 * (resources, monsters, invites), and its data wins over the snapshot's for its zone.
 *
 * A cell made from the snapshot carries io_snap: 1. Clicking one waits for its zone's getarea first
 * (MapRoom.ioClickWhenLoaded): the popups need its monsters and resources.
 *
 * The zoomed-out world map (IoMapLod) is drawn from this too.
 */
export class IoMapSnapshot extends ASObject {
    /**
     * The server makes the snapshot on a fixed 5-minute clock and says when its next one is out
     * (`nextAt`). The map asks again a few seconds after that, and never sooner than this after the last
     * answer (seconds), however often it opens (the user's rule, 2 October).
     */
    public static readonly MIN_GAP: int = 300;

    /** Kept this long past its `nextAt` if no newer one comes (seconds); then the map shows what getarea says. */
    private static readonly GRACE: int = 300;

    private static readonly CODE_BASE: int = 48;

    // the world's fixed layers
    private static _layersWorld: string = null;

    private static _terrain: string = null;

    private static _wild: string = null;

    private static _tribes: any[] = [];

    private static _bidPrefix: string = "";

    private static _height: int = 400;

    private static _width: int = 400;

    // the snapshot
    private static _world: string = null;

    private static _cells: any = {};

    private static _cellList: any[] = [];

    private static _players: any = {};

    private static _alliances: any = {};

    private static _fetchedAt: int = 0;

    private static _requestedAt: int = 0;

    /** When the server's next snapshot is out (server time), and when to ask for it (a few seconds after). */
    private static _nextAt: int = 0;

    private static _dueAt: int = 0;

    private static _loading: boolean = false;

    private static _made: any = {};

    /** Where home was when the snapshot came: a move (to another world, or within it) makes it stale. */
    private static _homeKey: int = -1;

    /** Goes up by one every time a new snapshot arrives (the world map redraws its dots on a change). */
    public static version: int = 0;

    private static _yardsVersion: int = -1;

    private static _yards: any = {};

    public $ctor(): void {
        super.$ctor();
    }

    /** The snapshot and the world's layers are here and not too old. */
    public static get ready(): boolean {
        return IoMapSnapshot._terrain != null && IoMapSnapshot._world != null && IoMapSnapshot._world == IoMapSnapshot._layersWorld && GLOBAL.Timestamp() <= Math.max(IoMapSnapshot._nextAt, IoMapSnapshot._fetchedAt + IoMapSnapshot.MIN_GAP) + IoMapSnapshot.GRACE && IoMapSnapshot._homeKey == IoMapSnapshot.HomeKey();
    }

    private static HomeKey(): int {
        return (GLOBAL._mapHome ? (GLOBAL._mapHome.x | 0) * 10000 + (GLOBAL._mapHome.y | 0) : -1) | 0;
    }

    /** The world the snapshot is of. */
    public static get world(): string {
        return IoMapSnapshot._world;
    }

    public static get width(): int {
        return IoMapSnapshot._width;
    }

    public static get height(): int {
        return IoMapSnapshot._height;
    }

    /**
     * Asks for the server's next snapshot once it is out (force: now, for another world's). The map calls
     * this every second. Never sooner than MIN_GAP after the last answer, unless home moved (perhaps to
     * another world, whose snapshot is needed).
     */
    public static Request(force: boolean = false): void {
        if (IoMapSnapshot._loading || !GLOBAL.INFERNO_ONLY) {
            return;
        }
        let now: int = GLOBAL.Timestamp();
        if (!force) {
            if (now - IoMapSnapshot._requestedAt < 10) {
                return;
            }
            if (IoMapSnapshot._fetchedAt > 0 && IoMapSnapshot._homeKey == IoMapSnapshot.HomeKey() && (now - IoMapSnapshot._fetchedAt < IoMapSnapshot.MIN_GAP || now < IoMapSnapshot._dueAt)) {
                return;
            }
        }
        IoMapSnapshot._loading = true;
        IoMapSnapshot._requestedAt = now;
        let wantLayers: boolean = IoMapSnapshot._terrain == null;
        new URLLoaderApi().load(GLOBAL._mapURL + "mapdata", [["layers", wantLayers ? 1 : 0]], (serverData: any): void => {
            IoMapSnapshot._loading = false;
            if (!serverData || serverData.error) {
                return;
            }
            IoMapSnapshot.Arrived(serverData);
        }, (e: IOErrorEvent): void => {
            IoMapSnapshot._loading = false;
        });
    }

    private static Arrived(serverData: any): void {
        let layers: any = serverData["static"];
        let list: any[] = null;
        let alliances: any[] = [];
        let id: string = null;
        let cell: any[] = null;
        if (layers && layers.t && layers.w) {
            IoMapSnapshot._layersWorld = String(layers.worldid);
            IoMapSnapshot._terrain = String(layers.t);
            IoMapSnapshot._wild = String(layers.w);
            IoMapSnapshot._tribes = as3.is(layers.tribes, Array) ? as3.as(layers.tribes, Array) : [];
            IoMapSnapshot._bidPrefix = String(layers.bidPrefix || "");
            // the portals to the Depths of Hell (fixed for a world): the world map and the minimap show them
            if (GLOBAL.INFERNO_ONLY && as3.is(layers.portals, Array) && (as3.as(layers.portals, Array)).length) {
                IoUnderworld.setPortals(as3.as(layers.portals, Array));
            }
            IoMapSnapshot._width = serverData.width | 0 || 400;
            IoMapSnapshot._height = serverData.height | 0 || 400;
        }
        IoMapSnapshot._world = String(serverData.worldid);
        if (IoMapSnapshot._world != IoMapSnapshot._layersWorld) {
            // Moved to another world: its layers are needed too.
            IoMapSnapshot._terrain = null;
            IoMapSnapshot._requestedAt = 0;
            IoMapSnapshot.Request(true);
            return;
        }
        IoMapSnapshot._players = serverData.players || {};
        IoMapSnapshot._alliances = serverData.alliances || {};
        IoMapSnapshot._cells = {};
        IoMapSnapshot._cellList = [];
        list = as3.is(serverData.cells, Array) ? as3.as(serverData.cells, Array) : [];
        for (cell of as3.values(list)) {
            IoMapSnapshot._cells[(cell[0] | 0) * 10000 + (cell[1] | 0)] = cell;
            IoMapSnapshot._cellList.push(cell);
        }
        IoMapSnapshot._made = {};
        IoMapSnapshot._fetchedAt = GLOBAL.Timestamp();
        IoMapSnapshot._homeKey = IoMapSnapshot.HomeKey();
        // the server's next one, and a few seconds more so not everybody asks in the same second
        IoMapSnapshot._nextAt = ((serverData.nextAt | 0) > 0 ? serverData.nextAt | 0 : IoMapSnapshot._fetchedAt + IoMapSnapshot.MIN_GAP) | 0;
        IoMapSnapshot._dueAt = (Math.max(IoMapSnapshot._nextAt, IoMapSnapshot._fetchedAt + IoMapSnapshot.MIN_GAP) + 3 + ((Math.random() * 18) | 0)) | 0;
        for (id in IoMapSnapshot._alliances) {
            alliances.push({ "alliance_id": Number(id) | 0, "name": IoMapSnapshot._alliances[id].name, "image": IoMapSnapshot._alliances[id].image, "relationships": IoMapSnapshot._alliances[id].relationships || {} });
        }
        if (alliances.length > 0) {
            ALLIANCES.ProcessAlliances(alliances);
        }
        ++IoMapSnapshot.version;
        MapRoom.ioSnapshotArrived();
    }

    /** Forgets the snapshot (not the world's layers): the map shows what getarea says until the next one. */
    public static Expire(): void {
        IoMapSnapshot._fetchedAt = 0;
        IoMapSnapshot._requestedAt = 0;
        IoMapSnapshot._made = {};
    }

    /** The terrain height of a cell (0-255; 99 and below is lava), or -1 before the layers arrive. */
    public static HeightAt(cellX: int, cellY: int): int {
        if (IoMapSnapshot._terrain == null || cellX < 0 || cellY < 0 || cellX >= IoMapSnapshot._width || cellY >= IoMapSnapshot._height) {
            return -1;
        }
        return (IoMapSnapshot._terrain.charCodeAt(cellX * IoMapSnapshot._height + cellY) - IoMapSnapshot.CODE_BASE) | 0;
    }

    /** Player yards and outposts, and damaged camps: [x, y, base type, uid, baseid, value, flinger, catapult, damage, protected until, destroyed, level, locked, terrain height]. */
    public static get cells(): any[] {
        return IoMapSnapshot._cellList;
    }

    /** { name, avatar, alliance, level } of a player in the snapshot, or null. */
    public static PlayerInfo(uid: int): any {
        return IoMapSnapshot._players[uid] || null;
    }

    /** Every player with a yard on the world: uid -> { name, avatar, alliance, level }. */
    public static get players(): any {
        return IoMapSnapshot._players;
    }

    /** A short tag for the world, put into shared locations so they are only opened on the same world. */
    public static get worldTag(): string {
        return IoMapSnapshot._world ? IoMapSnapshot._world.replace(/[^0-9a-zA-Z]/g, "").substr(0, 6) : "";
    }

    /**
     * A player's yards in the snapshot: { main: [x, y] or null, outposts: [[x, y], ...] } (outposts in map
     * order), or null when they have none.
     */
    public static YardsOf(uid: int): any {
        let cell: any[] = null;
        let entry: any = null;
        if (IoMapSnapshot._yardsVersion != IoMapSnapshot.version) {
            IoMapSnapshot._yardsVersion = IoMapSnapshot.version;
            IoMapSnapshot._yards = {};
            for (cell of as3.values(IoMapSnapshot._cellList)) {
                if ((cell[2] | 0) < 2) {
                    continue;
                }
                entry = IoMapSnapshot._yards[cell[3] | 0];
                if (!entry) {
                    entry = IoMapSnapshot._yards[cell[3] | 0] = { "main": null, "outposts": [] };
                }
                if ((cell[2] | 0) == 2) {
                    entry.main = [cell[0] | 0, cell[1] | 0];
                } else {
                    entry.outposts.push([cell[0] | 0, cell[1] | 0]);
                }
            }
        }
        return IoMapSnapshot._yards[uid] || null;
    }

    /** An alliance of the world ({ name, image, leader, members, relationships }), or null. */
    public static AllianceInfo(id: int): any {
        return IoMapSnapshot._alliances[id] || null;
    }

    /** A cell in the shape getarea sends it, from the snapshot; null while there is none. The same object until the next snapshot. */
    public static CellAt(cellX: int, cellY: int): any {
        if (!IoMapSnapshot.ready) {
            return null;
        }
        let key: int = (cellX * 10000 + cellY) | 0;
        let made: any = IoMapSnapshot._made[key];
        if (made) {
            return made;
        }
        made = IoMapSnapshot.Make(cellX, cellY, key);
        if (made) {
            IoMapSnapshot._made[key] = made;
        }
        return made;
    }

    private static Make(cellX: int, cellY: int, key: int): any {
        let height: int = IoMapSnapshot.HeightAt(cellX, cellY);
        let entry: any[] = null;
        let player: any = null;
        let now: int = 0;
        let protectedUntil: int = 0;
        let damage: int = 0;
        let code: int = 0;
        let tribe: int = 0;
        if (height < 0) {
            return null;
        }
        entry = as3.as(IoMapSnapshot._cells[key], Array);
        if (entry && entry.length > 13) {
            height = entry[13] | 0;
        }
        if (height <= 99) {
            return { "i": height, "io_snap": 1 };
        }
        if (entry && (entry[2] | 0) >= 2) {
            player = IoMapSnapshot._players[entry[3] | 0] || {};
            now = GLOBAL.Timestamp();
            protectedUntil = entry[9] | 0;
            damage = entry[8] | 0;
            if (protectedUntil > 0 && protectedUntil <= now) {
                damage = 0;
            }
            let mine: boolean = (entry[3] | 0) == LOGIN._playerID;
            return { "uid": entry[3] | 0, "b": entry[2] | 0, "pi": 0, "bid": String(entry[4]), "aid": player.alliance | 0, "i": height, "v": Number(entry[5]), "mine": mine ? 1 : 0, "f": entry[6] | 0, "c": entry[7] | 0, "n": String(player.name || ""), "fr": 0, "p": protectedUntil > now ? 1 : 0, "l": entry[11] | 0, "d": damage >= 90 ? 1 : 0, "lo": mine ? 0 : entry[12] | 0, "dm": damage, "pic_square": player.avatar, "io_snap": 1 };
        }
        code = (IoMapSnapshot._wild.charCodeAt(cellX * IoMapSnapshot._height + cellY) - IoMapSnapshot.CODE_BASE) | 0;
        tribe = code >> 7;
        return { "uid": 0, "b": 1, "i": height, "bid": IoMapSnapshot._bidPrefix + IoMapSnapshot.Pad3(cellX) + IoMapSnapshot.Pad3(cellY), "n": String(IoMapSnapshot._tribes[tribe] || ""), "l": code & 127, "dm": entry ? entry[8] | 0 : 0, "d": entry ? entry[10] | 0 : 0, "io_snap": 1 };
    }

    private static Pad3(value: int): string {
        let text: string = String(value);
        while (text.length < 3) {
            text = "0" + text;
        }
        return text;
    }
}
