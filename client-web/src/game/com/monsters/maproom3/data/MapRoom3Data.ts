import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Point } from "flash/geom";
import { Dictionary, getTimer } from "flash/utils";
import { Bookmark, EnumYardType, IMapRoomCell, LOGIN, MapRoom3, MapRoom3AllianceData, MapRoom3Cell, MapRoom3TileSetManager, MapRoomManager, URLLoaderApi } from "@game";

export class MapRoom3Data extends ASObject {
    static {
        as3.fields(this, { m_Width: 0, m_Height: 0, m_BorderCell: null, m_MapRoom3Cells: null, m_PlayerOwnedCells: null, m_AllianceDataById: null, m_PendingCellDataRequest: null, m_ExpiryTimeByCellId: null, m_CreatingMapData: null, m_CellCreationIndexX: -1, m_CellCreationIndexY: -1, m_InitialCellData: null, m_InitialPlayerCellData: null, m_InitialCentrePoint: null });
    }

    private static readonly CELL_LOAD_BUFFER_X: int = 30;

    private static readonly CELL_LOAD_BUFFER_Y: int = 30;

    private static readonly MAX_CELLS_TO_REQUEST: int = 500;

    private static readonly DEFAULT_CELL_EXPIRIY_TIME: int = 120000;

    private static readonly PLAYER_CELL_EXPIRIY_TIME: int = 30000;

    private static readonly CELL_CREATION_LOOP_TIMEOUT: int = 25;

    public static DEBUG_WORLD_ID: int = 0;
    private m_Width: int;
    private m_Height: int;
    private m_BorderCell: MapRoom3Cell;
    private m_MapRoom3Cells: Vector<MapRoom3Cell>;
    private m_PlayerOwnedCells: Vector<IMapRoomCell>;
    private m_AllianceDataById: Dictionary;
    private m_PendingCellDataRequest: any;
    private m_ExpiryTimeByCellId: Dictionary;
    private m_CreatingMapData: any;
    private m_CellCreationIndexX: int;
    private m_CellCreationIndexY: int;
    private m_InitialCellData: any;
    private m_InitialPlayerCellData: any;
    private m_InitialCentrePoint: Point;

    public $ctor(serverData: any = null): void {
        this.m_AllianceDataById = new Dictionary();
        this.m_ExpiryTimeByCellId = new Dictionary();
        super.$ctor();
        if (serverData == null) {
            serverData = MapRoom3Data.GenerateDefaultMapData();
        }
        this.m_Width = serverData.width | 0;
        this.m_Height = serverData.height | 0;
        this.m_BorderCell = new MapRoom3Cell(0, 0, MapRoom3TileSetManager.BORDER_CELL_HEIGHT, EnumYardType.BORDER);
        let _loc2_: int = (this.m_Width * this.m_Height) | 0;
        this.m_MapRoom3Cells = new Vector<MapRoom3Cell>(_loc2_, false, MapRoom3Cell);
        this.m_PlayerOwnedCells = new Vector<IMapRoomCell>(0, false, IMapRoomCell);
        this.m_CreatingMapData = serverData;
        this.m_CellCreationIndexX = 0;
        this.m_CellCreationIndexY = 0;
        this.UpdateCellCreation();
    }

    public static GetCellsRequestURL(): string {
        return MapRoomManager.instance.mapRoom3URL + "getcells";
    }

    private static GenerateDefaultMapData(): any {
        let _loc4_: int = 0;
        let _loc1_: int = 500;
        let _loc2_: any = {};
        _loc2_.width = _loc1_;
        _loc2_.height = _loc1_;
        _loc2_.data = new Array();
        let _loc3_: int = 0;
        while (_loc3_ < _loc1_) {
            _loc4_ = 0;
            while (_loc4_ < _loc1_) {
                _loc2_.data.push({ "h": 0, "t": EnumYardType.EMPTY });
                _loc4_++;
            }
            _loc3_++;
        }
        return _loc2_;
    }

    public get mapWidth(): number {
        return this.m_Width;
    }

    public get mapHeight(): number {
        return this.m_Height;
    }

    public get playerOwnedCells(): Vector<IMapRoomCell> {
        return this.m_PlayerOwnedCells;
    }

    public get homeCell(): IMapRoomCell {
        return Boolean(this.m_PlayerOwnedCells) && Boolean(this.m_PlayerOwnedCells.length) ? as3.vget(this.m_PlayerOwnedCells, 0) : null;
    }

    public get allianceDataById(): Dictionary {
        return this.m_AllianceDataById;
    }

    public get areAllCellsCreated(): boolean {
        return this.m_CreatingMapData == null;
    }

    public get isInitialCellDataLoaded(): boolean {
        return this.m_InitialCellData != null && this.m_InitialPlayerCellData != null;
    }

    public UpdateCellCreation(): void {
        let index: int = 0;
        let cellData: any = null;
        if (this.areAllCellsCreated == true) {
            return;
        }
        // Timeout disabled - we have a loading screen that blocks interaction anyway
        // No need to artificially slow down cell creation with time-slicing
        // var timer:int = getTimer();
        this.m_CellCreationIndexX;
        while (this.m_CellCreationIndexX < this.m_Width) {
            this.m_CellCreationIndexY;
            while (this.m_CellCreationIndexY < this.m_Height) {
                index = this.GetCellIndex(this.m_CellCreationIndexX, this.m_CellCreationIndexY);
                cellData = this.m_CreatingMapData.data[index];
                as3.vset(this.m_MapRoom3Cells, index, new MapRoom3Cell(this.m_CellCreationIndexX, this.m_CellCreationIndexY, cellData.h | 0, cellData.t | 0));
                // Timeout check disabled for faster loading
                // if(getTimer() - timer > CELL_CREATION_LOOP_TIMEOUT)
                // {
                // return;
                // }
                ++this.m_CellCreationIndexY;
            }
            this.m_CellCreationIndexY = 0;
            ++this.m_CellCreationIndexX;
        }
        this.m_CreatingMapData = null;
    }

    public LoadInitialCellData(param1: Point): void {
        let _loc3_: uint = 0;
        let _loc4_: uint = 0;
        if (this.areAllCellsCreated) {
            _loc3_ = this.m_MapRoom3Cells.length >>> 0;
            _loc4_ = 0;
            while (_loc4_ < _loc3_) {
                as3.vget(this.m_MapRoom3Cells, _loc4_).ClearData();
                _loc4_++;
            }
            as3.vsetLength(this.m_PlayerOwnedCells, 0);
        }
        this.m_InitialCentrePoint = param1;
        let _loc2_: any[] = [];
        if (MapRoom3Data.DEBUG_WORLD_ID) {
            _loc2_.push(["worldid", MapRoom3Data.DEBUG_WORLD_ID]);
        }
        _loc2_.push(["token", LOGIN.token]);
        new URLLoaderApi().load(MapRoomManager.instance.mapRoom3URL + "initworldmap", _loc2_, as3.bind(this, this.OnInitialPlayerCellDataLoaded));
    }

    private OnInitialPlayerCellDataLoaded(serverData: any): void {
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        this.m_InitialPlayerCellData = serverData;
        if (this.m_InitialCentrePoint == null) {
            this.m_InitialCentrePoint = new Point(serverData.celldata[0].x, serverData.celldata[0].y);
        }
        let _loc2_: any[] = [];
        let _loc3_: int = Math.max(0, this.m_InitialCentrePoint.x - MapRoom3Data.CELL_LOAD_BUFFER_X) | 0;
        let _loc4_: int = Math.min(this.m_Width, this.m_InitialCentrePoint.x + MapRoom3Data.CELL_LOAD_BUFFER_Y + 1) | 0;
        let _loc5_: int = Math.max(0, this.m_InitialCentrePoint.y - MapRoom3Data.CELL_LOAD_BUFFER_Y) | 0;
        let _loc6_: int = Math.min(this.m_Height, this.m_InitialCentrePoint.y + MapRoom3Data.CELL_LOAD_BUFFER_Y + 1) | 0;
        let _loc7_: int = _loc3_;
        while (_loc7_ < _loc4_) {
            _loc9_ = _loc5_;
            while (_loc9_ < _loc6_) {
                _loc10_ = MapRoomManager.instance.CalculateCellId(_loc7_, _loc9_);
                _loc2_.push(_loc10_);
                _loc9_++;
            }
            _loc7_++;
        }
        let _loc8_: any[] = [["cellids", JSON.stringify(_loc2_)]];
        if (MapRoom3Data.DEBUG_WORLD_ID) {
            _loc8_.push(["worldid", MapRoom3Data.DEBUG_WORLD_ID]);
        }
        _loc8_.push(["token", LOGIN.token]);
        // TODO: Why does the server still return cells if we don't send a token? verify auth should fail?
        new URLLoaderApi().load(MapRoom3Data.GetCellsRequestURL(), _loc8_, as3.bind(this, this.OnInitialCellDataLoaded));
    }

    private OnInitialCellDataLoaded(serverData: any): void {
        this.m_InitialCellData = serverData;
    }

    public ParseInitialCellData(): void {
        if (this.m_InitialPlayerCellData != null) {
            this.ParseCellData(this.m_InitialPlayerCellData);
        }
        if (this.m_InitialCellData != null) {
            this.ParseCellData(this.m_InitialCellData);
        }
    }

    private GetCellIndex(param1: int, param2: int): int {
        return (param1 < 0 || param2 < 0 || param1 >= this.m_Width || param2 >= this.m_Height ? -1 : param2 * this.m_Width + param1) | 0;
    }

    public GetMapRoom3Cell(param1: int, param2: int): MapRoom3Cell {
        let _loc3_: int = this.GetCellIndex(param1, param2);
        if (_loc3_ != -1 && this.m_MapRoom3Cells.length > _loc3_) {
            return as3.vget(this.m_MapRoom3Cells, _loc3_);
        }
        return this.m_BorderCell;
    }

    public Clear(): void {
        this.m_PendingCellDataRequest = null;
        this.m_InitialCellData = null;
        this.m_InitialPlayerCellData = null;
        this.m_InitialCentrePoint = null;
        this.m_ExpiryTimeByCellId = new Dictionary();
        this.m_AllianceDataById = new Dictionary();
    }

    public LoadBookmarkedCells(param1: Vector<Bookmark>): void {
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        if (this.m_PendingCellDataRequest != null) {
            return;
        }
        let _loc2_: any[] = [];
        let _loc3_: int = getTimer();
        let _loc4_: int = param1.length | 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            _loc7_ = as3.vget(param1, _loc5_).cellX;
            _loc8_ = as3.vget(param1, _loc5_).cellY;
            if (!(_loc7_ < 0 || _loc7_ >= this.m_Width || _loc8_ < 0 || _loc8_ >= this.m_Height)) {
                _loc9_ = MapRoomManager.instance.CalculateCellId(_loc7_, _loc8_);
                if (!(this.m_ExpiryTimeByCellId.get(_loc9_) != null && (this.m_ExpiryTimeByCellId.get(_loc9_) == -1 || _loc3_ < this.m_ExpiryTimeByCellId.get(_loc9_)))) {
                    this.m_ExpiryTimeByCellId.set(_loc9_, -1);
                    _loc2_.push(_loc9_);
                    if (_loc2_.length >= MapRoom3Data.MAX_CELLS_TO_REQUEST) {
                        break;
                    }
                }
            }
            _loc5_++;
        }
        if (_loc2_.length == 0) {
            return;
        }
        let _loc6_: any[] = [["cellids", JSON.stringify(_loc2_)]];
        if (MapRoom3Data.DEBUG_WORLD_ID) {
            _loc6_.push(["worldid", MapRoom3Data.DEBUG_WORLD_ID]);
        }
        _loc6_.push(["token", LOGIN.token]);
        this.m_PendingCellDataRequest = _loc6_;
        new URLLoaderApi().load(MapRoom3Data.GetCellsRequestURL(), _loc6_, as3.bind(this, this.OnCellDataLoaded));
    }

    public UpdateCellLoading(param1: Point): void {
        let _loc13_: int = 0;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: int = 0;
        if (this.m_PendingCellDataRequest != null) {
            return;
        }
        let _loc2_: any[] = [];
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = -1;
        let _loc7_: int = param1.x | 0;
        let _loc8_: int = param1.y | 0;
        let _loc9_: int = getTimer();
        let _loc10_: int = (MapRoom3Data.CELL_LOAD_BUFFER_X * MapRoom3Data.CELL_LOAD_BUFFER_Y * 4) | 0;
        let _loc11_: uint = 0;
        while (_loc11_ < _loc10_) {
            _loc13_ = (_loc7_ + _loc3_) | 0;
            _loc14_ = (_loc8_ + _loc4_) | 0;
            if (_loc3_ == _loc4_ || _loc3_ < 0 && _loc3_ == -_loc4_ || _loc3_ > 0 && _loc3_ == 1 - _loc4_) {
                _loc16_ = _loc5_;
                _loc5_ = (-_loc6_) | 0;
                _loc6_ = _loc16_;
            }
            _loc3_ += _loc5_;
            _loc4_ += _loc6_;
            if (!(_loc13_ < 0 || _loc13_ >= this.m_Width || _loc14_ < 0 || _loc14_ >= this.m_Height)) {
                _loc15_ = MapRoomManager.instance.CalculateCellId(_loc13_, _loc14_);
                if (!(this.m_ExpiryTimeByCellId.get(_loc15_) != null && (this.m_ExpiryTimeByCellId.get(_loc15_) == -1 || _loc9_ < this.m_ExpiryTimeByCellId.get(_loc15_)))) {
                    this.m_ExpiryTimeByCellId.set(_loc15_, -1);
                    _loc2_.push(_loc15_);
                    if (_loc2_.length >= MapRoom3Data.MAX_CELLS_TO_REQUEST) {
                        break;
                    }
                }
            }
            _loc11_++;
        }
        if (_loc2_.length == 0) {
            return;
        }
        let _loc12_: any[] = [["cellids", JSON.stringify(_loc2_)]];
        if (MapRoom3Data.DEBUG_WORLD_ID) {
            _loc12_.push(["worldid", MapRoom3Data.DEBUG_WORLD_ID]);
        }
        _loc12_.push(["token", LOGIN.token]);
        this.m_PendingCellDataRequest = _loc12_;
        new URLLoaderApi().load(MapRoom3Data.GetCellsRequestURL(), _loc12_, as3.bind(this, this.OnCellDataLoaded));
    }

    private OnCellDataLoaded(serverData: any): void {
        if (this.m_PendingCellDataRequest == null) {
            return;
        }
        this.m_PendingCellDataRequest = null;
        this.ParseCellData(serverData);
    }

    private ParseCellData(serverData: any): void {
        let cellDataArray: any[] = null;
        let cellData: any = null;
        let mapRoomCell: MapRoom3Cell = null;
        let cellID: int = 0;
        if (serverData == null || serverData.celldata == null) {
            return;
        }
        cellDataArray = as3.cast(serverData.celldata, Array);
        let timer: int = getTimer();
        let cellDataArrayLength: uint = cellDataArray.length;
        let index: int = 0;
        while (index < cellDataArrayLength) {
            cellData = cellDataArray[index];
            (mapRoomCell = this.GetMapRoom3Cell(cellData.x | 0, cellData.y | 0)).Setup(cellData);
            cellID = MapRoomManager.instance.CalculateCellId(mapRoomCell.cellX, mapRoomCell.cellY);
            this.m_ExpiryTimeByCellId.set(cellID, timer + MapRoom3Data.DEFAULT_CELL_EXPIRIY_TIME);
            if (mapRoomCell.isOwnedByPlayer) {
                this.m_ExpiryTimeByCellId.set(cellID, timer + MapRoom3Data.PLAYER_CELL_EXPIRIY_TIME);
                this.UpdateCellsInAttackRange(mapRoomCell);
                if (this.m_PlayerOwnedCells.indexOf(mapRoomCell) == -1) {
                    this.m_PlayerOwnedCells.push(mapRoomCell);
                }
            }
            if (mapRoomCell.cellType == EnumYardType.STRONGHOLD) {
                this.UpdateCellsInStrongholdRange(mapRoomCell);
            }
            index++;
        }
        if (serverData.alliancedata != null) {
            this.OnAllianceDataLoaded(as3.cast(serverData.alliancedata, Array));
        }
        if (MapRoom3.mapRoom3Window != null) {
            MapRoom3.mapRoom3Window.Refresh();
        }
    }

    private UpdateCellsInAttackRange(param1: MapRoom3Cell): void {
        let _loc2_: MapRoom3Cell = null;
        let _loc3_: Vector<MapRoom3Cell> = null;
        _loc3_ = this.GetHexCellsInRange(param1, param1.attackRange);
        let _loc4_: uint = _loc3_.length >>> 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            _loc2_ = as3.vget(_loc3_, _loc5_);
            param1.AddCellInAttackRange(_loc2_);
            _loc2_.AddInAttackRangeOf(param1);
            _loc5_++;
        }
    }

    private UpdateCellsInStrongholdRange(param1: MapRoom3Cell): void {
        let _loc2_: MapRoom3Cell = null;
        let _loc3_: Vector<MapRoom3Cell> = null;
        _loc3_ = this.GetHexCellsInRange(param1, param1.attackRange);
        let _loc4_: uint = _loc3_.length >>> 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            _loc2_ = as3.vget(_loc3_, _loc5_);
            _loc2_.AddInRangeOfStronghold(param1);
            _loc5_++;
        }
    }

    private OnAllianceDataLoaded(param1: any[]): void {
        let _loc4_: any = null;
        let _loc5_: int = 0;
        let _loc2_: uint = param1.length;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc5_ = (_loc4_ = param1[_loc3_]).alliance_id | 0;
            if (this.m_AllianceDataById.get(_loc5_) != null) {
                this.m_AllianceDataById.get(_loc5_).Map(_loc4_);
            } else {
                this.m_AllianceDataById.set(_loc5_, new MapRoom3AllianceData(_loc4_));
            }
            _loc3_++;
        }
    }

    public GetHexCellsInRange(param1: MapRoom3Cell, param2: int): Vector<MapRoom3Cell> {
        let _loc3_: MapRoom3Cell = null;
        let _loc12_: int = 0;
        let _loc4_: Vector<MapRoom3Cell> = new Vector<MapRoom3Cell>(0, false, MapRoom3Cell);
        let _loc5_: int = param1.cellX;
        let _loc6_: int = param1.cellY;
        let _loc7_: int = 0;
        let _loc8_: int = ((_loc7_ = (_loc5_ - (!(!(_loc6_ % 2)) ? Math.floor(Number(param2) * 0.5) : Math.ceil(Number(param2) * 0.5))) | 0) + param2) | 0;
        let _loc9_: int = (_loc6_ - param2) | 0;
        let _loc10_: int = (_loc6_ + param2) | 0;
        let _loc11_: int = _loc9_;
        while (_loc11_ <= _loc10_) {
            _loc12_ = _loc7_;
            while (_loc12_ <= _loc8_) {
                _loc3_ = this.GetMapRoom3Cell(_loc12_, _loc11_);
                if (_loc3_ != null && _loc3_ != this.m_BorderCell) {
                    _loc4_.push(_loc3_);
                }
                _loc12_++;
            }
            if (_loc11_ < _loc6_) {
                if (_loc11_ % 2) {
                    _loc8_++;
                } else {
                    _loc7_--;
                }
            } else if (_loc11_ % 2) {
                _loc7_++;
            } else {
                _loc8_--;
            }
            _loc11_++;
        }
        return _loc4_;
    }
}
