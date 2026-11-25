import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { ColorTransform } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { GLOBAL, IoMapUi } from "@game";

/**
 * Inferno-only (10 October): the little menu a pet or a worker opens when it is clicked in the yard (IoYardPick):
 * a title, a line under it, and a button for each thing to do. It sits by the pointer, on the windows layer, and
 * goes on a click anywhere else, on Escape, or when the yard changes (Hide).
 *
 * An item: { label, onClick, style ("dark" | "gold" | "red"), enabled (default true) }. A click on one closes the
 * menu first, then calls it.
 */
export class IoCritterMenu extends Sprite {
    static {
        as3.fields(this, { _items: null });
    }

    private static readonly W: int = 176;

    private static readonly BUTTON_H: int = 24;

    private static _open: IoCritterMenu = null;

    private _items: any[];

    public $ctor(title?: string, line?: string, items?: any[]): void {
        super.$ctor();
        this.name = "ioCritterMenu";
        this._items = items;
        let w: int = IoCritterMenu.W;
        let y: int = 8;
        let t: TextField = IoMapUi.label(title, 12, IoMapUi.LIGHT, true, w - 16, TextFormatAlign.CENTER);
        t.x = 8;
        t.y = y;
        this.addChild(t);
        y += 20;
        if (line) {
            let l: TextField = IoMapUi.label(line, 10, IoMapUi.LIGHT_MUTED, false, w - 16, TextFormatAlign.CENTER);
            l.wordWrap = true;
            l.multiline = true;
            l.height = 40;
            l.x = 8;
            l.y = y;
            l.height = l.textHeight + 6;
            this.addChild(l);
            y += (l.height + 2) | 0;
        }
        y += 2;
        let i: int = 0;
        for (let item of as3.values(items)) {
            let style: string = item.style == "gold" ? "gold" : "dark";
            let b: MovieClip = IoMapUi.button(String(item.label), w - 16, IoCritterMenu.BUTTON_H, this.chosen(item), style, 11);
            b.name = "ioCritterItem:" + i;
            b.x = 8;
            b.y = y;
            if (item.style == "red") {
                // (a dark red button: something that lasts)
                b.transform.colorTransform = new ColorTransform(1, 0.62, 0.55, 1, 40, 0, 0, 0);
            }
            if (item.enabled === false) {
                b.setEnabled(false);
            }
            this.addChild(b);
            y += IoCritterMenu.BUTTON_H + 4;
            i++;
        }
        y += 4;
        IoMapUi.glass(this.graphics, w, y, 8);
        // A click inside is not a click on the yard behind.
        this.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
    }

    private chosen(item: any): Function {
        return (e: MouseEvent): void => {
            IoCritterMenu.Hide();
            if (item.onClick) {
                item.onClick();
            }
        };
    }

    // ---- the one open
    /** Opens a menu by the pointer (the one open before closes). */
    public static Show(title: string, line: string, items: any[]): IoCritterMenu {
        IoCritterMenu.Hide();
        let m: IoCritterMenu = new IoCritterMenu(title, line, items);
        let stage: any = GLOBAL._ROOT.stage;
        let x: number = stage.mouseX + 14;
        let y: number = stage.mouseY - 20;
        let sw: number = stage.stageWidth;
        let sh: number = stage.stageHeight;
        if (x + m.width > sw - 6) {
            x = stage.mouseX - m.width - 14;
        }
        m.x = Math.max(6, Math.min(sw - m.width - 6, x)) | 0;
        m.y = Math.max(6, Math.min(sh - m.height - 6, y)) | 0;
        GLOBAL._layerWindows.addChild(m);
        IoCritterMenu._open = m;
        // (next frame: the click that opened it must not close it)
        m.addEventListener(Event.ENTER_FRAME, IoCritterMenu.arm);
        return m;
    }

    private static arm(e: Event): void {
        let m: IoCritterMenu = as3.as(e.currentTarget, IoCritterMenu);
        m.removeEventListener(Event.ENTER_FRAME, IoCritterMenu.arm);
        if (IoCritterMenu._open == m && m.stage) {
            m.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoCritterMenu.outside, true, 0);
            m.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoCritterMenu.key);
        }
    }

    private static outside(e: MouseEvent): void {
        let m: IoCritterMenu = IoCritterMenu._open;
        if (!m) {
            return;
        }
        let t: DisplayObject = as3.as(e.target, DisplayObject);
        while (t) {
            if (t == m) {
                return;
            }
            t = t.parent;
        }
        IoCritterMenu.Hide();
    }

    private static key(e: KeyboardEvent): void {
        if (e.keyCode == 27) {
            IoCritterMenu.Hide();
        }
    }

    public static Hide(): void {
        let m: IoCritterMenu = IoCritterMenu._open;
        IoCritterMenu._open = null;
        if (!m) {
            return;
        }
        m.removeEventListener(Event.ENTER_FRAME, IoCritterMenu.arm);
        if (GLOBAL._ROOT && GLOBAL._ROOT.stage) {
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoCritterMenu.outside, true);
            GLOBAL._ROOT.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoCritterMenu.key);
        }
        if (m.parent) {
            m.parent.removeChild(m);
        }
    }

    /** The menu open now, or null (tests). */
    public static get open(): IoCritterMenu {
        return IoCritterMenu._open;
    }
}
