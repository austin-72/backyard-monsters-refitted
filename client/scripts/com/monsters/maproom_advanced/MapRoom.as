package com.monsters.maproom_advanced {

    import com.cc.utils.SecNum;
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.chat.Chat;
    import com.monsters.effects.smoke.Smoke;
    import com.monsters.enums.EnumYardType;
    import com.monsters.mailbox.FriendPicker;
    import com.monsters.mailbox.MailBox;
    import com.monsters.mailbox.Thread;
    import com.monsters.maproom_manager.IMapRoom;
    import com.monsters.maproom_manager.IMapRoomCell;
    import com.monsters.maproom_manager.MapRoomManager;
    import com.monsters.ui.UI_BOTTOM;
    import flash.display.BitmapData;
    import flash.display.DisplayObjectContainer;
    import flash.display.Sprite;
    import flash.display.StageDisplayState;
    import flash.events.*;
    import flash.geom.Point;
    import flash.utils.Dictionary;
    import flash.utils.Timer;
    import flash.utils.setTimeout;
    import com.monsters.quests.IoQuests;

    public class MapRoom implements IMapRoom {

        internal static var _homePoint:Point;

        /** Inferno-only (Outposts list, Map): where the map opens next time, instead of home. Used once. */
        public static var ioFocus:Point = null;

        /** Inferno-only: a place to mark when the map opens (one opened from chat). Used once. */
        public static var ioMark:Point = null;

        /** Admin test mode: cells changed on the server (taken, made wild) are fetched again. */
        public static function ioClearCells():void {
            ClearCells();
        }

        private static var _zoneWidth:int = 10;

        private static var _zoneHeight:int = 10;

        internal static var _mapWidth:int = 100;

        internal static var _mapHeight:int = 100;

        internal static var _mc:MapRoomPopup;

        internal static var _bookmarks:Array = [];

        internal static var _currentPosition:Point;

        internal static var _open:Boolean;

        internal static var _monsterTransferInProgress:Boolean = false;

        internal static var _resourceTransferInProgress:Boolean = false;

        internal static var _homeCell:MapRoomCell;

        private static var _resourceTransfer:Object = {};

        internal static var _monsterTransfer:Object = {};

        internal static var _pendingTransferRequest:Boolean = false;

        private static var _bookmarkData:Object = {};

        private static var _saveErrors:int;

        private static var _zones:Object = {};

        private static var _bubbleSelectTarget:bubble_selecttarget;

        private static var _monsterSource:MapRoomCell;

        private static var _monsterSourceRef:MapRoomCell;

        private static var _monsterTargetRef:MapRoomCell;

        private static var _requestedZones:Array;

        private static var _showEnemyWait:Boolean = false;

        private static var _resourceCounter:int = 0;

        private static var _monstersTransferred:int = 0;

        private static var _allMonstersTransferred:Boolean = false;

        internal static var _flingerInRange:Boolean = false;

        private static var _worldID:int = 0;

        // Base ids are larger than an int holds; an int wrapped them to another base's id.
        internal static var _inviteBaseID:Number = 0;

        internal static var _inviteLocation:Point = new Point();

        internal static var _viewOnly:Boolean = false;

        private static var _bubbleAcceptInvite:bubble_acceptInvite;

        private static var _migrateThread:Thread = null;

        private static var _reposition:Boolean = false;

        private static var _popupRelocateMe:PopupRelocateMe;

        /** Inferno-only: whether accepting the open invite moves to another world (set by the server check). */
        internal static var _inviteCrossWorld:Boolean = true;

        private static var _empiredestroyed:Boolean = false;

        private static var _showAttackWait:Boolean = false;

        private static var _pendingMapCellDataRequests:Array = [];

        private static var _priorityMapCellsToRequest:Array = [];

        internal static var _smokeBMD:BitmapData;

        internal static var _smokeParticles:Array;

        internal static var _frame:int;

        public function MapRoom() {
            super();
        }

        public static function get homeCell():IMapRoomCell {
            return _homeCell;
        }

        public static function set migrateThread(param1:Thread):void {
            _migrateThread = param1;
        }

        public static function set inviteBaseID(param1:Number):void {
            _inviteBaseID = param1;
        }

        public static function set showAttackWait(param1:Boolean):void {
            _showAttackWait = param1;
        }

        public static function set showEnemyWait(param1:Boolean):void {
            _showEnemyWait = param1;
        }

        public static function set empireDestroyed(param1:Boolean):void {
            _empiredestroyed = param1;
        }

        public static function _Setup(param1:Point, param2:int = 0, param3:Number = 0, param4:Boolean = false, param5:Thread = null):void {
            _homePoint = param1;
            _worldID = param2;
            _inviteBaseID = param3;
            _viewOnly = param4;
            if (_viewOnly) {
                _inviteLocation = new Point(param1.x, param1.y);
                if (param5) {
                    _migrateThread = param5;
                }
            }
            else {
                _migrateThread = param5;
            }
            _bubbleSelectTarget = new bubble_selecttarget();
            _bubbleSelectTarget.tDesc.htmlText = "<b>" + KEYS.Get("bubble_selecttarget_desc") + "</b>";
            _bubbleSelectTarget.bCancel.SetupKey("btn_cancel");
            _bubbleSelectTarget.bCancel.addEventListener(MouseEvent.CLICK, TransferCancel);
            _bubbleSelectTarget.x = 270;
            _bubbleSelectTarget.y = 415;
            _saveErrors = 0;
            _showEnemyWait = false;
            _showAttackWait = false;
            _requestedZones = [];
            FriendPicker.ClearContacts();
        }

        internal static function HideFromViewOnly():void {
            if (_open && GLOBAL.mode != GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
                SOUNDS.Play("close");
                _worldID = 0;
                _inviteBaseID = 0;
                _viewOnly = false;
                GLOBAL._currentCell = null;
                _Setup(GLOBAL._mapHome);
                if (_mc.parent) {
                    _mc.parent.removeChild(_mc);
                }
                ClearCells();
                _mc.Cleanup();
                _mc = null;
            }
            _open = false;
        }

        internal static function ClearCells():void {
            _zones = {};
        }

        internal static function JumpTo(param1:Point):void {
            if (_mc.parent) {
                _mc.JumpTo(param1);
            }
        }

        public static function SetPendingInvitation():void {
            _mc._popupInfoMine.PendingInvite();
        }

        public static function PreAcceptInvitation(param1:DisplayObjectContainer):void {
            // Inferno-only invites are between alliance members, so being in an alliance is expected.
            if (ALLIANCES._myAlliance && !GLOBAL.INFERNO_ONLY) {
                GLOBAL.Message(KEYS.Get("msg_mustleavealliance"));
                return;
            }
            if (GLOBAL.INFERNO_ONLY) {
                ioCheckInvitation(param1);
                return;
            }
            openRelocateForInvite(param1);
        }

        private static function openRelocateForInvite(param1:DisplayObjectContainer):void {
            _popupRelocateMe = new PopupRelocateMe();
            _popupRelocateMe.Setup(null, "invite");
            if (param1) {
                GLOBAL.BlockerAdd(param1 as Sprite);
                param1.addChild(_popupRelocateMe);
            }
        }

        /**
         * Inferno-only: before the price popup, the server says whether the invite is still good and
         * whether accepting it moves the player to another world. Only then are their outposts given up,
         * so only then are they warned (and asked to confirm) first. Within one world they keep them.
         */
        private static function ioCheckInvitation(param1:DisplayObjectContainer):void {
            var container:DisplayObjectContainer = param1;
            if (!_migrateThread || _inviteBaseID == 0) {
                return;
            }
            new URLLoaderApi().load(GLOBAL._baseURL + "migratecheck", [["baseid", _inviteBaseID], ["threadid", _migrateThread.data.threadid]], function(serverData:Object):void {
                    var count:int = 0;
                    var warning:String = null;
                    if (!serverData || serverData.error != 0) {
                        GLOBAL.Message(serverData && serverData.error ? String(serverData.error) : "This invitation could not be checked. Please try again.");
                        return;
                    }
                    _inviteCrossWorld = int(serverData.crossWorld) == 1;
                    if (!_inviteCrossWorld) {
                        openRelocateForInvite(container);
                        return;
                    }
                    count = int(serverData.outposts);
                    warning = "<b>This outpost is in a different world.</b><br><br>Moving there means leaving your current world: " + (count > 0 ? "you will lose <b>all " + count + " of your outpost" + (count == 1 ? "" : "s") + "</b> and start the new world with just your main yard." : "you will start the new world with just your main yard.") + "<br><br>Do you still want to move?";
                    GLOBAL.Message(warning, "Move anyway", function():void {
                            openRelocateForInvite(container);
                        });
                }, function(e:Event):void {
                    GLOBAL.Message("This invitation could not be checked. Please try again.");
                });
        }

        /**
         * Pinch to zoom (IoPinchZoom): when the world map is open, zoom it one step. Returns false when the
         * map is not open, so the pinch goes to the yard instead.
         */
        public static function ioPinch(param1:Boolean, param2:Number = NaN, param3:Number = NaN):Boolean {
            if (!_open || !_mc) {
                return false;
            }
            _mc.ioPinchZoom(param1, param2, param3);
            return true;
        }

        internal static function AcceptInvitation(param1:Boolean = false):void {
            var handleAcceptSuccessful:Function;
            var handleAcceptError:Function;
            var url:String = null;
            var loadvars:Array = null;
            var SHINYCOST:SecNum = null;
            var RESOURCECOST:SecNum = null;
            var useShiny:Boolean = param1;
            if (ALLIANCES._myAlliance && !GLOBAL.INFERNO_ONLY) {
                GLOBAL.Message(KEYS.Get("msg_mustleavealliance"));
                return;
            }
            if (Boolean(_migrateThread) && _inviteBaseID != 0) {
                handleAcceptSuccessful = function(param1:Object):void {
                    PLEASEWAIT.Hide();
                    if (param1.error == 0) {
                        if (param1.cantMoveTill) {
                            if (_open) {
                                GLOBAL.Message(KEYS.Get("movebase_warning", {"v1": GLOBAL.ToTime(param1.cantMoveTill - param1.currenttime)}), KEYS.Get("btn_returnhome"), ReturnFromFailedInvite);
                            }
                            else {
                                GLOBAL.Message(KEYS.Get("movebase_warning", {"v1": GLOBAL.ToTime(param1.cantMoveTill - param1.currenttime)}));
                                GLOBAL.BlockerRemove();
                            }
                        }
                        else {
                            if (param1.coords && param1.coords.length == 2 && param1.coords[0] > -1 && param1.coords[1] > -1) {
                                GLOBAL._mapHome = new Point(param1.coords[0], param1.coords[1]);
                                _Setup(GLOBAL._mapHome);
                            }
                            // Inferno-only: bookmarks are places on this map; they only go when the move
                            // leaves it for another world (the server clears them then too: leaveWorld).
                            if (!GLOBAL.INFERNO_ONLY || _inviteCrossWorld) {
                                MapRoomManager.instance.BookmarksClear();
                            }
                            BASE._loadedFriendlyBaseID = 0;
                            GLOBAL._homeBaseID = 0;
                            GLOBAL._currentCell = null;
                            GLOBAL._mapOutpost = [];
                            if (_open) {
                                MapRoomManager.instance.Hide();
                            }
                            ClearCells();
                            _Setup(GLOBAL._mapHome);
                            _reposition = true;
                            GLOBAL._showMapWaiting = 1;
                        }
                    }
                    else {
                        GLOBAL.Message(param1.error);
                    }
                };
                handleAcceptError = function(param1:IOErrorEvent):void {
                    LOGGER.Log("err", "MapRoom.AcceptInvitation HTTP");
                };
                url = GLOBAL._baseURL + "migratetofriend";
                loadvars = [["baseid", _inviteBaseID], ["threadid", _migrateThread.data.threadid]];
                // The price the relocate popup shows (and the server charges).
                SHINYCOST = new SecNum(GLOBAL.ioPrice("move_main", 1200));
                // 30M of each resource on inferno-only servers (server: relocateInvites.ts INVITE_RESOURCE_COST).
                RESOURCECOST = new SecNum(GLOBAL.INFERNO_ONLY ? 30000000 : 10000000);
                if (_popupRelocateMe) {
                    _popupRelocateMe.Cleanup();
                    _popupRelocateMe.Hide();
                    _popupRelocateMe = null;
                }
                if (useShiny) {
                    if (GLOBAL._credits.Get() < SHINYCOST.Get()) {
                        POPUPS.DisplayGetShiny();
                        return;
                    }
                    if (!GLOBAL.ioConfirmShiny(SHINYCOST.Get(), "to move your main yard to this outpost", function():void {
                                AcceptInvitation(true);
                            })) {
                        return;
                    }
                    loadvars.push(["shiny", SHINYCOST.Get()]);
                }
                else {
                    if (GLOBAL._resources.r1.Get() < RESOURCECOST.Get() || GLOBAL._resources.r2.Get() < RESOURCECOST.Get() || GLOBAL._resources.r3.Get() < RESOURCECOST.Get() || GLOBAL._resources.r4.Get() < RESOURCECOST.Get()) {
                        GLOBAL.Message(KEYS.Get("map_rel_res"));
                        return;
                    }
                    loadvars.push(["resources", JSON.stringify({
                                        "r1": RESOURCECOST.Get(),
                                        "r2": RESOURCECOST.Get(),
                                        "r3": RESOURCECOST.Get(),
                                        "r4": RESOURCECOST.Get()
                                    })]);
                }
                PLEASEWAIT.Show(KEYS.Get("wait_movebase"));
                MailBox.Hide();
                if (_migrateThread.parent) {
                    if (_migrateThread.numChildren > 0) {
                        _migrateThread.removeChildAt(1);
                    }
                    _migrateThread.parent.removeChild(_migrateThread);
                }
                new URLLoaderApi().load(url, loadvars, handleAcceptSuccessful, handleAcceptError);
            }
        }

        internal static function ReturnFromFailedInvite():void {
            MapRoomManager.instance.Hide();
            BASE.Load();
        }

        public static function RejectInvitation(param1:MouseEvent = null):void {
            var handleRejectSuccessful:Function;
            var handleRejectError:Function;
            var url:String = null;
            var loadvars:Array = null;
            var e:MouseEvent = param1;
            if (Boolean(_migrateThread) && _inviteBaseID != 0) {
                handleRejectSuccessful = function(param1:Object):void {
                    PLEASEWAIT.Hide();
                    if (param1.error == 0) {
                        GLOBAL._currentCell = null;
                        if (_open) {
                            MapRoomManager.instance.Hide();
                            ClearCells();
                            _Setup(GLOBAL._mapHome);
                            BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                        }
                        else {
                            MAILBOX.Show();
                        }
                    }
                    else {
                        LOGGER.Log("err", "MapRoom.RejectInvitation", param1.error);
                    }
                };
                handleRejectError = function(param1:IOErrorEvent):void {
                    LOGGER.Log("err", "MapRoom.RejectInvitation HTTP");
                };
                PLEASEWAIT.Show(KEYS.Get("wait_rejecting"));
                url = GLOBAL._baseURL + "rejectmigratetofriend";
                loadvars = [["baseid", _inviteBaseID], ["threadid", _migrateThread.data.threadid]];
                if (_migrateThread.parent) {
                    if (_migrateThread.numChildren > 0) {
                        _migrateThread.removeChildAt(1);
                    }
                    _migrateThread.data.Changed();
                    _migrateThread.parent.removeChild(_migrateThread);
                    _migrateThread = null;
                    MAILBOX.Hide();
                }
                new URLLoaderApi().load(url, loadvars, handleRejectSuccessful, handleRejectError);
            }
        }

        internal static function BookmarkDataGet(param1:String):int {
            var _loc2_:int = 0;
            if (_bookmarkData[param1]) {
                _loc2_ = int(_bookmarkData[param1]);
            }
            return _loc2_;
        }

        internal static function BookmarkDataSet(param1:String, param2:int, param3:Boolean = true):void {
            var _loc4_:Boolean = false;
            if (!_bookmarkData) {
                _bookmarkData = {};
            }
            if (param2 == 0 && Boolean(_bookmarkData[param1])) {
                delete _bookmarkData[param1];
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
            else if (!_bookmarkData[param1]) {
                _bookmarkData[param1] = param2;
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
            else if (_bookmarkData[param1] != param2) {
                _bookmarkData[param1] = param2;
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
        }

        internal static function BookmarkDataGetStr(param1:String):String {
            var _loc2_:String = "";
            if (_bookmarkData[param1]) {
                _loc2_ = String(_bookmarkData[param1]);
            }
            return _loc2_;
        }

        internal static function BookmarkDataSetStr(param1:String, param2:String, param3:Boolean = true):void {
            var _loc4_:Boolean = false;
            if (!_bookmarkData) {
                _bookmarkData = {};
            }
            if (param2.length == 0 && Boolean(_bookmarkData[param1])) {
                delete _bookmarkData[param1];
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
            else if (!_bookmarkData[param1]) {
                _bookmarkData[param1] = param2;
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
            else if (_bookmarkData[param1] != param2) {
                _bookmarkData[param1] = param2;
                if (param3) {
                    BookmarksSave();
                }
                _loc4_ = true;
            }
        }

        /** A bookmarks save is on its way; another change waits for it (saves arriving out of order lost changes). */
        private static var _ioBookmarkSaving:Boolean = false;

        private static var _ioBookmarkDirty:Boolean = false;

        internal static function BookmarksSave():void {
            var handleBMSaveSuccessful:Function = null;
            var handleBMSaveError:Function = null;
            var done:Function = null;
            if (GLOBAL.INFERNO_ONLY) {
                if (_ioBookmarkSaving) {
                    _ioBookmarkDirty = true; // sent (as it is then) when this one is answered
                    return;
                }
                _ioBookmarkSaving = true;
            }
            done = function():void {
                _ioBookmarkSaving = false;
                if (_ioBookmarkDirty) {
                    _ioBookmarkDirty = false;
                    BookmarksSave();
                }
            };
            handleBMSaveSuccessful = function(param1:Object):void {
                if (param1.error != 0) {
                    LOGGER.Log("err", "MapRoom.BookmarksSave", param1.error);
                }
                done();
            };
            handleBMSaveError = function(param1:IOErrorEvent):void {
                LOGGER.Log("err", "MapRoom.BookmarksSave HTTP");
                done();
            };
            var url:String = GLOBAL._apiURL + "player/savebookmarks";
            var loadvars:Array = [["bookmarks", JSON.stringify(_bookmarkData)]];
            new URLLoaderApi().load(url, loadvars, handleBMSaveSuccessful, handleBMSaveError);
        }

        /**
         * Inferno-only: the bookmarks have no limit, and can be renamed and removed from the sidebar. The
         * stored form is the stock one (mbms: how many; mbm0, mbm1...: x * 10000 + y; mbmn0...: names), all
         * of it written again after a change.
         */
        internal static function ioBookmarksWrite():void {
            var i:int = 0;
            _bookmarkData = {};
            while (i < _bookmarks.length) {
                _bookmarkData["mbm" + i] = int(_bookmarks[i].location.x) * 10000 + int(_bookmarks[i].location.y);
                _bookmarkData["mbmn" + i] = String(_bookmarks[i].name);
                i++;
            }
            if (_bookmarks.length > 0) {
                _bookmarkData["mbms"] = _bookmarks.length;
            }
            BookmarksSave();
        }

        /** Renames a bookmark. Returns "" when done, or why not. */
        internal static function ioRenameBookmark(index:int, name:String):String {
            name = String(name || "").replace(/^\s+|\s+$/g, "");
            if (index < 0 || index >= _bookmarks.length) {
                return "That bookmark is gone.";
            }
            if (name.length == 0) {
                return KEYS.Get("newmap_bm_name");
            }
            if (name.length > 20) {
                return KEYS.Get("newmap_bm_long");
            }
            if (_bookmarks[index].name != name) {
                _bookmarks[index].name = name;
                ioBookmarksWrite();
            }
            return "";
        }

        internal static function ioRemoveBookmark(index:int):void {
            if (index >= 0 && index < _bookmarks.length) {
                _bookmarks.splice(index, 1);
                ioBookmarksWrite();
            }
        }

        /** Adds a bookmark at a place. Returns { hide, message } as AddBookmark does ("SUCCESS" when added). */
        internal static function ioAddBookmarkAt(cellX:int, cellY:int, name:String):Object {
            _currentPosition = new Point(cellX, cellY);
            return AddBookmark(name);
        }

        /** The bookmark at a place, or -1. */
        internal static function ioBookmarkIndex(cellX:int, cellY:int):int {
            var i:int = 0;
            while (i < _bookmarks.length) {
                if (_bookmarks[i].location.x == cellX && _bookmarks[i].location.y == cellY) {
                    return i;
                }
                i++;
            }
            return -1;
        }

        internal static function AddBookmark(param1:String, param2:Boolean = true):Object {
            var _loc3_:Object = null;
            param1 = param1.replace(/^\s+|\s+$/g, "");

            if (param1.length == 0) {
                return {
                        "hide": false,
                        "message": KEYS.Get("newmap_bm_name")
                    };
            }
            if (param1.length > 20) {
                return {
                        "hide": false,
                        "message": KEYS.Get("newmap_bm_long")
                    };
            }
            if (_currentPosition.x < 0 || _currentPosition.x >= _mapWidth || _currentPosition.y < 0 || _currentPosition.y >= _mapHeight) {
                return {
                        "hide": true,
                        "message": "ERROR: Bookmark point is not on the map."
                    };
            }
            if (_bookmarks.length >= 8 && !GLOBAL.INFERNO_ONLY) {
                return {
                        "hide": true,
                        "message": KEYS.Get("newmap_bm_full")
                    };
            }
            var _loc5_:int = int(_bookmarks.length);
            var _loc6_:int = 0;
            while (_loc6_ < _loc5_) {
                if (_bookmarks[_loc6_].location.x == _currentPosition.x && _bookmarks[_loc6_].location.y == _currentPosition.y) {
                    return {
                            "hide": true,
                            "message": KEYS.Get("newmap_bm_done")
                        };
                }
                _loc6_++;
            }
            if (param2) {
                BookmarkDataSet("mbm" + _loc5_, _currentPosition.x * 10000 + _currentPosition.y, false);
                BookmarkDataSetStr("mbmn" + _loc5_, param1, false);
                BookmarkDataSet("mbms", _loc5_ + 1);
            }
            _bookmarks.push({
                        "name": param1,
                        "location": _currentPosition
                    });
            return {
                    "hide": true,
                    "message": "SUCCESS"
                };
        }

        private static function RequestData(point:Point, hasForce:Boolean = false):void {
            var z:objZone = null;
            var loadvars:Array = null;
            var dataRequest:Object = null;
            var handleLoadSuccessful:Function = null;
            var handleLoadError:Function = null;
            var addRequestToQueue:Function = null;
            var trySendRequest:Function = null;
            var addRequest:Function = null;
            var zonePoint:Point = point;
            var force:Boolean = hasForce;
            // Inferno-only: a zone outside the world (a cell asked for past its edge) is never asked for: the server
            // refused it (bug report #49, getarea x=-320 y=-90)
            // (and the underworld's zone always: an outpost there is loaded from it with the map closed, IoUnderworld)
            if (GLOBAL.INFERNO_ONLY && (!zonePoint || zonePoint.x < 0 || zonePoint.y < 0 || zonePoint.x >= _mapWidth || zonePoint.y >= _mapHeight) && !IoUnderworld.isUnderZone(zonePoint)) {
                return;
            }
            // Inferno-only: while the map shows the underworld, only its one zone is asked for (IoUnderworld)
            if (GLOBAL.INFERNO_ONLY && IoUnderworld.under && !IoUnderworld.isUnderZone(zonePoint)) {
                return;
            }
            var zoneID:int = zonePoint.x * 10000 + zonePoint.y;
            var getAreaURL:String = GLOBAL._mapURL + "getarea";
            var getResources:int = 0;
            var requestRetryTimer:Timer = null;
            if (force || GLOBAL.Timestamp() > _resourceCounter + 20) {
                getResources = 1;
                _resourceCounter = GLOBAL.Timestamp();
                force = true;
            }
            if (_zones[zoneID]) {
                z = _zones[zoneID];
            }
            else {
                z = new objZone();
                _zones[zoneID] = z;
            }
            // Inferno-only: the world snapshot (IoMapSnapshot) is at most a minute old, so a zone on screen is
            // asked for again after a minute (it was every 30 seconds).
            if (force || GLOBAL.Timestamp() - z.updated > (GLOBAL.INFERNO_ONLY ? 60 : 30)) {
                handleLoadSuccessful = function(serverData:Object):void {
                    var zoneId:int = 0;
                    var resourceIndex:int = 0;
                    var allianceData:Array = null;
                    var cell:Object = null;
                    var area:Object = null;
                    // (Inferno-only: a request can be for several zones, the front of the queue)
                    _pendingMapCellDataRequests.splice(0, Math.max(1, _ioInFlight));
                    _ioInFlight = 0;
                    if (_pendingMapCellDataRequests.length > 0) {
                        trySendRequest();
                    }
                    if (!_open && !BASE._needCurrentCell) {
                        return;
                    }
                    if (serverData && serverData.io_under) {
                        IoUnderworld.setInfo(serverData.io_under); // (Inferno-only: where the underworld and its portals are)
                    }
                    if (serverData && !serverData.error && serverData.areas is Array) {
                        // Several zones: each as if it had come on its own, the map drawn again once.
                        for each (area in serverData.areas) {
                            zoneId = area.x * 10000 + area.y;
                            if (!_zones[zoneId]) {
                                _zones[zoneId] = new objZone();
                            }
                            _zones[zoneId].data = area.data;
                        }
                        serverData.data = serverData.areas.length > 0 ? serverData.areas[0].data : {};
                        serverData.x = serverData.areas.length > 0 ? serverData.areas[0].x : 0;
                        serverData.y = serverData.areas.length > 0 ? serverData.areas[0].y : 0;
                        if (BASE._needCurrentCell && !_open) {
                            // the yard's own cell: in whichever zone it is
                            for each (area in serverData.areas) {
                                if (area.data && area.data[BASE._currentCellLoc.x] && area.data[BASE._currentCellLoc.x][BASE._currentCellLoc.y]) {
                                    serverData.data = area.data;
                                    serverData.x = area.x;
                                    serverData.y = area.y;
                                }
                            }
                        }
                    }
                    if (serverData && !serverData.error && Boolean(serverData.data)) {
                        zoneId = serverData.x * 10000 + serverData.y;
                        if (!_zones[zoneId]) {
                            _zones[zoneId] = new objZone();
                        }
                        _zones[zoneId].data = serverData.data;
                        if (serverData.resources) {
                            resourceIndex = 1;
                            while (resourceIndex < 5) {
                                GLOBAL._resources["r" + resourceIndex].Set(serverData.resources["r" + resourceIndex]);
                                GLOBAL._hpResources["r" + resourceIndex] = GLOBAL._resources["r" + resourceIndex].Get();
                                GLOBAL._resources["r" + resourceIndex + "max"] = serverData.resources["r" + resourceIndex + "max"];
                                GLOBAL._hpResources["r" + resourceIndex + "max"] = serverData.resources["r" + resourceIndex + "max"];
                                resourceIndex++;
                            }
                        }
                        if (serverData.alliancedata) {
                            allianceData = serverData.alliancedata;
                            ALLIANCES.ProcessAlliances(allianceData);
                        }
                        if (MapRoom._open) {
                            MapRoom._mc.Update(true);
                            ioPendingClickCheck();
                        }
                        else if (BASE._needCurrentCell) {
                            if (_zones && _zones[zoneId] && Boolean(_zones[zoneId].data) && Boolean(_zones[zoneId].data[BASE._currentCellLoc.x])) {
                                cell = _zones[zoneId].data[BASE._currentCellLoc.x][BASE._currentCellLoc.y];
                                GLOBAL._currentCell = new MapRoomCell();
                                (GLOBAL._currentCell as MapRoomCell).Setup(cell);
                                (GLOBAL._currentCell as MapRoomCell).cellX = BASE._currentCellLoc.x;
                                (GLOBAL._currentCell as MapRoomCell).cellY = BASE._currentCellLoc.y;
                                _zones = {};
                            }
                        }
                    }
                    else if (Boolean(serverData) && !serverData.data) {
                        LOGGER.Log("err", "MapRoom.Data NO DATA");
                    }
                    else {
                        LOGGER.Log("err", "MapRoom.Data", serverData.error);
                    }
                };
                handleLoadError = function(param1:IOErrorEvent):void {
                    var failed:Array = null;
                    var request:Object = null;
                    var failedZone:int = 0;
                    ++_saveErrors;
                    if (_saveErrors >= 3) {
                        LOGGER.Log("err", "MapRoom.RequestData HTTP");
                        GLOBAL.ErrorMessage("WorldMapRoom.RequestData HTTP");
                    }
                    if (GLOBAL.INFERNO_ONLY) {
                        // The failed request left the queue stuck at its front: nothing was asked for again
                        // until the map was closed. Its zones are asked for again on the map's next pass.
                        failed = _pendingMapCellDataRequests.splice(0, Math.max(1, _ioInFlight));
                        _ioInFlight = 0;
                        for each (request in failed) {
                            failedZone = int(request.loadvars[0][1]) * 10000 + int(request.loadvars[1][1]);
                            if (_zones[failedZone]) {
                                objZone(_zones[failedZone]).updated = 0;
                            }
                        }
                        if (_pendingMapCellDataRequests.length > 0) {
                            if (!requestRetryTimer) {
                                requestRetryTimer = new Timer(1000, 1);
                                requestRetryTimer.addEventListener(TimerEvent.TIMER, trySendRequest);
                            }
                            requestRetryTimer.reset();
                            requestRetryTimer.start();
                        }
                    }
                };
                trySendRequest = function(... rest):void {
                    if (_ioInFlight > 0) {
                        return; // a request is on its way: its answer sends the next one
                    }
                    // add any priority zones to the front of the request queue, so they can be loaded first.
                    while (_priorityMapCellsToRequest.length > 0) {
                        var point:Point = _priorityMapCellsToRequest[0];
                        var pendingIndex:int = GetPendingZoneRequestIndex(point.x, point.y);
                        var pendingRequest:Object = null;
                        if (pendingIndex == -1) {
                            addRequestToQueue(point, 0, true);
                        }
                        else if (pendingIndex > 0) {
                            // moving existing request
                            pendingRequest = _pendingMapCellDataRequests[pendingIndex].loadvars;
                            _pendingMapCellDataRequests.splice(pendingIndex, 1);
                            addRequestToQueue(point, pendingRequest[4][1], true);
                        }
                        _priorityMapCellsToRequest.shift();
                    }
                    // sending getarea request to server. if the zone has a cell undergoing a monster transfer, wait until it is finished first.
                    var getCellData:Object = _pendingMapCellDataRequests[0];
                    var sendVars:Array = null;
                    if (!getCellData) {
                        return;
                    }
                    if (!ZoneHasPendingTransferRequest(getCellData.loadvars[0][1] * 10000 + getCellData.loadvars[1][1])) {
                        if (requestRetryTimer) {
                            requestRetryTimer.stop();
                            requestRetryTimer.removeEventListener(TimerEvent.TIMER, trySendRequest);
                            requestRetryTimer = null;
                        }
                        sendVars = GLOBAL.INFERNO_ONLY ? ioBatch() : getCellData.loadvars;
                        if (!GLOBAL.INFERNO_ONLY) {
                            _ioInFlight = 1;
                        }
                        new URLLoaderApi().load(getCellData.url, sendVars, handleLoadSuccessful, handleLoadError);
                    }
                    else {
                        if (!requestRetryTimer) {
                            requestRetryTimer = new Timer(200, 1);
                            requestRetryTimer.addEventListener(TimerEvent.TIMER, trySendRequest);
                        }
                        requestRetryTimer.reset();
                        requestRetryTimer.start();
                    }
                };
                addRequestToQueue = function(point:Point, resources:int, addToFront:Boolean = false):void {
                    loadvars = [["x", int(point.x)], ["y", int(point.y)], ["width", _zoneWidth], ["height", _zoneHeight], ["sendresources", resources]];
                    if (_viewOnly) {
                        loadvars.push(["worldid", _worldID]);
                    }
                    dataRequest = {
                            "url": getAreaURL,
                            "loadvars": loadvars
                        };
                    if (addToFront) {
                        _pendingMapCellDataRequests.unshift(dataRequest);
                    }
                    else {
                        _pendingMapCellDataRequests.push(dataRequest);
                    }
                };
                z.updated = GLOBAL.Timestamp() + int(Math.random() * 10);
                _saveErrors = 0;
                addRequestToQueue(zonePoint, getResources);
                if (_pendingMapCellDataRequests.length == 1) {
                    if (GLOBAL.INFERNO_ONLY) {
                        // At the end of this frame: the zones the map asks for in the same pass go together.
                        setTimeout(trySendRequest, 0);
                    }
                    else {
                        trySendRequest();
                    }
                }
            }
        }

        /** How many zones at the front of the queue the request on its way is for (0: none on its way). */
        private static var _ioInFlight:int = 0;

        /** The most zones asked for in one getarea request (the server takes up to 16). */
        private static const IO_BATCH_ZONES:int = 12;

        /**
         * Inferno-only: the zones waiting at the front of the queue, up to IO_BATCH_ZONES, in one getarea
         * request (`zones=x,y;x,y;...`; the server answers `areas`). The game asked for one zone at a time and
         * waited for each answer, so the map filled in one round trip per zone. A zone with a monster transfer
         * on its way ends the run (it waits, as before). Returns the request's variables; _ioInFlight says how
         * many queue entries it covers.
         */
        private static function ioBatch():Array {
            var first:Object = _pendingMapCellDataRequests[0];
            var vars:Array = (first.loadvars as Array).concat();
            var zones:Array = [];
            var resources:int = 0;
            var i:int = 0;
            var request:Object = null;
            while (i < _pendingMapCellDataRequests.length && zones.length < IO_BATCH_ZONES) {
                request = _pendingMapCellDataRequests[i];
                if (i > 0 && ZoneHasPendingTransferRequest(int(request.loadvars[0][1]) * 10000 + int(request.loadvars[1][1]))) {
                    break;
                }
                zones.push(int(request.loadvars[0][1]) + "," + int(request.loadvars[1][1]));
                resources = Math.max(resources, int(request.loadvars[4][1]));
                i++;
            }
            _ioInFlight = zones.length;
            vars[4] = ["sendresources", resources];
            if (zones.length > 1) {
                vars.push(["zones", zones.join(";")]);
            }
            return vars;
        }

        internal static function GetCell(cellX:int, cellY:int, param3:Boolean = false):Object {
            if (GLOBAL.INFERNO_ONLY && IoUnderworld.isVoid(cellX, cellY)) {
                return IoUnderworld.voidCell; // around the underworld's island: lava
            }
            var zone:Object = GetCellZone(cellX, cellY);
            RequestData(zone.point, param3);
            if (_zones && _zones[zone.id] && Boolean(_zones[zone.id].data) && Boolean(_zones[zone.id].data[cellX])) {
                return _zones[zone.id].data[cellX][cellY];
            }
            // Inferno-only: until getarea answers for the zone, the world snapshot's cell (io_snap: 1).
            return IoMapSnapshot.CellAt(cellX, cellY);
        }

        /** The cell as getarea sent it, or null: never the snapshot's (for what needs monsters or resources). */
        internal static function GetZoneCell(cellX:int, cellY:int):Object {
            var zone:Object = GetCellZone(cellX, cellY);
            RequestData(zone.point);
            if (_zones && _zones[zone.id] && Boolean(_zones[zone.id].data) && Boolean(_zones[zone.id].data[cellX])) {
                return _zones[zone.id].data[cellX][cellY];
            }
            return null;
        }

        /**
         * Inferno-only: a cell's zone data, asked for when missing: {loaded: its zone has arrived, data: the cell
         * as getarea sent it, or null}. (A cell outside the world counts as loaded, with no data.)
         */
        internal static function ioZoneCell(cellX:int, cellY:int):Object {
            var zone:Object = GetCellZone(cellX, cellY);
            if (zone.point.x < 0 || zone.point.y < 0 || zone.point.x >= _mapWidth || zone.point.y >= _mapHeight || IoUnderworld.isVoid(cellX, cellY)) {
                return {"loaded": true, "data": null};
            }
            RequestData(zone.point);
            var z:Object = _zones ? _zones[zone.id] : null;
            if (!z || !z.data) {
                return {"loaded": false, "data": null};
            }
            return {"loaded": true, "data": z.data[cellX] ? z.data[cellX][cellY] : null};
        }

        /** A cell clicked while it only had the snapshot's data: clicked again once its zone has arrived. */
        private static var _ioPendingClick:Point = null;

        private static var _ioPendingClickAt:int = 0;

        internal static function ioClickWhenLoaded(cell:MapRoomCell):void {
            var zone:Object = GetCellZone(cell.X, cell.Y);
            _ioPendingClick = new Point(cell.X, cell.Y);
            _ioPendingClickAt = GLOBAL.Timestamp();
            if (GetPendingZoneRequestIndex(cell.X, cell.Y) > 0) {
                _priorityMapCellsToRequest.push(zone.point); // already asked for: to the front of the queue
            }
            else if (GetPendingZoneRequestIndex(cell.X, cell.Y) == -1) {
                RequestData(zone.point, true);
            }
        }

        private static function ioPendingClickCheck():void {
            var at:Point = _ioPendingClick;
            var cell:MapRoomCell = null;
            if (!at || !_mc) {
                return;
            }
            if (GLOBAL.Timestamp() - _ioPendingClickAt > 15) {
                _ioPendingClick = null; // too long ago: the player has moved on
                return;
            }
            cell = _mc.ioCellAt(at.x, at.y);
            if (!cell) {
                _ioPendingClick = null;
                return;
            }
            if (cell._ioSnap) {
                return; // another zone arrived; still waiting for this one
            }
            _ioPendingClick = null;
            cell.ioClick();
        }

        /** A new world snapshot (IoMapSnapshot): cells without getarea data yet and the world map redraw. */
        internal static function ioSnapshotArrived():void {
            IoMapShare.CheckPendingWorld();
            if (_open && _mc && _mc.parent) {
                _mc.Update(true);
                _mc.ioSnapshotChanged();
            }
        }

        internal static function Update():void {
            if (_open && _mc && Boolean(_mc.parent)) {
                _mc.Update(true);
            }
        }

        internal static function Cleanup():void {
        }

        internal static function TransferMonstersA(cell:MapRoomCell, monsters:Object):void {
            var monsterId:String = null;
            _monsterTransfer = {};
            var hasMonsters:Boolean = false;
            for (monsterId in monsters) {
                _monsterTransfer[monsterId] = new SecNum(monsters[monsterId].Get());
                if (monsters[monsterId].Get() > 0) {
                    hasMonsters = true;
                }
            }
            if (hasMonsters) {
                // Preserve map room cell
                // The zone's own data (with the monsters), never the world snapshot's.
                var foundCell:Object = GetZoneCell(cell.X, cell.Y);
                if (foundCell) {
                    _monsterSource = new MapRoomCell();
                    _monsterSource.Setup(foundCell);
                    _monsterSource.Cleanup(); // remove event listeners
                    _monsterSource.cellX = cell.X;
                    _monsterSource.cellY = cell.Y;
                    _monsterSourceRef = cell;
                }
                if (_bubbleSelectTarget.parent) {
                    _bubbleSelectTarget.parent.removeChild(_bubbleSelectTarget);
                }
                _mc.addChild(_bubbleSelectTarget);
                _monsterTransferInProgress = true;
            }
            else {
                _monsterTransfer = {};
                _monsterTransferInProgress = false;
            }
        }

        internal static function TransferMonstersB(cell:MapRoomCell):void {
            if (_monsterTransferInProgress) {
                if (cell._mine) {
                    if (cell._baseID == _monsterSource._baseID) {
                        if (_bubbleSelectTarget.parent) {
                            _bubbleSelectTarget.parent.removeChild(_bubbleSelectTarget);
                        }
                        _mc.ShowMonstersA(_monsterSource, true);
                        return;
                    }
                    _mc.ShowMonstersB(_monsterTransfer, cell);
                }
            }
        }

        internal static function TransferMonstersC(targetCell:MapRoomCell):String {
            var transferSuccessful:Function;
            var transferError:Function;
            var trySendTransfer:Function = null;
            var actualTransfer:Object = null;
            var finalMonsters:Object = null;
            var finalSrcMonsters:Object = null;
            var dst:String = null;
            var src:String = null;
            var spaceRemaining:int = 0;
            var baseUpdateFrom:Array = null;
            var baseUpdateTo:Array = null;
            var srcMonsterData:Object = null;
            var targetMonsterData:Object = null;
            var transferVars:Array = null;
            var cost:int = 0;
            var transferRetryTimer:Timer = null;
            var zoneSource:Object = GetCellZone(_monsterSource.cellX, _monsterSource.cellY);
            _monsterTargetRef = targetCell;
            var zoneTarget:Object = GetCellZone(_monsterTargetRef.cellX, _monsterTargetRef.cellY);
            var addedToPriority:Boolean = false;
            if (_monsterTransferInProgress) {
                if (_monsterTargetRef._mine && _monsterSource._mine) {
                    PLEASEWAIT.Show(KEYS.Get("wait_processing"));
                    _mc.HideMonstersB();
                    if (_monsterTargetRef._monsters && _monsterSource && _monsterTargetRef._monsterData.space.Get() > 0) {
                        transferSuccessful = function(param1:Object):void {
                            PLEASEWAIT.Hide();
                            if (param1.error == 0) {
                                if (_allMonstersTransferred) {
                                    GLOBAL.Message(KEYS.Get("newmap_tr_done"));
                                }
                                else {
                                    GLOBAL.Message(KEYS.Get("newmap_tr_space", {"v1": _monstersTransferred}));
                                    if (_monstersTransferred == 0) {
                                        _monsterTransfer = {};
                                        _pendingTransferRequest = false;
                                        return;
                                    }
                                }
                                // update target cell monsters
                                for (dst in finalMonsters) {
                                    if (_monsterTargetRef._monsters[dst]) {
                                        _monsterTargetRef._monsters[dst].Set(finalMonsters[dst]);
                                        _monsterTargetRef._hpMonsters[dst] = finalMonsters[dst];
                                    }
                                    else {
                                        _monsterTargetRef._monsters[dst] = new SecNum(finalMonsters[dst]);
                                        _monsterTargetRef._hpMonsters[dst] = finalMonsters[dst];
                                    }
                                }
                                // update source cell monsters
                                if (_monsterSourceRef.cellX == _monsterSource.cellX && _monsterSourceRef.cellY == _monsterSource.cellY) {
                                    // source cell is rendered on map
                                    for (src in finalSrcMonsters) {
                                        if (finalSrcMonsters[src] > 0) {
                                            _monsterSourceRef._monsters[src].Set(finalSrcMonsters[src]);
                                            _monsterSourceRef._hpMonsters[src] = finalSrcMonsters[src];
                                        }
                                        else {
                                            delete _monsterSourceRef._monsters[src];
                                            delete _monsterSourceRef._hpMonsters[src];
                                        }
                                    }
                                }
                                // update the cells within their zone data
                                if (_zones) {
                                    if (_zones[zoneSource.id] && _zones[zoneSource.id].data) {
                                        _zones[zoneSource.id].data[_monsterSource.cellX][_monsterSource.cellY].m.housed = finalSrcMonsters;
                                    }
                                    else {
                                        _zones[zoneSource.id] = new objZone();
                                    }
                                    if (_zones[zoneTarget.id] && _zones[zoneTarget.id].data) {
                                        _zones[zoneTarget.id].data[_monsterTargetRef.cellX][_monsterTargetRef.cellY].m.housed = finalMonsters;
                                    }
                                    else {
                                        _zones[zoneTarget.id] = new objZone();
                                    }
                                }
                            }
                            else {
                                GLOBAL.Message(KEYS.Get("msg_err_transfer") + param1.error);
                            }
                            _monsterTransfer = {};
                            _pendingTransferRequest = false;
                        };
                        transferError = function(param1:IOErrorEvent):void {
                            PLEASEWAIT.Hide();
                            GLOBAL.Message(KEYS.Get("msg_err_transfer") + param1.text);
                            _monsterTransfer = {};
                            _pendingTransferRequest = false;
                        };
                        actualTransfer = {};
                        finalMonsters = {};
                        finalSrcMonsters = {};
                        spaceRemaining = int(_monsterTargetRef._monsterData.space.Get());
                        baseUpdateFrom = ["BMU"];
                        baseUpdateTo = ["BMU"];
                        if (_bubbleSelectTarget.parent) {
                            _bubbleSelectTarget.parent.removeChild(_bubbleSelectTarget);
                        }
                        _monsterTransferInProgress = false;
                        for (dst in _monsterTargetRef._monsters) {
                            finalMonsters[dst] = _monsterTargetRef._monsters[dst].Get();
                            spaceRemaining -= _monsterTargetRef._monsters[dst].Get() * CREATURES.GetProperty(dst, "cStorage");
                        }
                        for (src in _monsterSource._monsters) {
                            finalSrcMonsters[src] = _monsterSource._monsters[src].Get();
                        }
                        _monstersTransferred = 0;
                        _allMonstersTransferred = true;
                        for (src in _monsterTransfer) {
                            if (_monsterTransfer[src].Get() > 0) {
                                cost = CREATURES.GetProperty(src, "cStorage");
                                if (spaceRemaining >= _monsterTransfer[src].Get() * cost) {
                                    actualTransfer[src] = _monsterTransfer[src].Get();
                                    _monstersTransferred += _monsterTransfer[src].Get();
                                }
                                else {
                                    _allMonstersTransferred = false;
                                    actualTransfer[src] = int(spaceRemaining / cost);
                                    _monstersTransferred += int(spaceRemaining / cost);
                                }
                                if (_monsterTargetRef._monsters[src]) {
                                    finalMonsters[src] = _monsterTargetRef._monsters[src].Get() + actualTransfer[src];
                                }
                                else {
                                    finalMonsters[src] = actualTransfer[src];
                                }
                                if (_monsterSource._monsters[src]) {
                                    finalSrcMonsters[src] = _monsterSource._monsters[src].Get() - actualTransfer[src];
                                }
                                spaceRemaining -= actualTransfer[src] * cost;
                                baseUpdateFrom.push({
                                            "creatureID": src,
                                            "count": actualTransfer[src]
                                        });
                                baseUpdateTo.push({
                                            "creatureID": src,
                                            "count": -actualTransfer[src]
                                        });
                                if (spaceRemaining <= 0) {
                                    break;
                                }
                            }
                        }
                        if (!_monsterTargetRef.Check()) {
                            LOGGER.Log("err", "BASE.Save:  transfer target Cell " + _monsterTargetRef.X + "," + _monsterTargetRef.Y + "does not check out before doing monster transfer!  " + JSON.stringify(_monsterTargetRef._hpMonsterData));
                        }
                        if (!_monsterSource.Check()) {
                            LOGGER.Log("err", "BASE.Save:  transfer source Cell " + _monsterSource.X + "," + _monsterSource.Y + "does not check out before doing monster transfer!  " + JSON.stringify(_monsterSource._hpMonsterData));
                        }
                        srcMonsterData = {
                                "hcount": _monsterSource._hpMonsterData.hcount,
                                "overdrivepower": _monsterSource._monsterData.overdrivepower.Get(),
                                "hcc": _monsterSource._hpMonsterData.hcc,
                                "space": _monsterSource._monsterData.space.Get(),
                                "h": _monsterSource._hpMonsterData.h,
                                "finishtime": _monsterSource._hpMonsterData.finishtime,
                                "overdrivetime": _monsterSource._monsterData.overdrivetime.Get(),
                                "housed": finalSrcMonsters,
                                "hid": _monsterSource._hpMonsterData.hid,
                                "hstage": _monsterSource._hpMonsterData.hstage,
                                "saved": GLOBAL.Timestamp()
                            };
                        targetMonsterData = {
                                "hcount": _monsterTargetRef._hpMonsterData.hcount,
                                "overdrivepower": _monsterTargetRef._monsterData.overdrivepower.Get(),
                                "hcc": _monsterTargetRef._hpMonsterData.hcc,
                                "space": _monsterTargetRef._monsterData.space.Get(),
                                "h": _monsterTargetRef._hpMonsterData.h,
                                "finishtime": _monsterTargetRef._hpMonsterData.finishtime,
                                "overdrivetime": _monsterTargetRef._monsterData.overdrivetime.Get(),
                                "housed": finalMonsters,
                                "hid": _monsterTargetRef._hpMonsterData.hid,
                                "hstage": _monsterTargetRef._hpMonsterData.hstage,
                                "saved": GLOBAL.Timestamp()
                            };
                        transferVars = [["frombaseid", _monsterSource._baseID], ["tobaseid", _monsterTargetRef._baseID], ["monsters", JSON.stringify([srcMonsterData, targetMonsterData])]];
                        trySendTransfer = function():void {
                            // send transfer request after any getarea requests containing the source/target cells finish, to ensure the cells are up-to-date.
                            var sourcePendingZoneIdx:int = GetPendingZoneRequestIndex(_monsterSource.cellX, _monsterSource.cellY);
                            var targetPendingZoneIdx:int = zoneSource.id == zoneTarget.id ? sourcePendingZoneIdx : GetPendingZoneRequestIndex(_monsterTargetRef.cellX, _monsterTargetRef.cellY);
                            if (sourcePendingZoneIdx == -1 && targetPendingZoneIdx == -1) {
                                if (transferRetryTimer) {
                                    transferRetryTimer.stop();
                                    transferRetryTimer.removeEventListener(TimerEvent.TIMER, trySendTransfer);
                                    transferRetryTimer = null;
                                }
                                _pendingTransferRequest = true;
                                new URLLoaderApi().load(GLOBAL._mapURL + "transferassets", transferVars, transferSuccessful, transferError);
                            }
                            else {
                                if (!transferRetryTimer) {
                                    transferRetryTimer = new Timer(200, 1);
                                    transferRetryTimer.addEventListener(TimerEvent.TIMER, trySendTransfer);
                                }
                                transferRetryTimer.reset();
                                transferRetryTimer.start();
                                if (!addedToPriority) {
                                    // mark zones containing the source/target cell to be moved to the front of the _pendingMapCellDataRequests queue
                                    if (sourcePendingZoneIdx > 0) {
                                        _priorityMapCellsToRequest.push(zoneSource.point);
                                    }
                                    if (targetPendingZoneIdx > 0 && zoneSource.id != zoneTarget.id) {
                                        _priorityMapCellsToRequest.push(zoneTarget.point);
                                    }
                                    addedToPriority = true;
                                }
                            }
                        };
                        trySendTransfer();
                        return "";
                    }
                    if (_monsterTargetRef._monsterData.space.Get() == 0) {
                        GLOBAL.Message(KEYS.Get("newmap_tr_err1"));
                    }
                    PLEASEWAIT.Hide();
                    return KEYS.Get("newmap_tr_err1");
                }
                GLOBAL.Message(KEYS.Get("newmap_tr_err2"));
                PLEASEWAIT.Hide();
                return KEYS.Get("newmap_tr_err2");
            }
            PLEASEWAIT.Hide();
            return KEYS.Get("newmap_tr_err3");
        }

        internal static function TransferCancel(param1:MouseEvent = null):void {
            if (_bubbleSelectTarget.parent) {
                _bubbleSelectTarget.parent.removeChild(_bubbleSelectTarget);
            }
            _resourceTransfer = {};
            _monsterTransfer = {};
            _resourceTransferInProgress = false;
            _monsterTransferInProgress = false;
            _pendingTransferRequest = false;
        }

        internal static function Resize():void {
            _mc.x = 0;
            _mc.y = 0;
            MapRoomManager.instance.ResizeHandler();
        }

        internal static function SmokeAdd():void {
            if (_smokeBMD) {
                return;
            }
            SmokeRemove();
            _smokeBMD = new BitmapData(100, 100, true, 16777215);
            _smokeParticles = [];
        }

        internal static function SmokeRemove():void {
            _smokeBMD = null;
        }

        internal static function SmokeTick(param1:Event = null):void {
            var _loc2_:int = 0;
            var _loc3_:Object = null;
            var _loc4_:int = 0;
            var _loc5_:BitmapData = null;
            if (!_smokeBMD) {
                return;
            }
            _frame += 1;
            if (_frame == 1000) {
                _frame = 0;
            }
            if (_frame % 2 == 0) {
                if (_smokeParticles.length < 200) {
                    _smokeParticles.push({
                                "position": new Point(2 + Math.random() * 15, 90),
                                "speed": 3 + Math.random(),
                                "wind": 0.6 + Math.random() * 0.4
                            });
                }
                _smokeBMD.fillRect(_smokeBMD.rect, 16777215);
                _loc2_ = 0;
                while (_loc2_ < _smokeParticles.length) {
                    _loc3_ = _smokeParticles[_loc2_];
                    _loc3_.position.x += _loc3_.wind * 0.4;
                    _loc3_.position.y -= _loc3_.speed * 0.2;
                    if (_loc3_.speed > 0.1) {
                        _loc3_.speed -= 0.02;
                    }
                    if ((_loc4_ = int(100 - 100 / 4 * _loc3_.speed)) < 60) {
                        _loc4_ = 60;
                    }
                    _loc5_ = Smoke._smokeParticleBMD[_loc4_];
                    _smokeBMD.copyPixels(_loc5_, _loc5_.rect, _loc3_.position, null, null, true);
                    if (_loc4_ >= 95) {
                        _smokeParticles[_loc2_] = {
                                "position": new Point(2 + Math.random() * 15, 90),
                                "speed": 3 + Math.random(),
                                "wind": 0.6 + Math.random() * 0.5
                            };
                    }
                    _loc2_++;
                }
            }
        }

        internal static function GetPendingZoneRequestIndex(cellX:int, cellY:int):int {
            if (_pendingMapCellDataRequests.length == 0) {
                return -1;
            }
            var idx:int = -1;
            var req:Object = null;
            var cellZone:Object = GetCellZone(cellX, cellY);
            for each (req in _pendingMapCellDataRequests) {
                idx += 1;
                if (req.loadvars) {
                    var reqX:int = int(req.loadvars[0][1]);
                    var reqY:int = int(req.loadvars[1][1]);
                    var reqZoneID:int = reqX * 10000 + reqY;
                    if (reqZoneID == cellZone.id) {
                        return idx;
                    }
                }
            }
            return -1;
        }

        internal static function ZoneHasPendingTransferRequest(zoneId:int):Boolean {
            if (!_pendingTransferRequest) {
                return false;
            }
            var sourceZoneId:int;
            var targetZoneId:int;
            if (_monsterSource) {
                sourceZoneId = GetCellZone(_monsterSource.cellX, _monsterSource.cellY).id;
            }
            if (_monsterTargetRef) {
                targetZoneId = GetCellZone(_monsterTargetRef.cellX, _monsterTargetRef.cellY).id;
            }
            return (zoneId == sourceZoneId || zoneId == targetZoneId);
        }

        internal static function GetCellZone(cellX:int, cellY:int):Object {
            var zonePoint:Point = new Point(int(cellX / _zoneWidth) * _zoneWidth, int(cellY / _zoneHeight) * _zoneHeight);
            var zoneId:int = zonePoint.x * 10000 + zonePoint.y;
            var zone:Object = {
                    point: zonePoint,
                    id: zoneId
                };
            return zone;
        }

        public static function ShowInfoEnemy(param1:IMapRoomCell, param2:Boolean = false):void {
            _mc.ShowInfoEnemy(param1 as MapRoomCell, param2);
        }

        public static function HideInfoMine():void {
            _mc.HideInfoMine();
        }

        public function set bookmarkData(param1:Object):void {
            _bookmarkData = param1;
        }

        public function set mapWidth(param1:int):void {
            _mapWidth = param1;
        }

        public function set mapHeight(param1:int):void {
            _mapHeight = param1;
        }

        public function get worldID():int {
            return _worldID;
        }

        public function set worldID(param1:int):void {
            _worldID = param1;
        }

        public function get isOpen():Boolean {
            return _open;
        }

        public function get flingerInRange():Boolean {
            return _flingerInRange;
        }

        public function get viewOnly():Boolean {
            return _viewOnly;
        }

        public function get playerOwnedCells():Vector.<IMapRoomCell> {
            return null;
        }

        public function get allianceDataById():Dictionary {
            return null;
        }

        public function Setup():void {
            _Setup(GLOBAL._mapHome, this.worldID, _inviteBaseID, this.viewOnly);
        }

        public function ReadyToShow():Boolean {
            return true;
        }

        public function ShowDelayed(param1:Boolean = false):void {
            if (GLOBAL.mode === GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL.m_mapRoomFunctional = true;
            }
            if (param1 || _reposition || (!BASE.isMainYard || GLOBAL._bMap && GLOBAL._bMap._canFunction || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) && (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || !_open)) {
                SOUNDS.Play("click1");
                _open = true;
                _reposition = false;
                if (GLOBAL.INFERNO_ONLY) {
                    IoQuests.once("map_open"); // (the quest book: the map really opened)
                }
                if (_mc != null) {
                    _mc.Cleanup();
                    _mc = null;
                }
                // Map from the Outposts list: open on that outpost, not on the yard you are in.
                var ioFocused:Boolean = ioFocus != null;
                IoMapSnapshot.Request();
                _mc = new MapRoomPopup();
                _mc.Setup();
                BASE.Cleanup();
                GLOBAL._layerUI.addChild(_mc);
                UI2.SetupHUD();
                if (GLOBAL._currentCell) {
                    GetCell(GLOBAL._currentCell.cellX, GLOBAL._currentCell.cellY, true);
                    if (!ioFocused) {
                        _mc.JumpTo(new Point(GLOBAL._currentCell.cellX, GLOBAL._currentCell.cellY));
                    }
                    if (_showEnemyWait) {
                        _mc.ShowInfoEnemy(GLOBAL._currentCell as MapRoomCell, true);
                        _showEnemyWait = false;
                    }
                    else if (_showAttackWait) {
                        _mc.ShowAttack(GLOBAL._currentCell as MapRoomCell);
                        _showAttackWait = false;
                    }
                }
                if (_empiredestroyed) {
                    GLOBAL.Message(KEYS.Get("empiredestroyed_newbase"));
                    _empiredestroyed = false;
                }
                if (GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
                    if (Chat._bymChat) {
                        Chat._bymChat.show();
                    }
                    if (UI_BOTTOM._missions) {
                        UI_BOTTOM._missions.visible = true;
                    }
                }
                else {
                    if (Chat._bymChat) {
                        Chat._bymChat.hide();
                    }
                    if (UI_BOTTOM._missions) {
                        UI_BOTTOM._missions.visible = false;
                    }
                }
            }
            Tutorial.ShowIfNeeded();
        }

        public function Hide():void {
            if (_open) {
                SOUNDS.Play("close");
                if (_mc && _mc.parent) {
                    _mc.parent.removeChild(_mc);
                }
                ClearCells();
                if (_mc) {
                    _mc.Cleanup();
                    _mc = null;
                }
            }
            _open = false;
        }

        public function BookmarksClear():void {
            MapRoom._bookmarkData = {};
            MapRoom._bookmarks = [];
            MapRoom.BookmarksSave();
        }

        public function FindCell(param1:int, param2:int):IMapRoomCell {
            return GetCell(param1, param2) as IMapRoomCell;
        }

        public function LoadCell(param1:int, param2:int, param3:Boolean = false):void {
            GetCell(param1, param2, param3);
        }

        public function CalculateCellId(param1:int, param2:int):int {
            return param2 * _mapWidth + param1 + 1;
        }

        public function Tick():void {
            if (_open && _mc && Boolean(_mc.parent)) {
                IoMapSnapshot.Request(); // when the server's next snapshot is out (every 5 minutes)
                _mc.Tick();
            }
            if (_open && (!_mc || _mc && !_mc.parent) && BASE._saveCounterA == BASE._saveCounterB) {
                PLEASEWAIT.Hide();
                if (_mc) {
                    _mc.Cleanup();
                    _mc = null;
                }
                _mc = new MapRoomPopup();
                _mc.Setup();
                BASE.Cleanup();
                GLOBAL._layerWindows.addChild(_mc);
            }
        }

        public function TickFast():void {
        }

        public function ResizeHandler():void {
            if (!_viewOnly) {
                MapRoomManager.instance.Hide();
            }
            else {
                HideFromViewOnly();
            }
            MapRoomManager.instance.ShowDelayed(true);
        }
    }
}
