import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, HatcheryMonsterIcon_CLIP } from "@game";

export class HousingPersistentMonsterBar_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "HousingPersistentMonsterBar_CLIP" });
        as3.fields(this, { tName: null, bFinish: null, bCancel: null, tCapacityText: null, bJuice: null, m_capacityBar: null, tHealStatusText: null, bHeal: null, m_shine: null, mcIcon: null, m_healthBar: null });
    }

    public tName: TextField;
    public bFinish: Button_CLIP;
    public bCancel: Button_CLIP;
    public tCapacityText: TextField;
    public bJuice: Button_CLIP;
    public m_capacityBar: MovieClip;
    public tHealStatusText: TextField;
    public bHeal: Button_CLIP;
    public m_shine: MovieClip;
    public mcIcon: HatcheryMonsterIcon_CLIP;
    public m_healthBar: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}
