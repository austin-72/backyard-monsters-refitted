import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Point } from "flash/geom";
import { IAttackable, ITargetable, ProjectileComponent, Projectilev2, Targeting } from "@game";

export class GlaiveProjectileComponent extends ProjectileComponent {
    static {
        as3.fields(this, { m_targetsLeft: 0, m_targetFlags: 0, m_range: 0, m_targetsAlreadyHit: null });
    }

    private m_targetsLeft: uint;
    private m_targetFlags: int;
    private m_range: uint;
    private m_targetsAlreadyHit: Vector<IAttackable>;

    public $ctor(param1?: uint, param2?: uint, param3: number = 0): void {
        super.$ctor();
        this.m_targetsLeft = param1;
        this.m_targetFlags = param3 | 0;
        this.m_targetsAlreadyHit = new Vector<IAttackable>(0, false, IAttackable);
        this.m_range = param2;
    }

    public override onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        if (this.m_targetsLeft > 0) {
            this.m_targetsAlreadyHit.push(param1);
            param1 = this.getViableTarget(new Point(param3.x, param3.y));
            if (param1) {
                as3.cast(param3, Projectilev2).target = param1;
                as3.cast(param3, Projectilev2).damage = as3.cast(param3, Projectilev2).damage * 0.5;
                --this.m_targetsLeft;
            }
        }
        return param2;
    }

    private getViableTarget(param1: Point): IAttackable {
        let _loc3_: int = 0;
        let _loc4_: IAttackable = null;
        let _loc2_: any[] = Targeting.getTargetsInRange(this.m_range, param1, this.m_targetFlags);
        if (_loc2_.length > 0) {
            as3.sortOn(_loc2_, ["dist"], Array.NUMERIC);
            _loc3_ = 0;
            while (_loc3_ < _loc2_.length) {
                _loc4_ = as3.cast(_loc2_[_loc3_].creep, IAttackable);
                if (this.m_targetsAlreadyHit.indexOf(_loc4_) == -1) {
                    return _loc4_;
                }
                _loc3_++;
            }
        }
        return null;
    }
}
