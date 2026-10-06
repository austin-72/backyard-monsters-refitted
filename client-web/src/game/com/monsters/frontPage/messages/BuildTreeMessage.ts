import * as as3 from "as3";
import { int } from "as3";
import { BuildingEvent, GLOBAL, KeywordMessage, LOGGER } from "@game";

export class BuildTreeMessage extends KeywordMessage {
    static {
        as3.fields(this, { _buildingType: 0 });
    }

    protected _buildingType: int;

    public $ctor(param1?: string, param2?: any /* int */, param3: string = null): void {
        this._buildingType = param2;
        super.$ctor(param1, param3);
        this.name = this._keyword;
    }

    protected placedForConstruction(param1: BuildingEvent): void {
        if (param1.building._type == this._buildingType) {
            GLOBAL.eventDispatcher.removeEventListener(BuildingEvent.PLACED_FOR_CONSTRUCTION, as3.bind(this, this.placedForConstruction));
            LOGGER.StatB({ "st1": "GTP", "st2": "Action", "value": 1 }, this._buttonCopy);
        }
    }

    protected targetHasUpgraded(param1: BuildingEvent): void {
        if (param1.building._type == this._buildingType) {
            GLOBAL.eventDispatcher.removeEventListener(BuildingEvent.UPGRADED, as3.bind(this, this.targetHasUpgraded));
            LOGGER.StatB({ "st1": "GTP", "st2": "Action", "value": 1 }, this._buttonCopy);
        }
    }
}
