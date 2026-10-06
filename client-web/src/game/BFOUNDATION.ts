import * as as3 from "as3";
import { Class, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, BlendMode, DisplayObject, Graphics, IBitmapDrawable, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BitmapFilter, ColorMatrixFilter, GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { ATTACK, BASE, BMUSHROOM, BTOTEM, BTRAP, BUILDINGOPTIONS, BUILDINGS, BWALL, BYMConfig, BYMDevConfig, BuildingAssetContainer, BuildingEvent, BuildingOverlay, CModifiableProperty, Console, EnumYardType, Fire, GLOBAL, GRID, GameObject, HOUSING, ICoreBuilding, ITargetable, ImageCache, ImageCallbackHelper, InstanceManager, InventoryManager, KEYS, LOGGER, LOGIN, MAP, MONSTERBUNKER, MapRoomManager, MonsterBase, MovieClipUtils, PATHING, PLANNER, POPUPS, QUESTS, QUEUE, RasterData, ResourcePackages, SOUNDS, STORE, SecNum, Smoke, TUTORIAL, UI2, UPDATES, boneCrusherHit, building100hit, building101hit, building102hit, building103hit, building104hit, building105hit, building106hit, building10hit, building110hit, building111hit, building112hit, building113hit, building114hit, building115hit, building116hit, building117hit, building118hit, building119hit, building11hit, building120hit, building121hit, building122hit, building123hit, building124hit, building125hit, building126hit, building12hit, building131hit, building135hit, building13hit, building14hit, building15hit, building16hit, building17hit, building18hit, building19hit, building1hit, building20hit, building21hit, building22hit, building23hit, building24hit, building25hit, building26hit, building27hit, building2hit, building3hit, building4hit, building51hit, building53hit, building54hit, building55hit, building56hit, building57hit, building5hit, building63hit, building64hit, building65hit, building66hit, building68hit, building6hit, building71hit, building72hit, building73hit, building7hit, building86hit, building87hit, building88hit, building89hit, building8hit, building90hit, building96hit, building97hit, building98hit, building99hit, building9hit, buildingFootprint100x100, buildingFootprint130x130, buildingFootprint160x160, buildingFootprint190x160, buildingFootprint20x20, buildingFootprint30x30, buildingFootprint40x40, buildingFootprint70x70, buildingFootprint80x80, buildingFootprint90x90, buildingcubehit, buildingflaghit, buildingflowershit, buildinggnomehit, buildingheadhit, cannonTowerHit, coalProducerHit, hatcheryHit, housingBunkerHit, infernoAcademyHit, infernoPortalHit, magmaProducerHit, magmaTowerHit, monsterLockerHit, popup_biggulp, popup_helpme, print, quakeTowerHit, siloHit, sniperTowerHit, sulpherProducerHit, townHallHit, wallHit } from "@game";

export class BFOUNDATION extends GameObject {
    static {
        as3.fields(this, { _mcBase: null, _mcFootprint: null, _mcHit: null, topContainer: null, animContainer: null, _fortBackContainer: null, _fortFrontContainer: null, _spriteAlert: null, _mcAlert: null, _position: null, _oldPosition: null, _stopMoveCount: 0, _moving: false, _mouseOffset: null, _footprint: null, _blockers: null, _gridCost: null, _clickTimer: 0, _prefab: 0, _buildInstant: false, _buildInstantCost: null, _fortification: null, _nullPoint: null, _animLoaded: false, _animBMD: null, _animRect: null, _animContainerBMD: null, _animTick: 0, _animFrames: 0, anim2Container: null, _anim2BMD: null, _anim2ContainerBMD: null, _anim2Rect: null, _anim2Frames: 0, _anim2Tick: 0, _anim2Loaded: false, anim3Container: null, _anim3BMD: null, _anim3ContainerBMD: null, _anim3Rect: null, _anim3Frames: 0, _anim3Tick: 0, _anim3Loaded: false, _animRandomStart: true, _countdownBuild: null, _countdownUpgrade: null, _countdownRebuild: null, _countdownProduce: null, _countdownFortify: null, _stored: null, _lvl: null, _threadid: 0, _subject: null, _senderid: 0, _senderName: null, _senderPic: null, _hpCountdownRebuild: 0, _hpCountdownProduce: 0, _hpStored: 0, _hpLvl: 0, _repairing: 0, _repairTime: 0, _productionStage: null, _looted: false, _hasWorker: false, _hasResources: false, _counter: NaN, _type: 0, _attackgroup: 0, _class: null, _id: 0, _energy: 0, _fired: false, _creatures: null, _buildingTitle: null, _buildingInstructions: null, _buildingStats: null, _buildingDescription: null, _upgradeDescription: null, _recycleDescription: null, _specialDescription: null, _repairDescription: null, _blockRecycle: false, _upgradeCosts: null, _recycleCosts: null, _buildingProps: null, _resource: NaN, _range: 0, _rate: 0, _splash: 0, _speed: 0, _producing: 0, _constructed: false, _placing: false, _oldY: 0, _upgrading: null, _origin: null, _shake: 0, _picking: false, _monsterQueue: null, _inProduction: null, _taken: null, _spoutPoint: null, _spoutHeight: 0, _canFunction: false, _helpList: null, _destroyed: false, _renderState: null, _oldRenderState: null, _lastLoadedState: null, _renderLevel: 0, _renderFortLevel: 0, _treat: 0, _expireTime: 0, imageData: null, _lastBarIndex: -1, _overlayOffset: null, _rasterData: null, _rasterPt: null, _offsets: null, _sources: null, _debugRasterData: null, m_bmd: null, m_shadowBMD: null, m_footprintBMD: null, m_hitBMD: null, m_bmHit: null, m_hitOffsetIndex: 0, _imageCallbackHelpers: null, _recycled: false, damageProperty: null, _mouseClicked: false, _ioFollowKey: null, _ioHit: null, _ioHover: false, _ioGlow: null, _ioGlowBMD: null, _ioGlowPt: null, _ioGlowOff: null });
    }

    public static readonly TICK_LIMIT: int = 1209600;

    private static s_totalBuildingHP: number = NaN;

    private static s_totalBuildingMaxHP: number = NaN;

    public static readonly _IMAGE_NAMES: any[] = ["shadow", "", "top", "anim", "anim2", "anim3"];

    public static readonly _RASTERDATA_SHADOW: uint = 0;

    public static readonly _RASTERDATA_FOOTPRINT: uint = 1;

    public static readonly _RASTERDATA_TOP: uint = 2;

    public static readonly _RASTERDATA_ANIM: uint = 3;

    public static readonly _RASTERDATA_ANIM2: uint = 4;

    public static readonly _RASTERDATA_ANIM3: uint = 5;

    public static readonly _RASTERDATA_FORTFRONT: uint = 6;

    public static readonly _RASTERDATA_FORTBACK: uint = 7;

    public static readonly _RASTERDATA_AMOUNT: uint = 8;

    public static readonly k_STATE_DESTROYED: string = "destroyed";

    public static readonly k_STATE_DAMAGED: string = "damaged";

    public static readonly k_STATE_DEFAULT: string = "";

    private static s_ioHitCache: Dictionary = new Dictionary(true);

    private static readonly IO_HIT_CELL: int = 3;

    /** Hit clip -> its building, so the clips can be kept in drawing order (MAP.SortDepth). */
    private static s_ioHitOwner: Dictionary = new Dictionary(true);

    /** The building under the mouse (one at a time) and its glow (a picture of it, glowing, under it). */
    public static s_ioHovered: BFOUNDATION = null;

    private static readonly IO_GLOW_PAD: int = 12;

    private static s_ioGlowFilter: GlowFilter = new GlowFilter(0xFFFFFF, 1, 9, 9, 3, 2, false, true);
    public _mcBase: MovieClip;
    public _mcFootprint: MovieClip;
    public _mcHit: MovieClip;
    public topContainer: BuildingAssetContainer;
    public animContainer: BuildingAssetContainer;
    public _fortBackContainer: BuildingAssetContainer;
    public _fortFrontContainer: BuildingAssetContainer;
    public _spriteAlert: Sprite;
    public _mcAlert: DisplayObject;
    public _position: Point;
    public _oldPosition: Point;
    public _stopMoveCount: int;
    public _moving: boolean;
    public _mouseOffset: Point;
    public _footprint: any[];
    public _blockers: any[];
    public _gridCost: any[];
    public _clickTimer: int;
    public _prefab: int;
    public _buildInstant: boolean;
    public _buildInstantCost: SecNum;
    public _fortification: SecNum;
    public _nullPoint: Point;
    public _animLoaded: boolean;
    public _animBMD: BitmapData;
    public _animRect: Rectangle;
    public _animContainerBMD: BitmapData;
    public _animTick: int;
    public _animFrames: int;
    public anim2Container: BuildingAssetContainer;
    public _anim2BMD: BitmapData;
    public _anim2ContainerBMD: BitmapData;
    public _anim2Rect: Rectangle;
    public _anim2Frames: int;
    public _anim2Tick: int;
    public _anim2Loaded: boolean;
    public anim3Container: BuildingAssetContainer;
    public _anim3BMD: BitmapData;
    public _anim3ContainerBMD: BitmapData;
    public _anim3Rect: Rectangle;
    public _anim3Frames: int;
    public _anim3Tick: int;
    public _anim3Loaded: boolean;
    public _animRandomStart: boolean;
    public _countdownBuild: SecNum;
    public _countdownUpgrade: SecNum;
    public _countdownRebuild: SecNum;
    public _countdownProduce: SecNum;
    public _countdownFortify: SecNum;
    public _stored: SecNum;
    public _lvl: SecNum;
    public _threadid: int;
    public _subject: string;
    public _senderid: int;
    public _senderName: string;
    public _senderPic: string;
    public _hpCountdownRebuild: int;
    public _hpCountdownProduce: int;
    public _hpStored: int;
    public _hpLvl: int;
    public _repairing: int;
    public _repairTime: int;
    public _productionStage: SecNum;
    public _looted: boolean;
    public _hasWorker: boolean;
    public _hasResources: boolean;
    public _counter: number;
    public _type: int;
    public _attackgroup: int;
    public _class: string;
    public _id: int;
    public _energy: int;
    public _fired: boolean;
    public _creatures: any[];
    public _buildingTitle: string;
    public _buildingInstructions: string;
    public _buildingStats: string;
    public _buildingDescription: string;
    public _upgradeDescription: string;
    public _recycleDescription: string;
    public _specialDescription: string;
    public _repairDescription: string;
    public _blockRecycle: boolean;
    public _upgradeCosts: string;
    public _recycleCosts: string;
    public _buildingProps: any;
    public _resource: number;
    public _range: int;
    public _rate: int;
    public _splash: int;
    public _speed: int;
    public _producing: int;
    public _constructed: boolean;
    public _placing: boolean;
    public _oldY: int;
    public _upgrading: string;
    public _origin: Point;
    public _shake: int;
    public _picking: boolean;
    public _monsterQueue: any[];
    public _inProduction: string;
    public _taken: SecNum;
    public _spoutPoint: Point;
    public _spoutHeight: int;
    public _canFunction: boolean;
    public _helpList: any[];
    public _destroyed: boolean;
    public _renderState: string;
    public _oldRenderState: string;
    public _lastLoadedState: string;
    public _renderLevel: int;
    public _renderFortLevel: int;
    public _treat: int;
    public _expireTime: int;
    protected imageData: any;
    private _lastBarIndex: int;
    public _overlayOffset: Point;
    protected _rasterData: Vector<RasterData>;
    protected _rasterPt: Vector<Point>;
    protected _offsets: Vector<Point>;
    protected _sources: Vector<DisplayObject>;
    protected _debugRasterData: RasterData;
    protected m_bmd: BitmapData;
    protected m_shadowBMD: BitmapData;
    protected m_footprintBMD: BitmapData;
    protected m_hitBMD: BitmapData;
    protected m_bmHit: Bitmap;
    protected m_hitOffsetIndex: uint;
    protected _imageCallbackHelpers: Vector<ImageCallbackHelper>;
    public _recycled: boolean;
    public damageProperty: CModifiableProperty;
    private _mouseClicked: boolean;
    /** Where the building held by the pointer was last drawn, with the view (FollowMouseB). */
    private _ioFollowKey: string;
    // ---------------------------------------------------------------------------------------------
    // Inferno-only: clicking buildings, and the white glow round the one under the mouse
    // ---------------------------------------------------------------------------------------------
    /**
     * The hit area each building type had was a vector shape drawn for the original overworld art: it
     * matched the Inferno pictures badly (bits of a building did not click, empty ground next to it did,
     * and a taller building's shape stole clicks from the one behind it). Now the hit area is made from
     * the pictures themselves: every 3 x 3 pixel square where the top or any frame of the animation is
     * solid, grown by one square so the edges are easy to hit, plus the building's footprint on the
     * ground. It is the old hit clip's hitArea, so everything that listens to it works as before.
     * Worked out once for each set of pictures (s_ioHitCache).
     */
    private _ioHit: Sprite;
    private _ioHover: boolean;
    private _ioGlow: RasterData;
    private _ioGlowBMD: BitmapData;
    private _ioGlowPt: Point;
    private _ioGlowOff: Point;

    public $ctor(): void {
        this._nullPoint = new Point(0, 0);
        this._overlayOffset = new Point(0, 0);
        super.$ctor();
        this._spoutPoint = new Point(1, -67);
        this._spoutHeight = 135;
        this.setHealth(1);
        this._energy = 0;
        this._buildingTitle = "";
        this._buildingDescription = "";
        this._buildingInstructions = "";
        this._upgradeDescription = "";
        this._buildingStats = "";
        this._creatures = [];
        this._helpList = [];
        this._rasterData = new Vector<RasterData>(BFOUNDATION._RASTERDATA_AMOUNT, true, RasterData);
        this._rasterPt = new Vector<Point>(this._rasterData.length, true, Point);
        this._offsets = new Vector<Point>(this._rasterData.length, true, Point);
        this._sources = new Vector<DisplayObject>(this._rasterData.length, true, DisplayObject);
        let _loc1_: int = (this._rasterPt.length - 1) | 0;
        while (_loc1_ >= 0) {
            as3.vset(this._rasterPt, _loc1_, new Point());
            as3.vset(this._offsets, _loc1_, new Point());
            _loc1_--;
        }
        this._imageCallbackHelpers = new Vector<ImageCallbackHelper>(0, false, ImageCallbackHelper);
        this._fortification = new SecNum(0);
        this._countdownBuild = new SecNum(0);
        this._countdownRebuild = new SecNum(0);
        this._countdownUpgrade = new SecNum(0);
        this._countdownProduce = new SecNum(0);
        this._countdownFortify = new SecNum(0);
        this._stored = new SecNum(0);
        this._lvl = new SecNum(0);
        this._hpCountdownRebuild = 0;
        this._hpCountdownProduce = 0;
        this._hpStored = 0;
        this._hpLvl = 0;
        this._inProduction = "";
        this._productionStage = new SecNum(0);
        this._constructed = false;
        this._placing = true;
        this._repairing = 0;
        this._mouseOffset = new Point(0, 0);
        this._oldY = 0;
        if (BASE.isOutpostOrInfernoOutpost && !GLOBAL.outpostRecycling) {
            this._blockRecycle = true;
        }
        InstanceManager.addInstance(this);
        this.damageProperty = new CModifiableProperty();
        this.graphic.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
    }

    public static get totalBuildingHP(): number {
        return BFOUNDATION.s_totalBuildingHP;
    }

    public static get totalBuildingMaxHP(): number {
        return BFOUNDATION.s_totalBuildingMaxHP;
    }

    public static updateAllRasterData(): void {
        let _loc2_: BFOUNDATION = null;
        if (!BYMConfig.instance.RENDERER_ON) {
            return;
        }
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            _loc2_.updateRasterData();
        }
    }

    public static redrawAllShadowData(): void {
        let _loc1_: Vector<any> = null;
        let _loc3_: int = 0;
    }

    private static sortByDepth(param1: any, param2: any): number {
        if (!as3.vget((as3.as(param1, BFOUNDATION)).rasterPt, BFOUNDATION._RASTERDATA_SHADOW)) {
            return 1;
        }
        if (!as3.vget((as3.as(param2, BFOUNDATION)).rasterPt, BFOUNDATION._RASTERDATA_SHADOW)) {
            return -1;
        }
        return as3.vget((as3.as(param1, BFOUNDATION)).rasterPt, BFOUNDATION._RASTERDATA_SHADOW).y - as3.vget((as3.as(param2, BFOUNDATION)).rasterPt, BFOUNDATION._RASTERDATA_SHADOW).y;
    }

    public static getBuildingSaveData(): Vector<any> {
        let exportBuildingData: any = null;
        let buildingData: BFOUNDATION = null;
        let hasTownHall: boolean = false;
        let saveData: Vector<any> = new Vector<any>(0, false, Object);
        let building: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let buildingHealthData: any = {};
        let buildingDataByID: any = {};
        let hashString: string = "";
        as3.vset(saveData, 0, buildingDataByID);
        as3.vset(saveData, 1, buildingHealthData);
        BFOUNDATION.s_totalBuildingHP = BFOUNDATION.s_totalBuildingMaxHP = 0;
        for (buildingData of (building ?? [])) {
            if (!(buildingData instanceof BMUSHROOM) && !(GLOBAL._newBuilding === buildingData)) {
                if (as3.is(buildingData, ICoreBuilding)) {
                    hasTownHall = true;
                }
                // (Inferno-only: in your own yard a spent trap is kept, disarmed, "fd"; an attack still leaves it
                // out, and the server marks it)
                if (buildingData instanceof BTRAP && buildingData._fired && !(GLOBAL.INFERNO_ONLY && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) || buildingData._type == 53 && buildingData._expireTime < GLOBAL.Timestamp()) {
                    Console.warning("Ignored Building" + buildingData + buildingData._type + buildingData._expireTime + " setting buildinghealthdata to 0");
                    buildingHealthData[buildingData._id] = 0;
                } else {
                    if (buildingData instanceof BWALL === false) {
                        if (BASE.isMainYardOrInfernoMainYard && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) {
                            BFOUNDATION.s_totalBuildingHP += buildingData.maxHealth;
                        } else {
                            BFOUNDATION.s_totalBuildingHP += buildingData.health;
                        }
                        BFOUNDATION.s_totalBuildingMaxHP += buildingData.maxHealth;
                    }
                    if (buildingData.health < buildingData.maxHealth) {
                        buildingHealthData[buildingData._id] = buildingData.health | 0;
                    }
                    exportBuildingData = buildingData.Export();
                    if (exportBuildingData) {
                        buildingDataByID[buildingData._id] = exportBuildingData;
                        hashString += (exportBuildingData.X + exportBuildingData.Y).toString();
                    }
                }
            }
        }
        if (!hasTownHall) {
            LOGGER.Log("err", "User missing TownHall upon save");
            Console.warning("BFOUNDATION::getBuildingSaveData(TownHall missing upon save)");
        }
        BASE._percentDamaged = (100 - 100 / BFOUNDATION.s_totalBuildingMaxHP * BFOUNDATION.s_totalBuildingHP) | 0;
        // Comment: This gives an out-of-range index error. The md5.as class is malformed
        // saveData[2] = md5(hashString);
        as3.vset(saveData, 2, hashString);
        return saveData;
    }

    public override get width(): number {
        return this._mcHit.width;
    }

    public override get height(): number {
        return this._mcHit.height;
    }

    public get rasterPt(): Vector<Point> {
        return this._rasterPt;
    }

    public get damage(): int {
        return this.damageProperty.value | 0;
    }

    public get isDamaged(): boolean {
        return this.health < this.maxHealth;
    }

    public get isCriticallyDamaged(): boolean {
        return this.health < this.maxHealth * 0.5;
    }

    public override modifyHealth(param1: number, param2: ITargetable = null): number {
        let _loc4_: number = NaN;
        let _loc5_: uint = 0;
        if (!this.isTargetable) {
            Console.warning("you are trying to deal damage to a building that isn\'t targetable.... why you doin that bro?");
            return 0;
        }
        let _loc3_: number = param1;
        param1 = Math.abs(param1);
        if (this._fortification.Get() > 0) {
            param1 *= 100 - (this._fortification.Get() * 10 + 10);
            param1 /= 100;
        }
        param1 *= !(!this.armor) ? 1 - this.armor : 1;
        this.setHealth(this.health - param1);
        if (this.health <= 0) {
            this._repairing = 0;
            this.setHealth(0);
            if (!this._destroyed) {
                this.Destroyed(param2 != null);
            }
        } else if (this._class != "wall") {
            ATTACK.Log("b" + this._id, "<font color=\"#990000\">" + KEYS.Get("attack_log_%damaged", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)), "v3": 100 - ((100 / this.maxHealth * this.health) | 0) }) + "</font>");
        }
        if (Boolean(param2) && !this._destroyed) {
            _loc4_ = 1;
            if (param2 instanceof MonsterBase) {
                _loc4_ = as3.cast(param2, MonsterBase).lootingMultiplier;
            }
            _loc5_ = this.Loot((param1 * _loc4_) | 0);
            ATTACK.damage(param1 | 0, this, param1 - _loc3_);
        }
        if (GameObject.k_DOES_PRINT_DETAILED_LOGGING && GLOBAL._aiDesignMode) {
            param1 = Math.round(param1);
            _loc3_ = Math.round(_loc3_);
            print(this.name + " was hit for " + param1 + (!(!(_loc3_ - param1)) ? "(" + _loc3_ + " - " + (_loc3_ - param1) + ")" : "") + " damage(looted " + _loc5_ + "), left with " + this.health + " out of " + this.maxHealth + "hp");
        }
        this.Update();
        return param1;
    }

    public SetProps(): void {
        try {
            this._buildingProps = GLOBAL._buildingProps[this._type - 1];
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  buildingprops | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps buildingprops");
            return;
        }
        try {
            this._mcFootprint = BYMConfig.instance.RENDERER_ON ? this.GetFootprintMC() : as3.as(MAP._BUILDINGFOOTPRINTS.addChild(this.GetFootprintMC()), MovieClip);
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mcfootprint 1 | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps mcfootprint1");
            return;
        }
        try {
            if (!BYMConfig.instance.RENDERER_ON) {
                this._mc = as3.as(MAP._BUILDINGTOPS.addChild(new MovieClip()), MovieClip);
            } else {
                this._mc = new MovieClip();
            }
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mc | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  mc");
            return;
        }
        try {
            this.topContainer = new BuildingAssetContainer();
            this.topContainer.mouseChildren = false;
            this.topContainer.mouseEnabled = false;
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  topContainer | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  topContainer");
            return;
        }
        try {
            this.animContainer = new BuildingAssetContainer();
            this.animContainer.mouseChildren = false;
            this.animContainer.mouseEnabled = false;
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  animContainer | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  animContainer");
            return;
        }
        try {
            this._fortFrontContainer = new BuildingAssetContainer();
            this._fortFrontContainer.mouseChildren = false;
            this._fortFrontContainer.mouseEnabled = false;
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  _fortFrontContainer | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  _fortFrontContainer");
            return;
        }
        try {
            this._fortBackContainer = new BuildingAssetContainer();
            this._fortBackContainer.mouseChildren = false;
            this._fortBackContainer.mouseEnabled = false;
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  _fortBackContainer | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  _fortBackContainer");
            return;
        }
        try {
            if (!BYMConfig.instance.RENDERER_ON) {
                this._mc.addChild(this._fortBackContainer);
                this._mc.addChild(this.topContainer);
                this._mc.addChild(this.animContainer);
                this._mc.addChild(this._fortFrontContainer);
            }
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mc.addChildren | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  mc.addChildren");
            return;
        }
        try {
            if (!BYMConfig.instance.RENDERER_ON) {
                this._mcBase = as3.as(MAP._BUILDINGBASES.addChild(new BuildingAssetContainer()), BuildingAssetContainer);
            } else {
                this._mcBase = new BuildingAssetContainer();
            }
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mcBase | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  mcBase");
            return;
        }
        try {
            this._mcHit = this.GetHitMC();
            this._mcHit.gotoAndStop(1);
            if (BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.addChild(this._mcHit);
            } else {
                this._mc.addChild(this._mcHit);
            }
            this._mcHit.cacheAsBitmap = true;
            this._mcHit.alpha = 0;
            BFOUNDATION.s_ioHitOwner.set(this._mcHit, this);
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mcHit | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  mcHit");
            return;
        }
        try {
            this._size = this._buildingProps.size | 0;
            this._class = as3.str(this._buildingProps.type);
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  size/class | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  size/class");
            return;
        }
        try {
            this._mcFootprint.gotoAndStop(1);
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  mcFootprint 2 | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  mcFootprint 2");
            return;
        }
        try {
            this._attackgroup = this._buildingProps.attackgroup | 0;
            this._mouseOffset = new Point(0, ((this._mcFootprint.height / 20) | 0) * 10);
            this._middle = (this._footprint[0].height * 0.5) | 0;
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.SetProps:  end stuff | " + e.message + " | " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.SetProps:  end");
            return;
        }
        this.anim2Container = new BuildingAssetContainer();
        this.anim2Container.mouseChildren = false;
        this.anim2Container.mouseEnabled = false;
        this.anim3Container = new BuildingAssetContainer();
        this.anim3Container.mouseChildren = false;
        this.anim3Container.mouseEnabled = false;
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.addChild(this.anim2Container);
            this._mc.addChild(this.anim3Container);
        }
        if (this._buildingProps.isUntargetable) {
            this.targetableStatus = 1;
        }
        if (this._buildingProps.isImmobile) {
            this.moveSpeedProperty.value = 0;
        }
    }

    public Bank(): void {
    }

    public Description(): void {
        let _loc1_: number = NaN;
        let _loc2_: any = null;
        let effectiveLvl: int = this.getEffectiveLevel();
        if (this._buildingProps.names != null && this._buildingProps.names.length >= effectiveLvl) {
            this._buildingTitle = "<b>" + this._buildingProps.names[effectiveLvl - 1] + "</b>";
        } else {
            this._buildingTitle = "<b>" + this._buildingProps.name + "</b>";
            if (this._buildingProps.costs.length > 1) {
                this._buildingTitle += " " + KEYS.Get("bdg_level", { "v1": effectiveLvl });
            }
        }
        if (this.health < this.maxHealth) {
            if (this._countdownUpgrade.Get() > 0) {
                this._repairDescription = "<font color=\"#FF0000\"><b>" + KEYS.Get("repaironhold_upgrade") + "</b></font>";
            } else if (this._countdownFortify.Get() > 0) {
                this._repairDescription = "<font color=\"#FF0000\"><b>" + KEYS.Get("repaironhold_fortify") + "</b></font>";
            } else {
                _loc1_ = 100 - Math.ceil(100 / this.maxHealth * this.health);
                this._specialDescription = "<font color=\"#FF0000\"><b>" + KEYS.Get("building_percentdamaged", { "v1": _loc1_ }) + "</b></font>";
            }
        } else {
            if (this._buildingProps.descriptions != null && this._buildingProps.descriptions.length >= this._lvl.Get()) {
                this._specialDescription = as3.str(this._buildingProps.descriptions[this._lvl.Get() - 1]);
            } else {
                this._specialDescription = as3.str(this._buildingProps.description);
            }
            if (!(this._type == 24 || this._type == 25 || this._type == 26)) {
                if (this._type == 20 || this._type == 21) {
                    this._buildingStats = KEYS.Get("building_stats_dps", { "v1": this._range, "v2": this.damage, "v3": (this.damage * (40 / this._rate)) | 0, "v4": this._splash, "v5": ((40 / this._rate * 10) | 0) / 10 });
                    if (this._type == 20) {
                        this._buildingDescription = KEYS.Get("building_cannon_desc");
                    }
                    if (this._type == 21) {
                        this._buildingDescription = KEYS.Get("building_sniper_desc");
                    }
                    if (this._lvl.Get() < this._buildingProps.costs.length) {
                        this._upgradeDescription = KEYS.Get("building_stats", { "v1": this._buildingProps.stats[this._lvl.Get()].range, "v2": this._buildingProps.stats[this._lvl.Get()].damage, "v3": this._buildingProps.stats[this._lvl.Get()].splash, "v4": ((40 / this._buildingProps.stats[this._lvl.Get()].rate * 10) | 0) / 10 });
                    }
                }
            }
        }
        this._recycleDescription = "";
        if (this._repairing == 1) {
            this._repairDescription = "<font color=\"#FF0000\"><b>" + KEYS.Get("building_damagedinattack") + "</b></font><br>" + KEYS.Get("building_repairinprogress", { "v1": Math.floor(100 / this.maxHealth * this.health), "v2": GLOBAL.ToTime(this.getEstimatedRepairTimeRemaining() | 0) });
        } else {
            this._repairDescription = "<font color=\"#FF0000\"><b>" + KEYS.Get("building_damagedinattack") + "</b></font><br>" + KEYS.Get("building_repairfree");
            if (this._countdownBuild.Get() > 0) {
                this._repairDescription += "<br>" + KEYS.Get("building_attackdestroy");
            }
            if (this._countdownUpgrade.Get() > 0) {
                this._repairDescription += "<br>" + KEYS.Get("building_attacksetback");
            }
        }
        if (this._lvl.Get() >= this.getEffectiveLevelMax()) {
            this._upgradeDescription = KEYS.Get("bdg_fullyupgraded");
            this._upgradeCosts = "";
        } else {
            this._upgradeCosts = "";
            _loc2_ = this._buildingProps.costs[this._lvl.Get()];
            if (_loc2_.r1.Get() > 0) {
                if (_loc2_.r1.Get() > BASE._resources.r1.Get()) {
                    this._upgradeCosts += "<font color=\"#FF0000\">";
                }
                this._upgradeCosts += GLOBAL.FormatNumber(Number(_loc2_.r1.Get())) + " " + GLOBAL._resourceNames[0] + "</font> - ";
            }
            if (_loc2_.r2.Get() > 0) {
                if (_loc2_.r2.Get() > BASE._resources.r2.Get()) {
                    this._upgradeCosts += "<font color=\"#FF0000\">";
                }
                this._upgradeCosts += GLOBAL.FormatNumber(Number(_loc2_.r2.Get())) + " " + GLOBAL._resourceNames[1] + "</font> - ";
            }
            if (_loc2_.r3.Get() > 0) {
                if (_loc2_.r3.Get() > BASE._resources.r3.Get()) {
                    this._upgradeCosts += "<font color=\"#FF0000\">";
                }
                this._upgradeCosts += GLOBAL.FormatNumber(Number(_loc2_.r3.Get())) + " " + GLOBAL._resourceNames[2] + "</font> - ";
            }
            if (_loc2_.r4.Get() > 0) {
                if (_loc2_.r4.Get() > BASE._resources.r4.Get()) {
                    this._upgradeCosts += "<font color=\"#FF0000\">";
                }
                this._upgradeCosts += GLOBAL.FormatNumber(Number(_loc2_.r4.Get())) + " " + GLOBAL._resourceNames[3] + "</font> - ";
            }
            this._upgradeCosts += GLOBAL.ToTime(_loc2_.time.Get() | 0);
            this._upgradeDescription = "";
        }
    }

    public getEstimatedRepairTimeRemaining(): number {
        let _loc1_: int = 0;
        if (this._lvl.Get() == 0) {
            _loc1_ = this._buildingProps.repairTime[0] | 0;
        } else {
            _loc1_ = this._buildingProps.repairTime[this._lvl.Get() - 1] | 0;
        }
        _loc1_ = Math.min(3600, _loc1_) | 0;
        _loc1_ = Math.ceil(this.maxHealth / _loc1_) | 0;
        return ((this.maxHealth - this.health) / _loc1_) | 0;
    }

    /**
     * Returns the building level clamped to the MR2 maximum for buildings whose
     * max level differs between MR2 and MR3. Always returns the real level in MR3.
     *
     * @return Effective building level for rendering purposes
     */
    public getEffectiveLevel(): int {
        if (!MapRoomManager.instance.isInMapRoom3) {
            if (this._type == 5) {
                return Math.min(this._lvl.Get(), 4) | 0;
            }
            // Flinger: MR2 max 4, MR3 max 5
            if (this._type == 15) {
                return Math.min(this._lvl.Get(), 6) | 0;
            }
        }
        return this._lvl.Get() | 0;
    }

    /**
     * Returns the maximum upgradeable level for this building in the current map room mode.
     * In MR2, some buildings are capped below their full costs array length.
     * In MR3, the full costs array applies.
     *
     * @returns {int} Max level this building can be upgraded to in the current mode
     */
    public getEffectiveLevelMax(): int {
        if (!MapRoomManager.instance.isInMapRoom3) {
            if (this._type == 5) {
                return 4;
            }
            // Flinger: MR2 max 4
            if (this._type == 15) {
                return 6;
            }
        }
        return this._buildingProps.costs.length | 0;
    }

    public RenderClear(param1: boolean = true): void {
        if (this.m_isCleared) {
            return;
        }
        if (param1) {
            this._renderState = null;
        }
        this._mcBase.Clear();
        this.topContainer.Clear();
        this.animContainer.Clear();
        this.anim2Container.Clear();
        this.anim3Container.Clear();
    }

    public Render(param1: string = ""): void {
        let fortImageDataA: any = null;
        let fortImageDataB: any = null;
        let FortImageCallback: Function = null;
        let imageDataA: any = null;
        let imageDataB: any = null;
        let imageLevel: int = 0;
        fortImageDataA = null;
        fortImageDataB = null;
        let fortImageLevel: int = 0;
        let i: int = 0;
        let loadImages: any[] = null;
        let length: uint = 0;
        let imageGroupYardType: int = 0;
        let j: int = 0;
        let loadFortImages: any[] = null;
        let state: string = param1;
        if (GLOBAL._catchup) {
            return;
        }
        if (this._renderState == null || state !== this._renderState || this._lvl.Get() != this._renderLevel) {
            this._renderLevel = this._lvl.Get() | 0;
            let effectiveLevel: int = this.getEffectiveLevel();
            imageDataA = GLOBAL._buildingProps[this._type - 1].imageData;
            if (effectiveLevel == 0) {
                imageDataB = imageDataA[1];
                imageLevel = 1;
            } else if (imageDataA[effectiveLevel]) {
                imageDataB = imageDataA[effectiveLevel];
                imageLevel = effectiveLevel;
            } else {
                i = (effectiveLevel - 1) | 0;
                while (i > 0) {
                    if (imageDataA[i]) {
                        imageDataB = imageDataA[i];
                        imageLevel = i;
                        break;
                    }
                    i--;
                }
            }
            this._oldRenderState = this._renderState;
            this._renderState = state;
            if (imageDataB) {
                loadImages = [];
                // (a building drawn with no top, only an anim strip, like the Inferno's Cinder Coil and
                // Obsidian Mortar, keeps its damaged state when it has a damaged strip: "noTop")
                if (!imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state] && !(imageDataA.noTop && imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state])) {
                    state = "";
                }
                length = BFOUNDATION._IMAGE_NAMES.length;
                i = 0;
                while (i < length) {
                    if (imageDataB[BFOUNDATION._IMAGE_NAMES[i] + state]) {
                        loadImages.push(imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[i] + state][0]);
                    }
                    i++;
                }
                this._animLoaded = false;
                if (state === BFOUNDATION.k_STATE_DAMAGED || state === BFOUNDATION.k_STATE_DESTROYED) {
                    this._anim2Loaded = false;
                    this._anim3Loaded = true;
                } else {
                    this._anim2Loaded = false;
                    this._anim3Loaded = false;
                }
                this._imageCallbackHelpers.push(new ImageCallbackHelper(as3.bind(this, this.ImageCallback), state, imageLevel, imageDataA, imageDataB));
                imageGroupYardType = BASE.yardType;
                switch (imageGroupYardType) {
                    case EnumYardType.PLAYER:
                        imageGroupYardType = EnumYardType.MAIN_YARD | 0;
                        break;
                    case EnumYardType.RESOURCE:
                    case EnumYardType.STRONGHOLD:
                    case EnumYardType.FORTIFICATION:
                        imageGroupYardType = EnumYardType.OUTPOST | 0;
                }
                ImageCache.GetImageGroupWithCallBack(imageGroupYardType + "b" + this._type + "-" + imageLevel + state, loadImages, as3.bind(this, this.ImageCallback), true, 2, state);
            }
        }
        if (this._fortification.Get() != this._renderFortLevel) {
            if (this._fortification.Get() > 4) {
                LOGGER.Log("err", "Illegal fortification level " + this._fortification.Get());
                throw new Error("ILLEGAL FORTIFICATION LEVEL " + this._fortification.Get());
            }
            this._renderFortLevel = this._fortification.Get() | 0;
            fortImageDataA = GLOBAL._buildingProps[this._type - 1].fortImgData;
            if (fortImageDataA[this._fortification.Get()]) {
                fortImageDataB = fortImageDataA[this._fortification.Get()];
                fortImageLevel = this._fortification.Get() | 0;
            } else {
                j = (this._fortification.Get() - 1) | 0;
                while (i > 0) {
                    if (fortImageDataA[j]) {
                        fortImageDataB = fortImageDataA[j];
                        imageLevel = j;
                        break;
                    }
                    i--;
                }
            }
            if (fortImageDataB) {
                FortImageCallback = (param1: any[], param2: string): void => {
                    let _loc3_: any[] = null;
                    let _loc4_: string = null;
                    let _loc5_: BitmapData = null;
                    let _loc6_: BuildingAssetContainer = null;
                    if (param2 == "fort" + this._renderFortLevel) {
                        this._fortFrontContainer.Clear();
                        this._fortBackContainer.Clear();
                        for (_loc3_ of as3.values(param1)) {
                            _loc4_ = String(_loc3_[0]);
                            _loc5_ = as3.cast(_loc3_[1], BitmapData);
                            if (Boolean(fortImageDataB["front"]) && fortImageDataA.baseurl + fortImageDataB["front"][0] == _loc4_) {
                                if (!BYMConfig.instance.RENDERER_ON) {
                                    (_loc6_ = this._fortFrontContainer).Clear();
                                    _loc6_.addChild(new Bitmap(_loc5_));
                                    _loc6_.x = Number(fortImageDataB["front"][1].x);
                                    _loc6_.y = Number(fortImageDataB["front"][1].y);
                                } else {
                                    as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTFRONT).x = Number(fortImageDataB["front"][1].x);
                                    as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTFRONT).y = Number(fortImageDataB["front"][1].y);
                                    as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTFRONT).x = this._mc.x + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTFRONT).x - MAP.instance.offset.x;
                                    as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTFRONT).y = this._mc.y + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTFRONT).y - MAP.instance.offset.y;
                                    as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FORTFRONT) || as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_FORTFRONT, new RasterData(as3.cast(_loc5_, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTFRONT), int.MAX_VALUE));
                                }
                            } else if (Boolean(fortImageDataB["back"]) && fortImageDataA.baseurl + fortImageDataB["back"][0] == _loc4_) {
                                if (!BYMConfig.instance.RENDERER_ON) {
                                    (_loc6_ = this._fortBackContainer).Clear();
                                    _loc6_.addChild(new Bitmap(_loc5_));
                                    _loc6_.x = Number(fortImageDataB["back"][1].x);
                                    _loc6_.y = Number(fortImageDataB["back"][1].y);
                                } else {
                                    as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTBACK).x = Number(fortImageDataB["back"][1].x);
                                    as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTBACK).y = Number(fortImageDataB["back"][1].y);
                                    as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTBACK).x = this._mc.x + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTBACK).x - MAP.instance.offset.x;
                                    as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTBACK).y = this._mc.y + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FORTBACK).y - MAP.instance.offset.y;
                                    as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FORTBACK) || as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_FORTBACK, new RasterData(as3.cast(_loc5_, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FORTBACK), int.MAX_VALUE));
                                }
                            }
                        }
                        this.updateRasterData();
                    }
                };
                loadFortImages = [];
                if (fortImageDataB["front"]) {
                    loadFortImages.push(fortImageDataA.baseurl + fortImageDataB["front"][0]);
                }
                if (fortImageDataB["back"]) {
                    loadFortImages.push(fortImageDataA.baseurl + fortImageDataB["back"][0]);
                }
                ImageCache.GetImageGroupWithCallBack("fort" + this._type + "-" + fortImageLevel, loadFortImages, FortImageCallback, true, 2, "fort" + this._renderFortLevel);
            }
        }
        if (this._renderState == null || state !== this._renderState || this._lvl.Get() != this._renderLevel) {
            this.updateRasterData();
        }
    }

    protected ImageCallback(param1: any[], param2: string): void {
        let callbackHelper: ImageCallbackHelper = null;
        let isCorrectHelper: boolean = false;
        let callbackHelperIndex: int = 0;
        let _loc7_: any = false;
        let _loc12_: any[] = null;
        let _loc13_: string = null;
        let imageBitmapData: BitmapData = null;
        let buildingAssetContainer: BuildingAssetContainer = null;
        let _loc16_: Rectangle = null;
        let _loc17_: DisplayObject = null;
        // the pictures that make the building's hit area (ioBuildHit): [bitmap, x, y, width, height, frames]
        let ioParts: any[] = [];
        if (this.m_isCleared) {
            return;
        }
        callbackHelperIndex = (this._imageCallbackHelpers.length - 1) | 0;
        while (callbackHelperIndex >= 0) {
            if ((callbackHelper = as3.vget(this._imageCallbackHelpers, callbackHelperIndex)).ref === as3.bind(this, this.ImageCallback)) {
                this._imageCallbackHelpers.splice(callbackHelperIndex, 1);
                isCorrectHelper = true;
            }
            callbackHelperIndex--;
        }
        if (!isCorrectHelper) {
            return;
        }
        let state: string = callbackHelper.state;
        let _loc9_: int = callbackHelper.level;
        let imageDataA: any = callbackHelper.imageDataA;
        let imageDataB: any = callbackHelper.imageDataB;
        callbackHelper.clear();
        if (param2 == this._renderState) {
            this.RenderClear(false);
            if (this._lastLoadedState != null) {
                if (state === BFOUNDATION.k_STATE_DESTROYED && this._lastLoadedState === BFOUNDATION.k_STATE_DAMAGED) {
                    if (this._type == 14) {
                        SOUNDS.Play("destroytownhall");
                        if (this._type != 17 && this._type != 18) {
                            Smoke.CreatePoof(new Point(this.x, this.y + this._middle), this._middle, 1);
                        }
                    } else {
                        SOUNDS.Play(SOUNDS.DestroySoundIDForLevel(this._lvl.Get() | 0));
                        if (this._type != 17 && this._type != 18) {
                            Smoke.CreatePoof(new Point(this.x, this.y + this._middle), this._middle, 1);
                        }
                    }
                    if (this._class != "wall" && this._class != "trap" && this._type != 15) {
                        Smoke.CreateStream(new Point(this.x, this.y + this._middle));
                    }
                }
                if (state == "damaged" && this._lastLoadedState == "") {
                    SOUNDS.Play(SOUNDS.DamageSoundIDForLevel(this._lvl.Get() | 0));
                    if (this._type != 17 && this._type != 18) {
                        Smoke.CreatePoof(new Point(this.x, this.y + this._middle), this._middle, 0.5);
                    }
                }
            }
            this._lastLoadedState = state;
            if (Boolean(this._mc) && this._mc.hasEventListener(Event.ENTER_FRAME)) {
                this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
            }
            if (BYMConfig.instance.RENDERER_ON) {
                _loc7_ = as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP) === null;
            }
            for (_loc12_ of as3.values(param1)) {
                _loc13_ = String(_loc12_[0]);
                imageBitmapData = as3.cast(_loc12_[1], BitmapData);
                if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state][0] == _loc13_) {
                    this.m_shadowBMD = imageBitmapData;
                    if (!BYMConfig.instance.RENDERER_ON) {
                        (buildingAssetContainer = as3.cast(this._mcBase, BuildingAssetContainer)).Clear();
                        (_loc17_ = buildingAssetContainer.addChild(new Bitmap(imageBitmapData))).blendMode = BlendMode.MULTIPLY;
                        _loc17_.x = Number(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state][1].x);
                        _loc17_.y = Number(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state][1].y);
                    } else {
                        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).x = Number(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state][1].x);
                        as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).y = Number(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_SHADOW] + state][1].y);
                        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).x = this._mc.x + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).x - MAP.instance.offset.x;
                        as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).y = this._mc.y + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).y - MAP.instance.offset.y;
                        this.redrawShadowData();
                        as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) || as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW, new RasterData(as3.cast(imageBitmapData, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true));
                    }
                } else if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state][0] == _loc13_) {
                    this.setupImage(BFOUNDATION._RASTERDATA_TOP, state, this.topContainer, imageDataB, imageBitmapData, int.MAX_VALUE);
                    ioParts.push([imageBitmapData, imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state][1].x, imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state][1].y, imageBitmapData.width, imageBitmapData.height, 1]);
                    this.setupHit(BFOUNDATION._RASTERDATA_TOP, _loc9_, state);
                    if (_loc7_) {
                        this.updateRasterData();
                    }
                } else if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][0] == _loc13_) {
                    this._animBMD = imageBitmapData;
                    this._animLoaded = true;
                    _loc16_ = as3.cast(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][1], Rectangle);
                    this._animRect = new Rectangle(0, 0, _loc16_.width, _loc16_.height);
                    this._animFrames = imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][2] | 0;
                    if (this._animRandomStart) {
                        this._animTick = (Math.random() * (this._animFrames - 2)) | 0;
                    } else {
                        this._animTick = 0;
                    }
                    if (this._type == 9 || this._type == 19 || this._type == 25 || this._type == 54) {
                        this._animTick = 0;
                    }
                    this._animContainerBMD = new BitmapData(_loc16_.width, _loc16_.height, true, 16777215);
                    this.setupImage(BFOUNDATION._RASTERDATA_ANIM, state, this.animContainer, imageDataB, this._animContainerBMD, int.MAX_VALUE);
                    ioParts.push([imageBitmapData, _loc16_.x, _loc16_.y, _loc16_.width, _loc16_.height, this._animFrames]);
                    this.AnimFrame(false);
                    if (!this._mc.hasEventListener(Event.ENTER_FRAME)) {
                        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
                    }
                    if (!imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state]) {
                        this.setupHit(BFOUNDATION._RASTERDATA_ANIM, _loc9_, state);
                    }
                } else if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM2] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM2] + state][0] == _loc13_) {
                    this._anim2BMD = imageBitmapData;
                    this._anim2Loaded = true;
                    _loc16_ = as3.cast(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM2] + state][1], Rectangle);
                    this._anim2Rect = new Rectangle(0, 0, _loc16_.width, _loc16_.height);
                    this._anim2Frames = imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM2] + state][2] | 0;
                    if (this._animRandomStart) {
                        this._anim2Tick = (Math.random() * (this._anim2Frames - 2)) | 0;
                    } else {
                        this._anim2Tick = 0;
                    }
                    this._anim2ContainerBMD = new BitmapData(_loc16_.width, _loc16_.height, true, 16777215);
                    this.setupImage(BFOUNDATION._RASTERDATA_ANIM2, state, this.anim2Container, imageDataB, this._anim2ContainerBMD, int.MAX_VALUE);
                    if (this._animLoaded && this._anim2Loaded && this._anim3Loaded) {
                        this.AnimFrame(false);
                        if (!this._mc.hasEventListener(Event.ENTER_FRAME)) {
                            this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
                        }
                    }
                    if (!imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state]) {
                        this.setupHit(BFOUNDATION._RASTERDATA_ANIM2, _loc9_, state);
                    }
                } else if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM3] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM3] + state][0] == _loc13_) {
                    this._anim3BMD = imageBitmapData;
                    this._anim3Loaded = true;
                    _loc16_ = as3.cast(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM3] + state][1], Rectangle);
                    this._anim3Rect = new Rectangle(0, 0, _loc16_.width, _loc16_.height);
                    this._anim3Frames = imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM3] + state][2] | 0;
                    if (this._animRandomStart) {
                        this._anim3Tick = (Math.random() * (this._anim3Frames - 2)) | 0;
                    } else {
                        this._anim3Tick = 0;
                    }
                    this._anim3ContainerBMD = new BitmapData(_loc16_.width, _loc16_.height, true, 16777215);
                    this.setupImage(BFOUNDATION._RASTERDATA_ANIM3, state, this.anim3Container, imageDataB, this._anim3ContainerBMD, int.MAX_VALUE);
                    if (this._animLoaded && this._anim2Loaded && this._anim3Loaded) {
                        this.AnimFrame(false);
                        if (!this._mc.hasEventListener(Event.ENTER_FRAME)) {
                            this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
                        }
                    }
                    if (!imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state]) {
                        this.setupHit(BFOUNDATION._RASTERDATA_ANIM3, _loc9_, state);
                    }
                } else if (Boolean(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state]) && imageDataA.baseurl + imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][0] == _loc13_) {
                    this._animBMD = imageBitmapData;
                    this._animLoaded = true;
                    _loc16_ = as3.cast(imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][1], Rectangle);
                    this._animRect = new Rectangle(0, 0, _loc16_.width, _loc16_.height);
                    this._animFrames = imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_ANIM] + state][2] | 0;
                    if (this._animRandomStart) {
                        this._animTick = (Math.random() * (this._animFrames - 2)) | 0;
                    } else {
                        this._animTick = 0;
                    }
                    if (this._type == 9 || this._type == 19 || this._type == 25 || this._type == 54) {
                        this._animTick = 0;
                    }
                    this._animContainerBMD = new BitmapData(_loc16_.width, _loc16_.height, true, 16777215);
                    this.setupImage(BFOUNDATION._RASTERDATA_ANIM, state, this.animContainer, imageDataB, this._animContainerBMD, int.MAX_VALUE);
                    ioParts.push([imageBitmapData, _loc16_.x, _loc16_.y, _loc16_.width, _loc16_.height, this._animFrames]);
                    this.AnimFrame(false);
                    if (!this._mc.hasEventListener(Event.ENTER_FRAME)) {
                        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
                    }
                    if (!imageDataB[BFOUNDATION._IMAGE_NAMES[BFOUNDATION._RASTERDATA_TOP] + state]) {
                        this.setupHit(BFOUNDATION._RASTERDATA_ANIM, _loc9_, state);
                    }
                } else if (imageDataB.topdestroyedfire && this._oldRenderState == BFOUNDATION.k_STATE_DAMAGED && !GLOBAL._catchup && imageDataA.baseurl + imageDataB.topdestroyedfire[0] == _loc13_) {
                    Fire.Add(this._mc, new Bitmap(imageBitmapData), new Point(imageDataB.topdestroyedfire[1].x, imageDataB.topdestroyedfire[1].y));
                }
            }
        }
        if (BYMConfig.instance.RENDERER_ON) {
            if (!this._animLoaded && as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM) instanceof RasterData) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM).clear();
                as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_ANIM, null);
            }
            if (!this._anim2Loaded && as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM2) instanceof RasterData) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM2).clear();
                as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_ANIM2, null);
            }
            if (!this._anim3Loaded && as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM3) instanceof RasterData) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_ANIM3).clear();
                as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_ANIM3, null);
            }
        }
        this.AnimFrame();
        this.ioBuildHit(ioParts);
        if (this._ioHover) {
            this.ioShowGlow();
        }
    }

    protected setupImage(param1: uint, param2: string, param3: BuildingAssetContainer, param4: any, param5: BitmapData, param6: number): void {
        as3.vget(this._offsets, param1).x = Number(param4[BFOUNDATION._IMAGE_NAMES[param1] + param2][1].x);
        as3.vget(this._offsets, param1).y = Number(param4[BFOUNDATION._IMAGE_NAMES[param1] + param2][1].y);
        if (!BYMConfig.instance.RENDERER_ON) {
            param3.Clear();
            param3.addChild(new Bitmap(param5));
            param3.x = as3.vget(this._offsets, param1).x;
            param3.y = as3.vget(this._offsets, param1).y;
        } else {
            as3.vget(this._rasterPt, param1).x = this._mc.x + as3.vget(this._offsets, param1).x - MAP.instance.offset.x;
            as3.vget(this._rasterPt, param1).y = this._mc.y + as3.vget(this._offsets, param1).y - MAP.instance.offset.y;
            as3.vget(this._rasterData, param1) || as3.vset(this._rasterData, param1, new RasterData(as3.cast(param5, IBitmapDrawable), as3.vget(this._rasterPt, param1), int.MAX_VALUE));
            as3.vget(this._rasterData, param1).data = as3.cast(param5, IBitmapDrawable);
            as3.vget(this._rasterData, param1).visible = this._mc.visible;
            as3.vset(this._sources, param1, param3);
        }
    }

    protected setupHit(param1: uint, param2: int, param3: string): void {
        if (MovieClipUtils.validateFrameLabel(as3.as(this._mcHit, MovieClip), "f" + param2 + param3)) {
            this._mcHit.gotoAndStop("f" + param2 + param3);
        }
        if (param3 == "destroyed" && this._type !== 14) {
            if (MovieClipUtils.validateFrameLabel(as3.as(this._mcHit, MovieClip), "f" + param3)) {
                this._mcHit.gotoAndStop("f" + param3);
            } else if (GLOBAL._aiDesignMode) {
                print("BFOUNDATION.ImageCallback building has no hit 1 " + this._type + " frame f" + param3);
            }
        }
        this.m_hitOffsetIndex = param1;
        if (BYMConfig.instance.RENDERER_ON) {
            this._mcHit.x = this._mc.x + as3.vget(this._offsets, param1).x;
            this._mcHit.y = this._mc.y + as3.vget(this._offsets, param1).y;
        } else {
            this._mcHit.x = as3.vget(this._offsets, param1).x;
            this._mcHit.y = as3.vget(this._offsets, param1).y;
        }
        this.ioPlaceHit();
    }

    public showFootprint(param1: boolean, param2: boolean = false): void {
        if (this._mcFootprint) {
            if (BYMConfig.instance.RENDERER_ON && (this._mcFootprint.width | this._mcFootprint.height) !== 0) {
                as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FOOTPRINT).x = -this._mcFootprint.width >> 1;
                as3.vget(this._offsets, BFOUNDATION._RASTERDATA_FOOTPRINT).y = 0;
                as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FOOTPRINT).x = this._mcFootprint.x - (this._mcFootprint.width >> 1) - MAP.instance.offset.x;
                as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FOOTPRINT).y = this._mcFootprint.y - MAP.instance.offset.y;
                if (!this.m_footprintBMD) {
                    this.m_footprintBMD = new BitmapData(this._mcFootprint.width, this._mcFootprint.height, true, 0);
                    this.m_footprintBMD.draw(as3.cast(this._mcFootprint, IBitmapDrawable), new Matrix(1, 0, 0, 1, this._mcFootprint.width * 0.5, 0));
                } else if (param2) {
                    this.m_footprintBMD.fillRect(this.m_footprintBMD.rect, 0);
                    this.m_footprintBMD.draw(as3.cast(this._mcFootprint, IBitmapDrawable), new Matrix(1, 0, 0, 1, this._mcFootprint.width * 0.5, 0));
                }
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT) || as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT, new RasterData(as3.cast(this.m_footprintBMD, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_FOOTPRINT), MAP.DEPTH_SHADOW + 1));
                if (param2) {
                    as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT).data = as3.cast(this.m_footprintBMD, IBitmapDrawable);
                }
                if ((GLOBAL._selectedBuilding === this || GLOBAL._newBuilding === this) && as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) instanceof RasterData) {
                    as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW).visible = false;
                }
            } else {
                this._mcFootprint.visible = true;
            }
        }
        if (param1) {
            this.BlockClicks();
        }
    }

    public hideFootprint(param1: boolean): void {
        if (GLOBAL._selectedBuilding != this) {
            if (BYMConfig.instance.RENDERER_ON && as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT) instanceof RasterData) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT).clear();
                as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_FOOTPRINT, null);
            }
            if (this._mcFootprint) {
                this._mcFootprint.visible = false;
            }
        }
        if (this._mcFootprint) {
            this._mcFootprint.gotoAndStop(1);
        }
        if (param1) {
            this.UnblockClicks();
        }
        this.updateRasterData();
    }

    public get tickLimit(): int {
        if (this.health == 0 && !this._repairing) {
            return BFOUNDATION.TICK_LIMIT;
        }
        let _loc1_: int = BFOUNDATION.TICK_LIMIT;
        if (this._countdownBuild.Get() > 0) {
            _loc1_ = Math.min(_loc1_, this._countdownBuild.Get()) | 0;
        }
        if (this._countdownUpgrade.Get() > 0) {
            _loc1_ = Math.min(_loc1_, this._countdownUpgrade.Get()) | 0;
        }
        if (this._countdownFortify.Get() > 0) {
            _loc1_ = Math.min(_loc1_, this._countdownFortify.Get()) | 0;
        }
        return _loc1_;
    }

    public Tick(param1: int): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        if (this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() + this._repairing > 0) {
            _loc2_ = 0;
            _loc3_ = 0;
            if (this._repairing == 1) {
                _loc5_ = this._lvl.Get() == 0 ? 0 : (this._lvl.Get() - 1) | 0;
                _loc4_ = Math.ceil(this.maxHealth / Math.min(3600, Number(this._buildingProps.repairTime[_loc5_]))) | 0;
                this.setHealth(this.health + _loc4_ * param1);
                if (this.health >= this.maxHealth) {
                    this.Repaired();
                }
            } else if (this.health == this.maxHealth) {
                if (this._countdownUpgrade.Get() > 0 && this._hasWorker && this._hasResources) {
                    this._countdownUpgrade.Add(-param1);
                    if (!Math.max(this._countdownUpgrade.Get(), 0)) {
                        this.Upgraded();
                    }
                } else if (this._countdownBuild.Get() > 0 && this._hasWorker && this._hasResources) {
                    this._countdownBuild.Add(-param1);
                    if (!Math.max(this._countdownBuild.Get(), 0)) {
                        this.Constructed();
                    }
                } else if (this._countdownFortify.Get() > 0 && this._hasWorker && this._hasResources) {
                    this._countdownFortify.Add(-param1);
                    if (!Math.max(this._countdownFortify.Get(), 0)) {
                        this.Fortified();
                    }
                }
            }
        }
        this.Update();
    }

    protected override updateRasterData(): void {
        let _loc4_: RasterData = null;
        let _loc5_: Point = null;
        let _loc6_: number = NaN;
        let _loc7_: number = NaN;
        let _loc8_: boolean = false;
        let _loc9_: DisplayObject = null;
        let _loc10_: int = 0;
        if (!BYMConfig.instance.RENDERER_ON || this.m_isCleared) {
            return;
        }
        let _loc1_: Point = MAP.instance.offset;
        let _loc2_: Function = as3.bind(MAP.instance.viewRect, MAP.instance.viewRect.intersects);
        let _loc3_: Rectangle = new Rectangle();
        if (this._mcHit) {
            this._mcHit.x = this._mc.x + as3.vget(this._offsets, this.m_hitOffsetIndex).x;
            this._mcHit.y = this._mc.y + as3.vget(this._offsets, this.m_hitOffsetIndex).y;
        }
        if (this._mc) {
            _loc6_ = this._mc.height * 0.5;
            if (this._middle) {
                _loc6_ = this._middle;
            }
            this.m_baseDepth = 0;
            _loc7_ = Math.max(MAP.DEPTH_SHADOW + 1, (this._mc.y - _loc1_.y + _loc6_) * 1000 + (this._mc.x - _loc1_.x));
            _loc10_ = (BFOUNDATION._RASTERDATA_SHADOW + 1) | 0;
            while (_loc10_ < BFOUNDATION._RASTERDATA_AMOUNT) {
                _loc4_ = as3.vget(this._rasterData, _loc10_);
                _loc5_ = as3.vget(this._rasterPt, _loc10_);
                if (Boolean(_loc4_) && Boolean(_loc5_)) {
                    this.m_baseDepth = _loc10_ - 1;
                    _loc4_.depth = _loc10_ === BFOUNDATION._RASTERDATA_FORTBACK ? _loc7_ - 1 : _loc7_ + _loc10_ - 1;
                    _loc5_.x = this._mc.x + as3.vget(this._offsets, _loc10_).x - _loc1_.x;
                    _loc5_.y = this._mc.y + as3.vget(this._offsets, _loc10_).y - _loc1_.y;
                    _loc9_ = as3.vget(this._sources, _loc10_);
                    _loc3_.x = _loc5_.x;
                    _loc3_.y = _loc5_.y;
                    _loc3_.width = _loc4_.rect.width;
                    _loc3_.height = _loc4_.rect.height;
                    _loc4_.visible = Boolean(_loc2_(_loc3_) && (Boolean(_loc9_) && !_loc9_.visible ? false : this._mc.visible));
                    _loc4_.alpha = this._mc.alpha;
                }
                _loc10_++;
            }
            if (this._ioGlow && this._ioGlowPt) {
                // the hover glow: under every part of the building (and its fortification)
                this._ioGlowPt.x = this._mc.x + this._ioGlowOff.x - _loc1_.x;
                this._ioGlowPt.y = this._mc.y + this._ioGlowOff.y - _loc1_.y;
                this._ioGlow.depth = _loc7_ - 1.5;
                this._ioGlow.visible = this._mc.visible;
            }
            _loc4_ = as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW);
            _loc5_ = as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW);
            if (this._mcBase && _loc4_ && Boolean(_loc5_)) {
                _loc5_.x = this._mcBase.x + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).x - _loc1_.x;
                _loc5_.y = this._mcBase.y + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).y - _loc1_.y;
                if (!this._moving && GLOBAL._newBuilding !== this) {
                    _loc3_.x = _loc5_.x;
                    _loc3_.y = _loc5_.y;
                    _loc3_.width = _loc4_.rect.width;
                    _loc3_.height = _loc4_.rect.height;
                    _loc4_.visible = Boolean(_loc2_(_loc3_) && this._mcBase.visible);
                }
            }
        }
        super.updateRasterData();
    }

    protected redrawShadowData(): void {
        let _loc3_: BitmapData = null;
        if (!BYMConfig.instance.RENDERER_ON || !BYMConfig.instance.OPTIMIZED_SHADOWS || !this.m_shadowBMD) {
            return;
        }
        let _loc1_: Point = MAP.instance.offset;
        let _loc2_: Point = as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW);
        if (Boolean(this._mcBase) && Boolean(_loc2_)) {
            _loc2_.x = this._mcBase.x + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).x - _loc1_.x;
            _loc2_.y = this._mcBase.y + as3.vget(this._offsets, BFOUNDATION._RASTERDATA_SHADOW).y - _loc1_.y;
        }
        _loc3_ = new BitmapData(this.m_shadowBMD.width, this.m_shadowBMD.height, true);
        let _loc4_: Rectangle = new Rectangle(as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).x, as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW).y, _loc3_.width, _loc3_.height);
        _loc3_.copyPixels(MAP.effectsBMD, _loc4_, new Point());
        _loc3_.draw(as3.cast(this.m_shadowBMD, IBitmapDrawable), null, null, BlendMode.MULTIPLY);
        if (as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) instanceof RasterData === false) {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW, new RasterData(as3.cast(_loc3_, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW), MAP.DEPTH_SHADOW, null, true));
        } else {
            as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW).data = as3.cast(_loc3_, IBitmapDrawable);
        }
        if (!this._moving) {
            as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW).visible = this._mcBase.visible;
        }
    }

    public TickFast(param1: Event = null): void {
    }

    public TickAttack(): void {
    }

    public AnimFrame(param1: boolean = true): void {
        let _loc2_: boolean = false;
        if (!GLOBAL._catchup && this._animBMD && Boolean(this._animContainerBMD)) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
            _loc2_ = true;
            if (param1) {
                if (this._class == "resource") {
                    if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
                        this._animTick = (this._animTick + GLOBAL._harvesterOverdrivePower.Get()) | 0;
                    } else {
                        ++this._animTick;
                    }
                } else {
                    ++this._animTick;
                }
                if (this._animTick >= this._animFrames) {
                    this._animTick = 0;
                }
            }
        }
        if (!GLOBAL._catchup && Boolean(this._anim2BMD)) {
            this._anim2Rect.x = this._anim2Rect.width * this._anim2Tick;
            this._anim2ContainerBMD.copyPixels(this._anim2BMD, this._anim2Rect, this._nullPoint);
            _loc2_ = true;
            if (param1) {
                ++this._anim2Tick;
                if (this._anim2Tick >= this._anim2Frames) {
                    this._anim2Tick = 0;
                }
            }
        }
        if (!GLOBAL._catchup && Boolean(this._anim3BMD)) {
            this._anim3Rect.x = this._anim3Rect.width * this._anim3Tick;
            this._anim3ContainerBMD.copyPixels(this._anim3BMD, this._anim3Rect, this._nullPoint);
            _loc2_ = true;
            if (param1) {
                ++this._anim3Tick;
                if (this._anim3Tick >= this._anim3Frames) {
                    this._anim3Tick = 0;
                }
            }
        }
        if (_loc2_) {
            this.updateRasterData();
        }
    }

    public Instructions(): void {
        this._buildingInstructions += KEYS.Get("building_instructions");
    }

    public FollowMouse(): void {
        this._ioFollowKey = null;
        if (BYMConfig.instance.RENDERER_ON) {
            this.showFootprint(true);
        }
        this.updateRasterData();
        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
        MAP._GROUND.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
        this._mc.addEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
        this.Render(BFOUNDATION.k_STATE_DEFAULT);
    }

    public FollowMouseB(param1: Event = null): void {
        let ioX: int = ((((MAP._GROUND.mouseX - this._mouseOffset.x) / 10) | 0) * 10) | 0;
        let ioY: int = ((((MAP._GROUND.mouseY - this._mouseOffset.y) / 5) | 0) * 5) | 0;
        // Every frame, whether or not it moved: the overlap check, the building's layers and its
        // footprint were all worked out again. Now only when it lands on another snap step or the
        // view moves (scrolled or zoomed while held).
        let ioKey: string = ioX + "," + ioY + "," + MAP._GROUND.x + "," + MAP._GROUND.y + "," + MAP._GROUND.scaleX;
        if (ioKey == this._ioFollowKey && this._mc.x == ioX && this._mc.y == ioY) {
            return;
        }
        this._ioFollowKey = ioKey;
        let _loc3_: int = this._mcFootprint.currentFrame;
        this._mc.x = ioX;
        this._mc.y = ioY;
        // (checked where it is now: the stock check came before the move, so the footprint showed
        // whether the last spot was free, a step behind)
        let _loc2_: string = BASE.BuildBlockers(this, this._class == "decoration");
        this._mcBase.x = this._mc.x;
        this._mcBase.y = this._mc.y;
        this.updateRasterData();
        if (this._mcFootprint) {
            this._mcFootprint.x = this._mc.x;
            this._mcFootprint.y = this._mc.y;
            if (_loc2_ != "") {
                this._mcFootprint.gotoAndStop(2);
            } else {
                this._mcFootprint.gotoAndStop(1);
            }
        }
        this.showFootprint(false, _loc3_ !== this._mcFootprint.currentFrame);
        if (!BYMConfig.instance.RENDERER_ON) {
            MAP.SortDepth();
        }
    }

    public Cancel(): void {
        if (GLOBAL._newBuilding === this) {
            this.clear();
        }
        GLOBAL._newBuilding = null;
        if (this._mc) {
            this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
            this._mc.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
        }
        MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
        if (this._mcBase.parent) {
            this._mcBase.parent.removeChild(this._mcBase);
        }
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        if (this._mcHit.parent) {
            this._mcHit.parent.removeChild(this._mcHit);
        }
        if (this._mcFootprint.parent) {
            this._mcFootprint.parent.removeChild(this._mcFootprint);
        }
        BASE.BuildingDeselect();
        this.clearRasterData();
    }

    protected clearRasterData(): void {
        let _loc1_: RasterData = null;
        let _loc2_: int = 0;
        this.ioHideGlow();
        if (!BYMConfig.instance.RENDERER_ON || !this._rasterData) {
            return;
        }
        _loc2_ = (this._rasterData.length - 1) | 0;
        while (_loc2_ >= 0) {
            _loc1_ = as3.vget(this._rasterData, _loc2_);
            if (_loc1_) {
                _loc1_.clear();
            }
            as3.vset(this._rasterData, _loc2_, null);
            _loc2_--;
        }
    }

    /**
     * Placing a building runs on the ground's MOUSE_UP. If anything in it throws, Flash stops
     * delivering that MOUSE_UP to the other listeners, so MAP.Release never runs: the building keeps
     * following the mouse and the yard drags with it until the game is restarted (it happened).
     * Whatever fails, the placement is now abandoned cleanly, and what failed is reported.
     */
    public Place(param1: MouseEvent = null): void {
        try {
            this.ioPlaceInner(param1);
        } catch (e) {
            LOGGER.Log("err", "Place failed for building type " + this._type + (BASE.isOutpost ? " (outpost)" : "") + ": " + e + " | " + e.getStackTrace());
            try {
                this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
                MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
                this._mc.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
                GLOBAL._newBuilding = null;
                this.Cancel();
            } catch (e2) {
            }
            MAP.Release(null);
        }
    }

    private ioPlaceInner(param1: MouseEvent = null): void {
        let BragBiggulp: Function = null;
        let BragTotem: Function = null;
        let tmpBuildTime: int = 0;
        let fromStorage: int = 0;
        let isInfernoBuilding: boolean = false;
        let mc: MovieClip = null;
        let totemImgUrl: string = null;
        let e: MouseEvent = param1;
        this.Description();
        if (!MAP._dragged) {
            if (BASE.BuildBlockers(this, this._class == "decoration") != "") {
                this.Cancel();
                return;
            }
            if (BASE.isInfernoMainYardOrOutpost) {
                SOUNDS.Play("inf_buildingplace");
            } else {
                SOUNDS.Play("buildingplace");
            }
            this._mc.alpha = 1;
            this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
            MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
            this._mc.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
            if (BASE.CanBuild(this._type, this._buildInstant).error) {
                this.Cancel();
                GLOBAL._newBuilding = null;
                return;
            }
            GLOBAL._newBuilding = null;
            if (this._buildInstant) {
                if (!this._buildInstantCost) {
                    this.Cancel();
                    return;
                }
                if (BASE._credits.Get() < this._buildInstantCost.Get()) {
                    this.Cancel();
                    POPUPS.DisplayGetShiny();
                    return;
                }
            }
            this._hasResources = false;
            this._hasWorker = false;
            ++BASE._buildingCount;
            this._id = BASE._buildingCount;
            tmpBuildTime = this._buildingProps.costs[0].time.Get() | 0;
            if (STORE._storeData.BST) {
                tmpBuildTime = (tmpBuildTime - tmpBuildTime * 0.2) | 0;
            }
            this._countdownBuild.Set(tmpBuildTime);
            this.setHealth(Number(this._buildingProps.hp[0]));
            this.maxHealthProperty.value = this.health;
            this.PlaceB();
            if (this._mc.contains(this._mcHit)) {
                this._mc.removeChild(this._mcHit);
            }
            if (BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.addChild(this._mcHit);
            } else {
                this._mc.addChild(this._mcHit);
            }
            this.Tick(1);
            this.Update();
            this.Description();
            fromStorage = InventoryManager.buildingStorageRemove(this._type);
            if (!fromStorage) {
                if (!this._buildInstant) {
                    isInfernoBuilding = BASE.isInfernoBuilding(this._type >>> 0);
                    BASE.Charge(1, Number(this._buildingProps.costs[0].r1.Get()), false, isInfernoBuilding);
                    BASE.Charge(2, Number(this._buildingProps.costs[0].r2.Get()), false, isInfernoBuilding);
                    BASE.Charge(3, Number(this._buildingProps.costs[0].r3.Get()), false, isInfernoBuilding);
                    BASE.Charge(4, Number(this._buildingProps.costs[0].r4.Get()), false, isInfernoBuilding);
                    if (STORE._storeItems["BUILDING" + this._type]) {
                        BASE.Purchase("BUILDING" + this._type, 1, "building");
                    }
                    if (GLOBAL.ioFreeBuild()) {
                        // Admin test mode (and the Designer): built at once.
                        this.Constructed();
                    } else if (GLOBAL.INFERNO_ONLY && this._buildingProps.type == "decoration" && this._buildingProps.costs[0].time.Get() == 0) {
                        // Inferno-only: a decoration is up the moment it's placed (no worker, no countdown)
                        this.Constructed();
                    } else if (this._buildingProps.costs[0].time.Get() != 0 && InventoryManager.buildingStorageCount(this._type) == 0) {
                        QUEUE.Add("building" + this._id, this);
                    }
                } else {
                    if (this._buildInstantCost.Get() > 0) {
                        BASE.Purchase("IB", this._buildInstantCost.Get() | 0, "building");
                    }
                    LOGGER.Stat([71, this._buildInstantCost.Get(), this._type]);
                    this.Constructed();
                }
            } else {
                this.Constructed();
                if (this._type == 120) {
                    LOGGER.Stat([75, "placedgoldenbiggulp"]);
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    BragBiggulp = (): void => {
                        GLOBAL.CallJS("sendFeed", ["biggulp-construct", KEYS.Get("pop_biggulpbuilt_streamtitle"), KEYS.Get("pop_biggulpbuilt_streambody"), "dave_711promo.png"]);
                        POPUPS.Next();
                    };
                    BragTotem = (param1: int): Function => {
                        let totemType: int = 0;
                        totemType = param1;
                        return (param1: MouseEvent = null): void => {
                            switch (totemType) {
                                case 121:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave1streamtitle"), KEYS.Get("wmi_wave1streamdesc"), "wmitotemfeed1.1.png"]);
                                    break;
                                case 122:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave10streamtitle"), KEYS.Get("wmi_wave10streamdesc"), "wmitotemfeed2.png"]);
                                    break;
                                case 123:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave20streamtitle"), KEYS.Get("wmi_wave20streamdesc"), "wmitotemfeed3.png"]);
                                    break;
                                case 124:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave30streamtitle"), KEYS.Get("wmi_wave30streamdesc"), "wmitotemfeed4.png"]);
                                    break;
                                case 125:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave31streamtitle"), KEYS.Get("wmi_wave31streamdesc"), "wmitotemfeed5.png"]);
                                    break;
                                case 126:
                                    GLOBAL.CallJS("sendFeed", ["wmitotem-construct", KEYS.Get("wmi_wave32streamtitle"), KEYS.Get("wmi_wave32streamdesc"), "wmitotemfeed6.png"]);
                                    break;
                                case 131:
                                    switch (this._lvl.Get()) {
                                        case 1:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave1streamtitle"), KEYS.Get("wmi2_wave1streamdesc"), "wmitotemfeed2_1.png"]);
                                            break;
                                        case 2:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave10streamtitle"), KEYS.Get("wmi2_wave10streamdesc"), "wmitotemfeed2_2.png"]);
                                            break;
                                        case 3:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave20streamtitle"), KEYS.Get("wmi2_wave20streamdesc"), "wmitotemfeed2_3.png"]);
                                            break;
                                        case 4:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave30streamtitle"), KEYS.Get("wmi2_wave30streamdesc"), "wmitotemfeed2_4.png"]);
                                            break;
                                        case 5:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave31streamtitle"), KEYS.Get("wmi2_wave31streamdesc"), "wmitotemfeed2_5.png"]);
                                            break;
                                        case 6:
                                            GLOBAL.CallJS("sendFeed", ["wmi2totem-construct", KEYS.Get("wmi2_wave32streamtitle"), KEYS.Get("wmi2_wave32streamdesc"), "wmitotemfeed2_6.png"]);
                                    }
                            }
                            POPUPS.Next();
                        };
                    };
                    mc = new popup_biggulp();
                    if (BASE.is711Valid()) {
                        if (this._type == 120) {
                            mc.tA.htmlText = "<b>" + KEYS.Get("pop_biggulpbuilt_title") + "</b>";
                            mc.tB.htmlText = KEYS.Get("pop_biggulpbuilt_body");
                            mc.bPost.SetupKey("btn_brag");
                            mc.bPost.addEventListener(MouseEvent.CLICK, BragBiggulp);
                            mc.bPost.Highlight = true;
                            POPUPS.Push(mc, null, null, null, "building-biggulp.png");
                        }
                    }
                    totemImgUrl = "";
                    if (BTOTEM.IsTotem(this._type)) {
                        mc.tA.htmlText = "<b>" + KEYS.Get("wmi_totemwon") + "</b>";
                        mc.tB.htmlText = "";
                        mc.bPost.SetupKey("btn_brag");
                        mc.bPost.addEventListener(MouseEvent.CLICK, BragTotem(this._type));
                        mc.bPost.Highlight = true;
                        switch (this._lvl.Get()) {
                            case 1:
                                totemImgUrl = "building-wmitotem1.png";
                                break;
                            case 2:
                                totemImgUrl = "building-wmitotem2.png";
                                break;
                            case 3:
                                totemImgUrl = "building-wmitotem3.png";
                                break;
                            case 4:
                                totemImgUrl = "building-wmitotem4.png";
                                break;
                            case 5:
                                totemImgUrl = "building-wmitotem5.png";
                                break;
                            case 6:
                                totemImgUrl = "building-wmitotem6.png";
                                break;
                            default:
                                totemImgUrl = "building-wmitotem6.png";
                        }
                        POPUPS.Push(mc, null, null, null, totemImgUrl);
                    } else if (BTOTEM.IsTotem2(this._type)) {
                        mc.tA.htmlText = "<b>" + KEYS.Get("wmi2_totemwon") + "</b>";
                        mc.tB.htmlText = "";
                        mc.bPost.SetupKey("btn_brag");
                        mc.bPost.addEventListener(MouseEvent.CLICK, BragTotem(this._type));
                        mc.bPost.Highlight = true;
                        switch (this._lvl.Get()) {
                            case 1:
                                totemImgUrl = "building-wmi2totem1.png";
                                break;
                            case 2:
                                totemImgUrl = "building-wmi2totem2.png";
                                break;
                            case 3:
                                totemImgUrl = "building-wmi2totem3.png";
                                break;
                            case 4:
                                totemImgUrl = "building-wmi2totem4.png";
                                break;
                            case 5:
                                totemImgUrl = "building-wmi2totem5.png";
                                break;
                            case 6:
                                totemImgUrl = "building-wmi2totem6.png";
                                break;
                            default:
                                totemImgUrl = "building-wmi2totem6.png";
                        }
                        POPUPS.Push(mc, null, null, null, totemImgUrl);
                    }
                }
            }
            if (BASE._pendingPurchase.length == 0) {
                BASE.Save();
            }
            UPDATES.Create(["BP", this._type, this.Export()]);
            LOGGER.Stat([5, this._type]);
        }
        this.updateRasterData();
        this.onMove();
    }

    public SetGiftingProps(param1: int, param2: string, param3: int, param4: string, param5: string): void {
        this._threadid = param1;
        this._subject = param2;
        this._senderid = param3;
        this._senderName = param4;
        this._senderPic = param5;
        UPDATES.Create(["BT", this._id, this._threadid, this._subject, this._senderid, this._senderName, this._senderPic]);
    }

    protected setupListeners(): void {
        if (!this._mcHit) {
            return;
        }
        if (!this._mcHit.hasEventListener(MouseEvent.MOUSE_DOWN)) {
            this._mcHit.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.Mousedown));
        }
        if (!this._mcHit.hasEventListener(MouseEvent.MOUSE_UP)) {
            this._mcHit.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Mouseup));
        }
        if (!this._mcHit.hasEventListener(MouseEvent.MOUSE_OVER)) {
            this._mcHit.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        }
        if (!this._mcHit.hasEventListener(MouseEvent.MOUSE_OUT)) {
            this._mcHit.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        }
        this._mcHit.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ioHoverIn));
        this._mcHit.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ioHoverOut));
    }

    protected removeListeners(): void {
        if (!this._mcHit) {
            return;
        }
        if (this._mcHit.hasEventListener(MouseEvent.MOUSE_DOWN)) {
            this._mcHit.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.Mousedown));
        }
        if (this._mcHit.hasEventListener(MouseEvent.MOUSE_UP)) {
            this._mcHit.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Mouseup));
        }
        if (this._mcHit.hasEventListener(MouseEvent.MOUSE_OVER)) {
            this._mcHit.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        }
        if (this._mcHit.hasEventListener(MouseEvent.MOUSE_OUT)) {
            this._mcHit.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        }
        this._mcHit.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ioHoverIn));
        this._mcHit.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.ioHoverOut));
        this.ioHoverOut(null);
    }

    public PlaceB(): void {
        this._position = new Point(this._mc.x, this._mc.y);
        this._mc.mouseEnabled = false;
        this._mcBase.mouseEnabled = false;
        this._mcBase.x = this._mc.x;
        this._mcBase.y = this._mc.y;
        this._mc.alpha = 1;
        this._mcFootprint.x = this._mc.x;
        this._mcFootprint.y = this._mc.y;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK || this._senderid == LOGIN._playerID) {
            this._mcHit.mouseEnabled = true;
            this._mcHit.buttonMode = true;
            this.setupListeners();
        } else {
            this._mc.mouseEnabled = false;
            this._mc.mouseChildren = false;
            this._mcHit.mouseEnabled = false;
            this._mcHit.mouseChildren = false;
            this._mcHit.buttonMode = false;
        }
        if (!(this._destroyed && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD)) {
            this.GridCost(true);
        }
        if (this._type == 7) {
            BASE._buildingsMushrooms["m" + this._id] = this;
        } else {
            BASE.buildings.push(this);
            BASE._buildingsAll["b" + this._id] = this;
            if (this._class == "wall") {
                BASE._buildingsWalls["b" + this._id] = this;
            } else if (this._class == "trap") {
                BASE._buildingsTowers["b" + this._id] = this;
            } else if (this._class == "tower") {
                BASE._buildingsTowers["b" + this._id] = this;
                BASE._buildingsMain["b" + this._id] = this;
                if (MONSTERBUNKER.isBunkerBuilding(this._type)) {
                    BASE._buildingsBunkers["b" + this._id] = this;
                }
            } else if (this._class == "gift" || this._class == "taunt") {
                BASE._buildingsGifts["b" + this._id] = this;
            } else if (this._class != "cage") {
                BASE._buildingsMain["b" + this._id] = this;
            }
        }
        if (!GLOBAL._catchup && !BASE.processing) {
            BASE.HideFootprints();
        }
        if (this._class != "mushroom") {
            BuildingOverlay.Setup(this);
        }
        this.Description();
        this.Update();
        this._placing = false;
        if (this._class != "wall" && this._class != "trap") {
            BUILDINGS._buildingID = 0;
        }
        GLOBAL.eventDispatcher.dispatchEvent(new BuildingEvent(BuildingEvent.PLACED_FOR_CONSTRUCTION, this));
        this.updateRasterData();
    }

    public Destroyed(param1: boolean = true): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (!this._destroyed) {
            this._destroyed = true;
            ATTACK.Damage(this._mc.x, this._mc.y, this._buildingProps.hp[this._lvl.Get() - 1] | 0);
            if (this._repairing == 1) {
                this._repairing = 0;
                QUEUE.Remove("building" + this._id, true, this);
                ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downed_repaircancel", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }) + "</font>");
            } else if (this._countdownBuild.Get() > 0) {
                ATTACK.Damage(this._mc.x, this._mc.y, this._buildingProps.hp[this._lvl.Get()] | 0);
                ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downed_buildcancel", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }) + "</font>");
            } else if (this._countdownUpgrade.Get()) {
                ATTACK.Damage(this._mc.x, this._mc.y, this._buildingProps.hp[this._lvl.Get()] | 0);
                _loc2_ = (this._buildingProps.costs[this._lvl.Get()].time.Get() * GLOBAL._buildTime) | 0;
                _loc3_ = ((_loc2_ - this._countdownUpgrade.Get()) * 0.5) | 0;
                if (_loc3_ > 60 * 60 * 8) {
                    _loc3_ = (60 * 60 * 8) | 0;
                }
                if ((_loc4_ = (this._countdownUpgrade.Get() + _loc3_) | 0) < 0) {
                    _loc4_ = 0;
                }
                ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downed_upgradecancel", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)), "v3": this._lvl.Get() + 1 }) + "</font>");
                this._countdownUpgrade.Set(_loc4_);
            } else {
                ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downed", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }) + "</font>");
            }
            this.Update(true);
            this.GridCost(false);
            PATHING.ResetCosts();
            BASE.Save();
        }
        this._repairing = 0;
    }

    public Repair(): void {
        // Admin test mode (and the Designer): repaired at once.
        if (GLOBAL.ioFreeBuild() && this.health < this.maxHealth) {
            this._destroyed = false;
            this.setHealth(this.maxHealth);
            this.Repaired();
            this.Update();
            return;
        }
        this._repairing = 1;
        this._destroyed = false;
        this.Update();
        BASE.Save();
    }

    public Repaired(): void {
        this._repairing = 0;
        this.setHealth(this.maxHealth);
        if (this._type == 15 || this._type == 128) {
            HOUSING.HousingSpace();
        }
        this.Description();
        UI2.Update();
    }

    public HasWorker(): void {
        let _loc1_: uint = 0;
        let _loc2_: int = 0;
        let _loc3_: uint = 0;
        this._hasWorker = true;
        if (this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() > 0) {
            _loc1_ = (BASE.isInfernoBuilding(this._type >>> 0) || BASE.isInfernoMainYardOrOutpost ? 5 : 1) >>> 0;
            _loc2_ = 1;
            while (_loc2_ < 5) {
                _loc3_ = (!(!this._buildingProps.costs[this._lvl.Get()]) ? this._buildingProps.costs[this._lvl.Get()]["r" + _loc2_].Get() >>> 0 : 0) >>> 0;
                if (!_loc3_ && this._buildingProps.fortify_costs) {
                    _loc3_ = (!(!this._buildingProps.fortify_costs[this._fortification.Get()]) ? this._buildingProps.fortify_costs[this._fortification.Get()]["r" + _loc2_].Get() >>> 0 : 0) >>> 0;
                }
                if (_loc3_) {
                    ResourcePackages.Create(_loc1_, this, _loc3_, true);
                }
                _loc1_++;
                _loc2_++;
            }
        }
    }

    public Over(param1: MouseEvent): void {
        GLOBAL._buildingMousedOver = this;
    }

    public Out(param1: MouseEvent): void {
    }

    public FinishNowCost(): int {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc1_: boolean = true;
        if (this._countdownBuild.Get() > 0) {
            _loc2_ = this._countdownBuild.Get() | 0;
        }
        if (this._countdownUpgrade.Get() > 0) {
            _loc2_ = this._countdownUpgrade.Get() | 0;
        }
        if (this._countdownFortify.Get() > 0) {
            _loc2_ = this._countdownFortify.Get() | 0;
        }
        if (_loc1_ && _loc2_ <= 300) {
            return 0;
        }
        _loc3_ = Math.ceil(_loc2_ * 20 / 60 / 60) | 0;
        _loc4_ = Math.sqrt(_loc2_ * 0.8) | 0;
        return Math.min(_loc3_, _loc4_) | 0;
    }

    public InstantBuildCost(): int {
        let _loc1_: any = GLOBAL._buildingProps[this._type - 1].costs[0];
        let _loc2_: int = _loc1_.time.Get() | 0;
        if (_loc2_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 300)) {
            _loc2_ = 0;
        }
        let _loc3_: int = (_loc1_.r1.Get() + _loc1_.r2.Get() + _loc1_.r3.Get()) | 0;
        let _loc4_: int = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
        let _loc5_: int = STORE.ioBuildingTimeCost(_loc2_);
        let _loc6_: int = (_loc4_ + _loc5_) | 0;
        return (_loc6_ * 0.95) | 0;
    }

    public InstantFortifyCost(): int {
        if (this._buildingProps.fortify_costs.length <= this._fortification.Get()) {
            return 0;
        }
        let _loc1_: any = this._buildingProps.fortify_costs[this._fortification.Get()];
        let _loc2_: int = _loc1_.time.Get() | 0;
        if (_loc2_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 300)) {
            _loc2_ = 0;
        }
        let _loc3_: int = (_loc1_.r1.Get() + _loc1_.r2.Get() + _loc1_.r3.Get()) | 0;
        let _loc4_: int = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
        let _loc5_: int = STORE.ioBuildingTimeCost(_loc2_);
        let _loc6_: int = (_loc4_ + _loc5_) | 0;
        return (_loc6_ * 0.95) | 0;
    }

    public InstantUpgradeCost(): int {
        if (this._buildingProps.costs.length <= this._lvl.Get()) {
            return 0;
        }
        let _loc1_: any = this._buildingProps.costs[this._lvl.Get()];
        let _loc2_: int = _loc1_.time.Get() | 0;
        if (_loc2_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 300)) {
            _loc2_ = 0;
        }
        let _loc3_: int = (_loc1_.r1.Get() + _loc1_.r2.Get() + _loc1_.r3.Get()) | 0;
        let _loc4_: int = Math.ceil(Math.pow(Math.sqrt(_loc3_ / 2), 0.75)) | 0;
        let _loc5_: int = STORE.ioBuildingTimeCost(_loc2_);
        let _loc6_: int = (_loc4_ + _loc5_) | 0;
        return (_loc6_ * 0.95) | 0;
    }

    public DoInstantUpgrade(): boolean {
        let _loc1_: int = this.InstantUpgradeCost();
        if (BASE._credits.Get() >= _loc1_) {
            this.Upgraded();
            BASE.Purchase("IU", _loc1_, "upgrade");
            LOGGER.Stat([72, _loc1_, this._type, this._lvl.Get()]);
            return true;
        }
        POPUPS.DisplayGetShiny();
        return false;
    }

    public DoInstantFortify(): boolean {
        let _loc1_: int = this.InstantFortifyCost();
        if (BASE._credits.Get() >= _loc1_) {
            this.Fortified();
            BASE.Purchase("IF", _loc1_, "fortify");
            return true;
        }
        POPUPS.DisplayGetShiny();
        return false;
    }

    public Fortify(): boolean {
        let _loc1_: any = null;
        if (!QUEUE.CanDo().error) {
            _loc1_ = BASE.CanFortify(this);
            if (!_loc1_.error) {
                if (((this._buildingProps.fortify_costs[this._fortification.Get()].time.Get() * GLOBAL._buildTime) | 0) > 3600) {
                    UPDATES.Create(["BF", this._id]);
                }
                this.FortifyB();
                BASE.Save();
                return true;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(as3.str(_loc1_.errorMessage));
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            POPUPS.DisplayWorker(3, this);
        }
        return false;
    }

    public FortifyB(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        let _loc3_: int = 0;
        if (this._countdownFortify.Get() == 0) {
            _loc1_ = BASE.CanFortify(this);
            if (!_loc1_.error) {
                _loc2_ = this.FortifyCost();
                if (_loc2_.r1.Get() > 0) {
                    BASE.Charge(1, Number(_loc2_.r1.Get()));
                }
                if (_loc2_.r2.Get() > 0) {
                    BASE.Charge(2, Number(_loc2_.r2.Get()));
                }
                if (_loc2_.r3.Get() > 0) {
                    BASE.Charge(3, Number(_loc2_.r3.Get()));
                }
                if (_loc2_.r4.Get() > 0) {
                    BASE.Charge(4, Number(_loc2_.r4.Get()));
                }
                _loc3_ = (this._buildingProps.fortify_costs[this._fortification.Get()].time.Get() * GLOBAL._buildTime) | 0;
                this._countdownFortify.Set(_loc3_);
                this._hasResources = false;
                this._hasWorker = false;
                if (GLOBAL._catchup) {
                    this._hasResources = true;
                    this._hasWorker = true;
                }
                QUEUE.Add("building" + this._id, this);
                LOGGER.Stat([64, this._type, this._fortification.Get() + 1]);
                this._helpList = [];
                this.Update();
                if (GLOBAL.ioFreeBuild()) {
                    // Admin test mode (and the Designer): fortified at once.
                    this._countdownFortify.Set(0);
                    this.Fortified();
                    this.Update();
                } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._class == "tower") {
                    GLOBAL._selectedBuilding = this;
                    GLOBAL.Message(KEYS.Get("msg_inactivefortify"), KEYS.Get("btn_speedup"), STORE.SpeedUp, ["SP4"]);
                }
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(as3.str(_loc1_.errorMessage));
            }
        }
    }

    public FortifyCancel(): void {
        GLOBAL.Message(KEYS.Get("msg_fortifycancelconfirm"), KEYS.Get("msg_stopfortifying_btn"), as3.bind(this, this.FortifyCancelB));
    }

    public FortifyCancelB(param1: MouseEvent = null): void {
        UPDATES.Create(["BFC", this._id]);
        this.FortifyCancelC();
    }

    public FortifyCancelC(): void {
        let _loc1_: any = null;
        if (this._countdownFortify.Get() > 0) {
            QUEUE.Remove("building" + this._id, false, this);
            this._countdownFortify.Set(0);
            _loc1_ = this.FortifyCost();
            if (_loc1_.r1.Get() > 0) {
                BASE.Fund(1, _loc1_.r1.Get() | 0);
            }
            if (_loc1_.r2.Get() > 0) {
                BASE.Fund(2, _loc1_.r2.Get() | 0);
            }
            if (_loc1_.r3.Get() > 0) {
                BASE.Fund(3, _loc1_.r3.Get() | 0);
            }
            if (_loc1_.r4.Get() > 0) {
                BASE.Fund(4, _loc1_.r4.Get() | 0);
            }
            BASE.Save();
        }
    }

    public Upgrade(): boolean {
        let _loc1_: any = null;
        if (!QUEUE.CanDo().error) {
            _loc1_ = BASE.CanUpgrade(this);
            if (!_loc1_.error) {
                if (((this._buildingProps.costs[this._lvl.Get()].time.Get() * GLOBAL._buildTime) | 0) > 3600) {
                    UPDATES.Create(["BU", this._id]);
                }
                this.UpgradeB();
                BASE.Save();
                return true;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(as3.str(_loc1_.errorMessage));
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            POPUPS.DisplayWorker(1, this);
        }
        return false;
    }

    public UpgradeB(): void {
        let GetFriends: Function = null;
        let canUpgrade: any = null;
        let o: any = null;
        let isInfernoBuilding: boolean = false;
        let tmpUpgradeTime: int = 0;
        let popupMC: popup_helpme = null;
        if (this._countdownUpgrade.Get() == 0) {
            canUpgrade = BASE.CanUpgrade(this);
            if (!canUpgrade.error) {
                o = this.UpgradeCost();
                isInfernoBuilding = BASE.isInfernoBuilding(this._type >>> 0);
                if (o.r1.Get() > 0) {
                    BASE.Charge(1, Number(o.r1.Get()), false, isInfernoBuilding);
                }
                if (o.r2.Get() > 0) {
                    BASE.Charge(2, Number(o.r2.Get()), false, isInfernoBuilding);
                }
                if (o.r3.Get() > 0) {
                    BASE.Charge(3, Number(o.r3.Get()), false, isInfernoBuilding);
                }
                if (o.r4.Get() > 0) {
                    BASE.Charge(4, Number(o.r4.Get()), false, isInfernoBuilding);
                }
                tmpUpgradeTime = (this._buildingProps.costs[this._lvl.Get()].time.Get() * GLOBAL._buildTime) | 0;
                this._countdownUpgrade.Set(tmpUpgradeTime);
                if (this._type != 14 && this._countdownUpgrade.Get() > 60 * 60 * 2 && TUTORIAL._stage > 200) {
                    if (!GLOBAL._promptedInvite && BASE._credits.Get() < 40 && GLOBAL._canInvite && GLOBAL._friendCount == 0) {
                        GetFriends = (): void => {
                            if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
                                GLOBAL.CallJSWithClient("cc.showFeedDialog", "callbackgift", ["invite"]);
                            } else {
                                GLOBAL.CallJS("cc.showFeedDialog", ["invite", "callbackgift"]);
                            }
                        };
                        GLOBAL._promptedInvite = true;
                        popupMC = new popup_helpme();
                        popupMC.tB.text = KEYS.Get("pop_helpme");
                        popupMC.bAction.SetupKey("btn_invitefriends");
                        popupMC.bAction.addEventListener(MouseEvent.CLICK, GetFriends);
                        POPUPS.Push(popupMC);
                    }
                }
                this._hasResources = false;
                this._hasWorker = false;
                if (GLOBAL._catchup) {
                    this._hasResources = true;
                    this._hasWorker = true;
                }
                QUEUE.Add("building" + this._id, this);
                LOGGER.Stat([7, this._type, this._lvl.Get() + 1]);
                this._helpList = [];
                this.Update();
                if (GLOBAL.ioFreeBuild()) {
                    // Admin test mode (and the Designer): upgraded at once.
                    this._countdownUpgrade.Set(0);
                    this.Upgraded();
                    this.Update();
                } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._class == "tower") {
                    GLOBAL._selectedBuilding = this;
                    GLOBAL.Message(KEYS.Get("msg_inactiveupgrade"), KEYS.Get("btn_speedup"), STORE.SpeedUp, ["SP4"]);
                }
                GLOBAL.eventDispatcher.dispatchEvent(new BuildingEvent(BuildingEvent.UPGRADED, this));
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(as3.str(canUpgrade.errorMessage));
            }
        }
    }

    public Help(): boolean {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: string = null;
        if (this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() > 0) {
            if (this._helpList.length > 4) {
                GLOBAL.Message(KEYS.Get("base_5alreadyhelped"));
                return false;
            }
            for (const $value of as3.values(this._helpList)) {
                _loc1_ = $value | 0;
                if (_loc1_ == LOGIN._playerID) {
                    GLOBAL.Message(KEYS.Get("base_alreadyhelped"));
                    return false;
                }
            }
            UPDATES.Create(["BH", this._id, LOGIN._playerID]);
            this._helpList.push(LOGIN._playerID);
            _loc2_ = this.HelpB();
            if (this._countdownBuild.Get() > 0) {
                GLOBAL.Message(KEYS.Get("base_thankbuild", { "v1": GLOBAL.ToTime(_loc2_, false, false), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }));
                LOGGER.Stat([14, this._type, 0, 0, _loc2_]);
                _loc3_ = "build";
            }
            if (this._countdownUpgrade.Get() > 0) {
                GLOBAL.Message(KEYS.Get("base_thankupgrade", { "v1": GLOBAL.ToTime(_loc2_, false, false), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }));
                LOGGER.Stat([15, this._type, this._lvl.Get() + 1, 0, _loc2_]);
                _loc3_ = "upgrade";
            }
            if (this._countdownFortify.Get() > 0) {
                GLOBAL.Message(KEYS.Get("base_thankfortify", { "v1": GLOBAL.ToTime(_loc2_, false, false), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }));
                LOGGER.Stat([66, this._type, this._fortification.Get() + 1, 0, _loc2_]);
                _loc3_ = "fortify";
            }
        }
        return true;
    }

    public HelpB(): int {
        let _loc1_: int = 0;
        if (this._countdownBuild.Get() > 0) {
            _loc1_ = (this._countdownBuild.Get() * 0.05) | 0;
            this._countdownBuild.Add(0 - ((this._countdownBuild.Get() * 0.05) | 0));
        } else if (this._countdownUpgrade.Get() > 0) {
            _loc1_ = (this._countdownUpgrade.Get() * 0.05) | 0;
            this._countdownUpgrade.Add(0 - ((this._countdownUpgrade.Get() * 0.05) | 0));
        } else if (this._countdownFortify.Get() > 0) {
            _loc1_ = (this._countdownFortify.Get() * 0.05) | 0;
            this._countdownFortify.Add(0 - ((this._countdownFortify.Get() * 0.05) | 0));
        }
        BASE.Save();
        return _loc1_;
    }

    public UpgradeCancel(): void {
        GLOBAL.Message(KEYS.Get("msg_upgradecancelconfirm"), KEYS.Get("msg_stopupgrading_btn"), as3.bind(this, this.UpgradeCancelB));
    }

    public UpgradeCancelB(param1: MouseEvent = null): void {
        UPDATES.Create(["BUC", this._id]);
        this.UpgradeCancelC();
    }

    public UpgradeCancelC(): void {
        let _loc1_: any = null;
        let _loc2_: boolean = false;
        if (this._countdownUpgrade.Get() > 0) {
            QUEUE.Remove("building" + this._id, false, this);
            this._countdownUpgrade.Set(0);
            _loc1_ = this.UpgradeCost();
            _loc2_ = BASE.isInfernoBuilding(this._type >>> 0);
            if (_loc1_.r1.Get()) {
                BASE.Fund(1, _loc1_.r1.Get() | 0, false, null, _loc2_);
            }
            if (_loc1_.r2.Get()) {
                BASE.Fund(2, _loc1_.r2.Get() | 0, false, null, _loc2_);
            }
            if (_loc1_.r3.Get()) {
                BASE.Fund(3, _loc1_.r3.Get() | 0, false, null, _loc2_);
            }
            if (_loc1_.r4.Get()) {
                BASE.Fund(4, _loc1_.r4.Get() | 0, false, null, _loc2_);
            }
            BASE.Save();
        }
    }

    public Upgraded(): void {
        let c: any = null;
        let a: int = 0;
        try {
            if (Math.max(this._countdownUpgrade.Get(), 0)) {
            }
            this._countdownUpgrade.Set(0);
            this._lvl.Add(1);
            ++this._hpLvl;
            this.maxHealthProperty.value = Number(this._buildingProps.hp[this._lvl.Get() - 1]);
            this.setHealth(this.maxHealth);
        } catch (e) {
            LOGGER.Log("err", "Foundation.Upgraded: " + e.message + " | " + e.getStackTrace());
        }
        QUESTS.Check("blvl", this._lvl.Get() | 0);
        if (this._type < 5) {
            QUESTS.Check("brlvl", this._lvl.Get() | 0);
        }
        QUESTS.Check("b" + this._type + "lvl", this._lvl.Get() | 0);
        BASE.CalcResources();
        c = this._buildingProps.costs[this._lvl.Get() - 2];
        a = Math.floor(((c.time.Get() | 0) + (c.r1.Get() | 0) + (c.r2.Get() | 0) + (c.r3.Get() | 0) + (c.r4.Get() | 0)) / 3) | 0;
        BASE.PointsAdd(a >>> 0);
        this.Description();
        QUEUE.Remove("building" + this._id, true, this);
        LOGGER.Stat([8, this._type, this._lvl.Get()]);
    }

    public downgraded(): void {
    }

    public Downgrade_TOTEM_DEBUG(): void {
        if (this._type != BTOTEM.BTOTEM_WMI2) {
            return;
        }
        if (this._lvl.Get() <= 1) {
            return;
        }
        try {
            this._countdownUpgrade.Set(0);
            this._lvl.Add(-1);
            --this._hpLvl;
            this.maxHealthProperty.value = Number(this._buildingProps.hp[this._lvl.Get() - 1]);
            this.setHealth(this.maxHealth);
        } catch (e) {
            LOGGER.Log("err", "Foundation.Downgrade_TOTEM_DEBUG: " + e.message + " | " + e.getStackTrace());
        }
    }

    public Fortified(): void {
        let c: any = null;
        let a: int = 0;
        try {
            if (Math.max(this._countdownFortify.Get(), 0)) {
                LOGGER.Log("log", "bdg fort cnt > 0, probable hack");
                GLOBAL.ErrorMessage("BFOUNDATION fortify hack");
                return;
            }
            this._countdownFortify.Set(0);
            this._fortification.Add(1);
        } catch (e) {
            LOGGER.Log("err", "Foundation.Fortified: " + e.message + " | " + e.getStackTrace());
        }
        BASE.CalcResources();
        c = this._buildingProps.fortify_costs[this._fortification.Get() - 1];
        a = Math.floor(((c.time.Get() | 0) + (c.r1.Get() | 0) + (c.r2.Get() | 0) + (c.r3.Get() | 0) + (c.r4.Get() | 0)) / 3) | 0;
        BASE.PointsAdd(a >>> 0);
        this.Description();
        QUEUE.Remove("building" + this._id, true, this);
        LOGGER.Stat([65, this._type, this._fortification.Get()]);
    }

    public Recycle(): void {
        let _loc1_: string = null;
        if (this._countdownBuild.Get() > 0) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                if (BASE.isOutpostOrInfernoOutpost && !GLOBAL.outpostRecycling) {
                    GLOBAL.Message(KEYS.Get("msg_stopconstructionoutpostbuilding"));
                } else {
                    GLOBAL.Message(KEYS.Get("msg_stopconstructionconfirm"), KEYS.Get("msg_destroybuilding_btn"), as3.bind(this, this.RecycleB));
                }
            }
        } else if (this._class == "taunt" || this._class == "gift") {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(KEYS.Get("msg_recycleconfirm"), KEYS.Get("msg_recyclebuilding_btn"), as3.bind(this, this.RecycleC));
            }
        } else if (this._class == "decoration") {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.Message(KEYS.Get("ui_placeinstorage"), KEYS.Get("btn_addstorage"), as3.bind(this, this.RecycleB));
            }
        } else if (!this._blockRecycle) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                _loc1_ = !(!GLOBAL._buildingProps[this._type - 1]["recycleconfirmationoverride"]) ? String(GLOBAL._buildingProps[this._type - 1]["recycleconfirmationoverride"]) : "msg_recycleconfirm";
                GLOBAL.Message(KEYS.Get(_loc1_), KEYS.Get("msg_recyclebuilding_btn"), as3.bind(this, this.RecycleB));
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (BASE.isOutpostOrInfernoOutpost) {
                GLOBAL.Message(KEYS.Get("msg_recycleoutpostbuilding"));
            } else {
                GLOBAL.Message(KEYS.Get("msg_recycleunavailable"));
            }
        }
        GLOBAL.eventDispatcher.dispatchEvent(new BuildingEvent(BuildingEvent.ATTEMPT_RECYCLE, this));
    }

    public RecycleB(param1: MouseEvent = null): void {
        let _loc2_: any = null;
        let _loc3_: boolean = false;
        BUILDINGOPTIONS.Hide();
        if (this._class != "decoration" && !this._blockRecycle) {
            if (!this._recycled) {
                this._recycled = true;
                _loc2_ = this.RecycleCost();
                _loc3_ = BASE.isInfernoBuilding(this._type >>> 0);
                if (_loc2_.r1.Get()) {
                    BASE.Fund(1, _loc2_.r1.Get() | 0, false, null, _loc3_);
                }
                if (_loc2_.r2.Get()) {
                    BASE.Fund(2, _loc2_.r2.Get() | 0, false, null, _loc3_);
                }
                if (_loc2_.r3.Get()) {
                    BASE.Fund(3, _loc2_.r3.Get() | 0, false, null, _loc3_);
                }
                if (_loc2_.r4.Get()) {
                    BASE.Fund(4, _loc2_.r4.Get() | 0, false, null, _loc3_);
                }
                this.RecycleC();
                LOGGER.Stat([40, this._type, this._lvl.Get()]);
            }
        } else if (!this._blockRecycle) {
            this.RecycleC();
        }
    }

    public RecycleC(): void {
        this.GridCost(false);
        try {
            if (MAP._BUILDINGFOOTPRINTS.contains(this._mcBase)) {
                MAP._BUILDINGBASES.removeChild(this._mcBase);
            }
        } catch (e) {
        }
        try {
            if (MAP._BUILDINGFOOTPRINTS.contains(this._mcFootprint)) {
                MAP._BUILDINGFOOTPRINTS.removeChild(this._mcFootprint);
            }
        } catch (e) {
        }
        try {
            if (MAP._BUILDINGTOPS.contains(this._mc)) {
                MAP._BUILDINGTOPS.removeChild(this._mc);
            }
        } catch (e) {
        }
        GRID.Clear();
        if (!BYMConfig.instance.RENDERER_ON) {
            MAP.SortDepth();
        }
        if (this._type != 7) {
            QUEUE.Remove("building" + this._id, false, this);
        }
        BASE.BuildingDeselect();
        if (this._class == "decoration") {
            InventoryManager.buildingStorageAdd(this._type, this._lvl.Get() | 0);
        }
        this.clear();
        BASE.Save();
    }

    public GridCost(param1: boolean = true): void {
        let _loc2_: Rectangle = null;
        if (this._footprint) {
            for (_loc2_ of as3.values(this._footprint)) {
                GRID.Block(new Rectangle(_loc2_.x + this._mc.x, _loc2_.y + this._mc.y, _loc2_.width, _loc2_.height), param1);
            }
        }
    }

    public RecycleCost(): any {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        let _loc1_: any = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "r5": 0, "time": new SecNum(0) };
        if (GLOBAL._buildingProps[this._type - 1].rewarded) {
            return _loc1_;
        }
        if (this._lvl.Get() == 0) {
            _loc1_.r1.Add(this._buildingProps.costs[0].r1.Get());
            _loc1_.r2.Add(this._buildingProps.costs[0].r2.Get());
            _loc1_.r3.Add(this._buildingProps.costs[0].r3.Get());
            _loc1_.r4.Add(this._buildingProps.costs[0].r4.Get());
            _loc1_.r5 += this._buildingProps.costs[0].r5;
        } else {
            _loc2_ = 0;
            while (_loc2_ < this._lvl.Get()) {
                _loc3_ = this._buildingProps.costs[_loc2_];
                if (_loc3_) {
                    _loc1_.r1.Add(_loc3_.r1.Get());
                    _loc1_.r2.Add(_loc3_.r2.Get());
                    _loc1_.r3.Add(_loc3_.r3.Get());
                    _loc1_.r4.Add(_loc3_.r4.Get());
                    _loc1_.r5 += _loc3_.r5;
                }
                _loc2_++;
            }
            _loc1_.r1.Set((_loc1_.r1.Get() * 0.5) | 0);
            _loc1_.r2.Set((_loc1_.r2.Get() * 0.5) | 0);
            _loc1_.r3.Set((_loc1_.r3.Get() * 0.5) | 0);
            _loc1_.r4.Set((_loc1_.r4.Get() * 0.5) | 0);
            _loc1_.r5 = (_loc1_.r5 * 0.5) | 0;
        }
        return _loc1_;
    }

    public UpgradeCost(): any {
        let _loc1_: any = null;
        let _loc2_: any = null;
        if (this._buildingProps.costs.length > this._lvl.Get()) {
            _loc1_ = { "time": new SecNum(0), "r1": new SecNum(Number(this._buildingProps.costs[this._lvl.Get()].r1.Get())), "r2": new SecNum(Number(this._buildingProps.costs[this._lvl.Get()].r2.Get())), "r3": new SecNum(Number(this._buildingProps.costs[this._lvl.Get()].r3.Get())), "r4": new SecNum(Number(this._buildingProps.costs[this._lvl.Get()].r4.Get())), "r1over": false, "r2over": false, "r3over": false, "r4over": false };
            _loc2_ = this._buildingProps.costs[this._lvl.Get()];
            if (BASE._resources.r1.Get() < _loc2_.r1.Get()) {
                _loc1_.r1over = true;
            }
            if (BASE._resources.r2.Get() < _loc2_.r2.Get()) {
                _loc1_.r2over = true;
            }
            if (BASE._resources.r3.Get() < _loc2_.r3.Get()) {
                _loc1_.r3over = true;
            }
            if (BASE._resources.r4.Get() < _loc2_.r4.Get()) {
                _loc1_.r4over = true;
            }
            _loc1_.time.Set(_loc2_.time.Get());
            return _loc1_;
        }
        return {};
    }

    public FortifyCost(): any {
        let _loc1_: any = null;
        let _loc2_: any = null;
        if (this._buildingProps.can_fortify != true) {
            return {};
        }
        if (this._buildingProps.fortify_costs.length > this._fortification.Get()) {
            _loc1_ = { "time": new SecNum(0), "r1": new SecNum(Number(this._buildingProps.fortify_costs[this._fortification.Get()].r1.Get())), "r2": new SecNum(Number(this._buildingProps.fortify_costs[this._fortification.Get()].r2.Get())), "r3": new SecNum(Number(this._buildingProps.fortify_costs[this._fortification.Get()].r3.Get())), "r4": new SecNum(Number(this._buildingProps.fortify_costs[this._fortification.Get()].r4.Get())), "r1over": false, "r2over": false, "r3over": false, "r4over": false };
            _loc2_ = this._buildingProps.fortify_costs[this._fortification.Get()];
            if (BASE._resources.r1.Get() < _loc2_.r1.Get()) {
                _loc1_.r1over = true;
            }
            if (BASE._resources.r2.Get() < _loc2_.r2.Get()) {
                _loc1_.r2over = true;
            }
            if (BASE._resources.r3.Get() < _loc2_.r3.Get()) {
                _loc1_.r3over = true;
            }
            if (BASE._resources.r4.Get() < _loc2_.r4.Get()) {
                _loc1_.r4over = true;
            }
            _loc1_.time.Set(_loc2_.time.Get());
            return _loc1_;
        }
        return {};
    }

    public Mousedown(param1: MouseEvent): void {
        if (!this._placing) {
            MAP.Click();
            this._mouseClicked = true;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && UI2._showBottom) {
                this._clickTimer = 0;
            }
        }
    }

    public Mouseup(param1: MouseEvent): void {
        if (this._mouseClicked) {
            this._mouseClicked = false;
            if (!MAP._dragged) {
                if (this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() > 0) {
                }
                this.Click();
            }
        }
    }

    public StartMove(): void {
        this.ioHoverOut(null);
        try {
            BASE._blockSave = true;
            BASE.BuildingSelect(this, true);
            this.GridCost(false);
            this._moving = true;
            this._ioFollowKey = null;
            this._stopMoveCount = 0;
            this._mc.mouseEnabled = false;
            if (!PLANNER._open) {
                this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
                MAP._GROUND.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.StopMove));
                this._mcHit.mouseEnabled = false;
                BASE.ShowFootprints();
            }
            this._oldPosition = new Point(this._mc.x, this._mc.y);
            this._mouseOffset = new Point(MAP._GROUND.mouseX - this._mc.x, MAP._GROUND.mouseY - this._mc.y);
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.StartMove: " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.StartMove");
        }
    }

    public StopMove(param1: MouseEvent): void {
        if (this._mouseClicked) {
            this._mouseClicked = false;
            if (!MAP._dragged) {
                MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.StopMove));
                this._mc.mouseEnabled = true;
                this.StopMoveB();
            }
        }
        this._mouseClicked = true;
    }

    public StopMoveB(): void {
        try {
            if (this._moving) {
                this._moving = false;
                if (BASE.BuildBlockers(this, this._class == "decoration") != "") {
                    this._mc.x = this._oldPosition.x;
                    this._mc.y = this._oldPosition.y;
                    this._mcBase.x = this._mc.x;
                    this._mcBase.y = this._mc.y;
                    this._mcFootprint.x = this._mc.x;
                    this._mcFootprint.y = this._mc.y;
                    SOUNDS.Play("error1");
                } else {
                    SOUNDS.Play("buildingplace");
                }
                this._position = new Point(this._mc.x, this._mc.y);
                this._mc.mouseEnabled = false;
                this._mcHit.mouseEnabled = true;
                this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
                this.GridCost(true);
                PATHING.ResetCosts();
                if (!BYMConfig.instance.RENDERER_ON) {
                    MAP.SortDepth();
                }
                BASE.BuildingDeselect();
                BASE.HideFootprints();
                BASE._blockSave = false;
                BASE.Save();
            }
        } catch (e) {
            LOGGER.Log("err", "BFOUNDATION.StartMove: " + e.getStackTrace());
            GLOBAL.ErrorMessage("BFOUNDATION.StartMove 2");
        }
        this.onMove();
    }

    public Click(param1: MouseEvent = null): void {
        if (Boolean(GLOBAL._openBase) || TUTORIAL._stage >= 2 && TUTORIAL._stage != 90) {
            this.Description();
            if (!MAP._dragged) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    BASE.BuildingSelect(this);
                }
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() > 0) {
                    BASE.BuildingSelect(this);
                }
                if (this._class == "taunt" || this._class == "gift") {
                    BASE.BuildingSelect(this);
                }
            }
        }
    }

    public Update(param1: boolean = false): void {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        if (GLOBAL._render || param1) {
            _loc3_ = [];
            if (this._repairing == 1) {
                _loc4_ = 0;
                _loc5_ = this._lvl.Get() == 0 ? 0 : (this._lvl.Get() - 1) | 0;
                _loc4_ = Math.ceil(this.maxHealth / Math.min(3600, Number(this._buildingProps.repairTime[_loc5_]))) | 0;
                this._repairTime = (((this.maxHealth - this.health) | 0) / _loc4_) | 0;
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_repairing"), GLOBAL.ToTime(this._repairTime, true));
            } else if (this._countdownBuild.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_building"), GLOBAL.ToTime(this._countdownBuild.Get() | 0, true));
            } else if (this._countdownUpgrade.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_upgrading"), GLOBAL.ToTime(this._countdownUpgrade.Get() | 0, true));
            } else if (this._countdownFortify.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_fortifying"), GLOBAL.ToTime(this._countdownFortify.Get() | 0, true));
            }
            if (Boolean(this._class) && this._class != "mushroom") {
                BuildingOverlay.Update(this, param1);
            }
            if (this.health <= 0) {
                this.Render(BFOUNDATION.k_STATE_DESTROYED);
            } else if (this.isCriticallyDamaged) {
                this.Render(BFOUNDATION.k_STATE_DAMAGED);
            } else {
                this.Render(BFOUNDATION.k_STATE_DEFAULT);
            }
        }
    }

    public Loot(param1: int): uint {
        return param1 >>> 0;
    }

    public Constructed(): void {
        if (BASE.isOutpostOrInfernoOutpost && !GLOBAL.outpostRecycling) {
            this._blockRecycle = true;
        }
        this._countdownBuild.Set(0);
        this._constructed = true;
        if (!this._prefab && !BTOTEM.IsTotem2(this._type)) {
            this._lvl.Set(1);
            this._hpLvl = 1;
        } else {
            this._prefab = 0;
        }
        BASE.CalcResources();
        QUESTS.Check("blvl", this._lvl.Get() | 0);
        QUESTS.Check("b" + this._type + "lvl", this._lvl.Get() | 0);
        if (this._type < 5) {
            QUESTS.Check("brlvl", this._lvl.Get() | 0);
        }
        let _loc1_: any = this._buildingProps.costs[0];
        let _loc2_: int = Math.floor(_loc1_.time.Get() / 2 + ((_loc1_.r1.Get() | 0) + (_loc1_.r2.Get() | 0) + (_loc1_.r3.Get() | 0) + (_loc1_.r4.Get() | 0)) / 10) | 0;
        if (this._type == 14) {
            _loc2_ += 100;
        }
        BASE.PointsAdd(_loc2_ >>> 0);
        this.Description();
        QUEUE.Remove("building" + this._id, true, this);
        LOGGER.Stat([6, this._type]);
        this.Update();
    }

    public BlockClicks(): void {
        if (this._mcHit) {
            this._mcHit.mouseEnabled = false;
            this._mcHit.buttonMode = false;
        }
        if (this._mc) {
            this._mc.alpha = 0.5;
        }
    }

    public UnblockClicks(): void {
        if (this._mcHit) {
            this._mcHit.mouseEnabled = true;
            this._mcHit.buttonMode = true;
        }
        if (this._mc) {
            this._mc.alpha = 1;
        }
    }

    public exportLite(): any {
        let _loc1_: any = new Object();
        let _loc2_: Point = GRID.FromISO(this._mc.x, this._mc.y);
        _loc1_.X = _loc2_.x;
        _loc1_.Y = _loc2_.y;
        _loc1_.id = this._id;
        _loc1_.t = this._type;
        if (this._lvl.Get() != 1) {
            _loc1_.l = this._lvl.Get();
        }
        if (this._countdownRebuild.Get() > 0) {
            _loc1_.cR = this._countdownRebuild.Get();
        }
        if (this._repairing > 0) {
            _loc1_.rE = this._repairing;
        }
        if (this.health < this.maxHealth) {
            _loc1_.hp = this.health | 0;
        }
        if (this._fortification.Get() > 0) {
            _loc1_.fort = this._fortification.Get();
        }
        return _loc1_;
    }

    public Export(): any {
        let _loc1_: any = new Object();
        let _loc2_: Point = GRID.FromISO(this._mc.x, this._mc.y);
        _loc1_.X = _loc2_.x;
        _loc1_.Y = _loc2_.y;
        _loc1_.id = this._id;
        _loc1_.t = this._type;
        if (this._lvl.Get() != 1) {
            _loc1_.l = this._lvl.Get();
        }
        if (this._countdownBuild.Get() > 0) {
            _loc1_.cB = this._countdownBuild.Get();
            if (this._prefab) {
                _loc1_.prefab = this._prefab;
            }
        }
        if (this._countdownUpgrade.Get() > 0) {
            _loc1_.cU = this._countdownUpgrade.Get();
        }
        if (this._countdownRebuild.Get() > 0) {
            _loc1_.cR = this._countdownRebuild.Get();
        }
        if (this._countdownFortify.Get() > 0) {
            _loc1_.cF = this._countdownFortify.Get();
        }
        if (this._repairing > 0) {
            _loc1_.rE = this._repairing;
        }
        if (this._fortification.Get() > 0) {
            _loc1_.fort = this._fortification.Get();
        }
        if (this._threadid) {
            _loc1_.ti = this._threadid;
        }
        if (this._senderid) {
            _loc1_.sid = this._senderid;
        }
        if (this._senderName) {
            _loc1_.snm = this._senderName;
        }
        if (this._senderPic) {
            _loc1_.spc = this._senderPic;
        }
        if (this._subject) {
            _loc1_.sbj = this._subject;
        }
        if (this._productionStage.Get() > 0) {
            _loc1_.rPS = this._productionStage.Get();
        }
        if (this._countdownProduce.Get() > 0) {
            _loc1_.rCP = this._countdownProduce.Get();
        }
        if (this._inProduction != "") {
            _loc1_.rIP = this._inProduction;
        }
        if (this.health < this.maxHealth && (!MapRoomManager.instance.isInMapRoom3 || BASE.isInfernoMainYardOrOutpost)) {
            _loc1_.hp = this.health | 0;
        }
        if (this._helpList.length > 0 && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() > 0) {
            _loc1_.hl = this._helpList;
        }
        return _loc1_;
    }

    public Setup(building: any): void {
        let _loc2_: Point = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        this._type = building.t | 0;
        this._id = building.id | 0;
        _loc2_ = GRID.ToISO(Number(building.X), Number(building.Y), 0);
        if (this._type == 112) {
            building.l = 1;
        }
        if (Boolean(building.l) && building.l <= int.MAX_VALUE) {
            this._lvl.Set(building.l | 0);
        } else {
            this._lvl.Set(1);
        }
        this._mc.x = _loc2_.x;
        this._mc.y = _loc2_.y;
        ++BASE._buildingCount;
        this._countdownBuild.Set(building.cB | 0);
        if (building.prefab) {
            this._prefab = building.prefab | 0;
            this._lvl.Set(Number(building.prefab));
            if (this._countdownBuild.Get() == 0) {
                _loc3_ = 0;
                _loc4_ = 0;
                while (_loc4_ < building.prefab) {
                    _loc3_ = (_loc3_ + GLOBAL._buildingProps[this._type - 1].costs[_loc4_].time.Get()) | 0;
                    _loc4_++;
                }
                this._countdownBuild.Set(_loc3_);
            }
        }
        this._countdownUpgrade.Set(building.cU | 0);
        // Cancel any in-progress upgrade that targets a level the building can no longer reach
        // in the current map room mode. Covers buildings whose level is force-set by map version
        // (e.g. the Map Room, or a housing/flinger upgrade started on MR3 then downgraded to MR2):
        // a leftover countdown would otherwise index past the costs array and break rendering.
        if (this._countdownUpgrade.Get() > 0 && this._lvl.Get() >= this.getEffectiveLevelMax()) {
            this._countdownUpgrade.Set(0);
            BASE.Save();
        }
        this._countdownRebuild.Set(building.cR | 0);
        this._hpCountdownRebuild = this._countdownRebuild.Get() | 0;
        if (building.fort) {
            this._fortification.Set(Math.min(Number(building.fort), BYMConfig.k_sMAX_FORTIFICATION_LEVEL));
        } else {
            this._fortification.Set(0);
        }
        if (Boolean(building.cF) && this._fortification.Get() < BYMConfig.k_sMAX_FORTIFICATION_LEVEL) {
            this._countdownFortify.Set(building.cF | 0);
        } else {
            this._countdownFortify.Set(0);
        }
        this._repairing = building.rE | 0;
        if (this._repairing > 0) {
            this._repairing = 1;
        }
        this._productionStage.Set(building.rPS | 0);
        this._countdownProduce.Set(building.rCP | 0);
        this._hpCountdownProduce = this._countdownProduce.Get() | 0;
        if (Boolean(building.rIP) && building.rIP != "") {
            this._inProduction = as3.str(building.rIP);
        }
        if (this._inProduction == "C100") {
            this._inProduction = "C12";
        }
        if (building.hl) {
            this._helpList = as3.cast(building.hl, Array);
        }
        if (building.ti) {
            this._threadid = building.ti | 0;
        }
        if (building.sid) {
            this._senderid = building.sid | 0;
        }
        if (building.snm) {
            this._senderName = as3.str(building.snm);
        }
        if (building.spc) {
            this._senderPic = as3.str(building.spc);
        }
        if (building.sbj) {
            this._subject = as3.str(building.sbj);
        }
        if (this._countdownBuild.Get() > 0 && !this._prefab) {
            this._lvl.Set(0);
        }
        let hpLevel: int = this.getEffectiveLevel();
        this._hpLvl = hpLevel;
        if (hpLevel == 0) {
            this.maxHealthProperty.value = Number(this._buildingProps.hp[0]);
        } else {
            this.maxHealthProperty.value = this._buildingProps.hp[hpLevel - 1] | 0;
        }
        if (building.hp == null) {
            this.setHealth(this.maxHealth);
        } else {
            this.setHealth(building.hp | 0);
            if (this.health > this.maxHealth) {
                this.setHealth(this.maxHealth);
            }
        }
        if (this.health == 0) {
            this._destroyed = true;
            this._fired = true;
        }
        this.Description();
        this._constructed = this._countdownBuild.Get() == 0;
        if (this._lvl.Get() == 0 && this._constructed) {
            this._lvl.Set(1);
        }
        if (this._type == 17) {
            this._gridCost[1][1] = 100 + this._lvl.Get() * 25;
        }
        this.PlaceB();
        if (this._countdownBuild.Get() > 0) {
            if (this._prefab) {
                // Comment: Instantly builds a building
                this._hasResources = true;
                this._hasWorker = true;
            } else if (QUEUE.Add("building" + this._id, this)) {
                // Comment: Resources needed to build a building
                this._hasResources = true;
            } else {
                this.RecycleC();
            }
        } else if (this._countdownUpgrade.Get() > 0) {
            if (QUEUE.Add("building" + this._id, this)) {
                this._hasResources = true;
            } else {
                this.UpgradeCancelB();
            }
        } else if (this._countdownFortify.Get() > 0) {
            if (QUEUE.Add("building" + this._id, this)) {
                this._hasResources = true;
            } else {
                this.FortifyCancelB();
            }
        } else {
            QUESTS.Check("blvl", this._lvl.Get() | 0);
            QUESTS.Check("b" + this._type + "lvl", this._lvl.Get() | 0);
            if (this._class == "resource") {
                QUESTS.Check("brlvl", this._lvl.Get() | 0);
            }
        }
    }

    public override clear(): void {
        if (this._type == 7) {
            delete BASE._buildingsMushrooms["m" + this._id];
        } else {
            delete BASE._buildingsAll["b" + this._id];
            delete BASE._buildingsWalls["b" + this._id];
            delete BASE._buildingsTowers["b" + this._id];
            delete BASE._buildingsMain["b" + this._id];
            delete BASE._buildingsGifts["b" + this._id];
        }
        if (this._mc.hasEventListener(Event.ENTER_FRAME)) {
            this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.FollowMouseB));
        }
        if (MAP._GROUND.hasEventListener(MouseEvent.MOUSE_UP)) {
            MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
        }
        if (this._mc.hasEventListener(MouseEvent.MOUSE_DOWN)) {
            this._mc.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
        }
        if (this._mc.hasEventListener(Event.ENTER_FRAME)) {
            this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.TickFast));
        }
        this.removeListeners();
        if (this._mcHit) {
            if (this._mcHit.parent) {
                this._mcHit.parent.removeChild(this._mcHit);
            }
        }
        if (this._mcFootprint) {
            if (this._mcFootprint.parent) {
                this._mcFootprint.parent.removeChild(this._mcFootprint);
            }
        }
        BuildingOverlay.clearBuilding(this);
        if (GLOBAL._selectedBuilding === this) {
            GLOBAL._selectedBuilding = null;
        }
        if (this._mcBase.parent) {
            this._mcBase.parent.removeChild(this._mcBase);
        }
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this.topContainer.Clear();
        this.animContainer.Clear();
        this._fortFrontContainer.Clear();
        this._fortBackContainer.Clear();
        this.anim2Container.Clear();
        this.anim3Container.Clear();
        if (this._animContainerBMD) {
            this._animContainerBMD.dispose();
        }
        if (this._anim2ContainerBMD) {
            this._anim2ContainerBMD.dispose();
        }
        if (this._anim3ContainerBMD) {
            this._anim3ContainerBMD.dispose();
        }
        this.clearRasterData();
        this._rasterData = null;
        this._rasterPt = null;
        InstanceManager.removeInstance(this);
        this.m_shadowBMD = null;
        super.clear();
    }

    private GetHitMC(): MovieClip {
        let _loc1_: any = !(!GLOBAL._buildingProps[this._type - 1]) ? GLOBAL._buildingProps[this._type - 1] : {};

        if (_loc1_.hitCls) {
            return as3.cast(new ((as3.as(_loc1_.hitCls, Class)))(), MovieClip);
        }
        let _loc2_: boolean = BASE.isInfernoMainYardOrOutpost;
        if (this._type == 1) {
            return as3.cast(_loc2_ ? new boneCrusherHit() : new building1hit(), MovieClip);
        }
        if (this._type == 2) {
            return as3.cast(_loc2_ ? new coalProducerHit() : new building2hit(), MovieClip);
        }
        if (this._type == 3) {
            return as3.cast(_loc2_ ? new sulpherProducerHit() : new building3hit(), MovieClip);
        }
        if (this._type == 4) {
            return as3.cast(_loc2_ ? new magmaProducerHit() : new building4hit(), MovieClip);
        }
        if (this._type == 5) {
            return new building5hit();
        }
        if (this._type == 6) {
            return as3.cast(_loc2_ ? new siloHit() : new building6hit(), MovieClip);
        }
        if (this._type == 7) {
            return new building7hit();
        }
        if (this._type == 8) {
            return as3.cast(_loc2_ ? new monsterLockerHit() : new building8hit(), MovieClip);
        }
        if (this._type == 9) {
            return new building9hit();
        }
        if (this._type == 10) {
            return new building10hit();
        }
        if (this._type == 11) {
            return new building11hit();
        }
        if (this._type == 12) {
            return new building12hit();
        }
        if (this._type == 13) {
            return as3.cast(_loc2_ ? new hatcheryHit() : new building13hit(), MovieClip);
        }
        if (this._type == 14) {
            return as3.cast(_loc2_ ? new townHallHit() : new building14hit(), MovieClip);
        }
        if (this._type == 15) {
            return new building15hit();
        }
        if (this._type == 16) {
            return new building16hit();
        }
        if (this._type == 17) {
            return as3.cast(_loc2_ ? new wallHit() : new building17hit(), MovieClip);
        }
        if (this._type == 18) {
            return new building18hit();
        }
        if (this._type == 19) {
            return new building19hit();
        }
        if (this._type == 20) {
            return as3.cast(_loc2_ ? new cannonTowerHit() : new building20hit(), MovieClip);
        }
        if (this._type == 21) {
            return as3.cast(_loc2_ ? new sniperTowerHit() : new building21hit(), MovieClip);
        }
        if (this._type == 22) {
            return new building22hit();
        }
        if (this._type == 23) {
            return new building23hit();
        }
        if (this._type == 24) {
            return new building24hit();
        }
        if (this._type == 25) {
            return new building25hit();
        }
        if (this._type == 26) {
            return as3.cast(_loc2_ ? new infernoAcademyHit() : new building26hit(), MovieClip);
        }
        if (this._type == 27) {
            return new building27hit();
        }
        if (this._type == 51) {
            return new building51hit();
        }
        if (this._type == 53) {
            return new building53hit();
        }
        if (this._type == 54) {
            return new building54hit();
        }
        if (this._type == 55) {
            return new building55hit();
        }
        if (this._type >= 28 && this._type <= 50) {
            return new buildingflaghit();
        }
        if (this._type == 56) {
            return new building56hit();
        }
        if (this._type == 57) {
            return new building57hit();
        }
        if (this._type >= 60 && this._type <= 62) {
            return new buildinggnomehit();
        }
        if (this._type == 63) {
            return new building63hit();
        }
        if (this._type == 64) {
            return new building64hit();
        }
        if (this._type == 65) {
            return new building65hit();
        }
        if (this._type == 66) {
            return new building66hit();
        }
        if (this._type == 68) {
            return new building68hit();
        }
        if (this._type == 71) {
            return new building71hit();
        }
        if (this._type == 72) {
            return new building72hit();
        }
        if (this._type == 73) {
            return new building73hit();
        }
        if (this._type >= 74 && this._type <= 85 || this._type == 107) {
            return new buildingheadhit();
        }
        if (this._type == 86) {
            return new building86hit();
        }
        if (this._type == 87) {
            return new building87hit();
        }
        if (this._type == 88) {
            return new building88hit();
        }
        if (this._type == 89) {
            return new building89hit();
        }
        if (this._type == 90) {
            return new building90hit();
        }
        if (this._type >= 91 && this._type <= 95) {
            return new buildingflowershit();
        }
        if (this._type == 96) {
            return new building96hit();
        }
        if (this._type == 97) {
            return new building97hit();
        }
        if (this._type == 98) {
            return new building98hit();
        }
        if (this._type == 99) {
            return new building99hit();
        }
        if (this._type == 100) {
            return new building100hit();
        }
        if (this._type == 101) {
            return new building101hit();
        }
        if (this._type == 102) {
            return new building102hit();
        }
        if (this._type == 103) {
            return new building103hit();
        }
        if (this._type == 104) {
            return new building104hit();
        }
        if (this._type == 105) {
            return new building105hit();
        }
        if (this._type == 106) {
            return new building106hit();
        }
        if (this._type >= 108 && this._type <= 109) {
            return new buildingcubehit();
        }
        if (this._type == 106) {
            return new building106hit();
        }
        if (this._type == 110) {
            return new building110hit();
        }
        if (this._type == 111) {
            return new building111hit();
        }
        if (this._type == 112) {
            return new building112hit();
        }
        if (this._type == 113) {
            return new building113hit();
        }
        if (this._type == 114) {
            return new building114hit();
        }
        if (this._type == 115) {
            return new building115hit();
        }
        if (this._type == 116) {
            return new building116hit();
        }
        if (this._type == 117) {
            return new building117hit();
        }
        if (this._type == 118) {
            return new building118hit();
        }
        if (this._type == 119) {
            return new building119hit();
        }
        if (this._type == 120) {
            return new building120hit();
        }
        if (this._type == 121) {
            return new building121hit();
        }
        if (this._type == 122) {
            return new building122hit();
        }
        if (this._type == 123) {
            return new building123hit();
        }
        if (this._type == 124) {
            return new building124hit();
        }
        if (this._type == 125) {
            return new building125hit();
        }
        if (this._type == 126) {
            return new building126hit();
        }
        if (this._type == 127) {
            return new infernoPortalHit();
        }
        if (this._type == 128) {
            return new housingBunkerHit();
        }
        if (this._type == 129) {
            return new quakeTowerHit();
        }
        if (this._type == 130) {
            return new cannonTowerHit();
        }
        if (this._type == 131) {
            return new building131hit();
        }
        if (this._type == 132) {
            return new magmaTowerHit();
        }
        if (this._type == 135) {
            return new building135hit();
        }
        return as3.cast(!(!_loc1_.hitCls) ? new ((as3.as(_loc1_.hitCls, Class)))() : new building1hit(), MovieClip);
    }

    private GetFootprintMC(): MovieClip {
        if (this._footprint[0].width == 20) {
            return new buildingFootprint20x20();
        }
        if (this._footprint[0].width == 30) {
            return new buildingFootprint30x30();
        }
        if (this._footprint[0].width == 40) {
            return new buildingFootprint40x40();
        }
        if (this._footprint[0].width == 70) {
            return new buildingFootprint70x70();
        }
        if (this._footprint[0].width == 80) {
            return new buildingFootprint80x80();
        }
        if (this._footprint[0].width == 90) {
            return new buildingFootprint90x90();
        }
        if (this._footprint[0].width == 100) {
            return new buildingFootprint100x100();
        }
        if (this._footprint[0].width == 130) {
            return new buildingFootprint130x130();
        }
        if (this._footprint[0].width == 160) {
            return new buildingFootprint160x160();
        }
        if (this._footprint[0].width == 190) {
            return new buildingFootprint190x160();
        }
        return new MovieClip();
    }

    /**
     * Where a hit clip's building is drawn in the yard's order (NaN for anything else): with the bitmap
     * renderer the clips were never sorted, so where two buildings overlapped the one behind could take
     * the click. Sorted by this, the building in front gets it.
     */
    public static ioHitDepth(param1: DisplayObject): number {
        let b: BFOUNDATION = as3.as(BFOUNDATION.s_ioHitOwner.get(param1), BFOUNDATION);
        if (!b || !b._mc) {
            return NaN;
        }
        return (b._mc.y + (b._middle ? b._middle : 0)) * 1000 + b._mc.x;
    }

    private ioBuildHit(param1: any[]): void {
        if (!this._mcHit || !param1 || param1.length == 0 || this instanceof BMUSHROOM) {
            return;
        }
        let fp: Rectangle = as3.cast(this._footprint && this._footprint.length ? this._footprint[0] : new Rectangle(), Rectangle);
        let sig: string = fp.x + "," + fp.y + "," + fp.width + "," + fp.height + ";";
        let p: any[] = null;
        for (p of as3.values(param1)) {
            sig += p[1] + "," + p[2] + "," + p[3] + "," + p[4] + "," + p[5] + ";";
        }
        let byPicture: any = BFOUNDATION.s_ioHitCache.get(param1[0][0]);
        if (!byPicture) {
            byPicture = {};
            BFOUNDATION.s_ioHitCache.set(param1[0][0], byPicture);
        }
        let rects: any[] = as3.cast(byPicture[sig], Array);
        if (!rects) {
            try {
                rects = BFOUNDATION.ioHitRects(param1, fp);
                byPicture[sig] = rects;
            } catch (e) {
                return;
            }
        }
        if (!this._ioHit) {
            this._ioHit = new Sprite();
            this._ioHit.name = "ioHit";
            this._ioHit.mouseEnabled = false;
            this._ioHit.mouseChildren = false;
        }
        let g: Graphics = this._ioHit.graphics;
        g.clear();
        g.beginFill(16777215, 1);
        let i: int = 0;
        while (i < rects.length) {
            g.drawRect(Number(rects[i]), Number(rects[i + 1]), Number(rects[i + 2]), Number(rects[i + 3]));
            i += 4;
        }
        g.endFill();
        if (this._ioHit.parent != this._mcHit) {
            this._mcHit.addChild(this._ioHit);
        }
        this._mcHit.hitArea = this._ioHit;
        this.ioPlaceHit();
    }

    /** The hit area is drawn in the building's own coordinates; the hit clip sits at a picture's corner. */
    private ioPlaceHit(): void {
        if (this._ioHit && this._offsets && as3.vget(this._offsets, this.m_hitOffsetIndex)) {
            this._ioHit.x = -as3.vget(this._offsets, this.m_hitOffsetIndex).x;
            this._ioHit.y = -as3.vget(this._offsets, this.m_hitOffsetIndex).y;
        }
    }

    /** Rows of solid squares [x, y, w, h, ...] (none overlapping: the fill is even-odd). */
    private static ioHitRects(param1: any[], param2: Rectangle): any[] {
        let C: int = BFOUNDATION.IO_HIT_CELL;
        // the footprint on the ground: the grid rectangle's corners in the building's own coordinates
        let fx0: number = param2.x - param2.y - param2.height;
        let fx1: number = param2.x + param2.width - param2.y;
        let fy0: number = (param2.x + param2.y) / 2;
        let fy1: number = (param2.x + param2.width + param2.y + param2.height) / 2;
        let minX: number = fx0;
        let maxX: number = fx1;
        let minY: number = fy0;
        let maxY: number = fy1;
        let p: any[] = null;
        for (p of as3.values(param1)) {
            minX = Math.min(minX, Number(p[1]));
            minY = Math.min(minY, Number(p[2]));
            maxX = Math.max(maxX, Number(p[1] + p[3]));
            maxY = Math.max(maxY, Number(p[2] + p[4]));
        }
        let ox: int = (Math.floor(minX / C) * C - C) | 0;
        let oy: int = (Math.floor(minY / C) * C - C) | 0;
        let cols: int = (Math.ceil((maxX - ox) / C) + 2) | 0;
        let rows: int = (Math.ceil((maxY - oy) / C) + 2) | 0;
        let on: any[] = new Array(cols * rows);
        let r: int = 0;
        let c: int = 0;
        let f: int = 0;
        let cx: number = NaN;
        let cy: number = NaN;
        let bx: int = 0;
        let by: int = 0;
        let gx: number = NaN;
        let gy: number = NaN;
        let bmd: BitmapData = null;
        let step: int = 1;
        for (p of as3.values(param1)) {
            bmd = as3.cast(p[0], BitmapData);
            step = p[5] > 16 ? 2 : 1;
            r = 0;
            while (r < rows) {
                cy = oy + r * C + C / 2;
                by = (cy - p[2]) | 0;
                if (by >= 0 && by < p[4] && by < bmd.height) {
                    c = 0;
                    while (c < cols) {
                        if (!on[r * cols + c]) {
                            cx = ox + c * C + C / 2;
                            bx = (cx - p[1]) | 0;
                            if (bx >= 0 && bx < p[3]) {
                                f = 0;
                                while (f < p[5]) {
                                    if (f * p[3] + bx < bmd.width && (bmd.getPixel32((f * p[3] + bx) | 0, by) >>> 24) > 40) {
                                        on[r * cols + c] = 1;
                                        break;
                                    }
                                    f += step;
                                }
                            }
                        }
                        c++;
                    }
                }
                r++;
            }
        }
        // the footprint (a point's grid position: x = gx - gy, y = (gx + gy) / 2)
        r = 0;
        while (r < rows) {
            cy = oy + r * C + C / 2;
            c = 0;
            while (c < cols) {
                cx = ox + c * C + C / 2;
                gx = cy + cx / 2;
                gy = cy - cx / 2;
                if (gx >= param2.x && gx <= param2.x + param2.width && gy >= param2.y && gy <= param2.y + param2.height) {
                    on[r * cols + c] = 1;
                }
                c++;
            }
            r++;
        }
        // grown by one square
        let grown: any[] = new Array(cols * rows);
        r = 0;
        while (r < rows) {
            c = 0;
            while (c < cols) {
                if (on[r * cols + c] || c > 0 && on[r * cols + c - 1] || c < cols - 1 && on[r * cols + c + 1] || r > 0 && on[(r - 1) * cols + c] || r < rows - 1 && on[(r + 1) * cols + c]) {
                    grown[r * cols + c] = 1;
                }
                c++;
            }
            r++;
        }
        let out: any[] = [];
        let start: int = 0;
        r = 0;
        while (r < rows) {
            c = 0;
            while (c < cols) {
                if (grown[r * cols + c]) {
                    start = c;
                    while (c < cols && grown[r * cols + c]) {
                        c++;
                    }
                    out.push(ox + start * C, oy + r * C, (c - start) * C, C);
                } else {
                    c++;
                }
            }
            r++;
        }
        return out;
    }

    /** Not while attacking (the mouse drops monsters then), moving or placing a building. */
    private ioHoverIn(param1: MouseEvent): void {
        if (String(GLOBAL.mode).indexOf("attack") != -1 || this._moving || this._placing || GLOBAL._newBuilding === this || this.m_isCleared) {
            return;
        }
        if (BFOUNDATION.s_ioHovered && BFOUNDATION.s_ioHovered != this) {
            BFOUNDATION.s_ioHovered.ioHoverOut(null);
        }
        BFOUNDATION.s_ioHovered = this;
        this._ioHover = true;
        this.ioShowGlow();
    }

    public ioHoverOut(param1: MouseEvent): void {
        if (BFOUNDATION.s_ioHovered == this) {
            BFOUNDATION.s_ioHovered = null;
        }
        if (!this._ioHover) {
            return;
        }
        this._ioHover = false;
        this.ioHideGlow();
    }

    /** A picture of the building as it is now (every part), glowing white round its edge only. */
    private ioShowGlow(): void {
        this.ioHideGlow();
        if (!this._mc || this.m_isCleared) {
            return;
        }
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.filters = [new GlowFilter(0xFFFFFF, 1, 9, 9, 3, 2)];
            return;
        }
        if (!this._rasterData || !this._offsets) {
            return;
        }
        let parts: any[] = [BFOUNDATION._RASTERDATA_TOP, BFOUNDATION._RASTERDATA_ANIM, BFOUNDATION._RASTERDATA_ANIM2, BFOUNDATION._RASTERDATA_ANIM3];
        let minX: number = Infinity;
        let minY: number = Infinity;
        let maxX: number = -Infinity;
        let maxY: number = -Infinity;
        let i: uint = 0;
        let rd: RasterData = null;
        let d: BitmapData = null;
        for (const $value of as3.values(parts)) {
            i = $value >>> 0;
            rd = as3.as(as3.vget(this._rasterData, i), RasterData);
            d = rd ? as3.as(rd.data, BitmapData) : null;
            if (d && as3.vget(this._offsets, i)) {
                minX = Math.min(minX, as3.vget(this._offsets, i).x);
                minY = Math.min(minY, as3.vget(this._offsets, i).y);
                maxX = Math.max(maxX, as3.vget(this._offsets, i).x + d.width);
                maxY = Math.max(maxY, as3.vget(this._offsets, i).y + d.height);
            }
        }
        if (minX == Infinity || maxX - minX > 2048 || maxY - minY > 2048) {
            return;
        }
        minX -= BFOUNDATION.IO_GLOW_PAD;
        minY -= BFOUNDATION.IO_GLOW_PAD;
        this._ioGlowBMD = new BitmapData((maxX - minX + BFOUNDATION.IO_GLOW_PAD) | 0, (maxY - minY + BFOUNDATION.IO_GLOW_PAD) | 0, true, 0);
        for (const $value of as3.values(parts)) {
            i = $value >>> 0;
            rd = as3.as(as3.vget(this._rasterData, i), RasterData);
            d = rd ? as3.as(rd.data, BitmapData) : null;
            if (d && as3.vget(this._offsets, i)) {
                this._ioGlowBMD.copyPixels(d, d.rect, new Point((as3.vget(this._offsets, i).x - minX) | 0, (as3.vget(this._offsets, i).y - minY) | 0), null, null, true);
            }
        }
        this._ioGlowOff = new Point(minX | 0, minY | 0);
        this._ioGlowPt = new Point();
        this._ioGlow = new RasterData(as3.cast(this._ioGlowBMD, IBitmapDrawable), this._ioGlowPt, 0);
        this._ioGlow.filter = BFOUNDATION.s_ioGlowFilter;
        this.updateRasterData();
    }

    private ioHideGlow(): void {
        if (this._ioGlow) {
            this._ioGlow.clear();
            this._ioGlow = null;
        }
        if (this._ioGlowBMD) {
            this._ioGlowBMD.dispose();
            this._ioGlowBMD = null;
        }
        if (!BYMConfig.instance.RENDERER_ON && this._mc && this._mc.filters.length && this._mc.filters[0] instanceof GlowFilter) {
            this._mc.filters = [];
        }
    }

    public highlight(param1: uint): void {
        let _loc2_: any[] = null;
        if (this._mc) {
            _loc2_ = new Array();
            _loc2_ = _loc2_.concat([2, 0, 0, 0, 0]);
            _loc2_ = _loc2_.concat([0, 2, 0, 0, 0]);
            _loc2_ = _loc2_.concat([0, 0, 3, 0, 0]);
            _loc2_ = _loc2_.concat([0, 0, 0, 1, 0]);
            this._mc.filters = [new ColorMatrixFilter(_loc2_)];
            if (BYMConfig.instance.RENDERER_ON && Boolean(as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP))) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP).filter = as3.cast(this._mc.filters[0], BitmapFilter);
            }
        }
    }

    public disableHighlight(): void {
        if (this._mc) {
            this._mc.filters = [];
            if (BYMConfig.instance.RENDERER_ON && Boolean(as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP))) {
                as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP).filter = null;
            }
        }
    }

    public set x(param1: number) {
        this._mc.x = param1;
        this.onMove();
        this.updateRasterData();
    }

    public set y(param1: number) {
        this._mc.y = param1;
        this.onMove();
        this.updateRasterData();
    }

    public moveTo(param1: int, param2: int): void {
        this.GridCost(false);
        this.x = param1;
        this.y = param2;
        this._mcBase.x = param1;
        this._mcBase.y = param2;
        this._mcFootprint.x = param1;
        this._mcFootprint.y = param2;
        this.StartMove();
        this.StopMove(null);
        this.updateRasterData();
        BFOUNDATION.redrawAllShadowData();
    }

    protected onMove(): void {
    }

    public get name(): string {
        return KEYS.Get(as3.str(this._buildingProps.name));
    }

    public get isUpgrading(): boolean {
        return this._countdownUpgrade.Get() > 0;
    }

    public get isBuilding(): boolean {
        return this._countdownBuild.Get() > 0;
    }

    protected RelocateHousedCreatures(): void {
        let _loc4_: MonsterBase = null;
        let _loc1_: BFOUNDATION = BASE.FindClosestHousingToPoint(this.x | 0, this.y | 0, this);
        if (_loc1_ == null) {
            return;
        }
        let _loc2_: uint = this._creatures.length;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            if ((_loc4_ = as3.cast(this._creatures[_loc3_], MonsterBase))._behaviour != MonsterBase.k_sBHVR_JUICE) {
                _loc1_._creatures.push(_loc4_);
                _loc4_._house = _loc1_;
                _loc4_._targetCenter = GRID.FromISO(_loc1_.x, _loc1_.y);
                _loc4_.changeModeHousing();
            }
            _loc3_++;
        }
        this._creatures.length = 0;
    }

    protected UpdateHousedCreatureTargets(): void {
        let _loc3_: MonsterBase = null;
        let _loc1_: uint = this._creatures.length;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.cast(this._creatures[_loc2_], MonsterBase);
            if (!(_loc3_._behaviour == MonsterBase.k_sBHVR_JUICE || _loc3_._behaviour == MonsterBase.k_sBHVR_BUNKER && GLOBAL.InfernoMode() === false)) {
                _loc3_._targetCenter = GRID.FromISO(this.x, this.y);
                _loc3_.changeModeHousing();
            }
            _loc2_++;
        }
    }

    public StartProduction(): void {
    }

    protected onEnterFrame(param1: Event): void {
    }

    protected removedFromStage(param1: Event): void {
        this.graphic.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.graphic.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
    }

    public override get x(): number {
        return super.x;
    }

    public override get y(): number {
        return super.y;
    }
}
