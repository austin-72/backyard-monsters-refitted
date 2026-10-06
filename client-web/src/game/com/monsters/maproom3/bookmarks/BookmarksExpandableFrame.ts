import * as as3 from "as3";
import { int, uint } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, MapRoom3ExpandableFrame, TweenLite } from "@game";

export class BookmarksExpandableFrame extends MapRoom3ExpandableFrame {
    static {
        as3.fields(this, { EXPAND_TWEEN_TIME: 0.5, m_Contents: null, m_MaxExpandedHeight: 0, m_ExpandUp: false, m_Expanded: true });
    }

    private EXPAND_TWEEN_TIME: number;
    private m_Contents: Sprite;
    private m_MaxExpandedHeight: uint;
    private m_ExpandUp: boolean;
    private m_Expanded: boolean;

    public $ctor(param1?: Sprite, param2?: string, param3: int = -1, param4: boolean = false): void {
        super.$ctor();
        this.headerText.htmlText = param2;
        this.headerText.mouseEnabled = false;
        this.m_Contents = param1;
        this.contentsContainer.addChild(this.m_Contents);
        this.contentsContainer.mask = this.background;
        this.m_MaxExpandedHeight = param3 != -1 ? param3 >>> 0 : this.m_Contents.height >>> 0;
        this.m_ExpandUp = param4;
        if (this.m_ExpandUp == true) {
            this.y -= this.m_MaxExpandedHeight + this.frameFooter.height;
        }
        let _loc5_: int = BASE.isInfernoMainYardOrOutpost ? 2 : 1;
        this.frameHeader.gotoAndStop(_loc5_);
        this.frameBorders.gotoAndStop(_loc5_);
        this.frameFooter.gotoAndStop(_loc5_);
        this.frameBorders.mouseEnabled = false;
        this.frameBorders.mouseChildren = false;
        this.Collapse(false);
        this.collapseExpandButton.visible = this.m_MaxExpandedHeight > 0;
        this.collapseExpandButton.buttonMode = true;
        this.collapseExpandButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCollapseExpandButtonClicked), false, 0, true);
    }

    public Clear(): void {
        this.collapseExpandButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCollapseExpandButtonClicked));
        this.contentsContainer.removeChild(this.m_Contents);
        this.m_Contents = null;
    }

    private OnCollapseExpandButtonClicked(param1: MouseEvent): void {
        if (this.m_Expanded) {
            this.Collapse();
        } else {
            this.Expand();
        }
    }

    private Expand(param1: boolean = true): void {
        if (this.m_Expanded == true) {
            return;
        }
        if (this.m_ExpandUp) {
            this.ExpandUp(param1);
        } else {
            this.ExpandDown(param1);
        }
        this.collapseExpandButton.gotoAndStop(2);
        this.m_Expanded = true;
    }

    private Collapse(param1: boolean = true): void {
        if (this.m_Expanded == false) {
            return;
        }
        if (this.m_ExpandUp) {
            this.CollapseDown(param1);
        } else {
            this.CollapseUp(param1);
        }
        this.collapseExpandButton.gotoAndStop(1);
        this.m_Expanded = false;
    }

    private ExpandDown(param1: boolean = true): void {
        let _loc2_: number = Number(param1 ? this.EXPAND_TWEEN_TIME : 0);
        let _loc3_: number = this.frameHeader.y + this.frameHeader.height + this.m_MaxExpandedHeight;
        TweenLite.to(this.background, _loc2_, { "height": this.m_MaxExpandedHeight });
        TweenLite.to(this.frameBorders, _loc2_, { "height": this.m_MaxExpandedHeight });
        TweenLite.to(this.frameFooter, _loc2_, { "y": _loc3_ });
    }

    private CollapseUp(param1: boolean = true): void {
        let _loc2_: number = Number(param1 ? this.EXPAND_TWEEN_TIME : 0);
        let _loc3_: number = this.frameHeader.y + this.frameHeader.height - this.frameFooter.height;
        TweenLite.to(this.background, _loc2_, { "height": 0 });
        TweenLite.to(this.frameBorders, _loc2_, { "height": 0 });
        TweenLite.to(this.frameFooter, _loc2_, { "y": _loc3_ });
    }

    private ExpandUp(param1: boolean = true): void {
        let _loc2_: number = Number(param1 ? this.EXPAND_TWEEN_TIME : 0);
        TweenLite.to(this, _loc2_, { "y": this.y - (this.m_MaxExpandedHeight + this.frameFooter.height) });
        this.ExpandDown(param1);
    }

    private CollapseDown(param1: boolean = true): void {
        let _loc2_: number = Number(param1 ? this.EXPAND_TWEEN_TIME : 0);
        TweenLite.to(this, _loc2_, { "y": this.y + (this.m_MaxExpandedHeight + this.frameFooter.height) });
        this.CollapseUp(param1);
    }
}
