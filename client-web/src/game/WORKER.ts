import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, DisplayObject, DisplayObjectContainer, IBitmapDrawable, MovieClip } from "flash/display";
import { TimerEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { Timer } from "flash/utils";
import { BASE, BFOUNDATION, BYMConfig, Bounce, GLOBAL, ImageCache, MAP, PATHING, RasterData, SPRITES, Sine, TweenLite, WORKER_CLIP, workerMessage } from "@game";

export class WORKER extends WORKER_CLIP {
    static {
        as3.fields(this, { _behaviour: null, _middle: 0, _speed: NaN, _targetRotation: NaN, _targetPosition: null, _targetTask: null, _hasPath: false, _frameNumber: NaN, _scale: NaN, _targetBuilding: null, _id: 0, _size: NaN, _container: null, _graphic: null, _lastRotation: 400, _messageMC: null, frameCount: 0, showTimer: null, hideTimer: null, yd: 0, xd: 0, _mc: null, _waypoints: null, _waypointIndex: 0, _hasGraphic: false, configObject: null, _jumping: false, _jumpingUp: false, _graphicMC: null, _rasterData: null, _rasterPt: null });
    }

    public _behaviour: string;
    public _middle: int;
    public _speed: number;
    public _targetRotation: number;
    public _targetPosition: Point;
    public _targetTask: BFOUNDATION;
    public _hasPath: boolean;
    public _frameNumber: number;
    public _scale: number;
    public _targetBuilding: BFOUNDATION;
    public _id: int;
    public _size: number;
    public _container: DisplayObjectContainer;
    public _graphic: BitmapData;
    public _lastRotation: int;
    public _messageMC: MovieClip;
    private frameCount: int;
    public showTimer: Timer;
    public hideTimer: Timer;
    public yd: int;
    public xd: int;
    public _mc: MovieClip;
    public _waypoints: any[];
    private _waypointIndex: int;
    private _hasGraphic: boolean;
    private configObject: any;
    private _jumping: boolean;
    private _jumpingUp: boolean;
    private _graphicMC: DisplayObject;
    protected _rasterData: RasterData;
    protected _rasterPt: Point;

    public $ctor(param1?: any, param2?: Point, param3?: number): void {
        super.$ctor();
        this._mc = this;
        this._middle = 5;
        this.showTimer = new Timer(500);
        this.showTimer.addEventListener("timer", as3.bind(this, this.sayShow));
        this.hideTimer = new Timer(2000);
        this.hideTimer.addEventListener("timer", as3.bind(this, this.sayHide));
        this._waypoints = [];
        this._rasterPt = new Point();
        this._id = GLOBAL.NextCreepID();
        this._container = as3.cast(param1, DisplayObjectContainer);
        this._targetPosition = param2;
        this.x = this._targetPosition.x;
        this.y = this._targetPosition.y;
        this._targetRotation = param3;
        this._speed = 0;
        this._size = 10;
        this._frameNumber = (Math.random() * 200) | 0;
        if (!BASE.isInfernoMainYardOrOutpost) {
            this._graphic = new BitmapData(52, 50, true, 16777215);
        } else {
            this._graphic = new BitmapData(64, 55, true, 16777215);
        }
        SPRITES.SetupSprite("worker");
        this._graphicMC = as3.cast(BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : this.addChild(new Bitmap(this._graphic)), DisplayObject);
        this._graphicMC.x = -26;
        this._graphicMC.y = -36;
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = this._rasterData || new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
        this._hasGraphic = false;
        ImageCache.GetImageWithCallBack("monsters/worker.png", as3.bind(this, this.onAssetLoaded));
        this.mouseEnabled = false;
        this.mouseChildren = false;
    }

    private onAssetLoaded(param1: string, param2: BitmapData): void {
        this._hasGraphic = true;
        this.Update(true);
    }

    protected updateRasterData(): void {
        let _loc2_: number = NaN;
        let _loc3_: int = 0;
        if (!BYMConfig.instance.RENDERER_ON) {
            return;
        }
        let _loc1_: Point = MAP.instance.offset;
        if (Boolean(this._graphicMC) && Boolean(this._rasterData)) {
            _loc2_ = this.height * 0.5;
            if (this._middle) {
                _loc2_ = this._middle;
            }
            this._rasterPt.x = this.x + this._graphicMC.x - _loc1_.x;
            this._rasterPt.y = this.y + this._graphicMC.y - _loc1_.y;
            this._rasterData.depth = Math.max(MAP.DEPTH_SHADOW + 1, (this.y - _loc1_.y + _loc2_) * 1000 + this.x - _loc1_.x);
        }
    }

    public Clear(): void {
        if (this._rasterData) {
            this._rasterData.clear();
        }
        this._rasterData = null;
        this._rasterPt = null;
    }

    public Tick(): void {
        ++this._frameNumber;
        let _loc1_: int = (Math.random() * 600) | 0;
        if (_loc1_ < 5 && !this._targetTask && this._speed == 0) {
            this.Wander();
        }
        this.Move();
        if (this._hasGraphic) {
            this.Update();
        }
        this.updateRasterData();
    }

    public Wander(): void {
    }

    /**
     * PATHING callback for a path request made by Target().
     *
     * PATHING.Clear() discards every pending request and calls back with pathingWasCleared set
     * and no path. No path will follow, so a worker with a task asks again; otherwise it stands
     * still, never reaches the building, and the task's countdown never starts.
     *
     * @param {Array} waypoints - Path to walk, empty when pathing was cleared
     * @param {BFOUNDATION} targetBuilding - Building the path leads to
     * @param {Boolean} pathingWasCleared - True when the request was discarded by PATHING.Clear()
     */
    public setWaypoints(waypoints: any[], targetBuilding: BFOUNDATION = null, pathingWasCleared: boolean = false): void {
        if (pathingWasCleared) {
            if (this._targetTask) {
                this.Target(new Point(this._targetTask._mc.x, this._targetTask._mc.y + this._targetTask._mcFootprint.height / 2), this._targetTask);
            }
            return;
        }
        this._hasPath = true;
        this._waypoints = waypoints;
    }

    public Update(param1: boolean = false): void {
        if (param1 || this._lastRotation != ((this.mcMarker.rotation / 12) | 0)) {
            this._lastRotation = (this.mcMarker.rotation / 12) | 0;
            SPRITES.GetSprite(this._graphic, "worker", "walking", this.mcMarker.rotation | 0, this._frameNumber | 0);
        }
    }

    public Target(param1: Point, param2: BFOUNDATION = null): void {
        let _loc3_: Rectangle = null;
        if (!GLOBAL._catchup) {
            _loc3_ = new Rectangle(param1.x, param1.y, 10, 10);
            if (param2) {
                _loc3_ = new Rectangle(param2._mc.x, param2._mc.y, param2._footprint[0].width, param2._footprint[0].height);
            }
            this._hasPath = false;
            PATHING.GetPath(new Point(this.x, this.y), _loc3_, as3.bind(this, this.setWaypoints), true, param2);
        } else {
            this._waypoints = [new Point(this.x, this.y)];
        }
    }

    public Move(): void {
        let newSpeed: number = NaN;
        let difference: number = NaN;
        let r: int = 0;
        let building: BFOUNDATION = null;
        let Distance: int = 0;
        if (this._waypoints.length > 0) {
            this._targetPosition = as3.cast(this._waypoints[0], Point);
            if (!this._jumping) {
                building = PATHING.GetBuildingFromISO(this._targetPosition);
                if (building) {
                    if (building.health > 0) {
                        TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y - 40, "ease": Sine.easeOut, "overwrite": false, "onComplete": (): void => {
                            this._jumpingUp = false;
                        } });
                        TweenLite.to(this._graphicMC, 0.4, { "y": this._graphicMC.y, "ease": Bounce.easeOut, "overwrite": false, "delay": 0.4, "onComplete": (): void => {
                            this._jumping = false;
                        } });
                        this._jumping = true;
                        this._jumpingUp = true;
                        if (this._messageMC) {
                            this.sayHide(null);
                        }
                    }
                }
            }
        }
        if (this._hasPath) {
            Distance = Point.distance(this._targetPosition, new Point(this.x, this.y)) | 0;
            if (Distance < 20) {
                if (this._waypoints.length > 0) {
                    this._targetPosition = as3.cast(this._waypoints[0], Point);
                    this._waypoints.splice(0, 1);
                }
                if (this._waypoints.length == 0) {
                    if (this._speed > 0) {
                        this._speed -= 0.1;
                    } else {
                        this._speed = 0;
                    }
                    if (Boolean(this._targetTask) && !this._targetTask._hasWorker) {
                        this._targetTask.HasWorker();
                    }
                }
            } else if (!this._targetTask) {
                if (this._speed < 1) {
                    this._speed += 0.05;
                } else {
                    this._speed -= 0.05;
                }
            } else if (this._speed < 2) {
                this._speed += 0.05;
            } else {
                this._speed -= 0.05;
            }
        }
        newSpeed = this._speed;
        if (this._jumping) {
            if (this._jumpingUp) {
                newSpeed *= 3;
            } else {
                newSpeed *= 2;
            }
        }
        this.y += Math.sin(this.mcMarker.rotation * 0.0174532925) * newSpeed;
        this.x += Math.cos(this.mcMarker.rotation * 0.0174532925) * newSpeed;
        this.yd = (this._targetPosition.y - this.y) | 0;
        this.xd = (this._targetPosition.x - this.x) | 0;
        this._targetRotation = Math.atan2(this.yd, this.xd) * 57.2957795 - 90;
        difference = this.mcMarker.rotation - this._targetRotation;
        if (difference > 180) {
            this._targetRotation += 360;
        } else if (difference < -180) {
            this._targetRotation -= 360;
        }
        this._targetRotation += 90;
        if (!this._targetTask) {
            r = ((this._targetRotation - this.mcMarker.rotation) / 5) | 0;
        } else {
            r = ((this._targetRotation - this.mcMarker.rotation) / 3) | 0;
        }
        if (r != 0) {
            this.mcMarker.rotation += r;
        }
        if (this._messageMC) {
            this._messageMC.x = this.x - 5;
            this._messageMC.y = this.y - 15;
        }
    }

    public Say(param1: string, param2: int = 2000): void {
        this.hideTimer.stop();
        this.hideTimer.delay = param2;
        if (this._messageMC) {
            MAP._PROJECTILES.removeChild(this._messageMC);
        }
        this._messageMC = as3.as(MAP._PROJECTILES.addChild(new workerMessage()), MovieClip);
        this._messageMC.visible = false;
        this._messageMC.txt.autoSize = "left";
        this._messageMC.txt.htmlText = param1;
        if (param1.length < 5) {
            this._messageMC.txt.width = 40;
            this._messageMC.mcBG.width = 50;
        } else if (param1.length < 12) {
            this._messageMC.txt.width = 70;
            this._messageMC.mcBG.width = 80;
        } else {
            this._messageMC.txt.width = 90;
            this._messageMC.mcBG.width = 100;
        }
        this._messageMC.mcBG.height = this._messageMC.txt.height + 17;
        this._messageMC.txt.y = 0 - this._messageMC.mcBG.height + 5;
        this.showTimer.start();
    }

    private sayShow(param1: TimerEvent = null): void {
        if (this._messageMC) {
            this._messageMC.visible = true;
            this.hideTimer.start();
        }
        this.showTimer.stop();
    }

    private sayHide(param1: TimerEvent): void {
        TweenLite.to(this._messageMC, 0.5, { "alpha": 0, "onComplete": as3.bind(this, this.sayHideB) });
        this.hideTimer.stop();
    }

    private sayHideB(): void {
        if (Boolean(this._messageMC) && Boolean(this._messageMC.parent)) {
            this._messageMC.parent.removeChild(this._messageMC);
            this._messageMC = null;
        }
    }
}
