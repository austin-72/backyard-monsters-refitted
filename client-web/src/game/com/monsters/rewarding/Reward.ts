import * as as3 from "as3";
import { ASObject } from "as3";
import { IExportable } from "@game";

export class Reward extends ASObject implements IExportable {
    static {
        as3.implement(this, [IExportable]);
        as3.fields(this, { id: null, _hasBeenApplied: false, _name: null, _description: null, _value: 0 });
    }

    public id: string;
    protected _hasBeenApplied: boolean;
    protected _name: string;
    protected _description: string;
    protected _value: number;

    public $ctor(): void {
        super.$ctor();
    }

    public applyReward(): boolean {
        if (!this.canBeApplied()) {
            return false;
        }
        this._hasBeenApplied = true;
        this.onApplication();
        return true;
    }

    public canBeApplied(): boolean {
        return true;
    }

    protected onApplication(): void {
    }

    public set value(param1: number) {
        this._value = param1;
    }

    public get value(): any {
        return this._value;
    }

    public get description(): string {
        return this._description;
    }

    public get name(): string {
        return this._name;
    }

    public exportData(): any {
        let _loc1_: any = {};
        _loc1_["id"] = this.id;
        if (this.value) {
            _loc1_["value"] = this.value;
        }
        return _loc1_;
    }

    public importData(param1: any): void {
        this.id = as3.str(param1["id"]);
        if (param1["value"]) {
            this._value = Number(param1["value"]);
        }
    }

    public removed(): void {
    }

    public reset(): void {
    }

    public get hasBeenApplied(): boolean {
        return this._hasBeenApplied;
    }
}
