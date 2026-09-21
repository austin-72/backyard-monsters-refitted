package com.monsters.maproom_advanced {
    import com.monsters.ai.TRIBES;
    import com.monsters.alliances.AllyInfo;
    import com.monsters.display.ImageCache;
    import com.monsters.enums.EnumYardType;
    import com.monsters.maproom_manager.MapRoomManager;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Loader;
    import flash.display.MovieClip;
    import flash.display.StageDisplayState;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.utils.getTimer;
    import flash.display.DisplayObject;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.net.URLRequest;

    internal class MapRoomPopup extends MapRoomPopup_CLIP {

        private var mapOffset:Point;

        private var _cellContainer:MovieClip;

        private var _cells:Array;

        private var _mouseClickPoint:Point;

        private var _containerClickPoint:Point;

        private var _containerStartPoint:Point;

        private var _tempMovePoint:Point;

        private var _sortArray:Array;

        private var _cellCountX:int;

        private var _cellCountY:int;

        private var _cellLookup:Object;

        private var _bubble:bubblepopup3;

        private var _cellWidth:int = 150;

        private var _cellHeight:int = 75;

        private var _popupBookmarkAdd:PopupNewBookmark;

        private var _popupRelocateMe:PopupRelocateMe;

        public var _popupInfoMine:PopupInfoMine;

        private var _popupInfoEnemy:PopupInfoEnemy;

        private var _popupMonsters:PopupMonstersA;

        private var _popupInfoViewOnly:PopupInfoViewOnly;

        private var _popupBuff:bubblepopupBuff;

        private var _popupBookmarkMenu:Array;

        private var _menuShown:Boolean = false;

        private var _fullScreen:Boolean = false;

        private var _fallbackHomeCell:MapRoomCell;

        private var _popupAttackA:PopupAttackA;

        public var _dragged:Boolean;

        private var _popupMonstersB:PopupMonstersB;

        private var _lastBuffCount:Number = -1;

        private var _onHomeClick:Function;

        private var _onViewOnlyBookmarkClick:Function;

        public static var s_Instance:MapRoomPopup = null;

        /**
         * Zoomed-out view: the cell layer is drawn at 1 / sqrt(2), which fits twice as many cells into
         * the same window. Static, so the choice survives closing and reopening the map.
         */
        private static const IO_ZOOM_SCALE:Number = 0.7071;

        private static var s_ioZoomedOut:Boolean = false;

        private var _ioZoomButton:Button_CLIP = null;

        private var _ioLastDragUpdate:int = 0;

        public function MapRoomPopup() {
            var w:int;
            var h:int;
            var r:Rectangle;
            var i:int;
            this._sortArray = [];
            super();
            w = GLOBAL._ROOT.stage.stageWidth;
            h = GLOBAL.GetGameHeight();
            if (w > 1024) {
                w = 1024;
            }
            if (h > 768) {
                h = 768;
            }
            r = new Rectangle(0 - (w - 760) / 2, 0 - (h - 720) / 2, w, h);
            if (GLOBAL.isFullScreen) {
                this._fullScreen = true;
                mcFrame.x = r.x + 175;
                mcFrame.y = r.y + 20;
                mcFrame.width = w - 195;
                mcFrame.height = h - 40;
                mcMask.x = r.x + 175;
                mcMask.y = r.y + 20;
                mcMask.mcMask.width = w - 195;
                mcMask.mcMask.height = h - 40;
                mcFrame2.x = r.x;
                mcFrame2.y = r.y + 20;
                mcBuffHolder.x = mcMask.width + mcMask.x - 70;
                mcBuffHolder.y = mcMask.y + 28;
            }
            else {
                this._fullScreen = false;
                mcFrame.x = 190;
                mcFrame.y = 20;
                mcFrame.width = 760 - 20 - 190;
                mcFrame.height = 520 - 40;
                mcMask.x = mcFrame.x;
                mcMask.y = mcFrame.y;
                mcMask.mcMask.width = mcFrame.width;
                mcMask.mcMask.height = mcFrame.height;
                mcFrame2.x = 20;
                mcFrame2.y = 20;
                mcBuffHolder.x = mcMask.width + mcMask.x - 70;
                mcBuffHolder.y = mcMask.y + 30;
            }
            mcInfo.x = mcFrame2.x + 20;
            mcInfo.y = mcFrame2.y + 270;
            mcInfo.visible = false;
            // (mcFrame as frame1).Setup(true,true,true,0,0);
            // (mcFrame2 as frame).Setup(false);
            mcFrame.Setup(true, true, true, 0, 0);
            mcFrame2.Setup(false);
            mcMask.mcMask.mouseEnabled = false;
            this._bubble = new bubblepopup3();
            this._popupInfoMine = new PopupInfoMine();
            this._popupInfoEnemy = new PopupInfoEnemy();
            this._popupMonsters = new PopupMonstersA();
            this._popupMonstersB = new PopupMonstersB();
            this._popupAttackA = new PopupAttackA();
            this._popupAttackA.x = 380;
            this._popupAttackA.y = 260;
            this._popupBookmarkAdd = new PopupNewBookmark();
            this._popupBookmarkAdd.x = 380;
            this._popupBookmarkAdd.y = 260;
            this._popupRelocateMe = new PopupRelocateMe();
            this._popupBookmarkMenu = new Array();
            this._popupBookmarkMenu.x = 380;
            this._popupBookmarkMenu.y = 260;
            this._popupBookmarkAdd.mcFrame.Setup(true, this.HideBookmarkAddPopup);
            this._popupInfoViewOnly = new PopupInfoViewOnly();
            if (!MapRoom._viewOnly) {
                this.bHome.SetupKey("btn_home");
                this._onHomeClick = function(param1:MouseEvent):void {
                    HideBookmarkMenu();
                    MapRoom.JumpTo(GLOBAL._mapHome);
                };
                this.bHome.addEventListener(MouseEvent.CLICK, this._onHomeClick);
                this.bHome.buttonMode = true;
                this.bHome.x = mcFrame2.x + 20;
                this.bHome.y = mcFrame2.y + 200;
                this.bJump.SetupKey("btn_jump");
                this.bJump.addEventListener(MouseEvent.CLICK, this.JumpPopupShow);
                this.bJump.buttonMode = true;
                this.bJump.x = mcFrame2.x + 80;
                this.bJump.y = mcFrame2.y + 200;
                this.bBookmarks.SetupKey("btn_bookmarks");
                this.bBookmarks.addEventListener(MouseEvent.CLICK, this.ShowBookmarkMenu);
                this.bBookmarks.buttonMode = true;
                this.bBookmarks.x = mcFrame2.x + 20;
                this.bBookmarks.y = mcFrame2.y + 235;
                this.UpdateResourceDisplay();
            }
            else {
                this.bBookmarks.SetupKey("btn_home");
                this._onViewOnlyBookmarkClick = function(param1:MouseEvent):void {
                    MapRoom.JumpTo(MapRoom._inviteLocation);
                };
                this.bBookmarks.addEventListener(MouseEvent.CLICK, this._onViewOnlyBookmarkClick);
                this.bBookmarks.buttonMode = true;
                this.bBookmarks.Enabled = true;
                this.bBookmarks.x = mcFrame2.x + 20;
                this.bBookmarks.y = mcFrame2.y + 235;
                this.bHome.visible = false;
                this.bJump.visible = false;
                this.HideResourceDisplay();
            }
            if (GLOBAL.INFERNO_ONLY) {
                this.ioInfernoResourceBars();
            }
            this._ioZoomButton = new Button_CLIP();
            this._ioZoomButton.x = mcMask.x + 12;
            this._ioZoomButton.y = mcMask.y + 12;
            addChild(this._ioZoomButton);
            this._ioZoomButton.Setup(s_ioZoomedOut ? "Zoom in" : "Zoom out");
            this._ioZoomButton.buttonMode = true;
            this._ioZoomButton.addEventListener(MouseEvent.CLICK, this.ioToggleZoom);
            mcInfo.labelOwner.htmlText = "<b>" + KEYS.Get("label_owner") + "</b>";
            if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
                mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_type") + "</b>";
            }
            else {
                mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_alliance") + "</b>";
            }
            mcInfo.labelStatus.htmlText = "<b>" + KEYS.Get("label_status") + "</b>";
            mcInfo.labelLocation.htmlText = "<b>" + KEYS.Get("label_location") + "</b>";
            this.GenerateCells(MapRoom._homePoint);
            this._sortArray.sortOn("depth", Array.NUMERIC);
            i = 0;
            while (i < this._sortArray.length) {
                if (this._cellContainer.getChildIndex(this._sortArray[i]) != i) {
                    this._cellContainer.setChildIndex(this._sortArray[i], i);
                }
                i++;
            }
            this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, this.ContainerClick);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this.mcMask.mcBG.addChild(this._cellContainer);
        }

        public static function get instance():MapRoomPopup {
            return s_Instance = s_Instance || new MapRoomPopup();
        }

        private function JumpPopupShow(param1:MouseEvent = null):void {
            var popupMC:MapRoomPopupJump = null;
            var Jump:Function = null;
            var JumpPopupHide:Function = null;
            var e:MouseEvent = param1;
            Jump = function(param1:MouseEvent = null):void {
                var _loc2_:String = JumpToCoordinate(popupMC.tX.text, popupMC.tY.text);
                if (_loc2_) {
                    GLOBAL.Message(_loc2_);
                }
                else {
                    JumpPopupHide();
                }
            };
            JumpPopupHide = function(param1:MouseEvent = null):void {
                GLOBAL.BlockerRemove();
                popupMC.bJump.removeEventListener(MouseEvent.CLICK, Jump);
                popupMC.mcFrame = null;
                popupMC.parent.removeChild(popupMC);
                popupMC = null;
            };
            this.HideBookmarkMenu();
            popupMC = new MapRoomPopupJump();
            popupMC.tMessage.htmlText = KEYS.Get("label_jumptolocation");
            popupMC.tX.htmlText = "";
            popupMC.tY.htmlText = "";
            if (GLOBAL.INFERNO_ONLY) {
                // The fields may be restricted to digits in the FLA; allow the minus sign too.
                popupMC.tX.restrict = "0-9\\-";
                popupMC.tY.restrict = "0-9\\-";
            }
            popupMC.bJump.SetupKey("btn_jump");
            popupMC.bJump.addEventListener(MouseEvent.CLICK, Jump);
            popupMC.x = 450;
            popupMC.y = 250;
            popupMC.mcFrame.Setup(true, JumpPopupHide);
            GLOBAL.BlockerAdd(this);
            this.addChild(popupMC);
        }

        private function HideResourceDisplay():void {
            var _loc1_:int = 1;
            while (_loc1_ < 5) {
                this["mcR" + _loc1_].visible = false;
                _loc1_++;
            }
            mcOutposts.visible = false;
        }

        private function UpdateResourceDisplay():void {
            var _loc2_:int = 0;
            var _loc1_:int = 1;
            while (_loc1_ < 5) {
                this["mcR" + _loc1_].x = mcFrame2.x + 20;
                this["mcR" + _loc1_].y = mcFrame2.y + 18 + (_loc1_ - 1) * 36;
                this["mcR" + _loc1_].tR.htmlText = GLOBAL.FormatNumber(GLOBAL._resources["r" + _loc1_].Get());
                _loc2_ = int(100 / GLOBAL._resources["r" + _loc1_ + "max"] * GLOBAL._resources["r" + _loc1_].Get());
                if (_loc2_ > 90) {
                    _loc2_ = 90;
                }
                this["mcR" + _loc1_].mcBar.width = _loc2_;
                _loc1_++;
            }
            mcOutposts.x = mcFrame2.x + 20;
            mcOutposts.y = mcFrame2.y + 162;
            mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length + " " + KEYS.Get("newmap_outposts");
        }

        public function ShowInfo(param1:MapRoomCell):void {
            if (!param1._updated) {
                return;
            }
            var _loc2_:int = int(mcInfo.mcProfilePic.mcImage.numChildren);
            while (_loc2_--) {
                mcInfo.mcProfilePic.mcImage.removeChildAt(_loc2_);
            }
            _loc2_ = int(mcInfo.mcAlliancePic.mcImage.numChildren);
            while (_loc2_--) {
                mcInfo.mcAlliancePic.mcImage.removeChildAt(_loc2_);
            }
            mcInfo.mcAlliancePic.visible = false;
            if (!GLOBAL._flags.viximo) {
                if (param1._base > 1 && Boolean(param1._pic_square)) {
                    this.ProfilePicVix(param1._pic_square);
                    if (Boolean(param1._alliance) && Boolean(param1._alliance.image)) {
                        this.AlliancePic(AllyInfo._picURLs.sizeM, param1._alliance);
                        mcInfo.mcAlliancePic.visible = true;
                    }
                }
            }
            else if (param1._base > 1 && Boolean(param1._facebookID)) {
                this.ProfilePic(param1._facebookID);
                if (Boolean(param1._alliance) && Boolean(param1._alliance.image)) {
                    this.AlliancePic(AllyInfo._picURLs.sizeM, param1._alliance);
                    mcInfo.mcAlliancePic.visible = true;
                }
            }
            if (param1._base == 1 && Boolean(param1._name)) {
                this.TribePic(param1._name);
            }
            if (param1._water) {
                mcInfo.tAlliance.htmlText = "";
                mcInfo.tStatus.htmlText = KEYS.Get("status_water");
                mcInfo.tOwner.htmlText = "";
                mcInfo.tUserId.visible = false;
            }
            else {
                if (param1._alliance) {
                    if (param1._base == 0) {
                        mcInfo.tAlliance.htmlText = "";
                    }
                    if (param1._base == 1) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_wm");
                    }
                    if (param1._base == 2 && Boolean(param1._mine)) {
                        mcInfo.tAlliance.htmlText = param1._alliance.name;
                    }
                    if (param1._base == 2 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = param1._alliance.name;
                    }
                    if (param1._base == 3 && Boolean(param1._mine)) {
                        mcInfo.tAlliance.htmlText = param1._alliance.name;
                    }
                    if (param1._base == 3 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = param1._alliance.name;
                    }
                }
                else {
                    if (param1._base == 0) {
                        mcInfo.tAlliance.htmlText = "";
                    }
                    if (param1._base == 1) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_wm");
                    }
                    if (param1._base == 2 && Boolean(param1._mine)) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_my");
                    }
                    if (param1._base == 2 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_ey");
                    }
                    if (param1._base == 3 && Boolean(param1._mine)) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_outposts");
                    }
                    if (param1._base == 3 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = KEYS.Get("newmap_eo");
                    }
                }
                if (param1._damage) {
                    mcInfo.tStatus.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("newmap_inf_damaged", {"v1": int(param1._damage)}) + "</font>";
                }
                if (!param1._damage) {
                    mcInfo.tStatus.htmlText = "Fine";
                }
                if (!param1._damage && param1._base < 1) {
                    mcInfo.tStatus.htmlText = KEYS.Get("newmap_re");
                }
                // Tribes are shown under their devil names on the map; the panel has to say the same.
                mcInfo.tOwner.htmlText = param1._base == 1 ? TRIBES.DisplayName(param1._name) : param1._name;
                mcInfo.tUserId.text = KEYS.Get("label_userid", {"v1": param1._userID});
                mcInfo.tUserId.visible = true;
            }
            mcInfo.tLocation.htmlText = GLOBAL.ioCoord(param1.X) + " x " + GLOBAL.ioCoord(param1.Y);
            mcInfo.visible = true;
        }

        private function ProfilePic(param1:Number):void {
            var profilePic:Loader = null;
            var onImageLoad:Function = null;
            var LoadImageError:Function = null;
            var fbid:Number = param1;
            onImageLoad = function(param1:Event):void {
                profilePic.width = profilePic.height = 50;
                mcInfo.mcProfilePic.mcImage.addChild(profilePic);
                profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
                profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
            };
            LoadImageError = function(param1:IOErrorEvent):void {
                profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
                profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
            };
            profilePic = new Loader();
            profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
            profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
            profilePic.load(new URLRequest("http://graph.facebook.com/" + fbid + "/picture"));
        }

        private function ProfilePicVix(param1:String):void {
            var profilePic:Loader = null;
            var onImageLoad:Function = null;
            var LoadImageError:Function = null;
            var imgURL:String = param1;
            onImageLoad = function(param1:Event):void {
                profilePic.width = profilePic.height = 50;
                mcInfo.mcProfilePic.mcImage.addChild(profilePic);
                profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
                profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
            };
            LoadImageError = function(param1:IOErrorEvent):void {
                profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
                profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
            };
            profilePic = new Loader();
            profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
            profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
            profilePic.load(new URLRequest(imgURL));
        }

        private function TribePic(param1:String):void {
            var imageComplete:Function = null;
            var tribe:String = param1;
            imageComplete = function(param1:String, param2:BitmapData):void {
                var _loc3_:Bitmap = new Bitmap(param2);
                mcInfo.mcProfilePic.mcImage.addChild(_loc3_);
            };
            switch (tribe) {
                case "Dreadnought":
                case "Dreadnaut":
                    ImageCache.GetImageWithCallBack("monsters/tribe_dreadnaut_50.v2.jpg", imageComplete);
                    break;
                case "Kozu":
                    ImageCache.GetImageWithCallBack("monsters/tribe_kozu_50.v2.jpg", imageComplete);
                    break;
                case "Legionnaire":
                    ImageCache.GetImageWithCallBack("monsters/tribe_legionnaire_50.v2.jpg", imageComplete);
                    break;
                case "Abunakki":
                    ImageCache.GetImageWithCallBack("monsters/tribe_abunakki_50.v2.jpg", imageComplete);
                    break;
                case "Moloch":
                    ImageCache.GetImageWithCallBack("monsters/tribe_moloch_50.jpg", imageComplete);
            }
        }

        private function AlliancePic(param1:String, param2:AllyInfo):void {
            param2.AlliancePic(param1, mcInfo.mcAlliancePic.mcImage, mcInfo.mcAlliancePic.mcBG, true);
        }

        public function Hide(param1:MouseEvent = null):void {
            GLOBAL._attackerCellsInRange = new Vector.<CellData>(0, true);
            if (BASE._loadedFriendlyBaseID) {
                BASE.yardType = BASE._loadedYardType;
                BASE.LoadBase(null, 0, BASE._loadedFriendlyBaseID, GLOBAL.e_BASE_MODE.BUILD, false, BASE._loadedYardType);
            }
            else {
                BASE.yardType = EnumYardType.MAIN_YARD;
                BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            }
            SOUNDS.Play("close");
            this.Cleanup();
            MapRoomManager.instance.Hide();
        }

        public function CloseMapRoomAfterMigration():void {
            BASE.yardType = EnumYardType.MAIN_YARD;
            BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            this.Cleanup();
            MapRoomManager.instance.Hide();
        }

        public function Cleanup():void {
            var i:int = 0;
            this.HideBookmarkMenu();

            this._bubble = null;
            if (this._popupInfoMine) {
                this._popupInfoMine.Cleanup();
                this._popupInfoMine = null;
            }
            if (this._popupInfoEnemy) {
                this._popupInfoEnemy.Cleanup();
                this._popupInfoEnemy = null;
            }
            if (this._popupMonsters) {
                this._popupMonsters.Cleanup();
                this._popupMonsters = null;
            }
            if (this._popupMonstersB) {
                this._popupMonstersB.Cleanup();
                this._popupMonstersB = null;
            }
            if (this._popupAttackA) {
                this._popupAttackA.Cleanup();
                this._popupAttackA = null;
            }
            if (this._popupBookmarkAdd) {
                this._popupBookmarkAdd.mcFrame = null;
                this._popupBookmarkAdd = null;
            }
            if (this._popupRelocateMe) {
                this._popupRelocateMe.Cleanup();
                this._popupRelocateMe = null;
            }
            this._popupBookmarkMenu = null;
            if (this._popupInfoViewOnly) {
                this._popupInfoViewOnly.Cleanup();
                this._popupInfoViewOnly = null;
            }
            if (this._popupBuff) {
                if (this._popupBuff.parent) {
                    this._popupBuff.parent.removeChild(this._popupBuff);
                }
                this._popupBuff.Cleanup();
                this._popupBuff = null;
            }
            if (mcFrame) {
                mcFrame.Clear();
                mcFrame = null;
            }
            if (mcFrame2) {
                mcFrame2.Clear();
                mcFrame2 = null;
            }
            if (this._cellContainer) {
                while (this._cellContainer.numChildren > 0) {
                    this._cellContainer.removeChildAt(0);
                }
                this._cellContainer.removeEventListener(MouseEvent.MOUSE_DOWN, this.ContainerClick);
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                if (this._cellContainer.parent) {
                    this._cellContainer.parent.removeChild(this._cellContainer);
                }
                this._cellContainer = null;
            }
            if (this._cells) {
                i = int(this._cells.length - 1);
                while (i >= 0) {
                    this._cells[i].Cleanup();
                    delete this._cells[i];
                    i--;
                }
                this._cells = [];
            }
            this._cellLookup = null;
            this._tempMovePoint = null;
            this._lastBuffCount = -1;
            if (!MapRoom._viewOnly) {
                if (this._onHomeClick != null) {
                    this.bHome.removeEventListener(MouseEvent.CLICK, this._onHomeClick);
                    this._onHomeClick = null;
                }
                this.bJump.removeEventListener(MouseEvent.CLICK, this.JumpPopupShow);
                this.bBookmarks.removeEventListener(MouseEvent.CLICK, this.ShowBookmarkMenu);
            }
            else {
                if (this._onViewOnlyBookmarkClick != null) {
                    this.bBookmarks.removeEventListener(MouseEvent.CLICK, this._onViewOnlyBookmarkClick);
                    this._onViewOnlyBookmarkClick = null;
                }
            }

            MapRoom.ClearCells();
            s_Instance = null;
        }

        public function Setup():void {
            var _loc2_:int = 0;
            var _loc3_:int = 0;
            var _loc4_:int = 0;
            var _loc5_:int = 0;
            var _loc6_:String = null;
            var _loc1_:int = MapRoom.BookmarkDataGet("mbms");
            if (_loc1_ > 0) {
                _loc2_ = 0;
                while (_loc2_ < _loc1_) {
                    _loc3_ = MapRoom.BookmarkDataGet("mbm" + _loc2_);
                    _loc4_ = int(_loc3_ / 10000);
                    _loc5_ = _loc3_ - _loc4_ * 10000;
                    _loc6_ = MapRoom.BookmarkDataGetStr("mbmn" + _loc2_);
                    MapRoom._currentPosition = new Point(_loc4_, _loc5_);
                    MapRoom.AddBookmark(_loc6_, false);
                    _loc2_++;
                }
            }
            else {
                MapRoomManager.instance.BookmarksClear();
            }
            if (MapRoom._bookmarks.length > 0 || MapRoom._viewOnly) {
                this.bBookmarks.Enabled = true;
            }
            else {
                this.bBookmarks.Enabled = false;
            }
        }

        public function JumpTo(param1:Point):void {
            this.mcMask.mcBG.removeChild(this._cellContainer);
            this.GenerateCells(param1);
            this._sortArray.sortOn("depth", Array.NUMERIC);
            var _loc2_:int = 0;
            while (_loc2_ < this._sortArray.length) {
                if (this._cellContainer.getChildIndex(this._sortArray[_loc2_]) != _loc2_) {
                    this._cellContainer.setChildIndex(this._sortArray[_loc2_], _loc2_);
                }
                _loc2_++;
            }
            this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, this.ContainerClick);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this.mcMask.mcBG.addChild(this._cellContainer);
            this.Update();
        }

        private function GenerateCells(param1:Point):void {
            var cellIndex:int = 0;
            var rowIndex:int = 0;
            var mapRoomCell:MapRoomCell = null;
            var stageWidth:int = GLOBAL._ROOT.stage.stageWidth;
            var stageHeight:int = GLOBAL.GetGameHeight();
            LOGGER.Log("log", "val of param1: " + param1);
            if (stageWidth > 1024) {
                stageWidth = 1024;
            }
            if (stageHeight > 768) {
                stageHeight = 768;
            }
            var _loc5_:Rectangle = new Rectangle(0 - (stageWidth - 760) / 2, 0 - (stageHeight - 520) / 2, stageWidth, stageHeight);
            if (this._cellContainer) {
                while (this._cellContainer.numChildren > 0) {
                    this._cellContainer.removeChildAt(0);
                }
                this._cellContainer.removeEventListener(MouseEvent.MOUSE_DOWN, this.ContainerClick);
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                if (this._cellContainer.parent) {
                    this._cellContainer.parent.removeChild(this._cellContainer);
                }
                this._cellContainer = null;
            }
            if (this._cells) {
                cellIndex = int(this._cells.length - 1);
                cellIndex = int(this._cells.length - 1);
                while (cellIndex >= 0) {
                    delete this._cells[cellIndex];
                    cellIndex--;
                }
            }
            this._cells = [];
            this._cellContainer = new MovieClip();
            this._sortArray = [];
            this._cellLookup = {};
            if (GLOBAL.isFullScreen) {
                this._cellCountX = 18;
                this._cellCountY = 15;
            }
            else {
                this._cellCountX = 16;
                this._cellCountY = 14;
            }
            this._cellContainer.scaleX = this._cellContainer.scaleY = 1;
            if (s_ioZoomedOut) {
                this.ioGenerateZoomedCells(param1);
            }
            stageHeight = 0;
            while (stageHeight < this._cellCountX && !s_ioZoomedOut) {
                rowIndex = 0;
                while (rowIndex < this._cellCountY) {
                    (mapRoomCell = new MapRoomCell()).x = int(stageHeight * (this._cellWidth * 0.75) - this._cellWidth * 0.75 * 4);
                    mapRoomCell.y = int(rowIndex * this._cellHeight - this._cellHeight * 5);
                    mapRoomCell.X = stageHeight;
                    mapRoomCell.Y = rowIndex;
                    mapRoomCell.cacheAsBitmap = true;
                    mapRoomCell.mc.gotoAndStop(1);
                    mapRoomCell.mc.mcPlayer.visible = false;
                    if (stageHeight % 2 == 0) {
                        mapRoomCell.y += this._cellHeight * 0.5;
                    }
                    this._cells.push(mapRoomCell);
                    mapRoomCell.depth = mapRoomCell.y * 1000 + mapRoomCell.x;
                    this._sortArray.push(mapRoomCell);
                    this._cellContainer.addChild(mapRoomCell);
                    if (GLOBAL.isFullScreen) {
                        mapRoomCell.Y += param1.y - 8;
                        if (param1.x % 2) {
                            mapRoomCell.X += param1.x - 8;
                            this._cellContainer.x = -125;
                            this._cellContainer.y = 18;
                        }
                        else {
                            mapRoomCell.X += param1.x - 7;
                            this._cellContainer.x = -9;
                            this._cellContainer.y = 54;
                        }
                    }
                    else {
                        mapRoomCell.Y += param1.y - 7;
                        if (param1.x % 2) {
                            mapRoomCell.X += param1.x - 4;
                            this._cellContainer.x = 209;
                            this._cellContainer.y = 7;
                        }
                        else {
                            mapRoomCell.X += param1.x - 5;
                            this._cellContainer.x = 101;
                            this._cellContainer.y = 40;
                        }
                    }
                    this._cellLookup[mapRoomCell.X * 10000 + mapRoomCell.Y] = mapRoomCell;
                    rowIndex++;
                }
                stageHeight++;
            }
            this._fallbackHomeCell = new MapRoomCell();
            this._fallbackHomeCell.X = GLOBAL._mapHome.x;
            this._fallbackHomeCell.Y = GLOBAL._mapHome.y;
            this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, this.ContainerClick);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this.mcMask.mcBG.addChild(this._cellContainer);
        }

        /**
         * The four resource bars in the map's left panel have the overworld icons (twig, pebble, putty,
         * goo) drawn straight into them: unnamed shapes, no Inferno frame to switch to. The top bar's
         * Inferno frame ("ibuild") holds bars built exactly the same way with the bone / coal / sulfur /
         * magma art, so that art is borrowed: a throwaway copy of the top bar clip is sent to its
         * Inferno frame and each bar's icon is moved into the matching map bar, whose own icon is
         * hidden. In both clips the first unnamed shape is the bar's background and the rest is the
         * icon, anchored at the same point. The map keeps its own background: the top bar's is 25 px
         * wider, to make room for a "+" button the map does not have. If the art is not laid out as
         * expected nothing is moved and the overworld icons simply stay.
         */
        private function ioInfernoResourceBars():void {
            var source:UI_TOP_CLIP = null;
            var from:MovieClip = null;
            var to:MovieClip = null;
            var child:DisplayObject = null;
            var borrowed:Array = null;
            var seenBackground:Boolean = false;
            var i:int = 1;
            var k:int = 0;
            try {
                source = new UI_TOP_CLIP();
                source.gotoAndStop("ibuild");
                while (i < 5) {
                    from = source.mc ? source.mc["mcR" + i] as MovieClip : null;
                    to = this["mcR" + i] as MovieClip;
                    if (from && to) {
                        borrowed = [];
                        k = 0;
                        while (k < from.numChildren) {
                            child = from.getChildAt(k);
                            if (child.name.indexOf("instance") == 0) {
                                borrowed.push(child);
                            }
                            k++;
                        }
                        if (borrowed.length >= 2) {
                            // Hide the map bar's own icon: every unnamed shape after its background.
                            seenBackground = false;
                            k = 0;
                            while (k < to.numChildren) {
                                child = to.getChildAt(k);
                                if (child.name.indexOf("instance") == 0) {
                                    if (seenBackground) {
                                        child.visible = false;
                                    }
                                    seenBackground = true;
                                }
                                k++;
                            }
                            // The Inferno icon(s) go on top of the bar and its number.
                            k = 1;
                            while (k < borrowed.length) {
                                to.addChild(borrowed[k]);
                                k++;
                            }
                        }
                    }
                    i++;
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "MapRoomPopup.ioInfernoResourceBars: " + e.message);
            }
        }

        /**
         * Builds the cell grid for the zoomed-out view. Same layout rules as the stock loop (columns
         * 0.75 cell widths apart, every other column half a cell lower, odd map X on the lowered
         * columns), but with enough cells to fill the window at IO_ZOOM_SCALE, and with the requested
         * cell placed where the stock view puts it: in the middle of the window.
         */
        private function ioGenerateZoomedCells(param1:Point):void {
            var column:int = 0;
            var row:int = 0;
            var cell:MapRoomCell = null;
            var scale:Number = IO_ZOOM_SCALE;
            var columnWidth:Number = this._cellWidth * 0.75;
            var full:Boolean = GLOBAL.isFullScreen;
            // Where the stock view shows the centre of the focused cell, in the mask's coordinates.
            var centreX:Number = full ? 402 : 288.5;
            var centreY:Number = full ? 317.5 : 227.5;
            this._cellCountX = Math.ceil((full ? 18 : 16) / scale);
            if (this._cellCountX % 2 == 1) {
                // Columns alternate, so the grid has to wrap after an even number of them.
                ++this._cellCountX;
            }
            this._cellCountY = Math.ceil((full ? 15 : 14) / scale);
            // Which column / row of the grid holds the focused cell, so the grid starts just inside the
            // recycling bounds used by Update().
            var focusColumn:int = Math.floor((centreX + columnWidth * 5 - scale * this._cellWidth * 0.5) / (scale * columnWidth)) - 1;
            if ((int(param1.x) - focusColumn) % 2 == 0) {
                --focusColumn;
            }
            var focusRow:int = Math.floor((centreY + this._cellHeight * 5 - scale * this._cellHeight) / (scale * this._cellHeight));
            column = 0;
            while (column < this._cellCountX) {
                row = 0;
                while (row < this._cellCountY) {
                    cell = new MapRoomCell();
                    cell.x = int(column * columnWidth - columnWidth * 4);
                    cell.y = int(row * this._cellHeight - this._cellHeight * 5);
                    if (column % 2 == 0) {
                        cell.y += this._cellHeight * 0.5;
                    }
                    cell.X = column + int(param1.x) - focusColumn;
                    cell.Y = row + int(param1.y) - focusRow;
                    cell.cacheAsBitmap = true;
                    cell.mc.gotoAndStop(1);
                    cell.mc.mcPlayer.visible = false;
                    cell.depth = cell.y * 1000 + cell.x;
                    this._cells.push(cell);
                    this._sortArray.push(cell);
                    this._cellContainer.addChild(cell);
                    this._cellLookup[cell.X * 10000 + cell.Y] = cell;
                    row++;
                }
                column++;
            }
            this._cellContainer.scaleX = this._cellContainer.scaleY = scale;
            this._cellContainer.x = centreX - scale * ((focusColumn - 4) * columnWidth + this._cellWidth * 0.5);
            this._cellContainer.y = centreY - scale * (focusRow * this._cellHeight - this._cellHeight * 5 + (focusColumn % 2 == 0 ? this._cellHeight * 0.5 : 0) + this._cellHeight * 0.5);
        }

        /** The map cell currently nearest the middle of the window. */
        private function ioCentreCell():Point {
            var cell:MapRoomCell = null;
            var best:MapRoomCell = null;
            var bestDistance:Number = Number.MAX_VALUE;
            var dx:Number = NaN;
            var dy:Number = NaN;
            var scale:Number = this._cellContainer.scaleX;
            var centreX:Number = GLOBAL.isFullScreen ? 402 : 288.5;
            var centreY:Number = GLOBAL.isFullScreen ? 317.5 : 227.5;
            for each (cell in this._cells) {
                dx = this._cellContainer.x + scale * (cell.x + this._cellWidth * 0.5) - centreX;
                dy = this._cellContainer.y + scale * (cell.y + this._cellHeight * 0.5) - centreY;
                if (dx * dx + dy * dy < bestDistance) {
                    bestDistance = dx * dx + dy * dy;
                    best = cell;
                }
            }
            return best ? new Point(best.X, best.Y) : MapRoom._homePoint;
        }

        private function ioToggleZoom(param1:MouseEvent = null):void {
            var centre:Point = this.ioCentreCell();
            s_ioZoomedOut = !s_ioZoomedOut;
            this._ioZoomButton.Setup(s_ioZoomedOut ? "Zoom in" : "Zoom out");
            // Rebuilds the grid around the cell that was in the middle, exactly like a jump.
            this.JumpTo(centre);
        }

        private function ContainerClick(param1:MouseEvent):void {
            this._dragged = false;
            this._containerClickPoint = new Point(this._cellContainer.x, this._cellContainer.y);
            this._mouseClickPoint = new Point(mouseX, mouseY);
            this._containerStartPoint = new Point(this._cellContainer.x, this._cellContainer.y);
            this._cellContainer.addEventListener(MouseEvent.MOUSE_MOVE, this.ContainerMove);
        }

        private function ContainerMove(param1:MouseEvent = null):void {
            var newX:int = int(this._containerClickPoint.x - this._mouseClickPoint.x + this.mouseX);
            var newY:int = int(this._containerClickPoint.y - this._mouseClickPoint.y + this.mouseY);

            if (this._cellContainer.x != newX || this._cellContainer.y != newY) {
                this._cellContainer.x = newX;
                this._cellContainer.y = newY;
            }
            if (!this._tempMovePoint)
                this._tempMovePoint = new Point();

            this._tempMovePoint.x = this._cellContainer.x;
            this._tempMovePoint.y = this._cellContainer.y;
            if (Point.distance(this._containerStartPoint, this._tempMovePoint) > 10) {
                this._dragged = true;
                this.HideBubble();
            }
            // The mouse can report many moves per frame, and Update() walks every cell (480 when zoomed
            // out). The layer itself has already moved above; recycling cells can wait for the next
            // 25 ms slot, and the release handler runs a final pass so nothing is left unrecycled.
            if (getTimer() - this._ioLastDragUpdate >= 25) {
                this._ioLastDragUpdate = getTimer();
                this.Update();
            }
        }

        private function ContainerRelease(param1:MouseEvent):void {
            if (this._cellContainer) {
                this._cellContainer.removeEventListener(MouseEvent.MOUSE_MOVE, this.ContainerMove);
                if (this._dragged) {
                    this.Update();
                }
            }
            this._dragged = false;
        }

        public function Tick():void {
            var _loc1_:MapRoomCell = null;
            this.UpdateResourceDisplay();
            for each (_loc1_ in this._cells) {
                _loc1_.Tick();
            }
            this.Update();
        }

        public function Check():void {
            var _loc1_:MapRoomCell = null;
            for each (_loc1_ in this._cells) {
                _loc1_.Check();
            }
        }

        public function Update(param1:Boolean = false):void {
            var cellMoved:Boolean = false;
            var anyCellMoved:Boolean = false;
            var cellData:Object = null;
            var cell:MapRoomCell = null;
            var i:int = 0;
            var homeCellVisible:Boolean = false;
            var flingerRange:Number = NaN;
            var oldCellKey:int;
            var cellsWithRange:Vector.<MapRoomCell> = null;
            var rangeCell:MapRoomCell = null;

            if (this._fullScreen && GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
                MapRoomManager.instance.ResizeHandler();
                this._fullScreen = false;
                return;
            }
            if ((!this._fallbackHomeCell._updated || param1) && this._fallbackHomeCell._dataAge <= 0) {
                cellData = MapRoom.GetCell(this._fallbackHomeCell.X, this._fallbackHomeCell.Y);
                if (cellData) {
                    this._fallbackHomeCell.Setup(cellData);
                }
            }
            this._sortArray = [];

            var cellWidthFactor:Number = this._cellWidth * 0.75;
            // At normal zoom viewScale is 1 and all of this is the stock arithmetic. Zoomed out, a cell's
            // on-screen position is its own position times the layer's scale, and the recycling window
            // is the scaled width / height of the whole grid, so cells still wrap seamlessly.
            var viewScale:Number = this._cellContainer.scaleX;
            var leftBound:Number = -(cellWidthFactor * 5);
            var rightBound:Number = leftBound + this._cellCountX * cellWidthFactor * viewScale;
            var topBound:Number = -(this._cellHeight * 5);
            var bottomBound:Number = topBound + this._cellCountY * this._cellHeight * viewScale;
            var xWrapAmount:Number = this._cellCountX * cellWidthFactor;
            var yWrapAmount:Number = this._cellCountY * this._cellHeight;
            var containerX:Number = this._cellContainer.x;
            var containerY:Number = this._cellContainer.y;
            var notDragged:Boolean = !this._dragged;
            var checkRange:Boolean = !MapRoom._viewOnly;

            if (checkRange)
                cellsWithRange = new Vector.<MapRoomCell>();

            for each (cell in this._cells) {
                cellMoved = false;
                oldCellKey = cell.X * 10000 + cell.Y;

                // Check right boundary
                if (containerX + cell.x * viewScale > rightBound) {
                    cell.x -= xWrapAmount;
                    cell.X -= this._cellCountX;

                    if (cell.X < 0)
                        cell.X += MapRoom._mapWidth;
                    cellMoved = true;
                }

                // Check bottom boundary
                if (containerY + cell.y * viewScale > bottomBound) {
                    cell.y -= yWrapAmount;
                    cell.Y -= this._cellCountY;

                    if (cell.Y < 0)
                        cell.Y += MapRoom._mapHeight;
                    cellMoved = true;
                }
                // Check left boundary
                if (containerX + cell.x * viewScale < leftBound) {
                    cell.x += xWrapAmount;
                    cell.X += this._cellCountX;

                    if (cell.X > MapRoom._mapWidth - 1)
                        cell.X -= MapRoom._mapWidth;
                    cellMoved = true;
                }
                // Check top boundary
                if (containerY + cell.y * viewScale < topBound) {
                    cell.y += yWrapAmount;
                    cell.Y += this._cellCountY;

                    if (cell.Y > MapRoom._mapHeight - 1)
                        cell.Y -= MapRoom._mapHeight;
                    cellMoved = true;
                }

                // Clamp coordinates to map bounds
                if (cell.X < 0) {
                    cell.X += MapRoom._mapWidth;
                    cellMoved = true;
                }
                if (cell.Y < 0) {
                    cell.Y += MapRoom._mapHeight;
                    cellMoved = true;
                }
                if (cell.X >= MapRoom._mapWidth) {
                    cell.X -= MapRoom._mapWidth;
                    cellMoved = true;
                }
                if (cell.Y >= MapRoom._mapHeight) {
                    cell.Y -= MapRoom._mapHeight;
                    cellMoved = true;
                }
                if (cellMoved) {
                    cell.mc.gotoAndStop(1);
                    cell.mc.y = 18;
                    cell.mc.mcPlayer.visible = false;
                    cell._updated = false;
                    cell._dataAge = 0;
                    cell._inRange = false;
                    cell.mc.mcGlow.gotoAndStop(1);
                    anyCellMoved = true;
                    delete this._cellLookup[oldCellKey];
                    this._cellLookup[cell.X * 10000 + cell.Y] = cell;
                }
                if (GLOBAL.INFERNO_ONLY && !cell._updated) {
                    // Until its block of map data arrives a cell shows the art's first frame: green grass.
                    InfernoMapTheme.applyUnloaded(cell.mc);
                }
                if ((!cell._updated || param1) && cell._dataAge <= 0) {
                    cellData = MapRoom.GetCell(cell.X, cell.Y);
                    // Every block of map data that arrives forces this pass over every cell on screen, and
                    // the stock code set each one up again from scratch: text, icon, flags, a full redraw of
                    // its cached picture. A block replaces its cells' data objects, so a cell whose object
                    // is the one it already shows has nothing new to draw.
                    if (cellData && (!cell._updated || cellData !== cell._ioShownData)) {
                        cell._ioShownData = cellData;
                        cell.Setup(cellData);
                    }
                }
                cell.depth = cell.y * 1000 + cell.x;
                this._sortArray.push(cell);

                if (notDragged) {
                    // Only when it changes: a property write invalidates the cell's cached bitmap.
                    if (cell.mc.mcGlow.alpha != (cell._over ? 0.5 : 0)) {
                        cell.mc.mcGlow.alpha = cell._over ? 0.5 : 0;
                    }
                    cell._inRange = false;
                }

                if (checkRange && cell._mine && cell._flingerRange.Get() > 0 && cell._base > 0) {
                    cellsWithRange.push(cell);
                    if (cell.X == GLOBAL._mapHome.x && cell.Y == GLOBAL._mapHome.y) {
                        homeCellVisible = true;
                    }
                }
            }

            if (anyCellMoved) {
                this._sortArray.sortOn("depth", Array.NUMERIC);
                i = 0;
                while (i < this._sortArray.length) {
                    if (this._cellContainer.getChildIndex(this._sortArray[i]) != i) {
                        this._cellContainer.setChildIndex(this._sortArray[i], i);
                    }
                    i++;
                }
            }
            if (Boolean(this._popupInfoMine) && Boolean(this._popupInfoMine.parent)) {
                this._popupInfoMine.Update();
            }
            if (Boolean(this._popupAttackA) && Boolean(this._popupAttackA.parent)) {
                this._popupAttackA.Update();
            }

            // Process collected range cells
            if (checkRange) {
                // Optimistic highlighting: apply home base range immediately using local data
                // This shows highlighting before zone data loads from server
                if (GLOBAL._playerFlingerLevel.Get() > 0) {
                    flingerRange = BUILDING5.getFlingerRange(GLOBAL._playerFlingerLevel.Get(), true);
                    flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [flingerRange]);

                    // Highlight the home cell itself (ApplyRangeHighlighting skips the origin)
                    var homeCell:MapRoomCell = this.GetCell(GLOBAL._mapHome.x, GLOBAL._mapHome.y);

                    if (homeCell) {
                        if (!homeCell._over)
                            homeCell.mc.mcGlow.alpha = 0.5;
                        homeCell._inRange = true;
                    }

                    this.ApplyRangeHighlighting(GLOBAL._mapHome.x, GLOBAL._mapHome.y, flingerRange);
                }

                for each (rangeCell in cellsWithRange) {
                    // Skip home cell if already highlighted above
                    if (rangeCell.X == GLOBAL._mapHome.x && rangeCell.Y == GLOBAL._mapHome.y)
                        continue;

                    flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [rangeCell._flingerRange.Get()]);
                    this.ShowRange(rangeCell, flingerRange);
                }
            }

            this.bBookmarks.Enabled = MapRoom._bookmarks.length > 0 || MapRoom._viewOnly;
            this.DisplayBuffs();
        }

        public function ShowBubble(param1:MapRoomCell):void {
        }

        public function HideBubble():void {
            if (this._bubble.parent) {
                this._bubble.parent.removeChild(this._bubble);
            }
        }

        public function ShowRange(param1:MapRoomCell, param2:int):void {
            if (!this._dragged) {
                if (param1._water == 0) {
                    if (!param1._over) {
                        param1.mc.mcGlow.alpha = 0.5;
                    }
                    param1._inRange = true;
                    this.ApplyRangeHighlighting(param1.X, param1.Y, param2);
                }
            }
        }

        /**
         * Applies range highlighting directly without allocating intermediate objects.
         * This is an optimized version that combines GetCellsInRange + highlighting into one pass.
         *
         * Cells within base flinger range get full highlight (alpha 0.5).
         * Cells in bonus range from Alliance Declare War powerup get dimmer highlight (alpha 0.35).
         */
        private function ApplyRangeHighlighting(startOffsetX:int, startOffsetY:int, range:int):void {
            var cell:MapRoomCell;
            var distance:int;
            var currentOffsetX:int;
            var currentOffsetY:int;
            var baseRange:int = range;

            if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL")) {
                baseRange = range - 2;
            }

            var startAxialQ:int = startOffsetX;
            var startAxialR:int = startOffsetY - (startOffsetX - (startOffsetX & 1)) / 2;

            for (var deltaQ:int = -range; deltaQ <= range; deltaQ++) {
                for (var deltaR:int = Math.max(-range, -deltaQ - range); deltaR <= Math.min(range, -deltaQ + range); deltaR++) {
                    if (deltaQ == 0 && deltaR == 0)
                        continue;

                    var currentAxialQ:int = startAxialQ + deltaQ;
                    var currentAxialR:int = startAxialR + deltaR;

                    distance = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(-deltaQ - deltaR));

                    currentOffsetX = currentAxialQ;
                    currentOffsetY = currentAxialR + (currentAxialQ - (currentAxialQ & 1)) / 2;

                    cell = this.GetCell(currentOffsetX, currentOffsetY);

                    if (cell && !cell._water) {
                        if (!cell._over) {
                            cell.mc.mcGlow.alpha = distance <= baseRange ? 0.5 : Math.max(cell.mc.mcGlow.alpha, 0.35);
                        }
                        cell._inRange = true;
                    }
                }
            }
        }

        /* This function has been rewritten.
       *
       * @author: Mateo-os
       * 
       * @description: calculate neighbors by first converting the hexagonal grid coordinates 
       * from the offset 'odd-q' system to axial coordinates, making the calculations in that system 
       * and then converting it back. The conversion is done because not only is not expensive at all, 
       * but also it is very difficult to make distance and adjacency calculations in any offseted 
       * coordinate system.
       * 
       * @param hexX: the x coordinate of the cell
       * @param hexY: the y coordinate of the cell
       * @param range: the range of the cells to be calculated
       * @return: a vector of CellData objects containing the cells in range and their distance to the origin
      */
        public function GetCellsInRange(startOffsetX:int, startOffsetY:int, range:int):Vector.<CellData> {
            var cells:Vector.<CellData> = new Vector.<CellData>(3 * range * (range + 1), true);
            var cellIndex:int = 0;

            // We convert to axial coordinates for easier calculations
            var startAxialQ:int = startOffsetX;
            var startAxialR:int = startOffsetY - (startOffsetX - (startOffsetX & 1)) / 2;

            for (var deltaQ:int = -range; deltaQ <= range; deltaQ++) {
                for (var deltaR:int = Math.max(-range, -deltaQ - range); deltaR <= Math.min(range, -deltaQ + range); deltaR++) {
                    if (deltaQ == 0 && deltaR == 0)
                        continue; // Skip the origin

                    var currentAxialQ:int = startAxialQ + deltaQ;
                    var currentAxialR:int = startAxialR + deltaR;

                    // Measure the distance as the maximum absolute value between q, r and s.
                    var distance:int = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(-deltaQ - deltaR));

                    // Convert back to offsetted
                    var currentOffsetX:int = currentAxialQ;
                    var currentOffsetY:int = currentAxialR + (currentAxialQ - (currentAxialQ & 1)) / 2;

                    var cell:MapRoomCell = this.GetCell(currentOffsetX, currentOffsetY);

                    cells[cellIndex] = new CellData(cell, distance);
                    cellIndex += 1;
                }
            }
            return cells;
        }

        private function GetCell(hexX:int, hexY:int):MapRoomCell {
            if (hexX >= MapRoom._mapWidth) {
                hexX -= MapRoom._mapWidth;
            }
            else if (hexX < 0) {
                hexX = MapRoom._mapWidth + hexX;
            }
            if (hexY >= MapRoom._mapHeight) {
                hexY -= MapRoom._mapHeight;
            }
            else if (hexY < 0) {
                hexY = MapRoom._mapHeight + hexY;
            }

            var cell:MapRoomCell = this._cellLookup[hexX * 10000 + hexY];

            if (cell)
                return cell;

            if (this._fallbackHomeCell.X == hexX && this._fallbackHomeCell.Y == hexY) {
                return this._fallbackHomeCell;
            }
            return null;
        }

        public function ShowInfoMine(param1:MapRoomCell):void {
            this.HideBookmarkMenu();
            if (!this._dragged) {
                SOUNDS.Play("click1");
                this.HideBubble();
                this._popupInfoMine.Setup(param1);
                GLOBAL.BlockerAdd(this);
                this.addChild(this._popupInfoMine);
            }
            this._dragged = false;
        }

        public function HideInfoMine():void {
            GLOBAL.BlockerRemove();
            if (this._popupInfoMine.parent) {
                this._popupInfoMine.parent.removeChild(this._popupInfoMine);
            }
            SOUNDS.Play("close");
        }

        public function ShowInfoEnemy(param1:MapRoomCell, param2:Boolean = false):void {
            this.HideBookmarkMenu();
            if (!this._dragged) {
                SOUNDS.Play("click1");
                this.HideBubble();
                this._popupInfoEnemy.Setup(param1, param2);
                GLOBAL.BlockerAdd(this);
                this.addChild(this._popupInfoEnemy);
            }
            this._dragged = false;
        }

        public function HideInfoEnemy():void {
            GLOBAL.BlockerRemove();
            if (this._popupInfoEnemy.parent) {
                this._popupInfoEnemy.parent.removeChild(this._popupInfoEnemy);
            }
            SOUNDS.Play("close");
        }

        public function ShowInfoViewOnly(param1:MapRoomCell, param2:Boolean = false):void {
            if (!this._dragged) {
                SOUNDS.Play("click1");
                this._popupInfoViewOnly.Setup(param1, param2);
                GLOBAL.BlockerAdd(this);
                this.addChild(this._popupInfoViewOnly);
            }
            this._dragged = false;
        }

        public function HideInfoViewOnly():void {
            GLOBAL.BlockerRemove();
            if (this._popupInfoViewOnly.parent) {
                this._popupInfoViewOnly.parent.removeChild(this._popupInfoViewOnly);
            }
            SOUNDS.Play("close");
        }

        public function ShowInfoDestroyed(param1:MapRoomCell):void {
            this.HideBookmarkMenu();
            if (!this._dragged) {
                SOUNDS.Play("click1");
                this.HideBubble();
                param1._destroyed = 1;
                this._popupInfoEnemy.Setup(param1);
                GLOBAL.BlockerAdd(this);
                this.addChild(this._popupInfoEnemy);
            }
            this._dragged = false;
        }

        public function HideTransferB():void {
        }

        public function ShowMonstersA(param1:MapRoomCell, param2:Boolean = false):void {
            SOUNDS.Play("click1");
            this.HideBookmarkMenu();
            this.HideInfoMine();
            this._popupMonsters.Setup(param1, param2);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupMonsters);
        }

        public function HideMonstersA():void {
            if (this._popupMonsters.parent) {
                this._popupMonsters.parent.removeChild(this._popupMonsters);
            }
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
        }

        public function ShowMonstersB(param1:Object, param2:MapRoomCell):void {
            SOUNDS.Play("click1");
            this.HideBookmarkMenu();
            this._popupMonstersB.Setup(param1, param2);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupMonstersB);
        }

        public function HideMonstersB():void {
            GLOBAL.BlockerRemove();
            if (Boolean(this._popupMonstersB) && Boolean(this._popupMonstersB.parent)) {
                this._popupMonstersB.parent.removeChild(this._popupMonstersB);
            }
            SOUNDS.Play("close");
        }

        public function ShowAttack(param1:MapRoomCell):void {
            SOUNDS.Play("click1");
            this.HideBookmarkMenu();
            if (param1 && !param1._protected && !(param1._truce && param1._truce > GLOBAL.Timestamp())) {
                this._popupAttackA.Setup(param1);
                GLOBAL.BlockerAdd(this);
                this.addChild(this._popupAttackA);
            }
            else if (param1._protected) {
                GLOBAL.Message(KEYS.Get("newmap_dp"));
            }
            else if (Boolean(param1._truce) && param1._truce > GLOBAL.Timestamp()) {
                GLOBAL.Message(KEYS.Get("newmap_truce"));
            }
        }

        public function HideAttack():void {
            GLOBAL.BlockerRemove();
            if (this._popupAttackA.parent) {
                this._popupAttackA.parent.removeChild(this._popupAttackA);
            }
            SOUNDS.Play("close");
        }

        public function ShowBookmarkMenu(param1:MouseEvent):void {
            var length:int = 0;
            var newY:int = 0;
            var menuItem:MapRoomBookmark = null;
            var i:int = 0;
            var InBookmarkRemove:Function = null;
            var inBookmarkSelect:Function = null;
            var e:MouseEvent = param1;
            SOUNDS.Play("click1");
            if (!this._menuShown && MapRoom._bookmarks.length > 0) {
                length = int(MapRoom._bookmarks.length);
                newY = bBookmarks.y;
                i = 0;
                while (i < length) {
                    InBookmarkRemove = function(param1:MouseEvent):void {
                        BookmarkRemove(param1.target.index);
                        menuItem.bDelete.removeEventListener(MouseEvent.CLICK, InBookmarkRemove);
                    };
                    inBookmarkSelect = function(param1:MouseEvent):void {
                        BookmarkSelect(param1.target.index);
                        menuItem.mcBG.removeEventListener(MouseEvent.CLICK, inBookmarkSelect);
                    };
                    menuItem = new MapRoomBookmark();
                    menuItem.mcBG.index = i;
                    menuItem.x = bBookmarks.x + 115;
                    menuItem.y = newY;
                    newY += menuItem.height;
                    menuItem.tName.mouseEnabled = false;
                    menuItem.bDelete.index = i;
                    menuItem.bDelete.addEventListener(MouseEvent.CLICK, InBookmarkRemove);
                    menuItem.bDelete.buttonMode = true;
                    menuItem.mcBG.addEventListener(MouseEvent.CLICK, inBookmarkSelect);
                    menuItem.tName.htmlText = MapRoom._bookmarks[i].name;
                    menuItem.visible = true;
                    this._popupBookmarkMenu[i] = menuItem;
                    this.addChild(this._popupBookmarkMenu[i]);
                    i++;
                }
                this._menuShown = true;
            }
            else {
                this.HideBookmarkMenu();
            }
        }

        public function HideBookmarkMenu():void {
            var _loc1_:int = 0;
            if (this._menuShown) {
                _loc1_ = 0;
                while (_loc1_ < this._popupBookmarkMenu.length) {
                    if (this._popupBookmarkMenu[_loc1_].parent) {
                        this._popupBookmarkMenu[_loc1_].parent.removeChild(this._popupBookmarkMenu[_loc1_]);
                    }
                    _loc1_++;
                }
                this._menuShown = false;
                SOUNDS.Play("close");
            }
        }

        public function JumpToCoordinate(param1:String, param2:String):String {
            var _loc5_:int = 0;
            var _loc6_:int = 0;
            if (GLOBAL.INFERNO_ONLY) {
                // Coordinates are shown as negatives here, so players type them that way. Everything that
                // is not a digit is dropped before the numbers are read: minus signs, spaces, brackets.
                param1 = param1 ? param1.replace(/[^0-9]/g, "") : "";
                param2 = param2 ? param2.replace(/[^0-9]/g, "") : "";
            }
            var _loc3_:Number = param1 == "" ? NaN : Number(param1);
            var _loc4_:Number = param2 == "" ? NaN : Number(param2);
            if (!isNaN(_loc3_) && !isNaN(_loc4_)) {
                _loc5_ = int(_loc3_);
                _loc6_ = int(_loc4_);
                if (_loc5_ >= 0 && _loc5_ < MapRoom._mapWidth && _loc6_ >= 0 && _loc6_ <= MapRoom._mapHeight) {
                    MapRoom._homePoint = new Point(_loc5_, _loc6_);
                    MapRoom.JumpTo(MapRoom._homePoint);
                    return "";
                }
                return KEYS.Get("map_coordinateoffmap");
            }
            return KEYS.Get("map_notanumber");
        }

        public function BookmarkSelect(param1:int):void {
            this.HideBookmarkMenu();
            if (MapRoom._bookmarks.length > param1) {
                MapRoom.JumpTo(MapRoom._bookmarks[param1].location);
            }
        }

        public function BookmarkRemove(param1:int):void {
            var _loc2_:int = 0;
            var _loc3_:int = 0;
            MapRoom._bookmarks.splice(param1, 1);
            if (this._popupBookmarkMenu[param1].parent) {
                this._popupBookmarkMenu[param1].parent.removeChild(this._popupBookmarkMenu[param1]);
            }
            this._popupBookmarkMenu.splice(param1, 1);
            if (MapRoom._bookmarks.length > 0) {
                _loc2_ = int(MapRoom._bookmarks.length);
                _loc3_ = param1;
                while (_loc3_ < _loc2_) {
                    --this._popupBookmarkMenu[_loc3_].mcBG.index;
                    this._popupBookmarkMenu[_loc3_].y -= this._popupBookmarkMenu[_loc3_].height;
                    MapRoom.BookmarkDataSet("mbm" + _loc3_, MapRoom._bookmarks[_loc3_].location.x * 10000 + MapRoom._bookmarks[_loc3_].location.y, false);
                    MapRoom.BookmarkDataSetStr("mbmn" + _loc3_, MapRoom._bookmarks[_loc3_].name, false);
                    _loc3_++;
                }
                MapRoom.BookmarkDataSet("mbms", _loc2_, false);
                MapRoom.BookmarkDataSet("mbm" + _loc2_, 0, false);
                MapRoom.BookmarkDataSetStr("mbmn" + _loc2_, "", false);
                MapRoom.BookmarksSave();
            }
            else {
                MapRoomManager.instance.BookmarksClear();
                this._menuShown = false;
            }
        }

        public function ShowBookmarkAddPopup(param1:MapRoomCell):void {
            SOUNDS.Play("click1");
            MapRoom._currentPosition = new Point(param1.X, param1.Y);
            this._popupBookmarkAdd.tName.htmlText = KEYS.Get("map_yardowner", {"v1": param1._name});
            this._popupBookmarkAdd.tMessage.htmlText = KEYS.Get("newmap_bm_add");
            this._popupBookmarkAdd.bSave.SetupKey("btn_save");
            this._popupBookmarkAdd.bSave.addEventListener(MouseEvent.CLICK, this.HideBookmarkAddPopupWithAdd);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupBookmarkAdd);
        }

        public function ShowRelocateMePopup(param1:MapRoomCell):void {
            SOUNDS.Play("click1");
            this._popupRelocateMe.Setup(param1);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupRelocateMe);
        }

        public function HideBookmarkAddPopup(param1:MouseEvent = null):void {
            if (this._popupBookmarkAdd.parent) {
                this._popupBookmarkAdd.parent.removeChild(this._popupBookmarkAdd);
            }
            GLOBAL.BlockerRemove();
        }

        public function HideBookmarkAddPopupWithAdd(param1:MouseEvent):void {
            GLOBAL.BlockerRemove();
            var _loc2_:Object = MapRoom.AddBookmark(this._popupBookmarkAdd.tName.text);
            if (_loc2_.hide && this._popupBookmarkAdd && Boolean(this._popupBookmarkAdd.parent)) {
                this._popupBookmarkAdd.parent.removeChild(this._popupBookmarkAdd);
            }
            if (_loc2_.message != "SUCCESS") {
                GLOBAL.Message(_loc2_.message);
            }
            SOUNDS.Play("close");
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
            var powerup:Number = POWERUPS.CheckPowers(null, "NORMAL");

            if (powerup == this._lastBuffCount)
                return;

            this._lastBuffCount = powerup;

            var _loc2_:int = this.mcBuffHolder.numChildren;
            while (_loc2_--) {
                this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OVER, this.BuffShow);
                this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OUT, this.BuffHide);
                this.mcBuffHolder.removeChildAt(_loc2_);
            }
            if (powerup > 0) {
                _loc3_ = 3;
                _loc4_ = 2;
                _loc5_ = -1 * (32 + 4);
                _loc6_ = 32 + 4;
                _loc7_ = 0;
                _loc8_ = 0;
                _loc9_ = 0;
                _loc10_ = 0;
                _loc11_ = POWERUPS.GetPowerups("NORMAL");
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
            var _loc7_:bubblepopupBuff = null;
            var _loc2_:MovieClip = param1.currentTarget as MovieClip;
            var _loc3_:String = "";
            var _loc4_:* = "";
            var _loc5_:* = _loc2_.name + "_desc";
            var _loc6_:String = "buff_duration";
            _loc3_ = KEYS.Get(_loc5_);
            _loc4_ = "<b>" + KEYS.Get(_loc6_) + "</b>";
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
                _loc7_ = new bubblepopupBuff();
                this._popupBuff = addChild(_loc7_) as bubblepopupBuff;
                _loc7_.Setup(_loc2_.x + _loc2_.width / 2, _loc2_.y + _loc2_.height + 4, _loc3_, _loc4_);
                _loc7_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2);
                if (_loc7_.x >= this.mcBuffHolder.x) {
                    _loc7_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2) - 60;
                    _loc7_.mcArrow.x = 60;
                }
                _loc7_.y = this.mcBuffHolder.y + (_loc2_.y + _loc2_.height + 4);
            }
            else {
                bubblepopupBuff(this._popupBuff).Update(_loc3_, _loc4_);
            }
        }

        public function BuffHide(param1:MouseEvent):void {
            if (this._popupBuff) {
                removeChild(this._popupBuff);
                bubblepopupBuff(this._popupBuff).Cleanup();
                this._popupBuff = null;
            }
        }

        public function BuffOff(param1:MouseEvent):void {
            POWERUPS._testToggleOffPowers = true;
            var _loc2_:MovieClip = param1.currentTarget as MovieClip;
            POWERUPS.Remove(_loc2_.name);
            this.BuffHide(null);
        }

        public function Help():void {
            Tutorial.ForceShowAll();
        }

        public function FullScreen():void {
            if (GLOBAL.isFullScreen) {
                this._fullScreen = true;
            }
            else {
                this._fullScreen = false;
            }
            MapRoomManager.instance.ResizeHandler();
        }

        public function Resize():void {
            var _loc1_:Boolean = false;
            if (GLOBAL.isFullScreen) {
                if (this._fullScreen != true) {
                    _loc1_ = true;
                }
            }
            else if (this._fullScreen != false) {
                _loc1_ = true;
            }
            if (_loc1_) {
                MapRoomManager.instance.ResizeHandler();
            }
        }
    }
}
