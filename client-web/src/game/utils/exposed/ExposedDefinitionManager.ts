import * as as3 from "as3";
import { ASObject, Class, int, uint } from "as3";
import { Dictionary, getDefinitionByName, getQualifiedClassName, getQualifiedSuperclassName } from "flash/utils";
import { ExposedDefinition, ExposedStructure, SingletonLock } from "@game";

export class ExposedDefinitionManager extends ASObject {
    static {
        as3.fields(this, { m_ExposedPrimitives: null, m_ExposedDefinitions: null });
    }

    private static s_Instance: ExposedDefinitionManager = null;

    public static readonly VECTOR_TYPE_NAME: string = "__AS3__.vec::Vector.<";
    private m_ExposedPrimitives: Dictionary;
    private m_ExposedDefinitions: Dictionary;

    public $ctor(param1?: SingletonLock): void {
        this.m_ExposedPrimitives = new Dictionary();
        this.m_ExposedDefinitions = new Dictionary();
        super.$ctor();
        this.m_ExposedPrimitives.set(getQualifiedClassName(false), Boolean);
        this.m_ExposedPrimitives.set(getQualifiedClassName(0), int);
        this.m_ExposedPrimitives.set(getQualifiedClassName(0.1), Number);
        this.m_ExposedPrimitives.set(getQualifiedClassName(""), String);
        this.m_ExposedPrimitives.set("uint", uint);
    }

    public static get instance(): ExposedDefinitionManager {
        return ExposedDefinitionManager.s_Instance = ExposedDefinitionManager.s_Instance || new ExposedDefinitionManager(new SingletonLock());
    }

    public IsPrimitiveType(param1: string): boolean {
        return this.m_ExposedPrimitives.has(param1);
    }

    public FindOrCacheExposedDefinition(param1: ExposedStructure): ExposedDefinition {
        let _loc2_: string = getQualifiedClassName(param1);
        let _loc3_: ExposedDefinition = as3.cast(this.m_ExposedDefinitions.get(_loc2_), ExposedDefinition);
        if (_loc3_ != null) {
            return _loc3_;
        }
        _loc3_ = new ExposedDefinition(param1);
        this.m_ExposedDefinitions.set(_loc2_, _loc3_);
        return _loc3_;
    }

    public DoesInheritFrom(param1: any, param2: any): boolean {
        while (param1 != Object) {
            if (param1 == param2) {
                return true;
            }
            param1 = this.GetParentClass(param1);
        }
        return false;
    }

    public GetParentClass(param1: any): any {
        return as3.as(getDefinitionByName(getQualifiedSuperclassName(param1)), Class);
    }
}
