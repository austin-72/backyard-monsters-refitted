import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ITickable, MonsterBase } from "@game";

export class Component extends ASObject implements ITickable {
    static {
        as3.implement(this, [ITickable]);
        as3.fields(this, { owner: null, name: null, priority: 0 });
    }

    public owner: MonsterBase;
    public name: string;
    public priority: uint;

    public $ctor(): void {
        super.$ctor();
    }

    public register(param1: MonsterBase, param2: string = null): void {
        if (!this.owner) {
        }
        if (!param2 || param2 == "") {
            param2 = String(this);
        }
        this.name = param2;
        this.owner = param1;
        this.onRegister();
    }

    public unregister(): void {
        if (!this.owner) {
            return;
        }
        this.onUnregister();
        this.owner = null;
        this.name = null;
    }

    protected onUnregister(): void {
    }

    protected onRegister(): void {
    }

    public tick(param1: int = 1): void {
    }

    public destoy(): void {
    }

    public clone(): Component {
        let _loc1_: Component = new Component();
        _loc1_.name = this.name;
        _loc1_.priority = this.priority;
        _loc1_.owner = this.owner;
        return _loc1_;
    }
}
