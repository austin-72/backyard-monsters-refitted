import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { TextField } from "flash/text";
import { Timer } from "flash/utils";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceFormPopup, AllianceTabBase, Button_CLIP, GLOBAL, IoAllianceUi, KEYS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only: the Overview tab (the user's design of 2 October). The alliance's description with Edit
 * (the leader) and Leave; the two newest pins on the board; the outposts gained and lost this week; the
 * power-ups running, with the time they have left.
 */
export class IoOverviewTab extends AllianceTabBase {
    static {
        as3.fields(this, { _data: null, _powerBox: null, _powerups: null, _clock: null });
    }

    private static PAD: int; // const

    private static LEFT_W: int; // const

    private static RIGHT_X: int; // const

    private static RIGHT_W: int; // const

    private static BTN_H: int; // const

    static {
        as3.lazyStatics(this, { PAD: 0, LEFT_W: 0, RIGHT_X: 0, RIGHT_W: 0, BTN_H: 0 }, () => {
            IoOverviewTab.PAD = 12;
            IoOverviewTab.LEFT_W = 372;
            IoOverviewTab.RIGHT_X = (IoOverviewTab.PAD + IoOverviewTab.LEFT_W + 14) | 0;
            IoOverviewTab.RIGHT_W = (AllianceConstants.CONTENT_W - IoOverviewTab.RIGHT_X - IoOverviewTab.PAD) | 0;
            IoOverviewTab.BTN_H = 36;
        });
    }
    private _data: any;
    private _powerBox: Sprite;
    private _powerups: any[];
    private _clock: Timer;

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemoved));
        ALLIANCES.LoadMyAlliance(as3.bind(this, this._onData));
    }

    private _onData(data: any): void {
        if (this.stage == null) {
            return;
        }
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
        this._data = data;
        if (data == null) {
            IoAllianceUi.addText(this, KEYS.Get("alliance_err_generic"), IoOverviewTab.PAD, IoOverviewTab.PAD, 13, AllianceConstants.IO_INK, false, (this.CONTENT_W - IoOverviewTab.PAD * 2) | 0);
            return;
        }
        this._buildAbout();
        this._buildPins();
        this._buildWeek();
        this._buildPowerups();
    }

    // ---- the left: the description, Edit and Leave
    private _buildAbout(): void {
        IoAllianceUi.band(this, IoOverviewTab.PAD, IoOverviewTab.PAD, IoOverviewTab.LEFT_W, KEYS.Get("io_alliance_about"));
        const top: int = (IoOverviewTab.PAD + 32) | 0;
        const bottom: int = (this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H - 14) | 0;
        let box: Sprite = new Sprite();
        box.x = IoOverviewTab.PAD;
        box.y = top;
        box.graphics.lineStyle(1, 3355443, 1);
        box.graphics.beginFill(16777215, 1);
        box.graphics.drawRoundRect(0, 0, IoOverviewTab.LEFT_W, bottom - top, 8, 8);
        box.graphics.endFill();
        this.addChild(box);
        let desc: string = this._data.description ? String(this._data.description) : "";
        let t: TextField = IoAllianceUi.addText(box, desc ? desc : KEYS.Get("io_alliance_no_desc"), 10, 8, 13, (desc ? 0x333333 : AllianceConstants.IO_MUTED) >>> 0, false, (IoOverviewTab.LEFT_W - 20) | 0, "left", false, true);
        t.height = bottom - top - 16;

        const gap: int = 16;
        const btnW: int = ((IoOverviewTab.LEFT_W - gap) / 2) | 0;
        if (ALLIANCES._isLeader) {
            let edit: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
            edit.Setup(KEYS.Get("alliance_btn_edit"), false, btnW, IoOverviewTab.BTN_H);
            edit.x = IoOverviewTab.PAD;
            edit.y = this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H;
            edit.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onEdit));
        }
        let leave: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        leave.Setup(KEYS.Get("alliance_btn_leave"), false, btnW, IoOverviewTab.BTN_H);
        leave.x = Number(ALLIANCES._isLeader ? IoOverviewTab.PAD + btnW + gap : IoOverviewTab.PAD);
        leave.y = this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H;
        leave.name = "ioLeave";
        leave.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onLeave));
    }

    // ---- the right: the newest pins, this week's outposts, the power-ups
    private _sectionLink(y: int, label: string, tab: int): void {
        let l: Sprite = IoAllianceUi.link(label, 11, (): void => {
            if (ALLIANCEWINDOW._mc != null) {
                ALLIANCEWINDOW._mc.SelectTab(tab);
            }
        });
        l.x = IoOverviewTab.RIGHT_X + IoOverviewTab.RIGHT_W - l.width - 8;
        l.y = y + 3;
        l.name = "ioLink" + tab;
        this.addChild(l);
    }

    private _buildPins(): void {
        const y0: int = IoOverviewTab.PAD;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_latest_pins"));
        this._sectionLink(y0, KEYS.Get("io_alliance_open_board"), AllianceConstants.IO_TAB_BOARD);
        let pins: any[] = as3.as(this._data.pins_top, Array) || [];
        let y: int = (y0 + 32) | 0;
        const cardH: int = 76;
        if (pins.length == 0) {
            let empty: Sprite = new Sprite();
            IoAllianceUi.card(empty.graphics, 0, 0, IoOverviewTab.RIGHT_W, cardH * 2 + 6, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(empty, KEYS.Get(ALLIANCES.ioIsStaff() ? "io_alliance_no_pins_staff" : "io_alliance_no_pins"), 12, 12, 12, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 24) | 0, "left", false, true);
            empty.x = IoOverviewTab.RIGHT_X;
            empty.y = y;
            this.addChild(empty);
            return;
        }
        for (let i: int = 0; i < 2; i++) {
            if (i < pins.length) {
                this.addChild(this._pinCard(pins[i], IoOverviewTab.RIGHT_X, (y + i * (cardH + 6)) | 0, IoOverviewTab.RIGHT_W, cardH));
            }
        }
    }

    /** A short pin: title, two lines of it, who and when, and Jump when it has a place. */
    private _pinCard(pin: any, x: int, y: int, w: int, h: int): Sprite {
        let px: int = 0;
        let py: int = 0;
        let world: string = null;
        let c: Sprite = new Sprite();
        c.x = x;
        c.y = y;
        IoAllianceUi.card(c.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        let hasPlace: boolean = pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined;
        let textW: int = (w - 20 - (hasPlace ? 96 : 0)) | 0;
        IoAllianceUi.addText(c, String(pin.title), 10, 6, 12, AllianceConstants.IO_INK, true, textW);
        let body: TextField = IoAllianceUi.addText(c, String(pin.body || ""), 10, 24, 11, 3355443, false, textW, "left", false, true);
        body.height = 30;
        IoAllianceUi.addText(c, KEYS.Get("io_alliance_pin_by", { "v1": String(pin.author), "v2": IoAllianceUi.ago(Number(pin.created)) }), 10, (h - 20) | 0, 10, AllianceConstants.IO_MUTED, false, textW);
        if (hasPlace) {
            px = pin.x | 0;
            py = pin.y | 0;
            world = pin.world_id ? String(pin.world_id) : "";
            IoAllianceUi.addText(c, IoAllianceUi.coord(px, py), (w - 96) | 0, 10, 11, AllianceConstants.IO_INK, true, 86, IoAllianceUi.CENTER);
            let jump: MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), 76, 24, (e: MouseEvent): void => {
                IoAllianceUi.jump(px, py, world);
            }, "gold");
            jump.x = w - 86;
            jump.y = 32;
            jump.name = "ioPinJump";
            c.addChild(jump);
        }
        return c;
    }

    private _buildWeek(): void {
        const y0: int = (IoOverviewTab.PAD + 32 + 76 * 2 + 6 + 14) | 0;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_week"));
        this._sectionLink(y0, KEYS.Get("io_alliance_see_history"), AllianceConstants.IO_TAB_OUTPOSTS);
        let week: any = this._data.week || { "gained": 0, "lost": 0, "net": 0 };
        let figures: any[] = [[KEYS.Get("io_alliance_gained"), "+" + (week.gained | 0), AllianceConstants.IO_GAINED], [KEYS.Get("io_alliance_lost"), ((week.lost | 0) > 0 ? "-" : "") + (week.lost | 0), AllianceConstants.IO_LOST], [KEYS.Get("io_alliance_net"), IoAllianceUi.signed(week.net | 0), (week.net | 0) > 0 ? AllianceConstants.IO_GAINED : ((week.net | 0) < 0 ? AllianceConstants.IO_LOST : AllianceConstants.IO_INK)]];
        const gap: int = 8;
        const boxW: int = ((IoOverviewTab.RIGHT_W - gap * 2) / 3) | 0;
        for (let i: int = 0; i < figures.length; i++) {
            let b: Sprite = new Sprite();
            b.x = IoOverviewTab.RIGHT_X + i * (boxW + gap);
            b.y = y0 + 32;
            IoAllianceUi.card(b.graphics, 0, 0, boxW, 50, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(b, String(figures[i][0]), 0, 4, 10, AllianceConstants.IO_MUTED, false, boxW, IoAllianceUi.CENTER);
            IoAllianceUi.addText(b, String(figures[i][1]), 0, 20, 17, figures[i][2] >>> 0, true, boxW, IoAllianceUi.CENTER);
            this.addChild(b);
        }
    }

    private _buildPowerups(): void {
        const y0: int = (IoOverviewTab.PAD + 32 + 76 * 2 + 6 + 14 + 32 + 50 + 14) | 0;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_powerups_running"));
        this._sectionLink(y0, KEYS.Get("alliance_tab_powerups"), AllianceConstants.IO_TAB_POWERUPS);
        this._powerBox = new Sprite();
        this._powerBox.x = IoOverviewTab.RIGHT_X;
        this._powerBox.y = y0 + 32;
        this.addChild(this._powerBox);
        IoAllianceUi.addText(this._powerBox, KEYS.Get("msg_loading"), 10, 4, 11, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 20) | 0);
        ALLIANCES.LoadPowerups((rows: any[]): void => {
            if (this.stage == null) {
                return;
            }
            this._powerups = rows || [];
            this._drawPowerups();
            if (this._clock == null) {
                this._clock = new Timer(1000);
                this._clock.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                    this._drawPowerups();
                });
                this._clock.start();
            }
        });
    }

    /** The power-ups running, each with the time it has left (every second). */
    private _drawPowerups(): void {
        if (this._powerBox == null || this.stage == null) {
            return;
        }
        while (this._powerBox.numChildren > 0) {
            this._powerBox.removeChildAt(0);
        }
        let running: any[] = [];
        for (let p of as3.values(this._powerups)) {
            let left: int = ((p.endTime | 0) - GLOBAL.Timestamp()) | 0;
            if (p.active && left > 0) {
                running.push([KEYS.Get(String(p.type) + "_name"), left]);
            }
        }
        let h: int = Math.max(30, running.length * 22 + 10) | 0;
        this._powerBox.graphics.clear();
        IoAllianceUi.card(this._powerBox.graphics, 0, 0, IoOverviewTab.RIGHT_W, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        if (running.length == 0) {
            IoAllianceUi.addText(this._powerBox, KEYS.Get("io_alliance_powerups_none"), 10, 6, 11, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 20) | 0);
            return;
        }
        for (let i: int = 0; i < running.length; i++) {
            IoAllianceUi.addText(this._powerBox, String(running[i][0]), 10, (5 + i * 22) | 0, 12, AllianceConstants.IO_INK, true, (IoOverviewTab.RIGHT_W - 150) | 0);
            IoAllianceUi.addText(this._powerBox, KEYS.Get("io_alliance_left", { "v1": GLOBAL.ToTime(running[i][1] | 0, true, true, true, false) }), (IoOverviewTab.RIGHT_W - 150) | 0, (5 + i * 22) | 0, 12, AllianceConstants.IO_GAINED, true, 140, IoAllianceUi.RIGHT);
        }
    }

    private _onRemoved(e: Event): void {
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemoved));
        if (this._clock != null) {
            this._clock.stop();
            this._clock = null;
        }
    }

    // ---- Edit and Leave (as the stock My Alliance tab has them)
    private _onEdit(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }
        new AllianceFormPopup().Show(AllianceFormPopup.MODE_EDIT, String(this._data.name), this._data.image | 0, String(this._data.description));
    }

    private _onLeave(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }
        let members: int = this._data.number_of_members | 0;
        if (ALLIANCES._isLeader && members > 1) {
            GLOBAL.Message(KEYS.Get("alliance_err_leader_cannot_leave", { "alliance": String(this._data.name) }));
            return;
        }
        let confirmKey: string = (ALLIANCES._isLeader && members <= 1) ? "alliance_disband_confirm" : "alliance_leave_confirm";
        GLOBAL.Message(KEYS.Get(confirmKey, { "alliance": String(this._data.name) }), KEYS.Get("btn_yes"), as3.bind(this, this._confirmLeave), null, KEYS.Get("btn_no"), null, null);
    }

    private _confirmLeave(): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "leavealliance", [["confirm", "1"]], as3.bind(this, this._onLeaveComplete), (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("alliance_err_generic"));
        });
    }

    private _onLeaveComplete(response: any): void {
        if (response && response.error) {
            GLOBAL.Message(String(response.error));
            return;
        }
        ALLIANCES.Clear();
        ALLIANCES._allianceID = 0;
        ALLIANCES.InvalidateMyAlliance();
        if (ALLIANCEWINDOW._mc != null) {
            ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_OVERVIEW);
        }
    }
}
