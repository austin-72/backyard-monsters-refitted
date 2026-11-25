import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, GLOBAL, IoQuests, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Magma Stack (the Devil's Arcade, 7 October, the user's pick): falling blocks in a pit 10 wide and
 * 20 deep. Seven shapes of four blocks (bone, coal, sulfur, magma, obsidian, brimstone, blood), dealt seven at a
 * time in a shuffled bag from the run's seed, so in Versus both players get the same ones. Fill a row to clear
 * it: 100, 300, 500 or 800 points for one to four rows at once, times the level; the level goes up every ten
 * rows and the blocks fall faster. Down drops faster (a point a row), Space drops at once (two a row), C holds
 * one shape for later.
 *
 * Versus (relay.ts, "survive"): two rows cleared at once push one row of junk up into the rival's pit, three
 * push two, four push four; junk coming at the player is cancelled first by rows the player clears. The first
 * to top out loses. The rival's pit is shown small at the side (its columns' heights, sent with the score).
 */
export class StackGame extends ArcadeGame {
    static {
        as3.fields(this, { _pit: null, _bag: null, _next: null, _piece: -1, _rot: 0, _px: 3, _py: 0, _cells: null, _hold: -1, _held: false, _fall: 0, _lockT: 0, _moves: 0, _score: 0, _lines: 0, _level: 1, _dasDir: 0, _dasT: 0, _clearing: null, _clearT: 0, _over: false, _steps: 0, _dirty: true, _board: null, _live: null, _ghost: null, _ghostKey: "", _liveKey: "", _rivalKey: "", _junkShown: -1, _side: null, _hudScore: null, _hudInfo: null, _floats: null, _versus: false, _countdown: 0, _incoming: 0, _rivalName: "", _rivalScore: 0, _rivalH: null, _rivalShape: null, _rivalText: null, _sentAt: 0, _doneSent: false, _junkMeter: null });
    }

    private static readonly COLS: int = 10;

    private static readonly ROWS: int = 20;

    private static readonly C: int = 19;

    private static readonly PX: int = 265;

    private static readonly PY: int = 22;

    /** The shapes (rotation 0, cells x,y in a 4 x 4 box) and their colours: I O T S Z J L. */
    private static readonly SHAPES: any[] = [[[0, 1], [1, 1], [2, 1], [3, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]]];

    /** The box each shape turns in (I and O in 4, the rest in 3). */
    private static readonly BOX: any[] = [4, 4, 3, 3, 3, 3, 3];

    private static readonly COLORS: any[] = [0xFF7A1A, 0xFFD040, 0x9A6AD8, 0x7AC84A, 0xE0303A, 0x5A7AC0, 0xE8DCC0, 0x5A4A4A];

    private static readonly NAMES: any[] = ["Magma", "Sulfur", "Obsidian", "Brimstone", "Blood", "Coal", "Bone", "Junk"];

    /** Steps a row takes to fall at each level (60 steps a second). */
    private static readonly GRAVITY: any[] = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2];

    private static readonly LOCK: int = 30;

    private static readonly DAS: int = 10;

    private static readonly ARR: int = 2;
    /** The pit: ROWS x COLS of -1 (empty) or a colour index. */
    private _pit: any[];
    private _bag: any[];
    private _next: any[];
    private _piece: int;
    private _rot: int;
    private _px: int;
    private _py: int;
    private _cells: any[];
    private _hold: int;
    private _held: boolean;
    private _fall: int;
    private _lockT: int;
    private _moves: int;
    private _score: int;
    private _lines: int;
    private _level: int;
    private _dasDir: int;
    private _dasT: int;
    private _clearing: any[];
    private _clearT: int;
    private _over: boolean;
    private _steps: int;
    private _dirty: boolean;
    private _board: Shape;
    private _live: Shape;
    /**
     * Where the shape would land, drawn again only when that changes; the shape itself (in _live) is drawn round
     * its own corner and moved as it falls (7 October, performance: both in one shape drawn every frame made the
     * renderer redraw the whole column between them).
     */
    private _ghost: Shape;
    private _ghostKey: string;
    private _liveKey: string;
    private _rivalKey: string;
    private _junkShown: int;
    private _side: Shape;
    private _hudScore: TextField;
    private _hudInfo: TextField;
    private _floats: any[];
    // ---- Versus
    private _versus: boolean;
    private _countdown: int;
    private _incoming: int;
    private _rivalName: string;
    private _rivalScore: int;
    private _rivalH: any[];
    private _rivalShape: Shape;
    private _rivalText: TextField;
    private _sentAt: int;
    private _doneSent: boolean;
    private _junkMeter: Shape;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._pit = [];
        this._bag = [];
        this._next = [];
        this._floats = [];
        this._rivalH = [];
        super.$ctor(win, mode, ctx);
        this._versus = mode == "versus";
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1A0A10, 0x2C0E08, 0x140604], [1, 1, 1], [0, 170, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        // embers drifting up the back wall (drawn once)
        let k: int = 0;
        while (k < 40) {
            let ex: number = (k * 97) % ArcadeGame.GW;
            let ey: number = (k * 53) % ArcadeGame.GH;
            bg.graphics.beginFill(16747050, 0.08 + (k % 5) * 0.03);
            bg.graphics.drawCircle(ex, ey, 1.5 + k % 3);
            bg.graphics.endFill();
            k++;
        }
        // the pit's frame
        bg.graphics.lineStyle(4, 3811882, 1);
        bg.graphics.beginFill(787976, 0.92);
        bg.graphics.drawRect(StackGame.PX - 4, StackGame.PY - 4, StackGame.COLS * StackGame.C + 8, StackGame.ROWS * StackGame.C + 8);
        bg.graphics.endFill();
        bg.graphics.lineStyle(2, 16734746, 0.9);
        bg.graphics.drawRect(StackGame.PX - 2, StackGame.PY - 2, StackGame.COLS * StackGame.C + 4, StackGame.ROWS * StackGame.C + 4);
        bg.graphics.lineStyle(1, 2759194, 1);
        let gx: int = 1;
        while (gx < StackGame.COLS) {
            bg.graphics.moveTo(StackGame.PX + gx * StackGame.C, StackGame.PY);
            bg.graphics.lineTo(StackGame.PX + gx * StackGame.C, StackGame.PY + StackGame.ROWS * StackGame.C);
            gx++;
        }
        let gy: int = 1;
        while (gy < StackGame.ROWS) {
            bg.graphics.moveTo(StackGame.PX, StackGame.PY + gy * StackGame.C);
            bg.graphics.lineTo(StackGame.PX + StackGame.COLS * StackGame.C, StackGame.PY + gy * StackGame.C);
            gy++;
        }
        // the side boxes: HOLD on the left, NEXT on the right
        // (QoL #235: the games' words in the player's language)
        this.box(bg, 140, StackGame.PY, 100, 84, KEYS.Get("io_t3a_st_hold"));
        this.box(bg, StackGame.PX + StackGame.COLS * StackGame.C + 24, StackGame.PY, 100, 220, KEYS.Get("io_t3a_st_next"));
        bg.cacheAsBitmap = true;
        // the painted wall, well and boxes (arcade/stack/bg.jpg, art/uikit/minigames.py; 11 October), over the
        // drawn ones once loaded; the blocks' pictures (block_<n>.png) start loading
        let art: Sprite = new Sprite();
        this.addChildAt(art, this.getChildIndex(bg) + 1);
        CasinoUI.picture(art, "arcade/stack/bg.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH, (b: any): void => {
            bg.visible = false;
        });
        for (let bi: int = 0; bi < StackGame.COLORS.length; bi++) {
            ArcadeArt.picture("arcade/stack/block_" + bi + ".png");
        }
        this._board = as3.as(this.addChild(new Shape()), Shape);
        this._ghost = as3.as(this.addChild(new Shape()), Shape);
        this._live = as3.as(this.addChild(new Shape()), Shape);
        this._side = as3.as(this.addChild(new Shape()), Shape);
        this._junkMeter = as3.as(this.addChild(new Shape()), Shape);
        this._hudScore = ArcadeGame.text(24, 16766346, 150, TextFormatAlign.CENTER);
        this._hudScore.x = 115;
        this._hudScore.y = 130;
        this._hudScore.name = "stackScore";
        this.hud.addChild(this._hudScore);
        this._hudInfo = ArcadeGame.text(13, 15655632, 150, TextFormatAlign.CENTER);
        this._hudInfo.x = 115;
        this._hudInfo.y = 166;
        this._hudInfo.multiline = true;
        this._hudInfo.height = 80;
        this.hud.addChild(this._hudInfo);
        let keysHelp: TextField = ArcadeGame.text(10, 12101784, 150, TextFormatAlign.CENTER);
        keysHelp.multiline = true;
        keysHelp.height = 90;
        keysHelp.x = 115;
        keysHelp.y = 300;
        keysHelp.text = [KEYS.Get("io_t3a_st_help1"), KEYS.Get("io_t3a_st_help2"), KEYS.Get("io_t3a_st_help3"), KEYS.Get("io_t3a_st_help4"), KEYS.Get("io_t3a_st_help5")].join("\n");
        GLOBAL.ioFitText(keysHelp, 8);
        this.hud.addChild(keysHelp);
        if (this._versus) {
            let players: any[] = as3.as(ctx.players, Array);
            let you: int = ctx.you | 0;
            this._rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3a_rival");
            this._countdown = (Number(ctx.cd) / ArcadeGame.STEP) | 0;
            this._rivalShape = as3.as(this.addChild(new Shape()), Shape);
            this._rivalText = ArcadeGame.text(11, 10148095, 110, TextFormatAlign.CENTER);
            this._rivalText.x = 595;
            this._rivalText.y = 252;
            this._rivalText.multiline = true;
            this._rivalText.height = 40;
            this.hud.addChild(this._rivalText);
            this._rivalH = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        this.topHud();
        // phones and tablets: buttons for the keys, either side of the pit (each holds its key: LEFT and RIGHT
        // repeat while held, as the arrows do)
        this.touchControls({ "buttons": [{ "label": "LEFT", "code": Keyboard.LEFT, "r": 32, "x": 52, "y": 330 }, { "label": "RIGHT", "code": Keyboard.RIGHT, "r": 32, "x": 172, "y": 330 }, { "label": "DOWN", "code": Keyboard.DOWN, "r": 28, "x": 112, "y": 384 }, { "label": "TURN", "code": Keyboard.UP, "r": 34, "x": ArcadeGame.GW - 60, "y": 322 }, { "label": "DROP", "code": Keyboard.SPACE, "r": 30, "x": ArcadeGame.GW - 60, "y": 388 }, { "label": "HOLD", "code": 67, "r": 26, "x": ArcadeGame.GW - 140, "y": 388 }] });
        if (this.touch) {
            keysHelp.visible = false;
        }
        let y: int = 0;
        while (y < StackGame.ROWS) {
            let row: any[] = [];
            let x: int = 0;
            while (x < StackGame.COLS) {
                row.push(-1);
                x++;
            }
            this._pit.push(row);
            y++;
        }
        while (this._next.length < 4) {
            this._next.push(this.deal());
        }
        this.spawn();
        this.updateHud();
        if (this._countdown > 0) {
            this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 50);
        }
    }

    private box(bg: Shape, x: number, y: number, w: number, h: number, title: string): void {
        bg.graphics.lineStyle(2, 5909018, 1);
        bg.graphics.beginFill(787976, 0.85);
        bg.graphics.drawRoundRect(x, y, w, h, 12, 12);
        bg.graphics.endFill();
        let t: TextField = CasinoUI.label(title, 12, 16766346, true, w | 0, TextFormatAlign.CENTER, "Groboldov");
        t.x = x;
        t.y = y + 2;
        this.addChild(t);
    }

    /** The next shape from the bag (a fresh shuffled seven when it is empty). */
    private deal(): int {
        if (!this._bag.length) {
            let b: any[] = [0, 1, 2, 3, 4, 5, 6];
            let i: int = 6;
            while (i > 0) {
                let j: int = this.rint((i + 1) | 0);
                let t: int = b[i] | 0;
                b[i] = b[j];
                b[j] = t;
                i--;
            }
            this._bag = b;
        }
        return this._bag.shift() | 0;
    }

    /** A shape's cells turned `rot` quarter turns clockwise in its box. */
    private static cellsOf(piece: int, rot: int): any[] {
        let n: int = StackGame.BOX[piece] | 0;
        let out: any[] = [];
        for (let c of as3.values(StackGame.SHAPES[piece])) {
            let x: int = c[0] | 0;
            let y: int = c[1] | 0;
            let r: int = 0;
            while (r < (rot & 3)) {
                let nx: int = (n - 1 - y) | 0;
                y = x;
                x = nx;
                r++;
            }
            out.push([x, y]);
        }
        return out;
    }

    private fits(cells: any[], px: int, py: int): boolean {
        for (let c of as3.values(cells)) {
            let x: int = (px + c[0]) | 0;
            let y: int = (py + c[1]) | 0;
            if (x < 0 || x >= StackGame.COLS || y >= StackGame.ROWS) {
                return false;
            }
            if (y >= 0 && (this._pit[y][x] | 0) >= 0) {
                return false;
            }
        }
        return true;
    }

    private spawn(piece: int = -1): void {
        if (piece < 0) {
            piece = this._next.shift() | 0;
            this._next.push(this.deal());
        }
        this._piece = piece;
        this._rot = 0;
        this._cells = StackGame.cellsOf(piece, 0);
        this._px = piece == 1 ? 3 : 3;
        this._py = piece == 0 ? -1 : 0;
        this._fall = 0;
        this._lockT = 0;
        this._moves = 0;
        this._held = false;
        if (!this.fits(this._cells, this._px, this._py)) {
            this._py--;
            if (!this.fits(this._cells, this._px, this._py)) {
                this.topOut();
            }
        }
        this._dirty = true;
    }

    private gravity(): int {
        return StackGame.GRAVITY[Math.min(StackGame.GRAVITY.length - 1, this._level - 1)] | 0;
    }

    public override keyDown(code: int): void {
        let was: boolean = this.key(code);
        super.keyDown(code);
        if (was || this._over || this._countdown > 0 || this.ended || this._clearing) {
            return;
        }
        if (code == Keyboard.LEFT || code == 65) {
            this.shift(-1);
            this._dasDir = -1;
            this._dasT = 0;
        } else if (code == Keyboard.RIGHT || code == 68) {
            this.shift(1);
            this._dasDir = 1;
            this._dasT = 0;
        } else if (code == Keyboard.UP || code == 88 || code == 87) {
            this.turn(1);
        } else if (code == 90) {
            this.turn(-1);
        } else if (code == Keyboard.SPACE) {
            this.hardDrop();
        } else if (code == 67 || code == Keyboard.SHIFT) {
            this.holdPiece();
        }
    }

    public override keyUp(code: int): void {
        super.keyUp(code);
        if ((code == Keyboard.LEFT || code == 65) && this._dasDir < 0) {
            this._dasDir = this.key(Keyboard.RIGHT) || this.key(68) ? 1 : 0;
            this._dasT = 0;
        }
        if ((code == Keyboard.RIGHT || code == 68) && this._dasDir > 0) {
            this._dasDir = this.key(Keyboard.LEFT) || this.key(65) ? -1 : 0;
            this._dasT = 0;
        }
    }

    private shift(dx: int): boolean {
        if (this.fits(this._cells, (this._px + dx) | 0, this._py)) {
            this._px += dx;
            this.moved();
            return true;
        }
        return false;
    }

    /** A move on the ground gives the shape a little longer before it sets (15 times at most). */
    private moved(): void {
        if (this._moves < 15 && !this.fits(this._cells, this._px, (this._py + 1) | 0)) {
            this._lockT = 0;
            this._moves++;
        }
        this._dirty = true;
    }

    private turn(dir: int): void {
        if (this._piece == 1) {
            return;
        }
        let rot: int = (this._rot + dir + 4) & 3;
        let cells: any[] = StackGame.cellsOf(this._piece, rot);
        // the kicks: in place, a step aside, up a row, two steps aside
        for (let k of as3.values([[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]])) {
            if (this.fits(cells, (this._px + k[0]) | 0, (this._py + k[1]) | 0)) {
                this._rot = rot;
                this._cells = cells;
                this._px = (this._px + k[0]) | 0;
                this._py = (this._py + k[1]) | 0;
                this.moved();
                SOUNDS.Play("click1", 0.25);
                return;
            }
        }
    }

    private hardDrop(): void {
        let n: int = 0;
        while (this.fits(this._cells, this._px, (this._py + 1) | 0)) {
            this._py++;
            n++;
        }
        this._score = (this._score + n * 2) | 0;
        this.lockPiece();
    }

    private holdPiece(): void {
        if (this._held) {
            return;
        }
        let was: int = this._hold;
        this._hold = this._piece;
        this.spawn(was);
        this._held = true;
        SOUNDS.Play("click1", 0.3);
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            this._countdown--;
            if (this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_st_stack"), 16747050, 30);
            }
            return;
        }
        if (this._over) {
            return;
        }
        this._steps++;
        if (this._clearing) {
            // (drawn again as the rows blink: the board is only drawn when marked, and they stood still; 9 October)
            if (++this._clearT % 2 == 0) {
                this._dirty = true;
            }
            if (this._clearT >= 14) {
                this.collapse();
            }
            return;
        }
        // held left / right: repeat after a moment
        if (this._dasDir != 0) {
            this._dasT++;
            if (this._dasT >= StackGame.DAS && (this._dasT - StackGame.DAS) % StackGame.ARR == 0) {
                this.shift(this._dasDir);
            }
        }
        let soft: boolean = this.key(Keyboard.DOWN) || this.key(83);
        this._fall++;
        if (this._fall >= (soft ? Math.min(2, this.gravity()) : this.gravity())) {
            this._fall = 0;
            if (this.fits(this._cells, this._px, (this._py + 1) | 0)) {
                this._py++;
                if (soft) {
                    this._score++;
                }
                this._lockT = 0;
                this._dirty = true;
            }
        }
        if (!this.fits(this._cells, this._px, (this._py + 1) | 0)) {
            if (++this._lockT >= StackGame.LOCK) {
                this.lockPiece();
            }
        }
        if (this._versus && this._steps - this._sentAt >= 30) {
            this._sentAt = this._steps;
            ArcadeNet.send({ "t": "s", "score": this._score, "h": this.heights(), "rows": this._lines });
        }
    }

    private heights(): any[] {
        let h: any[] = [];
        let x: int = 0;
        while (x < StackGame.COLS) {
            let y: int = 0;
            while (y < StackGame.ROWS && (this._pit[y][x] | 0) < 0) {
                y++;
            }
            h.push(StackGame.ROWS - y);
            x++;
        }
        return h;
    }

    private lockPiece(): void {
        let above: boolean = true;
        for (let c of as3.values(this._cells)) {
            let x: int = (this._px + c[0]) | 0;
            let y: int = (this._py + c[1]) | 0;
            if (y >= 0) {
                this._pit[y][x] = this._piece;
                above = false;
            }
        }
        SOUNDS.Play("click1", 0.4);
        if (above) {
            this.topOut();
            return;
        }
        // full rows?
        let full: any[] = [];
        let r: int = 0;
        while (r < StackGame.ROWS) {
            let all: boolean = true;
            for (const $value of as3.values(this._pit[r])) {
                let v: int = $value | 0;
                if (v < 0) {
                    all = false;
                    break;
                }
            }
            if (all) {
                full.push(r);
            }
            r++;
        }
        this._piece = -1;
        this._dirty = true;
        if (full.length) {
            this._clearing = full;
            this._clearT = 0;
            let n: int = full.length;
            let pts: int = ([0, 100, 300, 500, 800][n] * this._level) | 0;
            this._score += pts;
            this.float(n == 4 ? KEYS.Get("io_t3a_st_inferno", { "v1": "+" + CasinoUI.number(pts) }) : "+" + CasinoUI.number(pts), StackGame.PX + StackGame.COLS * StackGame.C / 2, StackGame.PY + full[0] * StackGame.C, (n == 4 ? 0xFFE040 : 0xFFD58A) >>> 0);
            SOUNDS.Play(n >= 4 ? "chaching" : "ihit" + ((1 + Math.random() * 7) | 0), 0.7);
            // Inferno-only quest book: four rows at once
            if (n == 4) {
                IoQuests.event("stack_quad");
            }
            // Versus: rows cleared push junk at the rival (first cancelling what is coming here)
            if (this._versus) {
                let send: int = [0, 0, 1, 2, 4][n] | 0;
                let cancel: int = Math.min(send, this._incoming) | 0;
                this._incoming -= cancel;
                send -= cancel;
                if (send > 0) {
                    ArcadeNet.send({ "t": "ev", "k": "junk", "n": send });
                    this.float(KEYS.Get("io_t3a_st_junk_sent", { "v1": send }), StackGame.PX + StackGame.COLS * StackGame.C / 2, StackGame.PY + 60, 10148095);
                }
            }
            return;
        }
        this.takeJunk();
        if (!this._over) {
            this.spawn();
        }
    }

    /** The rows cleared fall away; what was above drops down. */
    private collapse(): void {
        let keep: any[] = [];
        let r: int = 0;
        while (r < StackGame.ROWS) {
            if (this._clearing.indexOf(r) < 0) {
                keep.push(this._pit[r]);
            }
            r++;
        }
        while (keep.length < StackGame.ROWS) {
            let row: any[] = [];
            let x: int = 0;
            while (x < StackGame.COLS) {
                row.push(-1);
                x++;
            }
            keep.unshift(row);
        }
        this._pit = keep;
        let n: int = this._clearing.length;
        this._lines += n;
        let level: int = (1 + ((this._lines / 10) | 0)) | 0;
        if (level > this._level) {
            this._level = level;
            this.banner(KEYS.Get("io_t3a_level_n", { "v1": level }), 16747050, 50);
        }
        this._clearing = null;
        this.updateHud();
        this.spawn();
    }

    /** Junk the rival sent comes up from the bottom (one gap a row, the same column for a batch). */
    private takeJunk(): void {
        if (this._incoming <= 0) {
            return;
        }
        let n: int = Math.min(this._incoming, 8) | 0;
        this._incoming -= n;
        let gap: int = (Math.random() * StackGame.COLS) | 0;
        let i: int = 0;
        while (i < n) {
            // (the top row looked at before it is taken off: taken off first, a top-out left the pit a row short
            // and drawing it threw on every frame; 9 October)
            for (const $value of as3.values(as3.as(this._pit[0], Array))) {
                let v: int = $value | 0;
                if (v >= 0) {
                    // pushed out of the top: topped out
                    this.topOut();
                    return;
                }
            }
            this._pit.shift();
            let row: any[] = [];
            let x: int = 0;
            while (x < StackGame.COLS) {
                row.push(x == gap ? -1 : 7);
                x++;
            }
            this._pit.push(row);
            i++;
        }
        this._dirty = true;
        SOUNDS.Play("ihit3", 0.6);
    }

    private topOut(): void {
        if (this._over) {
            return;
        }
        this._over = true;
        this._piece = -1;
        this._dirty = true;
        this.updateHud();
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this._score });
                this.banner(KEYS.Get("io_t3a_st_topped"), 16738906, 400);
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_st_topped"), "score": this._score, "score2": this._lines, "line": KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this._score) }) + "\n" + KEYS.Get("io_t3a_st_line", { "v1": this._lines, "v2": this._level }) });
    }

    private updateHud(): void {
        ArcadeGame.setText(this._hudScore, CasinoUI.number(this._score));
        ArcadeGame.setText(this._hudInfo, KEYS.Get("io_t3a_hud_level", { "v1": this._level }) + "\n" + KEYS.Get("io_t3a_st_rows", { "v1": this._lines }) + (this._versus && this._incoming > 0 ? "\n" + KEYS.Get("io_t3a_st_junk_coming", { "v1": this._incoming }) : ""));
        if (this._versus) {
            ArcadeGame.setText(this._rivalText, this._rivalName + "\n" + CasinoUI.number(this._rivalScore));
        }
    }

    private float(text: string, x: number, y: number, color: uint): void {
        let t: TextField = ArcadeGame.text(16, color, 240, TextFormatAlign.CENTER);
        t.text = text;
        t.x = x - 120;
        t.y = y - 10;
        this.hud.addChild(t);
        this._floats.push({ "t": t, "life": 50 });
    }

    /** One block: its colour, lit on the top and left, shaded on the bottom and right. */
    private static block(g: any, x: number, y: number, s: number, color: uint, alpha: number = 1): void {
        g.lineStyle(0, 0, 0);
        // the block's picture, once loaded (a dimmed one darkened over it)
        let n: int = StackGame.COLORS.indexOf(color) | 0;
        let art: BitmapData = n >= 0 ? ArcadeArt.picture("arcade/stack/block_" + n + ".png") : null;
        if (art) {
            ArcadeArt.stamp(g, art, x, y, s, s);
            if (alpha < 1) {
                g.beginFill(0x000000, 1 - alpha);
                g.drawRect(x, y, s, s);
                g.endFill();
            }
            return;
        }
        g.beginFill(color, alpha);
        g.drawRect(x, y, s, s);
        g.endFill();
        g.beginFill(0xFFFFFF, 0.3 * alpha);
        g.drawRect(x, y, s, s * 0.18);
        g.drawRect(x, y, s * 0.18, s);
        g.endFill();
        g.beginFill(0x000000, 0.35 * alpha);
        g.drawRect(x, y + s * 0.82, s, s * 0.18);
        g.drawRect(x + s * 0.82, y, s * 0.18, s * 0.82);
        g.endFill();
        g.lineStyle(1, 0x000000, 0.6 * alpha);
        g.drawRect(x, y, s, s);
    }

    private drawBoard(): void {
        let g: any = this._board.graphics;
        g.clear();
        let y: int = 0;
        while (y < StackGame.ROWS) {
            let flashing: boolean = Boolean(this._clearing && this._clearing.indexOf(y) >= 0);
            let x: int = 0;
            while (x < StackGame.COLS) {
                let v: int = this._pit[y][x] | 0;
                if (v >= 0) {
                    StackGame.block(g, StackGame.PX + x * StackGame.C, StackGame.PY + y * StackGame.C, StackGame.C, (flashing && this._clearT % 4 < 2 ? 0xFFF0C0 : StackGame.COLORS[v] >>> 0) >>> 0, Number(this._over ? 0.55 : 1));
                }
                x++;
            }
            y++;
        }
        // the side boxes' shapes
        let s: any = this._side.graphics;
        s.clear();
        if (this._hold >= 0) {
            this.mini(s, this._hold, 190, StackGame.PY + 50, 16, Number(this._held ? 0.4 : 1));
        }
        let i: int = 0;
        while (i < 3) {
            this.mini(s, this._next[i] | 0, StackGame.PX + StackGame.COLS * StackGame.C + 74, StackGame.PY + 54 + i * 58, i == 0 ? 17 : 13, 1);
            i++;
        }
    }

    /** A shape drawn small, centred on (cx, cy). */
    private mini(g: any, piece: int, cx: number, cy: number, s: number, alpha: number): void {
        let cells: any[] = StackGame.cellsOf(piece, 0);
        let minX: int = 9;
        let maxX: int = -9;
        let minY: int = 9;
        let maxY: int = -9;
        for (let c of as3.values(cells)) {
            minX = Math.min(minX, Number(c[0])) | 0;
            maxX = Math.max(maxX, Number(c[0])) | 0;
            minY = Math.min(minY, Number(c[1])) | 0;
            maxY = Math.max(maxY, Number(c[1])) | 0;
        }
        let ox: number = cx - (maxX - minX + 1) * s / 2 - minX * s;
        let oy: number = cy - (maxY - minY + 1) * s / 2 - minY * s;
        for (let d of as3.values(cells)) {
            StackGame.block(g, ox + d[0] * s, oy + d[1] * s, s, StackGame.COLORS[piece] >>> 0, alpha);
        }
    }

    protected override draw(alpha: number): void {
        if (this._dirty) {
            this._dirty = false;
            this.drawBoard();
            this.updateHud();
        }
        let g: any = this._live.graphics;
        let gg: any = this._ghost.graphics;
        if (this._piece >= 0 && !this._over) {
            // where it would land
            let gy: int = this._py;
            while (this.fits(this._cells, this._px, (gy + 1) | 0)) {
                gy++;
            }
            let col: uint = StackGame.COLORS[this._piece] >>> 0;
            let shape: string = this._piece + ":" + this._cells.join(";");
            let gk: string = shape + "@" + this._px + "," + gy;
            if (gk != this._ghostKey) {
                this._ghostKey = gk;
                gg.clear();
                for (let c of as3.values(this._cells)) {
                    if (gy + c[1] >= 0) {
                        gg.lineStyle(2, col, 0.5);
                        gg.beginFill(col, 0.12);
                        gg.drawRect(StackGame.PX + (this._px + c[0]) * StackGame.C + 2, StackGame.PY + (gy + c[1]) * StackGame.C + 2, StackGame.C - 4, StackGame.C - 4);
                        gg.endFill();
                    }
                }
                gg.lineStyle(0, 0, 0);
            }
            // the shape, slipping smoothly between rows as it falls
            let slip: number = Number(this.fits(this._cells, this._px, (this._py + 1) | 0) ? Math.min(1, this._fall / Math.max(1, this.gravity())) * (this.gravity() > 3 ? 1 : 0) : 0);
            let top: number = 99;
            for (let e0 of as3.values(this._cells)) {
                top = Math.min(top, (this._py + e0[1] + slip) * StackGame.C);
            }
            if (top >= 0) {
                // all of it in the pit: drawn once round its corner, then only moved
                if (shape != this._liveKey) {
                    this._liveKey = shape;
                    g.clear();
                    for (let e of as3.values(this._cells)) {
                        StackGame.block(g, e[0] * StackGame.C, e[1] * StackGame.C, StackGame.C, col);
                    }
                }
                this._live.x = StackGame.PX + this._px * StackGame.C;
                this._live.y = StackGame.PY + (this._py + slip) * StackGame.C;
            } else {
                // coming in over the top (a moment as it appears): drawn where it is, clipped to the pit
                this._liveKey = "";
                g.clear();
                this._live.x = 0;
                this._live.y = 0;
                for (let e2 of as3.values(this._cells)) {
                    let yy: number = (this._py + e2[1] + slip) * StackGame.C;
                    if (yy > -StackGame.C) {
                        StackGame.block(g, StackGame.PX + (this._px + e2[0]) * StackGame.C, StackGame.PY + Math.max(0, yy), StackGame.C, col);
                    }
                }
            }
        } else if (this._liveKey != "none") {
            this._liveKey = "none";
            this._ghostKey = "";
            g.clear();
            gg.clear();
        }
        // the junk meter: rows coming at the player, a red bar beside the pit
        let inc: int = this._versus ? this._incoming : 0;
        if (inc != this._junkShown) {
            this._junkShown = inc;
            let jm: any = this._junkMeter.graphics;
            jm.clear();
            if (inc > 0) {
                let hgt: number = Math.min(StackGame.ROWS, inc) * StackGame.C;
                jm.beginFill(0xFF3A1A, 0.85);
                jm.drawRect(StackGame.PX - 12, StackGame.PY + StackGame.ROWS * StackGame.C - hgt, 6, hgt);
                jm.endFill();
            }
        }
        // the rival's pit, small (drawn again only when it changes)
        if (this._versus && this._rivalShape && this._rivalH.join(",") != this._rivalKey) {
            this._rivalKey = this._rivalH.join(",");
            let r: any = this._rivalShape.graphics;
            r.clear();
            let rs: number = 9;
            let rx: number = 605;
            let ry: number = 60;
            r.lineStyle(2, 0x5A8AC0, 0.9);
            r.beginFill(0x0C0608, 0.9);
            r.drawRect(rx - 2, ry - 2, StackGame.COLS * rs + 4, StackGame.ROWS * rs + 4);
            r.endFill();
            let x: int = 0;
            while (x < StackGame.COLS) {
                let h: int = this._rivalH[x] | 0;
                if (h > 0) {
                    r.lineStyle(0, 0, 0);
                    r.beginFill(h >= 17 ? 0xFF5A3A : 0x8A7A9A, 1);
                    r.drawRect(rx + x * rs, ry + (StackGame.ROWS - h) * rs, rs - 1, h * rs);
                    r.endFill();
                }
                x++;
            }
        }
        let fl: any[] = [];
        for (let o of as3.values(this._floats)) {
            o.life--;
            o.t.y -= 0.8;
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
            this._rivalScore = msg.score | 0;
            if (as3.is(msg.h, Array)) {
                this._rivalH = as3.as(msg.h, Array);
            }
            this.updateHud();
        } else if (t == "ev" && msg.k == "junk") {
            this._incoming = (this._incoming + Math.max(1, Math.min(8, msg.n | 0))) | 0;
            this.float(KEYS.Get("io_t3a_st_rival_sent", { "v1": this._rivalName, "v2": msg.n | 0 }), StackGame.PX + StackGame.COLS * StackGame.C / 2, StackGame.PY + 100, 16747114);
            this.updateHud();
        } else if (t == "done") {
            this.banner(KEYS.Get("io_t3a_st_rival_topped", { "v1": this._rivalName.toUpperCase() }), 10289002, 60);
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this._over = true;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": (msg.reason == "left" ? (won ? KEYS.Get("io_t3a_st_rival_left", { "v1": this._rivalName }) : KEYS.Get("io_t3a_st_you_left")) : (won ? KEYS.Get("io_t3a_st_rival_first", { "v1": this._rivalName }) : (draw ? "" : KEYS.Get("io_t3a_st_you_first")))) + "\n" + KEYS.Get("io_t3a_vs_line", { "v1": CasinoUI.number(this._score), "v2": this._rivalName, "v3": CasinoUI.number(Math.max(0, scores[1 - you] | 0)) }), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        }
    }
}
