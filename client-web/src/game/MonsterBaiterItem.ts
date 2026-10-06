import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { CREATURELOCKER, CREATURES, ImageCache, KEYS, MONSTERBAITER, MonsterBaiterItem_CLIP, SOUNDS } from "@game";

export class MonsterBaiterItem extends MonsterBaiterItem_CLIP {
    static {
        as3.fields(this, { _count: 0, _cost: 0, _configObj: null, _level: 0, _key: null, tick: 0, _enabled: false, _initialCount: 0 });
    }

    public _count: int;
    public _cost: int;
    public _configObj: any;
    public _level: int;
    public _key: string;
    private tick: int;
    private _enabled: boolean;
    private _initialCount: int;

    public $ctor(): void {
        super.$ctor();
        this.tInfo.textColor = 16711680;
    }

    public Setup(param1: string): void {
        this._configObj = CREATURELOCKER._creatures[param1];
        this._key = param1;
        ImageCache.GetImageWithCallBack("monsters/" + param1 + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this.mcIcon]);
        this.tInfo.text = "";
        this.tName.htmlText = "<b>" + KEYS.Get(as3.str(this._configObj.name)) + "</b>";
        this._cost = CREATURES.GetProperty(param1, "cStorage") | 0;
        this.decr_btn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.decrDown));
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.incr_btn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.incrDownB));
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
    }

    private onAdd(param1: Event): void {
        this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onStageUp));
        MONSTERBAITER._mc.Update();
    }

    private onStageUp(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.moreTick));
        MONSTERBAITER._mc.Update();
    }

    public Update(): void {
        if (this._count > 0) {
            this.tInfo.htmlText = KEYS.Get("bait_sending", { "v1": this._count });
        } else {
            this.tInfo.htmlText = "";
        }
        this.dispatchEvent(new Event(Event.CHANGE));
    }

    public getCost(): int {
        return (this._cost * this._count) | 0;
    }

    private incrDown(param1: MouseEvent): void {
        this._initialCount = this._count;
        ++this._count;
        this.tick = 0;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.moreTick));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Stop));
        MONSTERBAITER._mc.Update();
        SOUNDS.Play("click1");
    }

    private incrDownB(param1: MouseEvent): void {
        this.dispatchEvent(new Event("increment"));
        MONSTERBAITER._mc.Update();
    }

    private moreTick(param1: Event): void {
        if (this.tick > 10 && this.tick % 2 == 0 || this._count - this._initialCount > 60) {
            this.moreTickB();
        }
        ++this.tick;
        this.MovedOut();
    }

    private moreTickB(): void {
        ++this._count;
        MONSTERBAITER._mc.Update();
    }

    private decrDown(param1: MouseEvent): void {
        if (this._count > 0) {
            this._initialCount = this._count;
            --this._count;
            this.tick = 0;
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
            this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Stop));
            SOUNDS.Play("click1");
            MONSTERBAITER._mc.Update();
        }
    }

    private lessTick(param1: Event): void {
        if (this.tick > 10 && this.tick % 2 == 0 || this._initialCount - this._count > 60) {
            this.lessTickB();
        }
        ++this.tick;
        this.MovedOut();
    }

    private lessTickB(): void {
        if (this._count > 0) {
            --this._count;
        } else {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
        }
        MONSTERBAITER._mc.Update();
    }

    public Enable(param1: boolean): void {
        let _loc2_: number = 0.3;
        if (param1) {
            if (!this._enabled) {
                this._enabled = true;
                this.incr_btn.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.incrDown));
                this.incr_btn.alpha = this.decr_btn.alpha = 1;
            }
        } else {
            this._enabled = false;
            this.incr_btn.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.incrDown));
            this.incr_btn.alpha = _loc2_;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.moreTick));
        }
        this.decr_btn.alpha = Number(this._count > 0 ? 1 : _loc2_);
    }

    private MovedOut(): void {
        if (this.mouseX < this.incr_btn.x || this.mouseX > this.incr_btn.x + this.incr_btn.width || this.mouseY < this.incr_btn.y || this.mouseY > this.decr_btn.y + this.decr_btn.height) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.moreTick));
        }
    }

    private Stop(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.lessTick));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.moreTick));
    }
}
