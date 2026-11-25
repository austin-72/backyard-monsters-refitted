import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { getTimer } from "flash/utils";
import { ATTACK, Button_CLIP, CREATUREBUTTON_CLIP, CREATURELOCKER, CREATURES, GLOBAL, ImageCache, IoPhoneText, IoPinchZoom, IoSiege, KEYS, UI2, bubblepopup3, IoSynergy } from "@game";

export class CREATUREBUTTON extends CREATUREBUTTON_CLIP {
    static {
        as3.fields(this, { _creatureID: null, _creatureData: null, _tick: 0, _description: null, m_index: 0 , _ioLastMore: 0, _ioAll: null, _ioAllNone: false, _ioAllT: 0, _ioCompact: false, _ioPinned: false, _ioPress: 0, _ioPressY: 0, _ioPressT: 0, _ioPressRepeated: false });
    }

    public _creatureID: string;
    public _creatureData: any;
    public _tick: int;
    public _description: bubblepopup3;
    protected m_index: int;

    public $ctor(param1?: string, param2?: int, param3?: DisplayObjectContainer): void {
        let _loc4_: string = null;
        super.$ctor();
        this._creatureID = param1;
        this._creatureData = CREATURELOCKER._creatures[this._creatureID];
        ImageCache.GetImageWithCallBack("monsters/" + this._creatureID + "-small.png", as3.bind(this, this.IconLoaded), true, 1);
        _loc4_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[this._creatureID].name));
        let _loc5_: uint = (Math.max(0.8, Math.min(1, 1 / (_loc4_.length / 10))) * 12) >>> 0;
        if (IoSiege.level(param1) > 0) {
            // (Inferno-only Siege, the Devil's Arcade: the arcade's army, at the army's level)
            this.txtName.htmlText = "<b><font size=\"" + _loc5_ + "\">" + _loc4_ + " Level " + IoSiege.level(param1) + "</font></b>";
        } else if (Boolean(GLOBAL.attackingPlayer.m_upgrades[param1]) && Boolean(GLOBAL.attackingPlayer.m_upgrades[param1].level)) {
            this.txtName.htmlText = "<b><font size=\"" + _loc5_ + "\">" + _loc4_ + " Level " + GLOBAL.attackingPlayer.m_upgrades[param1].level + "</font></b>";
        } else {
            this.txtName.htmlText = "<b><font size=\"" + _loc5_ + "\">" + _loc4_ + " Level 1</font></b>";
        }
        this._description = new bubblepopup3();
        let ioTip: string = KEYS.Get(as3.str(CREATURELOCKER._creatures[this._creatureID].description));
        let ioRows: int = 5;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #364: its health and damage per second at the level it is sent at, and what it goes for)
            let ioLevel: int = IoSiege.level(param1) > 0 ? IoSiege.level(param1) : (GLOBAL.attackingPlayer.m_upgrades[param1] && GLOBAL.attackingPlayer.m_upgrades[param1].level ? GLOBAL.attackingPlayer.m_upgrades[param1].level | 0 : 1);
            ioTip += "<br><b>" + KEYS.Get("io_mon2_tip_stats", { "v1": GLOBAL.FormatNumber(Number(CREATURES.GetProperty(this._creatureID, "health", ioLevel))), "v2": CREATURELOCKER.ioDpsText(this._creatureID, ioLevel) }) + "</b>";
            ioTip += "<br><font color=\"#8A5A00\">" + CREATURELOCKER.ioTags(this._creatureID, ioLevel) + "</font>";
            ioRows = 8;
            // (11 November: its synergy, so an army can be picked for it)
            let ioSynergy: string = IoSynergy.describe(this._creatureID);
            if (ioSynergy) {
                ioTip += "<br><font color=\"#0B6B58\">" + ioSynergy + "</font>";
                ioRows += ioSynergy.split("<br>").length;
            }
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #81: how much of the Flinger each takes)
            ioTip += "<br><b>" + KEYS.Get("io_flinger_space", { "v1": GLOBAL.FormatNumber(Number(CREATURES.GetProperty(this._creatureID, "bucket"))) }) + "</b>";
        }
        // (QoL #548: a phone's compact row has no name line: the tip starts with it)
        if (CREATUREBUTTON.ioPhone && GLOBAL.isInAttackMode) {
            ioTip = "<b>" + this.txtName.text + "</b><br>" + ioTip;
            ioRows++;
        }
        this._description.Setup(190, 26, ioTip, ioRows);
        param3.addChild(this._description);
        this._description.visible = false;
        this.m_index = param2;
        this._bg.gotoAndStop("bg" + String(this.m_index % 2 + 1));
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.Out));
        if (!GLOBAL.isInAttackMode) {
            this.bMore.visible = false;
            this.bMore.Enabled = false;
            this.bLess.visible = false;
            this.bLess.Enabled = false;
            this.txtNumber.x = 40;
        } else {
            this.bMore.Setup("+");
            this.bMore.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.More));
            this.bMore.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Clear));
            this.bMore.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
            this.bLess.Setup("-");
            this.bLess.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.Less));
            this.bLess.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Clear));
            this.bLess.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
            this.txtNumber.x = 110;
            if (GLOBAL.INFERNO_ONLY && this._creatureID.substr(0, 1) != "G") {
                // (15 October, the user's: "All" to the right of "+": as many of these as the Flinger takes; once
                // they are all in (or nothing more of them fits), "None" takes them all out. It replaces the double
                // click on "+", which filled the Flinger by surprise when "+" was pressed twice quickly.)
                this._ioAll = new Button_CLIP();
                this._ioAll.name = "ioFlingerAll";
                this.addChild(this._ioAll);
                this._ioAll.Setup(KEYS.Get("io_flg_all"), false, 36, this.bMore.height | 0);
                this._ioAll.x = Math.round(this.bMore.x + this.bMore.width + 4);
                this._ioAll.y = this.bMore.y;
                // (the count moves right of it, into the rest of the row)
                this.txtNumber.x = this._ioAll.x + 38;
                this.txtNumber.width = Math.max(40, 186 - this.txtNumber.x);
                this._ioAll.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioAllClick));
                this._ioAll.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
                this._ioAllNone = false;
                this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioAllFrame));
            }
            if (CREATUREBUTTON.ioPhone) {
                this.ioCompactLayout();
            }
        }
        this._tick = 0;
        this.Update();
    }

    // ---------------------------------------------------------------------------------------------
    // Inferno-only (QoL #548): the attack list on a phone
    // ---------------------------------------------------------------------------------------------
    /**
     * On a phone (GLOBAL.ioOnPhone) the list showed about 3.6 rows, with 17 px "-" and "+" 3 px apart (at a landscape
     * phone's 0.58). A compact row there: the monster's picture with its count over it ("3 / 12"), then big "-", "+"
     * and "All" buttons the row's height, 6 px apart; the name and level open with the stats (a tap on the picture).
     * A finger's press on "-" or "+" counts on the lift (a press that turns into a swipe of the list counts nothing),
     * and held, it repeats. UI_TOP lays the rows out IO_ROW_STEP apart (ioRowY).
     */
    public static get ioPhone(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.ioOnPhone;
    }

    /** The compact row's height (UI_TOP's step from one row to the next; stock rows: 53). */
    public static readonly IO_ROW_STEP: int = 44;

    /** The stock step. */
    public static readonly STOCK_ROW_STEP: int = 53;

    /**
     * Where UI_TOP puts the attack list's row `i`, the rows before it in `rows` (champions, monsters): 34 + 53 a row,
     * as before, a compact row (a phone) IO_ROW_STEP.
     */
    public static ioRowY(i: int, rows: any[]): int {
        let y: int = 34;
        for (let j: int = 0; j < i; j++) {
            let row: any = rows && j < rows.length ? rows[j] : null;
            y = (y + (row instanceof CREATUREBUTTON && (row as CREATUREBUTTON)._ioCompact ? CREATUREBUTTON.IO_ROW_STEP : CREATUREBUTTON.STOCK_ROW_STEP)) | 0;
        }
        return y;
    }

    /** This row is laid out compact (a phone, attacking). */
    public _ioCompact: boolean;

    /** Its stats stay up (tapped on a phone) until tapped again or another row's are. */
    private _ioPinned: boolean;

    private static _ioPinnedRow: CREATUREBUTTON = null;

    /** A finger's press on "-" (-1) or "+" (1), 0: none; where it went down; frames held; repeating. */
    private _ioPress: int;

    private _ioPressY: number;

    private _ioPressT: int;

    private _ioPressRepeated: boolean;

    private ioCompactLayout(): void {
        this._ioCompact = true;
        this.name = "ioAttackRow:" + this._creatureID;
        let h: int = (CREATUREBUTTON.IO_ROW_STEP - 6) | 0;
        // (the row's background: a step tall, overlapping the next by one as the stock rows do)
        this._bg.y = -10;
        this._bg.height = CREATUREBUTTON.IO_ROW_STEP + 1;
        // (the picture a little smaller, the count over its foot)
        this._creatureImage.scaleX = this._creatureImage.scaleY = 0.85;
        this._creatureImage.x = -10;
        this._creatureImage.y = -9;
        this.mcImage.visible = false;
        this.txtName.visible = false;
        this.txtNumber.x = -11;
        this.txtNumber.y = 17;
        this.txtNumber.width = 46;
        this.txtNumber.height = 18;
        this.txtNumber.mouseEnabled = false;
        this.bLess.Setup("-", false, 42, h);
        this.bLess.x = 34;
        this.bLess.y = -7;
        this.bLess.name = "ioAttackLess";
        this.bMore.Setup("+", false, 42, h);
        this.bMore.x = this.bLess.x + 42 + 6;
        this.bMore.y = this.bLess.y;
        this.bMore.name = "ioAttackMore";
        if (this._ioAll) {
            this._ioAll.x = this.bMore.x + 42 + 6;
            this._ioAll.y = this.bMore.y;
            this._ioAll.Setup(KEYS.Get(this._ioAllNone ? "io_flg_none" : "io_flg_all"), false, 40, h);
        }
        // (a tap on the picture shows the stats, and they stay)
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioRowClick));
    }

    private ioRowClick(param1: MouseEvent): void {
        let t: any = param1 ? param1.target : null;
        if (t === this.bMore || t === this.bLess || (this._ioAll && t === this._ioAll)) {
            return;
        }
        let pin: boolean = !this._ioPinned;
        if (CREATUREBUTTON._ioPinnedRow && CREATUREBUTTON._ioPinnedRow !== this) {
            CREATUREBUTTON._ioPinnedRow._ioPinned = false;
            CREATUREBUTTON._ioPinnedRow._description.visible = false;
        }
        this._ioPinned = pin;
        CREATUREBUTTON._ioPinnedRow = pin ? this : null;
        this._description.visible = pin;
    }

    /** A finger on "-" or "+": counted on the lift, unless the list was swiped; held still, it repeats. */
    private ioPressStart(dir: int): void {
        this.ioPressEnd();
        this._ioPress = dir;
        this._ioPressY = this.stage ? this.stage.mouseY : 0;
        this._ioPressT = 0;
        this._ioPressRepeated = false;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPressTick));
        if (this.stage) {
            this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioPressUp));
        }
    }

    private ioPressTick(param1: Event = null): void {
        if (!this._ioPress || !this.stage) {
            this.ioPressEnd();
            return;
        }
        if (Math.abs(this.stage.mouseY - this._ioPressY) > 8) {
            // (a swipe of the list: nothing counted)
            this.ioPressEnd();
            return;
        }
        this._ioPressT++;
        if (this._ioPressT > 14 && this._ioPressT % 2 == 0) {
            this._ioPressRepeated = true;
            if (this._ioPress > 0) {
                this.MoreTickB();
            } else {
                this.LessTickB();
            }
        }
    }

    private ioPressUp(param1: MouseEvent = null): void {
        let dir: int = this._ioPress;
        let counted: boolean = this._ioPressRepeated;
        let stillOn: boolean = this.stage && Math.abs(this.stage.mouseY - this._ioPressY) <= 8;
        this.ioPressEnd();
        if (dir == 0 || counted || !stillOn) {
            return;
        }
        if (dir > 0) {
            this.MoreTickB();
        } else {
            this.LessTickB();
        }
    }

    private ioPressEnd(): void {
        this._ioPress = 0;
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioPressTick));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioPressUp));
        }
    }

    public IconLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        this._creatureImage.addChild(_loc3_);
    }

    public Update(): void {
        let _loc1_: int = 0;
        _loc1_ = ATTACK._curCreaturesAvailable[this._creatureID] | 0;
        let _loc2_: any = "<b>";
        if (ATTACK._flingerBucket[this._creatureID]) {
            _loc2_ = "<font color=\"#FF0000\">" + ATTACK._flingerBucket[this._creatureID].Get() + "</font> / ";
        }
        _loc2_ += _loc1_ + "</b>";
        if (this._ioCompact) {
            // (QoL #548: centred over the picture's foot)
            _loc2_ = "<p align=\"center\">" + (ATTACK._flingerBucket[this._creatureID] ? "<b>" : "") + _loc2_ + "</p>";
        }
        this.txtNumber.htmlText = as3.str(_loc2_);
        if (this._ioAll) {
            // (the count's room is narrower beside "All": a long one drawn smaller; QoL #564: on a phone not under 9)
            IoPhoneText.fit(this.txtNumber, 8);
        }
        if (_loc1_ > 0) {
            this.bMore.enabled = true;
            this._bg.gotoAndStop("bg" + String(this.m_index % 2 + 1));
        }
        if (_loc1_ <= 0) {
            this.bMore.enabled = false;
            this._bg.gotoAndStop("full" + String(this.m_index % 2 + 1));
        }
        this.ioAllShow();
    }

    /** The "All" / "None" button: all of this kind into the Flinger, or all of it out. */
    private _ioAll: Button_CLIP;

    /** It says "None" (all of this kind is in, or no more of it fits). */
    private _ioAllNone: boolean;

    private _ioAllT: int;

    private ioAllClick(param1: MouseEvent = null): void {
        if (param1) {
            param1.stopPropagation();
        }
        UI2._top.BombDeselect();
        if (this._ioAllNone) {
            ATTACK.ioEmpty(this._creatureID);
        } else if (ATTACK.ioCanAdd(this._creatureID)) {
            ATTACK.ioFill(this._creatureID);
        }
        this.Update();
        ATTACK.BucketUpdate();
        this.ioAllShow();
    }

    /** A few times a second: "All" or "None" as the Flinger stands (other rows and keys change it too). */
    private ioAllFrame(param1: Event = null): void {
        if (!this.stage) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioAllFrame));
            return;
        }
        if (++this._ioAllT % 8 == 0) {
            this.ioAllShow();
        }
    }

    public ioAllShow(): void {
        if (!this._ioAll) {
            return;
        }
        let held: int = ATTACK._flingerBucket[this._creatureID] ? ATTACK._flingerBucket[this._creatureID].Get() | 0 : 0;
        let canAdd: boolean = ATTACK.ioCanAdd(this._creatureID);
        let none: boolean = held > 0 && !canAdd;
        if (none != this._ioAllNone || this._ioAllT <= 1) {
            this._ioAllNone = none;
            this._ioAll.Setup(KEYS.Get(none ? "io_flg_none" : "io_flg_all"), false, this._ioCompact ? 40 : 36, this.bMore.height | 0);
        }
        this._ioAll.Enabled = none || canAdd;
    }

    public Over(param1: MouseEvent): void {
        this._description.visible = true;
    }

    public Out(param1: MouseEvent): void {
        // (QoL #548: stats tapped up on a phone stay)
        if (this._ioPinned) {
            return;
        }
        this._description.visible = false;
    }

    public Clear(param1: MouseEvent = null): void {
        if (this.hasEventListener(Event.ENTER_FRAME)) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.MoreTick));
        }
        if (this.hasEventListener(Event.ENTER_FRAME)) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.LessTick));
        }
    }

    /** When "+" was last pressed (a second press soon after fills the Flinger with this kind; QoL #78). */
    private _ioLastMore: int;

    public More(param1: MouseEvent): void {
        UI2._top.BombDeselect();
        if (this._ioCompact && IoPinchZoom.fingerDown) {
            // (QoL #548: a finger's press counts on the lift, not if the list was swiped)
            this.ioPressStart(1);
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (Shift-click on "+": as many of these as the Flinger takes. 15 October, the user's: no longer a double
            // click too, which filled it by surprise; the "All" button beside "+" does that.)
            this._ioLastMore = getTimer();
            if (param1 && param1.shiftKey) {
                ATTACK.ioFill(this._creatureID);
                this.Update();
                ATTACK.BucketUpdate();
                return;
            }
        }
        this.MoreTickB();
        this._tick = 0;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.MoreTick));
    }

    public MoreTick(param1: Event = null): void {
        if (this._tick > 10 && this._tick % 2 == 0) {
            this.MoreTickB();
        }
        this.MoreMovedOut();
        ++this._tick;
    }

    public MoreTickB(): void {
        ATTACK.BucketAdd(this._creatureID);
        this.Update();
        ATTACK.BucketUpdate();
    }

    public Less(param1: MouseEvent): void {
        UI2._top.BombDeselect();
        if (this._ioCompact && IoPinchZoom.fingerDown) {
            this.ioPressStart(-1);
            return;
        }
        if (GLOBAL.INFERNO_ONLY && param1 && param1.shiftKey) {
            // (Shift-click on "-": all of these out of the Flinger; QoL #78)
            ATTACK.ioEmpty(this._creatureID);
            this.Update();
            ATTACK.BucketUpdate();
            return;
        }
        this.LessTickB();
        this._tick = 0;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.LessTick));
    }

    public LessTick(param1: Event = null): void {
        if (this._tick > 10 && this._tick % 2 == 0) {
            this.LessTickB();
        }
        this.LessMovedOut();
        ++this._tick;
    }

    public LessTickB(): void {
        ATTACK.BucketRemove(this._creatureID);
        this.Update();
        ATTACK.BucketUpdate();
    }

    public MoreMovedOut(): void {
        if (this.mouseX < this.bMore.x || this.mouseX > this.bMore.x + this.bMore.width || this.mouseY < this.bMore.y || this.mouseY > this.bMore.y + this.bMore.height) {
            this.Clear();
        }
    }

    public LessMovedOut(): void {
        if (this.mouseX < this.bLess.x || this.mouseX > this.bLess.x + this.bLess.width || this.mouseY < this.bLess.y || this.mouseY > this.bLess.y + this.bLess.height) {
            this.Clear();
        }
    }
}
