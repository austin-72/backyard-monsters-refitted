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
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.display.StageDisplayState;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.MouseEvent;
    import flash.utils.getTimer;
    import flash.display.DisplayObject;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import flash.net.URLRequest;
    import flash.text.TextField;
    import gs.TweenLite;
    import com.monsters.quests.IoQuests;

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

        /**
         * The world map (IoMapLod): the three widest zoom steps, the whole world in low detail. Static, like
         * the zoom, so the map opens on it again.
         */
        private static var s_ioLod:Boolean = false;

        /** The world map's zoom: 1, 2 or 4 times the whole world. */
        private static var s_ioLodZoom:int = 1;

        private var _ioLod:IoMapLod = null;

        private var _ioLastDragUpdate:int = 0;

        /**
         * Inferno-only, not when only viewing an invitation's place: the sidebar (find a player, bookmarks,
         * alliance, filters), the minimap, the coordinates and sharing places in chat.
         */
        private var _ioNewUi:Boolean = false;

        /** The zoom control (IoMapZoomControl), left of the window's full screen button. */
        private var _ioZoom:IoMapZoomControl = null;

        private var _ioSidebar:IoMapSidebar = null;
        private var _ioRelocate:Button_CLIP = null;

        private var _ioMinimap:IoMapMinimap = null;

        private var _ioCoords:Sprite = null;

        private var _ioCoordsText:TextField = null;

        /** The cell under the pointer, or null when it is not over the map. */
        private var _ioPointer:Point = null;

        /** The bubble of a clicked empty place (Share in chat, Bookmark). */
        private var _ioSpot:Sprite = null;


        private var _ioLastWheel:int = 0;

        /** The panel right of the map (the minimap, and what is under the pointer), framed like the sidebar. */
        private var _ioRight:frame_CLIP = null;

        /** The cell information's own lines, under the stock ones (IoMapPopup.ioShowInfoMore). */
        private var _ioInfoMore:TextField = null;

        /** The cell information's type line (under the name) and relation line (under the alliance). */
        private var _ioInfoType:TextField = null;

        private var _ioInfoRelation:TextField = null;

        private var _ioInfoHeight:int = 0;

        /** The world map's filters (the button left of the zoom buttons). */
        private var _ioFilters:IoMapFiltersPopup = null;

        /** The yard the world map last showed information for (x * 10000 + y). */
        private var _ioInfoYard:int = -1;

        /**
         * Full screen, the map is narrower by the panel on its right: the cell grid, laid out for the stock width,
         * moves left by half of that to stay in the middle.
         */
        private var _ioFsShift:Number = 0;

        public function MapRoomPopup() {
            var w:int;
            var h:int;
            var r:Rectangle;
            var i:int;
            this._sortArray = [];
            super();
            w = GLOBAL._ROOT.stage.stageWidth;
            h = GLOBAL.GetGameHeight();
            if (w > 1024 && !(GLOBAL.isFullScreen && GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly)) {
                w = 1024; // (full screen, the new map room uses the whole width: the map between its panels)
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
                if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
                    mcFrame2.height = h - 40; // the sidebar's lists get the room
                }
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
            if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
                // A panel as wide as the sidebar goes right of the map (IoBuildUi): the map is narrower (full
                // screen) or everything moves left by half of it (the window keeps its middle).
                var ioSide:Number = mcFrame.x - mcFrame2.x;
                if (GLOBAL.isFullScreen) {
                    mcFrame.width -= ioSide;
                    mcMask.mcMask.width = mcFrame.width;
                    // the grid is laid out for the stock 829 wide map: its middle moves to this one's
                    this._ioFsShift = 414.5 - mcFrame.width * 0.5;
                }
                else {
                    mcFrame.x -= ioSide * 0.5;
                    mcMask.x = mcFrame.x;
                    mcFrame2.x -= ioSide * 0.5;
                }
                mcBuffHolder.x = mcMask.x + mcMask.mcMask.width - 70;
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
            this.ioBuildUi();
            mcInfo.labelOwner.htmlText = "<b>" + KEYS.Get("label_owner") + "</b>";
            if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
                mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_type") + "</b>";
            }
            else {
                mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_alliance") + "</b>";
            }
            mcInfo.labelStatus.htmlText = "<b>" + KEYS.Get("label_status") + "</b>";
            mcInfo.labelLocation.htmlText = "<b>" + KEYS.Get("label_location") + "</b>";
            this.GenerateCells(MapRoom.ioFocus ? MapRoom.ioFocus : MapRoom._homePoint);
            MapRoom.ioFocus = null;
            if (GLOBAL.INFERNO_ONLY) {
                IoUnderworld.requestReach(true); // what the player's yards reach through the portals (IoUnderworld)
            }
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
            // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
            this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this._cellContainer.addEventListener(MouseEvent.CLICK, this.ContainerRelease);
            GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, this.ioContainerLeave);
            this.mcMask.mcBG.addChild(this._cellContainer);
            if (s_ioLod && GLOBAL.INFERNO_ONLY && IoUnderworld.under) {
                s_ioLod = false; // (the world map is the overworld's: the underworld opens on its cells)
            }
            if (s_ioLod && GLOBAL.INFERNO_ONLY) {
                s_ioLod = false;
                this.ioEnterLod(s_ioLodZoom);
            }
            else if (MapRoom.ioMark) {
                this.ioMarkSpot(MapRoom.ioMark.x, MapRoom.ioMark.y);
            }
            MapRoom.ioMark = null;
            this.ioViewChanged();
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
                this["mcR" + _loc1_].y = this._ioNewUi ? mcFrame2.y + 14 + (_loc1_ - 1) * 31 : mcFrame2.y + 18 + (_loc1_ - 1) * 36;
                this["mcR" + _loc1_].tR.htmlText = GLOBAL.ioTestMode() ? "Unlimited" : GLOBAL.FormatNumber(GLOBAL._resources["r" + _loc1_].Get());
                GLOBAL.ioFitText(this["mcR" + _loc1_].tR); // (Inferno-only: 131,533,296 lost its last digit)
                _loc2_ = int(100 / GLOBAL._resources["r" + _loc1_ + "max"] * GLOBAL._resources["r" + _loc1_].Get());
                if (_loc2_ > 90) {
                    _loc2_ = 90;
                }
                this["mcR" + _loc1_].mcBar.width = _loc2_;
                _loc1_++;
            }
            mcOutposts.x = mcFrame2.x + 20;
            mcOutposts.y = this._ioNewUi ? mcFrame2.y + 14 + 4 * 31 : mcFrame2.y + 162;
            mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length + " " + KEYS.Get("newmap_outposts");
            GLOBAL.ioFitText(mcOutposts.tR); // (Inferno-only: "0 Avant-postes" wrapped out of sight)
        }

        public function ShowInfo(param1:MapRoomCell):void {
            if (this._ioNewUi) {
                // The pointer's place, for the coordinates; the panel right of the map shows the rest.
                this.ioSetPointer(param1.X, param1.Y);
                if (s_ioLod) {
                    return;
                }
            }
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
                        mcInfo.tAlliance.htmlText = String(param1._alliance.name || ""); // (bug report 68: a name can be missing)
                    }
                    if (param1._base == 2 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = String(param1._alliance.name || ""); // (bug report 68: a name can be missing)
                    }
                    if (param1._base == 3 && Boolean(param1._mine)) {
                        mcInfo.tAlliance.htmlText = String(param1._alliance.name || ""); // (bug report 68: a name can be missing)
                    }
                    if (param1._base == 3 && !param1._mine) {
                        mcInfo.tAlliance.htmlText = String(param1._alliance.name || ""); // (bug report 68: a name can be missing)
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
                // (bug report 68: a cell without an owner's name, e.g. open ground in the Depths, stopped the game here)
                mcInfo.tOwner.htmlText = String((param1._base == 1 ? TRIBES.DisplayName(param1._name) : param1._name) || "");
                mcInfo.tUserId.text = KEYS.Get("label_userid", {"v1": param1._userID});
                mcInfo.tUserId.visible = true;
            }
            mcInfo.tLocation.htmlText = String(IoMapUi.location(param1.X, param1.Y) || "");
            mcInfo.visible = true;
            if (this._ioNewUi) {
                this._ioInfoYard = -1;
                if (!param1._water && param1._base == 0) {
                    mcInfo.tStatus.htmlText = ""; // open ground: nothing to say
                }
                this.ioShowInfoMore(param1);
            }
        }

        private function ProfilePic(param1:Number):void {
            var profilePic:Loader = null;
            var onImageLoad:Function = null;
            var LoadImageError:Function = null;
            var fbid:Number = param1;
            onImageLoad = function(param1:Event):void {
                profilePic.width = profilePic.height = 50;
                ioSmooth(profilePic);
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
                ioSmooth(profilePic);
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

        /** A loaded picture drawn smoothly (the cell information shows it at twice its size). */
        private static function ioSmooth(loader:Loader):void {
            try {
                if (loader.content is Bitmap) {
                    Bitmap(loader.content).smoothing = true;
                }
            }
            catch (e:Error) {
                // another site's picture that may not be read: drawn as it is
            }
        }

        private function TribePic(param1:String):void {
            var imageComplete:Function = null;
            var tribe:String = param1;
            imageComplete = function(param1:String, param2:BitmapData):void {
                var _loc3_:Bitmap = new Bitmap(param2);
                _loc3_.smoothing = true; // (drawn large in the map room's cell information)
                mcInfo.mcProfilePic.mcImage.addChild(_loc3_);
            };
            // Inferno-only: the tribe's large picture (150 high), made to the picture's 50 x 50 (the panel shows it
            // at about three times that), not the 50 x 50 one blown up (the user's, 29 September)
            if (GLOBAL.INFERNO_ONLY && InfernoMapTheme.tribeCellPicture(tribe, mcInfo.mcProfilePic.mcImage)) {
                return;
            }
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
            if (GLOBAL.INFERNO_ONLY) {
                IoUnderworld.modeFor(null); // the overworld's size again
                IoUnderworld.forgetReach();
            }
            if (this._ioLod) {
                this._ioLod.Cleanup();
                this._ioLod = null;
            }
            this.ioCleanupUi();

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
                this._cellContainer.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                this._cellContainer.removeEventListener(MouseEvent.CLICK, this.ContainerRelease);
                GLOBAL._ROOT.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                GLOBAL._ROOT.stage.removeEventListener(Event.MOUSE_LEAVE, this.ioContainerLeave);
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
                if (this._ioRelocate) {
                    this._ioRelocate.removeEventListener(MouseEvent.CLICK, this.ioRelocateClick);
                    this._ioRelocate = null;
                }
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
            this.ioHideTransient();
            if (s_ioLod) {
                this.ioLeaveLod(); // Home, Jump, a bookmark...: back to the map, there
            }
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
            // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
            this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this._cellContainer.addEventListener(MouseEvent.CLICK, this.ContainerRelease);
            GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, this.ioContainerLeave);
            this.mcMask.mcBG.addChild(this._cellContainer);
            this.Update();
            this.ioViewChanged();
        }

        private function GenerateCells(param1:Point):void {
            if (GLOBAL.INFERNO_ONLY) {
                // the layer the cell is on: the underworld or the overworld (IoUnderworld)
                IoUnderworld.modeFor(param1);
            }
            var cellIndex:int = 0;
            var rowIndex:int = 0;
            var mapRoomCell:MapRoomCell = null;
            var stageWidth:int = GLOBAL._ROOT.stage.stageWidth;
            var stageHeight:int = GLOBAL.GetGameHeight();
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
                this._cellContainer.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                this._cellContainer.removeEventListener(MouseEvent.CLICK, this.ContainerRelease);
                GLOBAL._ROOT.removeEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
                GLOBAL._ROOT.stage.removeEventListener(Event.MOUSE_LEAVE, this.ioContainerLeave);
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
                this._cellCountX = this.ioFullColumns();
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
                    mapRoomCell.ResetGroundVariant();
                    mapRoomCell.mc.mcPlayer.visible = false;
                    if (GLOBAL.INFERNO_ONLY) {
                        // Dark from the first frame: the art's first frame is green grass, and the next Update
                        // (which tints unloaded cells) is a frame later, which showed as a green flash.
                        InfernoMapTheme.applyUnloaded(mapRoomCell.mc);
                    }
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
                            this._cellContainer.x = -125 - this._ioFsShift;
                            this._cellContainer.y = 18;
                        }
                        else {
                            mapRoomCell.X += param1.x - 7;
                            this._cellContainer.x = -9 - this._ioFsShift;
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
            // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
            this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            this._cellContainer.addEventListener(MouseEvent.CLICK, this.ContainerRelease);
            GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, this.ContainerRelease);
            GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, this.ioContainerLeave);
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
            var centreX:Number = full ? 402 - this._ioFsShift : 288.5;
            var centreY:Number = full ? 317.5 : 227.5;
            this._cellCountX = Math.ceil((full ? this.ioFullColumns() : 16) / scale);
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
                    cell.ResetGroundVariant();
                    cell.mc.mcPlayer.visible = false;
                    if (GLOBAL.INFERNO_ONLY) {
                        InfernoMapTheme.applyUnloaded(cell.mc);
                    }
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
            var centreX:Number = GLOBAL.isFullScreen ? 402 - this._ioFsShift : 288.5;
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

        // ---------------------------------------------------------------------------------------------
        // Zoom: five steps. 0-2 are the world map at 1, 2 and 4 times the whole world (IoMapLod), 3 is the
        // map zoomed out (Far), 4 the map as it always was (Close). The -/+ control, the mouse wheel and a
        // pinch all move one step, towards the pointer (or the fingers): the place under it stays put.
        // ---------------------------------------------------------------------------------------------

        private static const IO_LOD_ZOOMS:Array = [1, 2, 4];

        /** The zoom step showing (0 = the whole world ... 4 = close). */
        private function ioLevel():int {
            if (s_ioLod) {
                return s_ioLodZoom >= 4 ? 2 : (s_ioLodZoom >= 2 ? 1 : 0);
            }
            return s_ioZoomedOut ? 3 : 4;
        }

        /** Without the world snapshot (not Inferno-only) there is no world map: Far and Close only. */
        private function ioMinLevel():int {
            if (GLOBAL.INFERNO_ONLY && IoUnderworld.under) {
                return 3; // the world map is the overworld's: the underworld goes no further out than Far
            }
            return GLOBAL.INFERNO_ONLY ? 0 : 3;
        }

        /** Pinch to zoom (IoPinchZoom, through MapRoom.ioPinch): one step, towards the fingers. */
        internal function ioPinchZoom(param1:Boolean, stageX:Number = NaN, stageY:Number = NaN):void {
            this.ioZoomStep(param1 ? 1 : -1, stageX, stageY);
        }

        private function ioOnWheel(e:MouseEvent):void {
            var target:DisplayObject = e.target as DisplayObject;
            if (!target || !(mcMask.contains(target) || this._ioLod && this._ioLod.contains(target))) {
                return; // over the sidebar, a popup or a panel: not a zoom
            }
            e.stopPropagation();
            // A trackpad sends a stream of small steps: one zoom step at most every so often.
            if (getTimer() - this._ioLastWheel < 220 || e.delta == 0) {
                return;
            }
            this._ioLastWheel = getTimer();
            this.ioZoomStep(e.delta > 0 ? 1 : -1, e.stageX, e.stageY);
        }

        /** One zoom step in (1) or out (-1), towards a point of the stage (NaN: the middle of the map). */
        internal function ioZoomStep(dir:int, stageX:Number = NaN, stageY:Number = NaN):void {
            var from:int = this.ioLevel();
            var to:int = Math.max(this.ioMinLevel(), Math.min(4, from + dir));
            var anchor:Point = null;
            if (to == from || !this._cellContainer) {
                return;
            }
            if (!isNaN(stageX) && !isNaN(stageY)) {
                anchor = mcMask.globalToLocal(new Point(stageX, stageY));
                if (anchor.x < 0 || anchor.y < 0 || anchor.x > mcMask.mcMask.width || anchor.y > this.ioMapHeight()) {
                    anchor = null;
                }
            }
            this.ioZoomTo(to, anchor);
        }

        /** Height of the map part of the window (the world map keeps a strip for its legend). */
        private function ioMapHeight():int {
            return this._ioLod ? this._ioLod.mapHeight : int(mcMask.mcMask.height);
        }

        /** Where the map puts the middle of the cell it is centred on (mask coordinates; see GenerateCells). */
        /** Full screen: columns enough for the map's width (18 for the stock 829 pixels), an even number. */
        private function ioFullColumns():int {
            var columns:int = Math.max(18, Math.ceil(mcMask.mcMask.width / (this._cellWidth * 0.75)) + 11);
            return columns % 2 == 1 ? columns + 1 : columns;
        }

        private function ioGridMiddle():Point {
            return GLOBAL.isFullScreen ? new Point(402 - this._ioFsShift, 317.5) : new Point(288.5, 227.5);
        }

        private function ioZoomTo(to:int, anchor:Point):void {
            var middle:Point = null;
            var at:Point = null;
            var cell:Point = null;
            var cellX:Number = NaN;
            var cellY:Number = NaN;
            var scale:Number = NaN;
            var target:Point = null;
            this.ioHideTransient();
            if (s_ioLod && this._ioLod) {
                middle = new Point(mcMask.mcMask.width * 0.5, this._ioLod.mapHeight * 0.5);
                at = anchor || middle;
                cellX = this._ioLod.centreX + (at.x - middle.x) / this._ioLod.scale;
                cellY = this._ioLod.centreY + (at.y - middle.y) / this._ioLod.scale;
            }
            else {
                middle = this.ioGridMiddle();
                at = anchor || middle;
                cell = this.ioCellNear(at.x, at.y);
                cellX = cell.x + 0.5;
                cellY = cell.y + 0.5;
            }
            if (to <= 2) {
                s_ioLodZoom = IO_LOD_ZOOMS[to];
                if (s_ioLod && this._ioLod) {
                    this._ioLod.setZoom(s_ioLodZoom, anchor ? anchor.x : -1, anchor ? anchor.y : -1);
                }
                else {
                    this.ioEnterLod(s_ioLodZoom, cellX, cellY, anchor);
                }
                this.ioViewChanged();
                return;
            }
            // To the map: the cell under the anchor stays under it.
            s_ioZoomedOut = to == 3;
            scale = s_ioZoomedOut ? IO_ZOOM_SCALE : 1;
            middle = this.ioGridMiddle();
            at = anchor || middle;
            target = new Point(Math.floor(cellX - (at.x - middle.x) / (this._cellWidth * 0.75 * scale)), Math.floor(cellY - (at.y - middle.y) / (this._cellHeight * scale)));
            target.x = (target.x % MapRoom._mapWidth + MapRoom._mapWidth) % MapRoom._mapWidth;
            target.y = (target.y % MapRoom._mapHeight + MapRoom._mapHeight) % MapRoom._mapHeight;
            this.JumpTo(target);
        }

        /** The map cell nearest a point of the map (mask coordinates). */
        private function ioCellNear(px:Number, py:Number):Point {
            var cell:MapRoomCell = null;
            var best:MapRoomCell = null;
            var bestDistance:Number = Number.MAX_VALUE;
            var dx:Number = NaN;
            var dy:Number = NaN;
            var scale:Number = this._cellContainer.scaleX;
            for each (cell in this._cells) {
                dx = this._cellContainer.x + scale * (cell.x + this._cellWidth * 0.5) - px;
                dy = this._cellContainer.y + scale * (cell.y + this._cellHeight * 0.5) - py;
                if (dx * dx + dy * dy < bestDistance) {
                    bestDistance = dx * dx + dy * dy;
                    best = cell;
                }
            }
            return best ? new Point(best.X, best.Y) : MapRoom._homePoint;
        }

        /** The map cell where the world map was opened (it goes back there). */
        private var _ioLodFocus:Point = null;

        /**
         * Shows the world map at a zoom. With a cell and an anchor, that cell is put under the anchor;
         * otherwise the map is centred where the cell map was.
         */
        private function ioEnterLod(zoom:int = 1, cellX:Number = NaN, cellY:Number = NaN, anchor:Point = null):void {
            var focus:Point = this.ioCentreCell();
            var scale:Number = this._cellContainer ? this._cellContainer.scaleX : 1;
            if (s_ioLod) {
                return;
            }
            s_ioLod = true;
            s_ioLodZoom = zoom;
            this._ioLodFocus = focus;
            this.HideBubble();
            this.HideBookmarkMenu();
            this.ioHideTransient();
            if (!this._ioNewUi) {
                mcInfo.visible = false;
            }
            if (this._cellContainer) {
                this._cellContainer.visible = false;
            }
            IoMapSnapshot.Request();
            // The part of the world the map window showed, in cells (columns are 3/4 of a cell apart).
            var spanX:int = Math.round(mcMask.mcMask.width / (this._cellWidth * 0.75 * scale));
            var spanY:int = Math.round(mcMask.mcMask.height / (this._cellHeight * scale));
            this._ioLod = new IoMapLod(int(mcMask.mcMask.width), int(mcMask.mcMask.height), focus, spanX, spanY, this.ioPickFromLod, zoom, isNaN(cellX) ? focus : new Point(Math.floor(cellX), Math.floor(cellY)));
            if (!isNaN(cellX) && anchor) {
                // the cell stays under the pointer
                this._ioLod.centreOn(cellX - (anchor.x - mcMask.mcMask.width * 0.5) / this._ioLod.scale, cellY - (anchor.y - this._ioLod.mapHeight * 0.5) / this._ioLod.scale);
            }
            this._ioLod.x = mcMask.x;
            this._ioLod.y = mcMask.y;
            this._ioLod.onViewChanged = this.ioLodMoved;
            this._ioLod.onPointer = this.ioSetPointer;
            this._ioLod.onHover = this.ioShowYardInfo;
            // Over the map, under the window's frame (its border and buttons) and the map's own panels.
            addChildAt(this._ioLod, getChildIndex(mcMask) + 1);
            this.ioViewChanged();
        }

        /** Leaves the world map (the caller then shows the map somewhere). */
        private function ioLeaveLod():void {
            s_ioLod = false;
            if (this._ioLod) {
                this._ioLod.Cleanup();
                this._ioLod = null;
            }
            if (this._cellContainer) {
                this._cellContainer.visible = true;
            }
        }

        private function ioPickFromLod(cellX:int, cellY:int):void {
            this.JumpTo(new Point(cellX, cellY));
            this.ioMarkSpot(cellX, cellY);
        }

        /** A new world snapshot arrived (MapRoom.ioSnapshotArrived). */
        internal function ioSnapshotChanged():void {
            if (this._ioLod) {
                this._ioLod.Redraw();
            }
            if (this._ioMinimap) {
                this._ioMinimap.Redraw();
            }
            if (this._ioSidebar) {
                this._ioSidebar.Refresh();
            }
        }

        /** The map cell on screen at a place, or null. */
        internal function ioCellAt(cellX:int, cellY:int):MapRoomCell {
            return this._cellLookup ? this._cellLookup[cellX * 10000 + cellY] as MapRoomCell : null;
        }

        // ---------------------------------------------------------------------------------------------
        // The map room's own panels (Inferno-only): the zoom control, the sidebar, the minimap and the
        // coordinates; sharing and bookmarking a clicked place.
        // ---------------------------------------------------------------------------------------------

        private function ioRelocateClick(e:MouseEvent):void {
            this.HideBookmarkMenu();
            IoRelocate.Ask();
        }

        private function ioBuildUi():void {
            var frame2H:int = int(mcFrame2.height);
            var sideX:int = int(mcFrame2.x) + 12;
            var sideW:int = 128;
            var sideTop:int = 0;
            var gap:Number = mcFrame.x - (mcFrame2.x + mcFrame2.width);
            var rightX:Number = 0;
            var infoTop:int = 0;
            var infoBottom:int = 0;
            var background:DisplayObject = null;
            var need:Number = NaN;
            var fit:Number = NaN;
            this._ioNewUi = GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly;
            this._ioZoom = new IoMapZoomControl(this.ioZoomStep, this.ioMinLevel());
            this._ioZoom.x = int(mcFrame.x + mcFrame.width - 80 - 6 - this._ioZoom.width);
            this._ioZoom.y = int(mcFrame.y - 8);
            addChild(this._ioZoom);
            if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
                // the world map's filters, left of the zoom buttons
                this._ioFilters = new IoMapFiltersPopup(this.ioFiltersChanged, function():Boolean {
                        return s_ioLod;
                    });
                this._ioFilters.x = int(this._ioZoom.x - 26 - 6);
                this._ioFilters.y = this._ioZoom.y;
                addChild(this._ioFilters);
            }
            addEventListener(MouseEvent.MOUSE_WHEEL, this.ioOnWheel);
            if (!this._ioNewUi) {
                this._ioZoom.setLevel(this.ioLevel());
                return;
            }
            this.UpdateResourceDisplay();
            this.bBookmarks.visible = false;
            // Home and Jump under the resources, side by side in the middle; the search and the lists under them.
            this.bHome.x = int(sideX + (sideW - (this.bHome.width + 8 + this.bJump.width)) * 0.5);
            this.bHome.y = int(mcOutposts.y + 36);
            this.bJump.x = int(this.bHome.x + this.bHome.width + 8);
            this.bJump.y = this.bHome.y;
            // Relocate: a new place on the map for the main yard, at the price of its resources and every
            // outpost (IoRelocate asks first).
            this._ioRelocate = new Button_CLIP();
            this._ioRelocate.Setup("Relocate", false, int(this.bJump.x + this.bJump.width - this.bHome.x), int(this.bHome.height));
            this._ioRelocate.name = "ioRelocate";
            this._ioRelocate.x = this.bHome.x;
            this._ioRelocate.y = int(this.bHome.y + this.bHome.height + 6);
            this._ioRelocate.addEventListener(MouseEvent.CLICK, this.ioRelocateClick);
            addChild(this._ioRelocate);
            sideTop = int(this._ioRelocate.y + this._ioRelocate.height + 8);
            this._ioSidebar = new IoMapSidebar(this, sideW, int(mcFrame2.y + frame2H - 18) - sideTop);
            this._ioSidebar.x = sideX;
            this._ioSidebar.y = sideTop;
            addChild(this._ioSidebar);
            // The panel right of the map: as big as the sidebar's, as far from the map.
            this._ioRight = new frame_CLIP();
            // Under the map's frame (its art sits just below mcFrame): the frame's buttons stay on top.
            addChildAt(this._ioRight, Math.max(0, getChildIndex(mcFrame) - 1));
            this._ioRight.width = mcFrame2.width;
            this._ioRight.height = mcFrame2.height;
            rightX = mcFrame.x + mcFrame.width + gap;
            this._ioRight.x = rightX;
            this._ioRight.y = mcFrame2.y;
            this._ioRight.Setup(false);
            // The minimap at its top, the cell information under it, down to its bottom.
            this._ioMinimap = new IoMapMinimap(int(mcInfo.width), this.ioMinimapPick);
            this._ioMinimap.x = int(rightX + (mcFrame2.width - this._ioMinimap.size) * 0.5);
            this._ioMinimap.y = int(mcFrame2.y + 18);
            addChild(this._ioMinimap);
            infoTop = int(this._ioMinimap.y + this._ioMinimap.size + 12);
            infoBottom = int(mcFrame2.y + frame2H - 18);
            mcInfo.x = this._ioMinimap.x;
            mcInfo.y = infoTop;
            background = mcInfo.numChildren > 0 ? mcInfo.getChildAt(0) : null;
            if (background && infoBottom - infoTop > background.height) {
                background.height = infoBottom - infoTop;
            }
            this._ioInfoHeight = infoBottom - infoTop;
            this._ioInfoMore = IoMapUi.label("", 10, 0x000000, false, int(mcInfo.width) - 12);
            this._ioInfoMore.multiline = true;
            this._ioInfoMore.wordWrap = true;
            this._ioInfoMore.x = 6;
            mcInfo.addChild(this._ioInfoMore);
            this._ioInfoType = IoMapUi.label("", 10, 0x333333, false, int(mcInfo.width) - 14);
            mcInfo.addChild(this._ioInfoType);
            this._ioInfoRelation = IoMapUi.label("", 10, 0x333333, false, int(mcInfo.width) - 14);
            mcInfo.addChild(this._ioInfoRelation);
            // The picture almost as wide as the panel, the alliance's badge in its corner.
            mcInfo.mcProfilePic.scaleX = mcInfo.mcProfilePic.scaleY = (mcInfo.width - 10) / Math.max(1, mcInfo.mcProfilePic.width);
            mcInfo.mcProfilePic.x = 5;
            mcInfo.mcProfilePic.y = 5;
            mcInfo.mcAlliancePic.scaleX = mcInfo.mcAlliancePic.scaleY = 0.8;
            mcInfo.mcAlliancePic.x = int(5 + mcInfo.mcProfilePic.width - mcInfo.mcAlliancePic.width - 3);
            mcInfo.mcAlliancePic.y = int(5 + mcInfo.mcProfilePic.height - mcInfo.mcAlliancePic.height - 3);
            addChild(mcInfo); // over the new panel's frame
            this.ioInfoEmpty();
            if (this._ioFilters) {
                addChild(this._ioFilters); // its panel over everything around the map
            }
            this._ioCoords = new Sprite();
            this._ioCoords.mouseEnabled = false;
            this._ioCoords.mouseChildren = false;
            this._ioCoordsText = IoMapUi.label("", 11, IoMapUi.LIGHT, false, 320);
            this._ioCoordsText.x = 10;
            this._ioCoordsText.y = 4;
            this._ioCoords.addChild(this._ioCoordsText);
            addChild(this._ioCoords);
            GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_DOWN, this.ioStageDown, true);
            mcMask.addEventListener(MouseEvent.ROLL_OUT, this.ioMapOut);
            IoMapSnapshot.Request();
            // With the panel the window is wider than the game's own 760: on a narrower screen it is made
            // smaller to fit, around its middle.
            need = mcFrame2.width + gap + mcFrame.width + gap + mcFrame2.width + 2 * 55;
            if (!GLOBAL.isFullScreen && GLOBAL._ROOT.stage.stageWidth < need) {
                fit = Math.max(0.5, GLOBAL._ROOT.stage.stageWidth / need);
                scaleX = scaleY = fit;
                x = Math.round(380 * (1 - fit));
                y = Math.round(260 * (1 - fit));
            }
        }

        /** The cell information before the pointer has been over the map. */
        private function ioInfoEmpty():void {
            mcInfo.tOwner.htmlText = "";
            mcInfo.tAlliance.htmlText = "";
            mcInfo.tStatus.htmlText = "";
            mcInfo.tLocation.htmlText = "";
            mcInfo.tUserId.visible = false;
            mcInfo.mcAlliancePic.visible = false;
            this.ioInfoExtras("", "");
            this._ioInfoMore.htmlText = "<font color=\"#555555\">Point at a place on the map to see what is there.</font>";
            this.ioLayoutInfo();
            mcInfo.visible = true;
        }

        /** The type line (Main Yard, Outpost, Wild Monsters...) and the relation line (none without an alliance). */
        private function ioInfoExtras(type:String, relation:String):void {
            this._ioInfoType.text = type;
            this._ioInfoType.visible = type.length > 0;
            this._ioInfoRelation.text = relation;
            this._ioInfoRelation.visible = relation.length > 0;
        }

        /**
         * The cell information, top to bottom: the picture, owner (level) with the type and user ID under it,
         * alliance with the relation under it, status, location, then anything more (being played or attacked).
         */
        private function ioLayoutInfo():void {
            var y:Number = 5 + mcInfo.mcProfilePic.height + 5;
            var background:DisplayObject = mcInfo.numChildren > 0 ? mcInfo.getChildAt(0) : null;
            var line:Function = function(field:TextField, x:int, step:int):void {
                if (field.visible) {
                    field.x = x;
                    field.y = y;
                    field.width = mcInfo.mcProfilePic.width - x + 5;
                    y += step;
                }
            };
            line(mcInfo.labelOwner, 5, 13);
            line(mcInfo.tOwner, 10, 14);
            line(this._ioInfoType, 10, 14);
            line(mcInfo.tUserId, 10, 14);
            y += 3;
            line(mcInfo.labelAlliance, 5, 13);
            line(mcInfo.tAlliance, 10, 14);
            line(this._ioInfoRelation, 10, 14);
            y += 3;
            line(mcInfo.labelStatus, 5, 13);
            line(mcInfo.tStatus, 10, 15);
            y += 3;
            line(mcInfo.labelLocation, 5, 13);
            line(mcInfo.tLocation, 10, 17);
            this._ioInfoMore.y = y;
            this._ioInfoMore.height = Math.max(16, (background ? background.height : this._ioInfoHeight) - y - 4);
        }

        /** The lines of the cell information under the stock ones ("Label: value"). */
        private function ioInfoLines(lines:Array):void {
            var html:String = "";
            for each (var line:Array in lines) {
                html += "<b>" + line[0] + ":</b> " + IoMapUi.escape(String(line[1])) + "<br>";
            }
            this._ioInfoMore.htmlText = html;
        }

        /** The type of a place, as the cell information says it. */
        private static function ioTypeName(base:int, water:Boolean):String {
            if (water) {
                return "Lava";
            }
            return base == 0 ? "Open Ground" : (base == 1 ? "Wild Monsters" : (base == 2 ? "Main Yard" : "Outpost"));
        }

        /** How you stand with a yard's alliance, under the alliance's name. */
        private static function ioRelationName(relation:int):String {
            return relation == IoMapUi.YOU ? IoMapUi.RELATION_NAMES[IoMapUi.ALLY] : IoMapUi.RELATION_NAMES[relation];
        }

        /** The cell under the pointer (the map): the lines the stock panel does not have. */
        private function ioShowInfoMore(cell:MapRoomCell):void {
            var lines:Array = [];
            var now:int = GLOBAL.Timestamp();
            var relation:String = "";
            if (cell._base >= 1 && cell._name) {
                mcInfo.tOwner.htmlText = IoMapUi.escape(cell._base == 1 ? TRIBES.DisplayName(cell._name) : cell._name) + " (" + cell._level + ")";
            }
            if (cell._base >= 2 && cell._alliance) {
                relation = ioRelationName(cell._mine ? IoMapUi.YOU : IoMapUi.relation(cell._userID, cell._allianceID));
            }
            this.ioInfoExtras(ioTypeName(cell._base, cell._water), relation);
            if (cell._base >= 2 && cell._locked != 0 && cell._locked != LOGIN._playerID) {
                lines.push(["Now", "Being played or attacked"]);
            }
            this.ioInfoLines(lines);
            this.ioLayoutInfo();
        }

        /** The world map: what the snapshot knows about the yard under the pointer, in the same panel. */
        private function ioShowYardInfo(yard:Array):void {
            var key:int = 0;
            var uid:int = 0;
            var player:Object = null;
            var alliance:Object = null;
            var relation:int = 0;
            var lines:Array = [];
            var i:int = 0;
            if (!yard || !this._ioInfoMore) {
                return;
            }
            key = int(yard[0]) * 10000 + int(yard[1]);
            if (key == this._ioInfoYard) {
                return;
            }
            this._ioInfoYard = key;
            uid = int(yard[3]);
            player = IoMapSnapshot.PlayerInfo(uid) || {};
            alliance = int(player.alliance) ? IoMapSnapshot.AllianceInfo(int(player.alliance)) : null;
            relation = IoMapUi.relation(uid, int(player.alliance));
            i = int(mcInfo.mcProfilePic.mcImage.numChildren);
            while (i--) {
                mcInfo.mcProfilePic.mcImage.removeChildAt(i);
            }
            i = int(mcInfo.mcAlliancePic.mcImage.numChildren);
            while (i--) {
                mcInfo.mcAlliancePic.mcImage.removeChildAt(i);
            }
            mcInfo.mcAlliancePic.visible = false;
            if (player.avatar && !GLOBAL._flags.viximo) {
                this.ProfilePicVix(String(player.avatar));
            }
            mcInfo.tOwner.htmlText = IoMapUi.escape(String(player.name || "?")) + " (" + (int(player.level) || int(yard[11])) + ")";
            mcInfo.tUserId.text = KEYS.Get("label_userid", {"v1": uid});
            mcInfo.tUserId.visible = true;
            mcInfo.tAlliance.htmlText = alliance ? IoMapUi.escape(String(alliance.name)) : "No alliance";
            mcInfo.tStatus.htmlText = int(yard[8]) > 0 ? "<font color=\"#FF0000\">" + KEYS.Get("newmap_inf_damaged", {"v1": int(yard[8])}) + "</font>" : "Fine";
            mcInfo.tLocation.htmlText = IoMapUi.location(int(yard[0]), int(yard[1]));
            mcInfo.visible = true;
            this.ioInfoExtras(int(yard[2]) == 2 ? "Main Yard" : "Outpost", alliance ? ioRelationName(relation) : "");
            if (int(yard[12]) != 0 && int(yard[3]) != LOGIN._playerID) {
                lines.push(["Now", "Being played or attacked"]);
            }
            this.ioInfoLines(lines);
            this.ioLayoutInfo();
        }

        private function ioCleanupUi():void {
            removeEventListener(MouseEvent.MOUSE_WHEEL, this.ioOnWheel);
            IoMapShare.HideChooser();
            this.ioHideTransient();
            if (this._ioZoom) {
                this._ioZoom.Cleanup();
                this._ioZoom = null;
            }
            if (this._ioFilters) {
                this._ioFilters.Cleanup();
                this._ioFilters = null;
            }
            if (this._ioSidebar) {
                this._ioSidebar.Cleanup();
                this._ioSidebar = null;
            }
            if (this._ioMinimap) {
                this._ioMinimap.Cleanup();
                this._ioMinimap = null;
            }
            if (this._ioRight) {
                this._ioRight.Clear();
                if (this._ioRight.parent) {
                    this._ioRight.parent.removeChild(this._ioRight);
                }
                this._ioRight = null;
            }
            if (this._ioCoords && this._ioCoords.parent) {
                this._ioCoords.parent.removeChild(this._ioCoords);
            }
            this._ioCoords = null;
            if (this._ioNewUi) {
                GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_DOWN, this.ioStageDown, true);
                mcMask.removeEventListener(MouseEvent.ROLL_OUT, this.ioMapOut);
            }
        }

        /** After a jump, a zoom or a change of view: the panels follow. */
        private function ioViewChanged():void {
            if (this._ioZoom) {
                this._ioZoom.setLevel(this.ioLevel());
            }
            if (GLOBAL.INFERNO_ONLY) {
                this.ioUnderBanner();
            }
            if (this.ioLevel() == 0) {
                IoQuests.once("map_world"); // (the quest book: the whole world in view)
            }
            if (!this._ioNewUi) {
                return;
            }
            this.ioPlacePanels();
            this.ioLodMoved();
        }

        /** Inferno-only: the name over the map while it shows the underworld; the minimap is the overworld's. */
        private var _ioUnderBanner:Sprite = null;

        private function ioUnderBanner():void {
            var text:TextField = null;
            if (this._ioMinimap) {
                this._ioMinimap.visible = !IoUnderworld.under;
            }
            if (!IoUnderworld.under) {
                if (this._ioUnderBanner && this._ioUnderBanner.parent) {
                    this._ioUnderBanner.parent.removeChild(this._ioUnderBanner);
                }
                this._ioUnderBanner = null;
                return;
            }
            if (!this._ioUnderBanner) {
                this._ioUnderBanner = new Sprite();
                this._ioUnderBanner.name = "ioUnderBanner";
                this._ioUnderBanner.mouseEnabled = false;
                this._ioUnderBanner.mouseChildren = false;
                text = IoMapUi.label("", 13, IoMapUi.LIGHT, false, 300, "center");
                text.multiline = true;
                text.htmlText = "<b>THE DEPTHS OF HELL</b><br><font size=\"10\" color=\"#D9C49A\">Portals lead back up. Home returns to your yard.</font>";
                text.height = 40;
                text.y = 4;
                this._ioUnderBanner.addChild(text);
                IoMapUi.roundBox(this._ioUnderBanner.graphics, 0, 0, 300, 46, IoMapUi.DARK, 0.9, 0xC0542A, 10, 2);
            }
            this._ioUnderBanner.x = int(mcMask.x + (mcMask.mcMask.width - 300) * 0.5);
            this._ioUnderBanner.y = int(mcMask.y + 8);
            addChild(this._ioUnderBanner);
        }

        /** The coordinates in the map's bottom left corner. */
        private function ioPlacePanels(e:Event = null):void {
            var bottom:int = int(mcMask.y + this.ioMapHeight());
            if (!this._ioNewUi) {
                return;
            }
            this._ioCoords.x = int(mcMask.x + 10);
            this._ioCoords.y = int(bottom - 36);
            this.ioUpdateCoords();
        }

        /** The view moved: the minimap's box and the coordinates follow. */
        private function ioLodMoved():void {
            var centre:Point = null;
            var scale:Number = NaN;
            if (!this._ioNewUi) {
                return;
            }
            if (s_ioLod && this._ioLod) {
                this._ioMinimap.setView(this._ioLod.centreX, this._ioLod.centreY, this._ioLod.spanCellsX, this._ioLod.spanCellsY);
            }
            else if (this._cellContainer) {
                centre = this.ioCentreCell();
                scale = this._cellContainer.scaleX;
                this._ioMinimap.setView(centre.x + 0.5, centre.y + 0.5, mcMask.mcMask.width / (this._cellWidth * 0.75 * scale), mcMask.mcMask.height / (this._cellHeight * scale));
            }
            this.ioUpdateCoords();
        }

        /** The middle of what the map shows, as a cell. */
        private function ioViewCentre():Point {
            if (s_ioLod && this._ioLod) {
                return this._ioLod.centre;
            }
            return this.ioCentreCell();
        }

        private function ioSetPointer(cellX:int, cellY:int):void {
            this._ioPointer = cellX >= 0 ? new Point(cellX, cellY) : null;
            this.ioUpdateCoords();
        }

        /** The pointer left the map: the coordinates stop showing it (the cell information stays). */
        private function ioMapOut(e:MouseEvent):void {
            this._ioPointer = null;
            this.ioUpdateCoords();
        }

        /** The cell under the pointer, in the map's bottom left corner (nothing when the pointer is elsewhere). */
        private function ioUpdateCoords():void {
            var text:String = null;
            if (!this._ioCoords) {
                return;
            }
            this._ioCoords.visible = this._ioPointer != null;
            if (!this._ioPointer) {
                return;
            }
            text = "<b>" + IoMapUi.coord(this._ioPointer.x, this._ioPointer.y) + "</b>";
            if (this._ioCoords.name == text) {
                return; // unchanged
            }
            this._ioCoords.name = text;
            this._ioCoordsText.htmlText = text;
            this._ioCoordsText.width = this._ioCoordsText.textWidth + 8;
            this._ioCoords.graphics.clear();
            IoMapUi.roundBox(this._ioCoords.graphics, 0, 0, this._ioCoordsText.width + 20, 26, IoMapUi.DARK, 0.94, 0x8C7552, 13, 1);
        }

        private function ioMinimapPick(cellX:int, cellY:int, done:Boolean):void {
            this.ioHideTransient();
            if (s_ioLod && this._ioLod) {
                this._ioLod.centreOn(cellX + 0.5, cellY + 0.5);
            }
            else if (done) {
                this.JumpTo(new Point(cellX, cellY));
            }
        }

        /** A mouse press anywhere (before anything else hears it): open lists and bubbles elsewhere close. */
        private function ioStageDown(e:MouseEvent):void {
            var target:DisplayObject = e.target as DisplayObject;
            if (this._ioSidebar) {
                this._ioSidebar.ioStageDown(target);
            }
            if (this._ioFilters) {
                this._ioFilters.ioStageDown(target);
            }
            if (this._ioSpot && target && !this._ioSpot.contains(target)) {
                this.ioHideSpot();
            }
        }

        /** Closes the bubbles that belong to one place on the map (a move or zoom leaves them behind). */
        private function ioHideTransient():void {
            this.ioHideSpot();
            IoMapShare.HideChooser();
        }

        // ---- a place picked on the map

        /** A name for a place: the yard's owner, the tribe, or where it is. */
        private function ioPlaceName(cell:MapRoomCell):String {
            if (cell && cell._base == 1 && cell._name) {
                return TRIBES.DisplayName(cell._name) + " " + cell._level;
            }
            if (cell && cell._base > 1 && cell._name) {
                return String(cell._name);
            }
            return cell ? IoMapUi.coord(cell.X, cell.Y) : "";
        }

        /** The map area, in this window's coordinates. */
        private function ioMapArea():Rectangle {
            return new Rectangle(mcMask.x, mcMask.y, mcMask.mcMask.width, this.ioMapHeight());
        }

        /** A click on an empty place (lava): a bubble with Share in chat and Bookmark (MapRoomCell). */
        internal function ioShowSpot(cell:MapRoomCell):void {
            var bubble:Sprite = new Sprite();
            var at:Point = null;
            var w:int = 216;
            var h:int = 72;
            var title:TextField = null;
            var share:MovieClip = null;
            var mark:MovieClip = null;
            var cellX:int = cell.X;
            var cellY:int = cell.Y;
            var area:Rectangle = this.ioMapArea();
            var self:MapRoomPopup = this;
            if (!this._ioNewUi || this._dragged) {
                return;
            }
            if (IoUnderworld.isVoid(cellX, cellY)) {
                return; // the lava around the underworld
            }
            if (cell._ioPortal) {
                this.ioShowPortal(cell);
                return;
            }
            this.ioHideTransient();
            IoMapUi.glass(bubble.graphics, w, h, 9);
            title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, w - 20);
            title.htmlText = "<b>" + (cell._water ? "Lava" : "Open ground") + "</b> <font color=\"#D9C49A\">at " + IoMapUi.coord(cellX, cellY) + "</font>";
            title.x = 10;
            title.y = 8;
            bubble.addChild(title);
            share = IoMapUi.button("Share in chat", 108, 26, function(e:MouseEvent):void {
                    var p:Point = self.globalToLocal(share.localToGlobal(new Point(54, 0)));
                    self.ioHideSpot();
                    IoMapShare.ShowChooser(self, p.x, p.y + 8, area, cellX, cellY);
                }, "gold", 10);
            share.x = 10;
            share.y = 36;
            bubble.addChild(share);
            mark = IoMapUi.button("Bookmark", 80, 26, function(e:MouseEvent):void {
                    self.ioHideSpot();
                    self.ShowBookmarkAddPopup(cell);
                }, "grey", 10);
            mark.x = 126;
            mark.y = 36;
            bubble.addChild(mark);
            at = globalToLocal(cell.localToGlobal(new Point(this._cellWidth * 0.5, this._cellHeight * 0.5)));
            bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, at.x - w * 0.5)));
            bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, at.y - h - 24)));
            addChild(bubble);
            this._ioSpot = bubble;
        }

        /**
         * Inferno-only: a click on a portal (IoUnderworld). Up here: where it comes out below, and Enter (with a yard
         * that has the portal in its Flinger range, or an outpost below already). Below: where it comes out up here,
         * and Go up. Both: Share in chat.
         */
        private function ioShowPortal(cell:MapRoomCell):void {
            var bubble:Sprite = new Sprite();
            var at:Point = null;
            var w:int = 300;
            var h:int = 112;
            var portal:Array = cell._ioPortal;
            var below:Boolean = IoUnderworld.isUnder(cell.X, cell.Y);
            var index:int = int(portal[0]);
            var toX:int = below ? int(portal[1]) : int(portal[3]);
            var toY:int = below ? int(portal[2]) : int(portal[4]);
            // Anyone can go through to look (the user's rule, 4 October); attacking there still needs the range
            var reach:Boolean = below || IoUnderworld.entryOpen(index) || IoUnderworld.hasOutpostBelow();
            var cellX:int = cell.X;
            var cellY:int = cell.Y;
            var area:Rectangle = this.ioMapArea();
            var self:MapRoomPopup = this;
            var title:TextField = null;
            var text:TextField = null;
            var go:MovieClip = null;
            var share:MovieClip = null;
            this.ioHideTransient();
            IoMapUi.glass(bubble.graphics, w, h, 9);
            title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, w - 20);
            title.htmlText = "<b>" + (below ? "Portal to the Inferno" : "Portal to the " + IoUnderworld.NAME) + "</b>";
            title.x = 10;
            title.y = 8;
            bubble.addChild(title);
            text = IoMapUi.label("", 11, IoMapUi.LIGHT_MUTED, false, w - 20);
            text.htmlText = below ? "Comes out at " + IoMapUi.coord(toX, toY) + ". Next to it, your outposts attack up to " + IoUnderworld.exitRange + " cells from there." : "Comes out at " + IoMapUi.coord(toX, toY) + "." + (reach ? "" : " To attack down there, one of your yards needs this portal in its Flinger range.");
            text.wordWrap = true;
            text.multiline = true;
            text.height = 40;
            text.x = 10;
            text.y = 28;
            bubble.addChild(text);
            go = IoMapUi.button(below ? "Go up" : "Enter the " + IoUnderworld.NAME, 170, 26, function(e:MouseEvent):void {
                    SOUNDS.Play("click1");
                    self.ioGoTo(toX, toY);
                }, "gold", 10);
            go.name = "ioPortalGo";
            go.x = 10;
            go.y = h - 34;
            bubble.addChild(go);
            share = IoMapUi.button("Share in chat", 100, 26, function(e:MouseEvent):void {
                    var p:Point = self.globalToLocal(share.localToGlobal(new Point(50, 0)));
                    self.ioHideSpot();
                    IoMapShare.ShowChooser(self, p.x, p.y + 8, area, cellX, cellY);
                }, "grey", 10);
            share.x = w - 110;
            share.y = h - 34;
            bubble.addChild(share);
            bubble.name = "ioPortalBubble";
            at = globalToLocal(cell.localToGlobal(new Point(this._cellWidth * 0.5, this._cellHeight * 0.5)));
            bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, at.x - w * 0.5)));
            bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, at.y - h - 24)));
            addChild(bubble);
            this._ioSpot = bubble;
        }

        /** Inferno-only: ioreach came (IoUnderworld): range drawn again, an open enemy popup worked out again. */
        internal function ioReachArrived():void {
            this.Update(true);
            if (this._popupInfoEnemy && this._popupInfoEnemy.parent) {
                this._popupInfoEnemy.ioRefresh();
            }
        }

        private function ioHideSpot():void {
            if (this._ioSpot) {
                if (this._ioSpot.parent) {
                    this._ioSpot.parent.removeChild(this._ioSpot);
                }
                this._ioSpot = null;
            }
        }

        /** A yard's popup: a "Share in chat" button under it, for the yard's place. */
        private function ioAttachShare(popup:Sprite, cell:MapRoomCell):void {
            var old:DisplayObject = null;
            var bounds:Rectangle = null;
            var button:MovieClip = null;
            var cellX:int = cell.X;
            var cellY:int = cell.Y;
            var area:Rectangle = this.ioMapArea();
            var self:MapRoomPopup = this;
            if (!this._ioNewUi || !popup) {
                return;
            }
            old = popup.getChildByName("ioShare");
            if (old) {
                popup.removeChild(old);
            }
            bounds = popup.getBounds(popup);
            button = IoMapUi.button("Share this place in chat", 180, 26, function(e:MouseEvent):void {
                    var p:Point = self.globalToLocal(button.localToGlobal(new Point(90, 0)));
                    IoMapShare.ShowChooser(self, p.x, p.y, area, cellX, cellY);
                }, "gold", 10);
            button.name = "ioShare";
            button.x = Math.round(bounds.x + (bounds.width - 180) * 0.5);
            button.y = Math.round(bounds.bottom + 6);
            if (popup.y + button.y + 30 > area.bottom + 30) {
                button.y = Math.round(bounds.y - 32); // no room below: above it
            }
            popup.addChild(button);
        }

        /** Marks a place for a moment (after going there from a search, a bookmark or chat). */
        internal function ioMarkSpot(cellX:int, cellY:int):void {
            var cell:MapRoomCell = this.ioCellAt(cellX, cellY);
            var mark:Shape = null;
            var centre:Point = null;
            if (!cell || !this._cellContainer || s_ioLod) {
                return;
            }
            mark = new Shape();
            mark.graphics.lineStyle(4, 0xFFD24A, 1);
            mark.graphics.drawEllipse(-58, -30, 116, 60);
            mark.graphics.lineStyle(2, 0xFFFFFF, 0.9);
            mark.graphics.drawEllipse(-52, -26, 104, 52);
            centre = new Point(cell.x + this._cellWidth * 0.5, cell.y + this._cellHeight * 0.5 + 10);
            mark.x = centre.x;
            mark.y = centre.y;
            this._cellContainer.addChild(mark);
            mark.alpha = 0;
            TweenLite.to(mark, 0.35, {"alpha": 1});
            TweenLite.to(mark, 0.6, {
                        "alpha": 0,
                        "delay": 2.2,
                        "onComplete": function():void {
                            if (mark.parent) {
                                mark.parent.removeChild(mark);
                            }
                        }
                    });
        }

        // ---- for the sidebar

        /** Goes to a place: the map (not the world map), centred there, the place marked. */
        internal function ioGoTo(cellX:int, cellY:int):void {
            this.ioHideTransient();
            this.JumpTo(new Point(cellX, cellY));
            this.ioMarkSpot(cellX, cellY);
        }

        internal function ioGoHome():void {
            this.ioHideTransient();
            MapRoom.JumpTo(GLOBAL._mapHome);
        }

        internal function ioFiltersChanged():void {
            if (this._ioLod) {
                this._ioLod.Tick();
            }
        }

        internal function ioBookmarksChanged():void {
            if (this._ioLod) {
                this._ioLod.Tick();
            }
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
                this.ioHideTransient();
            }
            // The mouse can report many moves per frame, and Update() walks every cell (480 when zoomed
            // out). The layer itself has already moved above; recycling cells can wait for the next
            // 25 ms slot, and the release handler runs a final pass so nothing is left unrecycled.
            if (getTimer() - this._ioLastDragUpdate >= 25) {
                this._ioLastDragUpdate = getTimer();
                this.Update();
            }
        }

        private function ioContainerLeave(param1:Event):void {
            this.ContainerRelease(null);
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
            if (this._ioSidebar) {
                this._ioSidebar.Refresh();
            }
            if (this._ioMinimap) {
                this._ioMinimap.Redraw();
            }
            if (s_ioLod) {
                // The world map: nothing on the cell grid is shown or asked for.
                if (this._ioLod) {
                    this._ioLod.Tick();
                }
                return;
            }
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
            if (s_ioLod) {
                return; // the world map is shown instead of the cells (IoMapLod)
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
                    cell.ResetGroundVariant();
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
                // A cell drawn from the world snapshot takes its zone's getarea data (or a newer snapshot) as soon
                // as it arrives; the object check below leaves it alone until then.
                if ((!cell._updated || param1 || cell._ioSnap) && (cell._dataAge <= 0 || cell._ioSnap)) {
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
                if (GLOBAL._playerFlingerLevel.Get() > 0 && !(GLOBAL.INFERNO_ONLY && IoUnderworld.under)) {
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

                    if (rangeCell._ioUnder) {
                        // Inferno-only: an underworld outpost's range is 1, Declare War or not (IoUnderworld)
                        if (!this._dragged && !rangeCell._over) {
                            rangeCell.mc.mcGlow.alpha = 0.5;
                        }
                        rangeCell._inRange = true;
                        this.ApplyRangeHighlighting(rangeCell.X, rangeCell.Y, rangeCell._flingerRange.Get(), true);
                        continue;
                    }
                    flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [rangeCell._flingerRange.Get()]);
                    this.ShowRange(rangeCell, flingerRange);
                }
                if (GLOBAL.INFERNO_ONLY && !this._dragged) {
                    // Inferno-only: what the player reaches through the portals, on this layer (IoUnderworld)
                    for each (var ioReach:Array in IoUnderworld.highlights()) {
                        this.ApplyRangeHighlighting(int(ioReach[0]), int(ioReach[1]), int(ioReach[2]), true);
                    }
                }
            }

            this.bBookmarks.Enabled = MapRoom._bookmarks.length > 0 || MapRoom._viewOnly;
            this.DisplayBuffs();
            this.ioLodMoved(); // the minimap's box and the coordinates
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
        private function ApplyRangeHighlighting(startOffsetX:int, startOffsetY:int, range:int, ioNoBonus:Boolean = false):void {
            var cell:MapRoomCell;
            var distance:int;
            var currentOffsetX:int;
            var currentOffsetY:int;
            var baseRange:int = range;

            if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL") && !ioNoBonus) {
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
        /** Inferno-only: own yards off the screen, by cell (made from their zone's data, remade when it changes). */
        private var _ioOffscreen:Object = {};

        /** Inferno-only: a cell asked for (GetCellsInRange) was in a zone not loaded yet; set until asked again. */
        public var ioOffscreenPending:Boolean = false;

        private function ioOffscreenCell(hexX:int, hexY:int):MapRoomCell {
            var zone:Object = MapRoom.ioZoneCell(hexX, hexY);
            if (!zone.loaded) {
                this.ioOffscreenPending = true;
                return null;
            }
            var data:Object = zone.data;
            if (!data || !data.mine) {
                return null;
            }
            var key:int = hexX * 10000 + hexY;
            var entry:Object = this._ioOffscreen[key];
            if (!entry || entry.data != data) {
                var made:MapRoomCell = new MapRoomCell();
                made.X = hexX;
                made.Y = hexY;
                made.Setup(data);
                entry = {"data": data, "cell": made};
                this._ioOffscreen[key] = entry;
            }
            return entry.cell as MapRoomCell;
        }

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

            // Inferno-only: one of the player's own yards beyond the tiles drawn on screen (the map only has
            // tiles for what is in view): its monsters can still be sent, so it is made from its zone's data
            if (GLOBAL.INFERNO_ONLY) {
                cell = this.ioOffscreenCell(hexX, hexY);
                if (cell) {
                    return cell;
                }
            }

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
                this.ioAttachShare(this._popupInfoMine, param1);
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
                this.ioAttachShare(this._popupInfoEnemy, param1);
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
                this.ioAttachShare(this._popupInfoEnemy, param1);
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
            if (param1 && (GLOBAL.ioTestMode() || !param1._protected && !(param1._truce && param1._truce > GLOBAL.Timestamp()))) {
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
                // Everything that is not a digit is dropped before the numbers are read: spaces, brackets, and
                // the minus signs players may still type (coordinates were shown as negatives until 4 October).
                param1 = param1 ? param1.replace(/[^0-9]/g, "") : "";
                param2 = param2 ? param2.replace(/[^0-9]/g, "") : "";
            }
            var _loc3_:Number = param1 == "" ? NaN : Number(param1);
            var _loc4_:Number = param2 == "" ? NaN : Number(param2);
            if (!isNaN(_loc3_) && !isNaN(_loc4_)) {
                _loc5_ = int(_loc3_);
                _loc6_ = int(_loc4_);
                // (Inferno-only: typed coordinates are the overworld's, also while the map shows the underworld)
                if (_loc5_ >= 0 && _loc5_ < (IoUnderworld.under ? 400 : MapRoom._mapWidth) && _loc6_ >= 0 && _loc6_ <= (IoUnderworld.under ? 400 : MapRoom._mapHeight)) {
                    MapRoom._homePoint = new Point(_loc5_, _loc6_);
                    MapRoom.JumpTo(MapRoom._homePoint);
                    if (GLOBAL.INFERNO_ONLY) {
                        IoQuests.once("map_jump"); // (the quest book)
                    }
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
            this._popupBookmarkAdd.tName.htmlText = this._ioNewUi && (param1._base <= 1 || !param1._name) ? IoMapUi.escape(this.ioPlaceName(param1)) : KEYS.Get("map_yardowner", {"v1": param1._name});
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
            else if (this._ioSidebar) {
                this._ioSidebar.Refresh(true);
                this.ioBookmarksChanged();
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
