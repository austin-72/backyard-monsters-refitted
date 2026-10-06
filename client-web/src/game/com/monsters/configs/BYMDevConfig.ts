import * as as3 from "as3";
import { ASObject } from "as3";
import { BYMConfig } from "@game";

export class BYMDevConfig extends BYMConfig {
    public $ctor(param1?: any /* InstanceEnforcer */): void {
        super.$ctor(this.enforcerInstance);
    }

    public static get instance(): BYMConfig {
        BYMConfig._instance = as3.cast(BYMConfig._instance || new BYMDevConfig(new InstanceEnforcer()), BYMConfig);
        return BYMConfig._instance;
    }
}

class InstanceEnforcer extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }
}
