import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { Bounce, Expo, GLOBAL, MAP, TUTORIALARROWMC_CLIP, TweenLite } from "@game";

export class TUTORIALARROWMC extends TUTORIALARROWMC_CLIP {
    static {
        as3.fields(this, { offsetX: NaN, offsetY: NaN, dragging: false, wobbleCountdown: 0, posX: NaN, posY: NaN, Resize: null, ResizeParams: null });
    }

    private offsetX: number;
    private offsetY: number;
    private dragging: boolean;
    private wobbleCountdown: int;
    public posX: number;
    public posY: number;
    public Resize: Function;
    public ResizeParams: any[];

    public $ctor(param1: number = 0, param2: number = 0): void {
        let posx: number = param1;
        let posy: number = param2;
        super.$ctor();
        this.posX = posx;
        this.posY = posy;
        if (GLOBAL._local) {
            this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.DragStart));
            MAP.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.DragStop));
        } else {
            this.mouseEnabled = false;
            this.mouseChildren = false;
            this.mcArrow.mouseEnabled = false;
            this.mcArrow.mouseChildren = false;
        }
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Wobble));
        this.ResizeParams = new Array();
        this.Resize = (): void => {
            let _loc1_: int = 0;
            let _loc4_: int = 0;
            let _loc5_: int = 0;
            let _loc6_: any = null;
            let _loc2_: int = GLOBAL._ROOT.stage.stageWidth;
            let _loc3_: Point = new Point();
            if (this.ResizeParams) {
                if (this.ResizeParams[0] == "percent" && this.ResizeParams[1] && this.ResizeParams[1] instanceof Point) {
                    this.x = GLOBAL._SCREEN.x + this.posX * (GLOBAL._SCREEN.width / GLOBAL._SCREENINIT.width);
                    this.y = GLOBAL._SCREEN.y + this.posY * (GLOBAL._SCREEN.height / GLOBAL._SCREENINIT.height);
                } else if (this.ResizeParams[0] == "mc" && this.ResizeParams[1] && this.ResizeParams[1] instanceof DisplayObject) {
                    _loc4_ = this.ResizeParams[1].x | 0;
                    _loc5_ = this.ResizeParams[1].y | 0;
                    _loc6_ = this.ResizeParams[1].parent;
                    while (Boolean(_loc6_) && Boolean(_loc6_.parent)) {
                        _loc4_ = (_loc4_ + _loc6_.x) | 0;
                        _loc5_ = (_loc5_ + _loc6_.y) | 0;
                        if (_loc6_.parent == GLOBAL._ROOT.stage) {
                            break;
                        }
                        _loc6_ = _loc6_.parent;
                    }
                    if (this.ResizeParams[2]) {
                        _loc4_ = (_loc4_ + this.ResizeParams[2].x) | 0;
                        _loc5_ = (_loc5_ + this.ResizeParams[2].y) | 0;
                    }
                    this.x = _loc4_;
                    this.y = _loc5_;
                }
            } else {
                this.x = GLOBAL._SCREEN.x + this.posX * (GLOBAL._SCREEN.width / GLOBAL._SCREENINIT.width);
                this.y = GLOBAL._SCREEN.y + this.posY * (GLOBAL._SCREEN.height / GLOBAL._SCREENINIT.height);
            }
            this.Rotate();
        };
    }

    public DragStart(param1: MouseEvent): void {
        this.dragging = true;
        this.offsetX = GLOBAL._ROOT.mouseX - this.x;
        this.offsetY = GLOBAL._ROOT.mouseY - this.y;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Move));
    }

    public DragStop(param1: MouseEvent): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Move));
        if (this.dragging) {
        }
        this.dragging = false;
    }

    public Move(param1: Event = null): void {
        this.x = GLOBAL._ROOT.mouseX - this.offsetX;
        this.y = GLOBAL._ROOT.mouseY - this.offsetY;
        this.Rotate();
    }

    public Rotate(): void {
        if (this.ResizeParams && this.ResizeParams[3] && as3.is(this.ResizeParams[3], int)) {
            this.mcArrow.rotation = Number(this.ResizeParams[3]);
            if (this.mcArrow.rotation >= 0) {
                this.mcArrow.mcArrow.gotoAndStop(1);
            } else {
                this.mcArrow.mcArrow.gotoAndStop(2);
            }
        } else {
            if (this.y < GLOBAL._ROOT.stage.stageHeight / 2) {
                this.mcArrow.rotation = this.x / (6 / GLOBAL._SCREENINIT.width * GLOBAL._ROOT.stage.stageWidth) + 130;
            } else {
                this.mcArrow.rotation = (0 - this.x) / (6 / GLOBAL._SCREENINIT.width * GLOBAL._ROOT.stage.stageWidth) + 45;
            }
            if (this.x < GLOBAL._ROOT.stage.stageWidth / 2) {
                this.mcArrow.mcArrow.gotoAndStop(1);
            } else {
                this.mcArrow.mcArrow.gotoAndStop(2);
            }
        }
    }

    public Wobble(param1: Event): void {
        if (this.wobbleCountdown == 0) {
            this.wobbleCountdown = 80;
            this.mcArrow.mcArrow.y = -60;
            TweenLite.to(this.mcArrow.mcArrow, 0.6, { "y": -70, "ease": Expo.easeInOut, "onComplete": as3.bind(this, this.WobbleB) });
        }
        --this.wobbleCountdown;
    }

    public WobbleB(): void {
        TweenLite.to(this.mcArrow.mcArrow, 0.6, { "y": -60, "ease": Bounce.easeOut });
    }

    public SetPos(param1: int, param2: int): void {
        this.posX = param1;
        this.posY = param2;
    }
}
