import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer, Graphics, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { setTimeout } from "flash/utils";
import { IoFormat, AllianceConstants, ALLIANCES, ALLIANCEWINDOW, BYMChat, Chat, GLOBAL, ImageCache, IoCrest, IoMapShare, IoMapUi, KEYS, SOUNDS } from "@game";

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
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.ago(ts, true); // (QoL #572: the game's one "time ago")
        }
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

    /** The alliance's emblem, fitted into a square of `size`: its own crest when it has one (14 October: IoCrest). */
    public static emblem(container: DisplayObjectContainer, id: int, size: int, crest: any = null): void {
        if (IoCrest.fit(container, crest, size)) {
            return;
        }
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

    // ---- (Inferno-only, QoL #179) the board's top pin as one line on top of the chat box, on its Alliance tab
    private static _banner: Sprite = null;

    private static _bannerPin: any = null;

    /** The pin the player closed the banner on (it comes back for another pin). */
    private static _bannerClosed: int = 0;

    /**
     * Called when the alliance has loaded (ALLIANCES): the banner shows its top pin, or goes. Drawn into the chat's
     * own box (as its "new lines" pill is), just above its title bar, shown only while the chat is open on the
     * Alliance tab; a click opens the Board, its x hides it until another pin is on top. No change to the chat's code.
     * `board`: the Board tab's own list, just loaded (top first), when it has one.
     */
    public static pinBanner(board: any[] = null): void {
        let data: any = ALLIANCES.ioData();
        let pins: any[] = board != null ? board : (data ? as3.as(data.pins_top, Array) : null);
        IoAllianceUi._bannerPin = pins && pins.length ? pins[0] : null;
        if (IoAllianceUi._bannerPin == null) {
            if (IoAllianceUi._banner) {
                IoAllianceUi._banner.visible = false;
            }
            return;
        }
        if (!IoAllianceUi._banner) {
            let b: Sprite = new Sprite();
            b.name = "ioAlPinBanner";
            b.visible = false;
            let label: Sprite = new Sprite();
            label.name = "ioAlPinBannerText";
            label.buttonMode = true;
            label.mouseChildren = false;
            label.addChild(IoAllianceUi.text("", 11, 0xFFF4E0, false, 300));
            label.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                ALLIANCEWINDOW.Show();
                // (once the window is up, as the quest book opens a tab of it)
                setTimeout((): void => {
                    if (ALLIANCEWINDOW._open && ALLIANCEWINDOW._mc != null) {
                        ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_BOARD);
                    }
                }, 50);
            });
            b.addChild(label);
            let close: Sprite = new Sprite();
            close.name = "ioAlPinBannerClose";
            close.buttonMode = true;
            close.mouseChildren = false;
            close.addChild(IoAllianceUi.text("x", 11, 0xFFD24A, true, 14, IoAllianceUi.CENTER));
            close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("click1");
                IoAllianceUi._bannerClosed = IoAllianceUi._bannerPin ? IoAllianceUi._bannerPin.id | 0 : 0;
                b.visible = false;
            });
            b.addChild(close);
            b.addEventListener(Event.ENTER_FRAME, (e: Event): void => {
                IoAllianceUi.placeBanner();
            });
            IoAllianceUi._banner = b;
        }
        let t: TextField = as3.as(as3.cast(IoAllianceUi._banner.getChildByName("ioAlPinBannerText"), Sprite).getChildAt(0), TextField);
        t.text = KEYS.Get("io_al2_pin_banner", { "v1": String(IoAllianceUi._bannerPin.title || "") });
        (IoAllianceUi._banner as any).ioDrawnW = -1;
        IoAllianceUi.placeBanner();
    }

    /** Each frame: in the chat box now showing, at the top of its lines, while the Alliance tab is up. */
    private static placeBanner(): void {
        let b: Sprite = IoAllianceUi._banner;
        let chat: BYMChat = Chat._bymChat;
        let bg: MovieClip = chat != null && chat.chatBox != null ? chat.chatBox.background : null;
        let mask: any = bg ? (bg as any).mcMask : null;
        let pin: any = IoAllianceUi._bannerPin;
        let show: boolean = Boolean(GLOBAL.INFERNO_ONLY && mask && pin && chat._open && chat.ioMode == BYMChat.IO_ALLIANCE && ALLIANCES._allianceID > 0 && (pin.id | 0) != IoAllianceUi._bannerClosed);
        if (!show) {
            b.visible = false;
            return;
        }
        if (b.parent != bg) {
            bg.addChild(b);
        }
        b.visible = true;
        // (just above the box's title bar: over the lines it would hide the first one)
        let header: any = (bg as any).header;
        b.x = Math.round(Number(mask.x));
        b.y = Math.round((header ? Number(header.y) : 0) - 20);
        // (clear of the scroll bar on the right)
        let w: int = Math.max(120, Number(mask.width) - 20) | 0;
        if (((b as any).ioDrawnW | 0) != w) {
            (b as any).ioDrawnW = w;
            const h: int = 18;
            b.graphics.clear();
            b.graphics.lineStyle(1, 0xFFB35A, 1);
            b.graphics.beginFill(0x5A1E08, 0.94);
            b.graphics.drawRect(0, 0, w, h);
            b.graphics.endFill();
            let label: Sprite = as3.cast(b.getChildByName("ioAlPinBannerText"), Sprite);
            let t: TextField = as3.as(label.getChildAt(0), TextField);
            t.width = w - 26;
            t.height = h;
            t.x = 4;
            t.y = 0;
            label.graphics.clear();
            label.graphics.beginFill(0, 0);
            label.graphics.drawRect(0, 0, w - 20, h);
            label.graphics.endFill();
            let close: Sprite = as3.cast(b.getChildByName("ioAlPinBannerClose"), Sprite);
            close.x = w - 18;
            close.y = 0;
            close.graphics.clear();
            close.graphics.beginFill(0, 0);
            close.graphics.drawRect(0, 0, 16, h);
            close.graphics.endFill();
        }
    }

    /** A light rule across a card. */
    public static rule(g: Graphics, x: number, y: number, w: number): void {
        g.lineStyle(1, 14205862, 1);
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.lineStyle();
    }
}
