import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MonsterBase } from "@game";

export class CreepInfo extends ASObject {
    static {
        as3.fields(this, { m_health: NaN, ownerID: 0, self: null, queued: 0 });
    }

    private m_health: number;
    public ownerID: uint;
    public self: MonsterBase;
    public queued: uint;

    public $ctor(param1: int = 0, param2: int = 2147483647, param3: MonsterBase = null): void {
        super.$ctor();
        this.ownerID = param1 >>> 0;
        this.health = param2;
        this.self = param3;
        this.queued = 0;
    }

    public get health(): number {
        return this.m_health;
    }

    public set health(param1: number) {
        this.m_health = Number(param1 > 0 ? param1 : 0);
    }
}
