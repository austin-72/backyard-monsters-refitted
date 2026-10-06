import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, EFFECTS, GLOBAL, IAttackable, KEYS, POPUPS, SOUNDS, SecNum, Vacuum, popup_building } from "@game";

export class BUILDING23 extends BTOWER {
    static {
        as3.fields(this, { _animMC: null, _animFrame: 0, _field: null, _fieldBMP: null, _animBitmap: null, _blend: 0, _blending: false, _bank: null });
    }

    public static readonly TYPE: uint = 23;
    public _animMC: MovieClip;
    public _animFrame: int;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _animBitmap: BitmapData;
    public _blend: int;
    public _blending: boolean;
    public _bank: SecNum;

    public $ctor(): void {
        super.$ctor();
        this._type = 23;
        this._frameNumber = 0;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this._spoutPoint = new Point(0, 0);
        this._spoutHeight = 30;
        this._top = -30;
        this.SetProps();
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        SOUNDS.Play("laser", !this.isJard ? 0.8 : 0.4);
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * 25 * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 25 * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else if (this._targetVacuum) {
            EFFECTS.Laser(this.x | 0, (this.y + 35) | 0, GLOBAL.townHall.x | 0, (GLOBAL.townHall.y - GLOBAL.townHall._mc.height * 2) | 0, 60, (this.damage * 25 * _loc2_ * _loc3_) | 0, 0);
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 25 * _loc2_ * _loc3_) | 0);
            Vacuum.getHose().modifyHealth(-((this.damage * 25 * _loc2_ * _loc3_) | 0));
        } else {
            EFFECTS.Laser(this.x | 0, (this.y + 35) | 0, param1.x | 0, param1.y | 0, 60, (this.damage * _loc2_ * _loc3_) | 0, this._splash, as3.bind(this, this.Track));
        }
    }

    public Track(param1: int): void {
        if (param1 < 0) {
            param1 = (360 + param1) | 0;
        }
        param1 = (param1 / 6.66) | 0;
        this._animTick = param1;
        this.AnimFrame();
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && !GLOBAL._catchup && this._animBMD != null && this._animContainerBMD != null) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
        ++this._frameNumber;
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-lt", KEYS.Get("pop_laserbuilt_streamtitle"), KEYS.Get("pop_laserbuilt_streambody"), "build-lasertower.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_laserbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_laserbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }
}
