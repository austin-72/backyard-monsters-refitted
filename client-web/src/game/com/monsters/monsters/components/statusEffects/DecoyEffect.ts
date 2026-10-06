import * as as3 from "as3";
import { CStatusEffect, MonsterBase, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

export class DecoyEffect extends CStatusEffect {
    public $ctor(param1?: MonsterBase): void {
        super.$ctor(param1);
        this._dps = 0;
        SPRITES.SetupSprite("heart");
        this._icon = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor("heart"), SpriteData), 1);
        this._icon.play();
    }
}
