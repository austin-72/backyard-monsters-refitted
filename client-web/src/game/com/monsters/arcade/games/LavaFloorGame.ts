import * as as3 from "as3";
import { int } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Matrix } from "flash/geom";
import { getTimer } from "flash/utils";
import { ArcadeArt, ArcadeGame, ArcadeWindow, ArenaGame, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Lava Floor (the Devil's Arcade, 7 October, the user's pick), drawn from the server's match
 * (server/src/services/arcade/lavafloor.ts): basalt tiles over the lava. A tile anyone stands on cracks and
 * falls a moment later; off the floor and you're out. Space shoves (a short lunge: it knocks whoever it reaches
 * flying, and carries you over one gap). The last one standing wins.
 */
export class LavaFloorGame extends ArenaGame {
    static {
        as3.fields(this, { _cols: 12, _rows: 7, _t: 52, _x0: 48, _y0: 28, _crack: 0.75, _tiles: null, _crackAt: null, _lava: null, _floor: null, _tileShapes: null, _fx: null, _rings: null, _cracking: null, _tileArt: false, _shoves: null });
    }

    private static readonly TILES: string = "arcade/lavafloor/tiles.png";

    private static readonly CRACK: string = "arcade/lavafloor/crack.png";
    private _cols: int;
    private _rows: int;
    private _t: number;
    private _x0: number;
    private _y0: number;
    private _crack: number;
    /** 0 sound, 1 cracking, 2 fallen. */
    private _tiles: any[];
    /** When each cracking tile began to crack (getTimer). */
    private _crackAt: any;
    private _lava: Shape;
    /**
     * The floor: each tile its own little shape, drawn once and hidden when it falls (7 October, performance: one
     * shape for the whole floor drawn again whenever a tile changed made the renderer redraw all of it).
     */
    private _floor: Sprite;
    private _tileShapes: any[];
    /** Cracking tiles (pooled, each drawn again in its own spot) and the shove rings. */
    private _fx: Sprite;
    private _rings: Sprite;
    /** The cracking tiles' own pictures, by tile: the slab, a glow and the cracks, drawn once; only moved and the
     * glow brightened as it goes (9 October: each was drawn again from its pictures every frame). */
    private _cracking: any;
    /** The tiles are drawn from their picture (TILES: four slabs, 52 x 60 each, the top face 52 x 52). */
    private _tileArt: boolean;
    private _shoves: any[];

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._tiles = [];
        this._crackAt = {};
        this._tileShapes = [];
        this._cracking = {};
        this._shoves = [];
        super.$ctor(win, mode, ctx);
    }

    protected override get actionLabel(): string {
        return "SHOVE";
    }

    protected override arenaStart(a: any, m: any): void {
        this._cols = a.cols | 0;
        this._rows = a.rows | 0;
        this._t = Number(a.tile);
        this._x0 = Number(a.x0);
        this._y0 = Number(a.y0);
        this._crack = Number(a.crack);
        let i: int = 0;
        while (i < this._cols * this._rows) {
            this._tiles.push(0);
            i++;
        }
        // the lava under it all (drawn once)
        this._lava = as3.as(this._ground.addChild(new Shape()), Shape);
        let g: any = this._lava.graphics;
        let mm: Matrix = new Matrix();
        mm.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 3, 0, 0);
        g.beginGradientFill(GradientType.LINEAR, [0xC0300A, 0xFF7A1A, 0xD0400C], [1, 1, 1], [0, 128, 255], mm);
        g.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        g.endFill();
        let k: int = 0;
        while (k < 70) {
            g.beginFill(k % 3 == 0 ? 0xFFE080 : 0xFFB040, 0.35 + (k % 4) * 0.1);
            g.drawEllipse((k * 89) % ArcadeGame.GW, (k * 47) % ArcadeGame.GH, 10 + k % 17, 4 + k % 5);
            g.endFill();
            k++;
        }
        this._lava.cacheAsBitmap = true;
        // (7 October, the user's: more detailed art, art/devilsarcade/games: the lava painted, the tiles basalt
        // slabs with their edges; drawn as above until they have loaded)
        let lavaArt: Sprite = as3.as(this._ground.addChild(new Sprite()), Sprite);
        CasinoUI.picture(lavaArt, "arcade/lavafloor/lava.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH);
        ArcadeArt.preload([LavaFloorGame.TILES, LavaFloorGame.CRACK]);
        this._tileArt = ArcadeArt.picture(LavaFloorGame.TILES) != null;
        this._floor = as3.as(this._ground.addChild(new Sprite()), Sprite);
        i = 0;
        while (i < this._tiles.length) {
            let ts: Shape = as3.as(this._floor.addChild(new Shape()), Shape);
            ts.x = this._x0 + (i % this._cols) * this._t;
            ts.y = this._y0 + ((i / this._cols) | 0) * this._t;
            this.tile(ts.graphics, i);
            this._tileShapes.push(ts);
            i++;
        }
        this._fx = as3.as(this._ground.addChild(new Sprite()), Sprite);
        this._rings = new Sprite();
        this.addChildAt(this._rings, this.getChildIndex(this._over));
        // (QoL #235: the games' words in the player's language)
        this._status.text = KEYS.Get(this.touch ? "io_t3a_lf_status_touch" : "io_t3a_lf_status_keys");
    }

    protected override arenaState(msg: any): void {
        for (let c of as3.values(msg.c)) {
            let i: int = c[0] | 0;
            this._tiles[i] = c[1] | 0;
            if ((c[1] | 0) == 1) {
                this._crackAt[i] = getTimer();
            } else {
                delete this._crackAt[i];
            }
            let sh: Shape = as3.cast(this._tileShapes[i], Shape);
            if (sh && sh.visible != ((c[1] | 0) == 0)) {
                sh.visible = (c[1] | 0) == 0;
            }
        }
    }

    protected override arenaEvent(e: any): void {
        if (e.e == "shove") {
            let at: any[] = this.drawnAt(e.o | 0);
            this._shoves.push({ "x": at[0], "y": at[1], "life": 14 });
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
        } else if (e.e == "out") {
            let p: any[] = this.drawnAt(e.i | 0);
            this._shoves.push({ "x": p[0], "y": p[1], "life": 24, "splash": true });
            if ((e.i | 0) != this._you) {
                this.float(KEYS.Get("io_t3a_lf_fell", { "v1": this.nameOf(e.i | 0) }), Number(p[0]), p[1] - 30, 16766346);
            }
            SOUNDS.Play("ihit2", 0.7);
        }
    }

    protected override ownKeptIn(): boolean {
        return false;
    }

    /** A tile, round its top left corner: basalt, a lit edge, a darker bottom. */
    private tile(g: any, i: int): void {
        let x: number = 0;
        let y: number = 0;
        let t: number = this._t;
        let art: BitmapData = ArcadeArt.picture(LavaFloorGame.TILES);
        if (art) {
            // one of the four slabs (by the tile, so the floor is the same each time), its side below it
            let v: int = ((i * 7 + ((i / this._cols) | 0) * 3) % 4) | 0;
            let sc: number = t / 52;
            let m: Matrix = new Matrix();
            m.scale(sc, sc);
            m.translate(-v * 52 * sc, 0);
            g.beginBitmapFill(art, m, false, true);
            g.drawRect(0, 0, t, t + 8 * sc);
            g.endFill();
            return;
        }
        g.lineStyle(0, 0, 0);
        g.beginFill(0x1A0E0C, 1);
        g.drawRect(x + 1, y + 5, t - 2, t - 3);
        g.endFill();
        g.beginFill(((i % this._cols) + ((i / this._cols) | 0)) % 2 == 0 ? 0x4A3E3C : 0x433836, 1);
        g.drawRect(x + 1, y + 1, t - 2, t - 6);
        g.endFill();
        g.beginFill(0x6A5A56, 0.7);
        g.drawRect(x + 1, y + 1, t - 2, 3);
        g.endFill();
        g.beginFill(0x2A201E, 0.6);
        g.drawCircle(x + t * 0.3 + (i * 7) % 9, y + t * 0.4, 2.5);
        g.drawCircle(x + t * 0.7, y + t * 0.6 - (i * 5) % 7, 2);
        g.endFill();
    }

    private static noDraw(g: any): void {
    }

    private static drawRing(g: any): void {
        g.lineStyle(3, 0xFFFFFF, 1);
        g.drawCircle(0, 0, 40);
    }

    private static drawSplash(g: any): void {
        g.lineStyle(3, 0xFFB040, 1);
        g.drawCircle(0, 0, 40);
    }

    /** The dash: a glow round whoever is lunging (drawn again only when that changes). */
    protected override badgeKey(i: int, p: any): string {
        return ((p.flags | 0) & 1) != 0 ? "dash" : "";
    }

    protected override drawBadge(i: int, p: any, g: any): void {
        g.beginFill(0xFFFFFF, 0.25);
        g.drawCircle(0, 0, this._radius + 4);
        g.endFill();
    }

    protected override drawLive(now: int): void {
        // the tiles drawn again from their picture once it has come
        if (!this._tileArt && ArcadeArt.picture(LavaFloorGame.TILES)) {
            this._tileArt = true;
            let ti: int = 0;
            while (ti < this._tileShapes.length) {
                this._tileShapes[ti].graphics.clear();
                this.tile(this._tileShapes[ti].graphics, ti);
                ti++;
            }
        }
        let crackArt: BitmapData = ArcadeArt.picture(LavaFloorGame.CRACK);
        this.poolBegin();
        // cracking tiles shake, darken and split as they go: each its own little shape
        for (let gone in this._cracking) {
            if (this._crackAt[gone] == null || !(crackArt && this._tileArt)) {
                let old: Sprite = as3.as(this._cracking[gone], Sprite);
                if (old.parent) {
                    old.parent.removeChild(old);
                }
                delete this._cracking[gone];
            }
        }
        for (let key in this._crackAt) {
            let i: int = Number(key) | 0;
            let f: number = Math.min(1, (now - (this._crackAt[key] | 0)) / (this._crack * 1000));
            if (crackArt && this._tileArt) {
                let cr: Sprite = as3.as(this._cracking[key], Sprite);
                if (!cr) {
                    cr = as3.cast(this._cracking[key] = as3.as(this._fx.addChild(new Sprite()), Sprite), Sprite);
                    let slab: Shape = as3.as(cr.addChild(new Shape()), Shape);
                    this.tile(slab.graphics, i);
                    let glow: Shape = as3.as(cr.addChild(new Shape()), Shape);
                    glow.name = "glow";
                    glow.graphics.beginFill(16738842, 1);
                    glow.graphics.drawRect(0, 0, this._t, this._t);
                    glow.graphics.endFill();
                    let cracks: Shape = as3.as(cr.addChild(new Shape()), Shape);
                    let cm: Matrix = new Matrix();
                    cm.scale(this._t / crackArt.width, this._t / crackArt.height);
                    cracks.graphics.beginBitmapFill(crackArt, cm, false, true);
                    cracks.graphics.drawRect(0, 0, this._t, this._t);
                    cracks.graphics.endFill();
                }
                cr.x = this._x0 + (i % this._cols) * this._t + (Math.random() - 0.5) * f * 3;
                cr.y = this._y0 + ((i / this._cols) | 0) * this._t + f * 5;
                cr.getChildAt(1).alpha = 0.12 + f * 0.45;
                continue;
            }
            let cs: Shape = this.poolShape(this._fx, "crack", LavaFloorGame.noDraw, this._x0 + (i % this._cols) * this._t + (Math.random() - 0.5) * f * 3, this._y0 + ((i / this._cols) | 0) * this._t + f * 5);
            let g: any = cs.graphics;
            g.clear();
            let x: number = 0;
            let y: number = 0;
            let t: number = this._t;
            g.lineStyle(0, 0, 0);
            g.beginFill(0x3A2A26, 1 - f * 0.4);
            g.drawRect(x + 1, y + 1, t - 2, t - 6);
            g.endFill();
            g.beginFill(0xFF6A1A, 0.25 + f * 0.5);
            g.drawRect(x + 1, y + 1, t - 2, t - 6);
            g.endFill();
            if (crackArt) {
                let cm2: Matrix = new Matrix();
                cm2.scale(t / crackArt.width, t / crackArt.height);
                g.beginBitmapFill(crackArt, cm2, false, true);
                g.drawRect(0, 0, t, t);
                g.endFill();
                continue;
            }
            g.lineStyle(2, 0xFFD060, 0.5 + f * 0.5);
            g.moveTo(x + t * 0.2, y + t * 0.15);
            g.lineTo(x + t * 0.45, y + t * 0.45);
            g.lineTo(x + t * 0.35, y + t * 0.8);
            g.moveTo(x + t * 0.45, y + t * 0.45);
            g.lineTo(x + t * 0.8, y + t * 0.35);
            if (f > 0.5) {
                g.moveTo(x + t * 0.6, y + t * 0.4);
                g.lineTo(x + t * 0.75, y + t * 0.75);
            }
            g.lineStyle(0, 0, 0);
        }
        // shoves and splashes: rings spreading
        let keep: any[] = [];
        for (let s of as3.values(this._shoves)) {
            s.life--;
            if (s.life <= 0) {
                continue;
            }
            keep.push(s);
            let r: number = (s.splash ? 24 - s.life : 14 - s.life) * (s.splash ? 2.2 : 3);
            let ring: Shape = s.splash ? this.poolShape(this._rings, "splash", LavaFloorGame.drawSplash, Number(s.x), Number(s.y)) : this.poolShape(this._rings, "ring", LavaFloorGame.drawRing, Number(s.x), Number(s.y));
            ring.alpha = s.life / (s.splash ? 24 : 14);
            ring.scaleX = ring.scaleY = Math.max(0.05, r / 40);
        }
        this._shoves = keep;
        this.poolEnd();
    }

    protected override endLine(msg: any, won: boolean): string {
        let w: int = msg.winner | 0;
        let kills: any[] = as3.as(msg.stats, Array);
        let mine: int = kills ? kills[this._you] | 0 : 0;
        let line: string = won ? KEYS.Get("io_t3a_last_standing") : (w >= 0 ? KEYS.Get("io_t3a_was_last", { "v1": this.nameOf(w) }) : KEYS.Get(w == -1 ? "io_t3a_lf_all_fell" : "io_t3a_lf_you_fell"));
        return line + (mine > 0 ? "\n" + KEYS.Get("io_t3a_lf_shoved", { "v1": mine }) : "");
    }
}
