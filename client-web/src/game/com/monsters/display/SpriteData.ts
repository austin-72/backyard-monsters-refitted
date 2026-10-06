import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { Point, Rectangle } from "flash/geom";

export class SpriteData extends ASObject {
    static {
        as3.fields(this, { key: null, image: null, rect: null, offset: null, middle: null });
    }

    public static readonly FUBAR_X: int = 26;

    public static readonly FUBAR_Y: int = 36;
    public key: string;
    public image: BitmapData;
    public rect: Rectangle;
    public offset: Point;
    public middle: Point;

    public $ctor(param1?: string, param2?: number, param3?: number, param4?: number, param5?: number): void {
        this.rect = new Rectangle();
        this.offset = new Point();
        this.middle = new Point();
        super.$ctor();
        this.key = param1;
        this.rect.width = param2;
        this.rect.height = param3;
        this.offset.x = SpriteData.FUBAR_X - param4;
        this.offset.y = SpriteData.FUBAR_Y - param5;
        this.middle.x = param4;
        this.middle.y = param5;
    }

    public get width(): number {
        return this.rect.width;
    }

    public get height(): number {
        return this.rect.height;
    }

    public get sprite(): BitmapData {
        return this.image;
    }
}
