import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { GLOBAL, KEYS, LOGGER, MapRoomCell, MapRoomManager, MapRoomPopup, PLEASEWAIT, POPUPS, PopupRelocateMe_CLIP, SecNum, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupRelocateMe extends PopupRelocateMe_CLIP {
    static {
        as3.fields(this, { _cell: null, _oldCell: null, RESOURCECOST: null, SHINYCOST: null, _mode: null, _onInstantClick: null, _onResourcesClick: null });
    }

    private _cell: MapRoomCell;
    private _oldCell: MapRoomCell;
    private RESOURCECOST: SecNum;
    private SHINYCOST: SecNum;
    private _mode: string;
    private _onInstantClick: Function;
    private _onResourcesClick: Function;

    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: MapRoomCell, param2: string = "outpost"): void {
        let self: PopupRelocateMe = null;
        let i: int = 0;
        let resource: MovieClip = null;
        let cell: MapRoomCell = param1;
        let mode: string = param2;
        this._cell = cell;
        if (!MapRoom._open) {
            this.x = 365;
            this.y = 260;
        } else {
            this.x = 395;
            this.y = 260;
        }
        self = this;
        this._mode = mode;
        this.tTitle.htmlText = "<b>" + KEYS.Get("map_relocate") + "</b>";
        if (mode == "invite") {
            this._onInstantClick = (param1: MouseEvent): void => {
                if (self.parent) {
                    self.parent.removeChild(self);
                }
                MapRoom.AcceptInvitation(true);
            };
            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, this._onInstantClick);
            this.RESOURCECOST = new SecNum(GLOBAL.INFERNO_ONLY ? 30000000 : 10000000);
            this.SHINYCOST = new SecNum(GLOBAL.ioPrice("move_main", 1200));
            if (GLOBAL.INFERNO_ONLY && !MapRoom._inviteCrossWorld) {
                // Same world: only the main yard moves; the player keeps every outpost.
                this.tDescription.htmlText = "Your main yard will move onto this outpost. Your own outposts stay yours.";
            } else {
                this.tDescription.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("msg_moveyard_warn") + "</font>";
            }
        } else {
            this._onInstantClick = (param1: MouseEvent): void => {
                this.RelocateConfirm(true);
            };
            this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, this._onInstantClick);
            this.RESOURCECOST = new SecNum(30000000);
            this.SHINYCOST = new SecNum(GLOBAL.ioPrice("move_outpost", 1500));
            this.tDescription.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("msg_movetooutpost_warn") + "</font>";
        }
        this.mcInstant.tDescription.htmlText = "<b>" + KEYS.Get("map_relocateinstant") + "</b>";
        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": GLOBAL.FormatNumber(this.SHINYCOST.Get()) }));
        i = 1;
        while (i < 5) {
            resource = as3.cast(this.mcResources["mcR" + i], MovieClip);
            resource.gotoAndStop(i);
            resource.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[i - 1])) + "</b>";
            resource.tValue.htmlText = "<b>" + GLOBAL.FormatNumber(this.RESOURCECOST.Get()) + "</b>";
            i++;
        }
        this.mcResources.mcTime.visible = false;
        this.mcResources.bAction.SetupKey("btn_useresources");
        if (mode == "invite") {
            this._onResourcesClick = (param1: MouseEvent): void => {
                if (self.parent) {
                    self.parent.removeChild(self);
                }
                MapRoom.AcceptInvitation(false);
            };
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, this._onResourcesClick);
        } else {
            this._onResourcesClick = (param1: MouseEvent): void => {
                this.RelocateConfirm(false);
            };
            this.mcResources.bAction.addEventListener(MouseEvent.CLICK, this._onResourcesClick);
        }
    }

    public Cleanup(): void {
        if (this._onInstantClick != null) {
            this.mcInstant.bAction.removeEventListener(MouseEvent.CLICK, this._onInstantClick);
        }
        if (this._onResourcesClick != null) {
            this.mcResources.bAction.removeEventListener(MouseEvent.CLICK, this._onResourcesClick);
        }
    }

    public Hide(): void {
        GLOBAL.BlockerRemove();
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    public RelocateConfirm(param1: boolean): void {
        let useShiny: boolean = false;
        let RelocateSuccess: Function = null;
        let RelocateFail: Function = null;
        useShiny = param1;
        RelocateSuccess = (param1: any): void => {
            PLEASEWAIT.Hide();
            if (param1.error == 0) {
                if (param1.cantMoveTill) {
                    GLOBAL.Message(KEYS.Get("movebase_warning", { "v1": GLOBAL.ToTime((param1.cantMoveTill - param1.currenttime) | 0) }));
                    this.Hide();
                } else {
                    GLOBAL._resources.r1max -= GLOBAL._outpostCapacity.Get();
                    GLOBAL._resources.r2max -= GLOBAL._outpostCapacity.Get();
                    GLOBAL._resources.r3max -= GLOBAL._outpostCapacity.Get();
                    GLOBAL._resources.r4max -= GLOBAL._outpostCapacity.Get();
                    LOGGER.Stat([45, useShiny ? this.SHINYCOST.Get() : 0]);
                    this.Hide();
                    MapRoom._mc._popupInfoMine.Hide();
                    // Inferno-only: moving the main yard to one of your outposts stays on this map, so
                    // the bookmarks stay (they are cleared only when leaving the world).
                    if (!GLOBAL.INFERNO_ONLY) {
                        MapRoomManager.instance.BookmarksClear();
                    }
                    GLOBAL._mapOutpost.shift();
                    if (param1.coords && param1.coords.length == 2 && param1.coords[0] > -1 && param1.coords[1] > -1) {
                        GLOBAL._mapHome = new Point(param1.coords[0], param1.coords[1]);
                        MapRoom._Setup(GLOBAL._mapHome);
                    }
                    if (useShiny) {
                        GLOBAL._credits.Add(-this.SHINYCOST.Get());
                    } else {
                        GLOBAL._resources.r1.Add(-this.RESOURCECOST.Get());
                        GLOBAL._resources.r2.Add(-this.RESOURCECOST.Get());
                        GLOBAL._resources.r3.Add(-this.RESOURCECOST.Get());
                        GLOBAL._resources.r4.Add(-this.RESOURCECOST.Get());
                    }
                    this._cell._updated = false;
                    this._cell._dirty = true;
                    this._oldCell = MapRoom._homeCell;
                    if (this._oldCell) {
                        this._oldCell._updated = false;
                        this._oldCell._dirty = false;
                    } else {
                        LOGGER.Log("err", "Null home cell when transfering base");
                    }
                    MapRoom.ClearCells();
                    PLEASEWAIT.Show(KEYS.Get("wait_packingyard"));
                    this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.RelocateComplete));
                    MapRoomManager.instance.Tick();

                    if (MapRoomPopup.instance) {
                        MapRoomPopup.instance.CloseMapRoomAfterMigration();
                    }
                }
            } else {
                GLOBAL.Message(KEYS.Get("msg_err_relocate") + param1.error);
            }
        };
        RelocateFail = (param1: IOErrorEvent): void => {
            this.Hide();
            GLOBAL.Message(KEYS.Get("msg_err_relocate") + param1.text);
        };
        let relocateVars: any[] = [["type", "outpost"], ["baseid", this._cell._baseID]];
        if (useShiny) {
            if (GLOBAL._credits.Get() < this.SHINYCOST.Get()) {
                this.Hide();
                POPUPS.DisplayGetShiny();
                return;
            }
            if (!GLOBAL.ioConfirmShiny(this.SHINYCOST.Get() | 0, "to move here", (): void => {
                this.RelocateConfirm(true);
            })) {
                return;
            }
            relocateVars.push(["shiny", this.SHINYCOST.Get()]);
        } else {
            if (GLOBAL._resources.r1.Get() < this.RESOURCECOST.Get() || GLOBAL._resources.r2.Get() < this.RESOURCECOST.Get() || GLOBAL._resources.r3.Get() < this.RESOURCECOST.Get() || GLOBAL._resources.r4.Get() < this.RESOURCECOST.Get()) {
                this.Hide();
                GLOBAL.Message(KEYS.Get("map_relocate_notenoughresources"));
                return;
            }
            relocateVars.push(["resources", JSON.stringify({ "r1": this.RESOURCECOST.Get(), "r2": this.RESOURCECOST.Get(), "r3": this.RESOURCECOST.Get(), "r4": this.RESOURCECOST.Get() })]);
        }
        PLEASEWAIT.Show(KEYS.Get("wait_relocating"));
        new URLLoaderApi().load(GLOBAL._baseURL + "migrate", relocateVars, RelocateSuccess, RelocateFail);
    }

    private RelocateComplete(param1: Event): void {
        if (this._cell._updated && this._oldCell._updated) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.RelocateComplete));
            PLEASEWAIT.Hide();
        }
        this._oldCell._updated = true;
    }
}
