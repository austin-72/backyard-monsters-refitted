import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";

export class AttackEvent extends Event {
    static {
        as3.fields(this, { _attackType: 0, _loot: null, _wasBaseDestroyed: false });
    }

    public static readonly ATTACK_OVER: string = "attackOver";
    private _attackType: int;
    private _loot: any;
    private _wasBaseDestroyed: boolean;

    public $ctor(param1?: string, param2?: boolean, param3?: any /* int */, param4?: any): void {
        this._attackType = param3;
        this._wasBaseDestroyed = param2;
        this._loot = param4;
        super.$ctor(param1);
    }

    public get wasBaseDestroyed(): boolean {
        return this._wasBaseDestroyed;
    }

    public get attackType(): int {
        return this._attackType;
    }

    public get loot(): any {
        return this._loot;
    }
}
