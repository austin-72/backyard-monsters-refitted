import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Shape } from "flash/display";
import { Matrix, Point } from "flash/geom";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { BYMConfig, MAP, RasterData } from "@game";

/**
 * Inferno-only (10 October): the little pictures pets and workers make in the yard when the player plays with
 * them (IoPet, IoWorkerFun): hearts, sleep's Zs, sparkles, a word, and the bone a pet fetches. Each is a bitmap
 * drawn by the yard's renderer (a RasterData, like a worker), at a point of the map's building layer; most
 * float up and fade. Just for looks: nothing is saved.
 */
export class IoYardFx extends ASObject {
    /** What is showing: { bmd, raster, pt, bm, x, y, vy, life, age, fade, depth, hold }. */
    private static _fx: any[] = [];

    private static _art: any = {};

    public $ctor(): void {
        super.$ctor();
    }

    // ---- the pictures (drawn once)
    /** A small red heart. */
    public static heartArt(): BitmapData {
        if (!IoYardFx._art.heart) {
            let s: Shape = new Shape();
            s.graphics.lineStyle(1.5, 0x5A0A14, 1, true);
            s.graphics.beginFill(0xFF3B5C);
            s.graphics.moveTo(8, 14);
            s.graphics.curveTo(0, 8, 1.5, 4);
            s.graphics.curveTo(3.5, 0, 8, 4);
            s.graphics.curveTo(12.5, 0, 14.5, 4);
            s.graphics.curveTo(16, 8, 8, 14);
            s.graphics.endFill();
            s.graphics.lineStyle();
            s.graphics.beginFill(0xFFFFFF, 0.6);
            s.graphics.drawCircle(5, 5, 1.6);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(17, 16, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), new Matrix(1, 0, 0, 1, 0.5, 0.5), null, null, null, true);
            IoYardFx._art.heart = b;
        }
        return as3.cast(IoYardFx._art.heart, BitmapData);
    }

    /** A bone, for fetch. */
    public static boneArt(): BitmapData {
        if (!IoYardFx._art.bone) {
            let s: Shape = new Shape();
            s.graphics.lineStyle(1, 0x5E4A30, 1, true);
            s.graphics.beginFill(0xF2E8CF);
            s.graphics.drawCircle(3, 3, 2.6);
            s.graphics.drawCircle(3, 7, 2.6);
            s.graphics.drawCircle(15, 3, 2.6);
            s.graphics.drawCircle(15, 7, 2.6);
            s.graphics.endFill();
            s.graphics.lineStyle();
            s.graphics.beginFill(0xF2E8CF);
            s.graphics.drawRect(3, 3, 12, 4);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(19, 11, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), new Matrix(1, 0, 0, 1, 0.5, 0.5), null, null, null, true);
            IoYardFx._art.bone = b;
        }
        return as3.cast(IoYardFx._art.bone, BitmapData);
    }

    /** A four-pointed sparkle. */
    public static sparkleArt(): BitmapData {
        if (!IoYardFx._art.sparkle) {
            let s: Shape = new Shape();
            s.graphics.beginFill(0xFFE27A);
            s.graphics.moveTo(7, 0);
            s.graphics.curveTo(8, 6, 14, 7);
            s.graphics.curveTo(8, 8, 7, 14);
            s.graphics.curveTo(6, 8, 0, 7);
            s.graphics.curveTo(6, 6, 7, 0);
            s.graphics.endFill();
            s.graphics.beginFill(0xFFFFFF);
            s.graphics.drawCircle(7, 7, 1.5);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(15, 15, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), null, null, null, null, true);
            IoYardFx._art.sparkle = b;
        }
        return as3.cast(IoYardFx._art.sparkle, BitmapData);
    }

    /** A word in white with a dark edge (Zz, !, ?, a worker's "Hup!"). */
    public static wordArt(text: string, size: int = 11, color: uint = 0xFFFFFF): BitmapData {
        let key: string = "w:" + text + ":" + size + ":" + color;
        if (!IoYardFx._art[key]) {
            let front: TextField = new TextField();
            front.defaultTextFormat = new TextFormat("Verdana", size, color, true);
            front.autoSize = TextFieldAutoSize.LEFT;
            front.text = text;
            let back: TextField = new TextField();
            back.defaultTextFormat = new TextFormat("Verdana", size, 0x1A0A04, true);
            back.autoSize = TextFieldAutoSize.LEFT;
            back.text = text;
            let b: BitmapData = new BitmapData((Math.ceil(front.textWidth) + 8) | 0, (Math.ceil(front.textHeight) + 6) | 0, true, 0);
            for (let ox: int = -1; ox <= 1; ox++) {
                for (let oy: int = -1; oy <= 1; oy++) {
                    if (ox || oy) {
                        b.draw(as3.cast(back, IBitmapDrawable), new Matrix(1, 0, 0, 1, 2 + ox, 1 + oy));
                    }
                }
            }
            b.draw(as3.cast(front, IBitmapDrawable), new Matrix(1, 0, 0, 1, 2, 1));
            IoYardFx._art[key] = b;
        }
        return as3.cast(IoYardFx._art[key], BitmapData);
    }

    /** (27 November) A puff of dust or dirt: a soft brown cloud (a pet burrowing, stomping, landing). */
    public static dustArt(): BitmapData {
        if (!IoYardFx._art.dust) {
            let s: Shape = new Shape();
            s.graphics.beginFill(0x8A6A48, 0.55);
            s.graphics.drawEllipse(2, 3, 16, 9);
            s.graphics.endFill();
            s.graphics.beginFill(0xB08E68, 0.6);
            s.graphics.drawEllipse(6, 1, 10, 7);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(20, 13, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), null, null, null, null, true);
            IoYardFx._art.dust = b;
        }
        return as3.cast(IoYardFx._art.dust, BitmapData);
    }

    /** (27 November) An ember or a spark: a small glowing dot of this colour, white at its heart. */
    public static emberArt(color: uint): BitmapData {
        let key: string = "e:" + color;
        if (!IoYardFx._art[key]) {
            let s: Shape = new Shape();
            s.graphics.beginFill(color, 0.35);
            s.graphics.drawCircle(4, 4, 4);
            s.graphics.endFill();
            s.graphics.beginFill(color, 1);
            s.graphics.drawCircle(4, 4, 2.2);
            s.graphics.endFill();
            s.graphics.beginFill(0xFFFFF0, 1);
            s.graphics.drawCircle(4, 4, 1);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(9, 9, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), null, null, null, null, true);
            IoYardFx._art[key] = b;
        }
        return as3.cast(IoYardFx._art[key], BitmapData);
    }

    /** A puff of dust at the feet, drifting out to one side. */
    public static dust(x: number, y: number, depthY: number): any {
        let fx: any = IoYardFx.show(IoYardFx.dustArt(), x + (Math.random() - 0.5) * 16, y - 3 + (Math.random() - 0.5) * 4, depthY + 1, 26, -0.18);
        fx.vx = (Math.random() - 0.5) * 0.9;
        return fx;
    }

    /** An ember rising (and drifting a little). */
    public static ember(x: number, y: number, depthY: number, color: uint = 0xFF7A20): any {
        let fx: any = IoYardFx.show(IoYardFx.emberArt(color), x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 6, depthY, 30 + ((Math.random() * 14) | 0), -0.7 - Math.random() * 0.5);
        fx.vx = (Math.random() - 0.5) * 0.6;
        return fx;
    }

    /** (27 November) A puff of steam (a clockwork robot's chimney): a soft white cloud. */
    public static steamArt(): BitmapData {
        if (!IoYardFx._art.steam) {
            let s: Shape = new Shape();
            s.graphics.beginFill(0xF0F0F0, 0.55);
            s.graphics.drawCircle(7, 7, 6);
            s.graphics.endFill();
            s.graphics.beginFill(0xFFFFFF, 0.5);
            s.graphics.drawCircle(5, 5, 3.5);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(14, 14, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), null, null, null, null, true);
            IoYardFx._art.steam = b;
        }
        return as3.cast(IoYardFx._art.steam, BitmapData);
    }

    /** (27 November) A slug's trail: a flat glowing smear on the ground, of this colour. */
    public static trailArt(color: uint): BitmapData {
        let key: string = "t:" + color;
        if (!IoYardFx._art[key]) {
            let s: Shape = new Shape();
            s.graphics.beginFill(color, 0.25);
            s.graphics.drawEllipse(0, 0, 16, 7);
            s.graphics.endFill();
            s.graphics.beginFill(color, 0.45);
            s.graphics.drawEllipse(3, 1.5, 10, 4);
            s.graphics.endFill();
            let b: BitmapData = new BitmapData(16, 7, true, 0);
            b.draw(as3.cast(s, IBitmapDrawable), null, null, null, null, true);
            IoYardFx._art[key] = b;
        }
        return as3.cast(IoYardFx._art[key], BitmapData);
    }

    /** A puff of steam, rising and drifting. */
    public static steam(x: number, y: number, depthY: number): any {
        let fx: any = IoYardFx.show(IoYardFx.steamArt(), x, y, depthY + 2, 36, -0.6);
        fx.vx = (Math.random() - 0.3) * 0.4;
        return fx;
    }

    /** A slug's trail on the ground: it stays put (under everything standing there) and fades over two seconds. */
    public static trail(x: number, y: number, color: uint): any {
        let fx: any = IoYardFx.show(IoYardFx.trailArt(color), x, y - 2, y, 80, 0);
        fx.flat = true;
        IoYardFx.place(fx);
        return fx;
    }

    // ---- showing them
    /**
     * Shows a picture centred at (x, y) on the map's building layer, drawn over what stands at depthY there. It
     * rises vy a step and fades over its last third; life in steps (0: until it is taken away). Returns it, so
     * the caller can move it (move) or take it away (remove).
     */
    public static show(art: BitmapData, x: number, y: number, depthY: number, life: int = 40, vy: number = -0.6): any {
        let fx: any = { "bmd": art, "x": x, "y": y, "vy": vy, "life": life, "age": 0, "depthY": depthY, "raster": null, "pt": new Point(), "bm": null };
        if (BYMConfig.instance.RENDERER_ON) {
            fx.raster = new RasterData(as3.cast(art, IBitmapDrawable), fx.pt, int.MAX_VALUE);
        } else if (MAP._BUILDINGTOPS) {
            fx.bm = new Bitmap(art);
            MAP._BUILDINGTOPS.addChild(fx.bm);
        }
        IoYardFx._fx.push(fx);
        IoYardFx.place(fx);
        return fx;
    }

    public static heart(x: number, y: number, depthY: number): any {
        return IoYardFx.show(IoYardFx.heartArt(), x + (Math.random() - 0.5) * 10, y, depthY, 46, -0.55);
    }

    public static sparkle(x: number, y: number, depthY: number): any {
        return IoYardFx.show(IoYardFx.sparkleArt(), x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 12, depthY, 24, -0.3);
    }

    public static word(text: string, x: number, y: number, depthY: number, life: int = 50, color: uint = 0xFFFFFF): any {
        return IoYardFx.show(IoYardFx.wordArt(text, 11, color), x, y, depthY, life, -0.35);
    }

    /** Moves a picture shown with life 0 (a fetched bone carried along). */
    public static move(fx: any, x: number, y: number, depthY: number): void {
        if (!fx) {
            return;
        }
        fx.x = x;
        fx.y = y;
        fx.depthY = depthY;
        IoYardFx.place(fx);
    }

    public static remove(fx: any): void {
        if (!fx) {
            return;
        }
        let i: int = IoYardFx._fx.indexOf(fx);
        if (i >= 0) {
            IoYardFx._fx.splice(i, 1);
        }
        IoYardFx.drop(fx);
    }

    private static drop(fx: any): void {
        if (fx.raster) {
            fx.raster.clear();
            fx.raster = null;
        }
        if (fx.bm && fx.bm.parent) {
            fx.bm.parent.removeChild(fx.bm);
        }
        fx.bm = null;
    }

    private static place(fx: any): void {
        let b: BitmapData = as3.cast(fx.bmd, BitmapData);
        let left: number = fx.x - b.width / 2;
        let top: number = fx.y - b.height / 2;
        let a: number = 1;
        if (fx.life > 0 && fx.age > fx.life * 0.66) {
            a = Math.max(0, 1 - (fx.age - fx.life * 0.66) / (fx.life * 0.34));
        }
        if (fx.raster) {
            let offset: Point = MAP.instance.offset;
            fx.pt.x = (left - offset.x) | 0;
            fx.pt.y = (top - offset.y) | 0;
            // (a trail lies on the ground: with the shadows, under everything standing)
            fx.raster.depth = fx.flat ? MAP.DEPTH_SHADOW + 1 : (fx.depthY - offset.y) * 1000 + fx.x - offset.x + 5000;
            fx.raster.alpha = a;
        } else if (fx.bm) {
            fx.bm.x = left;
            fx.bm.y = top;
            fx.bm.alpha = a;
        }
    }

    /** Every game step (IoPets.Tick). */
    public static Tick(): void {
        if (!IoYardFx._fx.length) {
            return;
        }
        let keep: any[] = [];
        for (let fx of as3.values(IoYardFx._fx)) {
            fx.age++;
            if (fx.life > 0 && fx.age >= fx.life) {
                IoYardFx.drop(fx);
                continue;
            }
            if (fx.life > 0) {
                fx.y += fx.vy;
                if (fx.vx) {
                    fx.x += fx.vx;
                }
            }
            IoYardFx.place(fx);
            keep.push(fx);
        }
        IoYardFx._fx = keep;
    }

    /** The yard is going (IoPets.Clear). */
    public static Clear(): void {
        for (let fx of as3.values(IoYardFx._fx)) {
            IoYardFx.drop(fx);
        }
        IoYardFx._fx = [];
    }

    /** How many are showing (tests). */
    public static get count(): int {
        return IoYardFx._fx.length;
    }
}
