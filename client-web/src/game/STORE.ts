import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ACADEMY, BASE, BFOUNDATION, BUILDINGS, BWALL, BYMConfig, Bunker, Button, ButtonBrown, CREATURELOCKER, CREATURES, GLOBAL, ImageCache, InstanceManager, KEYS, LOGGER, LOGIN, MAP, MAPROOM_DESCENT, MONSTERLAB, MapRoomManager, MonsterBase, MovieClipUtils, PLANNER, PLEASEWAIT, POPUPS, Player, QUESTS, QUEUE, SOUNDS, STOREITEM, STOREPOPUP, STREAMLINESPEEDUP_CLIP, ScrollSet, SecNum, TUTORIAL, UI2, popup_purchase } from "@game";

export class STORE extends ASObject {
    public static _storeTabs: any[] = null;

    public static _storeItems: any = null;

    public static _storeInventory: any = null;

    public static _grouping: any[] = null;

    public static _storeData: any = null;

    public static _mc: STOREPOPUP = null;

    public static _streamline: STREAMLINESPEEDUP_CLIP = null;

    public static _streamline_time: number = NaN;

    public static _streamline_cost: number = NaN;

    public static _items: any = null;

    public static _itemsHeight: int = 0;

    public static _jumpTo: int = 0;

    public static _scrollRect: Rectangle = null;

    public static _code: string = null;

    public static _cost: int = 0;

    public static _quantity: int = 0;

    public static _duration: int = 0;

    public static _update: any[] = null;

    public static _tab: int = 0;

    public static _page: number = NaN;

    public static _open: boolean = false;

    public static _facebookPurchaseItemCode: string = null;

    public static _scroller: ScrollSet = null;

    public static _scrollPos: number = 0;

    public static _scrollUpdate: boolean = true;

    public static _scrollPosUpdate: boolean = false;

    public static _customPage: any[] = [];

    public static _zazzleMC: MovieClip = null;

    public static m_tutorialBlock: boolean = false;

    public static _repairCount: int = 0;

    public static _allowInfernoResourcesAboveGround: boolean = true;

    public $ctor(): void {
        super.$ctor();
    }

    public static Data(storeItems: any, storeData: any, param3: any = null): void {
        STORE._storeItems = {};
        STORE._storeData = {};
        STORE._storeInventory = {};
        GLOBAL._monsterOverdrive = new SecNum(0);
        if (!storeItems || !storeData) {
            return;
        }
        if (storeItems != null) {
            STORE._storeItems = storeItems;
            STORE._storeData = storeData;
            if (param3) {
                STORE.InventoryImport(param3);
            }
            STORE.Variables();
            STORE.ProcessPurchases();
        }
    }

    private static InventoryImport(param1: any): void {
        let _loc2_: string = null;
        for (_loc2_ in param1) {
            STORE._storeInventory[_loc2_] = new SecNum(Number(param1[_loc2_]));
        }
    }

    public static InventoryExport(): string {
        let _loc2_: string = null;
        let _loc1_: any = {};
        for (_loc2_ in STORE._storeInventory) {
            _loc1_[_loc2_] = STORE._storeInventory[_loc2_].Get();
        }
        return JSON.stringify(_loc1_);
    }

    public static GetHealAllShinyCost(): int {
        let _loc4_: string = null;
        let _loc7_: Vector<any> = null;
        let _loc1_: Player = GLOBAL.player;
        let _loc2_: int = _loc1_.monsterList.length | 0;
        let _loc3_: number = 0;
        let _loc5_: boolean = BASE.isInfernoMainYardOrOutpost;
        let _loc6_: int = 0;
        while (_loc6_ < _loc2_) {
            _loc4_ = as3.vget(_loc1_.monsterList, _loc6_).m_creatureID;
            _loc3_ += STORE.getShinyCostforCreep(_loc4_);
            _loc6_++;
        }
        if (!_loc5_) {
            _loc2_ = (_loc7_ = InstanceManager.getInstancesByClass(Bunker)).length | 0;
            _loc6_ = 0;
            while (_loc6_ < _loc2_) {
                _loc4_ = "B" + as3.vget(_loc7_, _loc6_)._id;
                _loc3_ += STORE.getShinyCostforCreep(_loc4_);
                _loc6_++;
            }
        }
        return _loc3_ | 0;
    }

    private static getShinyCostforCreep(param1: string): int {
        let _loc2_: Player = GLOBAL.player;
        let _loc3_: number = 0;
        let _loc4_: int = 0;
        _loc3_ = GLOBAL.getShinyCostFromResourceAmt(GLOBAL.player.getResourceCostByID(param1) - GLOBAL.player.getResourceCostByID(param1, true));
        _loc4_ = _loc2_.getSecsTillDoneByID(param1, true);
        return (_loc3_ + STORE.GetTimeCost(_loc4_, false) * GLOBAL.ABTestHealingTimeShinyMod()) | 0;
    }

    public static GetInstantBuyCost(param1: any): int {
        // TODO: @React / @ambx - fix SecNum
        // return GetTimeCost(param1.time.Get()) + GetResourceCost([param1.r1,param1.r2,param1.r3,param1.r4]);
        return (STORE.GetTimeCost(param1.time | 0) + STORE.GetResourceCost([param1.r1, param1.r2, param1.r3, param1.r4])) | 0;
    }

    /** Inferno-only: a top-up of size 1-3 (10% / 50% / 100% of storage) at the server's flat price. */
    private static ioTopup(param1: int, param2: number): int {
        let prices: any[] = GLOBAL.ioPriceList("topup");
        if (prices && prices.length >= param1) {
            return prices[param1 - 1] | 0;
        }
        return Math.ceil(Math.pow(Math.sqrt(param2 / 2), 0.75)) | 0;
    }

    /**
     * Inferno-only (the user's, 4 October): finishing a building's build, upgrade, fortify or repair early.
     * Like the original game's last 5 minutes, but for the last 10 (GLOBAL.ioCloseEnough): free, no Shiny asked.
     * Under an hour: 1 Shiny at 11 minutes left, one more every 6 minutes, 9 at 59 minutes (it was 10 flat).
     * An hour or more: the usual curve (GetTimeCost). Other timers (hatching, healing, training...) keep theirs.
     */
    public static ioBuildingTimeCost(seconds: int): int {
        if (!GLOBAL.INFERNO_ONLY) {
            return STORE.GetTimeCost(seconds);
        }
        if (seconds <= GLOBAL.ioCloseEnough) {
            return 0;
        }
        if (seconds < 60 * 60) {
            let minutes: int = Math.ceil(seconds / 60) | 0;
            return Math.max(1, Math.min(9, 1 + Math.floor((minutes - 11) / 6))) | 0;
        }
        return STORE.GetTimeCost(seconds);
    }

    public static GetTimeCost(param1: int, param2: boolean = true): int {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (param2 && param1 <= GLOBAL.ioCloseEnough) {
            return 0;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // A flat price for the first hour left, then so much per further hour, pro rata.
            return Math.ceil(GLOBAL.ioPrice("finish_first", 10) + GLOBAL.ioPrice("finish_hour", 7.5) * Math.max(0, param1 / 3600 - 1)) | 0;
        }
        _loc3_ = Math.ceil(param1 * 20 / 60 / 60) | 0;
        _loc4_ = Math.sqrt(param1 * 0.8) | 0;
        return Math.min(_loc3_, _loc4_) | 0;
    }

    public static GetResourceCost(param1: any[]): int {
        let _loc2_: number = 0;
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            _loc2_ = Number(_loc2_ + param1[_loc3_]);
            _loc3_++;
        }
        return STORE.GetShinyCostFromTotalResources(_loc2_);
    }

    public static GetShinyCostFromTotalResources(param1: number): int {
        return Math.ceil(Math.pow(Math.sqrt(param1 / 2), 0.75)) | 0;
    }

    public static Variables(): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc7_: BFOUNDATION = null;
        let _loc8_: int = 0;
        let _loc13_: BFOUNDATION = null;
        let mainStoreItems: any = null;
        let infernoStoreItems: any = null;
        let reourceMax: number = NaN;
        let iResourceMax: number = NaN;
        let _loc23_: string = null;
        if (GLOBAL.INFERNO_ONLY) {
            // The stock code picks the store's contents by yard type, and an inferno-only main yard
            // counts as an overworld main yard there: it listed twig / pebble / putty / goo top-ups,
            // stone and metal walls, and the overworld overdrives next to the Inferno ones.
            // Main yard: the original Inferno store, minus the Incubator Overdrives: monsters hatch in
            // one second here, so they could never be bought and sat greyed out. Outposts: the same
            // minus yard expansion.
            STORE._grouping = [[BASE.isOutpost ? ["BLK2I", "BLK3I"] : ["ENLI", "BLK2I", "BLK3I"]], [["BR11I", "BR12I", "BR13I", "BR21I", "BR22I", "BR23I", "BR31I", "BR32I", "BR33I", "BR41I", "BR42I", "BR43I", "BIP"]], [["SP1", "SP2", "SP3", "SP4", "FIX"]], [["PRO1", "PRO2", "PRO3", "EXHI", "TODI"]]];
        } else if (BASE.isOutpost) {
            STORE._grouping = [[MapRoomManager.instance.isInMapRoom3 ? [] : ["BST", "BLK2", "BLK3", "BLK4", "BLK5"]], [MapRoomManager.instance.isInMapRoom3 ? [] : ["BR11", "BR12", "BR13", "BR21", "BR22", "BR23", "BR31", "BR32", "BR33", "BR41", "BR42", "BR43"]], [MapRoomManager.instance.isInMapRoom3 ? ["SP1", "SP2", "SP3", "SP4", "FIX"] : ["SP1", "SP2", "SP3", "SP4", "POD", "FIX", "HOD", "HOD2", "HOD3"]], [MapRoomManager.instance.isInMapRoom3 ? [] : ["PRO1", "PRO2", "PRO3", "TOD", "EXH"]]];
        } else if (BASE.isMainYard) {
            if (MAPROOM_DESCENT.DescentPassed) {
                STORE._grouping = [[["BEW", "BST", "ENL", "BLK2", "BLK3", "BLK4", "BLK5"]], [["BR11", "BR12", "BR13", "BR21", "BR22", "BR23", "BR31", "BR32", "BR33", "BR41", "BR42", "BR43", "BR11I", "BR12I", "BR13I", "BR21I", "BR22I", "BR23I", "BR31I", "BR32I", "BR33I", "BR41I", "BR42I", "BR43I", "BIP"]], [["SP1", "SP2", "SP3", "SP4", "POD", "FIX", "HOD", "HOD2", "HOD3"]], [MapRoomManager.instance.isInMapRoom3 ? ["PRO1", "PRO2", "PRO3", "MOD", "MDOD", "MSOD", "TOD"] : ["PRO1", "PRO2", "PRO3", "MOD", "MDOD", "MSOD", "EXH", "TOD"]]];
            } else {
                STORE._grouping = [[["BEW", "BST", "ENL", "BLK2", "BLK3", "BLK4", "BLK5"]], [["BR11", "BR12", "BR13", "BR21", "BR22", "BR23", "BR31", "BR32", "BR33", "BR41", "BR42", "BR43", "BIP"]], [["SP1", "SP2", "SP3", "SP4", "POD", "FIX", "HOD", "HOD2", "HOD3"]], [MapRoomManager.instance.isInMapRoom3 ? ["PRO1", "PRO2", "PRO3", "MOD", "MDOD", "MSOD", "TOD"] : ["PRO1", "PRO2", "PRO3", "MOD", "MDOD", "MSOD", "EXH", "TOD"]]];
            }
        } else {
            STORE._grouping = [[["ENLI", "BLK2I", "BLK3I"]], [["BR11I", "BR12I", "BR13I", "BR21I", "BR22I", "BR23I", "BR31I", "BR32I", "BR33I", "BR41I", "BR42I", "BR43I", "BIP"]], [["SP1", "SP2", "SP3", "SP4", "FIX", "HODI", "HOD2I", "HOD3I"]], [MapRoomManager.instance.isInMapRoom3 ? ["PRO1", "PRO2", "PRO3", "TODI"] : ["PRO1", "PRO2", "PRO3", "EXHI", "TODI"]]];
        }
        let resourceIndex: int = 1;
        while (resourceIndex <= 4) {
            reourceMax = BASE._resources["r" + resourceIndex + "max"] * 0.1;
            iResourceMax = BASE._iresources["r" + resourceIndex + "max"] * 0.1;
            if (BASE.isInfernoMainYardOrOutpost) {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "1I"];
            } else {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "1"];
                infernoStoreItems = STORE._storeItems["BR" + resourceIndex + "1I"];
            }
            mainStoreItems.t = KEYS.Get("str_top_extra", { "v1": GLOBAL.FormatNumber(reourceMax), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
            if (BASE._resources["r" + resourceIndex].Get() + BASE._resources["r" + resourceIndex + "max"] * 0.1 < BASE._resources["r" + resourceIndex + "max"]) {
                mainStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(1, reourceMax) : Math.ceil(Math.pow(Math.sqrt(reourceMax / 2), 0.75))];
                mainStoreItems.d = KEYS.Get("str_top_10pct", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])), "v3": GLOBAL.FormatNumber(Number(BASE._resources["r" + resourceIndex].Get() + reourceMax)) });
                mainStoreItems.quantity = reourceMax;
            } else {
                mainStoreItems.d = KEYS.Get("str_top_10pct_noroom", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
                mainStoreItems.c = [0];
                mainStoreItems.quantity = 0;
            }
            if (infernoStoreItems) {
                infernoStoreItems.t = KEYS.Get("str_top_extra", { "v1": GLOBAL.FormatNumber(iResourceMax), "v2": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
            }
            if (Boolean(BASE._iresources) && BASE._iresources["r" + resourceIndex].Get() + BASE._iresources["r" + resourceIndex + "max"] * 0.1 < BASE._iresources["r" + resourceIndex + "max"]) {
                if (infernoStoreItems) {
                    infernoStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(1, iResourceMax) : Math.ceil(Math.pow(Math.sqrt(iResourceMax / 2), 0.75))];
                    infernoStoreItems.d = KEYS.Get("str_top_10pct", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])), "v2": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])), "v3": GLOBAL.FormatNumber(Number(BASE._iresources["r" + resourceIndex].Get() + iResourceMax)) });
                    infernoStoreItems.quantity = iResourceMax;
                }
            } else if (infernoStoreItems) {
                infernoStoreItems.d = KEYS.Get("str_top_10pct_noroom", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
                infernoStoreItems.c = [0];
                infernoStoreItems.quantity = 0;
            }
            reourceMax = BASE._resources["r" + resourceIndex + "max"] * 0.5;
            iResourceMax = BASE._iresources["r" + resourceIndex + "max"] * 0.5;
            if (BASE.isInfernoMainYardOrOutpost) {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "2I"];
            } else {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "2"];
                infernoStoreItems = STORE._storeItems["BR" + resourceIndex + "2I"];
            }
            mainStoreItems.t = KEYS.Get("str_top_extra", { "v1": GLOBAL.FormatNumber(reourceMax), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
            if (BASE._resources["r" + resourceIndex].Get() + BASE._resources["r" + resourceIndex + "max"] * 0.5 < BASE._resources["r" + resourceIndex + "max"]) {
                mainStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(2, reourceMax) : Math.ceil(Math.pow(Math.sqrt(reourceMax / 2), 0.75))];
                mainStoreItems.d = KEYS.Get("str_top_50pct", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])), "v3": GLOBAL.FormatNumber(Number(BASE._resources["r" + resourceIndex].Get() + reourceMax)) });
                mainStoreItems.quantity = reourceMax;
            } else {
                mainStoreItems.d = KEYS.Get("str_top_50pct_noroom", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
                mainStoreItems.c = [0];
                mainStoreItems.quantity = 0;
            }
            if (infernoStoreItems) {
                infernoStoreItems.t = KEYS.Get("str_top_extra", { "v1": GLOBAL.FormatNumber(iResourceMax), "v2": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
                if (BASE._iresources["r" + resourceIndex].Get() + BASE._iresources["r" + resourceIndex + "max"] * 0.5 < BASE._iresources["r" + resourceIndex + "max"]) {
                    infernoStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(2, iResourceMax) : Math.ceil(Math.pow(Math.sqrt(iResourceMax / 2), 0.75))];
                    infernoStoreItems.d = KEYS.Get("str_top_50pct", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])), "v2": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])), "v3": GLOBAL.FormatNumber(Number(BASE._iresources["r" + resourceIndex].Get() + iResourceMax)) });
                    infernoStoreItems.quantity = iResourceMax;
                } else {
                    infernoStoreItems.d = KEYS.Get("str_top_50pct_noroom", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
                    infernoStoreItems.c = [0];
                    infernoStoreItems.quantity = 0;
                }
            }
            if (BASE.isInfernoMainYardOrOutpost) {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "3I"];
            } else {
                mainStoreItems = STORE._storeItems["BR" + resourceIndex + "3"];
                infernoStoreItems = STORE._storeItems["BR" + resourceIndex + "3I"];
            }
            mainStoreItems.t = KEYS.Get("str_top_fill_label", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
            if (BASE._resources["r" + resourceIndex + "max"] > BASE._resources["r" + resourceIndex].Get()) {
                reourceMax = BASE._resources["r" + resourceIndex + "max"] - BASE._resources["r" + resourceIndex].Get();
                mainStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(3, reourceMax) : Math.ceil(Math.pow(Math.sqrt(reourceMax / 2), 0.75))];
                mainStoreItems.d = KEYS.Get("str_top_fill", { "v1": GLOBAL.FormatNumber(reourceMax), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
                mainStoreItems.quantity = reourceMax;
            } else {
                mainStoreItems.d = KEYS.Get("str_resourcesfull", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceIndex - 1])) });
                mainStoreItems.c = [0];
                mainStoreItems.quantity = 0;
            }
            if (infernoStoreItems) {
                infernoStoreItems.t = KEYS.Get("str_top_fill_label", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
            }
            if (BASE._iresources["r" + resourceIndex + "max"] > BASE._iresources["r" + resourceIndex].Get()) {
                if (infernoStoreItems) {
                    iResourceMax = BASE._iresources["r" + resourceIndex + "max"] - BASE._iresources["r" + resourceIndex].Get();
                    infernoStoreItems.c = [GLOBAL.INFERNO_ONLY ? STORE.ioTopup(3, iResourceMax) : Math.ceil(Math.pow(Math.sqrt(iResourceMax / 2), 0.75))];
                    infernoStoreItems.d = KEYS.Get("str_top_fill", { "v1": GLOBAL.FormatNumber(iResourceMax), "v2": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
                    infernoStoreItems.quantity = iResourceMax;
                }
            } else if (infernoStoreItems) {
                infernoStoreItems.d = KEYS.Get("str_resourcesfull", { "v1": KEYS.Get(as3.str(GLOBAL.iresourceNames[resourceIndex - 1])) });
                infernoStoreItems.c = [0];
                infernoStoreItems.quantity = 0;
            }
            resourceIndex++;
        }
        if (GLOBAL._selectedBuilding) {
            if (GLOBAL._selectedBuilding._repairing) {
                _loc2_ = STORE.ioBuildingTimeCost(GLOBAL._selectedBuilding._repairTime);
            } else if (GLOBAL._selectedBuilding._countdownBuild.Get() > 0) {
                _loc2_ = STORE.ioBuildingTimeCost(GLOBAL._selectedBuilding._countdownBuild.Get() | 0);
            } else if (GLOBAL._selectedBuilding._countdownUpgrade.Get() > 0) {
                _loc2_ = STORE.ioBuildingTimeCost(GLOBAL._selectedBuilding._countdownUpgrade.Get() | 0);
            } else if (GLOBAL._selectedBuilding._countdownFortify.Get() > 0) {
                _loc2_ = STORE.ioBuildingTimeCost(GLOBAL._selectedBuilding._countdownFortify.Get() | 0);
            } else if (GLOBAL._selectedBuilding._type == 8) {
                for (_loc23_ in CREATURELOCKER._lockerData) {
                    if (CREATURELOCKER._lockerData[_loc23_].t == 1) {
                        _loc2_ = STORE.GetTimeCost((CREATURELOCKER._lockerData[_loc23_].e - GLOBAL.Timestamp()) | 0);
                        break;
                    }
                }
            } else if (GLOBAL._selectedBuilding._type == 26 && Boolean(ACADEMY._monsterID)) {
                _loc2_ = STORE.GetTimeCost((GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0);
            } else if (GLOBAL._selectedBuilding._type == 116 && Boolean((as3.as(GLOBAL._bLab, MONSTERLAB))._upgrading)) {
                _loc2_ = STORE.GetTimeCost(((as3.as(GLOBAL._bLab, MONSTERLAB))._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0);
            }
            STORE._storeItems.SP4.c = [_loc2_];
        }
        let _loc4_: int = 0;
        STORE._repairCount = 0;
        let _loc5_: int = 0;
        let _loc6_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc7_ of (_loc6_ ?? [])) {
            if (_loc7_._repairing) {
                STORE._repairCount += 1;
                if (_loc7_._repairTime > GLOBAL.ioCloseEnough) {
                    _loc4_ += _loc7_._repairTime;
                    _loc5_ += 1;
                }
            }
        }
        STORE._storeItems.FIX.c = [GLOBAL.INFERNO_ONLY ? (_loc5_ > 0 ? GLOBAL.ioPrice("repair", 25) | 0 : 0) : STORE.GetTimeCost(_loc4_) + _loc5_ * 10];
        STORE._storeItems.FIX.d = KEYS.Get("desc_repairbdgs", { "v1": STORE._repairCount });
        STORE._storeItems.FIX.t = KEYS.Get("str_repairbdgs");
        _loc8_ = GLOBAL.player.getNumDamagedCreeps();
        if (_loc8_) {
            STORE._storeItems.HAMS.t = KEYS.Get("str_healmons");
            STORE._storeItems.HAMS.d = KEYS.Get("str_healmons_desc", { "v1": _loc8_ });
            STORE._storeItems.HAMS.c = [STORE.GetHealAllShinyCost()];
        }
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        let _loc14_: uint = (GLOBAL.INFERNO_ONLY ? GLOBAL.ioPrice("wall_stone", 3) >>> 0 : 3) >>> 0;
        let _loc15_: uint = (GLOBAL.INFERNO_ONLY ? GLOBAL.ioPrice("wall_iron", 6) >>> 0 : 6) >>> 0;
        let _loc16_: uint = 10;
        let _loc17_: uint = 15;
        let _loc18_: Vector<any> = InstanceManager.getInstancesByClass(BWALL);
        for (_loc13_ of (_loc18_ ?? [])) {
            if (_loc13_._lvl == null || _loc13_._lvl.Get() <= 1) {
                _loc10_ += _loc14_;
                _loc11_ += 10000;
                _loc12_ += 1;
            }
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            STORE._storeItems.BLK2I.c = [_loc10_];
            STORE._storeItems.BLK2I.d = KEYS.Get("bi_wall_2_str_desc", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK2I.t = KEYS.Get("#bi_wall_2#");
        } else {
            STORE._storeItems.BLK2.c = [_loc10_];
            STORE._storeItems.BLK2.d = KEYS.Get("desc_stonewalls", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK2.t = KEYS.Get("str_stonewalls");
        }
        _loc10_ = 0;
        _loc12_ = 0;
        _loc11_ = 0;
        for (_loc13_ of (_loc18_ ?? [])) {
            if (_loc13_._lvl.Get() <= 1) {
                _loc10_ = (_loc10_ + (_loc14_ + _loc15_)) | 0;
                _loc11_ = (_loc11_ + (100000 + 10000)) | 0;
                _loc12_ += 1;
            }
            if (_loc13_._lvl.Get() == 2) {
                _loc10_ += _loc15_;
                _loc11_ += 100000;
                _loc12_ += 1;
            }
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            STORE._storeItems.BLK3I.c = [_loc10_];
            STORE._storeItems.BLK3I.d = KEYS.Get("bi_wall_3_str_desc", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK3I.t = KEYS.Get("#bi_wall_3#");
        } else {
            STORE._storeItems.BLK3.c = [_loc10_];
            STORE._storeItems.BLK3.d = KEYS.Get("desc_metalwalls", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK3.t = KEYS.Get("str_metalwalls");
        }
        if (!BASE.isInfernoMainYardOrOutpost) {
            _loc10_ = 0;
            _loc12_ = 0;
            _loc11_ = 0;
            for (_loc13_ of (_loc18_ ?? [])) {
                if (_loc13_._lvl.Get() <= 1) {
                    _loc10_ = (_loc10_ + (_loc14_ + _loc15_ + _loc16_)) | 0;
                    _loc11_ = (_loc11_ + (200000 + 100000 + 10000)) | 0;
                    _loc12_ += 1;
                }
                if (_loc13_._lvl.Get() == 2) {
                    _loc10_ = (_loc10_ + (_loc15_ + _loc16_)) | 0;
                    _loc11_ = (_loc11_ + (100000 + 200000)) | 0;
                    _loc12_ += 1;
                }
                if (_loc13_._lvl.Get() == 3) {
                    _loc10_ += _loc16_;
                    _loc11_ += 200000;
                    _loc12_ += 1;
                }
            }
            STORE._storeItems.BLK4.c = [_loc10_];
            STORE._storeItems.BLK4.d = KEYS.Get("desc_goldwalls", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK4.t = KEYS.Get("str_goldwalls");
            _loc10_ = 0;
            _loc12_ = 0;
            _loc11_ = 0;
            for (_loc13_ of (_loc18_ ?? [])) {
                if (_loc13_._lvl.Get() <= 1) {
                    _loc10_ = (_loc10_ + (_loc14_ + _loc15_ + _loc16_ + _loc17_)) | 0;
                    _loc11_ = (_loc11_ + (100000 + 10000 + 200000 + 400000)) | 0;
                    _loc12_ += 1;
                }
                if (_loc13_._lvl.Get() == 2) {
                    _loc10_ = (_loc10_ + (_loc15_ + _loc16_ + _loc17_)) | 0;
                    _loc11_ = (_loc11_ + (100000 + 200000 + 400000)) | 0;
                    _loc12_ += 1;
                }
                if (_loc13_._lvl.Get() == 3) {
                    _loc10_ = (_loc10_ + (_loc16_ + _loc17_)) | 0;
                    _loc11_ = (_loc11_ + (200000 + 400000)) | 0;
                    _loc12_ += 1;
                }
                if (_loc13_._lvl.Get() == 4) {
                    _loc10_ += _loc17_;
                    _loc11_ += 400000;
                    _loc12_ += 1;
                }
            }
            STORE._storeItems.BLK5.c = [_loc10_];
            STORE._storeItems.BLK5.d = KEYS.Get("desc_blackwalls", { "v1": _loc12_, "v2": GLOBAL.FormatNumber(_loc11_) });
            STORE._storeItems.BLK5.t = KEYS.Get("str_blackwalls");
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            STORE._storeItems.HODI.d = "Speed up all harvester production for 12 hours.";
            STORE._storeItems.HODI.t = "Harvester Overdrive";
        } else {
            STORE._storeItems.HOD.d = "Speed up all harvester production for 12 hours.";
            STORE._storeItems.HOD.t = "Harvester Overdrive";
            STORE._storeItems.POD.d = KEYS.Get("store_pod_desc");
            STORE._storeItems.POD.t = KEYS.Get("store_pod_title");
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            STORE._storeItems.EXHI.d = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "store_exhi_desc" : "store_exh_desc");
            STORE._storeItems.EXHI.t = KEYS.Get("store_exc_title");
        } else {
            STORE._storeItems.EXH.d = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "store_exhi_desc" : "store_exh_desc");
            STORE._storeItems.EXH.t = KEYS.Get("store_exh_title");
        }
    }

    public static AddInventory(param1: string): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc2_: boolean = false;
        let _loc3_: int = STORE._grouping.length | 0;
        let _loc6_: int = 0;
        while (_loc6_ < _loc3_) {
            _loc4_ = STORE._grouping[_loc6_].length | 0;
            _loc7_ = 0;
            while (_loc7_ < _loc4_) {
                _loc5_ = STORE._grouping[_loc6_][_loc7_].length | 0;
                _loc8_ = 0;
                while (_loc8_ < _loc5_) {
                    if (STORE._grouping[_loc6_][_loc7_][_loc8_] == param1) {
                        _loc2_ = true;
                        break;
                    }
                    _loc8_++;
                }
                if (_loc2_) {
                    break;
                }
                _loc7_++;
            }
            if (_loc2_) {
                break;
            }
            _loc6_++;
        }
        if (_loc2_) {
            if (STORE._storeInventory[param1]) {
                STORE._storeInventory[param1].Add(1);
            } else {
                STORE._storeInventory[param1] = new SecNum(1);
            }
            STORE.Update();
            BASE.Save();
        }
    }

    public static GetInventory(param1: string): int {
        if (param1.substr(0, 2) == "SP") {
            param1 = param1.substr(0, 3);
        }
        if (STORE._storeInventory[param1]) {
            return STORE._storeInventory[param1].Get() | 0;
        }
        return 0;
    }

    public static Show(param1: int = 1, param2: int = 1, param3: any[] = null, param4: boolean = false): Function {
        let tab: int = 0;
        let page: int = 0;
        let customPage: any[] = null;
        let force: boolean = false;
        tab = param1;
        page = param2;
        customPage = param3;
        force = param4;
        return (param1: MouseEvent): void => {
            STORE.ShowB(tab, page, customPage, force);
        };
    }

    public static ShowB(param1: int, param2: number = 0, param3: any[] = null, param4: boolean = false): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            STORE.m_tutorialBlock = true;
            if (Boolean(GLOBAL._bStore) || !BASE.isMainYard) {
                SOUNDS.Play("click1");
                if (!BASE.isMainYard || GLOBAL._bStore._canFunction || param4) {
                    if (!STORE._open) {
                        STORE._open = true;
                        STORE._mc = new STOREPOPUP();
                        STORE._mc.Center();
                        STORE._mc.ScaleUp();
                        GLOBAL.BlockerAdd();
                        GLOBAL._layerWindows.addChild(STORE._mc);
                        if (GLOBAL._newBuilding) {
                            GLOBAL._newBuilding.Cancel();
                        }
                        if (BUILDINGS._open) {
                            BUILDINGS.Hide();
                        }
                    }
                    STORE._customPage = param3;
                    if (TUTORIAL._stage < 200) {
                        STORE._mc.tShinyBalance.visible = false;
                        STORE._mc.bAdd.visible = false;
                    } else {
                        STORE._mc.tShinyBalance.visible = true;
                        STORE._mc.bAdd.SetupKey("ui_topaddshiny");
                        // _mc.bAdd.addEventListener(MouseEvent.MOUSE_DOWN,BUY.Show);
                        STORE._mc.bAdd.addEventListener(MouseEvent.CLICK, (event: MouseEvent): void => {
                            GLOBAL.Message(KEYS.Get("disabled_addshiny"));
                        });
                        if (BASE._credits.Get() <= 250) {
                            STORE._mc.bAdd.Highlight = true;
                        }
                    }
                    STORE._mc.b1.SetupKey("str_construction", false, 0, 0, "#ECBF88");
                    STORE._mc.b1.addEventListener(MouseEvent.CLICK, STORE.SwitchClick(1, 0, true));
                    STORE._mc.b2.SetupKey("str_resources", false, 0, 0, "#ECBF88");
                    STORE._mc.b2.addEventListener(MouseEvent.CLICK, STORE.SwitchClick(2, 0, true));
                    STORE._mc.b3.SetupKey("str_speedups", false, 0, 0, "#ECBF88");
                    STORE._mc.b3.addEventListener(MouseEvent.CLICK, STORE.SwitchClick(3, 0, true));
                    STORE._mc.b4.SetupKey("str_protection", false, 0, 0, "#ECBF88");
                    STORE._mc.b4.addEventListener(MouseEvent.CLICK, STORE.SwitchClick(4, 0, true));
                    if (!GLOBAL._flags.viximo && !GLOBAL._flags.kongregate) {
                        STORE._mc.b5.SetupKey("str_zazzle", false, 0, 0, "#ECBF88");
                        STORE._mc.b5.addEventListener(MouseEvent.CLICK, STORE.SwitchClick(5, 0, true));
                    } else {
                        STORE._mc.b5.visible = false;
                    }
                    STORE.Switch(param1, param2, STORE._customPage);
                } else {
                    GLOBAL.Message(KEYS.Get("str_damaged"));
                }
            } else {
                GLOBAL.Message(KEYS.Get("str_notbuilt"));
            }
        }
        STORE.Update();
    }

    public static SpeedUp(param1: string): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: int = 0;
        let _loc4_: string = null;
        let _loc5_: MONSTERLAB = null;
        let _loc6_: string = null;
        if (GLOBAL._showStreamlinedSpeedUps && TUTORIAL.hasFinished) {
            STORE.CalcCost(param1);
            STORE._streamline = null;
            _loc2_ = GLOBAL._selectedBuilding;
            _loc3_ = (_loc2_._countdownUpgrade.Get() + _loc2_._countdownBuild.Get() + _loc2_._countdownFortify.Get()) | 0;
            if (_loc2_._repairing) {
                _loc3_ = _loc2_._repairTime;
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && Boolean(_loc2_)) {
                STORE._streamline = new STREAMLINESPEEDUP_CLIP();
                if (_loc3_ > 0) {
                    if (STORE._streamline_cost == 0) {
                        STORE._streamline.tTitle.x = -210;
                        STORE._streamline.tDescription.x = -210;
                        STORE._streamline.tTitle.htmlText = KEYS.Get("streamspd_close_title");
                        STORE._streamline.tDescription.htmlText = KEYS.Get("streamspd_close_desc");
                        STORE._streamline.mcInstant.tDescription.visible = false;
                        STORE._streamline.mcInstant.gCoin.visible = false;
                        STORE._streamline.mcInstant.gArrow.visible = false;
                        STORE._streamline.mcStoreIcon.visible = false;
                        STORE._streamline.mcInstant.bAction.Setup(KEYS.Get("str_finishnow"));
                    } else {
                        STORE._streamline.tTitle.x = -100;
                        STORE._streamline.tDescription.x = -100;
                        STORE._streamline.tTitle.htmlText = KEYS.Get("streamspd_title");
                        STORE._streamline.tDescription.htmlText = KEYS.Get("streamspd_desc", { "v1": GLOBAL.ToTime(STORE._streamline_time | 0, false, false) });
                        STORE._streamline.mcInstant.tDescription.visible = true;
                        STORE._streamline.mcInstant.gCoin.visible = true;
                        STORE._streamline.mcInstant.gArrow.visible = true;
                        STORE._streamline.mcStoreIcon.visible = true;
                        STORE._streamline.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("streamspd_upgrade") + "</b>";
                        STORE._streamline.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": STORE._streamline_cost }));
                    }
                } else if (_loc2_._type == 8) {
                    if (CREATURELOCKER._unlocking != null) {
                        _loc3_ = 0;
                        _loc3_ = (CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0;
                        _loc4_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name));
                        if (_loc3_ > 0) {
                            if (param1 == "SP1") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_closeenough");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_unlock", { "v1": _loc4_ });
                                if (_loc3_ <= GLOBAL.ioCloseEnough) {
                                    STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_unlock", { "v1": _loc4_ });
                                }
                            } else if (param1.substr(0, 3) == "SP2") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_30minutes_unlocklabel");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_30minutes_unlockdesc", { "v1": _loc4_ });
                            } else if (param1.substr(0, 3) == "SP3") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_60minutes_unlocklabel");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_60minutes_unlockdesc", { "v1": _loc4_ });
                            } else if (param1.substr(0, 3) == "SP4") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_finishnow_unlocklabel", { "v1": _loc4_ });
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc3_, false, false), "v2": _loc4_ });
                            }
                        }
                    }
                } else if (_loc2_._type == 26) {
                    if (ACADEMY._monsterID != null) {
                        _loc3_ = (GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0;
                        _loc4_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMY._monsterID].name));
                        if (_loc3_ > 0) {
                            if (param1 == "SP1") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_closeenough");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_traindesc", { "v1": _loc4_ });
                                if (_loc3_ <= GLOBAL.ioCloseEnough) {
                                    STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_traindesc_ok", { "v1": _loc4_ });
                                }
                            } else if (param1.substr(0, 3) == "SP2") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_30minutes_trainlabel");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_30minutes_traindesc", { "v1": _loc4_ });
                            } else if (param1.substr(0, 3) == "SP3") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_60minutes_trainlabel");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_60minutes_traindesc", { "v1": _loc4_ });
                            } else if (param1.substr(0, 3) == "SP4") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_finishnow_trainlabel", { "v1": _loc4_ });
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc3_, false, false), "v2": _loc4_ });
                            }
                        }
                    }
                } else if (_loc2_._type == 116) {
                    if ((_loc5_ = as3.as(_loc2_, MONSTERLAB))._upgrading != null) {
                        _loc3_ = (_loc5_._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                        _loc4_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc5_._upgrading].name));
                        _loc6_ = KEYS.Get(as3.str(MONSTERLAB._powerupProps[_loc5_._upgrading].name));
                        if (_loc3_ > 0) {
                            if (param1 == "SP1") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_closeenough");
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_powerupdesc", { "v1": _loc4_, "v2": _loc6_ });
                                if (_loc3_ <= GLOBAL.ioCloseEnough) {
                                    STORE._streamline.tDescription.htmlText = KEYS.Get("str_closeenough_powerupdesc_ok", { "v1": _loc4_, "v2": _loc6_ });
                                }
                            } else if (param1.substr(0, 3) == "SP2") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_30minutes_poweruplabel", { "v1": _loc6_ });
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_30minutes_powerupdesc", { "v1": _loc4_, "v2": _loc6_ });
                            } else if (param1.substr(0, 3) == "SP3") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_60minutes_poweruplabel", { "v1": _loc6_ });
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_60minutes_powerupdesc", { "v1": _loc4_, "v2": _loc6_ });
                            } else if (param1.substr(0, 3) == "SP4") {
                                STORE._streamline.tTitle.htmlText = KEYS.Get("str_finishnow_poweruplabel", { "v1": _loc6_ });
                                STORE._streamline.tDescription.htmlText = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc3_, false, false), "v2": _loc4_, "v3": _loc6_ });
                            }
                        }
                    }
                }
                if (_loc3_ <= GLOBAL.ioCloseEnough) {
                    STORE._streamline.mcInstant.bAction.Setup(KEYS.Get("str_finishnow"));
                } else {
                    STORE._streamline.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": STORE._streamline_cost }));
                }
                STORE._streamline.mcInstant.bAction.addEventListener(MouseEvent.CLICK, STORE.StreamlineBuy);
                STORE._streamline.mcInstant.gCoin.mouseEnabled = false;
                POPUPS.Push(STORE._streamline, null, null, null, null);
            }
        } else if (param1 == "SP4") {
            STORE.ShowB(3, 0, ["SP1", "SP2", "SP3", "SP4"]);
        } else if (param1 == "FIX") {
            STORE.ShowB(3, 1, ["FIX"], true);
        } else if (param1 == "HAMS") {
            STORE.ShowB(3, 1, ["HAMS"], true);
        }
    }

    public static StreamlineBuy(param1: MouseEvent = null): void {
        // (Inferno: 10 minutes or less left, as GetTimeCost has it, is the free Close Enough)
        if (GLOBAL.INFERNO_ONLY ? STORE._streamline_time <= GLOBAL.ioCloseEnough : STORE._streamline_time < GLOBAL.ioCloseEnough) {
            STORE.BuyB("SP1");
            POPUPS.Next();
        } else {
            if (STORE._streamline_cost > BASE._credits.Get()) {
                POPUPS.Next();
                POPUPS.DisplayGetShiny(param1);
                return;
            }
            if (!GLOBAL.ioConfirmShiny(STORE._streamline_cost | 0, "to finish this now", (): void => {
                STORE.StreamlineBuy(param1);
            })) {
                return;
            }
            STORE.BuyB("SP4");
            POPUPS.Next();
        }
    }

    public static SwitchClick(param1: int, param2: int, param3: boolean = false): Function {
        let tab: int = 0;
        let page: int = 0;
        let click: boolean = false;
        tab = param1;
        page = param2;
        click = param3;
        return (param1: MouseEvent = null): void => {
            STORE._customPage = null;
            STORE.Switch(tab, page, null, click);
            STORE._scroller.ScrollTo(0, false);
        };
    }

    public static CalcCost(param1: string, param2: boolean = false): any {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: string = null;
        let _loc7_: any = null;
        let _loc8_: string = null;
        let _loc13_: string = null;
        let _loc14_: string = null;
        let _loc15_: string = null;
        let _loc21_: any = null;
        let _loc24_: MONSTERLAB = null;
        let _loc25_: string = null;
        let _loc26_: int = 0;
        let _loc27_: boolean = false;
        let _loc28_: boolean = false;
        let _loc29_: boolean = false;
        let _loc30_: boolean = false;
        let _loc31_: Vector<any> = null;
        let _loc32_: BFOUNDATION = null;
        let _loc3_: any[] = [];
        let _loc9_: string = param1;
        let _loc10_: any = STORE._storeItems[_loc9_];
        let _loc11_: any = STORE._storeData[_loc9_];
        let _loc12_: int = 0;
        let _loc16_: BFOUNDATION = GLOBAL._selectedBuilding;
        let _loc17_: boolean = false;
        let _loc18_: any[] = as3.cast(_loc10_.c, Array);
        let _loc19_: string = _loc9_;
        STORE.Variables();
        if (_loc19_.substr(0, 2) == "SP") {
            _loc19_ = _loc19_.substr(0, 3);
        }
        if (Boolean(STORE._storeInventory[_loc19_]) && STORE._storeInventory[_loc19_].Get() > 0) {
        }
        if (Boolean(_loc10_.fbc_cost) && _loc10_.fbc_cost[0] > 0) {
            _loc17_ = true;
            _loc18_ = as3.cast(_loc10_.fbc_cost, Array);
        }
        if (_loc9_.substr(0, 2) == "SP") {
            if (_loc9_ != "SP1") {
                if (_loc9_.substr(0, 3) != "SP2") {
                    if (_loc9_.substr(0, 3) != "SP3") {
                        if (_loc9_.substr(0, 3) == "SP4") {
                        }
                    }
                }
            }
            if (_loc16_) {
                _loc12_ = (_loc16_._countdownUpgrade.Get() + _loc16_._countdownBuild.Get() + _loc16_._countdownFortify.Get()) | 0;
                if (_loc16_._repairing) {
                    _loc12_ = _loc16_._repairTime;
                }
                if (_loc12_ > 0) {
                    _loc14_ = GLOBAL.e_BASE_MODE.BUILD;
                    _loc15_ = "building";
                    if (_loc16_._countdownUpgrade.Get() > 0) {
                        _loc14_ = "upgrade";
                        _loc15_ = "upgrading";
                    }
                    if (_loc16_._countdownFortify.Get() > 0) {
                        _loc14_ = "fortify";
                        _loc15_ = "fortifying";
                    }
                    if (_loc16_._repairing) {
                        _loc14_ = "repair";
                        _loc15_ = "repairing";
                    }
                    if (_loc9_ != "SP1") {
                        if (_loc9_.substr(0, 3) != "SP2") {
                            if (_loc9_.substr(0, 3) != "SP3") {
                                if (_loc9_.substr(0, 3) == "SP4") {
                                }
                            }
                        }
                    }
                } else if (_loc16_._type == 8) {
                    if (CREATURELOCKER._unlocking != null) {
                        _loc12_ = 0;
                        _loc12_ = (CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0;
                        _loc13_ = String(CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name);
                        if (_loc12_ > 0) {
                            if (_loc9_ != "SP1") {
                                if (_loc9_.substr(0, 3) != "SP2") {
                                    if (_loc9_.substr(0, 3) != "SP3") {
                                        if (_loc9_.substr(0, 3) == "SP4") {
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (_loc16_._type == 26) {
                    if (ACADEMY._monsterID != null) {
                        _loc12_ = (GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0;
                        _loc13_ = String(CREATURELOCKER._creatures[ACADEMY._monsterID].name);
                        if (_loc12_ > 0) {
                            if (_loc9_ != "SP1") {
                                if (_loc9_.substr(0, 3) != "SP2") {
                                    if (_loc9_.substr(0, 3) != "SP3") {
                                        if (_loc9_.substr(0, 3) == "SP4") {
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (_loc16_._type == 116) {
                    if ((_loc24_ = as3.as(_loc16_, MONSTERLAB))._upgrading != null) {
                        _loc12_ = (_loc24_._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                        _loc13_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc24_._upgrading].name));
                        _loc25_ = KEYS.Get(as3.str(MONSTERLAB._powerupProps[_loc24_._upgrading].name));
                        if (_loc12_ > 0) {
                            if (_loc9_ != "SP1") {
                                if (_loc9_.substr(0, 3) != "SP2") {
                                    if (_loc9_.substr(0, 3) != "SP3") {
                                        if (_loc9_.substr(0, 3) == "SP4") {
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if (_loc9_.substr(0, 3) != "BEW") {
            if (_loc9_ != "BST") {
                if (_loc9_ != "ENL") {
                    if (_loc9_ != "BIP") {
                        if (_loc9_ != "HOD") {
                            if (_loc9_ != "HOD2") {
                                if (_loc9_ != "HOD3") {
                                    if (_loc9_ != "PRO1") {
                                        if (_loc9_ != "PRO2") {
                                            if (_loc9_ != "PRO3") {
                                                if (_loc9_ != "TOD") {
                                                    if (_loc9_ != "MOD") {
                                                        if (_loc9_ != "MDOD") {
                                                            if (_loc9_ == "MSOD") {
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        _loc4_ = 0;
        _loc5_ = _loc10_.c.length | 0;
        if (_loc11_) {
            _loc4_ = _loc11_.q | 0;
        }
        if (_loc10_.i) {
            _loc4_ = 0;
        }
        _loc6_ = "<b>" + _loc10_.t + "</b><br>" + _loc10_.d;
        if (_loc9_ == "BIP" && STORE._storeData.BIP && STORE._storeData.BIP.q < 10) {
            _loc6_ += " (Total increase of " + (STORE._storeData.BIP.q + 1) * 10 + "%)";
        }
        let _loc20_: string = "";
        if (_loc9_.substr(0, 2) == "BR" && _loc10_.c[0] == 0) {
            if ((_loc19_ = _loc9_).substr(0, 2) == "SP") {
                _loc19_ = _loc19_.substr(0, 3);
            }
            if (!(STORE._storeInventory[_loc19_] && STORE._storeInventory[_loc19_].Get() > 0)) {
                _loc20_ = KEYS.Get("str_prob_cantbuymore");
            }
        }
        if (_loc9_.substr(0, 2) == "SP") {
            if (!_loc16_) {
                _loc20_ = KEYS.Get("str_prob_nobuilding");
            } else if (_loc16_) {
                _loc12_ = 0;
                if (_loc16_._repairing) {
                    _loc12_ = _loc16_._repairTime;
                } else if (_loc16_._countdownUpgrade.Get() + _loc16_._countdownBuild.Get() + _loc16_._countdownFortify.Get() > 0) {
                    _loc12_ = (_loc16_._countdownUpgrade.Get() + _loc16_._countdownBuild.Get() + _loc16_._countdownFortify.Get()) | 0;
                } else {
                    if (_loc16_._type == 8 && CREATURELOCKER._unlocking != null) {
                        _loc12_ = (CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0;
                    }
                    if (_loc16_._type == 26 && ACADEMY._monsterID != null) {
                        _loc12_ = (GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0;
                    }
                    if (_loc16_._type == 116 && (as3.as(GLOBAL._bLab, MONSTERLAB))._upgrading != null) {
                        _loc12_ = ((as3.as(GLOBAL._bLab, MONSTERLAB))._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                    }
                }
                if (_loc12_ == 0) {
                    _loc20_ = KEYS.Get("str_prob_nothing");
                } else if (_loc9_ == "SP1" && _loc12_ > (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60)) {
                    _loc20_ = KEYS.Get("str_prob_morethan5");
                } else if (_loc9_.substr(0, 3) == "SP2" && (_loc12_ < 60 * 60 && !STORE._storeInventory.SP2 || STORE._storeInventory.SP2 && _loc12_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60))) {
                    _loc20_ = KEYS.Get("str_prob_notneeded");
                } else if (_loc9_.substr(0, 3) == "SP3" && (_loc12_ < 60 * 60 * 2 && !STORE._storeInventory.SP3 || STORE._storeInventory.SP3 && _loc12_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60))) {
                    _loc20_ = KEYS.Get("str_prob_notneeded");
                } else if (_loc9_.substr(0, 3) == "SP4" && _loc12_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60)) {
                    _loc20_ = KEYS.Get("str_prob_notneeded");
                }
            } else {
                _loc20_ = KEYS.Get("str_prob_nothingselected");
            }
        }
        if (_loc9_.substr(0, 3) == "HOD" && !GLOBAL._bHatchery) {
            _loc20_ = KEYS.Get("str_prob_nohatcheries");
        }
        if (_loc9_ == "CLOD" && !GLOBAL._bLocker) {
            _loc20_ = KEYS.Get("str_prob_nolocker");
        }
        if (_loc9_ == "FIX") {
            if (STORE._repairCount == 0) {
                _loc20_ = KEYS.Get("str_prob_notneeded");
            }
        }
        if (_loc9_.substr(0, 3) == "BLK") {
            _loc26_ = GLOBAL.townHall._lvl.Get() | 0;
            if (BASE.isOutpost) {
                _loc26_ = 7;
            }
            if (!BASE.isOutpost && _loc26_ < 3 && _loc9_.substr(3, 1) == "2") {
                _loc20_ = KEYS.Get("upgradeth", { "v1": 3 });
            } else if (!BASE.isOutpost && _loc26_ < 4 && _loc9_.substr(3, 1) == "3") {
                _loc20_ = KEYS.Get("upgradeth", { "v1": 4 });
            } else if (!BASE.isOutpost && _loc26_ < 5 && _loc9_.substr(3, 1) == "4") {
                _loc20_ = KEYS.Get("upgradeth", { "v1": 5 });
            } else if (!BASE.isOutpost && _loc26_ < 6 && _loc9_.substr(3, 1) == "5") {
                _loc20_ = KEYS.Get("upgradeth", { "v1": 6 });
            } else {
                _loc27_ = false;
                _loc28_ = false;
                _loc29_ = false;
                _loc30_ = false;
                _loc31_ = InstanceManager.getInstancesByClass(BWALL);
                for (_loc32_ of (_loc31_ ?? [])) {
                    if (_loc32_._lvl.Get() == 1 && _loc26_ >= 3) {
                        _loc27_ = true;
                        _loc28_ = true;
                        _loc29_ = true;
                        _loc30_ = true;
                        break;
                    }
                    if (_loc32_._lvl.Get() == 2 && _loc26_ >= 4) {
                        _loc28_ = true;
                        _loc29_ = true;
                        _loc30_ = true;
                    }
                    if (_loc32_._lvl.Get() == 3 && _loc26_ >= 5) {
                        _loc29_ = true;
                        _loc30_ = true;
                    }
                    if (_loc32_._lvl.Get() == 4 && _loc26_ >= 6) {
                        _loc30_ = true;
                    }
                }
            }
        }
        let _loc22_: number = 0;
        let _loc23_: number = 0;
        if (_loc17_) {
            _loc21_ = "<b><font color=\"#335280\">" + GLOBAL.FormatNumber(Number(_loc10_.fbc_cost[_loc4_])) + "</font></b>";
            _loc22_ = Number(_loc10_.fbc_cost[_loc4_]);
        } else {
            _loc21_ = "<b>" + GLOBAL.FormatNumber(Number(_loc10_.c[_loc4_])) + "</b>";
            _loc22_ = Number(_loc10_.c[_loc4_]);
            if (_loc10_.c[_loc4_] == 0 && _loc20_ == "") {
                _loc21_ = "<font color=\"#0000CC\"><b>" + KEYS.Get("str_buy_free") + "</b></font>";
                _loc22_ = 0;
            }
        }
        if (_loc20_ != "") {
            if ((_loc19_ = _loc9_).substr(0, 2) == "SP") {
                _loc19_ = _loc19_.substr(0, 3);
            }
            if (Boolean(STORE._storeInventory[_loc19_]) && STORE._storeInventory[_loc19_].Get() > 0) {
                _loc7_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc19_].Get() + "</b></font>";
                _loc23_ = Number(STORE._storeInventory[_loc19_].Get());
            } else {
                _loc7_ = _loc21_;
                _loc23_ = _loc22_;
            }
        } else {
            if (BASE._pendingPurchase.length > 0) {
            }
            if (_loc4_ >= _loc5_ && !_loc10_.i || _loc9_.substr(0, 3) == "BEW" && QUEUE._workerCount >= 5 || _loc9_.substr(0, 2) == "BR" && BASE._resources["r" + _loc9_.substr(2, 1)].Get() >= BASE._resources["r" + _loc9_.substr(2, 1) + "max"]) {
                if ((_loc19_ = _loc9_).substr(0, 2) == "SP") {
                    _loc19_ = _loc19_.substr(0, 3);
                }
                if (Boolean(STORE._storeInventory[_loc19_]) && STORE._storeInventory[_loc19_].Get() > 0) {
                    _loc7_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc19_].Get() + "</b></font>";
                    _loc23_ = Number(STORE._storeInventory[_loc19_].Get());
                } else {
                    _loc7_ = "<font color=\"#CC0000\">" + KEYS.Get("str_prob_soldout") + "</font>";
                    _loc23_ = -1;
                }
            } else {
                if ((_loc19_ = _loc9_).substr(0, 2) == "SP") {
                    _loc19_ = _loc19_.substr(0, 3);
                }
                if (Boolean(STORE._storeInventory[_loc19_]) && Boolean(STORE._storeInventory[_loc19_].Get())) {
                    _loc7_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc19_].Get() + "</b></font>";
                    _loc23_ = Number(STORE._storeInventory[_loc19_].Get());
                } else {
                    if (_loc10_.i) {
                        _loc4_ = 0;
                    }
                    _loc7_ = _loc21_;
                    _loc23_ = _loc22_;
                }
            }
        }
        STORE._streamline_time = _loc12_;
        STORE._streamline_cost = _loc23_;
        if (param2) {
            return _loc23_;
        }
        return _loc7_;
    }

    public static Switch(param1: int, param2: number, param3: any[] = null, param4: boolean = false): void {
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: any = null;
        let _loc10_: any = null;
        let groupArray: any[] = null;
        let item: string = null;
        let storeItemObject: any = null;
        let _loc22_: any = null;
        let _loc23_: STOREITEM = null;
        let _loc24_: int = 0;
        let _loc25_: string = null;
        let _loc26_: string = null;
        let _loc27_: string = null;
        let _loc28_: BFOUNDATION = null;
        let _loc29_: boolean = false;
        let _loc30_: any[] = null;
        let _loc31_: string = null;
        let _loc32_: string = null;
        let _loc33_: any = null;
        let _loc34_: MONSTERLAB = null;
        let _loc35_: string = null;
        let _loc36_: int = 0;
        let _loc37_: boolean = false;
        let _loc38_: boolean = false;
        let _loc39_: boolean = false;
        let _loc40_: boolean = false;
        let _loc41_: Vector<any> = null;
        let _loc42_: BFOUNDATION = null;
        if (TUTORIAL._stage == TUTORIAL.k_STAGE_SNIPER_SPEEDUP && param1 != 3) {
            return;
        }
        if (param4) {
            SOUNDS.Play("click1");
        }
        STORE.Variables();
        STORE.ZazzleClear();
        if (param1 < 1) {
            param1 = 1;
        }
        if (!STORE._customPage) {
            if (param2 < 0) {
                param2 = 0;
            }
            if (param2 > 1) {
                param2 = 1;
            }
        }
        if (param1 == STORE._tab) {
            STORE._scrollUpdate = false;
        } else {
            STORE._scrollUpdate = true;
        }
        if (param2 == STORE._page) {
            STORE._scrollPosUpdate = false;
        } else {
            STORE._scrollPosUpdate = true;
        }
        STORE._tab = param1;
        STORE._page = param2;
        let _loc5_: int = 1;
        while (_loc5_ <= 5) {
            (as3.as(STORE._mc["b" + _loc5_], ButtonBrown)).Highlight = false;
            _loc5_++;
        }
        if (!STORE._customPage) {
            (as3.as(STORE._mc["b" + STORE._tab], ButtonBrown)).Highlight = true;
            STORE._mc.window.gotoAndStop(STORE._tab);
        } else {
            STORE._mc.window.gotoAndStop(6);
        }
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        STORE._update = [];
        if (Boolean(STORE._items) && Boolean(STORE._items.parent)) {
            STORE._items.parent.removeChild(STORE._items);
            STORE._items = null;
        }
        STORE._items = STORE._mc.window.content.addChild(new MovieClip());
        STORE._items.x = 5;
        STORE._items.y = 8;
        if (STORE._scroller && STORE._scroller.parent && STORE._scrollUpdate) {
            STORE._scroller.parent.removeChild(STORE._scroller);
            STORE._scroller = null;
        }
        if (STORE._scrollUpdate) {
            STORE._scroller = new ScrollSet();
            STORE._scroller.x = 327;
            STORE._scroller.y = -200.05;
            STORE._scroller.width = 21;
            STORE._mc.addChild(STORE._scroller);
            STORE._scroller.AutoHideEnabled = false;
        }
        if (STORE._customPage) {
            groupArray = STORE._customPage;
        } else if (param1 == 5) {
            groupArray = [];
            STORE.ZazzleAdd();
        } else {
            groupArray = as3.cast(STORE._grouping[STORE._tab - 1][0], Array);
        }
        let _loc14_: number = 0;
        let _loc15_: number = 3;
        let _loc16_: number = 0;
        let _loc17_: number = 0;
        let _loc18_: number = 8;
        let index: int = 0;
        while (index < groupArray.length) {
            item = String(groupArray[index]);
            storeItemObject = STORE._storeItems[item];
            _loc22_ = STORE._storeData[item];
            _loc23_ = new STOREITEM();
            _loc24_ = 0;
            _loc28_ = GLOBAL._selectedBuilding;
            _loc29_ = false;
            _loc30_ = as3.cast(storeItemObject.c, Array);
            _loc31_ = item;
            _loc23_.name = _loc31_;
            if (_loc31_.substr(0, 2) == "SP") {
                _loc31_ = _loc31_.substr(0, 3);
            }
            if (Boolean(STORE._storeInventory[_loc31_]) && STORE._storeInventory[_loc31_].Get() > 0) {
                _loc23_.gotoAndStop(2);
            } else {
                _loc23_.gotoAndStop(1);
            }
            if (Boolean(storeItemObject.fbc_cost) && storeItemObject.fbc_cost[0] > 0) {
                _loc29_ = true;
                _loc30_ = as3.cast(storeItemObject.fbc_cost, Array);
            }
            if (item.substr(0, 2) == "SP") {
                if (item == "SP1") {
                    storeItemObject.t = KEYS.Get("str_closeenough");
                } else if (item.substr(0, 3) == "SP2") {
                    storeItemObject.t = KEYS.Get("str_30minutes");
                } else if (item.substr(0, 3) == "SP3") {
                    storeItemObject.t = KEYS.Get("str_60minutes");
                } else if (item.substr(0, 3) == "SP4") {
                    storeItemObject.t = KEYS.Get("str_finishnow");
                }
                storeItemObject.d = KEYS.Get("str_speedup_na");
                if (_loc28_) {
                    _loc24_ = (_loc28_._countdownUpgrade.Get() + _loc28_._countdownBuild.Get() + _loc28_._countdownFortify.Get()) | 0;
                    if (_loc28_._repairing) {
                        _loc24_ = _loc28_._repairTime;
                    }
                    if (_loc24_ > 0) {
                        _loc26_ = KEYS.Get("str_build");
                        _loc27_ = KEYS.Get("str_building");
                        if (_loc28_._countdownUpgrade.Get() > 0) {
                            _loc26_ = KEYS.Get("str_upgrade");
                            _loc27_ = KEYS.Get("str_upgrading");
                        }
                        if (_loc28_._countdownFortify.Get() > 0) {
                            _loc26_ = KEYS.Get("str_fortify");
                            _loc27_ = KEYS.Get("str_fortifying");
                        }
                        if (_loc28_._repairing) {
                            _loc26_ = KEYS.Get("str_repair");
                            _loc27_ = KEYS.Get("str_repairing");
                        }
                        if (item == "SP1") {
                            storeItemObject.t = KEYS.Get("str_closeenough");
                            storeItemObject.d = KEYS.Get("str_closeenough_desc", { "v1": _loc27_, "v2": KEYS.Get(as3.str(_loc28_._buildingProps.name)) });
                            if (_loc24_ <= GLOBAL.ioCloseEnough) {
                                storeItemObject.d = KEYS.Get("str_closeenough_descok", { "v1": _loc27_, "v2": KEYS.Get(as3.str(_loc28_._buildingProps.name)) });
                            }
                        } else if (item.substr(0, 3) == "SP2") {
                            storeItemObject.t = KEYS.Get("str_30minutes");
                            storeItemObject.d = KEYS.Get("str_30minutesdesc", { "v1": _loc26_, "v2": KEYS.Get(as3.str(_loc28_._buildingProps.name)) });
                        } else if (item.substr(0, 3) == "SP3") {
                            storeItemObject.t = KEYS.Get("str_60minutes");
                            storeItemObject.d = KEYS.Get("str_60minutesdesc", { "v1": _loc26_, "v2": KEYS.Get(as3.str(_loc28_._buildingProps.name)) });
                        } else if (item.substr(0, 3) == "SP4") {
                            storeItemObject.t = KEYS.Get("str_finishnow_desc", { "v1": _loc26_ });
                            storeItemObject.d = KEYS.Get("str_finishnow_timesave", { "v1": GLOBAL.ToTime(_loc24_, false, false), "v2": _loc27_, "v3": KEYS.Get(as3.str(_loc28_._buildingProps.name)) });
                        }
                    } else if (_loc28_._type == 8) {
                        if (CREATURELOCKER._unlocking != null) {
                            _loc24_ = 0;
                            _loc24_ = (CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0;
                            _loc25_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name));
                            if (_loc24_ > 0) {
                                if (item == "SP1") {
                                    storeItemObject.t = KEYS.Get("str_closeenough");
                                    storeItemObject.d = KEYS.Get("str_closeenough_unlock", { "v1": _loc25_ });
                                    if (_loc24_ <= GLOBAL.ioCloseEnough) {
                                        storeItemObject.d = KEYS.Get("str_closeenough_unlock", { "v1": _loc25_ });
                                    }
                                } else if (item.substr(0, 3) == "SP2") {
                                    storeItemObject.t = KEYS.Get("str_30minutes_unlocklabel");
                                    storeItemObject.d = KEYS.Get("str_30minutes_unlockdesc", { "v1": _loc25_ });
                                } else if (item.substr(0, 3) == "SP3") {
                                    storeItemObject.t = KEYS.Get("str_60minutes_unlocklabel");
                                    storeItemObject.d = KEYS.Get("str_60minutes_unlockdesc", { "v1": _loc25_ });
                                } else if (item.substr(0, 3) == "SP4") {
                                    storeItemObject.t = KEYS.Get("str_finishnow_unlocklabel", { "v1": _loc25_ });
                                    storeItemObject.d = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc24_, false, false), "v2": _loc25_ });
                                }
                            }
                        }
                    } else if (_loc28_._type == 26) {
                        if (ACADEMY._monsterID != null) {
                            _loc24_ = (GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0;
                            _loc25_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[ACADEMY._monsterID].name));
                            if (_loc24_ > 0) {
                                if (item == "SP1") {
                                    storeItemObject.t = KEYS.Get("str_closeenough");
                                    storeItemObject.d = KEYS.Get("str_closeenough_traindesc", { "v1": _loc25_ });
                                    if (_loc24_ <= GLOBAL.ioCloseEnough) {
                                        storeItemObject.d = KEYS.Get("str_closeenough_traindesc_ok", { "v1": _loc25_ });
                                    }
                                } else if (item.substr(0, 3) == "SP2") {
                                    storeItemObject.t = KEYS.Get("str_30minutes_trainlabel");
                                    storeItemObject.d = KEYS.Get("str_30minutes_traindesc", { "v1": _loc25_ });
                                } else if (item.substr(0, 3) == "SP3") {
                                    storeItemObject.t = KEYS.Get("str_60minutes_trainlabel");
                                    storeItemObject.d = KEYS.Get("str_60minutes_traindesc", { "v1": _loc25_ });
                                } else if (item.substr(0, 3) == "SP4") {
                                    storeItemObject.t = KEYS.Get("str_finishnow_trainlabel", { "v1": _loc25_ });
                                    storeItemObject.d = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc24_, false, false), "v2": _loc25_ });
                                }
                            }
                        }
                    } else if (_loc28_._type == 116) {
                        if ((_loc34_ = as3.as(_loc28_, MONSTERLAB))._upgrading != null) {
                            _loc24_ = (_loc34_._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                            _loc25_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc34_._upgrading].name));
                            _loc35_ = KEYS.Get(as3.str(MONSTERLAB._powerupProps[_loc34_._upgrading].name));
                            if (_loc24_ > 0) {
                                if (item == "SP1") {
                                    storeItemObject.t = KEYS.Get("str_closeenough");
                                    storeItemObject.d = KEYS.Get("str_closeenough_powerupdesc", { "v1": _loc25_, "v2": _loc35_ });
                                    if (_loc24_ <= GLOBAL.ioCloseEnough) {
                                        storeItemObject.d = KEYS.Get("str_closeenough_powerupdesc_ok", { "v1": _loc25_, "v2": _loc35_ });
                                    }
                                } else if (item.substr(0, 3) == "SP2") {
                                    storeItemObject.t = KEYS.Get("str_30minutes_poweruplabel", { "v1": _loc35_ });
                                    storeItemObject.d = KEYS.Get("str_30minutes_powerupdesc", { "v1": _loc25_, "v2": _loc35_ });
                                } else if (item.substr(0, 3) == "SP3") {
                                    storeItemObject.t = KEYS.Get("str_60minutes_poweruplabel", { "v1": _loc35_ });
                                    storeItemObject.d = KEYS.Get("str_60minutes_powerupdesc", { "v1": _loc25_, "v2": _loc35_ });
                                } else if (item.substr(0, 3) == "SP4") {
                                    storeItemObject.t = KEYS.Get("str_finishnow_poweruplabel", { "v1": _loc35_ });
                                    storeItemObject.d = KEYS.Get("str_finishnow_unlocktimesave", { "v1": GLOBAL.ToTime(_loc24_, false, false), "v2": _loc25_, "v3": _loc35_ });
                                }
                            }
                        }
                    }
                }
            } else if (item.substr(0, 3) == "BEW") {
                storeItemObject.t = KEYS.Get("str_code_bew_title2");
                storeItemObject.d = KEYS.Get("str_code_bew_body2");
            } else if (item == "BST") {
                storeItemObject.t = KEYS.Get("str_code_bst_title2");
                storeItemObject.d = KEYS.Get("str_code_bst_body2");
            } else if (item == "ENL" || item == "ENLI") {
                storeItemObject.t = KEYS.Get("str_code_enl_title2");
                storeItemObject.d = KEYS.Get("str_code_enl_body2");
            } else if (item == "BIP") {
                storeItemObject.t = KEYS.Get("str_code_bip_title");
                storeItemObject.d = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "str_code_bipi_body2" : "str_code_bip_body2");
            } else if (item == "HOD") {
                storeItemObject.t = KEYS.Get("str_code_hod_title2");
                storeItemObject.d = KEYS.Get("str_code_hod_body2");
            } else if (item == "HOD2") {
                storeItemObject.t = KEYS.Get("str_code_hod2_title2");
                storeItemObject.d = KEYS.Get("str_code_hod2_body2");
            } else if (item == "HOD3") {
                storeItemObject.t = KEYS.Get("str_code_hod3_title2");
                storeItemObject.d = KEYS.Get("str_code_hod3_body2");
            } else if (item == "HODI") {
                storeItemObject.t = KEYS.Get("str_code_hodi_title2");
                storeItemObject.d = KEYS.Get("str_code_hodi_body2");
            } else if (item == "HOD2I") {
                storeItemObject.t = KEYS.Get("str_code_hod2i_title2");
                storeItemObject.d = KEYS.Get("str_code_hod2i_body2");
            } else if (item == "HOD3I") {
                storeItemObject.t = KEYS.Get("str_code_hod3i_title2");
                storeItemObject.d = KEYS.Get("str_code_hod3i_body2");
            } else if (item == "PRO1") {
                storeItemObject.t = KEYS.Get("str_code_pro1_title2");
                storeItemObject.d = KEYS.Get("str_code_pro1_body2");
            } else if (item == "PRO2") {
                storeItemObject.t = KEYS.Get("str_code_pro2_title2");
                storeItemObject.d = KEYS.Get("str_code_pro2_body2");
            } else if (item == "PRO3") {
                storeItemObject.t = KEYS.Get("str_code_pro3_title2");
                storeItemObject.d = KEYS.Get("str_code_pro3_body2");
            } else if (item == "TOD") {
                storeItemObject.t = KEYS.Get("str_code_tod_title");
                storeItemObject.d = KEYS.Get("str_code_tod_body");
            } else if (item == "TODI") {
                storeItemObject.t = KEYS.Get("str_code_tod_title");
                storeItemObject.d = KEYS.Get("todi_body");
            } else if (item == "MOD") {
                storeItemObject.t = KEYS.Get("str_code_mod_title");
                storeItemObject.d = KEYS.Get("str_code_mod_body");
            } else if (item == "MDOD") {
                storeItemObject.t = KEYS.Get("str_code_mdod_title");
                storeItemObject.d = KEYS.Get("str_code_mdod_body");
            } else if (item == "MSOD") {
                storeItemObject.t = KEYS.Get("str_code_msod_title");
                storeItemObject.d = KEYS.Get("str_code_msod_body");
            }
            _loc6_ = 0;
            _loc7_ = storeItemObject.c.length | 0;
            if (_loc22_) {
                _loc6_ = _loc22_.q | 0;
            }
            if (storeItemObject.i) {
                _loc6_ = 0;
            }
            _loc8_ = "<b>" + storeItemObject.t + "</b><br>" + storeItemObject.d;
            if (item == "BIP" && STORE._storeData.BIP && STORE._storeData.BIP.q < 10) {
                _loc8_ += " " + KEYS.Get("store_total%increase", { "v1": (STORE._storeData.BIP.q + 1) * 10 });
            }
            _loc32_ = "";
            if (item.substr(0, 2) == "BR" && storeItemObject.c[0] == 0) {
                if ((_loc31_ = item).substr(0, 2) == "SP") {
                    _loc31_ = _loc31_.substr(0, 3);
                }
                if (!(STORE._storeInventory[_loc31_] && STORE._storeInventory[_loc31_].Get() > 0)) {
                    _loc32_ = KEYS.Get("str_prob_cantbuymore");
                }
            }
            if (item.substr(0, 2) == "SP") {
                if (!_loc28_) {
                    _loc32_ = KEYS.Get("str_prob_nobuilding");
                } else if (_loc28_) {
                    _loc24_ = 0;
                    if (_loc28_._repairing) {
                        _loc24_ = _loc28_._repairTime;
                    } else if (_loc28_._countdownUpgrade.Get() + _loc28_._countdownBuild.Get() + _loc28_._countdownFortify.Get() > 0) {
                        _loc24_ = (_loc28_._countdownUpgrade.Get() + _loc28_._countdownBuild.Get() + _loc28_._countdownFortify.Get()) | 0;
                    } else {
                        if (_loc28_._type == 8 && CREATURELOCKER._unlocking != null) {
                            _loc24_ = (CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0;
                        }
                        if (_loc28_._type == 26 && ACADEMY._monsterID != null) {
                            _loc24_ = (GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() - GLOBAL.Timestamp()) | 0;
                        }
                        if (_loc28_._type == 116 && (as3.as(GLOBAL._bLab, MONSTERLAB))._upgrading != null) {
                            _loc24_ = ((as3.as(GLOBAL._bLab, MONSTERLAB))._upgradeFinishTime.Get() - GLOBAL.Timestamp()) | 0;
                        }
                    }
                    if (_loc24_ == 0) {
                        _loc32_ = KEYS.Get("str_prob_nothing");
                    } else if (item == "SP1" && _loc24_ > (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60)) {
                        _loc32_ = KEYS.Get("str_prob_morethan5");
                    } else if (item.substr(0, 3) == "SP2" && (_loc24_ < 60 * 60 && !STORE._storeInventory.SP2 || STORE._storeInventory.SP2 && _loc24_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60))) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    } else if (item.substr(0, 3) == "SP3" && (_loc24_ < 60 * 60 * 2 && !STORE._storeInventory.SP3 || STORE._storeInventory.SP3 && _loc24_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60))) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    } else if (item.substr(0, 3) == "SP4" && _loc24_ <= (GLOBAL.INFERNO_ONLY ? GLOBAL.ioCloseEnough : 5 * 60)) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    }
                } else {
                    _loc32_ = KEYS.Get("str_prob_nothingselected");
                }
            }
            if (item.substr(0, 3) == "HOD" && !GLOBAL._bHatchery) {
                _loc32_ = KEYS.Get("str_prob_nohatcheries");
            }
            if (item == "CLOD" && !GLOBAL._bLocker) {
                _loc32_ = KEYS.Get("str_prob_nolocker");
            }
            if (item == "FIX") {
                if (STORE._repairCount == 0) {
                    _loc32_ = KEYS.Get("str_prob_notneeded");
                }
            }
            if (item.substr(0, 3) == "BLK") {
                _loc36_ = GLOBAL.townHall._lvl.Get() | 0;
                if (BASE.isOutpost) {
                    _loc36_ = 7;
                }
                if (!BASE.isOutpost && _loc36_ < 3 && item.substr(3, 1) == "2") {
                    _loc32_ = KEYS.Get("upgradeth", { "v1": 3 });
                } else if (!BASE.isOutpost && _loc36_ < 4 && item.substr(3, 1) == "3") {
                    _loc32_ = KEYS.Get("upgradeth", { "v1": 4 });
                } else if (!BASE.isOutpost && _loc36_ < 5 && item.substr(3, 1) == "4") {
                    _loc32_ = KEYS.Get("upgradeth", { "v1": 5 });
                } else if (!BASE.isOutpost && _loc36_ < 6 && item.substr(3, 1) == "5") {
                    _loc32_ = KEYS.Get("upgradeth", { "v1": 6 });
                } else {
                    _loc37_ = false;
                    _loc38_ = false;
                    _loc39_ = false;
                    _loc40_ = false;
                    _loc41_ = InstanceManager.getInstancesByClass(BWALL);
                    for (_loc42_ of (_loc41_ ?? [])) {
                        if (_loc42_._lvl.Get() == 1 && _loc36_ >= 3) {
                            _loc37_ = true;
                            _loc38_ = true;
                            _loc39_ = true;
                            _loc40_ = true;
                            break;
                        }
                        if (_loc42_._lvl.Get() == 2 && _loc36_ >= 4) {
                            _loc38_ = true;
                            _loc39_ = true;
                            _loc40_ = true;
                        }
                        if (!BASE.isInfernoMainYardOrOutpost) {
                            if (_loc42_._lvl.Get() == 3 && _loc36_ >= 5) {
                                _loc39_ = true;
                                _loc40_ = true;
                            }
                            if (_loc42_._lvl.Get() == 4 && _loc36_ >= 6) {
                                _loc40_ = true;
                            }
                        }
                    }
                    if (item.substr(3, 1) == "2" && !_loc37_) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    }
                    if (item.substr(3, 1) == "3" && !_loc38_) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    }
                    if (item.substr(3, 1) == "4" && !_loc39_) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    }
                    if (item.substr(3, 1) == "5" && !_loc40_) {
                        _loc32_ = KEYS.Get("str_prob_notneeded");
                    }
                }
            }
            if (_loc29_) {
                _loc33_ = "<b><font color=\"#335280\">" + GLOBAL.FormatNumber(Number(storeItemObject.fbc_cost[_loc6_])) + "</font></b>";
            } else {
                _loc33_ = "<b>" + GLOBAL.FormatNumber(Number(storeItemObject.c[_loc6_])) + "</b>";
                if (storeItemObject.c[_loc6_] == 0 && _loc32_ == "") {
                    _loc33_ = "<font color=\"#0000CC\"><b>" + KEYS.Get("str_buy_free") + "</b></font>";
                }
            }
            if (_loc32_ != "") {
                _loc23_.mcScreen.visible = true;
                _loc23_.mcScreen.enabled = true;
                if ((_loc31_ = item).substr(0, 2) == "SP") {
                    _loc31_ = _loc31_.substr(0, 3);
                }
                if (Boolean(STORE._storeInventory[_loc31_]) && STORE._storeInventory[_loc31_].Get() > 0) {
                    _loc9_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc31_].Get() + "</b></font>";
                } else {
                    _loc9_ = _loc33_;
                }
                _loc10_ = "<font color=\"#CC0000\">" + _loc32_ + "</font></i>";
                _loc23_.bBuy.Enabled = false;
            } else {
                if (BASE._pendingPurchase.length > 0) {
                    _loc23_.bBuy.Enabled = false;
                }
                if (_loc6_ >= _loc7_ && !storeItemObject.i || item.substr(0, 3) == "BEW" && QUEUE._workerCount >= 5 || item.substr(0, 2) == "BR" && BASE._resources["r" + item.substr(2, 1)].Get() >= BASE._resources["r" + item.substr(2, 1) + "max"] && item.substr(item.length - 1) != "I" || item.substr(0, 2) == "BR" && !BASE.isInfernoMainYardOrOutpost && item.substr(item.length - 1) == "I" && BASE._iresources["r" + item.substr(2, 1)].Get() >= BASE._iresources["r" + item.substr(2, 1) + "max"]) {
                    _loc23_.mcScreen.visible = true;
                    _loc23_.mcScreen.enabled = true;
                    _loc23_.bBuy.Enabled = false;
                    if ((_loc31_ = item).substr(0, 2) == "SP") {
                        _loc31_ = _loc31_.substr(0, 3);
                    }
                    if (Boolean(STORE._storeInventory[_loc31_]) && STORE._storeInventory[_loc31_].Get() > 0) {
                        _loc9_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc31_].Get() + "</b></font>";
                        _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("store_inyourinventory", { "v1": STORE._storeInventory[_loc31_].Get() }) + "</font>";
                    } else {
                        _loc9_ = "<font color=\"#CC0000\">" + KEYS.Get("str_prob_soldout") + "</font>";
                        if (storeItemObject.du > 0) {
                            _loc10_ = "<font color=\"#CC0000\">" + KEYS.Get("store_rebuy", { "v1": GLOBAL.ToTime((STORE._storeData[item].e - GLOBAL.Timestamp()) | 0, true) }) + "</font>";
                        } else if (_loc6_ == 0) {
                            _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_purchased") + "</font>";
                        } else {
                            _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_purchased_xtimes", { "v1": _loc6_, "v2": _loc7_ }) + "</font>";
                        }
                    }
                } else {
                    _loc23_.mcScreen.visible = false;
                    _loc23_.mcScreen.enabled = false;
                    _loc23_.bBuy.Highlight = true;
                    if ((_loc31_ = item).substr(0, 2) == "SP") {
                        _loc31_ = _loc31_.substr(0, 3);
                    }
                    if (Boolean(STORE._storeInventory[_loc31_]) && Boolean(STORE._storeInventory[_loc31_].Get())) {
                        _loc23_.bBuy.Highlight = true;
                        _loc9_ = "<font color=\"#0000ff\"><b>" + STORE._storeInventory[_loc31_].Get() + "</b></font>";
                        _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("store_inyourinventory", { "v1": STORE._storeInventory[_loc31_].Get() }) + "</font>";
                    } else {
                        if (storeItemObject.i) {
                            _loc6_ = 0;
                        }
                        _loc9_ = _loc33_;
                        if (storeItemObject.du > 0) {
                            _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_buy_cooldown", { "v1": GLOBAL.ToTime(storeItemObject.du | 0) }) + "</font>";
                        } else if (storeItemObject.i) {
                            _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_buyoften") + "</font>";
                        } else {
                            if (_loc6_ == 0 && _loc7_ == 1) {
                                _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_buy_once") + "</font>";
                            }
                            if (_loc6_ == 0 && _loc7_ > 1) {
                                _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_buy_xtimes", { "v1": _loc7_ }) + "</font>";
                            }
                            if (_loc6_ > 0) {
                                _loc10_ = "<font color=\"#0000CC\">" + KEYS.Get("str_buy_xtimesof", { "v1": _loc6_, "v2": _loc7_ }) + "</font>";
                            }
                        }
                    }
                }
            }
            _loc23_.x = _loc12_;
            _loc23_.y = _loc11_;
            _loc23_.tA.htmlText = _loc8_ + " ";
            _loc23_.tB.htmlText = as3.str(_loc9_);
            _loc23_.tC.htmlText = _loc10_ + " ";
            if ((_loc31_ = item).substr(0, 2) == "SP") {
                _loc31_ = _loc31_.substr(0, 3);
            }
            if (Boolean(STORE._storeInventory[_loc31_]) && STORE._storeInventory[_loc31_].Get() > 0) {
                _loc23_.bBuy.SetupKey("btn_use");
            } else {
                _loc23_.bBuy.SetupKey("btn_buy");
            }
            if (_loc23_.bBuy.Enabled) {
                _loc23_.bBuy.addEventListener(MouseEvent.MOUSE_DOWN, STORE.Buy(item));
            }
            if (item.substr(0, 2) == "SP") {
                _loc23_.mcIcon.gotoAndStop(item.substr(0, 3));
            } else if (MovieClipUtils.validateFrameLabel(_loc23_.mcIcon, item)) {
                _loc23_.mcIcon.gotoAndStop(item);
            } else {
                _loc23_.mcIcon.gotoAndStop(0);
            }
            STORE._items.addChild(_loc23_);
            _loc16_++;
            _loc14_ = Math.floor(_loc16_ / _loc15_);
            _loc12_ = (_loc16_ % _loc15_ * 220 + _loc16_ % _loc15_ * _loc17_) | 0;
            _loc11_ = (_loc14_ * 150 + _loc14_ * _loc18_) | 0;
            index++;
        }
        STORE._mc.window.content.mask = STORE._mc.window.msk;
        if (STORE._scrollUpdate) {
            STORE._scroller.Init(as3.as(STORE._mc.window.content, Sprite), as3.as(STORE._mc.window.msk, MovieClip), 0, 0, 391, 30);
            if (STORE._scrollPosUpdate) {
                STORE._scroller.ScrollTo(0, false);
            }
        }
    }

    public static Update(): void {
        if (STORE._open) {
            STORE._mc.tShinyBalance.htmlText = "<b>" + GLOBAL.FormatNumber(BASE._credits.Get()) + " <font size=\"12\">" + KEYS.Get("#r_shiny#") + "</font></b>";
            STORE.Switch(STORE._tab, STORE._page);
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (TUTORIAL._stage == TUTORIAL.k_STAGE_SNIPER_SPEEDUP && STORE.m_tutorialBlock) {
            return;
        }
        if (STORE._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            STORE._open = false;
            GLOBAL._layerWindows.removeChild(STORE._mc);
            STORE._tab = 0;
            STORE._page = 0;
            STORE._mc = null;
        }
    }

    public static Buy(param1: string): Function {
        let itemCode: string = null;
        itemCode = param1;
        return (param1: MouseEvent = null): void => {
            let buyAgain: MouseEvent = null;
            let _loc2_: any = undefined;
            let _loc3_: any = undefined;
            let _loc4_: any = undefined;
            let _loc5_: any = undefined;
            let _loc6_: any = undefined;
            if (BASE._pendingPurchase.length == 0) {
                _loc2_ = STORE._storeItems[itemCode];
                if (Boolean(_loc2_.fbc_cost) && _loc2_.fbc_cost[0] > 0) {
                    _loc5_ = true;
                    _loc4_ = _loc2_.fbc_cost;
                } else {
                    _loc5_ = false;
                    _loc4_ = _loc2_.c;
                }
                _loc3_ = _loc4_[0];
                if (Boolean(STORE._storeData[itemCode]) && !_loc2_.i) {
                    _loc3_ = _loc4_[STORE._storeData[itemCode].q];
                }
                if (_loc5_) {
                    STORE.FacebookCreditPurchase(itemCode);
                } else {
                    if ((_loc6_ = itemCode).substr(0, 2) == "SP") {
                        _loc6_ = _loc6_.substr(0, 3);
                    }
                    if (Boolean(STORE._storeInventory[_loc6_]) && STORE._storeInventory[_loc6_].Get() > 0) {
                        STORE._storeInventory[_loc6_].Add(-1);
                        if (STORE._storeInventory[_loc6_].Get() <= 0) {
                            delete STORE._storeInventory[_loc6_];
                        }
                        STORE.BuyB(itemCode, true);
                    } else if (BASE._credits.Get() >= _loc3_) {
                        buyAgain = param1;
                        if (!GLOBAL.ioConfirmShiny(_loc3_ | 0, "on this", (): void => {
                            STORE.Buy(itemCode)(buyAgain);
                        })) {
                            return;
                        }
                        STORE.BuyB(itemCode);
                    } else {
                        POPUPS.DisplayGetShiny();
                    }
                }
            }
        };
    }

    public static BuyB(param1: string, param2: boolean = false): void {
        let _loc4_: int = 0;
        let _loc5_: any[] = null;
        let _loc7_: boolean = false;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc12_: BFOUNDATION = null;
        let _loc13_: int = 0;
        let _loc14_: Vector<any> = null;
        let _loc15_: BFOUNDATION = null;
        let _loc16_: int = 0;
        let _loc17_: int = 0;
        let _loc18_: string = null;
        let _loc19_: MONSTERLAB = null;
        let _loc20_: Vector<any> = null;
        let _loc21_: BFOUNDATION = null;
        let _loc3_: any = STORE._storeItems[param1];
        let _loc6_: number = Number(_loc3_.quantity);
        if (param2) {
            _loc7_ = false;
            _loc5_ = as3.cast(_loc3_.c, Array);
        } else if (Boolean(_loc3_.fbc_cost) && _loc3_.fbc_cost[0] > 0) {
            _loc7_ = true;
            _loc5_ = as3.cast(_loc3_.fbc_cost, Array);
        } else {
            _loc7_ = false;
            _loc5_ = as3.cast(_loc3_.c, Array);
        }
        _loc4_ = _loc5_[0] | 0;
        if (Boolean(STORE._storeData[param1]) && !_loc3_.i) {
            _loc4_ = _loc5_[STORE._storeData[param1].q] | 0;
        }
        if (STORE._storeData[param1] && STORE._storeData[param1].q >= _loc3_.c.length && !_loc3_.i) {
            GLOBAL.Message(KEYS.Get("str_prob_alreadyhave"));
            return;
        }
        let _loc10_: int = 0;
        if ((_loc10_ = _loc3_.quantity | 0) == 0) {
            _loc10_ = 1;
        }
        if (param1.substr(0, 2) == "BR" || param1.substr(0, 3) == "SP4") {
            _loc10_ = _loc4_;
        }
        let _loc11_: int = _loc10_;
        if (!_loc7_ && !param2) {
            BASE._credits.Add(-_loc4_);
            BASE._hpCredits -= _loc4_;
        }
        if (param1.substr(0, 3) == "BEW") {
            QUEUE.Spawn(1);
        }
        if (param1.substr(0, 3) == "BLK") {
            _loc13_ = Number(param1.substr(3, 1)) | 0;
            _loc14_ = InstanceManager.getInstancesByClass(BWALL);
            for (_loc12_ of (_loc14_ ?? [])) {
                if (_loc12_._countdownBuild.Get() > 0) {
                    _loc12_.Constructed();
                }
                if (_loc12_._countdownUpgrade.Get() > 0) {
                    _loc12_.Upgraded();
                }
                while (_loc12_._lvl.Get() < _loc13_) {
                    _loc12_.Upgraded();
                }
            }
            _loc11_ = _loc4_;
            if (BASE.isInfernoMainYardOrOutpost) {
                if (_loc13_ == 2) {
                    GLOBAL.Message("<b>" + KEYS.Get("msg_wallsgranite") + "</b>");
                } else if (_loc13_ == 3) {
                    GLOBAL.Message("<b>" + KEYS.Get("msg_wallsforgedsteel") + "</b>");
                }
            } else if (_loc13_ == 2) {
                GLOBAL.Message("<b>" + KEYS.Get("msg_wallsstone") + "</b>");
            } else if (_loc13_ == 3) {
                GLOBAL.Message("<b>" + KEYS.Get("msg_wallsmetal") + "</b>");
            } else if (_loc13_ == 4) {
                GLOBAL.Message("<b>" + KEYS.Get("msg_wallsgold") + "</b>");
            } else if (_loc13_ == 5) {
                GLOBAL.Message("<b>" + KEYS.Get("msg_wallsblackdiamond") + "</b>");
            }
        }
        if (param1.substr(0, 2) == "BR") {
            if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD && param1.substr(param1.length - 1) == "I") {
                BASE.Fund(Number(param1.substr(2, 1)) | 0, Math.ceil(_loc6_), false, null, true);
                BASE.PointsAdd(Math.ceil(_loc6_ * 0.3) >>> 0);
            } else {
                BASE.Fund(Number(param1.substr(2, 1)) | 0, Math.ceil(_loc6_));
                BASE.PointsAdd(Math.ceil(_loc6_ * 0.3) >>> 0);
            }
        }
        if (param1.substr(0, 3) == "HOD") {
            if (param2) {
                LOGGER.Stat([76, "overdriveused"]);
            }
        }
        if (param1.substr(0, 2) == "SP") {
            _loc15_ = GLOBAL._selectedBuilding;
            if (!_loc15_ && GLOBAL.INFERNO_ONLY) {
                // (bug report 65: the building was deselected, or finished, while the speed-ups were open: Buy
                // stopped the game here. Nothing is bought; any Shiny taken comes back)
                if (!_loc7_ && !param2) {
                    BASE._credits.Add(_loc4_);
                    BASE._hpCredits += _loc4_;
                }
                STORE.Hide();
                GLOBAL.Message(KEYS.Get("io_speedup_nobuilding"));
                return;
            }
            _loc16_ = 0;
            if (param1.substr(2, 1) == "1") {
                // (Inferno-only, bug report B4: Close Enough finishes it: it is offered under io_price_closeenough)
                _loc16_ = (GLOBAL.INFERNO_ONLY ? Math.max(5 * 60, GLOBAL.ioCloseEnough) : 5 * 60) | 0;
            }
            if (param1.substr(2, 1) == "2") {
                _loc16_ = (60 * 60) | 0;
            }
            if (param1.substr(2, 1) == "3") {
                _loc16_ = (60 * 60 * 2) | 0;
            }
            if (_loc15_._repairing) {
                _loc17_ = _loc15_._lvl.Get() == 0 ? 0 : (_loc15_._lvl.Get() - 1) | 0;
                _loc15_.setHealth(_loc15_.health + Math.ceil(_loc15_.maxHealth / _loc15_._repairTime) * _loc16_);
                if ((_loc18_ = param1.substr(2, 1)) == "4" || _loc18_ == "1" || _loc15_.health > _loc15_.maxHealth) {
                    _loc15_.setHealth(_loc15_.maxHealth);
                    LOGGER.Stat([26, _loc15_._type, 0, 1, _loc4_]);
                } else {
                    LOGGER.Stat([26, _loc15_._type, 0, 0, _loc4_]);
                }
            } else if (_loc15_._countdownBuild.Get()) {
                _loc15_._countdownBuild.Add(-_loc16_);
                _loc8_ = 0;
                if (_loc15_._countdownBuild.Get() <= 0 || param1.substr(2, 1) == "4") {
                    _loc8_ = 1;
                    _loc15_._countdownBuild.Set(0);
                    _loc15_.Constructed();
                    _loc15_.Update();
                }
                LOGGER.Stat([1, _loc15_._type, 0, _loc8_, _loc4_]);
            } else if (_loc15_._countdownUpgrade.Get()) {
                _loc15_._countdownUpgrade.Add(-_loc16_);
                _loc8_ = 0;
                if (_loc15_._countdownUpgrade.Get() <= 0 || param1.substr(2, 1) == "4") {
                    _loc8_ = 1;
                    _loc15_._countdownUpgrade.Set(0);
                    _loc15_.Upgraded();
                    _loc15_.Update();
                    LOGGER.Stat([2, _loc15_._type, _loc15_._lvl.Get(), 1, _loc4_]);
                } else {
                    LOGGER.Stat([2, _loc15_._type, _loc15_._lvl.Get() + 1, 0, _loc4_]);
                }
            } else if (_loc15_._countdownFortify.Get()) {
                _loc15_._countdownFortify.Add(-_loc16_);
                _loc8_ = 0;
                if (_loc15_._countdownFortify.Get() <= 0 || param1.substr(2, 1) == "4") {
                    _loc8_ = 1;
                    _loc15_._countdownFortify.Set(0);
                    _loc15_.Fortified();
                    _loc15_.Update();
                    LOGGER.Stat([67, _loc15_._type, _loc15_._lvl.Get(), 1, _loc4_]);
                } else {
                    LOGGER.Stat([67, _loc15_._type, _loc15_._lvl.Get() + 1, 0, _loc4_]);
                }
            } else if (_loc15_._type == 8) {
                _loc8_ = 0;
                if (CREATURELOCKER._unlocking != null && CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].t == 1) {
                    CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e -= _loc16_;
                    if (param1.substr(2, 1) == "4" || CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e < GLOBAL.Timestamp()) {
                        _loc8_ = 1;
                        CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e = GLOBAL.Timestamp();
                    }
                }
                LOGGER.Stat([3, Number(CREATURELOCKER._unlocking.substr(1)) | 0, 0, _loc8_, _loc4_]);
                CREATURELOCKER.Update();
            } else if (_loc15_._type == 26) {
                _loc8_ = 0;
                if (ACADEMY._monsterID != null) {
                    GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Add(-_loc16_);
                    if (param1.substr(2, 1) == "4" || GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Get() < GLOBAL.Timestamp()) {
                        _loc8_ = 1;
                        GLOBAL.player.m_upgrades[ACADEMY._monsterID].time.Set(GLOBAL.Timestamp() + 1);
                        LOGGER.Stat([4, ACADEMY._monsterID.substr(1), GLOBAL.player.m_upgrades[ACADEMY._monsterID].level, 1, _loc4_]);
                    } else {
                        LOGGER.Stat([4, ACADEMY._monsterID.substr(1), GLOBAL.player.m_upgrades[ACADEMY._monsterID].level + 1, 0, _loc4_]);
                    }
                }
                ACADEMY.Update();
            } else if (_loc15_._type == 116) {
                _loc8_ = 0;
                if (Boolean(_loc19_ = as3.as(GLOBAL._bLab, MONSTERLAB)) && _loc19_._upgrading != null) {
                    _loc19_._upgradeFinishTime.Add(-_loc16_);
                    if (param1.substr(2, 1) == "4" || _loc19_._upgradeFinishTime.Get() < GLOBAL.Timestamp()) {
                        _loc8_ = 1;
                        _loc19_._upgradeFinishTime.Set(GLOBAL.Timestamp() + 1);
                        LOGGER.Stat([51, _loc19_._upgrading.substr(1), _loc19_._upgradeLevel, 1, _loc4_]);
                    } else {
                        LOGGER.Stat([51, _loc19_._upgrading.substr(1), _loc19_._upgradeLevel, 0, _loc4_]);
                    }
                }
            }
            QUESTS.Check();
        }
        if (param1 == "FIX") {
            _loc11_ = STORE._storeItems.FIX.c | 0;
            _loc20_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc21_ of (_loc20_ ?? [])) {
                if (_loc21_.health < _loc21_.maxHealth) {
                    _loc21_.setHealth(_loc21_.maxHealth);
                    _loc21_.Repaired();
                }
            }
            if (param2) {
                _loc6_ = Number(STORE._storeData[param1].c);
            }
        }
        if (param1 == "HAMS") {
            _loc11_ = STORE._storeItems.HAMS.c | 0;
            GLOBAL.player.healInstantAll();
        }
        _loc10_ = 1;
        if (_loc3_.i) {
            _loc10_ = _loc6_ | 0;
        }
        if (STORE._storeData[param1]) {
            STORE._storeData[param1].q += _loc10_;
            if (_loc3_.du > 0) {
                STORE._storeData[param1].s = GLOBAL.Timestamp();
                STORE._storeData[param1].e = GLOBAL.Timestamp() + _loc3_.du;
            }
        } else {
            STORE._storeData[param1] = { "q": _loc10_ };
            if (_loc3_.du > 0) {
                STORE._storeData[param1].s = GLOBAL.Timestamp();
                STORE._storeData[param1].e = GLOBAL.Timestamp() + _loc3_.du;
            }
        }
        BASE.CalcResources();
        UI2.Update();
        STORE.ProcessPurchases();
        if (param1 == "ENL" || param1 == "ENLI") {
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP.Edge();
            } else {
                MAP.swapBG(MAP.texture);
            }
        }
        if (param1 == "BIP") {
            BASE.CalcResources();
        }
        if (_loc7_) {
            BASE.Save(0, false, true);
        } else if (_loc4_ > 0) {
            if (param2) {
                if ((_loc9_ = param1).substr(0, 2) == "SP") {
                    _loc9_ = _loc9_.substr(0, 3);
                }
                BASE.Purchase(_loc9_, 1, "store", true);
            } else {
                BASE.Purchase(param1, _loc11_, "store");
            }
        } else {
            BASE.Save();
        }
        if (_loc3_.a) {
            STORE.m_tutorialBlock = false;
            STORE.Hide();
        } else {
            STORE.Switch(STORE._tab, STORE._page);
        }
        LOGGER.Stat([13, param1, _loc4_]);
        if (!param2) {
            STORE.BuyC(param1, _loc4_);
        }
    }

    public static BuyC(param1: string, param2: int): void {
        let arr: any[] = null;
        let itemCode: string = null;
        let Brag: Function = null;
        arr = null;
        let mc: MovieClip = null;
        itemCode = param1;
        let cost: int = param2;
        if (TUTORIAL._stage > 200) {
            arr = [];
            switch (itemCode) {
                case "BEW":
                    arr = [KEYS.Get("str_code_bew_title"), KEYS.Get("str_code_bew_body", { "v1": QUEUE._workerCount }), KEYS.Get("str_code_bew_stream"), KEYS.Get("str_code_bew_streambody", { "v1": QUEUE._workerCount }), "purchased-worker.v2.png"];
                    break;
                case "BST":
                    arr = [KEYS.Get("str_code_bst_title"), KEYS.Get("str_code_bst_body"), KEYS.Get("str_code_bst_stream"), KEYS.Get("str_code_bst_streambody"), "purchased-tools.v2.png"];
                    break;
                case "ENLI":
                    PLANNER.Update();
                    arr = [KEYS.Get("str_code_enli_title"), KEYS.Get("str_code_enli_body"), KEYS.Get("str_code_enli_stream"), KEYS.Get("str_code_enli_stream"), "purchased-enlarge.v2.png"];
                    break;
                case "ENL":
                    PLANNER.Update();
                    arr = [KEYS.Get("str_code_enl_title"), KEYS.Get("str_code_enl_body"), KEYS.Get("str_code_enl_stream"), KEYS.Get("str_code_enl_stream"), "purchased-enlarge.v2.png"];
                    break;
                case "BIP":
                    arr = [KEYS.Get("str_code_bip_title"), KEYS.Get("str_code_bip_body"), KEYS.Get("str_code_bip_stream"), KEYS.Get("str_code_bip_streambody"), "purchased-packing.v2.png"];
                    break;
                case "HOD":
                    arr = [KEYS.Get("str_code_hod_title"), KEYS.Get("str_code_hod_body"), KEYS.Get("str_code_hod_stream"), KEYS.Get("str_code_hod_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "HOD2":
                    arr = [KEYS.Get("str_code_hod2_title"), KEYS.Get("str_code_hod2_body"), KEYS.Get("str_code_hod2_stream"), KEYS.Get("str_code_hod2_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "HOD3":
                    arr = [KEYS.Get("str_code_hod3_title"), KEYS.Get("str_code_hod3_body"), KEYS.Get("str_code_hod3_stream"), KEYS.Get("str_code_hod3_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "HODI":
                    arr = [KEYS.Get("str_code_hodi_title"), KEYS.Get("str_code_hodi_body"), KEYS.Get("str_code_hodi_stream"), KEYS.Get("str_code_hodi_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "HOD2I":
                    arr = [KEYS.Get("str_code_hod2i_title"), KEYS.Get("str_code_hod2i_body"), KEYS.Get("str_code_hod2i_stream"), KEYS.Get("str_code_hod2i_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "HOD3I":
                    arr = [KEYS.Get("str_code_hod3i_title"), KEYS.Get("str_code_hod3i_body"), KEYS.Get("str_code_hod3i_stream"), KEYS.Get("str_code_hod3i_streambody"), "purchased-hatchery.v2.png"];
                    break;
                case "TOD":
                    arr = [KEYS.Get("tod_title2"), KEYS.Get("tod_body"), KEYS.Get("str_code_tod_stream"), KEYS.Get("str_code_tod_streambody"), "purchased-tod3.png"];
                    break;
                case "TODI":
                    arr = [KEYS.Get("todi_title2"), KEYS.Get("todi_body"), KEYS.Get("str_code_todi_stream"), KEYS.Get("str_code_todi_streambody"), "purchased-todi.png"];
                    break;
                case "MOD":
                    arr = [KEYS.Get("mod_title"), KEYS.Get("mod_body"), KEYS.Get("str_code_mod_stream"), KEYS.Get("str_code_mod_streambody"), "purchased-mod3.png"];
                    break;
                case "MDOD":
                    arr = [KEYS.Get("mdod_title"), KEYS.Get("mdod_body"), KEYS.Get("str_code_mdod_stream"), KEYS.Get("str_code_mdod_streambody"), "purchased-mdod3.png"];
                    break;
                case "MSOD":
                    arr = [KEYS.Get("msod_title"), KEYS.Get("msod_body"), KEYS.Get("str_code_msod_stream"), KEYS.Get("str_code_msod_streambody"), "purchased-msod3.png"];
                    break;
                case "EXH":
                    arr = [KEYS.Get("exh_title"), KEYS.Get("exh_body"), KEYS.Get("str_code_exh_stream"), KEYS.Get("str_code_exh_streambody"), "purchased-exh.png"];
                    break;
                case "CLOD":
                    arr = [KEYS.Get("str_code_clod_title"), KEYS.Get("str_code_clod_body"), KEYS.Get("str_code_clod_stream"), KEYS.Get("str_code_clod_streambody"), "purchased-locker.v2.png"];
                    break;
                case "PRO1":
                    arr = [KEYS.Get("str_code_pro1_title"), KEYS.Get("str_code_pro1_body"), KEYS.Get("str_code_pro1_stream"), "", "purchased-protection1.png"];
                    break;
                case "PRO2":
                    arr = [KEYS.Get("str_code_pro2_title"), KEYS.Get("str_code_pro2_body"), KEYS.Get("str_code_pro2_stream"), "", "purchased-protection2.png"];
                    break;
                case "PRO3":
                    arr = [KEYS.Get("str_code_pro3_title"), KEYS.Get("str_code_pro3_body"), KEYS.Get("str_code_pro3_stream"), "", "purchased-protection3.png"];
            }
            if (arr.length > 0) {
                Brag = (param1: MouseEvent): void => {
                    GLOBAL.CallJS("sendFeed", ["store-" + itemCode, arr[2], arr[3], arr[4]]);
                    POPUPS.Next();
                };
                mc = new popup_purchase();
                mc.gotoAndStop(itemCode);
                mc.tA.htmlText = "<b>" + arr[0] + "</b>";
                mc.tB.htmlText = arr[1];
                (as3.as(mc.bPost, Button)).SetupKey("btn_brag");
                mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
                mc.bPost.Highlight = true;
                POPUPS.Push(mc, null, null, "");
            } else if (cost > 0 && !STORE._storeItems[itemCode].a) {
                GLOBAL.Message(KEYS.Get("msg_purchase_complete", { "v1": STORE._storeItems[itemCode].t }));
            }
        }
    }

    public static FacebookCreditPurchase(param1: string): void {
        let _loc2_: any = STORE._storeItems[param1];
        let _loc3_: int = _loc2_.fbc_cost[0] | 0;
        if (Boolean(STORE._storeData[param1]) && !_loc2_.i) {
            _loc3_ = _loc2_.fbc_cost[STORE._storeData[param1].q] | 0;
        }
        GLOBAL.CallJS("cc.fbcBuyItem", [param1, "fbcBuyItem"]);
        STORE._facebookPurchaseItemCode = param1;
        PLEASEWAIT.Show(KEYS.Get("msg_openingfb"));
    }

    public static FacebookCreditPurchaseB(param1: string): void {
        if ((JSON.parse(param1).success | 0) == 1) {
            STORE.BuyB(STORE._facebookPurchaseItemCode);
        }
        PLEASEWAIT.Hide();
    }

    public static ProcessPurchases(): void {
        let ENLobj: any = null;
        let i: int = 0;
        let c: MonsterBase = null;
        let enl: int = 0;
        try {
            GLOBAL._mapWidth = 1000;
            GLOBAL._mapHeight = 800;
            i = 0;
            while (i < 2) {
                ENLobj = null;
                if (Boolean(i) && Boolean(STORE._storeData.ENLI)) {
                    ENLobj = STORE._storeData.ENLI;
                } else if (!i && Boolean(STORE._storeData.ENL)) {
                    ENLobj = STORE._storeData.ENL;
                }
                if (ENLobj) {
                    enl = 0;
                    while (enl < ENLobj.q) {
                        GLOBAL._mapWidth = (GLOBAL._mapWidth * 1.1) | 0;
                        GLOBAL._mapHeight = (GLOBAL._mapHeight * 1.1) | 0;
                        enl++;
                    }
                    GLOBAL._mapWidth = (Math.ceil(GLOBAL._mapWidth / 20) * 20) | 0;
                    GLOBAL._mapHeight = (Math.ceil(GLOBAL._mapHeight / 20) * 20) | 0;
                }
                i++;
            }
            // Inferno-only: a wild tribe or Moloch design (the Designer) has no yard edge: its yard is nearly
            // the whole map grid, for placing, moving and the Yard Planner alike.
            if (GLOBAL.ioDesignFree()) {
                GLOBAL._mapWidth = GLOBAL.IO_DESIGN_YARD;
                GLOBAL._mapHeight = GLOBAL.IO_DESIGN_YARD;
            }
            GLOBAL._hatcheryOverdrive = 0;
            if (Boolean(STORE._storeData.HOD) && STORE._storeData.HOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HOD;
            }
            if (Boolean(STORE._storeData.HOD2) && STORE._storeData.HOD2.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HOD2;
            }
            if (Boolean(STORE._storeData.HOD3) && STORE._storeData.HOD3.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HOD3;
            }
            if (Boolean(STORE._storeData.HODI) && STORE._storeData.HODI.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HODI;
            }
            if (Boolean(STORE._storeData.HOD2I) && STORE._storeData.HOD2I.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HOD2I;
            }
            if (Boolean(STORE._storeData.HOD3I) && STORE._storeData.HOD3I.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.HOD3I;
            }
            GLOBAL._hatcheryOverdrivePower.Set(0);
            if (STORE._storeData.HOD3) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HOD3.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(10);
            } else if (STORE._storeData.HOD2) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HOD2.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(6);
            } else if (STORE._storeData.HOD) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HOD.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(4);
            } else if (STORE._storeData.HOD3I) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HOD3I.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(10);
            } else if (STORE._storeData.HOD2I) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HOD2I.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(6);
            } else if (STORE._storeData.HODI) {
                GLOBAL._hatcheryOverdrive = (STORE._storeData.HODI.e - GLOBAL.Timestamp()) | 0;
                GLOBAL._hatcheryOverdrivePower.Set(4);
            }
            GLOBAL._harvesterOverdrive = 0;
            GLOBAL._harvesterOverdrivePower.Set(0);
            if (Boolean(STORE._storeData.POD) && STORE._storeData.POD.e > GLOBAL.Timestamp()) {
                GLOBAL._harvesterOverdrive = STORE._storeData.POD.e | 0;
                GLOBAL._harvesterOverdrivePower.Set(2);
            }
            GLOBAL._extraHousing = 0;
            if (Boolean(STORE._storeData.EXH) && STORE._storeData.EXH.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.EXH;
            }
            GLOBAL._extraHousingPower.Set(0);
            if (STORE._storeData.EXH && STORE._storeData.EXH.e > GLOBAL.Timestamp() && !BASE.isInfernoMainYardOrOutpost) {
                GLOBAL._extraHousing = STORE._storeData.EXH.e | 0;
                GLOBAL._extraHousingPower.Set(1.25);
            }
            if (STORE._storeData.EXHI && STORE._storeData.EXHI.e > GLOBAL.Timestamp() && BASE.isInfernoMainYardOrOutpost) {
                GLOBAL._extraHousing = STORE._storeData.EXHI.e | 0;
                GLOBAL._extraHousingPower.Set(1.25);
            }
            GLOBAL._towerOverdrive = new SecNum(0);
            if (Boolean(STORE._storeData.TOD) && STORE._storeData.TOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.TOD;
            }
            if (STORE._storeData.TOD) {
                GLOBAL._towerOverdrive.Set(Number(STORE._storeData.TOD.e));
            }
            if (Boolean(STORE._storeData.TODI) && STORE._storeData.TODI.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.TODI;
            }
            if (STORE._storeData.TODI) {
                GLOBAL._towerOverdrive.Set(Number(STORE._storeData.TODI.e));
            }
            GLOBAL._monsterOverdrive.Set(0);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._attackerMonsterOverdrive.Set(0);
            }
            if (BASE.isInfernoMainYardOrOutpost) {
                GLOBAL._playerMonsterOverdrive.Set(0);
            }
            if (Boolean(STORE._storeData.MOD) && STORE._storeData.MOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.MOD;
            }
            if (STORE._storeData.MOD) {
                GLOBAL._monsterOverdrive.Set(Number(STORE._storeData.MOD.e));
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    GLOBAL._playerMonsterOverdrive.Set(Number(STORE._storeData.MOD.e));
                }
                for (c of as3.values(CREATURES._creatures)) {
                    c.updateBuffs();
                }
            }
            GLOBAL._monsterDefenseOverdrive.Set(0);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._attackerMonsterDefenseOverdrive.Set(0);
            }
            if (BASE.isInfernoMainYardOrOutpost) {
                GLOBAL._playerMonsterDefenseOverdrive.Set(0);
            }
            if (Boolean(STORE._storeData.MDOD) && STORE._storeData.MDOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.MDOD;
            }
            if (STORE._storeData.MDOD) {
                GLOBAL._monsterDefenseOverdrive.Set(Number(STORE._storeData.MDOD.e));
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    GLOBAL._playerMonsterDefenseOverdrive.Set(Number(STORE._storeData.MDOD.e));
                }
                for (c of as3.values(CREATURES._creatures)) {
                    c.updateBuffs();
                }
            }
            GLOBAL._monsterSpeedOverdrive.Set(0);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._attackerMonsterSpeedOverdrive.Set(0);
            }
            if (BASE.isInfernoMainYardOrOutpost) {
                GLOBAL._playerMonsterSpeedOverdrive.Set(0);
            }
            if (Boolean(STORE._storeData.MSOD) && STORE._storeData.MSOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.MSOD;
            }
            if (STORE._storeData.MSOD) {
                GLOBAL._monsterSpeedOverdrive.Set(Number(STORE._storeData.MSOD.e));
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
                    GLOBAL._playerMonsterSpeedOverdrive.Set(Number(STORE._storeData.MSOD.e));
                }
                for (c of as3.values(CREATURES._creatures)) {
                    c.updateBuffs();
                }
            }
            if (BASE._isProtected >= GLOBAL.Timestamp() && (Boolean(STORE._storeData.PRO1) || Boolean(STORE._storeData.PRO2) || Boolean(STORE._storeData.PRO3))) {
                BASE._isSanctuary = BASE._isProtected;
                UI2.Hide("wmbar");
            }
            GLOBAL._lockerOverdrive = 0;
            if (Boolean(STORE._storeData.CLOD) && STORE._storeData.CLOD.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.CLOD;
            }
            if (STORE._storeData.CLOD) {
                GLOBAL._lockerOverdrive = (STORE._storeData.CLOD.e - GLOBAL.Timestamp()) | 0;
            }
            GLOBAL._buildTime = 1;
            if (Boolean(STORE._storeData.BST) && STORE._storeData.BST.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.BST;
            }
            if (STORE._storeData.BST) {
                GLOBAL._buildTime -= 0.2;
            }
            GLOBAL._upgradePacking = 1;
            if (STORE._storeData.BIP) {
                GLOBAL._upgradePacking += 0.1 * STORE._storeData.BIP.q;
            }
            GLOBAL._upgradePacking = ((GLOBAL._upgradePacking * 100) | 0) / 100;
            GLOBAL._researchTime = 1;
            if (Boolean(STORE._storeData.RQT) && STORE._storeData.RQT.e < GLOBAL.Timestamp()) {
                delete STORE._storeData.RQT;
            }
            if (STORE._storeData.RQT) {
                GLOBAL._researchTime -= 0.2;
            }
            GLOBAL._designSlots = 4;
            if (STORE._storeData.DSL) {
                GLOBAL._designSlots = (GLOBAL._designSlots + STORE._storeData.DSL.q) | 0;
            }
            STORE.Update();
        } catch (e) {
            LOGGER.Log("err", "Store.ProcessPurchases: " + e.message + " | " + e.getStackTrace());
        }
    }

    public static CheckUpgrade(param1: string): any {
        return STORE._storeData[param1];
    }

    public static updateCredits(param1: string): void {
        POPUPS.Next();
        let _loc2_: any = JSON.parse(param1);
        if (_loc2_.error == 0) {
            if (LOGIN.checkHash(param1)) {
                BASE._credits.Set(_loc2_.credits | 0);
                BASE._hpCredits = _loc2_.credits | 0;
                GLOBAL._credits.Set(_loc2_.credits | 0);
            } else {
                LOGGER.Log("err", "STORE.updateCrddits " + param1);
            }
        } else {
            GLOBAL.ErrorMessage(as3.str(_loc2_.error), GLOBAL.ERROR_ORANGE_BOX_ONLY);
        }
    }

    public static ZazzleAdd(): void {
        let img: string = null;
        let ZazzleImageLoaded: Function = null;
        ZazzleImageLoaded = (param1: string, param2: BitmapData): void => {
            let _loc4_: int = 0;
            // Inferno-only: the store may have been closed or moved on while the picture loaded
            if (!STORE._zazzleMC || !param2) {
                return;
            }
            if (STORE._zazzleMC.numChildren) {
                _loc4_ = STORE._zazzleMC.numChildren;
                while (_loc4_--) {
                    STORE._zazzleMC.removeChildAt(_loc4_);
                }
            }
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.x = (670 - _loc3_.width) / 2;
            _loc3_.y = (390 - _loc3_.height) / 2;
            STORE._zazzleMC.addChild(_loc3_);
            STORE._zazzleMC.buttonMode = true;
            STORE._zazzleMC.useHandCursor = true;
            STORE._zazzleMC.addEventListener(MouseEvent.CLICK, STORE.ZazzleClick);
        };
        STORE.ZazzleClear();
        STORE._zazzleMC = new MovieClip();
        STORE._mc.window.addChild(STORE._zazzleMC);
        img = "popups/" + "ZAZZLE_AD.v2" + ".jpg";
        ImageCache.GetImageWithCallBack(img, ZazzleImageLoaded);
    }

    public static ZazzleClear(): void {
        if (Boolean(STORE._zazzleMC) && Boolean(STORE._zazzleMC.parent)) {
            STORE._zazzleMC.parent.removeChild(STORE._zazzleMC);
            STORE._zazzleMC = null;
        }
    }

    public static ZazzleClick(param1: Event = null): void {
        GLOBAL.gotoURL("http://www.zazzle.com/backyardmonsters/", null, true, [63, 1]);
    }
}
