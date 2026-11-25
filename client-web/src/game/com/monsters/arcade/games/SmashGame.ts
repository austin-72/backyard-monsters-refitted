import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { ColorTransform, Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Spurtz Smash (the Devil's Arcade). Sixty seconds; monsters pop out of nine lava holes and
 * go back down. Smash them (click, or keys 1-9 laid out like a number pad):
 *
 *  - a Spurtz: 10 points times the chain (the chain grows by one with every hit, x2 at 3, x3 at 6, x4 at 10,
 *    x5 at 15; a click on nothing, or on a Fusebug, breaks it);
 *  - a golden Spurtz: 50 times the chain (in Versus it also throws a Fusebug onto the rival's board);
 *  - a Zagnoid: two hits (the second 30 times the chain);
 *  - a Fusebug: don't! -50 and the chain broken.
 *
 * The monsters come from the run's seed (a little faster, staying up a little less, as the minute goes on), so
 * in Versus both players get the same ones; the Fusebugs a rival throws come on top. Versus: the higher score
 * when both minutes are up wins (the server decides).
 */
export class SmashGame extends ArcadeGame {
    static {
        as3.fields(this, { _step: 0, _nextSpawn: 20, _score: 0, _chain: 0, _bestChain: 0, _hits: 0, _in: null, _thrown: null, _holeSprites: null, _floats: null, _hudScore: null, _hudTime: null, _hudChain: null, _hudRival: null, _rivalScore: 0, _rivalName: "", _versus: false, _countdown: 0, _sentAt: 0, _doneSent: false, _fx: null, _flashes: null });
    }

    private static readonly STEPS: int = (60 * 60) | 0;

    private static readonly RISE: int = 7;

    /** Holes: x, y (bottom of the opening), width; three rows, the far one smaller. */
    private static readonly HOLES: any[] = [[210, 160, 120], [360, 160, 120], [510, 160, 120], [190, 265, 140], [360, 265, 140], [530, 265, 140], [170, 378, 160], [360, 378, 160], [550, 378, 160]];

    /** Keys 1-9 to holes, as a number pad (7 8 9 the far row). */
    private static readonly KEYMAP: any = { "55": 0, "56": 1, "57": 2, "52": 3, "53": 4, "54": 5, "49": 6, "50": 7, "51": 8, "103": 0, "104": 1, "105": 2, "100": 3, "101": 4, "102": 5, "97": 6, "98": 7, "99": 8 };

    private static readonly PICS: any = { "spurtz": "popups/IC1-150.png", "gold": "popups/IC1-150.png", "zagnoid": "popups/IC2-150.png", "fusebug": "arcade/monsters/fusebug.png" };
    private _step: int;
    private _nextSpawn: int;
    private _score: int;
    private _chain: int;
    private _bestChain: int;
    private _hits: int;
    /** The monster in each hole: {kind, t (steps since it began), stay, hp, hit (steps since smashed, or -1), sprite}. */
    private _in: any[];
    private _thrown: any[];
    private _holeSprites: any[];
    private _floats: any[];
    private _hudScore: TextField;
    private _hudTime: TextField;
    private _hudChain: TextField;
    private _hudRival: TextField;
    private _rivalScore: int;
    private _rivalName: string;
    private _versus: boolean;
    private _countdown: int;
    private _sentAt: int;
    private _doneSent: boolean;
    private _fx: Sprite;
    private _flashes: any[];

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._in = [null, null, null, null, null, null, null, null, null];
        this._thrown = [];
        this._holeSprites = [];
        this._floats = [];
        this._flashes = [];
        super.$ctor(win, mode, ctx);
        this._versus = mode == "versus";
        ArcadeArt.preload(["popups/IC1-150.png", "popups/IC2-150.png", "arcade/monsters/fusebug.png", "arcade/smash/board.jpg"]);
        // the board
        let bg: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1A0806, 0x3A0E06, 0x180604], [1, 1, 1], [0, 160, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        CasinoUI.picture(bg, "arcade/smash/board.jpg", 0, 0, ArcadeGame.GW, ArcadeGame.GH);
        // (7 October, performance: the backdrop kept as a picture, not drawn again under everything that moves)
        bg.cacheAsBitmap = true;
        let i: int = 0;
        while (i < SmashGame.HOLES.length) {
            this._holeSprites.push(this.makeHole(i));
            i++;
        }
        this._fx = as3.as(this.addChild(new Sprite()), Sprite);
        // the HUD
        this._hudTime = ArcadeGame.text(22, 16777215, 140, TextFormatAlign.LEFT);
        this._hudTime.x = 14;
        this._hudTime.y = 8;
        this.hud.addChild(this._hudTime);
        this._hudScore = ArcadeGame.text(26, 16766346, 260, TextFormatAlign.CENTER);
        this._hudScore.x = (ArcadeGame.GW - 260) / 2;
        this._hudScore.y = 6;
        this._hudScore.name = "smashScore";
        this.hud.addChild(this._hudScore);
        this._hudChain = ArcadeGame.text(16, 16747050, 260, TextFormatAlign.CENTER);
        this._hudChain.x = (ArcadeGame.GW - 260) / 2;
        this._hudChain.y = 40;
        this.hud.addChild(this._hudChain);
        this._hudRival = ArcadeGame.text(16, 10148095, 220, TextFormatAlign.RIGHT);
        this._hudRival.x = ArcadeGame.GW - 234;
        this._hudRival.y = 10;
        this.hud.addChild(this._hudRival);
        if (this._versus) {
            let players: any[] = as3.as(ctx.players, Array);
            let you: int = ctx.you | 0;
            this._rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3a_rival");
            this._countdown = (Number(ctx.cd) / ArcadeGame.STEP) | 0;
        }
        this.topHud();
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.updateHud();
        if (this._countdown > 0) {
            this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 50);
        }
    }

    private makeHole(i: int): Sprite {
        let h: any[] = as3.cast(SmashGame.HOLES[i], Array);
        let s: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        s.x = Number(h[0]);
        s.y = Number(h[1]);
        let w: number = Number(h[2]);
        // the opening: a glowing pit
        let back: Shape = as3.as(s.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(w, w * 0.34, 0, -w / 2, -w * 0.17);
        back.graphics.beginGradientFill(GradientType.RADIAL, [0xFFB040, 0xC83A0A, 0x2A0804], [1, 1, 1], [0, 110, 255], m);
        back.graphics.drawEllipse(-w / 2, -w * 0.17, w, w * 0.34);
        back.graphics.endFill();
        // the monster, clipped at the opening's line
        let who: Sprite = as3.as(s.addChild(new Sprite()), Sprite);
        let clip: Shape = as3.as(s.addChild(new Shape()), Shape);
        clip.graphics.beginFill(0);
        clip.graphics.drawRect(-w, -w * 1.6, w * 2, w * 1.6);
        clip.graphics.endFill();
        who.mask = clip;
        // the rim in front
        let rim: Shape = as3.as(s.addChild(new Shape()), Shape);
        rim.graphics.lineStyle(5, 2364436, 1);
        rim.graphics.moveTo(-w / 2, 0);
        rim.graphics.curveTo(0, w * 0.34, w / 2, 0);
        rim.graphics.lineStyle(2, 16738842, 0.8);
        rim.graphics.moveTo(-w / 2 + 3, 2);
        rim.graphics.curveTo(0, w * 0.32, w / 2 - 3, 2);
        let num: TextField = CasinoUI.label(String(SmashGame.keyFor(i)), 10, 12101784, true, 20, TextFormatAlign.CENTER);
        num.x = w / 2 - 6;
        num.y = 2;
        num.alpha = 0.6;
        s.addChild(num);
        s["who"] = who;
        return s;
    }

    private static keyFor(hole: int): int {
        return [7, 8, 9, 4, 5, 6, 1, 2, 3][hole] | 0;
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            this._countdown--;
            if (this._countdown == 0) {
                // (QoL #235: the games' words in the player's language)
                this.banner(KEYS.Get("io_t3a_sm_smash"), 16747050, 30);
            }
            return;
        }
        if (this._step >= SmashGame.STEPS) {
            return;
        }
        this._step++;
        let progress: number = this._step / SmashGame.STEPS;
        // the next monster (from the seed)
        if (this._step >= this._nextSpawn) {
            this._nextSpawn = (this._step + Math.max(14, ((40 - 26 * progress) | 0) + this.rint(14))) | 0;
            let r: number = this.rnd();
            let kind: string = r < 0.06 ? "gold" : (r < 0.18 ? "fusebug" : (r < 0.28 ? "zagnoid" : "spurtz"));
            let stay: int = (((70 - 32 * progress) | 0) + this.rint(16)) | 0;
            let hole: int = this.rint(9);
            this.put(hole, kind, stay);
        }
        // thrown Fusebugs (Versus): into a free hole as soon as there is one
        if (this._thrown.length) {
            let free: any[] = [];
            for (let k: int = 0; k < 9; k++) {
                if (!this._in[k]) {
                    free.push(k);
                }
            }
            if (free.length) {
                this._thrown.shift();
                this.put(free[(Math.random() * free.length) | 0] | 0, "fusebug", 80);
            }
        }
        let i: int = 0;
        while (i < 9) {
            let c: any = this._in[i];
            if (c) {
                c.t++;
                if (c.hit >= 0) {
                    c.hit++;
                    if (c.hit > 14) {
                        this._in[i] = null;
                    }
                } else if (c.t > c.stay + SmashGame.RISE * 2) {
                    this._in[i] = null;
                }
            }
            i++;
        }
        if (this._versus && (this._step - this._sentAt >= 30)) {
            this._sentAt = this._step;
            ArcadeNet.send({ "t": "s", "score": this._score });
        }
        if (this._step % 20 == 0) {
            this.updateHud();
        }
        if (this._step >= SmashGame.STEPS) {
            this.finish();
        }
    }

    /** A monster into a hole (if the hole is busy, the next free one along). */
    private put(hole: int, kind: string, stay: int): void {
        let k: int = 0;
        while (k < 9 && this._in[(hole + k) % 9]) {
            k++;
        }
        if (k == 9) {
            return;
        }
        hole = ((hole + k) % 9) | 0;
        this._in[hole] = { "kind": kind, "t": 0, "stay": stay, "hp": kind == "zagnoid" ? 2 : 1, "hit": -1, "pic": null };
    }

    /** How far out of its hole a monster is (0 to 1). */
    private static upness(c: any): number {
        if (c.hit >= 0) {
            return Math.max(0, 1 - c.hit / 10);
        }
        if (c.t < SmashGame.RISE) {
            return c.t / SmashGame.RISE;
        }
        if (c.t > c.stay + SmashGame.RISE) {
            return Math.max(0, 1 - (c.t - c.stay - SmashGame.RISE) / SmashGame.RISE);
        }
        return 1;
    }

    private onDown(e: MouseEvent): void {
        // (time up in Versus, waiting for the rival: no more smashing, the score is sent; 9 October)
        if (this.ended || this._countdown > 0 || this._doneSent) {
            return;
        }
        let best: int = -1;
        let bestD: number = 1e9;
        let i: int = 0;
        while (i < 9) {
            let h: any[] = as3.cast(SmashGame.HOLES[i], Array);
            let w: number = Number(h[2]);
            let dx: number = this.mouseX - h[0];
            let dy: number = this.mouseY - (h[1] - w * 0.38);
            if (Math.abs(dx) < w * 0.55 && dy > -w * 0.6 && dy < w * 0.5) {
                let d: number = dx * dx + dy * dy;
                if (d < bestD) {
                    bestD = d;
                    best = i;
                }
            }
            i++;
        }
        this.smash(best);
    }

    public override keyDown(code: int): void {
        // (a key held down repeats: each repeat was a smash, about 30 a second; 9 October)
        let was: boolean = this.key(code);
        super.keyDown(code);
        if (!was && SmashGame.KEYMAP[String(code)] != null && !this.ended && this._countdown <= 0 && !this._doneSent) {
            this.smash(SmashGame.KEYMAP[String(code)] | 0);
        }
    }

    private smash(hole: int): void {
        let c: any = hole >= 0 ? this._in[hole] : null;
        let h: any[] = as3.cast(hole >= 0 ? SmashGame.HOLES[hole] : null, Array);
        if (!c || c.hit >= 0 || SmashGame.upness(c) < 0.35) {
            // a miss breaks the chain
            if (this._chain > 0) {
                this._chain = 0;
                this.updateHud();
            }
            SOUNDS.Play("click1", 0.4);
            return;
        }
        let at: any[] = [h[0], h[1] - h[2] * 0.45];
        if (c.kind == "fusebug") {
            c.hit = 0;
            this._score = Math.max(0, this._score - 50) | 0;
            this._chain = 0;
            this.flash(at, 16730650);
            this.float("-50", at, 16734794);
            SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0));
            this.updateHud();
            return;
        }
        if (c.kind == "zagnoid" && c.hp > 1) {
            c.hp--;
            c.stay += 12;
            this._score += 5;
            this.float("+5", at, 16777215);
            SOUNDS.Play("click1");
            this.updateHud();
            return;
        }
        c.hit = 0;
        this._chain++;
        this._hits++;
        this._bestChain = Math.max(this._bestChain, this._chain) | 0;
        let mult: int = this.mult();
        let base: int = c.kind == "gold" ? 50 : (c.kind == "zagnoid" ? 30 : 10);
        let pts: int = (base * mult) | 0;
        this._score += pts;
        this.float("+" + pts, at, (c.kind == "gold" ? 0xFFE040 : 0xFFD58A) >>> 0);
        this.flash(at, (c.kind == "gold" ? 0xFFE040 : 0xFF9A3A) >>> 0);
        SOUNDS.Play(c.kind == "gold" ? "chaching" : "ihit" + ((1 + Math.random() * 7) | 0), 0.7);
        if (c.kind == "gold" && this._versus) {
            ArcadeNet.send({ "t": "ev", "k": "bomb" });
            this.float(KEYS.Get("io_t3a_sm_thrown"), [ArcadeGame.GW / 2, 90], 10148095);
        }
        this.updateHud();
    }

    private mult(): int {
        return this._chain >= 15 ? 5 : (this._chain >= 10 ? 4 : (this._chain >= 6 ? 3 : (this._chain >= 3 ? 2 : 1)));
    }

    private updateHud(): void {
        let left: int = Math.max(0, Math.ceil((SmashGame.STEPS - this._step) / 60)) | 0;
        this._hudTime.text = "0:" + (left < 10 ? "0" : "") + left;
        this._hudTime.textColor = (left <= 10 ? 0xFF6A5A : 0xFFFFFF) >>> 0;
        this._hudScore.text = CasinoUI.number(this._score);
        this._hudChain.text = this._chain >= 3 ? KEYS.Get("io_t3a_sm_chain", { "v1": this.mult(), "v2": this._chain }) : "";
        if (this._versus) {
            this._hudRival.text = this._rivalName + ": " + CasinoUI.number(this._rivalScore);
        }
    }

    private float(text: string, at: any[], color: uint): void {
        let t: TextField = ArcadeGame.text(18, color, 200, TextFormatAlign.CENTER);
        t.text = text;
        t.x = at[0] - 100;
        t.y = at[1] - 20;
        this.hud.addChild(t);
        this._floats.push({ "t": t, "life": 40 });
    }

    private flash(at: any[], color: uint): void {
        this._flashes.push({ "x": at[0], "y": at[1], "c": color, "life": 12 });
    }

    protected override draw(alpha: number): void {
        let i: int = 0;
        while (i < 9) {
            let s: Sprite = as3.cast(this._holeSprites[i], Sprite);
            let who: Sprite = as3.as(s["who"], Sprite);
            let c: any = this._in[i];
            let w: number = Number(SmashGame.HOLES[i][2]);
            if (!c) {
                who.visible = false;
            } else {
                let bmd: BitmapData = ArcadeArt.picture(String(SmashGame.PICS[c.kind]));
                if (bmd && !c.pic) {
                    while (who.numChildren) {
                        who.removeChildAt(0);
                    }
                    let b: Bitmap = new Bitmap(bmd);
                    b.smoothing = true;
                    let size: number = w * (c.kind == "zagnoid" ? 1.0 : 0.85);
                    b.width = size;
                    b.height = size * bmd.height / bmd.width;
                    b.x = -b.width / 2;
                    b.y = -b.height + w * 0.08;
                    who.addChild(b);
                    c.pic = b;
                    who.filters = c.kind == "gold" ? [new GlowFilter(0xFFE040, 1, 18, 18, 3, 2)] : (c.kind == "fusebug" ? [new GlowFilter(0xFF2A1A, 0.6, 10, 10, 2, 1)] : []);
                    if (c.kind == "gold") {
                        b.transform.colorTransform = new ColorTransform(1.15, 1.05, 0.45, 1, 40, 30, 0, 0);
                    }
                }
                who.visible = c.pic != null;
                let up: number = SmashGame.upness(c);
                who.y = (1 - up) * w * 1.05;
                who.scaleY = Number(c.hit >= 0 ? Math.max(0.4, 1 - c.hit * 0.05) : 1);
                who.rotation = Number(c.kind == "zagnoid" && c.hp == 1 && c.hit < 0 ? Math.sin(c.t * 0.8) * 6 : 0);
            }
            i++;
        }
        // effects: each flash its own little shape (9 October: all in one shape, two flashes on far holes made it
        // as big as the board, drawn again every frame)
        this.poolBegin();
        let keep: any[] = [];
        for (let f of as3.values(this._flashes)) {
            f.life--;
            if (f.life > 0) {
                keep.push(f);
                let r: number = (12 - f.life) * 5;
                let fg: any = this.poolShape(this._fx, "flash", SmashGame.noDraw, Number(f.x), Number(f.y)).graphics;
                fg.clear();
                fg.lineStyle(4, f.c, f.life / 12);
                let k: int = 0;
                while (k < 8) {
                    let a: number = k / 8 * Math.PI * 2;
                    fg.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
                    fg.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    k++;
                }
            }
        }
        this._flashes = keep;
        this.poolEnd();
        let fl: any[] = [];
        for (let o of as3.values(this._floats)) {
            o.life--;
            o.t.y -= 1;
            o.t.alpha = Math.min(1, o.life / 15);
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

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s") {
            this._rivalScore = msg.score | 0;
            this.updateHud();
        } else if (t == "ev" && msg.k == "bomb") {
            this._thrown.push(1);
            this.float(KEYS.Get("io_t3a_sm_rival_threw", { "v1": this._rivalName }), [ArcadeGame.GW / 2, 90], 16747114);
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

    private finish(): void {
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this._score });
                this.banner(KEYS.Get("io_t3a_sm_time_waiting", { "v1": this._rivalName }), 16766346, 400);
                this.leaveButton();
            }
            this.updateHud();
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_time_up"), "score": this._score, "score2": this._bestChain, "line": KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this._score) }) + "\n" + KEYS.Get("io_t3a_sm_line", { "v1": this._hits, "v2": this._bestChain }) });
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
    }
}
