import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, IPropertyModifier } from "@game";

export class ResourceCapacityBaseBuff extends BaseBuff {
    static {
        as3.fields(this, { m_capacityModifier: null });
    }

    public static readonly ID: uint = 10;

    public static readonly k_NAME: string = "Resource Capacity";
    private m_capacityModifier: IPropertyModifier;

    public $ctor(): void {
        super.$ctor(ResourceCapacityBaseBuff.k_NAME, "bufficons/resourcebuff.png");
    }

    public override get description(): string {
        return "";
    }

    public get value(): number {
        return this.getValue();
    }

    public override apply(): void {
    }

    public override clear(): void {
    }
}
