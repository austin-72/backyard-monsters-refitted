import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, CREEPS, CUSTOMATTACKS, GLOBAL, INFERNO_EMERGENCE_EVENT, KEYS, LOGIN, MAP, POPUPS, SOUNDS, SPECIALEVENT, UI2, WMATTACK, popup_horse } from "@game";

export class BUILDING27 extends BFOUNDATION {
    static {
        as3.fields(this, { _spewNumber: 0, _stage: 0, _spewed: false, _clicked: false });
    }

    public static _exists: boolean = false;
    public _spewNumber: int;
    public _stage: int;
    public _spewed: boolean;
    public _clicked: boolean;

    public $ctor(): void {
        super.$ctor();
        this._type = 27;
        this._footprint = [new Rectangle(0, 0, 140, 140)];
        this._gridCost = [[new Rectangle(0, 0, 140, 140), 200]];
        BUILDING27._exists = true;
        this.SetProps();
        if (GLOBAL.mode != "wmattack" && GLOBAL.mode != "wmview") {
            if (GLOBAL._catchup) {
                GLOBAL._ROOT.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onCatchupEnd));
            } else {
                this.Render();
            }
        }
    }

    private onCatchupEnd(e: Event): void {
        if (!GLOBAL._catchup) {
            GLOBAL._ROOT.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onCatchupEnd));
            this.Render();
        }
    }

    protected popupRemoveFromStage(param1: Event): void {
        if (this._spewed === true) {
            return;
        }
        this._clicked = false;
    }

    public Spew(param1: Event = null): void {
        let _loc4_: int = 0;
        ++this._spewNumber;
        let _loc2_: int = ((BASE._basePoints | 0) + (BASE._baseValue | 0)) | 0;
        let _loc3_: number = 0.4;
        if (_loc2_ > 3000000) {
            _loc3_ = 0.6;
        }
        if (_loc2_ > 5000000) {
            _loc3_ = 0.8;
        }
        if (_loc2_ > 8000000) {
            _loc3_ = 1;
        }
        if (this._spewNumber == 1 || this._spewNumber % 20 == 0) {
            if ((_loc4_ = Math.ceil(this._spewNumber / 100) | 0) == 5 || _loc4_ > 11) {
                return;
            }
            this._animTick = 1;
            this.AnimFrame();
            SOUNDS.Play("bankland");
            CREEPS.Spawn("C" + _loc4_, MAP._BUILDINGTOPS, "bounce", new Point(this._mc.x - 80, this._mc.y + 108), Math.random() * 360, _loc3_);
        } else if (this._spewNumber % 10 == 0) {
            this._animTick = 0;
            this.AnimFrame();
        }
        if (this._spewNumber >= 1110) {
            this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Spew));
        }
    }

    public StartAttack(param1: MouseEvent = null): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (!this._spewed) {
                if (BASE.isInfernoMainYardOrOutpost) {
                    SOUNDS.PlayMusic("musicipanic");
                } else {
                    SOUNDS.PlayMusic("musicpanic");
                }
                this._spewed = true;
                POPUPS.Next();
                UI2.Show("warning");
                UI2._warning.Update(KEYS.Get("ai_trojan_trap"));
                this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Spew));
                this.Spew();
                CUSTOMATTACKS._started = true;
                WMATTACK._isAI = false;
                WMATTACK._inProgress = true;
                WMATTACK.AttackB();
                WMATTACK.AttackC();
                WMATTACK.ResetWait();
            }
        }
    }

    public override Click(param1: MouseEvent = null): void {
        let _loc2_: MovieClip = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
            if (activeEvent.active) {
                return;
            }
            if (INFERNO_EMERGENCE_EVENT.isAttackActive) {
                return;
            }
            if (!this._clicked) {
                CUSTOMATTACKS._started = true;
                this._clicked = true;
                _loc2_ = new popup_horse();
                _loc2_.tA.htmlText = "<b>" + KEYS.Get("ai_trojan_headline") + "</b>";
                _loc2_.tName.htmlText = KEYS.Get("ai_trojan_letter", { "v1": LOGIN._playerName });
                _loc2_.bA.SetupKey("ai_trojan_sendback_btn");
                _loc2_.bA.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartAttack), false, 0, true);
                _loc2_.bB.SetupKey("ai_trojan_accept_btn");
                _loc2_.bB.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartAttack), false, 0, true);
                _loc2_.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.popupRemoveFromStage), false, 0, true);
                POPUPS.Push(_loc2_);
            }
        }
    }

    public override get tickLimit(): int {
        return int.MAX_VALUE;
    }

    public override Tick(param1: int): void {
    }

    public override Update(param1: boolean = false): void {
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        if (!this._spewed) {
            return _loc1_;
        }
        return false;
    }
}
