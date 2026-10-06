import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, AdditionPropertyModifier, BASE, BFOUNDATION, BTOWER, BUILDING22, BYMConfig, Bounce, CModifiableProperty, CREATURELOCKER, CREATURES, Component, CreepSkinManager, Decoy, EFFECTS, GIBLETS, GLOBAL, GRID, HOUSING, HOUSINGBUNKER, IAttackable, IAttackingComponent, ITargetable, KEYS, LOGGER, MAP, MONSTERBUNKER, MapRoomManager, MonsterBase, PATHING, RasterData, SOUNDS, SPECIALEVENT, SPRITES, SiegeWeapon, SiegeWeapons, Sine, TUTORIAL, Targeting, TweenLite } from "@game";

export class CreepBase extends MonsterBase {
    static {
        as3.fields(this, { _lastFrame: -1, _defenderRemoved: false, DEFENSE_RANGE: 30, DEFENSE_RANGE_SQUARED: 900, DEFENSE_MODIFIER: 1, _healerGiveUpTimer: 800, m_bInfernoCreep: false, m_altitudeMax: 0, m_altitudeMin: 0, m_cellNode: null, m_cellX: 0, m_cellY: 0, _ioLastX: NaN, _ioLastY: NaN, _ioStillFor: 0 });
    }

    // Performance optimization: Point object pool to reduce GC pressure
    private static _pointPool: Vector<Point> = new Vector<Point>(0, false, Point);
    private static _poolSize: int = 0;
    private static readonly MAX_POOL_SIZE: int = 50;

    /**
     * Inferno-only: the new Inferno monsters don't run on the spot. While they fight (at their target) they
     * show their attack rows if their sheet has them (the Emberghoul), else their standing frame (row 0);
     * standing still otherwise (held by a root, waiting) they show the standing frame too. Their own
     * actions (the Flickerfiend's "blink") are left as they are. Stock monsters are unchanged.
     */
    public static readonly IO_STILL: any = { "IC12": "idle", "IC14": "idle", "IC15": "idle", "IC20": "attack" };
    protected _lastFrame: int;
    protected _defenderRemoved: boolean;
    protected DEFENSE_RANGE: int;
    protected DEFENSE_RANGE_SQUARED: int;
    protected DEFENSE_MODIFIER: number;
    protected _healerGiveUpTimer: int;
    protected m_bInfernoCreep: boolean;
    protected m_altitudeMax: int;
    protected m_altitudeMin: int;
    private m_cellNode: string;
    private m_cellX: int;
    private m_cellY: int;
    private _ioLastX: number;
    private _ioLastY: number;
    private _ioStillFor: int;

    public $ctor(param1?: any /* string */, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        this._ioLastX = NaN;
        this._ioLastY = NaN;
        let _loc13_: Point = null;
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        super.$ctor();
        this._friendly = param8;
        this.setInitialFriendlyFlags(this._friendly);
        this._creatureID = param1;
        this._middle = 5;
        this._house = param9;
        this._hits = 0;
        this._spawnPoint = new Point(((param3.x / 100) | 0) * 100, ((param3.y / 100) | 0) * 100);
        this._goeasy = Boolean(activeEvent.active ? false : param9);
        this._movement = as3.str(CREATURELOCKER._creatures[param1].movement);
        this.m_bInfernoCreep = BASE.isInfernoCreep(this._creatureID);
        this._pathing = as3.str(CREATURELOCKER._creatures[param1].pathing);
        if (this._house) {
            this._house._creatures.push(this);
        }
        this._behaviour = param2;
        this._targetGroup = CREATURES.GetProperty(param1, "targetGroup") | 0;
        this._explode = CREATURES.GetProperty(param1, "explode") | 0;
        this._spawnTime = GLOBAL.Timestamp();
        this._waypoints = [];
        this._targetCreeps = [];
        this._targetCreep = null;
        this._homeBunker = null;
        this.graphic.mouseEnabled = false;
        this.graphic.mouseChildren = false;
        this._speed = 0;
        this.moveSpeedProperty.value = CREATURES.GetProperty(this._creatureID, "speed", param5, this._friendly) / 2;
        if (TUTORIAL._stage < 200) {
            this.moveSpeedProperty.value *= 2;
        }
        this.setHealth((CREATURES.GetProperty(this._creatureID, "health", param5, this._friendly) * param10) | 0);
        this.maxHealthProperty.value = this.health;
        if (this.health > param6) {
            this.setHealth(param6);
        }
        this.damageProperty.set((CREATURES.GetProperty(this._creatureID, "damage", param5, this._friendly) * param10) | 0);
        this._goo = CREATURES.GetProperty(this._creatureID, "cResource", param5, this._friendly) | 0;
        this._targetPosition = param3;
        this._targetCenter = param7;
        this.graphic.x = this._targetPosition.x;
        this.graphic.y = this._targetPosition.y;
        this._tmpPoint.x = this.x;
        this._tmpPoint.y = this.y;
        if (param4) {
            this._targetRotation = param4;
        } else {
            this._targetRotation = 0;
        }
        this.m_rotation = this._targetRotation;
        this.attackDelayProperty.value = CREATURES.GetProperty(this._creatureID, "attackDelay", param5, this._friendly);
        if (!this.attackDelay) {
            this.attackDelayProperty.value = 60;
        }
        this.m_range = CREATURES.GetProperty(this._creatureID, "range", param5, this._friendly);
        if (!this.m_range) {
            this.m_range = 1;
        }
        this._attacking = false;
        this._frameNumber = 0;
        CreepSkinManager.instance.SetupSkins(this._creatureID);
        if (this._movement == "fly") {
            SPRITES.SetupSprite("shadow");
            this._shadow = new BitmapData(52, 50, true, 16777215);
            this._shadowMC = as3.cast(BYMConfig.instance.RENDERER_ON ? new Bitmap(this._shadow) : this.graphic.addChild(new Bitmap(this._shadow)), DisplayObject);
            this._shadowMC.x = -21;
            this._shadowMC.y = -16;
            this._frameNumber = (Math.random() * 1000) | 0;
            this.defenseFlags |= Targeting.k_TARGETS_FLYING;
        } else {
            this.defenseFlags |= Targeting.k_TARGETS_GROUND;
        }
        if (!this._graphic) {
            this._graphic = new BitmapData(52, 50, true, 0);
        }
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = -26;
        this._graphicMC.y = -36;
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
            if (this._movement === "fly") {
                this._shadowData = new RasterData(as3.cast(this._shadow, IBitmapDrawable), this._shadowPt, MAP.DEPTH_SHADOW);
            }
        }
        this.applyInfernoVenom();
        if (this._creatureID == "IC5") {
            this.m_altitudeMax = 40;
            this.m_altitudeMin = 35;
        } else {
            this.m_altitudeMax = !(!CREATURES.GetProperty(this._creatureID, "altitude", param5, this._friendly)) ? CREATURES.GetProperty(this._creatureID, "altitude", param5, this._friendly) | 0 : 108;
            this.m_altitudeMin = 60;
        }
        if (param2 == MonsterBase.k_sBHVR_HOUSING) {
            _loc13_ = GRID.ToISO(this._targetCenter.x + 100, this._targetCenter.y + 100, 0);
            if (this._movement == "fly") {
                this._graphicMC.y -= this._altitude;
            } else {
                this._altitude = 0;
            }
            PATHING.GetPath(this._tmpPoint, new Rectangle(_loc13_.x, _loc13_.y, 10, 10), as3.bind(this, this.setWaypoints), true);
        } else if (this._behaviour == MonsterBase.k_sBHVR_BOUNCE) {
            if (GLOBAL._render && this._movement != "fly") {
                if (!this.m_bInfernoCreep) {
                    this._graphicMC.y -= 90;
                    TweenLite.to(this._graphicMC, 0.6, { "y": this._graphicMC.y + 90, "ease": Bounce.easeOut, "onComplete": as3.bind(this, this.changeModeAttack) });
                } else {
                    EFFECTS.Dig(this._tmpPoint.x | 0, this._tmpPoint.y | 0);
                    TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - 20, "ease": Sine.easeOut, "overwrite": false });
                    TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y, "ease": Bounce.easeOut, "overwrite": false, "delay": 0.4, "onComplete": as3.bind(this, this.changeModeAttack) });
                }
            } else {
                if (this._movement == "fly") {
                    this._graphicMC.y -= this._altitude;
                } else {
                    this._altitude = 0;
                }
                if (this._targetGroup == 5) {
                    this.changeModeHeal();
                } else if (this._targetGroup == 6) {
                    this.changeModeHunt();
                } else {
                    this.changeModeAttack();
                }
            }
        } else if (this._behaviour === MonsterBase.k_sBHVR_DEFEND) {
            this.changeModeDefend();
        } else if (this._behaviour === MonsterBase.k_sBHVR_DECOY) {
            this.changeModeDecoy();
        }
        if (param10 > 1) {
            LOGGER.Log("log", "MONSTER Strength");
            GLOBAL.ErrorMessage("CREEP");
        }
        if (this._behaviour === MonsterBase.k_sBHVR_JUICE) {
            this.changeModeJuice();
        }
        if (this._behaviour === MonsterBase.k_sBHVR_FEED) {
            this.changeModeFeed();
        }
        this.updateBuffs();
        this.render();
        if (this._targetGroup == 3) {
            as3.cast(this.getComponentByName(MonsterBase.k_LOOT_PROPERTY), CModifiableProperty).addModifier(new AdditionPropertyModifier(1.5));
        }
    }

    // Performance optimization: Point object pooling methods
    private static getPooledPoint(x: number = 0, y: number = 0): Point {
        let point: Point = null;
        if (CreepBase._poolSize > 0) {
            point = as3.vget(CreepBase._pointPool, --CreepBase._poolSize);
            point.x = x;
            point.y = y;
        } else {
            point = new Point(x, y);
        }
        return point;
    }

    private static returnPointToPool(point: Point): void {
        if (CreepBase._poolSize < CreepBase.MAX_POOL_SIZE) {
            as3.vset(CreepBase._pointPool, CreepBase._poolSize++, point);
        }
    }

    protected override tickState(param1: int = 1): boolean {
        let _loc2_: number = NaN;
        super.tickState(param1);
        if (this._damagePerSecond.Get() > 0) {
            if (this._frameNumber % 60 == 0) {
                this.modifyHealth(-this._damagePerSecond.Get());
            }
        }
        if (!this.hackCheck()) {
            return false;
        }
        if (this._movement === "fly" && this.health > 0 && this._behaviour !== MonsterBase.k_sBHVR_PEN) {
            if (this._behaviour !== MonsterBase.k_sBHVR_JUICE && this._behaviour !== MonsterBase.k_sBHVR_FEED || this._altitude >= this.m_altitudeMin) {
                _loc2_ = Math.sin(this._frameNumber / 50) * 5;
                this._altitude = (this.m_altitudeMax - _loc2_) | 0;
                this._graphicMC.y = -this._altitude - 36 + _loc2_;
            }
        }
        if (this._homeBunker && (this._behaviour !== MonsterBase.k_sBHVR_DEFEND && this._behaviour !== MonsterBase.k_sBHVR_BUNKER && this._behaviour !== MonsterBase.k_sBHVR_JUICE && this._behaviour !== MonsterBase.k_sBHVR_PEN && this._behaviour !== MonsterBase.k_sBHVR_DECOY && this._behaviour !== MonsterBase.k_sBHVR_HOUSING)) {
            this._behaviour = MonsterBase.k_sBHVR_DEFEND;
        }
        switch (this._behaviour) {
            case MonsterBase.k_sBHVR_ATTACK:
            case MonsterBase.k_sBHVR_BOUNCE:
            case MonsterBase.k_sBHVR_HUNT:
                if (this.tickBAttack()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_HOUSING:
                if (this.m_bInfernoCreep) {
                    if (this.health <= 0) {
                        return true;
                    }
                    if (this._atTarget) {
                        this._behaviour = MonsterBase.k_sBHVR_PEN;
                        if (this._movement == "fly") {
                            TweenLite.to(this._graphicMC, 1.2, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerLanded) });
                        }
                        this._waypoints[0] = HOUSING.PointInHouse(this._targetCenter);
                    }
                } else if (this.tickBHousing()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_PEN:
                if (this.m_bInfernoCreep) {
                    if (this.health <= 0) {
                        return true;
                    }
                    if (this._frameNumber > 240 && ((Math.random() * 200) | 0) == 1 && GLOBAL._fps > 25) {
                        this._targetPosition = HOUSING.PointInHouse(this._targetCenter);
                        this._hasPath = true;
                    }
                    break;
                }
                if (this.tickBPen()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_RETREAT:
            case MonsterBase.k_sBHVR_JUICE:
            case MonsterBase.k_sBHVR_FEED:
                if (this.tickBDeathRun()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_HEAL:
                if (this.tickBHeal()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_WANDER:
                if (this._frameNumber > 480 && !this._targetCenter) {
                    this._targetPosition = new Point(Math.random() * 200, Math.random() * 150);
                }
                break;
            case MonsterBase.k_sBHVR_DEFEND:
                if (this.tickBDefend()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_BUNKER:
                if (this.tickBBunker()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_DECOY:
                if (this.tickBDecoy()) {
                    return true;
                }
                break;
        }
        if (this._enraged == 0 && this.graphic.filters.length > 0) {
            this.updateBuffs();
        }
        // CreepCellMove is a no-op while the cell and node are unchanged since its last call,
        // so skip it and avoid building the cell key string every tick.
        let cell: Point = GRID.FromISO(this._tmpPoint.x, this._tmpPoint.y);
        let cellX: int = (cell.x / Targeting._CELLSIZE) | 0;
        let cellY: int = (cell.y / Targeting._CELLSIZE) | 0;
        if (this.m_cellNode === null || this.node !== this.m_cellNode || cellX != this.m_cellX || cellY != this.m_cellY) {
            this.newNode = Targeting.CreepCellMove(this._tmpPoint, this._id, this, this.node);
            if (this.newNode) {
                this.node = this.newNode;
            }
            if (this.newNode !== null) {
                this.m_cellNode = this.node;
                this.m_cellX = cellX;
                this.m_cellY = cellY;
            }
        }
        return false;
    }

    public override changeModeJuice(): void {
        this._behaviour = MonsterBase.k_sBHVR_JUICE;
        this.changeMode();
        this._targetBuilding = GLOBAL._bJuicer;
        if (this._movement == "fly" && this._altitude < 60) {
            TweenLite.to(this._graphicMC, 2, { "y": this._graphicMC.y - (this.m_altitudeMax - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
        }
        PATHING.GetPath(this._tmpPoint, new Rectangle(this._targetBuilding._mc.x, this._targetBuilding._mc.y, 80, 80), as3.bind(this, this.setWaypoints), true);
        GLOBAL._bJuicer.Prep(this._creatureID);
    }

    public changeModeHeal(): void {
        this._behaviour = MonsterBase.k_sBHVR_HEAL;
        this.changeMode();
        this.findHealingTargets();
    }

    /**
     * Inferno-only: draws this monster from another sprite sheet from now on (Clinkerjaw's small Spurtz use
     * "IC1s"), starting from a clean canvas so nothing of the old frame is left around the new one.
     */
    public ioSkin(param1: string): void {
        SPRITES.SetupSprite(param1);
        this._currentSkinOverride = param1;
        this._lastFrame = -1;
        if (this._graphic) {
            this._graphic.fillRect(this._graphic.rect, 0);
        }
    }

    public changeModeDefend(): void {
        this._behaviour = MonsterBase.k_sBHVR_DEFEND;
        this.changeMode();
        if (this.isDisposable) {
            this.findDefenseTargets();
        }
    }

    public changeModeHunt(): void {
        this._behaviour = MonsterBase.k_sBHVR_HUNT;
        this.changeMode();
        this.findTarget(this._targetGroup);
    }

    public changeModeBunker(): void {
        let _loc1_: Point = null;
        let _loc2_: number = NaN;
        let _loc3_: any = null;
        let _loc4_: string = null;
        let _loc5_: any = null;
        let _loc6_: BFOUNDATION = null;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        this._behaviour = MonsterBase.k_sBHVR_BUNKER;
        this.changeMode();
        this._doDefenseBurrow = false;
        if (this.isDisposable) {
            this.setHealth(0);
            return;
        }
        if (!this._homeBunker) {
            _loc2_ = 9999999 * 9999999;
            _loc3_ = BASE._buildingsAll;
            for (_loc4_ in _loc3_) {
                _loc5_ = _loc3_[_loc4_];
                if (MONSTERBUNKER.isBunkerBuilding(_loc5_._type | 0) && _loc5_._countdownBuild.Get() <= 0 && _loc5_.health > 0) {
                    _loc7_ = (_loc6_ = as3.as(_loc5_, BFOUNDATION))._mc.x - this._tmpPoint.x;
                    _loc8_ = _loc6_._mc.y - this._tmpPoint.y;
                    if (_loc2_ > _loc7_ * _loc7_ + _loc8_ * _loc8_) {
                        this._homeBunker = _loc6_;
                    }
                }
            }
        }
        if (this._homeBunker) {
            if (BASE.isInfernoMainYardOrOutpost) {
                this._targetCenter = GRID.FromISO(Number(this._homeBunker._mc.x), Number(this._homeBunker._mc.y));
                this._targetPosition = GRID.FromISO(Number(this._homeBunker._mc.x), Number(this._homeBunker._mc.y));
                _loc9_ = 100;
                _loc10_ = 60;
            } else {
                _loc9_ = this._tmpPoint.x - this._homeBunker._position.x;
                _loc10_ = this._tmpPoint.y - this._homeBunker._position.y;
                _loc11_ = this._homeBunker._footprint[0].width | 0;
                _loc12_ = this._homeBunker._footprint[0].height | 0;
                if (_loc10_ <= 0) {
                    _loc10_ = _loc12_ / 4;
                    if (_loc9_ <= 0) {
                        _loc9_ = _loc11_ / -3;
                    } else {
                        _loc9_ = _loc11_ / 2;
                    }
                } else {
                    _loc10_ = _loc12_ / 2;
                    if (_loc9_ <= 0) {
                        _loc9_ = _loc11_ / -4;
                    } else {
                        _loc9_ = _loc11_ / 2;
                    }
                }
                this._targetCenter = GRID.FromISO(Number(this._homeBunker._position.x + _loc9_), Number(this._homeBunker._position.y + _loc10_));
                this._targetPosition = new Point(this._homeBunker._mc.x, this._homeBunker._mc.y);
            }
            this._jumpingUp = false;
            if (BASE.isInfernoMainYardOrOutpost) {
                _loc1_ = GRID.ToISO(this._targetCenter.x + _loc9_, this._targetCenter.y + _loc10_, 0);
            } else {
                _loc1_ = GRID.ToISO(this._targetCenter.x, this._targetCenter.y, 0);
            }
            PATHING.GetPath(this._tmpPoint, new Rectangle(_loc1_.x, _loc1_.y, 10, 10), as3.bind(this, this.setWaypoints), true);
            return;
        }
    }

    public changeModeDecoy(): void {
        let _loc1_: Point = null;
        let _loc2_: number = NaN;
        let _loc4_: Decoy = null;
        let _loc5_: Rectangle = null;
        let _loc6_: Point = null;
        let _loc7_: number = NaN;
        let _loc8_: number = NaN;
        let _loc9_: Point = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc13_: Point = null;
        let _loc3_: SiegeWeapon = SiegeWeapons.activeWeapon;
        if (Boolean(_loc3_) && _loc3_ instanceof Decoy) {
            this._behaviour = "decoy";
            this.changeMode();
            this._attacking = false;
            this._targetCreep = null;
            _loc4_ = as3.as(_loc3_, Decoy);
            _loc5_ = new Rectangle(_loc4_.x, _loc4_.y + _loc4_.decoyGraphic.height / 2, 40, 40);
            this._targetCenter = new Point(_loc5_.x, _loc5_.y);
            if (this._movement == "burrow") {
                this._hasTarget = true;
                this._hasPath = true;
                _loc9_ = GRID.FromISO(_loc5_.x, _loc5_.y);
                _loc10_ = (Math.random() * 4) | 0;
                _loc11_ = _loc5_.height | 0;
                _loc12_ = _loc5_.width | 0;
                if (_loc10_ == 0) {
                    _loc9_.x += Math.random() * _loc11_;
                    _loc9_.y += _loc12_;
                } else if (_loc10_ == 1) {
                    _loc9_.x += _loc11_;
                    _loc9_.y += _loc12_;
                } else if (_loc10_ == 2) {
                    _loc9_.x += _loc11_ - Math.random() * _loc11_ / 2;
                    _loc9_.y -= _loc12_ / 4;
                } else if (_loc10_ == 3) {
                    _loc9_.x -= _loc11_ / 4;
                    _loc9_.y += _loc12_ - Math.random() * _loc12_ / 2;
                }
                this._waypoints = [GRID.ToISO(_loc9_.x, _loc9_.y, 0)];
                this._targetPosition = as3.cast(this._waypoints[0], Point);
            } else if (this._movement == "fly") {
                this._hasTarget = true;
                this._hasPath = true;
                _loc1_ = this._tmpPoint.subtract(this._targetCenter);
                _loc2_ = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
                if (_loc2_ < 2500) {
                    this._atTarget = true;
                    this._hasPath = true;
                    this._targetPosition = this._targetCenter;
                } else {
                    _loc8_ = (_loc8_ = (_loc8_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 90 - 45)) / (180 / Math.PI);
                    _loc7_ = 30 + Math.random() * 10;
                    _loc13_ = new Point(this._targetCenter.x + Math.cos(_loc8_) * _loc7_ * 1.7, this._targetCenter.y + Math.sin(_loc8_) * _loc7_);
                    this._waypoints = [_loc13_];
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                }
            } else {
                _loc8_ = (_loc8_ = (_loc8_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 90 - 45)) / (180 / Math.PI);
                _loc7_ = 30 + Math.random() * 10;
                _loc6_ = new Point(this._targetCenter.x + Math.cos(_loc8_) * _loc7_ * 1.7, this._targetCenter.y + Math.sin(_loc8_) * _loc7_);
                _loc6_.x += Math.random() * -10 + 5;
                _loc6_.y += Math.random() * -10 + 5;
                this._targetPosition = this._targetCenter;
                this.WaypointTo(_loc6_);
            }
        } else {
            this._hasTarget = false;
            this.findDefenseTargets();
        }
    }

    public interceptTarget(): void {
        let _loc1_: Point = CreepBase.getPooledPoint(this._targetCreep._tmpPoint.x - this._tmpPoint.x, this._targetCreep._tmpPoint.y - this._tmpPoint.y);
        let _loc2_: number = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
        CreepBase.returnPointToPool(_loc1_);

        // Return to pool immediately after use
        this._intercepting = false;
        this._looking = true;
        if (_loc2_ < this.DEFENSE_RANGE_SQUARED || this.canShootCreep()) {
            this._waypoints = [];
            this._atTarget = true;
            this._looking = false;
        } else if (this._noDefensePath || _loc2_ < this.DEFENSE_RANGE_SQUARED * 3 || this._pathing == "direct") {
            this._waypoints = [this._targetCreep._tmpPoint];
            this._targetPosition = this._targetCreep._tmpPoint;
            if (this._pathing == "direct" && !this._hasTarget && _loc2_ < 14400) {
                this._doDefenseBurrow = false;
            } else {
                this._doDefenseBurrow = true;
            }
        } else if (this._targetCreep._atTarget || this._targetCreep._waypoints.length < 8 || _loc2_ < 62500) {
            this.WaypointTo(this._targetCreep._tmpPoint, null);
        } else {
            this.WaypointTo(as3.cast(this._targetCreep._waypoints[7], Point), null);
            this._intercepting = true;
        }
        this._hasTarget = true;
    }

    public findHealingTargets(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: any[] = null;
        let _loc1_: boolean = false;
        for (_loc2_ of as3.values(BASE._buildingsMain)) {
            if (_loc2_._class != "decoration" && _loc2_._class != "immovable" && _loc2_.health > 0 && _loc2_._class != "enemy") {
                _loc1_ = true;
                break;
            }
        }
        if (!_loc1_) {
            this.changeModeRetreat();
            return;
        }
        let _loc4_: boolean = false;
        this._targetCreeps = Targeting.getCreepsInRange(600, this._tmpPoint, this.attackFlags, this);
        if (this._targetCreeps.length > 0) {
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            if (!(Boolean(this._targetCreep) && this._targetCreep.health > 0 && this._targetCreep.health < this._targetCreep.maxHealth)) {
                _loc4_ = true;
                while (this._targetCreeps.length > 0 && (this._targetCreeps[0].creep._creatureID.substring(0, 1) == "C" && CREATURELOCKER._creatures[this._targetCreeps[0].creep._creatureID].antiHeal)) {
                    this._targetCreeps.shift();
                }
                if (this._targetCreeps.length > 0) {
                    this._targetCreep = as3.cast(this._targetCreeps[0].creep, MonsterBase);
                    this._waypoints = [this._targetCreep._tmpPoint];
                }
            }
            while (this._targetCreeps.length > 0 && (this._targetCreeps[0].creep._behaviour == MonsterBase.k_sBHVR_RETREAT || this._targetCreeps[0].creep._creatureID.substring(0, 1) == "C" && CREATURELOCKER._creatures[this._targetCreeps[0].creep._creatureID].antiHeal || this._targetCreeps[0].creep.health == this._targetCreeps[0].creep.maxHealth)) {
                this._targetCreeps.shift();
            }
        }
        if (this._targetCreeps.length > 0) {
            _loc4_ = false;
            this._targetCreep = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            this._waypoints = [this._targetCreep._tmpPoint];
            this._targetPosition = this._targetCreep._tmpPoint;
            this._behaviour = "heal";
        } else if (this._targetCreep && this._targetCreep.health > 0 && this._targetCreep.health < this._targetCreep.maxHealth) {
            _loc4_ = false;
            this._waypoints = [this._targetCreep._tmpPoint];
            this._targetPosition = this._targetCreep._tmpPoint;
            this._behaviour = "heal";
        } else if (this._healerGiveUpTimer > 0) {
            --this._healerGiveUpTimer;
        } else if (this._behaviour != "retreat") {
            let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
            if (activeEvent.active && !this._friendly) {
                this.setHealth(0);
                return;
            }
            this.changeModeRetreat();
        }
        if (this._waypoints.length) {
            this._hasTarget = true;
            this._hasPath = true;
            this.WaypointTo(as3.cast(this._waypoints[0], Point), null);
        }
    }

    public findDefenseTargets(): void {
        let _loc1_: any[] = null;
        let _loc2_: boolean = true;
        this._targetCreeps = Targeting.getCreepsInRange(200, this._tmpPoint, Targeting.getOldStyleTargets(this.targetMode));
        if (this._targetCreeps.length) {
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            while (this._targetCreeps.length > 0 && this._targetCreeps[0].creep._behaviour == MonsterBase.k_sBHVR_RETREAT) {
                this._targetCreeps.splice(0, 1);
            }
            if (this._creatureID == "IC5") {
                while (this._targetCreeps.length > 0 && this._targetCreeps[0].creep._creatureID == "C5") {
                    this._targetCreeps.splice(0, 1);
                }
            }
        }
        if (this._targetCreeps.length) {
            this._targetCreep = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            this.interceptTarget();
            this._behaviour = MonsterBase.k_sBHVR_DEFEND;
        } else if (Boolean(this._targetCreep) && this._targetCreep.health > 0) {
            if (this._noDefensePath || this._pathing == "direct") {
                this.interceptTarget();
            }
            this._behaviour = MonsterBase.k_sBHVR_DEFEND;
        } else if (this._homeBunker && this._homeBunker.health > 0) {
            this._targetCreep = as3.cast(this._homeBunker.GetTarget(this.targetMode), MonsterBase);
            if (this._targetCreep) {
                this._atTarget = false;
                this._attacking = false;
                this._behaviour = MonsterBase.k_sBHVR_DEFEND;
                this.interceptTarget();
            } else if (this._behaviour != MonsterBase.k_sBHVR_BUNKER) {
                this.changeModeBunker();
            }
        }
    }

    public click(param1: MouseEvent): void {
        if (this._waypoints.length > 0) {
            PATHING.RenderPath(this._waypoints, true);
        }
        if (!this._clicked) {
            this._clicked = true;
        } else {
            this._clicked = false;
        }
    }

    public flyerLanded(): void {
        this._altitude = 0;
    }

    public flyerTakeOff(): void {
        this._altitude = this.m_altitudeMax;
    }

    public override canShootCreep(): boolean {
        if (this._targetCreep == null || !this.isRanged) {
            return false;
        }
        let _loc1_: Point = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
        let _loc2_: number = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
        if (_loc2_ > this.range * this.range) {
            return false;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetCreep._tmpPoint.x | 0, this._targetCreep._tmpPoint.y | 0)) {
            return true;
        }
        return false;
    }

    protected canShootBuilding(): boolean {
        if (this._targetBuilding == null || !this.isRanged) {
            return false;
        }
        let _loc1_: Point = this._targetBuilding._position.subtract(this._tmpPoint);
        let _loc2_: number = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
        if (_loc2_ > this.range * this.range) {
            return false;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetBuilding._position.x | 0, this._targetBuilding._position.y | 0, this._targetBuilding)) {
            return true;
        }
        return false;
    }

    protected attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        let _loc6_: Component = null;
        let _loc4_: int = this._attackComponents.length | 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc4_) {
            if (as3.is((_loc6_ = as3.vget(this._attackComponents, _loc5_)), IAttackingComponent)) {
                as3.cast(_loc6_, IAttackingComponent).onAttack(param1, param2, param3);
            }
            _loc5_++;
        }
    }

    protected explode(): number {
        let tmpPointA: Point = null;
        let tmpPointB: Point = null;
        let tmpPointC: Point = null;
        let damageDealt: int = 0;
        let distancePoint: Point = null;
        let distanceSquared: number = NaN;
        let dist: int = 0;
        let building: BFOUNDATION = null;
        let creepid: string = null;
        let creep: MonsterBase = null;
        if (this._creatureID == "C5" && this.poweredUp()) {
            this._jumpingUp = true;
            TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - (40 + 20 * (this.powerUpLevel() - 1)), "ease": Sine.easeOut, "overwrite": false, "onComplete": (): void => {
                this.airburst();
            } });
        }
        if (this._jumpingUp) {
            return 0;
        }
        tmpPointA = PATHING.FromISO(this._tmpPoint).add(new Point(-5, -5));
        tmpPointB = new Point(0, 0);
        tmpPointC = new Point(0, 0);
        for (building of as3.values(BASE._buildingsAll)) {
            if (building._class != "decoration" && building._class != "enemy" && building.health > 0) {
                tmpPointC.x = building.x;
                tmpPointC.y = building.y;
                tmpPointB = PATHING.FromISO(tmpPointC);
                tmpPointC.x = building._middle;
                tmpPointC.y = building._middle;
                tmpPointB.add(tmpPointC);
                if (this._creatureID == "IC15") {
                    // Inferno-only: the Fusebug's blast is measured from the building's middle (the stock
                    // line above drops its result, so Eye-ra's is measured from the building's corner)
                    tmpPointB = tmpPointB.add(tmpPointC);
                }
                distancePoint = tmpPointA.subtract(tmpPointB);
                distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                if (distanceSquared < 3600) {
                    damageDealt = (damageDealt + building.modifyHealth(Math.round(this.damage * ((3600 - distanceSquared) / 3600)), this)) | 0;
                }
            }
        }
        if (this._targetCreep) {
            distancePoint = this._tmpPoint.subtract(this._targetCreep._tmpPoint);
            distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
            if (distanceSquared < this.DEFENSE_RANGE_SQUARED) {
                damageDealt = (damageDealt + this._targetCreep.modifyHealth(-this.damage)) | 0;
            }
        }
        for (creepid in CREATURES._creatures) {
            creep = as3.cast(CREATURES._creatures[creepid], MonsterBase);
            if ((creep._behaviour == MonsterBase.k_sBHVR_DEFEND || creep._behaviour == MonsterBase.k_sBHVR_BUNKER) && creep != this._targetCreep && creep._movement != "fly") {
                distancePoint = creep._tmpPoint.subtract(this._tmpPoint);
                distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                if (distanceSquared < 8100) {
                    damageDealt = (damageDealt + creep.modifyHealth(-((this.damage * creep._damageMult * ((8100 - distanceSquared) / 8100)) | 0))) | 0;
                }
            }
        }
        if (CREATURES._guardian) {
            distancePoint = CREATURES._guardian._tmpPoint.subtract(this._tmpPoint);
            distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
            if (distanceSquared < 3600) {
                damageDealt = (damageDealt + CREATURES._guardian.modifyHealth(-((this.damage * ((3600 - distanceSquared) / 3600)) | 0))) | 0;
            }
        }
        if (Boolean(damageDealt) && Boolean(this._explode)) {
            // (Inferno-only: the Fusebug has a line of its own, not Eye-ra's)
            ATTACK.Log("creep" + this._id, "<font color=\"#0000FF\">" + KEYS.Get(this._creatureID == "IC15" ? "attack_log_fusebug" : "attack_log_eyera") + "</font>");
            EFFECTS.Scorch(this._tmpPoint);
        }
        this.setHealth(0);
        return this.damage;
    }

    public tickBAttack(): boolean {
        let _loc1_: Point = null;
        let _loc2_: number = NaN;
        let _loc3_: ITargetable = null;
        let _loc4_: int = 0;
        let _loc6_: string = null;
        let _loc7_: int = 0;
        let _loc8_: MonsterBase = null;
        let _loc5_: number = 1;
        if (this.health <= 0) {
            return true;
        }
        if (this._hasTarget) {
            if (!this._targetCreep) {
                if (this._behaviour === MonsterBase.k_sBHVR_HUNT && (CREATURES._creatureCount > 0 || CREATURES._hasLivingGuardian) && this._frameNumber % 150 == 0) {
                    this.findTarget(this._targetGroup);
                } else if (this._targetBuilding == null || this._targetBuilding.health <= 0 || this._targetGroup == 3 && this._targetBuilding._looted || this._targetBuilding._class == "tower" && !MONSTERBUNKER.isBunkerBuilding(this._targetBuilding._type) && (as3.as(this._targetBuilding, BTOWER)).isJard) {
                    this.loseTarget();
                    this.findTarget(this._targetGroup);
                }
            } else {
                if (this._targetCreep.health <= 0) {
                    this.loseTarget();
                    this.findTarget(this._targetGroup);
                }
                if (!this._atTarget && Boolean(this._targetCreep)) {
                    if (GLOBAL.QuickDistanceSquared(this._targetCreep._tmpPoint, this._tmpPoint) < this.range * this.range) {
                        this._atTarget = true;
                    } else {
                        this._waypoints = [this._targetCreep._tmpPoint];
                    }
                }
            }
        }
        if (!this._looking && !this._attacking && this._frameNumber % (GLOBAL._catchup ? 300 : 150) == 0) {
            this.findTarget(this._targetGroup);
        }
        if (this._atTarget) {
            this._attacking = true;
            if (this._creatureID == "IC5" && this._movement == "fly" && (!this._targetCreep || this._targetCreep._movement != "fly")) {
                this._movement = "fly_low";
            }
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                if (this._behaviour == MonsterBase.k_sBHVR_HUNT && Boolean(this._targetCreep)) {
                    _loc5_ *= 3;
                } else if (this._targetBuilding) {
                    if (this._targetGroup == 2 && this._targetBuilding._class == "wall") {
                        _loc5_ *= 2;
                    }
                    if (this._targetGroup == 4 && this._targetBuilding._class == "tower") {
                        _loc5_ *= 2;
                    }
                }
                if (this._behaviour == MonsterBase.k_sBHVR_ATTACK || this._behaviour == MonsterBase.k_sBHVR_HUNT) {
                    if (this._explode) {
                        return Boolean(this.explode());
                    }
                    if (this._targetCreep) {
                        _loc1_ = this._tmpPoint.subtract(this._targetCreep._tmpPoint);
                        _loc2_ = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
                        if (this.isRanged) {
                            _loc3_ = this.rangedAttack(this._targetCreep);
                        } else {
                            _loc4_ = this._targetCreep.modifyHealth(-(this.damage * _loc5_)) | 0;
                            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, (-_loc4_) | 0, this._mc.visible);
                            if (!this._targetCreep._targetCreep || !this._targetCreep._atTarget) {
                                this._targetCreep._targetCreep = this;
                                this._targetCreep._hasTarget = true;
                                this._targetCreep._atTarget = true;
                                if (this._targetCreep._behaviour !== MonsterBase.k_sBHVR_DEFEND) {
                                    this._targetCreep._behaviour = MonsterBase.k_sBHVR_DEFEND;
                                }
                            }
                        }
                    } else if (this._targetBuilding) {
                        if (this.isRanged) {
                            _loc3_ = this.rangedAttack(this._targetBuilding);
                        } else {
                            _loc4_ = this._targetBuilding.modifyHealth(this.damage * _loc5_, this) | 0;
                            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, _loc4_, this._mc.visible);
                        }
                    }
                    this.attacked(as3.cast(!(!this._targetCreep) ? this._targetCreep : this._targetBuilding, IAttackable), _loc4_, _loc3_);
                    if (!this._targetCreep) {
                        ++this._hits;
                    }
                    let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
                    if (this._goeasy) {
                        if (this._hits > 20) {
                            this.changeModeRetreat();
                            return false;
                        }
                    } else if (!activeEvent.active && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._hits > this._hitLimit) {
                        return true;
                    } else if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && this._hits > this._hitLimit) {
                        return true;
                    }
                    if (this.m_bInfernoCreep) {
                        _loc6_ = "ihit" + ((1 + Math.random() * 7) | 0);
                        SOUNDS.Play(_loc6_, 0.1 + Math.random() * 0.1);
                    } else if ((Number(this._creatureID.substr(1)) | 0) < 5) {
                        SOUNDS.Play("hit" + ((1 + Math.random() * 3) | 0), 0.1 + Math.random() * 0.1);
                    } else if ((Number(this._creatureID.substr(1)) | 0) < 10) {
                        SOUNDS.Play("hit" + ((3 + Math.random() * 2) | 0), 0.1 + Math.random() * 0.1);
                    } else {
                        SOUNDS.Play("hit" + ((4 + Math.random() * 1) | 0), 0.1 + Math.random() * 0.1);
                    }
                }
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
            if (this._movement == "fly_low") {
                this._movement = "fly";
            }
            if (this._creatureID == "C12" && this.poweredUp() && !this._targetCreep && this._frameNumber % 30 == 0) {
                _loc7_ = 160000;
                for (_loc8_ of as3.values(CREATURES._creatures)) {
                    if ((_loc8_._creatureID == "C5" || _loc8_._creatureID == "IC5") && _loc8_._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                        _loc1_ = _loc8_._tmpPoint.subtract(this._tmpPoint);
                        _loc2_ = _loc1_.x * _loc1_.x + _loc1_.y * _loc1_.y;
                        if (_loc2_ < _loc7_) {
                            this._targetCreep = _loc8_;
                            _loc7_ = _loc2_ | 0;
                            this._hasTarget = true;
                        }
                    }
                }
            }
        }
        return false;
    }

    protected tickBDefend(): boolean {
        let damageDelt: int = 0;
        let i: int = 0;
        let creep: MonsterBase = null;
        let distancePoint: Point = null;
        let distanceSquared: number = NaN;
        let targetFlags: int = 0;
        let projectile: ITargetable = null;
        let aggros: any[] = null;
        let l: int = 0;
        if (this.health <= 0) {
            if (this._creatureID == "C12") {
                SOUNDS.Play("monsterlanddave");
            } else {
                SOUNDS.Play("monsterland" + (1 + ((Math.random() * 3) | 0)));
            }
            if (this._homeBunker) {
                if (Boolean(this._homeBunker._monsters) && !this._defenderRemoved) {
                    if (BASE.isInfernoMainYardOrOutpost) {
                        if (this._homeBunker instanceof HOUSINGBUNKER) {
                            as3.cast(this._homeBunker, HOUSINGBUNKER).RemoveCreature(this._creatureID, this);
                        } else {
                            this._homeBunker.RemoveCreature(this._creatureID);
                        }
                        if (MapRoomManager.instance.isInMapRoom3) {
                            GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                        }
                        this._defenderRemoved = true;
                        this._behaviour = MonsterBase.k_sBHVR_PEN;
                        return false;
                    }
                    if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
                        this._homeBunker._monsters[this._creatureID] = (this._homeBunker._monsters[this._creatureID] | 0) - 1;
                        if (this._homeBunker._monsters[this._creatureID] < 0) {
                            this._homeBunker._monsters[this._creatureID] = 0;
                        }
                    } else {
                        GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                    }
                    this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                    if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                        this._homeBunker._monstersDispatched[this._creatureID] = 0;
                    }
                    --this._homeBunker._monstersDispatchedTotal;
                    if (this._homeBunker._monstersDispatchedTotal < 0) {
                        this._homeBunker._monstersDispatchedTotal = 0;
                    }
                    this._defenderRemoved = true;
                }
            }
            if (this._explode) {
                if (Boolean(this._explode) && this._jumpingUp) {
                    this.airburst();
                    return true;
                }
                this._targetCreeps = Targeting.getCreepsInRange(90, this._tmpPoint, Targeting.getOldStyleTargets(-1));
                Targeting.DealLinearAEDamage(this._tmpPoint, 90, this.damage, this._targetCreeps);
                if (this._explode) {
                    EFFECTS.Scorch(this._tmpPoint);
                }
            }
            return true;
        }
        if (this._hasTarget) {
            if (this._targetCreep) {
                distancePoint = this._tmpPoint.subtract(this._targetCreep._tmpPoint);
                distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
            }
            if (this._targetCreep.health <= 0) {
                this._hasTarget = false;
                this._atTarget = false;
                this._attacking = false;
                this._hasPath = false;
                this.findDefenseTargets();
            } else if (this._targetBuilding && distanceSquared < this.DEFENSE_RANGE_SQUARED || this.canShootCreep()) {
                this._waypoints = [];
                this._atTarget = true;
                if (this.m_bInfernoCreep) {
                    SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
                }
            } else if (!this._attacking && this._frameNumber % 150 == 0) {
                this.findDefenseTargets();
            } else if (this._attacking && this._targetBuilding && distanceSquared > 3600 && !this.canShootCreep()) {
                this._attacking = false;
                this._atTarget = false;
                this._hasPath = false;
                this.findDefenseTargets();
            } else if (this._creatureID == "C5" && this._targetBuilding && this.poweredUp() && distanceSquared < 3600 && !this._jumpingUp) {
                this._jumpingUp = true;
                TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - (40 + 20 * (this.powerUpLevel() - 1)), "ease": Sine.easeOut, "overwrite": false, "onComplete": (): void => {
                    this.airburst();
                } });
            } else if (this._creatureID == "C5" && this._targetCreep && this.poweredUp() && !this._jumpingUp) {
                distancePoint = this._tmpPoint.subtract(this._targetCreep._tmpPoint);
                distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                if (distanceSquared < 3600) {
                    this._jumpingUp = true;
                    TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - (40 + 20 * (this.powerUpLevel() - 1)), "ease": Sine.easeOut, "overwrite": false, "onComplete": (): void => {
                        this.airburst();
                    } });
                }
            }
        }
        if (this._atTarget) {
            this._targetPosition = this._targetCreep._tmpPoint;
            this._attacking = true;
            this._intercepting = false;
            if (this._targetCreep._behaviour != "heal" && !this._targetCreep._explode && !this._explode && !this._targetCreep._targetCreep) {
                distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                this._waypoints = [];
                this._targetCreep._targetCreep = this;
                if (this._targetCreep.canShootCreep() || distanceSquared < 2500 || this._targetCreep._creatureID == "C14") {
                    this._targetCreep._atTarget = true;
                } else {
                    this._targetCreep._atTarget = false;
                    this._targetCreep._waypoints = [this._tmpPoint];
                }
                this._targetCreep._hasTarget = true;
                this._targetCreep._looking = false;
                this._targetCreep._hasPath = true;
            }
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                if (this._explode) {
                    if (Boolean(this._explode) && this._jumpingUp) {
                        this.airburst();
                        return true;
                    }
                    targetFlags = this._friendly ? Targeting.k_TARGETS_ATTACKERS : Targeting.k_TARGETS_DEFENDERS;
                    targetFlags |= Targeting.k_TARGETS_GROUND;
                    if (this._explode) {
                        targetFlags |= Targeting.k_TARGETS_INVISIBLE;
                    }
                    this._targetCreeps = Targeting.getCreepsInRange(90, this._tmpPoint, targetFlags);
                    Targeting.DealLinearAEDamage(this._tmpPoint, 90, this.damage, this._targetCreeps);
                    ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, this.damage | 0, this._mc.visible);
                    if (this._explode) {
                        EFFECTS.Scorch(this._tmpPoint);
                        this.setHealth(0);
                        if (this._homeBunker) {
                            if (Boolean(this._homeBunker._monsters) && !this._defenderRemoved) {
                                if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
                                    this._homeBunker._monsters[this._creatureID] = (this._homeBunker._monsters[this._creatureID] | 0) - 1;
                                    if (this._homeBunker._monsters[this._creatureID] < 0) {
                                        this._homeBunker._monsters[this._creatureID] = 0;
                                    }
                                } else {
                                    GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                                }
                                this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                                if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                                    this._homeBunker._monstersDispatched[this._creatureID] = 0;
                                }
                                --this._homeBunker._monstersDispatchedTotal;
                                if (this._homeBunker._monstersDispatchedTotal < 0) {
                                    this._homeBunker._monstersDispatchedTotal = 0;
                                }
                                this._defenderRemoved = true;
                            }
                        }
                        return true;
                    }
                } else if (this.isRanged) {
                    projectile = this.rangedAttack(this._targetCreep);
                } else {
                    if (this._targetGroup == 6) {
                        damageDelt = this._targetCreep.modifyHealth(-(this.damage * 3)) | 0;
                    } else {
                        damageDelt = this._targetCreep.modifyHealth(-this.damage) | 0;
                    }
                    ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, damageDelt, this._mc.visible);
                }
                if (!this._explode) {
                    if (!this._targetCreep._explode && !this._targetCreep._targetCreep && this._targetCreep._behaviour != "heal") {
                        distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                        distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                        this._waypoints = [];
                        this._targetCreep._targetCreep = this;
                        if (this._targetCreep.canShootCreep() || distanceSquared < 2500 || this._targetCreep._creatureID == "C14") {
                            this._targetCreep._atTarget = true;
                        } else {
                            this._targetCreep._atTarget = false;
                            this._targetCreep._waypoints = [this._tmpPoint];
                        }
                        this._targetCreep._hasTarget = true;
                        this._targetCreep._looking = false;
                        this._targetCreep._hasPath = true;
                        this._targetCreep._hasTarget = true;
                    }
                    this.attacked(as3.cast(!(!this._targetCreep) ? this._targetCreep : this._targetBuilding, IAttackable), damageDelt, projectile);
                    aggros = Targeting.getCreepsInRange(50, this._tmpPoint, Targeting.k_TARGETS_ATTACKERS | Targeting.k_TARGETS_GROUND);
                    l = aggros.length | 0;
                    i = 0;
                    while (i < 5 && i < l) {
                        if (!aggros[i].creep._explode) {
                            distancePoint = as3.cast(aggros[i].creep._tmpPoint.subtract(this._tmpPoint), Point);
                            distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                            aggros[i].creep._targetCreep = this;
                            if (!this.m_bInfernoCreep) {
                                if (aggros[i].creep.canShootCreep() || distanceSquared < 2500 || aggros[i].creep._creatureID == "C14") {
                                    aggros[i].creep._atTarget = true;
                                } else {
                                    aggros[i].creep._atTarget = false;
                                    aggros[i].creep._waypoints = [this._tmpPoint];
                                }
                            }
                            aggros[i].creep._looking = false;
                            aggros[i].creep._hasPath = true;
                            aggros[i].creep._hasTarget = true;
                        }
                        i++;
                    }
                }
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
        }
        return false;
    }

    public tickBDecoy(): boolean {
        if (this.health <= 0) {
            if (this._homeBunker) {
                if (Boolean(this._homeBunker._monsters) && !this._defenderRemoved) {
                    if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
                        this._homeBunker._monsters[this._creatureID] = (this._homeBunker._monsters[this._creatureID] | 0) - 1;
                        if (this._homeBunker._monsters[this._creatureID] < 0) {
                            this._homeBunker._monsters[this._creatureID] = 0;
                        }
                    } else {
                        GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                    }
                    this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                    if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                        this._homeBunker._monstersDispatched[this._creatureID] = 0;
                    }
                    --this._homeBunker._monstersDispatchedTotal;
                    if (this._homeBunker._monstersDispatchedTotal < 0) {
                        this._homeBunker._monstersDispatchedTotal = 0;
                    }
                    this._defenderRemoved = true;
                }
            }
        }
        if (this._atTarget) {
        }
        if (!(SiegeWeapons.activeWeapon && SiegeWeapons.activeWeapon instanceof Decoy)) {
            this._hasTarget = false;
            this._atTarget = false;
            this._attacking = false;
            this._hasPath = false;
            this.findDefenseTargets();
        }
        return false;
    }

    protected tickBDeathRun(): boolean {
        if (this.health <= 0) {
            return true;
        }
        if (this._atTarget) {
            if (this._behaviour == MonsterBase.k_sBHVR_JUICE) {
                if (this._movement == "fly") {
                    if (!this.dying) {
                        this._dying = true;
                        TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerJuice) });
                    }
                    if (!this.m_juiceReady) {
                        return false;
                    }
                }
                GLOBAL._bJuicer.Blend(Math.ceil(this._goo / 400) | 0, this._creatureID, this.health / this.maxHealth);
            }
            if (this._behaviour == MonsterBase.k_sBHVR_FEED) {
                GIBLETS.Create(this._tmpPoint, 0.8, 100, (this._goo / 400) | 0, 36);
            }
            if (this._behaviour == MonsterBase.k_sBHVR_RETREAT && MapRoomManager.instance.isInMapRoom3) {
                if (GLOBAL.attackingPlayer.monsterListByID(this._creatureID)) {
                    GLOBAL.attackingPlayer.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                }
            }
            return true;
        }
        return false;
    }

    protected tickBHeal(): boolean {
        let _loc2_: ITargetable = null;
        let _loc3_: Point = null;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc1_: number = 1;
        if (this.health <= 0) {
            if (this._creatureID == "C12") {
                SOUNDS.Play("monsterlanddave");
            } else {
                SOUNDS.Play("monsterland" + (1 + ((Math.random() * 3) | 0)));
            }
            return true;
        }
        if (this._hasTarget) {
            _loc5_ = this.range * this.range;
            if (this._targetCreep) {
                _loc3_ = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                _loc4_ = _loc3_.x * _loc3_.x + _loc3_.y * _loc3_.y;
            }
            if (!this._targetCreep || this._targetCreep.health <= 0 || this._targetCreep.health == this._targetCreep.maxHealth && this._frameNumber % 100 == 0) {
                this._hasTarget = false;
                this._attacking = false;
                this._atTarget = false;
                this._hasPath = false;
                if (Boolean(this._targetCreep) && this._targetCreep.health <= 0) {
                    this._targetCreep = null;
                }
                this.findHealingTargets();
            } else if (!this._attacking && this._frameNumber % 120 == 0) {
                this.findHealingTargets();
            } else if (_loc4_ < _loc5_) {
                this._atTarget = true;
            } else if (this._attacking && _loc4_ > _loc5_ * 1.25) {
                this._attacking = false;
                this._atTarget = false;
                this._waypoints = [this._targetCreep._tmpPoint];
            }
        } else {
            this._attacking = false;
            this._atTarget = false;
            this._hasPath = false;
            this.findHealingTargets();
        }
        if (this._atTarget) {
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                if (this._targetCreep.health > 0 && this._targetCreep.health < this._targetCreep.maxHealth) {
                    this._attacking = true;
                    _loc2_ = this.rangedAttack(this._targetCreep);
                    this.attacked(as3.cast(!(!this._targetCreep) ? this._targetCreep : this._targetBuilding, IAttackable), this.damage * _loc1_, _loc2_);
                } else {
                    this._attacking = false;
                }
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
        }
        return false;
    }

    public tickBPen(): boolean {
        if (this.health <= 0) {
            return true;
        }
        if (this._frameNumber > 240 && ((Math.random() * 200) | 0) == 1 && GLOBAL._fps > 25) {
            this._targetPosition = HOUSING.PointInHouse(this._targetCenter);
            this._hasPath = true;
        }
        return false;
    }

    public tickBHousing(): boolean {
        if (this._atTarget) {
            this._behaviour = MonsterBase.k_sBHVR_PEN;
            if (this._movement == "fly") {
                TweenLite.to(this._graphicMC, 1.2, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerLanded) });
            }
            this._waypoints[0] = HOUSING.PointInHouse(this._targetCenter);
        }
        return false;
    }

    protected tickBBunker(): boolean {
        if (this.health <= 0) {
            if (this._homeBunker) {
                if (Boolean(this._homeBunker._monsters) && !this._defenderRemoved) {
                    if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
                        this._homeBunker._monsters[this._creatureID] = (this._homeBunker._monsters[this._creatureID] | 0) - 1;
                        if (this._homeBunker._monsters[this._creatureID] < 0) {
                            this._homeBunker._monsters[this._creatureID] = 0;
                        }
                    } else {
                        GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                    }
                    this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                    if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                        this._homeBunker._monstersDispatched[this._creatureID] = 0;
                    }
                    --this._homeBunker._monstersDispatchedTotal;
                    if (this._homeBunker._monstersDispatchedTotal < 0) {
                        this._homeBunker._monstersDispatchedTotal = 0;
                    }
                    this._defenderRemoved = true;
                }
            }
            return true;
        }
        // A defender on its way back to the bunker looks for a new attacker every 10 steps (this ran on
        // 199 of every 200 steps: a range search per defender per step in a big raid).
        if (this._frameNumber % 10 == 0) {
            this.findDefenseTargets();
        }
        if (this._atTarget && this._behaviour == MonsterBase.k_sBHVR_BUNKER) {
            if (this._homeBunker) {
                if (MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard) {
                    GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                }
                if (GLOBAL.INFERNO_ONLY && this._homeBunker instanceof BUILDING22 && !(this.m_bInfernoCreep && BASE.isInfernoMainYardOrOutpost)) {
                    // This defender goes back inside and its creep is removed: the bunker keeps its wounds.
                    as3.cast(this._homeBunker, BUILDING22).ioStoreHealth(this._creatureID, this.health, this.maxHealth);
                }
                this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                    this._homeBunker._monstersDispatched[this._creatureID] = 0;
                }
                --this._homeBunker._monstersDispatchedTotal;
                if (this._homeBunker._monstersDispatchedTotal < 0) {
                    this._homeBunker._monstersDispatchedTotal = 0;
                }
            }
            if (!this.m_bInfernoCreep || !BASE.isInfernoMainYardOrOutpost) {
                return true;
            }
        }
        return false;
    }

    protected override move(): void {
        let distancePoint: Point = null;
        let distanceSquared: number = NaN;
        let targetDistance: number = NaN;
        let targetDistanceSquared: number = NaN;
        let building: BFOUNDATION = null;
        let growled: boolean = false;
        this._speed = this.moveSpeed * 0.5;
        if (this._behaviour == MonsterBase.k_sBHVR_PEN) {
            this._speed *= 0.5;
        }
        if (this._behaviour == MonsterBase.k_sBHVR_JUICE || this._behaviour == MonsterBase.k_sBHVR_HOUSING || this._behaviour == MonsterBase.k_sBHVR_BUNKER) {
            this._speed *= 1.5;
        }
        if (this._behaviour == MonsterBase.k_sBHVR_DEFEND) {
            this._speed *= 1.5;
        }
        if (this._behaviour == MonsterBase.k_sBHVR_JUICE && this._movement == "fly" && this._altitude < 25) {
            this._speed = 0;
        }
        if (this._attacking) {
            this._speed = 0;
        }
        if (this._jumping) {
            if (this._jumpingUp) {
                this._speed *= 3;
            } else {
                this._speed *= 2;
            }
        }
        if (this._behaviour != MonsterBase.k_sBHVR_JUICE && this._behaviour != MonsterBase.k_sBHVR_RETREAT && this._behaviour != MonsterBase.k_sBHVR_HOUSING && this._behaviour != MonsterBase.k_sBHVR_BUNKER && this._behaviour != MonsterBase.k_sBHVR_PEN && !this._atTarget && (this._targetCreep && this.canShootCreep() || this.canShootBuilding())) {
            this._atTarget = true;
            SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
            if (this._targetCreep) {
                this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
                this._targetPosition = this._targetCreep._tmpPoint;
            } else {
                this._xd = this._targetBuilding._position.x - this._tmpPoint.x;
                this._yd = this._targetBuilding._position.y - this._tmpPoint.y;
                this._targetPosition = this._targetBuilding._position;
            }
        } else if (this._waypoints.length > 0) {
            distancePoint = this._targetPosition.subtract(this._tmpPoint);
            distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
            if (distanceSquared <= 100) {
                while (this._waypoints.length > 0 && distanceSquared <= 100) {
                    this._waypoints.splice(0, 1);
                    if (this._waypoints[0]) {
                        this._targetPosition = as3.cast(this._waypoints[0], Point);
                        distancePoint = this._targetPosition.subtract(this._tmpPoint);
                        distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                        if (this._movement == "jump" && !this._jumping) {
                            building = PATHING.GetBuildingFromISO(this._targetPosition);
                            if (building) {
                                if (building.health > 0) {
                                    TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - 60, "ease": Sine.easeOut, "overwrite": false, "onComplete": (): void => {
                                        this._jumpingUp = false;
                                    } });
                                    TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y, "ease": Bounce.easeOut, "overwrite": false, "delay": 0.4, "onComplete": (): void => {
                                        this._jumping = false;
                                    } });
                                    this._jumping = true;
                                    this._jumpingUp = true;
                                }
                            }
                        }
                    } else if (this._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                        if (this._targetCreep) {
                            distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                            targetDistanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                            if (targetDistanceSquared < this.DEFENSE_RANGE_SQUARED || this.canShootCreep()) {
                                this._waypoints = [];
                                this._atTarget = true;
                                this._targetCreep._targetCreep = this;
                                if (this.m_bInfernoCreep && !growled) {
                                    growled = true;
                                    SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
                                }
                                if (this._targetCreep.canShootCreep() || targetDistanceSquared < 2500 || this._targetCreep._creatureID == "C14") {
                                    this._targetCreep._atTarget = true;
                                } else {
                                    this._targetCreep._atTarget = false;
                                    this._targetCreep._waypoints = [this._tmpPoint];
                                }
                                this._targetCreep._hasTarget = true;
                                this._targetCreep._looking = false;
                                this._targetCreep._hasTarget = true;
                                return;
                            }
                        }
                    } else {
                        if (this._behaviour != MonsterBase.k_sBHVR_HEAL) {
                            if (this._behaviour == MonsterBase.k_sBHVR_RETREAT) {
                                this._atTarget = true;
                                return;
                            }
                            if (this._targetCreep) {
                                distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                                targetDistanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                                if (this.canShootCreep() || targetDistanceSquared < 2500 || this._creatureID == "C14") {
                                    this._atTarget = true;
                                } else {
                                    this._atTarget = false;
                                    this._waypoints = [this._targetCreep._tmpPoint];
                                }
                                if (this.m_bInfernoCreep && this._atTarget && !growled) {
                                    growled = true;
                                    SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
                                }
                            } else {
                                this._atTarget = true;
                            }
                            return;
                        }
                        if (this._targetCreep) {
                            distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                            targetDistanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                            if (targetDistanceSquared < this.range * this.range) {
                                this._atTarget = true;
                                return;
                            }
                        }
                    }
                }
                if (this._targetCreep) {
                    distancePoint = this._targetCreep._tmpPoint.subtract(this._tmpPoint);
                    targetDistanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
                }
                if (this._behaviour == MonsterBase.k_sBHVR_DEFEND && Boolean(this._targetCreep)) {
                    if (targetDistanceSquared < this.DEFENSE_RANGE_SQUARED || this.canShootCreep()) {
                        this._atTarget = true;
                        if (this.m_bInfernoCreep && !growled) {
                            growled = true;
                            SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
                        }
                        this._waypoints = [];
                        if (!this._targetCreep._explode) {
                            this._targetCreep._targetCreep = this;
                            if (this._targetCreep.canShootCreep() || targetDistanceSquared < 2500 || this._targetCreep._creatureID == "C14") {
                                this._targetCreep._atTarget = true;
                            } else {
                                this._targetCreep._atTarget = false;
                                this._targetCreep._waypoints = [this._tmpPoint];
                            }
                            this._targetCreep._hasTarget = true;
                            this._targetCreep._looking = false;
                            this._targetCreep._hasTarget = true;
                        }
                        this._targetPosition = this._targetCreep._tmpPoint;
                        return;
                    }
                    if (this._waypoints.length == 0 && this._hasPath) {
                        if (this._noDefensePath) {
                            this._targetPosition = this._targetCreep._tmpPoint;
                            this._waypoints = [this._targetCreep._tmpPoint];
                        } else {
                            this.WaypointTo(this._targetCreep._tmpPoint, null);
                        }
                    }
                } else if (this._behaviour == MonsterBase.k_sBHVR_HEAL) {
                    if (targetDistanceSquared < this.range * this.range) {
                        this._atTarget = true;
                        return;
                    }
                    if (this._targetCreep && this._waypoints.length == 0 && this._hasPath) {
                        this._waypoints = [this._targetCreep._tmpPoint];
                        this.WaypointTo(this._targetCreep._tmpPoint, null);
                    }
                } else if (this._waypoints.length == 0 && this._hasPath) {
                    if (this.canShootCreep() || targetDistanceSquared < 2500 || this._creatureID == "C14") {
                        this._atTarget = true;
                    } else {
                        this._atTarget = false;
                        if (this._targetCreep) {
                            this._waypoints = [this._targetCreep._tmpPoint];
                        }
                    }
                    if (this.m_bInfernoCreep && this._atTarget && !growled) {
                        growled = true;
                        SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
                    }
                    return;
                }
            }
            if (this._waypoints.length > 0 && !this._atTarget) {
                this._targetPosition = as3.cast(this._waypoints[0], Point);
            }
            if (this._behaviour == MonsterBase.k_sBHVR_ATTACK && Boolean(this._targetCreep)) {
                this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
            } else if (this._behaviour == MonsterBase.k_sBHVR_DEFEND || this._behaviour == MonsterBase.k_sBHVR_HEAL) {
                if (this._attacking) {
                    this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                    this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
                } else if (this._targetPosition) {
                    this._xd = this._targetPosition.x - this._tmpPoint.x;
                    this._yd = this._targetPosition.y - this._tmpPoint.y;
                }
            } else if (this._targetPosition) {
                this._xd = this._targetPosition.x - this._tmpPoint.x;
                this._yd = this._targetPosition.y - this._tmpPoint.y;
            }
            this._tmpPoint.x += Math.cos(Math.atan2(this._yd, this._xd)) * this._speed;
            this._tmpPoint.y += Math.sin(Math.atan2(this._yd, this._xd)) * this._speed;
        } else if (this._hasPath) {
            if (this._targetCreep) {
                this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
            } else if (this._targetBuilding) {
                this._xd = this._targetBuilding.x - this._tmpPoint.x;
                this._yd = this._targetBuilding.y + this._targetBuilding._middle - this._tmpPoint.y;
            } else if (this._targetPosition) {
                this._xd = this._targetPosition.x - this._tmpPoint.x;
                this._yd = this._targetPosition.y - this._tmpPoint.y;
            }
            distancePoint = this._targetPosition.subtract(this._tmpPoint);
            distanceSquared = distancePoint.x * distancePoint.x + distancePoint.y * distancePoint.y;
            if (!this._atTarget) {
                if (distanceSquared > 25) {
                    this._tmpPoint.x += Math.cos(Math.atan2(this._yd, this._xd)) * this._speed;
                    this._tmpPoint.y += Math.sin(Math.atan2(this._yd, this._xd)) * this._speed;
                } else {
                    this._atTarget = true;
                }
            }
        }
    }

    protected override getNextSprite(): void {
        if (this._creatureID == "IC5" && this._movement == "fly" || this._movement == "fly_low") {
            SPRITES.GetSprite(this._shadow, "shadow", "shadow", 0);
        }
        if (this._creatureID == "C14" || this._creatureID == "C16") {
            SPRITES.GetSprite(this._shadow, "shadow", "shadow", 0);
            if (this.health <= 0) {
                this._lastFrame = CreepSkinManager.instance.GetSprite(this._graphic, this._creatureID, "landed", this.m_rotation | 0, 0, this._lastFrame, this._currentSkinOverride);
            } else {
                this._lastFrame = CreepSkinManager.instance.GetSprite(this._graphic, this._creatureID, "flying", this.m_rotation | 0, this._frameNumber, this._lastFrame, this._currentSkinOverride);
            }
        } else if (this._creatureID == "C15") {
            SPRITES.GetSprite(this._shadow, "bigshadow", "bigshadow", 0);
            this._lastFrame = CreepSkinManager.instance.GetSprite(this._graphic, this._creatureID, "flying", this.m_rotation | 0, 0, this._lastFrame, this._currentSkinOverride);
        } else {
            this._lastFrame = CreepSkinManager.instance.GetSprite(this._graphic, this._creatureID, this.ioAction(), this.m_rotation | 0, this._frameNumber, this._lastFrame, this._currentSkinOverride);
        }
    }

    /** Inferno-only: true once it hasn't moved for a few drawn frames (or is fighting). */
    public ioStandingStill(): boolean {
        let moved: boolean = this._tmpPoint.x != this._ioLastX || this._tmpPoint.y != this._ioLastY;
        this._ioLastX = this._tmpPoint.x;
        this._ioLastY = this._tmpPoint.y;
        this._ioStillFor = (moved ? 0 : this._ioStillFor + 1) | 0;
        return this._ioStillFor >= 3;
    }

    /** The action to draw: see IO_STILL. */
    protected ioAction(): string {
        let fight: string = as3.str(CreepBase.IO_STILL[this._creatureID]);
        if (!fight || this.spriteAction != "walking" || this._currentSkinOverride) {
            return this.spriteAction;
        }
        let still: boolean = this.ioStandingStill();
        if (this.health > 0 && (this._attacking || this._atTarget)) {
            return fight;
        }
        return still ? "idle" : "walking";
    }

    protected override hackCheck(): boolean {
        return true;
    }

    private airburst(): void {
        let _loc1_: int = 0;
        let _loc2_: Point = null;
        let _loc3_: Point = null;
        let _loc4_: Point = null;
        let _loc5_: Point = null;
        let _loc6_: number = NaN;
        let _loc8_: int = 0;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: MonsterBase = null;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: int = 0;
        let _loc14_: any = undefined;
        let _loc15_: number = NaN;
        let _loc7_: number = 1.1 + this.powerUpLevel() * 0.1;
        if (this._behaviour == MonsterBase.k_sBHVR_ATTACK) {
            _loc1_ = (60 * (1.1 + this.powerUpLevel() * 0.1)) | 0;
            _loc1_ = (_loc1_ * _loc1_) | 0;
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - (45 + 20 * (this.powerUpLevel() - 1)), (this.damage * _loc7_) | 0, this._mc.visible);
            if (this._targetBuilding) {
                this._targetBuilding.modifyHealth(this.damage * _loc7_, this);
            }
            _loc2_ = PATHING.FromISO(this._tmpPoint).add(new Point(-5, -5));
            _loc3_ = new Point(0, 0);
            _loc4_ = new Point(0, 0);
            for (_loc9_ of as3.values(BASE._buildingsAll)) {
                if (_loc9_._class != "decoration" && _loc9_._class != "enemy" && _loc9_._class != "trap") {
                    _loc4_.x = _loc9_.x;
                    _loc4_.y = _loc9_.y;
                    _loc3_ = PATHING.FromISO(_loc4_);
                    _loc4_.x = _loc9_._middle;
                    _loc4_.y = _loc9_._middle;
                    _loc3_.add(_loc4_);
                    if ((_loc6_ = (_loc5_ = _loc2_.subtract(_loc3_)).x * _loc5_.x + _loc5_.y * _loc5_.y) < _loc1_) {
                        if (_loc9_ != this._targetBuilding) {
                            _loc9_.modifyHealth((this.damage * _loc7_ * ((_loc1_ - _loc6_) / _loc1_)) | 0, this);
                        }
                    }
                }
            }
            _loc1_ = (90 * (1.1 + this.powerUpLevel() * 0.1)) | 0;
            _loc1_ = (_loc1_ * _loc1_) | 0;
            if (this._targetCreep) {
                if ((_loc6_ = (_loc5_ = this._tmpPoint.subtract(this._targetCreep._tmpPoint)).x * _loc5_.x + _loc5_.y * _loc5_.y) < _loc1_) {
                    this._targetCreep.modifyHealth(-(this.damage * _loc7_));
                }
            }
            for (_loc10_ of as3.values(CREATURES._creatures)) {
                if ((_loc10_._behaviour == MonsterBase.k_sBHVR_DEFEND || _loc10_._behaviour == MonsterBase.k_sBHVR_BUNKER) && _loc10_ != this._targetCreep) {
                    if ((_loc8_ = (_loc6_ = (_loc5_ = _loc2_.subtract(_loc3_)).x * _loc5_.x + _loc5_.y * _loc5_.y) | 0) < _loc1_) {
                        _loc10_.modifyHealth(-((this.damage * _loc7_ * _loc10_._damageMult * ((_loc1_ - _loc8_) / _loc1_)) | 0));
                    }
                }
            }
            if (CREATURES._guardian && CREATURES._guardian._behaviour == MonsterBase.k_sBHVR_DEFEND && CREATURES._guardian != this._targetCreep) {
                if ((_loc6_ = (_loc5_ = CREATURES._guardian._tmpPoint.subtract(this._tmpPoint)).x * _loc5_.x + _loc5_.y * _loc5_.y) < _loc1_) {
                    _loc11_ = _loc7_;
                    if (CREATURES._guardian._movement == "fly") {
                        _loc11_ = 0.1 * (0.1 * _loc7_);
                    }
                    CREATURES._guardian.modifyHealth(-((this.damage * _loc11_ * ((_loc1_ - _loc6_) / _loc1_)) | 0));
                }
            }
            ATTACK.Log("creep" + this._id, "<font color=\"#0000FF\">" + KEYS.Get("attack_log_eyera") + "</font>");
            EFFECTS.Scorch(this._tmpPoint);
        } else {
            _loc12_ = 1;
            _loc1_ = (90 * (1.1 + this.powerUpLevel() * 0.1)) | 0;
            if (Boolean(GLOBAL._monsterOverdrive) && GLOBAL._monsterOverdrive.Get() >= GLOBAL.Timestamp()) {
                _loc12_ *= 1.25;
            }
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - (45 + 20 * (this.powerUpLevel() - 1)), (this.damage * _loc12_) | 0, this._mc.visible);
            this._targetCreeps = Targeting.getCreepsInRange(_loc1_, this._tmpPoint, Targeting.getOldStyleTargets(-1));
            _loc13_ = 0;
            while (_loc13_ < this._targetCreeps.length) {
                _loc14_ = this._targetCreeps[_loc13_].creep;
                if (_loc13_ == 0) {
                    _loc15_ = _loc12_;
                } else {
                    _loc15_ = _loc12_ * ((_loc1_ - this._targetCreeps[_loc13_].dist) / _loc1_);
                }
                _loc14_.modifyHealth(-(this.damage * _loc15_ * _loc7_ * _loc14_._damageMult));
                _loc13_++;
            }
            _loc1_ = 90;
            _loc12_ = 0.1 * this.powerUpLevel() + 0.1;
            if (Boolean(GLOBAL._monsterOverdrive) && GLOBAL._monsterOverdrive.Get() >= GLOBAL.Timestamp()) {
                _loc12_ *= 1.25;
            }
            this._targetCreeps = Targeting.getCreepsInRange(_loc1_, this._tmpPoint, Targeting.getOldStyleTargets(2));
            _loc13_ = 0;
            while (_loc13_ < this._targetCreeps.length) {
                _loc14_ = this._targetCreeps[_loc13_].creep;
                if (_loc13_ == 0) {
                    _loc15_ = _loc12_;
                } else {
                    _loc15_ = _loc12_ * ((_loc1_ - this._targetCreeps[_loc13_].dist) / _loc1_);
                }
                _loc14_.modifyHealth(-(this.damage * _loc15_ * _loc7_ * _loc14_._damageMult));
                _loc13_++;
            }
            if (this._homeBunker) {
                if (Boolean(this._homeBunker._monsters) && !this._defenderRemoved) {
                    if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
                        this._homeBunker._monsters[this._creatureID] = (this._homeBunker._monsters[this._creatureID] | 0) - 1;
                        if (this._homeBunker._monsters[this._creatureID] < 0) {
                            this._homeBunker._monsters[this._creatureID] = 0;
                        }
                    } else {
                        this.setHealth(0);
                        GLOBAL.player.monsterListByID(this._creatureID).unlinkCreepFromData(this);
                    }
                    this._homeBunker._monstersDispatched[this._creatureID] = (this._homeBunker._monstersDispatched[this._creatureID] | 0) - 1;
                    if (this._homeBunker._monstersDispatched[this._creatureID] < 0) {
                        this._homeBunker._monstersDispatched[this._creatureID] = 0;
                    }
                    --this._homeBunker._monstersDispatchedTotal;
                    if (this._homeBunker._monstersDispatchedTotal < 0) {
                        this._homeBunker._monstersDispatchedTotal = 0;
                    }
                    this._defenderRemoved = true;
                }
            }
        }
        this.setHealth(0);
    }

    private applyInfernoVenom(): void {
        if (!this.m_bInfernoCreep && BASE.isInfernoMainYardOrOutpost && (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == "wmattack")) {
            this._damagePerSecond.Add(10);
        }
    }
}
