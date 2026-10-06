import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { Event, IOErrorEvent, SecurityErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { URLLoader, URLRequest, URLRequestHeader, URLRequestMethod, URLVariables } from "flash/net";
import { Dictionary } from "flash/utils";
import { BASE, BookmarksManager, FriendPicker, GLOBAL, IMapRoom, IMapRoomCell, LOGIN, MapRoom3AssetCache, MapRoom3Cell, MapRoom3Data, MapRoom3TileSetManager, MapRoom3Window, MapRoom3WindowHUD, UI2 } from "@game";

export class MapRoom3 extends ASObject implements IMapRoom {
    static {
        as3.implement(this, [IMapRoom]);
        as3.fields(this, { m_HeightMapLoader: null, m_MapRoom3Data: null, m_CurrentBookmarkData: null, m_LastCenterPoint: null, m_WorldID: 0, m_Open: false });
    }

    private static m_MapRoom3Window: MapRoom3Window = null;

    private static m_MapRoom3WindowHUD: MapRoom3WindowHUD = null;
    private m_HeightMapLoader: URLLoader;
    private m_MapRoom3Data: MapRoom3Data;
    private m_CurrentBookmarkData: any;
    private m_LastCenterPoint: Point;
    private m_WorldID: int;
    private m_Open: boolean;

    public $ctor(headerUrl?: string): void {
        this.m_CurrentBookmarkData = {};
        super.$ctor();
        if (headerUrl != null) {
            let req: URLRequest = new URLRequest(headerUrl);
            req.method = URLRequestMethod.POST;
            req.data = new URLVariables();
            req.requestHeaders.push(new URLRequestHeader("Authorization", "Bearer " + LOGIN.token));

            this.m_HeightMapLoader = new URLLoader(req);
            this.m_HeightMapLoader.addEventListener(Event.COMPLETE, as3.bind(this, this.OnHeightMapLoaded), false, 0, true);
            this.m_HeightMapLoader.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.OnHeightMapLoadFailed), false, 0, true);
            this.m_HeightMapLoader.addEventListener(IOErrorEvent.NETWORK_ERROR, as3.bind(this, this.OnHeightMapLoadFailed), false, 0, true);
            this.m_HeightMapLoader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, as3.bind(this, this.OnHeightMapLoadFailed), false, 0, true);
        }
    }

    public static get mapRoom3Window(): MapRoom3Window {
        return MapRoom3.m_MapRoom3Window;
    }

    public static get mapRoom3WindowHUD(): MapRoom3WindowHUD {
        return MapRoom3.m_MapRoom3WindowHUD;
    }

    public set bookmarkData(param1: any) {
        this.m_CurrentBookmarkData = param1;
    }

    public get playerOwnedCells(): Vector<IMapRoomCell> {
        return !(!this.m_MapRoom3Data) ? this.m_MapRoom3Data.playerOwnedCells : null;
    }

    public get allianceDataById(): Dictionary {
        return !(!this.m_MapRoom3Data) ? this.m_MapRoom3Data.allianceDataById : null;
    }

    public get worldID(): int {
        return this.m_WorldID;
    }

    public set worldID(param1: int) {
        this.m_WorldID = param1;
    }

    public get isOpen(): boolean {
        return this.m_Open;
    }

    public set mapWidth(param1: int) {
    }

    public set mapHeight(param1: int) {
    }

    public get flingerInRange(): boolean {
        return true;
    }

    public get viewOnly(): boolean {
        return false;
    }

    public OnHeightMapLoaded(param1: Event): void {
        let serverData: any = JSON.parse(as3.str(this.m_HeightMapLoader.data));
        this.m_MapRoom3Data = new MapRoom3Data(serverData);
        this.m_MapRoom3Data.LoadInitialCellData(this.m_LastCenterPoint);
    }

    public OnHeightMapLoadFailed(param1: Event): void {
        this.m_MapRoom3Data = new MapRoom3Data(null);
        this.m_MapRoom3Data.LoadInitialCellData(this.m_LastCenterPoint);
    }

    public Setup(): void {
        if (this.m_MapRoom3Data != null) {
            this.m_MapRoom3Data.LoadInitialCellData(this.m_LastCenterPoint);
        }
        FriendPicker.ClearContacts();
    }

    public ReadyToShow(): boolean {
        return Boolean(this.m_MapRoom3Data && this.m_MapRoom3Data.areAllCellsCreated && this.m_MapRoom3Data.isInitialCellDataLoaded && MapRoom3AssetCache.instance.areAssetsLoaded && MapRoom3TileSetManager.instance.isCurrentTileSetAndBackgroundLoaded);
    }

    public ShowDelayed(param1: boolean = false): void {
        if (GLOBAL.mode === GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL.m_mapRoomFunctional = true;
        }
        if (this.m_Open == true) {
            return;
        }
        this.m_Open = true;
        BASE.Cleanup();
        this.m_MapRoom3Data.ParseInitialCellData();
        BookmarksManager.instance.Setup(this.m_CurrentBookmarkData, this.m_MapRoom3Data);
        this.m_MapRoom3Data.LoadBookmarkedCells(BookmarksManager.instance.GetBookmarksOfType(BookmarksManager.TYPE_CUSTOM));
        MapRoom3.m_MapRoom3Window = new MapRoom3Window(this.m_MapRoom3Data);
        MapRoom3.m_MapRoom3WindowHUD = new MapRoom3WindowHUD();
        GLOBAL._layerUI.addChild(MapRoom3.m_MapRoom3Window);
        GLOBAL._layerUI.addChild(MapRoom3.m_MapRoom3WindowHUD);
        UI2.SetupHUD();
        if (GLOBAL._currentCell == null) {
            GLOBAL._currentCell = this.m_MapRoom3Data.homeCell;
        }
        if (this.m_LastCenterPoint == null) {
            this.m_LastCenterPoint = new Point(this.m_MapRoom3Data.homeCell.cellX, this.m_MapRoom3Data.homeCell.cellY);
        }
        MapRoom3.m_MapRoom3Window.Init(this.m_LastCenterPoint);
    }

    public Hide(): void {
        this.m_Open = false;
        this.m_LastCenterPoint = MapRoom3.m_MapRoom3Window.centerPoint;
        BookmarksManager.instance.Cleanup();
        this.Cleanup();
    }

    private Cleanup(): void {
        if (MapRoom3.m_MapRoom3WindowHUD != null) {
            MapRoom3.m_MapRoom3WindowHUD.Clear();
            if (MapRoom3.m_MapRoom3WindowHUD.parent != null) {
                MapRoom3.m_MapRoom3WindowHUD.parent.removeChild(MapRoom3.m_MapRoom3WindowHUD);
            }
            MapRoom3.m_MapRoom3WindowHUD = null;
        }
        if (MapRoom3.m_MapRoom3Window != null) {
            MapRoom3.m_MapRoom3Window.Clear();
            if (MapRoom3.m_MapRoom3Window.parent != null) {
                MapRoom3.m_MapRoom3Window.parent.removeChild(MapRoom3.m_MapRoom3Window);
            }
            MapRoom3.m_MapRoom3Window = null;
        }
        if (this.m_MapRoom3Data != null) {
            this.m_MapRoom3Data.Clear();
        }
    }

    public FindCell(param1: int, param2: int): IMapRoomCell {
        return !(!this.m_MapRoom3Data) ? this.m_MapRoom3Data.GetMapRoom3Cell(param1, param2) : null;
    }

    public LoadCell(param1: int, param2: int, param3: boolean = false): void {
    }

    public CalculateCellId(param1: int, param2: int): int {
        return (param2 * this.m_MapRoom3Data.mapWidth + param1 + 1) | 0;
    }

    public GetHexCellsInRange(param1: int, param2: int, param3: int): Vector<MapRoom3Cell> {
        if (this.m_MapRoom3Data == null) {
            return new Vector<MapRoom3Cell>(0, false, MapRoom3Cell);
        }
        let _loc4_: MapRoom3Cell = this.m_MapRoom3Data.GetMapRoom3Cell(param1, param2);
        if (_loc4_ == null) {
            return new Vector<MapRoom3Cell>(0, false, MapRoom3Cell);
        }
        return this.m_MapRoom3Data.GetHexCellsInRange(_loc4_, param3);
    }

    public GetClosestCell(param1: int, param2: int, param3: int): MapRoom3Cell {
        let _loc5_: Vector<MapRoom3Cell> = null;
        let _loc6_: int = 0;
        let _loc9_: MapRoom3Cell = null;
        let _loc10_: MapRoom3Cell = null;
        if (this.m_MapRoom3Data == null) {
            return null;
        }
        let _loc4_: MapRoom3Cell = this.m_MapRoom3Data.GetMapRoom3Cell(param1, param2);
        if (_loc4_ == null) {
            return null;
        }
        _loc5_ = this.m_MapRoom3Data.GetHexCellsInRange(_loc4_, param3);
        let _loc8_: int = int.MAX_VALUE;
        let _loc11_: int = _loc5_.length | 0;
        _loc6_ = (_loc11_ - 1) | 0;
        while (_loc6_ >= 0) {
            _loc9_ = as3.vget(_loc5_, _loc6_);
            if (MapRoom3Cell.GetHexDistanceBetween(_loc9_, _loc10_) < _loc8_) {
                _loc8_ = 0;
                _loc10_ = _loc9_;
            }
            _loc6_--;
        }
        return _loc10_;
    }

    public Tick(): void {
        if (Boolean(this.m_MapRoom3Data) && Boolean(MapRoom3.m_MapRoom3Window)) {
            this.m_MapRoom3Data.UpdateCellLoading(MapRoom3.m_MapRoom3Window.centerPointForLoading);
        }
    }

    public TickFast(): void {
        if (Boolean(this.m_MapRoom3Data) && !this.m_MapRoom3Data.areAllCellsCreated) {
            this.m_MapRoom3Data.UpdateCellCreation();
            return;
        }
        if (MapRoom3.m_MapRoom3Window) {
            MapRoom3.m_MapRoom3Window.TickFast();
        }
    }

    public ResizeHandler(): void {
        if (MapRoom3.m_MapRoom3Window) {
            MapRoom3.m_MapRoom3Window.Resize();
        }
        if (MapRoom3.m_MapRoom3WindowHUD) {
            MapRoom3.m_MapRoom3WindowHUD.Resize();
        }
    }

    public BookmarksClear(): void {
        BookmarksManager.instance.Cleanup();
        BookmarksManager.instance.SaveBookmarks();
    }
}
