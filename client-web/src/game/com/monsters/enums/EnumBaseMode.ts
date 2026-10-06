import * as as3 from "as3";
import { ASObject } from "as3";

export class EnumBaseMode extends ASObject {
    static {
        as3.fields(this, { BUILD: "build", IBUILD: "ibuild", ATTACK: "attack", IATTACK: "iattack", WMATTACK: "wmattack", IWMATTACK: "iwmattack", VIEW: "view", IVIEW: "iview", WMVIEW: "wmview", IWMVIEW: "iwmview", HELP: "help", IHELP: "ihelp" });
    }

    public BUILD: string;
    public IBUILD: string;
    public ATTACK: string;
    public IATTACK: string;
    public WMATTACK: string;
    public IWMATTACK: string;
    public VIEW: string;
    public IVIEW: string;
    public WMVIEW: string;
    public IWMVIEW: string;
    public HELP: string;
    public IHELP: string;

    public $ctor(): void {
        super.$ctor();
    }
}
