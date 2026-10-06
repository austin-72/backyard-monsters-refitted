import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable } from "flash/display";
import { Event } from "flash/events";
import { BitmapFilter, GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BFOUNDATION, BTOWER, BYMConfig, BeastMode, Bounce, CModifiableProperty, CREATURES, CREEPS, CStatusEffect, Component, EFFECTS, GLOBAL, GRID, GameObject, HOUSING, HyperSpeed, IAttackable, IAttackingComponent, IComponentOwner, IDefendingComponent, ILootable, ITargetable, IoHfoWaves, MAP, MONSTERBUNKER, MonsterDust, PATHING, QUESTS, RasterData, SOUNDS, SPECIALEVENT, SecNum, Sine, Targeting, TweenLite, print } from "@game";

export class MonsterBase extends GameObject implements IAttackable, IComponentOwner {
    static {
        as3.implement(this, [IAttackable, IComponentOwner]);
        as3.fields(this, { spriteAction: "walking", aggroRange: 50, _components: null, _attackComponents: null, _frameNumber: 0, _spawned: false, _creatureID: null, _graphic: null, _visible: true, _clicked: false, _looking: false, _glow: null, _speed: NaN, _goo: 0, _damageMult: 1, m_range: 1, _damagePerSecond: null, _targetRotation: NaN, _targetPosition: null, _targetCenter: null, _waypoints: null, _pathID: 0, _jumping: false, _jumpingUp: false, _noDefensePath: false, _doDefenseBurrow: true, m_rotation: 0, m_state: 0, _behaviour: null, _hasTarget: false, _hasPath: false, _attacking: false, _intercepting: false, _targetBuilding: null, _homeBunker: undefined, _targetCreeps: null, _targetCreep: null, _id: null, _friendly: false, _house: null, _hits: 0, _spawnPoint: null, _lastRotation: 400, _targetGroup: 0, targetMode: 0, _explode: 0, _goeasy: false, _hitLimit: 50, _tmpPoint: null, _spawnTime: 0, _atTarget: false, _xd: 0, _yd: 0, _shadow: null, _shadowMC: null, attackCooldown: 0, frameCount: 0, shocking: false, node: null, newNode: null, _phase: 0, _movement: "", _componentTickCounter: 0, _pathing: "", _lockRotation: false, isDisposable: false, _enraged: 0, m_isInvisible: false, _graphicMC: null, _altitude: 0, _currentSkinOverride: null, ioHatchling: false, _rasterData: null, _rasterPt: null, _shadowData: null, _shadowPt: null, _dying: false, _dead: false, m_juiceReady: false, attackDelayProperty: null, damageProperty: null, m_filters: null, _lastXd: NaN, _lastYd: NaN, _cachedTargetRotation: NaN, _ioHurtCarry: 0, _ioPuppetY: NaN, _ioDrawn: false });
    }

    public static readonly k_sBHVR_ATTACK: string = "attack";

    public static readonly k_sBHVR_RETREAT: string = "retreat";

    public static readonly k_sBHVR_JUICE: string = "juice";

    public static readonly k_sBHVR_HOUSING: string = "housing";

    public static readonly k_sBHVR_PEN: string = "pen";

    public static readonly k_sBHVR_DEFEND: string = "defend";

    public static readonly k_sBHVR_FEED: string = "feed";

    public static readonly k_sBHVR_JUMP: string = "jump";

    public static readonly k_sBHVR_DECOY: string = "decoy";

    public static readonly k_sBHVR_BUNKER: string = "bunker";

    public static readonly k_sBHVR_HEAL: string = "heal";

    public static readonly k_sBHVR_WANDER: string = "wander";

    public static readonly k_sBHVR_BOUNCE: string = "bounce";

    public static readonly k_sBHVR_HUNT: string = "hunt";

    public static readonly k_sBHVR_BUFF: string = "buff";

    public static readonly k_DEATH_EVENT: string = "deathTime";

    public static readonly k_LOOT_PROPERTY: string = "lootProperty";

    public static readonly k_DAMAGE_PROPERTY: string = "damageProperty";

    public static readonly k_ARMOR_PROPERTY: string = "armorProperty";

    public static readonly k_ATTACK_DELAY_PROPERTY: string = "attackDelayProperty";

    public static readonly k_MOVE_SPEED_PROPERTY: string = "moveSpeedProperty";
    private static readonly COMPONENT_TICK_INTERVAL: int = 3;
    // Tick components every 3 frames
    private static readonly RENDER_INTERVAL: int = 2;
    public spriteAction: string;
    public aggroRange: number;
    public _components: Vector<Component>;
    public _attackComponents: Vector<Component>;
    public _frameNumber: int;
    public _spawned: boolean;
    public _creatureID: string;
    public _graphic: BitmapData;
    public _visible: boolean;
    public _clicked: boolean;
    public _looking: boolean;
    public _glow: GlowFilter;
    public _speed: number;
    public _goo: int;
    public _damageMult: number;
    protected m_range: number;
    public _damagePerSecond: SecNum;
    public _targetRotation: number;
    public _targetPosition: Point;
    public _targetCenter: Point;
    public _waypoints: any[];
    protected _pathID: int;
    protected _jumping: boolean;
    protected _jumpingUp: boolean;
    protected _noDefensePath: boolean;
    protected _doDefenseBurrow: boolean;
    protected m_rotation: number;
    protected m_state: int;
    public _behaviour: string;
    public _hasTarget: boolean;
    public _hasPath: boolean;
    public _attacking: boolean;
    public _intercepting: boolean;
    public _targetBuilding: BFOUNDATION;
    public _homeBunker: any;
    public _targetCreeps: any[];
    public _targetCreep: MonsterBase;
    public _id: string;
    public _friendly: boolean;
    public _house: BFOUNDATION;
    public _hits: int;
    public _spawnPoint: Point;
    public _lastRotation: int;
    public _targetGroup: int;
    public targetMode: int;
    public _explode: int;
    public _goeasy: boolean;
    public _hitLimit: int;
    public _tmpPoint: Point;
    public _spawnTime: int;
    public _atTarget: boolean;
    public _xd: number;
    public _yd: number;
    public _shadow: BitmapData;
    public _shadowMC: DisplayObject;
    public attackCooldown: int;
    protected frameCount: int;
    protected shocking: boolean;
    protected node: string;
    protected newNode: string;
    public _phase: number;
    public _movement: string;
    // Performance optimization: Component tick management
    private _componentTickCounter: int;
    // Render every 2 frames when not visible
    public _pathing: string;
    public _lockRotation: boolean;
    public isDisposable: boolean;
    public _enraged: number;
    private m_isInvisible: boolean;
    public _graphicMC: Bitmap;
    public _altitude: int;
    protected _currentSkinOverride: string;
    /** Inferno-only: a small Spurtz hatched from a Clinkerjaw (3/4 size and speed). */
    public ioHatchling: boolean;
    protected _rasterData: RasterData;
    protected _rasterPt: Point;
    protected _shadowData: RasterData;
    protected _shadowPt: Point;
    protected _dying: boolean;
    protected _dead: boolean;
    protected m_juiceReady: boolean;
    public attackDelayProperty: CModifiableProperty;
    public damageProperty: CModifiableProperty;
    protected m_filters: any[];
    private _lastXd: number;
    private _lastYd: number;
    private _cachedTargetRotation: number;
    /**
     * Inferno-only: damage below a whole hit point not yet taken off. Health is kept in whole points
     * (SecNum rounds), so a hit shrunk below half a point by armour (the Sulfur Bomb's) was rounded away
     * altogether. The Quake tower never hits for more than the health left, so a monster on 1 point
     * under armour took 1 x (1 - armour) a hit and stayed on 1: it could not die until the armour had
     * faded below half. The fractions are added up here and taken off once they make a whole point.
     */
    private _ioHurtCarry: number;
    private _ioPuppetY: number;
    /** Drawn at least once (see render: steps that are not drawn skip the picture after that). */
    private _ioDrawn: boolean;

    public $ctor(): void {
        this._lastXd = NaN;
        this._lastYd = NaN;
        this._cachedTargetRotation = NaN;
        this._ioPuppetY = NaN;
        this._components = new Vector<Component>(0, false, Component);
        this._attackComponents = new Vector<Component>(0, false, Component);
        this._damagePerSecond = new SecNum(0);
        this._tmpPoint = new Point(0, 0);

        // Initialize performance optimization variables
        this._componentTickCounter = 0;

        super.$ctor();
        this._id = as3.str(GLOBAL.NextCreepID().toString());
        this._rasterPt = new Point();
        this._shadowPt = new Point();
        this.m_filters = [];
        this.m_rotation = 0;
        this.addComponent(new CModifiableProperty(Number.MAX_VALUE, 0, 0.5), MonsterBase.k_LOOT_PROPERTY);
        this.damageProperty = new CModifiableProperty();
        this.addComponent(this.damageProperty, MonsterBase.k_DAMAGE_PROPERTY);
        this.attackDelayProperty = new CModifiableProperty(Number.MAX_VALUE, 0);
        this.addComponent(this.attackDelayProperty, MonsterBase.k_ATTACK_DELAY_PROPERTY);
        this.node = Targeting.CreepCellAdd(this._tmpPoint, this._id, this);
    }

    public set currentSkinOverride(param1: string) {
        this._currentSkinOverride = param1;
    }

    public getStatsString(): string {
        let _loc1_: string = "";
        _loc1_ += this._creatureID + "(" + this + ")\n";
        _loc1_ += "damage: " + this.damage + "\n";
        _loc1_ += "attack delay: " + this.attackDelay + "\n";
        _loc1_ += "move speed: " + this.moveSpeed + "\n";
        _loc1_ += "armor: " + (1 - this.armor) + "(doesnt reflect STORE armor)" + "\n";
        _loc1_ += "health: " + this.health + "\n";
        _loc1_ += "max health: " + this.maxHealth + "\n";
        return _loc1_ + ("loot bonus: " + this.lootingMultiplier + "\n");
    }

    public get isRanged(): boolean {
        return this.range > 1;
    }

    public getDisplayY(): number {
        return this.y - this._altitude;
    }

    protected setInitialFriendlyFlags(param1: boolean): void {
        if (param1) {
            this.attackFlags = Targeting.k_TARGETS_ATTACKERS;
            this.defenseFlags = Targeting.k_TARGETS_DEFENDERS;
        } else {
            this.attackFlags = Targeting.k_TARGETS_DEFENDERS;
            this.defenseFlags = Targeting.k_TARGETS_ATTACKERS;
        }
    }

    public override get width(): number {
        return this._graphicMC.width;
    }

    public override get height(): number {
        return this._graphicMC.height;
    }

    public get damage(): number {
        return this.damageProperty.value;
    }

    public get attackDelay(): number {
        return this.attackDelayProperty.value;
    }

    public get dying(): boolean {
        return this._dying;
    }

    public get dead(): boolean {
        return this._dead;
    }

    public get juiceReady(): boolean {
        return this.m_juiceReady;
    }

    public get rasterPt(): Point {
        return this._rasterPt;
    }

    public get invisible(): boolean {
        return this.m_isInvisible;
    }

    public set invisible(param1: boolean) {
        this.m_isInvisible = param1;
        if (this.m_isInvisible) {
            this.defenseFlags |= Targeting.k_TARGETS_INVISIBLE;
        } else {
            this.defenseFlags &= ~Targeting.k_TARGETS_INVISIBLE;
        }
    }

    public get inBattleState(): boolean {
        return this._behaviour == MonsterBase.k_sBHVR_BUFF || this._behaviour == MonsterBase.k_sBHVR_ATTACK || this._behaviour == MonsterBase.k_sBHVR_DEFEND || this._behaviour == MonsterBase.k_sBHVR_BUNKER || this._behaviour == MonsterBase.k_sBHVR_HEAL || this._behaviour == MonsterBase.k_sBHVR_BOUNCE || this._behaviour == MonsterBase.k_sBHVR_HUNT;
    }

    public get lootingMultiplier(): number {
        let lootProp: CModifiableProperty = as3.cast(this.getComponentByName(MonsterBase.k_LOOT_PROPERTY), CModifiableProperty);
        return Number(lootProp ? lootProp.value : 1);
    }

    protected rangedAttack(param1: ITargetable): ITargetable {
        return null;
    }

    public override modifyHealth(param1: number, param2: ITargetable = null): number {
        let _loc6_: Component = null;
        let ioWhole: number = NaN;
        if (!this.health) {
            return 0;
        }
        let _loc3_: number = param1;
        let _loc4_: int = 0;
        while (_loc4_ < this._components.length) {
            if (as3.is((_loc6_ = as3.vget(this._components, _loc4_)), IDefendingComponent)) {
                param1 = as3.cast(_loc6_, IDefendingComponent).onDefend(this, param1, param2);
            }
            _loc4_++;
        }
        let _loc5_: number = NaN;
        if ((_loc5_ = param1 + this.health) == this.health) {
            return 0;
        }
        if (param1 < 0) {
            param1 *= !(!this.armor) ? 1 - this.armor : 1;
            if (GLOBAL.INFERNO_ONLY) {
                param1 += this._ioHurtCarry;
                ioWhole = -Math.floor(-param1 + 0.000001);
                // whole points, towards 0: -2.7 takes 2
                this._ioHurtCarry = Math.min(0, param1 - ioWhole);
                // and keeps -0.7 for the next hit
                param1 = ioWhole;
            }
            this.damaged(param1);
        } else {
            if (_loc5_ >= this.maxHealth) {
                if (this._graphic) {
                    this._graphic.fillRect(this._graphic.rect, 0);
                }
                param1 = this.maxHealth - this.health;
            }
            this.healed(param1);
        }
        if (GameObject.k_DOES_PRINT_DETAILED_LOGGING && GLOBAL._aiDesignMode) {
            param1 = Math.round(param1);
            _loc3_ = Math.round(_loc3_);
            print(this + " was modified for " + param1 + (!(!(_loc3_ - param1)) ? "(" + _loc3_ + " - " + (_loc3_ - param1) + ")" : "") + " health points, left with " + this.health + " out of " + this.maxHealth + "hp");
        }
        ATTACK.damage((-param1) | 0, this, Number(param1 < 0 ? param1 - _loc3_ : 0));
        this.setHealth(this.health + param1);
        return param1;
    }

    protected healed(param1: number): void {
    }

    protected damaged(param1: number): void {
    }

    public addStatusEffect(param1: CStatusEffect): void {
        let _loc2_: CStatusEffect = as3.as(this.getComponentByType(Object(param1).constructor), CStatusEffect);
        if (_loc2_) {
            _loc2_.renew();
        } else {
            this.addComponent(param1);
        }
    }

    public removeStatusEffect(param1: any): boolean {
        let _loc2_: CStatusEffect = as3.as(this.getComponentByType(param1), CStatusEffect);
        if (_loc2_) {
            this.removeComponent(_loc2_);
            return true;
        }
        return false;
    }

    public addComponent(param1: Component, param2: string = "", param3: uint = 0): void {
        let _loc4_: int = -1;
        let _loc5_: Vector<Component> = this.getComponentList(param1);
        let _loc6_: int = 0;
        while (_loc6_ < _loc5_.length) {
            if (as3.vget(_loc5_, _loc6_).priority < param3) {
                _loc4_ = _loc6_;
                break;
            }
            _loc6_++;
        }
        if (_loc4_ < 0 || _loc4_ >= _loc5_.length) {
            _loc5_.push(param1);
        } else {
            _loc5_.splice(_loc4_, 0, param1);
        }
        param1.register(this, param2);
    }

    public removeComponent(param1: Component): void {
        let _loc2_: Vector<Component> = this.getComponentList(param1);
        param1.unregister();
        _loc2_.splice(_loc2_.indexOf(param1), 1);
    }

    public getComponent(param1: Component): Component {
        let _loc2_: Vector<Component> = this.getComponentList(param1);
        let _loc3_: int = _loc2_.indexOf(param1) | 0;
        if (_loc3_ >= 0) {
            return as3.vget(_loc2_, _loc3_);
        }
        return null;
    }

    public getComponentByType(param1: any): Component {
        let _loc2_: Component = null;
        let _loc3_: int = 0;
        while (_loc3_ < this._components.length) {
            _loc2_ = as3.vget(this._components, _loc3_);
            if (as3.is(_loc2_, param1)) {
                return _loc2_;
            }
            _loc3_++;
        }
        _loc3_ = 0;
        while (_loc3_ < this._attackComponents.length) {
            _loc2_ = as3.vget(this._attackComponents, _loc3_);
            if (as3.is(_loc2_, param1)) {
                return _loc2_;
            }
            _loc3_++;
        }
        return null;
    }

    public getComponentByName(param1: string): Component {
        let _loc2_: Component = null;
        let _loc3_: int = 0;
        while (_loc3_ < this._components.length) {
            _loc2_ = as3.vget(this._components, _loc3_);
            if (_loc2_.name == param1) {
                return _loc2_;
            }
            _loc3_++;
        }
        _loc3_ = 0;
        while (_loc3_ < this._attackComponents.length) {
            _loc2_ = as3.vget(this._attackComponents, _loc3_);
            if (_loc2_.name == param1) {
                return _loc2_;
            }
            _loc3_++;
        }
        return null;
    }

    private getComponentList(param1: Component): Vector<Component> {
        if (as3.is(param1, IAttackingComponent)) {
            return this._attackComponents;
        }
        return this._components;
    }

    public tick(param1: int = 1): boolean {
        let _loc2_: boolean = false;
        if (this._dead) {
            return true;
        }
        // Inferno-only (Hell Freezes Over): a monster pacing in its Compound is frozen still while a wave has the
        // Compound sealed in ice (IoHfoWaves)
        if (GLOBAL.INFERNO_ONLY && (this._behaviour == MonsterBase.k_sBHVR_PEN || this._behaviour == MonsterBase.k_sBHVR_HOUSING) && IoHfoWaves.compoundFrozen) {
            this.updateRasterData();
            // (still where it stands when the map scrolls)
            return false;
        }

        // Performance optimization: Reduce component tick frequency
        this._componentTickCounter += param1;
        let shouldTickComponents: boolean = this._componentTickCounter >= MonsterBase.COMPONENT_TICK_INTERVAL;
        let accumulatedTicks: int = this._componentTickCounter;
        if (shouldTickComponents) {
            this._componentTickCounter = 0;
        }

        if (shouldTickComponents) {
            let _loc3_: int = (this._components.length - 1) | 0;
            while (_loc3_ >= 0) {
                as3.vget(this._components, _loc3_).tick(accumulatedTicks);
                _loc3_--;
            }
            _loc3_ = (this._attackComponents.length - 1) | 0;
            while (_loc3_ >= 0) {
                as3.vget(this._attackComponents, _loc3_).tick(accumulatedTicks);
                _loc3_--;
            }
        }

        _loc2_ = this.tickState(param1);
        this.move();
        this.render();
        return _loc2_;
    }

    public changeState(param1: int): boolean {
        this.m_state = param1;
        return true;
    }

    public getState(): int {
        return this.m_state;
    }

    public get state(): int {
        return this.m_state;
    }

    protected tickState(param1: int = 1): boolean {
        this._frameNumber += 1;
        if (Boolean(this.graphic) && this.graphic.filters.length > 0) {
            if (this._friendly) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    if (GLOBAL._playerMonsterOverdrive && GLOBAL._playerMonsterOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._playerMonsterDefenseOverdrive && GLOBAL._playerMonsterDefenseOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._playerMonsterSpeedOverdrive && GLOBAL._playerMonsterSpeedOverdrive.Get() < GLOBAL.Timestamp()) {
                        this.updateBuffs();
                    }
                }
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                    if (GLOBAL._monsterOverdrive && GLOBAL._monsterOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._monsterDefenseOverdrive && GLOBAL._monsterDefenseOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._monsterSpeedOverdrive && GLOBAL._monsterSpeedOverdrive.Get() < GLOBAL.Timestamp()) {
                        this.updateBuffs();
                    }
                }
            } else if (GLOBAL._attackerMonsterOverdrive && GLOBAL._attackerMonsterOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._attackerMonsterDefenseOverdrive && GLOBAL._attackerMonsterDefenseOverdrive.Get() < GLOBAL.Timestamp() || GLOBAL._attackerMonsterSpeedOverdrive && GLOBAL._attackerMonsterSpeedOverdrive.Get() < GLOBAL.Timestamp()) {
                this.updateBuffs();
            }
        }
        return true;
    }

    protected move(): void {
    }

    /**
     * Inferno-only (attack replays, IoReplayPlayer): a monster that only shows where a recording says it was. It
     * is never ticked (it neither moves nor fights by itself): each frame it is told where it is, how hurt, and
     * how high it flies, and draws itself as it would have (its own art, facing the way it moved, its health
     * bar); walking moves its walk on.
     */
    /** Inferno-only (a replay's puppet): its glows as recorded (GlowFilters; null or [] for none). */
    public ioPuppetGlow(glows: any[]): void {
        this.m_filters = glows ? glows.concat() : [];
        if (this._graphicMC) {
            this._graphicMC.filters = this.m_filters;
        }
        this.updateRasterData();
    }

    public ioPuppet(x: number, y: number, hpRatio: number, altitude: number, walking: boolean): void {
        let dx: number = x - this._tmpPoint.x;
        let dy: number = y - this._tmpPoint.y;
        if (dx * dx + dy * dy > 0.25) {
            this._xd = dx;
            this._yd = dy;
        }
        this._tmpPoint.x = x;
        this._tmpPoint.y = y;
        if (walking) {
            ++this._frameNumber;
        }
        this.setHealth(Math.max(1, this.maxHealth * Math.min(1, hpRatio)));
        if (this._graphicMC) {
            if (isNaN(this._ioPuppetY)) {
                this._ioPuppetY = this._graphicMC.y;
            }
            this._graphicMC.y = this._ioPuppetY - altitude;
        }
        this.render();
    }

    protected render(): void {
        let _loc1_: number = NaN;
        let _loc2_: string = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (!GLOBAL._catchup) {
            if (!this._lockRotation) {
                // Only calculate rotation when movement direction changes
                if (this._lastXd !== this._xd || this._lastYd !== this._yd) {
                    this._targetRotation = Math.atan2(this._yd, this._xd) * 57.2957795 - 90;
                    this._lastXd = this._xd;
                    this._lastYd = this._yd;
                    this._cachedTargetRotation = this._targetRotation;
                } else {
                    // Use cached rotation
                    this._targetRotation = this._cachedTargetRotation;
                }
            }
            _loc1_ = this.m_rotation - this._targetRotation;
            if (_loc1_ > 180) {
                this._targetRotation += 360;
            } else if (_loc1_ < -180) {
                this._targetRotation -= 360;
            }
            this._targetRotation += 90;
            this.m_rotation = this._targetRotation;
            while (this.m_rotation < 0) {
                this.m_rotation += 360;
            }
            this.m_rotation %= 360;
            if (this.x != (this._tmpPoint.x | 0) || this.y != (this._tmpPoint.y | 0)) {
                this.graphic.x = this._tmpPoint.x | 0;
                this.graphic.y = this._tmpPoint.y | 0;
            }
            // Inferno-only (fps pass, 4 October): the game takes two steps a frame and only the last is
            // drawn (GLOBAL._render; SPRITES.GetSprite already skips the others). The picture, its health
            // bar and its place in the yard's drawing are left for that step: the health bar was copied onto
            // the same picture twice a frame, and the ice monsters' frames drawn twice.
            if (GLOBAL.INFERNO_ONLY && !GLOBAL._render && this._ioDrawn) {
                return;
            }
            if (this._graphic) {
                this._graphic.lock();
            }
            if (this._shadow) {
                this._shadow.lock();
            }
            _loc3_ = 0;
            if (this._movement == "burrow" && (this._behaviour === MonsterBase.k_sBHVR_ATTACK || this._behaviour === MonsterBase.k_sBHVR_DEFEND)) {
                this.renderBurrow();
            } else {
                this._visible = true;
                if (BYMConfig.instance.RENDERER_ON) {
                    this._rasterData.visible = true;
                }
                if (!this.graphic.alpha) {
                    this.graphic.alpha = 1;
                }
            }
            this.getNextSprite();
            this._lastRotation = (this.m_rotation / 12) | 0;
            if (this.health < this.maxHealth) {
                _loc4_ = (11 - ((11 / this.maxHealth * this.health) | 0)) | 0;
                this._graphic.copyPixels(CREEPS._bmdHPbar, new Rectangle(0, 5 * _loc4_, 17, 5), new Point(-this._graphicMC.x - CREEPS._bmdHPbar.width / 2, 6));
            }
            if (this._graphic) {
                this._graphic.unlock();
            }
            if (this._shadow) {
                this._shadow.unlock();
            }
            this.updateRasterData();
            this._ioDrawn = true;
        }
    }

    protected getNextSprite(): void {
    }

    protected renderBurrow(): void {
        if (this._speed > 0 && (this._behaviour === MonsterBase.k_sBHVR_ATTACK || this._doDefenseBurrow)) {
            if (this._phase != 1) {
                this._phase = 1;
                if (this.graphic.alpha) {
                    this.graphic.alpha = 0;
                }
                this.invisible = true;
                this._visible = false;
                if (BYMConfig.instance.RENDERER_ON) {
                    this._rasterData.visible = false;
                }
                EFFECTS.Dig(this.x | 0, this.y | 0);
                SOUNDS.Play("dig", 0.5);
            } else if (this._frameNumber % 5 == 0) {
                EFFECTS.Burrow(this.x | 0, this.y | 0);
            }
        } else if (this._phase == 1) {
            this._phase = 0;
            this.jump();
            if (!this.graphic.alpha) {
                this.graphic.alpha = 1;
            }
            this.invisible = false;
            this._visible = true;
            if (BYMConfig.instance.RENDERER_ON) {
                this._rasterData.visible = true;
            }
            if (this._behaviour == MonsterBase.k_sBHVR_ATTACK || this._doDefenseBurrow) {
                EFFECTS.Dig(this.x | 0, this.y | 0);
            }
            SOUNDS.Play("arise", 0.5);
        }
    }

    public jump(): void {
        let Land: Function = null;
        Land = (): void => {
            TweenLite.to(this._graphicMC, 0.6, { "y": this._graphicMC.y + 15, "ease": Bounce.easeOut });
        };
        TweenLite.to(this._graphicMC, 0.3, { "y": this._graphicMC.y - 15, "ease": Sine.easeIn, "onComplete": Land });
    }

    protected hackCheck(): boolean {
        return true;
    }

    protected override updateRasterData(): void {
        let _loc2_: number = NaN;
        let _loc3_: int = 0;
        if (!BYMConfig.instance.RENDERER_ON) {
            return;
        }
        let _loc1_: Point = MAP.instance.offset;
        if (Boolean(this._graphicMC) && Boolean(this._rasterData)) {
            _loc2_ = this.graphic.height * 0.5;
            if (this._middle) {
                _loc2_ = this._middle;
            }
            this._rasterPt.x = this.x + this._graphicMC.x - _loc1_.x;
            this._rasterPt.y = this.y + this._graphicMC.y - _loc1_.y;
            this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y + this._altitude - _loc1_.y + _loc2_) * 1000 + this.x - _loc1_.x);
            if (Boolean(this._graphicMC.filters.length) && this._rasterData.data !== this._graphicMC) {
                this._rasterData.data = as3.cast(this._graphicMC, IBitmapDrawable);
            } else if (!this._graphicMC.filters.length && this._rasterData.data !== this._graphic) {
                this._rasterData.data = as3.cast(this._graphic, IBitmapDrawable);
            }
        }
        if (this._shadowMC) {
            this._shadowPt.x = this.x + this._shadowMC.x - _loc1_.x;
            this._shadowPt.y = this.y + this._shadowMC.y - _loc1_.y;
        }
        super.updateRasterData();
    }

    protected changeMode(): void {
        this._hasTarget = false;
        this._atTarget = false;
        this._hasPath = false;
    }

    public changeModeJuice(): void {
    }

    public changeModeAttack(): void {
        if (this._behaviour === MonsterBase.k_sBHVR_RETREAT) {
            return;
        }
        this._behaviour = MonsterBase.k_sBHVR_ATTACK;
        this.changeMode();
        this.findTarget(this._targetGroup);
    }

    public changeModeRetreat(): void {
        this._behaviour = MonsterBase.k_sBHVR_RETREAT;
        this.changeMode();
        this._attacking = false;
        if (this._movement == "burrow") {
            EFFECTS.Dig(this.x | 0, this.y | 0);
            SOUNDS.Play("dig");
        }
        this.WaypointTo(this._spawnPoint);
    }

    public changeModeFeed(): void {
        this._behaviour = MonsterBase.k_sBHVR_FEED;
        this.changeMode();
        this._targetBuilding = GLOBAL._bCage;
        this.WaypointTo(CREATURES._guardian._tmpPoint, null);
    }

    public changeModeHousing(): void {
        this._behaviour = MonsterBase.k_sBHVR_HOUSING;
        this.changeMode();
        let _loc1_: Point = GRID.ToISO(this._targetCenter.x + Math.random() * 100 + 30, this._targetCenter.y + Math.random() * 60 + 30, 0);
        PATHING.GetPath(this._tmpPoint, new Rectangle(_loc1_.x, _loc1_.y, 10, 10), as3.bind(this, this.setWaypoints), true);
    }

    public addFilter(param1: BitmapFilter): void {
        if (this.m_filters.indexOf(param1) == -1) {
            this.m_filters.push(param1);
            this._graphicMC.filters = this.m_filters;
        }
    }

    public removeFilter(param1: BitmapFilter): void {
        let _loc2_: int = this.m_filters.indexOf(param1);
        if (_loc2_ >= 0) {
            this.m_filters.splice(_loc2_, 1);
            this._graphicMC.filters = this.m_filters;
        }
    }

    public updateBuffs(): void {
        let _loc1_: number = 0;
        if (this._friendly) {
            if (Boolean(GLOBAL._monsterOverdrive) && GLOBAL._monsterOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.damageProperty.getModifier(MonsterDust.k_damageModifier)) {
                    this.damageProperty.addModifier(MonsterDust.k_damageModifier);
                }
                _loc1_ |= MonsterDust.k_color;
            }
            if (Boolean(GLOBAL._monsterDefenseOverdrive) && GLOBAL._monsterDefenseOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.armorProperty.getModifier(BeastMode.k_armorModifier)) {
                    this.armorProperty.addModifier(BeastMode.k_armorModifier);
                }
                _loc1_ |= BeastMode.k_color;
            }
            if (Boolean(GLOBAL._monsterSpeedOverdrive) && GLOBAL._monsterSpeedOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.moveSpeedProperty.getModifier(HyperSpeed.k_moveSpeedModifier)) {
                    this.moveSpeedProperty.addModifier(HyperSpeed.k_moveSpeedModifier);
                }
                if (!this.attackDelayProperty.getModifier(HyperSpeed.k_attackSpeedModifier)) {
                    this.attackDelayProperty.addModifier(HyperSpeed.k_attackSpeedModifier);
                }
                _loc1_ |= HyperSpeed.k_color;
            }
        } else {
            if (Boolean(GLOBAL._attackerMonsterOverdrive) && GLOBAL._attackerMonsterOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.damageProperty.getModifier(MonsterDust.k_damageModifier)) {
                    this.damageProperty.addModifier(MonsterDust.k_damageModifier);
                }
                _loc1_ |= MonsterDust.k_color;
            }
            if (Boolean(GLOBAL._attackerMonsterDefenseOverdrive) && GLOBAL._attackerMonsterDefenseOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.armorProperty.getModifier(BeastMode.k_armorModifier)) {
                    this.armorProperty.addModifier(BeastMode.k_armorModifier);
                }
                _loc1_ |= BeastMode.k_color;
            }
            if (Boolean(GLOBAL._attackerMonsterSpeedOverdrive) && GLOBAL._attackerMonsterSpeedOverdrive.Get() >= GLOBAL.Timestamp()) {
                if (!this.moveSpeedProperty.getModifier(HyperSpeed.k_moveSpeedModifier)) {
                    this.moveSpeedProperty.addModifier(HyperSpeed.k_moveSpeedModifier);
                }
                if (!this.attackDelayProperty.getModifier(HyperSpeed.k_attackSpeedModifier)) {
                    this.attackDelayProperty.addModifier(HyperSpeed.k_attackSpeedModifier);
                }
                _loc1_ |= HyperSpeed.k_color;
            }
        }
        if (_loc1_ != 0) {
            if (this._glow) {
                this._glow.color = _loc1_ >>> 0;
            } else {
                this._glow = new GlowFilter(_loc1_, 1, 7, 7, 6, 1);
                this.addFilter(this._glow);
            }
        } else if (this._glow) {
            this.removeFilter(this._glow);
            this._glow = null;
        }
    }

    public poweredUp(): boolean {
        if (this.isDisposable) {
            return false;
        }
        if (!this._friendly) {
            let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
            if (activeEvent.active || Boolean(GLOBAL._wmCreaturePowerups[this._creatureID])) {
                if (GLOBAL._wmCreaturePowerups[this._creatureID]) {
                    return true;
                }
            } else if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.attackingPlayer.m_upgrades[this._creatureID] && Boolean(GLOBAL.attackingPlayer.m_upgrades[this._creatureID].powerup)) {
                return true;
            }
        } else if (Boolean(GLOBAL.player.m_upgrades[this._creatureID]) && Boolean(GLOBAL.player.m_upgrades[this._creatureID].powerup)) {
            return true;
        }
        return false;
    }

    public powerUpLevel(): int {
        if (!this.poweredUp()) {
            return 0;
        }
        if (!this._friendly) {
            if (SPECIALEVENT.active || Boolean(GLOBAL._wmCreaturePowerups[this._creatureID])) {
                if (GLOBAL._wmCreaturePowerups[this._creatureID]) {
                    return GLOBAL._wmCreaturePowerups[this._creatureID] | 0;
                }
            } else if (GLOBAL.attackingPlayer.m_upgrades[this._creatureID].powerup) {
                return GLOBAL.attackingPlayer.m_upgrades[this._creatureID].powerup | 0;
            }
        } else if (GLOBAL.player.m_upgrades[this._creatureID].powerup) {
            return GLOBAL.player.m_upgrades[this._creatureID].powerup | 0;
        }
        return 0;
    }

    public override clear(): void {
        let _loc1_: uint = 0;
        let _loc2_: uint = 0;
        this.setHealth(0);
        if (this._house) {
            _loc1_ = this._house._creatures.length;
            _loc2_ = 0;
            while (_loc2_ < _loc1_) {
                if (this._house._creatures[_loc2_] === this) {
                    this._house._creatures.splice(_loc2_, 1);
                    break;
                }
                _loc2_++;
            }
        }
        if (this._rasterData) {
            this._rasterData.clear();
        }
        if (this._shadowData) {
            this._shadowData.clear();
        }
        this._rasterData = null;
        this._shadowData = null;
        this._rasterPt = null;
        this._shadowPt = null;
        if (this._graphic) {
            this._graphic.dispose();
        }
        if (this._shadow) {
            this._shadow.dispose();
        }
        this._graphic = null;
        this._shadow = null;
        super.clear();
    }

    public canShootCreep(): boolean {
        return false;
    }

    public findHuntingTargets(): void {
        let monster: MonsterBase = null;
        let amount: int = 0;
        let targets: any[] = [];
        let allMonsters: any = CREATURES._creatures;
        for (monster of as3.values(allMonsters)) {
            if (!(monster._behaviour != MonsterBase.k_sBHVR_DEFEND && monster._behaviour != MonsterBase.k_sBHVR_BUNKER)) {
                targets.push({ "creep": monster, "dist": GLOBAL.QuickDistance(monster._tmpPoint, this._tmpPoint) });
                amount++;
                if (amount >= 10) {
                    break;
                }
            }
        }
        if (Boolean(CREATURES._guardian) && CREATURES._guardian.health > 0) {
            targets.push({ "creep": CREATURES._guardian, "dist": GLOBAL.QuickDistance(CREATURES._guardian._tmpPoint, this._tmpPoint) });
        }
        if (Boolean(CREATURES._krallen) && CREATURES._krallen.health > 0) {
            targets.push({ "creep": CREATURES._krallen, "dist": GLOBAL.QuickDistance(CREATURES._krallen._tmpPoint, this._tmpPoint) });
        }
        if (targets.length > 0) {
            as3.sortOn(targets, "dist", Array.NUMERIC);
            while (targets.length > 0 && targets[0].creep.health <= 0) {
                targets.splice(0, 1);
            }
        }
        if (targets.length > 0) {
            this._targetCreep = as3.cast(targets[0].creep, MonsterBase);
            this._waypoints = [this._targetCreep._tmpPoint];
        }
    }

    public loseTarget(): void {
        this._hasTarget = false;
        this._attacking = false;
        this._atTarget = false;
        this._targetCreep = null;
    }

    public findTarget(targetGroup: int = 0): void {
        let startPoint: Point = null;
        let closestBuilding: any = null;
        let secondClosestBuilding: any = null;
        let building: BFOUNDATION = null;
        startPoint = PATHING.FromISO(this._tmpPoint);
        closestBuilding = null;
        secondClosestBuilding = null;
        this._looking = true;
        let checkTarget: Function = (building: BFOUNDATION): void => {
            let targetPoint: Point = GRID.FromISO(building._mc.x, building._mc.y + building._middle);
            let distance: number = GLOBAL.QuickDistance(startPoint, targetPoint) - building._middle;
            if (!closestBuilding || distance < closestBuilding.distance) {
                if (closestBuilding) {
                    secondClosestBuilding = { "building": closestBuilding.building, "distance": closestBuilding.distance };
                }
                closestBuilding = { "building": building, "distance": distance };
            } else if (!secondClosestBuilding || distance < secondClosestBuilding.distance) {
                secondClosestBuilding = { "building": building, "distance": distance };
            }
        };
        // Preferred target is walls
        if (targetGroup == 2) {
            for (building of as3.values(BASE._buildingsWalls)) {
                if (!building._destroyed && building.health > 0) {
                    checkTarget(building);
                }
            }
        } else if (targetGroup == 3) {
            for (building of as3.values(BASE._buildingsMain)) {
                if (building.health > 0 && as3.is(building, ILootable) && !building._looted) {
                    checkTarget(building);
                }
            }
        } else if (targetGroup == 4) {
            for (building of as3.values(BASE._buildingsTowers)) {
                if (MONSTERBUNKER.isBunkerBuilding(building._type)) {
                    let bunker: any = building;
                    if (bunker.health > 0 && (bunker._used > 0 || bunker._monstersDispatchedTotal > 0)) {
                        checkTarget(building);
                    }
                } else if (building._class != "trap" && building.health > 0 && !(as3.as(building, BTOWER)).isJard) {
                    checkTarget(building);
                }
            }
        } else if (this._targetGroup == 6) {
            if (CREATURES._creatureCount > 0 || CREATURES._hasLivingGuardian) {
                this.findHuntingTargets();
                if (this._targetCreep) {
                    this._hasTarget = true;
                    this._hasPath = true;
                    this._waypoints = [this._targetCreep._tmpPoint];
                    this._targetPosition = this._targetCreep._tmpPoint;
                    this._targetCenter = this._targetCreep._tmpPoint;
                }
            }
            for (let huntBunker of as3.values(BASE._buildingsBunkers)) {
                if (huntBunker.health > 0) {
                    let bunkerUsed: boolean = false;
                    if (huntBunker._type == 22) {
                        if (huntBunker._used > 0 || huntBunker._monstersDispatchedTotal > 0) {
                            bunkerUsed = true;
                        }
                    }
                    if (huntBunker._type == 128) {
                        if (HOUSING._housingUsed.Get() > 0) {
                            bunkerUsed = true;
                        }
                    }
                    if (bunkerUsed) {
                        checkTarget(huntBunker);
                    }
                }
            }
        }
        // No preferred targets left or targets all
        if (!closestBuilding || targetGroup == 1) {
            for (building of as3.values(BASE._buildingsMain)) {
                if (building._class != "decoration" && building._class != "immovable" && building.health > 0 && building._class != "enemy") {
                    if (this._targetGroup != 4) {
                        this._targetGroup = 1;
                    }
                    if (building._class == "tower" && !MONSTERBUNKER.isBunkerBuilding(building._type)) {
                        if ((as3.as(building, BTOWER)).isJard) {
                            continue;
                        }
                    }
                    checkTarget(building);
                }
            }
        }
        if (!closestBuilding && !this._targetCreep) {
            // No valid targets left
            this.changeModeRetreat();
        } else {
            // Burrowing monsters move to a random side of their target
            if (this._movement == "burrow") {
                this._hasTarget = true;
                this._hasPath = true;
                let burrowWaypoint: Point = GRID.FromISO(Number(closestBuilding.building._mc.x), Number(closestBuilding.building._mc.y));
                let randSide: int = (Math.random() * 4) | 0;
                let height: int = closestBuilding.building._footprint[0].height | 0;
                let width: int = closestBuilding.building._footprint[0].width | 0;
                if (randSide == 0) {
                    burrowWaypoint.x += Math.random() * height;
                    burrowWaypoint.y += width;
                } else if (randSide == 1) {
                    burrowWaypoint.x += height;
                    burrowWaypoint.y += width;
                } else if (randSide == 2) {
                    burrowWaypoint.x += height - Math.random() * height / 2;
                    burrowWaypoint.y -= width / 4;
                } else if (randSide == 3) {
                    burrowWaypoint.x -= height / 4;
                    burrowWaypoint.y += width - Math.random() * width / 2;
                }
                this._waypoints = [GRID.ToISO(burrowWaypoint.x, burrowWaypoint.y, 0)];
                this._targetPosition = as3.cast(this._waypoints[0], Point);
                this._targetBuilding = as3.cast(closestBuilding.building, BFOUNDATION);
            } else if (this._movement == "fly" || this._movement == "fly_low") {
                this._hasTarget = true;
                this._hasPath = true;
                this._targetBuilding = as3.cast(closestBuilding.building, BFOUNDATION);
                this._targetCenter = this._targetBuilding._position;
                let randAngle: number = NaN;
                let randRadius: number = NaN;
                let flyWaypoint: Point = null;
                // Balthazar gets closer to their target than other flying monsters
                if (this._creatureID == "IC5") {
                    if (!this._targetCreep) {
                        if (GLOBAL.QuickDistance(this._tmpPoint, this._targetCenter) < 50) {
                            this._atTarget = true;
                            this._hasPath = true;
                            this._targetPosition = this._targetCenter;
                        } else {
                            this._movement = "fly";
                            randAngle = (randAngle = (randAngle = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 40 - 20)) / (180 / Math.PI);
                            randRadius = 30 + Math.random() * 10;
                            flyWaypoint = new Point(this._targetCenter.x + Math.cos(randAngle) * randRadius, this._targetCenter.y + Math.sin(randAngle) * randRadius);
                            this._waypoints = [flyWaypoint];
                            this._targetPosition = as3.cast(this._waypoints[0], Point);
                        }
                    }
                } else if (GLOBAL.QuickDistance(this._tmpPoint, this._targetCenter) < 170) {
                    this._atTarget = true;
                    this._hasPath = true;
                    this._targetPosition = this._targetCenter;
                } else {
                    randAngle = (randAngle = (randAngle = Math.atan2(this._tmpPoint.y - this._targetCenter.y, this._tmpPoint.x - this._targetCenter.x) * 57.2957795) + (Math.random() * 40 - 20)) / (180 / Math.PI);
                    randRadius = 120 + Math.random() * 10;
                    flyWaypoint = new Point(this._targetCenter.x + Math.cos(randAngle) * randRadius * 1.7, this._targetCenter.y + Math.sin(randAngle) * randRadius);
                    this._waypoints = [flyWaypoint];
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                }
            } else if (GLOBAL._catchup) {
                this.WaypointTo(new Point(closestBuilding.building._mc.x, closestBuilding.building._mc.y), as3.cast(closestBuilding.building, BFOUNDATION));
            } else {
                // Get paths to the closest 2 buildings
                this.WaypointTo(new Point(closestBuilding.building._mc.x, closestBuilding.building._mc.y), as3.cast(closestBuilding.building, BFOUNDATION));
                if (secondClosestBuilding) {
                    this.WaypointTo(new Point(secondClosestBuilding.building._mc.x, secondClosestBuilding.building._mc.y), as3.cast(secondClosestBuilding.building, BFOUNDATION));
                }
            }
        }
    }

    public WaypointTo(targetPoint: Point, targetBuilding: BFOUNDATION = null): void {
        let ignoreWalls: boolean = false;
        if (this._behaviour === MonsterBase.k_sBHVR_JUICE || this._behaviour === MonsterBase.k_sBHVR_HOUSING || this._behaviour === MonsterBase.k_sBHVR_PEN || this._behaviour === MonsterBase.k_sBHVR_DEFEND || this._behaviour === MonsterBase.k_sBHVR_FEED || this._movement === MonsterBase.k_sBHVR_JUMP || this._behaviour === MonsterBase.k_sBHVR_DECOY) {
            ignoreWalls = true;
        }
        if (targetBuilding) {
            PATHING.GetPath(this._tmpPoint, new Rectangle(targetPoint.x | 0, targetPoint.y | 0, targetBuilding._footprint[0].width, targetBuilding._footprint[0].height), as3.bind(this, this.setWaypoints), ignoreWalls, targetBuilding);
        } else {
            PATHING.GetPath(this._tmpPoint, new Rectangle(targetPoint.x | 0, targetPoint.y | 0, 10, 10), as3.bind(this, this.setWaypoints), ignoreWalls);
        }
    }

    public die(): void {
        if (this.dead) {
            return;
        }
        Targeting.CreepCellDelete(this._id, this.node, false);
        this._dying = true;
        if (!this.juiceReady && (this._movement == "fly" || this._movement == "fly_low")) {
            TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y + this._altitude, "ease": Sine.easeOut, "onComplete": as3.bind(this, this.dieFinish) });
        } else {
            this.dieFinish();
        }
    }

    private dieFinish(): void {
        SOUNDS.Play("monsterland" + (1 + ((Math.random() * 3) | 0)));
        if (this.health <= 0) {
            this.dispatchEvent(new Event(MonsterBase.k_DEATH_EVENT));
            ++QUESTS._global.kills;
            this.deathSplat();
        }
        this.removeAllComponents();
        this.clear();
        this._dead = true;
        if (!this.isDisposable && this._creatureID.substr(0, 1) != "G") {
            this.node = Targeting.CreepCellAdd(this._tmpPoint, this._id, this);
        }
    }

    public corpseDeath(): void {
        Targeting.CreepCellDelete(this._id, this.node, true);
    }

    private removeAllComponents(): void {
        while (this._components.length) {
            this.removeComponent(as3.vget(this._components, this._components.length - 1));
        }
        while (this._attackComponents.length) {
            this.removeComponent(as3.vget(this._attackComponents, this._attackComponents.length - 1));
        }
    }

    public deathSplat(): void {
        SOUNDS.Play("splat" + (((Math.random() * 3) | 0) + 1));
        EFFECTS.CreepSplat(this._creatureID, this._tmpPoint.x | 0, this._tmpPoint.y | 0);
    }

    protected flyerJuice(): void {
        this.m_juiceReady = true;
    }

    public setWaypoints(waypoints: any[], targetBuilding: BFOUNDATION = null, pathingWasCleared: boolean = false): void {
        let moveToTarget: boolean = false;
        if (pathingWasCleared) {
            switch (this._behaviour) {
                case MonsterBase.k_sBHVR_ATTACK:
                    this.findTarget(this._targetGroup);
                    break;
                case MonsterBase.k_sBHVR_HOUSING:
                    this.changeModeHousing();
                    break;
                case MonsterBase.k_sBHVR_RETREAT:
                    this.changeModeRetreat();
            }
        } else {
            moveToTarget = false;
            if (waypoints.length < this._waypoints.length) {
                moveToTarget = true;
            }
            if (moveToTarget && targetBuilding && targetBuilding._class == "wall" && this._targetGroup != 2) {
                moveToTarget = false;
            }
            if (!this._hasTarget) {
                moveToTarget = true;
            }
            if (this._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                moveToTarget = true;
            }
            if (moveToTarget) {
                this._hasTarget = true;
                this._atTarget = false;
                this._hasPath = true;
                this._waypoints = waypoints;
                this._targetPosition = as3.cast(this._waypoints[0], Point);
                if (targetBuilding) {
                    this._targetBuilding = targetBuilding;
                }
            }
            this._looking = false;
        }
    }

    public get range(): number {
        return this.m_range;
    }

    public set range(param1: number) {
        this.m_range = param1;
    }
}
