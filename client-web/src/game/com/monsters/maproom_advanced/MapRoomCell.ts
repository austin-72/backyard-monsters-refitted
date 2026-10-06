import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { ALLIANCES, AllyInfo, BUILDING5, CREATURES, GLOBAL, HellTileVariants, IMapRoomCell, InfernoMapTheme, IoTestMode, IoUnderworld, LOGGER, LOGIN, MapRoomCell_CLIP, SecNum, TRIBES, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class MapRoomCell extends MapRoomCell_CLIP implements IMapRoomCell {
    static {
        as3.implement(this, [IMapRoomCell]);
        as3.fields(this, { X: 0, Y: 0, _updated: false, _ioShownData: null, _dataAge: 0, _ioSnap: false, _ioUnder: false, _ioPortal: null, _base: 0, _baseID: NaN, _allianceID: 0, _alliance: null, _height: 0, _groundVariant: null, _mine: 0, _facebookID: NaN, _pic_square: null, _userID: 0, _online: 0, _friend: 0, _truce: 0, _name: null, _protected: 0, _resources: null, _hpResources: null, _monsterData: null, _flingerRange: null, _flingerLevel: null, _catapult: null, _level: 0, _destroyed: 0, _damaged: 0, _water: false, _monsters: null, _ticks: 0, _processed: false, _dirty: false, _locked: 0, _hpMonsterData: null, _hpMonsters: null, _invitePendingID: 0, _damage: 0, _workerBusy: false, _inRange: false, _over: false, _terrain: null, _hasWarned: 0, _value: 0, _smokeBMD: null, _smokeDO: null, _smokeRender: false, _smokeParticles: null, _frame: 0, depth: 0, inTest: false, _inAllianceProps: null, _soloProps: null, _picURLs: null, testAllianceIDs: null, _ioWorker2: null });
    }

    public X: int;
    public Y: int;
    public _updated: boolean;
    /** The map data object this cell is currently drawn from (see MapRoomPopup.Update). */
    public _ioShownData: any;
    public _dataAge: int;
    /** Drawn from the world snapshot only (IoMapSnapshot): no monsters or resources yet, getarea brings them. */
    public _ioSnap: boolean;
    /** Inferno-only: an underworld cell (IoUnderworld): an outpost there has no Flinger and a range of 1. */
    public _ioUnder: boolean;
    /** Inferno-only: a portal to the underworld or back up on this (lava) cell: [number, x, y, under x, under y]. */
    public _ioPortal: any[];
    public _base: int;
    public _baseID: number;
    public _allianceID: int;
    public _alliance: AllyInfo;
    public _height: int;
    /** Inferno-only: the extra ground art drawn under this cell's frame (HellTileVariants), or null. */
    private _groundVariant: Bitmap;
    public _mine: int;
    public _facebookID: number;
    public _pic_square: string;
    public _userID: int;
    public _online: int;
    public _friend: int;
    public _truce: int;
    public _name: string;
    public _protected: int;
    public _resources: any;
    public _hpResources: any;
    public _monsterData: any;
    public _flingerRange: SecNum;
    public _flingerLevel: SecNum;
    public _catapult: SecNum;
    public _level: int;
    public _destroyed: int;
    public _damaged: int;
    public _water: boolean;
    public _monsters: any;
    public _ticks: int;
    public _processed: boolean;
    public _dirty: boolean;
    public _locked: int;
    public _hpMonsterData: any;
    public _hpMonsters: any;
    public _invitePendingID: int;
    public _damage: int;
    public _workerBusy: boolean;
    public _inRange: boolean;
    public _over: boolean;
    public _terrain: string;
    public _hasWarned: int;
    public _value: number;
    private _smokeBMD: BitmapData;
    private _smokeDO: DisplayObject;
    private _smokeRender: boolean;
    private _smokeParticles: any[];
    private _frame: int;
    public depth: int;
    private inTest: boolean;
    private _inAllianceProps: any;
    private _soloProps: any;
    private _picURLs: any;
    private testAllianceIDs: any[];
    /** Inferno-only: a second worker marker, stacked behind the first (an outpost with both workers idle). */
    private _ioWorker2: MovieClip;

    public $ctor(): void {
        this._inAllianceProps = { "txtNameX": 0, "txtNameY": 1, "txtAllyX": 0, "txtAllyY": 11 };
        this._soloProps = { "txtNameX": 0, "txtNameY": 1, "txtAllyX": 0, "txtAllyY": 11 };
        this._picURLs = { "baseURL": "alliances/", "sizeL": "_large", "sizeM": "_medium", "sizeS": "_small", "sizeXS": "_xsmall", "ally": "A", "friendly": "F", "hostile": "H", "neutral": "N", "ext": ".png" };
        this.testAllianceIDs = [1, 2, 3, 102, 111];
        super.$ctor();
        this.mc.mcHit.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.mc.mcHit.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.mc.mcHit.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Click));
        this.mc.mcPlayer.mouseEnabled = false;
        this.mc.mcPlayer.mouseChildren = false;
        this.mc.mcGlow.mouseEnabled = false;
        this.mc.mcGlow.mouseChildren = false;
        this.mc.mcGlow.gotoAndStop(1);
        this.mc.mcEdges.mouseEnabled = false;
        this.mc.mcEdges.mouseChildren = false;
        this.mc.mcPlayer.mcWorker.visible = false;
        this.mc.mcPlayer.mcInvite.visible = false;
        this.mc.mcPlayer.mcFlag.mouseEnabled = false;
        this.mc.mcPlayer.mcFlag.mouseChildren = false;
        this.mc.mcPlayer.mcFlag.gotoAndStop(1);
        this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop(1);
        this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop(1);
        this.mc.mcPlayer.mcFlag.txtAlliance.visible = false;
        this.mc.mcPlayer.mcFlag.txtAlliance.htmlText = "";
        this.mc.mcEdges.enabled = false;
        this.mc.mcEdges.visible = false;
        this.mc.mcPrompt.enabled = false;
        this.mc.mcPrompt.visible = false;
    }

    /**
     * Inferno-only (5 October, the user's): how many of this outpost's workers are idle. The outpost's save says
     * when each is free again (finishtimes, BASE.getHousingSaveData); a save from before has only the first
     * worker's (finishtime), and the outpost now has 2 (GLOBAL.ioOutpostWorkers).
     */
    public ioIdleWorkers(): int {
        let workers: int = GLOBAL.ioOutpostWorkers();
        if (!this._monsterData) {
            return workers;
        }
        let now: number = GLOBAL.Timestamp();
        let times: any[] = as3.as(this._monsterData.finishtimes, Array);
        let busy: int = 0;
        if (times && times.length) {
            for (let i: int = 0; i < times.length && i < workers; i++) {
                if (Number(times[i]) > now) {
                    busy++;
                }
            }
        } else if (Number(this._monsterData.finishtime) > now) {
            busy = 1;
        }
        return Math.max(0, workers - busy) | 0;
    }

    /** Inferno-only: the idle worker marker, and a second one behind it when two are idle. */
    public ioShowWorkers(idle: int): void {
        let first: MovieClip = as3.cast(this.mc.mcPlayer.mcWorker, MovieClip);
        first.visible = idle >= 1;
        if (idle >= 2 && !this._ioWorker2) {
            // (a copy of the marker from a fresh cell: it has no class of its own to make one from)
            let source: MapRoomCell_CLIP = new MapRoomCell_CLIP();
            this._ioWorker2 = as3.cast(source.mc.mcPlayer.mcWorker, MovieClip);
            if (this._ioWorker2) {
                this._ioWorker2.parent.removeChild(this._ioWorker2);
                this._ioWorker2.mouseEnabled = false;
                this._ioWorker2.mouseChildren = false;
            }
        }
        if (!this._ioWorker2) {
            return;
        }
        if (idle >= 2) {
            if (this._ioWorker2.parent != first.parent) {
                first.parent.addChildAt(this._ioWorker2, first.parent.getChildIndex(first));
            }
            this._ioWorker2.x = first.x + 9;
            this._ioWorker2.y = first.y - 6;
            this._ioWorker2.scaleX = first.scaleX;
            this._ioWorker2.scaleY = first.scaleY;
            this._ioWorker2.gotoAndStop(first.currentFrame);
        }
        this._ioWorker2.visible = idle >= 2;
    }

    public set alliance(param1: AllyInfo) {
        this._alliance = param1;
    }

    public get allianceID(): int {
        return this._allianceID;
    }

    public get monsters(): any {
        return this._monsters;
    }

    public get monsterData(): any {
        return this._monsterData;
    }

    public get resources(): any {
        return this._resources;
    }

    public get hpMonsters(): any {
        return this._hpMonsters;
    }

    public get hpMonsterData(): any {
        return this._hpMonsterData;
    }

    public get hpResources(): any {
        return this._hpResources;
    }

    public get terrain(): string {
        return this._terrain;
    }

    /* Inferno-only (hell-yard-grounds): the yard ground (MAPBG texture) for this cell's height, one per
     * ground picture of the map (the same bands as Update: sand1 100-104 ... land6 175+). Null for lava
     * (below 100), where no yard stands. */
    public get ioYardGround(): string {
        let h: int = this._height;
        if (h < 100) {
            return null;
        }
        if (h < 105) {
            return "hell_sand1";
        }
        if (h < 110) {
            return "hell_sand2";
        }
        if (h < 120) {
            return "hell_land1";
        }
        if (h < 140) {
            return "hell_land2";
        }
        if (h < 160) {
            return "hell_land3";
        }
        if (h < 170) {
            return "hell_land4";
        }
        if (h < 175) {
            return "hell_land5";
        }
        return "hell_land6";
    }

    public get flingerRange(): SecNum {
        return this._flingerRange;
    }

    /** Inferno-only: the yard's level as the map shows it (the quest book: Moloch's level). */
    public get ioLevel(): int {
        return this._level;
    }

    public get baseID(): number {
        return this._baseID;
    }

    public get baseType(): int {
        return this._base;
    }

    public set baseType(param1: int) {
        this._base = param1;
    }

    public get cellX(): int {
        return this.X;
    }

    public set cellX(param1: int) {
        this.X = param1;
    }

    public get cellY(): int {
        return this.Y;
    }

    public set cellY(param1: int) {
        this.Y = param1;
    }

    public get cellHeight(): int {
        return this._height;
    }

    public get mine(): int {
        return this._mine;
    }

    public get online(): int {
        return this._online;
    }

    public get truce(): int {
        return this._truce;
    }

    public get isDestroyed(): boolean {
        return !(!this._destroyed) ? true : false;
    }

    public set destroyed(param1: int) {
        this._destroyed = param1;
    }

    public get isLocked(): boolean {
        return this._locked != 0 && this._locked != LOGIN._playerID;
    }

    public get isProtected(): int {
        return this._protected;
    }

    public set isProtected(param1: int) {
        this._protected = param1;
    }

    public get isDirty(): boolean {
        return this._dirty;
    }

    public set isDirty(param1: boolean) {
        this._dirty = param1;
    }

    public Setup(serverData: any): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        this._dataAge = 10;
        this._updated = true;
        this._ioSnap = Boolean(serverData.io_snap);
        this._ioUnder = GLOBAL.INFERNO_ONLY && Boolean(serverData.u);
        this._ioPortal = GLOBAL.INFERNO_ONLY ? as3.as(serverData.io_portal, Array) : null;
        this._processed = false;
        this._base = serverData.b | 0;
        if (serverData.bid) {
            if (this._baseID != 0 && this._baseID == GLOBAL._homeBaseID) {
                MapRoom._homeCell = this;
            } else if (GLOBAL._mapHome && this.X == GLOBAL._mapHome.x && this.Y == GLOBAL._mapHome.y) {
                // (bug report: no home cell known yet)
                MapRoom._homeCell = this;
            }
            this._baseID = Number(serverData.bid);
        }
        this._value = Number(serverData.v);
        if (serverData.aid) {
            this._allianceID = serverData.aid | 0;
        } else {
            this._allianceID = 0;
            this._alliance = null;
        }
        if (this._alliance) {
            this.mc.mcPlayer.mcFlag.visible = true;
            ALLIANCES.SetCellAlliance(this, true);
        } else if (Boolean(this._allianceID) && this._allianceID > 0) {
            ALLIANCES.SetCellAlliance(this, true);
            this.mc.mcPlayer.mcFlag.visible = false;
        }
        this.mc.mcPlayer.mcLevel.visible = false;
        this._height = serverData.i | 0;
        this._water = this._height < 100;
        this._mine = serverData.mine | 0;
        if (this._ioUnder && this._base == 3) {
            // Inferno-only: an underworld outpost has no Flinger. It reaches the cells next to it, and flings as
            // many monsters as the main yard's Flinger can (IoUnderworld).
            this._flingerLevel = new SecNum(Math.max(1, Number(GLOBAL._playerFlingerLevel ? GLOBAL._playerFlingerLevel.Get() : 1)));
            this._flingerRange = new SecNum(IoUnderworld.outpostRange);
        } else if (serverData.f) {
            this._flingerLevel = new SecNum(Number(serverData.f));
            this._flingerRange = new SecNum(BUILDING5.getFlingerRange(serverData.f | 0, this.isMainBase));
        } else {
            this._flingerRange = new SecNum(0);
            this._flingerLevel = new SecNum(0);
        }
        if (serverData.c) {
            this._catapult = new SecNum(Number(serverData.c));
        } else {
            this._catapult = new SecNum(0);
        }
        this._userID = serverData.uid | 0;
        this._facebookID = Number(serverData.fbid);
        this._truce = (GLOBAL.INFERNO_ONLY ? 0 : serverData.t) | 0;
        // (Inferno: no truces, 4 October)
        this._name = as3.str(serverData.n);
        this._friend = serverData.fr | 0;
        this._online = serverData.on | 0;
        this._protected = serverData.p | 0;
        if (serverData.pi) {
            this._invitePendingID = serverData.pi | 0;
        } else {
            this._invitePendingID = 0;
        }
        if (serverData.r) {
            this._hpResources = { "r1": serverData.r.r1 | 0, "r2": serverData.r.r2 | 0, "r3": serverData.r.r3 | 0, "r4": serverData.r.r4 | 0, "r1max": serverData.r.r1max | 0, "r2max": serverData.r.r2max | 0, "r3max": serverData.r.r3max | 0, "r4max": serverData.r.r4max | 0 };
            this._resources = { "r1": new SecNum(serverData.r.r1 | 0), "r2": new SecNum(serverData.r.r2 | 0), "r3": new SecNum(serverData.r.r3 | 0), "r4": new SecNum(serverData.r.r4 | 0), "r1max": serverData.r.r1max | 0, "r2max": serverData.r.r2max | 0, "r3max": serverData.r.r3max | 0, "r4max": serverData.r.r4max | 0 };
        } else {
            this._hpResources = { "r1": 0, "r2": 0, "r3": 0, "r4": 0, "r1max": 500000, "r2max": 500000, "r3max": 500000, "r4max": 500000 };
            this._resources = { "r1": new SecNum(0), "r2": new SecNum(0), "r3": new SecNum(0), "r4": new SecNum(0), "r1max": 500000, "r2max": 500000, "r3max": 500000, "r4max": 500000 };
        }
        this._dirty = false;
        if (serverData.m && serverData.m.hcc != null && serverData.m.h != null && serverData.m.overdrivepower != null && serverData.m.housed != null) {
            // A private copy: several MapRoomCell objects are set up from the same map data (the tile on
            // the map, GLOBAL._currentCell, MapRoom._monsterSource). Sharing this object meant each of them
            // counted the same numbers down while keeping its own protected copy, so the two stopped
            // matching, Check() failed and the outpost's update after an attack from it was not saved.
            this._hpMonsterData = JSON.parse(JSON.stringify(serverData.m));
            if (!this._hpMonsterData.overdrivetime) {
                this._hpMonsterData.overdrivetime = 0;
            }
            if (!this._hpMonsterData.saved) {
                this._hpMonsterData.saved = 0;
            }
            if (!this._hpMonsterData.space) {
                this._hpMonsterData.space = 0;
            }
        } else {
            this._hpMonsterData = { "hcc": [], "h": [], "hstage": [], "hid": [], "overdrivepower": 1, "overdrivetime": 0, "saved": GLOBAL.Timestamp() - 5, "housed": {}, "space": 0 };
        }
        if (this._hpMonsterData) {
            this.SecureMonsterData();
        }
        this._monsters = {};
        if (this._monsterData) {
            this._monsters = this._monsterData.housed;
            this._monsterData.finishtime = this._hpMonsterData.finishtime;
            this._monsterData.finishtimes = this._hpMonsterData.finishtimes;
        }
        if (this._hpMonsterData) {
            this._hpMonsters = this._hpMonsterData.housed;
        }
        this._level = serverData.l | 0;
        if (serverData.d) {
            this._destroyed = serverData.d | 0;
        } else {
            this._destroyed = 0;
        }
        if (serverData.lo) {
            this._locked = serverData.lo | 0;
        } else {
            this._locked = 0;
        }
        this._ticks = 0;
        if (serverData.dm) {
            this._damage = serverData.dm | 0;
        } else {
            this._damage = 0;
        }
        if (serverData.pic_square) {
            this._pic_square = as3.str(serverData.pic_square);
        }
        if (serverData.im) {
            this._pic_square = as3.str(serverData.im);
        }
        this.Update();
        let _loc2_: int = getTimer();
        if (this._monsterData) {
            _loc3_ = getTimer();
            _loc4_ = this._monsterData.saved | 0;
            _loc5_ = this._monsterData.saved | 0;
            while (_loc5_ < GLOBAL.Timestamp()) {
                if (this.Tick(_loc5_)) {
                    break;
                }
                _loc5_++;
            }
        }
        this._processed = true;
    }

    public Update(): void {
        if (this._height < 100) {
            if (this._height < 80) {
                this.mc.gotoAndStop("water1");
            } else if (this._height < 90) {
                this.mc.gotoAndStop("water2");
            } else {
                this.mc.gotoAndStop("water3");
            }
            this.mc.y = ((100 - this._height) | 0) + 18;
            this.mc.mcWater.y = -((100 - this._height) | 0);
        } else {
            if (this._height < 105) {
                this.mc.gotoAndStop("sand1");
                this._terrain = "sand";
            } else if (this._height < 110) {
                this.mc.gotoAndStop("sand2");
                this._terrain = "sand";
            } else if (this._height < 120) {
                this.mc.gotoAndStop("land1");
                this._terrain = "grass";
            } else if (this._height < 140) {
                this.mc.gotoAndStop("land2");
                this._terrain = "grass";
            } else if (this._height < 160) {
                this.mc.gotoAndStop("land3");
                this._terrain = "grass";
            } else if (this._height < 170) {
                this.mc.gotoAndStop("land4");
                this._terrain = "grass";
            } else if (this._height < 175) {
                this.mc.gotoAndStop("land5");
                this._terrain = "rock";
            } else {
                this.mc.gotoAndStop("land6");
                this._terrain = "rock";
            }
            this.mc.y = -(((this._height - 100) * 0.6) | 0) + 18;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // The map's own art is the Inferno's now (hell-maproom2): no tint, one of four ground pictures
            InfernoMapTheme.apply(this.mc, this._height);
            this.ApplyGroundVariant();
        }
        if (this._base > 0) {
            this.mc.mcPlayer.visible = true;
            this.mc.mcPlayer.mcFlag2.visible = false;
            this.mc.mcPlayer.mcLevel.visible = false;
            this.SetupAlliance();
            if (this._base == 1) {
                this.mc.mcPlayer.gotoAndStop("tribe-" + TRIBES.MapFrameName(this._name));

                this.mc.mcPlayer.mcLevel.gotoAndStop(1);
                this.mc.mcPlayer.mcLevel.lv_txt.htmlText = "<b>" + this._level + "</b>";
                if (Boolean(this._level) && this._level > 0) {
                    this.mc.mcPlayer.mcLevel.visible = true;
                }
                this.mc.mcPlayer.mcFlag.txt.htmlText = "" + TRIBES.DisplayName(this._name);
                this.mc.mcPlayer.mcFlag.txt.y = this._inAllianceProps.txtNameY;
                this.mc.mcPlayer.mcFlag.txtAlliance.htmlText = "";
                this.mc.mcPlayer.mcFlag.txtAlliance.y = this._inAllianceProps.txtAllyY;
                this.mc.mcPlayer.mcFlag.txtAlliance.visible = false;
            } else {
                this.mc.mcPlayer.mcLevel.gotoAndStop(2);
                this.mc.mcPlayer.mcLevel.lv_txt.htmlText = "<b>" + this._level + "</b>";
                if (Boolean(this._level) && this._level > 0) {
                    this.mc.mcPlayer.mcLevel.visible = true;
                }
                if (this._protected) {
                    if (this._base == 2) {
                        this.mc.mcPlayer.gotoAndStop("main-protected");
                    }
                    if (this._base == 3) {
                        this.mc.mcPlayer.gotoAndStop("outpost-protected");
                    }
                } else if (this._base == 2) {
                    if (this._destroyed) {
                        this.mc.mcPlayer.gotoAndStop("main-destroyed");
                    } else if (this._damage) {
                        this.mc.mcPlayer.gotoAndStop("main-damaged");
                    } else {
                        this.mc.mcPlayer.gotoAndStop("main");
                    }
                } else if (this._base == 3) {
                    if (this._destroyed) {
                        this.mc.mcPlayer.gotoAndStop("outpost-destroyed");
                    } else if (this._damage) {
                        this.mc.mcPlayer.gotoAndStop("outpost-damaged");
                    } else {
                        this.mc.mcPlayer.gotoAndStop("outpost");
                    }
                }
                this.mc.mcPlayer.mcFlag.txt.htmlText = "<b>" + this._name + "</b> ";
                if (this._alliance) {
                    this.mc.mcPlayer.mcFlag.txt.y = this._inAllianceProps.txtNameY;
                    this.mc.mcPlayer.mcFlag.txtAlliance.visible = false;
                    this.mc.mcPlayer.mcFlag.txtAlliance.y = this._inAllianceProps.txtAllyY;
                    this.mc.mcPlayer.mcFlag.txtAlliance.htmlText = "";
                } else {
                    this.mc.mcPlayer.mcFlag.txt.y = this._soloProps.txtNameY;
                    this.mc.mcPlayer.mcFlag.txtAlliance.visible = false;
                    this.mc.mcPlayer.mcFlag.txtAlliance.y = this._soloProps.txtAllyY;
                    this.mc.mcPlayer.mcFlag.txtAlliance.htmlText = "";
                }
                this.mc.mcPlayer.mcTruce.visible = !GLOBAL.INFERNO_ONLY && this._truce > GLOBAL.Timestamp();
            }
        } else {
            this.mc.mcPlayer.visible = false;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // After the icon's frame has been chosen, and on every update, not only for tribes:
            // cells are recycled, so one that showed a tribe yard a moment ago may now be a player, an
            // outpost or open ground.
            InfernoMapTheme.tribeIcon(as3.cast(this.mc.mcPlayer, MovieClip), this._base == 1 ? this._name : null);
            IoUnderworld.portalIcon(this.mc, this._base == 0 ? this._ioPortal : null, this.X, this.Y);
        }
        if (this._damage) {
            this.mc.mcPlayer.mcFlag2.visible = false;
            this.mc.mcPlayer.mcFlag.nameBar.mcBar.width = 100 / 100 * Math.max(0, 100 - this._damage);
            if (this._base == 1) {
                this.mc.mcPlayer.mcFlag.txt.htmlText = "" + TRIBES.DisplayName(this._name) + "";
                this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop(!(!this._destroyed) ? "destroyed" : "wmyard");
                this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop(!(!this._destroyed) ? "destroyed" : "wmyard");
            }
        } else {
            this.mc.mcPlayer.mcFlag.nameBar.mcBar.width = 100;
        }
        if (this._inRange) {
            if (this._over) {
                this.mc.mcGlow.gotoAndStop(4);
            } else {
                this.mc.mcGlow.gotoAndStop(3);
            }
        } else if (this._over) {
            this.mc.mcGlow.gotoAndStop(2);
        } else {
            this.mc.mcGlow.gotoAndStop(1);
        }
        if (this._monsterData) {
            if (Boolean(this._monsterData.finishtime) && this._monsterData.finishtime > GLOBAL.Timestamp()) {
                this._workerBusy = true;
            } else {
                this._workerBusy = false;
            }
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioShowWorkers(this._base == 3 && Boolean(this._mine) ? this.ioIdleWorkers() : 0);
        } else if (!this._workerBusy && this._base == 3 && Boolean(this._mine)) {
            this.mc.mcPlayer.mcWorker.visible = true;
        } else {
            this.mc.mcPlayer.mcWorker.visible = false;
        }
        if (this._invitePendingID && this._base == 3 && Boolean(this._mine)) {
            this.mc.mcPlayer.mcInvite.visible = true;
        } else {
            this.mc.mcPlayer.mcInvite.visible = false;
        }
        if (MapRoom._viewOnly && this._baseID == MapRoom._inviteBaseID) {
            this.mc.mcPrompt.bYes.SetupKey("btn_yes");
            this.mc.mcPrompt.bNo.SetupKey("btn_no");
            this.mc.mcPrompt.bYes.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
                MapRoom.PreAcceptInvitation(as3.as(MapRoom._mc, MovieClip));
            });
            this.mc.mcPrompt.bNo.addEventListener(MouseEvent.MOUSE_UP, MapRoom.RejectInvitation);
        }
    }

    /** Inferno-only: draws one of the four ground pictures of this cell's terrain (HellTileVariants). */
    public ApplyGroundVariant(): void {
        if (IoUnderworld.drawsDepths(this.X, this.Y)) {
            // the Depths of Hell: platforms in lava, bridges between them (IoUnderworld.depthsGround)
            this._groundVariant = HellTileVariants.applyBitmap(this.mc, IoUnderworld.depthsGround(this.X, this.Y), this._groundVariant);
            return;
        }
        this._groundVariant = HellTileVariants.apply(this.mc, this.X, this.Y, this._groundVariant);
    }

    /** Puts the frame's own ground art back (a cell sent back to the unloaded frame while scrolling). */
    public ResetGroundVariant(): void {
        HellTileVariants.reset(this.mc, this._groundVariant);
    }

    public Tick(param1: int = 0): boolean {
        let _loc3_: int = 0;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc6_: any[] = null;
        let _loc7_: any[] = null;
        let _loc8_: any[] = null;
        let _loc9_: any[] = null;
        let _loc10_: string = null;
        if (MapRoom._viewOnly) {
            this.mc.mcPlayer.mcWorker.visible = false;
            this.ioShowWorkers(0);
            if (this._baseID == MapRoom._inviteBaseID) {
                if (this._over) {
                    this.mc.mcGlow.gotoAndStop(5);
                } else {
                    this.mc.mcGlow.gotoAndStop(6);
                }
                this.mc.mcPrompt.visible = true;
                this.mc.mcPrompt.enabled = true;
                this.mc.mcPrompt.mouseChildren = true;
            } else {
                this.mc.mcPrompt.visible = false;
                this.mc.mcPrompt.enabled = false;
                this.mc.mcPrompt.mouseChildren = false;
            }
            return true;
        }
        if (this._alliance) {
            this._alliance.Relations(ALLIANCES._allianceID);
        }
        --this._dataAge;
        if (this._inRange) {
            if (this._over) {
                this.mc.mcGlow.gotoAndStop(4);
            } else {
                this.mc.mcGlow.gotoAndStop(3);
            }
        } else if (this._over) {
            this.mc.mcGlow.gotoAndStop(2);
        } else {
            this.mc.mcGlow.gotoAndStop(1);
        }
        let _loc2_: boolean = true;
        if (!this._mine) {
            this.mc.mcPlayer.mcWorker.visible = false;
            this.ioShowWorkers(0);
            return true;
        }
        if (!this._updated) {
            return true;
        }
        if (Boolean(this._monsterData) && Boolean(this._resources)) {
            if (Boolean(this._monsterData.finishtime) && this._monsterData.finishtime > GLOBAL.Timestamp()) {
                this._workerBusy = true;
            } else {
                this._workerBusy = false;
            }
            if (GLOBAL.INFERNO_ONLY) {
                this.ioShowWorkers(this._base == 3 && Boolean(this._mine) ? this.ioIdleWorkers() : 0);
            } else if (!this._workerBusy && this._base == 3 && Boolean(this._mine)) {
                this.mc.mcPlayer.mcWorker.visible = true;
            } else {
                this.mc.mcPlayer.mcWorker.visible = false;
            }
            this._ticks += 1;
            if (param1) {
                this._monsterData.saved = param1;
                this._hpMonsterData.saved = param1;
            } else {
                this._monsterData.saved = GLOBAL.Timestamp();
                this._hpMonsterData.saved = GLOBAL.Timestamp();
            }
            if (this._monsterData.hcount == 0) {
                return true;
            }
            if (this._monsterData.overdrivetime.Get() > 0) {
                this._monsterData.overdrivetime.Add(-1);
                --this._hpMonsterData.overdrivetime;
            }
            _loc3_ = 0;
            for (_loc4_ in this._monsterData.housed) {
                if (this._monsterData.housed[_loc4_].Get() > 0) {
                    _loc3_ = (_loc3_ + this._monsterData.housed[_loc4_].Get() * CREATURES.GetProperty(_loc4_, "cStorage")) | 0;
                } else {
                    delete this._monsterData.housed[_loc4_];
                    delete this._hpMonsterData.housed[_loc4_];
                }
            }
            _loc5_ = 0;
            while (_loc5_ < this._monsterData.hcount) {
                _loc6_ = as3.cast(this._monsterData.h[_loc5_], Array);
                _loc7_ = as3.cast(this._hpMonsterData.h[_loc5_], Array);
                if (Boolean(this._monsterData.h[_loc5_]) && this._monsterData.h[_loc5_].length > 0) {
                    if (this._monsterData.hstage[_loc5_].Get() == 1) {
                        if (this._monsterData.overdrivetime.Get() > 0 && this._monsterData.overdrivepower.Get() > 0) {
                            this._monsterData.h[_loc5_][1].Add(-this._monsterData.overdrivepower.Get());
                            this._hpMonsterData.h[_loc5_][1] -= this._hpMonsterData.overdrivepower;
                            if (this._monsterData.h[_loc5_][1].Get() != this._hpMonsterData.h[_loc5_][1]) {
                            }
                            _loc2_ = false;
                        } else {
                            if (this._monsterData.h[_loc5_][1].Get() != this._hpMonsterData.h[_loc5_][1]) {
                            }
                            this._monsterData.h[_loc5_][1].Add(-1);
                            this._hpMonsterData.h[_loc5_][1] = this._monsterData.h[_loc5_][1].Get();
                            _loc2_ = false;
                        }
                    }
                    if (_loc6_[0] == "") {
                        if (_loc6_.length > 2) {
                            _loc8_ = as3.cast(this._monsterData.h[_loc5_][2], Array);
                            _loc9_ = as3.cast(this._hpMonsterData.h[_loc5_][2], Array);
                            if (_loc8_.length > 0) {
                                _loc10_ = String(_loc8_[0][0]);
                                this._monsterData.h[_loc5_][2][0][1].Add(-1);
                                this._hpMonsterData.h[_loc5_][2][0][1] -= 1;
                                if (this._monsterData.h[_loc5_][2][0][1].Get() == 0) {
                                    this._monsterData.h[_loc5_][2].splice(0, 1);
                                    this._hpMonsterData.h[_loc5_][2].splice(0, 1);
                                }
                                this._monsterData.h[_loc5_] = [_loc10_, new SecNum(CREATURES.GetProperty(_loc10_, "cTime")), _loc8_];
                                this._hpMonsterData.h[_loc5_] = [_loc10_, CREATURES.GetProperty(_loc10_, "cTime"), _loc9_];
                                this._monsterData.hstage[_loc5_].Set(1);
                                this._hpMonsterData.hstage[_loc5_] = 1;
                                _loc2_ = false;
                            } else {
                                this._monsterData.h[_loc5_] = [];
                                this._hpMonsterData.h[_loc5_] = [];
                                this._monsterData.hstage[_loc5_].Set(0);
                                this._hpMonsterData.hstage[_loc5_] = 0;
                            }
                        } else {
                            this._monsterData.h[_loc5_] = [];
                            this._hpMonsterData.h[_loc5_] = [];
                            this._monsterData.hstage[_loc5_].Set(0);
                            this._hpMonsterData.hstage[_loc5_] = 0;
                        }
                    } else if (_loc6_[1].Get() <= 0 && (this._monsterData.hstage[_loc5_].Get() == 1 || this._monsterData.hstage[_loc5_].Get() == 2) && CREATURES.GetProperty(as3.str(_loc6_[0]), "cStorage") <= this._monsterData.space.Get() - _loc3_) {
                        if (this._monsters[_loc6_[0]]) {
                            this._monsters[_loc6_[0]].Add(1);
                            this._hpMonsters[_loc6_[0]] += 1;
                            _loc2_ = false;
                        } else {
                            this._monsters[_loc6_[0]] = new SecNum(1);
                            this._hpMonsters[_loc6_[0]] = 1;
                            _loc2_ = false;
                        }
                        _loc3_ = (_loc3_ + CREATURES.GetProperty(as3.str(_loc6_[0]), "cStorage")) | 0;
                        this.Indicate();
                        if (_loc6_.length > 2) {
                            _loc8_ = as3.cast(_loc6_[2], Array);
                            _loc9_ = as3.cast(_loc7_[2], Array);
                            if (_loc8_.length > 0) {
                                _loc10_ = String(_loc8_[0][0]);
                                _loc8_[0][1].Add(-1);
                                _loc9_[0][1] -= 1;
                                this._monsterData.h[_loc5_] = [_loc10_, new SecNum(CREATURES.GetProperty(_loc10_, "cTime")), _loc8_];
                                this._hpMonsterData.h[_loc5_] = [_loc10_, CREATURES.GetProperty(_loc10_, "cTime"), _loc9_];
                                if (_loc8_[0][1].Get() == 0) {
                                    _loc8_.splice(0, 1);
                                    _loc9_.splice(0, 1);
                                }
                                this._monsterData.hstage[_loc5_].Set(1);
                                this._hpMonsterData.hstage[_loc5_] = 1;
                                _loc2_ = false;
                            } else {
                                this._monsterData.h[_loc5_] = [];
                                this._hpMonsterData.h[_loc5_] = [];
                                this._monsterData.hstage[_loc5_].Set(0);
                                this._hpMonsterData.hstage[_loc5_] = 0;
                            }
                        } else {
                            this._monsterData.h[_loc5_] = [];
                            this._hpMonsterData.h[_loc5_] = [];
                            this._monsterData.hstage[_loc5_].Set(0);
                            this._hpMonsterData.hstage[_loc5_] = 0;
                        }
                    } else if (_loc6_[1].Get() <= 0 && (this._monsterData.hstage[_loc5_].Get() == 1 || this._monsterData.hstage[_loc5_].Get() == 2) && CREATURES.GetProperty(as3.str(_loc6_[0]), "cStorage") > this._monsterData.space.Get() - _loc3_) {
                        this._monsterData.hstage[_loc5_].Set(2);
                        this._hpMonsterData.hstage[_loc5_] = 2;
                    }
                } else if (Boolean(this._monsterData.hcc) && this._monsterData.hcc.length > 0) {
                    this._monsterData.h[_loc5_] = [this._monsterData.hcc[0][0], new SecNum(CREATURES.GetProperty(as3.str(this._monsterData.hcc[0][0]), "cTime"))];
                    this._monsterData.hcc[0][1].Add(-1);
                    this._hpMonsterData.h[_loc5_] = [this._hpMonsterData.hcc[0][0], CREATURES.GetProperty(as3.str(this._hpMonsterData.hcc[0][0]), "cTime")];
                    this._hpMonsterData.hcc[0][1] -= 1;
                    if (this._monsterData.hcc[0][1].Get() <= 0) {
                        (as3.as(this._monsterData.hcc, Array)).shift();
                        (as3.as(this._hpMonsterData.hcc, Array)).shift();
                    }
                    this._monsterData.hstage[_loc5_].Set(1);
                    this._hpMonsterData.hstage[_loc5_] = 1;
                    _loc2_ = false;
                }
                _loc5_++;
            }
            if (_loc2_) {
                if (this._monsterData) {
                    this._monsterData.saved = GLOBAL.Timestamp();
                    this._hpMonsterData.saved = GLOBAL.Timestamp();
                }
            }
            return _loc2_;
        }
        return true;
    }

    private Over(param1: MouseEvent): void {
        this._over = true;
        if (MapRoom._viewOnly && this._baseID == MapRoom._inviteBaseID) {
            this.mc.mcGlow.gotoAndStop(5);
        } else if (this._inRange) {
            this.mc.mcGlow.gotoAndStop(4);
        } else {
            this.mc.mcGlow.gotoAndStop(2);
        }
        MapRoom._mc.ShowInfo(this);
    }

    private Out(param1: MouseEvent): void {
        this._over = false;
        if (MapRoom._viewOnly && this._baseID == MapRoom._inviteBaseID) {
            this.mc.mcGlow.gotoAndStop(6);
        } else if (this._inRange) {
            this.mc.mcGlow.gotoAndStop(3);
        } else {
            this.mc.mcGlow.gotoAndStop(1);
        }
    }

    public Cleanup(): void {
        this.mc.mcHit.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.mc.mcHit.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.mc.mcHit.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Click));
        this._allianceID = 0;
        this._alliance = null;
    }

    private SecureMonsterData(): void {
        let _loc1_: string = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        this._monsterData = {};
        this._monsterData.space = new SecNum(Number(this._hpMonsterData.space));
        this._hpMonsterData.overdrivepower = Math.floor(Number(this._hpMonsterData.overdrivepower));
        this._monsterData.overdrivepower = new SecNum(Number(this._hpMonsterData.overdrivepower));
        this._hpMonsterData.overdrivetime = Math.floor(Number(this._hpMonsterData.overdrivetime));
        this._monsterData.overdrivetime = new SecNum(Number(this._hpMonsterData.overdrivetime));
        this._monsterData.saved = this._hpMonsterData.saved;
        this._monsterData.housed = {};
        for (_loc1_ in this._hpMonsterData.housed) {
            if (this._hpMonsterData.housed[_loc1_]) {
                if (this._hpMonsterData.housed[_loc1_] <= 0) {
                    delete this._hpMonsterData.housed[_loc1_];
                } else {
                    this._hpMonsterData.housed[_loc1_] = Math.floor(Number(this._hpMonsterData.housed[_loc1_]));
                    this._monsterData.housed[_loc1_] = new SecNum(Number(this._hpMonsterData.housed[_loc1_]));
                }
            }
        }
        this._monsterData.hcount = this._hpMonsterData.hcount;
        this._monsterData.h = [];
        this._monsterData.hstage = [];
        if (this._hpMonsterData.hstage == null) {
            this._hpMonsterData.hstage = [];
        }
        let _loc2_: int = 0;
        while (_loc2_ < this._monsterData.hcount) {
            this._monsterData.h[_loc2_] = [];
            if (Boolean(this._hpMonsterData.hstage) && this._hpMonsterData.hstage.length > _loc2_) {
                this._monsterData.hstage[_loc2_] = new SecNum(Number(this._hpMonsterData.hstage[_loc2_]));
            } else {
                this._monsterData.hstage[_loc2_] = new SecNum(0);
                this._hpMonsterData.hstage[_loc2_] = 0;
            }
            if (Boolean(this._hpMonsterData.h) && Boolean(this._hpMonsterData.h[_loc2_]) && this._hpMonsterData.h[_loc2_].length > 0) {
                this._monsterData.h[_loc2_][0] = this._hpMonsterData.h[_loc2_][0];
                // Whole numbers, like the queue below: the protected copy only holds whole numbers.
                this._hpMonsterData.h[_loc2_][1] = Math.floor(Number(this._hpMonsterData.h[_loc2_][1]));
                this._monsterData.h[_loc2_][1] = new SecNum(Number(this._hpMonsterData.h[_loc2_][1]));
                if (this._monsterData.h[_loc2_][1].Get() != this._hpMonsterData.h[_loc2_][1]) {
                }
                if (this._hpMonsterData.h[_loc2_].length > 2) {
                    this._monsterData.h[_loc2_][2] = [];
                    _loc5_ = this._hpMonsterData.h[_loc2_][2].length | 0;
                    _loc6_ = 0;
                    while (_loc6_ < _loc5_) {
                        this._monsterData.h[_loc2_][2][_loc6_] = [];
                        this._monsterData.h[_loc2_][2][_loc6_][0] = this._hpMonsterData.h[_loc2_][2][_loc6_][0];
                        this._hpMonsterData.h[_loc2_][2][_loc6_][1] = Math.floor(Number(this._hpMonsterData.h[_loc2_][2][_loc6_][1]));
                        this._monsterData.h[_loc2_][2][_loc6_][1] = new SecNum(Number(this._hpMonsterData.h[_loc2_][2][_loc6_][1]));
                        _loc6_++;
                    }
                }
            }
            _loc2_++;
        }
        this._monsterData.hcc = [];
        let _loc3_: int = this._hpMonsterData.hcc.length | 0;
        let _loc4_: int = 0;
        while (_loc4_ < _loc3_) {
            if (Boolean(this._hpMonsterData.hcc) && Boolean(this._hpMonsterData.hcc[_loc4_]) && this._hpMonsterData.hcc[_loc4_].length >= 2) {
                this._hpMonsterData.hcc[_loc4_][1] = Math.floor(Number(this._hpMonsterData.hcc[_loc4_][1]));
                this._monsterData.hcc[_loc4_] = [this._hpMonsterData.hcc[_loc4_][0], new SecNum(Number(this._hpMonsterData.hcc[_loc4_][1]))];
            }
            _loc4_++;
        }
    }

    private Click(param1: MouseEvent): void {
        // Admin test mode: the test tools' map fields start from the last cell clicked.
        IoTestMode.lastX = this.X;
        IoTestMode.lastY = this.Y;
        let _loc2_: string = null;
        if (Boolean(MapRoom._mc) && MapRoom._mc._dragged) {
            return;
        }
        if (MapRoom._inviteBaseID == this._baseID) {
            return;
        }
        // Only the world snapshot's data so far: the popups need the cell's monsters and resources, so
        // the click happens once getarea has answered for its zone (a moment later).
        if (this._ioSnap && this._base > 0) {
            MapRoom.ioClickWhenLoaded(this);
            return;
        }
        this.ioClick();
    }

    /** The click itself (Click, or MapRoom once the cell's zone has arrived). */
    public ioClick(): void {
        let _loc2_: string = null;
        MapRoom._currentPosition = new Point(this.X, this.Y);
        if (GLOBAL._local) {
            _loc2_ = "MapRoomCell.Click - X " + this.X + " Y " + this.Y + " H " + this._height + " B " + this._base + " ID " + this._baseID + " UID " + this._userID + " FBID " + this._facebookID + " Mine " + this._mine + " Name " + this._name + " d " + this._destroyed + " dm " + this._damage + " p " + this._protected + " fr " + this._friend + " busy " + this._workerBusy;
            if (this._flingerRange) {
                _loc2_ += " f " + this._flingerRange.Get();
            }
            if (this._hpMonsterData) {
                _loc2_ += " monsterdata " + JSON.stringify(this._hpMonsterData);
            }
            if (this._hpResources) {
                _loc2_ += " resources " + JSON.stringify(this._hpResources);
            }
        }
        MapRoom.TransferMonstersB(this);
        if (MapRoom._viewOnly && this._base > 0) {
            MapRoom._mc.ShowInfoViewOnly(this);
        } else if (this._base > 0 && !MapRoom._monsterTransferInProgress) {
            if (this._mine) {
                MapRoom._mc.ShowInfoMine(this);
            } else {
                MapRoom._mc.ShowInfoEnemy(this);
            }
        } else if (this._base == 0 && this._updated && !MapRoom._monsterTransferInProgress && GLOBAL.INFERNO_ONLY) {
            // Inferno-only: an empty place (lava) can be shared in chat or bookmarked.
            MapRoom._mc.ioShowSpot(this);
        }
    }

    public Check(): boolean {
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        if (!this._updated) {
            return true;
        }
        if (!this._processed) {
            return true;
        }
        if (!this._mine) {
            return true;
        }
        if (!this._monsterData || !this._hpMonsterData) {
            return true;
        }
        let _loc1_: boolean = true;
        let _loc2_: string = "err";
        if (this._monsterData.overdrivepower.Get() != this._hpMonsterData.overdrivepower) {
            LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") overdrive power " + this._monsterData.overdrivepower.Get() + " " + this._hpMonsterData.overdrivepower);
            _loc1_ = false;
        }
        if (this._monsterData.overdrivetime.Get() != this._hpMonsterData.overdrivetime) {
            LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") overdrive time " + this._monsterData.overdrivetime.Get() + " " + this._hpMonsterData.overdrivetime);
            _loc1_ = false;
        }
        for (_loc3_ in this._hpMonsterData.housed) {
            if (Boolean(this._monsterData.housed[_loc3_]) && this._monsterData.housed[_loc3_].Get() != this._hpMonsterData.housed[_loc3_]) {
                LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") housed " + _loc3_ + " " + this._monsterData.housed[_loc3_] + " " + this._hpMonsterData.housed[_loc3_]);
                _loc1_ = false;
            }
        }
        _loc4_ = 0;
        while (_loc4_ < this._monsterData.hcount) {
            if (this._monsterData.h[_loc4_].length != this._hpMonsterData.h[_loc4_].length) {
                LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") hatchery array length mismatch " + this._monsterData.h[_loc4_].length + " " + this._hpMonsterData.h[_loc4_].length);
                _loc1_ = false;
            } else if (this._monsterData.h[_loc4_].length >= 2) {
                if (this._monsterData.h[_loc4_][1].Get() != this._hpMonsterData.h[_loc4_][1]) {
                    LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") num monsters producing (now) " + this._monsterData.h[_loc4_][1].Get() + " " + this._hpMonsterData.h[_loc4_][1]);
                    _loc1_ = false;
                }
                if (this._monsterData.h[_loc4_].length > 2) {
                    if (this._monsterData.h[_loc4_][2].length != this._hpMonsterData.h[_loc4_][2].length) {
                        _loc1_ = false;
                    }
                    _loc6_ = this._monsterData.h[_loc4_][2].length | 0;
                    _loc7_ = 0;
                    while (_loc7_ < _loc6_) {
                        if (this._monsterData.h[_loc4_][2][_loc7_][1].Get() != this._hpMonsterData.h[_loc4_][2][_loc7_][1]) {
                            LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") num monsters producing (now) " + this._monsterData.h[_loc4_][2][_loc7_][1].Get() + " " + this._hpMonsterData.h[_loc4_][2][_loc7_][1]);
                            _loc1_ = false;
                        }
                        _loc7_++;
                    }
                }
            }
            if (this._monsterData.hstage[_loc4_].Get() != this._hpMonsterData.hstage[_loc4_]) {
                LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") production stage mismatch");
            }
            _loc4_++;
        }
        let _loc5_: int = 0;
        if ((_loc5_ = this._monsterData.hcc.length | 0) != this._hpMonsterData.hcc.length) {
            LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") HCC queue length mismatch " + _loc5_ + " " + this._hpMonsterData.hcc.length);
            _loc1_ = false;
        } else {
            _loc8_ = 0;
            while (_loc8_ < _loc5_) {
                if (this._monsterData.hcc[_loc8_][1].Get() != this._hpMonsterData.hcc[_loc8_][1]) {
                    LOGGER.Log(_loc2_, "MapRoomCell.Check (" + this.X + "," + this.Y + ") HCC queue size " + this._monsterData.hcc[_loc8_][1].Get() + " " + this._hpMonsterData.hcc[_loc8_][1]);
                    _loc1_ = false;
                }
                _loc8_++;
            }
        }
        return _loc1_;
    }

    private Indicate(): void {
    }

    private SmokeAdd(): void {
        this.SmokeRemove();
        let _loc1_: MovieClip = new MovieClip();
        _loc1_.addChild(new Bitmap(MapRoom._smokeBMD));
        _loc1_.x = -10;
        _loc1_.y = -90;
        _loc1_.mouseEnabled = false;
        _loc1_.mouseChildren = false;
        this._smokeDO = as3.cast(this.mc.mcPlayer.addChild(_loc1_), DisplayObject);
        this.mc.mcPlayer.mouseChildren = false;
    }

    private SmokeRemove(): void {
        if (Boolean(this._smokeDO) && Boolean(this._smokeDO.parent)) {
            this._smokeDO.parent.removeChild(this._smokeDO);
        }
    }

    public get isMainBase(): boolean {
        return this._base == 2;
    }

    private SetupAlliance(): void {
        let _loc1_: int = 0;
        this.mc.mcPlayer.mcFlag.visible = false;
        this.mc.mcPlayer.mcFlag.pic.visible = false;
        this.mc.mcPlayer.mcFlag.gotoAndStop("noAlliance");
        this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("none");
        this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("none");
        this.mc.mcPlayer.mcFlag.pic.visible = false;
        if (this._allianceID) {
            this.mc.mcPlayer.mcFlag.gotoAndStop("inAllianceNoPic");
            _loc1_ = this.mc.mcPlayer.mcFlag.pic.mcImage.numChildren | 0;
            while (_loc1_--) {
                this.mc.mcPlayer.mcFlag.pic.mcImage.removeChildAt(_loc1_);
            }
            if (this._alliance) {
                this.mc.mcPlayer.mcFlag.visible = true;
                if (Boolean(this._alliance.relationship) || this._alliance.relationship == 0) {
                    switch (this._alliance.relationship) {
                        case -1:
                            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("hostile");
                            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("hostile");
                            break;
                        case 1:
                            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("friendly");
                            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("friendly");
                            break;
                        case 4:
                            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("ally");
                            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("ally");
                            break;
                        case 5:
                            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("leader");
                            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("leader");
                            break;
                        default:
                            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("neutral");
                            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("neutral");
                    }
                }
            }
        } else {
            this.mc.mcPlayer.mcFlag.gotoAndStop("noAlliance");
            this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("none");
            this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("none");
            this.mc.mcPlayer.mcFlag.pic.visible = false;
            this.mc.mcPlayer.mcFlag.visible = true;
        }
        if (this._base > 0) {
            this.mc.mcPlayer.mcFlag.gotoAndStop("noAlliance");
            if (this._base == 1) {
                this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("wmyard");
                this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("wmyard");
                this.mc.mcPlayer.mcFlag.pic.visible = false;
            } else if (this._base == 2 || this._base == 3) {
                if (this._mine) {
                    this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("player");
                    this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("player");
                } else if (!this._allianceID) {
                    this.mc.mcPlayer.mcFlag.nameBar.mcBar.gotoAndStop("none");
                    this.mc.mcPlayer.mcFlag.nameBar.mcBG.gotoAndStop("none");
                }
            }
            this.mc.mcPlayer.mcFlag.visible = true;
        }
    }
}
