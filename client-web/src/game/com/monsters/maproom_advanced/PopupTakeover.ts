import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextField } from "flash/text";
import { ACHIEVEMENTS, BASE, CellData, EnumYardType, GLOBAL, ImageCache, InfernoKits, IoMapUi, IoOutpostsPopup, IoUnderworld, KEYS, LOGGER, MapRoomCell, MapRoomManager, MapRoomPopup_takeover_CLIP, PLEASEWAIT, POPUPS, POPUPSETTINGS, POWERUPS, SecNum, TRIBES, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom, popup_prefab, IoDevil } from "@game";

export class PopupTakeover extends MapRoomPopup_takeover_CLIP {
    static {
        as3.fields(this, { _resourceCost: null, _shinyCost: null, _costGap: 0, _cell: null, _ioKitStrip: null, _ioKitPaid: null });
    }

    /**
     * (13 November, the user's: "Fit the curve to be ~2.5million for the first kit (minimum), ~5million 2nd, ~15million
     * 3rd, ~75million 4th, ~160million 5th, and ~600million for last kit (maximum), still based on the outpost value")
     * a player's outpost: ln(price) = a·L³ + b·L² + c·L + d with L = ln(its value), fitted to those six prices at the
     * values of outposts of the six ready-made kits as they were that night (619,042 to 64,077,411): through the first
     * and last exactly, the others within 4%. Rising everywhere. Rounded to 250,000, between 2.5M and 600M. It was
     * twice the stock formula (12 November), and before that the stock formula. A wild tribe's price is as it was.
     * The server asks the same (maproom/v2/takeoverCell, ioPlayerTakeoverPrice).
     */
    public static readonly IO_TAKEOVER_CURVE: number[] = [0.016509073609409373, -0.6969864885013182, 10.776853179826519, -44.18606716220013];

    public static readonly IO_TAKEOVER_MIN: int = 2500000;

    public static readonly IO_TAKEOVER_MAX: int = 600000000;

    /** A player's outpost's takeover price from its value (IO_TAKEOVER_CURVE), before half next to home, Conquest and the Depths. */
    public static ioPlayerTakeoverPrice(value: number): number {
        if (!(value > 0)) {
            return PopupTakeover.IO_TAKEOVER_MIN;
        }
        let k: number[] = PopupTakeover.IO_TAKEOVER_CURVE;
        let l: number = Math.log(value);
        let price: number = Math.round(Math.exp(((k[0] * l + k[1]) * l + k[2]) * l + k[3]) / 250000) * 250000;
        return Math.min(Math.max(price, PopupTakeover.IO_TAKEOVER_MIN), PopupTakeover.IO_TAKEOVER_MAX);
    }
    private _resourceCost: SecNum;
    private _shinyCost: SecNum;
    private _costGap: int;
    private _cell: MapRoomCell;
    /** (QoL #330) the kit chooser under the popup, and what the kit sent with the takeover costs ([r1, r2, r3]; null: none). */
    private _ioKitStrip: Sprite;
    private _ioKitPaid: any[];

    /**
     * The takeover price of a yard, as this popup asks it: each of the four resources (`cost`), and whether it is
     * half price (next to the main yard) or doubled (the underworld). Inferno-only (QoL #66): also shown before
     * attacking (PopupInfoEnemy).
     */
    public static ioPriceOf(cell: MapRoomCell): any {
        let cellValue: number = Number(cell._value);
        let wm: boolean = cell._base == 1;
        let level: int = cell._level;
        let slope: number = Number(wm ? 562500 : 15820570.7);
        let intercept: number = Number(wm ? -14750000 : -227080916.9);
        let roundTo: int = 250000;
        let cost: number = !wm ? PopupTakeover.ioPlayerTakeoverPrice(cellValue) : Math.max(Math.round((level * slope + intercept) / roundTo) * roundTo, 1000000);
        let half: boolean = false;
        if (Math.abs(GLOBAL._mapHome.x - cell.X) == 1) {
            if (GLOBAL._mapHome.y + 1 - (GLOBAL._mapHome.x + 1) % 2 * 2 == cell.Y || GLOBAL._mapHome.y == cell.Y) {
                half = true;
            }
        } else if (GLOBAL._mapHome.x == cell.X) {
            if (GLOBAL._mapHome.y + 1 == cell.Y || GLOBAL._mapHome.y - 1 == cell.Y) {
                half = true;
            }
        }
        if (half) {
            cost *= 0.5;
        }
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_CONQUEST, "NORMAL")) {
            cost = POWERUPS.Apply(POWERUPS.ALLIANCE_CONQUEST, [cost]);
        }
        // Inferno-only: a takeover in the underworld costs twice as much (IoUnderworld)
        let under: boolean = GLOBAL.INFERNO_ONLY && IoUnderworld.isUnder(cell.X, cell.Y);
        if (under) {
            cost = cost * IoUnderworld.costMultiplier;
        }
        // (13 November: the Devil's Contract's Merchant's Due: a takeover with resources is a purchase too)
        if (GLOBAL.INFERNO_ONLY && IoDevil.costMul() != 1) {
            cost = Math.floor(cost * IoDevil.costMul());
        }
        return { "cost": cost, "half": half, "under": under };
    }

    /**
     * Inferno-only (26 October, the user's: "Make sure that every alliance power up ... actually works"): a takeover's
     * price in Shiny, a quarter off while the alliance's Conquest runs ("25% discount on Outpost takeovers": it was only
     * taken off the resources). The server takes the same (maproom/v2/takeoverCell).
     */
    public static ioShinyPrice(): int {
        let price: int = GLOBAL.ioPrice("takeover", 100) | 0;
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_CONQUEST, "NORMAL")) {
            price = Math.ceil(price * 0.75) | 0;
        }
        return price;
    }

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
        let price: any = PopupTakeover.ioPriceOf(this._cell);
        half = price.half;
        this._resourceCost.Set(price.cost);
        let ioUnder: boolean = price.under;
        this._shinyCost = new SecNum((GLOBAL.INFERNO_ONLY ? PopupTakeover.ioShinyPrice() : Math.ceil(Math.pow(Math.sqrt(this._resourceCost.Get() / 2), 0.75) * 4)) * (ioUnder ? IoUnderworld.costMultiplier : 1));
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
                why += " " + KEYS.Get("io_t3m_pa_depths_price", { "v1": IoUnderworld.NAME, "v2": IoUnderworld.costMultiplier });
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
        if (GLOBAL.INFERNO_ONLY) {
            this.ioAddStay();
            this.ioAddKit();
        }
    }

    /**
     * Inferno-only (QoL #331, 15 October): "Stay on the map": the yard taken over is not opened, the map stays (to take
     * over the next one). For the session. Ticked: the takeover keeps the map open (ioStayAfterTakeover).
     */
    public static ioStayOnMap: boolean = false;

    /** (QoL #331) The box under the popup, on a strip of paper (the popup's art has no room in it). */
    private ioAddStay(): void {
        let bounds: any = this.getBounds(this);
        let w: int = 300;
        let strip: Sprite = new Sprite();
        strip.name = "ioOp2StayStrip";
        IoMapUi.roundBox(strip.graphics, 0, 0, w, 26, IoMapUi.PAPER, 1, IoMapUi.EDGE, 6, 1.5);
        let box: MovieClip = IoMapUi.checkbox(KEYS.Get("io_op2_stay"), PopupTakeover.ioStayOnMap, (on: boolean): void => {
            PopupTakeover.ioStayOnMap = on;
        }, w - 16);
        box.name = "ioOp2StayOnMap";
        GLOBAL.ioFitText(as3.as(box.getChildAt(0), TextField), 8);
        box.x = 8;
        box.y = 3;
        strip.addChild(box);
        strip.x = Math.round(bounds.x + (bounds.width - w) * 0.5);
        strip.y = Math.round(bounds.y + bounds.height + 6);
        this.addChild(strip);
    }

    /**
     * Inferno-only (QoL #330, 15 October): "Then build: ◀ kit ▶" under "Stay on the map": a kit chosen here is built
     * by the takeover's own request (worldmapv2/takeovercell `kit`, `kitcost`: the server writes it as applykit does),
     * so the yard is loaded once, with the kit. Paid with resources (the kit window's price; one in the Depths has no
     * Flinger). "No kit" at first; the choice is kept for the session (ioKitChoice).
     */
    public static ioKitChoice: int = 0;

    /** The kits that can be chosen: 0 (none), the server's kits and the player's own saved ones. */
    private ioKitIds(): any[] {
        let ids: any[] = [0];
        let under: boolean = IoUnderworld.isUnder(this._cell.X, this._cell.Y);
        for (let id: int = 1; id < InfernoKits.PLAYER_FIRST + InfernoKits.PLAYER_SLOTS; id++) {
            if (popup_prefab.ioKitOf(id, under)) {
                ids.push(id);
            }
        }
        return ids;
    }

    /** The kit chosen: {id, buildings, costs} (costs as numbers, r1-r3), or null for none. */
    private ioChosenKit(): any {
        let id: int = PopupTakeover.ioKitChoice;
        if (!GLOBAL.INFERNO_ONLY || id <= 0) {
            return null;
        }
        let kit: any = popup_prefab.ioKitOf(id, IoUnderworld.isUnder(this._cell.X, this._cell.Y));
        if (!kit || !kit.buildings || !kit.costs) {
            return null;
        }
        let costs: any[] = as3.cast(kit.costs, Array);
        return { "id": id, "buildings": popup_prefab.ioFinished(kit.buildings), "costs": [Number(costs[0].Get()), Number(costs[1].Get()), Number(costs[2].Get())] };
    }

    private ioAddKit(): void {
        let stay: any = this.getChildByName("ioOp2StayStrip");
        let w: int = 300;
        let strip: Sprite = new Sprite();
        strip.name = "ioOp3TakeKitStrip";
        IoMapUi.roundBox(strip.graphics, 0, 0, w, 44, IoMapUi.PAPER, 1, IoMapUi.EDGE, 6, 1.5);
        let label: TextField = IoMapUi.label(KEYS.Get("io_op3_take_kit"), 10, IoMapUi.INK, true, 84);
        label.x = 8;
        label.y = 4;
        strip.addChild(label);
        let name: TextField = IoMapUi.label("", 11, IoMapUi.INK, true, 150, "center");
        name.name = "ioOp3TakeKitName";
        name.x = 116;
        name.y = 3;
        strip.addChild(name);
        let cost: TextField = IoMapUi.label("", 9, IoMapUi.MUTED, false, w - 16, "center");
        cost.name = "ioOp3TakeKitCost";
        cost.x = 8;
        cost.y = 24;
        strip.addChild(cost);
        let step: Function = (dir: int): void => {
            let ids: any[] = this.ioKitIds();
            let at: int = ids.indexOf(PopupTakeover.ioKitChoice) | 0;
            at = at < 0 ? 0 : ((at + dir + ids.length) % ids.length) | 0;
            PopupTakeover.ioKitChoice = ids[at] | 0;
            this.ioShowKit();
        };
        let prev: MovieClip = IoMapUi.button("◀", 22, 18, (e: MouseEvent): void => {
            step(-1);
        }, "grey", 9);
        prev.name = "ioOp3TakeKitPrev";
        prev.x = 92;
        prev.y = 3;
        strip.addChild(prev);
        let next: MovieClip = IoMapUi.button("▶", 22, 18, (e: MouseEvent): void => {
            step(1);
        }, "grey", 9);
        next.name = "ioOp3TakeKitNext";
        next.x = 268;
        next.y = 3;
        strip.addChild(next);
        strip.x = stay ? stay.x : 0;
        strip.y = stay ? stay.y + stay.height + 4 : 0;
        this.addChild(strip);
        this._ioKitStrip = strip;
        this.ioShowKit();
        // (the player's own kits come from the server; the server's kits are known at once)
        InfernoKits.load((): void => {
            if (this._ioKitStrip && this.parent) {
                this.ioShowKit();
            }
        });
    }

    /** The kit chosen, its name and price in the strip (a kit no longer there: none). */
    private ioShowKit(): void {
        let strip: Sprite = this._ioKitStrip;
        if (!strip) {
            return;
        }
        let ids: any[] = this.ioKitIds();
        if (ids.indexOf(PopupTakeover.ioKitChoice) < 0) {
            PopupTakeover.ioKitChoice = 0;
        }
        // (no kit to choose: the strip isn't shown)
        strip.visible = ids.length > 1;
        let name: TextField = as3.as(strip.getChildByName("ioOp3TakeKitName"), TextField);
        let cost: TextField = as3.as(strip.getChildByName("ioOp3TakeKitCost"), TextField);
        let kit: any = this.ioChosenKit();
        name.text = kit ? InfernoKits.kitName(kit.id) : KEYS.Get("io_op3_take_kit_none");
        GLOBAL.ioFitText(name, 8);
        if (!kit) {
            cost.textColor = IoMapUi.MUTED;
            cost.text = KEYS.Get("io_op3_take_kit_none_hint");
            return;
        }
        let parts: any[] = [];
        let enough: boolean = true;
        for (let r: int = 0; r < 3; r++) {
            parts.push(IoOutpostsPopup.short(Number(kit.costs[r])) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[r])).toLowerCase());
            if (!GLOBAL.ioFreeBuild() && Number(GLOBAL._resources["r" + (r + 1)].Get()) < Number(kit.costs[r])) {
                enough = false;
            }
        }
        cost.textColor = (enough ? IoMapUi.INK : 0xB71C1C) >>> 0;
        cost.text = KEYS.Get("io_op3_take_kit_cost", { "v1": parts.join(" · ") });
    }

    /**
     * (QoL #331) After a takeover with "Stay on the map" ticked: the map stays open. What the game would learn from
     * opening the outpost is put right here: the price taken off what is shown (the server took it; nothing is sent
     * again), the outpost added to the lists and the storage, its cell asked for again, and a save asked for, whose
     * answer brings the resources and Shiny as the server has them.
     */
    private ioStayAfterTakeover(useShiny: boolean): void {
        let cell: MapRoomCell = this._cell;
        let cost: number = Number(this._resourceCost.Get());
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.ioFreeBuild()) {
            if (useShiny) {
                let shiny: number = Number(this._shinyCost.Get());
                if (GLOBAL._credits) {
                    GLOBAL._credits.Add(-shiny);
                }
                if (BASE._credits) {
                    BASE._credits.Add(-shiny);
                    BASE._hpCredits = BASE._credits.Get() | 0;
                }
            } else {
                for (let r: int = 1; r <= 4; r++) {
                    if (GLOBAL._resources && GLOBAL._resources["r" + r]) {
                        GLOBAL._resources["r" + r].Add(-cost);
                        GLOBAL._hpResources["r" + r] = GLOBAL._resources["r" + r].Get();
                    }
                    if (BASE._resources && BASE._resources["r" + r]) {
                        BASE._resources["r" + r].Add(-cost);
                        BASE._hpResources["r" + r] = BASE._resources["r" + r].Get();
                    }
                }
            }
            // (QoL #330: and the kit built with it, which the server took too)
            for (let k: int = 0; this._ioKitPaid && k < 3; k++) {
                let paid: number = Number(this._ioKitPaid[k]) || 0;
                if (GLOBAL._resources && GLOBAL._resources["r" + (k + 1)]) {
                    GLOBAL._resources["r" + (k + 1)].Add(-paid);
                    GLOBAL._hpResources["r" + (k + 1)] = GLOBAL._resources["r" + (k + 1)].Get();
                }
                if (BASE._resources && BASE._resources["r" + (k + 1)]) {
                    BASE._resources["r" + (k + 1)].Add(-paid);
                    BASE._hpResources["r" + (k + 1)] = BASE._resources["r" + (k + 1)].Get();
                }
            }
        }
        if (GLOBAL._mapOutpostIDs && GLOBAL._mapOutpostIDs.length == GLOBAL._mapOutpost.length - 1) {
            GLOBAL._mapOutpostIDs.push(cell._baseID);
        }
        IoOutpostsPopup.ioForget();
        if (IoUnderworld.isUnder(cell.X, cell.Y)) {
            IoUnderworld.requestReach(true);
        }
        BASE.Save();
        if (MapRoom._open && MapRoom._mc) {
            // (the enemy yard's popup this was opened from is about a yard that is now yours)
            MapRoom._mc.ioHideInfoEnemyIfOpen();
            MapRoom._mc.ioRefreshResources();
            MapRoom._mc.ioMarkSpot(cell.X, cell.Y);
        }
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
            PopupTakeover._ioSending = false;
            PLEASEWAIT.Hide();
            // (QoL #330: the kit sent with it was built (the server says how many buildings), or none was)
            if (serverData.error == 0 && GLOBAL.INFERNO_ONLY) {
                if ((serverData.kit | 0) > 0) {
                    ACHIEVEMENTS.Check("starterkit", 1);
                } else {
                    this._ioKitPaid = null;
                }
            }
            if (serverData.error == 0 && GLOBAL.INFERNO_ONLY && PopupTakeover.ioStayOnMap && MapRoom._open) {
                // (QoL #331: Stay on the map: the outpost is added, the map stays open)
                MapRoom.ioRefreshCell(this._cell.X, this._cell.Y);
                GLOBAL._mapOutpost.push(new Point(this._cell.X, this._cell.Y));
                GLOBAL._resources.r1max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r2max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r3max += GLOBAL._outpostCapacity.Get();
                GLOBAL._resources.r4max += GLOBAL._outpostCapacity.Get();
                this.ioStayAfterTakeover(useShiny);
                LOGGER.Stat([37, this._cell._base == 1 ? 1 : 2]);
            } else if (serverData.error == 0) {
                BASE._takeoverFirstOpen = this._cell._base == 1 ? 1 : 2;
                BASE._takeoverPreviousOwnersName = TRIBES.DisplayName(this._cell._name);
                // (Inferno-only: a tribe's Inferno name)
                MapRoom.ioRefreshCell(this._cell.X, this._cell.Y);
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
                // (Inferno-only, 16 October, bug report #96: a takeover refused (not destroyed enough yet, already
                // yours): the map's cell read again, so what it shows is the server's)
                if (GLOBAL.INFERNO_ONLY && serverData.errorDetails && serverData.errorDetails.data && serverData.errorDetails.data.refresh && MapRoom._open) {
                    MapRoom.ioRefreshCell(this._cell.X, this._cell.Y);
                }
            }
            this.Hide();
        };
        takeoverError = (param1: IOErrorEvent): void => {
            PopupTakeover._ioSending = false;
            PLEASEWAIT.Hide();
            this.Hide();
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #448: no "Error #2032: Stream Error. URL: ..."; the answer may have been lost after the
                // server took the yard over, so the cell is asked for again to show what really happened)
                GLOBAL.Message(KEYS.Get("io_takeover_noanswer"));
                MapRoom.ioRefreshCell(this._cell.X, this._cell.Y);
                return;
            }
            GLOBAL.Message(KEYS.Get("err_takeoverproblem") + param1.text);
        };
        if (useShiny) {
            if (GLOBAL._credits.Get() < this._shinyCost.Get()) {
                POPUPS.DisplayGetShiny();
                return;
            }
            if (!GLOBAL.ioConfirmShiny(this._shinyCost.Get() | 0, KEYS.Get("io_t3m_pa_shiny_takeover"), (): void => {
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
        // (QoL #330: the kit chosen, built by the same request: enough resources for it too (with the takeover's when
        // that is paid with resources)
        this._ioKitPaid = null;
        let ioKit: any = this.ioChosenKit();
        if (ioKit) {
            let ioShort: any[] = [];
            for (let k: int = 0; k < 3; k++) {
                let need: number = Number(ioKit.costs[k]) + (useShiny ? 0 : Number(this._resourceCost.Get()));
                let have: number = Number(GLOBAL._resources["r" + (k + 1)].Get());
                if (!GLOBAL.ioFreeBuild() && have < need) {
                    ioShort.push([need - have, KEYS.Get(as3.str(GLOBAL._resourceNames[k]))]);
                }
            }
            if (ioShort.length > 0) {
                GLOBAL.Message(KEYS.Get("io_op3_take_kit_short", { "v1": GLOBAL.Array2String(ioShort), "v2": IoMapUi.escape(InfernoKits.kitName(ioKit.id)) }));
                return;
            }
            // (admin test mode and the Designer take nothing: BASE.Charge)
            this._ioKitPaid = GLOBAL.ioFreeBuild() ? [0, 0, 0] : ioKit.costs.slice();
            takeoverVars.push(["kit", JSON.stringify(ioKit.buildings)]);
            takeoverVars.push(["kitcost", JSON.stringify({ "r1": this._ioKitPaid[0], "r2": this._ioKitPaid[1], "r3": this._ioKitPaid[2] })]);
        }
        mapIndex = 1;
        r1 = this._resourceCost.Get() | 0;
        r2 = this._resourceCost.Get() | 0;
        r3 = this._resourceCost.Get() | 0;
        r4 = this._resourceCost.Get() | 0;
        // Inferno-only (14 October, QoL #424): one takeover at a time: a second click while the first is on its
        // way paid the price again.
        if (PopupTakeover._ioSending) {
            return;
        }
        PopupTakeover._ioSending = true;
        PLEASEWAIT.Show(KEYS.Get("plsw_taking"));
        new URLLoaderApi().load(GLOBAL._mapURL + "takeovercell", takeoverVars, takeoverSuccessful, takeoverError);
    }

    /** Inferno-only (QoL #424): a takeover request is on its way. */
    public static _ioSending: boolean = false;

    private Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }
}
