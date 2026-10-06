import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Battletoads, BrukkargWarEvent, HellRaisers, MonsterBlitzkrieg, ReplayableEvent } from "@game";

export class ReplayableEventLibrary extends ASObject {
    public static BATTLE_TOADS: Battletoads; // const

    public static MONSTER_BLITZKRIEG: MonsterBlitzkrieg; // const

    public static HELL_RAISERS: HellRaisers; // const

    public static BRUKKARG_EVENT: BrukkargWarEvent; // const

    public static EVENTS: Vector<ReplayableEvent>; // const

    static {
        as3.lazyStatics(this, { BATTLE_TOADS: null, MONSTER_BLITZKRIEG: null, HELL_RAISERS: null, BRUKKARG_EVENT: null, EVENTS: null }, () => {
            ReplayableEventLibrary.BATTLE_TOADS = new Battletoads();
            ReplayableEventLibrary.MONSTER_BLITZKRIEG = new MonsterBlitzkrieg();
            ReplayableEventLibrary.HELL_RAISERS = new HellRaisers();
            ReplayableEventLibrary.BRUKKARG_EVENT = new BrukkargWarEvent();
            ReplayableEventLibrary.EVENTS = Vector.from([ReplayableEventLibrary.BATTLE_TOADS, ReplayableEventLibrary.MONSTER_BLITZKRIEG, ReplayableEventLibrary.BRUKKARG_EVENT, ReplayableEventLibrary.HELL_RAISERS], ReplayableEvent);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static getEventByName(param1: string): ReplayableEvent {
        let _loc3_: ReplayableEvent = null;
        let _loc2_: int = 0;
        while (_loc2_ < ReplayableEventLibrary.EVENTS.length) {
            _loc3_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc2_);
            if (_loc3_.name == param1) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }

    public static getEventByID(param1: uint): ReplayableEvent {
        let _loc3_: ReplayableEvent = null;
        let _loc2_: int = 0;
        while (_loc2_ < ReplayableEventLibrary.EVENTS.length) {
            _loc3_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc2_);
            if (_loc3_.id == param1) {
                return _loc3_;
            }
            _loc2_++;
        }
        return null;
    }
}
