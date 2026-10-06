import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { CasinoUI, GLOBAL, IoMapShare, IoMapSnapshot, IoQuests, KEYS, LOGIN, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only: the leaderboards, opened by the top bar's button right of the Shiny (UI_TOP). Three tabs:
 *
 *  - Outposts:  every player, most outposts first (ties: the higher empire value), with their world,
 *               alliance and empire value (the main yard's and every outpost's together);
 *  - Alliances: every alliance, the highest empire value first, with its members' outposts; the arrow
 *               opens its members, each with their empire value and outposts, the highest first;
 *  - Gamblers:  everyone who has bet in the Brimstone Pit, the most gambled first, with the lifetime net.
 *
 * Every world's players are listed, each with their world (named after the owner of its cell 0x0); the
 * World button keeps the list to one. Jump opens the map on a player's main yard when it is on the
 * player's own world. Find me scrolls to the player's own row. Admins are on no list (the server leaves
 * them out).
 *
 * Data: the server's leaderboards (leaderboards/game: services/leaderboards/gameLeaderboards.ts), made on
 * the map snapshots' fixed 5-minute clock. It says when its next one is out (`nextAt`): the game asks
 * again a few seconds after that while the window is open, and never sooner than MIN_GAP after the last
 * answer, however often the window is opened (the user's rule, 2 October). Only the rows in view exist
 * (reused as the list scrolls), so thousands of players list as fast as ten.
 */
export class IoLeaderboards extends ASObject {
    static {
        as3.fields(this, { mc: null, _tabs: null, _heads: null, _holder: null, _rowsLayer: null, _pool: null, _list: null, _offset: 0, _track: null, _thumb: null, _dragFrom: 0, _status: null, _footer: null, _count: null, _worldButton: null, _worldLabel: null, _worldList: null, _ticks: 0, _flashUid: 0, _flashUntil: 0 });
    }

    public static W: int; // const

    public static H: int; // const

    /** Never asked for sooner than this after the last answer (seconds). */
    public static MIN_GAP: int; // const

    private static ROW_H: int; // const

    private static LIST_X: int; // const

    private static LIST_W: int; // const

    private static LIST_TOP: int; // const

    private static LIST_H: int; // const

    private static BAR_W: int; // const

    private static ROW_W: int; // const

    private static WHEEL_ROWS: int; // const

    private static JUMP_W: int; // const

    /** Each tab's columns: key, text key, width, alignment. */
    private static COLUMNS: any[]; // const

    // ---- the data (kept between openings)
    private static _data: any;

    private static _fetchedAt: int;

    private static _nextAt: int;

    private static _dueAt: int;

    private static _loading: boolean;

    private static _failedAt: int;

    private static _open: IoLeaderboards;

    /** The tab and world chosen last (kept for the next opening). */
    private static _tab: int;

    private static _world: int;

    private static _expanded: any;

    /** A player to find once the window has its data (the chat's name menu: ShowPlayer). */
    private static _findUid: int;

    private static _findName: string;

    /** Waiting for the data (JumpToPlayer before any was loaded). */
    private static _waiters: any[];

    static {
        as3.lazyStatics(this, { W: 0, H: 0, MIN_GAP: 0, ROW_H: 0, LIST_X: 0, LIST_W: 0, LIST_TOP: 0, LIST_H: 0, BAR_W: 0, ROW_W: 0, WHEEL_ROWS: 0, JUMP_W: 0, COLUMNS: null, _data: null, _fetchedAt: 0, _nextAt: 0, _dueAt: 0, _loading: false, _failedAt: 0, _open: null, _tab: 0, _world: 0, _expanded: null, _findUid: 0, _findName: null, _waiters: null }, () => {
            IoLeaderboards.W = 780;
            IoLeaderboards.H = 560;
            IoLeaderboards.MIN_GAP = 300;
            IoLeaderboards.ROW_H = 28;
            IoLeaderboards.LIST_X = (-IoLeaderboards.W / 2 + 20) | 0;
            IoLeaderboards.LIST_W = (IoLeaderboards.W - 40) | 0;
            IoLeaderboards.LIST_TOP = (-IoLeaderboards.H / 2 + 176) | 0;
            IoLeaderboards.LIST_H = (11 * IoLeaderboards.ROW_H + 2) | 0;
            IoLeaderboards.BAR_W = 12;
            IoLeaderboards.ROW_W = (IoLeaderboards.LIST_W - IoLeaderboards.BAR_W - 6) | 0;
            IoLeaderboards.WHEEL_ROWS = 3;
            IoLeaderboards.JUMP_W = 52;
            IoLeaderboards.COLUMNS = [[["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_player", 170, "left"], ["world", "lb_col_world", 130, "left"], ["alliance", "lb_col_alliance", 130, "left"], ["outposts", "lb_col_outposts", 76, "right"], ["empire", "lb_col_empire", 110, "right"]], [["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_alliance", 200, "left"], ["world", "lb_col_world", 130, "left"], ["members", "lb_col_members", 80, "right"], ["outposts", "lb_col_outposts", 80, "right"], ["empire", "lb_col_empire", 126, "right"]], [["rank", "lb_col_rank", 46, "center"], ["name", "lb_col_player", 200, "left"], ["world", "lb_col_world", 130, "left"], ["bets", "lb_col_bets", 76, "right"], ["gambled", "lb_col_gambled", 104, "right"], ["net", "lb_col_net", 106, "right"]]];
            IoLeaderboards._data = null;
            IoLeaderboards._fetchedAt = 0;
            IoLeaderboards._nextAt = 0;
            IoLeaderboards._dueAt = 0;
            IoLeaderboards._loading = false;
            IoLeaderboards._failedAt = 0;
            IoLeaderboards._open = null;
            IoLeaderboards._tab = 0;
            IoLeaderboards._world = -1;
            IoLeaderboards._expanded = {};
            IoLeaderboards._findUid = 0;
            IoLeaderboards._findName = null;
            IoLeaderboards._waiters = [];
        });
    }
    // ---- the window
    public mc: MovieClip;
    private _tabs: any[];
    private _heads: Sprite;
    private _holder: Sprite;
    private _rowsLayer: Sprite;
    private _pool: any[];
    private _list: any[];
    private _offset: number;
    private _track: Sprite;
    private _thumb: Sprite;
    private _dragFrom: number;
    private _status: TextField;
    private _footer: TextField;
    private _count: TextField;
    private _worldButton: Sprite;
    private _worldLabel: TextField;
    private _worldList: Sprite;
    private _ticks: int;
    private _flashUid: int;
    private _flashUntil: int;

    public $ctor(): void {
        this._tabs = [];
        this._pool = [];
        this._list = [];
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "ioLeaderboardsWindow";
        this.drawFrame();
        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("lb_title"), 34, (IoLeaderboards.W - 200) | 0)), TextField);
        title.x = -IoLeaderboards.W / 2 + 100;
        title.y = -IoLeaderboards.H / 2 + 24;
        let names: any[] = ["lb_tab_outposts", "lb_tab_alliances", "lb_tab_gamblers"];
        for (let i: int = 0; i < names.length; i++) {
            let tab: Sprite = CasinoUI.toggle(KEYS.Get(as3.str(names[i])), 128, 28, this.tabClick(i));
            tab.name = "ioLbTab" + i;
            tab.x = IoLeaderboards.LIST_X + i * 136;
            tab.y = -IoLeaderboards.H / 2 + 110;
            this.mc.addChild(tab);
            this._tabs.push(tab);
        }
        let me: Sprite = as3.as(this.mc.addChild(CasinoUI.button(KEYS.Get("lb_find_me"), 104, 28, as3.bind(this, this.findMe), true, 13)), Sprite);
        me.name = "ioLbFindMe";
        me.x = IoLeaderboards.W / 2 - 20 - 214 - 112;
        me.y = -IoLeaderboards.H / 2 + 110;
        this._worldButton = as3.as(this.mc.addChild(this.worldButton()), Sprite);
        this._worldButton.x = IoLeaderboards.W / 2 - 20 - 214;
        this._worldButton.y = -IoLeaderboards.H / 2 + 110;
        this._heads = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._heads.x = IoLeaderboards.LIST_X;
        this._heads.y = IoLeaderboards.LIST_TOP - 26;
        // the list
        let box: Sprite = as3.as(this.mc.addChild(CasinoUI.panel(IoLeaderboards.LIST_W, IoLeaderboards.LIST_H, 0.9)), Sprite);
        box.x = IoLeaderboards.LIST_X;
        box.y = IoLeaderboards.LIST_TOP;
        this._holder = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._holder.x = IoLeaderboards.LIST_X + 2;
        this._holder.y = IoLeaderboards.LIST_TOP + 1;
        this._rowsLayer = as3.as(this._holder.addChild(new Sprite()), Sprite);
        let mask: Shape = as3.as(this._holder.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRect(0, 0, IoLeaderboards.LIST_W - 4, IoLeaderboards.LIST_H - 2);
        mask.graphics.endFill();
        this._rowsLayer.mask = mask;
        this._holder.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.onWheel));
        let viewRows: int = ((Math.ceil((IoLeaderboards.LIST_H - 2) / IoLeaderboards.ROW_H) | 0) + 1) | 0;
        for (let r: int = 0; r < viewRows; r++) {
            this._pool.push(this.makeRow());
        }
        this._track = as3.as(this._holder.addChild(new Sprite()), Sprite);
        this._track.graphics.beginFill(2759190, 1);
        this._track.graphics.drawRoundRect(0, 0, IoLeaderboards.BAR_W, IoLeaderboards.LIST_H - 6, 8, 8);
        this._track.graphics.endFill();
        this._track.x = IoLeaderboards.LIST_W - IoLeaderboards.BAR_W - 6;
        this._track.y = 2;
        this._track.buttonMode = true;
        this._track.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onTrack));
        this._thumb = as3.as(this._holder.addChild(new Sprite()), Sprite);
        this._thumb.x = this._track.x;
        this._thumb.buttonMode = true;
        this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onThumbDown));
        this._status = as3.as(this.mc.addChild(CasinoUI.label("", 14, CasinoUI.ASH, true, (IoLeaderboards.LIST_W - 40) | 0, TextFormatAlign.CENTER)), TextField);
        this._status.x = IoLeaderboards.LIST_X + 20;
        this._status.y = IoLeaderboards.LIST_TOP + 40;
        this._footer = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.ASH, false, 460, TextFormatAlign.LEFT)), TextField);
        this._footer.name = "ioLbFooter";
        this._footer.x = IoLeaderboards.LIST_X;
        this._footer.y = IoLeaderboards.LIST_TOP + IoLeaderboards.LIST_H + 8;
        this._count = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.GOLD, true, 260, TextFormatAlign.RIGHT)), TextField);
        this._count.x = IoLeaderboards.LIST_X + IoLeaderboards.LIST_W - 260;
        this._count.y = IoLeaderboards.LIST_TOP + IoLeaderboards.LIST_H + 8;
        // close
        let x: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        x.name = "ioLbClose";
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
        x.x = IoLeaderboards.W / 2 - 24;
        x.y = -IoLeaderboards.H / 2 + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        if (IoLeaderboards._world >= 0 && (!IoLeaderboards._data || IoLeaderboards._world >= (as3.as(IoLeaderboards._data.worlds, Array)).length)) {
            IoLeaderboards._world = -1;
        }
        this.selectTab(IoLeaderboards._tab);
        if (IoLeaderboards.shouldFetch()) {
            IoLeaderboards.fetch();
        }
        this.findPending();
    }

    /** Opens the window (the top bar's button). */
    public static Show(e: MouseEvent = null): void {
        if (IoLeaderboards._open && (!IoLeaderboards._open.mc || !IoLeaderboards._open.mc.stage)) {
            IoLeaderboards._open = null;
        }
        if (IoLeaderboards._open) {
            return;
        }
        SOUNDS.Play("click1");
        IoLeaderboards._open = new IoLeaderboards();
    }

    public static get isOpen(): boolean {
        return IoLeaderboards._open != null;
    }

    /** Closes it (the yard is going). */
    public static CloseOpen(): void {
        if (IoLeaderboards._open) {
            IoLeaderboards._open.close();
        }
        IoLeaderboards._open = null;
    }

    // ---- the frame: obsidian, a molten rim, the new art (leaderboards/bg.jpg, leaderboards/banner.jpg)
    private drawFrame(): void {
        let bg: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(IoLeaderboards.W, IoLeaderboards.H, Math.PI / 2, -IoLeaderboards.W / 2, -IoLeaderboards.H / 2);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(-IoLeaderboards.W / 2, -IoLeaderboards.H / 2, IoLeaderboards.W, IoLeaderboards.H, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        let art: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        // (a holder each: the banner stays over the background whichever loads first)
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/bg.jpg", -IoLeaderboards.W / 2 + 6, -IoLeaderboards.H / 2 + 6, IoLeaderboards.W - 12, IoLeaderboards.H - 12);
        CasinoUI.picture(as3.as(art.addChild(new Sprite()), Sprite), "leaderboards/banner.jpg", -IoLeaderboards.W / 2 + 6, -IoLeaderboards.H / 2 + 6, IoLeaderboards.W - 12, 92);
        let mask: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-IoLeaderboards.W / 2 + 6, -IoLeaderboards.H / 2 + 6, IoLeaderboards.W - 12, IoLeaderboards.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
    }

    // ---- tabs, worlds
    private tabClick(i: int): Function {
        return (e: MouseEvent): void => {
            this.selectTab(i);
        };
    }

    public selectTab(i: int): void {
        IoLeaderboards._tab = i;
        for (let k: int = 0; k < this._tabs.length; k++) {
            CasinoUI.choose(as3.cast(this._tabs[k], Sprite), k == i);
        }
        this.hideWorlds();
        this.drawHeads();
        this.fill(true);
    }

    private worldButton(): Sprite {
        let b: Sprite = CasinoUI.button("", 214, 28, as3.bind(this, this.toggleWorlds), true, 13);
        b.name = "ioLbWorld";
        this._worldLabel = as3.as(b.getChildAt(0), TextField);
        return b;
    }

    private worldName(i: int): string {
        let worlds: any[] = IoLeaderboards._data ? as3.as(IoLeaderboards._data.worlds, Array) : null;
        return worlds && i >= 0 && i < worlds.length ? String(worlds[i].name) : KEYS.Get("lb_all_worlds");
    }

    private updateWorldButton(): void {
        this._worldLabel.text = KEYS.Get("lb_world_btn", { "v1": this.worldName(IoLeaderboards._world) }) + " ▾";
    }

    private toggleWorlds(e: MouseEvent = null): void {
        if (this._worldList) {
            this.hideWorlds();
            return;
        }
        let worlds: any[] = IoLeaderboards._data ? as3.as(IoLeaderboards._data.worlds, Array) : [];
        let entries: any[] = [-1];
        for (let i: int = 0; i < worlds.length; i++) {
            entries.push(i);
        }
        // (12 to a column, the columns spreading left: 36 worlds fit over the list)
        let shown: int = Math.min(entries.length, 36) | 0;
        let rows: int = Math.min(shown, 12) | 0;
        let columns: int = Math.ceil(shown / 12) | 0;
        this._worldList = as3.as(this.mc.addChild(CasinoUI.panel((columns * 208 + 6) | 0, (rows * 26 + 8) | 0, 0.97)), Sprite);
        this._worldList.name = "ioLbWorldList";
        this._worldList.x = this._worldButton.x + 214 - (columns * 208 + 6);
        this._worldList.y = this._worldButton.y + 32;
        for (let n: int = 0; n < shown; n++) {
            let choice: Sprite = CasinoUI.toggle(this.worldName(entries[n] | 0), 202, 24, this.worldClick(entries[n] | 0));
            choice.name = "ioLbWorld" + (entries[n] | 0);
            CasinoUI.choose(choice, (entries[n] | 0) == IoLeaderboards._world);
            choice.x = 6 + ((n / 12) | 0) * 208;
            choice.y = 4 + n % 12 * 26;
            this._worldList.addChild(choice);
        }
    }

    private worldClick(i: int): Function {
        return (e: MouseEvent): void => {
            IoLeaderboards._world = i;
            this.hideWorlds();
            this.fill(true);
        };
    }

    private hideWorlds(): void {
        if (this._worldList && this._worldList.parent) {
            this._worldList.parent.removeChild(this._worldList);
        }
        this._worldList = null;
    }

    private drawHeads(): void {
        CasinoUI.removeAll(this._heads);
        let x: int = 2;
        for (let column of as3.values(IoLeaderboards.COLUMNS[IoLeaderboards._tab])) {
            let t: TextField = as3.as(this._heads.addChild(CasinoUI.label(KEYS.Get(as3.str(column[1])), 12, CasinoUI.GOLD, true, (column[2] - 8) | 0, as3.str(column[3]))), TextField);
            t.x = x + 4;
            t.y = 2;
            GLOBAL.ioFitText(t);
            // ("Valeur de l'empire", "Avant-postes" were cut off)
            x = (x + column[2]) | 0;
        }
    }

    // ---- the rows
    private makeRow(): any {
        let entry: any = null;
        entry = { "index": -1, "item": null, "cells": [] };
        let line: Sprite = as3.as(this._rowsLayer.addChild(new Sprite()), Sprite);
        line.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (e.target == entry.jump) {
                return;
            }
            if (entry.item && entry.item.kind == "alliance") {
                SOUNDS.Play("click1");
                let id: string = IoLeaderboards.allianceKey(entry.item.a);
                IoLeaderboards._expanded[id] = !IoLeaderboards._expanded[id];
                this.fill(false);
            }
        });
        entry.line = line;
        for (let c: int = 0; c < 6; c++) {
            let cell: TextField = as3.as(line.addChild(CasinoUI.label("", 12, 16777215, false, 100, TextFormatAlign.LEFT)), TextField);
            cell.y = 5;
            entry.cells.push(cell);
        }
        entry.jump = as3.as(line.addChild(CasinoUI.button(KEYS.Get("lb_jump"), IoLeaderboards.JUMP_W, 22, (e: MouseEvent): void => {
            let p: any = entry.item ? entry.item.p : null;
            if (p) {
                this.jump(p);
            }
        }, true, 12)), Sprite);
        entry.jump.name = "ioLbJump";
        entry.jump.x = IoLeaderboards.ROW_W - IoLeaderboards.JUMP_W - 4;
        entry.jump.y = 3;
        return entry;
    }

    /** Works the tab's list out again (back to the top when `top`). */
    private fill(top: boolean): void {
        this.updateWorldButton();
        this._list = IoLeaderboards._data ? this.rowsFor(IoLeaderboards._tab) : [];
        for (let entry of as3.values(this._pool)) {
            entry.index = -1;
        }
        if (top) {
            this._offset = 0;
        }
        this._status.text = IoLeaderboards._data ? (this._list.length ? "" : KEYS.Get("lb_none")) : (IoLeaderboards._loading || !IoLeaderboards._failedAt ? KEYS.Get("lb_loading") : KEYS.Get("lb_failed"));
        let counted: int = 0;
        for (let item of as3.values(this._list)) {
            if (item.kind != "member") {
                counted++;
            }
        }
        this._count.text = !IoLeaderboards._data ? "" : (counted == 1 ? KEYS.Get(as3.str(["lb_count_player", "lb_count_alliance", "lb_count_gambler"][IoLeaderboards._tab])) : KEYS.Get(as3.str(["lb_count_players", "lb_count_alliances", "lb_count_gamblers"][IoLeaderboards._tab]), { "v1": GLOBAL.FormatNumber(counted) }));
        let viewH: int = (IoLeaderboards.LIST_H - 2) | 0;
        let total: number = this._list.length * IoLeaderboards.ROW_H;
        this._track.visible = this._thumb.visible = total > viewH;
        if (total > viewH) {
            let thumbH: int = Math.max(28, ((viewH - 4) * viewH / total) | 0) | 0;
            this._thumb.graphics.clear();
            this._thumb.graphics.lineStyle(1, 16760928, 1);
            this._thumb.graphics.beginFill(13127706, 1);
            this._thumb.graphics.drawRoundRect(0, 0, IoLeaderboards.BAR_W, thumbH, 8, 8);
            this._thumb.graphics.endFill();
        }
        this.render();
        this.updateFooter();
    }

    /** The rows of a tab, sorted, ranked, filtered to the world chosen. */
    private rowsFor(tab: int): any[] {
        let out: any[] = [];
        let item: any = null;
        let rank: int = 0;
        let p: any = null;
        if (tab == 0) {
            for (p of as3.values(as3.sort((as3.as(IoLeaderboards._data.players, Array)), IoLeaderboards.byOutposts))) {
                if (IoLeaderboards._world < 0 || p.w == IoLeaderboards._world) {
                    out.push({ "kind": "player", "rank": ++rank, "p": p });
                }
            }
        } else if (tab == 1) {
            for (let a of as3.values(as3.sort((as3.as(IoLeaderboards._data.alliances, Array)), IoLeaderboards.byEmpire))) {
                if (IoLeaderboards._world >= 0 && a.w != IoLeaderboards._world) {
                    continue;
                }
                out.push({ "kind": "alliance", "rank": ++rank, "a": a });
                if (IoLeaderboards._expanded[IoLeaderboards.allianceKey(a)]) {
                    for (p of as3.values(as3.sort((as3.as(a.members, Array)), IoLeaderboards.byEmpire))) {
                        out.push({ "kind": "member", "rank": 0, "p": p, "a": a });
                    }
                }
            }
        } else {
            for (let g of as3.values(as3.sort((as3.as(IoLeaderboards._data.gamblers, Array)), IoLeaderboards.byGambled))) {
                if (IoLeaderboards._world < 0 || g.w == IoLeaderboards._world) {
                    out.push({ "kind": "gambler", "rank": ++rank, "g": g, "p": IoLeaderboards._data.byUid[String(g.uid)] || null });
                }
            }
        }
        return out;
    }

    private static byName(a: any, b: any): int {
        let an: string = String(a.name).toLowerCase();
        let bn: string = String(b.name).toLowerCase();
        return an < bn ? -1 : (an > bn ? 1 : 0);
    }

    /** Most outposts first; ties: the higher empire value, then the name. */
    private static byOutposts(a: any, b: any): int {
        if (a.outposts != b.outposts) {
            return a.outposts > b.outposts ? -1 : 1;
        }
        if (a.empire != b.empire) {
            return a.empire > b.empire ? -1 : 1;
        }
        return IoLeaderboards.byName(a, b);
    }

    /** The highest empire value first; ties: more outposts, then the name. */
    private static byEmpire(a: any, b: any): int {
        if (a.empire != b.empire) {
            return a.empire > b.empire ? -1 : 1;
        }
        if (a.outposts != b.outposts) {
            return a.outposts > b.outposts ? -1 : 1;
        }
        return IoLeaderboards.byName(a, b);
    }

    /** The most gambled first; ties: the better net, then the name. */
    private static byGambled(a: any, b: any): int {
        if (a.wagered != b.wagered) {
            return a.wagered > b.wagered ? -1 : 1;
        }
        if (a.net != b.net) {
            return a.net > b.net ? -1 : 1;
        }
        return IoLeaderboards.byName(a, b);
    }

    /** Puts the rows at the scroll position into the rows on screen. */
    private render(): void {
        let viewH: int = (IoLeaderboards.LIST_H - 2) | 0;
        let maxOffset: number = Math.max(0, this._list.length * IoLeaderboards.ROW_H - viewH);
        this._offset = Math.max(0, Math.min(maxOffset, this._offset));
        let first: int = (this._offset / IoLeaderboards.ROW_H) | 0;
        let shift: number = this._offset - first * IoLeaderboards.ROW_H;
        let me: int = LOGIN._playerID;
        let myWorld: int = IoLeaderboards.myWorldIndex();
        let now: int = GLOBAL.Timestamp();
        for (let r: int = 0; r < this._pool.length; r++) {
            let entry: any = this._pool[r];
            let index: int = (first + r) | 0;
            let line: Sprite = as3.cast(entry.line, Sprite);
            if (index >= this._list.length) {
                line.visible = false;
                entry.index = -1;
                entry.item = null;
                continue;
            }
            line.visible = true;
            line.y = r * IoLeaderboards.ROW_H - shift;
            let item: any = this._list[index];
            let mine: boolean = Boolean(item.p && (item.p.uid | 0) == me || item.g && (item.g.uid | 0) == me || item.kind == "alliance" && this.isMyAlliance(item.a));
            let flash: boolean = Boolean(this._flashUid != 0 && now < this._flashUntil && (item.p && (item.p.uid | 0) == this._flashUid || item.g && (item.g.uid | 0) == this._flashUid));
            if (entry.index == index && entry.item == item && !flash && entry.flash == flash) {
                continue;
            }
            entry.index = index;
            entry.item = item;
            entry.flash = flash;
            line.graphics.clear();
            let fillColour: uint = (mine ? 0x6A3A0E : (item.kind == "member" ? 0x1A1210 : (index % 2 == 0 ? 0x2A1C18 : 0x221613))) >>> 0;
            line.graphics.beginFill((flash ? 0xA05A14 : fillColour) >>> 0, mine || flash ? 0.95 : 0.85);
            line.graphics.drawRect(0, 0, IoLeaderboards.ROW_W, IoLeaderboards.ROW_H - 1);
            line.graphics.endFill();
            line.buttonMode = item.kind == "alliance";
            let x: int = 0;
            let columns: any[] = as3.cast(IoLeaderboards.COLUMNS[IoLeaderboards._tab], Array);
            for (let c: int = 0; c < 6; c++) {
                let cell: TextField = as3.cast(entry.cells[c], TextField);
                let column: any[] = as3.cast(columns[c], Array);
                cell.width = column[2] - 8;
                cell.x = x + 4;
                x = (x + column[2]) | 0;
                let text: string = this.cellText(item, String(column[0]));
                let colour: uint = this.cellColour(item, String(column[0]), mine);
                let format: TextFormat = cell.defaultTextFormat;
                format.align = as3.str(column[3]);
                format.color = colour;
                format.bold = column[0] == "name" || column[0] == "rank";
                cell.defaultTextFormat = format;
                cell.text = text;
            }
            let p: any = item.kind == "alliance" ? null : item.p;
            entry.jump.visible = p != null && myWorld >= 0 && (p.w | 0) == myWorld && (p.x | 0) >= 0;
        }
        if (this._thumb.visible) {
            let room: number = this._track.height - this._thumb.height;
            this._thumb.y = Number(2 + (maxOffset > 0 ? Math.round(room * this._offset / maxOffset) : 0));
        }
    }

    private cellText(item: any, key: string): string {
        let kind: string = as3.str(item.kind);
        let p: any = item.p;
        switch (key) {
            case "rank":
                if (kind == "alliance") {
                    return (IoLeaderboards._expanded[IoLeaderboards.allianceKey(item.a)] ? "▾ " : "▸ ") + item.rank;
                }
                return kind == "member" ? "" : String(item.rank);
            case "name":
                if (kind == "alliance") {
                    return String(item.a.name);
                }
                if (kind == "member") {
                    return "    " + String(p.name);
                }
                return String(kind == "gambler" ? item.g.name : p.name);
            case "world":
                return this.worldName(kind == "alliance" ? item.a.w | 0 : (kind == "gambler" ? item.g.w | 0 : p.w | 0));
            case "alliance":
                let a: any = IoLeaderboards._data.allianceById[String(p.alliance)];
                return a ? String(a.name) : "";
            case "members":
                return kind == "alliance" ? GLOBAL.FormatNumber((as3.as(item.a.members, Array)).length) : "";
            case "outposts":
                return GLOBAL.FormatNumber(kind == "alliance" ? Number(item.a.outposts) : Number(p.outposts));
            case "empire":
                return GLOBAL.FormatNumber(kind == "alliance" ? Number(item.a.empire) : Number(p.empire));
            case "bets":
                return GLOBAL.FormatNumber(Number(item.g.bets));
            case "gambled":
                return GLOBAL.FormatNumber(Number(item.g.wagered));
            case "net":
                let net: number = Number(item.g.net);
                return (net > 0 ? "+" : (net < 0 ? "-" : "")) + GLOBAL.FormatNumber(Math.abs(net));
        }
        return "";
    }

    private cellColour(item: any, key: string, mine: boolean): uint {
        if (key == "net") {
            let net: number = Number(item.g.net);
            return net > 0 ? CasinoUI.WIN : (net < 0 ? CasinoUI.LOSS : CasinoUI.ASH);
        }
        if (key == "name" || key == "rank") {
            return (mine ? 0xFFFFFF : (item.kind == "member" ? 0xE8D8C0 : CasinoUI.GOLD)) >>> 0;
        }
        return (mine ? 0xFFF0D8 : 0xD8C8B8) >>> 0;
    }

    private isMyAlliance(a: any): boolean {
        let me: any = IoLeaderboards._data ? IoLeaderboards._data.byUid[String(LOGIN._playerID)] : null;
        return me != null && a != null && (me.alliance | 0) == (a.id | 0) && (me.alliance | 0) != 0 && (me.w | 0) == (a.w | 0);
    }

    /** An alliance's key: its id and world (one alliance with members on two worlds is listed on each). */
    private static allianceKey(a: any): string {
        return String(a.id) + "@" + String(a.w);
    }

    /** The player's own world (index into worlds): their row's; for one not listed, the map's. */
    private static myWorldIndex(): int {
        if (!IoLeaderboards._data) {
            return -1;
        }
        let me: any = IoLeaderboards._data.byUid[String(LOGIN._playerID)];
        if (me) {
            return me.w | 0;
        }
        let worlds: any[] = as3.as(IoLeaderboards._data.worlds, Array);
        for (let i: int = 0; i < worlds.length; i++) {
            if (IoMapSnapshot.world && String(worlds[i].id) == IoMapSnapshot.world) {
                return i;
            }
        }
        return -1;
    }

    // ---- actions
    private jump(p: any): void {
        SOUNDS.Play("click1");
        let x: int = p.x | 0;
        let y: int = p.y | 0;
        this.close();
        IoMapShare.OpenOwnWorld(x, y);
    }

    /** Scrolls to the player's own row (opening their alliance on the Alliances tab), and lights it up. */
    private findMe(e: MouseEvent = null): void {
        IoQuests.once("lb_findme");
        // (the quest book)
        this.findUid(LOGIN._playerID, null);
    }

    /** Inferno chat: the window opened on a player (Outposts, every world), scrolled to their row and lit. */
    public static ShowPlayer(param1: int, param2: string = null): void {
        IoLeaderboards._findUid = param1;
        IoLeaderboards._findName = param2;
        IoLeaderboards._world = -1;
        if (IoLeaderboards._open && IoLeaderboards._open.mc && IoLeaderboards._open.mc.stage) {
            IoLeaderboards._open.selectTab(0);
            IoLeaderboards._open.findPending();
            return;
        }
        IoLeaderboards._tab = 0;
        IoLeaderboards.Show();
    }

    /**
     * Inferno chat: the map opened on a player's main yard, when it is on this player's world (the
     * leaderboards know every player's home cell; loaded first if they have not been yet).
     */
    public static JumpToPlayer(param1: int, param2: string): void {
        let go: Function = (): void => {
            let p: any = IoLeaderboards._data ? IoLeaderboards._data.byUid[String(param1)] : null;
            let who: string = param2 ? param2 : "That player";
            if (!p || (p.x | 0) < 0) {
                GLOBAL.Message(KEYS.Get("lb_no_yard", { "v1": who }));
                return;
            }
            let mine: int = IoLeaderboards.myWorldIndex();
            if (mine < 0 || (p.w | 0) != mine) {
                let worlds: any[] = as3.as(IoLeaderboards._data.worlds, Array);
                GLOBAL.Message(KEYS.Get("lb_other_world", { "v1": who, "v2": (p.w | 0) >= 0 && (p.w | 0) < worlds.length ? String(worlds[p.w | 0].name) : "?" }));
                return;
            }
            if (IoLeaderboards._open) {
                IoLeaderboards._open.close();
            }
            IoMapShare.OpenOwnWorld(p.x | 0, p.y | 0);
        };
        if (IoLeaderboards._data) {
            go();
            return;
        }
        IoLeaderboards._waiters.push(go);
        if (!IoLeaderboards._loading) {
            IoLeaderboards.fetch();
        }
    }

    private findPending(): void {
        if (IoLeaderboards._findUid > 0 && IoLeaderboards._data) {
            let uid: int = IoLeaderboards._findUid;
            let name: string = IoLeaderboards._findName;
            IoLeaderboards._findUid = 0;
            IoLeaderboards._findName = null;
            this.findUid(uid, name);
        }
    }

    /** Scrolls to a player's row (opening their alliance on the Alliances tab) and lights it up. */
    private findUid(param1: int, param2: string): void {
        if (!IoLeaderboards._data) {
            return;
        }
        let me: int = param1;
        if (IoLeaderboards._tab == 1) {
            let mine: any = IoLeaderboards._data.byUid[String(me)];
            if (mine && (mine.alliance | 0) != 0) {
                IoLeaderboards._expanded[String(mine.alliance) + "@" + String(mine.w)] = true;
                this.fill(false);
            }
        }
        for (let i: int = 0; i < this._list.length; i++) {
            let item: any = this._list[i];
            if (item.p && (item.p.uid | 0) == me || item.g && (item.g.uid | 0) == me) {
                this._offset = Math.max(0, i - 2) * IoLeaderboards.ROW_H;
                this._flashUid = me;
                this._flashUntil = (GLOBAL.Timestamp() + 2) | 0;
                for (let entry of as3.values(this._pool)) {
                    entry.index = -1;
                }
                this.render();
                return;
            }
        }
        GLOBAL.Message(param1 == LOGIN._playerID ? KEYS.Get("lb_not_listed") : KEYS.Get("lb_not_listed_other", { "v1": param2 ? param2 : "That player" }));
    }

    // ---- scrolling
    private onWheel(e: MouseEvent): void {
        e.stopPropagation();
        this._offset += (e.delta > 0 ? -1 : 1) * IoLeaderboards.WHEEL_ROWS * IoLeaderboards.ROW_H;
        this.render();
    }

    private onTrack(e: MouseEvent): void {
        let page: number = IoLeaderboards.LIST_H - 2 - IoLeaderboards.ROW_H;
        this._offset += this._holder.mouseY < this._thumb.y ? -page : page;
        this.render();
    }

    private onThumbDown(e: MouseEvent): void {
        e.stopPropagation();
        this._dragFrom = this._holder.mouseY - this._thumb.y;
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onThumbMove));
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onThumbUp));
    }

    private onThumbMove(e: MouseEvent): void {
        if (!this.mc) {
            return;
        }
        let room: number = this._track.height - this._thumb.height;
        let y: number = Math.max(0, Math.min(room, this._holder.mouseY - this._dragFrom - 2));
        this._offset = Number(room > 0 ? y / room * Math.max(0, this._list.length * IoLeaderboards.ROW_H - (IoLeaderboards.LIST_H - 2)) : 0);
        this.render();
    }

    private onThumbUp(e: Event = null): void {
        GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onThumbMove));
        GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onThumbUp));
    }

    // ---- the clock
    private tick(e: Event): void {
        if (++this._ticks % 30 != 0) {
            return;
        }
        if (IoLeaderboards.shouldFetch()) {
            IoLeaderboards.fetch();
        }
        this.updateFooter();
        if (this._flashUid != 0 && GLOBAL.Timestamp() >= this._flashUntil) {
            this._flashUid = 0;
            for (let entry of as3.values(this._pool)) {
                entry.index = -1;
            }
            this.render();
        }
    }

    private updateFooter(): void {
        if (!IoLeaderboards._data) {
            this._footer.text = "";
            return;
        }
        let now: int = GLOBAL.Timestamp();
        let age: int = Math.max(0, now - (IoLeaderboards._data.generatedAt | 0)) | 0;
        let wait: int = Math.max(0, IoLeaderboards._dueAt - now) | 0;
        let next: string = IoLeaderboards._loading ? KEYS.Get("lb_updating") : KEYS.Get("lb_next", { "v1": ((wait / 60) | 0) + ":" + (wait % 60 < 10 ? "0" : "") + wait % 60 });
        let minutes: int = Math.max(1, (age / 60) | 0) | 0;
        let ago: string = minutes < 60 ? minutes + " min" : ((minutes / 60) | 0) + " h " + minutes % 60 + " min";
        this._footer.text = KEYS.Get("lb_updated", { "v1": ago }) + "  ·  " + next;
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        this.onThumbUp();
        this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        if (IoLeaderboards._open == this) {
            IoLeaderboards._open = null;
        }
    }

    // ---- the server
    /** Time for the next leaderboards: none yet, or the server's next is out and 5 minutes have passed. */
    private static shouldFetch(): boolean {
        if (IoLeaderboards._loading || !GLOBAL.INFERNO_ONLY) {
            return false;
        }
        let now: int = GLOBAL.Timestamp();
        if (IoLeaderboards._failedAt > 0 && now - IoLeaderboards._failedAt < 15) {
            return false;
        }
        if (!IoLeaderboards._data) {
            return true;
        }
        return now - IoLeaderboards._fetchedAt >= IoLeaderboards.MIN_GAP && now >= IoLeaderboards._dueAt;
    }

    private static fetch(): void {
        IoLeaderboards._loading = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "leaderboards/game", [["v", 1]], (r: any): void => {
            IoLeaderboards._loading = false;
            if (!r || r.error) {
                IoLeaderboards.failed();
                return;
            }
            IoLeaderboards._failedAt = 0;
            IoLeaderboards._data = IoLeaderboards.parse(r);
            IoLeaderboards._fetchedAt = GLOBAL.Timestamp();
            IoLeaderboards._nextAt = ((r.nextAt | 0) > 0 ? r.nextAt | 0 : IoLeaderboards._fetchedAt + IoLeaderboards.MIN_GAP) | 0;
            // a few seconds after the server's next one, so not everybody asks in the same second
            IoLeaderboards._dueAt = (Math.max(IoLeaderboards._nextAt, IoLeaderboards._fetchedAt + IoLeaderboards.MIN_GAP) + 3 + ((Math.random() * 18) | 0)) | 0;
            if (IoLeaderboards._open && IoLeaderboards._open.mc) {
                IoLeaderboards._open.fill(false);
                IoLeaderboards._open.findPending();
            }
            IoLeaderboards.callWaiters();
        }, (e: IOErrorEvent): void => {
            IoLeaderboards._loading = false;
            IoLeaderboards.failed();
        });
    }

    /** Whatever waited for the data (JumpToPlayer), now it is here (or failed: they say so themselves). */
    private static callWaiters(): void {
        let waiting: any[] = IoLeaderboards._waiters;
        IoLeaderboards._waiters = [];
        for (let fn of as3.values(waiting)) {
            fn();
        }
    }

    private static failed(): void {
        IoLeaderboards.callWaiters();
        IoLeaderboards._failedAt = GLOBAL.Timestamp();
        if (IoLeaderboards._open && IoLeaderboards._open.mc && !IoLeaderboards._data) {
            IoLeaderboards._open.fill(true);
        }
    }

    /** The server's rows as objects; alliances with their members and totals; players by uid. */
    private static parse(r: any): any {
        let out: any = { "generatedAt": r.generatedAt | 0, "worlds": [], "players": [], "alliances": [], "gamblers": [], "byUid": {}, "allianceById": {} };
        let row: any[] = null;
        for (row of as3.values(as3.as(r.worlds, Array) || [])) {
            out.worlds.push({ "id": String(row[0]), "name": String(row[1]) });
        }
        for (row of as3.values(as3.as(r.players, Array) || [])) {
            let p: any = { "uid": row[0] | 0, "name": String(row[1]), "w": row[2] | 0, "alliance": row[3] | 0, "outposts": row[4] | 0, "empire": Number(row[5]), "x": row[6] | 0, "y": row[7] | 0 };
            out.players.push(p);
            out.byUid[String(p.uid)] = p;
        }
        for (row of as3.values(as3.as(r.alliances, Array) || [])) {
            let a: any = { "id": row[0] | 0, "name": String(row[1]), "image": row[2] | 0, "w": row[3] | 0, "members": [], "outposts": 0, "empire": 0 };
            for (let uid of as3.values(as3.as(row[4], Array) || [])) {
                let member: any = out.byUid[String(uid)];
                if (member) {
                    a.members.push(member);
                    a.outposts += member.outposts | 0;
                    a.empire += Number(member.empire);
                }
            }
            if (a.members.length) {
                out.alliances.push(a);
                out.allianceById[String(a.id)] = a;
            }
        }
        for (row of as3.values(as3.as(r.gamblers, Array) || [])) {
            out.gamblers.push({ "uid": row[0] | 0, "name": String(row[1]), "w": row[2] | 0, "wagered": Number(row[3]), "net": Number(row[4]), "bets": Number(row[5]) });
        }
        return out;
    }
}
