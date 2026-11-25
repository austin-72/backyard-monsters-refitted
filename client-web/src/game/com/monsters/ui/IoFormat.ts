import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, Graphics } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { SharedObject } from "flash/net";
import { TextField } from "flash/text";
import { GAME, GLOBAL, KEYS, UI_TOP } from "@game";

/**
 * Inferno-only: the game's one way of writing times, dates and numbers, in the player's language, and of colouring
 * how the player stands with others.
 *
 * - QoL #572: how long ago something was ("just now", "5 minutes ago", "3 weeks ago", "6 months ago", "2 years ago"),
 *   with the exact date and time when the pointer is over it (hover).
 * - QoL #574: one date format (date, dateLong, dateTime, time), the day and month names from the language file.
 * - QoL #577: the thousands separator of the language (GLOBAL.FormatNumber reads io_fmt_group too).
 * - QoL #228: colour-blind relationship colours (blue and orange in place of green and red), kept in this browser
 *   (the SharedObject bymr_data, ioColourBlind), and the F / H / A letters the map draws with them.
 *
 * Every text is a key (io_fmt_*); while the language file doesn't have one yet, the English here is used.
 * Times are in seconds since 1970, as the server sends them and GLOBAL.Timestamp() gives them.
 */
export class IoFormat extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    private static readonly MONTHS_EN: any[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    private static readonly MONTHS_SHORT_EN: any[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private static readonly WEEKDAYS_EN: any[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    /** The things already given an exact-time hover, and the time each shows (hover). */
    private static _hoverAt: WeakMap<any, number> = new WeakMap<any, number>();

    // ---- the language
    /** A key's text with its #v1#..., or `english` (with them too) while the language file doesn't have the key. */
    public static text(key: string, english: string, values: any = null): string {
        let s: string = KEYS.Get(key, values);
        if (s == null || s == key) {
            s = english;
            if (values != null) {
                for (let name in values) {
                    s = s.split("#" + name + "#").join(String(values[name]));
                }
            }
        }
        return s;
    }

    /** The time now: the server's, as the game keeps it (GLOBAL.Timestamp), or the browser's before a yard is up. */
    public static now(): number {
        let t: number = GLOBAL.Timestamp();
        return t > 0 ? t : Math.floor(new Date().getTime() / 1000);
    }

    // ---- QoL #572: how long ago
    /**
     * How long ago `at` was: "just now", "5 minutes ago", "3 hours ago", "4 days ago", "3 weeks ago", "6 months ago",
     * "2 years ago". `short`: "5 min ago", "3 h ago", "4 d ago" for narrow columns (weeks and longer the same).
     * "" for no time.
     */
    public static ago(at: number, short: boolean = false): string {
        if (!(at > 0)) {
            return "";
        }
        return IoFormat.since(IoFormat.now() - at, short, at);
    }

    /**
     * The same from the seconds gone by. Under a minute: just now; minutes, hours; days up to 13, then weeks up to
     * 8; then months as the calendar counts them (from `at`, or worked back from now), and years from 12 months.
     */
    public static since(seconds: number, short: boolean = false, at: number = 0): string {
        let s: number = Math.max(0, Math.floor(Number(seconds) || 0));
        if (s < 60) {
            return IoFormat.text("io_fmt_just_now", "just now");
        }
        let span: string = null;
        if (s < 3600) {
            span = IoFormat.unit(Math.floor(s / 60), "minute", short ? "io_fmt_min_short" : null, "#v1# min");
        } else if (s < 86400) {
            span = IoFormat.unit(Math.floor(s / 3600), "hour", short ? "io_fmt_h_short" : null, "#v1# h");
        } else {
            let days: int = Math.floor(s / 86400) | 0;
            if (days < 14) {
                span = IoFormat.unit(days, "day", short ? "io_fmt_d_short" : null, "#v1# d");
            } else if (days < 60) {
                span = IoFormat.unit(Math.floor(days / 7), "week");
            } else {
                let now: number = IoFormat.now();
                let months: int = Math.max(2, IoFormat.monthsBetween(at > 0 ? at : now - s, now)) | 0;
                span = months < 12 ? IoFormat.unit(months, "month") : IoFormat.unit(Math.max(1, Math.floor(months / 12)), "year");
            }
        }
        return IoFormat.text("io_fmt_ago", "#v1# ago", { "v1": span });
    }

    /** "1 week", "3 weeks" (io_fmt_week, io_fmt_weeks), or the short form's key when there is one. */
    private static unit(n: number, name: string, shortKey: string = null, shortEnglish: string = null): string {
        if (shortKey) {
            return IoFormat.text(shortKey, shortEnglish, { "v1": n });
        }
        return n == 1 ? IoFormat.text("io_fmt_" + name, "#v1# " + name, { "v1": n }) : IoFormat.text("io_fmt_" + name + "s", "#v1# " + name + "s", { "v1": n });
    }

    /** Whole calendar months from one time to a later one (15 April to 15 October: 6; to 14 October: 5). */
    private static monthsBetween(from: number, to: number): int {
        let a: Date = new Date(from * 1000);
        let b: Date = new Date(to * 1000);
        let m: int = ((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())) | 0;
        if (b.getDate() < a.getDate()) {
            m--;
        }
        return Math.max(0, m) | 0;
    }

    /** The exact date and time of `at`, for the hover: "Thursday 15 October 2026, 14:32". */
    public static exact(at: number): string {
        if (!(at > 0)) {
            return "";
        }
        return IoFormat.text("io_fmt_date_time", "#v1#, #v2#", { "v1": IoFormat.dateLong(at), "v2": IoFormat.time(at) });
    }

    /**
     * Shows the exact date and time of `at` (exact) while the pointer is over `target` (the top bar's tip,
     * UI_TOP.ioTip). Called again for the same thing (a row filled again), it only changes the time it shows. A text
     * field is made to take the pointer for it. Nothing outside the Inferno.
     */
    public static hover(target: DisplayObject, at: number): void {
        if (!GLOBAL.INFERNO_ONLY || !target || !(at > 0)) {
            return;
        }
        let known: boolean = IoFormat._hoverAt.has(target);
        IoFormat._hoverAt.set(target, at);
        if (known) {
            return;
        }
        if (as3.is(target, TextField)) {
            (target as TextField).mouseEnabled = true;
        }
        target.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            let when: number = Number(IoFormat._hoverAt.get(target)) || 0;
            if (when > 0) {
                UI_TOP.ioTip(target, IoFormat.exact(when));
            }
        });
        target.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            UI_TOP.ioTipHide();
        });
        target.addEventListener(Event.REMOVED_FROM_STAGE, (e: Event): void => {
            UI_TOP.ioTipHide();
        });
    }

    // ---- QoL #574: dates
    /** "October" (io_fmt_month_10); m from 0. */
    public static monthName(m: int): string {
        m = Math.max(0, Math.min(11, m)) | 0;
        return IoFormat.text("io_fmt_month_" + (m + 1), String(IoFormat.MONTHS_EN[m]));
    }

    /** "Oct" (io_fmt_mon_10); m from 0. */
    public static monthShort(m: int): string {
        m = Math.max(0, Math.min(11, m)) | 0;
        return IoFormat.text("io_fmt_mon_" + (m + 1), String(IoFormat.MONTHS_SHORT_EN[m]));
    }

    /** "Thursday" (io_fmt_weekday_4); d from 0, Sunday. */
    public static weekdayName(d: int): string {
        d = Math.max(0, Math.min(6, d)) | 0;
        return IoFormat.text("io_fmt_weekday_" + d, String(IoFormat.WEEKDAYS_EN[d]));
    }

    /** "15 Oct 2026", the player's own day. "" for no time. */
    public static date(at: number): string {
        if (!(at > 0)) {
            return "";
        }
        return IoFormat.dateOf(new Date(at * 1000), false);
    }

    /** "Thursday 15 October 2026". */
    public static dateLong(at: number): string {
        if (!(at > 0)) {
            return "";
        }
        return IoFormat.dateOf(new Date(at * 1000), true);
    }

    /** "15 Oct 2026, 14:32". */
    public static dateTime(at: number): string {
        if (!(at > 0)) {
            return "";
        }
        return IoFormat.text("io_fmt_date_time", "#v1#, #v2#", { "v1": IoFormat.date(at), "v2": IoFormat.time(at) });
    }

    /** "14:32", the player's own clock. */
    public static time(at: number): string {
        let d: Date = new Date(at * 1000);
        return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    }

    /** A day written "2026-10-04" (the Change Log's): "4 Oct 2026", or "Sunday 4 October 2026" (`long`). */
    public static isoDay(iso: string, long: boolean = false): string {
        let p: any[] = String(iso).split("-");
        if (p.length < 3) {
            return String(iso);
        }
        let y: int = p[0] | 0;
        let m: int = ((p[1] | 0) - 1) | 0;
        let d: int = p[2] | 0;
        if (m < 0 || m > 11 || d < 1 || d > 31) {
            return String(iso);
        }
        return IoFormat.dateOf(new Date(y, m, d), long);
    }

    private static dateOf(d: Date, long: boolean): string {
        if (long) {
            return IoFormat.text("io_fmt_date_long", "#v1# #v2# #v3# #v4#", { "v1": IoFormat.weekdayName(d.getDay()), "v2": d.getDate(), "v3": IoFormat.monthName(d.getMonth()), "v4": d.getFullYear() });
        }
        return IoFormat.text("io_fmt_date", "#v1# #v2# #v3#", { "v1": d.getDate(), "v2": IoFormat.monthShort(d.getMonth()), "v3": d.getFullYear() });
    }

    // ---- QoL #577: numbers
    /** 1,234,567 in English, 1 234 567 in French (GLOBAL.FormatNumber). */
    public static number(n: number): string {
        return GLOBAL.FormatNumber(n);
    }

    /** The language's thousands separator: io_fmt_group is "comma", "space" (a no-break space) or "dot". */
    public static groupSeparator(): string {
        let g: string = KEYS.Get("io_fmt_group");
        return g == "space" ? "\u00A0" : (g == "dot" ? "." : ",");
    }

    // ---- QoL #228: colour-blind relationship colours
    /** Friendly and hostile in blue and orange (opt-in, kept in this browser). Never outside the Inferno. */
    public static get colourBlind(): boolean {
        if (!GLOBAL.INFERNO_ONLY) {
            return false;
        }
        try {
            let so: SharedObject = GAME.sharedObj || SharedObject.getLocal("bymr_data", "/");
            return so.data.ioColourBlind === true;
        } catch (e) {
        }
        return false;
    }

    /** Turns them on or off (the page's settings, src/player/Shell.ts: window.__game.IoFormat.setColourBlind). */
    public static setColourBlind(on: boolean): void {
        try {
            let so: SharedObject = GAME.sharedObj || SharedObject.getLocal("bymr_data", "/");
            if (on) {
                so.data.ioColourBlind = true;
            } else {
                delete so.data.ioColourBlind;
            }
            so.flush();
        } catch (e) {
        }
        IoFormat.relVersion = (IoFormat.relVersion + 1) | 0;
    }

    /** Goes up each time the setting changes (what is drawn with the colours is drawn again). */
    public static relVersion: int = 0;

    /** Colour-blind friendly: on the map and dark windows, and on the chat's light lines. */
    public static readonly CB_FRIENDLY_DARK: uint = 0x33B5FF;

    public static readonly CB_HOSTILE_DARK: uint = 0xFF9A1F;

    public static readonly CB_FRIENDLY_LIGHT: uint = 0x0072B2;

    public static readonly CB_HOSTILE_LIGHT: uint = 0xD55E00;

    /**
     * A relationship's colour: `stock` as it is, or with the colour-blind setting a friendly (stance > 0, not your
     * own alliance) one blue and a hostile (stance < 0) one orange, `dark` for a dark background (the map) or not
     * (the chat's lines). Your own alliance, neutral and none keep `stock`.
     */
    public static relColour(stance: int, stock: uint, dark: boolean = true): uint {
        if (stance == 0 || !IoFormat.colourBlind) {
            return stock;
        }
        if (stance < 0) {
            return dark ? IoFormat.CB_HOSTILE_DARK : IoFormat.CB_HOSTILE_LIGHT;
        }
        return dark ? IoFormat.CB_FRIENDLY_DARK : IoFormat.CB_FRIENDLY_LIGHT;
    }

    /** The same for a colour written "#RRGGBB" (HTML text). */
    public static relHtml(stance: int, stock: string, dark: boolean = true): string {
        if (stance == 0 || !IoFormat.colourBlind) {
            return stock;
        }
        let c: uint = IoFormat.relColour(stance, 0, dark);
        let hex: string = c.toString(16).toUpperCase();
        while (hex.length < 6) {
            hex = "0" + hex;
        }
        return "#" + hex;
    }

    /** The letter for a relationship: "F" friendly (1), "H" hostile (-1), "A" your alliance (4); "" otherwise. */
    public static relLetter(stance: int): string {
        if (stance < 0) {
            return IoFormat.text("io_fmt_rel_h_letter", "H");
        }
        if (stance == 4) {
            return IoFormat.text("io_fmt_rel_a_letter", "A");
        }
        if (stance > 0) {
            return IoFormat.text("io_fmt_rel_f_letter", "F");
        }
        return "";
    }

    /**
     * Strokes of the letters the map can draw (a letter of the language's that isn't here is drawn as the English
     * one): each stroke a list of points, x 0-0.7, y 0-1 from the top.
     */
    private static readonly STROKES: any = {
        "A": [[0, 1, 0.35, 0, 0.7, 1], [0.13, 0.62, 0.57, 0.62]],
        "E": [[0.62, 0, 0, 0, 0, 1, 0.62, 1], [0, 0.5, 0.5, 0.5]],
        "F": [[0.62, 0, 0, 0, 0, 1], [0, 0.5, 0.5, 0.5]],
        "H": [[0, 0, 0, 1], [0.7, 0, 0.7, 1], [0, 0.5, 0.7, 0.5]],
        "M": [[0, 1, 0, 0, 0.35, 0.6, 0.7, 0, 0.7, 1]],
        "N": [[0, 1, 0, 0, 0.7, 1, 0.7, 0]],
        "S": [[0.66, 0.12, 0.42, 0, 0.16, 0.04, 0.04, 0.22, 0.2, 0.42, 0.52, 0.56, 0.68, 0.76, 0.56, 0.96, 0.28, 1, 0.02, 0.88]],
        "T": [[0, 0, 0.7, 0], [0.35, 0, 0.35, 1]],
        "V": [[0, 0, 0.35, 1, 0.7, 0]]
    };

    /** Draws a relationship's letter (relLetter), `h` pixels tall, centred on (cx, cy), in strokes of `colour`. */
    public static drawLetter(g: Graphics, stance: int, cx: number, cy: number, h: number, colour: uint = 0): void {
        let letter: string = IoFormat.relLetter(stance).toUpperCase();
        if (!letter) {
            return;
        }
        let strokes: any[] = as3.as(IoFormat.STROKES[letter], Array);
        if (!strokes) {
            strokes = as3.as(IoFormat.STROKES[stance < 0 ? "H" : (stance == 4 ? "A" : "F")], Array);
        }
        if (!strokes || h < 3) {
            return;
        }
        let left: number = cx - 0.35 * h;
        let top: number = cy - 0.5 * h;
        g.lineStyle(Math.max(1, h * 0.16), colour, 1, false, "normal", "round", "round");
        for (let stroke of as3.values(strokes)) {
            let p: any[] = as3.as(stroke, Array);
            g.moveTo(left + Number(p[0]) * h, top + Number(p[1]) * h);
            for (let i: int = 2; i + 1 < p.length; i += 2) {
                g.lineTo(left + Number(p[i]) * h, top + Number(p[i + 1]) * h);
            }
        }
        g.lineStyle();
    }

    /**
     * A round badge with a relationship's letter (the map's name bars): its colour (relColour of `stock`), a dark
     * ring, the letter in black. Nothing for a stance without a letter.
     */
    public static drawBadge(g: Graphics, stance: int, stock: uint, cx: number, cy: number, r: number): void {
        if (!IoFormat.relLetter(stance)) {
            return;
        }
        g.lineStyle(1, 0x140805, 0.95);
        g.beginFill(IoFormat.relColour(stance, stock, true), 1);
        g.drawCircle(cx, cy, r);
        g.endFill();
        IoFormat.drawLetter(g, stance, cx, cy, r * 1.15, 0x140805);
    }
}
