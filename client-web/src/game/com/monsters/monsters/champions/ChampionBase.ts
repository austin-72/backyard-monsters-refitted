import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { ATTACK, AdditionPropertyModifier, BASE, BFOUNDATION, BMUSHROOM, BTOWER, BYMConfig, Bounce, Bunker, CHAMPIONCAGE, CModifiableProperty, CREATURES, CREEPS, Decoy, FIREBALLS, GLOBAL, GRID, ILootable, ITargetable, InstanceManager, KEYS, Krallen, LOGGER, LOGIN, MAP, MONSTERBUNKER, MonsterBase, PATHING, POPUPS, QUESTS, RasterData, SOUNDS, SPECIALEVENT, SPRITES, STORE, SecNum, SiegeWeapon, SiegeWeapons, Sine, Targeting, TweenLite } from "@game";

export class ChampionBase extends MonsterBase {
    static {
        as3.fields(this, { _behaviourMode: "defend", _attackType: "melee", _feeds: null, _feedTime: null, _level: null, _foodBonus: null, _powerLevel: null, _warned: false, _warnStarve: false, _spriteID: null, _name: null, _regen: 0, _buff: 0, _buffRadius: 0, _helpCreep: undefined, _type: 1, _lastHeal: 0, DEFENSE_RANGE: 30, DEFENSE_MODIFIER: 1, m_status: 0 });
    }

    public static readonly k_CHAMPION_STATUS_NORMAL: int = 0;

    public static readonly k_CHAMPION_STATUS_FROZEN: int = 1;

    public static readonly k_CHAMPION_STATUS_JUICED: int = 2;

    public static readonly k_CHAMPION_STATUS_DESTROYED: int = 3;

    public static readonly k_CHAMPION_STATUS_REFUND: int = 4;

    public static readonly k_CHAMPION_STATUS_MIGRATED: int = 5;
    public _behaviourMode: string;
    public _attackType: string;
    public _feeds: SecNum;
    public _feedTime: SecNum;
    public _level: SecNum;
    public _foodBonus: SecNum;
    public _powerLevel: SecNum;
    public _warned: boolean;
    public _warnStarve: boolean;
    public _spriteID: string;
    public _name: string;
    public _regen: int;
    public _buff: number;
    public _buffRadius: number;
    public _helpCreep: any;
    public _type: int;
    public _lastHeal: int;
    public DEFENSE_RANGE: int;
    public DEFENSE_MODIFIER: number;
    public m_status: int;

    public $ctor(param1?: any /* string */, param2?: Point, param3?: number, param4: Point = null, param5: boolean = false, param6: BFOUNDATION = null, param7: int = 1, param8: int = 0, param9: int = 0, param10: int = 1, param11: int = 20000, param12: int = 0, param13: int = 0): void {
        super.$ctor();
        let _loc14_: int = getTimer();
        this._friendly = param5;
        this.setInitialFriendlyFlags(this._friendly);
        if (param7 < 1) {
            param7 = 1;
        }
        this._level = new SecNum(param7);
        this.m_status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
        this._middle = (param7 * 5) | 0;
        this._creatureID = "G" + param10;
        this._feeds = new SecNum(param8);
        if (param9 > 0) {
            this._feedTime = new SecNum(param9);
        } else {
            this._feedTime = new SecNum((GLOBAL.Timestamp() + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, param7, "feedTime")) | 0);
        }
        if (param12) {
            this._foodBonus = new SecNum(param12);
        } else {
            this._foodBonus = new SecNum(0);
        }
        if (param13) {
            this._powerLevel = new SecNum(param13);
        } else {
            this._powerLevel = new SecNum(0);
        }
        this._lastHeal = GLOBAL.Timestamp();
        this._house = param6;
        this._hits = 0;
        this._type = param10;
        this._pathing = "";
        this._spawnTime = GLOBAL.Timestamp();
        this._spawnPoint = new Point(((param2.x / 100) | 0) * 100, ((param2.y / 100) | 0) * 100);
        this._targetGroup = 3;
        this._waypoints = [];
        this._targetCreeps = [];
        this._targetCreep = null;
        this.graphic.mouseEnabled = false;
        this.graphic.mouseChildren = false;
        this._speed = 0;
        if (this._foodBonus.Get() > 0) {
            this.moveSpeedProperty.value = (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "speed") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusSpeed")) / 2;
        } else {
            this.moveSpeedProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "speed") / 2;
        }
        if (this._foodBonus.Get() > 0) {
            this.maxHealthProperty.value = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusHealth"));
        } else {
            this.maxHealthProperty.value = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health"));
        }
        this._regen = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "healtime") | 0;
        if (param11 > 0 && param11 <= this.maxHealth) {
            this.setHealth(param11);
        } else if (param11 >= this.maxHealth) {
            this.setHealth(this.maxHealth);
        } else {
            this.setHealth(1);
        }
        if (this._foodBonus.Get() > 0) {
            this.damageProperty.value = (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "damage") | 0) + (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusDamage") | 0);
            this.m_range = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusRange"));
        } else {
            this.damageProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "damage") | 0;
            this.m_range = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range"));
        }
        this._movement = as3.str(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "movement"));
        if (this._foodBonus.Get() > 0) {
            this._buff = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffs") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusBuffs"));
        } else {
            this._buff = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffs"));
        }
        if (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffRadius")) {
            this._buffRadius = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffRadius"));
        }
        this._behaviour = param1;
        this.attackDelayProperty.value = 56;
        this._targetPosition = param2;
        this._targetCenter = param4;
        this.graphic.x = this._targetPosition.x;
        this.graphic.y = this._targetPosition.y;
        this._tmpPoint.x = this.x;
        this._tmpPoint.y = this.y;
        if (param3) {
            this._targetRotation = param3;
        } else {
            this._targetRotation = 0;
        }
        this.m_rotation = this._targetRotation;
        this._attacking = false;
        this.attackFlags |= Targeting.k_TARGETS_GROUND;
        this.setupSprite();
        if (this._movement == "fly") {
            this._altitude = 108;
            this.defenseFlags |= Targeting.k_TARGETS_FLYING;
        } else {
            this._altitude = 0;
            this.defenseFlags |= Targeting.k_TARGETS_GROUND;
        }
        if (this._behaviour == "bounce") {
            if (GLOBAL._render && this._movement != "fly") {
                this._graphicMC.y -= 90;
                TweenLite.to(this._graphicMC, 0.6, { "y": this._graphicMC.y + 90, "ease": Bounce.easeOut, "onComplete": as3.bind(this, this.changeModeAttack) });
            } else {
                if (this._movement == "fly") {
                    this._graphicMC.y -= this._altitude;
                } else {
                    this._altitude = 0;
                }
                this.changeModeAttack();
            }
        } else if (this._behaviour == "defend") {
            this._altitude = 0;
            this.changeModeDefend();
        } else if (this._behaviour == "decoy") {
            this.changeModeDecoy();
        }
        if (this._behaviour == "juice") {
            this.changeModeJuice();
        }
        this.render();
        this.graphic.mouseEnabled = false;
        this.graphic.mouseChildren = false;
        as3.cast(this.getComponentByName(MonsterBase.k_LOOT_PROPERTY), CModifiableProperty).addModifier(new AdditionPropertyModifier(1.5));
    }

    public static show(): void {
    }

    protected setupSprite(): void {
        this._frameNumber = (Math.random() * 7) | 0;
        this._spriteID = this._creatureID + "_" + Math.min(this._level.Get(), CHAMPIONCAGE.GetGuardianProperties(this._creatureID, "health").length);
        SPRITES.SetupSprite(this._spriteID);
        if (this._movement == "fly") {
            SPRITES.SetupSprite("bigshadow");
            this._shadow = new BitmapData(52, 50, true, 16777215);
            this._shadowMC = as3.cast(BYMConfig.instance.RENDERER_ON ? new Bitmap(this._shadow) : this.graphic.addChild(new Bitmap(this._shadow)), DisplayObject);
            this._shadowMC.x = -21;
            this._shadowMC.y = -26;
            this._frameNumber = (Math.random() * 1000) | 0;
        }
        let _loc1_: any = SPRITES.GetSpriteDescriptor(this._spriteID);
        this._graphic = new BitmapData(_loc1_.width, _loc1_.height, true, 16777215);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "offset_x"));
        this._graphicMC.y = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "offset_y"));
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphicMC, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
            if (this._movement === "fly") {
                this._shadowData = new RasterData(as3.cast(this._shadow, IBitmapDrawable), this._shadowPt, MAP.DEPTH_SHADOW, null, true);
            }
        }
    }

    public override changeModeJuice(): void {
        this._behaviour = "juice";
        this.changeMode();
        this._targetBuilding = GLOBAL._bJuicer;
        if (this._movement == "fly" && this._altitude < 60) {
            if (BYMConfig.instance.RENDERER_ON) {
                TweenLite.to(this._rasterPt, 2, { "y": this._rasterPt.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
            } else {
                TweenLite.to(this._graphicMC, 2, { "y": this._graphicMC.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
            }
        }
        ++CREATURES._creatureID;
        ++CREATURES._creatureCount;
        CREATURES._creatures[CREATURES._creatureID] = this;
        let _loc1_: int = BASE.getGuardianIndex(CREATURES._guardian._type);
        as3.vget(BASE._guardianData, _loc1_).status = ChampionBase.k_CHAMPION_STATUS_JUICED;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc1_ = GLOBAL.getPlayerGuardianIndex(CREATURES._guardian._type);
            if (_loc1_ != -1) {
                as3.vget(GLOBAL._playerGuardianData, _loc1_).status = ChampionBase.k_CHAMPION_STATUS_JUICED;
            }
        }
        CREATURES._guardian = null;
        BASE.Save();
        PATHING.GetPath(this._tmpPoint, new Rectangle(this._targetBuilding._mc.x, this._targetBuilding._mc.y, 80, 80), as3.bind(this, this.setWaypoints), true);
    }

    public override changeModeAttack(): void {
        this.changeMode();
        this._behaviour = GLOBAL.e_BASE_MODE.ATTACK;
        this._targetCreep = null;
        this.findTarget(0);
    }

    public changeModeCage(): void {
        this.changeMode();
        this._behaviour = "cage";
        this._attacking = false;
        let _loc1_: Point = new Point(this._house._mc.x + 50, this._house._mc.y + 60);
        this._targetCenter = GRID.FromISO(GLOBAL._bCage._mc.x, GLOBAL._bCage._mc.y);
        PATHING.GetPath(this._tmpPoint, new Rectangle(_loc1_.x, _loc1_.y, 10, 10), as3.bind(this, this.setWaypoints), true);
        this._house = GLOBAL._bCage;
    }

    public changeModeFreeze(): void {
        this.changeMode();
        this._behaviour = "freeze";
        this._attacking = false;
        ++CREATURES._creatureID;
        ++CREATURES._creatureCount;
        CREATURES._creatures[CREATURES._creatureID] = this;
        PATHING.GetPath(this._tmpPoint, new Rectangle(GLOBAL._bChamber._mc.x, GLOBAL._bChamber._mc.y, 80, 80), as3.bind(this, this.setWaypoints), true);
    }

    public changeModeDefend(): void {
        this.changeMode();
        this._behaviour = MonsterBase.k_sBHVR_DEFEND;
    }

    public changeModeDecoy(): void {
        let _loc2_: Decoy = null;
        let _loc3_: Rectangle = null;
        let _loc4_: number = NaN;
        let _loc5_: number = NaN;
        let _loc6_: Point = null;
        let _loc7_: Point = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: Point = null;
        let _loc1_: SiegeWeapon = SiegeWeapons.activeWeapon;
        if (Boolean(_loc1_) && _loc1_ instanceof Decoy) {
            this.changeMode();
            this._behaviour = "decoy";
            this._attacking = false;
            this._targetCreep = null;
            _loc2_ = as3.as(_loc1_, Decoy);
            _loc3_ = new Rectangle(_loc2_.x, _loc2_.y + _loc2_.decoyGraphic.height / 2, 40, 40);
            this._targetCenter = new Point(_loc3_.x, _loc3_.y);
            if (this._movement == "burrow") {
                this._hasTarget = true;
                this._hasPath = true;
                _loc7_ = GRID.FromISO(_loc3_.x, _loc3_.y);
                _loc8_ = (Math.random() * 4) | 0;
                _loc9_ = _loc3_.height | 0;
                _loc10_ = _loc3_.width | 0;
                if (_loc8_ == 0) {
                    _loc7_.x += Math.random() * _loc9_;
                    _loc7_.y += _loc10_;
                } else if (_loc8_ == 1) {
                    _loc7_.x += _loc9_;
                    _loc7_.y += _loc10_;
                } else if (_loc8_ == 2) {
                    _loc7_.x += _loc9_ - Math.random() * _loc9_ / 2;
                    _loc7_.y -= _loc10_ / 4;
                } else if (_loc8_ == 3) {
                    _loc7_.x -= _loc9_ / 4;
                    _loc7_.y += _loc10_ - Math.random() * _loc10_ / 2;
                }
                this._waypoints = [GRID.ToISO(_loc7_.x, _loc7_.y, 0)];
                this._targetPosition = as3.cast(this._waypoints[0], Point);
            } else if (this._movement == "fly") {
                this._hasTarget = true;
                this._hasPath = true;
                if (GLOBAL.QuickDistance(this._tmpPoint, this._targetCenter) < 50) {
                    this._atTarget = true;
                    this._hasPath = true;
                    this._targetPosition = this._targetCenter;
                } else {
                    _loc5_ = (_loc5_ = (_loc5_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 90 - 45)) / (180 / Math.PI);
                    _loc4_ = 10 + Math.random() * 10;
                    _loc6_ = new Point(this._targetCenter.x + Math.cos(_loc5_) * _loc4_ * 1.7, this._targetCenter.y + Math.sin(_loc5_) * _loc4_);
                    this._waypoints = [_loc6_];
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                }
            } else {
                _loc5_ = (_loc5_ = (_loc5_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 90 - 45)) / (180 / Math.PI);
                _loc4_ = 10 + Math.random() * 10;
                _loc11_ = new Point(this._targetCenter.x + Math.cos(_loc5_) * _loc4_ * 1.7, this._targetCenter.y + Math.sin(_loc5_) * _loc4_);
                _loc11_.x += Math.random() * -10 + 5;
                _loc11_.y += Math.random() * -10 + 5;
                this._targetPosition = this._targetCenter;
                this.WaypointTo(_loc11_);
            }
        } else {
            this._hasTarget = false;
            this.FindDefenseTargets();
        }
    }

    public click(param1: MouseEvent): void {
        if (GLOBAL.mode == "build") {
            ChampionBase.show();
        }
    }

    public override canShootCreep(): boolean {
        if (this._targetCreep == null) {
            return false;
        }
        if (this._targetCreep._movement == "fly") {
            return false;
        }
        let _loc1_: number = GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint);
        if (_loc1_ > this.m_range) {
            return false;
        }
        if (this._movement == "fly") {
            return true;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetCreep._tmpPoint.x | 0, this._targetCreep._tmpPoint.y | 0)) {
            return true;
        }
        return false;
    }

    protected canHitBuilding(): boolean {
        if (this._targetBuilding == null) {
            return false;
        }
        let _loc1_: number = GLOBAL.QuickDistance(this._targetBuilding._position, this._tmpPoint);
        if (_loc1_ > this.m_range) {
            return false;
        }
        if (this._movement == "fly") {
            return true;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetBuilding._position.x | 0, this._targetBuilding._position.y | 0, this._targetBuilding)) {
            return true;
        }
        return false;
    }

    public clearRasterData(): void {
        if (!BYMConfig.instance.RENDERER_ON) {
            return;
        }
        if (this._rasterData) {
            this._rasterData.clear();
        }
        this._rasterData = null;
        this._rasterPt = null;
    }

    public override clear(): void {
        if (CREATURES._guardian == this) {
            CREATURES._guardian = null;
        }
        if (CREEPS._guardian == this) {
            CREEPS._guardian = null;
        }
        super.clear();
    }

    public interceptTarget(): void {
        this._intercepting = false;
        this._looking = true;
        if (this._movement == "fly" && this._altitude < 60) {
            if (BYMConfig.instance.RENDERER_ON) {
                TweenLite.to(this._rasterPt, 2, { "y": this._rasterPt.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
            } else {
                TweenLite.to(this._graphicMC, 2, { "y": this._graphicMC.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
            }
            this._altitude = 61;
        }
        if (GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range) {
            this._atTarget = true;
            this._looking = false;
        } else if (this._noDefensePath || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range * 2 || this._movement == "fly") {
            this._waypoints = [this._targetCreep._tmpPoint];
            this._targetPosition = this._targetCreep._tmpPoint;
        } else if (this._targetCreep._atTarget || this._targetCreep._waypoints.length < 8 || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 250) {
            this.WaypointTo(this._targetCreep._tmpPoint, null);
        } else {
            this.WaypointTo(as3.cast(this._targetCreep._waypoints[7], Point), null);
            this._intercepting = true;
        }
        this._hasTarget = true;
    }

    protected getTargetCreeps(): void {
        this._targetCreeps = Targeting.getCreepsInRange(800, this._tmpPoint, this.attackFlags);
    }

    public FindDefenseTargets(): void {
        let _loc1_: any[] = null;
        let _loc2_: boolean = true;
        this.getTargetCreeps();
        if (this._targetCreeps.length > 0) {
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            while (this._targetCreeps.length > 0 && (this._targetCreeps[0].creep._behaviour == "retreat" || this._movement != "fly" && this._targetCreeps[0].creep._creatureID == "C5")) {
                this._targetCreeps.splice(0, 1);
            }
        }
        if (this._targetCreeps.length > 0) {
            this._targetCreep = as3.cast(this._targetCreeps[0].creep, MonsterBase);
            this.interceptTarget();
            if (this._movement == "fly" && this._altitude < 60) {
                if (BYMConfig.instance.RENDERER_ON) {
                    TweenLite.to(this._rasterPt, 2, { "y": this._rasterPt.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
                } else {
                    TweenLite.to(this._graphicMC, 2, { "y": this._graphicMC.y - (108 - this._altitude), "ease": Sine.easeIn, "onComplete": as3.bind(this, this.flyerTakeOff) });
                }
            }
            this._behaviour = "defend";
        } else if (Boolean(this._targetCreep) && this._targetCreep.health > 0) {
            if (this._movement == "fly") {
                this.interceptTarget();
            }
            this._behaviour = "defend";
        } else if (this._behaviour != "cage" && this._behaviour != "pen") {
            this._atTarget = false;
            this.changeModeCage();
        }
    }

    public override findTarget(param1: int = 0): void {
        let _loc3_: any = null;
        let _loc4_: BFOUNDATION = null;
        let _loc5_: BFOUNDATION = null;
        let _loc6_: Point = null;
        let _loc7_: Point = null;
        let _loc8_: Point = null;
        let _loc9_: int = 0;
        let _loc10_: any[] = null;
        let _loc11_: any = null;
        let _loc13_: Vector<any> = null;
        let _loc14_: Vector<any> = null;
        let _loc15_: int = 0;
        let _loc16_: Point = null;
        let _loc17_: int = 0;
        let _loc18_: int = 0;
        let _loc19_: int = 0;
        let _loc20_: number = NaN;
        let _loc21_: number = NaN;
        let _loc22_: Point = null;
        let _loc2_: int = getTimer();
        _loc10_ = [];
        this._looking = true;
        _loc7_ = PATHING.FromISO(this._tmpPoint);
        let _loc12_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc12_ ?? [])) {
            if (_loc4_.health > 0 && (_loc4_._class == "resource" || _loc4_._type == 6 || _loc4_._type == 14 || _loc4_._type == 112)) {
                _loc8_ = GRID.FromISO(_loc4_._mc.x, _loc4_._mc.y + _loc4_._middle);
                _loc9_ = (GLOBAL.QuickDistance(_loc7_, _loc8_) - _loc4_._middle) | 0;
                _loc10_.push({ "building": _loc4_, "distance": _loc9_ });
            }
        }
        _loc13_ = InstanceManager.getInstancesByClass(BTOWER);
        for (_loc4_ of (_loc13_ ?? [])) {
            if (_loc4_.health > 0 && !(as3.as(_loc4_, BTOWER)).isJard) {
                _loc8_ = GRID.FromISO(_loc4_._mc.x, _loc4_._mc.y + _loc4_._middle);
                _loc9_ = (GLOBAL.QuickDistance(_loc7_, _loc8_) - _loc4_._middle) | 0;
                _loc10_.push({ "building": _loc4_, "distance": _loc9_, "expand": false });
            }
        }
        _loc14_ = InstanceManager.getInstancesByClass(Bunker);
        for (_loc4_ of (_loc14_ ?? [])) {
            if ((_loc11_ = _loc4_).health > 0 && (_loc11_._used > 0 || _loc11_._monstersDispatchedTotal > 0)) {
                _loc8_ = GRID.FromISO(_loc4_._mc.x, _loc4_._mc.y + _loc4_._middle);
                _loc9_ = (GLOBAL.QuickDistance(_loc7_, _loc8_) - _loc4_._middle) | 0;
                _loc10_.push({ "building": _loc4_, "distance": _loc9_, "expand": false });
            }
        }
        if (_loc10_.length == 0) {
            for (_loc4_ of as3.values(BASE._buildingsMain)) {
                if (_loc4_ instanceof BMUSHROOM === false && _loc4_._class != "decoration" && _loc4_._class != "immovable" && _loc4_.health > 0 && _loc4_._class != "enemy") {
                    if (_loc4_._class == "tower" && _loc4_ instanceof Bunker === false) {
                        if ((as3.as(_loc4_, BTOWER)).isJard) {
                            continue;
                        }
                    }
                    _loc8_ = GRID.FromISO(_loc4_._mc.x, _loc4_._mc.y + _loc4_._middle);
                    _loc9_ = (GLOBAL.QuickDistance(_loc7_, _loc8_) - _loc4_._middle) | 0;
                    _loc10_.push({ "building": _loc4_, "distance": _loc9_, "expand": true });
                }
            }
        }
        if (_loc10_.length == 0) {
            this.changeModeRetreat();
        } else {
            as3.sortOn(_loc10_, "distance", Array.NUMERIC);
            _loc15_ = 0;
            if (this._movement == "burrow") {
                this._hasTarget = true;
                this._hasPath = true;
                _loc16_ = GRID.FromISO(Number(_loc10_[_loc15_].building._mc.x), Number(_loc10_[_loc15_].building._mc.y));
                _loc17_ = (Math.random() * 4) | 0;
                _loc18_ = _loc10_[_loc15_].building._footprint[0].height | 0;
                _loc19_ = _loc10_[_loc15_].building._footprint[0].width | 0;
                if (_loc17_ == 0) {
                    _loc16_.x += Math.random() * _loc18_;
                    _loc16_.y += _loc19_;
                } else if (_loc17_ == 1) {
                    _loc16_.x += _loc18_;
                    _loc16_.y += _loc19_;
                } else if (_loc17_ == 2) {
                    _loc16_.x += _loc18_ - Math.random() * _loc18_ / 2;
                    _loc16_.y -= _loc19_ / 4;
                } else if (_loc17_ == 3) {
                    _loc16_.x -= _loc18_ / 4;
                    _loc16_.y += _loc19_ - Math.random() * _loc19_ / 2;
                }
                this._waypoints = [GRID.ToISO(_loc16_.x, _loc16_.y, 0)];
                this._targetPosition = as3.cast(this._waypoints[0], Point);
                this._targetBuilding = as3.cast(_loc10_[_loc15_].building, BFOUNDATION);
            } else if (this._movement == "fly") {
                this._hasTarget = true;
                this._hasPath = true;
                this._targetBuilding = as3.cast(_loc10_[_loc15_].building, BFOUNDATION);
                this._targetCenter = this._targetBuilding._position;
                if (GLOBAL.QuickDistance(this._tmpPoint, this._targetCenter) < 170) {
                    this._atTarget = true;
                    this._hasPath = true;
                    this._targetPosition = this._targetCenter;
                } else {
                    _loc20_ = (_loc20_ = (_loc20_ = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 40 - 20)) / (180 / Math.PI);
                    _loc21_ = 120 + Math.random() * 10;
                    _loc22_ = new Point(this._targetCenter.x + Math.cos(_loc20_) * _loc21_ * 1.7, this._targetCenter.y + Math.sin(_loc20_) * _loc21_);
                    this._waypoints = [_loc22_];
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                }
            } else if (GLOBAL._catchup) {
                this.WaypointTo(new Point(_loc10_[0].building._mc.x, _loc10_[0].building._mc.y), as3.cast(_loc10_[0].building, BFOUNDATION));
            } else {
                _loc15_ = 0;
                while (_loc15_ < 2) {
                    if (_loc10_.length > _loc15_) {
                        this.WaypointTo(new Point(_loc10_[_loc15_].building._mc.x, _loc10_[_loc15_].building._mc.y), as3.cast(_loc10_[_loc15_].building, BFOUNDATION));
                    }
                    _loc15_++;
                }
            }
        }
    }

    public override setWaypoints(param1: any[], param2: BFOUNDATION = null, param3: boolean = false): void {
        let _loc4_: boolean = false;
        if (param3) {
            if (this._behaviour == GLOBAL.e_BASE_MODE.ATTACK) {
                this.findTarget();
            }
            if (this._behaviour == "cage") {
                this.changeModeCage();
            }
            if (this._behaviour == "retreat") {
                this.changeModeRetreat();
            }
        } else {
            _loc4_ = false;
            if (param1.length < this._waypoints.length) {
                _loc4_ = true;
            }
            if (_loc4_ && param2 && param2._class == "wall" && this._targetGroup != 2) {
                _loc4_ = false;
            }
            if (!this._hasTarget) {
                _loc4_ = true;
            }
            if (this._behaviour == "defend") {
                _loc4_ = true;
            }
            if (_loc4_) {
                this._hasTarget = true;
                this._atTarget = false;
                this._hasPath = true;
                this._waypoints = param1;
                this._targetPosition = as3.cast(this._waypoints[0], Point);
                if (param2) {
                    this._targetBuilding = param2;
                }
            }
            this._looking = false;
        }
    }

    public levelSet(param1: int, param2: int = 0): void {
        let _loc3_: any = null;
        if (param1 != this._level.Get()) {
            this._level = new SecNum(param1);
            if (this instanceof Krallen) {
                this._spriteID = this._creatureID + "_" + this._powerLevel.Get();
            } else {
                this._spriteID = this._creatureID + "_" + param1;
            }
            if (this._graphicMC.parent) {
                this._graphicMC.parent.removeChild(this._graphicMC);
            }
            SPRITES.SetupSprite(this._spriteID);
            _loc3_ = SPRITES.GetSpriteDescriptor(this._spriteID);
            this._graphic = new BitmapData(_loc3_.width, _loc3_.height, true, 16777215);
            this._graphicMC = !BYMConfig.instance.RENDERER_ON ? as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap) : new Bitmap(this._graphic);
            if (BYMConfig.instance.RENDERER_ON && Boolean(this._rasterData)) {
                this._rasterData.data = as3.cast(this._graphic, IBitmapDrawable);
            }
            if (this instanceof Krallen) {
                this._graphicMC.x = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._powerLevel.Get() | 0, "offset_x"));
                this._graphicMC.y = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._powerLevel.Get() | 0, "offset_y"));
            } else {
                this._graphicMC.x = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "offset_x"));
                this._graphicMC.y = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "offset_y"));
            }
            this._feeds = new SecNum(0);
            this._feedTime = new SecNum((GLOBAL.Timestamp() + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, param1, "feedTime")) | 0);
            LOGGER.Log("fed", "level " + this._level.Get());
            this.maxHealthProperty.value = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health"));
            this.moveSpeedProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "speed") / 2;
            this._regen = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "healtime") | 0;
            this.setHealth(this.maxHealth);
            this.damageProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "damage") | 0;
            this.m_range = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range"));
            this._movement = as3.str(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "movement"));
            if (param1 >= 6) {
                QUESTS.Check("upgrade_champ" + this._creatureID.substr(1, 1), 1);
            }
            LOGGER.Stat([57, this._creatureID, param2, this._level.Get()]);
            BASE.Save();
        }
    }

    protected tickBAttack(): void {
        if (this.health <= 0) {
            Targeting.CreepCellDelete(this._id, this.node);
            let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
            if (!activeEvent.active) {
                this.changeModeRetreat();
                ATTACK.Log(this._creatureID, LOGIN._playerName + "\'s Level " + this._level.Get() + " " + CHAMPIONCAGE._guardians[this._creatureID].name + " retreated.");
                SOUNDS.Play("monsterland" + (1 + ((Math.random() * 3) | 0)));
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                    LOGGER.Stat([54, this._creatureID, 1, this._level.Get()]);
                }
            }
            BASE.Save();
            return;
        }
        if (this._hasTarget) {
            if (!this._targetCreep) {
                if (this._targetBuilding == null || this._targetBuilding.health <= 0 || this._targetBuilding._class == "tower" && !MONSTERBUNKER.isBunkerBuilding(this._targetBuilding._type) && (as3.as(this._targetBuilding, BTOWER)).isJard) {
                    this.loseTarget();
                    this.findTarget();
                }
            } else if (this._targetCreep.health <= 0) {
                this.loseTarget();
                this.findTarget();
            }
        }
        if (!this._looking && !this._attacking && this._frameNumber % (GLOBAL._catchup ? 200 : 100) == 0) {
            this.findTarget(0);
        }
        if (this._atTarget) {
            this._attacking = true;
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                this.doAttackDamage();
                SOUNDS.Play("hit" + ((4 + Math.random() * 1) | 0), 0.1 + Math.random() * 0.1);
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
        }
    }

    protected doAttackDamage(): void {
        let _loc1_: number = 1;
        if (Boolean(this._targetBuilding) && this._targetBuilding._fortification.Get() > 0) {
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, (this.damage * _loc1_ * (100 - (this._targetBuilding._fortification.Get() * 10 + 10)) / 100) | 0, this._mc.visible);
        } else {
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, (this.damage * _loc1_) | 0, this._mc.visible);
        }
        if (this._targetCreep) {
            this._targetCreep.modifyHealth(-(this.damage * _loc1_));
        } else if (this._targetBuilding) {
            this._targetBuilding.modifyHealth(this.damage * _loc1_, this);
            if (this._creatureID === "G5" && as3.is(this._targetBuilding, ILootable)) {
                if (this._targetBuilding._looted) {
                    this.findTarget();
                }
            }
        } else {
            this.findTarget();
        }
    }

    public override modifyHealth(param1: number, param2: ITargetable = null): number {
        return super.modifyHealth(param1, param2);
    }

    protected tickBDefend(): void {
        if (this.health <= 0) {
            ATTACK.Log(this._creatureID, KEYS.Get("attacklog_champ_injured", { "v1": BASE._ownerName, "v2": this._level.Get(), "v3": CHAMPIONCAGE._guardians[this._creatureID].name }));
            this.changeModeRetreat();
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                LOGGER.Stat([56, this._creatureID, 1, this._level.Get()]);
            }
            BASE.Save();
            return;
        }
        if (this._hasTarget) {
            if (this._targetCreep.health <= 0) {
                this._hasTarget = false;
                this._atTarget = false;
                this._hasPath = false;
                this._attacking = false;
                this.FindDefenseTargets();
            } else if (GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range) {
                this._atTarget = true;
            } else if (this._creatureID == "G4" && this._targetCreep._movement == "fly" && GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range * 2) {
                this._atTarget = true;
            } else if (!this._attacking && this._frameNumber % 60 == 0) {
                this.FindDefenseTargets();
            } else if (this._attacking && GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) > this.m_range * 2) {
                this._attacking = false;
                this._atTarget = false;
                this._hasPath = false;
                this.FindDefenseTargets();
            }
        }
        if (this._atTarget) {
            this._attacking = true;
            this._intercepting = false;
            if (this._movement != "fly" || this._targetCreep._creatureID == "C14" || this._targetCreep._creatureID == "C12" && this._targetCreep.poweredUp() || this._targetCreep._creatureID == "G3" || this._targetCreep._creatureID == "G4" || this._targetCreep._creatureID == "IC7" || this._targetCreep._creatureID == "IC5") {
                if (this._targetCreep._behaviour != "heal") {
                    this._targetCreep._targetCreep = this;
                    if (this._targetCreep._creatureID == "C14" || this._targetCreep._creatureID == "IC7" || this._targetCreep._creatureID == "C12" && this._targetCreep.poweredUp() || this._targetCreep._creatureID == "G3" || this._targetCreep._creatureID == "G4" || (GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 50 || this._targetCreep._creatureID.substr(0, 1) == "G") && this._movement != "fly") {
                        this._targetCreep._atTarget = true;
                    } else {
                        this._targetCreep._atTarget = false;
                        this._targetCreep._waypoints = [this._tmpPoint];
                    }
                    this._targetCreep._hasTarget = true;
                    this._targetCreep._looking = false;
                }
            }
            if (this.attackCooldown <= 0) {
                this.attackCooldown += this.attackDelay | 0;
                this.doDefenseDamage();
                this.aggro();
            } else {
                --this.attackCooldown;
            }
        } else {
            this._attacking = false;
        }
    }

    protected aggro(): void {
        if (Targeting.canHitCreep(this._targetCreep.attackFlags, this.defenseFlags)) {
            if (!this._targetCreep._explode && !this._targetCreep._targetCreep && this._targetCreep._behaviour != "heal") {
                this._targetCreep._targetCreep = this;
                if (this._targetCreep.canShootCreep() || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 50) {
                    this._targetCreep._atTarget = true;
                } else {
                    this._targetCreep._atTarget = false;
                    this._targetCreep._waypoints = [this._tmpPoint];
                }
                this._targetCreep._hasTarget = true;
                this._targetCreep._looking = false;
            }
        }
        let _loc1_: any[] = Targeting.getCreepsInRange(50, this._tmpPoint, Targeting.getOldStyleTargets(0));
        let _loc2_: int = _loc1_.length | 0;
        let _loc3_: int = 0;
        while (_loc3_ < 5 && _loc3_ < _loc2_) {
            if (Targeting.canHitCreep(_loc1_[_loc3_].creep.attackFlags | 0, this.defenseFlags) && (_loc1_[_loc3_].creep.canShootCreep() || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 50)) {
                if (!_loc1_[_loc3_].creep._explode && _loc1_[_loc3_].creep._behaviour != "heal") {
                    _loc1_[_loc3_].creep._targetCreep = this;
                    if (_loc1_[_loc3_].creep.canShootCreep() || GLOBAL.QuickDistance(as3.cast(_loc1_[_loc3_].creep._tmpPoint, Point), this._tmpPoint) < 50 || _loc1_[_loc3_].creep._creatureID == "C14") {
                        _loc1_[_loc3_].creep._atTarget = true;
                    }
                    _loc1_[_loc3_].creep._hasTarget = true;
                }
            }
            _loc3_++;
        }
    }

    protected doDefenseDamage(): void {
        let _loc1_: Point = null;
        if (this._creatureID == "G3") {
            _loc1_ = Point.interpolate(this._tmpPoint.add(new Point(0, -this._altitude)), this._targetCreep._tmpPoint, 0.8);
            FIREBALLS.Spawn2(_loc1_, this._targetCreep._tmpPoint, this._targetCreep, 8, this.damage | 0, 0, FIREBALLS.TYPE_FIREBALL, 1, this);
            FIREBALLS._fireballs[FIREBALLS._id - 1]._graphic.gotoAndStop(3);
        } else {
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, this.damage | 0, this._mc.visible);
            this._targetCreep.modifyHealth(-this.damage);
        }
    }

    public tickBJuice(param1: int): boolean {
        if (this.health <= 0) {
            this.setHealth(0);
            Targeting.CreepCellDelete(this._id, this.node);
            this.changeModeRetreat();
            return false;
        }
        if (this._atTarget) {
            if (this._movement == "fly") {
                if (!this.dying) {
                    this._dying = true;
                    if (BYMConfig.instance.RENDERER_ON) {
                        TweenLite.to(this._rasterPt, 0.9, { "y": this._rasterPt.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerJuice) });
                    } else {
                        TweenLite.to(this._graphicMC, 0.9, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerJuice) });
                    }
                }
                if (!this.m_juiceReady) {
                    return false;
                }
            }
            GLOBAL._bJuicer.BlendGuardian(100 * 10 ^ this._level.Get() / 2);
            return true;
        }
        return false;
    }

    public tickBFreeze(param1: int): boolean {
        if (this._atTarget) {
            return true;
        }
        return false;
    }

    public tickBDecoy(): boolean {
        if (this.health <= 0) {
            ATTACK.Log(this._creatureID, KEYS.Get("attacklog_champ_injured", { "v1": BASE._ownerName, "v2": this._level.Get(), "v3": CHAMPIONCAGE._guardians[this._creatureID].name }));
            this.changeModeRetreat();
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                LOGGER.Stat([56, this._creatureID, 1, this._level.Get()]);
            }
            BASE.Save();
            return false;
        }
        if (!(SiegeWeapons.activeWeapon && SiegeWeapons.activeWeapon instanceof Decoy)) {
            this._hasTarget = false;
            this._atTarget = false;
            this._attacking = false;
            this._hasPath = false;
            this.FindDefenseTargets();
        }
        return false;
    }

    public flyerLanded(): void {
        this._altitude = 0;
    }

    public flyerTakeOff(): void {
        this._altitude = 108;
    }

    public override poweredUp(): boolean {
        return false;
    }

    public tickBPen(param1: int): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: number = NaN;
        if (this.health < this.maxHealth) {
            if (this._lastHeal <= GLOBAL.Timestamp() - 5 || GLOBAL._catchup && BASE.firstBaseLoaded) {
                this.modifyHealth(((this.maxHealth * 5 / this._regen) | 0) * param1);
                this.setHealth(Math.min(this.health, this.maxHealth));
                this._lastHeal = GLOBAL.Timestamp();
            }
        }
        if (this._behaviourMode == "defend" && this._frameNumber % 200 == 0) {
            this.FindDefenseTargets();
        }
        if (this._behaviour == "pen" && this._frameNumber > 240 && ((Math.random() * 150) | 0) == 1 && GLOBAL._fps > 25) {
            this._targetPosition = CHAMPIONCAGE.PointInCage(this._targetCenter);
            this._hasPath = true;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._level.Get() < 6) {
            if (!this._warnStarve) {
                if (GLOBAL.Timestamp() > this._feedTime.Get() + CHAMPIONCAGE.STARVETIMER) {
                    CHAMPIONCAGE.Hide();
                    if (!GLOBAL._catchup) {
                        GLOBAL.Message(KEYS.Get("msg_champion_starving"));
                    }
                    this._feeds.Add(-1);
                    if (this._feeds.Get() < 0) {
                        this._feeds.Set(0);
                    }
                    this._feedTime = new SecNum((GLOBAL.Timestamp() + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "feedTime")) | 0);
                    this._warnStarve = true;
                    LOGGER.Log("fed", "Starved level " + this._level.Get());
                }
            } else if (!this._warned) {
                if (GLOBAL.Timestamp() > this._feedTime.Get()) {
                    CHAMPIONCAGE.Hide();
                    if (!GLOBAL._catchup) {
                        GLOBAL.Message(KEYS.Get("msg_champion_hungry", { "v1": GLOBAL.ToTime((this._feedTime.Get() - GLOBAL.Timestamp() + CHAMPIONCAGE.STARVETIMER) | 0) }));
                    }
                    this._warned = true;
                }
            }
            if (this._feeds.Get() >= CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "feeds")) {
                this.levelSet((this._level.Get() + 1) | 0);
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._level.Get() == 6) {
            if (GLOBAL.Timestamp() > this._feedTime.Get() + CHAMPIONCAGE.STARVETIMER) {
                CHAMPIONCAGE.Hide();
                _loc2_ = this.health | 0;
                _loc3_ = Math.max(1, this._foodBonus.Get() - 1) | 0;
                _loc4_ = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, _loc3_, "bonusHealth"));
                if (_loc2_ < 1) {
                    _loc2_ = 1;
                } else if (_loc2_ >= _loc4_) {
                    _loc2_ = _loc4_ | 0;
                }
                this.setHealth(_loc2_);
                this._foodBonus.Add(-param1);
                if (this._foodBonus.Get() < 0) {
                    this._foodBonus.Set(0);
                }
                this._feedTime = new SecNum((GLOBAL.Timestamp() + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "feedTime")) | 0);
            }
        }
    }

    public tickBCage(param1: int): void {
        if (this._atTarget) {
            this._behaviour = MonsterBase.k_sBHVR_PEN;
            if (this._movement == "fly" && this._altitude > 60) {
                if (BYMConfig.instance.RENDERER_ON) {
                    TweenLite.to(this._rasterPt, 1.2, { "y": this._rasterPt.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerLanded) });
                } else {
                    TweenLite.to(this._graphicMC, 1.2, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.flyerLanded) });
                }
            }
            this._waypoints[0] = CHAMPIONCAGE.PointInCage(this._targetCenter);
        } else if (this._behaviourMode == MonsterBase.k_sBHVR_DEFEND && this._frameNumber % 200 == 0) {
            this.FindDefenseTargets();
        }
    }

    public tickBRetreat(): boolean {
        if (this._atTarget) {
            return true;
        }
        return false;
    }

    public tickDefault(): void {
    }

    public export(param1: boolean = true): void {
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc7_: boolean = false;
        if (this._behaviour == "juice" || this._behaviour == "freeze") {
            return;
        }
        let _loc2_: int = 0;
        let _loc3_: boolean = false;
        _loc2_ = 0;
        while (_loc2_ < CREATURES._guardianList.length) {
            if (as3.vget(CREATURES._guardianList, _loc2_) == this) {
                _loc3_ = true;
                break;
            }
            _loc2_++;
        }
        if (param1 && _loc3_) {
            _loc6_ = BASE._guardianData.length | 0;
            _loc7_ = false;
            _loc2_ = 0;
            while (_loc2_ < _loc6_) {
                if (as3.vget(BASE._guardianData, _loc2_).t == (Number(this._creatureID.substr(1)) | 0)) {
                    _loc7_ = true;
                    break;
                }
                _loc2_++;
            }
            if (!_loc7_) {
                _loc2_ = (BASE._guardianData.push({}) - 1) | 0;
            }
            _loc4_ = as3.vget(BASE._guardianData, _loc2_).status | 0;
            as3.vset(BASE._guardianData, _loc2_, {});
            as3.vget(BASE._guardianData, _loc2_).hp = new SecNum(this.health);
            as3.vget(BASE._guardianData, _loc2_).l = new SecNum(this._level.Get());
            as3.vget(BASE._guardianData, _loc2_).fd = this._feeds.Get();
            as3.vget(BASE._guardianData, _loc2_).ft = this._feedTime.Get();
            as3.vget(BASE._guardianData, _loc2_).nm = this._name;
            as3.vget(BASE._guardianData, _loc2_).t = Number(this._creatureID.substr(1)) | 0;
            as3.vget(BASE._guardianData, _loc2_).fb = new SecNum(this._foodBonus.Get());
            as3.vget(BASE._guardianData, _loc2_).pl = new SecNum(this._powerLevel.Get());
            as3.vget(BASE._guardianData, _loc2_).status = _loc4_;
        }
        if (!param1 && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || param1 && _loc3_ && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc2_ = GLOBAL.getPlayerGuardianIndex(Number(this._creatureID.substr(1)) | 0);
            if (_loc2_ < 0) {
                _loc2_ = (GLOBAL._playerGuardianData.push({}) - 1) | 0;
            }
            _loc4_ = as3.vget(GLOBAL._playerGuardianData, _loc2_).status | 0;
            as3.vset(GLOBAL._playerGuardianData, _loc2_, {});
            as3.vget(GLOBAL._playerGuardianData, _loc2_).hp = new SecNum(this.health);
            as3.vget(GLOBAL._playerGuardianData, _loc2_).l = new SecNum(this._level.Get());
            as3.vget(GLOBAL._playerGuardianData, _loc2_).fd = this._feeds.Get();
            as3.vget(GLOBAL._playerGuardianData, _loc2_).ft = this._feedTime.Get();
            as3.vget(GLOBAL._playerGuardianData, _loc2_).nm = this._name;
            as3.vget(GLOBAL._playerGuardianData, _loc2_).t = Number(this._creatureID.substr(1)) | 0;
            as3.vget(GLOBAL._playerGuardianData, _loc2_).fb = new SecNum(this._foodBonus.Get());
            as3.vget(GLOBAL._playerGuardianData, _loc2_).pl = new SecNum(this._powerLevel.Get());
            as3.vget(GLOBAL._playerGuardianData, _loc2_).status = _loc4_;
        }
    }

    public heal(): void {
        let _loc1_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc1_ = this.getHealCost();
            if (_loc1_ > 0) {
                GLOBAL.Message(KEYS.Get("msg_healchampion", { "v1": _loc1_ }), KEYS.Get("str_heal"), as3.bind(this, this.healB));
            }
        }
    }

    public healB(): void {
        let _loc1_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc1_ = this.getHealCost();
            if (_loc1_ > BASE._credits.Get()) {
                POPUPS.DisplayGetShiny();
                return;
            }
            this.setHealth(this.maxHealth);
            BASE.Purchase("IHE", _loc1_, "CHAMPION.Heal");
            this.export(this._friendly);
            LOGGER.Stat([58, this._creatureID, _loc1_, this._level.Get()]);
            BASE.Save();
        }
    }

    public getHealCost(): int {
        let _loc1_: number = (this.maxHealth - this.health) / this.maxHealth;
        let _loc2_: int = (_loc1_ * CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "healtime")) | 0;
        return STORE.GetTimeCost(_loc2_, false);
    }

    public override updateBuffs(): void {
        super.updateBuffs();
        if (this._foodBonus.Get() > 0) {
            this.moveSpeedProperty.value = (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "speed") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusSpeed")) / 2;
        } else {
            this.moveSpeedProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "speed") / 2;
        }
        if (this._speed > this.moveSpeed) {
            this._speed = this.moveSpeed;
        }
        if (this._foodBonus.Get() > 0) {
            this.maxHealthProperty.value = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusHealth"));
        } else {
            this.maxHealthProperty.value = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health"));
        }
        if (this.health > this.maxHealth) {
            this.setHealth(this.maxHealth);
        }
        if (this._foodBonus.Get() > 0) {
            this.damageProperty.value = (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "damage") | 0) + (CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusDamage") | 0);
        } else {
            this.damageProperty.value = CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "damage") | 0;
        }
        if (this._foodBonus.Get() > 0) {
            this.m_range = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusRange"));
        } else {
            this.m_range = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range"));
        }
        if (this._foodBonus.Get() > 0) {
            this._buff = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffs") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusBuffs"));
        } else {
            this._buff = Number(CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "buffs"));
        }
    }

    public get tickLimit(): int {
        if (this._behaviour != "cage" && this._behaviour != "pen" && this._behaviour != "juice" && this._behaviour != "freeze") {
            return 1;
        }
        return int.MAX_VALUE;
    }

    protected override hackCheck(): boolean {
        if (this._frameNumber % 30 == 0) {
            if (this.maxHealth != CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health")) {
                if (this.maxHealth != CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "health") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusHealth")) {
                    LOGGER.Log("hak", "Champion monster health max incorrect");
                    GLOBAL.ErrorMessage("GUARDIANMONSTER hack 2");
                    return false;
                }
            }
            if (this.m_range != CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range")) {
                if (this.m_range != CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._level.Get() | 0, "range") + CHAMPIONCAGE.GetGuardianProperty(this._creatureID, this._foodBonus.Get() | 0, "bonusRange")) {
                    LOGGER.Log("hak", "Champion monster range incorrect");
                    GLOBAL.ErrorMessage("GUARDIANMONSTER hack 4");
                    return false;
                }
            }
        }
        return true;
    }

    protected override tickState(param1: int = 1): boolean {
        let _loc2_: number = NaN;
        super.tickState(param1);
        this.updateBuffs();
        this.hackCheck();
        this.export(this._friendly);
        if (this._movement == "fly" && this.health > 0 && this._behaviour != "pen") {
            if (this._altitude >= 60) {
                _loc2_ = Math.sin(this._frameNumber / 50) * 5;
                this._altitude = (108 - _loc2_) | 0;
                this._graphicMC.y = -this._altitude - 36 + _loc2_;
            }
        }
        switch (this._behaviour) {
            case MonsterBase.k_sBHVR_ATTACK:
            case MonsterBase.k_sBHVR_BOUNCE:
                this.tickBAttack();
                let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
                if (activeEvent.active && this.health <= 0) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_DEFEND:
                this.tickBDefend();
                break;
            case MonsterBase.k_sBHVR_PEN:
                this.tickBPen(param1);
                break;
            case "cage":
                this.tickBCage(param1);
                break;
            case MonsterBase.k_sBHVR_JUICE:
                if (this.tickBJuice(param1)) {
                    return true;
                }
                break;
            case "freeze":
                if (this.tickBFreeze(param1)) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_RETREAT:
                if (this.tickBRetreat()) {
                    return true;
                }
                break;
            case MonsterBase.k_sBHVR_DECOY:
                if (this.tickBDecoy()) {
                    return true;
                }
                break;
            default:
                this.tickDefault();
        }
        if ((this.inBattleState || this._behaviour == "retreat" && this.health > 0) && this._frameNumber % 5 == 0) {
            this.newNode = Targeting.CreepCellMove(this._tmpPoint, this._id, this, this.node);
            if (this.newNode) {
                this.node = this.newNode;
            }
        }
        return false;
    }

    protected override move(): void {
        this._speed = this.moveSpeed * 0.5;
        if (this._behaviour == "pen") {
            this._speed *= 0.5;
        }
        if (this._behaviour == "juice" || this._behaviour == "cage" || this._behaviour == "bunker" || this._behaviour == "freeze") {
            this._speed *= 1.5;
        }
        if (this._behaviour == "defend") {
            this._speed *= 1.5;
        }
        if (this._behaviour == "juice" && this._movement == "fly" && this._altitude < 60) {
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
        if (!this._atTarget && this._behaviour != "cage" && this._behaviour != "pen" && this._behaviour != "juice" && (this._targetCreep && this.canShootCreep() || this.canHitBuilding())) {
            this._atTarget = true;
            if (this._targetCreep) {
                this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
                this._targetPosition = this._targetCreep._tmpPoint;
            } else if (this._targetBuilding) {
                this._targetPosition = new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y + this._targetBuilding._footprint[0].height / 2);
                this._xd = this._targetPosition.x - this._tmpPoint.x;
                this._yd = this._targetPosition.y - this._tmpPoint.y;
            } else if (this._waypoints.length > 0) {
                this._xd = this._waypoints[this._waypoints.length - 1].x - this._tmpPoint.x;
                this._yd = this._waypoints[this._waypoints.length - 1].y - this._tmpPoint.y;
                this._targetPosition = as3.cast(this._waypoints[this._waypoints.length - 1], Point);
            }
        } else if (Boolean(this._targetCreep) && this._behaviour == GLOBAL.e_BASE_MODE.ATTACK) {
            this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
            this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
            this._targetPosition = this._targetCreep._tmpPoint;
            if (GLOBAL.QuickDistance(this._targetPosition, this._tmpPoint) > this.m_range) {
                this._tmpPoint.x += Math.cos(Math.atan2(this._yd, this._xd)) * this._speed;
                this._tmpPoint.y += Math.sin(Math.atan2(this._yd, this._xd)) * this._speed;
            } else {
                this._atTarget = true;
            }
        } else if (this._waypoints.length > 0) {
            this._targetPosition = as3.cast(this._waypoints[0], Point);
            if (GLOBAL.QuickDistance(this._targetPosition, this._tmpPoint) <= 10) {
                while (this._waypoints.length > 0 && GLOBAL.QuickDistance(this._targetPosition, this._tmpPoint) <= 10) {
                    this._waypoints.splice(0, 1);
                    if (this._waypoints[0]) {
                        this._targetPosition = as3.cast(this._waypoints[0], Point);
                    } else {
                        if (this._behaviour != "defend") {
                            this._atTarget = true;
                            return;
                        }
                        if (GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range) {
                            this._atTarget = true;
                            if (this._targetCreep._behaviour != "heal") {
                                this._targetCreep._targetCreep = this;
                                if (this._targetCreep._creatureID == "C14" || this._targetCreep.canShootCreep() || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 50 && this._movement != "fly") {
                                    this._targetCreep._atTarget = true;
                                } else {
                                    this._targetCreep._atTarget = false;
                                    this._targetCreep._waypoints = [this._tmpPoint];
                                }
                                this._targetCreep._hasTarget = true;
                                this._targetCreep._looking = false;
                            }
                            return;
                        }
                    }
                }
                if (this._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                    if (this._creatureID != "G3" && GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < this.m_range || this.canShootCreep()) {
                        this._atTarget = true;
                        this._targetPosition = this._targetCreep._tmpPoint;
                        if (!this._targetCreep._explode && this._targetCreep._behaviour != "heal") {
                            this._targetCreep._targetCreep = this;
                            if (this._targetCreep._creatureID == "C14" || this._targetCreep.canShootCreep() || GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint) < 50 && this._movement != "fly") {
                                this._targetCreep._atTarget = true;
                            } else {
                                this._targetCreep._atTarget = false;
                                this._targetCreep._waypoints = [this._tmpPoint];
                            }
                            this._targetCreep._hasTarget = true;
                            this._targetCreep._looking = false;
                        }
                        return;
                    }
                    if (this._targetCreep && this._waypoints.length == 0 && this._hasPath) {
                        if (this._noDefensePath) {
                            this._targetPosition = this._targetCreep._tmpPoint;
                            this._waypoints = [this._targetCreep._tmpPoint];
                        } else {
                            this.WaypointTo(this._targetCreep._tmpPoint, null);
                        }
                    }
                } else if (this._waypoints.length == 0 && this._hasPath && (this._targetCreep || this._behaviour == "cage" || this._behaviour == "juice" || this._behaviour == "retreat" || this._behaviour == "pen")) {
                    this._atTarget = true;
                    return;
                }
            }
            if (this._waypoints.length > 0) {
                this._targetPosition = as3.cast(this._waypoints[0], Point);
            }
            if (this._behaviour == GLOBAL.e_BASE_MODE.ATTACK && Boolean(this._targetCreep)) {
                this._xd = this._targetCreep._tmpPoint.x - this._tmpPoint.x;
                this._yd = this._targetCreep._tmpPoint.y - this._tmpPoint.y;
            } else if (this._behaviour == "defend") {
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
                if (!this._atTarget && GLOBAL.QuickDistance(this._targetPosition, this._tmpPoint) > 5) {
                    this._tmpPoint.x += Math.cos(Math.atan2(this._yd, this._xd)) * this._speed;
                    this._tmpPoint.y += Math.sin(Math.atan2(this._yd, this._xd)) * this._speed;
                }
            }
        }
    }

    protected override getNextSprite(): void {
        if (this._behaviour == "pen" && !this._hasPath) {
            SPRITES.GetSprite(this._graphic, this._spriteID, "idle", (this.m_rotation - 45) | 0);
        } else if (this._attacking) {
            SPRITES.GetSprite(this._graphic, this._spriteID, GLOBAL.e_BASE_MODE.ATTACK, (this.m_rotation - 45) | 0, this._frameNumber);
        } else {
            SPRITES.GetSprite(this._graphic, this._spriteID, "walking", (this.m_rotation - 45) | 0, this._frameNumber);
        }
        if (this._movement == "fly" && Boolean(this._shadow)) {
            SPRITES.GetSprite(this._shadow, "bigshadow", "bigshadow", 0);
        }
    }
}
