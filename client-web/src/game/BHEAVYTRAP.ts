import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { ATTACK, BTRAP, EFFECTS, GIBLETS, GLOBAL, KEYS, MonsterBase, SOUNDS, Targeting } from "@game";

export class BHEAVYTRAP extends BTRAP {
    public $ctor(): void {
        super.$ctor();
    }

    public override FindTargets(): void {
        let _loc1_: any = null;
        let _loc2_: MonsterBase = null;
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: Point = null;
        let _loc6_: int = 0;
        let _loc8_: string = null;
        let _loc9_: int = 0;
        let _loc7_: any[] = Targeting.getCreepsInRange(this._range, this._position, Targeting.getOldStyleTargets(-1));
        this._hasTargets = false;
        this._targetCreeps = [];
        for (_loc3_ in _loc7_) {
            _loc1_ = _loc7_[_loc3_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            _loc4_ = Number(_loc1_.dist);
            _loc5_ = as3.cast(_loc1_.pos, Point);
            _loc8_ = _loc2_._creatureID.substr(0, 1);
            _loc9_ = Number(_loc2_._creatureID.substring(_loc2_._creatureID.indexOf("C") + 1)) | 0;
            if (!(_loc8_ == "C" && (_loc9_ < 10 || _loc9_ > 12))) {
                if (!(_loc8_ == "I" && (_loc9_ < 7 || _loc9_ > 8))) {
                    this._targetCreeps.push({ "creep": _loc2_, "dist": _loc4_, "position": _loc5_ });
                    this._hasTargets = true;
                    return;
                }
            }
        }
    }

    public override Explode(): void {
        let _loc1_: any = null;
        let _loc2_: MonsterBase = null;
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: Point = null;
        let _loc6_: int = 0;
        let _loc7_: any[] = Targeting.getCreepsInRange(this._size, new Point(this._mc.x, this._mc.y), Targeting.getOldStyleTargets(-1));
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        for (_loc3_ in _loc7_) {
            _loc1_ = _loc7_[_loc3_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            if (_loc2_.health > 0) {
                _loc8_++;
                _loc4_ = Number(_loc1_.dist);
                _loc5_ = as3.cast(_loc1_.pos, Point);
                _loc2_.modifyHealth(-(this._buildingProps.damage[0] / this._buildingProps.size * (this._buildingProps.size - _loc4_ * 0.5)));
                if (_loc2_.health <= 0) {
                    _loc9_++;
                    GIBLETS.Create(new Point(this._mc.x, this._mc.y + 3), 0.8, 75, 2);
                }
            }
        }
        _loc7_ = Targeting.getCreepsInRange(this._size, new Point(this._mc.x, this._mc.y), Targeting.getOldStyleTargets(2));
        for (_loc3_ in _loc7_) {
            _loc1_ = _loc7_[_loc3_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            if (_loc2_.health > 0) {
                _loc8_++;
                _loc4_ = Number(_loc1_.dist);
                _loc5_ = as3.cast(_loc1_.pos, Point);
                _loc2_.modifyHealth(-(this._buildingProps.damage[0] * 0.5 / this._buildingProps.size * (this._buildingProps.size - _loc4_ * 0.5)));
                if (_loc2_.health <= 0) {
                    _loc9_++;
                    GIBLETS.Create(new Point(this._mc.x, this._mc.y + 3), 0.8, 75, 2);
                }
            }
        }
        if (_loc8_ > 0) {
            this._fired = true;
            if (_loc9_ == _loc8_) {
                ATTACK.Log("htrap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapkilled", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc9_ }) + "</font>");
            } else if (_loc9_ > 0) {
                ATTACK.Log("htrap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapdamagedkilled", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc8_, "v3": _loc9_ }) + "</font>");
            } else {
                ATTACK.Log("htrap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapdamaged", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc8_ }) + "</font>");
            }
            EFFECTS.Scorch(new Point(this._mc.x, this._mc.y + 5));
        }
        this._hasTargets = false;
        this._mc.visible = true;
        this.setHealth(0);
        SOUNDS.Play("trap");
        if (GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._fired) {
            this.setHealth(this.maxHealth);
            // (Inferno-only: kept, disarmed, as BTRAP)
            this.ioDrawDisarmed();
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.RecycleC();
        }
    }
}
