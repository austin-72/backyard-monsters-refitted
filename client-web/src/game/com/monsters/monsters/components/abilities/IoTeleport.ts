import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { Component, GLOBAL, MonsterBase } from "@game";

/**
 * Inferno-only (21 November, the user's): Rezghul teleports, up to 5 blocks (100 of the yard's units: a wall block is
 * 20) along his way, once every 15 seconds, "like Bolt's blink": he fades (a third seen) and can't be targeted while he
 * slides there over a few steps, then is back. Along his own path, so never through a wall his way stops at. Only
 * attacking, walking to a target still further away than a hop; the first one as soon as he walks, then 15 seconds
 * after each. Never in Hellgate Defense.
 */
export class IoTeleport extends Component {
    static {
        as3.fields(this, { m_wait: 0, m_hop: null, m_step: 0 });
    }

    /** The game runs 80 steps a second. */
    public static readonly COOLDOWN_TICKS: int = 15 * 80;

    /** Up to 5 blocks. */
    public static readonly DISTANCE: number = 100;

    /** The slide's steps (Bolt's blink: 10). */
    public static readonly STEPS: int = 10;

    public static readonly NAME: string = "ioTeleport";

    private m_wait: int;
    /** The positions of the slide, one a step (the last is where he lands); null when not sliding. */
    private m_hop: any[];
    private m_step: int;

    public $ctor(): void {
        super.$ctor();
    }

    public get sliding(): boolean {
        return !!this.m_hop;
    }

    /** Steps until the next one may go (0: ready). */
    public get wait(): int {
        return this.m_wait;
    }

    /** The yard's units between two of the screen's points (PATHING.FromISO, unrounded). */
    private static cart(a: Point, b: Point): number {
        let dx: number = (b.x - a.x) * 0.5 + (b.y - a.y);
        let dy: number = (b.y - a.y) - (b.x - a.x) * 0.5;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public override tick(param1: int = 1): void {
        let m: MonsterBase = this.owner;
        if (!m) {
            return;
        }
        if (this.m_hop) {
            this.slide(m, param1);
            return;
        }
        if (this.m_wait > 0) {
            this.m_wait = Math.max(0, this.m_wait - param1) | 0;
            return;
        }
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.ioTdMode() || m.health <= 0 || (m as any)._dying || m.dead || m._behaviour != MonsterBase.k_sBHVR_ATTACK || m._atTarget || m._attacking || !m._hasPath || !m._waypoints || m._waypoints.length == 0 || !m._tmpPoint) {
            return;
        }
        let hop: any[] = IoTeleport.along(m._tmpPoint, m._waypoints, IoTeleport.DISTANCE);
        if (!hop) {
            return;
        }
        this.m_hop = hop;
        this.m_step = 0;
        this.m_wait = IoTeleport.COOLDOWN_TICKS;
        m.graphic.alpha = 0.3;
        ++m.targetableStatus;
    }

    /**
     * The slide's positions along a way (the screen's points) from `from`, `distance` of the yard's units in all, in
     * STEPS equal steps; null when the way left is no longer than that (he's nearly there: no hop).
     */
    public static along(from: Point, waypoints: any[], distance: number): any[] {
        let total: number = 0;
        let a: Point = from;
        for (let w of waypoints) {
            total += IoTeleport.cart(a, w as Point);
            a = w as Point;
            if (total > distance) {
                break;
            }
        }
        if (total <= distance) {
            return null;
        }
        let out: any[] = [];
        for (let k: int = 1; k <= IoTeleport.STEPS; k++) {
            out.push(IoTeleport.pointAt(from, waypoints, distance * k / IoTeleport.STEPS));
        }
        return out;
    }

    /** The point `d` of the yard's units along the way, and how many of its waypoints that passes ([point, passed]). */
    private static pointAt(from: Point, waypoints: any[], d: number): any[] {
        let a: Point = from;
        let gone: number = 0;
        for (let i: int = 0; i < waypoints.length; i++) {
            let b: Point = waypoints[i] as Point;
            let l: number = IoTeleport.cart(a, b);
            if (gone + l >= d && l > 0) {
                let t: number = (d - gone) / l;
                return [new Point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t), i];
            }
            gone += l;
            a = b;
        }
        return [new Point(a.x, a.y), waypoints.length];
    }

    private slide(m: MonsterBase, ticks: int): void {
        if (m.health <= 0 || (m as any)._dying || m.dead) {
            this.stop(m);
            return;
        }
        this.m_step = Math.min(this.m_hop.length, this.m_step + Math.max(1, ticks)) | 0;
        let at: any[] = this.m_hop[this.m_step - 1];
        m._tmpPoint = (at[0] as Point).clone();
        if (this.m_step >= this.m_hop.length) {
            // landed: the waypoints passed are gone, the next one is where he walks to
            let passed: int = at[1] | 0;
            if (passed > 0 && m._waypoints) {
                m._waypoints.splice(0, Math.min(passed, m._waypoints.length));
            }
            if (m._waypoints && m._waypoints.length > 0) {
                m._targetPosition = m._waypoints[0] as Point;
            }
            this.stop(m);
        }
    }

    private stop(m: MonsterBase): void {
        if (!this.m_hop) {
            return;
        }
        this.m_hop = null;
        this.m_step = 0;
        m.graphic.alpha = 1;
        --m.targetableStatus;
    }

    public override unregister(): void {
        if (this.m_hop && this.owner) {
            this.stop(this.owner);
        }
        super.unregister();
    }
}
