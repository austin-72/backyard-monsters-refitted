import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, EnumYardType, GLOBAL, KEYS, MapRoom3Tutorial, TUTORIAL, popup_outpost_secured } from "@game";

export class MapRoom3OutpostSecured extends popup_outpost_secured {
    static {
        as3.fields(this, { m_nCellType: 0 });
    }

    protected m_nCellType: int;

    public $ctor(param1?: int, param2?: any): void {
        super.$ctor();
        this.setup(param1, param2);
    }

    public setup(param1: int, param2: any): void {
        this.m_nCellType = param1;
        switch (this.m_nCellType) {
            case EnumYardType.RESOURCE:
                this.tfTitle.htmlText = KEYS.Get("ro_taken_title");
                this.tfBody.htmlText = KEYS.Get("ro_taken_desc", { "v1": param2.level, "v2": GLOBAL.FormatNumber(param2.productionRate * 60), "v3": GLOBAL.FormatNumber(Number(param2.capacity)), "v4": param2.range });
                break;
            case EnumYardType.STRONGHOLD:
                this.tfTitle.htmlText = KEYS.Get("sh_taken_title");
                this.tfBody.htmlText = KEYS.Get("sh_taken_desc", { "v1": param2.level, "v2": param2.monsterBonus, "v3": param2.towerBonus, "v4": param2.range });
                break;
            case EnumYardType.PLAYER:
                break;
            case EnumYardType.FORTIFICATION:
                if (param2.fortified) {
                    this.tfTitle.htmlText = KEYS.Get("opd_controlled_taken_title");
                    this.tfBody.htmlText = KEYS.Get("opd_controled_taken_desc", { "v1": this.getAdjacentCellCopy(param2.fortified | 0) });
                } else {
                    this.tfTitle.htmlText = KEYS.Get("opd_notcontrolled_taken_title");
                    this.tfBody.htmlText = KEYS.Get("opd_notcontroled_taken_desc", { "v1": this.getAdjacentCellCopy(param2.weakened | 0) });
                }
        }
        if (TUTORIAL._stage < 120) {
            TUTORIAL._stage = 120;
        }
        if (TUTORIAL._stage > 120) {
            this.mcEnter.addEventListener(MouseEvent.CLICK, as3.bind(this, this.enterOutpost), false, 0, true);
        }
        this.mcMap.addEventListener(MouseEvent.CLICK, as3.bind(this, this.openMap), false, 0, true);
        if (TUTORIAL._stage > 120) {
            this.mcEnter.SetupKey("btn_enteroutpost");
        } else {
            this.mcEnter.visible = this.mcEnter.enabled = this.mcEnter.Enabled = false;
        }
        if (TUTORIAL._stage > 120) {
            this.mcMap.SetupKey("btn_openmap");
        } else {
            this.mcMap.SetupKey("btn_returnhome");
        }
        this.mcFrame.Setup(false);
    }

    private openMap(param1: MouseEvent): void {
        if (TUTORIAL._stage > 120) {
            GLOBAL.ShowMap();
        } else {
            MapRoom3Tutorial.instance.advance();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        }
    }

    private enterOutpost(param1: MouseEvent): void {
        let _loc2_: int = 0;
        BASE.LoadBase(null, 0, BASE._baseID, GLOBAL.e_BASE_MODE.BUILD, false, this.m_nCellType, _loc2_);
    }

    private getAdjacentCellCopy(param1: int): string {
        switch (param1) {
            case EnumYardType.RESOURCE:
                return KEYS.Get("nwm_resource");
            case EnumYardType.STRONGHOLD:
                return KEYS.Get("nwm_stronghold");
            case EnumYardType.PLAYER:
                return KEYS.Get("nwm_mainyard");
            default:
                return "cell";
        }
    }
}
