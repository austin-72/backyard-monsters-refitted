import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, GLOBAL, MAP, ResourcePackage, TUTORIAL } from "@game";

export class ResourcePackages extends ASObject {
    public static _packages: any = {};

    public static _packageCount: int = 0;

    public static _frame: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Clear(): void {
        while (Boolean(MAP._RESOURCES) && MAP._RESOURCES.numChildren > 0) {
            MAP._RESOURCES.removeChildAt(0);
        }
        ResourcePackages._packages = {};
        ResourcePackages._packageCount = 0;
        ResourcePackages._frame = 0;
    }

    public static Create(param1: int, param2: BFOUNDATION, param3: int, param4: boolean = false): void {
        let _loc5_: BFOUNDATION = null;
        let _loc6_: BFOUNDATION = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: Point = null;
        let _loc10_: Point = null;
        let _loc11_: string = null;
        let _loc12_: int = 0;
        if (GLOBAL._render) {
            _loc7_ = 0;
            if (param4) {
                if (GLOBAL.townHall) {
                    _loc5_ = GLOBAL.townHall;
                    if (_loc6_ == _loc5_) {
                        _loc7_ = 50;
                    }
                } else {
                    _loc7_ = 50;
                    _loc5_ = param2;
                }
                _loc6_ = param2;
            } else {
                _loc5_ = param2;
                if (!GLOBAL.townHall) {
                    return;
                }
                _loc6_ = GLOBAL.townHall;
            }
            _loc12_ = 1;
            if (param1 == 4 && param4) {
                if (param3 > 200000) {
                    _loc12_ = 8;
                } else if (param3 > 100000) {
                    _loc12_ = 7;
                } else if (param3 > 50000) {
                    _loc12_ = 6;
                } else if (param3 > 10000) {
                    _loc12_ = 5;
                } else if (param3 > 4000) {
                    _loc12_ = 4;
                } else if (param3 > 2000) {
                    _loc12_ = 3;
                } else if (param3 > 1000) {
                    _loc12_ = 2;
                } else {
                    _loc12_ = 1;
                }
            } else if (param3 > 20000) {
                _loc12_ = 12;
            } else if (param3 > 10000) {
                _loc12_ = 9;
            } else if (param3 > 5000) {
                _loc12_ = 7;
            } else if (param3 > 1000) {
                _loc12_ = 5;
            } else if (param3 > 400) {
                _loc12_ = 4;
            } else if (param3 > 200) {
                _loc12_ = 3;
            } else if (param3 > 100) {
                _loc12_ = 2;
            } else {
                _loc12_ = 1;
            }
            if (TUTORIAL._stage < 200) {
                _loc12_ = 10;
            }
            while (_loc12_ > 0) {
                _loc12_--;
                ResourcePackages.Spawn(_loc5_, _loc6_, param1, _loc12_);
            }
        }
    }

    public static Spawn(param1: BFOUNDATION, param2: BFOUNDATION, param3: int, param4: int): void {
        let _loc5_: Point = new Point(0, -20);
        let _loc6_: int = 20;
        let _loc7_: Point = new Point(0, -20);
        let _loc8_: int = 20;
        if (param1._spoutHeight) {
            _loc5_ = param1._spoutPoint;
            _loc6_ = param1._spoutHeight;
        }
        if (param2._spoutHeight) {
            _loc7_ = param2._spoutPoint;
            _loc8_ = param2._spoutHeight;
        }
        let _loc9_: Point = new Point(param1._mc.x + _loc5_.x, param1._mc.y + _loc5_.y);
        let _loc10_: Point = new Point(param2._mc.x + _loc7_.x, param2._mc.y + _loc7_.y);
        let _loc11_: ResourcePackage = as3.as(MAP._RESOURCES.addChild(new ResourcePackage(_loc9_, _loc10_, _loc6_, _loc8_, param3, ResourcePackages._packageCount, param2, param4 / 6)), ResourcePackage);
        ResourcePackages._packages["p" + ResourcePackages._packageCount] = _loc11_;
        ++ResourcePackages._packageCount;
    }

    public static Remove(param1: any): void {
        if (Boolean(ResourcePackages._packages["p" + param1]) && Boolean(ResourcePackages._packages["p" + param1].parent)) {
            MAP._RESOURCES.removeChild(as3.cast(ResourcePackages._packages["p" + param1], DisplayObject));
            delete ResourcePackages._packages["p" + param1];
        }
    }
}
