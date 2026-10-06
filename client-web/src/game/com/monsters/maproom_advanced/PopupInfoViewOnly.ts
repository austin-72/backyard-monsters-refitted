import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Loader } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { BASE, EnumYardType, GLOBAL, ImageCache, IoMapUi, KEYS, MapRoomCell, PopupInfoViewOnly_CLIP, TRIBES, com_monsters_maproom_advanced_MapRoom as MapRoom, frame } from "@game";

export class PopupInfoViewOnly extends PopupInfoViewOnly_CLIP {
    static {
        as3.fields(this, { _cell: null, _profilePic: null, _profileBmp: null });
    }

    private _cell: MapRoomCell;
    private _profilePic: Loader;
    private _profileBmp: Bitmap;

    public $ctor(): void {
        super.$ctor();
        this.x = 760 / 2 + 75;
        this.y = 520 / 2;
        this.bView.SetupKey("map_view_btn");
        this.bView.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("view");
        });
        this.bView.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.View();
        });
        (as3.as(this.mcFrame, frame)).Setup();
    }

    public Hide(param1: MouseEvent = null): void {
        if (Boolean(this._profilePic) && Boolean(this._profilePic.parent)) {
            this._profilePic.parent.removeChild(this._profilePic);
            this._profilePic = null;
        }
        if (Boolean(this._profileBmp) && Boolean(this._profileBmp.parent)) {
            this._profileBmp.parent.removeChild(this._profileBmp);
            this._profileBmp = null;
        }
        MapRoom._mc.HideInfoViewOnly();
    }

    public Setup(param1: MapRoomCell, param2: boolean = false): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc6_: any = null;
        this._cell = param1;
        this.tLabel1.htmlText = "<b>" + KEYS.Get("popup_label_namelocheight") + "</b>";
        this.tLabel2.htmlText = "<b>" + KEYS.Get("popup_label_thisyardhas") + "</b>";
        if (this._cell._base == 3) {
            if (this._cell._baseID == MapRoom._inviteBaseID) {
                this.tName.htmlText = "<b>" + KEYS.Get("map_outpostowner", { "v1": this._cell._name }) + " (" + KEYS.Get("map_target") + ")</b>";
            } else if (!this._cell._destroyed) {
                this.tName.htmlText = "<b>" + KEYS.Get("map_outpostowner", { "v1": this._cell._name }) + "</b>";
            } else {
                this.tName.htmlText = "<b>" + KEYS.Get("map_outpostowner", { "v1": this._cell._name }) + " (" + KEYS.Get("newmap_inf_destroyed") + ")</b>";
            }
            this.ProfilePic();
        } else if (this._cell._base == 2) {
            this.tName.htmlText = "<b>" + KEYS.Get("map_yardowner", { "v1": this._cell._name }) + "</b>";
            this.ProfilePic();
        } else if (this._cell._base == 1) {
            if (!this._cell._destroyed) {
                this.tName.htmlText = "<b>" + KEYS.Get("ai_tribe", { "v1": TRIBES.DisplayName(this._cell._name) }) + "</b>";
            } else {
                this.tName.htmlText = "<b>" + KEYS.Get("ai_tribe", { "v1": TRIBES.DisplayName(this._cell._name) }) + " (" + KEYS.Get("newmap_inf_destroyed") + ")</b>";
            }
            this.ProfilePic();
        }
        this.tLocation.htmlText = IoMapUi.location(this._cell.X, this._cell.Y);
        this.tHeight.htmlText = this._cell._height - 100 + "m";
        if (this._cell._base == 2) {
            _loc3_ = 0;
        } else {
            _loc3_ = (this._cell._height * 100 / GLOBAL._averageAltitude.Get() - 100) | 0;
        }
        if (this._cell._base == 2) {
            _loc4_ = 0;
        } else {
            _loc4_ = (100 * GLOBAL._averageAltitude.Get() / this._cell._height - 100) | 0;
        }
        if (_loc3_ >= 0) {
            _loc5_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h1", { "v1": _loc3_ }) + "</font>";
        } else {
            _loc5_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h1", { "v1": Math.abs(_loc3_) }) + "</font>";
        }
        if (_loc4_ >= 0) {
            _loc6_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h2", { "v1": _loc4_ }) + "</font>";
        } else {
            _loc6_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h2", { "v1": Math.abs(_loc4_) }) + "</font>";
        }
        this.tBonus.htmlText = _loc5_ + "<br>" + _loc6_;
        this.ButtonInfo("view");
        this.Update();
    }

    private ProfilePic(): void {
        let onImageLoad: Function = null;
        let LoadImageError: Function = null;
        onImageLoad = null;
        let imageComplete: Function = null;
        LoadImageError = null;
        onImageLoad = (param1: Event): void => {
            this._profilePic.width = this._profilePic.height = 50;
            this._profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            this._profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        imageComplete = (param1: string, param2: BitmapData): void => {
            this._profileBmp = new Bitmap(param2);
            this.mcProfilePic.mcBG.addChild(this._profileBmp);
        };
        LoadImageError = (param1: IOErrorEvent): void => {
            this._profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            this._profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        if (!this._cell._facebookID && this._cell._base != 1 && !this._cell._pic_square) {
            return;
        }
        if (this._cell._base > 1) {
            if (!GLOBAL._flags.viximo) {
                this._profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this._profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                if (this._cell._pic_square) {
                    this._profilePic.load(new URLRequest(this._cell._pic_square));
                }
            } else {
                this._profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this._profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                this._profilePic.load(new URLRequest("http://graph.facebook.com/" + this._cell._facebookID + "/picture"));
            }
        } else {
            switch (this._cell._name) {
                case "Dreadnought":
                case "Dreadnaut":
                    ImageCache.GetImageWithCallBack("monsters/tribe_dreadnaut_50.v2.jpg", imageComplete);
                    break;
                case "Kozu":
                    ImageCache.GetImageWithCallBack("monsters/tribe_kozu_50.v2.jpg", imageComplete);
                    break;
                case "Legionnaire":
                    ImageCache.GetImageWithCallBack("monsters/tribe_legionnaire_50.v2.jpg", imageComplete);
                    break;
                case "Abunakki":
                    ImageCache.GetImageWithCallBack("monsters/tribe_abunakki_50.v2.jpg", imageComplete);
                    break;
                case "Moloch":
                    ImageCache.GetImageWithCallBack("monsters/tribe_moloch_50.jpg", imageComplete);
            }
        }
    }

    public Cleanup(): void {
        this.bView.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("view");
        });
        this.bView.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.View();
        });
        if (this.mcFrame) {
            this.mcFrame.Clear();
            this.mcFrame = null;
        }
    }

    public View(): void {
        let _loc1_: int = 0;
        MapRoom.HideFromViewOnly();
        if (MapRoom._mc) {
            GLOBAL._attackerCellsInRange = MapRoom._mc.GetCellsInRange(this._cell.X, this._cell.Y, 10);
        }
        GLOBAL._currentCell = this._cell;
        if (this._cell._base == 1) {
            BASE.LoadBase(null, 0, this._cell._baseID, "wmview", false, EnumYardType.MAIN_YARD);
        } else {
            _loc1_ = this._cell._base == 3 ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, this._cell._baseID, "view", false, _loc1_);
        }
    }

    public ButtonInfo(param1: string): void {
        this.txtButtonInfo.htmlText = KEYS.Get("newmap_view", { "v1": this._cell._base == 1 ? TRIBES.DisplayName(this._cell._name) : this._cell._name });
        this.mcArrow.x = this.bView.x + this.bView.width / 2 - 5;
    }

    public Update(): void {
        let _loc1_: string = "";
        _loc1_ = "X:" + this._cell.X + " Y:" + this._cell.Y + "<br>_base:" + this._cell._base + "<br>_height:" + this._cell._height + "<br>_water:" + this._cell._water + "<br>_mine:" + this._cell._mine + "<br>_flinger:" + this._cell._flingerRange.Get() + "<br>_catapult:" + this._cell._catapult + "<br>_userID:" + this._cell._userID + "<br>_truce:" + this._cell._truce + "<br>_name:" + this._cell._name + "<br>_protected:" + this._cell._protected + "<br>_resources:" + JSON.stringify(this._cell._resources) + "<br>_ticks:" + JSON.stringify(this._cell._ticks) + "<br>_monsters:" + JSON.stringify(this._cell._monsters);
        if (this._cell._monsterData) {
            _loc1_ += "<br>_monsterData:" + JSON.stringify(this._cell._monsterData);
            _loc1_ += "<br>_monsterData.saved:" + JSON.stringify(this._cell._monsterData.saved);
            _loc1_ += "<br>_monsterData.h:" + JSON.stringify(this._cell._monsterData.h);
            _loc1_ += "<br>_monsterData.hcount:" + this._cell._monsterData.hcount;
        }
    }
}
