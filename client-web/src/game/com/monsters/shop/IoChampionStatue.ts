import * as as3 from "as3";
import { ASObject, int } from "as3";
import { setTimeout } from "flash/utils";
import { BitmapData } from "flash/display";
import { BFOUNDATION, GLOBAL, INFERNOYARDPROPS, ImageCache, InstanceManager, IoPetsPanel } from "@game";

/**
 * Inferno-only (22 October, the user's pick from the Shiny store proposals): the Champion Statue, building 171, 750
 * Shiny (the Store's Extras: IoShop), a plinth of dark stone with ember runes (its art: client-web/tools/trophy-art/
 * statue.py) and on its bronze turntable the yard owner's champion in bronze, turning: their own sprite sheet's 16
 * facings over the strip's 48 frames (paint), each pixel's light turned to bronze (its shadow left out).
 *
 * Every statue in a yard is its owner's, so the yard's load says which champion (the server's io_statue: the one they
 * picked, else their first unlocked; null: none, a bare plinth), and the strip is asked for by a key carrying it
 * ("anim.png#statue:IC9"): ImageCache loads the plain strip and has it made here (compose), as the Alliance Banner's
 * (IoAllianceBanner). The build menu's card the same way (cardKey).
 */
export class IoChampionStatue extends ASObject {
    public static readonly TYPE: int = 171;

    public static readonly KEY: string = "#statue:";

    /**
     * The strip's frames (statue.py): the sheet's 16 facings, three frames each. (No more: a picture may be no more than 8191 across, and a frame is 150.)
     */
    public static readonly FRAMES: int = 48;

    public static readonly FACINGS: int = 16;

    /**
     * The looks a statue can show (the server's STATUE_CHAMPIONS, STATUE_LEVELS): [what ("IC9-5": a champion and its
     * level; "IC24": one with one look), sheet, frame width, height, the sheet's row]. 23 October: levels 4, 5 and 6 of
     * Korath, Drull and Rimegrave (the user's: "the level should be selectable"); the Basilisk's own row 2 (its rows 0
     * and 1 are it underground, a red lump: the statue showed that).
     */
    private static readonly SHEETS: any[] = [
        ["IC9-4", "monsters/korath_4.png", 153, 123, 0],
        ["IC9-5", "monsters/korath_5.png", 199, 162, 0],
        ["IC9-6", "monsters/korath_6.png", 202, 167, 0],
        ["IC10-4", "monsters/dragon_4.png", 131, 93, 0],
        ["IC10-5", "monsters/dragon_5.png", 156, 117, 0],
        ["IC10-6", "monsters/dragon_6.png", 171, 125, 0],
        ["IC24", "monsters/ashkarr.png", 188, 128, 0],
        ["IC25-4", "monsters/rimegrave_4.png", 134, 148, 0],
        ["IC25-5", "monsters/rimegrave_5.png", 148, 166, 0],
        ["IC25-6", "monsters/rimegrave_6.png", 164, 182, 0],
        ["IC32", "monsters/basilisk.png", 96, 96, 2],
    ];

    /** The levels a champion's statue can show (the server's STATUE_LEVELS); none: one look. */
    public static readonly LEVELS: any = { "IC9": [4, 5, 6], "IC10": [4, 5, 6], "IC25": [4, 5, 6] };

    public static readonly CHAMPIONS: any[] = ["IC9", "IC10", "IC24", "IC25", "IC32"];

    /** Where the figure stands in a frame (the turntable's middle), and how big it may be (statue.py). */
    private static readonly FEET_X: number = 75;

    private static readonly FEET_Y: number = 150;

    private static readonly FIGURE_W: number = 140;

    private static readonly FIGURE_H: number = 132;

    /** On the build menu's card (buildingbuttons/171.jpg, 120 x 160): the feet, and the figure's size. */
    private static readonly CARD_FEET_X: number = 60;

    private static readonly CARD_FEET_Y: number = 95;

    private static readonly CARD_FIGURE: number = 72;

    /** The loaded yard's statues' champion, or null. */
    private static _yard: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Is(type: int): boolean {
        return GLOBAL.INFERNO_ONLY && type == IoChampionStatue.TYPE;
    }

    public static nameOf(id: string): string {
        return IoPetsPanel.monsterName(id);
    }

    private static which(): string {
        return IoChampionStatue.lookOf(IoChampionStatue._yard) || "none";
    }

    /**
     * A look as the sheets know it: "IC9-5"; a champion with levels but none said, its first ("IC9": "IC9-4");
     * anything else null.
     */
    public static lookOf(what: string): string {
        if (!what) {
            return null;
        }
        let id: string = what.split("-")[0];
        if (IoChampionStatue.CHAMPIONS.indexOf(id) < 0) {
            return null;
        }
        let levels: any[] = IoChampionStatue.LEVELS[id];
        if (!levels) {
            return id;
        }
        let lvl: int = (what.indexOf("-") > 0 ? Number(what.split("-")[1]) : 0) | 0;
        return id + "-" + (levels.indexOf(lvl) >= 0 ? lvl : levels[0]);
    }

    /** The champion of a look ("IC9-5": "IC9"). */
    public static championOf(what: string): string {
        return what ? what.split("-")[0] : null;
    }

    /** The level of a look ("IC9-5": 5), or 0 (one look). */
    public static levelOf(what: string): int {
        let look: string = IoChampionStatue.lookOf(what);
        return look && look.indexOf("-") > 0 ? Number(look.split("-")[1]) | 0 : 0;
    }

    /** The champion the loaded yard's statues show, and its level ("IC9-5"; its load's io_statue; IoShop after a change). */
    public static get yard(): string {
        return IoChampionStatue._yard;
    }

    /**
     * From the yard's load (BASE): its owner's champion; the statue's strip is asked for with it from now on (the yard's
     * buildings are made after this).
     */
    public static setYard(id: any): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoChampionStatue._yard = id ? String(id) : null;
        let file: string = "anim.png" + IoChampionStatue.KEY + IoChampionStatue.which();
        for (let table of [INFERNOYARDPROPS._infernoYardProps, (GLOBAL as any)._ioOutpostProps, GLOBAL._buildingProps]) {
            let props: any = table ? table[IoChampionStatue.TYPE - 1] : null;
            if (props && props.id == IoChampionStatue.TYPE && props.imageData && props.imageData[1] && props.imageData[1].anim) {
                props.imageData[1].anim[0] = file;
            }
        }
    }

    /** What tells a statue's pictures apart in ImageCache's groups (BFOUNDATION): whose champion; "" for anything else. */
    public static groupTag(type: int): string {
        return IoChampionStatue.Is(type) ? IoChampionStatue.KEY + IoChampionStatue.which() : "";
    }

    /** The build menu's card: the plinth with the player's champion on it. */
    public static cardKey(type: int, key: string): string {
        return IoChampionStatue.Is(type) ? key + IoChampionStatue.KEY + IoChampionStatue.which() : key;
    }

    /** { base, which } of a statue's key, or null. */
    public static parseKey(key: string): any {
        let i: int = key ? key.indexOf(IoChampionStatue.KEY) : -1;
        if (i < 0) {
            return null;
        }
        return { "base": key.substr(0, i), "which": key.substr(i + IoChampionStatue.KEY.length) };
    }

    /** The yard's statues drawn again (their champion changed: IoShop.chooseStatue). */
    public static redraw(): void {
        for (let b of as3.values(InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let f: BFOUNDATION = b as BFOUNDATION;
            if (f && f._type == IoChampionStatue.TYPE) {
                let state: string = f._renderState;
                f._renderState = null;
                f.Render(state ? state : "");
            }
        }
    }

    /**
     * The strip (or the card) with the champion painted on in bronze: `which` from the key; to done(bmd) (the plain
     * plinth when there is none, or its sheet can't be had).
     */
    public static compose(src: BitmapData, base: string, which: string, done0: Function): void {
        // (always later, and a picture of its own: ImageCache is in the middle of starting this load)
        let done = (bmd: BitmapData): void => {
            setTimeout((): void => {
                done0(bmd);
            }, 0);
        };
        let sheet: any[] = null;
        let look: string = IoChampionStatue.lookOf(which);
        for (let s of IoChampionStatue.SHEETS) {
            if (s[0] == look) {
                sheet = s;
            }
        }
        if (!src || src.width <= 0 || !sheet) {
            done(src ? src.clone() : src);
            return;
        }
        ImageCache.GetImageWithCallBack(String(sheet[1]), (k: string, img: BitmapData): void => {
            if (!img || img.width <= 0) {
                done(src.clone());
                return;
            }
            try {
                done(IoChampionStatue.paint(src, base.indexOf("buildingbuttons/") >= 0, img, sheet[2] | 0, sheet[3] | 0, sheet[4] | 0));
            } catch (e) {
                done(src.clone());
            }
        });
    }

    /**
     * One facing of a sheet as bronze pixels: { w, h, d (RGBA), box [x0, y0, x1, y1] of what is there } or null.
     * (23 October: cast, not printed: its light smoothed a little (a 3 x 3 mean, half of it), so a patterned hide
     * (Korath's lava cracks) reads as shape, not speckle; and its darkest lifted, so dark legs and a dark outline
     * still read as bronze on the dark plinth.)
     */
    private static facing(sheet: ImageData, fw: int, fh: int, col: int, row: int = 0): any {
        let d: Uint8ClampedArray = new Uint8ClampedArray(fw * fh * 4);
        let lum: Float32Array = new Float32Array(fw * fh);
        let keep: Uint8Array = new Uint8Array(fw * fh);
        let x0: int = fw, y0: int = fh, x1: int = -1, y1: int = -1;
        let sx: int = col * fw;
        let sy: int = row * fh;
        if (sy + fh > sheet.height) {
            sy = 0;
        }
        for (let y: int = 0; y < fh; y++) {
            for (let x: int = 0; x < fw; x++) {
                let p: int = ((sy + y) * sheet.width + sx + x) * 4;
                let a: int = sheet.data[p + 3];
                if (a == 0) {
                    continue;
                }
                let r: number = sheet.data[p] / 255, g: number = sheet.data[p + 1] / 255, b: number = sheet.data[p + 2] / 255;
                let mx: number = Math.max(r, g, b), mn: number = Math.min(r, g, b);
                let s: number = mx > 0.000001 ? (mx - mn) / mx : 0;
                // (its shadow: dark, see-through, colourless: left out, as IoSkins tells it)
                if (a < 217 && mx < 0.35 && s < 0.5) {
                    continue;
                }
                let i: int = (y * fw + x) | 0;
                keep[i] = 1;
                lum[i] = 0.3 * r + 0.59 * g + 0.11 * b;
                d[i * 4 + 3] = a;
                if (x < x0) {
                    x0 = x;
                }
                if (y < y0) {
                    y0 = y;
                }
                if (x > x1) {
                    x1 = x;
                }
                if (y > y1) {
                    y1 = y;
                }
            }
        }
        if (x1 < 0) {
            return null;
        }
        for (let y: int = y0; y <= y1; y++) {
            for (let x: int = x0; x <= x1; x++) {
                let i: int = (y * fw + x) | 0;
                if (!keep[i]) {
                    continue;
                }
                let sum: number = 0, n: int = 0;
                for (let yy: int = Math.max(0, y - 1) | 0; yy <= Math.min(fh - 1, y + 1); yy++) {
                    for (let xx: int = Math.max(0, x - 1) | 0; xx <= Math.min(fw - 1, x + 1); xx++) {
                        let j: int = (yy * fw + xx) | 0;
                        if (keep[j]) {
                            sum += lum[j];
                            n++;
                        }
                    }
                }
                let l0: number = 0.5 * lum[i] + 0.5 * sum / n;
                // its light as bronze: dark brown, through bronze, to a pale gold where it shines (the darkest lifted)
                let l: number = 0.14 + 0.86 * Math.pow(l0, 0.8);
                let q: int = i * 4;
                if (l < 0.5) {
                    let t: number = l / 0.5;
                    d[q] = 38 + (152 - 38) * t;
                    d[q + 1] = 22 + (94 - 22) * t;
                    d[q + 2] = 10 + (44 - 10) * t;
                } else {
                    let t: number = (l - 0.5) / 0.5;
                    d[q] = 152 + (246 - 152) * t;
                    d[q + 1] = 94 + (206 - 94) * t;
                    d[q + 2] = 44 + (132 - 44) * t;
                }
            }
        }
        return { "w": fw, "h": fh, "d": d, "box": [x0, y0, x1 + 1, y1 + 1] };
    }

    /**
     * One facing scaled down by k into a buffer of premultiplied RGBA (floats, 0-1), the region of its frame from
     * (x0, y0), sw x sh across in the buffer.
     */
    private static scaled(fig: any, k: number, ux0: number, uy0: number, sw: int, sh: int): Float32Array {
        let out: Float32Array = new Float32Array(sw * sh * 4);
        for (let ty: int = 0; ty < sh; ty++) {
            let sy0: number = uy0 + ty / k, sy1: number = uy0 + (ty + 1) / k;
            let ya: int = Math.max(0, Math.floor(sy0)) | 0, yb: int = Math.min(fig.h, Math.max(Math.floor(sy0) + 1, Math.ceil(sy1))) | 0;
            for (let tx: int = 0; tx < sw; tx++) {
                let sx0: number = ux0 + tx / k, sx1: number = ux0 + (tx + 1) / k;
                let xa: int = Math.max(0, Math.floor(sx0)) | 0, xb: int = Math.min(fig.w, Math.max(Math.floor(sx0) + 1, Math.ceil(sx1))) | 0;
                let r: number = 0, g: number = 0, b: number = 0, a: number = 0, n: int = 0;
                for (let sy: int = ya; sy < yb; sy++) {
                    for (let sx: int = xa; sx < xb; sx++) {
                        let q: int = (sy * fig.w + sx) * 4;
                        let qa: number = fig.d[q + 3];
                        r += fig.d[q] * qa;
                        g += fig.d[q + 1] * qa;
                        b += fig.d[q + 2] * qa;
                        a += qa;
                        n++;
                    }
                }
                if (n == 0 || a <= 0) {
                    continue;
                }
                let o: int = (ty * sw + tx) * 4;
                out[o] = r / n / 65025;
                out[o + 1] = g / n / 65025;
                out[o + 2] = b / n / 65025;
                out[o + 3] = a / n / 255;
            }
        }
        return out;
    }

    /**
     * Where a facing stands (in its frame): the middle of its legs (the median column of the lowest 30% of it), at its
     * lowest row with a real width of it (a blade's tip or a claw hanging lower left out). A held weapon, a wing or a tail out to one side doesn't move it, as the middle of
     * its outline did.
     */
    private static feetOf(fig: any): number[] {
        let x0: int = fig.box[0], y0: int = fig.box[1], x1: int = fig.box[2], y1: int = fig.box[3];
        // (its lowest row with a real width of it: a blade's tip or a claw hanging lower isn't where it stands)
        let cov: int[] = [];
        let most: int = 0;
        for (let y: int = y0; y < y1; y++) {
            let n: int = 0;
            for (let x: int = x0; x < x1; x++) {
                if (fig.d[(y * fig.w + x) * 4 + 3] > 128) {
                    n++;
                }
            }
            cov.push(n);
            most = Math.max(most, n) | 0;
        }
        let bottom: int = y1;
        for (let y: int = (y1 - 1) | 0; y >= y0; y--) {
            if (cov[y - y0] >= Math.max(2, most * 0.15)) {
                bottom = (y + 1) | 0;
                break;
            }
        }
        // (the middle of the legs: the median column of what is there in the lowest 30%, so a blade or a tail reaching
        // into it to one side doesn't pull it over)
        let band: int = Math.max(3, Math.round((bottom - y0) * 0.3)) | 0;
        let cols: int[] = [];
        let n: int = 0;
        for (let x: int = x0; x < x1; x++) {
            let c: int = 0;
            for (let y: int = Math.max(y0, bottom - band) | 0; y < bottom; y++) {
                if (fig.d[(y * fig.w + x) * 4 + 3] > 128) {
                    c++;
                }
            }
            cols.push(c);
            n += c;
        }
        if (n == 0) {
            return [(x0 + x1) / 2, bottom];
        }
        let half: number = n / 2, run: number = 0;
        for (let i: int = 0; i < cols.length; i++) {
            run += cols[i];
            if (run >= half) {
                return [x0 + i + 0.5, bottom];
            }
        }
        return [(x0 + x1) / 2, bottom];
    }

    /** A facing's middle across (its pixels' mean column) and its lowest row with a real width of it (feetOf). */
    private static centreOf(fig: any): number[] {
        let x0: int = fig.box[0], y0: int = fig.box[1], x1: int = fig.box[2], y1: int = fig.box[3];
        let sum: number = 0, n: int = 0;
        for (let y: int = y0; y < y1; y++) {
            for (let x: int = x0; x < x1; x++) {
                if (fig.d[(y * fig.w + x) * 4 + 3] > 128) {
                    sum += x + 0.5;
                    n++;
                }
            }
        }
        return [n > 0 ? sum / n : (x0 + x1) / 2, IoChampionStatue.feetOf(fig)[1]];
    }

    /**
     * The figure on the strip's frames (or the card), standing on the turntable: the 16 facings, each for three
     * frames (48 a turn, played a frame every 6 ticks: BDECORATION), a steady step every 0.45 seconds. (22 October
     * the two frames after each were blends into the next: half see-through ghosts of two facings, 23 October.)
     *
     * Pinned (23 October, again: "not displaying correctly"): a sheet's 16 facings are one model turned about the same
     * point, drawn from the same camera, so every facing goes in the same place in the frame, the sheet's own: the
     * game draws them so. That point is the mean of the facings' middles across (a whole turn: what one side gains the
     * other loses) and their usual lowest row. (22 October each facing was placed by where its own legs seemed to be:
     * a four-legged one (Korath, Rimegrave) slid up to 10 px from facing to facing, as its front or its hind legs came
     * lowest.)
     */
    private static paint(src: BitmapData, card: boolean, img: BitmapData, fw: int, fh: int, row: int = 0): BitmapData {
        let sheet: ImageData = img.data();
        let cols: int = Math.max(1, Math.floor(img.width / fw)) | 0;
        let facings: int = card ? 1 : IoChampionStatue.FACINGS;
        let figs: any[] = [];
        for (let f: int = 0; f < facings; f++) {
            // (the card: a facing towards the viewer, a quarter round)
            let col: int = (card ? (cols * 3 / 8) | 0 : Math.round(f * cols / facings) % cols) | 0;
            figs.push(IoChampionStatue.facing(sheet, fw, fh, col, row));
        }
        let out: BitmapData = src.clone();
        // (the sheet's point: the mean middle across, the median lowest row)
        let ax: number = 0, n: int = 0;
        let bottoms: any[] = [];
        for (let fig of figs) {
            if (fig) {
                let c: number[] = IoChampionStatue.centreOf(fig);
                ax += c[0];
                n++;
                bottoms.push(c[1]);
            }
        }
        if (n == 0) {
            return out;
        }
        ax /= n;
        bottoms.sort((p: number, q: number): number => p - q);
        let ay: number = Number(bottoms[(bottoms.length / 2) | 0]);
        // (how far the figure reaches from that point: left, right, up)
        let reachL: number = 1, reachR: number = 1, reachUp: number = 1, most: number = 1;
        for (let fig of figs) {
            if (fig) {
                reachL = Math.max(reachL, ax - fig.box[0]);
                reachR = Math.max(reachR, fig.box[2] - ax);
                reachUp = Math.max(reachUp, ay - fig.box[1]);
                most = Math.max(most, fig.box[2] - fig.box[0], fig.box[3] - fig.box[1]);
            }
        }
        let half: number = IoChampionStatue.FIGURE_W / 2;
        // (a small champion (the Basilisk's sheet is 96 across) made up to half as big again, so it isn't lost on the plinth)
        let k: number = card ? IoChampionStatue.CARD_FIGURE / most : Math.min(fw <= 100 ? 1.5 : 1, half / reachL, half / reachR, IoChampionStatue.FIGURE_H / reachUp);
        let feetX: number = card ? IoChampionStatue.CARD_FEET_X : IoChampionStatue.FEET_X;
        let feetY: number = (card ? IoChampionStatue.CARD_FEET_Y : IoChampionStatue.FEET_Y) + 3;
        // (each facing scaled, all at the same whole-pixel place: the sheet's point on the turntable's middle)
        let ox: number = feetX - ax * k, oy: number = feetY - ay * k;
        let layers: any[] = figs.map((fig: any): any => {
            if (!fig) {
                return null;
            }
            // (on one grid of whole pixels for every facing: its place's pixel, and the frame's point under it)
            let x: int = Math.floor(ox + fig.box[0] * k) | 0, y: int = Math.floor(oy + fig.box[1] * k) | 0;
            let sw: int = (Math.ceil(ox + fig.box[2] * k) - x) | 0, sh: int = (Math.ceil(oy + fig.box[3] * k) - y) | 0;
            return { "buf": IoChampionStatue.scaled(fig, k, (x - ox) / k, (y - oy) / k, sw, sh), "w": sw, "h": sh, "x": x, "y": y };
        });
        let img2: ImageData = out.data();
        let o: Uint8ClampedArray = img2.data;
        const W: int = img2.width;
        const H: int = img2.height;
        let frames: int = card ? 1 : IoChampionStatue.FRAMES;
        let frameW: int = card ? W : Math.floor(W / IoChampionStatue.FRAMES) | 0;
        let per: int = card ? 1 : (IoChampionStatue.FRAMES / IoChampionStatue.FACINGS) | 0;
        for (let j: int = 0; j < frames; j++) {
            let fi: int = (j / per) | 0;
            // (23 October: each facing held for its three frames. They were blended a third and two thirds into
            // the next: two facings half see-through over each other, a ghost in two frames of three)
            let t: number = 0;
            let A: any = layers[fi % layers.length], B: any = t > 0 ? layers[(fi + 1) % layers.length] : null;
            let parts: any[] = [];
            if (A) {
                parts.push([A, 1 - t]);
            }
            if (B) {
                parts.push([B, t]);
            }
            if (!parts.length) {
                continue;
            }
            let fx0: int = (j * frameW) | 0;
            let rx0: int = 1 << 30, ry0: int = 1 << 30, rx1: int = -(1 << 30), ry1: int = -(1 << 30);
            for (let pt of parts) {
                rx0 = Math.min(rx0, pt[0].x) | 0;
                ry0 = Math.min(ry0, pt[0].y) | 0;
                rx1 = Math.max(rx1, pt[0].x + pt[0].w) | 0;
                ry1 = Math.max(ry1, pt[0].y + pt[0].h) | 0;
            }
            for (let y: int = Math.max(0, ry0) | 0; y < Math.min(H, ry1); y++) {
                for (let x: int = Math.max(0, rx0) | 0; x < Math.min(frameW, rx1); x++) {
                    let pr: number = 0, pg: number = 0, pb: number = 0, pa: number = 0;
                    for (let pt of parts) {
                        let L: any = pt[0], wgt: number = pt[1];
                        let lx: int = (x - L.x) | 0, ly: int = (y - L.y) | 0;
                        if (lx < 0 || ly < 0 || lx >= L.w || ly >= L.h) {
                            continue;
                        }
                        let q: int = (ly * L.w + lx) * 4;
                        pr += L.buf[q] * wgt;
                        pg += L.buf[q + 1] * wgt;
                        pb += L.buf[q + 2] * wgt;
                        pa += L.buf[q + 3] * wgt;
                    }
                    if (pa <= 0.001) {
                        continue;
                    }
                    // (premultiplied over what is there)
                    let p: int = (y * W + fx0 + x) * 4;
                    let da: number = o[p + 3] / 255;
                    let na: number = pa + da * (1 - pa);
                    o[p] = (pr * 255 + o[p] * da * (1 - pa)) / Math.max(0.0001, na);
                    o[p + 1] = (pg * 255 + o[p + 1] * da * (1 - pa)) / Math.max(0.0001, na);
                    o[p + 2] = (pb * 255 + o[p + 2] * da * (1 - pa)) / Math.max(0.0001, na);
                    o[p + 3] = na * 255;
                }
            }
        }
        out.$putData(img2);
        return out;
    }
}
