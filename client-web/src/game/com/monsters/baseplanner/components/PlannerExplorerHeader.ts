import * as as3 from "as3";
import { Vector, int } from "as3";
import { Event, MouseEvent } from "flash/events";
import { BasePlannerPopup_ExplorerItem_Category, BuildingItem, GLOBAL, KEYS, PLANNER, PlannerExplorer, PlannerExplorerButton, PlannerItem, PlannerNode } from "@game";

export class PlannerExplorerHeader extends PlannerItem {
    static {
        as3.fields(this, { _category: null, _collapsed: false, _elementList: null });
    }

    public _category: string;
    private _collapsed: boolean;
    private _elementList: Vector<PlannerExplorerButton>;

    public $ctor(param1?: string): void {
        let _loc2_: string = null;
        super.$ctor();
        this._category = param1;
        this._elementList = new Vector<PlannerExplorerButton>(0, false, PlannerExplorerButton);
        this.mc = new BasePlannerPopup_ExplorerItem_Category();
        this.addChild(this.mc);
        switch (param1) {
            case BuildingItem.TYPE_DEFENSIVE:
                _loc2_ = KEYS.Get("basePlanner_catDefensive");
                break;
            case BuildingItem.TYPE_BUILDING:
                _loc2_ = KEYS.Get("basePlanner_catBuilding");
                break;
            case BuildingItem.TYPE_RESOURCE:
                _loc2_ = KEYS.Get("basePlanner_catResource");
                break;
            case BuildingItem.TYPE_DECORATION:
                _loc2_ = KEYS.Get("basePlanner_catDecoration");
                break;
            case BuildingItem.TYPE_TRAP:
                _loc2_ = KEYS.Get("basePlanner_catTrap");
                break;
            case BuildingItem.TYPE_WALL:
                _loc2_ = KEYS.Get("basePlanner_catWall");
                break;
            case BuildingItem.TYPE_MISC:
            default:
                _loc2_ = KEYS.Get("basePlanner_catMisc");
        }
        this.mc.tLabel.htmlText = _loc2_;
        this.mc.mcCarrot.rotation = 90;
        this.mc.mcBG.gotoAndStop(param1);
        this.mc.mcFrame.gotoAndStop("off");
        this.emptyCheck();
    }

    public override onClick(param1: MouseEvent = null): void {
        if (this._collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
        this.dispatchEvent(new Event(PlannerExplorer.EXPLORER_CHANGE));
    }

    private expand(): void {
        this._collapsed = false;
        let _loc1_: int = 0;
        while (_loc1_ < this._elementList.length) {
            as3.vget(this._elementList, _loc1_).alpha = 1;
            _loc1_++;
        }
        this.mc.mcCarrot.rotation = 90;
    }

    private collapse(): void {
        this._collapsed = true;
        let _loc1_: int = 0;
        while (_loc1_ < this._elementList.length) {
            as3.vget(this._elementList, _loc1_).alpha = 0;
            _loc1_++;
        }
        this.mc.mcCarrot.rotation = 0;
    }

    private emptyCheck(): void {
        if (this._elementList.length == 0) {
            this.mc.mcCarrot.visible = 0;
        } else {
            this.mc.mcCarrot.visible = 1;
        }
    }

    public clear(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this._elementList.length) {
            as3.vget(this._elementList, _loc1_).clear();
            _loc1_++;
        }
        as3.vsetLength(this._elementList, 0);
        this.emptyCheck();
        let _loc2_: int = 0;
        while (this.numChildren > 1) {
            if (this.getChildAt(_loc2_) != this.mc) {
                this.removeChildAt(_loc2_);
            } else {
                _loc2_++;
            }
        }
    }

    public deselectChildren(param1: string = null): void {
        let _loc2_: int = 0;
        while (_loc2_ < this._elementList.length) {
            as3.vget(this._elementList, _loc2_).cleanSelection(param1);
            _loc2_++;
        }
    }

    public removeNode(param1: PlannerNode): void {
        let _loc2_: int = 0;
        while (_loc2_ < this._elementList.length) {
            if (as3.vget(this._elementList, _loc2_).displayName == param1.displayName) {
                // Inferno-only: the wall line takes out the very wall it placed and puts nothing on the mouse
                if (GLOBAL.INFERNO_ONLY && PLANNER.basePlanner && PLANNER.basePlanner.popup && PLANNER.basePlanner.popup.designView && PLANNER.basePlanner.popup.designView.ioPlacingLine) {
                    as3.vget(this._elementList, _loc2_).ioRemoveExact(param1);
                } else {
                    as3.vget(this._elementList, _loc2_).decrement();
                }
                if (as3.vget(this._elementList, _loc2_).numBuildings <= 0) {
                    let _loc3_: PlannerExplorerButton = as3.vget(this._elementList, _loc2_);
                    _loc3_.x = 30000;
                    this._elementList.splice(_loc2_, 1);
                    this.removeChild(_loc3_);
                    _loc3_.clear();
                }
            }
            _loc2_++;
        }
        this.emptyCheck();
    }

    public override update(): void {
    }

    public rePosition(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        while (_loc2_ < this._elementList.length) {
            as3.vget(this._elementList, _loc2_).x = 0;
            if (this._collapsed) {
                as3.vget(this._elementList, _loc2_).y = 0;
            } else {
                _loc1_ = (_loc1_ + as3.vget(this._elementList, _loc2_).height) | 0;
                as3.vget(this._elementList, _loc2_).y = _loc1_;
            }
            _loc2_++;
        }
        return _loc1_;
    }

    public addElement(param1: PlannerNode): PlannerExplorerButton {
        let _loc4_: PlannerExplorerButton = null;
        let _loc2_: boolean = true;
        let _loc3_: int = 0;
        while (_loc3_ < this._elementList.length) {
            if (as3.vget(this._elementList, _loc3_).displayName == param1.displayName) {
                as3.vget(this._elementList, _loc3_).increment(param1);
                _loc2_ = false;
                this.emptyCheck();
                return as3.vget(this._elementList, _loc3_);
            }
            _loc3_++;
        }
        if (_loc2_) {
            _loc4_ = new PlannerExplorerButton(param1);
            this._elementList.push(_loc4_);
            as3.sort(this._elementList, as3.bind(this, this.sortExplorerButtons));
            this.addChild(_loc4_);
            if (this._collapsed) {
                _loc4_.alpha = 0;
            }
            this.emptyCheck();
            return _loc4_;
        }
        return null;
    }

    private sortExplorerButtons(param1: PlannerExplorerButton, param2: PlannerExplorerButton): number {
        if (param1.displayName < param2.displayName) {
            return -1;
        }
        if (param1.displayName > param2.displayName) {
            return 1;
        }
        return 0;
    }

    public override onRollOver(param1: MouseEvent = null): void {
        this.mc.mcFrame.gotoAndStop("on");
    }

    public override onRollOut(param1: MouseEvent = null): void {
        this.mc.mcFrame.gotoAndStop("off");
    }

    public override onMouseDown(param1: MouseEvent = null): void {
    }

    public override onMouseUp(param1: MouseEvent = null): void {
    }
}
