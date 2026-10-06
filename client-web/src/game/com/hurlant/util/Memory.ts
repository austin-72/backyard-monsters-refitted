import { ASObject, uint } from "as3";
import { LocalConnection } from "flash/net";
import { System } from "flash/system";

export class Memory extends ASObject {

    public static gc(): void {
        // force a GC
        try {
            new LocalConnection().connect('foo');
            new LocalConnection().connect('foo');
        } catch (e) {
        }
    }

    public static get used(): uint {
        return System.totalMemory;
    }
}
