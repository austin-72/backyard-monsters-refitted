import { ASObject, int } from "as3";
import { DisplayObject } from "flash/display";
import { GAME, GLOBAL, Quad, TweenLite } from "@game";

export class POPUPSETTINGS extends ASObject {
    private static readonly _BOTTOM_PADDING: int = 100;

    public $ctor(): void {
        super.$ctor();
    }

    public static AlignToCenter(param1: DisplayObject): void {
        param1.x = GLOBAL._SCREENCENTER.x;
        param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING;
        if (GAME._isSmallSize) {
            param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING / 2;
        }
    }

    public static AlignToUpperLeft(param1: DisplayObject, param2: boolean = false): void {
        param1.x = GLOBAL._SCREENCENTER.x - param1.width * 0.5;
        param1.y = GLOBAL._SCREENCENTER.y - POPUPSETTINGS._BOTTOM_PADDING - param1.height * 0.5;
        if (param2) {
            param1.y = GLOBAL._SCREENCENTER.y - param1.height * 0.5;
        }
    }

    public static ScaleUp(param1: DisplayObject): void {
        param1.scaleX = 0.9;
        param1.scaleY = 0.9;
        TweenLite.to(param1, 0.2, { "scaleX": 1, "scaleY": 1, "ease": Quad.easeOut });
    }

    public static ScaleUpFromTopLeft(param1: DisplayObject): void {
        param1.scaleX = 0.9;
        param1.scaleY = 0.9;
        TweenLite.to(param1, 0.2, { "transformAroundCenter": { "scale": 1 }, "ease": Quad.easeOut });
    }
}
