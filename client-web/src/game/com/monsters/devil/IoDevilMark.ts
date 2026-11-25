import * as as3 from "as3";
import { Component, IAttackable, IDefendingComponent, IPropertyModifier, ITargetable, MultiplicationPropertyModifier } from "@game";

/**
 * Inferno-only (13 November): the Devil's Contract on one of the player's attacking monsters (IoDevil.battleTick puts
 * it on once): Bloodlust (more damage dealt, more taken) and Swift Horde (faster, less health). Modifiers on the
 * living monster, as Ashkarr's war-cry and the synergies are: the monster tables, which the server checks with every
 * attack, are never touched. Never on a champion (the user's rule). Nothing is drawn on it.
 */
export class IoDevilMark extends Component implements IDefendingComponent {
    static {
        as3.implement(this, [IDefendingComponent]);
        as3.fields(this, { m_damage: null, m_speed: null, m_health: null, m_hurt: 1 });
    }

    public static readonly NAME: string = "ioDevil";

    private m_damage: IPropertyModifier;
    private m_speed: IPropertyModifier;
    private m_health: IPropertyModifier;
    private m_hurt: number;

    public $ctor(damage: number = 1, hurt: number = 1, speed: number = 1, health: number = 1): void {
        super.$ctor();
        this.m_damage = damage != 1 ? new MultiplicationPropertyModifier(damage) : null;
        this.m_speed = speed != 1 ? new MultiplicationPropertyModifier(speed) : null;
        this.m_health = health != 1 ? new MultiplicationPropertyModifier(health) : null;
        this.m_hurt = hurt > 0 ? hurt : 1;
    }

    /** Damage taken, times (Bloodlust's price). */
    public onDefend(target: IAttackable, amount: number, source: ITargetable = null): number {
        return amount < 0 ? amount * this.m_hurt : amount;
    }

    protected override onRegister(): void {
        let o: any = this.owner;
        if (!o) {
            return;
        }
        if (this.m_damage && o.damageProperty) {
            o.damageProperty.addModifier(this.m_damage);
        }
        if (this.m_speed && o.moveSpeedProperty) {
            o.moveSpeedProperty.addModifier(this.m_speed);
        }
        if (this.m_health && o.maxHealthProperty) {
            // (its health kept as the same share of the new most)
            let before: number = Number(o.maxHealth) || 0;
            let share: number = before > 0 ? o.health / before : 1;
            o.maxHealthProperty.addModifier(this.m_health);
            let after: number = Number(o.maxHealth) || 0;
            if (after > 0) {
                o.setHealth(Math.max(1, Math.min(after, share * after)));
            }
        }
    }

    protected override onUnregister(): void {
        let o: any = this.owner;
        if (!o) {
            return;
        }
        if (this.m_damage && o.damageProperty) {
            o.damageProperty.removeModifier(this.m_damage);
        }
        if (this.m_speed && o.moveSpeedProperty) {
            o.moveSpeedProperty.removeModifier(this.m_speed);
        }
        if (this.m_health && o.maxHealthProperty) {
            o.maxHealthProperty.removeModifier(this.m_health);
        }
    }
}
