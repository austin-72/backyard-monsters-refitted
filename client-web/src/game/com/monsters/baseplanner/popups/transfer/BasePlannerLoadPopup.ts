import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { BasePlannerEvent, BasePlannerTransferEvent, BasePlannerTransferPopup, BasePlannerTransferRow, BaseTemplate, KEYS } from "@game";

export class BasePlannerLoadPopup extends BasePlannerTransferPopup {
    public $ctor(): void {
        super.$ctor();
        this.tTitle.htmlText = KEYS.Get("basePlanner_loadtitle");
    }

    public override updateList(param1: Vector<BaseTemplate>): void {
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
        while (_loc4_ < _loc3_) {
            _loc5_ = _loc4_ >= _loc3_ ? null : as3.vget(param1, _loc4_);
            (_loc6_ = new BasePlannerTransferRow(_loc5_, _loc4_ >>> 0)).canEdit = false;
            _loc6_.bTransfer.SetupKey("basePlanner_btnLoadLayout");
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
        return KEYS.Get("basePlanner_btnLoad");
    }

    protected override clickedTransfer(param1: Event): void {
        let _loc2_: BasePlannerTransferRow = as3.as(param1.currentTarget, BasePlannerTransferRow);
        this.dispatchEvent(new BasePlannerTransferEvent(BasePlannerEvent.LOAD, _loc2_.slot));
    }
}
