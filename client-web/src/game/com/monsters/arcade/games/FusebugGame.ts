import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { getTimer } from "flash/utils";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, GLOBAL, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Fusebug Blast (the Devil's Arcade), drawn from the server's match (server/src/services/arcade/
 * fusebug.ts). Arrows or WASD move, Space drops a Fusebug. Four monsters, one a corner (Spurtz, Sabnox, Valgos
 * and Malphus); the server moves them, times the Fusebugs and decides who burns; this draws it and sends the
 * keys.
 *
 * Smooth movement (7 October, the user's: it didn't feel smooth): the other monsters are drawn DELAY steps
 * behind the server's clock (ArcadeGame.stepNow), between the two steps either side, so a late message is
 * waited for, not jumped over. The player's own monster walks here at once, the server's way (grid-aligned,
 * sliding round corners, blocked by pillars, crates and Fusebugs), and each key sent says where it was, so
 * the server stops, turns and lays the Fusebug there too; it is pulled gently towards the server's place.
 */
export class FusebugGame extends ArcadeGame {
    static {
        as3.fields(this, { _cols: 15, _rows: 13, _grid: null, _power: null, _you: 0, _players: null, _burnedTm: -999, _p: null, _bombs: null, _booms: null, _board: null, _boardDirty: true, _fx: null, _blast: null, _bombLayer: null, _who: null, _cards: null, _stepMs: 50, _dir: 0, _shrinkAt: 120, _tm: -3.5, _countdownEnd: 0, _warned: false, _clock: null, _frameMs: 25, _own: null, _passable: null, _ioOutF: 0 });
    }

    private static readonly T: number = 32;

    private static readonly BX: number = 120;

    private static readonly BY: number = 2;

    private static readonly WHO: any[] = ["spurtz", "sabnox", "valgos", "malphus"];

    private static readonly RING: any[] = [0xFFB040, 0x9AD8FF, 0x9CFF6A, 0xFF6AC0];

    /** How far behind the server's clock the others are drawn, at least (steps of 50 ms; more on a bumpy link). */
    private static readonly DELAY: number = 1.5;
    private _cols: int;
    private _rows: int;
    private _grid: any[];
    private _power: any[];
    private _you: int;
    private _players: any[];
    /** When the player burned (match seconds; -999 not yet). */
    private _burnedTm: number;
    /** [{x, y, px, py, dir, alive, at, bmp, ring}] */
    private _p: any[];
    /** id -> {x, y, at, bmp} */
    private _bombs: any;
    /** [{tiles, at}] */
    private _booms: any[];
    private _board: Shape;
    private _boardDirty: boolean;
    private _fx: Sprite;
    private _blast: Shape;
    private _bombLayer: Sprite;
    private _who: Sprite;
    private _cards: any[];
    private _stepMs: number;
    private _dir: int;
    private _shrinkAt: number;
    private _tm: number;
    private _countdownEnd: int;
    private _warned: boolean;
    private _clock: TextField;
    private _frameMs: number;
    /** The player's own monster, walked here: {x, y, on}. */
    private _own: any;
    /** Fusebugs the player's own monster may walk off (it stood on them when they were laid): id -> true. */
    private _passable: any;
    /** Inferno-only (QoL #370): the server's steps seen since the player burned. */
    private _ioOutF: int;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._grid = [];
        this._power = [];
        this._players = [];
        this._p = [];
        this._bombs = {};
        this._booms = [];
        this._cards = [];
        this._own = { "x": 0, "y": 0, "on": false };
        this._passable = {};
        super.$ctor(win, mode, ctx);
        ArcadeArt.preload(FusebugGame.WHO.concat(["arcade/monsters/fusebug.png"]));
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, ArcadeGame.GH, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1A0A08, 0x2A0E08], [1, 1], [0, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, ArcadeGame.GH);
        bg.graphics.endFill();
        this._board = as3.as(this.addChild(new Shape()), Shape);
        // (7 October, performance: the maze is kept as a picture, drawn again only when a crate breaks or the
        // lava comes; it was traced again, tile by tile, wherever anything moved over it)
        this._board.cacheAsBitmap = true;
        this._fx = as3.as(this.addChild(new Sprite()), Sprite);
        this._bombLayer = as3.as(this.addChild(new Sprite()), Sprite);
        this._blast = as3.as(this.addChild(new Shape()), Shape);
        this._who = as3.as(this.addChild(new Sprite()), Sprite);
        this._clock = ArcadeGame.text(18, 16777215, 110, TextFormatAlign.CENTER);
        this._clock.x = 5;
        this._clock.y = 370;
        this.hud.addChild(this._clock);
        this.topHud();
        // phones and tablets: a stick (four ways, like the arrows) and a button to drop a Fusebug (Space)
        this.touchControls({ "stick": "4", "stickX": 92, "stickY": 300, "buttons": [{ "label": "BOMB", "code": Keyboard.SPACE, "r": 40, "x": ArcadeGame.GW - 70, "y": ArcadeGame.GH - 74 }] });
        this.begin(ctx);
    }

    private begin(m: any): void {
        this._cols = m.cols | 0;
        this._rows = m.rows | 0;
        this._grid = (as3.as(m.grid, Array)).concat();
        this._power = (as3.as(m.power, Array)).concat();
        this._you = m.you | 0;
        this._players = as3.as(m.players, Array);
        this._stepMs = Number(m.step);
        this._shrinkAt = Number(m.shrinkAt);
        this._countdownEnd = (getTimer() + (m.cd | 0)) | 0;
        let corners: any[] = [[1, 1], [this._cols - 2, this._rows - 2], [this._cols - 2, 1], [1, this._rows - 2]];
        let i: int = 0;
        while (i < this._players.length) {
            let ring: Shape = as3.as(this._who.addChild(new Shape()), Shape);
            ring.graphics.lineStyle(3, FusebugGame.RING[i] >>> 0, 0.9);
            ring.graphics.drawEllipse(-13, -5, 26, 11);
            let bmp: Bitmap = as3.as(this._who.addChild(new Bitmap()), Bitmap);
            bmp.smoothing = true;
            this._p.push({ "x": corners[i][0], "y": corners[i][1], "px": corners[i][0], "py": corners[i][1], "dir": 3, "face": 3, "alive": true, "snaps": [], "lx": corners[i][0], "ly": corners[i][1], "bmp": bmp, "ring": ring, "walk": 0 });
            // the players' cards, two each side
            let card: Sprite = CasinoUI.panel(108, 74, 0.85);
            card.x = Number(i % 2 == 0 ? 6 : ArcadeGame.GW - 114);
            card.y = 10 + ((i / 2) | 0) * 84;
            // (QoL #235: the games' words in the player's language)
            let name: TextField = CasinoUI.label(i == this._you ? KEYS.Get("io_t3a_name_you", { "v1": String(this._players[i].name) }) : String(this._players[i].name), 10, FusebugGame.RING[i] >>> 0, true, 104, TextFormatAlign.CENTER);
            name.x = 2;
            name.y = 4;
            card.addChild(name);
            let stats: TextField = CasinoUI.label("", 10, 15655632, true, 104, TextFormatAlign.CENTER);
            stats.x = 2;
            stats.y = 24;
            stats.multiline = true;
            stats.height = 44;
            card.addChild(stats);
            card["stats"] = stats;
            this.hud.addChild(card);
            this._cards.push({ "card": card, "bombs": 1, "fire": 2, "speed": 36, "alive": true });
            this.cardText(i);
            i++;
        }
        this._boardDirty = true;
        this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 60);
    }

    private cardText(i: int): void {
        let c: any = this._cards[i];
        (as3.as(c.card["stats"], TextField)).text = c.alive ? KEYS.Get("io_t3a_fb_card", { "v1": c.bombs, "v2": c.fire }) + "\n" + KEYS.Get("io_t3a_fb_speed", { "v1": c.speed / 10 }) : KEYS.Get("io_t3a_fb_burned_card");
        c.card.alpha = c.alive ? 1 : 0.45;
    }

    /** A Fusebug's glow (radius 16 at scale 1), and the redder one when its fuse is nearly out. */
    private static drawGlow(g: any): void {
        g.beginFill(0xFF8A2A, 1);
        g.drawCircle(0, 0, 16);
        g.endFill();
    }

    private static drawRedGlow(g: any): void {
        g.beginFill(0xFF2A0A, 1);
        g.drawCircle(0, 0, 16);
        g.endFill();
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        let now: int = getTimer();
        if (t == "f") {
            this._tm = Number(msg.tm) / 10;
            let k: number = Number(msg.k);
            this.stepSeen(k, this._stepMs);
            let ps: any[] = as3.as(msg.p, Array);
            let i: int = 0;
            while (i < ps.length && i < this._p.length) {
                let p: any = this._p[i];
                p.x = Number(ps[i][0]) / 100;
                p.y = Number(ps[i][1]) / 100;
                p.dir = ps[i][2] | 0;
                p.alive = (ps[i][3] | 0) == 1;
                p.snaps.push([k, p.x, p.y, p.dir]);
                if (p.snaps.length > 20) {
                    p.snaps.shift();
                }
                i++;
            }
            for (let c of as3.values(msg.c)) {
                this._grid[c[0]] = c[1] | 0;
                this._power[c[0]] = c[2] | 0;
                this._boardDirty = true;
            }
            for (let x of as3.values(msg.x)) {
                let b: any = this._bombs[x[0]];
                if (b && b.bmp.parent) {
                    b.bmp.parent.removeChild(b.bmp);
                }
                delete this._bombs[x[0]];
                this._booms.push({ "tiles": x.slice(3), "at": now });
                SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
            }
            if (!this._warned && this._tm >= this._shrinkAt - 10) {
                this._warned = true;
                this.banner(KEYS.Get("io_t3a_fb_lava_coming"), 16738842, 70);
            }
            // (QoL #370: burned, and the match still on a step later: LEAVE in the right-hand column under the
            // cards, and the maze goes on being drawn to watch)
            let me: any = this._p[this._you];
            if (GLOBAL.INFERNO_ONLY && !this.ended && me && !me.alive && ++this._ioOutF >= 2) {
                this.ioOutLeave(ArcadeGame.GW - 105, 214, 108);
            }
        } else if (t == "bomb") {
            let bmp: Bitmap = new Bitmap();
            bmp.smoothing = true;
            this._bombLayer.addChild(bmp);
            this._bombs[msg.id] = { "x": msg.x | 0, "y": msg.y | 0, "at": now, "bmp": bmp };
            // (standing on it as it was laid: the player's own monster may walk off it, as on the server)
            if (this._own.on && Math.abs(this._own.x - (msg.x | 0)) < 0.95 && Math.abs(this._own.y - (msg.y | 0)) < 0.95) {
                this._passable[msg.id] = true;
            }
            SOUNDS.Play("click1", 0.5);
        } else if (t == "pick") {
            let card: any = this._cards[msg.i | 0];
            if (card) {
                card.bombs = msg.bombs | 0;
                card.fire = msg.fire | 0;
                card.speed = msg.speed | 0;
                this.cardText(msg.i | 0);
            }
            if ((msg.i | 0) == this._you) {
                SOUNDS.Play("chaching", 0.5);
            }
        } else if (t == "die") {
            let dead: int = msg.i | 0;
            if (this._cards[dead]) {
                this._cards[dead].alive = false;
                this.cardText(dead);
            }
            if (dead == this._you) {
                this._burnedTm = this._tm;
                this.banner(KEYS.Get("io_t3a_fb_burned"), 16738906, 60);
            } else if ((msg.by | 0) == this._you) {
                this.banner(KEYS.Get("io_t3a_you_got", { "v1": String(this._players[dead].name).toUpperCase() }), 10289002, 40);
            }
        } else if (t == "end") {
            let won: boolean = (msg.winner | 0) == this._you;
            // (a draw only for those in it: burned with the last ones, or standing when time ran out; burned
            // before, a loss; it read as a draw for everyone; 9 October)
            let standing: boolean = Boolean(this._cards[this._you] && this._cards[this._you].alive);
            let drawn: boolean = msg.reason == "draw" ? !standing && this._burnedTm >= Number(msg.tm) / 10 - 0.15 : msg.reason == "time" && standing;
            let kills: any[] = as3.as(msg.kills, Array);
            let winner: string = (msg.winner | 0) >= 0 ? String(this._players[msg.winner | 0].name) : "";
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (drawn ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (drawn ? 0xFFD58A : 0xFF6A5A), "line": (won ? KEYS.Get("io_t3a_last_standing") : (winner ? KEYS.Get("io_t3a_was_last", { "v1": winner }) : KEYS.Get(msg.reason == "time" ? (drawn ? "io_t3a_fb_time_standing" : "io_t3a_fb_burned_before") : (drawn ? "io_t3a_fb_all_burned" : "io_t3a_fb_you_burned")))) + "\n" + KEYS.Get("io_t3a_fb_your_kills", { "v1": kills[this._you] | 0 }), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        } else if (t == "pong") {
            this.pong(msg);
        }
    }

    public override keyDown(code: int): void {
        let was: boolean = this.key(code);
        super.keyDown(code);
        if (code == Keyboard.SPACE && !was) {
            this.sendIn({ "t": "in", "d": this.wanted(), "b": 1 });
        }
        this.steer();
    }

    public override keyUp(code: int): void {
        super.keyUp(code);
        this.steer();
    }

    /** The direction the keys held say (the last pressed wins ties by order). */
    private wanted(): int {
        if (this.key(Keyboard.UP) || this.key(87)) {
            return 1;
        }
        if (this.key(Keyboard.DOWN) || this.key(83)) {
            return 3;
        }
        if (this.key(Keyboard.LEFT) || this.key(65)) {
            return 4;
        }
        if (this.key(Keyboard.RIGHT) || this.key(68)) {
            return 2;
        }
        return 0;
    }

    private steer(): void {
        let d: int = this.wanted();
        if (d != this._dir) {
            this._dir = d;
            this.sendIn({ "t": "in", "d": d });
        }
    }

    /** A key sent, with where the player's own monster is here (the server puts it there if it is close). */
    private sendIn(m: any): void {
        if (this._own.on) {
            m.x = Math.round(this._own.x * 1000) / 1000;
            m.y = Math.round(this._own.y * 1000) / 1000;
        }
        ArcadeNet.send(m);
    }

    private solidAt(x: int, y: int): boolean {
        if (x < 0 || y < 0 || x >= this._cols || y >= this._rows) {
            return true;
        }
        let g: int = this._grid[y * this._cols + x] | 0;
        if (g == 1 || g == 2) {
            return true;
        }
        for (let id in this._bombs) {
            let b: any = this._bombs[id];
            if (b.x == x && b.y == y && !this._passable[id]) {
                return true;
            }
        }
        return false;
    }

    /** The player's own monster walks (the server's move, fusebug.ts): lined up with the row or column first, then on. */
    private walk(o: any, dir: int, dt: number, speed: number): void {
        if (!dir) {
            return;
        }
        let dx: int = dir == 2 ? 1 : (dir == 4 ? -1 : 0);
        let dy: int = dir == 3 ? 1 : (dir == 1 ? -1 : 0);
        let step: number = speed * dt;
        let cx: int = Math.round(Number(o.x)) | 0;
        let cy: int = Math.round(Number(o.y)) | 0;
        let off: number = NaN;
        let fix: number = NaN;
        let ahead: int = 0;
        if (dx != 0) {
            off = o.y - cy;
            if (Math.abs(off) > 0.02) {
                if (this.solidAt((cx + dx) | 0, cy)) {
                    return;
                }
                fix = Math.min(Math.abs(off), step);
                o.y -= (off > 0 ? 1 : -1) * fix;
                step -= fix;
            } else {
                o.y = cy;
            }
            let nx: number = Number(o.x + dx * step);
            ahead = (dx > 0 ? Math.ceil(nx - 0.001) : Math.floor(nx + 0.001)) | 0;
            o.x = this.solidAt(ahead, cy) && ahead != cx ? cx : nx;
        } else {
            off = o.x - cx;
            if (Math.abs(off) > 0.02) {
                if (this.solidAt(cx, (cy + dy) | 0)) {
                    return;
                }
                fix = Math.min(Math.abs(off), step);
                o.x -= (off > 0 ? 1 : -1) * fix;
                step -= fix;
            } else {
                o.x = cx;
            }
            let ny: number = Number(o.y + dy * step);
            ahead = (dy > 0 ? Math.ceil(ny - 0.001) : Math.floor(ny + 0.001)) | 0;
            o.y = this.solidAt(cx, ahead) && ahead != cy ? cy : ny;
        }
        for (let id in this._passable) {
            let b: any = this._bombs[id];
            if (!b || Math.abs(b.x - o.x) >= 0.95 || Math.abs(b.y - o.y) >= 0.95) {
                delete this._passable[id];
            }
        }
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

    /** The player's own monster: walked here, pulled gently towards the server's place (snapped if far off). */
    private predict(p: any): void {
        let sn: any[] = as3.cast(p.snaps, Array);
        if (sn.length == 0) {
            return;
        }
        let last: any[] = as3.cast(sn[sn.length - 1], Array);
        let o: any = this._own;
        if (!o.on) {
            o.on = true;
            o.x = last[1];
            o.y = last[2];
        }
        let dt: number = Math.min(0.1, this._frameMs / 1000);
        let speed: number = Number(this._cards[this._you].speed) / 10;
        // (not before the countdown is over, as on the server)
        if (this._tm >= 0) {
            this.walk(o, this._dir, dt, speed);
        }
        let ex: number = last[1] - o.x;
        let ey: number = last[2] - o.y;
        if (Math.abs(ex) + Math.abs(ey) > 1.5) {
            o.x = last[1];
            o.y = last[2];
            return;
        }
        // the server is behind by about the round trip while walking: that much ahead along the way is expected
        let lead: number = Number(this._dir ? Math.min(0.8, speed * (this.rtt / 1000 + (getTimer() - this.stepTime(Number(last[0]), this._stepMs)) / 1000)) : 0);
        let along: boolean = this._dir == 2 || this._dir == 4;
        let sx: number = this._dir == 2 ? 1 : (this._dir == 4 ? -1 : 0);
        let sy: number = this._dir == 3 ? 1 : (this._dir == 1 ? -1 : 0);
        let pull: number = 1 - Math.exp(-dt * (this._dir ? 2 : 6));
        let side: number = 1 - Math.exp(-dt * 8);
        if (along) {
            o.x += (ex + sx * lead) * pull;
            o.y += ey * side;
        } else if (this._dir) {
            o.y += (ey + sy * lead) * pull;
            o.x += ex * side;
        } else if ((last[3] | 0) == 0) {
            // both stopped: the same place
            o.x += ex * pull;
            o.y += ey * pull;
        }
    }

    public override tick(ms: number): void {
        this._frameMs = ms;
        super.tick(ms);
        this.render();
    }

    private drawBoard(): void {
        let g: any = this._board.graphics;
        g.clear();
        let y: int = 0;
        while (y < this._rows) {
            let x: int = 0;
            while (x < this._cols) {
                let i: int = (y * this._cols + x) | 0;
                let px: number = FusebugGame.BX + x * FusebugGame.T;
                let py: number = FusebugGame.BY + y * FusebugGame.T;
                let tile: int = this._grid[i] | 0;
                g.lineStyle(0, 0, 0);
                if (tile == 1) {
                    // obsidian pillar
                    let m: Matrix = new Matrix();
                    m.createGradientBox(FusebugGame.T, FusebugGame.T, Math.PI / 4, px, py);
                    g.beginGradientFill(GradientType.LINEAR, [0x5A4A6A, 0x1A121E], [1, 1], [0, 255], m);
                    g.drawRect(px, py, FusebugGame.T, FusebugGame.T);
                    g.endFill();
                    g.lineStyle(1, 0x000000, 0.8);
                    g.drawRect(px + 0.5, py + 0.5, FusebugGame.T - 1, FusebugGame.T - 1);
                } else if (tile == 3) {
                    g.beginFill(0xE0501C, 1);
                    g.drawRect(px, py, FusebugGame.T, FusebugGame.T);
                    g.endFill();
                    g.beginFill(0xFFC060, 0.7);
                    g.drawCircle(px + FusebugGame.T * 0.3 + (x * 7 % 5), py + FusebugGame.T * 0.4, 4);
                    g.drawCircle(px + FusebugGame.T * 0.7, py + FusebugGame.T * 0.7 - (y * 5 % 4), 3);
                    g.endFill();
                } else {
                    // the floor: basalt flagstones
                    g.beginFill((x + y) % 2 == 0 ? 0x2E2422 : 0x282020, 1);
                    g.drawRect(px, py, FusebugGame.T, FusebugGame.T);
                    g.endFill();
                    if (tile == 2) {
                        // a bone crate
                        g.lineStyle(2, 0x3A2A1A, 1);
                        g.beginFill(0xB89A6A, 1);
                        g.drawRoundRect(px + 2, py + 2, FusebugGame.T - 4, FusebugGame.T - 4, 6, 6);
                        g.endFill();
                        g.lineStyle(2, 0xF0E4C8, 0.9);
                        g.moveTo(px + 7, py + 7);
                        g.lineTo(px + FusebugGame.T - 7, py + FusebugGame.T - 7);
                        g.moveTo(px + FusebugGame.T - 7, py + 7);
                        g.lineTo(px + 7, py + FusebugGame.T - 7);
                    } else if ((this._power[i] | 0) > 0) {
                        this.drawPower(g, this._power[i] | 0, px + FusebugGame.T / 2, py + FusebugGame.T / 2);
                    }
                }
                x++;
            }
            y++;
        }
        g.lineStyle(3, 0xE0501C, 1);
        g.drawRect(FusebugGame.BX - 1, FusebugGame.BY - 1, this._cols * FusebugGame.T + 2, this._rows * FusebugGame.T + 2);
    }

    private drawPower(g: any, p: int, cx: number, cy: number): void {
        g.lineStyle(2, 0xFFFFFF, 0.9);
        g.beginFill(p == 1 ? 0x2A2226 : (p == 2 ? 0xE0501C : 0x3A9AE0), 1);
        g.drawCircle(cx, cy, 11);
        g.endFill();
        g.lineStyle(2, 0xFFFFFF, 1);
        if (p == 1) {
            // one more Fusebug: a round bomb with a spark
            g.beginFill(0x000000, 1);
            g.drawCircle(cx, cy + 1, 5);
            g.endFill();
            g.moveTo(cx + 3, cy - 3);
            g.lineTo(cx + 6, cy - 6);
        } else if (p == 2) {
            // a bigger blast: a flame
            g.beginFill(0xFFE080, 1);
            g.moveTo(cx, cy - 7);
            g.curveTo(cx + 7, cy + 2, cx, cy + 6);
            g.curveTo(cx - 7, cy + 2, cx, cy - 7);
            g.endFill();
        } else {
            // faster: a lightning bolt
            g.moveTo(cx + 2, cy - 7);
            g.lineTo(cx - 3, cy + 1);
            g.lineTo(cx + 2, cy + 1);
            g.lineTo(cx - 2, cy + 7);
        }
    }

    private render(): void {
        let x: number = NaN;
        let y: number = NaN;
        let moving: int = 0;
        if (this._boardDirty) {
            this._boardDirty = false;
            this.drawBoard();
        }
        let now: int = getTimer();
        // the countdown
        if (this._countdownEnd > now) {
            let n: int = Math.ceil((this._countdownEnd - now) / 1000) | 0;
            this.banner(String(n), 16766346, 2);
        } else if (this._countdownEnd > 0) {
            this._countdownEnd = 0;
            this.banner(KEYS.Get("io_t3a_fb_blast"), 16747050, 30);
        }
        let left: int = Math.max(0, Math.ceil(this._shrinkAt - this._tm)) | 0;
        this._clock.text = this._tm < 0 ? "" : (left > 0 ? ((left / 60) | 0) + ":" + (left % 60 < 10 ? "0" : "") + left % 60 : KEYS.Get("io_t3a_fb_lava"));
        this._clock.textColor = (left <= 10 ? 0xFF6A5A : 0xFFFFFF) >>> 0;
        // the Fusebugs: they swell as they burn down
        // (each glow its own disc from the pool, scaled and faded: all in one shape, Fusebugs far apart made it
        // most of the maze, drawn again every frame; 9 October)
        this.poolBegin();
        for (let b of as3.values(this._bombs)) {
            let f: BitmapData = ArcadeArt.picture("arcade/monsters/fusebug.png");
            let life: number = Math.min(1, (now - b.at) / 2200);
            let bx: number = FusebugGame.BX + b.x * FusebugGame.T + FusebugGame.T / 2;
            let by: number = FusebugGame.BY + b.y * FusebugGame.T + FusebugGame.T / 2;
            // a glow under it, faster and redder as the fuse burns down
            let pulse: number = 0.5 + 0.5 * Math.sin((now - b.at) / 1000 * (6 + life * 22));
            let glow: Shape = this.poolShape(this._fx, life > 0.7 ? "glow:red" : "glow", life > 0.7 ? FusebugGame.drawRedGlow : FusebugGame.drawGlow, bx, by);
            glow.alpha = 0.25 + 0.35 * pulse;
            glow.scaleX = glow.scaleY = (12 + 4 * pulse) / 16;
            if (f) {
                b.bmp.bitmapData = f;
                b.bmp.smoothing = true;
                let sc: number = (FusebugGame.T * 1.05 / f.width) * (1 + 0.08 * pulse);
                b.bmp.scaleX = b.bmp.scaleY = sc;
                b.bmp.x = bx - f.width * sc / 2;
                b.bmp.y = by - f.height * sc / 2;
            }
        }
        this.poolEnd();
        // the blasts
        let g: any = this._blast.graphics;
        g.clear();
        let keep: any[] = [];
        for (let boom of as3.values(this._booms)) {
            let age: number = (now - boom.at) / 550;
            if (age >= 1) {
                continue;
            }
            keep.push(boom);
            for (const $value of as3.values(boom.tiles)) {
                let tile: int = $value | 0;
                let tx: number = FusebugGame.BX + (tile % this._cols) * FusebugGame.T;
                let ty: number = FusebugGame.BY + ((tile / this._cols) | 0) * FusebugGame.T;
                let inset: number = 2 + age * 8;
                g.beginFill(0xFF6A1A, 0.85 * (1 - age));
                g.drawRoundRect(tx + inset / 2, ty + inset / 2, FusebugGame.T - inset, FusebugGame.T - inset, 10, 10);
                g.endFill();
                g.beginFill(0xFFE080, 0.9 * (1 - age));
                g.drawCircle(tx + FusebugGame.T / 2, ty + FusebugGame.T / 2, FusebugGame.T * 0.28 * (1 - age));
                g.endFill();
            }
        }
        this._booms = keep;
        // the monsters: the others between the server's steps, the player's own walked here
        this.pingNow();
        let rk: number = this.stepNow(this._stepMs, this.stepDelay(FusebugGame.DELAY));
        let i: int = 0;
        while (i < this._p.length) {
            let p: any = this._p[i];
            if (i == this._you && p.alive) {
                this.predict(p);
                x = Number(this._own.on ? this._own.x : p.x);
                y = Number(this._own.on ? this._own.y : p.y);
                moving = this._tm >= 0 ? this._dir : 0;
            } else {
                let at: any[] = this.sample(p, rk);
                x = Number(at[0]);
                y = Number(at[1]);
                // which way it is going, from where it is drawn
                let dx: number = x - Number(p.lx);
                let dy: number = y - Number(p.ly);
                // (18 October, SUSPECTED-BUGS.md: on a bumpy connection the others caught up with the server in a
                // hop, about 1.4 times their speed for a frame) no more than 1.5 times its speed in a frame, the
                // rest made up over the next ones; a move of more than two tiles (a new round, a respawn) at once
                let frameNow: number = getTimer();
                let frameS: number = p.lt ? Math.min(0.1, Math.max(0.001, (frameNow - Number(p.lt)) / 1000)) : 0;
                p.lt = frameNow;
                let dist: number = Math.abs(dx) + Math.abs(dy);
                let speed: number = this._cards && this._cards[i] ? Number(this._cards[i].speed) / 10 : 3.6;
                let most: number = Math.max(0.05, speed * frameS * 1.5);
                if (frameS > 0 && p.alive && dist > most && dist < 2 && isFinite(Number(p.lx))) {
                    x = Number(p.lx) + dx * (most / dist);
                    y = Number(p.ly) + dy * (most / dist);
                    dx = x - Number(p.lx);
                    dy = y - Number(p.ly);
                }
                moving = Math.abs(dx) + Math.abs(dy) < 0.001 ? 0 : (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 2 : 4) : (dy > 0 ? 3 : 1));
            }
            p.lx = x;
            p.ly = y;
            if (moving) {
                p.face = moving;
            }
            let cx: number = FusebugGame.BX + x * FusebugGame.T + FusebugGame.T / 2;
            let cy: number = FusebugGame.BY + y * FusebugGame.T + FusebugGame.T / 2;
            p.ring.x = cx;
            p.ring.y = cy + 9;
            p.ring.visible = p.alive;
            let deg: number = p.face == 1 ? 270 : (p.face == 2 ? 0 : (p.face == 4 ? 180 : 90));
            if (moving) {
                p.walk++;
            }
            let row: int = (FusebugGame.WHO[i] == "spurtz" ? 1 + ((p.walk / 6) | 0) % 2 : (FusebugGame.WHO[i] == "malphus" ? 1 + ((p.walk / 4) | 0) % 8 : 0)) | 0;
            let fr: BitmapData = ArcadeArt.frame(String(FusebugGame.WHO[i]), deg, row);
            if (fr) {
                p.bmp.bitmapData = fr;
                p.bmp.smoothing = true;
                let s: number = Math.min(1, 40 / fr.width);
                p.bmp.scaleX = p.bmp.scaleY = s;
                p.bmp.x = cx - fr.width * s / 2;
                p.bmp.y = cy - fr.height * s + 10;
            }
            p.bmp.visible = p.alive;
            if (!p.alive) {
                p.bmp.alpha = 0;
            }
            i++;
        }
    }
}
