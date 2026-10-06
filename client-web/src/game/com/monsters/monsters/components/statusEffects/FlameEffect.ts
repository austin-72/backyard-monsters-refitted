import * as as3 from "as3";
import { CStatusEffect, MonsterBase, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

export class FlameEffect extends CStatusEffect {
    public $ctor(param1?: MonsterBase, param2: number = 25): void {
        super.$ctor(param1);
        this._dps = param2;
        SPRITES.SetupSprite("flame");
        this._icon = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor("flame"), SpriteData), 1);
        this._icon.play();
    }
}
