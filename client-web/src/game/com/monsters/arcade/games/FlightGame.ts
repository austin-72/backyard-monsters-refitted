import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { ColorTransform, Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Balthazar's Flight (the Devil's Arcade). Flap (click, Space or Up) to keep Balthazar in the
 * air between rock spires hanging from the cavern roof and rising from the lava, over fire vents that
 * erupt now and then. Embers on the way are worth 25. The score is the distance (a metre every 10 pixels)
 * plus the embers. It gets faster and the gaps narrower.
 *
 * The course is the week's (the server's seed: everyone flies the same one), so the ghosts of other flights
 * (their height every tenth of a second, sent with the score and kept as the player's best) fly it too:
 * Solo shows the best flight of the week, the one just above yours, and your own. Race: two players fly it at
 * once, each seeing the other as a ghost; the longer flight wins.
 */
export class FlightGame extends ArcadeGame {
    static {
        as3.fields(this, { _y: 200, _vy: 0, _step: 0, _hoverT: 0, _dist: 0, _speed: 3.2, _embers: 0, _started: false, _dead: false, _deadT: 0, _spires: null, _vents: null, _emb: null, _nextX: 520, _path: null, _ghosts: null, _rival: null, _sky: null, _mid: null, _fx: null, _lava: null, _spireArt: false, _skyW: 1344, _world: null, _batHolder: null, _bat: null, _ghostLayer: null, _spireLayer: null, _hudScore: null, _hudInfo: null, _race: false, _countdown: 0, _doneSent: false, _rivalName: "Rival" });
    }

    private static readonly BAT_X: number = 170;

    private static readonly GRAVITY: number = 0.3;

    private static readonly FLAP: number = -5.8;

    /** Balthazar's size for what he hits (half what it was with him drawn half the size, 7 October). */
    private static readonly R: number = 8;

    /** Balthazar drawn this size against the yard's (7 October, the user's: half what it was, 1.5). */
    private static readonly BAT_SCALE: number = 0.75;

    /** The ghosts are drawn smaller than Balthazar (7 October, the user's: they crowded him). */
    private static readonly GHOST_SCALE: number = 0.45;

    /** How see-through the ghosts are (7 October, the user's: less visible; it was 0.45). */
    private static readonly GHOST_ALPHA: number = 0.22;

    /** A ghost's height is kept every this many steps. */
    private static readonly SAMPLE: int = 6;

    private static readonly SPIRE_DOWN: string = "arcade/flight/spire_down.png";

    private static readonly SPIRE_UP: string = "arcade/flight/spire_up.png";

    private static readonly EMBER: string = "arcade/flight/ember.png";

    private static readonly VENT: string = "arcade/flight/vent.png";

    private static readonly LAVA: string = "arcade/flight/lava.png";
    private _y: number;
    private _vy: number;
    private _step: int;
    /** Steps hovering before the first flap (the wings beat meanwhile). */
    private _hoverT: int;
    private _dist: number;
    private _speed: number;
    private _embers: int;
    private _started: boolean;
    private _dead: boolean;
    private _deadT: int;
    /** The course: spires {x, w, gapY, gap} and vents {x, period, phase}, embers {x, y, got}. */
    private _spires: any[];
    private _vents: any[];
    private _emb: any[];
    private _nextX: number;
    private _path: any[];
    private _ghosts: any[];
    private _rival: any;
    private _sky: Sprite;
    /** The nearer rock in front of the cavern (moves at half the course's speed, the cavern at a quarter). */
    private _mid: Sprite;
    /** Embers and the vents' cones (pooled pictures), and the lava river. */
    private _fx: Sprite;
    private _lava: Sprite;
    /** The spires are pictures once these have loaded (until then, and without them, drawn). */
    private _spireArt: boolean;
    private _skyW: number;
    private _world: Shape;
    private _batHolder: Sprite;
    private _bat: Bitmap;
    private _ghostLayer: Sprite;
    private _spireLayer: Sprite;
    private _hudScore: TextField;
    private _hudInfo: TextField;
    private _race: boolean;
    private _countdown: int;
    private _doneSent: boolean;
    private _rivalName: string;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._spires = [];
        this._vents = [];
        this._emb = [];
        this._path = [];
        this._ghosts = [];
        super.$ctor(win, mode, ctx);
        this._race = mode == "race";
        ArcadeArt.preload(["balthazar", FlightGame.SPIRE_DOWN, FlightGame.SPIRE_UP, FlightGame.EMBER, FlightGame.VENT]);
        // (7 October, the user's: more detailed art, art/devilsarcade/games: a cavern painted for the game, a
        // nearer layer of rock in front of it moving faster, basalt spires, a lava river, embers and vents)
        let sw: number = this._skyW;
        this._sky = as3.as(this.addChild(new Sprite()), Sprite);
        this._sky.graphics.beginFill(1180676, 1);
        // (as wide as the pictures: it was GW * 3, narrower than them, so past it the yard showed through the
        // see-through sky and the background seemed to vanish; 7 October)
        this._sky.graphics.drawRect(0, 0, sw * 2, ArcadeGame.GH);
        this._sky.graphics.endFill();
        // the cavern, twice side by side (it joins up: x 0 meets x 1344)
        CasinoUI.picture(this._sky, "arcade/flight/sky.jpg", 0, 0, sw, ArcadeGame.GH);
        CasinoUI.picture(this._sky, "arcade/flight/sky.jpg", sw, 0, sw, ArcadeGame.GH);
        this._mid = as3.as(this.addChild(new Sprite()), Sprite);
        CasinoUI.picture(this._mid, "arcade/flight/mid.png", 0, 0, sw, ArcadeGame.GH);
        CasinoUI.picture(this._mid, "arcade/flight/mid.png", sw, 0, sw, ArcadeGame.GH);
        // the spires: each drawn once and kept as a picture (they only move)
        this._spireLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._world = as3.as(this.addChild(new Shape()), Shape);
        this._fx = as3.as(this.addChild(new Sprite()), Sprite);
        // the lava river along the bottom, twice side by side (it scrolls with the course)
        this._lava = as3.as(this.addChild(new Sprite()), Sprite);
        this._lava.y = ArcadeGame.GH - 48;
        CasinoUI.picture(this._lava, FlightGame.LAVA, 0, 0, ArcadeGame.GW, 48);
        CasinoUI.picture(this._lava, FlightGame.LAVA, ArcadeGame.GW, 0, ArcadeGame.GW, 48);
        this._ghostLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._batHolder = as3.as(this.addChild(new Sprite()), Sprite);
        this._bat = new Bitmap();
        this._bat.smoothing = true;
        this._batHolder.addChild(this._bat);
        this._batHolder.x = FlightGame.BAT_X;
        this._hudScore = ArcadeGame.text(24, 16766346, 260, TextFormatAlign.LEFT);
        this._hudScore.x = 14;
        this._hudScore.y = 8;
        this._hudScore.name = "flightScore";
        this.hud.addChild(this._hudScore);
        this._hudInfo = ArcadeGame.text(14, 16777215, 420, TextFormatAlign.RIGHT);
        this._hudInfo.x = ArcadeGame.GW - 434;
        this._hudInfo.y = 12;
        this.hud.addChild(this._hudInfo);
        // the ghosts (Solo: from the server; a Race against nobody: the ghost the server picked)
        let list: any[] = as3.as(ctx.ghosts, Array);
        if (ctx.ghost) {
            list = [ctx.ghost];
        }
        for (let g of as3.values(list)) {
            let ys: any[] = FlightGame.decode(String(g.data));
            if (ys.length > 1) {
                this._ghosts.push(this.makeGhost(g.role == "you" ? KEYS.Get("io_t3a_name_you", { "v1": String(g.name) }) : String(g.name), ys, (g.role == "you" ? 0x9CFF6A : 0x9AD8FF) >>> 0));
            }
        }
        if (this._race) {
            let players: any[] = as3.as(ctx.players, Array);
            let you: int = ctx.you | 0;
            this._rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3a_rival");
            if (!ctx.ghost) {
                this._rival = this.makeGhost(this._rivalName, [], 16751320);
                this._rival.live = true;
            }
            this._countdown = (Number(ctx.cd) / ArcadeGame.STEP) | 0;
        }
        this.topHud();
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        // the first stretch of course
        while (this._nextX < ArcadeGame.GW + 400) {
            this.makeMore();
        }
        this.updateHud();
        // (QoL #235: the games' words in the player's language)
        this.banner(KEYS.Get(this._race ? "io_t3a_get_ready" : "io_t3a_fl_click"), 16766346, this._race ? 60 : 100000);
    }

    private makeGhost(name: string, ys: any[], color: uint): any {
        let holder: Sprite = as3.as(this._ghostLayer.addChild(new Sprite()), Sprite);
        let b: Bitmap = new Bitmap();
        b.smoothing = true;
        holder.addChild(b);
        holder.alpha = FlightGame.GHOST_ALPHA;
        holder.transform.colorTransform = new ColorTransform(0.6, 0.6, 0.6, 1, (color >> 16 & 0xFF) * 0.4, (color >> 8 & 0xFF) * 0.4, (color & 0xFF) * 0.4, 0);
        let label: TextField = ArcadeGame.text(11, color, 120, TextFormatAlign.CENTER, "Verdana");
        label.text = name;
        label.x = -60;
        label.y = -24;
        holder.addChild(label);
        holder.x = FlightGame.BAT_X;
        return { "holder": holder, "bmp": b, "ys": ys, "y": ys.length ? Number(ys[0]) : 200, "gone": false, "live": false, "crash": -1 };
    }

    /** A ghost's path: "y,y,y..." (base 36), a height every SAMPLE steps. */
    private static decode(data: string): any[] {
        let out: any[] = [];
        if (!data) {
            return out;
        }
        for (const $value of as3.values(data.split(","))) {
            let s: string = as3.str($value);
            out.push(parseInt(s, 36));
        }
        return out;
    }

    /** The next stretch of the course, from the seed. */
    private makeMore(): void {
        let difficulty: number = Math.min(1, this._nextX / 40000);
        let gap: number = 168 - 52 * difficulty - this.rnd() * 14;
        let gapY: number = 90 + gap / 2 + this.rnd() * (ArcadeGame.GH - 180 - gap);
        let w: number = 54 + this.rint(26);
        let sp: any = { "x": this._nextX, "w": w, "gapY": gapY, "gap": gap, "seed": this.rint(1000) };
        this._spires.push(sp);
        // (7 October, performance: drawn once into its own shape, kept as a picture by the renderer while it
        // scrolls; it was traced again, gradient and all, every frame)
        if (this._spireLayer) {
            this.spireShape(sp);
        }
        // an ember in the gap, sometimes two
        if (this.rnd() < 0.7) {
            this._emb.push({ "x": this._nextX + w / 2, "y": gapY, "got": false });
        }
        let space: number = 250 + this.rnd() * 70 - difficulty * 40;
        // a fire vent in the stretch after it, now and then
        if (this.rnd() < 0.18 + 0.25 * difficulty) {
            this._vents.push({ "x": this._nextX + w + space / 2, "period": 110 + this.rint(60), "phase": this.rint(100) });
        }
        this._nextX += w + space;
    }

    /**
     * A spire pair's picture: the basalt spires (pictures, stretched to its width and to reach the roof and the
     * lava) once they have loaded, drawn until then.
     */
    private spireShape(sp: any): void {
        if (sp.shape && sp.shape.parent) {
            sp.shape.parent.removeChild(sp.shape);
        }
        let w: number = Number(sp.w);
        let top: number = Number(sp.gapY) - Number(sp.gap) / 2;
        let bottom: number = Number(sp.gapY) + Number(sp.gap) / 2;
        let down: BitmapData = ArcadeArt.picture(FlightGame.SPIRE_DOWN);
        let up: BitmapData = ArcadeArt.picture(FlightGame.SPIRE_UP);
        let holder: Sprite = new Sprite();
        if (down && up) {
            // (the pictures' spires are 150 of their 160 pixels wide, the tip at the bottom (top) edge)
            let sx: number = (w + 8) / 150;
            let a: Bitmap = new Bitmap(down);
            a.smoothing = true;
            a.scaleX = sx;
            // (the whole spire from the roof to its tip: it tapers all the way, and what it hits follows that)
            a.scaleY = (top + 6) / (down.height - 6);
            a.x = (w - down.width * sx) / 2;
            a.y = top + 4 - down.height * a.scaleY;
            holder.addChild(a);
            let b: Bitmap = new Bitmap(up);
            b.smoothing = true;
            b.scaleX = sx;
            b.scaleY = (ArcadeGame.GH - bottom + 6) / (up.height - 6);
            b.x = (w - up.width * sx) / 2;
            b.y = bottom - 4;
            holder.addChild(b);
        } else {
            let sh: Shape = as3.as(holder.addChild(new Shape()), Shape);
            this.spire(sh.graphics, 0, w, 0, top, true, sp.seed | 0);
            this.spire(sh.graphics, 0, w, bottom, ArcadeGame.GH, false, ((sp.seed | 0) + 7) | 0);
        }
        holder.cacheAsBitmap = true;
        holder.visible = false;
        this._spireLayer.addChild(holder);
        sp.shape = holder;
    }

    /**
     * Does Balthazar touch this spire pair? The spires taper from the roof (and the lava) to their tips, so
     * what is hit is a wedge, not a block (a block the spire's width hit him beside the tip: 7 October, the
     * pictures' spires are cones). Three points down his middle, each with his size either side.
     */
    private hitsSpire(s: any, wx: number): boolean {
        let cx: number = Number(s.x) + Number(s.w) / 2;
        let half: number = Number(s.w) / 2;
        let top: number = Number(s.gapY) - Number(s.gap) / 2;
        let bottom: number = Number(s.gapY) + Number(s.gap) / 2;
        for (const $value of as3.values([this._y - FlightGame.R, this._y, this._y + FlightGame.R])) {
            let py: number = Number($value);
            let hw: number = -1;
            if (py < top) {
                hw = half * Math.min(1, (top - py) / Math.max(1, top)) * 0.95;
            } else if (py > bottom) {
                hw = half * Math.min(1, (py - bottom) / Math.max(1, ArcadeGame.GH - bottom)) * 0.95;
            }
            if (hw >= 0 && Math.abs(wx - cx) < hw + (py == this._y ? FlightGame.R : FlightGame.R * 0.35)) {
                return true;
            }
        }
        return false;
    }

    /** A picture drawn into a pooled shape, centred (x, y given to poolShape), at `scale`. */
    private static artDrawer(key: string, scale: number, ax: number = 0.5, ay: number = 0.5): Function {
        return (g: any): void => {
            let bmd: BitmapData = ArcadeArt.picture(key);
            if (!bmd) {
                return;
            }
            let m: Matrix = new Matrix();
            m.scale(scale, scale);
            m.translate(-bmd.width * scale * ax, -bmd.height * scale * ay);
            g.beginBitmapFill(bmd, m, false, true);
            g.drawRect(-bmd.width * scale * ax, -bmd.height * scale * ay, bmd.width * scale, bmd.height * scale);
            g.endFill();
        };
    }

    private onDown(e: MouseEvent): void {
        this.flap();
    }

    public override keyDown(code: int): void {
        super.keyDown(code);
        if (code == Keyboard.SPACE || code == Keyboard.UP || code == 87) {
            this.flap();
        }
    }

    private flap(): void {
        if (this._dead || this.ended || this._countdown > 0) {
            return;
        }
        if (!this._started) {
            this._started = true;
            this.banner("", 0, 1);
        }
        this._vy = FlightGame.FLAP;
        SOUNDS.Play("click1", 0.25);
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            if (--this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_fl_fly"), 16747050, 30);
                this._started = true;
                this._vy = FlightGame.FLAP;
            }
            return;
        }
        if (!this._started) {
            // (hovering before the first flap: its own count; the flight's steps, which set the speed, the vents
            // and where the ghosts are, start at the first flap; 9 October)
            this._y = 200 + Math.sin(this._hoverT++ * 0.08) * 6;
            return;
        }
        if (this._dead) {
            this._deadT++;
            this._vy += FlightGame.GRAVITY;
            this._y = Math.min(ArcadeGame.GH + 40, this._y + this._vy);
            if (this._deadT == 50) {
                this.crashed();
            }
            return;
        }
        this._step++;
        this._speed = Math.min(6, 3.2 + this._step * 0.0006);
        this._dist += this._speed;
        this._vy = Math.min(9, this._vy + FlightGame.GRAVITY);
        this._y += this._vy;
        if (this._step % FlightGame.SAMPLE == 0) {
            this._path.push(Math.round(this._y));
            // (sent all the race, the rival crashed or not: a crashed rival watching saw this one stop in the air,
            // and a race out of time was ranked on an old score; 9 October)
            if (this._race) {
                ArcadeNet.send({ "t": "s", "score": this.score, "y": Math.round(this._y), "k": this._step });
            }
        }
        while (this._nextX - this._dist < ArcadeGame.GW + 400) {
            this.makeMore();
        }
        // what it hits
        let wx: number = this._dist + FlightGame.BAT_X;
        if (this._y < 18 || this._y > ArcadeGame.GH - 16) {
            this.die();
            return;
        }
        for (let s of as3.values(this._spires)) {
            if (s.x > wx + 60) {
                break;
            }
            if (wx + FlightGame.R > s.x + 6 && wx - FlightGame.R < s.x + s.w - 6 && this.hitsSpire(s, wx)) {
                this.die();
                return;
            }
        }
        for (let v of as3.values(this._vents)) {
            if (Math.abs(v.x - wx) < 26 && this.ventHeight(v) > 0 && this._y > ArcadeGame.GH - this.ventHeight(v)) {
                this.die();
                return;
            }
        }
        for (let e of as3.values(this._emb)) {
            if (!e.got && Math.abs(e.x - wx) < 22 && Math.abs(e.y - this._y) < 22) {
                e.got = true;
                this._embers++;
                SOUNDS.Play("chaching", 0.35);
            }
        }
        // forget what has scrolled away
        while (this._spires.length && this._spires[0].x + this._spires[0].w < this._dist - 50) {
            let gone: any = this._spires.shift();
            if (gone.shape && gone.shape.parent) {
                gone.shape.parent.removeChild(gone.shape);
            }
        }
        while (this._emb.length && this._emb[0].x < this._dist - 50) {
            this._emb.shift();
        }
        while (this._vents.length && this._vents[0].x < this._dist - 50) {
            this._vents.shift();
        }
        if (this._step % 10 == 0) {
            this.updateHud();
        }
    }

    /** How high a vent's fire is now (0: resting). */
    private ventHeight(v: any): number {
        let t: int = ((this._step + (v.phase | 0)) % (v.period | 0)) | 0;
        let on: int = 50;
        if (t > on) {
            return 0;
        }
        return Math.sin(t / on * Math.PI) * 210;
    }

    public get score(): int {
        return (((this._dist / 10) | 0) + this._embers * 25) | 0;
    }

    private die(): void {
        this._dead = true;
        this._vy = -3;
        SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0));
        this.banner(KEYS.Get("io_t3a_fl_crash"), 16738906, 40);
        this.updateHud();
    }

    private crashed(): void {
        if (this._race) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this.score });
                this.banner(KEYS.Get("io_t3a_waiting_for", { "v1": this._rivalName }), 16766346, 100000);
                this.leaveButton();
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_fl_crashed"), "score": this.score, "score2": this._embers, "ghost": this._path.map((y: any, i: int, a: any[]): string => {
            return as3.str((Math.max(0, Number(y)) | 0).toString(36));
        }).join(","), "line": KEYS.Get("io_t3a_fl_line", { "v1": CasinoUI.number((this._dist / 10) | 0), "v2": this._embers }) + "\n" + KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this.score) }) });
    }

    private updateHud(): void {
        this._hudScore.text = CasinoUI.number(this.score);
        let info: string = KEYS.Get("io_t3a_fl_info", { "v1": (this._dist / 10) | 0, "v2": this._embers });
        if (this._rival && this._rival.live) {
            info += "  ·  " + KEYS.Get(this._rival.gone ? "io_t3a_fl_rival_crashed" : "io_t3a_fl_rival_flying", { "v1": this._rivalName });
        }
        this._hudInfo.text = info;
    }

    protected override draw(alpha: number): void {
        let gy: number = NaN;
        let dist: number = Number(this._dist + (this._started && !this._dead ? this._speed * alpha : 0));
        this._sky.x = -((dist * 0.25) % this._skyW);
        this._mid.x = -((dist * 0.5) % this._skyW);
        this._lava.x = -(dist % ArcadeGame.GW);
        // the spires made pictures once their pictures have come
        if (!this._spireArt && ArcadeArt.picture(FlightGame.SPIRE_DOWN) && ArcadeArt.picture(FlightGame.SPIRE_UP)) {
            this._spireArt = true;
            for (let rs of as3.values(this._spires)) {
                this.spireShape(rs);
            }
        }
        let art: boolean = ArcadeArt.picture(FlightGame.EMBER) != null && ArcadeArt.picture(FlightGame.VENT) != null;
        this.poolBegin();
        let g: any = this._world.graphics;
        g.clear();
        // spires: from the roof and from the lava, basalt with glowing cracks (their own kept pictures, moved)
        for (let s of as3.values(this._spires)) {
            let x: number = s.x - dist;
            let seen: boolean = !(x > ArcadeGame.GW + 10 || x + s.w < -10);
            if (s.shape) {
                s.shape.visible = seen;
                if (seen) {
                    s.shape.x = x;
                }
            } else if (seen) {
                this.spire(g, x, Number(s.w), 0, s.gapY - s.gap / 2, true, s.seed | 0);
                this.spire(g, x, Number(s.w), Number(s.gapY + s.gap / 2), ArcadeGame.GH, false, ((s.seed | 0) + 7) | 0);
            }
        }
        // vents
        for (let v of as3.values(this._vents)) {
            let vx: number = v.x - dist;
            if (vx < -40 || vx > ArcadeGame.GW + 40) {
                continue;
            }
            if (art) {
                this.poolShape(this._fx, "vent", FlightGame.artDrawer(FlightGame.VENT, 0.7, 0.5, 1), vx, ArcadeGame.GH - 4);
            } else {
                g.lineStyle(2, 0x1A1010, 1);
                g.beginFill(0x3A2A28, 1);
                g.moveTo(vx - 26, ArcadeGame.GH);
                g.lineTo(vx - 12, ArcadeGame.GH - 22);
                g.lineTo(vx + 12, ArcadeGame.GH - 22);
                g.lineTo(vx + 26, ArcadeGame.GH);
                g.endFill();
            }
            let h: number = this.ventHeight(v);
            if (h > 0) {
                let fm: Matrix = new Matrix();
                fm.createGradientBox(40, h, -Math.PI / 2, vx - 20, ArcadeGame.GH - 22 - h);
                g.lineStyle(0, 0, 0);
                g.beginGradientFill(GradientType.LINEAR, [0xFFE080, 0xFF6A1A, 0xC82A0A], [1, 0.9, 0.2], [0, 140, 255], fm);
                g.moveTo(vx - 14, ArcadeGame.GH - 22);
                g.curveTo(vx - 24, ArcadeGame.GH - 22 - h * 0.6, vx, ArcadeGame.GH - 22 - h);
                g.curveTo(vx + 24, ArcadeGame.GH - 22 - h * 0.6, vx + 14, ArcadeGame.GH - 22);
                g.endFill();
            } else if ((this._step + (v.phase | 0)) % (v.period | 0) > (v.period | 0) - 25) {
                // (about to blow: it smokes)
                g.beginFill(0xFF8A2A, 0.5);
                g.drawCircle(vx, ArcadeGame.GH - 26, 6 + Math.random() * 4);
                g.endFill();
            }
        }
        // embers
        for (let e of as3.values(this._emb)) {
            if (e.got) {
                continue;
            }
            let ex: number = e.x - dist;
            if (ex < -30 || ex > ArcadeGame.GW + 30) {
                continue;
            }
            if (art) {
                this.poolShape(this._fx, "ember", FlightGame.artDrawer(FlightGame.EMBER, 0.62), ex, Number(e.y + Math.sin((this._step + e.x) / 9) * 2));
                continue;
            }
            g.lineStyle(0, 0, 0);
            g.beginFill(0xFF6A1A, 0.35);
            g.drawCircle(ex, e.y, 13);
            g.endFill();
            g.beginFill(0xFFE080, 1);
            g.drawCircle(ex, e.y, 6);
            g.endFill();
        }
        this.poolEnd();
        // the lava at the bottom (until its picture comes)
        if (this._lava.numChildren == 0) {
            let lm: Matrix = new Matrix();
            lm.createGradientBox(ArcadeGame.GW, 22, Math.PI / 2, 0, ArcadeGame.GH - 18);
            g.beginGradientFill(GradientType.LINEAR, [0xFFB040, 0xC83A0A], [1, 1], [0, 255], lm);
            g.drawRect(0, ArcadeGame.GH - 16, ArcadeGame.GW, 16);
            g.endFill();
        }
        // Balthazar
        // (26 October: his frames there and back (0 to 6, then 5 to 1): from the last straight to the first he jumped up)
        let beat: int = (((this._started ? this._step : this._hoverT) / 3) | 0) % 12;
        let row: int = (this._dead ? 0 : (beat <= 6 ? beat : 12 - beat)) | 0;
        let f: BitmapData = ArcadeArt.frame("balthazar", 0, row);
        if (f) {
            this._bat.bitmapData = f;
            this._bat.smoothing = true;
            this._bat.scaleX = this._bat.scaleY = FlightGame.BAT_SCALE;
            this._bat.x = -f.width * FlightGame.BAT_SCALE / 2;
            this._bat.y = -f.height * FlightGame.BAT_SCALE / 2;
        }
        this._batHolder.y = Number(this._y + (this._started && !this._dead ? this._vy * alpha : 0));
        this._batHolder.rotation = this._dead ? Math.min(90, this._deadT * 4) : Math.max(-25, Math.min(40, this._vy * 4));
        // the ghosts, at the same step of their flights
        let k: int = Math.max(0, ((this._step / FlightGame.SAMPLE) | 0) - 1) | 0;
        for (let gh of as3.values(this._ghosts.concat(this._rival ? [this._rival] : []))) {
            if (gh.live) {
                gy = Number(gh.y);
                gh.holder.visible = this._started || this._countdown > 0;
            } else {
                if (k >= gh.ys.length) {
                    // its flight ended here: it falls away
                    gh.holder.visible = false;
                    continue;
                }
                let a0: number = Number(gh.ys[k]);
                let a1: number = k + 1 < gh.ys.length ? Number(gh.ys[k + 1]) : a0;
                gy = a0 + (a1 - a0) * ((this._step % FlightGame.SAMPLE) / FlightGame.SAMPLE);
                gh.holder.visible = this._started;
            }
            if (gh.gone) {
                gh.holder.visible = false;
                continue;
            }
            gh.holder.y = gy;
            if (f) {
                gh.bmp.bitmapData = f;
                gh.bmp.scaleX = gh.bmp.scaleY = FlightGame.GHOST_SCALE;
                gh.bmp.x = -f.width * FlightGame.GHOST_SCALE / 2;
                gh.bmp.y = -f.height * FlightGame.GHOST_SCALE / 2;
            }
        }
    }

    private spire(g: any, x: number, w: number, y0: number, y1: number, fromTop: boolean, seed: int): void {
        let t: number = NaN;
        let yy: number = NaN;
        let inset: number = NaN;
        if (y1 - y0 < 2) {
            return;
        }
        let m: Matrix = new Matrix();
        m.createGradientBox(w, y1 - y0, 0, x, y0);
        g.lineStyle(3, 0xFF7A2A, 1);
        g.beginGradientFill(GradientType.LINEAR, [0x3A2E32, 0x7A6662, 0x2A2024], [1, 1, 1], [0, 90, 255], m);
        // a jagged column, narrower at its tip
        let tip: number = fromTop ? y1 : y0;
        let base: number = fromTop ? y0 : y1;
        g.moveTo(x, base);
        let steps: int = 5;
        let i: int = 1;
        while (i <= steps) {
            t = i / steps;
            yy = base + (tip - base) * t;
            inset = t * t * w * 0.28 + ((seed * (i + 3)) % 7 - 3);
            g.lineTo(x + inset, yy);
            i++;
        }
        g.lineTo(x + w / 2, tip + (fromTop ? 8 : -8));
        i = steps;
        while (i >= 1) {
            t = i / steps;
            yy = base + (tip - base) * t;
            inset = t * t * w * 0.28 + ((seed * (i + 5)) % 7 - 3);
            g.lineTo(x + w - inset, yy);
            i--;
        }
        g.lineTo(x + w, base);
        g.endFill();
        // a glowing crack
        g.lineStyle(2, 0xFF6A1A, 0.8);
        g.moveTo(x + w * 0.45, base);
        g.lineTo(x + w * 0.55, base + (tip - base) * 0.35);
        g.lineTo(x + w * 0.42, base + (tip - base) * 0.6);
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s" && this._rival) {
            this._rival.y = Number(msg.y);
        } else if (t == "done" && this._rival) {
            this._rival.gone = true;
            this.banner(KEYS.Get("io_t3a_fl_crashed_at", { "v1": this._rivalName, "v2": CasinoUI.number(msg.score | 0) }), 10148095, 60);
            this.updateHud();
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": ArcadeGame.ioVsLine(CasinoUI.number(scores[you] | 0), this._rivalName, CasinoUI.number(Math.max(0, scores[1 - you] | 0)), msg.reason == "left", won), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_race_lost"), "submit": false });
        }
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
    }
}
