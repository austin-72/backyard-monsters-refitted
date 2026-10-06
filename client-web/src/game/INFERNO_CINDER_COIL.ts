import * as as3 from "as3";
import { int, uint } from "as3";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BTOWER, CREEPS, EFFECTS, GLOBAL, IAttackable, MonsterBase, PATHING, SOUNDS, Targeting } from "@game";

/**
 * Inferno-only: the Cinder Coil (building 144, newtowers.md). It fires in a cycle (the user's, 28 September),
 * timed in the attack's own steps (80 a second):
 *   spin   0.5 s (40 steps): the coil whirls round, speeding up, while it charges (the 12-frame `anim2`
 *          overlay's frames 1-8);
 *   aim    0.25 s (20 steps): it slows smoothly out of the spin and comes to rest pointing at its target
 *          (following it if it moves), fully charged;
 *   shock  the flash (overlay frame 9): an arc of fire from the orb's prong, on the side facing the target,
 *          that hits it and leaps to the nearest monster not yet hit within `ext.jumpRadius`, up to
 *          `ext.jumps` more times, each hit 20% weaker than the one before;
 *   rest   0.25 s (20 steps): the afterglow (frames 10, 11);
 * then again at once while it has a target in range (one shot a second), else it waits for the next.
 * The 32 aim frames of `anim` are followed as a smooth angle (frames can be passed between), so the turn
 * never jumps.
 */
export class INFERNO_CINDER_COIL extends BTOWER {
    static {
        as3.fields(this, { _spinScale: 1, _phase: 0, _stageTicks: 0, _angle: 0, _speed0: 0, _aimFrom: 0, _aimTurn: 0, _aimGoal: 0, _lockedTarget: null, _chainFlags: 0, shots: 0 });
    }

    public static ID: int; // const

    public static SPIN_STEPS: int; // const

    public static AIM_STEPS: int; // const

    public static REST_STEPS: int; // const

    /**
     * The spin's speed in aim frames a step (32 a turn): from slow to fast as it charges (nominal; each
     * cycle scales it, see startSpin). The aim then slows it evenly to a stop.
     */
    private static SPIN_FROM: number; // const

    private static SPIN_TO: number; // const

    /** How far the nominal spin and aim turn it (aim frames), worked out once. */
    private static s_nominal: number;

    private static FRAMES: int; // const

    private static FLASH_FRAME: int; // const

    private static JUMP_FALLOFF: number; // const

    private static ARC_COLOUR: uint; // const

    /** The prong on the orb: how far (grid) from the orb's middle the arc starts, toward the aim. */
    private static PRONG: number; // const

    public static IDLE: int; // const

    public static SPIN: int; // const

    public static AIM: int; // const

    public static REST: int; // const

    static {
        as3.lazyStatics(this, { ID: 0, SPIN_STEPS: 0, AIM_STEPS: 0, REST_STEPS: 0, SPIN_FROM: NaN, SPIN_TO: NaN, s_nominal: NaN, FRAMES: 0, FLASH_FRAME: 0, JUMP_FALLOFF: NaN, ARC_COLOUR: 0, PRONG: NaN, IDLE: 0, SPIN: 0, AIM: 0, REST: 0 }, () => {
            INFERNO_CINDER_COIL.ID = 144;
            INFERNO_CINDER_COIL.SPIN_STEPS = 40;
            INFERNO_CINDER_COIL.AIM_STEPS = 20;
            INFERNO_CINDER_COIL.REST_STEPS = 20;
            INFERNO_CINDER_COIL.SPIN_FROM = 0.35;
            INFERNO_CINDER_COIL.SPIN_TO = 1.25;
            INFERNO_CINDER_COIL.s_nominal = NaN;
            INFERNO_CINDER_COIL.FRAMES = 32;
            INFERNO_CINDER_COIL.FLASH_FRAME = 9;
            INFERNO_CINDER_COIL.JUMP_FALLOFF = 0.8;
            INFERNO_CINDER_COIL.ARC_COLOUR = 16747056;
            INFERNO_CINDER_COIL.PRONG = 12;
            INFERNO_CINDER_COIL.IDLE = 0;
            INFERNO_CINDER_COIL.SPIN = 1;
            INFERNO_CINDER_COIL.AIM = 2;
            INFERNO_CINDER_COIL.REST = 3;
        });
    }
    private _spinScale: number;
    private _phase: int;
    private _stageTicks: int;
    /** The coil's heading as a smooth angle in aim frames [0, 32). */
    private _angle: number;
    private _speed0: number;
    private _aimFrom: number;
    private _aimTurn: number;
    private _aimGoal: number;
    private _lockedTarget: IAttackable;
    private _chainFlags: int;
    /** Shots made (for tests and the attack log). */
    public shots: int;

    public $ctor(): void {
        this._phase = INFERNO_CINDER_COIL.IDLE;
        super.$ctor();
        this._type = INFERNO_CINDER_COIL.ID;
        this._frameNumber = 0;
        this._top = -35;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._animRandomStart = false;
        this._chainFlags = Targeting.getOldStyleTargets(1);
        this.SetProps();
    }

    public get phase(): int {
        return this._phase;
    }

    public get angle(): number {
        return this._angle;
    }

    /** True from the spin to the end of the rest. */
    public get charging(): boolean {
        return this._phase != INFERNO_CINDER_COIL.IDLE;
    }

    /** The stats row's extra numbers for this level (jumps, jumpRadius). */
    private ext(): any {
        let lvl: int = Math.max(1, Math.min(this._lvl.Get(), Number(this._buildingProps.stats.length))) | 0;
        return this._buildingProps.stats[lvl - 1].ext || {};
    }

    public override TickAttack(): void {
        if (this._phase != INFERNO_CINDER_COIL.IDLE) {
            this.stepCycle();
        }
        super.TickAttack();
        if (this._phase == INFERNO_CINDER_COIL.IDLE) {
            this.Rotate();
            this._angle = this._animTick;
        }
    }

    /** Neither strip moves on its own: the aim comes from the cycle (or Rotate), the overlay from the charge. */
    public override AnimFrame(param1: boolean = true): void {
        super.AnimFrame(false);
    }

    public override Fire(param1: IAttackable): void {
        if (this._phase != INFERNO_CINDER_COIL.IDLE || this.health <= 0) {
            return;
        }
        super.Fire(param1);
        if (this.isJard) {
            // under a Candy Jar it shoots the glass, as the other towers do
            this.hitJar();
            return;
        }
        this.startSpin(param1);
    }

    /** The nominal turn of a spin and aim (the aim slowing evenly from the spin's last speed to nothing). */
    private static nominalTurn(): number {
        if (isNaN(INFERNO_CINDER_COIL.s_nominal)) {
            let sum: number = 0;
            let t: number = 0;
            for (let i: int = 1; i <= INFERNO_CINDER_COIL.SPIN_STEPS; i++) {
                t = i / INFERNO_CINDER_COIL.SPIN_STEPS;
                sum += INFERNO_CINDER_COIL.SPIN_FROM + (INFERNO_CINDER_COIL.SPIN_TO - INFERNO_CINDER_COIL.SPIN_FROM) * t * t;
            }
            INFERNO_CINDER_COIL.s_nominal = sum + INFERNO_CINDER_COIL.SPIN_TO * INFERNO_CINDER_COIL.AIM_STEPS / 2;
        }
        return INFERNO_CINDER_COIL.s_nominal;
    }

    private startSpin(param1: IAttackable): void {
        this._lockedTarget = param1;
        this._phase = INFERNO_CINDER_COIL.SPIN;
        this._stageTicks = 0;
        this._angle = this._animTick;
        // The whole move (spin, then the aim slowing to a stop) is sized so it ends on the target: the
        // turn needed plus whole turns, near the nominal; the spin's speed is scaled to it, so the aim is
        // always an even slow-down, never a speed-up or a turn back.
        let target: MonsterBase = as3.as(param1, MonsterBase);
        let turn: number = Number(target ? INFERNO_CINDER_COIL.wrap(this.frameTo(new Point(target.x, target.y)) - this._angle) : 0);
        let nominal: number = INFERNO_CINDER_COIL.nominalTurn();
        // (from a little under the nominal to 3/4 of a turn over it: always most of a turn or more)
        while (turn < nominal - INFERNO_CINDER_COIL.FRAMES / 4) {
            turn += INFERNO_CINDER_COIL.FRAMES;
        }
        this._spinScale = Number(target ? turn / nominal : 1);
        this._anim2Tick = 1;
        SOUNDS.Play("lightningstart", 0.8);
        this.draw();
    }

    /** The grid angle to a point, in aim frames (as BTOWER.Rotate measures it). */
    private frameTo(param1: Point): number {
        let it: Point = PATHING.FromISO(param1);
        let me: Point = PATHING.FromISO(new Point(this._mc.x, this._mc.y)).add(new Point(35, 35));
        let deg: number = Math.atan2(it.y - me.y, it.x - me.x) * 57.2957795;
        if (deg < 0) {
            deg += 360;
        }
        return deg / 11.25;
    }

    /** The target to point at now: the locked one while it is alive and in range, else the closest. */
    private aimTarget(): MonsterBase {
        let first: MonsterBase = as3.as(this._lockedTarget, MonsterBase);
        if (first && first.health > 0 && first.isTargetable && !first.invisible && this.inRange(first)) {
            return first;
        }
        let inRange: any[] = Targeting.getCreepsInRange(this._range, this.centre(), Targeting.getOldStyleTargets(1));
        as3.sortOn(inRange, ["dist"], Array.NUMERIC);
        for (let c of as3.values(inRange)) {
            if (!as3.cast(c.creep, MonsterBase).invisible && as3.cast(c.creep, MonsterBase).health > 0) {
                this._lockedTarget = as3.cast(c.creep, IAttackable);
                return as3.cast(c.creep, MonsterBase);
            }
        }
        return null;
    }

    private inRange(param1: MonsterBase): boolean {
        let inRange: any[] = Targeting.getCreepsInRange(this._range, this.centre(), Targeting.getOldStyleTargets(1));
        for (let c of as3.values(inRange)) {
            if (c.creep == param1) {
                return true;
            }
        }
        return false;
    }

    private static wrap(param1: number): number {
        let a: number = param1 % INFERNO_CINDER_COIL.FRAMES;
        return a < 0 ? a + INFERNO_CINDER_COIL.FRAMES : a;
    }

    private stepCycle(): void {
        if (this.health <= 0) {
            this.endCycle();
            return;
        }
        ++this._stageTicks;
        let t: number = 0;
        let target: MonsterBase = null;
        switch (this._phase) {
            case INFERNO_CINDER_COIL.SPIN:
                // speeding up as it charges; the overlay's frames 1-8 over the spin
                t = this._stageTicks / INFERNO_CINDER_COIL.SPIN_STEPS;
                this._speed0 = this._spinScale * (INFERNO_CINDER_COIL.SPIN_FROM + (INFERNO_CINDER_COIL.SPIN_TO - INFERNO_CINDER_COIL.SPIN_FROM) * t * t);
                this._angle = INFERNO_CINDER_COIL.wrap(this._angle + this._speed0);
                this._anim2Tick = Math.min(8, 1 + ((this._stageTicks * 8 / INFERNO_CINDER_COIL.SPIN_STEPS) | 0)) | 0;
                if (this._stageTicks >= INFERNO_CINDER_COIL.SPIN_STEPS) {
                    this.startAim();
                }
                break;
            case INFERNO_CINDER_COIL.AIM:
                // out of the spin into the target's heading: a smooth curve (Hermite) that starts at the
                // spin's speed and stops on the heading, turning the same way as the spin, never back
                target = this.aimTarget();
                if (target) {
                    let goal: number = this.frameTo(new Point(target.x, target.y));
                    let shift: number = INFERNO_CINDER_COIL.wrap(goal - this._aimGoal + INFERNO_CINDER_COIL.FRAMES / 2) - INFERNO_CINDER_COIL.FRAMES / 2;
                    this._aimTurn += shift;
                    this._aimGoal = goal;
                }
                t = Math.min(1, this._stageTicks / INFERNO_CINDER_COIL.AIM_STEPS);
                let h10: number = t * t * t - 2 * t * t + t;
                let h01: number = -2 * t * t * t + 3 * t * t;
                this._angle = INFERNO_CINDER_COIL.wrap(this._aimFrom + h10 * INFERNO_CINDER_COIL.AIM_STEPS * this._speed0 + h01 * this._aimTurn);
                this._anim2Tick = 8;
                if (this._stageTicks >= INFERNO_CINDER_COIL.AIM_STEPS) {
                    this._anim2Tick = INFERNO_CINDER_COIL.FLASH_FRAME;
                    this.discharge();
                    this._phase = INFERNO_CINDER_COIL.REST;
                    this._stageTicks = 0;
                }
                break;
            case INFERNO_CINDER_COIL.REST:
                this._anim2Tick = this._stageTicks <= INFERNO_CINDER_COIL.REST_STEPS / 2 ? 10 : 11;
                if (this._stageTicks >= INFERNO_CINDER_COIL.REST_STEPS) {
                    target = this.aimTarget();
                    if (target && !this.isJard && CREEPS._creepCount > 0) {
                        this.startSpin(target);
                        return;
                    }
                    this.endCycle();
                    return;
                }
                break;
        }
        this.draw();
    }

    private startAim(): void {
        this._phase = INFERNO_CINDER_COIL.AIM;
        this._stageTicks = 0;
        this._aimFrom = this._angle;
        let target: MonsterBase = this.aimTarget();
        this._aimGoal = target ? this.frameTo(new Point(target.x, target.y)) : this._angle;
        // the turn still to make, forward (the spin's way): about half the spin's last speed times the aim's
        // steps (an even slow-down; the spin was sized for it), and never so short that it would turn back
        let turn: number = INFERNO_CINDER_COIL.wrap(this._aimGoal - this._aimFrom);
        let ideal: number = INFERNO_CINDER_COIL.AIM_STEPS * this._speed0 / 2;
        while (turn + INFERNO_CINDER_COIL.FRAMES / 2 < ideal) {
            turn += INFERNO_CINDER_COIL.FRAMES;
        }
        if (turn < INFERNO_CINDER_COIL.AIM_STEPS * this._speed0 / 3) {
            turn += INFERNO_CINDER_COIL.FRAMES;
        }
        this._aimTurn = turn;
    }

    private draw(): void {
        this._animTick = ((Math.round(this._angle) | 0) % INFERNO_CINDER_COIL.FRAMES) | 0;
        if (GLOBAL._render) {
            this.AnimFrame(false);
        }
    }

    private endCycle(): void {
        this._phase = INFERNO_CINDER_COIL.IDLE;
        this._stageTicks = 0;
        this._lockedTarget = null;
        this._anim2Tick = 0;
        this.draw();
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        // the attack ended (every monster gone) in the middle of a charge: back to the idle overlay
        if (this._phase != INFERNO_CINDER_COIL.IDLE && CREEPS._creepCount <= 0) {
            this.endCycle();
        }
    }

    private multiplier(): number {
        let overdrive: number = Number(Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp() ? 1.25 : 1);
        return (0.5 + 0.5 / this.maxHealth * this.health) * overdrive;
    }

    private hitJar(): void {
        let dmg: number = this.damage * this.multiplier();
        this._jarHealth.Add(-(dmg | 0));
        ATTACK.Damage(this._mc.x, this._mc.y + this._top, dmg | 0);
        EFFECTS.Lightning(this._mc.x | 0, (this._mc.y + this._top) | 0, this._mc.x | 0, (this._mc.y + this._top - 20) | 0, null, INFERNO_CINDER_COIL.ARC_COLOUR);
        SOUNDS.Play("lightningfire", 0.4);
        if (this._jarHealth.Get() <= 0) {
            this.KillJar();
        }
    }

    private centre(): Point {
        return this._position.add(new Point(0, this._footprint[0].height / 2));
    }

    /** Where the arc leaves the coil: the orb's prong, on the side it points to. */
    public prong(): Point {
        let a: number = this._animTick * 11.25 * Math.PI / 180;
        let gx: number = Math.cos(a) * INFERNO_CINDER_COIL.PRONG;
        let gy: number = Math.sin(a) * INFERNO_CINDER_COIL.PRONG;
        return new Point(this._mc.x + gx - gy, this._mc.y + this._top + (gx + gy) / 2);
    }

    /** The flash: the target it has turned to if it is still there, else the closest monster in range. */
    private discharge(): void {
        if (this._position == null) {
            return;
        }
        let first: MonsterBase = this.aimTarget();
        if (!first) {
            SOUNDS.Play("lightningend", 0.8);
            return;
        }
        ++this.shots;
        SOUNDS.Play("lightningfire", 0.8);
        let dmg: number = this.damage * this.multiplier();
        let jumps: int = this.ext().jumps | 0;
        let radius: number = Number(Number(this.ext().jumpRadius) || 70);
        let hit: any[] = [];
        let cur: MonsterBase = first;
        let from: Point = this.prong();
        let alt: number = 0;
        let dealt: number = 0;
        while (cur && hit.length <= jumps) {
            alt = cur._movement == "fly" ? cur._altitude : 0;
            EFFECTS.Lightning(from.x | 0, from.y | 0, cur.x | 0, (cur.y - alt) | 0, null, INFERNO_CINDER_COIL.ARC_COLOUR);
            dealt = (dmg * cur._damageMult) | 0;
            cur.modifyHealth(-dealt);
            ATTACK.Damage(cur.x, cur.y - alt, dealt | 0);
            hit.push(cur);
            from = new Point(cur.x, cur.y - alt);
            dmg *= INFERNO_CINDER_COIL.JUMP_FALLOFF;
            cur = this.nextInChain(cur, radius, hit);
        }
    }

    private nextInChain(from: MonsterBase, radius: number, hit: any[]): MonsterBase {
        let near: any[] = Targeting.getCreepsInRange(radius, new Point(from.x, from.y), this._chainFlags);
        as3.sortOn(near, ["dist"], Array.NUMERIC);
        let m: MonsterBase = null;
        for (let c of as3.values(near)) {
            m = as3.as(c.creep, MonsterBase);
            if (m && m.health > 0 && m.isTargetable && !m.invisible && hit.indexOf(m) == -1) {
                return m;
            }
        }
        return null;
    }

    public override Description(): void {
        super.Description();
        let lvl: int = this._lvl.Get() | 0;
        if (lvl > 0 && lvl < this._buildingProps.stats.length) {
            let now: int = this._buildingProps.stats[lvl - 1].ext.jumps | 0;
            let next: int = this._buildingProps.stats[lvl].ext.jumps | 0;
            if (next > now) {
                this._upgradeDescription += "Arcs leap to " + next + " more monsters (from " + now + ")<br>";
            }
        }
    }

    public override Setup(param1: any): void {
        param1.t = this._type;
        super.Setup(param1);
        this._animRandomStart = false;
        this.Props();
    }
}
