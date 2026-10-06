import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Point } from "flash/geom";
import { Component, Enrage, MonsterBase, Targeting } from "@game";

export class AOEEnrage extends Component {
    static {
        as3.fields(this, { m_radius: 0, m_duration: NaN, m_speedMultiplier: NaN, m_armorMultiplier: NaN, m_enragedFriends: null, m_targetFlags: 0, m_rangeCheckCounter: 0 });
    }

    private static readonly RANGE_CHECK_INTERVAL: int = 30;
    private m_radius: uint;
    private m_duration: number;
    private m_speedMultiplier: number;
    private m_armorMultiplier: number;
    private m_enragedFriends: Vector<MonsterBase>;
    private m_targetFlags: int;
    private m_rangeCheckCounter: int;

    public $ctor(param1?: uint, param2?: number, param3?: number, param4: number = 0): void {
        super.$ctor();
        this.m_radius = param1;
        this.m_duration = param4;
        this.m_speedMultiplier = param2;
        this.m_armorMultiplier = param3;
        this.m_enragedFriends = new Vector<MonsterBase>(0, false, MonsterBase);
    }

    protected override onRegister(): void {
        this.m_targetFlags = Targeting.getFriendlyFlag(this.owner) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
    }

    protected override onUnregister(): void {
        this.removeEnrageFromOutOfRangeFriendlies();
    }

    private getFriendliesInRange(): Vector<MonsterBase> {
        let _loc4_: any = undefined;
        let _loc1_: any[] = Targeting.getTargetsInRange(this.m_radius, new Point(this.owner.x, this.owner.y), this.m_targetFlags);
        let _loc2_: Vector<MonsterBase> = new Vector<MonsterBase>(0, false, MonsterBase);
        let _loc3_: int = 0;
        while (_loc3_ < _loc1_.length) {
            if ((_loc4_ = _loc1_[_loc3_].creep) instanceof MonsterBase && _loc4_ != this.owner) {
                _loc2_.push(as3.as(_loc4_, MonsterBase));
            }
            _loc3_++;
        }
        return _loc2_;
    }

    public override tick(param1: int = 1): void {
        // Only check range every 30 ticks instead of every tick
        // This reduces expensive range calculations from 60fps to 2fps with no gameplay impact
        this.m_rangeCheckCounter += param1;

        if (this.m_rangeCheckCounter >= AOEEnrage.RANGE_CHECK_INTERVAL) {
            this.m_rangeCheckCounter = 0;

            let _loc2_: Vector<MonsterBase> = this.getFriendliesInRange();
            if (this.owner.inBattleState) {
                this.addEnrageToFriendliesInRange(_loc2_);
                this.removeEnrageFromOutOfRangeFriendlies(_loc2_);
            } else {
                this.removeEnrageFromOutOfRangeFriendlies();
            }
        }
    }

    /*
     * Applies the Enrage component to nearby friendly monsters that are eligible.
     * Skips invalid targets, monsters already enraged, and monsters missing
     * required stat properties.
     *
     * @param friendliesInRange List of friendly monsters within effect range
     */
    private addEnrageToFriendliesInRange(friendliesInRange: Vector<MonsterBase>): void {
        for (let i: int = 0; i < friendliesInRange.length; i++) {
            let friendly: MonsterBase = as3.vget(friendliesInRange, i);

            if (!friendly) {
                continue;
            }

            if (friendly.getComponentByName(this.name)) {
                continue;
            }

            if (!friendly.moveSpeedProperty || !friendly.attackDelayProperty || !friendly.armorProperty) {
                continue;
            }

            let enrage: Enrage = new Enrage(this.m_speedMultiplier, this.m_armorMultiplier, this.owner._creatureID);

            friendly.addComponent(enrage, this.name);
            this.m_enragedFriends.push(friendly);
        }
    }

    private removeEnrageFromOutOfRangeFriendlies(param1: Vector<MonsterBase> = null): void {
        let _loc3_: MonsterBase = null;
        let _loc4_: Component = null;
        if (!param1) {
            param1 = new Vector<MonsterBase>(0, false, MonsterBase);
        }
        let _loc2_: int = 0;
        while (_loc2_ < this.m_enragedFriends.length) {
            _loc3_ = as3.vget(this.m_enragedFriends, _loc2_);
            if ((Boolean(_loc4_ = _loc3_.getComponentByName(this.name))) && param1.indexOf(_loc3_) < 0) {
                _loc3_.removeComponent(_loc4_);
                this.m_enragedFriends.splice(_loc2_, 1);
                _loc2_--;
            }
            _loc2_++;
        }
    }
}
