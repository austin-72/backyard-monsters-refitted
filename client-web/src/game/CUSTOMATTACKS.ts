import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING27, CREEPS, CreepBase, GLOBAL, GRID, MAP, MONSTERBAITER, MonsterBase, SOUNDS, UI2, WMATTACK } from "@game";

export class CUSTOMATTACKS extends ASObject {
    public static _history: any = null;

    public static _inProgress: boolean = false;

    public static _lastClick: int = 0;

    public static _started: boolean = false;

    public static _isAI: boolean = false;

    public static _attacks: any[] = [8000, 18800, 43240, 97290, 214038, 460182, 966382, 1981082, 3962164, 7726221, 14679819, 27157666, 48883798, 85546647, 145429299, 189058089, 245775516, 319508170, 415360622, 539968808, 701959450, 912547286, 1186311471, 1542204913, 2004866386, 2606326302, 3388224193, 4404691451, 5726098886, 7443928552, 9677107118, 12580239253, 16354311030, 21260604338, 27638785640, 35930421332, 46709547731, 60722412051];

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        CUSTOMATTACKS._started = false;
    }

    public static TrojanHorse(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: Point = null;
        let _loc4_: BFOUNDATION = null;
        if (!BUILDING27._exists && !BASE.isInfernoMainYardOrOutpost) {
            _loc1_ = GLOBAL._mapHeight;
            _loc2_ = (-800 - (GLOBAL._mapHeight - 800) / 2) | 0;
            _loc3_ = GRID.ToISO(-70, _loc2_, 0);
            _loc4_ = BASE.addBuildingC(27);
            ++BASE._buildingCount;
            _loc4_.Setup({ "t": 27, "X": -70, "Y": _loc2_, "id": BASE._buildingCount });
            MAP.FocusTo(_loc3_.x | 0, _loc3_.y | 0, 2);
            BASE.Save(0, false, true);
        }
    }

    public static CustomAttack(param1: any[], param2: boolean = false): any[] {
        CUSTOMATTACKS._started = true;
        WMATTACK._isAI = false;
        WMATTACK.AttackB();
        UI2.Show("scareAway");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", MONSTERBAITER.End);
        }
        let _loc3_: any[] = WMATTACK.SpawnA(param1);
        let _loc4_: MonsterBase = as3.cast(_loc3_[0][0], MonsterBase);
        MAP.FocusTo(_loc4_.x | 0, _loc4_.y | 0, 2);
        return _loc3_;
    }

    public static WMIAttack(param1: any[]): any[] {
        CUSTOMATTACKS._started = true;
        WMATTACK._isAI = false;
        WMATTACK.AttackB();
        UI2.Show("scareAway");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", MONSTERBAITER.End);
        }
        return WMATTACK.SpawnA(param1);
    }

    public static TutorialAttack(): void {
        let _loc1_: any[] = null;
        let _loc2_: any = undefined;
        let _loc3_: int = 0;
        let _loc4_: CreepBase = null;
        CUSTOMATTACKS._started = true;
        _loc1_ = WMATTACK.SpawnA([["C2", "bounce", 1, 180, -10, 0, 1]]);
        _loc1_ = WMATTACK.SpawnA([["C2", "bounce", 2, 190, -5, 0, 1]]);
        _loc1_ = WMATTACK.SpawnA([["C2", "bounce", 2, 190, 10, 0, 1]]);
        _loc1_ = WMATTACK.SpawnA([["C2", "bounce", 1, 250, 5, 0, 1]]);
        _loc1_ = WMATTACK.SpawnA([["C2", "bounce", 2, 190, 0, 0, 1]]);
        _loc2_ = _loc1_[0][0];
        _loc3_ = Point.distance(new Point(GLOBAL._bTower.x, GLOBAL._bTower.y), new Point(_loc2_.x, _loc2_.y)) | 0;
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicipanic");
        } else {
            SOUNDS.PlayMusic("musicpanic");
        }
        WMATTACK.AttackB();
        WMATTACK.AttackC();
        MAP.FocusTo(GLOBAL._bTower.x | 0, GLOBAL._bTower.y | 0, (_loc3_ / 100) | 0, 0, 0, false);
        for (_loc4_ of as3.values(CREEPS._creeps)) {
            _loc4_.maxHealthProperty.value = 1;
            _loc4_.setHealth(1);
        }
        WMATTACK._isAI = false;
        WMATTACK._inProgress = true;
    }
}
