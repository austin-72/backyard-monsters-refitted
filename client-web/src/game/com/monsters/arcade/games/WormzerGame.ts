import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, CapsStyle, JointStyle, LineScaleMode, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { getTimer } from "flash/utils";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Wormzer (the Devil's Arcade), drawn from the server's arena (server/src/services/arcade/
 * wormzer.ts). The player steers towards the mouse and burrows faster holding the button (or Space). The
 * server sends every Wormzer's head 15 times a second, numbered by its step.
 *
 * Smooth movement (7 October, the user's: it didn't feel smooth): the other Wormzers are drawn DELAY steps
 * behind the server's clock (ArcadeGame.stepNow), between the two steps either side, so a message arriving
 * late is waited for rather than jumped over. The player's own Wormzer is moved here at once (the server's
 * own turning and speed), so it answers the mouse without waiting for the server, and is pulled gently
 * towards where the server has it (snapped if it is far off). The bodies follow the heads as drawn, with the
 * server's own rule (the head's place kept once it is SEG from the last kept, once a step), so they keep to
 * the heads and are as long as the server's.
 *
 * Dying shows the length and kills (the server records them) with Again and Leave; the arena goes on.
 */
export class WormzerGame extends ArcadeGame {
    static {
        as3.fields(this, { _arena: 1400, _seg: 10, _stepMs: 66, _you: 0, _snakes: null, _food: null, _world: null, _ground: null, _foodShape: null, _bodies: null, _heads: null, _mini: null, _miniT: 0, _hudLen: null, _hudTop: null, _dead: null, _camX: 0, _camY: 0, _zoom: 0.8, _lastSend: 0, _lastA: 0, _boost: false, _mouseBoost: false, _started: false, _kills: 0, _foodQueue: null, _frameMs: 25, _ownAcc: 0, _groundAt: null, _stickAim: false, _aim: 0 });
    }

    private static readonly SKINS: any[] = [[0xC8402A, 0xFF8A5A], [0xE08A20, 0xFFD070], [0x8A3AB0, 0xD08AFF], [0x3A9A4A, 0x9CFF8A], [0x2A6AC8, 0x8AC8FF], [0xD8B040, 0xFFF0A0], [0x7A6A6A, 0xD0C0C0], [0xE04A7A, 0xFFA0C0]];

    /** The server's movement (wormzer.ts): speeds a second, turning radians a second, the shortest. */
    private static readonly SPEED: number = 150;

    private static readonly BOOST: number = 270;

    private static readonly TURN: number = 3.8;

    private static readonly MIN_LEN: number = 8;

    /** How far behind the server's clock the other Wormzers are drawn, at least (steps; more on a bumpy link). */
    private static readonly DELAY: number = 1.2;
    private _arena: number;
    private _seg: number;
    private _stepMs: number;
    private _you: int;
    /** id -> {id, name, bot, skin, pts, len, alive, boost, px, py, x, y, a, at, label, head} */
    private _snakes: any;
    /** id -> [x, y, v] */
    private _food: any;
    private _world: Sprite;
    private _ground: Shape;
    private _foodShape: Shape;
    private _bodies: Shape;
    private _heads: Sprite;
    private _mini: Shape;
    private _miniT: int;
    private _hudLen: TextField;
    private _hudTop: TextField;
    private _dead: Sprite;
    private _camX: number;
    private _camY: number;
    private _zoom: number;
    private _lastSend: int;
    private _lastA: number;
    private _boost: boolean;
    private _mouseBoost: boolean;
    private _started: boolean;
    private _kills: int;
    /** The embers eaten and dropped, kept until their step is drawn: [k, added, removed]. */
    private _foodQueue: any[];
    private _frameMs: number;
    /** Local steps of the player's own Wormzer (its body's points are kept once a step, as the server's). */
    private _ownAcc: number;
    /** Where the ground was last drawn for: [camera x, y, zoom]. */
    private _groundAt: any[];
    /** Steering by the stick (until a finger touches the arena): its last angle kept when it is let go. */
    private _stickAim: boolean;
    private _aim: number;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._snakes = {};
        this._food = {};
        this._foodQueue = [];
        super.$ctor(win, mode, ctx);
        ArcadeArt.preload(["wormzer"]);
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        bg.graphics.beginFill(656388, 1);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        this._world = as3.as(this.addChild(new Sprite()), Sprite);
        this._ground = as3.as(this._world.addChild(new Shape()), Shape);
        this._foodShape = as3.as(this._world.addChild(new Shape()), Shape);
        this._bodies = as3.as(this._world.addChild(new Shape()), Shape);
        this._heads = as3.as(this._world.addChild(new Sprite()), Sprite);
        this._mini = as3.as(this.addChild(new Shape()), Shape);
        this._mini.x = ArcadeGame.GW - 70;
        this._mini.y = ArcadeGame.GH - 70;
        this._hudLen = ArcadeGame.text(18, 16766346, 300, TextFormatAlign.LEFT);
        this._hudLen.x = 12;
        this._hudLen.y = 8;
        this._hudLen.name = "wormzerLength";
        this.hud.addChild(this._hudLen);
        this._hudTop = CasinoUI.label("", 10, 15655632, true, 180, TextFormatAlign.LEFT);
        this._hudTop.multiline = true;
        this._hudTop.height = 100;
        this._hudTop.x = ArcadeGame.GW - 186;
        this._hudTop.y = 8;
        this._hudTop.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
        this.hud.addChild(this._hudTop);
        this.topHud();
        // phones and tablets: a stick to steer (by its angle) and BOOST (Space); a finger on the arena steers
        // too, without burrowing faster (holding it down to steer was a boost the whole time)
        this.touchControls({ "stick": "analog", "buttons": [{ "label": "BOOST", "code": Keyboard.SPACE, "r": 40, "x": ArcadeGame.GW - 70, "y": ArcadeGame.GH - 74 }] });
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.begin(ctx);
    }

    private begin(m: any): void {
        this._arena = Number(m.arena);
        this._seg = Number(m.seg);
        this._stepMs = Number(m.step);
        this._you = m.you | 0;
        this._snakes = {};
        this._food = {};
        this._foodQueue = [];
        for (let s of as3.values(m.snakes)) {
            this.addSnake(s);
        }
        for (let f of as3.values(m.food)) {
            this._food[f[0]] = [f[1], f[2], f[3]];
        }
        this.drawGround();
        this._started = true;
        // (QoL #235: the games' words in the player's language)
        this.banner(KEYS.Get("io_t3a_wz_intro"), 16766346, 70);
    }

    private addSnake(s: any): void {
        let old: any = this._snakes[s.id];
        if (old && old.label && old.label.parent) {
            old.label.parent.removeChild(old.label);
        }
        if (old && old.head && old.head.parent) {
            old.head.parent.removeChild(old.head);
        }
        let pts: any[] = [];
        for (let p of as3.values(s.pts)) {
            pts.push([Number(p[0]), Number(p[1])]);
        }
        let head: Bitmap = new Bitmap();
        head.smoothing = true;
        this._heads.addChild(head);
        let label: TextField = CasinoUI.label(String(s.name), 10, ((s.id | 0) == this._you ? 0xFFD58A : 0xFFFFFF) >>> 0, true, 140, TextFormatAlign.CENTER);
        label.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
        this._heads.addChild(label);
        let x: number = Number(pts.length ? pts[0][0] : 0);
        let y: number = Number(pts.length ? pts[0][1] : 0);
        // snaps: the server's steps [k, x, y, a, boost]; pts: the body as drawn (pts[0] the head); tk: the
        // last step its body was kept to; ox, oy, oa: the player's own, moved here
        this._snakes[s.id] = { "id": s.id | 0, "name": String(s.name), "bot": Boolean(s.bot), "skin": s.skin | 0, "pts": pts, "len": Number(s.len) / 10, "alive": Boolean(s.alive), "boost": false, "x": x, "y": y, "a": 0, "rx": x, "ry": y, "ra": 0, "snaps": [], "tk": NaN, "own": false, "label": label, "head": head };
    }

    /** (drawn each frame, only what can be seen: groundView) */
    private drawGround(): void {
        this._groundAt = null;
    }

    /**
     * The arena's floor, only what is on screen (7 October, performance: the whole arena, a gradient disc
     * 2800 across with 70 grid lines, was traced again every frame as the camera moved): the floor, the ash
     * tiles' lines in view, the lava rim where it shows. Drawn again when the camera has moved.
     */
    private groundView(hw: number, hh: number): void {
        let cx: number = this._camX;
        let cy: number = this._camY;
        if (this._groundAt && this._groundAt[0] == cx && this._groundAt[1] == cy && this._groundAt[2] == this._zoom) {
            return;
        }
        this._groundAt = [cx, cy, this._zoom];
        let g: any = this._ground.graphics;
        g.clear();
        let R: number = this._arena;
        let x0: number = cx - hw;
        let x1: number = cx + hw;
        let y0: number = cy - hh;
        let y1: number = cy + hh;
        // the floor (darker towards the rim, as the old gradient: the inner disc a shade lighter)
        g.beginFill(0x1E0C0A, 1);
        g.drawCircle(0, 0, R);
        g.endFill();
        if (Math.abs(cx) + Math.abs(cy) < R) {
            g.beginFill(0x2A1210, 0.35);
            g.drawCircle(0, 0, R * 0.55);
            g.endFill();
        }
        // ash tiles: the lines in view
        g.lineStyle(1, 0x3A2018, 0.6);
        let step: number = 80;
        let x: number = Math.max(-R, Math.ceil(x0 / step) * step);
        while (x <= Math.min(R, x1)) {
            let h: number = Math.sqrt(Math.max(0, R * R - x * x));
            g.moveTo(x, Math.max(-h, y0));
            g.lineTo(x, Math.min(h, y1));
            x += step;
        }
        let y: number = Math.max(-R, Math.ceil(y0 / step) * step);
        while (y <= Math.min(R, y1)) {
            let w: number = Math.sqrt(Math.max(0, R * R - y * y));
            g.moveTo(Math.max(-w, x0), y);
            g.lineTo(Math.min(w, x1), y);
            y += step;
        }
        // the lava rim, if it shows
        let far: number = Math.sqrt(Math.max(cx * cx, (Math.abs(cx) + hw) * (Math.abs(cx) + hw)) + Math.max(cy * cy, (Math.abs(cy) + hh) * (Math.abs(cy) + hh)));
        if (far > R - 30) {
            g.lineStyle(26, 0xE0501C, 1);
            g.drawCircle(0, 0, R + 13);
            g.lineStyle(6, 0xFFC060, 0.9);
            g.drawCircle(0, 0, R + 2);
        }
    }

    private onDown(e: MouseEvent): void {
        this._stickAim = false;
        if (!this.touch) {
            this._mouseBoost = true;
        }
    }

    private onUp(e: MouseEvent): void {
        this._mouseBoost = false;
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        let now: int = getTimer();
        if (t == "w") {
            let k: number = Number(msg.k);
            this.stepSeen(k, this._stepMs);
            for (let h of as3.values(msg.s)) {
                let s: any = this._snakes[h[0]];
                if (!s) {
                    continue;
                }
                s.x = Number(h[1]);
                s.y = Number(h[2]);
                s.a = Number(h[3]) / 100;
                s.len = Number(h[4]) / 10;
                s.boost = (h[5] | 0) == 1;
                s.alive = (h[6] | 0) == 1;
                let snaps: any[] = as3.cast(s.snaps, Array);
                snaps.push([k, s.x, s.y, s.a, s.boost]);
                if (snaps.length > 20) {
                    snaps.shift();
                }
            }
            // (the embers change when their step is drawn, so an ember goes when the head drawn reaches it)
            this._foodQueue.push([k, msg.fa, msg.fr]);
        } else if (t == "pong") {
            this.pong(msg);
        } else if (t == "born") {
            this.addSnake(msg);
            if ((msg.id | 0) == this._you) {
                this.hideDead();
            }
        } else if (t == "gone") {
            let g: any = this._snakes[msg.id];
            if (g) {
                if (g.label.parent) {
                    g.label.parent.removeChild(g.label);
                }
                if (g.head.parent) {
                    g.head.parent.removeChild(g.head);
                }
                delete this._snakes[msg.id];
            }
        } else if (t == "die") {
            let d: any = this._snakes[msg.id];
            if (d) {
                d.alive = false;
            }
            let killer: any = this._snakes[msg.by];
            if (killer && (killer.id | 0) == this._you) {
                this._kills++;
                this.banner(d ? KEYS.Get("io_t3a_you_got", { "v1": String(d.name) }) : KEYS.Get("io_t3a_wz_got_one"), 10289002, 40);
            }
            if ((msg.id | 0) == this._you) {
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0));
                this.showDead(msg.len | 0, msg.kills | 0, killer ? String(killer.name) : "");
            }
        } else if (t == "start") {
            this.begin(msg);
        } else if (t == "lost") {
            this.showDead(-1, 0, "");
        }
    }

    /** One step of a body (the server's rule): the head's place kept if it is SEG from the last kept; the tail trimmed. */
    private keep(s: any, x: number, y: number): void {
        let pts: any[] = as3.cast(s.pts, Array);
        if (pts.length < 2) {
            s.pts = pts = [[x, y], [x, y]];
        }
        let dx: number = x - pts[1][0];
        let dy: number = y - pts[1][1];
        if (dx * dx + dy * dy >= this._seg * this._seg) {
            pts.splice(1, 0, [x, y]);
        }
        let want: int = (Math.max(WormzerGame.MIN_LEN, Math.round(Number(s.len))) + 1) | 0;
        while (pts.length > want) {
            pts.pop();
        }
    }

    /** Where a Wormzer the server moves was at step rk (between the steps either side; past the newest, carried on a little). */
    private sample(s: any, rk: number): any[] {
        let sn: any[] = as3.cast(s.snaps, Array);
        let n: int = sn.length;
        if (n == 0) {
            return [s.x, s.y, s.a];
        }
        if (rk <= sn[0][0]) {
            return [sn[0][1], sn[0][2], sn[0][3]];
        }
        let i: int = (n - 1) | 0;
        while (i > 0 && sn[i][0] > rk) {
            i--;
        }
        let a: any[] = as3.cast(sn[i], Array);
        if (i == n - 1) {
            // nothing newer yet: on the way it was going, for at most a step and a half
            let t: number = Math.min(1.5, rk - a[0]) * this._stepMs / 1000;
            let v: number = a[4] ? WormzerGame.BOOST : WormzerGame.SPEED;
            return [a[1] + Math.cos(Number(a[3])) * v * t, a[2] + Math.sin(Number(a[3])) * v * t, a[3]];
        }
        let b: any[] = as3.cast(sn[i + 1], Array);
        let f: number = (rk - a[0]) / Math.max(1, b[0] - a[0]);
        let da: number = b[3] - a[3];
        while (da > Math.PI) {
            da -= Math.PI * 2;
        }
        while (da < -Math.PI) {
            da += Math.PI * 2;
        }
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + da * f];
    }

    /** The player's own Wormzer, moved here: towards the mouse at the server's turning and speed, pulled towards the server's. */
    private predict(me: any, want: number, boost: boolean): void {
        let sn: any[] = as3.cast(me.snaps, Array);
        if (sn.length == 0) {
            return;
        }
        let last: any[] = as3.cast(sn[sn.length - 1], Array);
        if (!me.own) {
            me.own = true;
            me.ox = last[1];
            me.oy = last[2];
            me.oa = last[3];
        }
        let dt: number = Math.min(0.1, this._frameMs / 1000);
        let d: number = want - me.oa;
        while (d > Math.PI) {
            d -= Math.PI * 2;
        }
        while (d < -Math.PI) {
            d += Math.PI * 2;
        }
        let turn: number = WormzerGame.TURN * dt / (1 + me.len / 300);
        me.oa += Math.max(-turn, Math.min(turn, d));
        if (me.oa > Math.PI) {
            me.oa -= Math.PI * 2;
        }
        if (me.oa < -Math.PI) {
            me.oa += Math.PI * 2;
        }
        let v: number = boost && me.len > WormzerGame.MIN_LEN + 1 ? WormzerGame.BOOST : WormzerGame.SPEED;
        me.ox += Math.cos(Number(me.oa)) * v * dt;
        me.oy += Math.sin(Number(me.oa)) * v * dt;
        // where the server will have it once it has what was sent: its newest step, carried on
        let ahead: number = Math.max(0, Math.min(0.6, (getTimer() - this.stepTime(Number(last[0]), this._stepMs) + this.rtt) / 1000));
        let lv: number = last[4] ? WormzerGame.BOOST : WormzerGame.SPEED;
        let ex: number = Number(last[1] + Math.cos(Number(last[3])) * lv * ahead);
        let ey: number = Number(last[2] + Math.sin(Number(last[3])) * lv * ahead);
        let dx: number = ex - me.ox;
        let dy: number = ey - me.oy;
        if (dx * dx + dy * dy > 90 * 90) {
            me.ox = ex;
            me.oy = ey;
            me.oa = last[3];
        } else {
            let pull: number = 1 - Math.exp(-dt * 3);
            me.ox += dx * pull;
            me.oy += dy * pull;
        }
    }

    public override tick(ms: number): void {
        this._frameMs = ms;
        super.tick(ms);
        this.render();
    }

    private radius(s: any): number {
        return 8 + Math.min(16, s.len * 0.07);
    }

    private render(): void {
        let s: any = null;
        if (!this._started) {
            return;
        }
        let now: int = getTimer();
        let me: any = this._snakes[this._you];
        this.pingNow();
        let rk: number = this.stepNow(this._stepMs, this.stepDelay(WormzerGame.DELAY));
        // the embers as at the step drawn
        while (this._foodQueue.length && Number(this._foodQueue[0][0]) <= rk) {
            let q: any[] = as3.cast(this._foodQueue.shift(), Array);
            for (let fa of as3.values(q[1])) {
                this._food[fa[0]] = [fa[1], fa[2], fa[3]];
            }
            for (let id of as3.values(q[2])) {
                delete this._food[id];
            }
        }
        // where the mouse says to go
        if (this.pad && this.pad.stickActive) {
            this._stickAim = true;
            this._aim = Math.atan2(this.pad.stickY, this.pad.stickX);
        }
        let want: number = this._stickAim ? this._aim : Math.atan2(this.mouseY - ArcadeGame.GH / 2, this.mouseX - ArcadeGame.GW / 2);
        let boostWanted: boolean = this._mouseBoost || this.key(Keyboard.SPACE);
        // the heads: the others between the server's steps, the player's own moved here; the bodies follow
        this._ownAcc += this._frameMs;
        let ownSteps: int = 0;
        while (this._ownAcc >= this._stepMs) {
            this._ownAcc -= this._stepMs;
            ownSteps++;
        }
        for (s of as3.values(this._snakes)) {
            if ((s.id | 0) == this._you && s.alive && !this._dead) {
                this.predict(s, want, boostWanted);
                if (s.own) {
                    s.rx = s.ox;
                    s.ry = s.oy;
                    s.ra = s.oa;
                    let j: int = 0;
                    while (j < Math.min(ownSteps, 3)) {
                        this.keep(s, Number(s.rx), Number(s.ry));
                        j++;
                    }
                    s.pts[0] = [s.rx, s.ry];
                    continue;
                }
            }
            let at: any[] = this.sample(s, rk);
            s.rx = at[0];
            s.ry = at[1];
            s.ra = at[2];
            // the body: each server step passed since last time, as the server kept it
            let whole: int = Math.floor(rk) | 0;
            if (isNaN(Number(s.tk)) || whole - s.tk > 30) {
                s.tk = whole;
            }
            while (s.tk < whole) {
                s.tk++;
                let p: any[] = this.sample(s, Number(s.tk));
                this.keep(s, Number(p[0]), Number(p[1]));
            }
            if (s.pts.length) {
                s.pts[0] = [s.rx, s.ry];
            }
        }
        if (me) {
            let targetZoom: number = Math.max(0.5, 0.85 - Math.min(0.35, me.len / 900));
            this._zoom += (targetZoom - this._zoom) * 0.05;
            this._camX = Number(me.rx);
            this._camY = Number(me.ry);
        }
        this._world.scaleX = this._world.scaleY = this._zoom;
        this._world.x = ArcadeGame.GW / 2 - this._camX * this._zoom;
        this._world.y = ArcadeGame.GH / 2 - this._camY * this._zoom;
        // what is on screen (in world units), with a margin
        let hw: number = ArcadeGame.GW / 2 / this._zoom + 60;
        let hh: number = ArcadeGame.GH / 2 / this._zoom + 60;
        this.groundView(hw, hh);
        let fg: any = this._foodShape.graphics;
        fg.clear();
        for (let f of as3.values(this._food)) {
            if (Math.abs(f[0] - this._camX) > hw || Math.abs(f[1] - this._camY) > hh) {
                continue;
            }
            let r: number = 3 + f[2] * 1.6;
            fg.beginFill(0xFF6A1A, 0.3);
            fg.drawCircle(f[0], f[1], r * 2.2);
            fg.endFill();
            fg.beginFill(f[2] >= 3 ? 0xFFF0A0 : 0xFFB040, 1);
            fg.drawCircle(f[0], f[1], r);
            fg.endFill();
        }
        let bg: any = this._bodies.graphics;
        bg.clear();
        let tops: any[] = [];
        for (s of as3.values(this._snakes)) {
            tops.push(s);
            let head: Bitmap = as3.cast(s.head, Bitmap);
            let label: TextField = as3.cast(s.label, TextField);
            if (!s.alive) {
                head.visible = false;
                label.visible = false;
                continue;
            }
            let pts: any[] = as3.cast(s.pts, Array);
            let rad: number = this.radius(s);
            // (the player's own Wormzer is always the gold one; the others as the server gives them)
            let skin: any[] = as3.cast((s.id | 0) == this._you ? WormzerGame.SKINS[5] : WormzerGame.SKINS[(s.skin | 0) % WormzerGame.SKINS.length], Array);
            let near: boolean = Math.abs(s.rx - this._camX) < hw + s.len * this._seg && Math.abs(s.ry - this._camY) < hh + s.len * this._seg;
            if (near && pts.length > 1) {
                // the body: a thick dark line, the skin over it, a lighter stripe
                bg.lineStyle(rad * 2 + 4, 0x120606, 1, false, LineScaleMode.NORMAL, CapsStyle.ROUND, JointStyle.ROUND);
                this.path(bg, s);
                bg.lineStyle(rad * 2, skin[0] >>> 0, 1, false, LineScaleMode.NORMAL, CapsStyle.ROUND, JointStyle.ROUND);
                this.path(bg, s);
                bg.lineStyle(rad * 0.7, skin[1] >>> 0, s.boost ? 0.9 : 0.5, false, LineScaleMode.NORMAL, CapsStyle.ROUND, JointStyle.ROUND);
                this.path(bg, s);
            }
            let fr: BitmapData = ArcadeArt.frame("wormzer", Number(s.ra) * 180 / Math.PI, 0);
            head.visible = near && fr != null;
            label.visible = near;
            if (fr) {
                head.bitmapData = fr;
                head.smoothing = true;
                let sc: number = rad * 5.6 / fr.width;
                head.scaleX = head.scaleY = sc;
                head.x = s.rx - fr.width * sc / 2;
                head.y = s.ry - fr.height * sc / 2 - rad * 0.3;
            }
            label.x = s.rx - 70;
            label.y = s.ry - rad * 2.4 - 14;
            // (rescaled only when the zoom has moved on a little: a new scale rebuilds the name's glow)
            if (Math.abs(label.scaleX * this._zoom - 1) > 0.05) {
                label.scaleX = label.scaleY = 1 / this._zoom;
            }
            label.x = s.rx - 70 * label.scaleX;
        }
        // the minimap (every third frame: on its scale a Wormzer moves a pixel in a few; 9 October)
        let mg: any = ++this._miniT % 3 == 0 ? this._mini.graphics : null;
        if (mg) {
            mg.clear();
            mg.lineStyle(2, 0xE0501C, 0.9);
            mg.beginFill(0x000000, 0.5);
            mg.drawCircle(0, 0, 58);
            mg.endFill();
            for (s of as3.values(this._snakes)) {
                if (!s.alive) {
                    continue;
                }
                mg.lineStyle(0, 0, 0);
                mg.beginFill((s.id | 0) == this._you ? 0xFFFFFF : WormzerGame.SKINS[(s.skin | 0) % WormzerGame.SKINS.length][0] >>> 0, 1);
                mg.drawCircle(s.rx / this._arena * 58, s.ry / this._arena * 58, (s.id | 0) == this._you ? 3.5 : 2.5);
                mg.endFill();
            }
        }
        // the HUD: length, the arena's longest
        if (me) {
            this._hudLen.text = KEYS.Get("io_t3a_wz_length", { "v1": Math.round(Number(me.len)) }) + (this._kills ? "  ·  " + KEYS.Get(this._kills == 1 ? "io_t3a_wz_kill" : "io_t3a_wz_kills", { "v1": this._kills }) : "");
        }
        if (((now / 500) | 0) != (((now - 40) / 500) | 0)) {
            as3.sortOn(tops, "len", Array.NUMERIC | Array.DESCENDING);
            let lines: any[] = [];
            let i: int = 0;
            while (i < tops.length && i < 6) {
                lines.push((i + 1) + ". " + tops[i].name + "  " + Math.round(Number(tops[i].len)) + (tops[i].alive ? "" : " " + KEYS.Get("io_t3a_wz_dead")));
                i++;
            }
            this._hudTop.text = lines.join("\n");
        }
        // steering: towards the mouse, sent at most 12 times a second (or when it changes a lot)
        if (me && me.alive && !this._dead) {
            let a: number = want;
            let boost: boolean = boostWanted;
            let da: number = Math.abs(a - this._lastA);
            if (boost != this._boost || (now - this._lastSend > 80 && da > 0.02) || now - this._lastSend > 500) {
                this._lastSend = now;
                this._lastA = a;
                this._boost = boost;
                ArcadeNet.send({ "t": "in", "a": Math.round(a * 1000) / 1000, "b": boost ? 1 : 0 });
            }
        }
    }

    private path(g: any, s: any): void {
        let pts: any[] = as3.cast(s.pts, Array);
        g.moveTo(s.rx, s.ry);
        let i: int = 1;
        while (i < pts.length) {
            g.lineTo(pts[i][0], pts[i][1]);
            i++;
        }
    }

    private showDead(len: int, kills: int, by: string): void {
        this.hideDead();
        let p: Sprite = CasinoUI.panel(340, 190, 0.96);
        p.name = "wormzerDead";
        p.x = (ArcadeGame.GW - 340) / 2;
        p.y = (ArcadeGame.GH - 190) / 2;
        let head: TextField = CasinoUI.label(KEYS.Get(len < 0 ? "io_t3a_disconnected" : "io_t3a_wz_splat"), 26, 16738906, false, 340, TextFormatAlign.CENTER, "Groboldov");
        head.height = 40;
        head.y = 12;
        p.addChild(head);
        let line: TextField = CasinoUI.label(len < 0 ? KEYS.Get("io_t3a_wz_arena_lost") : KEYS.Get(kills ? (kills == 1 ? "io_t3a_wz_grew_kill" : "io_t3a_wz_grew_kills") : "io_t3a_wz_grew", { "v1": len, "v2": kills }) + "\n" + (by ? KEYS.Get("io_t3a_wz_ran_into", { "v1": by }) : KEYS.Get("io_t3a_wz_ran_out")), 13, 16777215, true, 320, TextFormatAlign.CENTER);
        line.multiline = true;
        line.wordWrap = true;
        line.height = 50;
        line.x = 10;
        line.y = 58;
        p.addChild(line);
        if (len >= 0) {
            let again: Sprite = CasinoUI.button(KEYS.Get("io_t3a_again"), 140, 38, (e: MouseEvent): void => {
                e.stopPropagation();
                ArcadeNet.send({ "t": "again" });
                this._kills = 0;
            }, true, 14);
            again.name = "wormzerAgain";
            again.x = 20;
            again.y = 130;
            p.addChild(again);
        }
        let leave: Sprite = CasinoUI.button(KEYS.Get("io_arc_leave"), 140, 38, (e: MouseEvent): void => {
            e.stopPropagation();
            this.win.page("wormzer");
        }, true, 14);
        leave.name = "wormzerLeave";
        leave.x = 180;
        leave.y = 130;
        p.addChild(leave);
        p.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this._dead = p;
        this.addChild(p);
    }

    private hideDead(): void {
        if (this._dead && this._dead.parent) {
            this._dead.parent.removeChild(this._dead);
        }
        this._dead = null;
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
    }
}
