import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent, TouchEvent } from "flash/events";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ArcadeArt, ArcadeGame, ArcadeWindow, ArenaGame, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Bone Brawl (the Devil's Arcade, 7 October, the user's pick), drawn from the server's match
 * (server/src/services/arcade/bonebrawl.ts). Walk over bones to pick them up (three at most); click to throw
 * one where the mouse points. Three hits and you're out; every 30 seconds the lava closes in, and standing in it
 * burns. The last one standing wins.
 */
export class BoneBrawlGame extends ArenaGame {
    static {
        as3.fields(this, { _rocks: null, _area: null, _zone: null, _shown: null, _zt: 30, _hpMax: 3, _floor: null, _lava: null, _groundBones: null, _air: null, _edges: null, _aim: null, _bonesDown: null, _flying: null, _k: 0, _hits: null, _info: null });
    }

    private _rocks: any[];
    private _area: any[];
    private _zone: any[];
    private _shown: any[];
    private _zt: int;
    private _hpMax: int;
    private _floor: Shape;
    private _lava: Shape;
    /** The bones lying about: each its own little shape (pooled), so one picked up redraws only its spot. */
    private _groundBones: Sprite;
    private _air: Sprite;
    /** The lava over the edges of the floor as it closes in: four strips, sized (not drawn again). */
    private _edges: any[];
    private _aim: Shape;
    private _bonesDown: any[];
    /** Bones in the air: id -> {snaps: [[k, x, y]], seen (the last step it was in)} */
    private _flying: any;
    private _k: number;
    private _hits: any;
    private _info: TextField;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._rocks = [];
        this._area = [20, 34, 700, 412];
        this._zone = [20, 34, 700, 412];
        this._shown = [20, 34, 700, 412];
        this._edges = [];
        this._bonesDown = [];
        this._flying = {};
        this._hits = {};
        super.$ctor(win, mode, ctx);
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        // phones and tablets: a finger tapping the arena while another holds the stick (only the first finger
        // is the mouse)
        if (this.touch) {
            this.addEventListener(TouchEvent.TOUCH_BEGIN, as3.bind(this, this.onTouch));
        }
    }

    protected override get actionLabel(): string {
        return "THROW";
    }

    private onTouch(e: TouchEvent): void {
        if (!e.isPrimaryTouchPoint) {
            let p: Point = this.globalToLocal(new Point(e.stageX, e.stageY));
            this.action({ "ax": Math.round(p.x), "ay": Math.round(p.y) });
        }
    }

    /**
     * The action key (Space, or THROW on a touch screen) has no aim of its own: the bone goes at the nearest
     * rival still in, where it is now (the mouse aims it on a computer).
     */
    protected override action(extra: any = null): void {
        if (extra == null) {
            let me: any = this.mine;
            let mx: number = this._own.on ? Number(this._own.x) : Number(me ? me.x : 0);
            let my: number = this._own.on ? Number(this._own.y) : Number(me ? me.y : 0);
            let best: any = null;
            let bestD: number = Number.MAX_VALUE;
            for (let i: int = 0; i < this._p.length; i++) {
                let o: any = this._p[i];
                if (i == this._you || !o || !o.alive) {
                    continue;
                }
                let d: number = (Number(o.x) - mx) * (Number(o.x) - mx) + (Number(o.y) - my) * (Number(o.y) - my);
                if (d < bestD) {
                    bestD = d;
                    best = o;
                }
            }
            extra = best ? { "ax": Math.round(Number(best.x)), "ay": Math.round(Number(best.y)) } : { "ax": Math.round(this.mouseX), "ay": Math.round(this.mouseY) };
        }
        super.action(extra);
    }

    protected override arenaStart(a: any, m: any): void {
        this._rocks = as3.as(a.rocks, Array);
        this._area = as3.as(a.area, Array);
        this._zone = this._area.concat();
        this._shown = this._area.concat();
        this._hpMax = a.hp | 0;
        // the lava all round (drawn once), the arena's floor over it (drawn again as the lava closes in)
        let back: Shape = as3.as(this._ground.addChild(new Shape()), Shape);
        let g: any = back.graphics;
        let mm: Matrix = new Matrix();
        mm.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 4, 0, 0);
        g.beginGradientFill(GradientType.LINEAR, [0xC0300A, 0xFF7A1A, 0xC8380C], [1, 1, 1], [0, 128, 255], mm);
        g.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        g.endFill();
        let k: int = 0;
        while (k < 60) {
            g.beginFill(0xFFD060, 0.3 + (k % 3) * 0.12);
            g.drawEllipse((k * 113) % ArcadeGame.GW, (k * 61) % ArcadeGame.GH, 8 + k % 13, 3 + k % 4);
            g.endFill();
            k++;
        }
        back.cacheAsBitmap = true;
        // the painted lava (the Lava Floor's, arcade/lavafloor/lava.jpg) and floor (arcade/brawl/floor.jpg), the
        // rocks and bones (arcade/arena/rock.png, arcade/brawl/bone.png): art/uikit/minigames.py, 11 October
        let lavaArt: Sprite = as3.as(this._ground.addChild(new Sprite()), Sprite);
        CasinoUI.picture(lavaArt, BoneBrawlGame.LAVA, 0, 0, ArcadeGame.GW, ArcadeGame.GH, (b: any): void => {
            back.visible = false;
        });
        for (let key of [BoneBrawlGame.FLOOR, BoneBrawlGame.ROCK, BoneBrawlGame.LAVA]) {
            ArcadeArt.whenPicture(key, (bmd: BitmapData): void => {
                if (this._floor) {
                    this.drawFloor();
                }
            });
        }
        ArcadeArt.whenPicture(BoneBrawlGame.BONE, (bmd: BitmapData): void => {
            this.poolRedraw("lying", BoneBrawlGame.drawLyingBone);
            this.poolRedraw("bone", BoneBrawlGame.drawFlyingBone);
        });
        this._floor = as3.as(this._ground.addChild(new Shape()), Shape);
        this._lava = as3.as(this._ground.addChild(new Shape()), Shape);
        this._groundBones = as3.as(this._ground.addChild(new Sprite()), Sprite);
        this._air = new Sprite();
        this.addChildAt(this._air, this.getChildIndex(this._over));
        let k2: int = 0;
        while (k2 < 4) {
            let edge: Shape = as3.as(this._ground.addChild(new Shape()), Shape);
            edge.graphics.beginFill(14700572, 0.95);
            edge.graphics.drawRect(0, 0, 100, 100);
            edge.graphics.endFill();
            edge.graphics.beginFill(16756800, 0.5);
            edge.graphics.drawRect(10, 30, 20, 4);
            edge.graphics.drawRect(60, 70, 26, 4);
            edge.graphics.endFill();
            edge.visible = false;
            this._edges.push(edge);
            k2++;
        }
        // the aim: a cross-hair drawn once, moved with the mouse
        this._aim = as3.as(this.addChild(new Shape()), Shape);
        a = this._aim.graphics;
        a.lineStyle(2, 0xFFFFFF, 0.8);
        a.drawCircle(0, 0, 9);
        a.moveTo(-14, 0);
        a.lineTo(-5, 0);
        a.moveTo(5, 0);
        a.lineTo(14, 0);
        a.moveTo(0, -14);
        a.lineTo(0, -5);
        a.moveTo(0, 5);
        a.lineTo(0, 14);
        // (one line: the second one ran into the arena and the names along its top; 9 October)
        this._info = ArcadeGame.text(14, 16777215, 270, TextFormatAlign.LEFT);
        this._info.x = 12;
        this._info.y = 2;
        this._info.multiline = true;
        this._info.height = 40;
        this.hud.addChild(this._info);
        this.drawFloor();
        // (QoL #235: the games' words in the player's language)
        this._status.text = KEYS.Get(this.touch ? "io_t3a_bb_status_touch" : "io_t3a_bb_status_keys");
    }

    private static readonly LAVA: string = "arcade/lavafloor/lava.jpg";

    private static readonly FLOOR: string = "arcade/brawl/floor.jpg";

    private static readonly ROCK: string = "arcade/arena/rock.png";

    private static readonly BONE: string = "arcade/brawl/bone.png";

    private drawFloor(): void {
        let g: any = this._floor.graphics;
        g.clear();
        let z: any[] = this._area;
        let floorArt: BitmapData = ArcadeArt.picture(BoneBrawlGame.FLOOR);
        let rockArt: BitmapData = ArcadeArt.picture(BoneBrawlGame.ROCK);
        if (floorArt && rockArt) {
            // the painted floor, at the screen's own place (it is painted for the whole arena), its rocks over it
            g.lineStyle(4, 0x1A0A08, 1);
            g.beginBitmapFill(floorArt, null, false, true);
            g.drawRoundRect(z[0], z[1], z[2] - z[0], z[3] - z[1], 18, 18);
            g.endFill();
            g.lineStyle(0, 0, 0);
            for (let r of as3.values(this._rocks)) {
                ArcadeArt.stamp(g, rockArt, r[0] - r[2] * 1.15, r[1] - r[2] * 1.15, r[2] * 2.3, r[2] * 2.3);
            }
            return;
        }
        let mm: Matrix = new Matrix();
        mm.createGradientBox(z[2] - z[0], z[3] - z[1], Math.PI / 2, Number(z[0]), Number(z[1]));
        g.lineStyle(4, 0x1A0A08, 1);
        g.beginGradientFill(GradientType.LINEAR, [0x4A3A38, 0x3A2C2A], [1, 1], [0, 255], mm);
        g.drawRoundRect(z[0], z[1], z[2] - z[0], z[3] - z[1], 18, 18);
        g.endFill();
        g.lineStyle(1, 0x2A1E1C, 0.7);
        let x: number = Number(z[0] + 40);
        while (x < z[2]) {
            g.moveTo(x, z[1] + 4);
            g.lineTo(x, z[3] - 4);
            x += 40;
        }
        let y: number = Number(z[1] + 40);
        while (y < z[3]) {
            g.moveTo(z[0] + 4, y);
            g.lineTo(z[2] - 4, y);
            y += 40;
        }
        g.lineStyle(0, 0, 0);
        for (let r of as3.values(this._rocks)) {
            g.beginFill(0x000000, 0.35);
            g.drawEllipse(r[0] - r[2], r[1] - r[2] * 0.4 + 6, r[2] * 2, r[2] * 1.1);
            g.endFill();
            let rm: Matrix = new Matrix();
            rm.createGradientBox(r[2] * 2, r[2] * 2, 0, r[0] - r[2] - 5, r[1] - r[2] - 8);
            g.lineStyle(2, 0x0A0608, 1);
            g.beginGradientFill(GradientType.RADIAL, [0x8A7A8A, 0x4A3A4E, 0x1E1622], [1, 1, 1], [0, 130, 255], rm);
            g.drawCircle(r[0], r[1], r[2]);
            g.endFill();
            g.lineStyle(2, 0xFF6A1A, 0.6);
            g.moveTo(r[0] - r[2] * 0.4, r[1] + r[2] * 0.3);
            g.lineTo(r[0] - r[2] * 0.05, r[1] - r[2] * 0.1);
            g.lineTo(r[0] + r[2] * 0.3, r[1] + r[2] * 0.2);
            g.lineStyle(0, 0, 0);
        }
    }

    protected override ownFree(x: number, y: number): boolean {
        for (let r of as3.values(this._rocks)) {
            let dx: number = x - r[0];
            let dy: number = y - r[1];
            if (dx * dx + dy * dy < (r[2] + this._radius) * (r[2] + this._radius)) {
                return false;
            }
        }
        return true;
    }

    private onDown(e: MouseEvent): void {
        this.action({ "ax": Math.round(this.mouseX), "ay": Math.round(this.mouseY) });
    }

    protected override arenaState(msg: any): void {
        this._k = Number(msg.k);
        if (as3.is(msg.gb, Array)) {
            this._bonesDown = as3.as(msg.gb, Array);
        }
        if (as3.is(msg.z, Array)) {
            this._zone = as3.as(msg.z, Array);
        }
        if (msg.zt != null) {
            this._zt = msg.zt | 0;
        }
        for (let f of as3.values(msg.fb)) {
            let id: string = String(f[0]);
            let b: any = this._flying[id];
            if (!b) {
                b = { "snaps": [], "seen": 0 };
                this._flying[id] = b;
            }
            b.snaps.push([this._k, Number(f[1]), Number(f[2])]);
            b.seen = this._k;
        }
    }

    protected override arenaEvent(e: any): void {
        if (e.e == "hit") {
            this._hits[e.i] = 16;
            let at: any[] = this.drawnAt(e.i | 0);
            if ((e.by | 0) == this._you) {
                this.float(KEYS.Get("io_t3a_bb_hit"), Number(at[0]), at[1] - 40, 10289002);
            }
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
        } else if (e.e == "throw" && (e.i | 0) == this._you) {
            SOUNDS.Play("click1", 0.4);
        } else if (e.e == "shrink") {
            this.banner(KEYS.Get("io_t3a_lava_closes"), 16738842, 50);
        } else if (e.e == "out" && (e.i | 0) != this._you) {
            let p: any[] = this.drawnAt(e.i | 0);
            this.float(KEYS.Get("io_t3a_is_out", { "v1": this.nameOf(e.i | 0) }), Number(p[0]), p[1] - 30, 16766346);
        }
    }

    /** A bone, lying or spinning: two knobs each end and a shaft. */
    private static bone(g: any, x: number, y: number, a: number, s: number): void {
        let dx: number = Math.cos(a) * 9 * s;
        let dy: number = Math.sin(a) * 9 * s;
        let nx: number = -dy * 0.32;
        let ny: number = dx * 0.32;
        g.lineStyle(5 * s, 0x2A1A0A, 1);
        g.moveTo(x - dx, y - dy);
        g.lineTo(x + dx, y + dy);
        g.lineStyle(3 * s, 0xF0E4C8, 1);
        g.moveTo(x - dx, y - dy);
        g.lineTo(x + dx, y + dy);
        g.lineStyle(1, 0x2A1A0A, 1);
        g.beginFill(0xF0E4C8, 1);
        g.drawCircle(x - dx + nx, y - dy + ny, 3 * s);
        g.drawCircle(x - dx - nx, y - dy - ny, 3 * s);
        g.drawCircle(x + dx + nx, y + dy + ny, 3 * s);
        g.drawCircle(x + dx - nx, y + dy - ny, 3 * s);
        g.endFill();
        g.lineStyle(0, 0, 0);
    }

    private static drawLyingBone(g: any): void {
        let art: BitmapData = ArcadeArt.picture(BoneBrawlGame.BONE);
        if (art) {
            ArcadeArt.stamp(g, art, -14, -7, 28, 14);
            return;
        }
        BoneBrawlGame.bone(g, 0, 0, 0, 1);
    }

    private static drawBoneShadow(g: any): void {
        g.beginFill(0x000000, 0.25);
        g.drawEllipse(-10, -2, 20, 8);
        g.endFill();
    }

    /** Hearts over a monster (its lives), drawn again only when they change. */
    protected override badgeKey(i: int, p: any): string {
        return "hp" + (((p.flags | 0) >> 2) & 3);
    }

    protected override drawBadge(i: int, p: any, g: any): void {
        let hp: int = ((p.flags | 0) >> 2) & 3;
        let k: int = 0;
        while (k < this._hpMax) {
            g.beginFill(k < hp ? 0xFF3A3A : 0x3A1A1A, 1);
            g.drawCircle(-(this._hpMax - 1) * 4 + k * 8, -this._radius * 2.6 - 16, 3);
            g.endFill();
            k++;
        }
    }

    private static drawFlyingBone(g: any): void {
        let art: BitmapData = ArcadeArt.picture(BoneBrawlGame.BONE);
        if (art) {
            ArcadeArt.stamp(g, art, -15.4, -7.7, 30.8, 15.4);
            return;
        }
        BoneBrawlGame.bone(g, 0, 0, 0, 1.1);
    }

    private static noDraw(g: any): void {
    }

    protected override drawLive(now: int): void {
        // the lava closing in, eased: four strips over the floor's edges, sized
        let i: int = 0;
        while (i < 4) {
            let d: number = Number(this._zone[i]) - Number(this._shown[i]);
            if (Math.abs(d) > 0.3) {
                this._shown[i] = Number(this._shown[i]) + d * 0.08;
            } else {
                this._shown[i] = this._zone[i];
            }
            i++;
        }
        let A: any[] = this._area;
        let Z: any[] = this._shown;
        this.edge(0, Number(A[0]), Number(A[1]), Number(Z[0]) - A[0], A[3] - A[1]);
        this.edge(1, Number(Z[2]), Number(A[1]), A[2] - Number(Z[2]), A[3] - A[1]);
        this.edge(2, Number(Z[0]), Number(A[1]), Number(Z[2]) - Number(Z[0]), Number(Z[1]) - A[1]);
        this.edge(3, Number(Z[0]), Number(Z[3]), Number(Z[2]) - Number(Z[0]), A[3] - Number(Z[3]));
        // bones in the air, on the same clock as the monsters: each a little shape, spun
        let rk: number = this._rk;
        this.poolBegin();
        // the bones lying about (only moved when the list changes; the same place again is no change)
        for (let gb of as3.values(this._bonesDown)) {
            this.poolShape(this._groundBones, "shadow", BoneBrawlGame.drawBoneShadow, Number(gb[1]), Number(gb[2]));
            this.poolShape(this._groundBones, "lying", BoneBrawlGame.drawLyingBone, Number(gb[1]), Number(gb[2])).rotation = (((gb[0] | 0) * 1.7) % 3.14) * 180 / Math.PI;
        }
        for (let id in this._flying) {
            let b: any = this._flying[id];
            if (this._k - Number(b.seen) > 6) {
                delete this._flying[id];
                continue;
            }
            let sn: any[] = as3.cast(b.snaps, Array);
            if (rk < sn[0][0] - 0.5 || rk > Number(b.seen) + 0.5) {
                continue;
            }
            let j: int = (sn.length - 1) | 0;
            while (j > 0 && sn[j][0] > rk) {
                j--;
            }
            let x: number = Number(sn[j][1]);
            let y: number = Number(sn[j][2]);
            if (j < sn.length - 1) {
                let f: number = (rk - sn[j][0]) / Math.max(1, sn[j + 1][0] - sn[j][0]);
                x += (sn[j + 1][1] - x) * f;
                y += (sn[j + 1][2] - y) * f;
            }
            this.poolShape(this._air, "bone", BoneBrawlGame.drawFlyingBone, x, y).rotation = (now / 60 + (Number(id) | 0)) * 57.3;
        }
        // a monster just hit: a red ring round it a moment
        i = 0;
        while (i < this._p.length) {
            let p: any = this._p[i];
            if (p.alive) {
                if (this._hits[i] > 0) {
                    this._hits[i]--;
                    let ring: Shape = this.poolShape(this._air, "hit", BoneBrawlGame.noDraw, Number(p.dx), p.dy - this._radius * 0.6);
                    ring.graphics.clear();
                    ring.graphics.lineStyle(3, 16726554, this._hits[i] / 16);
                    ring.graphics.drawCircle(0, 0, this._radius + 8);
                }
                if (i == this._you) {
                    ArcadeGame.setText(this._info, KEYS.Get("io_t3a_bb_info", { "v1": ((p.flags | 0) >> 2) & 3, "v2": ((p.flags | 0) >> 4) & 3 }) + "   " + this.lavaLine());
                }
            } else if (i == this._you) {
                // (out: said so; it stayed at "Lives 1"; 9 October)
                ArcadeGame.setText(this._info, KEYS.Get("io_t3a_bb_ko") + "   " + this.lavaLine());
            }
            i++;
        }
        this.poolEnd();
        // the aim
        this._aim.visible = Boolean(this.mine.alive && this._tm >= 0);
        this._aim.x = this.mouseX;
        this._aim.y = this.mouseY;
    }

    private edge(n: int, x: number, y: number, w: number, h: number): void {
        let e: Shape = as3.cast(this._edges[n], Shape);
        let on: boolean = w > 0.5 && h > 0.5;
        if (e.visible != on) {
            e.visible = on;
        }
        let lava: BitmapData = ArcadeArt.picture(BoneBrawlGame.LAVA);
        if (on && lava) {
            // the painted lava, in its place on the screen: the strip is the lava round the floor, coming in
            let key: string = Math.round(x) + "," + Math.round(y) + "," + Math.round(w) + "," + Math.round(h);
            if (e["ioKey"] != key) {
                e["ioKey"] = key;
                e.x = e.y = 0;
                e.scaleX = e.scaleY = 1;
                e.graphics.clear();
                e.graphics.beginBitmapFill(lava, null, false, true);
                e.graphics.drawRect(x, y, w, h);
                e.graphics.endFill();
                e.graphics.lineStyle(2, 0xFFB040, 0.6);
                e.graphics.drawRect(x, y, w, h);
            }
            return;
        }
        if (on) {
            e.x = x;
            e.y = y;
            e.scaleX = w / 100;
            e.scaleY = h / 100;
        }
    }

    /** The lava's line: when it closes in next, or (closed in all it can) the time left. */
    private lavaLine(): string {
        return this._zt >= 0 ? KEYS.Get("io_t3a_bb_lava_in", { "v1": this._zt }) : KEYS.Get("io_t3a_time_left", { "v1": -1 - this._zt });
    }

    /** Safe a moment after a hit: blinking. */
    protected override bodyAlpha(p: any): number {
        return ((p.flags | 0) & 64) != 0 && ((getTimer() / 80) | 0) % 2 == 0 ? 0.45 : super.bodyAlpha(p);
    }

    protected override endLine(msg: any, won: boolean): string {
        let w: int = msg.winner | 0;
        let kos: any[] = as3.as(msg.stats, Array);
        let mine: int = kos ? kos[this._you] | 0 : 0;
        return (won ? KEYS.Get("io_t3a_last_standing") : (w >= 0 ? KEYS.Get("io_t3a_was_last", { "v1": this.nameOf(w) }) : KEYS.Get(w == -1 ? (msg.reason == "time" ? "io_t3a_time_ran_out" : "io_t3a_nobody_standing") : "io_t3a_bb_you_ko"))) + "\n" + KEYS.Get("io_t3a_bb_your_kos", { "v1": mine });
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(TouchEvent.TOUCH_BEGIN, as3.bind(this, this.onTouch));
    }
}
