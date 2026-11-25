import * as as3 from "as3";
import { ASObject, int } from "as3";
import { setTimeout } from "flash/utils";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { Matrix } from "flash/geom";
import { GLOBAL, INFERNOYARDPROPS, ImageCache, IoCrest } from "@game";

/**
 * Inferno-only (16 October, the user's: "a flag that displays the user's alliance flag/banner, 200 Shiny, listed before
 * all the other flags"): the Alliance Banner, building 170, a crimson banner on a black-iron pole (its art:
 * client-web/tools/trophy-art/banner.py) with the yard owner's alliance shield painted on it: their own crest when the
 * alliance has one (IoCrest), else its preset shield (alliances/N_large.png); plain when the owner is in no alliance.
 *
 * Every banner in a yard is its owner's, so the yard's load says whose shield it is (the server's io_ally_banner:
 * { image, crest }, setYard) and the banner's picture is asked for by a key carrying it ("anim.png#ally:c0.1.2.0.1.4.2",
 * "#ally:i7", "#ally:none"): ImageCache loads the plain picture and has it made here (compose). The shield goes into
 * each frame's box (SHIELD, banner.py's: the cloth faces the camera, so its middle is an upright box), shaded by the
 * cloth's own ripples there. The build menu's card is the player's own (their yard's) the same way (cardKey).
 */
export class IoAllianceBanner extends ASObject {
    public static readonly TYPE: int = 170;

    public static readonly KEY: string = "#ally:";

    /** The strip's frames (banner.py). */
    public static readonly FRAMES: int = 24;

    /** The shield's box in each frame of the strip: [x, y, w, h] (banner.py). */
    private static readonly SHIELD: any[] = [[28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 28, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 30, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 29, 31, 34], [28, 28, 31, 34]];

    /** The shield's box on the build menu's card (buildingbuttons/170.jpg, 120 x 160). */
    private static readonly CARD: any[] = [48, 39, 34, 37];

    /** The loaded yard's owner's alliance shield: { image, crest }, or null (none, or not said). */
    private static _yard: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Is(type: int): boolean {
        return GLOBAL.INFERNO_ONLY && type == IoAllianceBanner.TYPE;
    }

    /** What the key says of the shield: "c<crest>", "i<image>" or "none". */
    private static which(data: any): string {
        if (data && IoCrest.has(data.crest)) {
            return "c" + String(data.crest);
        }
        if (data && (data.image | 0) > 0) {
            return "i" + (data.image | 0);
        }
        return "none";
    }

    /**
     * From the yard's load (BASE): its owner's shield; the banner's picture is asked for with it from now on (the
     * yard's buildings are made after this).
     */
    public static setYard(data: any): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoAllianceBanner._yard = data && typeof data == "object" ? data : null;
        let file: string = "anim.png" + IoAllianceBanner.KEY + IoAllianceBanner.which(IoAllianceBanner._yard);
        // (the Inferno's table, the outposts' copy of it, and the one in use)
        for (let table of [INFERNOYARDPROPS._infernoYardProps, (GLOBAL as any)._ioOutpostProps, GLOBAL._buildingProps]) {
            let props: any = table ? table[IoAllianceBanner.TYPE - 1] : null;
            if (props && props.id == IoAllianceBanner.TYPE && props.imageData && props.imageData[1] && props.imageData[1].anim) {
                props.imageData[1].anim[0] = file;
            }
        }
    }

    /** What tells a banner's pictures apart in ImageCache's groups (BFOUNDATION): whose shield; "" for anything else. */
    public static groupTag(type: int): string {
        return IoAllianceBanner.Is(type) ? IoAllianceBanner.KEY + IoAllianceBanner.which(IoAllianceBanner._yard) : "";
    }

    /** The build menu's card (or the building's info): the banner's own with the yard owner's shield (the player's). */
    public static cardKey(type: int, key: string): string {
        if (!IoAllianceBanner.Is(type)) {
            return key;
        }
        return key + IoAllianceBanner.KEY + IoAllianceBanner.which(IoAllianceBanner._yard);
    }

    /** { base, which } of a banner's key, or null. */
    public static parseKey(key: string): any {
        let i: int = key ? key.indexOf(IoAllianceBanner.KEY) : -1;
        if (i < 0) {
            return null;
        }
        return { "base": key.substr(0, i), "which": key.substr(i + IoAllianceBanner.KEY.length) };
    }

    /** The shield's picture (`size` across, or its own size for a preset one), to done(bmd); done(null) for none. */
    private static shield(which: string, size: int, done: Function): void {
        if (which.charAt(0) == "c" && IoCrest.has(which.substr(1))) {
            IoCrest.bitmap(which.substr(1), size, (bmd: BitmapData): void => {
                done(bmd);
            });
            return;
        }
        let id: int = which.charAt(0) == "i" ? parseInt(which.substr(1), 10) | 0 : 0;
        if (id <= 0) {
            done(null);
            return;
        }
        ImageCache.GetImageWithCallBack("alliances/" + id + (id <= 20 ? "_large" : "_medium") + ".png", (k: string, bmd: BitmapData): void => {
            done(bmd && bmd.width > 0 ? bmd : null);
        });
    }

    /**
     * The banner's picture (the strip, or the card) with the shield painted on: `which` from the key; to done(bmd)
     * (the plain picture when there is no shield to paint).
     */
    public static compose(src: BitmapData, base: string, which: string, done0: Function): void {
        // (always later, and a picture of its own: ImageCache is in the middle of starting this load, and the plain
        // picture is another key's)
        let done = (bmd: BitmapData): void => {
            setTimeout((): void => {
                done0(bmd);
            }, 0);
        };
        if (!src || src.width <= 0) {
            done(src);
            return;
        }
        let card: boolean = base.indexOf("buildingbuttons/") >= 0;
        let boxes: any[] = [];
        let fw: int = card ? src.width : Math.floor(src.width / IoAllianceBanner.FRAMES) | 0;
        if (card) {
            boxes.push([0, IoAllianceBanner.CARD]);
        } else {
            for (let f: int = 0; f < IoAllianceBanner.FRAMES; f++) {
                boxes.push([f * fw, IoAllianceBanner.SHIELD[f]]);
            }
        }
        let big: int = 0;
        for (let b of boxes) {
            big = Math.max(big, b[1][2] | 0, b[1][3] | 0) | 0;
        }
        IoAllianceBanner.shield(which, Math.max(32, big * 2) | 0, (sh: BitmapData): void => {
            if (!sh) {
                done(src.clone());
                return;
            }
            let out: BitmapData = src.clone();
            let img: ImageData = out.data();
            let d: Uint8ClampedArray = img.data;
            const W: int = img.width;
            // the shield fitted into the box (the box's size is the same in every frame), drawn smooth once
            let bw: int = boxes[0][1][2] | 0, bh: int = boxes[0][1][3] | 0;
            let k: number = Math.min(bw / sh.width, bh / sh.height);
            let sw: int = Math.max(1, Math.round(sh.width * k)) | 0, shh: int = Math.max(1, Math.round(sh.height * k)) | 0;
            let fit: BitmapData = new BitmapData(sw, shh, true, 0);
            let m: Matrix = new Matrix();
            m.scale(sw / sh.width, shh / sh.height);
            fit.draw(as3.cast(sh, IBitmapDrawable), m, null, null, null, true);
            let e: Uint8ClampedArray = fit.data().data;
            // the cloth's light where the shield goes, in the first frame: the ripples shade the shield from it
            let ref: number = 0, n: int = 0;
            let b0: any[] = boxes[0];
            for (let y: int = 0; y < bh; y++) {
                for (let x: int = 0; x < bw; x++) {
                    let p: int = ((b0[1][1] + y) * W + b0[0] + b0[1][0] + x) * 4;
                    if (p >= 0 && p + 3 < d.length && d[p + 3] > 200) {
                        ref += 0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2];
                        n++;
                    }
                }
            }
            ref = n > 0 ? ref / n : 1;
            for (let b of boxes) {
                let ox: int = (b[0] + b[1][0] + Math.round((bw - sw) / 2)) | 0;
                let oy: int = (b[1][1] + Math.round((bh - shh) / 2)) | 0;
                for (let y: int = 0; y < shh; y++) {
                    let ty: int = oy + y;
                    if (ty < 0 || ty >= img.height) {
                        continue;
                    }
                    for (let x: int = 0; x < sw; x++) {
                        let tx: int = ox + x;
                        let q: int = (y * sw + x) * 4;
                        let ea: number = e[q + 3] / 255;
                        let p: int = (ty * W + tx) * 4;
                        if (ea <= 0 || d[p + 3] < 120) {
                            continue;
                        }
                        let lum: number = 0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2];
                        let shade: number = Math.max(0.6, Math.min(1.35, lum / Math.max(1, ref)));
                        d[p] = d[p] + (Math.min(255, e[q] * shade) - d[p]) * ea;
                        d[p + 1] = d[p + 1] + (Math.min(255, e[q + 1] * shade) - d[p + 1]) * ea;
                        d[p + 2] = d[p + 2] + (Math.min(255, e[q + 2] * shade) - d[p + 2]) * ea;
                    }
                }
            }
            out.$putData(img);
            fit.dispose();
            done(out);
        });
    }
}
