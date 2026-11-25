import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Magma Breakout (the Devil's Arcade). A Spurtz for a ball, an obsidian paddle, a wall of
 * bricks a level: basalt (one hit), obsidian (two), bone (three), magma (bursts and takes its neighbours with
 * it) and gold (100 points). Broken bricks sometimes drop something to catch: a wider paddle, two more balls,
 * a fireball (goes through everything for a while), slow time, a life. Three lives; a wall cleared is the
 * next level, faster.
 *
 * Versus (the same walls from the same seed): every magma brick broken pushes the rival's wall down a row,
 * with a new row on top. A wall that comes down to the paddle ends that player's game. At most three
 * minutes; the higher score wins.
 */
export class BreakoutGame extends ArcadeGame {
    static {
        as3.fields(this, { _bricks: null, _brickArt: false, _balls: null, _drops: null, _parts: null, _paddleX: NaN, _paddleW: 96, _wideT: 0, _fireT: 0, _slowT: 0, _lives: 3, _score: 0, _level: 1, _step: 0, _held: true, _mouseUsed: false, _layer: null, _paddleShape: null, _paddleKey: "", _pooled: null, _ballLayer: null, _hudScore: null, _hudInfo: null, _hudRival: null, _versus: false, _rivalName: "Rival", _rivalScore: 0, _countdown: 0, _sentAt: 0, _doneSent: false, _wallDirty: true, _wall: null, _bricksBroken: 0, _cleared: false });
    }

    private static readonly COLS: int = 12;

    private static readonly BW: number = 54;

    private static readonly BH: number = 18;

    private static readonly GAP: number = 4;

    private static readonly X0: number = 12;

    /**
     * The top row's top. Room over the wall for the ball (7 October, the user's: "allow the ball to go above /
     * behind the top bricks"): the roof is at 44, so there are 46 pixels, more than two balls, to rattle about in.
     * It was 56, too close for the ball to get in.
     */
    private static readonly Y0: number = 90;

    private static readonly PADDLE_Y: number = 392;

    private static readonly BALL_R: number = 9;

    private static readonly DANGER_Y: number = 340;

    private static readonly VERSUS_STEPS: int = (180 * 60) | 0;

    /** Brick kinds: [hits, points, color, top color]. */
    private static readonly KINDS: any = { "basalt": [1, 10, 0x5A4A48, 0x8A7672], "obsidian": [2, 20, 0x241C2C, 0x5A4A6A], "bone": [3, 30, 0xC8BC9C, 0xF4ECD8], "magma": [1, 25, 0xE0501C, 0xFFC060], "gold": [1, 100, 0xD8A030, 0xFFF0A0] };

    /**
     * The pictures (7 October, the user's: more detailed art, art/devilsarcade/games): BRICKS a sheet of bricks
     * at twice their size, a row a kind (basalt, obsidian, bone, magma, gold), a column for each hit taken;
     * PADDLE three 32-pixel slices (the left end, a middle that repeats, the right end), 28 high; DROPS the
     * power-ups, 40 x 40 each (wide, multi, fire, slow, life). Drawn as before until they load.
     */
    private static readonly BRICKS: string = "arcade/breakout/bricks.png";

    private static readonly PADDLE: string = "arcade/breakout/paddle.png";

    private static readonly DROPS: string = "arcade/breakout/drops.png";

    private static readonly KIND_ROW: any = { "basalt": 0, "obsidian": 1, "bone": 2, "magma": 3, "gold": 4 };

    private static readonly DROP_COL: any = { "wide": 0, "multi": 1, "fire": 2, "slow": 3, "life": 4 };
    private _bricks: any[];
    private _brickArt: boolean;
    private _balls: any[];
    private _drops: any[];
    private _parts: any[];
    private _paddleX: number;
    private _paddleW: number;
    private _wideT: int;
    private _fireT: int;
    private _slowT: int;
    private _lives: int;
    private _score: int;
    private _level: int;
    private _step: int;
    private _held: boolean;
    private _mouseUsed: boolean;
    private _layer: Shape;
    /** The paddle (redrawn when its width, fire or picture change: `_paddleKey`), and the drops' and glows' pool. */
    private _paddleShape: Shape;
    private _paddleKey: string;
    private _pooled: Sprite;
    private _ballLayer: Sprite;
    private _hudScore: TextField;
    private _hudInfo: TextField;
    private _hudRival: TextField;
    private _versus: boolean;
    private _rivalName: string;
    private _rivalScore: int;
    private _countdown: int;
    private _sentAt: int;
    private _doneSent: boolean;
    private _wallDirty: boolean;
    private _wall: Shape;
    private _bricksBroken: int;
    /** Every brick broken this step: the next level once the balls have moved. */
    private _cleared: boolean;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._bricks = [];
        this._balls = [];
        this._drops = [];
        this._parts = [];
        this._paddleX = ArcadeGame.GW / 2;
        super.$ctor(win, mode, ctx);
        this._versus = mode == "versus";
        ArcadeArt.preload(["spurtz", "arcade/breakout/bg.jpg", BreakoutGame.BRICKS, BreakoutGame.PADDLE, BreakoutGame.DROPS]);
        let bg: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x120808, 0x2A0C08], [1, 1], [0, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        CasinoUI.picture(bg, "arcade/breakout/bg.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH);
        // (7 October, performance: the backdrop kept as a picture, not drawn again under everything that moves)
        bg.cacheAsBitmap = true;
        // the danger line (Versus: the wall must not come down past it)
        if (this._versus) {
            let line: Shape = as3.as(this.addChild(new Shape()), Shape);
            line.graphics.lineStyle(1, 16726554, 0.5);
            let x: number = 0;
            while (x < ArcadeGame.GW) {
                line.graphics.moveTo(x, BreakoutGame.DANGER_Y);
                line.graphics.lineTo(x + 10, BreakoutGame.DANGER_Y);
                x += 18;
            }
        }
        this._wall = as3.as(this.addChild(new Shape()), Shape);
        // (9 October, performance: the paddle, the drops and the balls' glows were drawn again every frame into the
        // one shape with the sparks, which spanned the paddle to the bricks, so all of that was drawn again every
        // frame; now the paddle is its own shape, redrawn only when it changes, the drops and glows shapes from
        // the pool, only moved)
        this._paddleShape = as3.as(this.addChild(new Shape()), Shape);
        this._pooled = as3.as(this.addChild(new Sprite()), Sprite);
        this._layer = as3.as(this.addChild(new Shape()), Shape);
        this._ballLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._hudScore = ArcadeGame.text(22, 16766346, 240, TextFormatAlign.LEFT);
        this._hudScore.x = 14;
        this._hudScore.y = 8;
        this._hudScore.name = "breakoutScore";
        this.hud.addChild(this._hudScore);
        this._hudInfo = ArcadeGame.text(14, 16777215, 300, TextFormatAlign.CENTER);
        this._hudInfo.x = (ArcadeGame.GW - 300) / 2;
        this._hudInfo.y = 12;
        this.hud.addChild(this._hudInfo);
        this._hudRival = ArcadeGame.text(15, 10148095, 240, TextFormatAlign.RIGHT);
        this._hudRival.x = ArcadeGame.GW - 254;
        this._hudRival.y = 12;
        this.hud.addChild(this._hudRival);
        if (this._versus) {
            let players: any[] = as3.as(ctx.players, Array);
            let you: int = ctx.you | 0;
            this._rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3a_rival");
            this._countdown = (Number(ctx.cd) / ArcadeGame.STEP) | 0;
        }
        this.topHud();
        this.makeLevel();
        this.newBall();
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this.updateHud();
        // (QoL #235: the games' words in the player's language)
        this.banner(this._countdown > 0 ? KEYS.Get("io_t3a_get_ready") : KEYS.Get("io_t3a_level_n", { "v1": 1 }), 16766346, 50);
    }

    // ---- the walls
    private makeLevel(): void {
        this._bricks = [];
        let rows: int = Math.min(8, 4 + this._level) | 0;
        let pattern: int = this.rint(4);
        let r: int = 0;
        while (r < rows) {
            let c: int = 0;
            while (c < BreakoutGame.COLS / 2) {
                // symmetric: decide the left half, mirror it
                let keep: boolean = true;
                if (pattern == 1) {
                    keep = (r + c) % 2 == 0 || r < 2;
                } else if (pattern == 2) {
                    keep = c >= r % 3;
                } else if (pattern == 3) {
                    keep = r % 3 != 2 || c % 2 == 0;
                }
                if (keep) {
                    let roll: number = this.rnd();
                    let tough: number = Math.min(0.5, 0.1 + this._level * 0.06);
                    let kind: string = roll < 0.07 ? "magma" : (roll < 0.1 ? "gold" : (roll < 0.1 + tough * 0.6 ? "obsidian" : (roll < 0.1 + tough ? "bone" : "basalt")));
                    if (r == 0 && kind == "basalt" && this._level > 2) {
                        kind = "obsidian";
                    }
                    this.addBrick(c, r, kind);
                    this.addBrick((BreakoutGame.COLS - 1 - c) | 0, r, kind);
                }
                c++;
            }
            r++;
        }
        this._wallDirty = true;
    }

    private addBrick(c: int, r: int, kind: string): void {
        this._bricks.push({ "c": c, "r": r, "x": BreakoutGame.X0 + c * (BreakoutGame.BW + BreakoutGame.GAP), "y": BreakoutGame.Y0 + r * (BreakoutGame.BH + BreakoutGame.GAP), "kind": kind, "hp": BreakoutGame.KINDS[kind][0] | 0 });
    }

    /** Versus: the wall comes down a row, a new one on top. */
    private pushRows(n: int): void {
        let b: any = null;
        while (n-- > 0) {
            for (b of as3.values(this._bricks)) {
                b.r++;
                b.y += BreakoutGame.BH + BreakoutGame.GAP;
            }
            let c: int = 0;
            while (c < BreakoutGame.COLS) {
                if (Math.random() < 0.8) {
                    this._bricks.push({ "c": c, "r": 0, "x": BreakoutGame.X0 + c * (BreakoutGame.BW + BreakoutGame.GAP), "y": BreakoutGame.Y0, "kind": Math.random() < 0.15 ? "obsidian" : "basalt", "hp": 1 });
                }
                c++;
            }
        }
        this._wallDirty = true;
        // (a ball inside the new row: pushed below it)
        for (let ball of as3.values(this._balls)) {
            for (b of as3.values(this._bricks)) {
                if (ball.x > b.x - BreakoutGame.BALL_R && ball.x < b.x + BreakoutGame.BW + BreakoutGame.BALL_R && ball.y > b.y - BreakoutGame.BALL_R && ball.y < b.y + BreakoutGame.BH + BreakoutGame.BALL_R) {
                    ball.y = b.y + BreakoutGame.BH + BreakoutGame.BALL_R + 1;
                    ball.vy = Math.abs(Number(ball.vy));
                }
            }
        }
    }

    // ---- balls
    private speed(): number {
        return Math.min(9, 5 + this._level * 0.45 + this._step / 3600 * 0.3) * (this._slowT > 0 ? 0.65 : 1);
    }

    private newBall(): void {
        this._balls = [{ "x": this._paddleX, "y": BreakoutGame.PADDLE_Y - BreakoutGame.BALL_R - 8, "vx": 0, "vy": 0, "spin": 0 }];
        this._held = true;
    }

    private launch(): void {
        if (!this._held || this._countdown > 0) {
            return;
        }
        this._held = false;
        let s: number = this.speed();
        let a: number = (-90 + (Math.random() * 40 - 20)) * Math.PI / 180;
        this._balls[0].vx = Math.cos(a) * s;
        this._balls[0].vy = Math.sin(a) * s;
    }

    private onDown(e: MouseEvent): void {
        this._mouseUsed = true;
        this.launch();
    }

    private onMove(e: MouseEvent): void {
        this._mouseUsed = true;
        this._paddleX = Math.max(this._paddleW / 2, Math.min(ArcadeGame.GW - this._paddleW / 2, this.mouseX));
    }

    public override keyDown(code: int): void {
        super.keyDown(code);
        if (code == Keyboard.SPACE || code == Keyboard.UP || code == 87) {
            this.launch();
        }
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            if (--this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_go"), 16747050, 30);
            }
            return;
        }
        if (this._doneSent) {
            return;
        }
        this._step++;
        // the paddle (keys)
        let kx: number = 0;
        if (this.key(Keyboard.LEFT) || this.key(65)) {
            kx -= 9;
        }
        if (this.key(Keyboard.RIGHT) || this.key(68)) {
            kx += 9;
        }
        if (kx != 0) {
            this._paddleX = Math.max(this._paddleW / 2, Math.min(ArcadeGame.GW - this._paddleW / 2, this._paddleX + kx));
        }
        if (this._wideT > 0 && --this._wideT == 0) {
            this._paddleW = 96;
        }
        if (this._fireT > 0) {
            this._fireT--;
        }
        if (this._slowT > 0) {
            this._slowT--;
        }
        if (this._held) {
            this._balls[0].x = this._paddleX;
            this._balls[0].y = BreakoutGame.PADDLE_Y - BreakoutGame.BALL_R - 8;
        } else {
            this.moveBalls();
        }
        // falling power-ups
        let keep: any[] = [];
        for (let d of as3.values(this._drops)) {
            d.y += 2.4;
            if (d.y > BreakoutGame.PADDLE_Y - 10 && d.y < BreakoutGame.PADDLE_Y + 14 && Math.abs(d.x - this._paddleX) < this._paddleW / 2 + 12) {
                this.catchDrop(String(d.kind));
                continue;
            }
            if (d.y < ArcadeGame.GH + 20) {
                keep.push(d);
            }
        }
        this._drops = keep;
        if (this._versus) {
            if (this._step - this._sentAt >= 30) {
                this._sentAt = this._step;
                ArcadeNet.send({ "t": "s", "score": this._score });
            }
            // the wall down to the danger line, or time: done
            let low: number = 0;
            for (let b of as3.values(this._bricks)) {
                low = Math.max(low, Number(b.y + BreakoutGame.BH));
            }
            if (low >= BreakoutGame.DANGER_Y) {
                this.end(KEYS.Get("io_t3a_bo_wall_down"));
                return;
            }
            if (this._step >= BreakoutGame.VERSUS_STEPS) {
                this.end(KEYS.Get("io_t3a_bo_time"));
                return;
            }
        }
        if (this._step % 15 == 0) {
            this.updateHud();
        }
    }

    private moveBalls(): void {
        let alive: any[] = [];
        for (let ball of as3.values(this._balls)) {
            let sub: int = 3;
            let k: int = 0;
            let lost: boolean = false;
            while (k < sub) {
                ball.x += ball.vx / sub;
                ball.y += ball.vy / sub;
                if (ball.x < BreakoutGame.BALL_R) {
                    ball.x = BreakoutGame.BALL_R;
                    ball.vx = Math.abs(Number(ball.vx));
                }
                if (ball.x > ArcadeGame.GW - BreakoutGame.BALL_R) {
                    ball.x = ArcadeGame.GW - BreakoutGame.BALL_R;
                    ball.vx = -Math.abs(Number(ball.vx));
                }
                if (ball.y < 44 + BreakoutGame.BALL_R) {
                    ball.y = 44 + BreakoutGame.BALL_R;
                    ball.vy = Math.abs(Number(ball.vy));
                }
                // the paddle: the angle by where it hits
                if (ball.vy > 0 && ball.y + BreakoutGame.BALL_R >= BreakoutGame.PADDLE_Y - 7 && ball.y < BreakoutGame.PADDLE_Y + 6 && Math.abs(ball.x - this._paddleX) <= this._paddleW / 2 + BreakoutGame.BALL_R * 0.6) {
                    let off: number = (ball.x - this._paddleX) / (this._paddleW / 2);
                    let a: number = (-90 + Math.max(-1, Math.min(1, off)) * 62) * Math.PI / 180;
                    let s: number = this.speed();
                    ball.vx = Math.cos(a) * s;
                    ball.vy = Math.sin(a) * s;
                    ball.y = BreakoutGame.PADDLE_Y - 7 - BreakoutGame.BALL_R;
                    SOUNDS.Play("click1", 0.4);
                }
                this.hitBricks(ball);
                if (ball.y > ArcadeGame.GH + BreakoutGame.BALL_R) {
                    lost = true;
                    break;
                }
                k++;
            }
            ball.spin += ball.vx * 2;
            if (!lost) {
                alive.push(ball);
            }
        }
        this._balls = alive;
        if (this._cleared) {
            this._cleared = false;
            this._score = (this._score + 500 * this._level) | 0;
            this._level++;
            this.banner(KEYS.Get("io_t3a_level_n", { "v1": this._level }), 10289002, 60);
            this.makeLevel();
            this._drops = [];
            this.newBall();
            this.updateHud();
            return;
        }
        if (!alive.length) {
            this._lives--;
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0));
            if (this._lives <= 0) {
                this.end(KEYS.Get("io_t3a_bo_out"));
                return;
            }
            this.banner(KEYS.Get(this._lives == 1 ? "io_t3a_bo_life_left" : "io_t3a_bo_lives_left", { "v1": this._lives }), 16747114, 50);
            this._paddleW = 96;
            this._wideT = 0;
            this._fireT = 0;
            this.newBall();
            this.updateHud();
        }
    }

    private hitBricks(ball: any): void {
        let i: int = 0;
        while (i < this._bricks.length) {
            let b: any = this._bricks[i];
            if (ball.x + BreakoutGame.BALL_R > b.x && ball.x - BreakoutGame.BALL_R < b.x + BreakoutGame.BW && ball.y + BreakoutGame.BALL_R > b.y && ball.y - BreakoutGame.BALL_R < b.y + BreakoutGame.BH) {
                if (this._fireT <= 0) {
                    // bounce off the side it came through (the smaller overlap)
                    let ox: number = Math.min(ball.x + BreakoutGame.BALL_R - b.x, b.x + BreakoutGame.BW - (ball.x - BreakoutGame.BALL_R));
                    let oy: number = Math.min(ball.y + BreakoutGame.BALL_R - b.y, b.y + BreakoutGame.BH - (ball.y - BreakoutGame.BALL_R));
                    if (ox < oy) {
                        ball.vx = ball.x < b.x + BreakoutGame.BW / 2 ? -Math.abs(Number(ball.vx)) : Math.abs(Number(ball.vx));
                    } else {
                        ball.vy = ball.y < b.y + BreakoutGame.BH / 2 ? -Math.abs(Number(ball.vy)) : Math.abs(Number(ball.vy));
                    }
                }
                this.damage(b, this._fireT > 0 ? 99 : 1);
                if (this._fireT <= 0) {
                    return;
                }
            }
            i++;
        }
    }

    private damage(b: any, n: int): void {
        if (this._bricks.indexOf(b) < 0) {
            return;
        }
        b.hp -= n;
        this._wallDirty = true;
        if (b.hp > 0) {
            SOUNDS.Play("click1", 0.3);
            return;
        }
        this._bricks.splice(this._bricks.indexOf(b), 1);
        this._bricksBroken++;
        let pts: int = ((BreakoutGame.KINDS[b.kind][1] | 0) * (1 + (this._level - 1) * 0.25)) | 0;
        this._score += pts;
        this.burst(Number(b.x + BreakoutGame.BW / 2), Number(b.y + BreakoutGame.BH / 2), BreakoutGame.KINDS[b.kind][2] >>> 0, b.kind == "magma" ? 22 : 10);
        SOUNDS.Play(b.kind == "gold" ? "chaching" : "inf_buildingplace", 0.35);
        if (b.kind == "magma") {
            // it bursts: its neighbours take a hit; in Versus a row onto the rival's wall
            for (let o of as3.values(this._bricks.concat())) {
                if (Math.abs(o.c - b.c) <= 1 && Math.abs(o.r - b.r) <= 1) {
                    this.damage(o, 1);
                }
            }
            if (this._versus) {
                ArcadeNet.send({ "t": "ev", "k": "rows", "n": 1 });
                this.banner(KEYS.Get("io_t3a_bo_row_onto", { "v1": this._rivalName }), 10148095, 40);
            }
        }
        // something to catch?
        if (Math.random() < 0.11) {
            let r: number = Math.random();
            this._drops.push({ "x": b.x + BreakoutGame.BW / 2, "y": b.y + BreakoutGame.BH / 2, "kind": r < 0.3 ? "wide" : (r < 0.55 ? "multi" : (r < 0.75 ? "fire" : (r < 0.93 ? "slow" : "life"))) });
        }
        if (!this._bricks.length) {
            // (the next level after the balls have moved: made here, in the middle of moving them, the old
            // balls came back over the new ball; 9 October)
            this._cleared = true;
        }
    }

    private catchDrop(kind: string): void {
        SOUNDS.Play("chaching", 0.5);
        if (kind == "wide") {
            this._paddleW = 150;
            this._wideT = (15 * 60) | 0;
        } else if (kind == "multi" && !this._held && this._balls.length) {
            let b: any = this._balls[0];
            let s: number = this.speed();
            for (const $value of as3.values([-0.5, 0.5])) {
                let a: number = Number($value);
                let ang: number = Math.atan2(Number(b.vy), Number(b.vx)) + a;
                let nvx: number = Math.cos(ang) * s;
                let nvy: number = Math.sin(ang) * s;
                // (never nearly flat: a ball at a shallow angle turned 0.5 more went side to side at one height for
                // a minute; 9 October)
                if (Math.abs(nvy) < s * 0.35) {
                    nvy = (nvy > 0 ? 1 : -1) * s * 0.35;
                    nvx = (nvx >= 0 ? 1 : -1) * Math.sqrt(s * s - nvy * nvy);
                }
                this._balls.push({ "x": b.x, "y": b.y, "vx": nvx, "vy": nvy, "spin": 0 });
            }
        } else if (kind == "fire") {
            this._fireT = (8 * 60) | 0;
        } else if (kind == "slow") {
            this._slowT = (8 * 60) | 0;
            for (let bl of as3.values(this._balls)) {
                bl.vx *= 0.65;
                bl.vy *= 0.65;
            }
        } else if (kind == "life") {
            this._lives = Math.min(5, this._lives + 1) | 0;
        }
        this.banner(KEYS.Get(kind == "wide" ? "io_t3a_bo_wide" : (kind == "multi" ? "io_t3a_bo_multi" : (kind == "fire" ? "io_t3a_bo_fire" : (kind == "slow" ? "io_t3a_bo_slow" : "io_t3a_plus_life")))), 16766346, 30);
        this.updateHud();
    }

    private burst(x: number, y: number, color: uint, n: int): void {
        let i: int = 0;
        while (i < n) {
            let a: number = Math.random() * Math.PI * 2;
            let v: number = 1 + Math.random() * 3;
            this._parts.push({ "x": x, "y": y, "vx": Math.cos(a) * v, "vy": Math.sin(a) * v - 1, "c": color, "life": 20 + ((Math.random() * 15) | 0) });
            i++;
        }
    }

    private updateHud(): void {
        this._hudScore.text = CasinoUI.number(this._score);
        let hearts: string = "";
        let i: int = 0;
        while (i < this._lives) {
            hearts += "♥";
            i++;
        }
        let t: string = "";
        if (this._versus) {
            let left: int = Math.max(0, Math.ceil((BreakoutGame.VERSUS_STEPS - this._step) / 60)) | 0;
            t = "  ·  " + ((left / 60) | 0) + ":" + (left % 60 < 10 ? "0" : "") + left % 60;
        }
        this._hudInfo.text = KEYS.Get("io_t3a_hud_level", { "v1": this._level }) + "   " + hearts + t;
        this._hudRival.text = this._versus ? this._rivalName + ": " + CasinoUI.number(this._rivalScore) : "";
    }

    /** A cell of a sheet drawn into g at (x, y), w x h on screen (the sheet's cells cw x ch). */
    private static cell(g: any, sheet: BitmapData, col: int, row: int, cw: number, ch: number, x: number, y: number, w: number, h: number): void {
        let m: Matrix = new Matrix();
        m.scale(w / cw, h / ch);
        m.translate(x - col * w, y - row * h);
        g.beginBitmapFill(sheet, m, false, true);
        g.drawRect(x, y, w, h);
        g.endFill();
    }

    protected override draw(alpha: number): void {
        let bricksArt: BitmapData = ArcadeArt.picture(BreakoutGame.BRICKS);
        if (bricksArt && !this._brickArt) {
            this._brickArt = true;
            this._wallDirty = true;
        }
        if (this._wallDirty && bricksArt) {
            this._wallDirty = false;
            let wg: any = this._wall.graphics;
            wg.clear();
            for (let wb of as3.values(this._bricks)) {
                let hits: int = Math.max(0, Math.min(2, (BreakoutGame.KINDS[wb.kind][0] | 0) - (wb.hp | 0))) | 0;
                BreakoutGame.cell(wg, bricksArt, hits, BreakoutGame.KIND_ROW[wb.kind] | 0, 108, 36, Number(wb.x), Number(wb.y), BreakoutGame.BW, BreakoutGame.BH);
            }
            if (!this._wall.filters.length) {
                this._wall.filters = [new GlowFilter(0x000000, 0.5, 4, 4, 1, 1)];
            }
        }
        if (this._wallDirty) {
            this._wallDirty = false;
            let g: any = this._wall.graphics;
            g.clear();
            for (let b of as3.values(this._bricks)) {
                let k: any[] = as3.cast(BreakoutGame.KINDS[b.kind], Array);
                let full: int = k[0] | 0;
                let m: Matrix = new Matrix();
                m.createGradientBox(BreakoutGame.BW, BreakoutGame.BH, Math.PI / 2, Number(b.x), Number(b.y));
                g.lineStyle(1, 0x000000, 0.8);
                g.beginGradientFill(GradientType.LINEAR, [k[3] >>> 0, k[2] >>> 0], [1, 1], [0, 200], m);
                g.drawRoundRect(b.x, b.y, BreakoutGame.BW, BreakoutGame.BH, 5, 5);
                g.endFill();
                // cracks for each hit taken
                if (b.hp < full) {
                    g.lineStyle(1.5, 0x000000, 0.7);
                    g.moveTo(b.x + 8, b.y + 3);
                    g.lineTo(b.x + 18, b.y + 10);
                    g.lineTo(b.x + 14, b.y + BreakoutGame.BH - 3);
                    if (full - b.hp > 1) {
                        g.moveTo(b.x + BreakoutGame.BW - 10, b.y + 2);
                        g.lineTo(b.x + BreakoutGame.BW - 20, b.y + 9);
                        g.lineTo(b.x + BreakoutGame.BW - 12, b.y + BreakoutGame.BH - 2);
                    }
                }
                if (b.kind == "magma") {
                    g.lineStyle(1, 0xFFF0A0, 0.9);
                    g.moveTo(b.x + 6, b.y + BreakoutGame.BH / 2);
                    g.curveTo(b.x + BreakoutGame.BW / 2, b.y + 2, b.x + BreakoutGame.BW - 6, b.y + BreakoutGame.BH / 2);
                }
            }
            if (!this._wall.filters.length) {
                this._wall.filters = [new GlowFilter(0x000000, 0.5, 4, 4, 1, 1)];
            }
        }
        let gr: any = this._layer.graphics;
        gr.clear();
        this.poolBegin();
        // the paddle: obsidian with a molten edge (its picture: two ends and a middle as long as it needs), drawn at
        // 0,0 in its own shape and only moved
        let pad: BitmapData = ArcadeArt.picture(BreakoutGame.PADDLE);
        let px0: number = this._paddleX - this._paddleW / 2;
        let pkey: string = this._paddleW + "/" + (this._fireT > 0) + "/" + Boolean(pad);
        if (pkey != this._paddleKey) {
            this._paddleKey = pkey;
            let pg: any = this._paddleShape.graphics;
            pg.clear();
            if (pad) {
                BreakoutGame.cell(pg, pad, 0, 0, 32, 28, 0, 0, 16, 14);
                // (the middle slice, x 32-64 of the picture, repeated: drawn in 16-pixel pieces from it)
                let mx: number = 16;
                while (mx < this._paddleW - 16) {
                    let mw: number = Math.min(16, this._paddleW - 16 - mx);
                    let m2: Matrix = new Matrix();
                    m2.scale(0.5, 0.5);
                    m2.translate(mx - 16, 0);
                    pg.beginBitmapFill(pad, m2, false, true);
                    pg.drawRect(mx, 0, mw, 14);
                    pg.endFill();
                    mx += 16;
                }
                BreakoutGame.cell(pg, pad, 2, 0, 32, 28, this._paddleW - 16, 0, 16, 14);
                if (this._fireT > 0) {
                    pg.lineStyle(2, 0xFFE040, 0.9);
                    pg.drawRoundRect(0, 0, this._paddleW, 14, 12, 12);
                    pg.lineStyle(0, 0, 0);
                }
            } else {
                let pm: Matrix = new Matrix();
                pm.createGradientBox(this._paddleW, 14, Math.PI / 2, 0, 0);
                pg.lineStyle(2, this._fireT > 0 ? 0xFFE040 : 0xFF6A1A, 1);
                pg.beginGradientFill(GradientType.LINEAR, [0x5A4A6A, 0x120C14], [1, 1], [0, 255], pm);
                pg.drawRoundRect(0, 0, this._paddleW, 14, 12, 12);
                pg.endFill();
            }
        }
        this._paddleShape.x = px0;
        this._paddleShape.y = BreakoutGame.PADDLE_Y - 7;
        // falling power-ups
        let dropArt: BitmapData = ArcadeArt.picture(BreakoutGame.DROPS);
        for (let d of as3.values(this._drops)) {
            this.poolShape(this._pooled, (dropArt ? "drop:" : "dropc:") + d.kind, BreakoutGame.dropDrawer(String(d.kind), dropArt), Number(d.x), Number(d.y));
        }
        // sparks
        let keep: any[] = [];
        for (let p of as3.values(this._parts)) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life--;
            if (p.life > 0) {
                keep.push(p);
                // (each its own little shape from the pool: drawn in the one shape, they made it as big as from
                // the bricks to the paddle, all of it drawn again every frame; 9 October)
                this.poolShape(this._pooled, "spark:" + p.c, BreakoutGame.sparkDrawer(p.c >>> 0), Number(p.x), Number(p.y)).alpha = Math.min(1, p.life / 12);
            }
        }
        this._parts = keep;
        // the balls: Spurtz
        while (this._ballLayer.numChildren > this._balls.length) {
            this._ballLayer.removeChildAt(0);
        }
        let i: int = 0;
        while (i < this._balls.length) {
            let ball: any = this._balls[i];
            let bm: Bitmap = i < this._ballLayer.numChildren ? as3.as(this._ballLayer.getChildAt(i), Bitmap) : null;
            if (!bm) {
                bm = new Bitmap();
                bm.smoothing = true;
                this._ballLayer.addChild(bm);
            }
            // its glow: a soft disc under it (7 October, performance: a filter on the balls' layer, set anew every
            // frame, rebuilt the layer round all the balls every frame)
            this.poolShape(this._pooled, this._fireT > 0 ? "glow:fire" : "glow", BreakoutGame.glowDrawer(this._fireT > 0), Number(ball.x), Number(ball.y));
            let deg: number = Number(ball.vx == 0 && ball.vy == 0 ? 90 : Math.atan2(Number(ball.vy), Number(ball.vx)) * 180 / Math.PI);
            let f: BitmapData = ArcadeArt.frame("spurtz", deg, (1 + ((this._step / 6) | 0) % 2) | 0);
            if (f) {
                bm.bitmapData = f;
                bm.smoothing = true;
                bm.x = ball.x - f.width / 2;
                bm.y = ball.y - f.height / 2 - 2;
            }
            i++;
        }
        this.poolEnd();
    }

    /** A falling power-up, drawn once at 0,0 (its picture, or a coloured disc before the picture loads). */
    private static dropDrawer(kind: string, art: BitmapData): Function {
        return (g: any): void => {
            if (art) {
                BreakoutGame.cell(g, art, BreakoutGame.DROP_COL[kind] | 0, 0, 40, 40, -11, -11, 22, 22);
                return;
            }
            let col: uint = (kind == "wide" ? 0x6AB0FF : (kind == "multi" ? 0xFFD040 : (kind == "fire" ? 0xFF4A1A : (kind == "slow" ? 0x9CFF6A : 0xFF6AC0)))) >>> 0;
            g.lineStyle(2, 0xFFFFFF, 0.9);
            g.beginFill(col, 1);
            g.drawCircle(0, 0, 9);
            g.endFill();
        };
    }

    /** A spark: a 3-pixel square, drawn once at 0,0. */
    private static sparkDrawer(c: uint): Function {
        return (g: any): void => {
            g.beginFill(c, 1);
            g.drawRect(-1.5, -1.5, 3, 3);
            g.endFill();
        };
    }

    /** A ball's glow: a soft disc under it, drawn once at 0,0. */
    private static glowDrawer(fire: boolean): Function {
        return (g: any): void => {
            let glowR: number = fire ? 20 : 14;
            let gm: Matrix = new Matrix();
            gm.createGradientBox(glowR * 2, glowR * 2, 0, -glowR, -glowR);
            g.lineStyle(0, 0, 0);
            g.beginGradientFill(GradientType.RADIAL, fire ? [0xFFE040, 0xFFE040] : [0xFF6A1A, 0xFF6A1A], [fire ? 0.8 : 0.5, 0], [0, 255], gm);
            g.drawCircle(0, 0, glowR);
            g.endFill();
        };
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s") {
            this._rivalScore = msg.score | 0;
            this.updateHud();
        } else if (t == "ev" && msg.k == "rows" && !this._doneSent) {
            this.pushRows(Math.max(1, Math.min(3, msg.n | 0)) | 0);
            this.banner(KEYS.Get("io_t3a_bo_pushed", { "v1": this._rivalName }), 16747114, 40);
        } else if (t == "done") {
            this.banner(KEYS.Get("io_t3a_bo_rival_out", { "v1": this._rivalName, "v2": CasinoUI.number(msg.score | 0) }), 10148095, 60);
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": ArcadeGame.ioVsLine(CasinoUI.number(scores[you] | 0), this._rivalName, CasinoUI.number(Math.max(0, scores[1 - you] | 0)), msg.reason == "left", won), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        }
    }

    private end(why: string): void {
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this._score });
                this.banner(why + " " + KEYS.Get("io_t3a_waiting_for", { "v1": this._rivalName }), 16766346, 100000);
                this.leaveButton();
                this.updateHud();
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_game_over"), "score": this._score, "score2": this._level, "line": KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this._score) }) + "\n" + KEYS.Get("io_t3a_bo_line", { "v1": this._level, "v2": this._bricksBroken }) });
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
    }
}
