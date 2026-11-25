import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, GradientType, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { ArcadeArt, ArcadeGame, ArcadeNet, ArcadeWindow, CasinoUI, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Rezghul Runner (the Devil's Arcade, 7 October, the user's pick): an endless road into the
 * distance, three lanes over the lava, seen from behind Rezghul as he runs.
 *
 *  - Rocks and lava pools: jump them (Up, W or Space). Fire bars at head height: slide under (Down or S).
 *    Obsidian pillars: change lane (Left / Right, A / D). One hit and the run is over.
 *  - Embers along the lanes (and over the rocks): 10 points each. Every metre run is a point.
 *  - The road gets faster the further it goes (from 14 to 40 metres a second by 1,430 metres).
 *
 * Everything on the road is made from the run's seed, by distance (the speed comes from the distance too),
 * so in a Race both players run the same road. Race (relay.ts, "score"): the better run wins.
 */
export class RunnerGame extends ArcadeGame {
    static {
        as3.fields(this, { _dist: 0, _lane: 1, _laneX: 1, _h: 0, _vy: 0, _slide: 0, _jumpBuf: 0, _embers: 0, _crashed: false, _crashT: 0, _things: null, _madeTo: 40, _road: null, _roadArt: false, _world: null, _front: null, _rez: null, _hudDist: null, _hudEmbers: null, _hudRival: null, _floats: null, _runT: 0, _versus: false, _countdown: 0, _rivalName: "", _rivalM: 0, _rivalScore: 0, _rivalDone: false, _sentAt: 0, _doneSent: false, _steps: 0 });
    }

    private static readonly HORIZON: number = 118;

    private static readonly GROUND: number = 376;

    private static readonly CAM: number = 6;

    private static readonly LANE: number = 140;

    private static readonly PPM: number = 58;

    private static readonly FAR: number = 95;

    private static readonly ROCK: string = "arcade/runner/rock.png";

    private static readonly PILLAR: string = "arcade/runner/pillar.png";

    private static readonly BAR: string = "arcade/runner/bar.png";

    private static readonly EMBER: string = "arcade/runner/ember.png";

    private static readonly POOL: string = "arcade/runner/pool.jpg";

    private static readonly ROAD: string = "arcade/runner/road.jpg";
    private _dist: number;
    private _lane: int;
    private _laneX: number;
    private _h: number;
    private _vy: number;
    private _slide: number;
    /**
     * A jump asked for in the air, kept a moment and made on landing (7 October, the user's: "the jumping
     * sometimes gets you killed": a jump pressed just before landing, for the next rock, was lost).
     */
    private _jumpBuf: number;
    private _embers: int;
    private _crashed: boolean;
    private _crashT: int;
    /** What is on the road: {z (metres from the start), lane, kind: rock|lava|bar|pillar|ember, h (embers)}. */
    private _things: any[];
    /** How far the road has been made. */
    private _madeTo: number;
    private _road: Shape;
    /** The road is paved (its picture) once ROAD has loaded. */
    private _roadArt: boolean;
    private _world: Shape;
    private _front: Shape;
    private _rez: Bitmap;
    private _hudDist: TextField;
    private _hudEmbers: TextField;
    private _hudRival: TextField;
    private _floats: any[];
    private _runT: int;
    // ---- Race
    private _versus: boolean;
    private _countdown: int;
    private _rivalName: string;
    private _rivalM: int;
    private _rivalScore: int;
    private _rivalDone: boolean;
    private _sentAt: int;
    private _doneSent: boolean;
    private _steps: int;

    public $ctor(win?: ArcadeWindow, mode?: string, ctx?: any): void {
        this._things = [];
        this._floats = [];
        super.$ctor(win, mode, ctx);
        this._versus = mode == "race";
        ArcadeArt.preload(["rezghul", RunnerGame.ROCK, RunnerGame.PILLAR, RunnerGame.BAR, RunnerGame.EMBER, RunnerGame.POOL, RunnerGame.ROAD]);
        // the sky and the far volcanoes (drawn once)
        let bg: Shape = as3.as(this.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeGame.GW, RunnerGame.HORIZON + 20, Math.PI / 2, 0, 0);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x12040A, 0x4A0E0A, 0xC0400E], [1, 1, 1], [0, 170, 255], m);
        bg.graphics.drawRect(0, 0, ArcadeGame.GW, RunnerGame.HORIZON + 4);
        bg.graphics.endFill();
        bg.graphics.beginFill(1705990, 1);
        bg.graphics.moveTo(0, RunnerGame.HORIZON + 4);
        let px: number = 0;
        let k: int = 0;
        while (px <= ArcadeGame.GW) {
            let peak: number = RunnerGame.HORIZON - 14 - ((k * 37) % 23) - (k % 4 == 0 ? 26 : 0);
            bg.graphics.lineTo(px + 22, peak);
            bg.graphics.lineTo(px + 48, RunnerGame.HORIZON - 4 - (k * 13) % 9);
            px += 48;
            k++;
        }
        bg.graphics.lineTo(ArcadeGame.GW, RunnerGame.HORIZON + 4);
        bg.graphics.endFill();
        // a volcano glowing on the skyline
        bg.graphics.beginFill(2361864, 1);
        bg.graphics.moveTo(470, RunnerGame.HORIZON + 2);
        bg.graphics.lineTo(540, RunnerGame.HORIZON - 58);
        bg.graphics.lineTo(566, RunnerGame.HORIZON - 58);
        bg.graphics.lineTo(640, RunnerGame.HORIZON + 2);
        bg.graphics.endFill();
        bg.graphics.beginFill(16738842, 0.85);
        bg.graphics.drawEllipse(538, RunnerGame.HORIZON - 62, 30, 8);
        bg.graphics.endFill();
        // the lava either side of the road, down to the bottom
        let m2: Matrix = new Matrix();
        m2.createGradientBox(ArcadeGame.GW, ArcadeGame.GH - RunnerGame.HORIZON, Math.PI / 2, 0, RunnerGame.HORIZON);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x6A1A08, 0xE0501C, 0xFF8A2A], [1, 1, 1], [0, 140, 255], m2);
        bg.graphics.drawRect(0, RunnerGame.HORIZON, ArcadeGame.GW, ArcadeGame.GH - RunnerGame.HORIZON);
        bg.graphics.endFill();
        bg.cacheAsBitmap = true;
        // (7 October, the user's: more detailed art, art/devilsarcade/games: the sky and the volcanoes painted, a
        // field of lava either side, the road paved; drawn above until they have loaded)
        let art: Sprite = as3.as(this.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "arcade/runner/sky.jpg", 0, 0, ArcadeGame.GW, RunnerGame.HORIZON + 6);
        CasinoUI.picture(art, "arcade/runner/lavafield.jpg", 0, RunnerGame.HORIZON + 6, ArcadeGame.GW, ArcadeGame.GH - RunnerGame.HORIZON - 6);
        // the road itself (it doesn't move; its stripes do)
        this._road = as3.as(this.addChild(new Shape()), Shape);
        let rg: any = this._road.graphics;
        let nearL: number = ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(-RunnerGame.CAM * 0.6);
        let nearR: number = ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(-RunnerGame.CAM * 0.6);
        let farL: number = ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR);
        let farR: number = ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR);
        let m3: Matrix = new Matrix();
        m3.createGradientBox(ArcadeGame.GW, ArcadeGame.GH - RunnerGame.HORIZON, Math.PI / 2, 0, RunnerGame.HORIZON);
        rg.beginGradientFill(GradientType.LINEAR, [0x2A2024, 0x4A3A3A], [1, 1], [0, 255], m3);
        rg.moveTo(farL, this.yAt(RunnerGame.FAR));
        rg.lineTo(farR, this.yAt(RunnerGame.FAR));
        rg.lineTo(nearR, ArcadeGame.GH);
        rg.lineTo(nearL, ArcadeGame.GH);
        rg.lineTo(farL, this.yAt(RunnerGame.FAR));
        rg.endFill();
        rg.lineStyle(3, 0x14080A, 1);
        rg.moveTo(farL, this.yAt(RunnerGame.FAR));
        rg.lineTo(nearL, ArcadeGame.GH);
        rg.moveTo(farR, this.yAt(RunnerGame.FAR));
        rg.lineTo(nearR, ArcadeGame.GH);
        this._road.cacheAsBitmap = true;
        this._world = as3.as(this.addChild(new Shape()), Shape);
        this._rez = as3.as(this.addChild(new Bitmap()), Bitmap);
        this._rez.smoothing = true;
        this._front = as3.as(this.addChild(new Shape()), Shape);
        this._hudDist = ArcadeGame.text(24, 16766346, 260, TextFormatAlign.CENTER);
        this._hudDist.x = (ArcadeGame.GW - 260) / 2;
        this._hudDist.y = 4;
        this._hudDist.name = "runnerScore";
        this.hud.addChild(this._hudDist);
        this._hudEmbers = ArcadeGame.text(14, 16777215, 220, TextFormatAlign.LEFT);
        this._hudEmbers.x = 12;
        this._hudEmbers.y = 8;
        this._hudEmbers.multiline = true;
        this._hudEmbers.height = 40;
        this.hud.addChild(this._hudEmbers);
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
        } else {
            this._countdown = 90;
        }
        this.topHud();
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.makeRoad();
        this.updateHud();
        this.banner(KEYS.Get("io_t3a_get_ready"), 16766346, 50);
    }

    // ---- the view: metres ahead -> the screen
    private scaleAt(z: number): number {
        return RunnerGame.CAM / (z + RunnerGame.CAM);
    }

    private yAt(z: number): number {
        return RunnerGame.HORIZON + (RunnerGame.GROUND - RunnerGame.HORIZON) * this.scaleAt(z);
    }

    private xAt(z: number, lane: number): number {
        return ArcadeGame.GW / 2 + (lane - 1) * RunnerGame.LANE * this.scaleAt(z);
    }

    /** The speed (metres a second) at a distance: the same for both runners in a Race. */
    private static speedAt(d: number): number {
        return 14 + Math.min(26, d / 55);
    }

    /** Makes the road ahead (from the seed, row after row, by distance only). */
    private makeRoad(): void {
        while (this._madeTo < this._dist + RunnerGame.FAR + 20) {
            let d: number = this._madeTo;
            let sp: number = RunnerGame.speedAt(d);
            let r: number = this.rnd();
            let hard: number = Math.min(1, d / 1500);
            let lanes: any[] = [0, 1, 2];
            let pick: int = this.rint(3);
            if (r < 0.32) {
                // one thing in one lane
                let kinds: any[] = ["rock", "bar", "pillar", "lava"];
                let k1: string = String(kinds[this.rint(kinds.length)]);
                this.put(d, pick, k1);
                if (k1 == "rock" && this.rnd() < 0.6) {
                    this.arc(d, pick);
                } else if (this.rnd() < 0.5) {
                    this.line(d + 4, ((pick + 1 + this.rint(2)) % 3) | 0, 4);
                }
            } else if (r < 0.6) {
                // two lanes shut by pillars, the third free or with a rock
                this.put(d, ((pick + 1) % 3) | 0, "pillar");
                this.put(d, ((pick + 2) % 3) | 0, "pillar");
                if (this.rnd() < 0.4 + hard * 0.4) {
                    this.put(d, pick, this.rnd() < 0.5 ? "rock" : "bar");
                } else {
                    this.line(d - 3, pick, 3);
                }
            } else if (r < 0.78 && d > 250) {
                // a wall right across: all jump, or all slide
                let across: string = this.rnd() < 0.5 ? "rock" : "bar";
                for (const $value of as3.values(lanes)) {
                    let l: int = $value | 0;
                    this.put(d, l, across);
                }
                if (across == "rock") {
                    this.arc(d, this.rint(3));
                }
            } else if (r < 0.9) {
                // a mixed row: a pillar, and the other two need a jump and a slide
                this.put(d, pick, "pillar");
                this.put(d, ((pick + 1) % 3) | 0, "rock");
                this.put(d, ((pick + 2) % 3) | 0, "bar");
            } else {
                // a breather: embers weaving across the lanes
                let i: int = 0;
                while (i < 8) {
                    this._things.push({ "z": d + i * 2.5, "lane": [0, 1, 2, 1][(i + pick) % 4], "kind": "ember", "h": 0.5 });
                    i++;
                }
            }
            this._madeTo += 15 + sp * 0.55 + this.rnd() * 9 - hard * 3;
        }
    }

    private put(z: number, lane: int, kind: string): void {
        this._things.push({ "z": z, "lane": lane, "kind": kind, "h": 0 });
    }

    /** Embers in an arc over something (a jump's path). */
    private arc(z: number, lane: int): void {
        let i: int = -2;
        while (i <= 2) {
            this._things.push({ "z": z + i * 1.6, "lane": lane, "kind": "ember", "h": 1.5 - i * i * 0.22 });
            i++;
        }
    }

    private line(z: number, lane: int, n: int): void {
        let i: int = 0;
        while (i < n) {
            this._things.push({ "z": z + i * 2.2, "lane": lane, "kind": "ember", "h": 0.5 });
            i++;
        }
    }

    private onDown(e: MouseEvent): void {
        // (the mouse: click left or right of Rezghul to change lane, above him to jump, below to slide)
        if (this._crashed || this._countdown > 0) {
            return;
        }
        let x: number = this.mouseX - this.xAt(0, this._laneX);
        let y: number = this.mouseY;
        if (Math.abs(x) > 70) {
            this.move(x > 0 ? 1 : -1);
        } else if (y < RunnerGame.GROUND - 80) {
            this.jump();
        } else {
            this.slideDown();
        }
    }

    public override keyDown(code: int): void {
        let was: boolean = this.key(code);
        super.keyDown(code);
        if (was || this._crashed || this._countdown > 0 || this.ended) {
            return;
        }
        if (code == Keyboard.LEFT || code == 65) {
            this.move(-1);
        } else if (code == Keyboard.RIGHT || code == 68) {
            this.move(1);
        } else if (code == Keyboard.UP || code == 87 || code == Keyboard.SPACE) {
            this.jump();
        } else if (code == Keyboard.DOWN || code == 83) {
            this.slideDown();
        }
    }

    private move(d: int): void {
        this._lane = Math.max(0, Math.min(2, this._lane + d)) | 0;
    }

    private jump(): void {
        if (this._h <= 0.001 && this._vy <= 0) {
            this._vy = 8.6;
            this._slide = 0;
            this._jumpBuf = 0;
            SOUNDS.Play("click1", 0.3);
        } else {
            this._jumpBuf = 0.22;
        }
    }

    private slideDown(): void {
        if (this._h > 0.001) {
            // (in the air: straight down, then the slide)
            this._vy = -14;
        }
        this._slide = 0.7;
        this._jumpBuf = 0;
    }

    protected override fixed(): void {
        if (this._countdown > 0) {
            this._countdown--;
            if (this._countdown == 0) {
                this.banner(KEYS.Get("io_t3a_ru_run"), 16747050, 30);
            }
            return;
        }
        if (this._crashed) {
            this._crashT++;
            return;
        }
        this._steps++;
        let dt: number = ArcadeGame.STEP / 1000;
        let sp: number = RunnerGame.speedAt(this._dist);
        this._dist += sp * dt;
        this._runT++;
        // the lane: slide across quickly
        this._laneX += (this._lane - this._laneX) * Math.min(1, dt * 14);
        // jumping and sliding
        if (this._h > 0 || this._vy > 0) {
            this._h += this._vy * dt;
            this._vy -= 26 * dt;
            if (this._h <= 0) {
                this._h = 0;
                this._vy = 0;
                if (this._jumpBuf > 0) {
                    this.jump();
                }
            }
        }
        if (this._jumpBuf > 0) {
            this._jumpBuf -= dt;
        }
        if (this._slide > 0 && this._h <= 0) {
            this._slide -= dt;
        }
        this.makeRoad();
        // what Rezghul runs into
        let at: int = Math.round(this._laneX) | 0;
        let keep: any[] = [];
        let crashedOn: string = null;
        for (let t of as3.values(this._things)) {
            let rel: number = Number(t.z) - this._dist;
            if (rel < -RunnerGame.CAM * 0.7) {
                continue;
            }
            keep.push(t);
            // (a lava pool is drawn from its z to 2 m beyond: it burns while Rezghul is over that, give or take a
            // little; it was z +/- 1.1, a metre before the pool he could see, so a jump timed to it fell short)
            if ((t.lane | 0) != at || (t.kind == "lava" ? rel > -0.25 || rel < -1.75 : Math.abs(rel) > 0.45)) {
                continue;
            }
            if (t.kind == "ember") {
                if (!t.got && Math.abs(this._h + 0.5 - Number(t.h)) < 0.95) {
                    t.got = true;
                    this._embers++;
                    SOUNDS.Play("click1", 0.25);
                }
                continue;
            }
            let hit: boolean = false;
            if (t.kind == "rock") {
                // (cleared once his feet are over most of it: the rock is 0.9 m, it was 0.85, all of it)
                hit = this._h < 0.6;
            } else if (t.kind == "lava") {
                hit = this._h < 0.15;
            } else if (t.kind == "bar") {
                hit = !(this._slide > 0 && this._h < 0.2);
            } else if (t.kind == "pillar") {
                hit = true;
            }
            // (the crash after the loop: breaking out of it dropped the road ahead, which a race still draws while
            // it waits for the rival; 9 October)
            if (hit && !crashedOn) {
                crashedOn = String(t.kind);
            }
        }
        this._things = keep;
        if (crashedOn) {
            this.crash(crashedOn);
        }
        if (this._versus && this._steps - this._sentAt >= 30) {
            this._sentAt = this._steps;
            ArcadeNet.send({ "t": "s", "score": this.score(), "m": this._dist | 0 });
        }
        if (this._steps % 6 == 0) {
            this.updateHud();
        }
    }

    private score(): int {
        return ((this._dist | 0) + this._embers * 10) | 0;
    }

    private crash(what: string): void {
        this._crashed = true;
        this._crashT = 0;
        SOUNDS.Play("ihit1", 0.9);
        this.updateHud();
        // (QoL #235: the games' words in the player's language)
        let why: string = KEYS.Get(what == "pillar" ? "io_t3a_ru_pillar" : (what == "bar" ? "io_t3a_ru_bar" : (what == "lava" ? "io_t3a_ru_lava" : "io_t3a_ru_rock")));
        if (this._versus) {
            if (!this._doneSent) {
                this._doneSent = true;
                ArcadeNet.send({ "t": "done", "score": this.score() });
                this.banner(why.toUpperCase(), 16738906, 70);
                this.leaveButton();
            }
            return;
        }
        this.over({ "title": KEYS.Get("io_t3a_ru_crashed"), "score": this.score(), "score2": this._dist | 0, "line": why + "\n" + KEYS.Get("io_t3a_ru_line", { "v1": this._dist | 0, "v2": this._embers, "v3": CasinoUI.number(this.score()) }) });
    }

    private updateHud(): void {
        ArcadeGame.setText(this._hudDist, CasinoUI.number(this._dist | 0) + " m");
        ArcadeGame.setText(this._hudEmbers, KEYS.Get("io_t3a_ru_embers", { "v1": this._embers }) + "\n" + KEYS.Get("io_t3a_score_n", { "v1": CasinoUI.number(this.score()) }));
        if (this._versus) {
            let diff: int = ((this._dist | 0) - this._rivalM) | 0;
            ArcadeGame.setText(this._hudRival, this._rivalName + ": " + CasinoUI.number(this._rivalM) + " m" + (this._rivalDone ? " " + KEYS.Get("io_t3a_ru_out") : "") + "\n" + (diff >= 0 ? KEYS.Get("io_t3a_ru_lead", { "v1": diff }) : KEYS.Get("io_t3a_ru_behind", { "v1": -diff })));
        }
    }

    /**
     * The road paved with its picture, in strips that get smaller into the distance (a picture can't be drawn in
     * perspective, but strips of it scaled down as they go come close). Drawn once.
     */
    private paveRoad(): void {
        let tex: BitmapData = ArcadeArt.picture(RunnerGame.ROAD);
        if (!tex) {
            return;
        }
        this._roadArt = true;
        let rg: any = this._road.graphics;
        rg.clear();
        let z0: number = -RunnerGame.CAM * 0.6;
        let n: int = 48;
        let k: int = 0;
        while (k < n) {
            // (the strips closer together far away: even steps of the screen's height, not of the road's length)
            let za: number = z0 + (RunnerGame.FAR - z0) * Math.pow(k / n, 2.2);
            let zb: number = z0 + (RunnerGame.FAR - z0) * Math.pow((k + 1) / n, 2.2);
            let sa: number = this.scaleAt(za);
            let sb: number = this.scaleAt(zb);
            let m: Matrix = new Matrix();
            let ts: number = sa * RunnerGame.LANE * 3 / tex.width;
            m.scale(ts, ts * 0.45);
            m.translate(ArcadeGame.GW / 2 - tex.width * ts / 2, this.yAt(za));
            rg.beginBitmapFill(tex, m, true, true);
            rg.moveTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * sa, this.yAt(za) + 1);
            rg.lineTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * sa, this.yAt(za) + 1);
            rg.lineTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * sb, this.yAt(zb));
            rg.lineTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * sb, this.yAt(zb));
            rg.endFill();
            k++;
        }
        // darker into the distance, and the kerbs
        let shade: Matrix = new Matrix();
        shade.createGradientBox(ArcadeGame.GW, ArcadeGame.GH - RunnerGame.HORIZON, Math.PI / 2, 0, RunnerGame.HORIZON);
        rg.beginGradientFill(GradientType.LINEAR, [0x000000, 0x000000], [0.65, 0], [0, 200], shade);
        rg.moveTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR), this.yAt(RunnerGame.FAR));
        rg.lineTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR), this.yAt(RunnerGame.FAR));
        rg.lineTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(z0), ArcadeGame.GH);
        rg.lineTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(z0), ArcadeGame.GH);
        rg.endFill();
        rg.lineStyle(4, 0x14080A, 1);
        rg.moveTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR), this.yAt(RunnerGame.FAR));
        rg.lineTo(ArcadeGame.GW / 2 - RunnerGame.LANE * 1.5 * this.scaleAt(z0), ArcadeGame.GH);
        rg.moveTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(RunnerGame.FAR), this.yAt(RunnerGame.FAR));
        rg.lineTo(ArcadeGame.GW / 2 + RunnerGame.LANE * 1.5 * this.scaleAt(z0), ArcadeGame.GH);
        rg.lineStyle(0, 0, 0);
    }

    /** A picture drawn into g: its bottom centre at (x, y), `scale` times its size. */
    private static blit(g: any, bmd: BitmapData, x: number, y: number, scale: number, alpha: number = 1): void {
        let w: number = bmd.width * scale;
        let h: number = bmd.height * scale;
        let m: Matrix = new Matrix();
        m.scale(scale, scale);
        m.translate(x - w / 2, y - h);
        g.beginBitmapFill(bmd, m, false, scale < 1.5);
        g.drawRect(x - w / 2, y - h, w, h);
        g.endFill();
    }

    protected override draw(alpha: number): void {
        if (!this._roadArt) {
            this.paveRoad();
        }
        let g: any = this._world.graphics;
        g.clear();
        let sp: number = RunnerGame.speedAt(this._dist);
        let d: number = Number(this._dist + (this._crashed || this._countdown > 0 ? 0 : sp * alpha * ArcadeGame.STEP / 1000));
        // the lane stripes and the posts along the edges, sliding towards Rezghul
        let stripe: number = 6;
        let z: number = stripe - (d % stripe);
        while (z < RunnerGame.FAR) {
            let s: number = this.scaleAt(z);
            let s2: number = this.scaleAt(z + 2.4);
            g.lineStyle(Math.max(1, 4 * s), 0xFFB060, 0.55 * Math.min(1, s * 3));
            let ln: number = 0.5;
            while (ln <= 1.5) {
                g.moveTo(this.xAt(z, ln), this.yAt(z));
                g.lineTo(this.xAt(z + 2.4, ln), this.yAt(z + 2.4));
                ln += 1;
            }
            z += stripe;
        }
        g.lineStyle(0, 0, 0);
        let post: number = 12;
        z = post - (d % post);
        let posts: any[] = [];
        while (z < RunnerGame.FAR) {
            posts.push(z);
            z += post;
        }
        posts.reverse();
        for (const $value of as3.values(posts)) {
            let pz: number = Number($value);
            let ps: number = this.scaleAt(pz);
            for (const $value of as3.values([-1, 1])) {
                let side: int = $value | 0;
                let bx: number = ArcadeGame.GW / 2 + side * RunnerGame.LANE * 1.75 * ps;
                let by: number = this.yAt(pz);
                g.beginFill(0x1A1012, 1);
                g.drawRect(bx - 5 * ps, by - 70 * ps, 10 * ps, 70 * ps);
                g.endFill();
                g.beginFill(0xFF8A2A, 0.9);
                g.drawCircle(bx, by - 74 * ps, 7 * ps);
                g.endFill();
                g.beginFill(0xFFE080, 0.9);
                g.drawCircle(bx, by - 74 * ps, 3 * ps);
                g.endFill();
            }
        }
        // what is on the road, far first
        let list: any[] = [];
        for (let t of as3.values(this._things)) {
            let rel: number = Number(t.z) - d;
            if (rel < RunnerGame.FAR && rel > -RunnerGame.CAM * 0.6 && !t.got) {
                list.push({ "t": t, "rel": rel });
            }
        }
        as3.sortOn(list, "rel", Array.NUMERIC | Array.DESCENDING);
        // (Rezghul's picture is a layer of its own: what is still ahead goes under it, what he has passed over it)
        let front: any = this._front.graphics;
        front.clear();
        for (let o of as3.values(list)) {
            this.drawThing(o.rel < -0.2 ? front : g, o.t, Number(o.rel));
        }
        this.drawRezghul(g);
        // the floats
        let fl: any[] = [];
        for (let f of as3.values(this._floats)) {
            f.life--;
            f.t.y -= 0.8;
            f.t.alpha = Math.min(1, f.life / 12);
            if (f.life > 0) {
                fl.push(f);
            } else if (f.t.parent) {
                f.t.parent.removeChild(f.t);
            }
        }
        this._floats = fl;
    }

    private drawThing(g: any, t: any, rel: number): void {
        let s: number = this.scaleAt(rel);
        let x: number = this.xAt(rel, Number(t.lane));
        let y: number = this.yAt(rel);
        let w: number = RunnerGame.LANE * 0.8 * s;
        let k: string = String(t.kind);
        // (the pictures, art/devilsarcade/games, drawn at half their size times the distance's scale)
        let pic: BitmapData = ArcadeArt.picture(k == "rock" ? RunnerGame.ROCK : (k == "pillar" ? RunnerGame.PILLAR : (k == "bar" ? RunnerGame.BAR : (k == "ember" ? RunnerGame.EMBER : ""))));
        if (pic && k == "ember") {
            RunnerGame.blit(g, pic, x, y - Number(t.h) * RunnerGame.PPM * s + 15 * s, 0.6 * s);
            return;
        }
        if (pic) {
            g.beginFill(0x000000, 0.3);
            g.drawEllipse(x - w * 0.55, y - 6 * s, w * 1.1, 12 * s);
            g.endFill();
            RunnerGame.blit(g, pic, x, y + 2 * s, 0.5 * s);
            return;
        }
        if (k == "ember") {
            let ey: number = y - Number(t.h) * RunnerGame.PPM * s;
            g.beginFill(0xFF6A1A, 0.35);
            g.drawCircle(x, ey, 14 * s);
            g.endFill();
            g.beginFill(0xFFD040, 1);
            g.drawCircle(x, ey, 7 * s);
            g.endFill();
            g.beginFill(0xFFFFE0, 1);
            g.drawCircle(x - 2 * s, ey - 2 * s, 2.5 * s);
            g.endFill();
            return;
        }
        if (k == "lava") {
            let y2: number = this.yAt(rel + 2);
            let s2: number = this.scaleAt(rel + 2);
            let pool: BitmapData = ArcadeArt.picture(RunnerGame.POOL);
            if (pool) {
                let pm: Matrix = new Matrix();
                pm.scale(w / pool.width, w / pool.width * 0.5);
                pm.translate(x - w / 2, y2);
                g.beginBitmapFill(pool, pm, true, true);
            } else {
                g.beginFill(0xFF5A1A, 1);
            }
            g.moveTo(x - w / 2, y);
            g.lineTo(x + w / 2, y);
            g.lineTo(this.xAt(rel + 2, Number(t.lane)) + RunnerGame.LANE * 0.4 * s2, y2);
            g.lineTo(this.xAt(rel + 2, Number(t.lane)) - RunnerGame.LANE * 0.4 * s2, y2);
            g.endFill();
            if (!pool) {
                g.beginFill(0xFFD060, 0.8);
                g.drawEllipse(x - w * 0.25, (y + y2) / 2 - 3 * s, w * 0.5, 6 * s);
                g.endFill();
            }
            return;
        }
        // a shadow at its foot
        g.beginFill(0x000000, 0.3);
        g.drawEllipse(x - w * 0.55, y - 6 * s, w * 1.1, 12 * s);
        g.endFill();
        if (k == "rock") {
            let rh: number = 0.9 * RunnerGame.PPM * s;
            g.lineStyle(Math.max(1, 2 * s), 0x140A0A, 1);
            g.beginFill(0x6A5650, 1);
            g.moveTo(x - w / 2, y);
            g.lineTo(x - w * 0.42, y - rh * 0.8);
            g.lineTo(x - w * 0.1, y - rh);
            g.lineTo(x + w * 0.3, y - rh * 0.9);
            g.lineTo(x + w / 2, y - rh * 0.3);
            g.lineTo(x + w / 2, y);
            g.lineTo(x - w / 2, y);
            g.endFill();
            g.lineStyle(0, 0, 0);
            g.beginFill(0x9A847A, 0.8);
            g.drawEllipse(x - w * 0.3, y - rh * 0.92, w * 0.4, rh * 0.25);
            g.endFill();
        } else if (k == "bar") {
            let top: number = y - 1.85 * RunnerGame.PPM * s;
            let low: number = y - 1.05 * RunnerGame.PPM * s;
            g.beginFill(0x2A1A1A, 1);
            g.drawRect(x - w / 2 - 4 * s, top, 8 * s, y - top);
            g.drawRect(x + w / 2 - 4 * s, top, 8 * s, y - top);
            g.endFill();
            g.beginFill(0xFF4A1A, 0.45);
            g.drawRoundRect(x - w / 2, low - 14 * s, w, (top - low) * -1 + 10 * s, 12 * s, 12 * s);
            g.endFill();
            g.beginFill(0xFFB040, 1);
            g.drawRoundRect(x - w / 2, low - 9 * s, w, 12 * s, 8 * s, 8 * s);
            g.endFill();
            g.beginFill(0xFFF0B0, 1);
            g.drawRoundRect(x - w / 2, low - 6 * s, w, 5 * s, 4 * s, 4 * s);
            g.endFill();
        } else if (k == "pillar") {
            let ph: number = 3.6 * RunnerGame.PPM * s;
            let m: Matrix = new Matrix();
            m.createGradientBox(w, ph, 0, x - w / 2, y - ph);
            g.lineStyle(Math.max(1, 2 * s), 0x08040A, 1);
            g.beginGradientFill(GradientType.LINEAR, [0x6A5A7A, 0x2A2030, 0x120A16], [1, 1, 1], [0, 120, 255], m);
            g.moveTo(x - w * 0.45, y);
            g.lineTo(x - w * 0.38, y - ph * 0.95);
            g.lineTo(x, y - ph);
            g.lineTo(x + w * 0.38, y - ph * 0.95);
            g.lineTo(x + w * 0.45, y);
            g.lineTo(x - w * 0.45, y);
            g.endFill();
            g.lineStyle(Math.max(1, 3 * s), 0xFF6A1A, 0.8);
            g.moveTo(x - w * 0.1, y - ph * 0.15);
            g.lineTo(x + w * 0.05, y - ph * 0.45);
            g.lineTo(x - w * 0.08, y - ph * 0.7);
            g.lineStyle(0, 0, 0);
        }
    }

    private drawRezghul(g: any): void {
        let x: number = this.xAt(0, this._laneX);
        let y: number = RunnerGame.GROUND;
        // his shadow
        g.beginFill(0x000000, 0.35);
        g.drawEllipse(x - 40 + this._h * 6, y - 8, 80 - this._h * 12, 16);
        g.endFill();
        let row: int = (this._crashed ? 0 : ((this._runT / 3) | 0) % 6) | 0;
        let deg: number = this._crashed ? 270 + this._crashT * 12 : 270 + (this._lane - this._laneX) * 25;
        let fr: BitmapData = ArcadeArt.frame("rezghul", deg, row);
        if (fr) {
            this._rez.bitmapData = fr;
            this._rez.smoothing = true;
            let sc: number = 2.3;
            let sy: number = this._slide > 0 && this._h <= 0 ? sc * 0.62 : sc;
            this._rez.scaleX = sc;
            this._rez.scaleY = sy;
            this._rez.x = x - fr.width * sc / 2;
            this._rez.y = y - fr.height * sy - this._h * RunnerGame.PPM + 8;
            this._rez.alpha = Number(this._crashed ? Math.max(0.3, 1 - this._crashT / 60) : 1);
        }
    }

    public override onNet(msg: any): void {
        let t: string = String(msg.t);
        if (t == "s") {
            this._rivalScore = msg.score | 0;
            this._rivalM = msg.m | 0;
            this.updateHud();
        } else if (t == "done") {
            this._rivalDone = true;
            this._rivalScore = msg.score | 0;
            this.banner(KEYS.Get("io_t3a_ru_rival_crashed", { "v1": this._rivalName.toUpperCase() }), 10289002, 50);
            this.updateHud();
        } else if (t == "end") {
            let you: int = this.ctx.you | 0;
            let scores: any[] = as3.as(msg.scores, Array);
            let won: boolean = (msg.winner | 0) == you;
            let draw: boolean = (msg.winner | 0) < 0;
            this._crashed = true;
            this.over({ "title": KEYS.Get(won ? "io_t3a_you_win" : (draw ? "io_t3a_draw" : "io_t3a_you_lose")), "won": won, "color": won ? 0x9CFF6A : (draw ? 0xFFD58A : 0xFF6A5A), "line": ArcadeGame.ioVsLine(CasinoUI.number(this.score()), this._rivalName, CasinoUI.number(Math.max(0, scores[1 - you] | 0)), msg.reason == "left", won), "submit": false });
        } else if (t == "lost") {
            this.over({ "title": KEYS.Get("io_t3a_disconnected"), "color": 0xFF6A5A, "line": KEYS.Get("io_t3a_match_lost"), "submit": false });
        }
    }

    public override destroy(): void {
        super.destroy();
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
    }
}
