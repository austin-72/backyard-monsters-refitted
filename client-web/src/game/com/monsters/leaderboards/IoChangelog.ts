import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { TextField, TextFieldAutoSize, TextFormatAlign } from "flash/text";
import { CasinoUI, GLOBAL, IoAttackLogs, KEYS, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only (4 October, the user's): the Changelog, opened by the top bar's button right of the attack logs
 * (UI_TOP.ioChangelogButton). Every change ever made to the Inferno, day by day, newest first: on the left the
 * days (a click goes to that day), on the right each day's heading and its changes, each with its area (Yard,
 * Map, Depths...), a short title and a line or two saying what it means.
 *
 * Data: the server's /changelog (controllers/changelog.ts), which is server/public/docs/changelog.json; asked
 * for each time the window opens, so a new version is published by replacing that file. It is in English.
 * Hell Freezes Over stays "[ CLASSIFIED ]" there, as in the players' guide.
 */
export class IoChangelog extends ASObject {
    static {
        as3.fields(this, { mc: null, _list: null, _days: null, _status: null, _sub: null, _dayTops: null });
    }

    private static W: int; // const

    private static H: int; // const

    private static DAYS_X: int; // const

    private static DAYS_W: int; // const

    private static LIST_X: int; // const

    private static LIST_W: int; // const

    private static TOP: int; // const

    private static LIST_H: int; // const

    private static TEXT_W: int; // const

    /** Each area's colour (the tag in front of a change). */
    private static AREAS: any; // const

    private static MONTHS: any[]; // const

    private static WEEKDAYS: any[]; // const

    private static _open: IoChangelog;

    /** The last answer, kept while the game runs (opened again, it shows at once and is asked for again). */
    private static _cache: any;

    static {
        as3.lazyStatics(this, { W: 0, H: 0, DAYS_X: 0, DAYS_W: 0, LIST_X: 0, LIST_W: 0, TOP: 0, LIST_H: 0, TEXT_W: 0, AREAS: null, MONTHS: null, WEEKDAYS: null, _open: null, _cache: null }, () => {
            IoChangelog.W = IoAttackLogs.W;
            IoChangelog.H = IoAttackLogs.H;
            IoChangelog.DAYS_X = (-IoChangelog.W / 2 + 20) | 0;
            IoChangelog.DAYS_W = 168;
            IoChangelog.LIST_X = (IoChangelog.DAYS_X + IoChangelog.DAYS_W + 10) | 0;
            IoChangelog.LIST_W = (IoChangelog.W / 2 - 20 - IoChangelog.LIST_X) | 0;
            IoChangelog.TOP = (-IoChangelog.H / 2 + 118) | 0;
            IoChangelog.LIST_H = (IoChangelog.H / 2 - 52 - IoChangelog.TOP) | 0;
            IoChangelog.TEXT_W = (IoChangelog.LIST_W - 12 - 10 - 24) | 0;
            IoChangelog.AREAS = { "Yard": 0x6AB04A, "Map": 0x4A8AD0, "Depths": 0xB070F0, "Battles": 0xE0503A, "Monsters": 0xE08A3A, "Buildings": 0xC8A050, "Economy": 0xE0C040, "Events": 0xFF7A2A, "Quests": 0x50B0A0, "Alliances": 0x5A9AE0, "Chat": 0x80C0E0, "Leaderboards": 0xD0B060, "Brimstone Pit": 0xD06A90, "Pets": 0xA0D070, "Replays": 0x9A9AE0, "Interface": 0xB8A898, "Browser": 0x70B8B0, "Admins": 0x9A7AC0, "Fixes": 0x8A9A8A };
            IoChangelog.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            IoChangelog.WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            IoChangelog._open = null;
            IoChangelog._cache = null;
        });
    }
    public mc: MovieClip;
    private _list: any;
    private _days: any;
    private _status: TextField;
    private _sub: TextField;
    /** Where each day's heading is in the list (by its index), for the day buttons. */
    private _dayTops: any[];

    public $ctor(): void {
        this._dayTops = [];
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "ioChangelogWindow";
        IoAttackLogs.frame(this.mc);
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("cl_title"), 34, (IoChangelog.W - 200) | 0)), TextField);
        title.x = -IoChangelog.W / 2 + 100;
        title.y = -IoChangelog.H / 2 + 24;
        this._sub = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("cl_sub"), 13, CasinoUI.GOLD, true, (IoChangelog.W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._sub.x = -IoChangelog.W / 2 + 20;
        this._sub.y = -IoChangelog.H / 2 + 80;
        GLOBAL.ioFitText(this._sub);
        this._days = IoAttackLogs.scrollView(this.mc, IoChangelog.DAYS_X, IoChangelog.TOP, IoChangelog.DAYS_W, IoChangelog.LIST_H);
        this._list = IoAttackLogs.scrollView(this.mc, IoChangelog.LIST_X, IoChangelog.TOP, IoChangelog.LIST_W, IoChangelog.LIST_H);
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, (IoChangelog.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoChangelog.LIST_X + 20;
        this._status.y = IoChangelog.TOP + 40;
        let hint: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("cl_hint"), 12, CasinoUI.ASH, false, (IoChangelog.W - 40) | 0, TextFormatAlign.LEFT)), TextField);
        hint.x = -IoChangelog.W / 2 + 20;
        hint.y = IoChangelog.TOP + IoChangelog.LIST_H + 10;
        GLOBAL.ioFitText(hint);
        this.mc.addChild(IoAttackLogs.closeButton("ioClClose", as3.bind(this, this.close)));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        if (IoChangelog._cache) {
            this.fill(IoChangelog._cache);
        } else {
            this._status.text = KEYS.Get("cl_loading");
        }
        this.fetch();
    }

    public static Show(e: MouseEvent = null): void {
        if (IoChangelog._open && (!IoChangelog._open.mc || !IoChangelog._open.mc.stage)) {
            IoChangelog._open = null;
        }
        if (IoChangelog._open) {
            return;
        }
        SOUNDS.Play("click1");
        IoChangelog._open = new IoChangelog();
    }

    public static get isOpen(): boolean {
        return IoChangelog._open != null;
    }

    /** Closes it (the yard is going). */
    public static CloseOpen(): void {
        if (IoChangelog._open) {
            IoChangelog._open.close();
        }
        IoChangelog._open = null;
    }

    private fetch(): void {
        let self: IoChangelog = null;
        self = this;
        new URLLoaderApi().load(GLOBAL.serverUrl + "changelog", null, (r: any): void => {
            if (!self.mc) {
                return;
            }
            if (!r || r.error || !(as3.is(r.entries, Array))) {
                if (!IoChangelog._cache) {
                    self._status.text = KEYS.Get("cl_failed");
                }
                return;
            }
            let fresh: boolean = !IoChangelog._cache || JSON.stringify(IoChangelog._cache.entries) != JSON.stringify(r.entries);
            IoChangelog._cache = r;
            if (fresh) {
                self.fill(r);
            }
        }, (e: IOErrorEvent): void => {
            if (self.mc && !IoChangelog._cache) {
                self._status.text = KEYS.Get("cl_failed");
            }
        });
    }

    /** "2026-10-04" as "Sunday 4 October 2026" (or as "4 Oct", short). */
    public static dayName(iso: string, short: boolean = false): string {
        let p: any[] = String(iso).split("-");
        if (p.length < 3) {
            return String(iso);
        }
        let y: int = p[0] | 0;
        let m: int = ((p[1] | 0) - 1) | 0;
        let d: int = p[2] | 0;
        if (m < 0 || m > 11) {
            return String(iso);
        }
        if (short) {
            return d + " " + String(IoChangelog.MONTHS[m]).substr(0, 3) + " " + y;
        }
        return IoChangelog.WEEKDAYS[new Date(y, m, d).getDay()] + " " + d + " " + IoChangelog.MONTHS[m] + " " + y;
    }

    private fill(data: any): void {
        let entries: any[] = as3.as(data.entries, Array) || [];
        let rows: Sprite = as3.cast(this._list.content, Sprite);
        let days: Sprite = as3.cast(this._days.content, Sprite);
        while (rows.numChildren) {
            rows.removeChildAt(0);
        }
        while (days.numChildren) {
            days.removeChildAt(0);
        }
        this._dayTops = [];
        let count: int = 0;
        let y: number = 8;
        for (let i: int = 0; i < entries.length; i++) {
            let entry: any = entries[i];
            this._dayTops.push(y);
            // the day's heading
            let head: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
            head.name = "ioClDay" + i;
            head.y = y;
            head.graphics.beginFill(3807760, 0.95);
            head.graphics.lineStyle(1, 13127706, 1);
            head.graphics.drawRoundRect(6, 0, IoChangelog.LIST_W - 28, 44, 10, 10);
            head.graphics.endFill();
            let when: TextField = as3.as(head.addChild(CasinoUI.label(IoChangelog.dayName(as3.str(entry.date)), 14, CasinoUI.GOLD, true, (IoChangelog.LIST_W - 50) | 0)), TextField);
            when.x = 16;
            when.y = 4;
            let what: TextField = as3.as(head.addChild(CasinoUI.label(String(entry.headline || ""), 11, CasinoUI.ASH, false, (IoChangelog.LIST_W - 50) | 0)), TextField);
            what.x = 16;
            what.y = 23;
            GLOBAL.ioFitText(what);
            y += 52;
            for (let item of as3.values(as3.as(entry.items, Array) || [])) {
                y += this.addItem(rows, y, item);
                count++;
            }
            y += 10;
            // its button on the left
            let b: Sprite = as3.as(days.addChild(this.dayButton(i, IoChangelog.dayName(as3.str(entry.date), true), (as3.as(entry.items, Array) || []).length)), Sprite);
            b.y = 6 + i * 34;
        }
        this._list.setTotal(y + 8, true);
        this._days.setTotal(6 + entries.length * 34 + 6, true);
        this._status.text = entries.length ? "" : KEYS.Get("cl_failed");
        this._sub.htmlText = KEYS.Get("cl_sub_count", { "v1": GLOBAL.FormatNumber(count), "v2": entries.length, "v3": IoChangelog.dayName(String(data.updated || (entries.length ? entries[0].date : "")), true) });
        GLOBAL.ioFitText(this._sub);
    }

    /** One change: its area's tag, its title, what it means; returns how tall it is. */
    private addItem(rows: Sprite, y: number, item: any): number {
        let area: string = String(item.area || "");
        let colour: uint = (IoChangelog.AREAS[area] != null ? IoChangelog.AREAS[area] >>> 0 : 0xB8A898) >>> 0;
        let row: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
        row.y = y;
        let tag: TextField = as3.as(row.addChild(CasinoUI.label(area, 9, 1707530, true, 84, TextFormatAlign.CENTER)), TextField);
        tag.x = 14;
        tag.y = 2;
        GLOBAL.ioFitText(tag);
        row.graphics.beginFill(colour, 1);
        row.graphics.drawRoundRect(14, 2, 84, 16, 8, 8);
        row.graphics.endFill();
        let title: TextField = as3.as(row.addChild(CasinoUI.label(String(item.title || ""), 12, 16777215, true, (IoChangelog.TEXT_W - 96) | 0)), TextField);
        title.x = 106;
        title.y = 0;
        GLOBAL.ioFitText(title);
        let text: TextField = as3.as(row.addChild(CasinoUI.label(String(item.text || ""), 11, 14208192, false, IoChangelog.TEXT_W)), TextField);
        text.wordWrap = true;
        text.multiline = true;
        text.autoSize = TextFieldAutoSize.LEFT;
        text.text = String(item.text || "");
        text.x = 14;
        text.y = 20;
        return 20 + Math.max(16, text.textHeight + 6) + 8;
    }

    private dayButton(i: int, label: string, items: int): Sprite {
        let self: IoChangelog = null;
        let b: Sprite = null;
        let draw: Function = null;
        self = this;
        b = new Sprite();
        b.name = "ioClGo" + i;
        b.buttonMode = true;
        b.mouseChildren = false;
        draw = (over: boolean): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, (over ? 0xFFC060 : 0x9A3A14) >>> 0, 1);
            b.graphics.beginFill((over ? 0x5A2A14 : 0x2A1610) >>> 0, 1);
            b.graphics.drawRoundRect(6, 0, IoChangelog.DAYS_W - 32, 28, 8, 8);
            b.graphics.endFill();
        };
        draw(false);
        let t: TextField = as3.as(b.addChild(CasinoUI.label(label, 12, CasinoUI.GOLD, true, (IoChangelog.DAYS_W - 76) | 0)), TextField);
        t.x = 12;
        t.y = 5;
        GLOBAL.ioFitText(t);
        let n: TextField = as3.as(b.addChild(CasinoUI.label(String(items), 11, CasinoUI.ASH, false, 34, TextFormatAlign.RIGHT)), TextField);
        n.x = IoChangelog.DAYS_W - 32 - 40;
        n.y = 6;
        b.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            self.goTo(i);
        });
        return b;
    }

    /** Scrolls the list to day `i`. */
    public goTo(i: int): void {
        if (i < 0 || i >= this._dayTops.length) {
            return;
        }
        this._list.offset = Number(this._dayTops[i]) - 4;
        this._list.place();
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        this._list.stop();
        this._days.stop();
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoChangelog._open == this) {
            IoChangelog._open = null;
        }
    }
}
