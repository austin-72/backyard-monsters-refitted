import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { DEFENSEEVENTPOPUP_CLIP, GLOBAL, ImageCache, KEYS, POPUPS, SPECIALEVENT } from "@game";

/*
 * This is the original DEFENSEEVENTPOPUP.as class for Wild Monster Invasion 1.
 * The original developers rewrote this class when Wild Monster Invasion 2 was released
 * instead of creating a new class.
 *
 * This file archives the original implementation for reference and renamed to DEFENSEEVENTPOPUP_WM1.
 */
export class DEFENSEEVENTPOPUP_WM1 extends DEFENSEEVENTPOPUP_CLIP {
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
        }
        if (popupnum == 4) {
            if (SPECIALEVENT.wave == 1) {
                this.rsvpBtn.Setup(KEYS.Get("wmi_buttonpopup2"), false, 0, 0);
                this.rsvpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.startDown));
            } else {
                this.rsvpBtn.visible = false;
            }
        } else if (popupnum == 5) {
            this.rsvpBtn.Setup(KEYS.Get("str_zazzle"), false, 0, 0);
            this.rsvpBtn.Highlight = true;
            this.rsvpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.merchandiseDown));
        } else {
            this.rsvpBtn.Setup(KEYS.Get("wmi_buttonpopup1"), false, 0, 0);
            this.rsvpBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.rsvpDown));
        }
        ImageCache.GetImageWithCallBack("specialevent/monsterinvasionbannerred.jpg", bannerComplete);
        if (popupnum > 0 && popupnum < 5) {
            ImageCache.GetImageWithCallBack("specialevent/200x200_" + popupnum + ".jpg", imageComplete);
            this.mcText.htmlText = KEYS.Get("wmi_popup" + popupnum);
        } else if (popupnum == 5) {
            ImageCache.GetImageWithCallBack("specialevent/tshirt_v2.png", imageComplete);
            this.mcText.htmlText = KEYS.Get("wmi_tshirt");
        }
        this.mcFrame.Setup(true);
        DEFENSEEVENTPOPUP_WM1._open = true;
    }

    public static get open(): boolean {
        return DEFENSEEVENTPOPUP_WM1._open;
    }

    public rsvpDown(param1: MouseEvent): void {
        // GLOBAL.gotoURL("http://www.facebook.com/event.php?eid=141841065917218",null,true,null);
        GLOBAL.gotoURL("https://backyard-monsters.fandom.com/wiki/Wild_Monster_Invasion", null, true, null);
        POPUPS.Next();
    }

    public startDown(param1: MouseEvent): void {
        this.Hide();
    }

    private merchandiseDown(param1: MouseEvent): void {
        GLOBAL.gotoURL("http://www.zazzle.com/ultimate_i_survived_wild_monster_invasion_t_shirt-235246313457240737", null, true, [63, 1]);
        POPUPS.Next();
    }

    public Hide(): void {
        DEFENSEEVENTPOPUP_WM1._open = false;
        POPUPS.Next();
    }
}
