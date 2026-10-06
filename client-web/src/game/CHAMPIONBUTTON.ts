import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer } from "flash/display";
import { MouseEvent } from "flash/events";
import { ATTACK, CHAMPIONCAGE, CREEPS, GLOBAL, GUARDIANBUTTON_CLIP, ImageCache, KEYS, bubblepopup3 } from "@game";

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
        this.bRetreat.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Retreat));
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
