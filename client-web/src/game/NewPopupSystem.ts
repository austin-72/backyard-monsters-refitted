import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BASE, EnumYardType, GLOBAL, MapRoomManager, POPUPS, PopupMigrate } from "@game";

export class NewPopupSystem extends ASObject {
    static {
        as3.fields(this, { _popupStates: null, _actualIds: null, _timeOfLastDialog: 0, _dialogShownInSession: false, _dialogShowing: false, _requirements: null });
    }

    public static instance: NewPopupSystem; // const

    static {
        as3.lazyStatics(this, { instance: null }, () => {
            NewPopupSystem.instance = new NewPopupSystem();
        });
    }
    private _popupStates: any;
    private _actualIds: any;
    private _timeOfLastDialog: int;
    private _dialogShownInSession: boolean;
    private _dialogShowing: boolean;
    private _requirements: Vector<RequireData>;

    public $ctor(): void {
        super.$ctor();
    }

    public static get dialogShowing(): boolean {
        return NewPopupSystem.instance._dialogShowing;
    }

    public createPopupData(): any[] {
        return [{ "id": "mr2_reminder2", "displayFn": (param1: string): void => {
            let id: string = null;
            id = param1;
            PopupMigrate.Show((): void => {
                NewPopupSystem.instance.ConfirmDialog(id);
            });
        }, "requirements": [{ "yardType": EnumYardType.MAIN_YARD, "minTownHallLevel": 6, "maxMapRoomLevel": 1, "minTimeBetweenDisplays": 5 * 24 * 60 * 60, "requirementsFn": (param1: string): boolean => {
            return Boolean(GLOBAL._bMap);
        } }] }];
    }

    public ConfirmDialog(param1: string): void {
        if (!this._popupStates[param1]) {
            this._popupStates[param1] = { "count": 0 };
        }
        ++this._popupStates[param1].count;
        this._dialogShowing = false;
        POPUPS.Next();
    }

    public IgnoreDialog(param1: string): void {
        this._dialogShowing = false;
        POPUPS.Next();
    }

    public Setup(param1: any): void {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: RequireData = null;
        let _loc7_: string = null;
        this._popupStates = !(!param1) ? param1.popupStates || {} : {};
        this._timeOfLastDialog = !(!param1) ? param1.lastDialog | 0 || 0 : 0;
        this._requirements = new Vector<RequireData>(0, false, RequireData);
        this._dialogShowing = false;
        this._actualIds = {};
        let _loc2_: any[] = this.createPopupData();
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            _loc4_ = _loc2_[_loc3_];
            this._actualIds[_loc4_.id] = true;
            if (!(Boolean(this._popupStates[_loc4_.id]) && this._popupStates[_loc4_.id].count > 0)) {
                for (_loc5_ of as3.values(_loc4_.requirements)) {
                    (_loc6_ = new RequireData()).id = as3.str(_loc4_.id);
                    _loc6_.displayFn = _loc4_.displayFn;
                    _loc6_.requireFn = as3.bind(this, this.coreRequirements);
                    if (_loc4_.startupOnly != null) {
                        _loc6_.startupOnly = Boolean(_loc4_.startupOnly);
                        delete _loc4_.startupOnly;
                    }
                    for (_loc7_ in _loc5_) {
                        _loc6_.requireFn = this.getRequirementsFn(_loc7_, _loc5_[_loc7_], _loc6_.requireFn);
                    }
                    this._requirements.push(_loc6_);
                }
            }
            _loc3_++;
        }
        this._requirements.fixed = true;
    }

    public getRequirementsFn(param1: string, param2: any, param3: Function): Function {
        let value: any = null;
        let nextFn: Function = null;
        let requireId: string = param1;
        value = param2;
        nextFn = param3;
        switch (requireId) {
            case "minTimeBetweenDialogs":
                return (param1: string): boolean => {
                    return as3.as(value, Number) <= GLOBAL.Timestamp() - this._timeOfLastDialog && Boolean(nextFn(param1));
                };
            case "minSessionTimeBetweenDialogs":
                return (param1: string): boolean => {
                    return as3.as(value, Number) <= GLOBAL.Timestamp() - this._timeOfLastDialog && this._dialogShownInSession && Boolean(nextFn(param1));
                };
            case "yardType":
                return (param1: string): boolean => {
                    return BASE.yardType == value && Boolean(nextFn(param1));
                };
            case "maxMapRoomLevel":
                return (param1: string): boolean => {
                    return (as3.as(value, Number) < 2 ? !MapRoomManager.instance.isInMapRoom2 : true) && Boolean(nextFn(param1));
                };
            case "minTownHallLevel":
                return (param1: string): boolean => {
                    return Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= (as3.as(value, Number)) && Boolean(nextFn(param1));
                };
            case "minTimeBetweenDisplays":
                return (param1: string): boolean => {
                    return Boolean(this._popupStates[param1]) && as3.as(value, Number) > GLOBAL.Timestamp() - this._popupStates[param1].shown && Boolean(nextFn(param1));
                };
            case "never":
                return (param1: string): boolean => {
                    return false;
                };
            case "requirementsFn":
                return (param1: string): boolean => {
                    return Boolean((as3.as(value, Function))(param1) && Boolean(nextFn(param1)));
                };
            default:
                throw new Error("Requirement id \"" + requireId + "\" not found");
        }
    }

    private coreRequirements(param1: string): boolean {
        if (POPUPS._open || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return false;
        }
        if (Boolean(this._popupStates[param1]) && this._popupStates[param1].count > 0) {
            return false;
        }
        return true;
    }

    public Export(): any {
        let _loc2_: string = null;
        let _loc1_: any = {};
        for (_loc2_ in this._actualIds) {
            if (this._popupStates[_loc2_]) {
                _loc1_[_loc2_] = { "count": this._popupStates[_loc2_].count || 0, "shown": this._popupStates[_loc2_].shown || null };
            }
        }
        return { "popupStates": _loc1_, "lastDialog": this._timeOfLastDialog };
    }

    public CheckAll(param1: boolean = false): boolean {
        let _loc4_: RequireData = null;
        let _loc2_: Vector<RequireData> = new Vector<RequireData>(0, false, RequireData);
        let _loc3_: int = 0;
        while (_loc3_ < this._requirements.length) {
            if ((_loc4_ = as3.vget(this._requirements, _loc3_)).requireFn(_loc3_) && (!param1 || !_loc4_.startupOnly)) {
                _loc2_.push(_loc4_);
            }
            _loc3_++;
        }
        if (_loc2_.length > 0) {
            this._dialogShownInSession = true;
            this._dialogShowing = false;
            if (!this._popupStates[as3.vget(_loc2_, 0).id]) {
                this._popupStates[as3.vget(_loc2_, 0).id] = {};
            }
            this._popupStates[as3.vget(_loc2_, 0).id].shown = GLOBAL.Timestamp();
            as3.vget(_loc2_, 0).displayFn(as3.vget(_loc2_, 0).id);
            return true;
        }
        return false;
    }
}

class RequireData extends ASObject {
    static {
        as3.fields(this, { id: null, displayFn: null, requireFn: null, startupOnly: false });
    }

    public id: string;
    public displayFn: Function;
    public requireFn: Function;
    public startupOnly: boolean;

    public $ctor(): void {
        super.$ctor();
    }
}
