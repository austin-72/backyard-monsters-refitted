import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { ColorTransform, Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Spurtz Swarm (the Devil's Arcade, 7 October, the user's pick): Balthazar against the swarm, a
 * shooter up the screen. Each wave flies in along curves from the sides and the top and lines up in a block
 * that sways; from there monsters dive at Balthazar in loops, spitting embers, and climb back in from the top.
 *
 *  - Spurtz: one hit, 100. Zagnoid: two, 200. Valgos: three, 300, and spits more. A golden Spurtz: 500, and it
 *    drops a power-up (in Versus it also sends a swarm at the rival). Every fifth wave a Grokus (the brute)
 *    comes with the swarm: thirty hits, 5,000.
 *  - Power-ups: two shots at once, faster shots, a shield that takes one hit, a life (rarely).
 *  - Three lives; a wave cleared is worth 500 times its number.
 *
 * The waves (which monsters, where they line up, how they come in) are made from the run's seed and the wave's
 * number, so in Versus both players meet the same ones. Versus (relay.ts, "score"): when both are out of
 * lives the higher score wins.
 */
export class SwarmGame extends ArcadeGame {
    static {
        as3.fields(this, { _x: NaN, _y: 370, _lives: 3, _score: 0, _wave: 0, _step: 0, _shots: null, _spits: null, _foes: null, _drops: null, _bursts: null, _cool: 0, _double: 0, _rapid: 0, _shield: false, _down: false, _mouse: false, _dead: 0, _safe: 0, _nextDive: 0, _waveGap: 0, _sway: 0, _foeLayer: null, _fx: null, _sky: null, _shieldRing: null, _me: null, _hudScore: null, _hudLives: null, _hudWave: null, _hudRival: null, _stars: null, _floats: null, _flap: 0, _versus: false, _countdown: 0, _rivalName: "", _rivalScore: 0, _rivalWave: 0, _sentAt: 0, _doneSent: false, _out: false, _incoming: 0, _rngKeep: 1 });
    }

    private static readonly TOP: number = 300;

    private static readonly BOTTOM: number = 398;

    private static readonly KINDS: any = { "spurtz": { "sheet": "spurtz", "hp": 1, "pts": 100, "size": 30, "spit": 0.15 }, "gold": { "sheet": "spurtz", "hp": 1, "pts": 500, "size": 32, "spit": 0.1 }, "zagnoid": { "sheet": "zagnoid", "hp": 2, "pts": 200, "size": 40, "spit": 0.25 }, "valgos": { "sheet": "valgos", "hp": 3, "pts": 300, "size": 44, "spit": 0.5 }, "grokus": { "sheet": "grokus", "hp": 30, "pts": 5000, "size": 88, "spit": 1 } };
    private _x: number;
    private _y: number;
    private _lives: int;
    private _score: int;
    private _wave: int;
    private _step: int;
    private _shots: any[];
    private _spits: any[];
    private _foes: any[];
    private _drops: any[];
    private _bursts: any[];
    private _cool: int;
    private _double: int;
    private _rapid: int;
    private _shield: boolean;
    private _down: boolean;
    private _mouse: boolean;
    private _dead: int;
    private _safe: int;
    private _nextDive: int;
    private _waveGap: int;
    private _sway: number;
    private _foeLayer: Sprite;
    private _fx: Sprite;
    private _sky: Sprite;
    private _shieldRing: Shape;
    private _me: Bitmap;
    private _hudScore: TextField;
    private _hudLives: TextField;
    private _hudWave: TextField;
    private _hudRival: TextField;
    private _stars: any[];
    private _floats: any[];
    private _flap: int;
    // ---- Versus
    private _versus: boolean;
    private _countdown: int;
    private _rivalName: string;
    private _rivalScore: int;
    private _rivalWave: int;
    private _sentAt: int;
    private _doneSent: boolean;
    private _out: boolean;
    private _incoming: int;
    // (the waves are made from their own numbers; the stream the dives use is left where it was)
    private _rngKeep: number;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._x = ArcadeGame.GW / 2;
        this._shots = [];
        this._spits = [];
        this._foes = [];
        this._drops = [];
        this._bursts = [];
        this._stars = [];
        this._floats = [];
        super.$ctor(win, mode, ctx);
        this._versus = mode == "versus";
        ArcadeArt.preload(["spurtz", "zagnoid", "valgos", "grokus", "balthazar"]);
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x08030A, 0x1C0610, 0x3A0C06], [1, 1, 1], [0, 150, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        // a lava glow along the bottom
        let m2: Matrix = new Matrix();
        m2.createGradientBox(ArcadeGame.GW, 60, Math.PI / 2, 0, ArcadeGame.GH - 60);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0xFF5A1A, 0xFF5A1A], [0, 0.35], [0, 255], m2);
        bg.graphics.drawRect(0, ArcadeGame.GH - 60, ArcadeGame.GW, 60);
        bg.graphics.endFill();
        // (7 October, performance: the far embers drawn once into the backdrop; a few near ones drift, each a dot
        // of its own: the whole sky was drawn again every frame)
        let i: int = 0;
        while (i < 60) {
            let sr: number = 0.4 + ((i * 37) % 17) / 17 * 1.6;
            bg.graphics.beginFill((sr > 1.4 ? 0xFFB060 : 0xFF6A3A) >>> 0, 0.25 + sr * 0.2);
            bg.graphics.drawCircle((i * 131) % ArcadeGame.GW, (i * 71) % ArcadeGame.GH, sr * 0.7);
            bg.graphics.endFill();
            i++;
        }
        bg.cacheAsBitmap = true;
        this._sky = as3.as(this.addChild(new Sprite()), Sprite);
        i = 0;
        while (i < 14) {
            let dot: Shape = as3.as(this._sky.addChild(new Shape()), Shape);
            let dr: number = 1.4 + Math.random() * 1.4;
            dot.graphics.beginFill((dr > 2.2 ? 0xFFB060 : 0xFF6A3A) >>> 0, 0.5 + dr * 0.15);
            dot.graphics.drawCircle(0, 0, dr * 0.7);
            dot.graphics.endFill();
            dot.x = Math.random() * ArcadeGame.GW;
            dot.y = Math.random() * ArcadeGame.GH;
            this._stars.push([dot, dr]);
            i++;
        }
        this._foeLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._me = as3.as(this.addChild(new Bitmap()), Bitmap);
        this._me.smoothing = true;
        this._fx = as3.as(this.addChild(new Sprite()), Sprite);
        this._shieldRing = as3.as(this.addChild(new Shape()), Shape);
        this._shieldRing.graphics.lineStyle(2, 10289002, 0.7);
        this._shieldRing.graphics.drawCircle(0, 0, 26);
        this._shieldRing.visible = false;
        this._hudScore = ArcadeGame.text(22, 16766346, 260, TextFormatAlign.CENTER);
        this._hudScore.x = (ArcadeGame.GW - 260) / 2;
        this._hudScore.y = 4;
        this._hudScore.name = "swarmScore";
        this.hud.addChild(this._hudScore);
        this._hudLives = ArcadeGame.text(14, 16777215, 200, TextFormatAlign.LEFT);
        this._hudLives.x = 12;
        this._hudLives.y = 8;
        this.hud.addChild(this._hudLives);
        this._hudWave = ArcadeGame.text(14, 16747050, 200, TextFormatAlign.LEFT);
        this._hudWave.x = 12;
        this._hudWave.y = 28;
        this.hud.addChild(this._hudWave);
        this._hudRival = ArcadeGame.text(14, 10148095, 240, TextFormatAlign.RIGHT);
        this._hudRival.x = ArcadeGame.GW - 252;
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
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this._waveGap = 60;
        this.updateHud();
        if (this._countdown > 0) {
            this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 50);
        }
    }

    private onDown(e: MouseEvent): void {
        this._down = true;
        this._mouse = true;
        // (the button let go anywhere: let go off the game, it kept firing; 9 October)
        if (this.stage) {
            this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }

    private onUp(e: MouseEvent): void {
        this._down = false;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }

    private onMove(e: MouseEvent): void {
        this._mouse = true;
    }

    public override keyDown(code: int): void {
        super.keyDown(code);
        if (code == Keyboard.LEFT || code == Keyboard.RIGHT || code == Keyboard.UP || code == Keyboard.DOWN || code == 65 || code == 68 || code == 87 || code == 83) {
            this._mouse = false;
        }
    }

    /** A wave: its monsters lined up in a block, coming in along curves (from the seed and the wave's number). */
    private makeWave(): void {
        this._wave++;
        let saved: number = this.rngState();
        this.seed((((Number(this.ctx && this.ctx.seed ? this.ctx.seed : 1) % 100000) | 0) * 31 + this._wave * 7919) | 0);
        let cols: int = Math.min(10, 6 + ((this._wave / 2) | 0)) | 0;
        let rows: int = Math.min(5, 2 + ((this._wave / 3) | 0)) | 0;
        let gapX: number = 52;
        let x0: number = (ArcadeGame.GW - (cols - 1) * gapX) / 2;
        let from: int = this.rint(3);
        let r: int = 0;
        while (r < rows) {
            let c: int = 0;
            while (c < cols) {
                let kind: string = r == 0 && this._wave >= 3 ? "valgos" : (r <= 1 && this._wave >= 2 ? "zagnoid" : "spurtz");
                if (this.rnd() < 0.05 + this._wave * 0.004) {
                    kind = "gold";
                }
                let k: any = SwarmGame.KINDS[kind];
                let hx: number = x0 + c * gapX;
                let hy: number = 58 + r * 40;
                // the way in: a curve from a side (or the top), one after another
                let side: int = from == 2 ? (c < cols / 2 ? 0 : 1) : from;
                let sx: number = Number(side == 0 ? -40 : ArcadeGame.GW + 40);
                let sy: number = 120 + this.rnd() * 120;
                this._foes.push({ "kind": kind, "hp": k.hp, "x": sx, "y": sy, "hx": hx, "hy": hy, "state": "in", "t": -(r * cols + c) * 5, "sx": sx, "sy": sy, "cx": side == 0 ? ArcadeGame.GW * 0.35 : ArcadeGame.GW * 0.65, "cy": 330 - r * 30, "bmp": null, "face": 90, "hit": 0, "big": false });
                c++;
            }
            r++;
        }
        if (this._wave % 5 == 0) {
            this._foes.push({ "kind": "grokus", "hp": 30 + this._wave * 2, "x": ArcadeGame.GW / 2, "y": -80, "hx": ArcadeGame.GW / 2, "hy": 60 + rows * 40 + 30, "state": "in", "t": -40, "sx": ArcadeGame.GW / 2, "sy": -80, "cx": ArcadeGame.GW / 2, "cy": 100, "bmp": null, "face": 90, "hit": 0, "big": true });
        }
        this.seedState(saved);
        this._nextDive = (this._step + 160) | 0;
        // (QoL #235: the games' words in the player's language)
        this.banner(KEYS.Get(this._wave % 5 == 0 ? "io_t3a_sw_wave_brute" : "io_t3a_sw_wave", { "v1": this._wave }), (this._wave % 5 == 0 ? 0xFF6A1A : 0xFFD58A) >>> 0, 50);
        this.updateHud();
    }

    private rngState(): number {
        let a: number = this.rnd();
        this._rngKeep = a;
        return a;
    }

    private seedState(v: number): void {
        this.seed((((v * 2147483646) | 0) + 1) | 0);
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            this._countdown--;
            if (this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_sw_fire"), 16747050, 30);
            }
            return;
        }
        if (this._out) {
            this.moveFoes();
            return;
        }
        this._step++;
        this._sway = Math.sin(this._step / 70) * 26;
        // Balthazar
        if (this._dead > 0) {
            if (--this._dead == 0) {
                this._x = ArcadeGame.GW / 2;
                this._y = 370;
                this._safe = 120;
            }
        } else {
            let sp: number = 6.5;
            if (this._mouse) {
                let tx: number = Math.max(24, Math.min(ArcadeGame.GW - 24, this.mouseX));
                let ty: number = Math.max(SwarmGame.TOP, Math.min(SwarmGame.BOTTOM, this.mouseY));
                this._x += Math.max(-sp * 1.4, Math.min(sp * 1.4, (tx - this._x) * 0.35));
                this._y += Math.max(-sp, Math.min(sp, (ty - this._y) * 0.35));
            } else {
                if (this.key(Keyboard.LEFT) || this.key(65)) {
                    this._x -= sp;
                }
                if (this.key(Keyboard.RIGHT) || this.key(68)) {
                    this._x += sp;
                }
                if (this.key(Keyboard.UP) || this.key(87)) {
                    this._y -= sp * 0.7;
                }
                if (this.key(Keyboard.DOWN) || this.key(83)) {
                    this._y += sp * 0.7;
                }
            }
            this._x = Math.max(24, Math.min(ArcadeGame.GW - 24, this._x));
            this._y = Math.max(SwarmGame.TOP, Math.min(SwarmGame.BOTTOM, this._y));
            if (this._safe > 0) {
                this._safe--;
            }
            if (this._cool > 0) {
                this._cool--;
            }
            let firing: boolean = this._down || this.key(Keyboard.SPACE);
            if (firing && this._cool <= 0) {
                this._cool = this._rapid > 0 ? 6 : 11;
                if (this._double > 0) {
                    this._shots.push([this._x - 10, this._y - 18], [this._x + 10, this._y - 18]);
                } else {
                    this._shots.push([this._x, this._y - 20]);
                }
            }
            if (this._double > 0) {
                this._double--;
            }
            if (this._rapid > 0) {
                this._rapid--;
            }
        }
        // shots up
        let keep: any[] = [];
        for (let s of as3.values(this._shots)) {
            s[1] -= 11;
            if (s[1] > -10 && !this.hitFoe(s)) {
                keep.push(s);
            }
        }
        this._shots = keep;
        this.moveFoes();
        // dives
        if (this._step >= this._nextDive) {
            this._nextDive = (this._step + Math.max(25, 110 - this._wave * 7) + this.rint(40)) | 0;
            let n: int = this._wave >= 4 && this.rnd() < 0.4 ? 2 : 1;
            while (n-- > 0) {
                this.dive();
            }
        }
        // a swarm the rival sent: five Spurtz straight down at once
        if (this._incoming > 0 && this._step % 20 == 0) {
            this._incoming--;
            let j: int = 0;
            while (j < 5) {
                this._foes.push({ "kind": "spurtz", "hp": 1, "x": 120 + j * 120, "y": -30, "hx": 120 + j * 120, "hy": -60, "state": "dive", "t": 0, "sx": 120 + j * 120, "sy": -30, "cx": this._x, "cy": 260, "bmp": null, "face": 90, "hit": 0, "big": false, "sent": true });
                j++;
            }
        }
        // embers down
        let sk: any[] = [];
        for (let e of as3.values(this._spits)) {
            e[0] += e[2];
            e[1] += e[3];
            if (e[1] < ArcadeGame.GH + 10 && e[0] > -10 && e[0] < ArcadeGame.GW + 10) {
                if (this._dead <= 0 && this._safe <= 0 && Math.abs(e[0] - this._x) < 12 && Math.abs(e[1] - this._y) < 14) {
                    this.hurt();
                    // (hurt cleared the embers: they stay cleared; putting back the ones moved this step undid
                    // it; 9 October)
                    if (!this._spits.length) {
                        sk = null;
                        break;
                    }
                    continue;
                }
                sk.push(e);
            }
        }
        if (sk) {
            this._spits = sk;
        }
        // power-ups falling
        let dk: any[] = [];
        for (let d of as3.values(this._drops)) {
            d.y += 1.8;
            if (this._dead <= 0 && Math.abs(d.x - this._x) < 22 && Math.abs(d.y - this._y) < 22) {
                this.take(String(d.k));
                continue;
            }
            if (d.y < ArcadeGame.GH + 20) {
                dk.push(d);
            }
        }
        this._drops = dk;
        // the wave cleared?
        if (!this._foes.length) {
            if (this._waveGap <= 0) {
                if (this._wave > 0) {
                    let bonus: int = (500 * this._wave) | 0;
                    this._score += bonus;
                    this.float(KEYS.Get("io_t3a_sw_cleared", { "v1": CasinoUI.number(bonus) }), ArcadeGame.GW / 2, 180, 10289002);
                }
                this._waveGap = 70;
            } else if (--this._waveGap == 0) {
                this.makeWave();
            }
        }
        if (this._versus && this._step - this._sentAt >= 30) {
            this._sentAt = this._step;
            ArcadeNet.send({ "t": "s", "score": this._score, "wave": this._wave });
        }
        if (this._step % 15 == 0) {
            this.updateHud();
        }
    }

    private dive(): void {
        let ready: any[] = [];
        for (let f of as3.values(this._foes)) {
            if (f.state == "home") {
                ready.push(f);
            }
        }
        if (!ready.length) {
            return;
        }
        let f2: any = ready[this.rint(ready.length)];
        f2.state = "dive";
        f2.t = 0;
        f2.sx = f2.x;
        f2.sy = f2.y;
        f2.cx = this._x + (this.rnd() - 0.5) * 240;
        f2.cy = 260 + this.rnd() * 100;
    }

    /** Where a monster is: coming in (a curve to its place), at home (swaying in the block), or diving. */
    private moveFoes(): void {
        let keep: any[] = [];
        for (let f of as3.values(this._foes)) {
            f.t++;
            if (f.hit > 0) {
                f.hit--;
            }
            let k: any = SwarmGame.KINDS[f.kind];
            let px: number = Number(f.x);
            let py: number = Number(f.y);
            if (f.state == "in") {
                if (f.t < 0) {
                    keep.push(f);
                    continue;
                }
                let u: number = Math.min(1, f.t / 80);
                let tx: number = Number(f.hx + this._sway);
                f.x = (1 - u) * (1 - u) * f.sx + 2 * (1 - u) * u * f.cx + u * u * tx;
                f.y = (1 - u) * (1 - u) * f.sy + 2 * (1 - u) * u * f.cy + u * u * f.hy;
                if (u >= 1) {
                    f.state = "home";
                }
            } else if (f.state == "home") {
                f.x = f.hx + this._sway;
                f.y = f.hy + Math.sin((this._step + f.hx) / 30) * 3;
                if (f.big && this._step % 50 == 0 && this._dead <= 0) {
                    this.spitAt(f, 3);
                }
            } else if (f.state == "dive") {
                let w: number = Math.min(1, f.t / 110);
                // down past the player in a loop, then off the bottom
                let ex: number = Number(f.cx + (f.cx < ArcadeGame.GW / 2 ? 140 : -140));
                let ey: number = ArcadeGame.GH + 60;
                let a1: number = (1 - w) * (1 - w) * (1 - w);
                let a2: number = 3 * (1 - w) * (1 - w) * w;
                let a3: number = 3 * (1 - w) * w * w;
                let a4: number = w * w * w;
                f.x = a1 * f.sx + a2 * (f.sx + (f.cx - f.sx) * 0.2) + a3 * f.cx + a4 * ex;
                f.y = a1 * f.sy + a2 * (f.sy - 70) + a3 * f.cy + a4 * ey;
                if (f.t == 30 || f.t == 60) {
                    if (this.rnd() < Number(k.spit) + this._wave * 0.02 && this._dead <= 0) {
                        this.spitAt(f, 1);
                    }
                }
                if (w >= 1) {
                    if (f.sent) {
                        continue;
                    }
                    // back in from the top to its place
                    f.state = "in";
                    f.t = 0;
                    f.sx = f.hx;
                    f.sy = -40;
                    f.cx = f.hx;
                    f.cy = -10;
                }
                // running into Balthazar
                if (this._dead <= 0 && this._safe <= 0 && Math.abs(f.x - this._x) < k.size * 0.45 && Math.abs(f.y - this._y) < k.size * 0.45) {
                    this.hurt();
                    if (!f.big) {
                        this.burst(Number(f.x), Number(f.y), 16756800);
                        continue;
                    }
                }
            }
            let dx: number = f.x - px;
            let dy: number = f.y - py;
            if (Math.abs(dx) + Math.abs(dy) > 0.5) {
                f.face = Math.atan2(dy, dx) * 180 / Math.PI;
            } else {
                f.face = 90;
            }
            keep.push(f);
        }
        // the ones gone: their pictures away
        for (let g of as3.values(this._foes)) {
            if (keep.indexOf(g) < 0 && g.bmp && g.bmp.parent) {
                g.bmp.parent.removeChild(g.bmp);
            }
        }
        this._foes = keep;
    }

    private spitAt(f: any, n: int): void {
        let a: number = Math.atan2(this._y - f.y, this._x - f.x);
        let i: int = 0;
        while (i < n) {
            let aa: number = a + (i - (n - 1) / 2) * 0.22;
            this._spits.push([f.x, f.y + 10, Math.cos(aa) * 3.6, Math.sin(aa) * 3.6]);
            i++;
        }
    }

    /** A shot hits the first monster it touches. */
    private hitFoe(s: any[]): boolean {
        for (let f of as3.values(this._foes)) {
            if (f.state == "in" && f.t < 0) {
                continue;
            }
            let k: any = SwarmGame.KINDS[f.kind];
            let r: number = Number(k.size) * 0.42;
            if (Math.abs(s[0] - f.x) < r && Math.abs(s[1] - f.y) < r) {
                f.hp--;
                f.hit = 5;
                if (f.hp <= 0) {
                    let pts: int = ((k.pts | 0) * (f.state == "dive" ? 2 : 1)) | 0;
                    this._score += pts;
                    this.float("+" + pts, Number(f.x), Number(f.y), (f.kind == "gold" ? 0xFFE040 : 0xFFD58A) >>> 0);
                    this.burst(Number(f.x), Number(f.y), (f.kind == "gold" ? 0xFFE040 : 0xFF8A2A) >>> 0);
                    SOUNDS.Play(f.big ? "chaching" : "ihit" + ((1 + Math.random() * 7) | 0), 0.5);
                    this._foes.splice(this._foes.indexOf(f), 1);
                    if (f.bmp && f.bmp.parent) {
                        f.bmp.parent.removeChild(f.bmp);
                    }
                    if (f.kind == "gold" || f.big || Math.random() < 0.04) {
                        let r2: number = Math.random();
                        this._drops.push({ "x": f.x, "y": f.y, "k": r2 < 0.08 ? "life" : (r2 < 0.4 ? "double" : (r2 < 0.75 ? "rapid" : "shield")) });
                    }
                    if (f.kind == "gold" && this._versus) {
                        ArcadeNet.send({ "t": "ev", "k": "swarm" });
                        this.float(KEYS.Get("io_t3a_sw_sent"), ArcadeGame.GW / 2, 90, 10148095);
                    }
                }
                return true;
            }
        }
        return false;
    }

    private take(k: string): void {
        SOUNDS.Play("chaching", 0.5);
        if (k == "double") {
            this._double = (60 * 12) | 0;
            this.float(KEYS.Get("io_t3a_sw_double"), this._x, this._y - 30, 10148095);
        } else if (k == "rapid") {
            this._rapid = (60 * 12) | 0;
            this.float(KEYS.Get("io_t3a_sw_rapid"), this._x, this._y - 30, 16747050);
        } else if (k == "shield") {
            this._shield = true;
            this.float(KEYS.Get("io_t3a_sw_shield"), this._x, this._y - 30, 10289002);
        } else {
            this._lives = Math.min(5, this._lives + 1) | 0;
            this.float(KEYS.Get("io_t3a_plus_life"), this._x, this._y - 30, 16739008);
        }
        this.updateHud();
    }

    private hurt(): void {
        if (this._shield) {
            this._shield = false;
            this._safe = 60;
            this.burst(this._x, this._y, 10289002);
            return;
        }
        this._lives--;
        this.burst(this._x, this._y, 16726554);
        this.burst(this._x, this._y, 16766346);
        SOUNDS.Play("ihit1", 0.8);
        this._double = 0;
        this._rapid = 0;
        this._spits = [];
        this.updateHud();
        if (this._lives <= 0) {
            this.gameDone();
            return;
        }
        this._dead = 90;
    }

    private gameDone(): void {
        this._out = true;
        this._dead = 1000000;
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this._score });
                this.banner(KEYS.Get("io_t3a_sw_down_waiting", { "v1": this._rivalName }), 16766346, 400);
                this.leaveButton();
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_sw_down"), "score": this._score, "score2": this._wave, "line": KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this._score) }) + "\n" + KEYS.Get("io_t3a_sw_reached", { "v1": this._wave }) });
    }

    private burst(x: number, y: number, color: uint): void {
        this._bursts.push({ "x": x, "y": y, "c": color, "life": 18 });
    }

    private float(text: string, x: number, y: number, color: uint): void {
        let t: TextField = ArcadeGame.text(14, color, 200, TextFormatAlign.CENTER);
        t.text = text;
        t.x = x - 100;
        t.y = y - 12;
        this.hud.addChild(t);
        this._floats.push({ "t": t, "life": 36 });
    }

    private updateHud(): void {
        ArcadeGame.setText(this._hudScore, CasinoUI.number(this._score));
        ArcadeGame.setText(this._hudLives, KEYS.Get("io_t3a_sw_lives", { "v1": Math.max(0, this._lives) }) + (this._shield ? "  " + KEYS.Get("io_t3a_sw_shield_tag") : ""));
        ArcadeGame.setText(this._hudWave, this._wave > 0 ? KEYS.Get("io_t3a_sw_hud_wave", { "v1": this._wave }) : "");
        if (this._versus) {
            ArcadeGame.setText(this._hudRival, this._rivalName + ": " + CasinoUI.number(this._rivalScore) + (this._rivalWave > 0 ? "\n" + KEYS.Get("io_t3a_sw_rival_wave", { "v1": this._rivalWave }) : ""));
        }
    }

    protected override draw(alpha: number): void {
        // the near embers drifting down
        for (let st of as3.values(this._stars)) {
            let dot: Shape = as3.cast(st[0], Shape);
            dot.y += st[1] * 0.6;
            if (dot.y > ArcadeGame.GH) {
                dot.y = 0;
                dot.x = Math.random() * ArcadeGame.GW;
            }
        }
        // the monsters
        for (let f of as3.values(this._foes)) {
            let k: any = SwarmGame.KINDS[f.kind];
            if (f.state == "in" && f.t < 0) {
                if (f.bmp) {
                    f.bmp.visible = false;
                }
                continue;
            }
            let fr: BitmapData = ArcadeArt.frame(String(k.sheet), Number(f.state == "home" ? 90 : Number(f.face)), (String(k.sheet) == "spurtz" ? 1 + ((this._step / 6) | 0) % 2 : 0) | 0);
            if (!fr) {
                continue;
            }
            if (!f.bmp) {
                f.bmp = new Bitmap();
                f.bmp.smoothing = true;
                this._foeLayer.addChild(as3.cast(f.bmp, DisplayObject));
                if (f.kind == "gold") {
                    f.bmp.transform.colorTransform = new ColorTransform(1.15, 1.05, 0.45, 1, 50, 40, 0, 0);
                }
            }
            f.bmp.visible = true;
            f.bmp.bitmapData = fr;
            f.bmp.smoothing = true;
            let sc: number = Number(k.size) / Math.max(fr.width, fr.height) * 1.25;
            f.bmp.scaleX = f.bmp.scaleY = sc;
            f.bmp.x = f.x - fr.width * sc / 2;
            f.bmp.y = f.y - fr.height * sc / 2;
            f.bmp.alpha = f.hit > 0 ? 0.55 : 1;
        }
        // Balthazar, facing up
        // (26 October: his frames there and back, as in the yard: SPRITES.GetSprite's IC5)
        let beat: int = (((this._flap / 4) | 0) % 12) | 0;
        let me: BitmapData = ArcadeArt.frame("balthazar", 270, (beat <= 6 ? beat : 12 - beat) | 0);
        this._flap++;
        if (me) {
            this._me.bitmapData = me;
            this._me.smoothing = true;
            this._me.scaleX = this._me.scaleY = 1.2;
            this._me.x = this._x - me.width * 0.6;
            this._me.y = this._y - me.height * 0.6;
        }
        this._me.visible = this._dead <= 0 && (this._safe <= 0 || ((this._safe / 5) | 0) % 2 == 0);
        // shots, embers, power-ups, bursts: each a small shape of its own, moved
        this.poolBegin();
        for (let s of as3.values(this._shots)) {
            this.poolShape(this._fx, "shot", SwarmGame.drawShot, Number(s[0]), Number(s[1]));
        }
        for (let e of as3.values(this._spits)) {
            this.poolShape(this._fx, "spit", SwarmGame.drawSpit, Number(e[0]), Number(e[1]));
        }
        for (let d of as3.values(this._drops)) {
            this.poolShape(this._fx, "drop:" + d.k, SwarmGame.dropDrawer(String(d.k)), Number(d.x), Number(d.y));
        }
        this._shieldRing.visible = this._shield && this._dead <= 0;
        if (this._shieldRing.visible) {
            this._shieldRing.x = this._x;
            this._shieldRing.y = this._y;
        }
        let bk: any[] = [];
        for (let b of as3.values(this._bursts)) {
            b.life--;
            if (b.life <= 0) {
                continue;
            }
            bk.push(b);
            let bs: Shape = this.poolShape(this._fx, "burst", SwarmGame.noDraw, Number(b.x), Number(b.y));
            let fx: any = bs.graphics;
            fx.clear();
            let r: number = (18 - b.life) * 2.6;
            fx.lineStyle(3, b.c, b.life / 18);
            let i: int = 0;
            while (i < 8) {
                let a: number = i / 8 * Math.PI * 2 + b.life * 0.05;
                fx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
                fx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                i++;
            }
        }
        this.poolEnd();
        this._bursts = bk;
        let fl: any[] = [];
        for (let o of as3.values(this._floats)) {
            o.life--;
            o.t.y -= 0.8;
            o.t.alpha = Math.min(1, o.life / 12);
            if (o.life > 0) {
                fl.push(o);
            } else if (o.t.parent) {
                o.t.parent.removeChild(o.t);
            }
        }
        this._floats = fl;
    }

    private static noDraw(g: any): void {
    }

    private static drawShot(g: any): void {
        g.beginFill(0xFF8A2A, 0.5);
        g.drawEllipse(-4, -9, 8, 18);
        g.endFill();
        g.beginFill(0xFFF0B0, 1);
        g.drawEllipse(-2, -6, 4, 12);
        g.endFill();
    }

    private static drawSpit(g: any): void {
        g.beginFill(0xFF2A1A, 0.45);
        g.drawCircle(0, 0, 7);
        g.endFill();
        g.beginFill(0xFFB040, 1);
        g.drawCircle(0, 0, 3.5);
        g.endFill();
    }

    /** A power-up's look: a coloured disc with its mark. */
    private static dropDrawer(k: string): Function {
        return (g: any): void => {
            let col: uint = (k == "double" ? 0x5AB0FF : (k == "rapid" ? 0xFF8A2A : (k == "shield" ? 0x7AE05A : 0xFF6AC0))) >>> 0;
            g.lineStyle(2, 0xFFFFFF, 0.9);
            g.beginFill(col, 1);
            g.drawCircle(0, 0, 11);
            g.endFill();
            g.lineStyle(2, 0xFFFFFF, 1);
            if (k == "double") {
                g.moveTo(-4, 5);
                g.lineTo(-4, -5);
                g.moveTo(4, 5);
                g.lineTo(4, -5);
            } else if (k == "rapid") {
                g.moveTo(2, -6);
                g.lineTo(-3, 1);
                g.lineTo(2, 1);
                g.lineTo(-2, 6);
            } else if (k == "shield") {
                g.drawCircle(0, 0, 5);
            } else {
                g.moveTo(-5, 0);
                g.lineTo(5, 0);
                g.moveTo(0, -5);
                g.lineTo(0, 5);
            }
        };
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s") {
            this._rivalScore = msg.score | 0;
            this._rivalWave = msg.wave | 0;
            this.updateHud();
        } else if (t == "ev" && msg.k == "swarm") {
            this._incoming++;
            this.float(KEYS.Get("io_t3a_sw_rival_sent", { "v1": this._rivalName }), ArcadeGame.GW / 2, 110, 16747114);
        } else if (t == "done") {
            this.float(KEYS.Get("io_t3a_sw_rival_down", { "v1": this._rivalName }), ArcadeGame.GW / 2, 130, 10148095);
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this._out = true;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": ArcadeGame.ioVsLine(CasinoUI.number(this._score), this._rivalName, CasinoUI.number(Math.max(0, scores[1 - you] | 0)), msg.reason == "left", won), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        }
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }
}
