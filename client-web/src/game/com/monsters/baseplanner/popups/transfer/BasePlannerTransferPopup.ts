import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { BasePlanner, BasePlannerTransferRow, BasePlannerTransfer_CLIP, BaseTemplate, ScalableFrame } from "@game";

export class BasePlannerTransferPopup extends BasePlannerTransfer_CLIP {
    static {
        as3.fields(this, { _rows: null, _rowsContainer: null, _frame: null });
    }

    public static readonly CLICKED_TRANSFER: string = "clickTransfer";
    protected _rows: Vector<BasePlannerTransferRow>;
    protected _rowsContainer: Sprite;
    private _frame: ScalableFrame;

    public $ctor(): void {
        super.$ctor();
    }

    public updateList(param1: Vector<BaseTemplate>): void {
        let _loc2_: uint = 0;
        let _loc5_: BaseTemplate = null;
        let _loc6_: BasePlannerTransferRow = null;
        if (this._rowsContainer) {
            this.mcRowContainer.removeChild(this._rowsContainer);
        }
        this._rowsContainer = new Sprite();
        this._rows = new Vector<BasePlannerTransferRow>(0, false, BasePlannerTransferRow);
        let _loc3_: uint = param1.length >>> 0;
        let _loc4_: int = 0;
        while (_loc4_ < BasePlanner.maxNumberOfSlots) {
            _loc5_ = _loc4_ >= _loc3_ ? null : as3.vget(param1, _loc4_);
            _loc6_ = new BasePlannerTransferRow(_loc5_, _loc4_ >>> 0);
            if (!_loc5_ && _loc4_ >= BasePlanner.slots) {
                _loc6_.disable();
            }
            _loc6_.bTransfer.SetupKey("basePlanner_btnSaveLayout");
            _loc6_.addEventListener(BasePlannerTransferPopup.CLICKED_TRANSFER, as3.bind(this, this.clickedTransfer));
            _loc6_.y = _loc2_;
            this._rowsContainer.addChild(_loc6_);
            _loc2_ = (_loc2_ + (_loc6_.height + 5)) >>> 0;
            this._rows.push(_loc6_);
            _loc4_++;
        }
        this.mcRowContainer.addChild(this._rowsContainer);
        this.mcFrame.height = this.mcRowContainer.height + 80;
        this.mcFrame.resize();
    }

    public override get name(): string {
        return "UNASSIGNED";
    }

    protected clickedTransfer(param1: Event): void {
    }

    public clear(): void {
    }

    public override set name(value: string) {
        super.name = value;
    }
}
