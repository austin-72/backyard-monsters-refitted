import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, Shape, Sprite } from "flash/display";
import { DropShadowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { CasinoUI, ImageCache } from "@game";

/**
 * Inferno-only (7 October): the Brimstone Pit's playing cards, for Cinderjack and Higher or Lower.
 * The faces are one sheet (casino/cards/cards.png, art/casino/cards.py): 13 columns (Ace, 2 ... 10, Jack, Queen,
 * King) by 4 rows (the suits: Skulls, Flames, Horns, Bones), each card CW x CH; the back is casino/cards/back.png.
 * Until they have loaded a card is drawn plainly (its rank and suit in its corner).
 */
export class CasinoCards extends ASObject {
    public static readonly CW: int = 120;

    public static readonly CH: int = 168;

    public static readonly SHEET: string = "casino/cards/cards.png";

    public static readonly BACK: string = "casino/cards/back.png";

    public static readonly RANKS: any[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    public static readonly SUITS: any[] = ["Skulls", "Flames", "Horns", "Bones"];

    /** The suits' colours (the plain cards): Flames and Horns red, Skulls and Bones black. */
    private static readonly SUIT_COLORS: any[] = [0x1A1418, 0xC8200A, 0xC8200A, 0x1A1418];

    private static readonly SUIT_MARKS: any[] = ["☠", "♨", "♈", "✦"];

    private static _sheet: BitmapData = null;

    private static _back: BitmapData = null;

    private static _asked: boolean = false;

    private static _faces: any = {};

    public static preload(): void {
        if (CasinoCards._asked) {
            return;
        }
        CasinoCards._asked = true;
        ImageCache.GetImageWithCallBack(CasinoCards.SHEET, (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (bmd) {
                CasinoCards._sheet = bmd;
            }
        });
        ImageCache.GetImageWithCallBack(CasinoCards.BACK, (k: string, bmd: BitmapData, args: any[] = null): void => {
            if (bmd) {
                CasinoCards._back = bmd;
            }
        });
    }

    public static get ready(): boolean {
        return CasinoCards._sheet != null && CasinoCards._back != null;
    }

    /** "A of Skulls", "10 of Flames". rank 0 (Ace) to 12 (King). */
    public static nameOf(rank: int, suit: int): string {
        return CasinoCards.RANKS[rank] + " of " + CasinoCards.SUITS[suit];
    }

    private static face(rank: int, suit: int): BitmapData {
        if (!CasinoCards._sheet) {
            return null;
        }
        let key: string = rank + ":" + suit;
        let f: BitmapData = as3.as(CasinoCards._faces[key], BitmapData);
        if (!f) {
            f = new BitmapData(CasinoCards.CW, CasinoCards.CH, true, 0);
            f.copyPixels(CasinoCards._sheet, new Rectangle(rank * CasinoCards.CW, suit * CasinoCards.CH, CasinoCards.CW, CasinoCards.CH), new Point(0, 0));
            CasinoCards._faces[key] = f;
        }
        return f;
    }

    /**
     * A card w wide (its height in proportion), its top left at (0, 0): face up (rank 0 Ace to 12 King, suit
     * 0 to 3) or face down (rank -1). The card's name is "casinoCard:A of Skulls" (or "casinoCard:back").
     */
    public static card(rank: int, suit: int, w: number): Sprite {
        let s: Sprite = new Sprite();
        let h: number = w * CasinoCards.CH / CasinoCards.CW;
        s.name = "casinoCard:" + (rank < 0 ? "back" : CasinoCards.nameOf(rank, suit));
        let bmd: BitmapData = rank < 0 ? CasinoCards._back : CasinoCards.face(rank, suit);
        if (bmd) {
            let b: Bitmap = new Bitmap(bmd);
            b.smoothing = true;
            b.width = w;
            b.height = h;
            s.addChild(b);
        } else {
            let g: Shape = as3.as(s.addChild(new Shape()), Shape);
            g.graphics.lineStyle(2, 2759184, 1);
            g.graphics.beginFill((rank < 0 ? 0x5A140C : 0xF4ECDC) >>> 0, 1);
            g.graphics.drawRoundRect(0, 0, w, h, w * 0.12, w * 0.12);
            g.graphics.endFill();
            if (rank < 0) {
                g.graphics.lineStyle(2, 14196800, 0.8);
                g.graphics.drawRoundRect(w * 0.1, h * 0.07, w * 0.8, h * 0.86, w * 0.08, w * 0.08);
            } else {
                let col: uint = CasinoCards.SUIT_COLORS[suit] >>> 0;
                let t: TextField = CasinoUI.label(CasinoCards.RANKS[rank] + "\n" + CasinoCards.SUIT_MARKS[suit], Math.max(9, (w * 0.18) | 0) | 0, col, true, (w * 0.4) | 0, TextFormatAlign.CENTER);
                t.multiline = true;
                t.height = h * 0.4;
                t.x = 2;
                t.y = 2;
                s.addChild(t);
                let big: TextField = CasinoUI.label(as3.str(CasinoCards.SUIT_MARKS[suit]), (w * 0.42) | 0, col, true, w | 0, TextFormatAlign.CENTER);
                big.y = h * 0.3;
                s.addChild(big);
            }
        }
        s.filters = [new DropShadowFilter(3, 60, 0, 0.55, 6, 6, 1, 1)];
        return s;
    }
}
