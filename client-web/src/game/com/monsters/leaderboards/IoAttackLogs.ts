import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point, Rectangle } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { IoBrag, IoWin, IoPinchZoom, BASE, BYMChat, CasinoUI, GLOBAL, IoFormat, IoKit, IoMapShare, IoMapUi, IoPhoneText, IoReplays, KEYS, POPUPSETTINGS, SOUNDS, UI_TOP, URLLoaderApi, LOGIN } from "@game";

/**
 * Inferno-only (3 October): the attack logs, opened by the top bar's button right of the leaderboards
 * (UI_TOP.ioAttackLogsButton). Two tabs:
 *
 *  - My attacks:    every yard the player attacked (players' yards and outposts, tribe and Moloch yards);
 *  - Attacks on me: every attack on the player's yards and outposts.
 *
 * Each row: when, the other side (the tribe's name for a wild yard), the yard (main yard, outpost, a tribe
 * yard's level), the damage done (or "in progress"), the loot taken. Report opens the attack's battle report
 * (what the attacking game wrote: monsters sent, buildings destroyed, loot), with all the details; Jump opens
 * the map on the yard.
 *
 * Data: the server's logs (attacklogs/game: controllers/attacklogs/getGameAttackLogs.ts), asked for each time
 * the window opens (and Refresh); a report is asked for when it is opened. The logs are written by the
 * server when an attack starts (createAttackLog) and brought up to date by each of its saves (updateAttackLog).
 */
export class IoAttackLogs extends ASObject {
    static {
        as3.fields(this, { mc: null, _data: null, _loading: false, _failed: false, _tabs: null, _status: null, _count: null, _list: null, _rows: null, _detail: null, _replayMenu: null, _ioTotals: null, _ioTypeBtn: null, _ioResultBtn: null, _ioLoadingOlder: false, _ioOlderFailed: false });
    }

    public static W: int; // const

    public static H: int; // const

    private static ROW_H: int; // const

    private static LIST_X: int; // const

    private static LIST_W: int; // const

    private static LIST_TOP: int; // const

    private static LIST_H: int; // const

    private static BAR_W: int; // const

    private static ROW_W: int; // const

    private static WHEEL_PX: int; // const

    private static JUMP_W: int; // const

    private static REPORT_W: int; // const

    /** The columns: key, text key, width, alignment. */
    /** (3 October, night: narrower name and yard columns, for the Replay button) */
    private static COLUMNS: any[]; // const

    private static REPLAY_W: int; // const

    private static _open: IoAttackLogs;

    private static _tab: int;

    /** Inferno-only (QoL #532): the last list loaded (shown at once, and kept when a refresh is refused). */
    private static _ioLast: any = null;

    /** Inferno-only (QoL #532): the reports opened, by log id (opening one again asks the server nothing). */
    private static _ioReports: any = {};

    /** Inferno-only (QoL #93): the type shown (0 all, 1 players' yards, 2 tribe yards), kept while the game runs. */
    private static _ioType: int = 0;

    /** Inferno-only (QoL #93): the result shown (0 all, 1 won, 2 lost: the player's side of it). */
    private static _ioResult: int = 0;

    private static readonly IO_TYPE_KEYS: any[] = ["io_al3_type_all", "io_al3_type_players", "io_al3_type_tribes"];

    private static readonly IO_RESULT_KEYS: any[] = ["io_al3_res_all", "io_al3_res_won", "io_al3_res_lost"];

    /** The game's victory line (an attack that destroys this much of a yard is won: BYMConfig.k_sVICTORY_THRESHOLD). */
    private static readonly IO_WON: int = 90;

    static {
        as3.lazyStatics(this, { W: 0, H: 0, ROW_H: 0, LIST_X: 0, LIST_W: 0, LIST_TOP: 0, LIST_H: 0, BAR_W: 0, ROW_W: 0, WHEEL_PX: 0, JUMP_W: 0, REPORT_W: 0, COLUMNS: null, REPLAY_W: 0, _open: null, _tab: 0 }, () => {
            IoAttackLogs.W = 780;
            IoAttackLogs.H = 560;
            IoAttackLogs.ROW_H = 30;
            IoAttackLogs.LIST_X = (-IoAttackLogs.W / 2 + 20) | 0;
            IoAttackLogs.LIST_W = (IoAttackLogs.W - 40) | 0;
            IoAttackLogs.LIST_TOP = (-IoAttackLogs.H / 2 + 176) | 0;
            IoAttackLogs.LIST_H = (10 * IoAttackLogs.ROW_H + 2) | 0;
            IoAttackLogs.BAR_W = 12;
            IoAttackLogs.ROW_W = (IoAttackLogs.LIST_W - IoAttackLogs.BAR_W - 10) | 0;
            IoAttackLogs.WHEEL_PX = (3 * IoAttackLogs.ROW_H) | 0;
            IoAttackLogs.JUMP_W = 52;
            IoAttackLogs.REPORT_W = 64;
            IoAttackLogs.COLUMNS = [["when", "al_col_when", 100, "left"], ["name", "al_col_name", 132, "left"], ["yard", "al_col_yard", 96, "left"], ["result", "al_col_result", 90, "right"], ["loot", "al_col_loot", 106, "right"]];
            IoAttackLogs.REPLAY_W = 58;
            IoAttackLogs._open = null;
            IoAttackLogs._tab = 0;
        });
    }
    public mc: MovieClip;
    private _data: any;
    private _loading: boolean;
    private _failed: boolean;

    /** Inferno-only (QoL #532): why the last refresh failed, while the rows from before are kept. */
    private _ioStale: string;
    private _tabs: any[];
    private _status: TextField;
    private _count: TextField;
    private _list: any;
    private _rows: Sprite;
    private _detail: Sprite;
    // ---- a report
    private _replayMenu: Sprite;

    /** Inferno-only (QoL #93): the last 24 hours' totals, under the title; the two filters; "Load older" asked for. */
    private _ioTotals: TextField;
    private _ioTypeBtn: Sprite;
    private _ioResultBtn: Sprite;
    private _ioLoadingOlder: boolean;
    private _ioOlderFailed: boolean;

    public $ctor(): void {
        this._tabs = [];
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "ioAttackLogsWindow";
        this.drawFrame();
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("al_title"), 34, (IoAttackLogs.W - 200) | 0)), TextField);
        title.x = -IoAttackLogs.W / 2 + 100;
        title.y = -IoAttackLogs.H / 2 + 24;
        let names: any[] = ["al_tab_mine", "al_tab_onme"];
        for (let i: int = 0; i < names.length; i++) {
            let tab: Sprite = CasinoUI.toggle(KEYS.Get(as3.str(names[i])), 150, 28, this.tabClick(i), "tab");
            tab.name = "ioAlTab" + i;
            tab.x = IoAttackLogs.LIST_X + i * 158;
            tab.y = -IoAttackLogs.H / 2 + 110;
            this.mc.addChild(tab);
            this._tabs.push(tab);
        }
        let refresh: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("al_refresh"), 104, 28, (e: MouseEvent): void => {
            this.fetch();
        }, true, 13)), Sprite);
        refresh.name = "ioAlRefresh";
        refresh.x = IoAttackLogs.W / 2 - 20 - 104;
        refresh.y = -IoAttackLogs.H / 2 + 110;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #93, 15 October: the last 24 hours, under the title; two filters between the tabs and Refresh, each
            // a click on to the next choice: the type of yard, and won or lost)
            this._ioTotals = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, (IoAttackLogs.W - 200) | 0, TextFormatAlign.CENTER)), TextField);
            this._ioTotals.name = "ioAlDayTotals";
            this._ioTotals.x = -IoAttackLogs.W / 2 + 100;
            this._ioTotals.y = -IoAttackLogs.H / 2 + 74;
            this._ioTotals.filters = [new GlowFilter(0x1A0A04, 1, 3, 3, 6, 1)];
            this._ioTypeBtn = as3.as(this.mc.addChild(CasinoUI.toggle(KEYS.Get(as3.str(IoAttackLogs.IO_TYPE_KEYS[IoAttackLogs._ioType])), 140, 28, (e: MouseEvent): void => {
                IoAttackLogs._ioType = (IoAttackLogs._ioType + 1) % 3;
                this.ioFiltersChanged();
            })), Sprite);
            this._ioTypeBtn.name = "ioAlTypeFilter";
            this._ioTypeBtn.x = IoAttackLogs.LIST_X + 2 * 158;
            this._ioTypeBtn.y = -IoAttackLogs.H / 2 + 110;
            this._ioResultBtn = as3.as(this.mc.addChild(CasinoUI.toggle(KEYS.Get(as3.str(IoAttackLogs.IO_RESULT_KEYS[IoAttackLogs._ioResult])), 140, 28, (e: MouseEvent): void => {
                IoAttackLogs._ioResult = (IoAttackLogs._ioResult + 1) % 3;
                this.ioFiltersChanged();
            })), Sprite);
            this._ioResultBtn.name = "ioAlResultFilter";
            this._ioResultBtn.x = this._ioTypeBtn.x + 148;
            this._ioResultBtn.y = this._ioTypeBtn.y;
            CasinoUI.choose(this._ioTypeBtn, IoAttackLogs._ioType != 0);
            CasinoUI.choose(this._ioResultBtn, IoAttackLogs._ioResult != 0);
        }
        // the column heads
        let heads: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        heads.x = IoAttackLogs.LIST_X;
        heads.y = IoAttackLogs.LIST_TOP - 26;
        let x: int = 2;
        for (let column of as3.values(IoAttackLogs.COLUMNS)) {
            let t: TextField = as3.as(heads.addChild(CasinoUI.label(KEYS.Get(as3.str(column[1])), 12, CasinoUI.GOLD, true, (column[2] - 8) | 0, as3.str(column[3]))), TextField);
            t.x = x + 4;
            t.y = 2;
            GLOBAL.ioFitText(t);
            x = (x + column[2]) | 0;
        }
        this._list = IoAttackLogs.scrollView(this.mc, IoAttackLogs.LIST_X, IoAttackLogs.LIST_TOP, IoAttackLogs.LIST_W, IoAttackLogs.LIST_H);
        this._rows = as3.cast(this._list.content, Sprite);
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, (IoAttackLogs.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoAttackLogs.LIST_X + 20;
        this._status.y = IoAttackLogs.LIST_TOP + 40;
        this._count = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, 300, TextFormatAlign.RIGHT)), TextField);
        this._count.x = IoAttackLogs.LIST_X + IoAttackLogs.LIST_W - 300;
        this._count.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 8;
        // Inferno-only (3 October): a downloaded replay opened again (IoReplays.Open)
        // (16 October: as wide as its words need, up to 210: "Abrir un archivo de repetición" was cut off)
        let openW: int = Math.max(150, Math.min(210, CasinoUI.label(KEYS.Get("al_replay_open"), 12, 0, false, 400, TextFormatAlign.LEFT, "Groboldov").textWidth + 26)) | 0;
        let openFile: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("al_replay_open"), openW, 24, (e: MouseEvent): void => {
            this.close();
            IoReplays.Open();
        }, true, 12)), Sprite);
        openFile.name = "ioAlOpenReplay";
        openFile.x = IoAttackLogs.LIST_X;
        openFile.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 6;
        // (QoL #559: a phone's rows open their report, and "⋯" has Replay and Jump)
        let hint: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get(IoAttackLogs.ioPhone ? "io_ph_al_hint" : "al_hint"), 12, CasinoUI.ASH, false, (IoAttackLogs.LIST_W - 310 - openW - 10) | 0, TextFormatAlign.LEFT)), TextField);
        hint.x = IoAttackLogs.LIST_X + openW + 10;
        hint.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 8;
        if (IoAttackLogs.ioPhone) {
            IoPhoneText.fit(hint, 8); // (QoL #564: on a phone not under 9)
        } else {
            // (16 October: on two lines when it needs them; on one it was drawn at 8 px, hard to read)
            hint.wordWrap = true;
            hint.multiline = true;
            hint.height = 34;
            hint.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 4;
            GLOBAL.ioFitHeight(hint, 9);
        }
        this.mc.addChild(IoAttackLogs.closeButton("ioAlClose", as3.bind(this, this.close)));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        // (QoL #464: a click on the backdrop closes it)
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        IoWin.fit(this.mc, IoAttackLogs.W, IoAttackLogs.H); // (QoL #466)
        POPUPSETTINGS.ScaleUp(this.mc);
        this.selectTab(IoAttackLogs._tab);
        this.fetch();
    }

    /** Inferno-only (QoL #95): where the list was scrolled to when a replay was watched from it (-1: none). */
    public static ioReturnOffset: number = -1;

    /** Inferno-only (QoL #95): the Attack Log again once the home yard has loaded (after a replay's Close). */
    public static ioReopenAfterLoad(): void {
        let waiter: Sprite = new Sprite();
        let started: int = getTimer();
        let tick: Function = (e: Event): void => {
            if (getTimer() - started > 60000) {
                waiter.removeEventListener(Event.ENTER_FRAME, tick);
                IoAttackLogs.ioReturnOffset = -1;
                return;
            }
            if (BASE._loading || GLOBAL._loadmode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !GLOBAL._layerTop) {
                return;
            }
            waiter.removeEventListener(Event.ENTER_FRAME, tick);
            IoAttackLogs.Show();
        };
        waiter.addEventListener(Event.ENTER_FRAME, tick);
    }

    public static Show(e: MouseEvent = null): void {
        if (IoAttackLogs._open && (!IoAttackLogs._open.mc || !IoAttackLogs._open.mc.stage)) {
            IoAttackLogs._open = null;
        }
        if (IoAttackLogs._open) {
            return;
        }
        SOUNDS.Play("click1");
        // (QoL #90: new attacks on the player: it opens on them)
        if (GLOBAL.INFERNO_ONLY && UI_TOP._ioAttacksNew > 0) {
            IoAttackLogs._tab = 1;
        }
        IoAttackLogs._open = new IoAttackLogs();
    }

    public static get isOpen(): boolean {
        return IoAttackLogs._open != null;
    }

    /** Closes it (the yard is going). */
    public static CloseOpen(): void {
        if (IoAttackLogs._open) {
            IoAttackLogs._open.close();
        }
        IoAttackLogs._open = null;
    }

    private drawFrame(): void {
        IoAttackLogs.frame(this.mc);
    }

    /** The window's frame and art (also the Changelog's, IoChangelog). */
    public static frame(mc: MovieClip): void {
        let bg: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(IoAttackLogs.W, IoAttackLogs.H, Math.PI / 2, -IoAttackLogs.W / 2, -IoAttackLogs.H / 2);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(-IoAttackLogs.W / 2, -IoAttackLogs.H / 2, IoAttackLogs.W, IoAttackLogs.H, 22, 22);
        bg.graphics.endFill();
        // (12 October: its inside is opaque, so a live yard under it is not drawn again under it: DisplayObject.ioOccludes)
        mc.ioOccludes(new Rectangle(-IoAttackLogs.W / 2 + 12, -IoAttackLogs.H / 2 + 12, IoAttackLogs.W - 24, IoAttackLogs.H - 24));
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        let art: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/bg.jpg", -IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, IoAttackLogs.H - 12);
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/banner.jpg", -IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, 92);
        let mask: Shape = as3.as(mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, IoAttackLogs.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
        // (the kit's forged rim, 11 October)
        IoKit.rim(mc, "ioLogRim", -IoAttackLogs.W / 2, -IoAttackLogs.H / 2, IoAttackLogs.W, IoAttackLogs.H, bg);
    }

    public static closeButton(name: string, onClick: Function): Sprite {
        // (the kit's close button, 11 October)
        let x: Sprite = IoKit.closeButton(name, 14, (e: any): void => {});
        x.x = IoAttackLogs.W / 2 - 24;
        x.y = -IoAttackLogs.H / 2 + 24;
        x.addEventListener(MouseEvent.CLICK, onClick);
        return x;
    }

    // ---- a scrolling view: a panel, its masked content, a bar (the wheel, the bar's track and thumb)
    public static scrollView(parent: Sprite, x: int, y: int, w: int, h: int): any {
        let view: any = null;
        let holder: Sprite = null;
        let content: Sprite = null;
        let track: Sprite = null;
        let thumb: Sprite = null;
        let dragFrom: number = NaN;
        let place: Function = null;
        let move: Function = null;
        let up: Function = null;
        view = { "offset": 0, "h": h - 2 };
        let box: Sprite = as3.as(parent.addChild(CasinoUI.panel(w, h, 0.9)), Sprite);
        box.x = x;
        box.y = y;
        holder = as3.as(parent.addChild(new Sprite()), Sprite);
        holder.x = x + 2;
        holder.y = y + 1;
        // (the empty part of the view takes the wheel too)
        holder.graphics.beginFill(0, 0);
        holder.graphics.drawRect(0, 0, w - 4, h - 2);
        holder.graphics.endFill();
        content = as3.as(holder.addChild(new Sprite()), Sprite);
        let mask: Shape = as3.as(holder.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRect(0, 0, w - 4, h - 2);
        mask.graphics.endFill();
        content.mask = mask;
        track = as3.as(holder.addChild(new Sprite()), Sprite);
        track.graphics.beginFill(2759190, 1);
        track.graphics.drawRoundRect(0, 0, IoAttackLogs.BAR_W, h - 6, 8, 8);
        track.graphics.endFill();
        track.x = w - IoAttackLogs.BAR_W - 6;
        track.y = 2;
        track.buttonMode = true;
        thumb = as3.as(holder.addChild(new Sprite()), Sprite);
        thumb.x = track.x;
        thumb.buttonMode = true;
        view.content = content;
        view.track = track;
        view.thumb = thumb;
        view.total = 0;
        dragFrom = 0;
        place = (): void => {
            let max: number = Math.max(0, view.total - view.h);
            view.offset = Math.max(0, Math.min(max, Number(view.offset)));
            content.y = -view.offset;
            if (thumb.visible) {
                let room: number = track.height - thumb.height;
                thumb.y = Number(2 + (max > 0 ? Math.round(room * view.offset / max) : 0));
            }
        };
        move = (e: MouseEvent): void => {
            let room: number = track.height - thumb.height;
            let ty: number = Math.max(0, Math.min(room, holder.mouseY - dragFrom - 2));
            view.offset = room > 0 ? ty / room * Math.max(0, view.total - view.h) : 0;
            place();
        };
        up = (e: Event = null): void => {
            if (GLOBAL._ROOT.stage) {
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, up);
            }
        };
        let wheel: Function = (e: MouseEvent): void => {
            e.stopPropagation();
            view.offset += (e.delta > 0 ? -1 : 1) * IoAttackLogs.WHEEL_PX;
            place();
        };
        holder.addEventListener(MouseEvent.MOUSE_WHEEL, wheel);
        // (and on the panel under it: the browser client doesn't hit an empty part of the holder)
        box.addEventListener(MouseEvent.MOUSE_WHEEL, wheel);
        IoPinchZoom.swipe(holder, (d: number): void => { view.offset -= d; place(); }); // (QoL #545: a finger drags the list)
        track.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            let page: number = view.h - IoAttackLogs.ROW_H;
            view.offset += holder.mouseY < thumb.y ? -page : page;
            place();
        });
        thumb.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
            dragFrom = holder.mouseY - thumb.y;
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, up);
        });
        content.addEventListener(Event.REMOVED_FROM_STAGE, up);
        view.place = place;
        view.stop = up;
        /** The content is `total` tall now (back to the top when `top`). */
        view.setTotal = (total: number, top: boolean): void => {
            view.total = total;
            if (top) {
                view.offset = 0;
            }
            let show: boolean = total > view.h;
            track.visible = thumb.visible = show;
            if (show) {
                let thumbH: int = Math.max(28, ((view.h - 4) * view.h / total) | 0) | 0;
                thumb.graphics.clear();
                thumb.graphics.lineStyle(1, 16760928, 1);
                thumb.graphics.beginFill(13127706, 1);
                thumb.graphics.drawRoundRect(0, 0, IoAttackLogs.BAR_W, thumbH, 8, 8);
                thumb.graphics.endFill();
            }
            place();
        };
        return view;
    }

    // ---- tabs, rows
    private tabClick(i: int): Function {
        return (e: MouseEvent): void => {
            this.selectTab(i);
        };
    }

    public selectTab(i: int): void {
        IoAttackLogs._tab = i;
        for (let k: int = 0; k < this._tabs.length; k++) {
            CasinoUI.choose(as3.cast(this._tabs[k], Sprite), k == i);
        }
        this.closeDetail();
        this.fill(true);
    }

    private logs(): any[] {
        return this._data ? as3.as((IoAttackLogs._tab == 0 ? this._data.mine : this._data.onme), Array) : [];
    }

    /** QoL #93: a filter changed: its button says the new choice (molten while it filters), the list again from the top. */
    private ioFiltersChanged(): void {
        if (this._ioTypeBtn) {
            CasinoUI.relabel(this._ioTypeBtn, KEYS.Get(as3.str(IoAttackLogs.IO_TYPE_KEYS[IoAttackLogs._ioType])));
            CasinoUI.choose(this._ioTypeBtn, IoAttackLogs._ioType != 0);
        }
        if (this._ioResultBtn) {
            CasinoUI.relabel(this._ioResultBtn, KEYS.Get(as3.str(IoAttackLogs.IO_RESULT_KEYS[IoAttackLogs._ioResult])));
            CasinoUI.choose(this._ioResultBtn, IoAttackLogs._ioResult != 0);
        }
        this.fill(true);
    }

    /** Whether the player won it: their attack destroyed 90% or more; an attack on them, held under that. */
    private ioWon(log: any): boolean {
        let won: boolean = (log.damage | 0) >= IoAttackLogs.IO_WON;
        return IoAttackLogs._tab == 0 ? won : !won;
    }

    /** QoL #93: the logs the filters let through (a tribe yard: no player on the other side). */
    private ioFiltered(list: any[]): any[] {
        if (!GLOBAL.INFERNO_ONLY || (IoAttackLogs._ioType == 0 && IoAttackLogs._ioResult == 0)) {
            return list;
        }
        return list.filter((l: any): boolean => {
            let tribe: boolean = l.type == "tribe" || (l.uid | 0) <= 0;
            if ((IoAttackLogs._ioType == 1 && tribe) || (IoAttackLogs._ioType == 2 && !tribe)) {
                return false;
            }
            if (IoAttackLogs._ioResult != 0) {
                // (one still going on is neither)
                if (this.inProgress(l)) {
                    return false;
                }
                if ((IoAttackLogs._ioResult == 1) != this.ioWon(l)) {
                    return false;
                }
            }
            return true;
        });
    }

    /** QoL #93: "Last 24 hours: 12 attacks by you (3.4M taken) · 5 on you (1.1M lost)". */
    private ioDayText(): string {
        let day: any = this._data ? this._data.day : null;
        if (!day || !as3.is(day.mine, Array) || !as3.is(day.onme, Array)) {
            return "";
        }
        let sum: Function = (a: any[]): number => Number(a[1] || 0) + Number(a[2] || 0) + Number(a[3] || 0) + Number(a[4] || 0);
        return KEYS.Get("io_al3_day", { "v1": GLOBAL.FormatNumber(day.mine[0] | 0), "v2": GLOBAL.ioShort(sum(day.mine)), "v3": GLOBAL.FormatNumber(day.onme[0] | 0), "v4": GLOBAL.ioShort(sum(day.onme)) });
    }

    /** QoL #93: the "Load older" line at the foot of the list (the tab's side has older logs on the server). */
    private ioOlderRow(index: int): Sprite {
        let line: Sprite = new Sprite();
        line.name = "ioAlLoadOlderRow";
        line.graphics.beginFill((index % 2 == 0 ? 0x2A1C18 : 0x221613) >>> 0, 0.6);
        line.graphics.drawRect(0, 0, IoAttackLogs.ROW_W, IoAttackLogs.ioRowH - 1);
        line.graphics.endFill();
        let label: string = KEYS.Get(this._ioLoadingOlder ? "io_al3_loading_older" : (this._ioOlderFailed ? "io_al3_older_failed" : "io_al3_load_older"));
        let b: Sprite = as3.as(line.addChild(CasinoUI.button(label, 200, 22, (e: MouseEvent): void => {
            this.ioLoadOlder();
        }, !this._ioLoadingOlder, 12)), Sprite);
        b.name = "ioAlLoadOlder";
        b.x = ((IoAttackLogs.ROW_W - 200) / 2) | 0;
        b.y = ((IoAttackLogs.ioRowH - 22) / 2) | 0;
        return line;
    }

    /** QoL #93: the tab's next page, older than its last log (attacklogs/game side, before), added to the list. */
    private ioLoadOlder(): void {
        let data: any = this._data;
        if (this._ioLoadingOlder || !data) {
            return;
        }
        let side: string = IoAttackLogs._tab == 0 ? "mine" : "onme";
        let list: any[] = as3.as(data[side], Array) || [];
        if (!list.length) {
            return;
        }
        let last: any = list[list.length - 1];
        this._ioLoadingOlder = true;
        this._ioOlderFailed = false;
        this.fill(false);
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["side", side], ["before", last.id | 0]], (r: any): void => {
            this._ioLoadingOlder = false;
            // (a refresh came in between, or the window closed: this page is dropped)
            if (!this.mc || this._data != data) {
                return;
            }
            if (!r || r.error) {
                this._ioOlderFailed = true;
                this.fill(false);
                return;
            }
            let have: any = {};
            for (let l of as3.values(list)) {
                have[String(l.id)] = true;
            }
            for (let row of as3.values(as3.as(r.rows, Array) || [])) {
                let log: any = IoAttackLogs.parseRow(row);
                if (!have[String(log.id)]) {
                    list.push(log);
                }
            }
            if (!data.more) {
                data.more = {};
            }
            data.more[side] = Boolean(r.more);
            this.fill(false);
        }, (e: IOErrorEvent): void => {
            this._ioLoadingOlder = false;
            if (this.mc && this._data == data) {
                this._ioOlderFailed = true;
                this.fill(false);
            }
        });
    }

    private fill(top: boolean): void {
        if (!this.mc) {
            return;
        }
        CasinoUI.removeAll(this._rows);
        let all: any[] = this.logs();
        // (Inferno-only, QoL #93: the filters)
        let list: any[] = this.ioFiltered(all);
        if (this._ioTotals) {
            this._ioTotals.text = this.ioDayText();
        }
        this._status.text = this._data ? (list.length ? "" : (all.length ? KEYS.Get("io_al3_none_filtered") : KEYS.Get(IoAttackLogs._tab == 0 ? "al_none_mine" : "al_none_onme"))) : (this._failed ? KEYS.Get("al_failed") : IoWin.loadingText(KEYS.Get("al_loading")));
        this._count.text = !this._data ? "" : (list.length == 1 ? KEYS.Get("al_count_one") : KEYS.Get("al_count", { "v1": GLOBAL.FormatNumber(list.length) }));
        if (this._data && this._ioStale != null && this._ioStale !== undefined) {
            this._count.text += "  \u00B7  " + KEYS.Get("io_al_stale", { "v1": GLOBAL.ioDuration(GLOBAL.Timestamp() - (this._data.fetchedAt | 0)) });
        } else if (GLOBAL.INFERNO_ONLY && this._data) {
            // (QoL #454: "Refreshing…" while a new list is asked for, then when it is from, on the player's clock)
            this._count.text += "  \u00B7  " + (this._loading ? KEYS.Get("io_al_refreshing") : KEYS.Get("io_al_updated", { "v1": IoAttackLogs.ioClock(this._data.fetchedAt | 0) }));
        }
        // (Inferno-only, QoL #314: the same attack over and over, in a row, is one line: "×6", the best damage, the
        // loot together; a click on its name opens it)
        let shown: any[] = GLOBAL.INFERNO_ONLY ? IoAttackLogs.ioGrouped(list) : list;
        let rowsShown: int = 0;
        for (let i: int = 0; i < shown.length; i++) {
            let item: any = shown[i];
            let group: any[] = item && item.ioGroup ? as3.as(item.ioGroup, Array) : null;
            let line: Sprite = group ? this.ioGroupRow(item, rowsShown) : this.makeRow(item, rowsShown);
            line.y = rowsShown * IoAttackLogs.ioRowH;
            this._rows.addChild(line);
            rowsShown++;
            if (group && IoAttackLogs._ioOpenGroups[item.ioKey]) {
                for (let g of as3.values(group)) {
                    let sub: Sprite = this.makeRow(g, rowsShown);
                    sub.y = rowsShown * IoAttackLogs.ioRowH;
                    sub.alpha = 0.9;
                    this._rows.addChild(sub);
                    rowsShown++;
                }
            }
        }
        // (Inferno-only, QoL #93: older logs on the server, a page at a time; it showed the latest 60 only)
        if (GLOBAL.INFERNO_ONLY && this._data && this._data.more && this._data.more[IoAttackLogs._tab == 0 ? "mine" : "onme"] && all.length) {
            let older: Sprite = this.ioOlderRow(rowsShown);
            older.y = rowsShown * IoAttackLogs.ioRowH;
            this._rows.addChild(older);
            rowsShown++;
        }
        this._list.setTotal(rowsShown * IoAttackLogs.ioRowH, top);
        if (this._data && IoAttackLogs.ioReturnOffset >= 0) {
            // (QoL #95: back from a replay: where the list was)
            this._list.offset = IoAttackLogs.ioReturnOffset;
            IoAttackLogs.ioReturnOffset = -1;
            this._list.place();
        }
    }

    /** QoL #314: the groups opened (by their key), while the game runs. */
    private static _ioOpenGroups: any = {};

    /** The same target (or attacker) again and again in a row, none still going on, none with a replay: grouped. */
    public static ioGrouped(list: any[]): any[] {
        let out: any[] = [];
        let keyOf: Function = (l: any): string => [l.uid, l.name, l.type, l.level, l.x, l.y].join("|");
        let groupable: Function = (l: any): boolean => !l.replay && Boolean(l.ended);
        for (let l of as3.values(list)) {
            let last: any = out.length ? out[out.length - 1] : null;
            let lastLog: any = last ? (last.ioGroup ? last.ioGroup[0] : last) : null;
            if (lastLog && groupable(l) && groupable(lastLog) && keyOf(l) == keyOf(lastLog)) {
                if (!last.ioGroup) {
                    last = out[out.length - 1] = { "ioGroup": [lastLog], "ioKey": keyOf(lastLog) + "@" + lastLog.at };
                }
                last.ioGroup.push(l);
                continue;
            }
            out.push(l);
        }
        return out;
    }

    /** A group's line: when (the latest), the name ×N, the yard, the best damage, the loot together. */
    private ioGroupRow(item: any, index: int): Sprite {
        let group: any[] = as3.as(item.ioGroup, Array);
        let first: any = group[0];
        let best: int = 0;
        let loot: any[] = [0, 0, 0, 0];
        for (let g of as3.values(group)) {
            best = Math.max(best, g.damage | 0) | 0;
            let gl: any[] = as3.as(g.loot, Array) || [];
            for (let i: int = 0; i < 4; i++) {
                loot[i] += Number(gl[i]) || 0;
            }
        }
        let sum: any = Object.assign({}, first, { "damage": best, "loot": loot, "replay": null });
        let toggle: Function = (): void => {
            SOUNDS.Play("click1");
            if (IoAttackLogs._ioOpenGroups[item.ioKey]) {
                delete IoAttackLogs._ioOpenGroups[item.ioKey];
            } else {
                IoAttackLogs._ioOpenGroups[item.ioKey] = true;
            }
            this.fill(false);
        };
        // (QoL #559: on a phone a tap on the group's line opens or closes it)
        let line: Sprite = this.makeRow(sum, index, toggle);
        line.name = "ioAlGroup" + index;
        // (each attack's own Report is on its line, once the group is opened)
        let report: any = line.getChildByName("ioAlReport");
        if (report) {
            line.removeChild(report);
        }
        let open: boolean = Boolean(IoAttackLogs._ioOpenGroups[item.ioKey]);
        // the name: "▸ Name ×6"; the result: "best 16%"
        let x: int = 0;
        for (let column of as3.values(IoAttackLogs.COLUMNS)) {
            let key: string = String(column[0]);
            if (key == "name" || key == "result") {
                for (let c: int = 0; c < line.numChildren; c++) {
                    let t: TextField = as3.as(line.getChildAt(c), TextField);
                    if (t && Math.abs(t.x - (x + 4)) < 1) {
                        t.text = key == "name" ? (open ? "▾ " : "▸ ") + String(first.name) + " ×" + group.length : KEYS.Get("io_al_best", { "v1": best });
                        GLOBAL.ioFitText(t);
                    }
                }
            }
            x = (x + column[2]) | 0;
        }
        let hit: Sprite = as3.as(line.addChild(new Sprite()), Sprite);
        hit.name = "ioAlGroupOpen";
        hit.graphics.beginFill(0, 0);
        hit.graphics.drawRect(IoAttackLogs.COLUMNS[0][2], 0, IoAttackLogs.COLUMNS[1][2], IoAttackLogs.ioRowH - 1);
        hit.graphics.endFill();
        hit.buttonMode = true;
        hit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            toggle();
        });
        return line;
    }

    // ---- Inferno-only (QoL #559): the rows on a phone (GLOBAL.ioOnPhone): taller, a tap on the row opens its report,
    // and one "⋯" button has the replay's choices and Jump (or Revenge): Report, Replay and Jump were three 13 px
    // buttons side by side at a landscape phone's 0.58. (The game's font has "…", not "⋯".)
    public static get ioPhone(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.ioOnPhone;
    }

    /** A row's height (ROW_H; on a phone 38). */
    public static get ioRowH(): int {
        return IoAttackLogs.ioPhone ? 38 : IoAttackLogs.ROW_H;
    }

    /** The "⋯" button's width, on a phone. */
    private static readonly IO_MORE_W: int = 64;

    /** QoL #559: a phone's "⋯" menu: the replay's choices (there is one), then Jump or Revenge, under the button. */
    private ioMoreMenu(log: any, button: Sprite, index: int): void {
        let self: IoAttackLogs = null;
        let key: string = null;
        self = this;
        key = "ioAlMoreMenu" + index;
        if (this._replayMenu) {
            if (this._replayMenu.parent) {
                this._replayMenu.parent.removeChild(this._replayMenu);
            }
            let same: boolean = this._replayMenu.name == key;
            this._replayMenu = null;
            if (same) {
                return;
            }
        }
        let items: any[] = [];
        if (log.replay) {
            let replayKey: string = String(log.replay);
            items.push(["ioAlReplayWatch", "al_replay_watch", (): void => {
                // (QoL #95: the replay's Close comes back here, scrolled as it was)
                IoAttackLogs.ioReturnOffset = Number(self._list.offset) || 0;
                self.close();
                IoReplays.Watch(replayKey, true);
            }]);
            items.push(["ioAlReplayGlobal", "al_replay_global", (): void => {
                IoReplays.Share(replayKey, BYMChat.IO_GLOBAL);
            }]);
            items.push(["ioAlReplayAlliance", "al_replay_alliance", (): void => {
                IoReplays.Share(replayKey, BYMChat.IO_ALLIANCE);
            }]);
            items.push(["ioAlReplayDownload", "al_replay_download", (): void => {
                IoReplays.Download(replayKey);
            }]);
        }
        // (Inferno-only, QoL #99: Brag or Talk trash, posted to chat)
        items = items.concat(IoAttackLogs.ioBragItems(log));
        if (IoAttackLogs.ioRevenge(log)) {
            items.push(["ioAlRevenge", "io_al_revenge", (): void => {
                self.close();
                IoMapShare.OpenOwnWorld(log.hx | 0, log.hy | 0);
            }]);
        } else if (log.x >= 0 && log.y >= 0) {
            items.push(["ioAlJump", "lb_jump", (): void => {
                self.jumpTo(log);
            }]);
        }
        if (!items.length) {
            return;
        }
        let bh: int = 32;
        let step: int = 38;
        let menuH: int = (12 + items.length * step) | 0;
        let menu: Sprite = CasinoUI.panel(216, menuH, 0.98);
        menu.name = key;
        let y: int = 8;
        for (let item of as3.values(items)) {
            let act: Function = as3.as(item[2], Function);
            let b: Sprite = as3.as(menu.addChild(CasinoUI.button(KEYS.Get(as3.str(item[1])), 200, bh, this.actionOf(act, menu), true, 13)), Sprite);
            b.name = as3.str(item[0]);
            b.x = 8;
            b.y = y;
            y += step;
        }
        let at: Point = this.mc.globalToLocal(button.localToGlobal(new Point(0, button.height + 2)));
        menu.x = Math.min(IoAttackLogs.W / 2 - 224, at.x + IoAttackLogs.IO_MORE_W - 216);
        // (below the button, or above it near the foot of the window)
        menu.y = at.y + menuH > IoAttackLogs.H / 2 - 8 ? at.y - button.height - 4 - menuH : at.y;
        this.mc.addChild(menu);
        this._replayMenu = menu;
    }

    /** An attack on the player by another player whose main yard is known: Revenge rather than Jump (QoL #89). */
    private static ioRevenge(log: any): boolean {
        return (log.uid | 0) > 0 && (log.hx | 0) >= 0 && (log.hy | 0) >= 0 && (log.uid | 0) != LOGIN._playerID;
    }

    /**
     * Inferno-only (QoL #99): a finished attack's Brag (My attacks: IoBrag.MIN_DAMAGE or more of the yard destroyed)
     * or Talk trash (Attacks on me: another player's attack with a replay), as menu items [name, key, act]. IoBrag
     * posts the line to chat with the replay's token (a Brag without a replay: the yard's map token). None otherwise.
     */
    private static ioBragItems(log: any): any[] {
        if (!GLOBAL.INFERNO_ONLY || !log || !log.ended || !log.name) {
            return [];
        }
        let damage: int = Math.max(0, Math.min(100, log.damage | 0)) | 0;
        let me: string = LOGIN._playerName ? String(LOGIN._playerName) : "";
        if (IoAttackLogs._tab == 0) {
            if (damage < IoBrag.MIN_DAMAGE) {
                return [];
            }
            let token: string = log.replay ? IoBrag.ReplayToken(String(log.replay), me, log.name, damage) : (log.x >= 0 && log.y >= 0 ? IoBrag.MapToken(Number(log.x), Number(log.y)) : null);
            if (!token) {
                return [];
            }
            return [["ioAlBrag", "io_brag_btn", (): void => {
                IoBrag.Post(IoBrag.BragText(log.name, damage, IoAttackLogs.lootTotal(log)), token);
            }]];
        }
        if (!log.replay || (log.uid | 0) == LOGIN._playerID) {
            return [];
        }
        let trash: string = IoBrag.ReplayToken(String(log.replay), log.name, me, damage);
        return [["ioAlTrash", "io_brag_trash_btn", (): void => {
            IoBrag.Post(IoBrag.TrashText(log.name, damage), trash);
        }]];
    }

    private makeRow(log: any, index: int, onTap: Function = null): Sprite {
        let replay: Sprite = null;
        let rowH: int = IoAttackLogs.ioRowH;
        let line: Sprite = new Sprite();
        line.name = "ioAlRow" + index;
        line.graphics.beginFill((index % 2 == 0 ? 0x2A1C18 : 0x221613) >>> 0, 0.85);
        line.graphics.drawRect(0, 0, IoAttackLogs.ROW_W, rowH - 1);
        line.graphics.endFill();
        let x: int = 0;
        for (let column of as3.values(IoAttackLogs.COLUMNS)) {
            let key: string = String(column[0]);
            let cell: TextField = as3.as(line.addChild(CasinoUI.label(this.cellText(log, key), 12, this.cellColour(log, key), key == "name", (column[2] - 8) | 0, as3.str(column[3]))), TextField);
            cell.x = x + 4;
            cell.y = ((rowH - 18) / 2) | 0;
            // (QoL #564: on a phone not under 9, the time not under 11)
            IoPhoneText.fit(cell, 8, key == "when");
            // (Inferno-only, QoL #572: the exact date and time when the pointer is over "3 h ago"; not on a phone,
            // where the row itself is the button)
            if (GLOBAL.INFERNO_ONLY && key == "when" && !IoAttackLogs.ioPhone && (log.at | 0) > 0) {
                IoFormat.hover(cell, log.at | 0);
            }
            x = (x + column[2]) | 0;
        }
        if (IoAttackLogs.ioPhone) {
            // (QoL #559: the row is the report's button; "⋯" has the rest)
            line.buttonMode = true;
            line.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (e.target !== line) {
                    return;
                }
                if (onTap != null) {
                    onTap();
                    return;
                }
                SOUNDS.Play("click1");
                this.openDetail(log);
            });
            if (log.replay || IoAttackLogs.ioRevenge(log) || log.x >= 0 && log.y >= 0) {
                let more: Sprite = null;
                more = as3.as(line.addChild(CasinoUI.button("\u2026", IoAttackLogs.IO_MORE_W, rowH - 8, (e: MouseEvent): void => {
                    this.ioMoreMenu(log, more, index);
                }, true, 16)), Sprite);
                more.name = "ioAlMore";
                more.x = IoAttackLogs.ROW_W - IoAttackLogs.IO_MORE_W - 4;
                more.y = 4;
            }
            return line;
        }
        let report: Sprite = as3.as(line.addChild(CasinoUI.button(KEYS.Get("al_report"), IoAttackLogs.REPORT_W, 22, (e: MouseEvent): void => {
            this.openDetail(log);
        }, true, 12)), Sprite);
        report.name = "ioAlReport";
        report.x = IoAttackLogs.ROW_W - IoAttackLogs.JUMP_W - IoAttackLogs.REPORT_W - 10;
        report.y = 4;
        // Inferno-only (3 October): a player-against-player attack's replay: Watch, Share, Download
        if (log.replay) {
            replay = as3.as(line.addChild(CasinoUI.button(KEYS.Get("al_replay"), IoAttackLogs.REPLAY_W, 22, (e: MouseEvent): void => {
                this.replayMenu(log, replay);
            }, true, 12)), Sprite);
            replay.name = "ioAlReplay";
            replay.x = report.x - IoAttackLogs.REPLAY_W - 6;
            replay.y = 4;
        }
        // (Inferno-only, QoL #89: on an attack on the player, Revenge in Jump's place opens the map on the attacker's
        // main yard; Jump went to the player's own yard)
        if ((log.uid | 0) > 0 && (log.hx | 0) >= 0 && (log.hy | 0) >= 0 && (log.uid | 0) != LOGIN._playerID) {
            let revenge: Sprite = as3.as(line.addChild(CasinoUI.button(KEYS.Get("io_al_revenge"), IoAttackLogs.JUMP_W + 8, 22, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this.close();
                IoMapShare.OpenOwnWorld(log.hx | 0, log.hy | 0);
            }, true, 11)), Sprite);
            revenge.name = "ioAlRevenge";
            revenge.x = IoAttackLogs.ROW_W - IoAttackLogs.JUMP_W - 12;
            revenge.y = 4;
        } else if (log.x >= 0 && log.y >= 0) {
            let jump: Sprite = as3.as(line.addChild(CasinoUI.button(KEYS.Get("lb_jump"), IoAttackLogs.JUMP_W, 22, (e: MouseEvent): void => {
                this.jumpTo(log);
            }, true, 12)), Sprite);
            jump.name = "ioAlJump";
            jump.x = IoAttackLogs.ROW_W - IoAttackLogs.JUMP_W - 4;
            jump.y = 4;
        }
        return line;
    }

    /** "5 min ago", "3 h ago", "2 d ago" (by the server's clock). */
    private ago(at: int): string {
        let now: int = (this._data ? (this._data.now | 0) + (GLOBAL.Timestamp() - (this._data.fetchedAt | 0)) : GLOBAL.Timestamp()) | 0;
        let s: int = Math.max(0, now - at) | 0;
        // (Inferno-only, QoL #572: the game's one "time ago" (IoFormat.since, short): weeks, months and years too,
        // where it said "200 d ago")
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.since(s, true, this.ioLocalAt(at));
        }
        if (s < 60) {
            return KEYS.Get("al_just_now");
        }
        if (s < 3600) {
            return KEYS.Get("al_min_ago", { "v1": (s / 60) | 0 });
        }
        if (s < 86400) {
            return KEYS.Get("al_h_ago", { "v1": (s / 3600) | 0 });
        }
        return KEYS.Get("al_d_ago", { "v1": (s / 86400) | 0 });
    }

    private yardText(log: any): string {
        if (log.type == "tribe") {
            return KEYS.Get("al_yard_tribe", { "v1": log.level });
        }
        if (log.type == "outpost") {
            return KEYS.Get("al_yard_outpost");
        }
        return KEYS.Get("al_yard_main");
    }

    /**
     * (QoL #572) A time from the list on the game's clock (IoFormat.now): the list's own clock (its "now") may differ
     * from it by a little.
     */
    private ioLocalAt(at: int): number {
        if (!this._data || !(this._data.now > 0)) {
            return at;
        }
        return at + ((this._data.fetchedAt | 0) - (this._data.now | 0));
    }

    private inProgress(log: any): boolean {
        // (an attack lasts minutes: one not ended an hour later was left without its last save)
        let now: int = this._data ? this._data.now | 0 : GLOBAL.Timestamp();
        return !log.ended && now - (log.at | 0) < 3600;
    }

    private cellText(log: any, key: string): string {
        switch (key) {
            case "when":
                return this.ago(log.at | 0);
            case "name":
                return String(log.name);
            case "yard":
                return this.yardText(log);
            case "result":
                return this.inProgress(log) ? KEYS.Get("al_in_progress") : KEYS.Get("al_damage", { "v1": log.damage });
            case "loot":
                let total: number = IoAttackLogs.lootTotal(log);
                // (Inferno-only, QoL #578: the main resource and how much, short, and "+2" for the others; it was
                // one sum of four different resources)
                if (GLOBAL.INFERNO_ONLY && total > 0) {
                    let loot: any[] = as3.as(log.loot, Array) || [];
                    let best: int = 0;
                    let kinds: int = 0;
                    for (let i: int = 0; i < 4; i++) {
                        if (Number(loot[i]) > 0) {
                            kinds++;
                            if (Number(loot[i]) > Number(loot[best])) {
                                best = i;
                            }
                        }
                    }
                    return GLOBAL.ioShort(Number(loot[best])) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[best])) + (kinds > 1 ? " +" + (kinds - 1) : "");
                }
                return total > 0 ? GLOBAL.FormatNumber(total) : "-";
        }
        return "";
    }

    private cellColour(log: any, key: string): uint {
        if (key == "name") {
            return CasinoUI.GOLD;
        }
        if (key == "result" && !this.inProgress(log)) {
            return ((log.damage | 0) >= 90 ? CasinoUI.WIN : ((log.damage | 0) > 0 ? 0xFFD58A : CasinoUI.ASH)) >>> 0;
        }
        if (key == "loot" && IoAttackLogs.lootTotal(log) > 0) {
            return IoAttackLogs._tab == 0 ? CasinoUI.WIN : CasinoUI.LOSS;
        }
        return 14207160;
    }

    private static lootTotal(log: any): number {
        let total: number = 0;
        for (const $value of as3.values(as3.as(log.loot, Array))) {
            let n: number = Number($value);
            total += n;
        }
        return total;
    }

    private static lootLines(log: any): string {
        let parts: any[] = [];
        let loot: any[] = as3.as(log.loot, Array);
        for (let i: int = 0; i < 4; i++) {
            if (loot && Number(loot[i]) > 0) {
                parts.push(GLOBAL.FormatNumber(Number(loot[i])) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[i])));
            }
        }
        return parts.length ? parts.join(", ") : KEYS.Get("al_no_loot");
    }

    private jumpTo(log: any): void {
        SOUNDS.Play("click1");
        let x: int = log.x | 0;
        let y: int = log.y | 0;
        this.close();
        IoMapShare.OpenOwnWorld(x, y);
    }

    /** A replay's choices, under its button: Watch, Share in Global / Alliance chat, Download. */
    private replayMenu(log: any, button: Sprite): void {
        let self: IoAttackLogs = null;
        let key: string = null;
        self = this;
        key = String(log.replay);
        if (this._replayMenu) {
            if (this._replayMenu.parent) {
                this._replayMenu.parent.removeChild(this._replayMenu);
            }
            let same: boolean = this._replayMenu.name == "ioAlReplayMenu_" + key;
            this._replayMenu = null;
            if (same) {
                return;
            }
        }
        let items: any[] = [["ioAlReplayWatch", "al_replay_watch", (): void => {
            // (QoL #95: the replay's Close comes back here, scrolled as it was)
            IoAttackLogs.ioReturnOffset = Number(self._list.offset) || 0;
            self.close();
            IoReplays.Watch(key, true);
        }], ["ioAlReplayGlobal", "al_replay_global", (): void => {
            IoReplays.Share(key, BYMChat.IO_GLOBAL);
        }], ["ioAlReplayAlliance", "al_replay_alliance", (): void => {
            IoReplays.Share(key, BYMChat.IO_ALLIANCE);
        }], ["ioAlReplayDownload", "al_replay_download", (): void => {
            IoReplays.Download(key);
        }]];
        // (Inferno-only, QoL #99: Brag or Talk trash, posted to chat; the menu as tall as its buttons: 132 for four)
        items = items.concat(IoAttackLogs.ioBragItems(log));
        let menuH: int = (12 + items.length * 30) | 0;
        let menu: Sprite = CasinoUI.panel(196, menuH, 0.98);
        menu.name = "ioAlReplayMenu_" + key;
        let y: int = 8;
        for (let item of as3.values(items)) {
            let act: Function = as3.as(item[2], Function);
            let b: Sprite = as3.as(menu.addChild(CasinoUI.button(KEYS.Get(as3.str(item[1])), 180, 24, this.actionOf(act, menu), true, 12)), Sprite);
            b.name = as3.str(item[0]);
            b.x = 8;
            b.y = y;
            y += 30;
        }
        let at: Point = this.mc.globalToLocal(button.localToGlobal(new Point(0, 26)));
        menu.x = Math.min(IoAttackLogs.W / 2 - 200, at.x - 140);
        menu.y = Math.min(IoAttackLogs.H / 2 - menuH - 8, at.y);
        this.mc.addChild(menu);
        this._replayMenu = menu;
    }

    private actionOf(act: Function, menu: Sprite): Function {
        let self: IoAttackLogs = null;
        self = this;
        return (e: MouseEvent): void => {
            if (menu.parent) {
                menu.parent.removeChild(menu);
            }
            self._replayMenu = null;
            act();
        };
    }

    private openDetail(log: any): void {
        let d: Sprite = null;
        let view: any = null;
        let text: TextField = null;
        this.closeDetail();
        d = as3.as(this.mc.addChild(new Sprite()), Sprite);
        d.name = "ioAlDetail";
        this._detail = d;
        // (over the list and the tabs: the window's frame stays)
        let cover: Sprite = as3.as(d.addChild(CasinoUI.panel((IoAttackLogs.W - 24) | 0, (IoAttackLogs.H - 112) | 0, 0.98)), Sprite);
        cover.x = -IoAttackLogs.W / 2 + 12;
        cover.y = -IoAttackLogs.H / 2 + 100;
        let heading: string = IoAttackLogs._tab == 0 ? KEYS.Get("al_detail_mine", { "v1": log.name }) : KEYS.Get("al_detail_onme", { "v1": log.name });
        let head: TextField = as3.as(d.addChild(CasinoUI.label(heading, 18, CasinoUI.GOLD, true, (IoAttackLogs.W - 200) | 0, TextFormatAlign.LEFT)), TextField);
        head.x = IoAttackLogs.LIST_X;
        head.y = -IoAttackLogs.H / 2 + 112;
        GLOBAL.ioFitText(head);
        let back: Sprite = as3.as(d.addChild(CasinoUI.button(KEYS.Get("al_back"), 90, 28, (e: MouseEvent): void => {
            this.closeDetail();
        }, true, 13)), Sprite);
        back.name = "ioAlBack";
        back.x = IoAttackLogs.W / 2 - 20 - 90;
        back.y = -IoAttackLogs.H / 2 + 110;
        if (log.x >= 0 && log.y >= 0) {
            let jump: Sprite = as3.as(d.addChild(CasinoUI.button(KEYS.Get("lb_jump"), 70, 28, (e: MouseEvent): void => {
                this.jumpTo(log);
            }, true, 13)), Sprite);
            jump.name = "ioAlDetailJump";
            jump.x = back.x - 78;
            jump.y = back.y;
        }
        // (Inferno-only, QoL #573: and the date and time, the player's own)
        let when: string = this.ago(log.at | 0);
        if (GLOBAL.INFERNO_ONLY && (log.at | 0) > 0) {
            // (QoL #574: the game's one date and time, in the player's language: IoFormat.exact)
            when += "  \u00B7  " + IoFormat.exact(log.at | 0);
        }
        let facts: any[] = [[KEYS.Get("al_f_when"), when], [KEYS.Get("al_f_yard"), this.yardText(log) + (log.x >= 0 ? "  (" + IoMapUi.coord(log.x | 0, log.y | 0) + ")" : "")], [KEYS.Get("al_f_result"), this.inProgress(log) ? KEYS.Get("al_in_progress") : KEYS.Get("al_damage", { "v1": log.damage }) + (log.ended ? "" : " " + KEYS.Get("al_unfinished"))], [KEYS.Get("al_f_destroyed"), GLOBAL.FormatNumber(log.destroyed | 0)], [KEYS.Get(IoAttackLogs._tab == 0 ? "al_f_loot" : "al_f_lost"), IoAttackLogs.lootLines(log)]];
        let y: int = (-IoAttackLogs.H / 2 + 150) | 0;
        for (let f of as3.values(facts)) {
            let label: TextField = as3.as(d.addChild(CasinoUI.label(as3.str(f[0]), 13, CasinoUI.ASH, true, 150, TextFormatAlign.LEFT)), TextField);
            label.x = IoAttackLogs.LIST_X;
            label.y = y;
            GLOBAL.ioFitText(label);
            let value: TextField = as3.as(d.addChild(CasinoUI.label(as3.str(f[1]), 13, 16773336, false, (IoAttackLogs.LIST_W - 160) | 0, TextFormatAlign.LEFT)), TextField);
            value.x = IoAttackLogs.LIST_X + 156;
            value.y = y;
            GLOBAL.ioFitText(value);
            y += 22;
        }
        let reportTop: int = (y + 8) | 0;
        let reportH: int = (IoAttackLogs.H / 2 - 24 - reportTop) | 0;
        view = IoAttackLogs.scrollView(d, IoAttackLogs.LIST_X, reportTop, IoAttackLogs.LIST_W, reportH);
        text = new TextField();
        text.name = "ioAlReportText";
        text.selectable = false;
        text.mouseEnabled = false;
        text.multiline = true;
        text.wordWrap = true;
        text.width = IoAttackLogs.LIST_W - IoAttackLogs.BAR_W - 24;
        text.x = 8;
        text.y = 6;
        text.defaultTextFormat = new TextFormat("Verdana", 12, 0xE8D8C0);
        text.autoSize = TextFieldAutoSize.LEFT;
        text.text = KEYS.Get("al_loading");
        IoWin.watchLoading(text); // (QoL #447)
        view.content.addChild(text);
        view.setTotal(text.height + 12, true);
        // (Inferno-only, QoL #532: a report opened before is not asked for again)
        let known: any = GLOBAL.INFERNO_ONLY ? IoAttackLogs._ioReports[String(log.id | 0)] : undefined;
        let shown: Function = (r: any): void => {
            if (!d.stage || this._detail != d) {
                return;
            }
            let html: string = r && !r.error ? String(r.report || "") : "";
            if (GLOBAL.INFERNO_ONLY && r && !r.error && log.ended) {
                IoAttackLogs._ioReports[String(log.id | 0)] = { "report": html };
            }
            if (r && r.error && GLOBAL.INFERNO_ONLY && /too many/i.test(String(r.error))) {
                text.text = KEYS.Get("io_al_wait");
            } else if (r && r.error) {
                text.text = String(r.error);
            } else if (!html.length) {
                text.text = KEYS.Get("al_no_report");
            } else {
                text.htmlText = "<font face=\"Verdana\" size=\"12\" color=\"#E8D8C0\">" + html + "</font>";
            }
            view.setTotal(text.height + 12, true);
        };
        if (known) {
            shown(known);
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["id", log.id | 0]], shown, (e: IOErrorEvent): void => {
            if (d.stage && this._detail == d) {
                text.text = KEYS.Get("al_failed");
                view.setTotal(text.height + 12, true);
            }
        });
    }

    private closeDetail(): void {
        if (this._detail && this._detail.parent) {
            this._detail.parent.removeChild(this._detail);
        }
        this._detail = null;
    }

    // ---- the server
    /** (QoL #454) "14:02" on the player's clock */
    private static ioClock(at: int): string {
        let d: Date = new Date(at * 1000);
        return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    }

    private fetch(): void {
        let self: IoAttackLogs = null;
        if (this._loading) {
            return;
        }
        this._loading = true;
        this._failed = false;
        // (QoL #454: the rows there say they are being refreshed)
        if (GLOBAL.INFERNO_ONLY && this._data && this._count) {
            this._ioStale = null;
            this.fill(false);
        }
        // (Inferno-only, QoL #532: the last list straight away, while the new one comes)
        if (!this._data && GLOBAL.INFERNO_ONLY && IoAttackLogs._ioLast) {
            this._data = IoAttackLogs._ioLast;
        }
        if (!this._data) {
            this.fill(true);
        }
        self = this;
        // (Inferno-only, QoL #93: and the last 24 hours' totals)
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", GLOBAL.INFERNO_ONLY ? [["v", 1], ["day", 1]] : [["v", 1]], (r: any): void => {
            self._loading = false;
            if (!r || r.error) {
                self._failed = true;
                // (Inferno-only, QoL #532: a refusal, "Too many requests" when the limit, 40 a minute shared with
                // the reports, is reached, kept the window empty: the rows already there stay, and say so)
                if (GLOBAL.INFERNO_ONLY && self._data) {
                    self._ioStale = r && r.error ? String(r.error) : "";
                    self.fill(false);
                    return;
                }
                if (r && r.error) {
                    self._data = null;
                }
                self.fill(true);
                return;
            }
            self._ioStale = null;
            self._data = IoAttackLogs.parse(r);
            // (QoL #93: a new list: an older page still coming is dropped when it does)
            self._ioLoadingOlder = false;
            self._ioOlderFailed = false;
            IoAttackLogs._ioLast = self._data;
            self.fill(false);
            // (QoL #90: seen: the top bar's count of new attacks on the player goes)
            if (GLOBAL.INFERNO_ONLY) {
                UI_TOP.ioAttacksSeen(r, true);
            }
        }, (e: IOErrorEvent): void => {
            self._loading = false;
            self._failed = true;
            if (GLOBAL.INFERNO_ONLY && self._data) {
                self._ioStale = "";
                self.fill(false);
                return;
            }
            self.fill(true);
        });
    }

    private static parse(r: any): any {
        let out: any = { "now": (r.now | 0) > 0 ? r.now | 0 : GLOBAL.Timestamp(), "fetchedAt": GLOBAL.Timestamp(), "mine": [], "onme": [] };
        for (const $value of as3.values(["mine", "onme"])) {
            let side: string = as3.str($value);
            for (let row of as3.values(as3.as(r[side], Array) || [])) {
                out[side].push(IoAttackLogs.parseRow(row));
            }
        }
        // (Inferno-only, QoL #93: whether each side has older logs, and the last 24 hours' totals)
        if (GLOBAL.INFERNO_ONLY) {
            out.more = { "mine": Boolean(r.more && r.more.mine), "onme": Boolean(r.more && r.more.onme) };
            out.day = r.day ? r.day : null;
        }
        return out;
    }

    /** One log as the server lists it (getGameAttackLogs: [id, at, name, uid, type, x, y, level, damage, ...]). */
    private static parseRow(row: any): any {
        let loot: any[] = [];
        for (let n of as3.values(as3.as(row[11], Array) || [])) {
            loot.push(Number(n));
        }
        return { "id": row[0] | 0, "at": row[1] | 0, "name": String(row[2]), "uid": row[3] | 0, "type": String(row[4]), "x": row[5] | 0, "y": row[6] | 0, "level": row[7] | 0, "damage": row[8] | 0, "destroyed": row[9] | 0, "ended": (row[10] | 0) == 1, "loot": loot, "replay": row.length > 12 ? String(row[12] || "") : "", "hx": row.length > 14 ? row[13] | 0 : -1, "hy": row.length > 14 ? row[14] | 0 : -1 };
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        this._list.stop();
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoAttackLogs._open == this) {
            IoAttackLogs._open = null;
        }
    }
}
