import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BYMConfig, CREEPS, Expo, GLOBAL, GRID, IAttackable, IMapRoomCell, IoHfoArt, Jars, KEYS, MAP, MapRoomManager, MonsterBase, PATHING, POPUPS, SOUNDS, SPRITES, SecNum, SiegeWeapons, SpriteData, SpriteSheetAnimation, Targeting, TweenLite, Vacuum, VacuumHose, popup_building } from "@game";

export class BTOWER extends BFOUNDATION {
    static {
        as3.fields(this, { creeps: null, maxDist: 0, minDist: 0, _frameNumber: 0, _hasTargets: false, _targetCreeps: null, _priority: 0, _retarget: 0, _top: 0, _fireTick: 0, _target: null, pointA: null, pointB: null, _radiusGraphic: null, _jarAnimation: null, _jarHealth: null, _ioJarMs: 0, _ioJarLanded: 0, _ioJarStage: 0, _ioJarX: 0, _targetVacuum: false, _maxTargets: 1, _ioIceHold: 0, _ioIceArt: null });
    }

    private static _targetFlyerMode: any = { "20": 0, "21": 1, "23": 0, "25": 1, "115": 2, "118": 0, "129": 0, "130": 0, "132": 1, "144": 1, "145": 1 };

    /** A timed jar's health: out of reach of any tower's shots, and put back every tick. */
    private static readonly IO_JAR_HEALTH: int = 1000000000;
    private creeps: any[];
    private maxDist: int;
    private minDist: int;
    public _frameNumber: int;
    public _hasTargets: boolean;
    public _targetCreeps: any[];
    public _priority: int;
    public _retarget: int;
    public _top: int;
    public _fireTick: int;
    public _target: IAttackable;
    private pointA: Point;
    private pointB: Point;
    private _radiusGraphic: Shape;
    protected _jarAnimation: SpriteSheetAnimation;
    public _jarHealth: SecNum;
    /**
     * Inferno-only Candy Jars: the jar holds for this long (ms from landing) and the tower's shots at the
     * glass do nothing; 0 = the stock jar, which holds until the tower has shot its way out.
     */
    private _ioJarMs: number;
    private _ioJarLanded: int;
    /** 0 whole, 1 cracked, 2 badly cracked (the jar sprite's first three frames). */
    private _ioJarStage: int;
    private _ioJarX: number;
    public _targetVacuum: boolean;
    protected _maxTargets: int;
    // ---- Hell Freezes Over: iced over by an ice monster's hit (IoIce). The tower waits one reload more before
    // it acts again, and the ice breaks when that wait is over (the shatter plays). Hits while it is iced
    // do nothing more. The waiting is done by the loops that tick the towers (BASE, GLOBAL: ioIceTick).
    private _ioIceHold: int;
    private _ioIceArt: any;

    public $ctor(): void {
        super.$ctor();
        this._priority = 1;
        this._retarget = 0;
        this.attackFlags = Targeting.getOldStyleTargets(0);
    }

    public static AdjustTowerRange(param1: IMapRoomCell, param2: int): int {
        if (MapRoomManager.instance.isInMapRoom2 && BASE.isOutpostMapRoom2Only && param1 && param1.cellHeight && param1.cellHeight >= 100) {
            return (param1.cellHeight * param2 / GLOBAL._averageAltitude.Get()) | 0;
        }
        return param2;
    }

    public static GetRandomString(param1: Vector<string>): string {
        return as3.vget(param1, Math.floor(Math.random() * param1.length));
    }

    public Props(): void {
        let _loc1_: int = 0;
        if (this._lvl.Get() > 0) {
            if (MapRoomManager.instance.isInMapRoom2 && (BASE.isOutpostMapRoom2Only || GLOBAL.mode == "wmattack")) {
                _loc1_ = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].range | 0;
                this._range = _loc1_;
                if (GLOBAL._currentCell) {
                    this._range = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc1_);
                }
            } else {
                this._range = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].range | 0;
            }
            this.damageProperty.value = Number(GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].damage);
            this._rate = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].rate | 0;
            this._splash = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].splash | 0;
            this._speed = GLOBAL._buildingProps[this._type - 1].stats[this._lvl.Get() - 1].speed | 0;
        } else if (this._lvl.Get() > GLOBAL._buildingProps[this._type - 1].stats.length) {
            throw new Error("ILLEGAL TOWER LEVEL Type: " + this._type + " Level: " + this._lvl.Get());
        }
        this._fireTick = this._rate;
    }

    public override Place(param1: MouseEvent = null): void {
        ++GLOBAL._bTowerCount;
        GLOBAL._bTower = this;
        super.Place(param1);
    }

    public override Description(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        this._specialDescription = KEYS.Get("bdg_tower_desc");
        super.Description();
        this._upgradeDescription = "";
        if (this._lvl.Get() > 0 && this._lvl.Get() < this._buildingProps.costs.length) {
            _loc1_ = this._buildingProps.stats[this._lvl.Get() - 1];
            _loc2_ = this._buildingProps.stats[this._lvl.Get()];
            _loc3_ = _loc1_.range | 0;
            _loc4_ = _loc2_.range | 0;
            if (BASE.isOutpost) {
                _loc3_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc3_);
                _loc4_ = BTOWER.AdjustTowerRange(GLOBAL._currentCell, _loc4_);
            }
            if (_loc1_.range < _loc2_.range) {
                this._upgradeDescription += KEYS.Get("bdg_tower_rangeupgrade", { "v1": _loc3_, "v2": _loc4_ }) + "<br>";
            }
            if (_loc1_.damage * (40 / _loc1_.rate) < _loc2_.damage * (40 / _loc2_.rate)) {
                this._upgradeDescription += KEYS.Get("bdg_tower_damageupgrade", { "v1": (_loc1_.damage * (40 / _loc1_.rate)) | 0, "v2": (_loc2_.damage * (40 / _loc2_.rate)) | 0 }) + "<br>";
            }
            if (_loc1_.splash < _loc2_.splash) {
                this._upgradeDescription += KEYS.Get("bdg_tower_explosionupgrade", { "v1": _loc1_.splash, "v2": _loc2_.splash }) + "<br>";
            }
        }
    }

    public get canAttack(): boolean {
        return this.health > 0 && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() == 0;
    }

    protected canShootVacuumHose(): boolean {
        let _loc1_: VacuumHose = Vacuum.getHose();
        if (_loc1_ && GLOBAL.QuickDistance(new Point(_loc1_.x, _loc1_.y), this._position) <= this._range && Boolean(BTOWER._targetFlyerMode[this._type])) {
            return true;
        }
        return false;
    }

    public override TickAttack(): void {
        let _loc1_: VacuumHose = null;
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        let _loc4_: MonsterBase = null;
        if (this.canAttack) {
            --this._fireTick;
            if (this._fireTick <= 0) {
                this._fireTick = (this._fireTick + this._rate * 2) | 0;
                _loc1_ = Vacuum.getHose();
                if (!this._targetVacuum && (!this._hasTargets || !this.targetInRange())) {
                    if (this.canShootVacuumHose()) {
                        this._targetVacuum = true;
                        this._fireTick = 30;
                    } else {
                        this._targetVacuum = false;
                        this.FindTargets(this._maxTargets, this._priority);
                        this._fireTick = 30;
                        if (CREEPS._creepCount > 150) {
                            this._fireTick = (this._fireTick + CREEPS._creepCount / 15) | 0;
                        }
                    }
                } else {
                    _loc2_ = false;
                    if (this._targetVacuum) {
                        if (_loc1_) {
                            this.Fire(_loc1_);
                        } else {
                            this._targetVacuum = false;
                        }
                    } else {
                        _loc3_ = 0;
                        while (_loc3_ < this._targetCreeps.length) {
                            if ((_loc4_ = as3.cast(this._targetCreeps[_loc3_].creep, MonsterBase)).health > 0 && _loc4_.isTargetable && !_loc4_.invisible) {
                                this.Fire(as3.cast(this._targetCreeps[_loc3_].creep, IAttackable));
                            } else {
                                _loc2_ = true;
                                this._targetCreeps = [];
                            }
                            _loc3_++;
                        }
                    }
                    if (Boolean(this._retarget) || _loc2_) {
                        this.FindTargets(this._maxTargets, this._priority);
                        this._fireTick = 30;
                        if (CREEPS._creepCount > 150) {
                            this._fireTick = (this._fireTick + CREEPS._creepCount / 15) | 0;
                        }
                        this._retarget = 0;
                    }
                }
            }
        }
        if (this._jarAnimation) {
            this.TickJar();
        }
    }

    public targetInRange(): boolean {
        let _loc1_: Point = null;
        let _loc3_: number = NaN;
        let _loc2_: Point = GRID.FromISO(this._mc.x, this._mc.y);
        _loc2_.add(new Point(this._footprint[0].width * 0.5, this._footprint[0].height * 0.5));
        let _loc4_: int = 0;
        while (_loc4_ < this._targetCreeps.length) {
            _loc1_ = GRID.FromISO(Number(this._targetCreeps[_loc4_].creep._tmpPoint.x), Number(this._targetCreeps[_loc4_].creep._tmpPoint.y));
            _loc3_ = GLOBAL.QuickDistanceSquared(_loc2_, _loc1_);
            if (_loc3_ < this._range * this._range) {
                return true;
            }
            _loc4_++;
        }
        return false;
    }

    public get isJard(): boolean {
        return Boolean(this._jarHealth);
    }

    public ApplyJar(param1: int, ioSeconds: number = 0): void {
        this._ioJarMs = Math.max(0, ioSeconds) * 1000;
        this._ioJarStage = 0;
        ++this.targetableStatus;
        this._jarAnimation = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Jars.JAR_GRAPHIC), SpriteData), Jars.JAR_GRAPHIC_FRAMES);
        this._jarAnimation.render();
        this._jarAnimation.x += -(this._jarAnimation.width * 0.5) + this._middle * 0.5;
        this._jarAnimation.y += -(this._jarAnimation.height * 0.5);
        this.addChild(this._jarAnimation);
        if (BYMConfig.instance.RENDERER_ON) {
            TweenLite.from(this._jarAnimation, 1, { "y": this._jarAnimation.y - 300, "ease": Expo.easeIn, "onUpdate": as3.bind(this, this.updateRasterData), "onComplete": as3.bind(this, this.JarLanded) });
        } else {
            TweenLite.from(this._jarAnimation, 0.6, { "y": this._jarAnimation.y - 300, "ease": Expo.easeIn, "onComplete": as3.bind(this, this.JarLanded) });
        }
        SOUNDS.Play(BTOWER.GetRandomString(Jars.LAND_SOUNDS));
    }

    private JarLanded(): void {
        if (this._ioJarMs > 0) {
            this._jarHealth = new SecNum(BTOWER.IO_JAR_HEALTH);
            this._ioJarLanded = getTimer();
            if (this._jarAnimation) {
                this._ioJarX = this._jarAnimation.x;
            }
            return;
        }
        this._jarHealth = new SecNum(as3.cast(SiegeWeapons.getWeapon(Jars.ID), Jars).durability);
    }

    /**
     * Inferno-only: a timed jar cracks as its time runs out (half left, then a quarter left), shakes in its
     * last two seconds, and breaks when the time is up.
     */
    private ioTickTimedJar(): void {
        let left: number = 1 - (getTimer() - this._ioJarLanded) / this._ioJarMs;
        let stage: int = left <= 0.25 ? 2 : (left <= 0.5 ? 1 : 0);
        if (left <= 0) {
            this._jarAnimation.x = this._ioJarX;
            this.KillJar();
            return;
        }
        if (this._jarHealth.Get() < BTOWER.IO_JAR_HEALTH / 2) {
            this._jarHealth.Set(BTOWER.IO_JAR_HEALTH);
        }
        if (stage != this._ioJarStage) {
            this._ioJarStage = stage;
            this._jarAnimation.gotoAndStop(stage);
            this._jarAnimation.render();
            SOUNDS.Play(BTOWER.GetRandomString(Jars.CRACKING_SOUNDS));
        }
        if (left * this._ioJarMs < 2000) {
            this._jarAnimation.x = this._ioJarX + ((getTimer() >> 6) % 2 ? 1.5 : -1.5);
            this.updateRasterData();
        }
    }

    private UpdateJar(): void {
        if (this._ioJarMs > 0) {
            return;
        }
        let _loc1_: number = this._jarHealth.Get() / as3.cast(SiegeWeapons.getWeapon(Jars.ID), Jars).durability;
        if (_loc1_ < 0.3) {
            this._jarAnimation.gotoAndStop(2);
            SOUNDS.Play(BTOWER.GetRandomString(Jars.CRACKING_SOUNDS));
        } else if (_loc1_ < 0.6) {
            this._jarAnimation.gotoAndStop(1);
            SOUNDS.Play(BTOWER.GetRandomString(Jars.CRACKING_SOUNDS));
        } else {
            this._jarAnimation.gotoAndStop(0);
        }
        this._jarAnimation.render();
    }

    protected TickJar(): void {
        if (this._ioJarMs > 0 && Boolean(this._jarHealth)) {
            this.ioTickTimedJar();
        }
        if (Boolean(this._jarHealth) && this._jarHealth.Get() <= 0) {
            this.KillJar();
        }
        this._jarAnimation.update();
        if (this._jarAnimation.currentFrame >= this._jarAnimation.totalFrames) {
            this.RemoveJar();
        }
    }

    private RemoveJar(): void {
        this.removeChild(this._jarAnimation);
        this._jarAnimation = null;
        --this.targetableStatus;
    }

    public KillJar(): void {
        if (this._ioJarMs > 0 && this._jarHealth && this._jarAnimation) {
            this._jarAnimation.x = this._ioJarX;
        }
        this._jarHealth = null;
        if (this._jarAnimation) {
            this._jarAnimation.play();
            SOUNDS.Play(BTOWER.GetRandomString(Jars.EXPLODE_SOUNDS));
        }
    }

    public Fire(param1: IAttackable): void {
        if (this._jarHealth) {
            this.UpdateJar();
        }
        this._target = param1;
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        this.Props();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !(BASE.isInfernoBuilding(this._type >>> 0) || BASE.isInfernoMainYardOrOutpost)) {
            Brag = (param1: MouseEvent): void => {
                let _loc2_: string = "build-cannon.png";
                if (this._type == 21) {
                    _loc2_ = "build-sniper.png";
                }
                if (this._type == 25) {
                    _loc2_ = "build-lightning.png";
                }
                if (this._type == 23) {
                    _loc2_ = "build-laser.png";
                }
                if (this._type == 115) {
                    _loc2_ = "build-aerial.v2.png";
                }
                if (this._type == 118) {
                    _loc2_ = "build_railgun.png";
                }
                GLOBAL.CallJS("sendFeed", ["build-" + String(this._buildingProps.name).toLowerCase(), KEYS.Get("pop_tupgraded_streamtitle", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }), KEYS.Get("pop_tupgraded_streambody"), _loc2_]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_tupgraded_title", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": this._lvl.Get() }) + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_tupgraded_body", { "v1": KEYS.Get(as3.str(this._buildingProps.name)) });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Constructed(): void {
        super.Constructed();
        this.Props();
    }

    public FindTargets(param1: int, param2: int): void {
        let _loc3_: any = null;
        let _loc4_: MonsterBase = null;
        let _loc5_: string = null;
        let _loc6_: number = NaN;
        let _loc7_: Point = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        if (BTOWER._targetFlyerMode[this._type]) {
            _loc9_ = BTOWER._targetFlyerMode[this._type] | 0;
        }
        let _loc10_: int = Targeting.getOldStyleTargets(_loc9_);
        // A tower not on the ground (no position yet, or taken off the yard) has nothing in range: it
        // stopped the game here during an attack (bug report: "reading 'add'", Inferno Quake Tower).
        if (this._position == null || !this._footprint || this._footprint.length == 0) {
            this.creeps = [];
            this._hasTargets = false;
            return;
        }
        this.creeps = Targeting.getCreepsInRange(this._range, this._position.add(new Point(0, this._footprint[0].height / 2)), _loc10_);
        this._hasTargets = false;
        if (this.creeps.length > 0) {
            this._targetCreeps = [];
            if (param2 == 1) {
                as3.sortOn(this.creeps, ["dist"], Array.NUMERIC);
            } else if (param2 == 2) {
                as3.sortOn(this.creeps, ["dist"], Array.NUMERIC | Array.DESCENDING);
            } else if (param2 == 3) {
                as3.sortOn(this.creeps, ["hp"], Array.NUMERIC | Array.DESCENDING);
            } else if (param2 == 4) {
                as3.sortOn(this.creeps, ["hp"], Array.NUMERIC);
            }
            _loc8_ = 0;
            for (_loc5_ in this.creeps) {
                _loc8_++;
                if (_loc8_ <= param1) {
                    _loc3_ = this.creeps[_loc5_];
                    _loc4_ = as3.cast(_loc3_.creep, MonsterBase);
                    _loc6_ = Number(_loc3_.dist);
                    _loc7_ = as3.cast(_loc3_.pos, Point);
                    this._targetCreeps.push({ "creep": _loc4_, "dist": _loc6_, "position": _loc7_ });
                    this._hasTargets = true;
                }
            }
        }
    }

    public get ioIced(): boolean {
        return this._ioIceHold > 0;
    }

    public ioIceHit(): void {
        if (!GLOBAL.INFERNO_ONLY || this._ioIceHold > 0 || this.health <= 0 || !this.canAttack) {
            return;
        }
        this._ioIceHold = Math.max(20, this._rate * 2) | 0;
        this._ioIceArt = IoHfoArt.towerIceOn(this);
    }

    /** Each tower step: true while it is iced (it waits, and does nothing else). */
    public ioIceTick(): boolean {
        if (this._ioIceHold <= 0) {
            return false;
        }
        if (this.health <= 0) {
            this.ioIceBreak(false);
            return false;
        }
        if (--this._ioIceHold <= 0) {
            this.ioIceBreak(true);
            return false;
        }
        return true;
    }

    public ioIceBreak(param1: boolean): void {
        this._ioIceHold = 0;
        if (this._ioIceArt) {
            IoHfoArt.towerIceOff(this._ioIceArt, param1);
        }
        this._ioIceArt = null;
    }

    public override RecycleC(): void {
        GLOBAL._bTower = null;
        --GLOBAL._bTowerCount;
        this.ioIceBreak(false);
        super.RecycleC();
    }

    public override Cancel(): void {
        GLOBAL._bTower = null;
        --GLOBAL._bTowerCount;
        super.Cancel();
    }

    protected Rotate(): void {
        let _loc1_: Point = null;
        let _loc2_: Point = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: MonsterBase = null;
        let _loc7_: Point = null;
        let _loc8_: Point = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        if (this._targetVacuum) {
            _loc1_ = GLOBAL.townHall._position;
            _loc2_ = PATHING.FromISO(new Point(this._mc.x, this._mc.y));
            _loc2_ = _loc2_.add(new Point(35, 35));
            _loc3_ = (_loc1_.x - _loc2_.x) | 0;
            _loc4_ = (_loc1_.y - _loc2_.y) | 0;
            if ((_loc5_ = (Math.atan2(_loc4_, _loc3_) * 57.2957795) | 0) < 0) {
                _loc5_ = (360 + _loc5_) | 0;
            }
            _loc5_ = (_loc5_ / 11.25) | 0;
            this._animTick = _loc5_;
            this.AnimFrame();
            ++this._frameNumber;
        } else if (this._hasTargets) {
            _loc6_ = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            _loc7_ = PATHING.FromISO(_loc6_._tmpPoint);
            _loc8_ = (_loc8_ = PATHING.FromISO(new Point(this._mc.x, this._mc.y))).add(new Point(35, 35));
            _loc9_ = (_loc7_.x - _loc8_.x) | 0;
            _loc10_ = (_loc7_.y - _loc8_.y) | 0;
            if ((_loc11_ = (Math.atan2(_loc10_, _loc9_) * 57.2957795) | 0) < 0) {
                _loc11_ = (360 + _loc11_) | 0;
            }
            _loc11_ = (_loc11_ / 11.25) | 0;
            this._animTick = _loc11_;
            this.AnimFrame();
            ++this._frameNumber;
        }
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        ++GLOBAL._bTowerCount;
        GLOBAL._bTower = this;
        this.Props();
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

    public setTarget(param1: MonsterBase): void {
        this._target = param1;
    }
}
