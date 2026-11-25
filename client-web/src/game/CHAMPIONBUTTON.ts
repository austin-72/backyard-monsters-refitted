import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { getTimer } from "flash/utils";
import { ATTACK, CHAMPIONCAGE, CREEPS, GLOBAL, GUARDIANBUTTON_CLIP, ImageCache, IoToast, KEYS, bubblepopup3 } from "@game";

export class CHAMPIONBUTTON extends GUARDIANBUTTON_CLIP {
    static {
        as3.fields(this, { _creatureID: null, _creatureData: null, _level: 0, _description: null, _sent: false, _index: 0, MAX_ICON_LEVEL: 6 });
    }

    public _creatureID: string;
    public _creatureData: any;
    public _level: int;
    public _description: bubblepopup3;
    public _sent: boolean;
    private _index: int;
    private MAX_ICON_LEVEL: uint;

    public $ctor(param1?: string, param2?: int, param3?: int, param4?: int, param5?: DisplayObjectContainer): void {
        super.$ctor();
        this._index = param3;
        this._creatureID = param1;
        this._creatureData = CHAMPIONCAGE._guardians[param1];
        this._level = Math.min(this.MAX_ICON_LEVEL, param2) | 0;
        let _loc6_: string = String(CHAMPIONCAGE._guardians[param1].name);
        if (Boolean(as3.vget(GLOBAL._playerGuardianData, this._index)) && Boolean(as3.vget(GLOBAL._playerGuardianData, this._index).l.Get())) {
            this.txtName.htmlText = "<b>" + _loc6_ + " Level " + as3.vget(GLOBAL._playerGuardianData, this._index).l.Get() + "</b>";
        } else {
            this.txtName.htmlText = "<b>" + _loc6_ + " Level 1</b>";
        }
        ImageCache.GetImageWithCallBack("monsters/" + this._creatureID + "_L" + this._level + "-small.png", as3.bind(this, this.IconLoaded), true, 1);
        this._description = new bubblepopup3();
        this._description.Setup(190, 26, KEYS.Get(as3.str(CHAMPIONCAGE._guardians[this._creatureID].description)), 5);
        param5.addChild(this._description);
        this._description.visible = false;
        this._bg.gotoAndStop("bg" + String(param4 % 2 + 1));
        this.bSend.SetupKey("btn_send");
        this.bSend.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Send));
        this.bRetreat.SetupKey("btn_retreat");
        if (GLOBAL.INFERNO_ONLY) {
            this.ioRetreatButton();
        } else {
            this.bRetreat.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Retreat));
        }
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.Out));
        if (!GLOBAL.isInAttackMode) {
            this.bSend.visible = false;
            this.bSend.Enabled = false;
            this.bRetreat.visible = false;
            this.bRetreat.Enabled = false;
        }
        if (CREEPS._flungGuardian) {
            CREEPS._flungGuardian[this._index] = false;
        }
        this.Update();
    }

    public IconLoaded(param1: string, param2: BitmapData): void {
        this.mcImage.addChild(new Bitmap(param2));
    }

    public Update(): void {
        if (CREEPS._flungGuardian[this._index]) {
            this.bSend.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Send));
            this.bSend.Enabled = false;
        }
    }

    public Send(param1: MouseEvent): void {
        if (!this._sent) {
            ATTACK.BucketAdd(this._creatureID);
            this.bSend.SetupKey("btn_hold");
            ATTACK.BucketUpdate();
            this._sent = true;
        } else {
            this.deSelectSend();
        }
        this.Update();
    }

    public deSelectSend(): void {
        if (this.bSend.Enabled) {
            ATTACK.BucketRemove(this._creatureID);
            this.bSend.SetupKey("btn_send");
            ATTACK.BucketUpdate();
            this._sent = false;
        }
    }

    /** (Inferno-only, QoL #551) when the hold on Retreat began; 0 when none */
    private static _ioHeldAt: number = 0;

    /** QoL #551: on touch, Retreat is held for half a second */
    public static readonly IO_HOLD_MS: int = 500;

    /**
     * Inferno-only (QoL #551): Retreat no longer right against Send (2 px apart, so a miss on Send called the champion
     * back), and on a touch screen it is held for half a second (a tap says "Hold Retreat to call it back").
     */
    private ioRetreatButton(): void {
        let gap: number = this.bRetreat.x - (this.bSend.x + this.bSend.width);
        if (Math.abs(this.bRetreat.y - this.bSend.y) < 4 && gap >= 0 && gap < 10) {
            // the room is taken from Send's side: Send narrower by the difference, Retreat where it was
            let more: number = 10 - gap;
            this.bSend.Setup(this.bSend.label, false, Math.max(40, this.bSend.width - more) | 0, this.bSend.height | 0);
        }
        this.bRetreat.name = "ioChampRetreat";
        if (!GLOBAL.ioTouch) {
            this.bRetreat.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Retreat));
            return;
        }
        this.bRetreat.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            CHAMPIONBUTTON._ioHeldAt = getTimer();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
        });
        this.bRetreat.addEventListener(MouseEvent.MOUSE_UP, (e: MouseEvent): void => {
            if (CHAMPIONBUTTON._ioHeldAt > 0) {
                CHAMPIONBUTTON._ioHeldAt = 0;
                this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
                IoToast.Show(KEYS.Get("io_champ_hold"), 2500);
            }
        });
        this.bRetreat.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            CHAMPIONBUTTON._ioHeldAt = 0;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
        });
    }

    private ioHoldTick(e: Event = null): void {
        if (CHAMPIONBUTTON._ioHeldAt > 0 && getTimer() - CHAMPIONBUTTON._ioHeldAt >= CHAMPIONBUTTON.IO_HOLD_MS) {
            CHAMPIONBUTTON._ioHeldAt = 0;
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
            this.Retreat(null);
        }
    }

    public Retreat(param1: MouseEvent): void {
        let _loc2_: int = CREEPS.getGuardianIndex(Number(this._creatureID.substr(1)) | 0);
        if (_loc2_ >= 0) {
            as3.vget(CREEPS._guardianList, _loc2_).changeModeRetreat();
        }
    }

    public Over(param1: MouseEvent): void {
        this._description.visible = true;
    }

    public Out(param1: MouseEvent): void {
        this._description.visible = false;
    }
}
