import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, Loader } from "flash/display";
import { Event, IOErrorEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { GLOBAL, KEYS, LOGGER, ListViewItem_CLIP, com_monsters_maproom_inferno_PlayerHandler as PlayerHandler, com_monsters_maproom_inferno_model_BaseObject as BaseObject } from "@game";

export class ListViewItem extends ListViewItem_CLIP {
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
        this.truceBtn.SetupKey("map_truce_btn");
        this.msgBtn.SetupKey("map_message_btn");
        this.loader = new Loader();
    }

    public Display(): void {
        let LoadImageError: Function = null;
        if (!this.loaded) {
            this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImageLoaded));
            try {
                LoadImageError = (param1: IOErrorEvent): void => {
                };
                this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this.loader.load(new URLRequest(this.data.pic), new LoaderContext(true));
                this.loaded = true;
            } catch (e) {
                LOGGER.Log("err", "MapRoom ListViewItem Display: " + e.getStackTrace());
            }
        }
    }

    private onImageLoaded(param1: Event): void {
        this.addChild(this.loader);
        this.loader.x = this.placeholder.x;
        this.loader.y = this.placeholder.y;
        this.loader.width = this.loader.height = 50;
    }

    public Setup(param1: BaseObject): void {
        this.data = param1;
        this.handler = new PlayerHandler();
        this.Update();
        param1.addEventListener(Event.CHANGE, as3.bind(this, this.Update));
    }

    public Update(param1: Event = null): void {
        let _loc2_: any = this.handler.configure(this);
        this.name_txt.htmlText = "<b>" + this.data.ownerName;
        this.userid_txt.text = KEYS.Get("label_userid", { "v1": this.data.userid.Get() });
        this.online_txt.text = "";
        if (this.data.saved.Get() >= GLOBAL.Timestamp() - 62) {
            this.dot.gotoAndStop(2);
        } else {
            this.dot.gotoAndStop(1);
        }
        this.ownerName = this.data.ownerName;
        this.online = this.data.saved.Get();
        this.attackStarPoints = this.data.attacksto.Get() + this.data.attacksfrom.Get();
        this.helpStarPoints = this.data.helpsto.Get() + this.data.helpsfrom.Get();
        this.status = as3.str(_loc2_.relation);
        this.level = this.data.level.Get() | 0;
        let _loc3_: any[] = [1, 10, 85, 200];
        let _loc4_: string = this.attackStarPoints == 0 ? "#666666" : "#990000";
        let _loc5_: string = this.attackStarPoints == 1 ? "map_battle" : "map_battles";
        this.attacks_txt.htmlText = "<font color=\'" + _loc4_ + "\'>" + KEYS.Get(_loc5_, { "v1": this.attackStarPoints });
        this.status_txt.htmlText = "<font color=\'" + _loc2_.relationColor + "\'>" + _loc2_.relation;
        this.extraStatus_txt.htmlText = "<b><font color=\'" + _loc2_.extraStatusColor + "\'>" + _loc2_.extraStatus;
        this.levelStar.lv_txt.htmlText = "<b>" + this.level;
    }

    private setStars(param1: any, param2: any[], param3: any[]): void {
        let _loc4_: uint = 0;
        _loc4_ = 0;
        while (_loc4_ < param2.length) {
            if (param1 < param2[_loc4_]) {
                break;
            }
            _loc4_++;
        }
        let _loc5_: uint = 0;
        while (_loc5_ < param3.length) {
            if (_loc5_ < _loc4_) {
                param3[_loc5_].gotoAndStop(1);
            } else {
                param3[_loc5_].gotoAndStop(2);
            }
            _loc5_++;
        }
    }
}
