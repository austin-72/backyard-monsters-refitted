import * as as3 from "as3";
import { Component, IAttackable, IAttackingComponent, ITargetable } from "@game";

/**
 * Inferno-only: heals the owner for a share of every hit it lands (the Emberghoul's Stoke). The share is of
 * the damage the hit actually did (after armour; a building or monster already down gives nothing), and the
 * heal never goes above the owner's maximum health.
 */
export class LifestealOnAttack extends Component implements IAttackingComponent {
    static {
        as3.implement(this, [IAttackingComponent]);
        as3.fields(this, { m_ratio: NaN, healed: 0 });
    }

    private m_ratio: number;
    /** Health given back so far (for tests). */
    public healed: number;

    public $ctor(ratio?: number): void {
        super.$ctor();
        this.m_ratio = ratio;
    }

    public get ratio(): number {
        return this.m_ratio;
    }

    public onAttack(param1: IAttackable, param2: number, param3: ITargetable = null): number {
        if (!this.owner || this.owner.health <= 0 || this.owner.health >= this.owner.maxHealth) {
            return 0;
        }
        let heal: number = Math.min(Math.abs(param2) * this.m_ratio, this.owner.maxHealth - this.owner.health);
        if (heal > 0) {
            this.owner.modifyHealth(heal);
            this.healed += heal;
        }
        return 0;
    }
}
