import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Valgos Golf (the Devil's Arcade, 7 October, the user's pick): minigolf seen from above, Valgos
 * curled into a spiky ball. Drag back from him and let go to putt (the further, the harder). Nine holes, each
 * with its par; eight strokes at most a hole.
 *
 *  - Walls bounce him back; magma bumpers throw him harder; ash slows him; magma ramps push him along.
 *  - Lava: a stroke lost, and he goes back to where he lay.
 *  - Spinning obsidian blades knock him about.
 *
 * The nine holes are picked from eighteen (HOLES) by the run's seed, some turned left for right: the Daily's
 * seed is the day's (scores.ts daySeed), the same course for everyone that day. The score kept is 999 less the
 * strokes, so fewer strokes rank higher (ArcadeWindow.valueOf shows the strokes). Versus (relay.ts, "score"):
 * the same course for both; fewer strokes win.
 */
export class GolfGame extends ArcadeGame {
    static {
        as3.fields(this, { _course: null, _hole: -1, _h: null, _segs: null, _bx: 0, _by: 0, _vx: 0, _vy: 0, _restX: 0, _restY: 0, _spin: 0, _strokes: 0, _total: 0, _cards: null, _aces: 0, _t: 0, _moving: false, _aiming: false, _sunkT: 0, _sinkX: 0, _sinkY: 0, _done: false, _green: null, _live: null, _pieces: null, _lits: null, _bladeShapes: null, _ball: null, _shadow: null, _aim: null, _aimShown: false, _hudHole: null, _hudCard: null, _hudRival: null, _floats: null, _versus: false, _countdown: 0, _rivalName: "", _rivalHole: 0, _rivalStrokes: 0, _doneSent: false, _greenArt: false });
    }

    private static readonly R: number = 8;

    private static readonly CUP: number = 11;

    private static readonly MAXV: number = 15;

    private static readonly PULL: number = 150;

    private static readonly MAX_STROKES: int = 8;

    /**
     * The holes. outer: the green's edge (a wall all round); walls: blocks inside it; lava, ash: [x, y, w, h];
     * bump: [x, y, r]; blade: [x, y, length, turn a step]; ramp: [x, y, w, h, direction in degrees].
     */
    public static readonly HOLES: any[] = [{ "name": "Hell's Gate", "par": 2, "tee": [100, 240], "cup": [620, 240], "outer": [[60, 170], [660, 170], [660, 310], [60, 310]], "walls": [[[330, 205], [390, 205], [390, 275], [330, 275]]] }, { "name": "The Dog Leg", "par": 3, "tee": [100, 345], "cup": [575, 115], "outer": [[60, 300], [520, 300], [520, 75], [630, 75], [630, 390], [60, 390]], "bump": [[575, 345, 14]] }, { "name": "Bumper Alley", "par": 2, "tee": [95, 240], "cup": [625, 240], "outer": [[55, 110], [665, 110], [665, 370], [55, 370]], "bump": [[250, 180, 16], [250, 300, 16], [360, 240, 18], [470, 170, 16], [470, 310, 16], [560, 240, 14]] }, { "name": "The Moat", "par": 2, "tee": [130, 240], "cup": [590, 240], "outer": [[80, 90], [640, 90], [640, 390], [80, 390]], "lava": [[300, 90, 120, 118], [300, 272, 120, 118]] }, { "name": "The Blade", "par": 2, "tee": [100, 240], "cup": [620, 240], "outer": [[60, 140], [660, 140], [660, 340], [60, 340]], "blade": [[360, 240, 150, 0.035]] }, { "name": "Zig Zag", "par": 3, "tee": [115, 120], "cup": [605, 355], "outer": [[60, 70], [660, 70], [660, 400], [60, 400]], "walls": [[[230, 70], [255, 70], [255, 300], [230, 300]], [[465, 170], [490, 170], [490, 400], [465, 400]]] }, { "name": "The Ash Pit", "par": 2, "tee": [100, 240], "cup": [600, 240], "outer": [[60, 130], [660, 130], [660, 350], [60, 350]], "ash": [[420, 130, 140, 70], [420, 280, 140, 70], [520, 200, 60, 80]], "bump": [[300, 240, 18]] }, { "name": "Island Green", "par": 3, "tee": [110, 240], "cup": [520, 200], "outer": [[60, 70], [660, 70], [660, 400], [60, 400]], "lava": [[400, 110, 240, 30], [400, 140, 30, 150], [610, 140, 30, 220], [470, 330, 170, 30]] }, { "name": "The U-Bend", "par": 3, "tee": [600, 135], "cup": [600, 345], "outer": [[60, 80], [660, 80], [660, 400], [60, 400]], "walls": [[[160, 200], [660, 200], [660, 280], [160, 280]]], "bump": [[100, 240, 14]] }, { "name": "Pinball", "par": 2, "tee": [100, 240], "cup": [630, 240], "outer": [[55, 80], [665, 80], [665, 400], [55, 400]], "bump": [[230, 160, 15], [230, 320, 15], [330, 240, 15], [430, 140, 15], [430, 340, 15], [530, 200, 15], [530, 280, 15], [330, 110, 13], [330, 370, 13]] }, { "name": "Twin Blades", "par": 3, "tee": [95, 240], "cup": [630, 240], "outer": [[55, 160], [665, 160], [665, 320], [55, 320]], "blade": [[260, 240, 140, 0.03], [470, 240, 140, -0.04]] }, { "name": "Magma Ramps", "par": 2, "tee": [100, 350], "cup": [610, 110], "outer": [[60, 300], [380, 300], [380, 70], [660, 70], [660, 160], [470, 160], [470, 390], [60, 390]], "ramp": [[200, 315, 120, 60, 0], [390, 180, 70, 100, -90]] }, { "name": "The Needle", "par": 3, "tee": [100, 240], "cup": [620, 240], "outer": [[60, 90], [660, 90], [660, 390], [60, 390]], "walls": [[[330, 90], [390, 90], [390, 222], [330, 222]], [[330, 258], [390, 258], [390, 390], [330, 390]]], "lava": [[200, 90, 60, 90], [200, 300, 60, 90]] }, { "name": "The Funnel", "par": 2, "tee": [100, 240], "cup": [630, 240], "outer": [[60, 80], [660, 205], [660, 275], [60, 400]], "lava": [[330, 216, 50, 48]] }, { "name": "Crossroads", "par": 3, "tee": [360, 380], "cup": [360, 100], "outer": [[310, 60], [410, 60], [410, 190], [640, 190], [640, 290], [410, 290], [410, 410], [310, 410], [310, 290], [80, 290], [80, 190], [310, 190]], "blade": [[360, 240, 90, 0.04]], "lava": [[560, 190, 80, 100], [80, 190, 80, 100]] }, { "name": "Bank Shot", "par": 2, "tee": [120, 330], "cup": [600, 330], "outer": [[60, 90], [660, 90], [660, 390], [60, 390]], "walls": [[[345, 160], [375, 160], [375, 390], [345, 390]]], "ash": [[60, 90, 120, 70]] }, { "name": "The Gauntlet", "par": 3, "tee": [95, 240], "cup": [630, 240], "outer": [[55, 150], [665, 150], [665, 330], [55, 330]], "bump": [[200, 195, 13], [290, 285, 13], [380, 195, 13], [470, 285, 13]], "ash": [[530, 150, 70, 180]], "blade": [[580, 240, 70, 0.05]] }, { "name": "The Devil's Hole", "par": 4, "tee": [100, 120], "cup": [610, 350], "outer": [[60, 70], [660, 70], [660, 400], [60, 400]], "walls": [[[200, 170], [520, 170], [520, 195], [200, 195]], [[200, 280], [520, 280], [520, 305], [200, 305]]], "lava": [[560, 230, 100, 60], [60, 220, 90, 40]], "bump": [[360, 240, 16]], "blade": [[600, 140, 100, -0.035]] }];

    // ---- drawing
    /**
     * The course's pictures (7 October, the user's: more detailed art, art/devilsarcade/games): textures the
     * green, the walls, the lava and the ash are filled with (repeating), and the bumpers, the cup and the flag.
     * Drawn as before until they have loaded; the hole is drawn again when they have.
     */
    private static readonly ART: any[] = ["arcade/golf/felt.jpg", "arcade/golf/rock.jpg", "arcade/golf/lava.jpg", "arcade/golf/ash.jpg", "arcade/golf/bumper.png", "arcade/golf/cup.png", "arcade/golf/flag.png", "arcade/golf/blade.png"];
    private _course: any[];
    private _hole: int;
    private _h: any;
    private _segs: any[];
    private _bx: number;
    private _by: number;
    private _vx: number;
    private _vy: number;
    private _restX: number;
    private _restY: number;
    private _spin: number;
    private _strokes: int;
    private _total: int;
    private _cards: any[];
    private _aces: int;
    private _t: int;
    private _moving: boolean;
    private _aiming: boolean;
    private _sunkT: int;
    private _sinkX: number;
    private _sinkY: number;
    private _done: boolean;
    private _green: Shape;
    private _live: Shape;
    /** (7 October, performance) The hole's moving parts, each its own shape, turned and moved rather than drawn
     * again: the bumpers' lit glows, the blades, Valgos and his shadow, the aim. */
    private _pieces: Sprite;
    private _lits: any[];
    private _bladeShapes: any[];
    private _ball: Shape;
    private _shadow: Shape;
    private _aim: Shape;
    private _aimShown: boolean;
    private _hudHole: TextField;
    private _hudCard: TextField;
    private _hudRival: TextField;
    private _floats: any[];
    // ---- Versus
    private _versus: boolean;
    private _countdown: int;
    private _rivalName: string;
    private _rivalHole: int;
    private _rivalStrokes: int;
    private _doneSent: boolean;
    private _greenArt: boolean;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._course = [];
        this._segs = [];
        this._cards = [];
        this._lits = [];
        this._bladeShapes = [];
        this._floats = [];
        super.$ctor(win, mode, ctx);
        ArcadeArt.preload(GolfGame.ART);
        this._versus = mode == "versus";
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x2A0A06, 0x4A1206, 0x2A0804], [1, 1, 1], [0, 128, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        let k: int = 0;
        while (k < 50) {
            bg.graphics.beginFill(16738842, 0.06 + (k % 4) * 0.03);
            bg.graphics.drawCircle((k * 131) % ArcadeGame.GW, (k * 71) % ArcadeGame.GH, 6 + k % 9);
            bg.graphics.endFill();
            k++;
        }
        bg.cacheAsBitmap = true;
        // (the cavern floor round the course, painted: art/devilsarcade/games)
        let bgArt: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        CasinoUI.picture(bgArt, "arcade/golf/bg.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH);
        this._green = as3.as(this.addChild(new Shape()), Shape);
        this._green.cacheAsBitmap = true;
        this._live = as3.as(this.addChild(new Shape()), Shape);
        this._pieces = as3.as(this.addChild(new Sprite()), Sprite);
        this._shadow = as3.as(this.addChild(new Shape()), Shape);
        this._shadow.graphics.beginFill(0, 0.3);
        this._shadow.graphics.drawEllipse(-GolfGame.R + 2, -GolfGame.R * 0.6 + 4, GolfGame.R * 2, GolfGame.R * 1.2);
        this._shadow.graphics.endFill();
        this._ball = as3.as(this.addChild(new Shape()), Shape);
        this.drawBall(this._ball.graphics);
        this._aim = as3.as(this.addChild(new Shape()), Shape);
        this._hudHole = ArcadeGame.text(18, 16766346, 400, TextFormatAlign.LEFT);
        this._hudHole.x = 12;
        this._hudHole.y = 4;
        this._hudHole.name = "golfHole";
        this.hud.addChild(this._hudHole);
        this._hudCard = ArcadeGame.text(13, 15655632, 400, TextFormatAlign.LEFT);
        this._hudCard.x = 12;
        this._hudCard.y = 28;
        this.hud.addChild(this._hudCard);
        this._hudRival = ArcadeGame.text(14, 10148095, 260, TextFormatAlign.RIGHT);
        this._hudRival.x = ArcadeGame.GW - 272;
        this._hudRival.y = 8;
        this._hudRival.multiline = true;
        this._hudRival.height = 40;
        this.hud.addChild(this._hudRival);
        if (this._versus) {
            let players: any[] = as3.as(ctx.players, Array);
            let you: int = ctx.you | 0;
            this._rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3a_rival");
            this._countdown = (Number(ctx.cd) / ArcadeGame.STEP) | 0;
        }
        this.topHud();
        // the course: nine of the eighteen, from the seed, some turned left for right
        let order: any[] = [];
        let i: int = 0;
        while (i < GolfGame.HOLES.length) {
            order.push(i);
            i++;
        }
        i = (order.length - 1) | 0;
        while (i > 0) {
            let j: int = this.rint((i + 1) | 0);
            let t: int = order[i] | 0;
            order[i] = order[j];
            order[j] = t;
            i--;
        }
        i = 0;
        while (i < 9) {
            this._course.push({ "i": order[i], "flip": this.rnd() < 0.5 });
            i++;
        }
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.nextHole();
        if (this._countdown > 0) {
            this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 50);
        }
    }

    /** A hole, turned left for right if the course says so. */
    private static holeOf(i: int, flip: boolean): any {
        let fx: Function = null;
        let src: any = GolfGame.HOLES[i];
        fx = (x: number): number => {
            return flip ? ArcadeGame.GW - x : x;
        };
        let pts: Function = (a: any[]): any[] => {
            let o: any[] = [];
            for (let p of as3.values(a)) {
                o.push([fx(p[0]), p[1]]);
            }
            return o;
        };
        let rects: Function = (a: any[]): any[] => {
            let o: any[] = [];
            for (let r of as3.values(a)) {
                let q: any[] = [flip ? ArcadeGame.GW - r[0] - r[2] : r[0], r[1], r[2], r[3]];
                if (r.length > 4) {
                    q.push(flip ? 180 - r[4] : r[4]);
                }
                o.push(q);
            }
            return o;
        };
        let h: any = { "name": src.name, "par": src.par, "tee": [fx(src.tee[0]), src.tee[1]], "cup": [fx(src.cup[0]), src.cup[1]], "outer": pts(as3.as(src.outer, Array)), "walls": [], "lava": rects(src.lava ? as3.as(src.lava, Array) : []), "ash": rects(src.ash ? as3.as(src.ash, Array) : []), "ramp": rects(src.ramp ? as3.as(src.ramp, Array) : []), "bump": [], "blade": [] };
        for (let w of as3.values(src.walls)) {
            h.walls.push(pts(w));
        }
        for (let b of as3.values(src.bump)) {
            h.bump.push([fx(b[0]), b[1], b[2]]);
        }
        for (let bl of as3.values(src.blade)) {
            h.blade.push([fx(bl[0]), bl[1], bl[2], flip ? -bl[3] : bl[3]]);
        }
        return h;
    }

    private nextHole(): void {
        this._hole++;
        if (this._hole >= 9) {
            this.finish();
            return;
        }
        let c: any = this._course[this._hole];
        this._h = GolfGame.holeOf(c.i | 0, Boolean(c.flip));
        this._segs = [];
        this.addPoly(as3.as(this._h.outer, Array));
        for (let w of as3.values(this._h.walls)) {
            this.addPoly(w);
        }
        this._bx = this._restX = Number(this._h.tee[0]);
        this._by = this._restY = Number(this._h.tee[1]);
        this._vx = this._vy = 0;
        this._strokes = 0;
        this._t = 0;
        this._moving = false;
        this._sunkT = 0;
        this.drawGreen();
        this.buildPieces();
        this.updateHud();
        // (QoL #235: the games' words in the player's language; the holes' names stay as they are)
        this.banner(KEYS.Get("io_t3a_go_hole", { "v1": this._hole + 1, "v2": String(this._h.name).toUpperCase() }), 16766346, 60);
    }

    private addPoly(p: any[]): void {
        let i: int = 0;
        while (i < p.length) {
            let a: any[] = as3.cast(p[i], Array);
            let b: any[] = as3.cast(p[(i + 1) % p.length], Array);
            this._segs.push([a[0], a[1], b[0], b[1]]);
            i++;
        }
    }

    // ---- putting
    private onDown(e: MouseEvent): void {
        if (this._moving || this._sunkT > 0 || this._done || this._countdown > 0 || this.ended) {
            return;
        }
        this._aiming = true;
        // (the button let go anywhere, not only over the green: 7 October, the user's "when you click and drag
        // off the game screen it won't let you release"; the stage hears it wherever it is let go)
        if (this.stage) {
            this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }

    private onUp(e: MouseEvent): void {
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
        if (!this._aiming) {
            return;
        }
        this._aiming = false;
        if (this._moving || this._done || this.ended) {
            return;
        }
        let dx: number = this._bx - this.mouseX;
        let dy: number = this._by - this.mouseY;
        let d: number = Math.sqrt(dx * dx + dy * dy);
        if (d < 8) {
            return;
        }
        let p: number = Math.min(1, d / GolfGame.PULL);
        this._vx = dx / d * GolfGame.MAXV * p;
        this._vy = dy / d * GolfGame.MAXV * p;
        this._moving = true;
        this._strokes++;
        this._restX = this._bx;
        this._restY = this._by;
        SOUNDS.Play("click1", 0.5);
        this.updateHud();
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            this._countdown--;
            if (this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_go_tee"), 16747050, 30);
            }
            return;
        }
        if (this._done) {
            return;
        }
        this._t++;
        if (this._sunkT > 0) {
            if (--this._sunkT == 0) {
                this.nextHole();
            }
            return;
        }
        if (!this._moving) {
            // (a blade sweeping round can knock him on even while he lies still)
            this.blades();
            if (!this._moving) {
                return;
            }
        }
        let sub: int = 0;
        while (sub < 4) {
            this._bx += this._vx / 4;
            this._by += this._vy / 4;
            this.collide();
            sub++;
        }
        this._spin += Math.sqrt(this._vx * this._vx + this._vy * this._vy) * 0.08;
        // the ground: ash slows, ramps push, lava burns
        let fr: number = 0.982;
        for (let a of as3.values(this._h.ash)) {
            if (this.inRect(a)) {
                fr = 0.93;
            }
        }
        for (let rp of as3.values(this._h.ramp)) {
            if (this.inRect(rp)) {
                let ang: number = Number(rp[4]) * Math.PI / 180;
                this._vx += Math.cos(ang) * 0.55;
                this._vy += Math.sin(ang) * 0.55;
                fr = 0.99;
            }
        }
        this._vx *= fr;
        this._vy *= fr;
        for (let l of as3.values(this._h.lava)) {
            if (this.inRect(l)) {
                this.burn();
                return;
            }
        }
        // the cup: in if slow enough over it
        let cx: number = Number(this._h.cup[0]) - this._bx;
        let cy: number = Number(this._h.cup[1]) - this._by;
        let sp: number = Math.sqrt(this._vx * this._vx + this._vy * this._vy);
        if (cx * cx + cy * cy < GolfGame.CUP * GolfGame.CUP) {
            if (sp < 8) {
                this.sink();
                return;
            }
            // (too fast: it lips over, a little turned)
            this._vx += cx * 0.04;
            this._vy += cy * 0.04;
        } else if (cx * cx + cy * cy < 30 * 30 && sp < 3) {
            // a little pull at the lip
            this._vx += cx * 0.006;
            this._vy += cy * 0.006;
        }
        if (sp < 0.12) {
            this._vx = this._vy = 0;
            this._moving = false;
            if (this._strokes >= GolfGame.MAX_STROKES) {
                this.float(KEYS.Get("io_t3a_go_picked", { "v1": GolfGame.MAX_STROKES }), this._bx, this._by - 20, 16747114);
                this.holeDone();
            }
        }
    }

    private inRect(r: any[]): boolean {
        return this._bx > r[0] && this._bx < r[0] + r[2] && this._by > r[1] && this._by < r[1] + r[3];
    }

    /** Walls, blocks, blades and bumpers: pushed out and bounced. */
    private collide(): void {
        for (let s of as3.values(this._segs)) {
            this.segment(Number(s[0]), Number(s[1]), Number(s[2]), Number(s[3]), 0, 0, 0, 0.78);
        }
        this.blades();
        for (let b of as3.values(this._h.bump)) {
            let dx: number = this._bx - b[0];
            let dy: number = this._by - b[1];
            let d: number = Math.sqrt(dx * dx + dy * dy);
            let rr: number = GolfGame.R + Number(b[2]);
            if (d < rr && d > 0.001) {
                let nx: number = dx / d;
                let ny: number = dy / d;
                this._bx = Number(b[0] + nx * rr);
                this._by = Number(b[1] + ny * rr);
                let vn: number = this._vx * nx + this._vy * ny;
                if (vn < 0) {
                    this._vx -= 2 * vn * nx;
                    this._vy -= 2 * vn * ny;
                    let sp: number = Math.sqrt(this._vx * this._vx + this._vy * this._vy);
                    let want: number = Math.min(GolfGame.MAXV, Math.max(6, sp * 1.25));
                    this._vx *= want / sp;
                    this._vy *= want / sp;
                    b.hitT = 10;
                    SOUNDS.Play("click1", 0.4);
                }
            }
        }
    }

    private blades(): void {
        for (let bl of as3.values(this._h.blade)) {
            let ang: number = this._t * Number(bl[3]);
            let hx: number = Math.cos(ang) * Number(bl[2]) / 2;
            let hy: number = Math.sin(ang) * Number(bl[2]) / 2;
            this.segment(bl[0] - hx, bl[1] - hy, Number(bl[0] + hx), Number(bl[1] + hy), Number(bl[0]), Number(bl[1]), Number(bl[3]), 0.9);
        }
    }

    /** A wall from (x1, y1) to (x2, y2); a blade turning `w` a step about (ox, oy) moves the ball it hits. */
    private segment(x1: number, y1: number, x2: number, y2: number, ox: number, oy: number, w: number, bounce: number): void {
        let ex: number = x2 - x1;
        let ey: number = y2 - y1;
        let len2: number = ex * ex + ey * ey;
        if (len2 <= 0) {
            return;
        }
        let t: number = ((this._bx - x1) * ex + (this._by - y1) * ey) / len2;
        t = Math.max(0, Math.min(1, t));
        let px: number = x1 + ex * t;
        let py: number = y1 + ey * t;
        let dx: number = this._bx - px;
        let dy: number = this._by - py;
        let d2: number = dx * dx + dy * dy;
        if (d2 >= GolfGame.R * GolfGame.R) {
            return;
        }
        let d: number = Math.sqrt(d2);
        let nx: number = NaN;
        let ny: number = NaN;
        if (d < 0.0001) {
            nx = -ey / Math.sqrt(len2);
            ny = ex / Math.sqrt(len2);
            d = 0;
        } else {
            nx = dx / d;
            ny = dy / d;
        }
        this._bx = px + nx * GolfGame.R;
        this._by = py + ny * GolfGame.R;
        // the wall's own speed there (a blade's)
        let wx: number = -(py - oy) * w * 4;
        let wy: number = (px - ox) * w * 4;
        let rvx: number = this._vx - wx;
        let rvy: number = this._vy - wy;
        let vn: number = rvx * nx + rvy * ny;
        if (vn < 0) {
            rvx -= (1 + bounce) * vn * nx;
            rvy -= (1 + bounce) * vn * ny;
            this._vx = rvx + wx;
            this._vy = rvy + wy;
            if (w != 0 && !this._moving) {
                this._moving = true;
                this._restX = this._bx;
                this._restY = this._by;
            }
        }
    }

    private burn(): void {
        // (held to the most a hole: the eighth putt into the lava made it nine; 9 October)
        this._strokes = Math.min(GolfGame.MAX_STROKES, this._strokes + 1) | 0;
        this.float(KEYS.Get("io_t3a_go_lava"), this._bx, this._by - 20, 16734778);
        SOUNDS.Play("ihit2", 0.6);
        this._bx = this._restX;
        this._by = this._restY;
        this._vx = this._vy = 0;
        this._moving = false;
        this.updateHud();
        if (this._strokes >= GolfGame.MAX_STROKES) {
            this.holeDone();
        }
    }

    private sink(): void {
        this._moving = false;
        this._sinkX = this._bx;
        this._sinkY = this._by;
        this._bx = Number(this._h.cup[0]);
        this._by = Number(this._h.cup[1]);
        this._vx = this._vy = 0;
        let par: int = this._h.par | 0;
        let diff: int = (this._strokes - par) | 0;
        let word: string = this._strokes == 1 ? KEYS.Get("io_t3a_go_ace") : (diff <= -2 ? KEYS.Get("io_t3a_go_eagle") : (diff == -1 ? KEYS.Get("io_t3a_go_birdie") : (diff == 0 ? KEYS.Get("io_t3a_go_par") : (diff == 1 ? KEYS.Get("io_t3a_go_bogey") : (diff == 2 ? KEYS.Get("io_t3a_go_double_bogey") : "+" + diff)))));
        if (this._strokes == 1) {
            this._aces++;
        }
        this.banner(word, (diff < 0 ? 0x9CFF6A : (diff == 0 ? 0xFFD58A : 0xFF8A6A)) >>> 0, 70);
        SOUNDS.Play(diff < 0 ? "chaching" : "click1", 0.7);
        this.holeDone();
    }

    private holeDone(): void {
        this._total += this._strokes;
        this._cards.push(this._strokes);
        this._sunkT = 80;
        this.updateHud();
        if (this._versus) {
            ArcadeNet.send({ "t": "s", "score": 999 - this._total, "hole": this._hole + 1, "strokes": this._total });
        }
    }

    private finish(): void {
        this._done = true;
        let par: int = 0;
        for (let c of as3.values(this._course)) {
            par += GolfGame.HOLES[c.i].par | 0;
        }
        let vs: int = (this._total - par) | 0;
        let line: string = KEYS.Get("io_t3a_go_strokes_vs", { "v1": this._total, "v2": vs == 0 ? KEYS.Get("io_t3a_go_par_word") : (vs > 0 ? "+" + vs : String(vs)) }) + (this._aces ? "  ·  " + KEYS.Get(this._aces == 1 ? "io_t3a_go_aces1" : "io_t3a_go_aces", { "v1": this._aces }) : "");
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": 999 - this._total });
                this.banner(KEYS.Get("io_t3a_go_over_waiting", { "v1": this._rivalName }), 16766346, 400);
                this.leaveButton();
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_go_round_over"), "score": 999 - this._total, "score2": this._aces, "line": line });
    }

    private updateHud(): void {
        if (!this._h) {
            return;
        }
        let par: int = 0;
        let i: int = 0;
        while (i < this._cards.length) {
            par += GolfGame.HOLES[this._course[i].i].par | 0;
            i++;
        }
        let vs: int = (this._total - par) | 0;
        ArcadeGame.setText(this._hudHole, KEYS.Get("io_t3a_go_hud", { "v1": Math.min(9, this._hole + 1), "v2": this._h.par | 0, "v3": this._strokes }));
        ArcadeGame.setText(this._hudCard, KEYS.Get("io_t3a_go_total", { "v1": this._total }) + (this._cards.length ? " (" + (vs == 0 ? KEYS.Get("io_t3a_go_par_word") : (vs > 0 ? "+" + vs : String(vs))) + ")" : ""));
        if (this._versus) {
            ArcadeGame.setText(this._hudRival, this._rivalName + "\n" + (this._rivalHole > 0 ? KEYS.Get(this._rivalHole == 1 ? "io_t3a_go_after1" : "io_t3a_go_after", { "v1": this._rivalStrokes, "v2": this._rivalHole }) : KEYS.Get("io_t3a_go_on_first")));
        }
    }

    private float(text: string, x: number, y: number, color: uint): void {
        let t: TextField = ArcadeGame.text(14, color, 200, TextFormatAlign.CENTER);
        t.text = text;
        t.x = x - 100;
        t.y = y - 12;
        this.hud.addChild(t);
        this._floats.push({ "t": t, "life": 50 });
    }

    private static artReady(): boolean {
        for (const $value of as3.values(GolfGame.ART)) {
            let k: string = as3.str($value);
            if (!ArcadeArt.picture(k)) {
                return false;
            }
        }
        return true;
    }

    /** Fill with a texture (repeating) if it has loaded, else the colour. */
    private static texFill(g: any, key: string, color: uint, alpha: number = 1): void {
        let t: BitmapData = ArcadeArt.picture(key);
        if (t) {
            g.beginBitmapFill(t, null, true, true);
        } else {
            g.beginFill(color, alpha);
        }
    }

    /** A picture drawn centred at (x, y), w x h. */
    private static sprite(g: any, key: string, x: number, y: number, w: number, h: number): boolean {
        let t: BitmapData = ArcadeArt.picture(key);
        if (!t) {
            return false;
        }
        let m: Matrix = new Matrix();
        m.scale(w / t.width, h / t.height);
        m.translate(x - w / 2, y - h / 2);
        g.beginBitmapFill(t, m, false, true);
        g.drawRect(x - w / 2, y - h / 2, w, h);
        g.endFill();
        return true;
    }

    private drawGreen(): void {
        let g: any = this._green.graphics;
        g.clear();
        let h: any = this._h;
        let outer: any[] = as3.as(h.outer, Array);
        this._greenArt = GolfGame.artReady();
        // the green: dark basalt felt, a raised obsidian rim
        g.lineStyle(14, 0x1A1014, 1);
        if (this._greenArt) {
            GolfGame.texFill(g, "arcade/golf/felt.jpg", 3811886);
            this.poly(g, outer, -1);
            g.endFill();
        } else {
            this.poly(g, outer, 0x3A2A2E);
        }
        g.lineStyle(6, 0x5A4A5A, 1);
        this.poly(g, outer, -1);
        g.lineStyle(2, 0xFF6A1A, 0.8);
        this.poly(g, outer, -1);
        g.lineStyle(0, 0, 0);
        // a faint pattern on the felt
        let minX: number = 9999;
        let maxX: number = 0;
        let minY: number = 9999;
        let maxY: number = 0;
        for (let p of as3.values(outer)) {
            minX = Math.min(minX, Number(p[0]));
            maxX = Math.max(maxX, Number(p[0]));
            minY = Math.min(minY, Number(p[1]));
            maxY = Math.max(maxY, Number(p[1]));
        }
        for (let a of as3.values(h.ash)) {
            GolfGame.texFill(g, "arcade/golf/ash.jpg", 9076344, 0.85);
            g.drawRoundRect(a[0], a[1], a[2], a[3], 18, 18);
            g.endFill();
            let k: int = this._greenArt ? 8 : 0;
            while (k < 8) {
                g.beginFill(0x5A5050, 0.6);
                g.drawCircle(a[0] + 10 + (k * 37) % Math.max(1, a[2] - 20), a[1] + 10 + (k * 23) % Math.max(1, a[3] - 20), 2);
                g.endFill();
                k++;
            }
        }
        for (let rp of as3.values(h.ramp)) {
            g.beginFill(0x8A2A0A, 0.9);
            g.drawRect(rp[0], rp[1], rp[2], rp[3]);
            g.endFill();
            let ang: number = Number(rp[4]) * Math.PI / 180;
            let cx: number = Number(rp[0] + rp[2] / 2);
            let cy: number = Number(rp[1] + rp[3] / 2);
            g.lineStyle(4, 0xFFB040, 0.9);
            let q: int = -1;
            while (q <= 1) {
                let ox: number = cx + Math.cos(ang) * q * 22;
                let oy: number = cy + Math.sin(ang) * q * 22;
                g.moveTo(ox - Math.cos(ang - 0.6) * 10, oy - Math.sin(ang - 0.6) * 10);
                g.lineTo(ox, oy);
                g.lineTo(ox - Math.cos(ang + 0.6) * 10, oy - Math.sin(ang + 0.6) * 10);
                q++;
            }
            g.lineStyle(0, 0, 0);
        }
        for (let l of as3.values(h.lava)) {
            if (this._greenArt) {
                g.lineStyle(2, 0x3A0A04, 1);
                GolfGame.texFill(g, "arcade/golf/lava.jpg", 14696474);
                g.drawRoundRect(l[0], l[1], l[2], l[3], 10, 10);
                g.endFill();
                g.lineStyle(0, 0, 0);
                continue;
            }
            let m: Matrix = new Matrix();
            m.createGradientBox(Number(l[2]), Number(l[3]), Math.PI / 4, Number(l[0]), Number(l[1]));
            g.beginGradientFill(GradientType.LINEAR, [0xFF8A2A, 0xE0401A, 0xFFB040], [1, 1, 1], [0, 128, 255], m);
            g.drawRoundRect(l[0], l[1], l[2], l[3], 10, 10);
            g.endFill();
            g.beginFill(0xFFE080, 0.6);
            g.drawEllipse(l[0] + l[2] * 0.2, l[1] + l[3] * 0.3, l[2] * 0.25, Math.min(10, l[3] * 0.2));
            g.endFill();
        }
        for (let w of as3.values(h.walls)) {
            g.lineStyle(2, 0x0A0608, 1);
            if (this._greenArt) {
                GolfGame.texFill(g, "arcade/golf/rock.jpg", 4864590);
                this.poly(g, w, -1);
                g.endFill();
            } else {
                this.poly(g, w, 0x4A3A4E);
            }
            g.lineStyle(2, 0x8A7A9A, 0.8);
            g.moveTo(w[0][0] + 3, w[0][1] + 3);
            g.lineTo(w[1][0] - 3, w[1][1] + 3);
            g.lineStyle(0, 0, 0);
        }
        // the bumpers (their lit glow is a shape of its own over each)
        for (let bp of as3.values(h.bump)) {
            if (this._greenArt && GolfGame.sprite(g, "arcade/golf/bumper.png", Number(bp[0]), Number(bp[1]), bp[2] * 2.3, bp[2] * 2.3)) {
                continue;
            }
            g.lineStyle(3, 0x2A0A06, 1);
            g.beginFill(0xE0501C, 1);
            g.drawCircle(bp[0], bp[1], bp[2]);
            g.endFill();
            g.lineStyle(0, 0, 0);
            g.beginFill(0xFFD040, 0.8);
            g.drawCircle(bp[0] - bp[2] * 0.3, bp[1] - bp[2] * 0.3, bp[2] * 0.35);
            g.endFill();
        }
        // the tee and the cup's flag
        g.beginFill(0x000000, 0.25);
        g.drawCircle(h.tee[0], h.tee[1], 12);
        g.endFill();
        if (this._greenArt) {
            GolfGame.sprite(g, "arcade/golf/cup.png", Number(h.cup[0]), Number(h.cup[1]), GolfGame.CUP * 2.8, GolfGame.CUP * 2.8);
            // the flag: its pole's foot (the picture's x 8 of 48, its bottom) in the cup
            GolfGame.sprite(g, "arcade/golf/flag.png", Number(h.cup[0] + 16), h.cup[1] - 34, 32, 64);
            return;
        }
        g.beginFill(0x0A0406, 1);
        g.lineStyle(2, 0xFFD58A, 1);
        g.drawCircle(h.cup[0], h.cup[1], GolfGame.CUP);
        g.endFill();
        g.lineStyle(2, 0xE8DCC0, 1);
        g.moveTo(h.cup[0], h.cup[1]);
        g.lineTo(h.cup[0], h.cup[1] - 34);
        g.lineStyle(0, 0, 0);
        g.beginFill(0xE0303A, 1);
        g.moveTo(h.cup[0], h.cup[1] - 34);
        g.lineTo(h.cup[0] + 18, h.cup[1] - 28);
        g.lineTo(h.cup[0], h.cup[1] - 22);
        g.endFill();
    }

    private poly(g: any, p: any[], fill: int): void {
        if (fill >= 0) {
            g.beginFill(fill >>> 0, 1);
        }
        g.moveTo(p[0][0], p[0][1]);
        let i: int = 1;
        while (i <= p.length) {
            g.lineTo(p[i % p.length][0], p[i % p.length][1]);
            i++;
        }
        if (fill >= 0) {
            g.endFill();
        }
    }

    /** The hole's bumper glows and blades, made once a hole. */
    private buildPieces(): void {
        CasinoUI.removeAll(this._pieces);
        this._lits = [];
        this._bladeShapes = [];
        for (let b of as3.values(this._h.bump)) {
            let lit: Shape = as3.as(this._pieces.addChild(new Shape()), Shape);
            lit.graphics.lineStyle(3, 2755078, 1);
            lit.graphics.beginFill(16769152, 1);
            lit.graphics.drawCircle(0, 0, Number(b[2]));
            lit.graphics.endFill();
            lit.x = Number(b[0]);
            lit.y = Number(b[1]);
            lit.visible = false;
            this._lits.push(lit);
        }
        for (let bl of as3.values(this._h.blade)) {
            let sh: Shape = as3.as(this._pieces.addChild(new Shape()), Shape);
            let half: number = Number(bl[2]) / 2;
            if (this._greenArt && GolfGame.sprite(sh.graphics, "arcade/golf/blade.png", 0, 0, half * 2 + 8, 22)) {
                sh.x = Number(bl[0]);
                sh.y = Number(bl[1]);
                this._bladeShapes.push(sh);
                continue;
            }
            sh.graphics.lineStyle(9, 656904, 1);
            sh.graphics.moveTo(-half, 0);
            sh.graphics.lineTo(half, 0);
            sh.graphics.lineStyle(5, 8022666, 1);
            sh.graphics.moveTo(-half, 0);
            sh.graphics.lineTo(half, 0);
            sh.graphics.lineStyle(0, 0, 0);
            sh.graphics.beginFill(16738842, 1);
            sh.graphics.drawCircle(0, 0, 6);
            sh.graphics.endFill();
            sh.x = Number(bl[0]);
            sh.y = Number(bl[1]);
            this._bladeShapes.push(sh);
        }
    }

    /** Valgos curled up, drawn once (turned as he rolls): spikes, his shell, his eye peeking out. */
    private drawBall(g: any): void {
        let k: int = 0;
        while (k < 8) {
            let a: number = k * Math.PI / 4;
            g.beginFill(0xF0E4C8, 1);
            g.moveTo(Math.cos(a - 0.25) * GolfGame.R * 0.9, Math.sin(a - 0.25) * GolfGame.R * 0.9);
            g.lineTo(Math.cos(a) * GolfGame.R * 1.55, Math.sin(a) * GolfGame.R * 1.55);
            g.lineTo(Math.cos(a + 0.25) * GolfGame.R * 0.9, Math.sin(a + 0.25) * GolfGame.R * 0.9);
            g.endFill();
            k++;
        }
        let m: Matrix = new Matrix();
        m.createGradientBox(GolfGame.R * 2, GolfGame.R * 2, 0, -GolfGame.R - 2, -GolfGame.R - 2);
        g.lineStyle(1, 0x2A0A06, 1);
        g.beginGradientFill(GradientType.RADIAL, [0xE08A4A, 0x9A3A1A, 0x4A1A0A], [1, 1, 1], [0, 140, 255], m);
        g.drawCircle(0, 0, GolfGame.R);
        g.endFill();
        g.lineStyle(0, 0, 0);
        g.beginFill(0xFFE040, 1);
        g.drawCircle(GolfGame.R * 0.45, 0, 2);
        g.endFill();
    }

    protected override draw(alpha: number): void {
        // the hole drawn again with its pictures once they have all come
        if (!this._greenArt && this._h && GolfGame.artReady()) {
            this.drawGreen();
            this.buildPieces();
        }
        if (!this._h) {
            return;
        }
        // the bumpers lit when hit, the blades turning
        let i: int = 0;
        while (i < this._lits.length) {
            let b: any = this._h.bump[i];
            let lit: Shape = as3.cast(this._lits[i], Shape);
            if (b.hitT) {
                b.hitT--;
                lit.visible = true;
                lit.alpha = 0.4 + b.hitT / 16;
            } else if (lit.visible) {
                lit.visible = false;
            }
            i++;
        }
        i = 0;
        while (i < this._bladeShapes.length) {
            let bl: any[] = as3.cast(this._h.blade[i], Array);
            this._bladeShapes[i].rotation = ((this._t + alpha) * Number(bl[3])) * 180 / Math.PI;
            i++;
        }
        // aiming: a dotted line the way he'll go, longer the harder (drawn only while aiming)
        let g: any = this._aim.graphics;
        if (this._aiming && !this._moving) {
            g.clear();
            this._aimShown = true;
            let dx: number = this._bx - this.mouseX;
            let dy: number = this._by - this.mouseY;
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d > 4) {
                let p: number = Math.min(1, d / GolfGame.PULL);
                let col: uint = (p < 0.5 ? 0x9CFF6A : (p < 0.85 ? 0xFFD040 : 0xFF5A3A)) >>> 0;
                let j: int = 1;
                while (j <= 10) {
                    let f: number = j / 10 * (40 + p * 160);
                    g.beginFill(col, 1 - j / 12);
                    g.drawCircle(this._bx + dx / d * f, this._by + dy / d * f, 3);
                    g.endFill();
                    j++;
                }
                g.lineStyle(2, 0xFFFFFF, 0.35);
                g.moveTo(this._bx, this._by);
                g.lineTo(this._bx - dx / d * Math.min(d, GolfGame.PULL), this._by - dy / d * Math.min(d, GolfGame.PULL));
                g.lineStyle(0, 0, 0);
                // the power bar beside him
                g.beginFill(0x000000, 0.6);
                g.drawRect(this._bx + 18, this._by - 22, 8, 44);
                g.endFill();
                g.beginFill(col, 1);
                g.drawRect(this._bx + 19, this._by + 21 - 42 * p, 6, 42 * p);
                g.endFill();
            }
        } else if (this._aimShown) {
            this._aimShown = false;
            g.clear();
        }
        // Valgos: moved, turned as he rolls, smaller as he drops into the cup
        let x: number = Number(this._bx + (this._moving ? this._vx * alpha : 0));
        let y: number = Number(this._by + (this._moving ? this._vy * alpha : 0));
        let sc: number = Number(this._sunkT > 0 ? Math.max(0, (this._sunkT - 60) / 20) : 1);
        this._ball.visible = this._shadow.visible = sc > 0;
        this._ball.x = this._shadow.x = x;
        this._ball.y = this._shadow.y = y;
        this._ball.rotation = this._spin * 180 / Math.PI;
        this._ball.scaleX = this._ball.scaleY = this._shadow.scaleX = this._shadow.scaleY = sc;
        let fl: any[] = [];
        for (let o of as3.values(this._floats)) {
            o.life--;
            o.t.y -= 0.6;
            o.t.alpha = Math.min(1, o.life / 15);
            if (o.life > 0) {
                fl.push(o);
            } else if (o.t.parent) {
                o.t.parent.removeChild(o.t);
            }
        }
        this._floats = fl;
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s") {
            this._rivalHole = msg.hole | 0;
            this._rivalStrokes = msg.strokes | 0;
            this.updateHud();
        } else if (t == "done") {
            this._rivalHole = 9;
            this._rivalStrokes = (999 - (msg.score | 0)) | 0;
            this.float(KEYS.Get("io_t3a_go_rival_done", { "v1": this._rivalName, "v2": this._rivalStrokes }), ArcadeGame.GW / 2, 120, 10148095);
            this.updateHud();
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this._done = true;
            let theirs: int = scores[1 - you] | 0;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": KEYS.Get("io_t3a_go_vs_line", { "v1": this._total, "v2": this._rivalName, "v3": theirs > 0 ? String(999 - theirs) : "-" }) + (msg.reason == "left" ? "\n" + (won ? KEYS.Get("io_t3a_vs_rival_left", { "v1": this._rivalName }) : KEYS.Get("io_t3a_vs_you_left")) : ""), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        }
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }
}
