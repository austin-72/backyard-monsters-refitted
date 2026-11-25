import * as as3 from "as3";
import { int } from "as3";
import { ArmorPropertyModifier, Component, MultiplicationPropertyModifier } from "@game";

/**
 * Inferno-only (11 November): what a synergy gives a monster while its partner fights beside it (IoSynergy): more
 * damage or some armour, never both. A monster has at most one. IoSynergy sets it every half second; this only
 * holds the modifier. Nothing is drawn on the monster: the teal glow it first had was taken out the same day (the
 * user's, 11 November).
 *
 * The modifier is taken off and a new one put on whenever the amount changes: CModifiableProperty keeps its last
 * value until a modifier is added or removed, so changing a modifier's number in place does nothing.
 */
export class IoSynergyBoost extends Component {
    static {
        as3.fields(this, { m_kind: null, m_amount: 0, m_pair: null, m_modifier: null, left: 0 });
    }

    public static readonly NAME: string = "ioSynergy";
    public static readonly DAMAGE: string = "damage";
    public static readonly ARMOR: string = "armor";

    private m_kind: string;
    private m_amount: number;
    private m_pair: string;
    private m_modifier: any;
    /** Game steps it is kept for after its partner was last close enough (IoSynergy counts it down). */
    public left: int;

    public $ctor(): void {
        this.m_amount = 0;
        super.$ctor();
    }

    /** "damage" or "armor" (null when nothing is on). */
    public get kind(): string {
        return this.m_amount > 0 ? this.m_kind : null;
    }

    /** 0.12 for +12% damage or 12% armour. */
    public get amount(): number {
        return this.m_amount;
    }

    /** The pairing's id (the server's config). */
    public get pair(): string {
        return this.m_pair;
    }

    /** Puts `amount` of `kind` on the monster (0 takes it off). */
    public set(kind: string, amount: number, pair: string): void {
        amount = Math.max(0, Number(amount) || 0);
        this.m_pair = pair;
        if (kind == this.m_kind && amount == this.m_amount) {
            return;
        }
        this.clear();
        this.m_kind = kind;
        this.m_amount = amount;
        if (!this.owner || amount <= 0) {
            return;
        }
        if (kind == IoSynergyBoost.ARMOR) {
            if (this.owner.armorProperty) {
                this.m_modifier = new ArmorPropertyModifier(Math.min(0.95, amount));
                this.owner.armorProperty.addModifier(this.m_modifier);
            }
        } else if (this.owner.damageProperty) {
            this.m_modifier = new MultiplicationPropertyModifier(1 + amount);
            this.owner.damageProperty.addModifier(this.m_modifier);
        }
    }

    private clear(): void {
        if (this.owner && this.m_modifier) {
            if (this.m_kind == IoSynergyBoost.ARMOR) {
                if (this.owner.armorProperty) {
                    this.owner.armorProperty.removeModifier(this.m_modifier);
                }
            } else if (this.owner.damageProperty) {
                this.owner.damageProperty.removeModifier(this.m_modifier);
            }
        }
        this.m_modifier = null;
        this.m_amount = 0;
    }

    protected override onUnregister(): void {
        this.clear();
    }
}
