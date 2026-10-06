package {
    import flash.display.Graphics;
    import com.monsters.display.IoLockIcon;
    import com.monsters.display.ImageCache;
    import com.monsters.display.ScrollSet;
    import com.monsters.managers.InstanceManager;
    import com.monsters.subscriptions.SubscriptionHandler;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.MovieClip;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.geom.Point;
    import gs.TweenLite;
    import gs.easing.Circ;

    public class HATCHERYCCPOPUP extends HATCHERYCCPOPUP_CLIP {

        private var _tick:int = 0;

        private var _monsterID:String = "";

        private var _monsterIndex:int = 0;

        private var _scrollSet:ScrollSet;

        private var _scrollSetContainer:Sprite;

        public var _monsterSlots:Array;

        public var _guidePage:int = 1;

        /** Inferno-only: the monster list's columns (the art has room for five). */
        private static const IO_COLUMNS:int = 4;

        /** One column: an icon (66) and the gap (5). */
        private static const IO_COLUMN:int = 71;

        /**
         * Inferno-only (the user's, 29 September): the monster list four across instead of five, and the stats and
         * the description moved left into the room that frees, the description a column wider, so it is no longer
         * cut off. The art's divider between list and stats is painted over and drawn again at the new edge.
         */
        private function ioNarrowList():void {
            var cut:int = (5 - IO_COLUMNS) * IO_COLUMN;
            var oldEdge:Number = monsterMask.x + monsterMask.width;
            monsterMask.width -= cut;
            scroller.x -= cut;
            var edge:Number = oldEdge - cut;
            var paint:Shape = new Shape();
            paint.graphics.beginFill(0xE3D7CA);
            paint.graphics.drawRect(edge, monsterMask.y, cut + 4, monsterMask.height + 2);
            paint.graphics.endFill();
            paint.graphics.lineStyle(1, 0xB1A89B);
            paint.graphics.moveTo(edge, monsterMask.y);
            paint.graphics.lineTo(edge, monsterMask.y + monsterMask.height + 1);
            addChildAt(paint, getChildIndex(monsterMask));
            mcMonsterInfo.x -= cut;
            mcMonsterInfo.tDescription.width += cut;
        }

        public function HATCHERYCCPOPUP() {
            var _loc1_:String = null;
            var _loc5_:int = 0;
            var _loc7_:Array = null;
            var _loc9_:int = 0;
            var _loc10_:MovieClip = null;
            var _loc11_:MovieClip = null;
            var _loc12_:MovieClip = null;
            super();
            this.setupSubscriptions(HATCHERYCC.queueLimit > HATCHERYCC.DEFAULT_QUEUE_LIMIT);
            bSpeedup.tName.htmlText = "<b>" + KEYS.Get("btn_speedup") + "</b>";
            bSpeedup.mouseChildren = false;
            if (!BASE.isInfernoMainYardOrOutpost) {
                bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HOD", "HOD2", "HOD3"]));
            }
            else {
                bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HODI", "HOD2I", "HOD3I"]));
            }
            bSpeedup.buttonMode = true;
            bFinish.tName.htmlText = "<b>" + KEYS.Get("str_finishnow") + "</b>";
            bFinish.mouseChildren = false;
            bFinish.addEventListener(MouseEvent.CLICK, this.FinishNow);
            bFinish.buttonMode = true;
            bTopup.tName.htmlText = "<b>" + KEYS.Get("btn_topup2") + "</b>";
            bTopup.mouseChildren = false;
            if (!BASE.isInfernoMainYardOrOutpost) {
                bTopup.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41", "BR42", "BR43"]));
            }
            else {
                bTopup.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41I", "BR42I", "BR43I"]));
            }
            bTopup.buttonMode = true;
            if (GLOBAL.INFERNO_ONLY) {
                this.ioNarrowList();
            }
            this._scrollSet = new ScrollSet();
            this._scrollSet.x = scroller.x;
            this._scrollSet.y = scroller.y;
            this._scrollSet.width = scroller.width;
            this._scrollSet.Init(monsterCanvas, monsterMask, ScrollSet.BROWN, monsterMask.y, monsterMask.height, 20, 10);
            this._scrollSet.AutoHideEnabled = false;
            this._scrollSet.isHiddenWhileUnnecessary = true;
            this._scrollSetContainer = new Sprite();
            this._scrollSetContainer.addChild(this._scrollSet);
            addChild(this._scrollSetContainer);
            scroller.visible = false;
            var _loc2_:int = 0;
            var _loc3_:int = 0;
            var _loc4_:Point = new Point(10, 14);
            _loc5_ = GLOBAL.INFERNO_ONLY ? IO_COLUMNS : 5;
            var _loc6_:int = 5;
            this._monsterSlots = [];
            _loc7_ = CREATURELOCKER.GetSortedCreatures(true);
            var _loc8_:int = !BASE.isInfernoMainYardOrOutpost ? CREATURELOCKER.maxCreatures("above") : CREATURELOCKER.maxCreatures("inferno");
            if (!BASE.isInfernoMainYardOrOutpost && HATCHERYCC.doesShowInfernoCreeps) {
                _loc8_ = CREATURELOCKER.maxCreatures();
            }
            _loc9_ = 0;
            while (_loc9_ < _loc7_.length) {
                _loc1_ = String(_loc7_[_loc9_].id);
                if (CREATURELOCKER._creatures && CREATURELOCKER._creatures[_loc1_] && CREATURELOCKER._creatures[_loc1_].blocked == true) {
                    _loc3_++;
                }
                else {
                    (_loc10_ = new HatcheryCCMonsterIcon_CLIP()).id = _loc1_;
                    _loc10_.x = _loc4_.x + _loc2_ % _loc5_ * (_loc10_.mcMonster.width + _loc6_);
                    _loc10_.y = _loc4_.y + Math.floor(_loc2_ / _loc5_) * (_loc10_.mcMonster.height + _loc6_);
                    (_loc11_ = _loc10_.mcMonster).addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(_loc7_[_loc9_].id));
                    monsterCanvas.addChild(_loc10_);
                    this._monsterSlots.push(_loc10_);
                    _loc11_.addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(_loc7_[_loc9_].id));
                    _loc11_.addEventListener(MouseEvent.MOUSE_DOWN, this.QueueAdd(_loc7_[_loc9_].id));
                    _loc11_.buttonMode = true;
                    ImageCache.GetImageWithCallBack("monsters/" + _loc1_ + "-medium.jpg", this.MonsterIconLoaded, true, 1, "", [_loc11_]);
                    _loc12_ = _loc10_.mcLevel;
                    if (Boolean(GLOBAL.player.m_upgrades[_loc1_]) && GLOBAL.player.m_upgrades[_loc1_].level > 1) {
                        _loc12_.visible = true;
                        _loc12_.tLevel.htmlText = "<b>" + GLOBAL.player.m_upgrades[_loc1_].level + "</b>";
                    }
                    else {
                        _loc12_.visible = false;
                    }
                    if (!(Boolean(CREATURELOCKER._lockerData[_loc1_]) && CREATURELOCKER._lockerData[_loc1_].t == 2)) {
                        _loc11_.alpha = 0.75;
                        _loc12_.visible = false;
                        if (GLOBAL.INFERNO_ONLY) {
                            IoLockIcon.mark(_loc11_, true);
                        }
                    }
                    _loc2_++;
                }
                _loc9_++;
            }
            _loc9_ = 1;
            while (_loc9_ <= 5) {
                this["hatchery" + _loc9_].gotoAndStop("idle");
                this["hatcheryRemove" + _loc9_].visible = false;
                this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(this["hatcheryRemove" + _loc9_]));
                this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(this["hatcheryRemove" + _loc9_]));
                this["hatchery" + _loc9_].addEventListener(MouseEvent.MOUSE_DOWN, this.StopProduction(_loc9_));
                this["hatchery" + _loc9_].buttonMode = true;
                _loc9_++;
            }
            title_txt.htmlText = KEYS.Get("hcc_title");
            mcMonsterInfo.speed_txt.htmlText = "<b>" + KEYS.Get("mon_att_speed") + "</b>";
            mcMonsterInfo.health_txt.htmlText = "<b>" + KEYS.Get("mon_att_health") + "</b>";
            mcMonsterInfo.damage_txt.htmlText = "<b>" + KEYS.Get("mon_att_damage") + "</b>";
            mcMonsterInfo.goo_txt.htmlText = "<b>" + KEYS.Get("mon_att_cost", {"v1": KEYS.Get(BRESOURCE.GetResourceNameKey(3))}) + "</b>";
            mcMonsterInfo.housing_txt.htmlText = "<b>" + KEYS.Get("mon_att_housing") + "</b>";
            mcMonsterInfo.time_txt.htmlText = "<b>" + KEYS.Get("mon_att_time") + "</b>";
            hatlabel1_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", {"v1": 1}) + "</b>";
            hatlabel2_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", {"v1": 2}) + "</b>";
            hatlabel3_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", {"v1": 3}) + "</b>";
            hatlabel4_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", {"v1": 4}) + "</b>";
            hatlabel5_txt.htmlText = "<b>" + KEYS.Get("hcc_hatcherynum", {"v1": 5}) + "</b>";
            tHousingLabel.htmlText = "<b>" + KEYS.Get("hcc_housingspace") + "</b>";
            tGooLabel.htmlText = "<b>" + KEYS.Get("hcc_goousage") + "</b>";
            addEventListener(MouseEvent.MOUSE_UP, this.ClearEvents);
            (this.mcFrame as frame).Setup(true, null);
        }

        protected function setupSubscriptions(param1:Boolean):void {
            if (param1) {
                gotoAndStop("v1");
                mcSlotsGoldFrame.visible = true;
                mcSlotsGoldFrame.mouseEnabled = false;
                if (HATCHERYCC.doesShowInfernoCreeps) {
                    gotoAndStop("v2");
                    tMagmaLabel.htmlText = "<b>" + KEYS.Get("hcc_magmausage") + "</b>";
                    bTopupMagma.tName.htmlText = "<b>" + KEYS.Get("btn_topup2") + "</b>";
                    bTopupMagma.buttonMode = true;
                    bTopupMagma.gotoAndStop(1);
                    bTopupMagma.addEventListener(MouseEvent.CLICK, STORE.Show(2, 4, ["BR41I", "BR42I", "BR43I"]));
                }
            }
            else {
                gotoAndStop("v1");
                mcSlotsGoldFrame.visible = false;
            }
        }

        public function IconLoaded(param1:String, param2:BitmapData, param3:Array = null):void {
            var _loc4_:Bitmap;
            (_loc4_ = new Bitmap(param2)).smoothing = true;
            if (GLOBAL.INFERNO_ONLY) {
                // (Inferno-only: the picture before is taken away; they piled up at every redraw)
                while (this[param3[0] + param3[1]].mcImage.numChildren > 0) {
                    this[param3[0] + param3[1]].mcImage.removeChildAt(0);
                }
            }
            this[param3[0] + param3[1]].mcImage.addChild(_loc4_);
            this[param3[0] + param3[1]].mcImage.visible = true;
            this[param3[0] + param3[1]].mcLoading.visible = false;
        }

        public function MonsterIconLoaded(param1:String, param2:BitmapData, param3:Array = null):void {
            var _loc4_:Bitmap;
            (_loc4_ = new Bitmap(param2)).smoothing = true;
            param3[0].mcImage.addChild(_loc4_);
            param3[0].mcImage.visible = true;
            param3[0].mcLoading.visible = false;
        }

        public function MonsterInfo(param1:String):Function {
            var n:String = param1;
            return function(param1:MouseEvent = null):void {
                MonsterInfoB(n);
            };
        }

        /* 
       * This function has been rewritten.
       * 
       * @autor: matiasbais
       * 
       * @changes: Renamed local registers to readable names and removed unused logic
       * Added 'v2' variables to display magma/goo depending on monster type
       * Updated speed variable to a Number type to be able to handle floting point values
       * 
       * @param {String} creatureID - the current creature's ID passed to MonsterInfoB
      */
        public function MonsterInfoB(creatureID:String):void {
            var currentCreature:String = null;
            var damageShown:int = 0;
            var creature:Object = CREATURELOCKER._creatures[creatureID];
            var speed:Number = 0;
            var health:int = 0;
            var damage:int = 0;
            var cTime:int = 0;
            var cResource:int = 0;
            var cStorage:int = 0;
            for (currentCreature in CREATURELOCKER._creatures) {
                if (CREATURES.GetProperty(currentCreature, "speed") > speed) {
                    speed = CREATURES.GetProperty(currentCreature, "speed");
                }
                if (CREATURES.GetProperty(currentCreature, "health") > health) {
                    health = CREATURES.GetProperty(currentCreature, "health");
                }
                if (CREATURES.GetProperty(currentCreature, "damage") > damage) {
                    damage = CREATURES.GetProperty(currentCreature, "damage");
                }
                if (CREATURES.GetProperty(currentCreature, "cTime") > cTime) {
                    cTime = CREATURES.GetProperty(currentCreature, "cTime");
                }
                if (CREATURES.GetProperty(currentCreature, "cResource") > cResource) {
                    cResource = CREATURES.GetProperty(currentCreature, "cResource");
                }
                if (CREATURES.GetProperty(currentCreature, "cStorage") > cStorage) {
                    cStorage = CREATURES.GetProperty(currentCreature, "cStorage");
                }
            }
            damageShown = CREATURES.GetProperty(creatureID, "damage");
            TweenLite.to(mcMonsterInfo.bSpeed.mcBar, 0.4, {
                        "width": 100 / speed * CREATURES.GetProperty(creatureID, "speed"),
                        "ease": Circ.easeInOut,
                        "delay": 0
                    });
            TweenLite.to(mcMonsterInfo.bHealth.mcBar, 0.4, {
                        "width": 100 / health * CREATURES.GetProperty(creatureID, "health"),
                        "ease": Circ.easeInOut,
                        "delay": 0.05
                    });
            TweenLite.to(mcMonsterInfo.bDamage.mcBar, 0.4, {
                        "width": 100 / damage * Math.abs(damageShown),
                        "ease": Circ.easeInOut,
                        "delay": 0.1
                    });
            TweenLite.to(mcMonsterInfo.bResource.mcBar, 0.4, {
                        "width": 100 / cResource * CREATURES.GetProperty(creatureID, "cResource"),
                        "ease": Circ.easeInOut,
                        "delay": 0.15
                    });
            TweenLite.to(mcMonsterInfo.bStorage.mcBar, 0.4, {
                        "width": 100 / cStorage * CREATURES.GetProperty(creatureID, "cStorage"),
                        "ease": Circ.easeInOut,
                        "delay": 0.2
                    });
            TweenLite.to(mcMonsterInfo.bTime.mcBar, 0.4, {
                        "width": 100 / cTime * CREATURES.GetProperty(creatureID, "cTime"),
                        "ease": Circ.easeInOut,
                        "delay": 0.25
                    });
            mcMonsterInfo.tSpeed.htmlText = KEYS.Get("mon_statsspeed", {"v1": CREATURES.GetProperty(creatureID, "speed")});
            mcMonsterInfo.tHealth.htmlText = GLOBAL.FormatNumber(CREATURES.GetProperty(creatureID, "health"));
            if (damageShown > 0) {
                mcMonsterInfo.tDamage.htmlText = damageShown;
            }
            else {
                mcMonsterInfo.tDamage.htmlText = -damageShown + " (" + KEYS.Get("str_heal") + ")";
            }
            var v2:String = (creature.id.charAt(0) == "I")
                ? KEYS.Get(BRESOURCE.GetResourceNameKey(7))
                : KEYS.Get(BRESOURCE.GetResourceNameKey(3));
            mcMonsterInfo.tResource.htmlText = KEYS.Get("mon_att_costvalue", {
                        "v1": GLOBAL.FormatNumber(CREATURES.GetProperty(creatureID, "cResource")),
                        "v2": v2
                    });
            mcMonsterInfo.tStorage.htmlText = KEYS.Get("mon_att_housingvalue", {"v1": CREATURES.GetProperty(creatureID, "cStorage")});
            mcMonsterInfo.tTime.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(creatureID, "cTime"), true);
            var level:int = 1;
            if (Boolean(GLOBAL.player.m_upgrades[creatureID]) && GLOBAL.player.m_upgrades[creatureID].level > 1) {
                level = int(GLOBAL.player.m_upgrades[creatureID].level);
            }
            mcMonsterInfo.tDescription.htmlText = "<b>" + KEYS.Get("hatcherypopup_level", {"v1": level}) + " " + KEYS.Get(creature.name) + "</b><br>" + KEYS.Get(creature.description);
            if (Boolean(CREATURELOCKER._lockerData[creatureID]) && CREATURELOCKER._lockerData[creatureID].t == 2) {
                mcMonsterInfo.mcLocked.visible = false;
            }
            else {
                mcMonsterInfo.mcLocked.tText.htmlText = "<b>" + KEYS.Get("hat_unlockinlocker", {"v1": KEYS.Get(CREATURELOCKER._creatures[creatureID].name)}) + "</b>";
                mcMonsterInfo.mcLocked.visible = true;
            }
            this.MonsterInfoShow();
        }

        public function MonsterInfoShow():void {
            mcMonsterInfo.visible = true;
        }

        public function MonsterInfoHide(param1:MouseEvent = null):void {
            mcMonsterInfo.visible = false;
        }

        public function QueueAdd(param1:String):Function {
            var targetID:String = param1;
            return function(param1:MouseEvent = null):void {
                if (!SubscriptionHandler.instance.isSubscriptionActive && SubscriptionHandler.isEnabledForAll && BASE.isInfernoCreep(targetID)) {
                    SubscriptionHandler.instance.showPromoPopup();
                    return;
                }
                _tick = 0;
                _monsterID = targetID;
                QueueAddTick();
                addEventListener(Event.ENTER_FRAME, QueueAddTick);
            };
        }

        private function QueueAddTick(param1:Event = null):void {
            var _loc4_:Array = null;
            this._tick += 1;
            if (this._tick < HATCHERYCC.queueLimit && this._tick != 1) {
                return;
            }
            var _loc2_:String = this._monsterID;
            var _loc3_:int = 7;
            if (!BASE.Charge(4, CREATURES.GetProperty(_loc2_, "cResource"), true, BASE.isInfernoCreep(_loc2_))) {
                return;
            }
            if (Boolean(CREATURELOCKER._lockerData[_loc2_]) && CREATURELOCKER._lockerData[_loc2_].t == 2) {
                if ((_loc4_ = GLOBAL._bHatcheryCC._monsterQueue).length > 0 && _loc4_[_loc4_.length - 1][0] == _loc2_) {
                    if (_loc4_[_loc4_.length - 1][1] < HATCHERYCC.queueLimit) {
                        ++_loc4_[_loc4_.length - 1][1];
                        this.Charge(_loc2_);
                    }
                    else if (_loc4_.length < _loc3_) {
                        _loc4_.push([_loc2_, 1]);
                        this.Charge(_loc2_);
                    }
                    else {
                        SOUNDS.Play("error1");
                    }
                }
                else if (_loc4_.length < _loc3_) {
                    _loc4_.push([_loc2_, 1]);
                    this.Charge(_loc2_);
                }
                else {
                    SOUNDS.Play("error1");
                }
                this.Update();
                GLOBAL._bHatcheryCC.Tick(1);
            }
        }

        private function FinishNow(param1:MouseEvent):void {
            var _loc2_:Array = null;
            var _loc3_:String = null;
            var _loc4_:Object = null;
            var _loc5_:String = null;
            if (!bFinish.Enabled) {
                return;
            }
            if (Boolean(GLOBAL._bHatcheryCC) && GLOBAL._bHatcheryCC._finishCost.Get() > 0) {
                if (BASE._credits.Get() >= GLOBAL._bHatcheryCC._finishCost.Get()) {
                    _loc2_ = [];
                    _loc4_ = GLOBAL._bHatcheryCC._finishQueue;
                    for (_loc5_ in _loc4_) {
                        if (_loc4_[_loc5_] > 0) {
                            _loc3_ = KEYS.Get(CREATURELOCKER._creatures[_loc5_].name);
                            _loc2_.push([_loc4_[_loc5_], _loc3_]);
                        }
                    }
                    GLOBAL.Array2String(_loc2_);
                    if (GLOBAL._bHatcheryCC._finishAll) {
                        GLOBAL.Message(KEYS.Get("msg_finishqueue", {
                                        "v1": GLOBAL.Array2String(_loc2_),
                                        "v2": GLOBAL._bHatcheryCC._finishCost.Get()
                                    }), KEYS.Get("str_finishnow"), this.DoFinish);
                    }
                    else {
                        GLOBAL.Message(KEYS.Get("msg_fillhousing", {
                                        "v1": GLOBAL.Array2String(_loc2_),
                                        "v2": GLOBAL._bHatcheryCC._finishCost.Get()
                                    }), KEYS.Get("str_finishnow"), this.DoFinish);
                    }
                }
                else {
                    POPUPS.DisplayGetShiny(param1);
                }
            }
            else if (GLOBAL._bHatcheryCC._finishCost.Get() <= 0) {
                GLOBAL.Message(KEYS.Get("msg_housingfull"));
            }
        }

        private function DoFinish():void {
            GLOBAL._bHatcheryCC.FinishNow();
        }

        private function Charge(param1:String):void {
            var _loc2_:Boolean = BASE.isInfernoCreep(param1);
            BASE.Charge(4, CREATURES.GetProperty(param1, "cResource"), false, _loc2_);
            ResourcePackages.Create(_loc2_ ? 8 : 4, GLOBAL._bHatcheryCC, CREATURES.GetProperty(param1, "cResource"), true);
            BASE.Save();
        }

        public function QueueRemove(param1:int):Function {
            var n:int = param1;
            return function(param1:MouseEvent = null):void {
                _tick = 0;
                _monsterIndex = n;
                QueueRemoveTick();
                addEventListener(Event.ENTER_FRAME, QueueRemoveTick);
            };
        }

        private function QueueRemoveTick(param1:Event = null):void {
            this._tick += 1;
            if (this._tick < HATCHERYCC.queueLimit && this._tick != 1) {
                return;
            }
            var _loc2_:Array = GLOBAL._bHatcheryCC._monsterQueue;
            if (_loc2_.length >= this._monsterIndex) {
                BASE.Fund(4, CREATURES.GetProperty(_loc2_[this._monsterIndex - 1][0], "cResource"), false, null, BASE.isInfernoCreep(_loc2_[this._monsterIndex - 1][0]));
                --_loc2_[this._monsterIndex - 1][1];
                if (_loc2_[this._monsterIndex - 1][1] <= 0) {
                    _loc2_.splice(this._monsterIndex - 1, 1);
                }
                BASE.Save();
            }
            else {
                SOUNDS.Play("error1");
            }
            this.Update();
        }

        private function ClearEvents(param1:MouseEvent):void {
            removeEventListener(Event.ENTER_FRAME, this.QueueAddTick);
            removeEventListener(Event.ENTER_FRAME, this.QueueRemoveTick);
        }

        public function StopProduction(param1:int):Function {
            var n:int = param1;
            return function(param1:MouseEvent = null):void {
                var _loc4_:* = undefined;
                var _loc2_:* = 1;
                var _loc3_:* = InstanceManager.getInstancesByClass(BUILDING13);
                for each (_loc4_ in _loc3_) {
                    if (_loc4_._inProduction != "" && _loc2_ == n) {
                        BASE.Fund(4, CREATURES.GetProperty(_loc4_._inProduction, "cResource"), false, null, BASE.isInfernoCreep(_loc4_._inProduction));
                        _loc4_._inProduction = "";
                        _loc4_.ResetProduction();
                    }
                    _loc2_++;
                }
                Update();
            };
        }

        public function RenderQueue():void {
            var _loc9_:BUILDING13 = null;
            var _loc10_:int = 0;
            var _loc1_:int = 7;
            var _loc2_:Array = GLOBAL._bHatcheryCC._monsterQueue;
            var _loc3_:int = 1;
            while (_loc3_ <= _loc1_) {
                this["slot" + _loc3_].mcImage.visible = false;
                this["slot" + _loc3_].mcLoading.visible = false;
                this["mcCount" + _loc3_].visible = false;
                _loc3_++;
            }
            _loc3_ = 1;
            while (_loc3_ <= _loc2_.length) {
                this["slot" + _loc3_].mcImage.visible = false;
                this["slot" + _loc3_].mcLoading.visible = true;
                ImageCache.GetImageWithCallBack("monsters/" + _loc2_[_loc3_ - 1][0] + "-medium.jpg", this.IconLoaded, true, 1, "", ["slot", _loc3_]);
                this["mcCount" + _loc3_].visible = true;
                this["mcCount" + _loc3_].tCounter.text = _loc2_[_loc3_ - 1][1];
                _loc3_++;
            }
            if (GLOBAL.INFERNO_ONLY) {
                this.ioDrawArrows(_loc2_.length);
            }
            HOUSING.HousingSpace();
            var _loc4_:int = 0;
            var _loc5_:int = 100 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
            mcStorage.mcBar.width = 535 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
            var _loc6_:* = "<b>" + GLOBAL.FormatNumber(HOUSING._housingUsed.Get()) + " / " + GLOBAL.FormatNumber(HOUSING._housingCapacity.Get()) + "</b>";
            var _loc7_:int = 0;
            var _loc8_:Vector.<Object> = InstanceManager.getInstancesByClass(BUILDING13);
            for each (_loc9_ in _loc8_) {
                if (_loc9_._inProduction) {
                    _loc7_ += CREATURES.GetProperty(_loc9_._inProduction, "cStorage");
                }
            }
            _loc10_ = 0;
            while (_loc10_ < _loc2_.length) {
                _loc7_ += CREATURES.GetProperty(_loc2_[_loc10_][0], "cStorage") * _loc2_[_loc10_][1];
                _loc10_++;
            }
            if (_loc7_ > 0) {
                bFinish.Enabled = true;
                if (HATCHERYCC.doesShowInfernoCreeps) {
                    bFinish.gotoAndStop(3);
                }
                else {
                    bFinish.gotoAndStop(2);
                }
            }
            else {
                bFinish.Enabled = false;
                bFinish.gotoAndStop(1);
            }
            if (HATCHERYCC.doesShowInfernoCreeps) {
                _loc6_ += "   ";
            }
            else {
                _loc6_ += "<br>";
            }
            if (_loc7_ > 0 && GLOBAL._hatcheryOverdrivePower.Get() < 10) {
                bSpeedup.gotoAndStop(2);
                _loc6_ += "<font size=\"9\">" + KEYS.Get("hcc_queuedup", {"v1": GLOBAL.FormatNumber(HOUSING._housingUsed.Get() + _loc7_)});
                if (HOUSING._housingUsed.Get() + _loc7_ == HOUSING._housingCapacity.Get()) {
                    _loc6_ += " " + KEYS.Get("hcc_queuedfull");
                }
                if (HOUSING._housingUsed.Get() + _loc7_ > HOUSING._housingCapacity.Get()) {
                    _loc6_ += " " + KEYS.Get("hcc_queuedover");
                }
            }
            else {
                bSpeedup.gotoAndStop(1);
                _loc6_ += "<font size=\"9\">" + KEYS.Get("hcc_queuedup", {"v1": GLOBAL.FormatNumber(HOUSING._housingUsed.Get() + _loc7_)});
                if (HOUSING._housingUsed.Get() + _loc7_ == HOUSING._housingCapacity.Get()) {
                    _loc6_ += " " + KEYS.Get("hcc_queuedfull");
                }
                if (HOUSING._housingUsed.Get() + _loc7_ > HOUSING._housingCapacity.Get()) {
                    _loc6_ += " " + KEYS.Get("hcc_queuedover");
                }
            }
            if ((_loc5_ = 535 / HOUSING._housingCapacity.Get() * (HOUSING._housingUsed.Get() + _loc7_)) > 535) {
                _loc5_ = 535;
            }
            mcStorage.mcBarB.width = _loc5_;
            txtStorage.htmlText = _loc6_;
            var _loc11_:int = int(BASE._resources.r4.Get());
            _loc10_ = 0;
            while (_loc10_ < _loc2_.length) {
                _loc11_ -= CREATURES.GetProperty(_loc2_[_loc10_][0], "cResource") * _loc2_[_loc10_][1];
                _loc10_++;
            }
            mcGoo.mcBarB.width = 1;
            if ((_loc5_ = 100 / BASE._resources.r4max * BASE._resources.r4.Get()) > 100) {
                _loc5_ = 100;
            }
            mcGoo.mcBar.width = _loc5_;
            txtGoo.htmlText = "<b>" + KEYS.Get("hat_gooremaining", {"v1": GLOBAL.FormatNumber(BASE._resources.r4.Get())}) + "</b>";
            GLOBAL.ioFitText(txtGoo); // (Inferno-only: "remaining" wrapped out of sight)
            bTopup.gotoAndStop(1);
            if (BASE._resources.r4.Get() < BASE._resources.r4max * 0.1) {
                bTopup.gotoAndStop(2);
            }
            if (HATCHERYCC.doesShowInfernoCreeps) {
                _loc11_ = int(BASE._iresources.r4.Get());
                _loc10_ = 0;
                while (_loc10_ < _loc2_.length) {
                    _loc11_ -= CREATURES.GetProperty(_loc2_[_loc10_][0], "cResource") * _loc2_[_loc10_][1];
                    _loc10_++;
                }
                mcMagma.mcBarB.width = 1;
                if ((_loc5_ = 100 / BASE._iresources.r4max * BASE._iresources.r4.Get()) > 100) {
                    _loc5_ = 100;
                }
                mcMagma.mcBar.width = _loc5_;
                txtMagma.htmlText = "<b>" + KEYS.Get("hat_magmaremaining", {"v1": GLOBAL.FormatNumber(BASE._iresources.r4.Get())}) + "</b>";
                bTopupMagma.gotoAndStop(1);
                if (BASE._iresources.r4.Get() < BASE._iresources.r4max * 0.1) {
                    bTopupMagma.gotoAndStop(2);
                }
            }
        }

        // ---- Inferno-only (3 October): a small left and right arrow under each queued monster moves it one
        // place earlier or later in the queue (the first is made first).

        private var _ioArrows:Array = [];

        private function ioArrow(left:Boolean, onClick:Function):Sprite {
            var a:Sprite = new Sprite();
            a.name = left ? "ioQueueLeft" : "ioQueueRight";
            a.buttonMode = true;
            var g:Graphics = a.graphics;
            g.lineStyle(1, 0x5A3A10, 1);
            g.beginFill(0xFFD06A, 1);
            g.drawRoundRect(-8, -7, 16, 14, 6, 6);
            g.endFill();
            g.lineStyle(0, 0, 0);
            g.beginFill(0x4A2A08, 1);
            if (left) {
                g.moveTo(3, -4);
                g.lineTo(3, 4);
                g.lineTo(-4, 0);
            }
            else {
                g.moveTo(-3, -4);
                g.lineTo(-3, 4);
                g.lineTo(4, 0);
            }
            g.endFill();
            a.addEventListener(MouseEvent.MOUSE_DOWN, function(e:MouseEvent):void {
                    e.stopPropagation();
                    SOUNDS.Play("click1");
                    onClick();
                });
            return a;
        }

        private function ioMove(from:int, to:int):Function {
            return function():void {
                var q:Array = GLOBAL._bHatcheryCC._monsterQueue;
                if (from < 0 || to < 0 || from >= q.length || to >= q.length) {
                    return;
                }
                var t:Array = q[from];
                q[from] = q[to];
                q[to] = t;
                BASE.Save();
                Update();
            };
        }

        private function ioDrawArrows(n:int):void {
            for each (var old:Sprite in this._ioArrows) {
                if (old.parent) {
                    old.parent.removeChild(old);
                }
            }
            this._ioArrows = [];
            for (var i:int = 1; i <= n; i++) {
                var slot:MovieClip = this["slot" + i];
                if (!slot) {
                    continue;
                }
                var cx:Number = slot.x + slot.width / 2;
                var by:Number = slot.y + slot.height + 7;
                if (i > 1) {
                    var l:Sprite = this.ioArrow(true, this.ioMove(i - 1, i - 2));
                    l.x = cx - 10;
                    l.y = by;
                    addChild(l);
                    this._ioArrows.push(l);
                }
                if (i < n) {
                    var r:Sprite = this.ioArrow(false, this.ioMove(i - 1, i));
                    r.x = cx + 10;
                    r.y = by;
                    addChild(r);
                    this._ioArrows.push(r);
                }
            }
        }

        public function Setup():void {
            var _loc1_:int = 7;
            var _loc2_:int = 1;
            while (_loc2_ <= _loc1_) {
                this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_DOWN, this.QueueRemove(_loc2_));
                this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(this["mcRemove" + _loc2_]));
                this["slot" + _loc2_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(this["mcRemove" + _loc2_]));
                this["slot" + _loc2_].buttonMode = true;
                if (HATCHERYCC.queueLimit > HATCHERYCC.DEFAULT_QUEUE_LIMIT) {
                    this["slot" + _loc2_].gotoAndStop(2);
                }
                else {
                    this["slot" + _loc2_].gotoAndStop(1);
                }
                this["mcRemove" + _loc2_].visible = false;
                this["mcRemove" + _loc2_].mouseEnabled = false;
                this["mcRemove" + _loc2_].mouseChildren = false;
                _loc2_++;
            }
            _loc2_ = 1;
            while (_loc2_ <= 5) {
                this["hatcheryRemove" + _loc2_].visible = false;
                this["hatcheryRemove" + _loc2_].mouseEnabled = false;
                this["hatcheryRemove" + _loc2_].mouseChildren = false;
                _loc2_++;
            }
            this.MonsterInfoHide();
            this.Update();
        }

        public function ShowRemove(param1:MovieClip):Function {
            var n:MovieClip = param1;
            return function(param1:MouseEvent):void {
                n.visible = true;
            };
        }

        public function HideRemove(param1:MovieClip):Function {
            var n:MovieClip = param1;
            return function(param1:MouseEvent):void {
                n.visible = false;
            };
        }

        public function Update():void {
            var _loc4_:MovieClip = null;
            var _loc8_:BUILDING13 = null;
            var _loc9_:int = 0;
            var _loc11_:String = null;
            var _loc12_:int = 0;
            var _loc13_:int = 0;
            this.RenderQueue();
            var _loc1_:Array = GLOBAL._bHatcheryCC._monsterQueue;
            var _loc2_:Array = [];
            var _loc3_:int = 1;
            var _loc5_:Array = [];
            var _loc6_:int = 0;
            while (_loc6_ < this._monsterSlots.length) {
                _loc11_ = String(this._monsterSlots[_loc6_].id);
                if (!SubscriptionHandler.instance.isSubscriptionActive && SubscriptionHandler.isEnabledForAll && BASE.isInfernoCreep(_loc11_)) {
                    this._monsterSlots[_loc6_].mcMonster.alpha = 0.5;
                    this._monsterSlots[_loc6_].mcLevel.alpha = 0.5;
                }
                else if (!BASE.Charge(4, CREATURES.GetProperty(_loc11_, "cResource"), true, BASE.isInfernoCreep(_loc11_))) {
                    this._monsterSlots[_loc6_].mcMonster.alpha = 0.5;
                    this._monsterSlots[_loc6_].mcLevel.alpha = 0.5;
                }
                else {
                    this._monsterSlots[_loc6_].mcMonster.alpha = 1;
                    this._monsterSlots[_loc6_].mcLevel.alpha = 1;
                }
                _loc6_++;
            }
            var _loc7_:Vector.<Object> = InstanceManager.getInstancesByClass(BUILDING13);
            for each (_loc8_ in _loc7_) {
                (_loc4_ = this["hatchery" + _loc3_]).mouseEnabled = false;
                _loc4_.tLabel.text = "";
                _loc4_.mcImage.visible = false;
                _loc4_.mcLoading.visible = false;
                this["bProgress" + _loc3_].visible = false;
                this["tProgress" + _loc3_].visible = false;
                this["hatcheryRemove" + _loc3_].visible = false;
                if (_loc8_._countdownBuild.Get() > 0) {
                    _loc4_.mcImage.visible = false;
                    _loc4_.mcLoading.visible = false;
                    _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_construction") + "</font>";
                }
                else if (_loc8_._countdownUpgrade.Get() > 0) {
                    _loc4_.mcImage.visible = false;
                    _loc4_.mcLoading.visible = false;
                    _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_upgrading") + "</font>";
                }
                else if (Boolean(_loc8_._inProduction) && _loc8_._inProduction != "") {
                    _loc4_.mcLoading.visible = true;
                    ImageCache.GetImageWithCallBack("monsters/" + _loc8_._inProduction + "-medium.jpg", this.IconLoaded, true, 1, "", ["hatchery", _loc3_]);
                    // Through GetProperty, not the raw table, so the progress bar follows the real hatch time
                    // (academy level, and the 1-second hatching of inferno-only builds).
                    _loc12_ = Math.max(1, int(CREATURES.GetProperty(_loc8_._inProduction, "cTime")));
                    if ((_loc13_ = 100 / _loc12_ * _loc8_._countdownProduce.Get()) < 0) {
                        _loc13_ = 0;
                    }
                    this["bProgress" + _loc3_].mcBar.width = 100 - _loc13_;
                    if (_loc8_._countdownProduce.Get() > 0 && _loc8_._hasResources) {
                        this["tProgress" + _loc3_].htmlText = "<b>" + GLOBAL.ToTime(_loc8_._countdownProduce.Get(), true) + "</b>";
                    }
                    else if (_loc8_._productionStage.Get() == 2 && Boolean(_loc8_._inProduction)) {
                        this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_nospace") + "</b>";
                    }
                    else if (_loc8_._productionStage.Get() == 3 && _loc8_._taken.Get() == 0) {
                        if (BASE.isInfernoMainYardOrOutpost) {
                            this["tProgress" + _loc3_].htmlText = "<b>No Magma</b>";
                        }
                        else {
                            this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_nogoo") + "</b>";
                        }
                    }
                    else {
                        this["tProgress" + _loc3_].htmlText = "<b>" + KEYS.Get("hat_status_waiting") + "</b>";
                    }
                    this["bProgress" + _loc3_].visible = true;
                    this["tProgress" + _loc3_].visible = true;
                }
                else {
                    _loc4_.mcImage.visible = false;
                    _loc4_.mcLoading.visible = false;
                    this["bProgress" + _loc3_].visible = false;
                    this["tProgress" + _loc3_].visible = false;
                }
                _loc3_++;
            }
            _loc9_ = 5;
            if (BASE.isOutpost) {
                _loc9_ = 2;
            }
            var _loc10_:int = _loc3_;
            while (_loc10_ <= 5) {
                _loc4_ = this["hatchery" + _loc10_];
                if (_loc10_ <= _loc9_) {
                    _loc4_.visible = true;
                    _loc4_.tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_buildanother") + "</font>";
                    _loc4_.mcLoading.visible = false;
                    this["hatcheryBG" + _loc10_].visible = true;
                    this["hatlabel" + _loc10_ + "_txt"].visible = true;
                    this["bProgress" + _loc10_].visible = false;
                    this["tProgress" + _loc10_].visible = false;
                    this["hatcheryRemove" + _loc10_].visible = false;
                }
                else {
                    _loc4_.visible = false;
                    this["hatlabel" + _loc10_ + "_txt"].visible = false;
                    this["hatcheryBG" + _loc10_].visible = false;
                    this["hatcheryBG" + _loc10_].visible = false;
                    this["bProgress" + _loc10_].visible = false;
                    this["tProgress" + _loc10_].visible = false;
                    this["hatcheryRemove" + _loc10_].visible = false;
                }
                _loc10_++;
            }
            if (GLOBAL._hatcheryOverdrive > 0) {
                mcOverdrive.t.htmlText = "<b>" + KEYS.Get("hat_xoverdrive", {
                            "v1": GLOBAL._hatcheryOverdrivePower.Get(),
                            "v2": GLOBAL.ToTime(GLOBAL._hatcheryOverdrive)
                        }) + "</b>";
                mcOverdrive.visible = true;
            }
            else {
                mcOverdrive.visible = false;
            }
            this._scrollSet.Update();
        }

        public function Help(param1:MouseEvent = null):void {
            var _loc2_:int = 9;
            this._guidePage += 1;
            if (this._guidePage == 3) {
                this._guidePage = 4;
            }
            if (this._guidePage > _loc2_) {
                this._guidePage = 1;
            }
            this.gotoAndStop(this._guidePage);
            if (this._guidePage > 1) {
                this.txtGuide.htmlText = KEYS.Get("hcc_tut_" + (this._guidePage - 1));
                if (this._guidePage == 2) {
                    this.bContinue.addEventListener(MouseEvent.CLICK, this.Help);
                    this.bContinue.SetupKey("btn_continue");
                }
            }
        }

        public function Hide(param1:MouseEvent = null):void {
            HATCHERYCC.Hide(param1);
        }

        public function Center():void {
            POPUPSETTINGS.AlignToCenter(this);
        }

        public function ScaleUp():void {
            POPUPSETTINGS.ScaleUp(this);
        }
    }
}
