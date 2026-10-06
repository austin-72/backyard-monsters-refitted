import * as as3 from "as3";
import { Vector, int } from "as3";
import { Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BasePlannerNodeEvent, BasePlannerPopup, BuildingItem, PlannerExplorerButton, PlannerExplorerHeader, PlannerNode } from "@game";

export class PlannerExplorer extends Sprite {
    static {
        as3.fields(this, { _canvas: null, _layerHeaders: null, _inventoryData: null, _headers: null, _lastClickedItem: null });
    }

    public static readonly EXPLORER_ITEM_CLICK: string = "explorer_item_click";

    public static readonly EXPLORER_ITEM_OVER: string = "explorer_item_over";

    public static readonly EXPLORER_ITEM_OUT: string = "explorer_item_out";

    public static readonly EXPLORER_CHANGE: string = "explorer_change";
    private _canvas: Sprite;
    private _layerHeaders: Sprite;
    private _inventoryData: Vector<PlannerNode>;
    private _headers: Vector<PlannerExplorerHeader>;
    private _lastClickedItem: string;

    public $ctor(param1?: Vector<PlannerNode>): void {
        super.$ctor();
        this._inventoryData = param1;
        this._canvas = new Sprite();
        this.addChild(this._canvas);
        this._layerHeaders = new Sprite();
        this._canvas.addChild(this._layerHeaders);
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClick));
        this._canvas.x = 0;
        this._canvas.y = 0;
        this._headers = new Vector<PlannerExplorerHeader>(0, false, PlannerExplorerHeader);
        as3.vset(this._headers, 0, new PlannerExplorerHeader(BuildingItem.TYPE_DEFENSIVE));
        as3.vset(this._headers, 1, new PlannerExplorerHeader(BuildingItem.TYPE_BUILDING));
        as3.vset(this._headers, 2, new PlannerExplorerHeader(BuildingItem.TYPE_RESOURCE));
        as3.vset(this._headers, 3, new PlannerExplorerHeader(BuildingItem.TYPE_TRAP));
        as3.vset(this._headers, 4, new PlannerExplorerHeader(BuildingItem.TYPE_WALL));
        as3.vset(this._headers, 5, new PlannerExplorerHeader(BuildingItem.TYPE_DECORATION));
        let _loc2_: int = 0;
        while (_loc2_ < this._headers.length) {
            this._layerHeaders.addChild(as3.vget(this._headers, _loc2_));
            as3.vget(this._headers, _loc2_).addEventListener(PlannerExplorer.EXPLORER_CHANGE, as3.bind(this, this.onExplorerUpdate));
            _loc2_++;
        }
    }

    private sortInventoryData(): void {
        as3.sort(this._inventoryData, as3.bind(this, this.plannerNodeSort));
    }

    private plannerNodeSort(param1: PlannerNode, param2: PlannerNode): number {
        if (param1.name < param2.name) {
            return -1;
        }
        if (param1.name > param2.name) {
            return 1;
        }
        if (param1.level < param2.level) {
            return -1;
        }
        if (param1.level > param2.level) {
            return 1;
        }
        return 0;
    }

    public setup(): void {
        this.sortInventoryData();
        let _loc1_: int = 0;
        while (_loc1_ < this._inventoryData.length) {
            this.addElement(as3.vget(this._inventoryData, _loc1_), false, false);
            _loc1_++;
        }
        this.reposition();
    }

    public redraw(): void {
        this.clearHeaders();
        this.setup();
    }

    private clearHeaders(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this._headers.length) {
            as3.vget(this._headers, _loc1_).clear();
            _loc1_++;
        }
    }

    public clearSelections(param1: boolean = false): void {
        if (param1) {
            this._lastClickedItem = "";
        }
        let _loc2_: int = 0;
        while (_loc2_ < this._headers.length) {
            as3.vget(this._headers, _loc2_).deselectChildren(this._lastClickedItem);
            _loc2_++;
        }
    }

    public addElement(param1: PlannerNode, param2: boolean = true, param3: boolean = true): void {
        let _loc5_: PlannerExplorerButton = null;
        let _loc4_: int = 0;
        if ((_loc4_ = this.getCategoryIndex(param1.category)) >= this._headers.length) {
            return;
        }
        _loc5_ = as3.vget(this._headers, _loc4_).addElement(param1);
        if (param3) {
            this._inventoryData.push(param1);
        }
        if (_loc5_.isNew()) {
            _loc5_.addEventListener(PlannerExplorer.EXPLORER_ITEM_CLICK, as3.bind(this, this.onClickBuilding));
            _loc5_.addEventListener(PlannerExplorer.EXPLORER_ITEM_OVER, as3.bind(this, this.onOverBuilding));
            _loc5_.addEventListener(PlannerExplorer.EXPLORER_ITEM_OUT, as3.bind(this, this.onOutBuilding));
        }
        this.sortInventoryData();
        if (param2) {
            this.reposition();
        }
    }

    public onClick(param1: MouseEvent = null): void {
        this.reposition();
    }

    public onClickBuilding(param1: BasePlannerNodeEvent): void {
        let _loc2_: int = this.getCategoryIndex(param1.node.category);
        this._lastClickedItem = param1.node.displayName;
        this.reposition();
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.EXPLORER_BUILDING_CLICK, param1.node));
    }

    public onOverBuilding(param1: BasePlannerNodeEvent): void {
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT, param1.node));
    }

    public onOutBuilding(param1: BasePlannerNodeEvent): void {
        this.dispatchEvent(new BasePlannerNodeEvent(BasePlannerPopup.PLANNER_HINT_HIDE, param1.node));
    }

    public clear(): void {
        this.clearHeaders();
        this.reposition();
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClick));
    }

    public onExplorerUpdate(param1: Event = null): void {
        this.dispatchEvent(new Event(BasePlannerPopup.EXPLORER_UPDATE));
    }

    public removeBuilding(param1: BasePlannerNodeEvent): void {
        let _loc2_: int = this.getCategoryIndex(param1.node.category);
        as3.vget(this._headers, _loc2_).removeNode(param1.node);
        this._inventoryData.splice(this._inventoryData.indexOf(param1.node), 1);
        this.reposition();
    }

    private getCategoryIndex(param1: string): int {
        let _loc2_: int = 0;
        switch (param1) {
            case BuildingItem.TYPE_DEFENSIVE:
                _loc2_ = 0;
                break;
            case BuildingItem.TYPE_BUILDING:
                _loc2_ = 1;
                break;
            case BuildingItem.TYPE_RESOURCE:
                _loc2_ = 2;
                break;
            case BuildingItem.TYPE_TRAP:
                _loc2_ = 3;
                break;
            case BuildingItem.TYPE_WALL:
                _loc2_ = 4;
                break;
            case BuildingItem.TYPE_DECORATION:
                _loc2_ = 5;
                break;
            case BuildingItem.TYPE_MISC:
                _loc2_ = 6;
        }
        return _loc2_;
    }

    public reposition(param1: boolean = true): void {
        let _loc2_: int = 0;
        _loc2_ = 0;
        let _loc3_: int = this._headers.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            as3.vget(this._headers, _loc4_).y = _loc2_;
            _loc2_ = (_loc2_ + (as3.vget(this._headers, _loc4_).rePosition() + as3.vget(this._headers, _loc4_).mc.height)) | 0;
            _loc4_++;
        }
    }
}
