import * as as3 from "as3";
import { int, uint } from "as3";
import { Loader, SimpleButton, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { TextFieldAutoSize } from "flash/text";
import { Timer } from "flash/utils";
import { Button, ForeignBase_CLIP, KEYS, com_monsters_maproom_MapRoom as MapRoom, com_monsters_maproom_PlayerHandler as PlayerHandler, com_monsters_maproom_PushPin as PushPin, com_monsters_maproom_model_BaseObject as BaseObject, com_monsters_maproom_views_MapBasePopup as MapBasePopup } from "@game";

export class ForeignBase extends ForeignBase_CLIP {
    static {
        as3.fields(this, { mapX: 0, mapY: 0, attackBtn: null, helpBtn: null, truceBtn: null, msgBtn: null, loadingImage: false, offState: null, nameMargin: 10, _state: null, mouseTimer: null, pin: null, currentHitArea: null, data: null, colorCode: 0, image: null, nameBox: null, popUp: null, handler: null, loader: null, imageLoadState: 0 });
    }

    public mapX: uint;
    public mapY: uint;
    public attackBtn: Button;
    public helpBtn: Button;
    public truceBtn: Button;
    public msgBtn: Button;
    private loadingImage: boolean;
    public offState: Sprite;
    private nameMargin: uint;
    private _state: string;
    private mouseTimer: Timer;
    private pin: Sprite;
    private currentHitArea: SimpleButton;
    public data: BaseObject;
    public colorCode: uint;
    public image: Sprite;
    public nameBox: Sprite;
    public popUp: MapBasePopup;
    public handler: PlayerHandler;
    public loader: Loader;
    private imageLoadState: uint;

    public $ctor(): void {
        super.$ctor();
        this.popUp = new MapBasePopup();
        this.popUp.title_txt.htmlText = "<b>" + KEYS.Get("map_options") + "</b>";
        this.popUp.x = 21;
        this.popUp.y = 40;
        this.addChild(this.popUp);
    }

    public Setup(param1: BaseObject): void {
        let _loc2_: uint = 0;
        this.data = param1;
        if (this.data.friend.Get() == 1) {
            this.colorCode = PushPin.GREEN;
        } else if (this.data.attacksfrom.Get() == 0 && this.data.attacksto.Get() == 0) {
            this.colorCode = PushPin.YELLOW;
        } else if (this.data.attacksto.Get() > this.data.attacksfrom.Get()) {
            this.colorCode = PushPin.ORANGE;
        } else if (this.data.attacksto.Get() < this.data.attacksfrom.Get()) {
            this.colorCode = PushPin.RED;
        }
        this.loader = new Loader();
        this.removeChild(this.popUp);
        this.attackBtn = this.popUp.attackBtn;
        this.helpBtn = this.popUp.helpBtn;
        this.truceBtn = this.popUp.truceBtn;
        this.msgBtn = this.popUp.msgBtn;
        this.offState = new Sprite();
        this.offState.mouseChildren = false;
        this.image = new Sprite();
        this.image.addChild(this.photoFrame_mc);
        this.image.addChild(this.placeholder);
        this.image.addChild(this.frame_mc);
        this.offState.addChild(this.image);
        this.nameBox = new Sprite();
        this.nameBox.addChild(this.box_mc);
        this.nameBox.addChild(this.name_txt);
        this.offState.addChild(this.nameBox);
        this.nameBox.x = -2;
        this.pin = PushPin.getRandomPinWithColor(this.colorCode);
        this.addChild(this.pin);
        this.removeChild(this.smallhit);
        this.removeChild(this.largehit);
        this.name_txt.autoSize = TextFieldAutoSize.LEFT;
        this.name_txt.htmlText = "<b>" + this.data.ownerName.toUpperCase() + "</b>";
        this.name_txt.x = this.name_txt.textWidth * -0.5;
        let _loc3_: number = this.name_txt.textWidth + 2 * 7;
        this.box_mc.width = Number(_loc3_ < 51 ? 51 : _loc3_);
        this.level.lv_txt.htmlText = "<b>" + param1.level.Get();
        this.attackBtn.Setup(as3.str(MapRoom.BRIDGE.KEYS.Get("map_attack_btn")));
        this.helpBtn.Setup(as3.str(MapRoom.BRIDGE.KEYS.Get("map_help_btn")));
        this.truceBtn.Setup(as3.str(MapRoom.BRIDGE.KEYS.Get("map_truce_btn")));
        this.msgBtn.Setup(as3.str(MapRoom.BRIDGE.KEYS.Get("map_message_btn")));
        this.removeChild(this.mediumhit);
        this.setState("off");
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.thisDown));
        param1.addEventListener(Event.CHANGE, as3.bind(this, this.Update));
        this.mouseTimer = new Timer(400);
        this.mouseTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTimer));
        this.mouseTimer.start();
        this.handler = new PlayerHandler();
        this.Update();
    }

    public setState(param1: string): void {
        let LoadImageError: Function = null;
        let state: string = param1;
        if (state == "off") {
            this.addChildAt(this.offState, 0);
            this.currentHitArea = this.smallhit;
            if (!this.loadingImage && this.data.pic && this.data.pic.length > 5 && this.imageLoadState == 0) {
                try {
                    LoadImageError = (param1: IOErrorEvent): void => {
                    };
                    this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onPortraitComplete));
                    this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                    this.loader.load(new URLRequest(this.data.pic), new LoaderContext(true));
                    this.imageLoadState = 1;
                } catch (e) {
                    MapRoom.BRIDGE.Log("err", "ForeignBase state set: " + e.errorID + " - " + e.getStackTrace());
                }
            }
            if (this.contains(this.popUp)) {
                this.removeChild(this.popUp);
            }
        } else if (state == "down") {
            this.currentHitArea = this.largehit;
            this.addChild(this.popUp);
            this.popUp.Show();
        }
        this._state = state;
        this.dispatchEvent(new Event(state));
    }

    public get state(): string {
        return this._state;
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

    private onPortraitComplete(param1: Event): void {
        let _loc2_: int = this.placeholder.x | 0;
        let _loc3_: int = this.placeholder.y | 0;
        this.imageLoadState = 2;
        this.loader.width = this.loader.height = 44;
        this.image.addChildAt(this.loader, (this.image.numChildren - 1) | 0);
        this.loader.x = _loc2_;
        this.loader.y = _loc3_;
    }

    private onTimer(param1: TimerEvent): void {
        if (this._state != "off") {
            if (this.mouseX < this.currentHitArea.x || this.mouseX > this.currentHitArea.x + this.currentHitArea.width || this.mouseY < this.currentHitArea.y || this.mouseY > this.currentHitArea.y + this.currentHitArea.height) {
                this.setState("off");
            }
        }
    }

    public Update(param1: Event = null): void {
        this.handler.configure(this);
    }
}
