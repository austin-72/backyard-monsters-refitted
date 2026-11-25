import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { Matrix, Point, Rectangle } from "flash/geom";
import { ImageCache } from "@game";

/**
 * Inferno-only: the Devil's Arcade's pictures. The monsters are cut from their own yard sprite sheets
 * (assets/monsters: 30 facings across, 12 degrees apart, the animation's frames down; column c faces
 * 12c degrees on screen, clockwise from facing right: 0 right, 7.5 down, 15 left, 22.5 up) and from their
 * portraits (popups/IC*-150.png);
 * the arcade's own art is in assets/arcade (art/devilsarcade).
 */
export class ArcadeArt extends ASObject {
    /** The sheets used: id -> [key, frame width, frame height, rows, facings across (30 if not given)]. */
    public static readonly SHEETS: any = { "spurtz": ["monsters/spurtz.png", 24, 28, 3], "fusebug": ["monsters/fusebug.png", 52, 38, 9], "balthazar": ["monsters/balthazar.png", 56, 37, 7], "wormzer": ["monsters/wormzer.png", 58, 42, 1], "zagnoid": ["monsters/zagnoid.png", 64.4, 46, 1], "valgos": ["monsters/valgos.png", 55, 32, 1], "sabnox": ["monsters/sabnox.png", 42, 34, 1], "malphus": ["monsters/malphus.png", 51, 35, 9], "grokus": ["monsters/grokus.v2.png", 57.2667, 39, 1], "rezghul": ["monsters/rezghul.png", 48, 43, 6, 32], "clinkerjaw": ["monsters/clinkerjaw.png", 58, 44, 9], "flickerfiend": ["monsters/flickerfiend.png", 44, 51, 13] };

    private static _sheets: any = {};

    private static _frames: any = {};

    private static _pictures: any = {};

    /** Starts loading sheets and pictures (keys of SHEETS, or asset paths). */
    public static preload(ids: any[]): void {
        for (const $value of as3.values(ids)) {
            let id: string = as3.str($value);
            if (ArcadeArt.SHEETS[id]) {
                ArcadeArt.sheet(id);
            } else {
                ArcadeArt.picture(id);
            }
        }
    }

    private static sheet(id: string): BitmapData {
        if (ArcadeArt._sheets[id] instanceof BitmapData) {
            return as3.cast(ArcadeArt._sheets[id], BitmapData);
        }
        if (ArcadeArt._sheets[id] == null) {
            ArcadeArt._sheets[id] = "loading";
            let key: string = String(ArcadeArt.SHEETS[id][0]);
            ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[] = null): void => {
                if (bmd) {
                    ArcadeArt._sheets[id] = bmd;
                }
            });
        }
        return null;
    }

    /**
     * The column facing `degrees` on screen (0 right, 90 down). (7 October: it was mirrored, 180 - degrees,
     * so Wormzer and Balthazar faced backwards and Fusebug Blast's monsters left for right.)
     */
    public static column(degrees: number, facings: int = 30): int {
        let c: int = Math.round(degrees / (360 / facings)) | 0;
        c = (((c % facings) + facings) % facings) | 0;
        return c;
    }

    /** One frame of a monster's sheet, facing `degrees`, animation row `row` (null until it has loaded). */
    public static frame(id: string, degrees: number, row: int = 0): BitmapData {
        let s: any[] = as3.as(ArcadeArt.SHEETS[id], Array);
        if (!s) {
            return null;
        }
        let col: int = ArcadeArt.column(degrees, s.length > 4 ? s[4] | 0 : 30);
        row = (row % (s[3] | 0)) | 0;
        let key: string = id + ":" + col + ":" + row;
        let f: BitmapData = as3.as(ArcadeArt._frames[key], BitmapData);
        if (f) {
            return f;
        }
        let sh: BitmapData = ArcadeArt.sheet(id);
        if (!sh) {
            return null;
        }
        let w: number = Number(s[1]);
        let h: int = s[2] | 0;
        f = new BitmapData(Math.ceil(w), h, true, 0);
        f.copyPixels(sh, new Rectangle(Math.round(col * w), row * h, Math.ceil(w), h), new Point(0, 0));
        ArcadeArt._frames[key] = f;
        return f;
    }

    /** fn(picture) once picture key has loaded (at once if it has); never if it fails. */
    public static whenPicture(key: string, fn: Function): void {
        let now: BitmapData = ArcadeArt.picture(key);
        if (now) {
            fn(now);
            return;
        }
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (bmd) {
                ArcadeArt._pictures[key] = bmd;
                fn(bmd);
            }
        });
    }

    /** Fills a w x h box at (x, y) of g with picture bmd, scaled to it. */
    public static stamp(g: any, bmd: BitmapData, x: number, y: number, w: number, h: number): void {
        let m: Matrix = new Matrix();
        m.a = w / bmd.width;
        m.d = h / bmd.height;
        m.tx = x;
        m.ty = y;
        g.beginBitmapFill(bmd, m, false, true);
        g.drawRect(x, y, w, h);
        g.endFill();
    }

    /** A whole picture (a portrait, the arcade's art): null until it has loaded. */
    public static picture(key: string): BitmapData {
        // (13 October) no picture for it (the Runner's things without art): drawn as shapes, nothing asked for (it
        // asked the server for "assets/", a 404 in its log at every game)
        if (!key) {
            return null;
        }
        if (ArcadeArt._pictures[key] instanceof BitmapData) {
            return as3.cast(ArcadeArt._pictures[key], BitmapData);
        }
        if (ArcadeArt._pictures[key] == null) {
            ArcadeArt._pictures[key] = "loading";
            ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[] = null): void => {
                if (bmd) {
                    ArcadeArt._pictures[key] = bmd;
                }
            });
        }
        return null;
    }
}
