import * as as3 from "as3";
import { ASObject, int } from "as3";
import { GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { BASE, CasinoUI, GLOBAL, IoKit, IoQuestArt, IoQuestBook, IoQuests, IoToast, IoWin, KEYS, SOUNDS } from "@game";

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
            list.addChild(IoQuestTracker.message(KEYS.Get("io_quest_loading"), true));
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
        // (QoL #422, 14 October: the Getting Started tree first until it's done; a brand-new yard's dock showed
        // "Under Hall level 2" and "Strongbox page 1" before the first steps)
        let start: any[] = open.filter((x: any): boolean => String(x.cat) == "start");
        if (start.length) {
            open = start.concat(open.filter((x: any): boolean => String(x.cat) != "start"));
        }
        // (QoL #118, 15 October: the quests the player chose in the book (Track in the dock, up to 3) come after the
        // ready ones, in the order chosen; the closest to done fill what is left of the three)
        let picks: any[] = [];
        if (GLOBAL.INFERNO_ONLY) {
            for (let tid of IoQuests.tracked()) {
                let tq: any = IoQuests.quest(String(tid));
                if (tq && (tq.state == "progress" || tq.state == "locked") && picks.indexOf(tq) < 0) {
                    picks.push(tq);
                }
            }
            if (picks.length) {
                open = open.filter((x: any): boolean => picks.indexOf(x) < 0);
            }
        }
        picks = picks.slice(0, IoQuestTracker.CLOSEST);
        let rows: any[] = ready.slice(0, IoQuestTracker.MAX_READY).concat(picks, open.slice(0, Math.max(0, IoQuestTracker.CLOSEST - picks.length)));
        for (let i: int = 0; i < rows.length; i++) {
            let r: Sprite = IoQuestTracker.row(rows[i], i, picks.indexOf(rows[i]) >= 0);
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
        // (on its own Shape under the row, so the kit's picture can come in later without the progress bar
        // drawn on the row going: 11 October)
        let bg: Shape = as3.as(s.getChildByName("ioRowBg"), Shape);
        if (!bg) {
            bg = new Shape();
            bg.name = "ioRowBg";
            s.addChildAt(bg, 0);
        }
        let draw: Function = (): void => {
            bg.graphics.clear();
            // the kit's wooden plank; a ready one keeps its glow (row())
            if (IoKit.slice(bg.graphics, "row_wood", 0, 0, IoQuestTracker.ROW_W, IoQuestTracker.ROW_H)) {
                if (hot) {
                    bg.graphics.lineStyle(1.5, 0xFFD58A, 0.9);
                    bg.graphics.drawRoundRect(1, 1, IoQuestTracker.ROW_W - 2, IoQuestTracker.ROW_H - 2, 10, 10);
                }
                return;
            }
            let m: Matrix = new Matrix();
            m.createGradientBox(IoQuestTracker.ROW_W, IoQuestTracker.ROW_H, Math.PI / 2, 0, 0);
            bg.graphics.lineStyle(1, (hot ? 0xFFD58A : 0x5A3A2A) >>> 0, 1);
            bg.graphics.beginGradientFill(GradientType.LINEAR, hot ? [0x7A4214, 0x4A2208] : i % 2 == 0 ? [0x2E1E1A, 0x1E1412] : [0x241816, 0x160E0C], [1, 1], [0, 255], m);
            bg.graphics.drawRoundRect(0, 0, IoQuestTracker.ROW_W, IoQuestTracker.ROW_H, 8, 8);
            bg.graphics.endFill();
        };
        draw();
        IoKit.whenLoaded(["row_wood"], draw);
    }

    private static row(q: any, i: int, tracked: boolean = false): Sprite {
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
        let title: TextField = as3.as(s.addChild(CasinoUI.label((daily ? KEYS.Get("io_quest_daily_tag") + " " : "") + IoQuests.title(q), 11, (ready ? 0xFFFFFF : CasinoUI.GOLD) >>> 0, true, (ready ? IoQuestTracker.ROW_W - 120 : (tracked ? IoQuestTracker.ROW_W - 62 : IoQuestTracker.ROW_W - 44)) | 0, TextFormatAlign.LEFT)), TextField);
        title.x = 32;
        title.y = 1;
        if (tracked) {
            // (QoL #118: a quest the player chose to track: a small flag at its right)
            let mark: Sprite = as3.as(s.addChild(IoQuestArt.glyph("flag", 12)), Sprite);
            mark.name = "ioQTrackMark";
            mark.mouseEnabled = false;
            mark.mouseChildren = false;
            mark.x = IoQuestTracker.ROW_W - 14;
            mark.y = 9;
        }
        if (ready) {
            let done: TextField = as3.as(s.addChild(CasinoUI.label(KEYS.Get("io_quest_state_ready"), 9, 16760928, true, (IoQuestTracker.ROW_W - 120) | 0, TextFormatAlign.LEFT)), TextField);
            done.x = 32;
            done.y = 16;
            let claim: Function = (e: MouseEvent): void => {
                e.stopPropagation();
                if (IoQuests.claiming) {
                    return;
                }
                // (QoL #115: what was collected, said, with the cha-ching; it was silent)
                IoQuests.claim(id, (reward: any, error: string): void => {
                    if (reward) {
                        SOUNDS.Play("chaching");
                        IoToast.Show(KEYS.Get("io_quest_got", { "v1": IoQuests.rewardText(reward) }) + (BASE.isMainYardOrInfernoMainYard ? "" : " " + KEYS.Get("io_quest_to_main")));
                    } else if (error) {
                        IoToast.Show(GLOBAL.INFERNO_ONLY ? IoWin.errRef(error) : error); // (QoL #446: the server's ref in small print)
                    }
                });
            };
            // (QoL #556: Collect takes the row's full height and some room either side of the button; a near
            // miss opened the whole Quest Book)
            let hit: Sprite = as3.as(s.addChild(new Sprite()), Sprite);
            hit.name = "ioQuestRowCollectHit";
            hit.graphics.beginFill(0, 0);
            hit.graphics.drawRect(IoQuestTracker.ROW_W - 92, 0, 92, IoQuestTracker.ROW_H);
            hit.graphics.endFill();
            hit.buttonMode = true;
            hit.addEventListener(MouseEvent.CLICK, claim);
            let collect: Sprite = as3.as(s.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 76, 24, claim, !IoQuests.claiming, 11)), Sprite);
            collect.name = "ioQuestRowCollect";
            collect.x = IoQuestTracker.ROW_W - 82;
            collect.y = 4;
            s.filters = [new GlowFilter(0xFFB040, 0.7, 8, 8, 2, 2)];
        } else {
            let part: number = Math.min(1, Number(q.value) / Math.max(1, Number(q.target)));
            // The bar is its own child, above the row's plank (ioRowBg): the row's own graphics draw under its children.
            let bar: Shape = as3.as(s.addChild(new Shape()), Shape);
            bar.name = "ioRowBar";
            bar.graphics.lineStyle(1, 10107412, 1);
            bar.graphics.beginFill(1182731, 1);
            bar.graphics.drawRoundRect(32, 20, 150, 7, 7, 7);
            bar.graphics.endFill();
            if (part > 0) {
                bar.graphics.lineStyle(0, 0, 0);
                bar.graphics.beginFill(14708778, 1);
                bar.graphics.drawRoundRect(33, 21, Math.max(5, 148 * part), 5, 5, 5);
                bar.graphics.endFill();
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
            if (d.yesterday) {
                continue;
            }
            dAll++;
            if (d.state == "claimed") {
                dDone++;
            }
        }
        let line: string = KEYS.Get("io_quest_dock_line", { "v1": book.claimed | 0, "v2": book.total | 0, "v3": dDone, "v4": dAll });
        let t: TextField = as3.as(s.addChild(CasinoUI.label(line, 11, CasinoUI.GOLD, true, (IoQuestTracker.ROW_W - 90) | 0, TextFormatAlign.LEFT)), TextField);
        t.x = 32;
        t.y = 8;
        if (ready > 1 && GLOBAL.INFERNO_ONLY) {
            // (QoL #117: Collect all, on the dock too; the whole book's ready quests in one go, what they paid said)
            s.mouseChildren = true;
            t.mouseEnabled = false;
            t.width = IoQuestTracker.ROW_W - 32 - 120;
            GLOBAL.ioFitText(t, 8);
            g.mouseEnabled = false;
            g.mouseChildren = false;
            let all: Sprite = as3.as(s.addChild(CasinoUI.button(KEYS.Get("io_quest_collect_all", { "v1": ready }), 108, 24, (e: MouseEvent): void => {
                e.stopPropagation();
                IoQuests.claim("all", (reward: any, error: string): void => {
                    if (reward) {
                        SOUNDS.Play("chaching");
                        IoToast.Show(KEYS.Get("io_quest_got", { "v1": IoQuests.rewardText(reward) }) + (BASE.isMainYardOrInfernoMainYard ? "" : " " + KEYS.Get("io_quest_to_main")));
                    } else if (error) {
                        IoToast.Show(GLOBAL.INFERNO_ONLY ? IoWin.errRef(error) : error); // (QoL #446: the server's ref in small print)
                    }
                });
            }, !IoQuests.claiming, 10)), Sprite);
            all.name = "ioQuestDockCollectAll";
            all.x = IoQuestTracker.ROW_W - 114;
            all.y = 4;
        } else if (ready > 0) {
            let r: TextField = as3.as(s.addChild(CasinoUI.label(KEYS.Get("io_quest_dock_ready", { "v1": ready }), 11, 16777215, true, 84, TextFormatAlign.RIGHT)), TextField);
            r.x = IoQuestTracker.ROW_W - 92;
            r.y = 8;
        }
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoQuestBook.Show();
        });
        return s;
    }

    private static message(text: string, loading: boolean = false): Sprite {
        let s: Sprite = new Sprite();
        s.y = IoQuestTracker.TOP;
        IoQuestTracker.background(s, 0, false);
        let t: TextField = as3.as(s.addChild(CasinoUI.label(text, 11, CasinoUI.ASH, true, (IoQuestTracker.ROW_W - 20) | 0, TextFormatAlign.CENTER)), TextField);
        t.x = 10;
        t.y = 8;
        if (loading && GLOBAL.INFERNO_ONLY) {
            // (QoL #447: "Can't reach the server, retrying…" while no answer comes)
            t.name = "ioQuestDockLoading";
            IoWin.watchLoading(t);
        }
        return s;
    }
}
