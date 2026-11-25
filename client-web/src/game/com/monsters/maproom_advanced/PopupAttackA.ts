import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, Loader, MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { URLRequest } from "flash/net";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ATTACK, AllyInfo, BASE, CATAPULTITEM, CREATURELOCKER, CasinoUI, CellData, ChampionBase, EnumYardType, GLOBAL, ImageCache, IoUnderworld, IoWin, KEYS, LOGGER, MapRoomCell, MapRoomManager, PLEASEWAIT, POPUPS, URLLoaderApi, POWERUPS, PopupAttackA_CLIP, PopupInfoMonster, ResourceBombs, ScrollSet, SecNum, SiegeWeapon, SiegeWeapons, TRIBES, bubblepopup3, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupAttackA extends PopupAttackA_CLIP {
    static {
        as3.fields(this, { _cell: null, _mcResources: null, _attackResources: null, _monstersInRange: false, _cellsInRange: null, _enabled: false, _profilePic: null, _profileBmp: null, _protectedInRange: false, _scroller: null, _ioWaitFrom: 0, _ioYardsBtn: null, _ioYardsWin: null });
    }

    private _cell: MapRoomCell;
    private _mcResources: MovieClip;
    private _attackResources: any;
    private _monstersInRange: boolean;
    private _cellsInRange: Vector<CellData>;
    private _enabled: boolean;
    private _profilePic: Loader;
    private _profileBmp: Bitmap;
    private _protectedInRange: boolean;
    private _scroller: ScrollSet;
    /** Inferno-only: when this attack's popup opened (yards off the screen are waited for from then). */
    private _ioWaitFrom: int;

    public $ctor(): void {
        this._attackResources = {};
        this._cellsInRange = new Vector<CellData>(0, true, CellData);
        super.$ctor();
        this.mMonsters.mask = this.mMonstersMask;
        this._scroller = new ScrollSet();
        this._scroller.isHiddenWhileUnnecessary = true;
        this._scroller.AutoHideEnabled = false;
        this._scroller.width = this.scroll.width;
        this._scroller.x = this.scroll.x;
        this._scroller.y = this.scroll.y;
        this.addChild(this._scroller);
        this._scroller.Init(this.mMonsters, this.mMonstersMask, 0, this.scroll.y, this.scroll.height);
        this.bAttack.SetupKey("map_attack_btn");
        this.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
        this.bAttack.enabled = false;
        this.bAttack.buttonMode = true;
        this.bCancel.SetupKey("btn_cancel");
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this.bCancel.buttonMode = true;
        this.tCatapult.htmlText = "<b>" + KEYS.Get("newmap_catapultrange") + "</b>";
        this.tMonsters.htmlText = "<b>" + KEYS.Get("newmap_monstersrange") + "</b>";
    }

    public Hide(param1: MouseEvent = null): void {
        let profilePics: int = this.mcProfilePic.mcBG.numChildren | 0;
        while (profilePics--) {
            this.mcProfilePic.mcBG.removeChildAt(profilePics);
        }
        // (Inferno-only, QoL #71: the Yards panel goes with it)
        if (this._ioYardsWin) {
            this._ioYardsWin.close();
            this._ioYardsWin = null;
        }
        MapRoom._mc.HideAttack();
    }

    public Setup(param1: MapRoomCell): void {
        this._cell = param1;
        if (this._cell._base == 3) {
            this.tAttackText.htmlText = "<b>" + KEYS.Get("newmap_att1", { "v1": this._cell._name }) + "</b>";
        } else if (this._cell._base == 2) {
            this.tAttackText.htmlText = "<b>" + KEYS.Get("newmap_att2", { "v1": this._cell._name }) + "</b>";
        } else if (this._cell._base == 1) {
            this.tAttackText.htmlText = "<b>" + KEYS.Get("newmap_att3", { "v1": TRIBES.DisplayName(this._cell._name) }) + "</b>";
        } else {
            LOGGER.Log("err", "Cell at (" + this._cell.X + "," + this._cell.Y + ") has invalid base type " + this._cell._base + " when being attacked");
            this.tAttackText.htmlText = "<b>" + KEYS.Get("io_t3m_pa_attack") + "</b>";
        }
        this._enabled = false;
        this._ioWaitFrom = getTimer();
        this.bAttack.Enabled = false;
        // (Inferno-only, QoL #71: counted afresh for this target)
        if (this._ioYardsBtn) {
            this._ioYardsBtn.visible = false;
        }
        this.ProfilePic();
        if (this._cell._alliance) {
            this.AlliancePic(as3.str(AllyInfo._picURLs.sizeM), as3.cast(this.mcAlliancePic.mcImage, MovieClip), as3.cast(this.mcAlliancePic.mcBG, MovieClip), true);
        } else {
            this.mcAlliancePic.visible = false;
        }
        this.Update();
    }

    public Cleanup(): void {
        this.bAttack.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this._cellsInRange = new Vector<CellData>(0, true, CellData);
    }

    private Attack(param1: MouseEvent): void {
        let baseType: int = 0;
        if (!this._enabled) {
            return;
        }
        MapRoom._mc.HideAttack();
        if ((GLOBAL.ioTestMode() || !this._cell._protected && !(this._cell._truce && this._cell._truce > GLOBAL.Timestamp())) && this._monstersInRange) {
            if (this._protectedInRange) {
                // (Inferno-only, QoL #70: and which yards they are)
                let ask: string = KEYS.Get("newmap_attack");
                if (GLOBAL.INFERNO_ONLY && this._ioProtNames && this._ioProtNames.length > 0) {
                    ask = KEYS.Get("io_attack_prot_ask", { "v1": this._ioProtNames.join(", ") });
                }
                GLOBAL.Message(ask, KEYS.Get("confirm_btn"), as3.bind(this, this.DoAttack));
                return;
            }
            // (Inferno-only, QoL #69: a player's yard or outpost is asked about first, so a refusal is said here on
            // the map; it used to load home and say so there, where a wild raid could start straight away)
            if (GLOBAL.INFERNO_ONLY && !GLOBAL.ioTestMode() && this._cell._base != 1 && !this._ioAsked) {
                this.ioAskFirst();
                return;
            }
            this._ioAsked = false;
            GLOBAL._attackerMapResources = this._attackResources;
            // (Inferno-only, QoL #71: the yards left at home aren't in range for the attack: BASE's save takes no
            // monsters from them and leaves their protection alone)
            GLOBAL._attackerCellsInRange = GLOBAL.INFERNO_ONLY ? this.ioSendingCells() : this._cellsInRange;
            if (this._ioYardsWin) {
                this._ioYardsWin.close();
            }
            MapRoomManager.instance.Hide();
            MapRoom.ClearCells();
            GLOBAL._currentCell = this._cell;
            if (this._cell._base == 1) {
                BASE.LoadBase(null, 0, this._cell._baseID, "wmattack", false, EnumYardType.MAIN_YARD);
            } else {
                baseType = this._cell._base == 3 ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
                BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.ATTACK, false, baseType);
            }
        } else if (this._cell._protected) {
            if (!MapRoom._open) {
                POPUPS.Next();
            }
            GLOBAL.Message(this._cell.ioProtectedText());
        } else if (Boolean(this._cell._truce) && this._cell._truce > GLOBAL.Timestamp()) {
            if (!MapRoom._open) {
                POPUPS.Next();
            }
            GLOBAL.Message(KEYS.Get("newmap_truce"));
        } else if (!MapRoom._flingerInRange) {
            if (!MapRoom._open) {
                POPUPS.Next();
            }
            GLOBAL.Message(KEYS.Get("newmap_range"));
        } else {
            if (!MapRoom._open) {
                POPUPS.Next();
            }
            GLOBAL.Message(KEYS.Get("newmap_nomonsters"));
        }
    }

    public DoAttack(): void {
        this._protectedInRange = false;
        this.Attack(null);
    }

    /** (Inferno-only, QoL #70) your protected yards whose monsters are in range: "Main yard (12, 40)" */
    private _ioProtNames: string[];

    /** (Inferno-only, QoL #69) the server said the yard can be attacked: the next Attack goes */
    private _ioAsked: boolean;

    /**
     * Inferno-only (QoL #69): worldmapv2/canattack (the checks the attack's load makes: protection, under attack,
     * online). Yes: the attack goes as before. No: why, on the map. No answer: the attack goes, and the load decides.
     */
    private ioAskFirst(): void {
        let cell: MapRoomCell = this._cell;
        PLEASEWAIT.Show(KEYS.Get("io_attack_checking"));
        new URLLoaderApi().load(GLOBAL._mapURL + "canattack", [["baseid", String(cell._baseID)]], (r: any): void => {
            PLEASEWAIT.Hide();
            if (r && r.error == 0 && (r.ok | 0) == 0) {
                if (r.refused == "online") {
                    cell._online = 1;
                }
                let why: string = r.refused == "protected" || r.refused == "underattack" || r.refused == "online" ? KEYS.Get("io_attack_ref_" + r.refused) : String(r.message || "");
                GLOBAL.Message(KEYS.Get("io_attack_refused", { "v1": TRIBES.DisplayName(cell._name), "v2": why }));
                return;
            }
            this.ioGo();
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            this.ioGo();
        });
    }

    private ioGo(): void {
        this._ioAsked = true;
        this._enabled = true;
        this.Attack(null);
    }

    public Update(): boolean {
        let powerUpBonus: number = 0;
        let cellData: CellData = null;
        let mapRoomCell: MapRoomCell = null;
        let twigBombLevel: int = 0;
        let pebbleBombLevel: int = 0;
        let puttyBombLevel: int = 0;
        let maxBombLevel: int = 0;
        let catapultItem: CATAPULTITEM = null;
        let siegeWeapon: SiegeWeapon = null;
        let cellRange: int = 0;
        let monsterType: string = null;
        let monsterQuantity: int = 0;
        let guardianIndex: int = 0;
        let xPos: int = 0;
        let yPos: int = 0;
        let guardianData: any = null;
        let isNormalChampion: boolean = false;
        let guardianDataIndex: int = 0;
        let popupInfoMonster: PopupInfoMonster = null;
        let attackingMonsterInfo: PopupInfoMonster = null;
        let creepType: string = null;
        let attackingPlayerMonsterCount: int = 0;
        let attackingPlayerMonsterIndex: int = 0;
        let attackingPlayerHealthyCreepCount: int = 0;

        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL")) {
            powerUpBonus = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0]);
        }
        if (MapRoom._open) {
            MapRoom._mc.ioOffscreenPending = false;
            this._cellsInRange = MapRoom._mc.GetCellsInRange(this._cell.X, this._cell.Y, (10 + powerUpBonus) | 0);
            if (GLOBAL.INFERNO_ONLY) {
                // the yards that reach it through the underworld's portals (IoUnderworld): waited for like those off screen
                this._cellsInRange = IoUnderworld.withReach(this._cellsInRange, this._cell.X, this._cell.Y);
                if (IoUnderworld.reachPending(this._cell.X, this._cell.Y)) {
                    MapRoom._mc.ioOffscreenPending = true;
                }
            }
            // Inferno-only: yards in range off the screen come from their zone's data: waited for (a few
            // seconds at most) before the monsters are counted
            if (GLOBAL.INFERNO_ONLY && !this._enabled && MapRoom._mc.ioOffscreenPending && getTimer() - this._ioWaitFrom < 5000) {
                return false;
            }
            for (cellData of (this._cellsInRange ?? [])) {
                mapRoomCell = as3.as(cellData.cell, MapRoomCell);
                if (Boolean(mapRoomCell) && !mapRoomCell._processed) {
                    return false;
                }
                // One of your yards known only from the world snapshot: its monsters come with getarea.
                if (Boolean(mapRoomCell) && mapRoomCell._mine && mapRoomCell._ioSnap) {
                    MapRoom.GetZoneCell(mapRoomCell.X, mapRoomCell.Y);
                    return false;
                }
            }
        } else {
            this._cellsInRange = GLOBAL._attackerCellsInRange;
        }
        if (!this._enabled) {
            this._monstersInRange = false;
            this._protectedInRange = false;
            this._ioProtNames = [];
            MapRoom._flingerInRange = false;
            this._attackResources = { "r1": GLOBAL._resources.r1.Get(), "r2": GLOBAL._resources.r2.Get(), "r3": GLOBAL._resources.r3.Get(), "catapult": new SecNum(0), "flinger": new SecNum(0) };
            if (!MapRoomManager.instance.isInMapRoom3) {
                ATTACK._curCreaturesAvailable = new Array();
                for (cellData of (this._cellsInRange ?? [])) {
                    mapRoomCell = as3.cast(cellData["cell"], MapRoomCell);
                    cellRange = cellData["range"] | 0;
                    // (Inferno-only, QoL #71: a yard the player keeps at home sends nothing)
                    if (Boolean(mapRoomCell) && Boolean(mapRoomCell._mine) && !ATTACK.ioIsExcluded(mapRoomCell)) {
                        if (mapRoomCell._flingerRange.Get() + powerUpBonus >= cellRange) {
                            for (monsterType in mapRoomCell._monsters) {
                                monsterQuantity = mapRoomCell._monsters[monsterType].Get() | 0;
                                this._monstersInRange = true;
                                if (monsterQuantity > 0 && Boolean(mapRoomCell._protected)) {
                                    this._protectedInRange = true;
                                    // (QoL #70: which of your yards)
                                    let where: string = (mapRoomCell._base == 2 ? KEYS.Get("io_attack_prot_main") : KEYS.Get("io_attack_prot_outpost")) + " (" + mapRoomCell.X + ", " + mapRoomCell.Y + ")";
                                    if (this._ioProtNames.indexOf(where) < 0) {
                                        this._ioProtNames.push(where);
                                    }
                                }
                                if (ATTACK._curCreaturesAvailable[monsterType]) {
                                    ATTACK._curCreaturesAvailable[monsterType] += monsterQuantity;
                                } else {
                                    ATTACK._curCreaturesAvailable[monsterType] = monsterQuantity;
                                }
                            }
                            MapRoom._flingerInRange = true;
                        }
                        if (mapRoomCell._flingerRange.Get() >= this._attackResources.flinger.Get()) {
                            this._attackResources.flinger.Set(mapRoomCell._flingerLevel.Get());
                        }
                    }
                }
            } else {
                this._monstersInRange = true;
                if (mapRoomCell._flingerRange.Get() >= this._attackResources.flinger.Get()) {
                    this._attackResources.flinger.Set(mapRoomCell._flingerLevel.Get());
                }
            }
            // Admin test mode: any monster, as many as you like, from anywhere (a practice attack).
            if (GLOBAL.ioTestMode() && !MapRoomManager.instance.isInMapRoom3) {
                ATTACK._curCreaturesAvailable = new Array();
                for (const $value of as3.values(CREATURELOCKER.ioTestMonsterIds())) {
                    monsterType = as3.str($value);
                    ATTACK._curCreaturesAvailable[monsterType] = 999;
                }
                this._monstersInRange = true;
                this._protectedInRange = false;
                MapRoom._flingerInRange = true;
                this._attackResources.flinger.Set(4);
            }
            if (MapRoom._flingerInRange) {
                if (GLOBAL._playerCatapultLevel) {
                    this._attackResources.catapult.Set(GLOBAL._playerCatapultLevel.Get());
                }
                guardianIndex = 0;
                while (guardianIndex < GLOBAL._playerGuardianData.length) {
                    if (as3.vget(GLOBAL._playerGuardianData, guardianIndex) && as3.vget(GLOBAL._playerGuardianData, guardianIndex).hp.Get() > 0 && as3.vget(GLOBAL._playerGuardianData, guardianIndex).status == ChampionBase.k_CHAMPION_STATUS_NORMAL) {
                        this._monstersInRange = true;
                    }
                    guardianIndex++;
                }
            }
            while (this.mMonsters.numChildren) {
                this.mMonsters.removeChildAt(0);
            }
            if (this._monstersInRange) {
                xPos = 0;
                yPos = 0;
                isNormalChampion = false;
                guardianDataIndex = 0;
                while (guardianDataIndex < GLOBAL._playerGuardianData.length) {
                    guardianData = as3.vget(GLOBAL._playerGuardianData, guardianDataIndex);
                    if (guardianData && guardianData.hp.Get() > 0 && guardianData.status == ChampionBase.k_CHAMPION_STATUS_NORMAL && (!isNormalChampion || guardianData.t == 5)) {
                        if (guardianData.t != 5) {
                            isNormalChampion = true;
                        }
                        attackingMonsterInfo = new PopupInfoMonster();
                        attackingMonsterInfo.Setup((xPos * 125) | 0, (yPos * 30) | 0, "G" + as3.vget(GLOBAL._playerGuardianData, guardianDataIndex).t + "_L" + as3.vget(GLOBAL._playerGuardianData, guardianDataIndex).l.Get(), 1);
                        this.mMonsters.addChild(attackingMonsterInfo);
                        xPos += 1;
                        if (xPos == 3) {
                            xPos = 0;
                            yPos += 1;
                        }
                    } else if (guardianData && guardianData.hp.Get() > 0 && guardianData.status == ChampionBase.k_CHAMPION_STATUS_NORMAL && isNormalChampion && guardianData.t != 5) {
                        LOGGER.Log("log", "User has capacity to initialize combat with more than one normal champ.");
                    }
                    guardianDataIndex++;
                }
                if (!MapRoomManager.instance.isInMapRoom3) {
                    for (creepType in ATTACK._curCreaturesAvailable) {
                        popupInfoMonster = new PopupInfoMonster();
                        popupInfoMonster.Setup((xPos * 125) | 0, (yPos * 30) | 0, creepType, ATTACK._curCreaturesAvailable[creepType] | 0);
                        xPos += 1;
                        this.mMonsters.addChild(popupInfoMonster);
                        if (xPos == 3) {
                            xPos = 0;
                            yPos += 1;
                        }
                    }
                } else {
                    attackingPlayerMonsterCount = GLOBAL.attackingPlayer.monsterList.length | 0;
                    attackingPlayerMonsterIndex = 0;
                    attackingPlayerHealthyCreepCount = 0;
                    while (attackingPlayerHealthyCreepCount < attackingPlayerMonsterCount) {
                        attackingPlayerMonsterIndex = as3.vget(GLOBAL.attackingPlayer.monsterList, attackingPlayerHealthyCreepCount).numHealthyHousedCreeps;
                        if (attackingPlayerMonsterIndex) {
                            popupInfoMonster = new PopupInfoMonster();
                            popupInfoMonster.Setup((xPos * 125) | 0, (yPos * 30) | 0, as3.vget(GLOBAL.attackingPlayer.monsterList, attackingPlayerHealthyCreepCount).m_creatureID, attackingPlayerMonsterIndex);
                            xPos += 1;
                            this.mMonsters.addChild(popupInfoMonster);
                            if (xPos == 3) {
                                xPos = 0;
                                yPos += 1;
                            }
                        }
                        attackingPlayerHealthyCreepCount++;
                    }
                }
                this.addChild(this.mMonsters);
            }
            pebbleBombLevel = -1;
            puttyBombLevel = -1;
            maxBombLevel = -1;
            if (Boolean(this._mcResources) && Boolean(this._mcResources.parent)) {
                this._mcResources.parent.removeChild(this._mcResources);
                this._mcResources = null;
            }
            this._mcResources = new MovieClip();
            this._mcResources.x = -175;
            this._mcResources.y = -75;
            if (this._attackResources.catapult.Get() >= 1) {
                twigBombLevel = 0;
                while (twigBombLevel < 3) {
                    if (this._attackResources.r1 < ResourceBombs._bombs["tw" + twigBombLevel].cost) {
                        break;
                    }
                    pebbleBombLevel = twigBombLevel;
                    twigBombLevel++;
                }
            }
            if (this._attackResources.catapult.Get() >= 2) {
                twigBombLevel = 0;
                while (twigBombLevel < 4) {
                    if (this._attackResources.r2 < ResourceBombs._bombs["pb" + twigBombLevel].cost) {
                        break;
                    }
                    puttyBombLevel = twigBombLevel;
                    twigBombLevel++;
                }
            }
            if (this._attackResources.catapult.Get() >= 3) {
                twigBombLevel = 0;
                while (twigBombLevel < 4) {
                    if (this._attackResources.r3 < ResourceBombs._bombs["pu" + twigBombLevel].cost) {
                        break;
                    }
                    maxBombLevel = twigBombLevel;
                    twigBombLevel++;
                }
            }
            catapultItem = new CATAPULTITEM();
            if (pebbleBombLevel >= 0) {
                catapultItem.Setup("tw" + pebbleBombLevel, true, true);
            } else {
                catapultItem.Setup("tw0", true, false);
            }
            catapultItem.x = 0;
            catapultItem.y = 0;
            this._mcResources.addChild(catapultItem);
            catapultItem = new CATAPULTITEM();
            if (puttyBombLevel >= 0) {
                catapultItem.Setup("pb" + puttyBombLevel, true, true);
            } else {
                catapultItem.Setup("pb0", true, false);
            }
            catapultItem.x = 65;
            catapultItem.y = 0;
            this._mcResources.addChild(catapultItem);
            catapultItem = new CATAPULTITEM();
            if (maxBombLevel >= 0) {
                catapultItem.Setup("pu" + maxBombLevel, true, true);
            } else {
                catapultItem.Setup("pu0", true, false);
            }
            catapultItem.x = 130;
            catapultItem.y = 0;
            this._mcResources.addChild(catapultItem);
            if (Boolean(siegeWeapon = SiegeWeapons.availableWeapon) && MapRoom._flingerInRange) {
                catapultItem = new CATAPULTITEM();
                catapultItem._props = siegeWeapon;
                catapultItem._bombid = siegeWeapon.weaponID;
                catapultItem._txtMC._tA.htmlText = "<b>" + siegeWeapon.name + "</b>";
                catapultItem._image = new MovieClip();
                catapultItem.addChild(catapultItem._image);
                catapultItem._popup = new bubblepopup3();
                catapultItem._popup.x = 44;
                catapultItem._popup.y = 29;
                catapultItem.addChild(catapultItem._popup);
                catapultItem._popX = catapultItem._popup.x | 0;
                catapultItem._popY = catapultItem._popup.y | 0;
                catapultItem.Enabled = true;
                catapultItem.Hide();
                catapultItem.setChildIndex(catapultItem._image, 1);
                catapultItem.setChildIndex(catapultItem._txtMC, 2);
                catapultItem.setChildIndex(catapultItem._popup, 3);
                ImageCache.GetImageWithCallBack(siegeWeapon.image, as3.bind(this, this.onSiegeIconComplete), true, 1, "", [catapultItem._image]);
                catapultItem.mouseEnabled = false;
                catapultItem.x = 195;
                catapultItem.y = 0;
                this._mcResources.addChild(catapultItem);
            }
            this.addChild(this._mcResources);
            this.bAttack.Enabled = true;
            this._enabled = true;
            if (GLOBAL.INFERNO_ONLY) {
                this.ioYardsButton();
            }
        }
        let cellInfo: string = "";
        cellInfo = "X:" + this._cell.X + " Y:" + this._cell.Y + "<br>_base:" + this._cell._base + "<br>_height:" + this._cell._height + "<br>_water:" + this._cell._water + "<br>_mine:" + this._cell._mine + "<br>_flinger:" + this._cell._flingerRange + "<br>_catapult:" + this._cell._catapult + "<br>_userID:" + this._cell._userID + "<br>_truce:" + this._cell._truce + "<br>_name:" + this._cell._name + "<br>_protected:" + this._cell._protected + "<br>_resources:" + JSON.stringify(this._cell._resources) + "<br>_ticks:" + JSON.stringify(this._cell._ticks) + "<br>_monsters:" + JSON.stringify(this._cell._monsters);
        if (this._cell._monsterData) {
            cellInfo += "<br>_monsterData:" + JSON.stringify(this._cell._monsterData);
            cellInfo = cellInfo + ("<br>_monsterData.saved:" + JSON.stringify(this._cell._monsterData.saved));
            cellInfo = cellInfo + ("<br>_monsterData.h:" + JSON.stringify(this._cell._monsterData.h));
            cellInfo = cellInfo + ("<br>_monsterData.hcount:" + this._cell._monsterData.hcount);
        }
        if (this._scroller) {
            this._scroller.Update();
        }
        return this._enabled;
    }

    // ---- Inferno-only (QoL #71): which of the player's yards send their monsters
    /** The Yards button, left of Cancel and Attack ("Yards: 2 of 3"). */
    private _ioYardsBtn: Sprite;

    /** The Yards panel while it is open (IoWin.openPanel). */
    private _ioYardsWin: any;

    /** The player's yards whose flinger reaches the target and that have monsters: [CellData, monsters] each. */
    private ioMyYards(): any[] {
        let bonus: number = POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL") ? POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0]) : 0;
        let out: any[] = [];
        for (let cd of (this._cellsInRange ?? [])) {
            let c: MapRoomCell = cd ? as3.as(cd.cell, MapRoomCell) : null;
            if (!c || !c._mine || !c._flingerRange || c._flingerRange.Get() + bonus < (cd.range | 0)) {
                continue;
            }
            let n: int = 0;
            for (let k in c._monsters) {
                n += c._monsters[k] ? c._monsters[k].Get() | 0 : 0;
            }
            if (n > 0) {
                out.push([cd, n]);
            }
        }
        return out;
    }

    /** The cells in range less the player's yards kept at home (GLOBAL._attackerCellsInRange for the attack). */
    private ioSendingCells(): Vector<CellData> {
        let keep: any[] = [];
        for (let cd of (this._cellsInRange ?? [])) {
            let c: MapRoomCell = cd ? as3.as(cd.cell, MapRoomCell) : null;
            if (c && c._mine && ATTACK.ioIsExcluded(c)) {
                continue;
            }
            keep.push(cd);
        }
        return Vector.from(keep, CellData);
    }

    /** The Yards button: shown with two of the player's yards in range or more (or one kept at home), its count. */
    private ioYardsButton(): void {
        let yards: any[] = MapRoomManager.instance.isInMapRoom3 || GLOBAL.ioTestMode() ? [] : this.ioMyYards();
        let home: int = 0;
        for (let y of as3.values(yards)) {
            if (ATTACK.ioIsExcluded(as3.as(y[0], CellData).cell)) {
                home++;
            }
        }
        let show: boolean = yards.length >= 2 || home > 0;
        if (!show) {
            if (this._ioYardsBtn) {
                this._ioYardsBtn.visible = false;
            }
            return;
        }
        let label: string = KEYS.Get("io_away_atk_yards", { "v1": yards.length - home, "v2": yards.length });
        if (!this._ioYardsBtn) {
            this._ioYardsBtn = as3.as(this.addChild(CasinoUI.button(label, 118, 26, (e: MouseEvent): void => {
                this.ioYardsPanel();
            }, true, 12)), Sprite);
            this._ioYardsBtn.name = "ioAtkYards";
            // left of Cancel and Attack, on their line; above them when the frame has no room there
            let a: Rectangle = this.bAttack.getBounds(this);
            let c: Rectangle = this.bCancel.getBounds(this);
            let f: Rectangle = this.mcFrame ? this.mcFrame.getBounds(this) : new Rectangle(-200, -170, 400, 340);
            let left: number = Math.min(a.x, c.x);
            let top: number = Math.min(a.y, c.y);
            let mid: number = top + Math.max(a.height, c.height) / 2;
            if (left - 126 >= f.x + 14) {
                this._ioYardsBtn.x = Math.round(left - 126);
                this._ioYardsBtn.y = Math.round(mid - 13);
            } else {
                this._ioYardsBtn.x = Math.round(Math.max(f.x + 14, left));
                this._ioYardsBtn.y = Math.round(top - 32);
            }
        } else {
            CasinoUI.relabel(this._ioYardsBtn, label);
            this.setChildIndex(this._ioYardsBtn, this.numChildren - 1);
        }
        this._ioYardsBtn.visible = true;
    }

    /** The Yards panel: a row for each of the player's yards in range, Sends / Stays home; the count follows. */
    private ioYardsPanel(): void {
        if (this._ioYardsWin) {
            this._ioYardsWin.close();
        }
        let yards: any[] = this.ioMyYards();
        if (!yards.length) {
            return;
        }
        let W: int = 460;
        let H: int = (118 + yards.length * 36) | 0;
        let win: any = IoWin.openPanel("ioAtkYardsWin", W, H, KEYS.Get("io_away_atk_title"));
        this._ioYardsWin = win;
        let mc: MovieClip = win.mc;
        let sub: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_away_atk_sub"), 11, CasinoUI.ASH, true, W - 44, TextFormatAlign.LEFT)), TextField);
        sub.multiline = true;
        sub.wordWrap = true;
        sub.height = 32;
        sub.x = win.left + 22;
        sub.y = win.top + 48;
        let i: int = 0;
        for (let y of as3.values(yards)) {
            let cd: CellData = as3.as(y[0], CellData);
            let cell: MapRoomCell = cd.cell;
            let row: Sprite = as3.as(mc.addChild(CasinoUI.panel(W - 40, 32, 0.9)), Sprite);
            row.name = "ioAtkYard:" + cell.X + "," + cell.Y;
            row.x = win.left + 20;
            row.y = win.top + 84 + i * 36;
            let where: string = KEYS.Get(cell._base == 2 ? "io_away_yard_main" : "io_away_yard_outpost", { "v1": cell.X, "v2": cell.Y });
            let t: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get("io_away_atk_row", { "v1": where, "v2": GLOBAL.FormatNumber(y[1] | 0) }), 12, CasinoUI.GOLD, true, W - 40 - 150, TextFormatAlign.LEFT)), TextField);
            GLOBAL.ioFitText(t, 8);
            t.x = 10;
            t.y = 7;
            let toggle: Sprite = null;
            let draw: Function = (): void => {
                let home: boolean = ATTACK.ioIsExcluded(cell);
                CasinoUI.relabel(toggle, KEYS.Get(home ? "io_away_atk_home" : "io_away_atk_sends"));
                CasinoUI.choose(toggle, !home);
            };
            toggle = as3.as(row.addChild(CasinoUI.toggle(KEYS.Get("io_away_atk_sends"), 130, 26, (e: MouseEvent): void => {
                ATTACK.ioSetExcluded(cell, !ATTACK.ioIsExcluded(cell));
                draw();
                // (counted again: the monsters and the flinger the attack has)
                this._enabled = false;
                this.Update();
            })), Sprite);
            toggle.name = "ioAtkYardSend:" + cell.X + "," + cell.Y;
            toggle.x = W - 40 - 136;
            toggle.y = 3;
            draw();
            i++;
        }
        let done: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_away_atk_done"), 120, 28, (e: MouseEvent): void => {
            win.close();
        }, true, 13)), Sprite);
        done.name = "ioAtkYardsDone";
        done.x = -60;
        done.y = -win.top - 40;
    }

    private onSiegeIconComplete(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: MovieClip = null;
        if (param3[0]) {
            _loc4_ = as3.cast(param3[0], MovieClip);
            while (_loc4_.numChildren > 0) {
                _loc4_.removeChildAt(0);
            }
        }
        let _loc5_: Bitmap = new Bitmap(param2);
        _loc5_.height = 60;
        _loc5_.width = 60;
        if (_loc4_) {
            _loc4_.addChild(_loc5_);
        }
    }

    private ProfilePic(): void {
        let onImageLoad: Function = null;
        let imageComplete: Function = null;
        let LoadImageError: Function = null;
        onImageLoad = (param1: Event): void => {
            if (this._profilePic) {
                this._profilePic.height = 50;
                this._profilePic.width = 50;
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
            this._profilePic.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
            this._profilePic.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoad);
            if (Boolean(!GLOBAL._flags.viximo) && Boolean(this._cell._pic_square)) {
                this._profilePic.load(new URLRequest(this._cell._pic_square));
            } else {
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
        if (!this._cell._facebookID || this._cell._base <= 1) {
            this.mcAlliancePic.visible = false;
            return;
        }
        if (this._cell._base > 1 && Boolean(this._cell._alliance)) {
            k = this.mcAlliancePic.mcImage.numChildren | 0;
            while (k--) {
                this.mcAlliancePic.mcImage.removeChildAt(k);
            }
            this.mcAlliancePic.visible = true;
            allyinfo = this._cell._alliance;
            allyinfo.AlliancePic(size, container, containerBG, true);
        } else {
            this.mcAlliancePic.visible = false;
        }
    }
}
