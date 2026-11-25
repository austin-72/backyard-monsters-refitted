import { setTimeout } from "flash/utils";
import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix, Rectangle } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { SharedObject } from "flash/net";
import { GRID, POPUPS, ArcadeArt, ATTACK, BASE, BFOUNDATION, CasinoUI, CellData, CREATURELOCKER, CREATURES, EnumYardType, GLOBAL, ImageCache, InstanceManager, IoKit, IoOutpostsPopup, IoTrophies, IoToast, KEYS, LOGIN, MapRoomCell, PLEASEWAIT, POPUPSETTINGS, SecNum, SOUNDS, URLLoaderApi, IoFormat } from "@game";

/**
 * Inferno-only: Moloch's Gauntlet, the monthly event (server: services/events/gauntlet.ts).
 *
 * A ladder of Moloch yards fought from the main yard, not the map: its button sits with the top bar's
 * icons on the main yard (UI_TOP.ioGauntletButton). While it is closed the button says only when it
 * starts. The window ("The Descent") shows the 13 gates winding down into the fire, Moloch beside them,
 * and the gate chosen (the one to fight, at first) with its prize and the attempts left, before the
 * player attacks. Admin test mode plays a test ladder of its own, always open. The attack
 * is an ordinary Map Room 2 attack (wmattack) on the player's own copy of the yard, with the monsters
 * housed in the main yard and its flinger: the server sends the main yard as the map describes it
 * (`home`), and the game uses it the way an attack from the map uses a yard in range.
 *
 * During the attack a bar shows how much of the yard is destroyed and the line to reach. The attack's end
 * sends the player home, where the window opens again with what the attack did (the server's `last`).
 *
 * (15 October) QoL #345: the gate's panel says what the attack would take (the monsters housed in the main yard, from
 * the server's `home`, and its Flinger's level), and its Layout button shows the gate's yard in Moloch's place
 * (worldmapv2/gauntletlayout: buildings by kind, damaged and destroyed ones marked, traps hidden). The attack is still
 * made from the main yard only: the game has no way to send another yard's monsters to a Gauntlet gate.
 */
export class IoGauntlet extends ASObject {
    static {
        as3.fields(this, { _mc: null, _status: null, _gates: null, _selected: 0, _detail: null, _embers: null, _emberLayer: null, _moloch: null, _tick: 0, _ioPreview: null, _ioLayoutOn: false });
    }

    private static _open: IoGauntlet = null;

    /** The stage being attacked (0: not in a Gauntlet attack). */
    public static attackStage: int = 0;

    private static _winPercent: int = 90;

    /** Open the window once the main yard has loaded again (after a Gauntlet attack). */
    private static _showOnHome: boolean = false;

    /** The server's last result already shown (its time). */
    private static _shownResult: number = 0;

    private static _bar: Sprite = null;

    // ---- the window: "The Descent" (13 gates winding down into the fire, Moloch beside them)
    private static readonly W: int = 740;

    private static readonly H: int = 530;

    /**
     * The gates' names, I to XIII ("The Ashen Gate" ... "Moloch's Throne"): their keys (QoL #235: in the player's
     * language, read when shown).
     */
    private static readonly GATE_NAMES: any[] = ["io_t3t_gnt_gate_1", "io_t3t_gnt_gate_2", "io_t3t_gnt_gate_3", "io_t3t_gnt_gate_4", "io_t3t_gnt_gate_5", "io_t3t_gnt_gate_6", "io_t3t_gnt_gate_7", "io_t3t_gnt_gate_8", "io_t3t_gnt_gate_9", "io_t3t_gnt_gate_10", "io_t3t_gnt_gate_11", "io_t3t_gnt_gate_12", "io_t3t_gnt_gate_13"];

    /** The legend (QoL #235: in the player's language, read when shown: the language file isn't loaded when the class is). */
    private static get LORE(): string {
        return KEYS.Get("io_t3t_gnt_lore1") + "\n\n" + KEYS.Get("io_t3t_gnt_lore2");
    }

    /** Where the gates sit: three to a row, winding down (left to right, then back). */
    private static readonly GATE_X: any[] = [-290, -185, -80];

    private static readonly GATE_TOP: int = -14;

    private static readonly GATE_ROW: int = 56;

    private static readonly GATE_R: int = 21;

    // ---- the bar during the attack
    private static _barFill: Shape = null;

    private static _barText: TextField = null;

    private static _ticks: int = 0;

    private static readonly BAR_W: int = 340;

    private static readonly BAR_H: int = 18;
    private _mc: MovieClip;
    private _status: any;
    private _gates: any[];
    private _selected: int;
    private _detail: Sprite;
    private _embers: any[];
    private _emberLayer: Sprite;
    private _moloch: Sprite;
    private _tick: int;
    /** (QoL #345) the gate's layout, in Moloch's place while shown. */
    private _ioPreview: Sprite;
    private _ioLayoutOn: boolean;

    /** (QoL #345) each gate's layout as the server last sent it (stage: buildings), while the window is open. */
    private static _ioLayouts: any = {};

    /** (QoL #345) the panel's height (it was 184; room for the army's line) and where it starts. */
    private static readonly IO_PH: int = 214;

    private static readonly IO_PANEL_Y: int = 46;

    public $ctor(status?: any): void {
        let moloch: Sprite = null;
        this._gates = [];
        this._embers = [];
        super.$ctor();
        this._status = status;
        IoGauntlet._winPercent = status.winPercent | 0 || 90;
        // (QoL #602: whether the Purist Trophy can still be won this month: no catapult fired, not won yet)
        IoGauntlet.puristOpen = !(status.trophies && Number(status.trophies.gauntlet_nocat) > 0) && !status.catapult;
        let stages: any[] = as3.as(status.stages, Array) || [];
        let left: int = (-((IoGauntlet.W * 0.5) | 0)) | 0;
        let top: int = (-((IoGauntlet.H * 0.5) | 0)) | 0;
        let result: string = this.resultText();

        this._mc = new MovieClip();
        this._mc.name = "ioGauntletWindow";
        this.drawBackground(left, top);

        // embers drifting up over everything but the text
        this._emberLayer = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._emberLayer.mouseEnabled = false;
        this._emberLayer.mouseChildren = false;
        let emberMask: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        emberMask.graphics.beginFill(16711680, 1);
        emberMask.graphics.drawRoundRect(left + 6, top + 6, IoGauntlet.W - 12, IoGauntlet.H - 12, 20, 20);
        emberMask.graphics.endFill();
        this._emberLayer.mask = emberMask;
        for (let e: int = 0; e < 34; e++) {
            this._embers.push(this.newEmber(true));
        }

        // Moloch, looming on the right
        this._moloch = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._moloch.x = 210;
        // (QoL #345: a little smaller and higher, clear of the gate's panel, now taller)
        this._moloch.y = GLOBAL.INFERNO_ONLY ? -72 : -60;
        this._moloch.mouseEnabled = false;
        moloch = this._moloch;
        ImageCache.GetImageWithCallBack("popups/tribe_moloch.png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            let picture: Bitmap = new Bitmap(bmd);
            picture.smoothing = true;
            picture.height = GLOBAL.INFERNO_ONLY ? 230 : 250;
            picture.scaleX = picture.scaleY;
            picture.x = -((picture.width * 0.5) | 0);
            picture.y = -((picture.height * 0.5) | 0);
            moloch.addChild(picture);
        });

        // the title, and how long the gates stay open
        let title: TextField = as3.as(this._mc.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_title"), 28, 16766346, false, IoGauntlet.W, TextFormatAlign.CENTER, "Groboldov")), TextField);
        title.embedFonts = true;
        title.height = 40;
        title.filters = [new GlowFilter(0xFF4A00, 0.9, 12, 12, 2, 2), new DropShadowFilter(3, 45, 0, 0.8, 4, 4, 1, 2)];
        title.x = left;
        title.y = top + 16;
        let when: TextField = as3.as(this._mc.addChild(IoGauntlet.label(this.whenText(), 12, 15771752, false, IoGauntlet.W, TextFormatAlign.CENTER)), TextField);
        // (QoL #570: it counts down while the window is open, by the second in the last hour)
        when.name = "ioGauntletWhen";
        when.filters = [new GlowFilter(0, 1, 2, 2, 4, 1)];
        when.x = left;
        when.y = top + 54;
        let y: int = (top + 78) | 0;

        // what the last attack did (once)
        if (result) {
            let banner: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
            let won: boolean = Boolean(this._status.last && this._status.last.result == "won");
            banner.name = "ioGauntletResult";
            banner.x = left + 30;
            banner.y = y;
            let bannerText: TextField = as3.as(banner.addChild(IoGauntlet.label("", 12, (won ? 0xFFE08A : 0xF0B090) >>> 0, false, (IoGauntlet.W - 76) | 0, TextFormatAlign.CENTER)), TextField);
            // (QoL #88: the numbers can take two lines)
            bannerText.multiline = true;
            bannerText.wordWrap = true;
            bannerText.htmlText = result;
            bannerText.height = Math.max(18, bannerText.textHeight + 4);
            bannerText.x = 8;
            bannerText.y = 5;
            let bannerH: int = Math.max(28, (bannerText.height + 10) | 0) | 0;
            banner.graphics.lineStyle(1, (won ? 0xE2B227 : 0x8A2A1A) >>> 0, 1);
            banner.graphics.beginFill((won ? 0x3A2206 : 0x2A0806) >>> 0, 0.92);
            banner.graphics.drawRoundRect(0, 0, IoGauntlet.W - 60, bannerH, 10, 10);
            banner.graphics.endFill();
            y = (y + bannerH + 6) | 0;
            IoGauntlet._shownResult = Number(this._status.last.at);
        }

        // the legend
        // (QoL #604, 15 October: a point smaller and one paragraph break, so the lines under it clear the gates)
        let lore: TextField = as3.as(this._mc.addChild(IoGauntlet.label("", GLOBAL.INFERNO_ONLY ? 11 : 12, 15258288, false, 400, TextFormatAlign.LEFT, "Georgia", true)), TextField);
        lore.name = "ioGauntletLore";
        lore.multiline = true;
        lore.wordWrap = true;
        lore.text = GLOBAL.INFERNO_ONLY ? IoGauntlet.LORE.replace("\n\n", "\n") : IoGauntlet.LORE;
        lore.height = 118;
        lore.x = left + 30;
        lore.y = y + 2;
        let numbers: TextField = as3.as(this._mc.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_numbers1", { "v1": IoGauntlet._winPercent, "v2": status.attempts | 0 }) + "\n" + KEYS.Get("io_t3t_gnt_numbers2", { "v1": IoGauntlet.ioNextFirst() }), 10, 12618330, false, 400, TextFormatAlign.LEFT)), TextField);
        numbers.name = "ioGauntletNumbers";
        // (two lines: the second says when the gates rise again, in the player's own time: QoL #566)
        numbers.multiline = true;
        numbers.wordWrap = true;
        numbers.height = 32;
        numbers.x = lore.x;
        numbers.y = lore.y + lore.textHeight + (GLOBAL.INFERNO_ONLY ? 6 : 10);
        // the trophies (10 October): for beating it, and for beating it without a catapult
        // (QoL #604: with a result's banner at the top there's room for one line under the numbers: this moon's Shiny
        // then, the trophies' line the other times)
        let ioTrophyLine: boolean = !(GLOBAL.INFERNO_ONLY && result && stages.length);
        if (GLOBAL.INFERNO_ONLY && status.trophies) {
            if (GLOBAL._flags) {
                GLOBAL._flags.io_trophies = JSON.stringify(status.trophies);
                IoTrophies.Sync();
            }
            let tw: boolean = Number(status.trophies.gauntlet) > 0;
            let tn: boolean = Number(status.trophies.gauntlet_nocat) > 0;
            let trophies: TextField = as3.as(this._mc.addChild(IoGauntlet.label("", 10, 12618330, false, 400, TextFormatAlign.LEFT)), TextField);
            trophies.visible = ioTrophyLine;
            trophies.name = "ioGauntletTrophies";
            trophies.htmlText = KEYS.Get("io_t3t_gnt_trophies", { "v1": tw ? "<font color=\"#E2B227\">" + KEYS.Get("io_t3t_gnt_won") + "</font>" : KEYS.Get("io_t3t_gnt_tro_all"), "v2": tn ? "<font color=\"#E2B227\">" + KEYS.Get("io_t3t_gnt_won") + "</font>" : status.catapult ? "<font color=\"#E0705A\">" + KEYS.Get("io_t3t_gnt_tro_fired") + "</font>" : KEYS.Get("io_t3t_gnt_tro_nocat") });
            trophies.x = lore.x;
            trophies.y = numbers.y + 27;
        }
        // (QoL #604: this moon's Shiny: claimed, still to win, lost)
        if (GLOBAL.INFERNO_ONLY && stages.length) {
            let money: any[] = IoGauntlet.ioMoonShiny(stages);
            let moon: TextField = as3.as(this._mc.addChild(IoGauntlet.label("", 10, 12618330, false, 400, TextFormatAlign.LEFT)), TextField);
            moon.name = "ioGauntletMoon";
            moon.htmlText = KEYS.Get("io_t3t_gnt_moon") + " <font color=\"#E2B227\">" + KEYS.Get("io_t3t_gnt_claimed", { "v1": money[0] }) + "</font>  ·  " + KEYS.Get("io_t3t_gnt_to_win", { "v1": money[1] }) + (money[2] > 0 ? "  ·  <font color=\"#E0705A\">" + KEYS.Get("io_t3t_gnt_lost", { "v1": money[2] }) + "</font>" : "");
            moon.x = lore.x;
            moon.y = numbers.y + (status.trophies && ioTrophyLine ? 41 : 27);
        }

        // the gates, winding down into the fire
        this.drawPath(stages);
        for (let i: int = 0; i < stages.length; i++) {
            let gate: Sprite = this.gateSprite(stages[i], i);
            this._gates.push(gate);
            this._mc.addChild(gate);
        }

        // the chosen gate: the one to fight (or the last)
        this._detail = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._detail.x = 72;
        this._detail.y = GLOBAL.INFERNO_ONLY ? IoGauntlet.IO_PANEL_Y : 72;
        // (QoL #345: the gate's layout, where Moloch stands, shown by the panel's Layout button)
        if (GLOBAL.INFERNO_ONLY) {
            IoGauntlet._ioLayouts = {};
            this._ioPreview = as3.as(this._mc.addChild(new Sprite()), Sprite);
            this._ioPreview.name = "ioGnt3Layout";
            this._ioPreview.x = 96;
            this._ioPreview.y = -128;
            this._ioPreview.visible = false;
        }
        this.select((Math.min(status.current | 0, stages.length) - 1) | 0);

        // close
        // (the kit's close button, 11 October)
        let x: Sprite = as3.as(this._mc.addChild(IoKit.closeButton("ioGauntletClose", 14, (e: any): void => {})), Sprite);
        x.x = -left - 24;
        x.y = top + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    // ---- the button's state (flag io_gauntlet)
    /** {open, closesAt, opensAt, stage, stages} or null. */
    public static flag(): any {
        try {
            return GLOBAL._flags && GLOBAL._flags.io_gauntlet ? JSON.parse(String(GLOBAL._flags.io_gauntlet)) : null;
        } catch (e) {
        }
        return null;
    }

    /**
     * Inferno-only (QoL #106): the first visit home while the Gauntlet is open (once per opening, in this browser):
     * it's open, until when in the player's own time, and how many gates are left, with a button to it.
     */
    public static ioNoticeOpen(): void {
        let f: any = IoGauntlet.flag();
        if (!f || !f.open || f.test || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard) {
            return;
        }
        let stages: int = f.stages | 0;
        let done: int = Math.max(0, (f.stage | 0) - 1) | 0;
        if (stages > 0 && done >= stages) {
            return;
        }
        let key: string = "ioGauntletNoticed" + LOGIN._playerID;
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            if (String(so.data[key]) == String(f.closesAt)) {
                return;
            }
            so.data[key] = String(f.closesAt);
            so.flush();
        } catch (e) {
            return;
        }
        let until: Date = new Date(Number(f.closesAt) * 1000);
        let when: string = until.toLocaleDateString(undefined, { "weekday": "long", "day": "numeric", "month": "long" }) + ", " + (until.getHours() < 10 ? "0" : "") + until.getHours() + ":" + (until.getMinutes() < 10 ? "0" : "") + until.getMinutes();
        // (a line over the yard with a button, for 15 seconds: it blocks nothing)
        IoToast.Show(KEYS.Get("io_gauntlet_open_notice", { "v1": when, "v2": Math.max(0, stages - done) }), 15000, KEYS.Get("io_gauntlet_open_go"), (): void => {
            IoGauntlet.Show();
        });
    }

    /**
     * Inferno-only (QoL #603): its last day: "Moloch's Gauntlet closes in 18h: 6 gates still to beat", once per
     * opening, in this browser (with a button to it). Not when every gate is beaten.
     */
    public static ioNoticeClosing(): boolean {
        let f: any = IoGauntlet.flag();
        if (!f || !f.open || f.test || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard) {
            return false;
        }
        let left: number = Number(f.closesAt) - GLOBAL.Timestamp();
        let stages: int = f.stages | 0;
        let done: int = Math.max(0, (f.stage | 0) - 1) | 0;
        if (left <= 0 || left > 86400 || (stages > 0 && done >= stages)) {
            return false;
        }
        let key: string = "ioGauntletClosing" + LOGIN._playerID;
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            if (String(so.data[key]) == String(f.closesAt)) {
                return false;
            }
            so.data[key] = String(f.closesAt);
            // (the opening's own notice isn't needed after this one)
            so.data["ioGauntletNoticed" + LOGIN._playerID] = String(f.closesAt);
            so.flush();
        } catch (e) {
            return false;
        }
        IoToast.Show(KEYS.Get("io_gauntlet_closing", { "v1": GLOBAL.ioDuration(left | 0), "v2": Math.max(0, stages - done) }), 15000, KEYS.Get("io_gauntlet_open_go"), (): void => {
            IoGauntlet.Show();
        });
        return true;
    }

    /** A Gauntlet yard's baseid: 15 digits starting with 9 (server: gauntletBaseId). */
    public static isGauntletBase(baseid: number): boolean {
        return baseid >= 900000000000000 && baseid < 1000000000000000;
    }

    /** This attack's catapult was told to the server. */
    private static _catapultTold: boolean = false;

    /** The Purist Trophy can still be won this month (as the Gauntlet's window last said). */
    public static puristOpen: boolean = false;

    /** The player was asked about the Purist Trophy before a catapult this attack (CATAPULTPOPUP.Fire). */
    public static puristAsked: boolean = false;

    /**
     * Inferno-only (QoL #602, 14 October): one catapult shot in the Gauntlet ends the Purist Trophy for the month,
     * and nothing said so. True when the shot should wait for the player's answer (asked once an attack).
     */
    public static askBeforeCatapult(fire: Function): boolean {
        if (!GLOBAL.INFERNO_ONLY || !IoGauntlet.inAttack() || !IoGauntlet.puristOpen || IoGauntlet.puristAsked) {
            return false;
        }
        GLOBAL.Message(KEYS.Get("io_purist_ask"), KEYS.Get("io_purist_fire"), (): void => {
            IoGauntlet.puristAsked = true;
            fire();
        }, null, KEYS.Get("io_purist_keep"));
        return true;
    }

    /**
     * A catapult was fired (ResourceBombs.BombDrop): in a Gauntlet attack the server is told, once an attack
     * (10 October: the trophy for beating the Gauntlet without catapults goes to those who never fire one).
     */
    public static ReportCatapult(): void {
        if (!GLOBAL.INFERNO_ONLY || !IoGauntlet.inAttack() || IoGauntlet._catapultTold) {
            return;
        }
        IoGauntlet._catapultTold = true;
        IoGauntlet.ioSendCatapult(IoGauntlet.attackStage, 0);
    }

    /**
     * Inferno-only (14 October, QoL #440): the report is sent again (up to 3 times, 2 s apart) when it fails or the
     * server refuses it. A refusal used to count as told, so the no-catapult trophy could be won with a catapult.
     */
    private static ioSendCatapult(stage: int, tries: int): void {
        let again: Function = (): void => {
            if (tries < 3) {
                setTimeout((): void => {
                    IoGauntlet.ioSendCatapult(stage, tries + 1);
                }, 2000);
            } else {
                IoGauntlet._catapultTold = false;
            }
        };
        new URLLoaderApi().load(GLOBAL.serverUrl + "gauntlet/catapult", [["stage", stage]], (r: any): void => {
            if (!r || (r.error && r.error !== 0 && r.error !== "0")) {
                again();
            }
        }, (e: IOErrorEvent): void => {
            again();
        });
    }

    /** In an attack on a Gauntlet yard now. */
    public static inAttack(): boolean {
        return IoGauntlet.attackStage > 0 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK) && IoGauntlet.isGauntletBase(BASE._loadedBaseID);
    }

    // ---- the window
    /** Opens the window (loads the ladder from the server first). */
    public static Show(e: MouseEvent = null): void {
        if (IoGauntlet._open && (!IoGauntlet._open._mc || !IoGauntlet._open._mc.stage)) {
            IoGauntlet._open = null;
        }
        if (IoGauntlet._open) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3t_not_attacked"));
            return;
        }
        if (e) {
            SOUNDS.Play("click1");
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "gauntlet/status", [["v", "1"]], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error) {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_t3t_gnt_load_fail"));
                return;
            }
            if (!response.enabled) {
                GLOBAL.Message(KEYS.Get("io_t3t_gnt_off"));
                return;
            }
            if (BASE.ioAttackRunning() || IoGauntlet._open || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (!response.open && !response.test) {
                // Not running now: when it starts, and nothing else.
                GLOBAL.Message(IoGauntlet.startsText(response, Number(Number(response.now) || GLOBAL.Timestamp())));
                return;
            }
            IoGauntlet._open = new IoGauntlet(response);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_t3t_gnt_load_fail"));
        });
    }

    /** The main yard loaded (BASE): after a Gauntlet attack, the window again with the result. */
    public static AfterHome(): void {
        IoGauntlet.attackStage = 0;
        IoGauntlet.removeBar();
        if (IoGauntlet._showOnHome && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
            IoGauntlet._showOnHome = false;
            POPUPS.ioWhenClear((): void => { IoGauntlet.Show(); }); // (QoL #462: after the popups the yard brought)
        }
    }

    /** Obsidian with a molten rim, cracks of lava, and Moloch's red glow. */
    private drawBackground(left: int, top: int): void {
        let m: Matrix = new Matrix();
        let bg: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m.createGradientBox(IoGauntlet.W, IoGauntlet.H, Math.PI / 2, left, top);
        bg.graphics.lineStyle(4, 656130, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x2C0F09, 0x160605, 0x240804], [1, 1, 1], [0, 150, 255], m);
        bg.graphics.drawRoundRect(left, top, IoGauntlet.W, IoGauntlet.H, 26, 26);
        bg.graphics.endFill();
        // (12 October: its inside is opaque, so a live yard under it is not drawn again under it: DisplayObject.ioOccludes)
        this._mc.ioOccludes(new Rectangle(left + 14, top + 14, IoGauntlet.W - 28, IoGauntlet.H - 28));
        // Moloch's glow
        let glow: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m = new Matrix();
        m.createGradientBox(380, 380, 0, 210 - 190, -70 - 190);
        glow.graphics.beginGradientFill(GradientType.RADIAL, [0xFF3A0A, 0xB01A04, 0x400000], [0.5, 0.22, 0], [0, 120, 255], m);
        glow.graphics.drawCircle(210, -70, 190);
        glow.graphics.endFill();
        // the chasm the gates wind down into
        let chasm: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        m = new Matrix();
        m.createGradientBox(420, 330, Math.PI / 2, left + 22, 0);
        chasm.graphics.beginGradientFill(GradientType.LINEAR, [0x000000, 0x3A0A02], [0.35, 0.55], [0, 255], m);
        chasm.graphics.drawRoundRect(left + 22, -44, 420, 296, 18, 18);
        chasm.graphics.endFill();
        // lava cracks
        let cracks: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        cracks.graphics.lineStyle(2, 16738842, 0.55);
        this.crack(cracks, left + 14, top + IoGauntlet.H - 14, 6, -1);
        this.crack(cracks, -left - 40, top + IoGauntlet.H - 20, 6, -1);
        this.crack(cracks, left + 12, top + 34, 4, 1);
        this.crack(cracks, -left - 14, top + 120, 5, 1);
        cracks.filters = [new GlowFilter(0xFF4A00, 0.8, 8, 8, 2, 2)];
        for (let gk of ["sealed", "burning", "broken"]) {
            ArcadeArt.picture("popups/gauntlet/gate_" + gk + ".png");
        }
        // the painted realm (popups/gauntlet/bg.jpg, art/uikit/events.py; 11 October): the glow, the chasm and the
        // cracks above are drawn until it has loaded
        let art: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        let mask: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(left + 2, top + 2, IoGauntlet.W - 4, IoGauntlet.H - 4, 24, 24);
        mask.graphics.endFill();
        art.mask = mask;
        CasinoUI.picture(art, "popups/gauntlet/bg.jpg", left, top, IoGauntlet.W, IoGauntlet.H, (b: any): void => {
            glow.visible = chasm.visible = cracks.visible = false;
        });
        // the molten rim (the kit's forged one once it has loaded)
        let rim: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        rim.graphics.lineStyle(2, 13784604, 1);
        rim.graphics.drawRoundRect(left + 6, top + 6, IoGauntlet.W - 12, IoGauntlet.H - 12, 20, 20);
        rim.filters = [new GlowFilter(0xFF4A00, 0.75, 10, 10, 2, 2)];
        IoKit.whenLoaded(["frame"], (): void => {
            rim.visible = false;
        });
        IoKit.rim(this._mc, "ioGauntletRim", left, top, IoGauntlet.W, IoGauntlet.H);
    }

    /** A jagged crack from a point, going up (-1) or across (1). */
    private crack(g: Shape, x: number, y: number, steps: int, across: int): void {
        g.graphics.moveTo(x, y);
        for (let s: int = 0; s < steps; s++) {
            x = Number(x + (across > 0 ? (x < 0 ? 10 : -10) + (s % 2 == 0 ? 4 : -3) : (s % 2 == 0 ? 7 : -5)));
            y = Number(y + (across > 0 ? (s % 2 == 0 ? 6 : -4) : -9 - (s % 3) * 2));
            g.graphics.lineTo(x, y);
        }
    }

    private static gatePos(index: int): any[] {
        let row: int = (index / 3) | 0;
        let col: int = (index % 3) | 0;
        if (row % 2 == 1) {
            col = (2 - col) | 0;
        }
        return [IoGauntlet.GATE_X[col], IoGauntlet.GATE_TOP + row * IoGauntlet.GATE_ROW];
    }

    /** The lava path from gate to gate: bright where it has been walked, dim ahead. */
    private drawPath(stages: any[]): void {
        let path: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        let lit: Shape = as3.as(this._mc.addChild(new Shape()), Shape);
        let current: int = this._status.current | 0;
        for (let i: int = 0; i < stages.length - 1; i++) {
            let a: any[] = IoGauntlet.gatePos(i);
            let b: any[] = IoGauntlet.gatePos((i + 1) | 0);
            let walked: boolean = i + 2 <= current;
            for (let layer of as3.values([[path, 9, 0x1A0402, 1], [walked ? lit : path, 3, walked ? 0xFFB040 : 0x6A2410, 1]])) {
                let s: Shape = as3.cast(layer[0], Shape);
                s.graphics.lineStyle(Number(layer[1]), layer[2] >>> 0, Number(layer[3]));
                s.graphics.moveTo(Number(a[0]), Number(a[1]));
                if (a[1] == b[1]) {
                    s.graphics.lineTo(Number(b[0]), Number(b[1]));
                } else {
                    let out: int = a[0] > -185 ? 52 : -52;
                    s.graphics.curveTo(Number(a[0] + out), (a[1] + b[1]) * 0.5, Number(b[0]), Number(b[1]));
                }
            }
        }
        lit.filters = [new GlowFilter(0xFF6A00, 0.9, 8, 8, 2, 2)];
    }

    private static roman(n: int): string {
        let values: any[] = [10, 9, 5, 4, 1];
        let letters: any[] = ["X", "IX", "V", "IV", "I"];
        let out: string = "";
        for (let i: int = 0; i < values.length; i++) {
            while (n >= values[i]) {
                out += letters[i];
                n = (n - values[i]) | 0;
            }
        }
        return out;
    }

    /** One gate: sealed (dark), the one to fight (burning), or broken (cracked; its prize claimed or lost). */
    private gateSprite(stage: any, index: int): Sprite {
        let gate: Sprite = null;
        let self: IoGauntlet = null;
        gate = new Sprite();
        let pos: any[] = IoGauntlet.gatePos(index);
        let n: int = stage.stage | 0;
        let last: boolean = index == (as3.as(this._status.stages, Array)).length - 1;
        let r: int = (last ? IoGauntlet.GATE_R + 6 : IoGauntlet.GATE_R) | 0;
        let current: boolean = n == (this._status.current | 0);
        let m: Matrix = new Matrix();
        gate.name = "ioGate" + n;
        gate.x = Number(pos[0]);
        gate.y = Number(pos[1]);
        gate.buttonMode = true;
        gate.mouseChildren = false;
        let g: Shape = as3.as(gate.addChild(new Shape()), Shape);
        if (last) {
            // the throne: a crown of spikes
            g.graphics.beginFill((current ? 0xFFB040 : (stage.won ? 0x8A6A4A : 0x5A1A0C)) >>> 0, 1);
            for (let k: int = 0; k < 10; k++) {
                let an: number = k * Math.PI / 5;
                g.graphics.moveTo(Math.cos(an - 0.16) * (r - 2), Math.sin(an - 0.16) * (r - 2));
                g.graphics.lineTo(Math.cos(an) * (r + 9), Math.sin(an) * (r + 9));
                g.graphics.lineTo(Math.cos(an + 0.16) * (r - 2), Math.sin(an + 0.16) * (r - 2));
            }
            g.graphics.endFill();
        }
        // the gate's picture (popups/gauntlet/gate_<sealed, burning, broken>.png, art/uikit/events.py; 11 October)
        let kind: string = current && !stage.won ? "burning" : (stage.won ? "broken" : "sealed");
        let gateArt: BitmapData = ArcadeArt.picture("popups/gauntlet/gate_" + kind + ".png");
        if (gateArt) {
            let size: number = 50 * r / 21;
            ArcadeArt.stamp(g.graphics, gateArt, -size / 2, -size / 2, size, size);
            if (kind == "burning") {
                g.filters = [new GlowFilter(0xFF6A00, 0.9, 14, 14, 2, 2)];
            }
        } else if (current && !stage.won) {
            m.createGradientBox(r * 2, r * 2, 0, -r, -r);
            g.graphics.lineStyle(2, 16769184, 1);
            g.graphics.beginGradientFill(GradientType.RADIAL, [0xFFD27A, 0xE0501C, 0x6A1406], [1, 1, 1], [0, 140, 255], m);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            g.filters = [new GlowFilter(0xFF6A00, 0.9, 14, 14, 2, 2)];
        } else if (stage.won) {
            g.graphics.lineStyle(2, 9071178, 1);
            g.graphics.beginFill(2759190, 1);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            // cracked through
            g.graphics.lineStyle(2, (stage.paid ? 0xFFB040 : 0x7A5A5A) >>> 0, 1);
            for (let c of as3.values([[-0.2, 1.0], [2.1, 0.9], [3.9, 1.0]])) {
                g.graphics.moveTo(0, 0);
                g.graphics.lineTo(Math.cos(Number(c[0])) * r * 0.45 + 3, Math.sin(Number(c[0])) * r * 0.45 - 2);
                g.graphics.lineTo(Math.cos(Number(c[0] + 0.3)) * r * c[1], Math.sin(Number(c[0] + 0.3)) * r * c[1]);
            }
        } else {
            g.graphics.lineStyle(2, 4858904, 1);
            g.graphics.beginFill(1707536, 1);
            g.graphics.drawCircle(0, 0, r);
            g.graphics.endFill();
            // a ring of runes, dark until reached
            g.graphics.lineStyle(1, 8010272, 0.8);
            for (let q: int = 0; q < 8; q++) {
                let a0: number = q * Math.PI / 4 + 0.15;
                g.graphics.moveTo(Math.cos(a0) * (r - 5), Math.sin(a0) * (r - 5));
                g.graphics.lineTo(Math.cos(a0 + 0.45) * (r - 5), Math.sin(a0 + 0.45) * (r - 5));
            }
        }
        let numeral: TextField = as3.as(gate.addChild(IoGauntlet.label(IoGauntlet.roman(n), last ? 15 : 13, (current && !stage.won ? 0xFFFFFF : (stage.won ? 0xC8A070 : 0x8A6048)) >>> 0, false, (r * 2 + 10) | 0, TextFormatAlign.CENTER, "Groboldov")), TextField);
        numeral.embedFonts = true;
        numeral.x = -r - 5;
        numeral.y = -((numeral.textHeight * 0.5) | 0) - 3;
        if (current && !stage.won) {
            numeral.filters = [new GlowFilter(0x6A1406, 1, 3, 3, 4, 1)];
        }
        // its prize: claimed (gold) or lost (red)
        if (stage.won || stage.lost) {
            let mark: Shape = as3.as(gate.addChild(new Shape()), Shape);
            let claimed: boolean = Boolean(stage.won && stage.paid);
            mark.graphics.lineStyle(1, 1705988, 1);
            mark.graphics.beginFill((claimed ? 0xE2B227 : 0xB0281A) >>> 0, 1);
            mark.graphics.drawCircle(0, 0, 7);
            mark.graphics.endFill();
            mark.graphics.lineStyle(2, 16777215, 1);
            if (claimed) {
                mark.graphics.moveTo(-3, 0);
                mark.graphics.lineTo(-1, 3);
                mark.graphics.lineTo(3, -3);
            } else {
                mark.graphics.moveTo(-3, -3);
                mark.graphics.lineTo(3, 3);
                mark.graphics.moveTo(3, -3);
                mark.graphics.lineTo(-3, 3);
            }
            mark.x = r * 0.72;
            mark.y = r * 0.72;
        }
        if (last) {
            let prize: TextField = as3.as(gate.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_shiny", { "v1": (stage.reward ? stage.reward.shiny : 0) | 0 }), 11, 16766346, true, 90, TextFormatAlign.LEFT)), TextField);
            prize.x = r + 14;
            prize.y = -9;
            prize.filters = [new GlowFilter(0xFF4A00, 0.8, 6, 6, 2, 1)];
        }
        let ring: Shape = as3.as(gate.addChild(new Shape()), Shape);
        ring.name = "ring";
        ring.graphics.lineStyle(2, 16773312, 0.9);
        ring.graphics.drawCircle(0, 0, r + 5);
        ring.visible = false;
        self = this;
        gate.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            self.select(index);
        });
        gate.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            gate.scaleX = gate.scaleY = 1.08;
        });
        gate.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            gate.scaleX = gate.scaleY = 1;
        });
        return gate;
    }

    /** Shows a gate in the panel under Moloch: its name, level, prize, and what is left of it. */
    private select(index: int): void {
        let stage: any = null;
        let stages: any[] = as3.as(this._status.stages, Array) || [];
        if (index < 0 || index >= stages.length) {
            return;
        }
        this._selected = index;
        for (let i: int = 0; i < this._gates.length; i++) {
            (as3.as(this._gates[i], Sprite)).getChildByName("ring").visible = i == index;
        }
        stage = stages[index];
        let n: int = stage.stage | 0;
        let current: boolean = n == (this._status.current | 0) && !this._status.finished;
        let d: Sprite = this._detail;
        let PW: int = 282;
        let PH: int = GLOBAL.INFERNO_ONLY ? IoGauntlet.IO_PH : 184;
        let m: Matrix = new Matrix();
        while (d.numChildren > 0) {
            d.removeChildAt(0);
        }
        d.graphics.clear();
        m.createGradientBox(PW, PH, Math.PI / 2, 0, 0);
        d.graphics.lineStyle(2, 11552794, 1);
        d.graphics.beginGradientFill(GradientType.LINEAR, [0x2A0C06, 0x120404], [0.95, 0.95], [0, 255], m);
        d.graphics.drawRoundRect(0, 0, PW, PH, 14, 14);
        d.graphics.endFill();
        d.filters = [new GlowFilter(0xFF4A00, 0.45, 10, 10, 2, 2)];

        let name: TextField = as3.as(d.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_gate_title", { "v1": IoGauntlet.roman(n), "v2": KEYS.Get(as3.str(IoGauntlet.GATE_NAMES[Math.min(n, IoGauntlet.GATE_NAMES.length) - 1])) }), 15, 16766346, false, (PW - 16) | 0, TextFormatAlign.LEFT, "Groboldov")), TextField);
        name.embedFonts = true;
        // (QoL #235: a longer name in another language drawn smaller to stay in the panel)
        GLOBAL.ioFitText(name, 10);
        name.name = "ioGateName";
        name.height = 24;
        name.x = 10;
        name.y = 8;
        name.filters = [new GlowFilter(0xFF4A00, 0.7, 6, 6, 2, 1)];
        let level: TextField = as3.as(d.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_level", { "v1": stage.level | 0 }) + ((stage.stage | 0) == stages.length ? "  ·  " + KEYS.Get("io_t3t_gnt_himself") : ""), 11, 12618330, false, (PW - (GLOBAL.INFERNO_ONLY ? 96 : 20)) | 0, TextFormatAlign.LEFT)), TextField);
        level.x = 12;
        level.y = 32;
        // (QoL #345: the gate's layout, in Moloch's place; and what the attack would take)
        if (GLOBAL.INFERNO_ONLY) {
            let layout: Sprite = IoGauntlet.ioSmallButton(KEYS.Get(this._ioLayoutOn ? "io_op3_gnt_layout_hide" : "io_op3_gnt_layout"), 76, 18, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this._ioLayoutOn = !this._ioLayoutOn;
                this.select(this._selected);
            });
            layout.name = "ioGnt3LayoutButton";
            layout.x = PW - 86;
            layout.y = 31;
            d.addChild(layout);
            let army: TextField = as3.as(d.addChild(IoGauntlet.label("", 10, 15258288, false, (PW - 24) | 0, TextFormatAlign.LEFT)), TextField);
            army.name = "ioGnt3Army";
            army.multiline = true;
            army.wordWrap = true;
            army.height = 30;
            army.htmlText = this.ioArmyText();
            army.x = 12;
            army.y = 134;
            this.ioShowLayout(stage);
        }
        let prize: TextField = as3.as(d.addChild(IoGauntlet.label("", 11, 15785152, false, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
        prize.name = "ioGatePrize";
        prize.multiline = true;
        prize.height = 34;
        prize.htmlText = KEYS.Get("io_t3t_gnt_prize", { "v1": IoGauntlet.rewardText(stage.reward) });
        prize.wordWrap = true;
        prize.x = 12;
        prize.y = 50;

        let state: TextField = as3.as(d.addChild(IoGauntlet.label("", 12, 16777215, true, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
        state.name = "ioGateState";
        state.x = 12;
        state.y = 88;
        let left: int = stage.attemptsLeft | 0;
        if (stage.won) {
            state.htmlText = stage.paid ? "<font color=\"#E2B227\">" + KEYS.Get("io_t3t_gnt_broken_yours") + "</font>" : "<font color=\"#C87A6A\">" + KEYS.Get("io_t3t_gnt_broken_lost") + "</font>";
        } else if (!current) {
            state.htmlText = "<font color=\"#8A6A5A\">" + KEYS.Get("io_t3t_gnt_sealed", { "v1": IoGauntlet.roman(this._status.current | 0) }) + "</font>";
        } else {
            // attempts left, as flames
            for (let p: int = 0; p < (this._status.attempts | 0); p++) {
                let pip: Shape = as3.as(d.addChild(new Shape()), Shape);
                pip.graphics.lineStyle(1, 3805188, 1);
                pip.graphics.beginFill((p < left ? 0xFF8A2A : 0x3A2420) >>> 0, 1);
                pip.graphics.drawCircle(0, 0, 6);
                pip.graphics.endFill();
                if (p < left) {
                    pip.filters = [new GlowFilter(0xFF6A00, 0.9, 6, 6, 2, 1)];
                }
                pip.x = 19 + p * 17;
                pip.y = 98;
            }
            state.x = 12 + (this._status.attempts | 0) * 17 + 4;
            let lost: string = stage.lost ? " · <font color=\"#E0705A\">" + KEYS.Get("io_t3t_gnt_s_prize_lost") + "</font>" : (stage.paid ? " · <font color=\"#C8A070\">" + KEYS.Get("io_t3t_gnt_s_prize_claimed") + "</font>" : "");
            state.htmlText = KEYS.Get(left == 1 ? "io_t3t_gnt_left_one" : "io_t3t_gnt_left_n", { "v1": left }) + lost;
            if ((stage.damage | 0) > 0) {
                let bar: Shape = as3.as(d.addChild(new Shape()), Shape);
                bar.graphics.beginFill(2757648, 1);
                bar.graphics.drawRect(0, 0, PW - 24, 6);
                bar.graphics.endFill();
                bar.graphics.beginFill(14700572, 1);
                bar.graphics.drawRect(0, 0, (PW - 24) * Math.min(100, stage.damage | 0) / 100, 6);
                bar.graphics.endFill();
                bar.graphics.lineStyle(1, 16777215, 1);
                bar.graphics.moveTo((PW - 24) * IoGauntlet._winPercent / 100, -2);
                bar.graphics.lineTo((PW - 24) * IoGauntlet._winPercent / 100, 8);
                bar.x = 12;
                bar.y = 112;
                let broken: TextField = as3.as(d.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_dmg", { "v1": stage.damage | 0 }), 10, 12618330, false, (PW - 20) | 0, TextFormatAlign.LEFT)), TextField);
                broken.x = 12;
                broken.y = 118;
            }
        }

        let action: Sprite = null;
        if (current) {
            action = IoGauntlet.moltenButton(KEYS.Get("io_t3t_gnt_enter"), 210, 36, (e: MouseEvent): void => {
                this.confirmAttack(stage);
            }, Boolean(this._status.open));
        } else if (this._status.finished && index == stages.length - 1) {
            let done: TextField = as3.as(d.addChild(IoGauntlet.label(KEYS.Get("io_t3t_gnt_conquered"), 12, 16766346, true, (PW - 20) | 0, TextFormatAlign.CENTER)), TextField);
            done.x = 10;
            done.y = PH - 36;
        }
        if (action) {
            action.name = "ioEnterGate";
            action.x = ((PW - 210) * 0.5) | 0;
            action.y = PH - 46;
            d.addChild(action);
        }
    }

    /** A button of molten gold. */
    private static moltenButton(text: string, width: int, height: int, onClick: Function, enabled: boolean): Sprite {
        let b: Sprite = null;
        let m: Matrix = null;
        let draw: Function = null;
        b = new Sprite();
        m = new Matrix();
        b.buttonMode = enabled;
        b.mouseChildren = false;
        m.createGradientBox(width, height, Math.PI / 2, 0, 0);
        draw = (hot: boolean): void => {
            b.graphics.clear();
            // (the UI kit's molten button, 11 October)
            if (IoKit.slice(b.graphics, enabled ? (hot ? "btn_molten_h" : "btn_molten") : "btn_molten_d", 0, 0, width, height)) {
                return;
            }
            b.graphics.lineStyle(2, (enabled ? 0xFFE0A0 : 0x6A5A50) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, enabled ? (hot ? [0xFFC060, 0xE0501C, 0x9A2008] : [0xF0A040, 0xC8401A, 0x7A1806]) : [0x5A4A44, 0x3A2E2A, 0x2A2220], [1, 1, 1], [0, 140, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
            b.graphics.endFill();
        };
        draw(false);
        IoKit.whenLoaded(["btn_molten", "btn_molten_h", "btn_molten_d"], (): void => {
            draw(false);
        });
        let t: TextField = as3.as(b.addChild(IoGauntlet.label(text, 16, (enabled ? 0xFFFFFF : 0xA09088) >>> 0, false, width, TextFormatAlign.CENTER, "Groboldov")), TextField);
        t.embedFonts = true;
        // (QoL #235: a longer translation drawn smaller to fit the button)
        GLOBAL.ioFitText(t, 10);
        t.height = 26;
        t.y = ((height - 24) / 2) | 0;
        t.filters = [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)];
        if (enabled) {
            b.filters = [new GlowFilter(0xFF6A00, 0.7, 10, 10, 2, 2)];
            b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                draw(true);
            });
            b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                draw(false);
            });
            b.addEventListener(MouseEvent.CLICK, onClick);
        }
        return b;
    }

    private newEmber(anywhere: boolean): any {
        let s: Shape = as3.as(this._emberLayer.addChild(new Shape()), Shape);
        let colors: any[] = [0xFFB040, 0xFF6A1A, 0xFFE08A, 0xFF4A10];
        s.graphics.beginFill(colors[(Math.random() * colors.length) | 0] >>> 0, 1);
        s.graphics.drawCircle(0, 0, 0.8 + Math.random() * 1.8);
        s.graphics.endFill();
        s.x = -IoGauntlet.W * 0.5 + Math.random() * IoGauntlet.W;
        s.y = anywhere ? -IoGauntlet.H * 0.5 + Math.random() * IoGauntlet.H : IoGauntlet.H * 0.5 + Math.random() * 20;
        return { "s": s, "vy": 0.35 + Math.random() * 0.9, "sway": Math.random() * 6.28, "life": 0 };
    }

    /** Embers rise, the gate to fight burns brighter and dimmer, Moloch breathes. */
    private animate(e: Event): void {
        if (!this._mc || !this._mc.stage) {
            return;
        }
        this._tick++;
        if (this._tick % 12 == 0) {
            let when: TextField = as3.as(this._mc.getChildByName("ioGauntletWhen"), TextField);
            if (when) {
                let t: string = this.whenText();
                if (when.text != t) {
                    when.text = t;
                }
            }
        }
        for (let ember of as3.values(this._embers)) {
            let s: Shape = as3.cast(ember.s, Shape);
            ember.sway += 0.05;
            s.y -= ember.vy;
            s.x += Math.sin(Number(ember.sway)) * 0.35;
            s.alpha = Math.max(0, Math.min(1, (s.y + IoGauntlet.H * 0.5) / (IoGauntlet.H * 0.5)));
            if (s.y < -IoGauntlet.H * 0.5 - 4) {
                s.x = -IoGauntlet.W * 0.5 + Math.random() * IoGauntlet.W;
                s.y = IoGauntlet.H * 0.5 + Math.random() * 20;
            }
        }
        let pulse: number = 0.5 + 0.5 * Math.sin(this._tick * 0.11);
        let current: int = ((this._status.current | 0) - 1) | 0;
        if (current >= 0 && current < this._gates.length && !this._status.finished) {
            let burning: Shape = as3.as((as3.as(this._gates[current], Sprite)).getChildAt(0), Shape);
            burning.filters = [new GlowFilter(0xFF6A00, 0.6 + 0.4 * pulse, 10 + 10 * pulse, 10 + 10 * pulse, 2, 2)];
        }
        if (this._moloch && this._tick % 2 == 0) {
            this._moloch.scaleX = this._moloch.scaleY = 1 + 0.015 * Math.sin(this._tick * 0.05);
            this._moloch.filters = [new GlowFilter(0xFF2A00, 0.35 + 0.25 * pulse, 16, 16, 2, 2)];
        }
    }

    /** "The gates close in 5d 3h" (or when they open). */
    private whenText(): string {
        let s: any = this._status;
        // (QoL #570: the time now, not when the window was opened; the server's clock, by how long ago it answered)
        let now: number = GLOBAL.Timestamp();
        if (s.test) {
            return "Admin test ladder · always open · nothing is paid";
        }
        if (s.finished) {
            return KEYS.Get("io_t3t_gnt_conquered") + (s.open && s.closesAt ? " " + KEYS.Get("io_t3t_gnt_close_in_dot", { "v1": IoOutpostsPopup.duration((s.closesAt - now) | 0) }) : "");
        }
        if (s.open) {
            return s.closesAt ? KEYS.Get("io_t3t_gnt_close_in", { "v1": IoGauntlet.ioLeft((s.closesAt - now) | 0) }) : KEYS.Get("io_t3t_gnt_open");
        }
        return IoGauntlet.startsText(s, now);
    }

    /** QoL #570: "5d 3h", "4h 12m", and in the last hour "12m 05s". */
    public static ioLeft(sec: int): string {
        if (sec >= 3600) {
            return IoOutpostsPopup.duration(sec);
        }
        sec = Math.max(0, sec) | 0;
        let m: int = (sec / 60) | 0;
        let r: int = sec % 60;
        return m + "m " + (r < 10 ? "0" : "") + r + "s";
    }

    /** "Moloch's Gauntlet starts in 4d 2h." */
    private static startsText(s: any, now: number): string {
        return KEYS.Get("io_t3t_gnt_starts", { "v1": s && s.opensAt ? IoGauntlet.ioLeft(Math.max(1, (s.opensAt - now) | 0) | 0) : KEYS.Get("io_t3t_gnt_few_days") });
    }

    /** What the last attack did, if it hasn't been shown yet: the exact %, the attempts left and the prize (QoL #88). */
    private resultText(): string {
        let last: any = this._status.last;
        if (!last || Number(last.at) <= IoGauntlet._shownResult) {
            return "";
        }
        // (QoL #235: in the player's language: each headline with and without the %, "_at")
        let gate: string = IoGauntlet.roman(last.stage | 0);
        let at: boolean = last.damage !== undefined && last.damage !== null;
        let head: Function = (key: string, more: any = null): string => {
            let v: any = { "v1": gate, "v2": last.damage | 0 };
            if (more != null) {
                v = { "v1": gate, "v2": more, "v3": last.damage | 0 };
            }
            return "<b>" + KEYS.Get(key + (at ? "_at" : ""), v) + "</b>";
        };
        if (last.result == "won") {
            if (last.reward) {
                // (the admin test ladder's words stay English: only admins see it)
                return head("io_t3t_gnt_h_falls_x") + " " + (last.test ? "Test ladder: it would pay " + IoGauntlet.rewardText(last.reward) + "." : KEYS.Get("io_t3t_gnt_r_claim", { "v1": IoGauntlet.rewardText(last.reward) }));
            }
            if (last.already) {
                return head("io_t3t_gnt_h_falls_d") + " " + KEYS.Get("io_t3t_gnt_r_already");
            }
            return head("io_t3t_gnt_h_falls_c") + " " + KEYS.Get("io_t3t_gnt_r_lost");
        }
        if (last.result == "healed") {
            return head("io_t3t_gnt_h_held", IoGauntlet._winPercent) + " " + KEYS.Get("io_t3t_gnt_r_mended");
        }
        let left: int = last.attemptsLeft | 0;
        let prize: string = "";
        for (let st of as3.values(as3.as(this._status.stages, Array) || [])) {
            if ((st.stage | 0) == (last.stage | 0) && st.reward && !last.lost && !st.paid) {
                prize = " " + KEYS.Get("io_t3t_gnt_r_prize", { "v1": IoGauntlet.rewardText(st.reward) });
            }
        }
        return head("io_t3t_gnt_h_holds") + " " + KEYS.Get("io_t3t_gnt_r_breaks", { "v1": IoGauntlet._winPercent }) + " " + KEYS.Get("io_t3t_gnt_r_left_" + (left == 1 ? "one" : "n") + (last.lost ? "" : "_b"), { "v1": left }) + prize;
    }

    /** QoL #604: [claimed, still to win, lost] Shiny of this moon's gates (a lost gate's prize can't be won again). */
    public static ioMoonShiny(stages: any[]): any[] {
        let claimed: int = 0;
        let open: int = 0;
        let lost: int = 0;
        for (let st of as3.values(stages || [])) {
            let shiny: int = st && st.reward ? st.reward.shiny | 0 : 0;
            if (st.paid) {
                claimed = (claimed + shiny) | 0;
            } else if (st.lost) {
                lost = (lost + shiny) | 0;
            } else {
                open = (open + shiny) | 0;
            }
        }
        return [claimed, open, lost];
    }

    /** "5 shiny, 2.3M bone, coal and sulfur, 1.2M magma". */
    private static rewardText(reward: any): string {
        if (!reward) {
            return "";
        }
        let same: boolean = reward.r1 == reward.r2 && reward.r2 == reward.r3;
        // (QoL #235: in the player's language)
        if (same) {
            return KEYS.Get("io_t3t_gnt_rw_same", { "v1": reward.shiny | 0, "v2": IoGauntlet.short(Number(reward.r1)), "v3": IoGauntlet.short(Number(reward.r4)) });
        }
        return KEYS.Get("io_t3t_gnt_rw", { "v1": reward.shiny | 0, "v2": IoGauntlet.short(Number(reward.r1)), "v3": IoGauntlet.short(Number(reward.r2)), "v4": IoGauntlet.short(Number(reward.r3)), "v5": IoGauntlet.short(Number(reward.r4)) });
    }

    /** 2300000: "2.3M". */
    private static short(amount: number): string {
        if (amount >= 1000000) {
            return String(Math.round(amount / 100000) / 10) + "M";
        }
        if (amount >= 1000) {
            return String(Math.round(amount / 100) / 10) + "k";
        }
        return String(amount | 0);
    }

    // ---- (QoL #345) the army and the gate's layout
    /** "Your army: 40 Pokey, 12 Bolt, 8 Brain +3 more · Flinger 6": the monsters housed in the main yard (`home`). */
    private ioArmyText(): string {
        let home: any = this._status ? this._status.home : null;
        if (GLOBAL.ioTestMode()) {
            return KEYS.Get("io_op3_gnt_army_test");
        }
        if (!home) {
            return "<font color=\"#E0705A\">" + KEYS.Get("io_op3_gnt_army_nohome") + "</font>";
        }
        let housed: any = home.m && home.m.housed ? home.m.housed : {};
        let kinds: any[] = [];
        let space: int = 0;
        for (let id in housed) {
            let n: int = Number(housed[id]) | 0;
            if (n <= 0) {
                continue;
            }
            kinds.push([id, n]);
            let size: number = 1;
            try {
                size = Number(CREATURES.GetProperty(id, "cStorage", 0, true)) || 1;
            } catch (err) {
            }
            space = (space + n * size) | 0;
        }
        if (kinds.length == 0) {
            return "<font color=\"#E0705A\">" + KEYS.Get("io_op3_gnt_army_none") + "</font>";
        }
        kinds.sort((a: any[], b: any[]): number => (b[1] | 0) - (a[1] | 0));
        let parts: any[] = [];
        for (let i: int = 0; i < kinds.length && i < 4; i++) {
            let id: string = as3.str(kinds[i][0]);
            let creature: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[id] : null;
            parts.push(GLOBAL.FormatNumber(kinds[i][1] | 0) + " " + (creature && creature.name ? KEYS.Get(as3.str(creature.name)) : id));
        }
        let more: string = kinds.length > 4 ? " " + KEYS.Get("io_op3_gnt_army_more", { "v1": kinds.length - 4 }) : "";
        let flinger: int = Number(home.f) | 0;
        return KEYS.Get("io_op3_gnt_army", { "v1": parts.join(", ") + more, "v2": GLOBAL.FormatNumber(space) }) + (flinger > 0 ? "  ·  " + KEYS.Get("io_op3_gnt_army_flinger", { "v1": flinger }) : "");
    }

    /** The layout shown (asked for once a window), or Moloch when it is hidden. */
    private ioShowLayout(stage: any): void {
        let n: int = stage.stage | 0;
        if (!this._ioPreview) {
            return;
        }
        this._ioPreview.visible = this._ioLayoutOn;
        this._moloch.visible = !this._ioLayoutOn;
        if (!this._ioLayoutOn) {
            return;
        }
        let known: any = IoGauntlet._ioLayouts[String(n)];
        this.ioDrawLayout(n, known === undefined ? null : known);
        if (known !== undefined) {
            return;
        }
        IoGauntlet._ioLayouts[String(n)] = null;
        new URLLoaderApi().load(GLOBAL._mapURL + "gauntletlayout", [["stage", n]], (r: any): void => {
            let list: any[] = r && !r.error ? as3.as(r.buildings, Array) : null;
            if (list) {
                IoGauntlet._ioLayouts[String(n)] = list;
            } else {
                delete IoGauntlet._ioLayouts[String(n)];
            }
            if (this._mc && this._ioLayoutOn && this._selected >= 0 && this._status && this._status.stages && this._status.stages[this._selected] && (this._status.stages[this._selected].stage | 0) == n) {
                this.ioDrawLayout(n, list ? list : []);
            }
        }, (e: IOErrorEvent): void => {
            delete IoGauntlet._ioLayouts[String(n)];
            if (this._mc && this._ioLayoutOn) {
                this.ioDrawLayout(n, []);
            }
        });
    }

    /**
     * The gate's yard from above, as the game lays it out (GRID.ToISO), fitted in the box: walls grey, towers red,
     * harvesters gold, the rest brown, the hall larger; damaged ones dimmed, destroyed ones as a cross. null: loading.
     */
    private ioDrawLayout(stageNo: int, list: any[]): void {
        let BW: int = 232;
        let BH: int = 170;
        let p: Sprite = this._ioPreview;
        while (p.numChildren > 0) {
            p.removeChildAt(0);
        }
        let g: any = p.graphics;
        g.clear();
        g.lineStyle(2, 11552794, 1);
        g.beginFill(0x120404, 0.92);
        g.drawRoundRect(0, 0, BW, BH, 14, 14);
        g.endFill();
        g.lineStyle();
        let title: TextField = as3.as(p.addChild(IoGauntlet.label(KEYS.Get("io_op3_gnt_layout_title", { "v1": IoGauntlet.roman(stageNo) }), 11, 16766346, true, (BW - 16) | 0, TextFormatAlign.CENTER)), TextField);
        title.x = 8;
        title.y = 4;
        if (list == null || list.length == 0) {
            let wait: TextField = as3.as(p.addChild(IoGauntlet.label(KEYS.Get(list == null ? "io_op3_gnt_layout_loading" : "io_op3_gnt_layout_none"), 10, 12618330, false, (BW - 16) | 0, TextFormatAlign.CENTER)), TextField);
            wait.x = 8;
            wait.y = (BH * 0.5 - 8) | 0;
            return;
        }
        let points: any[] = [];
        let minX: number = Number.MAX_VALUE;
        let maxX: number = -Number.MAX_VALUE;
        let minY: number = Number.MAX_VALUE;
        let maxY: number = -Number.MAX_VALUE;
        for (let b of as3.values(list)) {
            if (!b) {
                continue;
            }
            let at: any = GRID.ToISO(Number(b[1]), Number(b[2]), 0);
            points.push([b[0] | 0, at.x, at.y, b[4] | 0]);
            minX = Math.min(minX, at.x);
            maxX = Math.max(maxX, at.x);
            minY = Math.min(minY, at.y);
            maxY = Math.max(maxY, at.y);
        }
        let areaW: number = BW - 20;
        let areaH: number = BH - 44;
        let scale: number = Math.min(areaW / Math.max(1, maxX - minX), areaH / Math.max(1, maxY - minY));
        let ox: number = 10 + (areaW - (maxX - minX) * scale) * 0.5;
        let oy: number = 24 + (areaH - (maxY - minY) * scale) * 0.5;
        let dots: Shape = as3.as(p.addChild(new Shape()), Shape);
        let towers: any = { "20": 1, "21": 1, "22": 1, "23": 1, "25": 1, "115": 1, "118": 1, "128": 1, "129": 1, "130": 1, "132": 1, "144": 1, "145": 1 };
        // (walls first, under the rest)
        for (let pass: int = 0; pass < 2; pass++) {
            for (let q of as3.values(points)) {
                let t: int = q[0] | 0;
                let wall: boolean = t == 17 || t == 18;
                if ((pass == 0) != wall) {
                    continue;
                }
                let x: number = ox + (q[1] - minX) * scale;
                let y: number = oy + (q[2] - minY) * scale;
                let colour: uint = (wall ? 0x8A7A70 : (towers[String(t)] ? 0xE0482A : (t >= 1 && t <= 4 ? 0xE2B227 : (t == 112 || t == 14 ? 0xFF8A2A : 0xA0704A)))) >>> 0;
                let r: number = wall ? 1.4 : (t == 112 || t == 14 ? 4.5 : (towers[String(t)] ? 3 : 2.4));
                if ((q[3] | 0) == 2) {
                    dots.graphics.lineStyle(1, 0x6A4A40, 1);
                    dots.graphics.moveTo(x - r, y - r);
                    dots.graphics.lineTo(x + r, y + r);
                    dots.graphics.moveTo(x + r, y - r);
                    dots.graphics.lineTo(x - r, y + r);
                    dots.graphics.lineStyle();
                    continue;
                }
                dots.graphics.beginFill(colour, (q[3] | 0) == 1 ? 0.5 : 1);
                dots.graphics.drawCircle(x, y, r);
                dots.graphics.endFill();
            }
        }
        let legend: TextField = as3.as(p.addChild(IoGauntlet.label("", 9, 12618330, false, (BW - 16) | 0, TextFormatAlign.CENTER)), TextField);
        legend.htmlText = KEYS.Get("io_op3_gnt_layout_legend");
        legend.x = 8;
        legend.y = BH - 19;
    }

    /** A small dark button with a gold rim (the panel's Layout). */
    private static ioSmallButton(text: string, width: int, height: int, onClick: Function): Sprite {
        let b: Sprite = new Sprite();
        let draw: Function = (hot: boolean): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, (hot ? 0xFFE0A0 : 0xC89A50) >>> 0, 1);
            b.graphics.beginFill((hot ? 0x5A2410 : 0x3A1408) >>> 0, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
        };
        draw(false);
        b.buttonMode = true;
        b.mouseChildren = false;
        let t: TextField = as3.as(b.addChild(IoGauntlet.label(text, 10, 16766346, true, width, TextFormatAlign.CENTER)), TextField);
        t.y = ((height - 16) / 2) | 0;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, onClick);
        return b;
    }

    /** Before attacking: the last attempt with a prize still on says what failing it means. */
    private confirmAttack(stage: any): void {
        if (!this._status.open) {
            GLOBAL.Message(IoGauntlet.startsText(this._status, Number(Number(this._status.now) || GLOBAL.Timestamp())));
            return;
        }
        let left: int = stage.attemptsLeft | 0;
        if (left == 1 && !stage.lost && !stage.paid) {
            GLOBAL.Message(KEYS.Get("io_t3t_gnt_last_ask", { "v1": IoGauntlet.roman(stage.stage | 0), "v2": IoGauntlet.rewardText(stage.reward) }), KEYS.Get("io_t3t_gnt_attack"), (): void => {
                this.attack(stage);
            });
            return;
        }
        this.attack(stage);
    }

    /**
     * Attacks the stage's yard from the main yard: the main yard as a map cell (the server's `home`) is the
     * one yard in range, so its housed monsters and its flinger are what the attack has, and what the
     * attack's saves take the used monsters from (BASE.getMR2MonsterUpdateSaveData).
     */
    private attack(stage: any): void {
        let home: any = this._status.home;
        let cell: MapRoomCell = null;
        let monsterType: string = null;
        let any: boolean = false;
        if (!home) {
            GLOBAL.Message(KEYS.Get("io_op3_gnt_army_nohome"));
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3t_not_attacked"));
            return;
        }
        cell = new MapRoomCell();
        cell.X = home.x | 0;
        cell.Y = home.y | 0;
        cell.Setup(home);
        // The yard attacks itself only (range 0); a yard without a flinger still sends its monsters, and
        // the attack's saves still take the used ones off it (they skip a cell with no flinger range).
        if (!cell._flingerRange || cell._flingerRange.Get() < 1) {
            cell._flingerRange = new SecNum(1);
        }
        ATTACK._curCreaturesAvailable = new Array();
        for (monsterType in cell.monsters) {
            let count: int = cell.monsters[monsterType].Get() | 0;
            if (count > 0) {
                ATTACK._curCreaturesAvailable[monsterType] = count;
                any = true;
            }
        }
        for (let g: int = 0; g < GLOBAL._playerGuardianData.length; g++) {
            if (as3.vget(GLOBAL._playerGuardianData, g) && as3.vget(GLOBAL._playerGuardianData, g).hp.Get() > 0) {
                any = true;
            }
        }
        if (GLOBAL.ioTestMode()) {
            ATTACK._curCreaturesAvailable = new Array();
            for (const $value of as3.values(CREATURELOCKER.ioTestMonsterIds())) {
                monsterType = as3.str($value);
                ATTACK._curCreaturesAvailable[monsterType] = 999;
            }
            any = true;
        }
        if (!any) {
            GLOBAL.Message(KEYS.Get("io_t3t_gnt_no_monsters"));
            return;
        }
        GLOBAL._attackerMapResources = { "r1": GLOBAL._resources.r1.Get(), "r2": GLOBAL._resources.r2.Get(), "r3": GLOBAL._resources.r3.Get(), "catapult": new SecNum(Number(GLOBAL._playerCatapultLevel ? GLOBAL._playerCatapultLevel.Get() : 0)), "flinger": new SecNum(Number(cell._flingerLevel ? cell._flingerLevel.Get() : 0)) };
        GLOBAL._attackerCellsInRange = Vector.from([new CellData(cell, 0)], CellData);
        GLOBAL._currentCell = null;
        IoGauntlet.attackStage = stage.stage | 0;
        IoGauntlet._catapultTold = false;
        IoGauntlet.puristAsked = false;
        IoGauntlet._showOnHome = true;
        this.close();
        IoGauntlet.watchBar();
        BASE.LoadBase(null, 0, Number(stage.baseid), "wmattack", false, EnumYardType.MAIN_YARD);
    }

    /** The attack is over (popup_attackend): home, where the window opens with the result. */
    public static ReturnHome(): void {
        IoGauntlet._showOnHome = true;
        IoGauntlet.attackStage = 0;
        IoGauntlet.removeBar();
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /** The attack-end window's words for a Gauntlet attack. */
    public static endTitle(success: boolean): string {
        // (QoL #235: in the player's language)
        return KEYS.Get(success ? "io_t3t_gnt_h_falls_x" : "io_t3t_gnt_h_holds", { "v1": IoGauntlet.roman(IoGauntlet.attackStage) });
    }

    public static endMessage(success: boolean): string {
        return KEYS.Get(success ? "io_t3t_gnt_end_win" : "io_t3t_gnt_end_lose", { "v1": IoGauntlet._winPercent });
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        SOUNDS.Play("close");
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.animate));
        this._embers = [];
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoGauntlet._open == this) {
            IoGauntlet._open = null;
        }
    }

    /** Puts the bar up once the Gauntlet yard is on screen, and keeps it up to date. */
    private static watchBar(): void {
        IoGauntlet.removeBar();
        IoGauntlet._bar = new Sprite();
        IoGauntlet._bar.name = "ioGauntletBar";
        IoGauntlet._bar.mouseEnabled = false;
        IoGauntlet._bar.mouseChildren = false;
        GLOBAL._ROOT.stage.addEventListener(Event.ENTER_FRAME, IoGauntlet.tickBar);
        IoGauntlet._bar.visible = false;
    }

    private static removeBar(): void {
        IoGauntlet._barFill = null;
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(Event.ENTER_FRAME, IoGauntlet.tickBar);
        }
        if (IoGauntlet._bar) {
            if (IoGauntlet._bar.parent) {
                IoGauntlet._bar.parent.removeChild(IoGauntlet._bar);
            }
            IoGauntlet._bar = null;
        }
    }

    private static drawBar(): void {
        let g: Shape = null;
        IoGauntlet._bar.graphics.clear();
        IoGauntlet._bar.graphics.beginFill(1706501, 0.8);
        IoGauntlet._bar.graphics.drawRoundRect(-8, -24, IoGauntlet.BAR_W + 16, IoGauntlet.BAR_H + 32, 12, 12);
        IoGauntlet._bar.graphics.endFill();
        IoGauntlet._bar.graphics.lineStyle(1, 9071173, 1);
        IoGauntlet._bar.graphics.beginFill(3811866, 1);
        IoGauntlet._bar.graphics.drawRect(0, 0, IoGauntlet.BAR_W, IoGauntlet.BAR_H);
        IoGauntlet._bar.graphics.endFill();
        IoGauntlet._barFill = new Shape();
        IoGauntlet._bar.addChild(IoGauntlet._barFill);
        g = new Shape();
        // the line to reach
        g.graphics.lineStyle(2, 16777215, 1);
        g.graphics.moveTo(IoGauntlet.BAR_W * IoGauntlet._winPercent / 100, -3);
        g.graphics.lineTo(IoGauntlet.BAR_W * IoGauntlet._winPercent / 100, IoGauntlet.BAR_H + 3);
        IoGauntlet._bar.addChild(g);
        IoGauntlet._barText = IoGauntlet.label("", 12, 16777215, true, IoGauntlet.BAR_W, TextFormatAlign.CENTER);
        IoGauntlet._barText.y = -21;
        IoGauntlet._barText.filters = [new GlowFilter(0, 1, 2, 2, 6, 1)];
        IoGauntlet._bar.addChild(IoGauntlet._barText);
    }

    private static tickBar(e: Event): void {
        if (!IoGauntlet._bar) {
            return;
        }
        if (IoGauntlet.attackStage <= 0 || !IoGauntlet.isGauntletBase(BASE._loadedBaseID) || GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
            IoGauntlet._bar.visible = false;
            return;
        }
        if (++IoGauntlet._ticks % 6 != 0 && IoGauntlet._bar.visible) {
            return;
        }
        if (!IoGauntlet._barFill) {
            IoGauntlet.drawBar();
        }
        if (!IoGauntlet._bar.parent && GLOBAL._layerUI) {
            GLOBAL._layerUI.addChild(IoGauntlet._bar);
        }
        let destroyed: int = IoGauntlet.percentDestroyed();
        IoGauntlet._barFill.graphics.clear();
        IoGauntlet._barFill.graphics.beginFill((destroyed >= IoGauntlet._winPercent ? 0x4CC34C : 0xE0501C) >>> 0, 1);
        IoGauntlet._barFill.graphics.drawRect(1, 1, Math.max(0, (IoGauntlet.BAR_W - 2) * Math.min(100, destroyed) / 100), IoGauntlet.BAR_H - 2);
        IoGauntlet._barFill.graphics.endFill();
        IoGauntlet._barText.text = KEYS.Get("io_t3t_gnt_bar", { "v1": IoGauntlet.roman(IoGauntlet.attackStage), "v2": destroyed, "v3": IoGauntlet._winPercent });
        IoGauntlet._bar.x = (GLOBAL._SCREENCENTER.x - IoGauntlet.BAR_W * 0.5) | 0;
        IoGauntlet._bar.y = (GLOBAL._SCREEN.y + 100) | 0;
        IoGauntlet._bar.visible = true;
        if (IoGauntlet._bar.parent) {
            IoGauntlet._bar.parent.setChildIndex(IoGauntlet._bar, (IoGauntlet._bar.parent.numChildren - 1) | 0);
        }
    }

    /** As the attack's end works it out (ATTACK.EndB): building health left, walls and fired traps aside. */
    public static percentDestroyed(): int {
        let health: number = 0;
        let max: number = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b._class != "wall" && (b._type == 53 && b._expireTime < GLOBAL.Timestamp()) === false) {
                health += b.health;
                max += b.maxHealth;
            }
        }
        return max > 0 ? (100 - 100 / max * health) | 0 : 0;
    }

    // ---- helpers
    /**
     * QoL #566: when the next month starts (00:00 UTC on the 1st) in the player's own time: "on Nov 1, 01:00 (your
     * time)". (It said "on the 1st": in the Americas that's the evening of the 31st.)
     */
    public static ioNextFirst(): string {
        let now: Date = new Date();
        let next: Date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        // (QoL #235: the top bar's own words for it, io_tr_top_gt_on)
        // (16 October: "1 Nov 2026, 01:00", the game's one way to say when)
        return KEYS.Get("io_tr_top_gt_on", { "v1": IoFormat.dateTime(next.getTime() / 1000) });
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string, font: string = "Verdana", italic: boolean = false): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat(font, size, color, bold, italic);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }
}
