import * as as3 from "as3";
import { CStatusEffect, MonsterBase, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

export class AcidStatusEffect extends CStatusEffect {
    public $ctor(param1?: MonsterBase, param2?: number): void {
        super.$ctor(param1);
        this._dps = param2;
        SPRITES.SetupSprite("venomBal");
        this._icon = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor("venomBal"), SpriteData), 1);
        this._icon.play();
    }
}
