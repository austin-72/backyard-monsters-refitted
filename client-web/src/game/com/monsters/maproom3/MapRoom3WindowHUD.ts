import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, Sprite, StageDisplayState } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, Bookmark, BookmarkDisplay, BookmarksDisplayList, BookmarksExpandableFrame, BookmarksManager, BookmarksPopup, Chat, EnumYardType, GLOBAL, KEYS, MapRoom3, MapRoom3AssetCache, MapRoom3Cell, MapRoom3ResourcesDisplay, Maproom3JumpPopup, POPUPS, ScaleBitmap, StoneButton, UI_BOTTOM, bubblepopup5 } from "@game";

export class MapRoom3WindowHUD extends Sprite {
    static {
        as3.fields(this, { m_ResourcesDisplay: null, m_OptionButtonsBar: null, m_ZoomOutButton: null, m_ZoomInButton: null, m_FullscreenButton: null, m_OptionButtonToolTip: null, m_LeftMenuButtonsBar: null, m_LeftMenuButtonsContainerBackground: null, m_BookmarksButton: null, m_JumpButton: null, m_CoordinatesPanel: null, m_CoordinatesBackground: null, m_CoordinatesLabel: null, m_RightMenuButtonsBar: null, m_RightMenuButtonsContainerBackground: null, m_FindBaseButton: null, m_EnterBaseButton: null, m_BookmarksBar: null, m_ResourceBookmarksBar: null, m_ResourceBookmarksDisplayList: null, m_StrongholdBookmarksBar: null, m_StrongholdBookmarksDisplayList: null, m_BookmarksPopup: null });
    }

    private static readonly MENU_BUTTONS_BAR_MARGIN_WIDTH: uint = 10;

    private static readonly MENU_BUTTONS_BAR_BUTTON_SPACING: uint = 10;

    private static readonly OPTION_BUTTONS_BAR_PADDING_RIGHT: uint = 10;

    private static readonly OPTION_BUTTONS_BAR_PADDING_TOP: uint = 10;

    private static readonly OPTION_BUTTONS_BAR_BUTTON_SPACING: uint = 5;

    private static readonly BOOKMARKS_BAR_SPACING: uint = 10;

    private static readonly MAX_BOOKMARKS_DISPLAY_LIST_LENGTH: uint = 3;

    private static readonly REOURCE_BAR_WIDTH: uint = 90;

    private static readonly ZOOM_TIME: number = 1;
    private m_ResourcesDisplay: MapRoom3ResourcesDisplay;
    private m_OptionButtonsBar: Sprite;
    private m_ZoomOutButton: Sprite;
    private m_ZoomInButton: Sprite;
    private m_FullscreenButton: Sprite;
    private m_OptionButtonToolTip: bubblepopup5;
    private m_LeftMenuButtonsBar: Sprite;
    private m_LeftMenuButtonsContainerBackground: ScaleBitmap;
    private m_BookmarksButton: StoneButton;
    private m_JumpButton: StoneButton;
    private m_CoordinatesPanel: Sprite;
    private m_CoordinatesBackground: Bitmap;
    private m_CoordinatesLabel: TextField;
    private m_RightMenuButtonsBar: Sprite;
    private m_RightMenuButtonsContainerBackground: ScaleBitmap;
    private m_FindBaseButton: StoneButton;
    private m_EnterBaseButton: StoneButton;
    private m_BookmarksBar: Sprite;
    private m_ResourceBookmarksBar: BookmarksExpandableFrame;
    private m_ResourceBookmarksDisplayList: BookmarksDisplayList;
    private m_StrongholdBookmarksBar: BookmarksExpandableFrame;
    private m_StrongholdBookmarksDisplayList: BookmarksDisplayList;
    private m_BookmarksPopup: BookmarksPopup;

    public $ctor(): void {
        let _loc1_: BitmapData = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: Vector<Bookmark> = null;
        let _loc9_: Vector<Bookmark> = null;
        this.m_BookmarksPopup = new BookmarksPopup();
        super.$ctor();
        this.m_ResourcesDisplay = new MapRoom3ResourcesDisplay();
        this.m_ResourcesDisplay.mouseEnabled = false;
        this.m_ResourcesDisplay.mouseChildren = false;
        this.m_ResourcesDisplay.gotoAndStop(BASE.isInfernoMainYardOrOutpost ? 2 : 1);
        this.addChild(this.m_ResourcesDisplay);
        this.m_OptionButtonsBar = new Sprite();
        this.m_OptionButtonsBar.buttonMode = true;
        this.addChild(this.m_OptionButtonsBar);
        this.m_ZoomOutButton = new Sprite();
        this.m_ZoomOutButton.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BUTTON_ZOOM_OUT)));
        this.m_ZoomOutButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomOutButtonClicked), false, 0, true);
        this.m_ZoomOutButton.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnZoomOutButtonMouseOver), false, 0, true);
        this.m_ZoomOutButton.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnZoomOutButtonMouseOut), false, 0, true);
        this.m_OptionButtonsBar.addChild(this.m_ZoomOutButton);
        this.m_ZoomInButton = new Sprite();
        this.m_ZoomInButton.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BUTTON_ZOOM_IN)));
        this.m_ZoomInButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomInButtonClicked), false, 0, true);
        this.m_ZoomInButton.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnZoomInButtonMouseOver), false, 0, true);
        this.m_ZoomInButton.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnZoomInButtonMouseOut), false, 0, true);
        this.m_ZoomInButton.visible = false;
        this.m_OptionButtonsBar.addChild(this.m_ZoomInButton);
        this.m_FullscreenButton = new Sprite();
        this.m_FullscreenButton.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BUTTON_FULL_SCREEN)));
        this.m_FullscreenButton.x = this.m_ZoomInButton.width + MapRoom3WindowHUD.OPTION_BUTTONS_BAR_BUTTON_SPACING;
        this.m_FullscreenButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnFullscreenButtonClicked), false, 0, true);
        this.m_FullscreenButton.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnFullscreenButtonMouseOver), false, 0, true);
        this.m_FullscreenButton.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnFullscreenButtonMouseOut), false, 0, true);
        this.m_OptionButtonsBar.addChild(this.m_FullscreenButton);
        this.m_OptionButtonToolTip = new bubblepopup5();
        this.m_OptionButtonToolTip.visible = false;
        this.m_OptionButtonToolTip.mouseEnabled = false;
        this.m_OptionButtonToolTip.mouseChildren = false;
        this.m_OptionButtonToolTip.mcText.autoSize = TextFieldAutoSize.LEFT;
        this.addChild(this.m_OptionButtonToolTip);
        _loc1_ = MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BUTTONS_BAR_BACKGROUND);
        this.m_LeftMenuButtonsBar = new Sprite();
        this.addChild(this.m_LeftMenuButtonsBar);
        this.m_LeftMenuButtonsContainerBackground = new ScaleBitmap(_loc1_);
        this.m_LeftMenuButtonsBar.addChild(this.m_LeftMenuButtonsContainerBackground);
        this.m_BookmarksButton = new StoneButton();
        this.m_BookmarksButton.SetupKey("mr3_bookmarks_button", 12);
        this.m_BookmarksButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnBookmarksButtonClicked));
        this.m_LeftMenuButtonsBar.addChild(this.m_BookmarksButton);
        this.m_JumpButton = new StoneButton();
        this.m_JumpButton.SetupKey("btn_jump", 12);
        this.m_JumpButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnJumpButtonClicked));
        this.m_LeftMenuButtonsBar.addChild(this.m_JumpButton);
        this.m_CoordinatesPanel = new Sprite();
        this.m_LeftMenuButtonsBar.addChild(this.m_CoordinatesPanel);
        this.m_CoordinatesBackground = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_COORDINATES_BACKGROUND));
        this.m_CoordinatesPanel.addChild(this.m_CoordinatesBackground);
        let _loc2_: TextFormat = new TextFormat();
        _loc2_.color = 16777215;
        _loc2_.font = "Verdana";
        _loc2_.size = 12;
        _loc2_.align = TextFormatAlign.CENTER;
        this.m_CoordinatesLabel = new TextField();
        this.m_CoordinatesLabel.defaultTextFormat = _loc2_;
        this.m_CoordinatesLabel.selectable = false;
        this.m_CoordinatesLabel.y = 10;
        this.m_CoordinatesLabel.width = this.m_CoordinatesBackground.width;
        this.m_CoordinatesLabel.height = this.m_CoordinatesBackground.height;
        this.m_CoordinatesPanel.addChild(this.m_CoordinatesLabel);
        this.m_RightMenuButtonsBar = new Sprite();
        this.addChild(this.m_RightMenuButtonsBar);
        this.m_RightMenuButtonsContainerBackground = new ScaleBitmap(_loc1_);
        this.m_RightMenuButtonsBar.addChild(this.m_RightMenuButtonsContainerBackground);
        this.m_FindBaseButton = new StoneButton();
        this.m_FindBaseButton.SetupKey("mr3_find_base", 12);
        this.m_FindBaseButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnFindBaseButtonClicked));
        this.m_RightMenuButtonsBar.addChild(this.m_FindBaseButton);
        this.m_EnterBaseButton = new StoneButton();
        this.m_EnterBaseButton.SetupKey("mr3_exit_to_base", 12);
        this.m_EnterBaseButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnEnterBaseButtonClicked));
        this.m_RightMenuButtonsBar.addChild(this.m_EnterBaseButton);
        _loc3_ = (this.m_LeftMenuButtonsContainerBackground.height * 0.5) | 0;
        _loc4_ = (this.m_BookmarksButton.getButtonHeight() * 0.5) | 0;
        _loc5_ = (_loc3_ - _loc4_) | 0;
        _loc6_ = MapRoom3WindowHUD.MENU_BUTTONS_BAR_MARGIN_WIDTH | 0;
        this.m_BookmarksButton.x = _loc6_;
        this.m_BookmarksButton.y = _loc5_;
        _loc6_ = (_loc6_ + (this.m_BookmarksButton.getButtonWidth() + MapRoom3WindowHUD.MENU_BUTTONS_BAR_BUTTON_SPACING)) | 0;
        this.m_JumpButton.x = _loc6_;
        this.m_JumpButton.y = _loc5_;
        _loc6_ = (_loc6_ + (this.m_JumpButton.getButtonWidth() + MapRoom3WindowHUD.MENU_BUTTONS_BAR_BUTTON_SPACING)) | 0;
        this.m_CoordinatesPanel.x = _loc6_;
        this.m_CoordinatesPanel.y = _loc5_;
        _loc6_ = (_loc6_ + (this.m_CoordinatesPanel.width + MapRoom3WindowHUD.MENU_BUTTONS_BAR_MARGIN_WIDTH)) | 0;
        this.m_LeftMenuButtonsContainerBackground.width = _loc6_;
        _loc6_ = MapRoom3WindowHUD.MENU_BUTTONS_BAR_MARGIN_WIDTH | 0;
        this.m_FindBaseButton.x = _loc6_;
        this.m_FindBaseButton.y = _loc5_;
        _loc6_ = (_loc6_ + (this.m_FindBaseButton.getButtonWidth() + MapRoom3WindowHUD.MENU_BUTTONS_BAR_BUTTON_SPACING)) | 0;
        this.m_EnterBaseButton.x = _loc6_;
        this.m_EnterBaseButton.y = _loc5_;
        _loc6_ = (_loc6_ + (this.m_EnterBaseButton.getButtonWidth() + MapRoom3WindowHUD.MENU_BUTTONS_BAR_MARGIN_WIDTH)) | 0;
        this.m_RightMenuButtonsContainerBackground.width = _loc6_;
        this.m_BookmarksBar = new Sprite();
        this.addChild(this.m_BookmarksBar);
        _loc7_ = BookmarksManager.instance.GetBookmarksOfType(BookmarksManager.TYPE_PLAYER_RESOURCES);
        let _loc8_: string = KEYS.Get("mr3_resource_bookmarks_header", { "v1": _loc7_.length });
        this.m_ResourceBookmarksDisplayList = new BookmarksDisplayList(_loc7_, as3.bind(this, this.CreateNewResourceBookmarkDisplay), MapRoom3WindowHUD.MAX_BOOKMARKS_DISPLAY_LIST_LENGTH);
        this.m_ResourceBookmarksBar = new BookmarksExpandableFrame(this.m_ResourceBookmarksDisplayList, _loc8_, this.m_ResourceBookmarksDisplayList.maxDisplayListHeight | 0);
        this.m_ResourceBookmarksBar.frameHeader.addEventListener(MouseEvent.CLICK, as3.bind(this.m_ResourceBookmarksDisplayList, this.m_ResourceBookmarksDisplayList.NavigateToNextBookmark), false, 0, true);
        this.m_BookmarksBar.addChild(this.m_ResourceBookmarksBar);
        _loc9_ = BookmarksManager.instance.GetBookmarksOfType(BookmarksManager.TYPE_PLAYER_STRONGHOLDS);
        let _loc10_: string = KEYS.Get("mr3_stronghold_bookmarks_header", { "v1": _loc9_.length });
        this.m_StrongholdBookmarksDisplayList = new BookmarksDisplayList(_loc9_, as3.bind(this, this.CreateNewStrongholdBookmarkDisplay), MapRoom3WindowHUD.MAX_BOOKMARKS_DISPLAY_LIST_LENGTH);
        this.m_StrongholdBookmarksBar = new BookmarksExpandableFrame(this.m_StrongholdBookmarksDisplayList, _loc10_, this.m_StrongholdBookmarksDisplayList.maxDisplayListHeight | 0);
        this.m_StrongholdBookmarksBar.frameHeader.addEventListener(MouseEvent.CLICK, as3.bind(this.m_StrongholdBookmarksDisplayList, this.m_StrongholdBookmarksDisplayList.NavigateToNextBookmark), false, 0, true);
        this.m_StrongholdBookmarksBar.x = this.m_ResourceBookmarksBar.width + MapRoom3WindowHUD.BOOKMARKS_BAR_SPACING;
        this.m_BookmarksBar.addChild(this.m_StrongholdBookmarksBar);
        this.UpdateResourcesDisplay();
        this.PositionHUDElements();
    }

    public get bookmarksPopup(): BookmarksPopup {
        return this.m_BookmarksPopup;
    }

    private CreateNewResourceBookmarkDisplay(param1: Bookmark, param2: int): BookmarkDisplay {
        let _loc3_: string = !(!(param2 % 2)) ? "bgDark" : "bgLight";
        return new BookmarkDisplay(param1, _loc3_, MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BOOKMARK_THUMBNAIL_RESOURCE));
    }

    private CreateNewStrongholdBookmarkDisplay(param1: Bookmark, param2: int): BookmarkDisplay {
        let _loc3_: string = !(!(param2 % 2)) ? "bgDark" : "bgLight";
        return new BookmarkDisplay(param1, _loc3_, MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.HUD_BOOKMARK_THUMBNAIL_STRONGHOLD));
    }

    public Clear(): void {
        this.m_BookmarksPopup.Hide();
        this.m_BookmarksPopup = null;
        this.m_BookmarksBar.removeChild(this.m_StrongholdBookmarksBar);
        this.m_BookmarksBar.removeChild(this.m_ResourceBookmarksBar);
        this.removeChild(this.m_BookmarksBar);
        this.m_StrongholdBookmarksBar.frameHeader.removeEventListener(MouseEvent.CLICK, as3.bind(this.m_StrongholdBookmarksDisplayList, this.m_StrongholdBookmarksDisplayList.NavigateToNextBookmark));
        this.m_ResourceBookmarksBar.frameHeader.removeEventListener(MouseEvent.CLICK, as3.bind(this.m_ResourceBookmarksDisplayList, this.m_ResourceBookmarksDisplayList.NavigateToNextBookmark));
        this.m_StrongholdBookmarksBar.Clear();
        this.m_ResourceBookmarksBar.Clear();
        this.m_StrongholdBookmarksBar = null;
        this.m_ResourceBookmarksBar = null;
        this.m_BookmarksBar = null;
        this.m_RightMenuButtonsBar.removeChild(this.m_RightMenuButtonsContainerBackground);
        this.m_RightMenuButtonsBar.removeChild(this.m_EnterBaseButton);
        this.m_RightMenuButtonsBar.removeChild(this.m_FindBaseButton);
        this.removeChild(this.m_RightMenuButtonsBar);
        this.m_EnterBaseButton = null;
        this.m_FindBaseButton = null;
        this.m_RightMenuButtonsContainerBackground = null;
        this.m_RightMenuButtonsBar = null;
        this.m_CoordinatesPanel.removeChild(this.m_CoordinatesLabel);
        this.m_CoordinatesPanel.removeChild(this.m_CoordinatesBackground);
        this.m_LeftMenuButtonsBar.removeChild(this.m_CoordinatesPanel);
        this.m_LeftMenuButtonsBar.removeChild(this.m_BookmarksButton);
        this.removeChild(this.m_LeftMenuButtonsBar);
        this.m_CoordinatesLabel = null;
        this.m_CoordinatesBackground = null;
        this.m_CoordinatesPanel = null;
        this.m_BookmarksButton = null;
        this.m_JumpButton = null;
        this.m_LeftMenuButtonsContainerBackground = null;
        this.m_LeftMenuButtonsBar = null;
        this.m_ZoomOutButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomOutButtonClicked));
        this.m_ZoomOutButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomOutButtonMouseOver));
        this.m_ZoomOutButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomOutButtonMouseOut));
        this.m_ZoomInButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomInButtonClicked));
        this.m_ZoomInButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomInButtonMouseOver));
        this.m_ZoomInButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnZoomInButtonMouseOut));
        this.m_FullscreenButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnFullscreenButtonClicked));
        this.m_FullscreenButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnFullscreenButtonMouseOver));
        this.m_FullscreenButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnFullscreenButtonMouseOut));
        this.RemoveAllChildren(this.m_ZoomOutButton);
        this.RemoveAllChildren(this.m_ZoomInButton);
        this.RemoveAllChildren(this.m_FullscreenButton);
        this.m_OptionButtonsBar.removeChild(this.m_ZoomOutButton);
        this.m_OptionButtonsBar.removeChild(this.m_ZoomInButton);
        this.m_OptionButtonsBar.removeChild(this.m_FullscreenButton);
        this.removeChild(this.m_OptionButtonToolTip);
        this.removeChild(this.m_OptionButtonsBar);
        this.m_ZoomOutButton = null;
        this.m_ZoomInButton = null;
        this.m_FullscreenButton = null;
        this.m_OptionButtonToolTip = null;
        this.m_OptionButtonsBar = null;
    }

    private RemoveAllChildren(param1: Sprite): void {
        let _loc2_: Bitmap = null;
        while (param1.numChildren > 0) {
            _loc2_ = as3.as(param1.removeChildAt(0), Bitmap);
            if (_loc2_ != null) {
                _loc2_.bitmapData = null;
            }
        }
    }

    private UpdateResourcesDisplay(): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc1_: uint = 1;
        while (_loc1_ <= 4) {
            _loc2_ = Number(GLOBAL._resources["r" + _loc1_].Get());
            _loc3_ = Number(GLOBAL._resources["r" + _loc1_ + "max"]);
            _loc4_ = Math.max(0, Math.min(1, _loc2_ / _loc3_));
            this.m_ResourcesDisplay["resourceDisplay" + _loc1_].tR.htmlText = "<b>" + GLOBAL.FormatNumber(_loc2_) + "</b>";
            this.m_ResourcesDisplay["resourceDisplay" + _loc1_].mcBar.width = MapRoom3WindowHUD.REOURCE_BAR_WIDTH * _loc4_;
            _loc1_++;
        }
    }

    private PositionHUDElements(): void {
        this.PositionResourcesDisplay();
        this.PositionBookmarksBar();
        this.PositionOptionsButtonBar();
        this.PositionLeftMenuButtonsBar();
        this.PositionRightMenuButtonsBar();
    }

    private PositionResourcesDisplay(): void {
        this.m_ResourcesDisplay.x = GLOBAL._SCREEN.x;
        this.m_ResourcesDisplay.y = GLOBAL._SCREEN.y;
    }

    private PositionBookmarksBar(): void {
        this.m_BookmarksBar.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width * 0.5 - this.m_BookmarksBar.width * 0.5;
        this.m_BookmarksBar.y = GLOBAL._SCREEN.y;
        if (this.m_BookmarksBar.x < this.m_ResourcesDisplay.x + this.m_ResourcesDisplay.width) {
            this.m_BookmarksBar.x = this.m_ResourcesDisplay.x + this.m_ResourcesDisplay.width;
        }
    }

    private PositionOptionsButtonBar(): void {
        this.m_OptionButtonsBar.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this.m_OptionButtonsBar.width - MapRoom3WindowHUD.OPTION_BUTTONS_BAR_PADDING_RIGHT;
        this.m_OptionButtonsBar.y = GLOBAL._SCREEN.y + MapRoom3WindowHUD.OPTION_BUTTONS_BAR_PADDING_TOP;
    }

    public PositionLeftMenuButtonsBar(): void {
        if (this.m_LeftMenuButtonsContainerBackground == null) {
            return;
        }
        this.m_LeftMenuButtonsBar.x = GLOBAL._SCREEN.x | 0;
        if (Chat._bymChat != null && Chat._bymChat.chatBox != null && Chat._bymChat.chatBox.background != null) {
            this.m_LeftMenuButtonsBar.y = (Chat._bymChat.y + Chat._bymChat.chatBox.y + Chat._bymChat.chatBox.background.y - this.m_LeftMenuButtonsContainerBackground.height) | 0;
        } else {
            this.m_LeftMenuButtonsBar.y = (GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - this.m_LeftMenuButtonsContainerBackground.height) | 0;
        }
    }

    public PositionRightMenuButtonsBar(): void {
        if (this.m_RightMenuButtonsContainerBackground == null) {
            return;
        }
        this.m_RightMenuButtonsBar.x = (GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this.m_RightMenuButtonsContainerBackground.width) | 0;
        if (UI_BOTTOM._missions != null && UI_BOTTOM._missions.frame != null) {
            this.m_RightMenuButtonsBar.y = (UI_BOTTOM._missions.y + UI_BOTTOM._missions.frame.y - this.m_RightMenuButtonsContainerBackground.height + 1) | 0;
        }
    }

    private OnBookmarksButtonClicked(param1: MouseEvent): void {
        this.m_BookmarksPopup.Show(BookmarksManager.instance.GetBookmarksOfType(BookmarksManager.TYPE_CUSTOM));
    }

    protected OnJumpButtonClicked(param1: MouseEvent): void {
        let _loc2_: Maproom3JumpPopup = new Maproom3JumpPopup();
        _loc2_.addEventListener(Maproom3JumpPopup.k_clickedJump, as3.bind(this, this.clickedJump));
        POPUPS.Push(_loc2_);
    }

    protected clickedJump(param1: Event): void {
        let _loc2_: Maproom3JumpPopup = as3.as(param1.target, Maproom3JumpPopup);
        _loc2_.removeEventListener(Maproom3JumpPopup.k_clickedJump, as3.bind(this, this.clickedJump));
        _loc2_.Hide();
        let _loc3_: MapRoom3Cell = as3.as(_loc2_.targetCell, MapRoom3Cell);
        MapRoom3.mapRoom3Window.NavigateToCell(_loc3_);
        this.DisplayCoordinatesOfCell(_loc3_);
    }

    private OnFindBaseButtonClicked(param1: MouseEvent): void {
        if (GLOBAL._mapHome != null) {
            MapRoom3.mapRoom3Window.NavigateToIndex(GLOBAL._mapHome);
        }
    }

    private OnEnterBaseButtonClicked(param1: MouseEvent): void {
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.PLAYER);
    }

    private OnZoomOutButtonClicked(param1: MouseEvent): void {
        this.m_ZoomOutButton.visible = false;
        this.m_ZoomInButton.visible = true;
        MapRoom3.mapRoom3Window.Zoom(0.5, MapRoom3WindowHUD.ZOOM_TIME);
    }

    private OnZoomInButtonClicked(param1: MouseEvent): void {
        this.m_ZoomInButton.visible = false;
        this.m_ZoomOutButton.visible = true;
        MapRoom3.mapRoom3Window.Zoom(1, MapRoom3WindowHUD.ZOOM_TIME);
    }

    private OnFullscreenButtonClicked(param1: MouseEvent): void {
        GLOBAL.goFullScreen();
    }

    private OnZoomOutButtonMouseOver(param1: MouseEvent): void {
        this.ShowOptionButtonToolTip("settings_zoomout", Number(param1.target.x), Number(param1.target.y));
    }

    private OnZoomOutButtonMouseOut(param1: MouseEvent): void {
        this.HideOptionButtonToolTip();
    }

    private OnZoomInButtonMouseOver(param1: MouseEvent): void {
        this.ShowOptionButtonToolTip("settings_zoomin", Number(param1.target.x), Number(param1.target.y));
    }

    private OnZoomInButtonMouseOut(param1: MouseEvent): void {
        this.HideOptionButtonToolTip();
    }

    private OnFullscreenButtonMouseOver(param1: MouseEvent): void {
        let _loc2_: string = GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN || GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN_INTERACTIVE ? "settings_fullscreenexit" : "settings_fullscreenenter";
        this.ShowOptionButtonToolTip(_loc2_, Number(param1.target.x), Number(param1.target.y));
    }

    private OnFullscreenButtonMouseOut(param1: MouseEvent): void {
        this.HideOptionButtonToolTip();
    }

    private ShowOptionButtonToolTip(param1: string, param2: number, param3: number): void {
        this.m_OptionButtonToolTip.visible = true;
        this.m_OptionButtonToolTip.mcText.htmlText = "<b>" + KEYS.Get(param1) + "</b>";
        this.m_OptionButtonToolTip.x = this.m_OptionButtonsBar.x + param2 + 12;
        this.m_OptionButtonToolTip.y = this.m_OptionButtonsBar.y + param3 + 20;
        this.m_OptionButtonToolTip.mcText.x = 10 - this.m_OptionButtonToolTip.mcText.width;
        this.m_OptionButtonToolTip.mcBG.x = this.m_OptionButtonToolTip.mcText.x - 5;
        this.m_OptionButtonToolTip.mcBG.width = this.m_OptionButtonToolTip.mcText.width + 10;
    }

    private HideOptionButtonToolTip(): void {
        this.m_OptionButtonToolTip.visible = false;
    }

    public Resize(): void {
        this.PositionHUDElements();
    }

    public DisplayCoordinatesOfCell(param1: MapRoom3Cell): void {
        if (param1 != null && param1.isBorder == false) {
            this.m_CoordinatesLabel.text = param1.cellX.toString() + "," + param1.cellY.toString();
        } else {
            this.m_CoordinatesLabel.text = "";
        }
    }

    public get leftMenuButtonsBar(): Sprite {
        return this.m_LeftMenuButtonsBar;
    }
}
