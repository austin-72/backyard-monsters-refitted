import * as as3 from "as3";
import { int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, CREATURES, EnumYardType, GLOBAL, GRID, INFERNOQUAKETOWER, INFERNO_ASCENSION_POPUP, INFERNO_EMERGENCE_EVENT, INFERNO_EMERGENCE_POPUPS, INFERNO_MAGMA_TOWER, KEYS, LOGGER, MAPROOM_DESCENT, MapRoomManager, PLEASEWAIT, SOUNDS, SecNum, SiegeFactory, SiegeLab, URLLoaderApi, popup_horse } from "@game";

export class INFERNOPORTAL extends BFOUNDATION {
    static {
        as3.fields(this, { _popup: null });
    }

    public static readonly ENTER_BUTTON: string = "btn_entercavern";

    public static readonly ASCENSION_BUTTON: string = "btn_ascendmonsters";

    public static readonly EXIT_BUTTON: string = "btn_exitcavern";

    private static _ascensionMc: INFERNO_ASCENSION_POPUP = null;

    public static building: INFERNOPORTAL = null;

    public static _descentPassed: boolean = false;

    public static _ascensionData: any = null;

    private static _ogInfernoData: any = null;

    private static _ogAscensionData: any = null;
    private _popup: popup_horse;

    public $ctor(): void {
        super.$ctor();
        this._type = 127;
        this._footprint = [new Rectangle(0, 0, 190, 160)];
        this._gridCost = [[new Rectangle(0, 0, 190, 160), 200]];
        this.SetProps();
    }

    public static GetMaxLevel(): number {
        if (!INFERNOPORTAL.building) {
            throw new Error("FUCK");
        }
        return Number(INFERNOPORTAL.building._buildingProps.costs.length);
    }

    public static EnterPortal(param1: boolean = false): void {
        if (GLOBAL._flags.inferno != 1) {
            GLOBAL.Message(KEYS.Get("inferno_msg_disabled"));
        } else if (MAPROOM_DESCENT.DescentPassed) {
            if (GLOBAL._flags.inferno != 1) {
                GLOBAL.Message(KEYS.Get("inferno_msg_disabled"));
                return;
            }
            INFERNOPORTAL.ToggleYard();
        } else {
            INFERNOPORTAL.EnterDescent();
        }
    }

    public static AscendMonsters(): void {
        let loader: URLLoaderApi = null;
        let onLoad: Function = null;
        let onError: Function = null;
        onLoad = (serverData: any): void => {
            let monster: string = null;
            PLEASEWAIT.Hide();
            INFERNOPORTAL._ogInfernoData = serverData.imonsters;
            INFERNOPORTAL._ascensionData = {};
            INFERNOPORTAL._ogAscensionData = {};
            for (monster in serverData.imonsters) {
                if (monster.substr(0, 2) == "IC") {
                    INFERNOPORTAL._ascensionData[monster] = new SecNum((as3.is(serverData.imonsters[monster], Number) ? serverData.imonsters[monster] : INFERNOPORTAL.numHealthyCreeps(monster, as3.cast(serverData.imonsters[monster], Array))) | 0);
                    INFERNOPORTAL._ogAscensionData[monster] = INFERNOPORTAL._ascensionData[monster].Get();
                }
            }
            INFERNOPORTAL.ShowAscendMonstersDialog();
        };
        onError = (): void => {
            LOGGER.Log("err", "INFERNOPORTAL.AscendMonsters No inferno monster data");
            GLOBAL.ErrorMessage("INFERNOPORTAL.AscendMonsters No inferno monster data");
        };
        // Inferno-only: no separate Inferno yard to bring monsters up from (the server has none either).
        if (!BASE.isMainYard || GLOBAL.INFERNO_ONLY) {
            return;
        }
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        loader = new URLLoaderApi();
        loader.load(GLOBAL._infBaseURL + "infernomonsters", [["type", "get"]], onLoad, onError);
    }

    private static numHealthyCreeps(param1: string, param2: any[]): int {
        let _loc3_: int = param2.length | 0;
        let _loc4_: int = CREATURES.GetProperty(param1, "health") | 0;
        let _loc5_: int = (_loc3_ - 1) | 0;
        while (_loc5_ >= 0) {
            if (param2[_loc5_].health < _loc4_) {
                _loc3_--;
            }
            _loc5_--;
        }
        return _loc3_;
    }

    public static PageAscensionData(): void {
        let result: any = null;
        let s: string = null;
        let loader: URLLoaderApi = null;
        let onLoad: Function = null;
        let onError: Function = null;
        let dif: int = 0;
        onLoad = (param1: any): void => {
            PLEASEWAIT.Hide();
            BASE.Save();
        };
        onError = (): void => {
            LOGGER.Log("err", "INFERNOPORTAL.PageAscensionData Could not save inferno monster changes");
            GLOBAL.ErrorMessage("INFERNOPORTAL.PageAscensionData Could not save inferno monster changes");
        };
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        result = {};
        if (MapRoomManager.instance.isInMapRoom3) {
            dif = 0;
            for (s in INFERNOPORTAL._ascensionData) {
                dif = 0;
                if (s.substr(0, 2) == "IC") {
                    INFERNOPORTAL.destroyCreep(s, (INFERNOPORTAL._ogAscensionData[s] - INFERNOPORTAL._ascensionData[s].Get()) | 0);
                }
            }
            result = INFERNOPORTAL._ogInfernoData;
        } else {
            for (s in INFERNOPORTAL._ascensionData) {
                if (s.substr(0, 2) == "IC" && INFERNOPORTAL._ascensionData[s].Get() > 0) {
                    result[s] = INFERNOPORTAL._ascensionData[s].Get() | 0;
                }
            }
        }
        INFERNOPORTAL._ascensionData = null;
        loader = new URLLoaderApi();
        loader.load(GLOBAL._infBaseURL + "infernomonsters", [["type", "set"], ["imonsters", JSON.stringify(result)]], onLoad, onError);
    }

    private static destroyCreep(param1: string, param2: int): void {
        let _loc5_: int = 0;
        let _loc3_: int = CREATURES.GetProperty(param1, "health") | 0;
        let _loc4_: int = 0;
        while (_loc4_ < param2) {
            _loc5_ = (INFERNOPORTAL._ogInfernoData[param1].length - 1) | 0;
            while (_loc5_ >= 0) {
                if (INFERNOPORTAL._ogInfernoData[param1][_loc5_].health == _loc3_) {
                    INFERNOPORTAL._ogInfernoData[param1].splice(_loc5_, 1);
                    break;
                }
                _loc5_--;
            }
            _loc4_++;
        }
    }

    public static ShowAscendMonstersDialog(): void {
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(INFERNOPORTAL._ascensionMc = new INFERNO_ASCENSION_POPUP());
        INFERNOPORTAL._ascensionMc.Center();
        INFERNOPORTAL._ascensionMc.ScaleUp();
    }

    public static HideAscendMonstersDialog(): void {
        if (INFERNOPORTAL._ascensionMc) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(INFERNOPORTAL._ascensionMc);
            INFERNOPORTAL._ascensionMc = null;
        }
    }

    public static EnterDescent(): void {
        MAPROOM_DESCENT.Setup(true);
    }

    public static ToggleYard(): void {
        let _loc1_: int = 0;
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL._toggleYardWaiting = 1;
            return;
        }
        MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
        if (BASE.isInfernoMainYardOrOutpost) {
            _loc1_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc1_);
        } else {
            BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
        }
    }

    public static AddPortal(param1: uint = 0): INFERNOPORTAL {
        let _loc2_: Point = new Point(-1200, -150);
        let _loc3_: Point = GRID.ToISO(_loc2_.x, _loc2_.y, 0);
        let _loc4_: INFERNOPORTAL = as3.as(BASE.addBuildingC(127), INFERNOPORTAL);
        INFERNOPORTAL.building = _loc4_;
        ++BASE._buildingCount;
        _loc4_.Setup({ "X": _loc2_.x, "Y": _loc2_.y, "t": 127, "id": BASE._buildingCount, "l": param1 });
        _loc4_.SetLevel(param1);
        return _loc4_;
    }

    public static isAboveMaxLevel(): boolean {
        return Boolean(INFERNOPORTAL.building) && INFERNOPORTAL.building._lvl.Get() >= INFERNOPORTAL.GetMaxLevel();
    }

    public override Click(param1: MouseEvent = null): void {
        if (INFERNOPORTAL.isAboveMaxLevel() && (BASE.isInfernoMainYardOrOutpost || GLOBAL.townHall && GLOBAL.townHall._lvl.Get() >= INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT)) {
            super.Click(param1);
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !INFERNO_EMERGENCE_EVENT.isAttackActive) {
            INFERNO_EMERGENCE_POPUPS.ShowRSVP(INFERNOPORTAL.building._lvl.Get() | 0);
        }
    }

    public SetLevel(param1: uint): void {
        param1 = Math.min(param1, Number(this._buildingProps.costs.length)) >>> 0;
        let _loc2_: int = this._lvl.Get() | 0;
        let _loc3_: uint = this._buildingProps.costs.length >>> 0;
        this.checkBuildingUnlocks();
        if (param1 == _loc2_) {
            return;
        }
        let _loc4_: int = (param1 - _loc2_) | 0;
        let _loc5_: int = 0;
        while (_loc5_ < _loc4_) {
            this.Upgraded();
            _loc5_++;
        }
        this.RenderClear();
        this.Update(true);
        this.Render();
    }

    private checkBuildingUnlocks(): void {
        if (INFERNOPORTAL.isAboveMaxLevel() && BASE.isMainYard) {
            GLOBAL._buildingProps[INFERNO_MAGMA_TOWER.ID - 1].block = false;
            GLOBAL._buildingProps[INFERNOQUAKETOWER.TYPE - 1].block = false;
            GLOBAL._buildingProps[SiegeFactory.ID - 1].block = false;
            GLOBAL._buildingProps[SiegeLab.ID - 1].block = false;
        }
    }

    public Hide(): void {
        this._mc.visible = false;
        this._mcBase.visible = false;
    }

    public Show(): void {
        this._mc.visible = true;
        this._mcBase.visible = true;
    }

    public override Export(): any {
        return false;
    }
}
