import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TUTORIAL, com_monsters_maproom_MiniMap as MiniMap, com_monsters_maproom_Obstruction as Obstruction, com_monsters_maproom_PlayerLayer as PlayerLayer, com_monsters_maproom_PushPin as PushPin, com_monsters_maproom_views_ListView as ListView, com_monsters_maproom_views_MapView as MapView, old_maproom } from "@game";

export class MapRoom extends old_maproom {
    static {
        as3.fields(this, { players: null, miniMap: null, mv: null, lv: null, firstRun: true, _tutorialModeThresh: 130 });
    }

    public static top: Sprite = null;

    public static _useMailBoxForTruces: boolean = true;

    public static currentView: MovieClip = null;

    public static BRIDGE: any = {};
    public players: PlayerLayer;
    public miniMap: MiniMap;
    public mv: MapView;
    public lv: ListView;
    private firstRun: boolean;
    public _tutorialModeThresh: int;

    public $ctor(): void {
        super.$ctor();
    }

    public init(param1: any): void {
        MapRoom.BRIDGE = param1;
        this.Setup();
        this.players.Get();
    }

    public Setup(): void {
        this.x = 0;
        this.y = 20;
        MapRoom.top = new Sprite();
        MapRoom.top.addChild(this.mvBtn);
        MapRoom.top.addChild(this.lvBtn);
        this.addChild(MapRoom.top);
        this.players = new PlayerLayer();
        if (MapRoom.BRIDGE.TUTORIAL._stage < this._tutorialModeThresh) {
            this.players._wmbToDisplay = 1;
            this.players._playersLimit = 0;
        }
        this.players.addEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersFirstLoad));
        this.mvBtn.SetupKey("map_map_btn");
        this.lvBtn.SetupKey("map_list_btn");
        this.mvBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.mvBtnDown));
        this.lvBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.lvBtnDown));
        this.mv = MapView.getInstance();
        this.mv.players = this.players;
        this.mv.Setup();
        this.lv = new ListView();
        this.lv.players = this.players;
        this.lv.Setup();
        PushPin.Setup();
    }

    private onPlayersFirstLoad(param1: Event): void {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        if (MapRoom.BRIDGE) {
            MapRoom.BRIDGE.readyFunction();
        }
        this.players.removeEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersFirstLoad));
        if (MapRoom.BRIDGE.scrollToBaseID != 0) {
            this.mvBtnDown();
            this.mv.scrollToBaseId(Number(MapRoom.BRIDGE.scrollToBaseID));
        } else {
            _loc2_ = MapRoom.BRIDGE.TUTORIAL._stage <= this._tutorialModeThresh ? 0 : MapRoom.BRIDGE._lastView | 0;
            _loc3_ = [as3.bind(this, this.mvBtnDown), as3.bind(this, this.lvBtnDown)];
            _loc3_[_loc2_]();
        }
    }

    private mvBtnDown(param1: MouseEvent = null): void {
        this.setView(this.mv);
        this.mvBtn.Highlight = true;
        this.lvBtn.Highlight = false;
    }

    private lvBtnDown(param1: MouseEvent = null): void {
        if (TUTORIAL._stage < 110) {
            return;
        }
        this.setView(this.lv);
        this.lvBtn.Highlight = true;
        this.mvBtn.Highlight = false;
    }

    public setView(param1: MovieClip): void {
        if (!this.firstRun) {
            MapRoom.BRIDGE.SOUNDS.Play("click1");
        }
        if (Boolean(MapRoom.currentView) && Boolean(MapRoom.currentView.parent)) {
            MapRoom.currentView.parent.removeChild(MapRoom.currentView);
            MapRoom.currentView = null;
        }
        MapRoom.currentView = param1;
        this.mcHolder.addChild(MapRoom.currentView);
        if (MapRoom.currentView == this.mv) {
            this.mv.onAdd();
        }
        this.setChildIndex(MapRoom.top, (this.numChildren - 1) | 0);
        let _loc2_: int = param1 == this.mv ? 0 : 1;
        MapRoom.BRIDGE.setLastView(_loc2_);
        this.firstRun = false;
    }

    public Tick(): void {
        this.players.Tick();
    }

    public Get(): void {
        this.players.Get();
    }

    public Hide(...rest: any[]): void {
        let _loc2_: Function = null;
        if (MapRoom.BRIDGE.Hide) {
            Obstruction.Clear();
            this.mv.Clear();
            this.players = null;
            this.lv.Clear();
            _loc2_ = MapRoom.BRIDGE.Hide;
            MapRoom.BRIDGE = null;
            _loc2_();
            _loc2_ = null;
        }
    }

    public Resize(): void {
        this.x = 0;
        this.y = 20;
    }
}
