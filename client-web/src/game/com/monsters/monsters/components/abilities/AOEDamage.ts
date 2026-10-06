import * as as3 from "as3";
import { int, uint } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, Component, IAttackable, MonsterBase, Targeting } from "@game";

export class AOEDamage extends Component {
    static {
        as3.fields(this, { m_radiusInner: 0, m_radiusOuter: 0, m_maxTargets: 0, m_targetFlags: 0, m_includeInitialTarget: false });
    }

    protected m_radiusInner: uint;
    protected m_radiusOuter: uint;
    protected m_maxTargets: uint;
    protected m_targetFlags: int;
    protected m_includeInitialTarget: boolean;

    public $ctor(radiusOuter?: uint, targetFlags?: int, maxTargets: uint = 4294967295, radiusInner: uint = 0, includeInitialTarget: boolean = true): void {
        super.$ctor();
        this.m_radiusOuter = radiusOuter;
        this.m_radiusInner = radiusInner;
        this.m_maxTargets = maxTargets;
        this.m_targetFlags = targetFlags;
        this.m_includeInitialTarget = includeInitialTarget;
    }

    protected dealAOEDamage(damage: number, initialTarget: IAttackable = null): void {
        let ownerLocation: Point = new Point(this.owner.x, this.owner.y);
        let allTargets: any[] = this.getAllTargets(ownerLocation, initialTarget);
        if (allTargets.length <= 0) {
            return;
        }
        as3.sortOn(allTargets, ["dist"], Array.NUMERIC);
        if (allTargets.length > this.m_maxTargets) {
            allTargets.length = this.m_maxTargets;
        }
        Targeting.DealLinearAEDamage(ownerLocation, this.m_radiusOuter, Math.abs(damage), allTargets, this.m_radiusInner);
    }

    private getAllTargets(ownerLocation: Point, initialTarget: IAttackable = null): any[] {
        let targetFlags: int = this.m_targetFlags;
        let ignoreCreep: MonsterBase = null;
        let ignoreBuilding: BFOUNDATION = null;
        if (this.owner._friendly && Boolean(targetFlags & Targeting.k_TARGETS_BUILDINGS) && !(initialTarget instanceof BFOUNDATION)) {
            // Defending monsters will not hit their own base's buildings unless specifically targetting them.
            targetFlags ^= Targeting.k_TARGETS_BUILDINGS;
        }
        if (!this.m_includeInitialTarget) {
            if (initialTarget instanceof MonsterBase) {
                ignoreCreep = as3.as(initialTarget, MonsterBase);
            } else if (initialTarget instanceof BFOUNDATION) {
                ignoreBuilding = as3.as(initialTarget, BFOUNDATION);
            }
        }
        return Targeting.getTargetsInRange(this.m_radiusOuter, ownerLocation, targetFlags, ignoreCreep, ignoreBuilding);
    }
}
