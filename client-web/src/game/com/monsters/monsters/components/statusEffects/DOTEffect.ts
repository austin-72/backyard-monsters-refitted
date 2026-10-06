import * as as3 from "as3";
import { int } from "as3";
import { CStatusEffect, MonsterBase, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

export class DOTEffect extends CStatusEffect {
    static {
        as3.fields(this, { _initialDPS: 0, _renewsPerAttack: 0, _numRenews: -1, _stacks: 1, _dotType: 0 });
    }

    public static readonly kDOTType_Stacks: int = 0;

    public static readonly kDOTType_Renews: int = 1;
    private _initialDPS: number;
    private _renewsPerAttack: int;
    private _numRenews: int;
    private _stacks: int;
    private _dotType: int;

    public $ctor(param1?: MonsterBase, param2: number = 0, param3: string = "venom", param4: int = 0, param5: int = -1): void {
        super.$ctor(param1);
        this._renewsPerAttack = this._numRenews = param5;
        this._initialDPS = this._dps = param2;
        SPRITES.SetupSprite(param3);
        this._icon = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(param3), SpriteData), 1);
        this._icon.play();
    }

    protected override updateDPS(param1: int): void {
        super.updateDPS(param1);
        if (this._numRenews > 0) {
            --this._numRenews;
        }
        if (!this._numRenews) {
            this.unregister();
        }
    }

    public override renew(): void {
        if (this._dotType == DOTEffect.kDOTType_Stacks) {
            ++this._stacks;
            this._dps = this._initialDPS * this._stacks;
        } else if (this._dotType == DOTEffect.kDOTType_Renews) {
            if (this._numRenews > -1) {
                this._numRenews += this._renewsPerAttack;
            }
        }
    }
}
