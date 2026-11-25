import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BASE, BasePlannerEvent, BasePlannerTransferEvent, BasePlannerTransferPopup, BasePlannerTransferRow, BaseTemplate, GLOBAL, IoMapUi, IoPlanShare, KEYS } from "@game";

export class BasePlannerLoadPopup extends BasePlannerTransferPopup {
    public $ctor(): void {
        super.$ctor();
        // (Inferno-only, 12 November: the outposts share their 10 slots)
        this.tTitle.htmlText = KEYS.Get(GLOBAL.INFERNO_ONLY && BASE.isOutpost ? "io_plan4_load_title" : "basePlanner_loadtitle");
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
            this.ioWireRow(_loc6_);
            if (GLOBAL.INFERNO_ONLY && BasePlannerTransferRow.ioIsEmpty(_loc5_)) {
                // (QoL #680: an empty slot can't be loaded: loading one put every building into storage, as Clear does)
                _loc6_.ioGreyOut();
            }
            _loc6_.y = _loc2_;
            this._rowsContainer.addChild(_loc6_);
            _loc2_ = (_loc2_ + (_loc6_.height + 5)) >>> 0;
            this._rows.push(_loc6_);
            _loc4_++;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #694: "Current yard" under the slots: the plan goes back to the yard as it stands)
            let current: any = IoMapUi.button(KEYS.Get("io_plan_current"), 302, 28, (e: MouseEvent): void => {
                this.dispatchEvent(new BasePlannerTransferEvent(BasePlannerEvent.IO_CURRENT, 0));
            }, "gold", 11);
            current.name = "ioPlanCurrent";
            current.x = 111;
            current.y = _loc2_ + 2;
            this._rowsContainer.addChild(current);
            // (QoL #492: a slot saved over or deleted keeps what it had for 7 days: "Earlier versions..." lists them, with Restore)
            if (BasePlannerTransferRow.ioSlotButtons) {
                let earlier: any = IoMapUi.button(KEYS.Get("io_plan3_previous_btn"), 302, 24, (e: MouseEvent): void => {
                    IoPlanShare.ShowChooser("import", "previous");
                }, "grey", 10);
                earlier.name = "ioPlan3Previous";
                earlier.x = 111;
                earlier.y = _loc2_ + 34;
                this._rowsContainer.addChild(earlier);
            }
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
