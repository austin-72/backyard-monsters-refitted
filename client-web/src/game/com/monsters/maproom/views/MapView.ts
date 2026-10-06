import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { Timer } from "flash/utils";
import { ImageCache, MapView_CLIP, Quad, TUTORIAL, TweenLite, com_monsters_maproom_ForeignBase as ForeignBase, com_monsters_maproom_MapRoom as MapRoom, com_monsters_maproom_MiniMap as MiniMap, com_monsters_maproom_Obstruction as Obstruction, com_monsters_maproom_PlayerLayer as PlayerLayer, map_bg_inferno } from "@game";

export class MapView extends MapView_CLIP {
    static {
        as3.fields(this, { map: null, shell: null, shell_mask: null, map_mc: null, miniMap: null, players: null, dragPoint: null, bounds: null, displayBounds: null, hardBounds: null, updateTimer: null, throwDrag: 0.28, dragging: false, bases: null, gotFirstData: false });
    }

    private static instance: MapView = null;
    public map: Sprite;
    public shell: Sprite;
    public shell_mask: Sprite;
    public map_mc: MovieClip;
    public miniMap: MiniMap;
    public players: PlayerLayer;
    private dragPoint: Point;
    private bounds: Rectangle;
    public displayBounds: Rectangle;
    public hardBounds: Rectangle;
    private updateTimer: Timer;
    private throwDrag: number;
    private dragging: boolean;
    public bases: any[];
    public gotFirstData: boolean;

    public $ctor(): void {
        super.$ctor();
        MapView.instance = this;
        this.bases = [].concat();
    }

    public static getInstance(): MapView {
        if (!MapView.instance) {
            return new MapView();
        }
        return MapView.instance;
    }

    public Clear(): void {
        TweenLite.killTweensOf(this.shell);
        if (Boolean(this.shell) && Boolean(this.shell.parent)) {
            this.shell.parent.removeChild(this.shell);
        }
        this.shell = null;
        if (Boolean(this.map_mc) && Boolean(this.map_mc.parent)) {
            this.map_mc.parent.removeChild(this.map_mc);
        }
        this.map_mc = null;
        if (Boolean(this.miniMap) && Boolean(this.miniMap.parent)) {
            this.miniMap.parent.removeChild(this.miniMap);
        }
        this.miniMap.Clear();
        this.miniMap = null;
        this.shell = null;
        this.map = null;
        this.players.Clear();
        if (Boolean(this.players) && Boolean(this.players.parent)) {
            this.players.parent.removeChild(this.players);
        }
        this.players = null;
        MapView.instance = null;
    }

    public Setup(): void {
        let i: int = 0;
        let imageLoaded: Function = null;
        imageLoaded = (param1: string, param2: BitmapData): void => {
            let key: string = param1;
            let bmd: BitmapData = param2;
            try {
                this.map_mc.addChild(new Bitmap(bmd));
            } catch (e) {
            }
        };
        this.bounds = new Rectangle(0, 0, -1760, -1760);
        this.displayBounds = new Rectangle(this.mask_mc.x, this.mask_mc.y, this.mask_mc.width, this.mask_mc.height);
        this.hardBounds = new Rectangle(this.mask_mc.x, this.mask_mc.y, -1760 + this.mask_mc.width + this.mask_mc.x, -1760 + this.mask_mc.height + this.mask_mc.y);
        this.shell = new Sprite();
        this.addChild(this.shell);
        this.shell_mask = new Sprite();
        this.shell_mask.graphics.lineStyle(1, 0);
        this.shell_mask.graphics.beginFill(16711935);
        this.shell_mask.graphics.drawRect(0, 0, 700, 385);
        this.shell_mask.graphics.endFill();
        this.addChild(this.shell_mask);
        this.map_mc = new map_bg_inferno();
        Obstruction.Clear();
        i = 1;
        while (i < this.map_mc.numChildren) {
            Obstruction.Register(this.map_mc.getChildAt(i));
            this.map_mc.getChildAt(i).visible = false;
            i++;
        }
        ImageCache.GetImageWithCallBack("ui/map.v1.jpg", imageLoaded, true, 1);
        this.map = new Sprite();
        this.map.addChild(this.map_mc);
        this.shell.addChild(this.map);
        this.shell.mask = this.shell_mask;
        this.mask_mc.visible = false;
        this.players.mapWidth = Math.abs(this.bounds.width + 260) >>> 0;
        this.players.addEventListener("down", as3.bind(this, this.onBaseDown), false, 0, true);
        this.players.addEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersData), false, 0, true);
        this.shell.addChild(this.players);
        this.map.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.shellDown));
        this.scrollTo(0.5, 0.5);
        this.miniMap = MiniMap.getInstance();
        this.miniMap.selectorSize = new Rectangle(0, 0, 529, 393);
        this.miniMap.mapSize = new Rectangle(this.displayBounds.x, this.displayBounds.y, 1760, 1760);
        this.miniMap.x = 583;
        this.miniMap.y = 8;
        this.miniMap.Setup();
        this.miniMap.dragCallBack = as3.bind(this, this.scrollTo);
        this.addChild(this.miniMap);
        this.miniMap.drawPlayerAt(this.players.player.x, this.players.player.y);
    }

    public onAdd(): void {
        if (TUTORIAL._stage < 130) {
            this.scrollToBase(this.players.basesWM[0]);
        } else {
            this.scrollToBase(this.players.player);
        }
    }

    private onPlayersData(param1: Event): void {
        if (!this.gotFirstData) {
            if (MapRoom.BRIDGE.TUTORIAL._stage < 130) {
                this.scrollToBase(this.players.basesWM[0]);
            } else {
                this.scrollToBase(this.players.player);
            }
            this.gotFirstData = true;
        }
    }

    private onBaseDown(param1: Event): void {
    }

    private scrollToBase(param1: any): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (param1) {
            _loc2_ = (-(param1.x - this.displayBounds.x) + this.displayBounds.width * 0.5) | 0;
            _loc3_ = (-(param1.y - this.displayBounds.y) + this.displayBounds.height * 0.5) | 0;
        } else {
            _loc2_ = 0;
            _loc3_ = 0;
        }
        _loc3_ -= 30;
        let _loc4_: Rectangle = new Rectangle(this.displayBounds.x, this.displayBounds.y, this.displayBounds.x + this.bounds.width + this.displayBounds.width, this.displayBounds.y + this.bounds.height + this.displayBounds.height);
        if (_loc2_ > _loc4_.x) {
            _loc2_ = _loc4_.x | 0;
        }
        if (_loc2_ < _loc4_.width) {
            _loc2_ = _loc4_.width | 0;
        }
        if (_loc3_ > _loc4_.y) {
            _loc3_ = _loc4_.y | 0;
        }
        if (_loc3_ < _loc4_.height) {
            _loc3_ = _loc4_.height | 0;
        }
        if (param1 instanceof ForeignBase) {
            MiniMap.getInstance().highlightBase(as3.cast(param1, ForeignBase));
        }
        TweenLite.to(this.shell, 0.5, { "x": _loc2_, "y": _loc3_, "ease": Quad.easeOut, "onUpdate": as3.bind(this, this.baseScrollUpdate) });
    }

    public scrollToBaseId(param1: number): void {
        let _loc2_: ForeignBase = null;
        for (_loc2_ of as3.values(this.players.basesForeign)) {
            if (_loc2_.data.baseid.Get() == param1) {
                this.scrollToBase(_loc2_);
                return;
            }
        }
    }

    private baseScrollUpdate(): void {
        let _loc1_: number = (this.shell.x - this.displayBounds.x) / (this.bounds.width + this.displayBounds.width);
        let _loc2_: number = (this.shell.y - this.displayBounds.y) / (this.bounds.height + this.displayBounds.height);
        MiniMap.getInstance().scrollTo(_loc1_, _loc2_);
    }

    private shellDown(param1: MouseEvent): void {
        TweenLite.killTweensOf(this.shell, false);
        if (TUTORIAL._stage < 110) {
            return;
        }
        this.dragging = true;
        this.dragPoint = new Point(this.stage.mouseX - this.shell.x, this.stage.mouseY - this.shell.y);
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.shellDrag), false, 0, true);
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.stageUp), false, 0, true);
    }

    public scrollTo(param1: number, param2: number, param3: boolean = false): void {
        if (!param3) {
            if (param1 > 1) {
                param1 = 1;
            }
            if (param1 < 0) {
                param1 = 0;
            }
            if (param2 > 1) {
                param2 = 1;
            }
            if (param2 < 0) {
                param2 = 0;
            }
        }
        this.shell.x = this.displayBounds.x + ((param1 * (this.bounds.width + this.displayBounds.width)) | 0);
        this.shell.y = this.displayBounds.y + ((param2 * (this.bounds.height + this.displayBounds.height)) | 0);
    }

    public Tick(): void {
        this.players.Tick();
    }

    public Get(): void {
        this.players.Get();
    }

    public Hide(...rest: any[]): void {
        this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.stageUp));
    }

    private stageUp(param1: MouseEvent): void {
        if (!this.dragging) {
            return;
        }
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.stageUp), false, 0, true);
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.shellDrag));
        let _loc2_: boolean = false;
        let _loc3_: int = this.shell.x | 0;
        let _loc4_: int = this.shell.y | 0;
        let _loc5_: Rectangle = new Rectangle(this.displayBounds.x, this.displayBounds.y, this.displayBounds.x + this.bounds.width + this.displayBounds.width, this.displayBounds.y + this.bounds.height + this.displayBounds.height);
        if (this.shell.x > _loc5_.x) {
            _loc3_ = _loc5_.x | 0;
            _loc2_ = true;
        }
        if (this.shell.x < _loc5_.width) {
            _loc3_ = _loc5_.width | 0;
            _loc2_ = true;
        }
        if (this.shell.y > _loc5_.y) {
            _loc4_ = _loc5_.y | 0;
            _loc2_ = true;
        }
        if (this.shell.y < _loc5_.height) {
            _loc4_ = _loc5_.height | 0;
            _loc2_ = true;
        }
        this.dragging = false;
        if (_loc2_) {
        }
    }

    private shellDrag(param1: Event): void {
        let _loc2_: int = (this.stage.mouseX - this.dragPoint.x) | 0;
        let _loc3_: int = (this.stage.mouseY - this.dragPoint.y) | 0;
        if (_loc2_ > this.hardBounds.x) {
            _loc2_ = this.hardBounds.x | 0;
        }
        if (_loc3_ > this.hardBounds.y) {
            _loc3_ = this.hardBounds.y | 0;
        }
        if (_loc2_ < this.hardBounds.width) {
            _loc2_ = this.hardBounds.width | 0;
        }
        if (_loc3_ < this.hardBounds.height) {
            _loc3_ = this.hardBounds.height | 0;
        }
        let _loc4_: number = this.shell.x - (this.shell.x - _loc2_) * this.throwDrag;
        let _loc5_: number = this.shell.y - (this.shell.y - _loc3_) * this.throwDrag;
        let _loc6_: number = (_loc4_ - this.displayBounds.x) / (this.bounds.width + this.displayBounds.width);
        let _loc7_: number = (_loc5_ - this.displayBounds.y) / (this.bounds.height + this.displayBounds.height);
        MiniMap.getInstance().scrollTo(_loc6_, _loc7_);
        this.scrollTo(_loc6_, _loc7_, true);
    }
}
