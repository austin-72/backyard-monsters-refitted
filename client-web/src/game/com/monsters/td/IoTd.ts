import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { Dictionary, Timer, getTimer, setTimeout } from "flash/utils";
import { IoTd2, IoTd2Ui, ArcadeArt, ArcadeNet, BASE, BFOUNDATION, BMUSHROOM, BTOWER, CREATURELOCKER, CREEPS, EFFECTS, EnumYardType, GLOBAL, GRID, ImageCache, InstanceManager, IoHfoStepClock, IoTdLink, IoTdPath, IoTdUi, IoTdWaves, KEYS, LOGGER, MAP, MonsterBase, PLANNER, PLEASEWAIT, PlannerNode, PlannerTemplate, SOUNDS, SecNum, UI2, UI_MISSIONMENU, URLLoaderApi, WMATTACK, ArcadeWindow } from "@game";

/**
 * Inferno-only: Hellgate Defense, the tower defense minigame (the user's design, 6 October). Its button sits in
 * the workers' column, above Moloch's Gauntlet's (UI_TOP / UI_WORKERS).
 *
 * A run is a yard of its own (server services/td/hellgate.ts: a "td" save, made afresh for every run, loaded
 * in build mode with io_td, GLOBAL.ioTd): an empty arena walled in on every side but two openings, at its far
 * left and far right corners. The monsters come up out of the ground past the left one and walk to the Town
 * Hall, just past the right one; every one that gets there takes lives. The player:
 *
 *  - places walls with the Yard Planner (its Walls tool, or one at a time from storage) to make the monsters'
 *    way longer: the planner opens only between waves (the maze is locked while a wave is on), the arena's own
 *    walls, the Hall and the towers can't be moved in it, and a maze with no way through can't be applied. The
 *    run starts with START_WALLS walls; some waves give more (IoTdWaves.wallsFor).
 *  - buys towers (the shop under the yard, IoTdUi) with the run's gold, which comes from kills and cleared
 *    waves. A tower can't be put where it would close the way. Clicking a tower opens its panel: three upgrade
 *    paths, Damage, Fire rate and Range (TIERS each), what it shoots first, and Sell (SELL_BACK of what it cost).
 *    Upgrades show on the tower: it grows a level for every two bought.
 *  - starts each wave (or lets them start themselves: Auto). Waves are endless and harder each time
 *    (IoTdWaves), with champions as bosses. The score is the number of waves survived; the server keeps each
 *    player's best for the Leaderboards' Hellgate tab (td/finish, when the Hall falls or the player leaves).
 *
 * The monsters walk the maze by IoTdPath (the game's own pathing would break through the walls instead): they
 * are made with the "wander" behaviour, which only follows waypoints, and are given the way out from wherever
 * they are, again whenever the maze changes. Flying monsters go straight over it. Anything the arena's
 * monsters make (Rezghul's risen dead) is put on the path too. Nothing in a run is the player's: GLOBAL.ioTd
 * makes the arena a yard like a Designer draft (GLOBAL.ioDesignMode: no wild attacks, warts, quests or pets;
 * building is free and at once, with the gold taken here), and the server keeps nothing of its saves.
 */
export class IoTd extends ASObject {
    public static readonly START_GOLD: int = 800;

    public static readonly START_LIVES: int = 20;

    /** The arena's monsters walk this many times their usual speed (a raid's pace is far too slow for it). */
    public static readonly SPEED: number = 2;

    public static readonly SELL_BACK: number = 0.7;

    /**
     * The towers for sale: [type, price], cheapest first. Priced by what they do in the arena (measured, 6 October:
     * damage a second at their first level, 80 steps a second): Blast Tower 54 (with splash, ground only),
     * Sharpshooter 100 (long range), Quake Tower 156 (everything around it, ground only), Cinder Coil 198 (and it
     * chains), Obsidian Mortar 140 (long range, splash), Magma Tower 444.
     */
    public static readonly TOWERS: any[] = [[130, 100], [21, 120], [129, 350], [144, 400], [145, 420], [132, 450]];

    /** The towers for sale in this run: Hellgate Defense's six, and in Hellgate Defense 2 its six more (IoTd2). */
    public static get towerList(): any[] {
        return IoTd2.on ? IoTd2.towerList() : IoTd.TOWERS;
    }

    /** The upgrade paths in this run (Hellgate Defense 2 adds each tower's Special). */
    public static get paths(): any[] {
        return IoTd2.on ? IoTd2.PATHS : IoTd.PATHS;
    }

    /** The game's simulation steps counted in this run (IoTd2's effects and towers keep time by them). */
    public static get steps(): int {
        return IoTd._clock ? IoTd._clock.steps | 0 : 0;
    }

    /** The arena as the server described it (io_td.arena). */
    public static get arena(): any {
        return IoTd._arena;
    }

    /** The maze's grid (IoTd2 reads where the monsters are on it). */
    public static get grid(): IoTdPath {
        return IoTd._path;
    }

    public static readonly TIERS: int = 4;

    /** Each tier's price, as a share of the tower's. */
    public static readonly TIER_COST: any[] = [0.5, 0.9, 1.5, 2.4];

    /** The upgrade paths: what each tier (0 to TIERS) multiplies. Fire rate divides the time between shots. */
    public static readonly PATHS: any[] = ["dmg", "rate", "range"];

    public static readonly MULT: any = { "dmg": [1, 1.4, 1.9, 2.6, 3.5], "rate": [1, 1.25, 1.55, 1.9, 2.4], "range": [1, 1.12, 1.25, 1.4, 1.6] };

    /** What a tower shoots first: BTOWER._priority (5, "first", is the arena's: the monster nearest the Hall). */
    public static readonly FIRST: int = 5;

    public static readonly STRONG: int = 3;

    public static readonly CLOSE: int = 1;

    /** Seconds before the next wave starts by itself, with Auto on. */
    public static readonly AUTO_WAIT: int = 3;

    /** Versus: the seconds between waves (twice AUTO_WAIT's; 7 October, the user's). */
    public static readonly VERSUS_WAIT: int = 6;

    private static readonly WALL: int = 17;

    // ---- the run
    private static _on: boolean = false;

    private static _arena: any = null;

    private static _path: IoTdPath = null;

    /** A second grid for trying a maze out (the planner's Apply, a tower's spot). */
    private static _trial: IoTdPath = null;

    public static gold: int = 0;

    public static lives: int = 0;

    /** QoL #622: when the last life-lost sound played (getTimer). */
    private static _ioLifeSoundAt: number = -1000;

    /** The wave being fought (or the last one fought). */
    public static wave: int = 0;

    /** Waves survived: the score. */
    public static cleared: int = 0;

    public static kills: int = 0;

    public static waveOn: boolean = false;

    public static over: boolean = false;

    public static auto: boolean = false;

    public static best: any = null;

    private static _queue: any[] = [];

    /**
     * The game's simulation steps (80 a second), counted while the arena is up: the monsters come so many steps
     * apart, not so many seconds, so a slow machine (the battle in slow motion) or fast forward keeps the same
     * spacing on the ground.
     */
    private static _clock: IoHfoStepClock = null;

    /** The step the next monster comes at. */
    private static _nextAt: int = 0;

    private static _autoAt: int = 0;

    /** The arena's monsters: MonsterBase -> {bounty, leak, boss, flier, leaked}. */
    private static _creeps: Dictionary = new Dictionary(true);

    /** The towers bought: BTOWER (or IoTd2's Hellforged towers, decorations) -> {dmg, rate, range, special, spent, ...}. */
    private static _towers: Dictionary = new Dictionary(true);

    /** The arena's own buildings (its walls and the Hall), by id: the planner never moves them. */
    private static _fixed: any = {};

    /** The tower type being placed from the shop (0: none). */
    public static placing: int = 0;

    private static _ticker: Sprite = null;

    private static _frames: int = 0;

    private static _zoomedBefore: boolean = false;

    private static _busy: boolean = false;

    /** A tower's spot checked last (BuildBlockers asks every frame while one is being placed). */
    private static _spotKey: string = null;

    private static _spotAnswer: string = "";

    /** What hideGameUi put away, to be put back (the quest list). */
    private static _hidden: any[] = [];

    /**
     * The Hellgate itself where the monsters come in (7 October, the user's: more detailed art): an obsidian
     * gate with fire in it (arcade/hellgate/gate.png, art/devilsarcade/games: 320 x 320, drawn at half size, its
     * foot at x 160, y 270), on the ground under the monsters, so they come out of it.
     */
    public static readonly GATE_ART: string = "arcade/hellgate/gate.png";

    private static _gate: Sprite = null;

    /** Fast forward: the arena runs at twice the speed (GLOBAL.ioStepScale). */
    public static get fast(): boolean {
        return GLOBAL.ioStepScale > 1;
    }

    public static set fast(on: boolean) {
        GLOBAL.ioStepScale = on && IoTd._on ? 2 : 1;
        IoTd._ioSpeed = GLOBAL.ioStepScale;
    }

    /** (QoL #377) the speed chosen, 1 to 3, kept while paused */
    private static _ioSpeed: number = 1;

    /** QoL #377: 1x, 2x or 3x (GLOBAL.ioStepScale), and Pause (0) in a solo run. */
    public static get speed(): number {
        return IoTd._ioSpeed;
    }

    public static set speed(n: number) {
        IoTd._ioSpeed = Math.max(1, Math.min(3, n | 0));
        if (!IoTd.paused) {
            GLOBAL.ioStepScale = IoTd._on ? IoTd._ioSpeed : 1;
        }
    }

    public static get paused(): boolean {
        return IoTd._on && GLOBAL.ioStepScale == 0;
    }

    /** Pause and go on: solo runs only (a co-op or versus arena keeps time with the other player's). */
    public static set paused(on: boolean) {
        if (!IoTd._on) {
            return;
        }
        if (on && (IoTdLink.coop || IoTdLink.versus)) {
            return;
        }
        GLOBAL.ioStepScale = on ? 0 : IoTd._ioSpeed;
    }

    // ---- the button
    /** The button: what the minigame is, then a new run. */
    public static Show(e: MouseEvent = null): void {
        if (IoTd._busy || !GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3t_not_attacked"));
            return;
        }
        IoTd._busy = true;
        IoTd.call("status", [], (r: any): void => {
            IoTd._busy = false;
            IoTd.best = r.best;
            IoTdUi.Intro(IoTd.best, IoTd.open);
            IoTd.toldRecovered(r);
        }, (message: string): void => {
            IoTd._busy = false;
            GLOBAL.Message(message);
        });
    }

    /** A new run: the server makes the arena afresh, then it loads. */
    public static open(): void {
        if (IoTd._busy) {
            return;
        }
        IoTd._busy = true;
        ArcadeArt.preload([IoTdUi.PANEL_ART, IoTd.GATE_ART]);
        PLEASEWAIT.Show(KEYS.Get("io_t3t_td_opening"));
        IoTd.call("open", [], (r: any): void => {
            IoTd._busy = false;
            PLEASEWAIT.Hide();
            IoTd.best = r.best;
            BASE.LoadBase(null, 0, Number(r.baseid), GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }, (message: string): void => {
            IoTd._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(message);
            // (a Versus or Co-op match waiting for this arena: let go, not left waiting for hours, its
            // start taken by the next Solo run; 9 October)
            if (IoTdLink.pending) {
                ArcadeNet.send({ "t": "x" });
                IoTdLink.Cleanup();
            }
        });
    }

    public static get on(): boolean {
        return IoTd._on && GLOBAL.ioTdMode();
    }

    // ---- the arena loaded (BASE, after the yard is set up) and left (BASE.Cleanup)
    public static Setup(): void {
        IoTd.Cleanup();
        if (!GLOBAL.ioTdMode()) {
            return;
        }
        IoTd._on = true;
        IoTd._arena = GLOBAL._ioTd.arena;
        // (Hellgate Defense 2's maps: more ways in, another way out, or the Hall in the middle)
        let ways: any[] = IoTd._arena.entries ? as3.as(IoTd._arena.entries, Array) : null;
        let out: Point = IoTd._arena.exit ? new Point(Number(IoTd._arena.exit[0]), Number(IoTd._arena.exit[1])) : null;
        IoTd._path = new IoTdPath(IoTd._arena.half | 0, IoTd._arena.wall | 0, ways, out);
        IoTd._trial = new IoTdPath(IoTd._arena.half | 0, IoTd._arena.wall | 0, ways, out);
        if (IoTd._arena.hallInside) {
            IoTd._path.setExits(IoTd.hallExits());
            IoTd._trial.setExits(IoTd.hallExits());
        }
        IoTd2.Setup();
        IoTd.gold = IoTd2.on ? IoTd2.startGold() : IoTd.START_GOLD;
        IoTd.lives = IoTd2.on ? IoTd2.startLives() : IoTd.START_LIVES;
        IoTd.wave = 0;
        IoTd.cleared = 0;
        IoTd.kills = 0;
        IoTd.waveOn = false;
        IoTd.over = false;
        IoTd.placing = 0;
        // (the last run's next-wave time gone with it: with Auto on, wave 1 of the next run started at once,
        // before anything was built; 9 October)
        IoTd._autoAt = 0;
        IoTd._nextAt = 0;
        IoTd._queue = [];
        IoTd._creeps = new Dictionary(true);
        IoTd._towers = new Dictionary(true);
        IoTd._fixed = {};
        IoTd._spotKey = null;
        IoTd._clock = new IoHfoStepClock();
        GLOBAL.addFastTickable(IoTd._clock);
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (b) {
                IoTd._fixed[b._id] = true;
            }
        }
        // the run's walls, in storage for the Yard Planner (a level below the arena's own)
        if (!BASE._buildingsStored) {
            BASE._buildingsStored = {};
        }
        BASE._buildingsStored["b" + IoTd.WALL] = new SecNum(IoTd2.on ? IoTd2.startWalls() : IoTd._arena.walls | 0);
        BASE._buildingsStored["bl" + IoTd.WALL] = new SecNum(2);
        IoTd.rebuild();
        // the whole arena on screen
        IoTd._zoomedBefore = GLOBAL._zoomed;
        if (!GLOBAL._zoomed) {
            GLOBAL.Zoom();
        }
        IoTd.hideGameUi();
        IoTd.showGate();
        SOUNDS.PlayMusic("musicibuild");
        IoTdUi.Show();
        IoTdUi.Update();
        if (!IoTd._ticker) {
            IoTd._ticker = new Sprite();
        }
        IoTd._ticker.addEventListener(Event.ENTER_FRAME, IoTd.tick);
        IoTd.watchUnload();
        // (a Versus or Co-op run from the Devil's Arcade: linked to the other player's)
        if (IoTdLink.pending) {
            IoTdLink.attached();
        } else if (IoTd2.on) {
            IoTd2Ui.Show();
        } else {
            IoTdUi.Help(false);
        }
    }

    public static Cleanup(): void {
        if (IoTd._ticker) {
            IoTd._ticker.removeEventListener(Event.ENTER_FRAME, IoTd.tick);
        }
        if (!IoTd._on) {
            return;
        }
        IoTd._on = false;
        IoTd2.Cleanup();
        IoTdLink.Cleanup();
        GLOBAL.ioStepScale = 1;
        IoTd._ioSpeed = 1;
        if (IoTd._clock) {
            GLOBAL.removeFastTickable(IoTd._clock);
            IoTd._clock = null;
        }
        IoTdUi.Hide();
        if (IoTd._gate && IoTd._gate.parent) {
            IoTd._gate.parent.removeChild(IoTd._gate);
        }
        IoTd._gate = null;
        IoTd.showGameUi();
        if (GLOBAL._zoomed && !IoTd._zoomedBefore) {
            GLOBAL.Zoom();
        }
        IoTd._queue = [];
        IoTd._creeps = new Dictionary(true);
        IoTd._towers = new Dictionary(true);
        IoTd.waveOn = false;
        IoTd.placing = 0;
    }

    /**
     * The yard's own bars stay down in the arena (IoTdUi is its interface), and the quest list is put away (it
     * would cover the tower shop); it comes back when the arena is left. The chat stays (7 October, the user's:
     * chat works in every minigame): the tower shop moves over to make room for it (IoTdUi.layout).
     */
    private static hideGameUi(): void {
        // (only bars that show: a Hide lays the whole interface out again, the chat's lines included, and this
        // runs every 30 frames; 7 October, performance)
        if (UI2._showTop) {
            UI2.Hide("top");
        }
        if (UI2._showBottom) {
            UI2.Hide("bottom");
        }
        let layer: Sprite = GLOBAL._layerUI;
        for (let i: int = 0; layer && i < layer.numChildren; i++) {
            let d: DisplayObject = layer.getChildAt(i);
            if (d.visible && d instanceof UI_MISSIONMENU) {
                d.visible = false;
                IoTd._hidden.push(d);
            }
        }
    }

    private static showGameUi(): void {
        for (let d of as3.values(IoTd._hidden)) {
            d.visible = true;
        }
        IoTd._hidden = [];
    }

    // ---- the maze
    private static half(): int {
        return IoTd._arena.half | 0;
    }

    private static wall(): int {
        return IoTd._arena.wall | 0;
    }

    /** A building's top left on the grid (its mc stands at the top left corner of its footprint). */
    private static gridOf(b: BFOUNDATION): Point {
        let p: Point = GRID.FromISO(b._mc.x, b._mc.y);
        return new Point(Math.round(p.x / 5) * 5, Math.round(p.y / 5) * 5);
    }

    private static sizeOf(b: BFOUNDATION): Point {
        if (b._footprint && b._footprint.length) {
            return new Point(b._footprint[0].width, b._footprint[0].height);
        }
        return b._type == IoTd.WALL ? new Point(20, 20) : new Point(70, 70);
    }

    /** Marks every building of the yard on a grid (not the one being placed, unless asked). */
    private static fill(grid: IoTdPath, extra: BFOUNDATION = null): void {
        grid.clear();
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || !b._mc || b instanceof BMUSHROOM || (b == GLOBAL._newBuilding && b != extra) || (b._type == 14 && !IoTd._arena.hallInside)) {
                continue;
            }
            let at: Point = IoTd.gridOf(b);
            let s: Point = IoTd.sizeOf(b);
            grid.block(at.x, at.y, s.x, s.y);
        }
    }

    /** The maze changed (a tower bought or sold, the planner applied): the way out again, for everyone. */
    public static rebuild(): void {
        if (!IoTd._path) {
            return;
        }
        IoTd.fill(IoTd._path);
        IoTd._path.solve();
        IoTd._spotKey = null;
        for (let k of (IoTd._creeps?.keys() ?? [])) {
            IoTd.route(as3.as(k, MonsterBase));
        }
        IoTdUi.Update();
    }

    /** The maze's length (grid units): the way through, from the way in to the way out. */
    public static get mazeLength(): int {
        return IoTd._path ? IoTd._path.length | 0 : 0;
    }

    /** A Hall in the middle of the arena (Hellgate Defense 2's Crossroads): the grid points just round it, the way out. */
    private static hallExits(): any[] {
        let h: any[] = as3.as(IoTd._arena.hall, Array);
        let x0: number = Number(h[0]);
        let y0: number = Number(h[1]);
        let size: number = Number(h[2]);
        let out: any[] = [];
        for (let d: number = 5; d < size; d += 10) {
            out.push(new Point(x0 + d, y0 - 5));
            out.push(new Point(x0 + d, y0 + size + 5));
            out.push(new Point(x0 - 5, y0 + d));
            out.push(new Point(x0 + size + 5, y0 + d));
        }
        return out;
    }

    /** Inside the arena (not in its border, not outside). */
    private static inside(x: number, y: number, w: number, h: number): boolean {
        return x >= -IoTd.half() && y >= -IoTd.half() && x + w <= IoTd.half() && y + h <= IoTd.half();
    }

    /**
     * BASE.BuildBlockers, while a tower from the shop is being placed: why it can't go here ("" if it can). Not
     * outside the arena, not on anything else (7 October: the game's own check misses walls laid with the
     * Yard Planner), not where it would close the way, nor shut a monster in.
     */
    public static placeBlocker(b: BFOUNDATION): string {
        if (!IoTd.on) {
            return "";
        }
        let at: Point = IoTd.gridOf(b);
        let s: Point = IoTd.sizeOf(b);
        let key: string = b._type + ":" + at.x + "," + at.y;
        if (key == IoTd._spotKey) {
            return IoTd._spotAnswer;
        }
        IoTd._spotKey = key;
        IoTd._spotAnswer = "";
        // (QoL #235: the reasons in the player's language)
        if (!IoTd.inside(at.x, at.y, s.x, s.y)) {
            IoTd._spotAnswer = KEYS.Get("io_t3t_td_inside");
        } else if (IoTd.overlaps(b, at, s)) {
            IoTd._spotAnswer = KEYS.Get("io_t3t_td_overlap");
        } else if (IoTd.gold < IoTd.priceOf(b._type)) {
            IoTd._spotAnswer = KEYS.Get("io_t3t_td_no_gold");
        } else {
            IoTd.fill(IoTd._trial);
            IoTd._trial.block(at.x, at.y, s.x, s.y);
            if (!IoTd._trial.solve()) {
                IoTd._spotAnswer = KEYS.Get("io_t3t_td_closes");
            } else if (IoTd.shutsIn(IoTd._trial)) {
                IoTd._spotAnswer = KEYS.Get("io_t3t_td_shuts");
            }
        }
        return IoTd._spotAnswer;
    }

    /**
     * BFOUNDATION.Place, a click where the tower being placed can't go: it stays in the hand and the reason shows
     * (true), rather than being put back without a word. Not for anything but a tower from the shop.
     */
    public static keepHeld(b: BFOUNDATION): boolean {
        if (!IoTd.on || !b || b != GLOBAL._newBuilding || !(IoTd.placing || IoTd.isTowerType(b._type))) {
            return false;
        }
        IoTd._spotKey = null;
        let why: string = IoTd.placeBlocker(b);
        IoTdUi.Toast(why || KEYS.Get("io_t3t_td_overlap"));
        return true;
    }

    /** Another building of the arena (a wall, a tower, the Hall) stands on any of this footprint. */
    private static overlaps(b: BFOUNDATION, at: Point, s: Point): boolean {
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let other: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!other || other == b || !other._mc || other instanceof BMUSHROOM) {
                continue;
            }
            let p: Point = IoTd.gridOf(other);
            let q: Point = IoTd.sizeOf(other);
            if (at.x < p.x + q.x && p.x < at.x + s.x && at.y < p.y + q.y && p.y < at.y + s.y) {
                return true;
            }
        }
        return false;
    }

    /** A walking monster that would have no way out on this grid. */
    private static shutsIn(grid: IoTdPath): boolean {
        for (let k of (IoTd._creeps?.keys() ?? [])) {
            let c: MonsterBase = as3.as(k, MonsterBase);
            let info: any = IoTd._creeps.get(k);
            if (!c || info.flier || c.health <= 0) {
                continue;
            }
            let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
            let cell: int = grid.cellAt(g.x, g.y);
            if (cell >= 0 && !grid.blocked(cell) && !grid.reaches(cell)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The planner's Apply (BasePlannerPopup): why this plan can't be the maze ("" if it can). rows: [type, x, y,
     * width] of everything placed on the plan.
     */
    public static planBlocker(rows: any[]): string {
        if (!IoTd.on) {
            return "";
        }
        if (IoTd.waveOn) {
            return KEYS.Get("io_t3t_td_locked");
        }
        IoTd._trial.clear();
        for (let r of as3.values(rows)) {
            let t: int = r[0] | 0;
            if (t == 14) {
                continue;
            }
            let w: int = (r[3] | 0) > 0 ? r[3] | 0 : (t == IoTd.WALL ? 20 : 70);
            IoTd._trial.block(Number(r[1]), Number(r[2]), w, w);
        }
        if (!IoTd._trial.solve()) {
            return KEYS.Get("io_t3t_td_gap");
        }
        return "";
    }

    /** The planner's Apply checks walls and towers too: the run's own go inside the arena. */
    public static planWallOutside(x: number, y: number, w: number): boolean {
        return IoTd.on && !IoTd.inside(x, y, w, w);
    }

    /**
     * In the planner: the arena's own walls and the Hall stay where they are. The run's walls and its towers
     * move (towers since 7 October, the user's); see plannerKept for what may be stored.
     */
    public static plannerLocked(node: PlannerNode): boolean {
        if (!IoTd.on || !node) {
            return false;
        }
        if (node.type != IoTd.WALL) {
            return !IoTd.isTowerType(node.type);
        }
        return node.id != PlannerTemplate._DECORATION_ID && IoTd._fixed[node.id] == true;
    }

    /** In the planner: what can't be put into storage (or cleared): what is locked, and the towers (sold from their panel). */
    public static plannerKept(node: PlannerNode): boolean {
        return Boolean(IoTd.on && node && (IoTd.plannerLocked(node) || IoTd.isTowerType(node.type)));
    }

    /** The planner opens only between waves. */
    public static Plan(e: MouseEvent = null): void {
        if (!IoTd.on) {
            return;
        }
        if (IoTd.waveOn) {
            IoTdUi.Toast(KEYS.Get("io_t3t_td_locked"));
            return;
        }
        if (IoTd.over) {
            return;
        }
        IoTdUi.ClosePanel();
        PLANNER.Show();
    }

    /** The planner was applied: walls it took back into storage leave the yard. */
    public static plannerApplied(): void {
        IoTd.rebuild();
        IoTdUi.Toast(IoTd.mazeLength > 0 ? KEYS.Get("io_t3t_td_maze_len", { "v1": IoTd.mazeLength }) : "");
    }

    /** Walls in storage, for the planner. */
    public static get wallsLeft(): int {
        return BASE._buildingsStored && BASE._buildingsStored["b" + IoTd.WALL] ? BASE._buildingsStored["b" + IoTd.WALL].Get() | 0 : 0;
    }

    // ---- towers
    public static priceOf(type: int): int {
        for (let t of as3.values(IoTd.towerList)) {
            if ((t[0] | 0) == type) {
                return t[1] | 0;
            }
        }
        return 0;
    }

    public static isTowerType(type: int): boolean {
        return IoTd.priceOf(type) > 0;
    }

    /** The shop: places a tower of this type (the game's own placing; paid for when it is put down). */
    public static Buy(type: int): void {
        if (!IoTd.on || IoTd.over) {
            return;
        }
        let price: int = IoTd.priceOf(type);
        if (IoTd.gold < price) {
            IoTdUi.Toast(KEYS.Get("io_t3t_td_no_gold_for", { "v1": KEYS.Get(as3.str(GLOBAL._buildingProps[type - 1].name)), "v2": price }));
            return;
        }
        IoTdUi.ClosePanel();
        // (9 October, the user's: "if you double click the buy button for a tower you can place it anywhere
        // unrestricted". The second click's Buy put down a new tower while the first was still following the
        // mouse; making it cancelled the first, and the first's Cancel cleared `placing`, so the new one was
        // placed with none of the arena's checks. One tower at a time: the one being placed is put back first,
        // and `placing` is set once the new one is made.)
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        IoTd._spotKey = null;
        IoTd.placing = type;
        let b: BFOUNDATION = BASE.addBuildingB(type);
        IoTd.placing = b ? type : 0;
    }

    /** BFOUNDATION, a building put down: a tower from the shop is paid for. */
    public static placed(b: BFOUNDATION): void {
        if (!IoTd.on || !b) {
            return;
        }
        if ((b instanceof BTOWER || IoTd2.isCustom(b._type)) && IoTd.isTowerType(b._type)) {
            let price: int = IoTd.priceOf(b._type);
            IoTd.gold = Math.max(0, IoTd.gold - price) | 0;
            // (QoL #381: "fresh": what was paid since the last wave began, given back in full when sold before the next)
            let info: any = { "dmg": 0, "rate": 0, "range": 0, "special": 0, "spent": price, "fresh": IoTd.waveOn ? 0 : price, "kills": 0, "rank": 0, "priority": IoTd.FIRST };
            IoTd._towers.set(b, info);
            if (b instanceof BTOWER) {
                as3.cast(b, BTOWER)._priority = IoTd.hasPriority(b._type) ? IoTd.FIRST : IoTd.CLOSE;
                as3.cast(b, BTOWER).Props();
            }
            IoTd2.towerPlaced(b, info);
            SOUNDS.Play("inf_buildingplace");
        }
        IoTd.placing = 0;
        IoTd.rebuild();
    }

    /** Its numbers: BTOWER.Props, after the level's own. The upgrades work on its first level's. */
    public static tune(t: BTOWER): void {
        if (!IoTd.on || !t || !IoTd.isTowerType(t._type)) {
            return;
        }
        let info: any = IoTd._towers.get(t) || { "dmg": 0, "rate": 0, "range": 0 };
        let base: any = GLOBAL._buildingProps[t._type - 1].stats[0];
        t._range = (Number(base.range) * IoTd.MULT.range[info.range]) | 0;
        t.damageProperty.value = Number(base.damage) * IoTd.MULT.dmg[info.dmg];
        t._rate = Math.max(1, Math.round(Number(base.rate) / IoTd.MULT.rate[info.rate]) | 0) | 0;
        // (Hellgate Defense 2: its veteran rank, the War Drums beside it)
        if (IoTd2.on) {
            IoTd2.tuneTower(t, info);
        }
    }

    /**
     * The Cinder Coil's charge and the Quake Tower's wind-up take longer than their reload: a Fire rate upgrade
     * runs them this many times faster (1 outside the arena).
     */
    public static cycleSpeed(t: BTOWER): number {
        let info: any = IoTd.on && t ? IoTd._towers.get(t) : null;
        return Number(info ? Number(IoTd.MULT.rate[info.rate | 0]) : 1);
    }

    public static towerInfo(t: BFOUNDATION): any {
        return t ? IoTd._towers.get(t) : null;
    }

    /** The next tier's price on a path (0: none left). */
    public static tierPrice(t: BFOUNDATION, path: string): int {
        let info: any = IoTd._towers.get(t);
        if (!info || (info[path] | 0) >= IoTd.TIERS) {
            return 0;
        }
        // (Hellgate Defense 2's Special path costs a fifth more)
        let k: number = path == "special" ? 1.2 : 1;
        return (Math.round(IoTd.priceOf(t._type) * Number(IoTd.TIER_COST[info[path] | 0]) * k / 5) * 5) | 0;
    }

    /** The towers bought (BFOUNDATION -> info), for IoTd2. */
    public static get towers(): Dictionary {
        return IoTd._towers;
    }

    public static Upgrade(t: BFOUNDATION, path: string): boolean {
        let info: any = IoTd._towers.get(t);
        let price: int = IoTd.tierPrice(t, path);
        if (!IoTd.on || !info || price <= 0) {
            return false;
        }
        if (IoTd.gold < price) {
            IoTdUi.Toast(KEYS.Get("io_t3t_td_no_gold"));
            return false;
        }
        IoTd.gold -= price;
        info[path] = (info[path] | 0) + 1;
        info.spent = (info.spent | 0) + price;
        if (!IoTd.waveOn) {
            info.fresh = (info.fresh | 0) + price;
        }
        // a level of the tower's own for every two tiers bought: it shows
        let tiers: int = ((info.dmg | 0) + (info.rate | 0) + (info.range | 0) + (info.special | 0)) | 0;
        let top: int = IoTd2.isCustom(t._type) ? 3 : GLOBAL._buildingProps[t._type - 1].stats.length | 0;
        let want: int = Math.min(top, IoTd2.isCustom(t._type) ? 1 + ((tiers / 5) | 0) : 1 + ((tiers / 2) | 0)) | 0;
        while (t._lvl.Get() < want) {
            try {
                t.Upgraded();
            } catch (err) {
                break;
            }
        }
        if (t instanceof BTOWER) {
            as3.cast(t, BTOWER).Props();
        }
        IoTd2.towersChanged();
        SOUNDS.Play("upgrade1");
        IoTdUi.Update();
        return true;
    }

    public static sellPrice(t: BFOUNDATION): int {
        let info: any = IoTd._towers.get(t);
        if (!info) {
            return 0;
        }
        // (QoL #381: what was bought since the last wave began comes back in full; the rest at SELL_BACK)
        let fresh: int = IoTd.waveOn ? 0 : Math.min(info.spent | 0, info.fresh | 0) | 0;
        return (fresh + ((info.spent | 0) - fresh) * IoTd.SELL_BACK) | 0;
    }

    public static Sell(t: BFOUNDATION): void {
        let info: any = IoTd._towers.get(t);
        if (!IoTd.on || !info) {
            return;
        }
        IoTd.gold += IoTd.sellPrice(t);
        SOUNDS.Play("chaching");
        IoTd._towers.delete(t);
        try {
            t.RecycleC();
            InstanceManager.removeInstance(t);
        } catch (err) {
        }
        SOUNDS.Play("inf_buildingplace");
        IoTd.rebuild();
        IoTd2.towersChanged();
    }

    /** The arena's towers that shoot at a target of their choosing (the Quake Tower hits all around it). */
    public static hasPriority(type: int): boolean {
        if (IoTd2.isCustom(type)) {
            return IoTd2.hasPriority(type);
        }
        return type != 129;
    }

    public static SetPriority(t: BFOUNDATION, priority: int): void {
        let info: any = t ? IoTd._towers.get(t) : null;
        if (!info) {
            return;
        }
        info.priority = priority;
        if (t instanceof BTOWER) {
            as3.cast(t, BTOWER)._priority = priority;
            as3.cast(t, BTOWER)._retarget = 1;
        }
    }

    /** What a tower shoots first (BTOWER keeps its own; IoTd2's keep it in their info). */
    public static priorityOf(t: BFOUNDATION): int {
        if (t instanceof BTOWER) {
            return as3.cast(t, BTOWER)._priority | 0;
        }
        let info: any = t ? IoTd._towers.get(t) : null;
        return info ? info.priority | 0 : IoTd.FIRST;
    }

    /** BFOUNDATION.Click in the arena: a tower's panel (nothing else in the arena does anything). */
    public static clicked(b: BFOUNDATION): void {
        if (!IoTd.on || IoTd.placing) {
            return;
        }
        if (IoTd._towers.get(b)) {
            IoTdUi.TowerPanel(b);
        } else {
            IoTdUi.ClosePanel();
        }
    }

    /** BTOWER.FindTargets with "first": the monster with the least way left to the Hall first. */
    public static byFirst(a: any, b: any): int {
        let da: number = IoTd.left(as3.as(a.creep, MonsterBase));
        let db: number = IoTd.left(as3.as(b.creep, MonsterBase));
        return da < db ? -1 : (da > db ? 1 : 0);
    }

    /** How much way a monster has left to the Hall (grid units, roughly). */
    public static left(c: MonsterBase): number {
        if (!c || !IoTd._path) {
            return 0;
        }
        let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        if (IoTd2.on) {
            let at: int = IoTd._path.cellAt(g.x, g.y);
            if (at < 0) {
                return IoTd.pastExit(g, IoTd._creeps.get(c)) ? 0 : IoTd._path.length + 200;
            }
            return IoTd._path.reaches(at) ? IoTd._path.distance(at) : IoTd._path.length;
        }
        let lo: int = (-IoTd.half() - IoTd.wall()) | 0;
        let hi: int = (IoTd.half() + IoTd.wall()) | 0;
        if (g.x >= hi || g.y < lo) {
            return 0;
        }
        if (g.x < lo || g.y >= hi) {
            return IoTd._path.length + Point.distance(g, new Point(lo, hi));
        }
        let cell: int = IoTd._path.cellAt(g.x, g.y);
        return IoTd._path.reaches(cell) ? IoTd._path.distance(cell) : IoTd._path.length;
    }

    // ---- waves
    public static StartWave(e: MouseEvent = null): void {
        if (!IoTd.on || IoTd.waveOn || IoTd.over) {
            return;
        }
        // (Co-op: the button says the player is ready; the wave starts when both are, or a minute after the
        // first is: IoTdLink starts it)
        if (e != null && IoTdLink.coop && IoTdLink.readyUp()) {
            IoTdUi.Update();
            return;
        }
        if (PLANNER.isOpen()) {
            PLANNER.Hide();
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
            IoTd.placing = 0;
        }
        IoTd.wave = (IoTd.cleared + 1) | 0;
        IoTd._queue = IoTd2.on ? IoTd2.makeWave(IoTd.wave) : IoTdWaves.make(IoTd.wave);
        IoTd._nextAt = IoTd._clock ? IoTd._clock.steps : 0;
        IoTd._autoAt = 0;
        IoTd.waveOn = true;
        // (QoL #381: from now on, what was bought is sold at the usual loss)
        for (let v of IoTd._towers.values()) {
            if (v) {
                v.fresh = 0;
            }
        }
        SOUNDS.PlayMusic("musicipanic");
        SOUNDS.Play("wmbhorn", 1); // (QoL #619: it was nearly silent at 0.6)
        if (IoTd2.on) {
            IoTd2.waveStarted(IoTd.wave);
            IoTdUi.Banner(IoTd2.title(IoTd.wave), (IoTd2.isBoss(IoTd.wave) ? 0xFF5533 : 0xFFD24A) >>> 0, IoTd2.subtitle(IoTd.wave));
        } else {
            IoTdUi.Banner(IoTdWaves.title(IoTd.wave), (IoTdWaves.isBoss(IoTd.wave) ? 0xFF5533 : 0xFFD24A) >>> 0);
        }
        IoTdUi.Update();
    }

    private static tick(e: Event): void {
        if (!IoTd.on) {
            return;
        }
        IoTd._frames++;
        if (IoTd._frames % 30 == 0) {
            IoTd.hideGameUi();
        }
        IoTdLink.tick();
        let now: int = getTimer();
        if (IoTd.waveOn) {
            if (IoTd._frames % 20 == 0) {
                GLOBAL.UpdateAFKTimer();
            }
            let steps: int = IoTd._clock ? IoTd._clock.steps : 0;
            while (IoTd._queue.length && steps >= IoTd._nextAt) {
                let next: any = IoTd._queue.shift();
                IoTd.spawn(next);
                IoTd._nextAt += IoTd._queue.length ? ((IoTd._queue[0].gap | 0) * IoHfoStepClock.STEPS_A_SECOND / 1000) | 0 : 0;
            }
        } else if (IoTd.auto && IoTd._autoAt > 0 && now >= IoTd._autoAt && !IoTd.over && !PLANNER.isOpen() && !IoTdLink.coop && !IoTd2.holding) {
            IoTd.StartWave();
        }
        IoTd.watch();
        if (IoTd2.on) {
            IoTd2.tick();
        }
        if (IoTd.waveOn && !IoTd._queue.length && !IoTd.anyLeft()) {
            IoTd.waveCleared();
        }
        if (IoTd._frames % 6 == 0) {
            IoTdUi.Update();
        }
    }

    private static showGate(): void {
        let put: Function = null;
        if (IoTd._gate && IoTd._gate.parent) {
            IoTd._gate.parent.removeChild(IoTd._gate);
        }
        if (!IoTd._arena || !IoTd._arena.spawn || !MAP._BUILDINGBASES) {
            return;
        }
        IoTd._gate = new Sprite();
        IoTd._gate.name = "tdGate";
        IoTd._gate.mouseEnabled = false;
        IoTd._gate.mouseChildren = false;
        MAP._BUILDINGBASES.addChild(IoTd._gate);
        // (Hellgate Defense 2's maps: a gate at every way in; the gate faces the arena from its corner)
        let ways: any[] = IoTd._arena.spawns && IoTd._arena.spawns.length ? as3.as(IoTd._arena.spawns, Array) : [IoTd._arena.spawn];
        put = (bmd: BitmapData): void => {
            if (!IoTd._gate || !bmd) {
                return;
            }
            for (let w of as3.values(ways)) {
                let at: Point = IoTd.iso(new Point(Number(w[0]), Number(w[1])));
                let b: Bitmap = new Bitmap(bmd);
                b.smoothing = true;
                let flip: boolean = at.x > 0;
                b.scaleX = flip ? -0.5 : 0.5;
                b.scaleY = 0.5;
                b.x = at.x + (flip ? 80 : -80);
                b.y = at.y - 135;
                IoTd._gate.addChild(b);
            }
        };
        let have: BitmapData = ArcadeArt.picture(IoTd.GATE_ART);
        if (have) {
            put(have);
        } else {
            ImageCache.GetImageWithCallBack(IoTd.GATE_ART, (k: string, bmd: BitmapData, args: any[] = null): void => {
                put(bmd);
            });
        }
    }

    private static iso(p: Point): Point {
        return GRID.ToISO(p.x, p.y, 0);
    }

    /** Where the monsters come up, a little scattered (Hellgate Defense 2: at the way in they are given). */
    private static spawnPoint(entry: int = 0): Point {
        let a: number = Math.random() * Math.PI * 2;
        let r: number = Math.random() * 30;
        let at: any[] = as3.as(IoTd._arena.spawn, Array);
        if (IoTd._arena.spawns && IoTd._arena.spawns.length) {
            at = as3.as(IoTd._arena.spawns[Math.max(0, entry) % IoTd._arena.spawns.length], Array);
        }
        return new Point(Number(at[0]) + Math.cos(a) * r, Number(at[1]) + Math.sin(a) * r);
    }

    /** The point of the Hall they walk to: its corner facing the way out (the Hall in the middle: nearest them). */
    private static hallPoint(near: Point = null): Point {
        let h: any[] = as3.as(IoTd._arena.hall, Array);
        let x0: number = Number(h[0]);
        let y0: number = Number(h[1]);
        let size: number = Number(h[2]);
        if (IoTd._arena.hallInside) {
            let from: Point = near || new Point(0, 0);
            return new Point(Math.max(x0 + 12, Math.min(x0 + size - 12, from.x)), Math.max(y0 + 12, Math.min(y0 + size - 12, from.y)));
        }
        if (IoTd._arena.exit) {
            // (the corner of the Hall that faces the arena)
            return new Point(Number(IoTd._arena.exit[0]) > 0 ? x0 + 12 : x0 + size - 12, Number(IoTd._arena.exit[1]) > 0 ? y0 + 12 : y0 + size - 12);
        }
        return new Point(x0 + 12, y0 + size - 12);
    }

    /** Off the grid and nearer the Hall than its way in: past the way out (Hellgate Defense 2's maps). */
    private static pastExit(g: Point, info: any): boolean {
        if (IoTd._arena.hallInside) {
            return false;
        }
        // (the way in itself, not a point scattered round it as a monster comes up there)
        let way: Point = IoTd.spawnCentre(info ? info.entry | 0 : 0);
        return Point.distance(g, IoTd.hallPoint()) < Point.distance(g, way);
    }

    /** Where way in number `entry`'s monsters come up (its middle). */
    private static spawnCentre(entry: int): Point {
        let at: any[] = as3.as(IoTd._arena.spawn, Array);
        if (IoTd._arena.spawns && IoTd._arena.spawns.length) {
            at = as3.as(IoTd._arena.spawns[Math.max(0, entry) % IoTd._arena.spawns.length], Array);
        }
        return new Point(Number(at[0]), Number(at[1]));
    }

    /** The way in nearest a monster that came up of itself (risen from the dead): its own, not always the first. */
    private static nearestEntry(c: MonsterBase): int {
        let ways: any[] = IoTd._arena.spawns ? as3.as(IoTd._arena.spawns, Array) : null;
        if (!ways || ways.length < 2 || !c._tmpPoint) {
            return 0;
        }
        let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        let best: int = 0;
        let bestD: number = Infinity;
        for (let i: int = 0; i < ways.length; i++) {
            let d: number = Point.distance(g, IoTd.spawnCentre(i));
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    private static spawn(e: any): void {
        let id: string = String(e.id);
        let props: any = CREATURELOCKER._creatures[id];
        if (!props) {
            return;
        }
        let at: Point = IoTd.iso(e.at ? as3.cast(e.at, Point) : IoTd.spawnPoint(e.entry | 0));
        let level: int = IoTdWaves.level(IoTd.wave);
        let c: MonsterBase = null;
        try {
            c = CREEPS.Spawn(id, MAP._BUILDINGTOPS, "wander", at, Math.random() * 360, 1, false, false, level);
        } catch (err) {
            LOGGER.Log("err", "Hellgate: " + id + " could not be made: " + err.message);
            return;
        }
        if (!c) {
            return;
        }
        c.maxHealthProperty.value = Math.max(1, e.hp | 0);
        c.setHealth(c.maxHealthProperty.value);
        // (fliers take the short way over the maze: no speed-up for them, and Balthazar slows as he gets tougher)
        c.moveSpeedProperty.value = c.moveSpeedProperty.value * (c._movement == "fly" ? IoTdWaves.flierSpeedScale(IoTd.wave) : IoTd.SPEED * IoTdWaves.speedScale(IoTd.wave));
        c._hitLimit = int.MAX_VALUE;
        if (c._movement != "fly") {
            EFFECTS.Dig(at.x | 0, at.y | 0);
        }
        IoTd.track(c, e.bounty | 0, e.leak | 0, Boolean(e.boss), Boolean(e.relayed), e);
        if (e.boss) {
            SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0));
        }
    }

    /** IoTd2: a monster of its own (a Drull's brood, a split, the Warden's guard), at a spot on the ground. */
    public static spawnAt(e: any, at: Point): void {
        e.at = at;
        IoTd.spawn(e);
    }

    /** IoTd2: what the arena knows of a monster (its info), or null. */
    public static infoOf(c: MonsterBase): any {
        return c ? IoTd._creeps.get(c) : null;
    }

    /** IoTd2: the arena's monsters (MonsterBase -> info). */
    public static get creeps(): Dictionary {
        return IoTd._creeps;
    }

    private static track(c: MonsterBase, bounty: int, leak: int, boss: boolean, relayed: boolean = false, e: any = null): void {
        let info: any = { "bounty": bounty, "leak": leak, "boss": boss, "flier": c._movement == "fly", "leaked": false, "relayed": relayed, "id": c._creatureID, "entry": e ? e.entry | 0 : IoTd.nearestEntry(c), "check": (Math.random() * IoTd.CHECK_EVERY) | 0 };
        IoTd._creeps.set(c, info);
        c._behaviour = MonsterBase.k_sBHVR_WANDER;
        c._targetCenter = IoTd.iso(IoTd.hallPoint());
        if (IoTd2.on) {
            IoTd2.spawned(c, info, e);
        }
        IoTd.route(c);
    }

    /** Gives a monster the way to the Hall from where it is. */
    private static route(c: MonsterBase): void {
        let info: any = IoTd._creeps.get(c);
        if (!c || !info || info.leaked) {
            return;
        }
        if (IoTd2.on) {
            IoTd.route2(c, info);
            return;
        }
        let pts: any[] = [];
        let hall: Point = IoTd.iso(IoTd.hallPoint());
        let lo: int = (-IoTd.half() - IoTd.wall()) | 0;
        let hi: int = (IoTd.half() + IoTd.wall()) | 0;
        let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        let past: boolean = g.x >= hi || g.y < lo;
        if (!info.flier && !past) {
            let before: boolean = g.x < lo || g.y >= hi;
            let cell: int = before ? IoTd._path.entry : IoTd._path.cellAt(g.x, g.y);
            if (before) {
                pts.push(IoTd.iso(new Point(lo + 6, hi - 6)));
            }
            for (let p of (IoTd._path.route(cell) ?? [])) {
                pts.push(IoTd.iso(p));
            }
            pts.push(IoTd.iso(new Point(hi + 12, lo - 12)));
        }
        pts.push(hall);
        c._waypoints = pts;
        c._targetPosition = as3.cast(pts[0], Point);
        c._hasPath = true;
        c._atTarget = false;
    }

    /**
     * Hellgate Defense 2's maps: the way from wherever it is. Off the grid it is either still outside its way in
     * (it walks there first) or past the way out (on to the Hall); on the grid, downhill to the way out, then out
     * past the corner (if the Hall stands there) to the Hall.
     */
    private static route2(c: MonsterBase, info: any): void {
        let pts: any[] = [];
        let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        let last: Point = g;
        if (!info.flier) {
            let cell: int = IoTd._path.cellAt(g.x, g.y);
            let past: boolean = cell < 0 && IoTd.pastExit(g, info);
            if (!past) {
                if (cell < 0) {
                    cell = IoTd._path.entryOf(info.entry | 0);
                    pts.push(IoTd.iso(IoTd._path.middle(cell)));
                }
                for (let p of (IoTd._path.route(cell, pts.length ? null : g) ?? [])) {
                    pts.push(IoTd.iso(p));
                    last = p;
                }
                if (IoTd._arena.beyond) {
                    last = new Point(Number(IoTd._arena.beyond[0]), Number(IoTd._arena.beyond[1]));
                    pts.push(IoTd.iso(last));
                }
            }
        }
        pts.push(IoTd.iso(IoTd.hallPoint(last)));
        c._waypoints = pts;
        c._targetPosition = as3.cast(pts[0], Point);
        c._hasPath = true;
        c._atTarget = false;
    }

    /** Every frame: the arena's monsters kept on their way; the ones killed paid for; the ones home counted. */
    private static watch(): void {
        let c: MonsterBase = null;
        let info: any = null;
        // monsters the arena's monsters made (Rezghul's risen dead) join in
        for (let o of as3.values(CREEPS._creeps)) {
            c = as3.as(o, MonsterBase);
            if (c && !c._friendly && !IoTd._creeps.get(c) && c.health > 0 && !c.dying && !c.dead) {
                IoTd.track(c, 1, 1, false);
            }
        }
        let gone: any[] = [];
        for (let k of (IoTd._creeps?.keys() ?? [])) {
            c = as3.as(k, MonsterBase);
            info = IoTd._creeps.get(k);
            if (!c) {
                continue;
            }
            if (info.leaked) {
                if (c.dead) {
                    gone.push(c);
                }
                continue;
            }
            if (c.health <= 0 || c.dying || c.dead) {
                gone.push(c);
                IoTd.kills++;
                let pay: int = IoTd2.on ? IoTd2.bountyOf(c, info) : info.bounty | 0;
                IoTd.gold += pay;
                IoTdUi.Float("+" + pay, c._tmpPoint, 16765514);
                if (IoTd2.on) {
                    IoTd2.killed(c, info);
                }
                // ("wander" never ends: the dead are let die the usual way, splat and all)
                if (!c.dying && !c.dead) {
                    c._waypoints = [];
                    c._behaviour = MonsterBase.k_sBHVR_RETREAT;
                    c._atTarget = true;
                }
                continue;
            }
            // (anything that turned it to something else, a hit it answered, a buff: it walks on)
            if (c._behaviour != MonsterBase.k_sBHVR_WANDER) {
                c._behaviour = MonsterBase.k_sBHVR_WANDER;
                c._targetBuilding = null;
                c._targetCreep = null;
                c._hasTarget = false;
                c._attacking = false;
                IoTd.route(c);
            } else if (c._atTarget && c._waypoints.length == 0) {
                IoTd.home(c, info);
            } else if (!info.flier && ++info.check >= IoTd.CHECK_EVERY) {
                info.check = 0;
                IoTd.keepOffWalls(c, info);
            }
        }
        for (c of as3.values(gone)) {
            IoTd._creeps.delete(c);
        }
    }

    /** How often (frames) each walking monster's heading is checked against the maze (keepOffWalls). */
    private static readonly CHECK_EVERY: int = 10;
    /** Monsters found heading through a wall or standing in one, and sent on their way again (a test counter). */
    public static wallFixes: int = 0;

    /**
     * A walking monster on the maze that stands in a wall or heads straight through one is given its way again from
     * where it is (11 October, the user's: "on the multispawn portal maps sometimes all the monsters from one portal
     * completely ignore walls and walk right through them"). Whatever put it there (pushed, come up in a wall, an
     * old way), it never keeps walking through the maze's walls. The first few are written to the console with
     * what they were doing.
     */
    private static keepOffWalls(c: MonsterBase, info: any): void {
        if (!c._tmpPoint || !c._targetPosition || !IoTd._path) {
            return;
        }
        let g: Point = GRID.FromISO(c._tmpPoint.x, c._tmpPoint.y);
        let cell: int = IoTd._path.cellAt(g.x, g.y);
        if (cell < 0) {
            return;
        }
        let h: any[] = as3.as(IoTd._arena.hall, Array);
        let hall: Rectangle = h ? new Rectangle(Number(h[0]) - 15, Number(h[1]) - 15, Number(h[2]) + 30, Number(h[2]) + 30) : null;
        if (hall && hall.contains(g.x, g.y)) {
            return;
        }
        let t: Point = GRID.FromISO(c._targetPosition.x, c._targetPosition.y);
        let inWall: boolean = IoTd._path.blocked(cell);
        if (!inWall && !IoTd._path.crossesWall(g, t, hall)) {
            return;
        }
        IoTd.wallFixes++;
        if (IoTd.wallFixes <= 12) {
            console.info("Hellgate: " + info.id + " from way in " + (info.entry | 0) + (inWall ? " stood in a wall" : " was heading through a wall") + " at " + Math.round(g.x) + "," + Math.round(g.y) + " (to " + Math.round(t.x) + "," + Math.round(t.y) + ", " + (c._waypoints ? c._waypoints.length : 0) + " legs left): sent round again");
        }
        IoTd.route(c);
    }

    /** A monster got to the Hall: lives lost, and it goes. */
    private static home(c: MonsterBase, info: any): void {
        info.leaked = true;
        // Co-op: one that got through this maze runs on into the partner's (only one through both costs lives)
        if (IoTdLink.coop && !info.relayed && !IoTdLink.rivalGone && !IoTdLink.rivalFell) {
            IoTdLink.relay(String(info.id), Math.max(1, c.health | 0) | 0, info.leak | 0);
            c._waypoints = [];
            c._behaviour = MonsterBase.k_sBHVR_RETREAT;
            c._atTarget = true;
            IoTdUi.Float("→ " + IoTdLink.rivalName, c._tmpPoint, 10148095);
            return;
        }
        IoTd.lives = Math.max(0, IoTd.lives - (info.leak | 0)) | 0;
        IoTdLink.lives(IoTd.lives);
        c._waypoints = [];
        c._behaviour = MonsterBase.k_sBHVR_RETREAT;
        c._atTarget = true;
        SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.6);
        // (QoL #622: a life lost has a sound of its own, at most one every half second)
        if (getTimer() - IoTd._ioLifeSoundAt > 500) {
            IoTd._ioLifeSoundAt = getTimer();
            SOUNDS.Play("damage1", 0.5);
        }
        IoTdUi.Float("-" + (info.leak | 0) + " ♥", c._tmpPoint, 16729156);
        IoTdUi.Update();
        if (IoTd.lives <= 0) {
            IoTd.lost();
        }
    }

    private static anyLeft(): boolean {
        for (let k of (IoTd._creeps?.keys() ?? [])) {
            let c: MonsterBase = as3.as(k, MonsterBase);
            if (c && !IoTd._creeps.get(k).leaked && c.health > 0) {
                return true;
            }
        }
        return false;
    }

    private static waveCleared(): void {
        IoTd.waveOn = false;
        IoTd.cleared = IoTd.wave;
        let bonus: int = IoTd2.on ? IoTd2.clearBonus(IoTd.wave) : IoTdWaves.clearBonus(IoTd.wave);
        IoTd.gold += bonus;
        // (Versus: what was sent raises every wave's pay)
        if (IoTdLink.versus) {
            bonus += IoTdLink.income;
            IoTd.gold += IoTdLink.income;
        }
        let walls: int = IoTd2.on ? IoTd2.wallsFor(IoTd.wave) : IoTdWaves.wallsFor(IoTd.wave);
        // (Hellgate Defense 2: the Tithe Shrines' gold, interest, lives back; wave 40's win)
        let extra: string = IoTd2.on ? IoTd2.waveCleared(IoTd.wave) : "";
        if (walls > 0) {
            BASE._buildingsStored["b" + IoTd.WALL] = new SecNum(IoTd.wallsLeft + walls);
        }
        // (QoL #612: with the next wave coming by itself the fight's music plays on; it switched back and started
        // again every wave, 40 times a run)
        if (!IoTd.auto) {
            SOUNDS.PlayMusic("musicibuild");
        }
        SOUNDS.Play("chaching");
        IoTd.checkpoint();
        IoTdUi.Banner(KEYS.Get("io_t3t_td_cleared", { "v1": IoTd.wave }), 8191850, KEYS.Get("io_t3t_td_cleared_gold", { "v1": bonus }) + (walls > 0 ? KEYS.Get("io_t3t_td_cleared_walls", { "v1": walls }) : "") + extra);
        // (Versus: twice the time between waves, 7 October, the user's: "not enough time between rounds")
        IoTd._autoAt = (getTimer() + (IoTdLink.versus ? IoTd.VERSUS_WAIT : IoTd.AUTO_WAIT) * 1000) | 0;
        IoTdUi.Update();
    }

    /** The seconds left before the next wave starts by itself (0: none coming by itself). */
    public static get autoLeft(): int {
        return (!IoTd.waveOn && IoTd.auto && IoTd._autoAt > 0 ? Math.max(0, Math.ceil((IoTd._autoAt - getTimer()) / 1000)) : 0) | 0;
    }

    public static get nextPreview(): string {
        return IoTd2.on ? IoTd2.preview((IoTd.cleared + 1) | 0) : IoTdWaves.preview((IoTd.cleared + 1) | 0);
    }

    // ---- leaving the page mid-run (QoL #289)
    private static _unloadWatched: boolean = false;

    /** The browser asks before a reload or a closed tab ends a run under way (once a wave has been fought). */
    private static watchUnload(): void {
        if (IoTd._unloadWatched || typeof window == "undefined") {
            return;
        }
        IoTd._unloadWatched = true;
        window.addEventListener("beforeunload", (e: BeforeUnloadEvent): void => {
            if (IoTd.on && !IoTd.over && (IoTd.cleared > 0 || IoTd.waveOn)) {
                e.preventDefault();
                e.returnValue = "";
            }
        });
    }

    /** Every wave cleared is reported (a solo run): a run cut short by a reload is recorded at it later. */
    private static checkpoint(): void {
        if (IoTdLink.on) {
            return;
        }
        IoTd.call("checkpoint", [["wave", IoTd.cleared], ["kills", IoTd.kills]], (r: any): void => {
        }, (message: string): void => {
        });
    }

    /** A run left open last time (a reload, a closed tab) was recorded at its last wave: the player is told. */
    public static toldRecovered(r: any): void {
        if (r && r.recovered && (r.recovered.wave | 0) > 0) {
            let w: int = r.recovered.wave | 0;
            GLOBAL.Message(KEYS.Get(r.recovered.v2 ? "io_t3t_td_recovered2" : "io_t3t_td_recovered", { "v1": w }));
        }
    }

    // ---- the end
    private static lost(): void {
        if (IoTd.over) {
            return;
        }
        IoTd.over = true;
        IoTd.waveOn = false;
        IoTd._queue = [];
        for (let k of (IoTd._creeps?.keys() ?? [])) {
            let c: MonsterBase = as3.as(k, MonsterBase);
            if (c && c.health > 0) {
                IoTd._creeps.get(k).leaked = true;
                c._waypoints = [];
                c._behaviour = MonsterBase.k_sBHVR_RETREAT;
                c._atTarget = true;
            }
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        if (PLANNER.isOpen()) {
            PLANNER.Hide();
        }
        // (QoL #622: the Hall falls; it played the "building placed" sound)
        SOUNDS.Play("destroytownhall", 0.8);
        SOUNDS.PlayMusic("musicibuild");
        if (IoTdLink.on) {
            // (a linked run: the match's result comes from the arcade; this run isn't a solo score)
            IoTd.finish((r: any): void => {
            });
            IoTdLink.fell();
            return;
        }
        IoTd.finish((r: any): void => {
            if (IoTd2.v2Run) {
                IoTd2Ui.GameOver(r);
                return;
            }
            IoTdUi.GameOver(IoTd.cleared, IoTd.kills, r);
        });
    }

    /** A linked run ends from outside (the shared lives gone, the rival fallen or left). */
    public static linkedLost(): void {
        IoTd.lost();
    }

    /** Versus: monsters the rival sent, at the strength of the rival's wave. */
    public static spawnSent(id: string, n: int, w: int): void {
        let k: any[] = null;
        for (let kind of as3.values(IoTdWaves.KINDS.concat(IoTdWaves.BOSSES))) {
            if (kind[0] == id) {
                k = kind;
            }
        }
        if (!k) {
            return;
        }
        let i: int = 0;
        while (i < Math.min(n, 12)) {
            IoTd.spawn({ "id": id, "bounty": Math.max(1, Math.round(Number(k[1]) * IoTdWaves.goldScale(w) * 0.5) | 0), "leak": k[2] | 0, "hp": Math.round(Number(k[3]) * IoTdWaves.hpScale(w)), "boss": false });
            i++;
        }
    }

    /** Co-op: a monster that got through the partner's maze, with the health it had left. */
    public static spawnRelayed(id: string, hp: int, leak: int, w: int): void {
        IoTd.spawn({ "id": id, "bounty": 2, "leak": Math.max(1, leak), "hp": Math.max(1, hp), "boss": false, "relayed": true });
    }

    /** The run is recorded (the waves survived). */
    private static finish(then: Function): void {
        // (9 October, bug report 78: "HALT BASE.SaveB 2: This yard has been reset since the attack started" after
        // Leave. The arena is deleted when its run is recorded; a save of it still waiting (a tower bought a moment
        // before) went after that, was refused, and stopped the game. The arena is not saved again: home is loaded
        // next, which saves again as usual.)
        BASE._blockSave = true;
        if (GLOBAL.INFERNO_ONLY && !IoTdLink.on) {
            // (QoL #459: a finish that failed is sent again by itself twice, then the end screens' Try again; the run's
            // id with it, so the server answers a finish it had recorded already as it did the first time)
            let v2: boolean = IoTd2.v2Run;
            let vars: any[] = v2 ? [["wave", IoTd.cleared], ["kills", IoTd.kills], ["victory", IoTd2.won ? 1 : 0]] : [["wave", IoTd.cleared], ["kills", IoTd.kills], ["linked", 0]];
            vars.push(["run", IoTd.ioRunId()]);
            IoTd.ioFinishTry(v2, vars, then, 0);
            return;
        }
        if (IoTd2.v2Run) {
            IoTd.call("finish2", [["wave", IoTd.cleared], ["kills", IoTd.kills], ["victory", IoTd2.won ? 1 : 0]], (r: any): void => {
                IoTd2.finished(r);
                then(r);
            }, (message: string): void => {
                then({ "error": message });
            });
            return;
        }
        IoTd.call("finish", [["wave", IoTd.cleared], ["kills", IoTd.kills], ["linked", IoTdLink.on ? 1 : 0]], (r: any): void => {
            IoTd.best = r.best;
            then(r);
        }, (message: string): void => {
            then({ "error": message });
        });
    }

    /** Inferno-only (QoL #459): the automatic tries of a finish (after the first), and the waits before them (ms). */
    public static readonly IO_FINISH_WAITS: any[] = [2000, 5000];

    /** QoL #459: the run's id (the server's io_td.started: its yard's making), sent with its finish. */
    public static ioRunId(): number {
        return GLOBAL._ioTd ? Number(GLOBAL._ioTd.started) || 0 : 0;
    }

    /**
     * QoL #459: sends the finish (try `n`); failed, it waits and tries again while IO_FINISH_WAITS has a wait for it,
     * then answers {error, ioRetry}: ioRetry(then) sends it once more (the end screens' and Leave's Try again).
     */
    private static ioFinishTry(v2: boolean, vars: any[], then: Function, n: int): void {
        IoTd.call(v2 ? "finish2" : "finish", vars, (r: any): void => {
            if (v2) {
                IoTd2.finished(r);
            } else {
                IoTd.best = r.best;
            }
            then(r);
        }, (message: string): void => {
            if (n < IoTd.IO_FINISH_WAITS.length) {
                if (n == 0) {
                    IoTdUi.Toast(KEYS.Get("io_arc2_td_retrying"), 5);
                }
                setTimeout((): void => {
                    IoTd.ioFinishTry(v2, vars, then, (n + 1) | 0);
                }, IoTd.IO_FINISH_WAITS[n] | 0);
                return;
            }
            then({ "error": message, "ioRetry": (again: Function): void => {
                IoTd.ioFinishTry(v2, vars, again, IoTd.IO_FINISH_WAITS.length);
            } });
        });
    }

    /**
     * QoL #459: Leave's run wasn't recorded: Try again (the run's result sent once more) or leave anyway (the server
     * records it at its last cleared wave the next time Hellgate Defense opens). `done(r)`: recorded.
     */
    private static ioLeaveUnrecorded(r: any, done: Function): void {
        let m: any = GLOBAL.Message(KEYS.Get("io_arc2_td_unrecorded", { "v1": String(r.error) }), KEYS.Get("io_arc2_try_again"), (): void => {
            IoTd._busy = true;
            r.ioRetry((r2: any): void => {
                IoTd._busy = false;
                if (r2 && r2.error && r2.ioRetry) {
                    IoTd.ioLeaveUnrecorded(r2, done);
                    return;
                }
                done(r2);
            });
        }, null, KEYS.Get("io_arc2_leave_anyway"), (): void => {
            IoTd.goHome();
        });
        if (m && m.bAction) {
            m.bAction.name = "ioTd2LeaveRetry";
        }
        if (m && m.bAction2) {
            m.bAction2.name = "ioTd2LeaveAnyway";
        }
    }

    /** Leave: back home (a run left counts as it stands). */
    public static Leave(e: MouseEvent = null): void {
        if (!IoTd.on || IoTd._busy) {
            return;
        }
        if (IoTd.over) {
            IoTd.goHome();
            return;
        }
        // (QoL #235: in the player's language)
        let ioWhat: string = IoTdLink.versus ? KEYS.Get("io_t3t_td_leave_vs") : (IoTdLink.coop ? KEYS.Get("io_t3t_td_leave_coop", { "v1": IoTdLink.rivalName }) : (IoTd.cleared > 0 ? KEYS.Get(IoTd.cleared == 1 ? "io_t3t_td_leave_end_one" : "io_t3t_td_leave_end_n", { "v1": IoTd.cleared }) : KEYS.Get("io_t3t_td_leave_end")));
        GLOBAL.Message("<b>" + KEYS.Get(IoTd2.on ? "io_t3t_td_leave_q2" : "io_t3t_td_leave_q") + "</b><br><br>" + ioWhat, KEYS.Get("io_t3t_tdui_leave"), (): void => {
            IoTd.over = true;
            IoTd._busy = true;
            if (IoTdLink.on) {
                IoTdLink.leave();
            }
            let after: Function = (r: any): void => {
                // (Hellgate Defense 2: what the run earned, then home)
                if (IoTd2.v2Run && r && !r.error && r.recorded) {
                    IoTd2Ui.GameOver(r, true);
                    return;
                }
                IoTd.goHome();
            };
            IoTd.finish((r: any): void => {
                IoTd._busy = false;
                // (QoL #459: not recorded: Try again, or leave anyway)
                if (r && r.error && r.ioRetry) {
                    IoTd.ioLeaveUnrecorded(r, after);
                    return;
                }
                after(r);
            });
        });
    }

    /** IoTd2: the run ends now, as Leave does, without asking (its win's Leave button). */
    public static endNow(): void {
        if (!IoTd.on || IoTd._busy || IoTd.over) {
            return;
        }
        IoTd.over = true;
        IoTd._busy = true;
        IoTd.waveOn = false;
        IoTd.finish((r: any): void => {
            IoTd._busy = false;
            IoTd2Ui.GameOver(r, true);
        });
    }

    /** Another run, at once. */
    public static Again(e: MouseEvent = null): void {
        if (IoTd._busy) {
            return;
        }
        if (IoTd2.v2Run) {
            IoTd2.again();
            return;
        }
        IoTd.open();
    }

    /**
     * Inferno-only (QoL #376, 14 October): where the end screen's player goes once home: "" (the yard), "page" (the
     * Devil's Arcade at Hellgate's page) or a mode ("versus", "coop": the arcade, looking for another match).
     */
    public static arcadeAfterHome: string = "";

    /** Home again (BASE): the arcade, when the end screen asked for it. */
    public static AfterHome(): void {
        let go: string = IoTd.arcadeAfterHome;
        IoTd.arcadeAfterHome = "";
        if (!go || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard) {
            return;
        }
        ArcadeWindow.ShowGame(IoTd2.v2Run ? "hellgate2" : "hellgate");
        let w: any = (ArcadeWindow as any)._open;
        if (go != "page" && w && w.play) {
            w.play("hellgate", go);
        }
    }

    /** Leaves the finished run for the Devil's Arcade (its Hellgate page, or another match in `mode`). */
    public static toArcade(mode: string = "page"): void {
        IoTd.arcadeAfterHome = mode;
        IoTd.goHome();
    }

    public static goHome(): void {
        IoTdUi.Hide();
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    // ---- server
    public static call(action: string, vars: any[], ok: Function, fail: Function): void {
        let answered: boolean = false;
        let timeout: Timer = null;
        answered = false;
        timeout = new Timer(30000, 1);
        timeout.addEventListener(TimerEvent.TIMER_COMPLETE, (e: TimerEvent): void => {
            if (!answered) {
                answered = true;
                fail(KEYS.Get("io_t3t_td_no_answer"));
            }
        });
        timeout.start();
        new URLLoaderApi().load(GLOBAL.serverUrl + "td", [["action", action]].concat(vars), (serverData: any): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            if (serverData && serverData.error == 0) {
                ok(serverData);
            } else {
                fail(serverData && serverData.error ? String(serverData.error) : KEYS.Get("io_t3t_td_no_answer2"));
            }
        }, (e: Event): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            fail(KEYS.Get("io_t3t_td_unreachable"));
        });
    }
}
