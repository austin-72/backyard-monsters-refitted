import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { HellRaisersBattleSummary_CLIP, ImageCache, KEYS, MapRoomManager } from "@game";

export class HellRaisersBattleSummary extends ASObject {
    static {
        as3.fields(this, { m_graphic: null });
    }

    private static readonly k_winImageURL: string = "events/hellraisers/hellraisers_win.jpg";

    private static readonly k_loseImageURL: string = "events/hellraisers/hellraisers_lose.jpg";
    private m_graphic: HellRaisersBattleSummary_CLIP;

    public $ctor(param1?: boolean, param2?: uint): void {
        let _loc3_: string = null;
        super.$ctor();
        this.m_graphic = new HellRaisersBattleSummary_CLIP();
        if (param1) {
            _loc3_ = HellRaisersBattleSummary.k_winImageURL;
        } else {
            _loc3_ = HellRaisersBattleSummary.k_loseImageURL;
        }
        ImageCache.GetImageWithCallBack(_loc3_, as3.bind(this, this.loadedImage));
        this.m_graphic.tBody.htmlText = ">YOU GOT SUM POINTS, LOL :" + param2;
        this.m_graphic.bAction.Setup(KEYS.Get("btn_openmap"));
        this.m_graphic.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedActionButton));
    }

    protected clickedActionButton(param1: Event): void {
        MapRoomManager.instance.SetupAndShow();
    }

    private loadedImage(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        this.m_graphic.mcImage.addChild(_loc3_);
    }

    public get graphic(): MovieClip {
        return this.m_graphic;
    }
}
