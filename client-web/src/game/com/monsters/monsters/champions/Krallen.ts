import * as as3 from "as3";
import { Class, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { Dictionary } from "flash/utils";
import { BASE, BFOUNDATION, BRESOURCE, BSTORAGE, BTOWER, BYMConfig, Bunker, CHAMPIONCAGE, ChampionBase, Component, GLOBAL, GRID, ILootable, InstanceManager, MONSTERBUNKER, PATHING, RasterData, SPRITES, SecNum } from "@game";

export class Krallen extends ChampionBase {
    static {
        as3.fields(this, { _lootMults: null });
    }

    public static readonly MAX_POWERLEVEL: int = 2;

    public static readonly TYPE: uint = 5;
    public _lootMults: Dictionary;

    public $ctor(param1?: string, param2?: Point, param3?: number, param4: Point = null, param5: boolean = false, param6: BFOUNDATION = null, param7: int = 1, param8: int = 0, param9: int = 0, param10: int = 1, param11: int = 20000, param12: int = 0, param13: int = 1): void {
        let _loc14_: any[] = null;
        let _loc17_: uint = 0;
        let _loc18_: any = null;
        param13 = Math.min(param13, Krallen.MAX_POWERLEVEL) | 0;
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13);
        _loc14_ = CHAMPIONCAGE.GetGuardianProperties(this._creatureID, "abilities");
        let _loc15_: number = this._powerLevel.Get();
        let _loc16_: uint = _loc14_.length;
        this._lootMults = new Dictionary();
        this._lootMults.set(BRESOURCE, new SecNum(2));
        this._lootMults.set(BSTORAGE, new SecNum(3));
        this._buff = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffs"));
        while (_loc17_ < _loc16_) {
            if (_loc15_ < _loc17_) {
                break;
            }
            _loc18_ = as3.as(_loc14_[_loc17_], Class);
            if (_loc18_) {
                this.addComponent(as3.cast(new _loc18_(), Component));
            }
            _loc17_++;
        }
    }

    protected override setupSprite(): void {
        this._frameNumber = (Math.random() * 7) | 0;
        this._spriteID = this._creatureID + "_" + this._powerLevel.Get();
        SPRITES.SetupSprite(this._spriteID);
        let _loc1_: any = SPRITES.GetSpriteDescriptor(this._spriteID);
        this._graphic = new BitmapData(_loc1_.width, _loc1_.height, true, 16777215);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._powerLevel.Get() | 0, "offset_x"));
        this._graphicMC.y = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._powerLevel.Get() | 0, "offset_y"));
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphicMC, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
    }

    public override findTarget(param1: int = 0): void {
        let _loc6_: any = null;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: BFOUNDATION = null;
        let _loc9_: Point = null;
        let _loc10_: boolean = false;
        let _loc11_: Point = null;
        let _loc12_: Point = null;
        let _loc13_: int = 0;
        let _loc15_: any = null;
        let _loc16_: string = null;
        let _loc17_: boolean = false;
        let _loc19_: int = 0;
        let _loc20_: Point = null;
        let _loc21_: int = 0;
        let _loc22_: int = 0;
        let _loc23_: int = 0;
        let _loc24_: number = NaN;
        let _loc25_: int = 0;
        let _loc26_: Point = null;
        let _loc2_: any = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BTOWER);
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(Bunker);
        let _loc5_: Vector<any> = InstanceManager.getInstancesByClass(MONSTERBUNKER);
        let _loc14_: any[] = [];
        let _loc18_: Dictionary = new Dictionary();
        this._looking = true;
        _loc11_ = PATHING.FromISO(this._tmpPoint);
        for (_loc7_ of as3.values(_loc2_)) {
            if (_loc7_.health > 0 && as3.is(_loc7_, ILootable)) {
                if (!_loc7_._looted) {
                    _loc12_ = GRID.FromISO(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                    _loc13_ = (GLOBAL.QuickDistance(_loc11_, _loc12_) - _loc7_._middle) | 0;
                    _loc14_.push({ "building": _loc7_, "distance": _loc13_ });
                    _loc17_ = true;
                } else {
                    _loc18_.set(_loc7_, true);
                }
            }
        }
        if (!_loc17_) {
            for (_loc7_ of (_loc3_ ?? [])) {
                if (_loc7_.health > 0 && !(as3.as(_loc7_, BTOWER)).isJard) {
                    _loc12_ = GRID.FromISO(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                    _loc13_ = (GLOBAL.QuickDistance(_loc11_, _loc12_) - _loc7_._middle) | 0;
                    _loc14_.push({ "building": _loc7_, "distance": _loc13_, "expand": false });
                    _loc17_ = true;
                }
            }
        }
        if (!_loc17_) {
            for (_loc7_ of (_loc4_ ?? [])) {
                if ((_loc15_ = _loc7_).health > 0 && (_loc15_._used > 0 || _loc15_._monstersDispatchedTotal > 0)) {
                    _loc12_ = GRID.FromISO(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                    _loc13_ = (GLOBAL.QuickDistance(_loc11_, _loc12_) - _loc7_._middle) | 0;
                    _loc14_.push({ "building": _loc7_, "distance": _loc13_, "expand": false });
                }
            }
        }
        if (!_loc17_) {
            for (const $value of (_loc18_?.keys() ?? [])) {
                _loc16_ = as3.str($value);
                _loc7_ = as3.as(_loc18_.get(_loc16_), BFOUNDATION);
                if (_loc7_) {
                    _loc12_ = GRID.FromISO(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                    _loc13_ = (GLOBAL.QuickDistance(_loc11_, _loc12_) - _loc7_._middle) | 0;
                    _loc14_.push({ "building": _loc7_, "distance": _loc13_, "expand": true });
                    _loc17_ = true;
                }
            }
        }
        if (_loc14_.length == 0) {
            for (_loc7_ of as3.values(BASE._buildingsMain)) {
                if (_loc7_._class != "decoration" && _loc7_._class != "immovable" && _loc7_.health > 0 && _loc7_._class != "enemy") {
                    if (_loc7_._class == "tower" && !MONSTERBUNKER.isBunkerBuilding(_loc7_._type)) {
                        if ((as3.as(_loc7_, BTOWER)).isJard) {
                            continue;
                        }
                    }
                    _loc12_ = GRID.FromISO(_loc7_._mc.x, _loc7_._mc.y + _loc7_._middle);
                    _loc13_ = (GLOBAL.QuickDistance(_loc11_, _loc12_) - _loc7_._middle) | 0;
                    _loc14_.push({ "building": _loc7_, "distance": _loc13_, "expand": true });
                }
            }
        }
        if (_loc14_.length == 0) {
            this.changeModeRetreat();
        } else {
            as3.sortOn(_loc14_, "distance", Array.NUMERIC);
            _loc19_ = 0;
            if (this._movement == "burrow") {
                this._hasTarget = true;
                this._hasPath = true;
                _loc20_ = GRID.FromISO(Number(_loc14_[_loc19_].building._mc.x), Number(_loc14_[_loc19_].building._mc.y));
                _loc21_ = (Math.random() * 4) | 0;
                _loc22_ = _loc14_[_loc19_].building._footprint[0].height | 0;
                _loc23_ = _loc14_[_loc19_].building._footprint[0].width | 0;
                if (_loc21_ == 0) {
                    _loc20_.x += Math.random() * _loc22_;
                    _loc20_.y += _loc23_;
                } else if (_loc21_ == 1) {
                    _loc20_.x += _loc22_;
                    _loc20_.y += _loc23_;
                } else if (_loc21_ == 2) {
                    _loc20_.x += _loc22_ - Math.random() * _loc22_ / 2;
                    _loc20_.y -= _loc23_ / 4;
                } else if (_loc21_ == 3) {
                    _loc20_.x -= _loc22_ / 4;
                    _loc20_.y += _loc23_ - Math.random() * _loc23_ / 2;
                }
                this._waypoints = [GRID.ToISO(_loc20_.x, _loc20_.y, 0)];
                this._targetPosition = as3.cast(this._waypoints[0], Point);
                this._targetBuilding = as3.cast(_loc14_[_loc19_].building, BFOUNDATION);
            } else if (this._movement == "fly") {
                this._hasTarget = true;
                this._hasPath = true;
                this._targetBuilding = as3.cast(_loc14_[_loc19_].building, BFOUNDATION);
                this._targetCenter = this._targetBuilding._position;
                if (GLOBAL.QuickDistance(this._tmpPoint, this._targetCenter) < 170) {
                    this._atTarget = true;
                    this._hasPath = true;
                    this._targetPosition = this._targetCenter;
                } else {
                    _loc24_ = (_loc24_ = (_loc24_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 40 - 20)) / (180 / Math.PI);
                    _loc25_ = (120 + Math.random() * 10) | 0;
                    _loc26_ = new Point(this._targetCenter.x + Math.cos(_loc24_) * _loc25_ * 1.7, this._targetCenter.y + Math.sin(_loc24_) * _loc25_);
                    this._waypoints = [_loc26_];
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                }
            } else if (GLOBAL._catchup) {
                this.WaypointTo(new Point(_loc14_[0].building._mc.x, _loc14_[0].building._mc.y), as3.cast(_loc14_[0].building, BFOUNDATION));
            } else {
                _loc19_ = 0;
                while (_loc19_ < 2) {
                    if (_loc14_.length > _loc19_) {
                        this.WaypointTo(new Point(_loc14_[_loc19_].building._mc.x, _loc14_[_loc19_].building._mc.y), as3.cast(_loc14_[_loc19_].building, BFOUNDATION));
                    }
                    _loc19_++;
                }
            }
        }
    }

    public override clear(): void {
        this._lootMults = null;
        super.clear();
    }
}
