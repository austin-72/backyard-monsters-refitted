import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, Loader, SimpleButton, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { TextFieldAutoSize } from "flash/text";
import { Timer } from "flash/utils";
import { Button, ImageCache, KEYS, LOGGER, WildMonsterBaseInferno_CLIP, WildMonsterBaseInfo, com_monsters_maproom_inferno_PlayerHandler as PlayerHandler, com_monsters_maproom_inferno_PushPin as PushPin, com_monsters_maproom_inferno_model_BaseObject as BaseObject, com_monsters_maproom_inferno_views_MapBasePopup as MapBasePopup } from "@game";

export class WildMonsterBase extends WildMonsterBaseInferno_CLIP {
    static {
        as3.fields(this, { mapX: 0, mapY: 0, attackBtn: null, helpBtn: null, loadingImage: false, offState: null, overState: null, nameMargin: 10, _state: null, mouseTimer: null, pin: null, currentHitArea: null, data: null, colorCode: 0, image: null, nameBox: null, popUp: null, handler: null, loader: null, imageLoadState: 0, info_mc: null });
    }

    public mapX: uint;
    public mapY: uint;
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
    public popUp: MapBasePopup;
    public handler: PlayerHandler;
    public loader: Loader;
    public imageLoadState: uint;
    public info_mc: WildMonsterBaseInfo;

    public $ctor(): void {
        super.$ctor();
        this.popUp = new MapBasePopup();
        this.popUp.title_txt.htmlText = "<b>" + KEYS.Get("map_options") + "</b>";
        this.popUp.x = 21;
        this.popUp.y = 40;
        this.addChild(this.popUp);
        this.info_mc = new WildMonsterBaseInfo();
        this.info_mc.x = 22;
        this.info_mc.y = 10;
        this.addChild(this.info_mc);
    }

    public Setup(param1: BaseObject): void {
        this.data = param1;
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
        this.overState = new Sprite();
        this.overState.mouseChildren = false;
        this.overState.addChild(this.info_mc);
        this.removeChild(this.smallhit);
        this.removeChild(this.largehit);
        this.name_txt.autoSize = TextFieldAutoSize.LEFT;
        this.level_txt.htmlText = "<b>" + this.data.level.Get().toString() + "</b>";
        this.name_txt.htmlText = "<b>" + KEYS.Get("inf_ai_tribe_mapview", { "v1": this.data.ownerName }).toUpperCase() + "</b>";
        this.name_txt.x = this.name_txt.textWidth * -0.5;
        let _loc2_: number = this.name_txt.textWidth + 2 * 7;
        this.box_mc.width = Number(_loc2_ < 51 ? 51 : _loc2_);
        this.attackBtn.SetupKey("map_attack_btn");
        this.helpBtn.SetupKey("map_view_btn");
        this.removeChild(this.mediumhit);
        this.setState("off");
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.thisOver));
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.thisDown));
        this.mouseTimer = new Timer(400);
        this.mouseTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTimer));
        this.mouseTimer.start();
        new PlayerHandler().configure(this);
    }

    public setState(param1: string): void {
        let state: string = param1;
        if (state == "off") {
            if (this.contains(this.overState)) {
                this.removeChild(this.overState);
            }
            this.addChildAt(this.offState, 0);
            this.currentHitArea = this.smallhit;
            if (!this.loadingImage && this.data.pic.length > 5 && this.imageLoadState == 0) {
                try {
                    ImageCache.GetImageWithCallBack(this.data.pic, as3.bind(this, this.onPortraitComplete));
                    this.loadingImage = true;
                    this.imageLoadState = 1;
                } catch (e) {
                    LOGGER.Log("err", "WildMonsterBase state set: " + e.errorID + " - " + e.getStackTrace());
                }
            }
            if (this.contains(this.popUp)) {
                this.removeChild(this.popUp);
            }
        } else if (state == "down") {
            if (this.contains(this.overState)) {
                this.removeChild(this.overState);
            }
            this.currentHitArea = this.largehit;
            this.addChild(this.popUp);
            this.popUp.Show();
        } else if (state == "over") {
        }
        this._state = state;
        this.dispatchEvent(new Event(state));
    }

    private onPortraitComplete(param1: string, param2: BitmapData): void {
        let _loc4_: int = 0;
        let _loc5_: Bitmap = null;
        let _loc3_: int = this.placeholder.x | 0;
        _loc4_ = this.placeholder.y | 0;
        this.imageLoadState = 2;
        _loc5_ = new Bitmap(param2);
        _loc5_.width = _loc5_.height = 44;
        this.image.addChildAt(_loc5_, (this.image.numChildren - 1) | 0);
        _loc5_.x = _loc3_;
        _loc5_.y = _loc4_;
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
