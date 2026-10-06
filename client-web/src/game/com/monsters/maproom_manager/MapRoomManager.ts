import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { Dictionary } from "flash/utils";
import { ALLIANCES, BASE, CModifiableProperty, GLOBAL, IMapRoom, IMapRoomCell, INFERNO_DESCENT_POPUPS, KEYS, LOGGER, MONSTERBAITER, MapRoom3, MapRoom3Cell, PLEASEWAIT, SingletonLock, URLLoaderApi, WMATTACK, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class MapRoomManager extends ASObject {
    static {
        as3.fields(this, { m_CurrentMapRoom: null, m_MapRoom3URL: null, m_MapRoomVersion: 1, m_AttackCostMultiplier: null });
    }

    private static s_Instance: MapRoomManager = null;

    public static readonly MAP_ROOM_VERSION_1: int = 1;

    public static readonly MAP_ROOM_VERSION_2: int = 2;

    public static readonly MAP_ROOM_VERSION_3: int = 3;
    private m_CurrentMapRoom: IMapRoom;
    private m_MapRoom3URL: string;
    private m_MapRoomVersion: int;
    private m_AttackCostMultiplier: CModifiableProperty;

    public $ctor(param1?: SingletonLock): void {
        this.m_AttackCostMultiplier = new CModifiableProperty(Number.MAX_VALUE, Number.MIN_VALUE, 1);
        super.$ctor();
    }

    public static get instance(): MapRoomManager {
        return MapRoomManager.s_Instance = MapRoomManager.s_Instance || new MapRoomManager(new SingletonLock());
    }

    public get currentMapRoom(): IMapRoom {
        return this.m_CurrentMapRoom;
    }

    public get mapRoom3URL(): string {
        return this.m_MapRoom3URL;
    }

    public set mapRoom3URL(param1: string) {
        this.m_MapRoom3URL = param1;
    }

    public get attackCostMultiplier(): CModifiableProperty {
        return this.m_AttackCostMultiplier;
    }

    public get isInMapRoom2(): boolean {
        return this.m_MapRoomVersion == MapRoomManager.MAP_ROOM_VERSION_2;
    }

    public get isInMapRoom3(): boolean {
        return this.m_MapRoomVersion == MapRoomManager.MAP_ROOM_VERSION_3;
    }

    public get isInMapRoom2or3(): boolean {
        return this.isInMapRoom2 || this.isInMapRoom3;
    }

    public set bookmarkData(param1: any) {
        this.m_CurrentMapRoom.bookmarkData = param1;
    }

    public set mapWidth(param1: int) {
        this.m_CurrentMapRoom.mapWidth = param1;
    }

    public set mapHeight(param1: int) {
        this.m_CurrentMapRoom.mapHeight = param1;
    }

    public get worldID(): int {
        return this.m_CurrentMapRoom.worldID;
    }

    public set worldID(param1: int) {
        this.m_CurrentMapRoom.worldID = param1;
    }

    public get isOpen(): boolean {
        return this.m_CurrentMapRoom.isOpen;
    }

    public get flingerInRange(): boolean {
        return this.m_CurrentMapRoom.flingerInRange;
    }

    public get viewOnly(): boolean {
        return this.m_CurrentMapRoom.viewOnly;
    }

    public get playerOwnedCells(): Vector<IMapRoomCell> {
        return this.m_CurrentMapRoom.playerOwnedCells;
    }

    public get allianceDataById(): Dictionary {
        return this.m_CurrentMapRoom.allianceDataById;
    }

    public init(onMapRoom3: boolean, mapRoom3HeaderURL: string): void {
        this.m_CurrentMapRoom = as3.cast(onMapRoom3 ? new MapRoom3(mapRoom3HeaderURL) : new MapRoom(), IMapRoom);
        if (onMapRoom3) {
            this.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_3;
        }
    }

    public OnMapRoom3RelocationSuccessful(param1: string): void {
        this.BookmarksClear();
        GLOBAL._currentCell = null;
        this.m_CurrentMapRoom = new MapRoom3(param1);
    }

    public set mapRoomVersion(param1: int) {
        if (param1 != MapRoomManager.MAP_ROOM_VERSION_1 && param1 != MapRoomManager.MAP_ROOM_VERSION_2 && param1 != MapRoomManager.MAP_ROOM_VERSION_3) {
            return;
        }
        if (param1 == MapRoomManager.MAP_ROOM_VERSION_1 && this.m_CurrentMapRoom instanceof MapRoom3) {
            param1 = MapRoomManager.MAP_ROOM_VERSION_3;
        }
        this.m_MapRoomVersion = param1;
    }

    public get mapRoomVersion(): int {
        return this.m_MapRoomVersion;
    }

    public SetupAndShow(): void {
        this.m_CurrentMapRoom.Setup();
        this.Show();
    }

    public Show(): void {
        if (GLOBAL.mode === "build") {
            GLOBAL.m_mapRoomFunctional = true;
        }
        if (WMATTACK._inProgress || Boolean(MONSTERBAITER._attacking)) {
            return;
        }
        if (!GLOBAL._flags.discordOldEnough) {
            GLOBAL.Message(KEYS.Get("newmap_discord_age"));
            return;
        }
        if (GLOBAL._flags.maproom2 != 1) {
            GLOBAL.Message(KEYS.Get("map_msg_disabled"));
            return;
        }
        if ((!BASE.isMainYard || GLOBAL._bMap && GLOBAL._bMap._canFunction || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) && (GLOBAL.mode == "help" || !this.isOpen)) {
            PLEASEWAIT.Show(KEYS.Get("newmap_opening"));
            if (this.isOpen) {
                this.Hide();
            }
            GLOBAL._showMapWaiting = 1;
            return;
        }
        if (!GLOBAL._bMap) {
            GLOBAL.Message(KEYS.Get("map_msg_notbuilt"));
            return;
        }
        if (!GLOBAL._bMap._canFunction) {
            GLOBAL.Message(KEYS.Get("map_msg_damaged"));
            return;
        }
    }

    public ReadyToShow(): boolean {
        return this.m_CurrentMapRoom.ReadyToShow();
    }

    public ShowDelayed(param1: boolean = false): void {
        this.m_CurrentMapRoom.ShowDelayed(param1);
    }

    public Hide(): void {
        this.m_CurrentMapRoom.Hide();
    }

    public Tick(): void {
        this.m_CurrentMapRoom.Tick();
    }

    public TickFast(): void {
        if (this.m_CurrentMapRoom != null) {
            this.m_CurrentMapRoom.TickFast();
        }
    }

    public BookmarksClear(): void {
        this.m_CurrentMapRoom.BookmarksClear();
    }

    public ResizeHandler(): void {
        this.m_CurrentMapRoom.ResizeHandler();
    }

    public FindCell(param1: int, param2: int): IMapRoomCell {
        return this.m_CurrentMapRoom.FindCell(param1, param2);
    }

    public LoadCell(param1: int, param2: int, param3: boolean = false): void {
        this.m_CurrentMapRoom.LoadCell(param1, param2, param3);
    }

    public CalculateCellId(param1: int, param2: int): int {
        return this.m_CurrentMapRoom.CalculateCellId(param1, param2);
    }

    public GetHexCellsInRange(param1: int, param2: int, param3: int): Vector<MapRoom3Cell> {
        let _loc4_: MapRoom3 = null;
        return !(!(_loc4_ = as3.as(this.m_CurrentMapRoom, MapRoom3))) ? _loc4_.GetHexCellsInRange(param1, param2, param3) : new Vector<MapRoom3Cell>(0, false, MapRoom3Cell);
    }

    public GetClosestCell(param1: int, param2: int, param3: int): MapRoom3Cell {
        let _loc4_: MapRoom3 = null;
        return !(!(_loc4_ = as3.as(this.m_CurrentMapRoom, MapRoom3))) ? _loc4_.GetClosestCell(param1, param2, param3) : null;
    }

    public UpgradeToMapRoom3(): void {
        if (GLOBAL.INFERNO_ONLY) {
            // There is no Map Room 3 on an inferno-only server.
            return;
        }
        if (ALLIANCES._myAlliance != null) {
            GLOBAL.Message(KEYS.Get("map_alliance_upgrade", { "v1": ALLIANCES._myAlliance.name }));
            return;
        }

        GLOBAL._save = false;
        PLEASEWAIT.Show(KEYS.Get("upgrading_to_map_room3"));
        new URLLoaderApi().load(this.m_MapRoom3URL + "setmapversion", [["version", 3]], as3.bind(this, this.MapRoom3UpgradeSuccess), as3.bind(this, this.MapRoom3UpgradeFail));
    }

    private MapRoom3UpgradeSuccess(param1: any): void {
        GLOBAL._save = true;
        if (param1.error == 0) {
            this.init(true, GLOBAL._apiURL + "bm/getnewmap");
            this.m_CurrentMapRoom.Setup();

            PLEASEWAIT.Show(KEYS.Get("nwm_loading"));
            GLOBAL._showMapWaiting = 1;
        } else {
            PLEASEWAIT.Hide();
            LOGGER.Log("err", as3.str(param1.error));
            GLOBAL.ErrorMessage("Error upgrading to Map Room 3");
        }
    }

    private MapRoom3UpgradeFail(param1: IOErrorEvent): void {
        GLOBAL._save = true;
        PLEASEWAIT.Hide();
        LOGGER.Log("err", "HTTP error upgrading to Map Room 3");
        GLOBAL.ErrorMessage("HTTP error upgrading to Map Room 3");
    }

    public DowngradeFromMapRoom3(): void {
        if (this.m_CurrentMapRoom instanceof MapRoom3) {
            this.m_CurrentMapRoom = new MapRoom();
        }
        this.m_MapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
    }

    public CheckForAndForceUpgradeFromMapRoom1(): void {
        if (this.isInMapRoom3 == true) {
            return;
        }
        if (this.currentMapRoom instanceof MapRoom3) {
            return;
        }
        if (BASE.isInfernoMainYardOrOutpost == true) {
            return;
        }
        if (INFERNO_DESCENT_POPUPS.isInDescent() == true) {
            return;
        }
        if (PLEASEWAIT._mc != null) {
            return;
        }
        if (MapRoomManager.instance.isInMapRoom2 == false) {
        }
    }
}
