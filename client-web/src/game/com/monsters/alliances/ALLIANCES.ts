import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { ACHIEVEMENTS, ALLIANCEWINDOW, AllianceConstants, AllyInfo, BASE, GLOBAL, KEYS, LOGIN, MapRoomCell, PLEASEWAIT, POPUPS, URLLoaderApi } from "@game";

export class ALLIANCES extends ASObject {
    public static _allianceID: int = 0;

    private static _alliances: any = null;

    public static _myAlliance: AllyInfo = null;

    public static _isLeader: boolean = false;

    private static _open: boolean = false;

    private static _myAllianceData: any = null;

    private static _myAllianceLoaded: boolean = false;

    private static _myAllianceLoading: boolean = false;

    private static _myAlliancePending: any[] = [];

    private static _messagesData: any[] = null;

    private static _messagesLoaded: boolean = false;

    private static _messagesLoading: boolean = false;

    private static _messagesPending: any[] = [];

    private static _membersData: any[] = null;

    private static _membersLoaded: boolean = false;

    private static _membersLoading: boolean = false;

    private static _membersPending: any[] = [];

    private static _suggestedData: any[] = null;

    private static _suggestedLoaded: boolean = false;

    private static _suggestedLoading: boolean = false;

    private static _suggestedPending: any[] = [];

    public $ctor(): void {
        super.$ctor();
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
    public static LoadMyAlliance(onDone: Function, force: boolean = false): void {
        if (ALLIANCES._myAllianceLoaded && !force) {
            if (onDone != null) {
                onDone(ALLIANCES._myAllianceData);
            }
            return;
        }
        if (onDone != null) {
            ALLIANCES._myAlliancePending.push(onDone);
        }
        if (ALLIANCES._myAllianceLoading) {
            return;
        }
        ALLIANCES._myAllianceLoading = true;
        let r: URLLoaderApi = new URLLoaderApi();
        r.load(GLOBAL._allianceURL + "myalliance", null, ALLIANCES._onMyAllianceLoaded, ALLIANCES._onMyAllianceLoadFail);
    }

    private static _onMyAllianceLoaded(param1: any): void {
        ALLIANCES._myAllianceData = (param1 && param1.alliance) ? param1.alliance : null;
        ALLIANCES._myAllianceLoaded = true;
        ALLIANCES._myAllianceLoading = false;
        ALLIANCES._flushMyAlliancePending();
    }

    private static _onMyAllianceLoadFail(param1: IOErrorEvent): void {
        ALLIANCES._myAllianceData = null;
        ALLIANCES._myAllianceLoaded = false;
        ALLIANCES._myAllianceLoading = false;
        ALLIANCES._flushMyAlliancePending();
    }

    private static _flushMyAlliancePending(): void {
        let _loc1_: any[] = ALLIANCES._myAlliancePending;
        ALLIANCES._myAlliancePending = [];
        for (let _loc2_ of as3.values(_loc1_)) {
            if (_loc2_ != null) {
                _loc2_(ALLIANCES._myAllianceData);
            }
        }
    }

    /**
     * Drops the cached My Alliance payload so the next LoadMyAlliance() re-fetches.
     * Call after any mutation that changes the player's alliance (create, edit,
     * leave, join, kick, promote).
     */
    public static InvalidateMyAlliance(): void {
        ALLIANCES._myAllianceLoaded = false;
        ALLIANCES._myAllianceData = null;
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
    public static LoadMessages(onDone: Function, force: boolean = false): void {
        if (ALLIANCES._messagesLoaded && !force) {
            if (onDone != null) {
                onDone(ALLIANCES._messagesData);
            }
            return;
        }

        if (onDone != null) {
            ALLIANCES._messagesPending.push(onDone);
        }

        if (ALLIANCES._messagesLoading) {
            return;
        }

        ALLIANCES._messagesLoading = true;
        new URLLoaderApi().load(GLOBAL._allianceURL + "getmessages", null, ALLIANCES._onMessagesLoaded, ALLIANCES._onMessagesLoadFail);
    }

    private static _onMessagesLoaded(response: any): void {
        ALLIANCES._messagesData = (response && !response.error) ? as3.as(response.messages, Array) : null;
        ALLIANCES._messagesLoaded = true;
        ALLIANCES._messagesLoading = false;
        ALLIANCES._flushMessagesPending();
    }

    private static _onMessagesLoadFail(error: IOErrorEvent): void {
        ALLIANCES._messagesData = null;
        ALLIANCES._messagesLoaded = false;
        ALLIANCES._messagesLoading = false;
        ALLIANCES._flushMessagesPending();
    }

    private static _flushMessagesPending(): void {
        let waiting: any[] = ALLIANCES._messagesPending;
        ALLIANCES._messagesPending = [];

        for (let callback of as3.values(waiting)) {
            if (callback != null) {
                callback(ALLIANCES._messagesData);
            }
        }
    }

    public static InvalidateMessages(): void {
        ALLIANCES._messagesLoaded = false;
        ALLIANCES._messagesData = null;
    }

    /**
     * Loads the player's alliance roster into the store.
     *
     * @param {Function} onDone - Receives the member rows, or null on failure. May be null (warm only).
     * @param {Boolean} force - Bypass the cache and re-fetch.
     */
    public static LoadMembers(onDone: Function, force: boolean = false): void {
        if (ALLIANCES._membersLoaded && !force) {
            if (onDone != null) {
                onDone(ALLIANCES._membersData);
            }
            return;
        }

        if (onDone != null) {
            ALLIANCES._membersPending.push(onDone);
        }

        if (ALLIANCES._membersLoading) {
            return;
        }

        ALLIANCES._membersLoading = true;
        new URLLoaderApi().load(GLOBAL._allianceURL + "myalliancemembers", null, ALLIANCES._onMembersLoaded, ALLIANCES._onMembersLoadFail);
    }

    private static _onMembersLoaded(response: any): void {
        ALLIANCES._membersData = (response && !response.error) ? as3.as(response.members, Array) : null;
        ALLIANCES._membersLoaded = true;
        ALLIANCES._membersLoading = false;
        ALLIANCES._flushMembersPending();
    }

    private static _onMembersLoadFail(error: IOErrorEvent): void {
        ALLIANCES._membersData = null;
        ALLIANCES._membersLoaded = false;
        ALLIANCES._membersLoading = false;
        ALLIANCES._flushMembersPending();
    }

    private static _flushMembersPending(): void {
        let waiting: any[] = ALLIANCES._membersPending;
        ALLIANCES._membersPending = [];

        for (let callback of as3.values(waiting)) {
            if (callback != null) {
                callback(ALLIANCES._membersData);
            }
        }
    }

    /**
     * Drops the cached roster so the next LoadMembers() re-fetches. Call after any
     * mutation that changes who is in the alliance.
     */
    public static InvalidateMembers(): void {
        ALLIANCES._membersLoaded = false;
        ALLIANCES._membersData = null;
    }

    /**
     * Loads the Suggested tab's recruitment candidates into the store. Cached the
     * same way the original was, which fetched the list once and reused it for the
     * life of the popup rather than on every tab switch.
     *
     * @param {Function} onDone - Receives the candidate rows, or null on failure. May be null (warm only).
     * @param {Boolean} force - Bypass the cache and re-fetch.
     */
    public static LoadSuggested(onDone: Function, force: boolean = false): void {
        if (ALLIANCES._suggestedLoaded && !force) {
            if (onDone != null) {
                onDone(ALLIANCES._suggestedData);
            }
            return;
        }

        if (onDone != null) {
            ALLIANCES._suggestedPending.push(onDone);
        }

        if (ALLIANCES._suggestedLoading) {
            return;
        }

        ALLIANCES._suggestedLoading = true;
        new URLLoaderApi().load(GLOBAL._allianceURL + "getsuggestedmembers", null, ALLIANCES._onSuggestedLoaded, ALLIANCES._onSuggestedLoadFail);
    }

    private static _onSuggestedLoaded(response: any): void {
        ALLIANCES._suggestedData = (response && !response.error) ? as3.as(response.members, Array) : null;
        ALLIANCES._suggestedLoaded = true;
        ALLIANCES._suggestedLoading = false;
        ALLIANCES._flushSuggestedPending();
    }

    private static _onSuggestedLoadFail(error: IOErrorEvent): void {
        ALLIANCES._suggestedData = null;
        ALLIANCES._suggestedLoaded = false;
        ALLIANCES._suggestedLoading = false;
        ALLIANCES._flushSuggestedPending();
    }

    private static _flushSuggestedPending(): void {
        let waiting: any[] = ALLIANCES._suggestedPending;
        ALLIANCES._suggestedPending = [];

        for (let callback of as3.values(waiting)) {
            if (callback != null) {
                callback(ALLIANCES._suggestedData);
            }
        }
    }

    /**
     * Drops the cached candidates so the next LoadSuggested() re-fetches. Call after
     * inviting someone, since the server leaves out anyone already invited.
     */
    public static InvalidateSuggested(): void {
        ALLIANCES._suggestedLoaded = false;
        ALLIANCES._suggestedData = null;
    }

    /**
     * Invites a player into the alliance, from the Suggested tab.
     *
     * @param {int} userId - The player being invited.
     * @param {Function} onDone - Receives the server response.
     */
    public static InviteUser(userId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "inviteuser", [["userid", userId]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateSuggested();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
            onDone(null);
        });
    }

    /**
     * Loads the alliance's power-ups for the Power-Ups tab.
     *
     * @param {Function} onDone - Receives the power-up rows, or null on failure.
     */
    public static LoadPowerups(onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "getpowerups", null, (response: any): void => {
            onDone((response != null && !response.error) ? response.powerups : null);
        }, (e: IOErrorEvent): void => {
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
    public static ActivatePowerup(powerupId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "activatepowerup", [["powerup_id", powerupId]], (response: any): void => {
            onDone(response);
        }, (e: IOErrorEvent): void => {
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
    public static PurchasePowerup(powerupId: int, hours: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "purchasepowerup", [["powerup_id", powerupId], ["purchase_hours", hours]], (response: any): void => {
            onDone(response);
        }, (e: IOErrorEvent): void => {
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
    public static PendingInviteCount(): int {
        if (ALLIANCES._messagesData == null) {
            return 0;
        }

        let pending: int = 0;
        for (let message of as3.values(ALLIANCES._messagesData)) {
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
    public static MemberCount(): int {
        return (ALLIANCES._myAllianceData != null) ? ALLIANCES._myAllianceData.number_of_members | 0 : 0;
    }

    /**
     * Members of the player's alliance currently online, from the cached My
     * Alliance payload. The same last-seen window the Members tab uses for its
     * per-row dots, so the tab count and the rows always agree.
     *
     * @returns {int} Online members, or 0 when unaffiliated or not yet loaded.
     */
    public static OnlineCount(): int {
        return (ALLIANCES._myAllianceData != null) ? ALLIANCES._myAllianceData.online_members | 0 : 0;
    }

    /**
     * The player's alliance name, from the cached My Alliance payload. Used by
     * the confirmation messages, which name the alliance the way the original did.
     *
     * @returns {String} The name, or empty when unaffiliated or not yet loaded.
     */
    public static AllianceName(): string {
        return (ALLIANCES._myAllianceData != null) ? String(ALLIANCES._myAllianceData.name) : "";
    }

    /**
     * Answers a pending invite or join request. Accepting either one changes the
     * player's roster, so the My Alliance cache is dropped on success.
     *
     * @param {int} inviteId - The row being answered.
     * @param {String} status - "accepted" or "declined".
     * @param {Function} onDone - Receives the server response.
     */
    public static ChangeInviteStatus(inviteId: int, status: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "changeinvitestatus", [["invite_id", inviteId], ["status", status]], (response: any): void => {
            if (response != null && !response.error) {
                if (response.alliancedata) {
                    ALLIANCES._allianceID = response.alliancedata.alliance_id | 0;
                    ALLIANCES._myAlliance = ALLIANCES.SetAlliance(response.alliancedata);
                    ALLIANCES._isLeader = Boolean(response.alliancedata.is_leader);
                }

                ALLIANCES.InvalidateMyAlliance();
                ALLIANCES.InvalidateMessages();
                ALLIANCES.InvalidateMembers();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
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
    public static ChangeRelationship(allianceId: int, stance: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "changerelationship", [["target_alliance_id", allianceId], ["relationship", stance]], (response: any): void => {
            if (Boolean(response) && !response.error) {
                if (ALLIANCES._myAlliance) {
                    ALLIANCES._myAlliance.SetRelation(allianceId, stance);
                }
                ALLIANCES.InvalidateMyAlliance();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
            onDone(null);
        });
    }

    /** Inferno-only: the members of any alliance (Browse -> Actions -> Members). onDone(response or null). */
    public static LoadAllianceMembers(allianceId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "alliancemembers", [["alliance_id", allianceId]], (response: any): void => {
            onDone(response);
        }, (e: IOErrorEvent): void => {
            onDone(null);
        });
    }

    public static RequestJoin(allianceId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "requestjoin", [["alliance_id", allianceId]], (response: any): void => {
            onDone(response);
        }, (e: IOErrorEvent): void => {
            onDone(null);
        });
    }

    /**
     * Clears the rows checked in the Invites tab.
     *
     * @param {String} inviteIds - Comma-separated invite ids, as the original sent them.
     * @param {Function} onDone - Receives the server response.
     */
    public static DeleteMessages(inviteIds: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "deletemessages", [["invite_ids", inviteIds]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateMessages();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
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
    public static KickMember(userId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "kickmember", [["userid", userId]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateMyAlliance();
                ALLIANCES.InvalidateMembers();
                ALLIANCES.InvalidateSuggested();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
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
    public static PromoteMember(userId: int, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "promotemember", [["userid", userId]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES._isLeader = false;
                ALLIANCES.InvalidateMyAlliance();
                ALLIANCES.InvalidateMembers();
            }
            onDone(response);
        }, (e: IOErrorEvent): void => {
            onDone(null);
        });
    }

    // ---- Inferno-only: the redesigned window (the header, Board, Outposts, officers)
    /** The player's role in their alliance: "leader", "officer" or "member" ("" before it has loaded). */
    public static ioRole(): string {
        if (ALLIANCES._isLeader) {
            return "leader";
        }
        return (ALLIANCES._myAllianceData && ALLIANCES._myAllianceData.my_role) ? String(ALLIANCES._myAllianceData.my_role) : "";
    }

    /** The leader or an officer: they can pin, invite, recruit and kick. */
    public static ioIsStaff(): boolean {
        return ALLIANCES._isLeader || ALLIANCES.ioRole() == "officer";
    }

    /** Pins put up since the player last opened the Board (the tab's count). */
    public static ioUnreadPins(): int {
        return ALLIANCES._myAllianceData ? ALLIANCES._myAllianceData.unread_pins | 0 : 0;
    }

    /** The Board was opened: its count clears without another request. */
    public static ioClearUnreadPins(): void {
        if (ALLIANCES._myAllianceData) {
            ALLIANCES._myAllianceData.unread_pins = 0;
        }
    }

    /** The world the player's yard is on (pins and outposts jump only to places on it). */
    public static ioMyWorld(): string {
        return (ALLIANCES._myAllianceData && ALLIANCES._myAllianceData.my_world) ? String(ALLIANCES._myAllianceData.my_world) : "";
    }

    /** The cached alliance (header and Overview), or null. */
    public static ioData(): any {
        return ALLIANCES._myAllianceData;
    }

    /** A request of the Board, Outposts or officers; `onDone` gets the response, or null when it failed. */
    private static ioCall(path: string, vars: any[], onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + path, vars && vars.length ? vars : [["v", "1"]], (response: any): void => {
            if (onDone != null) {
                onDone(response);
            }
        }, (e: IOErrorEvent): void => {
            if (onDone != null) {
                onDone(null);
            }
        });
    }

    /** The board's pins; `seen`: the Board tab is showing them (its count clears). */
    public static ioLoadPins(seen: boolean, onDone: Function): void {
        ALLIANCES.ioCall("pins", [["seen", seen ? "1" : "0"]], onDone);
    }

    /** Pins (no id) or changes a pin: { id?, title, body, x?, y?, world? }. */
    public static ioSavePin(pin: any, onDone: Function): void {
        let vars: any[] = [["title", String(pin.title || "")], ["body", String(pin.body || "")]];
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
        ALLIANCES.ioCall("savepin", vars, (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateMyAlliance();
            }
            onDone(response);
        });
    }

    public static ioDeletePin(id: int, onDone: Function): void {
        ALLIANCES.ioCall("deletepin", [["id", String(id)]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateMyAlliance();
            }
            onDone(response);
        });
    }

    public static ioMovePin(id: int, dir: string, onDone: Function): void {
        ALLIANCES.ioCall("movepin", [["id", String(id)], ["dir", dir]], onDone);
    }

    /** A page of the outposts gained and lost: filters { kind, source, member, world }, `before` the last id shown. */
    public static ioLoadOutposts(filters: any, before: int, onDone: Function): void {
        let vars: any[] = [];
        for (const $value of as3.values(["kind", "source", "member", "world"])) {
            let k: string = as3.str($value);
            if (filters && filters[k]) {
                vars.push([k, String(filters[k])]);
            }
        }
        if (before > 0) {
            vars.push(["before", String(before)]);
        }
        ALLIANCES.ioCall("outposts", vars, onDone);
    }

    /** The leader names a member an officer (or stops). */
    public static ioSetOfficer(userId: int, on: boolean, onDone: Function): void {
        ALLIANCES.ioCall("setofficer", [["userid", userId], ["on", on ? "1" : "0"]], (response: any): void => {
            if (response != null && !response.error) {
                ALLIANCES.InvalidateMembers();
            }
            onDone(response);
        });
    }

    /** A new pin was said in Alliance chat: the window's Board count (if it is open) catches up. */
    public static ioPinsChanged(): void {
        ALLIANCES.InvalidateMyAlliance();
        if (ALLIANCEWINDOW._open) {
            ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
        }
    }

    public static Setup(param1: int = 0): void {
        ALLIANCES._alliances = new Object();
        if (param1 > 0) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                ALLIANCES._allianceID = param1;
                ACHIEVEMENTS.Check("alliance", 1, true);
            }
        }
    }

    public static Clear(): void {
        if (ALLIANCES._alliances) {
            ALLIANCES._alliances = null;
        }
        ALLIANCES._alliances = new Object();
        if (ALLIANCES._myAlliance) {
            ALLIANCES._myAlliance = null;
        }
        ALLIANCES._isLeader = false;
        ALLIANCES.InvalidateMyAlliance();
        ALLIANCES.InvalidateMessages();
        ALLIANCES.InvalidateMembers();
        ALLIANCES.InvalidateSuggested();
    }

    public static SetCellAlliance(param1: MapRoomCell, param2: boolean = false): AllyInfo {
        let _loc3_: AllyInfo = null;
        let _loc4_: int = 0;
        if (Boolean(param1.allianceID) && param1.allianceID != 0) {
            _loc4_ = param1.allianceID;
            if (ALLIANCES._alliances[_loc4_]) {
                _loc3_ = as3.cast(ALLIANCES._alliances[_loc4_], AllyInfo);
                param1.alliance = _loc3_;
            }
            if (ALLIANCES._allianceID && ALLIANCES._allianceID != 0 && Boolean(_loc3_)) {
                _loc3_.Relations(ALLIANCES._allianceID);
            }
            return _loc3_;
        }
        return null;
    }

    /**
     * Inferno-only (the world map, IoMapLod): how the player stands with an alliance. 4 your own
     * alliance, -1 hostile, 1 friendly, 0 neutral; -99 no alliance at all.
     */
    public static ioRelation(allianceID: int): int {
        let info: AllyInfo = null;
        if (!allianceID) {
            return -99;
        }
        if (ALLIANCES._allianceID && allianceID == ALLIANCES._allianceID) {
            return 4;
        }
        info = ALLIANCES._alliances ? as3.as(ALLIANCES._alliances[allianceID], AllyInfo) : null;
        if (!info || !ALLIANCES._allianceID) {
            return 0;
        }
        info.Relations(ALLIANCES._allianceID);
        if (info.relationship < 0) {
            return -1;
        }
        return info.relationship > 0 && info.relationship < 4 ? 1 : 0;
    }

    public static SetAlliance(param1: any): AllyInfo {
        let _loc2_: AllyInfo = null;
        let _loc3_: int = param1.alliance_id | 0;
        if (ALLIANCES._alliances[param1.alliance_id]) {
            _loc2_ = as3.cast(ALLIANCES._alliances[_loc3_], AllyInfo);
        } else {
            _loc2_ = new AllyInfo(param1);
        }
        if (ALLIANCES._allianceID && ALLIANCES._allianceID != 0 && _loc2_ && !_loc2_.relationship) {
            _loc2_.Relations(ALLIANCES._allianceID);
        }
        return _loc2_;
    }

    public static ProcessAlliances(param1: any[]): void {
        let _loc3_: any = null;
        let _loc4_: AllyInfo = null;
        let _loc2_: int = 0;
        while (_loc2_ < param1.length) {
            _loc3_ = param1[_loc2_];
            _loc4_ = new AllyInfo(_loc3_);
            ALLIANCES._alliances[_loc3_.alliance_id] = _loc4_;
            _loc2_++;
        }
    }

    public static AllianceInvite(param1: int): void {
        let r: URLLoaderApi = null;
        let alliancevars: any[] = null;
        let onAllianceInviteSuccess: Function = null;
        let onAllianceInviteFail: Function = null;
        let _userId: int = param1;
        onAllianceInviteSuccess = (param1: any): void => {
            PLEASEWAIT.Hide();
            if (param1 != null && !param1.error) {
                GLOBAL.Message(KEYS.Get("msg_allianceinvitesent"));
                return;
            }
            if (param1 && param1.error) {
                GLOBAL.Message(String(param1.error));
            } else {
                GLOBAL.Message(KEYS.Get("msg_err_processinginvite_short"));
            }
        };
        onAllianceInviteFail = (param1: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("msg_err_sendinginvite"));
        };
        if (!ALLIANCES._myAlliance) {
            GLOBAL.Message(KEYS.Get("msg_notinalliance"));
            return;
        }
        r = new URLLoaderApi();
        alliancevars = [["userid", _userId]];
        r.load(GLOBAL._allianceURL + "inviteuser", alliancevars, onAllianceInviteSuccess, onAllianceInviteFail);
    }

    public static AlliancesServerUpdate(param1: string): void {
        if (ALLIANCES._open) {
            if (!GLOBAL._local) {
                POPUPS.RemoveBG();
            }
            ALLIANCES._open = false;
        }
        if (BASE._userID == LOGIN._playerID) {
            BASE.Page();
        } else {
            BASE.Page();
        }
    }

    public static AlliancesViewLeader(param1: string): void {
    }
}
