import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Loader, MovieClip, Shape, Sprite, StageDisplayState } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { URLRequest } from "flash/net";
import { TextField } from "flash/text";
import { getTimer } from "flash/utils";
import { AllyInfo, BASE, BUILDING5, Button_CLIP, CellData, EnumYardType, GLOBAL, ImageCache, InfernoMapTheme, IoMapFiltersPopup, IoMapLod, IoMapMinimap, IoMapShare, IoMapSidebar, IoMapSnapshot, IoMapUi, IoMapZoomControl, IoQuests, IoRelocate, IoUnderworld, KEYS, LOGGER, LOGIN, MapRoomBookmark, MapRoomCell, MapRoomManager, MapRoomPopupJump, MapRoomPopup_CLIP, POWERUPS, PopupAttackA, PopupInfoEnemy, PopupInfoMine, PopupInfoViewOnly, PopupMonstersA, PopupMonstersB, PopupNewBookmark, PopupRelocateMe, SOUNDS, TRIBES, Tutorial, TweenLite, UI_TOP_CLIP, bubblepopup3, bubblepopupBuff, com_monsters_maproom_advanced_MapRoom as MapRoom, frame_CLIP, ui_buffIcon_CLIP } from "@game";

export class MapRoomPopup extends MapRoomPopup_CLIP {
    static {
        as3.fields(this, { mapOffset: null, _cellContainer: null, _cells: null, _mouseClickPoint: null, _containerClickPoint: null, _containerStartPoint: null, _tempMovePoint: null, _sortArray: null, _cellCountX: 0, _cellCountY: 0, _cellLookup: null, _bubble: null, _cellWidth: 150, _cellHeight: 75, _popupBookmarkAdd: null, _popupRelocateMe: null, _popupInfoMine: null, _popupInfoEnemy: null, _popupMonsters: null, _popupInfoViewOnly: null, _popupBuff: null, _popupBookmarkMenu: null, _menuShown: false, _fullScreen: false, _fallbackHomeCell: null, _popupAttackA: null, _dragged: false, _popupMonstersB: null, _lastBuffCount: -1, _onHomeClick: null, _onViewOnlyBookmarkClick: null, _ioLod: null, _ioLastDragUpdate: 0, _ioNewUi: false, _ioZoom: null, _ioSidebar: null, _ioRelocate: null, _ioMinimap: null, _ioCoords: null, _ioCoordsText: null, _ioPointer: null, _ioSpot: null, _ioLastWheel: 0, _ioRight: null, _ioInfoMore: null, _ioInfoType: null, _ioInfoRelation: null, _ioInfoHeight: 0, _ioFilters: null, _ioInfoYard: -1, _ioFsShift: 0, _ioLodFocus: null, _ioUnderBanner: null, _ioOffscreen: null, ioOffscreenPending: false });
    }

    public static s_Instance: MapRoomPopup = null;

    /**
     * Zoomed-out view: the cell layer is drawn at 1 / sqrt(2), which fits twice as many cells into
     * the same window. Static, so the choice survives closing and reopening the map.
     */
    private static readonly IO_ZOOM_SCALE: number = 0.7071;

    private static s_ioZoomedOut: boolean = false;

    /**
     * The world map (IoMapLod): the three widest zoom steps, the whole world in low detail. Static, like
     * the zoom, so the map opens on it again.
     */
    private static s_ioLod: boolean = false;

    /** The world map's zoom: 1, 2 or 4 times the whole world. */
    private static s_ioLodZoom: int = 1;

    // ---------------------------------------------------------------------------------------------
    // Zoom: five steps. 0-2 are the world map at 1, 2 and 4 times the whole world (IoMapLod), 3 is the
    // map zoomed out (Far), 4 the map as it always was (Close). The -/+ control, the mouse wheel and a
    // pinch all move one step, towards the pointer (or the fingers): the place under it stays put.
    // ---------------------------------------------------------------------------------------------
    private static readonly IO_LOD_ZOOMS: any[] = [1, 2, 4];
    private mapOffset: Point;
    private _cellContainer: MovieClip;
    private _cells: any[];
    private _mouseClickPoint: Point;
    private _containerClickPoint: Point;
    private _containerStartPoint: Point;
    private _tempMovePoint: Point;
    private _sortArray: any[];
    private _cellCountX: int;
    private _cellCountY: int;
    private _cellLookup: any;
    private _bubble: bubblepopup3;
    private _cellWidth: int;
    private _cellHeight: int;
    private _popupBookmarkAdd: PopupNewBookmark;
    private _popupRelocateMe: PopupRelocateMe;
    public _popupInfoMine: PopupInfoMine;
    private _popupInfoEnemy: PopupInfoEnemy;
    private _popupMonsters: PopupMonstersA;
    private _popupInfoViewOnly: PopupInfoViewOnly;
    private _popupBuff: bubblepopupBuff;
    private _popupBookmarkMenu: any[];
    private _menuShown: boolean;
    private _fullScreen: boolean;
    private _fallbackHomeCell: MapRoomCell;
    private _popupAttackA: PopupAttackA;
    public _dragged: boolean;
    private _popupMonstersB: PopupMonstersB;
    private _lastBuffCount: number;
    private _onHomeClick: Function;
    private _onViewOnlyBookmarkClick: Function;
    private _ioLod: IoMapLod;
    private _ioLastDragUpdate: int;
    /**
     * Inferno-only, not when only viewing an invitation's place: the sidebar (find a player, bookmarks,
     * alliance, filters), the minimap, the coordinates and sharing places in chat.
     */
    private _ioNewUi: boolean;
    /** The zoom control (IoMapZoomControl), left of the window's full screen button. */
    private _ioZoom: IoMapZoomControl;
    private _ioSidebar: IoMapSidebar;
    private _ioRelocate: Button_CLIP;
    private _ioMinimap: IoMapMinimap;
    private _ioCoords: Sprite;
    private _ioCoordsText: TextField;
    /** The cell under the pointer, or null when it is not over the map. */
    private _ioPointer: Point;
    /** The bubble of a clicked empty place (Share in chat, Bookmark). */
    private _ioSpot: Sprite;
    private _ioLastWheel: int;
    /** The panel right of the map (the minimap, and what is under the pointer), framed like the sidebar. */
    private _ioRight: frame_CLIP;
    /** The cell information's own lines, under the stock ones (IoMapPopup.ioShowInfoMore). */
    private _ioInfoMore: TextField;
    /** The cell information's type line (under the name) and relation line (under the alliance). */
    private _ioInfoType: TextField;
    private _ioInfoRelation: TextField;
    private _ioInfoHeight: int;
    /** The world map's filters (the button left of the zoom buttons). */
    private _ioFilters: IoMapFiltersPopup;
    /** The yard the world map last showed information for (x * 10000 + y). */
    private _ioInfoYard: int;
    /**
     * Full screen, the map is narrower by the panel on its right: the cell grid, laid out for the stock width,
     * moves left by half of that to stay in the middle.
     */
    private _ioFsShift: number;
    /** The map cell where the world map was opened (it goes back there). */
    private _ioLodFocus: Point;
    /** Inferno-only: the name over the map while it shows the underworld; the minimap is the overworld's. */
    private _ioUnderBanner: Sprite;
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
    private _ioOffscreen: any;
    /** Inferno-only: a cell asked for (GetCellsInRange) was in a zone not loaded yet; set until asked again. */
    public ioOffscreenPending: boolean;

    public $ctor(): void {
        this._ioOffscreen = {};
        let w: int = 0;
        let h: int = 0;
        let r: Rectangle = null;
        let i: int = 0;
        this._sortArray = [];
        super.$ctor();
        w = GLOBAL._ROOT.stage.stageWidth;
        h = GLOBAL.GetGameHeight();
        if (w > 1024 && !(GLOBAL.isFullScreen && GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly)) {
            w = 1024;
        }
        if (h > 768) {
            h = 768;
        }
        r = new Rectangle(0 - (w - 760) / 2, 0 - (h - 720) / 2, w, h);
        if (GLOBAL.isFullScreen) {
            this._fullScreen = true;
            this.mcFrame.x = r.x + 175;
            this.mcFrame.y = r.y + 20;
            this.mcFrame.width = w - 195;
            this.mcFrame.height = h - 40;
            this.mcMask.x = r.x + 175;
            this.mcMask.y = r.y + 20;
            this.mcMask.mcMask.width = w - 195;
            this.mcMask.mcMask.height = h - 40;
            this.mcFrame2.x = r.x;
            this.mcFrame2.y = r.y + 20;
            if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
                this.mcFrame2.height = h - 40;
            }
            this.mcBuffHolder.x = this.mcMask.width + this.mcMask.x - 70;
            this.mcBuffHolder.y = this.mcMask.y + 28;
        } else {
            this._fullScreen = false;
            this.mcFrame.x = 190;
            this.mcFrame.y = 20;
            this.mcFrame.width = 760 - 20 - 190;
            this.mcFrame.height = 520 - 40;
            this.mcMask.x = this.mcFrame.x;
            this.mcMask.y = this.mcFrame.y;
            this.mcMask.mcMask.width = this.mcFrame.width;
            this.mcMask.mcMask.height = this.mcFrame.height;
            this.mcFrame2.x = 20;
            this.mcFrame2.y = 20;
            this.mcBuffHolder.x = this.mcMask.width + this.mcMask.x - 70;
            this.mcBuffHolder.y = this.mcMask.y + 30;
        }
        if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
            // A panel as wide as the sidebar goes right of the map (IoBuildUi): the map is narrower (full
            // screen) or everything moves left by half of it (the window keeps its middle).
            let ioSide: number = this.mcFrame.x - this.mcFrame2.x;
            if (GLOBAL.isFullScreen) {
                this.mcFrame.width -= ioSide;
                this.mcMask.mcMask.width = this.mcFrame.width;
                // the grid is laid out for the stock 829 wide map: its middle moves to this one's
                this._ioFsShift = 414.5 - this.mcFrame.width * 0.5;
            } else {
                this.mcFrame.x -= ioSide * 0.5;
                this.mcMask.x = this.mcFrame.x;
                this.mcFrame2.x -= ioSide * 0.5;
            }
            this.mcBuffHolder.x = this.mcMask.x + this.mcMask.mcMask.width - 70;
        }
        this.mcInfo.x = this.mcFrame2.x + 20;
        this.mcInfo.y = this.mcFrame2.y + 270;
        this.mcInfo.visible = false;
        // (mcFrame as frame1).Setup(true,true,true,0,0);
        // (mcFrame2 as frame).Setup(false);
        this.mcFrame.Setup(true, true, true, 0, 0);
        this.mcFrame2.Setup(false);
        this.mcMask.mcMask.mouseEnabled = false;
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
        this._popupBookmarkAdd.mcFrame.Setup(true, as3.bind(this, this.HideBookmarkAddPopup));
        this._popupInfoViewOnly = new PopupInfoViewOnly();
        if (!MapRoom._viewOnly) {
            this.bHome.SetupKey("btn_home");
            this._onHomeClick = (param1: MouseEvent): void => {
                this.HideBookmarkMenu();
                MapRoom.JumpTo(GLOBAL._mapHome);
            };
            this.bHome.addEventListener(MouseEvent.CLICK, this._onHomeClick);
            this.bHome.buttonMode = true;
            this.bHome.x = this.mcFrame2.x + 20;
            this.bHome.y = this.mcFrame2.y + 200;
            this.bJump.SetupKey("btn_jump");
            this.bJump.addEventListener(MouseEvent.CLICK, as3.bind(this, this.JumpPopupShow));
            this.bJump.buttonMode = true;
            this.bJump.x = this.mcFrame2.x + 80;
            this.bJump.y = this.mcFrame2.y + 200;
            this.bBookmarks.SetupKey("btn_bookmarks");
            this.bBookmarks.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowBookmarkMenu));
            this.bBookmarks.buttonMode = true;
            this.bBookmarks.x = this.mcFrame2.x + 20;
            this.bBookmarks.y = this.mcFrame2.y + 235;
            this.UpdateResourceDisplay();
        } else {
            this.bBookmarks.SetupKey("btn_home");
            this._onViewOnlyBookmarkClick = (param1: MouseEvent): void => {
                MapRoom.JumpTo(MapRoom._inviteLocation);
            };
            this.bBookmarks.addEventListener(MouseEvent.CLICK, this._onViewOnlyBookmarkClick);
            this.bBookmarks.buttonMode = true;
            this.bBookmarks.Enabled = true;
            this.bBookmarks.x = this.mcFrame2.x + 20;
            this.bBookmarks.y = this.mcFrame2.y + 235;
            this.bHome.visible = false;
            this.bJump.visible = false;
            this.HideResourceDisplay();
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioInfernoResourceBars();
        }
        this.ioBuildUi();
        this.mcInfo.labelOwner.htmlText = "<b>" + KEYS.Get("label_owner") + "</b>";
        if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
            this.mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_type") + "</b>";
        } else {
            this.mcInfo.labelAlliance.htmlText = "<b>" + KEYS.Get("label_alliance") + "</b>";
        }
        this.mcInfo.labelStatus.htmlText = "<b>" + KEYS.Get("label_status") + "</b>";
        this.mcInfo.labelLocation.htmlText = "<b>" + KEYS.Get("label_location") + "</b>";
        this.GenerateCells(MapRoom.ioFocus ? MapRoom.ioFocus : MapRoom._homePoint);
        MapRoom.ioFocus = null;
        if (GLOBAL.INFERNO_ONLY) {
            IoUnderworld.requestReach(true);
        }
        as3.sortOn(this._sortArray, "depth", Array.NUMERIC);
        i = 0;
        while (i < this._sortArray.length) {
            if (this._cellContainer.getChildIndex(as3.cast(this._sortArray[i], DisplayObject)) != i) {
                this._cellContainer.setChildIndex(as3.cast(this._sortArray[i], DisplayObject), i);
            }
            i++;
        }
        this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ContainerClick));
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
        this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        this._cellContainer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.ioContainerLeave));
        this.mcMask.mcBG.addChild(this._cellContainer);
        if (MapRoomPopup.s_ioLod && GLOBAL.INFERNO_ONLY && IoUnderworld.under) {
            MapRoomPopup.s_ioLod = false;
        }
        if (MapRoomPopup.s_ioLod && GLOBAL.INFERNO_ONLY) {
            MapRoomPopup.s_ioLod = false;
            this.ioEnterLod(MapRoomPopup.s_ioLodZoom);
        } else if (MapRoom.ioMark) {
            this.ioMarkSpot(MapRoom.ioMark.x | 0, MapRoom.ioMark.y | 0);
        }
        MapRoom.ioMark = null;
        this.ioViewChanged();
    }

    public static get instance(): MapRoomPopup {
        return MapRoomPopup.s_Instance = MapRoomPopup.s_Instance || new MapRoomPopup();
    }

    private JumpPopupShow(param1: MouseEvent = null): void {
        let popupMC: MapRoomPopupJump = null;
        let Jump: Function = null;
        let JumpPopupHide: Function = null;
        popupMC = null;
        Jump = null;
        JumpPopupHide = null;
        let e: MouseEvent = param1;
        Jump = (param1: MouseEvent = null): void => {
            let _loc2_: string = this.JumpToCoordinate(popupMC.tX.text, popupMC.tY.text);
            if (_loc2_) {
                GLOBAL.Message(_loc2_);
            } else {
                JumpPopupHide();
            }
        };
        JumpPopupHide = (param1: MouseEvent = null): void => {
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

    private HideResourceDisplay(): void {
        let _loc1_: int = 1;
        while (_loc1_ < 5) {
            this["mcR" + _loc1_].visible = false;
            _loc1_++;
        }
        this.mcOutposts.visible = false;
    }

    private UpdateResourceDisplay(): void {
        let _loc2_: int = 0;
        let _loc1_: int = 1;
        while (_loc1_ < 5) {
            this["mcR" + _loc1_].x = this.mcFrame2.x + 20;
            this["mcR" + _loc1_].y = this._ioNewUi ? this.mcFrame2.y + 14 + (_loc1_ - 1) * 31 : this.mcFrame2.y + 18 + (_loc1_ - 1) * 36;
            this["mcR" + _loc1_].tR.htmlText = GLOBAL.ioTestMode() ? "Unlimited" : GLOBAL.FormatNumber(Number(GLOBAL._resources["r" + _loc1_].Get()));
            GLOBAL.ioFitText(as3.cast(this["mcR" + _loc1_].tR, TextField));
            // (Inferno-only: 131,533,296 lost its last digit)
            _loc2_ = (100 / GLOBAL._resources["r" + _loc1_ + "max"] * GLOBAL._resources["r" + _loc1_].Get()) | 0;
            if (_loc2_ > 90) {
                _loc2_ = 90;
            }
            this["mcR" + _loc1_].mcBar.width = _loc2_;
            _loc1_++;
        }
        this.mcOutposts.x = this.mcFrame2.x + 20;
        this.mcOutposts.y = this._ioNewUi ? this.mcFrame2.y + 14 + 4 * 31 : this.mcFrame2.y + 162;
        this.mcOutposts.tR.htmlText = GLOBAL._mapOutpost.length + " " + KEYS.Get("newmap_outposts");
        GLOBAL.ioFitText(as3.cast(this.mcOutposts.tR, TextField));
    }

    public ShowInfo(param1: MapRoomCell): void {
        if (this._ioNewUi) {
            // The pointer's place, for the coordinates; the panel right of the map shows the rest.
            this.ioSetPointer(param1.X, param1.Y);
            if (MapRoomPopup.s_ioLod) {
                return;
            }
        }
        if (!param1._updated) {
            return;
        }
        let _loc2_: int = this.mcInfo.mcProfilePic.mcImage.numChildren | 0;
        while (_loc2_--) {
            this.mcInfo.mcProfilePic.mcImage.removeChildAt(_loc2_);
        }
        _loc2_ = this.mcInfo.mcAlliancePic.mcImage.numChildren | 0;
        while (_loc2_--) {
            this.mcInfo.mcAlliancePic.mcImage.removeChildAt(_loc2_);
        }
        this.mcInfo.mcAlliancePic.visible = false;
        if (!GLOBAL._flags.viximo) {
            if (param1._base > 1 && Boolean(param1._pic_square)) {
                this.ProfilePicVix(param1._pic_square);
                if (Boolean(param1._alliance) && Boolean(param1._alliance.image)) {
                    this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), param1._alliance);
                    this.mcInfo.mcAlliancePic.visible = true;
                }
            }
        } else if (param1._base > 1 && Boolean(param1._facebookID)) {
            this.ProfilePic(param1._facebookID);
            if (Boolean(param1._alliance) && Boolean(param1._alliance.image)) {
                this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), param1._alliance);
                this.mcInfo.mcAlliancePic.visible = true;
            }
        }
        if (param1._base == 1 && Boolean(param1._name)) {
            this.TribePic(param1._name);
        }
        if (param1._water) {
            this.mcInfo.tAlliance.htmlText = "";
            this.mcInfo.tStatus.htmlText = KEYS.Get("status_water");
            this.mcInfo.tOwner.htmlText = "";
            this.mcInfo.tUserId.visible = false;
        } else {
            if (param1._alliance) {
                if (param1._base == 0) {
                    this.mcInfo.tAlliance.htmlText = "";
                }
                if (param1._base == 1) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_wm");
                }
                if (param1._base == 2 && Boolean(param1._mine)) {
                    this.mcInfo.tAlliance.htmlText = String(param1._alliance.name || "");
                }
                if (param1._base == 2 && !param1._mine) {
                    this.mcInfo.tAlliance.htmlText = String(param1._alliance.name || "");
                }
                if (param1._base == 3 && Boolean(param1._mine)) {
                    this.mcInfo.tAlliance.htmlText = String(param1._alliance.name || "");
                }
                if (param1._base == 3 && !param1._mine) {
                    this.mcInfo.tAlliance.htmlText = String(param1._alliance.name || "");
                }
            } else {
                if (param1._base == 0) {
                    this.mcInfo.tAlliance.htmlText = "";
                }
                if (param1._base == 1) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_wm");
                }
                if (param1._base == 2 && Boolean(param1._mine)) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_my");
                }
                if (param1._base == 2 && !param1._mine) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_ey");
                }
                if (param1._base == 3 && Boolean(param1._mine)) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_outposts");
                }
                if (param1._base == 3 && !param1._mine) {
                    this.mcInfo.tAlliance.htmlText = KEYS.Get("newmap_eo");
                }
            }
            if (param1._damage) {
                this.mcInfo.tStatus.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("newmap_inf_damaged", { "v1": param1._damage }) + "</font>";
            }
            if (!param1._damage) {
                this.mcInfo.tStatus.htmlText = "Fine";
            }
            if (!param1._damage && param1._base < 1) {
                this.mcInfo.tStatus.htmlText = KEYS.Get("newmap_re");
            }
            // Tribes are shown under their devil names on the map; the panel has to say the same.
            // (bug report 68: a cell without an owner's name, e.g. open ground in the Depths, stopped the game here)
            this.mcInfo.tOwner.htmlText = String((param1._base == 1 ? TRIBES.DisplayName(param1._name) : param1._name) || "");
            this.mcInfo.tUserId.text = KEYS.Get("label_userid", { "v1": param1._userID });
            this.mcInfo.tUserId.visible = true;
        }
        this.mcInfo.tLocation.htmlText = String(IoMapUi.location(param1.X, param1.Y) || "");
        this.mcInfo.visible = true;
        if (this._ioNewUi) {
            this._ioInfoYard = -1;
            if (!param1._water && param1._base == 0) {
                this.mcInfo.tStatus.htmlText = "";
            }
            this.ioShowInfoMore(param1);
        }
    }

    private ProfilePic(param1: number): void {
        let profilePic: Loader = null;
        let onImageLoad: Function = null;
        let LoadImageError: Function = null;
        profilePic = null;
        onImageLoad = null;
        LoadImageError = null;
        let fbid: number = param1;
        onImageLoad = (param1: Event): void => {
            profilePic.width = profilePic.height = 50;
            MapRoomPopup.ioSmooth(profilePic);
            this.mcInfo.mcProfilePic.mcImage.addChild(profilePic);
            profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        LoadImageError = (param1: IOErrorEvent): void => {
            profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        profilePic = new Loader();
        profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
        profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
        profilePic.load(new URLRequest("http://graph.facebook.com/" + fbid + "/picture"));
    }

    private ProfilePicVix(param1: string): void {
        let profilePic: Loader = null;
        let onImageLoad: Function = null;
        let LoadImageError: Function = null;
        profilePic = null;
        onImageLoad = null;
        LoadImageError = null;
        let imgURL: string = param1;
        onImageLoad = (param1: Event): void => {
            profilePic.width = profilePic.height = 50;
            MapRoomPopup.ioSmooth(profilePic);
            this.mcInfo.mcProfilePic.mcImage.addChild(profilePic);
            profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        LoadImageError = (param1: IOErrorEvent): void => {
            profilePic.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false);
            profilePic.contentLoaderInfo.removeEventListener(Event.COMPLETE, onImageLoad);
        };
        profilePic = new Loader();
        profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
        profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
        profilePic.load(new URLRequest(imgURL));
    }

    /** A loaded picture drawn smoothly (the cell information shows it at twice its size). */
    private static ioSmooth(loader: Loader): void {
        try {
            if (loader.content instanceof Bitmap) {
                as3.cast(loader.content, Bitmap).smoothing = true;
            }
        } catch (e) {
        }
    }

    private TribePic(param1: string): void {
        let imageComplete: Function = null;
        let tribe: string = param1;
        imageComplete = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.smoothing = true;
            // (drawn large in the map room's cell information)
            this.mcInfo.mcProfilePic.mcImage.addChild(_loc3_);
        };
        // Inferno-only: the tribe's large picture (150 high), made to the picture's 50 x 50 (the panel shows it
        // at about three times that), not the 50 x 50 one blown up (the user's, 29 September)
        if (GLOBAL.INFERNO_ONLY && InfernoMapTheme.tribeCellPicture(tribe, as3.cast(this.mcInfo.mcProfilePic.mcImage, MovieClip))) {
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

    private AlliancePic(param1: string, param2: AllyInfo): void {
        param2.AlliancePic(param1, as3.cast(this.mcInfo.mcAlliancePic.mcImage, MovieClip), as3.cast(this.mcInfo.mcAlliancePic.mcBG, MovieClip), true);
    }

    public Hide(param1: MouseEvent = null): void {
        GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
        if (BASE._loadedFriendlyBaseID) {
            BASE.yardType = BASE._loadedYardType;
            BASE.LoadBase(null, 0, BASE._loadedFriendlyBaseID, GLOBAL.e_BASE_MODE.BUILD, false, BASE._loadedYardType);
        } else {
            BASE.yardType = EnumYardType.MAIN_YARD;
            BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }
        SOUNDS.Play("close");
        this.Cleanup();
        MapRoomManager.instance.Hide();
    }

    public CloseMapRoomAfterMigration(): void {
        BASE.yardType = EnumYardType.MAIN_YARD;
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        this.Cleanup();
        MapRoomManager.instance.Hide();
    }

    public Cleanup(): void {
        let i: int = 0;
        this.HideBookmarkMenu();
        if (GLOBAL.INFERNO_ONLY) {
            IoUnderworld.modeFor(null);
            // the overworld's size again
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
        if (this.mcFrame) {
            this.mcFrame.Clear();
            this.mcFrame = null;
        }
        if (this.mcFrame2) {
            this.mcFrame2.Clear();
            this.mcFrame2 = null;
        }
        if (this._cellContainer) {
            while (this._cellContainer.numChildren > 0) {
                this._cellContainer.removeChildAt(0);
            }
            this._cellContainer.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ContainerClick));
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            this._cellContainer.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            this._cellContainer.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ContainerRelease));
            GLOBAL._ROOT.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            GLOBAL._ROOT.stage.removeEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.ioContainerLeave));
            if (this._cellContainer.parent) {
                this._cellContainer.parent.removeChild(this._cellContainer);
            }
            this._cellContainer = null;
        }
        if (this._cells) {
            i = (this._cells.length - 1) | 0;
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
            this.bJump.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.JumpPopupShow));
            this.bBookmarks.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowBookmarkMenu));
            if (this._ioRelocate) {
                this._ioRelocate.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ioRelocateClick));
                this._ioRelocate = null;
            }
        } else {
            if (this._onViewOnlyBookmarkClick != null) {
                this.bBookmarks.removeEventListener(MouseEvent.CLICK, this._onViewOnlyBookmarkClick);
                this._onViewOnlyBookmarkClick = null;
            }
        }

        MapRoom.ClearCells();
        MapRoomPopup.s_Instance = null;
    }

    public Setup(): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: string = null;
        let _loc1_: int = MapRoom.BookmarkDataGet("mbms");
        if (_loc1_ > 0) {
            _loc2_ = 0;
            while (_loc2_ < _loc1_) {
                _loc3_ = MapRoom.BookmarkDataGet("mbm" + _loc2_);
                _loc4_ = (_loc3_ / 10000) | 0;
                _loc5_ = (_loc3_ - _loc4_ * 10000) | 0;
                _loc6_ = MapRoom.BookmarkDataGetStr("mbmn" + _loc2_);
                MapRoom._currentPosition = new Point(_loc4_, _loc5_);
                MapRoom.AddBookmark(_loc6_, false);
                _loc2_++;
            }
        } else {
            MapRoomManager.instance.BookmarksClear();
        }
        if (MapRoom._bookmarks.length > 0 || MapRoom._viewOnly) {
            this.bBookmarks.Enabled = true;
        } else {
            this.bBookmarks.Enabled = false;
        }
    }

    public JumpTo(param1: Point): void {
        this.ioHideTransient();
        if (MapRoomPopup.s_ioLod) {
            this.ioLeaveLod();
        }
        this.mcMask.mcBG.removeChild(this._cellContainer);
        this.GenerateCells(param1);
        as3.sortOn(this._sortArray, "depth", Array.NUMERIC);
        let _loc2_: int = 0;
        while (_loc2_ < this._sortArray.length) {
            if (this._cellContainer.getChildIndex(as3.cast(this._sortArray[_loc2_], DisplayObject)) != _loc2_) {
                this._cellContainer.setChildIndex(as3.cast(this._sortArray[_loc2_], DisplayObject), _loc2_);
            }
            _loc2_++;
        }
        this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ContainerClick));
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
        this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        this._cellContainer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.ioContainerLeave));
        this.mcMask.mcBG.addChild(this._cellContainer);
        this.Update();
        this.ioViewChanged();
    }

    private GenerateCells(param1: Point): void {
        if (GLOBAL.INFERNO_ONLY) {
            // the layer the cell is on: the underworld or the overworld (IoUnderworld)
            IoUnderworld.modeFor(param1);
        }
        let cellIndex: int = 0;
        let rowIndex: int = 0;
        let mapRoomCell: MapRoomCell = null;
        let stageWidth: int = GLOBAL._ROOT.stage.stageWidth;
        let stageHeight: int = GLOBAL.GetGameHeight();
        if (stageWidth > 1024) {
            stageWidth = 1024;
        }
        if (stageHeight > 768) {
            stageHeight = 768;
        }
        let _loc5_: Rectangle = new Rectangle(0 - (stageWidth - 760) / 2, 0 - (stageHeight - 520) / 2, stageWidth, stageHeight);
        if (this._cellContainer) {
            while (this._cellContainer.numChildren > 0) {
                this._cellContainer.removeChildAt(0);
            }
            this._cellContainer.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ContainerClick));
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            this._cellContainer.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            this._cellContainer.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.ContainerRelease));
            GLOBAL._ROOT.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
            GLOBAL._ROOT.stage.removeEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.ioContainerLeave));
            if (this._cellContainer.parent) {
                this._cellContainer.parent.removeChild(this._cellContainer);
            }
            this._cellContainer = null;
        }
        if (this._cells) {
            cellIndex = (this._cells.length - 1) | 0;
            cellIndex = (this._cells.length - 1) | 0;
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
        } else {
            this._cellCountX = 16;
            this._cellCountY = 14;
        }
        this._cellContainer.scaleX = this._cellContainer.scaleY = 1;
        if (MapRoomPopup.s_ioZoomedOut) {
            this.ioGenerateZoomedCells(param1);
        }
        stageHeight = 0;
        while (stageHeight < this._cellCountX && !MapRoomPopup.s_ioZoomedOut) {
            rowIndex = 0;
            while (rowIndex < this._cellCountY) {
                (mapRoomCell = new MapRoomCell()).x = (stageHeight * (this._cellWidth * 0.75) - this._cellWidth * 0.75 * 4) | 0;
                mapRoomCell.y = (rowIndex * this._cellHeight - this._cellHeight * 5) | 0;
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
                mapRoomCell.depth = (mapRoomCell.y * 1000 + mapRoomCell.x) | 0;
                this._sortArray.push(mapRoomCell);
                this._cellContainer.addChild(mapRoomCell);
                if (GLOBAL.isFullScreen) {
                    mapRoomCell.Y = (mapRoomCell.Y + (param1.y - 8)) | 0;
                    if (param1.x % 2) {
                        mapRoomCell.X = (mapRoomCell.X + (param1.x - 8)) | 0;
                        this._cellContainer.x = -125 - this._ioFsShift;
                        this._cellContainer.y = 18;
                    } else {
                        mapRoomCell.X = (mapRoomCell.X + (param1.x - 7)) | 0;
                        this._cellContainer.x = -9 - this._ioFsShift;
                        this._cellContainer.y = 54;
                    }
                } else {
                    mapRoomCell.Y = (mapRoomCell.Y + (param1.y - 7)) | 0;
                    if (param1.x % 2) {
                        mapRoomCell.X = (mapRoomCell.X + (param1.x - 4)) | 0;
                        this._cellContainer.x = 209;
                        this._cellContainer.y = 7;
                    } else {
                        mapRoomCell.X = (mapRoomCell.X + (param1.x - 5)) | 0;
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
        this._fallbackHomeCell.X = GLOBAL._mapHome.x | 0;
        this._fallbackHomeCell.Y = GLOBAL._mapHome.y | 0;
        this._cellContainer.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ContainerClick));
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        // The same release from places the mouse-up is known to reach on every setup (see MAP.as).
        this._cellContainer.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        this._cellContainer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ContainerRelease));
        GLOBAL._ROOT.stage.addEventListener(Event.MOUSE_LEAVE, as3.bind(this, this.ioContainerLeave));
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
    private ioInfernoResourceBars(): void {
        let source: UI_TOP_CLIP = null;
        let from: MovieClip = null;
        let to: MovieClip = null;
        let child: DisplayObject = null;
        let borrowed: any[] = null;
        let seenBackground: boolean = false;
        let i: int = 1;
        let k: int = 0;
        try {
            source = new UI_TOP_CLIP();
            source.gotoAndStop("ibuild");
            while (i < 5) {
                from = source.mc ? as3.as(source.mc["mcR" + i], MovieClip) : null;
                to = as3.as(this["mcR" + i], MovieClip);
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
                            to.addChild(as3.cast(borrowed[k], DisplayObject));
                            k++;
                        }
                    }
                }
                i++;
            }
        } catch (e) {
            LOGGER.Log("err", "MapRoomPopup.ioInfernoResourceBars: " + e.message);
        }
    }

    /**
     * Builds the cell grid for the zoomed-out view. Same layout rules as the stock loop (columns
     * 0.75 cell widths apart, every other column half a cell lower, odd map X on the lowered
     * columns), but with enough cells to fill the window at IO_ZOOM_SCALE, and with the requested
     * cell placed where the stock view puts it: in the middle of the window.
     */
    private ioGenerateZoomedCells(param1: Point): void {
        let column: int = 0;
        let row: int = 0;
        let cell: MapRoomCell = null;
        let scale: number = MapRoomPopup.IO_ZOOM_SCALE;
        let columnWidth: number = this._cellWidth * 0.75;
        let full: boolean = GLOBAL.isFullScreen;
        // Where the stock view shows the centre of the focused cell, in the mask's coordinates.
        let centreX: number = full ? 402 - this._ioFsShift : 288.5;
        let centreY: number = full ? 317.5 : 227.5;
        this._cellCountX = Math.ceil((full ? this.ioFullColumns() : 16) / scale) | 0;
        if (this._cellCountX % 2 == 1) {
            // Columns alternate, so the grid has to wrap after an even number of them.
            ++this._cellCountX;
        }
        this._cellCountY = Math.ceil((full ? 15 : 14) / scale) | 0;
        // Which column / row of the grid holds the focused cell, so the grid starts just inside the
        // recycling bounds used by Update().
        let focusColumn: int = (Math.floor((centreX + columnWidth * 5 - scale * this._cellWidth * 0.5) / (scale * columnWidth)) - 1) | 0;
        if (((param1.x | 0) - focusColumn) % 2 == 0) {
            --focusColumn;
        }
        let focusRow: int = Math.floor((centreY + this._cellHeight * 5 - scale * this._cellHeight) / (scale * this._cellHeight)) | 0;
        column = 0;
        while (column < this._cellCountX) {
            row = 0;
            while (row < this._cellCountY) {
                cell = new MapRoomCell();
                cell.x = (column * columnWidth - columnWidth * 4) | 0;
                cell.y = (row * this._cellHeight - this._cellHeight * 5) | 0;
                if (column % 2 == 0) {
                    cell.y += this._cellHeight * 0.5;
                }
                cell.X = (column + (param1.x | 0) - focusColumn) | 0;
                cell.Y = (row + (param1.y | 0) - focusRow) | 0;
                cell.cacheAsBitmap = true;
                cell.mc.gotoAndStop(1);
                cell.ResetGroundVariant();
                cell.mc.mcPlayer.visible = false;
                if (GLOBAL.INFERNO_ONLY) {
                    InfernoMapTheme.applyUnloaded(cell.mc);
                }
                cell.depth = (cell.y * 1000 + cell.x) | 0;
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
    private ioCentreCell(): Point {
        let cell: MapRoomCell = null;
        let best: MapRoomCell = null;
        let bestDistance: number = Number.MAX_VALUE;
        let dx: number = NaN;
        let dy: number = NaN;
        let scale: number = this._cellContainer.scaleX;
        let centreX: number = GLOBAL.isFullScreen ? 402 - this._ioFsShift : 288.5;
        let centreY: number = GLOBAL.isFullScreen ? 317.5 : 227.5;
        for (cell of as3.values(this._cells)) {
            dx = this._cellContainer.x + scale * (cell.x + this._cellWidth * 0.5) - centreX;
            dy = this._cellContainer.y + scale * (cell.y + this._cellHeight * 0.5) - centreY;
            if (dx * dx + dy * dy < bestDistance) {
                bestDistance = dx * dx + dy * dy;
                best = cell;
            }
        }
        return best ? new Point(best.X, best.Y) : MapRoom._homePoint;
    }

    /** The zoom step showing (0 = the whole world ... 4 = close). */
    private ioLevel(): int {
        if (MapRoomPopup.s_ioLod) {
            return MapRoomPopup.s_ioLodZoom >= 4 ? 2 : (MapRoomPopup.s_ioLodZoom >= 2 ? 1 : 0);
        }
        return MapRoomPopup.s_ioZoomedOut ? 3 : 4;
    }

    /** Without the world snapshot (not Inferno-only) there is no world map: Far and Close only. */
    private ioMinLevel(): int {
        if (GLOBAL.INFERNO_ONLY && IoUnderworld.under) {
            return 3;
        }
        return GLOBAL.INFERNO_ONLY ? 0 : 3;
    }

    /** Pinch to zoom (IoPinchZoom, through MapRoom.ioPinch): one step, towards the fingers. */
    public ioPinchZoom(param1: boolean, stageX: number = NaN, stageY: number = NaN): void {
        this.ioZoomStep(param1 ? 1 : -1, stageX, stageY);
    }

    private ioOnWheel(e: MouseEvent): void {
        let target: DisplayObject = as3.as(e.target, DisplayObject);
        if (!target || !(this.mcMask.contains(target) || this._ioLod && this._ioLod.contains(target))) {
            return;
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
    public ioZoomStep(dir: int, stageX: number = NaN, stageY: number = NaN): void {
        let from: int = this.ioLevel();
        let to: int = Math.max(this.ioMinLevel(), Math.min(4, from + dir)) | 0;
        let anchor: Point = null;
        if (to == from || !this._cellContainer) {
            return;
        }
        if (!isNaN(stageX) && !isNaN(stageY)) {
            anchor = this.mcMask.globalToLocal(new Point(stageX, stageY));
            if (anchor.x < 0 || anchor.y < 0 || anchor.x > this.mcMask.mcMask.width || anchor.y > this.ioMapHeight()) {
                anchor = null;
            }
        }
        this.ioZoomTo(to, anchor);
    }

    /** Height of the map part of the window (the world map keeps a strip for its legend). */
    private ioMapHeight(): int {
        return this._ioLod ? this._ioLod.mapHeight : this.mcMask.mcMask.height | 0;
    }

    /** Where the map puts the middle of the cell it is centred on (mask coordinates; see GenerateCells). */
    /** Full screen: columns enough for the map's width (18 for the stock 829 pixels), an even number. */
    private ioFullColumns(): int {
        let columns: int = Math.max(18, Math.ceil(this.mcMask.mcMask.width / (this._cellWidth * 0.75)) + 11) | 0;
        return (columns % 2 == 1 ? columns + 1 : columns) | 0;
    }

    private ioGridMiddle(): Point {
        return GLOBAL.isFullScreen ? new Point(402 - this._ioFsShift, 317.5) : new Point(288.5, 227.5);
    }

    private ioZoomTo(to: int, anchor: Point): void {
        let middle: Point = null;
        let at: Point = null;
        let cell: Point = null;
        let cellX: number = NaN;
        let cellY: number = NaN;
        let scale: number = NaN;
        let target: Point = null;
        this.ioHideTransient();
        if (MapRoomPopup.s_ioLod && this._ioLod) {
            middle = new Point(this.mcMask.mcMask.width * 0.5, this._ioLod.mapHeight * 0.5);
            at = anchor || middle;
            cellX = this._ioLod.centreX + (at.x - middle.x) / this._ioLod.scale;
            cellY = this._ioLod.centreY + (at.y - middle.y) / this._ioLod.scale;
        } else {
            middle = this.ioGridMiddle();
            at = anchor || middle;
            cell = this.ioCellNear(at.x, at.y);
            cellX = cell.x + 0.5;
            cellY = cell.y + 0.5;
        }
        if (to <= 2) {
            MapRoomPopup.s_ioLodZoom = MapRoomPopup.IO_LOD_ZOOMS[to] | 0;
            if (MapRoomPopup.s_ioLod && this._ioLod) {
                this._ioLod.setZoom(MapRoomPopup.s_ioLodZoom, Number(anchor ? anchor.x : -1), Number(anchor ? anchor.y : -1));
            } else {
                this.ioEnterLod(MapRoomPopup.s_ioLodZoom, cellX, cellY, anchor);
            }
            this.ioViewChanged();
            return;
        }
        // To the map: the cell under the anchor stays under it.
        MapRoomPopup.s_ioZoomedOut = to == 3;
        scale = Number(MapRoomPopup.s_ioZoomedOut ? MapRoomPopup.IO_ZOOM_SCALE : 1);
        middle = this.ioGridMiddle();
        at = anchor || middle;
        target = new Point(Math.floor(cellX - (at.x - middle.x) / (this._cellWidth * 0.75 * scale)), Math.floor(cellY - (at.y - middle.y) / (this._cellHeight * scale)));
        target.x = (target.x % MapRoom._mapWidth + MapRoom._mapWidth) % MapRoom._mapWidth;
        target.y = (target.y % MapRoom._mapHeight + MapRoom._mapHeight) % MapRoom._mapHeight;
        this.JumpTo(target);
    }

    /** The map cell nearest a point of the map (mask coordinates). */
    private ioCellNear(px: number, py: number): Point {
        let cell: MapRoomCell = null;
        let best: MapRoomCell = null;
        let bestDistance: number = Number.MAX_VALUE;
        let dx: number = NaN;
        let dy: number = NaN;
        let scale: number = this._cellContainer.scaleX;
        for (cell of as3.values(this._cells)) {
            dx = this._cellContainer.x + scale * (cell.x + this._cellWidth * 0.5) - px;
            dy = this._cellContainer.y + scale * (cell.y + this._cellHeight * 0.5) - py;
            if (dx * dx + dy * dy < bestDistance) {
                bestDistance = dx * dx + dy * dy;
                best = cell;
            }
        }
        return best ? new Point(best.X, best.Y) : MapRoom._homePoint;
    }

    /**
     * Shows the world map at a zoom. With a cell and an anchor, that cell is put under the anchor;
     * otherwise the map is centred where the cell map was.
     */
    private ioEnterLod(zoom: int = 1, cellX: number = NaN, cellY: number = NaN, anchor: Point = null): void {
        let focus: Point = this.ioCentreCell();
        let scale: number = Number(this._cellContainer ? this._cellContainer.scaleX : 1);
        if (MapRoomPopup.s_ioLod) {
            return;
        }
        MapRoomPopup.s_ioLod = true;
        MapRoomPopup.s_ioLodZoom = zoom;
        this._ioLodFocus = focus;
        this.HideBubble();
        this.HideBookmarkMenu();
        this.ioHideTransient();
        if (!this._ioNewUi) {
            this.mcInfo.visible = false;
        }
        if (this._cellContainer) {
            this._cellContainer.visible = false;
        }
        IoMapSnapshot.Request();
        // The part of the world the map window showed, in cells (columns are 3/4 of a cell apart).
        let spanX: int = Math.round(this.mcMask.mcMask.width / (this._cellWidth * 0.75 * scale)) | 0;
        let spanY: int = Math.round(this.mcMask.mcMask.height / (this._cellHeight * scale)) | 0;
        this._ioLod = new IoMapLod(this.mcMask.mcMask.width | 0, this.mcMask.mcMask.height | 0, focus, spanX, spanY, as3.bind(this, this.ioPickFromLod), zoom, isNaN(cellX) ? focus : new Point(Math.floor(cellX), Math.floor(cellY)));
        if (!isNaN(cellX) && anchor) {
            // the cell stays under the pointer
            this._ioLod.centreOn(cellX - (anchor.x - this.mcMask.mcMask.width * 0.5) / this._ioLod.scale, cellY - (anchor.y - this._ioLod.mapHeight * 0.5) / this._ioLod.scale);
        }
        this._ioLod.x = this.mcMask.x;
        this._ioLod.y = this.mcMask.y;
        this._ioLod.onViewChanged = as3.bind(this, this.ioLodMoved);
        this._ioLod.onPointer = as3.bind(this, this.ioSetPointer);
        this._ioLod.onHover = as3.bind(this, this.ioShowYardInfo);
        // Over the map, under the window's frame (its border and buttons) and the map's own panels.
        this.addChildAt(this._ioLod, (this.getChildIndex(this.mcMask) + 1) | 0);
        this.ioViewChanged();
    }

    /** Leaves the world map (the caller then shows the map somewhere). */
    private ioLeaveLod(): void {
        MapRoomPopup.s_ioLod = false;
        if (this._ioLod) {
            this._ioLod.Cleanup();
            this._ioLod = null;
        }
        if (this._cellContainer) {
            this._cellContainer.visible = true;
        }
    }

    private ioPickFromLod(cellX: int, cellY: int): void {
        this.JumpTo(new Point(cellX, cellY));
        this.ioMarkSpot(cellX, cellY);
    }

    /** A new world snapshot arrived (MapRoom.ioSnapshotArrived). */
    public ioSnapshotChanged(): void {
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
    public ioCellAt(cellX: int, cellY: int): MapRoomCell {
        return this._cellLookup ? as3.as(this._cellLookup[cellX * 10000 + cellY], MapRoomCell) : null;
    }

    // ---------------------------------------------------------------------------------------------
    // The map room's own panels (Inferno-only): the zoom control, the sidebar, the minimap and the
    // coordinates; sharing and bookmarking a clicked place.
    // ---------------------------------------------------------------------------------------------
    private ioRelocateClick(e: MouseEvent): void {
        this.HideBookmarkMenu();
        IoRelocate.Ask();
    }

    private ioBuildUi(): void {
        let frame2H: int = this.mcFrame2.height | 0;
        let sideX: int = ((this.mcFrame2.x | 0) + 12) | 0;
        let sideW: int = 128;
        let sideTop: int = 0;
        let gap: number = this.mcFrame.x - (this.mcFrame2.x + this.mcFrame2.width);
        let rightX: number = 0;
        let infoTop: int = 0;
        let infoBottom: int = 0;
        let background: DisplayObject = null;
        let need: number = NaN;
        let fit: number = NaN;
        this._ioNewUi = GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly;
        this._ioZoom = new IoMapZoomControl(as3.bind(this, this.ioZoomStep), this.ioMinLevel());
        this._ioZoom.x = (this.mcFrame.x + this.mcFrame.width - 80 - 6 - this._ioZoom.width) | 0;
        this._ioZoom.y = (this.mcFrame.y - 8) | 0;
        this.addChild(this._ioZoom);
        if (GLOBAL.INFERNO_ONLY && !MapRoom._viewOnly) {
            // the world map's filters, left of the zoom buttons
            this._ioFilters = new IoMapFiltersPopup(as3.bind(this, this.ioFiltersChanged), (): boolean => {
                return MapRoomPopup.s_ioLod;
            });
            this._ioFilters.x = (this._ioZoom.x - 26 - 6) | 0;
            this._ioFilters.y = this._ioZoom.y;
            this.addChild(this._ioFilters);
        }
        this.addEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.ioOnWheel));
        if (!this._ioNewUi) {
            this._ioZoom.setLevel(this.ioLevel());
            return;
        }
        this.UpdateResourceDisplay();
        this.bBookmarks.visible = false;
        // Home and Jump under the resources, side by side in the middle; the search and the lists under them.
        this.bHome.x = (sideX + (sideW - (this.bHome.width + 8 + this.bJump.width)) * 0.5) | 0;
        this.bHome.y = (this.mcOutposts.y + 36) | 0;
        this.bJump.x = (this.bHome.x + this.bHome.width + 8) | 0;
        this.bJump.y = this.bHome.y;
        // Relocate: a new place on the map for the main yard, at the price of its resources and every
        // outpost (IoRelocate asks first).
        this._ioRelocate = new Button_CLIP();
        this._ioRelocate.Setup("Relocate", false, (this.bJump.x + this.bJump.width - this.bHome.x) | 0, this.bHome.height | 0);
        this._ioRelocate.name = "ioRelocate";
        this._ioRelocate.x = this.bHome.x;
        this._ioRelocate.y = (this.bHome.y + this.bHome.height + 6) | 0;
        this._ioRelocate.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ioRelocateClick));
        this.addChild(this._ioRelocate);
        sideTop = (this._ioRelocate.y + this._ioRelocate.height + 8) | 0;
        this._ioSidebar = new IoMapSidebar(this, sideW, (((this.mcFrame2.y + frame2H - 18) | 0) - sideTop) | 0);
        this._ioSidebar.x = sideX;
        this._ioSidebar.y = sideTop;
        this.addChild(this._ioSidebar);
        // The panel right of the map: as big as the sidebar's, as far from the map.
        this._ioRight = new frame_CLIP();
        // Under the map's frame (its art sits just below mcFrame): the frame's buttons stay on top.
        this.addChildAt(this._ioRight, Math.max(0, this.getChildIndex(this.mcFrame) - 1) | 0);
        this._ioRight.width = this.mcFrame2.width;
        this._ioRight.height = this.mcFrame2.height;
        rightX = this.mcFrame.x + this.mcFrame.width + gap;
        this._ioRight.x = rightX;
        this._ioRight.y = this.mcFrame2.y;
        this._ioRight.Setup(false);
        // The minimap at its top, the cell information under it, down to its bottom.
        this._ioMinimap = new IoMapMinimap(this.mcInfo.width | 0, as3.bind(this, this.ioMinimapPick));
        this._ioMinimap.x = (rightX + (this.mcFrame2.width - this._ioMinimap.size) * 0.5) | 0;
        this._ioMinimap.y = (this.mcFrame2.y + 18) | 0;
        this.addChild(this._ioMinimap);
        infoTop = (this._ioMinimap.y + this._ioMinimap.size + 12) | 0;
        infoBottom = (this.mcFrame2.y + frame2H - 18) | 0;
        this.mcInfo.x = this._ioMinimap.x;
        this.mcInfo.y = infoTop;
        background = this.mcInfo.numChildren > 0 ? this.mcInfo.getChildAt(0) : null;
        if (background && infoBottom - infoTop > background.height) {
            background.height = infoBottom - infoTop;
        }
        this._ioInfoHeight = (infoBottom - infoTop) | 0;
        this._ioInfoMore = IoMapUi.label("", 10, 0, false, ((this.mcInfo.width | 0) - 12) | 0);
        this._ioInfoMore.multiline = true;
        this._ioInfoMore.wordWrap = true;
        this._ioInfoMore.x = 6;
        this.mcInfo.addChild(this._ioInfoMore);
        this._ioInfoType = IoMapUi.label("", 10, 3355443, false, ((this.mcInfo.width | 0) - 14) | 0);
        this.mcInfo.addChild(this._ioInfoType);
        this._ioInfoRelation = IoMapUi.label("", 10, 3355443, false, ((this.mcInfo.width | 0) - 14) | 0);
        this.mcInfo.addChild(this._ioInfoRelation);
        // The picture almost as wide as the panel, the alliance's badge in its corner.
        this.mcInfo.mcProfilePic.scaleX = this.mcInfo.mcProfilePic.scaleY = (this.mcInfo.width - 10) / Math.max(1, Number(this.mcInfo.mcProfilePic.width));
        this.mcInfo.mcProfilePic.x = 5;
        this.mcInfo.mcProfilePic.y = 5;
        this.mcInfo.mcAlliancePic.scaleX = this.mcInfo.mcAlliancePic.scaleY = 0.8;
        this.mcInfo.mcAlliancePic.x = (5 + this.mcInfo.mcProfilePic.width - this.mcInfo.mcAlliancePic.width - 3) | 0;
        this.mcInfo.mcAlliancePic.y = (5 + this.mcInfo.mcProfilePic.height - this.mcInfo.mcAlliancePic.height - 3) | 0;
        this.addChild(this.mcInfo);
        // over the new panel's frame
        this.ioInfoEmpty();
        if (this._ioFilters) {
            this.addChild(this._ioFilters);
        }
        this._ioCoords = new Sprite();
        this._ioCoords.mouseEnabled = false;
        this._ioCoords.mouseChildren = false;
        this._ioCoordsText = IoMapUi.label("", 11, IoMapUi.LIGHT, false, 320);
        this._ioCoordsText.x = 10;
        this._ioCoordsText.y = 4;
        this._ioCoords.addChild(this._ioCoordsText);
        this.addChild(this._ioCoords);
        GLOBAL._ROOT.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ioStageDown), true);
        this.mcMask.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.ioMapOut));
        IoMapSnapshot.Request();
        // With the panel the window is wider than the game's own 760: on a narrower screen it is made
        // smaller to fit, around its middle.
        need = this.mcFrame2.width + gap + this.mcFrame.width + gap + this.mcFrame2.width + 2 * 55;
        if (!GLOBAL.isFullScreen && GLOBAL._ROOT.stage.stageWidth < need) {
            fit = Math.max(0.5, GLOBAL._ROOT.stage.stageWidth / need);
            this.scaleX = this.scaleY = fit;
            this.x = Math.round(380 * (1 - fit));
            this.y = Math.round(260 * (1 - fit));
        }
    }

    /** The cell information before the pointer has been over the map. */
    private ioInfoEmpty(): void {
        this.mcInfo.tOwner.htmlText = "";
        this.mcInfo.tAlliance.htmlText = "";
        this.mcInfo.tStatus.htmlText = "";
        this.mcInfo.tLocation.htmlText = "";
        this.mcInfo.tUserId.visible = false;
        this.mcInfo.mcAlliancePic.visible = false;
        this.ioInfoExtras("", "");
        this._ioInfoMore.htmlText = "<font color=\"#555555\">Point at a place on the map to see what is there.</font>";
        this.ioLayoutInfo();
        this.mcInfo.visible = true;
    }

    /** The type line (Main Yard, Outpost, Wild Monsters...) and the relation line (none without an alliance). */
    private ioInfoExtras(type: string, relation: string): void {
        this._ioInfoType.text = type;
        this._ioInfoType.visible = type.length > 0;
        this._ioInfoRelation.text = relation;
        this._ioInfoRelation.visible = relation.length > 0;
    }

    /**
     * The cell information, top to bottom: the picture, owner (level) with the type and user ID under it,
     * alliance with the relation under it, status, location, then anything more (being played or attacked).
     */
    private ioLayoutInfo(): void {
        let y: number = NaN;
        y = Number(5 + this.mcInfo.mcProfilePic.height + 5);
        let background: DisplayObject = this.mcInfo.numChildren > 0 ? this.mcInfo.getChildAt(0) : null;
        let line: Function = (field: TextField, x: int, step: int): void => {
            if (field.visible) {
                field.x = x;
                field.y = y;
                field.width = this.mcInfo.mcProfilePic.width - x + 5;
                y += step;
            }
        };
        line(this.mcInfo.labelOwner, 5, 13);
        line(this.mcInfo.tOwner, 10, 14);
        line(this._ioInfoType, 10, 14);
        line(this.mcInfo.tUserId, 10, 14);
        y += 3;
        line(this.mcInfo.labelAlliance, 5, 13);
        line(this.mcInfo.tAlliance, 10, 14);
        line(this._ioInfoRelation, 10, 14);
        y += 3;
        line(this.mcInfo.labelStatus, 5, 13);
        line(this.mcInfo.tStatus, 10, 15);
        y += 3;
        line(this.mcInfo.labelLocation, 5, 13);
        line(this.mcInfo.tLocation, 10, 17);
        this._ioInfoMore.y = y;
        this._ioInfoMore.height = Math.max(16, (background ? background.height : this._ioInfoHeight) - y - 4);
    }

    /** The lines of the cell information under the stock ones ("Label: value"). */
    private ioInfoLines(lines: any[]): void {
        let html: string = "";
        for (let line of as3.values(lines)) {
            html += "<b>" + line[0] + ":</b> " + IoMapUi.escape(String(line[1])) + "<br>";
        }
        this._ioInfoMore.htmlText = html;
    }

    /** The type of a place, as the cell information says it. */
    private static ioTypeName(base: int, water: boolean): string {
        if (water) {
            return "Lava";
        }
        return base == 0 ? "Open Ground" : (base == 1 ? "Wild Monsters" : (base == 2 ? "Main Yard" : "Outpost"));
    }

    /** How you stand with a yard's alliance, under the alliance's name. */
    private static ioRelationName(relation: int): string {
        return as3.str(relation == IoMapUi.YOU ? IoMapUi.RELATION_NAMES[IoMapUi.ALLY] : IoMapUi.RELATION_NAMES[relation]);
    }

    /** The cell under the pointer (the map): the lines the stock panel does not have. */
    private ioShowInfoMore(cell: MapRoomCell): void {
        let lines: any[] = [];
        let now: int = GLOBAL.Timestamp();
        let relation: string = "";
        if (cell._base >= 1 && cell._name) {
            this.mcInfo.tOwner.htmlText = IoMapUi.escape(cell._base == 1 ? TRIBES.DisplayName(cell._name) : cell._name) + " (" + cell._level + ")";
        }
        if (cell._base >= 2 && cell._alliance) {
            relation = MapRoomPopup.ioRelationName(cell._mine ? IoMapUi.YOU : IoMapUi.relation(cell._userID, cell._allianceID));
        }
        this.ioInfoExtras(MapRoomPopup.ioTypeName(cell._base, cell._water), relation);
        if (cell._base >= 2 && cell._locked != 0 && cell._locked != LOGIN._playerID) {
            lines.push(["Now", "Being played or attacked"]);
        }
        this.ioInfoLines(lines);
        this.ioLayoutInfo();
    }

    /** The world map: what the snapshot knows about the yard under the pointer, in the same panel. */
    private ioShowYardInfo(yard: any[]): void {
        let key: int = 0;
        let uid: int = 0;
        let player: any = null;
        let alliance: any = null;
        let relation: int = 0;
        let lines: any[] = [];
        let i: int = 0;
        if (!yard || !this._ioInfoMore) {
            return;
        }
        key = ((yard[0] | 0) * 10000 + (yard[1] | 0)) | 0;
        if (key == this._ioInfoYard) {
            return;
        }
        this._ioInfoYard = key;
        uid = yard[3] | 0;
        player = IoMapSnapshot.PlayerInfo(uid) || {};
        alliance = player.alliance | 0 ? IoMapSnapshot.AllianceInfo(player.alliance | 0) : null;
        relation = IoMapUi.relation(uid, player.alliance | 0);
        i = this.mcInfo.mcProfilePic.mcImage.numChildren | 0;
        while (i--) {
            this.mcInfo.mcProfilePic.mcImage.removeChildAt(i);
        }
        i = this.mcInfo.mcAlliancePic.mcImage.numChildren | 0;
        while (i--) {
            this.mcInfo.mcAlliancePic.mcImage.removeChildAt(i);
        }
        this.mcInfo.mcAlliancePic.visible = false;
        if (player.avatar && !GLOBAL._flags.viximo) {
            this.ProfilePicVix(String(player.avatar));
        }
        this.mcInfo.tOwner.htmlText = IoMapUi.escape(String(player.name || "?")) + " (" + (player.level | 0 || yard[11] | 0) + ")";
        this.mcInfo.tUserId.text = KEYS.Get("label_userid", { "v1": uid });
        this.mcInfo.tUserId.visible = true;
        this.mcInfo.tAlliance.htmlText = alliance ? IoMapUi.escape(String(alliance.name)) : "No alliance";
        this.mcInfo.tStatus.htmlText = (yard[8] | 0) > 0 ? "<font color=\"#FF0000\">" + KEYS.Get("newmap_inf_damaged", { "v1": yard[8] | 0 }) + "</font>" : "Fine";
        this.mcInfo.tLocation.htmlText = IoMapUi.location(yard[0] | 0, yard[1] | 0);
        this.mcInfo.visible = true;
        this.ioInfoExtras((yard[2] | 0) == 2 ? "Main Yard" : "Outpost", alliance ? MapRoomPopup.ioRelationName(relation) : "");
        if ((yard[12] | 0) != 0 && (yard[3] | 0) != LOGIN._playerID) {
            lines.push(["Now", "Being played or attacked"]);
        }
        this.ioInfoLines(lines);
        this.ioLayoutInfo();
    }

    private ioCleanupUi(): void {
        this.removeEventListener(MouseEvent.MOUSE_WHEEL, as3.bind(this, this.ioOnWheel));
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
            GLOBAL._ROOT.stage.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.ioStageDown), true);
            this.mcMask.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.ioMapOut));
        }
    }

    /** After a jump, a zoom or a change of view: the panels follow. */
    private ioViewChanged(): void {
        if (this._ioZoom) {
            this._ioZoom.setLevel(this.ioLevel());
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioUnderBanner();
        }
        if (this.ioLevel() == 0) {
            IoQuests.once("map_world");
        }
        if (!this._ioNewUi) {
            return;
        }
        this.ioPlacePanels();
        this.ioLodMoved();
    }

    private ioUnderBanner(): void {
        let text: TextField = null;
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
        this._ioUnderBanner.x = (this.mcMask.x + (this.mcMask.mcMask.width - 300) * 0.5) | 0;
        this._ioUnderBanner.y = (this.mcMask.y + 8) | 0;
        this.addChild(this._ioUnderBanner);
    }

    /** The coordinates in the map's bottom left corner. */
    private ioPlacePanels(e: Event = null): void {
        let bottom: int = (this.mcMask.y + this.ioMapHeight()) | 0;
        if (!this._ioNewUi) {
            return;
        }
        this._ioCoords.x = (this.mcMask.x + 10) | 0;
        this._ioCoords.y = (bottom - 36) | 0;
        this.ioUpdateCoords();
    }

    /** The view moved: the minimap's box and the coordinates follow. */
    private ioLodMoved(): void {
        let centre: Point = null;
        let scale: number = NaN;
        if (!this._ioNewUi) {
            return;
        }
        if (MapRoomPopup.s_ioLod && this._ioLod) {
            this._ioMinimap.setView(this._ioLod.centreX, this._ioLod.centreY, this._ioLod.spanCellsX, this._ioLod.spanCellsY);
        } else if (this._cellContainer) {
            centre = this.ioCentreCell();
            scale = this._cellContainer.scaleX;
            this._ioMinimap.setView(centre.x + 0.5, centre.y + 0.5, this.mcMask.mcMask.width / (this._cellWidth * 0.75 * scale), this.mcMask.mcMask.height / (this._cellHeight * scale));
        }
        this.ioUpdateCoords();
    }

    /** The middle of what the map shows, as a cell. */
    private ioViewCentre(): Point {
        if (MapRoomPopup.s_ioLod && this._ioLod) {
            return this._ioLod.centre;
        }
        return this.ioCentreCell();
    }

    private ioSetPointer(cellX: int, cellY: int): void {
        this._ioPointer = cellX >= 0 ? new Point(cellX, cellY) : null;
        this.ioUpdateCoords();
    }

    /** The pointer left the map: the coordinates stop showing it (the cell information stays). */
    private ioMapOut(e: MouseEvent): void {
        this._ioPointer = null;
        this.ioUpdateCoords();
    }

    /** The cell under the pointer, in the map's bottom left corner (nothing when the pointer is elsewhere). */
    private ioUpdateCoords(): void {
        let text: string = null;
        if (!this._ioCoords) {
            return;
        }
        this._ioCoords.visible = this._ioPointer != null;
        if (!this._ioPointer) {
            return;
        }
        text = "<b>" + IoMapUi.coord(this._ioPointer.x | 0, this._ioPointer.y | 0) + "</b>";
        if (this._ioCoords.name == text) {
            return;
        }
        this._ioCoords.name = text;
        this._ioCoordsText.htmlText = text;
        this._ioCoordsText.width = this._ioCoordsText.textWidth + 8;
        this._ioCoords.graphics.clear();
        IoMapUi.roundBox(this._ioCoords.graphics, 0, 0, this._ioCoordsText.width + 20, 26, IoMapUi.DARK, 0.94, 0x8C7552, 13, 1);
    }

    private ioMinimapPick(cellX: int, cellY: int, done: boolean): void {
        this.ioHideTransient();
        if (MapRoomPopup.s_ioLod && this._ioLod) {
            this._ioLod.centreOn(cellX + 0.5, cellY + 0.5);
        } else if (done) {
            this.JumpTo(new Point(cellX, cellY));
        }
    }

    /** A mouse press anywhere (before anything else hears it): open lists and bubbles elsewhere close. */
    private ioStageDown(e: MouseEvent): void {
        let target: DisplayObject = as3.as(e.target, DisplayObject);
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
    private ioHideTransient(): void {
        this.ioHideSpot();
        IoMapShare.HideChooser();
    }

    // ---- a place picked on the map
    /** A name for a place: the yard's owner, the tribe, or where it is. */
    private ioPlaceName(cell: MapRoomCell): string {
        if (cell && cell._base == 1 && cell._name) {
            return TRIBES.DisplayName(cell._name) + " " + cell._level;
        }
        if (cell && cell._base > 1 && cell._name) {
            return String(cell._name);
        }
        return cell ? IoMapUi.coord(cell.X, cell.Y) : "";
    }

    /** The map area, in this window's coordinates. */
    private ioMapArea(): Rectangle {
        return new Rectangle(this.mcMask.x, this.mcMask.y, this.mcMask.mcMask.width, this.ioMapHeight());
    }

    /** A click on an empty place (lava): a bubble with Share in chat and Bookmark (MapRoomCell). */
    public ioShowSpot(cell: MapRoomCell): void {
        let share: MovieClip = null;
        let cellX: int = 0;
        let cellY: int = 0;
        let area: Rectangle = null;
        let self: MapRoomPopup = null;
        let bubble: Sprite = new Sprite();
        let at: Point = null;
        let w: int = 216;
        let h: int = 72;
        let title: TextField = null;
        share = null;
        let mark: MovieClip = null;
        cellX = cell.X;
        cellY = cell.Y;
        area = this.ioMapArea();
        self = this;
        if (!this._ioNewUi || this._dragged) {
            return;
        }
        if (IoUnderworld.isVoid(cellX, cellY)) {
            return;
        }
        if (cell._ioPortal) {
            this.ioShowPortal(cell);
            return;
        }
        this.ioHideTransient();
        IoMapUi.glass(bubble.graphics, w, h, 9);
        title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, (w - 20) | 0);
        title.htmlText = "<b>" + (cell._water ? "Lava" : "Open ground") + "</b> <font color=\"#D9C49A\">at " + IoMapUi.coord(cellX, cellY) + "</font>";
        title.x = 10;
        title.y = 8;
        bubble.addChild(title);
        share = IoMapUi.button("Share in chat", 108, 26, (e: MouseEvent): void => {
            let p: Point = self.globalToLocal(share.localToGlobal(new Point(54, 0)));
            self.ioHideSpot();
            IoMapShare.ShowChooser(self, p.x, p.y + 8, area, cellX, cellY);
        }, "gold", 10);
        share.x = 10;
        share.y = 36;
        bubble.addChild(share);
        mark = IoMapUi.button("Bookmark", 80, 26, (e: MouseEvent): void => {
            self.ioHideSpot();
            self.ShowBookmarkAddPopup(cell);
        }, "grey", 10);
        mark.x = 126;
        mark.y = 36;
        bubble.addChild(mark);
        at = this.globalToLocal(cell.localToGlobal(new Point(this._cellWidth * 0.5, this._cellHeight * 0.5)));
        bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, at.x - w * 0.5)));
        bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, at.y - h - 24)));
        this.addChild(bubble);
        this._ioSpot = bubble;
    }

    /**
     * Inferno-only: a click on a portal (IoUnderworld). Up here: where it comes out below, and Enter (with a yard
     * that has the portal in its Flinger range, or an outpost below already). Below: where it comes out up here,
     * and Go up. Both: Share in chat.
     */
    private ioShowPortal(cell: MapRoomCell): void {
        let toX: int = 0;
        let toY: int = 0;
        let cellX: int = 0;
        let cellY: int = 0;
        let area: Rectangle = null;
        let self: MapRoomPopup = null;
        let share: MovieClip = null;
        let bubble: Sprite = new Sprite();
        let at: Point = null;
        let w: int = 300;
        let h: int = 112;
        let portal: any[] = cell._ioPortal;
        let below: boolean = IoUnderworld.isUnder(cell.X, cell.Y);
        let index: int = portal[0] | 0;
        toX = below ? portal[1] | 0 : portal[3] | 0;
        toY = below ? portal[2] | 0 : portal[4] | 0;
        // Anyone can go through to look (the user's rule, 4 October); attacking there still needs the range
        let reach: boolean = below || IoUnderworld.entryOpen(index) || IoUnderworld.hasOutpostBelow();
        cellX = cell.X;
        cellY = cell.Y;
        area = this.ioMapArea();
        self = this;
        let title: TextField = null;
        let text: TextField = null;
        let go: MovieClip = null;
        share = null;
        this.ioHideTransient();
        IoMapUi.glass(bubble.graphics, w, h, 9);
        title = IoMapUi.label("", 12, IoMapUi.LIGHT, false, (w - 20) | 0);
        title.htmlText = "<b>" + (below ? "Portal to the Inferno" : "Portal to the " + IoUnderworld.NAME) + "</b>";
        title.x = 10;
        title.y = 8;
        bubble.addChild(title);
        text = IoMapUi.label("", 11, IoMapUi.LIGHT_MUTED, false, (w - 20) | 0);
        text.htmlText = below ? "Comes out at " + IoMapUi.coord(toX, toY) + ". Next to it, your outposts attack up to " + IoUnderworld.exitRange + " cells from there." : "Comes out at " + IoMapUi.coord(toX, toY) + "." + (reach ? "" : " To attack down there, one of your yards needs this portal in its Flinger range.");
        text.wordWrap = true;
        text.multiline = true;
        text.height = 40;
        text.x = 10;
        text.y = 28;
        bubble.addChild(text);
        go = IoMapUi.button(below ? "Go up" : "Enter the " + IoUnderworld.NAME, 170, 26, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            self.ioGoTo(toX, toY);
        }, "gold", 10);
        go.name = "ioPortalGo";
        go.x = 10;
        go.y = h - 34;
        bubble.addChild(go);
        share = IoMapUi.button("Share in chat", 100, 26, (e: MouseEvent): void => {
            let p: Point = self.globalToLocal(share.localToGlobal(new Point(50, 0)));
            self.ioHideSpot();
            IoMapShare.ShowChooser(self, p.x, p.y + 8, area, cellX, cellY);
        }, "grey", 10);
        share.x = w - 110;
        share.y = h - 34;
        bubble.addChild(share);
        bubble.name = "ioPortalBubble";
        at = this.globalToLocal(cell.localToGlobal(new Point(this._cellWidth * 0.5, this._cellHeight * 0.5)));
        bubble.x = Math.round(Math.max(area.x + 4, Math.min(area.right - w - 4, at.x - w * 0.5)));
        bubble.y = Math.round(Math.max(area.y + 4, Math.min(area.bottom - h - 4, at.y - h - 24)));
        this.addChild(bubble);
        this._ioSpot = bubble;
    }

    /** Inferno-only: ioreach came (IoUnderworld): range drawn again, an open enemy popup worked out again. */
    public ioReachArrived(): void {
        this.Update(true);
        if (this._popupInfoEnemy && this._popupInfoEnemy.parent) {
            this._popupInfoEnemy.ioRefresh();
        }
    }

    private ioHideSpot(): void {
        if (this._ioSpot) {
            if (this._ioSpot.parent) {
                this._ioSpot.parent.removeChild(this._ioSpot);
            }
            this._ioSpot = null;
        }
    }

    /** A yard's popup: a "Share in chat" button under it, for the yard's place. */
    private ioAttachShare(popup: Sprite, cell: MapRoomCell): void {
        let button: MovieClip = null;
        let cellX: int = 0;
        let cellY: int = 0;
        let area: Rectangle = null;
        let self: MapRoomPopup = null;
        let old: DisplayObject = null;
        let bounds: Rectangle = null;
        button = null;
        cellX = cell.X;
        cellY = cell.Y;
        area = this.ioMapArea();
        self = this;
        if (!this._ioNewUi || !popup) {
            return;
        }
        old = popup.getChildByName("ioShare");
        if (old) {
            popup.removeChild(old);
        }
        bounds = popup.getBounds(popup);
        button = IoMapUi.button("Share this place in chat", 180, 26, (e: MouseEvent): void => {
            let p: Point = self.globalToLocal(button.localToGlobal(new Point(90, 0)));
            IoMapShare.ShowChooser(self, p.x, p.y, area, cellX, cellY);
        }, "gold", 10);
        button.name = "ioShare";
        button.x = Math.round(bounds.x + (bounds.width - 180) * 0.5);
        button.y = Math.round(bounds.bottom + 6);
        if (popup.y + button.y + 30 > area.bottom + 30) {
            button.y = Math.round(bounds.y - 32);
        }
        popup.addChild(button);
    }

    /** Marks a place for a moment (after going there from a search, a bookmark or chat). */
    public ioMarkSpot(cellX: int, cellY: int): void {
        let mark: Shape = null;
        let cell: MapRoomCell = this.ioCellAt(cellX, cellY);
        mark = null;
        let centre: Point = null;
        if (!cell || !this._cellContainer || MapRoomPopup.s_ioLod) {
            return;
        }
        mark = new Shape();
        mark.graphics.lineStyle(4, 16765514, 1);
        mark.graphics.drawEllipse(-58, -30, 116, 60);
        mark.graphics.lineStyle(2, 16777215, 0.9);
        mark.graphics.drawEllipse(-52, -26, 104, 52);
        centre = new Point(cell.x + this._cellWidth * 0.5, cell.y + this._cellHeight * 0.5 + 10);
        mark.x = centre.x;
        mark.y = centre.y;
        this._cellContainer.addChild(mark);
        mark.alpha = 0;
        TweenLite.to(mark, 0.35, { "alpha": 1 });
        TweenLite.to(mark, 0.6, { "alpha": 0, "delay": 2.2, "onComplete": (): void => {
            if (mark.parent) {
                mark.parent.removeChild(mark);
            }
        } });
    }

    // ---- for the sidebar
    /** Goes to a place: the map (not the world map), centred there, the place marked. */
    public ioGoTo(cellX: int, cellY: int): void {
        this.ioHideTransient();
        this.JumpTo(new Point(cellX, cellY));
        this.ioMarkSpot(cellX, cellY);
    }

    public ioGoHome(): void {
        this.ioHideTransient();
        MapRoom.JumpTo(GLOBAL._mapHome);
    }

    public ioFiltersChanged(): void {
        if (this._ioLod) {
            this._ioLod.Tick();
        }
    }

    public ioBookmarksChanged(): void {
        if (this._ioLod) {
            this._ioLod.Tick();
        }
    }

    private ContainerClick(param1: MouseEvent): void {
        this._dragged = false;
        this._containerClickPoint = new Point(this._cellContainer.x, this._cellContainer.y);
        this._mouseClickPoint = new Point(this.mouseX, this.mouseY);
        this._containerStartPoint = new Point(this._cellContainer.x, this._cellContainer.y);
        this._cellContainer.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ContainerMove));
    }

    private ContainerMove(param1: MouseEvent = null): void {
        let newX: int = (this._containerClickPoint.x - this._mouseClickPoint.x + this.mouseX) | 0;
        let newY: int = (this._containerClickPoint.y - this._mouseClickPoint.y + this.mouseY) | 0;

        if (this._cellContainer.x != newX || this._cellContainer.y != newY) {
            this._cellContainer.x = newX;
            this._cellContainer.y = newY;
        }
        if (!this._tempMovePoint) {
            this._tempMovePoint = new Point();
        }

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

    private ioContainerLeave(param1: Event): void {
        this.ContainerRelease(null);
    }

    private ContainerRelease(param1: MouseEvent): void {
        if (this._cellContainer) {
            this._cellContainer.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.ContainerMove));
            if (this._dragged) {
                this.Update();
            }
        }
        this._dragged = false;
    }

    public Tick(): void {
        let _loc1_: MapRoomCell = null;
        this.UpdateResourceDisplay();
        if (this._ioSidebar) {
            this._ioSidebar.Refresh();
        }
        if (this._ioMinimap) {
            this._ioMinimap.Redraw();
        }
        if (MapRoomPopup.s_ioLod) {
            // The world map: nothing on the cell grid is shown or asked for.
            if (this._ioLod) {
                this._ioLod.Tick();
            }
            return;
        }
        for (_loc1_ of as3.values(this._cells)) {
            _loc1_.Tick();
        }
        this.Update();
    }

    public Check(): void {
        let _loc1_: MapRoomCell = null;
        for (_loc1_ of as3.values(this._cells)) {
            _loc1_.Check();
        }
    }

    public Update(param1: boolean = false): void {
        let cellMoved: boolean = false;
        let anyCellMoved: boolean = false;
        let cellData: any = null;
        let cell: MapRoomCell = null;
        let i: int = 0;
        let homeCellVisible: boolean = false;
        let flingerRange: number = NaN;
        let oldCellKey: int = 0;
        let cellsWithRange: Vector<MapRoomCell> = null;
        let rangeCell: MapRoomCell = null;

        if (this._fullScreen && GLOBAL._ROOT.stage.displayState == StageDisplayState.NORMAL) {
            MapRoomManager.instance.ResizeHandler();
            this._fullScreen = false;
            return;
        }
        if (MapRoomPopup.s_ioLod) {
            return;
        }
        if ((!this._fallbackHomeCell._updated || param1) && this._fallbackHomeCell._dataAge <= 0) {
            cellData = MapRoom.GetCell(this._fallbackHomeCell.X, this._fallbackHomeCell.Y);
            if (cellData) {
                this._fallbackHomeCell.Setup(cellData);
            }
        }
        this._sortArray = [];

        let cellWidthFactor: number = this._cellWidth * 0.75;
        // At normal zoom viewScale is 1 and all of this is the stock arithmetic. Zoomed out, a cell's
        // on-screen position is its own position times the layer's scale, and the recycling window
        // is the scaled width / height of the whole grid, so cells still wrap seamlessly.
        let viewScale: number = this._cellContainer.scaleX;
        let leftBound: number = -(cellWidthFactor * 5);
        let rightBound: number = leftBound + this._cellCountX * cellWidthFactor * viewScale;
        let topBound: number = -(this._cellHeight * 5);
        let bottomBound: number = topBound + this._cellCountY * this._cellHeight * viewScale;
        let xWrapAmount: number = this._cellCountX * cellWidthFactor;
        let yWrapAmount: number = this._cellCountY * this._cellHeight;
        let containerX: number = this._cellContainer.x;
        let containerY: number = this._cellContainer.y;
        let notDragged: boolean = !this._dragged;
        let checkRange: boolean = !MapRoom._viewOnly;

        if (checkRange) {
            cellsWithRange = new Vector<MapRoomCell>(0, false, MapRoomCell);
        }

        for (cell of as3.values(this._cells)) {
            cellMoved = false;
            oldCellKey = (cell.X * 10000 + cell.Y) | 0;

            // Check right boundary
            if (containerX + cell.x * viewScale > rightBound) {
                cell.x -= xWrapAmount;
                cell.X -= this._cellCountX;

                if (cell.X < 0) {
                    cell.X += MapRoom._mapWidth;
                }
                cellMoved = true;
            }

            // Check bottom boundary
            if (containerY + cell.y * viewScale > bottomBound) {
                cell.y -= yWrapAmount;
                cell.Y -= this._cellCountY;

                if (cell.Y < 0) {
                    cell.Y += MapRoom._mapHeight;
                }
                cellMoved = true;
            }
            // Check left boundary
            if (containerX + cell.x * viewScale < leftBound) {
                cell.x += xWrapAmount;
                cell.X += this._cellCountX;

                if (cell.X > MapRoom._mapWidth - 1) {
                    cell.X -= MapRoom._mapWidth;
                }
                cellMoved = true;
            }
            // Check top boundary
            if (containerY + cell.y * viewScale < topBound) {
                cell.y += yWrapAmount;
                cell.Y += this._cellCountY;

                if (cell.Y > MapRoom._mapHeight - 1) {
                    cell.Y -= MapRoom._mapHeight;
                }
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
            cell.depth = (cell.y * 1000 + cell.x) | 0;
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
            as3.sortOn(this._sortArray, "depth", Array.NUMERIC);
            i = 0;
            while (i < this._sortArray.length) {
                if (this._cellContainer.getChildIndex(as3.cast(this._sortArray[i], DisplayObject)) != i) {
                    this._cellContainer.setChildIndex(as3.cast(this._sortArray[i], DisplayObject), i);
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
                flingerRange = BUILDING5.getFlingerRange(GLOBAL._playerFlingerLevel.Get() | 0, true);
                flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [flingerRange]);

                // Highlight the home cell itself (ApplyRangeHighlighting skips the origin)
                let homeCell: MapRoomCell = this.GetCell(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0);

                if (homeCell) {
                    if (!homeCell._over) {
                        homeCell.mc.mcGlow.alpha = 0.5;
                    }
                    homeCell._inRange = true;
                }

                this.ApplyRangeHighlighting(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0, flingerRange | 0);
            }

            for (rangeCell of (cellsWithRange ?? [])) {
                // Skip home cell if already highlighted above
                if (rangeCell.X == GLOBAL._mapHome.x && rangeCell.Y == GLOBAL._mapHome.y) {
                    continue;
                }

                if (rangeCell._ioUnder) {
                    // Inferno-only: an underworld outpost's range is 1, Declare War or not (IoUnderworld)
                    if (!this._dragged && !rangeCell._over) {
                        rangeCell.mc.mcGlow.alpha = 0.5;
                    }
                    rangeCell._inRange = true;
                    this.ApplyRangeHighlighting(rangeCell.X, rangeCell.Y, rangeCell._flingerRange.Get() | 0, true);
                    continue;
                }
                flingerRange = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [rangeCell._flingerRange.Get()]);
                this.ShowRange(rangeCell, flingerRange | 0);
            }
            if (GLOBAL.INFERNO_ONLY && !this._dragged) {
                // Inferno-only: what the player reaches through the portals, on this layer (IoUnderworld)
                for (let ioReach of as3.values(IoUnderworld.highlights())) {
                    this.ApplyRangeHighlighting(ioReach[0] | 0, ioReach[1] | 0, ioReach[2] | 0, true);
                }
            }
        }

        this.bBookmarks.Enabled = MapRoom._bookmarks.length > 0 || MapRoom._viewOnly;
        this.DisplayBuffs();
        this.ioLodMoved();
    }

    public ShowBubble(param1: MapRoomCell): void {
    }

    public HideBubble(): void {
        if (this._bubble.parent) {
            this._bubble.parent.removeChild(this._bubble);
        }
    }

    public ShowRange(param1: MapRoomCell, param2: int): void {
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
    private ApplyRangeHighlighting(startOffsetX: int, startOffsetY: int, range: int, ioNoBonus: boolean = false): void {
        let cell: MapRoomCell = null;
        let distance: int = 0;
        let currentOffsetX: int = 0;
        let currentOffsetY: int = 0;
        let baseRange: int = range;

        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL") && !ioNoBonus) {
            baseRange = (range - 2) | 0;
        }

        let startAxialQ: int = startOffsetX;
        let startAxialR: int = (startOffsetY - (startOffsetX - (startOffsetX & 1)) / 2) | 0;

        for (let deltaQ: int = (-range) | 0; deltaQ <= range; deltaQ++) {
            for (let deltaR: int = Math.max(-range, -deltaQ - range) | 0; deltaR <= Math.min(range, -deltaQ + range); deltaR++) {
                if (deltaQ == 0 && deltaR == 0) {
                    continue;
                }

                let currentAxialQ: int = (startAxialQ + deltaQ) | 0;
                let currentAxialR: int = (startAxialR + deltaR) | 0;

                distance = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(-deltaQ - deltaR)) | 0;

                currentOffsetX = currentAxialQ;
                currentOffsetY = (currentAxialR + (currentAxialQ - (currentAxialQ & 1)) / 2) | 0;

                cell = this.GetCell(currentOffsetX, currentOffsetY);

                if (cell && !cell._water) {
                    if (!cell._over) {
                        cell.mc.mcGlow.alpha = distance <= baseRange ? 0.5 : Math.max(Number(cell.mc.mcGlow.alpha), 0.35);
                    }
                    cell._inRange = true;
                }
            }
        }
    }

    private ioOffscreenCell(hexX: int, hexY: int): MapRoomCell {
        let zone: any = MapRoom.ioZoneCell(hexX, hexY);
        if (!zone.loaded) {
            this.ioOffscreenPending = true;
            return null;
        }
        let data: any = zone.data;
        if (!data || !data.mine) {
            return null;
        }
        let key: int = (hexX * 10000 + hexY) | 0;
        let entry: any = this._ioOffscreen[key];
        if (!entry || entry.data != data) {
            let made: MapRoomCell = new MapRoomCell();
            made.X = hexX;
            made.Y = hexY;
            made.Setup(data);
            entry = { "data": data, "cell": made };
            this._ioOffscreen[key] = entry;
        }
        return as3.as(entry.cell, MapRoomCell);
    }

    public GetCellsInRange(startOffsetX: int, startOffsetY: int, range: int): Vector<CellData> {
        let cells: Vector<CellData> = new Vector<CellData>(3 * range * (range + 1), true, CellData);
        let cellIndex: int = 0;

        // We convert to axial coordinates for easier calculations
        let startAxialQ: int = startOffsetX;
        let startAxialR: int = (startOffsetY - (startOffsetX - (startOffsetX & 1)) / 2) | 0;

        for (let deltaQ: int = (-range) | 0; deltaQ <= range; deltaQ++) {
            for (let deltaR: int = Math.max(-range, -deltaQ - range) | 0; deltaR <= Math.min(range, -deltaQ + range); deltaR++) {
                if (deltaQ == 0 && deltaR == 0) {
                    continue;
                }

                // Skip the origin
                let currentAxialQ: int = (startAxialQ + deltaQ) | 0;
                let currentAxialR: int = (startAxialR + deltaR) | 0;

                // Measure the distance as the maximum absolute value between q, r and s.
                let distance: int = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(-deltaQ - deltaR)) | 0;

                // Convert back to offsetted
                let currentOffsetX: int = currentAxialQ;
                let currentOffsetY: int = (currentAxialR + (currentAxialQ - (currentAxialQ & 1)) / 2) | 0;

                let cell: MapRoomCell = this.GetCell(currentOffsetX, currentOffsetY);

                as3.vset(cells, cellIndex, new CellData(cell, distance));
                cellIndex += 1;
            }
        }
        return cells;
    }

    private GetCell(hexX: int, hexY: int): MapRoomCell {
        if (hexX >= MapRoom._mapWidth) {
            hexX -= MapRoom._mapWidth;
        } else if (hexX < 0) {
            hexX = (MapRoom._mapWidth + hexX) | 0;
        }
        if (hexY >= MapRoom._mapHeight) {
            hexY -= MapRoom._mapHeight;
        } else if (hexY < 0) {
            hexY = (MapRoom._mapHeight + hexY) | 0;
        }

        let cell: MapRoomCell = as3.cast(this._cellLookup[hexX * 10000 + hexY], MapRoomCell);

        if (cell) {
            return cell;
        }

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

    public ShowInfoMine(param1: MapRoomCell): void {
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

    public HideInfoMine(): void {
        GLOBAL.BlockerRemove();
        if (this._popupInfoMine.parent) {
            this._popupInfoMine.parent.removeChild(this._popupInfoMine);
        }
        SOUNDS.Play("close");
    }

    public ShowInfoEnemy(param1: MapRoomCell, param2: boolean = false): void {
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

    public HideInfoEnemy(): void {
        GLOBAL.BlockerRemove();
        if (this._popupInfoEnemy.parent) {
            this._popupInfoEnemy.parent.removeChild(this._popupInfoEnemy);
        }
        SOUNDS.Play("close");
    }

    public ShowInfoViewOnly(param1: MapRoomCell, param2: boolean = false): void {
        if (!this._dragged) {
            SOUNDS.Play("click1");
            this._popupInfoViewOnly.Setup(param1, param2);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupInfoViewOnly);
        }
        this._dragged = false;
    }

    public HideInfoViewOnly(): void {
        GLOBAL.BlockerRemove();
        if (this._popupInfoViewOnly.parent) {
            this._popupInfoViewOnly.parent.removeChild(this._popupInfoViewOnly);
        }
        SOUNDS.Play("close");
    }

    public ShowInfoDestroyed(param1: MapRoomCell): void {
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

    public HideTransferB(): void {
    }

    public ShowMonstersA(param1: MapRoomCell, param2: boolean = false): void {
        SOUNDS.Play("click1");
        this.HideBookmarkMenu();
        this.HideInfoMine();
        this._popupMonsters.Setup(param1, param2);
        GLOBAL.BlockerAdd(this);
        this.addChild(this._popupMonsters);
    }

    public HideMonstersA(): void {
        if (this._popupMonsters.parent) {
            this._popupMonsters.parent.removeChild(this._popupMonsters);
        }
        GLOBAL.BlockerRemove();
        SOUNDS.Play("close");
    }

    public ShowMonstersB(param1: any, param2: MapRoomCell): void {
        SOUNDS.Play("click1");
        this.HideBookmarkMenu();
        this._popupMonstersB.Setup(param1, param2);
        GLOBAL.BlockerAdd(this);
        this.addChild(this._popupMonstersB);
    }

    public HideMonstersB(): void {
        GLOBAL.BlockerRemove();
        if (Boolean(this._popupMonstersB) && Boolean(this._popupMonstersB.parent)) {
            this._popupMonstersB.parent.removeChild(this._popupMonstersB);
        }
        SOUNDS.Play("close");
    }

    public ShowAttack(param1: MapRoomCell): void {
        SOUNDS.Play("click1");
        this.HideBookmarkMenu();
        if (param1 && (GLOBAL.ioTestMode() || !param1._protected && !(param1._truce && param1._truce > GLOBAL.Timestamp()))) {
            this._popupAttackA.Setup(param1);
            GLOBAL.BlockerAdd(this);
            this.addChild(this._popupAttackA);
        } else if (param1._protected) {
            GLOBAL.Message(KEYS.Get("newmap_dp"));
        } else if (Boolean(param1._truce) && param1._truce > GLOBAL.Timestamp()) {
            GLOBAL.Message(KEYS.Get("newmap_truce"));
        }
    }

    public HideAttack(): void {
        GLOBAL.BlockerRemove();
        if (this._popupAttackA.parent) {
            this._popupAttackA.parent.removeChild(this._popupAttackA);
        }
        SOUNDS.Play("close");
    }

    public ShowBookmarkMenu(param1: MouseEvent): void {
        let menuItem: MapRoomBookmark = null;
        let InBookmarkRemove: Function = null;
        let inBookmarkSelect: Function = null;
        let length: int = 0;
        let newY: int = 0;
        menuItem = null;
        let i: int = 0;
        InBookmarkRemove = null;
        inBookmarkSelect = null;
        let e: MouseEvent = param1;
        SOUNDS.Play("click1");
        if (!this._menuShown && MapRoom._bookmarks.length > 0) {
            length = MapRoom._bookmarks.length | 0;
            newY = this.bBookmarks.y | 0;
            i = 0;
            while (i < length) {
                InBookmarkRemove = (param1: MouseEvent): void => {
                    this.BookmarkRemove(param1.target.index | 0);
                    menuItem.bDelete.removeEventListener(MouseEvent.CLICK, InBookmarkRemove);
                };
                inBookmarkSelect = (param1: MouseEvent): void => {
                    this.BookmarkSelect(param1.target.index | 0);
                    menuItem.mcBG.removeEventListener(MouseEvent.CLICK, inBookmarkSelect);
                };
                menuItem = new MapRoomBookmark();
                menuItem.mcBG.index = i;
                menuItem.x = this.bBookmarks.x + 115;
                menuItem.y = newY;
                newY = (newY + menuItem.height) | 0;
                menuItem.tName.mouseEnabled = false;
                menuItem.bDelete.index = i;
                menuItem.bDelete.addEventListener(MouseEvent.CLICK, InBookmarkRemove);
                menuItem.bDelete.buttonMode = true;
                menuItem.mcBG.addEventListener(MouseEvent.CLICK, inBookmarkSelect);
                menuItem.tName.htmlText = as3.str(MapRoom._bookmarks[i].name);
                menuItem.visible = true;
                this._popupBookmarkMenu[i] = menuItem;
                this.addChild(as3.cast(this._popupBookmarkMenu[i], DisplayObject));
                i++;
            }
            this._menuShown = true;
        } else {
            this.HideBookmarkMenu();
        }
    }

    public HideBookmarkMenu(): void {
        let _loc1_: int = 0;
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

    public JumpToCoordinate(param1: string, param2: string): string {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        if (GLOBAL.INFERNO_ONLY) {
            // Everything that is not a digit is dropped before the numbers are read: spaces, brackets, and
            // the minus signs players may still type (coordinates were shown as negatives until 4 October).
            param1 = param1 ? param1.replace(/[^0-9]/g, "") : "";
            param2 = param2 ? param2.replace(/[^0-9]/g, "") : "";
        }
        let _loc3_: number = param1 == "" ? NaN : Number(param1);
        let _loc4_: number = param2 == "" ? NaN : Number(param2);
        if (!isNaN(_loc3_) && !isNaN(_loc4_)) {
            _loc5_ = _loc3_ | 0;
            _loc6_ = _loc4_ | 0;
            // (Inferno-only: typed coordinates are the overworld's, also while the map shows the underworld)
            if (_loc5_ >= 0 && _loc5_ < (IoUnderworld.under ? 400 : MapRoom._mapWidth) && _loc6_ >= 0 && _loc6_ <= (IoUnderworld.under ? 400 : MapRoom._mapHeight)) {
                MapRoom._homePoint = new Point(_loc5_, _loc6_);
                MapRoom.JumpTo(MapRoom._homePoint);
                if (GLOBAL.INFERNO_ONLY) {
                    IoQuests.once("map_jump");
                }
                return "";
            }
            return KEYS.Get("map_coordinateoffmap");
        }
        return KEYS.Get("map_notanumber");
    }

    public BookmarkSelect(param1: int): void {
        this.HideBookmarkMenu();
        if (MapRoom._bookmarks.length > param1) {
            MapRoom.JumpTo(as3.cast(MapRoom._bookmarks[param1].location, Point));
        }
    }

    public BookmarkRemove(param1: int): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        MapRoom._bookmarks.splice(param1, 1);
        if (this._popupBookmarkMenu[param1].parent) {
            this._popupBookmarkMenu[param1].parent.removeChild(this._popupBookmarkMenu[param1]);
        }
        this._popupBookmarkMenu.splice(param1, 1);
        if (MapRoom._bookmarks.length > 0) {
            _loc2_ = MapRoom._bookmarks.length | 0;
            _loc3_ = param1;
            while (_loc3_ < _loc2_) {
                --this._popupBookmarkMenu[_loc3_].mcBG.index;
                this._popupBookmarkMenu[_loc3_].y -= this._popupBookmarkMenu[_loc3_].height;
                MapRoom.BookmarkDataSet("mbm" + _loc3_, (MapRoom._bookmarks[_loc3_].location.x * 10000 + MapRoom._bookmarks[_loc3_].location.y) | 0, false);
                MapRoom.BookmarkDataSetStr("mbmn" + _loc3_, as3.str(MapRoom._bookmarks[_loc3_].name), false);
                _loc3_++;
            }
            MapRoom.BookmarkDataSet("mbms", _loc2_, false);
            MapRoom.BookmarkDataSet("mbm" + _loc2_, 0, false);
            MapRoom.BookmarkDataSetStr("mbmn" + _loc2_, "", false);
            MapRoom.BookmarksSave();
        } else {
            MapRoomManager.instance.BookmarksClear();
            this._menuShown = false;
        }
    }

    public ShowBookmarkAddPopup(param1: MapRoomCell): void {
        SOUNDS.Play("click1");
        MapRoom._currentPosition = new Point(param1.X, param1.Y);
        this._popupBookmarkAdd.tName.htmlText = this._ioNewUi && (param1._base <= 1 || !param1._name) ? IoMapUi.escape(this.ioPlaceName(param1)) : KEYS.Get("map_yardowner", { "v1": param1._name });
        this._popupBookmarkAdd.tMessage.htmlText = KEYS.Get("newmap_bm_add");
        this._popupBookmarkAdd.bSave.SetupKey("btn_save");
        this._popupBookmarkAdd.bSave.addEventListener(MouseEvent.CLICK, as3.bind(this, this.HideBookmarkAddPopupWithAdd));
        GLOBAL.BlockerAdd(this);
        this.addChild(this._popupBookmarkAdd);
    }

    public ShowRelocateMePopup(param1: MapRoomCell): void {
        SOUNDS.Play("click1");
        this._popupRelocateMe.Setup(param1);
        GLOBAL.BlockerAdd(this);
        this.addChild(this._popupRelocateMe);
    }

    public HideBookmarkAddPopup(param1: MouseEvent = null): void {
        if (this._popupBookmarkAdd.parent) {
            this._popupBookmarkAdd.parent.removeChild(this._popupBookmarkAdd);
        }
        GLOBAL.BlockerRemove();
    }

    public HideBookmarkAddPopupWithAdd(param1: MouseEvent): void {
        GLOBAL.BlockerRemove();
        let _loc2_: any = MapRoom.AddBookmark(this._popupBookmarkAdd.tName.text);
        if (_loc2_.hide && this._popupBookmarkAdd && Boolean(this._popupBookmarkAdd.parent)) {
            this._popupBookmarkAdd.parent.removeChild(this._popupBookmarkAdd);
        }
        if (_loc2_.message != "SUCCESS") {
            GLOBAL.Message(as3.str(_loc2_.message));
        } else if (this._ioSidebar) {
            this._ioSidebar.Refresh(true);
            this.ioBookmarksChanged();
        }
        SOUNDS.Play("close");
    }

    public DisplayBuffs(): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: any = null;
        let _loc12_: string = null;
        let _loc13_: MovieClip = null;
        let powerup: number = POWERUPS.CheckPowers(null, "NORMAL");

        if (powerup == this._lastBuffCount) {
            return;
        }

        this._lastBuffCount = powerup;

        let _loc2_: int = this.mcBuffHolder.numChildren;
        while (_loc2_--) {
            this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.BuffShow));
            this.mcBuffHolder.getChildAt(_loc2_).removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.BuffHide));
            this.mcBuffHolder.removeChildAt(_loc2_);
        }
        if (powerup > 0) {
            _loc3_ = 3;
            _loc4_ = 2;
            _loc5_ = (-1 * (32 + 4)) | 0;
            _loc6_ = (32 + 4) | 0;
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
                _loc13_.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.BuffShow));
                _loc13_.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.BuffHide));
                this.mcBuffHolder.addChild(_loc13_);
            }
        } else {
            this.BuffHide(null);
        }
    }

    public BuffShow(param1: MouseEvent): void {
        let _loc7_: bubblepopupBuff = null;
        let _loc2_: MovieClip = as3.as(param1.currentTarget, MovieClip);
        let _loc3_: string = "";
        let _loc4_: any = "";
        let _loc5_: any = _loc2_.name + "_desc";
        let _loc6_: string = "buff_duration";
        _loc3_ = KEYS.Get(as3.str(_loc5_));
        _loc4_ = "<b>" + KEYS.Get(_loc6_) + "</b>";
        if (POWERUPS._expireRealTime) {
            if (POWERUPS.Timeleft(_loc2_.name) > 0) {
                _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name) | 0, true);
            } else {
                _loc4_ = "";
            }
        } else if (POWERUPS.Timeleft(_loc2_.name) > 0) {
            _loc4_ += GLOBAL.ToTime(POWERUPS.Timeleft(_loc2_.name) | 0, true);
        } else {
            _loc4_ = "";
        }
        if (!this._popupBuff) {
            _loc7_ = new bubblepopupBuff();
            this._popupBuff = as3.as(this.addChild(_loc7_), bubblepopupBuff);
            _loc7_.Setup((_loc2_.x + _loc2_.width / 2) | 0, (_loc2_.y + _loc2_.height + 4) | 0, _loc3_, as3.str(_loc4_));
            _loc7_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2);
            if (_loc7_.x >= this.mcBuffHolder.x) {
                _loc7_.x = this.mcBuffHolder.x + (_loc2_.x + _loc2_.width / 2) - 60;
                _loc7_.mcArrow.x = 60;
            }
            _loc7_.y = this.mcBuffHolder.y + (_loc2_.y + _loc2_.height + 4);
        } else {
            as3.cast(this._popupBuff, bubblepopupBuff).Update(_loc3_, as3.str(_loc4_));
        }
    }

    public BuffHide(param1: MouseEvent): void {
        if (this._popupBuff) {
            this.removeChild(this._popupBuff);
            as3.cast(this._popupBuff, bubblepopupBuff).Cleanup();
            this._popupBuff = null;
        }
    }

    public BuffOff(param1: MouseEvent): void {
        POWERUPS._testToggleOffPowers = true;
        let _loc2_: MovieClip = as3.as(param1.currentTarget, MovieClip);
        POWERUPS.Remove(_loc2_.name);
        this.BuffHide(null);
    }

    public Help(): void {
        Tutorial.ForceShowAll();
    }

    public FullScreen(): void {
        if (GLOBAL.isFullScreen) {
            this._fullScreen = true;
        } else {
            this._fullScreen = false;
        }
        MapRoomManager.instance.ResizeHandler();
    }

    public Resize(): void {
        let _loc1_: boolean = false;
        if (GLOBAL.isFullScreen) {
            if (this._fullScreen != true) {
                _loc1_ = true;
            }
        } else if (this._fullScreen != false) {
            _loc1_ = true;
        }
        if (_loc1_) {
            MapRoomManager.instance.ResizeHandler();
        }
    }
}
