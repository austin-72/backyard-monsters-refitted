import * as as3 from "as3";
import { int, uint } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, CasinoUI, GLOBAL, IoBaiter, IoToast, IoWin, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (22 November): the Monster Baiter's window, drawn here (the overworld's had a slot for each of 14
 * monsters and nothing more).
 *
 * Left: five tabs (Overworld, Overworld champions, Inferno, Inferno champions, Hell Freezes Over), a card for each
 * monster the tab has (12 a page), each with its picture, name, a level picker, its musk and - / + (shift-click: 10).
 * Right: the wave (each kind and level, with an x), the musk it uses, where they come from (a compass of eight
 * sides, All sides in the middle, and Anywhere), Practice or Real, how they arrive (at once, or in 2 or 3 waves),
 * 2x speed, three saved waves, and the button that sends them. What it does is IoBaiter's.
 *
 * ShowReport: the report after a raid, with Send again.
 */
export class IoBaiterWindow {
    public static readonly W: int = 900;
    public static readonly H: int = 600;
    private static readonly PER_PAGE: int = 12;
    private static readonly CARD_W: int = 140;
    private static readonly CARD_H: int = 124;
    private static readonly LIST_ROWS: int = 9;
    /** The compass: [side, label] in reading order (the middle: all sides). */
    private static readonly COMPASS: any[] = [[0, "↖"], [4, "↑"], [1, "↗"], [7, "←"], [8, ""], [5, "→"], [3, "↙"], [6, "↓"], [2, "↘"]];

    private static _win: any = null;
    private static _ui: any = null;
    private static _tab: string = "ow";
    private static _page: int = 0;
    /** The level each card shows (by id). */
    private static _lv: any = {};
    private static _saveMode: boolean = false;
    private static _dirty: boolean = false;
    private static _report: any = null;

    public static get isOpen(): boolean {
        return Boolean(IoBaiterWindow._win) && !IoBaiterWindow._win.closed;
    }

    public static get reportOpen(): boolean {
        return Boolean(IoBaiterWindow._report) && !IoBaiterWindow._report.closed;
    }

    /** The baiter's window (MONSTERBAITER.Show). */
    public static Show(): void {
        if (IoBaiterWindow.isOpen) {
            return;
        }
        IoBaiterWindow.CloseReport();
        IoBaiter.prune();
        IoBaiterWindow._saveMode = false;
        IoBaiterWindow._dirty = false;
        IoBaiterWindow.build();
    }

    public static Close(): void {
        if (IoBaiterWindow._win) {
            IoBaiterWindow._win.close();
        }
    }

    public static CloseReport(): void {
        if (IoBaiterWindow._report) {
            IoBaiterWindow._report.close();
            IoBaiterWindow._report = null;
        }
    }

    // ---- small parts
    private static text(s: string, size: int, color: uint, w: number, bold: boolean = false, align: string = "left", lines: int = 1): TextField {
        let f: TextField = new TextField();
        f.selectable = false;
        f.mouseEnabled = false;
        f.width = w;
        let fmt: TextFormat = new TextFormat("Verdana", size, color, bold);
        fmt.align = align;
        f.defaultTextFormat = fmt;
        if (lines > 1) {
            f.multiline = true;
            f.wordWrap = true;
        }
        f.height = Math.ceil(size * 1.35 * lines + 6);
        f.htmlText = s;
        return f;
    }

    private static head(parent: Sprite, s: string, x: number, y: number, w: number = 200): TextField {
        let t: TextField = as3.as(parent.addChild(CasinoUI.label(s.toUpperCase(), 11, 0xFFB35A, true, w)), TextField);
        t.x = x;
        t.y = y;
        return t;
    }

    private static small(parent: Sprite, name: string, s: string, x: number, y: number, w: int, h: int, fn: Function): Sprite {
        let b: Sprite = as3.as(parent.addChild(CasinoUI.toggle(s, w, h, fn)), Sprite);
        b.name = name;
        b.x = x;
        b.y = y;
        return b;
    }

    private static mark(dirty: boolean = true): void {
        if (dirty) {
            IoBaiterWindow._dirty = true;
        }
        IoBaiterWindow.refresh();
    }

    private static levelOf(id: string): int {
        let max: int = IoBaiter.maxLevel(id);
        let l: int = IoBaiterWindow._lv[id] | 0;
        if (l < 1 || l > max) {
            l = max;
        }
        return Math.max(1, l) | 0;
    }

    // ---- the window
    private static build(): void {
        let W: int = IoBaiterWindow.W;
        let H: int = IoBaiterWindow.H;
        let win: any = IoWin.openPanel("ioBaiter", W, H, KEYS.Get("#b_wildmonsterbaiter#"));
        IoBaiterWindow._win = win;
        let closeWas: Function = win.close;
        win.close = (e: any = null): void => {
            if (win.closed) {
                return;
            }
            closeWas(e);
            if (IoBaiterWindow._dirty) {
                IoBaiterWindow._dirty = false;
                BASE.Save();
            }
        };
        let mc: Sprite = win.mc;
        let left: int = win.left;
        let top: int = win.top;
        let ui: any = { "cards": [], "tabs": {} };
        IoBaiterWindow._ui = ui;

        // the tabs
        let i: int = 0;
        for (let tab of IoBaiter.TABS) {
            let t: string = tab;
            let b: Sprite = as3.as(mc.addChild(CasinoUI.toggle(KEYS.Get("io_bt_tab_" + tab), 112, 28, (e: any): void => {
                IoBaiterWindow._tab = t;
                IoBaiterWindow._page = 0;
                IoBaiterWindow.drawGrid();
                IoBaiterWindow.refresh();
            }, "tab")), Sprite);
            b.name = "ioBaiterTab:" + tab;
            GLOBAL.ioFitText(as3.as(b.getChildAt(0), TextField), 8);
            b.x = left + 20 + i * 118;
            b.y = top + 60;
            ui.tabs[tab] = b;
            i++;
        }
        ui.grid = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.grid.x = left + 20;
        ui.grid.y = top + 100;

        // the pages, and the tip
        ui.prev = IoBaiterWindow.small(mc, "ioBaiterPrev", "◀", left + 20, top + 498, 32, 24, (e: any): void => {
            IoBaiterWindow.page(-1);
        });
        ui.pageText = as3.as(mc.addChild(CasinoUI.label("", 11, 0xD9C6A8, false, 100, TextFormatAlign.CENTER)), TextField);
        ui.pageText.x = left + 56;
        ui.pageText.y = top + 502;
        ui.next = IoBaiterWindow.small(mc, "ioBaiterNext", "▶", left + 160, top + 498, 32, 24, (e: any): void => {
            IoBaiterWindow.page(1);
        });
        let tip: TextField = as3.as(mc.addChild(IoBaiterWindow.text(KEYS.Get("io_bt_tip"), 10, 0xA09088, 380, false, "left", 2)), TextField);
        tip.x = left + 206;
        tip.y = top + 498;
        ui.about = as3.as(mc.addChild(IoBaiterWindow.text("", 10, 0xD9C6A8, 584, false, "left", 3)), TextField);
        ui.about.x = left + 20;
        ui.about.y = top + 534;

        IoBaiterWindow.drawSide(mc, left + 624, top);
        IoBaiterWindow.drawGrid();
        IoBaiterWindow.refresh();
    }

    private static page(d: int): void {
        let pages: int = Math.max(1, Math.ceil(IoBaiter.ids(IoBaiterWindow._tab).length / IoBaiterWindow.PER_PAGE)) | 0;
        let p: int = Math.max(0, Math.min(pages - 1, IoBaiterWindow._page + d)) | 0;
        if (p != IoBaiterWindow._page) {
            IoBaiterWindow._page = p;
            IoBaiterWindow.drawGrid();
            IoBaiterWindow.refresh();
        }
    }

    /** The cards of the tab's page (or why it has none). */
    private static drawGrid(): void {
        let ui: any = IoBaiterWindow._ui;
        if (!ui) {
            return;
        }
        CasinoUI.removeAll(ui.grid);
        ui.cards = [];
        let tab: string = IoBaiterWindow._tab;
        let ids: string[] = IoBaiter.ids(tab);
        if (!ids.length) {
            let why: string = tab == "hfo" ? KEYS.Get("io_bt_hfo_locked") : tab == "infc" ? KEYS.Get("io_bt_none_infc") : KEYS.Get("io_bt_none_inf");
            let p: Sprite = as3.as(ui.grid.addChild(CasinoUI.panel(584, 120, 0.6)), Sprite);
            p.y = 40;
            let t: TextField = as3.as(ui.grid.addChild(IoBaiterWindow.text(why, 13, 0xF4E6D0, 540, false, "center", 3)), TextField);
            t.name = "ioBaiterNone";
            t.x = 22;
            t.y = 78;
            return;
        }
        let start: int = (IoBaiterWindow._page * IoBaiterWindow.PER_PAGE) | 0;
        for (let n: int = 0; n < IoBaiterWindow.PER_PAGE && start + n < ids.length; n++) {
            let c: any = IoBaiterWindow.card(ids[start + n]);
            c.mc.x = (n % 4) * (IoBaiterWindow.CARD_W + 8);
            c.mc.y = Math.floor(n / 4) * (IoBaiterWindow.CARD_H + 8);
            ui.grid.addChild(c.mc);
            ui.cards.push(c);
        }
    }

    private static card(id: string): any {
        let W: int = IoBaiterWindow.CARD_W;
        let mc: Sprite = new Sprite();
        mc.name = "ioBaiterCard:" + id;
        mc.addChild(CasinoUI.panel(W, IoBaiterWindow.CARD_H));
        let frame: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        frame.graphics.lineStyle(1, 0x6A4A38, 1);
        frame.graphics.beginFill(0x120C0B, 1);
        frame.graphics.drawRoundRect(7, 7, 54, 54, 8, 8);
        frame.graphics.endFill();
        let pic: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        pic.mouseEnabled = false;
        let c: any = { "id": id, "mc": mc, "pic": pic, "picKey": null };
        let nameField: TextField = as3.as(mc.addChild(CasinoUI.label(IoBaiter.nameOf(id), 11, 0xFFFFFF, true, 72)), TextField);
        nameField.x = 64;
        nameField.y = 6;
        GLOBAL.ioFitText(nameField, 8);
        let single: boolean = IoBaiter.maxLevel(id) <= 1;
        c.down = IoBaiterWindow.small(mc, "ioBaiterLvDown:" + id, "◀", 64, 28, 18, 18, (e: any): void => {
            IoBaiterWindow._lv[id] = Math.max(1, IoBaiterWindow.levelOf(id) - 1);
            IoBaiterWindow.mark(false);
        });
        c.lv = as3.as(mc.addChild(CasinoUI.label("", 10, 0xF4E6D0, true, 34, TextFormatAlign.CENTER)), TextField);
        c.lv.name = "ioBaiterLv:" + id;
        c.lv.x = 82;
        c.lv.y = 29;
        c.up = IoBaiterWindow.small(mc, "ioBaiterLvUp:" + id, "▶", 116, 28, 18, 18, (e: any): void => {
            IoBaiterWindow._lv[id] = Math.min(IoBaiter.maxLevel(id), IoBaiterWindow.levelOf(id) + 1);
            IoBaiterWindow.mark(false);
        });
        if (single) {
            c.down.visible = false;
            c.up.visible = false;
        }
        c.cost = as3.as(mc.addChild(CasinoUI.label("", 10, 0xD9C6A8, false, 76)), TextField);
        c.cost.x = 64;
        c.cost.y = 47;
        c.minus = IoBaiterWindow.small(mc, "ioBaiterMinus:" + id, "−", 8, 70, 34, 26, (e: MouseEvent): void => {
            IoBaiter.add(id, IoBaiterWindow.levelOf(id), e && e.shiftKey ? -10 : -1);
            IoBaiterWindow.mark();
        });
        c.count = as3.as(mc.addChild(CasinoUI.label("0", 15, 0xFFFFFF, true, 56, TextFormatAlign.CENTER)), TextField);
        c.count.name = "ioBaiterCount:" + id;
        c.count.x = 42;
        c.count.y = 72;
        c.plus = IoBaiterWindow.small(mc, "ioBaiterPlus:" + id, "+", W - 42, 70, 34, 26, (e: MouseEvent): void => {
            let got: int = IoBaiter.add(id, IoBaiterWindow.levelOf(id), e && e.shiftKey ? 10 : 1);
            if (got == 0) {
                SOUNDS.Play("error1");
            }
            IoBaiterWindow.mark();
        });
        c.other = as3.as(mc.addChild(CasinoUI.label("", 9, 0xA09088, false, W - 12, TextFormatAlign.CENTER)), TextField);
        c.other.x = 6;
        c.other.y = 102;
        return c;
    }

    private static cardRefresh(c: any): void {
        let id: string = c.id;
        let lv: int = IoBaiterWindow.levelOf(id);
        let max: int = IoBaiter.maxLevel(id);
        CasinoUI.setText(c.lv, KEYS.Get("io_bt_lv", { "v1": lv }));
        CasinoUI.enable(c.down, lv > 1);
        c.down.alpha = lv > 1 ? 1 : 0.4;
        c.up.alpha = lv < max ? 1 : 0.4;
        CasinoUI.setText(c.cost, KEYS.Get("io_bt_cost", { "v1": GLOBAL.FormatNumber(IoBaiter.cost(id, lv)) }));
        let n: int = IoBaiter.count(IoBaiter.key(id, lv));
        CasinoUI.setText(c.count, String(n));
        c.count.textColor = n > 0 ? 0xFFD27A : 0x8C7C70;
        c.minus.alpha = n > 0 ? 1 : 0.4;
        c.plus.alpha = IoBaiter.room(id, lv) > 0 && n < IoBaiter.MAX_EACH ? 1 : 0.4;
        let other: int = (IoBaiter.countAll(id) - n) | 0;
        CasinoUI.setText(c.other, other > 0 ? KEYS.Get("io_bt_other_levels", { "v1": other }) : "");
        let key: string = IoBaiter.icon(id, lv);
        if (c.picKey != key) {
            c.picKey = key;
            // (a fresh holder each time: a picture still loading for the old level lands in one that has gone)
            CasinoUI.removeAll(c.pic);
            let holder: Sprite = as3.as(c.pic.addChild(new Sprite()), Sprite);
            CasinoUI.picture(holder, key, 9, 9, 50, 50);
        }
    }

    /** The right side: the wave, the musk, where from, the raid's kind, how they come, saved waves and Send. */
    private static drawSide(mc: Sprite, x: number, top: number): void {
        let ui: any = IoBaiterWindow._ui;
        let W: int = 256;
        IoBaiterWindow.head(mc, KEYS.Get("io_bt_wave"), x, top + 62, 180);
        ui.clear = IoBaiterWindow.small(mc, "ioBaiterClear", KEYS.Get("io_bt_clear"), x + W - 66, top + 58, 66, 22, (e: any): void => {
            IoBaiter.clear();
            IoBaiterWindow.mark();
        });
        let listBg: Sprite = as3.as(mc.addChild(CasinoUI.panel(W, IoBaiterWindow.LIST_ROWS * 20 + 10, 0.6)), Sprite);
        listBg.x = x;
        listBg.y = top + 84;
        ui.list = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.list.x = x;
        ui.list.y = top + 89;
        // the musk
        ui.bar = as3.as(mc.addChild(new Sprite()), Sprite);
        ui.bar.x = x;
        ui.bar.y = top + 282;
        ui.musk = as3.as(mc.addChild(CasinoUI.label("", 10, 0xF4E6D0, false, W, TextFormatAlign.CENTER)), TextField);
        ui.musk.name = "ioBaiterMusk";
        ui.musk.x = x;
        ui.musk.y = top + 294;
        // where they come from
        IoBaiterWindow.head(mc, KEYS.Get("io_bt_dir"), x, top + 314);
        ui.dirs = [];
        for (let n: int = 0; n < 9; n++) {
            let side: int = IoBaiterWindow.COMPASS[n][0] | 0;
            let label: string = side == IoBaiter.DIR_ALL ? KEYS.Get("io_bt_dir_all") : String(IoBaiterWindow.COMPASS[n][1]);
            let b: Sprite = IoBaiterWindow.small(mc, "ioBaiterDir:" + side, label, x + (n % 3) * 54, top + 332 + Math.floor(n / 3) * 27, 50, 24, (e: any): void => {
                IoBaiter._dir = side;
                IoBaiterWindow.mark();
            });
            ui.dirs.push([side, b]);
        }
        let any: Sprite = IoBaiterWindow.small(mc, "ioBaiterDir:" + IoBaiter.DIR_ANY, KEYS.Get("io_bt_dir_any"), x + 168, top + 359, 88, 24, (e: any): void => {
            IoBaiter._dir = IoBaiter.DIR_ANY;
            IoBaiterWindow.mark();
        });
        ui.dirs.push([IoBaiter.DIR_ANY, any]);
        // practice or real
        ui.practice = IoBaiterWindow.small(mc, "ioBaiterPractice", KEYS.Get("io_bt_practice"), x, top + 420, 125, 24, (e: any): void => {
            IoBaiter._practice = true;
            IoBaiterWindow.mark();
        });
        ui.real = IoBaiterWindow.small(mc, "ioBaiterReal", KEYS.Get("io_bt_real"), x + 131, top + 420, 125, 24, (e: any): void => {
            IoBaiter._practice = false;
            IoBaiterWindow.mark();
        });
        // how they come, and the speed
        ui.waves = [];
        for (let w: int = 1; w <= 3; w++) {
            let ww: int = w;
            let b: Sprite = IoBaiterWindow.small(mc, "ioBaiterWaves:" + w, KEYS.Get(w == 1 ? "io_bt_once" : "io_bt_waves", { "v1": w }), x + (w - 1) * 62, top + 452, 58, 24, (e: any): void => {
                IoBaiter._waves = ww;
                IoBaiterWindow.mark();
            });
            ui.waves.push([w, b]);
        }
        ui.speed = IoBaiterWindow.small(mc, "ioBaiterSpeed", KEYS.Get("io_bt_speed"), x + 186, top + 452, 70, 24, (e: any): void => {
            IoBaiter._speed = IoBaiter._speed == 2 ? 1 : 2;
            IoBaiterWindow.mark();
        });
        // saved waves
        IoBaiterWindow.head(mc, KEYS.Get("io_bt_saved"), x, top + 484);
        ui.slots = [];
        for (let s: int = 0; s < IoBaiter.SLOTS; s++) {
            let slot: int = s;
            let b: Sprite = IoBaiterWindow.small(mc, "ioBaiterSlot:" + s, KEYS.Get("io_bt_slot", { "v1": s + 1 }), x + s * 64, top + 502, 60, 24, (e: any): void => {
                IoBaiterWindow.slotClick(slot);
            });
            ui.slots.push(b);
        }
        ui.save = IoBaiterWindow.small(mc, "ioBaiterSave", KEYS.Get("io_bt_save"), x + 192, top + 502, 64, 24, (e: any): void => {
            IoBaiterWindow._saveMode = !IoBaiterWindow._saveMode;
            IoBaiterWindow.refresh();
        });
        // send them
        ui.send = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_bt_send"), W, 44, (e: any): void => {
            IoBaiter.send();
        }, true, 17)), Sprite);
        ui.send.name = "ioBaiterSend";
        ui.send.x = x;
        ui.send.y = top + 538;
    }

    private static slotClick(i: int): void {
        if (IoBaiterWindow._saveMode) {
            if (!IoBaiter.entries().length) {
                GLOBAL.Message(KEYS.Get("io_bt_empty_save"));
                return;
            }
            IoBaiter.saveSlot(i);
            IoBaiterWindow._saveMode = false;
            IoToast.Show(KEYS.Get("io_bt_saved_as", { "v1": i + 1 }), 3000);
            IoBaiterWindow.refresh();
            return;
        }
        if (!IoBaiter.loadSlot(i)) {
            GLOBAL.Message(KEYS.Get("io_bt_slot_empty"));
            return;
        }
        IoBaiterWindow.mark();
    }

    private static refresh(): void {
        let ui: any = IoBaiterWindow._ui;
        if (!ui || !IoBaiterWindow.isOpen) {
            return;
        }
        for (let tab of IoBaiter.TABS) {
            CasinoUI.choose(ui.tabs[tab], tab == IoBaiterWindow._tab);
        }
        for (let c of ui.cards) {
            IoBaiterWindow.cardRefresh(c);
        }
        let ids: string[] = IoBaiter.ids(IoBaiterWindow._tab);
        let pages: int = Math.max(1, Math.ceil(ids.length / IoBaiterWindow.PER_PAGE)) | 0;
        CasinoUI.setText(ui.pageText, KEYS.Get("io_bt_page", { "v1": IoBaiterWindow._page + 1, "v2": pages }));
        ui.prev.visible = ui.next.visible = ui.pageText.visible = pages > 1;
        ui.prev.alpha = IoBaiterWindow._page > 0 ? 1 : 0.4;
        ui.next.alpha = IoBaiterWindow._page < pages - 1 ? 1 : 0.4;
        CasinoUI.setHtml(ui.about, KEYS.Get(IoBaiter._practice ? "io_bt_about_practice" : "io_bt_about_real"));

        // the wave
        CasinoUI.removeAll(ui.list);
        let list: any[] = IoBaiter.entries();
        if (!list.length) {
            let t: TextField = as3.as(ui.list.addChild(IoBaiterWindow.text(KEYS.Get("io_bt_wave_empty"), 11, 0xA09088, 236, false, "center", 4)), TextField);
            t.x = 10;
            t.y = 50;
        }
        let rows: int = IoBaiterWindow.LIST_ROWS;
        for (let r: int = 0; r < list.length && r < rows; r++) {
            let e: any = list[r];
            if (r == rows - 1 && list.length > rows) {
                let more: TextField = as3.as(ui.list.addChild(CasinoUI.label(KEYS.Get("io_bt_more", { "v1": list.length - rows + 1 }), 10, 0xA09088, false, 236, TextFormatAlign.CENTER)), TextField);
                more.x = 10;
                more.y = r * 20;
                break;
            }
            let row: Sprite = as3.as(ui.list.addChild(new Sprite()), Sprite);
            row.name = "ioBaiterRow:" + e.key;
            row.y = r * 20;
            let nm: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get("io_bt_row", { "v1": IoBaiter.nameOf(e.id), "v2": e.level }), 11, 0xF4E6D0, false, 150)), TextField);
            nm.x = 10;
            GLOBAL.ioFitText(nm, 8);
            let n: TextField = as3.as(row.addChild(CasinoUI.label("×" + e.count, 11, 0xFFD27A, true, 50, TextFormatAlign.RIGHT)), TextField);
            n.x = 160;
            let key: string = e.key;
            let x: Sprite = as3.as(row.addChild(new Sprite()), Sprite);
            x.name = "ioBaiterRemove:" + key;
            x.buttonMode = true;
            x.mouseChildren = false;
            x.graphics.beginFill(0x000000, 0);
            x.graphics.drawRect(0, 0, 22, 18);
            x.graphics.endFill();
            let xt: TextField = as3.as(x.addChild(CasinoUI.label("✕", 11, 0xFF7A5A, true, 22, TextFormatAlign.CENTER)), TextField);
            xt.y = 0;
            x.x = 222;
            x.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
                SOUNDS.Play("click1");
                IoBaiter.remove(key);
                IoBaiterWindow.mark();
            });
        }

        // the musk
        let used: int = IoBaiter.used();
        let cap: int = IoBaiter.capacity();
        let g: any = ui.bar.graphics;
        g.clear();
        g.beginFill(0x120C0B, 1);
        g.lineStyle(1, 0x6A4A38, 1);
        g.drawRoundRect(0, 0, 256, 10, 10, 10);
        g.endFill();
        let f: number = cap > 0 ? Math.min(1, used / cap) : 0;
        if (f > 0) {
            g.lineStyle();
            g.beginFill(f >= 1 ? 0xFF6A3A : 0xE08A30, 1);
            g.drawRoundRect(1, 1, Math.max(8, 254 * f), 8, 8, 8);
            g.endFill();
        }
        CasinoUI.setText(ui.musk, KEYS.Get("io_bt_musk", { "v1": GLOBAL.FormatNumber(used), "v2": GLOBAL.FormatNumber(cap) }));
        CasinoUI.enable(ui.clear, list.length > 0);

        for (let d of ui.dirs) {
            CasinoUI.choose(d[1], (d[0] | 0) == IoBaiter._dir);
        }
        CasinoUI.choose(ui.practice, IoBaiter._practice);
        CasinoUI.choose(ui.real, !IoBaiter._practice);
        for (let w of ui.waves) {
            CasinoUI.choose(w[1], (w[0] | 0) == IoBaiter._waves);
        }
        CasinoUI.choose(ui.speed, IoBaiter._speed == 2);
        for (let s: int = 0; s < IoBaiter.SLOTS; s++) {
            let size: any = IoBaiter.slotSize(s);
            CasinoUI.choose(ui.slots[s], IoBaiterWindow._saveMode);
            ui.slots[s].alpha = size || IoBaiterWindow._saveMode ? 1 : 0.5;
        }
        CasinoUI.choose(ui.save, IoBaiterWindow._saveMode);
        CasinoUI.enable(ui.send, list.length > 0);
    }

    // ---- the report
    /** After a raid: what it did, with Send again, Change the wave and Close. */
    public static ShowReport(r: any): void {
        if (!r || IoBaiterWindow.isOpen) {
            return;
        }
        IoBaiterWindow.CloseReport();
        let W: int = 560;
        let rows: any[] = as3.as(r.rows, Array) || [];
        let shown: int = Math.min(rows.length, 8) | 0;
        let H: int = (276 + shown * 30) | 0;
        let win: any = IoWin.openPanel("ioBaiterReport", W, H, KEYS.Get("io_bt_rep_title"));
        IoBaiterWindow._report = win;
        let mc: Sprite = win.mc;
        let left: int = win.left;
        let top: int = win.top;
        let lead: string = KEYS.Get(r.practice ? "io_bt_rep_practice" : "io_bt_rep_real");
        if (r.scared) {
            lead += " " + KEYS.Get("io_bt_rep_scared");
        }
        let t: TextField = as3.as(mc.addChild(IoBaiterWindow.text(lead, 12, 0xF4E6D0, W - 40, false, "left", 2)), TextField);
        t.name = "ioBaiterRepLead";
        t.x = left + 20;
        t.y = top + 54;
        let sum: TextField = as3.as(mc.addChild(IoBaiterWindow.text(KEYS.Get("io_bt_rep_sum", { "v1": r.sent | 0, "v2": r.killed | 0, "v3": Math.max(0, (r.sent | 0) - (r.killed | 0)), "v4": GLOBAL.ioDuration(r.secs | 0) }), 13, 0xFFD27A, W - 40, true)), TextField);
        sum.name = "ioBaiterRepSum";
        sum.x = left + 20;
        sum.y = top + 94;
        // each kind
        let y: number = top + 124;
        for (let i: int = 0; i < shown; i++) {
            let row: any = rows[i];
            let pic: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
            CasinoUI.picture(pic, IoBaiter.icon(String(row.id), row.level | 0), left + 24, y, 26, 26);
            let n: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_bt_row", { "v1": IoBaiter.nameOf(String(row.id)), "v2": row.level | 0 }), 11, 0xF4E6D0, false, 260)), TextField);
            n.x = left + 58;
            n.y = y + 4;
            GLOBAL.ioFitText(n, 8);
            let k: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_bt_rep_row", { "v1": row.killed | 0, "v2": row.sent | 0 }), 11, (row.killed | 0) >= (row.sent | 0) ? 0x9CE07A : 0xFFB35A, true, 220, TextFormatAlign.RIGHT)), TextField);
            k.x = left + W - 240;
            k.y = y + 4;
            y += 30;
        }
        if (rows.length > shown) {
            let more: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_bt_more", { "v1": rows.length - shown }), 10, 0xA09088, false, W - 40)), TextField);
            more.x = left + 58;
            more.y = y - 4;
            y += 14;
        }
        // the yard
        let lines: string[] = [];
        let lost: string = KEYS.Get("io_bt_rep_lost", { "v1": r.lost | 0 });
        let names: any[] = as3.as(r.lostNames, Array) || [];
        if (names.length) {
            lost += " (" + names.slice(0, 5).join(", ") + (names.length > 5 ? ", …" : "") + ")";
        }
        lines.push(lost);
        lines.push(KEYS.Get("io_bt_rep_damage", { "v1": r.damage | 0 }) + "  ·  " + KEYS.Get("io_bt_rep_walls", { "v1": r.walls | 0 }) + "  ·  " + KEYS.Get("io_bt_rep_traps", { "v1": r.traps | 0 }));
        let took: string[] = [];
        let res: any[] = as3.as(r.took, Array) || [];
        for (let i: int = 0; i < 4; i++) {
            if (Number(res[i]) >= 1) {
                took.push(GLOBAL.ioShort(Number(res[i])) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[i])));
            }
        }
        let tookText: string = took.length ? took.join(", ") : KEYS.Get("io_bt_rep_nothing");
        lines.push(KEYS.Get(r.practice ? "io_bt_rep_would_take" : "io_bt_rep_took", { "v1": tookText }));
        let yard: TextField = as3.as(mc.addChild(IoBaiterWindow.text(lines.join("<br>"), 11, 0xD9C6A8, W - 40, false, "left", 5)), TextField);
        yard.name = "ioBaiterRepYard";
        yard.x = left + 20;
        yard.y = y + 8;
        // the buttons
        let again: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_bt_again"), 170, 40, (e: any): void => {
            IoBaiterWindow.CloseReport();
            IoBaiter.send();
        }, true, 15)), Sprite);
        again.name = "ioBaiterAgain";
        again.x = left + 20;
        again.y = top + H - 60;
        let change: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_bt_change"), 170, 40, (e: any): void => {
            IoBaiterWindow.CloseReport();
            IoBaiterWindow.Show();
        }, true, 15)), Sprite);
        change.name = "ioBaiterChange";
        change.x = left + 195;
        change.y = top + H - 60;
        let close: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_bt_close"), 150, 40, (e: any): void => {
            IoBaiterWindow.CloseReport();
        }, true, 15)), Sprite);
        close.name = "ioBaiterRepClose";
        close.x = left + W - 170;
        close.y = top + H - 60;
    }
}
