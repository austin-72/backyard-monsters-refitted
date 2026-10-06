import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { DescentMapRoom, DescentMonsterBase, DescentView, GLOBAL, KEYS, LOGGER, MAPROOM_DESCENT, MAPROOM_INFERNO, MapViewDescent_Fog_Shroud, com_monsters_maproom_inferno_ForeignBase as ForeignBase, com_monsters_maproom_inferno_MapRoom as MapRoom, com_monsters_maproom_inferno_MiniMap as MiniMap, com_monsters_maproom_inferno_Obstruction as Obstruction, com_monsters_maproom_inferno_PlayerBase as PlayerBase, com_monsters_maproom_inferno_WildMonsterBase as WildMonsterBase, com_monsters_maproom_inferno_model_BaseObject as BaseObject } from "@game";

// We have opted to use the March 2012 pre-patch version of descent bases
// which introduced the original 13, over the reduced version of 7.
// The old implementation can be found at the bottom of this file.
// For more info visit: https://backyard-monsters.fandom.com/wiki/Inferno
export class DescentLayer extends Sprite {
    static {
        as3.fields(this, { _lastUpdated: 0, _getting: false, _gets: 0, basesForeign: null, basesWM: null, basesAll: null, baseData: null, divisor: 85, lastOpened: null, _frameNumber: 0, jitter: 2, obstructions: null, _playersLimit: 180, mapWidth: 760, player: null, _wmbToDisplay: 13, wmBasesUsed: 0, descentShroud: null, targetLvl: 0, targetBase: null, _BRIDGE: null, descentBaseProps: null, faked: false });
    }

    private _lastUpdated: int;
    private _getting: boolean;
    private _gets: uint;
    public basesForeign: any[];
    public basesWM: any[];
    public basesAll: any[];
    public baseData: any[];
    private divisor: uint;
    public lastOpened: ForeignBase;
    private _frameNumber: int;
    private jitter: uint;
    public obstructions: any[];
    public _playersLimit: uint;
    public mapWidth: uint;
    public player: PlayerBase;
    public _wmbToDisplay: int;
    private wmBasesUsed: any;
    private descentShroud: MovieClip;
    public targetLvl: int;
    public targetBase: DescentMonsterBase;
    private _BRIDGE: any;
    private descentBaseProps: any;
    public faked: boolean;

    public $ctor(): void {
        this.descentBaseProps = { "0": { "x": 150, "y": 10 }, "1": { "x": 350, "y": 260 }, "2": { "x": 550, "y": 340 }, "3": { "x": 350, "y": 420 }, "4": { "x": 135, "y": 440 }, "5": { "x": 270, "y": 620 }, "6": { "x": 550, "y": 560 }, "7": { "x": 450, "y": 775 }, "8": { "x": 150, "y": 885 }, "9": { "x": 540, "y": 1010 }, "10": { "x": 330, "y": 1170 }, "11": { "x": 155, "y": 1390 }, "12": { "x": 540, "y": 1360 }, "13": { "x": 350, "y": 1765 } };
        super.$ctor();
        this.basesForeign = [].concat();
        this.baseData = [].concat();
        this.basesAll = [].concat();
        this.basesWM = [].concat();
        if (MAPROOM_DESCENT._open) {
            if (DescentMapRoom.BRIDGE) {
                this._BRIDGE = DescentMapRoom.BRIDGE;
            }
        } else if (MAPROOM_INFERNO._open) {
            if (MapRoom.BRIDGE) {
                this._BRIDGE = MapRoom.BRIDGE;
            }
        }
        this.descentShroud = new MapViewDescent_Fog_Shroud();
        this.player = new PlayerBase(Number(this._BRIDGE.playerBaseID), Number(this._BRIDGE.playerBaseSeed));
        this.player.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.sortToTop));
        this.basesAll.push(this.player);
        this.addChild(this.player);
        this.player.x = 350;
        this.player.y = 10;
        this.player.alpha = 0;
        this.wmBasesUsed = 0;
    }

    public Clear(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this.basesAll.length) {
            if (this.basesAll[_loc1_].parent) {
                this.basesAll[_loc1_].removeEventListener("over", as3.bind(this, this.onBaseStateChange));
                this.basesAll[_loc1_].removeEventListener("off", as3.bind(this, this.onBaseStateChange));
                this.basesAll[_loc1_].removeEventListener("down", as3.bind(this, this.onBaseStateChange));
                this.basesAll[_loc1_].parent.removeChild(this.basesAll[_loc1_]);
            }
            _loc1_++;
        }
        _loc1_ = 0;
        while (_loc1_ < this.baseData.length) {
            this.baseData[_loc1_].Clear();
            _loc1_++;
        }
        this.basesForeign = [];
        this.baseData = [];
        this.basesAll = [];
        this.basesWM = [];
        this.player = null;
        this.descentShroud = null;
    }

    public Tick(...rest: any[]): void {
        let _loc2_: string = null;
        if (this._lastUpdated > 0 && GLOBAL.Timestamp() - this._lastUpdated > 15 && !this._getting) {
            this.Get();
        }
        if (this._frameNumber % 40 == 0) {
            _loc2_ = "";
            if (this._BRIDGE.GLOBAL._flags.attacking == 0) {
                _loc2_ = KEYS.Get("map_msg_attackingdisabled");
            }
            if (_loc2_) {
            }
        }
        ++this._frameNumber;
    }

    public Get(): void {
        let obj: any = null;
        let aib: any = null;
        let ai: string = null;
        let _o: any = null;
        let start: int = 0;
        this._getting = true;
        ++this._gets;
        if (this._gets > 12) {
        }
        obj = { "error": 0, "bases": [], "currenttime": GLOBAL.Timestamp() };
        try {
            GLOBAL.WaitHide();
            if (obj.error == 0) {
                obj.wmbases = [];
                aib = this._BRIDGE.WMBASE._descentBases;
                try {
                    if (aib) {
                        for (ai in aib) {
                            if (aib[ai]) {
                                _o = {};
                                if (aib[ai].tribe) {
                                    _o.baseid = aib[ai].baseid;
                                    _o.level = aib[ai].level;
                                    _o.type = aib[ai].tribe.type;
                                    _o.description = aib[ai].tribe.description;
                                    _o.wm = 1;
                                    _o.friend = 0;
                                    _o.pic = aib[ai].tribe.profilepic;
                                    _o.basename = KEYS.Get("ai_tribe", { "v1": aib[ai].tribe.name });
                                    _o.destroyed = aib[ai].destroyed;
                                    obj.wmbases.push(_o);
                                }
                            }
                        }
                    }
                } catch (e) {
                    LOGGER.Log("err", "DescentLayer WM: " + e.message);
                }
                try {
                    start = getTimer();
                    this.Create(obj);
                    this._getting = false;
                    this._lastUpdated = (GLOBAL.Timestamp() + ((Math.random() * 5) | 0)) | 0;
                    this.dispatchEvent(new Event(Event.COMPLETE));
                } catch (e) {
                    LOGGER.Log("err", "DescentLayer Create: " + e.message);
                }
            } else {
                LOGGER.Log("err", "MAPROOMPOPUP.Get: " + obj.error);
                GLOBAL.ErrorMessage("MAPROOMPOPUP.Get 1");
            }
            if (MiniMap.getInstance()) {
                MiniMap.getInstance().Update(this.basesForeign, this.basesWM);
            }
        } catch (e) {
            LOGGER.Log("err", "DescentLayer: " + e.message);
        }
    }

    public Create(param1: any): void {
        let _loc2_: any = null;
        let _loc4_: BaseObject = null;
        let _loc5_: BaseObject = null;
        let _loc6_: uint = 0;
        let _loc7_: uint = 0;
        let _loc8_: DescentMonsterBase = null;
        let _loc9_: DescentMonsterBase = null;
        let _loc10_: ForeignBase = null;
        let _loc3_: boolean = false;
        if (this.basesForeign == null) {
            this.basesForeign = [];
        }
        if (this.basesWM == null) {
            this.basesWM = [];
        }
        if (this.basesAll == null) {
            this.basesAll = [];
        }
        if (this.baseData == null) {
            this.baseData = [];
        }
        if (Boolean(param1) && Boolean(param1.wmbases)) {
            _loc7_ = 0;
            while (_loc7_ < param1.wmbases.length) {
                if (this.wmBasesUsed < this._wmbToDisplay) {
                    _loc2_ = param1.wmbases[_loc7_];
                    _loc3_ = false;
                    for (_loc4_ of as3.values(this.baseData)) {
                        if ((_loc4_.baseid.Get() | 0) == _loc2_.baseid) {
                            _loc3_ = true;
                        }
                    }
                    if (!_loc3_) {
                        _loc5_ = new BaseObject(_loc2_);
                        (_loc9_ = new DescentMonsterBase()).Setup(_loc5_);
                        _loc9_.useHandCursor = true;
                        _loc9_.buttonMode = true;
                        _loc9_.addEventListener("over", as3.bind(this, this.onBaseStateChange));
                        _loc9_.addEventListener("off", as3.bind(this, this.onBaseStateChange));
                        _loc9_.addEventListener("down", as3.bind(this, this.onBaseStateChange));
                        if (this.setMapLinear(_loc9_, as3.str(_loc2_.level))) {
                            this.baseData.push(_loc5_);
                            this.addChild(_loc9_);
                            this.basesAll.push(_loc9_);
                            this.basesWM.push(_loc9_);
                            ++this.wmBasesUsed;
                            if (Boolean(_loc9_.data) && _loc9_.data.destroyed == 1) {
                                ++this.targetLvl;
                            } else if (this.targetLvl + 1 == _loc9_.data.level.Get()) {
                                this.targetBase = _loc9_;
                                this.PositionShroud(this.targetBase);
                            }
                        }
                    }
                }
                _loc7_++;
            }
            for (_loc8_ of as3.values(this.basesWM)) {
                if (_loc8_ == this.targetBase) {
                    _loc8_.InitTargetListener();
                }
            }
        }
        if (this.basesForeign.length < this._playersLimit && param1 && Boolean(param1.bases)) {
            if (this.basesForeign.length + param1.bases.length >= this._playersLimit) {
                _loc6_ = (this._playersLimit - this.basesForeign.length) >>> 0;
            } else {
                _loc6_ = param1.bases.length >>> 0;
            }
            if (param1 && param1.bases && param1.bases.length > 0) {
                _loc7_ = 0;
                while (_loc7_ < _loc6_) {
                    _loc2_ = param1.bases[_loc7_];
                    _loc3_ = false;
                    for (_loc4_ of as3.values(this.baseData)) {
                        if ((_loc4_.baseid.Get() | 0) == _loc2_.baseid) {
                            _loc4_.Update(_loc2_);
                            _loc4_.online = _loc2_.saved >= GLOBAL.Timestamp() - 62;
                            _loc3_ = true;
                            break;
                        }
                    }
                    if (!_loc3_) {
                        _loc5_ = new BaseObject(_loc2_);
                        (_loc10_ = new ForeignBase()).Setup(_loc5_);
                        _loc10_.useHandCursor = true;
                        _loc10_.buttonMode = true;
                        _loc10_.addEventListener("over", as3.bind(this, this.onBaseStateChange));
                        _loc10_.addEventListener("off", as3.bind(this, this.onBaseStateChange));
                        _loc10_.addEventListener("down", as3.bind(this, this.onBaseStateChange));
                        this.baseData.push(_loc5_);
                        if (this.setMapCoords(_loc10_)) {
                            this.addChild(_loc10_);
                            this.basesForeign.push(_loc10_);
                            this.basesAll.push(_loc10_);
                        }
                    }
                    _loc7_ = (_loc7_ + 1) >>> 0;
                }
            }
            this.setChildIndex(this.player, (this.numChildren - 1) | 0);
            return;
        }
    }

    public PositionShroud(param1: DescentMonsterBase): void {
        let _loc2_: DescentMonsterBase = null;
        let _loc3_: boolean = false;
        for (_loc2_ of as3.values(this.basesWM)) {
            if ((_loc2_.data.baseid.Get() | 0) == param1.data.baseid.Get()) {
                _loc3_ = true;
            }
        }
        if (_loc3_) {
            DescentView.getInstance().shroud.x = -50;
            DescentView.getInstance().shroud.y = param1.mapY;
        }
    }

    private onBaseStateChange(param1: Event): void {
        let _loc2_: ForeignBase = as3.as(param1.target, ForeignBase);
        if (this.lastOpened && this.lastOpened.state != "off" && this.lastOpened != _loc2_) {
            this.lastOpened.setState("off");
        }
        this.sortToTop(param1);
        this.lastOpened = _loc2_;
        if (param1.type == "down") {
            this.dispatchEvent(param1.clone());
        }
    }

    private sortToTop(param1: any): void {
        this.setChildIndex(as3.cast(param1.target, DisplayObject), (this.numChildren - 1) | 0);
    }

    public setMapLinear(param1: any, param2: string): boolean {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: number = NaN;
        if (Number(param2) > 13) {
            return false;
        }
        let _loc3_: boolean = true;
        _loc4_ = this.descentBaseProps[param2].x | 0;
        _loc5_ = this.descentBaseProps[param2].y | 0;
        param1.mapX = _loc4_;
        param1.mapY = _loc5_;
        _loc6_ = 0;
        param1.x = _loc4_;
        param1.y = _loc5_;
        return _loc3_;
    }

    public setMapCoords(param1: any, param2: boolean = false): boolean {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: number = NaN;
        let _loc7_: any = null;
        let _loc8_: int = 0;
        let _loc9_: WildMonsterBase = null;
        let _loc10_: uint = 0;
        let _loc11_: Point = null;
        let _loc3_: boolean = true;
        if (param2) {
            _loc8_ = (_loc7_ = { "l": 0, "k": 1, "a": 2, "d": 3 })[param1.data.basename.charAt(0).toLowerCase()] | 0;
            _loc4_ = (Obstruction.Reserved[_loc8_].x / this.divisor) | 0;
            _loc5_ = ((Obstruction.Reserved[_loc8_].y - 130) / this.divisor) | 0;
            for (_loc9_ of as3.values(this.basesWM)) {
                if (_loc9_.mapX == _loc4_ && _loc9_.mapY == _loc5_) {
                    return false;
                }
            }
            param1.mapX = _loc4_;
            param1.mapY = _loc5_;
            _loc6_ = 0;
        } else {
            _loc10_ = (this.mapWidth / this.divisor - 2) >>> 0;
            _loc4_ = (1 + param1.data.baseid.Get() % _loc10_) | 0;
            _loc5_ = (1 + param1.data.baseseed.Get() % _loc10_) | 0;
            _loc11_ = this.getNonConflictingCoords(new Point(_loc4_, _loc5_), new Rectangle(2, 2, _loc10_ - 2, _loc10_ - 2), 10);
            if (!_loc11_) {
                return false;
            }
            param1.mapX = _loc11_.x;
            param1.mapY = _loc11_.y;
            _loc6_ = param1.data.baseid.Get() % (this.divisor * 0.5);
        }
        param1.x = 130 + this.divisor * param1.mapX + _loc6_;
        param1.y = 130 + this.divisor * param1.mapY + _loc6_;
        return _loc3_;
    }

    private getNonConflictingCoords(param1: Point, param2: Rectangle, param3: uint = 3): Point {
        let _loc7_: int = 0;
        if (!this.baseExistsAt(param1.x >>> 0, param1.y >>> 0) && !Obstruction.pointIsBlocked((param1.x * this.divisor) | 0, (param1.y * this.divisor) | 0)) {
            return param1;
        }
        let _loc4_: any = {};
        let _loc5_: int = (-param3) | 0;
        while (_loc5_ <= param3) {
            _loc4_[_loc5_] = {};
            _loc7_ = (-param3) | 0;
            while (_loc7_ <= param3) {
                _loc4_[_loc5_][_loc7_] = 0;
                _loc7_++;
            }
            _loc5_++;
        }
        let _loc6_: uint = 1;
        while (_loc6_ <= param3) {
            _loc5_ = (-_loc6_) | 0;
            while (_loc5_ <= _loc6_) {
                _loc7_ = (-_loc6_) | 0;
                while (_loc7_ <= _loc6_) {
                    if (_loc4_[_loc5_][_loc7_] == 0 && param1.x + _loc5_ > param2.x && param1.x + _loc5_ < param2.x + param2.width && param1.y + _loc7_ > param2.y && param1.y + _loc7_ < param2.y + param2.height) {
                        if (!(this.baseExistsAt((param1.x + _loc5_) >>> 0, (param1.y + _loc7_) >>> 0) || Obstruction.pointIsBlocked(((param1.x + _loc5_) * this.divisor) | 0, ((param1.y + _loc7_) * this.divisor) | 0))) {
                            return new Point(param1.x + _loc5_, param1.y + _loc7_);
                        }
                        _loc4_[_loc5_][_loc7_] == 1;
                    }
                    _loc7_++;
                }
                _loc5_++;
            }
            _loc6_++;
        }
        return null;
    }

    public baseExistsAt(param1: uint, param2: uint): boolean {
        let _loc3_: any = undefined;
        for (_loc3_ of as3.values(this.basesAll)) {
            if (_loc3_.mapX == param1 && _loc3_.mapY == param2) {
                return true;
            }
        }
        return false;
    }
}
