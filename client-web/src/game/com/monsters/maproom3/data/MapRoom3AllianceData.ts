import * as as3 from "as3";
import { ASObject, int } from "as3";

export class MapRoom3AllianceData extends ASObject {
    static {
        as3.fields(this, { m_Name: null, m_AllianceId: 0, m_ImageId: 0 });
    }

    private m_Name: string;
    private m_AllianceId: int;
    private m_ImageId: int;

    public $ctor(param1?: any): void {
        super.$ctor();
        this.Map(param1);
    }

    public get name(): string {
        return this.m_Name;
    }

    public get allianceId(): int {
        return this.m_AllianceId;
    }

    public get imageId(): int {
        return this.m_ImageId;
    }

    public Map(param1: any): void {
        this.m_Name = param1.hasOwnProperty("name") ? String(param1["name"]) : "";
        this.m_AllianceId = param1.hasOwnProperty("alliance_id") ? param1["alliance_id"] | 0 : -1;
        this.m_ImageId = param1.hasOwnProperty("image") ? param1["image"] | 0 : 1;
    }
}
