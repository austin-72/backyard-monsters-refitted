import * as as3 from "as3";
import { int, uint } from "as3";
import { ATTACK, BASE, BFOUNDATION, EnumYardType, GLOBAL, ILootable, KEYS, MapRoomManager, SecNum } from "@game";

export class BSTORAGE extends BFOUNDATION implements ILootable {
    static {
        as3.implement(this, [ILootable]);
    }

    private static _LOOT_MAX_TH: number = 10000000;

    private static _LOOT_MAX_OUTPOST: number = 10000000;

    private static _LOOT_MAX_SILO: number = 4000000;

    private static _LOOT_MAX_WM_TH: number = 2000000;

    private static _LOOT_MAX_WM_SILO: number = 500000;

    private static _LOOT_PCT_TH: number = 0.1;

    private static _LOOT_PCT_OUTPOST: number = 0.05;

    private static _LOOT_PCT_BASE: number = 0.04;

    private static _LOOT_GOO_LIMITER: number = 0.5;

    public $ctor(): void {
        super.$ctor();
    }

    public override Loot(param1: int): uint {
        let _loc4_: any = null;
        let _loc2_: int = 0;
        let _loc3_: any[] = [];
        if (BASE._resources.r1.Get() > 0) {
            _loc3_.push({ "id": 1, "quantity": BASE._resources.r1.Get() });
        }
        if (BASE._resources.r2.Get() > 0) {
            _loc3_.push({ "id": 2, "quantity": BASE._resources.r2.Get() });
        }
        if (BASE._resources.r3.Get() > 0) {
            _loc3_.push({ "id": 3, "quantity": BASE._resources.r3.Get() });
        }
        if (BASE._resources.r4.Get() > 0) {
            _loc3_.push({ "id": 4, "quantity": BASE._resources.r4.Get() });
        }
        if (_loc3_.length > 0) {
            if ((_loc4_ = _loc3_[(Math.random() * _loc3_.length) | 0]).quantity >= Math.ceil(param1)) {
                _loc2_ = Math.ceil(param1) | 0;
            } else {
                _loc2_ = _loc4_.quantity | 0;
            }
            BASE._resources["r" + _loc4_.id].Add(-_loc2_);
            BASE._hpResources["r" + _loc4_.id] -= _loc2_;
            if (BASE._deltaResources["r" + _loc4_.id]) {
                BASE._deltaResources["r" + _loc4_.id].Add(-_loc2_);
                BASE._hpDeltaResources["r" + _loc4_.id] -= _loc2_;
            } else {
                BASE._deltaResources["r" + _loc4_.id] = new SecNum(-_loc2_);
                BASE._hpDeltaResources["r" + _loc4_.id] = -_loc2_;
            }
            BASE._deltaResources.dirty = true;
            BASE._hpDeltaResources.dirty = true;
            if (MapRoomManager.instance.isInMapRoom2 && GLOBAL._currentCell && GLOBAL._currentCell.baseType == EnumYardType.OUTPOST) {
                _loc2_ = (_loc2_ * 0.5) | 0;
            } else {
                _loc2_ = (_loc2_ * 0.9) | 0;
            }
            if (GLOBAL.mode == "wmattack") {
                _loc2_ = (_loc2_ / 5) | 0;
            }
            ATTACK.Loot(_loc4_.id | 0, _loc2_, this._mc.x | 0, this._mc.y | 0, 9, this);
        } else {
            param1 = 0;
        }
        return super.Loot(_loc2_);
    }

    public override Destroyed(param1: boolean = true): void {
        let _loc2_: number = NaN;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (param1 && !this._destroyed) {
            _loc2_ = BSTORAGE._LOOT_PCT_BASE;
            if (this._type == 14) {
                _loc2_ = BSTORAGE._LOOT_PCT_TH;
            }
            if (this._type == 112) {
                _loc2_ = BSTORAGE._LOOT_PCT_OUTPOST;
            }
            _loc3_ = 1;
            while (_loc3_ < 5) {
                _loc4_ = (BASE._resources["r" + _loc3_].Get() * _loc2_) | 0;
                if (this._type == 6) {
                    _loc4_ = Math.min(_loc4_, BSTORAGE._LOOT_MAX_SILO) | 0;
                    if (MapRoomManager.instance.isInMapRoom2 && GLOBAL._currentCell && GLOBAL._currentCell.baseType == EnumYardType.OUTPOST) {
                        // A yard can bring its own cap (Moloch strongholds do): see GLOBAL.ioLootCapSilo.
                        _loc4_ = Math.min(_loc4_, GLOBAL.ioLootCapSilo > 0 ? GLOBAL.ioLootCapSilo : BSTORAGE._LOOT_MAX_WM_SILO) | 0;
                    }
                }
                if (this._type == 14) {
                    _loc4_ = Math.min(_loc4_, BSTORAGE._LOOT_MAX_TH) | 0;
                    if (MapRoomManager.instance.isInMapRoom2 && GLOBAL._currentCell && GLOBAL._currentCell.baseType == EnumYardType.OUTPOST) {
                        _loc4_ = Math.min(_loc4_, GLOBAL.ioLootCapHall > 0 ? GLOBAL.ioLootCapHall : BSTORAGE._LOOT_MAX_WM_TH) | 0;
                    }
                }
                if (this._type == 112) {
                    _loc4_ = Math.min(_loc4_, BSTORAGE._LOOT_MAX_OUTPOST) | 0;
                }
                if (_loc3_ == 4 && !MapRoomManager.instance.isInMapRoom3) {
                    _loc4_ = Math.ceil(_loc4_ * BSTORAGE._LOOT_GOO_LIMITER) | 0;
                }
                if (_loc4_ > 0) {
                    BASE._resources["r" + _loc3_].Add(-_loc4_);
                    BASE._hpResources["r" + _loc3_] -= _loc4_;
                    if (BASE._deltaResources["r" + _loc3_]) {
                        BASE._deltaResources["r" + _loc3_].Add(-_loc4_);
                        BASE._hpDeltaResources["r" + _loc3_] -= _loc4_;
                    } else {
                        BASE._deltaResources["r" + _loc3_] = new SecNum(-_loc4_);
                        BASE._hpDeltaResources["r" + _loc3_] = -_loc4_;
                    }
                    BASE._deltaResources.dirty = true;
                    BASE._hpDeltaResources.dirty = true;
                    ATTACK.Loot(_loc3_, _loc4_, this._mc.x | 0, (this._mc.y + 20 - _loc3_ * 10) | 0, 12);
                }
                _loc3_++;
            }
            ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downedlooted", { "v1": this._lvl.Get(), "v2": this._buildingProps.name, "v3": (100 * _loc2_) | 0 }));
        } else {
            ATTACK.Log("b" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_downed", { "v1": this._lvl.Get(), "v2": this._buildingProps.name }));
        }
        super.Destroyed(param1);
    }
}
