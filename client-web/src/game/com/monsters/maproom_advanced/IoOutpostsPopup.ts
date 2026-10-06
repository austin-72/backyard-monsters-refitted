import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, Button_CLIP, GLOBAL, IoQuests, IoUnderworld, KEYS, PLEASEWAIT, POPUPSETTINGS, SOUNDS, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom, frame_CLIP } from "@game";

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
 */
export class IoOutpostsPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _outposts: null, _rows: null, _headers: null, _listH: 0, _holder: null, _mask: null, _pool: null, _offset: 0, _none: null, _track: null, _thumb: null, _dragFrom: 0 });
    }

    private static readonly BG_W: int = 740;

    private static readonly PAD_H: int = 26;

    private static readonly PAD_TOP: int = 29;

    private static readonly TITLE_SIZE: int = 22;

    private static readonly ROW_H: int = 30;

    private static readonly LIST_MAX_H: int = (10 * IoOutpostsPopup.ROW_H + 2) | 0;

    // ten whole rows (the list's height is rows * ROW_H + 2)
    private static readonly CONTENT_W: int = (IoOutpostsPopup.BG_W - IoOutpostsPopup.PAD_H * 2) | 0;

    /** key, title, width, alignment. */
    private static readonly COLUMNS: any[] = [["x", "X", 46, "center"], ["y", "Y", 46, "center"], ["value", "Value", 62, "right"], ["r1", "Bone/h", 62, "right"], ["r2", "Coal/h", 62, "right"], ["r3", "Sulfur/h", 66, "right"], ["r4", "Magma/h", 64, "right"], ["protection", "Protected", 76, "right"], ["monsters", "Monsters", 66, "right"]];

    private static readonly ACTIONS_W: int = 106;

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

    public $ctor(outposts?: any[]): void {
        this._headers = [];
        this._pool = [];
        super.$ctor();
        this._outposts = outposts;
        this._mc = new MovieClip();
        this._listH = Math.min(IoOutpostsPopup.LIST_MAX_H, Math.max(1, outposts.length) * IoOutpostsPopup.ROW_H + 2) | 0;
        let titleH: int = (IoOutpostsPopup.TITLE_SIZE + 8) | 0;
        let totalH: int = (IoOutpostsPopup.PAD_TOP + titleH + 34 + 24 + this._listH + 26 + 72) | 0;
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
        title.text = "Outposts (" + outposts.length + ")";
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = contentX;
        title.y = frameY + IoOutpostsPopup.PAD_TOP;

        // [◀ Previous] [Home] [Next outpost ▶] on the right (3 October: Previous and Home); the hint beside them
        let buttonsW: int = (100 + 6 + 70 + 6 + 110) | 0;
        let hint: TextField = as3.as(this._mc.addChild(IoOutpostsPopup.label("Click a column title to sort. Resources per hour are what each outpost adds to your main yard.", 11, 3811866, false, (IoOutpostsPopup.CONTENT_W - buttonsW - 10) | 0, TextFormatAlign.LEFT)), TextField);
        hint.wordWrap = true;
        hint.multiline = true;
        hint.height = 30;
        hint.x = contentX;
        hint.y = title.y + titleH + 1;
        let hasOutposts: boolean = Boolean(GLOBAL._mapOutpostIDs) && GLOBAL._mapOutpostIDs.length > 0;
        let next: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button("Next outpost ▶", 110, 26, as3.bind(this, this.onNext))), Sprite);
        next.x = contentX + IoOutpostsPopup.CONTENT_W - 110;
        next.y = title.y + titleH + 2;
        next.name = "ioNext";
        let home: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button("Home", 70, 26, as3.bind(this, this.onHome))), Sprite);
        home.x = next.x - 6 - 70;
        home.y = next.y;
        home.name = "ioHome";
        let previous: Sprite = as3.as(this._mc.addChild(IoOutpostsPopup.button("◀ Previous", 100, 26, as3.bind(this, this.onPrevious))), Sprite);
        previous.x = home.x - 6 - 100;
        previous.y = next.y;
        previous.name = "ioPrevious";
        // (greyed: Home in the main yard, Previous and Next with no outposts)
        IoOutpostsPopup.disable(home, BASE.isMainYardOrInfernoMainYard);
        IoOutpostsPopup.disable(previous, !hasOutposts);
        IoOutpostsPopup.disable(next, !hasOutposts);

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
            let headText: TextField = as3.as(head.addChild(IoOutpostsPopup.label(as3.str(column[1]), 11, 3811866, true, column[2] | 0, column[3] == "center" ? TextFormatAlign.CENTER : TextFormatAlign.RIGHT)), TextField);
            headText.y = 3;
            head.x = x;
            head.y = headerY;
            head.name = as3.str(column[0]);
            head.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSort));
            this._headers.push([column, headText]);
            x = (x + column[2]) | 0;
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

        // totals under the list
        let totals: TextField = as3.as(this._mc.addChild(IoOutpostsPopup.label(this.totalsText(), 11, 3811866, true, IoOutpostsPopup.CONTENT_W, TextFormatAlign.LEFT)), TextField);
        totals.x = contentX;
        totals.y = listTop + this._listH + 5;

        let ok: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        ok.Setup(KEYS.Get("btn_close"), false, 140, 36);
        ok.x = -((ok.width * 0.5) | 0);
        ok.y = frameY + totalH - 60;
        ok.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        this.fill();
        this.showHere();
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
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
            GLOBAL.Message("Not while your yard is being attacked.");
            return;
        }
        SOUNDS.Play("click1");
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL._mapURL + "myoutposts", [], (response: any): void => {
            PLEASEWAIT.Hide();
            if (!response || response.error) {
                GLOBAL.Message(response && response.error ? String(response.error) : "The outposts could not be loaded. Please try again.");
                return;
            }
            if (BASE.ioAttackRunning() || IoOutpostsPopup._open) {
                return;
            }
            IoOutpostsPopup._open = new IoOutpostsPopup(as3.as(response.outposts, Array) || []);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.Message("The outposts could not be loaded. Please try again.");
        });
    }

    // ---- the rows
    /** Sorts the list, back to the top, and shows it. */
    private fill(): void {
        as3.sort(this._outposts, as3.bind(this, this.compare));
        for (let entry of as3.values(this._pool)) {
            entry.index = -1;
        }
        this._offset = 0;
        this._none.visible = this._outposts.length == 0;
        for (let head of as3.values(this._headers)) {
            let arrow: string = head[0][0] == IoOutpostsPopup._sortKey ? (IoOutpostsPopup._sortDown ? " ▼" : " ▲") : "";
            as3.cast(head[1], TextField).text = head[0][1] + arrow;
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
        this._none = as3.as(this._rows.addChild(IoOutpostsPopup.label("You have no outposts yet. Take over a destroyed yard on the map.", 12, 5592405, false, (IoOutpostsPopup.CONTENT_W - 20) | 0, TextFormatAlign.CENTER)), TextField);
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
        entry.view = as3.as(line.addChild(IoOutpostsPopup.button("View", 46, 22, (e: MouseEvent): void => {
            if (entry.outpost) {
                this.viewOutpost(entry.outpost);
            }
        })), Sprite);
        entry.view.x = x + 8;
        entry.view.y = 4;
        entry.viewText = as3.as(as3.cast(entry.view, Sprite).getChildAt(0), TextField);
        let map: Sprite = as3.as(line.addChild(IoOutpostsPopup.button("Map", 46, 22, (e: MouseEvent): void => {
            if (entry.outpost) {
                this.showOnMap(entry.outpost);
            }
        })), Sprite);
        map.x = x + 58;
        map.y = 4;
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
            for (let c: int = 0; c < IoOutpostsPopup.COLUMNS.length; c++) {
                let cell: TextField = as3.cast(entry.cells[c], TextField);
                cell.text = this.cellText(outpost, as3.str(IoOutpostsPopup.COLUMNS[c][0]));
                cell.textColor = this.cellColour(outpost, as3.str(IoOutpostsPopup.COLUMNS[c][0]));
            }
            as3.cast(entry.viewText, TextField).text = here ? "Here" : "View";
            entry.view.alpha = here ? 0.5 : 1;
            entry.view.mouseEnabled = !here;
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
                return outpost.production ? IoOutpostsPopup.short(Number(outpost.production[(Number(key.charAt(1)) | 0) - 1])) : "?";
            case "protection":
                return (outpost.protection | 0) > 0 ? IoOutpostsPopup.duration(outpost.protection | 0) : "No";
            case "monsters":
                return String(outpost.monsters | 0);
        }
        return "";
    }

    private cellColour(outpost: any, key: string): uint {
        if (key == "protection") {
            return ((outpost.protection | 0) > 0 ? 0x2E7D32 : 0xB71C1C) >>> 0;
        }
        if (key.charAt(0) == "r" && !outpost.production) {
            return 8947848;
        }
        return 0;
    }

    private sortValue(outpost: any, key: string): number {
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
        for (let outpost of as3.values(this._outposts)) {
            value += Number(outpost.value);
            monsters += outpost.monsters | 0;
            if (outpost.production) {
                for (let r: int = 0; r < 4; r++) {
                    sums[r] += Number(outpost.production[r]);
                }
            }
        }
        // (the quest book: what the outposts add to the main yard each hour, all four together)
        IoQuests.best("outpost_rate", Number(sums[0] + sums[1] + sums[2] + sums[3]));
        return "All outposts:  value " + IoOutpostsPopup.short(value) + "   ·   per hour  bone " + IoOutpostsPopup.short(Number(sums[0])) + ", coal " + IoOutpostsPopup.short(Number(sums[1])) + ", sulfur " + IoOutpostsPopup.short(Number(sums[2])) + ", magma " + IoOutpostsPopup.short(Number(sums[3])) + "   ·   monsters " + monsters;
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
        this.close();
        BASE.ioLoadNextOutpost();
    }

    private onPrevious(e: MouseEvent): void {
        this.close();
        BASE.ioLoadPrevious();
    }

    private onHome(e: MouseEvent): void {
        this.close();
        BASE.ioGoHome();
    }

    /** A button that can't be used here: faded, and clicks pass it by. */
    private static disable(b: Sprite, off: boolean): void {
        b.alpha = Number(off ? 0.4 : 1);
        b.mouseEnabled = !off;
        b.buttonMode = !off;
    }

    private viewOutpost(outpost: any): void {
        this.close();
        BASE.ioLoadOutpost(outpost.x | 0, outpost.y | 0);
    }

    private showOnMap(outpost: any): void {
        this.close();
        MapRoom.ioFocus = new Point(outpost.x | 0, outpost.y | 0);
        GLOBAL.ShowMap();
        if (!GLOBAL._showMapWaiting && !GLOBAL.isMapOpen()) {
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
            return days + "d " + hours + "h";
        }
        if (hours > 0) {
            return hours + "h " + minutes + "m";
        }
        return minutes + "m";
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
        draw = (fill: uint): void => {
            b.graphics.clear();
            b.graphics.lineStyle(1, 5913114, 1);
            b.graphics.beginFill(fill, 1);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
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
