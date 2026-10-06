import * as as3 from "as3";
import { ASObject, int } from "as3";

/**
 * Neutral user type for chat system abstraction.
 * Replaces direct dependency on SmartFoxServer User type.
 */
export class ChatUser extends ASObject {
    static {
        as3.fields(this, { _id: 0, _name: null, _variables: null });
    }

    private _id: int;
    private _name: string;
    private _variables: any;

    public $ctor(id?: int, name?: string): void {
        super.$ctor();
        this._id = id;
        this._name = name;
        this._variables = {};
    }

    public get id(): int {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public getVariable(key: string): any {
        return this._variables[key];
    }

    public setVariable(key: string, value: any): void {
        this._variables[key] = value;
    }

    public hasVariable(key: string): boolean {
        return key in this._variables;
    }
}
