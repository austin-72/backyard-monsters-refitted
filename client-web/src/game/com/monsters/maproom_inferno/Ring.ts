import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObjectContainer, Sprite } from "flash/display";
import { TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { TweenLite } from "@game";

export class Ring extends Sprite {
    private static actives: any = {};

    public $ctor(param1?: number, param2?: uint): void {
        super.$ctor();
        this.graphics.beginFill(0, 0);
        this.graphics.lineStyle(param1, param2);
        this.graphics.drawEllipse(-10, -10, 20, 20);
        this.graphics.endFill();
    }

    public static MakeRings(param1: int, param2: number, param3: DisplayObjectContainer, param4: number, param5: number, param6: number = 20, param7: number = 1, param8: number = 2, param9: uint = 65280): void {
        let _loc10_: Sprite = null;
        (_loc10_ = new Sprite()).x = param4;
        _loc10_.y = param5;
        param3.addChild(_loc10_);
        let _loc11_: number = 1000 * param2 / param1;
        let _loc12_: Timer = new Timer(_loc11_, param1 - 1);
        Ring.actives[_loc12_] = { "color": param9, "rc": 0, "make": param1, "container": _loc10_, "endSize": param6, "growTime": param7, "ringWidth": param8 };
        _loc12_.addEventListener(TimerEvent.TIMER, Ring.onTimer);
        _loc12_.start();
        _loc12_.dispatchEvent(new TimerEvent(TimerEvent.TIMER));
    }

    private static onTimer(param1: TimerEvent = null): void {
        let _loc3_: Ring = null;
        let _loc2_: any = Ring.actives[param1.target];
        if (Boolean(_loc2_) && _loc2_.rc++ < _loc2_.make) {
            _loc3_ = new Ring(Number(_loc2_.ringWidth), _loc2_.color >>> 0);
            _loc3_.width = 0;
            _loc3_.height = 0;
            _loc2_.container.addChild(_loc3_);
            TweenLite.to(_loc3_, Number(_loc2_.growTime), { "width": _loc2_.endSize, "height": _loc2_.endSize, "onComplete": as3.bind(_loc3_, _loc3_.kill), "alpha": 0 });
        } else if (Boolean(param1.target) && Boolean(_loc2_)) {
            _loc2_.container.parent.removeChild(_loc2_.container);
            delete Ring.actives[param1.target];
        }
    }

    public kill(): void {
        this.parent.removeChild(this);
    }
}
