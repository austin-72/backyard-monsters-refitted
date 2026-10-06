import * as as3 from "as3";
import { ASObject, int } from "as3";

export class MapRoom3FriendData extends ASObject {
    static {
        as3.fields(this, { m_FacebookId: null, m_Name: null, m_UserId: 0, m_Level: 0, m_World: 0, m_BaseX: 0, m_BaseY: 0, m_IsInPlayersWorld: false });
    }

    private m_FacebookId: string;
    private m_Name: string;
    private m_UserId: int;
    private m_Level: int;
    private m_World: int;
    private m_BaseX: int;
    private m_BaseY: int;
    private m_IsInPlayersWorld: boolean;

    public $ctor(param1?: any): void {
        super.$ctor();
        this.Map(param1);
    }

    public get facebookId(): string {
        return this.m_FacebookId;
    }

    public get name(): string {
        return this.m_Name;
    }

    public get userId(): int {
        return this.m_UserId;
    }

    public get level(): int {
        return this.m_Level;
    }

    public get world(): int {
        return this.m_World;
    }

    public get baseX(): int {
        return this.m_BaseX;
    }

    public get baseY(): int {
        return this.m_BaseY;
    }

    public get isInPlayersWorld(): boolean {
        return this.m_IsInPlayersWorld;
    }

    public Map(param1: any): void {
        this.m_FacebookId = param1.hasOwnProperty("fbid") ? String(param1["fbid"]) : "";
        this.m_Name = param1.hasOwnProperty("name") ? String(param1["name"]) : "";
        this.m_UserId = param1.hasOwnProperty("userid") ? param1["userid"] | 0 : -1;
        this.m_Level = param1.hasOwnProperty("level") ? param1["level"] | 0 : 0;
        this.m_World = param1.hasOwnProperty("worldid") ? param1["worldid"] | 0 : 0;
        this.m_BaseX = param1.hasOwnProperty("x") ? param1["x"] | 0 : 0;
        this.m_BaseY = param1.hasOwnProperty("y") ? param1["y"] | 0 : 0;
        this.m_IsInPlayersWorld = Boolean(param1.hasOwnProperty("x") && param1.hasOwnProperty("y"));
    }
}
