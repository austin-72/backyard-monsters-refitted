import * as as3 from "as3";
import { ASObject, int } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { CasinoUI, GLOBAL, IoQuestArt, IoQuestBook, IoQuests, KEYS } from "@game";

/**
 * Inferno-only: the quest dock's rows (UI_MISSIONMENU, bottom right), from the quest book: every quest
 * ready to collect first (glowing, with Collect), then the three closest to done. The pinned row under
 * them is the book itself: how many are ready, today's daily quests. A row opens the book at its quest.
 */
export class IoQuestTracker extends ASObject {
    public static readonly ROW_W: int = 344;

    public static readonly ROW_H: int = 32;

    private static readonly PAD: int = 2;

    /** The first row starts this far down (clear of the dock's title bar). */
    private static readonly TOP: int = 5;

    private static readonly MAX_READY: int = 6;

    private static readonly CLOSEST: int = 3;

    public $ctor(): void {
        super.$ctor();
    }

    /** Fills the dock: its list and its pinned row. Returns how many rows the list has. */
    public static fill(list: MovieClip, pinned: MovieClip): int {
        let book: any = IoQuests.book;
        if (!book) {
            list.addChild(IoQuestTracker.message(KEYS.Get("io_quest_loading")));
            return 1;
        }
        let ready: any[] = [];
        let open: any[] = [];
        for (let q of as3.values(book.quests)) {
            if (q.state == "ready") {
                ready.push(q);
            } else if (q.state == "progress" && (q.target | 0) > 0) {
                open.push(q);
            }
        }
        for (let d of as3.values(book.daily.quests)) {
            if (d.state == "ready") {
                ready.push(d);
            } else if (d.state == "progress") {
                open.push(d);
            }
        }
        open = open.map((x: any, i: int, a: any[]): any => {
            x.ioPart = Number(x.value) / Math.max(1, Number(x.target));
            return x;
        });
        as3.sortOn(open, "ioPart", Array.NUMERIC | Array.DESCENDING);
        let rows: any[] = ready.slice(0, IoQuestTracker.MAX_READY).concat(open.slice(0, IoQuestTracker.CLOSEST));
        for (let i: int = 0; i < rows.length; i++) {
            let r: Sprite = IoQuestTracker.row(rows[i], i);
            r.y = IoQuestTracker.TOP + i * (IoQuestTracker.ROW_H + IoQuestTracker.PAD);
            list.addChild(r);
        }
        if (!rows.length) {
            list.addChild(IoQuestTracker.message(KEYS.Get("io_quest_all_done")));
        }
        let p: Sprite = IoQuestTracker.summary(book);
        pinned.addChild(p);
        return Math.max(1, rows.length) | 0;
    }

    private static background(s: Sprite, i: int, hot: boolean): void {
        let m: Matrix = new Matrix();
        m.createGradientBox(IoQuestTracker.ROW_W, IoQuestTracker.ROW_H, Math.PI / 2, 0, 0);
        s.graphics.clear();
        s.graphics.lineStyle(1, (hot ? 0xFFD58A : 0x5A3A2A) >>> 0, 1);
        s.graphics.beginGradientFill(GradientType.LINEAR, hot ? [0x7A4214, 0x4A2208] : i % 2 == 0 ? [0x2E1E1A, 0x1E1412] : [0x241816, 0x160E0C], [1, 1], [0, 255], m);
        s.graphics.drawRoundRect(0, 0, IoQuestTracker.ROW_W, IoQuestTracker.ROW_H, 8, 8);
        s.graphics.endFill();
    }

    private static row(q: any, i: int): Sprite {
        let id: string = null;
        let daily: boolean = !q.cat;
        id = daily ? "daily:" + q.id : String(q.id);
        let ready: boolean = q.state == "ready";
        let s: Sprite = new Sprite();
        s.name = "ioQuestRow:" + id;
        s.buttonMode = true;
        IoQuestTracker.background(s, i, ready);
        let g: Sprite = as3.as(s.addChild(IoQuestArt.glyph(String(q.icon), 22)), Sprite);
        g.x = 17;
        g.y = IoQuestTracker.ROW_H / 2;
        let title: TextField = as3.as(s.addChild(CasinoUI.label((daily ? KEYS.Get("io_quest_daily_tag") + " " : "") + IoQuests.title(q), 11, (ready ? 0xFFFFFF : CasinoUI.GOLD) >>> 0, true, (ready ? IoQuestTracker.ROW_W - 120 : IoQuestTracker.ROW_W - 44) | 0, TextFormatAlign.LEFT)), TextField);
        title.x = 32;
        title.y = 1;
        if (ready) {
            let done: TextField = as3.as(s.addChild(CasinoUI.label(KEYS.Get("io_quest_state_ready"), 9, 16760928, true, (IoQuestTracker.ROW_W - 120) | 0, TextFormatAlign.LEFT)), TextField);
            done.x = 32;
            done.y = 16;
            let collect: Sprite = as3.as(s.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 76, 24, (e: MouseEvent): void => {
                e.stopPropagation();
                IoQuests.claim(id);
            }, !IoQuests.claiming, 11)), Sprite);
            collect.name = "ioQuestRowCollect";
            collect.x = IoQuestTracker.ROW_W - 82;
            collect.y = 4;
            s.filters = [new GlowFilter(0xFFB040, 0.7, 8, 8, 2, 2)];
        } else {
            let part: number = Math.min(1, Number(q.value) / Math.max(1, Number(q.target)));
            s.graphics.lineStyle(1, 10107412, 1);
            s.graphics.beginFill(1182731, 1);
            s.graphics.drawRoundRect(32, 20, 150, 7, 7, 7);
            s.graphics.endFill();
            if (part > 0) {
                s.graphics.lineStyle(0, 0, 0);
                s.graphics.beginFill(14708778, 1);
                s.graphics.drawRoundRect(33, 21, Math.max(5, 148 * part), 5, 5, 5);
                s.graphics.endFill();
            }
            let n: TextField = as3.as(s.addChild(CasinoUI.label(GLOBAL.FormatNumber(Number(q.value)) + " / " + GLOBAL.FormatNumber(Number(q.target)), 9, CasinoUI.ASH, false, 140, TextFormatAlign.LEFT)), TextField);
            n.x = 188;
            n.y = 16;
        }
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoQuestBook.Show(null, id);
        });
        return s;
    }

    /** The pinned row: the book, how many are ready, today's daily quests. */
    private static summary(book: any): Sprite {
        let s: Sprite = new Sprite();
        s.name = "ioQuestRowBook";
        s.buttonMode = true;
        s.mouseChildren = false;
        let ready: int = book.ready | 0;
        IoQuestTracker.background(s, 0, ready > 0);
        let g: Sprite = as3.as(s.addChild(IoQuestArt.glyph("book", 22)), Sprite);
        g.x = 17;
        g.y = IoQuestTracker.ROW_H / 2;
        let dDone: int = 0;
        let dAll: int = 0;
        for (let d of as3.values(book.daily.quests)) {
            dAll++;
            if (d.state == "claimed") {
                dDone++;
            }
        }
        let line: string = KEYS.Get("io_quest_dock_line", { "v1": book.claimed | 0, "v2": book.total | 0, "v3": dDone, "v4": dAll });
        let t: TextField = as3.as(s.addChild(CasinoUI.label(line, 11, CasinoUI.GOLD, true, (IoQuestTracker.ROW_W - 90) | 0, TextFormatAlign.LEFT)), TextField);
        t.x = 32;
        t.y = 8;
        if (ready > 0) {
            let r: TextField = as3.as(s.addChild(CasinoUI.label(KEYS.Get("io_quest_dock_ready", { "v1": ready }), 11, 16777215, true, 84, TextFormatAlign.RIGHT)), TextField);
            r.x = IoQuestTracker.ROW_W - 92;
            r.y = 8;
        }
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoQuestBook.Show();
        });
        return s;
    }

    private static message(text: string): Sprite {
        let s: Sprite = new Sprite();
        s.y = IoQuestTracker.TOP;
        IoQuestTracker.background(s, 0, false);
        let t: TextField = as3.as(s.addChild(CasinoUI.label(text, 11, CasinoUI.ASH, true, (IoQuestTracker.ROW_W - 20) | 0, TextFormatAlign.CENTER)), TextField);
        t.x = 10;
        t.y = 8;
        return s;
    }
}
