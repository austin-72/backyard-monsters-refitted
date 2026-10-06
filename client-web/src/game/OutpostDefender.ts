import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BitmapData } from "flash/display";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, ICoreBuilding, ImageCache } from "@game";

export class OutpostDefender extends BFOUNDATION implements ICoreBuilding {
    static {
        as3.implement(this, [ICoreBuilding]);
    }

    public static readonly k_TYPE: int = 140;

    private static colorData: Vector<ColorData> = null;

    public $ctor(): void {
        super.$ctor();
        OutpostDefender.colorData = Vector.from([new ColorData("self.light.png"), new ColorData("enemy.light.png"), new ColorData("ally.light.png"), new ColorData("neutral.light.png")], ColorData);
        this._animRandomStart = false;
        this._footprint = [new Rectangle(0, 0, 130, 130)];
        this._gridCost = [[new Rectangle(0, 0, 130, 130), 10], [new Rectangle(10, 10, 110, 110), 200]];
        this._type = OutpostDefender.k_TYPE;
        this.SetProps();
        this.animContainer.visible = false;
    }

    public setLightFromRelationship(param1: uint): void {
        ImageCache.GetImageWithCallBack(as3.vget(OutpostDefender.colorData, param1).lightAnimation, as3.bind(this, this.loadedLightAnimationImage));
    }

    private loadedLightAnimationImage(param1: string, param2: BitmapData): void {
        this._animBMD = param2;
        this.animContainer.visible = true;
    }

    public override TickFast(param1: Event = null): void {
        if (this._animLoaded && !this.animContainer.visible) {
            this.setLightFromRelationship(BASE.loadObject["relationship"] >>> 0);
        }
        super.TickFast(param1);
        this.AnimFrame();
    }
}

class ColorData extends ASObject {
    static {
        as3.fields(this, { lightAnimation: null });
    }

    public lightAnimation: string;

    public $ctor(param1?: string): void {
        super.$ctor();
        this.lightAnimation = "buildings/outpostdefender/" + param1;
    }
}
