import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ExposedAccessor, ExposedStructure } from "@game";

export class ExposedReference extends ASObject {
    static {
        as3.fields(this, { m_ExposedStructure: null, m_ExposedAccessor: null, m_ReferencedObjectId: null, m_VectorIndex: 0 });
    }

    private m_ExposedStructure: ExposedStructure;
    private m_ExposedAccessor: ExposedAccessor;
    private m_ReferencedObjectId: string;
    private m_VectorIndex: int;

    public $ctor(param1?: ExposedStructure, param2?: ExposedAccessor, param3?: string, param4: int = -1): void {
        super.$ctor();
        this.m_ExposedStructure = param1;
        this.m_ExposedAccessor = param2;
        this.m_ReferencedObjectId = param3;
        this.m_VectorIndex = param4;
    }

    public get exposedStructure(): ExposedStructure {
        return this.m_ExposedStructure;
    }

    public get exposedAccessor(): ExposedAccessor {
        return this.m_ExposedAccessor;
    }

    public get referencedObjectId(): string {
        return this.m_ReferencedObjectId;
    }

    public get vectorIndex(): int {
        return this.m_VectorIndex;
    }

    public Destroy(): void {
        this.m_ExposedStructure = null;
        this.m_ExposedAccessor = null;
        this.m_ReferencedObjectId = "";
        this.m_VectorIndex = -1;
    }
}
