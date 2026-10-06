import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, Graphics, Shape, Sprite } from "flash/display";
import { ImageCache } from "@game";

/**
 * Inferno-only: the quest book's pictures. "m:<monster id>" is the monster's own small portrait
 * (assets/monsters/<id>-small.png); every other name is a symbol drawn here on a 24-unit grid round the
 * middle, so the book needs no new art: tower, compound, egg, sword, wart, gift, map, chat, trophy, hall,
 * bolt, catapult, bone, coal, sulfur, magma, scroll, flask, dice, coin, lock, book, skull, shield, globe,
 * flag, eye, outpost, banner, mail, star, chest. An unknown name draws a star.
 */
export class IoQuestArt extends ASObject {
    public static readonly GOLD: uint = 16766346;

    public static readonly EMBER: uint = 16747050;

    public static readonly BONE: uint = 15260872;

    public static readonly DARK: uint = 2759190;

    public $ctor(): void {
        super.$ctor();
    }

    /** The picture for `icon`, `size` across, its middle at (0, 0). */
    public static glyph(icon: string, size: int, dim: boolean = false): Sprite {
        let s: Sprite = null;
        s = new Sprite();
        s.mouseEnabled = false;
        s.mouseChildren = false;
        if (icon && icon.indexOf("m:") == 0) {
            let id: string = icon.substr(2);
            ImageCache.GetImageWithCallBack("monsters/" + id + "-small.png", (k: string, bmd: BitmapData, args: any[] = null): void => {
                if (!bmd) {
                    return;
                }
                let b: Bitmap = new Bitmap(bmd);
                b.smoothing = true;
                let scale: number = Math.min(size / bmd.width, size / bmd.height);
                b.scaleX = b.scaleY = scale;
                b.x = -bmd.width * scale / 2;
                b.y = -bmd.height * scale / 2;
                s.addChild(b);
            });
            if (dim) {
                s.alpha = 0.45;
            }
            return s;
        }
        let shape: Shape = new Shape();
        IoQuestArt.draw(shape.graphics, icon, size / 24);
        s.addChild(shape);
        if (dim) {
            s.alpha = 0.4;
        }
        return s;
    }

    private static draw(g: Graphics, icon: string, u: number): void {
        let i: int = 0;
        let a: number = NaN;
        switch (icon) {
            case "tower":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(10128000, 1);
                g.drawRect(-5 * u, -6 * u, 10 * u, 16 * u);
                g.endFill();
                g.beginFill(12101784, 1);
                g.drawRect(-8 * u, -11 * u, 16 * u, 6 * u);
                g.endFill();
                g.beginFill(IoQuestArt.EMBER, 1);
                g.drawRect(-2 * u, -2 * u, 4 * u, 5 * u);
                g.endFill();
                break;
            case "hall":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(9058842, 1);
                g.moveTo(-11 * u, -2 * u);
                g.lineTo(0, -11 * u);
                g.lineTo(11 * u, -2 * u);
                g.lineTo(-11 * u, -2 * u);
                g.endFill();
                g.beginFill(12101784, 1);
                g.drawRect(-8 * u, -2 * u, 16 * u, 12 * u);
                g.endFill();
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawRect(-2.5 * u, 3 * u, 5 * u, 7 * u);
                g.endFill();
                break;
            case "compound":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(8018504, 1);
                g.drawRoundRect(-11 * u, -6 * u, 22 * u, 16 * u, 6 * u, 6 * u);
                g.endFill();
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawEllipse(-4 * u, -1 * u, 8 * u, 11 * u);
                g.endFill();
                g.beginFill(IoQuestArt.EMBER, 1);
                g.drawCircle(-6 * u, -9 * u, 2 * u);
                g.drawCircle(6 * u, -9 * u, 2 * u);
                g.endFill();
                break;
            case "egg":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawEllipse(-8 * u, -11 * u, 16 * u, 21 * u);
                g.endFill();
                g.lineStyle(1.5 * u, IoQuestArt.EMBER, 1);
                g.moveTo(-6 * u, 0);
                g.lineTo(-2 * u, -3 * u);
                g.lineTo(1 * u, 1 * u);
                g.lineTo(5 * u, -2 * u);
                break;
            case "sword":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(14209224, 1);
                g.moveTo(-9 * u, 9 * u);
                g.lineTo(6 * u, -6 * u);
                g.lineTo(10 * u, -10 * u);
                g.lineTo(6 * u, -9 * u);
                g.lineTo(-9 * u, 6 * u);
                g.lineTo(-9 * u, 9 * u);
                g.endFill();
                g.lineStyle(3 * u, IoQuestArt.EMBER, 1);
                g.moveTo(-8 * u, 2 * u);
                g.lineTo(-2 * u, 8 * u);
                break;
            case "wart":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(13123610, 1);
                g.drawEllipse(-10 * u, -9 * u, 20 * u, 12 * u);
                g.endFill();
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawRect(-3 * u, 2 * u, 6 * u, 8 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.GOLD, 1);
                g.drawCircle(-4 * u, -5 * u, 1.6 * u);
                g.drawCircle(3 * u, -6 * u, 1.3 * u);
                g.drawCircle(5 * u, -2 * u, 1.1 * u);
                g.endFill();
                break;
            case "gift":
            case "chest":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill((icon == "chest" ? 0x8A4A1A : 0xC8401A) >>> 0, 1);
                g.drawRect(-10 * u, -4 * u, 20 * u, 14 * u);
                g.endFill();
                g.beginFill((icon == "chest" ? 0xA85A22 : 0xE0602A) >>> 0, 1);
                if (icon == "chest") {
                    g.drawRoundRect(-10 * u, -10 * u, 20 * u, 7 * u, 8 * u, 8 * u);
                } else {
                    g.drawRect(-11 * u, -8 * u, 22 * u, 5 * u);
                }
                g.endFill();
                g.lineStyle(2.5 * u, IoQuestArt.GOLD, 1);
                g.moveTo(0, -10 * u);
                g.lineTo(0, 10 * u);
                if (icon == "chest") {
                    g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                    g.beginFill(IoQuestArt.GOLD, 1);
                    g.drawRect(-2.5 * u, -5 * u, 5 * u, 5 * u);
                    g.endFill();
                }
                break;
            case "map":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(14205080, 1);
                g.moveTo(-11 * u, -8 * u);
                g.lineTo(-4 * u, -10 * u);
                g.lineTo(4 * u, -8 * u);
                g.lineTo(11 * u, -10 * u);
                g.lineTo(11 * u, 8 * u);
                g.lineTo(4 * u, 10 * u);
                g.lineTo(-4 * u, 8 * u);
                g.lineTo(-11 * u, 10 * u);
                g.lineTo(-11 * u, -8 * u);
                g.endFill();
                g.lineStyle(2 * u, 13123610, 1);
                g.moveTo(-6 * u, -2 * u);
                g.lineTo(0, 3 * u);
                g.lineTo(6 * u, -3 * u);
                break;
            case "globe":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(3828362, 1);
                g.drawCircle(0, 0, 10 * u);
                g.endFill();
                g.lineStyle(1.2 * u, IoQuestArt.BONE, 0.8);
                g.drawEllipse(-4 * u, -10 * u, 8 * u, 20 * u);
                g.moveTo(-10 * u, 0);
                g.lineTo(10 * u, 0);
                g.moveTo(-8 * u, -5 * u);
                g.lineTo(8 * u, -5 * u);
                g.moveTo(-8 * u, 5 * u);
                g.lineTo(8 * u, 5 * u);
                break;
            case "chat":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawRoundRect(-11 * u, -9 * u, 22 * u, 14 * u, 8 * u, 8 * u);
                g.endFill();
                g.beginFill(IoQuestArt.BONE, 1);
                g.moveTo(-5 * u, 4 * u);
                g.lineTo(-7 * u, 10 * u);
                g.lineTo(1 * u, 4 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawCircle(-5 * u, -2 * u, 1.5 * u);
                g.drawCircle(0, -2 * u, 1.5 * u);
                g.drawCircle(5 * u, -2 * u, 1.5 * u);
                g.endFill();
                break;
            case "mail":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawRect(-11 * u, -7 * u, 22 * u, 15 * u);
                g.endFill();
                g.moveTo(-11 * u, -7 * u);
                g.lineTo(0, 2 * u);
                g.lineTo(11 * u, -7 * u);
                break;
            case "trophy":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.GOLD, 1);
                g.moveTo(-8 * u, -10 * u);
                g.lineTo(8 * u, -10 * u);
                g.curveTo(8 * u, 3 * u, 0, 3 * u);
                g.curveTo(-8 * u, 3 * u, -8 * u, -10 * u);
                g.endFill();
                g.beginFill(13146698, 1);
                g.drawRect(-2 * u, 3 * u, 4 * u, 4 * u);
                g.drawRect(-6 * u, 7 * u, 12 * u, 3 * u);
                g.endFill();
                break;
            case "bolt":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.GOLD, 1);
                g.moveTo(3 * u, -11 * u);
                g.lineTo(-7 * u, 2 * u);
                g.lineTo(-1 * u, 2 * u);
                g.lineTo(-4 * u, 11 * u);
                g.lineTo(7 * u, -3 * u);
                g.lineTo(1 * u, -3 * u);
                g.lineTo(3 * u, -11 * u);
                g.endFill();
                break;
            case "catapult":
                g.lineStyle(2 * u, 8014376, 1);
                g.moveTo(-10 * u, 8 * u);
                g.lineTo(10 * u, 8 * u);
                g.moveTo(-4 * u, 8 * u);
                g.lineTo(6 * u, -8 * u);
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.EMBER, 1);
                g.drawCircle(7 * u, -9 * u, 3 * u);
                g.endFill();
                g.beginFill(5913120, 1);
                g.drawCircle(-7 * u, 8 * u, 2.5 * u);
                g.drawCircle(7 * u, 8 * u, 2.5 * u);
                g.endFill();
                break;
            case "bone":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawRect(-7 * u, -2 * u, 14 * u, 4 * u);
                g.drawCircle(-8 * u, -3 * u, 3 * u);
                g.drawCircle(-8 * u, 3 * u, 3 * u);
                g.drawCircle(8 * u, -3 * u, 3 * u);
                g.drawCircle(8 * u, 3 * u, 3 * u);
                g.endFill();
                break;
            case "coal":
                g.lineStyle(1.5 * u, 5921370, 1);
                g.beginFill(2763310, 1);
                g.moveTo(-9 * u, 4 * u);
                g.lineTo(-6 * u, -6 * u);
                g.lineTo(2 * u, -9 * u);
                g.lineTo(9 * u, -3 * u);
                g.lineTo(8 * u, 6 * u);
                g.lineTo(-1 * u, 9 * u);
                g.lineTo(-9 * u, 4 * u);
                g.endFill();
                break;
            case "sulfur":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(15257664, 1);
                g.moveTo(0, -10 * u);
                g.lineTo(9 * u, -2 * u);
                g.lineTo(5 * u, 9 * u);
                g.lineTo(-5 * u, 9 * u);
                g.lineTo(-9 * u, -2 * u);
                g.lineTo(0, -10 * u);
                g.endFill();
                break;
            case "magma":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(14700572, 1);
                g.moveTo(0, -11 * u);
                g.curveTo(9 * u, 0, 7 * u, 5 * u);
                g.curveTo(4 * u, 11 * u, 0, 11 * u);
                g.curveTo(-4 * u, 11 * u, -7 * u, 5 * u);
                g.curveTo(-9 * u, 0, 0, -11 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.GOLD, 1);
                g.drawCircle(-2 * u, 4 * u, 3 * u);
                g.endFill();
                break;
            case "scroll":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(15259824, 1);
                g.drawRect(-8 * u, -9 * u, 16 * u, 18 * u);
                g.endFill();
                g.beginFill(13152392, 1);
                g.drawRoundRect(-10 * u, -11 * u, 20 * u, 4 * u, 4 * u, 4 * u);
                g.drawRoundRect(-10 * u, 7 * u, 20 * u, 4 * u, 4 * u, 4 * u);
                g.endFill();
                g.lineStyle(1 * u, 8018504, 1);
                for (i = 0; i < 3; i++) {
                    g.moveTo(-5 * u, (-4 + i * 4) * u);
                    g.lineTo(5 * u, (-4 + i * 4) * u);
                }
                break;
            case "flask":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(12116200, 0.6);
                g.moveTo(-3 * u, -11 * u);
                g.lineTo(3 * u, -11 * u);
                g.lineTo(3 * u, -4 * u);
                g.lineTo(10 * u, 9 * u);
                g.lineTo(-10 * u, 9 * u);
                g.lineTo(-3 * u, -4 * u);
                g.lineTo(-3 * u, -11 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.EMBER, 1);
                g.moveTo(-6 * u, 3 * u);
                g.lineTo(6 * u, 3 * u);
                g.lineTo(9 * u, 8 * u);
                g.lineTo(-9 * u, 8 * u);
                g.endFill();
                break;
            case "dice":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawRoundRect(-9 * u, -9 * u, 18 * u, 18 * u, 6 * u, 6 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(13123610, 1);
                g.drawCircle(-4 * u, -4 * u, 1.8 * u);
                g.drawCircle(0, 0, 1.8 * u);
                g.drawCircle(4 * u, 4 * u, 1.8 * u);
                g.endFill();
                break;
            case "coin":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.GOLD, 1);
                g.drawCircle(0, 0, 10 * u);
                g.endFill();
                g.lineStyle(1.5 * u, 13146698, 1);
                g.drawCircle(0, 0, 6.5 * u);
                break;
            case "lock":
                g.lineStyle(2.5 * u, 10128000, 1);
                g.moveTo(-5 * u, -2 * u);
                g.lineTo(-5 * u, -6 * u);
                g.curveTo(-5 * u, -11 * u, 0, -11 * u);
                g.curveTo(5 * u, -11 * u, 5 * u, -6 * u);
                g.lineTo(5 * u, -2 * u);
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(13146698, 1);
                g.drawRoundRect(-9 * u, -3 * u, 18 * u, 13 * u, 4 * u, 4 * u);
                g.endFill();
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawCircle(0, 3 * u, 2 * u);
                g.endFill();
                break;
            case "book":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(8006164, 1);
                g.drawRect(-9 * u, -10 * u, 18 * u, 20 * u);
                g.endFill();
                g.beginFill(15259824, 1);
                g.drawRect(-6 * u, -10 * u, 15 * u, 3 * u);
                g.endFill();
                g.lineStyle(2 * u, IoQuestArt.GOLD, 1);
                g.moveTo(-3 * u, -2 * u);
                g.lineTo(5 * u, -2 * u);
                g.moveTo(-3 * u, 2 * u);
                g.lineTo(5 * u, 2 * u);
                break;
            case "skull":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.drawCircle(0, -2 * u, 9 * u);
                g.drawRect(-5 * u, 4 * u, 10 * u, 6 * u);
                g.endFill();
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawCircle(-3.5 * u, -2 * u, 2.5 * u);
                g.drawCircle(3.5 * u, -2 * u, 2.5 * u);
                g.drawRect(-1 * u, 6 * u, 2 * u, 4 * u);
                g.endFill();
                break;
            case "shield":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(9058842, 1);
                g.moveTo(0, -11 * u);
                g.lineTo(9 * u, -7 * u);
                g.curveTo(9 * u, 7 * u, 0, 11 * u);
                g.curveTo(-9 * u, 7 * u, -9 * u, -7 * u);
                g.lineTo(0, -11 * u);
                g.endFill();
                g.lineStyle(2 * u, IoQuestArt.GOLD, 1);
                g.moveTo(0, -7 * u);
                g.lineTo(0, 7 * u);
                g.moveTo(-5 * u, -2 * u);
                g.lineTo(5 * u, -2 * u);
                break;
            case "flag":
            case "banner":
                g.lineStyle(2 * u, 5913120, 1);
                g.moveTo(-7 * u, -11 * u);
                g.lineTo(-7 * u, 11 * u);
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill((icon == "banner" ? 0x3A6AB0 : 0xC8401A) >>> 0, 1);
                if (icon == "banner") {
                    g.moveTo(-6 * u, -10 * u);
                    g.lineTo(9 * u, -10 * u);
                    g.lineTo(9 * u, 4 * u);
                    g.lineTo(1.5 * u, 0);
                    g.lineTo(-6 * u, 4 * u);
                    g.lineTo(-6 * u, -10 * u);
                } else {
                    g.moveTo(-6 * u, -10 * u);
                    g.lineTo(9 * u, -6 * u);
                    g.lineTo(-6 * u, -1 * u);
                    g.lineTo(-6 * u, -10 * u);
                }
                g.endFill();
                break;
            case "eye":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.BONE, 1);
                g.moveTo(-11 * u, 0);
                g.curveTo(0, -11 * u, 11 * u, 0);
                g.curveTo(0, 11 * u, -11 * u, 0);
                g.endFill();
                g.beginFill(IoQuestArt.EMBER, 1);
                g.drawCircle(0, 0, 4.5 * u);
                g.endFill();
                g.beginFill(IoQuestArt.DARK, 1);
                g.drawCircle(0, 0, 2 * u);
                g.endFill();
                break;
            case "outpost":
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(6969936, 1);
                g.drawRect(-10 * u, -2 * u, 20 * u, 11 * u);
                g.endFill();
                g.beginFill(9075312, 1);
                for (i = 0; i < 3; i++) {
                    g.drawRect((-10 + i * 7.5) * u, -6 * u, 5 * u, 4 * u);
                }
                g.endFill();
                g.lineStyle(1.5 * u, 5913120, 1);
                g.moveTo(0, -6 * u);
                g.lineTo(0, -12 * u);
                g.lineStyle(0, 0, 0);
                g.beginFill(IoQuestArt.EMBER, 1);
                g.moveTo(0, -12 * u);
                g.lineTo(7 * u, -10 * u);
                g.lineTo(0, -8 * u);
                g.endFill();
                break;
            default:
                // a star (also "star")
                g.lineStyle(1.5 * u, IoQuestArt.DARK, 1);
                g.beginFill(IoQuestArt.GOLD, 1);
                for (i = 0; i <= 10; i++) {
                    a = -Math.PI / 2 + i * Math.PI / 5;
                    let r: number = (i % 2 == 0 ? 11 : 4.6) * u;
                    if (i == 0) {
                        g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                    } else {
                        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                }
                g.endFill();
                break;
        }
    }

    /** A tick, for a collected quest's badge. */
    public static tick(size: int): Shape {
        let s: Shape = new Shape();
        let u: number = size / 24;
        s.graphics.lineStyle(0, 0, 0);
        s.graphics.beginFill(3840586, 1);
        s.graphics.drawCircle(0, 0, 11 * u);
        s.graphics.endFill();
        s.graphics.lineStyle(3 * u, 16777215, 1);
        s.graphics.moveTo(-5 * u, 0);
        s.graphics.lineTo(-1 * u, 5 * u);
        s.graphics.lineTo(6 * u, -5 * u);
        return s;
    }

    /** A small padlock, for a quest not open yet. */
    public static padlock(size: int): Sprite {
        return IoQuestArt.glyph("lock", size);
    }
}
