import * as as3 from "as3";
import { ASObject, Class } from "as3";
import { getDefinitionByName } from "flash/utils";

export class ExposedAccessor extends ASObject {
    static {
        as3.fields(this, { m_Name: null, m_QualifiedClassName: null, m_ClassType: null });
    }

    private m_Name: string;
    private m_QualifiedClassName: string;
    private m_ClassType: any;

    public $ctor(param1?: string, param2?: string): void {
        super.$ctor();
        this.m_Name = param1;
        this.m_QualifiedClassName = param2;
        this.m_ClassType = as3.as(getDefinitionByName(param2), Class);
    }

    public get name(): string {
        return this.m_Name;
    }

    public get qualifiedClassName(): string {
        return this.m_QualifiedClassName;
    }

    public get classType(): any {
        return this.m_ClassType;
    }

    public Destroy(): void {
        this.m_Name = "";
        this.m_QualifiedClassName = "";
        this.m_ClassType = null;
    }
}
