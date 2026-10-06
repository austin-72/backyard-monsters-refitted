import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { GradientType, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { BASE, CasinoUI, GLOBAL, IoAllianceUi, IoQuestArt, IoQuests, KEYS, POPUPSETTINGS, QUESTS, SOUNDS } from "@game";

/**
 * Inferno-only: the quest book (the user's design of 2 October: "something like a tree of quests"), opened
 * by the Quests button (QUESTS.Show) and the dock's rows. In the Leaderboards' look:
 *
 *  - left, the categories (and today's daily quests), each with how many are collected and a badge for
 *    the ones ready;
 *  - middle, the category's quests as a tree: a quest opens once the one above it is collected. Drag (or
 *    the wheel) to move round it. "Hide finished" folds away branches that are all collected;
 *  - under it, the category's chest: every quest in it (the optional ones aside) collected;
 *  - right, the quest picked: what to do, how far along, the reward, Collect and Go there;
 *  - top, the whole book: quests collected, chests, the book's own chest, Collect all.
 *
 * The server decides what is ready and pays it (IoQuests); this only draws IoQuests.book.
 */
export class IoQuestBook extends ASObject {
    static {
        as3.fields(this, { mc: null, _catRows: null, _catLayer: null, _canvas: null, _content: null, _edges: null, _nodes: null, _nodeSprites: null, _panel: null, _chestStrip: null, _top: null, _status: null, _hideToggle: null, _hint: null, _collectAll: null, _selected: null, _version: -1, _dragging: false, _dragFromX: 0, _dragFromY: 0, _dragMoved: false, _contentW: 0, _contentH: 0, _statusUntil: 0 });
    }

    public static W: int; // const

    public static H: int; // const

    private static CAT_X: int; // const

    private static CAT_W: int; // const

    private static CANVAS_X: int; // const

    private static CANVAS_Y: int; // const

    private static CANVAS_W: int; // const

    private static CANVAS_H: int; // const

    private static PANEL_X: int; // const

    private static PANEL_W: int; // const

    private static NODE_R: int; // const

    private static NODE_DX: int; // const

    private static LEVEL_DY: int; // const

    private static GLYPHS: any; // const

    private static _open: IoQuestBook;

    /** The category shown last, and whether finished branches are folded (kept between openings). */
    private static _cat: string;

    private static _hideDone: boolean;

    static {
        as3.lazyStatics(this, { W: 0, H: 0, CAT_X: 0, CAT_W: 0, CANVAS_X: 0, CANVAS_Y: 0, CANVAS_W: 0, CANVAS_H: 0, PANEL_X: 0, PANEL_W: 0, NODE_R: 0, NODE_DX: 0, LEVEL_DY: 0, GLYPHS: null, _open: null, _cat: null, _hideDone: false }, () => {
            IoQuestBook.W = 780;
            IoQuestBook.H = 560;
            IoQuestBook.CAT_X = (-IoQuestBook.W / 2 + 16) | 0;
            IoQuestBook.CAT_W = 132;
            IoQuestBook.CANVAS_X = (-IoQuestBook.W / 2 + 160) | 0;
            IoQuestBook.CANVAS_Y = (-IoQuestBook.H / 2 + 104) | 0;
            IoQuestBook.CANVAS_W = 384;
            IoQuestBook.CANVAS_H = 344;
            IoQuestBook.PANEL_X = (IoQuestBook.CANVAS_X + IoQuestBook.CANVAS_W + 12) | 0;
            IoQuestBook.PANEL_W = (IoQuestBook.W / 2 - 16 - IoQuestBook.PANEL_X) | 0;
            IoQuestBook.NODE_R = 22;
            IoQuestBook.NODE_DX = 88;
            IoQuestBook.LEVEL_DY = 86;
            IoQuestBook.GLYPHS = { "daily": "star", "start": "flag", "yard": "hall", "monsters": "egg", "battles": "sword", "map": "map", "outposts": "outpost", "alliances": "banner", "social": "chat", "events": "gift", "pit": "dice" };
            IoQuestBook._open = null;
            IoQuestBook._cat = "start";
            IoQuestBook._hideDone = false;
        });
    }
    public mc: MovieClip;
    private _catRows: any;
    private _catLayer: Sprite;
    private _canvas: Sprite;
    private _content: Sprite;
    private _edges: Shape;
    private _nodes: Sprite;
    private _nodeSprites: any;
    private _panel: Sprite;
    private _chestStrip: Sprite;
    private _top: Sprite;
    private _status: TextField;
    private _hideToggle: Sprite;
    private _hint: TextField;
    private _collectAll: Sprite;
    private _selected: string;
    private _version: int;
    private _dragging: boolean;
    private _dragFromX: number;
    private _dragFromY: number;
    private _dragMoved: boolean;
    private _contentW: number;
    private _contentH: number;
    private _statusUntil: int;

    public $ctor(focus?: string): void {
        this._catRows = {};
        this._nodeSprites = {};
        super.$ctor();
        this._selected = focus;
        this.mc = new MovieClip();
        this.mc.name = "ioQuestBookWindow";
        this.drawFrame();
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("io_quest_title"), 30, 260, TextFormatAlign.LEFT)), TextField);
        GLOBAL.ioFitText(title, 20);
        title.x = -IoQuestBook.W / 2 + 22;
        title.y = -IoQuestBook.H / 2 + 14;
        this._top = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._catLayer = as3.as(this.mc.addChild(new Sprite()), Sprite);
        // the tree
        let box: Sprite = as3.as(this.mc.addChild(CasinoUI.panel(IoQuestBook.CANVAS_W, IoQuestBook.CANVAS_H, 0.9)), Sprite);
        box.x = IoQuestBook.CANVAS_X;
        box.y = IoQuestBook.CANVAS_Y;
        this._canvas = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._canvas.name = "ioQuestCanvas";
        this._canvas.x = IoQuestBook.CANVAS_X;
        this._canvas.y = IoQuestBook.CANVAS_Y;
        let hit: Shape = as3.as(this._canvas.addChild(new Shape()), Shape);
        hit.graphics.beginFill(0, 0);
        hit.graphics.drawRect(0, 0, IoQuestBook.CANVAS_W, IoQuestBook.CANVAS_H);
        hit.graphics.endFill();
        this._content = as3.as(this._canvas.addChild(new Sprite()), Sprite);
        this._edges = as3.as(this._content.addChild(new Shape()), Shape);
        this._nodes = as3.as(this._content.addChild(new Sprite()), Sprite);
        let mask: Shape = as3.as(this._canvas.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(1, 1, IoQuestBook.CANVAS_W - 2, IoQuestBook.CANVAS_H - 2, 12, 12);
        mask.graphics.endFill();
        this._content.mask = mask;
        this._canvas.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this._canvas.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.onWheel));
        this._chestStrip = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._chestStrip.x = IoQuestBook.CANVAS_X;
        this._chestStrip.y = IoQuestBook.CANVAS_Y + IoQuestBook.CANVAS_H + 8;
        // the quest picked
        let pbox: Sprite = as3.as(this.mc.addChild(CasinoUI.panel(IoQuestBook.PANEL_W, (IoQuestBook.CANVAS_H + 64) | 0, 0.9)), Sprite);
        pbox.x = IoQuestBook.PANEL_X;
        pbox.y = IoQuestBook.CANVAS_Y;
        this._panel = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._panel.x = IoQuestBook.PANEL_X;
        this._panel.y = IoQuestBook.CANVAS_Y;
        this._hideToggle = as3.as(this.mc.addChild(CasinoUI.toggle(KEYS.Get("io_quest_hide_done"), 120, 22, as3.bind(this, this.toggleHide))), Sprite);
        this._hideToggle.name = "ioQuestHideDone";
        this._hideToggle.x = IoQuestBook.CANVAS_X + IoQuestBook.CANVAS_W - 120;
        this._hideToggle.y = IoQuestBook.CANVAS_Y - 28;
        CasinoUI.choose(this._hideToggle, IoQuestBook._hideDone);
        this._hint = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("io_quest_drag_hint"), 10, CasinoUI.ASH, false, (IoQuestBook.CANVAS_W - 130) | 0, TextFormatAlign.LEFT)), TextField);
        this._hint.x = IoQuestBook.CANVAS_X + 2;
        this._hint.y = IoQuestBook.CANVAS_Y - 24;
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, (IoQuestBook.W - 200) | 0, TextFormatAlign.LEFT)), TextField);
        this._status.name = "ioQuestStatus";
        this._status.x = IoQuestBook.CAT_X + IoQuestBook.CAT_W + 14;
        this._status.y = IoQuestBook.H / 2 - 24;
        let old: Sprite = as3.as(this.mc.addChild(IoQuestBook.textLink(KEYS.Get("io_quest_old"), as3.bind(this, this.openOld))), Sprite);
        old.name = "ioQuestOld";
        old.x = IoQuestBook.CAT_X;
        old.y = IoQuestBook.H / 2 - 24;
        // close
        let x: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        x.name = "ioQuestClose";
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
        x.x = IoQuestBook.W / 2 - 24;
        x.y = -IoQuestBook.H / 2 + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        this.redraw(true);
    }

    /** Opens the book (at the quest `focus`, if given: the dock's rows, the toast). */
    public static Show(e: MouseEvent = null, focus: string = null): void {
        if (!IoQuests.on) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        if (IoQuestBook._open && (!IoQuestBook._open.mc || !IoQuestBook._open.mc.stage)) {
            IoQuestBook._open = null;
        }
        if (focus) {
            let q: any = IoQuests.quest(focus);
            if (focus.indexOf("daily:") == 0) {
                IoQuestBook._cat = "daily";
            } else if (q) {
                IoQuestBook._cat = String(q.cat);
            }
        }
        if (IoQuestBook._open) {
            if (focus) {
                IoQuestBook._open._selected = focus.indexOf("daily:") == 0 ? null : focus;
                IoQuestBook._open.redraw(true);
            }
            return;
        }
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        BASE.BuildingDeselect();
        SOUNDS.Play("click1");
        IoQuestBook._open = new IoQuestBook(focus && focus.indexOf("daily:") != 0 ? focus : null);
        IoQuests.refresh(GLOBAL.Timestamp() - IoQuests.fetchedAt > 15);
    }

    public static get isOpen(): boolean {
        return IoQuestBook._open != null;
    }

    public static CloseOpen(): void {
        if (IoQuestBook._open) {
            IoQuestBook._open.close();
        }
        IoQuestBook._open = null;
    }

    private drawFrame(): void {
        let bg: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(IoQuestBook.W, IoQuestBook.H, Math.PI / 2, -IoQuestBook.W / 2, -IoQuestBook.H / 2);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(-IoQuestBook.W / 2, -IoQuestBook.H / 2, IoQuestBook.W, IoQuestBook.H, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        let art: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        art.alpha = 0.55;
        CasinoUI.picture(art, "leaderboards/bg.jpg", -IoQuestBook.W / 2 + 6, -IoQuestBook.H / 2 + 6, IoQuestBook.W - 12, IoQuestBook.H - 12);
        let mask: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-IoQuestBook.W / 2 + 6, -IoQuestBook.H / 2 + 6, IoQuestBook.W - 12, IoQuestBook.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
    }

    // ---- drawing it all (again when the book changes)
    private redraw(recentre: boolean): void {
        this._version = IoQuests.version;
        this.drawTop();
        this.drawCategories();
        let book: any = IoQuests.book;
        if (!book) {
            CasinoUI.removeAll(this._nodes);
            this._edges.graphics.clear();
            CasinoUI.removeAll(this._panel);
            CasinoUI.removeAll(this._chestStrip);
            let wait: TextField = as3.as(this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_loading"), 14, CasinoUI.ASH, true, IoQuestBook.CANVAS_W, TextFormatAlign.CENTER)), TextField);
            wait.y = IoQuestBook.CANVAS_H / 2 - 12;
            this._content.x = this._content.y = 0;
            return;
        }
        this._hideToggle.visible = IoQuestBook._cat != "daily";
        this._hint.visible = IoQuestBook._cat != "daily";
        if (IoQuestBook._cat == "daily") {
            this.drawDaily();
        } else {
            this.drawTree(recentre);
            this.drawChest();
        }
        this.drawPanel();
    }

    private drawTop(): void {
        CasinoUI.removeAll(this._top);
        let book: any = IoQuests.book;
        let x0: int = (-IoQuestBook.W / 2 + 290) | 0;
        let y0: int = (-IoQuestBook.H / 2 + 20) | 0;
        let claimed: int = book ? book.claimed | 0 : 0;
        let total: int = book ? book.total | 0 : 0;
        let chests: any[] = book ? as3.as(book.chests, Array) : [];
        let chestsDone: int = 0;
        let bookChest: any = null;
        for (let c of as3.values(chests)) {
            if (c.cat == "book") {
                bookChest = c;
            } else if (c.state == "claimed") {
                chestsDone++;
            }
        }
        let barW: int = 250;
        IoQuestBook.bar(this._top.graphics, x0, y0 + 20, barW, 12, Number(total > 0 ? claimed / total : 0));
        let line: TextField = as3.as(this._top.addChild(CasinoUI.label(KEYS.Get("io_quest_book_line", { "v1": claimed, "v2": total, "v3": chestsDone, "v4": Math.max(0, chests.length - 1) }), 11, CasinoUI.GOLD, true, (barW + 40) | 0, TextFormatAlign.LEFT)), TextField);
        line.x = x0;
        line.y = y0;
        // the book's own chest
        if (bookChest) {
            let bc: Sprite = this.chestButton(bookChest, 34);
            bc.name = "ioQuestBookChest";
            bc.x = x0 + barW + 28;
            bc.y = y0 + 18;
            this._top.addChild(bc);
        }
        let ready: int = book ? book.ready | 0 : 0;
        this._collectAll = as3.as(this._top.addChild(CasinoUI.button(KEYS.Get("io_quest_collect_all", { "v1": ready }), 136, 30, as3.bind(this, this.collectAll), ready > 0 && !IoQuests.claiming, 12)), Sprite);
        this._collectAll.name = "ioQuestCollectAll";
        this._collectAll.x = IoQuestBook.W / 2 - 50 - 136;
        this._collectAll.y = -IoQuestBook.H / 2 + 46;
    }

    private drawCategories(): void {
        CasinoUI.removeAll(this._catLayer);
        this._catRows = {};
        let book: any = IoQuests.book;
        let cats: any[] = ["daily"].concat(book && book.categories ? as3.as(book.categories, Array) : ["start", "yard", "monsters", "battles", "map", "outposts", "alliances", "social", "events", "pit"]);
        let y: int = (IoQuestBook.CANVAS_Y - 28) | 0;
        for (const $value of as3.values(cats)) {
            let cat: string = as3.str($value);
            let done: int = 0;
            let all: int = 0;
            let ready: int = 0;
            if (book) {
                if (cat == "daily") {
                    for (let d of as3.values(book.daily.quests)) {
                        all++;
                        if (d.state == "claimed") {
                            done++;
                        }
                        if (d.state == "ready") {
                            ready++;
                        }
                    }
                    if (book.daily.bonus && book.daily.bonus.state == "ready") {
                        ready++;
                    }
                } else {
                    for (let q of as3.values(book.quests)) {
                        if (q.cat != cat) {
                            continue;
                        }
                        all++;
                        if (q.state == "claimed") {
                            done++;
                        }
                        if (q.state == "ready") {
                            ready++;
                        }
                    }
                    for (let c of as3.values(book.chests)) {
                        if (c.cat == cat && c.state == "ready") {
                            ready++;
                        }
                    }
                }
            }
            let row: Sprite = this.catRow(cat, done, all, ready);
            row.x = IoQuestBook.CAT_X;
            row.y = y;
            this._catLayer.addChild(row);
            this._catRows[cat] = row;
            y += cat == "daily" ? 38 : 34;
        }
    }

    private catRow(cat: string, done: int, all: int, ready: int): Sprite {
        let on: boolean = cat == IoQuestBook._cat;
        let row: Sprite = new Sprite();
        row.name = "ioQuestCat:" + cat;
        row.buttonMode = true;
        row.mouseChildren = false;
        let m: Matrix = new Matrix();
        m.createGradientBox(IoQuestBook.CAT_W, 30, Math.PI / 2, 0, 0);
        row.graphics.lineStyle(1, (on ? 0xFFE0A0 : 0x7A5A48) >>> 0, 1);
        row.graphics.beginGradientFill(GradientType.LINEAR, on ? [0xE08A30, 0x9A3010] : [0x3A2A26, 0x1E1614], [1, 1], [0, 255], m);
        row.graphics.drawRoundRect(0, 0, IoQuestBook.CAT_W, 30, 8, 8);
        row.graphics.endFill();
        let g: Sprite = as3.as(row.addChild(IoQuestArt.glyph(as3.str(IoQuestBook.GLYPHS[cat] || "star"), 18)), Sprite);
        g.x = 15;
        g.y = 15;
        let name: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get("io_quest_cat_" + cat), 11, (on ? 0xFFFFFF : CasinoUI.GOLD) >>> 0, true, 76, TextFormatAlign.LEFT)), TextField);
        name.x = 27;
        name.y = 7;
        let count: TextField = as3.as(row.addChild(CasinoUI.label(all > 0 ? done + "/" + all : "", 9, (on ? 0xFFF0D0 : CasinoUI.ASH) >>> 0, false, 40, TextFormatAlign.RIGHT)), TextField);
        count.x = IoQuestBook.CAT_W - 44;
        count.y = 9;
        if (ready > 0) {
            let badge: Sprite = as3.as(row.addChild(IoQuestBook.readyBadge(ready)), Sprite);
            badge.x = IoQuestBook.CAT_W - 2;
            badge.y = 2;
        }
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            IoQuestBook._cat = cat;
            this._selected = null;
            this.redraw(true);
        });
        return row;
    }

    private static readyBadge(n: int): Sprite {
        let b: Sprite = new Sprite();
        b.mouseEnabled = false;
        b.graphics.lineStyle(1.5, 4852226, 1);
        b.graphics.beginFill(16756800, 1);
        b.graphics.drawCircle(0, 0, 8);
        b.graphics.endFill();
        let t: TextField = as3.as(b.addChild(CasinoUI.label(String(Math.min(n, 99)), 9, 3805188, true, 20, TextFormatAlign.CENTER)), TextField);
        t.x = -10;
        t.y = -7;
        b.filters = [new GlowFilter(0xFFB040, 0.9, 8, 8, 2, 2)];
        return b;
    }

    // ---- the tree
    /** The category's quests, each with its children, in the book's order. */
    private treeOf(cat: string): any {
        let q: any = null;
        let list: any[] = [];
        let byId: any = {};
        for (q of as3.values(IoQuests.book.quests)) {
            if (q.cat == cat) {
                list.push(q);
                byId[q.id] = { "q": q, "kids": [] };
            }
        }
        let roots: any[] = [];
        for (q of as3.values(list)) {
            let n: any = byId[q.id];
            if (q.parent && byId[q.parent]) {
                byId[q.parent].kids.push(n);
            } else {
                roots.push(n);
            }
        }
        return { "roots": roots, "byId": byId };
    }

    /** True when a node and everything under it is collected. */
    private static allDone(n: any): boolean {
        if (n.q.state != "claimed") {
            return false;
        }
        for (let k of as3.values(n.kids)) {
            if (!IoQuestBook.allDone(k)) {
                return false;
            }
        }
        return true;
    }

    private drawTree(recentre: boolean): void {
        let slot: any = null;
        let maxDepth: int = 0;
        let place: Function = null;
        let r: any = null;
        let offX: number = NaN;
        let offY: number = NaN;
        let all: any[] = null;
        let walk: Function = null;
        let n: any = null;
        CasinoUI.removeAll(this._nodes);
        this._nodeSprites = {};
        let g: Graphics = this._edges.graphics;
        g.clear();
        let tree: any = this.treeOf(IoQuestBook._cat);
        let roots: any[] = as3.cast(tree.roots, Array);
        if (IoQuestBook._hideDone) {
            roots = roots.filter((n: any, i: int, a: any[]): boolean => {
                return !IoQuestBook.allDone(n);
            });
        }
        // a tidy tree: leaves side by side, each parent over the middle of its children
        slot = { "x": 0 };
        maxDepth = 0;
        place = (n: any, depth: int): void => {
            n.depth = depth;
            maxDepth = Math.max(maxDepth, depth) | 0;
            let kids: any[] = as3.cast(IoQuestBook._hideDone ? (as3.as(n.kids, Array)).filter((k: any, i: int, a: any[]): boolean => {
                return !IoQuestBook.allDone(k);
            }) : n.kids, Array);
            n.shown = kids;
            if (!kids.length) {
                n.x = slot.x;
                slot.x += 1;
                return;
            }
            for (let k of as3.values(kids)) {
                place(k, depth + 1);
            }
            n.x = (kids[0].x + kids[kids.length - 1].x) / 2;
        };
        for (r of as3.values(roots)) {
            place(r, 0);
            slot.x += 0.4;
        }
        let pad: int = 50;
        this._contentW = Math.max(IoQuestBook.CANVAS_W, (slot.x - 0.4) * IoQuestBook.NODE_DX + pad * 2 - IoQuestBook.NODE_DX + 2 * IoQuestBook.NODE_R);
        this._contentH = Math.max(IoQuestBook.CANVAS_H, maxDepth * IoQuestBook.LEVEL_DY + pad * 2 + 30);
        offX = Number(this._contentW > IoQuestBook.CANVAS_W ? pad : (IoQuestBook.CANVAS_W - ((slot.x - 1.4) * IoQuestBook.NODE_DX)) / 2);
        offY = 40;
        all = [];
        walk = (n: any): void => {
            n.px = offX + n.x * IoQuestBook.NODE_DX;
            n.py = offY + n.depth * IoQuestBook.LEVEL_DY;
            all.push(n);
            for (let k of as3.values(n.shown)) {
                walk(k);
            }
        };
        for (r of as3.values(roots)) {
            walk(r);
        }
        // lines first, under the quests
        for (n of as3.values(all)) {
            for (let k of as3.values(n.shown)) {
                let lit: boolean = n.q.state == "claimed";
                g.lineStyle(lit ? 3 : 2, (lit ? 0xE0A040 : 0x5A4A44) >>> 0, lit ? 0.95 : 0.8);
                let midY: number = Number(n.py + IoQuestBook.LEVEL_DY / 2);
                g.moveTo(Number(n.px), Number(n.py + IoQuestBook.NODE_R));
                g.lineTo(Number(n.px), midY);
                g.lineTo(Number(k.px), midY);
                g.lineTo(Number(k.px), k.py - IoQuestBook.NODE_R);
            }
        }
        for (n of as3.values(all)) {
            let s: Sprite = this.node(n.q);
            s.x = Number(n.px);
            s.y = Number(n.py);
            this._nodes.addChild(s);
            this._nodeSprites[n.q.id] = s;
        }
        if (!all.length) {
            let none: TextField = as3.as(this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_all_done"), 13, CasinoUI.ASH, true, IoQuestBook.CANVAS_W, TextFormatAlign.CENTER)), TextField);
            none.y = IoQuestBook.CANVAS_H / 2 - 10;
        }
        // the quest to show: the one asked for, else the first ready, else the first open
        if (!this._selected || !this._nodeSprites[this._selected]) {
            this._selected = null;
            let pick: any = null;
            for (n of as3.values(all)) {
                if (n.q.state == "ready") {
                    pick = n;
                    break;
                }
            }
            if (!pick) {
                for (n of as3.values(all)) {
                    if (n.q.state == "progress") {
                        pick = n;
                        break;
                    }
                }
            }
            if (!pick && all.length) {
                pick = all[0];
            }
            if (pick) {
                this._selected = as3.str(pick.q.id);
            }
        }
        this.markSelected();
        if (recentre && this._selected && this._nodeSprites[this._selected]) {
            let at: Sprite = as3.cast(this._nodeSprites[this._selected], Sprite);
            this.scrollTo(IoQuestBook.CANVAS_W / 2 - at.x, IoQuestBook.CANVAS_H / 2 - at.y - 20);
        } else {
            this.scrollTo(this._content.x, this._content.y);
        }
    }

    /** A quest on the tree: its picture in a ring the colour of where it is, and its name under it. */
    private node(q: any): Sprite {
        let id: string = null;
        // (a MovieClip, which is dynamic: Flash Player refuses ioReady on a Sprite, Error #1056, report #60)
        let s: MovieClip = new MovieClip();
        s.name = "ioQuestNode:" + q.id;
        s.buttonMode = true;
        s.mouseChildren = false;
        let state: string = String(q.state);
        let g: Graphics = s.graphics;
        let fill: uint = (state == "claimed" ? 0x3A2A16 : state == "ready" ? 0x6A3A10 : state == "locked" ? 0x1E1A1A : 0x2A1A16) >>> 0;
        let ring: uint = (state == "claimed" ? 0xC89A4A : state == "ready" ? 0xFFD58A : state == "locked" ? 0x4A4440 : 0x8A4A2A) >>> 0;
        g.lineStyle(q.optional ? 2 : 3, ring, 1);
        g.beginFill(fill, 1);
        g.drawCircle(0, 0, IoQuestBook.NODE_R);
        g.endFill();
        if (state == "progress" && (q.target | 0) > 0) {
            IoQuestBook.arc(g, 0, 0, IoQuestBook.NODE_R + 4, Math.min(1, Number(q.value) / Number(q.target)), 16747050);
        }
        let pic: Sprite = as3.as(s.addChild(IoQuestArt.glyph(String(q.icon), 28, state == "locked")), Sprite);
        pic.y = 0;
        if (state == "claimed") {
            let t: Shape = as3.as(s.addChild(IoQuestArt.tick(14)), Shape);
            t.x = 16;
            t.y = 15;
        } else if (state == "locked") {
            let l: Sprite = as3.as(s.addChild(IoQuestArt.glyph("lock", 13)), Sprite);
            l.x = 16;
            l.y = 15;
        } else if (state == "ready") {
            s.filters = [new GlowFilter(0xFFB040, 0.9, 14, 14, 2, 2)];
            s["ioReady"] = true;
        }
        let name: TextField = IoAllianceUi.text(IoQuests.title(q), 9, (state == "locked" ? 0x7A6A60 : state == "claimed" ? 0xC8B898 : CasinoUI.GOLD) >>> 0, state == "ready", (IoQuestBook.NODE_DX - 6) | 0, TextFormatAlign.CENTER, false, true);
        name.x = -(IoQuestBook.NODE_DX - 6) / 2;
        name.y = IoQuestBook.NODE_R + 4;
        if (name.height > 30) {
            name.height = 30;
        }
        s.addChild(name);
        id = String(q.id);
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (this._dragMoved) {
                return;
            }
            SOUNDS.Play("click1");
            this._selected = id;
            this.markSelected();
            this.drawPanel();
        });
        return s;
    }

    private markSelected(): void {
        for (let id in this._nodeSprites) {
            let s: Sprite = as3.cast(this._nodeSprites[id], Sprite);
            let sel: Shape = as3.as(s.getChildByName("ioSel"), Shape);
            if (id == this._selected) {
                if (!sel) {
                    sel = new Shape();
                    sel.name = "ioSel";
                    sel.graphics.lineStyle(2, 16777215, 0.9);
                    sel.graphics.drawCircle(0, 0, IoQuestBook.NODE_R + 8);
                    s.addChildAt(sel, 0);
                }
            } else if (sel) {
                s.removeChild(sel);
            }
        }
    }

    /** Part of a ring, from the top round to the right: how far along a quest is. */
    private static arc(g: Graphics, cx: number, cy: number, r: number, part: number, colour: uint): void {
        if (part <= 0) {
            return;
        }
        g.lineStyle(3, colour, 1);
        let steps: int = Math.max(2, (part * 40) | 0) | 0;
        for (let i: int = 0; i <= steps; i++) {
            let a: number = -Math.PI / 2 + part * Math.PI * 2 * i / steps;
            if (i == 0) {
                g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            } else {
                g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
        }
    }

    private static bar(g: Graphics, x: number, y: number, w: number, h: number, part: number): void {
        g.lineStyle(1, 10107412, 1);
        g.beginFill(1182731, 1);
        g.drawRoundRect(x, y, w, h, h, h);
        g.endFill();
        if (part > 0) {
            let m: Matrix = new Matrix();
            m.createGradientBox(w, h, 0, x, y);
            g.lineStyle(0, 0, 0);
            g.beginGradientFill(GradientType.LINEAR, [0xC8401A, 0xFFB040], [1, 1], [0, 255], m);
            g.drawRoundRect(x + 1, y + 1, Math.max(h - 2, (w - 2) * Math.min(1, part)), h - 2, h - 2, h - 2);
            g.endFill();
        }
    }

    // ---- moving round the tree
    private onDown(e: MouseEvent): void {
        if (IoQuestBook._cat == "daily") {
            return;
        }
        this._dragging = true;
        this._dragMoved = false;
        this._dragFromX = this.mc.mouseX - this._content.x;
        this._dragFromY = this.mc.mouseY - this._content.y;
        this.mc.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
    }

    private onUp(e: MouseEvent): void {
        this._dragging = false;
        if (this.mc.stage) {
            this.mc.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        }
    }

    private onWheel(e: MouseEvent): void {
        if (IoQuestBook._cat == "daily") {
            return;
        }
        this.scrollTo(this._content.x, this._content.y + e.delta * 12);
    }

    private scrollTo(x: number, y: number): void {
        let minX: number = Math.min(0, IoQuestBook.CANVAS_W - this._contentW);
        let minY: number = Math.min(0, IoQuestBook.CANVAS_H - this._contentH);
        if (this._contentW <= IoQuestBook.CANVAS_W) {
            x = 0;
        }
        if (this._contentH <= IoQuestBook.CANVAS_H) {
            y = 0;
        }
        this._content.x = Math.max(minX, Math.min(0, x)) | 0;
        this._content.y = Math.max(minY, Math.min(0, y)) | 0;
    }

    // ---- the category's chest
    private drawChest(): void {
        CasinoUI.removeAll(this._chestStrip);
        let chest: any = null;
        for (let c of as3.values(IoQuests.book.chests)) {
            if (c.cat == IoQuestBook._cat) {
                chest = c;
            }
        }
        let w: int = IoQuestBook.CANVAS_W;
        let strip: Sprite = as3.as(this._chestStrip.addChild(CasinoUI.panel(w, 48, 0.9)), Sprite);
        strip.mouseEnabled = false;
        if (!chest) {
            let none: TextField = as3.as(this._chestStrip.addChild(IoAllianceUi.text(KEYS.Get("io_quest_no_chest"), 10, CasinoUI.ASH, false, (w - 20) | 0, TextFormatAlign.LEFT, false, true)), TextField);
            none.x = 12;
            none.y = 8;
            return;
        }
        let b: Sprite = this.chestButton(chest, 30);
        b.x = 26;
        b.y = 24;
        this._chestStrip.addChild(b);
        let head: TextField = as3.as(this._chestStrip.addChild(CasinoUI.label(KEYS.Get("io_quest_chest_line", { "v1": chest.done, "v2": chest.total }), 11, CasinoUI.GOLD, true, (w - 170) | 0, TextFormatAlign.LEFT)), TextField);
        head.x = 50;
        head.y = 5;
        let rw: TextField = as3.as(this._chestStrip.addChild(CasinoUI.label(IoQuests.rewardText(chest.reward), 10, CasinoUI.ASH, false, (chest.state == "progress" ? w - 60 : (chest.state == "claimed" ? w - 124 : w - 170)) | 0, TextFormatAlign.LEFT)), TextField);
        rw.x = 50;
        rw.y = 24;
        GLOBAL.ioFitText(rw);
        // (an opened chest's reward line was cut off: "... 25 sh")
        if (chest.state == "ready") {
            let get: Sprite = as3.as(this._chestStrip.addChild(CasinoUI.button(KEYS.Get("io_quest_open_chest"), 104, 28, this.claimFn(String(chest.id)), !IoQuests.claiming, 12)), Sprite);
            get.name = "ioQuestChestOpen";
            get.x = w - 114;
            get.y = 10;
        } else if (chest.state == "claimed") {
            let got: TextField = as3.as(this._chestStrip.addChild(CasinoUI.label(KEYS.Get("io_quest_opened"), 11, CasinoUI.WIN, true, 104, TextFormatAlign.CENTER)), TextField);
            got.x = w - 114;
            got.y = 15;
        }
    }

    /** A chest: shut, glowing when it can be opened, open (with a tick) once it was. Click: open it. */
    private chestButton(chest: any, size: int): Sprite {
        let b: MovieClip = new MovieClip();
        // (dynamic: carries ioReady, as node())
        b.mouseChildren = false;
        let pic: Sprite = as3.as(b.addChild(IoQuestArt.glyph("chest", size, chest.state == "progress")), Sprite);
        if (chest.state == "ready") {
            b.filters = [new GlowFilter(0xFFB040, 1, 14, 14, 3, 2)];
            b.buttonMode = true;
            b["ioReady"] = true;
            b.addEventListener(MouseEvent.CLICK, this.claimFn(String(chest.id)));
        } else if (chest.state == "claimed") {
            let t: Shape = as3.as(b.addChild(IoQuestArt.tick(12)), Shape);
            t.x = size / 2 - 2;
            t.y = size / 2 - 4;
        }
        return b;
    }

    // ---- today's daily quests
    private drawDaily(): void {
        CasinoUI.removeAll(this._nodes);
        CasinoUI.removeAll(this._chestStrip);
        this._edges.graphics.clear();
        this._nodeSprites = {};
        this._contentW = IoQuestBook.CANVAS_W;
        this._contentH = IoQuestBook.CANVAS_H;
        this._content.x = this._content.y = 0;
        let daily: any = IoQuests.book.daily;
        let head: TextField = as3.as(this._nodes.addChild(CasinoUI.label(KEYS.Get("io_quest_daily_head", { "v1": IoQuestBook.hoursMinutes(((daily.endsIn | 0) - (GLOBAL.Timestamp() - IoQuests.fetchedAt)) | 0) }), 12, CasinoUI.GOLD, true, (IoQuestBook.CANVAS_W - 20) | 0, TextFormatAlign.LEFT)), TextField);
        head.x = 12;
        head.y = 8;
        let y: int = 34;
        for (let d of as3.values(daily.quests)) {
            this._nodes.addChild(this.dailyCard(d, y));
            y += 72;
        }
        // all three: the bonus
        let bonus: any = daily.bonus;
        let card: Sprite = new Sprite();
        card.y = y + 4;
        card.x = 10;
        let w: int = (IoQuestBook.CANVAS_W - 20) | 0;
        card.graphics.lineStyle(1.5, (bonus.state == "ready" ? 0xFFD58A : 0x7A5A48) >>> 0, 1);
        card.graphics.beginFill(2759184, 0.9);
        card.graphics.drawRoundRect(0, 0, w, 56, 10, 10);
        card.graphics.endFill();
        let cb: Sprite = as3.as(card.addChild(this.chestButton({ "state": bonus.state }, 28)), Sprite);
        cb.x = 24;
        cb.y = 28;
        if (bonus.state == "ready") {
            cb.addEventListener(MouseEvent.CLICK, this.claimFn("daily:bonus"));
        }
        let t1: TextField = as3.as(card.addChild(CasinoUI.label(KEYS.Get("io_quest_daily_bonus"), 12, CasinoUI.GOLD, true, (w - 170) | 0, TextFormatAlign.LEFT)), TextField);
        t1.x = 46;
        t1.y = 8;
        let t2: TextField = as3.as(card.addChild(CasinoUI.label(IoQuests.rewardText(bonus.reward), 10, CasinoUI.ASH, false, (bonus.state == "progress" ? w - 56 : w - 170) | 0, TextFormatAlign.LEFT)), TextField);
        t2.x = 46;
        t2.y = 28;
        this.stateButton(card, as3.str(bonus.state), "daily:bonus", w);
        this._nodes.addChild(card);
    }

    /** "5h 12m", "40m" */
    private static hoursMinutes(sec: int): string {
        sec = Math.max(60, sec) | 0;
        let h: int = (sec / 3600) | 0;
        let m: int = ((sec % 3600) / 60) | 0;
        return h > 0 ? h + "h " + m + "m" : m + "m";
    }

    /** Words that can be clicked, underlined, in the book's gold. */
    private static textLink(label: string, onClick: Function): Sprite {
        let s: Sprite = new Sprite();
        let t: TextField = CasinoUI.label(label, 10, CasinoUI.ASH, false, 220, TextFormatAlign.LEFT);
        t.htmlText = "<u>" + label + "</u>";
        t.width = Math.min(220, t.textWidth + 6);
        s.addChild(t);
        s.buttonMode = true;
        s.mouseChildren = false;
        s.graphics.beginFill(0, 0);
        s.graphics.drawRect(0, 0, t.width, t.height);
        s.graphics.endFill();
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick();
        });
        return s;
    }

    private dailyCard(d: any, y: int): Sprite {
        let card: Sprite = new Sprite();
        card.name = "ioQuestDaily:" + d.id;
        card.x = 10;
        card.y = y;
        let w: int = (IoQuestBook.CANVAS_W - 20) | 0;
        card.graphics.lineStyle(1.5, (d.state == "ready" ? 0xFFD58A : 0x7A5A48) >>> 0, 1);
        card.graphics.beginFill(1971218, 0.95);
        card.graphics.drawRoundRect(0, 0, w, 64, 10, 10);
        card.graphics.endFill();
        if (d.state == "ready") {
            card.filters = [new GlowFilter(0xFFB040, 0.7, 10, 10, 2, 2)];
        }
        let g: Sprite = as3.as(card.addChild(IoQuestArt.glyph(String(d.icon), 30, d.state == "claimed")), Sprite);
        g.x = 26;
        g.y = 32;
        let t: TextField = as3.as(card.addChild(CasinoUI.label(IoQuests.title(d), 12, CasinoUI.GOLD, true, (w - 170) | 0, TextFormatAlign.LEFT)), TextField);
        t.x = 50;
        t.y = 4;
        // (up to the button, and smaller when that is still too short: longer languages were cut off)
        let desc: TextField = as3.as(card.addChild(CasinoUI.label(IoQuests.describe(d), 10, 14733504, false, (w - 162) | 0, TextFormatAlign.LEFT)), TextField);
        desc.x = 50;
        desc.y = 21;
        GLOBAL.ioFitText(desc);
        IoQuestBook.bar(card.graphics, 50, 40, 120, 8, Number((d.target | 0) > 0 ? Number(d.value) / Number(d.target) : 0));
        let p: TextField = as3.as(card.addChild(CasinoUI.label(GLOBAL.FormatNumber(Number(d.value)) + " / " + GLOBAL.FormatNumber(Number(d.target)), 9, CasinoUI.ASH, false, 80, TextFormatAlign.LEFT)), TextField);
        p.x = 176;
        p.y = 36;
        let rw: TextField = as3.as(card.addChild(CasinoUI.label(IoQuests.rewardText(d.reward), 9, CasinoUI.ASH, false, (w - 120) | 0, TextFormatAlign.LEFT)), TextField);
        rw.x = 50;
        rw.y = 48;
        this.stateButton(card, String(d.state), "daily:" + d.id, w, String(d.go || ""));
        return card;
    }

    /** Collect (ready), Go there (still to do and there is somewhere to go), or Collected. */
    private stateButton(card: Sprite, state: string, claimId: string, w: int, go: string = ""): void {
        if (state == "ready") {
            let b: Sprite = as3.as(card.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 96, 28, this.claimFn(claimId), !IoQuests.claiming, 12)), Sprite);
            b.name = "ioQuestCollect:" + claimId;
            b.x = w - 106;
            b.y = 14;
        } else if (state == "claimed") {
            let done: TextField = as3.as(card.addChild(CasinoUI.label(KEYS.Get("io_quest_collected"), 11, CasinoUI.WIN, true, 96, TextFormatAlign.CENTER)), TextField);
            done.x = w - 106;
            done.y = 20;
        } else if (go) {
            let gb: Sprite = as3.as(card.addChild(CasinoUI.button(KEYS.Get("io_quest_go"), 96, 26, this.goFn(go, null), true, 11)), Sprite);
            gb.x = w - 106;
            gb.y = 16;
        }
    }

    // ---- the quest picked
    private drawPanel(): void {
        CasinoUI.removeAll(this._panel);
        this._panel.graphics.clear();
        let book: any = IoQuests.book;
        if (!book) {
            return;
        }
        let w: int = IoQuestBook.PANEL_W;
        let y: int = 12;
        if (IoQuestBook._cat == "daily") {
            IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_daily_info"), 12, y, 11, 14733504, false, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
            return;
        }
        let q: any = this._selected ? IoQuests.quest(this._selected) : null;
        if (!q) {
            IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_pick"), 12, y, 11, CasinoUI.ASH, false, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
            return;
        }
        let state: string = String(q.state);
        let ring: Sprite = as3.as(this._panel.addChild(new Sprite()), Sprite);
        ring.graphics.lineStyle(3, (state == "ready" ? 0xFFD58A : state == "claimed" ? 0xC89A4A : state == "locked" ? 0x4A4440 : 0x8A4A2A) >>> 0, 1);
        ring.graphics.beginFill(1970704, 1);
        ring.graphics.drawCircle(0, 0, 34);
        ring.graphics.endFill();
        ring.x = w / 2;
        ring.y = y + 36;
        ring.addChild(IoQuestArt.glyph(String(q.icon), 44, state == "locked"));
        if (state == "ready") {
            ring.filters = [new GlowFilter(0xFFB040, 0.9, 14, 14, 2, 2)];
        }
        y += 80;
        let title: TextField = IoAllianceUi.addText(this._panel, IoQuests.title(q), 10, y, 14, CasinoUI.GOLD, true, (w - 20) | 0, TextFormatAlign.CENTER, false, true);
        title.name = "ioQuestPanelTitle";
        y = (y + (title.height + 2)) | 0;
        let stateLine: string = KEYS.Get("io_quest_state_" + state);
        let st: TextField = IoAllianceUi.addText(this._panel, stateLine, 10, y, 10, (state == "ready" ? 0xFFB040 : state == "claimed" ? CasinoUI.WIN : CasinoUI.ASH) >>> 0, true, (w - 20) | 0, TextFormatAlign.CENTER);
        y = (y + (st.height + 6)) | 0;
        let desc: TextField = IoAllianceUi.addText(this._panel, IoQuests.describe(q), 12, y, 11, 15260872, false, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
        y = (y + (desc.height + 6)) | 0;
        if (state == "locked") {
            let parent: any = q.parent ? IoQuests.quest(String(q.parent)) : null;
            let lk: TextField = IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_needs", { "v1": parent ? IoQuests.title(parent) : "?" }), 12, y, 10, 13148288, false, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
            y = (y + (lk.height + 6)) | 0;
        } else if (state != "claimed") {
            IoQuestBook.bar(this._panel.graphics, 12, y + 2, w - 24, 10, Number((q.target | 0) > 0 ? Number(q.value) / Number(q.target) : 0));
            y += 14;
            let pr: TextField = IoAllianceUi.addText(this._panel, GLOBAL.FormatNumber(Number(q.value)) + " / " + GLOBAL.FormatNumber(Number(q.target)), 12, y, 10, CasinoUI.ASH, false, (w - 24) | 0, TextFormatAlign.RIGHT);
            y = (y + (pr.height + 2)) | 0;
        }
        let rh: TextField = IoAllianceUi.addText(this._panel, KEYS.Get("io_quest_reward"), 12, y, 10, CasinoUI.EMBER, true, (w - 24) | 0);
        y = (y + rh.height) | 0;
        let rt: TextField = IoAllianceUi.addText(this._panel, IoQuests.rewardText(q.reward), 12, y, 11, CasinoUI.GOLD, true, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
        y = (y + (rt.height + 6)) | 0;
        if (q.optional) {
            let op: TextField = IoAllianceUi.addText(this._panel, KEYS.Get(q.leader ? "io_quest_leader" : q.staff ? "io_quest_staff" : "io_quest_optional"), 12, y, 9, 10139864, false, (w - 24) | 0, TextFormatAlign.LEFT, false, true);
            y = (y + (op.height + 4)) | 0;
        }
        // the buttons, at the foot
        let by: int = (IoQuestBook.CANVAS_H + 64 - 42) | 0;
        if (state == "ready") {
            let c: Sprite = as3.as(this._panel.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), (w - 24) | 0, 32, this.claimFn(String(q.id)), !IoQuests.claiming, 14)), Sprite);
            c.name = "ioQuestCollect";
            c.x = 12;
            c.y = by;
            by -= 38;
        }
        if (q.go && state != "claimed") {
            let g: Sprite = as3.as(this._panel.addChild(CasinoUI.button(KEYS.Get("io_quest_go"), (w - 24) | 0, 28, this.goFn(String(q.go), q), true, 12)), Sprite);
            g.name = "ioQuestGo";
            g.x = 12;
            g.y = by + 4;
        }
    }

    // ---- collecting, going
    private claimFn(id: string): Function {
        return (e: MouseEvent = null): void => {
            this.claim(id);
        };
    }

    private claim(ids: string): void {
        if (IoQuests.claiming) {
            return;
        }
        SOUNDS.Play("click1");
        this.say(KEYS.Get("io_quest_collecting"), 0);
        IoQuests.claim(ids, (reward: any, error: string): void => {
            if (!this.mc || !this.mc.stage) {
                return;
            }
            if (!reward) {
                this.say(error, 6);
                return;
            }
            SOUNDS.Play("chaching");
            this.say(KEYS.Get("io_quest_got", { "v1": IoQuests.rewardText(reward) }) + (BASE.isMainYardOrInfernoMainYard ? "" : " " + KEYS.Get("io_quest_to_main")), 8);
            this.redraw(false);
        });
    }

    private collectAll(e: MouseEvent = null): void {
        this.claim("all");
    }

    private goFn(target: string, q: any): Function {
        return (e: MouseEvent = null): void => {
            this.close();
            IoQuests.go(target, q);
        };
    }

    private say(text: string, seconds: int): void {
        this._status.text = text;
        this._statusUntil = (seconds > 0 ? getTimer() + seconds * 1000 : 0) | 0;
    }

    private toggleHide(e: MouseEvent = null): void {
        IoQuestBook._hideDone = !IoQuestBook._hideDone;
        CasinoUI.choose(this._hideToggle, IoQuestBook._hideDone);
        this.redraw(true);
    }

    private openOld(e: MouseEvent = null): void {
        this.close();
        QUESTS.ioShowOld();
    }

    // ---- every frame: the book changed, a drag, the ready ones glowing
    private tick(e: Event): void {
        if (this._version != IoQuests.version) {
            this.redraw(false);
        }
        if (this._dragging) {
            let nx: number = this.mc.mouseX - this._dragFromX;
            let ny: number = this.mc.mouseY - this._dragFromY;
            if (Math.abs(nx - this._content.x) + Math.abs(ny - this._content.y) > 3) {
                this._dragMoved = true;
            }
            this.scrollTo(nx, ny);
        } else if (this._dragMoved && !this._dragging) {
            // (the click that ends a drag picks nothing; the next one does)
            if (!this.mc.stage || !this._canvas.hitTestPoint(this.mc.stage.mouseX, this.mc.stage.mouseY)) {
                this._dragMoved = false;
            }
        }
        let pulse: number = 2 + Math.sin(getTimer() / 260) * 1.2;
        for (let s of as3.values(this._nodeSprites)) {
            if (s["ioReady"]) {
                s.filters = [new GlowFilter(0xFFB040, 0.9, 10 + pulse * 3, 10 + pulse * 3, pulse, 2)];
            }
        }
        if (this._statusUntil > 0 && getTimer() > this._statusUntil) {
            this._status.text = "";
            this._statusUntil = 0;
        }
        if (this._collectAll) {
            CasinoUI.enable(this._collectAll, IoQuests.ready > 0 && !IoQuests.claiming);
        }
    }

    public close(e: MouseEvent = null): void {
        if (this.mc) {
            this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
            if (this.mc.stage) {
                this.mc.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
            }
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
                GLOBAL.BlockerRemove();
                SOUNDS.Play("close");
            }
        }
        this.mc = null;
        if (IoQuestBook._open == this) {
            IoQuestBook._open = null;
        }
    }
}
