import * as as3 from "as3";
import { Vector, int } from "as3";
import { MouseEvent } from "flash/events";
import { BasePlannerNodeEvent, BasePlannerPopup_ExplorerItem_Type, PLANNER, PlannerExplorer, PlannerItem, PlannerNode } from "@game";

export class PlannerExplorerButton extends PlannerItem {
    static {
        as3.fields(this, { _nodeList: null, _clicked: false });
    }

    private _nodeList: Vector<PlannerNode>;
    private _clicked: boolean;

    public $ctor(param1?: PlannerNode): void {
        super.$ctor();
        this._nodeList = new Vector<PlannerNode>(0, false, PlannerNode);
        this.mc = new BasePlannerPopup_ExplorerItem_Type();
        this.addChild(this.mc);
        this.mc.tLabel.htmlText = param1.displayName;
        this.mc.tLabel.mouseEnabled = false;
        this.mc.mcFrame.gotoAndStop("off");
        this.mc.buttonMode = true;
        this._clicked = false;
        this.increment(param1);
    }

    public get displayName(): string {
        return as3.vget(this._nodeList, 0).displayName;
    }

    public override onClick(param1: MouseEvent = null): void {
        if (this.alpha > 0) {
            this.toggleSelection();
            this.dispatchEvent(new BasePlannerNodeEvent(PlannerExplorer.EXPLORER_ITEM_CLICK, as3.vget(this._nodeList, this._nodeList.length - 1)));
            param1.stopImmediatePropagation();
        }
    }

    public increment(param1: PlannerNode): void {
        this._nodeList.push(param1);
        this.mc.mcLevel.tLabel.htmlText = this._nodeList.length;
    }

    public clear(): void {
        as3.vsetLength(this._nodeList, 0);
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClick));
        this.removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onRollOver));
        this.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onRollOut));
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onMouseDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onMouseUp));
    }

    public decrement(param1: boolean = true): PlannerNode {
        if (this._nodeList.length - 1 <= 0) {
            this.alpha = 0;
        }
        this.mc.mcLevel.tLabel.htmlText = this._nodeList.length - 1;
        if (this._nodeList.length - 1 > 0 && param1) {
            PLANNER.basePlanner.popup.designView.addInventoryItem(as3.vget(this._nodeList, this._nodeList.length - 2));
        } else {
            this.mc.mcFrame.gotoAndStop("off");
        }
        return as3.cast(this._nodeList.pop(), PlannerNode);
    }

    /**
     * Inferno-only: takes this very node out (a wall the Yard Planner's wall line placed), with no next one
     * put on the mouse. decrement() is for placing by hand: it takes the last node, the one the mouse
     * carried, and puts the next on the mouse. Used by the wall line it took the wrong node out (the line
     * places walls in its own order) and left a wall on the mouse, so a wall already placed came back up
     * in storage and was placed twice: two walls on one spot and a gap in the line.
     */
    public ioRemoveExact(param1: PlannerNode): void {
        let i: int = this._nodeList.indexOf(param1) | 0;
        if (i == -1) {
            i = (this._nodeList.length - 1) | 0;
        }
        if (i >= 0) {
            this._nodeList.splice(i, 1);
        }
        this.mc.mcLevel.tLabel.htmlText = this._nodeList.length;
        if (this._nodeList.length <= 0) {
            this.alpha = 0;
            this.mc.mcFrame.gotoAndStop("off");
        }
    }

    public isNew(): boolean {
        return this._nodeList.length < 2;
    }

    public get numBuildings(): int {
        return this._nodeList.length | 0;
    }

    public cleanSelection(param1: string): void {
        if (param1 != this.displayName) {
            this._clicked = false;
            this.mc.mcFrame.gotoAndStop("off");
        }
    }

    public toggleSelection(param1: int = -1): void {
        if (param1 == -1) {
            this._clicked = !this._clicked;
        } else {
            this._clicked = Boolean(param1);
        }
        if (this._clicked) {
            this.mc.mcFrame.gotoAndStop("on");
        } else {
            this.mc.mcFrame.gotoAndStop("off");
        }
    }

    public override onRollOver(param1: MouseEvent = null): void {
        if (this.alpha > 0) {
            this.mc.mcFrame.gotoAndStop("on");
            this.dispatchEvent(new BasePlannerNodeEvent(PlannerExplorer.EXPLORER_ITEM_OVER, as3.vget(this._nodeList, 0)));
            param1.stopImmediatePropagation();
        }
    }

    public override onRollOut(param1: MouseEvent = null): void {
        if (this.alpha > 0) {
            if (!this._clicked) {
                this.mc.mcFrame.gotoAndStop("off");
            }
            this.dispatchEvent(new BasePlannerNodeEvent(PlannerExplorer.EXPLORER_ITEM_OUT, as3.vget(this._nodeList, 0)));
            param1.stopImmediatePropagation();
        }
    }

    public override onMouseDown(param1: MouseEvent = null): void {
    }

    public override onMouseUp(param1: MouseEvent = null): void {
    }
}
