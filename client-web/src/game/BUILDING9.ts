import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ACHIEVEMENTS, BASE, BFOUNDATION, CREATURES, GIBLETS, GLOBAL, IoQuests, KEYS, POPUPS, QUESTS, ResourcePackages, SOUNDS, popup_building } from "@game";

export class BUILDING9 extends BFOUNDATION {
    static {
        as3.fields(this, { _animMC: null, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null, _blend: 0, _blending: false, _lastType: 0, _guardian: 0 });
    }

    public static readonly TYPE: uint = 9;
    public _animMC: MovieClip;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;
    public _blend: int;
    public _blending: boolean;
    private _lastType: int;
    public _guardian: int;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = 9;
        this._blend = 0;
        this._footprint = [new Rectangle(0, 0, 80, 80)];
        this._gridCost = [[new Rectangle(0, 0, 80, 80), 50]];
        this._spoutPoint = new Point(0, 12);
        this._spoutHeight = 28;
        this.SetProps();
    }

    public Prep(param1: string): void {
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.juiced(param1);
        }
        ++QUESTS._global.monstersblended;
        QUESTS._global.monstersblendedgoo += Math.ceil(CREATURES.GetProperty(param1, "cResource") * 0.7);
        ACHIEVEMENTS.Check("monstersblended", QUESTS._global.monstersblended | 0);
        QUESTS.Check();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            BASE.Save();
        }
    }

    public Blend(param1: int, param2: string, param3: number = 1): void {
        // Inferno-only: Rezghul (C19) is an Inferno monster here, so his juice flies as magma, not goo
        let _loc4_: any = param2.substr(0, 2) == "IC" || GLOBAL.INFERNO_ONLY && BASE.isInfernoCreep(param2);
        this._blend += param1;
        let _loc5_: number = 0.6;
        if (this._lvl.Get() == 2) {
            _loc5_ = 0.8;
        } else if (this._lvl.Get() == 3) {
            _loc5_ = 1;
        }
        this._guardian = 0;
        BASE.Fund(4, Math.ceil(CREATURES.GetProperty(param2, "cResource") * _loc5_ * param3), false, null, param2.substr(0, 1) == "I" && !BASE.isInfernoMainYardOrOutpost);
        this._lastType = _loc4_ ? 8 : 4;
        ResourcePackages.Create(this._lastType, this, Math.ceil(CREATURES.GetProperty(param2, "cResource") * _loc5_) | 0);
    }

    public BlendGuardian(param1: int): void {
        this._blend += param1;
        this._guardian = 1;
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (this._animLoaded && !GLOBAL._catchup && (this._blend > 0 || this._animTick > 2) && this._frameNumber % 2 == 0) {
            this.AnimFrame();
            if (this._animTick == 1) {
                SOUNDS.Play("juice");
            }
            if (this._animTick == 15) {
                this._blend = 0;
                if (!this._guardian) {
                    ResourcePackages.Create(this._lastType, this, 1);
                }
            }
            if (this._animTick == 52) {
                this._animTick = 0;
            }
        }
        ++this._frameNumber;
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animContainerBMD) {
            this._animContainerBMD.copyPixels(this._animBMD, new Rectangle(60 * this._animTick, 0, 60, 39), new Point(0, 0));
        }
        ++this._animTick;
        let _loc2_: int = this._blend;
        if (_loc2_ > 70) {
            _loc2_ = 70;
        }
        if (this._lvl.Get() == 2) {
            _loc2_ = (_loc2_ * 1.2) | 0;
        } else if (this._lvl.Get() == 3) {
            _loc2_ = (_loc2_ * 1.4) | 0;
        }
        if (this._animTick == 15) {
            if (this._guardian == 0) {
                GIBLETS.Create(this._spoutPoint.add(new Point(this._mc.x, this._mc.y)), 0.8, 100, _loc2_, this._spoutHeight);
            } else {
                GIBLETS.Create(this._spoutPoint.add(new Point(this._mc.x, this._mc.y)), 2, 1000, _loc2_, this._spoutHeight);
            }
        }
    }

    public override Description(): void {
        super.Description();
        if (this._lvl.Get() == 1) {
            if (this._upgradeCosts != "") {
                this._upgradeDescription = KEYS.Get("building_juicer_conversion", { "v1": 60, "v2": 80 });
            }
        } else if (this._lvl.Get() == 2) {
            if (this._upgradeCosts != "") {
                this._upgradeDescription = KEYS.Get("building_juicer_conversion", { "v1": 80, "v2": 100 });
            }
        }
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bJuicer = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-mjl", KEYS.Get("pop_juicerbuilt_streamtitle"), KEYS.Get("pop_juicerbuilt_streambody"), "build-monsterjuiceloosener.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_juicerbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_juicerbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let percent: int = 0;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-fl-" + this._lvl.Get(), KEYS.Get("pop_juicerupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_juicerupgraded_streambody"), "upgrade-monsterjuiceloosener.png"]);
                POPUPS.Next();
            };
            percent = 60;
            if (this._lvl.Get() == 2) {
                percent = 80;
            }
            if (this._lvl.Get() == 3) {
                percent = 100;
            }
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_juicerupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_juicerupgraded_body", { "v1": this._lvl.Get(), "v2": percent });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override RecycleC(): void {
        GLOBAL._bJuicer = null;
        super.RecycleC();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0) {
            GLOBAL._bJuicer = this;
        }
        if (param1.tjc) {
            QUESTS._global.monstersblended = param1.tjc;
        }
        if (param1.tjg) {
            QUESTS._global.monstersblendedgoo = param1.tjg;
        }
        this._animRandomStart = false;
        this._animTick = 2;
    }

    public override Export(): any {
        return super.Export();
    }
}
