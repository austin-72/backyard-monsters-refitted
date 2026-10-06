package com.monsters.alliances {
    import com.monsters.maproom_advanced.MapRoomCell;
    import flash.events.IOErrorEvent;

    public class ALLIANCES {

        public static var _allianceID:int;

        private static var _alliances:Object;

        public static var _myAlliance:AllyInfo;

        public static var _isLeader:Boolean = false;

        private static var _open:Boolean;

        private static var _myAllianceData:Object = null;

        private static var _myAllianceLoaded:Boolean = false;

        private static var _myAllianceLoading:Boolean = false;

        private static var _myAlliancePending:Array = [];

        private static var _messagesData:Array = null;

        private static var _messagesLoaded:Boolean = false;

        private static var _messagesLoading:Boolean = false;

        private static var _messagesPending:Array = [];

        private static var _membersData:Array = null;

        private static var _membersLoaded:Boolean = false;

        private static var _membersLoading:Boolean = false;

        private static var _membersPending:Array = [];

        private static var _suggestedData:Array = null;

        private static var _suggestedLoaded:Boolean = false;

        private static var _suggestedLoading:Boolean = false;

        private static var _suggestedPending:Array = [];

        public function ALLIANCES() {
            super();
        }

        /**
         * Loads the player's My Alliance payload into the store, firing the network
         * request at most once per open/mutation cycle. A warm cache invokes onDone
         * synchronously; concurrent callers coalesce onto the single in-flight
         * request. Mirrors the original client, which loaded alliance info on popup
         * open and refreshed it on mutations rather than on every tab switch.
         * @param {Function} onDone - Receives the alliance data object, or null when
         *   the player is unaffiliated or the request fails. May be null (warm only).
         * @param {Boolean} force - Bypass the cache and re-fetch (used on popup open).
         */
        public static function LoadMyAlliance(onDone:Function, force:Boolean = false):void {
            if (_myAllianceLoaded && !force) {
                if (onDone != null) {
                    onDone(_myAllianceData);
                }
                return;
            }
            if (onDone != null) {
                _myAlliancePending.push(onDone);
            }
            if (_myAllianceLoading) {
                return;
            }
            _myAllianceLoading = true;
            var r:URLLoaderApi = new URLLoaderApi();
            r.load(GLOBAL._allianceURL + "myalliance", null, _onMyAllianceLoaded, _onMyAllianceLoadFail);
        }

        private static function _onMyAllianceLoaded(param1:Object):void {
            _myAllianceData = (param1 && param1.alliance) ? param1.alliance : null;
            _myAllianceLoaded = true;
            _myAllianceLoading = false;
            _flushMyAlliancePending();
        }

        private static function _onMyAllianceLoadFail(param1:IOErrorEvent):void {
            _myAllianceData = null;
            _myAllianceLoaded = false;
            _myAllianceLoading = false;
            _flushMyAlliancePending();
        }

        private static function _flushMyAlliancePending():void {
            var _loc1_:Array = _myAlliancePending;
            _myAlliancePending = [];
            for each (var _loc2_:Function in _loc1_) {
                if (_loc2_ != null) {
                    _loc2_(_myAllianceData);
                }
            }
        }

        /**
         * Drops the cached My Alliance payload so the next LoadMyAlliance() re-fetches.
         * Call after any mutation that changes the player's alliance (create, edit,
         * leave, join, kick, promote).
         */
        public static function InvalidateMyAlliance():void {
            _myAllianceLoaded = false;
            _myAllianceData = null;
        }

        /**
         * Loads the player's inbox into the store. One inbox carries both directions:
         * invites and join requests waiting on them, plus the outcomes of whatever
         * they sent.
         *
         * Cached and coalesced like LoadMyAlliance, because the alliance window needs
         * the rows on open to label the Invites tab and the tab itself needs the same
         * rows to draw - one request serves both.
         *
         * @param {Function} onDone - Receives the message rows, or null on failure. May be null (warm only).
         * @param {Boolean} force - Bypass the cache and re-fetch.
         */
        public static function LoadMessages(onDone:Function, force:Boolean = false):void {
            if (_messagesLoaded && !force) {
                if (onDone != null)
                    onDone(_messagesData);
                return;
            }

            if (onDone != null)
                _messagesPending.push(onDone);

            if (_messagesLoading)
                return;

            _messagesLoading = true;
            new URLLoaderApi().load(GLOBAL._allianceURL + "getmessages", null, _onMessagesLoaded, _onMessagesLoadFail);
        }

        private static function _onMessagesLoaded(response:Object):void {
            _messagesData = (response && !response.error) ? response.messages as Array : null;
            _messagesLoaded = true;
            _messagesLoading = false;
            _flushMessagesPending();
        }

        private static function _onMessagesLoadFail(error:IOErrorEvent):void {
            _messagesData = null;
            _messagesLoaded = false;
            _messagesLoading = false;
            _flushMessagesPending();
        }

        private static function _flushMessagesPending():void {
            var waiting:Array = _messagesPending;
            _messagesPending = [];

            for each (var callback:Function in waiting) {
                if (callback != null)
                    callback(_messagesData);
            }
        }

        public static function InvalidateMessages():void {
            _messagesLoaded = false;
            _messagesData = null;
        }

        /**
         * Loads the player's alliance roster into the store.
         *
         * @param {Function} onDone - Receives the member rows, or null on failure. May be null (warm only).
         * @param {Boolean} force - Bypass the cache and re-fetch.
         */
        public static function LoadMembers(onDone:Function, force:Boolean = false):void {
            if (_membersLoaded && !force) {
                if (onDone != null)
                    onDone(_membersData);
                return;
            }

            if (onDone != null)
                _membersPending.push(onDone);

            if (_membersLoading)
                return;

            _membersLoading = true;
            new URLLoaderApi().load(GLOBAL._allianceURL + "myalliancemembers", null, _onMembersLoaded, _onMembersLoadFail);
        }

        private static function _onMembersLoaded(response:Object):void {
            _membersData = (response && !response.error) ? response.members as Array : null;
            _membersLoaded = true;
            _membersLoading = false;
            _flushMembersPending();
        }

        private static function _onMembersLoadFail(error:IOErrorEvent):void {
            _membersData = null;
            _membersLoaded = false;
            _membersLoading = false;
            _flushMembersPending();
        }

        private static function _flushMembersPending():void {
            var waiting:Array = _membersPending;
            _membersPending = [];

            for each (var callback:Function in waiting) {
                if (callback != null)
                    callback(_membersData);
            }
        }

        /**
         * Drops the cached roster so the next LoadMembers() re-fetches. Call after any
         * mutation that changes who is in the alliance.
         */
        public static function InvalidateMembers():void {
            _membersLoaded = false;
            _membersData = null;
        }

        /**
         * Loads the Suggested tab's recruitment candidates into the store. Cached the
         * same way the original was, which fetched the list once and reused it for the
         * life of the popup rather than on every tab switch.
         *
         * @param {Function} onDone - Receives the candidate rows, or null on failure. May be null (warm only).
         * @param {Boolean} force - Bypass the cache and re-fetch.
         */
        public static function LoadSuggested(onDone:Function, force:Boolean = false):void {
            if (_suggestedLoaded && !force) {
                if (onDone != null)
                    onDone(_suggestedData);
                return;
            }

            if (onDone != null)
                _suggestedPending.push(onDone);

            if (_suggestedLoading)
                return;

            _suggestedLoading = true;
            new URLLoaderApi().load(GLOBAL._allianceURL + "getsuggestedmembers", null, _onSuggestedLoaded, _onSuggestedLoadFail);
        }

        private static function _onSuggestedLoaded(response:Object):void {
            _suggestedData = (response && !response.error) ? response.members as Array : null;
            _suggestedLoaded = true;
            _suggestedLoading = false;
            _flushSuggestedPending();
        }

        private static function _onSuggestedLoadFail(error:IOErrorEvent):void {
            _suggestedData = null;
            _suggestedLoaded = false;
            _suggestedLoading = false;
            _flushSuggestedPending();
        }

        private static function _flushSuggestedPending():void {
            var waiting:Array = _suggestedPending;
            _suggestedPending = [];

            for each (var callback:Function in waiting) {
                if (callback != null)
                    callback(_suggestedData);
            }
        }

        /**
         * Drops the cached candidates so the next LoadSuggested() re-fetches. Call after
         * inviting someone, since the server leaves out anyone already invited.
         */
        public static function InvalidateSuggested():void {
            _suggestedLoaded = false;
            _suggestedData = null;
        }

        /**
         * Invites a player into the alliance, from the Suggested tab.
         *
         * @param {int} userId - The player being invited.
         * @param {Function} onDone - Receives the server response.
         */
        public static function InviteUser(userId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "inviteuser", [["userid", userId]],
                    function(response:Object):void {
                        if (response != null && !response.error) {
                            InvalidateSuggested();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Loads the alliance's power-ups for the Power-Ups tab.
         *
         * @param {Function} onDone - Receives the power-up rows, or null on failure.
         */
        public static function LoadPowerups(onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "getpowerups", null,
                    function(response:Object):void {
                        onDone((response != null && !response.error) ? response.powerups : null);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Starts a charged power-up for the whole alliance. Leader only - the
         * server refuses anyone else with its own wording.
         *
         * @param {int} powerupId - Which power-up to start.
         * @param {Function} onDone - Receives the server response, carrying the refreshed rows.
         */
        public static function ActivatePowerup(powerupId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "activatepowerup", [["powerup_id", powerupId]],
                    function(response:Object):void {
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Spends Shiny to shorten a power-up's charge for the whole alliance. Open to
         * any member, unlike activation.
         *
         * @param {int} powerupId - Which power-up to speed up.
         * @param {int} hours - Hours to remove; the server clamps this to what is left.
         * @param {Function} onDone - Receives the server response, carrying the refreshed rows.
         */
        public static function PurchasePowerup(powerupId:int, hours:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "purchasepowerup",
                    [["powerup_id", powerupId], ["purchase_hours", hours]],
                    function(response:Object):void {
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Rows in the cached inbox still waiting on the player, which labels the
         * Invites tab. Reads the cache rather than asking the server, so it is only
         * as fresh as the last LoadMessages().
         *
         * @returns {int} Pending rows, or 0 before the inbox has loaded.
         */
        public static function PendingInviteCount():int {
            if (_messagesData == null)
                return 0;

            var pending:int = 0;
            for each (var message:Object in _messagesData) {
                if (String(message.status) == AllianceConstants.INVITE_PENDING) {
                    pending++;
                }
            }
            return pending;
        }

        /**
         * Members in the player's alliance, from the cached My Alliance payload.
         *
         * @returns {int} Member count, or 0 when unaffiliated or not yet loaded.
         */
        public static function MemberCount():int {
            return (_myAllianceData != null) ? int(_myAllianceData.number_of_members) : 0;
        }

        /**
         * Members of the player's alliance currently online, from the cached My
         * Alliance payload. The same last-seen window the Members tab uses for its
         * per-row dots, so the tab count and the rows always agree.
         *
         * @returns {int} Online members, or 0 when unaffiliated or not yet loaded.
         */
        public static function OnlineCount():int {
            return (_myAllianceData != null) ? int(_myAllianceData.online_members) : 0;
        }

        /**
         * The player's alliance name, from the cached My Alliance payload. Used by
         * the confirmation messages, which name the alliance the way the original did.
         *
         * @returns {String} The name, or empty when unaffiliated or not yet loaded.
         */
        public static function AllianceName():String {
            return (_myAllianceData != null) ? String(_myAllianceData.name) : "";
        }

        /**
         * Answers a pending invite or join request. Accepting either one changes the
         * player's roster, so the My Alliance cache is dropped on success.
         *
         * @param {int} inviteId - The row being answered.
         * @param {String} status - "accepted" or "declined".
         * @param {Function} onDone - Receives the server response.
         */
        public static function ChangeInviteStatus(inviteId:int, status:String, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "changeinvitestatus", [["invite_id", inviteId], ["status", status]],
                    function(response:Object):void {
                        if (response != null && !response.error) {
                            if (response.alliancedata) {
                                _allianceID = int(response.alliancedata.alliance_id);
                                _myAlliance = SetAlliance(response.alliancedata);
                                _isLeader = Boolean(response.alliancedata.is_leader);
                            }

                            InvalidateMyAlliance();
                            InvalidateMessages();
                            InvalidateMembers();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Asks an alliance to take the player in, from the Browse tab.
         *
         * @param {int} allianceId - The alliance being asked.
         * @param {Function} onDone - Receives the server response.
         */

        /**
         * Flags another alliance as Foe, Neutral or Ally on behalf of the player's own.
         *
         * The flag is the alliance's own private opinion - the flagged alliance is
         * never told - and it is advisory: the map room warns before attacking an
         * ally rather than preventing it.
         *
         * The map room colours cells from _myAlliance.relationships, which only a base
         * load ever fills, so the new stance is written into it here - MapRoomCell
         * re-runs Relations() on every draw and picks it up on the next one.
         *
         * @param {int} allianceId - The alliance being flagged.
         * @param {int} stance - -1 Foe, 0 Neutral, 1 Ally.
         * @param {Function} onDone - Receives the parsed response, or null if the request never landed.
         */
        public static function ChangeRelationship(allianceId:int, stance:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "changerelationship",
                    [["target_alliance_id", allianceId], ["relationship", stance]],
                    function(response:Object):void {
                        if (Boolean(response) && !response.error) {
                            if (_myAlliance) {
                                _myAlliance.SetRelation(allianceId, stance);
                            }
                            InvalidateMyAlliance();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /** Inferno-only: the members of any alliance (Browse -> Actions -> Members). onDone(response or null). */
        public static function LoadAllianceMembers(allianceId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "alliancemembers", [["alliance_id", allianceId]],
                    function(response:Object):void {
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        public static function RequestJoin(allianceId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "requestjoin", [["alliance_id", allianceId]],
                    function(response:Object):void {
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Clears the rows checked in the Invites tab.
         *
         * @param {String} inviteIds - Comma-separated invite ids, as the original sent them.
         * @param {Function} onDone - Receives the server response.
         */
        public static function DeleteMessages(inviteIds:String, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "deletemessages", [["invite_ids", inviteIds]],
                    function(response:Object):void {
                        if (response != null && !response.error) {
                            InvalidateMessages();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Removes a member from the player's alliance. Leader only; the server
         * rejects anyone else.
         *
         * @param {int} userId - The member being removed.
         * @param {Function} onDone - Receives the server response.
         */
        public static function KickMember(userId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "kickmember", [["userid", userId]],
                    function(response:Object):void {
                        if (response != null && !response.error) {
                            InvalidateMyAlliance();
                            InvalidateMembers();
                            InvalidateSuggested();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        /**
         * Hands leadership to another member. The player is demoted in the same move,
         * so _isLeader is dropped here and the tabs rebuild without leader actions.
         *
         * @param {int} userId - The member taking over.
         * @param {Function} onDone - Receives the server response.
         */
        public static function PromoteMember(userId:int, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + "promotemember", [["userid", userId]],
                    function(response:Object):void {
                        if (response != null && !response.error) {
                            _isLeader = false;
                            InvalidateMyAlliance();
                            InvalidateMembers();
                        }
                        onDone(response);
                    },
                    function(e:IOErrorEvent):void {
                        onDone(null);
                    });
        }

        // ---- Inferno-only: the redesigned window (the header, Board, Outposts, officers)

        /** The player's role in their alliance: "leader", "officer" or "member" ("" before it has loaded). */
        public static function ioRole():String {
            if (_isLeader) {
                return "leader";
            }
            return (_myAllianceData && _myAllianceData.my_role) ? String(_myAllianceData.my_role) : "";
        }

        /** The leader or an officer: they can pin, invite, recruit and kick. */
        public static function ioIsStaff():Boolean {
            return _isLeader || ioRole() == "officer";
        }

        /** Pins put up since the player last opened the Board (the tab's count). */
        public static function ioUnreadPins():int {
            return _myAllianceData ? int(_myAllianceData.unread_pins) : 0;
        }

        /** The Board was opened: its count clears without another request. */
        public static function ioClearUnreadPins():void {
            if (_myAllianceData) {
                _myAllianceData.unread_pins = 0;
            }
        }

        /** The world the player's yard is on (pins and outposts jump only to places on it). */
        public static function ioMyWorld():String {
            return (_myAllianceData && _myAllianceData.my_world) ? String(_myAllianceData.my_world) : "";
        }

        /** The cached alliance (header and Overview), or null. */
        public static function ioData():Object {
            return _myAllianceData;
        }

        /** A request of the Board, Outposts or officers; `onDone` gets the response, or null when it failed. */
        private static function ioCall(path:String, vars:Array, onDone:Function):void {
            new URLLoaderApi().load(GLOBAL._allianceURL + path, vars && vars.length ? vars : [["v", "1"]],
                    function(response:Object):void {
                        if (onDone != null) {
                            onDone(response);
                        }
                    },
                    function(e:IOErrorEvent):void {
                        if (onDone != null) {
                            onDone(null);
                        }
                    });
        }

        /** The board's pins; `seen`: the Board tab is showing them (its count clears). */
        public static function ioLoadPins(seen:Boolean, onDone:Function):void {
            ioCall("pins", [["seen", seen ? "1" : "0"]], onDone);
        }

        /** Pins (no id) or changes a pin: { id?, title, body, x?, y?, world? }. */
        public static function ioSavePin(pin:Object, onDone:Function):void {
            var vars:Array = [["title", String(pin.title || "")], ["body", String(pin.body || "")]];
            if (pin.id) {
                vars.push(["id", String(pin.id)]);
            }
            if (pin.x !== null && pin.x !== undefined && pin.x !== "" && pin.y !== null && pin.y !== undefined && pin.y !== "") {
                vars.push(["x", String(pin.x)]);
                vars.push(["y", String(pin.y)]);
                if (pin.world) {
                    vars.push(["world", String(pin.world)]);
                }
            }
            ioCall("savepin", vars, function(response:Object):void {
                    if (response != null && !response.error) {
                        InvalidateMyAlliance();
                    }
                    onDone(response);
                });
        }

        public static function ioDeletePin(id:int, onDone:Function):void {
            ioCall("deletepin", [["id", String(id)]], function(response:Object):void {
                    if (response != null && !response.error) {
                        InvalidateMyAlliance();
                    }
                    onDone(response);
                });
        }

        public static function ioMovePin(id:int, dir:String, onDone:Function):void {
            ioCall("movepin", [["id", String(id)], ["dir", dir]], onDone);
        }

        /** A page of the outposts gained and lost: filters { kind, source, member, world }, `before` the last id shown. */
        public static function ioLoadOutposts(filters:Object, before:int, onDone:Function):void {
            var vars:Array = [];
            for each (var k:String in ["kind", "source", "member", "world"]) {
                if (filters && filters[k]) {
                    vars.push([k, String(filters[k])]);
                }
            }
            if (before > 0) {
                vars.push(["before", String(before)]);
            }
            ioCall("outposts", vars, onDone);
        }

        /** The leader names a member an officer (or stops). */
        public static function ioSetOfficer(userId:int, on:Boolean, onDone:Function):void {
            ioCall("setofficer", [["userid", userId], ["on", on ? "1" : "0"]], function(response:Object):void {
                    if (response != null && !response.error) {
                        InvalidateMembers();
                    }
                    onDone(response);
                });
        }

        /** A new pin was said in Alliance chat: the window's Board count (if it is open) catches up. */
        public static function ioPinsChanged():void {
            InvalidateMyAlliance();
            if (ALLIANCEWINDOW._open) {
                LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
            }
        }

        public static function Setup(param1:int = 0):void {
            _alliances = new Object();
            if (param1 > 0) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    _allianceID = param1;
                    ACHIEVEMENTS.Check("alliance", 1, true);
                }
            }
        }

        public static function Clear():void {
            if (_alliances) {
                _alliances = null;
            }
            _alliances = new Object();
            if (_myAlliance) {
                _myAlliance = null;
            }
            _isLeader = false;
            InvalidateMyAlliance();
            InvalidateMessages();
            InvalidateMembers();
            InvalidateSuggested();
        }

        public static function SetCellAlliance(param1:MapRoomCell, param2:Boolean = false):AllyInfo {
            var _loc3_:AllyInfo = null;
            var _loc4_:int = 0;
            if (Boolean(param1.allianceID) && param1.allianceID != 0) {
                _loc4_ = param1.allianceID;
                if (_alliances[_loc4_]) {
                    _loc3_ = _alliances[_loc4_];
                    param1.alliance = _loc3_;
                }
                if (_allianceID && _allianceID != 0 && Boolean(_loc3_)) {
                    _loc3_.Relations(_allianceID);
                }
                return _loc3_;
            }
            return null;
        }

        /**
         * Inferno-only (the world map, IoMapLod): how the player stands with an alliance. 4 your own
         * alliance, -1 hostile, 1 friendly, 0 neutral; -99 no alliance at all.
         */
        public static function ioRelation(allianceID:int):int {
            var info:AllyInfo = null;
            if (!allianceID) {
                return -99;
            }
            if (_allianceID && allianceID == _allianceID) {
                return 4;
            }
            info = _alliances ? _alliances[allianceID] as AllyInfo : null;
            if (!info || !_allianceID) {
                return 0;
            }
            info.Relations(_allianceID);
            if (info.relationship < 0) {
                return -1;
            }
            return info.relationship > 0 && info.relationship < 4 ? 1 : 0;
        }

        public static function SetAlliance(param1:Object):AllyInfo {
            var _loc2_:AllyInfo = null;
            var _loc3_:int = int(param1.alliance_id);
            if (_alliances[param1.alliance_id]) {
                _loc2_ = _alliances[_loc3_];
            }
            else {
                _loc2_ = new AllyInfo(param1);
            }
            if (_allianceID && _allianceID != 0 && _loc2_ && !_loc2_.relationship) {
                _loc2_.Relations(_allianceID);
            }
            return _loc2_;
        }

        public static function ProcessAlliances(param1:Array):void {
            var _loc3_:Object = null;
            var _loc4_:AllyInfo = null;
            var _loc2_:int = 0;
            while (_loc2_ < param1.length) {
                _loc3_ = param1[_loc2_];
                _loc4_ = new AllyInfo(_loc3_);
                _alliances[_loc3_.alliance_id] = _loc4_;
                _loc2_++;
            }
        }

        public static function AllianceInvite(param1:int):void {
            var r:URLLoaderApi;
            var alliancevars:Array;
            var onAllianceInviteSuccess:Function = null;
            var onAllianceInviteFail:Function = null;
            var _userId:int = param1;
            onAllianceInviteSuccess = function(param1:Object):void {
                PLEASEWAIT.Hide();
                if (param1 != null && !param1.error) {
                    GLOBAL.Message(KEYS.Get("msg_allianceinvitesent"));
                    return;
                }
                if (param1 && param1.error) {
                    GLOBAL.Message(String(param1.error));
                }
                else {
                    GLOBAL.Message(KEYS.Get("msg_err_processinginvite_short"));
                }
            };
            onAllianceInviteFail = function(param1:IOErrorEvent):void {
                GLOBAL.Message(KEYS.Get("msg_err_sendinginvite"));
            };
            if (!_myAlliance) {
                GLOBAL.Message(KEYS.Get("msg_notinalliance"));
                return;
            }
            r = new URLLoaderApi();
            alliancevars = [["userid", _userId]];
            r.load(GLOBAL._allianceURL + "inviteuser", alliancevars, onAllianceInviteSuccess, onAllianceInviteFail);
        }

        public static function AlliancesServerUpdate(param1:String):void {
            if (ALLIANCES._open) {
                if (!GLOBAL._local) {
                    POPUPS.RemoveBG();
                }
                ALLIANCES._open = false;
            }
            if (BASE._userID == LOGIN._playerID) {
                BASE.Page();
            }
            else {
                BASE.Page();
            }
        }

        public static function AlliancesViewLeader(param1:String):void {
        }
    }
}
