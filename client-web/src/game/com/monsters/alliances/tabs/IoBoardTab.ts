import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceTabBase, Button_CLIP, GLOBAL, IoAllianceUi, IoPinEditorPopup, IoScrollPane, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: the Board tab (the user's design of 2 October). The leader and officers pin messages,
 * each with a title, words and (if they like) a place on the map; Jump opens the map there when it is on
 * the player's own world. At most 50 pins, each kept 30 days; the leader and officers can change, remove
 * and reorder them. Opening the tab clears its count.
 */
export class IoBoardTab extends AllianceTabBase {
    static {
        as3.fields(this, { _pane: null, _pins: null, _canEdit: false, _max: 50, _days: 30, _myWorld: "", _count: null });
    }

    private static readonly PAD: int = 12;

    private static readonly LIST_Y: int = 54;
    private _pane: IoScrollPane;
    private _pins: any[];
    private _canEdit: boolean;
    private _max: int;
    private _days: int;
    private _myWorld: string;
    private _count: TextField;

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        let title: TextField = as3.as(this.addChild(new TextField()), TextField);
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = 300;
        title.height = 32;
        title.defaultTextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        title.text = KEYS.Get("io_alliance_board_title");
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = IoBoardTab.PAD;
        title.y = 12;
        this._count = IoAllianceUi.addText(this, "", (IoBoardTab.PAD + 4) | 0, 0, 11, AllianceConstants.IO_MUTED, false, 400);
        this._count.y = 20;
        this._pane = new IoScrollPane((this.CONTENT_W - IoBoardTab.PAD * 2) | 0, (this.CONTENT_H - IoBoardTab.LIST_Y - IoBoardTab.PAD) | 0);
        this._pane.x = IoBoardTab.PAD;
        this._pane.y = IoBoardTab.LIST_Y;
        this.addChild(this._pane);
        this.load();
    }

    /** (also after a pin is put up, changed, moved or removed) */
    public load(): void {
        ALLIANCES.ioLoadPins(true, (response: any): void => {
            if (this.stage == null) {
                return;
            }
            if (response == null || response.error) {
                this._pins = [];
                this._draw(response && response.error ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }
            this._pins = as3.as(response.pins, Array) || [];
            this._canEdit = response.can_edit == true;
            this._max = response.max | 0 || 50;
            this._days = response.days | 0 || 30;
            this._myWorld = response.my_world ? String(response.my_world) : "";
            this._draw(null);
            if (ALLIANCES.ioUnreadPins() > 0) {
                ALLIANCES.ioClearUnreadPins();
                ALLIANCEWINDOW.RefreshTabLabels();
            }
        });
    }

    private _draw(error: string): void {
        let c: Sprite = this._pane.content;
        while (c.numChildren > 0) {
            c.removeChildAt(0);
        }
        c.graphics.clear();
        let old: Sprite = as3.as(this.getChildByName("ioNewPin"), Sprite);
        if (old) {
            this.removeChild(old);
        }
        this._count.x = IoBoardTab.PAD + 4 + 260;
        this._count.text = KEYS.Get("io_alliance_board_count", { "v1": String(this._pins.length), "v2": String(this._max), "v3": String(this._days) });
        if (this._canEdit) {
            let add: Button_CLIP = new Button_CLIP();
            add.Setup(KEYS.Get("io_alliance_new_pin"), false, 170, 34);
            add.x = this.CONTENT_W - IoBoardTab.PAD - 170;
            add.y = 10;
            add.name = "ioNewPin";
            add.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                if (this._pins.length >= this._max) {
                    GLOBAL.Message(KEYS.Get("io_alliance_board_full", { "v1": String(this._max) }));
                    return;
                }
                IoPinEditorPopup.Show(null, as3.bind(this, this.load));
            });
            this.addChild(add);
        }
        let w: int = this._pane.innerWidth;
        if (error || this._pins.length == 0) {
            let empty: Sprite = new Sprite();
            IoAllianceUi.card(empty.graphics, 0, 0, w, 90, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            let msg: string = error ? error : KEYS.Get(this._canEdit ? "io_alliance_no_pins_staff" : "io_alliance_no_pins");
            IoAllianceUi.addText(empty, msg, 16, 16, 13, AllianceConstants.IO_MUTED, false, (w - 32) | 0, "left", false, true);
            c.addChild(empty);
            this._pane.refresh(90);
            return;
        }
        let y: int = 0;
        for (let i: int = 0; i < this._pins.length; i++) {
            let card: Sprite = this._card(this._pins[i], i, w);
            card.y = y;
            c.addChild(card);
            y = (y + ((card.height | 0) + 8)) | 0;
        }
        this._pane.refresh(y);
    }

    /** One pin: its title, who put it up and when, its words, its place with Jump, and the staff's buttons. */
    private _card(pin: any, index: int, w: int): Sprite {
        let px: int = 0;
        let py: int = 0;
        let world: string = null;
        let c: Sprite = new Sprite();
        c.name = "ioPin" + (pin.id | 0);
        let hasPlace: boolean = pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined;
        let controlsW: int = (this._canEdit ? 4 * 58 + 6 : 0) | 0;
        IoAllianceUi.addText(c, String(pin.title), 14, 10, 14, AllianceConstants.IO_INK, true, (w - 28 - controlsW) | 0);
        let meta: string = KEYS.Get("io_alliance_pin_by", { "v1": String(pin.author), "v2": IoAllianceUi.ago(Number(pin.created)) });
        if (Number(pin.updated) > Number(pin.created) + 30) {
            meta += "  ·  " + KEYS.Get("io_alliance_pin_edited", { "v1": IoAllianceUi.ago(Number(pin.updated)) });
        }
        meta += "  ·  " + KEYS.Get("io_alliance_pin_expires", { "v1": IoAllianceUi.span(Math.max(0, (pin.expires | 0) - GLOBAL.Timestamp()) | 0) });
        IoAllianceUi.addText(c, meta, 14, 32, 10, AllianceConstants.IO_MUTED, false, (w - 28 - controlsW) | 0);
        let y: int = 52;
        if (pin.body) {
            let body: TextField = IoAllianceUi.addText(c, String(pin.body), 14, y, 12, 3355443, false, (w - 28) | 0, "left", false, true);
            y = (y + ((body.height | 0) + 4)) | 0;
        }
        if (hasPlace) {
            px = pin.x | 0;
            py = pin.y | 0;
            world = pin.world_id ? String(pin.world_id) : "";
            let elsewhere: boolean = Boolean(world && this._myWorld && world != this._myWorld);
            let place: string = KEYS.Get("io_alliance_pin_place", { "v1": IoAllianceUi.coord(px, py) });
            if (pin.world_name) {
                place += " (" + String(pin.world_name) + ")";
            }
            IoAllianceUi.addText(c, place, 14, (y + 5) | 0, 12, AllianceConstants.IO_INK, true, (w - 160) | 0);
            let jump: MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), 110, 26, (e: MouseEvent): void => {
                IoAllianceUi.jump(px, py, world);
            }, "gold");
            jump.x = w - 124;
            jump.y = y;
            jump.name = "ioJump";
            if (elsewhere) {
                Object(jump).setEnabled(false);
                IoAllianceUi.addText(c, KEYS.Get("io_alliance_other_world_short"), (w - 290) | 0, (y + 6) | 0, 10, AllianceConstants.IO_MUTED, false, 160, IoAllianceUi.RIGHT);
            }
            c.addChild(jump);
            y += 32;
        }
        let h: int = (y + 8) | 0;
        c.graphics.clear();
        IoAllianceUi.card(c.graphics, 0, 0, w, h, (index == 0 ? 0xFFF6DC : AllianceConstants.IO_CARD) >>> 0, AllianceConstants.IO_CARD_EDGE);
        if (this._canEdit) {
            let bx: int = (w - controlsW) | 0;
            let buttons: any[] = [["io_alliance_up", "ioUp", (e: MouseEvent): void => {
                this._move(pin, "up");
            }, index > 0], ["io_alliance_down", "ioDown", (e: MouseEvent): void => {
                this._move(pin, "down");
            }, index < this._pins.length - 1], ["io_alliance_edit", "ioEdit", (e: MouseEvent): void => {
                IoPinEditorPopup.Show(pin, as3.bind(this, this.load));
            }, true], ["io_alliance_remove", "ioRemove", (e: MouseEvent): void => {
                this._remove(pin);
            }, true]];
            for (let b of as3.values(buttons)) {
                let btn: MovieClip = IoAllianceUi.button(KEYS.Get(String(b[0])), 54, 22, as3.as(b[2], Function), "grey", 10);
                btn.x = bx;
                btn.y = 9;
                btn.name = String(b[1]);
                if (!b[3]) {
                    Object(btn).setEnabled(false);
                }
                c.addChild(btn);
                bx += 58;
            }
        }
        return c;
    }

    private _move(pin: any, dir: string): void {
        ALLIANCES.ioMovePin(pin.id | 0, dir, (response: any): void => {
            if (!IoAllianceUi.failed(response) && this.stage != null) {
                this.load();
            }
        });
    }

    private _remove(pin: any): void {
        GLOBAL.Message(KEYS.Get("io_alliance_remove_confirm", { "v1": String(pin.title) }), KEYS.Get("btn_yes"), (): void => {
            ALLIANCES.ioDeletePin(pin.id | 0, (response: any): void => {
                if (!IoAllianceUi.failed(response) && this.stage != null) {
                    this.load();
                }
            });
        }, null, KEYS.Get("btn_no"), null, null);
    }
}
