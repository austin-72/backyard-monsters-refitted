import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, GLOBAL, KEYS, NEXTWAVEBAR_CLIP, SPECIALEVENT, TUTORIAL, UI_BOTTOM, bubblepopupDownBuff } from "@game";

export class UI_NEXTWAVE extends NEXTWAVEBAR_CLIP {
    static {
        as3.fields(this, { _popupWaveInfo: null });
    }

    private _popupWaveInfo: bubblepopupDownBuff;

    public $ctor(): void {
        super.$ctor();
    }

    public static ShouldDisplay(): boolean {
        if (GLOBAL.mode !== GLOBAL.e_BASE_MODE.BUILD) {
            return false;
        }
        if (!BASE.isMainYard) {
            return false;
        }
        if (TUTORIAL._stage < TUTORIAL._endstage) {
            return false;
        }
        if (!SPECIALEVENT.EventActive()) {
            return false;
        }
        if (SPECIALEVENT.wave > SPECIALEVENT.numWaves) {
            return false;
        }
        if (SPECIALEVENT.active) {
            return false;
        }
        return true;
    }

    private static OnBarClicked(param1: MouseEvent): void {
        SPECIALEVENT.StartRound();
    }

    public Setup(): void {
        SPECIALEVENT.Setup();
        this.mcHit.addEventListener(MouseEvent.CLICK, UI_NEXTWAVE.OnBarClicked);
        this.mcHit.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.WaveShow));
        this.mcHit.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.WaveHide));
        this.mcHit.buttonMode = true;
        this.mcHit.mouseChildren = false;
        this.SetWave(SPECIALEVENT.wave);
        this.Resize();
    }

    public Resize(): void {
        if (UI_BOTTOM._mc) {
            this.x = UI_BOTTOM._mc.x + UI_BOTTOM._mc.width - this.mcHit.width;
            this.y = UI_BOTTOM._mc.y - this.mcHit.height;
        }
    }

    public WaveShow(param1: MouseEvent): void {
        let _loc7_: bubblepopupDownBuff = null;
        if (SPECIALEVENT.wave >= SPECIALEVENT.EVENTEND) {
            return;
        }
        let _loc2_: MovieClip = as3.as(param1.currentTarget, MovieClip);
        let _loc3_: string = "";
        let _loc4_: string = "";
        let _loc5_: any = _loc2_.name + "_desc";
        let _loc6_: string = "buff_duration";
        _loc3_ = String(SPECIALEVENT.WAVES_DESC[SPECIALEVENT.wave - 1]);
        _loc4_ = "";
        if (!this._popupWaveInfo) {
            _loc7_ = new bubblepopupDownBuff();
            this._popupWaveInfo = as3.as(this.addChild(_loc7_), bubblepopupDownBuff);
            _loc7_.Setup((_loc2_.x + _loc2_.width / 2) | 0, (_loc2_.y + _loc2_.height + 4) | 0, _loc3_, _loc4_);
            _loc7_.x = 20;
            _loc7_.y = -20;
            _loc7_.mcArrow.x = 30;
        } else {
            as3.cast(this._popupWaveInfo, bubblepopupDownBuff).Update(_loc3_, _loc4_);
        }
    }

    public WaveHide(param1: MouseEvent): void {
        if (this._popupWaveInfo) {
            this.removeChild(this._popupWaveInfo);
            this._popupWaveInfo = null;
        }
    }

    public SetWave(param1: int): void {
        if (param1 > SPECIALEVENT.numWaves) {
            this.visible = false;
            return;
        }
        if (this.visible == false && UI_NEXTWAVE.ShouldDisplay()) {
            this.visible = true;
        }
        if (param1 == 31) {
            this.tR.htmlText = KEYS.Get("wmi_bonuswave");
        } else if (param1 == 32) {
            this.tR.htmlText = KEYS.Get("wmi_bonuswave2");
        } else {
            this.tR.htmlText = KEYS.Get("wmi_nextwave", { "v1": param1 });
        }
    }
}
