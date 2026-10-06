import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Shape } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BTOWER, GLOBAL, IAttackable, MAP, MonsterBase, PATHING, SOUNDS, Targeting, TweenLite } from "@game";

/**
 * Inferno-only: the Obsidian Mortar (building 145, newtowers.md). Lobs a slow shell high over walls at
 * where its target stands when it fires (it does not follow it); the flight is a real lob (ObsidianShell:
 * about 0.6 to 1 second, a little longer the further it goes, slower at the lower levels, trailing embers);
 * where it lands it shatters,
 * hitting every surface monster within `splash` for full damage at the middle down to half at the
 * edge. It cannot fire at anything closer than `ext.minRange`. Shells fly on the attack's own ticks
 * (they still land if the tower falls while they are in the air).
 */
export class INFERNO_OBSIDIAN_MORTAR extends BTOWER {
    static {
        as3.fields(this, { _shells: null, _splashFlags: 0 });
    }

    public static readonly ID: int = 145;

    /** The muzzle: this far above the footprint's middle, and this far (grid) toward the aim. */
    private static readonly MUZZLE_UP: int = 38;

    private static readonly MUZZLE_OUT: int = 14;
    private _shells: any[];
    private _splashFlags: int;

    public $ctor(): void {
        this._shells = [];
        super.$ctor();
        this._type = INFERNO_OBSIDIAN_MORTAR.ID;
        this._frameNumber = 0;
        this._top = (35 - INFERNO_OBSIDIAN_MORTAR.MUZZLE_UP) | 0;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._splashFlags = Targeting.getOldStyleTargets(1);
        this.SetProps();
    }

    private minRange(): number {
        let lvl: int = Math.max(1, Math.min(this._lvl.Get(), Number(this._buildingProps.stats.length))) | 0;
        let ext: any = this._buildingProps.stats[lvl - 1].ext;
        return Number(ext && ext.minRange ? Number(ext.minRange) : 100);
    }

    public override TickAttack(): void {
        this.tickShells();
        super.TickAttack();
        this.Rotate();
    }

    public override AnimFrame(param1: boolean = true): void {
        super.AnimFrame(false);
    }

    /** Like every tower's, but nothing inside the dead zone: the closest monster between it and the range. */
    public override FindTargets(param1: int, param2: int): void {
        this._hasTargets = false;
        if (this._position == null || !this._footprint || this._footprint.length == 0) {
            return;
        }
        let all: any[] = Targeting.getCreepsInRange(this._range, this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(1));
        let dead: number = this.minRange();
        let ok: any[] = [];
        for (let c of as3.values(all)) {
            if (c.dist >= dead && !as3.cast(c.creep, MonsterBase).invisible) {
                ok.push(c);
            }
        }
        if (!ok.length) {
            return;
        }
        as3.sortOn(ok, ["dist"], Array.NUMERIC);
        this._targetCreeps = [];
        let i: int = 0;
        while (i < ok.length && i < param1) {
            this._targetCreeps.push({ "creep": ok[i].creep, "dist": ok[i].dist, "position": ok[i].pos });
            i++;
        }
        this._hasTargets = true;
    }

    /** The target is still worth a shell: alive, in range and outside the dead zone. */
    public override targetInRange(): boolean {
        if (!this._targetCreeps || !this._targetCreeps.length || this._position == null) {
            return false;
        }
        let m: MonsterBase = as3.cast(this._targetCreeps[0].creep, MonsterBase);
        if (!m || m.health <= 0 || !m._tmpPoint) {
            return false;
        }
        let me: Point = PATHING.FromISO(this._position.add(new Point(0, this._footprint[0].height / 2)));
        let it: Point = PATHING.FromISO(m._tmpPoint);
        if (!me || !it) {
            return false;
        }
        let d: number = Point.distance(me, it);
        return d < this._range && d >= this.minRange();
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        if (this.health <= 0) {
            return;
        }
        let overdrive: number = Number(Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp() ? 1.25 : 1);
        let dmg: number = this.damage * (0.5 + 0.5 / this.maxHealth * this.health) * overdrive;
        SOUNDS.Play("icannon", !this.isJard ? 0.8 : 0.4);
        if (this.isJard) {
            this._jarHealth.Add(-(dmg | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, dmg | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
            return;
        }
        // the muzzle, turned with the barrel (frame k aims at grid angle k x 11.25 degrees)
        let a: number = this._animTick * 11.25 * Math.PI / 180;
        let gx: number = Math.cos(a) * INFERNO_OBSIDIAN_MORTAR.MUZZLE_OUT;
        let gy: number = Math.sin(a) * INFERNO_OBSIDIAN_MORTAR.MUZZLE_OUT;
        let from: Point = new Point(this._mc.x + gx - gy, this._mc.y + this._top + (gx + gy) / 2);
        // where the target stands now (on the ground, also under a flyer)
        let to: Point = new Point(param1.x, param1.y);
        this._shells.push(new ObsidianShell(from, to, Math.max(1, this._speed), dmg | 0, this._splash));
    }

    private tickShells(): void {
        let i: int = (this._shells.length - 1) | 0;
        let s: ObsidianShell = null;
        while (i >= 0) {
            s = as3.cast(this._shells[i], ObsidianShell);
            if (s.tick()) {
                this.land(s);
                this._shells.splice(i, 1);
            }
            i--;
        }
    }

    /** The shell shatters: full damage at the middle, half at the edge of the splash. */
    private land(s: ObsidianShell): void {
        let hits: any[] = Targeting.getCreepsInRange(s.splash, s.to, this._splashFlags);
        let total: int = 0;
        let m: MonsterBase = null;
        let d: int = 0;
        for (let c of as3.values(hits)) {
            m = as3.as(c.creep, MonsterBase);
            if (!m || m.health <= 0) {
                continue;
            }
            d = (s.damage * (1 - 0.5 * Math.min(1, Number(c.dist) / Math.max(1, s.splash))) * m._damageMult) | 0;
            m.modifyHealth(-d);
            total += d;
        }
        if (total > 0) {
            ATTACK.Damage(s.to.x, s.to.y, total);
        }
        SOUNDS.Play("trap", 0.5);
        if (GLOBAL._render && !GLOBAL._catchup) {
            ObsidianShell.shatter(s.to, s.splash);
        }
    }

    public override Setup(param1: any): void {
        param1.t = this._type;
        super.Setup(param1);
        this.Props();
    }

    public override RecycleC(): void {
        this.clearShells();
        super.RecycleC();
    }

    public override Cancel(): void {
        this.clearShells();
        super.Cancel();
    }

    private clearShells(): void {
        for (let s of as3.values(this._shells)) {
            s.remove();
        }
        this._shells = [];
    }
}

/** A shell in flight: a chunk of obsidian on a high arc, its shadow sliding along the ground below. */
class ObsidianShell extends ASObject {
    static {
        as3.fields(this, { to: null, damage: 0, splash: NaN, _from: null, _ticks: 0, _t: 0, _height: NaN, _rock: null, _shadow: null });
    }

    public to: Point;
    public damage: int;
    public splash: number;
    private _from: Point;
    public _ticks: int;
    private _t: int;
    private _height: number;
    private _rock: Shape;
    private _shadow: Shape;

    public $ctor(param1?: Point, param2?: Point, param3?: number, param4?: int, param5?: number): void {
        super.$ctor();
        this._from = param1;
        this.to = param2;
        this.damage = param4;
        this.splash = param5;
        let dist: number = Point.distance(param1, param2);
        // A lob, not a dart (the user's, 28 September): it used to fly distance / speed steps (0.3 to 0.6 s up
        // an arc of up to 200), which looked like a thrown stone. Now about 0.6 s close in to 1 s at full
        // range, over an arc 40 + 30% of the distance high; across the ground it moves evenly and up and down
        // it rises and falls as a thrown thing does (a parabola), turning over once on the way.
        this._ticks = ObsidianShell.flightSteps(dist, param3);
        this._height = 40 + dist * 0.3;
        if (!GLOBAL._catchup && MAP._PROJECTILES) {
            this._shadow = new Shape();
            this._shadow.graphics.beginFill(0, 0.28);
            this._shadow.graphics.drawEllipse(-6, -3, 12, 6);
            this._shadow.graphics.endFill();
            this._rock = new Shape();
            // a jagged black-violet chunk with a glint and a lava-orange edge
            this._rock.graphics.lineStyle(1, 16742944, 0.9);
            this._rock.graphics.beginFill(1708068, 1);
            this._rock.graphics.moveTo(-6, -2);
            this._rock.graphics.lineTo(-2, -7);
            this._rock.graphics.lineTo(5, -5);
            this._rock.graphics.lineTo(7, 1);
            this._rock.graphics.lineTo(2, 6);
            this._rock.graphics.lineTo(-5, 4);
            this._rock.graphics.lineTo(-6, -2);
            this._rock.graphics.endFill();
            this._rock.graphics.lineStyle();
            this._rock.graphics.beginFill(9067720, 0.9);
            this._rock.graphics.moveTo(-2, -5);
            this._rock.graphics.lineTo(3, -4);
            this._rock.graphics.lineTo(0, -1);
            this._rock.graphics.endFill();
            MAP._PROJECTILES.addChild(this._shadow);
            MAP._PROJECTILES.addChild(this._rock);
            this.place(0);
        }
    }

    /** Game steps of flight for this distance (80 a second) at the tower's shell speed (6 to 8). */
    public static flightSteps(param1: number, param2: number): int {
        return Math.max(40, Math.round((40 + param1 * 0.1) * 7 / Math.max(1, param2))) | 0;
    }

    /** One attack tick; true when it lands. */
    public tick(): boolean {
        ++this._t;
        if (this._t >= this._ticks) {
            this.remove();
            return true;
        }
        // placed on every step, drawn or not (skipping steps made it jump)
        this.place(this._t / this._ticks);
        if (GLOBAL._render && !GLOBAL._catchup && this._t % 4 == 0) {
            this.ember();
        }
        return false;
    }

    /** A fading ember left behind in the air, so the flight reads as one smooth line. */
    private ember(): void {
        if (!this._rock || !MAP._PROJECTILES) {
            return;
        }
        let e: Shape = new Shape();
        e.graphics.beginFill(16742944, 0.8);
        e.graphics.drawCircle(0, 0, 2);
        e.graphics.endFill();
        e.x = this._rock.x;
        e.y = this._rock.y;
        MAP._PROJECTILES.addChildAt(e, Math.max(0, MAP._PROJECTILES.getChildIndex(this._rock)) | 0);
        TweenLite.to(e, 0.35, { "alpha": 0, "scaleX": 0.3, "scaleY": 0.3, "y": e.y + 4, "onComplete": ObsidianShell.drop, "onCompleteParams": [e] });
    }

    private place(param1: number): void {
        if (!this._rock) {
            return;
        }
        let gx: number = this._from.x + (this.to.x - this._from.x) * param1;
        let gy: number = this._from.y + (this.to.y - this._from.y) * param1;
        let up: number = 4 * param1 * (1 - param1);
        // the shadow slides from the tower's foot (38 below the muzzle) to where the shell lands, smaller
        // and fainter the higher the shell is
        this._shadow.x = gx;
        this._shadow.y = this._from.y + 38 + (this.to.y - this._from.y - 38) * param1;
        this._shadow.scaleX = this._shadow.scaleY = 1 - 0.45 * up;
        this._shadow.alpha = 1 - 0.5 * up;
        this._rock.x = gx;
        this._rock.y = gy - this._height * up;
        this._rock.rotation = param1 * 360;
        // a touch bigger at the top of the arc, nearer the eye
        this._rock.scaleX = this._rock.scaleY = 1 + 0.25 * up;
    }

    public remove(): void {
        if (this._rock && this._rock.parent) {
            this._rock.parent.removeChild(this._rock);
        }
        if (this._shadow && this._shadow.parent) {
            this._shadow.parent.removeChild(this._shadow);
        }
        this._rock = null;
        this._shadow = null;
    }

    /** Razor shards thrown out from where it landed, and a ring of dust the size of the splash. */
    public static shatter(param1: Point, param2: number): void {
        if (!MAP._PROJECTILES) {
            return;
        }
        let ring: Shape = new Shape();
        ring.graphics.lineStyle(2, 11898111, 0.7);
        ring.graphics.drawEllipse(-param2, -param2 / 2, param2 * 2, param2);
        ring.graphics.lineStyle(5, 16742944, 0.25);
        ring.graphics.drawEllipse(-param2 * 0.6, -param2 * 0.3, param2 * 1.2, param2 * 0.6);
        ring.x = param1.x;
        ring.y = param1.y;
        ring.scaleX = ring.scaleY = 0.3;
        MAP._PROJECTILES.addChild(ring);
        TweenLite.to(ring, 0.45, { "scaleX": 1, "scaleY": 1, "alpha": 0, "onComplete": ObsidianShell.drop, "onCompleteParams": [ring] });
        let i: int = 0;
        let shard: Shape = null;
        let a: number = NaN;
        let r: number = NaN;
        while (i < 9) {
            shard = new Shape();
            shard.graphics.beginFill((i % 3 == 0 ? 0x8A5CC8 : 0x140C1C) >>> 0, 1);
            shard.graphics.moveTo(0, -4);
            shard.graphics.lineTo(2, 2);
            shard.graphics.lineTo(-2, 2);
            shard.graphics.lineTo(0, -4);
            shard.graphics.endFill();
            shard.x = param1.x;
            shard.y = param1.y - 4;
            shard.rotation = Math.random() * 360;
            MAP._PROJECTILES.addChild(shard);
            a = i / 9 * Math.PI * 2 + Math.random() * 0.4;
            r = param2 * (0.5 + Math.random() * 0.5);
            TweenLite.to(shard, 0.5, { "x": param1.x + Math.cos(a) * r, "y": param1.y + Math.sin(a) * r * 0.5, "rotation": shard.rotation + 360, "alpha": 0, "onComplete": ObsidianShell.drop, "onCompleteParams": [shard] });
            i++;
        }
    }

    public static drop(param1: Shape): void {
        if (param1 && param1.parent) {
            param1.parent.removeChild(param1);
        }
    }
}
