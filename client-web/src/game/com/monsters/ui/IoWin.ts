import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, DisplayObjectContainer, GradientType, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { Timer, clearTimeout, getQualifiedClassName, getTimer, setTimeout } from "flash/utils";
import { CasinoUI, GLOBAL, IoKit, IoToast, KEYS, MESSAGE, POPUPS, POPUPSETTINGS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only (15 October): what every window shares, so each one doesn't do it its own way.
 *
 * - QoL #446 withRef / errRef: a failure the server reported itself says its reference in small print ("ref 1a2b3c4d"),
 *   the one the admin panel's Bugs tab finds it by. GLOBAL.Message and GLOBAL.ErrorMessage add it on their own while
 *   a server answer is being handled (URLLoaderApi.ioRefFor).
 * - QoL #447 watchLoading: a "Loading…" line says "Can't reach the server, retrying…" once two requests in a row got
 *   no answer (URLLoaderApi.ioUnreachable), and goes back to "Loading…" when one does.
 * - QoL #465 closeX: the one close button: the kit's round X, 14 px round, 24 px in from the window's top-right corner.
 * - QoL #466 fit: a window wider or taller than the stage is shown smaller, to fit, and again when the stage changes size.
 * - QoL #467 openFrom / takeBack / backLink / goBack: a short back-stack: a window opened from another shows
 *   "◀ Quest Book" and its X goes back there.
 * - QoL #472 caption / longPress: a caption under a picture-only button; on a touch screen, holding it shows its tip.
 * - QoL #481 howToFor / showHowTo: the window frame's "?" and its short how-tos.
 * - openPanel: a small window in the Inferno's style (the Alerts bell's list).
 */
export class IoWin {
    // ---- QoL #446: the server's reference in small print
    /** `text` with "ref 1a2b3c4d" under it in small print (unchanged without a ref, or when it says it already). */
    public static withRef(text: string, ref: string): string {
        let t: string = text == null ? "" : String(text);
        if (!GLOBAL.INFERNO_ONLY || !ref) {
            return t;
        }
        let r: string = String(ref).replace(/[^A-Za-z0-9_\-]/g, "").substr(0, 32);
        if (r == "" || t.indexOf(r) >= 0) {
            return t;
        }
        return t + "<br><font size=\"9\" color=\"#8C8C8C\">" + KEYS.Get("io_win_ref", { "v1": r }) + "</font>";
    }

    /** `text` with the ref of `answer` (a server answer), or of the answer being handled now. */
    public static errRef(text: string, answer: any = null): string {
        let ref: string = answer && answer.ref ? String(answer.ref) : URLLoaderApi.ioRefFor(text);
        return IoWin.withRef(text, ref);
    }

    // ---- QoL #447: "Loading…" that never ends says so
    private static _watched: any[] = [];

    private static _watchTimer: Timer = null;

    /**
     * Watches a "Loading…" line: while the server can't be reached (two requests in a row with no answer) it says
     * "Can't reach the server, retrying…", and its own text again once an answer comes. Stops when the caller puts
     * something else in it, or it has left the stage.
     */
    public static watchLoading(field: TextField): void {
        if (!GLOBAL.INFERNO_ONLY || !field) {
            return;
        }
        for (let w of as3.values(IoWin._watched)) {
            if (w.f == field) {
                return;
            }
        }
        IoWin._watched.push({ "f": field, "text": field.text, "html": field.htmlText, "retry": null, "seen": false, "at": getTimer() });
        if (!IoWin._watchTimer) {
            IoWin._watchTimer = new Timer(500);
            IoWin._watchTimer.addEventListener(TimerEvent.TIMER, IoWin.watchTick);
            IoWin._watchTimer.start();
        }
        IoWin.watchTick();
    }

    private static watchTick(e: TimerEvent = null): void {
        let list: any[] = IoWin._watched;
        let down: boolean = URLLoaderApi.ioUnreachable;
        for (let i: int = (list.length - 1) | 0; i >= 0; i--) {
            let w: any = list[i];
            let f: TextField = w.f;
            if (!f.stage) {
                // (not shown yet: waits a while; shown and gone: done)
                if (w.seen || getTimer() - w.at > 600000) {
                    list.splice(i, 1);
                }
                continue;
            }
            w.seen = true;
            if (w.retry != null) {
                if (f.text != w.retry) {
                    list.splice(i, 1);
                } else if (!down) {
                    f.htmlText = w.html;
                    w.retry = null;
                }
            } else if (f.text != w.text) {
                list.splice(i, 1);
            } else if (down) {
                f.text = KEYS.Get("io_win_unreachable");
                w.retry = f.text;
            }
        }
        if (list.length == 0 && IoWin._watchTimer) {
            IoWin._watchTimer.removeEventListener(TimerEvent.TIMER, IoWin.watchTick);
            IoWin._watchTimer.stop();
            IoWin._watchTimer = null;
        }
    }

    /** "Loading…", or "Can't reach the server, retrying…" while it can't be reached (for a line drawn afresh each time). */
    public static loadingText(loading: string = null): string {
        if (GLOBAL.INFERNO_ONLY && URLLoaderApi.ioUnreachable) {
            return KEYS.Get("io_win_unreachable");
        }
        return loading != null ? loading : KEYS.Get("io_win_loading");
    }

    // ---- QoL #465: one close button
    public static readonly CLOSE_R: int = 14;

    public static readonly CLOSE_INSET: int = 24;

    /**
     * The close button, named `name` (end it in "Close": Esc and Back find it, IoEscape), in `parent`, for a window
     * whose right edge is at `right` and top at `top` (in parent's coordinates): the kit's X, CLOSE_R round, CLOSE_INSET
     * in from that corner. `onClose` gets the click.
     */
    public static closeX(parent: DisplayObjectContainer, name: string, right: number, top: number, onClose: Function): Sprite {
        let x: Sprite = IoKit.closeButton(name, IoWin.CLOSE_R, (e: any): void => {});
        x.x = right - IoWin.CLOSE_INSET;
        x.y = top + IoWin.CLOSE_INSET;
        if (onClose != null) {
            x.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                onClose(e);
            });
        }
        if (parent) {
            parent.addChild(x);
        }
        return x;
    }

    // ---- QoL #466: windows wider than the stage fit it
    private static _fits: any[] = [];

    /**
     * Shows `win` (a window drawn round its own centre, w x h) centred, smaller where the stage is narrower or lower
     * than it with 8 px to spare each side, and kept on the stage top to bottom. Again whenever the stage changes
     * size, while it is open. Returns the scale.
     */
    public static fit(win: DisplayObject, w: number, h: number): number {
        if (!GLOBAL.INFERNO_ONLY || !win || !GLOBAL._SCREEN) {
            return 1;
        }
        let entry: any = null;
        for (let f of as3.values(IoWin._fits)) {
            if (f.win == win) {
                entry = f;
            }
        }
        if (!entry) {
            entry = { "win": win, "w": w, "h": h, "k": 1, "sw": 0, "sh": 0, "at": 0 };
            IoWin._fits.push(entry);
            win.addEventListener(Event.ENTER_FRAME, IoWin.fitTick, false, 0, true);
        }
        entry.w = w;
        entry.h = h;
        IoWin.fitNow(entry);
        return entry.k;
    }

    private static fitNow(f: any): void {
        let sw: number = Number(GLOBAL._SCREEN.width);
        let sh: number = Number(GLOBAL._SCREEN.height);
        let k: number = Math.max(0.4, Math.min(1, (sw - 16) / Math.max(1, f.w), (sh - 16) / Math.max(1, f.h)));
        f.k = k;
        f.sw = sw;
        f.sh = sh;
        f.at = getTimer();
        f.win.scaleX = f.win.scaleY = k;
        POPUPSETTINGS.AlignToCenter(f.win);
        // (AlignToCenter sits a window 100 px above the middle: a tall one went off the top)
        let half: number = f.h * k / 2;
        let top: number = Number(GLOBAL._SCREEN.y) + 8 + half;
        let bottom: number = Number(GLOBAL._SCREEN.y) + sh - 8 - half;
        if (top <= bottom) {
            f.win.y = Math.round(Math.max(top, Math.min(f.win.y, bottom)));
        } else {
            f.win.y = Math.round(Number(GLOBAL._SCREEN.y) + sh / 2);
        }
    }

    private static fitTick(e: Event): void {
        let win: DisplayObject = as3.as(e.currentTarget, DisplayObject);
        let entry: any = null;
        let i: int = 0;
        for (i = 0; i < IoWin._fits.length; i++) {
            if (IoWin._fits[i].win == win) {
                entry = IoWin._fits[i];
                break;
            }
        }
        if (!entry) {
            win.removeEventListener(Event.ENTER_FRAME, IoWin.fitTick);
            return;
        }
        if (!win.stage) {
            if (getTimer() - entry.at > 2000) {
                win.removeEventListener(Event.ENTER_FRAME, IoWin.fitTick);
                IoWin._fits.splice(i, 1);
            }
            return;
        }
        let resized: boolean = entry.sw != Number(GLOBAL._SCREEN.width) || entry.sh != Number(GLOBAL._SCREEN.height);
        // (a window's own grow-in tween to full size, after it was fitted)
        let regrown: boolean = entry.k < 1 && getTimer() - entry.at > 300 && Math.abs(win.scaleX - entry.k) > 0.001;
        if (resized || regrown) {
            IoWin.fitNow(entry);
        }
    }

    // ---- QoL #467: a short back-stack
    private static _back: any = null;

    /**
     * Called by a window just before it opens another (the Quest Book's Go there), or loads a yard (`yard`: the
     * Outposts list's View): the next window shows "◀ label" and its X goes back by `reopen`.
     */
    public static openFrom(label: string, reopen: Function, yard: boolean = false): void {
        if (!GLOBAL.INFERNO_ONLY || reopen == null) {
            return;
        }
        IoWin._back = { "label": String(label), "reopen": reopen, "at": getTimer(), "yard": yard };
    }

    /** For a window opening now: where it was opened from (openFrom in the last 2.5 s), taken; or null. */
    public static takeBack(): any {
        let b: any = IoWin._back;
        if (!GLOBAL.INFERNO_ONLY || !b || b.yard) {
            return null;
        }
        IoWin._back = null;
        return getTimer() - b.at < 2500 ? b : null;
    }

    /** "◀ Quest Book" at (x, y) in parent, for `back` (takeBack): a click runs `go` (the window's close, then goBack). */
    public static backLink(parent: DisplayObjectContainer, x: number, y: number, back: any, go: Function): Sprite {
        if (!back || !parent) {
            return null;
        }
        let s: Sprite = new Sprite();
        s.name = "ioWinBack";
        s.buttonMode = true;
        s.mouseChildren = false;
        let t: TextField = CasinoUI.label(KEYS.Get("io_win_back", { "v1": back.label }), 12, CasinoUI.GOLD, true, 240, TextFormatAlign.LEFT);
        t.width = Math.min(240, Math.ceil(t.textWidth) + 8);
        t.x = 9;
        t.y = 3;
        s.graphics.lineStyle(1.5, 14708778, 1);
        s.graphics.beginFill(0x1E1210, 0.94);
        s.graphics.drawRoundRect(0, 0, t.width + 18, 24, 12, 12);
        s.graphics.endFill();
        s.addChild(t);
        s.x = Math.round(x);
        s.y = Math.round(y);
        s.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            if (go != null) {
                go();
            }
        });
        parent.addChild(s);
        // (24 October: over a tall window (the build menu, from the Quest Book's Go there) 50 above its top is in the top
        // bar, over the Shiny count: kept below the bar, over the frame's corner. The window is placed (and may grow in)
        // after this, so looked at for its first second on the screen.)
        let y0: number = s.y;
        let frames: int = 0;
        let keep: Function = (e: Event): void => {
            if (++frames > 40) {
                s.removeEventListener(Event.ENTER_FRAME, keep);
                return;
            }
            if (!s.stage || !s.parent || !GLOBAL._SCREEN || !GLOBAL._layerTop) {
                return;
            }
            try {
                let bar: number = GLOBAL._layerTop.localToGlobal(new Point(0, GLOBAL._SCREEN.y + 48)).y;
                let atTop: number = s.parent.localToGlobal(new Point(s.x, y0)).y;
                let want: number = y0;
                if (atTop < bar) {
                    want = s.parent.globalToLocal(new Point(0, bar)).y - s.parent.globalToLocal(new Point(0, atTop)).y + y0;
                }
                if (Math.abs(s.y - want) > 0.5) {
                    s.y = Math.round(want);
                }
            } catch (err) {
            }
        };
        s.addEventListener(Event.ENTER_FRAME, keep);
        return s;
    }

    /** Opens again the window `back` came from (once; just after the one closing has gone). */
    public static goBack(back: any): void {
        if (!back || back.reopen == null) {
            return;
        }
        let f: Function = back.reopen;
        back.reopen = null;
        setTimeout((): void => {
            try {
                f();
            } catch (err) {
            }
        }, 1);
    }

    /**
     * UI_TOP, as a yard of the player's own opens: a yard opened from a window (openFrom with `yard`, in the last 90
     * s) says so on a toast, with "◀ Outposts" on its button, once the yard's popups are done.
     */
    public static yardArrived(): void {
        let b: any = IoWin._back;
        if (!GLOBAL.INFERNO_ONLY || !b || !b.yard || getTimer() - b.at < 300) {
            return;
        }
        IoWin._back = null;
        if (getTimer() - b.at > 90000) {
            return;
        }
        POPUPS.ioWhenClear((): void => {
            IoToast.Show(KEYS.Get("io_win_back_toast", { "v1": b.label }), 8000, KEYS.Get("io_win_back", { "v1": b.label }), (): void => {
                IoWin.goBack(b);
            });
        });
    }

    // ---- QoL #472: captions, and long-press tips on touch
    /** A caption (a child named "ioCaption" of target), `w` wide, centred on cx, its top at y; set again if it exists. */
    public static caption(target: DisplayObjectContainer, text: string, cx: number, y: number, w: number = 76): TextField {
        if (!target) {
            return null;
        }
        let t: TextField = as3.as(target.getChildByName("ioCaption"), TextField);
        if (!t) {
            t = CasinoUI.label("", 9, 0xFFF0D0, true, w, TextFormatAlign.CENTER);
            t.name = "ioCaption";
            t.mouseEnabled = false;
            t.filters = [new GlowFilter(0x1A0602, 1, 3, 3, 8, 1)];
            target.addChild(t);
        }
        if (t.text != text) {
            t.text = text;
        }
        t.width = w;
        t.height = 16;
        t.x = Math.round(cx - w / 2);
        t.y = Math.round(y);
        return t;
    }

    /**
     * On a touch screen (GLOBAL.ioTouch), holding `target` half a second shows its tip (`show`, or the target's own
     * MOUSE_OVER), gone 2.5 s later (`hide`, or its MOUSE_OUT), and the tap that ends the hold doesn't press it.
     */
    public static longPress(target: DisplayObject, show: Function = null, hide: Function = null): void {
        if (!GLOBAL.INFERNO_ONLY || !target) {
            return;
        }
        let timer: number = 0;
        let fired: boolean = false;
        let cancel: Function = (e: any = null): void => {
            if (timer) {
                clearTimeout(timer);
                timer = 0;
            }
            if (target.stage) {
                target.stage.removeEventListener(MouseEvent.MOUSE_UP, cancel);
            }
        };
        target.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (!GLOBAL.ioTouch) {
                return;
            }
            fired = false;
            cancel();
            if (target.stage) {
                target.stage.addEventListener(MouseEvent.MOUSE_UP, cancel);
            }
            timer = setTimeout((): void => {
                timer = 0;
                if (!target.stage) {
                    return;
                }
                fired = true;
                if (show != null) {
                    show();
                } else {
                    target.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_OVER, true, false));
                }
                setTimeout((): void => {
                    if (hide != null) {
                        hide();
                    } else {
                        target.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_OUT, true, false));
                    }
                }, 2500);
            }, 500);
        });
        target.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (fired) {
                fired = false;
                e.stopImmediatePropagation();
            }
        }, false, 1000);
    }

    // ---- QoL #481: the frame's "?" and its how-tos
    /** The windows with a how-to (by their class), and its key. */
    private static readonly HOWTO: any = { "HATCHERYPOPUP": "io_win_help_hatchery", "HATCHERYCCPOPUP": "io_win_help_hcc", "CREATURELOCKERPOPUP": "io_win_help_locker", "ACADEMYPOPUP": "io_win_help_academy", "HOUSINGPOPUP": "io_win_help_housing", "BUILDINGOPTIONSPOPUP": "io_win_help_building" };

    /** The how-to key of the window `win` (a stock window holding a frame), or null when it has none. */
    public static howToFor(win: any): string {
        if (!GLOBAL.INFERNO_ONLY || !win) {
            return null;
        }
        let cls: string = String(getQualifiedClassName(win));
        cls = cls.substr(cls.lastIndexOf(":") + 1);
        return IoWin.HOWTO.hasOwnProperty(cls) ? as3.str(IoWin.HOWTO[cls]) : null;
    }

    /** Shows the how-to `key` over the window, with OK. */
    public static showHowTo(key: string): MESSAGE {
        SOUNDS.Play("click1");
        let m: MESSAGE = new MESSAGE();
        m.name = "ioWinHowTo";
        m.Show(KEYS.Get(key), KEYS.Get("btn_ok"));
        return m;
    }

    // ---- a small window in the Inferno's style
    /**
     * Opens a w x h window named `name`, with `title` and the close X ("<name>Close"), over a backdrop that closes it
     * too, centred and fitted (fit). Returns { mc, left, top, w, h, close() }; its content goes in mc, round its centre.
     */
    public static openPanel(name: string, w: int, h: int, title: string): any {
        let left: int = (-w / 2) | 0;
        let top: int = (-h / 2) | 0;
        let mc: MovieClip = new MovieClip();
        mc.name = name;
        let bg: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(w, h, Math.PI / 2, left, top);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(left, top, w, h, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        IoKit.rim(mc, name + "Rim", left, top, w, h, bg);
        let t: TextField = as3.as(mc.addChild(CasinoUI.title(title, 24, w - 90, TextFormatAlign.LEFT)), TextField);
        t.name = name + "Title";
        GLOBAL.ioFitText(t, 16);
        t.x = left + 20;
        t.y = top + 12;
        let win: any = { "mc": mc, "left": left, "top": top, "w": w, "h": h, "closed": false, "close": null };
        win.close = (e: any = null): void => {
            if (win.closed) {
                return;
            }
            win.closed = true;
            if (mc.parent) {
                mc.parent.removeChild(mc);
                GLOBAL.BlockerRemove();
                SOUNDS.Play("close");
            }
        };
        IoWin.closeX(mc, name + "Close", -left, top, win.close);
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL.ioBackdropCloses(win.close);
        GLOBAL._layerTop.addChild(mc);
        IoWin.fit(mc, w, h);
        return win;
    }
}
