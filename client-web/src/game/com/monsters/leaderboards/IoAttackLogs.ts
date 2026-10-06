import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { BYMChat, CasinoUI, GLOBAL, IoMapShare, IoMapUi, IoReplays, KEYS, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";

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
        as3.fields(this, { mc: null, _data: null, _loading: false, _failed: false, _tabs: null, _status: null, _count: null, _list: null, _rows: null, _detail: null, _replayMenu: null });
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
    private _tabs: any[];
    private _status: TextField;
    private _count: TextField;
    private _list: any;
    private _rows: Sprite;
    private _detail: Sprite;
    // ---- a report
    private _replayMenu: Sprite;

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
            let tab: Sprite = CasinoUI.toggle(KEYS.Get(as3.str(names[i])), 150, 28, this.tabClick(i));
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
        let openFile: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("al_replay_open"), 150, 24, (e: MouseEvent): void => {
            this.close();
            IoReplays.Open();
        }, true, 12)), Sprite);
        openFile.name = "ioAlOpenReplay";
        openFile.x = IoAttackLogs.LIST_X;
        openFile.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 6;
        let hint: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("al_hint"), 12, CasinoUI.ASH, false, (IoAttackLogs.LIST_W - 310 - 160) | 0, TextFormatAlign.LEFT)), TextField);
        hint.x = IoAttackLogs.LIST_X + 160;
        hint.y = IoAttackLogs.LIST_TOP + IoAttackLogs.LIST_H + 8;
        GLOBAL.ioFitText(hint);
        this.mc.addChild(IoAttackLogs.closeButton("ioAlClose", as3.bind(this, this.close)));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        this.selectTab(IoAttackLogs._tab);
        this.fetch();
    }

    public static Show(e: MouseEvent = null): void {
        if (IoAttackLogs._open && (!IoAttackLogs._open.mc || !IoAttackLogs._open.mc.stage)) {
            IoAttackLogs._open = null;
        }
        if (IoAttackLogs._open) {
            return;
        }
        SOUNDS.Play("click1");
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
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        let art: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/bg.jpg", -IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, IoAttackLogs.H - 12);
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/banner.jpg", -IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, 92);
        let mask: Shape = as3.as(mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-IoAttackLogs.W / 2 + 6, -IoAttackLogs.H / 2 + 6, IoAttackLogs.W - 12, IoAttackLogs.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
    }

    public static closeButton(name: string, onClick: Function): Sprite {
        let x: Sprite = new Sprite();
        x.name = name;
        x.buttonMode = true;
        x.mouseChildren = false;
        x.graphics.lineStyle(2, 14708778, 1);
        x.graphics.beginFill(2755078, 1);
        x.graphics.drawCircle(0, 0, 14);
        x.graphics.endFill();
        x.graphics.lineStyle(3, 16766346, 1);
        x.graphics.moveTo(-5, -5);
        x.graphics.lineTo(5, 5);
        x.graphics.moveTo(5, -5);
        x.graphics.lineTo(-5, 5);
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

    private fill(top: boolean): void {
        if (!this.mc) {
            return;
        }
        CasinoUI.removeAll(this._rows);
        let list: any[] = this.logs();
        this._status.text = this._data ? (list.length ? "" : KEYS.Get(IoAttackLogs._tab == 0 ? "al_none_mine" : "al_none_onme")) : (this._failed ? KEYS.Get("al_failed") : KEYS.Get("al_loading"));
        this._count.text = !this._data ? "" : (list.length == 1 ? KEYS.Get("al_count_one") : KEYS.Get("al_count", { "v1": GLOBAL.FormatNumber(list.length) }));
        for (let i: int = 0; i < list.length; i++) {
            let line: Sprite = this.makeRow(list[i], i);
            line.y = i * IoAttackLogs.ROW_H;
            this._rows.addChild(line);
        }
        this._list.setTotal(list.length * IoAttackLogs.ROW_H, top);
    }

    private makeRow(log: any, index: int): Sprite {
        let replay: Sprite = null;
        let line: Sprite = new Sprite();
        line.name = "ioAlRow" + index;
        line.graphics.beginFill((index % 2 == 0 ? 0x2A1C18 : 0x221613) >>> 0, 0.85);
        line.graphics.drawRect(0, 0, IoAttackLogs.ROW_W, IoAttackLogs.ROW_H - 1);
        line.graphics.endFill();
        let x: int = 0;
        for (let column of as3.values(IoAttackLogs.COLUMNS)) {
            let key: string = String(column[0]);
            let cell: TextField = as3.as(line.addChild(CasinoUI.label(this.cellText(log, key), 12, this.cellColour(log, key), key == "name", (column[2] - 8) | 0, as3.str(column[3]))), TextField);
            cell.x = x + 4;
            cell.y = 6;
            GLOBAL.ioFitText(cell);
            x = (x + column[2]) | 0;
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
        if (log.x >= 0 && log.y >= 0) {
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
        let menu: Sprite = CasinoUI.panel(196, 132, 0.98);
        menu.name = "ioAlReplayMenu_" + key;
        let items: any[] = [["ioAlReplayWatch", "al_replay_watch", (): void => {
            self.close();
            IoReplays.Watch(key);
        }], ["ioAlReplayGlobal", "al_replay_global", (): void => {
            IoReplays.Share(key, BYMChat.IO_GLOBAL);
        }], ["ioAlReplayAlliance", "al_replay_alliance", (): void => {
            IoReplays.Share(key, BYMChat.IO_ALLIANCE);
        }], ["ioAlReplayDownload", "al_replay_download", (): void => {
            IoReplays.Download(key);
        }]];
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
        menu.y = Math.min(IoAttackLogs.H / 2 - 140, at.y);
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
        let facts: any[] = [[KEYS.Get("al_f_when"), this.ago(log.at | 0)], [KEYS.Get("al_f_yard"), this.yardText(log) + (log.x >= 0 ? "  (" + IoMapUi.coord(log.x | 0, log.y | 0) + ")" : "")], [KEYS.Get("al_f_result"), this.inProgress(log) ? KEYS.Get("al_in_progress") : KEYS.Get("al_damage", { "v1": log.damage }) + (log.ended ? "" : " " + KEYS.Get("al_unfinished"))], [KEYS.Get("al_f_destroyed"), GLOBAL.FormatNumber(log.destroyed | 0)], [KEYS.Get(IoAttackLogs._tab == 0 ? "al_f_loot" : "al_f_lost"), IoAttackLogs.lootLines(log)]];
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
        view.content.addChild(text);
        view.setTotal(text.height + 12, true);
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["id", log.id | 0]], (r: any): void => {
            if (!d.stage || this._detail != d) {
                return;
            }
            let html: string = r && !r.error ? String(r.report || "") : "";
            if (r && r.error) {
                text.text = String(r.error);
            } else if (!html.length) {
                text.text = KEYS.Get("al_no_report");
            } else {
                text.htmlText = "<font face=\"Verdana\" size=\"12\" color=\"#E8D8C0\">" + html + "</font>";
            }
            view.setTotal(text.height + 12, true);
        }, (e: IOErrorEvent): void => {
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
    private fetch(): void {
        let self: IoAttackLogs = null;
        if (this._loading) {
            return;
        }
        this._loading = true;
        this._failed = false;
        if (!this._data) {
            this.fill(true);
        }
        self = this;
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["v", 1]], (r: any): void => {
            self._loading = false;
            if (!r || r.error) {
                self._failed = true;
                if (r && r.error) {
                    self._data = null;
                }
                self.fill(true);
                return;
            }
            self._data = IoAttackLogs.parse(r);
            self.fill(false);
        }, (e: IOErrorEvent): void => {
            self._loading = false;
            self._failed = true;
            self.fill(true);
        });
    }

    private static parse(r: any): any {
        let out: any = { "now": (r.now | 0) > 0 ? r.now | 0 : GLOBAL.Timestamp(), "fetchedAt": GLOBAL.Timestamp(), "mine": [], "onme": [] };
        for (const $value of as3.values(["mine", "onme"])) {
            let side: string = as3.str($value);
            for (let row of as3.values(as3.as(r[side], Array) || [])) {
                let loot: any[] = [];
                for (let n of as3.values(as3.as(row[11], Array) || [])) {
                    loot.push(Number(n));
                }
                out[side].push({ "id": row[0] | 0, "at": row[1] | 0, "name": String(row[2]), "uid": row[3] | 0, "type": String(row[4]), "x": row[5] | 0, "y": row[6] | 0, "level": row[7] | 0, "damage": row[8] | 0, "destroyed": row[9] | 0, "ended": (row[10] | 0) == 1, "loot": loot, "replay": row.length > 12 ? String(row[12] || "") : "" });
            }
        }
        return out;
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
