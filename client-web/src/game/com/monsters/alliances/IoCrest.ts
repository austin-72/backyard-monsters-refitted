import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer, Graphics, Shape } from "flash/display";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { GLOBAL, ImageCache } from "@game";

/**
 * Inferno-only (14 October, the user's): an alliance's own crest, designed by its leader in the alliance's edit form
 * (AllianceFormPopup's Custom) in place of one of the preset shields, and shown wherever the alliance's shield is
 * (the alliance window, Browse, invites, the map's popups); not in chat. Free.
 *
 * A crest is seven numbers with dots between (the server's services/alliance/allianceCrest.ts checks them):
 * `shape.pattern.field.second.emblem.emblemColour.rim`. It is drawn here: the shape filled with the field colour,
 * the pattern in the second colour inside it, the emblem (art/crests/emblems.py -> alliances/emblems.png: a white
 * row the game tints, an outline row over it) in the middle, the rim round it.
 */
export class IoCrest extends ASObject {
    public static readonly SHAPES: string[] = ["Heater", "Round", "Kite", "Banner", "Badge", "Hexagon"];

    public static readonly PATTERNS: string[] = ["Plain", "Split", "Halves", "Quarters", "Band", "Chevron", "Cross", "Saltire", "Stripes", "Checks"];

    public static readonly COLOURS: int[] = [
        0x1E1A18, 0xF2EDE2, 0xB3151B, 0xE8541A, 0xE8B828, 0xD9C38A, 0x7CC242, 0x2E7D32,
        0x1F9E95, 0x3A8AE8, 0x1E3A8A, 0x7B3FB8, 0xC2338A, 0x7A4A24, 0x8A8A8A, 0x4A1F3E,
    ];

    /** The emblems in the sheet's order (0 is none). */
    public static readonly EMBLEMS: string[] = [
        "None", "Skull", "Flame", "Horns", "Pitchfork", "Serpent", "Crown", "Sword", "Swords", "Eye", "Bat", "Claws", "Star",
        "Moon", "Sun", "Wing", "Fangs", "Axe", "Crossbones", "Lightning", "Heart", "Tower", "Imp", "Gem", "Spider",
    ];

    /** [name, colour, dark edge, sheen] */
    public static readonly RIMS: any[] = [
        ["Iron", 0x6E6E74, 0x232327, 0xBFC3C8], ["Silver", 0xC9CED4, 0x43474D, 0xFFFFFF],
        ["Gold", 0xE0B03A, 0x5E400C, 0xFFF0A8], ["Ember", 0xC0391B, 0x3E0C06, 0xFFB060],
    ];

    /** How many of each part (the server's CREST_LIMITS). */
    public static readonly LIMITS: int[] = [6, 10, 16, 16, 25, 16, 4];

    /** A new design's start: a heater split crimson and black, a gold skull, a gold rim. */
    public static readonly DEFAULT: string = "0.1.2.0.1.4.2";

    public static readonly CELL: int = 96;

    private static _sheet: BitmapData = null;

    private static _loading: boolean = false;

    private static _waiting: any[] = [];

    private static _made: any = {};

    /** The seven numbers, or null when it is not a crest (none set, or malformed). */
    public static parse(spec: any): int[] {
        if (spec == null || !GLOBAL.INFERNO_ONLY) {
            return null;
        }
        let parts: string[] = String(spec).split(".");
        if (parts.length != IoCrest.LIMITS.length) {
            return null;
        }
        let out: int[] = [];
        for (let i: int = 0; i < parts.length; i++) {
            if (!/^\d{1,2}$/.test(parts[i])) {
                return null;
            }
            let n: int = parseInt(parts[i], 10) | 0;
            if (n >= IoCrest.LIMITS[i]) {
                return null;
            }
            out.push(n);
        }
        return out;
    }

    public static has(spec: any): boolean {
        return IoCrest.parse(spec) != null;
    }

    public static spec(parts: int[]): string {
        return parts.join(".");
    }

    private static withSheet(fn: Function): void {
        if (IoCrest._sheet) {
            fn();
            return;
        }
        IoCrest._waiting.push(fn);
        if (IoCrest._loading) {
            return;
        }
        IoCrest._loading = true;
        ImageCache.GetImageWithCallBack("alliances/emblems.png", (key: string, bmd: BitmapData): void => {
            IoCrest._loading = false;
            IoCrest._sheet = bmd && bmd.width > 0 ? bmd : new BitmapData(IoCrest.CELL * 24, IoCrest.CELL * 2, true, 0);
            let waiting: any[] = IoCrest._waiting;
            IoCrest._waiting = [];
            for (let w of waiting) {
                try {
                    w();
                } catch (e) {
                }
            }
        });
    }

    /**
     * The crest drawn `size` across (kept, one for each design and size), to `done(bmd)`: at once when the emblems
     * are loaded, else when they are. Nothing for a spec that is not a crest.
     */
    public static bitmap(spec: string, size: int, done: Function): void {
        let p: int[] = IoCrest.parse(spec);
        if (!p || size <= 0) {
            return;
        }
        let key: string = IoCrest.spec(p) + "@" + size;
        if (IoCrest._made[key]) {
            done(IoCrest._made[key]);
            return;
        }
        IoCrest.withSheet((): void => {
            if (!IoCrest._made[key]) {
                IoCrest._made[key] = IoCrest.render(p, size);
            }
            done(IoCrest._made[key]);
        });
    }

    /**
     * Puts the crest into a container, fitted into the square `size` at (x, y), under what is there already when
     * `under`. False (nothing done) when the spec is not a crest: the caller draws its preset shield.
     */
    public static fit(container: DisplayObjectContainer, spec: any, size: int, x: number = 0, y: number = 0, under: boolean = false): boolean {
        if (!IoCrest.has(spec) || !container) {
            return false;
        }
        IoCrest.bitmap(String(spec), size, (bmd: BitmapData): void => {
            // (one crest a container: a redrawn one replaces the one before)
            for (let i: int = container.numChildren - 1; i >= 0; i--) {
                if (container.getChildAt(i).name == "ioCrest") {
                    container.removeChildAt(i);
                }
            }
            let bm: Bitmap = new Bitmap(bmd);
            bm.name = "ioCrest";
            bm.smoothing = true;
            bm.x = x;
            bm.y = y;
            if (under) {
                container.addChildAt(bm, 0);
            } else {
                container.addChild(bm);
            }
        });
        return true;
    }

    // ---- drawing

    /** The shape's outline in a box R across (5% in from each side). */
    private static outline(g: Graphics, shape: int, R: number): void {
        let P = (v: number): number => R * (0.05 + v * 0.9);
        switch (shape) {
            case 1:
                g.drawCircle(P(0.5), P(0.5), R * 0.9 * 0.48);
                break;
            case 2:
                g.moveTo(P(0.5), P(0.02));
                g.cubicCurveTo(P(0.78), P(0.03), P(0.96), P(0.18), P(0.96), P(0.38));
                g.cubicCurveTo(P(0.94), P(0.64), P(0.68), P(0.86), P(0.5), P(0.99));
                g.cubicCurveTo(P(0.32), P(0.86), P(0.06), P(0.64), P(0.04), P(0.38));
                g.cubicCurveTo(P(0.04), P(0.18), P(0.22), P(0.03), P(0.5), P(0.02));
                break;
            case 3:
                g.moveTo(P(0.1), P(0.02));
                g.lineTo(P(0.9), P(0.02));
                g.lineTo(P(0.9), P(0.98));
                g.lineTo(P(0.5), P(0.78));
                g.lineTo(P(0.1), P(0.98));
                g.lineTo(P(0.1), P(0.02));
                break;
            case 4:
                g.drawRoundRect(P(0.04), P(0.04), R * 0.9 * 0.92, R * 0.9 * 0.92, R * 0.9 * 0.36, R * 0.9 * 0.36);
                break;
            case 5:
                for (let i: int = 0; i <= 6; i++) {
                    let a: number = Math.PI / 2 + (i % 6) * Math.PI / 3;
                    let px: number = P(0.5 + Math.cos(a) * 0.5);
                    let py: number = P(0.5 + Math.sin(a) * 0.5);
                    if (i == 0) {
                        g.moveTo(px, py);
                    } else {
                        g.lineTo(px, py);
                    }
                }
                break;
            default:
                // the heater: flat across the top, curving to a point
                g.moveTo(P(0.04), P(0.03));
                g.lineTo(P(0.96), P(0.03));
                g.lineTo(P(0.96), P(0.42));
                g.cubicCurveTo(P(0.96), P(0.72), P(0.7), P(0.88), P(0.5), P(0.99));
                g.cubicCurveTo(P(0.3), P(0.88), P(0.04), P(0.72), P(0.04), P(0.42));
                g.lineTo(P(0.04), P(0.03));
                break;
        }
    }

    private static poly(g: Graphics, R: number, pts: number[]): void {
        g.moveTo(pts[0] * R, pts[1] * R);
        for (let i: int = 2; i < pts.length; i += 2) {
            g.lineTo(pts[i] * R, pts[i + 1] * R);
        }
        g.lineTo(pts[0] * R, pts[1] * R);
    }

    /** The pattern in the second colour, over the whole box (cut to the shape after). */
    private static pattern(g: Graphics, pattern: int, R: number, colour: int): void {
        let piece = (pts: number[]): void => {
            g.beginFill(colour, 1);
            IoCrest.poly(g, R, pts);
            g.endFill();
        };
        let rect = (x: number, y: number, w: number, h: number): void => {
            g.beginFill(colour, 1);
            g.drawRect(x * R, y * R, w * R, h * R);
            g.endFill();
        };
        switch (pattern) {
            case 1:
                rect(0.5, 0, 0.5, 1);
                break;
            case 2:
                rect(0, 0.5, 1, 0.5);
                break;
            case 3:
                rect(0.5, 0, 0.5, 0.5);
                rect(0, 0.5, 0.5, 0.5);
                break;
            case 4:
                piece([-0.1, 0.12, 0.12, -0.1, 1.1, 0.88, 0.88, 1.1]);
                break;
            case 5:
                piece([0, 0.62, 0.5, 0.26, 1, 0.62, 1, 0.88, 0.5, 0.52, 0, 0.88]);
                break;
            case 6:
                rect(0.4, 0, 0.2, 1);
                rect(0, 0.36, 1, 0.2);
                break;
            case 7:
                piece([-0.1, 0.06, 0.06, -0.1, 1.1, 0.94, 0.94, 1.1]);
                piece([0.94, -0.1, 1.1, 0.06, 0.06, 1.1, -0.1, 0.94]);
                break;
            case 8:
                rect(0.2, 0, 0.2, 1);
                rect(0.6, 0, 0.2, 1);
                break;
            case 9:
                for (let i: int = 0; i < 5; i++) {
                    for (let j: int = 0; j < 5; j++) {
                        if ((i + j) % 2 == 1) {
                            rect(i * 0.2, j * 0.2, 0.2, 0.2);
                        }
                    }
                }
                break;
            default:
                break;
        }
    }

    /** A picture made smaller smoothly, halving first so a big shrink keeps its lines. */
    private static shrink(src: BitmapData, w: int): BitmapData {
        let cur: BitmapData = src;
        while (cur.width / 2 >= w && cur.width >= 4) {
            let half: BitmapData = new BitmapData(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2), true, 0);
            let m: Matrix = new Matrix();
            m.scale(0.5, 0.5);
            half.draw(cur, m, null, null, null, true);
            cur = half;
        }
        if (cur.width != w) {
            let out: BitmapData = new BitmapData(w, Math.max(1, Math.round(cur.height * w / cur.width)), true, 0);
            let m2: Matrix = new Matrix();
            m2.scale(w / cur.width, w / cur.width);
            out.draw(cur, m2, null, null, null, true);
            cur = out;
        }
        return cur;
    }

    private static render(p: int[], size: int): BitmapData {
        let shape: int = p[0], pat: int = p[1], field: int = IoCrest.COLOURS[p[2]], second: int = IoCrest.COLOURS[p[3]];
        let emblem: int = p[4], ecol: int = IoCrest.COLOURS[p[5]];
        let rim: any[] = as3.cast(IoCrest.RIMS[p[6]], Array);
        // (drawn at twice the size, then made smaller: smooth edges)
        let R: int = Math.max(48, size * 2) | 0;
        let mask: BitmapData = new BitmapData(R, R, true, 0);
        let ms: Shape = new Shape();
        ms.graphics.beginFill(0xFFFFFF, 1);
        IoCrest.outline(ms.graphics, shape, R);
        ms.graphics.endFill();
        mask.draw(ms, null, null, null, null, true);
        let fill: BitmapData = new BitmapData(R, R, true, 0xFF000000 | field);
        let ps: Shape = new Shape();
        IoCrest.pattern(ps.graphics, pat, R, second);
        fill.draw(ps, null, null, null, null, true);
        let big: BitmapData = new BitmapData(R, R, true, 0);
        big.copyPixels(fill, fill.rect, new Point(0, 0), mask, new Point(0, 0), true);
        // the emblem, in the middle (a little high in a pointed shape)
        if (emblem > 0 && IoCrest._sheet) {
            let ew: int = Math.round(R * (shape == 1 || shape == 4 || shape == 5 ? 0.6 : 0.56)) | 0;
            let cy: number = R * (shape == 0 || shape == 2 ? 0.45 : shape == 3 ? 0.42 : 0.5);
            let at: Point = new Point(Math.round((R - ew) / 2), Math.round(cy - ew / 2));
            for (let row: int = 0; row < 2; row++) {
                let cell: BitmapData = new BitmapData(IoCrest.CELL, IoCrest.CELL, true, 0);
                cell.copyPixels(IoCrest._sheet, new Rectangle((emblem - 1) * IoCrest.CELL, row * IoCrest.CELL, IoCrest.CELL, IoCrest.CELL), new Point(0, 0));
                let small: BitmapData = IoCrest.shrink(cell, ew);
                if (row == 0) {
                    small.colorTransform(small.rect, new ColorTransform(((ecol >> 16) & 255) / 255, ((ecol >> 8) & 255) / 255, (ecol & 255) / 255, 1, 0, 0, 0, 0));
                }
                big.copyPixels(small, small.rect, at, null, null, true);
            }
        }
        // the rim: a dark edge, the metal, a sheen
        let w: number = Math.max(2, R * 0.06);
        let rs: Shape = new Shape();
        let strokes: any[] = [[w * 1.6, rim[2], 1], [w, rim[1], 1], [Math.max(1, w * 0.28), rim[3], 0.55]];
        for (let s of strokes) {
            rs.graphics.lineStyle(Number(s[0]), s[1] | 0, Number(s[2]), false, "normal", null, "round");
            IoCrest.outline(rs.graphics, shape, R);
        }
        rs.graphics.lineStyle();
        big.draw(rs, null, null, null, null, true);
        return IoCrest.shrink(big, size);
    }
}
