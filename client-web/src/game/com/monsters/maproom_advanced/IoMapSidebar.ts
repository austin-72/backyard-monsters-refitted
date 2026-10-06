import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { Event, FocusEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { TextField, TextFormatAlign } from "flash/text";
import { ALLIANCES, GLOBAL, IoMapSnapshot, IoMapUi, IoQuests, IoScrollPane, LOGIN, MapRoomPopup, SOUNDS, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

/**
 * Inferno-only: the map room's sidebar, under the resources and Home / Jump.
 *
 *  - Find a player: type part of a name; every player with a yard on the world who matches (a dot in
 *    the colour of how you stand with them), with their alliance, main yard and outposts. Go goes to
 *    their main yard; clicking a player lists their outposts, each with Go.
 *  - Bookmarks: no limit, in a list that scrolls. Home first. Each is a name, and under it where it is
 *    with rename and remove. Click one to go there. They are added from the places on the map (a yard's
 *    popup, an empty place's bubble).
 *  - Alliance: your alliance's members on this world, with Go to each one's main yard.
 *
 * Players, alliances and yards come from the world snapshot (IoMapSnapshot).
 */
export class IoMapSidebar extends Sprite {
    static {
        as3.fields(this, { _host: null, _w: 0, _h: 0, _searchBox: null, _search: null, _placeholder: null, _clear: null, _results: null, _resultsPane: null, _query: "", _expanded: 0, _resultsKey: null, _tabBar: null, _tabs: null, _panel: null, _pane: null, _drawnKey: null, _renaming: -1, _confirming: -1, _editField: null });
    }

    private static readonly SEARCH_H: int = 24;

    private static readonly TAB_H: int = 20;

    private static readonly ROW_H: int = 34;

    private static readonly RESULTS_W: int = 280;

    private static readonly RESULTS_MAX_H: int = 300;

    /** The tab showing (for the session). */
    private static s_tab: string = "bookmarks";
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
        this._panel.y = this._tabBar.y + IoMapSidebar.TAB_H;
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
        this._placeholder = IoMapUi.label("Find a player", 11, 10123862, false, (this._w - 44) | 0);
        this._placeholder.x = 24;
        this._placeholder.y = 3;
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
            header = IoMapUi.label("Loading the players on this world...", 11, IoMapUi.MUTED, false, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.x = 10;
            header.y = 9;
            this._results.addChild(header);
            return;
        }
        if (list.length == 0) {
            h = 54;
            IoMapUi.roundBox(g, 0, 0, IoMapSidebar.RESULTS_W, h, 16182225, 1, IoMapUi.EDGE, 8, 1.5);
            header = IoMapUi.label("NOTHING FOUND", 10, IoMapUi.MUTED, true, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.x = 10;
            header.y = 7;
            this._results.addChild(header);
            header = IoMapUi.label("", 11, IoMapUi.INK, false, (IoMapSidebar.RESULTS_W - 20) | 0);
            header.text = "No player called “" + this._query + "” on this world.";
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
        header = IoMapUi.label(list.length + (list.length == 1 ? " PLAYER" : " PLAYERS") + (list.length >= 60 ? " (FIRST 60)" : "") + " ON THIS WORLD", 9, IoMapUi.MUTED, true, (IoMapSidebar.RESULTS_W - 20) | 0);
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
        line2.text = (alliance ? String(alliance.name) : "No alliance") + " · " + (yards && yards.main ? IoMapUi.coord(yards.main[0] | 0, yards.main[1] | 0) : "no main yard") + " · " + outposts + (outposts == 1 ? " outpost" : " outposts");
        line2.x = 24;
        line2.y = 21;
        row.addChild(line2);
        if (yards && (yards.main || outposts > 0)) {
            go = IoMapUi.button("Go", 34, 22, (e: MouseEvent): void => {
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
                h += this.yardRow(content, (y + h) | 0, width, "Main yard", yards.main[0] | 0, yards.main[1] | 0);
            }
            for (i = 0; i < yards.outposts.length; i++) {
                h += this.yardRow(content, (y + h) | 0, width, "Outpost", yards.outposts[i][0] | 0, yards.outposts[i][1] | 0);
            }
        }
        return h;
    }

    private yardRow(content: Sprite, y: int, width: int, kind: string, cellX: int, cellY: int): int {
        let row: Sprite = new Sprite();
        let text: TextField = IoMapUi.label("", 11, IoMapUi.INK, false, (width - 80) | 0);
        let go: MovieClip = IoMapUi.button("Go", 34, 18, (e: MouseEvent): void => {
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
        let names: any[] = ["bookmarks", "alliance"];
        let titles: any[] = ["Bookmarks", "Alliance"];
        let gap: int = 3;
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
            tab.addChild(text);
            tab.x = Math.round(i * (w + gap));
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
            (as3.as(tab.getChildAt(0), TextField)).textColor = (on ? IoMapUi.INK : 0x4A2F16) >>> 0;
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
            for (let bookmark of as3.values(MapRoom._bookmarks)) {
                key += bookmark.name + "@" + bookmark.location.x + "," + bookmark.location.y + ";";
            }
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
        this._drawnKey = key;
        this._editField = null;
        while (this._pane.content.numChildren > 0) {
            this._pane.content.removeChildAt(0);
        }
        this._pane.content.graphics.clear();
        if (IoMapSidebar.s_tab == "alliance") {
            h = this.renderAlliance(this._pane.content);
        } else {
            h = this.renderBookmarks(this._pane.content);
        }
        this._pane.refresh(h);
        if (this._editField && this.stage) {
            this.stage.focus = this._editField;
            this._editField.setSelection(0, this._editField.text.length);
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
        let home: any = GLOBAL._mapHome;
        let count: int = MapRoom._bookmarks.length;
        y += this.heading(content, count + (count == 1 ? " BOOKMARK" : " BOOKMARKS"), y);
        if (home) {
            y += this.bookmarkRow(content, y, -1, "Home", home.x | 0, home.y | 0);
        }
        while (i < count) {
            y += this.bookmarkRow(content, y, i, String(MapRoom._bookmarks[i].name), MapRoom._bookmarks[i].location.x | 0, MapRoom._bookmarks[i].location.y | 0);
            i++;
        }
        if (count == 0) {
            y += this.note(content, "No bookmarks yet. Click a place on the map and choose <b>Bookmark</b>.", y);
        }
        return (y + 2) | 0;
    }

    /** A bookmark: its name, and under it where it is (left) with rename and remove (right). */
    private bookmarkRow(content: Sprite, y: int, index: int, name: string, cellX: int, cellY: int): int {
        let row: Sprite = null;
        let w: int = 0;
        let field: TextField = null;
        let draw: Function = null;
        row = new Sprite();
        w = this._pane.innerWidth;
        let title: TextField = IoMapUi.label(name, 10, IoMapUi.INK, true, (w - 24) | 0);
        let where: TextField = IoMapUi.label(IoMapUi.coord(cellX, cellY), 9, IoMapUi.MUTED, false, (w - 64) | 0);
        GLOBAL.ioFitText(where, 7);
        // (bug report A4: Flash's wider figures cut the Y off)
        let rename: Sprite = null;
        let remove: Sprite = null;
        field = null;
        let yes: MovieClip = null;
        let no: MovieClip = null;
        draw = (over: boolean): void => {
            row.graphics.clear();
            row.graphics.beginFill(over ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w, IoMapSidebar.ROW_H);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, IoMapSidebar.ROW_H - 0.5);
            row.graphics.lineTo(w, IoMapSidebar.ROW_H - 0.5);
            row.graphics.lineStyle();
            IoMapUi.pin(row.graphics, 10, 18, index < 0 ? IoMapUi.relationColour(IoMapUi.YOU) : IoMapUi.GOLD, 14, (index < 0 ? 0x1D3F6E : 0x5A3D12) >>> 0);
        };
        row.y = y;
        draw(false);
        content.addChild(row);
        title.x = 20;
        title.y = 2;
        where.x = 20;
        where.y = 17;
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
            return IoMapSidebar.ROW_H;
        }
        row.addChild(title);
        if (index >= 0 && index == this._confirming) {
            where.text = "Remove?";
            where.textColor = 9054740;
            row.addChild(where);
            yes = IoMapUi.button("Yes", 30, 15, (e: MouseEvent): void => {
                this._confirming = -1;
                MapRoom.ioRemoveBookmark(index);
                this.render(true);
                this._host.ioBookmarksChanged();
            }, "gold", 9);
            yes.x = w - 66;
            yes.y = 17;
            row.addChild(yes);
            no = IoMapUi.button("No", 30, 15, (e: MouseEvent): void => {
                this._confirming = -1;
                this.render(true);
            }, "grey", 9);
            no.x = w - 33;
            no.y = 17;
            row.addChild(no);
            return IoMapSidebar.ROW_H;
        }
        row.addChild(where);
        if (index >= 0) {
            rename = new Sprite();
            IoMapUi.hitArea(rename.graphics, 18, 16);
            IoMapUi.pencil(rename.graphics, 4, 3, IoMapUi.MUTED);
            rename.buttonMode = true;
            rename.x = w - 42;
            rename.y = 16;
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
            remove.y = 16;
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
        return IoMapSidebar.ROW_H;
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
            y += this.note(content, "<b>You are not in an alliance.</b><br>Join one from the Alliances window to see its members here.", y);
            return y;
        }
        if (!IoMapSnapshot.ready) {
            return this.note(content, "Loading...", y);
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
        title = IoMapUi.label(info ? String(info.name) : "Your alliance", 12, IoMapUi.INK, true, (this._pane.innerWidth - 12) | 0);
        title.x = 6;
        title.y = y + 4;
        content.addChild(title);
        y += 22;
        y = (y + (this.heading(content, members.length + " ON THIS WORLD", (y - 4) | 0) - 2)) | 0;
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
        name.htmlText = IoMapUi.escape(String(player.name)) + "<font color=\"#6B4A26\"> (" + (player.level | 0 || 1) + ")" + (leader ? " · leader" : "") + "</font>";
        name.x = 16;
        name.y = 2;
        row.addChild(name);
        where.text = yards && yards.main ? IoMapUi.coord(yards.main[0] | 0, yards.main[1] | 0) : "no main yard";
        where.x = 16;
        where.y = 17;
        row.addChild(where);
        if (yards && yards.main) {
            go = IoMapUi.button("Go", 28, 18, (e: MouseEvent): void => {
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
