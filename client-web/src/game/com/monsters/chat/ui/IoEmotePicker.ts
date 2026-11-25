import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, Shape, Sprite, Stage } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { setTimeout } from "flash/utils";
import { BYMChat, Chat, GLOBAL, IoEmotes, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (14 October, the user's): the chat's emote picker, opened by the bar's emote button (ChatBox). Every
 * emote, 12 to a row, over the chat, the animated ones playing; the one under the mouse is lit and named at the bottom. A click sends it (with
 * whatever was typed in the box first). Closed by a click elsewhere, Escape, or the button again.
 */
export class IoEmotePicker extends ASObject {
    public static readonly COLS: int = 12;

    public static readonly ICON: int = 30;

    public static readonly GAP: int = 4;

    private static _mc: Sprite = null;

    public static get isOpen(): boolean {
        return IoEmotePicker._mc != null && IoEmotePicker._mc.parent != null;
    }

    public static Toggle(anchorX: number, anchorY: number): void {
        if (IoEmotePicker.isOpen) {
            IoEmotePicker.Hide();
            return;
        }
        IoEmotePicker.Show(anchorX, anchorY);
    }

    /** Opens with its bottom left at the stage point given (the chat's input bar, above it). */
    public static Show(anchorX: number, anchorY: number): void {
        IoEmotePicker.Hide();
        let cell: int = IoEmotePicker.ICON + IoEmotePicker.GAP;
        let rows: int = Math.ceil(IoEmotes.LIST.length / IoEmotePicker.COLS) | 0;
        // (Inferno-only, QoL #157: the ones used lately first, a row over the rest)
        let recent: string[] = GLOBAL.INFERNO_ONLY ? IoEmotes.ioChat2Recent().slice(0, IoEmotePicker.COLS) : [];
        let top: int = recent.length ? (cell + 8) | 0 : 0;
        let w: int = IoEmotePicker.COLS * cell + 12;
        let h: int = rows * cell + 12 + 22 + top;
        let mc: Sprite = new Sprite();
        mc.name = "ioEmotePicker";
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(2, 0x6E4A22, 1);
        bg.graphics.beginFill(0x231811, 0.96);
        bg.graphics.drawRoundRect(0, 0, w, h, 12, 12);
        bg.graphics.endFill();
        mc.addChild(bg);
        mc.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let name: TextField = new TextField();
        let tf: TextFormat = new TextFormat("Verdana", 11, 0xFFD24A, true);
        tf.align = TextFormatAlign.CENTER;
        name.defaultTextFormat = tf;
        name.selectable = false;
        name.mouseEnabled = false;
        name.width = w;
        name.height = 18;
        name.y = h - 20;
        name.text = GLOBAL.INFERNO_ONLY ? KEYS.Get("io_emote_footer") : "Emotes: a D.A.V.E. Club perk";
        mc.addChild(name);
        if (top > 0) {
            let line: Shape = new Shape();
            line.name = "ioChat2EmoteRecentLine";
            line.graphics.lineStyle(1, 0x6E4A22, 1);
            line.graphics.moveTo(8, 6 + cell + 2);
            line.graphics.lineTo(w - 8, 6 + cell + 2);
            mc.addChild(line);
        }
        let all: any[] = [];
        for (let r: int = 0; r < recent.length; r++) {
            all.push([IoEmotes.info(recent[r]), 6 + r * cell, 6, "ioChat2EmoteRecent:"]);
        }
        for (let i: int = 0; i < IoEmotes.LIST.length; i++) {
            all.push([IoEmotes.LIST[i], 6 + (i % IoEmotePicker.COLS) * cell, 6 + top + Math.floor(i / IoEmotePicker.COLS) * cell, "ioEmotePick:"]);
        }
        for (let one of all) {
            let e: any[] = as3.cast(one[0], Array);
            let id: string = String(e[0]);
            let b: Sprite = new Sprite();
            b.name = String(one[3]) + id;
            b.buttonMode = true;
            b.x = Number(one[1]);
            b.y = Number(one[2]);
            // (its own area to click: the picture does not take the mouse)
            b.graphics.beginFill(0x000000, 0.01);
            b.graphics.drawRect(0, 0, cell - 2, cell - 2);
            b.graphics.endFill();
            let hover: Shape = new Shape();
            hover.graphics.beginFill(0xFFD24A, 0.22);
            hover.graphics.drawRoundRect(0, 0, cell - 2, cell - 2, 8, 8);
            hover.graphics.endFill();
            hover.visible = false;
            b.addChild(hover);
            let still: Sprite = IoEmotes.make(id, IoEmotePicker.ICON);
            still.x = still.y = 1;
            b.addChild(still);
            b.addEventListener(MouseEvent.MOUSE_OVER, (ev: MouseEvent): void => {
                hover.visible = true;
                name.text = IoEmotes.label(e);
            });
            b.addEventListener(MouseEvent.MOUSE_OUT, (ev: MouseEvent): void => {
                hover.visible = IoEmotePicker._ioPicked == id;
            });
            b.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
                // (QoL #555: on a touch screen the first tap shows which it is, the second on it sends it; a tap on
                // a 17 px picture posted at once)
                if (GLOBAL.INFERNO_ONLY && GLOBAL.ioTouch && IoEmotePicker._ioPicked != id) {
                    IoEmotePicker._ioPicked = id;
                    if (IoEmotePicker._ioHover && IoEmotePicker._ioHover != hover) {
                        IoEmotePicker._ioHover.visible = false;
                    }
                    IoEmotePicker._ioHover = hover;
                    hover.visible = true;
                    name.text = KEYS.Get("io_emote_tap_again", { "v1": IoEmotes.label(e) });
                    return;
                }
                // (QoL #541: Shift-click adds it to the line in the box, up to 5, and the picker stays open)
                if (GLOBAL.INFERNO_ONLY && ev.shiftKey && Chat._bymChat != null) {
                    let n: int = Chat._bymChat.ioAddEmote(id);
                    SOUNDS.Play(n > 0 ? "click1" : "error1");
                    name.text = n > 0 ? KEYS.Get("io_emote_added", { "v1": n, "v2": BYMChat.IO_EMOTES_A_LINE }) : KEYS.Get("io_emote_full", { "v1": BYMChat.IO_EMOTES_A_LINE });
                    return;
                }
                IoEmotePicker.Hide();
                SOUNDS.Play("click1");
                if (Chat._bymChat != null) {
                    Chat._bymChat.ioSendEmote(id);
                }
            });
            mc.addChild(b);
        }
        let stage: Stage = GLOBAL._ROOT.stage;
        let left: number = -(stage.stageWidth - GLOBAL._SCREENINIT.width) / 2;
        let topEdge: number = -(stage.stageHeight - GLOBAL._SCREENINIT.height) / 2;
        let right: number = left + stage.stageWidth;
        mc.x = Math.max(left + 4, Math.min(right - w - 4, anchorX)) | 0;
        mc.y = Math.max(topEdge + 4, anchorY - h - 6) | 0;
        stage.addChild(mc);
        IoEmotePicker._mc = mc;
        setTimeout((): void => {
            if (IoEmotePicker._mc == mc && mc.stage) {
                mc.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoEmotePicker.onStageDown, true);
                mc.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoEmotePicker.onKey);
            }
        }, 0);
    }

    /** (Inferno-only, QoL #555) the emote tapped once on a touch screen, and its highlight */
    private static _ioPicked: string = null;

    private static _ioHover: Shape = null;

    public static Hide(): void {
        IoEmotePicker._ioPicked = null;
        IoEmotePicker._ioHover = null;
        let mc: Sprite = IoEmotePicker._mc;
        if (mc == null) {
            return;
        }
        if (mc.stage) {
            mc.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoEmotePicker.onStageDown, true);
            mc.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoEmotePicker.onKey);
        }
        if (mc.parent) {
            mc.parent.removeChild(mc);
        }
        IoEmotePicker._mc = null;
    }

    /** (the bar's button toggles it itself: a press on it is not "elsewhere") */
    public static ignoreDownOn: DisplayObject = null;

    private static onStageDown(param1: MouseEvent): void {
        let t: DisplayObject = as3.as(param1.target, DisplayObject);
        if (IoEmotePicker._mc == null || IoEmotePicker._mc.contains(t)) {
            return;
        }
        if (IoEmotePicker.ignoreDownOn && t && (IoEmotePicker.ignoreDownOn === t || (IoEmotePicker.ignoreDownOn as any).contains && (IoEmotePicker.ignoreDownOn as any).contains(t))) {
            return;
        }
        IoEmotePicker.Hide();
    }

    private static onKey(param1: KeyboardEvent): void {
        if (param1.keyCode == Keyboard.ESCAPE) {
            IoEmotePicker.Hide();
        }
    }
}
