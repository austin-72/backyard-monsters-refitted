import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, InstanceManager, KEYS, PLANNER, PLANNERPOPUP_CLIP, STORE, plannerBuilding } from "@game";

export class PLANNERPOPUP extends PLANNERPOPUP_CLIP {
    static {
        as3.fields(this, { _thumbnailsMC: null, _buildingInfoMC: null, _windowRect: null, _dragPoint: null, _dragOffset: null, _dragging: false, _dragged: false, _buildings: null, _ranges: null, _zoom: 0.3, _toggleRanges: false, _guidePage: 1 });
    }

    public _thumbnailsMC: MovieClip;
    public _buildingInfoMC: MovieClip;
    public _windowRect: Rectangle;
    public _dragPoint: Point;
    public _dragOffset: Point;
    public _dragging: boolean;
    public _dragged: boolean;
    public _buildings: MovieClip;
    public _ranges: MovieClip;
    public _zoom: number;
    public _toggleRanges: boolean;
    private _guidePage: int;

    public $ctor(): void {
        this._windowRect = new Rectangle(35, 65, 565, 425);
        super.$ctor();
        this.tName.visible = false;
        this.mcNameBG.visible = false;
        this.tName.autoSize = "left";
        this._buildings = as3.as(this.mcMap.addChild(new MovieClip()), MovieClip);
        this._ranges = as3.as(this.mcMap.addChild(new MovieClip()), MovieClip);
        this._buildings.mouseEnabled = false;
        this._ranges.mouseEnabled = false;
        this._ranges.visible = false;
        this.Setup();
        this.title_txt.htmlText = KEYS.Get("planner_title");
    }

    public Setup(): void {
        let _loc1_: plannerBuilding = null;
        let _loc2_: Point = null;
        let _loc4_: BFOUNDATION = null;
        this.mcMap.x = this._windowRect.x + this._windowRect.width / 2;
        this.mcMap.y = this._windowRect.y + this._windowRect.height / 2;
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.DragStart));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.DragStop));
        this.mcMap.scaleX = this.mcMap.scaleY = this._zoom;
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc3_ ?? [])) {
            _loc1_ = as3.as(this._buildings.addChild(new plannerBuilding(_loc4_, this._ranges)), plannerBuilding);
        }
        this.bZoom1.SetupKey("planner_zoomout_btn");
        this.bZoom1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ToggleZoom));
        this.bZoom1.Enabled = false;
        this.bZoom2.SetupKey("planner_zoomin_btn");
        this.bZoom2.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ToggleZoom));
        this.bRanges.SetupKey("planner_showranges_btn");
        this.bRanges.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ToggleRanges));
        this.bExpand.SetupKey("planner_expand_btn");
        if (BASE.isMainYardOrInfernoMainYard) {
            if (GLOBAL.yardExpansionsBought >= GLOBAL.yardExpansionsMax) {
                this.bExpand.Enabled = false;
            } else {
                this.bExpand.Enabled = true;
                this.bExpand.addEventListener(MouseEvent.CLICK, STORE.Show(1, 1, [GLOBAL.yardExpansionItem]));
            }
            this.bExpand.visible = true;
        } else {
            this.bExpand.visible = false;
        }
        let _loc5_: int = 1;
        if (STORE._storeData.ENL) {
            _loc5_ = (STORE._storeData.ENL.q + 1) | 0;
        }
        let _loc6_: int = (_loc5_ + 2) | 0;
        while (_loc6_ < 8) {
            this.mcMap["mc" + _loc6_].visible = false;
            _loc6_++;
        }
        _loc6_ = 1;
        while (_loc6_ < _loc5_) {
            this.mcMap["mc" + _loc6_].visible = false;
            _loc6_++;
        }
        if (_loc5_ < 7) {
            this.mcMap["mc" + (_loc5_ + 1)].alpha = 0.5;
        }
    }

    public Remove(): void {
        let _loc1_: int = 0;
        while (_loc1_ < this._buildings.numChildren) {
            (as3.as(this._buildings.getChildAt(_loc1_), plannerBuilding)).Remove();
            _loc1_++;
        }
    }

    public DragStart(param1: MouseEvent = null): void {
        this._dragging = true;
        this._dragged = false;
        this._dragOffset = new Point(this.mcMap.x - this.mouseX, this.mcMap.y - this.mouseY);
        this._dragPoint = new Point(this.mcMap.x, this.mcMap.y);
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Drag));
    }

    public Drag(param1: Event = null): void {
        if (Math.abs(this.mcMap.x - (this.mouseX + this._dragOffset.x)) > 10 || Math.abs(this.mcMap.y - (this.mouseY + this._dragOffset.y)) > 10) {
            this.mcMap.x = (((this.mouseX + this._dragOffset.x) / 10) | 0) * 10;
            this.mcMap.y = (((this.mouseY + this._dragOffset.y) / 10) | 0) * 10;
            this._dragged = true;
            this.Bounds();
        }
    }

    public Bounds(): void {
        if (GLOBAL._mapWidth * this._zoom > this._windowRect.width) {
            if (this.mcMap.x + GLOBAL._mapWidth * 1.2 * this._zoom / 2 < this._windowRect.width + this._windowRect.x) {
                this.mcMap.x = this._windowRect.width + this._windowRect.x - GLOBAL._mapWidth * 1.2 * this._zoom / 2;
            }
            if (this.mcMap.y + GLOBAL._mapHeight * 1.2 * this._zoom / 2 < this._windowRect.height + this._windowRect.y) {
                this.mcMap.y = this._windowRect.height + this._windowRect.y - GLOBAL._mapHeight * 1.2 * this._zoom / 2;
            }
            if (this.mcMap.x - GLOBAL._mapWidth * 1.2 * this._zoom / 2 > this._windowRect.x) {
                this.mcMap.x = this._windowRect.x + GLOBAL._mapWidth * 1.2 * this._zoom / 2;
            }
            if (this.mcMap.y - GLOBAL._mapHeight * 1.2 * this._zoom / 2 > this._windowRect.y) {
                this.mcMap.y = this._windowRect.y + GLOBAL._mapHeight * 1.2 * this._zoom / 2;
            }
        } else {
            this.mcMap.x = this._windowRect.x + this._windowRect.width / 2;
            this.mcMap.y = this._windowRect.y + this._windowRect.height / 2;
        }
    }

    public DragStop(param1: MouseEvent = null): void {
        this._dragging = false;
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Drag));
    }

    public ToggleRanges(param1: MouseEvent = null): void {
        if (this._toggleRanges) {
            this._toggleRanges = false;
            this.bRanges.SetupKey("planner_showranges_btn");
        } else {
            this._toggleRanges = true;
            this.bRanges.SetupKey("planner_hideranges_btn");
        }
        this._ranges.visible = this._toggleRanges;
    }

    public ToggleZoom(param1: MouseEvent = null): void {
        if (param1.target.labelKey == "planner_zoomout_btn") {
            if (this._zoom == 0.75) {
                this._zoom = 0.3;
            }
            if (this._zoom == 1.2) {
                this._zoom = 0.75;
            }
        } else {
            if (this._zoom == 0.75) {
                this._zoom = 1.2;
            }
            if (this._zoom == 0.3) {
                this._zoom = 0.75;
            }
        }
        if (this._zoom == 1.2) {
            this.bZoom2.Enabled = false;
        } else {
            this.bZoom2.Enabled = true;
        }
        if (this._zoom == 0.3) {
            this.bZoom1.Enabled = false;
        } else {
            this.bZoom1.Enabled = true;
        }
        this.mcMap.scaleX = this.mcMap.scaleY = this._zoom;
        this.Bounds();
    }

    private Help(param1: MouseEvent): void {
        let _loc2_: int = 6;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("planner_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    public Hide(param1: MouseEvent = null): void {
        PLANNER.Hide();
    }

    public Resize(): void {
        this.x = 0;
        this.y = 0;
    }
}
