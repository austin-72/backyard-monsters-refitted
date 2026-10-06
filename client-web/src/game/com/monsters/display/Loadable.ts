import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Loader } from "flash/display";

export class Loadable extends ASObject {
    static {
        as3.fields(this, { callbacks: null, tries: 0, loadState: 0, loader: null, key: null, tryLimit: 5, shouldPrepend: true, priority: 0 });
    }

    public callbacks: any[];
    public tries: uint;
    public loadState: uint;
    public loader: Loader;
    public key: string;
    public tryLimit: uint;
    public shouldPrepend: boolean;
    public priority: int;

    public $ctor(): void {
        super.$ctor();
        this.callbacks = [].concat();
        this.tries = 0;
        this.loader = new Loader();
    }

    public toString(): string {
        return "[object Loadable key:" + this.key + ", loadState:" + this.loadState + "]";
    }
}
