import * as as3 from "as3";
import { ASObject, Class, Vector, int } from "as3";
import { Dictionary, getDefinitionByName, getQualifiedSuperclassName } from "flash/utils";

export class InstanceManager extends ASObject {
    public static readonly k_ClassDisposalMethod: string = "Clean";

    protected static readonly k_Inheritance: Dictionary = new Dictionary();

    protected static readonly k_Instances: Dictionary = new Dictionary();

    public $ctor(): void {
        super.$ctor();
    }

    public static getInstance(param1: any): any {
        let _loc4_: any = null;
        let _loc5_: string = null;
        let _loc2_: any = new param1();
        let _loc3_: any = param1;
        while (_loc3_ != null && _loc3_ != Object) {
            InstanceManager.k_Instances.set(_loc3_, InstanceManager.k_Instances.get(_loc3_) || new Vector<any>(0, false, Object));
            InstanceManager.k_Instances.get(_loc3_).push(_loc2_);
            _loc4_ = _loc3_;
            if (InstanceManager.k_Inheritance.get(_loc4_) !== undefined) {
                _loc3_ = InstanceManager.k_Inheritance.get(_loc3_);
            } else {
                _loc3_ = !(!(_loc5_ = getQualifiedSuperclassName(_loc3_))) ? as3.as(getDefinitionByName(_loc5_), Class) : null;
                InstanceManager.k_Inheritance.set(_loc4_, _loc3_);
            }
        }
        return _loc2_;
    }

    public static getInstancesByClass(param1: any): Vector<any> {
        if (InstanceManager.k_Instances.get(param1) === undefined) {
            return new Vector<any>(0, false, Object);
        }
        return as3.cast(InstanceManager.k_Instances.get(param1), Vector);
    }

    public static clearInstance(param1: any): void {
        let _loc3_: any = null;
        let _loc4_: Vector<any> = null;
        let _loc5_: int = 0;
        let _loc2_: any = param1.constructor;
        while (_loc2_ != null && _loc2_ != Object) {
            if ((_loc5_ = (_loc4_ = as3.cast(InstanceManager.k_Instances.get(_loc2_), Vector)).indexOf(param1) | 0) !== -1) {
                _loc4_.splice(_loc5_, 1);
            }
            _loc3_ = _loc2_;
            if (InstanceManager.k_Inheritance.get(_loc3_) !== undefined) {
                _loc2_ = InstanceManager.k_Inheritance.get(_loc2_);
            }
        }
        if (param1.hasOwnProperty(InstanceManager.k_ClassDisposalMethod) && as3.is(param1[InstanceManager.k_ClassDisposalMethod], Function)) {
            param1[InstanceManager.k_ClassDisposalMethod].call(param1);
        }
    }

    public static clearAll(): void {
        let _loc1_: Vector<any> = null;
        let _loc2_: any = null;
        let _loc3_: any = null;
        let _loc4_: any = null;
        let _loc5_: int = 0;
        for (_loc4_ of (InstanceManager.k_Instances?.keys() ?? [])) {
            _loc1_ = as3.cast(InstanceManager.k_Instances.get(_loc4_), Vector);
            _loc5_ = (_loc1_.length - 1) | 0;
            while (_loc5_ >= 0) {
                _loc3_ = as3.vget(_loc1_, _loc5_);
                _loc2_ = _loc3_.constructor;
                if (_loc4_ == _loc2_ && _loc3_.hasOwnProperty(InstanceManager.k_ClassDisposalMethod) && as3.is(_loc3_[InstanceManager.k_ClassDisposalMethod], Function)) {
                    _loc3_[InstanceManager.k_ClassDisposalMethod].call(_loc3_);
                }
                _loc5_--;
            }
            InstanceManager.k_Instances.set(_loc4_, new Vector<any>(0, false, Object));
        }
    }

    public static addInstance(param1: any): void {
        let _loc3_: any = null;
        let _loc4_: string = null;
        let _loc2_: any = param1.constructor;
        while (_loc2_ != null && _loc2_ != Object) {
            InstanceManager.k_Instances.set(_loc2_, InstanceManager.k_Instances.get(_loc2_) || new Vector<any>(0, false, Object));
            InstanceManager.k_Instances.get(_loc2_).push(param1);
            _loc3_ = _loc2_;
            if (InstanceManager.k_Inheritance.get(_loc3_) !== undefined) {
                _loc2_ = InstanceManager.k_Inheritance.get(_loc2_);
            } else {
                _loc2_ = !(!(_loc4_ = getQualifiedSuperclassName(_loc2_))) ? as3.as(getDefinitionByName(_loc4_), Class) : null;
                InstanceManager.k_Inheritance.set(_loc3_, _loc2_);
            }
        }
    }

    public static removeInstance(param1: any): void {
        let _loc3_: any = null;
        let _loc4_: Vector<any> = null;
        let _loc5_: int = 0;
        let _loc2_: any = param1.constructor;
        while (_loc2_ != null && _loc2_ != Object) {
            if ((_loc5_ = (_loc4_ = as3.cast(InstanceManager.k_Instances.get(_loc2_), Vector)).indexOf(param1) | 0) !== -1) {
                _loc4_.splice(_loc5_, 1);
            }
            _loc3_ = _loc2_;
            if (InstanceManager.k_Inheritance.get(_loc3_) !== undefined) {
                _loc2_ = InstanceManager.k_Inheritance.get(_loc2_);
            }
        }
    }

    public static removeAll(): void {
        let _loc1_: any = null;
        for (_loc1_ of (InstanceManager.k_Instances?.keys() ?? [])) {
            InstanceManager.k_Instances.set(_loc1_, new Vector<any>(0, false, Object));
        }
    }
}
