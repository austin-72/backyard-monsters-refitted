import * as as3 from "as3";
import { int, uint } from "as3";
import { GlowFilter } from "flash/filters";
import { Component, MonsterBase, MultiplicationPropertyModifier } from "@game";

/**
 * Inferno-only: the speed an Ashkarr's war-cry gives a monster of her side (WarCry). Movement speed only: no
 * armour or attack speed. While it lasts the monster glows pink (GLOW). A monster has at most one, however
 * many Ashkarrs roar at it: each Ashkarr's roar is remembered for its own time, and the boost is the
 * strongest of those still running, never their sum. When the strongest runs out, a weaker one still
 * running takes over; when none is left the boost goes.
 * It is a modifier of its own, so it multiplies with a rage bomb's Enrage rather than replacing it.
 */
export class WarCryBoost extends Component {
    static {
        as3.fields(this, { m_roars: null, m_modifier: null, m_glow: null });
    }

    /** Pink, the rage bomb's colour (Enrage), a little softer. */
    public static readonly GLOW_COLOR: uint = 16724991;
    /** One entry per Ashkarr: {source, mult, left (game steps)}. */
    private m_roars: any[];
    private m_modifier: MultiplicationPropertyModifier;
    private m_glow: GlowFilter;

    public $ctor(source?: MonsterBase, multiplier?: number, ticks?: int): void {
        this.m_roars = [];
        this.m_glow = new GlowFilter(WarCryBoost.GLOW_COLOR, 0.55, 8, 8, 3, 2);
        super.$ctor();
        this.m_roars.push({ "source": source, "mult": multiplier, "left": ticks });
    }

    /** The multiplier in force now (1 when none). */
    public get multiplier(): number {
        return Number(this.m_modifier ? this.m_modifier.multiple : 1);
    }

    /** How many Ashkarrs' roars are running on this monster (not what it gets: that is the strongest). */
    public get roars(): int {
        return this.m_roars.length;
    }

    /** Another roar reaches the monster: that Ashkarr's boost starts again. */
    public renew(source: MonsterBase, multiplier: number, ticks: int): void {
        let roar: any = null;
        for (roar of as3.values(this.m_roars)) {
            if (roar.source == source) {
                roar.mult = multiplier;
                roar.left = ticks;
                this.apply();
                return;
            }
        }
        this.m_roars.push({ "source": source, "mult": multiplier, "left": ticks });
        this.apply();
    }

    /** Puts the strongest running boost on the monster's speed (and only that one). */
    private apply(): void {
        let best: number = 1;
        let roar: any = null;
        for (roar of as3.values(this.m_roars)) {
            best = Math.max(best, Number(roar.mult));
        }
        if (!this.owner || !this.owner.moveSpeedProperty) {
            return;
        }
        if (this.m_modifier && this.m_modifier.multiple == best) {
            return;
        }
        if (this.m_modifier) {
            this.owner.moveSpeedProperty.removeModifier(this.m_modifier);
            this.m_modifier = null;
        }
        if (best > 1) {
            this.m_modifier = new MultiplicationPropertyModifier(best);
            this.owner.moveSpeedProperty.addModifier(this.m_modifier);
        }
    }

    public get glow(): GlowFilter {
        return this.m_glow;
    }

    protected override onRegister(): void {
        this.apply();
        if (this.owner) {
            this.owner.addFilter(this.m_glow);
        }
    }

    protected override onUnregister(): void {
        if (this.owner && this.owner.moveSpeedProperty && this.m_modifier) {
            this.owner.moveSpeedProperty.removeModifier(this.m_modifier);
        }
        if (this.owner) {
            this.owner.removeFilter(this.m_glow);
        }
        this.m_modifier = null;
    }

    public override tick(param1: int = 1): void {
        let i: int = (this.m_roars.length - 1) | 0;
        while (i >= 0) {
            this.m_roars[i].left -= param1;
            if (this.m_roars[i].left <= 0) {
                this.m_roars.splice(i, 1);
            }
            i--;
        }
        if (this.m_roars.length == 0) {
            if (this.owner) {
                this.owner.removeComponent(this);
            }
            return;
        }
        this.apply();
    }
}
