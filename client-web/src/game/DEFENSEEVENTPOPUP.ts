import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { DEFENSEEVENTPOPUP_CLIP, GLOBAL, ImageCache, KEYS, POPUPS, SPECIALEVENT } from "@game";

export class DEFENSEEVENTPOPUP extends DEFENSEEVENTPOPUP_CLIP {
    static {
        as3.fields(this, { bm: null });
    }

    private static _open: boolean = false;
    private bm: Bitmap;

    public $ctor(param1: int = 0): void {
        let bannerComplete: Function = null;
        let imageComplete: Function = null;
        let popupnum: int = param1;
        bannerComplete = (param1: string, param2: BitmapData): void => {
            this.bm = new Bitmap(param2);
            this.mcBanner.addChild(this.bm);
            this.mcBanner.width = 672;
            this.mcBanner.height = 82;
        };
        imageComplete = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.smoothing = true;
            this.mcImage.addChild(_loc3_);
            this.mcImage.width = 200;
            this.mcImage.height = 200;
        };
        super.$ctor();
        if (popupnum == -1) {
            popupnum = (Math.floor(Math.random() * 3) + 1) | 0;
        } else if (popupnum < 1 || popupnum > 3) {
            popupnum = 1;
        }
        this.rsvpBtn.Setup(KEYS.Get("wmi_buttonpopup1"), false, 0, 0);
        this.rsvpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.rsvpDown));
        ImageCache.GetImageWithCallBack(SPECIALEVENT.BANNERIMAGE, bannerComplete);
        if (popupnum > 0 && popupnum < 4) {
            ImageCache.GetImageWithCallBack("specialevent/wmi2_" + popupnum + ".jpg", imageComplete);
            this.mcText.htmlText = KEYS.Get("wmi2_popup" + popupnum);
        }
        this.mcFrame.Setup(true);
        DEFENSEEVENTPOPUP._open = true;
    }

    public static get open(): boolean {
        return DEFENSEEVENTPOPUP._open;
    }

    public rsvpDown(param1: MouseEvent): void {
        this.Hide();
        // GLOBAL.gotoURL("https://www.facebook.com/events/211384668938961/",null,true,null);
        GLOBAL.gotoURL("https://backyard-monsters.fandom.com/wiki/Wild_Monster_Invasion_2", null, true, null);
    }

    public startDown(param1: MouseEvent): void {
        this.Hide();
    }

    public Hide(): void {
        DEFENSEEVENTPOPUP._open = false;
        POPUPS.Next();
    }
}
