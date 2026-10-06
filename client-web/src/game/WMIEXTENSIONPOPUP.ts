import * as as3 from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { ImageCache, KEYS, POPUPS, SPECIALEVENT, WMIEXTENSIONPOPUP_CLIP } from "@game";

export class WMIEXTENSIONPOPUP extends WMIEXTENSIONPOPUP_CLIP {
    private static _open: boolean = false;

    public $ctor(): void {
        let bannerComplete: Function = null;
        let imageComplete: Function = null;
        bannerComplete = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.smoothing = true;
            this.mcBanner.addChild(_loc3_);
            this.mcBanner.width = 672;
            this.mcBanner.height = 82;
        };
        imageComplete = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.smoothing = true;
            this.mcImage.addChild(_loc3_);
            this.mcImage.width = 672;
            this.mcImage.height = 200;
        };
        super.$ctor();
        ImageCache.GetImageWithCallBack(SPECIALEVENT.BANNERIMAGE, bannerComplete);
        ImageCache.GetImageWithCallBack("specialevent/wmi2_4-v2.png", imageComplete);
        this.mcFrame.Setup(true);
        this.closeBtn.visible = false;
        this.mcText.htmlText = KEYS.Get("wmi2_popup4");
        WMIEXTENSIONPOPUP._open = true;
    }

    public static get open(): boolean {
        return WMIEXTENSIONPOPUP._open;
    }

    public Hide(): void {
        WMIEXTENSIONPOPUP._open = false;
        POPUPS.Next();
    }

    private CloseButtonClicked(param1: MouseEvent): void {
        this.Hide();
    }
}
