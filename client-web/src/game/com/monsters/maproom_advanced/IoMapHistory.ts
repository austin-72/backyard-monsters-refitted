import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextField } from "flash/text";
import { IoMapUi, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (QoL #77, 15 October): Back and Recent on the map room window's top edge, left of the Filters button.
 *
 *  - Back goes to where the map was before the last jump (Home, Jump, a search, a bookmark, the minimap, a click on
 *    the world map...), and again for the one before (up to 20). Dragging and zooming are not jumps.
 *  - Recent lists the last 5 places looked at this session (a yard's popup, an empty place's bubble, a place gone
 *    to from the sidebar), newest first; a click goes there.
 *
 * Back's places are kept while the map is open; Recent's for the session (MapRoomPopup records both).
 */
export class IoMapHistory extends Sprite {
    static {
        as3.fields(this, { _back: null, _recent: null, _panel: null, _onBack: null, _onGo: null });
    }

    private static readonly BUTTON_H: int = 22;

    private static readonly BACK_W: int = 62;

    private static readonly RECENT_W: int = 70;

    private static readonly PANEL_W: int = 230;

    private static readonly ROW_H: int = 22;

    private static readonly KEEP_BACK: int = 20;

    private static readonly KEEP_RECENT: int = 5;

    /** Where the map was before each jump, the newest last (cells). */
    private static s_back: any[] = [];

    /** The places looked at, the newest first: {x, y, name}. */
    private static s_recent: any[] = [];

    private _back: MovieClip;
    private _recent: MovieClip;
    private _panel: Sprite;
    private _onBack: Function;
    private _onGo: Function;

    /** onBack(cell: Point): go back to that cell. onGo(x, y): go to a recent place. */
    public $ctor(onBack?: Function, onGo?: Function): void {
        super.$ctor();
        this._onBack = onBack;
        this._onGo = onGo;
        // a new map window: its Back starts empty
        IoMapHistory.s_back = [];
        this._back = IoMapUi.button(KEYS.Get("io_map2_back"), IoMapHistory.BACK_W, IoMapHistory.BUTTON_H, (e: MouseEvent): void => {
            this.Close();
            let to: Point = IoMapHistory.pop();
            if (to && this._onBack != null) {
                this._onBack(to);
            }
            this.update();
        }, "gold", 10);
        this._back.name = "ioMapBack";
        this.addChild(this._back);
        this._recent = IoMapUi.button(KEYS.Get("io_map2_recent"), IoMapHistory.RECENT_W, IoMapHistory.BUTTON_H, (e: MouseEvent): void => {
            if (this._panel) {
                this.Close();
            } else {
                this.openRecent();
            }
        }, "gold", 10);
        this._recent.name = "ioMapRecent";
        this._recent.x = IoMapHistory.BACK_W + 6;
        this.addChild(this._recent);
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.addEventListener(MouseEvent.MOUSE_WHEEL, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.update();
    }

    /** How wide the two buttons are together. */
    public static get WIDTH(): int {
        return (IoMapHistory.BACK_W + 6 + IoMapHistory.RECENT_W) | 0;
    }

    // ---- what is kept
    /** The map is about to jump away from this cell: Back comes here. */
    public static push(from: Point): void {
        let last: Point = null;
        if (!from) {
            return;
        }
        last = IoMapHistory.s_back.length > 0 ? as3.as(IoMapHistory.s_back[IoMapHistory.s_back.length - 1], Point) : null;
        if (last && last.x == from.x && last.y == from.y) {
            return;
        }
        IoMapHistory.s_back.push(new Point(from.x | 0, from.y | 0));
        if (IoMapHistory.s_back.length > IoMapHistory.KEEP_BACK) {
            IoMapHistory.s_back.shift();
        }
    }

    public static pop(): Point {
        return IoMapHistory.s_back.length > 0 ? as3.as(IoMapHistory.s_back.pop(), Point) : null;
    }

    public static get canGoBack(): boolean {
        return IoMapHistory.s_back.length > 0;
    }

    /** A place was looked at (its name as the map says it). */
    public static viewed(cellX: int, cellY: int, name: string): void {
        let i: int = 0;
        while (i < IoMapHistory.s_recent.length) {
            if ((IoMapHistory.s_recent[i].x | 0) == cellX && (IoMapHistory.s_recent[i].y | 0) == cellY) {
                IoMapHistory.s_recent.splice(i, 1);
            } else {
                i++;
            }
        }
        IoMapHistory.s_recent.unshift({ "x": cellX, "y": cellY, "name": String(name || IoMapUi.coord(cellX, cellY)) });
        if (IoMapHistory.s_recent.length > IoMapHistory.KEEP_RECENT) {
            IoMapHistory.s_recent.length = IoMapHistory.KEEP_RECENT;
        }
    }

    public static get recent(): any[] {
        return IoMapHistory.s_recent;
    }

    // ---- the buttons and the list
    /** Back is dimmed with nothing to go back to; the open list follows what is kept. */
    public update(): void {
        if (this._back && this._back.setEnabled != null) {
            this._back.setEnabled(IoMapHistory.canGoBack);
        }
        if (this._panel) {
            this.openRecent();
        }
    }

    public get isOpen(): boolean {
        return this._panel != null;
    }

    private openRecent(): void {
        let w: int = IoMapHistory.PANEL_W;
        let y: int = 8;
        let title: TextField = null;
        let note: TextField = null;
        let i: int = 0;
        this.Close();
        this._panel = new Sprite();
        this._panel.name = "ioMapRecentPanel";
        title = IoMapUi.label(KEYS.Get("io_map2_recent_title"), 9, IoMapUi.MUTED, true, (w - 20) | 0);
        title.x = 10;
        title.y = y;
        this._panel.addChild(title);
        y += 18;
        if (IoMapHistory.s_recent.length == 0) {
            note = IoMapUi.label(KEYS.Get("io_map2_recent_none"), 10, IoMapUi.MUTED, false, (w - 20) | 0);
            note.multiline = true;
            note.wordWrap = true;
            note.height = 30;
            note.x = 10;
            note.y = y;
            this._panel.addChild(note);
            y += 32;
        }
        while (i < IoMapHistory.s_recent.length) {
            this._panel.addChild(this.row(i, IoMapHistory.s_recent[i], y, w));
            y += IoMapHistory.ROW_H;
            i++;
        }
        y += 6;
        IoMapUi.roundBox(this._panel.graphics, 0, 0, w, y, IoMapUi.PAPER, 1, IoMapUi.EDGE, 8, 2);
        // under the buttons, its left edge on Back's
        this._panel.x = 0;
        this._panel.y = IoMapHistory.BUTTON_H + 8;
        this.addChild(this._panel);
    }

    /** A recent place: its name, and where it is on the right. */
    private row(index: int, entry: any, y: int, w: int): Sprite {
        let row: Sprite = new Sprite();
        let name: TextField = IoMapUi.label(String(entry.name), 10, IoMapUi.INK, true, (w - 104) | 0);
        let where: TextField = IoMapUi.label(IoMapUi.coord(entry.x | 0, entry.y | 0), 9, IoMapUi.MUTED, false, 84, "right");
        let draw: Function = (over: boolean): void => {
            row.graphics.clear();
            row.graphics.beginFill(over ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w - 12, IoMapHistory.ROW_H);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, IoMapHistory.ROW_H - 0.5);
            row.graphics.lineTo(w - 12, IoMapHistory.ROW_H - 0.5);
            row.graphics.lineStyle();
            IoMapUi.pin(row.graphics, 8, 17, IoMapUi.GOLD, 12);
        };
        row.name = "ioMapRecentRow" + index;
        row.x = 6;
        row.y = y;
        draw(false);
        name.x = 16;
        name.y = 3;
        row.addChild(name);
        where.x = w - 12 - 88;
        where.y = 4;
        row.addChild(where);
        row.buttonMode = true;
        row.mouseChildren = false;
        row.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        row.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            this.Close();
            if (this._onGo != null) {
                this._onGo(entry.x | 0, entry.y | 0);
            }
        });
        return row;
    }

    /** A mouse press anywhere else closes the list (the map room calls this). */
    public ioStageDown(target: DisplayObject): void {
        if (this._panel && target && !this.contains(target)) {
            this.Close();
        }
    }

    public Close(): void {
        if (this._panel) {
            if (this._panel.parent) {
                this._panel.parent.removeChild(this._panel);
            }
            this._panel = null;
        }
    }

    public Cleanup(): void {
        this.Close();
        this._onBack = null;
        this._onGo = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
