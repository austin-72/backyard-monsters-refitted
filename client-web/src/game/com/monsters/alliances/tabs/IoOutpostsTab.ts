import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { ALLIANCES, AllianceConstants, AllianceTabBase, IoAllianceUi, IoScrollPane, KEYS } from "@game";

/**
 * Inferno-only: the Outposts tab (the user's design of 2 October): every outpost the alliance's members
 * took or lost in the last 90 days, newest first, from players and from tribes (raids that don't take
 * the outpost are not kept). Filters: gained / lost, players / tribes, a member, a world. Gained, lost and
 * net over 7 and 30 days at the top. Jump opens the map there (on the player's own world); more rows come
 * as the list is scrolled down.
 */
export class IoOutpostsTab extends AllianceTabBase {
    static {
        as3.fields(this, { _pane: null, _events: null, _more: false, _loading: false, _members: null, _worlds: null, _worldNames: null, _myWorld: "", _summary: null, _filterBar: null, _picker: null, _generation: 0 });
    }

    private static readonly PAD: int = 12;

    private static readonly FILTER_Y: int = 66;

    private static readonly HEAD_Y: int = 102;

    private static readonly LIST_Y: int = (IoOutpostsTab.HEAD_Y + 24) | 0;

    private static readonly ROW_H: int = 30;

    // the columns: when, gained / lost, member, from / to whom, where, jump
    private static readonly COLS: any[] = [[0, 66], [66, 70], [136, 138], [274, 300], [574, 128], [702, 74]];

    private static _filters: any = { "kind": "", "source": "", "member": "", "world": "" };
    private _pane: IoScrollPane;
    private _events: any[];
    private _more: boolean;
    private _loading: boolean;
    private _members: any[];
    private _worlds: any[];
    private _worldNames: any;
    private _myWorld: string;
    private _summary: Sprite;
    private _filterBar: Sprite;
    private _picker: Sprite;
    /** Bumped by every new filter: pages asked for under the old ones are dropped. */
    private _generation: int;

    public $ctor(): void {
        this._events = [];
        this._members = [];
        this._worlds = [];
        this._worldNames = {};
        super.$ctor();
    }

    public override build(): void {
        this._summary = new Sprite();
        this._summary.x = IoOutpostsTab.PAD;
        this._summary.y = 10;
        this.addChild(this._summary);
        this._filterBar = new Sprite();
        this._filterBar.x = IoOutpostsTab.PAD;
        this._filterBar.y = IoOutpostsTab.FILTER_Y;
        this.addChild(this._filterBar);
        this._buildHead();
        this._pane = new IoScrollPane((this.CONTENT_W - IoOutpostsTab.PAD * 2) | 0, (this.CONTENT_H - IoOutpostsTab.LIST_Y - IoOutpostsTab.PAD) | 0);
        this._pane.x = IoOutpostsTab.PAD;
        this._pane.y = IoOutpostsTab.LIST_Y;
        this._pane.onScroll = as3.bind(this, this._onScroll);
        this.addChild(this._pane);
        this.addEventListener(Event.REMOVED_FROM_STAGE, (e: Event): void => {
            this._closePicker();
        });
        this._drawFilters();
        this._reload();
    }

    private _reload(): void {
        this._generation++;
        this._events = [];
        this._more = false;
        this._loading = false;
        this._drawRows();
        this._fetch();
    }

    private _fetch(): void {
        let gen: int = 0;
        if (this._loading) {
            return;
        }
        this._loading = true;
        gen = this._generation;
        let before: int = this._events.length > 0 ? this._events[this._events.length - 1].id | 0 : 0;
        ALLIANCES.ioLoadOutposts(IoOutpostsTab._filters, before, (response: any): void => {
            if (this.stage == null || gen != this._generation) {
                return;
            }
            this._loading = false;
            if (response == null || response.error) {
                this._more = false;
                this._drawRows(response && response.error ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }
            let from: int = this._events.length;
            this._events = this._events.concat(as3.as(response.events, Array) || []);
            this._more = response.more == true;
            this._myWorld = response.my_world ? String(response.my_world) : "";
            this._members = as3.as(response.members, Array) || [];
            this._worlds = as3.as(response.worlds, Array) || [];
            this._worldNames = {};
            for (let w of as3.values(this._worlds)) {
                this._worldNames[String(w.id)] = String(w.name);
            }
            if (from == 0) {
                this._drawSummary(response.summary);
                this._drawFilters();
                this._drawRows();
            } else {
                this._appendRows(from);
            }
            this._onScroll(this._pane);
        });
    }

    private _onScroll(pane: IoScrollPane): void {
        if (this._more && !this._loading && pane.remaining < IoOutpostsTab.ROW_H * 4) {
            this._fetch();
        }
    }

    // ---- gained, lost and net over 7 and 30 days
    private _drawSummary(summary: any): void {
        while (this._summary.numChildren > 0) {
            this._summary.removeChildAt(0);
        }
        if (summary == null) {
            return;
        }
        let x: int = 0;
        for (let period of as3.values([["io_alliance_last7", summary.d7], ["io_alliance_last30", summary.d30]])) {
            let s: any = period[1] || { "gained": 0, "lost": 0, "net": 0 };
            let box: Sprite = new Sprite();
            box.x = x;
            IoAllianceUi.card(box.graphics, 0, 0, 300, 46, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(box, KEYS.Get(String(period[0])), 10, 14, 12, AllianceConstants.IO_INK, true, 96);
            let figures: any[] = [[KEYS.Get("io_alliance_gained"), "+" + (s.gained | 0), AllianceConstants.IO_GAINED], [KEYS.Get("io_alliance_lost"), ((s.lost | 0) > 0 ? "-" : "") + (s.lost | 0), AllianceConstants.IO_LOST], [KEYS.Get("io_alliance_net"), IoAllianceUi.signed(s.net | 0), (s.net | 0) > 0 ? AllianceConstants.IO_GAINED : ((s.net | 0) < 0 ? AllianceConstants.IO_LOST : AllianceConstants.IO_INK)]];
            for (let i: int = 0; i < figures.length; i++) {
                IoAllianceUi.addText(box, String(figures[i][0]), (106 + i * 64) | 0, 4, 10, AllianceConstants.IO_MUTED, false, 60, IoAllianceUi.CENTER);
                IoAllianceUi.addText(box, String(figures[i][1]), (106 + i * 64) | 0, 18, 15, figures[i][2] >>> 0, true, 60, IoAllianceUi.CENTER);
            }
            this._summary.addChild(box);
            x += 312;
        }
        IoAllianceUi.addText(this._summary, KEYS.Get("io_alliance_kept_days", { "v1": "90" }), x, 15, 11, AllianceConstants.IO_MUTED, false, (this.CONTENT_W - IoOutpostsTab.PAD * 2 - x) | 0, IoAllianceUi.RIGHT);
    }

    // ---- the filters
    private _drawFilters(): void {
        while (this._filterBar.numChildren > 0) {
            this._filterBar.removeChildAt(0);
        }
        let x: int = 0;
        x = this._segment(x, "kind", [["", "io_alliance_f_all"], ["gained", "io_alliance_gained"], ["lost", "io_alliance_lost"]], 64);
        x += 14;
        x = this._segment(x, "source", [["", "io_alliance_f_both"], ["player", "io_alliance_f_players"], ["tribe", "io_alliance_f_tribes"]], 72);
        x += 14;
        let memberName: string = KEYS.Get("io_alliance_f_all_members");
        for (let m of as3.values(this._members)) {
            if (String(m.id) == IoOutpostsTab._filters.member) {
                memberName = String(m.name);
            }
        }
        let member: MovieClip = IoAllianceUi.button(memberName + "  v", 156, 26, (e: MouseEvent): void => {
            let options: any[] = [["", KEYS.Get("io_alliance_f_all_members")]];
            for (let mm of as3.values(this._members)) {
                options.push([String(mm.id), String(mm.name)]);
            }
            this._openPicker(as3.as(e.currentTarget, DisplayObject), "member", options);
        }, IoOutpostsTab._filters.member ? "gold" : "grey", 11);
        member.x = x;
        member.name = "ioFilterMember";
        this._filterBar.addChild(member);
        x = (x + (156 + 10)) | 0;
        let worldName: string = as3.str(IoOutpostsTab._filters.world ? (this._worldNames[IoOutpostsTab._filters.world] || "?") : KEYS.Get("io_alliance_f_all_worlds"));
        let world: MovieClip = IoAllianceUi.button(worldName + "  v", 146, 26, (e: MouseEvent): void => {
            let options: any[] = [["", KEYS.Get("io_alliance_f_all_worlds")]];
            for (let ww of as3.values(this._worlds)) {
                options.push([String(ww.id), String(ww.name)]);
            }
            this._openPicker(as3.as(e.currentTarget, DisplayObject), "world", options);
        }, IoOutpostsTab._filters.world ? "gold" : "grey", 11);
        world.x = x;
        world.name = "ioFilterWorld";
        this._filterBar.addChild(world);
    }

    /** Buttons side by side, the chosen one gold. Returns where the next thing goes. */
    private _segment(x: int, key: string, options: any[], w: int): int {
        for (let o of as3.values(options)) {
            let value: string = String(o[0]);
            let b: MovieClip = IoAllianceUi.button(KEYS.Get(String(o[1])), w, 26, this._setter(key, value), IoOutpostsTab._filters[key] == value ? "gold" : "grey", 11);
            b.x = x;
            b.name = "ioFilter_" + key + "_" + (value || "all");
            this._filterBar.addChild(b);
            x = (x + (w + 2)) | 0;
        }
        return x;
    }

    private _setter(key: string, value: string): Function {
        return (e: MouseEvent = null): void => {
            this._closePicker();
            if (IoOutpostsTab._filters[key] == value) {
                return;
            }
            IoOutpostsTab._filters[key] = value;
            this._drawFilters();
            this._reload();
        };
    }

    /** A list to choose from, under its button (members, worlds). */
    private _openPicker(anchor: DisplayObject, key: string, options: any[]): void {
        this._closePicker();
        const w: int = 200;
        const rowH: int = 24;
        let h: int = Math.min(options.length * rowH, 220) | 0;
        let p: Sprite = new Sprite();
        p.name = "ioPicker";
        IoAllianceUi.card(p.graphics, -4, -4, w + 8, h + 8, 16777215, AllianceConstants.BORDER_COLOR);
        let pane: IoScrollPane = new IoScrollPane(w, h);
        p.addChild(pane);
        for (let i: int = 0; i < options.length; i++) {
            let row: Sprite = new Sprite();
            row.y = i * rowH;
            row.buttonMode = true;
            row.mouseChildren = false;
            row.name = "ioPick" + i;
            let chosen: boolean = IoOutpostsTab._filters[key] == String(options[i][0]);
            row.graphics.beginFill((chosen ? AllianceConstants.ROW_ME : (i % 2 == 0 ? AllianceConstants.ROW_ALT0 : 0xFFFFFF)) >>> 0, 1);
            row.graphics.drawRect(0, 0, pane.innerWidth, rowH);
            row.graphics.endFill();
            IoAllianceUi.addText(row, String(options[i][1]), 8, 3, 12, AllianceConstants.IO_INK, chosen, (pane.innerWidth - 12) | 0);
            row.addEventListener(MouseEvent.CLICK, this._setter(key, String(options[i][0])));
            pane.content.addChild(row);
        }
        pane.refresh(options.length * rowH);
        let at: Point = this.globalToLocal(anchor.localToGlobal(new Point(0, anchor.height + 4)));
        p.x = Math.min(at.x | 0, this.CONTENT_W - w - 8);
        p.y = at.y | 0;
        this.addChild(p);
        this._picker = p;
        p.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        if (this.stage) {
            this.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageDown));
        }
    }

    private _onStageDown(e: MouseEvent): void {
        if (this._picker && e.target instanceof DisplayObject && this._picker.contains(as3.cast(e.target, DisplayObject))) {
            return;
        }
        this._closePicker();
    }

    private _closePicker(): void {
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageDown));
        }
        if (this._picker && this._picker.parent) {
            this._picker.parent.removeChild(this._picker);
        }
        this._picker = null;
    }

    // ---- the list
    private _buildHead(): void {
        let head: Sprite = new Sprite();
        head.x = IoOutpostsTab.PAD;
        head.y = IoOutpostsTab.HEAD_Y;
        let w: int = (this.CONTENT_W - IoOutpostsTab.PAD * 2 - IoScrollPane.BAR_W - 2) | 0;
        head.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        head.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
        head.graphics.drawRect(0, 0, w, 24);
        head.graphics.endFill();
        let labels: any[] = ["io_alliance_col_when", "io_alliance_col_event", "io_alliance_col_member", "io_alliance_col_other", "io_alliance_col_where", "io_alliance_col_jump"];
        for (let i: int = 0; i < labels.length; i++) {
            IoAllianceUi.addText(head, KEYS.Get(String(labels[i])), ((IoOutpostsTab.COLS[i][0] | 0) + 6) | 0, 3, 11, 0, true, ((IoOutpostsTab.COLS[i][1] | 0) - 8) | 0, i == 5 ? IoAllianceUi.CENTER : "left");
        }
        this.addChild(head);
    }

    private _drawRows(error: string = null): void {
        let c: Sprite = this._pane.content;
        while (c.numChildren > 0) {
            c.removeChildAt(0);
        }
        let w: int = this._pane.innerWidth;
        if (error || this._events.length == 0) {
            let msg: string = error ? error : (this._loading ? KEYS.Get("msg_loading") : KEYS.Get("io_alliance_no_outposts"));
            IoAllianceUi.addText(c, msg, 10, 12, 12, AllianceConstants.IO_MUTED, false, (w - 20) | 0, "left", false, true);
            this._pane.refresh(50);
            return;
        }
        for (let i: int = 0; i < this._events.length; i++) {
            c.addChild(this._row(this._events[i], i, w));
        }
        this._pane.refresh(this._moreRow(c, w));
    }

    /** The next page: its rows go under the ones shown (nothing drawn again). */
    private _appendRows(from: int): void {
        let c: Sprite = this._pane.content;
        let loading: DisplayObject = c.getChildByName("ioMore");
        if (loading) {
            c.removeChild(loading);
        }
        let w: int = this._pane.innerWidth;
        for (let i: int = from; i < this._events.length; i++) {
            c.addChild(this._row(this._events[i], i, w));
        }
        this._pane.refresh(this._moreRow(c, w));
    }

    /** "Loading..." under the rows while there are more; returns the list's height. */
    private _moreRow(c: Sprite, w: int): int {
        let h: int = (this._events.length * IoOutpostsTab.ROW_H) | 0;
        if (this._more) {
            let t: DisplayObject = IoAllianceUi.addText(c, KEYS.Get("msg_loading"), 10, (h + 6) | 0, 11, AllianceConstants.IO_MUTED, false, (w - 20) | 0, IoAllianceUi.CENTER);
            t.name = "ioMore";
            h += 30;
        }
        return h;
    }

    private _row(ev: any, i: int, w: int): Sprite {
        let world: string = null;
        let px: int = 0;
        let py: int = 0;
        let r: Sprite = new Sprite();
        r.y = i * IoOutpostsTab.ROW_H;
        r.name = "ioEvent" + (ev.id | 0);
        r.graphics.beginFill(i % 2 == 0 ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1, 1);
        r.graphics.drawRect(0, 0, w, IoOutpostsTab.ROW_H);
        r.graphics.endFill();
        r.graphics.lineStyle(1, 14205862, 1);
        r.graphics.moveTo(0, IoOutpostsTab.ROW_H - 0.5);
        r.graphics.lineTo(w, IoOutpostsTab.ROW_H - 0.5);
        let ty: int = ((IoOutpostsTab.ROW_H - 18) / 2) | 0;
        let gained: boolean = String(ev.kind) == "gained";
        IoAllianceUi.addText(r, IoAllianceUi.ago(Number(ev.ts)), ((IoOutpostsTab.COLS[0][0] | 0) + 6) | 0, ty, 11, AllianceConstants.IO_MUTED, false, ((IoOutpostsTab.COLS[0][1] | 0) - 8) | 0);
        IoAllianceUi.addText(r, KEYS.Get(gained ? "io_alliance_gained" : "io_alliance_lost"), ((IoOutpostsTab.COLS[1][0] | 0) + 6) | 0, ty, 11, gained ? AllianceConstants.IO_GAINED : AllianceConstants.IO_LOST, true, ((IoOutpostsTab.COLS[1][1] | 0) - 8) | 0);
        IoAllianceUi.addText(r, String(ev.user_name), ((IoOutpostsTab.COLS[2][0] | 0) + 6) | 0, ty, 11, AllianceConstants.IO_INK, true, ((IoOutpostsTab.COLS[2][1] | 0) - 8) | 0);
        IoAllianceUi.addText(r, this._other(ev), ((IoOutpostsTab.COLS[3][0] | 0) + 6) | 0, ty, 11, AllianceConstants.IO_INK, false, ((IoOutpostsTab.COLS[3][1] | 0) - 8) | 0, "left", true);
        let place: string = IoAllianceUi.coord(ev.x | 0, ev.y | 0);
        world = ev.world_id ? String(ev.world_id) : "";
        let elsewhere: boolean = Boolean(world && this._myWorld && world != this._myWorld);
        if (elsewhere && this._worldNames[world]) {
            place += " · " + String(this._worldNames[world]);
        }
        IoAllianceUi.addText(r, place, ((IoOutpostsTab.COLS[4][0] | 0) + 6) | 0, ty, 11, AllianceConstants.IO_INK, false, ((IoOutpostsTab.COLS[4][1] | 0) - 8) | 0);
        px = ev.x | 0;
        py = ev.y | 0;
        let jump: MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), ((IoOutpostsTab.COLS[5][1] | 0) - 10) | 0, 22, (e: MouseEvent): void => {
            IoAllianceUi.jump(px, py, world);
        }, "gold", 10);
        jump.x = (IoOutpostsTab.COLS[5][0] | 0) + 5;
        jump.y = 4;
        jump.name = "ioJump";
        if (elsewhere) {
            Object(jump).setEnabled(false);
        }
        r.addChild(jump);
        return r;
    }

    /** From or to whom: "IoFriend (Hellions)", "a tribe: Legionnaire", "(before the history began)". */
    private _other(ev: any): string {
        let name: string = ev.other_name ? IoOutpostsTab.IoEsc(String(ev.other_name)) : "";
        switch (String(ev.source)) {
            case "tribe":
                return KEYS.Get(String(ev.kind) == "gained" ? "io_alliance_from_tribe" : "io_alliance_to_tribe", { "v1": name || "?" });
            case "player":
                let who: string = "<b>" + (name || "?") + "</b>";
                if (ev.other_alliance) {
                    who += " <font color=\"#7A6550\">(" + IoOutpostsTab.IoEsc(String(ev.other_alliance)) + ")</font>";
                }
                return KEYS.Get(String(ev.kind) == "gained" ? "io_alliance_from_player" : "io_alliance_to_player", { "v1": who });
            default:
                return "<font color=\"#7A6550\">" + KEYS.Get("io_alliance_from_unknown") + "</font>";
        }
    }

    private static IoEsc(s: string): string {
        return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
    }
}
