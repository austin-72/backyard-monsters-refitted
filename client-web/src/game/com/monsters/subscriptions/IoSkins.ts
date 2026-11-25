import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { setTimeout } from "flash/utils";
import { KEYS, SPRITES, SpriteData } from "@game";

/**
 * Inferno-only (14 October, the user's): the champions' skins sold in the D.A.V.E. Club for Shiny (the server:
 * services/yard/dave.ts; chosen and owned as the frozen look is: IoDave). Five for each of Korath, Drull, Ashkarr,
 * Rimegrave and the Basilisk: Molten, Void, Gilded, Bone and Venom.
 *
 * A skin is the champion's own sheet recoloured in the game, not another picture to download: a sprite's key with
 * "#skin:<name>" after it ("monsters/korath_4.png#skin:molten") is loaded by ImageCache as the sheet, then made here.
 * 26 October (the user's: "make sure that each old color is a new color and the skins have the same amount of variance in
 * colors"): the sheet's colours are no longer sorted into four parts each given one colour (a sheet of four thousand
 * colours came out in two to three hundred, some left as they were, Bone nearly grey). Every colour is moved the same
 * way, in Oklab (a space where equal steps look equal): its hue turned so the sheet's own main colour becomes the
 * skin's (at least MIN_TURN round), every colour shifted towards the skin's tint (the greys too) and lighter or darker;
 * then stretched, each sheet worked out on its own, so its light and dark and its colours vary as much as the
 * sheet's own did (SKIN_LOOKS, ioSolve). Colours a screen can't show that strong are eased in, not cut. Bone keeps
 * its bleached look (its colour stretched less, its light and dark more) with its glow (fire, eyes) ghost green. The
 * shadow stays. Then each skin's touch: Molten's glowing cracks, Void's stars and violet haze, Gilded's glints,
 * Venom's acid haze.
 */
export class IoSkins extends ASObject {
    /** [id, name, a line about it] */
    public static readonly LIST: any[] = [
        ["molten", "Molten", "Black rock split by glowing lava."],
        ["void", "Void", "Night purple, specked with stars."],
        ["gilded", "Gilded", "Gold from horn to tail."],
        ["bone", "Bone", "Bleached bone, lit ghost green."],
        ["venom", "Venom", "Toxic green, dripping with it."],
        // (26 October, the user's: four more, three for 200 Shiny and Solid Gold for 600: the server's SKIN_PRICES)
        ["crimson", "Crimson", "Blood red, smouldering at the edges."],
        ["abyss", "Abyss", "Deep sea teal, lit from within."],
        ["storm", "Storm", "Steel blue, crackling with sparks."],
        ["solidgold", "Solid Gold", "Polished gold all over: a statue come alive."],
    ];

    /** [creature id, name, its picture's sprite for the window, picture width, height] */
    public static readonly CHAMPIONS: any[] = [
        ["IC9", "Korath", "monsters/korath_4.png", 153, 123],
        ["IC10", "Drull", "monsters/dragon_4.png", 131, 93],
        ["IC24", "Ashkarr", "monsters/ashkarr.png", 188, 128],
        ["IC25", "Rimegrave", "monsters/rimegrave_4.png", 134, 148],
        ["IC32", "Basilisk", "monsters/basilisk.png", 96, 96],
    ];

    public static readonly KEY: string = "#skin:";

    /**
     * Each skin's touches: fleck (how many of a 1000 specks), its colour, the haze round the body (its colour, or -1),
     * and cracks (Molten). Its colours: SKIN_LOOKS.
     */
    private static readonly THEMES: any = {
        "molten": { fleck: 0, ring: 0xFF6A1A, cracks: true },
        "void": { fleck: 6, fleckColour: 0xF4ECFF, ring: 0x9A4CFF },
        "gilded": { fleck: 5, fleckColour: 0xFFFDE8, ring: -1 },
        "bone": { fleck: 0, ring: -1 },
        "venom": { fleck: 0, ring: 0x7CFF3A },
        "crimson": { fleck: 0, ring: 0xC0122E },
        "abyss": { fleck: 5, fleckColour: 0x8CFFF0, ring: 0x1FB5A8 },
        "storm": { fleck: 5, fleckColour: 0xE8F4FF, ring: 0x7FB8FF },
        "solidgold": { fleck: 7, fleckColour: 0xFFFFF2, ring: 0xFFD24A },
    };

    public static has(skin: string): boolean {
        return skin != null && IoSkins.THEMES[skin] != null;
    }

    public static nameOf(skin: string): string {
        for (let s of IoSkins.LIST) {
            if (s[0] == skin) {
                // (QoL #235: in the player's language, "io_t3m_sk_<id>")
                return IoSkins.said("io_t3m_sk_" + s[0], String(s[1]));
            }
        }
        return skin;
    }

    /** QoL #235: a skin's line about it, in the player's language ("io_t3m_sk_<id>_line"). */
    public static lineOf(skin: string): string {
        for (let s of IoSkins.LIST) {
            if (s[0] == skin) {
                return IoSkins.said("io_t3m_sk_" + s[0] + "_line", String(s[2]));
            }
        }
        return "";
    }

    private static said(key: string, english: string): string {
        let s: string = KEYS.Get(key);
        return s && s != key ? s : english;
    }

    public static key(base: string, skin: string): string {
        return base + IoSkins.KEY + skin;
    }

    /** { base, skin } of a skin's key, or null. */
    public static parseKey(key: string): any {
        let i: int = key ? key.indexOf(IoSkins.KEY) : -1;
        if (i < 0) {
            return null;
        }
        let skin: string = key.substr(i + IoSkins.KEY.length);
        return IoSkins.has(skin) ? { "base": key.substr(0, i), "skin": skin } : null;
    }

    /**
     * The sprite id of a sheet in a skin ("G4_4~molten"), made the first time from the sheet's own (same frames);
     * the sheet's own id for none (or frozen: its own sheets, "G4_4F").
     */
    public static sprite(baseId: string, skin: string): string {
        if (!IoSkins.has(skin)) {
            return baseId;
        }
        let id: string = baseId + "~" + skin;
        if (!SPRITES._sprites[id]) {
            let b: SpriteData = as3.as(SPRITES._sprites[baseId], SpriteData);
            if (!b) {
                return baseId;
            }
            SPRITES._sprites[id] = new SpriteData(IoSkins.key(b.key, skin), b.rect.width, b.rect.height, b.middle.x, b.middle.y);
        }
        return id;
    }

    // ---- the recolouring

    private static hash(x: int, y: int): int {
        return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;
    }

    /** Smooth noise 0-1 (a grid of random heights, eased between), for Molten's cracks. */
    private static noise(x: number, y: number): number {
        let ix: int = Math.floor(x) | 0, iy: int = Math.floor(y) | 0;
        let fx: number = x - ix, fy: number = y - iy;
        let ux: number = fx * fx * (3 - 2 * fx), uy: number = fy * fy * (3 - 2 * fy);
        let h = (a: int, b: int): number => ((((a * 374761393) ^ (b * 668265263)) * 1274126177) >>> 16 & 0xFFFF) / 65535;
        let a: number = h(ix, iy), b: number = h(ix + 1, iy), c: number = h(ix, iy + 1), d: number = h(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    // ---- the colours (26 October): Oklab, every colour moved alike, each sheet stretched to vary as its own did

    /**
     * Each skin's colours: hue, the hue (OkLCh degrees) the sheet's own main colour turns to; tang and tmag, the tint
     * every colour (the greys too) is shifted towards (its direction in degrees, how far); dL, lighter or darker; cmax,
     * the most its colours may be strengthened; ghost, Bone's glow turned to this hue; near, the way a sheet already near
     * the skin's hue is turned (MIN_TURN) so it stays unlike the other skins; arc, else the way that keeps more of its
     * colour inside these hues (Molten: lava's, red to amber).
     */
    public static readonly SKIN_LOOKS: any = {
        "molten": { hue: 50, tang: 35, tmag: 0.045, dL: -0.12, cmax: 1.8, arc: [8, 78] },
        "void": { hue: 305, tang: 295, tmag: 0.06, dL: -0.06, cmax: 1.8 },
        "gilded": { hue: 75, tang: 75, tmag: 0.065, dL: 0.06, cmax: 1.8, near: 1 },
        // (26 October, the user's: "Revert bone back to its old art": Bone is drawn as before b142, its parts each given
        // its own colour (legacy: [hue, saturation, value times, value plus] for the dark, the middle, the pale and the
        // glow; its brightest glow ghost green): see legacyColour)
        "bone": { legacy: [[28, 0.16, 0.6, 0.04], [40, 0.17, 0.7, 0.26], [44, 0.1, 0.8, 0.16], [42, 0.12, 0.6, 0.42]], ghost: true },
        "venom": { hue: 118, tang: 130, tmag: 0.06, dL: -0.04, cmax: 1.8 },
        "crimson": { hue: 22, tang: 25, tmag: 0.05, dL: -0.08, cmax: 1.8, near: -1 },
        "abyss": { hue: 200, tang: 215, tmag: 0.05, dL: -0.08, cmax: 1.8 },
        "storm": { hue: 255, tang: 250, tmag: 0.04, dL: 0.05, cmax: 1.8 },
        // (Solid Gold: every colour a shade of polished yellow gold (unlike Gilded's orange) by its lightness, deep amber in
        // the dark to pale at the shine; its light and dark stretched as far as the sheet's own variety; metal: how strong
        // the gold, of the most the screen shows)
        "solidgold": { hue: 93, tang: 93, tmag: 0, dL: 0.18, cmax: 0.5, metal: 0.95 },
    };

    /** (tests) false: the colours alone, without the skins' touches (cracks, specks, haze). */
    public static ioTouches: boolean = true;

    /** The least a sheet's hues are turned (degrees): a sheet already near the skin's colour still changes every colour. */
    public static readonly MIN_TURN: number = 35;

    private static s_lin: Float32Array = null;

    /** sRGB 0-255 to Oklab, into out[0..2]. */
    public static toLab(r: number, g: number, b: number, out: number[]): void {
        let T: Float32Array = IoSkins.s_lin;
        if (!T) {
            T = IoSkins.s_lin = new Float32Array(256);
            for (let i: int = 0; i < 256; i++) {
                let c: number = i / 255;
                T[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            }
        }
        let lr: number = T[r | 0], lg: number = T[g | 0], lb: number = T[b | 0];
        let l: number = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
        let m: number = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
        let q: number = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
        out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
        out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q;
        out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
    }

    /** Oklab to linear sRGB, into out[0..2] (outside 0-1 where the screen can't show it). */
    private static labToLinear(L: number, a: number, b: number, out: number[]): void {
        let l: number = L + 0.3963377774 * a + 0.2158037573 * b;
        let m: number = L - 0.1055613458 * a - 0.0638541728 * b;
        let q: number = L - 0.0894841775 * a - 1.291485548 * b;
        l = l * l * l;
        m = m * m * m;
        q = q * q * q;
        out[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q;
        out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q;
        out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q;
    }

    private static enc(c: number): number {
        c = c < 0 ? 0 : c > 1 ? 1 : c;
        return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
    }

    /** The most colour (chroma) the screen holds at a lightness and hue: a table (65 lightnesses x 73 hues), read between. */
    private static s_cmax: Float32Array = null;
    private static readonly CM_L: int = 65;
    private static readonly CM_H: int = 73;

    private static cmaxTable(): Float32Array {
        if (IoSkins.s_cmax) {
            return IoSkins.s_cmax;
        }
        let t: Float32Array = new Float32Array(IoSkins.CM_L * IoSkins.CM_H);
        let o: number[] = [0, 0, 0];
        for (let i: int = 0; i < IoSkins.CM_L; i++) {
            let L: number = i / (IoSkins.CM_L - 1);
            for (let j: int = 0; j < IoSkins.CM_H; j++) {
                let h: number = j / (IoSkins.CM_H - 1) * Math.PI * 2;
                let lo: number = 0, hi: number = 0.4;
                for (let n: int = 0; n < 22; n++) {
                    let mid: number = (lo + hi) / 2;
                    IoSkins.labToLinear(L, mid * Math.cos(h), mid * Math.sin(h), o);
                    if (o[0] >= -1e-4 && o[0] <= 1.0001 && o[1] >= -1e-4 && o[1] <= 1.0001 && o[2] >= -1e-4 && o[2] <= 1.0001) {
                        lo = mid;
                    } else {
                        hi = mid;
                    }
                }
                t[i * IoSkins.CM_H + j] = lo;
            }
        }
        return (IoSkins.s_cmax = t);
    }

    private static cmaxAt(L: number, h: number): number {
        let t: Float32Array = IoSkins.cmaxTable();
        let x: number = Math.max(0, Math.min(1, L)) * (IoSkins.CM_L - 1);
        let y: number = ((h * 180 / Math.PI) % 360 + 360) % 360 / 360 * (IoSkins.CM_H - 1);
        let x0: int = Math.min(IoSkins.CM_L - 2, Math.floor(x)) | 0, y0: int = Math.min(IoSkins.CM_H - 2, Math.floor(y)) | 0;
        let fx: number = x - x0, fy: number = y - y0, W: int = IoSkins.CM_H;
        return t[x0 * W + y0] * (1 - fx) * (1 - fy) + t[(x0 + 1) * W + y0] * fx * (1 - fy) + t[x0 * W + y0 + 1] * (1 - fx) * fy + t[(x0 + 1) * W + y0 + 1] * fx * fy;
    }

    /** Lightness kept off pure black and white (no colour shows there): eased in, the middle as it is. */
    private static softL(L: number): number {
        const LO: number = 0.04, HI: number = 0.92, KW: number = 0.07;
        if (L < LO + KW) {
            return LO + KW - KW * Math.tanh((LO + KW - L) / KW);
        }
        if (L > HI - KW) {
            return HI - KW + KW * Math.tanh((L - HI + KW) / KW);
        }
        return L;
    }

    /**
     * One colour (Oklab, its hue's offset d from the sheet's main hue in degrees, its chroma C) in the skin, into
     * out[0..2] (Oklab, in the screen's colours): see SKIN_LOOKS. P: [h0, rot, mL, sL, sC, k, dL, da, db, ghost or NaN, metal
     * (Solid Gold: how strong its gold, of the most the screen shows)].
     */
    private static moved(L: number, C: number, d: number, glow: boolean, P: number[], out: number[]): void {
        if (P[10] > 0) {
            // Solid Gold: the shade of gold for its lightness (and a little of its old colour's difference in the hue)
            let gl: number = IoSkins.softL(P[2] + (L - P[2]) * P[3] + P[6]);
            let gh: number = (P[0] + P[1] + (gl - 0.62) * 40 + d * 0.08) * Math.PI / 180;
            let shine: number = Math.max(0, (gl - 0.8) / 0.12);
            let gc: number = IoSkins.cmaxAt(gl, gh) * P[10] * (1 - 0.3 * Math.min(1, shine)) * Math.min(1, 0.7 + C * 3);
            out[0] = gl;
            out[1] = gc * Math.cos(gh);
            out[2] = gc * Math.sin(gh);
            return;
        }
        let hh: number = P[0] + P[1] + d * P[5];
        let cc: number = C * P[4];
        if (glow && P[9] === P[9]) {
            hh = P[9] + d * P[5];
            cc = C;
        }
        let hr: number = hh * Math.PI / 180;
        let a: number = cc * Math.cos(hr) + P[7];
        let b: number = cc * Math.sin(hr) + P[8];
        let nl: number = IoSkins.softL(P[2] + (L - P[2]) * P[3] + P[6]);
        // (too strong a colour for the screen at that lightness: eased towards what it holds, not cut)
        let c: number = Math.sqrt(a * a + b * b);
        let m: number = Math.max(IoSkins.cmaxAt(nl, Math.atan2(b, a)) * 0.985, 1e-6);
        let kn: number = 0.75 * m;
        if (c > kn) {
            let c2: number = kn + (m - kn) * Math.tanh((c - kn) / Math.max(m - kn, 1e-6));
            a *= c2 / c;
            b *= c2 / c;
        }
        out[0] = nl;
        out[1] = a;
        out[2] = b;
    }

    /**
     * The recolouring before b142 (Bone's, the user's choice): the pixel's part (glow, dark, pale or the rest) given that
     * part's colour, a little of its old hue's difference kept; its brightest glow ghost green. An RGB int.
     */
    private static legacyColour(r0: int, g0: int, b0: int, parts: any[], ghost: boolean): int {
        let r: number = r0 / 255, g: number = g0 / 255, b: number = b0 / 255;
        let mx: number = Math.max(r, g, b), mn: number = Math.min(r, g, b);
        let v: number = mx, s: number = mx > 0.000001 ? (mx - mn) / mx : 0;
        let h: number = IoSkins.hueOf(r0, g0, b0);
        let hw: number = h > 300 ? h - 360 : h;
        let warm: boolean = hw > -40 && hw < 75;
        let glow: boolean = (warm && s > 0.45 && v > 0.55) || (v > 0.85 && s > 0.35);
        let k: int = glow ? 3 : (v < 0.45 ? 0 : (s < 0.3 ? 2 : 1));
        let c: any[] = parts[k];
        let nh: number = Number(c[0]) + (hw - 20) * 0.06;
        let ns: number = Math.min(1, Number(c[1]) * (0.75 + 0.25 * s) + (k == 3 ? 0 : 0.02));
        let nv: number = Math.min(1, v * Number(c[2]) + Number(c[3]));
        if (ghost && k == 3 && v > 0.9 && s > 0.55) {
            nh = 118;
            ns = 0.65;
            nv = 1;
        }
        let hh: number = ((nh % 360) + 360) % 360 / 60;
        let hi: int = Math.floor(hh) | 0;
        let f: number = hh - hi;
        let pp: number = nv * (1 - ns), q: number = nv * (1 - ns * f), tt: number = nv * (1 - ns * (1 - f));
        let or: number = nv, og: number = tt, ob: number = pp;
        switch (hi % 6) {
            case 1: or = q; og = nv; ob = pp; break;
            case 2: or = pp; og = nv; ob = tt; break;
            case 3: or = pp; og = q; ob = nv; break;
            case 4: or = tt; og = pp; ob = nv; break;
            case 5: or = nv; og = pp; ob = q; break;
        }
        return ((Math.round(or * 255) << 16) | (Math.round(og * 255) << 8) | Math.round(ob * 255)) | 0;
    }

    /** The sheet's glow (lava, fire, eyes): for Bone's ghost green. */
    private static isGlow(r: number, g: number, b: number): boolean {
        let mx: number = Math.max(r, g, b) / 255, mn: number = Math.min(r, g, b) / 255;
        let s: number = mx > 0.000001 ? (mx - mn) / mx : 0;
        let h: number = IoSkins.hueOf(r, g, b);
        let hw: number = h > 300 ? h - 360 : h;
        let warm: boolean = hw > -40 && hw < 75;
        return (warm && s > 0.6 && mx > 0.8) || (mx > 0.9 && s > 0.4);
    }

    private static hueOf(r: number, g: number, b: number): number {
        let mx: number = Math.max(r, g, b), mn: number = Math.min(r, g, b), dl: number = mx - mn;
        if (dl <= 0) {
            return 0;
        }
        let h: number = mx == r ? ((g - b) / dl) % 6 : (mx == g ? (b - r) / dl + 2 : (r - g) / dl + 4);
        h *= 60;
        return h < 0 ? h + 360 : h;
    }

    /** The dark, see-through, colourless shadow under a sprite: left as it is. */
    private static isShadow(r: number, g: number, b: number, a: number): boolean {
        if (a >= 217) {
            return false;
        }
        let mx: number = Math.max(r, g, b) / 255, mn: number = Math.min(r, g, b) / 255;
        let s: number = mx > 0.000001 ? (mx - mn) / mx : 0;
        return mx < 0.35 && s < 0.5;
    }

    /**
     * How this sheet moves into the skin, worked out from a sample of its colours (Lab rows of [L, a, b, weight,
     * glow]): its main hue, the turn, and the stretches of light, colour and hue spread (and a lift in lightness, up
     * to 0.12, where the skin's colours can't be as strong that dark) for which the skin varies as much as the sheet:
     * [h0, rot, mL, sL, sC, k, dL, da, db, ghost, metal]. Public for tests.
     */
    public static ioSolve(sample: number[][], look: any): number[] {
        let n: int = sample.length | 0;
        let sx: number = 0, sy: number = 0, wsum: number = 0;
        let mL: number = 0, mA: number = 0, mB: number = 0;
        for (let p of sample) {
            let c: number = Math.sqrt(p[1] * p[1] + p[2] * p[2]);
            sx += p[3] * c * p[1];
            sy += p[3] * c * p[2];
            wsum += p[3];
            mL += p[3] * p[0];
            mA += p[3] * p[1];
            mB += p[3] * p[2];
        }
        wsum = Math.max(wsum, 1e-9);
        mL /= wsum;
        mA /= wsum;
        mB /= wsum;
        let h0: number = Math.atan2(sy, sx) * 180 / Math.PI;
        let v0: number[] = [0, 0, 0];
        for (let p of sample) {
            v0[0] += p[3] * (p[0] - mL) * (p[0] - mL);
            v0[1] += p[3] * (p[1] - mA) * (p[1] - mA);
            v0[2] += p[3] * (p[2] - mB) * (p[2] - mB);
        }
        v0 = v0.map((v: number): number => v / wsum);
        let rot: number = ((look.hue - h0 + 180) % 360 + 360) % 360 - 180;
        if (look.metal) {
            // (Solid Gold: its gold whatever the sheet's own colour)
            rot = look.hue - h0;
        } else if (Math.abs(rot) < IoSkins.MIN_TURN) {
            let way: number = look.near ? Number(look.near) : rot >= 0 ? 1 : -1;
            if (look.arc) {
                // (the way that leaves more of the sheet's colour inside the skin's hues)
                let inArc = (turn: number): number => {
                    let t: number = 0;
                    for (let p of sample) {
                        let c: number = Math.sqrt(p[1] * p[1] + p[2] * p[2]);
                        let h: number = ((Math.atan2(p[2], p[1]) * 180 / Math.PI + turn) % 360 + 360) % 360;
                        // (by how much of the picture it is: a large pale body counts as much as its strongest colour)
                        if (c > 0.03 && h >= look.arc[0] && h <= look.arc[1]) {
                            t += p[3];
                        }
                    }
                    return t;
                };
                way = inArc(-IoSkins.MIN_TURN) > inArc(IoSkins.MIN_TURN) ? -1 : 1;
            }
            rot = way * IoSkins.MIN_TURN;
        }
        // each colour's chroma and hue offset; the most the hues may spread with every colour still turned MIN_TURN
        let C: number[] = new Array(n), D: number[] = new Array(n);
        let ds: number[] = [];
        for (let i: int = 0; i < n; i++) {
            let p: number[] = sample[i];
            C[i] = Math.sqrt(p[1] * p[1] + p[2] * p[2]);
            D[i] = (((Math.atan2(p[2], p[1]) * 180 / Math.PI - h0 + 180) % 360) + 360) % 360 - 180;
            if (C[i] > 0.04) {
                ds.push(D[i]);
            }
        }
        let km: number = 3;
        if (ds.length >= 10) {
            ds.sort((x: number, y: number): number => x - y);
            let lo: number = ds[Math.floor(ds.length * 0.03)], hi: number = ds[Math.floor(ds.length * 0.97)];
            if (rot > 0 && lo < 0) {
                km = Math.min(km, 1 + (rot - IoSkins.MIN_TURN) / -lo);
            }
            if (rot < 0 && hi > 0) {
                km = Math.min(km, 1 + (-rot - IoSkins.MIN_TURN) / hi);
            }
        } else {
            km = 1;
        }
        km = Math.max(1, km);
        let ta: number = look.tang * Math.PI / 180;
        let da: number = look.tmag * Math.cos(ta), db: number = look.tmag * Math.sin(ta);
        let ghost: number = look.ghost === undefined ? NaN : Number(look.ghost);
        let metal: number = look.metal ? Number(look.metal) : 0;
        let o: number[] = [0, 0, 0];
        let variance = (P: number[]): number[] => {
            let sl: number = 0, sa: number = 0, sb: number = 0;
            let L: number[] = new Array(n), A: number[] = new Array(n), Bv: number[] = new Array(n);
            for (let i: int = 0; i < n; i++) {
                IoSkins.moved(sample[i][0], C[i], D[i], sample[i][4] > 0, P, o);
                L[i] = o[0];
                A[i] = o[1];
                Bv[i] = o[2];
                sl += sample[i][3] * o[0];
                sa += sample[i][3] * o[1];
                sb += sample[i][3] * o[2];
            }
            sl /= wsum;
            sa /= wsum;
            sb /= wsum;
            let v: number[] = [0, 0, 0];
            for (let i: int = 0; i < n; i++) {
                let w: number = sample[i][3];
                v[0] += w * (L[i] - sl) * (L[i] - sl);
                v[1] += w * (A[i] - sa) * (A[i] - sa);
                v[2] += w * (Bv[i] - sb) * (Bv[i] - sb);
            }
            return v.map((x: number): number => x / wsum);
        };
        let clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
        let best: number[] = null;
        let bestRatio: number = -1;
        for (let lift of [0, 0.04, 0.08, 0.12]) {
            let dL: number = look.dL + lift;
            // (never so little lighter or darker that colours near the turn's still point stay as they were)
            if (lift > 0 && Math.abs(dL) < 0.05) {
                continue;
            }
            let sL: number = 1, sC: number = Math.min(1, look.cmax), k: number = 1;
            for (let it: int = 0; it < 6; it++) {
                let v1: number[] = variance([h0, rot, mL, sL, sC, k, dL, da, db, ghost, metal]);
                sL = clamp(sL * Math.sqrt(v0[0] / Math.max(v1[0], 1e-9)), 0.8, 1.6);
                let r: number = Math.sqrt((v0[1] + v0[2]) / Math.max(v1[1] + v1[2], 1e-9));
                if (sC < look.cmax || r < 1) {
                    sC = clamp(sC * r, 0.5, look.cmax);
                } else {
                    k = clamp(k * r, 1, km);
                }
            }
            let v1: number[] = variance([h0, rot, mL, sL, sC, k, dL, da, db, ghost, metal]);
            let ratio: number = (v1[1] + v1[2]) / Math.max(v0[1] + v0[2], 1e-9);
            if (!best || ratio > bestRatio + 0.03) {
                best = [h0, rot, mL, sL, sC, k, dL, da, db, ghost, metal];
                bestRatio = ratio;
            }
            if (ratio >= 0.9 || look.cmax < 1) {
                break;
            }
        }
        // what the colours still lack, made up in light and dark: as much variety in all
        for (let it: int = 0; it < 4; it++) {
            let v1: number[] = variance(best);
            let tot0: number = v0[0] + v0[1] + v0[2], tot1: number = v1[0] + v1[1] + v1[2];
            if (tot0 / Math.max(tot1, 1e-9) <= 1.01) {
                break;
            }
            // (light and dark taken no further than a fifth more varied than the sheet's own)
            let want: number = Math.min(v1[0] + tot0 - tot1, v0[0] * 1.2);
            best[3] = clamp(best[3] * Math.sqrt(want / Math.max(v1[0], 1e-9)), 0.8, 1.6);
        }
        return best;
    }

    /**
     * A sheet in a skin, to done(bmd): made in slices (a big sheet takes a moment: the game goes on between them),
     * kept for the next asking.
     */
    public static recolour(src: BitmapData, skin: string, done: Function): void {
        let theme: any = IoSkins.THEMES[skin];
        let look: any = IoSkins.SKIN_LOOKS[skin];
        if (!src || !theme || !look) {
            done(src);
            return;
        }
        let out: BitmapData = src.clone();
        let img: ImageData = out.data();
        let d: Uint8ClampedArray = img.data;
        const W: int = img.width, H: int = img.height;
        // (the alpha before: the haze looks at the body's edge)
        let alpha: Uint8Array = new Uint8Array(W * H);
        for (let i: int = 0, p: int = 3; i < W * H; i++, p += 4) {
            alpha[i] = d[p];
        }
        const touches: boolean = IoSkins.ioTouches;
        const fleck: int = touches ? theme.fleck | 0 : 0;
        const fr: int = ((theme.fleckColour | 0) >> 16) & 255, fg: int = ((theme.fleckColour | 0) >> 8) & 255, fb: int = (theme.fleckColour | 0) & 255;
        const cracks: boolean = touches && Boolean(theme.cracks);
        const ghosted: boolean = look.ghost !== undefined && !look.legacy;
        const legacy: any[] = look.legacy ? as3.as(look.legacy, Array) : null;
        // a sample of the sheet's colours (every so many pixels of its body), and how it moves into the skin
        let lab: number[] = [0, 0, 0];
        let sample: number[][] = [];
        let step: int = Math.max(1, Math.floor(W * H / 60000)) | 1;
        for (let i: int = 0; i < W * H; i += step) {
            let p: int = i * 4;
            let a: int = d[p + 3];
            if (a == 0 || IoSkins.isShadow(d[p], d[p + 1], d[p + 2], a)) {
                continue;
            }
            IoSkins.toLab(d[p], d[p + 1], d[p + 2], lab);
            sample.push([lab[0], lab[1], lab[2], a / 255, ghosted && IoSkins.isGlow(d[p], d[p + 1], d[p + 2]) ? 1 : 0]);
            if (sample.length >= 20000) {
                break;
            }
        }
        if (!sample.length && !legacy) {
            done(out);
            return;
        }
        const P: number[] = legacy ? null : IoSkins.ioSolve(sample, look);
        // (each colour worked out once: a sheet has far fewer colours than pixels)
        let made: Map<int, int> = new Map<int, int>();
        let o: number[] = [0, 0, 0];
        let lin: number[] = [0, 0, 0];
        const ROWS: int = Math.max(1, Math.floor(600000 / Math.max(1, W))) | 0;
        let y0: int = 0;
        let slice = (): void => {
            let y1: int = Math.min(H, y0 + ROWS) | 0;
            for (let y: int = y0; y < y1; y++) {
                for (let x: int = 0; x < W; x++) {
                    let p: int = (y * W + x) * 4;
                    let a: int = d[p + 3];
                    if (a == 0) {
                        continue;
                    }
                    let r0: int = d[p], g0: int = d[p + 1], b0: int = d[p + 2];
                    if (IoSkins.isShadow(r0, g0, b0, a)) {
                        continue;
                    }
                    let key: int = (r0 << 16) | (g0 << 8) | b0;
                    let c: int | undefined = made.get(key);
                    if (c === undefined && legacy) {
                        c = IoSkins.legacyColour(r0, g0, b0, legacy, Boolean(look.ghost));
                        made.set(key, c);
                    } else if (c === undefined) {
                        IoSkins.toLab(r0, g0, b0, lab);
                        let C: number = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
                        let dd: number = (((Math.atan2(lab[2], lab[1]) * 180 / Math.PI - P[0] + 180) % 360) + 360) % 360 - 180;
                        IoSkins.moved(lab[0], C, dd, ghosted && IoSkins.isGlow(r0, g0, b0), P, o);
                        IoSkins.labToLinear(o[0], o[1], o[2], lin);
                        c = ((IoSkins.enc(lin[0]) << 16) | (IoSkins.enc(lin[1]) << 8) | IoSkins.enc(lin[2])) | 0;
                        made.set(key, c);
                    }
                    let R: number = (c >> 16) & 255, G: number = (c >> 8) & 255, B: number = c & 255;
                    if (cracks && Math.max(r0, g0, b0) < 150) {
                        // Molten: thin bright lines where the noise crosses its middle, over the dark rock
                        let n: number = Math.abs(IoSkins.noise(x / 7, y / 7) - 0.5) + Math.abs(IoSkins.noise(x / 3.1 + 40, y / 3.1) - 0.5) * 0.35;
                        if (n < 0.05) {
                            let t: number = 1 - n / 0.05;
                            R = R * (1 - t) + 255 * t;
                            G = G * (1 - t) + (120 + 90 * t) * t;
                            B = B * (1 - t) + 30 * t;
                        }
                    }
                    if (fleck > 0 && a > 128 && IoSkins.hash(x >> 1, y >> 1) >= 1000 - fleck) {
                        R = R * 0.35 + fr * 0.65;
                        G = G * 0.35 + fg * 0.65;
                        B = B * 0.35 + fb * 0.65;
                    }
                    d[p] = R;
                    d[p + 1] = G;
                    d[p + 2] = B;
                }
            }
            y0 = y1;
            if (y0 < H) {
                setTimeout(slice, 0);
                return;
            }
            // the haze: just outside the body, a faint ring of the skin's light
            if (touches && (theme.ring | 0) >= 0 && theme.ring != -1) {
                const hr: int = ((theme.ring | 0) >> 16) & 255, hg: int = ((theme.ring | 0) >> 8) & 255, hb: int = (theme.ring | 0) & 255;
                for (let y: int = 1; y < H - 1; y++) {
                    for (let x: int = 1; x < W - 1; x++) {
                        let i: int = y * W + x;
                        if (alpha[i] > 70) {
                            continue;
                        }
                        if (alpha[i - 1] > 128 || alpha[i + 1] > 128 || alpha[i - W] > 128 || alpha[i + W] > 128) {
                            let p: int = i * 4;
                            let old: number = d[p + 3] / 255;
                            let na: number = Math.max(old, 0.38);
                            // (over what was there: a shadow's edge keeps some of its dark)
                            d[p] = (d[p] * old * 0.4 + hr * (na - old * 0.4)) / na;
                            d[p + 1] = (d[p + 1] * old * 0.4 + hg * (na - old * 0.4)) / na;
                            d[p + 2] = (d[p + 2] * old * 0.4 + hb * (na - old * 0.4)) / na;
                            d[p + 3] = na * 255;
                        }
                    }
                }
            }
            out.$putData(img);
            done(out);
        };
        slice();
    }
}
