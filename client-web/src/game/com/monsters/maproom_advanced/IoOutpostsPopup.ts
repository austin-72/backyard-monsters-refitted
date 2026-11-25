import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer, Timer } from "flash/utils";
import { ACHIEVEMENTS, EnumYardType, IoWin, IoPinchZoom, BASE, Button_CLIP, com_monsters_maproom_advanced_MapRoom as MapRoom, CREATURES, frame_CLIP, GAME, GLOBAL, IoKit, IoMapLod, IoMapUi, IoQuests, IoTextPrompt, IoUnderworld, KEYS, LOGGER, PLEASEWAIT, POPUPS, POPUPSETTINGS, SOUNDS, URLLoaderApi, popup_prefab } from "@game";

/**
 * Inferno-only: the Outposts list, opened by the top bar's "Next outpost" button.
 *
 * One row per outpost: its map position, empire value, what it adds to the main yard per hour for each
 * resource, damage protection left and monsters housed, with View (open that yard) and Map (the world
 * map, centred on it). Click any column title to sort by it; again to reverse. Previous, Home and Next
 * (3 October: Previous and Home) step through the outposts in the order they were taken, round from the
 * last to the first (BASE.ioLoadPrevious / ioGoHome / ioLoadNextOutpost). Data: server worldmapv2/myoutposts (controllers/maproom/v2/myOutposts.ts).
 *
 * Only the rows in view exist (about a dozen, reused as the list scrolls), so a player with 1,500
 * outposts gets the list as quickly as one with three. Scroll with the wheel or the bar on the right.
 *
 * (15 October) QoL #323: a Towers column ("12 · F3": towers and their lowest fortification; "Empty" without any).
 * QoL #324: "Needs attention only" under the list (under attack, damaged, wounded defenders, no towers, idle
 * workers), and Previous / Next then step through those only. QoL #342: a Depths outpost that holds a portal is
 * marked (a purple dot, its X and Y in purple).
 *
 * (15 October) QoL #326: a name or tag per outpost (`name` from the server, worldmapv2/outpostname): under the X, Y
 * and Value of its row; a click on those three names it (IoTextPrompt). The map popup and the map's sidebar show it
 * too (ioNameOf). QoL #343: Abandon one outpost (ioAbandonAsk, from the outpost's map popup).
 *
 * (15 October) QoL #322: an outpost never opened since it was taken has its production worked out by the server from
 * its harvesters (`estimated`): shown "~1.2k" in a muted colour, and left out of the totals (it adds nothing to the
 * main yard until it has been opened once). QoL #334: Select (over View and Map) turns those two into a tick per row;
 * "Choose kit..." opens the kit window for the outposts ticked (popup_prefab.ioBatch), which asks the total price, and
 * ioBatchRun then builds the kit on each through worldmapv2/applykit, pays for those built, and loads the yard again.
 */
export class IoOutpostsPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _outposts: null, _rows: null, _headers: null, _listH: 0, _holder: null, _mask: null, _pool: null, _offset: 0, _none: null, _track: null, _thumb: null, _dragFrom: 0, _all: null, _ioPickBar: null, _ioPickText: null, _ioSelectText: null });
    }

    // (QoL #323: 20 wider and a little less padding, for the Towers column)
    private static readonly BG_W: int = 760;

    private static readonly PAD_H: int = 22;

    private static readonly PAD_TOP: int = 29;

    private static readonly TITLE_SIZE: int = 22;

    private static readonly ROW_H: int = 30;

    private static readonly LIST_MAX_H: int = (10 * IoOutpostsPopup.ROW_H + 2) | 0;

    // ten whole rows (the list's height is rows * ROW_H + 2)
    private static readonly CONTENT_W: int = (IoOutpostsPopup.BG_W - IoOutpostsPopup.PAD_H * 2) | 0;

    /** key, title, width, alignment. */
    // (QoL #103: a Damage column, "Attacked!" while an attack is under way; the others a little narrower for it)
    /** (Inferno-only, QoL #318) the outposts' ids in the list's order as last sorted, for Next / Previous */
    public static ioOrder: string[] = null;

    // (QoL #320, #321, 15 October: Housed as used / room, "None" without a Compound; Incubators busy / all; the others
    // narrower again for them)
    // (QoL #323, 15 October: Towers, the others a few pixels narrower for it)
    // (QoL #235: the titles are keys, read when shown: titleOf)
    private static readonly COLUMNS: any[] = [["x", "X", 32, "center"], ["y", "Y", 32, "center"], ["value", "io_t3m_op_col_value", 46, "right"], ["r1", "io_t3m_op_col_r1", 46, "right"], ["r2", "io_t3m_op_col_r2", 46, "right"], ["r3", "io_t3m_op_col_r3", 52, "right"], ["r4", "io_t3m_op_col_r4", 54, "right"], ["damage", "io_t3m_op_col_damage", 52, "right"], ["protection", "io_t3m_op_col_protected", 56, "right"], ["housed", "io_t3m_op_col_housed", 60, "right"], ["inc", "io_t3m_op_col_inc", 40, "center"], ["idle", "io_t3m_op_col_idle", 32, "center"], ["towers", "", 50, "center"]];

    /** View and Map: their width, and the gap before each. */
    private static readonly ACTION_W: int = 42;

    private static readonly ACTION_GAP: int = 4;

    /** (QoL #342) the dot of an outpost that holds a portal: the world map's portal colours. */
    private static readonly PORTAL_TEXT: uint = 6963360;

    /** (QoL #324) the list shows only the outposts that need attention (for the session). */
    private static _attention: boolean = false;

    /** (QoL #328) the last list from the server (the yard's map popup reads it), and when it came (getTimer). */
    private static _ioCache: any[] = null;

    private static _ioCacheAt: int = 0;

    private static _ioWaiting: any[] = null;

    /** (QoL #326) the names the player gave their outposts (baseid: name), from the last list; and a count of changes. */
    private static _ioNames: any = {};

    public static ioNamesVersion: int = 0;

    /** (QoL #326) the X, Y and Value columns: a named outpost's name goes under them (their width). */
    private static readonly NAME_W: int = 110;

    /** (QoL #343) an outpost is being abandoned (one at a time). */
    private static _ioAbandoning: boolean = false;

    /** (QoL #334) the list shows a tick per row (Select), and the outposts ticked (baseid: true), while it is open. */
    private static _ioPick: boolean = false;

    private static _ioPicked: any = {};

    /** (QoL #334) a kit is being built on several outposts (one batch at a time). */
    private static _ioBatching: boolean = false;

    /** (QoL #334) Select's width over View and Map (both, and the gap between them). */
    private static readonly PICK_W: int = (IoOutpostsPopup.ACTION_W * 2 + IoOutpostsPopup.ACTION_GAP) | 0;

    /** (QoL #328) Open + Kits: the outpost whose kit window opens once it has loaded, and until when (getTimer). */
    private static _ioKitsFor: string = null;

    private static _ioKitsUntil: int = 0;

    private static readonly BAR_W: int = 14;

    /** Rows moved by one wheel step. */
    private static readonly WHEEL_ROWS: int = 3;

    private static _open: IoOutpostsPopup = null;

    private static _sortKey: string = "x";

    private static _sortDown: boolean = false;
    private _mc: MovieClip;
    private _outposts: any[];
    private _rows: MovieClip;
    private _headers: any[];
    private _listH: int;
    private _holder: MovieClip;
    private _mask: MovieClip;
    /** The rows on screen: {line, cells, view, viewText, index, outpost}. */
    private _pool: any[];
    /** How far the list is scrolled, in pixels. */
    private _offset: number;
    private _none: TextField;
    private _track: Sprite;
    private _thumb: Sprite;
    private _dragFrom: number;
    /** (QoL #324) every outpost, when the list shows only those that need attention. */
    private _all: any[];
    /** (QoL #334) the line over the list while ticking outposts (in the hint's place), its text, and Select's text. */
    private _ioPickBar: Sprite;
    private _ioPickText: TextField;
    private _ioSelectText: TextField;

    public $ctor(outposts?: any[]): void {
        this._headers = [];
        this._pool = [];
        super.$ctor();
        // (QoL #324: only those that need attention, when chosen)
        this._all = outposts;
        if (IoOutpostsPopup._attention) {
            outposts = outposts.filter((o: any): boolean => IoOutpostsPopup.needsAttention(o));
        }
        this._outposts = outposts;
        this._mc = new MovieClip();
        this._listH = Math.min(IoOutpostsPopup.LIST_MAX_H, Math.max(1, outposts.length) * IoOutpostsPopup.ROW_H + 2) | 0;
        let titleH: int = (IoOutpostsPopup.TITLE_SIZE + 8) | 0;
        // (QoL #329: room for a second line under the list, "storage full")
        let totalH: int = (IoOutpostsPopup.PAD_TOP + titleH + 34 + 24 + this._listH + 40 + 68) | 0;
        let frameX: int = (-((IoOutpostsPopup.BG_W * 0.5) | 0)) | 0;
        let frameY: int = (-((totalH * 0.5) | 0)) | 0;
        let contentX: int = (frameX + IoOutpostsPopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoOutpostsPopup.BG_W;
        frame.height = totalH;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this.close));

        let title: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = IoOutpostsPopup.CONTENT_W;
        title.height = titleH;
        let titleFormat: TextFormat = new TextFormat("Groboldov", IoOutpostsPopup.TITLE_SIZE, 0xFFFFFF);
        titleFormat.align = TextFormatAlign.CENTER;
        title.defaultTextFormat = titleFormat;
        title.text = IoOutpostsPopup._attention ? KEYS.Get("io_map2_ops_title_some", { "v1": outposts.length, "v2": this._all.length }) : KEYS.Get("io_t3m_op_title", { "v1": outposts.length });
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = contentX;
        title.y = frameY + IoOutpostsPopup.PAD_TOP;

        // [◀ Previous] [Home] [Next outpost ▶] on the right (3 October: Previous and Home); the hint beside them
        // (QoL #325: [Heal all (N)] before them while any outpost's defenders are still wounded from an attack)
        let wounded: int = this._all.filter((o: any): boolean => (o.wounded | 0) > 0).length | 0;
        let buttonsW: int = (100 + 6 + 70 + 6 + 110 + (wounded > 0 ? 120 + 6 : 0)) | 0;
        let hint: TextField = as3.as(this._mc.addChild(IoOutpostsPopup.label(IoOutpostsPopup._attention ? KEYS.Get("io_map2_ops_attention_hint") : (GLOBAL.INFERNO_ONLY ? KEYS.Get("io_op2_ops_hint") : "Click a column title to sort. Resources per hour are what each outpost adds to your main yard."), 11, 3811866, false, (IoOutpostsPopup.CONTENT_W - buttonsW - 10) | 0, TextFormatAlign.LEFT)), TextField);
        hint.wordWrap = true;
        hint.multiline = true;
        hint.height = 30;
        hint.x = contentX;
        hint.y = title.y + titleH + 1;
        hint.name = "ioOpHint";
        let hasOutposts: boolean = Boolean(GLOBAL._mapOutpostIDs) && GLOBAL._mapOutpostIDs.length > 0 && (!IoOutpostsPopup._attention || outposts.length > 0);
        let next: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button(KEYS.Get("io_t3m_op_next"), 110, 26, as3.bind(this, this.onNext))), Sprite);
        next.x = contentX + IoOutpostsPopup.CONTENT_W - 110;
        next.y = title.y + titleH + 2;
        next.name = "ioNext";
        let home: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button(KEYS.Get("io_t3m_op_home"), 70, 26, as3.bind(this, this.onHome))), Sprite);
        home.x = next.x - 6 - 70;
        home.y = next.y;
        home.name = "ioHome";
        let previous: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button(KEYS.Get("io_t3m_op_previous"), 100, 26, as3.bind(this, this.onPrevious))), Sprite);
        previous.x = home.x - 6 - 100;
        previous.y = next.y;
        previous.name = "ioPrevious";
        // (greyed: Home in the main yard, Previous and Next with no outposts)
        IoOutpostsPopup.disable(home, BASE.isMainYardOrInfernoMainYard);
        IoOutpostsPopup.disable(previous, !hasOutposts);
        IoOutpostsPopup.disable(next, !hasOutposts);
        if (wounded > 0) {
            let heal: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button(KEYS.Get("io_outposts_heal", { "v1": wounded }), 120, 26, as3.bind(this, this.onHeal))), Sprite);
            heal.x = previous.x - 6 - 120;
            heal.y = next.y;
            heal.name = "ioHealAll";
        }

        // column titles
        let headerY: int = (title.y + titleH + 34) | 0;
        let x: int = (contentX + 1) | 0;
        for (let column of as3.values(IoOutpostsPopup.COLUMNS)) {
            let head: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
            head.buttonMode = true;
            head.mouseChildren = false;
            head.graphics.beginFill(0, 0);
            head.graphics.drawRect(0, 0, Number(column[2]), 22);
            head.graphics.endFill();
            let headText: TextField = as3.as(head.addChild(IoOutpostsPopup.label(IoOutpostsPopup.titleOf(column), 11, 3811866, true, column[2] | 0, column[3] == "center" ? TextFormatAlign.CENTER : TextFormatAlign.RIGHT)), TextField);
            headText.y = 3;
            // (QoL #235: a longer title in another language made smaller to fit its column)
            GLOBAL.ioFitText(headText);
            head.x = x;
            head.y = headerY;
            head.name = as3.str(column[0]);
            head.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSort));
            this._headers.push([column, headText]);
            x = (x + column[2]) | 0;
        }
        // (QoL #334: Select, over View and Map: a tick per row, to build a kit on several outposts at once)
        if (GLOBAL.INFERNO_ONLY) {
            let select: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button(KEYS.Get(IoOutpostsPopup._ioPick ? "io_op3_pick_done" : "io_op3_pick"), IoOutpostsPopup.PICK_W, 20, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this.ioSetPick(!IoOutpostsPopup._ioPick);
            })), Sprite);
            select.name = "ioOp3Select";
            select.x = x + IoOutpostsPopup.ACTION_GAP;
            select.y = headerY + 1;
            this._ioSelectText = IoKit.textOf(select);
            this.ioBuildPickBar(contentX, (title.y + titleH + 1) | 0);
        }

        let listTop: int = (headerY + 24) | 0;
        let box: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        box.graphics.lineStyle(1, 9071173, 1);
        box.graphics.beginFill(16777215, 0.85);
        box.graphics.drawRect(0, 0, IoOutpostsPopup.CONTENT_W, this._listH);
        box.graphics.endFill();
        box.x = contentX;
        box.y = listTop;

        this._holder = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        this._holder.x = contentX + 1;
        this._holder.y = listTop + 1;
        this._rows = as3.as(this._holder.addChild(new MovieClip()), MovieClip);
        this._mask = as3.as(this._holder.addChild(new MovieClip()), MovieClip);
        this._mask.graphics.beginFill(16711680, 1);
        this._mask.graphics.drawRect(0, 0, IoOutpostsPopup.CONTENT_W - 2, this._listH - 2);
        this._mask.graphics.endFill();
        this._rows.mask = this._mask;
        this.buildRows();
        this._holder.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.onWheel));
        IoPinchZoom.swipe(this._holder, (d: number): void => { this._offset -= d; this.render(); }); // (QoL #545: a finger drags the list)

        // totals under the list
        let totals: TextField = as3.as(this._mc.addChild(IoOutpostsPopup.label(this.totalsText(), 11, 3811866, true, IoOutpostsPopup.CONTENT_W, TextFormatAlign.LEFT)), TextField);
        totals.name = "ioOutpostsTotals";
        totals.multiline = true;
        // (QoL #322: a third line may say which outposts aren't counted yet; the gap above the bottom row takes it)
        totals.height = GLOBAL.INFERNO_ONLY ? 46 : 34;
        if (GLOBAL.INFERNO_ONLY) {
            // (24 October: a line longer than the list ("~ 2 outposts not opened since they were taken: ... until you
            // open them once") ran past the window's edge, its end cut off: the lines drawn a little smaller to fit)
            GLOBAL.ioFitText(totals, 9);
        }
        totals.x = contentX;
        totals.y = listTop + this._listH + 5;

        // (16 October: no Close button down here as well: the window's X closes it, as every other window's does)
        let rowY: int = (frameY + totalH - 52) | 0;

        // (QoL #324: Needs attention only, in the bottom row)
        let attentionCount: int = this._all.filter((o: any): boolean => IoOutpostsPopup.needsAttention(o)).length | 0;
        let attention: MovieClip = IoMapUi.checkbox(KEYS.Get("io_map2_ops_attention", { "v1": attentionCount }), IoOutpostsPopup._attention, (on: boolean): void => {
            IoOutpostsPopup._attention = on;
            let all: any[] = this._all;
            this.close();
            IoOutpostsPopup._open = new IoOutpostsPopup(all);
        }, 260);
        attention.name = "ioOpAttention";
        attention.x = contentX;
        attention.y = rowY;
        this._mc.addChild(attention);
        // (QoL #342: what the purple dot means, when an outpost has one)
        if (this._all.some((o: any): boolean => IoOutpostsPopup.holdsPortal(o))) {
            let legend: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
            legend.name = "ioOpPortalLegend";
            legend.mouseEnabled = false;
            legend.mouseChildren = false;
            IoOutpostsPopup.portalDot(legend, 5, 10);
            let legendText: TextField = as3.as(legend.addChild(IoOutpostsPopup.label(KEYS.Get("io_map2_ops_portal_legend"), 10, 3811866, false, 250, TextFormatAlign.LEFT)), TextField);
            legendText.x = 12;
            legendText.y = 2;
            legend.x = 90;
            legend.y = rowY;
        }

        this.fill();
        this.showHere();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioSetPick(IoOutpostsPopup._ioPick);
        }
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        // (QoL #464: a click on the backdrop closes it)
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /** Opens the list (loads it from the server first). */
    public static Show(e: MouseEvent = null): void {
        if (IoOutpostsPopup._open && (!IoOutpostsPopup._open._mc || !IoOutpostsPopup._open._mc.stage)) {
            IoOutpostsPopup._open = null;
        }
        if (IoOutpostsPopup._open) {
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3m_op_attacked"));
            return;
        }
        SOUNDS.Play("click1");
        // (QoL #334: opened again: no ticks)
        IoOutpostsPopup._ioPick = false;
        IoOutpostsPopup._ioPicked = {};
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL._mapURL + "myoutposts", [], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error) {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_t3m_op_load_failed"));
                return;
            }
            // (QoL #328: the yard's map popup reads it too)
            IoOutpostsPopup.ioRemember(as3.as(response.outposts, Array) || []);
            if (BASE.ioAttackRunning() || IoOutpostsPopup._open) {
                return;
            }
            IoOutpostsPopup._open = new IoOutpostsPopup(as3.as(response.outposts, Array) || []);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_t3m_op_load_failed"));
        });
    }

    // ---- the rows
    /** Sorts the list, back to the top, and shows it. */
    private fill(): void {
        as3.sort(this._outposts, as3.bind(this, this.compare));
        // (QoL #318: Next and Previous then go through the outposts in this order)
        IoOutpostsPopup.ioOrder = this._outposts.map((o: any): string => String(o.baseid));
        for (let entry of as3.values(this._pool)) {
            entry.index = -1;
        }
        this._offset = 0;
        this._none.visible = this._outposts.length == 0;
        for (let head of as3.values(this._headers)) {
            let arrow: string = head[0][0] == IoOutpostsPopup._sortKey ? (IoOutpostsPopup._sortDown ? " ▼" : " ▲") : "";
            as3.cast(head[1], TextField).text = IoOutpostsPopup.titleOf(head[0]) + arrow;
            GLOBAL.ioFitText(as3.cast(head[1], TextField));
        }
        this.render();
    }

    /** The reusable rows and the scroll bar. */
    private buildRows(): void {
        let viewH: int = (this._listH - 2) | 0;
        let count: int = Math.min(this._outposts.length, (Math.ceil(viewH / IoOutpostsPopup.ROW_H) | 0) + 1) | 0;
        for (let i: int = 0; i < count; i++) {
            this._pool.push(this.row());
        }
        this._none = as3.as(this._rows.addChild(IoOutpostsPopup.label(IoOutpostsPopup._attention && this._all.length > 0 ? KEYS.Get("io_map2_ops_attention_none") : KEYS.Get("io_t3m_op_none"), 12, 5592405, false, (IoOutpostsPopup.CONTENT_W - 20) | 0, TextFormatAlign.CENTER)), TextField);
        this._none.y = 6;
        if (this._outposts.length * IoOutpostsPopup.ROW_H <= viewH) {
            return;
        }
        this._track = as3.as(this._holder.addChild(new Sprite()), Sprite);
        this._track.graphics.beginFill(14931389, 1);
        this._track.graphics.drawRect(0, 0, IoOutpostsPopup.BAR_W, viewH);
        this._track.graphics.endFill();
        this._track.x = IoOutpostsPopup.CONTENT_W - 2 - IoOutpostsPopup.BAR_W - 2;
        this._track.buttonMode = true;
        this._track.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onTrack));
        this._thumb = as3.as(this._holder.addChild(new Sprite()), Sprite);
        let thumbH: int = Math.max(28, (viewH * viewH / (this._outposts.length * IoOutpostsPopup.ROW_H)) | 0) | 0;
        this._thumb.graphics.lineStyle(1, 5913114, 1);
        this._thumb.graphics.beginFill(9071173, 1);
        this._thumb.graphics.drawRoundRect(0, 0, IoOutpostsPopup.BAR_W - 1, thumbH, 8, 8);
        this._thumb.graphics.endFill();
        this._thumb.x = this._track.x;
        this._thumb.buttonMode = true;
        this._thumb.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onThumbDown));
    }

    private row(): any {
        let entry: any = null;
        entry = { "index": -1, "outpost": null, "cells": [] };
        let line: Sprite = as3.as(this._rows.addChild(new Sprite()), Sprite);
        entry.line = line;
        let x: int = 0;
        for (let column of as3.values(IoOutpostsPopup.COLUMNS)) {
            let cell: TextField = as3.as(line.addChild(IoOutpostsPopup.label("", 12, 0, column[0] == "value", column[2] | 0, column[3] == "center" ? TextFormatAlign.CENTER : TextFormatAlign.RIGHT)), TextField);
            cell.x = x;
            cell.y = 6;
            entry.cells.push(cell);
            x = (x + column[2]) | 0;
        }
        // (QoL #326: a named outpost's name under its X, Y and Value; a click there names it)
        entry.nameText = as3.as(line.addChild(IoOutpostsPopup.label("", 9, 7031334, true, IoOutpostsPopup.NAME_W - 6, TextFormatAlign.LEFT)), TextField);
        entry.nameText.x = 4;
        entry.nameText.y = 15;
        entry.nameText.visible = false;
        let nameHit: Sprite = as3.as(line.addChild(new Sprite()), Sprite);
        nameHit.graphics.beginFill(0, 0);
        nameHit.graphics.drawRect(0, 0, IoOutpostsPopup.NAME_W, IoOutpostsPopup.ROW_H);
        nameHit.graphics.endFill();
        nameHit.buttonMode = true;
        nameHit.mouseChildren = false;
        let hover: Sprite = as3.as(nameHit.addChild(new Sprite()), Sprite);
        hover.graphics.beginFill(16777215, 0.35);
        hover.graphics.drawRect(0, 1, IoOutpostsPopup.NAME_W, IoOutpostsPopup.ROW_H - 2);
        hover.graphics.endFill();
        IoMapUi.pencil(hover.graphics, IoOutpostsPopup.NAME_W - 13, IoOutpostsPopup.ROW_H - 12, IoMapUi.MUTED);
        hover.visible = false;
        nameHit.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hover.visible = true;
        });
        nameHit.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hover.visible = false;
        });
        nameHit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (entry.outpost) {
                SOUNDS.Play("click1");
                this.nameOutpost(entry.outpost);
            }
        });
        nameHit.visible = GLOBAL.INFERNO_ONLY;
        entry.nameHit = nameHit;
        entry.view = as3.as(line.addChild(IoOutpostsPopup.button(KEYS.Get("io_t3m_op_view"), IoOutpostsPopup.ACTION_W, 22, (e: MouseEvent): void => {
            if (entry.outpost) {
                this.viewOutpost(entry.outpost);
            }
        })), Sprite);
        // (QoL #323: a little narrower, for the Towers column)
        entry.view.x = x + IoOutpostsPopup.ACTION_GAP;
        entry.view.y = 4;
        entry.viewText = IoKit.textOf(as3.cast(entry.view, Sprite));
        let map: Sprite = as3.as(line.addChild(IoOutpostsPopup.button(KEYS.Get("io_t3m_op_map"), IoOutpostsPopup.ACTION_W, 22, (e: MouseEvent): void => {
            if (entry.outpost) {
                this.showOnMap(entry.outpost);
            }
        })), Sprite);
        map.x = x + IoOutpostsPopup.ACTION_GAP * 2 + IoOutpostsPopup.ACTION_W;
        map.y = 4;
        entry.map = map;
        // (QoL #334: the row's tick, in View and Map's place while ticking outposts)
        if (GLOBAL.INFERNO_ONLY) {
            let pick: MovieClip = IoMapUi.checkbox(KEYS.Get("io_op3_pick_row"), false, (on: boolean): void => {
                if (!entry.outpost) {
                    return;
                }
                if (on) {
                    IoOutpostsPopup._ioPicked[String(entry.outpost.baseid)] = true;
                } else {
                    delete IoOutpostsPopup._ioPicked[String(entry.outpost.baseid)];
                }
                this.ioPickCount();
            }, IoOutpostsPopup.PICK_W);
            pick.x = x + IoOutpostsPopup.ACTION_GAP + 4;
            pick.y = 5;
            pick.visible = false;
            line.addChild(pick);
            entry.pick = pick;
        }
        return entry;
    }

    /** Puts the outposts at the current scroll position into the rows on screen. */
    private render(): void {
        let viewH: int = (this._listH - 2) | 0;
        let maxOffset: number = Math.max(0, this._outposts.length * IoOutpostsPopup.ROW_H - viewH);
        this._offset = Math.max(0, Math.min(maxOffset, this._offset));
        let first: int = (this._offset / IoOutpostsPopup.ROW_H) | 0;
        let shift: number = this._offset - first * IoOutpostsPopup.ROW_H;
        for (let p: int = 0; p < this._pool.length; p++) {
            let entry: any = this._pool[p];
            let index: int = (first + p) | 0;
            let line: Sprite = as3.cast(entry.line, Sprite);
            if (index >= this._outposts.length) {
                line.visible = false;
                entry.index = -1;
                entry.outpost = null;
                continue;
            }
            line.visible = true;
            line.y = p * IoOutpostsPopup.ROW_H - shift;
            if (entry.index == index) {
                continue;
            }
            let outpost: any = this._outposts[index];
            entry.index = index;
            entry.outpost = outpost;
            let here: boolean = String(outpost.baseid) == String(BASE._loadedBaseID);
            line.graphics.clear();
            line.graphics.beginFill((here ? 0xFFE7A8 : (index % 2 == 0 ? 0xF4EDE0 : 0xFFFFFF)) >>> 0, 1);
            line.graphics.drawRect(0, 0, IoOutpostsPopup.CONTENT_W - 20, IoOutpostsPopup.ROW_H);
            line.graphics.endFill();
            // (QoL #342: a Depths outpost that holds a portal)
            if (IoOutpostsPopup.holdsPortal(outpost)) {
                IoOutpostsPopup.portalDot(line, 5, IoOutpostsPopup.ROW_H * 0.5);
            }
            // (QoL #326: a named outpost: its X, Y and Value a little higher, the name under them)
            let name: string = GLOBAL.INFERNO_ONLY ? IoOutpostsPopup.ioNameOf(String(outpost.baseid)) : "";
            for (let c: int = 0; c < IoOutpostsPopup.COLUMNS.length; c++) {
                let cell: TextField = as3.cast(entry.cells[c], TextField);
                cell.text = this.cellText(outpost, as3.str(IoOutpostsPopup.COLUMNS[c][0]));
                cell.textColor = this.cellColour(outpost, as3.str(IoOutpostsPopup.COLUMNS[c][0]));
                cell.y = name && c < 3 ? 0 : 6;
            }
            let nameText: TextField = as3.cast(entry.nameText, TextField);
            nameText.visible = name != "";
            if (name) {
                IoOutpostsPopup.fitName(nameText, name);
            }
            as3.cast(entry.nameHit, Sprite).name = "ioOp2Rename_" + outpost.baseid;
            as3.cast(entry.viewText, TextField).text = here ? KEYS.Get("io_t3m_op_here") : KEYS.Get("io_t3m_op_view");
            entry.view.alpha = here ? 0.5 : 1;
            entry.view.mouseEnabled = !here;
            // (QoL #334: ticking outposts: the tick in View and Map's place; not the yard showing, nor one under attack)
            if (entry.pick) {
                let picking: boolean = IoOutpostsPopup._ioPick;
                let ok: boolean = IoOutpostsPopup.ioPickable(outpost);
                entry.view.visible = !picking;
                entry.map.visible = !picking;
                let pick: MovieClip = as3.cast(entry.pick, MovieClip);
                pick.visible = picking;
                pick.name = "ioOp3Pick_" + outpost.baseid;
                pick.setChecked(ok && Boolean(IoOutpostsPopup._ioPicked[String(outpost.baseid)]));
                pick.alpha = ok ? 1 : 0.45;
                pick.mouseEnabled = ok;
                as3.cast(pick.getChildAt(0), TextField).text = ok ? KEYS.Get("io_op3_pick_row") : (here ? KEYS.Get("io_op3_pick_here") : KEYS.Get("io_op3_pick_attacked"));
            }
        }
        if (this._thumb) {
            let room: number = this._track.height - this._thumb.height;
            this._thumb.y = Number(maxOffset > 0 ? Math.round(room * this._offset / maxOffset) : 0);
        }
    }

    /** Opened in an outpost: scrolled so that outpost's row is in view (second from the top). */
    private showHere(): void {
        for (let i: int = 0; i < this._outposts.length; i++) {
            if (String(this._outposts[i].baseid) == String(BASE._loadedBaseID)) {
                this._offset = Math.max(0, i - 1) * IoOutpostsPopup.ROW_H;
                this.render();
                return;
            }
        }
    }

    // ---- scrolling
    private onWheel(e: MouseEvent): void {
        e.stopPropagation();
        this._offset += (e.delta > 0 ? -1 : 1) * IoOutpostsPopup.WHEEL_ROWS * IoOutpostsPopup.ROW_H;
        this.render();
    }

    /** A click on the bar above or below the handle: a page up or down. */
    private onTrack(e: MouseEvent): void {
        let page: number = this._listH - 2 - IoOutpostsPopup.ROW_H;
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
        if (!this._mc) {
            return;
        }
        let room: number = this._track.height - this._thumb.height;
        let y: number = Math.max(0, Math.min(room, this._holder.mouseY - this._dragFrom));
        this._offset = Number(room > 0 ? y / room * Math.max(0, this._outposts.length * IoOutpostsPopup.ROW_H - (this._listH - 2)) : 0);
        this.render();
    }

    private onThumbUp(e: Event = null): void {
        GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onThumbMove));
        GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onThumbUp));
    }

    private cellText(outpost: any, key: string): string {
        switch (key) {
            case "x":
                // (an outpost in the Depths of Hell: its own numbers, D0-D9; the world above 0-399)
                return IoUnderworld.isUnder(outpost.x | 0, outpost.y | 0) ? "D" + ((outpost.x | 0) - IoUnderworld.origin) : String(outpost.x | 0);
            case "y":
                return IoUnderworld.isUnder(outpost.x | 0, outpost.y | 0) ? "D" + ((outpost.y | 0) - IoUnderworld.origin) : String(outpost.y | 0);
            case "value":
                return IoOutpostsPopup.short(Number(outpost.value));
            case "r1":
            case "r2":
            case "r3":
            case "r4":
                // (QoL #322: "~" when the server worked it out from the harvesters: the outpost has not been opened yet)
                return outpost.production ? (GLOBAL.INFERNO_ONLY && outpost.estimated ? "~" : "") + IoOutpostsPopup.short(Number(outpost.production[(Number(key.charAt(1)) | 0) - 1])) : "?";
            case "protection":
                return (outpost.protection | 0) > 0 ? IoOutpostsPopup.duration(outpost.protection | 0) : KEYS.Get("btn_no");
            case "monsters":
                return String(outpost.monsters | 0);
            case "housed": {
                let room: int = IoOutpostsPopup.roomOf(outpost);
                return room <= 0 ? (outpost.compounds ? KEYS.Get("io_t3m_op_none_housed") : String(outpost.monsters | 0)) : IoOutpostsPopup.short(IoOutpostsPopup.usedOf(outpost)) + "/" + IoOutpostsPopup.short(room);
            }
            case "inc":
                return outpost.incubators && (outpost.incubators[0] | 0) > 0 ? (outpost.incubators[1] | 0) + "/" + (outpost.incubators[0] | 0) : "-";
            case "damage":
                return (outpost.attacked | 0) > 0 ? KEYS.Get("io_outposts_attacked") : ((outpost.damage | 0) > 0 ? (outpost.damage | 0) + "%" : "-");
            case "idle":
                // (QoL #319: workers with nothing to do there: the outpost's workers less the jobs under way)
                return String(IoOutpostsPopup.idleOf(outpost));
            case "towers":
                return IoOutpostsPopup.towersText(outpost, false);
        }
        return "";
    }

    private cellColour(outpost: any, key: string): uint {
        // (QoL #342: the place of an outpost that holds a portal, in the portal's purple)
        if ((key == "x" || key == "y") && IoOutpostsPopup.holdsPortal(outpost)) {
            return IoOutpostsPopup.PORTAL_TEXT;
        }
        if (key == "towers") {
            return (!outpost.defences ? 8947848 : ((outpost.defences[0] | 0) > 0 ? 0 : 0xB71C1C)) >>> 0;
        }
        if (key == "idle") {
            return (IoOutpostsPopup.idleOf(outpost) > 0 ? 0xB26A00 : 8947848) >>> 0;
        }
        if (key == "protection") {
            return ((outpost.protection | 0) > 0 ? 0x2E7D32 : 0xB71C1C) >>> 0;
        }
        if (key == "damage") {
            return ((outpost.attacked | 0) > 0 || (outpost.damage | 0) >= 50 ? 0xB71C1C : ((outpost.damage | 0) > 0 ? 0xB26A00 : 8947848)) >>> 0;
        }
        if (key == "housed") {
            let room: int = IoOutpostsPopup.roomOf(outpost);
            if (room <= 0) {
                return (outpost.compounds ? 0xB71C1C : 0) >>> 0;
            }
            return (IoOutpostsPopup.usedOf(outpost) >= room ? 0xB26A00 : 0) >>> 0;
        }
        if (key == "inc") {
            return (outpost.incubators && (outpost.incubators[0] | 0) > (outpost.incubators[1] | 0) ? 0xB26A00 : 8947848) >>> 0;
        }
        if (key.charAt(0) == "r" && !outpost.production) {
            return 8947848;
        }
        // (QoL #322: worked out on the server, not yet added to the main yard)
        if (GLOBAL.INFERNO_ONLY && key.charAt(0) == "r" && outpost.estimated) {
            return IoMapUi.MUTED;
        }
        return 0;
    }

    /** QoL #320: the room its Compounds give, in housing units (0: none). */
    public static roomOf(outpost: any): int {
        let room: int = 0;
        for (let c of as3.values(as3.as(outpost.compounds, Array) || [])) {
            let props: any = GLOBAL._buildingProps[(c[0] | 0) - 1];
            let caps: any[] = props ? as3.as(props.capacity, Array) : null;
            if (caps && caps.length) {
                room = (room + (caps[Math.max(0, Math.min(caps.length - 1, (c[1] | 0) - 1))] | 0)) | 0;
            }
        }
        return room;
    }

    /** QoL #320: the room its monsters take (each kind's size). */
    public static usedOf(outpost: any): int {
        let used: int = 0;
        let by: any = outpost.housedBy || {};
        for (let id in by) {
            let size: number = 1;
            try {
                size = Number(CREATURES.GetProperty(id, "cStorage", 0, true)) || 1;
            } catch (e) {
            }
            used = (used + (by[id] | 0) * size) | 0;
        }
        return used;
    }

    public static idleOf(outpost: any): int {
        return Math.max(0, (GLOBAL.ioOutpostWorkers() | 0) - (outpost.busy | 0)) | 0;
    }

    /** A column's title (the Towers one from the language file). */
    private static titleOf(column: any[]): string {
        let t: string = as3.str(column[1]);
        return column[0] == "towers" ? KEYS.Get("io_map2_col_towers") : (t.indexOf("io_") == 0 ? KEYS.Get(t) : t);
    }

    /**
     * QoL #323: an outpost's towers: "12 · F3" (how many, and the lowest fortification among them when they are
     * all fortified), or "12 towers · F3" in full; "Empty" without any; "?" from a server that doesn't say.
     */
    public static towersText(outpost: any, full: boolean): string {
        let d: any[] = as3.as(outpost.defences, Array);
        if (!d) {
            return "?";
        }
        let n: int = d[0] | 0;
        let f: int = d[1] | 0;
        if (n <= 0) {
            return KEYS.Get("io_map2_towers_empty");
        }
        let count: string = full ? KEYS.Get(n == 1 ? "io_map2_towers_one" : "io_map2_towers_n", { "v1": n }) : String(n);
        return f > 0 ? count + " · F" + f : count;
    }

    /**
     * QoL #324: what needs looking at in an outpost: under attack, damaged, wounded defenders, no towers, idle
     * workers.
     */
    public static needsAttention(outpost: any): boolean {
        if ((outpost.attacked | 0) > 0 || (outpost.damage | 0) > 0 || (outpost.wounded | 0) > 0) {
            return true;
        }
        if (outpost.defences && (outpost.defences[0] | 0) <= 0) {
            return true;
        }
        return IoOutpostsPopup.idleOf(outpost) > 0;
    }

    /**
     * QoL #342: does this outpost hold a portal (a Depths outpost next to a portal's end down there: it opens the way
     * back up)? The server says so (`portal`); without it, worked out from the portals the map knows.
     */
    public static holdsPortal(outpost: any): boolean {
        let x: int = outpost.x | 0;
        let y: int = outpost.y | 0;
        if (outpost.portal != null) {
            return true;
        }
        if (!IoUnderworld.isUnder(x, y)) {
            return false;
        }
        for (let p of as3.values(IoUnderworld.portals)) {
            if (p && IoUnderworld.hexDistance(x, y, p[2] | 0, p[3] | 0) <= IoUnderworld.outpostRange) {
                return true;
            }
        }
        return false;
    }

    /** QoL #342: the portal's dot (the world map's colours). */
    private static portalDot(on: Sprite, x: number, y: number): void {
        on.graphics.lineStyle(1.2, IoMapLod.PORTAL_RING, 1);
        on.graphics.beginFill(IoMapLod.PORTAL_COLOUR, 1);
        on.graphics.drawCircle(x, y, 3.5);
        on.graphics.endFill();
        on.graphics.lineStyle();
    }

    /** QoL #328: the list as the server last sent it, at most a minute old (asked for again otherwise): done(list or null). */
    public static ioFetch(done: Function): void {
        if (IoOutpostsPopup._ioCache && getTimer() - IoOutpostsPopup._ioCacheAt < 60000) {
            done(IoOutpostsPopup._ioCache);
            return;
        }
        if (IoOutpostsPopup._ioWaiting) {
            IoOutpostsPopup._ioWaiting.push(done);
            return;
        }
        IoOutpostsPopup._ioWaiting = [done];
        let finish: Function = (list: any[]): void => {
            let waiting: any[] = IoOutpostsPopup._ioWaiting || [];
            IoOutpostsPopup._ioWaiting = null;
            for (let f of as3.values(waiting)) {
                f(list);
            }
        };
        new URLLoaderApi().load(GLOBAL._mapURL + "myoutposts", [], (response: any): void => {
            let list: any[] = response && !response.error ? as3.as(response.outposts, Array) || [] : null;
            if (list) {
                IoOutpostsPopup.ioRemember(list);
            }
            finish(list);
        }, (e: IOErrorEvent): void => {
            finish(null);
        });
    }

    private static ioRemember(list: any[]): void {
        IoOutpostsPopup._ioCache = list;
        IoOutpostsPopup._ioCacheAt = getTimer();
        // (QoL #326: the names come with it)
        IoOutpostsPopup.ioTakeNames(list);
    }

    /** (QoL #331) The outposts have changed (one taken over with the map kept open): the list is asked for again. */
    public static ioForget(): void {
        IoOutpostsPopup._ioCache = null;
    }

    /**
     * QoL #328: Open + Kits from the yard's map popup: once this outpost has loaded (within 30 seconds), its kit window
     * opens (an empty outpost opens on it already: BASE).
     */
    public static ioKitsOnArrival(baseID: number): void {
        IoOutpostsPopup._ioKitsFor = String(baseID);
        IoOutpostsPopup._ioKitsUntil = (getTimer() + 30000) | 0;
        GLOBAL._ROOT.removeEventListener(Event.ENTER_FRAME, IoOutpostsPopup.ioKitsWatch);
        GLOBAL._ROOT.addEventListener(Event.ENTER_FRAME, IoOutpostsPopup.ioKitsWatch);
    }

    private static ioKitsWatch(e: Event = null): void {
        if (!IoOutpostsPopup._ioKitsFor || getTimer() > IoOutpostsPopup._ioKitsUntil) {
            IoOutpostsPopup.ioKitsStop();
            return;
        }
        if (BASE._loading || String(BASE._loadedBaseID) != IoOutpostsPopup._ioKitsFor || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.isMapOpen()) {
            return;
        }
        IoOutpostsPopup.ioKitsStop();
        if (BASE._buildingCount != 1) {
            POPUPS.Push(new popup_prefab());
        }
    }

    private static ioKitsStop(): void {
        IoOutpostsPopup._ioKitsFor = null;
        GLOBAL._ROOT.removeEventListener(Event.ENTER_FRAME, IoOutpostsPopup.ioKitsWatch);
    }

    // ---- (QoL #326) names
    /** The name the player gave an outpost ("" when none). */
    public static ioNameOf(baseid: string): string {
        let name: any = IoOutpostsPopup._ioNames[String(baseid)];
        return name ? String(name) : "";
    }

    /** The names from a list the server sent (each outpost's `name`). */
    private static ioTakeNames(list: any[]): void {
        let names: any = {};
        for (let o of as3.values(list || [])) {
            if (o && o.name) {
                names[String(o.baseid)] = String(o.name);
            }
        }
        IoOutpostsPopup._ioNames = names;
        IoOutpostsPopup.ioNamesVersion++;
    }

    /** A name in its line: cut with "..." when wider than the line. */
    private static fitName(field: TextField, name: string): void {
        field.text = name;
        let cut: string = name;
        while (cut.length > 1 && field.textWidth > field.width - 4) {
            cut = cut.substr(0, cut.length - 1);
            field.text = cut + "...";
        }
    }

    /**
     * Names an outpost on the server ("" removes its name), then calls back with an error text or null. The lists
     * kept here (the names, the last Outposts list) follow at once.
     */
    public static ioRenameOutpost(baseid: string, name: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._mapURL + "outpostname", [["baseid", baseid], ["name", name]], (response: any): void => {
            if (!response || response.error) {
                onDone(response && response.error ? String(response.error) : KEYS.Get("io_op2_name_failed"));
                return;
            }
            let kept: string = String(response.name || "");
            if (kept) {
                IoOutpostsPopup._ioNames[String(baseid)] = kept;
            } else {
                delete IoOutpostsPopup._ioNames[String(baseid)];
            }
            IoOutpostsPopup.ioNamesVersion++;
            for (let o of as3.values(IoOutpostsPopup._ioCache || [])) {
                if (o && String(o.baseid) == String(baseid)) {
                    o.name = kept;
                }
            }
            onDone(null);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_op2_name_failed"));
        });
    }

    /** A click on an outpost's place in the list: its name asked for (the one it has to start with). */
    private nameOutpost(outpost: any): void {
        let id: string = String(outpost.baseid);
        IoTextPrompt.Show(KEYS.Get("io_op2_name_title"), KEYS.Get("io_op2_name_body", { "v1": IoMapUi.coord(outpost.x | 0, outpost.y | 0) }), IoOutpostsPopup.ioNameOf(id), 20, KEYS.Get("io_op2_name_ok"), (typed: string): void => {
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            IoOutpostsPopup.ioRenameOutpost(id, typed, (error: string): void => {
                PLEASEWAIT.Hide();
                if (error) {
                    GLOBAL.Message(error);
                    return;
                }
                outpost.name = IoOutpostsPopup.ioNameOf(id);
                if (!this._mc) {
                    return;
                }
                for (let entry of as3.values(this._pool)) {
                    entry.index = -1;
                }
                this.render();
            });
        });
    }

    // ---- (QoL #343) abandon one outpost
    /**
     * Asks before an outpost is let go: what goes with it, then ABANDON typed (as Relocate asks for RELOCATE).
     * `outpost`: {baseid, x, y} and, when known, its line of the list (monsters housed, name).
     */
    public static ioAbandonAsk(outpost: any): void {
        if (!GLOBAL.INFERNO_ONLY || !outpost || IoOutpostsPopup._ioAbandoning) {
            return;
        }
        let id: string = String(outpost.baseid);
        if (id == String(BASE._loadedBaseID)) {
            GLOBAL.Message(KEYS.Get("io_op2_abandon_here"));
            return;
        }
        if (BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_op2_abandon_attacked"));
            return;
        }
        let name: string = IoOutpostsPopup.ioNameOf(id);
        let where: string = IoMapUi.coord(outpost.x | 0, outpost.y | 0) + (name ? " (" + IoMapUi.escape(name) + ")" : "");
        let housed: int = outpost.monsters | 0;
        let text: string = housed > 0 ? KEYS.Get("io_op2_abandon_ask_housed", { "v1": where, "v2": GLOBAL.FormatNumber(housed) }) : KEYS.Get("io_op2_abandon_ask", { "v1": where });
        GLOBAL.ioDanger(text, KEYS.Get("io_op2_abandon"), (): void => {
            IoTextPrompt.Show(KEYS.Get("io_op2_abandon_title"), KEYS.Get("io_op2_abandon_type"), "", 12, KEYS.Get("io_op2_abandon"), (typed: string): void => {
                if (String(typed).replace(/^\s+|\s+$/g, "").toUpperCase() != "ABANDON") {
                    GLOBAL.Message(KEYS.Get("io_op2_abandon_typo"));
                    return;
                }
                IoOutpostsPopup.ioAbandonGo(id, where);
            });
        }, null, KEYS.Get("io_danger_stay"));
    }

    /**
     * Abandon, once asked: the yard showing saves what it has first, then nothing more is saved (an auto-bank line
     * for the outpost must not be written back), the server lets the outpost go (worldmapv2/abandonoutpost), and the
     * game starts again (reloaded), so the outposts, the auto-bank and the storage are all fresh, as after Relocate.
     */
    private static ioAbandonGo(baseid: string, where: string): void {
        let wait: Timer = null;
        if (IoOutpostsPopup._ioAbandoning) {
            return;
        }
        IoOutpostsPopup._ioAbandoning = true;
        PLEASEWAIT.Show(KEYS.Get("io_op2_abandon_wait"));
        let deadline: number = GLOBAL.Timestamp() + 30;
        BASE.Save();
        wait = new Timer(250);
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading) {
                wait.stop();
                BASE._blockSave = true;
                new URLLoaderApi().load(GLOBAL._mapURL + "abandonoutpost", [["baseid", baseid], ["confirm", "ABANDON"]], (response: any): void => {
                    PLEASEWAIT.Hide();
                    if (!response || response.error) {
                        BASE._blockSave = false;
                        IoOutpostsPopup._ioAbandoning = false;
                        GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_op2_abandon_failed"));
                        return;
                    }
                    GLOBAL.Halt();
                    GLOBAL.Message(KEYS.Get("io_op2_abandon_done", { "v1": where }), "OK", IoOutpostsPopup.ioReload);
                }, (err: IOErrorEvent): void => {
                    // (the server may have let it go before the line dropped: the game reloads to see)
                    PLEASEWAIT.Hide();
                    GLOBAL.Halt();
                    GLOBAL.Message(KEYS.Get("io_op2_abandon_noanswer"), "OK", IoOutpostsPopup.ioReload);
                });
            } else if (GLOBAL.Timestamp() > deadline) {
                wait.stop();
                PLEASEWAIT.Hide();
                IoOutpostsPopup._ioAbandoning = false;
                GLOBAL.Message(KEYS.Get("io_op2_abandon_nosave"));
            }
        });
        wait.start();
    }

    private static ioReload(): void {
        GAME.ioReload(true);
    }

    /** (QoL #324) Previous and Next go through the outposts the list shows only (Needs attention): back to the base game's otherwise. */
    public static get ioOrderOnly(): boolean {
        return IoOutpostsPopup._attention && Boolean(IoOutpostsPopup.ioOrder) && IoOutpostsPopup.ioOrder.length > 0;
    }

    private sortValue(outpost: any, key: string): number {
        // (QoL #323: the most towers first, then the best fortified; none known below all)
        if (key == "towers") {
            return outpost.defences ? (outpost.defences[0] | 0) * 100 + (outpost.defences[1] | 0) : -1;
        }
        if (key == "idle") {
            return IoOutpostsPopup.idleOf(outpost);
        }
        // (the fullest first when sorted down; no Compound below all)
        if (key == "housed") {
            let room: int = IoOutpostsPopup.roomOf(outpost);
            return room > 0 ? IoOutpostsPopup.usedOf(outpost) / room : -1;
        }
        // (idle incubators)
        if (key == "inc") {
            return outpost.incubators ? (outpost.incubators[0] | 0) - (outpost.incubators[1] | 0) : -1;
        }
        // (an outpost under attack first, then by damage)
        if (key == "damage") {
            return ((outpost.attacked | 0) > 0 ? 1000 : 0) + (outpost.damage | 0);
        }
        if (key.charAt(0) == "r" && key.length == 2) {
            return Number(outpost.production ? Number(outpost.production[(Number(key.charAt(1)) | 0) - 1]) : -1);
        }
        return Number(outpost[key]);
    }

    private compare(a: any, b: any): int {
        let av: number = this.sortValue(a, IoOutpostsPopup._sortKey);
        let bv: number = this.sortValue(b, IoOutpostsPopup._sortKey);
        if (av == bv) {
            // ties: by position on the map
            av = Number(a.x) * 1000 + Number(a.y);
            bv = Number(b.x) * 1000 + Number(b.y);
            return av < bv ? -1 : (av > bv ? 1 : 0);
        }
        return ((av < bv ? -1 : 1) * (IoOutpostsPopup._sortDown ? -1 : 1)) | 0;
    }

    private totalsText(): string {
        let sums: any[] = [0, 0, 0, 0];
        let value: number = 0;
        let monsters: int = 0;
        let used: int = 0;
        let room: int = 0;
        let estimated: int = 0;
        // (QoL #324: all of them, also while only those that need attention show)
        for (let outpost of as3.values(this._all)) {
            value += Number(outpost.value);
            monsters += outpost.monsters | 0;
            used = (used + IoOutpostsPopup.usedOf(outpost)) | 0;
            room = (room + IoOutpostsPopup.roomOf(outpost)) | 0;
            // (QoL #322: one never opened adds nothing yet: not in the totals)
            if (GLOBAL.INFERNO_ONLY && outpost.estimated) {
                estimated++;
                continue;
            }
            if (outpost.production) {
                for (let r: int = 0; r < 4; r++) {
                    sums[r] += Number(outpost.production[r]);
                }
            }
        }
        // (the quest book: what the outposts add to the main yard each hour, all four together)
        IoQuests.best("outpost_rate", Number(sums[0] + sums[1] + sums[2] + sums[3]));
        // (QoL #329: what the outposts make of a resource whose storage at home is full is lost)
        let wasted: number = 0;
        let full: any[] = [];
        for (let r: int = 1; r <= 4; r++) {
            let max: number = BASE._resources ? Number(BASE._resources["r" + r + "max"]) : 0;
            if (max > 0 && BASE._resources["r" + r] && Number(BASE._resources["r" + r].Get()) >= max && Number(sums[r - 1]) > 0) {
                wasted += Number(sums[r - 1]);
                full.push(KEYS.Get(String(GLOBAL._resourceNames[r - 1])).toLowerCase());
            }
        }
        let line: string = KEYS.Get("io_t3m_op_total", { "v1": IoOutpostsPopup.short(value), "v2": IoOutpostsPopup.short(Number(sums[0])), "v3": IoOutpostsPopup.short(Number(sums[1])), "v4": IoOutpostsPopup.short(Number(sums[2])), "v5": IoOutpostsPopup.short(Number(sums[3])) }) + "   ·   " + (room > 0 ? KEYS.Get("io_t3m_op_total_housed", { "v1": IoOutpostsPopup.short(used), "v2": IoOutpostsPopup.short(room) }) : KEYS.Get("io_t3m_op_total_monsters", { "v1": monsters }));
        if (wasted > 0 && !GLOBAL.ioFreeBuild()) {
            line += "\n" + KEYS.Get("io_outposts_wasting", { "v1": full.join(", "), "v2": IoOutpostsPopup.short(wasted) });
        }
        if (estimated > 0) {
            line += "\n" + KEYS.Get(estimated == 1 ? "io_op3_estimated_one" : "io_op3_estimated_n", { "v1": estimated });
        }
        return line;
    }

    // ---- (QoL #334) a kit on several outposts at once
    /** The line over the list while ticking outposts: how many are ticked, All, None, Choose kit... (hidden at first). */
    private ioBuildPickBar(x: int, y: int): void {
        let bar: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        bar.name = "ioOp3PickBar";
        bar.x = x;
        bar.y = y;
        bar.visible = false;
        let kitW: int = 130;
        let allW: int = 60;
        let kit: MovieClip = IoMapUi.button(KEYS.Get("io_op3_pick_kit"), kitW, 26, (e: MouseEvent): void => {
            this.ioChooseKit();
        }, "gold");
        kit.name = "ioOp3PickKit";
        kit.x = IoOutpostsPopup.CONTENT_W - kitW;
        kit.y = 1;
        bar.addChild(kit);
        let none: MovieClip = IoMapUi.button(KEYS.Get("io_op3_pick_none_btn"), allW, 26, (e: MouseEvent): void => {
            IoOutpostsPopup._ioPicked = {};
            this.ioRedraw();
        });
        none.name = "ioOp3PickNone";
        none.x = kit.x - 6 - allW;
        none.y = 1;
        bar.addChild(none);
        let all: MovieClip = IoMapUi.button(KEYS.Get("io_op3_pick_all"), allW, 26, (e: MouseEvent): void => {
            // (the outposts the list shows: all of them, or those that need attention)
            for (let o of as3.values(this._outposts)) {
                if (IoOutpostsPopup.ioPickable(o)) {
                    IoOutpostsPopup._ioPicked[String(o.baseid)] = true;
                }
            }
            this.ioRedraw();
        });
        all.name = "ioOp3PickAll";
        all.x = none.x - 6 - allW;
        all.y = 1;
        bar.addChild(all);
        this._ioPickText = as3.as(bar.addChild(IoOutpostsPopup.label("", 11, 3811866, false, (all.x - 10) | 0, TextFormatAlign.LEFT)), TextField);
        this._ioPickText.name = "ioOp3PickText";
        this._ioPickText.wordWrap = true;
        this._ioPickText.multiline = true;
        this._ioPickText.height = 30;
        this._ioPickBar = bar;
    }

    /** Ticking outposts on or off: the pick line in the hint's place, the ticks in View and Map's place. */
    private ioSetPick(on: boolean): void {
        IoOutpostsPopup._ioPick = on;
        if (!this._mc || !this._ioPickBar) {
            return;
        }
        this._ioPickBar.visible = on;
        for (const $name of as3.values(["ioOpHint", "ioNext", "ioHome", "ioPrevious", "ioHealAll"])) {
            let child: any = this._mc.getChildByName(as3.str($name));
            if (child) {
                child.visible = !on;
            }
        }
        if (this._ioSelectText) {
            this._ioSelectText.text = KEYS.Get(on ? "io_op3_pick_done" : "io_op3_pick");
        }
        this.ioRedraw();
    }

    /** The rows drawn again (their ticks), and the count. */
    private ioRedraw(): void {
        for (let entry of as3.values(this._pool)) {
            entry.index = -1;
        }
        this.render();
        this.ioPickCount();
    }

    private ioPickCount(): void {
        if (this._ioPickText) {
            let n: int = this.ioPickedOutposts().length | 0;
            this._ioPickText.text = n > 0 ? KEYS.Get(n == 1 ? "io_op3_pick_count_one" : "io_op3_pick_count", { "v1": n }) : KEYS.Get("io_op3_pick_hint");
        }
    }

    /** An outpost a kit can be built on from here: not the yard showing (its own kit window does that), nor one under attack. */
    private static ioPickable(outpost: any): boolean {
        return Boolean(outpost) && String(outpost.baseid) != String(BASE._loadedBaseID) && (outpost.attacked | 0) <= 0;
    }

    /** The outposts ticked (of all of them, in the list's order). */
    private ioPickedOutposts(): any[] {
        return (this._all || []).filter((o: any): boolean => Boolean(IoOutpostsPopup._ioPicked[String(o.baseid)]) && IoOutpostsPopup.ioPickable(o));
    }

    /** Choose kit...: the kit window for the outposts ticked (it asks the total price; popup_prefab.ioBatchSelect). */
    private ioChooseKit(): void {
        let picked: any[] = this.ioPickedOutposts();
        if (picked.length == 0) {
            GLOBAL.Message(KEYS.Get("io_op3_pick_nothing"));
            return;
        }
        if (IoOutpostsPopup._ioBatching || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.isMapOpen() || BASE.ioAttackRunning() || BASE._loading) {
            GLOBAL.Message(KEYS.Get("io_op3_batch_notnow"));
            return;
        }
        let list: any[] = picked.map((o: any): any => ({ "baseid": String(o.baseid), "x": o.x | 0, "y": o.y | 0 }));
        // (17 October: the kit window made before this list closes; when it can't be, the list stays and says so. It
        // failed to open from the main yard, and the list just closed with nothing in its place)
        let win: popup_prefab = null;
        popup_prefab.ioBatch = list;
        try {
            win = new popup_prefab();
        } catch (e) {
            popup_prefab.ioBatch = null;
            LOGGER.Log("err", "IoOutpostsPopup: the kit window for " + list.length + " outposts failed to open: " + e);
            GLOBAL.Message(KEYS.Get("io_op3_batch_failed"));
            return;
        }
        this.close();
        POPUPS.Push(win);
    }

    /**
     * Builds a kit on several outposts (none of them the yard showing), once the player has said yes to the price
     * (popup_prefab.ioBatchSelect). `jobs`: {baseid, x, y, buildings, cost: [r1, r2, r3]}.
     *
     * The yard showing saves what it has first; then nothing is saved while the server writes each kit
     * (worldmapv2/applykit, one outpost after another; a lost answer is sent once more: building a kit twice gives
     * the same yard; the server charges each kit with its build, at its own price: one in the Depths has no Flinger), the
     * outposts' old auto-bank lines are dropped (so the next save doesn't write them back), the payment is saved and
     * the yard is loaded again (fresh auto-bank and storage), with a line saying what was built.
     */
    public static ioBatchRun(jobs: any[], kitName: string): void {
        let done: any[] = null;
        let failed: any[] = null;
        let at: int = 0;
        let tries: int = 0;
        let next: Function = null;
        let finish: Function = null;
        if (!GLOBAL.INFERNO_ONLY || IoOutpostsPopup._ioBatching || !jobs || jobs.length == 0) {
            return;
        }
        IoOutpostsPopup._ioBatching = true;
        done = [];
        failed = [];
        PLEASEWAIT.Show(KEYS.Get("io_op3_batch_saving"));
        finish = (): void => {
            BASE._blockSave = false;
            for (let job of as3.values(done)) {
                // (its old auto-bank line: the server dropped it; the next save of the main yard would write it back)
                if (BASE._processedGIP) {
                    delete BASE._processedGIP["b" + job.baseid];
                }
                if (BASE._rawGIP) {
                    delete BASE._rawGIP["b" + job.baseid];
                }
            }
            // (18 October: each kit was charged by the server with its build, applykit `pay`; it was charged here, so
            // the builds could be had without paying. What the yard shows comes from the server when it loads again.)
            if (done.length > 0) {
                ACHIEVEMENTS.Check("starterkit", 1);
            }
            IoOutpostsPopup.ioForget();
            let summary: string = KEYS.Get("io_op3_batch_done", { "v1": IoMapUi.escape(kitName), "v2": done.length, "v3": jobs.length });
            for (let f of as3.values(failed)) {
                let name: string = IoOutpostsPopup.ioNameOf(String(f[0].baseid));
                summary += "<br>" + IoMapUi.coord(f[0].x | 0, f[0].y | 0) + (name ? " (" + IoMapUi.escape(name) + ")" : "") + ": " + (f[1] ? IoMapUi.escape(String(f[1])) : KEYS.Get("io_op3_batch_noanswer"));
            }
            PLEASEWAIT.Update(KEYS.Get("io_op3_batch_saving"));
            IoOutpostsPopup.ioWhenSaved((saved: boolean): void => {
                IoOutpostsPopup._ioBatching = false;
                PLEASEWAIT.Hide();
                if (!saved || done.length == 0) {
                    // (nothing built, or the payment's save still on its way: the yard stays; it saves again by itself)
                    GLOBAL.Message(summary);
                    return;
                }
                // (as after a kit in the outpost itself: nothing saved until the yard has loaded again)
                BASE._blockSave = true;
                if (BASE.isMainYardOrInfernoMainYard) {
                    BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                } else {
                    BASE.LoadBase(null, 0, BASE._loadedBaseID, GLOBAL.e_BASE_MODE.BUILD, false, BASE.yardType);
                }
                POPUPS.ioWhenClear((): void => {
                    GLOBAL.Message(summary);
                });
            });
        };
        next = (): void => {
            if (at >= jobs.length) {
                finish();
                return;
            }
            let job: any = jobs[at];
            PLEASEWAIT.Update(KEYS.Get("io_op3_batch_wait", { "v1": at + 1, "v2": jobs.length }));
            if (!job.pay) {
                job.pay = JSON.stringify({ "r": job.cost, "s": 0, "n": GLOBAL.ioPayName(), "o": 1 });
            }
            new URLLoaderApi().load(GLOBAL._mapURL + "applykit", [["baseid", job.baseid], ["buildings", JSON.stringify(job.buildings)], ["pay", job.pay]], (r: any): void => {
                if (r && r.error == 0) {
                    done.push(job);
                } else {
                    failed.push([job, r && r.error ? String(r.error) : ""]);
                }
                at++;
                tries = 0;
                next();
            }, (e: IOErrorEvent): void => {
                if (++tries < 2) {
                    next();
                    return;
                }
                failed.push([job, ""]);
                at++;
                tries = 0;
                next();
            });
        };
        IoOutpostsPopup.ioWhenSaved((saved: boolean): void => {
            if (!saved) {
                IoOutpostsPopup._ioBatching = false;
                PLEASEWAIT.Hide();
                GLOBAL.Message(KEYS.Get("io_op3_batch_nosave"));
                return;
            }
            BASE._blockSave = true;
            next();
        });
    }

    /** Asks for a save and calls back once it is done (true), or after 30 seconds without (false). */
    private static ioWhenSaved(onDone: Function): void {
        let wait: Timer = null;
        let deadline: number = GLOBAL.Timestamp() + 30;
        BASE.Save();
        wait = new Timer(250);
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            if (BASE._saveCounterA == BASE._saveCounterB && !BASE._saving && !BASE._loading) {
                wait.stop();
                onDone(true);
            } else if (GLOBAL.Timestamp() > deadline) {
                wait.stop();
                onDone(false);
            }
        });
        wait.start();
    }

    // ---- actions
    private onSort(e: MouseEvent): void {
        let key: string = as3.cast(e.currentTarget, Sprite).name;
        SOUNDS.Play("click1");
        if (key == IoOutpostsPopup._sortKey) {
            IoOutpostsPopup._sortDown = !IoOutpostsPopup._sortDown;
        } else {
            IoOutpostsPopup._sortKey = key;
            // numbers people want the most of first; the map position from low to high
            IoOutpostsPopup._sortDown = key != "x" && key != "y";
        }
        this.fill();
    }

    private onNext(e: MouseEvent): void {
        if (this.ioStep(1)) {
            return;
        }
        this.close();
        BASE.ioLoadNextOutpost();
    }

    private onPrevious(e: MouseEvent): void {
        if (this.ioStep(-1)) {
            return;
        }
        this.close();
        BASE.ioLoadPrevious();
    }

    /**
     * (QoL #324) With Needs attention only: Previous / Next go to the one before or after this outpost among those the
     * list shows, in its order (from the main yard, the first or the last). False otherwise (the usual stepping).
     */
    private ioStep(dir: int): boolean {
        let count: int = this._outposts.length | 0;
        let at: int = -1;
        if (!IoOutpostsPopup._attention || count == 0) {
            return false;
        }
        for (let i: int = 0; i < count; i++) {
            if (String(this._outposts[i].baseid) == String(BASE._loadedBaseID)) {
                at = i;
                break;
            }
        }
        let to: int = at < 0 ? (dir > 0 ? 0 : count - 1) : ((at + dir + count) % count) | 0;
        if (to == at) {
            GLOBAL.Message(KEYS.Get("io_map2_ops_attention_only"));
            return true;
        }
        let outpost: any = this._outposts[to];
        this.close();
        BASE.ioLoadOutpost(outpost.x | 0, outpost.y | 0);
        return true;
    }

    private onHome(e: MouseEvent): void {
        this.close();
        BASE.ioGoHome();
    }

    /** Heal all: the server heals every outpost's wounded defenders (as opening each would). */
    private onHeal(e: MouseEvent): void {
        let b: Sprite = as3.as(this._mc.getChildByName("ioHealAll"), Sprite);
        if (b) {
            IoOutpostsPopup.disable(b, true);
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL._mapURL + "healoutposts", [], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error) {
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("io_outposts_heal_failed"));
                if (b) {
                    IoOutpostsPopup.disable(b, false);
                }
                return;
            }
            SOUNDS.ioPlayFor("repair1", 0.8, 1800);
            for (let outpost of as3.values(this._all)) {
                outpost.wounded = 0;
            }
            if (b) {
                b.visible = false;
            }
            let said: string = KEYS.Get("io_outposts_healed", { "v1": response.healed | 0 });
            if ((response.busy | 0) > 0) {
                said += " " + KEYS.Get("io_outposts_heal_busy", { "v1": response.busy | 0 });
            }
            GLOBAL.Message(said);
        }, (err: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_outposts_heal_failed"));
            if (b) {
                IoOutpostsPopup.disable(b, false);
            }
        });
    }

    /** A button that can't be used here: faded, and clicks pass it by. */
    private static disable(b: Sprite, off: boolean): void {
        b.alpha = Number(off ? 0.4 : 1);
        b.mouseEnabled = !off;
        b.buttonMode = !off;
    }

    private viewOutpost(outpost: any): void {
        this.close();
        // (Inferno-only, QoL #467: the outpost's yard offers "◀ Outposts" back)
        if (GLOBAL.INFERNO_ONLY) {
            IoWin.openFrom(KEYS.Get("io_win_back_outposts"), IoOutpostsPopup.Show, true);
        }
        BASE.ioLoadOutpost(outpost.x | 0, outpost.y | 0);
    }

    private showOnMap(outpost: any): void {
        this.close();
        MapRoom.ioFocus = new Point(outpost.x | 0, outpost.y | 0);
        GLOBAL.ShowMap();
        if (!GLOBAL.ioMapOpening()) {
            MapRoom.ioFocus = null;
        }
    }

    /** Closes the list (the yard is going: an attack starts, or BASE.Cleanup). */
    public static ioCloseOpen(): void {
        if (IoOutpostsPopup._open) {
            IoOutpostsPopup._open.close();
        }
        IoOutpostsPopup._open = null;
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        SOUNDS.Play("close");
        this.onThumbUp();
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoOutpostsPopup._open == this) {
            IoOutpostsPopup._open = null;
        }
    }

    // ---- helpers
    /** 2d 5h, 4h 54m, 34m, under a minute: 1m. */
    public static duration(seconds: int): string {
        // Whole minutes, rounded up (under a minute shows 1m), then split: 5h exactly is "5h 0m", not "5h 1m".
        let total: int = Math.max(1, Math.ceil(Math.max(0, seconds) / 60)) | 0;
        let days: int = (total / 1440) | 0;
        let hours: int = ((total % 1440) / 60) | 0;
        let minutes: int = (total % 60) | 0;
        if (days > 0) {
            return KEYS.Get("io_t3m_span_dh", { "v1": days, "v2": hours });
        }
        if (hours > 0) {
            return KEYS.Get("io_t3m_span_hm", { "v1": hours, "v2": minutes });
        }
        return KEYS.Get("io_t3m_span_m", { "v1": minutes });
    }

    /** 2.1b, 1.3m, 10m, 1.4k, 10k, 950. */
    public static short(n: number): string {
        let abs: number = Math.abs(n);
        if (abs >= 1000000000) {
            return IoOutpostsPopup.trim(n / 1000000000) + "b";
        }
        if (abs >= 1000000) {
            return IoOutpostsPopup.trim(n / 1000000) + "m";
        }
        if (abs >= 1000) {
            return IoOutpostsPopup.trim(n / 1000) + "k";
        }
        return String(Math.round(n));
    }

    /** One decimal below 10 (dropped when it is .0), none from 10 up; rounded down so 9.96 is not "10.0". */
    private static trim(n: number): string {
        if (Math.abs(n) >= 10) {
            return String(Math.floor(n));
        }
        let tenths: number = Math.floor(n * 10) / 10;
        return tenths == Math.floor(tenths) ? String(tenths) : tenths.toFixed(1);
    }

    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat("Verdana", size, color, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    private static button(text: string, width: int, height: int, onClick: Function): Sprite {
        let b: Sprite = null;
        let draw: Function = null;
        b = new Sprite();
        b.buttonMode = true;
        b.mouseChildren = false;
        // (11 October: the game's own stock button)
        let face: MovieClip = IoKit.stockFace(b, width, height, false);
        draw = (fill: uint): void => {
            IoKit.stockState(face, fill != 0xF2D98C, true);
        };
        draw(0xF2D98C);
        let t: TextField = as3.as(b.addChild(IoOutpostsPopup.label(text, 11, 2759178, true, width, TextFormatAlign.CENTER)), TextField);
        t.y = ((height - 19) / 2) | 0;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(0xFFE9A8);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(0xF2D98C);
        });
        b.addEventListener(MouseEvent.CLICK, onClick);
        return b;
    }
}
