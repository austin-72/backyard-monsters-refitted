import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING15, CREATURES, GLOBAL, GRID, HOUSINGBUNKER, InstanceManager, MAP, MONSTERBUNKERPOPUP, MapRoomManager, PersistentMonsterBunker, SOUNDS, TRIBES } from "@game";

export class MONSTERBUNKER extends ASObject {
    public static readonly TYPE: uint = 22;

    public static _mc: MONSTERBUNKERPOPUP = null;

    public static s_PersistantBunker: PersistentMonsterBunker = null;

    public static _open: boolean = false;

    public static _bunkerCapacity: int = 0;

    public static _bunkerUsed: int = 0;

    public static _bunkerSpace: int = 0;

    public static _housingBuildingUpgrading: boolean = false;

    public static _creatures: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Data(param1: any): void {
        MONSTERBUNKER._creatures = param1;
        if (MONSTERBUNKER._creatures.C100) {
            MONSTERBUNKER._creatures.C12 = MONSTERBUNKER._creatures.C100;
            delete MONSTERBUNKER._creatures.C100;
        }
    }

    public static Show(param1: MouseEvent = null): void {
        MONSTERBUNKER.Hide(param1);
        MONSTERBUNKER._open = true;
        GLOBAL.BlockerAdd();
        if (MapRoomManager.instance.isInMapRoom3) {
            MONSTERBUNKER.s_PersistantBunker = as3.as(GLOBAL._layerWindows.addChild(new PersistentMonsterBunker()), PersistentMonsterBunker);
            MONSTERBUNKER.s_PersistantBunker.Center();
            MONSTERBUNKER.s_PersistantBunker.ScaleUp();
        } else {
            MONSTERBUNKER._mc = as3.as(GLOBAL._layerWindows.addChild(new MONSTERBUNKERPOPUP()), MONSTERBUNKERPOPUP);
            MONSTERBUNKER._mc.Center();
            MONSTERBUNKER._mc.ScaleUp();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (MONSTERBUNKER._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            if (MONSTERBUNKER._mc) {
                GLOBAL._layerWindows.removeChild(MONSTERBUNKER._mc);
            }
            if (MONSTERBUNKER.s_PersistantBunker) {
                GLOBAL._layerWindows.removeChild(MONSTERBUNKER.s_PersistantBunker);
            }
            MONSTERBUNKER._open = false;
            MONSTERBUNKER._mc = null;
            MONSTERBUNKER.s_PersistantBunker = null;
        }
    }

    public static BunkerStore(param1: string, param2: any, param3: boolean = false): boolean {
        let _loc6_: any = undefined;
        let _loc7_: any[] = null;
        let _loc8_: Vector<any> = null;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc12_: int = 0;
        if (param1 == "C100") {
            param1 = "C12";
        }
        let _loc4_: int = CREATURES.GetProperty(param1, "cStorage") | 0;
        let _loc5_: boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW) && TRIBES.TribeForID(BASE._wmID).behaviour == "juice";
        if (MONSTERBUNKER._bunkerSpace < _loc4_ && !_loc5_) {
            return false;
        }
        if (!param3) {
            if (param2._monsters[param1]) {
                param2._monsters[param1] += 1;
            } else {
                param2._monsters[param1] = 1;
            }
            if (GLOBAL._render) {
                if (_loc5_) {
                    _loc6_ = CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "juice", new Point(param2.x, param2.y), 0);
                    if (_loc6_) {
                        _loc6_.ModeJuice();
                    }
                } else {
                    _loc7_ = [];
                    _loc8_ = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
                    for (_loc9_ of (_loc8_ ?? [])) {
                        if (_loc9_._countdownBuild.Get() <= 0 && _loc9_.health > 0) {
                            _loc10_ = _loc9_._mc.x - param2.x;
                            _loc11_ = _loc9_._mc.y - param2.y;
                            _loc12_ = Math.sqrt(_loc10_ * _loc10_ + _loc11_ * _loc11_) | 0;
                            _loc7_.push({ "mc": _loc9_, "dist": _loc12_ });
                        }
                    }
                    if (_loc7_.length == 0) {
                        return false;
                    }
                    as3.sortOn(_loc7_, ["dist"], Array.NUMERIC);
                    _loc9_ = as3.cast(_loc7_[0].mc, BFOUNDATION);
                    CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "bunkering", new Point(param2._mc.x, param2._mc.y), 0, GRID.FromISO(_loc9_._mc.x, _loc9_._mc.y), _loc9_);
                }
            }
        }
        return true;
    }

    public static Cull(): void {
        MONSTERBUNKER._bunkerCapacity = 0;
        MONSTERBUNKER._bunkerUsed = 0;
        MONSTERBUNKER._bunkerSpace = 0;
    }

    public static Populate(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: BFOUNDATION = null;
        let _loc9_: Point = null;
        let _loc1_: any[] = [];
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_.health > 0) {
                _loc1_.push(_loc3_);
            }
        }
        if (_loc1_.length > 0) {
            for (_loc4_ in MONSTERBUNKER._creatures) {
                if ((_loc5_ = MONSTERBUNKER._creatures[_loc4_] | 0) > 50) {
                    _loc5_ = 50;
                }
                _loc6_ = 0;
                while (_loc6_ < _loc5_) {
                    _loc7_ = (Math.random() * _loc1_.length) | 0;
                    _loc8_ = as3.cast(_loc1_[_loc7_], BFOUNDATION);
                    _loc9_ = GRID.FromISO(_loc8_.x, _loc8_.y);
                    CREATURES.Spawn(_loc4_, MAP._BUILDINGTOPS, "pen", MONSTERBUNKER.PointInBunker(_loc9_), Math.random() * 360, _loc9_, _loc8_);
                    _loc6_++;
                }
            }
        }
    }

    public static PointInBunker(param1: Point): Point {
        let _loc2_: Rectangle = new Rectangle(30, 40, 110, 80);
        return GRID.ToISO(param1.x + (_loc2_.x + Math.random() * _loc2_.width), param1.y + (_loc2_.y + Math.random() * _loc2_.height), 0);
    }

    public static Tick(): void {
        if (MONSTERBUNKER._open) {
        }
    }

    public static isBunkerBuilding(param1: int): boolean {
        return param1 === 22 || param1 === 128;
    }
}
