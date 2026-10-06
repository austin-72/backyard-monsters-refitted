import * as as3 from "as3";
import { int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { BasePlannerNodeEvent, BasePlannerPopup_DisplayItem_Building, Console, GLOBAL, KEYS, PLANNER, PlannerDesignView, PlannerItem, PlannerNode } from "@game";

export class BuildingItem extends PlannerItem {
    static {
        as3.fields(this, { props: null, node: null, category: null, desc: null, mcX: NaN, mcY: NaN, mcSize: NaN });
    }

    public static readonly TYPE_DEFENSIVE: string = "defensive";

    public static readonly TYPE_BUILDING: string = "building";

    public static readonly TYPE_RESOURCE: string = "resource";

    public static readonly TYPE_DECORATION: string = "decoration";

    public static readonly TYPE_TRAP: string = "trap";

    public static readonly TYPE_WALL: string = "wall";

    public static readonly TYPE_MISC: string = "misc";

    /**
     * The icon clip has one frame per building id, but only the overworld buildings were ever
     * drawn: the frames of the Inferno-only ids are blank. They borrow the icon of the overworld
     * building they correspond to.
     */
    private static readonly ICON_ALIASES: any = { 130: 20, 128: 15 };
    public props: any;
    public node: PlannerNode;
    public category: string;
    public desc: string;
    private mcX: number;
    private mcY: number;
    private mcSize: number;

    public $ctor(param1?: PlannerNode): void {
        super.$ctor();
        this.node = param1;
        this.mc = new BasePlannerPopup_DisplayItem_Building();
        this.addChild(this.mc);
        if (GLOBAL._buildingProps[this.node.type - 1].type == "decoration") {
            this.size = new Rectangle(0, 0, GLOBAL._buildingProps[this.node.type - 1].size, GLOBAL._buildingProps[this.node.type - 1].size);
        } else {
            this.size = new Rectangle(0, 0, this.node.building._footprint[0].width, this.node.building._footprint[0].height);
        }
        this.category = this.defineCategory(this.node.type);
        this.desc = this.node.name + " " + KEYS.Get("basePlanner_buildingLevel") + this.node.level;
        this.x = ((this.node.x / PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) | 0) * PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        this.y = ((this.node.y / PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD) | 0) * PlannerDesignView.MOUSE_POSITION_SNAP_THRESHHOLD;
        this.setPositionReference();
        this.mc.width = this.size.width;
        this.mc.height = this.size.height;
        this.mcSize = this.mc.width;
        this.mc.x = this.mc.width / 2;
        this.mc.y = this.mc.height / 2;
        this.mc.mcFrame.gotoAndStop(1);
        this.mc.mcBG.gotoAndStop(this.category);
        if (this.category == BuildingItem.TYPE_TRAP && this.node.type == 117) {
            this.mc.mcBG.gotoAndStop("htrap");
        }
        this.mc.mcIcon.gotoAndStop(BuildingItem.iconFrameFor(this.node.type));
        this.mc.mcInvalid.visible = false;
        this.toggleMoreInfo(false);
    }

    public static iconFrameFor(param1: int): int {
        return BuildingItem.ICON_ALIASES.hasOwnProperty(param1) ? BuildingItem.ICON_ALIASES[param1] | 0 : param1;
    }

    public rangeCategory(): uint {
        if (GLOBAL._buildingProps[this.node.type - 1].attackType) {
            return GLOBAL._buildingProps[this.node.type - 1].attackType >>> 0;
        }
        return 0;
    }

    public updateScale(param1: number): void {
        this.scaleX = this.scaleY = param1;
    }

    public get scale(): number {
        return this.scaleX;
    }

    public get widthsize(): number {
        return this.mcSize;
    }

    public defineCategory(param1: int): string {
        let _loc2_: string = null;
        this.props = GLOBAL._buildingProps[param1 - 1];
        if (!this.props) {
            Console.warning("props fail" + param1);
            return null;
        }
        let _loc3_: int = this.props.group | 0;
        let _loc4_: string = String(this.props.type);
        switch (_loc3_) {
            case 1:
                _loc2_ = BuildingItem.TYPE_RESOURCE;
                break;
            case 2:
                _loc2_ = BuildingItem.TYPE_BUILDING;
                break;
            case 3:
                _loc2_ = BuildingItem.TYPE_DEFENSIVE;
                if (_loc4_ == "wall") {
                    _loc2_ = BuildingItem.TYPE_WALL;
                } else if (_loc4_ == "trap") {
                    _loc2_ = BuildingItem.TYPE_TRAP;
                }
                break;
            case 4:
                _loc2_ = BuildingItem.TYPE_DECORATION;
                break;
            default:
                _loc2_ = BuildingItem.TYPE_MISC;
        }
        return _loc2_;
    }

    public setPositionReference(): Point {
        this.mcX = this.x;
        this.mcY = this.y;
        this.node.place(this.x | 0, this.y | 0);
        return new Point(this.mcX, this.mcY);
    }

    public resetPositionReference(): void {
        this.x = this.mcX;
        this.y = this.mcY;
    }

    public toggleMoreInfo(param1: boolean = false, param2: boolean = true): void {
        if (this.node.category == PlannerNode.TYPE_DECORATION) {
            this.mc.mcFort.mcLevel.tLabel.visible = false;
            this.mc.mcFort.mcLevel.tLabel.htmlText = "";
            this.mc.mcLevel.tLabel.htmlText = "";
            this.mc.mcLevel.tLabel.visible = false;
            return;
        }
        if (Boolean(this.node.level) && param1) {
            this.mc.mcLevel.tLabel.htmlText = this.node.level;
            this.mc.mcLevel.tLabel.visible = true;
        } else {
            this.mc.mcLevel.tLabel.htmlText = "";
            this.mc.mcLevel.tLabel.visible = false;
        }
        if (this.node.fortification && param1 && param2) {
            this.mc.mcFort.mcLevel.tLabel.htmlText = this.node.fortification;
            this.mc.mcFort.mcLevel.tLabel.visible = true;
        } else {
            this.mc.mcFort.mcLevel.tLabel.htmlText = "";
            this.mc.mcFort.mcLevel.tLabel.visible = false;
        }
    }

    public toggleInvalid(param1: boolean = false): void {
        this.mc.mcInvalid.visible = param1;
    }

    public override onMouseDown(param1: MouseEvent = null): void {
        super.onMouseDown(param1);
    }

    public override onMouseUp(param1: MouseEvent = null): void {
        super.onMouseDown(param1);
        if (!PLANNER.basePlanner.popup.designView._dragged) {
            this.dispatchEvent(new BasePlannerNodeEvent(PlannerDesignView.BUILDING_CLICK, this.node));
        }
    }

    public override onRollOver(param1: MouseEvent = null): void {
        this.dispatchEvent(new BasePlannerNodeEvent(PlannerDesignView.BUILDING_OVER, this.node));
        this.mc.mcFrame.gotoAndStop("on");
    }

    public override onRollOut(param1: MouseEvent = null): void {
        this.dispatchEvent(new BasePlannerNodeEvent(PlannerDesignView.BUILDING_OUT, this.node));
        this.mc.mcFrame.gotoAndStop("off");
    }

    public addShadow(): void {
        let _loc1_: DropShadowFilter = new DropShadowFilter();
        _loc1_.distance = 5;
        _loc1_.angle = 45;
        _loc1_.color = 0;
        _loc1_.alpha = 0.5;
        _loc1_.blurX = 3;
        _loc1_.blurY = 3;
        _loc1_.strength = 1;
        _loc1_.quality = 15;
        this.mc.filters = new Array(_loc1_);
    }

    public removeShadow(): void {
        this.mc.filters = [];
    }
}
