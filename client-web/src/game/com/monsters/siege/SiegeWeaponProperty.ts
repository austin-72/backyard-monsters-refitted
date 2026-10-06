import * as as3 from "as3";
import { ASObject, int } from "as3";
import { KEYS, SiegeWeapon } from "@game";

export class SiegeWeaponProperty extends ASObject {
    static {
        as3.fields(this, { label: null, order: 0, descriptionKey: null, _values: null });
    }

    public label: string;
    public order: int;
    public descriptionKey: string;
    private _values: any[];

    public $ctor(param1?: any[], param2: int = 0): void {
        super.$ctor();
        this._values = param1;
        this.order = param2;
    }

    public get values(): any[] {
        return this._values;
    }

    public getDescription(param1: int): string {
        return KEYS.Get(this.descriptionKey, { "v1": this.getValueForLevel(param1) });
    }

    public getValueForLevel(param1: int): any {
        return this._values[Math.max(0, Math.min(param1, SiegeWeapon.MAX_LEVEL)) - 1];
    }

    public getProgressForLevel(param1: int): number {
        return this._values[Math.max(0, Math.min(param1, SiegeWeapon.MAX_LEVEL)) - 1] / this._values[SiegeWeapon.MAX_LEVEL - 1];
    }
}
