import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ITargetable } from "@game";

export class DummyTarget extends ASObject implements ITargetable {
    static {
        as3.implement(this, [ITargetable]);
        as3.fields(this, { m_x: NaN, m_y: NaN });
    }

    private m_x: number;
    private m_y: number;

    public $ctor(param1?: number, param2?: number): void {
        super.$ctor();
        this.m_x = param1;
        this.m_y = param2;
    }

    public get x(): number {
        return this.m_y;
    }

    public get y(): number {
        return this.m_y;
    }

    public get defenseFlags(): int {
        return 0;
    }
}
