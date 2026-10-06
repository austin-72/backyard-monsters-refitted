import * as as3 from "as3";
import { Vector } from "as3";
import { Event } from "flash/events";
import { BaseTemplate } from "@game";

export class BasePlannerServiceEvent extends Event {
    static {
        as3.fields(this, { _templatesList: null });
    }

    public static readonly LOADED_TEMPLATES_LIST: string = "loadedTemplateList";
    private _templatesList: Vector<BaseTemplate>;

    public $ctor(param1?: string, param2?: any /* Vector<BaseTemplate> */): void {
        super.$ctor(param1);
        this._templatesList = param2;
    }

    public get templatesList(): Vector<BaseTemplate> {
        return this._templatesList;
    }
}
