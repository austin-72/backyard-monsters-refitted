import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BASE, CREATURELOCKER, INFERNO_EMERGENCE_EVENT, INFERNO_EMERGENCE_POPUPS, ImageCache, KEYS, POPUPSETTINGS, SOUNDS, WMATTACK, bubblepopup3, popup_infernoemerge_aiattack } from "@game";

export class INFERNO_EMERGENCE_ATTACKPOPUP extends popup_infernoemerge_aiattack {
    static {
        as3.fields(this, { _type: 0, _attackArray: null, d1: null, d2: null, d3: null, d4: null, d5: null, bm: null, _clips: null, _descriptions: null });
    }

    public _type: int;
    public _attackArray: any[];
    private d1: bubblepopup3;
    private d2: bubblepopup3;
    private d3: bubblepopup3;
    private d4: bubblepopup3;
    private d5: bubblepopup3;
    private bm: Bitmap;
    private _clips: any[];
    private _descriptions: any[];

    public $ctor(param1?: any[]): void {
        let imageComplete: Function = null;
        let attArr: any[] = param1;
        super.$ctor();
        imageComplete = (param1: string, param2: BitmapData): void => {
            this.bm = new Bitmap(param2);
            this.mcImage.addChild(this.bm);
        };
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        this.bAction.SetupKey("ai_engage_btn");
        ImageCache.GetImageWithCallBack("popups/" + "portrait_moloch.png", imageComplete);
        this.mcFrame.Setup(false);
        this.d1 = new bubblepopup3();
        this.d1.x = 50;
        this.d1.y = 20;
        this.d2 = new bubblepopup3();
        this.d2.x = 50;
        this.d2.y = 20;
        this.d3 = new bubblepopup3();
        this.d3.x = 50;
        this.d3.y = 20;
        this.d4 = new bubblepopup3();
        this.d4.x = 50;
        this.d4.y = 20;
        this.addChild(this.d4);
        this.d5 = new bubblepopup3();
        this.d5.x = 50;
        this.d5.y = 20;
        this._clips = [this.c1, this.c2, this.c3, this.c4, this.c5];
        this._descriptions = [this.d1, this.d2, this.d3, this.d4, this.d5];
        this._attackArray = attArr;
        this.tTitle.htmlText = KEYS.Get("ai_inferno_popupwarning_title");
        this.tName.htmlText = "";
        this.Resize();
    }

    private onWaitDown(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        WMATTACK._queued.warned = 1;
        BASE.Save(0, false, true);
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    private onAdd(param1: Event): void {
        let _loc2_: any[] = [];
        let _loc3_: int = 0;
        while (_loc3_ < this._attackArray.length) {
            _loc2_.push(this._attackArray[_loc3_][0]);
            _loc3_++;
        }
        switch (_loc2_.length) {
            case 1:
                this.removeChild(this.c2);
                this.removeChild(this.c3);
                this.removeChild(this.c4);
                this.removeChild(this.c5);
                break;
            case 2:
                this.removeChild(this.c3);
                this.removeChild(this.c4);
                this.removeChild(this.c5);
                break;
            case 3:
                this.removeChild(this.c4);
                this.removeChild(this.c5);
                break;
            case 4:
                this.removeChild(this.c5);
        }
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_.length) {
            this._descriptions[_loc4_].Setup(50, 20, KEYS.Get("emerge_mondesc_" + CREATURELOCKER._creatures[_loc2_[_loc4_]].description), 3);
            _loc4_++;
        }
        this.c1.addChild(this.d1);
        this.c2.addChild(this.d2);
        this.c3.addChild(this.d3);
        this.c4.addChild(this.d4);
        this.c5.addChild(this.d5);
        let _loc5_: int = 0;
        while (_loc5_ < _loc2_.length) {
            ImageCache.GetImageWithCallBack("monsters/" + _loc2_[_loc5_] + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this._clips[_loc5_].mcIcon]);
            this._clips[_loc5_].tInfo.htmlText = "x" + this._attackArray[_loc5_][2];
            this._clips[_loc5_].tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc2_[_loc5_]].name)) + "</b>";
            this._descriptions[_loc5_].visible = false;
            this._clips[_loc5_].mouseChildren = false;
            this._clips[_loc5_].addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.showDescription));
            this._clips[_loc5_].addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.hideDescription));
            _loc5_++;
        }
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
    }

    private showDescription(param1: MouseEvent): void {
        let _loc2_: int = 0;
        while (_loc2_ < this._clips.length) {
            if (param1.target == this._clips[_loc2_]) {
                this._descriptions[_loc2_].visible = true;
                this.setChildIndex(as3.cast(this._clips[_loc2_], DisplayObject), (this.numChildren - 1) | 0);
            }
            _loc2_++;
        }
    }

    private hideDescription(param1: MouseEvent): void {
        let _loc2_: int = 0;
        while (_loc2_ < this._clips.length) {
            if (param1.target == this._clips[_loc2_]) {
                this._descriptions[_loc2_].visible = false;
            }
            _loc2_++;
        }
    }

    private sendDown(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        INFERNO_EMERGENCE_EVENT.TriggerAttack(param1);
        this.closeDown();
    }

    private closeDown(param1: MouseEvent = null): void {
        SOUNDS.Play("close");
        INFERNO_EMERGENCE_POPUPS.HideWarning();
    }

    public Resize(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }
}
