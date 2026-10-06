import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BFOUNDATION, GLOBAL, KEYS } from "@game";

export class PlannerNode extends ASObject {
    static {
        as3.fields(this, { x: NaN, y: NaN, id: 0, type: 0, level: 0, fortification: 0, building: null, props: null, shootrange: 0, category: null, categoryName: null, name: null, displayName: null, displayNameFull: null, stored: 0, order: 0, isSet: false });
    }

    public static readonly TYPE_DEFENSIVE: string = "defensive";

    public static readonly TYPE_BUILDING: string = "building";

    public static readonly TYPE_RESOURCE: string = "resource";

    public static readonly TYPE_DECORATION: string = "decoration";

    public static readonly TYPE_TRAP: string = "trap";

    public static readonly TYPE_WALL: string = "wall";

    public static readonly TYPE_MISC: string = "misc";

    protected static readonly MAX_TEXT_BEFORE_LEVEL: int = 16;
    public x: number;
    public y: number;
    public id: int;
    public type: int;
    public level: int;
    public fortification: int;
    public building: BFOUNDATION;
    public props: any;
    private shootrange: int;
    public category: string;
    public categoryName: string;
    public name: string;
    public displayName: string;
    public displayNameFull: string;
    public stored: int;
    public order: int;
    public isSet: boolean;

    public $ctor(param1?: BFOUNDATION, param2: number = 0, param3: number = 0, param4: int = 0): void {
        super.$ctor();
        this.building = param1;
        this.x = param2;
        this.y = param3;
        this.id = param1._id;
        this.type = param1._type;
        this.level = param1._lvl.Get() | 0;
        this.fortification = param1._fortification.Get() | 0;
        this.order = param4;
        this.shootrange = param1._range;
        this.name = KEYS.Get(as3.str(GLOBAL._buildingProps[this.type - 1].name));
        this.defineCategory(param1._type);
        if (this.category != PlannerNode.TYPE_DECORATION) {
            if (this.name.length > PlannerNode.MAX_TEXT_BEFORE_LEVEL && this.name.indexOf(" ") != this.name.lastIndexOf(" ")) {
                this.displayName = this.name.substr(0, this.name.lastIndexOf(" "));
            } else {
                this.displayName = this.name;
            }
            if (param1._buildingProps.type != "enemy") {
                this.displayName += " " + KEYS.Get("basePlanner_buildingLevel") + param1._lvl.Get();
            }
        } else {
            this.displayName = this.name;
        }
        this.displayNameFull = this.displayName;
        if (this.building._fortification.Get() > 0) {
            this.displayNameFull += " " + KEYS.Get("basePlanner_buildingFort") + " " + param1._fortification.Get();
        }
    }

    public place(param1: int, param2: int): void {
        this.x = param1;
        this.y = param2;
    }

    public store(): void {
        this.x;
        this.y;
        this.stored = 1;
    }

    public get range(): int {
        return this.shootrange;
    }

    public defineCategory(param1: int): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        this.props = GLOBAL._buildingProps[param1 - 1];
        if (!this.props) {
            return;
        }
        let _loc4_: int = this.props.group | 0;
        let _loc5_: string = String(this.props.type);
        switch (_loc4_) {
            case 1:
                _loc2_ = PlannerNode.TYPE_RESOURCE;
                _loc3_ = KEYS.Get("basePlanner_catResource");
                break;
            case 2:
                _loc2_ = PlannerNode.TYPE_BUILDING;
                _loc3_ = KEYS.Get("basePlanner_catBuilding");
                break;
            case 3:
                _loc2_ = PlannerNode.TYPE_DEFENSIVE;
                _loc3_ = KEYS.Get("basePlanner_catDefensive");
                if (_loc5_ == "wall") {
                    _loc2_ = PlannerNode.TYPE_WALL;
                    _loc3_ = KEYS.Get("basePlanner_catWall");
                } else if (_loc5_ == "trap") {
                    _loc2_ = PlannerNode.TYPE_TRAP;
                    _loc3_ = KEYS.Get("basePlanner_catTrap");
                }
                break;
            case 4:
                _loc2_ = PlannerNode.TYPE_DECORATION;
                _loc3_ = KEYS.Get("basePlanner_catDecoration");
                break;
            default:
                _loc2_ = PlannerNode.TYPE_MISC;
                _loc3_ = KEYS.Get("basePlanner_catMisc");
        }
        this.categoryName = _loc3_;
        this.category = _loc2_;
    }
}
