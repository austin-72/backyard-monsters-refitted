import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { URLRequest } from "flash/net";
import { ALLIANCES, AllyInfo, BASE, CellData, Contact, EnumYardType, GLOBAL, ImageCache, IoMapUi, IoUnderworld, KEYS, LOGGER, LOGIN, MapRoomCell, MapRoomManager, PLEASEWAIT, POPUPSETTINGS, POWERUPS, PopupInfoEnemy_CLIP, PopupTakeover, SecNum, TRIBES, URLLoaderApi, bubblepopupRight, com_monsters_mailbox_Message as Message, com_monsters_maproom_advanced_MapRoom as MapRoom, frame } from "@game";

export class PopupInfoEnemy extends PopupInfoEnemy_CLIP {
    static {
        as3.fields(this, { _cell: null, _mcMonsters: null, _mcResources: null, _message: null, _profilePic: null, _profileBmp: null });
    }

    private static _takeoverCost: SecNum = null;

    private static _minTakeoverCost: SecNum = null;

    private static _takeoverCoeff1: SecNum = null;

    private static _takeoverCoeff2: SecNum = null;

    private static _shinyCost: SecNum = null;

    private static _popupmc: bubblepopupRight = null;

    private static _popupdo: DisplayObject = null;

    private static _bookmarked: boolean = false;

    private static _protectedInRange: boolean = false;
    private _cell: MapRoomCell;
    private _mcMonsters: MovieClip;
    private _mcResources: MovieClip;
    private _message: Message;
    private _profilePic: Loader;
    private _profileBmp: Bitmap;

    public $ctor(): void {
        super.$ctor();
        this.Center();
        this.tNameLabel.htmlText = "<b>" + KEYS.Get("popup_label_name") + "</b>";
        this.tLocationLabel.htmlText = "<b>" + KEYS.Get("popup_label_location") + "</b>";
        this.tHeightLabel.htmlText = "<b>" + KEYS.Get("popup_label_height") + "</b>";
        this.tYardHasLabel.htmlText = "<b>" + KEYS.Get("popup_label_thisyardhas") + "</b>";
        this.bAttack.SetupKey("map_attack_btn");
        this.bAttack.Highlight = true;
        this.bAttack.Enabled = true;
        this.bAttack.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bAttack.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
        this.bView.SetupKey("map_view_btn");
        this.bView.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bView.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bView.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.View();
        });
        this.bSendMessage.SetupKey("map_message_btn");
        this.bSendMessage.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bSendMessage.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bSendMessage.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowMessage();
        });
        this.bTruce.SetupKey("newmap_truce_btn");
        this.bTruce.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bTruce.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bTruce.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowTruce();
        });
        if (GLOBAL.INFERNO_ONLY) {
            this.bTruce.visible = false;
        }
        this.bAlliance.SetupKey("btn_invitetoalliance");
        this.bAlliance.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bAlliance.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bAlliance.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowAllianceInvite();
        });
        this.bBookmark.SetupKey("newmap_bookmark_btn");
        this.bBookmark.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bBookmark.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bBookmark.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            if (!PopupInfoEnemy._bookmarked) {
                MapRoom._mc.ShowBookmarkAddPopup(this._cell);
            } else {
                GLOBAL.Message(KEYS.Get("newmap_bm_done"));
            }
        });
        PopupInfoEnemy._minTakeoverCost = new SecNum(2000000);
        PopupInfoEnemy._takeoverCoeff1 = new SecNum(5000000);
        PopupInfoEnemy._takeoverCoeff2 = new SecNum(20000000);
        (as3.as(this.mcFrame, frame)).Setup();
    }

    public Hide(param1: MouseEvent = null): void {
        if (Boolean(this._profilePic) && Boolean(this._profilePic.parent)) {
            this._profilePic.parent.removeChild(this._profilePic);
            this._profilePic = null;
        }
        if (Boolean(this._profileBmp) && Boolean(this._profileBmp.parent)) {
            this._profileBmp.parent.removeChild(this._profileBmp);
            this._profileBmp = null;
        }
        MapRoom._mc.HideInfoEnemy();
    }

    /** Inferno-only: worked out again for the same cell (what the portals reach has come: IoUnderworld). */
    public ioRefresh(): void {
        if (this._cell && this.parent) {
            this.Setup(this._cell, MapRoom._flingerInRange);
        }
    }

    public Setup(param1: MapRoomCell, param2: boolean = false): void {
        let _loc5_: CellData = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: any = null;
        let _loc9_: any = null;
        let _loc10_: MapRoomCell = null;
        let _loc11_: int = 0;
        let _loc12_: int = 0;
        this._cell = param1;
        let _loc3_: boolean = false;
        let _loc4_: number = 0;
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL")) {
            _loc3_ = true;
            _loc4_ = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0]);
        }
        GLOBAL._attackerCellsInRange = MapRoom._mc.GetCellsInRange(this._cell.X, this._cell.Y, (10 + _loc4_) | 0);
        if (GLOBAL.INFERNO_ONLY) {
            // the yards that reach it through the underworld's portals, and its rules there (IoUnderworld)
            GLOBAL._attackerCellsInRange = IoUnderworld.withReach(GLOBAL._attackerCellsInRange, this._cell.X, this._cell.Y);
        }
        MapRoom._flingerInRange = param2;
        this.bAlliance.visible = GLOBAL.alliancesEnabled;
        for (_loc5_ of (GLOBAL._attackerCellsInRange ?? [])) {
            _loc10_ = as3.as(_loc5_.cell, MapRoomCell);
            _loc11_ = _loc5_.range;
            if (_loc10_ && _loc10_._mine && _loc10_._flingerRange.Get() + _loc4_ >= _loc11_) {
                MapRoom._flingerInRange = true;
            }
            if (MapRoom._flingerInRange && PopupInfoEnemy._protectedInRange) {
                break;
            }
        }
        if (this._cell._base != 2 && this._cell._destroyed && !this._cell._protected && (this._cell._locked == 0 || this._cell._locked == LOGIN._playerID) && MapRoom._flingerInRange) {
            this.bAttack.SetupKey("btn_takeover");
            this.bAttack.Enabled = !this.doesHaveMaxOutposts();
            this.bAttack.Highlight = !this.doesHaveMaxOutposts();
        } else {
            this.bAttack.SetupKey("map_attack_btn");
            if (this._cell._protected || this._cell._locked != 0 || !MapRoom._flingerInRange) {
                this.bAttack.Highlight = false;
            } else {
                this.bAttack.Highlight = true;
                this.bAttack.Enabled = true;
            }
        }
        if (this._cell._base == 3) {
            this.bSendMessage.Enabled = true;
            this.bTruce.Enabled = true;
            if (ALLIANCES._myAlliance) {
                this.bAlliance.Enabled = true;
            } else {
                this.bAlliance.Enabled = false;
                if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
                    this.bAlliance.visible = false;
                }
            }
            if (!this._cell._destroyed) {
                this.tName.htmlText = "<b>" + this._cell._name + "\'s " + KEYS.Get("b_outpost") + "</b>";
                if (this._cell._alliance) {
                    this.tName.htmlText += "<br>" + this._cell._alliance.name;
                }
            } else {
                this.tName.htmlText = "<b>" + this._cell._name + "\'s " + KEYS.Get("b_outpost") + " (" + KEYS.Get("newmap_inf_destroyed") + ")</b>";
                if (this._cell._alliance) {
                    this.tName.htmlText += "<br>" + this._cell._alliance.name;
                }
            }
            this.ProfilePic();
            if (this._cell._level) {
                this.mcLevel.visible = true;
                this.mcLevel.lv_txt.htmlText = "<b>" + this._cell._level + "</b>";
            } else {
                this.mcLevel.visible = false;
            }
            if (this._cell._alliance) {
                this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), as3.cast(this.mcAlliancePic.mcImage, MovieClip), as3.cast(this.mcAlliancePic.mcBG, MovieClip), true);
            } else {
                this.mcAlliancePic.visible = false;
                this.mcRelations.visible = false;
            }
        } else if (this._cell._base == 2) {
            this.bSendMessage.Enabled = true;
            this.bTruce.Enabled = true;
            if (ALLIANCES._myAlliance) {
                this.bAlliance.Enabled = true;
            } else {
                this.bAlliance.Enabled = false;
                if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
                    this.bAlliance.visible = false;
                }
            }
            this.tName.htmlText = "<b>" + KEYS.Get("map_yardowner", { "v1": this._cell._name }) + "</b>";
            if (this._cell._alliance) {
                this.tName.htmlText += "<br>" + this._cell._alliance.name;
            }
            this.ProfilePic();
            if (this._cell._level) {
                this.mcLevel.visible = true;
                this.mcLevel.lv_txt.htmlText = "<b>" + this._cell._level + "</b>";
            } else {
                this.mcLevel.visible = false;
            }
            if (this._cell._alliance) {
                this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), as3.cast(this.mcAlliancePic.mcImage, MovieClip), as3.cast(this.mcAlliancePic.mcBG, MovieClip), true);
            } else {
                this.mcAlliancePic.visible = false;
                this.mcRelations.visible = false;
            }
        } else if (this._cell._base == 1) {
            this.bSendMessage.Enabled = false;
            this.bTruce.Enabled = false;
            this.bAlliance.Enabled = false;
            this.bAlliance.visible = false;
            if (!this._cell._destroyed) {
                this.tName.htmlText = "<b>" + KEYS.Get("ai_tribe", { "v1": TRIBES.DisplayName(this._cell._name) }) + "</b>";
            } else {
                this.tName.htmlText = "<b>" + KEYS.Get("ai_tribe", { "v1": TRIBES.DisplayName(this._cell._name) }) + " (" + KEYS.Get("newmap_inf_destroyed") + ")</b>";
            }
            this.ProfilePic();
            if (this._cell._level) {
                this.mcLevel.visible = true;
                this.mcLevel.lv_txt.htmlText = "<b>" + this._cell._level + "</b>";
            } else {
                this.mcLevel.visible = false;
            }
            if (this._cell._alliance) {
                this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), as3.cast(this.mcAlliancePic.mcImage, MovieClip), as3.cast(this.mcAlliancePic.mcBG, MovieClip), false);
            } else {
                this.mcAlliancePic.visible = false;
                this.mcRelations.visible = false;
            }
        }
        this.tLocation.htmlText = IoMapUi.location(this._cell.X, this._cell.Y);
        this.tHeight.htmlText = this._cell._height - 100 + "m";
        if (this._cell._base == 2) {
            _loc6_ = 0;
        } else {
            _loc6_ = (this._cell._height * 100 / GLOBAL._averageAltitude.Get() - 100) | 0;
        }
        if (this._cell._base == 2) {
            _loc7_ = 0;
        } else {
            _loc7_ = (100 * GLOBAL._averageAltitude.Get() / this._cell._height - 100) | 0;
        }
        if (_loc6_ >= 0) {
            _loc8_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h1", { "v1": _loc6_ }) + "</font>";
        } else {
            _loc8_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h1", { "v1": Math.abs(_loc6_) }) + "</font>";
        }
        if (_loc7_ >= 0) {
            _loc9_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h2", { "v1": _loc7_ }) + "</font>";
        } else {
            _loc9_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h2", { "v1": Math.abs(_loc7_) }) + "</font>";
        }
        this.tBonus.htmlText = _loc8_ + "<br>" + _loc9_;
        if (this._cell._friend) {
            this.bView.SetupKey("btn_help");
        } else {
            this.bView.SetupKey("map_view_btn");
        }
        PopupInfoEnemy._bookmarked = false;
        this.bBookmark.Enabled = true;
        if (MapRoom._bookmarks) {
            _loc12_ = 0;
            while (_loc12_ < MapRoom._bookmarks.length) {
                if (MapRoom._bookmarks[_loc12_].location.x == this._cell.X && MapRoom._bookmarks[_loc12_].location.y == this._cell.Y) {
                    PopupInfoEnemy._bookmarked = true;
                    break;
                }
                _loc12_++;
            }
            if (PopupInfoEnemy._bookmarked) {
                this.bBookmark.Enabled = false;
            } else {
                this.bBookmark.Enabled = true;
            }
        }
        this.Update();
    }

    public Cleanup(): void {
        this.bAttack.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bAttack.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bAttack.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
        this.bView.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bView.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bView.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.View();
        });
        this.bSendMessage.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bSendMessage.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bSendMessage.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowMessage();
        });
        this.bTruce.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bTruce.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bTruce.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowTruce();
        });
        this.bAlliance.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bAlliance.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bAlliance.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowAllianceInvite();
        });
        this.bBookmark.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.ButtonInfo));
        this.bBookmark.addEventListener(MouseEvent.MOUSE_OUT, (param1: MouseEvent): void => {
            this.PopupHide();
        });
        this.bBookmark.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            if (!PopupInfoEnemy._bookmarked) {
                MapRoom._mc.ShowBookmarkAddPopup(this._cell);
            } else {
                GLOBAL.Message(KEYS.Get("newmap_bm_done"));
            }
        });
        PopupInfoEnemy._minTakeoverCost = null;
        PopupInfoEnemy._takeoverCoeff1 = null;
        PopupInfoEnemy._takeoverCoeff2 = null;
        if (this.mcFrame) {
            this.mcFrame.Clear();
            this.mcFrame = null;
        }
    }

    private ProfilePic(): void {
        let onImageLoad: Function = null;
        let imageComplete: Function = null;
        let LoadImageError: Function = null;
        onImageLoad = (param1: Event): void => {
            if (this._profilePic) {
                this._profilePic.width = this._profilePic.height = 50;
            }
        };
        imageComplete = (param1: string, param2: BitmapData): void => {
            this._profileBmp = new Bitmap(param2);
            this.mcProfilePic.mcBG.addChild(this._profileBmp);
        };
        LoadImageError = (param1: IOErrorEvent): void => {
        };
        if (!this._cell._facebookID && this._cell._base != 1 && !this._cell._pic_square) {
            return;
        }
        if (this._cell._base > 1) {
            this._profilePic = new Loader();
            if (!GLOBAL._flags.viximo) {
                this._profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this._profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                if (this._cell._pic_square) {
                    this._profilePic.load(new URLRequest(this._cell._pic_square));
                }
            } else {
                this._profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                this._profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
                this._profilePic.load(new URLRequest("http://graph.facebook.com/" + this._cell._facebookID + "/picture"));
            }
            this.mcProfilePic.mcBG.addChild(this._profilePic);
        } else {
            switch (this._cell._name) {
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
    }

    private AlliancePic(param1: string, param2: MovieClip, param3: MovieClip = null, param4: boolean = false): void {
        let k: int = 0;
        let allyinfo: AllyInfo = null;
        let size: string = param1;
        let container: MovieClip = param2;
        let containerBG: MovieClip = param3;
        let showRel: boolean = param4;
        let AllianceIconLoaded: Function = (param1: string, param2: BitmapData, param3: any[] = null): void => {
            let _loc4_: Bitmap = new Bitmap(param2);
            if (param3[0]) {
                param3[0].addChild(_loc4_);
                param3[0].setChildIndex(_loc4_, 0);
                if (param3[0].parent) {
                    param3[0].parent.visible = true;
                }
            }
        };
        let AllianceIconRelationLoaded: Function = (param1: string, param2: BitmapData, param3: any[] = null): void => {
            let _loc4_: Bitmap = new Bitmap(param2);
            if (param3[0]) {
                param3[0].addChild(_loc4_);
                param3[0].visible = true;
            }
        };
        // The original also required a Facebook id here. Every player had one on
        // Facebook and none has one on Refitted, so the check hid the alliance
        // shield on this popup outright.
        if (this._cell._base <= 1) {
            this.mcAlliancePic.visible = false;
            this.mcRelations.visible = false;
            return;
        }
        if (this._cell._base > 1 && Boolean(this._cell._alliance)) {
            k = this.mcAlliancePic.mcImage.numChildren | 0;
            while (k--) {
                this.mcAlliancePic.mcImage.removeChildAt(k);
            }
            k = this.mcRelations.numChildren;
            while (k--) {
                this.mcRelations.removeChildAt(k);
            }
            this.mcAlliancePic.visible = true;
            allyinfo = this._cell._alliance;
            allyinfo.AlliancePic(size, container, containerBG, true);
        } else {
            this.mcAlliancePic.visible = false;
        }
    }

    private doesHaveMaxOutposts(): boolean {
        return Boolean(GLOBAL._mapOutpost) && GLOBAL._mapOutpost.length >= GLOBAL.k_MAX_NUMBER_OF_OUTPOSTS;
    }

    public Attack(param1: MouseEvent): void {
        let _loc2_: number = NaN;
        let _loc3_: int = 0;
        let _loc4_: PopupTakeover = null;
        if (GLOBAL._flags.attacking == 0) {
            GLOBAL.Message(KEYS.Get("map_msg_attackingdisabled"));
            return;
        }
        // Admin test mode: a practice attack on any yard (nothing is written to it).
        if (GLOBAL.ioTestMode()) {
            MapRoom._mc.ShowAttack(this._cell);
            return;
        }
        if (this._cell._base != 2 && this._cell._destroyed && !this._cell._protected && (this._cell._locked == 0 || this._cell._locked == LOGIN._playerID) && MapRoom._flingerInRange) {
            _loc2_ = PopupInfoEnemy._minTakeoverCost.Get();
            if (GLOBAL._mapOutpost) {
                _loc3_ = GLOBAL._mapOutpost.length | 0;
                if (this.doesHaveMaxOutposts()) {
                    GLOBAL.Message(KEYS.Get("mr2_opcap"));
                    return;
                }
                if (_loc3_ > 0 && _loc3_ <= 4) {
                    _loc2_ = PopupInfoEnemy._takeoverCoeff1.Get() * _loc3_;
                } else if (_loc3_ > 4) {
                    _loc2_ = PopupInfoEnemy._takeoverCoeff2.Get() + PopupInfoEnemy._minTakeoverCost.Get() * (_loc3_ - 4);
                }
            }
            PopupInfoEnemy._takeoverCost = new SecNum(_loc2_);
            PopupInfoEnemy._shinyCost = new SecNum(Math.ceil(Math.pow(Math.sqrt(PopupInfoEnemy._takeoverCost.Get() * 2), 0.75)));
            if (PopupInfoEnemy._takeoverCost.Get() == 0) {
                this.TakeOverConfirm();
            } else {
                GLOBAL.BlockerAdd(GLOBAL._layerTop);
                _loc4_ = new PopupTakeover(this._cell);
                GLOBAL._layerTop.addChild(_loc4_);
            }
        } else if (this._cell._locked != 0) {
            if (this._cell._base == 1) {
                GLOBAL.Message(KEYS.Get("newmap_take2"));
            } else {
                GLOBAL.Message(KEYS.Get("newmap_take3"));
            }
        } else if (this._cell._protected) {
            GLOBAL.Message(KEYS.Get("newmap_dp"));
        } else if (Boolean(this._cell._truce) && this._cell._truce > GLOBAL.Timestamp()) {
            GLOBAL.Message(KEYS.Get("newmap_truce"));
        } else if (Boolean(this._cell._alliance) && this._cell._allianceID == ALLIANCES._allianceID) {
            GLOBAL.Message(KEYS.Get("map_attack_ally", { "v1": this._cell._name }), KEYS.Get("map_attack_btn"), as3.bind(this, this.DoAttack));
        } else if (Boolean(this._cell._alliance) && this._cell._alliance.relationship > 0) {
            GLOBAL.Message(KEYS.Get("map_attack_allyfriend", { "v1": this._cell._name }), KEYS.Get("map_attack_btn"), as3.bind(this, this.DoAttack));
        } else if (this._cell._friend) {
            GLOBAL.Message(KEYS.Get("map_msg_attackfriend", { "v1": this._cell._name }), KEYS.Get("map_attack_btn"), as3.bind(this, this.DoAttack));
        } else {
            MapRoom._mc.ShowAttack(this._cell);
        }
    }

    public DoAttack(): void {
        MapRoom._mc.ShowAttack(this._cell);
    }

    private TakeOverConfirm(): void {
        let empire: any = null;
        let takeoverSuccessful: Function = null;
        let takeoverError: Function = null;
        takeoverSuccessful = (serverData: any): void => {
            PLEASEWAIT.Hide();
            if (serverData.error == 0) {
                BASE._takeoverFirstOpen = this._cell._base == 1 ? 1 : 2;
                BASE._takeoverPreviousOwnersName = TRIBES.DisplayName(this._cell._name);
                // (Inferno-only: a tribe's Inferno name)
                MapRoom.GetCell(this._cell.X, this._cell.Y, true);
                GLOBAL._mapOutpost.push(new Point(this._cell.X, this._cell.Y));
                GLOBAL._resources.r1max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r2max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r3max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r4max += GLOBAL._outpostCapacity.Get();
                MapRoom.ClearCells();
                MapRoomManager.instance.Hide();
                GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
                GLOBAL._currentCell = this._cell;
                (as3.as(GLOBAL._currentCell, MapRoomCell)).baseType = 3;
                BASE.yardType = EnumYardType.OUTPOST;
                GLOBAL.BlockerRemove();
                BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.OUTPOST);
                LOGGER.Stat([37, BASE._takeoverFirstOpen]);
            } else {
                GLOBAL.Message(KEYS.Get("err_takeoverproblem") + serverData.error);
            }
        };
        takeoverError = (param1: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("err_takeoverproblem") + param1.text);
        };
        let takeoverVars: any[] = [["baseid", this._cell._baseID], ["resources", JSON.stringify({ "r1": PopupInfoEnemy._takeoverCost.Get(), "r2": PopupInfoEnemy._takeoverCost.Get(), "r3": PopupInfoEnemy._takeoverCost.Get(), "r4": PopupInfoEnemy._takeoverCost.Get() })]];
        let mapIndex: int = 1;
        let possible: boolean = false;
        let r1: int = PopupInfoEnemy._takeoverCost.Get() | 0;
        let r2: int = PopupInfoEnemy._takeoverCost.Get() | 0;
        let r3: int = PopupInfoEnemy._takeoverCost.Get() | 0;
        let r4: int = PopupInfoEnemy._takeoverCost.Get() | 0;
        if (GLOBAL._resources) {
            empire = { "r1": GLOBAL._resources.r1.Get(), "r2": GLOBAL._resources.r2.Get(), "r3": GLOBAL._resources.r3.Get(), "r4": GLOBAL._resources.r4.Get() };
            if (-r1 <= GLOBAL._resources.r1.Get() && -r2 <= GLOBAL._resources.r2.Get() && -r3 <= GLOBAL._resources.r3.Get() && -r4 <= GLOBAL._resources.r4.Get()) {
                possible = true;
            }
        }
        if (possible) {
            PLEASEWAIT.Show(KEYS.Get("plsw_taking"));
            new URLLoaderApi().load(GLOBAL._mapURL + "takeovercell", takeoverVars, takeoverSuccessful, takeoverError);
        } else {
            GLOBAL.Message(KEYS.Get("newmap_take4"));
        }
    }

    public View(): void {
        let _loc1_: int = 0;
        MapRoom._mc.HideInfoEnemy();
        MapRoomManager.instance.Hide();
        if (MapRoom._mc) {
            GLOBAL._attackerCellsInRange = MapRoom._mc.GetCellsInRange(this._cell.X, this._cell.Y, 10);
        }
        GLOBAL._currentCell = this._cell;
        if (this._cell._base == 1) {
            BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.WMVIEW, false, EnumYardType.MAIN_YARD);
        } else {
            _loc1_ = this._cell._base == 3 ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
            if (this._cell._friend) {
                BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.HELP, false, _loc1_);
            } else {
                BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.VIEW, false, _loc1_);
            }
        }
    }

    public ShowMessage(): void {
        if (this._cell._base < 2) {
            GLOBAL.Message(KEYS.Get("newmap_wmmsg"));
            return;
        }
        if (Boolean(this._message) && Boolean(this._message.parent)) {
            this._message.parent.removeChild(this._message);
            this._message = null;
        }
        let _loc1_: Contact = new Contact(String(this._cell._userID), { "first_name": this._cell._name, "last_name": "", "pic_square": this._cell._pic_square });
        this._message = new Message();
        this._message.picker.preloadSelection(_loc1_);
        this._message.requestType = "message";
        this._message.body_txt.htmlText = "";
        this._message.x = 0;
        this._message.y = -450;
        GLOBAL.BlockerAdd(as3.as(this.parent, MovieClip));
        (as3.as(this.parent, MovieClip)).addChild(this._message);
    }

    public ShowTruce(): void {
        if (this._cell._base < 2) {
            GLOBAL.Message(KEYS.Get("newmap_wmtruce", { "v1": TRIBES.DisplayName(this._cell._name) }));
            return;
        }
        if (Boolean(this._message) && Boolean(this._message.parent)) {
            this._message.parent.removeChild(this._message);
            this._message = null;
        }
        let _loc1_: Contact = new Contact(String(this._cell._userID), { "first_name": this._cell._name, "last_name": "", "pic_square": this._cell._pic_square });
        this._message = new Message();
        this._message.picker.preloadSelection(_loc1_);
        this._message.requestType = "trucerequest";
        this._message.subject_txt.htmlText = KEYS.Get("map_trucerequest") + " " + this._cell._name;
        this._message.body_txt.htmlText = KEYS.Get("map_trucemessage");
        this._message.x = 0;
        this._message.y = -450;
        GLOBAL.BlockerAdd(as3.as(this.parent, MovieClip));
        (as3.as(this.parent, MovieClip)).addChild(this._message);
    }

    public ShowAllianceInvite(): void {
        if (this._cell._base < 2) {
            GLOBAL.Message(KEYS.Get("newmap_wmtruce", { "v1": TRIBES.DisplayName(this._cell._name) }));
            return;
        }
        ALLIANCES.AllianceInvite(this._cell._userID);
    }

    public ButtonInfo(param1: MouseEvent): void {
        let _loc2_: string = "";
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (param1.currentTarget.name == "bAttack") {
            if (this._cell._destroyed) {
                _loc2_ = KEYS.Get("newmap_take5");
            } else {
                _loc2_ = KEYS.Get("newmap_att4");
            }
            if (GLOBAL.INFERNO_ONLY && !MapRoom._flingerInRange) {
                _loc2_ = KEYS.Get("io_map_outofrange");
            }
            _loc3_ = (this.bAttack.x - 5) | 0;
            _loc4_ = (this.bAttack.y + this.bAttack.height / 2 - 0) | 0;
        } else if (param1.currentTarget.name == "bView") {
            _loc2_ = KEYS.Get("newmap_view", { "v1": this._cell._base == 1 ? TRIBES.DisplayName(this._cell._name) : this._cell._name });
            _loc3_ = (this.bView.x - 5) | 0;
            _loc4_ = (this.bView.y + this.bAttack.height / 2 - 0) | 0;
        } else if (param1.currentTarget.name == "bSendMessage") {
            _loc2_ = KEYS.Get("newmap_msg");
            _loc3_ = (this.bSendMessage.x - 5) | 0;
            _loc4_ = (this.bSendMessage.y + this.bAttack.height / 2 - 0) | 0;
        } else if (param1.currentTarget.name == "bTruce") {
            _loc2_ = KEYS.Get("newmap_reqtruce");
            _loc3_ = (this.bTruce.x - 5) | 0;
            _loc4_ = (this.bTruce.y + this.bAttack.height / 2 - 0) | 0;
        } else if (param1.currentTarget.name == "bBookmark") {
            _loc2_ = KEYS.Get("newmap_bookmark");
            _loc3_ = (this.bBookmark.x - 5) | 0;
            _loc4_ = (this.bBookmark.y + this.bAttack.height / 2 - 0) | 0;
        } else if (param1.currentTarget.name == "bAlliance") {
            _loc2_ = KEYS.Get("btn_invitetoalliance");
            _loc3_ = (this.bAlliance.x - 5) | 0;
            _loc4_ = (this.bAlliance.y + this.bAttack.height / 2 - 0) | 0;
        }
        _loc3_ = (_loc3_ + this.x) | 0;
        _loc4_ = (_loc4_ + this.y) | 0;
        this.PopupShow(_loc3_, _loc4_, _loc2_);
    }

    private PopupShow(param1: int, param2: int, param3: string): void {
        this.PopupHide();
        PopupInfoEnemy._popupmc = new bubblepopupRight();
        PopupInfoEnemy._popupmc.Setup(param1, param2, param3, 150);
        PopupInfoEnemy._popupmc.Nudge("left");
        if (PopupInfoEnemy._popupmc.mcArrow.x < PopupInfoEnemy._popupmc.mcBG.x + PopupInfoEnemy._popupmc.mcBG.width - 5) {
            PopupInfoEnemy._popupmc.mcArrow.x = PopupInfoEnemy._popupmc.mcBG.x + PopupInfoEnemy._popupmc.mcBG.width - 5;
        }
        PopupInfoEnemy._popupdo = this.parent.addChild(PopupInfoEnemy._popupmc);
    }

    public PopupHide(): void {
        if (PopupInfoEnemy._popupdo) {
            // Removed from wherever it actually is: it may already be gone from this popup's parent.
            if (PopupInfoEnemy._popupdo.parent) {
                PopupInfoEnemy._popupdo.parent.removeChild(PopupInfoEnemy._popupdo);
            }
            PopupInfoEnemy._popupdo = null;
        }
    }

    private Update(): void {
        let _loc1_: string = "";
        _loc1_ = "X:" + this._cell.X + " Y:" + this._cell.Y + "<br>_base:" + this._cell._base + "<br>_height:" + this._cell._height + "<br>_water:" + this._cell._water + "<br>_mine:" + this._cell._mine + "<br>_flinger:" + this._cell._flingerRange.Get() + "<br>_catapult:" + this._cell._catapult + "<br>_userID:" + this._cell._userID + "<br>_truce:" + this._cell._truce + "<br>_name:" + this._cell._name + "<br>_protected:" + this._cell._protected + "<br>_resources:" + JSON.stringify(this._cell._resources) + "<br>_ticks:" + JSON.stringify(this._cell._ticks) + "<br>_monsters:" + JSON.stringify(this._cell._monsters);
        if (this._cell._monsterData) {
            _loc1_ += "<br>_monsterData:" + JSON.stringify(this._cell._monsterData);
            _loc1_ += "<br>_monsterData.saved:" + JSON.stringify(this._cell._monsterData.saved);
            _loc1_ += "<br>_monsterData.h:" + JSON.stringify(this._cell._monsterData.h);
            _loc1_ += "<br>_monsterData.hcount:" + this._cell._monsterData.hcount;
        }
    }

    private Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }
}
