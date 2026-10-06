import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Loader } from "flash/display";
import { ImageCache, KEYS, LOGGER, WMListViewItemInferno_CLIP, com_monsters_maproom_inferno_PlayerHandler as PlayerHandler, com_monsters_maproom_inferno_model_BaseObject as BaseObject } from "@game";

export class WMListViewItem extends WMListViewItemInferno_CLIP {
    static {
        as3.fields(this, { loaded: false, portrait: null, data: null, attackStarPoints: NaN, helpStarPoints: NaN, online: NaN, ownerName: null, status: null, level: 0, loader: null, helpStars: null, attackStars: null, handler: null });
    }

    private loaded: boolean;
    public portrait: Bitmap;
    public data: BaseObject;
    public attackStarPoints: number;
    public helpStarPoints: number;
    public online: number;
    public ownerName: string;
    public status: string;
    public level: int;
    public loader: Loader;
    public helpStars: any[];
    public attackStars: any[];
    public handler: PlayerHandler;

    public $ctor(): void {
        super.$ctor();
        this.removeChild(this.dot);
        this.removeChild(this.attacks_txt);
        this.removeChild(this.status_txt);
        this.removeChild(this.extraStatus_txt);
    }

    public Display(): void {
        if (!this.loaded) {
            try {
                ImageCache.GetImageWithCallBack(this.data.pic, as3.bind(this, this.onImageLoaded));
                this.loaded = true;
            } catch (e) {
                LOGGER.Log("err", "MapRoom WMListViewItem Display: " + e.getStackTrace());
            }
        }
    }

    private onImageLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = null;
        _loc3_ = new Bitmap(param2);
        this.addChild(_loc3_);
        _loc3_.x = this.placeholder.x;
        _loc3_.y = this.placeholder.y;
        _loc3_.width = _loc3_.height = 50;
    }

    public Setup(param1: BaseObject): void {
        this.data = param1;
        this.handler = new PlayerHandler();
        this.Update();
    }

    public Update(...rest: any[]): void {
        let _loc2_: any = this.handler.configure(this);
        if (this.level_txt) {
            this.level_txt.htmlText = "<b>" + this.data.level.Get();
            this.name_txt.htmlText = "<b>" + KEYS.Get("inf_ai_tribe_mapview", { "v1": this.data.ownerName }) + "</b>";
        } else {
            this.name_txt.htmlText = "<b>" + KEYS.Get("inf_ai_tribe_listview", { "v1": this.data.ownerName, "v2": this.data.level.Get() }) + "</b>";
        }
        this.ownerName = this.data.ownerName;
        this.online = 0;
        this.attackStarPoints = 5;
        this.helpStarPoints = 0;
        this.status = "enemy";
        this.level = this.data.level.Get() | 0;
        let _loc3_: any[] = [1, 10, 85, 200];
    }
}
