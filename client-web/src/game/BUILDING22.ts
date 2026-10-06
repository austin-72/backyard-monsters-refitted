import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { ATTACK, BASE, Bunker, CREATURELOCKER, CREATURES, CreepInfo, Decoy, Expo, GLOBAL, KEYS, MAP, MapRoomManager, MonsterBase, POPUPS, SOUNDS, SecNum, SiegeWeapons, Targeting, TweenLite, popup_building } from "@game";

export class BUILDING22 extends Bunker {
    static {
        as3.fields(this, { _animMC: null, _animFrame: 0, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null, _blend: 0, _blending: false, _bank: null, _monsters: null, _open: false, _releaseCooldown: 0, _targetCreeps: null, _targetFlyers: null, _targetCreep: undefined, _hasTargets: false, _tickNumber: 0, _capacity: 0, _logged: false, _radiusGraphic: null, _ioHealth: null });
    }

    private static readonly kPercentAllowed: number = 0.1;
    public _animMC: MovieClip;
    public _animFrame: int;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;
    public _blend: int;
    public _blending: boolean;
    public _bank: SecNum;
    public _monsters: Dictionary;
    public _open: boolean;
    public _releaseCooldown: int;
    public _targetCreeps: any[];
    public _targetFlyers: any[];
    public _targetCreep: any;
    public _hasTargets: boolean;
    public _tickNumber: int;
    public _capacity: int;
    private _logged: boolean;
    private _radiusGraphic: Shape;
    /**
     * Inferno-only: a bunker only knows how many of each monster it holds, and sent every one out at
     * full health, every attack. It now also keeps the health of the wounded ones:
     *   _ioHealth[id]   wounded monsters waiting inside (from the save, or back from a fight)
     *   "mh" in the save what Export writes while the yard is under attack: the wounded inside plus
     *                   the wounded still outside, never more entries than there are monsters
     * The wounded are sent out first, so a half-dead defender does not hide behind fresh ones.
     */
    private _ioHealth: any;

    public $ctor(): void {
        this._ioHealth = {};
        super.$ctor();
        this._type = 22;
        this._frameNumber = 0;
        this._footprint = [new Rectangle(0, 0, 90, 90)];
        this._gridCost = [[new Rectangle(0, 0, 10, 10), 50], [new Rectangle(80, 0, 10, 10), 50], [new Rectangle(0, 80, 10, 10), 50], [new Rectangle(80, 80, 10, 10), 50]];
        this._spoutPoint = new Point(0, 0);
        this._spoutHeight = 40;
        this._monsters = new Dictionary(true);
        this._monstersDispatched = {};
        this._targetCreeps = [];
        this._targetFlyers = [];
        this.SetProps();
    }

    public FindTargets(param1: int, param2: int = 1): void {
        let _loc3_: any = null;
        let _loc4_: MonsterBase = null;
        let _loc5_: string = null;
        let _loc6_: number = NaN;
        let _loc7_: Point = null;
        let _loc8_: int = 0;
        let _loc9_: any[] = null;
        let _loc10_: int = 0;
        if (this._lvl.Get() > 0 && this.health > 0) {
            _loc9_ = Targeting.getCreepsInRange(Number(GLOBAL._buildingProps[21].stats[this._lvl.Get() - 1].range), this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(0));
            this._hasTargets = false;
            if (_loc9_.length > 0) {
                this._targetCreeps = [];
                if (param2 == 1) {
                    as3.sortOn(_loc9_, ["dist"], Array.NUMERIC);
                } else if (param2 == 2) {
                    as3.sortOn(_loc9_, ["dist"], Array.NUMERIC | Array.DESCENDING);
                } else if (param2 == 3) {
                    as3.sortOn(_loc9_, ["hp"], Array.NUMERIC | Array.DESCENDING);
                } else if (param2 == 4) {
                    as3.sortOn(_loc9_, ["hp"], Array.NUMERIC);
                }
                _loc8_ = 0;
                for (_loc5_ in _loc9_) {
                    _loc8_++;
                    if (_loc8_ <= param1 && _loc9_[_loc5_].creep._behaviour != "retreat") {
                        _loc3_ = _loc9_[_loc5_];
                        _loc4_ = as3.cast(_loc3_.creep, MonsterBase);
                        _loc6_ = Number(_loc3_.dist);
                        _loc7_ = as3.cast(_loc3_.pos, Point);
                        this._targetCreeps.push({ "creep": _loc4_, "dist": _loc6_, "position": _loc7_ });
                        this._hasTargets = true;
                    }
                }
            }
            if (Boolean(this._monsters.get("C12")) && Boolean(GLOBAL.player.m_upgrades["C12"].powerup) || Boolean(this._monsters.get("C5")) && Boolean(GLOBAL.player.m_upgrades["C5"].powerup) || Boolean(this._monsters.get("IC5")) || Boolean(this._monsters.get("IC7"))) {
                if ((_loc9_ = Targeting.getCreepsInRange(Number(GLOBAL._buildingProps[21].stats[this._lvl.Get() - 1].range), this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(2))).length > 0) {
                    this._targetFlyers = [];
                    if (param2 == 1) {
                        as3.sortOn(_loc9_, ["dist"], Array.NUMERIC);
                    } else if (param2 == 2) {
                        as3.sortOn(_loc9_, ["dist"], Array.NUMERIC | Array.DESCENDING);
                    } else if (param2 == 3) {
                        as3.sortOn(_loc9_, ["hp"], Array.NUMERIC | Array.DESCENDING);
                    } else if (param2 == 4) {
                        as3.sortOn(_loc9_, ["hp"], Array.NUMERIC);
                    }
                    _loc8_ = 0;
                    for (_loc5_ in _loc9_) {
                        _loc8_++;
                        if (_loc8_ <= param1 && _loc9_[_loc5_].creep._behaviour != "retreat") {
                            _loc3_ = _loc9_[_loc5_];
                            _loc4_ = as3.cast(_loc3_.creep, MonsterBase);
                            _loc6_ = Number(_loc3_.dist);
                            _loc7_ = as3.cast(_loc3_.pos, Point);
                            this._targetFlyers.push({ "creep": _loc4_, "dist": _loc6_, "position": _loc7_ });
                            this._hasTargets = true;
                        }
                    }
                }
            } else {
                this._targetFlyers = [];
            }
            return;
        }
        this._targetCreeps = [];
        this._targetFlyers = [];
        this._hasTargets = false;
    }

    public GetTarget(param1: int = 0): any {
        let _loc2_: int = 0;
        if (this._hasTargets) {
            if (param1 > 0 && this._targetFlyers.length > 0) {
                _loc2_ = (Math.random() * this._targetFlyers.length) | 0;
                if (_loc2_ > this._targetFlyers.length) {
                    _loc2_ = 2;
                }
                return this._targetFlyers[_loc2_].creep;
            }
            if (this._targetCreeps.length > 0) {
                _loc2_ = (Math.random() * this._targetCreeps.length) | 0;
                if (_loc2_ > this._targetCreeps.length) {
                    _loc2_ = 2;
                }
                return this._targetCreeps[_loc2_].creep;
            }
            return null;
        }
        return null;
    }

    private numMonsters(param1: string): int {
        if (this._monsters.get(param1)) {
            return MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard ? this._monsters.get(param1).length | 0 : this._monsters.get(param1) | 0;
        }
        return 0;
    }

    public EjectCreeps(param1: Point): void {
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: any = undefined;
        let _loc2_: string = null;
        for (const $value of (this._monsters?.keys() ?? [])) {
            _loc3_ = as3.str($value);
            if (this._monsters.get(_loc3_) && this._monstersDispatched[_loc3_] < this.numMonsters(_loc3_) && this._animTick >= 15) {
                _loc2_ = _loc3_;
                if (_loc2_) {
                    _loc4_ = param1.x - this._position.x;
                    _loc5_ = param1.y - this._position.y;
                    _loc6_ = this._footprint[0].width | 0;
                    _loc7_ = this._footprint[0].height | 0;
                    if (_loc5_ <= 0) {
                        _loc5_ = _loc7_ / 4;
                        if (_loc4_ <= 0) {
                            _loc4_ = _loc6_ / -3;
                        } else {
                            _loc4_ = _loc6_ / 2;
                        }
                    } else {
                        _loc5_ = _loc7_ / 2;
                        if (_loc4_ <= 0) {
                            _loc4_ = _loc6_ / -4;
                        } else {
                            _loc4_ = _loc6_ / 2;
                        }
                    }
                    _loc8_ = CREATURES.Spawn(_loc2_, MAP._BUILDINGTOPS, "decoy", this._position.add(new Point(_loc4_, _loc5_)), Math.random() * 360, null, null, 0, this.ioTakeHealth(_loc2_));
                    if (_loc8_) {
                        _loc8_._homeBunker = this;
                        let dispatchedCount: int = this._monstersDispatched[_loc2_] | 0;
                        this._monstersDispatched[_loc2_] = ++dispatchedCount;
                        ++this._monstersDispatchedTotal;
                    }
                }
            }
        }
    }

    private DecoyInRange(): boolean {
        let _loc1_: Decoy = null;
        let _loc2_: Point = null;
        if (Boolean(SiegeWeapons.activeWeapon) && SiegeWeapons.activeWeaponID == Decoy.ID) {
            _loc1_ = as3.as(SiegeWeapons.activeWeapon, Decoy);
            if (_loc1_) {
                _loc2_ = new Point(_loc1_.x, _loc1_.y);
                if (GLOBAL.QuickDistance(_loc2_, this._position) < _loc1_.range) {
                    return true;
                }
            }
        }
        return false;
    }

    private getNumReleasableCreeps(param1: string): int {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
            return this._monsters.get(param1) | 0;
        }
        _loc2_ = this.numMonsters(param1);
        _loc3_ = CREATURES.GetProperty(param1, "health", 0, true) | 0;
        _loc4_ = (_loc2_ - 1) | 0;
        while (_loc4_ >= 0) {
            if (Boolean(this._monsters.get(param1)[_loc4_].self) || Boolean(this._monsters.get(param1)[_loc4_].queued) || this._monsters.get(param1)[_loc4_].health < _loc3_ * BUILDING22.kPercentAllowed) {
                _loc2_--;
            }
            _loc4_--;
        }
        return _loc2_;
    }

    private ioTakeHealth(param1: string): int {
        let waiting: any[] = as3.as(this._ioHealth[param1], Array);
        if (GLOBAL.INFERNO_ONLY && waiting && waiting.length > 0) {
            return waiting.shift() | 0;
        }
        return int.MAX_VALUE;
    }

    public ioStoreHealth(param1: string, param2: number, param3: number): void {
        if (param2 > 0 && param2 < param3) {
            if (!(as3.is(this._ioHealth[param1], Array))) {
                this._ioHealth[param1] = [];
            }
            (as3.as(this._ioHealth[param1], Array)).push(Math.ceil(param2));
        }
    }

    private ioExportHealth(param1: any): void {
        let id: string = null;
        let creep: any = undefined;
        let wounded: any[] = null;
        let out: any = {};
        let any: boolean = false;
        if (!param1.m) {
            return;
        }
        for (id in param1.m) {
            wounded = as3.is(this._ioHealth[id], Array) ? (as3.as(this._ioHealth[id], Array)).concat() : [];
            for (creep of as3.values(CREATURES._creatures)) {
                if (creep && creep._homeBunker == this && creep._creatureID == id && creep.health > 0 && creep.health < creep.maxHealth) {
                    wounded.push(Math.ceil(Number(creep.health)));
                }
            }
            if (wounded.length > (param1.m[id] | 0)) {
                wounded.length = (param1.m[id] | 0) >>> 0;
            }
            if (wounded.length > 0) {
                out[id] = wounded;
                any = true;
            }
        }
        if (any) {
            param1.mh = out;
        }
    }

    private getNextCreepToRelease(param1: string): CreepInfo {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
            return null;
        }
        _loc2_ = this._monsters.get(param1).length | 0;
        _loc3_ = CREATURES.GetProperty(param1, "health", 0, true) | 0;
        _loc4_ = 0;
        while (_loc4_ < _loc2_) {
            if (!this._monsters.get(param1)[_loc4_].self && !this._monsters.get(param1)[_loc4_].queued && this._monsters.get(param1)[_loc4_].health > _loc3_ * BUILDING22.kPercentAllowed) {
                return as3.cast(this._monsters.get(param1)[_loc4_], CreepInfo);
            }
            _loc4_++;
        }
        return null;
    }

    public override TickAttack(): void {
        let _loc2_: CreepInfo = null;
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: MonsterBase = null;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: MonsterBase = null;
        let _loc12_: any[] = null;
        let _loc13_: string = null;
        let _loc14_: boolean = false;
        let _loc1_: boolean = false;
        super.TickAttack();
        if (this.health > 0) {
            this._capacity = GLOBAL._buildingProps[21].capacity[this._lvl.Get() - 1] | 0;
        }
        this._used = 0;
        for (const $value of (this._monsters?.keys() ?? [])) {
            _loc3_ = as3.str($value);
            this._used = (this._used + CREATURES.GetProperty(_loc3_, "cStorage", 0, true) * this.numMonsters(_loc3_)) | 0;
            if (!this._monstersDispatched[_loc3_]) {
                this._monstersDispatched[_loc3_] = 0;
            }
        }
        this.Cull();
        _loc4_ = 0;
        while (_loc4_ < this._targetCreeps.length) {
            if (this._targetCreeps[_loc4_].creep.health <= 0) {
                _loc1_ = true;
            }
            _loc4_++;
        }
        _loc4_ = 0;
        while (_loc4_ < this._targetFlyers.length) {
            if (this._targetFlyers[_loc4_].creep.health <= 0) {
                _loc1_ = true;
            }
            _loc4_++;
        }
        if (_loc1_) {
            this._targetCreeps = [];
            this._targetFlyers = [];
            this._hasTargets = false;
        }
        if (this._countdownUpgrade.Get() == 0 && ((!this._hasTargets || _loc1_) && this._frameNumber % 10 == 0 || this._frameNumber % 60 == 0)) {
            this.FindTargets(3);
        }
        ++this._tickNumber;
        if ((this._targetFlyers.length > 0 || this._targetCreeps.length > 0) && (this._animTick >= 15 || GLOBAL._catchup) && this._tickNumber % 30 == 0) {
            _loc5_ = null;
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            as3.sortOn(this._targetFlyers, ["dist"], Array.NUMERIC);
            if (this._targetFlyers.length > 0 && this.getNumReleasableCreeps("C12") > 0 && (this._monstersDispatched["C12"] < this.numMonsters("C12") && GLOBAL.player.m_upgrades["C12"].powerup)) {
                _loc5_ = "C12";
            } else if (this._targetFlyers.length > 0 && this.getNumReleasableCreeps("C5") > 0 && this._monstersDispatched["C5"] < this.numMonsters("C5") && Boolean(GLOBAL.player.m_upgrades["C5"].powerup)) {
                _loc5_ = "C5";
            } else if (this._targetFlyers.length > 0 && this.getNumReleasableCreeps("IC5") > 0 && this._monstersDispatched["IC5"] < this.numMonsters("IC5")) {
                _loc5_ = "IC5";
            } else if (this._targetFlyers.length > 0 && this.getNumReleasableCreeps("IC7") > 0 && this._monstersDispatched["IC7"] < this.numMonsters("IC7")) {
                _loc5_ = "IC7";
            } else if (this._targetCreeps.length > 0) {
                for (const $value of (this._monsters?.keys() ?? [])) {
                    _loc3_ = as3.str($value);
                    if (this._monsters.get(_loc3_) && this.getNumReleasableCreeps(_loc3_) > 0 && this._monstersDispatched[_loc3_] < this.numMonsters(_loc3_)) {
                        _loc5_ = _loc3_;
                    }
                }
            }
            if (_loc5_) {
                if (!this._logged) {
                    _loc12_ = [];
                    for (const $value of (this._monsters?.keys() ?? [])) {
                        _loc3_ = as3.str($value);
                        if (this._monsters.get(_loc3_) > 0) {
                            _loc14_ = false;
                            _loc13_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc3_].name));
                            _loc12_.push([this.numMonsters(_loc3_), _loc13_]);
                        }
                    }
                    this._logged = true;
                    ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attacklog_unleashed", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)), "v3": GLOBAL.Array2String(_loc12_) }) + "</font>");
                }
                if (this._targetFlyers.length > 0 && (_loc5_ == "C12" || _loc5_ == "C5" || _loc5_ == "IC5" || _loc5_ == "IC7")) {
                    _loc6_ = as3.cast(this._targetFlyers[(Math.random() * this._targetFlyers.length) | 0].creep, MonsterBase);
                } else {
                    _loc6_ = as3.cast(this._targetCreeps[(Math.random() * this._targetCreeps.length) | 0].creep, MonsterBase);
                }
                _loc7_ = _loc6_._tmpPoint.x - this._position.x;
                _loc8_ = _loc6_._tmpPoint.y - this._position.y;
                _loc9_ = this._footprint[0].width | 0;
                _loc10_ = this._footprint[0].height | 0;
                if (_loc8_ <= 0) {
                    _loc8_ = _loc10_ / 4;
                    if (_loc7_ <= 0) {
                        _loc7_ = _loc9_ / -3;
                    } else {
                        _loc7_ = _loc9_ / 2;
                    }
                } else {
                    _loc8_ = _loc10_ / 2;
                    if (_loc7_ <= 0) {
                        _loc7_ = _loc9_ / -4;
                    } else {
                        _loc7_ = _loc9_ / 2;
                    }
                }
                _loc2_ = this.getNextCreepToRelease(_loc5_);
                _loc11_ = CREATURES.Spawn(_loc5_, MAP._BUILDINGTOPS, "defend", this._position.add(new Point(_loc7_, _loc8_)), Math.random() * 360, null, null, 0, !(!_loc2_) ? _loc2_.health | 0 : this.ioTakeHealth(_loc5_));
                if (_loc11_) {
                    _loc11_._targetCreep = _loc6_;
                    _loc11_._homeBunker = this;
                    _loc11_._hasTarget = true;
                    if (_loc2_) {
                        _loc2_.self = _loc11_;
                    }
                    if (_loc11_._pathing == "direct") {
                        _loc11_._phase = 1;
                    }
                    _loc11_.WaypointTo(_loc11_._targetCreep._tmpPoint);
                    _loc11_._targetPosition = _loc11_._targetCreep._tmpPoint;
                    this._monstersDispatched[_loc5_] = (this._monstersDispatched[_loc5_] | 0) + 1;
                    ++this._monstersDispatchedTotal;
                }
            }
        }
    }

    public override TickFast(param1: Event = null): void {
        ++this._frameNumber;
        if (!GLOBAL._catchup) {
            if (this._used > 0 && (this._targetCreeps.length > 0 || this._targetFlyers.length > 0 || this._monstersDispatchedTotal > 0 || this.DecoyInRange())) {
                if (this._animTick == 1) {
                    SOUNDS.Play("bunkerdoor");
                }
                if (this._animTick < 15) {
                    this._animTick += 1;
                    this.AnimFrame(false);
                }
            } else {
                if (this._animTick == 15) {
                    SOUNDS.Play("bunkerdoor");
                }
                if (this._animTick > 0) {
                    --this._animTick;
                    this.AnimFrame(false);
                }
            }
        }
    }

    public override Description(): void {
        super.Description();
        this._upgradeDescription = KEYS.Get("bunker_upgrade_desc");
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-wmb", KEYS.Get("pop_bunkerbuilt_streamtitle"), KEYS.Get("pop_bunkerbuilt_streambody"), "build-monsterbunker.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_bunkerbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_bunkerbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
        if (this._lvl.Get() > 0) {
            this._capacity = GLOBAL._buildingProps[21].capacity[this._lvl.Get() - 1] | 0;
            this._range = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].range | 0;
        }
    }

    public override Destroyed(param1: boolean = true): void {
        let _loc2_: string = null;
        let _loc3_: int = 0;
        for (const $value of (this._monsters?.keys() ?? [])) {
            _loc2_ = as3.str($value);
            if (MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard) {
                _loc3_ = 0;
                while (_loc3_ < this._monsters.get(_loc2_).length) {
                    this._monsters.get(_loc2_)[_loc3_].health *= 0.5;
                    _loc3_++;
                }
            } else {
                this._monsters.set(_loc2_, this._monstersDispatched[_loc2_]);
                if (this._monsters.get(_loc2_) == 0) {
                    this._monsters.delete(_loc2_);
                }
            }
        }
        super.Destroyed();
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-wmb-" + this._lvl.Get(), KEYS.Get("pop_bunkerupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_bunkerupgraded_streambody"), "build-monsterbunker.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_bunkerupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_bunkerupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
        if (this._lvl.Get() > 0) {
            this._capacity = GLOBAL._buildingProps[21].capacity[this._lvl.Get() - 1] | 0;
            this._range = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].range | 0;
        }
    }

    public override Recycle(): void {
        let _loc1_: string = null;
        this._blockRecycle = false;
        if (MapRoomManager.instance.isInMapRoom3 && !BASE.isMainYardOrInfernoMainYard) {
            for (const $value of (this._monsters?.keys() ?? [])) {
                _loc1_ = as3.str($value);
                if (this._monsters.get(_loc1_).length) {
                    this._blockRecycle = true;
                    break;
                }
            }
        }
        super.Recycle();
    }

    public override RecycleC(): void {
        super.RecycleC();
        this._capacity = 0;
        this.Cull();
    }

    public Cull(): void {
        let _loc3_: string = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc1_: boolean = false;
        let _loc2_: int = (this._monstersDispatchedTotal + 1) | 0;
        while (this._used > this._capacity) {
            for (const $value of (this._monsters?.keys() ?? [])) {
                _loc4_ = as3.str($value);
                if (this.numMonsters(_loc4_)) {
                    this._monsters.set(_loc4_, (this._monsters.get(_loc4_) | 0) - 1);
                    this._used = (this._used - CREATURELOCKER._creatures[_loc4_].props.cStorage) | 0;
                    _loc1_ = true;
                } else {
                    this._monsters.set(_loc4_, 0);
                    this._monsters.delete(_loc4_);
                    _loc1_ = true;
                }
            }
            _loc2_ = 0;
            for (const $value of (this._monsters?.values() ?? [])) {
                _loc5_ = $value | 0;
                _loc2_ += _loc5_;
            }
        }
        for (const $value of (this._monsters?.keys() ?? [])) {
            _loc3_ = as3.str($value);
            if (Boolean(this._monsters.get(_loc3_)) && this._monsters.get(_loc3_) == 0) {
                this._monsters.delete(_loc3_);
                _loc1_ = true;
            }
        }
        if (_loc1_) {
            BASE.Save();
        }
    }

    public RemoveCreature(param1: string): void {
        let count: int = this._monsters.get(param1) | 0;
        --count;
        if (count < 0) {
            count = 0;
        }
        this._monsters.set(param1, count);
        let dispatchedCount: int = this._monstersDispatched[param1] | 0;
        --dispatchedCount;
        if (dispatchedCount < 0) {
            dispatchedCount = 0;
        }
        this._monstersDispatched[param1] = dispatchedCount;
        --this._monstersDispatchedTotal;
        if (this._monstersDispatchedTotal < 0) {
            this._monstersDispatchedTotal = 0;
        }
    }

    public override Over(param1: MouseEvent): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._lvl.Get() > 0 && this._countdownBuild.Get() == 0 && this._countdownFortify.Get() == 0 && this._countdownUpgrade.Get() == 0 && this.health > 0) {
            TweenLite.delayedCall(0.25, as3.bind(this, this.RangeIndicator));
        }
    }

    private RangeIndicator(): void {
        // Inferno-only: the yard may have gone in the quarter second since the mouse came over (report #61:
        // into an attack, with no footprint layer)
        if (GLOBAL.INFERNO_ONLY && (!MAP._BUILDINGFOOTPRINTS || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD)) {
            return;
        }
        let _loc1_: uint = 16777215;
        this._radiusGraphic = new Shape();
        this._radiusGraphic.graphics.beginFill(16777215, 0.1);
        this._radiusGraphic.graphics.lineStyle(1, _loc1_, 0.25);
        let _loc2_: Sprite = new Sprite();
        let _loc3_: Point = this._position.add(new Point(0, this._footprint[0].height * 0.25));
        let _loc4_: Point = new Point(this._range * 2.8, this._range * 1.2);
        this._radiusGraphic.graphics.drawEllipse(0, 0, _loc4_.x, _loc4_.y);
        this._radiusGraphic.x = -(_loc4_.x * 0.5);
        this._radiusGraphic.y = -(_loc4_.y * 0.5);
        _loc2_.addChild(this._radiusGraphic);
        _loc2_.x = _loc3_.x;
        _loc2_.y = _loc3_.y;
        MAP._BUILDINGFOOTPRINTS.addChild(_loc2_);
        TweenLite.from(_loc2_, 0.25, { "alpha": 0.5, "scaleX": 0.25, "scaleY": 0, "delay": 0, "ease": Expo.easeOut });
        TweenLite.killDelayedCallsTo(as3.bind(this, this.RangeIndicator));
    }

    public override Out(param1: MouseEvent): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && Boolean(this._radiusGraphic)) {
            if (this._radiusGraphic.parent) {
                this._radiusGraphic.parent.removeChild(this._radiusGraphic);
            }
            this._radiusGraphic = null;
        }
        TweenLite.killDelayedCallsTo(as3.bind(this, this.RangeIndicator));
    }

    private linkMonstersToData(param1: any): void {
        let _loc3_: Vector<CreepInfo> = null;
        if (!this._monsters) {
            this._monsters = new Dictionary(true);
        }
        let _loc2_: int = GLOBAL.player.monsterList.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_) {
            _loc3_ = as3.vget(GLOBAL.player.monsterList, _loc4_).getOwnedCreeps(this._id);
            if (_loc3_.length) {
                this._monsters.set(as3.vget(GLOBAL.player.monsterList, _loc4_).m_creatureID, _loc3_);
                this._monstersDispatched[as3.vget(GLOBAL.player.monsterList, _loc4_).m_creatureID] = 0;
            }
            _loc4_++;
        }
    }

    public override Setup(param1: any): void {
        let _loc2_: string = null;
        super.Setup(param1);
        if (MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard) {
            this.linkMonstersToData(param1);
        } else {
            for (_loc2_ in param1.m) {
                this._monsters.set(_loc2_, param1.m[_loc2_]);
                this._monstersDispatched[_loc2_] = 0;
            }
            // Inferno-only: wounds carried over from earlier attacks ("mh", written by Export below).
            // Not when the owner is home: the survivors are healed then, and the next save drops "mh".
            this._ioHealth = {};
            if (GLOBAL.INFERNO_ONLY && param1.mh && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                for (_loc2_ in param1.mh) {
                    if (as3.is(param1.mh[_loc2_], Array)) {
                        this._ioHealth[_loc2_] = (as3.as(param1.mh[_loc2_], Array)).concat();
                    }
                }
            }
        }
        if (this._lvl.Get() > 0) {
            this._capacity = GLOBAL._buildingProps[21].capacity[this._lvl.Get() - 1] | 0;
            this._range = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].range | 0;
        }
    }

    public override Export(): any {
        let _loc3_: string = null;
        let _loc1_: any = super.Export();
        let _loc2_: int = 0;
        if (Boolean(this._monsters) && this.health > 0) {
            for (const $value of (this._monsters?.keys() ?? [])) {
                _loc3_ = as3.str($value);
                _loc2_ = 0;
                if (as3.is(this._monsters.get(_loc3_), Number)) {
                    _loc2_ = this._monsters.get(_loc3_) | 0;
                } else if (this._monsters.get(_loc3_).length > 0) {
                    _loc2_ = this._monsters.get(_loc3_).length | 0;
                }
                if (_loc1_.m) {
                    _loc1_.m[_loc3_.valueOf()] = _loc2_;
                } else {
                    _loc1_.m = {};
                    _loc1_.m[_loc3_.valueOf()] = _loc2_;
                }
            }
        }
        if (GLOBAL.INFERNO_ONLY && GLOBAL.isInAttackMode) {
            this.ioExportHealth(_loc1_);
        }
        return _loc1_;
    }
}
