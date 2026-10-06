import * as as3 from "as3";
import { int, uint } from "as3";
import { GlowFilter } from "flash/filters";
import { Component, MultiplicationPropertyModifier } from "@game";

/**
 * Inferno-only: rooted by an Ashkarr's war-cry (WarCry). The game has no stun, so this holds the monster's
 * movement speed at almost nothing for a while; its attack speed is untouched, so it still attacks whatever
 * it can reach. While rooted it has a faint white glow (GLOW). One per monster: another roar makes it last
 * longer, never deeper.
 */
export class StunEffect extends Component {
    static {
        as3.fields(this, { m_left: 0, m_modifier: null, m_glow: null });
    }

    public static readonly HOLD: number = 0.001;

    public static readonly GLOW_COLOR: uint = 16777215;
    private m_left: int;
    private m_modifier: MultiplicationPropertyModifier;
    private m_glow: GlowFilter;

    public $ctor(ticks?: int): void {
        this.m_modifier = new MultiplicationPropertyModifier(StunEffect.HOLD);
        this.m_glow = new GlowFilter(StunEffect.GLOW_COLOR, 0.4, 6, 6, 2, 2);
        super.$ctor();
        this.m_left = ticks;
    }

    public get glow(): GlowFilter {
        return this.m_glow;
    }

    /** Game steps left. */
    public get left(): int {
        return this.m_left;
    }

    public renew(ticks: int): void {
        this.m_left = Math.max(this.m_left, ticks) | 0;
    }

    protected override onRegister(): void {
        if (this.owner && this.owner.moveSpeedProperty) {
            this.owner.moveSpeedProperty.addModifier(this.m_modifier);
        }
        if (this.owner) {
            this.owner.addFilter(this.m_glow);
        }
    }

    protected override onUnregister(): void {
        if (this.owner && this.owner.moveSpeedProperty) {
            this.owner.moveSpeedProperty.removeModifier(this.m_modifier);
        }
        if (this.owner) {
            this.owner.removeFilter(this.m_glow);
        }
    }

    public override tick(param1: int = 1): void {
        this.m_left -= param1;
        if (this.m_left <= 0 && this.owner) {
            this.owner.removeComponent(this);
        }
    }
}
