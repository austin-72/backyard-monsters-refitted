import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, DisplayObject, MovieClip, Sprite } from "flash/display";
import { Point } from "flash/geom";
import { Flame } from "@game";

export class Fire extends Sprite {
    static {
        as3.fields(this, { monster: null, monsterBmp: null, count: 0, countMax: 0 });
    }

    private static flames: any[] = [];

    private static flame: Flame = null;

    private static phase: int = 0;

    private static _frameNumber: int = 0;
    private monster: Sprite;
    private monsterBmp: Bitmap;
    private count: int;
    private countMax: int;

    public $ctor(): void {
        super.$ctor();
    }

    public static Add(param1: DisplayObject, param2: Bitmap, param3: Point): void {
        if (Fire.flames.length < 5) {
            Fire.flame = as3.as((as3.as(param1, MovieClip)).addChild(new Flame(param1, (param2.width + 20) | 0, (param2.height + 60) | 0)), Flame);
            Fire.flame.emitter = param2;
            Fire.flame.enhance = 5;
            Fire.flame.cooling = 5;
            Fire.flame.x = param3.x;
            Fire.flame.y = param3.y + 2;
            Fire.flames.push(Fire.flame);
        }
    }

    public static Remove(param1: int): void {
        Fire.flames[param1].Clear();
        Fire.flames.splice(param1, 1);
    }

    public static Tick(): void {
        let _loc1_: int = 0;
        if (++Fire._frameNumber % 2 == 0) {
            _loc1_ = 0;
            while (_loc1_ < Fire.flames.length) {
                Fire.flame = as3.cast(Fire.flames[_loc1_], Flame);
                Fire.flame.Tick();
                if (Fire.flame.phase == 0) {
                    Fire.flame.cooling -= 0.2;
                    if (Fire.flame.cooling < 0.8) {
                        Fire.flame.phase = 1;
                    }
                } else if (Fire.flame.phase > 0) {
                    Fire.flame.phase += 1;
                    if (Fire.flame.phase > 200) {
                        Fire.flame.cooling += 0.02;
                        if (Fire.flame.cooling > 5) {
                            Fire.Remove(_loc1_);
                            _loc1_--;
                        }
                    }
                }
                _loc1_++;
            }
        }
    }

    public static Clear(): void {
        let _loc1_: int = 0;
        while (_loc1_ < Fire.flames.length) {
            Fire.Remove(_loc1_);
            _loc1_--;
            _loc1_++;
        }
        Fire.flames = [];
    }
}
