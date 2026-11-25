import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, Graphics, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { ColorTransform, Matrix, Point, Rectangle } from "flash/geom";
import { TextField } from "flash/text";
import { ImageCache, ImageText, SOUNDS, ScaleBitmap } from "@game";

/**
 * Inferno-only (16 October, the user's: "make the buttons in the bottom right match the original style of the
 * game", in other players' yards and attacks): the build bar's look (UI_MENU, StoneButton) at any width: its stone
 * plate (ui/stonemenu2.png) and its lava-rock buttons (ui/lava1-3.png) with the game's bubble lettering (ImageText).
 * StoneButton is as wide as its words; these are as wide as asked, so a row of them fills its plate or card.
 */
export class IoStone extends ASObject {
    /** The lava faces StoneButton chooses from, by how near their width is (as StoneButton._bgKeysInferno). */
    private static readonly FACES: any[] = [{ "key": "ui/lava1.png", "width": 81 }, { "key": "ui/lava2.png", "width": 61 }, { "key": "ui/lava3.png", "width": 53 }];

    /** A button's height, the build bar's (StoneButton). */
    public static readonly H: int = 36;

    /** The plate's height, the build bar's (UI_MENU's stonemenu2: 54). */
    public static readonly PLATE_H: int = 54;

    /** The room each side of a button's words (StoneButton's margin is 12; 10 lets a row of four fit a card). */
    public static readonly MARGIN: int = 10;

    public $ctor(): void {
        super.$ctor();
    }

    /** How wide a button with these words is at this size (the words and the margins). */
    public static widthOf(label: string, size: int): int {
        let t: BitmapData = ImageText.Get(label, size);
        return ((t ? t.width : label.length * size * 0.6) + IoStone.MARGIN * 2) | 0;
    }

    /**
     * A row of buttons' widths to fill `room` with `gap` between them: the build bar's size of words (12), smaller
     * (11, 10) when they don't fit at it; the room left over shared out by their widths. { size, widths }.
     */
    public static fitRow(labels: any[], room: number, gap: number): any {
        let size: int = 12;
        let natural: any[] = [];
        let sum: number = 0;
        for (size = 12; size >= 10; size--) {
            natural = labels.map((l: any): int => IoStone.widthOf(String(l), size));
            sum = 0;
            for (let w of natural) {
                sum += Number(w);
            }
            if (sum + gap * (labels.length - 1) <= room) {
                break;
            }
        }
        size = Math.max(10, size) | 0;
        let spare: number = room - gap * (labels.length - 1) - sum;
        let widths: any[] = [];
        let used: number = 0;
        for (let i: int = 0; i < natural.length; i++) {
            let w: int = i == natural.length - 1 ? (room - gap * (labels.length - 1) - used) | 0 : Math.floor(Number(natural[i]) + spare * Number(natural[i]) / Math.max(1, sum)) | 0;
            widths.push(w);
            used += w;
        }
        return { "size": size, "widths": widths };
    }

    /** The build bar's stone plate, w x h (drawn when its picture is in). */
    public static plate(w: number, h: number = 54): Sprite {
        let p: Sprite = new Sprite();
        p.mouseEnabled = false;
        p.mouseChildren = false;
        ImageCache.GetImageWithCallBack("ui/stonemenu2.png", (key: string, bmd: BitmapData): void => {
            if (!bmd) {
                return;
            }
            let s: ScaleBitmap = new ScaleBitmap(bmd.clone());
            s.scale9Grid = new Rectangle(15, 15, 10, 10);
            s.setSize(w, h);
            p.addChild(s);
        });
        return p;
    }

    /**
     * A lava-rock button w wide (the build bar's), its words in the game's lettering at `size`. setEnabled(on) (half
     * seen when off, as StoneButton), setText(words), setGlow(on) (gold round it: the button to press now).
     */
    public static button(label: string, w: int, size: int, onClick: Function): Sprite {
        let b: any = new Sprite();
        let enabled: boolean = true;
        let words: string = label;
        let face: Bitmap = null;
        let ask: int = 0;
        b.buttonMode = true;
        b.useHandCursor = true;
        b.mouseChildren = false;
        // (clickable before the picture is in)
        b.graphics.beginFill(0, 0);
        b.graphics.drawRect(0, 0, w, IoStone.H);
        b.graphics.endFill();
        // (its words as text too, unseen: the lettering is a picture; what reads the screen reads these)
        let said: TextField = new TextField();
        said.name = "ioStoneText";
        said.text = label;
        said.width = w;
        said.height = IoStone.H;
        said.alpha = 0;
        said.mouseEnabled = false;
        said.selectable = false;
        b.addChild(said);
        let pick: any = IoStone.FACES[0];
        for (let f of IoStone.FACES) {
            if (Math.abs(w - Number(f.width)) < Math.abs(w - Number(pick.width))) {
                pick = f;
            }
        }
        let draw = (): void => {
            let mine: int = ++ask;
            ImageCache.GetImageWithCallBack(String(pick.key), (key: string, bmd: BitmapData): void => {
                if (!bmd || mine != ask) {
                    return;
                }
                let copy: BitmapData = new BitmapData(bmd.width, bmd.height, true, 0);
                copy.copyPixels(bmd, new Rectangle(0, 0, bmd.width, bmd.height), new Point(0, 0));
                let s: ScaleBitmap = new ScaleBitmap(copy);
                s.scale9Grid = new Rectangle(10, 10, 10, 10);
                s.setSize(w, IoStone.H);
                let out: BitmapData = new BitmapData(w, IoStone.H, true, 0);
                out.draw(as3.cast(s, IBitmapDrawable));
                let tx: BitmapData = ImageText.Get(words, size);
                if (tx) {
                    if (!enabled) {
                        tx.colorTransform(tx.rect, new ColorTransform(1, 1, 1, 0.5));
                    }
                    let m: Matrix = new Matrix();
                    m.translate(Math.round((w - tx.width) / 2), 2 + Math.round(IoStone.H / 2 - tx.height / 2));
                    out.draw(as3.cast(tx, IBitmapDrawable), m);
                }
                if (face) {
                    b.removeChild(face);
                    face.bitmapData.dispose();
                }
                face = new Bitmap(out);
                b.addChildAt(face, 0);
            });
        };
        draw();
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            if (enabled) {
                SOUNDS.Play("click1");
                onClick(e);
            }
        });
        // (pressing it is not the start of a drag of the yard)
        b.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        b.setEnabled = (on: boolean): void => {
            if (on != enabled) {
                enabled = on;
                b.buttonMode = on;
                b.useHandCursor = on;
                draw();
            }
        };
        b.setText = (value: string): void => {
            if (value != words) {
                words = value;
                said.text = value;
                draw();
            }
        };
        b.setGlow = (on: boolean): void => {
            b.filters = on ? [new GlowFilter(0xFFD040, 0.95, 10, 10, 2.2)] : [];
        };
        b.label = (): string => words;
        return b;
    }

    /**
     * A lava-rock button w wide with an arrow drawn on it (dir -1 left, 1 right: the game's lettering has no arrows),
     * `said` its unseen words. As button(): setEnabled (the arrow half seen when off).
     */
    public static arrow(dir: int, w: int, said: string, onClick: Function): Sprite {
        let b: any = IoStone.button("", w, 12, onClick);
        let t: TextField = b.getChildByName("ioStoneText");
        if (t) {
            t.text = said;
        }
        let a: Shape = new Shape();
        a.name = "ioStoneArrow";
        let g: Graphics = a.graphics;
        g.lineStyle(2, 0x3A0A02, 1, true);
        g.beginFill(0xFFF6E2, 1);
        g.moveTo(dir * 7, 0);
        g.lineTo(-dir * 6, -8);
        g.lineTo(-dir * 6, 8);
        g.lineTo(dir * 7, 0);
        g.endFill();
        a.x = Math.round(w / 2);
        a.y = Math.round(IoStone.H / 2) + 1;
        b.addChild(a);
        let setEnabled: Function = b.setEnabled;
        b.setEnabled = (on: boolean): void => {
            setEnabled(on);
            a.alpha = on ? 1 : 0.45;
        };
        return b;
    }
}
