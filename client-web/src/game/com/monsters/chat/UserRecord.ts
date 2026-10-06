import * as as3 from "as3";
import { ASObject } from "as3";

export class UserRecord extends ASObject {
    static {
        as3.fields(this, { name: null, id: null });
    }

    private name: string;
    private id: string;

    public $ctor(param1?: string, param2: string = null): void {
        super.$ctor();
        this.name = param2;
        this.id = param1;
    }

    public get Name(): string {
        return this.name;
    }

    public get Id(): string {
        return this.id;
    }
}
