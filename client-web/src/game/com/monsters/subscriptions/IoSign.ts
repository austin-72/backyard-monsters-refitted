import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFieldAutoSize, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, BDECORATION, Button_CLIP, GLOBAL, KEYS, MAP, POPUPSETTINGS, SOUNDS, frame_CLIP } from "@game";

/**
 * Inferno-only (10 October): the D.A.V.E. Club's Sign (building 150), a free decoration (up to 10 in a yard)
 * with a message on it. Its owner writes it (the Sign's "Write" button: BUILDINGINFO), at most MAX characters;
 * anyone looking at the yard (a visitor, an attacker, its owner) clicks it to read it. The message is kept with
 * the sign in the yard's building data ("msg"); the server keeps it plain and short (services/yard/signs.ts).
 */
export class IoSign extends BDECORATION {
    static {
        as3.fields(this, { _ioMsg: "" });
    }

    public static readonly TYPE: int = 150;

    public static readonly MAX: int = 80;

    private static _window: MovieClip = null;

    public _ioMsg: string;

    public $ctor(param1?: int): void {
        super.$ctor(param1);
    }

    public static IsSign(type: int): boolean {
        return GLOBAL.INFERNO_ONLY && type == IoSign.TYPE;
    }

    public static clean(raw: string): string {
        return String(raw == null ? "" : raw).replace(/[\u0000-\u001f\u007f<>]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").substr(0, IoSign.MAX);
    }

    public override Setup(building: any): void {
        super.Setup(building);
        this._ioMsg = IoSign.clean(building && building.msg != null ? String(building.msg) : "");
    }

    public override Export(): any {
        let o: any = super.Export();
        if (this._ioMsg) {
            o.msg = this._ioMsg;
        }
        return o;
    }

    /** The owner's click selects it (its buttons: Write, Move, ...); anyone else's reads it. */
    public override Click(param1: MouseEvent = null): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !MAP._dragged) {
            super.Click(param1);
            return;
        }
        if (!MAP._dragged) {
            IoSign.Read(this);
        }
    }

    // ---- the windows
    private static label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = width;
        t.multiline = true;
        t.wordWrap = true;
        let f: TextFormat = new TextFormat("Verdana", size, color, bold);
        f.align = align;
        t.defaultTextFormat = f;
        t.text = text;
        t.autoSize = TextFieldAutoSize.LEFT;
        return t;
    }

    private static window(title: string, w: int, h: int): MovieClip {
        IoSign.Close();
        let mc: MovieClip = new MovieClip();
        mc.name = "ioSignWindow";
        let left: int = (-(w / 2)) | 0;
        let top: int = (-(h / 2)) | 0;
        let frame: frame_CLIP = as3.as(mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = w;
        frame.height = h;
        frame.x = left;
        frame.y = top;
        frame.Setup(true, IoSign.Close);
        let t: TextField = as3.as(mc.addChild(new TextField()), TextField);
        t.selectable = false;
        t.mouseEnabled = false;
        t.embedFonts = true;
        t.antiAliasType = AntiAliasType.NORMAL;
        t.width = w - 60;
        t.height = 32;
        let tf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        tf.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = tf;
        t.text = title;
        t.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        t.x = left + 30;
        t.y = top + 20;
        IoSign._window = mc;
        return mc;
    }

    private static open(mc: MovieClip): void {
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(mc);
        POPUPSETTINGS.AlignToCenter(mc);
        POPUPSETTINGS.ScaleUp(mc);
    }

    public static Close(e: MouseEvent = null): void {
        if (!IoSign._window) {
            return;
        }
        GLOBAL.BlockerRemove();
        if (IoSign._window.parent) {
            IoSign._window.parent.removeChild(IoSign._window);
        }
        IoSign._window = null;
    }

    /** The message, for anyone. */
    public static Read(sign: IoSign): void {
        SOUNDS.Play("click1");
        let w: int = 420;
        let msg: string = sign._ioMsg;
        let body: TextField = IoSign.label(msg ? msg : KEYS.Get("io_t3m_sg_empty"), 15, msg ? 0x2A1A08 : 0x7A6A58, msg != "", w - 80, TextFormatAlign.CENTER);
        let h: int = Math.max(180, body.height + 156) | 0;
        let mc: MovieClip = IoSign.window(KEYS.Get("bdg_sign"), w, h);
        let board: Sprite = new Sprite();
        board.graphics.lineStyle(2, 0x5A3A1A, 1);
        board.graphics.beginFill(0xF3E2BE, 1);
        board.graphics.drawRoundRect(-w / 2 + 30, -h / 2 + 62, w - 60, body.height + 24, 10, 10);
        board.graphics.endFill();
        mc.addChild(board);
        body.x = -w / 2 + 40;
        body.y = -h / 2 + 74;
        mc.addChild(body);
        let ok: Button_CLIP = as3.as(mc.addChild(new Button_CLIP()), Button_CLIP);
        ok.Setup(KEYS.Get("btn_close"), false, 120, 32);
        ok.x = -60;
        ok.y = h / 2 - 54;
        ok.addEventListener(MouseEvent.CLICK, IoSign.Close);
        IoSign.open(mc);
    }

    /** The owner writes it (the Sign's Write button). */
    public static Write(sign: IoSign): void {
        if (!sign || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        SOUNDS.Play("click1");
        let w: int = 460;
        let h: int = 250;
        let mc: MovieClip = IoSign.window(KEYS.Get("io_t3m_sg_write_title"), w, h);
        let hint: TextField = IoSign.label(KEYS.Get("io_t3m_sg_hint", { "v1": IoSign.MAX }), 11, 0x3A2A18, false, w - 60, TextFormatAlign.CENTER);
        hint.x = -w / 2 + 30;
        hint.y = -h / 2 + 56;
        mc.addChild(hint);
        let bg: Sprite = new Sprite();
        bg.graphics.lineStyle(2, 0x5A3A1A, 1);
        bg.graphics.beginFill(0xFFFBEF, 1);
        bg.graphics.drawRoundRect(-w / 2 + 30, -h / 2 + 96, w - 60, 66, 8, 8);
        bg.graphics.endFill();
        mc.addChild(bg);
        let input: TextField = new TextField();
        input.name = "ioSignInput";
        input.type = TextFieldType.INPUT;
        input.selectable = true;
        input.multiline = true;
        input.wordWrap = true;
        input.maxChars = IoSign.MAX;
        input.width = w - 76;
        input.height = 58;
        input.defaultTextFormat = new TextFormat("Verdana", 14, 0x2A1A08, true);
        input.text = sign._ioMsg;
        input.x = -w / 2 + 38;
        input.y = -h / 2 + 100;
        mc.addChild(input);
        let count: TextField = IoSign.label("", 10, 0x7A6A58, false, w - 60, TextFormatAlign.RIGHT);
        count.x = -w / 2 + 30;
        count.y = -h / 2 + 166;
        mc.addChild(count);
        let show: Function = (): void => {
            count.text = input.text.length + " / " + IoSign.MAX;
        };
        show();
        input.addEventListener("change", (e: any): void => {
            show();
        });
        let save: Button_CLIP = as3.as(mc.addChild(new Button_CLIP()), Button_CLIP);
        save.name = "ioSignSave";
        save.Setup(KEYS.Get("btn_save"), false, 120, 34);
        save.Highlight = true;
        save.x = -130;
        save.y = h / 2 - 56;
        save.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            sign._ioMsg = IoSign.clean(input.text);
            BASE.Save();
            SOUNDS.Play("purchasepopup");
            IoSign.Close();
        });
        let cancel: Button_CLIP = as3.as(mc.addChild(new Button_CLIP()), Button_CLIP);
        cancel.Setup(KEYS.Get("btn_cancel"), false, 120, 34);
        cancel.x = 10;
        cancel.y = h / 2 - 56;
        cancel.addEventListener(MouseEvent.CLICK, IoSign.Close);
        IoSign.open(mc);
        if (input.stage) {
            input.stage.focus = input;
        }
    }
}
