import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Loader, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { URLRequest } from "flash/net";
import { TextField, TextFormat } from "flash/text";
import { ALLIANCES, BookmarksManager, Contact, GLOBAL, ImageCache, KEYS, MapRoom3, MapRoom3AllianceData, MapRoom3AssetCache, MapRoom3Cell, MapRoom3CellGraphic, MapRoom3CellMouseoverButton, com_monsters_mailbox_Message as Message } from "@game";

export class MapRoom3CellMouseover extends Sprite {
    static {
        as3.fields(this, { m_InfoDisplay: null, m_ButtonDisplay: null, m_TextDisplay: null, m_ScoutAttackButton: null, m_EnterOwnedCellButton: null, m_AddBookmarkButton: null, m_RemoveBookmarkButton: null, m_SendMessageButton: null, m_InviteToAllianceButton: null, m_RequestTruceButton: null, m_Portrait: null, m_ProfilePicture: null, m_WildMonsterPortrait: null, m_DamageBarIcon: null, m_AllianceIcon: null, m_TruceIcon: null, m_InfoTextCellName: null, m_InfoTextAlliance: null, m_InfoTextCellType: null, m_InfoTextBuff1: null, m_InfoTextBuff2: null, m_SelectedCell: null, m_MailboxMessage: null });
    }

    private static readonly PORTRAIT_WIDTH: int = 50;

    private static readonly PORTRAIT_HEIGHT: int = 50;

    private static readonly PORTRAIT_OFFSET_X: int = 2;

    private static readonly PORTRAIT_OFFSET_Y: int = 2;

    private static readonly ALLIANCE_ICON_OFFSET_X: int = 5;

    private static readonly ALLIANCE_ICON_OFFSET_Y: int = 2;

    private static readonly TRUCE_ICON_OFFSET_X: int = -10;

    private static readonly TRUCE_ICON_OFFSET_Y: int = -10;

    private static readonly INFO_DISPLAY_OFFSET_Y: int = 8;

    private static readonly INFO_TEXT_COLOR_DEFAULT: uint = 16777215;

    private static readonly INFO_TEXT_COLOR_BUFF_BLUE: uint = 42495;

    private static readonly INFO_TEXT_COLOR_BUFF_RED: uint = 16711680;
    private m_InfoDisplay: Sprite;
    private m_ButtonDisplay: Sprite;
    private m_TextDisplay: Sprite;
    private m_ScoutAttackButton: MapRoom3CellMouseoverButton;
    private m_EnterOwnedCellButton: MapRoom3CellMouseoverButton;
    private m_AddBookmarkButton: MapRoom3CellMouseoverButton;
    private m_RemoveBookmarkButton: MapRoom3CellMouseoverButton;
    private m_SendMessageButton: MapRoom3CellMouseoverButton;
    private m_InviteToAllianceButton: MapRoom3CellMouseoverButton;
    private m_RequestTruceButton: MapRoom3CellMouseoverButton;
    private m_Portrait: Sprite;
    private m_ProfilePicture: Loader;
    private m_WildMonsterPortrait: Bitmap;
    private m_DamageBarIcon: Bitmap;
    private m_AllianceIcon: Bitmap;
    private m_TruceIcon: Bitmap;
    private m_InfoTextCellName: TextField;
    private m_InfoTextAlliance: TextField;
    private m_InfoTextCellType: TextField;
    private m_InfoTextBuff1: TextField;
    private m_InfoTextBuff2: TextField;
    private m_SelectedCell: MapRoom3Cell;
    private m_MailboxMessage: Message;

    public $ctor(): void {
        super.$ctor();
        this.mouseEnabled = false;
        this.mouseChildren = false;
        this.m_InfoDisplay = new Sprite();
        this.m_InfoDisplay.addChild(new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BACKGROUND)));
        this.m_InfoDisplay.x = -(this.m_InfoDisplay.width * 0.5);
        this.m_InfoDisplay.y = MapRoom3CellMouseover.INFO_DISPLAY_OFFSET_Y - this.m_InfoDisplay.height;
        this.m_InfoDisplay.mouseEnabled = false;
        this.m_InfoDisplay.mouseChildren = false;
        this.addChild(this.m_InfoDisplay);
        this.m_ButtonDisplay = new Sprite();
        this.m_ButtonDisplay.mouseEnabled = false;
        this.addChild(this.m_ButtonDisplay);
        this.m_ScoutAttackButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_SCOUT_ATTACK), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_SCOUT_ATTACK_ROLLOVER), "mr3_scout_attack_tool_tip");
        this.m_ScoutAttackButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnScoutAttackClicked));
        this.m_EnterOwnedCellButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_ENTER), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_ENTER_ROLLOVER), "mr3_enter_owned_base_tool_tip");
        this.m_EnterOwnedCellButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnEnterOwnedCellClicked));
        this.m_AddBookmarkButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_ADD), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_ADD_ROLLOVER), "mr3_add_bookmark_tool_tip");
        this.m_AddBookmarkButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnAddBookmarkClicked));
        this.m_RemoveBookmarkButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_REMOVE), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_BOOKMARK_REMOVE_ROLLOVER), "mr3_remove_bookmark_tool_tip");
        this.m_RemoveBookmarkButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRemoveBookmarkClicked));
        this.m_SendMessageButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_SEND_MESSAGE), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_SEND_MESSAGE_ROLLOVER), "mr3_send_message_tool_tip");
        this.m_SendMessageButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnSendMessageClicked));
        this.m_InviteToAllianceButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_INVITE_TO_ALLIANCE_ROLLOVER), "mr3_invite_to_alliance_tool_tip");
        this.m_InviteToAllianceButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnInviteToAllianceClicked));
        this.m_RequestTruceButton = new MapRoom3CellMouseoverButton(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_REQUEST_TRUCE), MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_REQUEST_TRUCE_ROLLOVER), "mr3_request_truce_tool_tip");
        this.m_RequestTruceButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRequestTruceClicked));
        this.m_Portrait = new Sprite();
        this.m_Portrait.x = MapRoom3CellMouseover.PORTRAIT_OFFSET_X;
        this.m_Portrait.y = MapRoom3CellMouseover.PORTRAIT_OFFSET_Y;
        this.m_InfoDisplay.addChild(this.m_Portrait);
        this.m_ProfilePicture = new Loader();
        this.m_ProfilePicture.visible = false;
        this.m_ProfilePicture.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.OnProfilePictureIOErrorEvent), false, 0, true);
        this.m_ProfilePicture.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.OnProfilePictureLoaded), false, 0, true);
        this.m_Portrait.addChild(this.m_ProfilePicture);
        this.m_WildMonsterPortrait = new Bitmap();
        this.m_WildMonsterPortrait.visible = false;
        this.m_Portrait.addChild(this.m_WildMonsterPortrait);
        this.m_DamageBarIcon = new Bitmap(MapRoom3AssetCache.instance.GetDamageBarSegmentAsset(0));
        this.m_DamageBarIcon.visible = false;
        this.m_DamageBarIcon.x = (MapRoom3CellMouseover.PORTRAIT_WIDTH - this.m_DamageBarIcon.width) * 0.5;
        this.m_DamageBarIcon.y = this.m_InfoDisplay.height - MapRoom3CellMouseover.PORTRAIT_OFFSET_Y - this.m_DamageBarIcon.height;
        this.m_Portrait.addChild(this.m_DamageBarIcon);
        this.m_AllianceIcon = new Bitmap();
        this.m_AllianceIcon.visible = false;
        this.m_Portrait.addChild(this.m_AllianceIcon);
        this.m_TruceIcon = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_ICON_TRUCE));
        this.m_TruceIcon.visible = false;
        this.m_TruceIcon.x = MapRoom3CellMouseover.TRUCE_ICON_OFFSET_X;
        this.m_TruceIcon.y = MapRoom3CellMouseover.TRUCE_ICON_OFFSET_Y;
        this.m_Portrait.addChild(this.m_TruceIcon);
        this.m_TextDisplay = new Sprite();
        this.m_TextDisplay.mouseEnabled = false;
        this.m_InfoDisplay.addChild(this.m_TextDisplay);
        let _loc1_: DropShadowFilter = new DropShadowFilter();
        let _loc2_: TextFormat = new TextFormat();
        _loc2_.color = MapRoom3CellMouseover.INFO_TEXT_COLOR_DEFAULT;
        _loc2_.font = "Verdana";
        _loc2_.size = 11;
        this.m_InfoTextCellName = new TextField();
        this.m_InfoTextCellName.defaultTextFormat = _loc2_;
        this.m_InfoTextCellName.x = 56;
        this.m_InfoTextCellName.width = 145;
        this.m_InfoTextCellName.height = 20;
        this.m_InfoTextCellName.filters = [_loc1_];
        this.m_InfoTextCellName.selectable = false;
        let _loc3_: TextFormat = new TextFormat();
        _loc3_.color = MapRoom3CellMouseover.INFO_TEXT_COLOR_DEFAULT;
        _loc3_.font = "Verdana";
        _loc3_.size = 10;
        this.m_InfoTextAlliance = new TextField();
        this.m_InfoTextAlliance.defaultTextFormat = _loc3_;
        this.m_InfoTextAlliance.x = 56;
        this.m_InfoTextAlliance.width = 145;
        this.m_InfoTextAlliance.height = 20;
        this.m_InfoTextAlliance.filters = [_loc1_];
        this.m_InfoTextAlliance.selectable = false;
        this.m_InfoTextCellType = new TextField();
        this.m_InfoTextCellType.defaultTextFormat = _loc2_;
        this.m_InfoTextCellType.x = 56;
        this.m_InfoTextCellType.width = 145;
        this.m_InfoTextCellType.height = 20;
        this.m_InfoTextCellType.filters = [_loc1_];
        this.m_InfoTextCellType.selectable = false;
        let _loc4_: TextFormat = null;
        (_loc4_ = new TextFormat()).font = "Verdana";
        _loc4_.size = 10;
        this.m_InfoTextBuff1 = new TextField();
        this.m_InfoTextBuff1.defaultTextFormat = _loc4_;
        this.m_InfoTextBuff1.x = 56;
        this.m_InfoTextBuff1.width = 145;
        this.m_InfoTextBuff1.height = 20;
        this.m_InfoTextBuff1.filters = [_loc1_];
        this.m_InfoTextBuff1.selectable = false;
        this.m_InfoTextBuff1.textColor = MapRoom3CellMouseover.INFO_TEXT_COLOR_BUFF_BLUE;
        this.m_InfoTextBuff2 = new TextField();
        this.m_InfoTextBuff2.defaultTextFormat = _loc4_;
        this.m_InfoTextBuff2.x = 56;
        this.m_InfoTextBuff2.width = 145;
        this.m_InfoTextBuff2.height = 20;
        this.m_InfoTextBuff2.filters = [_loc1_];
        this.m_InfoTextBuff2.selectable = false;
        this.m_InfoTextBuff2.textColor = MapRoom3CellMouseover.INFO_TEXT_COLOR_BUFF_RED;
    }

    private static MakeFacebookProfilePictureURL(param1: string): string {
        return "http://graph.facebook.com/" + param1 + "/picture";
    }

    public get selectedCell(): MapRoom3Cell {
        return this.m_SelectedCell;
    }

    public get scoutAttackButton(): MapRoom3CellMouseoverButton {
        return this.m_ScoutAttackButton;
    }

    public Clear(): void {
        this.Hide();
        this.m_InfoTextCellName = null;
        this.m_InfoTextAlliance = null;
        this.m_InfoTextCellType = null;
        this.m_InfoTextBuff1 = null;
        this.m_InfoTextBuff2 = null;
        this.m_Portrait.removeChild(this.m_TruceIcon);
        this.m_TruceIcon = null;
        this.m_Portrait.removeChild(this.m_AllianceIcon);
        this.m_AllianceIcon = null;
        this.m_Portrait.removeChild(this.m_DamageBarIcon);
        this.m_DamageBarIcon = null;
        this.m_Portrait.removeChild(this.m_WildMonsterPortrait);
        this.m_WildMonsterPortrait = null;
        this.m_ProfilePicture.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.OnProfilePictureIOErrorEvent));
        this.m_ProfilePicture.contentLoaderInfo.removeEventListener(Event.COMPLETE, as3.bind(this, this.OnProfilePictureLoaded));
        this.m_Portrait.removeChild(this.m_ProfilePicture);
        this.m_ProfilePicture = null;
        this.m_InfoDisplay.removeChild(this.m_Portrait);
        this.m_Portrait = null;
        this.m_InfoDisplay.removeChild(this.m_TextDisplay);
        this.m_TextDisplay = null;
        this.m_ScoutAttackButton = null;
        this.m_EnterOwnedCellButton = null;
        this.m_AddBookmarkButton = null;
        this.m_RemoveBookmarkButton = null;
        this.m_SendMessageButton = null;
        this.m_InviteToAllianceButton = null;
        this.m_RequestTruceButton = null;
        this.removeChild(this.m_ButtonDisplay);
        this.m_ButtonDisplay = null;
        let _loc1_: Bitmap = null;
        while (this.m_InfoDisplay.numChildren > 0) {
            _loc1_ = as3.as(this.m_InfoDisplay.removeChildAt(0), Bitmap);
            if (_loc1_ != null) {
                _loc1_.bitmapData = null;
            }
        }
        this.removeChild(this.m_InfoDisplay);
    }

    public Show(param1: MapRoom3Cell, param2: number, param3: number, param4: boolean): void {
        this.SetInfo(param1);
        this.SetPosition(param2, param3);
        this.visible = true;
        this.ShowButtons(param4);
    }

    public Hide(): void {
        this.ClearInfo();
        this.visible = false;
    }

    private ShowButtons(param1: boolean): void {
        if (param1) {
            this.m_InfoDisplay.y = MapRoom3CellMouseover.INFO_DISPLAY_OFFSET_Y - (this.m_InfoDisplay.height + this.m_ButtonDisplay.height);
            this.m_ButtonDisplay.visible = true;
            this.mouseEnabled = true;
            this.mouseChildren = true;
            this.m_ButtonDisplay.mouseEnabled = true;
        } else {
            this.m_InfoDisplay.y = MapRoom3CellMouseover.INFO_DISPLAY_OFFSET_Y - this.m_InfoDisplay.height;
            this.m_ButtonDisplay.visible = false;
            this.mouseEnabled = false;
            this.mouseChildren = false;
            this.m_ButtonDisplay.mouseEnabled = false;
        }
    }

    private SetPosition(param1: number, param2: number): void {
        let _loc3_: int = GLOBAL.StageX;
        let _loc4_: int = (GLOBAL.StageX + GLOBAL.StageWidth) | 0;
        let _loc5_: int = (GLOBAL.StageY + 80) | 0;
        let _loc6_: int = (this.m_InfoDisplay.width * 0.5) | 0;
        if (param1 - _loc6_ < _loc3_) {
            param1 = _loc3_ + _loc6_;
        } else if (param1 + _loc6_ > _loc4_) {
            param1 = _loc4_ - _loc6_;
        }
        this.x = param1;
        if (param2 - this.m_InfoDisplay.height < _loc5_) {
            this.y = param2 + MapRoom3CellGraphic.HEX_EDGE_LENGTH * MapRoom3.mapRoom3Window.scrollingCanvas.scaleY * 0.5 + this.m_InfoDisplay.height;
        } else {
            this.y = param2 - MapRoom3CellGraphic.HEX_EDGE_LENGTH * MapRoom3.mapRoom3Window.scrollingCanvas.scaleY * 0.5;
        }
    }

    private SetInfo(param1: MapRoom3Cell): void {
        let _loc6_: DisplayObject = null;
        let _loc11_: any = null;
        let _loc12_: number = NaN;
        let _loc13_: number = NaN;
        let _loc14_: number = NaN;
        let _loc15_: uint = 0;
        let _loc16_: uint = 0;
        let _loc17_: MapRoom3Cell = null;
        let _loc18_: int = 0;
        this.ClearInfo();
        this.m_SelectedCell = param1;
        if (this.m_SelectedCell == null) {
            return;
        }
        if (param1.isOwnedByWildMonster) {
            ImageCache.GetImageWithCallBack("worldmap/rollover/tribe_" + param1.name.toLowerCase() + ".png", as3.bind(this, this.OnWildMonsterPortraitLoaded), true, 1);
            this.m_WildMonsterPortrait.visible = true;
        } else {
            this.m_ProfilePicture.load(new URLRequest(param1.picSquare));
            this.m_ProfilePicture.visible = true;
        }
        this.m_DamageBarIcon.bitmapData = MapRoom3AssetCache.instance.GetDamageBarSegmentAsset(param1.damagePercentage);
        this.m_DamageBarIcon.visible = true;
        let _loc2_: int = param1.baseLevel;
        let _loc3_: int = !(!param1.playerLevel) ? param1.playerLevel : _loc2_;
        this.m_InfoTextCellName.htmlText = "<b>" + param1.name + " (" + _loc3_.toString() + ")</b>";
        this.m_TextDisplay.addChild(this.m_InfoTextCellName);
        let _loc4_: MapRoom3AllianceData = null;
        if ((_loc4_ = param1.GetAllianceData()) != null) {
            this.m_InfoTextAlliance.htmlText = _loc4_.name;
            this.m_TextDisplay.addChild(this.m_InfoTextAlliance);
            _loc11_ = "alliances/" + _loc4_.imageId + "_small.png";
            ImageCache.GetImageWithCallBack(as3.str(_loc11_), as3.bind(this, this.OnAllianceIconLoaded), true, 1);
            this.m_AllianceIcon.visible = true;
        }
        this.m_InfoTextCellType.htmlText = param1.GetLocalisedCellTypeName() + " (" + _loc2_.toString() + ")";
        this.m_TextDisplay.addChild(this.m_InfoTextCellType);
        if (param1.isInRangeOfStronghold) {
            _loc12_ = 0;
            _loc13_ = 0;
            _loc14_ = 0;
            _loc15_ = param1.inRangeOfStrongholds.length >>> 0;
            _loc16_ = 0;
            while (_loc16_ < _loc15_) {
                _loc17_ = as3.vget(param1.inRangeOfStrongholds, _loc16_);
                _loc18_ = this.GetPercentageBuffFromStrongholdLevel(_loc17_.baseLevel >>> 0);
                if (_loc17_.isOwnedByPlayer) {
                    _loc12_ += _loc18_;
                    if (param1.isOwnedByPlayer) {
                        _loc13_ += _loc18_;
                    }
                } else if (_loc17_.userID == param1.userID && _loc17_.wildMonsterTribeId == param1.wildMonsterTribeId) {
                    _loc14_ += _loc18_;
                }
                _loc16_++;
            }
            if (_loc12_ > 0 && _loc13_ > 0 && _loc12_ == _loc13_) {
                this.m_InfoTextBuff1.htmlText = KEYS.Get("mr3_shbuff_towermonster", { "v1": _loc12_ });
                this.m_TextDisplay.addChild(this.m_InfoTextBuff1);
            } else if (_loc12_ > 0) {
                this.m_InfoTextBuff1.htmlText = KEYS.Get("mr3_shbuff_monster", { "v1": _loc12_ });
                this.m_TextDisplay.addChild(this.m_InfoTextBuff1);
            } else if (_loc13_ > 0) {
                this.m_InfoTextBuff1.htmlText = KEYS.Get("mr3_shbuff_tower", { "v1": _loc13_ });
                this.m_TextDisplay.addChild(this.m_InfoTextBuff1);
            }
            if (_loc14_ > 0) {
                this.m_InfoTextBuff2.htmlText = KEYS.Get("mr3_shbuff_tower", { "v1": _loc14_ });
                this.m_TextDisplay.addChild(this.m_InfoTextBuff2);
            }
        }
        if (param1.isOwnedByPlayer) {
            this.m_ButtonDisplay.addChild(this.m_EnterOwnedCellButton);
        } else {
            this.m_ButtonDisplay.addChild(this.m_ScoutAttackButton);
            if (param1.isOwnedByWildMonster == false) {
                this.m_ButtonDisplay.addChild(this.m_SendMessageButton);
                if (ALLIANCES._myAlliance != null && param1.allianceID != ALLIANCES._allianceID) {
                    this.m_ButtonDisplay.addChild(this.m_InviteToAllianceButton);
                }
                if (param1.hasTruce == false) {
                    this.m_ButtonDisplay.addChild(this.m_RequestTruceButton);
                }
            }
        }
        if (BookmarksManager.instance.IsBookmarked(this.m_SelectedCell)) {
            this.m_ButtonDisplay.addChild(this.m_RemoveBookmarkButton);
        } else {
            this.m_ButtonDisplay.addChild(this.m_AddBookmarkButton);
        }
        this.m_TruceIcon.visible = this.m_SelectedCell.hasTruce;
        let _loc5_: int = 0;
        let _loc7_: uint = this.m_ButtonDisplay.numChildren >>> 0;
        let _loc8_: int = 0;
        while (_loc8_ < _loc7_) {
            (_loc6_ = this.m_ButtonDisplay.getChildAt(_loc8_)).x = _loc5_;
            _loc5_ = (_loc5_ + _loc6_.width) | 0;
            _loc8_++;
        }
        this.m_ButtonDisplay.x = -(this.m_ButtonDisplay.width * 0.5);
        this.m_ButtonDisplay.y = -this.m_ButtonDisplay.height;
        let _loc9_: uint = 0;
        let _loc10_: int = (_loc9_ = this.m_TextDisplay.numChildren >>> 0) <= 3 ? 6 : 0;
        _loc8_ = 0;
        while (_loc8_ < _loc9_) {
            (_loc6_ = this.m_TextDisplay.getChildAt(_loc8_)).y = _loc10_;
            _loc10_ += 12;
            _loc8_++;
        }
    }

    private GetPercentageBuffFromStrongholdLevel(param1: uint): int {
        switch (param1) {
            case 30:
                return 10;
            case 40:
                return 20;
            case 50:
                return 30;
            default:
                return 0;
        }
    }

    private OnProfilePictureIOErrorEvent(param1: IOErrorEvent): void {
    }

    private OnProfilePictureLoaded(param1: Event): void {
        this.m_ProfilePicture.width = MapRoom3CellMouseover.PORTRAIT_WIDTH;
        this.m_ProfilePicture.height = MapRoom3CellMouseover.PORTRAIT_HEIGHT;
    }

    private ClearInfo(): void {
        this.m_ButtonDisplay.visible = false;
        while (this.m_ButtonDisplay.numChildren > 0) {
            this.m_ButtonDisplay.removeChildAt(0);
        }
        while (this.m_TextDisplay.numChildren > 0) {
            this.m_TextDisplay.removeChildAt(0);
        }
        this.m_ProfilePicture.unload();
        this.m_ProfilePicture.visible = false;
        this.m_WildMonsterPortrait.bitmapData = null;
        this.m_WildMonsterPortrait.visible = false;
        this.m_DamageBarIcon.bitmapData = null;
        this.m_DamageBarIcon.visible = false;
        this.m_AllianceIcon.bitmapData = null;
        this.m_AllianceIcon.visible = false;
        this.m_TruceIcon.visible = false;
        this.m_InfoTextCellName.htmlText = "";
        this.m_InfoTextAlliance.htmlText = "";
        this.m_InfoTextCellType.htmlText = "";
        this.m_InfoTextBuff1.htmlText = "";
        this.m_InfoTextBuff2.htmlText = "";
        this.m_SelectedCell = null;
    }

    private OnWildMonsterPortraitLoaded(param1: string, param2: BitmapData): void {
        this.m_WildMonsterPortrait.bitmapData = param2;
        this.m_WildMonsterPortrait.width = MapRoom3CellMouseover.PORTRAIT_WIDTH;
        this.m_WildMonsterPortrait.height = MapRoom3CellMouseover.PORTRAIT_HEIGHT;
    }

    private OnAllianceIconLoaded(param1: string, param2: BitmapData): void {
        this.m_AllianceIcon.bitmapData = param2;
        this.m_AllianceIcon.x = MapRoom3CellMouseover.PORTRAIT_WIDTH - this.m_AllianceIcon.width + MapRoom3CellMouseover.ALLIANCE_ICON_OFFSET_X;
        this.m_AllianceIcon.y = MapRoom3CellMouseover.PORTRAIT_HEIGHT - this.m_AllianceIcon.height + MapRoom3CellMouseover.ALLIANCE_ICON_OFFSET_Y;
    }

    private OnScoutAttackClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell != null) {
            this.m_SelectedCell.LoadForAttack();
        }
    }

    private OnEnterOwnedCellClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell != null) {
            this.m_SelectedCell.LoadForBuild();
        }
    }

    private OnAddBookmarkClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell == null) {
            return;
        }
        BookmarksManager.instance.AddBookmark(this.m_SelectedCell);
        let _loc2_: int = this.m_ButtonDisplay.getChildIndex(this.m_AddBookmarkButton);
        this.m_ButtonDisplay.addChildAt(this.m_RemoveBookmarkButton, _loc2_);
        this.m_RemoveBookmarkButton.x = this.m_AddBookmarkButton.x;
        this.m_RemoveBookmarkButton.y = this.m_AddBookmarkButton.y;
        this.m_ButtonDisplay.removeChild(this.m_AddBookmarkButton);
        param1.stopImmediatePropagation();
        param1.stopPropagation();
    }

    private OnRemoveBookmarkClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell == null) {
            return;
        }
        BookmarksManager.instance.RemoveBookmark(this.m_SelectedCell);
        let _loc2_: int = this.m_ButtonDisplay.getChildIndex(this.m_RemoveBookmarkButton);
        this.m_ButtonDisplay.addChildAt(this.m_AddBookmarkButton, _loc2_);
        this.m_AddBookmarkButton.x = this.m_RemoveBookmarkButton.x;
        this.m_AddBookmarkButton.y = this.m_RemoveBookmarkButton.y;
        this.m_ButtonDisplay.removeChild(this.m_RemoveBookmarkButton);
        param1.stopImmediatePropagation();
        param1.stopPropagation();
    }

    private OnInviteToAllianceClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell != null) {
            ALLIANCES.AllianceInvite(this.m_SelectedCell.userID);
        }
    }

    private OnSendMessageClicked(param1: MouseEvent): void {
        if (this.m_SelectedCell != null) {
            this.ShowMailboxMessage("message");
        }
    }

    private OnRequestTruceClicked(param1: MouseEvent): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        if (this.m_SelectedCell != null) {
            _loc2_ = KEYS.Get("mr3_trucerequest", { "v1": this.m_SelectedCell.name });
            _loc3_ = KEYS.Get("map_trucemessage");
            this.ShowMailboxMessage("trucerequest", _loc2_, _loc3_);
        }
    }

    private ShowMailboxMessage(param1: string, param2: string = "", param3: string = ""): void {
        if (this.m_MailboxMessage != null) {
            if (this.m_MailboxMessage.parent != null) {
                this.m_MailboxMessage.parent.removeChild(this.m_MailboxMessage);
            }
            this.m_MailboxMessage = null;
        }
        let _loc4_: any = { "first_name": this.m_SelectedCell.name, "last_name": "", "pic_square": this.m_SelectedCell.picSquare };
        let _loc5_: Contact = new Contact(as3.str(this.m_SelectedCell.userID.toString()), _loc4_);
        this.m_MailboxMessage = new Message();
        this.m_MailboxMessage.picker.preloadSelection(_loc5_);
        this.m_MailboxMessage.requestType = param1;
        this.m_MailboxMessage.subject_txt.htmlText = param2;
        this.m_MailboxMessage.body_txt.htmlText = param3;
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(this.m_MailboxMessage);
    }
}
