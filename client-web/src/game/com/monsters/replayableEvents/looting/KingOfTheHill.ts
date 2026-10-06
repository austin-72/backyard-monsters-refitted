import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { CHAMPIONCAGE, DebugMessage, GLOBAL, KEYS, KOTHHandler, KOTHPromoMessage1, KOTHPromoMessage2, KOTHPromoMessage3, KOTHStartMessage, ReplayableEvent, com_monsters_frontPage_messages_Message as Message } from "@game";

export class KingOfTheHill extends ReplayableEvent {
    public $ctor(): void {
        this._name = "Champion King of the Hill";
        this._progress = -1;
        this._priority = 0;
        this._id = 4;
        this._buttonCopy = KEYS.Get("btn_info");
        this._titleImage = "events/koth/koth_title.png";
        this._imageURL = "events/koth/koth_reward.png";
        this._messages = Vector.from([new KOTHPromoMessage1(), new KOTHPromoMessage2(), new KOTHPromoMessage3(), new KOTHStartMessage(), new DebugMessage()], Message);
        super.$ctor();
        this._originalStartDate = 1339441200;
        this._duration = 604800;
    }

    public override get hasCompletedEvent(): boolean {
        return false;
    }

    public override pressedActionButton(): void {
        if (!KOTHHandler.instance.doesQualify) {
            GLOBAL.Message(KEYS.Get("msg_krallen_nomr2"));
            return;
        }
        CHAMPIONCAGE.ShowKrallenTab();
    }

    public override set score(param1: number) {
        let _loc2_: Vector<uint> = null;
        let _loc3_: uint = 0;
        let _loc4_: uint = 0;
        let _loc5_: int = 0;
        super.score = param1;
        if (KOTHHandler.instance.lootThresholds.length > 0) {
            _loc2_ = KOTHHandler.instance.lootThresholds;
            _loc3_ = as3.vget(_loc2_, 0);
            _loc5_ = 0;
            while (_loc5_ < _loc2_.length && param1 < _loc3_) {
                if (param1 >= as3.vget(_loc2_, _loc5_)) {
                    _loc3_ = as3.vget(_loc2_, _loc5_ - 1);
                    _loc4_ = as3.vget(_loc2_, _loc5_);
                    break;
                }
                _loc5_++;
            }
            this.progress = (param1 - _loc4_) / (_loc3_ - _loc4_);
        } else {
            this.progress = 0;
        }
    }

    public override doesQualify(): boolean {
        return false;
    }

    public override get score(): number {
        return super.score;
    }
}
