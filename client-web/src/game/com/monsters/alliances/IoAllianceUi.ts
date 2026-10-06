import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer, Graphics, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, GLOBAL, ImageCache, IoMapShare, IoMapUi, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: the pieces the redesigned Alliances window is drawn with (the user's design of 2 October),
 * in the window's own beige: text, section bands, cards, buttons, times, and jumping to a place.
 */
export class IoAllianceUi extends ASObject {
    public static readonly CENTER: string = TextFormatAlign.CENTER;

    public static readonly RIGHT: string = TextFormatAlign.RIGHT;

    public $ctor(): void {
        super.$ctor();
    }

    /** A text field (not clickable). `width` 0: as wide as its text. */
    public static text(value: string, size: int, color: uint, bold: boolean = false, width: int = 0, align: string = "left", html: boolean = false, wrap: boolean = false): TextField {
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        let f: TextFormat = new TextFormat("Verdana", size, color, bold);
        f.align = align;
        t.defaultTextFormat = f;
        if (wrap) {
            t.wordWrap = true;
            t.multiline = true;
        }
        if (width > 0) {
            t.width = width;
        }
        if (html) {
            t.htmlText = value;
        } else {
            t.text = value;
        }
        if (width <= 0) {
            t.autoSize = TextFieldAutoSize.LEFT;
        } else {
            t.height = Math.max(size + 8, (t.textHeight | 0) + 6);
        }
        return t;
    }

    /** Adds a text field at (x, y) and returns it. */
    public static addText(parent: DisplayObjectContainer, value: string, x: int, y: int, size: int, color: uint, bold: boolean = false, width: int = 0, align: string = "left", html: boolean = false, wrap: boolean = false): TextField {
        let t: TextField = IoAllianceUi.text(value, size, color, bold, width, align, html, wrap);
        t.x = x;
        t.y = y;
        parent.addChild(t);
        return t;
    }

    /** A section's heading: the tables' header colour, its words in bold. */
    public static band(parent: DisplayObjectContainer, x: int, y: int, w: int, label: string, h: int = 24): Sprite {
        let s: Sprite = new Sprite();
        s.mouseEnabled = false;
        s.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        s.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
        s.graphics.drawRect(0, 0, w, h);
        s.graphics.endFill();
        let t: TextField = IoAllianceUi.text(label, 12, 0, true, (w - 16) | 0);
        t.x = 8;
        t.y = ((h - 18) / 2) | 0;
        s.addChild(t);
        s.x = x;
        s.y = y;
        parent.addChild(s);
        return s;
    }

    /** A light card with a soft edge (a pin, a section's body). */
    public static card(g: Graphics, x: number, y: number, w: number, h: number, fill: uint = 16511976, edge: uint = 13217420): void {
        g.lineStyle(1, edge, 1, true);
        g.beginFill(fill, 1);
        g.drawRoundRect(x, y, w, h, 10, 10);
        g.endFill();
        g.lineStyle();
    }

    /** A button: "gold" for the main action, "grey" otherwise. Carries setEnabled / setText. */
    public static button(label: string, w: int, h: int, onClick: Function, style: string = "grey", size: int = 11): MovieClip {
        return IoMapUi.button(label, w, h, onClick, style, size);
    }

    /** A word that can be clicked (the window's links: "Open the board", "See all"). */
    public static link(label: string, size: int, onClick: Function): Sprite {
        let s: Sprite = new Sprite();
        let t: TextField = IoAllianceUi.text(label + "  >", size, 6962944, true, 0, "left", false);
        s.addChild(t);
        s.buttonMode = true;
        s.mouseChildren = false;
        s.graphics.beginFill(0, 0);
        s.graphics.drawRect(0, 0, t.width, t.height);
        s.graphics.endFill();
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            onClick();
        });
        return s;
    }

    public static num(value: number): string {
        return GLOBAL.FormatNumber(Math.round(value));
    }

    /** "now", "33s", "2m", "4h", "3d" since a time (seconds). */
    public static ago(ts: number): string {
        let sec: int = Math.max(0, GLOBAL.Timestamp() - (ts | 0)) | 0;
        if (sec < 5) {
            return KEYS.Get("io_alliance_now");
        }
        return KEYS.Get("io_alliance_ago", { "v1": IoAllianceUi.span(sec) });
    }

    /** "33s", "2m", "4h", "3d". */
    public static span(sec: int): string {
        if (sec < 60) {
            return sec + "s";
        }
        if (sec < 3600) {
            return ((sec / 60) | 0) + "m";
        }
        if (sec < 86400) {
            return ((sec / 3600) | 0) + "h";
        }
        return ((sec / 86400) | 0) + "d";
    }

    public static coord(x: int, y: int): string {
        return IoMapUi.coord(x, y);
    }

    /** "+3", "-2", "0". */
    public static signed(n: int): string {
        return n > 0 ? "+" + n : String(n);
    }

    /**
     * Opens the map at a place (the window closes): only on the player's own world, which is the only map
     * they can open.
     */
    public static jump(x: int, y: int, world: string): void {
        let mine: string = ALLIANCES.ioMyWorld();
        if (world && mine && world != mine) {
            GLOBAL.Message(KEYS.Get("io_alliance_other_world"));
            return;
        }
        ALLIANCEWINDOW.Hide();
        IoMapShare.OpenOwnWorld(x, y);
    }

    /** The alliance's emblem, fitted into a square of `size`. */
    public static emblem(container: DisplayObjectContainer, id: int, size: int): void {
        if (id <= 0) {
            return;
        }
        let suffix: string = id <= 20 ? "_large" : "_medium";
        ImageCache.GetImageWithCallBack("alliances/" + id + suffix + ".png", (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(size / bmd.width, size / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ((size - bmd.width * scale) / 2) | 0;
                bmp.y = ((size - bmd.height * scale) / 2) | 0;
            }
            as3.cast(args[0], DisplayObjectContainer).addChild(bmp);
        }, true, 4, "", [container]);
    }

    /** The server's answer as a message, when it is an error (true when it was). */
    public static failed(response: any): boolean {
        if (response == null) {
            GLOBAL.Message(KEYS.Get("alliance_err_generic"));
            return true;
        }
        if (response.error) {
            GLOBAL.Message(String(response.error));
            return true;
        }
        return false;
    }

    /** A light rule across a card. */
    public static rule(g: Graphics, x: number, y: number, w: number): void {
        g.lineStyle(1, 14205862, 1);
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.lineStyle();
    }
}
