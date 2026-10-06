import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { Event, EventDispatcher, MouseEvent, NetStatusEvent } from "flash/events";
import { Video } from "flash/media";
import { NetStream, URLRequest, navigateToURL } from "flash/net";
import { BASE, BFOUNDATION, BUILDINGOPTIONS, BUILDINGS, Button, GLOBAL, INFERNOPORTAL, ImageCache, KEYS, MonsterMadness, MonsterMadnessPopup, POPUPS, VideoUtils } from "@game";

export class MonsterMadnessPopupInfo extends EventDispatcher {
    static {
        as3.fields(this, { isOnlySeenOnce: false, _RSVP_URL: "https://www.facebook.com/events/193849810724330/", _videoStream: null });
    }

    public static readonly KOGOTH_SPINNING_VIDEO: string = "assets/specialevent/monstermadness/mc_promo_walk.flv";

    public static readonly KOGOTH_SPINNING_STOMP_VIDEO: string = "assets/specialevent/monstermadness/mc_promo_attack.flv";

    public static readonly KOGOTH_SPINNING_FIREBALL_VIDEO: string = "assets/specialevent/monstermadness/mc_promo_fireball.flv";

    public static readonly KOGOTH_BRAG_IMAGE1: string = "G4_P1-90.png";

    public static readonly KOGOTH_BRAG_IMAGE2: string = "G4_P2-90.png";

    public static readonly KOGOTH_BRAG_IMAGE3: string = "G4_P3-90.png";

    public static readonly BANNER_IMAGE_LOCATION: string = "specialevent/monstermadness/bym_mm_banner_600x82.png";

    public static readonly REMOVE_LOADING_CIRCLE: string = "removeLoadingCircle";
    public isOnlySeenOnce: boolean;
    private _RSVP_URL: string;
    private _videoStream: NetStream;

    public $ctor(): void {
        super.$ctor();
    }

    public getBanner(param1: int): string {
        return MonsterMadnessPopupInfo.BANNER_IMAGE_LOCATION;
    }

    public getCopy(param1: int): string {
        return "";
    }

    public getMedia(param1: int): DisplayObject {
        return null;
    }

    public setupButton(param1: Button, param2: int): void {
    }

    public setupButton2(param1: Button, param2: int): void {
        param1.visible = false;
    }

    protected setupVideo(param1: string): Video {
        let _loc2_: Video = new Video(MonsterMadnessPopup._MEDIA_DIMENTIONS_X, MonsterMadnessPopup._MEDIA_DIMENTIONS_Y);
        this._videoStream = VideoUtils.getVideoStream(_loc2_, param1);
        this._videoStream.addEventListener(NetStatusEvent.NET_STATUS, as3.bind(this, this.onNetStatusUpdate));
        VideoUtils.loopStream(this._videoStream);
        return _loc2_;
    }

    private onNetStatusUpdate(param1: NetStatusEvent): void {
        if (param1.info.code == "NetStream.Play.Start") {
            this.dispatchEvent(new Event(MonsterMadnessPopupInfo.REMOVE_LOADING_CIRCLE));
        }
    }

    protected setupImage(param1: string): Bitmap {
        let _loc2_: Bitmap = new Bitmap();
        ImageCache.GetImageWithCallBack(param1, as3.bind(this, this.onImageLoad), true, 4, "", [_loc2_]);
        return _loc2_;
    }

    private onImageLoad(param1: string, param2: BitmapData, param3: any[] = null): void {
        as3.cast(param3[0], Bitmap).bitmapData = param2;
    }

    protected setupUpgradeButton(param1: Button): void {
        let _loc3_: Function = null;
        if (BASE.isInfernoMainYardOrOutpost) {
            this.setupRSVPButton(param1);
            return;
        }
        let _loc2_: BFOUNDATION = GLOBAL.townHall;
        let _loc4_: string = "btn_upgradenow";
        if (_loc2_._lvl.Get() >= 6) {
            if (GLOBAL._bMap) {
                _loc3_ = as3.bind(this, this.onClickUpgradeMaproom);
            } else {
                _loc3_ = as3.bind(this, this.onClickBuildMaproom);
                _loc4_ = "btn_buildnow";
            }
        } else {
            _loc3_ = as3.bind(this, this.onClickUpgradeTownhall);
        }
        param1.Setup(KEYS.Get(_loc4_));
        param1.addEventListener(MouseEvent.CLICK, _loc3_);
        param1.Highlight = true;
    }

    protected onClickBuildMaproom(param1: MouseEvent): void {
        this.close();
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickBuildMaproom));
        BUILDINGS._buildingID = 11;
        BUILDINGS.Show();
    }

    protected onClickUpgradeMaproom(param1: MouseEvent): void {
        this.close();
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickUpgradeMaproom));
        GLOBAL._selectedBuilding = GLOBAL._bMap;
        BUILDINGOPTIONS.Show(GLOBAL._bMap, "upgrade");
    }

    protected onClickUpgradeTownhall(param1: MouseEvent): void {
        this.close();
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickUpgradeTownhall));
        GLOBAL._selectedBuilding = GLOBAL.townHall;
        BUILDINGOPTIONS.Show(GLOBAL.townHall, "upgrade");
    }

    protected setupRSVPButton(param1: Button): void {
        if (MonsterMadness.hasEventStarted) {
            param1.visible = false;
            return;
        }
        param1.Setup(KEYS.Get("btn_rsvp"));
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickRSVPButton));
        param1.Highlight = true;
    }

    private onClickRSVPButton(param1: MouseEvent): void {
        this.close();
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickRSVPButton));
        navigateToURL(new URLRequest(this._RSVP_URL));
    }

    protected setupMapButtton(param1: Button): void {
        if (BASE.isInfernoMainYardOrOutpost) {
            this.setupExitButton(param1);
            return;
        }
        param1.Setup(KEYS.Get("btn_openmap"));
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickMapButton));
    }

    private setupExitButton(param1: Button): void {
        param1.Setup(KEYS.Get("btn_exitcavern"));
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickExitButton));
    }

    protected onClickExitButton(param1: MouseEvent): void {
        this.close();
        INFERNOPORTAL.ToggleYard();
    }

    private onClickMapButton(param1: MouseEvent): void {
        this.close();
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickMapButton));
        GLOBAL.ShowMap();
    }

    protected setupCloseButtton(param1: Button): void {
        param1.Setup(KEYS.Get("btn_close"));
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickCloseButton));
    }

    private onClickCloseButton(param1: MouseEvent): void {
        param1.target.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onClickCloseButton));
        this.close();
    }

    protected ShowBrag(param1: string, param2: string, param3: string, param4: string): void {
        GLOBAL.CallJS("sendFeed", [param1, KEYS.Get(param2), KEYS.Get(param3), param4]);
        this.close();
    }

    protected close(): void {
        POPUPS.Next();
        if (this._videoStream) {
            this._videoStream.close();
        }
    }
}
