import * as as3 from "as3";
import { int, uint } from "as3";
import { GlowFilter } from "flash/filters";
import { getTimer } from "flash/utils";
import { Component, DivisionModifier, IAttackable, IDefendingComponent, IPropertyModifier, ITargetable, MultiplicationPropertyModifier } from "@game";

/**
 * Inferno Catapult: the Sulfur Bomb's effect on your monsters.
 *
 * Speed (move and attack) for the whole time. Armour (the share of damage removed): 100% (invulnerable)
 * for `invuln` seconds, then it fades evenly from `armor`% to 0 by the end of `total` seconds, when the
 * component removes itself. The glow shows the armour: red at 100%, orange from 99% to 45%, yellow
 * from 44% to 1%.
 */
export class IoSulfurShield extends Component implements IDefendingComponent {
    static {
        as3.implement(this, [IDefendingComponent]);
        as3.fields(this, { m_moveSpeedModifier: null, m_attackSpeedModifier: null, m_invulnMs: NaN, m_armor: NaN, m_totalMs: NaN, m_start: 0, m_filter: null, m_band: -1 });
    }

    private static readonly RED: uint = 16719904;

    private static readonly ORANGE: uint = 16747520;

    private static readonly YELLOW: uint = 16769024;
    private m_moveSpeedModifier: IPropertyModifier;
    private m_attackSpeedModifier: IPropertyModifier;
    private m_invulnMs: number;
    private m_armor: number;
    private m_totalMs: number;
    private m_start: int;
    private m_filter: GlowFilter;
    private m_band: int;

    public $ctor(speed?: number, invulnSeconds?: number, totalSeconds?: number, armor: number = 99): void {
        super.$ctor();
        this.m_moveSpeedModifier = new MultiplicationPropertyModifier(speed);
        this.m_attackSpeedModifier = new DivisionModifier(speed);
        this.m_invulnMs = Math.max(0, invulnSeconds) * 1000;
        this.m_armor = Math.max(0, Math.min(99, armor));
        this.m_totalMs = Math.max(this.m_invulnMs + 1000, totalSeconds * 1000);
        this.m_start = getTimer();
    }

    /** Armour now, as a percentage: 100 while invulnerable, then `armor` down to 0. */
    public get armorPercent(): int {
        let t: number = getTimer() - this.m_start;
        if (t < this.m_invulnMs) {
            return 100;
        }
        if (t >= this.m_totalMs) {
            return 0;
        }
        return Math.ceil(this.m_armor * (1 - (t - this.m_invulnMs) / (this.m_totalMs - this.m_invulnMs))) | 0;
    }

    public onDefend(target: IAttackable, amount: number, source: ITargetable = null): number {
        if (amount >= 0) {
            return amount;
        }
        return amount * (1 - this.armorPercent / 100);
    }

    protected override onRegister(): void {
        if (!this.owner || !this.owner.moveSpeedProperty || !this.owner.attackDelayProperty) {
            return;
        }
        this.owner.moveSpeedProperty.addModifier(this.m_moveSpeedModifier);
        this.owner.attackDelayProperty.addModifier(this.m_attackSpeedModifier);
        this.updateGlow();
    }

    protected override onUnregister(): void {
        if (!this.owner || !this.owner.moveSpeedProperty || !this.owner.attackDelayProperty) {
            return;
        }
        this.owner.moveSpeedProperty.removeModifier(this.m_moveSpeedModifier);
        this.owner.attackDelayProperty.removeModifier(this.m_attackSpeedModifier);
        if (this.m_filter) {
            this.owner.removeFilter(this.m_filter);
            this.m_filter = null;
        }
    }

    public override tick(ticks: int = 1): void {
        if (!this.owner) {
            return;
        }
        if (getTimer() - this.m_start >= this.m_totalMs) {
            this.owner.removeComponent(this);
            return;
        }
        this.updateGlow();
    }

    private updateGlow(): void {
        let armor: int = this.armorPercent;
        let band: int = armor >= 100 ? 0 : (armor >= 45 ? 1 : 2);
        if (band == this.m_band) {
            return;
        }
        this.m_band = band;
        if (this.m_filter) {
            this.owner.removeFilter(this.m_filter);
        }
        this.m_filter = new GlowFilter(band == 0 ? IoSulfurShield.RED : (band == 1 ? IoSulfurShield.ORANGE : IoSulfurShield.YELLOW), 0.8, 8, 8, 4, 3);
        this.owner.addFilter(this.m_filter);
    }
}
