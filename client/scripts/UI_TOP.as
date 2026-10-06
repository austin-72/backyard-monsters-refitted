package {
    import com.monsters.events.hfo.IoHfo;
    import com.monsters.events.hfo.IoHfoUi;
    import flash.system.System;
    import com.monsters.baseBuffs.BaseBuff;
    import com.monsters.baseBuffs.BaseBuffHandler;
    import com.monsters.baseBuffs.buffs.AutoBankBaseBuff;
    import com.monsters.configs.BYMConfig;
    import com.monsters.dealspot.DealSpot;
    import com.monsters.display.ScrollSetV;
    import com.monsters.enums.EnumYardType;
    import com.monsters.kingOfTheHill.graphics.KOTHHUDGraphic;
    import com.monsters.managers.InstanceManager;
    import com.monsters.maproom3.MapRoom3Cell;
    import com.monsters.maproom_advanced.IoOutpostsPopup;
    import com.monsters.maproom_advanced.IoGauntlet;
    import com.monsters.display.ImageCache;
    import flash.display.BitmapData;
    import flash.display.Shape;
    import com.monsters.maproom_inferno.views.DescentDebuffPopup;
    import com.monsters.maproom_manager.MapRoomManager;
    import com.monsters.monsters.champions.ChampionBase;
    import com.monsters.siege.SiegeWeapons;
    import com.monsters.subscriptions.SubscriptionHandler;
    import flash.display.Bitmap;
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.display.Loader;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.geom.Rectangle;
    import flash.filters.DropShadowFilter;
    import flash.geom.Point;
    import flash.geom.Matrix;
    import flash.net.navigateToURL;
    import flash.filters.GlowFilter;
    import flash.text.TextFormat;
    import flash.text.TextField;
    import flash.utils.Dictionary;
    import com.monsters.admin.IoTestMode;
    import flash.display.Graphics;
    import com.monsters.leaderboards.IoLeaderboards;
    import com.monsters.leaderboards.IoAttackLogs;
    import com.monsters.leaderboards.IoChangelog;
    import com.monsters.admin.IoDesigner;
    import flash.net.URLRequest;
    import flash.text.TextFieldAutoSize;
    import gs.*;
    import gs.easing.*;

    public class UI_TOP extends UI_TOP_CLIP {

        public static const CREATUREBUTTONOVER:String = "creatureButtonOver";

        public var _popupWarning:bubblepopup4;

        public var _popupBuff:bubblepopupBuff;

        public var _creatureButtons:Array;

        public var _creatureButtonsMC:flingerLevel;

        public var _bubbleDo:DisplayObject;

        public var _catapult:CATAPULTPOPUP;

        public var _siegeweapon:SIEGEWEAPONPOPUP;

        public var _buttonIcons:Array;

        public var _descentDebuff:DescentDebuffPopup;

        public var extraResourceRows:int = 0;

        public var _dealspot:DealSpot;

        public var _resourceUI:Object;

        public var _resourceR1:int;

        public var _resourceR2:int;

        public var _resourceR3:int;

        public var _resourceR4:int;

        public var _kothIcon:DisplayObject;

        public var _daveClub:DisplayObject;

        private const _RESOURCEBAR_HEIGHT:int = 37;

        private var m_creatureContainer:Sprite;

        private var m_scrollBar:ScrollSetV;

        public function UI_TOP() {
            var _loc1_:int = 0;
            var _loc3_:Boolean = false;
            super();
            var _loc2_:String = GLOBAL.mode;
            switch (GLOBAL.mode) {
                case GLOBAL.e_BASE_MODE.BUILD:
                case GLOBAL.e_BASE_MODE.IBUILD:
                    _loc2_ = GLOBAL.e_BASE_MODE.BUILD;
                    break;
                case GLOBAL.e_BASE_MODE.ATTACK:
                case GLOBAL.e_BASE_MODE.IATTACK:
                    _loc2_ = GLOBAL.e_BASE_MODE.ATTACK;
                    break;
                case GLOBAL.e_BASE_MODE.WMATTACK:
                case GLOBAL.e_BASE_MODE.IWMATTACK:
                    _loc2_ = GLOBAL.e_BASE_MODE.WMATTACK;
                    break;
                case GLOBAL.e_BASE_MODE.VIEW:
                case GLOBAL.e_BASE_MODE.IVIEW:
                    _loc2_ = GLOBAL.e_BASE_MODE.VIEW;
                    break;
                case GLOBAL.e_BASE_MODE.HELP:
                case GLOBAL.e_BASE_MODE.IHELP:
                    _loc2_ = GLOBAL.e_BASE_MODE.HELP;
                    break;
                case GLOBAL.e_BASE_MODE.WMVIEW:
                case GLOBAL.e_BASE_MODE.IWMVIEW:
                    _loc2_ = MapRoomManager.instance.isInMapRoom3 ? (_loc2_ = GLOBAL.e_BASE_MODE.ATTACK) : GLOBAL.e_BASE_MODE.WMVIEW;
            }
            if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL.mode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode === GLOBAL.e_BASE_MODE.WMVIEW)) {
                gotoAndStop(GLOBAL.e_BASE_MODE.ATTACK);
            }
            else if (GLOBAL.INFERNO_ONLY) {
                // The top bar art has one frame per load mode, and the Inferno ones ("ibuild", "iattack"...)
                // carry the bone / coal / sulfur / magma icons. They hold the same named parts as the
                // overworld frames, so only the artwork changes.
                gotoAndStop("i" + GLOBAL._loadmode);
            }
            else {
                gotoAndStop(GLOBAL._loadmode);
            }
            if (mc && mc.mcPoints)
                mc.mcPoints.stop();
            if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IBUILD) {
                this.setupBuildMode();
            }
            else if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK) {
                this.setupAttackMode();
            }
            else if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL.mode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL.mode === GLOBAL.e_BASE_MODE.WMVIEW)) {
                this.setupScoutMode();
            }
            else {
                this.DescentDebuffHide();
            }
            this.Update();
        }

        private function setupBuildMode():void {
            var _loc1_:int = 0;
            mc.mcPoints.addEventListener(MouseEvent.MOUSE_OVER, this.InfoShow);
            mc.mcPoints.addEventListener(MouseEvent.MOUSE_OUT, this.InfoHide);
            _loc1_ = 1;
            while (_loc1_ < 5) {
                mc["mcR" + _loc1_].mcHit.addEventListener(MouseEvent.MOUSE_OVER, this.StatsShow(_loc1_, false));
                mc["mcR" + _loc1_].mcHit.addEventListener(MouseEvent.MOUSE_OUT, this.StatsHide);
                mc["mcR" + _loc1_].bAdd.addEventListener(MouseEvent.CLICK, this.Topup(_loc1_));
                mc["mcR" + _loc1_].bAdd.buttonMode = true;
                mc["mcR" + _loc1_].bAdd.mouseEnabled = true;
                mc["mcR" + _loc1_].bAdd.mouseChildren = false;
                _loc1_++;
            }
            this._resourceUI = {};
            this._resourceUI.r1 = BASE._resources["r" + 1].Get();
            this._resourceUI.r2 = BASE._resources["r" + 2].Get();
            this._resourceUI.r3 = BASE._resources["r" + 3].Get();
            this._resourceUI.r4 = BASE._resources["r" + 4].Get();
            mc["mcR" + 1]._resource = BASE._resources["r" + 1].Get();
            mc["mcR" + 2]._resource = BASE._resources["r" + 2].Get();
            mc["mcR" + 3]._resource = BASE._resources["r" + 3].Get();
            mc["mcR" + 4]._resource = BASE._resources["r" + 4].Get();
            mc.mcR5.bAdd.txtAdd.autoSize = TextFieldAutoSize.LEFT;
            mc.mcR5.bAdd.txtAdd.htmlText = KEYS.Get("ui_topaddshiny");
            mc.mcR5.bAdd.mcBG.width = mc.mcR5.bAdd.txtAdd.width + 11;
            mc.mcR5.mcBG.width = 82 + mc.mcR5.bAdd.width;
            // mc.mcR5.bAdd.addEventListener(MouseEvent.CLICK,BUY.Show);
            mc.mcR5.bAdd.addEventListener(MouseEvent.CLICK, function(event:MouseEvent):void {
                    GLOBAL.Message(KEYS.Get("disabled_addshiny"));
                });
            mc.mcR5.bAdd.buttonMode = true;
            mc.mcR5.bAdd.mouseChildren = false;
            if (GLOBAL.INFERNO_ONLY) {
                // Shiny cannot be bought here, and the button only said so: hide it and fit the counter.
                mc.mcR5.bAdd.visible = false;
                mc.mcR5.mcBG.width = 82;
            }
            mc.mcOutposts.mcHit.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
            mc.mcOutposts.mcHit.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            mc.mcOutposts.bNext.addEventListener(MouseEvent.CLICK, ioNextClick);
            mc.mcOutposts.bNext.buttonMode = true;
            mc.mcOutposts.bNext.mouseEnabled = true;
            mc.mcOutposts.bNext.mouseChildren = false;
            mc.bInvite.buttonMode = true;
            mc.bInvite.mouseChildren = false;
            mc.bInvite.addEventListener(MouseEvent.CLICK, this.ButtonClick("invite"));
            mc.bInvite.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
            mc.bInvite.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            mc.bGift.buttonMode = true;
            mc.bGift.mouseChildren = false;
            mc.bGift.addEventListener(MouseEvent.CLICK, this.ButtonClick("gift"));
            mc.bGift.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
            mc.bGift.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            mc.bInbox.buttonMode = true;
            mc.bInbox.mouseChildren = false;
            mc.bInbox.addEventListener(MouseEvent.CLICK, this.ButtonClick("inbox"));
            mc.bInbox.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
            mc.bInbox.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            mc.bAlert.buttonMode = true;
            mc.bAlert.mouseChildren = false;
            mc.bAlert.addEventListener(MouseEvent.CLICK, this.ButtonClick("alert"));
            mc.bAlert.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
            mc.bAlert.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            this._buttonIcons = [];
            this._buttonIcons = [mc.bInvite, mc.bGift, mc.bInbox, mc.bAlert];
            if (GLOBAL.INFERNO_ONLY) {
                // (not in the icon row: it sits in the workers' column, under the fifth, UI_WORKERS)
                this.ioMakeGauntletButton();
                this.ioMakeHfoButton();
            }
            // Server flag io_hideui: a comma separated list of top-bar buttons this server has no use
            // for ("invite", "gift"). The icon row lays itself out from whichever buttons are visible.
            if (GLOBAL.ioUiHidden("invite")) {
                mc.bInvite.visible = false;
            }
            if (GLOBAL.ioUiHidden("gift") && !GLOBAL.INFERNO_ONLY) {
                // On inferno-only servers the gift button is the Daily Reward button (ioDailyButton).
                mc.bGift.visible = false;
            }
            addEventListener(Event.ENTER_FRAME, onSpinnerTick);
            mc.bEarn.bAction.tLabel.htmlText = KEYS.Get("btn_earn");
            if (GLOBAL._flags.showFBCEarn == 1) {
                mc.bEarn.buttonMode = true;
                mc.bEarn.mouseChildren = false;
                mc.bEarn.addEventListener(MouseEvent.CLICK, this.ButtonClick("earn"));
                mc.bEarn.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                mc.bEarn.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
            }
            else {
                mc.bEarn.mouseChildren = false;
                mc.bEarn.mouseEnabled = false;
                mc.bEarn.visible = false;
            }
            mc.bDailyDeal.tLabel.htmlText = KEYS.Get("btn_dailydeal");
            if (GLOBAL._flags.showFBCDaily == 1) {
                mc.bDailyDeal.buttonMode = true;
                mc.bDailyDeal.mouseChildren = false;
                mc.bDailyDeal.addEventListener(MouseEvent.CLICK, this.ButtonClick("daily"));
                mc.bDailyDeal.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                mc.bDailyDeal.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                if (GLOBAL._flags.showFBCEarn == 0) {
                    mc.bDailyDeal.x = mc.bEarn.x;
                }
            }
            else {
                mc.bDailyDeal.mouseChildren = false;
                mc.bDailyDeal.mouseEnabled = false;
                mc.bDailyDeal.visible = false;
            }
        }

        private function onSpinnerTick(e:Event):void {
            for each (var btn:* in this._buttonIcons) {
                if (btn && btn.mcSpinner && btn.mcSpinner.visible) {
                    btn.mcSpinner.rotation += 4;
                }
            }
            if (this._ioGauntlet && this._ioGauntlet.mcSpinner && this._ioGauntlet.mcSpinner.visible) {
                this._ioGauntlet.mcSpinner.rotation += 4;
            }
        }

        private function setupScoutMode():void {
            var _loc1_:MovieClip = null;
            var _loc2_:int = 0;
            this.setupAttackMode();
            if (!GLOBAL._attackersFlinger) {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_flinger");
            }
            else {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("monster_limit") : KEYS.Get("attack_flingerbar");
            }
            this._creatureButtonsMC._mc._txtContainer.mcBar.visible = false;
            this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "";
            _loc2_ = 1;
            while (_loc2_ < 5) {
                _loc1_ = mc["mcR" + _loc2_];
                _loc1_.visible = false;
                _loc2_++;
            }
        }

        private function setupAttackMode():void {
            var _loc1_:Array = null;
            var _loc2_:Sprite = null;
            this._creatureButtonsMC = mc.addChild(new flingerLevel()) as flingerLevel;
            this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("txt_flinger_capacity");
            // Inferno-only: the text is "Flinger Capacity: #v1#%" and the number has its own field (tA), so the
            // unfilled "#v1#%" wrapped onto a second line showing under the label in every attack
            if (GLOBAL.INFERNO_ONLY) {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("txt_flinger_capacity").split("#v1#")[0].replace(/\s+$/, "");
            }
            this._creatureButtonsMC._mc._txtContainer.mcBar.visible = true;
            this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "0%";
            this._creatureButtonsMC.y = 180;
            this._creatureButtonsMC._mc.x = 2;
            this._creatureButtonsMC._mc.y = -6;
            this._creatureButtons = [];
            if (!GLOBAL._attackersFlinger) {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_flinger");
                this._creatureButtonsMC._mc._txtContainer.tA.htmlText = "";
                this._creatureButtonsMC._mc._bottomBar.visible = false;
            }
            else {
                this.m_creatureContainer = new Sprite();
                this._creatureButtonsMC.addChild(this.m_creatureContainer);
                _loc1_ = this.setupChampionButtons(this.m_creatureContainer);
                this.setupCreatureButtons(this.m_creatureContainer, _loc1_[0], _loc1_[1]);
                if (this.m_creatureContainer.numChildren == 0) {
                    this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_monsters");
                    this._creatureButtonsMC._mc._bottomBar.visible = false;
                }
                _loc2_ = new Sprite();
                _loc2_.graphics.beginFill(16777215, 1);
                _loc2_.graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
                _loc2_.graphics.endFill();
                _loc2_.mouseEnabled = false;
                _loc2_.mouseChildren = false;
                this._creatureButtonsMC.addChild(_loc2_);
                this.m_creatureContainer.mask = _loc2_;
                this.m_scrollBar = new ScrollSetV(this.m_creatureContainer, _loc2_, true);
                this.m_scrollBar.x = 202 - this.m_scrollBar.width;
                this.m_scrollBar.y = 22;
                this._creatureButtonsMC.addChild(this.m_scrollBar);
            }
            if (SiegeWeapons.availableWeapon != null && !BASE.isInfernoMainYardOrOutpost) {
                this._siegeweapon = new SIEGEWEAPONPOPUP();
                mc.addChild(this._siegeweapon);
                this._siegeweapon.x = 442;
                this._siegeweapon.y = 20;
                this._siegeweapon.Setup(!GLOBAL.isInAttackMode);
            }
            if (GLOBAL._attackersCatapult > 0 && (GLOBAL.INFERNO_ONLY || !BASE.isInfernoMainYardOrOutpost)) {
                this._catapult = new CATAPULTPOPUP();
                mc.addChild(this._catapult);
                this._catapult.x = 350;
                this._catapult.y = 20;
                this._catapult.Setup(!GLOBAL.isInAttackMode);
            }
        }

        private function setupScrollMenu():void {
            this.m_creatureContainer = new Sprite();
            this._creatureButtonsMC.addChild(this.m_creatureContainer);
            var _loc1_:Array = this.setupChampionButtons(this.m_creatureContainer);
            this.setupCreatureButtons(this.m_creatureContainer, _loc1_[0], _loc1_[1]);
            if (this.m_creatureContainer.numChildren == 0) {
                this._creatureButtonsMC._mc._txtContainer.flinger_txt.htmlText = KEYS.Get("no_monsters");
                this._creatureButtonsMC._mc._bottomBar.visible = false;
            }
            var _loc2_:Sprite = new Sprite();
            _loc2_.graphics.beginFill(16777215, 1);
            _loc2_.graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
            _loc2_.graphics.endFill();
            _loc2_.mouseEnabled = false;
            _loc2_.mouseChildren = false;
            this._creatureButtonsMC.addChild(_loc2_);
            this.m_creatureContainer.mask = _loc2_;
            var _loc3_:ScrollSetV = new ScrollSetV(this.m_creatureContainer, _loc2_, true);
            _loc3_.x = 202 - _loc3_.width;
            _loc3_.y = 22;
            this._creatureButtonsMC.addChild(_loc3_);
        }

        private function setupChampionButtons(param1:DisplayObjectContainer):Array {
            var _loc3_:int = 0;
            var _loc4_:int = 0;
            var _loc5_:Boolean = false;
            var _loc6_:int = 0;
            var _loc7_:int = 0;
            var _loc8_:MovieClip = null;
            var _loc2_:int = int(GLOBAL._playerGuardianData.length);
            while (_loc7_ < _loc2_) {
                if (Boolean(GLOBAL._playerGuardianData[_loc7_]) && GLOBAL._playerGuardianData[_loc7_].hp.Get() > 0) {
                    if ((_loc6_ = !!GLOBAL._playerGuardianData[_loc7_].status ? int(GLOBAL._playerGuardianData[_loc7_].status) : ChampionBase.k_CHAMPION_STATUS_NORMAL) == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                        if (_loc5_ && GLOBAL._playerGuardianData[_loc7_].t != 5) {
                            LOGGER.Log("log", "User is initializing combat with more than one normal champ.");
                        }
                        else if (GLOBAL._loadmode == GLOBAL.mode || GLOBAL._loadmode != GLOBAL.mode && !MAPROOM_DESCENT.DescentPassed) {
                            if (GLOBAL._playerGuardianData[_loc7_].t != 5) {
                                _loc5_ = true;
                            }
                            (_loc8_ = param1.addChild(new CHAMPIONBUTTON("G" + GLOBAL._playerGuardianData[_loc7_].t, GLOBAL._playerGuardianData[_loc7_].l.Get(), _loc7_, _loc3_, this._creatureButtonsMC)) as CHAMPIONBUTTON).x = 14;
                            _loc8_.y = 34 + _loc3_ * 53;
                            _loc8_.addEventListener(UI_TOP.CREATUREBUTTONOVER, this.sortCreatureButtons);
                            this._creatureButtons.push(_loc8_);
                            _loc3_++;
                            _loc4_++;
                        }
                    }
                }
                _loc7_++;
            }
            if (_loc8_) {
                this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, _loc8_.y + _loc8_.height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
            }
            return [_loc3_, _loc4_];
        }

        private function setupCreatureButtons(param1:DisplayObjectContainer, param2:int, param3:int):void {
            var _loc6_:String = null;
            var _loc7_:int = 0;
            var _loc8_:MovieClip = null;
            var _loc9_:Array = null;
            var _loc10_:String = null;
            var _loc4_:Object = CREATURELOCKER._creatures;
            var _loc5_:Boolean = MapRoomManager.instance.isInMapRoom3;
            for (_loc6_ in _loc4_) {
                _loc7_ = int(_loc6_.substr(_loc6_.length - 1));
                _loc9_ = ATTACK._curCreaturesAvailable;
                if (ATTACK._curCreaturesAvailable[_loc6_]) {
                    _loc10_ = _loc6_;
                    if (ATTACK._curCreaturesAvailable[_loc10_] > 0) {
                        (_loc8_ = param1.addChild(new CREATUREBUTTON(_loc10_, param2, this._creatureButtonsMC)) as CREATUREBUTTON).x = 14;
                        _loc8_.y = 34 + param2 * 53;
                        if (MapRoomManager.instance.isInMapRoom2or3) {
                            _loc8_.addEventListener(UI_TOP.CREATUREBUTTONOVER, this.sortCreatureButtons);
                        }
                        this._creatureButtons.push(_loc8_);
                        param2++;
                    }
                }
            }
            if (_loc8_) {
                this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, _loc8_.y + _loc8_.height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
            }
        }

        private function sortCreatureButtons(param1:Event = null):void {
            this._creatureButtonsMC.addChild(param1.target as DisplayObject);
        }

        private function InfoShow(param1:MouseEvent):void {
            mc.mcPoints.gotoAndStop(2);
            var _loc2_:Object = BASE.BaseLevel();
            mc.mcPoints.tInfo.htmlText = KEYS.Get("pop_experiencebar", {
                        "v1": GLOBAL.FormatNumber(_loc2_.points),
                        "v2": GLOBAL.FormatNumber(_loc2_.needed),
                        "v3": _loc2_.level + 1
                    });
        }

        private function InfoHide(param1:MouseEvent):void {
            mc.mcPoints.gotoAndStop(1);
        }

        public function resize(param1:Rectangle):void {
            var _loc2_:uint = 0;
            var _loc3_:uint = 0;
            x = param1.x + 10;
            y = param1.y + 4;
            mcProtected.x = param1.width - 125;
            mcReinforcements.x = param1.width - 125;
            mcSpecialEvent.x = param1.width - 125;
            mcBuffHolder.x = param1.width - 200;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                mcZoom.x = param1.width - 38 - 24;
                mcFullscreen.x = param1.width - 38;
                mcSound.x = param1.width - 38 - 24;
                mcMusic.x = param1.width - 38;
                mcSave.x = param1.width - 38 - 24;
            }
            else {
                mcZoom.x = param1.width - 130;
                mcFullscreen.x = param1.width - 100;
                mcSound.x = param1.width - 70;
                mcMusic.x = param1.width - 40;
                mcSave.x = param1.width - 160;
            }
            if (this._descentDebuff) {
                this._descentDebuff.x = param1.width - 160;
            }
            this.ioSwitchButton();
            if (this.m_creatureContainer) {
                _loc2_ = this._creatureButtons.length;
                if (_loc2_) {
                    while (_loc3_ < _loc2_) {
                        this._creatureButtons[_loc3_].x = 14;
                        this._creatureButtons[_loc3_].y = 34 + _loc3_ * 53;
                        _loc3_++;
                    }
                    this._creatureButtonsMC._mc._bottomBar.y = Math.min(GLOBAL._SCREEN.height - 450, this._creatureButtons[_loc2_ - 1].y + this._creatureButtons[_loc2_ - 1].height - this._creatureButtonsMC._mc._bottomBar.height * 0.8);
                }
                (this.m_creatureContainer.mask as Sprite).graphics.clear();
                (this.m_creatureContainer.mask as Sprite).graphics.beginFill(16777215, 1);
                (this.m_creatureContainer.mask as Sprite).graphics.drawRect(0, 22, 200, GLOBAL._SCREEN.height - 476);
                (this.m_creatureContainer.mask as Sprite).graphics.endFill();
                this.m_creatureContainer.mask = this.m_creatureContainer.mask;
                this.m_scrollBar.checkResize();
            }
        }

        public function Clear():void {
            var _loc1_:int = 0;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                if (mc.mcPoints) {
                    mc.mcPoints.removeEventListener(MouseEvent.MOUSE_OVER, this.InfoShow);
                    mc.mcPoints.removeEventListener(MouseEvent.MOUSE_OUT, this.InfoHide);
                }
                _loc1_ = 1;
                while (_loc1_ < 5) {
                    if (mc["mcR" + _loc1_]) {
                        if (mc["mcR" + _loc1_].mcHit) {
                            mc["mcR" + _loc1_].mcHit.removeEventListener(MouseEvent.MOUSE_OVER, this.StatsShow(_loc1_, false));
                            mc["mcR" + _loc1_].mcHit.removeEventListener(MouseEvent.MOUSE_OUT, this.StatsHide);
                        }
                        if (mc["mcR" + _loc1_].bAdd) {
                            mc["mcR" + _loc1_].bAdd.removeEventListener(MouseEvent.CLICK, this.Topup(_loc1_));
                        }
                    }
                    _loc1_++;
                }
                if (Boolean(mc.mcR5) && Boolean(mc.mcR5.bAdd)) {
                    mc.mcR5.bAdd.removeEventListener(MouseEvent.CLICK, BUY.Show);
                }
                if (Boolean(mc.mcOutposts) && Boolean(mc.mcOutposts.mcHit) && Boolean(mc.mcOutposts.bNext)) {
                    mc.mcOutposts.mcHit.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.mcOutposts.mcHit.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                    mc.mcOutposts.bNext.removeEventListener(MouseEvent.CLICK, ioNextClick);
                }
                if (mc.bInvite) {
                    mc.bInvite.removeEventListener(MouseEvent.CLICK, this.ButtonClick("invite"));
                    mc.bInvite.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bInvite.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                if (mc.bGift) {
                    mc.bGift.removeEventListener(MouseEvent.CLICK, this.ButtonClick("gift"));
                    mc.bGift.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bGift.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                if (mc.bInbox) {
                    mc.bInbox.removeEventListener(MouseEvent.CLICK, this.ButtonClick("inbox"));
                    mc.bInbox.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bInbox.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                if (mc.bAlert) {
                    mc.bAlert.removeEventListener(MouseEvent.CLICK, this.ButtonClick("alert"));
                    mc.bAlert.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bAlert.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                if (mc.bEarn) {
                    mc.bEarn.removeEventListener(MouseEvent.CLICK, this.ButtonClick("earn"));
                    mc.bEarn.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bEarn.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                if (Boolean(mc.bDailyDeal) && GLOBAL._flags.showFBCDaily == 1) {
                    mc.bDailyDeal.removeEventListener(MouseEvent.CLICK, this.ButtonClick("daily"));
                    mc.bDailyDeal.removeEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                    mc.bDailyDeal.removeEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                }
                removeEventListener(Event.ENTER_FRAME, onSpinnerTick);
            }
            else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
            }
        }

        public function ClearSiegeWeapon():void {
            if (Boolean(this._siegeweapon) && Boolean(this._siegeweapon.parent)) {
                this._siegeweapon.parent.removeChild(this._siegeweapon);
                this._siegeweapon = null;
            }
        }

        public function Topup(param1:int):Function {
            var n:int = param1;
            return function(param1:MouseEvent = null):void {
                var _loc2_:* = Math.min((n - 1) * 0.4, 1);
                if (BASE.isInfernoMainYardOrOutpost) {
                    STORE.ShowB(2, _loc2_, ["BR" + n + "1I", "BR" + n + "2I", "BR" + n + "3I"]);
                }
                else {
                    STORE.ShowB(2, _loc2_, ["BR" + n + "1", "BR" + n + "2", "BR" + n + "3"]);
                }
            };
        }

        public function Setup():void {
            var onImageLoad:Function;
            var LoadImageError:Function;
            var loader:Loader = null;
            var mode:String = GLOBAL.mode;
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) {
                onImageLoad = function(param1:Event):void {
                    loader.width = loader.height = 50;
                    mc.mcPic.mcBG.addChild(loader);
                };
                LoadImageError = function(param1:IOErrorEvent):void {
                };
                if (BASE._ownerName) {
                    if (BASE._ownerName.toLowerCase().charAt(BASE._ownerName.length - 1) == "s") {
                        mc.mcPoints.tName.htmlText = KEYS.Get("uitop_yardownershort", {"v1": BASE._ownerName.toUpperCase()});
                    }
                    else {
                        mc.mcPoints.tName.htmlText = KEYS.Get("uitop_yardownerlong", {"v1": BASE._ownerName.toUpperCase()});
                    }
                }
                else if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                    mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonsters");
                }
                else {
                    mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonstersinferno");
                }
                loader = new Loader();
                loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                if (GLOBAL._loadmode == "wmattack" || GLOBAL._loadmode == "wmview" || GLOBAL._loadmode == "iwmattack" || GLOBAL._loadmode == "iwmview") {
                    loader.load(new URLRequest(GLOBAL.ioVersioned(GLOBAL._storageURL + BASE._ownerPic)));
                }
                else if (Boolean(!GLOBAL._flags.viximo) || Boolean(!GLOBAL._flags.kongregate)) {
                    loader.load(new URLRequest(BASE._ownerPic));
                }
                else {
                    loader.load(new URLRequest("http://graph.facebook.com/" + BASE._loadedFBID + "/picture"));
                }
            }
            else if (GLOBAL.mode == GLOBAL._loadmode && !GLOBAL.INFERNO_ONLY) {
                mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonsters");
            }
            else {
                mc.mcPoints.tName.htmlText = KEYS.Get("uitop_backyardmonstersinferno");
            }
            if ((GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK) && !MAPROOM_DESCENT.DescentPassed) {
                if (BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT.DescentPassed) {
                    this.DescentDebuffShow();
                }
                else {
                    this.DescentDebuffHide();
                }
            }
        }

        public function addIcon(param1:DisplayObject):void {
            // The only caller is the King of the Hill (Krallen) HUD icon: an overworld feature.
            if (Boolean(mc) && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.INFERNO_ONLY) {
                param1.x = 222;
                param1.y = 0;
                this._kothIcon = mc.addChild(param1);
                mc.mcR5.x = 284;
                mc.bEarn.x = 415;
                mc.bDealSpot.x = 502;
                mc.bDailyDeal.x = 493;
            }
        }

        public function removeIcon(param1:DisplayObject):void {
            if (Boolean(mc) && mc.contains(param1)) {
                mc.removeChild(param1);
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    mc.mcR5.x = 227;
                    mc.bEarn.x = 358;
                    mc.bDailyDeal.x = 436;
                    mc.bDealSpot.x = 445;
                }
            }
            if (this._kothIcon) {
                if (this._kothIcon.parent) {
                    this._kothIcon.parent.removeChild(this._kothIcon);
                }
                this._kothIcon = null;
            }
        }

        public function addResourceBar(param1:DisplayObject):void {
            var _loc2_:MovieClip = null;
            if (Boolean(mc) && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.usesInfernoBackend) {
                if (MapRoomManager.instance.isInMapRoom2) {
                    _loc2_ = mc.mcOutposts;
                }
                else {
                    _loc2_ = mc.mcR4;
                }
                param1.x = -4;
                param1.y = _loc2_.y + 37;
                this._daveClub = mc.addChild(param1);
                ++this.extraResourceRows;
                this.Update();
            }
        }

        public function removeResourceBar(param1:DisplayObject):void {
            if (Boolean(mc) && mc.contains(param1)) {
                mc.removeChild(param1);
                if (this.extraResourceRows > 0) {
                    --this.extraResourceRows;
                }
            }
            if (this._daveClub) {
                if (this._daveClub.parent) {
                    this._daveClub.parent.removeChild(this._daveClub);
                }
                this._daveClub = null;
            }
            this.Update();
        }

        public function BombSelect(param1:int):Function {
            var n:int = param1;
            return function(param1:MouseEvent = null):void {
                MonsterDeselect();
                BombDeselect();
            };
        }

        public function BombDeselect():void {
        }

        public function MonsterDeselect():void {
            var _loc1_:String = null;
            var _loc2_:int = 0;
            for (_loc1_ in ATTACK._flingerBucket) {
                if (Boolean(ATTACK._flingerBucket[_loc1_]) && ATTACK._flingerBucket[_loc1_].Get() > 0) {
                    ATTACK._curCreaturesAvailable[_loc1_].Add(ATTACK._flingerBucket[_loc1_].Get());
                    ATTACK._flingerBucket[_loc1_].Set(0);
                }
            }
            ATTACK.BucketUpdate();
            _loc2_ = 0;
            while (_loc2_ < this._creatureButtons.length) {
                this._creatureButtons[_loc2_].Update();
                _loc2_++;
            }
        }

        public function StatsShow(param1:int, param2:Boolean):Function {
            var n:int = param1;
            var topup:Boolean = param2;
            return function(param1:MouseEvent):void {
                var _loc2_:* = undefined;
                var _loc3_:* = undefined;
                var _loc5_:* = undefined;
                var _loc6_:* = undefined;
                var _loc7_:* = undefined;
                var _loc8_:* = undefined;
                if (n < 5) {
                    if (topup) {
                        _loc2_ = "<b><font size=\"12\">" + KEYS.Get(GLOBAL._resourceNames[n - 1]) + "</font></b><br><b>" + KEYS.Get("bubble_topup") + "</b>";
                        _loc3_ = 2;
                    }
                    else if (MapRoomManager.instance.isInMapRoom2or3) {
                        _loc5_ = BaseBuffHandler.instance.getBuffByName(AutoBankBaseBuff.k_NAME) as AutoBankBaseBuff;
                        _loc6_ = MapRoomManager.instance.isInMapRoom3 && _loc5_ ? _loc5_.value * 3600 : BASE.getEmpireResources(n);
                        if (BASE.yardType === EnumYardType.RESOURCE) {
                            _loc7_ = InstanceManager.getInstancesByClass(ResourceOutpost)[0] as ResourceOutpost;
                        }
                        _loc8_ = MapRoomManager.instance.isInMapRoom3 && _loc7_ ? _loc7_.resourcesPerSecond * 3600 : BASE._resources["r" + n + "Rate"];
                        _loc2_ = KEYS.Get("pop_resource2", {
                                    "v1": KEYS.Get(GLOBAL._resourceNames[n - 1]),
                                    "v2": GLOBAL.FormatNumber(BASE._resources["r" + n + "max"]),
                                    "v3": GLOBAL.FormatNumber(_loc8_),
                                    "v4": GLOBAL.FormatNumber(_loc6_)
                                });
                        _loc3_ = 4;
                    }
                    else {
                        _loc2_ = "<b><font size=\"12\">" + KEYS.Get(GLOBAL._resourceNames[n - 1]) + "</font></b><br>" + KEYS.Get("pop_resource", {
                                    "v1": GLOBAL.FormatNumber(BASE._resources["r" + n + "max"]),
                                    "v2": GLOBAL.FormatNumber(BASE._resources["r" + n + "Rate"])
                                });
                        _loc3_ = 3;
                    }
                }
                else {
                    _loc2_ = "<b>" + KEYS.Get("bubble_getshiny") + "</b>";
                    _loc3_ = 2;
                }
                var _loc4_:* = mc["mcR" + n];
                BubbleShow(_loc4_.x + 135, _loc4_.y + int(_loc4_.height * 0.5), _loc2_, _loc3_);
            };
        }

        public function StatsHide(param1:MouseEvent):void {
            this.BubbleHide();
        }

        public function OverchargeShow(param1:int):void {
            if (!this._popupWarning) {
                this._popupWarning = addChild(new bubblepopup4()) as bubblepopup4;
            }
            this._popupWarning.tA.htmlText = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("inf_ui_needmoreroom") : KEYS.Get("ui_needmoreroom");
            this._popupWarning.x = 150;
            this._popupWarning.y = 20 + 41 * param1;
            this._popupWarning.Wobble();
        }

        public function OverchargeHide():void {
            if (this._popupWarning) {
                removeChild(this._popupWarning);
                this._popupWarning = null;
            }
        }

        public function UpdateTweenResourceText(param1:Number):void {
            var _loc3_:int = 0;
            var _loc4_:MovieClip = null;
            var _loc5_:Number = NaN;
            var _loc6_:Number = NaN;
            var _loc2_:int = param1;
            _loc5_ = Number((_loc4_ = mc["mcR" + _loc2_])._resource);
            this.ioSetText(_loc4_.tR, GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + GLOBAL.FormatNumber(_loc5_) + "</b>");
            _loc3_ = 90 / BASE._resources["r" + _loc2_ + "max"] * _loc5_;
            if (_loc3_ > 90) {
                _loc3_ = 90;
            }
            if (_loc4_.mcBar.width != _loc3_) {
                _loc4_.mcBar.width = _loc3_;
            }
        }

        /**
         * Counts a resource up or down to its new amount (half a second). This ran every second for all four
         * even when nothing had changed, laying the text out again on every frame of it.
         */
        private function ioTweenResource(index:int, amount:Number):void {
            var clip:MovieClip = mc["mcR" + index];
            if (Number(clip._resource) == amount) {
                this.UpdateTweenResourceText(index); // the bar still follows a new storage size
                return;
            }
            TweenLite.to(clip, 0.5, {
                        "_resource": amount,
                        "onUpdate": this.UpdateTweenResourceText,
                        "onUpdateParams": [index],
                        "ease": Linear.easeNone,
                        "overwrite": 1
                    });
        }

        /** Sets a text only when it changes (every set lays the text out again). */
        private function ioSetText(field:TextField, html:String):void {
            if (field && this._ioTexts[field] !== html) {
                field.htmlText = html;
                this._ioTexts[field] = html;
                ioFit(field);
            }
        }

        /**
         * Inferno-only: a counter's number kept on its one line. From 50,000,000 the bar's field is too narrow
         * and its last digit wrapped under it ("50,000,00"); such a number is drawn a little smaller instead.
         */
        private static function ioFit(field:TextField):void {
            GLOBAL.ioFitText(field);
        }

        /** The text last set on each field (ioSetText). */
        private var _ioTexts:Dictionary = new Dictionary(true);

        /** The login streak as the server last sent it (flag io_streak), or null. */
        private static function ioStreak():Object {
            var raw:String = GLOBAL._flags && GLOBAL._flags.io_streak ? String(GLOBAL._flags.io_streak) : "";
            if (raw == "") {
                return null;
            }
            try {
                return JSON.parse(raw);
            }
            catch (e:Error) {
            }
            return null;
        }

        /**
         * Inferno-only: the gift button is the Daily Reward button. Its badge shows the streak day; while
         * today's reward is waiting the badge shows the day to collect and the alert ring spins, like the
         * notification buttons. Clicking opens the reward (BASE.ioOpenDaily).
         */
        private function ioDailyButton():void {
            var status:Object = ioStreak();
            var own:Boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
            if (!status || !own || TUTORIAL._stage < 200) {
                mc.bGift.visible = false;
                return;
            }
            var waiting:Boolean = int(status.collected) != 1;
            mc.bGift.visible = true;
            mc.bGift.mcSpinner.visible = waiting;
            mc.bGift.mcCounter.visible = true;
            mc.bGift.mcCounter.t.htmlText = "<b>" + (waiting ? int(status.offerDay) : int(status.day)) + "</b>";
        }

        private var _ioSwitch:Sprite = null;

        private var _ioGauntlet:MovieClip = null;

        /**
         * Inferno-only: Moloch's Gauntlet's button (com/monsters/maproom_advanced/IoGauntlet.as), with the
         * top bar's icons: Moloch in a gold ring, which turns (like the other buttons' alert ring) while the
         * event is open and not beaten yet.
         */
        private function ioMakeGauntletButton():MovieClip {
            // Drawn round the same middle as the column's other buttons (Invite, Daily Reward, Mail: their
            // hit area is 62 pixels from -10, so the middle is at 20.75), the same size.
            var C:Number = 20.75;
            var b:MovieClip = new MovieClip();
            b.name = "ioGauntlet";
            b.buttonMode = true;
            b.mouseChildren = false;
            var hit:Shape = new Shape();
            hit.graphics.beginFill(0xFFFFFF, 0);
            hit.graphics.drawCircle(C, C, 31);
            hit.graphics.endFill();
            b.addChild(hit);
            b.graphics.lineStyle(3, 0x6B4A12, 1);
            b.graphics.beginFill(0xE2B227, 1);
            b.graphics.drawCircle(C, C, 25);
            b.graphics.endFill();
            var picture:Sprite = new Sprite();
            var round:Shape = new Shape();
            round.graphics.beginFill(0xFF0000, 1);
            round.graphics.drawCircle(C, C, 21);
            round.graphics.endFill();
            b.addChild(picture);
            b.addChild(round);
            picture.mask = round;
            ImageCache.GetImageWithCallBack("monsters/tribe_moloch_50.jpg", function(key:String, bmd:BitmapData, args:Array = null):void {
                    var image:Bitmap = new Bitmap(bmd);
                    image.smoothing = true;
                    image.width = image.height = 46;
                    image.x = image.y = C - 23;
                    picture.addChild(image);
                });
            var spinner:Shape = new Shape();
            spinner.graphics.lineStyle(3, 0xFF3A1A, 1);
            for (var i:int = 0; i < 8; i++) {
                var from:Number = i * Math.PI / 4;
                spinner.graphics.moveTo(Math.cos(from) * 30, Math.sin(from) * 30);
                for (var s:int = 1; s <= 4; s++) {
                    spinner.graphics.lineTo(Math.cos(from + s * Math.PI / 20) * 30, Math.sin(from + s * Math.PI / 20) * 30);
                }
            }
            spinner.x = spinner.y = C;
            spinner.visible = false;
            b.addChild(spinner);
            b.mcSpinner = spinner;
            b.visible = false;
            b.addEventListener(MouseEvent.CLICK, IoGauntlet.Show);
            // its tip points left from the right-hand column, like the workers' own
            b.addEventListener(MouseEvent.MOUSE_OVER, function(e:MouseEvent):void {
                    UI_WORKERS.ioShowTip(b, ioGauntletTip());
                });
            b.addEventListener(MouseEvent.MOUSE_OUT, function(e:MouseEvent):void {
                    UI_WORKERS.PopupHide();
                });
            // In the workers' column on the right, under the fifth worker with a gap (it used to be the last
            // of the icon row on the left, under Mail).
            UI_WORKERS.ioAddUnderWorkers(b);
            this._ioGauntlet = b;
            return b;
        }

        private static function ioGauntletTip():String {
            var ioG:Object = IoGauntlet.flag();
            return "<b>Moloch's Gauntlet</b><br>" + (!ioG ? "The monthly event." : !ioG.open ? "Closed. It opens on the 1st of the month." : int(ioG.stage) > int(ioG.stages) ? "You beat it this month!" : "Open now! Stage " + int(ioG.stage) + " of " + int(ioG.stages) + ".");
        }

        private var _ioHfo:MovieClip = null;

        /**
         * Hell Freezes Over's button (com/monsters/events/hfo): the frozen flame in an ice ring, under Moloch's
         * Gauntlet's, from Day 3 of the event (hidden before: the ice is still a mystery). It opens the event's
         * window; its ring turns while a wave waits to be fought.
         */
        private function ioMakeHfoButton():MovieClip {
            var C:Number = 20.75;
            var b:MovieClip = new MovieClip();
            b.name = "ioHfo";
            b.buttonMode = true;
            b.mouseChildren = false;
            var hit:Shape = new Shape();
            hit.graphics.beginFill(0xFFFFFF, 0);
            hit.graphics.drawCircle(C, C, 31);
            hit.graphics.endFill();
            b.addChild(hit);
            b.graphics.lineStyle(3, 0x1A4A7A, 1);
            b.graphics.beginFill(0x9ADCFF, 1);
            b.graphics.drawCircle(C, C, 25);
            b.graphics.endFill();
            var picture:Sprite = new Sprite();
            b.addChild(picture);
            ImageCache.GetImageWithCallBack("hfo/extras/event_icon_80.png", function(key:String, bmd:BitmapData, args:Array = null):void {
                    var image:Bitmap = new Bitmap(bmd);
                    image.smoothing = true;
                    image.width = image.height = 46;
                    image.x = image.y = C - 23;
                    picture.addChild(image);
                });
            var spinner:Shape = new Shape();
            spinner.graphics.lineStyle(3, 0x7FE0FF, 1);
            for (var i:int = 0; i < 8; i++) {
                var from:Number = i * Math.PI / 4;
                spinner.graphics.moveTo(Math.cos(from) * 30, Math.sin(from) * 30);
                for (var s:int = 1; s <= 4; s++) {
                    spinner.graphics.lineTo(Math.cos(from + s * Math.PI / 20) * 30, Math.sin(from + s * Math.PI / 20) * 30);
                }
            }
            spinner.x = spinner.y = C;
            spinner.visible = false;
            b.addChild(spinner);
            b.mcSpinner = spinner;
            b.visible = false;
            b.addEventListener(MouseEvent.CLICK, IoHfoUi.ShowWindow);
            b.addEventListener(MouseEvent.MOUSE_OVER, function(e:MouseEvent):void {
                    UI_WORKERS.ioShowTip(b, "<b>" + KEYS.Get("hfo_event_title") + "</b>");
                });
            b.addEventListener(MouseEvent.MOUSE_OUT, function(e:MouseEvent):void {
                    UI_WORKERS.PopupHide();
                });
            UI_WORKERS.ioAddUnderGauntlet(b);
            this._ioHfo = b;
            return b;
        }

        private function ioHfoButton():void {
            if (!this._ioHfo) {
                return;
            }
            var f:Object = IoHfo.flag();
            this._ioHfo.visible = IoHfo.buttonShown() && TUTORIAL._stage >= 200;
            this._ioHfo.mcSpinner.visible = this._ioHfo.visible && int(f.day) >= 4 && !(Number(f.done) > 0) && int(f.current) <= 13;
            UI_WORKERS.ioPlaceExtra();
        }

        /** Shown on the main yard (not outposts, not while attacking or visiting) when the server runs the event. */
        private function ioGauntletButton():void {
            this.ioHfoButton();
            if (!this._ioGauntlet) {
                return;
            }
            var status:Object = IoGauntlet.flag();
            var own:Boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard && !BASE.isOutpost;
            this._ioGauntlet.visible = Boolean(status) && own && TUTORIAL._stage >= 200;
            this._ioGauntlet.alpha = status && status.open ? 1 : 0.6;
            this._ioGauntlet.mcSpinner.visible = this._ioGauntlet.visible && status && status.open && int(status.stage) <= int(status.stages);
            // (Hell Freezes Over's button moves up into the Gauntlet's place while that one is hidden)
            UI_WORKERS.ioPlaceExtra();
        }

        /**
         * Inferno-only: the Switch account button, a round gold button left of save / zoom / full screen /
         * sound / music, on the player's own yards (not during attacks). GAME.ioSwitchAccount does the rest.
         */
        private function ioSwitchButton():void {
            var own:Boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            if (!this._ioSwitch) {
                this._ioSwitch = new Sprite();
                this._ioSwitch.name = "ioSwitch";
                this._ioSwitch.addChild(new Bitmap(new io_switch_account(0, 0)));
                this._ioSwitch.buttonMode = true;
                this._ioSwitch.mouseChildren = false;
                this._ioSwitch.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                        e.stopPropagation();
                        try {
                            GAME.ioSwitchAccount();
                        }
                        catch (err:Error) {
                            LOGGER.Log("err", "Switch account: " + err.message);
                        }
                    });
                this._ioSwitch.addEventListener(MouseEvent.MOUSE_OVER, this.ButtonInfoShow);
                this._ioSwitch.addEventListener(MouseEvent.MOUSE_OUT, this.ButtonInfoHide);
                addChild(this._ioSwitch);
            }
            this._ioSwitch.visible = own;
            this._ioSwitch.x = mcSave.x - 30;
            this._ioSwitch.y = mcSave.y;
            // Kept on top: clips added to the top bar later (buff and status holders) must not cover it.
            if (this._ioSwitch.parent == this && getChildIndex(this._ioSwitch) != numChildren - 1) {
                setChildIndex(this._ioSwitch, numChildren - 1);
            }
        }

        // ---- Inferno-only: the top bar's shortcuts (the user's, 4 October, evening)
        //
        // Alliances, Attack Log, Leaderboard, Change Log, right of the Shiny counter, each drawn like that counter:
        // its stone bar behind (the counter's own art, stretched to fit), a picture on the left over the bar's end,
        // the name over the bar in the counter's lettering. On the player's own yards in build mode. A screen too
        // narrow for the names (on a phone: one reaching the page's menu button at the top centre) shows them as
        // badges, just their gold pictures with no names; the Shiny counter keeps its own. (They were small square badges until then, with no names;
        // there was no Alliances one.)

        private var _ioLeaderboards:Sprite = null;

        private var _ioAttackLogs:Sprite = null;

        private var _ioChangelog:Sprite = null;

        private var _ioAlliances:Sprite = null;

        /** The bars, in their order. */
        private var _ioBars:Array = null;

        /** The counter's bar at its own size (drawn once), cut in three to stretch the middle only. */
        private static var _ioBarArt:BitmapData = null;

        private var _ioBarsCompact:int = -1;

        /** Where the top bar's next button goes: right of the last shortcut bar showing, or of the Shiny counter. */
        private function ioAfterShiny():Number {
            var right:Number = this.ioShinyRight();
            for each (var b:Sprite in this._ioBars || []) {
                if (b && b.visible) {
                    right = Math.max(right, b.x + this.ioBarWidth(b));
                }
            }
            return right + 8;
        }

        private function ioShinyRight():Number {
            var r5:MovieClip = mc.mcR5;
            // (right of the counter's box: its hidden "+" would leave a gap)
            return r5.mcBG && r5.bAdd && !r5.bAdd.visible ? r5.x + r5.mcBG.x + r5.mcBG.width : r5.x + r5.width;
        }

        private function ioBarWidth(b:Sprite):Number {
            return Number(b["ioW"]) || b.width;
        }

        /** Hides every shortcut bar (not in build mode). */
        private function ioHideBars():void {
            for each (var b:Sprite in this._ioBars || []) {
                if (b) {
                    b.visible = false;
                }
            }
        }

        private function ioBarArt():BitmapData {
            if (_ioBarArt) {
                return _ioBarArt;
            }
            var bg:MovieClip = mc.mcR5 ? mc.mcR5.mcBG : null;
            var art:DisplayObject = bg && bg.numChildren ? bg.getChildAt(0) : bg;
            if (!art || art.width < 4 || art.height < 4) {
                return null;
            }
            var r:Rectangle = art.getBounds(art);
            _ioBarArt = new BitmapData(Math.ceil(r.width), Math.ceil(r.height), true, 0);
            _ioBarArt.draw(art, new Matrix(1, 0, 0, 1, -r.x, -r.y), null, null, null, true);
            return _ioBarArt;
        }

        /** The counter's bar `w` wide (its ends kept, the middle stretched), as high as the counter's. */
        private function ioDrawBar(holder:Sprite, w:Number):void {
            while (holder.numChildren) {
                holder.removeChildAt(0);
            }
            var art:BitmapData = this.ioBarArt();
            var h:Number = mc.mcR5 && mc.mcR5.mcBG ? mc.mcR5.mcBG.height : 33;
            if (!art) {
                // (no art to copy: a dark rounded bar)
                var s:Shape = new Shape();
                s.graphics.lineStyle(1.5, 0x6A6A6A, 1);
                s.graphics.beginFill(0x2E2E2E, 0.95);
                s.graphics.drawRoundRect(0, 0, w, h, 10, 10);
                s.graphics.endFill();
                holder.addChild(s);
                return;
            }
            var scale:Number = h / art.height;
            var cap:int = Math.min(int(art.width / 3), Math.ceil(18 / Math.max(0.1, scale)));
            var parts:Array = [[0, cap], [cap, art.width - 2 * cap], [art.width - cap, cap]];
            var capW:Number = cap * scale;
            var x:Number = 0;
            for (var i:int = 0; i < 3; i++) {
                var piece:BitmapData = new BitmapData(int(parts[i][1]), art.height, true, 0);
                piece.copyPixels(art, new Rectangle(int(parts[i][0]), 0, int(parts[i][1]), art.height), new Point(0, 0));
                var bm:Bitmap = new Bitmap(piece);
                bm.smoothing = true;
                bm.height = h;
                bm.width = i == 1 ? Math.max(1, w - 2 * capW) : capW;
                bm.x = x;
                x += bm.width;
                holder.addChild(bm);
            }
        }

        /** The counter's lettering (font, size, colour, outline) for a bar's name. */
        private function ioBarLabel(text:String):TextField {
            var t:TextField = new TextField();
            var src:TextField = mc.mcR5 ? mc.mcR5.tR : null;
            var format:TextFormat = src ? src.defaultTextFormat : new TextFormat("Verdana", 12, 0xFFFFFF, true);
            format.align = "left";
            t.selectable = false;
            t.mouseEnabled = false;
            t.embedFonts = src ? src.embedFonts : false;
            t.defaultTextFormat = format;
            t.autoSize = TextFieldAutoSize.LEFT;
            t.text = text;
            if (src && src.filters) {
                t.filters = src.filters;
            }
            return t;
        }

        /**
         * A shortcut bar: `icon` (a Sprite to draw or load the picture into, about 38 x 38) on the left, `label` on
         * the bar; `onClick`; a tip of `tipTitle` / `tipText`.
         */
        private function ioMakeBar(name:String, label:String, icon:Sprite, onClick:Function, tipTitle:String, tipText:String):Sprite {
            var b:MovieClip = new MovieClip(); // (a MovieClip: it keeps its sizes as properties)
            b.name = name;
            b.buttonMode = true;
            b.mouseChildren = false;
            var bar:Sprite = new Sprite();
            bar.name = "bar";
            b.addChild(bar);
            var text:TextField = this.ioBarLabel(label);
            text.name = "label";
            b.addChild(text);
            icon.name = "icon";
            b.addChild(icon);
            b["ioLabelW"] = text.width;
            b.addEventListener(MouseEvent.CLICK, function(e:MouseEvent):void {
                    e.stopPropagation();
                    UI_WORKERS.PopupHide();
                    onClick(e);
                });
            b.addEventListener(MouseEvent.MOUSE_OVER, function(e:MouseEvent):void {
                    b.filters = [new GlowFilter(0xFFC94A, 0.8, 8, 8, 2)];
                    UI_WORKERS.ioShowTip(b, "<b>" + tipTitle + "</b><br>" + tipText);
                });
            b.addEventListener(MouseEvent.MOUSE_OUT, function(e:MouseEvent):void {
                    b.filters = [];
                    UI_WORKERS.PopupHide();
                });
            mc.addChild(b);
            return b;
        }

        /** Lays a bar out: with its name (`compact` false) or as just its picture. */
        private function ioShapeBar(b:Sprite, compact:Boolean):void {
            var h:Number = mc.mcR5 && mc.mcR5.mcBG ? mc.mcR5.mcBG.height : 33;
            var text:TextField = b.getChildByName("label") as TextField;
            var bar:Sprite = b.getChildByName("bar") as Sprite;
            var w:Number = compact ? 38 : Math.ceil(30 + Number(b["ioLabelW"]) + 10);
            if (b["ioShaped"] != w) {
                b["ioShaped"] = w;
                bar.visible = !compact;
                if (!compact) {
                    this.ioDrawBar(bar, w - 8);
                    bar.x = 8;
                }
                // (the empty parts take the clicks too)
                b.graphics.clear();
                b.graphics.beginFill(0, 0);
                b.graphics.drawRect(0, 0, w, Math.max(h, 38));
                b.graphics.endFill();
            }
            b["ioW"] = w;
            text.visible = !compact;
            text.x = 36;
            text.y = int((h - text.height) / 2) + 1;
        }

        /**
         * The picture of a bar: topbar/<name>.png (server/public/assets/topbar, made by sandbox-tools/topbar-icons.py),
         * gold like the level star and the Shiny coins, 128 px shown at 38.
         */
        private static function ioPictureIcon(name:String):Sprite {
            var icon:Sprite = new Sprite();
            ImageCache.GetImageWithCallBack("topbar/" + name + ".png", function(key:String, bmd:BitmapData, args:Array = null):void {
                    var image:Bitmap = new Bitmap(bmd);
                    image.smoothing = true;
                    image.width = image.height = 38;
                    icon.addChild(image);
                });
            icon.filters = [new DropShadowFilter(2, 60, 0, 0.55, 3, 3, 1, 2)];
            return icon;
        }

        /** Makes, shows or hides, and lays out the shortcut bars. */
        private function ioTopBars():void {
            var mine:Boolean = GLOBAL.INFERNO_ONLY && TUTORIAL._stage >= 200 && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD) && !GLOBAL.ioDesignMode();
            if (!mine) {
                this.ioHideBars();
                return;
            }
            if (!this._ioBars) {
                this._ioAlliances = this.ioMakeBar("ioAlliances", KEYS.Get("tb_alliances"), ioPictureIcon("alliances"), function(e:MouseEvent):void {
                        ALLIANCEWINDOW.Show(e);
                    }, KEYS.Get("tb_alliances"), KEYS.Get("tb_alliances_tip"));
                this._ioAttackLogs = this.ioMakeBar("ioAttackLogs", KEYS.Get("tb_attacklog"), ioPictureIcon("attacklog"), function(e:MouseEvent):void {
                        IoAttackLogs.Show(e);
                    }, KEYS.Get("al_title"), KEYS.Get("al_tip"));
                this._ioLeaderboards = this.ioMakeBar("ioLeaderboards", KEYS.Get("tb_leaderboard"), ioPictureIcon("leaderboard"), function(e:MouseEvent):void {
                        IoLeaderboards.Show(e);
                    }, KEYS.Get("lb_title"), KEYS.Get("lb_tip"));
                this._ioChangelog = this.ioMakeBar("ioChangelog", KEYS.Get("tb_changelog"), ioPictureIcon("changelog"), function(e:MouseEvent):void {
                        IoChangelog.Show(e);
                    }, KEYS.Get("cl_title"), KEYS.Get("cl_tip"));
                this._ioBars = [this._ioAlliances, this._ioAttackLogs, this._ioLeaderboards, this._ioChangelog];
            }
            this._ioAlliances.visible = true;
            this._ioAttackLogs.visible = true;
            this._ioLeaderboards.visible = GLOBAL._flags && int(GLOBAL._flags.io_leaderboards) == 1;
            this._ioChangelog.visible = true;
            // with their names when they fit before the buttons on the right of the screen, else just the pictures
            var shown:Array = [];
            var full:Number = 0;
            for each (var b:Sprite in this._ioBars) {
                if (b.visible) {
                    shown.push(b);
                    full += Math.ceil(30 + Number(b["ioLabelW"]) + 10) + 6;
                }
            }
            // (the screen in the stage's terms: on a wide or a phone screen the stage reaches past its 760 both ways)
            var screen:Rectangle = GLOBAL._SCREEN ? GLOBAL._SCREEN : (GLOBAL._ROOT && GLOBAL._ROOT.stage ? new Rectangle(0, 0, GLOBAL._ROOT.stage.stageWidth, 0) : null);
            var room:Number = screen ? mc.globalToLocal(new Point(screen.x + screen.width - 200, 0)).x - this.ioShinyRight() - 8 : 9999;
            if (GLOBAL._flags && int(GLOBAL._flags.io_admin) == 1) {
                room -= 250; // (an admin's Admin, Test and Designer buttons come after them)
            }
            if (GLOBAL.ioOnPhone && screen) {
                // a phone: the page's menu button is at the top centre, over the game; the names stop short of it
                room = Math.min(room, mc.globalToLocal(new Point(screen.x + screen.width / 2 - Math.max(70, screen.width * 0.08), 0)).x - this.ioShinyRight() - 8);
            }
            var compact:Boolean = full > room;
            var x:Number = this.ioShinyRight() + 8;
            var h:Number = mc.mcR5 && mc.mcR5.mcBG ? mc.mcR5.mcBG.height : 33;
            for each (b in shown) {
                this.ioShapeBar(b, compact);
                b.x = x;
                b.y = mc.mcR5.y + (h - 38) / 2 + 1;
                x += this.ioBarWidth(b) + 6;
            }
            this._ioBarsCompact = compact ? 1 : 0;
        }

        private var _ioAdmin:Button_CLIP = null;

        /**
         * Inferno-only: the Admin button, for accounts in InfernoOnlyConfig.admins (flag io_admin). It gets
         * a one-time sign-in code from the server and opens the admin panel in the browser with it.
         */
        public function ioShowAdminButton():void {
            var show:Boolean = GLOBAL.INFERNO_ONLY && GLOBAL._flags && int(GLOBAL._flags.io_admin) == 1;
            if (!show) {
                if (this._ioAdmin) {
                    this._ioAdmin.visible = false;
                }
                return;
            }
            if (!this._ioAdmin) {
                this._ioAdmin = new Button_CLIP();
                this._ioAdmin.Setup("Admin");
                this._ioAdmin.addEventListener(MouseEvent.CLICK, this.ioOpenAdmin);
                mc.addChild(this._ioAdmin);
            }
            this._ioAdmin.visible = true;
            this._ioAdmin.x = this.ioAfterShiny();
            this._ioAdmin.y = mc.mcR5.y;
            // Admin test mode switch, and the test tools while it is on (com/monsters/admin/IoTestMode.as).
            var testOn:Boolean = GLOBAL.ioTestMode();
            if (!this._ioTest) {
                this._ioTest = new Button_CLIP();
                this._ioTest.addEventListener(MouseEvent.CLICK, IoTestMode.ToggleClick);
                mc.addChild(this._ioTest);
            }
            if (this._ioTestShown != (testOn ? 1 : 0)) {
                this._ioTestShown = testOn ? 1 : 0;
                this._ioTest.Setup(testOn ? "Test: ON" : "Test: OFF");
            }
            this._ioTest.x = this._ioAdmin.x + this._ioAdmin.width + 6;
            this._ioTest.y = mc.mcR5.y;
            if (testOn && !this._ioTools) {
                this._ioTools = new Button_CLIP();
                this._ioTools.Setup("Test tools");
                this._ioTools.addEventListener(MouseEvent.CLICK, IoTestMode.ShowTools);
                mc.addChild(this._ioTools);
            }
            if (this._ioTools) {
                this._ioTools.visible = testOn;
                this._ioTools.x = this._ioTest.x + this._ioTest.width + 6;
                this._ioTools.y = mc.mcR5.y;
            }
            // The Designer (com/monsters/admin/IoDesigner.as): kits, wild tribe and Moloch layouts.
            if (!this._ioDesigner) {
                this._ioDesigner = new Button_CLIP();
                this._ioDesigner.Setup("Designer");
                this._ioDesigner.name = "ioDesignerButton";
                this._ioDesigner.addEventListener(MouseEvent.CLICK, IoDesigner.Show);
                mc.addChild(this._ioDesigner);
            }
            this._ioDesigner.visible = true;
            this._ioDesigner.x = (testOn && this._ioTools ? this._ioTools.x + this._ioTools.width : this._ioTest.x + this._ioTest.width) + 6;
            this._ioDesigner.y = mc.mcR5.y;
        }

        private var _ioDesigner:Button_CLIP = null;

        private var _ioDesignBar:Sprite = null;

        private var _ioDesignBarFor:String = null;

        /** The design bar under the top bar while a Designer draft is on screen (GLOBAL.ioDesign). */
        private function ioDesignBar():void {
            var design:Object = GLOBAL.ioDesign();
            var id:String = design ? String(design.kind) + ":" + String(design.key) + ":" + BASE._loadedBaseID : null;
            if (this._ioDesignBar && this._ioDesignBarFor != id) {
                if (this._ioDesignBar.parent) {
                    this._ioDesignBar.parent.removeChild(this._ioDesignBar);
                }
                this._ioDesignBar = null;
            }
            if (!design || GLOBAL._loadmode != GLOBAL.e_BASE_MODE.BUILD) {
                return;
            }
            if (!this._ioDesignBar) {
                this._ioDesignBar = IoDesigner.makeBar();
                this._ioDesignBar.name = "ioDesignBar";
                this._ioDesignBarFor = id;
                addChild(this._ioDesignBar);
            }
            this._ioDesignBar.x = int(GLOBAL._SCREENCENTER.x - this._ioDesignBar.width / 2 - x);
            this._ioDesignBar.y = this._ioTestBanner && this._ioTestBanner.visible ? 86 : 64;
        }

        private var _ioTest:Button_CLIP = null;

        private var _ioTestShown:int = -1;

        private var _ioTools:Button_CLIP = null;

        private var _ioTestBanner:TextField = null;

        /** "TEST MODE" under the top bar while admin test mode is on, on every screen of the yard. */
        private function ioTestBanner():void {
            var on:Boolean = GLOBAL.ioTestMode();
            if (!on) {
                if (this._ioTestBanner) {
                    this._ioTestBanner.visible = false;
                }
                return;
            }
            if (!this._ioTestBanner) {
                this._ioTestBanner = IoTestMode.makeBanner();
                addChild(this._ioTestBanner);
            }
            this._ioTestBanner.visible = true;
            this._ioTestBanner.x = int(GLOBAL._SCREENCENTER.x - this._ioTestBanner.width / 2 - x);
            this._ioTestBanner.y = 64;
        }

        private function ioOpenAdmin(e:MouseEvent):void {
            // A field is sent so Flash keeps this a POST (it turns an empty POST into a GET).
            new URLLoaderApi().load(GLOBAL.serverUrl + "admin/session", [["open", 1]], function(serverData:Object):void {
                    if (serverData && serverData.error == 0 && serverData.code) {
                        navigateToURL(new URLRequest(GLOBAL.serverUrl + "admin/signin?code=" + String(serverData.code)), "_blank");
                    }
                    else {
                        GLOBAL.Message(serverData && serverData.error ? String(serverData.error) : "The admin panel could not be opened.");
                    }
                }, function(e:Event):void {
                    GLOBAL.Message("The admin panel could not be opened. Please try again.");
                });
        }

        public function Update():void {
            var _loc1_:Object = null;
            if (!GLOBAL._catchup) {
                if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IBUILD) {
                    this.updateBuildMode();
                }
                else if (this._ioBars) {
                    this.ioHideBars();
                }
                else if (MapRoomManager.instance.isInMapRoom3 && (GLOBAL._loadmode === GLOBAL.e_BASE_MODE.VIEW || GLOBAL._loadmode === GLOBAL.e_BASE_MODE.WMVIEW)) {
                    this.updateScoutMode();
                }
                else if (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.IWMATTACK || MapRoomManager.instance.isInMapRoom3 && (GLOBAL._loadmode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK)) {
                    this.updateAttackMode();
                }
                _loc1_ = BASE.BaseLevel();
                this.SetPoints(_loc1_.lower, _loc1_.upper, _loc1_.needed, _loc1_.points, _loc1_.level, false);
                this.ioTestBanner();
                this.ioDesignBar();
            }
        }

        private function updateBuildMode():void {
            var _loc1_:int = 0;
            var _loc2_:MovieClip = null;
            var _loc7_:int = 0;
            var _loc8_:int = 0;
            var _loc9_:Boolean = false;
            var _loc10_:int = 0;
            var _loc11_:Boolean = false;
            var _loc12_:MovieClip = null;
            var _loc3_:Number = Number(BASE._resources["r" + 1].Get());
            var _loc4_:Number = Number(BASE._resources["r" + 2].Get());
            var _loc5_:Number = Number(BASE._resources["r" + 3].Get());
            var _loc6_:Number = Number(BASE._resources["r" + 4].Get());
            this.ioTweenResource(1, _loc3_);
            this.ioTweenResource(2, _loc4_);
            this.ioTweenResource(3, _loc5_);
            this.ioTweenResource(4, _loc6_);
            this.ioSetText(mc["mcR" + 5].tR, GLOBAL.ioFreeBuild() ? "<b>Unlimited</b>" : "<b>" + GLOBAL.FormatNumber(BASE._credits.Get()) + "</b>");
            this.ioTopBars();
            this.ioShowAdminButton();
            this.ioSwitchButton();
            if (MapRoomManager.instance.isInMapRoom2) {
                mc.mcOutposts.visible = true;
                mc.mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length;
            }
            else {
                mc.mcOutposts.visible = false;
            }
            if (TUTORIAL._stage < 200) {
                mc.bInvite.visible = false;
                mc.bGift.visible = false;
                mc.bInbox.visible = false;
                mc.bAlert.visible = false;
                mc.mcR5.bAdd.visible = false;
                mc.bEarn.visible = false;
                mc.bDailyDeal.visible = false;
                _loc1_ = 1;
                while (_loc1_ < 6) {
                    mc["mcR" + _loc1_].bAdd.visible = false;
                    _loc1_++;
                }
                this.ioGauntletButton();
                this.SortButtonIcons();
            }
            else {
                // Inferno-only: no shiny to buy, so the shiny "+" stays hidden (see Setup).
                mc.mcR5.bAdd.visible = !GLOBAL.INFERNO_ONLY;
                mc.bEarn.visible = GLOBAL._flags.showFBCEarn == 1;
                mc.bDailyDeal.visible = GLOBAL._flags.showFBCDaily == 1;
                _loc1_ = 1;
                while (_loc1_ < 6) {
                    // Inferno-only: the shiny counter (mcR5) keeps its "+" hidden; this loop used to show it again.
                    if (!mc["mcR" + _loc1_].bAdd.visible && !(GLOBAL.INFERNO_ONLY && _loc1_ == 5)) {
                        mc["mcR" + _loc1_].bAdd.visible = true;
                    }
                    _loc1_++;
                }
                _loc7_ = 0;
                if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite) {
                    // Inferno-only referrals: the button is always there, and it wears the alert ring
                    // (the same spinner the notification button uses) until the player has opened it
                    // this session. Every login starts with the ring on.
                    mc.bInvite.visible = !GLOBAL.ioUiHidden("invite");
                    mc.bInvite.mcSpinner.visible = mc.bInvite.visible && !GLOBAL._ioInviteSeen;
                }
                else if (GLOBAL._canInvite && !GLOBAL._flags.kongregate) {
                    if (GLOBAL._sessionCount >= 2 && !GLOBAL._canGift && GLOBAL.Timestamp() - GLOBAL.StatGet("pi") > 60 * 60 * 36) {
                        mc.bInvite.mcSpinner.visible = true;
                    }
                    else {
                        mc.bInvite.mcSpinner.visible = false;
                    }
                    mc.bInvite.visible = true;
                }
                else {
                    mc.bInvite.visible = false;
                }
                if (mc.bInvite.visible && !(GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite)) {
                    mc.bInvite.visible = BYMConfig.instance.INVITE_BUTTON;
                }
                _loc8_ = this.extraResourceRows * this._RESOURCEBAR_HEIGHT;
                this.ioGauntletButton();
                this.SortButtonIcons(2, 4, _loc8_);
                if (GLOBAL.INFERNO_ONLY) {
                    this.ioDailyButton();
                }
                else {
                mc.bGift.visible = true;
                if ((_loc7_ = POPUPS.QueueCount("gifts")) > 0) {
                    mc.bGift.mcSpinner.visible = true;
                    mc.bGift.mcCounter.visible = true;
                    if (_loc7_ < 10) {
                        mc.bGift.mcCounter.t.htmlText = "<b>" + _loc7_ + "</b>";
                    }
                    else {
                        mc.bGift.mcCounter.t.htmlText = "<b>+</b>";
                    }
                }
                else {
                    mc.bGift.mcSpinner.visible = false;
                    mc.bGift.mcCounter.visible = false;
                }
                }
                mc.bInbox.visible = true;
                if (GLOBAL._unreadMessages > 0) {
                    mc.bInbox.mcCounter.t.htmlText = "<b>" + GLOBAL._unreadMessages + "</b>";
                    mc.bInbox.mcCounter.visible = true;
                    mc.bInbox.mcSpinner.visible = true;
                }
                else {
                    mc.bInbox.mcCounter.visible = false;
                    mc.bInbox.mcSpinner.visible = false;
                }
                if ((_loc7_ = POPUPS.QueueCount("alerts")) > 0) {
                    mc.bAlert.visible = true;
                    mc.bAlert.mcSpinner.visible = true;
                    mc.bAlert.mcCounter.visible = true;
                    if (_loc7_ < 10) {
                        mc.bAlert.mcCounter.t.htmlText = "<b>" + _loc7_ + "</b>";
                    }
                    else {
                        mc.bAlert.mcCounter.t.htmlText = "<b>+</b>";
                    }
                }
                else {
                    mc.bAlert.visible = false;
                }
                this.DisplayBuffs();
                if (this._kothIcon) {
                    _loc9_ = Boolean(CREATURES._krallen);
                    _loc10_ = 0;
                    if (_loc9_) {
                        _loc10_ = CREATURES._krallen._level.Get();
                    }
                    (this._kothIcon as KOTHHUDGraphic).update(_loc9_, _loc10_);
                }
                if (this._daveClub) {
                    _loc11_ = SubscriptionHandler.instance.isSubscriptionActive;
                    (this._daveClub as MovieClip).gotoAndStop(_loc11_ ? "on" : "off");
                    if (MapRoomManager.instance.isInMapRoom2) {
                        _loc12_ = mc.mcOutposts;
                    }
                    else {
                        _loc12_ = mc.mcR4;
                    }
                    this._daveClub.x = -4;
                    this._daveClub.y = _loc12_.y + 37;
                }
            }
        }

        private function updateAttackMode():void {
            var _loc2_:int = 0;
            var _loc3_:MovieClip = null;
            var _loc6_:String = null;
            var _loc7_:* = false;
            var _loc1_:int = int(this._creatureButtons.length);
            _loc2_ = 1;
            while (_loc2_ < 5) {
                _loc3_ = mc["mcR" + _loc2_];
                _loc3_.tR.htmlText = "<b>" + GLOBAL.FormatNumber(ATTACK._loot["r" + _loc2_].Get()) + "</b>";
                _loc3_.mcBar.visible = false;
                _loc2_++;
            }
            _loc2_ = 0;
            while (_loc2_ < _loc1_) {
                this._creatureButtons[_loc2_].Update();
                _loc2_++;
            }
            var _loc4_:int = int(GLOBAL._buildingProps[4].capacity[GLOBAL._attackersFlinger - 1]);
            if (MAPROOM_DESCENT.InDescent) {
                _loc4_ = int(YARD_PROPS._yardProps[4].capacity[GLOBAL._attackersFlinger - 1]);
            }
            if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "OFFENSE")) {
                _loc4_ += _loc4_ * 0.25;
            }
            var _loc5_:int = _loc4_;
            if (MapRoomManager.instance.isInMapRoom3 && ATTACK.USE_CUMULATIVE_FLINGER_CAPACITY) {
                _loc5_ -= ATTACK._flungSpace.Get();
            }
            for (_loc6_ in ATTACK._flingerBucket) {
                _loc7_ = _loc6_.substr(0, 1) === "G";
                if (!MapRoomManager.instance.isInMapRoom3 && _loc7_) {
                    _loc5_ -= CHAMPIONCAGE.GetGuardianProperty(_loc6_.substr(0, 2), 1, "bucket");
                }
                else if (!_loc7_) {
                    _loc5_ -= CREATURES.GetProperty(_loc6_, "bucket") * ATTACK._flingerBucket[_loc6_].Get();
                }
            }
            this._creatureButtonsMC._mc._txtContainer.mcBar.width = 115 - 115 / _loc4_ * _loc5_;
            if (MapRoomManager.instance.isInMapRoom3) {
                this._creatureButtonsMC._mc._txtContainer.mcBar.scaleX = (1 - _loc5_ / _loc4_) * 1.2;
            }
            else {
                this._creatureButtonsMC._mc._txtContainer.mcBar.scaleX = (100 - 100 / _loc4_ * _loc5_) / 100;
            }
            if (GLOBAL._attackersFlinger) {
                if (MapRoomManager.instance.isInMapRoom3) {
                    this._creatureButtonsMC._mc._txtContainer.tA.width = 60;
                    this._creatureButtonsMC._mc._txtContainer.tA.htmlText = (_loc4_ - _loc5_).toString() + "/" + _loc4_.toString();
                }
                else {
                    this._creatureButtonsMC._mc._txtContainer.tA.width = 56;
                    this._creatureButtonsMC._mc._txtContainer.tA.htmlText = Math.min(100, int((1 - _loc5_ / _loc4_) * 100)).toString() + "%";
                }
            }
            if (GLOBAL.mode != GLOBAL._loadmode) {
                if (ATTACK._countdown > 0) {
                    mc.tMessage.htmlText = KEYS.Get("attack_ui_attacklock");
                }
                else {
                    mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
                }
            }
            else if (ATTACK._countdown > 0) {
                mc.tMessage.htmlText = KEYS.Get("attack_ui_flingerlock");
            }
            else {
                mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
            }
            if (ATTACK._countdown > 30) {
                mc.tTime.htmlText = GLOBAL.ToTime(ATTACK._countdown, true);
            }
            else if (ATTACK._countdown > 0) {
                mc.tTime.htmlText = "<font color=\"#FF0000\">" + GLOBAL.ToTime(ATTACK._countdown, true) + "</font>";
            }
            else if (ATTACK._countdown > -120) {
                mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + GLOBAL.ToTime(120 + ATTACK._countdown, true) + "</font>";
            }
            else {
                mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + KEYS.Get("attack_ui_over") + "</font>";
            }
        }

        private function updateScoutMode():void {
            var _loc2_:int = 0;
            var _loc3_:MovieClip = null;
            var _loc1_:int = int(this._creatureButtons.length);
            var scoutedCell:MapRoom3Cell = GLOBAL._currentCell as MapRoom3Cell;

            _loc2_ = 1;
            while (_loc2_ < 5) {
                _loc3_ = mc["mcR" + _loc2_];
                _loc3_.tR.htmlText = !scoutedCell ? "" : "<b>" + GLOBAL.FormatNumber(scoutedCell.attackCost[_loc2_ - 1]) + "</b>";
                _loc3_.mcBar.visible = false;
                _loc2_++;
            }
            _loc2_ = 0;
            while (_loc2_ < _loc1_) {
                this._creatureButtons[_loc2_].Update();
                _loc2_++;
            }
            if (GLOBAL.mode != GLOBAL._loadmode) {
                if (ATTACK._countdown > 0) {
                    mc.tMessage.htmlText = KEYS.Get("attack_ui_attacklock");
                }
                else {
                    mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
                }
            }
            else if (ATTACK._countdown > 0) {
                mc.tMessage.htmlText = KEYS.Get("attack_ui_flingerlock");
            }
            else {
                mc.tMessage.htmlText = KEYS.Get("attack_ui_attackends");
            }
            if (ATTACK._countdown > 30) {
                mc.tTime.htmlText = GLOBAL.ToTime(ATTACK._countdown, true);
            }
            else if (ATTACK._countdown > 0) {
                mc.tTime.htmlText = "<font color=\"#FF0000\">" + GLOBAL.ToTime(ATTACK._countdown, true) + "</font>";
            }
            else if (ATTACK._countdown > -120) {
                mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + GLOBAL.ToTime(120 + ATTACK._countdown, true) + "</font>";
            }
            else {
                mc.tTime.htmlText = "<font color=\"#FFFFFF\">" + KEYS.Get("attack_ui_over") + "</font>";
            }
        }

        public function SortButtonIcons(param1:int = 2, param2:int = 4, param3:int = 0):void {
            var _loc4_:int = 9;
            var _loc5_:int = 195;
            var _loc6_:int = param1;
            var _loc7_:int = param2;
            var _loc8_:int = 67;
            var _loc9_:int = 55;
            var _loc10_:int = param3;
            var _loc11_:int = 0;
            var _loc12_:int = 0;
            var _loc13_:int = 0;
            if (MapRoomManager.instance.isInMapRoom2) {
                _loc10_ += 35;
            }
            var _loc14_:int = 0;
            while (_loc14_ < this._buttonIcons.length) {
                if (this._buttonIcons[_loc14_].visible) {
                    this._buttonIcons[_loc14_].x = _loc4_ + _loc11_;
                    this._buttonIcons[_loc14_].y = _loc5_ + _loc10_;
                    _loc13_++;
                    _loc10_ += _loc9_;
                    if (_loc13_ >= _loc7_) {
                        _loc13_ = 0;
                        _loc12_++;
                        _loc10_ = 0;
                        _loc11_ += _loc8_;
                    }
                }
                _loc14_++;
            }
        }

        public function InitDealspot():void {
            if (mc.bDealSpot) {
                mc.bDealSpot.visible = true;
                mc.bDealSpot.buttonMode = true;
                mc.bDealSpot.mouseChildren = true;
                while (mc.bDealSpot.numChildren) {
                    mc.bDealSpot.removeChildAt(0);
                }
                this._dealspot = new DealSpot(this);
                this._dealspot.x = -5;
                this._dealspot.y = -5;
                mc.bDealSpot.addChild(this._dealspot);
            }
            else if (mc.bDealSpot) {
                mc.bDealSpot.visible = false;
                mc.bDealSpot.mouseChildren = false;
                this._dealspot = null;
            }
        }

        /** The outposts counter's button: the Outposts list in the Inferno (it has Next in it), else the next outpost. */
        private static function ioNextClick(param1:MouseEvent = null):void {
            if (GLOBAL.INFERNO_ONLY && MapRoomManager.instance.isInMapRoom2) {
                IoOutpostsPopup.Show();
            }
            else {
                BASE.LoadNext(param1);
            }
        }

        /**
         * Inferno-only Invite Friends: the player's own invite link and a Copy button. A friend who
         * starts the game from the link and registers earns both players shiny (server: referrals.ts).
         * The Invite button on the top bar opens it, and so does the button on the "still there?" popup
         * (POPUPS.AFK) and the Invite Friends button anywhere else.
         */
        public static function ioShowInvite():void {
            GLOBAL._ioInviteSeen = true;
            var link:String = String(GLOBAL._flags.io_invite);
            var shiny:String = GLOBAL.FormatNumber(Number(GLOBAL._flags.io_invite_shiny));
            var message:String = "Join me on maproom 2 in the inferno! - A custom backyard monsters refitted server.\n"
                + "Play in your browser at " + link;
            var popupMC:popup_generic = new popup_generic();
            var CopyMessage:Function = function(param1:MouseEvent):void {
                System.setClipboard(message);
                popupMC.bAction.Setup("Copied!");
            };
            popupMC.tA.htmlText = "Invite a friend";
            popupMC.tB.htmlText = "Copy the invite below and send it to a friend. When they start the game from your link and register, you <b>both</b> get <b>" + shiny + " shiny</b>.<br><br>"
                + "<font color=\"#FFFFFF\">" + message.split("\n").join("<br>") + "</font><br><br>"
                + "The shiny arrives when your friend's yard is created. Two accounts on the same connection do not count.";
            // The popup grows to its text: at its stock size only the first lines showed, and the invite itself
            // and the note under it were cut off. Everything moves up by half of what it grew, to stay centred.
            var ioRoom:int = Math.ceil(popupMC.tB.textHeight + 6 - popupMC.tB.height);
            if (ioRoom > 0) {
                var ioI:int = 0;
                while (ioI < popupMC.numChildren) {
                    popupMC.getChildAt(ioI).y -= int(ioRoom / 2);
                    ioI++;
                }
                popupMC.tB.height += ioRoom;
                popupMC.bAction.y += ioRoom;
                popupMC.mcBG.height += ioRoom;
                popupMC.mcBG.Setup(true);
            }
            popupMC.bAction.Setup("Copy invite");
            popupMC.bAction.addEventListener(MouseEvent.CLICK, CopyMessage);
            // The two friendly monsters from the original Invite Friends popup, built into the game
            // (io_invite_friends) so the picture never depends on a file being on the server.
            var ioPicture:Bitmap = new Bitmap(new io_invite_friends(0, 0));
            ioPicture.smoothing = true;
            popupMC.mcImage.addChild(ioPicture);
            popupMC.mcImage.mouseEnabled = false;
            popupMC.mcImage.mouseChildren = false;
            if (popupMC.mcImageFrame) {
                popupMC.mcImage.x = popupMC.mcImageFrame.x + (popupMC.mcImageFrame.width - popupMC.mcImage.width) * 0.5;
                popupMC.mcImage.y = popupMC.mcImageFrame.y + (popupMC.mcImageFrame.height - popupMC.mcImage.height) * 0.5;
            }
            POPUPS.Push(popupMC, null, null, null, null, true, "now");
        }

        public function ButtonClick(param1:String):Function {
            var label:String = param1;
            return function(param1:MouseEvent):void {
                if (label == "gift" && GLOBAL.INFERNO_ONLY) {
                    // The gift button is the Daily Reward button here.
                    BASE.ioOpenDaily();
                }
                else if (label == "gift") {
                    if (POPUPS.QueueCount("gifts") > 0 && GLOBAL._flags.gifts == 1) {
                        POPUPS.Show("gifts");
                    }
                    else {
                        // POPUPS.Gift();
                        GLOBAL.Message(KEYS.Get("disabled_gifts"));
                    }
                }
                else if (label == "alert") {
                    if (BASE._currentAttacks && BASE._currentAttacks.length > 0) {
                        for each (var attack:Object in BASE._currentAttacks) {
                            attack.seen = true;
                        }
                        BASE._attacksModified = true;
                        BASE.Save();
                    }
                    POPUPS.Show("alerts");
                }
                else if (label == "invite") {
                    if (GLOBAL.INFERNO_ONLY && GLOBAL._flags.io_invite) {
                        GLOBAL._ioInviteSeen = true;
                        mc.bInvite.mcSpinner.visible = false;
                        ioShowInvite();
                    }
                    else if (GLOBAL._flags.invites == 1) {
                        POPUPS.Invite();
                    }
                    else {
                        GLOBAL.Message(KEYS.Get("disabled_invites"));
                    }
                }
                else if (label == "inbox") {
                    if (GLOBAL._flags.messaging == 1) {
                        MAILBOX.Show();
                    }
                    else {
                        GLOBAL.Message(KEYS.Get("disabled_mail"));
                    }
                }
                else if (label == "daily") {
                    BUY.Offers("daily");
                }
                else if (label == "earn") {
                    GLOBAL.Message(KEYS.Get("discord_earn"));
                }
            };
        }

        public function DescentDebuffShow():void {
            var _loc1_:Boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) && BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT.DescentPassed && (MAPROOM_DESCENT.DescentLevel > 6 && MAPROOM_DESCENT.DescentLevel < MAPROOM_DESCENT._descentLvlMax);
            if (this._descentDebuff) {
                this.DescentDebuffHide();
            }
            if (_loc1_) {
                this._descentDebuff = new DescentDebuffPopup();
                this._descentDebuff.Show(MAPROOM_DESCENT.DescentLevel);
            }
        }

        public function DescentDebuffHide():void {
            if (this._descentDebuff) {
                this._descentDebuff.Hide();
            }
        }

        public function DisplayBuffs():void {
            var _loc3_:int = 0;
            var _loc4_:int = 0;
            var _loc5_:int = 0;
            var _loc6_:int = 0;
            var _loc7_:int = 0;
            var _loc8_:int = 0;
            var _loc9_:int = 0;
            var _loc10_:int = 0;
            var _loc11_:Object = null;
            var _loc12_:String = null;
            var _loc13_:MovieClip = null;
            // Alliance powerup icons. Hidden in the legacy Inferno, which had no alliances.
            if (BASE.usesInfernoBackend) {
                this.BuffHide(null);
                return;
            }
            var _loc1_:Number = POWERUPS.CheckPowers(null, "NORMAL");
            var _loc2_:int = this.mcBuffHolder.numChildren;
            while (_loc2_--) {
                this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OVER, this.BuffShow);
                this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OUT, this.BuffHide);
                this.mcBuffHolder.removeChildAt(_loc2_);
            }
            if (_loc1_ > 0) {
                _loc3_ = 3;
                _loc4_ = 2;
                _loc5_ = -1 * (32 + 4);
                _loc6_ = 32 + 4;
                _loc7_ = 0;
                _loc8_ = 0;
                _loc9_ = 0;
                _loc10_ = 0;
                _loc11_ = POWERUPS.GetPowerups();
                for (_loc12_ in _loc11_) {
                    if (POWERUPS._expireRealTime) {
                        if (_loc11_[_loc12_].endtime.Get() < GLOBAL.Timestamp()) {
                            this.BuffHide(null);
                            continue;
                        }
                    }
                    (_loc13_ = new ui_buffIcon_CLIP()).gotoAndStop(_loc12_);
                    _loc13_.name = _loc12_;
                    _loc13_.x = _loc9_ * _loc5_;
                    _loc13_.y = _loc10_ * _loc6_;
                    _loc9_++;
                    if (_loc9_ >= _loc3_) {
                        _loc9_ = 0;
                        _loc10_++;
                    }
                    _loc13_.addEventListener(MouseEvent.ROLL_OVER, this.BuffShow);
                    _loc13_.addEventListener(MouseEvent.ROLL_OUT, this.BuffHide);
                    this.mcBuffHolder.addChild(_loc13_);
                }
            }
            else {
                this.BuffHide(null);
            }
        }

        public function BuffShow(param1:MouseEvent):void {
            var _loc8_:bubblepopupBuff = null;
            var _loc2_:MovieClip = param1.currentTarget as MovieClip;
            var _loc3_:String = "";
            var _loc4_:* = "";
            var _loc5_:BaseBuff;
            _loc5_ = BaseBuff(BaseBuffHandler.instance.getBuffByName(_loc2_.name));
            if (!_loc5_) {
                return;
            }
            var _loc6_:String = _loc5_.description;
            var _loc7_:String = "buff_duration";
            _loc3_ = _loc6_;
            _loc4_ = "<b>" + KEYS.Get(_loc7_) + "</b>";
            if (POWERUPS._expireRealTime) {
                if (POWERUPS.Timeleft(_loc2_.name) > 0) {
                    _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name), true);
                }
                else {
                    _loc4_ = "";
                }
            }
            else if (POWERUPS.Timeleft(_loc2_.name) > 0) {
                _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name), true);
            }
            else {
                _loc4_ = "";
            }
            if (!this._popupBuff) {
                _loc8_ = new bubblepopupBuff();
                this._popupBuff = addChild(_loc8_) as bubblepopupBuff;
                _loc8_.Setup(_loc2_.x + _loc2_.width / 2, _loc2_.y + _loc2_.height + 4, _loc3_, _loc4_);
                _loc8_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2);
                _loc8_.y = this.mcBuffHolder.y + (_loc2_.y + _loc2_.height + 4);
            }
            else {
                bubblepopupBuff(this._popupBuff).Update(_loc3_, _loc4_);
            }
        }

        public function BuffHide(param1:MouseEvent):void {
            if (this._popupBuff) {
                removeChild(this._popupBuff);
                this._popupBuff = null;
            }
        }

        public function BuffOff(param1:MouseEvent):void {
            POWERUPS._testToggleOffPowers = true;
            var _loc2_:MovieClip = param1.currentTarget as MovieClip;
            POWERUPS.Remove(_loc2_.name);
            this.BuffHide(null);
        }

        public function ButtonInfoShow(param1:MouseEvent):void {
            var _loc4_:String = null;
            var _loc2_:int = param1.target.x + 50;
            var _loc3_:int = param1.target.y + 25;
            var _loc5_:Boolean = true;
            switch (param1.target.name) {
                case "bInvite":
                    _loc4_ = KEYS.Get("pop_invite");
                    break;
                case "ioSwitch":
                    _loc4_ = "<b>Switch account</b>";
                    break;
                case "bGift":
                    if (GLOBAL.INFERNO_ONLY) {
                        var ioStatus:Object = ioStreak();
                        if (!ioStatus) {
                            _loc4_ = "Daily Reward";
                        }
                        else if (int(ioStatus.collected) != 1) {
                            _loc4_ = "<b>Daily Reward</b><br>Day " + int(ioStatus.offerDay) + ": collect " + int(ioStatus.offerShiny) + " Shiny!";
                        }
                        else {
                            _loc4_ = "<b>Daily Reward</b><br>Day " + int(ioStatus.day) + " collected. Come back tomorrow!";
                        }
                    }
                    else if (POPUPS.QueueCount("gifts") > 0) {
                        _loc4_ = KEYS.Get("pop_acceptgifts", {"v1": POPUPS.QueueCount("gifts")});
                    }
                    else {
                        _loc4_ = KEYS.Get("pop_sendgifts");
                    }
                    break;
                case "bInbox":
                    _loc4_ = KEYS.Get("pop_mailbox");
                    break;
                case "ioGauntlet":
                    _loc4_ = ioGauntletTip();
                    break;
                case "bAlert":
                    _loc4_ = KEYS.Get("pop_alerts");
                    break;
                case "mcHit":
                    _loc4_ = KEYS.Get("pop_outposts");
                    if (GLOBAL.INFERNO_ONLY) {
                        _loc4_ = "<b>Outposts</b><br>The number of Outposts under your control. Click the arrow for the list of your Outposts.";
                    }
                    _loc2_ = param1.target.parent.x + 140;
                    _loc3_ = param1.target.parent.y + 20;
                    break;
                case "bDealSpot":
                case "_dealspot":
                    _loc4_ = "<b>DealSpot Offers</b><br>Check DealSpot to earn Shiny.";
                    _loc2_ = param1.target.parent.x + 40;
                    _loc3_ = param1.target.parent.y + 20;
                    if (Boolean(this._dealspot) && this._dealspot._hasOffers) {
                        _loc4_ = "<b>DealSpot Offers</b><br>Check DealSpot to earn Shiny.";
                        _loc3_ = param1.target.parent.y + 25;
                        break;
                    }
                    _loc4_ = " ";
                    mc.bDealSpot.mouseChildren = false;
                    this.BubbleHide();
                    mc.bDealSpot.visible = false;
                    mc.bDealSpot.enabled = false;
                    if (Boolean(this._dealspot) && Boolean(this._dealspot.parent)) {
                        this._dealspot.parent.removeChild(this._dealspot);
                    }
                    _loc5_ = false;
                    return;
            }
            if (_loc5_ && _loc4_ != null) {
                this.BubbleShow(_loc2_, _loc3_, _loc4_);
            }
            else if (_loc4_ == null) {
            }
        }

        public function ButtonInfoHide(param1:MouseEvent):void {
            this.BubbleHide();
        }

        private function SetPoints(param1:Number, param2:Number, param3:Number, param4:Number, param5:uint, param6:Boolean):void {
            var _loc7_:int = 0;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                mc.mcPoints.mcLevel.text = param5.toString();
                _loc7_ = 200 / (param2 - param1) * (param4 - param1);
                TweenLite.to(mc.mcPoints.mcBar, 0.6, {
                            "width": _loc7_,
                            "ease": Elastic.easeInOut
                        });
                if (param6) {
                    mc.mcPoints.mcStar.scaleX = mc.mcPoints.mcStar.scaleY = 0.8;
                    mc.mcPoints.mcStar.rotation = 180;
                    TweenLite.to(mc.mcPoints.mcStar, 1, {
                                "scaleX": 1,
                                "scaleY": 1,
                                "rotation": 0,
                                "ease": Elastic.easeOut
                            });
                }
            }
        }

        public function BubbleShow(param1:int, param2:int, param3:String, param4:int = 3):void {
            var _loc5_:bubblepopup3;
            (_loc5_ = new bubblepopup3()).Setup(param1, param2, param3, param4);
            _loc5_.Wobble();
            this._bubbleDo = this.addChild(_loc5_);
        }

        public function BubbleHide():void {
            if (Boolean(this._bubbleDo) && Boolean(this._bubbleDo.parent)) {
                this.removeChild(this._bubbleDo);
            }
        }

        public function validateSiegeWeapon():Boolean {
            if (this._siegeweapon == null) {
                return false;
            }
            var _loc1_:Boolean = this._siegeweapon.validate();
            if (!_loc1_) {
                this.ClearSiegeWeapon();
            }
            return _loc1_;
        }
    }
}
