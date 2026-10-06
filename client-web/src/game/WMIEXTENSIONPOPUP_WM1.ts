import * as as3 from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { ImageCache, KEYS, POPUPS, WMIEXTENSIONPOPUP_CLIP } from "@game";

/*
 * This is the original WMIEXTENSIONPOPUP.as class for Wild Monster Invasion 1.
 * The original developers rewrote this class when Wild Monster Invasion 2 was released
 * instead of creating a new class.
 *
 * This file archives the original implementation for reference and renamed to WMIEXTENSIONPOPUP_WM1.
 */
export class WMIEXTENSIONPOPUP_WM1 extends WMIEXTENSIONPOPUP_CLIP {
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
        ImageCache.GetImageWithCallBack("specialevent/monsterinvasionbannerred.jpg", bannerComplete);
        ImageCache.GetImageWithCallBack("specialevent/extension.png", imageComplete);
        this.mcFrame.Setup(true);
        this.closeBtn.Setup(KEYS.Get("btn_close"), false, 0, 0);
        this.closeBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.CloseButtonClicked));
        this.mcText.htmlText = KEYS.Get("wmi_extension");
        WMIEXTENSIONPOPUP_WM1._open = true;
    }

    public static get open(): boolean {
        return WMIEXTENSIONPOPUP_WM1._open;
    }

    public Hide(): void {
        WMIEXTENSIONPOPUP_WM1._open = false;
        POPUPS.Next();
    }

    private CloseButtonClicked(param1: MouseEvent): void {
        this.Hide();
    }
}
