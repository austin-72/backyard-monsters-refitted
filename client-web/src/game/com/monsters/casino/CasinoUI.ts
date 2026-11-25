import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { CASINO, GLOBAL, ImageCache, IoKit, KEYS, SOUNDS } from "@game";

/**
 * The Brimstone Pit's drawing helpers: its text, molten buttons, obsidian panels and chips, in the
 * look of the Descent (IoGauntlet). Art comes from server/public/assets/casino (art/brimstonepit).
 */
export class CasinoUI extends ASObject {
    public static readonly GOLD: uint = 16766346;

    public static readonly EMBER: uint = 16747050;

    public static readonly ASH: uint = 12101784;

    public static readonly WIN: uint = 10289002;

    public static readonly LOSS: uint = 16738906;

    /** A text field; font "Groboldov" is the game's embedded title font. */
    public static label(text: string, size: int, color: uint, bold: boolean = false, width: int = 200, align: string = "left", font: string = "Verdana"): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 10;
        if (font == "Groboldov") {
            field.embedFonts = true;
        }
        let format: TextFormat = new TextFormat(font, size, color, font == "Groboldov" ? false : bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    /** A title in the game's font, glowing like embers. */
    public static title(text: string, size: int, width: int, align: string = "center"): TextField {
        let t: TextField = CasinoUI.label(text, size, 16777215, false, width, align, "Groboldov");
        t.height = size + 14;
        t.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2), new DropShadowFilter(2, 45, 0, 0.6, 3, 3, 1, 2)];
        return t;
    }

    /** A button of molten gold (the Descent's), or ash grey when it cannot be used. */
    public static button(text: string, width: int, height: int, onClick: Function, enabled: boolean = true, size: int = 15): Sprite {
        let b: MovieClip = null;
        let t: TextField = null;
        let hot: boolean = false;
        let draw: Function = null;
        b = new MovieClip();
        // (dynamic: keeps its state on itself)
        b.name = "casinoButton:" + text;
        t = CasinoUI.label(text, size, 16777215, false, width, TextFormatAlign.CENTER, "Groboldov");
        t.height = size + 12;
        // (16 October: a label longer than its button, in a longer language, drawn smaller rather than cut at both ends)
        GLOBAL.ioFitText(t, Math.min(9, size));
        t.y = ((height - size - 8) / 2) | 0;
        t.filters = [new GlowFilter(0x4A0A02, 1, 3, 3, 5, 1)];
        b.addChild(t);
        b.mouseChildren = false;
        hot = false;
        draw = (): void => {
            let on: boolean = Boolean(b["casinoEnabled"]);
            b.graphics.clear();
            // the kit's molten button (11 October), the old gradient until it has loaded
            if (IoKit.slice(b.graphics, on ? (hot ? "btn_molten_h" : "btn_molten") : "btn_molten_d", 0, 0, width, height)) {
                t.textColor = (on ? 0xFFFFFF : 0xA09088) >>> 0;
                b.filters = on && hot ? [new GlowFilter(0xFF6A00, 0.55, 10, 10, 2, 2)] : [];
                b.buttonMode = on;
                return;
            }
            let m: Matrix = new Matrix();
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            b.graphics.lineStyle(2, (on ? 0xFFE0A0 : 0x6A5A50) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, on ? (hot ? [0xFFC060, 0xE0501C, 0x9A2008] : [0xF0A040, 0xC8401A, 0x7A1806]) : [0x5A4A44, 0x3A2E2A, 0x2A2220], [1, 1, 1], [0, 140, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 12, 12);
            b.graphics.endFill();
            t.textColor = (on ? 0xFFFFFF : 0xA09088) >>> 0;
            b.filters = on ? [new GlowFilter(0xFF6A00, 0.6, 8, 8, 2, 2)] : [];
            b.buttonMode = on;
        };
        b["casinoEnabled"] = enabled;
        b["casinoRedraw"] = draw;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hot = true;
            draw();
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hot = false;
            draw();
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (b["casinoEnabled"]) {
                SOUNDS.Play("click1");
                onClick(e);
            }
        });
        draw();
        IoKit.whenLoaded(["btn_molten", "btn_molten_h", "btn_molten_d"], draw);
        return b;
    }

    /** Turns a button() on or off. */
    public static enable(b: Sprite, on: boolean): void {
        if (b && b["casinoEnabled"] != on) {
            b["casinoEnabled"] = on;
            b["casinoRedraw"]();
        }
    }

    /**
     * Sets a text only when it changes (7 October, performance: setting a text field, even to what it already
     * shows, lays it out and draws it again). What it was last given is kept on the field itself (9 October: it
     * was kept in a Dictionary whose weak keys the browser build doesn't have, so every field ever set, and the
     * window or game round it, was kept for good).
     */
    public static setText(t: TextField, s: string): void {
        if (t["ioShown"] !== s) {
            t["ioShown"] = s;
            t.text = s;
        }
    }

    public static setHtml(t: TextField, s: string): void {
        if (t["ioShown"] !== "html:" + s) {
            t["ioShown"] = "html:" + s;
            t.htmlText = s;
        }
    }

    /** A button()'s text changed (its name, which tests look for, stays). */
    public static relabel(b: Sprite, text: string): void {
        let t: TextField = b ? as3.as(b.getChildAt(0), TextField) : null;
        if (t && t.text != text) {
            t.text = text;
        }
    }

    /** A small toggle (a risk, a ticket, a tab): gold when chosen. */
    public static toggle(text: string, width: int, height: int, onClick: Function, style: string = "button"): Sprite {
        let b: MovieClip = null;
        let t: TextField = null;
        let hot: boolean = false;
        b = new MovieClip();
        b.name = "casinoToggle:" + text;
        t = CasinoUI.label(text, 12, 16777215, true, width, TextFormatAlign.CENTER);
        t.y = ((height - 17) / 2) | 0;
        b.addChild(t);
        b.mouseChildren = false;
        b.buttonMode = true;
        let pieces: any[] = style == "tab" ? ["tab", "tab_h", "tab_on"] : ["btn_obsidian", "btn_obsidian_h", "btn_molten"];
        let draw: Function = (): void => {
            let on: boolean = Boolean(b["casinoChosen"]);
            b.graphics.clear();
            // the kit's tab or small button (11 October): obsidian, lit when pointed at, molten when chosen
            if (IoKit.slice(b.graphics, as3.str(on ? pieces[2] : (hot ? pieces[1] : pieces[0])), 0, 0, width, height)) {
                t.textColor = (on ? 0xFFFFFF : (hot ? 0xFFE0B0 : CasinoUI.ASH)) >>> 0;
                return;
            }
            let m: Matrix = new Matrix();
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            b.graphics.lineStyle(1, (on ? 0xFFE0A0 : 0x7A5A48) >>> 0, 1);
            b.graphics.beginGradientFill(GradientType.LINEAR, on ? [0xE08A30, 0x9A3010] : [0x3A2A26, 0x1E1614], [1, 1], [0, 255], m);
            b.graphics.drawRoundRect(0, 0, width, height, 8, 8);
            b.graphics.endFill();
            t.textColor = (on ? 0xFFFFFF : CasinoUI.ASH) >>> 0;
        };
        b["casinoChosen"] = false;
        b["casinoRedraw"] = draw;
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hot = true;
            draw();
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hot = false;
            draw();
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick(e);
        });
        draw();
        IoKit.whenLoaded(pieces, draw);
        return b;
    }

    public static choose(b: Sprite, on: boolean): void {
        if (b) {
            b["casinoChosen"] = on;
            b["casinoRedraw"]();
        }
    }

    /** An obsidian panel with a thin molten rim. */
    public static panel(width: int, height: int, alpha: number = 0.88): Sprite {
        let p: Sprite = new Sprite();
        let draw: Function = (): void => {
            p.graphics.clear();
            // the kit's obsidian panel (11 October)
            if (IoKit.panel(p.graphics, 0, 0, width, height)) {
                // a faint panel (an empty seat, a rung not yet reached) is darkened, as the old see-through one was
                if (alpha < 0.8) {
                    p.graphics.beginFill(0x0C0706, Math.min(0.6, 0.9 - alpha));
                    p.graphics.drawRoundRect(1, 1, width - 2, height - 2, 10, 10);
                    p.graphics.endFill();
                }
                return;
            }
            let m: Matrix = new Matrix();
            m.createGradientBox(width, height, Math.PI / 2, 0, 0);
            p.graphics.lineStyle(1.5, 10107412, 1);
            p.graphics.beginGradientFill(GradientType.LINEAR, [0x241816, 0x120C0B], [alpha, alpha], [0, 255], m);
            p.graphics.drawRoundRect(0, 0, width, height, 14, 14);
            p.graphics.endFill();
        };
        draw();
        IoKit.whenLoaded(["panel", "panel_tile"], draw);
        return p;
    }

    /** A bone chip with its value (the bet selector's). */
    public static chip(value: int, onClick: Function): Sprite {
        let c: MovieClip = null;
        let col: uint = 0;
        c = new MovieClip();
        c.name = "casinoChip:" + value;
        c.buttonMode = true;
        c.mouseChildren = false;
        let colors: any = { "1": 0xD8CFC0, "5": 0xC04A2A, "10": 0x3A6AB0, "25": 0x3A9A4A, "50": 0xE08A20, "100": 0x2A2226, "250": 0x8A3AB0, "500": 0xD8B040 };
        col = (colors[String(value)] != null ? colors[String(value)] >>> 0 : 0x9A6A4A) >>> 0;
        let draw: Function = (): void => {
            let on: boolean = Boolean(c["casinoChosen"]);
            c.graphics.clear();
            // the kit's clay chip (11 October)
            if (IoKit.has("chip_" + value) && IoKit.stamp(c.graphics, "chip_" + value, 0, 0, 40, 40)) {
                c.filters = on ? [new GlowFilter(0xFFB040, 1, 10, 10, 3, 2)] : [new DropShadowFilter(2, 60, 0, 0.5, 3, 3, 1, 1)];
                return;
            }
            c.graphics.lineStyle(2, (on ? 0xFFF0B0 : 0xE8DCC8) >>> 0, 1);
            c.graphics.beginFill(col, 1);
            c.graphics.drawCircle(0, 0, 17);
            c.graphics.endFill();
            c.graphics.lineStyle(3, 16051420, 0.9);
            let i: int = 0;
            while (i < 8) {
                let a: number = i / 8 * Math.PI * 2;
                c.graphics.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                c.graphics.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
                i++;
            }
            c.graphics.lineStyle(1, 0, 0.35);
            c.graphics.beginFill(0, 0.18);
            c.graphics.drawCircle(0, 0, 10.5);
            c.graphics.endFill();
            c.filters = on ? [new GlowFilter(0xFFB040, 1, 10, 10, 3, 2)] : [new DropShadowFilter(2, 60, 0, 0.5, 3, 3, 1, 1)];
        };
        // (Inferno-only, QoL #562: on a touch screen a press a little outside the chip still takes it; 20 px on a phone)
        if (GLOBAL.INFERNO_ONLY && GLOBAL.ioTouch) {
            let hit: Shape = new Shape();
            hit.name = "casinoChipHit";
            hit.graphics.beginFill(0, 0);
            hit.graphics.drawCircle(0, 0, 23);
            hit.graphics.endFill();
            c.addChildAt(hit, 0);
        }
        let t: TextField = CasinoUI.label(value >= 1000 ? ((value / 1000) | 0) + "k" : String(value), value >= 100 ? 10 : 12, (value == 1 || value == 500 ? 0x201410 : 0xFFFFFF) >>> 0, true, 34, TextFormatAlign.CENTER);
        t.x = -17;
        t.y = -9;
        c.addChild(t);
        c["casinoChosen"] = false;
        c["casinoRedraw"] = draw;
        draw();
        if ([1, 5, 10, 25, 50, 100, 250, 500].indexOf(value) >= 0) {
            IoKit.whenLoaded(["chip_" + value], draw);
        }
        c.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            onClick(e);
        });
        return c;
    }

    /**
     * Inferno-only (QoL #617, #618): a win's sound, louder than it was (the file is quiet: a small win sounded
     * softer than a loss), and a big one (`big`: 10 times the bet or more, a jackpot) with a fanfare over it.
     */
    public static ioWinSound(big: boolean = false): void {
        SOUNDS.Play("chaching", 1);
        if (big) {
            SOUNDS.Play("levelup", 0.7);
        }
    }

    /**
     * Inferno-only (QoL #390): a small "?" at the top right of a game's side panel `p` (beside LOBBY), which shows the
     * game's rules and pays: `lines()` gives them when it is pressed (the rules casino/state sent, which may come after
     * the game opened), the title first.
     */
    public static ioRulesButton(p: Sprite, lines: Function): Sprite {
        let b: Sprite = CasinoUI.toggle("?", 24, 26, (e: MouseEvent): void => {
            let l: any[] = lines();
            GLOBAL.Message("<b>" + l[0] + "</b><br><br>• " + l.slice(1).join("<br>• "));
        });
        b.name = "ioPitRules";
        b.x = 176;
        b.y = 10;
        p.addChild(b);
        return b;
    }

    /**
     * Inferno-only (QoL #394): the sound switch of the Pit's and the Arcade's windows: a speaker, with its waves when
     * the game's sounds are on and a cross when they are off (SOUNDS.Toggle, the top bar's own mute). It shows the
     * state as it is, whoever changed it: the window calls its "ioSoundRedraw" every frame (drawn again only when it
     * changes; no listener of its own, which would outlive the window).
     */
    public static ioSoundToggle(name: string): Sprite {
        let icon: Shape = null;
        let shown: int = -1;
        let b: Sprite = CasinoUI.toggle("", 34, 26, (e: MouseEvent): void => {
            SOUNDS.Toggle();
        });
        b.name = name;
        icon = new Shape();
        icon.x = 17;
        icon.y = 13;
        b.addChild(icon);
        let draw: Function = (): void => {
            let off: int = SOUNDS._muted ? 1 : 0;
            if (off == shown) {
                return;
            }
            shown = off;
            b["ioMuted"] = off == 1;
            let g: any = icon.graphics;
            g.clear();
            // the speaker
            g.lineStyle(1, 0x2A1006, 0.8);
            g.beginFill((off ? CasinoUI.ASH : 0xFFE0B0) >>> 0, 1);
            g.moveTo(-8, -3);
            g.lineTo(-4, -3);
            g.lineTo(1, -8);
            g.lineTo(1, 8);
            g.lineTo(-4, 3);
            g.lineTo(-8, 3);
            g.lineTo(-8, -3);
            g.endFill();
            if (off) {
                g.lineStyle(2, CasinoUI.LOSS, 1);
                g.moveTo(4, -4);
                g.lineTo(10, 4);
                g.moveTo(10, -4);
                g.lineTo(4, 4);
            } else {
                g.lineStyle(1.5, 0xFFE0B0, 1);
                g.moveTo(4, -3);
                g.curveTo(6, 0, 4, 3);
                g.moveTo(7, -6);
                g.curveTo(11, 0, 7, 6);
            }
        };
        draw();
        b["ioSoundRedraw"] = draw;
        return b;
    }

    /** QoL #617: a lost bet's sound: a dull thud (it was the error buzz that a refusal makes). */
    public static ioLoseSound(): void {
        SOUNDS.Play("destroy1", 0.35);
    }

    /** A number field the player types in (digits only). */
    public static input(width: int, height: int, text: string, maxChars: int = 9, restrict: string = "0-9"): TextField {
        let f: TextField = new TextField();
        f.type = TextFieldType.INPUT;
        f.selectable = true;
        f.mouseEnabled = true;
        f.restrict = restrict;
        f.maxChars = maxChars;
        f.width = width;
        f.height = height;
        f.border = true;
        f.borderColor = 10107412;
        f.background = true;
        f.backgroundColor = 1182731;
        let format: TextFormat = new TextFormat("Verdana", 13, CasinoUI.GOLD, true);
        format.align = TextFormatAlign.CENTER;
        f.defaultTextFormat = format;
        f.text = text;
        return f;
    }

    /**
     * A picture from the server's assets (casino/...), added to holder when it has loaded, at (x, y),
     * scaled to (w, h) when they are given.
     */
    public static picture(holder: Sprite, key: string, x: number = 0, y: number = 0, w: number = 0, h: number = 0, onLoaded: Function = null): void {
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (!bmd) {
                return;
            }
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            b.x = x;
            b.y = y;
            if (w > 0) {
                b.width = w;
            }
            if (h > 0) {
                b.height = h;
            }
            holder.addChild(b);
            if (onLoaded != null) {
                onLoaded(b);
            }
        });
    }

    /** 12,345 */
    public static number(n: number): string {
        return GLOBAL.FormatNumber(n);
    }

    /**
     * An amount of Shiny that may have a part (a win of 1.5x on 1 Shiny): 1.5, 1,204.25, 12. A part is
     * paid as one more Shiny with its chance (the server decides), so this is what the win is worth.
     */
    public static shiny(n: number): string {
        let cents: number = Math.floor(n * 100 + 0.000001);
        let whole: number = Math.floor(cents / 100);
        let part: int = (cents - whole * 100) | 0;
        return GLOBAL.FormatNumber(whole) + (part == 0 ? "" : "." + (part < 10 ? "0" + part : (part % 10 == 0 ? String(part / 10) : String(part))));
    }

    /**
     * 1.4x, 0.45x, 60x. Inferno-only (QoL #581: one way across the Pit): 1.40×, 0.45×, 60×, 1,250× (the × sign, two
     * decimals when there is a part). `plain`: an "x" for the game's title font (Groboldov), which has no ×.
     */
    public static mult(m: number, plain: boolean = false): string {
        if (!GLOBAL.INFERNO_ONLY) {
            let s: string = String(Math.round(m * 100) / 100);
            return s + "x";
        }
        let r: number = Math.round(m * 100) / 100;
        let whole: number = Math.floor(r);
        let cents: int = Math.round((r - whole) * 100) | 0;
        return CasinoUI.number(whole) + (cents > 0 ? "." + (cents < 10 ? "0" : "") + cents : "") + CasinoUI.times(plain);
    }

    /**
     * QoL #581: a multiplier always with two decimals (a readout that climbs, Ascent's and Dice's: 1.00×, 2.41×; it
     * does not jump about); 2.41x as before outside the Inferno.
     */
    public static multFixed(m: number, plain: boolean = false): string {
        return m.toFixed(2) + CasinoUI.times(plain);
    }

    /** QoL #581: the Pit's multiplier sign (× in the Inferno; an "x" outside it, or for the title font: `plain`). */
    public static times(plain: boolean = false): string {
        return GLOBAL.INFERNO_ONLY && !plain ? "×" : "x";
    }

    /**
     * Inferno-only (QoL #389): QUICK beside LOBBY in a game's side panel `p` (between LOBBY and "?"): the game's result
     * shown at once, or with a short animation, instead of its long one. Kept per game ("quick:<game>", CASINO.ioRemember);
     * the game reads it with ioQuick as each ball, spin or card starts.
     */
    public static ioQuickToggle(p: Sprite, game: string): Sprite {
        let b: Sprite = null;
        b = CasinoUI.toggle(KEYS.Get("io_pit_quick"), 64, 26, (e: MouseEvent): void => {
            let on: boolean = !CasinoUI.ioQuick(game);
            CASINO.ioRemember("quick:" + game, on ? "1" : "");
            CasinoUI.choose(b, on);
        });
        b.name = "ioPitQuick";
        b.x = 106;
        b.y = 10;
        CasinoUI.choose(b, CasinoUI.ioQuick(game));
        p.addChild(b);
        return b;
    }

    /** QoL #389: whether QUICK is on for this game. */
    public static ioQuick(game: string): boolean {
        return GLOBAL.INFERNO_ONLY && CASINO.ioRecall("quick:" + game) == "1";
    }

    public static removeAll(s: Sprite): void {
        while (s.numChildren > 0) {
            s.removeChildAt(0);
        }
    }

    /** The top-left of `o` placed at (x, y). */
    public static at(o: DisplayObject, x: number, y: number): DisplayObject {
        o.x = x;
        o.y = y;
        return o;
    }
}
