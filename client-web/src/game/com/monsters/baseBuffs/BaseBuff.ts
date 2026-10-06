import * as as3 from "as3";
import { ASObject, uint } from "as3";

export class BaseBuff extends ASObject {
    static {
        as3.fields(this, { value: NaN, m_id: 0, m_name: null, m_imageURL: null });
    }

    public value: number;
    protected m_id: uint;
    protected m_name: string;
    protected m_imageURL: string;

    public $ctor(param1: string = "", param2: string = ""): void {
        super.$ctor();
        this.m_name = param1;
        this.m_imageURL = param2;
    }

    public get description(): string {
        return "";
    }

    public get id(): uint {
        return this.m_id;
    }

    public get name(): string {
        return this.m_name;
    }

    public get imageURL(): string {
        return this.m_imageURL;
    }

    public set id(param1: uint) {
        this.m_id = param1;
    }

    public apply(): void {
    }

    public clear(): void {
    }

    protected getValue(): number {
        return this.value;
    }
}
