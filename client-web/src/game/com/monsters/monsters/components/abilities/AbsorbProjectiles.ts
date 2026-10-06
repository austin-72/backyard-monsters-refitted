import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Event } from "flash/events";
import { Point } from "flash/geom";
import { Component, IAttackable, IDefendingComponent, ITargetable, MonsterBase, PROJECTILE, PROJECTILES, Targeting } from "@game";

export class AbsorbProjectiles extends Component implements IDefendingComponent {
    static {
        as3.implement(this, [IDefendingComponent]);
        as3.fields(this, { m_absorbedProjectiles: null, m_blastRadius: 0, m_damageAbsorbed: 0 });
    }

    private m_absorbedProjectiles: Vector<PROJECTILE>;
    private m_blastRadius: uint;
    private m_damageAbsorbed: uint;

    public $ctor(param1: uint = 300): void {
        super.$ctor();
        this.m_blastRadius = param1;
        this.m_absorbedProjectiles = new Vector<PROJECTILE>(0, false, PROJECTILE);
    }

    protected override onRegister(): void {
        this.owner.addEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    protected override onUnregister(): void {
        this.owner.removeEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    private onDeath(param1: Event): void {
        let _loc5_: uint = 0;
        let _loc6_: IAttackable = null;
        let _loc7_: PROJECTILE = null;
        let _loc2_: Point = new Point(this.owner.x, this.owner.y);
        let _loc3_: any[] = Targeting.getTargetsInRange(this.m_blastRadius, _loc2_, Targeting.getEnemyFlag(this.owner) | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_BUILDINGS);
        let _loc4_: int = 0;
        while (_loc4_ < this.m_absorbedProjectiles.length) {
            _loc5_ = (Math.random() * (_loc3_.length - 1)) >>> 0;
            _loc6_ = as3.cast(_loc3_[_loc5_].creep, IAttackable);
            _loc7_ = as3.vget(this.m_absorbedProjectiles, _loc4_);
            PROJECTILES.Spawn(_loc2_, new Point(_loc6_.x, _loc6_.y), _loc6_, _loc7_._maxSpeed, (-_loc7_._damage) | 0, _loc7_._rocket, _loc7_._splash | 0, _loc7_._splashTargetFlags);
            _loc4_++;
        }
        this.setOwnerScale(1);
        this.m_absorbedProjectiles = null;
    }

    public onDefend(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        let _loc4_: PROJECTILE = null;
        let _loc5_: number = NaN;
        if (param3 instanceof PROJECTILE && Boolean(this.m_absorbedProjectiles)) {
            _loc4_ = as3.cast(param3, PROJECTILE);
            this.m_absorbedProjectiles.push(_loc4_);
            this.m_damageAbsorbed = (this.m_damageAbsorbed + _loc4_._damage) >>> 0;
            _loc5_ = 1 + this.m_damageAbsorbed / this.owner.maxHealth;
            this.setOwnerScale(_loc5_);
        }
        return param2;
    }

    private setOwnerScale(param1: number): void {
        this.owner._mc.scaleX = param1;
        this.owner._mc.scaleY = param1;
    }
}
