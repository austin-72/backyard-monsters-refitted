import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, Loader, SimpleButton, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { Button, DescentBaseInfo, DescentBasePopup, DescentMapRoom, DescentMonsterBase_CLIP, DescentView, KEYS, com_monsters_maproom_inferno_PlayerHandler as PlayerHandler, com_monsters_maproom_inferno_PushPin as PushPin, com_monsters_maproom_inferno_model_BaseObject as BaseObject } from "@game";

export class DescentMonsterBase extends DescentMonsterBase_CLIP {
    static {
        as3.fields(this, { mapX: 0, mapY: 0, attackBtn: null, helpBtn: null, loadingImage: false, offState: null, overState: null, nameMargin: 10, _state: null, mouseTimer: null, pin: null, currentHitArea: null, data: null, colorCode: 0, image: null, nameBox: null, popUp: null, handler: null, loader: null, imageLoadState: 0, info_mc: null, popupCoordMap: null });
    }

    public mapX: int;
    public mapY: int;
    public attackBtn: Button;
    public helpBtn: Button;
    private loadingImage: boolean;
    public offState: Sprite;
    public overState: Sprite;
    private nameMargin: uint;
    private _state: string;
    private mouseTimer: Timer;
    private pin: Sprite;
    private currentHitArea: SimpleButton;
    public data: BaseObject;
    public colorCode: uint;
    public image: Sprite;
    public nameBox: Sprite;
    public popUp: DescentBasePopup;
    public handler: PlayerHandler;
    public loader: Loader;
    public imageLoadState: uint;
    public info_mc: DescentBaseInfo;
    public popupCoordMap: any[];

    // Comment: March 2012 pre-patch 7 Descent base co-ordinates
    // public const popupCoordMap:Array = [[-145,-215],[15,-225],[-170,-210],[40,-200],[-170,-225],[50,-240],[-60,-280]];
    public $ctor(): void {
        this.popupCoordMap = [[15, -230], [-145, -215], [15, -225], [15, -225], [40, -215], [-170, -210], [-170, -215], [40, -200], [-170, -225], [30, -230], [50, -240], [-170, -220], [-60, -280]];
        super.$ctor();
        this.popUp = new DescentBasePopup();
        this.popUp.tDepth.htmlText = "<b>" + KEYS.Get("descent_depthBar") + "</b>";
        this.popUp.x = 20;
        this.popUp.y = -250;
        this.addChild(this.popUp);
        this.info_mc = new DescentBaseInfo();
        this.info_mc.x = 22;
        this.info_mc.y = 10;
        this.addChild(this.info_mc);
    }

    public Setup(param1: BaseObject): void {
        let dataObj: BaseObject = param1;
        this.data = dataObj;
        this.colorCode = PushPin.RED;
        this.loader = new Loader();
        this.removeChild(this.popUp);
        this.attackBtn = this.popUp.attackBtn;
        this.helpBtn = this.popUp.helpBtn;
        this.popUp.setHeightForButtons(2);
        this.popUp.removeChild(this.popUp.truceBtn);
        this.popUp.removeChild(this.popUp.msgBtn);
        this.offState = new Sprite();
        this.offState.mouseChildren = false;
        this.offState.addChild(this.mcBase);
        this.overState = new Sprite();
        this.overState.mouseChildren = false;
        this.overState.addChild(this.info_mc);
        this.removeChild(this.smallhit);
        this.removeChild(this.largehit);
        this.attackBtn.SetupKey("map_attack_btn");
        this.helpBtn.SetupKey("map_view_btn");
        this.removeChild(this.mediumhit);
        this.setState("off");
        try {
            this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
            if (this.data.level.Get() == DescentView.getInstance().players.targetLvl) {
                this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.thisDown));
            }
        } catch (e) {
        }
        this.mouseTimer = new Timer(400);
        this.mouseTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTimer));
        this.mouseTimer.start();
        new PlayerHandler().configure(this);
        this.stop();
        this.SetLevelArt();
    }

    public InitTargetListener(): void {
        try {
            this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
            if (this.data.level.Get() == DescentView.getInstance().players.targetLvl + 1) {
                this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.thisDown));
            }
        } catch (e) {
        }
    }

    public SetLevelArt(): void {
        let _loc3_: any = null;
        let _loc1_: int = this.data.level.Get() | 0;
        let _loc2_: int = 0;
        if (DescentMapRoom.BRIDGE.MAPROOM) {
            _loc2_ = DescentMapRoom.BRIDGE.MAPROOM.DescentLevel | 0;
        }
        // Comment: Setting the base sprites for each base on the descent map.
        switch (_loc1_) {
            case 1:
            case 2:
                _loc3_ = "base1";
                break;
            case 3:
            case 4:
                _loc3_ = "base2";
                break;
            case 5:
            case 6:
                _loc3_ = "base3";
                break;
            case 7:
            case 8:
                _loc3_ = "base4";
                break;
            case 9:
            case 10:
                _loc3_ = "base5";
                break;
            case 11:
            case 12:
                _loc3_ = "base6";
                break;
            case 13:
                _loc3_ = "base7";
                break;
            default:
                _loc3_ = "base1";
        }
        // Comment: March 2012 pre-patch 7 Descent base config
        // switch(_loc1_)
        // {
        // case 1:
        // _loc3_ = "base1";
        // break;
        // case 2:
        // _loc3_ = "base2";
        // break;
        // case 3:
        // _loc3_ = "base3";
        // break;
        // case 4:
        // _loc3_ = "base4";
        // break;
        // case 5:
        // _loc3_ = "base5";
        // break;
        // case 6:
        // _loc3_ = "base6";
        // break;
        // case 7:
        // _loc3_ = "base7";
        // break;
        // case 8:
        // case 9:
        // case 10:
        // case 11:
        // case 12:
        // case 13:
        // default:
        // _loc3_ = "base1";
        // }
        if (_loc1_ > _loc2_) {
            _loc3_ += "_dark";
        }
        if (this.data.destroyed) {
            _loc3_ += "_destroyed";
            this.mcBase.visible = false;
            this.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
            this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.thisDown));
        }
        this.mcBase.gotoAndStop(_loc3_);
    }

    public setState(param1: string): void {
        let _loc2_: int = 0;
        if (param1 == "off") {
            if (this.contains(this.overState)) {
                this.removeChild(this.overState);
            }
            this.addChildAt(this.offState, 0);
            this.currentHitArea = this.smallhit;
            if (this.contains(this.popUp)) {
                this.removeChild(this.popUp);
            }
        } else if (param1 == "down") {
            if (this.contains(this.overState)) {
                this.removeChild(this.overState);
            }
            this.currentHitArea = this.largehit;
            this.addChild(this.popUp);
            this.addChild(this.offState);
            _loc2_ = (this.data.level.Get() - 1) | 0;
            if (this.data) {
                this.popUp.Show(this.data.level.Get() | 0, this.popupCoordMap[_loc2_][0] | 0, this.popupCoordMap[_loc2_][1] | 0);
            } else {
                this.popUp.Show();
            }
        } else if (param1 == "over") {
            this.addChild(this.offState);
        }
        this._state = param1;
        this.dispatchEvent(new Event(param1));
    }

    private onPortraitComplete(param1: string, param2: BitmapData): void {
        this.imageLoadState = 2;
        let _loc3_: Bitmap = new Bitmap(param2);
        _loc3_.width = _loc3_.height = 44;
        this.image.addChildAt(_loc3_, (this.image.numChildren - 1) | 0);
    }

    private onTimer(param1: TimerEvent): void {
        if (this._state != "off") {
            if (this.mouseX < this.currentHitArea.x || this.mouseX > this.currentHitArea.x + this.currentHitArea.width || this.mouseY < this.currentHitArea.y || this.mouseY > this.currentHitArea.y + this.currentHitArea.height) {
                this.setState("off");
            }
        }
    }

    private thisOver(param1: MouseEvent): void {
        if (this._state == "off") {
            this.setState("over");
        }
    }

    private thisDown(param1: MouseEvent): void {
        if (this._state == "off" || this._state == "over") {
            this.setState("down");
        }
    }
}
