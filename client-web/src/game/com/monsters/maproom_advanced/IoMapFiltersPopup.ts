import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { IoMapFilters, IoMapUi, IoQuests, SOUNDS } from "@game";

/**
 * Inferno-only: the world map's filters (IoMapFilters), behind a button on the map window's top edge, left
 * of the zoom buttons. The button opens a panel under it: whose yards show (you, your alliance, friendly,
 * hostile, other alliances, no alliance), main yards and / or outposts, and what else the world map draws
 * (your flinger range, your bookmarks). A dot on the button says when yards are filtered out.
 */
export class IoMapFiltersPopup extends Sprite {
    static {
        as3.fields(this, { _button: null, _mark: null, _panel: null, _onChange: null, _isWorld: null });
    }

    private static readonly SIZE: int = 26;

    private static readonly PANEL_W: int = 176;
    private _button: Sprite;
    private _mark: Shape;
    private _panel: Sprite;
    private _onChange: Function;
    private _isWorld: Function;

    /** onChange(): a filter changed. isWorld(): whether the world map is showing (else a note says where they apply). */
    public $ctor(onChange?: Function, isWorld?: Function): void {
        super.$ctor();
        this._onChange = onChange;
        this._isWorld = isWorld;
        this._button = new Sprite();
        this.drawButton(this._button.graphics);
        this._button.buttonMode = true;
        this._button.mouseChildren = false;
        this._button.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onButton));
        this._button.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            this._button.alpha = 0.8;
        });
        this._button.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            this._button.alpha = 1;
        });
        this.addChild(this._button);
        this._mark = new Shape();
        this._mark.graphics.lineStyle(1, 3875856, 1);
        this._mark.graphics.beginFill(16729640, 1);
        this._mark.graphics.drawCircle(IoMapFiltersPopup.SIZE - 3, 3, 4);
        this._mark.graphics.endFill();
        this._button.addChild(this._mark);
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.addEventListener(MouseEvent.MOUSE_WHEEL, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.update();
    }

    /** A round gold button like the yard's zoom buttons, with a funnel on it. */
    private drawButton(g: Graphics): void {
        let r: number = IoMapFiltersPopup.SIZE * 0.5;
        g.lineStyle(2, 7031314, 1, true);
        g.beginFill(14856743, 1);
        g.drawCircle(r, r, r - 1);
        g.endFill();
        g.lineStyle();
        g.beginFill(3875856, 1);
        g.moveTo(r - 7, r - 6);
        g.lineTo(r + 7, r - 6);
        g.lineTo(r + 1.8, r);
        g.lineTo(r + 1.8, r + 6);
        g.lineTo(r - 1.8, r + 8);
        g.lineTo(r - 1.8, r);
        g.lineTo(r - 7, r - 6);
        g.endFill();
    }

    public get isOpen(): boolean {
        return this._panel != null;
    }

    /** The dot on the button: some yards are filtered out. */
    private update(): void {
        this._mark.visible = IoMapFilters.active;
    }

    private onButton(e: MouseEvent): void {
        e.stopPropagation();
        SOUNDS.Play("click1");
        if (this._panel) {
            this.Close();
        } else {
            this.open();
        }
    }

    private open(): void {
        let y: int = 8;
        let w: int = (IoMapFiltersPopup.PANEL_W - 20) | 0;
        let i: int = 0;
        let box: MovieClip = null;
        let title: TextField = null;
        let close: Sprite = null;
        let note: TextField = null;
        let reset: MovieClip = null;
        this.Close();
        this._panel = new Sprite();
        title = IoMapUi.label("FILTERS", 10, IoMapUi.MUTED, true, 100);
        title.x = 10;
        title.y = y;
        this._panel.addChild(title);
        close = new Sprite();
        IoMapUi.hitArea(close.graphics, 18, 18);
        IoMapUi.cross(close.graphics, 5, 5, 8, IoMapUi.MUTED);
        close.x = IoMapFiltersPopup.PANEL_W - 24;
        close.y = y - 1;
        close.buttonMode = true;
        close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            this.Close();
        });
        this._panel.addChild(close);
        y += 20;
        if (this._isWorld != null && !this._isWorld()) {
            note = IoMapUi.label("They change the world map (zoom out to see it).", 10, IoMapUi.MUTED, false, w);
            note.multiline = true;
            note.wordWrap = true;
            note.height = 30;
            note.x = 10;
            note.y = y;
            this._panel.addChild(note);
            y += 30;
        }
        y += this.heading("SHOW PLAYERS", y);
        while (i < IoMapUi.RELATION_NAMES.length) {
            box = this.relationBox(i, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 20;
            i++;
        }
        y += 4;
        y += this.heading("YARDS", y);
        box = IoMapUi.checkbox("Main yards", IoMapFilters.mains, (on: boolean): void => {
            IoMapFilters.mains = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox("Outposts", IoMapFilters.outposts, (on: boolean): void => {
            IoMapFilters.outposts = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 24;
        y += this.heading("ON THE MAP", y);
        box = IoMapUi.checkbox("My flinger range", IoMapFilters.range, (on: boolean): void => {
            IoMapFilters.range = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox("Bookmarks", IoMapFilters.bookmarks, (on: boolean): void => {
            IoMapFilters.bookmarks = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 26;
        if (IoMapFilters.active) {
            reset = IoMapUi.button("Show everyone", w, 22, (e: MouseEvent): void => {
                IoMapFilters.reset();
                this.changed();
            }, "grey", 10);
            reset.x = 10;
            reset.y = y;
            this._panel.addChild(reset);
            y += 30;
        }
        y += 4;
        this._panel.graphics.clear();
        IoMapUi.roundBox(this._panel.graphics, 0, 0, IoMapFiltersPopup.PANEL_W, y, IoMapUi.PAPER, 1, IoMapUi.EDGE, 8, 2);
        // under the button, its right edge on the button's
        this._panel.x = IoMapFiltersPopup.SIZE - IoMapFiltersPopup.PANEL_W;
        this._panel.y = IoMapFiltersPopup.SIZE + 6;
        this.addChild(this._panel);
    }

    private heading(text: string, y: int): int {
        let t: TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, true, (IoMapFiltersPopup.PANEL_W - 20) | 0);
        t.x = 10;
        t.y = y + 2;
        this._panel.addChild(t);
        return 18;
    }

    private relationBox(relation: int, w: int): MovieClip {
        return IoMapUi.checkbox(as3.str(IoMapUi.RELATION_NAMES[relation]), Boolean(IoMapFilters.relations[relation]), (on: boolean): void => {
            IoMapFilters.relations[relation] = on;
            this.changed();
        }, w, IoMapUi.relationColour(relation) | 0);
    }

    private changed(): void {
        IoMapFilters.changed();
        IoQuests.once("map_filters");
        // (the quest book)
        this.update();
        if (this._onChange != null) {
            this._onChange();
        }
        // "Show everyone" comes and goes: the panel again, as it is now.
        if (this._panel) {
            this.open();
        }
    }

    /** A mouse press anywhere else closes the panel (the map room calls this). */
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
        this._onChange = null;
        this._isWorld = null;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
