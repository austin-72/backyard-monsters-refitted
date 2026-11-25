import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Graphics, Loader, MovieClip, Shape, Sprite } from "flash/display";
import { Event, IOErrorEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { Matrix } from "flash/geom";
import { TextField } from "flash/text";
import { ArcadeArt, Button_CLIP, GLOBAL, ImageCache } from "@game";

/**
 * The UI kit (11 October): pictures for the game's own-drawn buttons, tabs, panels, window rims, bet chips and the
 * top bar's round buttons, in server/public/assets/ui/kit (painted by art/uikit/uikit.py). The pictures are at
 * twice the size they are drawn, and most are drawn in nine parts (corners kept, edges and middle stretched), so a
 * button of any size keeps its rounded ends.
 *
 * Every helper here returns false (draws nothing) while a picture has not loaded, or if it never does: the caller
 * then draws its old shapes, and redraws with the kit once it has loaded (whenLoaded). So a missing file only
 * brings back the old look.
 */
export class IoKit extends ASObject {
    public static readonly DIR: string = "ui/kit/";

    /** The size of the files over the size they are drawn. */
    public static readonly SCALE: number = 2;

    /** The nine-part pieces' insets (left, top, right, bottom) in the file's pixels (art/uikit/uikit.py SLICES). */
    public static readonly PIECES: any = {
        "btn_molten": [28, 28, 28, 28],
        "btn_molten_h": [28, 28, 28, 28],
        "btn_molten_p": [28, 28, 28, 28],
        "btn_molten_d": [28, 28, 28, 28],
        "btn_obsidian": [28, 28, 28, 28],
        "btn_obsidian_h": [28, 28, 28, 28],
        "tab": [24, 24, 24, 16],
        "tab_h": [24, 24, 24, 16],
        "tab_on": [24, 24, 24, 16],
        "panel": [32, 32, 32, 32],
        "frame": [60, 60, 60, 60],
        "row_wood": [24, 24, 24, 24],
        "field": [16, 16, 16, 16],
        // the frozen events' (art/uikit/events.py)
        "btn_ice": [28, 28, 28, 28],
        "btn_ice_h": [28, 28, 28, 28],
        "btn_ice_d": [28, 28, 28, 28],
        "btn_steel": [28, 28, 28, 28],
        "btn_steel_h": [28, 28, 28, 28],
        "frame_ice": [60, 60, 60, 60],
    };

    /** The whole pictures (drawn at a size, not in parts). */
    public static readonly WHOLE: any[] = ["panel_tile", "close", "close_h", "arrow_right", "arrow_right_h", "arrow_left", "arrow_left_h", "ring", "ring_h", "ring_ice", "ring_ice_h", "chip_1", "chip_5", "chip_10", "chip_25", "chip_50", "chip_100", "chip_250", "chip_500"];

    /** name: its BitmapData once loaded, "loading", or "failed". */
    private static _art: any = {};

    /** Callbacks waiting for pictures: [names, fn]. */
    private static _waiting: any[] = [];

    /** Starts loading every piece (the yard's start: they are small, and ready before a window is opened). */
    public static preload(): void {
        for (let k in IoKit.PIECES) {
            IoKit.get(k);
        }
        for (const k of as3.values(IoKit.WHOLE)) {
            IoKit.get(as3.str(k));
        }
        // (pictures drawn once when their window opens: warm, so the first opening has them)
        for (const k of as3.values(IoKit.WARM)) {
            ArcadeArt.picture(as3.str(k));
        }
    }

    /** Other windows' pictures drawn once as they open (the Gauntlet's gates). */
    public static readonly WARM: any[] = ["popups/gauntlet/gate_sealed.png", "popups/gauntlet/gate_burning.png", "popups/gauntlet/gate_broken.png"];

    /** The picture, or null while it loads (it starts loading) or when it failed. */
    public static get(name: string): BitmapData {
        let a: any = IoKit._art[name];
        if (a instanceof BitmapData) {
            return as3.cast(a, BitmapData);
        }
        if (a == null) {
            IoKit._art[name] = "loading";
            if (!ImageCache.prependImagePath) {
                // (before the game's own picture path is known: the sign-in screen. Straight from the CDN)
                let loader: Loader = new Loader();
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, (e: Event): void => {
                    let bm: Bitmap = as3.as(loader.content, Bitmap);
                    IoKit._art[name] = bm && bm.bitmapData ? bm.bitmapData : "failed";
                    IoKit.wake();
                });
                loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (e: Event): void => {
                    IoKit._art[name] = "failed";
                    IoKit.wake();
                });
                loader.load(new URLRequest(GLOBAL.ioVersioned(GLOBAL.cdnUrl + "assets/" + IoKit.DIR + name + ".png")));
                return null;
            }
            ImageCache.GetImageWithCallBack(IoKit.DIR + name + ".png", (k: string, bmd: BitmapData, args: any[] = null): void => {
                IoKit._art[name] = bmd ? bmd : "failed";
                IoKit.wake();
            });
        }
        return null;
    }

    public static has(name: string): boolean {
        return IoKit._art[name] instanceof BitmapData;
    }

    /** fn() once all of names have loaded (now, if they have); never if one fails. */
    public static whenLoaded(names: any[], fn: Function): void {
        let all: boolean = true;
        for (const n of as3.values(names)) {
            if (!IoKit.get(as3.str(n))) {
                all = false;
            }
        }
        if (all) {
            fn();
        } else {
            IoKit._waiting.push([names, fn]);
        }
    }

    /** fn() if one of names fails to load (now, if one has). */
    public static whenFailed(names: any[], fn: Function): void {
        for (const n of as3.values(names)) {
            IoKit.get(as3.str(n));
            if (IoKit._art[as3.str(n)] == "failed") {
                fn();
                return;
            }
        }
        IoKit._failWaiting.push([names, fn]);
    }

    private static _failWaiting: any[] = [];

    private static wake(): void {
        let still: any[] = [];
        for (const w of as3.values(IoKit._failWaiting)) {
            let failed: boolean = false;
            let pending: boolean = false;
            for (const n of as3.values(w[0])) {
                let a: any = IoKit._art[as3.str(n)];
                if (a == "failed") {
                    failed = true;
                } else if (!(a instanceof BitmapData)) {
                    pending = true;
                }
            }
            if (failed) {
                try {
                    (w[1] as Function)();
                } catch (e) {
                }
            } else if (pending) {
                still.push(w);
            }
        }
        IoKit._failWaiting = still;
        let keep: any[] = [];
        let run: any[] = [];
        for (const w of as3.values(IoKit._waiting)) {
            let names: any[] = w[0];
            let ready: boolean = true;
            let failed: boolean = false;
            for (const n of as3.values(names)) {
                let a: any = IoKit._art[as3.str(n)];
                if (a == "failed") {
                    failed = true;
                } else if (!(a instanceof BitmapData)) {
                    ready = false;
                }
            }
            if (failed) {
                continue;
            }
            if (ready) {
                run.push(w[1]);
            } else {
                keep.push(w);
            }
        }
        IoKit._waiting = keep;
        for (const f of as3.values(run)) {
            try {
                (f as Function)();
            } catch (e) {
                // (a window closed since: nothing to redraw)
            }
        }
    }

    /**
     * Draws piece `name` in nine parts into g over (x, y, w, h): its corners at their size, its edges and middle
     * stretched. False (nothing drawn) until it has loaded. Narrower than its corners, the corners are shrunk.
     */
    public static slice(g: Graphics, name: string, x: number, y: number, w: number, h: number): boolean {
        let bmd: BitmapData = IoKit.get(name);
        let ins: any[] = IoKit.PIECES[name];
        if (!bmd || !ins || w <= 0 || h <= 0) {
            return false;
        }
        let s: number = 1 / IoKit.SCALE;
        let bw: number = bmd.width;
        let bh: number = bmd.height;
        // the insets drawn (half the file's), shrunk when the piece is smaller than its two ends
        let l: number = ins[0] * s;
        let t: number = ins[1] * s;
        let r: number = ins[2] * s;
        let b: number = ins[3] * s;
        let kx: number = Math.min(1, w / (l + r));
        let ky: number = Math.min(1, h / (t + b));
        let dl: number = l * kx;
        let dr: number = r * kx;
        let dt: number = t * ky;
        let db: number = b * ky;
        let sx: any[] = [0, ins[0], bw - ins[2], bw];
        let sy: any[] = [0, ins[1], bh - ins[3], bh];
        let dx: any[] = [x, x + dl, x + w - dr, x + w];
        let dy: any[] = [y, y + dt, y + h - db, y + h];
        for (let j: int = 0; j < 3; j++) {
            for (let i: int = 0; i < 3; i++) {
                let sw: number = sx[i + 1] - sx[i];
                let sh: number = sy[j + 1] - sy[j];
                let ow: number = dx[i + 1] - dx[i];
                let oh: number = dy[j + 1] - dy[j];
                if (sw <= 0 || sh <= 0 || ow <= 0.01 || oh <= 0.01) {
                    continue;
                }
                let m: Matrix = new Matrix();
                let a: number = ow / sw;
                let d: number = oh / sh;
                m.a = a;
                m.d = d;
                m.tx = dx[i] - a * sx[i];
                m.ty = dy[j] - d * sy[j];
                g.beginBitmapFill(bmd, m, false, true);
                g.drawRect(dx[i], dy[j], ow, oh);
                g.endFill();
            }
        }
        return true;
    }

    /** A rounded box filled with a repeating picture (panel_tile), drawn at the kit's scale. */
    public static tile(g: Graphics, name: string, x: number, y: number, w: number, h: number, corner: number = 0): boolean {
        let bmd: BitmapData = IoKit.get(name);
        if (!bmd || w <= 0 || h <= 0) {
            return false;
        }
        let m: Matrix = new Matrix();
        m.a = m.d = 1 / IoKit.SCALE;
        m.tx = x;
        m.ty = y;
        g.beginBitmapFill(bmd, m, true, true);
        if (corner > 0) {
            g.drawRoundRect(x, y, w, h, corner, corner);
        } else {
            g.drawRect(x, y, w, h);
        }
        g.endFill();
        return true;
    }

    /** An obsidian panel: the repeating middle and the rim over it. */
    public static panel(g: Graphics, x: number, y: number, w: number, h: number): boolean {
        if (!IoKit.get("panel_tile") || !IoKit.get("panel")) {
            return false;
        }
        IoKit.tile(g, "panel_tile", x + 2, y + 2, w - 4, h - 4, 20);
        return IoKit.slice(g, "panel", x, y, w, h);
    }

    /** A whole picture as a Bitmap, w x h (its own size at the kit's scale when 0); null until loaded. */
    public static bitmap(name: string, w: number = 0, h: number = 0): Bitmap {
        let bmd: BitmapData = IoKit.get(name);
        if (!bmd) {
            return null;
        }
        let b: Bitmap = new Bitmap(bmd);
        b.smoothing = true;
        b.width = w > 0 ? w : bmd.width / IoKit.SCALE;
        b.height = h > 0 ? h : bmd.height / IoKit.SCALE;
        return b;
    }

    /** Draws a whole picture into g, centred on (cx, cy), w x h. */
    public static stamp(g: Graphics, name: string, cx: number, cy: number, w: number, h: number): boolean {
        let bmd: BitmapData = IoKit.get(name);
        if (!bmd) {
            return false;
        }
        let m: Matrix = new Matrix();
        m.a = w / bmd.width;
        m.d = h / bmd.height;
        m.tx = cx - w / 2;
        m.ty = cy - h / 2;
        g.beginBitmapFill(bmd, m, false, true);
        g.drawRect(cx - w / 2, cy - h / 2, w, h);
        g.endFill();
        return true;
    }

    /**
     * The round close button (obsidian, a molten X): name, hover picture, the click. Drawn r px round, centred on 0.
     * Until the pictures load, the old dark disc with a gold X.
     */
    public static closeButton(name: string, r: number, onClick: Function): Sprite {
        let x: Sprite = new Sprite();
        x.name = name;
        x.buttonMode = true;
        x.mouseChildren = false;
        let hot: boolean = false;
        let draw: Function = (): void => {
            x.graphics.clear();
            if (!IoKit.stamp(x.graphics, hot ? "close_h" : "close", 0, 0, r * 2 + 4, r * 2 + 4)) {
                x.graphics.lineStyle(2, 14708778, 1);
                x.graphics.beginFill(2755078, 1);
                x.graphics.drawCircle(0, 0, r);
                x.graphics.endFill();
                x.graphics.lineStyle(3, 16766346, 1);
                x.graphics.moveTo(-5, -5);
                x.graphics.lineTo(5, 5);
                x.graphics.moveTo(5, -5);
                x.graphics.lineTo(-5, 5);
            }
        };
        x.addEventListener("rollOver", (e: any): void => {
            hot = true;
            draw();
        });
        x.addEventListener("rollOut", (e: any): void => {
            hot = false;
            draw();
        });
        x.addEventListener("click", onClick);
        draw();
        IoKit.whenLoaded(["close", "close_h"], draw);
        return x;
    }

    /** Puts the forged window rim round a w x h window whose top-left is (x, y); false until it has loaded. */
    public static frame(g: Graphics, x: number, y: number, w: number, h: number, piece: string = "frame"): boolean {
        // (the picture's rim is 14 px of glow outside the band: the band sits on the window's edge)
        let out: number = 14;
        return IoKit.slice(g, piece, x - out, y - out, w + out * 2, h + out * 2);
    }

    /**
     * Adds the forged rim (a Shape named `name`) to parent, round the w x h window whose top-left is (x, y). When the
     * picture has loaded, `glowing` (the window's background, whose own molten line and glow it replaces) loses its
     * glow filter; until then nothing changes.
     */
    public static rim(parent: Sprite, name: string, x: number, y: number, w: number, h: number, glowing: DisplayObject = null, piece: string = "frame"): Shape {
        let rim: Shape = new Shape();
        rim.name = name;
        parent.addChild(rim);
        let draw: Function = (): void => {
            rim.graphics.clear();
            if (IoKit.frame(rim.graphics, x, y, w, h, piece) && glowing) {
                glowing.filters = [];
            }
        };
        draw();
        IoKit.whenLoaded([piece], draw);
        return rim;
    }

    /**
     * The game's own stock button (Button_CLIP, the yard's white and yellow buttons) as the face of a w x h button
     * drawn in code: added under holder's other children, its own label hidden (holder keeps its text). gold: the
     * yellow one. stockState() sets how it looks.
     */
    public static stockFace(holder: Sprite, w: number, h: number, gold: boolean): MovieClip {
        let clip: Button_CLIP = new Button_CLIP();
        clip.name = "ioStockFace";
        clip.Setup("", false, w, h);
        if (clip._txt) {
            clip._txt.visible = false;
        }
        clip["ioGold"] = gold;
        holder.addChildAt(clip, 0);
        // (the holder's own shape gave it its clicks; drawn no more, a see-through box does: a clip the mouse
        // passes over is not counted as the holder's)
        let hit: Shape = new Shape();
        hit.name = "ioStockHit";
        hit.graphics.beginFill(0, 0);
        hit.graphics.drawRect(0, 0, w, h);
        hit.graphics.endFill();
        holder.addChildAt(hit, 0);
        IoKit.stockState(clip, false, true);
        return clip;
    }

    /** Over (pointed at), enabled, or chosen (yellow, as a chosen tab is). */
    public static stockState(clip: MovieClip, over: boolean, enabled: boolean, chosen: boolean = false): void {
        if (!clip) {
            return;
        }
        let gold: boolean = Boolean(clip["ioGold"]) || chosen;
        clip.gotoAndStop(!enabled ? 3 : (gold ? (over ? 5 : 4) : (over ? 2 : 1)));
    }

    /** The first text field among a sprite's children (a button's label, wherever stockFace put its face). */
    public static textOf(o: Sprite): TextField {
        for (let i: int = 0; o && i < o.numChildren; i++) {
            let t: TextField = as3.as(o.getChildAt(i), TextField);
            if (t) {
                return t;
            }
        }
        return null;
    }

    public static removeKids(o: Sprite): void {
        while (o.numChildren > 0) {
            o.removeChildAt(0);
        }
    }

    public static at(o: DisplayObject, x: number, y: number): DisplayObject {
        o.x = x;
        o.y = y;
        return o;
    }
}
