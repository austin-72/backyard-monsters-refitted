import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { ATTACK, CREATUREBUTTON_CLIP, CREATURELOCKER, GLOBAL, ImageCache, KEYS, UI2, bubblepopup3 } from "@game";

export class CREATUREBUTTON extends CREATUREBUTTON_CLIP {
    static {
        as3.fields(this, { _creatureID: null, _creatureData: null, _tick: 0, _description: null, m_index: 0 });
    }

    public _creatureID: string;
    public _creatureData: any;
    public _tick: int;
    public _description: bubblepopup3;
    protected m_index: int;

    public $ctor(param1?: string, param2?: int, param3?: DisplayObjectContainer): void {
        let _loc4_: string = null;
        super.$ctor();
        this._creatureID = param1;
        this._creatureData = CREATURELOCKER._creatures[this._creatureID];
        ImageCache.GetImageWithCallBack("monsters/" + this._creatureID + "-small.png", as3.bind(this, this.IconLoaded), true, 1);
        _loc4_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[this._creatureID].name));
        let _loc5_: uint = (Math.max(0.8, Math.min(1, 1 / (_loc4_.length / 10))) * 12) >>> 0;
        if (Boolean(GLOBAL.attackingPlayer.m_upgrades[param1]) && Boolean(GLOBAL.attackingPlayer.m_upgrades[param1].level)) {
            this.txtName.htmlText = "<b><font size=\"" + _loc5_ + "\">" + _loc4_ + " Level " + GLOBAL.attackingPlayer.m_upgrades[param1].level + "</font></b>";
        } else {
            this.txtName.htmlText = "<b><font size=\"" + _loc5_ + "\">" + _loc4_ + " Level 1</font></b>";
        }
        this._description = new bubblepopup3();
        this._description.Setup(190, 26, KEYS.Get(as3.str(CREATURELOCKER._creatures[this._creatureID].description)), 5);
        param3.addChild(this._description);
        this._description.visible = false;
        this.m_index = param2;
        this._bg.gotoAndStop("bg" + String(this.m_index % 2 + 1));
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.Out));
        if (!GLOBAL.isInAttackMode) {
            this.bMore.visible = false;
            this.bMore.Enabled = false;
            this.bLess.visible = false;
            this.bLess.Enabled = false;
            this.txtNumber.x = 40;
        } else {
            this.bMore.Setup("+");
            this.bMore.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.More));
            this.bMore.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Clear));
            this.bMore.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
            this.bLess.Setup("-");
            this.bLess.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.Less));
            this.bLess.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Clear));
            this.bLess.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
            this.txtNumber.x = 110;
        }
        this._tick = 0;
        this.Update();
    }

    public IconLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        this._creatureImage.addChild(_loc3_);
    }

    public Update(): void {
        let _loc1_: int = 0;
        _loc1_ = ATTACK._curCreaturesAvailable[this._creatureID] | 0;
        let _loc2_: any = "<b>";
        if (ATTACK._flingerBucket[this._creatureID]) {
            _loc2_ = "<font color=\"#FF0000\">" + ATTACK._flingerBucket[this._creatureID].Get() + "</font> / ";
        }
        _loc2_ += _loc1_ + "</b>";
        this.txtNumber.htmlText = as3.str(_loc2_);
        if (_loc1_ > 0) {
            this.bMore.enabled = true;
            this._bg.gotoAndStop("bg" + String(this.m_index % 2 + 1));
        }
        if (_loc1_ <= 0) {
            this.bMore.enabled = false;
            this._bg.gotoAndStop("full" + String(this.m_index % 2 + 1));
        }
    }

    public Over(param1: MouseEvent): void {
        this._description.visible = true;
    }

    public Out(param1: MouseEvent): void {
        this._description.visible = false;
    }

    public Clear(param1: MouseEvent = null): void {
        if (this.hasEventListener(Event.ENTER_FRAME)) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.MoreTick));
        }
        if (this.hasEventListener(Event.ENTER_FRAME)) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.LessTick));
        }
    }

    public More(param1: MouseEvent): void {
        UI2._top.BombDeselect();
        this.MoreTickB();
        this._tick = 0;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.MoreTick));
    }

    public MoreTick(param1: Event = null): void {
        if (this._tick > 10 && this._tick % 2 == 0) {
            this.MoreTickB();
        }
        this.MoreMovedOut();
        ++this._tick;
    }

    public MoreTickB(): void {
        ATTACK.BucketAdd(this._creatureID);
        this.Update();
        ATTACK.BucketUpdate();
    }

    public Less(param1: MouseEvent): void {
        UI2._top.BombDeselect();
        this.LessTickB();
        this._tick = 0;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.LessTick));
    }

    public LessTick(param1: Event = null): void {
        if (this._tick > 10 && this._tick % 2 == 0) {
            this.LessTickB();
        }
        this.LessMovedOut();
        ++this._tick;
    }

    public LessTickB(): void {
        ATTACK.BucketRemove(this._creatureID);
        this.Update();
        ATTACK.BucketUpdate();
    }

    public MoreMovedOut(): void {
        if (this.mouseX < this.bMore.x || this.mouseX > this.bMore.x + this.bMore.width || this.mouseY < this.bMore.y || this.mouseY > this.bMore.y + this.bMore.height) {
            this.Clear();
        }
    }

    public LessMovedOut(): void {
        if (this.mouseX < this.bLess.x || this.mouseX > this.bLess.x + this.bLess.width || this.mouseY < this.bLess.y || this.mouseY > this.bLess.y + this.bLess.height) {
            this.Clear();
        }
    }
}
