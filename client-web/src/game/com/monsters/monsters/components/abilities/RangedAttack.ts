import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { Component, GLOBAL, ITargetable, LoanShark, ProjectileUtils, Projectilev2, Targeting } from "@game";

export class RangedAttack extends Component {
    static {
        as3.fields(this, { m_range: 0, m_rechargeDuration: 0, m_timeRechargeIsComplete: 0, m_projectilePool: null, m_projectile: null, m_targetFlags: 0 });
    }

    private static readonly k_projectileSpeed: uint = 2;

    private static readonly k_projectilePoolSize: uint = 2;
    protected m_range: uint;
    protected m_rechargeDuration: uint;
    protected m_timeRechargeIsComplete: uint;
    protected m_projectilePool: LoanShark;
    protected m_projectile: Projectilev2;
    protected m_targetFlags: int;

    public $ctor(param1?: uint, param2?: int, param3?: int, param4?: Projectilev2): void {
        super.$ctor();
        this.m_range = param1;
        this.m_rechargeDuration = param2 >>> 0;
        this.m_projectile = param4;
        this.m_targetFlags = param3;
    }

    protected override onRegister(): void {
        this.m_projectilePool = new LoanShark(Object(this.m_projectile).constructor, true, RangedAttack.k_projectilePoolSize);
    }

    protected override onUnregister(): void {
        this.m_projectilePool.dispose();
    }

    public override tick(param1: int = 1): void {
        let _loc2_: Vector<ITargetable> = null;
        if (GLOBAL.Timestamp() >= this.m_timeRechargeIsComplete) {
            _loc2_ = this.getValidTargetsInRange(this.m_range, new Point(this.owner.x, this.owner.y), this.m_targetFlags);
            if (Boolean(_loc2_) && _loc2_.length > 0) {
                this.fireAt(as3.vget(_loc2_, 0));
                this.m_timeRechargeIsComplete = (GLOBAL.Timestamp() + this.m_rechargeDuration) >>> 0;
            }
        }
    }

    protected getValidTargetsInRange(param1: uint, param2: Point, param3: int): Vector<ITargetable> {
        let _loc4_: Vector<ITargetable> = null;
        let _loc5_: any[] = Targeting.getTargetsInRange(param1, param2, param3);
        let _loc6_: int = 0;
        while (_loc6_ < _loc5_.length) {
            if (!_loc4_) {
                _loc4_ = new Vector<ITargetable>(0, false, ITargetable);
            }
            _loc4_.push(_loc5_[_loc6_].creep);
            _loc6_++;
        }
        return _loc4_;
    }

    protected fireAt(param1: ITargetable): Projectilev2 {
        let _loc2_: Projectilev2 = as3.as(this.m_projectilePool.borrowObject(), Projectilev2);
        _loc2_.setup(as3.cast(ProjectileUtils.getFireballBitmapData(), IBitmapDrawable), this.owner.x, this.owner.getDisplayY(), param1, ProjectileUtils.k_fireballSpeed, 0, this.owner);
        return _loc2_;
    }
}
