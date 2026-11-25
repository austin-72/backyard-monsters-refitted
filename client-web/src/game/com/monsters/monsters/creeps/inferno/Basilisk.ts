import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Shape } from "flash/display";
import { MouseEvent } from "flash/events";
import { Matrix, Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, BYMConfig, CREATURES, CREEPS, CreepBase, EFFECTS, GLOBAL, GRID, ImageCache, IoDave, IoReplayPlayer, IoSkins, MAP, MonsterBase, PATHING, RasterData, SOUNDS, SPRITES } from "@game";

/**
 * Inferno-only (13 October, the user's): the Basilisk (IC32), a red-and-black spined serpent.
 *
 * - Hidden in the Strongbox, the Compound, the Hatchery, the Incubation Control Station and the Academy until the
 *   player has won 200 battles (the server's flag io_basilisk; CREATURELOCKER.ioBasiliskRefresh).
 * - 500 housing; Drull's health x1.15 and damage per second x1.3, dealt as a squeeze
 *   every 1/8 second (attackDelay 9: a monster strikes every attackDelay + 1 of the game's 80 steps a second, Drull
 *   every 61). Fast. Twice the damage to monsters.
 * - Attacks anything (buildings or monsters, the nearest), unless the player sends him: in an attack, the building
 *   under the mouse is lit while there are Basilisks out, and a click on it sends every Basilisk there (it stays lit
 *   until it falls). He squeezes nothing until he is wrapped all the way round it.
 * - Slithers, over walls (his paths ignore them, as Malphus's, with no hop): his body goes up a wall, along its top
 *   and down the other side, drawn in front of it.
 * - Flung in, he drops in coiled and uncoils as he moves off; wrapping and letting go, his head goes up the coil and
 *   down off it and his body follows the way it went (followHead).
 * - Constricts: at his target he coils round it, its base or the monster, and squeezes. A coil's back half is drawn
 *   behind the building and its front half in front of it (two pictures in the yard's drawing order); round a large
 *   building he stretches (longer, thinner) to go all the way round; round a small one he winds up it two or three
 *   times, the rest of him coiled on the ground.
 *
 * He draws himself (no frames of a whole snake exist): a chain of body beads stamped along his path, or round his
 * target, from monsters/basilisk.png (art/basilisk: Blender renders from the game's camera, 16 headings, 96 x 96
 * cells; rows 0 red bead, 1 black bead, 2 head, 3 head open; each piece's joint at the cell's centre).
 */
export class Basilisk extends CreepBase {
    static {
        as3.fields(this, { m_skin: "", m_ready: false, m_trail: null, m_ahead: null, m_lag: false, m_phase: 0, m_front: null, m_frontMC: null, m_frontData: null, m_frontPt: null, m_over: null, m_overMC: null, m_overData: null, m_overPt: null, m_frontUsed: false, m_overUsed: false, m_overWall: null, m_maxLift: 0, m_coil: 0, m_coilOn: null, m_coilGeo: null, m_windDone: 0, m_windTotal: 0, m_offFor: 0, m_len: 300, m_thick: 16, m_relLen: 0, m_relThick: 16, m_relTravel: 0, m_descend: 0.5, m_rear: 0, m_still: 0, m_drop: 0, m_dropV: 0, m_aim: null, m_aimFor: 0, m_resting: false, m_restAt: null, m_clock: 0, m_puppet: false, m_puppetT: -1, m_puppetSteps: 0, m_puppetCarry: 0, m_puppetStill: 0, m_puppetOn: null, m_ground: null, m_body: null, m_origin: null, m_preferred: null, m_hitCarry: 0, m_moved: 0, m_shape: null, m_drawn: false });
    }

    public static readonly ID: string = "IC32";

    public static readonly CELL: int = 96;

    /** His canvas (and the front coil's): big enough for all of him, or a coil round a large building. */
    public static readonly CANVAS: int = 460;

    /** Length along the ground at rest, and thickness, in the yard's pixels. */
    public static readonly LENGTH: number = 300;

    public static readonly THICK: number = 16;

    /** A bead's thickness in the sheet (24 px across): the scale is THICK / BEAD. */
    public static readonly BEAD: number = 24;

    /** The sheet's cells, by skin ("" his own; 14 October: the D.A.V.E. Club's Shiny skins, IoSkins). */
    private static s_cellsBy: any = {};

    private static s_loadingBy: any = {};

    /** His owner's skin, or "". */
    private m_skin: string;

    /** The building under the mouse (worked out once a game step), and the one lit for it. */
    private static s_hoverStep: int = -1;

    private static s_hover: BFOUNDATION = null;

    private static s_lit: BFOUNDATION = null;

    /** The building the player sent them to (and in which attack), lit; the mouse's press; listening for clicks. */
    private static s_ordered: BFOUNDATION = null;

    private static s_orderedMode: string = null;

    private static s_orderLit: BFOUNDATION = null;

    private static s_down: Point = null;

    private static s_listening: boolean = false;

    private static s_alive: int = 0;

    /** The yard's walls (Basilisk.walls), and how high he goes over each kind. */
    private static s_walls: any = null;

    private static s_wallLift: any = {};

    /** How far from a wall (grid units) he starts going up it. */
    public static readonly WALL_RAMP: number = 30;

    /** Pixels a game step his head goes up a coil or down off one. */
    public static readonly WIND_SPEED: number = 4.2;

    /** ...and curling up to rest. */
    public static readonly CURL_SPEED: number = 2.4;

    private m_ready: boolean;
    /** The path his body lies along, head first (Basilisk.tp points), and the path ahead of his head. */
    private m_trail: any[];
    private m_ahead: any[];
    /** The head goes along its path at the wrapping pace (up a coil, down off one), not at once. */
    private m_lag: boolean;
    /** A third canvas: what of him is up over a wall, drawn just in front of it. */
    private m_over: BitmapData;
    private m_overMC: Bitmap;
    private m_overData: RasterData;
    private m_overPt: Point;
    private m_frontUsed: boolean;
    private m_overUsed: boolean;
    private m_overWall: any;
    /** How high he is over a wall now (0 off walls). */
    private m_maxLift: number;
    private m_windDone: number;
    private m_windTotal: number;
    private m_offFor: int;
    /** His length and thickness now (stretched round a large building). */
    private m_len: number;
    private m_thick: number;
    /** Letting go: his length and thickness when he did, and how far he has gone since. */
    private m_relLen: number;
    private m_relThick: number;
    private m_relTravel: number;
    /** (22 October) His length and thickness as a wrap began: it goes from there to the coil's own (not from his usual). */
    private m_coilFromLen: number = NaN;
    private m_coilFromThick: number = NaN;
    /** How fast a raised head comes down, per pixel gone. */
    private m_descend: number;
    /** His head raised (0 to 1), and for how many steps he has not moved. */
    private m_rear: number;
    private m_still: int;
    /** Flung in: how high he still is, and falling how fast. */
    private m_drop: number;
    private m_dropV: number;
    /** Coming down off a coil: towards here (his next target), waiting for where he is to catch up. */
    private m_aim: Point;
    private m_aimFor: int;
    /** Lying coiled up (landed so, or curled up to rest), and where he was then. */
    private m_resting: boolean;
    private m_restAt: Point;
    /** His own clock, a game step a tick (a replay's steps as it plays): the squeeze, the jaws, the tongue. */
    private m_clock: number;
    /** A replay's puppet: the game steps since it was last shown, how long he has stood, and what he is wrapped round. */
    private m_puppet: boolean;
    private m_puppetT: number;
    private m_puppetSteps: int;
    private m_puppetCarry: number;
    private m_puppetStill: number;
    private m_puppetOn: BFOUNDATION;
    /** His beads on the ground as last drawn (his death's splats). */
    private m_ground: Point[];
    /** The slither's wave, moving on with the distance he goes. */
    private m_phase: number;
    private m_front: BitmapData;
    private m_frontMC: Bitmap;
    private m_frontData: RasterData;
    private m_frontPt: Point;
    /** Wrapping: 0 when he starts, 1 once wound all the way up. */
    private m_coil: number;
    /** What he is wrapped round (a building or a monster), and its coil's shape. */
    private m_coilOn: any;
    private m_coilGeo: any;
    /** His body as last drawn (on the screen, head first). */
    private m_body: Point[];
    /** His canvas's top left, in the yard. */
    private m_origin: Point;
    /** The building the mouse sent him to (kept until it falls or the mouse sends him elsewhere). */
    private m_preferred: BFOUNDATION;
    /** Squeezes since the last one counted as a "hit" (a monster's hits are its blows; his are 8 a second). */
    private m_hitCarry: int;
    private m_moved: number;
    private m_shape: Shape;
    private m_drawn: boolean;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this._middle = 8;
        this.m_phase = Math.random() * 10;
        this.m_trail = [];
        this.m_ahead = [];
        this.m_len = Basilisk.LENGTH;
        this.m_thick = Basilisk.THICK;
        this.m_relThick = Basilisk.THICK;
        this.m_descend = 0.5;
        // flung in: he drops in, coiled
        if (param2 == MonsterBase.k_sBHVR_BOUNCE && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            this.m_drop = 80;
        }
        this.m_shape = new Shape();
        this.m_origin = new Point();
        this.useOwnCanvas();
        let skin: string = IoDave.skin(Basilisk.ID, this._friendly);
        this.m_skin = IoSkins.has(skin) ? skin : "";
        Basilisk.loadSheet(this.m_skin);
        ++Basilisk.s_alive;
        this.m_ready = true;
    }

    // ---------------------------------------------------------------------------------------------- pictures

    /** The sheet, cut into its 64 cells (once, for every Basilisk). */
    public static loadSheet(skin: string = ""): void {
        if (Basilisk.s_cellsBy[skin] || Basilisk.s_loadingBy[skin]) {
            return;
        }
        Basilisk.s_loadingBy[skin] = true;
        ImageCache.GetImageWithCallBack(skin ? IoSkins.key("monsters/basilisk.png", skin) : "monsters/basilisk.png", (key: string, bmd: BitmapData): void => {
            if (!bmd) {
                Basilisk.s_loadingBy[skin] = false;
                return;
            }
            let cells: any[] = [];
            for (let row: int = 0; row < 4; row++) {
                let line: BitmapData[] = [];
                for (let f: int = 0; f < 16; f++) {
                    let c: BitmapData = new BitmapData(Basilisk.CELL, Basilisk.CELL, true, 0);
                    c.copyPixels(bmd, new Rectangle(f * Basilisk.CELL, row * Basilisk.CELL, Basilisk.CELL, Basilisk.CELL), new Point(0, 0));
                    line.push(c);
                }
                cells.push(line);
            }
            Basilisk.s_cellsBy[skin] = cells;
            Basilisk.s_loadingBy[skin] = false;
        });
    }

    /** CreepBase made a 52 x 50 picture; his are drawn on canvases of his own (the body, and a coil's front). */
    private useOwnCanvas(): void {
        SPRITES.SetupSprite(Basilisk.ID);
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (this._graphicMC && this._graphicMC.parent) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(Basilisk.CANVAS, Basilisk.CANVAS, true, 0);
        this.m_front = new BitmapData(Basilisk.CANVAS, Basilisk.CANVAS, true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this.m_frontMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this.m_front) : as3.as(this.graphic.addChild(new Bitmap(this.m_front)), Bitmap);
        this._graphicMC.x = this.m_frontMC.x = -Basilisk.CANVAS / 2;
        this._graphicMC.y = this.m_frontMC.y = -Basilisk.CANVAS / 2;
        this.m_over = new BitmapData(Basilisk.CANVAS, Basilisk.CANVAS, true, 0);
        this.m_overMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this.m_over) : as3.as(this.graphic.addChild(new Bitmap(this.m_over)), Bitmap);
        this.m_frontPt = new Point();
        this.m_overPt = new Point();
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
            this.m_frontData = new RasterData(as3.cast(this.m_front, IBitmapDrawable), this.m_frontPt, int.MAX_VALUE);
            this.m_frontData.visible = false;
            this.m_overData = new RasterData(as3.cast(this.m_over, IBitmapDrawable), this.m_overPt, int.MAX_VALUE);
            this.m_overData.visible = false;
        }
    }

    /** The sheet's column for a heading on screen (dx, dy; dy down): the renders turn about the vertical, seen 30 degrees above the ground. */
    private static facing(dx: number, dy: number): int {
        let a: number = Math.atan2(-2 * dy, dx) * 57.2957795;
        if (a < 0) {
            a += 360;
        }
        return (Math.round(a / 22.5) % 16) | 0;
    }

    // ---------------------------------------------------------------------------------------------- fighting

    /** Twice the damage to monsters (attacking or defending), as asked. */
    public override get damage(): number {
        let d: number = super.damage;
        return this._targetCreep ? d * 2 : d;
    }

    /** He fights close (wrapped round it), whatever his reach: no shots, no projectiles. */
    public override get isRanged(): boolean {
        return false;
    }

    /** His paths go over walls: he slithers over them (no hop: that is Malphus's jump). */
    public override WaypointTo(targetPoint: Point, targetBuilding: BFOUNDATION = null): void {
        if (targetBuilding) {
            PATHING.GetPath(this._tmpPoint, new Rectangle(targetPoint.x | 0, targetPoint.y | 0, targetBuilding._footprint[0].width, targetBuilding._footprint[0].height), as3.bind(this, this.setWaypoints), true, targetBuilding);
        } else {
            PATHING.GetPath(this._tmpPoint, new Rectangle(targetPoint.x | 0, targetPoint.y | 0, 10, 10), as3.bind(this, this.setWaypoints), true);
        }
    }

    /** On the attacking side of an attack (not defending, not in the Compound). */
    private get ioAttacking(): boolean {
        return (this._behaviour === MonsterBase.k_sBHVR_ATTACK || this._behaviour === MonsterBase.k_sBHVR_BOUNCE) && (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK);
    }

    private static targetable(b: BFOUNDATION): boolean {
        // (not walls: he goes over them)
        if (!b || b.health <= 0 || b._destroyed || b._class == "decoration" || b._class == "immovable" || b._class == "enemy" || b._class == "wall") {
            return false;
        }
        if (b._class == "tower" && as3.as(b, BTOWER) && (as3.as(b, BTOWER)).isJard) {
            return false;
        }
        return true;
    }

    /**
     * The building under the mouse in an attack, or null: the mouse's place in the yard, and a little below it (a
     * building's picture stands above its footprint), against each building's footprint on the ground.
     */
    public static hovered(): BFOUNDATION {
        if (Basilisk.s_hoverStep == GLOBAL._frameNumber) {
            return Basilisk.s_hover;
        }
        Basilisk.s_hoverStep = GLOBAL._frameNumber;
        Basilisk.s_hover = null;
        if (!MAP._GROUND || !BASE._buildingsMain || (GLOBAL.mode != GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK)) {
            return null;
        }
        let mx: number = MAP._GROUND.mouseX, my: number = MAP._GROUND.mouseY;
        for (let lift of as3.values([0, 18, 36])) {
            let g: Point = GRID.FromISO(mx, my + Number(lift));
            for (let b of as3.values(BASE._buildingsMain)) {
                let building: BFOUNDATION = as3.as(b, BFOUNDATION);
                if (!Basilisk.targetable(building) || !building._footprint || !building._footprint[0]) {
                    continue;
                }
                let fp: Rectangle = building._footprint[0];
                let g0: Point = GRID.FromISO(building._mc.x + fp.x, building._mc.y + fp.y);
                if (g.x >= g0.x && g.x <= g0.x + fp.width && g.y >= g0.y && g.y <= g0.y + fp.height) {
                    Basilisk.s_hover = building;
                    return building;
                }
            }
        }
        return null;
    }

    /**
     * Lit: the building under the mouse while there are Basilisks out (a click on it sends them there), and the one
     * they were sent to, until it falls.
     */
    private static lightUp(b: BFOUNDATION, on: boolean): void {
        if (!b) {
            return;
        }
        try {
            if (on) {
                b.highlight(0xC0281C);
            } else {
                b.disableHighlight();
            }
        } catch (e) {
        }
    }

    private static light(b: BFOUNDATION): void {
        let ordered: BFOUNDATION = Basilisk.ordered();
        if (Basilisk.s_lit != b) {
            if (Basilisk.s_lit && Basilisk.s_lit != ordered) {
                Basilisk.lightUp(Basilisk.s_lit, false);
            }
            Basilisk.s_lit = b;
            Basilisk.lightUp(b, true);
        }
        if (Basilisk.s_orderLit != ordered) {
            if (Basilisk.s_orderLit && Basilisk.s_orderLit != Basilisk.s_lit) {
                Basilisk.lightUp(Basilisk.s_orderLit, false);
            }
            Basilisk.s_orderLit = ordered;
            Basilisk.lightUp(ordered, true);
        }
    }

    /** The building the player sent the Basilisks to (clicked while lit), while it stands. */
    private static ordered(): BFOUNDATION {
        let b: BFOUNDATION = Basilisk.s_ordered;
        if (b && (!Basilisk.targetable(b) || GLOBAL.mode != Basilisk.s_orderedMode)) {
            Basilisk.s_ordered = b = null;
        }
        return b;
    }

    /**
     * The mouse in an attack: a click (pressed and let go without dragging the yard) on a lit building, not on the
     * game's buttons or windows, sends every Basilisk there.
     */
    private static listen(): void {
        if (Basilisk.s_listening || !MAP._GROUND || !MAP._GROUND.stage) {
            return;
        }
        Basilisk.s_listening = true;
        let stage: any = MAP._GROUND.stage;
        stage.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            Basilisk.s_down = new Point(e.stageX, e.stageY);
        });
        stage.addEventListener(MouseEvent.MOUSE_UP, (e: MouseEvent): void => {
            let down: Point = Basilisk.s_down;
            Basilisk.s_down = null;
            if (!down || !Basilisk.s_alive || Math.abs(e.stageX - down.x) + Math.abs(e.stageY - down.y) > 8) {
                return;
            }
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
                return;
            }
            for (let o: any = e.target; o; o = o.parent) {
                if (o === GLOBAL._layerUI || o === GLOBAL._layerWindows || o === GLOBAL._layerMessages || o === GLOBAL._layerTop) {
                    return;
                }
            }
            Basilisk.s_hoverStep = -1;
            let b: BFOUNDATION = Basilisk.hovered();
            if (b) {
                Basilisk.order(b);
            }
        });
    }

    /** Every Basilisk out goes for this building now (and keeps to it until it falls). */
    public static order(b: BFOUNDATION): void {
        Basilisk.s_ordered = b;
        Basilisk.s_orderedMode = GLOBAL.mode;
        Basilisk.light(Basilisk.s_lit);
        for (let k in CREEPS._creeps) {
            let m: Basilisk = as3.as(CREEPS._creeps[k], Basilisk);
            if (m && m.health > 0 && m.ioAttacking && m._targetBuilding != b) {
                m.goFor(b);
            }
        }
    }

    /** Off to the building the player sent him to. */
    private goFor(b: BFOUNDATION): void {
        this.m_preferred = b;
        this.loseTarget();
        this._targetBuilding = b;
        this._looking = true;
        this.WaypointTo(new Point(b._mc.x, b._mc.y), b);
    }

    /** Anything (the nearest building, or a defending monster nearer than it), unless the player sent him somewhere. */
    public override findTarget(targetGroup: int = 0): void {
        if (this.ioAttacking) {
            let b: BFOUNDATION = Basilisk.ordered();
            if (b) {
                this.goFor(b);
                return;
            }
            this.m_preferred = null;
        }
        super.findTarget(targetGroup);
        if (this.ioAttacking && !this._targetCreep) {
            this.findNearMonster();
        }
    }

    /** The nearest defending monster within reach (a Champion guarding the yard too), if it is nearer than his building. */
    private findNearMonster(): void {
        let best: MonsterBase = null;
        let bestD: number = 220;
        for (let c of Basilisk.defenders()) {
            if (!c || c.health <= 0 || c === this || c._movement == "fly") {
                continue;
            }
            let d: number = GLOBAL.QuickDistance(c._tmpPoint, this._tmpPoint);
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        if (!best) {
            return;
        }
        let toBuilding: number = this._targetBuilding ? GLOBAL.QuickDistance(new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y), this._tmpPoint) : 1e9;
        if (bestD < toBuilding) {
            this._targetBuilding = null;
            this._targetCreep = best;
            this._hasTarget = true;
            this._hasPath = true;
            this._atTarget = false;
            this._looking = false;
            this._waypoints = [best._tmpPoint];
            this._targetPosition = best._tmpPoint;
        }
    }

    /** The defending side's monsters out on the field: the yard's own (CREATURES), and its guardian Champions. */
    private static defenders(): MonsterBase[] {
        let out: MonsterBase[] = [];
        for (let k in CREATURES._creatures) {
            let c: MonsterBase = as3.as(CREATURES._creatures[k], MonsterBase);
            if (c && (c._behaviour == MonsterBase.k_sBHVR_DEFEND || c._behaviour == MonsterBase.k_sBHVR_BUNKER)) {
                out.push(c);
            }
        }
        for (let g of as3.values(CREATURES._guardianList)) {
            let c: MonsterBase = as3.as(g, MonsterBase);
            if (c && out.indexOf(c) < 0) {
                out.push(c);
            }
        }
        return out;
    }

    public override tickBAttack(): boolean {
        if (this.ioAttacking && this._frameNumber % 8 == 0) {
            Basilisk.listen();
            Basilisk.light(Basilisk.hovered());
            // sent to a building (and not yet going there): off to it
            let ordered: BFOUNDATION = Basilisk.ordered();
            if (ordered && ordered != this._targetBuilding) {
                this.goFor(ordered);
            }
        }
        // no damage until he is wrapped all the way round it: at his target, the next squeeze waits until then
        let on: any = this._targetCreep ? this._targetCreep : this._targetBuilding;
        if (this._atTarget && on && !(this.m_coilOn === on && this.m_coil >= 1)) {
            this.attackCooldown = Math.max(this.attackCooldown, 2);
        }
        let hits: int = this._hits;
        let gone: boolean = super.tickBAttack();
        // (his 8 squeezes a second count as the hits of a monster that strikes every 60 steps, as Drull: a monster
        // leaves an attack after so many hits on buildings)
        if (this._hits > hits) {
            this.m_hitCarry += this._hits - hits;
            this._hits = hits;
            while (this.m_hitCarry >= 6) {
                this.m_hitCarry -= 6;
                ++this._hits;
            }
        }
        return gone;
    }

    /**
     * A picture's outline in the yard: for every second row from its top, its opaque left and right (or null). The
     * coil is wound to it, so it hugs the building (or the monster) as drawn: wide round a base, narrower up a tower.
     */
    private static outline(pics: any[]): any {
        let top: number = 1e9, bottom: number = -1e9;
        for (let pic of as3.values(pics)) {
            top = Math.min(top, pic.top);
            bottom = Math.max(bottom, pic.top + pic.bmd.height);
        }
        if (top > bottom) {
            return null;
        }
        let n: int = (Math.ceil((bottom - top) / 2) + 1) | 0;
        let rows: any[] = [];
        for (let i: int = 0; i < n; i++) {
            rows.push(null);
        }
        let first: number = 1e9;
        for (let pic of as3.values(pics)) {
            let bmd: BitmapData = pic.bmd;
            for (let y: int = 0; y < bmd.height; y += 2) {
                let l: int = -1, r: int = -1;
                for (let x: int = 0; x < bmd.width; x += 2) {
                    if ((bmd.getPixel32(x, y) >>> 24) > 120) {
                        if (l < 0) {
                            l = x;
                        }
                        r = x;
                    }
                }
                if (l < 0) {
                    continue;
                }
                let my: number = pic.top + y;
                let i: int = Math.round((my - top) / 2) | 0;
                let row: any = rows[i];
                rows[i] = row ? [Math.min(row[0], pic.left + l), Math.max(row[1], pic.left + r)] : [pic.left + l, pic.left + r];
                first = Math.min(first, my);
            }
        }
        return { "top": top, "rows": rows, "first": first };
    }

    /** The outline's widest row between two heights on screen (the yard's y), or null. */
    private static widest(ol: any, y0: number, y1: number): any[] {
        if (!ol) {
            return null;
        }
        let out: any[] = null;
        let i0: int = Math.max(0, Math.floor((Math.min(y0, y1) - ol.top) / 2)) | 0;
        let i1: int = Math.min(ol.rows.length - 1, Math.ceil((Math.max(y0, y1) - ol.top) / 2)) | 0;
        for (let i: int = i0; i <= i1; i++) {
            let row: any = ol.rows[i];
            if (row) {
                out = out ? [Math.min(out[0], row[0]), Math.max(out[1], row[1])] : [row[0], row[1]];
            }
        }
        return out;
    }

    /** What a building looks like (its pictures, where they are drawn in the yard). */
    private static buildingPictures(b: BFOUNDATION): any[] {
        let out: any[] = [];
        let rd: any = (b as any)._rasterData, offs: any = (b as any)._offsets;
        if (!rd || !offs) {
            return out;
        }
        // the building and its animations (not its shadow or footprint, not a fortification)
        for (let i: int = BFOUNDATION._RASTERDATA_TOP; i <= BFOUNDATION._RASTERDATA_ANIM3; i++) {
            let r: any = as3.vget(rd, i);
            let o: any = as3.vget(offs, i);
            if (r && o && as3.is(r.data, BitmapData) && r.visible !== false) {
                let bmd: BitmapData = as3.cast(r.data, BitmapData);
                if (bmd.width > 0 && bmd.height > 0) {
                    out.push({ "bmd": bmd, "left": b._mc.x + o.x, "top": b._mc.y + o.y });
                }
            }
        }
        return out;
    }

    /**
     * The coil's shape round what he squeezes: a helix climbing from the ground, each turn an ellipse (the yard's
     * view: twice as wide as tall) round the picture's outline at its height (no wider than the footprint), each turn
     * a little higher; the turns as many as fit his length, from one and a bit (round a large building he stretches,
     * longer and thinner, to go round it) to three (up a small one; the rest of him coiled on the ground round it).
     * Tables of each turn's middle and radius, and of the length along it.
     */
    private coilShape(on: any, from: any = null, back: any = null): any {
        let geo: any = { "on": on };
        let rxMax: number;
        let pics: any[];
        let thick0: number = Basilisk.THICK;
        if (as3.is(on, BFOUNDATION)) {
            let b: BFOUNDATION = as3.cast(on, BFOUNDATION);
            let fp: Rectangle = b._footprint && b._footprint[0] ? b._footprint[0] : new Rectangle(0, 0, 40, 40);
            let g0: Point = GRID.FromISO(b._mc.x + fp.x, b._mc.y + fp.y);
            let c: Point = GRID.ToISO(g0.x + fp.width / 2, g0.y + fp.height / 2, 0);
            geo.cx = c.x;
            geo.cy = c.y;
            rxMax = (fp.width + fp.height) / 2 * 0.92 + thick0 * 0.5;
            pics = Basilisk.buildingPictures(b);
            geo.creep = false;
        } else {
            let m: MonsterBase = as3.cast(on, MonsterBase);
            geo.cx = m._tmpPoint.x;
            geo.cy = m._tmpPoint.y;
            geo.x0 = m._tmpPoint.x;
            geo.y0 = m._tmpPoint.y;
            rxMax = 34;
            pics = m._graphic && m._graphicMC ? [{ "bmd": m._graphic, "left": m.x + m._graphicMC.x, "top": m.y + m._graphicMC.y - m._altitude }] : [];
            geo.creep = true;
        }
        let ol: any = Basilisk.outline(pics);
        // how tall it is (from its middle on the ground to its top), and how high the coil may climb
        let height: number = ol && ol.first < geo.cy ? geo.cy - ol.first : rxMax;
        let pitch: number = thick0 * 1.2;
        // (a second Basilisk wrapped round the same thing winds above the first, a third above that, as far as fits)
        let layer: int = 0;
        for (let k in CREEPS._creeps) {
            let o: Basilisk = as3.as(CREEPS._creeps[k], Basilisk);
            if (o && o !== this && o.health > 0 && o.m_coilOn === on) {
                layer++;
            }
        }
        let h0: number = thick0 * 0.25 + Math.min(layer * thick0 * 1.25, Math.max(0, height * 0.62 - pitch * 1.15 - thick0 * 0.25));
        geo.layer = layer;
        let maxTurns: number = Math.max(1.15, Math.min(3, (height * 0.62 - h0) / pitch));
        // the turns' tables, every 1/48 of a turn up to the most there may be
        let du: number = 1 / 48;
        let us: number[] = [], cxs: number[] = [], rxs: number[] = [];
        let minR: number = geo.creep ? 9 : 14;
        let last: number = rxMax * 0.6;
        // (half a turn more than may be used: the top turn is brought round to the front)
        for (let u: number = 0; u <= maxTurns + 0.6 + du; u += du) {
            let y: number = geo.cy - (h0 + u * pitch);
            let row: any[] = Basilisk.widest(ol, y - thick0 * 0.5, y + thick0 * 0.5);
            let rx: number = last, cx: number = geo.cx;
            if (row) {
                rx = (row[1] - row[0]) / 2 + thick0 * 0.42;
                cx = (row[0] + row[1]) / 2;
            }
            rx = Math.max(minR, Math.min(rxMax, rx));
            cx = Math.max(geo.cx - rx * 0.3, Math.min(geo.cx + rx * 0.3, cx));
            last = rx;
            us.push(u);
            rxs.push(rx);
            cxs.push(cx);
        }
        // smoothed (a turn follows the outline, not each pixel of it)
        let srx: number[] = [], scx: number[] = [];
        for (let i: int = 0; i < rxs.length; i++) {
            let sr: number = 0, sc: number = 0, k: int = 0;
            for (let j: int = Math.max(0, i - 6); j <= Math.min(rxs.length - 1, i + 6); j++) {
                sr += rxs[j];
                sc += cxs[j];
                k++;
            }
            srx.push(sr / k);
            scx.push(sc / k);
        }
        geo.us = us;
        geo.rxs = srx;
        geo.cxs = scx;
        geo.du = du;
        geo.h0 = h0;
        geo.pitch = pitch;
        // the coil starts on his side of it, and turns the way he was going
        geo.start = Math.random() * Math.PI * 2;
        geo.dir = 1;
        if (from) {
            let fx: number = from.x - geo.cx, fy: number = (from.y - geo.cy) * 2;
            if (fx * fx + fy * fy > 1) {
                geo.start = Math.atan2(fy, fx);
            }
            if (back) {
                let hx: number = from.x - back.x, hy: number = (from.y - back.y) * 2;
                // the turn's way round at the start (angle growing): (-sin, cos)
                geo.dir = hx * -Math.sin(geo.start) + hy * Math.cos(geo.start) < 0 ? -1 : 1;
            }
        }
        // the length along the helix
        let ss: number[] = [0];
        let prev: Point = this.helixAt(geo, 0, 1);
        for (let i: int = 1; i < us.length; i++) {
            let p: Point = this.helixAt(geo, us[i], 1);
            ss.push(ss[i - 1] + Point.distance(prev, p));
            prev = p;
        }
        geo.ss = ss;
        let neck: number = geo.creep ? 24 : 30;
        let avail: number = Basilisk.LENGTH - neck;
        let at: Function = (u: number): number => ss[Math.min(ss.length - 1, Math.round(u / du) | 0)];
        let turns: number;
        let length: number = Basilisk.LENGTH;
        let thick: number = Basilisk.THICK;
        if (at(1.15) > avail) {
            // too large to go round: he stretches (thinner) to go round it once and a bit
            turns = 1.15;
            length = at(turns) + neck;
            thick = Math.max(Basilisk.THICK * 0.55, Basilisk.THICK * Math.sqrt(Basilisk.LENGTH / length));
        } else {
            turns = 1.15;
            while (turns + du <= maxTurns && at(turns + du) <= avail) {
                turns += du;
            }
        }
        // the top turn's end (where his neck lifts off and his head is seen) in front of it: the coil's start moved
        // a little round (he crawls along the ground to it), or turned the other way, or a turn or so fewer
        let front: Function = (st: number, d: int, u: number): boolean => Math.sin(st + d * u * Math.PI * 2) > 0.3;
        if (!front(geo.start, geo.dir, turns)) {
            let found: boolean = false;
            for (let off: number = 0.05; off <= 0.301 && !found; off += 0.05) {
                for (let sg of [1, -1]) {
                    for (let d of [geo.dir, -geo.dir]) {
                        if (!found && front(geo.start + sg * off * Math.PI * 2, d, turns)) {
                            geo.start += sg * off * Math.PI * 2;
                            geo.dir = d;
                            found = true;
                        }
                    }
                }
            }
            while (!found && turns - du >= 1.0) {
                turns -= du;
                found = front(geo.start, geo.dir, turns);
            }
            // the turns' length again, from the start chosen
            ss = [0];
            let pv: Point = this.helixAt(geo, 0, 1);
            for (let i: int = 1; i < us.length; i++) {
                let pp: Point = this.helixAt(geo, us[i], 1);
                ss.push(ss[i - 1] + Point.distance(pv, pp));
                pv = pp;
            }
            geo.ss = ss;
            if (at(turns) + neck > length) {
                length = at(turns) + neck;
                thick = Math.min(thick, Math.max(Basilisk.THICK * 0.55, Basilisk.THICK * Math.sqrt(Basilisk.LENGTH / length)));
            }
        }
        geo.turns = turns;
        geo.coilLen = at(turns);
        geo.tail = Math.max(0, length - neck - geo.coilLen);
        geo.neck = neck;
        geo.length = length;
        geo.thick = thick;
        geo.round = ss.length > 48 ? ss[48] : ss[ss.length - 1] / Math.max(du, us[us.length - 1]);
        geo.height = height;
        return geo;
    }

    /** A point of the helix at `u` turns (the squeeze tightening it by `squeeze`); and whether it is in front. */
    private helixAt(geo: any, u: number, squeeze: number): Point {
        let i: int = Math.max(0, Math.min(geo.us.length - 1, Math.round(u / geo.du))) | 0;
        let rx: number = geo.rxs[i] * squeeze;
        let ang: number = geo.start + (geo.dir || 1) * u * Math.PI * 2;
        return new Point(geo.cxs[i] + (geo.dx || 0) + Math.cos(ang) * rx, geo.cy + (geo.dy || 0) - (geo.h0 + u * geo.pitch) + Math.sin(ang) * rx * 0.5);
    }

    /** The turns' length along them, up to `s`, as turns. */
    private turnsAt(geo: any, s: number): number {
        let ss: number[] = geo.ss;
        let lo: int = 0, hi: int = ss.length - 1;
        while (lo < hi) {
            let mid: int = ((lo + hi) >> 1) | 0;
            if (ss[mid] < s) {
                lo = (mid + 1) | 0;
            } else {
                hi = mid;
            }
        }
        if (lo == 0) {
            return 0;
        }
        let a: number = ss[lo - 1], b: number = ss[lo];
        return geo.us[lo - 1] + (b > a ? (s - a) / (b - a) : 0) * geo.du;
    }


    /** Defending too: he squeezes nothing until he is wrapped round it. */
    protected override tickBDefend(): boolean {
        let on: any = this._targetCreep;
        if (this._atTarget && on && !(this.m_coilOn === on && this.m_coil >= 1)) {
            this.attackCooldown = Math.max(this.attackCooldown, 2);
        }
        return super.tickBDefend();
    }

    /** His death: splats along all of him (he is long), not only where his head was. */
    public override deathSplat(): void {
        SOUNDS.Play("splat" + (((Math.random() * 3) | 0) + 1));
        let ground: Point[] = this.m_ground && this.m_ground.length ? this.m_ground : [this._tmpPoint];
        let picks: int = Math.min(3, ground.length) | 0;
        for (let i: int = 0; i < picks; i++) {
            let p: Point = ground[Math.floor(i * (ground.length - 1) / Math.max(1, picks - 1)) | 0];
            EFFECTS.CreepSplat(this._creatureID, p.x | 0, p.y | 0);
        }
    }

    /**
     * A replay's puppet (IoReplayPlayer): told where he was; his body follows as it did, a game step at a time as the
     * replay goes on (none while it is paused). Standing still next to a building for 1/5 second, he was squeezing it:
     * he winds round it as in the attack, and lets go when he moves on (a recording has his places, not his targets).
     */
    public override ioPuppet(x: number, y: number, hpRatio: number, altitude: number, walking: boolean, attacking: boolean = false, faceX: number = NaN, faceY: number = NaN): void {
        this.m_puppet = true;
        let t: number = IoReplayPlayer.time;
        let steps: number = 0;
        if (this.m_puppetT >= 0 && !IoReplayPlayer.paused && t > this.m_puppetT) {
            steps = (t - this.m_puppetT) * 80 / Math.max(0.001, IoReplayPlayer.rate * 1);
        }
        this.m_puppetT = t;
        // (a jump back: the replay restarted or was wound back)
        if (steps > 400) {
            steps = 0;
        }
        this.m_puppetCarry += steps;
        this.m_puppetSteps = Math.floor(this.m_puppetCarry) | 0;
        this.m_puppetCarry -= this.m_puppetSteps;
        let moved: boolean = Math.abs(x - this._tmpPoint.x) + Math.abs(y - this._tmpPoint.y) > 0.3;
        if (moved) {
            this.m_puppetStill = 0;
            this.m_puppetOn = null;
        } else {
            this.m_puppetStill += steps;
            if (!this.m_puppetOn && this.m_puppetStill >= 16) {
                this.m_puppetOn = Basilisk.buildingBeside(x, y);
            }
        }
        // (he squeezes by his own winding, above: not as a fighting monster)
        super.ioPuppet(x, y, hpRatio, altitude, walking);
    }

    /** The standing building whose footprint is next to this place (within 24 grid units), the nearest; or null. */
    private static buildingBeside(x: number, y: number): BFOUNDATION {
        let g: Point = GRID.FromISO(x, y);
        let best: BFOUNDATION = null, bestD: number = 24;
        for (let k in BASE._buildingsMain) {
            let b: BFOUNDATION = as3.as(BASE._buildingsMain[k], BFOUNDATION);
            if (!Basilisk.targetable(b) || !b._footprint || !b._footprint[0]) {
                continue;
            }
            let fp: Rectangle = b._footprint[0];
            let g0: Point = GRID.FromISO(b._mc.x + fp.x, b._mc.y + fp.y);
            let dx: number = Math.max(g0.x - g.x, 0, g.x - (g0.x + fp.width));
            let dy: number = Math.max(g0.y - g.y, 0, g.y - (g0.y + fp.height));
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) {
                bestD = d;
                best = b;
            }
        }
        return best;
    }

    // ---------------------------------------------------------------------------------------------- moving

    /**
     * His body is a path he lies along: points on the ground (x, y, the yard's coordinates) each with a height above
     * it (h, screen pixels), newest (his head) first. The head goes along a path ahead of it (where the game moves
     * him, or the way up round what he squeezes, or down off it) and every point it passes joins the body's path, so
     * the body always follows the head along the way it went: into a coil, out of one, over a wall.
     *   c: on a coil's turn (cx: that turn's middle; squeezed with it); cr: on a monster's coil (moves with it);
     *   f: drawn in front of what he squeezes whatever its place; l, w: lifted l pixels by the wall w under it (its
     *   height is at least that), drawn in front of that wall. A wall's lift is part of the path (worked out as the
     *   head goes there), so the body is as long over a wall as off it and follows it up, along and down.
     */
    private static tp(x: number, y: number, h: number = 0): any {
        return { "x": x, "y": y, "h": h, "c": 0, "cx": 0, "cr": 0, "f": 0, "l": 0, "w": null };
    }

    /** A point of the path on the ground at x, y, at least `h` high: higher over a wall. */
    private static onGround(x: number, y: number, h: number): any {
        let out: any = {};
        let lift: number = Basilisk.wallLift(x, y, out);
        let p: any = Basilisk.tp(x, y, Math.max(0, h, lift));
        if (lift > 0.5 && out.wall) {
            p.l = lift;
            p.w = lift > 1.5 ? out.wall : null;
        }
        return p;
    }

    /** The distance between two of the path's points as drawn (on the screen). */
    private static sdist(a: any, b: any): number {
        let dx: number = a.x - b.x, dy: number = (a.y - a.h) - (b.y - b.h);
        return Math.sqrt(dx * dx + dy * dy);
    }

    private static lerp(a: any, b: any, t: number): any {
        let p: any = Basilisk.tp(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.h + (b.h - a.h) * t);
        p.c = a.c && b.c ? 1 : 0;
        p.cx = a.cx + (b.cx - a.cx) * t;
        p.cr = a.cr && b.cr ? 1 : 0;
        p.f = a.f || b.f ? 1 : 0;
        p.l = a.l + (b.l - a.l) * t;
        p.w = a.w || b.w;
        return p;
    }

    /**
     * Spawned (flung in, hatched, out of the Compound): lying coiled, a flat spiral piled a little higher to its middle,
     * where his head rests, raised. Moving off, his head leads out over the coils and the body unwinds behind it.
     */
    private layPile(): void {
        let c: Point = new Point(this._tmpPoint.x, this._tmpPoint.y);
        let a0: number = Math.random() * Math.PI * 2;
        let r0: number = 9, r1: number = 46;
        let turns: number = 2.7;
        let pile: number = Basilisk.THICK * 1.05;
        let trail: any[] = [];
        let total: number = turns * Math.PI * 2;
        for (let phi: number = 0; phi <= total; phi += 0.06) {
            let t: number = phi / total;
            let r: number = r0 + (r1 - r0) * t;
            trail.push(Basilisk.onGround(c.x + Math.cos(a0 + phi) * r, c.y + Math.sin(a0 + phi) * r * 0.5, pile * Math.max(0, 1 - t * 1.15)));
        }
        this.m_trail = trail;
        this.m_ahead = [];
        this.m_rear = 1;
        this.m_still = 100;
        this.m_resting = true;
        this.m_restAt = new Point(this._tmpPoint.x, this._tmpPoint.y);
    }

    /** What he is squeezing now (a building, or a monster), or null. */
    private squeezing(): any {
        if (this.m_puppet) {
            return this.m_puppetOn && this.m_puppetOn.health > 0 && !this.m_puppetOn._destroyed ? this.m_puppetOn : null;
        }
        if (!this._attacking || !this._atTarget || this.health <= 0) {
            return null;
        }
        if (this._targetCreep && this._targetCreep.health > 0) {
            return this._targetCreep;
        }
        if (this._targetBuilding && this._targetBuilding.health > 0) {
            return this._targetBuilding;
        }
        return null;
    }

    /** Every game step: wrapping or letting go, the head along its path, the body after it. */
    private followHead(): void {
        let pos: Point = this._tmpPoint;
        this.m_clock++;
        if (!this.m_trail || !this.m_trail.length) {
            this.layPile();
        }
        // flung in: he drops in coiled and bounces once
        if (this.m_drop > 0 || this.m_dropV != 0) {
            this.m_dropV += 0.35;
            this.m_drop -= this.m_dropV;
            if (this.m_drop <= 0) {
                this.m_drop = 0;
                this.m_dropV = this.m_dropV > 2.5 ? -this.m_dropV * 0.3 : 0;
            }
        }
        // wrapping round what he squeezes, or letting go (a few steps late, so a monster stepping off for a moment
        // does not unwind him; at once when it has fallen)
        let on: any = this.squeezing();
        if (on && on !== this.m_coilOn) {
            this.startCoil(on);
        } else if (!on && this.m_coilOn) {
            let gone: boolean = this.m_puppet || this.m_coilOn.health <= 0 || (this.m_coilOn !== this._targetBuilding && this.m_coilOn !== this._targetCreep);
            if (gone || ++this.m_offFor > 6) {
                this.releaseCoil();
            }
        }
        if (on) {
            this.m_offFor = 0;
        }
        let head: any = this.m_trail[0];
        // where the game moves him joins the path ahead (not while he is wrapped round something); a raised head
        // comes down gently
        if (this.m_aim && !this.m_coilOn) {
            // coming down off a coil, towards his next target: once down, he waits for where he really is to come
            // past him (it may start on the coil's far side) rather than going back for it
            if (!this.m_ahead.length) {
                let tx: number = this.m_aim.x - head.x, ty: number = this.m_aim.y - head.y;
                let px: number = pos.x - head.x, py: number = pos.y - head.y;
                // (or at most 2 seconds)
                if (px * tx + py * ty > 0 || px * px + py * py < 36 || tx * tx + ty * ty < 400 || ++this.m_aimFor > 160) {
                    this.m_aim = null;
                    // (catching up at his pace, not at once)
                    this.m_lag = true;
                }
            }
        }
        // lying coiled up (resting): until where he is moves on; then he leads out of it (anything of the curl not
        // yet done left)
        if (this.m_resting && this.m_restAt && Math.abs(pos.x - this.m_restAt.x) + Math.abs(pos.y - this.m_restAt.y) > 2) {
            this.m_resting = false;
            this.m_ahead = [];
            this.m_lag = true;
        }
        if (!this.m_coilOn && !this.m_aim && !this.m_resting) {
            let last: any = this.m_ahead.length ? this.m_ahead[this.m_ahead.length - 1] : head;
            let dx: number = pos.x - last.x, dy: number = pos.y - last.y;
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d >= 1.5 || (last.h > last.l + 0.01 && d > 0.2)) {
                this.m_ahead.push(Basilisk.onGround(pos.x, pos.y, last.h - d * (last.w ? 1 : this.m_descend)));
            } else if (last.h > last.l + 0.01 && !this.m_ahead.length && this.m_relLen > 0) {
                // still with his head up (on top of a coil he let go of): it comes down where he is
                this.m_ahead.push(Basilisk.onGround(pos.x, pos.y, last.h - 1.2));
            }
        }
        // the head goes along its path: at once when it only follows where he is, at a wrapping pace up a coil
        // or down off one (faster if it falls far behind)
        let budget: number = 1e9;
        if (this.m_lag) {
            budget = this.m_resting ? Basilisk.CURL_SPEED : Basilisk.WIND_SPEED;
            if (!this.m_coilOn) {
                // (coming off: a little faster when where he really is gets far ahead)
                let behind: number = 0, p: any = head;
                for (let q of this.m_ahead) {
                    behind += Basilisk.sdist(p, q);
                    p = q;
                }
                budget += Math.min(3, Math.max(0, behind - 80) * 0.02);
            }
        }
        let moved: number = this.advance(budget);
        if (this.m_coilOn) {
            this.m_windDone += moved;
        }
        if (!this.m_ahead.length) {
            this.m_lag = false;
        }
        this.m_moved += moved;
        this.m_phase += moved * 0.22;
        if (this.m_relLen > 0) {
            this.m_relTravel += moved;
        }
        // standing still (not wrapped): his head rises, and goes down again when he moves; still for long, he curls up
        this.m_still = moved < 0.3 ? this.m_still + 1 : 0;
        if (!this.m_coilOn && !this.m_resting && !this.m_lag && !this.m_ahead.length && !this.m_aim && this.m_relLen <= 0 && this.m_still > 60 && !head.c && this.health > 0) {
            this.curlUp();
        }
        let rearTo: number = !this.m_coilOn && !this.m_lag && !head.c && this.m_still > 14 ? 1 : 0;
        this.m_rear += (rearTo - this.m_rear) * (rearTo > this.m_rear ? 0.05 : 0.12);
        // his length and thickness: stretched while wrapped round something large, back as he comes off it
        let geo: any = this.m_coilGeo;
        if (this.m_coilOn && geo) {
            this.m_coil = this.m_ahead.length ? Math.min(1, this.m_windDone / Math.max(1, this.m_windTotal)) : 1;
            let e: number = this.m_coil * this.m_coil * (3 - 2 * this.m_coil);
            // (22 October: from his length as the wrap began: off one large building straight onto the next, he
            // snapped back to his usual length at once, his tail jumping)
            let fromLen: number = this.m_coilFromLen === this.m_coilFromLen ? this.m_coilFromLen : Basilisk.LENGTH;
            let fromThick: number = this.m_coilFromThick === this.m_coilFromThick ? this.m_coilFromThick : Basilisk.THICK;
            this.m_len = fromLen + (geo.length - fromLen) * e;
            this.m_thick = fromThick + (geo.thick - fromThick) * e;
        } else if (this.m_relLen > 0) {
            let t: number = Math.min(1, this.m_relTravel / Math.max(40, this.m_relLen * 0.6));
            this.m_len = this.m_relLen + (Basilisk.LENGTH - this.m_relLen) * t;
            this.m_thick = this.m_relThick + (Basilisk.THICK - this.m_relThick) * t;
            if (t >= 1) {
                this.m_relLen = 0;
            }
        } else {
            this.m_len = Basilisk.LENGTH;
            this.m_thick = Basilisk.THICK;
        }
        // the path behind him: as long as he is, and some
        let keep: number = this.m_len * 1.25 + 60, along: number = 0;
        for (let i: int = 1; i < this.m_trail.length; i++) {
            along += Basilisk.sdist(this.m_trail[i - 1], this.m_trail[i]);
            if (along > keep) {
                this.m_trail.length = i + 1;
                break;
            }
        }
    }

    /** The head along the path ahead, `budget` pixels at most; how far it went. */
    private advance(budget: number): number {
        let moved: number = 0;
        let trail: any[] = this.m_trail;
        while (this.m_ahead.length && budget > 0) {
            let head: any = trail[0];
            let next: any = this.m_ahead[0];
            let d: number = Basilisk.sdist(head, next);
            let p: any;
            if (d <= budget) {
                p = next;
                this.m_ahead.shift();
                budget -= d;
                moved += d;
            } else {
                p = Basilisk.lerp(head, next, budget / d);
                moved += budget;
                budget = 0;
            }
            // (points closer than a pixel and a half are one)
            if (trail.length > 1 && Basilisk.sdist(trail[1], p) < 1.5 && !trail[0].c) {
                trail[0] = p;
            } else {
                trail.unshift(p);
            }
        }
        return moved;
    }

    /**
     * Resting (still for 3/4 second, nothing to squeeze: waiting in the Compound, for a way on): he curls up where he
     * is, his head turning off to one side and spiralling in, his body after it, into the same pile he lands in (2.7
     * turns, 46 to 9 px, higher to the middle where his head rests, raised). He leads out of it when he moves on.
     */
    private curlUp(): void {
        let head: any = this.m_trail[0];
        let back: any = this.m_trail[Math.min(this.m_trail.length - 1, 8)];
        // (in the ground's own proportions: the yard shows it half as tall as wide)
        let hx: number = head.x - back.x, hy: number = (head.y - back.y) * 2;
        let hl: number = Math.sqrt(hx * hx + hy * hy);
        if (hl < 0.01) {
            hx = 1;
            hy = 0;
            hl = 1;
        }
        hx /= hl;
        hy /= hl;
        let side: number = Math.random() < 0.5 ? -1 : 1;
        let r1: number = 46, r0: number = 9, turns: number = 2.7;
        let cx: number = head.x + -hy * side * r1, cy: number = head.y + (hx * side * r1) / 2;
        let a0: number = Math.atan2((head.y - cy) * 2, head.x - cx);
        // (on round the way he was heading)
        let dir: number = hx * -Math.sin(a0) + hy * Math.cos(a0) < 0 ? -1 : 1;
        let pile: number = Basilisk.THICK * 1.05;
        let total: number = turns * Math.PI * 2;
        let path: any[] = [];
        for (let phi: number = 0.06; phi <= total; phi += 0.06) {
            let t: number = phi / total;
            let r: number = r1 + (r0 - r1) * t;
            let ang: number = a0 + dir * phi;
            path.push(Basilisk.onGround(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.5, pile * Math.max(0, 1 - (1 - t) * 1.15)));
        }
        this.m_ahead = path;
        this.m_lag = true;
        this.m_resting = true;
        this.m_restAt = new Point(this._tmpPoint.x, this._tmpPoint.y);
    }

    /**
     * Wrapping round it: the path ahead goes from his head along the ground to the foot of the coil, up its turns
     * and up off the top turn (his neck), where his head bites in; he goes along it at the wrapping pace, so he winds
     * himself round it. The coil starts on his side of it and turns the way he was going.
     */
    private startCoil(on: any): void {
        let head: any = this.m_trail[0];
        let back: any = this.m_trail[Math.min(this.m_trail.length - 1, 6)];
        let geo: any = this.coilShape(on, head, back);
        this.m_coilFromLen = this.m_len > 0 ? this.m_len : Basilisk.LENGTH;
        this.m_coilFromThick = this.m_thick > 0 ? this.m_thick : Basilisk.THICK;
        this.m_coilOn = on;
        this.m_aim = null;
        this.m_resting = false;
        this.m_coilGeo = geo;
        this.m_offFor = 0;
        this.m_relLen = 0;
        let cr: int = geo.creep ? 1 : 0;
        let path: any[] = [];
        // along the ground to the coil's foot
        let foot: any = this.helixTP(geo, 0);
        let gd: number = Basilisk.sdist(head, foot);
        let steps: int = Math.max(1, Math.ceil(gd / 3)) | 0;
        for (let i: int = 1; i < steps; i++) {
            let q: any = Basilisk.lerp(head, foot, i / steps);
            let p: any = Basilisk.onGround(q.x, q.y, head.h * (1 - i / steps) + foot.h * (i / steps));
            path.push(p);
        }
        // up the turns
        for (let u: number = 0; u <= geo.turns + 1e-6; u += geo.du) {
            path.push(this.helixTP(geo, u));
        }
        // the neck: off the top turn, leaning in over it, rising
        let top: any = path[path.length - 1];
        let mid: number = geo.cxs[geo.cxs.length - 1];
        for (let i: int = 1; i <= 10; i++) {
            let t: number = i / 10;
            let lean: number = 0.3 * t;
            let p: any = Basilisk.tp(top.x + (mid - top.x) * lean, top.y + (geo.cy - top.y) * lean, top.h + Math.sin(t * Math.PI * 0.5) * 18);
            p.cr = cr;
            p.f = 1;
            path.push(p);
        }
        this.m_ahead = path;
        this.m_lag = true;
        this.m_windDone = 0;
        let total: number = 0, prev: any = head;
        for (let q of path) {
            total += Basilisk.sdist(prev, q);
            prev = q;
        }
        this.m_windTotal = total;
        this.m_coil = 0;
        SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0), 0.7);
    }

    /** A point of a coil's turn, `u` turns up from its foot (on the ground under it, and its height). */
    private helixTP(geo: any, u: number): any {
        let i: int = Math.max(0, Math.min(geo.us.length - 1, Math.round(u / geo.du))) | 0;
        let rx: number = geo.rxs[i];
        let ang: number = geo.start + geo.dir * u * Math.PI * 2;
        let p: any = Basilisk.tp(geo.cxs[i] + Math.cos(ang) * rx, geo.cy + Math.sin(ang) * rx * 0.5, geo.h0 + u * geo.pitch);
        p.c = 1;
        p.cx = geo.cxs[i];
        p.cr = geo.creep ? 1 : 0;
        return p;
    }

    /**
     * Letting go: his body stays where it lay (a monster's coil where the monster is now) and his head comes down off
     * the top and goes where he goes; the body unwinds after it, and he shortens and thickens back as he comes off.
     */
    private releaseCoil(): void {
        let geo: any = this.m_coilGeo;
        if (geo && geo.creep) {
            for (let p of this.m_trail) {
                if (p.cr) {
                    p.x += geo.dx || 0;
                    p.y += geo.dy || 0;
                    p.cr = 0;
                }
            }
            for (let p of this.m_ahead) {
                if (p.cr) {
                    p.x += geo.dx || 0;
                    p.y += geo.dy || 0;
                    p.cr = 0;
                }
            }
            geo.cy += geo.dy || 0;
            for (let i: int = 0; i < geo.cxs.length; i++) {
                geo.cxs[i] += geo.dx || 0;
            }
            geo.dx = geo.dy = 0;
            geo.frozen = true;
        }
        this.m_coilOn = null;
        this.m_ahead = [];
        // his head comes down round the outside of the coil, towards where he is going, to the ground at its foot
        let head: any = this.m_trail[0];
        if (geo && geo.cxs && head) {
            let cx: number = geo.cxs[0], cy: number = geo.cy;
            // (towards where he is going next: his next target, or where he is)
            let pos: Point = this._tmpPoint;
            if (this._targetBuilding && this._targetBuilding !== geo.on && this._targetBuilding._mc) {
                pos = new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y);
            } else if (this._targetCreep && this._targetCreep !== geo.on) {
                pos = this._targetCreep._tmpPoint;
            }
            this.m_aim = new Point(pos.x, pos.y);
            this.m_aimFor = 0;
            // (from where his neck lifts off the top turn: his head leans in from there, along the same line)
            let from: number = geo.start + geo.dir * geo.turns * Math.PI * 2;
            let to: number = Math.atan2((pos.y - cy) * 2, pos.x - cx);
            let turn: number = to - from;
            while (turn > Math.PI) {
                turn -= Math.PI * 2;
            }
            while (turn < -Math.PI) {
                turn += Math.PI * 2;
            }
            // (a quarter of a turn at least, half at most: he comes down round it, not straight off it)
            let sweep: number = Math.max(Math.PI * 0.25, Math.min(Math.PI, Math.abs(turn))) * (turn < 0 ? -1 : 1);
            let r0: number = Math.sqrt(Math.pow(head.x - cx, 2) + Math.pow((head.y - cy) * 2, 2));
            if (geo.frozen !== true && geo.creep) {
                r0 = Math.max(r0, 1);
            }
            let r1: number = geo.rxs[0] * 1.15 + this.m_thick * 0.5;
            let arc: number = Math.abs(sweep) * (r0 + r1) * 0.4 + head.h;
            let steps: int = Math.max(6, Math.ceil(arc / 3)) | 0;
            for (let i: int = 1; i <= steps; i++) {
                let t: number = i / steps;
                let ang: number = from + sweep * t;
                let r: number = r0 * (1 - t) + r1 * t;
                let e: number = t * t * (3 - 2 * t);
                let p: any = Basilisk.onGround(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.5, head.h * (1 - e));
                this.m_ahead.push(p);
            }
            // he is where he comes down (his place in the game was where he reached it, maybe on its far side):
            // his way on from there
            let land: any = this.m_ahead[this.m_ahead.length - 1];
            if (land && !this.m_puppet && this.health > 0 && (this._targetBuilding || this._targetCreep)) {
                this._tmpPoint.x = land.x;
                this._tmpPoint.y = land.y;
                // (his way on is after the way down: nothing to wait for)
                this.m_aim = null;
                this.graphic.x = land.x | 0;
                this.graphic.y = land.y | 0;
                if (this._targetCreep && this._targetCreep !== geo.on) {
                    this._waypoints = [this._targetCreep._tmpPoint];
                } else if (this._targetBuilding && this._targetBuilding !== geo.on) {
                    this.WaypointTo(new Point(this._targetBuilding._mc.x, this._targetBuilding._mc.y), this._targetBuilding);
                }
            }
        }
        this.m_lag = true;
        this.m_relLen = this.m_len;
        this.m_relThick = this.m_thick;
        this.m_relTravel = 0;
        this.m_descend = 0.9;
    }

    // ---------------------------------------------------------------------------------------------- walls

    /**
     * The yard's walls (standing): each one's footprint on the grid and how high he goes over it (its picture's
     * height), worked out every 2 seconds, and in cells of 40 grid units to find the ones near a point.
     */
    private static walls(): any {
        let w: any = Basilisk.s_walls;
        if (w && GLOBAL._frameNumber - w.at < 160 && w.count == BASE._buildingCount) {
            return w;
        }
        let cells: any = {};
        let n: int = 0;
        for (let k in BASE._buildingsWalls) {
            let b: BFOUNDATION = as3.as(BASE._buildingsWalls[k], BFOUNDATION);
            if (!b || b._class != "wall" || b.health <= 0 || !b._footprint || !b._footprint[0]) {
                continue;
            }
            let fp: Rectangle = b._footprint[0];
            let g0: Point = GRID.FromISO(b._mc.x + fp.x, b._mc.y + fp.y);
            let key: string = b._type + "_" + (b._lvl ? b._lvl.Get() : 0);
            let lift: number = Basilisk.s_wallLift[key];
            if (lift == null) {
                let ol: any = Basilisk.outline(Basilisk.buildingPictures(b));
                let ground: Point = GRID.ToISO(g0.x + fp.width / 2, g0.y + fp.height / 2, 0);
                lift = ol && ol.first < ground.y ? Math.max(10, Math.min(38, (ground.y - ol.first) * 0.8)) : 20;
                if (ol) {
                    Basilisk.s_wallLift[key] = lift;
                }
            }
            let mid: number = b._middle ? b._middle : b._mc.height * 0.5;
            let wall: any = { "x": g0.x, "y": g0.y, "w": fp.width, "h": fp.height, "lift": lift, "dy": b._mc.y + mid, "dx": b._mc.x };
            let cx0: int = Math.floor((g0.x - Basilisk.WALL_RAMP) / 40) | 0, cx1: int = Math.floor((g0.x + fp.width + Basilisk.WALL_RAMP) / 40) | 0;
            let cy0: int = Math.floor((g0.y - Basilisk.WALL_RAMP) / 40) | 0, cy1: int = Math.floor((g0.y + fp.height + Basilisk.WALL_RAMP) / 40) | 0;
            for (let cx: int = cx0; cx <= cx1; cx++) {
                for (let cy: int = cy0; cy <= cy1; cy++) {
                    let ck: string = cx + "," + cy;
                    (cells[ck] || (cells[ck] = [])).push(wall);
                }
            }
            n++;
        }
        Basilisk.s_walls = { "at": GLOBAL._frameNumber, "count": BASE._buildingCount, "cells": cells, "n": n };
        return Basilisk.s_walls;
    }

    /** How high a point of him is lifted going over a wall (up its near side, along its top, down the far side), and the wall. */
    private static wallLift(x: number, y: number, out: any): number {
        let w: any = Basilisk.walls();
        if (!w.n) {
            return 0;
        }
        let g: Point = GRID.FromISO(x, y);
        let list: any[] = w.cells[(Math.floor(g.x / 40) | 0) + "," + (Math.floor(g.y / 40) | 0)];
        if (!list) {
            return 0;
        }
        let best: number = 0;
        for (let wall of list) {
            let dx: number = Math.max(wall.x - g.x, 0, g.x - (wall.x + wall.w));
            let dy: number = Math.max(wall.y - g.y, 0, g.y - (wall.y + wall.h));
            let d: number = Math.sqrt(dx * dx + dy * dy);
            if (d >= Basilisk.WALL_RAMP) {
                continue;
            }
            let t: number = 1 - d / Basilisk.WALL_RAMP;
            let lift: number = wall.lift * t * t * (3 - 2 * t);
            if (lift > best) {
                best = lift;
                if (out) {
                    out.wall = wall;
                }
            }
        }
        return best;
    }

    // ---------------------------------------------------------------------------------------------- drawing

    /** His own drawing: the body, then his place in the yard's drawing order (each of his canvases). */
    protected override render(): void {
        if (!this.m_ready) {
            return;
        }
        if (this.x != (this._tmpPoint.x | 0) || this.y != (this._tmpPoint.y | 0)) {
            this.graphic.x = this._tmpPoint.x | 0;
            this.graphic.y = this._tmpPoint.y | 0;
        }
        // (every step, catching up too: he must wind himself round his target before he can squeeze it; a replay's
        // puppet as many steps as the replay went on, none while it is paused)
        if (this.m_puppet) {
            for (let i: int = 0; i < this.m_puppetSteps; i++) {
                this.followHead();
            }
            this.m_puppetSteps = 0;
        } else {
            this.followHead();
        }
        if (GLOBAL._catchup) {
            return;
        }
        if (GLOBAL.INFERNO_ONLY && !GLOBAL._render && this.m_drawn) {
            return;
        }
        this._visible = true;
        if (this._rasterData) {
            this._rasterData.visible = true;
        }
        this.draw();
        this.updateRasterData();
        this.m_drawn = true;
    }

    /** Points of him every `step` along his path from the head (as on the path: ground, height and the rest). */
    private sample(n: int, step: number): any[] {
        let out: any[] = [];
        let trail: any[] = this.m_trail;
        let i: int = 0, along: number = 0;
        let a: any = trail[0], b: any = trail.length > 1 ? trail[1] : trail[0];
        let seg: number = Basilisk.sdist(a, b);
        for (let k: int = 0; k < n; k++) {
            let want: number = k * step;
            // (a segment of no length is passed over: it is not the path's end)
            while ((along + seg < want || seg < 0.001) && i < trail.length - 2) {
                along += seg;
                i++;
                a = trail[i];
                b = trail[i + 1];
                seg = Basilisk.sdist(a, b);
            }
            if (seg > 0.001 && want - along <= seg) {
                out.push(Basilisk.lerp(a, b, Math.max(0, want - along) / seg));
            } else {
                // beyond the path's end: on along its last heading
                let last: any = out.length ? out[out.length - 1] : trail[trail.length - 1];
                let prev: any = out.length > 1 ? out[out.length - 2] : last;
                let dx: number = last.x - prev.x, dy: number = last.y - prev.y;
                let len: number = Math.sqrt(dx * dx + dy * dy) || 1;
                let p: any = Basilisk.tp(last.x + dx / len * step, last.y + dy / len * step, last.h);
                out.push(p);
            }
        }
        return out;
    }

    /** The body's thickness along it (k from the head): the neck a little slimmer, the tail tapering away. */
    private static taper(k: int, n: int): number {
        let t: number = k / Math.max(1, n - 1);
        if (t < 0.12) {
            return 0.82 + t * 1.5;
        }
        if (t > 0.55) {
            return Math.max(0.32, 1 - (t - 0.55) / 0.45 * 0.68);
        }
        return 1;
    }

    private draw(): void {
        let cells: any[] = Basilisk.s_cellsBy[this.m_skin];
        let C: int = Basilisk.CANVAS;
        this._graphic.fillRect(this._graphic.rect, 0);
        this.m_front.fillRect(this.m_front.rect, 0);
        this.m_over.fillRect(this.m_over.rect, 0);
        this.m_frontUsed = this.m_overUsed = false;
        if (!cells) {
            Basilisk.loadSheet(this.m_skin);
            return;
        }
        if (!this.m_trail || !this.m_trail.length) {
            this.layPile();
        }
        let geo: any = this.m_coilGeo;
        if (geo && geo.creep && !geo.frozen && geo.on) {
            geo.dx = geo.on._tmpPoint.x - geo.x0;
            geo.dy = geo.on._tmpPoint.y - geo.y0;
        }
        let thick: number = this.m_thick;
        let step: number = thick * 0.34;
        let n: int = Math.max(12, Math.ceil(this.m_len / step)) | 0;
        let pts: any[] = this.sample(n, step);
        // the squeeze: the turns tighten every 1/8 second (and the jaws bite)
        // (in time with his squeezes: tightest as each one lands, the cooldown just set, easing off until the next; a
        // puppet's from his clock)
        let pulse: number;
        if (!this.m_puppet && this.m_coilOn && this.m_coil >= 1 && this.attackDelay > 0) {
            let c: number = Math.max(0, Math.min(1, this.attackCooldown / Math.max(1, this.attackDelay)));
            pulse = c * c * (3 - 2 * c);
        } else {
            pulse = 0.5 + 0.5 * Math.cos((this.m_clock % 10) / 10 * Math.PI * 2);
        }
        let squeeze: number = this.m_coilOn ? 1 - 0.045 * pulse * this.m_coil : 1;
        let anyCoil: boolean = false;
        let overDepth: any = null;
        let maxLift: number = 0;
        // where each bead goes: on the ground (the squeeze, the slither's wave, a wall under it), how high, and which
        // canvas: behind or in front of what he squeezes, or over a wall
        let gx: number[] = [], gy: number[] = [], sy: number[] = [], where: int[] = [];
        for (let k: int = 0; k < n; k++) {
            let p: any = pts[k];
            let x: number = p.x + (p.cr && geo ? geo.dx || 0 : 0);
            let y: number = p.y + (p.cr && geo ? geo.dy || 0 : 0);
            if (p.c && geo) {
                anyCoil = true;
                let cx: number = p.cx + (p.cr ? geo.dx || 0 : 0), cy: number = geo.cy + (p.cr ? geo.dy || 0 : 0);
                x = cx + (x - cx) * squeeze;
                y = cy + (y - cy) * squeeze;
            }
            let h: number = p.h;
            // over a wall (lifted on the path already): drawn just in front of it
            if (p.w) {
                maxLift = Math.max(maxLift, p.l);
                where[k] = 2;
                if (!overDepth || p.w.dy > overDepth.dy || (p.w.dy == overDepth.dy && p.w.dx > overDepth.dx)) {
                    overDepth = p.w;
                }
            }
            if (!p.c && !p.f) {
                // the slither's wave: sideways on the ground, none at the head, less up off the ground
                if (k > 0) {
                    let q: any = pts[k - 1];
                    let dx: number = p.x - q.x, dy: number = p.y - q.y;
                    let len: number = Math.sqrt(dx * dx + dy * dy) || 1;
                    let env: number = Math.min(1, k / 5) * (1 - 0.35 * k / n) * Math.max(0, 1 - (p.h - p.l) / 8) * (1 - this.m_rear * 0.7);
                    let w: number = Math.sin(this.m_phase - k * 0.55) * 5.5 * env;
                    x += (-dy / len) * w;
                    y += (dx / len) * w * 0.5;
                }
            }
            // his head up while he is still (lying coiled, or waiting)
            if (k < 9 && this.m_rear > 0.01) {
                let t: number = 1 - k / 9;
                h += this.m_rear * 20 * t * t;
            }
            h += this.m_drop;
            gx.push(x);
            gy.push(y);
            sy.push(y - h);
            if (where[k] !== 2) {
                where[k] = geo && (p.f || y > geo.cy + (geo.creep ? geo.dy || 0 : 0) + 0.5) ? 1 : 0;
            }
        }
        if (geo && !this.m_coilOn && !anyCoil && this.m_relLen <= 0) {
            // off it: drawn as any monster again
            this.m_coilGeo = geo = null;
            for (let k: int = 0; k < n; k++) {
                if (where[k] == 1) {
                    where[k] = 0;
                }
            }
        }
        this.m_overWall = overDepth;
        this.m_maxLift = maxLift;
        // the canvases' top left in the yard: round all of him
        let minX: number = 1e9, minY: number = 1e9, maxX: number = -1e9, maxY: number = -1e9;
        for (let k: int = 0; k < n; k++) {
            minX = Math.min(minX, gx[k]);
            maxX = Math.max(maxX, gx[k]);
            minY = Math.min(minY, sy[k], gy[k]);
            maxY = Math.max(maxY, sy[k], gy[k]);
        }
        this.m_origin.x = (((minX + maxX) / 2) | 0) - C / 2;
        this.m_origin.y = (((minY + maxY) / 2) | 0) - C / 2;
        let ox: number = this.m_origin.x, oy: number = this.m_origin.y;
        let canvases: BitmapData[] = [this._graphic, this.m_front, this.m_over];
        // his shadow on the ground (fainter the higher he is)
        let sh: Shape = this.m_shape;
        sh.graphics.clear();
        for (let k: int = 0; k < n; k += 2) {
            let lift: number = gy[k] - sy[k];
            if (lift > 30) {
                continue;
            }
            let r: number = thick * 0.5 * Basilisk.taper(k, n) * (1 + lift / 60);
            sh.graphics.beginFill(0x000000, 0.2 * (1 - lift / 30));
            sh.graphics.drawEllipse(gx[k] - ox - r + 2, gy[k] - oy - r * 0.55 + 4, r * 2, r * 1.1);
            sh.graphics.endFill();
        }
        this._graphic.draw(sh);
        // the beads, tail first (each over the one behind it), in bands of red and black
        let m: Matrix = new Matrix();
        let half: number = Basilisk.CELL / 2;
        let cols: int[] = [];
        for (let k: int = n - 1; k >= 1; k--) {
            // (his heading there over a few beads, not one: neighbouring beads keep one column, frame to frame)
            let a: int = Math.max(0, k - 3) | 0, b: int = Math.min(n - 1, k + 3) | 0;
            let f: int = Basilisk.facing(gx[a] - gx[b], sy[a] - sy[b]);
            cols[k] = f;
            let sc: number = thick / Basilisk.BEAD * Basilisk.taper(k, n);
            let band: int = ((k * step) / (thick * 1.25) | 0) % 2;
            m.identity();
            m.translate(-half, -half);
            m.scale(sc, sc);
            m.translate(gx[k] - ox, sy[k] - oy);
            canvases[where[k]].draw(as3.cast(cells[band][f], BitmapData), m, null, null, null, true);
        }
        // the head: biting while he squeezes, the tongue now and then otherwise
        let hf: int = Basilisk.facing(gx[0] - gx[3], sy[0] - sy[3]);
        cols[0] = hf;
        (this as any).m_cols = cols;
        let open: boolean = this.m_coilOn && this.m_coil >= 0.95 ? pulse > 0.45 : this.m_clock % 200 < 18;
        let hs: number = thick / Basilisk.BEAD * 1.05;
        m.identity();
        m.translate(-half, -half);
        m.scale(hs, hs);
        m.translate(gx[0] - ox, sy[0] - oy);
        let headOn: BitmapData = canvases[where[0]];
        headOn.draw(as3.cast(cells[open ? 3 : 2][hf], BitmapData), m, null, null, null, true);
        if (this.health < this.maxHealth && CREEPS._bmdHPbar) {
            let row: int = (11 - ((11 / this.maxHealth * this.health) | 0)) | 0;
            headOn.copyPixels(CREEPS._bmdHPbar, new Rectangle(0, 5 * row, 17, 5), new Point((gx[0] - ox - 8) | 0, (sy[0] - oy - 22) | 0));
        }
        for (let k: int = 0; k < n; k++) {
            if (where[k] == 1) {
                this.m_frontUsed = true;
            } else if (where[k] == 2) {
                this.m_overUsed = true;
            }
        }
        // his body as drawn (head first, on the screen), for anyone who asks
        let body: Point[] = [];
        for (let k: int = 0; k < n; k++) {
            body.push(new Point(gx[k], sy[k]));
        }
        this.m_body = body;
        let ground: Point[] = [];
        for (let k: int = 0; k < n; k += 4) {
            ground.push(new Point(gx[k], gy[k]));
        }
        this.m_ground = ground;
    }

    /**
     * Each canvas at his canvases' place: the body at his own depth, or, while he is wrapped round something (and
     * until he is off it), just behind it; the front of a coil just in front of all of it; what goes over a wall
     * just in front of that wall.
     */
    protected override updateRasterData(): void {
        if (!BYMConfig.instance.RENDERER_ON || !this._graphicMC) {
            return;
        }
        let off: Point = MAP.instance.offset;
        this._graphicMC.x = this.m_origin.x - this.x;
        this._graphicMC.y = this.m_origin.y - this.y;
        super.updateRasterData();
        if (!this.m_frontData || !this.m_overData) {
            return;
        }
        // (a tilted yard, IoTilt: he lies along the ground, squashed with it)
        this._rasterData._ioFlat = this.m_frontData._ioFlat = this.m_overData._ioFlat = true;
        this.m_frontPt.x = this.m_overPt.x = this.m_origin.x - off.x;
        this.m_frontPt.y = this.m_overPt.y = this.m_origin.y - off.y;
        let geo: any = this.m_coilGeo;
        if (geo && geo.on) {
            let depth: number;
            if (geo.creep) {
                let c: MonsterBase = as3.cast(geo.on, MonsterBase);
                depth = Math.max(MAP.DEPTH_SHADOW + 1, (c.y + c._altitude - off.y + (c._middle || 5)) * 1000 + c.x - off.x);
                this._rasterData.depth = depth - 0.5;
                this.m_frontData.depth = depth + 0.5;
            } else {
                let b: BFOUNDATION = as3.cast(geo.on, BFOUNDATION);
                let mid: number = b._middle ? b._middle : b._mc.height * 0.5;
                depth = Math.max(MAP.DEPTH_SHADOW + 1, (b._mc.y - off.y + mid) * 1000 + (b._mc.x - off.x));
                // (between its fortification's back, depth - 1, and the building, depth + 1; in front of all its parts)
                this._rasterData.depth = depth - 0.5;
                this.m_frontData.depth = depth + 20;
            }
        }
        this.m_frontData.visible = !!geo && this.m_frontUsed;
        let wall: any = this.m_overWall;
        if (wall && this.m_overUsed) {
            this.m_overData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (wall.dy - off.y) * 1000 + (wall.dx - off.x)) + 20;
            this.m_overData.visible = true;
        } else {
            this.m_overData.visible = false;
        }
    }

    public override clear(): void {
        for (let d of [this.m_frontData, this.m_overData]) {
            if (d) {
                d.clear();
            }
        }
        this.m_frontData = this.m_overData = null;
        for (let b of [this.m_front, this.m_over]) {
            if (b) {
                b.dispose();
            }
        }
        this.m_front = this.m_over = null;
        if (this.m_ready) {
            this.m_ready = false;
            Basilisk.s_alive = Math.max(0, Basilisk.s_alive - 1);
            if (!Basilisk.s_alive) {
                Basilisk.s_ordered = null;
                Basilisk.light(null);
            }
        }
        super.clear();
    }
}
