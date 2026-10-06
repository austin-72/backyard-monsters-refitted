import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { Ashkarr, Component, MonsterBase, StunEffect, Targeting, WarCryBoost } from "@game";

/**
 * Inferno-only: Ashkarr's war-cry (her ASHKARR.md). While she is in battle she roars every `cooldown` game
 * steps (the first as soon as she is), and at each roar:
 *  - every monster of her side within `radius` (not herself) moves faster for `boostTicks` and glows pink
 *    (WarCryBoost: one per monster whichever Ashkarr roared, so two or more never add up; the strongest
 *    counts);
 *  - every monster of the other side within `radius` is rooted for `rootTicks` with a faint white glow
 *    (StunEffect: it can't move, and still attacks what it can reach).
 * The boost lasts longer than the wait between roars (11 seconds against 10), so a monster still in range
 * at the next roar keeps it without a break; one that left runs out. Timed in game steps (80 a second), so
 * a faster game or a replay keeps the same rhythm.
 */
export class WarCry extends Component {
    static {
        as3.fields(this, { m_herald: null, m_radius: NaN, m_cooldown: 0, m_speed: NaN, m_boostTicks: 0, m_rootTicks: 0, m_wait: 0 });
    }

    public static readonly BOOST_NAME: string = "warCryBoost";

    public static readonly ROOT_NAME: string = "warCryRoot";
    private m_herald: Ashkarr;
    private m_radius: number;
    private m_cooldown: int;
    private m_speed: number;
    private m_boostTicks: int;
    private m_rootTicks: int;
    /** Steps until she may roar again; 0 = at once. */
    private m_wait: int;

    public $ctor(herald?: Ashkarr, radius?: number, cooldownTicks?: int, speedMultiplier?: number, boostTicks?: int, rootTicks?: int): void {
        super.$ctor();
        this.m_herald = herald;
        this.m_radius = radius;
        this.m_cooldown = cooldownTicks;
        this.m_speed = speedMultiplier;
        this.m_boostTicks = boostTicks;
        this.m_rootTicks = rootTicks;
    }

    public get speedMultiplier(): number {
        return this.m_speed;
    }

    public override tick(param1: int = 1): void {
        if (this.m_wait > 0) {
            this.m_wait -= param1;
        }
        if (!this.owner || this.owner.health <= 0 || !this.owner.inBattleState || this.m_wait > 0) {
            return;
        }
        this.m_wait = this.m_cooldown;
        this.cry();
    }

    /** One roar: boosts her side, roots the other. */
    public cry(): void {
        let here: Point = new Point(this.owner.x, this.owner.y);
        let entry: any = null;
        let monster: MonsterBase = null;
        if (this.m_herald) {
            this.m_herald.roar();
        }
        let friends: int = Targeting.getFriendlyFlag(this.owner) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
        for (entry of as3.values(Targeting.getTargetsInRange(this.m_radius, here, friends))) {
            monster = as3.as(entry.creep, MonsterBase);
            if (!monster || monster == this.owner || monster.health <= 0 || !monster.moveSpeedProperty) {
                continue;
            }
            let boost: WarCryBoost = as3.as(monster.getComponentByName(WarCry.BOOST_NAME), WarCryBoost);
            if (boost) {
                boost.renew(this.owner, this.m_speed, this.m_boostTicks);
            } else {
                monster.addComponent(new WarCryBoost(this.owner, this.m_speed, this.m_boostTicks), WarCry.BOOST_NAME);
            }
        }
        let foes: int = Targeting.getEnemyFlag(this.owner) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
        for (entry of as3.values(Targeting.getTargetsInRange(this.m_radius, here, foes))) {
            monster = as3.as(entry.creep, MonsterBase);
            if (!monster || monster.health <= 0 || !monster.moveSpeedProperty) {
                continue;
            }
            let root: StunEffect = as3.as(monster.getComponentByName(WarCry.ROOT_NAME), StunEffect);
            if (root) {
                root.renew(this.m_rootTicks);
            } else {
                monster.addComponent(new StunEffect(this.m_rootTicks), WarCry.ROOT_NAME);
            }
        }
    }
}
