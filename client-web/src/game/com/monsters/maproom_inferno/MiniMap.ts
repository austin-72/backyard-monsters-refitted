import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { DescentMonsterBase, MAPROOM_DESCENT, MiniMapDescent_CLIP, MiniMapInferno_CLIP, TweenLite, com_monsters_maproom_inferno_ForeignBase as ForeignBase, com_monsters_maproom_inferno_MapRoom as MapRoom, com_monsters_maproom_inferno_PlayerLayer as PlayerLayer, com_monsters_maproom_inferno_Ring as Ring, com_monsters_maproom_inferno_WildMonsterBase as WildMonsterBase } from "@game";

export class MiniMap extends MovieClip {
    static {
        as3.fields(this, { playerLayer: null, largeMap: null, selector: null, background: null, selectorSize: null, players: null, ai: null, mapSize: null, dragCallBack: null, dragFriction: 0.7, _mc: null, playerDot: null, rings: null, pctX: NaN, pctY: NaN, fowCoordMap: null });
    }

    private static instance: MiniMap = null;

    private static readonly COLOR1: uint = 65280;

    private static readonly COLOR2: uint = 16776960;

    private static readonly COLOR3: uint = 16750848;

    private static readonly COLOR4: uint = 16711680;

    private static readonly MINIMAPDESCENT: string = "minimap_descent";

    private static readonly MINIMAPINFERNO: string = "minimap_inferno";
    public playerLayer: PlayerLayer;
    public largeMap: MapRoom;
    public selector: Sprite;
    public background: MovieClip;
    public selectorSize: Rectangle;
    public players: Sprite;
    public ai: Sprite;
    public mapSize: Rectangle;
    public dragCallBack: Function;
    private dragFriction: number;
    public _mc: MovieClip;
    private playerDot: Sprite;
    private rings: Sprite;
    public pctX: number;
    public pctY: number;
    public fowCoordMap: any[];

    public $ctor(param1?: MovieClip): void {
        this.fowCoordMap = [25, 35, 45, 60, 106, 148, 190];
        super.$ctor();
        this._mc = param1;
        this.addChild(this._mc);
    }

    public static getInstance(): MiniMap {
        if (!MiniMap.instance) {
            if (MAPROOM_DESCENT.DescentPassed) {
                MiniMap.instance = new MiniMap(new MiniMapInferno_CLIP());
            } else {
                MiniMap.instance = new MiniMap(new MiniMapDescent_CLIP());
            }
        }
        return MiniMap.instance;
    }

    public Setup(): void {
        let _loc2_: int = 0;
        if (this._mc == null) {
            return;
        }
        this.background = as3.cast(this._mc.background_mc, MovieClip);
        let _loc1_: number = this._mc.background_mc.width / this.mapSize.width;
        this.players = new Sprite();
        this._mc.addChild(this.players);
        this.ai = new Sprite();
        this._mc.addChild(this.ai);
        this.playerDot = new Sprite();
        this._mc.addChild(this.playerDot);
        this.rings = new Sprite();
        this._mc.addChild(this.rings);
        this.selector = new Sprite();
        this.selector.graphics.lineStyle(1, 16777215, 1, false);
        this.selector.graphics.beginFill(16777215, 0.5);
        this.selector.graphics.drawRect(0, 0, this.selectorSize.width * _loc1_, this.selectorSize.height * _loc1_);
        this.selector.graphics.endFill();
        this.selector.buttonMode = true;
        this._mc.addChild(this.selector);
        this.selector.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.selectorDown));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.mapDown));
        if (this._mc.fow_mc) {
            _loc2_ = Math.min(Math.max(MAPROOM_DESCENT._descentLvl - 1, 0), MAPROOM_DESCENT._descentLvlMax) | 0;
            this._mc.fow_mc.y = this.fowCoordMap[_loc2_];
        }
    }

    public Clear(): void {
        MiniMap.instance = null;
        this.playerLayer = null;
    }

    private mapDown(param1: MouseEvent): void {
        let reposition: Function = null;
        let tx: number = NaN;
        let ty: number = NaN;
        let t: TweenLite = null;
        let e: MouseEvent = param1;
        if (e.target != this.selector) {
            reposition = (): void => {
                this.scrollTo(this.pctX, this.pctY);
                this.dragCallBack(this.pctX, this.pctY);
            };
            tx = e.localX / this.background.width;
            ty = e.localY / this.background.height;
            TweenLite.to(this, 0.3, { "pctX": tx, "pctY": ty, "onUpdate": reposition });
        }
    }

    public drawPlayerAt(param1: number, param2: number): void {
        let _loc3_: number = this.background.width / this.mapSize.width;
        this.playerDot.graphics.clear();
        this.playerDot.graphics.beginFill(MiniMap.COLOR2, 1);
        this.playerDot.graphics.drawEllipse(param1 * _loc3_, param2 * _loc3_, 5, 5);
        this.playerDot.graphics.endFill();
    }

    private selectorDown(param1: MouseEvent): void {
        let _loc2_: Rectangle = new Rectangle(this.background.x, this.background.y, this.background.width - this.selector.width + 1, this.background.height - this.selector.height + 1);
        this.selector.startDrag(false, _loc2_);
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onSelectorDragged));
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onStageUp));
    }

    private onSelectorDragged(param1: Event): void {
        this.pctX = this.selector.x / (this.background.width - this.selector.width);
        this.pctY = this.selector.y / (this.background.height - this.selector.height);
        this.dragCallBack(this.pctX, this.pctY);
    }

    private onStageUp(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onSelectorDragged));
        this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onStageUp));
        this.selector.stopDrag();
    }

    public scrollTo(param1: number, param2: number): void {
        this.pctX = param1;
        this.pctY = param2;
        if (this.pctX < 0) {
            this.pctX = 0;
        }
        if (this.pctX > 1) {
            this.pctX = 1;
        }
        if (this.pctY < 0) {
            this.pctY = 0;
        }
        if (this.pctY > 1) {
            this.pctY = 1;
        }
        this.selector.x = this.background.x + this.pctX * (this.background.width - this.selector.width);
        this.selector.y = this.background.y + this.pctY * (this.background.height - this.selector.height);
    }

    public highlightBase(param1: ForeignBase): void {
        let _loc2_: number = this.background.width / this.mapSize.width;
        let _loc3_: int = (param1.x * _loc2_ - 0.5) | 0;
        let _loc4_: int = (param1.y * _loc2_ - 0.5) | 0;
        Ring.MakeRings(3, 1.5, this.rings, _loc3_, _loc4_, 40, 1, 3, this.colorForBase(param1));
    }

    public Update(param1: any[], param2: any[]): void {
        let _loc4_: ForeignBase = null;
        let _loc5_: WildMonsterBase = null;
        let _loc6_: DescentMonsterBase = null;
        let _loc3_: number = this.background.width / this.mapSize.width;
        this.players.cacheAsBitmap = false;
        this.players.graphics.clear();
        for (_loc4_ of as3.values(param1)) {
            this.dotAt(_loc4_.x * _loc3_, _loc4_.y * _loc3_, this.colorForBase(_loc4_), this.players);
        }
        this.players.cacheAsBitmap = true;
        this.ai.cacheAsBitmap = false;
        this.ai.graphics.clear();
        if (MAPROOM_DESCENT.DescentPassed) {
            for (_loc5_ of as3.values(param2)) {
                this.dotAt(_loc5_.x * _loc3_, _loc5_.y * _loc3_, 16711680, this.ai);
            }
        } else {
            for (_loc6_ of as3.values(param2)) {
                if (_loc6_.data.destroyed == 0 && _loc6_.data.baseid.Get() > 200 && _loc6_.data.level.Get() >= MAPROOM_DESCENT.DescentLevel) {
                    this.dotAt(_loc6_.x * _loc3_, _loc6_.y * _loc3_, 16711680, this.ai);
                }
            }
        }
        this.ai.cacheAsBitmap = true;
    }

    private colorForBase(param1: ForeignBase): uint {
        let _loc2_: uint = 0;
        if (param1.data.friend.Get() == 1) {
            _loc2_ = MiniMap.COLOR1;
        } else {
            _loc2_ = MiniMap.COLOR3;
        }
        return _loc2_;
    }

    private dotAt(param1: number, param2: number, param3: uint, param4: Sprite): void {
        let _loc5_: number = this.background.width / this.mapSize.width;
        param4.graphics.beginFill(param3);
        param4.graphics.drawRect(param1 - 2, param2 - 2, 3, 3);
        param4.graphics.endFill();
    }
}
