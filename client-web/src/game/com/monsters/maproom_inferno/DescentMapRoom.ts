import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DescentLayer, DescentView, GLOBAL, MapRoomPopup_InfernoDescent, SOUNDS, com_monsters_maproom_inferno_MiniMap as MiniMap, com_monsters_maproom_inferno_Obstruction as Obstruction, com_monsters_maproom_inferno_PushPin as PushPin } from "@game";

export class DescentMapRoom extends MapRoomPopup_InfernoDescent {
    static {
        as3.fields(this, { players: null, miniMap: null, dv: null, firstRun: true, _tutorialModeThresh: 130 });
    }

    public static top: Sprite = null;

    public static _useMailBoxForTruces: boolean = true;

    public static currentView: MovieClip = null;

    public static BRIDGE: any = {};
    public players: DescentLayer;
    public miniMap: MiniMap;
    public dv: DescentView;
    private firstRun: boolean;
    public _tutorialModeThresh: int;

    public $ctor(): void {
        super.$ctor();
    }

    public init(param1: any): void {
        DescentMapRoom.BRIDGE = param1;
        this.Setup();
        this.players.Get();
    }

    public Setup(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y + 20;
        DescentMapRoom.top = new Sprite();
        DescentMapRoom.top.addChild(this.bReturn);
        this.addChild(DescentMapRoom.top);
        this.players = new DescentLayer();
        if (DescentMapRoom.BRIDGE.TUTORIAL._stage < this._tutorialModeThresh) {
            this.players._wmbToDisplay = 1;
            this.players._playersLimit = 0;
        }
        this.players.addEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersFirstLoad));
        this.bReturn.SetupKey("btn_returnhome");
        this.bReturn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.rtBtnDown));
        this.dv = DescentView.getInstance();
        this.dv.players = this.players;
        this.dv.Setup();
        PushPin.Setup();
    }

    private onPlayersFirstLoad(param1: Event): void {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        if (DescentMapRoom.BRIDGE) {
            DescentMapRoom.BRIDGE.readyFunction();
        }
        this.players.removeEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersFirstLoad));
        if (DescentMapRoom.BRIDGE.scrollToBaseID != 0) {
            this.mvBtnDown();
            this.dv.scrollToBaseId(Number(DescentMapRoom.BRIDGE.scrollToBaseID));
        } else {
            _loc2_ = DescentMapRoom.BRIDGE.TUTORIAL._stage <= this._tutorialModeThresh ? 0 : DescentMapRoom.BRIDGE._lastView | 0;
            _loc3_ = [as3.bind(this, this.mvBtnDown), as3.bind(this, this.lvBtnDown)];
            _loc3_[_loc2_]();
        }
    }

    private mvBtnDown(param1: MouseEvent = null): void {
        this.setView(this.dv);
    }

    private lvBtnDown(param1: MouseEvent = null): void {
    }

    private rtBtnDown(param1: MouseEvent = null): void {
        this.Hide();
    }

    public setView(param1: MovieClip): void {
        if (!this.firstRun) {
            SOUNDS.Play("click1");
        }
        if (Boolean(DescentMapRoom.currentView) && Boolean(DescentMapRoom.currentView.parent)) {
            DescentMapRoom.currentView.parent.removeChild(DescentMapRoom.currentView);
            DescentMapRoom.currentView = null;
        }
        DescentMapRoom.currentView = param1;
        this.mcImage.addChild(DescentMapRoom.currentView);
        if (DescentMapRoom.currentView == this.dv) {
            this.dv.onAdd();
        }
        this.setChildIndex(DescentMapRoom.top, (this.numChildren - 1) | 0);
        let _loc2_: int = param1 == this.dv ? 0 : 1;
        DescentMapRoom.BRIDGE.setLastView(_loc2_);
        this.firstRun = false;
    }

    public Tick(): void {
        this.players.Tick();
    }

    public Get(): void {
        this.players.Get();
    }

    public Hide(...rest: any[]): void {
        if (DescentMapRoom.BRIDGE.Hide) {
            Obstruction.Clear();
            this.dv.Clear();
            this.players = null;
            DescentMapRoom.BRIDGE.Hide();
            DescentMapRoom.BRIDGE = null;
        }
    }

    public Resize(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y + 20;
    }
}
