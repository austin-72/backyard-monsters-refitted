import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData } from "flash/display";
import { Dictionary } from "flash/utils";
import { SPRITES, SingletonLock } from "@game";

export class CreepSkinManager extends ASObject {
    static {
        as3.fields(this, { m_CreepSkinPairs: null });
    }

    private static s_Instance: CreepSkinManager = null;
    private m_CreepSkinPairs: Dictionary;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
        CreepSkinManager.s_Instance = this;
        this.m_CreepSkinPairs = new Dictionary();
    }

    public static get instance(): CreepSkinManager {
        return !(!CreepSkinManager.s_Instance) ? CreepSkinManager.s_Instance : new CreepSkinManager(new SingletonLock());
    }

    public SetupSkins(param1: string): void {
        SPRITES.SetupSprite(param1);
        if (this.m_CreepSkinPairs.get(param1) != null) {
            SPRITES.SetupSprite(as3.str(this.m_CreepSkinPairs.get(param1)));
        }
    }

    public SetSkin(param1: string, param2: string): void {
        if (param2 != null) {
            SPRITES.SetupSprite(param2);
        }
        this.m_CreepSkinPairs.set(param1, param2);
    }

    public GetSprite(param1: BitmapData, param2: string, param3: string, param4: int, param5: int = 0, param6: int = -1, param7: string = null): int {
        let _loc8_: string = !(!param7) ? param7 : (!(!this.m_CreepSkinPairs.get(param2)) ? String(this.m_CreepSkinPairs.get(param2)) : param2);
        return SPRITES.GetSprite(param1, _loc8_, param3, param4, param5, param6);
    }
}
