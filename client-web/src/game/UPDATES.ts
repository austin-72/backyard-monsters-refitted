import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { BASE, BFOUNDATION, BYMConfig, CHAMPIONCAGE, CHAMPIONCHAMBER, CREATURES, ChampionBase, GLOBAL, GRID, InstanceManager, InventoryManager, KEYS, LOGGER, MAP, POPUPS, Reward, RewardHandler, TUTORIAL, URLLoaderApi, frame, popup_helped } from "@game";

export class UPDATES extends ASObject {
    public static _updates: any[] = null;

    public static _myUpdates: any[] = null;

    public static _lastUpdateID: number = NaN;

    public static _catchupList: any[] = null;

    public static _actions: any[] = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        UPDATES._updates = [];
        UPDATES._myUpdates = [];
        UPDATES._catchupList = [];
        UPDATES._actions = [];
        UPDATES._lastUpdateID = 0;
    }

    public static addAction(param1: Function, param2: string): void {
        UPDATES._actions[param2] = param1;
    }

    public static Process(param1: any[]): void {
        let _loc2_: any = null;
        let _loc3_: any = null;
        let _loc4_: any = null;
        if (!GLOBAL._save) {
            return;
        }
        if (param1) {
            for (_loc2_ of as3.values(param1)) {
                if (_loc2_.data) {
                    if (_loc2_.id > UPDATES._lastUpdateID) {
                        UPDATES._lastUpdateID = Number(_loc2_.id);
                    }
                    _loc3_ = JSON.parse(as3.str(_loc2_.data));
                    for (_loc4_ of as3.values(_loc3_)) {
                        UPDATES._updates.push({ "fbid": _loc2_.fbid, "name": _loc2_.name, "data": _loc4_ });
                    }
                }
            }
        }
    }

    public static Check(): void {
        let _loc3_: any = null;
        if (!GLOBAL._save) {
            return;
        }
        let _loc1_: int = GLOBAL.Timestamp();
        let _loc2_: int = 0;
        while (_loc2_ < UPDATES._updates.length) {
            _loc3_ = UPDATES._updates[_loc2_].data;
            if (_loc3_[0] <= _loc1_) {
                if (UPDATES.Action(UPDATES._updates[_loc2_])) {
                    UPDATES._updates.splice(_loc2_, 1);
                    _loc2_--;
                }
            }
            _loc2_++;
        }
        if (UPDATES._catchupList.length > 0 && !GLOBAL._catchup) {
            UPDATES.Catchup();
        }
    }

    public static Action(param1: any): boolean {
        let refundLevel: int = 0;
        let building: BFOUNDATION = null;
        let reward: Reward = null;
        let popupMC: MovieClip = null;
        let time: int = 0;
        let length: int = 0;
        let i: int = 0;
        let monsterdata: any = null;
        let k: int = 0;
        let numBuildings: int = 0;
        let refundType: int = 0;
        refundLevel = 0;
        let refundFeeds: int = 0;
        let refundAbility: int = 0;
        let refundBuff: int = 0;
        let refundID: string = null;
        let refundName: string = null;
        let refundHealth: int = 0;
        let refundFeedtime: int = 0;
        let update: any = param1;
        let freezeChamp: Function = (): void => {
            let _loc1_: int = 0;
            let _loc2_: int = 0;
            if (CREATURES._guardian) {
                CREATURES._guardian.modifyHealth(CREATURES._guardian.maxHealth);
                CREATURES._guardian.export();
                CREATURES._guardian.changeModeFreeze();
                _loc1_ = 0;
                _loc2_ = 0;
                while (_loc2_ < BASE._guardianData.length) {
                    if (as3.vget(BASE._guardianData, _loc2_).t == CREATURES._guardian._type) {
                        _loc1_ = _loc2_;
                    }
                    _loc2_++;
                }
                as3.vget(BASE._guardianData, _loc1_).ft -= GLOBAL.Timestamp();
                (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen.push(as3.vget(BASE._guardianData, _loc1_));
                as3.vget(BASE._guardianData, _loc1_).status = ChampionBase.k_CHAMPION_STATUS_FROZEN;
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    _loc2_ = GLOBAL.getPlayerGuardianIndex(CREATURES._guardian._type);
                    if (_loc2_ != -1) {
                        as3.vget(GLOBAL._playerGuardianData, _loc2_).status = ChampionBase.k_CHAMPION_STATUS_FROZEN;
                        as3.vget(GLOBAL._playerGuardianData, _loc2_).ft -= GLOBAL.Timestamp();
                    }
                }
                CREATURES._guardian = null;
            }
        };
        let thawChamp: Function = (param1: int): void => {
            let _loc3_: Point = null;
            let _loc4_: int = 0;
            let _loc5_: Point = null;
            let _loc6_: any[] = null;
            let _loc7_: int = 0;
            let _loc8_: any = null;
            let _loc9_: any = null;
            let _loc2_: int = 0;
            while (_loc2_ < (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen.length) {
                if ((as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].t == param1) {
                    _loc3_ = new Point(GLOBAL._bChamber.x, GLOBAL._bChamber.y + 80);
                    _loc4_ = (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].l.Get() | 0;
                    _loc5_ = GRID.FromISO(GLOBAL._bCage.x, GLOBAL._bCage.y + 20);
                    if (refundLevel > 0) {
                        for (_loc8_ of (BASE._guardianData ?? [])) {
                            if (_loc8_.t == (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].t) {
                                _loc9_ = CHAMPIONCAGE.getGuardianSpawnClass(param1);
                                CREATURES._guardian = as3.cast(new _loc9_("cage", _loc3_, 0, _loc5_, true, GLOBAL._bChamber, (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].l.Get(), (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].fd, (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].ft + GLOBAL.Timestamp(), (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].t, (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].hp.Get(), (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].fb.Get()), ChampionBase);
                                _loc8_.status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
                                break;
                            }
                        }
                        for (_loc8_ of (GLOBAL._playerGuardianData ?? [])) {
                            if (_loc8_.t == (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc2_].t) {
                                _loc8_.ft += GLOBAL.Timestamp();
                                _loc8_.status = ChampionBase.k_CHAMPION_STATUS_NORMAL;
                                break;
                            }
                        }
                        CREATURES._guardian.export();
                        if (!BYMConfig.instance.RENDERER_ON) {
                            MAP._BUILDINGTOPS.addChild(CREATURES._guardian.graphic);
                        }
                        CREATURES._guardian.changeModeCage();
                    }
                    _loc6_ = [];
                    _loc7_ = 0;
                    while (_loc7_ < (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen.length) {
                        if (_loc2_ != _loc7_) {
                            _loc6_.push((as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen[_loc7_]);
                        }
                        _loc7_++;
                    }
                    (as3.as(GLOBAL._bChamber, CHAMPIONCHAMBER))._frozen = _loc6_;
                    break;
                }
                _loc2_++;
            }
        };
        if (!GLOBAL._save) {
            return false;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            return false;
        }
        if (update.data[1] == RewardHandler.k_UPDATE_ADD || update.data[1] == RewardHandler.k_UPDATE_REMOVE || update.data[1] === RewardHandler.k_UPDATE_VALUE) {
            RewardHandler.instance.processUpdate(update);
        }
        if (update.data[1] == "BU") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building.UpgradeB();
            }
        }
        if (update.data[1] == "BUC") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building.UpgradeCancelC();
            }
        }
        if (update.data[1] == "BF") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building.FortifyB();
            }
        }
        if (update.data[1] == "BFC") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building.FortifyCancelC();
            }
        }
        if (update.data[1] == "BMU") {
            length = update.data.length | 0;
            if (GLOBAL.player.monsterList.length) {
                i = 2;
                while (i < length) {
                    monsterdata = update.data[i];
                    if (Boolean(GLOBAL.player.monsterListByID(as3.str(monsterdata.creatureID))) && GLOBAL.player.monsterListByID(as3.str(monsterdata.creatureID)).numCreeps > 0) {
                        GLOBAL.player.monsterListByID(as3.str(monsterdata.creatureID)).add((-monsterdata.count) | 0, null, true);
                    } else if (monsterdata.count < 0) {
                        GLOBAL.player.monsterListByID(as3.str(monsterdata.creatureID)).setNum((-monsterdata.count) | 0);
                    }
                    i++;
                }
            }
        }
        if (update.data[1] == "BH") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building._helpList.push(update.data[3]);
            }
            if (building) {
                time = building.HelpB();
            }
            if (time > 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                UPDATES._catchupList.push([GLOBAL.e_BASE_MODE.BUILD, update.fbid, update.name, GLOBAL._buildingProps[building._type - 1].name, time]);
            }
        }
        if (update.data[1] == "BP") {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                building = BASE.addBuildingC(update.data[2] | 0);
                building.Setup(update.data[3]);
            }
        }
        if (update.data[1] == "DBU") {
            BASE._damagedBaseWarnTime = Number(update.data[0]);
        }
        if (update.data[1] == "BT") {
            building = UPDATES.GetBuilding(update.data[2] | 0);
            if (building) {
                building._threadid = update.data[3] | 0;
            }
            if (building) {
                building._subject = as3.str(update.data[4]);
            }
            if (building) {
                building._senderid = update.data[5] | 0;
            }
            if (building) {
                building._senderName = as3.str(update.data[6]);
            }
            if (building) {
                building._senderPic = as3.str(update.data[7]);
            }
        }
        if (update.data[1] == "BE") {
            BASE._resources.r1.Add(-update.data[3]);
            BASE._hpResources.r1 -= update.data[3];
            BASE._resources.r2.Add(-update.data[4]);
            BASE._hpResources.r2 -= update.data[4];
            BASE._resources.r3.Add(-update.data[5]);
            BASE._hpResources.r3 -= update.data[5];
            BASE._resources.r4.Add(-update.data[6]);
            BASE._hpResources.r4 -= update.data[6];
            BASE._credits.Add(-update.data[7]);
            BASE._hpCredits = (BASE._hpCredits - update.data[7]) | 0;
        }
        if (update.data[1] == "BS") {
            k = 0;
            numBuildings = update.data[3] | 0;
            while (i < numBuildings) {
                InventoryManager.buildingStorageAdd(update.data[2] | 0);
                i++;
            }
        }
        if (update.data[1] == "CMR") {
            if (BASE.isInfernoMainYardOrOutpost) {
                LOGGER.Log("log", "ABORTING Champion Refund because user is in Inferno", true);
                return false;
            }
            refundType = update.data[2] | 0;
            refundLevel = update.data[3] | 0;
            refundFeeds = update.data[4] | 0;
            refundAbility = update.data.length > 5 ? update.data[5] | 0 : 0;
            refundBuff = 0;
            refundID = "G" + refundType;
            refundName = as3.str(CHAMPIONCAGE.GetGuardianProperty(refundID, refundLevel, "name"));
            refundHealth = CHAMPIONCAGE.GetGuardianProperty(refundID, refundLevel, "health") | 0;
            refundFeedtime = GLOBAL.Timestamp();
            if (CREATURES._guardian && CREATURES._guardian.graphic.parent == MAP._BUILDINGTOPS && !BYMConfig.instance.RENDERER_ON) {
                MAP._BUILDINGTOPS.removeChild(CREATURES._guardian.graphic);
            }
            if (Boolean(CREATURES._guardian) && CREATURES._guardian._creatureID == refundID) {
                CREATURES._guardian.clear();
            } else if (GLOBAL._bChamber) {
                if (Boolean(CREATURES._guardian) && CREATURES._guardian._creatureID != refundID) {
                    freezeChamp();
                }
                if (CHAMPIONCHAMBER.HasFrozen(refundType)) {
                    thawChamp(refundType);
                }
            }
            if (CREATURES._guardian) {
                CREATURES._guardian.modifyHealth(-Number.MIN_VALUE);
                CREATURES._guardian.tick(1);
                CREATURES.removeGuardianType(CREATURES._guardian._type);
            }
            if (GLOBAL._bCage) {
                if (refundLevel > 0) {
                    GLOBAL._bCage.SpawnGuardian(refundLevel, refundFeeds, refundFeedtime, refundType, refundHealth, refundName, refundBuff, refundAbility);
                }
                BASE.Save();
            }
        }
        return true;
    }

    public static Catchup(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        let _loc4_: any[] = null;
        let _loc5_: string = null;
        let _loc6_: boolean = false;
        let _loc7_: int = 0;
        let _loc8_: popup_helped = null;
        let _loc9_: any = null;
        if (!GLOBAL._save) {
            return;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        if (UPDATES._catchupList.length > 0) {
            _loc3_ = [];
            _loc4_ = [];
            (_loc8_ = new popup_helped()).tB.autoSize = TextFieldAutoSize.LEFT;
            _loc7_ = 0;
            _loc1_ = 0;
            while (_loc1_ < UPDATES._catchupList.length) {
                _loc6_ = false;
                _loc2_ = 0;
                while (_loc2_ < _loc3_.length) {
                    if (_loc3_[_loc2_][1] == UPDATES._catchupList[_loc1_][2]) {
                        _loc6_ = true;
                    }
                    _loc2_++;
                }
                if (!_loc6_) {
                    _loc3_.push([UPDATES._catchupList[_loc1_][1], UPDATES._catchupList[_loc1_][2]]);
                }
                _loc6_ = false;
                _loc2_ = 0;
                while (_loc2_ < _loc4_.length) {
                    if (_loc4_[_loc2_][1] == UPDATES._catchupList[_loc1_][3]) {
                        _loc6_ = true;
                    }
                    _loc2_++;
                }
                if (!_loc6_) {
                    _loc4_.push([0, UPDATES._catchupList[_loc1_][3]]);
                }
                _loc7_ = (_loc7_ + UPDATES._catchupList[_loc1_][4]) | 0;
                _loc1_++;
            }
            _loc9_ = KEYS.Get("pop_helped_1a");
            if (!GLOBAL._catchup) {
                if (_loc3_.length == 1) {
                    _loc9_ = " " + KEYS.Get("pop_helped_1b") + " ";
                }
                if (_loc3_.length > 1) {
                    _loc9_ = " " + KEYS.Get("pop_helped_1c") + " ";
                }
            }
            if (_loc3_.length == 1) {
                _loc8_.tA.htmlText = "<font size=\"14\"><b>" + KEYS.Get("pop_helped_title", { "v1": _loc3_[0][1] }) + "</b></font>";
                if (_loc4_.length > 1) {
                    _loc5_ = _loc3_[0][1] + _loc9_ + KEYS.Get("pop_helped_2a", { "v1": GLOBAL.Array2StringB(_loc4_) });
                } else {
                    _loc5_ = _loc3_[0][1] + _loc9_ + KEYS.Get("pop_helped_2b", { "v1": GLOBAL.Array2StringB(_loc4_) });
                }
                _loc5_ += ", <b>" + KEYS.Get("pop_helped_3a", { "v1": GLOBAL.ToTime(_loc7_, false, false) }) + "</b>";
                _loc8_.tB.htmlText = _loc5_;
                _loc8_.bPost.Setup(KEYS.Get("pop_helped_saythanks_btn", { "v1": _loc3_[0][1] }));
                _loc8_.bPost.addEventListener(MouseEvent.CLICK, UPDATES.GiveThanks(Number(_loc3_[0][0]), KEYS.Get("pop_helped_streamtitle"), KEYS.Get("pop_helped_pl_streambody", { "v1": _loc3_[0][1] }), "quests/build.v2.png"));
                _loc8_.bPost.Highlight = true;
            } else {
                _loc8_.tA.htmlText = "<font size=\"14\"><b>" + KEYS.Get("pop_helped_title_pl") + "</b></font>";
                _loc8_.tB.htmlText = KEYS.Get("pop_helped_pl_1a", { "v1": GLOBAL.Array2StringB(_loc3_), "v2": _loc9_, "v3": GLOBAL.Array2StringB(_loc4_), "v4": GLOBAL.ToTime(_loc7_, false, false) });
                _loc8_.bPost.SetupKey("pop_saythanks_btn");
                _loc8_.bPost.addEventListener(MouseEvent.CLICK, UPDATES.GiveThanks(0, KEYS.Get("pop_helped_streamtitle"), KEYS.Get("pop_helped_pl_streambody", { "v1": GLOBAL.Array2StringB(_loc3_) }), "quests/build.v2.png"));
                _loc8_.bPost.Highlight = true;
            }
            _loc8_.bPost.y = _loc8_.tB.height - 15;
            _loc8_.mcFrame.height = _loc8_.bPost.y + 110;
            (as3.as(_loc8_.mcFrame, frame)).Setup();
            POPUPS.Push(_loc8_, null, null, "", "build.v2.png");
            UPDATES._catchupList = [];
        }
    }

    public static GiveThanks(param1: number, param2: string, param3: string, param4: string): Function {
        let fbid: number = NaN;
        let messageA: string = null;
        let messageB: string = null;
        let image: string = null;
        fbid = param1;
        messageA = param2;
        messageB = param3;
        image = param4;
        return (param1: MouseEvent): void => {
            GLOBAL.CallJS("sendFeed", ["thanks", messageA, messageB, image, fbid]);
            POPUPS.Next();
        };
    }

    public static Create(param1: any[], param2: int = 0): void {
        if (BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        let _loc3_: int = BASE._loadedBaseID | 0;
        if (param2) {
            _loc3_ = param2;
        }
        UPDATES.CreateB(param1, _loc3_, UPDATES._lastUpdateID);
    }

    public static CreateB(param1: any[], param2: int, param3: number): void {
        let url: string = null;
        let loadVars: any[] = null;
        let isHelping: boolean = false;
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        let update: any[] = param1;
        let id: int = param2;
        let lastupdate: number = param3;
        handleLoadSuccessful = (param1: any): void => {
            if (param1.error == 0) {
                UPDATES.Process(as3.cast(param1.updates, Array));
            } else {
                LOGGER.Log("err", "UPDATES.Create: " + JSON.stringify(param1));
                GLOBAL.ErrorMessage("UPDATES.Create");
            }
        };
        handleLoadError = (param1: IOErrorEvent): void => {
            LOGGER.Log("err", "UPDATES.Create HTTP");
        };
        if (!GLOBAL._save) {
            return;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        if (!GLOBAL._openBase && TUTORIAL._stage < 200) {
            return;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL._friendCount == 0) {
            return;
        }
        update.splice(0, 0, GLOBAL.Timestamp());
        url = GLOBAL._baseURL;
        if (GLOBAL._baseURL2) {
            url = GLOBAL._baseURL2;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || GLOBAL.mode == GLOBAL.e_BASE_MODE.IHELP) {
            isHelping = true;
        }
        loadVars = [["baseid", id], ["data", JSON.stringify([update])], ["lastupdate", lastupdate], ["help", isHelping]];
        new URLLoaderApi().load(url + "saveupdate", loadVars, handleLoadSuccessful, handleLoadError);
    }

    public static GetBuilding(param1: int): BFOUNDATION {
        let _loc3_: BFOUNDATION = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._id == param1) {
                return _loc3_;
            }
        }
        return null;
    }
}
