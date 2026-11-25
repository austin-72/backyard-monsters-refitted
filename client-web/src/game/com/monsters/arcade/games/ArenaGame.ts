import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Shape, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { getTimer } from "flash/utils";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, GLOBAL, KEYS } from "@game";

/**
 * Inferno-only: what the Devil's Arcade's arena games share (7 October, later): Lava Floor, Bone Brawl, Ember
 * Hockey and Soul Snatch, run on the server (server/src/services/arcade/arena.ts) and drawn here.
 *
 * Each monster is a body the server moves; the game sends the keys (the way to go, the action key) and draws:
 *  - the others DELAY steps behind the server's clock, between the steps either side (ArcadeGame.stepNow), as
 *    Fusebug Blast does, so a late message is waited for, not jumped over;
 *  - the player's own monster moved here at once (its speed, its dash), said with each key, and pulled gently
 *    towards the server's place (snapped back if far off, as when it is knocked about).
 *
 * A game draws its arena (arenaStart), its own things each frame (drawLive), and hears its own messages and
 * events (arenaNet, arenaEvent).
 */
export class ArenaGame extends ArcadeGame {
    static {
        as3.fields(this, { _rk: 0, _you: 0, _players: null, _stepMs: 50, _speed: 140, _radius: 15, _dash: null, _bounds: null, _teams: false, _p: null, _own: null, _tm: -3.5, _countdownEnd: 0, _ground: null, _under: null, _bodies: null, _over: null, _mx: 0, _my: 0, _frameMs: 25, _status: null, _floats: null, _ioOutF: 0 });
    }

    protected static readonly WHO: any[] = ["spurtz", "sabnox", "valgos", "malphus", "zagnoid", "grokus"];

    protected static readonly COLORS: any[] = [0xFFB040, 0x9AD8FF, 0x9CFF6A, 0xFF6AC0, 0xFF6A4A, 0xC09AFF];

    protected static readonly TEAM: any[] = [0xFF5A3A, 0x5AB0FF];

    protected static readonly TEAM_NAME: any[] = ["Red", "Blue"];

    private static readonly DELAY: number = 1.5;
    /** The server step drawn this frame (render's; the games' own things are drawn at it too: asking stepDelay
     * again moved its smoothing on twice a frame; 9 October). */
    protected _rk: number;
    protected _you: int;
    protected _players: any[];
    protected _stepMs: number;
    protected _speed: number;
    protected _radius: number;
    protected _dash: any[];
    protected _bounds: any[];
    protected _teams: boolean;
    /** [{x, y, face, alive, flags, snaps, bmp, ring, label, lx, ly, walk, dx, dy}] */
    protected _p: any[];
    /** The player's own monster, moved here: {x, y, on, dash, dx, dy, cool}. */
    protected _own: any;
    protected _tm: number;
    protected _countdownEnd: int;
    protected _ground: Sprite;
    protected _under: Shape;
    protected _bodies: Sprite;
    protected _over: Shape;
    protected _mx: number;
    protected _my: number;
    protected _frameMs: number;
    protected _status: TextField;
    protected _floats: any[];
    /** Inferno-only (QoL #370): the server's steps seen since the player's own monster was out. */
    private _ioOutF: int;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._players = [];
        this._dash = [0, 0, 0];
        this._bounds = [0, 0, ArcadeGame.GW, ArcadeGame.GH];
        this._p = [];
        this._own = { "x": 0, "y": 0, "on": false, "dash": 0, "dx": 0, "dy": 0, "cool": 0 };
        this._floats = [];
        super.$ctor(win, mode, ctx);
        ArcadeArt.preload(ArenaGame.WHO);
        this._ground = as3.as(this.addChild(new Sprite()), Sprite);
        this._under = as3.as(this.addChild(new Shape()), Shape);
        this._bodies = as3.as(this.addChild(new Sprite()), Sprite);
        this._over = as3.as(this.addChild(new Shape()), Shape);
        this._status = ArcadeGame.text(16, 16777215, 400, TextFormatAlign.CENTER);
        this._status.x = (ArcadeGame.GW - 400) / 2;
        this._status.y = 2;
        this._status.name = "arenaStatus";
        this.hud.addChild(this._status);
        this.topHud();
        // phones and tablets: a stick to move, a button for the action key (Space)
        this.touchControls({ "stick": "8", "buttons": [{ "label": this.actionLabel, "code": Keyboard.SPACE, "r": 40, "x": ArcadeGame.GW - 70, "y": ArcadeGame.GH - 74 }] });
        this.begin(ctx);
    }

    /** The action key's name on the touch button (SHOVE, SHOOT, DASH, THROW). */
    protected get actionLabel(): string {
        return "GO";
    }

    private begin(m: any): void {
        this._you = m.you | 0;
        this._players = as3.as(m.players, Array);
        this._stepMs = Number(m.step);
        this._speed = Number(m.speed);
        this._radius = Number(m.radius);
        this._dash = as3.as(m.dash, Array);
        this._bounds = as3.as(m.bounds, Array);
        this._countdownEnd = (getTimer() + (m.cd | 0)) | 0;
        let start: any[] = as3.as(m.p, Array);
        this._teams = Boolean(m.teams);
        let i: int = 0;
        while (i < this._players.length) {
            let look: any = this.lookOf(i);
            let ring: Shape = as3.as(this._bodies.addChild(new Shape()), Shape);
            ring.graphics.lineStyle(3, look.color >>> 0, 0.95);
            ring.graphics.drawEllipse(-this._radius, -this._radius * 0.42, this._radius * 2, this._radius * 0.84);
            if (i == this._you) {
                ring.graphics.lineStyle(1, 16777215, 0.9);
                ring.graphics.drawEllipse(-this._radius - 3, -this._radius * 0.42 - 2, this._radius * 2 + 6, this._radius * 0.84 + 4);
            }
            let bmp: Bitmap = as3.as(this._bodies.addChild(new Bitmap()), Bitmap);
            bmp.smoothing = true;
            // (QoL #235: the games' words in the player's language)
            let label: TextField = CasinoUI.label(i == this._you ? KEYS.Get("io_t3a_name_you", { "v1": String(this._players[i].name) }) : String(this._players[i].name), 10, look.color >>> 0, true, 120, TextFormatAlign.CENTER);
            label.filters = [new GlowFilter(0x000000, 1, 3, 3, 6, 1)];
            label.mouseEnabled = false;
            this._bodies.addChild(label);
            // (a monster's badge: what its game shows on it, drawn again only when that changes)
            let badge: Shape = as3.as(this._bodies.addChild(new Shape()), Shape);
            let x: number = start && start[i] ? Number(start[i][0]) / 10 : ArcadeGame.GW / 2;
            let y: number = start && start[i] ? Number(start[i][1]) / 10 : ArcadeGame.GH / 2;
            this._p.push({ "x": x, "y": y, "face": 90, "alive": true, "flags": 2, "snaps": [], "bmp": bmp, "ring": ring, "label": label, "badge": badge, "badgeKey": "", "lx": x, "ly": y, "walk": 0, "team": this._players[i].team | 0 });
            i++;
        }
        this._own.x = this._p[this._you].x;
        this._own.y = this._p[this._you].y;
        this._own.on = true;
        this.arenaStart(m.arena, m);
        this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 60);
    }

    /** A monster's picture and colour: its seat's (teams: its team's colour). */
    protected lookOf(i: int): any {
        let team: int = this._players[i].team | 0;
        return { "sheet": ArenaGame.WHO[i % ArenaGame.WHO.length], "color": this._teams ? ArenaGame.TEAM[team % 2] : ArenaGame.COLORS[i % ArenaGame.COLORS.length] };
    }

    // ---- for the games
    protected arenaStart(a: any, m: any): void {
    }

    protected arenaNet(msg: any): void {
    }

    protected arenaEvent(e: any): void {
    }

    protected arenaState(msg: any): void {
    }

    protected drawLive(now: int): void {
    }

    /** The result's words (the title is the game's: won, lost, a draw). */
    protected endLine(msg: any, won: boolean): string {
        return "";
    }

    /** The match's end, for the Inferno-only quest book (the default: nothing). */
    protected endQuest(msg: any, won: boolean): void {
    }

    /**
     * A monster's badge (hearts over it, a glow round it...), drawn round (0, 0) at its feet: a key for what it
     * shows (it is drawn again only when the key changes) and the drawing. The default: nothing.
     */
    protected badgeKey(i: int, p: any): string {
        return "";
    }

    protected drawBadge(i: int, p: any, g: any): void {
    }

    /** Can the player's own monster stand there (rocks and the like)? */
    protected ownFree(x: number, y: number): boolean {
        return true;
    }

    /** Is the player's own monster kept inside the bounds (Lava Floor lets it go over the edge)? */
    protected ownKeptIn(): boolean {
        return true;
    }

    /** Whether the action key is a dash for the player's own monster now (the game may use it otherwise: a shot,
     * or not at all; 9 October: the monster lunged here and was pulled back). */
    protected ownDashes(): boolean {
        return true;
    }

    /** How fast the player's own monster goes now (the game may slow it). */
    protected ownSpeed(): number {
        return this._speed;
    }

    protected get mine(): any {
        return this._p[this._you];
    }

    protected float(text: string, x: number, y: number, color: uint, size: int = 14): void {
        let t: TextField = ArcadeGame.text(size, color, 240, TextFormatAlign.CENTER);
        t.text = text;
        t.x = x - 120;
        t.y = y - 12;
        this.hud.addChild(t);
        this._floats.push({ "t": t, "life": 45 });
    }

    protected nameOf(i: int): string {
        return this._players[i] ? String(this._players[i].name) : "?";
    }

    // ---- the keys
    public override keyDown(code: int): void {
        let was: boolean = this.key(code);
        super.keyDown(code);
        if (code == Keyboard.SPACE && !was) {
            this.action();
        }
        this.steer();
    }

    public override keyUp(code: int): void {
        super.keyUp(code);
        this.steer();
    }

    /** The action key: sent, and the player's own dash begun here at once (in the games with one). */
    protected action(extra: any = null): void {
        if (this._tm < 0 || this.ended || !this.mine.alive) {
            return;
        }
        let m: any = { "t": "in", "a": 1, "mx": this._mx, "my": this._my };
        for (let k in extra) {
            m[k] = extra[k];
        }
        this.sendIn(m);
        if (Number(this._dash[0]) > 0 && this._own.cool <= 0 && this._own.dash <= 0 && this.ownDashes()) {
            let dx: number = this._mx;
            let dy: number = this._my;
            if (Math.abs(dx) + Math.abs(dy) < 0.1) {
                let f: number = Number(this.mine.face) * Math.PI / 180;
                dx = Math.cos(f);
                dy = Math.sin(f);
            }
            let d: number = Math.sqrt(dx * dx + dy * dy);
            this._own.dx = dx / d;
            this._own.dy = dy / d;
            this._own.dash = Number(this._dash[1]);
            this._own.cool = Number(this._dash[2]);
        }
    }

    private steer(): void {
        let mx: number = (this.key(Keyboard.RIGHT) || this.key(68) ? 1 : 0) - (this.key(Keyboard.LEFT) || this.key(65) ? 1 : 0);
        let my: number = (this.key(Keyboard.DOWN) || this.key(83) ? 1 : 0) - (this.key(Keyboard.UP) || this.key(87) ? 1 : 0);
        if (mx != 0 && my != 0) {
            mx *= 0.7071;
            my *= 0.7071;
        }
        if (mx != this._mx || my != this._my) {
            this._mx = mx;
            this._my = my;
            this.sendIn({ "t": "in", "mx": mx, "my": my });
        }
    }

    /** A message with where the player's own monster is here (the server puts it there if it is close). */
    protected sendIn(m: any): void {
        if (this._own.on && this.mine.alive) {
            m.x = Math.round(this._own.x * 10) / 10;
            m.y = Math.round(this._own.y * 10) / 10;
        }
        ArcadeNet.send(m);
    }

    // ---- the server's messages
    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "f") {
            this._tm = Number(msg.tm) / 10;
            let k: number = Number(msg.k);
            this.stepSeen(k, this._stepMs);
            let ps: any[] = as3.as(msg.p, Array);
            let i: int = 0;
            while (i < ps.length && i < this._p.length) {
                let p: any = this._p[i];
                p.x = Number(ps[i][0]) / 10;
                p.y = Number(ps[i][1]) / 10;
                p.sface = ps[i][2] | 0;
                p.flags = ps[i][3] | 0;
                p.alive = (p.flags & 2) != 0;
                p.snaps.push([k, p.x, p.y]);
                if (p.snaps.length > 24) {
                    p.snaps.shift();
                }
                i++;
            }
            this.arenaState(msg);
            for (let e of as3.values(msg.e)) {
                if (e.e == "out") {
                    if ((e.i | 0) == this._you) {
                        this.banner(KEYS.Get("io_t3a_youre_out"), 16738906, 60);
                    } else if ((e.by | 0) == this._you) {
                        this.banner(KEYS.Get("io_t3a_you_got", { "v1": this.nameOf(e.i | 0).toUpperCase() }), 10289002, 40);
                    }
                } else if (e.e == "bot") {
                    this.float(KEYS.Get("io_t3a_bot_plays_on", { "v1": this.nameOf(e.i | 0) }), ArcadeGame.GW / 2, 60, 16766346);
                }
                this.arenaEvent(e);
            }
            // (QoL #370: out, and the match still on a step later (out last, it ends at once): LEAVE, and the match
            // goes on being drawn to watch)
            if (GLOBAL.INFERNO_ONLY && !this.ended && this.mine && !this.mine.alive && ++this._ioOutF >= 2) {
                this.ioOutLeave(ArcadeGame.GW / 2 - 45, ArcadeGame.GH - 38);
            }
        } else if (t == "end") {
            let teams: boolean = Boolean(msg.teams);
            let mineIs: int = teams ? this._players[this._you].team | 0 : this._you;
            let won: boolean = (msg.winner | 0) == mineIs;
            let drawn: boolean = (msg.winner | 0) == -1 && msg.reason != "left";
            // (the server's result for each: out before the last ones fell together is a loss; 9 October)
            let results: any[] = as3.as(msg.results, Array);
            if (results && results.length > this._you && results[this._you] != null) {
                won = results[this._you] == "win";
                drawn = results[this._you] == "draw";
            }
            try {
                this.endQuest(msg, won);
            } catch (e) {
            }
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (drawn ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (drawn ? 0xFFD58A : 0xFF6A5A), "line": this.endLine(msg, won), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        } else if (t == "pong") {
            this.pong(msg);
        } else {
            this.arenaNet(msg);
        }
    }

    // ---- drawing
    public override tick(ms: number): void {
        this._frameMs = ms;
        super.tick(ms);
        this.render();
    }

    /** Where the server had a monster at step rk: between the steps either side (the newest, held). */
    private sample(p: any, rk: number): any[] {
        let sn: any[] = as3.cast(p.snaps, Array);
        let n: int = sn.length;
        if (n == 0) {
            return [p.x, p.y];
        }
        if (rk <= sn[0][0]) {
            return [sn[0][1], sn[0][2]];
        }
        let i: int = (n - 1) | 0;
        while (i > 0 && sn[i][0] > rk) {
            i--;
        }
        if (i == n - 1) {
            return [sn[i][1], sn[i][2]];
        }
        let a: any[] = as3.cast(sn[i], Array);
        let b: any[] = as3.cast(sn[i + 1], Array);
        let f: number = (rk - a[0]) / Math.max(1, b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }

    /** The player's own monster: moved here by its keys (and its dash), pulled towards the server's place. */
    private predict(): void {
        let p: any = this.mine;
        let o: any = this._own;
        let dt: number = Math.min(0.1, this._frameMs / 1000);
        if (!p.alive) {
            o.x = p.x;
            o.y = p.y;
            return;
        }
        if (this._tm >= 0) {
            if (o.cool > 0) {
                o.cool -= dt;
            }
            let vx: number = NaN;
            let vy: number = NaN;
            if (o.dash > 0) {
                o.dash -= dt;
                vx = o.dx * Number(this._dash[0]);
                vy = o.dy * Number(this._dash[0]);
            } else {
                let sp: number = this.ownSpeed();
                vx = this._mx * sp;
                vy = this._my * sp;
            }
            let nx: number = Number(o.x + vx * dt);
            let ny: number = Number(o.y + vy * dt);
            if (this.ownKeptIn()) {
                nx = Math.max(Number(this._bounds[0]) + this._radius, Math.min(Number(this._bounds[2]) - this._radius, nx));
                ny = Math.max(Number(this._bounds[1]) + this._radius, Math.min(Number(this._bounds[3]) - this._radius, ny));
            }
            if (this.ownFree(nx, ny)) {
                o.x = nx;
                o.y = ny;
            } else if (this.ownFree(nx, Number(o.y))) {
                o.x = nx;
            } else if (this.ownFree(Number(o.x), ny)) {
                o.y = ny;
            }
        }
        let sn: any[] = as3.cast(p.snaps, Array);
        if (!sn.length) {
            return;
        }
        let last: any[] = as3.cast(sn[sn.length - 1], Array);
        let ex: number = last[1] - o.x;
        let ey: number = last[2] - o.y;
        if (ex * ex + ey * ey > 70 * 70) {
            o.x = last[1];
            o.y = last[2];
            return;
        }
        // the server is behind by about the round trip while moving: that much ahead is expected
        let lag: number = this.rtt / 1000 + (getTimer() - this.stepTime(Number(last[0]), this._stepMs)) / 1000;
        // (not in the countdown: nothing moves then, the monster crept towards the keys held; 9 October)
        let moving: boolean = this._tm >= 0 && (Math.abs(this._mx) + Math.abs(this._my) > 0 || o.dash > 0);
        let lead: number = Number(moving ? Math.min(40, this.ownSpeed() * lag) : 0);
        let tx: number = Number(last[1] + this._mx * lead);
        let ty: number = Number(last[2] + this._my * lead);
        let pull: number = 1 - Math.exp(-dt * (moving ? 2.5 : 6));
        o.x += (tx - o.x) * pull;
        o.y += (ty - o.y) * pull;
    }

    private render(): void {
        let x: number = NaN;
        let y: number = NaN;
        let now: int = getTimer();
        if (this._countdownEnd > now) {
            this.banner(String(Math.ceil((this._countdownEnd - now) / 1000)), 16766346, 2);
        } else if (this._countdownEnd > 0) {
            this._countdownEnd = 0;
            this.banner(KEYS.Get("io_t3a_go"), 16747050, 30);
        }
        this.pingNow();
        let rk: number = this.stepNow(this._stepMs, this.stepDelay(ArenaGame.DELAY));
        this._rk = rk;
        this.predict();
        let order: any[] = [];
        let i: int = 0;
        while (i < this._p.length) {
            let p: any = this._p[i];
            if (i == this._you && p.alive) {
                x = Number(this._own.x);
                y = Number(this._own.y);
            } else {
                let at: any[] = this.sample(p, rk);
                x = Number(at[0]);
                y = Number(at[1]);
            }
            let dx: number = x - Number(p.lx);
            let dy: number = y - Number(p.ly);
            let moving: boolean = dx * dx + dy * dy > 0.04;
            if (moving) {
                p.face = Math.atan2(dy, dx) * 180 / Math.PI;
                p.walk++;
            } else if (p.sface != null && i != this._you) {
                p.face = Number(p.sface);
            }
            p.lx = x;
            p.ly = y;
            p.dx = x;
            p.dy = y;
            order.push(p);
            i++;
        }
        as3.sortOn(order, "dy", Array.NUMERIC);
        let depth: int = 0;
        for (let q of as3.values(order)) {
            this.drawBody(q);
            this._bodies.setChildIndex(as3.cast(q.ring, DisplayObject), (depth++) | 0);
            this._bodies.setChildIndex(as3.cast(q.bmp, DisplayObject), (depth++) | 0);
            this._bodies.setChildIndex(as3.cast(q.label, DisplayObject), (depth++) | 0);
            this._bodies.setChildIndex(as3.cast(q.badge, DisplayObject), (depth++) | 0);
        }
        this.drawLive(now);
        let fl: any[] = [];
        for (let o of as3.values(this._floats)) {
            o.life--;
            o.t.y -= 0.7;
            o.t.alpha = Math.min(1, o.life / 15);
            if (o.life > 0) {
                fl.push(o);
            } else if (o.t.parent) {
                o.t.parent.removeChild(o.t);
            }
        }
        this._floats = fl;
    }

    /** Where a monster is drawn now (after render placed it). */
    protected drawnAt(i: int): any[] {
        return [this._p[i].dx, this._p[i].dy];
    }

    /** How solid a monster is drawn (dashing: a little see-through; the game may say otherwise). */
    protected bodyAlpha(p: any): number {
        return Number(((p.flags | 0) & 1) != 0 ? 0.8 : 1);
    }

    protected drawBody(p: any): void {
        let i: int = this._p.indexOf(p);
        let look: any = this.lookOf(i);
        let sheet: string = String(look.sheet);
        let row: int = (sheet == "spurtz" ? 1 + ((p.walk / 6) | 0) % 2 : (sheet == "malphus" ? 1 + ((p.walk / 4) | 0) % 8 : 0)) | 0;
        let fr: BitmapData = ArcadeArt.frame(sheet, Number(p.face), row);
        let x: number = Number(p.dx);
        let y: number = Number(p.dy);
        p.ring.x = x;
        p.ring.y = y + this._radius * 0.55;
        p.ring.visible = p.alive;
        if (fr) {
            // (the frame and its size set when the frame changes, not every frame; 9 October)
            if (fr != p.fr) {
                p.fr = fr;
                p.bmp.bitmapData = fr;
                p.bmp.smoothing = true;
                p.sc = Math.min(1.1, this._radius * 2.9 / fr.width);
                p.bmp.scaleX = p.bmp.scaleY = Number(p.sc);
            }
            let s: number = Number(p.sc);
            p.bmp.x = x - fr.width * s / 2;
            p.bmp.y = y - fr.height * s + this._radius * 0.75;
        }
        p.bmp.visible = p.alive;
        let al: number = this.bodyAlpha(p);
        if (p.al != al) {
            p.al = al;
            p.bmp.alpha = al;
        }
        p.label.x = x - 60;
        p.label.y = y - this._radius * 2.6 - 10;
        p.label.visible = p.alive;
        let key: string = p.alive ? this.badgeKey(i, p) : "";
        if (key != p.badgeKey) {
            p.badgeKey = key;
            p.badge.graphics.clear();
            if (key) {
                this.drawBadge(i, p, p.badge.graphics);
            }
        }
        p.badge.x = x;
        p.badge.y = y;
    }
}
