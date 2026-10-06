import * as as3 from "as3";
import { ASObject, Class, XML, XMLList } from "as3";
import { System } from "flash/system";
import { Dictionary, describeType, getDefinitionByName } from "flash/utils";
import { ExposedAccessor, ExposedStructure } from "@game";

export class ExposedDefinition extends ASObject {
    static {
        as3.fields(this, { m_QualifiedClassName: null, m_ClassType: null, m_ExposedAccessors: null });
    }

    public static readonly EXPOSED_FOR_EDITOR: string = "Editor";

    public static readonly EXPOSED_FOR_LOAD: string = "Load";

    public static readonly EXPOSED_FOR_SAVE: string = "Save";
    private m_QualifiedClassName: string;
    private m_ClassType: any;
    private m_ExposedAccessors: Dictionary;

    public $ctor(param1?: ExposedStructure): void {
        this.m_ExposedAccessors = new Dictionary();
        super.$ctor();
        let _loc2_: XML = describeType(param1);
        this.m_QualifiedClassName = as3.str(_loc2_.attribute("name"));
        this.m_ClassType = as3.as(getDefinitionByName(this.m_QualifiedClassName), Class);
        this.m_ExposedAccessors.set(ExposedDefinition.EXPOSED_FOR_EDITOR, new Dictionary());
        this.m_ExposedAccessors.set(ExposedDefinition.EXPOSED_FOR_LOAD, new Dictionary());
        this.m_ExposedAccessors.set(ExposedDefinition.EXPOSED_FOR_SAVE, new Dictionary());
        let _loc3_: XML = null;
        let _loc4_: XML = null;
        let _loc5_: string = null;
        let _loc6_: string = null;
        let _loc7_: string = null;
        let _loc8_: ExposedAccessor = null;
        let _loc9_: XMLList = _loc2_.child("accessor");
        for (_loc3_ of (_loc9_ ?? [])) {
            _loc5_ = as3.str(_loc3_.attribute("name"));
            _loc6_ = as3.str(_loc3_.attribute("type"));
            _loc8_ = new ExposedAccessor(_loc5_, _loc6_);
            for (_loc4_ of (_loc3_.child("metadata") ?? [])) {
                _loc7_ = String(_loc4_.attribute("name"));
                if (this.m_ExposedAccessors.get(_loc7_) != null) {
                    this.m_ExposedAccessors.get(_loc7_)[_loc5_] = _loc8_;
                }
            }
        }
        System.disposeXML(_loc2_);
    }

    public get qualifiedClassName(): string {
        return this.m_QualifiedClassName;
    }

    public get classType(): any {
        return this.m_ClassType;
    }

    public FindExposedAccessor(param1: string, param2: string): ExposedAccessor {
        return as3.as(this.m_ExposedAccessors.get(param2)[param1], ExposedAccessor);
    }

    public GetAccessorsExposedFor(param1: string): Dictionary {
        return as3.as(this.m_ExposedAccessors.get(param1), Dictionary);
    }
}
