import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BASE, CREATURELOCKER, GLOBAL, LOGGER, MAPROOM_DESCENT, QUESTS } from "@game";

export class ACHIEVEMENTS extends ASObject {
    public static DESCENT_LEVEL: string; // const

    public static UNDERHALL_LEVEL: string; // const

    public static INFERNO_QUESTS_COMPLETED: string; // const

    public static _finished: any[];

    public static _stats: any;

    public static _achievements: any[];

    public static _completed: any;

    static {
        as3.lazyStatics(this, { DESCENT_LEVEL: null, UNDERHALL_LEVEL: null, INFERNO_QUESTS_COMPLETED: null, _finished: null, _stats: null, _achievements: null, _completed: null }, () => {
            ACHIEVEMENTS.DESCENT_LEVEL = "descentLevel";
            ACHIEVEMENTS.UNDERHALL_LEVEL = "underhallLevel";
            ACHIEVEMENTS.INFERNO_QUESTS_COMPLETED = "infernoQuestsCompleted";
            ACHIEVEMENTS._finished = [];
            ACHIEVEMENTS._stats = { "DESCENT_LEVEL": 0, "UNDERHALL_LEVEL": 0, "INFERNO_QUESTS_COMPLETED": 0, "thlevel": 0, "map2": 0, "wmoutpost": 0, "playeroutpost": 0, "monstersblended": 0, "upgrade_champ1": 0, "upgrade_champ2": 0, "upgrade_champ3": 0, "heavytraps": 0, "hugerage": 0, "wm2hall": 0, "blocksbuilt": 0, "starterkit": 0, "alliance": 0, "unlock_monster": 0, "stockpile": 0 };
            ACHIEVEMENTS._achievements = [{ "rules": {}, "block": true }, { "rules": { "thlevel": 2 } }, { "rules": { "thlevel": 5 } }, { "rules": { "thlevel": 8 } }, { "rules": { "upgrade_champ1": 1, "upgrade_champ2": 1, "upgrade_champ3": 1 }, "ANY": 1 }, { "rules": { "upgrade_champ1": 1, "upgrade_champ2": 1, "upgrade_champ3": 1 } }, { "rules": { "map2": 1 } }, { "rules": { "wmoutpost": 1 } }, { "rules": { "playeroutpost": 5 } }, { "block": true, "rules": { "hugerage": 1 } }, { "rules": { "wm2hall": 1 } }, { "rules": { "monstersblended": 5000 } }, { "rules": { "blocksbuilt": 200 } }, { "rules": { "starterkit": 1 } }, { "rules": { "alliance": 1 } }, { "rules": { "stockpile": 1 } }, { "rules": { "heavytraps": 8 } }, { "rules": { "unlock_monster": 1 } }, { "rules": { "DESCENT_LEVEL": 1 } }, { "rules": { "DESCENT_LEVEL": MAPROOM_DESCENT._descentLvlMax } }, { "rules": { "UNDERHALL_LEVEL": 5 } }, { "rules": { "INFERNO_QUESTS_COMPLETED": 10 } }, { "rules": { "thlevel": 10 } }];
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Data(param1: any): void {
        if (param1.s) {
            ACHIEVEMENTS._stats = param1.s;
            ACHIEVEMENTS._completed = param1.c;
        } else {
            ACHIEVEMENTS._stats = param1;
        }
        if (!ACHIEVEMENTS._stats.upgrade_champ1 && Boolean(QUESTS._completed.UG1)) {
            ACHIEVEMENTS._stats.upgrade_champ1 = 1;
        }
        if (!ACHIEVEMENTS._stats.upgrade_champ2 && Boolean(QUESTS._completed.UG2)) {
            ACHIEVEMENTS._stats.upgrade_champ2 = 1;
        }
        if (!ACHIEVEMENTS._stats.upgrade_champ3 && Boolean(QUESTS._completed.UG3)) {
            ACHIEVEMENTS._stats.upgrade_champ3 = 1;
        }
        if (ACHIEVEMENTS._stats.monstersblended < QUESTS._global.monstersblended) {
            ACHIEVEMENTS._stats.monstersblended = QUESTS._global.monstersblended;
        }
        if (!ACHIEVEMENTS._stats.wm2hall && Boolean(QUESTS._completed.WM2)) {
            ACHIEVEMENTS._stats.wm2hall = 1;
        }
        ACHIEVEMENTS.Check("", 0, true);
    }

    public static CheckRetroactiveAchievments(): void {
        ACHIEVEMENTS.Check(ACHIEVEMENTS.DESCENT_LEVEL, MAPROOM_DESCENT.DescentLevel);
        if (BASE.isInfernoMainYardOrOutpost) {
            ACHIEVEMENTS.Check(ACHIEVEMENTS.INFERNO_QUESTS_COMPLETED, QUESTS.amountCompleted);
        }
    }

    public static Check(param1: string = "", param2: int = 0, param3: boolean = false): void {
        let fail: boolean = false;
        // Inferno-only: a Designer draft (GLOBAL.ioDesign) is not the player's yard: it counts for nothing.
        if (GLOBAL.ioDesignMode()) {
            return;
        }
        let i: int = 0;
        let a: any = null;
        let block: boolean = false;
        let n: string = null;
        let s: string = param1;
        let v: int = param2;
        let checkall: boolean = param3;
        try {
            if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD || s == "hugerage" || checkall) {
                if (s && ACHIEVEMENTS._stats[s] != undefined && ACHIEVEMENTS._stats[s] < v) {
                    ACHIEVEMENTS._stats[s] = v;
                }
                if (!ACHIEVEMENTS._completed) {
                    ACHIEVEMENTS._completed = {};
                }
                i = 1;
                while (i < ACHIEVEMENTS._achievements.length) {
                    a = ACHIEVEMENTS._achievements[i];
                    block = false;
                    if (a.block) {
                        block = true;
                    }
                    if ((checkall || !ACHIEVEMENTS._completed[i]) && !block) {
                        fail = false;
                        for (n in a.rules) {
                            if (n == "UNLOCK") {
                                if (!CREATURELOCKER._lockerData[a.rules.UNLOCK] || CREATURELOCKER._lockerData[a.rules.UNLOCK].t == 1) {
                                    fail = true;
                                }
                            } else if (a.rules[n] > ACHIEVEMENTS._stats[n]) {
                                fail = true;
                                if (a["ANY"] == undefined || a["ANY"] == 0) {
                                    break;
                                }
                            } else if (a["ANY"] != undefined) {
                                break;
                            }
                        }
                        if (!fail) {
                            ACHIEVEMENTS._completed[i] = 1;
                            ACHIEVEMENTS._finished.push(i);
                        }
                    }
                    i++;
                }
            }
        } catch (e) {
            LOGGER.Log("err", "ACHIEVEMENTS.Check: " + e.message + " | " + e.getStackTrace());
        }
    }

    public static Report(): any[] {
        let _loc1_: any[] = [];
        let _loc2_: int = 0;
        while (_loc2_ < ACHIEVEMENTS._finished.length) {
            _loc1_.push(ACHIEVEMENTS._finished[_loc2_]);
            _loc2_++;
        }
        ACHIEVEMENTS._finished = [];
        return _loc1_;
    }

    public static Export(): any {
        if (!ACHIEVEMENTS._completed) {
            ACHIEVEMENTS._completed = {};
        }
        return { "s": ACHIEVEMENTS._stats, "c": ACHIEVEMENTS._completed };
    }
}
