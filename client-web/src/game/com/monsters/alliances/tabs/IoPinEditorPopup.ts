import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, AllianceConstants, GLOBAL, IoAllianceUi, KEYS, POPUPSETTINGS, SOUNDS, frame_CLIP } from "@game";

/**
 * Inferno-only: putting up a pin on the alliance board, or changing one (the Board tab's New pin and Edit,
 * and the map's Share bubble: "Pin to alliance board", which fills the place in). A title, the words, and
 * a place on the map if the pin points somewhere: x and y as the map shows them (the minus is optional).
 */
export class IoPinEditorPopup extends ASObject {
    private static readonly W: int = 520;

    private static readonly H: int = 426;

    private static readonly PAD: int = 26;

    private static _mc: MovieClip = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static get isOpen(): boolean {
        return IoPinEditorPopup._mc != null;
    }

    /**
     * `pin`: the pin to change ({ id, title, body, x, y, world_id }), or the place a new one points at
     * ({ x, y, world_id } with no id), or null. `onSaved()` once it is on the board.
     */
    public static Show(pin: any, onSaved: Function = null): void {
        let editing: boolean = false;
        let mc: MovieClip = null;
        let titleIn: TextField = null;
        let bodyIn: TextField = null;
        let xIn: TextField = null;
        let yIn: TextField = null;
        let world: string = null;
        let save: MovieClip = null;
        let busy: boolean = false;
        IoPinEditorPopup.Close(false);
        editing = pin != null && (pin.id | 0) > 0;
        mc = new MovieClip();
        mc.name = "ioPinEditor";
        let frame: frame_CLIP = as3.as(mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoPinEditorPopup.W;
        frame.height = IoPinEditorPopup.H;
        frame.x = -((IoPinEditorPopup.W / 2) | 0);
        frame.y = -((IoPinEditorPopup.H / 2) | 0);
        frame.Setup(true, (e: MouseEvent = null): void => {
            IoPinEditorPopup.Close(true);
        });
        let left: int = (frame.x + IoPinEditorPopup.PAD) | 0;
        let top: int = (frame.y + 22) | 0;
        let innerW: int = (IoPinEditorPopup.W - IoPinEditorPopup.PAD * 2) | 0;

        let title: TextField = new TextField();
        title.selectable = false;
        title.mouseEnabled = false;
        title.embedFonts = true;
        title.antiAliasType = AntiAliasType.NORMAL;
        title.width = innerW;
        title.height = 32;
        let tf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        tf.align = TextFormatAlign.CENTER;
        title.defaultTextFormat = tf;
        title.text = KEYS.Get(editing ? "io_alliance_pin_edit_title" : "io_alliance_pin_new_title");
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = left;
        title.y = top;
        mc.addChild(title);

        let y: int = (top + 44) | 0;
        // (the fields on the window's beige, as the alliance forms have them)
        let panel: Sprite = new Sprite();
        panel.graphics.lineStyle(1, AllianceConstants.BORDER_COLOR, 1);
        panel.graphics.beginFill(AllianceConstants.INNER_BG, 1);
        panel.graphics.drawRect(0, 0, innerW + 20, 284);
        panel.graphics.endFill();
        panel.x = left - 10;
        panel.y = y - 8;
        mc.addChild(panel);
        IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_title"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
        titleIn = IoPinEditorPopup.field(mc, left, (y + 20) | 0, innerW, 30, 80, false);
        titleIn.name = "ioPinTitle";
        y += 58;
        IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_body"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
        bodyIn = IoPinEditorPopup.field(mc, left, (y + 20) | 0, innerW, 118, 600, true);
        bodyIn.name = "ioPinBody";
        y += 146;
        IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_field_place"), left, y, 12, AllianceConstants.IO_INK, true, innerW);
        IoAllianceUi.addText(mc, "X", left, (y + 26) | 0, 12, AllianceConstants.IO_INK, true, 16);
        xIn = IoPinEditorPopup.field(mc, (left + 18) | 0, (y + 20) | 0, 70, 30, 4, false);
        xIn.restrict = "0-9\\-";
        xIn.name = "ioPinX";
        IoAllianceUi.addText(mc, "Y", (left + 104) | 0, (y + 26) | 0, 12, AllianceConstants.IO_INK, true, 16);
        yIn = IoPinEditorPopup.field(mc, (left + 122) | 0, (y + 20) | 0, 70, 30, 4, false);
        yIn.restrict = "0-9\\-";
        yIn.name = "ioPinY";
        IoAllianceUi.addText(mc, KEYS.Get("io_alliance_pin_place_hint"), (left + 206) | 0, (y + 20) | 0, 10, AllianceConstants.IO_MUTED, false, (innerW - 206) | 0, "left", false, true);

        world = "";
        if (pin) {
            titleIn.text = pin.title ? String(pin.title) : "";
            bodyIn.text = pin.body ? String(pin.body) : "";
            if (pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined) {
                xIn.text = GLOBAL.ioCoord(pin.x | 0);
                yIn.text = GLOBAL.ioCoord(pin.y | 0);
                world = pin.world_id ? String(pin.world_id) : "";
            }
        }

        save = null;
        let cancel: MovieClip = null;
        busy = false;
        save = IoAllianceUi.button(KEYS.Get(editing ? "io_alliance_pin_save" : "io_alliance_pin_post"), 150, 34, (e: MouseEvent): void => {
            if (busy) {
                return;
            }
            let t: string = IoPinEditorPopup.trim(titleIn.text);
            if (!t) {
                GLOBAL.Message(KEYS.Get("io_alliance_pin_need_title"));
                return;
            }
            let xs: string = IoPinEditorPopup.trim(xIn.text).replace(/-/g, "");
            let ys: string = IoPinEditorPopup.trim(yIn.text).replace(/-/g, "");
            if ((xs == "") != (ys == "")) {
                GLOBAL.Message(KEYS.Get("io_alliance_pin_need_both"));
                return;
            }
            let data: any = { "title": t, "body": IoPinEditorPopup.trim(bodyIn.text) };
            if (editing) {
                data.id = pin.id | 0;
            }
            if (xs != "") {
                data.x = Number(xs) | 0;
                data.y = Number(ys) | 0;
                // (a place typed in is on the player's world; one from the map keeps the map's)
                if (world && (Number(xs) | 0) == (pin.x | 0) && (Number(ys) | 0) == (pin.y | 0)) {
                    data.world = world;
                }
            }
            busy = true;
            Object(save).setEnabled(false);
            ALLIANCES.ioSavePin(data, (response: any): void => {
                busy = false;
                if (IoPinEditorPopup._mc == mc) {
                    Object(save).setEnabled(true);
                }
                if (IoAllianceUi.failed(response)) {
                    return;
                }
                IoPinEditorPopup.Close(false);
                if (onSaved != null) {
                    onSaved();
                } else {
                    GLOBAL.Message(KEYS.Get("io_alliance_pin_done"));
                }
            });
        }, "gold", 12);
        save.name = "ioPinSave";
        cancel = IoAllianceUi.button(KEYS.Get("btn_cancel"), 120, 34, (e: MouseEvent): void => {
            IoPinEditorPopup.Close(true);
        }, "grey", 12);
        save.x = frame.x + IoPinEditorPopup.W - IoPinEditorPopup.PAD - 150;
        cancel.x = save.x - 132;
        save.y = cancel.y = frame.y + IoPinEditorPopup.H - IoPinEditorPopup.PAD - 34;
        mc.addChild(cancel);
        mc.addChild(save);

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
        IoPinEditorPopup._mc = mc;
        if (mc.stage) {
            mc.stage.focus = titleIn;
        }
    }

    public static Close(sound: boolean = true): void {
        if (IoPinEditorPopup._mc == null) {
            return;
        }
        if (sound) {
            SOUNDS.Play("close");
        }
        GLOBAL.BlockerRemove();
        if (IoPinEditorPopup._mc.parent) {
            IoPinEditorPopup._mc.parent.removeChild(IoPinEditorPopup._mc);
        }
        IoPinEditorPopup._mc = null;
    }

    private static trim(s: string): string {
        return s ? s.replace(/^\s+|\s+$/g, "") : "";
    }

    /** A white box with a text field to type in. */
    private static field(parent: MovieClip, x: int, y: int, w: int, h: int, maxChars: int, multiline: boolean): TextField {
        let t: TextField = null;
        let bg: Sprite = new Sprite();
        bg.graphics.lineStyle(1, 8947848, 1);
        bg.graphics.beginFill(16777215, 1);
        bg.graphics.drawRoundRect(0, 0, w, h, 4, 4);
        bg.graphics.endFill();
        bg.x = x;
        bg.y = y;
        parent.addChild(bg);
        t = new TextField();
        t.type = TextFieldType.INPUT;
        t.selectable = true;
        t.maxChars = maxChars;
        t.defaultTextFormat = new TextFormat("Verdana", 13, 0x222222);
        t.x = x + 6;
        t.width = w - 12;
        if (multiline) {
            t.multiline = true;
            t.wordWrap = true;
            t.y = y + 5;
            t.height = h - 10;
        } else {
            t.y = y + (((h - 20) / 2) | 0);
            t.height = 20;
        }
        parent.addChild(t);
        // (clicking the box's edge still types in it)
        bg.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (t.stage) {
                t.stage.focus = t;
            }
        });
        return t;
    }
}
