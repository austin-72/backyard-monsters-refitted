import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { BASE, GLOBAL, KEYS, MapRoomManager, PROCESS3, PROCESS4, PROCESS5, PROCESS7, WMATTACK } from "@game";

export class TRIBES extends ASObject {
    private static _tribes: any = null;

    private static _infernotribes: any = null;

    private static _eventtribes: any = null;

    private static _assoc: any = null;

    public static readonly L_IDS: any[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 41, 42];

    public static readonly K_IDS: any[] = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 43, 44];

    public static readonly A_IDS: any[] = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 45, 46];

    public static readonly D_IDS: any[] = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 47, 48, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

    /** Inferno-only: wmids of Moloch strongholds (server tribeForCell.ts sends 51). */
    public static readonly M_IDS: any[] = [51, 52, 53, 54, 55, 56, 57, 58, 59, 60];

    /**
     * Inferno-only: devilish display names, keyed by the canonical tribe name the server
     * sends in map cells. The canonical names double as frame labels and asset names, so
     * they are never changed - only what the player reads is. Rename freely here.
     */
    public static readonly DEVIL_NAMES: any = { "Legionnaire": "Hellionnaire", "Kozu": "Kozmodeus", "Abunakki": "Abaddonakki", "Dreadnaut": "Beelzenaut", "Dreadnought": "Beelzenaut", "Moloch": "Moloch" };

    public static readonly k_DIGIT_LEVEL: uint = 0;

    public static readonly k_DIGIT_TRIBE: uint = 1;

    public static readonly k_DIGIT_CELLTYPE: uint = 2;

    public static B_IDS: any[] = [];

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        TRIBES._tribes = {};
        TRIBES._assoc = { "l": TRIBES.L_IDS, "k": TRIBES.K_IDS, "a": TRIBES.A_IDS, "d": TRIBES.D_IDS, "b": TRIBES.B_IDS, "m": TRIBES.M_IDS };
        TRIBES._tribes.l = { "id": 1, "name": KEYS.Get("ai_legion_name"), "process": PROCESS3, "type": WMATTACK.TYPE_TOWERS, "taunt": KEYS.Get("ai_legion_taunt"), "splash": "popups/tribe_legionnaire.v2.png", "description": KEYS.Get("ai_legion_description"), "succ": KEYS.Get("ai_legion_succ"), "succ_stream": KEYS.Get("ai_legion_succstream"), "fail": KEYS.Get("ai_legion_fail"), "profilepic": "monsters/tribe_legionnaire_50.jpg", "streampostpic": "tribe-legionnaire.v2.png" };
        TRIBES._tribes.k = { "id": 2, "name": KEYS.Get("ai_kozu_name"), "process": PROCESS4, "type": WMATTACK.TYPE_SWARM, "taunt": KEYS.Get("ai_kozu_taunt"), "splash": "popups/tribe_kozu.v2.png", "description": KEYS.Get("ai_kozu_description"), "succ": KEYS.Get("ai_kozu_succ"), "succ_stream": KEYS.Get("ai_kozu_succstream"), "fail": KEYS.Get("ai_kozu_fail"), "profilepic": "monsters/tribe_kozu_50.jpg", "streampostpic": "tribe-kozu.v2.png" };
        TRIBES._tribes.a = { "id": 3, "name": KEYS.Get("ai_abunakki_name"), "process": PROCESS5, "type": WMATTACK.TYPE_KAMIKAZE, "taunt": KEYS.Get("ai_abunakki_taunt"), "splash": "popups/tribe_abunakki.v2.png", "description": KEYS.Get("ai_abunakki_description"), "succ": KEYS.Get("ai_abunakki_succ"), "succ_stream": KEYS.Get("ai_abunakki_succstream"), "fail": KEYS.Get("ai_abunakki_fail"), "profilepic": "monsters/tribe_abunakki_50.jpg", "streampostpic": "tribe-abunakki.v2.png", "behaviour": "juice" };
        TRIBES._tribes.d = { "id": 4, "name": KEYS.Get("ai_dread_name"), "process": PROCESS7, "type": WMATTACK.TYPE_NERD, "taunt": KEYS.Get("ai_dread_taunt"), "splash": "popups/tribe_dreadnaut.v2.png", "description": KEYS.Get("ai_dread_description"), "succ": KEYS.Get("ai_dread_succ"), "succ_stream": KEYS.Get("ai_dread_succstream"), "fail": KEYS.Get("ai_dread_fail"), "profilepic": "monsters/tribe_dreadnaut_50.jpg", "streampostpic": "tribe-dreadnaut.v2.png" };
        TRIBES._infernotribes = {};
        TRIBES._infernotribes.d = { "id": 1, "name": KEYS.Get("ai_descenttribe_name"), "process": PROCESS7, "type": WMATTACK.TYPE_NERD, "taunt": KEYS.Get("ai_descenttribe_taunt"), "splash": "popups/tribe_moloch.png", "description": KEYS.Get("ai_descenttribe_description"), "succ": KEYS.Get("ai_descenttribe_succ"), "succ_stream": KEYS.Get("ai_descenttribe_succstream"), "fail": KEYS.Get("ai_descenttribe_fail"), "profilepic": "monsters/tribe_moloch_50.jpg", "streampostpic": "tribe-moloch.v2.png" };
        if (GLOBAL.INFERNO_ONLY) {
            TRIBES._tribes.l.name = TRIBES.DisplayName("Legionnaire");
            TRIBES._tribes.k.name = TRIBES.DisplayName("Kozu");
            TRIBES._tribes.a.name = TRIBES.DisplayName("Abunakki");
            TRIBES._tribes.d.name = TRIBES.DisplayName("Dreadnaut");
            // Moloch: fifth tribe. Same taunts, art and attack behaviour as the original
            // Inferno tribe, exposed through the regular Map Room 2 lookup (wmid 51-60).
            let molochKey: string = null;
            TRIBES._tribes.m = {};
            for (molochKey in TRIBES._infernotribes.d) {
                TRIBES._tribes.m[molochKey] = TRIBES._infernotribes.d[molochKey];
            }
            TRIBES._tribes.m.id = 5;
            TRIBES._tribes.m.name = TRIBES.DisplayName("Moloch");
        }
        TRIBES._eventtribes = {};
        TRIBES._eventtribes.b = { "id": 1, "name": KEYS.Get("ai_brukkarg_name"), "process": PROCESS7, "type": WMATTACK.TYPE_NERD, "taunt": KEYS.Get("ai_brukkarg_taunt"), "splash": "popups/tribe_brukkarg.png", "description": KEYS.Get("ai_brukkarg_description"), "succ": KEYS.Get("ai_brukkarg_succ"), "succ_stream": KEYS.Get("ai_brukkarg_succstream"), "fail": KEYS.Get("ai_brukkarg_fail"), "profilepic": "monsters/tribe_brukkarg_50.jpg", "streampostpic": "tribe_brukkarg.png" };
    }

    public static TribeForID(param1: int, param2: int = 0): any {
        let _loc4_: any = null;
        let _loc5_: Vector<int> = null;
        let _loc6_: int = 0;
        if (GLOBAL._loadmode !== GLOBAL.mode) {
            return TRIBES._infernotribes.d;
        }
        let _loc3_: any = TRIBES.ChooseTribesTable(param2);
        for (_loc4_ of as3.values(_loc3_)) {
            if (_loc4_.nid == param1) {
                return _loc4_;
            }
        }
        if (MapRoomManager.instance.isInMapRoom3) {
            _loc6_ = as3.vget((_loc5_ = TRIBES.separateDigitsFromInt(param1)), TRIBES.k_DIGIT_TRIBE);
            for (_loc4_ of as3.values(TRIBES._tribes)) {
                if (_loc4_.id === _loc6_) {
                    return _loc4_;
                }
            }
        }
        return null;
    }

    public static TribeForBaseID(param1: int, param2: int = 0): any {
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc5_: Vector<int> = null;
        let _loc6_: int = 0;
        let _loc7_: any = null;
        if (GLOBAL._loadmode != GLOBAL.mode) {
            return TRIBES._infernotribes.d;
        }
        if (TRIBES.B_IDS.length && param1 >= TRIBES.B_IDS[0] || param1 === 0) {
            // Inferno-only: no Brukkarg event here; a yard with no tribe id (Moloch's Gauntlet's) is Moloch's
            // (the Brukkarg's name and a missing picture showed before, 29 September)
            if (GLOBAL.INFERNO_ONLY && TRIBES._tribes.m) {
                return TRIBES._tribes.m;
            }
            return TRIBES._eventtribes.b;
        }
        for (_loc3_ in TRIBES._assoc) {
            _loc4_ = 0;
            while (_loc4_ < TRIBES._assoc[_loc3_].length) {
                if (param1 == TRIBES._assoc[_loc3_][_loc4_]) {
                    return TRIBES._tribes[_loc3_];
                }
                _loc4_++;
            }
        }
        if (MapRoomManager.instance.isInMapRoom3) {
            _loc6_ = as3.vget((_loc5_ = TRIBES.separateDigitsFromInt(param1)), TRIBES.k_DIGIT_TRIBE);
            for (_loc7_ of as3.values(TRIBES._tribes)) {
                if (_loc7_.id === _loc6_) {
                    return _loc7_;
                }
            }
            return _loc7_;
        }
        return null;
    }

    private static separateDigitsFromInt(param1: int): Vector<int> {
        let _loc2_: Vector<int> = new Vector<int>(0, false, int);
        while (param1) {
            as3.vset(_loc2_, _loc2_.length, (param1 % 10) | 0);
            param1 = Math.floor(param1 * 0.1) | 0;
        }
        return _loc2_;
    }

    /** Name shown to the player for a canonical tribe name coming from the server. */
    public static DisplayName(param1: string): string {
        if (GLOBAL.INFERNO_ONLY && TRIBES.DEVIL_NAMES.hasOwnProperty(param1)) {
            return as3.str(TRIBES.DEVIL_NAMES[param1]);
        }
        return param1;
    }

    /**
     * Frame label inside the map cell clip for a canonical tribe name. The clip only has
     * frames for the four original tribes; Moloch borrows the Dreadnaut icon (and is
     * tinted by InfernoMapTheme) because an unknown label would throw.
     */
    public static MapFrameName(param1: string): string {
        if (param1 == "Moloch") {
            return "Dreadnaut";
        }
        return param1;
    }

    public static ChooseTribesTable(param1: int = 0): any {
        let _loc2_: int = param1;
        if (_loc2_ <= 0) {
            _loc2_ = BASE.usesInfernoBackend ? 2 : 1;
        }
        switch (_loc2_) {
            case 0:
            case 1:
                return TRIBES._tribes;
            case 2:
                return TRIBES._infernotribes;
            default:
                return TRIBES._tribes;
        }
    }
}
