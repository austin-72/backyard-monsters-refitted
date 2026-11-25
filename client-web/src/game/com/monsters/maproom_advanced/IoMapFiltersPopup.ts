import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, Graphics, MovieClip, Shape, Sprite } from "flash/display";
import { Event, FocusEvent, MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { IoMapFilters, IoMapUi, IoQuests, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: the world map's filters (IoMapFilters), behind a button on the map window's top edge, left
 * of the zoom buttons. The button opens a panel under it: whose yards show (you, your alliance, friendly,
 * hostile, other alliances, no alliance), main yards and / or outposts, and what else the world map draws
 * (your flinger range, your bookmarks). A dot on the button says when yards are filtered out.
 *
 * (QoL #73, 15 October) A second column, Targets: a level range, hide protected, hide locked, only in my flinger
 * range, and whether the yards these leave out are faded or hidden. They work on the map as well as the world map.
 *
 * (QoL #72, 15 October) "On the map" has Damaged tribe yards too (IoMapFilters.camps).
 *
 * (QoL #235) Its words in the player's language (io_tr_mapf_*, and IoMapUi.relationName).
 */
export class IoMapFiltersPopup extends Sprite {
    static {
        as3.fields(this, { _button: null, _mark: null, _panel: null, _onChange: null, _isWorld: null });
    }

    private static readonly SIZE: int = 26;

    private static readonly PANEL_W: int = 176;

    /** (QoL #73) the panel with its second column (Targets). */
    private static readonly WIDE_W: int = 352;
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
        title = IoMapUi.label(KEYS.Get("io_tr_mapf_title"), 10, IoMapUi.MUTED, true, 100);
        title.x = 10;
        title.y = y;
        this._panel.addChild(title);
        close = new Sprite();
        IoMapUi.hitArea(close.graphics, 18, 18);
        IoMapUi.cross(close.graphics, 5, 5, 8, IoMapUi.MUTED);
        close.x = IoMapFiltersPopup.WIDE_W - 24;
        close.y = y - 1;
        close.buttonMode = true;
        close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            this.Close();
        });
        this._panel.addChild(close);
        y += 20;
        if (this._isWorld != null && !this._isWorld()) {
            note = IoMapUi.label(KEYS.Get("io_tr_mapf_world_note"), 10, IoMapUi.MUTED, false, w);
            note.multiline = true;
            note.wordWrap = true;
            note.height = 30;
            note.x = 10;
            note.y = y;
            this._panel.addChild(note);
            y += 30;
        }
        y += this.heading(KEYS.Get("io_tr_mapf_players"), y);
        while (i < IoMapUi.RELATION_NAMES.length) {
            box = this.relationBox(i, w);
            box.x = 10;
            box.y = y;
            this._panel.addChild(box);
            y += 20;
            i++;
        }
        y += 4;
        y += this.heading(KEYS.Get("io_tr_mapf_yards"), y);
        box = IoMapUi.checkbox(KEYS.Get("io_tr_mapf_mains"), IoMapFilters.mains, (on: boolean): void => {
            IoMapFilters.mains = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox(KEYS.Get("io_tr_mapf_outposts"), IoMapFilters.outposts, (on: boolean): void => {
            IoMapFilters.outposts = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 24;
        y += this.heading(KEYS.Get("io_tr_mapf_on_map"), y);
        box = IoMapUi.checkbox(KEYS.Get("io_tr_mapf_range"), IoMapFilters.range, (on: boolean): void => {
            IoMapFilters.range = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox(KEYS.Get("io_tr_mapf_bookmarks"), IoMapFilters.bookmarks, (on: boolean): void => {
            IoMapFilters.bookmarks = on;
            this.changed();
        }, w);
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        // (QoL #72: damaged tribe yards and those ready to take over, on the world map and the minimap)
        box = IoMapUi.checkbox(KEYS.Get("io_map3_filter_camps"), IoMapFilters.camps, (on: boolean): void => {
            IoMapFilters.camps = on;
            this.changed();
        }, w);
        box.name = "ioMap3FilterCamps";
        box.x = 10;
        box.y = y;
        this._panel.addChild(box);
        y += 26;
        // (QoL #73: the second column)
        let yR: int = this.targets(IoMapFiltersPopup.PANEL_W + 6, 8, w);
        if (yR > y) {
            y = yR;
        }
        if (IoMapFilters.active) {
            reset = IoMapUi.button(KEYS.Get("io_tr_mapf_reset"), w, 22, (e: MouseEvent): void => {
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
        IoMapUi.roundBox(this._panel.graphics, 0, 0, IoMapFiltersPopup.WIDE_W, y, IoMapUi.PAPER, 1, IoMapUi.EDGE, 8, 2);
        // (the rule between the two columns)
        this._panel.graphics.lineStyle(1, IoMapUi.RULE, 1);
        this._panel.graphics.moveTo(IoMapFiltersPopup.PANEL_W, 28);
        this._panel.graphics.lineTo(IoMapFiltersPopup.PANEL_W, y - 10);
        this._panel.graphics.lineStyle();
        this._panel.name = "ioMapFiltersPanel";
        // under the button, its right edge on the button's
        this._panel.x = IoMapFiltersPopup.SIZE - IoMapFiltersPopup.WIDE_W;
        this._panel.y = IoMapFiltersPopup.SIZE + 6;
        this.addChild(this._panel);
    }

    private heading(text: string, y: int, x: int = 10): int {
        let t: TextField = IoMapUi.label(text, 9, IoMapUi.MUTED, true, (IoMapFiltersPopup.PANEL_W - 20) | 0);
        t.x = x;
        t.y = y + 2;
        this._panel.addChild(t);
        return 18;
    }

    /**
     * (QoL #73) The Targets column, from (x, y): the level range (two boxes to type in; empty is no limit), hide
     * protected, hide locked, only in my flinger range, and fade or hide what they leave out. Returns its bottom.
     */
    private targets(x: int, y: int, w: int): int {
        let box: MovieClip = null;
        let label: TextField = null;
        let to: TextField = null;
        let note: TextField = null;
        y += 20;
        y += this.heading(KEYS.Get("io_map2_filters_targets"), y, x);
        label = IoMapUi.label(KEYS.Get("io_map2_filters_level"), 11, IoMapUi.INK, false, 50);
        label.x = x;
        label.y = y + 2;
        this._panel.addChild(label);
        let min: TextField = this.levelBox("ioMapFilterMin", IoMapFilters.minLevel, x + 46, y, (n: int): void => {
            IoMapFilters.minLevel = n;
        });
        to = IoMapUi.label(KEYS.Get("io_map2_filters_to"), 11, IoMapUi.INK, false, 26, "center");
        to.x = min.x + min.width + 2;
        to.y = y + 2;
        this._panel.addChild(to);
        this.levelBox("ioMapFilterMax", IoMapFilters.maxLevel, to.x + to.width + 2, y, (n: int): void => {
            IoMapFilters.maxLevel = n;
        });
        y += 24;
        box = IoMapUi.checkbox(KEYS.Get("io_map2_filters_protected"), IoMapFilters.hideProtected, (on: boolean): void => {
            IoMapFilters.hideProtected = on;
            this.changed();
        }, w);
        box.name = "ioMapFilterProtected";
        box.x = x;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox(KEYS.Get("io_map2_filters_locked"), IoMapFilters.hideLocked, (on: boolean): void => {
            IoMapFilters.hideLocked = on;
            this.changed();
        }, w);
        box.name = "ioMapFilterLocked";
        box.x = x;
        box.y = y;
        this._panel.addChild(box);
        y += 20;
        box = IoMapUi.checkbox(KEYS.Get("io_map2_filters_range"), IoMapFilters.inRangeOnly, (on: boolean): void => {
            IoMapFilters.inRangeOnly = on;
            this.changed();
        }, w);
        box.name = "ioMapFilterInRange";
        box.x = x;
        box.y = y;
        this._panel.addChild(box);
        y += 24;
        y += this.heading(KEYS.Get("io_map2_filters_left_out"), y, x);
        box = IoMapUi.checkbox(KEYS.Get("io_map2_filters_fade"), IoMapFilters.dim, (on: boolean): void => {
            IoMapFilters.dim = on;
            this.changed();
        }, w);
        box.name = "ioMapFilterFade";
        box.x = x;
        box.y = y;
        this._panel.addChild(box);
        y += 22;
        note = IoMapUi.label(KEYS.Get("io_map2_filters_note"), 9, IoMapUi.MUTED, false, w);
        note.multiline = true;
        note.wordWrap = true;
        note.height = 28;
        note.x = x;
        note.y = y;
        this._panel.addChild(note);
        y += 30;
        return y;
    }

    /** (QoL #73) A box for a level (1-99; empty or 0: no limit). Typing applies at once; leaving it draws the panel again. */
    private levelBox(name: string, value: int, x: number, y: number, set: Function): TextField {
        let field: TextField = IoMapUi.input(11, IoMapUi.INK, 30, 2);
        field.name = name;
        field.restrict = "0-9";
        field.text = value > 0 ? String(value) : "";
        field.border = true;
        field.borderColor = IoMapUi.EDGE;
        field.background = true;
        field.backgroundColor = 16776175;
        field.height = 18;
        field.x = x;
        field.y = y;
        field.addEventListener(Event.CHANGE, (e: Event): void => {
            set(Math.max(0, Math.min(IoMapFilters.LEVEL_TOP, Number(field.text) | 0)) | 0);
            IoMapFilters.changed();
            this.update();
            if (this._onChange != null) {
                this._onChange();
            }
        });
        field.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            // ("Show everyone" comes and goes with it)
            if (this._panel && this._panel.contains(field)) {
                this.open();
            }
        });
        this._panel.addChild(field);
        return field;
    }

    private relationBox(relation: int, w: int): MovieClip {
        return IoMapUi.checkbox(IoMapUi.relationName(relation), Boolean(IoMapFilters.relations[relation]), (on: boolean): void => {
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
