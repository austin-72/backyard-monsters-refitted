import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, CreepBase, GLOBAL, HOUSING, KEYS, MapRoomManager, POPUPS, popup_building } from "@game";

export class BUILDING15 extends BFOUNDATION {
    static {
        as3.fields(this, { _capacity: 0, _space: 0, _housing: null });
    }

    public _capacity: int;
    public _space: int;
    public _housing: any;

    public $ctor(): void {
        super.$ctor();
        this._type = 15;
        this._capacity = 0;
        this._housing = {};
        this._footprint = [new Rectangle(0, 0, 160, 160)];
        this._gridCost = [[new Rectangle(10, 10, 140, 20), 400], [new Rectangle(130, 30, 20, 120), 400], [new Rectangle(10, 30, 20, 120), 400], [new Rectangle(30, 130, 30, 20), 400], [new Rectangle(100, 130, 30, 20), 400]];
        this.SetProps();
    }

    public override StopMoveB(): void {
        super.StopMoveB();
        this.UpdateHousedCreatureTargets();
    }

    public override Description(): void {
        super.Description();
        let effectiveLevel: int = this.getEffectiveLevel();
        this._upgradeDescription = KEYS.Get("bdg_housing_capacitydesc", { "v1": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[effectiveLevel - 1])), "v2": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[effectiveLevel])) });
        if (this._recycleCosts != null) {
            this._recycleDescription = "<b>" + KEYS.Get("bdg_housing_recycledesc") + "</b><br>" + this._recycleCosts;
        }
        HOUSING.HousingSpace();
        if (BASE.isMainYardOrInfernoMainYard) {
            this._blockRecycle = false;
        }
        let _loc1_: int = HOUSING._housingSpace.Get() | 0;
        let _loc2_: int = this._buildingProps.capacity[effectiveLevel - 1] | 0;
        if (HOUSING._housingSpace.Get() - this._buildingProps.capacity[effectiveLevel - 1] < 0) {
            this._recycleDescription = "<font color=\"#CC0000\">" + KEYS.Get("bdg_housing_recyclewarning") + "</font>";
            this._blockRecycle = true;
        }
    }

    public override Constructed(): void {
        super.Constructed();
        HOUSING.AddHouse(this);
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        HOUSING.HousingSpace();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-ho-" + this._lvl.Get(), KEYS.Get("pop_housingupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_housingupgraded_streambody"), "upgrade-housing.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_housingupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_housingupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Tick(param1: int): void {
        super.Tick(param1);
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override RecycleC(): void {
        super.RecycleC();
        HOUSING.HousingSpace();
        HOUSING.RemoveHouse(this);
        this.RelocateHousedCreatures();
    }

    public override Destroyed(param1: boolean = true): void {
        let _loc3_: CreepBase = null;
        super.Destroyed(param1);
        let _loc2_: boolean = MapRoomManager.instance.isInMapRoom3;
        let _loc4_: int = 0;
        while (_loc4_ < this._creatures.length) {
            this._creatures[_loc4_].setHealth(_loc2_ ? this._creatures[_loc4_].health * 0.5 : 0);
            _loc4_++;
        }
        if (!MapRoomManager.instance.isInMapRoom3) {
            HOUSING.Cull();
            HOUSING.RemoveHouse(this);
        }
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this.m_isCleared) {
            return;
        }
        if (this.health > 10 && this.health < this.maxHealth && this.health % 1000 == 0) {
            this.setHealth(this.maxHealth);
        }
        if (this._countdownBuild.Get() == 0) {
            HOUSING.AddHouse(this);
        }
    }
}
