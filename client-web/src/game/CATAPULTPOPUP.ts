import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { MouseEvent, TimerEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextField } from "flash/text";
import { Timer } from "flash/utils";
import { ATTACK, CATAPULTITEM, CATAPULTPOPUP_view, CHAMPIONBUTTON, GLOBAL, ImageCache, KEYS, POPUPSETTINGS, ResourceBombs, UI2 } from "@game";

export class CATAPULTPOPUP extends CATAPULTPOPUP_view {
    static {
        as3.fields(this, { _t: null, _open: false, _items: null, _currentImage: null, _bm: null, _canClose: false, m_waitTime: 0 });
    }

    private _t: Timer;
    private _open: boolean;
    private _items: any[];
    private _currentImage: string;
    private _bm: Bitmap;
    private _canClose: boolean;
    private m_waitTime: int;

    public $ctor(): void {
        super.$ctor();
    }

    public static Format(param1: number, param2: boolean = false): string {
        let _loc3_: string = null;
        let _loc4_: string = null;
        if (param1 > 1000000) {
            _loc3_ = "" + param1 / 1000000;
            _loc4_ = param2 ? " " + KEYS.Get("bomb_million_long") : KEYS.Get("bomb_million_short");
            _loc3_ += _loc4_;
        } else {
            _loc3_ = GLOBAL.FormatNumber(param1);
        }
        return _loc3_;
    }

    public get waitTime(): int {
        return this.m_waitTime;
    }

    public Setup(param1: boolean): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: string = null;
        let _loc5_: CATAPULTITEM = null;
        this._imageContainer.txtName.selectable = false;
        if (param1) {
            this._mc.visible = false;
            this.Update();
            return;
        }
        this._mc.visible = true;
        this._imageContainer.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.Show));
        this._imageContainer._image.buttonMode = true;
        this._items = [];
        // The stock first row has three slots (tw0-tw2). A fourth, used by the Inferno ammunition, goes
        // in the column the other rows use for theirs. Read the positions before slots are removed.
        let ioSlots: any = { "tw3": new Point(this._mc.pb3.x, this._mc.tw0.y) };
        for (_loc4_ in ResourceBombs._bombs) {
            _loc3_ = ResourceBombs._bombs[_loc4_].col | 0;
            _loc2_ = ResourceBombs._bombs[_loc4_].group | 0;
            _loc5_ = new CATAPULTITEM();
            if (this._mc[_loc4_]) {
                _loc5_.x = Number(this._mc[_loc4_].x);
                _loc5_.y = Number(this._mc[_loc4_].y);
                this._mc.removeChild(as3.cast(this._mc[_loc4_], DisplayObject));
            } else if (ioSlots[_loc4_]) {
                _loc5_.x = Number(ioSlots[_loc4_].x);
                _loc5_.y = Number(ioSlots[_loc4_].y);
            }
            _loc5_.Setup(_loc4_);
            _loc5_.addEventListener(MouseEvent.MOUSE_OVER, this.overBomb(_loc5_));
            _loc5_.addEventListener(MouseEvent.MOUSE_OUT, this.hideBomb(_loc5_));
            _loc5_.addEventListener(MouseEvent.MOUSE_DOWN, this.downBomb(_loc5_));
            this._mc.addChild(_loc5_);
            this._items.push(_loc5_);
        }
        this._t = new Timer(100);
        this._t.addEventListener(TimerEvent.TIMER, as3.bind(this, this.testMouseOff));
        ResourceBombs._mc = this;
        this.Update();
        this.Hide();
    }

    private downBomb(param1: CATAPULTITEM): Function {
        let b: CATAPULTITEM = null;
        b = param1;
        return (param1: MouseEvent): void => {
            if (b.Enabled) {
                this.Hide();
                ResourceBombs._bombid = b._bombid;
                this._imageContainer.txtName.htmlText = "<font color=\"#FF0000\">Cancel</font>";
                this.Update();
                this.Fire(param1);
            }
        };
    }

    private hideBomb(param1: CATAPULTITEM): Function {
        let b: CATAPULTITEM = null;
        b = param1;
        return (param1: MouseEvent): void => {
            b.Hide();
        };
    }

    private overBomb(param1: CATAPULTITEM): Function {
        let b: CATAPULTITEM = null;
        b = param1;
        return (param1: MouseEvent): void => {
            b.ShowOver();
            b.parent.setChildIndex(b, (b.parent.numChildren - 1) | 0);
        };
    }

    private testMouseOff(param1: TimerEvent): void {
        if (this._open) {
            if (this._canClose && (this._mc.mouseX < this._mc._bg.x || this._mc.mouseX > this._mc._bg.width + this._mc._bg.x || this._mc.mouseY < this._mc._bg.y || this._mc.mouseY > this._mc._bg.height + this._mc._bg.y)) {
                this.Hide();
            } else if (this._mc.mouseX > this._mc._bg.x && this._mc.mouseX < this._mc._bg.width + this._mc._bg.x && this._mc.mouseY > this._mc._bg.y && this._mc.mouseY < this._mc._bg.height + this._mc._bg.y) {
                this._canClose = true;
            }
        }
    }

    public Update(): void {
        let _loc4_: CATAPULTITEM = null;
        let _loc1_: any = { "tw": KEYS.Get("bomb_tw_name"), "pb": KEYS.Get("bomb_pb_name"), "pu": KEYS.Get("bomb_pu_name") };
        let _loc2_: any = ResourceBombs._bombs[ResourceBombs._bombid];
        this._mc.tTitleTwig.htmlText = KEYS.Get("bomb_tw_name_pl");
        this._mc.tTitlePebble.htmlText = KEYS.Get("bomb_pb_name_pl");
        this._mc.tTitlePutty.htmlText = KEYS.Get("bomb_pu_name");
        if (GLOBAL.INFERNO_ONLY) {
            this._mc.tTitleTwig.htmlText = KEYS.Get("#w_decoy#");
            this._mc.tTitlePebble.htmlText = KEYS.Get("#w_jars#");
            this._mc.tTitlePutty.htmlText = "Sulfur Bomb";
            // The title boxes were sized for "Twigs" and wrap: "Marilyn Monstroe" showed as "Marilyn".
            CATAPULTPOPUP.ioFitTitle(this._mc.tTitleTwig);
            CATAPULTPOPUP.ioFitTitle(this._mc.tTitlePebble);
            CATAPULTPOPUP.ioFitTitle(this._mc.tTitlePutty);
        }
        let _loc3_: string = String(_loc1_[ResourceBombs._bombid.substr(0, 2)]);
        if (_loc2_.image != this._currentImage) {
            ImageCache.GetImageWithCallBack(as3.str(_loc2_.image), as3.bind(this, this.onImageLoaded));
        }
        for (_loc4_ of as3.values(this._items)) {
            _loc4_.Update();
        }
        if (ResourceBombs._state == 0) {
            this._imageContainer.txtName.htmlText = "<font color=\"#FFFFFF\">Catapult</font>";
        } else if (ResourceBombs._state == 1) {
            this._imageContainer.txtName.htmlText = "<font color=\"#FF0000\">Cancel</font>";
        }
    }

    /** One line, widened to the left (the titles are right-aligned) when the text is longer. */
    private static ioFitTitle(param1: TextField): void {
        if (!param1) {
            return;
        }
        param1.wordWrap = false;
        param1.multiline = false;
        let need: number = param1.textWidth + 6;
        if (need > param1.width) {
            let right: number = param1.x + param1.width;
            param1.width = need;
            param1.x = right - need;
        }
    }

    private onImageLoaded(param1: string, param2: BitmapData): void {
        if (this._bm) {
            if (this._bm.parent) {
                this._bm.parent.removeChild(this._bm);
            }
            this._bm = null;
        }
        this._bm = new Bitmap(param2);
        this._bm.width = this._bm.height = 60;
        this._imageContainer._image.addChild(this._bm);
        this._currentImage = param1;
    }

    public fired(): void {
        this._imageContainer.txtName.htmlText = "<font color=\"#FFFFFF\">Catapult</font>";
    }

    public Show(param1: MouseEvent = null): void {
        let _loc2_: string = null;
        let _loc3_: any = null;
        for (_loc2_ in ATTACK._flingerBucket) {
            if (ATTACK._flingerBucket[_loc2_].Get() > 0) {
                if (_loc2_.substr(0, 1) != "G") {
                    ATTACK._curCreaturesAvailable[_loc2_] += ATTACK._flingerBucket[_loc2_].Get();
                    ATTACK._flingerBucket[_loc2_].Set(0);
                }
            }
        }
        for (_loc3_ of as3.values(UI2._top._creatureButtons)) {
            if (_loc3_ instanceof CHAMPIONBUTTON) {
                if (_loc3_._sent) {
                    (as3.as(_loc3_, CHAMPIONBUTTON)).deSelectSend();
                }
            }
            _loc3_.Update();
        }
        ATTACK.RemoveDropZone();
        if (UI2._top._siegeweapon) {
            UI2._top._siegeweapon.Cancel();
        }
        if (ResourceBombs._state != 0) {
            ResourceBombs.BombRemove();
            this._imageContainer.txtName.htmlText = "<font color=\"#FFFFFF\">Catapult</font>";
            return;
        }
        this.addChild(this._mc);
        this._t.start();
        this._open = true;
        this._canClose = false;
        param1.stopImmediatePropagation();
    }

    public Fire(param1: MouseEvent = null): void {
        this.m_waitTime = (GLOBAL.Timestamp() + 1) | 0;
        if (UI2._top._siegeweapon) {
            UI2._top._siegeweapon.Cancel();
        }
        if (ResourceBombs._state == 0) {
            if (ResourceBombs._bombid && !ResourceBombs._bombs[ResourceBombs._bombid].used && ResourceBombs.canAfford(ResourceBombs._bombs[ResourceBombs._bombid])) {
                ResourceBombs.BombAdd(ResourceBombs._bombs[ResourceBombs._bombid]);
            }
        } else {
            ResourceBombs.BombRemove();
        }
    }

    public Hide(): void {
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._t.stop();
        this._open = false;
        this.Update();
    }

    public CanUse(): boolean {
        return true;
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
