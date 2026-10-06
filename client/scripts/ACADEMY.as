package {
    import com.cc.utils.SecNum;
    import com.monsters.managers.InstanceManager;
    import flash.events.MouseEvent;

    public class ACADEMY {

        public static const ID:int = 26;

        public static var _building:BFOUNDATION = null;

        public static var _mc:ACADEMYPOPUP = null;

        public static var _monsterID:String;

        public static var _open:Boolean = false;

        private static var _monsterString:String = "C";

        private static var _maxMonsters:int = 16;

        private static const _infernoFrameOffset:int = 6;

        private static const _yardMaxMonsters:int = 16;

        private static const _infernoMaxMonsters:int = 9;

        public function ACADEMY() {
            super();
        }

        public static function Show(param1:BFOUNDATION):void {
            if (!_open) {
                _open = true;
                _building = param1;
                GLOBAL.BlockerAdd();
                _mc = GLOBAL._layerWindows.addChild(new ACADEMYPOPUP()) as ACADEMYPOPUP;
                _mc.Center();
                _mc.ScaleUp();
            }
        }

        public static function Hide(param1:MouseEvent = null):void {
            if (_open) {
                GLOBAL.BlockerRemove();
                SOUNDS.Play("close");
                BASE.BuildingDeselect();
                _open = false;
                GLOBAL._layerWindows.removeChild(_mc);
                _mc = null;
            }
        }

        public static function StartMonsterUpgrade(param1:String, param2:Boolean = false):Object {
            var _loc6_:Array = null;
            if (!GLOBAL.player.m_upgrades[param1]) {
                GLOBAL.player.m_upgrades[param1] = {"level": 1};
            }
            var _loc3_:Boolean = false;
            var _loc4_:String = "";
            var _loc5_:String = KEYS.Get("acad_status_level", {"v1": GLOBAL.player.m_upgrades[param1].level});
            // Inferno-only: a training under way that no Academy claims (its mark was lost) is this one's, so it
            // counts as busy. Each Academy still trains its own monster: two Academies, two trainings.
            if (GLOBAL.INFERNO_ONLY && Boolean(_building) && !_building._upgrading && ioUnclaimedTraining() != null) {
                _building._upgrading = ioUnclaimedTraining();
            }
            // Inferno-only: nor while the Academy itself is being built or upgraded
            if (GLOBAL.INFERNO_ONLY && Boolean(_building) && !_building._upgrading && _building._countdownBuild.Get() + _building._countdownUpgrade.Get() > 0) {
                return {
                        "error": true,
                        "errorMessage": KEYS.Get("io_acad_err_upgrading"),
                        "status": KEYS.Get("io_acad_err_upgrading")
                    };
            }
            if (Boolean(_building) && !_building._upgrading) {
                if (!GLOBAL.player.m_upgrades[param1].time) {
                    if (Boolean(CREATURELOCKER._lockerData[param1]) && CREATURELOCKER._lockerData[param1].t == 2) {
                        if (GLOBAL.player.m_upgrades[param1].level < CREATURELOCKER._creatures[param1].trainingCosts.length + 1) {
                            // Inferno-only: the 5th academy level trains to level 6: Korath, Drull and Rezghul, and
                            // (3 October) every other Inferno monster with its five training steps (ioReachesLevel6).
                            if ((GLOBAL.player.m_upgrades[param1].level <= _building._lvl.Get() || GLOBAL.ioTestMode()) && !(GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost && GLOBAL.player.m_upgrades[param1].level >= 5 && !CREATURELOCKER.ioReachesLevel6(param1))) {
                                _loc6_ = CREATURELOCKER._creatures[param1].trainingCosts[GLOBAL.player.m_upgrades[param1].level - 1];
                                if (BASE.Charge(3, _loc6_[0], true) > 0) {
                                    if (!param2) {
                                        BASE.Charge(3, _loc6_[0]);
                                        // Admin test mode: trained at once (done on the next tick).
                                        GLOBAL.player.m_upgrades[param1].time = new SecNum(GLOBAL.Timestamp() + (GLOBAL.ioTestMode() ? 0 : _loc6_[1]));
                                        GLOBAL.player.m_upgrades[param1].duration = _loc6_[1];
                                        _building._upgrading = param1;
                                        BASE.Save();
                                        LOGGER.Stat([11, int(param1.substr(1)), GLOBAL.player.m_upgrades[param1].level + 1]);
                                    }
                                }
                                else {
                                    _loc3_ = true;
                                    _loc4_ = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("acad_err_sulfur") : KEYS.Get("acad_err_putty");
                                    _loc5_ = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("acad_err_sulfur") : KEYS.Get("acad_err_putty");
                                }
                            }
                            else {
                                _loc3_ = true;
                                _loc4_ = KEYS.Get("acad_err_upgrade");
                                _loc5_ = KEYS.Get("acad_err_upgrade");
                                // (Inferno-only: every monster goes to 6 now, so 5 is "train the Academy first")
                                if (BASE.isInfernoMainYardOrOutpost && GLOBAL.player.m_upgrades[param1].level >= (GLOBAL.INFERNO_ONLY && CREATURELOCKER.ioReachesLevel6(param1) ? 6 : 5)) {
                                    _loc3_ = true;
                                    _loc4_ = KEYS.Get("acad_err_fullytrained");
                                    _loc5_ = KEYS.Get("acad_err_lfullytrained", {"v1": GLOBAL.player.m_upgrades[param1].level});
                                }
                            }
                        }
                        else {
                            _loc3_ = true;
                            _loc4_ = KEYS.Get("acad_err_fullytrained");
                            _loc5_ = KEYS.Get("acad_err_lfullytrained", {"v1": GLOBAL.player.m_upgrades[param1].level});
                        }
                    }
                    else {
                        _loc3_ = true;
                        _loc4_ = KEYS.Get("acad_err_locked");
                        _loc5_ = KEYS.Get("acad_err_locked");
                    }
                }
                else {
                    _loc3_ = true;
                    _loc4_ = KEYS.Get("acad_err_training", {"v1": GLOBAL.player.m_upgrades[param1].level + 1});
                    _loc5_ = KEYS.Get("acad_err_trainingstatus", {
                                "v1": GLOBAL.player.m_upgrades[param1].level + 1,
                                "v2": GLOBAL.ToTime(GLOBAL.player.m_upgrades[param1].time.Get() - GLOBAL.Timestamp())
                            });
                }
            }
            else {
                _loc3_ = true;
                _loc4_ = KEYS.Get("acad_err_busy");
                if (GLOBAL.player.m_upgrades[param1].time) {
                    _loc5_ = KEYS.Get("acad_err_trainingstatus", {
                                "v1": GLOBAL.player.m_upgrades[param1].level + 1,
                                "v2": GLOBAL.ToTime(GLOBAL.player.m_upgrades[param1].time.Get() - GLOBAL.Timestamp())
                            });
                }
            }
            return {
                    "error": _loc3_,
                    "errorMessage": _loc4_,
                    "status": _loc5_
                };
        }

        public static function CancelMonsterUpgrade(param1:String):void {
            var _loc3_:BUILDING26 = null;
            // Inferno-only: a cancel of a training that isn't running (answered twice, or finished meanwhile)
            // refunded the sulfur again
            if (GLOBAL.INFERNO_ONLY && !(GLOBAL.player.m_upgrades[param1] && GLOBAL.player.m_upgrades[param1].time)) {
                Update();
                return;
            }
            delete GLOBAL.player.m_upgrades[param1].time;
            delete GLOBAL.player.m_upgrades[param1].duration;
            var _loc2_:Vector.<Object> = InstanceManager.getInstancesByClass(BUILDING26);
            for each (_loc3_ in _loc2_) {
                if (_loc3_._upgrading == param1) {
                    _loc3_._upgrading = null;
                    break;
                }
            }
            BASE.Fund(3, CREATURELOCKER._creatures[param1].trainingCosts[GLOBAL.player.m_upgrades[param1].level - 1][0]);
            BASE.Save();
        }

        public static function FinishMonsterUpgrade(param1:String):void {
            var stat:Array;
            var academyInstances:Vector.<Object>;
            var Post:Function;
            var academy:BUILDING26 = null;
            var bragImage:String = null;
            var monsterName:String = null;
            var popupMC:popup_monster = null;
            var monsterID:String = param1;
            delete GLOBAL.player.m_upgrades[monsterID].time;
            delete GLOBAL.player.m_upgrades[monsterID].duration;
            ++GLOBAL.player.m_upgrades[monsterID].level;
            if (GLOBAL.player.monsterListByID(monsterID)) {
                GLOBAL.player.monsterListByID(monsterID).level = GLOBAL.player.m_upgrades[monsterID].level;
            }
            stat = CREATURELOCKER._creatures[monsterID].props.cResource;
            if (Boolean(stat) && GLOBAL.player.m_upgrades[monsterID].level == stat.length - 1) {
                LOGGER.KongStat([5, monsterID.substr(1)]);
            }
            academyInstances = InstanceManager.getInstancesByClass(BUILDING26);
            for each (academy in academyInstances) {
                if (academy._upgrading == monsterID) {
                    academy._upgrading = null;
                    break;
                }
            }
            LOGGER.Stat([12, monsterID.substr(monsterID.indexOf("C") + 1), GLOBAL.player.m_upgrades[monsterID].level]);
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                Post = function():void {
                    if (BASE.isInfernoMainYardOrOutpost) {
                        GLOBAL.CallJS("sendFeed", ["academy-training", KEYS.Get("acad_stream_title_inf", {
                                            "v1": monsterName,
                                            "v2": GLOBAL.player.m_upgrades[monsterID].level
                                        }), KEYS.Get("acad_stream_description"), bragImage, 0]);
                    }
                    else {
                        GLOBAL.CallJS("sendFeed", ["academy-training", KEYS.Get("acad_stream_title", {
                                            "v1": monsterName,
                                            "v2": GLOBAL.player.m_upgrades[monsterID].level
                                        }), KEYS.Get("acad_stream_description"), bragImage, 0]);
                    }
                    POPUPS.Next();
                };
                if (CREATURELOCKER._creatures[monsterID].stream[2]) {
                    bragImage = String(CREATURELOCKER._creatures[monsterID].stream[2]);
                }
                monsterName = KEYS.Get(CREATURELOCKER._creatures[monsterID].name);
                popupMC = new popup_monster();
                popupMC.tText.htmlText = KEYS.Get("acad_pop_complete", {"v1": monsterName});
                popupMC.bAction.SetupKey("btn_warnyourfriends");
                popupMC.bAction.addEventListener(MouseEvent.CLICK, Post);
                popupMC.bAction.Highlight = true;
                popupMC.bSpeedup.visible = false;
                POPUPS.Push(popupMC, null, null, null, "" + monsterID + "-150.png");
            }
        }

        public static function Tick():void {
            var _loc1_:String = null;
            var _loc2_:Object = null;
            for (_loc1_ in GLOBAL.player.m_upgrades) {
                _loc2_ = GLOBAL.player.m_upgrades[_loc1_];
                if (_loc2_.time != null) {
                    if (GLOBAL.player.m_upgrades[_loc1_].time.Get() <= GLOBAL.Timestamp()) {
                        FinishMonsterUpgrade(_loc1_);
                    }
                }
            }
            if (GLOBAL.INFERNO_ONLY) {
                ioReconcile();
            }
            Update();
        }

        /* Inferno-only: is this monster training (its training time set)? */
        private static function ioIsTraining(param1:String):Boolean {
            return Boolean(param1) && Boolean(GLOBAL.player.m_upgrades[param1]) && GLOBAL.player.m_upgrades[param1].time != null;
        }

        /* Inferno-only: a monster training (training time set) that no Academy in the yard has as its mark, or
         * null. Normally there is none: every training is started by an Academy, which keeps it as its mark. */
        public static function ioUnclaimedTraining():String {
            var id:String = null;
            var academy:BUILDING26 = null;
            var claimed:Boolean = false;
            for (id in GLOBAL.player.m_upgrades) {
                if (!ioIsTraining(id) || !CREATURELOCKER._creatures[id]) {
                    continue;
                }
                claimed = false;
                for each (academy in InstanceManager.getInstancesByClass(BUILDING26)) {
                    if (academy._upgrading == id) {
                        claimed = true;
                        break;
                    }
                }
                if (!claimed) {
                    return id;
                }
            }
            return null;
        }

        /* Inferno-only: is this Academy training? Its mark, if that monster is still training; or, with no mark,
         * a training no Academy claims (it gets that mark on the next tick). */
        public static function ioAcademyBusy(param1:BFOUNDATION):Boolean {
            if (param1._upgrading) {
                return ioIsTraining(param1._upgrading);
            }
            return ioUnclaimedTraining() != null;
        }

        /* Inferno-only: keeps each Academy's "training" mark (its `_upgrading`, saved with the building) and
         * ACADEMY._monsterID (what Speed Up acts on) in line with the training times, once a second. Each
         * Academy trains one monster at a time, so two Academies (allowed from Under Hall 4) train two. The mark
         * is what keeps a second training from starting in the same Academy, the Academy from being upgraded and
         * its animation going: a training whose mark was lost (a save that kept one but not the other) let all
         * three happen, and a mark left after the training ended kept the Academy busy and Speed Up pointing at
         * a finished training. A lost mark goes to an Academy that has none. */
        private static function ioReconcile():void {
            var academy:BUILDING26 = null;
            var seen:Object = {};
            var unclaimed:String = null;
            for each (academy in InstanceManager.getInstancesByClass(BUILDING26)) {
                if (academy._upgrading && (!ioIsTraining(academy._upgrading) || seen[academy._upgrading])) {
                    academy._upgrading = null;
                }
                if (academy._upgrading) {
                    seen[academy._upgrading] = true;
                }
            }
            for each (academy in InstanceManager.getInstancesByClass(BUILDING26)) {
                if (!academy._upgrading) {
                    unclaimed = ioUnclaimedTraining();
                    if (unclaimed == null) {
                        break;
                    }
                    academy._upgrading = unclaimed;
                }
            }
            if (_monsterID && !ioIsTraining(_monsterID)) {
                _monsterID = null;
            }
        }

        public static function Update():void {
            if (_mc) {
                _mc.Update();
            }
        }
    }
}
