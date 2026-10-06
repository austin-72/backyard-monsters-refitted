import * as as3 from "as3";
import { ASObject } from "as3";

export class Channel extends ASObject {
    static {
        as3.fields(this, { name: null, type: null });
    }

    public static ADMIN: Channel; // const

    static {
        as3.lazyStatics(this, { ADMIN: null }, () => {
            Channel.ADMIN = new Channel("admin", "system");
        });
    }
    private name: string;
    private type: string;

    public $ctor(param1?: string, param2?: string): void {
        super.$ctor();
        this.name = param1;
        this.type = param2;
    }

    public get Name(): string {
        return this.name;
    }

    public get Type(): string {
        return this.type;
    }
}
