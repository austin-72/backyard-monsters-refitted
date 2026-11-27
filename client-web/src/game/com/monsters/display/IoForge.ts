import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { GLOBAL, IoDave } from "@game";

/**
 * Inferno-only (27 November, admintester's reports from the right-click menu: "Make hellforge a completely
 * customizable background so the user can make it any colors and shapes they want with thousands of possible
 * backgrounds in the one" and "Make hellforge a completely customizable in color and animaiton so the user can make it
 * how they want with thousands of possibilities"): the Hellforge ground and the Hellforge chat name, made by the player
 * (the D.A.V.E. Club: IoTerrainPopup's forge windows; kept by the server: services/yard/dave.ts, forgeGround and
 * forgeName).
 *
 * The ground (forgeGround): { p pattern 0-9, z size 0-2, s stone colour, g glow colour, h heart colour (the light's
 * middle), a moving 0-5, v speed 0-2 }: 10 patterns x 3 sizes x 16 x 16 x 16 colours x 6 movings x 3 speeds, over
 * two million grounds. Drawn here, in the game, as one seamless 1000 x 500 sheet (as the other moving grounds: MAPBG)
 * and its light alone on black for IoGroundFx to move. The patterns are laid on the yard's own diamonds: u and v
 * (x / 1000 + y / 500 and x / 1000 - y / 500, times the size's count) go up by whole numbers across the sheet, so it
 * meets itself at every edge.
 *
 * The name (forgeName): { m move, c three colours, v speed 0-2 }: the chat's moves (IoDave.fxHtml) in any three of 32
 * colours, slow, normal or fast: 8 x 32 x 32 x 32 x 3, over 780,000 names.
 */
export class IoForge extends ASObject {
    public static readonly PATTERNS: any[] = ["lattice", "cracks", "scales", "bricks", "honeycomb", "rings", "rivers", "sigils", "veins", "pools"];

    /** How many cells across the sheet: big, medium, small (even: the rows that sit half over keep it seamless). */
    public static readonly SIZES: any[] = [4, 6, 10];

    public static readonly STONES: any[] = ["#2A1A14", "#3A2418", "#1C1C22", "#2E2A26", "#46423C", "#1A2430", "#142A20", "#301428", "#401010", "#3A3010", "#202A2A", "#5A5048", "#6A6A70", "#0E0E10", "#4A2C10", "#26183A"];

    public static readonly LIGHTS: any[] = ["#FF4A10", "#FF8A1A", "#FFD040", "#FFF0B0", "#FF2040", "#FF40A0", "#C040FF", "#8060FF", "#3080FF", "#40D0FF", "#40FFC0", "#50FF50", "#B0FF30", "#FFFFFF", "#A0A0B8", "#7A0A00"];

    /** Still, pulsing, drifting, pulsing and drifting, flickering, shifting between the glow and the heart colour. */
    public static readonly MOVES: any[] = ["still", "pulse", "drift", "pulsedrift", "flicker", "shift"];

    public static readonly SPEEDS: any[] = [0.5, 1, 2];

    /** The Hellforge as it was (art/grounds: a lattice of amber light on dark iron). */
    public static readonly DEFAULT: any = { "p": 0, "z": 1, "s": "#2A1A14", "g": "#FF8A1A", "h": "#FFF0B0", "a": 3, "v": 1 };

    /** The chat name's colours (any three) and moves. */
    public static readonly NAME_COLORS: any[] = [
        "#7A0A00", "#C01010", "#E03A3A", "#FF7070", "#B03A00", "#E06A00", "#FF9A30", "#FFC870",
        "#8A6A00", "#D8A800", "#F0E040", "#FFF4B0", "#2E6A10", "#3EA020", "#70E040", "#B8FF90",
        "#006A5A", "#00A890", "#30E0C8", "#A0FFF0", "#0A3A8A", "#1A6AE0", "#50A8FF", "#B0D8FF",
        "#3A1080", "#7A30D0", "#B070FF", "#E8C8FF", "#8A1060", "#D02090", "#FF70C8", "#FFFFFF"];

    public static readonly NAME_MOVES: any[] = ["grad", "shine", "flow", "pulse", "fire", "beat", "spark", "chase"];

    public static readonly NAME_DEFAULT: any = { "m": "chase", "c": ["#7A0A00", "#C04010", "#FFE0A0"], "v": 1 };

    public $ctor(): void {
        super.$ctor();
    }

    // ---- the settings

    private static hexOk(c: any): boolean {
        return typeof c == "string" && /^#[0-9A-Fa-f]{6}$/.test(String(c));
    }

    private static intIn(v: any, n: int, def: int): int {
        let i: number = Number(v);
        return isFinite(i) && Math.floor(i) == i && i >= 0 && i < n ? (i | 0) : def;
    }

    /** A ground's settings made whole (anything missing or wrong: the Hellforge's own), or null if there are none. */
    public static ground(raw: any): any {
        if (!raw || typeof raw != "object") {
            return null;
        }
        let d: any = IoForge.DEFAULT;
        return {
            "p": IoForge.intIn(raw.p, IoForge.PATTERNS.length, d.p),
            "z": IoForge.intIn(raw.z, IoForge.SIZES.length, d.z),
            "s": IoForge.hexOk(raw.s) ? String(raw.s).toUpperCase() : d.s,
            "g": IoForge.hexOk(raw.g) ? String(raw.g).toUpperCase() : d.g,
            "h": IoForge.hexOk(raw.h) ? String(raw.h).toUpperCase() : d.h,
            "a": IoForge.intIn(raw.a, IoForge.MOVES.length, d.a),
            "v": IoForge.intIn(raw.v, IoForge.SPEEDS.length, d.v),
        };
    }

    /** A name's settings made whole, or null. */
    public static nameCfg(raw: any): any {
        if (!raw || typeof raw != "object") {
            return null;
        }
        let d: any = IoForge.NAME_DEFAULT;
        let m: string = IoForge.NAME_MOVES.indexOf(String(raw.m)) >= 0 ? String(raw.m) : d.m;
        let c: any[] = [];
        for (let i: int = 0; i < 3; i++) {
            let x: any = raw.c && raw.c[i];
            c.push(IoForge.hexOk(x) ? String(x).toUpperCase() : d.c[i]);
        }
        return { "m": m, "c": c, "v": IoForge.intIn(raw.v, IoForge.SPEEDS.length, d.v) };
    }

    /** A name's look for the chat (IoDave.fxHtml): "fire@2:#a,#b,#c". */
    public static nameSpec(cfg: any): string {
        let c: any = IoForge.nameCfg(cfg) || IoForge.NAME_DEFAULT;
        let v: int = c.v | 0;
        return String(c.m) + (v == 1 ? "" : "@" + String(IoForge.SPEEDS[v])) + ":" + (c.c as any[]).join(",");
    }

    public static key(cfg: any): string {
        return [cfg.p, cfg.z, cfg.s, cfg.g, cfg.h, cfg.a, cfg.v].join("|");
    }

    /** A ground or a name of the forge's choosing (the window's dice). */
    public static random(): any {
        let pick: Function = (a: any[]): any => a[Math.floor(Math.random() * a.length)];
        return { "p": Math.floor(Math.random() * IoForge.PATTERNS.length), "z": Math.floor(Math.random() * 3), "s": pick(IoForge.STONES), "g": pick(IoForge.LIGHTS), "h": pick(IoForge.LIGHTS), "a": Math.floor(Math.random() * IoForge.MOVES.length), "v": Math.floor(Math.random() * 3) };
    }

    public static randomName(): any {
        let pick: Function = (a: any[]): any => a[Math.floor(Math.random() * a.length)];
        return { "m": pick(IoForge.NAME_MOVES), "c": [pick(IoForge.NAME_COLORS), pick(IoForge.NAME_COLORS), pick(IoForge.NAME_COLORS)], "v": Math.floor(Math.random() * 3) };
    }

    /** The loaded yard's own Hellforge, if its owner has made one (IoDave's yard looks). */
    public static yardGround(): any {
        return GLOBAL.INFERNO_ONLY ? IoForge.ground(IoDave.yardForgeGround) : null;
    }

    // ---- drawing

    private static rgb(hex: string): any[] {
        let n: int = parseInt(String(hex).substr(1), 16) | 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    /** A number for a cell, 0 to 1 (the same cell, the same number). */
    private static hash(i: int, j: int, k: int): number {
        let h: number = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h = h ^ (h >>> 16);
        return (h >>> 0) / 4294967296;
    }

    private static wrap(i: int, n: int): int {
        return (((i % n) + n) % n) | 0;
    }

    /** Smooth noise on a lattice that wraps round every n (0 to 1). */
    private static noise(x: number, y: number, nx: int, ny: int, seed: int): number {
        let ix: int = Math.floor(x) | 0;
        let iy: int = Math.floor(y) | 0;
        let fx: number = x - ix;
        let fy: number = y - iy;
        fx = fx * fx * (3 - 2 * fx);
        fy = fy * fy * (3 - 2 * fy);
        let x0: int = IoForge.wrap(ix, nx), x1: int = IoForge.wrap(ix + 1, nx);
        let y0: int = IoForge.wrap(iy, ny), y1: int = IoForge.wrap(iy + 1, ny);
        let a: number = IoForge.hash(x0, y0, seed), b: number = IoForge.hash(x1, y0, seed);
        let c: number = IoForge.hash(x0, y1, seed), d: number = IoForge.hash(x1, y1, seed);
        return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
    }

    private static _grain: any = {};

    /** The stone's grain at w x h, seamless (the same for every ground). */
    private static grain(w: int, h: int): Float32Array {
        let k: string = w + "x" + h;
        if (IoForge._grain[k]) {
            return IoForge._grain[k];
        }
        let g: Float32Array = new Float32Array(w * h);
        for (let py: int = 0; py < h; py++) {
            let y: number = py / h;
            for (let px: int = 0; px < w; px++) {
                let x: number = px / w;
                g[py * w + px] = 0.5 * IoForge.noise(x * 40, y * 20, 40, 20, 11) + 0.3 * IoForge.noise(x * 100, y * 50, 100, 50, 12) + 0.2 * IoForge.noise(x * 250, y * 125, 250, 125, 13);
            }
        }
        IoForge._grain[k] = g;
        return g;
    }

    /** Distance from a point to a segment. */
    private static seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
        let dx: number = bx - ax, dy: number = by - ay;
        let t: number = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        let ex: number = px - ax - dx * t, ey: number = py - ay - dy * t;
        return Math.sqrt(ex * ex + ey * ey);
    }

    private static _star: any[] = null;

    /** Each cell's numbers (hash 1, 2, 3, 4, 5, 7), worked out once a drawing, n x n of them. */
    private static _tab: Float32Array = null;
    private static _tabN: int = 0;

    private static table(n: int): void {
        if (IoForge._tab && IoForge._tabN == n) {
            return;
        }
        let t: Float32Array = new Float32Array(n * n * 6);
        for (let i: int = 0; i < n; i++) {
            for (let j: int = 0; j < n; j++) {
                let o: int = (i * n + j) * 6;
                t[o] = IoForge.hash(i, j, 1);
                t[o + 1] = IoForge.hash(i, j, 2);
                t[o + 2] = IoForge.hash(i, j, 3);
                t[o + 3] = IoForge.hash(i, j, 4);
                t[o + 4] = IoForge.hash(i, j, 5);
                t[o + 5] = IoForge.hash(i, j, 7);
            }
        }
        IoForge._tab = t;
        IoForge._tabN = n;
    }

    /** A cell's number k (0: hash 1 ... 5: hash 7), its place taken round the sheet. */
    private static cellNum(i: int, j: int, n: int, k: int): number {
        return IoForge._tab[(IoForge.wrap(i, n) * n + IoForge.wrap(j, n)) * 6 + k];
    }

    /**
     * At (u, v): [how far from the light's line (in cells), a fill of light (0-1: pools), the cell's own number].
     */
    private static at(p: int, u: number, v: number, n: int, out: any[]): void {
        let iu: int = Math.floor(u) | 0;
        let iv: int = Math.floor(v) | 0;
        let fu: number = u - iu;
        let fv: number = v - iv;
        let d: number = 1;
        let fill: number = 0;
        let cell: number = IoForge.cellNum(iu, iv, n, 5);
        if (p == 0) {
            // lattice: the diamonds' edges, and a smaller diamond in each
            d = Math.min(fu, 1 - fu, fv, 1 - fv);
            let m: number = Math.max(Math.abs(fu - 0.5), Math.abs(fv - 0.5));
            d = Math.min(d, Math.abs(m - 0.25));
        } else if (p == 1 || p == 4) {
            // cracks (seeds anywhere in their cell), honeycomb (seeds in rows, every other row half over)
            let d1: number = 9, d2: number = 9;
            for (let j: int = -1; j <= 1; j++) {
                for (let i: int = -1; i <= 1; i++) {
                    let cu: int = iu + i, cv: int = iv + j;
                    let su: number, sv: number;
                    if (p == 1) {
                        su = cu + 0.15 + 0.7 * IoForge.cellNum(cu, cv, n, 0);
                        sv = cv + 0.15 + 0.7 * IoForge.cellNum(cu, cv, n, 1);
                    } else {
                        su = cu + 0.5 + (IoForge.wrap(cv, 2) == 1 ? 0.5 : 0);
                        sv = cv + 0.5;
                    }
                    let du: number = u - su, dv: number = v - sv;
                    let dd: number = Math.sqrt(du * du + dv * dv);
                    if (dd < d1) {
                        d2 = d1;
                        d1 = dd;
                        cell = IoForge.cellNum(cu, cv, n, 5);
                    } else if (dd < d2) {
                        d2 = dd;
                    }
                }
            }
            d = (d2 - d1) * 0.5;
        } else if (p == 2) {
            // scales: each row's half circles, the next row's over them
            let off: number = IoForge.wrap(iv, 2) == 1 ? 0.5 : 0;
            let lx: number = u - off - Math.floor(u - off);
            let r: number = 0.62;
            let db: number = Math.min(Math.sqrt(lx * lx + (fv - 1) * (fv - 1)), Math.sqrt((lx - 1) * (lx - 1) + (fv - 1) * (fv - 1)));
            if (db < r) {
                d = Math.abs(db - r);
                cell = IoForge.cellNum(iu + (lx < 0.5 ? 0 : 1), iv + 1, n, 5);
            } else {
                let da: number = Math.sqrt((lx - 0.5) * (lx - 0.5) + fv * fv);
                d = Math.min(Math.abs(da - r), db - r);
            }
        } else if (p == 3) {
            // bricks: two rows in each cell, every other row half over
            let row: int = Math.floor(fv * 2) | 0;
            let ly: number = fv * 2 - row;
            let lx: number = fu + (row == 1 ? 0.5 : 0);
            lx = lx - Math.floor(lx);
            d = Math.min(Math.min(ly, 1 - ly) * 0.5, Math.min(lx, 1 - lx));
            cell = IoForge.hash(IoForge.wrap(iu * 2 + row + (row == 1 && fu >= 0.5 ? 1 : 0), n * 2), IoForge.wrap(iv, n), 7);
        } else if (p == 5) {
            // rings in each diamond, on its edges
            let du: number = fu - 0.5, dv: number = fv - 0.5;
            let r: number = Math.sqrt(du * du + dv * dv);
            d = Math.min(Math.abs(r - 0.18), Math.abs(r - 0.38), Math.min(fu, 1 - fu, fv, 1 - fv) * 1.4);
        } else if (p == 6) {
            // rivers winding across
            let w: number = u + 0.22 * Math.sin(2 * Math.PI * v) + 0.08 * Math.sin(6 * Math.PI * v);
            d = Math.abs(Math.sin(Math.PI * w)) / Math.PI * 0.9;
            cell = IoForge.hash(IoForge.wrap(Math.floor(w) | 0, n), 0, 7);
        } else if (p == 7) {
            // sigils: a ring and a five-pointed star in each diamond
            if (!IoForge._star) {
                IoForge._star = [];
                for (let k: int = 0; k < 5; k++) {
                    let a: number = -Math.PI / 2 + k * 2 * Math.PI / 5;
                    IoForge._star.push([0.5 + 0.34 * Math.cos(a), 0.5 + 0.34 * Math.sin(a)]);
                }
            }
            let s: any[] = IoForge._star;
            let du: number = fu - 0.5, dv: number = fv - 0.5;
            d = Math.abs(Math.sqrt(du * du + dv * dv) - 0.4);
            for (let k: int = 0; k < 5; k++) {
                let a: any[] = s[k], b: any[] = s[(k + 2) % 5];
                d = Math.min(d, IoForge.seg(fu, fv, a[0], a[1], b[0], b[1]));
            }
        } else if (p == 8) {
            // veins: the light where two noises cross the middle
            let a: number = IoForge.noise(u * 2, v * 2, n * 2, n * 2, 21) * 0.65 + IoForge.noise(u * 4, v * 4, n * 4, n * 4, 22) * 0.35;
            d = Math.abs(a - 0.5) * 1.3;
            cell = IoForge.noise(u, v, n, n, 23);
        } else {
            // pools of light, a rim round each
            let cu: number = 0.3 + 0.4 * IoForge.cellNum(iu, iv, n, 2);
            let cv: number = 0.3 + 0.4 * IoForge.cellNum(iu, iv, n, 3);
            let r: number = 0.12 + 0.14 * IoForge.cellNum(iu, iv, n, 4);
            let du: number = fu - cu, dv: number = fv - cv;
            let dd: number = Math.sqrt(du * du + dv * dv) - r;
            d = Math.abs(dd);
            if (dd < 0) {
                fill = Math.min(1, -dd / 0.05) * 0.85;
            }
        }
        out[0] = d;
        out[1] = fill;
        out[2] = cell;
    }

    /**
     * A ground drawn at w x h (1000 x 500 for the yard; smaller for the window): [the sheet (the ground with its light,
     * at half strength if it moves), its light alone on black (the glow's colour into the heart's), and for "shift"
     * the light in the heart's colour alone]. Pixels written straight into each picture's data.
     */
    public static draw(cfg: any, w: int, h: int): any[] {
        let c: any = IoForge.ground(cfg) || IoForge.DEFAULT;
        let n: int = IoForge.SIZES[c.z] | 0;
        let p: int = c.p | 0;
        let still: boolean = c.a == 0;
        let shift: boolean = IoForge.MOVES[c.a] == "shift";
        let st: any[] = IoForge.rgb(c.s), gl: any[] = IoForge.rgb(c.g), ht: any[] = IoForge.rgb(c.h);
        // (the grain at half the yard's size at most: it is soft, and a quarter of the work)
        let gw: int = Math.min(w, 500) | 0;
        let gh: int = Math.min(h, 250) | 0;
        let grain: Float32Array = IoForge.grain(gw, gh);
        let gsx: number = gw / w, gsy: number = gh / h;
        IoForge.table(n);
        let sheet: BitmapData = new BitmapData(w, h, false, 0);
        let light: BitmapData = new BitmapData(w, h, false, 0);
        let heart: BitmapData = shift ? new BitmapData(w, h, false, 0) : null;
        let si: ImageData = sheet.data(), li: ImageData = light.data(), hi: ImageData = heart ? heart.data() : null;
        let sd: Uint8ClampedArray = si.data, ld: Uint8ClampedArray = li.data, hd: Uint8ClampedArray = hi ? hi.data : null;
        // the line's width in cells (the same on the screen whatever the size)
        let lw: number = 0.012 * n;
        let ks: number = still ? 1 : 0.5;
        let out: any[] = [0, 0, 0];
        for (let py: int = 0; py < h; py++) {
            let y: number = py / h;
            for (let px: int = 0; px < w; px++) {
                let x: number = px / w;
                let u: number = n * (x + y), v: number = n * (x - y);
                IoForge.at(p, u, v, n, out);
                let d: number = out[0];
                let core: number = d < lw ? 1 - d / lw : 0;
                core = core * core * (3 - 2 * core);
                let halo: number = Math.exp(-d / (lw * 2.4)) * 0.6;
                let L: number = Math.min(1, Math.max(core + halo, out[1]));
                let hk: number = Math.max(core * core, out[1] * 0.7);
                let gr: number = grain[((py * gsy) | 0) * gw + ((px * gsx) | 0)];
                // the stone: grained, each slab a little lighter or darker, darker by the light's line (raised)
                let sk: number = (0.55 + 0.6 * gr) * (0.86 + 0.28 * out[2]) * (0.5 + 0.5 * Math.min(1, d / (lw * 5)));
                let o: int = (py * w + px) * 4;
                for (let ch: int = 0; ch < 3; ch++) {
                    let lc: number = (gl[ch] * (1 - hk) + ht[ch] * hk) * L;
                    sd[o + ch] = st[ch] * sk + lc * ks;
                    ld[o + ch] = shift ? gl[ch] * L : lc;
                    if (hd) {
                        hd[o + ch] = ht[ch] * L;
                    }
                }
                sd[o + 3] = 255;
                ld[o + 3] = 255;
                if (hd) {
                    hd[o + 3] = 255;
                }
            }
        }
        sheet.$putData(si);
        light.$putData(li);
        if (heart) {
            heart.$putData(hi);
        }
        return [sheet, light, heart];
    }

    private static _cacheKey: string = null;

    private static _cache: any[] = null;

    /** The yard's 1000 x 500 drawing of a ground, kept for the last one asked for (it takes a moment). */
    public static full(cfg: any): any[] {
        let k: string = IoForge.key(cfg);
        if (IoForge._cacheKey != k || !IoForge._cache) {
            IoForge._cache = IoForge.draw(cfg, 1000, 500);
            IoForge._cacheKey = k;
        }
        return IoForge._cache;
    }

    /** The yard's ground sheet (MAPBG): a copy (swapBG lets it go once laid). */
    public static sheet(cfg: any): BitmapData {
        return (IoForge.full(cfg)[0] as BitmapData).clone();
    }

    /**
     * How the light moves (IoGroundFx's looks): [its pictures, [period ms, phase] of each one's glowing or null, the
     * mask's drift in px a second or null, flicker], at the speed chosen; null: still.
     */
    public static fxLook(cfg: any, drawn: any[] = null): any[] {
        let c: any = IoForge.ground(cfg) || IoForge.DEFAULT;
        let mv: string = String(IoForge.MOVES[c.a]);
        if (mv == "still") {
            return null;
        }
        let k: number = Number(IoForge.SPEEDS[c.v]);
        let pics: any[] = drawn || IoForge.full(c);
        let glow: any[] = [[Math.round(2600 / k), 0]];
        let drift: any[] = [Math.round(46 * k), Math.round(23 * k)];
        if (mv == "pulse") {
            return [[pics[1]], glow, null, false];
        }
        if (mv == "drift") {
            return [[pics[1]], null, drift, false];
        }
        if (mv == "pulsedrift") {
            return [[pics[1]], glow, drift, false];
        }
        if (mv == "flicker") {
            return [[pics[1]], null, null, k];
        }
        // shift: the glow's colour and the heart's, each fading in as the other fades out
        let t: int = Math.round(3200 / k) | 0;
        return [[pics[1], pics[2]], [[t, 0], [t, Math.PI]], null, false];
    }
}
