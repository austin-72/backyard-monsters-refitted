import * as as3 from "as3";
import { int } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { getTimer } from "flash/utils";
import { GLOBAL, IoMapUi } from "@game";

/**
 * Inferno-only (14 October, QoL #115): a line over the top of the yard for a few seconds, that blocks nothing
 * ("Collected: 25 Shiny, 50k Bone"). One at a time: a new one takes the old one's place.
 */
export class IoToast {
    private static _bar: Sprite = null;

    /** `button` and `onButton`: a button at its end (the line then stays `ms`, and blocks nothing else). */
    public static Show(text: string, ms: int = 4000, button: string = null, onButton: Function = null): void {
        IoToast.Hide();
        let bar: Sprite = new Sprite();
        bar.name = "ioToast";
        bar.mouseEnabled = false;
        bar.mouseChildren = button != null;
        let label: TextField = new TextField();
        label.name = "ioToastText";
        label.defaultTextFormat = new TextFormat("Verdana", 12, 0xFFF4E0, true);
        label.autoSize = TextFieldAutoSize.LEFT;
        label.selectable = false;
        label.htmlText = text;
        label.x = 14;
        label.y = 8;
        label.mouseEnabled = false;
        bar.addChild(label);
        let w: number = Math.ceil(label.textWidth) + 32;
        if (button != null) {
            let b: any = IoMapUi.button(button, 130, 24, (e: any): void => {
                IoToast.Hide();
                if (onButton != null) {
                    onButton();
                }
            }, "gold", 11);
            b.name = "ioToastButton";
            b.x = w;
            b.y = 5;
            bar.addChild(b);
            w += 140;
        }
        let h: number = Math.max(34, Math.ceil(label.textHeight) + 18);
        bar.graphics.lineStyle(1, 0xFFB35A, 0.9);
        bar.graphics.beginFill(0x2A0E04, 0.92);
        bar.graphics.drawRoundRect(0, 0, w, h, 14);
        bar.graphics.endFill();
        bar.filters = [new GlowFilter(0, 0.6, 8, 8, 2)];
        bar.x = Math.round(GLOBAL._SCREENCENTER.x - w / 2);
        bar.y = Math.round(GLOBAL._SCREEN.y + 110);
        let until: int = (getTimer() + ms) | 0;
        bar.addEventListener(Event.ENTER_FRAME, (e: Event): void => {
            let left: int = (until - getTimer()) | 0;
            if (left <= 0) {
                IoToast.Hide();
            } else if (left < 500) {
                bar.alpha = left / 500;
            }
        });
        GLOBAL._layerTop.addChild(bar);
        IoToast._bar = bar;
    }

    public static Hide(): void {
        if (IoToast._bar && IoToast._bar.parent) {
            IoToast._bar.parent.removeChild(IoToast._bar);
        }
        IoToast._bar = null;
    }
}
