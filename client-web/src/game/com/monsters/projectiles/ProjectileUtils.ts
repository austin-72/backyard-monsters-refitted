import { ASObject, uint } from "as3";
import { BitmapData, MovieClip } from "flash/display";
import { GlowFilter } from "flash/filters";
import { FIREBALL_CLIP, MovieClipUtils } from "@game";

export class ProjectileUtils extends ASObject {
    public static readonly k_fireballSpeed: uint = 6;

    public static readonly k_healballSpeed: uint = 25;

    public $ctor(): void {
        super.$ctor();
    }

    public static getFireballBitmapData(): BitmapData {
        let _loc1_: MovieClip = new FIREBALL_CLIP();
        _loc1_.scaleX = 2;
        _loc1_.scaleY = 2;
        _loc1_.stop();
        _loc1_.filters = [new GlowFilter(16748544, 1, 12, 12, 6, 1, false, false)];
        return MovieClipUtils.getBitmapDataFromDisplayObject(_loc1_);
    }

    public static getHealballBitmapData(): BitmapData {
        let _loc1_: MovieClip = null;
        _loc1_ = new FIREBALL_CLIP();
        _loc1_.gotoAndStop(2);
        _loc1_.scaleX = 2;
        _loc1_.scaleY = 2;
        return MovieClipUtils.getBitmapDataFromDisplayObject(_loc1_);
    }

    public static getFomorballBitmapData(): BitmapData {
        let _loc1_: MovieClip = null;
        _loc1_ = new FIREBALL_CLIP();
        _loc1_.gotoAndStop(3);
        _loc1_.scaleX = 2;
        _loc1_.scaleY = 2;
        return MovieClipUtils.getBitmapDataFromDisplayObject(_loc1_);
    }
}
