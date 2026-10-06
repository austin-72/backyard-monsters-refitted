import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { ATTACK, BASE, BFOUNDATION, BUILDING14, BUILDING15, CREATURES, GLOBAL, ImageCache, InstanceManager, KEYS, MAPROOM_DESCENT, MapRoomManager, QUESTS, SecNum, TRIBES, com_monsters_maproom_advanced_MapRoom as MapRoom, popup_aibase_failure, popup_aibase_success } from "@game";

export class WMBASE extends ASObject {
    public static _popup: MovieClip = null;

    public static _bases: any[] = null;

    public static _descentBases: any[] = null;

    private static setupStatus: uint = 0;

    private static callbacks: any[] = [];

    public static _repairDelay: int = 7200;

    public static _startTime: number = NaN;

    private static repairing: boolean = false;

    public static _mc: MovieClip = null;

    public static _type: int = 0;

    public static _destroyed: boolean = false;

    private static juiceQ: int = 3;

    private static tick: number = 0;

    private static _descentMode: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc3_: int = 0;
        WMBASE._mc = null;
        WMBASE._destroyed = false;
        WMBASE._startTime = GLOBAL.Timestamp();
        WMBASE.repairing = true;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing != 1) {
                WMBASE.repairing = false;
            }
        }
        _loc3_ = 0;
        while (_loc3_ < 6) {
            GLOBAL._mapWidth = (GLOBAL._mapWidth * 1.1) | 0;
            GLOBAL._mapHeight = (GLOBAL._mapHeight * 1.1) | 0;
            GLOBAL._mapWidth = (Math.ceil(GLOBAL._mapWidth / 20) * 20) | 0;
            GLOBAL._mapHeight = (Math.ceil(GLOBAL._mapHeight / 20) * 20) | 0;
            _loc3_++;
        }
        if (BASE.usesInfernoBackend && BASE._wmID || GLOBAL.InfernoMode(GLOBAL._loadmode)) {
            return;
        }
        let _loc4_: any = null;
        if (Boolean(_loc4_ = TRIBES.TribeForBaseID(BASE._wmID)) && _loc4_.behaviour == "juice") {
            GLOBAL._hatcheryOverdrivePower = new SecNum(10);
        }
    }

    public static Clear(): void {
        WMBASE._bases = [];
        WMBASE._destroyed = false;
        WMBASE._descentMode = false;
    }

    public static Data(param1: any[]): void {
        let _loc2_: any[] = null;
        let _loc3_: any = null;
        WMBASE._descentMode = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && Boolean(param1)) {
            WMBASE._bases = [];
            for (_loc2_ of as3.values(param1)) {
                _loc3_ = {};
                _loc3_.baseid = _loc2_[0];
                _loc3_.tribe = TRIBES.TribeForBaseID(_loc2_[0] | 0);
                _loc3_.level = _loc2_[1];
                _loc3_.destroyed = _loc2_[2];
                WMBASE._bases.push(_loc3_);
            }
            as3.sortOn(WMBASE._bases, "level", Array.NUMERIC);
            WMBASE.CheckQuests();
        }
    }

    public static DescentData(param1: any[]): void {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        let _loc4_: any = null;
        WMBASE._descentMode = true;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && Boolean(param1)) {
            _loc2_ = 1;
            WMBASE._descentBases = [];
            for (_loc3_ of as3.values(param1)) {
                (_loc4_ = {}).baseid = _loc3_[0];
                _loc4_.tribe = MAPROOM_DESCENT._descentTribe;
                _loc4_.level = _loc3_[1];
                _loc4_.destroyed = _loc3_[2];
                WMBASE._descentBases.push(_loc4_);
                if (_loc4_.destroyed == 1) {
                    _loc2_++;
                }
            }
            as3.sortOn(WMBASE._descentBases, "level", Array.NUMERIC);
            GLOBAL.StatSet("descentLvl", _loc2_);
            MAPROOM_DESCENT._descentLvl = _loc2_;
        }
    }

    public static AttackerForType(param1: int): any {
        let _loc3_: any = null;
        let _loc2_: any[] = WMBASE.ChooseBase();
        for (_loc3_ of as3.values(_loc2_)) {
            if (_loc3_.tribe.type == param1) {
                return _loc3_.tribe;
            }
        }
        return {};
    }

    public static TypeForAttackerName(param1: string): int {
        return 0;
    }

    public static Tick(): void {
        let _loc1_: Vector<any> = null;
        let _loc2_: BFOUNDATION = null;
        if (!WMBASE.repairing) {
            if (GLOBAL.Timestamp() > WMBASE._startTime + WMBASE._repairDelay) {
                _loc1_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                for (_loc2_ of (_loc1_ ?? [])) {
                    if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing == 0) {
                        _loc2_.Repair();
                    }
                }
                WMBASE.repairing = true;
            }
        }
        if (!GLOBAL._catchup && Boolean(GLOBAL._bJuicer)) {
            if (WMBASE.tick % WMBASE.juiceQ == 0 && TRIBES.TribeForBaseID(BASE._wmID).behaviour == "juice" && GLOBAL._bJuicer.health > 0.5 * GLOBAL._bJuicer.maxHealth && GLOBAL.townHall.health > 0) {
                if (!_loc1_) {
                    _loc1_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                }
                for (_loc2_ of (_loc1_ ?? [])) {
                    if (_loc2_._type == 13 && _loc2_._canFunction && _loc2_._inProduction != "C1") {
                        _loc2_._inProduction = "C1";
                        _loc2_._productionStage.Set(3);
                    }
                }
            }
            ++WMBASE.tick;
        }
    }

    public static ResetAll(): void {
        let _loc1_: any = null;
        for (_loc1_ of as3.values(WMBASE._bases)) {
            _loc1_.destroyed = 0;
        }
        for (_loc1_ of as3.values(WMBASE._descentBases)) {
            _loc1_.destroyed = 0;
        }
    }

    public static DestroyAllDescent(): void {
        let _loc1_: any = null;
        for (_loc1_ of as3.values(WMBASE._descentBases)) {
            _loc1_.destroyed = 1;
        }
    }

    public static JuiceOne(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: any = undefined;
        let _loc1_: any[] = [];
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            _loc1_.push(_loc3_);
        }
        _loc5_ = GLOBAL.player.monsterList.length | 0;
        _loc6_ = 0;
        while (_loc6_ < _loc5_) {
            if (as3.vget(GLOBAL.player.monsterList, _loc6_).numCreeps > 0) {
                _loc4_ = as3.vget(GLOBAL.player.monsterList, _loc6_).m_creatureID;
            }
            _loc6_++;
        }
        if (_loc4_ && GLOBAL._bJuicer && GLOBAL._bJuicer.health > 0.5 * GLOBAL._bJuicer.maxHealth) {
            GLOBAL.player.monsterListByID(_loc4_).add(-1);
            for (_loc7_ of as3.values(CREATURES._creatures)) {
                if (_loc7_._creatureID == _loc4_ && _loc7_._behaviour != "juice") {
                    _loc7_.ModeJuice();
                    return;
                }
            }
        }
    }

    public static CheckQuests(): void {
        let base: string = null;
        let index: int = 0;
        let bases: any[] = WMBASE.ChooseBase();
        for (base in bases) {
            if (bases[base].destroyed == 1) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    index = 0;
                    // Comment: Added this null check, since it could try to access a non-existent tribe
                    if (bases[base].tribe && bases[base].tribe.id !== undefined) {
                        index = bases[base].tribe.id | 0;
                    }
                    QUESTS.Check("destroy_tribe" + index, 1);
                }
            }
        }
    }

    public static CheckDescentProgress(): int {
        let _loc2_: string = null;
        let _loc1_: int = 1;
        if (WMBASE._descentBases) {
            for (_loc2_ in WMBASE._descentBases) {
                if (WMBASE._descentBases[_loc2_].destroyed == 1) {
                    _loc1_++;
                }
            }
        }
        return _loc1_;
    }

    public static Export(): any {
        return WMBASE.ChooseBase();
    }

    public static TownHallDestroyed(): void {
        let onImage: Function = null;
        let shareDown: Function = null;
        if (MapRoomManager.instance.isInMapRoom2or3 && !BASE.usesInfernoBackend) {
            GLOBAL.Message(KEYS.Get("msg_yarddestroyed"), KEYS.Get("btn_showmap"), WMBASE.ShowMapAgain);
            if (MapRoomManager.instance.isInMapRoom2) {
                MapRoom.ShowInfoEnemy(GLOBAL._currentCell);
            }
        } else {
            onImage = (param1: string, param2: BitmapData): void => {
                let _loc3_: Bitmap = new Bitmap(param2);
                _loc3_.x = 155;
                _loc3_.y = 196;
                WMBASE._mc.addChild(_loc3_);
            };
            shareDown = (param1: MouseEvent = null): void => {
                let _loc2_: any = TRIBES.TribeForBaseID(BASE._wmID);
                GLOBAL.CallJS("sendFeed", ["aibaseDestroyed", _loc2_.succ_stream, _loc2_.succ, _loc2_.streampostpic]);
            };
            WMBASE._mc = as3.as(new popup_aibase_success(), MovieClip);
            WMBASE._mc.Resize = (): void => {
                WMBASE._mc.x = 0;
                WMBASE._mc.y = 0;
            };
            WMBASE._mc.body_txt.htmlText = WMBASE.BaseForID(BASE._wmID).tribe.succ;
            WMBASE._mc.b2.SetupKey("btn_brag");
            WMBASE._mc.b2.Highlight = true;
            WMBASE._mc.title_txt.htmlText = KEYS.Get("aibase_victory_title");
            WMBASE._mc.headline_txt.htmlText = "<b>" + KEYS.Get("aibase_victory_headline") + "</b>";
            ImageCache.GetImageWithCallBack(as3.str(WMBASE.BaseForID(BASE._wmID).tribe.splash), onImage);
            WMBASE._mc.b2.addEventListener(MouseEvent.MOUSE_DOWN, shareDown);
            WMBASE._destroyed = true;
            if (MapRoomManager.instance.isInMapRoom2or3 && !BASE.usesInfernoBackend) {
                WMBASE._mc.b1.SetupKey("btn_openmap");
            } else {
                WMBASE._mc.b1.SetupKey("btn_returnhome");
            }
            WMBASE._mc.b1.addEventListener(MouseEvent.MOUSE_DOWN, WMBASE.skipDown);
            GLOBAL._layerWindows.addChild(WMBASE._mc);
        }
    }

    private static BaseForID(param1: int): any {
        let _loc3_: any = null;
        let _loc2_: any[] = WMBASE.ChooseBase();
        for (_loc3_ of as3.values(_loc2_)) {
            if (_loc3_.baseid == param1) {
                return _loc3_;
            }
        }
        return {};
    }

    private static skipDown(param1: MouseEvent = null): void {
        if (Boolean(WMBASE._mc) && Boolean(WMBASE._mc.parent)) {
            WMBASE._mc.parent.removeChild(WMBASE._mc);
        }
        WMBASE._mc = null;
        ATTACK.End();
    }

    public static End(): void {
        let _loc1_: Vector<any> = null;
        let _loc2_: BUILDING14 = null;
        if (!GLOBAL._catchup && GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            _loc1_ = InstanceManager.getInstancesByClass(BUILDING14);
            for (_loc2_ of (_loc1_ ?? [])) {
                if (_loc2_.health == 0 && _loc2_._repairing == 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    WMBASE.TownHallDestroyed();
                    return;
                }
            }
        }
        WMBASE.AttackFailed();
    }

    public static AttackFailed(): void {
        let onImage: Function = null;
        let base: any = null;
        if (MapRoomManager.instance.isInMapRoom2or3 && !BASE.usesInfernoBackend) {
            GLOBAL.Message(KEYS.Get("msg_notdestroyed"), KEYS.Get("btn_showmap"), WMBASE.ShowMapAgain);
        } else {
            WMBASE._mc = as3.as(new popup_aibase_failure(), MovieClip);
            WMBASE._mc.Resize = (): void => {
                WMBASE._mc.x = 0;
                WMBASE._mc.y = 0;
            };
            WMBASE._mc.title_txt.htmlText = KEYS.Get("aibase_defeat_title");
            WMBASE._mc.headline_txt.htmlText = "<b>" + KEYS.Get("aibase_defeat_headline") + "</b>";
            base = WMBASE.BaseForID(BASE._wmID);
            if (base.tribe) {
                onImage = (param1: string, param2: BitmapData): void => {
                    let _loc3_: Bitmap = new Bitmap(param2);
                    _loc3_.x = 155;
                    _loc3_.y = 196;
                    if (Boolean(WMBASE._mc) && Boolean(WMBASE._mc.parent)) {
                        WMBASE._mc.addChild(_loc3_);
                    }
                };
                ImageCache.GetImageWithCallBack(as3.str(base.tribe.splash), onImage);
                WMBASE._mc.body_txt.htmlText = WMBASE.BaseForID(BASE._wmID).tribe.fail;
            }
            if (MapRoomManager.instance.isInMapRoom2or3 && !BASE.usesInfernoBackend) {
                WMBASE._mc.b1.SetupKey("btn_openmap");
            } else {
                WMBASE._mc.b1.SetupKey("btn_returnhome");
            }
            WMBASE._mc.b1.addEventListener(MouseEvent.MOUSE_DOWN, WMBASE.skipDown);
            GLOBAL._layerWindows.addChild(WMBASE._mc);
        }
        WMBASE._destroyed = false;
    }

    public static ShowMapAgain(): void {
        ATTACK.EndB();
    }

    private static ChooseBase(): any[] {
        let _loc1_: any[] = null;
        if (WMBASE._descentMode) {
            _loc1_ = WMBASE._descentBases;
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc1_ = WMBASE._bases;
        } else {
            _loc1_ = WMBASE._bases;
        }
        return _loc1_;
    }
}
