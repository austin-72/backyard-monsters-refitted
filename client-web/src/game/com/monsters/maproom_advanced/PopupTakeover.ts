import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, CellData, EnumYardType, GLOBAL, ImageCache, IoUnderworld, KEYS, LOGGER, MapRoomCell, MapRoomManager, MapRoomPopup_takeover_CLIP, PLEASEWAIT, POPUPS, POPUPSETTINGS, POWERUPS, SecNum, TRIBES, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupTakeover extends MapRoomPopup_takeover_CLIP {
    static {
        as3.fields(this, { _resourceCost: null, _shinyCost: null, _costGap: 0, _cell: null });
    }

    private static readonly TAKEOVER_CAP: int = 65000000;
    private _resourceCost: SecNum;
    private _shinyCost: SecNum;
    private _costGap: int;
    private _cell: MapRoomCell;

    public $ctor(param1?: MapRoomCell): void {
        let cellValue: number = NaN;
        let WMBASE: boolean = false;
        let WMLEVEL: int = 0;
        let slope: number = NaN;
        let intercept: number = NaN;
        let roundTo: int = 0;
        let half: boolean = false;
        let i: int = 0;
        let bonusTower: int = 0;
        let bonusResource: int = 0;
        let ImageLoaded: Function = null;
        let newResource: number = NaN;
        let bonusStr: string = null;
        let costMC: MovieClip = null;
        let colorString: string = null;
        let cell: MapRoomCell = param1;
        super.$ctor();
        ImageLoaded = (param1: string, param2: BitmapData): void => {
            this.mcImage.addChild(new Bitmap(param2));
        };
        this._cell = cell;
        this.Center();
        ImageCache.GetImageWithCallBack("popups/outpost-takeover.png", ImageLoaded, true, 1);
        this._costGap = 0;
        this._resourceCost = new SecNum(1000000);
        cellValue = Number(this._cell._value);
        WMBASE = this._cell._base == 1;
        WMLEVEL = this._cell._level;
        slope = Number(WMBASE ? 562500 : 15820570.7);
        intercept = Number(WMBASE ? -14750000 : -227080916.9);
        roundTo = 250000;
        if (!WMBASE) {
            newResource = Math.min(Math.max(Math.round((Math.log(cellValue) * slope + intercept) / roundTo) * roundTo, 1000000), PopupTakeover.TAKEOVER_CAP);
        } else {
            newResource = Math.max(Math.round((WMLEVEL * slope + intercept) / roundTo) * roundTo, 1000000);
        }
        half = false;
        if (Math.abs(GLOBAL._mapHome.x - this._cell.X) == 1) {
            if (GLOBAL._mapHome.y + 1 - (GLOBAL._mapHome.x + 1) % 2 * 2 == this._cell.Y || GLOBAL._mapHome.y == this._cell.Y) {
                half = true;
            }
        } else if (GLOBAL._mapHome.x == this._cell.X) {
            if (GLOBAL._mapHome.y + 1 == this._cell.Y || GLOBAL._mapHome.y - 1 == this._cell.Y) {
                half = true;
            }
        }
        if (half) {
            newResource *= 0.5;
        }
        this._resourceCost.Set(newResource);
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_CONQUEST, "NORMAL")) {
            this._resourceCost.Set(POWERUPS.Apply(POWERUPS.ALLIANCE_CONQUEST, [this._resourceCost.Get()]));
        }
        // Inferno-only: a takeover in the underworld costs twice as much (IoUnderworld)
        let ioUnder: boolean = GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(this._cell.X, this._cell.Y);
        if (ioUnder) {
            this._resourceCost.Set(this._resourceCost.Get() * IoUnderworld.costMultiplier);
        }
        this._shinyCost = new SecNum((GLOBAL.INFERNO_ONLY ? GLOBAL.ioPrice("takeover", 100) : Math.ceil(Math.pow(Math.sqrt(this._resourceCost.Get() / 2), 0.75) * 4)) * (ioUnder ? IoUnderworld.costMultiplier : 1));
        i = 1;
        while (i < 5) {
            costMC = as3.cast(this.mcResources["mcR" + i], MovieClip);
            // Frames 1-4 are twig / pebble / putty / goo; 7-10 are bone / coal / sulfur / magma.
            costMC.gotoAndStop(GLOBAL.INFERNO_ONLY ? i + 6 : i);
            costMC.tTitle.htmlText = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[i - 1])) + "</b>";
            colorString = "000000";
            if (GLOBAL._resources["r" + i].Get() <= this._resourceCost) {
                colorString = "FF0000";
            } else if (GLOBAL._allianceConquestTime.Get() > GLOBAL.Timestamp()) {
                colorString = "0000FF";
            }
            costMC.tValue.htmlText = "<b><font color=\"#" + (this._resourceCost > GLOBAL._resources["r" + i].Get() ? "FF0000" : "000000") + "\">" + GLOBAL.FormatNumber(this._resourceCost.Get()) + "</font></b>";
            i++;
        }
        bonusTower = (this._cell._height * 100 / GLOBAL._averageAltitude.Get() - 100) | 0;
        bonusResource = (100 * GLOBAL._averageAltitude.Get() / this._cell._height - 100) | 0;
        if (this._cell._height != GLOBAL._averageAltitude.Get()) {
            if (this._cell._height > GLOBAL._averageAltitude.Get()) {
                bonusStr = KEYS.Get("bonus_towerrange", { "v1": bonusTower });
            } else {
                bonusStr = KEYS.Get("bonus_resourceproduction", { "v1": bonusResource });
            }
        }
        if (this._cell._base == 1) {
            this.tTitle.htmlText = "<b>" + KEYS.Get("takeover_wildmonsteryard") + "</b>";
        } else {
            this.tTitle.htmlText = "<b>" + KEYS.Get("takeover_outpost", { "v1": this._cell._name }) + "</b>";
        }
        this.tDescription.htmlText = "<b>" + KEYS.Get("takeover_expand") + (!(!bonusStr) ? " " + bonusStr : "") + "</b>";
        if (GLOBAL.INFERNO_ONLY) {
            // (bug report B12: how the price is worked out, said)
            let why: string = WMBASE ? KEYS.Get("io_takeover_price_level", { "v1": WMLEVEL }) : KEYS.Get("io_takeover_price_value");
            if (half) {
                why += " " + KEYS.Get("io_takeover_half");
            }
            if (ioUnder) {
                why += " " + IoUnderworld.NAME + ": " + IoUnderworld.costMultiplier + "x the price.";
            }
            this.tDescription.htmlText = "<b>" + KEYS.Get("takeover_expand") + (!(!bonusStr) ? " " + bonusStr : "") + "</b> " + why;
            GLOBAL.ioFitHeight(this.tDescription);
        }
        this.mcResources.mcTime.visible = false;
        this.mcResources.bAction.SetupKey("btn_useresources");
        this.mcResources.bAction.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.TakeOverConfirm(false);
        });
        this.mcInstant.bAction.Setup(KEYS.Get("btn_useshiny", { "v1": this._shinyCost.Get() }));
        this.mcInstant.tDescription.htmlText = KEYS.Get("takeover_instant");
        this.mcInstant.bAction.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.TakeOverConfirm(true);
        });
    }

    public Hide(): void {
        GLOBAL.BlockerRemove();
        this.parent.removeChild(this);
    }

    public TakeOverConfirm(param1: boolean): void {
        let mapIndex: int = 0;
        let r1: int = 0;
        let r2: int = 0;
        let r3: int = 0;
        let r4: int = 0;
        let takeoverVars: any[] = null;
        let takeoverSuccessful: Function = null;
        let takeoverError: Function = null;
        let useShiny: boolean = param1;
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
                BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.OUTPOST);
                LOGGER.Stat([37, BASE._takeoverFirstOpen]);
            } else {
                GLOBAL.Message(KEYS.Get("err_takeoverproblem") + serverData.error);
            }
            this.Hide();
        };
        takeoverError = (param1: IOErrorEvent): void => {
            this.Hide();
            GLOBAL.Message(KEYS.Get("err_takeoverproblem") + param1.text);
        };
        if (useShiny) {
            if (GLOBAL._credits.Get() < this._shinyCost.Get()) {
                POPUPS.DisplayGetShiny();
                return;
            }
            if (!GLOBAL.ioConfirmShiny(this._shinyCost.Get() | 0, "to take over this outpost", (): void => {
                this.TakeOverConfirm(param1);
            })) {
                return;
            }
            takeoverVars = [["baseid", this._cell._baseID], ["shiny", this._shinyCost.Get()]];
        } else {
            if (GLOBAL._resources.r1.Get() < this._resourceCost.Get() || GLOBAL._resources.r2.Get() < this._resourceCost.Get() || GLOBAL._resources.r3.Get() < this._resourceCost.Get() || GLOBAL._resources.r4.Get() < this._resourceCost.Get()) {
                GLOBAL.Message(KEYS.Get("newmap_take4"));
                return;
            }
            takeoverVars = [["baseid", this._cell._baseID], ["resources", JSON.stringify({ "r1": this._resourceCost.Get(), "r2": this._resourceCost.Get(), "r3": this._resourceCost.Get(), "r4": this._resourceCost.Get() })]];
        }
        mapIndex = 1;
        r1 = this._resourceCost.Get() | 0;
        r2 = this._resourceCost.Get() | 0;
        r3 = this._resourceCost.Get() | 0;
        r4 = this._resourceCost.Get() | 0;
        PLEASEWAIT.Show(KEYS.Get("plsw_taking"));
        new URLLoaderApi().load(GLOBAL._mapURL + "takeovercell", takeoverVars, takeoverSuccessful, takeoverError);
    }

    private Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }
}
