import * as as3 from "as3";
import { int, uint } from "as3";
import { Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, Bunker, CreepBase, Expo, GLOBAL, HOUSING, ITargetable, IoHfoWaves, KEYS, MAP, MapRoomManager, MonsterBase, POPUPS, Targeting, TweenLite, popup_building } from "@game";

export class HOUSINGBUNKER extends Bunker {
    static {
        as3.fields(this, { bragPopUp: null, _capacity: 0, _hasTargets: false, _frameNumber: 0, _monsters: null, _dispatchedMonsters: null, _targetCreeps: null, _targetFlyers: null, _tickNumber: 0, _isLogged: false, _radiusGraphic: null });
    }

    public bragPopUp: popup_building;
    public _capacity: int;
    public _hasTargets: boolean;
    public _frameNumber: int;
    public _monsters: any;
    public _dispatchedMonsters: any[];
    public _targetCreeps: any[];
    public _targetFlyers: any[];
    public _tickNumber: int;
    public _isLogged: boolean;
    private _radiusGraphic: Shape;

    public $ctor(): void {
        super.$ctor();
        this._type = 128;
        this._footprint = [new Rectangle(0, 0, 160, 160)];
        this._gridCost = [[new Rectangle(10, 10, 140, 20), 400], [new Rectangle(10, 30, 20, 120), 400], [new Rectangle(30, 130, 120, 20), 400], [new Rectangle(130, 30, 20, 30), 400], [new Rectangle(130, 100, 20, 30), 400]];
        this._frameNumber = 0;
        this._spoutPoint = new Point(0, 0);
        this._spoutHeight = 40;
        this._monsters = {};
        this._monstersDispatched = {};
        this._dispatchedMonsters = [];
        this._targetCreeps = [];
        this._targetFlyers = [];
        this.SetProps();
    }

    public override StopMoveB(): void {
        super.StopMoveB();
        this.UpdateHousedCreatureTargets();
    }

    public override Description(): void {
        super.Description();
        this._upgradeDescription = KEYS.Get("bdg_housing_capacitydesc", { "v1": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[this._lvl.Get() - 1])), "v2": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[this._lvl.Get()])) });
        if (this._recycleCosts != null) {
            this._recycleDescription = "<b>" + KEYS.Get("bdg_housing_recycledesc") + "</b><br>" + this._recycleCosts;
        }
        HOUSING.HousingSpace();
        if (!BASE.isOutpost) {
            this._blockRecycle = false;
        }
        if (HOUSING._housingSpace.Get() - this._buildingProps.capacity[this._lvl.Get() - 1] < 0) {
            this._recycleDescription = "<font color=\"#CC0000\">" + KEYS.Get("bdg_compound_recyclewarning") + "</font>";
            this._blockRecycle = true;
        }
    }

    public override Constructed(): void {
        super.Constructed();
        HOUSING.AddHouse(this);
        this.updateLocalProperties();
    }

    private updateLocalProperties(): void {
        if (this._lvl.Get() > 0) {
            this._capacity = this._buildingProps.capacity[this._lvl.Get() - 1] | 0;
            this._range = this._buildingProps.stats[this._lvl.Get() - 1].range | 0;
        }
    }

    public override Upgraded(): void {
        super.Upgraded();
        HOUSING.HousingSpace();
        this.updateLocalProperties();
    }

    private CloseUpgradePopUp(param1: MouseEvent): void {
        this.bragPopUp.bPost.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CloseUpgradePopUp));
        POPUPS.Next();
        GLOBAL.CallJS("sendFeed", ["upgrade-ho-" + this._lvl.Get(), KEYS.Get("pop_housingupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_housingupgraded_streambody"), "upgrade-housing.png"]);
    }

    private CloseConstructionPopUp(param1: MouseEvent): void {
        this.bragPopUp.bPost.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.CloseConstructionPopUp));
        POPUPS.Next();
        GLOBAL.CallJS("sendFeed", ["build-wmb", KEYS.Get("pop_bunkerbuilt_streamtitle"), KEYS.Get("pop_bunkerbuilt_streambody"), "build-monsterbunker.png"]);
    }

    public override RecycleC(): void {
        super.RecycleC();
        this.Removed();
        HOUSING.HousingSpace();
        this.RelocateHousedCreatures();
    }

    public override Destroyed(param1: boolean = true): void {
        super.Destroyed(param1);
        let _loc2_: boolean = MapRoomManager.instance.isInMapRoom3;
        let _loc3_: int = 0;
        while (_loc3_ < this._creatures.length) {
            this._creatures[_loc3_].setHealth(_loc2_ ? this._creatures[_loc3_].health * 0.5 : 0);
            _loc3_++;
        }
        if (!_loc2_) {
            HOUSING.Cull();
        }
    }

    private Removed(): void {
        this._capacity = 0;
        this._dispatchedMonsters = [];
        HOUSING.RemoveHouse(this);
    }

    public override Setup(param1: any): void {
        param1.t = this._type;
        super.Setup(param1);
        if (this.health > 10 && this.health < this.maxHealth && this.health % 1000 == 0) {
            this.setHealth(this.maxHealth);
        }
        if (this._countdownBuild.Get() == 0) {
            HOUSING.AddHouse(this);
            BASE._buildingsBunkers["b" + this._id] = this;
            BASE._buildingsTowers["b" + this._id] = this;
        }
        this.updateLocalProperties();
    }

    public FindTargets(param1: int, param2: int = 1): void {
        this._hasTargets = false;
        // Was "level 0 and destroyed": a bunker still being built (level 0) under attack then looked up
        // stats[-1] and stopped the game (bug reports: "reading 'range'"). Either one means no targets,
        // as in the Monster Bunker (BUILDING22).
        let stats: any[] = as3.cast(GLOBAL._buildingProps[127].stats, Array);
        let level: int = Math.min(this._lvl.Get(), stats.length) | 0;
        if (level <= 0 || this.health <= 0) {
            this._targetCreeps = [];
            this._targetFlyers = [];
            return;
        }
        let _loc3_: any[] = Targeting.getCreepsInRange(Number(stats[level - 1].range), this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(0));
        this._targetCreeps = this.addTargetCreeps(param1, _loc3_, param2);
        if (this.canTargetAir()) {
            _loc3_ = Targeting.getCreepsInRange(Number(stats[level - 1].range), this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(2));
            this._targetFlyers = this.addTargetCreeps(param1, _loc3_, param2);
        } else {
            this._targetFlyers = [];
        }
    }

    private canTargetAir(): boolean {
        let _loc2_: any = undefined;
        let _loc1_: int = 0;
        while (_loc1_ < this._creatures.length) {
            _loc2_ = this._creatures[_loc1_];
            if (_loc2_._creatureID == "IC5" || _loc2_._creatureID == "IC7") {
                return true;
            }
            _loc1_++;
        }
        return false;
    }

    private addTargetCreeps(param1: int, param2: any[], param3: int): any[] {
        let _loc5_: int = 0;
        let _loc6_: any = undefined;
        let _loc7_: any = undefined;
        let _loc4_: any[] = [];
        if (param2.length > 0) {
            this.sortCreeps(param2, param3);
            _loc5_ = 0;
            while (_loc5_ < param2.length) {
                _loc6_ = param2[_loc5_];
                _loc7_ = param2[_loc5_];
                if (_loc5_ <= param1 && _loc7_._behaviour != "retreat") {
                    _loc4_.push({ "creep": _loc7_.creep, "dist": _loc6_.dist, "position": _loc6_.pos });
                    this._hasTargets = true;
                }
                _loc5_++;
            }
        }
        return _loc4_;
    }

    private sortCreeps(param1: any[], param2: int): void {
        switch (param2) {
            case 1:
                as3.sortOn(param1, ["dist"], Array.NUMERIC);
                break;
            case 2:
                as3.sortOn(param1, ["dist"], Array.NUMERIC | Array.DESCENDING);
                break;
            case 3:
                as3.sortOn(param1, ["hp"], Array.NUMERIC | Array.DESCENDING);
                break;
            case 4:
                as3.sortOn(param1, ["hp"], Array.NUMERIC);
                break;
            default:
                throw new Error("invalid sorting type");
        }
    }

    private getUnusedCreatures(): any[] {
        let _loc1_: any[] = this._creatures.slice();
        let _loc2_: uint = _loc1_.length;
        let _loc3_: int = (_loc2_ - 1) | 0;
        while (_loc3_ >= 0) {
            if (this._dispatchedMonsters.indexOf(_loc1_[_loc3_]) >= 0) {
                _loc1_.splice(_loc3_, 1);
            }
            _loc3_--;
        }
        return _loc1_;
    }

    public override TickAttack(): void {
        let _loc4_: string = null;
        let _loc5_: any = undefined;
        let _loc6_: any = undefined;
        let _loc7_: int = 0;
        let _loc8_: uint = 0;
        let _loc9_: int = 0;
        super.TickAttack();
        if (this.health > 0 && this._lvl.Get() > 0) {
            this._capacity = this._buildingProps.capacity[this._lvl.Get() - 1] | 0;
        }
        // Hell Freezes Over: the Compound is frozen solid while a wave is on; its monsters can't come out
        if (GLOBAL.INFERNO_ONLY && IoHfoWaves.compoundFrozen) {
            this._targetCreeps = [];
            this._targetFlyers = [];
            this._hasTargets = false;
            return;
        }
        let _loc1_: any[] = null;
        // the defenders not sent out yet: only needed when sending (below)
        let _loc2_: boolean = false;
        let _loc3_: int = 0;
        while (_loc3_ < this._targetCreeps.length) {
            if (this._targetCreeps[_loc3_].creep.health <= 0) {
                _loc2_ = true;
            }
            _loc3_++;
        }
        _loc3_ = 0;
        while (_loc3_ < this._targetFlyers.length) {
            if (this._targetFlyers[_loc3_].creep.health <= 0) {
                _loc2_ = true;
            }
            _loc3_++;
        }
        if (_loc2_) {
            this._targetCreeps = [];
            this._targetFlyers = [];
            this._hasTargets = false;
        }
        if (this._countdownUpgrade.Get() == 0 && ((!this._hasTargets || _loc2_) && this._frameNumber % 10 == 0 || this._frameNumber % 60 == 0)) {
            this.FindTargets(3);
        }
        ++this._tickNumber;
        if ((this._targetFlyers.length > 0 || this._targetCreeps.length > 0) && this._tickNumber % 30 == 0) {
            _loc4_ = null;
            _loc1_ = this.getUnusedCreatures();
            as3.sortOn(this._targetCreeps, ["dist"], Array.NUMERIC);
            as3.sortOn(this._targetFlyers, ["dist"], Array.NUMERIC);
            if (this._targetFlyers.length > 0) {
                _loc7_ = 0;
                while (_loc7_ < this._targetFlyers.length) {
                    _loc5_ = this._targetFlyers[_loc7_].creep;
                    _loc6_ = this.getInterceptor(_loc1_, _loc5_);
                    if (_loc6_) {
                        this.dispatchCreature(_loc6_, _loc5_);
                        _loc1_.splice(_loc1_.indexOf(_loc6_), 1);
                    }
                    _loc7_++;
                }
            }
            if (this._targetCreeps.length > 0) {
                _loc9_ = ((_loc8_ = _loc1_.length) - 1) | 0;
                while (_loc9_ >= 0) {
                    _loc5_ = this._targetCreeps[0].creep;
                    // The first defender still unused (this was an index left over from the flyer loop:
                    // with flyers targeted, some defenders were never sent and nothing was sent instead).
                    _loc6_ = _loc1_[0];
                    if (!_loc6_) {
                        break;
                    }
                    this.dispatchCreature(_loc6_, _loc5_);
                    _loc1_.splice(0, 1);
                    _loc9_--;
                }
            }
        }
    }

    /**
     * Marilyn Monstroe: every monster of this Compound that is at home and within her range comes
     * out as a defender. She attracts defenders in range every frame, so that is all it takes; the
     * Compound's own dispatch only ever reacts to attacking monsters.
     */
    public EjectCreeps(param1: Point, param2: number): void {
        let creep: CreepBase = null;
        let waiting: any[] = null;
        if (this.health <= 0 || this._countdownUpgrade.Get() != 0 || GLOBAL.INFERNO_ONLY && IoHfoWaves.compoundFrozen) {
            return;
        }
        waiting = this.getUnusedCreatures();
        for (creep of as3.values(waiting)) {
            if (creep && creep._mc && GLOBAL.QuickDistance(new Point(creep._mc.x, creep._mc.y), param1) <= param2) {
                creep.changeModeDefend();
                creep._homeBunker = this;
                this._dispatchedMonsters.push(creep);
            }
        }
    }

    private getInterceptor(param1: any[], param2: any): any {
        let _loc4_: any = undefined;
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            if ((_loc4_ = param1[_loc3_])._creatureID == "IC7" || _loc4_._creatureID == "IC5") {
                return _loc4_;
            }
            _loc3_++;
        }
        return null;
    }

    private dispatchCreature(param1: any, param2: any): void {
        let _loc3_: number = param2._tmpPoint.x - this._position.x;
        let _loc4_: number = param2._tmpPoint.y - this._position.y;
        let _loc5_: int = this._footprint[0].width | 0;
        let _loc6_: int = this._footprint[0].height | 0;
        if (_loc4_ <= 0) {
            _loc4_ = _loc6_ / 4;
            if (_loc3_ <= 0) {
                _loc3_ = _loc5_ / -3;
            } else {
                _loc3_ = _loc5_ / 2;
            }
        } else {
            _loc4_ = _loc6_ / 2;
            if (_loc3_ <= 0) {
                _loc3_ = _loc5_ / -4;
            } else {
                _loc3_ = _loc5_ / 2;
            }
        }
        let _loc7_: CreepBase = null;
        _loc7_ = as3.cast(param1, CreepBase);
        if (_loc7_) {
            _loc7_._targetRotation = Math.random() * 360;
            _loc7_.changeModeDefend();
            _loc7_._targetCreep = as3.cast(param2, MonsterBase);
            _loc7_._homeBunker = this;
            _loc7_._hasTarget = true;
            if (_loc7_._pathing == "direct") {
                _loc7_.graphic.alpha = 0;
                _loc7_._phase = 1;
            }
            _loc7_.WaypointTo(_loc7_._targetCreep._tmpPoint);
            _loc7_._targetPosition = _loc7_._targetCreep._tmpPoint;
            this._dispatchedMonsters.push(param1);
        }
    }

    public override TickFast(param1: Event = null): void {
        ++this._frameNumber;
    }

    public override modifyHealth(param1: number, param2: ITargetable = null): number {
        if (this.health <= 0) {
            ATTACK.Log("b" + this._id, "<font color=\"#990000\">" + KEYS.Get("attack_log_%damaged", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)), "v3": 100 - ((100 / this.maxHealth * this.health) | 0) }) + "</font>");
        }
        return super.modifyHealth(param1);
    }

    public Cull(): void {
        let _loc3_: string = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        HOUSING.Cull();
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

    public RemoveCreature(param1: string, param2: MonsterBase = null): void {
        if (!MapRoomManager.instance.isInMapRoom3 || !BASE.isMainYardOrInfernoMainYard) {
            this._monsters[param1] = (this._monsters[param1] | 0) - 1;
            if (this._monsters[param1] < 0) {
                this._monsters[param1] = 0;
            }
            if (GLOBAL.player.monsterListByID(param1).numCreeps > 0) {
                // The dead creep's own record when we know it (health is tracked per monster now).
                if (!(param2 && GLOBAL.player.monsterListByID(param1).ioRemoveCreep(param2))) {
                    GLOBAL.player.monsterListByID(param1).add(-1);
                }
            }
        }
        this._monstersDispatched[param1] = (this._monstersDispatched[param1] | 0) - 1;
        if (this._monstersDispatched[param1] < 0) {
            this._monstersDispatched[param1] = 0;
        }
        --this._monstersDispatchedTotal;
        if (this._monstersDispatchedTotal < 0) {
            this._monstersDispatchedTotal = 0;
        }
        HOUSING.HousingSpace();
        BASE.Save();
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
}
