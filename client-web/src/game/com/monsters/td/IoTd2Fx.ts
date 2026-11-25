import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Shape, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { BFOUNDATION, GLOBAL, IoTd, IoTd2, MAP, MonsterBase, TweenLite } from "@game";

/**
 * Inferno-only (Hellgate Defense 2, IoTd2): what it draws on the arena, over the yard's own pictures (in MAP's
 * fireball layer, in the yard's isometric points): the Hellforged towers' shots (venom bolts, gargoyle darts,
 * boulders thrown in an arc), pulses (the Chillstone Obelisk's frost, the War Drum's beat), meteors and their
 * blasts, a flash over the screen for a spell; and every few frames the monsters' marks: a coloured pip for each
 * elite trait, a frost, venom or fire mark, a burning ring under a boss (red and wider under the Warden), and the
 * range of the tower whose panel is open.
 *
 * A grid circle of radius r is an ellipse r x 1.41 wide and half that high in the yard's view (GRID.ToISO).
 */
export class IoTd2Fx extends ASObject {
    private static _layer: Sprite = null;

    private static _marks: Shape = null;

    private static _live: int = 0;

    private static readonly MAX_LIVE: int = 90;

    public static Setup(): void {
        IoTd2Fx.Cleanup();
        let parent: Sprite = MAP._FIREBALLS ? MAP._FIREBALLS : MAP._BUILDINGTOPS;
        if (!parent) {
            return;
        }
        IoTd2Fx._layer = new Sprite();
        IoTd2Fx._layer.name = "td2Fx";
        IoTd2Fx._layer.mouseEnabled = false;
        IoTd2Fx._layer.mouseChildren = false;
        parent.addChild(IoTd2Fx._layer);
        IoTd2Fx._marks = new Shape();
        IoTd2Fx._layer.addChild(IoTd2Fx._marks);
        IoTd2Fx._live = 0;
    }

    public static Cleanup(): void {
        if (IoTd2Fx._layer && IoTd2Fx._layer.parent) {
            IoTd2Fx._layer.parent.removeChild(IoTd2Fx._layer);
        }
        IoTd2Fx._layer = null;
        IoTd2Fx._marks = null;
        IoTd2Fx._live = 0;
    }

    private static ellipse(g: any, at: Point, r: number): void {
        g.drawEllipse(at.x - r * 1.41, at.y - r * 0.705, r * 2.82, r * 1.41);
    }

    private static add(s: Shape, seconds: number, props: any): boolean {
        if (!IoTd2Fx._layer || IoTd2Fx._live >= IoTd2Fx.MAX_LIVE || !GLOBAL._render) {
            return false;
        }
        IoTd2Fx._layer.addChild(s);
        IoTd2Fx._live++;
        props.onComplete = (): void => {
            IoTd2Fx._live--;
            if (s.parent) {
                s.parent.removeChild(s);
            }
        };
        TweenLite.to(s, seconds, props);
        return true;
    }

    /** A pulse spreading out to `r` (grid units). */
    public static ring(at: Point, r: number, colour: int, seconds: number, alpha: number = 0.8): void {
        if (!at) {
            return;
        }
        let s: Shape = new Shape();
        s.graphics.lineStyle(3, colour, alpha);
        s.graphics.beginFill(colour, alpha * 0.18);
        IoTd2Fx.ellipse(s.graphics, new Point(0, 0), r);
        s.graphics.endFill();
        s.x = at.x;
        s.y = at.y;
        s.scaleX = s.scaleY = 0.25;
        IoTd2Fx.add(s, seconds, { "scaleX": 1, "scaleY": 1, "alpha": 0 });
    }

    /** A bolt from a tower to its target. */
    public static bolt(from: Point, to: Point, colour: int, width: number, seconds: number): void {
        if (!from || !to) {
            return;
        }
        let s: Shape = new Shape();
        s.graphics.lineStyle(width + 3, colour, 0.25);
        s.graphics.moveTo(from.x, from.y);
        s.graphics.lineTo(to.x, to.y - 12);
        s.graphics.lineStyle(width, colour, 1);
        s.graphics.moveTo(from.x, from.y);
        s.graphics.lineTo(to.x, to.y - 12);
        s.graphics.beginFill(colour, 0.9);
        s.graphics.drawCircle(to.x, to.y - 12, width + 2);
        s.graphics.endFill();
        s.filters = [new GlowFilter(colour, 0.8, 6, 6, 2)];
        IoTd2Fx.add(s, seconds, { "alpha": 0 });
    }

    /** A boulder thrown from a catapult, in an arc. */
    public static arc(from: Point, to: Point, seconds: number): void {
        if (!from || !to) {
            return;
        }
        let s: Shape = new Shape();
        s.graphics.lineStyle(1, 0x3A2A1A, 1);
        s.graphics.beginFill(0xE8DCC0, 1);
        s.graphics.drawCircle(0, 0, 6);
        s.graphics.endFill();
        s.graphics.beginFill(0x9A8A70, 1);
        s.graphics.drawCircle(-1.5, 1.5, 2.5);
        s.graphics.endFill();
        s.x = from.x;
        s.y = from.y;
        let o: any = { "t": 0 };
        if (!IoTd2Fx._layer || IoTd2Fx._live >= IoTd2Fx.MAX_LIVE || !GLOBAL._render) {
            return;
        }
        IoTd2Fx._layer.addChild(s);
        IoTd2Fx._live++;
        let peak: number = Math.max(60, Point.distance(from, to) * 0.45);
        TweenLite.to(o, Math.max(0.1, seconds), {
            "t": 1,
            "onUpdate": (): void => {
                let t: number = Number(o.t);
                s.x = from.x + (to.x - from.x) * t;
                s.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * peak;
                s.rotation = t * 540;
            },
            "onComplete": (): void => {
                IoTd2Fx._live--;
                if (s.parent) {
                    s.parent.removeChild(s);
                }
            },
        });
    }

    /** A meteor falling onto a spot. */
    public static meteor(at: Point, seconds: number): void {
        if (!at) {
            return;
        }
        let s: Shape = new Shape();
        s.graphics.beginFill(0xFF8A2A, 0.5);
        s.graphics.drawCircle(0, 0, 18);
        s.graphics.endFill();
        s.graphics.beginFill(0x3A1A0A, 1);
        s.graphics.drawCircle(0, 0, 11);
        s.graphics.endFill();
        s.graphics.beginFill(0xFFD24A, 1);
        s.graphics.drawCircle(-3, -3, 4);
        s.graphics.endFill();
        s.filters = [new GlowFilter(0xFF5A1A, 1, 18, 18, 3)];
        s.x = at.x + 220;
        s.y = at.y - 420;
        IoTd2Fx.add(s, Math.max(0.1, seconds), { "x": at.x, "y": at.y, "scaleX": 1.4, "scaleY": 1.4 });
        // where it will land
        let mark: Shape = new Shape();
        mark.graphics.lineStyle(2, 0xFF5A1A, 0.9);
        IoTd2Fx.ellipse(mark.graphics, new Point(0, 0), 85);
        mark.x = at.x;
        mark.y = at.y;
        IoTd2Fx.add(mark, Math.max(0.1, seconds), { "alpha": 0.2 });
    }

    /** Something landing: a blast of `r`. */
    public static blast(at: Point, r: number, colour: int): void {
        IoTd2Fx.ring(at, r, colour, 0.5, 0.9);
        let s: Shape = new Shape();
        s.graphics.beginFill(colour, 0.55);
        IoTd2Fx.ellipse(s.graphics, new Point(0, 0), r * 0.6);
        s.graphics.endFill();
        s.x = at.x;
        s.y = at.y;
        s.filters = [new GlowFilter(colour, 0.9, 12, 12, 2)];
        IoTd2Fx.add(s, 0.45, { "alpha": 0, "scaleX": 1.3, "scaleY": 1.3 });
    }

    /** The whole screen tinted for a moment (a spell). */
    public static flash(colour: int): void {
        let s: any = GLOBAL._SCREEN;
        if (!GLOBAL._layerTop || !s) {
            return;
        }
        let f: Sprite = new Sprite();
        f.mouseEnabled = false;
        f.graphics.beginFill(colour, 0.32);
        f.graphics.drawRect(Number(s.x), Number(s.y), Number(s.width), Number(s.height));
        f.graphics.endFill();
        GLOBAL._layerTop.addChild(f);
        TweenLite.to(f, 0.6, { "alpha": 0, "onComplete": (): void => {
            if (f.parent) {
                f.parent.removeChild(f);
            }
        } });
    }

    /** Every few frames: the monsters' marks, the bosses' rings, the open panel's tower's range. */
    public static frame(n: int): void {
        if (!IoTd2Fx._marks || n % 2 != 0) {
            return;
        }
        let g: any = IoTd2Fx._marks.graphics;
        g.clear();
        if (!GLOBAL._render) {
            return;
        }
        // keep the marks over the shots
        if (IoTd2Fx._layer && IoTd2Fx._layer.parent && IoTd2Fx._layer.parent.getChildIndex(IoTd2Fx._layer) < IoTd2Fx._layer.parent.numChildren - 1) {
            IoTd2Fx._layer.parent.setChildIndex(IoTd2Fx._layer, IoTd2Fx._layer.parent.numChildren - 1);
        }
        let pulse: number = 0.5 + 0.5 * Math.sin(n * 0.15);
        for (let k of (IoTd.creeps?.keys() ?? [])) {
            let c: MonsterBase = as3.as(k, MonsterBase);
            let info: any = IoTd.creeps.get(k);
            if (!c || !info || info.leaked || c.health <= 0 || c.dying || info.burns == null) {
                continue;
            }
            let p: Point = c._tmpPoint;
            if (info.boss) {
                let r: number = info.warden ? 34 : 24;
                g.lineStyle(info.warden ? 4 : 3, info.warden ? 0xFF2A1A : 0xFF8A2A, 0.55 + 0.35 * pulse);
                g.beginFill(info.warden ? 0xFF2A1A : 0xFF8A2A, 0.12 + 0.1 * pulse);
                IoTd2Fx.ellipse(g, p, r);
                g.endFill();
                if (info.stoneLeft > 0) {
                    g.lineStyle(4, 0xC8C8D0, 0.9);
                    IoTd2Fx.ellipse(g, p, r + 6);
                }
                if (info.invulnLeft > 0) {
                    g.lineStyle(3, 0xFFFFFF, 0.9);
                    g.drawCircle(p.x, p.y - 30, 28);
                }
            }
            let traits: any[] = as3.as(info.traits, Array);
            let x: number = p.x - (traits ? traits.length - 1 : 0) * 5;
            let y: number = p.y - (info.boss ? 64 : 40);
            if (traits) {
                for (let t of as3.values(traits)) {
                    g.lineStyle(1, 0x000000, 0.8);
                    g.beginFill(IoTd2.traitColor(String(t)), 1);
                    g.drawCircle(x, y, 4);
                    g.endFill();
                    x += 10;
                }
            }
            if (info.stunLeft > 0 && !info.warded) {
                g.lineStyle(2, 0xBFF4FF, 0.9);
                g.beginFill(0x8FE8FF, 0.35);
                IoTd2Fx.ellipse(g, p, 12);
                g.endFill();
            } else if (info.slowLeft > 0 && !info.warded) {
                g.lineStyle(2, 0x8FE8FF, 0.7);
                IoTd2Fx.ellipse(g, p, 10);
            }
            if (info.poison && info.poison.length) {
                g.lineStyle(0, 0, 0);
                g.beginFill(0x7CFF4A, 0.85);
                for (let i: int = 0; i < Math.min(5, info.poison.length); i++) {
                    g.drawCircle(p.x - 8 + i * 4, p.y - 26 - ((n + i * 7) % 12), 1.8);
                }
                g.endFill();
            }
            if (info.burns && info.burns.length) {
                g.lineStyle(0, 0, 0);
                g.beginFill(0xFF7A2A, 0.85);
                g.drawCircle(p.x + 6, p.y - 22 - (n % 10), 2.2);
                g.drawCircle(p.x - 5, p.y - 18 - ((n + 5) % 10), 1.8);
                g.endFill();
            }
            if (info.vulnLeft > 0) {
                g.lineStyle(2, 0xFF4A4A, 0.8);
                g.moveTo(p.x - 6, p.y - 34);
                g.lineTo(p.x + 6, p.y - 22);
                g.moveTo(p.x + 6, p.y - 34);
                g.lineTo(p.x - 6, p.y - 22);
            }
        }
        // the range of the tower whose panel is open
        let t: BFOUNDATION = IoTd2Fx.shown;
        if (t && t._mc && IoTd.towerInfo(t)) {
            let r: number = IoTd2.isCustom(t._type) ? IoTd2.reach(t, IoTd.towerInfo(t)) : Number(t._range);
            g.lineStyle(2, 0xFFD24A, 0.8);
            g.beginFill(0xFFD24A, 0.07);
            IoTd2Fx.ellipse(g, IoTd2.centerOf(t), r);
            g.endFill();
        }
    }

    /** The tower whose range is drawn (IoTdUi's panel). */
    public static shown: BFOUNDATION = null;
}
