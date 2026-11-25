import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { Event, FocusEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { TextField, TextFormatAlign } from "flash/text";
import { setTimeout } from "flash/utils";
import { IoWin, ALLIANCES, com_monsters_maproom_advanced_MapRoom as MapRoom, GLOBAL, IoKit, IoMapFilters, IoMapLod, IoMapSnapshot, IoMapTargets, IoMapUi, IoOutpostsPopup, IoQuests, IoScrollPane, IoUnderworld, KEYS, LOGIN, MapRoomPopup, SOUNDS, TRIBES } from "@game";

/**
 * Inferno-only: the map room's sidebar, under the resources and Home / Jump.
 *
 *  - Find a player: type part of a name; every player with a yard on the world who matches (a dot in
 *    the colour of how you stand with them), with their alliance, main yard and outposts. Go goes to
 *    their main yard; clicking a player lists their outposts, each with Go.
 *  - Bookmarks: no limit, in a list that scrolls (Home is the Home button). Each is a name, and under it where it is
 *    with rename and remove. Click one to go there. They are added from the places on the map (a yard's
 *    popup, an empty place's bubble).
 *    (QoL #76, 15 October) Each says what is there now (the world snapshot's: the owner and level, or the tribe yard,
 *    protected or damaged), how far it is from your nearest yard, and a dot when it is in your flinger range. Sorted
 *    as saved, by name, distance, level or colour (the Sort button); a click on the pin gives it a colour tag.
 *  - Alliance: your alliance's members on this world, with Go to each one's main yard.
 *  - (QoL #327, 15 October) Outposts: your outposts, by the names you gave them (QoL #326), each with Go.
 *  - (QoL #340, 15 October) Portals: the Depths of Hell's portals, each end with Go (which are open to you).
 *  The four tabs in two rows (Bookmarks, Outposts / Alliance, Portals).
 *
 * Players, alliances and yards come from the world snapshot (IoMapSnapshot).
 *
 * (QoL #235) Its words in the player's language (io_tr_maps_*).
 */
export class IoMapSidebar extends Sprite {
    static {
        as3.fields(this, { _host: null, _w: 0, _h: 0, _searchBox: null, _search: null, _placeholder: null, _clear: null, _results: null, _resultsPane: null, _query: "", _expanded: 0, _resultsKey: null, _tabBar: null, _tabs: null, _panel: null, _pane: null, _drawnKey: null, _renaming: -1, _confirming: -1, _editField: null, _ioNamesAsked: false });
    }

    private static readonly SEARCH_H: int = 24;

    private static readonly TAB_H: int = 20;

    private static readonly ROW_H: int = 34;

    private static readonly RESULTS_W: int = 280;

    private static readonly RESULTS_MAX_H: int = 300;

    /** The tab showing (for the session). */
    private static s_tab: string = "bookmarks";

    /** (QoL #76) the bookmarks' order: as saved, by name, distance, level or colour (for the session). */
    private static s_bmSort: int = 0;

    private static readonly BM_SORTS: any[] = ["saved", "name", "distance", "level", "colour"];

    /** (QoL #76) a bookmark's row: its name, what is there, where and how far. */
    private static readonly BM_ROW_H: int = 46;
    private _host: MapRoomPopup;
    private _w: int;
    private _h: int;
    // find a player
    private _searchBox: Sprite;
    private _search: TextField;
    private _placeholder: TextField;
    private _clear: Sprite;
    private _results: Sprite;
    private _resultsPane: IoScrollPane;
    private _query: string;
    private _expanded: int;
    private _resultsKey: string;
    // tabs
    private _tabBar: Sprite;
    private _tabs: any[];
    private _panel: Shape;
    private _pane: IoScrollPane;
    private _drawnKey: string;
    // bookmarks
    private _renaming: int;
    private _confirming: int;
    private _editField: TextField;
    /** (QoL #327) the outposts' names were asked for (once while the map is open). */
    private _ioNamesAsked: boolean;

    /** (QoL #327, #340) the tabs: two rows of two. */
    private static readonly TAB_ROWS: int = 2;

    private static readonly TAB_GAP: int = 3;

    /** (QoL #327) the most outposts the Outposts tab lists. */
    private static readonly MAX_OUTPOST_ROWS: int = 250;

    public $ctor(host?: MapRoomPopup, w?: int, h?: int): void {
        this._tabs = [];
        super.$ctor();
        this._host = host;
        this._w = w;
        this._h = h;
        this.makeSearch();
        this._tabBar = new Sprite();
        this._tabBar.y = IoMapSidebar.SEARCH_H + 8;
        this.addChild(this._tabBar);
        this._panel = new Shape();
        // (QoL #327, #340: two rows of tabs)
        this._panel.y = this._tabBar.y + IoMapSidebar.TAB_ROWS * IoMapSidebar.TAB_H + (IoMapSidebar.TAB_ROWS - 1) * IoMapSidebar.TAB_GAP;
        this.addChild(this._panel);
        let paneH: int = (h - this._panel.y) | 0;
        IoMapUi.roundBox(this._panel.graphics, 0, 0, w, paneH, IoMapUi.PAPER, 1, IoMapUi.EDGE, 4, 1.5);
        this._pane = new IoScrollPane((w - 4) | 0, (paneH - 4) | 0);
        this._pane.x = 2;
        this._pane.y = this._panel.y + 2;
        this.addChild(this._pane);
        this._results = new Sprite();
        this._results.visible = false;
        this.addChild(this._results);
        this.makeTabs();
        this.render(true);
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
    }

    // ---- find a player
    private makeSearch(): void {
        this._searchBox = new Sprite();
        IoMapUi.roundBox(this._searchBox.graphics, 0, 0, this._w, IoMapSidebar.SEARCH_H, 15984328, 1, IoMapUi.EDGE, 6, 1.5);
        IoMapUi.magnifier(this._searchBox.graphics, 6, 5, IoMapUi.MUTED);
        this.addChild(this._searchBox);
        this._placeholder = IoMapUi.label(KEYS.Get("io_tr_maps_find"), 11, 10123862, false, (this._w - 30) | 0);
        this._placeholder.x = 24;
        this._placeholder.y = 3;
        // (16 October: kept inside the box, it read "Find a player, or")
        GLOBAL.ioFitText(this._placeholder, 9);
        this._searchBox.addChild(this._placeholder);
        this._search = IoMapUi.input(11, IoMapUi.INK, (this._w - 44) | 0, 24);
        this._search.x = 22;
        this._search.y = 2;
        this._search.height = IoMapSidebar.SEARCH_H - 4;
        this._search.addEventListener(Event.CHANGE, as3.bind(this, this.onSearchChange));
        this._search.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onSearchKey));
        this._search.addEventListener(FocusEvent.FOCUS_IN, as3.bind(this, this.onSearchFocus));
        this._searchBox.addChild(this._search);
        this._clear = new Sprite();
        IoMapUi.hitArea(this._clear.graphics, 18, 18);
        IoMapUi.cross(this._clear.graphics, 5, 5, 8, IoMapUi.MUTED);
        this._clear.x = this._w - 20;
        this._clear.y = 3;
        this._clear.buttonMode = true;
        this._clear.visible = false;
        this._clear.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSearchClear));
        this._searchBox.addChild(this._clear);
    }

    private onSearchFocus(e: FocusEvent): void {
        if (this._query.length > 0) {
            this.showResults();
        }
    }

    private onSearchChange(e: Event): void {
        this._query = this._search.text.replace(/^\s+|\s+$/g, "");
        this._placeholder.visible = this._search.text.length == 0;
        this._clear.visible = !this._placeholder.visible;
        this._expanded = 0;
        if (this._query.length == 0) {
            this.hideResults();
        } else {
            this.showResults();
        }
    }

    private onSearchKey(e: KeyboardEvent): void {
        if (e.keyCode == 27) {
            this.onSearchClear(null);
        } else if (e.keyCode == 13) {
            // (QoL #75: "123,45" or "123 45" goes to that cell, as Jump does)
            let at: any[] = /^\s*(\d{1,4})\s*[,; ]\s*(\d{1,4})\s*$/.exec(this._search.text);
            if (at) {
                this._host.ioGoTo(Number(at[1]) | 0, Number(at[2]) | 0);
                return;
            }
            // Enter goes to the only match, or the first one.
            let first: any = this.matches()[0];
            if (first) {
                this.goToPlayer(first.uid | 0);
            }
        }
    }

    private onSearchClear(e: MouseEvent): void {
        if (e) {
            e.stopPropagation();
        }
        this._search.text = "";
        this.onSearchChange(null);
        if (this.stage && this.stage.focus == this._search) {
            this.stage.focus = null;
        }
    }

    /** Players whose name has the typed text: names starting with it first. */
    private matches(): any[] {
        let list: any[] = [];
        let query: string = this._query.toLowerCase();
        let uid: string = null;
        let player: any = null;
        let at: int = 0;
        if (query.length == 0 || !IoMapSnapshot.ready) {
            return list;
        }
        for (uid in IoMapSnapshot.players) {
            player = IoMapSnapshot.players[uid];
            at = String(player.name || "").toLowerCase().indexOf(query);
            if (at >= 0) {
                list.push({ "uid": Number(uid) | 0, "name": String(player.name), "at": at, "player": player });
            }
        }
        as3.sort(list, (a: any, b: any): int => {
            if ((a.at == 0) != (b.at == 0)) {
                return a.at == 0 ? -1 : 1;
            }
            if (a.name.length != b.name.length) {
                return (a.name.length - b.name.length) | 0;
            }
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
        return list.slice(0, 60);
    }

    private showResults(): void {
        let list: any[] = this.matches();
        let g: Graphics = this._results.graphics;
        let content: Sprite = null;
        let y: int = 0;
        let entry: any = null;
        let header: TextField = null;
        let h: int = 0;
        this._resultsKey = this._query + "/" + this._expanded + "/" + IoMapSnapshot.version;
        while (this._results.numChildren > 0) {
            this._results.removeChildAt(0);
        }
        g.clear();
        this._results.visible = true;
        this._results.x = 0;
        this._results.y = IoMapSidebar.SEARCH_H + 2;
        if (!IoMapSnapshot.ready) {
            h = 34;
            IoMapUi.roundBox(g, 0, 0, IoMapSidebar.RESULTS_W, h, 16182225, 1, IoMapUi.EDGE, 8, 1.5);
            header = IoMapUi.label(KEYS.Get("io_tr_maps_loading"), 11, IoMapUi.MUTED, false, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.x = 10;
            header.y = 9;
            this._results.addChild(header);
            IoWin.watchLoading(header); // (QoL #447)
            return;
        }
        if (list.length == 0) {
            h = 54;
            IoMapUi.roundBox(g, 0, 0, IoMapSidebar.RESULTS_W, h, 16182225, 1, IoMapUi.EDGE, 8, 1.5);
            header = IoMapUi.label(KEYS.Get("io_tr_maps_none"), 10, IoMapUi.MUTED, true, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.x = 10;
            header.y = 7;
            this._results.addChild(header);
            header = IoMapUi.label("", 11, IoMapUi.INK, false, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.text = KEYS.Get("io_tr_maps_none_called", { "v1": this._query });
            header.x = 10;
            header.y = 26;
            this._results.addChild(header);
            return;
        }
        content = new Sprite();
        for (entry of as3.values(list)) {
            y += this.resultRow(content, entry, y);
        }
        let headH: int = 22;
        h = Math.min(IoMapSidebar.RESULTS_MAX_H, headH + y + 2) | 0;
        IoMapUi.roundBox(g, 0, 0, IoMapSidebar.RESULTS_W, h, 16182225, 1, IoMapUi.EDGE, 8, 1.5);
        g.beginFill(IoMapUi.PAPER, 1);
        g.drawRect(2, 2, IoMapSidebar.RESULTS_W - 4, headH - 3);
        g.endFill();
        header = IoMapUi.label(KEYS.Get(list.length == 1 ? "io_tr_maps_found_one" : (list.length >= 60 ? "io_tr_maps_found_first" : "io_tr_maps_found_n"), { "v1": list.length }), 9, IoMapUi.MUTED, true, (IoMapSidebar.RESULTS_W - 20) | 0);
        header.x = 10;
        header.y = 4;
        this._results.addChild(header);
        this._resultsPane = new IoScrollPane((IoMapSidebar.RESULTS_W - 4) | 0, (h - headH - 2) | 0);
        this._resultsPane.x = 2;
        this._resultsPane.y = headH;
        this._results.addChild(this._resultsPane);
        this._resultsPane.content.addChild(content);
        this._resultsPane.refresh(y);
    }

    /** One player in the results (and their yards when opened). Returns its height. */
    private resultRow(content: Sprite, entry: any, y: int): int {
        let uid: int = 0;
        let open: boolean = false;
        let outposts: int = 0;
        let row: Sprite = new Sprite();
        let player: any = entry.player;
        uid = entry.uid | 0;
        let yards: any = IoMapSnapshot.YardsOf(uid);
        let alliance: any = player.alliance | 0 ? IoMapSnapshot.AllianceInfo(player.alliance | 0) : null;
        let relation: int = IoMapUi.relation(uid, player.alliance | 0);
        let width: int = (IoMapSidebar.RESULTS_W - 4 - IoScrollPane.BAR_W - 2) | 0;
        let name: TextField = IoMapUi.label("", 12, IoMapUi.INK, true, (width - 60) | 0);
        let line2: TextField = IoMapUi.label("", 10, 5913888, false, (width - 70) | 0);
        open = this._expanded == uid;
        let h: int = 40;
        let n: string = String(entry.name);
        let at: int = entry.at | 0;
        outposts = (yards ? yards.outposts.length : 0) | 0;
        let go: MovieClip = null;
        let i: int = 0;
        row.y = y;
        row.graphics.beginFill((open ? IoMapUi.PAPER_ROW : 0xF6EBD1) >>> 0, 1);
        row.graphics.drawRect(0, 0, width, h);
        row.graphics.endFill();
        row.graphics.lineStyle(1, 14732709, 1);
        row.graphics.moveTo(0, h - 0.5);
        row.graphics.lineTo(width, h - 0.5);
        row.graphics.lineStyle(1, 0, 1);
        row.graphics.beginFill(IoMapUi.relationColour(relation), 1);
        row.graphics.drawCircle(13, 20, 5);
        row.graphics.endFill();
        row.graphics.lineStyle();
        name.htmlText = IoMapUi.escape(n.substr(0, at)) + "<font color=\"#A86A00\"><u>" + IoMapUi.escape(n.substr(at, this._query.length)) + "</u></font>" + IoMapUi.escape(n.substr(at + this._query.length)) + "<font color=\"#6B4A26\"> (" + (player.level | 0 || 1) + ")</font>";
        name.x = 24;
        name.y = 3;
        row.addChild(name);
        line2.text = (alliance ? String(alliance.name) : KEYS.Get("io_tr_maps_no_alliance")) + " · " + (yards && yards.main ? IoMapUi.coord(yards.main[0] | 0, yards.main[1] | 0) : KEYS.Get("io_tr_maps_no_main")) + " · " + KEYS.Get(outposts == 1 ? "io_tr_maps_outposts_one" : "io_tr_maps_outposts_n", { "v1": outposts });
        line2.x = 24;
        line2.y = 21;
        row.addChild(line2);
        if (yards && (yards.main || outposts > 0)) {
            go = IoMapUi.button(KEYS.Get("io_tr_maps_go"), 34, 22, (e: MouseEvent): void => {
                this.goToPlayer(uid);
            }, "grey");
            go.x = width - 42;
            go.y = 9;
            row.addChild(go);
        }
        row.buttonMode = outposts > 0;
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (outposts > 0) {
                SOUNDS.Play("click1");
                this._expanded = open ? 0 : uid;
                let offset: number = Number(this._resultsPane ? this._resultsPane.offset : 0);
                this.showResults();
                if (this._resultsPane) {
                    this._resultsPane.scrollTo(offset);
                }
            }
        });
        content.addChild(row);
        if (open && yards) {
            if (yards.main) {
                h += this.yardRow(content, (y + h) | 0, width, KEYS.Get("io_tr_maps_main"), yards.main[0] | 0, yards.main[1] | 0);
            }
            for (i = 0; i < yards.outposts.length; i++) {
                h += this.yardRow(content, (y + h) | 0, width, KEYS.Get("io_tr_maps_outpost"), yards.outposts[i][0] | 0, yards.outposts[i][1] | 0);
            }
        }
        return h;
    }

    private yardRow(content: Sprite, y: int, width: int, kind: string, cellX: int, cellY: int): int {
        let row: Sprite = new Sprite();
        let text: TextField = IoMapUi.label("", 11, IoMapUi.INK, false, (width - 80) | 0);
        let go: MovieClip = IoMapUi.button(KEYS.Get("io_tr_maps_go"), 34, 18, (e: MouseEvent): void => {
            this.goTo(cellX, cellY);
        }, "grey", 10);
        row.y = y;
        row.graphics.beginFill(IoMapUi.PAPER_ROW, 1);
        row.graphics.drawRect(0, 0, width, 24);
        row.graphics.endFill();
        text.htmlText = kind + "  <font color=\"#6B4A26\">" + IoMapUi.coord(cellX, cellY) + "</font>";
        text.x = 36;
        text.y = 4;
        row.addChild(text);
        go.x = width - 42;
        go.y = 3;
        row.addChild(go);
        content.addChild(row);
        return 24;
    }

    private goToPlayer(uid: int): void {
        let yards: any = IoMapSnapshot.YardsOf(uid);
        if (!yards) {
            return;
        }
        IoQuests.once("map_search");
        // (the quest book)
        if (yards.main) {
            this.goTo(yards.main[0] | 0, yards.main[1] | 0);
        } else if (yards.outposts.length > 0) {
            this.goTo(yards.outposts[0][0] | 0, yards.outposts[0][1] | 0);
        }
    }

    private goTo(cellX: int, cellY: int): void {
        this.hideResults();
        if (this.stage && this.stage.focus == this._search) {
            this.stage.focus = null;
        }
        this._host.ioGoTo(cellX, cellY);
    }

    private hideResults(): void {
        this._results.visible = false;
        this._resultsKey = null;
        while (this._results.numChildren > 0) {
            this._results.removeChildAt(0);
        }
        this._resultsPane = null;
    }

    /** A mouse press anywhere else closes the results (the map room calls this). */
    public ioStageDown(target: DisplayObject): void {
        if (this._results.visible && target && !this._results.contains(target) && !this._searchBox.contains(target)) {
            this.hideResults();
        }
    }

    // ---- tabs
    private makeTabs(): void {
        // (QoL #327, #340: Outposts and Portals, in a second row; the tab's name is what it shows)
        let names: any[] = ["bookmarks", "ioMap2Outposts", "alliance", "ioMap2Portals"];
        let titles: any[] = [KEYS.Get("io_tr_maps_tab_bookmarks"), KEYS.Get("io_op2_tab_outposts"), KEYS.Get("io_tr_maps_tab_alliance"), KEYS.Get("io_op2_tab_portals")];
        let gap: int = IoMapSidebar.TAB_GAP;
        let w: number = (this._w - gap) / 2;
        let i: int = 0;
        let tab: Sprite = null;
        let text: TextField = null;
        while (i < names.length) {
            tab = new Sprite();
            tab.name = as3.str(names[i]);
            tab.buttonMode = true;
            tab.mouseChildren = false;
            text = IoMapUi.label(as3.str(titles[i]), 10, IoMapUi.INK, true, w | 0, TextFormatAlign.CENTER);
            text.y = 3;
            GLOBAL.ioFitText(text, 7);
            tab.addChild(text);
            tab.x = Math.round((i % 2) * (w + gap));
            tab.y = ((i / 2) | 0) * (IoMapSidebar.TAB_H + gap);
            tab.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onTab));
            this._tabBar.addChild(tab);
            this._tabs.push(tab);
            i++;
        }
        this.layoutTabs();
    }

    private layoutTabs(): void {
        let w: number = (this._w - 3) / 2;
        let on: boolean = false;
        for (let tab of as3.values(this._tabs)) {
            on = tab.name == IoMapSidebar.s_tab;
            tab.graphics.clear();
            // (11 October: the game's own stock tab buttons, yellow for the open one)
            let face: MovieClip = as3.as(tab.getChildByName("ioStockFace"), MovieClip);
            if (!face) {
                face = IoKit.stockFace(tab, w, IoMapSidebar.TAB_H + 1, false);
            }
            IoKit.stockState(face, false, true, on);
            if (face) {
                IoKit.textOf(tab).textColor = 0x333333;
                continue;
            }
            tab.graphics.lineStyle(1.5, (on ? IoMapUi.EDGE : 0x8A6436) >>> 0, 1, true);
            tab.graphics.beginFill(on ? IoMapUi.PAPER : IoMapUi.TAB_OFF, 1);
            tab.graphics.moveTo(0, IoMapSidebar.TAB_H + 1);
            tab.graphics.lineTo(0, 4);
            tab.graphics.curveTo(0, 0, 4, 0);
            tab.graphics.lineTo(w - 4, 0);
            tab.graphics.curveTo(w, 0, w, 4);
            tab.graphics.lineTo(w, IoMapSidebar.TAB_H + 1);
            tab.graphics.endFill();
            tab.graphics.lineStyle();
            IoKit.textOf(tab).textColor = (on ? IoMapUi.INK : 0x4A2F16) >>> 0;
        }
    }

    private onTab(e: MouseEvent): void {
        let name: string = as3.cast(e.currentTarget, Sprite).name;
        e.stopPropagation();
        if (name == IoMapSidebar.s_tab) {
            return;
        }
        SOUNDS.Play("click1");
        IoMapSidebar.s_tab = name;
        this._renaming = this._confirming = -1;
        this.layoutTabs();
        this._pane.scrollTo(0);
        this.render(true);
    }

    // ---- the panel
    /** Draws the tab again if what it shows has changed (called every second, and after changes). */
    /** Inferno-only (QoL #41): F on the map: the cursor in Find. */
    public ioFocusFind(): boolean {
        if (!this._search || !this._search.stage) {
            return false;
        }
        // (after the key's own typing, so the F isn't typed into it)
        setTimeout((): void => {
            if (this._search && this._search.stage) {
                this._search.stage.focus = this._search;
                this._search.setSelection(0, this._search.text.length);
            }
        }, 0);
        return true;
    }

    public Refresh(force: boolean = false): void {
        this.render(force);
        if (this._results.visible && this._resultsKey != this._query + "/" + this._expanded + "/" + IoMapSnapshot.version) {
            let offset: number = Number(this._resultsPane ? this._resultsPane.offset : 0);
            this.showResults();
            if (this._resultsPane) {
                this._resultsPane.scrollTo(offset);
            }
        }
    }

    private panelKey(): string {
        let key: string = IoMapSidebar.s_tab + "/" + this._w;
        if (IoMapSidebar.s_tab == "bookmarks") {
            key += "/" + this._renaming + "/" + this._confirming + "/";
            // (QoL #76: the order, the colours, and what is there now: the snapshot, and the minute for protection left)
            key += IoMapSidebar.s_bmSort + "/" + IoMapSnapshot.version + "/" + ((GLOBAL.Timestamp() / 60) | 0) + "/";
            for (let i: int = 0; i < MapRoom._bookmarks.length; i++) {
                let bookmark: any = MapRoom._bookmarks[i];
                key += bookmark.name + "@" + bookmark.location.x + "," + bookmark.location.y + "/" + MapRoom.ioBookmarkColour(i) + ";";
            }
        } else if (IoMapSidebar.s_tab == "ioMap2Outposts") {
            // (QoL #327: the outposts, and their names)
            key += "/" + IoOutpostsPopup.ioNamesVersion + "/" + (GLOBAL._mapOutpost ? GLOBAL._mapOutpost.length : 0) + "/" + (GLOBAL._mapOutpostIDs ? GLOBAL._mapOutpostIDs.join(",") : "");
        } else if (IoMapSidebar.s_tab == "ioMap2Portals") {
            // (QoL #340: the portals, and which are open)
            key += "/" + IoUnderworld.portals.length + "/" + IoMapSidebar.portalStates();
        } else {
            key += "/" + IoMapSnapshot.version + "/" + ALLIANCES._allianceID;
        }
        return key;
    }

    private render(force: boolean): void {
        let key: string = this.panelKey();
        let h: int = 0;
        if (!force && key == this._drawnKey) {
            return;
        }
        // (11 November, bug report #99) a bookmark's name being typed is left alone by the every-second redraw (the
        // minute turning, or a new map snapshot, changes the key): the box was made again, which threw away what was
        // typed, and the old box losing the cursor ended the rename in the middle of this draw (see below)
        if (!force && this._renaming >= 0 && this._editField && this._editField.stage) {
            return;
        }
        this._drawnKey = key;
        this._editField = null;
        while (this._pane.content.numChildren > 0) {
            this._pane.content.removeChildAt(0);
        }
        this._pane.content.graphics.clear();
        if (IoMapSidebar.s_tab == "alliance") {
            h = this.renderAlliance(this._pane.content);
        } else if (IoMapSidebar.s_tab == "ioMap2Outposts") {
            h = this.renderOutposts(this._pane.content);
        } else if (IoMapSidebar.s_tab == "ioMap2Portals") {
            h = this.renderPortals(this._pane.content);
        } else {
            h = this.renderBookmarks(this._pane.content);
        }
        this._pane.refresh(h);
        // (bug report #99: "Cannot read properties of null (reading 'setSelection')") giving the new box the cursor
        // takes it from the old one, whose FOCUS_OUT finishes its rename and draws the panel again, without a box:
        // _editField was null by the next line. Only a box that is still the panel's is selected.
        let edit: TextField = this._editField;
        if (edit && this.stage) {
            this.stage.focus = edit;
            if (edit === this._editField && edit.stage) {
                edit.setSelection(0, edit.text.length);
            }
        }
    }

    private heading(content: Sprite, text: string, y: int): int {
        let t: TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, true, (this._pane.innerWidth - 8) | 0);
        t.x = 6;
        t.y = y + 4;
        content.addChild(t);
        return 20;
    }

    private note(content: Sprite, text: string, y: int): int {
        let t: TextField = IoMapUi.label("", 10, IoMapUi.MUTED, false, (this._pane.innerWidth - 12) | 0);
        t.multiline = true;
        t.wordWrap = true;
        t.htmlText = text;
        t.height = t.textHeight + 6;
        t.x = 6;
        t.y = y + 4;
        content.addChild(t);
        return (t.height + 8) | 0;
    }

    // ---- bookmarks
    private renderBookmarks(content: Sprite): int {
        let y: int = 0;
        let i: int = 0;
        let count: int = MapRoom._bookmarks.length;
        let order: any[] = null;
        y += this.heading(content, KEYS.Get(count == 1 ? "io_tr_maps_bm_one" : "io_tr_maps_bm_n", { "v1": count }), y);
        if (GLOBAL.INFERNO_ONLY && count > 1) {
            // (QoL #76: the order, a button under the heading; a click: the next order)
            let sort: MovieClip = IoMapUi.button(KEYS.Get("io_map3_bm_sort_" + IoMapSidebar.BM_SORTS[IoMapSidebar.s_bmSort]), (this._pane.innerWidth - 12) | 0, 15, (e: MouseEvent): void => {
                IoMapSidebar.s_bmSort = ((IoMapSidebar.s_bmSort + 1) % IoMapSidebar.BM_SORTS.length) | 0;
                this._renaming = this._confirming = -1;
                this.render(true);
            }, "grey", 8);
            sort.name = "ioMap3BookmarkSort";
            sort.x = 6;
            sort.y = y;
            content.addChild(sort);
            y += 19;
        }
        // (no Home row, 10 October: the Home button does that)
        order = this.bookmarkOrder();
        while (i < count) {
            let index: int = order[i] | 0;
            y += this.bookmarkRow(content, y, index, String(MapRoom._bookmarks[index].name), MapRoom._bookmarks[index].location.x | 0, MapRoom._bookmarks[index].location.y | 0);
            i++;
        }
        if (count == 0) {
            y += this.note(content, KEYS.Get("io_tr_maps_bm_none"), y);
        }
        return (y + 2) | 0;
    }

    /**
     * (QoL #76) The bookmarks' indexes in the order the Sort button says: as saved, by name, by distance (the nearest
     * first), by level (the highest first) or by colour tag (then as saved).
     */
    private bookmarkOrder(): any[] {
        let order: any[] = [];
        let facts: any[] = [];
        let sort: string = as3.str(IoMapSidebar.BM_SORTS[IoMapSidebar.s_bmSort]);
        for (let i: int = 0; i < MapRoom._bookmarks.length; i++) {
            order.push(i);
            facts.push(sort == "distance" || sort == "level" ? IoMapSidebar.bookmarkFacts(MapRoom._bookmarks[i].location.x | 0, MapRoom._bookmarks[i].location.y | 0) : null);
        }
        if (!GLOBAL.INFERNO_ONLY || sort == "saved") {
            return order;
        }
        as3.sort(order, (a: int, b: int): int => {
            let d: number = 0;
            if (sort == "name") {
                let an: string = String(MapRoom._bookmarks[a].name).toLowerCase();
                let bn: string = String(MapRoom._bookmarks[b].name).toLowerCase();
                d = an < bn ? -1 : (an > bn ? 1 : 0);
            } else if (sort == "distance") {
                // (not known: last)
                let ad: int = facts[a].distance < 0 ? 99999 : facts[a].distance | 0;
                let bd: int = facts[b].distance < 0 ? 99999 : facts[b].distance | 0;
                d = ad - bd;
            } else if (sort == "level") {
                d = (facts[b].level | 0) - (facts[a].level | 0);
            } else {
                // (tagged first, by colour)
                let ac: int = MapRoom.ioBookmarkColour(a);
                let bc: int = MapRoom.ioBookmarkColour(b);
                d = (ac == 0 ? 99 : ac) - (bc == 0 ? 99 : bc);
            }
            if (d == 0) {
                d = a - b;
            }
            return (d < 0 ? -1 : (d > 0 ? 1 : 0)) | 0;
        });
        return order;
    }

    /**
     * (QoL #76) What is at a bookmarked place now, from the world snapshot: { status (a line of html, "" when not known),
     * level (-1: none), distance (from your nearest yard; -1: not known), reach (1 in your flinger range, 0 not, -1 not known) }.
     */
    public static bookmarkFacts(cellX: int, cellY: int): any {
        let out: any = { "status": "", "level": -1, "distance": IoMapTargets.distanceToNearest(cellX, cellY), "reach": -1 };
        let under: boolean = IoUnderworld.isUnder(cellX, cellY);
        let entry: any[] = null;
        let cell: any = null;
        let now: int = GLOBAL.Timestamp();
        let parts: any[] = [];
        if (!IoMapSnapshot.ready) {
            return out;
        }
        if (!under) {
            out.reach = IoMapFilters.inRange(cellX, cellY) ? 1 : 0;
        }
        entry = IoMapSnapshot.EntryAt(cellX, cellY);
        cell = under ? null : IoMapSnapshot.CellAt(cellX, cellY);
        if (entry && (entry[2] | 0) >= 2) {
            let uid: int = entry[3] | 0;
            let player: any = IoMapSnapshot.PlayerInfo(uid) || {};
            out.level = (player.level | 0) || (entry[11] | 0);
            parts.push(IoMapUi.escape(String(player.name || "?")) + " (" + out.level + ")" + (uid == LOGIN._playerID ? " · " + KEYS.Get("io_map3_bm_yours") : ""));
            if ((entry[9] | 0) > now) {
                parts.push("<font color=\"#23399D\">" + KEYS.Get("io_map3_bm_protected", { "v1": IoMapTargets.shortTime(((entry[9] | 0) - now) | 0) }) + "</font>");
            } else if ((cell ? cell.dm | 0 : entry[8] | 0) > 0) {
                parts.push("<font color=\"#B5251B\">" + KEYS.Get("io_map3_camp_damaged", { "v1": cell ? cell.dm | 0 : entry[8] | 0 }) + "</font>");
            }
        } else if (!under && cell && (cell.b | 0) == 1) {
            out.level = cell.l | 0;
            parts.push(IoMapUi.escape(TRIBES.DisplayName(String(cell.n || "")) + " " + (cell.l | 0)));
            if ((cell.d | 0) != 0) {
                parts.push("<font color=\"#B5251B\">" + KEYS.Get("io_map3_camp_ready") + "</font>");
            } else if ((cell.dm | 0) > 0) {
                parts.push("<font color=\"#B5251B\">" + KEYS.Get("io_map3_camp_damaged", { "v1": cell.dm | 0 }) + "</font>");
            }
        } else if (under) {
            // (the Depths: the snapshot only knows the players' outposts and the damaged tribe yards there)
            let state: int = IoMapSnapshot.CampState(entry);
            parts.push(state == 2 ? "<font color=\"#B5251B\">" + KEYS.Get("io_map3_camp_ready") + "</font>" : (state == 1 ? "<font color=\"#B5251B\">" + KEYS.Get("io_map3_camp_damaged", { "v1": entry[8] | 0 }) + "</font>" : KEYS.Get("io_tr_maps_depths")));
        } else if (cell) {
            parts.push(KEYS.Get((cell.i | 0) <= 99 ? "io_map3_bm_lava" : "io_map3_bm_open"));
        }
        out.status = parts.join(" · ");
        return out;
    }

    /**
     * A bookmark: its pin (a click on it: the next colour tag), its name and a dot when it is in your flinger range;
     * under it what is there and how far from your nearest yard (QoL #76); then where it is, with rename and remove (right).
     */
    private bookmarkRow(content: Sprite, y: int, index: int, name: string, cellX: int, cellY: int): int {
        let row: Sprite = null;
        let w: int = 0;
        let field: TextField = null;
        let draw: Function = null;
        let rowH: int = GLOBAL.INFERNO_ONLY ? IoMapSidebar.BM_ROW_H : IoMapSidebar.ROW_H;
        let lineY: int = GLOBAL.INFERNO_ONLY ? 30 : 17;
        let facts: any = GLOBAL.INFERNO_ONLY ? IoMapSidebar.bookmarkFacts(cellX, cellY) : null;
        row = new Sprite();
        row.name = "ioMap3Bookmark_" + index;
        w = this._pane.innerWidth;
        let title: TextField = IoMapUi.label(name, 10, IoMapUi.INK, true, (w - 30) | 0);
        let where: TextField = IoMapUi.label(IoMapUi.coord(cellX, cellY), 9, IoMapUi.MUTED, false, (w - 64) | 0);
        GLOBAL.ioFitText(where, 7);
        GLOBAL.ioFitText(title, 8);
        // (bug report A4: Flash's wider figures cut the Y off)
        let rename: Sprite = null;
        let remove: Sprite = null;
        field = null;
        let yes: MovieClip = null;
        let no: MovieClip = null;
        let tint: uint = index < 0 ? IoMapUi.relationColour(IoMapUi.YOU) : (GLOBAL.INFERNO_ONLY ? MapRoom.ioBookmarkTint(index) : IoMapUi.GOLD);
        draw = (over: boolean): void => {
            row.graphics.clear();
            row.graphics.beginFill(over ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w, rowH);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, rowH - 0.5);
            row.graphics.lineTo(w, rowH - 0.5);
            row.graphics.lineStyle();
            IoMapUi.pin(row.graphics, 10, 18, tint, 14, (index < 0 ? 0x1D3F6E : 0x5A3D12) >>> 0);
            // (QoL #76: in your flinger range, a green dot; out of it, a hollow one)
            if (facts && facts.reach >= 0) {
                row.graphics.lineStyle(1.2, (facts.reach > 0 ? 0x1B5E20 : 0x9A8A70) >>> 0, 1);
                row.graphics.beginFill((facts.reach > 0 ? 0x43A047 : IoMapUi.PAPER) >>> 0, 1);
                row.graphics.drawCircle(w - 7, 9, 3.5);
                row.graphics.endFill();
                row.graphics.lineStyle();
            }
        };
        row.y = y;
        draw(false);
        content.addChild(row);
        title.x = 20;
        title.y = 2;
        where.x = 20;
        where.y = lineY;
        if (facts) {
            // (QoL #76: what is there now)
            let status: TextField = IoMapUi.label("", 9, 5913888, false, (w - 22) | 0);
            let away: string = facts.distance >= 0 ? KEYS.Get(facts.distance == 0 ? "io_map3_bm_here" : "io_map3_bm_away", { "v1": facts.distance }) : "";
            status.htmlText = facts.status + (facts.status && away ? " · " : "") + away;
            GLOBAL.ioFitText(status, 7);
            status.name = "ioMap3BookmarkStatus_" + index;
            status.x = 20;
            status.y = 16;
            row.addChild(status);
            if (facts.reach >= 0) {
                let dot: Sprite = new Sprite();
                dot.name = facts.reach > 0 ? "ioMap3BookmarkInRange_" + index : "ioMap3BookmarkOutOfRange_" + index;
                dot.mouseEnabled = false;
                row.addChild(dot);
            }
        }
        if (index >= 0 && index == this._renaming) {
            // renaming: the name as a text box
            field = IoMapUi.input(10, IoMapUi.INK, (w - 24) | 0, 20);
            field.text = name;
            field.x = 19;
            field.y = 1;
            field.height = 16;
            field.border = true;
            field.borderColor = IoMapUi.EDGE;
            field.background = true;
            field.backgroundColor = 16776175;
            field.addEventListener(KeyboardEvent.KEY_DOWN, (e: KeyboardEvent): void => {
                if (e.keyCode == 13) {
                    this.finishRename(index, field.text);
                } else if (e.keyCode == 27) {
                    this._renaming = -1;
                    this.render(true);
                }
            });
            field.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
                if (this._renaming == index) {
                    this.finishRename(index, field.text);
                }
            });
            row.addChild(field);
            row.addChild(where);
            this._editField = field;
            return rowH;
        }
        row.addChild(title);
        if (index >= 0 && index == this._confirming) {
            where.text = KEYS.Get("io_tr_maps_remove");
            where.textColor = 9054740;
            row.addChild(where);
            yes = IoMapUi.button(KEYS.Get("io_tr_maps_yes"), 30, 15, (e: MouseEvent): void => {
                this._confirming = -1;
                MapRoom.ioRemoveBookmark(index);
                this.render(true);
                this._host.ioBookmarksChanged();
            }, "gold", 9);
            yes.x = w - 66;
            yes.y = lineY;
            row.addChild(yes);
            no = IoMapUi.button(KEYS.Get("io_tr_maps_no"), 30, 15, (e: MouseEvent): void => {
                this._confirming = -1;
                this.render(true);
            }, "grey", 9);
            no.x = w - 33;
            no.y = lineY;
            row.addChild(no);
            return rowH;
        }
        row.addChild(where);
        if (index >= 0 && GLOBAL.INFERNO_ONLY) {
            // (QoL #76: a click on the pin: the next colour tag)
            let pin: Sprite = new Sprite();
            pin.name = "ioMap3BookmarkColour_" + index;
            IoMapUi.hitArea(pin.graphics, 18, 22);
            pin.y = 2;
            pin.x = 1;
            pin.buttonMode = true;
            pin.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("click1");
                MapRoom.ioSetBookmarkColour(index, (MapRoom.ioBookmarkColour(index) + 1) | 0);
                this.render(true);
                this._host.ioBookmarksChanged();
            });
            row.addChild(pin);
        }
        if (index >= 0) {
            rename = new Sprite();
            IoMapUi.hitArea(rename.graphics, 18, 16);
            IoMapUi.pencil(rename.graphics, 4, 3, IoMapUi.MUTED);
            rename.buttonMode = true;
            rename.x = w - 42;
            rename.y = lineY - 1;
            rename.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("click1");
                this._renaming = index;
                this._confirming = -1;
                this.render(true);
            });
            row.addChild(rename);
            remove = new Sprite();
            IoMapUi.hitArea(remove.graphics, 18, 16);
            IoMapUi.cross(remove.graphics, 5, 4, 8, 9054740);
            remove.buttonMode = true;
            remove.x = w - 22;
            remove.y = lineY - 1;
            remove.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("click1");
                this._confirming = index;
                this._renaming = -1;
                this.render(true);
            });
            row.addChild(remove);
        }
        row.buttonMode = true;
        row.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        row.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            if (index < 0) {
                this._host.ioGoHome();
            } else {
                this.goTo(cellX, cellY);
            }
        });
        return rowH;
    }

    private finishRename(index: int, name: string): void {
        let error: string = MapRoom.ioRenameBookmark(index, name);
        if (error) {
            GLOBAL.Message(error);
            return;
        }
        this._renaming = -1;
        this.render(true);
        this._host.ioBookmarksChanged();
    }

    // ---- (QoL #327) your outposts
    /** Your outposts in the order they were taken (as the Outposts list's Next goes), each with its name and Go. */
    private renderOutposts(content: Sprite): int {
        let y: int = 0;
        let points: any[] = GLOBAL._mapOutpost || [];
        let ids: any[] = GLOBAL._mapOutpostIDs || [];
        let count: int = points.length | 0;
        // the names come with the Outposts list (asked for once while the map is open; kept a minute)
        if (!this._ioNamesAsked && count > 0) {
            this._ioNamesAsked = true;
            IoOutpostsPopup.ioFetch((list: any[]): void => {
                if (this._host && this.stage) {
                    this.render(false);
                }
            });
        }
        y += this.heading(content, KEYS.Get(count == 1 ? "io_op2_side_outposts_one" : "io_op2_side_outposts_n", { "v1": count }), y);
        // (a few hundred rows at most: the Outposts list, which reuses its rows, has every one)
        let shown: int = Math.min(count, IoMapSidebar.MAX_OUTPOST_ROWS) | 0;
        for (let i: int = 0; i < shown; i++) {
            let p: any = points[i];
            if (!p) {
                continue;
            }
            let id: string = ids.length == count && ids[i] != null ? String(ids[i]) : "";
            y += this.outpostRow(content, y, i, id, p.x | 0, p.y | 0);
        }
        if (count == 0) {
            y += this.note(content, KEYS.Get("io_op2_side_outposts_none"), y);
        } else if (shown < count) {
            y += this.note(content, KEYS.Get("io_op2_side_outposts_more", { "v1": shown }), y);
        }
        return (y + 2) | 0;
    }

    /** An outpost: its name (or "Outpost 3"), where it is under it, and Go; a click on the row goes there too. */
    private outpostRow(content: Sprite, y: int, index: int, baseid: string, cellX: int, cellY: int): int {
        let row: Sprite = null;
        let w: int = this._pane.innerWidth;
        let draw: Function = null;
        row = new Sprite();
        row.name = "ioMap2Outpost_" + (baseid || index);
        let name: string = baseid ? IoOutpostsPopup.ioNameOf(baseid) : "";
        let title: TextField = IoMapUi.label(name || KEYS.Get("io_op2_side_outpost_n", { "v1": index + 1 }), 10, (name ? IoMapUi.INK : 5913888) >>> 0, true, (w - 50) | 0);
        let where: TextField = IoMapUi.label(IoMapUi.coord(cellX, cellY), 9, IoMapUi.MUTED, false, (w - 50) | 0);
        GLOBAL.ioFitText(title, 8);
        GLOBAL.ioFitText(where, 7);
        let here: boolean = GLOBAL._currentCell && ((GLOBAL._currentCell as any).X | 0) == cellX && ((GLOBAL._currentCell as any).Y | 0) == cellY;
        draw = (over: boolean): void => {
            row.graphics.clear();
            row.graphics.beginFill(over || here ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w, IoMapSidebar.ROW_H);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, IoMapSidebar.ROW_H - 0.5);
            row.graphics.lineTo(w, IoMapSidebar.ROW_H - 0.5);
            row.graphics.lineStyle(1, 0, 1);
            row.graphics.beginFill(IoMapUi.relationColour(IoMapUi.YOU), 1);
            row.graphics.drawCircle(9, 11, 4);
            row.graphics.endFill();
            row.graphics.lineStyle();
        };
        row.y = y;
        draw(false);
        title.x = 16;
        title.y = 2;
        row.addChild(title);
        where.x = 16;
        where.y = 17;
        row.addChild(where);
        let go: MovieClip = IoMapUi.button(KEYS.Get("io_op2_go"), 28, 18, (e: MouseEvent): void => {
            this.goTo(cellX, cellY);
        }, "grey", 9);
        go.name = "ioMap2OutpostGo_" + (baseid || index);
        go.x = w - 31;
        go.y = ((IoMapSidebar.ROW_H - 18) / 2) | 0;
        row.addChild(go);
        row.buttonMode = true;
        row.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        row.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.goTo(cellX, cellY);
        });
        content.addChild(row);
        return IoMapSidebar.ROW_H;
    }

    // ---- (QoL #340) the Depths' portals
    /** Which portals are open to the player (from above, held from below), for the panel's key. */
    private static portalStates(): string {
        let out: string = "";
        for (let i: int = 0; i < IoUnderworld.portals.length; i++) {
            out += (IoUnderworld.entryOpen(i) ? "e" : "-") + (IoUnderworld.exitOpen(i) ? "x" : "-");
        }
        return out;
    }

    /** Every portal of the world: its two ends, each with Go, and whether it is open to you. */
    private renderPortals(content: Sprite): int {
        let y: int = 0;
        let count: int = IoUnderworld.portals.length | 0;
        y += this.heading(content, KEYS.Get(count == 1 ? "io_op2_side_portals_one" : "io_op2_side_portals_n", { "v1": count }), y);
        for (let i: int = 0; i < count; i++) {
            let p: any[] = as3.as(IoUnderworld.portals[i], Array);
            if (p && p.length >= 4) {
                y += this.portalRow(content, y, i, p);
            }
        }
        if (count == 0) {
            y += this.note(content, KEYS.Get("io_op2_side_portals_none"), y);
        } else {
            y += this.note(content, KEYS.Get("io_op2_side_portals_note"), y);
        }
        return (y + 2) | 0;
    }

    /** A portal: "Portal 3" and what it does for you, then its end up here and its end in the Depths, each with Go. */
    private portalRow(content: Sprite, y: int, index: int, p: any[]): int {
        let row: Sprite = new Sprite();
        let w: int = this._pane.innerWidth;
        let h: int = 52;
        row.name = "ioMap2Portal_" + (index + 1);
        row.y = y;
        row.graphics.beginFill(IoMapUi.PAPER, 1);
        row.graphics.drawRect(0, 0, w, h);
        row.graphics.endFill();
        row.graphics.lineStyle(1, IoMapUi.RULE, 1);
        row.graphics.moveTo(0, h - 0.5);
        row.graphics.lineTo(w, h - 0.5);
        row.graphics.lineStyle(1.2, IoMapLod.PORTAL_RING, 1);
        row.graphics.beginFill(IoMapLod.PORTAL_COLOUR, 1);
        row.graphics.drawCircle(9, 10, 4);
        row.graphics.endFill();
        row.graphics.lineStyle();
        let open: boolean = IoUnderworld.entryOpen(index);
        let held: boolean = IoUnderworld.exitOpen(index);
        let title: TextField = IoMapUi.label("", 10, IoMapUi.INK, true, (w - 18) | 0);
        title.htmlText = KEYS.Get("io_op2_portal_n", { "v1": index + 1 }) + (open || held ? " <font color=\"#2E7D32\">" + KEYS.Get(held ? "io_op2_portal_held" : "io_op2_portal_open") + "</font>" : "");
        title.x = 16;
        title.y = 2;
        row.addChild(title);
        let upX: int = p[0] | 0;
        let upY: int = p[1] | 0;
        let downX: int = p[2] | 0;
        let downY: int = p[3] | 0;
        h = 18;
        h += this.portalEnd(row, h, w, KEYS.Get("io_op2_portal_up", { "v1": GLOBAL.ioCoord(upX) + ", " + GLOBAL.ioCoord(upY) }), upX, upY, "ioMap2PortalUp_" + (index + 1));
        h += this.portalEnd(row, h, w, KEYS.Get("io_op2_portal_down", { "v1": IoMapUi.location(downX, downY) }), downX, downY, "ioMap2PortalDown_" + (index + 1));
        content.addChild(row);
        return 52;
    }

    /** One end of a portal in its row: where, and Go. Returns its height. */
    private portalEnd(row: Sprite, y: int, w: int, text: string, cellX: int, cellY: int, name: string): int {
        let where: TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, false, (w - 50) | 0);
        GLOBAL.ioFitText(where, 7);
        where.x = 16;
        where.y = y + 1;
        row.addChild(where);
        let go: MovieClip = IoMapUi.button(KEYS.Get("io_op2_go"), 28, 15, (e: MouseEvent): void => {
            this.goTo(cellX, cellY);
        }, "grey", 9);
        go.name = name;
        go.x = w - 31;
        go.y = y;
        row.addChild(go);
        return 16;
    }

    // ---- alliance
    private renderAlliance(content: Sprite): int {
        let leader: int = 0;
        let y: int = 0;
        let id: int = ALLIANCES._allianceID;
        let info: any = id > 0 ? IoMapSnapshot.AllianceInfo(id) : null;
        let members: any[] = [];
        let uid: string = null;
        let player: any = null;
        let title: TextField = null;
        leader = info ? info.leader | 0 : 0;
        if (id <= 0) {
            y += this.note(content, KEYS.Get("io_tr_maps_no_ally"), y);
            return y;
        }
        if (!IoMapSnapshot.ready) {
            return this.note(content, KEYS.Get("msg_loading"), y);
        }
        for (uid in IoMapSnapshot.players) {
            player = IoMapSnapshot.players[uid];
            if ((player.alliance | 0) == id) {
                members.push({ "uid": Number(uid) | 0, "player": player });
            }
        }
        as3.sort(members, (a: any, b: any): int => {
            let ar: int = a.uid == LOGIN._playerID ? 0 : (a.uid == leader ? 1 : 2);
            let br: int = b.uid == LOGIN._playerID ? 0 : (b.uid == leader ? 1 : 2);
            if (ar != br) {
                return (ar - br) | 0;
            }
            if ((a.player.level | 0) != (b.player.level | 0)) {
                return ((b.player.level | 0) - (a.player.level | 0)) | 0;
            }
            return String(a.player.name).toLowerCase() < String(b.player.name).toLowerCase() ? -1 : 1;
        });
        title = IoMapUi.label(info ? String(info.name) : KEYS.Get("io_tr_maps_your_alliance"), 12, IoMapUi.INK, true, (this._pane.innerWidth - 12) | 0);
        title.x = 6;
        title.y = y + 4;
        content.addChild(title);
        y += 22;
        y = (y + (this.heading(content, KEYS.Get("io_tr_maps_members", { "v1": members.length }), (y - 4) | 0) - 2)) | 0;
        for (let member of as3.values(members)) {
            y += this.memberRow(content, y, member.uid | 0, member.player, (member.uid | 0) == leader);
        }
        return (y + 2) | 0;
    }

    /** A member: name (level), where their main yard is, and Go (in the middle of the row's height). */
    private memberRow(content: Sprite, y: int, uid: int, player: any, leader: boolean): int {
        let yards: any = null;
        let row: Sprite = new Sprite();
        let w: int = this._pane.innerWidth;
        yards = IoMapSnapshot.YardsOf(uid);
        let name: TextField = IoMapUi.label("", 10, IoMapUi.INK, true, (w - 50) | 0);
        let where: TextField = IoMapUi.label("", 9, IoMapUi.MUTED, false, (w - 50) | 0);
        let go: MovieClip = null;
        let h: int = 34;
        row.y = y;
        row.graphics.beginFill(uid == LOGIN._playerID ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
        row.graphics.drawRect(0, 0, w, h);
        row.graphics.endFill();
        row.graphics.lineStyle(1, IoMapUi.RULE, 1);
        row.graphics.moveTo(0, h - 0.5);
        row.graphics.lineTo(w, h - 0.5);
        row.graphics.lineStyle(1, 0, 1);
        row.graphics.beginFill(IoMapUi.relationColour(uid == LOGIN._playerID ? IoMapUi.YOU : IoMapUi.ALLY), 1);
        row.graphics.drawCircle(9, 11, 4);
        row.graphics.endFill();
        row.graphics.lineStyle();
        name.htmlText = IoMapUi.escape(String(player.name)) + "<font color=\"#6B4A26\"> (" + (player.level | 0 || 1) + ")" + (leader ? " · " + KEYS.Get("io_tr_maps_leader") : "") + "</font>";
        name.x = 16;
        name.y = 2;
        row.addChild(name);
        where.text = yards && yards.main ? IoMapUi.coord(yards.main[0] | 0, yards.main[1] | 0) : KEYS.Get("io_tr_maps_no_main");
        where.x = 16;
        where.y = 17;
        row.addChild(where);
        if (yards && yards.main) {
            go = IoMapUi.button(KEYS.Get("io_tr_maps_go"), 28, 18, (e: MouseEvent): void => {
                this.goTo(yards.main[0] | 0, yards.main[1] | 0);
            }, "grey", 9);
            go.x = w - 31;
            go.y = ((h - 18) / 2) | 0;
            row.addChild(go);
        }
        content.addChild(row);
        return h;
    }

    public Cleanup(): void {
        this.hideResults();
        this._search.removeEventListener(Event.CHANGE, as3.bind(this, this.onSearchChange));
        this._search.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onSearchKey));
        this._search.removeEventListener(FocusEvent.FOCUS_IN, as3.bind(this, this.onSearchFocus));
        if (this.stage && (this.stage.focus == this._search || this.stage.focus == this._editField)) {
            this.stage.focus = null;
        }
        this._host = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
