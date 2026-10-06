import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BitmapData, DisplayObjectContainer, Sprite, StageDisplayState } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { Point } from "flash/geom";
import { Dictionary, Timer, setTimeout } from "flash/utils";
import { ALLIANCES, BASE, CREATURES, Chat, EnumYardType, FriendPicker, GLOBAL, IMapRoom, IMapRoomCell, IoMapShare, IoMapSnapshot, IoQuests, IoUnderworld, KEYS, LOGGER, MAILBOX, MailBox, MapRoomCell, MapRoomManager, MapRoomPopup, PLEASEWAIT, POPUPS, PopupRelocateMe, SOUNDS, SecNum, Smoke, Thread, Tutorial, UI2, UI_BOTTOM, URLLoaderApi, bubble_acceptInvite, bubble_selecttarget, objZone } from "@game";

export class MapRoom extends ASObject implements IMapRoom {
    static {
        as3.implement(this, [IMapRoom]);
    }

    public static _homePoint: Point = null;

    /** Inferno-only (Outposts list, Map): where the map opens next time, instead of home. Used once. */
    public static ioFocus: Point = null;

    /** Inferno-only: a place to mark when the map opens (one opened from chat). Used once. */
    public static ioMark: Point = null;

    private static _zoneWidth: int = 10;

    private static _zoneHeight: int = 10;

    public static _mapWidth: int = 100;

    public static _mapHeight: int = 100;

    public static _mc: MapRoomPopup = null;

    public static _bookmarks: any[] = [];

    public static _currentPosition: Point = null;

    public static _open: boolean = false;

    public static _monsterTransferInProgress: boolean = false;

    public static _resourceTransferInProgress: boolean = false;

    public static _homeCell: MapRoomCell = null;

    private static _resourceTransfer: any = {};

    public static _monsterTransfer: any = {};

    public static _pendingTransferRequest: boolean = false;

    private static _bookmarkData: any = {};

    private static _saveErrors: int = 0;

    private static _zones: any = {};

    private static _bubbleSelectTarget: bubble_selecttarget = null;

    private static _monsterSource: MapRoomCell = null;

    private static _monsterSourceRef: MapRoomCell = null;

    private static _monsterTargetRef: MapRoomCell = null;

    private static _requestedZones: any[] = null;

    private static _showEnemyWait: boolean = false;

    private static _resourceCounter: int = 0;

    private static _monstersTransferred: int = 0;

    private static _allMonstersTransferred: boolean = false;

    public static _flingerInRange: boolean = false;

    private static _worldID: int = 0;

    // Base ids are larger than an int holds; an int wrapped them to another base's id.
    public static _inviteBaseID: number = 0;

    public static _inviteLocation: Point = new Point();

    public static _viewOnly: boolean = false;

    private static _bubbleAcceptInvite: bubble_acceptInvite = null;

    private static _migrateThread: Thread = null;

    private static _reposition: boolean = false;

    private static _popupRelocateMe: PopupRelocateMe = null;

    /** Inferno-only: whether accepting the open invite moves to another world (set by the server check). */
    public static _inviteCrossWorld: boolean = true;

    private static _empiredestroyed: boolean = false;

    private static _showAttackWait: boolean = false;

    private static _pendingMapCellDataRequests: any[] = [];

    private static _priorityMapCellsToRequest: any[] = [];

    public static _smokeBMD: BitmapData = null;

    public static _smokeParticles: any[] = null;

    public static _frame: int = 0;

    /** A bookmarks save is on its way; another change waits for it (saves arriving out of order lost changes). */
    private static _ioBookmarkSaving: boolean = false;

    private static _ioBookmarkDirty: boolean = false;

    /** How many zones at the front of the queue the request on its way is for (0: none on its way). */
    private static _ioInFlight: int = 0;

    /** The most zones asked for in one getarea request (the server takes up to 16). */
    private static readonly IO_BATCH_ZONES: int = 12;

    /** A cell clicked while it only had the snapshot's data: clicked again once its zone has arrived. */
    private static _ioPendingClick: Point = null;

    private static _ioPendingClickAt: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** Admin test mode: cells changed on the server (taken, made wild) are fetched again. */
    public static ioClearCells(): void {
        MapRoom.ClearCells();
    }

    public static get homeCell(): IMapRoomCell {
        return MapRoom._homeCell;
    }

    public static set migrateThread(param1: Thread) {
        MapRoom._migrateThread = param1;
    }

    public static set inviteBaseID(param1: number) {
        MapRoom._inviteBaseID = param1;
    }

    public static set showAttackWait(param1: boolean) {
        MapRoom._showAttackWait = param1;
    }

    public static set showEnemyWait(param1: boolean) {
        MapRoom._showEnemyWait = param1;
    }

    public static set empireDestroyed(param1: boolean) {
        MapRoom._empiredestroyed = param1;
    }

    public static _Setup(param1: Point, param2: int = 0, param3: number = 0, param4: boolean = false, param5: Thread = null): void {
        MapRoom._homePoint = param1;
        MapRoom._worldID = param2;
        MapRoom._inviteBaseID = param3;
        MapRoom._viewOnly = param4;
        if (MapRoom._viewOnly) {
            MapRoom._inviteLocation = new Point(param1.x, param1.y);
            if (param5) {
                MapRoom._migrateThread = param5;
            }
        } else {
            MapRoom._migrateThread = param5;
        }
        MapRoom._bubbleSelectTarget = new bubble_selecttarget();
        MapRoom._bubbleSelectTarget.tDesc.htmlText = "<b>" + KEYS.Get("bubble_selecttarget_desc") + "</b>";
        MapRoom._bubbleSelectTarget.bCancel.SetupKey("btn_cancel");
        MapRoom._bubbleSelectTarget.bCancel.addEventListener(MouseEvent.CLICK, MapRoom.TransferCancel);
        MapRoom._bubbleSelectTarget.x = 270;
        MapRoom._bubbleSelectTarget.y = 415;
        MapRoom._saveErrors = 0;
        MapRoom._showEnemyWait = false;
        MapRoom._showAttackWait = false;
        MapRoom._requestedZones = [];
        FriendPicker.ClearContacts();
    }

    public static HideFromViewOnly(): void {
        if (MapRoom._open && GLOBAL.mode != GLOBAL.e_BASE_MODE.ATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK) {
            SOUNDS.Play("close");
            MapRoom._worldID = 0;
            MapRoom._inviteBaseID = 0;
            MapRoom._viewOnly = false;
            GLOBAL._currentCell = null;
            MapRoom._Setup(GLOBAL._mapHome);
            if (MapRoom._mc.parent) {
                MapRoom._mc.parent.removeChild(MapRoom._mc);
            }
            MapRoom.ClearCells();
            MapRoom._mc.Cleanup();
            MapRoom._mc = null;
        }
        MapRoom._open = false;
    }

    public static ClearCells(): void {
        MapRoom._zones = {};
    }

    public static JumpTo(param1: Point): void {
        if (MapRoom._mc.parent) {
            MapRoom._mc.JumpTo(param1);
        }
    }

    public static SetPendingInvitation(): void {
        MapRoom._mc._popupInfoMine.PendingInvite();
    }

    public static PreAcceptInvitation(param1: DisplayObjectContainer): void {
        // Inferno-only invites are between alliance members, so being in an alliance is expected.
        if (ALLIANCES._myAlliance && !GLOBAL.INFERNO_ONLY) {
            GLOBAL.Message(KEYS.Get("msg_mustleavealliance"));
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            MapRoom.ioCheckInvitation(param1);
            return;
        }
        MapRoom.openRelocateForInvite(param1);
    }

    private static openRelocateForInvite(param1: DisplayObjectContainer): void {
        MapRoom._popupRelocateMe = new PopupRelocateMe();
        MapRoom._popupRelocateMe.Setup(null, "invite");
        if (param1) {
            GLOBAL.BlockerAdd(as3.as(param1, Sprite));
            param1.addChild(MapRoom._popupRelocateMe);
        }
    }

    /**
     * Inferno-only: before the price popup, the server says whether the invite is still good and
     * whether accepting it moves the player to another world. Only then are their outposts given up,
     * so only then are they warned (and asked to confirm) first. Within one world they keep them.
     */
    private static ioCheckInvitation(param1: DisplayObjectContainer): void {
        let container: DisplayObjectContainer = null;
        container = param1;
        if (!MapRoom._migrateThread || MapRoom._inviteBaseID == 0) {
            return;
        }
        new URLLoaderApi().load(GLOBAL._baseURL + "migratecheck", [["baseid", MapRoom._inviteBaseID], ["threadid", MapRoom._migrateThread.data.threadid]], (serverData: any): void => {
            let count: int = 0;
            let warning: string = null;
            if (!serverData || serverData.error != 0) {
                GLOBAL.Message(serverData && serverData.error ? String(serverData.error) : "This invitation could not be checked. Please try again.");
                return;
            }
            MapRoom._inviteCrossWorld = (serverData.crossWorld | 0) == 1;
            if (!MapRoom._inviteCrossWorld) {
                MapRoom.openRelocateForInvite(container);
                return;
            }
            count = serverData.outposts | 0;
            warning = "<b>This outpost is in a different world.</b><br><br>Moving there means leaving your current world: " + (count > 0 ? "you will lose <b>all " + count + " of your outpost" + (count == 1 ? "" : "s") + "</b> and start the new world with just your main yard." : "you will start the new world with just your main yard.") + "<br><br>Do you still want to move?";
            GLOBAL.Message(warning, "Move anyway", (): void => {
                MapRoom.openRelocateForInvite(container);
            });
        }, (e: Event): void => {
            GLOBAL.Message("This invitation could not be checked. Please try again.");
        });
    }

    /**
     * Pinch to zoom (IoPinchZoom): when the world map is open, zoom it one step. Returns false when the
     * map is not open, so the pinch goes to the yard instead.
     */
    public static ioPinch(param1: boolean, param2: number = NaN, param3: number = NaN): boolean {
        if (!MapRoom._open || !MapRoom._mc) {
            return false;
        }
        MapRoom._mc.ioPinchZoom(param1, param2, param3);
        return true;
    }

    public static AcceptInvitation(param1: boolean = false): void {
        let handleAcceptSuccessful: Function = null;
        let handleAcceptError: Function = null;
        let url: string = null;
        let loadvars: any[] = null;
        let SHINYCOST: SecNum = null;
        let RESOURCECOST: SecNum = null;
        let useShiny: boolean = param1;
        if (ALLIANCES._myAlliance && !GLOBAL.INFERNO_ONLY) {
            GLOBAL.Message(KEYS.Get("msg_mustleavealliance"));
            return;
        }
        if (Boolean(MapRoom._migrateThread) && MapRoom._inviteBaseID != 0) {
            handleAcceptSuccessful = (param1: any): void => {
                PLEASEWAIT.Hide();
                if (param1.error == 0) {
                    if (param1.cantMoveTill) {
                        if (MapRoom._open) {
                            GLOBAL.Message(KEYS.Get("movebase_warning", { "v1": GLOBAL.ToTime((param1.cantMoveTill - param1.currenttime) | 0) }), KEYS.Get("btn_returnhome"), MapRoom.ReturnFromFailedInvite);
                        } else {
                            GLOBAL.Message(KEYS.Get("movebase_warning", { "v1": GLOBAL.ToTime((param1.cantMoveTill - param1.currenttime) | 0) }));
                            GLOBAL.BlockerRemove();
                        }
                    } else {
                        if (param1.coords && param1.coords.length == 2 && param1.coords[0] > -1 && param1.coords[1] > -1) {
                            GLOBAL._mapHome = new Point(param1.coords[0], param1.coords[1]);
                            MapRoom._Setup(GLOBAL._mapHome);
                        }
                        // Inferno-only: bookmarks are places on this map; they only go when the move
                        // leaves it for another world (the server clears them then too: leaveWorld).
                        if (!GLOBAL.INFERNO_ONLY || MapRoom._inviteCrossWorld) {
                            MapRoomManager.instance.BookmarksClear();
                        }
                        BASE._loadedFriendlyBaseID = 0;
                        GLOBAL._homeBaseID = 0;
                        GLOBAL._currentCell = null;
                        GLOBAL._mapOutpost = [];
                        if (MapRoom._open) {
                            MapRoomManager.instance.Hide();
                        }
                        MapRoom.ClearCells();
                        MapRoom._Setup(GLOBAL._mapHome);
                        MapRoom._reposition = true;
                        GLOBAL._showMapWaiting = 1;
                    }
                } else {
                    GLOBAL.Message(as3.str(param1.error));
                }
            };
            handleAcceptError = (param1: IOErrorEvent): void => {
                LOGGER.Log("err", "MapRoom.AcceptInvitation HTTP");
            };
            url = GLOBAL._baseURL + "migratetofriend";
            loadvars = [["baseid", MapRoom._inviteBaseID], ["threadid", MapRoom._migrateThread.data.threadid]];
            // The price the relocate popup shows (and the server charges).
            SHINYCOST = new SecNum(GLOBAL.ioPrice("move_main", 1200));
            // 30M of each resource on inferno-only servers (server: relocateInvites.ts INVITE_RESOURCE_COST).
            RESOURCECOST = new SecNum(GLOBAL.INFERNO_ONLY ? 30000000 : 10000000);
            if (MapRoom._popupRelocateMe) {
                MapRoom._popupRelocateMe.Cleanup();
                MapRoom._popupRelocateMe.Hide();
                MapRoom._popupRelocateMe = null;
            }
            if (useShiny) {
                if (GLOBAL._credits.Get() < SHINYCOST.Get()) {
                    POPUPS.DisplayGetShiny();
                    return;
                }
                if (!GLOBAL.ioConfirmShiny(SHINYCOST.Get() | 0, "to move your main yard to this outpost", (): void => {
                    MapRoom.AcceptInvitation(true);
                })) {
                    return;
                }
                loadvars.push(["shiny", SHINYCOST.Get()]);
            } else {
                if (GLOBAL._resources.r1.Get() < RESOURCECOST.Get() || GLOBAL._resources.r2.Get() < RESOURCECOST.Get() || GLOBAL._resources.r3.Get() < RESOURCECOST.Get() || GLOBAL._resources.r4.Get() < RESOURCECOST.Get()) {
                    GLOBAL.Message(KEYS.Get("map_rel_res"));
                    return;
                }
                loadvars.push(["resources", JSON.stringify({ "r1": RESOURCECOST.Get(), "r2": RESOURCECOST.Get(), "r3": RESOURCECOST.Get(), "r4": RESOURCECOST.Get() })]);
            }
            PLEASEWAIT.Show(KEYS.Get("wait_movebase"));
            MailBox.Hide();
            if (MapRoom._migrateThread.parent) {
                if (MapRoom._migrateThread.numChildren > 0) {
                    MapRoom._migrateThread.removeChildAt(1);
                }
                MapRoom._migrateThread.parent.removeChild(MapRoom._migrateThread);
            }
            new URLLoaderApi().load(url, loadvars, handleAcceptSuccessful, handleAcceptError);
        }
    }

    public static ReturnFromFailedInvite(): void {
        MapRoomManager.instance.Hide();
        BASE.Load();
    }

    public static RejectInvitation(param1: MouseEvent = null): void {
        let handleRejectSuccessful: Function = null;
        let handleRejectError: Function = null;
        let url: string = null;
        let loadvars: any[] = null;
        let e: MouseEvent = param1;
        if (Boolean(MapRoom._migrateThread) && MapRoom._inviteBaseID != 0) {
            handleRejectSuccessful = (param1: any): void => {
                PLEASEWAIT.Hide();
                if (param1.error == 0) {
                    GLOBAL._currentCell = null;
                    if (MapRoom._open) {
                        MapRoomManager.instance.Hide();
                        MapRoom.ClearCells();
                        MapRoom._Setup(GLOBAL._mapHome);
                        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
                    } else {
                        MAILBOX.Show();
                    }
                } else {
                    LOGGER.Log("err", "MapRoom.RejectInvitation", Boolean(param1.error));
                }
            };
            handleRejectError = (param1: IOErrorEvent): void => {
                LOGGER.Log("err", "MapRoom.RejectInvitation HTTP");
            };
            PLEASEWAIT.Show(KEYS.Get("wait_rejecting"));
            url = GLOBAL._baseURL + "rejectmigratetofriend";
            loadvars = [["baseid", MapRoom._inviteBaseID], ["threadid", MapRoom._migrateThread.data.threadid]];
            if (MapRoom._migrateThread.parent) {
                if (MapRoom._migrateThread.numChildren > 0) {
                    MapRoom._migrateThread.removeChildAt(1);
                }
                MapRoom._migrateThread.data.Changed();
                MapRoom._migrateThread.parent.removeChild(MapRoom._migrateThread);
                MapRoom._migrateThread = null;
                MAILBOX.Hide();
            }
            new URLLoaderApi().load(url, loadvars, handleRejectSuccessful, handleRejectError);
        }
    }

    public static BookmarkDataGet(param1: string): int {
        let _loc2_: int = 0;
        if (MapRoom._bookmarkData[param1]) {
            _loc2_ = MapRoom._bookmarkData[param1] | 0;
        }
        return _loc2_;
    }

    public static BookmarkDataSet(param1: string, param2: int, param3: boolean = true): void {
        let _loc4_: boolean = false;
        if (!MapRoom._bookmarkData) {
            MapRoom._bookmarkData = {};
        }
        if (param2 == 0 && Boolean(MapRoom._bookmarkData[param1])) {
            delete MapRoom._bookmarkData[param1];
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        } else if (!MapRoom._bookmarkData[param1]) {
            MapRoom._bookmarkData[param1] = param2;
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        } else if (MapRoom._bookmarkData[param1] != param2) {
            MapRoom._bookmarkData[param1] = param2;
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        }
    }

    public static BookmarkDataGetStr(param1: string): string {
        let _loc2_: string = "";
        if (MapRoom._bookmarkData[param1]) {
            _loc2_ = String(MapRoom._bookmarkData[param1]);
        }
        return _loc2_;
    }

    public static BookmarkDataSetStr(param1: string, param2: string, param3: boolean = true): void {
        let _loc4_: boolean = false;
        if (!MapRoom._bookmarkData) {
            MapRoom._bookmarkData = {};
        }
        if (param2.length == 0 && Boolean(MapRoom._bookmarkData[param1])) {
            delete MapRoom._bookmarkData[param1];
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        } else if (!MapRoom._bookmarkData[param1]) {
            MapRoom._bookmarkData[param1] = param2;
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        } else if (MapRoom._bookmarkData[param1] != param2) {
            MapRoom._bookmarkData[param1] = param2;
            if (param3) {
                MapRoom.BookmarksSave();
            }
            _loc4_ = true;
        }
    }

    public static BookmarksSave(): void {
        let done: Function = null;
        let handleBMSaveSuccessful: Function = null;
        let handleBMSaveError: Function = null;
        done = null;
        if (GLOBAL.INFERNO_ONLY) {
            if (MapRoom._ioBookmarkSaving) {
                MapRoom._ioBookmarkDirty = true;
                // sent (as it is then) when this one is answered
                return;
            }
            MapRoom._ioBookmarkSaving = true;
        }
        done = (): void => {
            MapRoom._ioBookmarkSaving = false;
            if (MapRoom._ioBookmarkDirty) {
                MapRoom._ioBookmarkDirty = false;
                MapRoom.BookmarksSave();
            }
        };
        handleBMSaveSuccessful = (param1: any): void => {
            if (param1.error != 0) {
                LOGGER.Log("err", "MapRoom.BookmarksSave", Boolean(param1.error));
            }
            done();
        };
        handleBMSaveError = (param1: IOErrorEvent): void => {
            LOGGER.Log("err", "MapRoom.BookmarksSave HTTP");
            done();
        };
        let url: string = GLOBAL._apiURL + "player/savebookmarks";
        let loadvars: any[] = [["bookmarks", JSON.stringify(MapRoom._bookmarkData)]];
        new URLLoaderApi().load(url, loadvars, handleBMSaveSuccessful, handleBMSaveError);
    }

    /**
     * Inferno-only: the bookmarks have no limit, and can be renamed and removed from the sidebar. The
     * stored form is the stock one (mbms: how many; mbm0, mbm1...: x * 10000 + y; mbmn0...: names), all
     * of it written again after a change.
     */
    public static ioBookmarksWrite(): void {
        let i: int = 0;
        MapRoom._bookmarkData = {};
        while (i < MapRoom._bookmarks.length) {
            MapRoom._bookmarkData["mbm" + i] = (MapRoom._bookmarks[i].location.x | 0) * 10000 + (MapRoom._bookmarks[i].location.y | 0);
            MapRoom._bookmarkData["mbmn" + i] = String(MapRoom._bookmarks[i].name);
            i++;
        }
        if (MapRoom._bookmarks.length > 0) {
            MapRoom._bookmarkData["mbms"] = MapRoom._bookmarks.length;
        }
        MapRoom.BookmarksSave();
    }

    /** Renames a bookmark. Returns "" when done, or why not. */
    public static ioRenameBookmark(index: int, name: string): string {
        name = String(name || "").replace(/^\s+|\s+$/g, "");
        if (index < 0 || index >= MapRoom._bookmarks.length) {
            return "That bookmark is gone.";
        }
        if (name.length == 0) {
            return KEYS.Get("newmap_bm_name");
        }
        if (name.length > 20) {
            return KEYS.Get("newmap_bm_long");
        }
        if (MapRoom._bookmarks[index].name != name) {
            MapRoom._bookmarks[index].name = name;
            MapRoom.ioBookmarksWrite();
        }
        return "";
    }

    public static ioRemoveBookmark(index: int): void {
        if (index >= 0 && index < MapRoom._bookmarks.length) {
            MapRoom._bookmarks.splice(index, 1);
            MapRoom.ioBookmarksWrite();
        }
    }

    /** Adds a bookmark at a place. Returns { hide, message } as AddBookmark does ("SUCCESS" when added). */
    public static ioAddBookmarkAt(cellX: int, cellY: int, name: string): any {
        MapRoom._currentPosition = new Point(cellX, cellY);
        return MapRoom.AddBookmark(name);
    }

    /** The bookmark at a place, or -1. */
    public static ioBookmarkIndex(cellX: int, cellY: int): int {
        let i: int = 0;
        while (i < MapRoom._bookmarks.length) {
            if (MapRoom._bookmarks[i].location.x == cellX && MapRoom._bookmarks[i].location.y == cellY) {
                return i;
            }
            i++;
        }
        return -1;
    }

    public static AddBookmark(param1: string, param2: boolean = true): any {
        let _loc3_: any = null;
        param1 = param1.replace(/^\s+|\s+$/g, "");

        if (param1.length == 0) {
            return { "hide": false, "message": KEYS.Get("newmap_bm_name") };
        }
        if (param1.length > 20) {
            return { "hide": false, "message": KEYS.Get("newmap_bm_long") };
        }
        if (MapRoom._currentPosition.x < 0 || MapRoom._currentPosition.x >= MapRoom._mapWidth || MapRoom._currentPosition.y < 0 || MapRoom._currentPosition.y >= MapRoom._mapHeight) {
            return { "hide": true, "message": "ERROR: Bookmark point is not on the map." };
        }
        if (MapRoom._bookmarks.length >= 8 && !GLOBAL.INFERNO_ONLY) {
            return { "hide": true, "message": KEYS.Get("newmap_bm_full") };
        }
        let _loc5_: int = MapRoom._bookmarks.length | 0;
        let _loc6_: int = 0;
        while (_loc6_ < _loc5_) {
            if (MapRoom._bookmarks[_loc6_].location.x == MapRoom._currentPosition.x && MapRoom._bookmarks[_loc6_].location.y == MapRoom._currentPosition.y) {
                return { "hide": true, "message": KEYS.Get("newmap_bm_done") };
            }
            _loc6_++;
        }
        if (param2) {
            MapRoom.BookmarkDataSet("mbm" + _loc5_, (MapRoom._currentPosition.x * 10000 + MapRoom._currentPosition.y) | 0, false);
            MapRoom.BookmarkDataSetStr("mbmn" + _loc5_, param1, false);
            MapRoom.BookmarkDataSet("mbms", (_loc5_ + 1) | 0);
        }
        MapRoom._bookmarks.push({ "name": param1, "location": MapRoom._currentPosition });
        return { "hide": true, "message": "SUCCESS" };
    }

    private static RequestData(point: Point, hasForce: boolean = false): void {
        let loadvars: any[] = null;
        let dataRequest: any = null;
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        let addRequestToQueue: Function = null;
        let trySendRequest: Function = null;
        let getAreaURL: string = null;
        let requestRetryTimer: Timer = null;
        let z: objZone = null;
        loadvars = null;
        dataRequest = null;
        handleLoadSuccessful = null;
        handleLoadError = null;
        addRequestToQueue = null;
        trySendRequest = null;
        let addRequest: Function = null;
        let zonePoint: Point = point;
        let force: boolean = hasForce;
        // Inferno-only: a zone outside the world (a cell asked for past its edge) is never asked for: the server
        // refused it (bug report #49, getarea x=-320 y=-90)
        // (and the underworld's zone always: an outpost there is loaded from it with the map closed, IoUnderworld)
        if (GLOBAL.INFERNO_ONLY && (!zonePoint || zonePoint.x < 0 || zonePoint.y < 0 || zonePoint.x >= MapRoom._mapWidth || zonePoint.y >= MapRoom._mapHeight) && !IoUnderworld.isUnderZone(zonePoint)) {
            return;
        }
        // Inferno-only: while the map shows the underworld, only its one zone is asked for (IoUnderworld)
        if (GLOBAL.INFERNO_ONLY && IoUnderworld.under && !IoUnderworld.isUnderZone(zonePoint)) {
            return;
        }
        let zoneID: int = (zonePoint.x * 10000 + zonePoint.y) | 0;
        getAreaURL = GLOBAL._mapURL + "getarea";
        let getResources: int = 0;
        requestRetryTimer = null;
        if (force || GLOBAL.Timestamp() > MapRoom._resourceCounter + 20) {
            getResources = 1;
            MapRoom._resourceCounter = GLOBAL.Timestamp();
            force = true;
        }
        if (MapRoom._zones[zoneID]) {
            z = as3.cast(MapRoom._zones[zoneID], objZone);
        } else {
            z = new objZone();
            MapRoom._zones[zoneID] = z;
        }
        // Inferno-only: the world snapshot (IoMapSnapshot) is at most a minute old, so a zone on screen is
        // asked for again after a minute (it was every 30 seconds).
        if (force || GLOBAL.Timestamp() - z.updated > (GLOBAL.INFERNO_ONLY ? 60 : 30)) {
            handleLoadSuccessful = (serverData: any): void => {
                let zoneId: int = 0;
                let resourceIndex: int = 0;
                let allianceData: any[] = null;
                let cell: any = null;
                let area: any = null;
                // (Inferno-only: a request can be for several zones, the front of the queue)
                MapRoom._pendingMapCellDataRequests.splice(0, Math.max(1, MapRoom._ioInFlight));
                MapRoom._ioInFlight = 0;
                if (MapRoom._pendingMapCellDataRequests.length > 0) {
                    trySendRequest();
                }
                if (!MapRoom._open && !BASE._needCurrentCell) {
                    return;
                }
                if (serverData && serverData.io_under) {
                    IoUnderworld.setInfo(serverData.io_under);
                }
                if (serverData && !serverData.error && as3.is(serverData.areas, Array)) {
                    // Several zones: each as if it had come on its own, the map drawn again once.
                    for (area of as3.values(serverData.areas)) {
                        zoneId = (area.x * 10000 + area.y) | 0;
                        if (!MapRoom._zones[zoneId]) {
                            MapRoom._zones[zoneId] = new objZone();
                        }
                        MapRoom._zones[zoneId].data = area.data;
                    }
                    serverData.data = serverData.areas.length > 0 ? serverData.areas[0].data : {};
                    serverData.x = serverData.areas.length > 0 ? serverData.areas[0].x : 0;
                    serverData.y = serverData.areas.length > 0 ? serverData.areas[0].y : 0;
                    if (BASE._needCurrentCell && !MapRoom._open) {
                        // the yard's own cell: in whichever zone it is
                        for (area of as3.values(serverData.areas)) {
                            if (area.data && area.data[BASE._currentCellLoc.x] && area.data[BASE._currentCellLoc.x][BASE._currentCellLoc.y]) {
                                serverData.data = area.data;
                                serverData.x = area.x;
                                serverData.y = area.y;
                            }
                        }
                    }
                }
                if (serverData && !serverData.error && Boolean(serverData.data)) {
                    zoneId = (serverData.x * 10000 + serverData.y) | 0;
                    if (!MapRoom._zones[zoneId]) {
                        MapRoom._zones[zoneId] = new objZone();
                    }
                    MapRoom._zones[zoneId].data = serverData.data;
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
                        allianceData = as3.cast(serverData.alliancedata, Array);
                        ALLIANCES.ProcessAlliances(allianceData);
                    }
                    if (MapRoom._open) {
                        MapRoom._mc.Update(true);
                        MapRoom.ioPendingClickCheck();
                    } else if (BASE._needCurrentCell) {
                        if (MapRoom._zones && MapRoom._zones[zoneId] && Boolean(MapRoom._zones[zoneId].data) && Boolean(MapRoom._zones[zoneId].data[BASE._currentCellLoc.x])) {
                            cell = MapRoom._zones[zoneId].data[BASE._currentCellLoc.x][BASE._currentCellLoc.y];
                            GLOBAL._currentCell = new MapRoomCell();
                            (as3.as(GLOBAL._currentCell, MapRoomCell)).Setup(cell);
                            (as3.as(GLOBAL._currentCell, MapRoomCell)).cellX = BASE._currentCellLoc.x | 0;
                            (as3.as(GLOBAL._currentCell, MapRoomCell)).cellY = BASE._currentCellLoc.y | 0;
                            MapRoom._zones = {};
                        }
                    }
                } else if (Boolean(serverData) && !serverData.data) {
                    LOGGER.Log("err", "MapRoom.Data NO DATA");
                } else {
                    LOGGER.Log("err", "MapRoom.Data", Boolean(serverData.error));
                }
            };
            handleLoadError = (param1: IOErrorEvent): void => {
                let failed: any[] = null;
                let request: any = null;
                let failedZone: int = 0;
                ++MapRoom._saveErrors;
                if (MapRoom._saveErrors >= 3) {
                    LOGGER.Log("err", "MapRoom.RequestData HTTP");
                    GLOBAL.ErrorMessage("WorldMapRoom.RequestData HTTP");
                }
                if (GLOBAL.INFERNO_ONLY) {
                    // The failed request left the queue stuck at its front: nothing was asked for again
                    // until the map was closed. Its zones are asked for again on the map's next pass.
                    failed = as3.cast(MapRoom._pendingMapCellDataRequests.splice(0, Math.max(1, MapRoom._ioInFlight)), Array);
                    MapRoom._ioInFlight = 0;
                    for (request of as3.values(failed)) {
                        failedZone = ((request.loadvars[0][1] | 0) * 10000 + (request.loadvars[1][1] | 0)) | 0;
                        if (MapRoom._zones[failedZone]) {
                            as3.cast(MapRoom._zones[failedZone], objZone).updated = 0;
                        }
                    }
                    if (MapRoom._pendingMapCellDataRequests.length > 0) {
                        if (!requestRetryTimer) {
                            requestRetryTimer = new Timer(1000, 1);
                            requestRetryTimer.addEventListener(TimerEvent.TIMER, trySendRequest);
                        }
                        requestRetryTimer.reset();
                        requestRetryTimer.start();
                    }
                }
            };
            trySendRequest = (...rest: any[]): void => {
                if (MapRoom._ioInFlight > 0) {
                    return;
                }
                // add any priority zones to the front of the request queue, so they can be loaded first.
                while (MapRoom._priorityMapCellsToRequest.length > 0) {
                    let point: Point = as3.cast(MapRoom._priorityMapCellsToRequest[0], Point);
                    let pendingIndex: int = MapRoom.GetPendingZoneRequestIndex(point.x | 0, point.y | 0);
                    let pendingRequest: any = null;
                    if (pendingIndex == -1) {
                        addRequestToQueue(point, 0, true);
                    } else if (pendingIndex > 0) {
                        // moving existing request
                        pendingRequest = MapRoom._pendingMapCellDataRequests[pendingIndex].loadvars;
                        MapRoom._pendingMapCellDataRequests.splice(pendingIndex, 1);
                        addRequestToQueue(point, pendingRequest[4][1], true);
                    }
                    MapRoom._priorityMapCellsToRequest.shift();
                }
                // sending getarea request to server. if the zone has a cell undergoing a monster transfer, wait until it is finished first.
                let getCellData: any = MapRoom._pendingMapCellDataRequests[0];
                let sendVars: any[] = null;
                if (!getCellData) {
                    return;
                }
                if (!MapRoom.ZoneHasPendingTransferRequest((getCellData.loadvars[0][1] * 10000 + getCellData.loadvars[1][1]) | 0)) {
                    if (requestRetryTimer) {
                        requestRetryTimer.stop();
                        requestRetryTimer.removeEventListener(TimerEvent.TIMER, trySendRequest);
                        requestRetryTimer = null;
                    }
                    sendVars = as3.cast(GLOBAL.INFERNO_ONLY ? MapRoom.ioBatch() : getCellData.loadvars, Array);
                    if (!GLOBAL.INFERNO_ONLY) {
                        MapRoom._ioInFlight = 1;
                    }
                    new URLLoaderApi().load(as3.str(getCellData.url), sendVars, handleLoadSuccessful, handleLoadError);
                } else {
                    if (!requestRetryTimer) {
                        requestRetryTimer = new Timer(200, 1);
                        requestRetryTimer.addEventListener(TimerEvent.TIMER, trySendRequest);
                    }
                    requestRetryTimer.reset();
                    requestRetryTimer.start();
                }
            };
            addRequestToQueue = (point: Point, resources: int, addToFront: boolean = false): void => {
                loadvars = [["x", point.x | 0], ["y", point.y | 0], ["width", MapRoom._zoneWidth], ["height", MapRoom._zoneHeight], ["sendresources", resources]];
                if (MapRoom._viewOnly) {
                    loadvars.push(["worldid", MapRoom._worldID]);
                }
                dataRequest = { "url": getAreaURL, "loadvars": loadvars };
                if (addToFront) {
                    MapRoom._pendingMapCellDataRequests.unshift(dataRequest);
                } else {
                    MapRoom._pendingMapCellDataRequests.push(dataRequest);
                }
            };
            z.updated = (GLOBAL.Timestamp() + ((Math.random() * 10) | 0)) | 0;
            MapRoom._saveErrors = 0;
            addRequestToQueue(zonePoint, getResources);
            if (MapRoom._pendingMapCellDataRequests.length == 1) {
                if (GLOBAL.INFERNO_ONLY) {
                    // At the end of this frame: the zones the map asks for in the same pass go together.
                    setTimeout(trySendRequest, 0);
                } else {
                    trySendRequest();
                }
            }
        }
    }

    /**
     * Inferno-only: the zones waiting at the front of the queue, up to IO_BATCH_ZONES, in one getarea
     * request (`zones=x,y;x,y;...`; the server answers `areas`). The game asked for one zone at a time and
     * waited for each answer, so the map filled in one round trip per zone. A zone with a monster transfer
     * on its way ends the run (it waits, as before). Returns the request's variables; _ioInFlight says how
     * many queue entries it covers.
     */
    private static ioBatch(): any[] {
        let first: any = MapRoom._pendingMapCellDataRequests[0];
        let vars: any[] = (as3.as(first.loadvars, Array)).concat();
        let zones: any[] = [];
        let resources: int = 0;
        let i: int = 0;
        let request: any = null;
        while (i < MapRoom._pendingMapCellDataRequests.length && zones.length < MapRoom.IO_BATCH_ZONES) {
            request = MapRoom._pendingMapCellDataRequests[i];
            if (i > 0 && MapRoom.ZoneHasPendingTransferRequest(((request.loadvars[0][1] | 0) * 10000 + (request.loadvars[1][1] | 0)) | 0)) {
                break;
            }
            zones.push((request.loadvars[0][1] | 0) + "," + (request.loadvars[1][1] | 0));
            resources = Math.max(resources, request.loadvars[4][1] | 0) | 0;
            i++;
        }
        MapRoom._ioInFlight = zones.length;
        vars[4] = ["sendresources", resources];
        if (zones.length > 1) {
            vars.push(["zones", zones.join(";")]);
        }
        return vars;
    }

    public static GetCell(cellX: int, cellY: int, param3: boolean = false): any {
        if (GLOBAL.INFERNO_ONLY && IoUnderworld.isVoid(cellX, cellY)) {
            return IoUnderworld.voidCell;
        }
        let zone: any = MapRoom.GetCellZone(cellX, cellY);
        MapRoom.RequestData(as3.cast(zone.point, Point), param3);
        if (MapRoom._zones && MapRoom._zones[zone.id] && Boolean(MapRoom._zones[zone.id].data) && Boolean(MapRoom._zones[zone.id].data[cellX])) {
            return MapRoom._zones[zone.id].data[cellX][cellY];
        }
        // Inferno-only: until getarea answers for the zone, the world snapshot's cell (io_snap: 1).
        return IoMapSnapshot.CellAt(cellX, cellY);
    }

    /** The cell as getarea sent it, or null: never the snapshot's (for what needs monsters or resources). */
    public static GetZoneCell(cellX: int, cellY: int): any {
        let zone: any = MapRoom.GetCellZone(cellX, cellY);
        MapRoom.RequestData(as3.cast(zone.point, Point));
        if (MapRoom._zones && MapRoom._zones[zone.id] && Boolean(MapRoom._zones[zone.id].data) && Boolean(MapRoom._zones[zone.id].data[cellX])) {
            return MapRoom._zones[zone.id].data[cellX][cellY];
        }
        return null;
    }

    /**
     * Inferno-only: a cell's zone data, asked for when missing: {loaded: its zone has arrived, data: the cell
     * as getarea sent it, or null}. (A cell outside the world counts as loaded, with no data.)
     */
    public static ioZoneCell(cellX: int, cellY: int): any {
        let zone: any = MapRoom.GetCellZone(cellX, cellY);
        if (zone.point.x < 0 || zone.point.y < 0 || zone.point.x >= MapRoom._mapWidth || zone.point.y >= MapRoom._mapHeight || IoUnderworld.isVoid(cellX, cellY)) {
            return { "loaded": true, "data": null };
        }
        MapRoom.RequestData(as3.cast(zone.point, Point));
        let z: any = MapRoom._zones ? MapRoom._zones[zone.id] : null;
        if (!z || !z.data) {
            return { "loaded": false, "data": null };
        }
        return { "loaded": true, "data": z.data[cellX] ? z.data[cellX][cellY] : null };
    }

    public static ioClickWhenLoaded(cell: MapRoomCell): void {
        let zone: any = MapRoom.GetCellZone(cell.X, cell.Y);
        MapRoom._ioPendingClick = new Point(cell.X, cell.Y);
        MapRoom._ioPendingClickAt = GLOBAL.Timestamp();
        if (MapRoom.GetPendingZoneRequestIndex(cell.X, cell.Y) > 0) {
            MapRoom._priorityMapCellsToRequest.push(zone.point);
        } else if (MapRoom.GetPendingZoneRequestIndex(cell.X, cell.Y) == -1) {
            MapRoom.RequestData(as3.cast(zone.point, Point), true);
        }
    }

    private static ioPendingClickCheck(): void {
        let at: Point = MapRoom._ioPendingClick;
        let cell: MapRoomCell = null;
        if (!at || !MapRoom._mc) {
            return;
        }
        if (GLOBAL.Timestamp() - MapRoom._ioPendingClickAt > 15) {
            MapRoom._ioPendingClick = null;
            // too long ago: the player has moved on
            return;
        }
        cell = MapRoom._mc.ioCellAt(at.x | 0, at.y | 0);
        if (!cell) {
            MapRoom._ioPendingClick = null;
            return;
        }
        if (cell._ioSnap) {
            return;
        }
        MapRoom._ioPendingClick = null;
        cell.ioClick();
    }

    /** A new world snapshot (IoMapSnapshot): cells without getarea data yet and the world map redraw. */
    public static ioSnapshotArrived(): void {
        IoMapShare.CheckPendingWorld();
        if (MapRoom._open && MapRoom._mc && MapRoom._mc.parent) {
            MapRoom._mc.Update(true);
            MapRoom._mc.ioSnapshotChanged();
        }
    }

    public static Update(): void {
        if (MapRoom._open && MapRoom._mc && Boolean(MapRoom._mc.parent)) {
            MapRoom._mc.Update(true);
        }
    }

    public static Cleanup(): void {
    }

    public static TransferMonstersA(cell: MapRoomCell, monsters: any): void {
        let monsterId: string = null;
        MapRoom._monsterTransfer = {};
        let hasMonsters: boolean = false;
        for (monsterId in monsters) {
            MapRoom._monsterTransfer[monsterId] = new SecNum(Number(monsters[monsterId].Get()));
            if (monsters[monsterId].Get() > 0) {
                hasMonsters = true;
            }
        }
        if (hasMonsters) {
            // Preserve map room cell
            // The zone's own data (with the monsters), never the world snapshot's.
            let foundCell: any = MapRoom.GetZoneCell(cell.X, cell.Y);
            if (foundCell) {
                MapRoom._monsterSource = new MapRoomCell();
                MapRoom._monsterSource.Setup(foundCell);
                MapRoom._monsterSource.Cleanup();
                // remove event listeners
                MapRoom._monsterSource.cellX = cell.X;
                MapRoom._monsterSource.cellY = cell.Y;
                MapRoom._monsterSourceRef = cell;
            }
            if (MapRoom._bubbleSelectTarget.parent) {
                MapRoom._bubbleSelectTarget.parent.removeChild(MapRoom._bubbleSelectTarget);
            }
            MapRoom._mc.addChild(MapRoom._bubbleSelectTarget);
            MapRoom._monsterTransferInProgress = true;
        } else {
            MapRoom._monsterTransfer = {};
            MapRoom._monsterTransferInProgress = false;
        }
    }

    public static TransferMonstersB(cell: MapRoomCell): void {
        if (MapRoom._monsterTransferInProgress) {
            if (cell._mine) {
                if (cell._baseID == MapRoom._monsterSource._baseID) {
                    if (MapRoom._bubbleSelectTarget.parent) {
                        MapRoom._bubbleSelectTarget.parent.removeChild(MapRoom._bubbleSelectTarget);
                    }
                    MapRoom._mc.ShowMonstersA(MapRoom._monsterSource, true);
                    return;
                }
                MapRoom._mc.ShowMonstersB(MapRoom._monsterTransfer, cell);
            }
        }
    }

    public static TransferMonstersC(targetCell: MapRoomCell): string {
        let transferSuccessful: Function = null;
        let transferError: Function = null;
        let trySendTransfer: Function = null;
        let finalMonsters: any = null;
        let finalSrcMonsters: any = null;
        let dst: string = null;
        let src: string = null;
        let transferVars: any[] = null;
        let transferRetryTimer: Timer = null;
        let zoneSource: any = null;
        let zoneTarget: any = null;
        let addedToPriority: boolean = false;
        trySendTransfer = null;
        let actualTransfer: any = null;
        finalMonsters = null;
        finalSrcMonsters = null;
        dst = null;
        src = null;
        let spaceRemaining: int = 0;
        let baseUpdateFrom: any[] = null;
        let baseUpdateTo: any[] = null;
        let srcMonsterData: any = null;
        let targetMonsterData: any = null;
        transferVars = null;
        let cost: int = 0;
        transferRetryTimer = null;
        zoneSource = MapRoom.GetCellZone(MapRoom._monsterSource.cellX, MapRoom._monsterSource.cellY);
        MapRoom._monsterTargetRef = targetCell;
        zoneTarget = MapRoom.GetCellZone(MapRoom._monsterTargetRef.cellX, MapRoom._monsterTargetRef.cellY);
        addedToPriority = false;
        if (MapRoom._monsterTransferInProgress) {
            if (MapRoom._monsterTargetRef._mine && MapRoom._monsterSource._mine) {
                PLEASEWAIT.Show(KEYS.Get("wait_processing"));
                MapRoom._mc.HideMonstersB();
                if (MapRoom._monsterTargetRef._monsters && MapRoom._monsterSource && MapRoom._monsterTargetRef._monsterData.space.Get() > 0) {
                    transferSuccessful = (param1: any): void => {
                        PLEASEWAIT.Hide();
                        if (param1.error == 0) {
                            if (MapRoom._allMonstersTransferred) {
                                GLOBAL.Message(KEYS.Get("newmap_tr_done"));
                            } else {
                                GLOBAL.Message(KEYS.Get("newmap_tr_space", { "v1": MapRoom._monstersTransferred }));
                                if (MapRoom._monstersTransferred == 0) {
                                    MapRoom._monsterTransfer = {};
                                    MapRoom._pendingTransferRequest = false;
                                    return;
                                }
                            }
                            // update target cell monsters
                            for (dst in finalMonsters) {
                                if (MapRoom._monsterTargetRef._monsters[dst]) {
                                    MapRoom._monsterTargetRef._monsters[dst].Set(finalMonsters[dst]);
                                    MapRoom._monsterTargetRef._hpMonsters[dst] = finalMonsters[dst];
                                } else {
                                    MapRoom._monsterTargetRef._monsters[dst] = new SecNum(Number(finalMonsters[dst]));
                                    MapRoom._monsterTargetRef._hpMonsters[dst] = finalMonsters[dst];
                                }
                            }
                            // update source cell monsters
                            if (MapRoom._monsterSourceRef.cellX == MapRoom._monsterSource.cellX && MapRoom._monsterSourceRef.cellY == MapRoom._monsterSource.cellY) {
                                // source cell is rendered on map
                                for (src in finalSrcMonsters) {
                                    if (finalSrcMonsters[src] > 0) {
                                        MapRoom._monsterSourceRef._monsters[src].Set(finalSrcMonsters[src]);
                                        MapRoom._monsterSourceRef._hpMonsters[src] = finalSrcMonsters[src];
                                    } else {
                                        delete MapRoom._monsterSourceRef._monsters[src];
                                        delete MapRoom._monsterSourceRef._hpMonsters[src];
                                    }
                                }
                            }
                            // update the cells within their zone data
                            if (MapRoom._zones) {
                                if (MapRoom._zones[zoneSource.id] && MapRoom._zones[zoneSource.id].data) {
                                    MapRoom._zones[zoneSource.id].data[MapRoom._monsterSource.cellX][MapRoom._monsterSource.cellY].m.housed = finalSrcMonsters;
                                } else {
                                    MapRoom._zones[zoneSource.id] = new objZone();
                                }
                                if (MapRoom._zones[zoneTarget.id] && MapRoom._zones[zoneTarget.id].data) {
                                    MapRoom._zones[zoneTarget.id].data[MapRoom._monsterTargetRef.cellX][MapRoom._monsterTargetRef.cellY].m.housed = finalMonsters;
                                } else {
                                    MapRoom._zones[zoneTarget.id] = new objZone();
                                }
                            }
                        } else {
                            GLOBAL.Message(KEYS.Get("msg_err_transfer") + param1.error);
                        }
                        MapRoom._monsterTransfer = {};
                        MapRoom._pendingTransferRequest = false;
                    };
                    transferError = (param1: IOErrorEvent): void => {
                        PLEASEWAIT.Hide();
                        GLOBAL.Message(KEYS.Get("msg_err_transfer") + param1.text);
                        MapRoom._monsterTransfer = {};
                        MapRoom._pendingTransferRequest = false;
                    };
                    actualTransfer = {};
                    finalMonsters = {};
                    finalSrcMonsters = {};
                    spaceRemaining = MapRoom._monsterTargetRef._monsterData.space.Get() | 0;
                    baseUpdateFrom = ["BMU"];
                    baseUpdateTo = ["BMU"];
                    if (MapRoom._bubbleSelectTarget.parent) {
                        MapRoom._bubbleSelectTarget.parent.removeChild(MapRoom._bubbleSelectTarget);
                    }
                    MapRoom._monsterTransferInProgress = false;
                    for (dst in MapRoom._monsterTargetRef._monsters) {
                        finalMonsters[dst] = MapRoom._monsterTargetRef._monsters[dst].Get();
                        spaceRemaining = (spaceRemaining - MapRoom._monsterTargetRef._monsters[dst].Get() * CREATURES.GetProperty(dst, "cStorage")) | 0;
                    }
                    for (src in MapRoom._monsterSource._monsters) {
                        finalSrcMonsters[src] = MapRoom._monsterSource._monsters[src].Get();
                    }
                    MapRoom._monstersTransferred = 0;
                    MapRoom._allMonstersTransferred = true;
                    for (src in MapRoom._monsterTransfer) {
                        if (MapRoom._monsterTransfer[src].Get() > 0) {
                            cost = CREATURES.GetProperty(src, "cStorage") | 0;
                            if (spaceRemaining >= MapRoom._monsterTransfer[src].Get() * cost) {
                                actualTransfer[src] = MapRoom._monsterTransfer[src].Get();
                                MapRoom._monstersTransferred = (MapRoom._monstersTransferred + MapRoom._monsterTransfer[src].Get()) | 0;
                            } else {
                                MapRoom._allMonstersTransferred = false;
                                actualTransfer[src] = (spaceRemaining / cost) | 0;
                                MapRoom._monstersTransferred += (spaceRemaining / cost) | 0;
                            }
                            if (MapRoom._monsterTargetRef._monsters[src]) {
                                finalMonsters[src] = MapRoom._monsterTargetRef._monsters[src].Get() + actualTransfer[src];
                            } else {
                                finalMonsters[src] = actualTransfer[src];
                            }
                            if (MapRoom._monsterSource._monsters[src]) {
                                finalSrcMonsters[src] = MapRoom._monsterSource._monsters[src].Get() - actualTransfer[src];
                            }
                            spaceRemaining = (spaceRemaining - actualTransfer[src] * cost) | 0;
                            baseUpdateFrom.push({ "creatureID": src, "count": actualTransfer[src] });
                            baseUpdateTo.push({ "creatureID": src, "count": -actualTransfer[src] });
                            if (spaceRemaining <= 0) {
                                break;
                            }
                        }
                    }
                    if (!MapRoom._monsterTargetRef.Check()) {
                        LOGGER.Log("err", "BASE.Save:  transfer target Cell " + MapRoom._monsterTargetRef.X + "," + MapRoom._monsterTargetRef.Y + "does not check out before doing monster transfer!  " + JSON.stringify(MapRoom._monsterTargetRef._hpMonsterData));
                    }
                    if (!MapRoom._monsterSource.Check()) {
                        LOGGER.Log("err", "BASE.Save:  transfer source Cell " + MapRoom._monsterSource.X + "," + MapRoom._monsterSource.Y + "does not check out before doing monster transfer!  " + JSON.stringify(MapRoom._monsterSource._hpMonsterData));
                    }
                    srcMonsterData = { "hcount": MapRoom._monsterSource._hpMonsterData.hcount, "overdrivepower": MapRoom._monsterSource._monsterData.overdrivepower.Get(), "hcc": MapRoom._monsterSource._hpMonsterData.hcc, "space": MapRoom._monsterSource._monsterData.space.Get(), "h": MapRoom._monsterSource._hpMonsterData.h, "finishtime": MapRoom._monsterSource._hpMonsterData.finishtime, "overdrivetime": MapRoom._monsterSource._monsterData.overdrivetime.Get(), "housed": finalSrcMonsters, "hid": MapRoom._monsterSource._hpMonsterData.hid, "hstage": MapRoom._monsterSource._hpMonsterData.hstage, "saved": GLOBAL.Timestamp() };
                    targetMonsterData = { "hcount": MapRoom._monsterTargetRef._hpMonsterData.hcount, "overdrivepower": MapRoom._monsterTargetRef._monsterData.overdrivepower.Get(), "hcc": MapRoom._monsterTargetRef._hpMonsterData.hcc, "space": MapRoom._monsterTargetRef._monsterData.space.Get(), "h": MapRoom._monsterTargetRef._hpMonsterData.h, "finishtime": MapRoom._monsterTargetRef._hpMonsterData.finishtime, "overdrivetime": MapRoom._monsterTargetRef._monsterData.overdrivetime.Get(), "housed": finalMonsters, "hid": MapRoom._monsterTargetRef._hpMonsterData.hid, "hstage": MapRoom._monsterTargetRef._hpMonsterData.hstage, "saved": GLOBAL.Timestamp() };
                    transferVars = [["frombaseid", MapRoom._monsterSource._baseID], ["tobaseid", MapRoom._monsterTargetRef._baseID], ["monsters", JSON.stringify([srcMonsterData, targetMonsterData])]];
                    trySendTransfer = (): void => {
                        // send transfer request after any getarea requests containing the source/target cells finish, to ensure the cells are up-to-date.
                        let sourcePendingZoneIdx: int = MapRoom.GetPendingZoneRequestIndex(MapRoom._monsterSource.cellX, MapRoom._monsterSource.cellY);
                        let targetPendingZoneIdx: int = zoneSource.id == zoneTarget.id ? sourcePendingZoneIdx : MapRoom.GetPendingZoneRequestIndex(MapRoom._monsterTargetRef.cellX, MapRoom._monsterTargetRef.cellY);
                        if (sourcePendingZoneIdx == -1 && targetPendingZoneIdx == -1) {
                            if (transferRetryTimer) {
                                transferRetryTimer.stop();
                                transferRetryTimer.removeEventListener(TimerEvent.TIMER, trySendTransfer);
                                transferRetryTimer = null;
                            }
                            MapRoom._pendingTransferRequest = true;
                            new URLLoaderApi().load(GLOBAL._mapURL + "transferassets", transferVars, transferSuccessful, transferError);
                        } else {
                            if (!transferRetryTimer) {
                                transferRetryTimer = new Timer(200, 1);
                                transferRetryTimer.addEventListener(TimerEvent.TIMER, trySendTransfer);
                            }
                            transferRetryTimer.reset();
                            transferRetryTimer.start();
                            if (!addedToPriority) {
                                // mark zones containing the source/target cell to be moved to the front of the _pendingMapCellDataRequests queue
                                if (sourcePendingZoneIdx > 0) {
                                    MapRoom._priorityMapCellsToRequest.push(zoneSource.point);
                                }
                                if (targetPendingZoneIdx > 0 && zoneSource.id != zoneTarget.id) {
                                    MapRoom._priorityMapCellsToRequest.push(zoneTarget.point);
                                }
                                addedToPriority = true;
                            }
                        }
                    };
                    trySendTransfer();
                    return "";
                }
                if (MapRoom._monsterTargetRef._monsterData.space.Get() == 0) {
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

    public static TransferCancel(param1: MouseEvent = null): void {
        if (MapRoom._bubbleSelectTarget.parent) {
            MapRoom._bubbleSelectTarget.parent.removeChild(MapRoom._bubbleSelectTarget);
        }
        MapRoom._resourceTransfer = {};
        MapRoom._monsterTransfer = {};
        MapRoom._resourceTransferInProgress = false;
        MapRoom._monsterTransferInProgress = false;
        MapRoom._pendingTransferRequest = false;
    }

    public static Resize(): void {
        MapRoom._mc.x = 0;
        MapRoom._mc.y = 0;
        MapRoomManager.instance.ResizeHandler();
    }

    public static SmokeAdd(): void {
        if (MapRoom._smokeBMD) {
            return;
        }
        MapRoom.SmokeRemove();
        MapRoom._smokeBMD = new BitmapData(100, 100, true, 16777215);
        MapRoom._smokeParticles = [];
    }

    public static SmokeRemove(): void {
        MapRoom._smokeBMD = null;
    }

    public static SmokeTick(param1: Event = null): void {
        let _loc2_: int = 0;
        let _loc3_: any = null;
        let _loc4_: int = 0;
        let _loc5_: BitmapData = null;
        if (!MapRoom._smokeBMD) {
            return;
        }
        MapRoom._frame += 1;
        if (MapRoom._frame == 1000) {
            MapRoom._frame = 0;
        }
        if (MapRoom._frame % 2 == 0) {
            if (MapRoom._smokeParticles.length < 200) {
                MapRoom._smokeParticles.push({ "position": new Point(2 + Math.random() * 15, 90), "speed": 3 + Math.random(), "wind": 0.6 + Math.random() * 0.4 });
            }
            MapRoom._smokeBMD.fillRect(MapRoom._smokeBMD.rect, 16777215);
            _loc2_ = 0;
            while (_loc2_ < MapRoom._smokeParticles.length) {
                _loc3_ = MapRoom._smokeParticles[_loc2_];
                _loc3_.position.x += _loc3_.wind * 0.4;
                _loc3_.position.y -= _loc3_.speed * 0.2;
                if (_loc3_.speed > 0.1) {
                    _loc3_.speed -= 0.02;
                }
                if ((_loc4_ = (100 - 100 / 4 * _loc3_.speed) | 0) < 60) {
                    _loc4_ = 60;
                }
                _loc5_ = as3.vget(Smoke._smokeParticleBMD, _loc4_);
                MapRoom._smokeBMD.copyPixels(_loc5_, _loc5_.rect, as3.cast(_loc3_.position, Point), null, null, true);
                if (_loc4_ >= 95) {
                    MapRoom._smokeParticles[_loc2_] = { "position": new Point(2 + Math.random() * 15, 90), "speed": 3 + Math.random(), "wind": 0.6 + Math.random() * 0.5 };
                }
                _loc2_++;
            }
        }
    }

    public static GetPendingZoneRequestIndex(cellX: int, cellY: int): int {
        if (MapRoom._pendingMapCellDataRequests.length == 0) {
            return -1;
        }
        let idx: int = -1;
        let req: any = null;
        let cellZone: any = MapRoom.GetCellZone(cellX, cellY);
        for (req of as3.values(MapRoom._pendingMapCellDataRequests)) {
            idx += 1;
            if (req.loadvars) {
                let reqX: int = req.loadvars[0][1] | 0;
                let reqY: int = req.loadvars[1][1] | 0;
                let reqZoneID: int = (reqX * 10000 + reqY) | 0;
                if (reqZoneID == cellZone.id) {
                    return idx;
                }
            }
        }
        return -1;
    }

    public static ZoneHasPendingTransferRequest(zoneId: int): boolean {
        if (!MapRoom._pendingTransferRequest) {
            return false;
        }
        let sourceZoneId: int = 0;
        let targetZoneId: int = 0;
        if (MapRoom._monsterSource) {
            sourceZoneId = MapRoom.GetCellZone(MapRoom._monsterSource.cellX, MapRoom._monsterSource.cellY).id | 0;
        }
        if (MapRoom._monsterTargetRef) {
            targetZoneId = MapRoom.GetCellZone(MapRoom._monsterTargetRef.cellX, MapRoom._monsterTargetRef.cellY).id | 0;
        }
        return (zoneId == sourceZoneId || zoneId == targetZoneId);
    }

    public static GetCellZone(cellX: int, cellY: int): any {
        let zonePoint: Point = new Point(((cellX / MapRoom._zoneWidth) | 0) * MapRoom._zoneWidth, ((cellY / MapRoom._zoneHeight) | 0) * MapRoom._zoneHeight);
        let zoneId: int = (zonePoint.x * 10000 + zonePoint.y) | 0;
        let zone: any = { point: zonePoint, id: zoneId };
        return zone;
    }

    public static ShowInfoEnemy(param1: IMapRoomCell, param2: boolean = false): void {
        MapRoom._mc.ShowInfoEnemy(as3.as(param1, MapRoomCell), param2);
    }

    public static HideInfoMine(): void {
        MapRoom._mc.HideInfoMine();
    }

    public set bookmarkData(param1: any) {
        MapRoom._bookmarkData = param1;
    }

    public set mapWidth(param1: int) {
        MapRoom._mapWidth = param1;
    }

    public set mapHeight(param1: int) {
        MapRoom._mapHeight = param1;
    }

    public get worldID(): int {
        return MapRoom._worldID;
    }

    public set worldID(param1: int) {
        MapRoom._worldID = param1;
    }

    public get isOpen(): boolean {
        return MapRoom._open;
    }

    public get flingerInRange(): boolean {
        return MapRoom._flingerInRange;
    }

    public get viewOnly(): boolean {
        return MapRoom._viewOnly;
    }

    public get playerOwnedCells(): Vector<IMapRoomCell> {
        return null;
    }

    public get allianceDataById(): Dictionary {
        return null;
    }

    public Setup(): void {
        MapRoom._Setup(GLOBAL._mapHome, this.worldID, MapRoom._inviteBaseID, this.viewOnly);
    }

    public ReadyToShow(): boolean {
        return true;
    }

    public ShowDelayed(param1: boolean = false): void {
        if (GLOBAL.mode === GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL.m_mapRoomFunctional = true;
        }
        if (param1 || MapRoom._reposition || (!BASE.isMainYard || GLOBAL._bMap && GLOBAL._bMap._canFunction || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) && (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || !MapRoom._open)) {
            SOUNDS.Play("click1");
            MapRoom._open = true;
            MapRoom._reposition = false;
            if (GLOBAL.INFERNO_ONLY) {
                IoQuests.once("map_open");
            }
            if (MapRoom._mc != null) {
                MapRoom._mc.Cleanup();
                MapRoom._mc = null;
            }
            // Map from the Outposts list: open on that outpost, not on the yard you are in.
            let ioFocused: boolean = MapRoom.ioFocus != null;
            IoMapSnapshot.Request();
            MapRoom._mc = new MapRoomPopup();
            MapRoom._mc.Setup();
            BASE.Cleanup();
            GLOBAL._layerUI.addChild(MapRoom._mc);
            UI2.SetupHUD();
            if (GLOBAL._currentCell) {
                MapRoom.GetCell(GLOBAL._currentCell.cellX, GLOBAL._currentCell.cellY, true);
                if (!ioFocused) {
                    MapRoom._mc.JumpTo(new Point(GLOBAL._currentCell.cellX, GLOBAL._currentCell.cellY));
                }
                if (MapRoom._showEnemyWait) {
                    MapRoom._mc.ShowInfoEnemy(as3.as(GLOBAL._currentCell, MapRoomCell), true);
                    MapRoom._showEnemyWait = false;
                } else if (MapRoom._showAttackWait) {
                    MapRoom._mc.ShowAttack(as3.as(GLOBAL._currentCell, MapRoomCell));
                    MapRoom._showAttackWait = false;
                }
            }
            if (MapRoom._empiredestroyed) {
                GLOBAL.Message(KEYS.Get("empiredestroyed_newbase"));
                MapRoom._empiredestroyed = false;
            }
            if (GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
                if (Chat._bymChat) {
                    Chat._bymChat.show();
                }
                if (UI_BOTTOM._missions) {
                    UI_BOTTOM._missions.visible = true;
                }
            } else {
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

    public Hide(): void {
        if (MapRoom._open) {
            SOUNDS.Play("close");
            if (MapRoom._mc && MapRoom._mc.parent) {
                MapRoom._mc.parent.removeChild(MapRoom._mc);
            }
            MapRoom.ClearCells();
            if (MapRoom._mc) {
                MapRoom._mc.Cleanup();
                MapRoom._mc = null;
            }
        }
        MapRoom._open = false;
    }

    public BookmarksClear(): void {
        MapRoom._bookmarkData = {};
        MapRoom._bookmarks = [];
        MapRoom.BookmarksSave();
    }

    public FindCell(param1: int, param2: int): IMapRoomCell {
        return as3.as(MapRoom.GetCell(param1, param2), IMapRoomCell);
    }

    public LoadCell(param1: int, param2: int, param3: boolean = false): void {
        MapRoom.GetCell(param1, param2, param3);
    }

    public CalculateCellId(param1: int, param2: int): int {
        return (param2 * MapRoom._mapWidth + param1 + 1) | 0;
    }

    public Tick(): void {
        if (MapRoom._open && MapRoom._mc && Boolean(MapRoom._mc.parent)) {
            IoMapSnapshot.Request();
            // when the server's next snapshot is out (every 5 minutes)
            MapRoom._mc.Tick();
        }
        if (MapRoom._open && (!MapRoom._mc || MapRoom._mc && !MapRoom._mc.parent) && BASE._saveCounterA == BASE._saveCounterB) {
            PLEASEWAIT.Hide();
            if (MapRoom._mc) {
                MapRoom._mc.Cleanup();
                MapRoom._mc = null;
            }
            MapRoom._mc = new MapRoomPopup();
            MapRoom._mc.Setup();
            BASE.Cleanup();
            GLOBAL._layerWindows.addChild(MapRoom._mc);
        }
    }

    public TickFast(): void {
    }

    public ResizeHandler(): void {
        if (!MapRoom._viewOnly) {
            MapRoomManager.instance.Hide();
        } else {
            MapRoom.HideFromViewOnly();
        }
        MapRoomManager.instance.ShowDelayed(true);
    }
}
