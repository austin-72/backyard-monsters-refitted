import { ASObject, int, uint } from "as3";
import { Graphics, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, AllyInfo, GLOBAL, IoUnderworld, LOGIN, SOUNDS } from "@game";

/**
 * Inferno-only: the small pieces the map room's own panels are drawn with (the sidebar, the zoom control,
 * the minimap, the coordinates, sharing): colours, text, buttons, check boxes and map pins. The colours
 * are the map window's: parchment for the sidebar, dark glass over the map.
 */
export class IoMapUi extends ASObject {
    public static readonly INK: uint = 2824716;

    public static readonly MUTED: uint = 7031334;

    public static readonly PAPER: uint = 15325104;

    public static readonly PAPER_LIGHT: uint = 16181706;

    public static readonly PAPER_ROW: uint = 16774620;

    public static readonly RULE: uint = 13481095;

    public static readonly EDGE: uint = 8017200;

    public static readonly TAB_OFF: uint = 11634513;

    public static readonly GOLD: uint = 14856743;

    public static readonly GOLD_HOVER: uint = 15779914;

    public static readonly GOLD_EDGE: uint = 8018450;

    public static readonly GREY: uint = 15526887;

    public static readonly GREY_HOVER: uint = 16777215;

    public static readonly GREY_EDGE: uint = 10132118;

    public static readonly DARK: uint = 1576456;

    public static readonly DARK_EDGE: uint = 13350282;

    public static readonly LIGHT: uint = 16049860;

    public static readonly LIGHT_MUTED: uint = 12560771;

    public static readonly MATCH: uint = 11037184;

    /** Relations, in the order the filters and the legend list them. */
    public static readonly YOU: int = 0;

    public static readonly ALLY: int = 1;

    public static readonly FRIENDLY: int = 2;

    public static readonly HOSTILE: int = 3;

    public static readonly OTHER: int = 4;

    public static readonly NONE: int = 5;

    public static readonly RELATION_NAMES: any[] = ["You", "Your alliance", "Friendly", "Hostile", "Other alliances", "No alliance"];

    public $ctor(): void {
        super.$ctor();
    }

    /** How the player stands with a yard's owner (one of YOU ... NONE). */
    public static relation(uid: int, allianceID: int): int {
        if (uid == LOGIN._playerID) {
            return IoMapUi.YOU;
        }
        switch (ALLIANCES.ioRelation(allianceID)) {
            case 4:
                return IoMapUi.ALLY;
            case 1:
                return IoMapUi.FRIENDLY;
            case -1:
                return IoMapUi.HOSTILE;
            case 0:
                return IoMapUi.OTHER;
        }
        return IoMapUi.NONE;
    }

    /** The colour of the name bar the map gives a relation (AllyInfo._picURLs). */
    public static relationColour(key: int): uint {
        switch (key) {
            case IoMapUi.YOU:
                return AllyInfo._picURLs.playerHex >>> 0;
            case IoMapUi.ALLY:
                return AllyInfo._picURLs.allyHex >>> 0;
            case IoMapUi.FRIENDLY:
                return AllyInfo._picURLs.friendlyHex >>> 0;
            case IoMapUi.HOSTILE:
                return AllyInfo._picURLs.hostileHex >>> 0;
            case IoMapUi.OTHER:
                return AllyInfo._picURLs.neutralHex >>> 0;
        }
        return AllyInfo._picURLs.noneHex >>> 0;
    }

    /** "-263, -95" */
    public static coord(cellX: int, cellY: int): string {
        if (GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(cellX, cellY)) {
            return IoUnderworld.label(cellX, cellY);
        }
        return GLOBAL.ioCoord(cellX) + ", " + GLOBAL.ioCoord(cellY);
    }

    /**
     * A place in the popups' short "Location" boxes: "188 x 201" in the world above (0-399), "D4 x D5" in the
     * Depths of Hell (0-9, as the outposts list numbers them).
     */
    public static location(cellX: int, cellY: int): string {
        if (GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(cellX, cellY)) {
            return "D" + (cellX - IoUnderworld.origin) + " x D" + (cellY - IoUnderworld.origin);
        }
        return GLOBAL.ioCoord(cellX) + " x " + GLOBAL.ioCoord(cellY);
    }

    public static escape(text: string): string {
        return String(text).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
    }

    public static label(text: string, size: int, color: uint, bold: boolean = false, width: int = 200, align: string = "left"): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let format: TextFormat = new TextFormat("Verdana", size, color, bold);
        format.align = align;
        field.defaultTextFormat = format;
        field.text = text;
        return field;
    }

    /** A text box to type in. */
    public static input(size: int, color: uint, width: int, maxChars: int = 0): TextField {
        let field: TextField = new TextField();
        field.type = "input";
        field.selectable = true;
        field.width = width;
        field.height = size + 8;
        field.maxChars = maxChars;
        field.defaultTextFormat = new TextFormat("Verdana", size, color, false);
        field.text = "";
        return field;
    }

    public static roundBox(g: Graphics, x: number, y: number, w: number, h: number, fill: uint, fillAlpha: number, edge: int, radius: number, edgeThickness: number = 1): void {
        if (edge >= 0) {
            g.lineStyle(edgeThickness, edge >>> 0, 1, true);
        } else {
            g.lineStyle();
        }
        g.beginFill(fill, fillAlpha);
        g.drawRoundRect(x, y, w, h, radius * 2, radius * 2);
        g.endFill();
        g.lineStyle();
    }

    /** Dark glass over the map (the coordinates, the minimap, bubbles). */
    public static glass(g: Graphics, w: number, h: number, radius: number = 8): void {
        IoMapUi.roundBox(g, 0, 0, w, h, IoMapUi.DARK, 0.9, IoMapUi.DARK_EDGE, radius, 1.5);
    }

    /**
     * A button: gold for the main action, grey otherwise, or dark on the map. A MovieClip, so it can carry
     * setEnabled / setText as properties.
     */
    public static button(text: string, w: int, h: int, onClick: Function, style: string = "grey", size: int = 11): MovieClip {
        let b: MovieClip = null;
        let fill: uint = 0;
        let hover: uint = 0;
        let edge: uint = 0;
        let enabled: boolean = false;
        let t: TextField = null;
        let draw: Function = null;
        b = new MovieClip();
        fill = (style == "gold" ? IoMapUi.GOLD : (style == "dark" ? 0x3B2819 : IoMapUi.GREY)) >>> 0;
        hover = (style == "gold" ? IoMapUi.GOLD_HOVER : (style == "dark" ? 0x54391F : IoMapUi.GREY_HOVER)) >>> 0;
        edge = style == "gold" ? IoMapUi.GOLD_EDGE : (style == "dark" ? IoMapUi.DARK_EDGE : IoMapUi.GREY_EDGE);
        let color: uint = (style == "dark" ? IoMapUi.LIGHT : (style == "gold" ? IoMapUi.INK : 0x333333)) >>> 0;
        enabled = true;
        t = IoMapUi.label(text, size, color, true, w, TextFormatAlign.CENTER);
        draw = (over: boolean): void => {
            b.graphics.clear();
            IoMapUi.roundBox(b.graphics, 0, 0, w, h, over && enabled ? hover : fill, 1, edge, 6, 1.5);
        };
        b.buttonMode = true;
        b.mouseChildren = false;
        draw(false);
        t.y = ((h - size - 7) / 2) | 0;
        b.addChild(t);
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            draw(true);
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            draw(false);
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            if (enabled) {
                SOUNDS.Play("click1");
                onClick(e);
            }
        });
        // Pressing a button is not the start of a map drag.
        b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        b.setEnabled = (on: boolean): void => {
            enabled = on;
            b.alpha = Number(on ? 1 : 0.45);
            b.buttonMode = on;
            draw(false);
        };
        b.setText = (value: string): void => {
            t.text = value;
        };
        return b;
    }

    /**
     * A check box with its label, and a coloured dot before the label when dotColour is given. Clicking
     * anywhere on it flips it and calls onChange(checked).
     */
    public static checkbox(text: string, checked: boolean, onChange: Function, width: int, dotColour: int = -1): MovieClip {
        let c: MovieClip = null;
        let draw: Function = null;
        c = new MovieClip();
        let t: TextField = IoMapUi.label(text, 11, IoMapUi.INK, false, (width - (dotColour >= 0 ? 34 : 20)) | 0);
        draw = (): void => {
            let g: Graphics = c.graphics;
            g.clear();
            g.beginFill(0, 0);
            g.drawRect(0, 0, width, 20);
            g.endFill();
            IoMapUi.roundBox(g, 0, 3, 14, 14, (checked ? IoMapUi.GOLD : 0xFFF8E6) >>> 0, 1, IoMapUi.EDGE, 3, 1.5);
            if (checked) {
                g.lineStyle(2.2, IoMapUi.INK, 1, true);
                g.moveTo(3, 10);
                g.lineTo(6, 13.5);
                g.lineTo(11.5, 6);
                g.lineStyle();
            }
            if (dotColour >= 0) {
                g.lineStyle(1, 0, 0.9);
                g.beginFill(dotColour >>> 0, 1);
                g.drawCircle(25, 10, 5);
                g.endFill();
                g.lineStyle();
            }
        };
        t.x = dotColour >= 0 ? 34 : 20;
        t.y = 1;
        c.addChild(t);
        c.buttonMode = true;
        c.mouseChildren = false;
        draw();
        c.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            checked = !checked;
            draw();
            onChange(checked);
        });
        c.setChecked = (on: boolean): void => {
            checked = on;
            draw();
        };
        return c;
    }

    /** A map pin with its point at (x, y). */
    public static pin(g: Graphics, x: number, y: number, colour: uint, size: number = 14, edge: uint = 3811856): void {
        let r: number = size * 0.32;
        let cy: number = y - size + r;
        g.lineStyle(1, edge, 1, true);
        g.beginFill(colour, 1);
        g.moveTo(x, y);
        g.curveTo(x - r * 1.05, cy + r * 1.3, x - r, cy);
        g.curveTo(x - r, cy - r, x, cy - r);
        g.curveTo(x + r, cy - r, x + r, cy);
        g.curveTo(x + r * 1.05, cy + r * 1.3, x, y);
        g.endFill();
        g.lineStyle();
        g.beginFill(16774102, 1);
        g.drawCircle(x, cy, r * 0.4);
        g.endFill();
    }

    /** A small magnifying glass. */
    public static magnifier(g: Graphics, x: number, y: number, colour: uint): void {
        g.lineStyle(2, colour, 1, true);
        g.drawCircle(x + 5.5, y + 5.5, 4.5);
        g.moveTo(x + 9, y + 9);
        g.lineTo(x + 13, y + 13);
        g.lineStyle();
    }

    /** A chevron pointing down (or up). */
    public static chevron(g: Graphics, x: number, y: number, colour: uint, up: boolean = false): void {
        g.lineStyle(2, colour, 1, true);
        if (up) {
            g.moveTo(x, y + 5);
            g.lineTo(x + 5, y);
            g.lineTo(x + 10, y + 5);
        } else {
            g.moveTo(x, y);
            g.lineTo(x + 5, y + 5);
            g.lineTo(x + 10, y);
        }
        g.lineStyle();
    }

    /** An x (delete). */
    public static cross(g: Graphics, x: number, y: number, size: number, colour: uint): void {
        g.lineStyle(2, colour, 1, true);
        g.moveTo(x, y);
        g.lineTo(x + size, y + size);
        g.moveTo(x + size, y);
        g.lineTo(x, y + size);
        g.lineStyle();
    }

    /** A pencil (rename). */
    public static pencil(g: Graphics, x: number, y: number, colour: uint): void {
        g.lineStyle(1.6, colour, 1, true);
        g.moveTo(x, y + 10);
        g.lineTo(x + 3, y + 10);
        g.lineTo(x + 10, y + 3);
        g.lineTo(x + 7, y);
        g.lineTo(x, y + 7);
        g.lineTo(x, y + 10);
        g.lineStyle();
    }

    /** An invisible hit area of a size, so a Sprite answers the mouse all over. */
    public static hitArea(g: Graphics, w: number, h: number): void {
        g.beginFill(0, 0);
        g.drawRect(0, 0, w, h);
        g.endFill();
    }
}
