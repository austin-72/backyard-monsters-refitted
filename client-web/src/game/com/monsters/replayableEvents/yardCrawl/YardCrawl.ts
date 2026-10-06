import * as as3 from "as3";
import { Vector, uint } from "as3";
import { AttackEvent, BASE, GLOBAL, HOUSING, KEYS, LOGGER, MapRoomManager, ReplayableEvent, ReplayableEventHandler } from "@game";

export class YardCrawl extends ReplayableEvent {
    static {
        as3.fields(this, { _yardsToDestroy: 0, _yardsDestroyed: 0, _intactBaseList: null });
    }

    protected _yardsToDestroy: uint;
    protected _yardsDestroyed: uint;
    protected _intactBaseList: Vector<any>;

    public $ctor(): void {
        super.$ctor();
        this._buttonCopy = KEYS.Get("btn_attack");
    }

    public override set score(param1: number) {
        super.score = param1;
        this._yardsDestroyed = param1 >>> 0;
        this.progress = this._yardsDestroyed / this._yardsToDestroy;
    }

    protected override onInitialize(): void {
        ReplayableEventHandler.callServerMethod("loadbases", [["eventid", this._id]], as3.bind(this, this.loadedBaseList));
    }

    private loadedBaseList(param1: any): void {
        let _loc3_: any = null;
        this._intactBaseList = new Vector<any>(0, false, Object);
        let _loc2_: uint = 0;
        for (_loc3_ of as3.values(param1)) {
            if (!(as3.is(_loc3_, Number))) {
                _loc2_++;
                if (!_loc3_.destroyed) {
                    this._intactBaseList.push(_loc3_);
                }
            }
        }
        this._yardsToDestroy = _loc2_;
        this.score = this._yardsToDestroy - this._intactBaseList.length;
        as3.sort(this._intactBaseList, as3.bind(this, this.compareBaseID));
    }

    private compareBaseID(param1: any, param2: any): number {
        return param1.id - param2.id;
    }

    public override pressedActionButton(): void {
        let _loc2_: string = null;
        if (!this._intactBaseList || this._intactBaseList.length == 0) {
            return;
        }
        let _loc1_: any = HOUSING._housingUsed.Get() > 0;
        if (!GLOBAL._bMap || !GLOBAL._bFlinger || !GLOBAL._bHousing || !_loc1_) {
            GLOBAL.Message("You need a working Maproom, Flinger, Housing and some monsters to participate in this event");
            return;
        }
        if (MapRoomManager.instance.isInMapRoom2or3) {
            MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
            _loc2_ = GLOBAL._infBaseURL;
        }
        let _loc3_: uint = as3.vget(this._intactBaseList, 0).id >>> 0;
        LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Attack_Num_" + _loc3_, "value": _loc3_ }, "Attack_Start");
        GLOBAL.eventDispatcher.addEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.finishedAttack));
        BASE.LoadBase(_loc2_, 0, _loc3_, "wmattack");
    }

    protected finishedAttack(param1: AttackEvent): void {
        let _loc2_: uint = as3.vget(this._intactBaseList, 0).id >>> 0;
        LOGGER.StatB({ "st1": "ERS", "st2": this._name, "st3": "Attack_Num_" + _loc2_, "value": _loc2_ }, param1.wasBaseDestroyed ? "Attack_Success" : "Attack_Fail");
        GLOBAL.eventDispatcher.removeEventListener(AttackEvent.ATTACK_OVER, as3.bind(this, this.finishedAttack));
    }

    public override get score(): number {
        return super.score;
    }
}
