import * as as3 from "as3";
import { XML } from "as3";
import { ExposedStructure, Warning } from "@game";

export class ExposedObject extends ExposedStructure {
    static {
        as3.fields(this, { m_Id$ExposedObject: "" });
    }

    private m_Id$ExposedObject: string;

    public $ctor(): void {
        super.$ctor();
    }

    public get id(): string {
        return this.m_Id$ExposedObject;
    }

    public set id(param1: string) {
        this.m_Id$ExposedObject = param1;
    }

    public override LoadState(param1: XML, param2: string): void {
        let _loc3_: string = as3.str(param1.attribute("id"));
        if (this.m_Id$ExposedObject != _loc3_) {
            Warning.Show("Trying to load object with id \'" + this.m_Id$ExposedObject + "\' from state with id \'" + _loc3_ + "\'", ExposedObject);
            return;
        }
        super.LoadState(param1, param2);
    }

    public override SaveState(param1: string): XML {
        let _loc2_: XML = super.SaveState(param1);
        _loc2_.setName("object");
        _loc2_.setAttribute("id", this.m_Id$ExposedObject);
        return _loc2_;
    }
}
