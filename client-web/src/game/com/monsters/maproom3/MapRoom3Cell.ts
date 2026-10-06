import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Dictionary } from "flash/utils";
import { ABTest, BASE, Console, EnumBaseRelationship, EnumYardType, GLOBAL, IMapRoomCell, KEYS, LOGIN, MapRoom3, MapRoom3AllianceData, MapRoom3AssetCache, MapRoom3CellData, MapRoom3CellGraphic, MapRoom3Data, MapRoom3TileSetManager, MapRoomManager, PLEASEWAIT, URLLoaderApi } from "@game";

export class MapRoom3Cell extends ASObject implements IMapRoomCell {
    static {
        as3.implement(this, [IMapRoomCell]);
        as3.fields(this, { m_CellData: null, m_CellGraphic: null, m_CellHeaderBitField: 0 });
    }

    private static ATTACK_COST_MULTIPLIERS_BY_TOWN_HALL_LEVEL: any[]; // const

    private static MAX_BITS_CELL_X: uint; // const

    private static MAX_BITS_CELL_Y: uint; // const

    private static MAX_BITS_CELL_HEIGHT: uint; // const

    private static MAX_BITS_CELL_TYPE: uint; // const

    private static MAX_VALUE_CELL_X: uint; // const

    private static MAX_VALUE_CELL_Y: uint; // const

    private static MAX_VALUE_CELL_HEIGHT: uint; // const

    private static MAX_VALUE_CELL_TYPE: uint; // const

    private static BIT_SHIFT_CELL_X: uint; // const

    private static BIT_SHIFT_CELL_Y: uint; // const

    private static BIT_SHIFT_CELL_HEIGHT: uint; // const

    private static BIT_SHIFT_CELL_TYPE: uint; // const

    private static s_CellsInAttackRange: Dictionary;

    private static s_InAttackRangeOfCells: Dictionary;

    private static s_InRangeOfStrongholds: Dictionary;

    private static s_CurrentBuffEffectFrames: Dictionary;

    static {
        as3.lazyStatics(this, { ATTACK_COST_MULTIPLIERS_BY_TOWN_HALL_LEVEL: null, MAX_BITS_CELL_X: 0, MAX_BITS_CELL_Y: 0, MAX_BITS_CELL_HEIGHT: 0, MAX_BITS_CELL_TYPE: 0, MAX_VALUE_CELL_X: 0, MAX_VALUE_CELL_Y: 0, MAX_VALUE_CELL_HEIGHT: 0, MAX_VALUE_CELL_TYPE: 0, BIT_SHIFT_CELL_X: 0, BIT_SHIFT_CELL_Y: 0, BIT_SHIFT_CELL_HEIGHT: 0, BIT_SHIFT_CELL_TYPE: 0, s_CellsInAttackRange: null, s_InAttackRangeOfCells: null, s_InRangeOfStrongholds: null, s_CurrentBuffEffectFrames: null }, () => {
            MapRoom3Cell.ATTACK_COST_MULTIPLIERS_BY_TOWN_HALL_LEVEL = [0, 100, 200, 400, 800, 1600, 4000, 10000, 25000, 75000, 225000];
            MapRoom3Cell.MAX_BITS_CELL_X = 9;
            MapRoom3Cell.MAX_BITS_CELL_Y = 9;
            MapRoom3Cell.MAX_BITS_CELL_HEIGHT = 7;
            MapRoom3Cell.MAX_BITS_CELL_TYPE = 7;
            MapRoom3Cell.MAX_VALUE_CELL_X = (Math.pow(2, MapRoom3Cell.MAX_BITS_CELL_X) - 1) >>> 0;
            MapRoom3Cell.MAX_VALUE_CELL_Y = (Math.pow(2, MapRoom3Cell.MAX_BITS_CELL_Y) - 1) >>> 0;
            MapRoom3Cell.MAX_VALUE_CELL_HEIGHT = (Math.pow(2, MapRoom3Cell.MAX_BITS_CELL_HEIGHT) - 1) >>> 0;
            MapRoom3Cell.MAX_VALUE_CELL_TYPE = (Math.pow(2, MapRoom3Cell.MAX_BITS_CELL_TYPE) - 1) >>> 0;
            MapRoom3Cell.BIT_SHIFT_CELL_X = 0;
            MapRoom3Cell.BIT_SHIFT_CELL_Y = (MapRoom3Cell.BIT_SHIFT_CELL_X + MapRoom3Cell.MAX_BITS_CELL_X) >>> 0;
            MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT = (MapRoom3Cell.BIT_SHIFT_CELL_Y + MapRoom3Cell.MAX_BITS_CELL_Y) >>> 0;
            MapRoom3Cell.BIT_SHIFT_CELL_TYPE = (MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT + MapRoom3Cell.MAX_BITS_CELL_HEIGHT) >>> 0;
            MapRoom3Cell.s_CellsInAttackRange = new Dictionary();
            MapRoom3Cell.s_InAttackRangeOfCells = new Dictionary();
            MapRoom3Cell.s_InRangeOfStrongholds = new Dictionary();
            MapRoom3Cell.s_CurrentBuffEffectFrames = new Dictionary();
        });
    }
    private m_CellData: MapRoom3CellData;
    private m_CellGraphic: MapRoom3CellGraphic;
    private m_CellHeaderBitField: uint;

    public $ctor(param1?: int, param2?: int, param3?: int, param4?: int): void {
        super.$ctor();
        if (param4 == -1) {
            param4 = EnumYardType.EMPTY | 0;
        }
        this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (param1 & MapRoom3Cell.MAX_VALUE_CELL_X) << MapRoom3Cell.BIT_SHIFT_CELL_X) >>> 0;
        this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (param2 & MapRoom3Cell.MAX_VALUE_CELL_Y) << MapRoom3Cell.BIT_SHIFT_CELL_Y) >>> 0;
        this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (param3 & MapRoom3Cell.MAX_VALUE_CELL_HEIGHT) << MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT) >>> 0;
        this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (param4 & MapRoom3Cell.MAX_VALUE_CELL_TYPE) << MapRoom3Cell.BIT_SHIFT_CELL_TYPE) >>> 0;
    }

    public static GetHexDistanceBetween(param1: IMapRoomCell, param2: IMapRoomCell): int {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        _loc3_ = param1.cellY;
        _loc4_ = param2.cellY;
        _loc5_ = (param1.cellX - Math.floor(_loc3_ * 0.5)) | 0;
        let _loc7_: int = ((_loc6_ = (param2.cellX - Math.floor(_loc4_ * 0.5)) | 0) - _loc5_) | 0;
        let _loc8_: int = (_loc4_ - _loc3_) | 0;
        if (_loc7_ * _loc8_ >= 0) {
            return Math.abs(_loc7_ + _loc8_) | 0;
        }
        return Math.max(Math.abs(_loc7_), Math.abs(_loc8_)) | 0;
    }

    public get cellX(): int {
        return this.m_CellHeaderBitField >> MapRoom3Cell.BIT_SHIFT_CELL_X & MapRoom3Cell.MAX_VALUE_CELL_X;
    }

    public get cellY(): int {
        return this.m_CellHeaderBitField >> MapRoom3Cell.BIT_SHIFT_CELL_Y & MapRoom3Cell.MAX_VALUE_CELL_Y;
    }

    public get cellHeight(): int {
        return this.m_CellHeaderBitField >> MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT & MapRoom3Cell.MAX_VALUE_CELL_HEIGHT;
    }

    public get cellType(): int {
        return this.m_CellHeaderBitField >> MapRoom3Cell.BIT_SHIFT_CELL_TYPE & MapRoom3Cell.MAX_VALUE_CELL_TYPE;
    }

    public get baseType(): int {
        return this.cellType;
    }

    public get cellGraphic(): MapRoom3CellGraphic {
        return this.m_CellGraphic;
    }

    public set cellGraphic(param1: MapRoom3CellGraphic) {
        this.m_CellGraphic = param1;
    }

    public get name(): string {
        return !(!this.m_CellData) ? this.m_CellData.name : "";
    }

    public get facebookID(): string {
        return !(!this.m_CellData) ? this.m_CellData.facebookID : "";
    }

    public get baseID(): number {
        return Number(!(!this.m_CellData) ? this.m_CellData.baseID : 0);
    }

    public get userID(): int {
        return !(!this.m_CellData) ? this.m_CellData.userID : 0;
    }

    public get allianceID(): int {
        return !(!this.m_CellData) ? this.m_CellData.allianceID : 0;
    }

    public get wildMonsterTribeId(): int {
        return !(!this.m_CellData) ? this.m_CellData.wildMonsterTribeId : 0;
    }

    public get relationship(): int {
        return !(!this.m_CellData) ? this.m_CellData.relationship : EnumBaseRelationship.k_RELATIONSHIP_NONE;
    }

    public get baseLevel(): int {
        return !(!this.m_CellData) ? this.m_CellData.baseLevel : 0;
    }

    public get playerLevel(): int {
        return !(!this.m_CellData) ? this.m_CellData.playerLevel : 0;
    }

    public get picSquare(): string {
        return !(!this.m_CellData) ? this.m_CellData.pic_square : "";
    }

    public get damage(): int {
        return !(!this.m_CellData) ? this.m_CellData.damage : 0;
    }

    public get damagePercentage(): number {
        return Number(this.damage) / 100;
    }

    public get attackRange(): int {
        return !(!this.m_CellData) ? this.m_CellData.attackRange : 0;
    }

    public get attackCost(): any[] {
        return this.CalculateAttackCosts();
    }

    public get containsValidBase(): boolean {
        return this.baseID != 0;
    }

    public get hasDamageProtection(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.hasDamageProtection : false;
    }

    public get hasTruce(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.hasTruce : false;
    }

    public get isBorder(): boolean {
        return this.cellType == EnumYardType.BORDER;
    }

    public get isBlocked(): boolean {
        return this.isBorder || this.cellHeight >= MapRoom3TileSetManager.BLOCKED_CELL_STARTING_HEIGHT;
    }

    public get isDataLoaded(): boolean {
        return this.m_CellData != null;
    }

    public get isDestroyed(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.isDestroyed : false;
    }

    public get isLocked(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.isLocked : false;
    }

    public get isInvisible(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.isInvisible && !this.isOwnedByPlayer : false;
    }

    public get isOwnedByPlayer(): boolean {
        return this.userID == LOGIN._playerID;
    }

    public get isOwnedByFacebookFriend(): boolean {
        return !(!this.m_CellData) ? this.m_CellData.isFacebookFriend : false;
    }

    public get isOwnedByWildMonster(): boolean {
        return this.userID == 0 && this.baseID != 0;
    }

    public get isRandomWildMonsterBase(): boolean {
        return this.isOwnedByWildMonster && this.cellType == EnumYardType.EMPTY;
    }

    public Setup(cellData: any): void {
        let cellHeight: int = 0;
        let cellType: int = 0;
        if (cellData.hasOwnProperty("i")) {
            cellHeight = cellData.i | 0;
            this.m_CellHeaderBitField = (this.m_CellHeaderBitField & ~(MapRoom3Cell.MAX_VALUE_CELL_HEIGHT << MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT)) >>> 0;
            this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (cellHeight & MapRoom3Cell.MAX_VALUE_CELL_HEIGHT) << MapRoom3Cell.BIT_SHIFT_CELL_HEIGHT) >>> 0;
        }
        if (cellData.hasOwnProperty("b")) {
            cellType = cellData.b | 0;
            if (cellType == -1) {
                cellType = EnumYardType.EMPTY | 0;
            }
            this.m_CellHeaderBitField = (this.m_CellHeaderBitField & ~(MapRoom3Cell.MAX_VALUE_CELL_TYPE << MapRoom3Cell.BIT_SHIFT_CELL_TYPE)) >>> 0;
            this.m_CellHeaderBitField = (this.m_CellHeaderBitField | (cellType & MapRoom3Cell.MAX_VALUE_CELL_TYPE) << MapRoom3Cell.BIT_SHIFT_CELL_TYPE) >>> 0;
        }
        if (this.m_CellData != null) {
            this.m_CellData.Map(cellData);
        } else {
            this.m_CellData = new MapRoom3CellData(cellData);
        }
    }

    public ClearData(): void {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        if (MapRoom3Cell.s_CellsInAttackRange.get(_loc1_) != null) {
            MapRoom3Cell.s_CellsInAttackRange.get(_loc1_).length = 0;
        }
        if (MapRoom3Cell.s_InAttackRangeOfCells.get(_loc1_) != null) {
            MapRoom3Cell.s_InAttackRangeOfCells.get(_loc1_).length = 0;
        }
        if (MapRoom3Cell.s_InRangeOfStrongholds.get(_loc1_) != null) {
            MapRoom3Cell.s_InRangeOfStrongholds.get(_loc1_).length = 0;
        }
        MapRoom3Cell.s_CurrentBuffEffectFrames.delete(_loc1_);
        this.m_CellData = null;
    }

    public AddCellInAttackRange(param1: MapRoom3Cell): void {
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        let _loc3_: Vector<MapRoom3Cell> = as3.cast(MapRoom3Cell.s_CellsInAttackRange.set(_loc2_, MapRoom3Cell.s_CellsInAttackRange.get(_loc2_) || new Vector<MapRoom3Cell>(0, false, MapRoom3Cell)), Vector);
        if (_loc3_.indexOf(param1) == -1) {
            _loc3_.push(param1);
        }
    }

    public AddInAttackRangeOf(param1: MapRoom3Cell): void {
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        let _loc3_: Vector<MapRoom3Cell> = as3.cast(MapRoom3Cell.s_InAttackRangeOfCells.set(_loc2_, MapRoom3Cell.s_InAttackRangeOfCells.get(_loc2_) || new Vector<MapRoom3Cell>(0, false, MapRoom3Cell)), Vector);
        if (_loc3_.indexOf(param1) == -1) {
            _loc3_.push(param1);
        }
    }

    public AddInRangeOfStronghold(param1: MapRoom3Cell): void {
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        let _loc3_: Vector<MapRoom3Cell> = as3.cast(MapRoom3Cell.s_InRangeOfStrongholds.set(_loc2_, MapRoom3Cell.s_InRangeOfStrongholds.get(_loc2_) || new Vector<MapRoom3Cell>(0, false, MapRoom3Cell)), Vector);
        if (_loc3_.indexOf(param1) == -1) {
            _loc3_.push(param1);
        }
    }

    public get hasCellsInAttackRange(): boolean {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return MapRoom3Cell.s_CellsInAttackRange.get(_loc1_) != null && MapRoom3Cell.s_CellsInAttackRange.get(_loc1_).length > 0;
    }

    public get cellsInAttackRange(): Vector<MapRoom3Cell> {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return as3.cast(MapRoom3Cell.s_CellsInAttackRange.get(_loc1_), Vector);
    }

    public get isInAttackRange(): boolean {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return MapRoom3Cell.s_InAttackRangeOfCells.get(_loc1_) != null && MapRoom3Cell.s_InAttackRangeOfCells.get(_loc1_).length > 0;
    }

    public get inAttackRangeOfCells(): Vector<MapRoom3Cell> {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return as3.cast(MapRoom3Cell.s_InAttackRangeOfCells.get(_loc1_), Vector);
    }

    public get isInRangeOfStronghold(): boolean {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return MapRoom3Cell.s_InRangeOfStrongholds.get(_loc1_) != null && MapRoom3Cell.s_InRangeOfStrongholds.get(_loc1_).length > 0;
    }

    public get inRangeOfStrongholds(): Vector<MapRoom3Cell> {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        return as3.cast(MapRoom3Cell.s_InRangeOfStrongholds.get(_loc1_), Vector);
    }

    public get currentBuffEffectFrame(): int {
        let _loc1_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        if (MapRoom3Cell.s_CurrentBuffEffectFrames.get(_loc1_) == null) {
            MapRoom3Cell.s_CurrentBuffEffectFrames.set(_loc1_, Math.random() * MapRoom3AssetCache.STRONGHOLD_BUFF_EFFECT_TOTAL_FRAMES);
        }
        return MapRoom3Cell.s_CurrentBuffEffectFrames.get(_loc1_) | 0;
    }

    public set currentBuffEffectFrame(param1: int) {
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        MapRoom3Cell.s_CurrentBuffEffectFrames.set(_loc2_, param1);
    }

    public DoesContainDisplayableBase(): boolean {
        return !this.isBorder && !this.isBlocked && !this.isInvisible && this.containsValidBase;
    }

    public LoadForAttack(): void {
        this.LoadLatestData(as3.bind(this, this.OnLoadedForAttack));
    }

    public LoadForBuild(): void {
        this.LoadLatestData(as3.bind(this, this.OnLoadedForBuild));
    }

    private LoadLatestData(param1: Function): void {
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        let _loc2_: int = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        let _loc3_: any[] = [["cellids", JSON.stringify([_loc2_])]];
        new URLLoaderApi().load(MapRoom3Data.GetCellsRequestURL(), _loc3_, param1);
    }

    public OnLoadedForAttack(param1: any): void {
        PLEASEWAIT.Hide();
        if (param1 == null || param1.celldata == null || as3.is(param1.celldata, Array) == false || param1.celldata.length == 0) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_attack"), KEYS.Get("btn_ok"));
            return;
        }
        this.Setup(param1.celldata[0]);
        if (this.isLocked) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_attack"), KEYS.Get("btn_ok"));
            return;
        }
        GLOBAL._currentCell = this;
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        if (this.userID == 0) {
            BASE.LoadBase(null, 0, this.baseID, GLOBAL.e_BASE_MODE.WMVIEW, false, this.cellType, _loc2_);
        } else {
            BASE.LoadBase(null, 0, this.baseID, this.isOwnedByFacebookFriend ? GLOBAL.e_BASE_MODE.HELP : GLOBAL.e_BASE_MODE.VIEW, false, this.cellType, _loc2_);
        }
    }

    public OnLoadedForBuild(serverData: any): void {
        PLEASEWAIT.Hide();
        if (serverData == null || serverData.celldata == null || as3.is(serverData.celldata, Array) == false || serverData.celldata.length == 0) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_enter"), KEYS.Get("btn_ok"));
            return;
        }
        this.Setup(serverData.celldata[0]);
        if (this.isLocked || this.isOwnedByPlayer == false) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_enter"), KEYS.Get("btn_ok"));
            MapRoom3.mapRoom3Window.Refresh();
            return;
        }
        GLOBAL._currentCell = this;
        let _loc2_: number = MapRoomManager.instance.CalculateCellId(this.cellX, this.cellY);
        BASE.LoadBase(null, 0, this.baseID, GLOBAL.e_BASE_MODE.BUILD, false, this.cellType, _loc2_);
    }

    private CalculateAttackCosts(): any[] {
        let _loc3_: MapRoom3Cell = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc10_: MapRoom3Cell = null;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc1_: any[] = [0, 0, 0, 0];
        if (this.isInAttackRange == true) {
            return _loc1_;
        }
        let _loc2_: int = int.MAX_VALUE;
        let _loc4_: uint = MapRoomManager.instance.playerOwnedCells.length >>> 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            _loc10_ = as3.as(as3.vget(MapRoomManager.instance.playerOwnedCells, _loc5_), MapRoom3Cell);
            switch (_loc10_.cellType) {
                case EnumYardType.PLAYER:
                case EnumYardType.RESOURCE:
                case EnumYardType.STRONGHOLD:
                    _loc11_ = MapRoom3Cell.GetHexDistanceBetween(_loc10_, this);
                    if ((_loc12_ = Math.max(0, _loc11_ - _loc10_.attackRange) | 0) < _loc2_) {
                        _loc2_ = _loc12_;
                        _loc3_ = _loc10_;
                    }
                    break;
            }
            _loc5_++;
        }
        if (_loc3_ == null) {
            return _loc1_;
        }
        _loc6_ = GLOBAL.attackingPlayer.townHallLevel;
        _loc7_ = Math.min(_loc6_, MapRoom3Cell.ATTACK_COST_MULTIPLIERS_BY_TOWN_HALL_LEVEL.length - 1) | 0;
        _loc8_ = (MapRoom3Cell.ATTACK_COST_MULTIPLIERS_BY_TOWN_HALL_LEVEL[_loc7_] * MapRoomManager.instance.attackCostMultiplier.value) | 0;
        let _loc9_: int = (_loc2_ * (_loc8_ * this.GetABTestAttackCostMultiplier())) | 0;
        _loc1_[0] = _loc9_;
        _loc1_[1] = _loc9_;
        _loc1_[2] = _loc9_;
        _loc1_[3] = 0;
        return _loc1_;
    }

    private GetABTestAttackCostMultiplier(): number {
        let _loc1_: int = ABTest.lastTwoDigits(ABTest.UserMD5("flingercosts"));
        if (_loc1_ >= 256) {
            return 1;
        }
        if (_loc1_ >= 168) {
            return 1.5;
        }
        if (_loc1_ >= 84) {
            return 0.5;
        }
        Console.warning("AB test on attack cost didnt work.");
        return 1;
    }

    public DoesFortify(param1: MapRoom3Cell): boolean {
        if (param1 == null) {
            return false;
        }
        if (param1.DoesContainDisplayableBase() == false) {
            return false;
        }
        if (this.cellType != EnumYardType.FORTIFICATION) {
            return false;
        }
        if (this.userID != param1.userID) {
            return false;
        }
        if (this.wildMonsterTribeId != param1.wildMonsterTribeId) {
            return false;
        }
        return param1.cellType == EnumYardType.PLAYER || param1.cellType == EnumYardType.RESOURCE || param1.cellType == EnumYardType.STRONGHOLD;
    }

    public GetLocalisedCellTypeName(): string {
        switch (this.cellType) {
            case EnumYardType.PLAYER:
                return KEYS.Get("mr3_starter_cell_name");
            case EnumYardType.RESOURCE:
                return KEYS.Get("mr3_resource_cell_name");
            case EnumYardType.STRONGHOLD:
                return KEYS.Get("mr3_stronghold_cell_name");
            case EnumYardType.FORTIFICATION:
                return KEYS.Get("mr3_fortification_cell_name");
            case EnumYardType.EMPTY:
            default:
                if (this.isOwnedByWildMonster) {
                    return KEYS.Get("mr3_wild_monster_cell_name");
                }
                return "";
        }
    }

    public GetAllianceData(): MapRoom3AllianceData {
        return as3.cast(MapRoomManager.instance.allianceDataById.get(this.allianceID), MapRoom3AllianceData);
    }
}
