import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { AIATTACKPOPUP_CLIP, BASE, CREATURELOCKER, GLOBAL, ImageCache, KEYS, POPUPSETTINGS, SOUNDS, TRIBES, WMATTACK, bubblepopup3 } from "@game";

export class AIATTACKPOPUP extends AIATTACKPOPUP_CLIP {
    static {
        as3.fields(this, { _type: 0, d1: null, d2: null, d3: null, bm: null });
    }

    public _type: int;
    private d1: bubblepopup3;
    private d2: bubblepopup3;
    private d3: bubblepopup3;
    private bm: Bitmap;

    public $ctor(param1: int = 3): void {
        let imageComplete: Function = null;
        let attackerType: int = param1;
        imageComplete = (param1: string, param2: BitmapData): void => {
            this.bm = new Bitmap(param2);
            this.mcImage.addChild(this.bm);
        };
        super.$ctor();
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.sendNow.addEventListener(MouseEvent.CLICK, as3.bind(this, this.sendDown));
        this.sendNow.SetupKey("ai_engage_btn");
        this.waitBtn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onWaitDown));
        this.waitBtn.SetupKey("ai_preparedefenses_btn");
        ImageCache.GetImageWithCallBack(as3.str(TRIBES.TribeForBaseID(WMATTACK._attackersBaseID).splash), imageComplete);
        this.mcFrame.Setup(false);
        this.d1 = new bubblepopup3();
        this.d1.x = 398;
        this.d1.y = 214;
        this.addChild(this.d1);
        this.d2 = new bubblepopup3();
        this.d2.x = 398;
        this.d2.y = 260;
        this.addChild(this.d2);
        this.d3 = new bubblepopup3();
        this.d3.x = 398;
        this.d3.y = 306;
        this.addChild(this.d3);
        this._type = attackerType;
        this.title_txt.htmlText = KEYS.Get("ai_popupwarning_title");
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
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
        let _loc4_: string = null;
        let _loc2_: any = WMATTACK._queued.attack;
        let _loc3_: any[] = [];
        for (_loc4_ in _loc2_) {
            if (_loc2_[_loc4_] > 0 && CREATURELOCKER._creatures[_loc4_]) {
                _loc3_.push(_loc4_);
            }
        }
        // The warning has three places for monsters, but a wild attack can bring four or five kinds: the
        // strongest three are shown and the third one's note lists the rest.
        as3.sort(_loc3_, as3.bind(this, this.ioStronger));
        let ioOthers: any[] = [];
        while (_loc3_.length > 3) {
            let ioId: string = as3.str(_loc3_.pop());
            ioOthers.unshift(_loc2_[ioId] + " " + KEYS.Get(as3.str(CREATURELOCKER._creatures[ioId].name)));
        }
        switch (_loc3_.length) {
            case 1:
                this.removeChild(this.c2);
                this.removeChild(this.c3);
                break;
            case 2:
                this.removeChild(this.c3);
        }
        let _loc5_: any[] = [this.d1, this.d2, this.d3];
        let _loc6_: int = 0;
        while (_loc6_ < _loc3_.length) {
            if (_loc6_ == 2 && ioOthers.length > 0) {
                _loc5_[_loc6_].Setup(47, 23, KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc3_[_loc6_]].description)) + "<br><br><b>Also coming:</b> " + ioOthers.join(", "), 4);
            } else {
                _loc5_[_loc6_].Setup(47, 23, KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc3_[_loc6_]].description)), 3);
            }
            _loc6_++;
        }
        this.c1.addChild(this.d1);
        this.c2.addChild(this.d2);
        this.c3.addChild(this.d3);
        let _loc7_: any[] = [this.c1, this.c2, this.c3];
        let _loc8_: int = 0;
        while (_loc8_ < _loc3_.length) {
            ImageCache.GetImageWithCallBack("monsters/" + _loc3_[_loc8_] + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [_loc7_[_loc8_].mcIcon]);
            _loc7_[_loc8_].tInfo.htmlText = "x" + _loc2_[_loc3_[_loc8_]] + (_loc8_ == 2 && ioOthers.length > 0 ? " +" + ioOthers.length + " more" : "");
            _loc7_[_loc8_].tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc3_[_loc8_]].name)) + "</b>";
            _loc5_[_loc8_].visible = false;
            _loc7_[_loc8_].mouseChildren = false;
            _loc7_[_loc8_].addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.showDescription));
            _loc7_[_loc8_].addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.hideDescription));
            _loc8_++;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            this.name_txt.htmlText = "<b>" + KEYS.Get("inf_ai_tribe_mapview", { "v1": TRIBES.TribeForBaseID(WMATTACK._attackersBaseID).name }) + "</b>";
        } else {
            this.name_txt.htmlText = "<b>" + KEYS.Get("ai_tribe", { "v1": TRIBES.TribeForBaseID(WMATTACK._attackersBaseID).name }) + "</b>";
        }
    }

    /** Sorts monster kinds strongest first: health of one at the attack's level. */
    private ioStronger(a: string, b: string): int {
        let ha: number = this.ioHealth(a);
        let hb: number = this.ioHealth(b);
        return ha > hb ? -1 : (ha < hb ? 1 : 0);
    }

    private ioHealth(id: string): number {
        try {
            let health: any[] = as3.as(CREATURELOCKER._creatures[id].props.health, Array);
            let level: int = WMATTACK._queued && WMATTACK._queued.level ? WMATTACK._queued.level | 0 : 1;
            if (health && health.length > 0) {
                return Number(health[Math.max(0, Math.min(health.length, level) - 1)]);
            }
        } catch (e) {
        }
        return 0;
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
    }

    private showDescription(param1: MouseEvent): void {
        let _loc2_: any[] = [this.c1, this.c2, this.c3];
        let _loc3_: any[] = [this.d1, this.d2, this.d3];
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_.length) {
            if (param1.target == _loc2_[_loc4_]) {
                _loc3_[_loc4_].visible = true;
                this.setChildIndex(as3.cast(_loc2_[_loc4_], DisplayObject), (this.numChildren - 1) | 0);
            }
            _loc4_++;
        }
    }

    private hideDescription(param1: MouseEvent): void {
        let _loc2_: any[] = [this.c1, this.c2, this.c3];
        let _loc3_: any[] = [this.d1, this.d2, this.d3];
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_.length) {
            if (param1.target == _loc2_[_loc4_]) {
                _loc3_[_loc4_].visible = false;
            }
            _loc4_++;
        }
    }

    private sendDown(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        WMATTACK.Attack();
        this.closeDown();
    }

    private closeDown(param1: MouseEvent = null): void {
        SOUNDS.Play("close");
        WMATTACK.HideWarning();
    }

    public Resize(): void {
        POPUPSETTINGS.AlignToCenter(this);
        this.bm.x = GLOBAL._SCREENCENTER.x - 520 - this.bm.width * 0.5;
        this.bm.y = GLOBAL._SCREENCENTER.y - 250 - this.bm.height * 0.5;
    }
}
