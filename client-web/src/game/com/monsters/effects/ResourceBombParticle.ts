import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable, MovieClip } from "flash/display";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BYMConfig, GLOBAL, MAP, RasterData, ResourceBomb, ResourceBombs, Sine, TweenLite } from "@game";

export class ResourceBombParticle extends ASObject {
    static {
        as3.fields(this, { mc: null, container: null, bmd_frame: null, mctop: null, mcbottom: null, animframe: 0, variation: 0, m_position: null, m_bomb: null, m_id: null, m_resourceId: 0, m_rasterData: null, m_rasterPt: null, m_cleared: false });
    }

    public static readonly k_TYPE_TWIGS: uint = 1;

    public static readonly k_TYPE_PEBBLE: uint = 2;

    public static readonly k_TYPE_PUTTY: uint = 3;
    private mc: DisplayObject;
    private container: MovieClip;
    private bmd_frame: BitmapData;
    private mctop: MovieClip;
    private mcbottom: MovieClip;
    private animframe: int;
    private variation: int;
    private m_position: Point;
    private m_bomb: ResourceBomb;
    private m_id: string;
    private m_resourceId: int;
    private m_rasterData: RasterData;
    private m_rasterPt: Point;
    private m_cleared: boolean;

    public $ctor(param1?: MovieClip, param2?: MovieClip, param3?: Point, param4?: ResourceBomb, param5?: string, param6?: int, param7?: int): void {
        super.$ctor();
        this.mctop = param1;
        this.mcbottom = param2;
        this.m_position = param3;
        this.m_bomb = param4;
        this.m_id = param5;
        this.m_resourceId = param7;
        this.m_cleared = false;
        let _loc8_: Point = new Point();
        switch (this.m_resourceId) {
            case ResourceBombParticle.k_TYPE_TWIGS:
                this.variation = (Math.random() * 5) | 0;
                this.bmd_frame = new BitmapData(24, 30, true, 16777215);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_twigs, new Rectangle(24 * this.variation, 0, 24, 30), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mctop.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.mc = new Bitmap(this.bmd_frame);
                }
                _loc8_.x = -12;
                _loc8_.y = -15;
                break;
            case ResourceBombParticle.k_TYPE_PEBBLE:
                this.variation = (Math.random() * 18) | 0;
                this.bmd_frame = new BitmapData(27, 17, true, 16777215);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_pebble, new Rectangle(27 * this.variation, 0, 27, 17), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mctop.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.mc = new Bitmap(this.bmd_frame);
                }
                _loc8_.x = -40;
                _loc8_.y = -42;
                break;
            case ResourceBombParticle.k_TYPE_PUTTY:
                this.bmd_frame = new BitmapData(81, 52, true, 16777215);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_putty, new Rectangle(0, 0, 81, 52), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mctop.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.mc = new Bitmap(this.bmd_frame);
                }
                _loc8_.x = -40;
                _loc8_.y = -26;
        }
        this.mc.x = param3.x + 100 + _loc8_.x;
        this.mc.y = param3.y - GLOBAL.StageHeight + _loc8_.y;
        if (!BYMConfig.instance.RENDERER_ON) {
            this.mc.cacheAsBitmap = true;
        } else {
            this.m_rasterPt = new Point(this.mc.x - MAP.instance.offset.x + this.mctop.x, this.mc.y - MAP.instance.offset.y + this.mctop.y);
            this.m_rasterData = new RasterData(as3.cast(this.bmd_frame, IBitmapDrawable), this.m_rasterPt, int.MAX_VALUE);
            this.m_rasterData.visible = false;
        }
        this.mc.visible = false;
        if (!BYMConfig.instance.RENDERER_ON) {
            if (param7 == ResourceBombParticle.k_TYPE_PUTTY) {
                TweenLite.to(this.mc, 0.3 + Math.random() * 0.5, { "delay": 1, "x": param3.x, "y": param3.y, "onStart": as3.bind(this, this.Add), "onComplete": as3.bind(this, this.Hit), "ease": Sine.easeIn });
            } else {
                TweenLite.to(this.mc, 0.3 + Math.random() * 0.5, { "delay": 1 + Math.random() * (param6 * 2), "x": param3.x, "y": param3.y, "onStart": as3.bind(this, this.Add), "onComplete": as3.bind(this, this.Hit), "ease": Sine.easeIn });
            }
        } else if (param7 == ResourceBombParticle.k_TYPE_PUTTY) {
            TweenLite.to(this.m_rasterPt, 0.3 + Math.random() * 0.5, { "delay": 1, "x": param3.x - MAP.instance.offset.x + this.mctop.x, "y": param3.y - MAP.instance.offset.y + this.mctop.y, "onStart": as3.bind(this, this.Add), "onComplete": as3.bind(this, this.Hit), "ease": Sine.easeIn });
        } else {
            TweenLite.to(this.m_rasterPt, 0.3 + Math.random() * 0.5, { "delay": 1 + Math.random() * (param6 * 2), "x": param3.x - MAP.instance.offset.x + this.mctop.x, "y": param3.y - MAP.instance.offset.y + this.mctop.y, "onStart": as3.bind(this, this.Add), "onComplete": as3.bind(this, this.Hit), "ease": Sine.easeIn });
        }
    }

    protected Add(): void {
        if (this.m_cleared) {
            return;
        }

        if (!BYMConfig.instance.RENDERER_ON) {
            this.mc.visible = true;
        } else {
            this.m_rasterData.visible = true;
        }
    }

    protected Hit(): void {
        if (this.m_cleared) {
            return;
        }
        if (!BYMConfig.instance.RENDERER_ON) {
            this.mctop.removeChild(this.mc);
        }
        this.animframe = 0;
        let _loc1_: Point = new Point(0, 0);
        this.m_bomb.Damage(this.m_position);
        switch (this.m_resourceId) {
            case ResourceBombParticle.k_TYPE_TWIGS:
                this.bmd_frame.copyPixels(ResourceBombs.bmd_twigs, new Rectangle(24 * this.variation, 30, 24, 30), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mcbottom.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.m_rasterData.data = as3.cast(this.bmd_frame, IBitmapDrawable);
                }
                _loc1_.x = -12;
                _loc1_.y = -15;
                this.m_bomb.RemoveParticle(this.m_id);
                break;
            case ResourceBombParticle.k_TYPE_PEBBLE:
                this.variation = (Math.random() * 4) | 0;
                this.bmd_frame = new BitmapData(80, 85, true, 16777215);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_pebblehit, new Rectangle(0, 85 * this.variation, 80, 85), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mcbottom.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.m_rasterData.data = as3.cast(this.bmd_frame, IBitmapDrawable);
                }
                _loc1_.x = -40;
                _loc1_.y = -50;
                this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Anim));
                break;
            default:
                this.variation = (Math.random() * 4) | 0;
                this.bmd_frame = new BitmapData(81, 52, true, 16777215);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_putty, new Rectangle(0, 81 * this.variation, 81, 52), new Point(0, 0));
                if (!BYMConfig.instance.RENDERER_ON) {
                    this.mc = this.mcbottom.addChild(new Bitmap(this.bmd_frame));
                } else {
                    this.m_rasterData.data = as3.cast(this.bmd_frame, IBitmapDrawable);
                }
                _loc1_.x = -40;
                _loc1_.y = -26;
                this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Anim));
        }
        if (!this.m_cleared) {
            this.mc.x = this.m_position.x + _loc1_.x;
            this.mc.y = this.m_position.y + _loc1_.y;
            if (BYMConfig.instance.RENDERER_ON) {
                this.m_rasterPt.x = this.mc.x - MAP.instance.offset.x - this.mctop.x;
                this.m_rasterPt.y = this.mc.y - MAP.instance.offset.y - this.mctop.y;
            }
        }
    }

    protected Anim(param1: Event): void {
        let _loc3_: Rectangle = null;
        if (this.m_cleared) {
            return;
        }
        let _loc2_: int = 20;
        if (this.m_resourceId == 2) {
            if (this.animframe == 20) {
                this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Anim));
                this.m_bomb.RemoveParticle(this.m_id);
            } else {
                _loc3_ = new Rectangle(80 * this.animframe, 85 * this.variation, 80, 85);
                this.bmd_frame.copyPixels(ResourceBombs.bmd_pebblehit, _loc3_, new Point(0, 0));
                if (BYMConfig.instance.RENDERER_ON) {
                    this.m_rasterData.data = as3.cast(this.bmd_frame, IBitmapDrawable);
                }
                ++this.animframe;
            }
        } else if (this.animframe == 14) {
            this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Anim));
            this.m_bomb.RemoveParticle(this.m_id);
        } else {
            _loc3_ = new Rectangle(81 * this.animframe, 81 * this.variation, 81, 52);
            this.bmd_frame.copyPixels(ResourceBombs.bmd_putty, _loc3_, new Point(0, 0));
            if (BYMConfig.instance.RENDERER_ON) {
                this.m_rasterData.data = as3.cast(this.bmd_frame, IBitmapDrawable);
            }
            ++this.animframe;
        }
    }

    public clear(): void {
        if (this.m_cleared) {
            return;
        }
        if (BYMConfig.instance.RENDERER_ON) {
            if (this.m_resourceId !== ResourceBombParticle.k_TYPE_TWIGS && MAP.effectsBMD && this.bmd_frame && this.m_rasterPt) {
                MAP.effectsBMD.copyPixels(this.bmd_frame, this.bmd_frame.rect, this.m_rasterPt);
            }
            if (this.m_rasterData) {
                this.m_rasterData.clear();
            }
            this.m_rasterData = null;
            this.m_rasterPt = null;
        }
        if (this.mc) {
            this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Anim));
        }
        if (this.bmd_frame) {
            this.bmd_frame.dispose();
        }
        this.mc = null;
        this.container = null;
        this.bmd_frame = null;
        this.mctop = null;
        this.mcbottom = null;
        this.m_position = null;
        this.m_bomb = null;
        this.m_cleared = true;
    }
}
