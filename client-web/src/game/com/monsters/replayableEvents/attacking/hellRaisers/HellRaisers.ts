import * as as3 from "as3";
import { Vector, uint } from "as3";
import { AttackEvent, BFOUNDATION, GLOBAL, HellRaisersBattleSummary, HellRaisersPromoMessage, HellRaisersStartMessage, IReplayableEventUI, InstanceManager, KEYS, KeywordMessage, MapRoomManager, Maproom3EventHUD, POPUPS, ReplayableEvent, com_monsters_frontPage_messages_Message as Message } from "@game";

export class HellRaisers extends ReplayableEvent {
    public static readonly k_eventPage: string = "http://www.kixeye.com/hell-raisers";

    private static readonly k_hellRaisersTribeID: uint = Number("derp") >>> 0;

    public $ctor(): void {
        this._name = "Hell Raisers";
        this._progress = -1;
        this._priority = 0;
        this._id = 7;
        this._buttonCopy = KEYS.Get("btn_info");
        this._titleImage = "events/hellraisers/hellraisers_title.png";
        this._eventStoreTitleImage = "events/hellraisers/hellraisers_event_store_title.png";
        this._imageURL = "events/hellraisers/hellraisers_reward.png";
        this._messages = Vector.from([new HellRaisersPromoMessage("hellraiserspop1"), new HellRaisersPromoMessage("hellraiserspop2"), new HellRaisersPromoMessage("hellraiserspop3"), new HellRaisersStartMessage(), new KeywordMessage("hellraisersend")], Message);
        super.$ctor();
        this._originalStartDate = 0;
        this._duration = this._DEFAULT_EVENT_DURATION;
    }

    public override get preEventHUDImageURL(): string {
        return "events/hellraisers/preEventHud.png";
    }

    public override get eventHUDImageURL(): string {
        return "events/hellraisers/eventHud.png";
    }

    protected override onInitialize(): void {
        GLOBAL.eventDispatcher.addEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.onAttackEnd));
    }

    protected onAttackEnd(param1: AttackEvent): void {
        let _loc2_: uint = 0;
        if (param1.attackType == HellRaisers.k_hellRaisersTribeID) {
            _loc2_ = this.getBasesWorthInXP() >>> 0;
            POPUPS.Push(new HellRaisersBattleSummary(param1.wasBaseDestroyed, _loc2_).graphic);
            this.score += _loc2_;
        }
    }

    private getBasesWorthInXP(): number {
        let _loc1_: uint = 0;
        let _loc3_: BFOUNDATION = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            _loc1_++;
        }
        return _loc1_;
    }

    public override createNewUI(): IReplayableEventUI {
        return new Maproom3EventHUD();
    }

    public override doesQualify(): boolean {
        return MapRoomManager.instance.isInMapRoom3;
    }
}
