import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, IBitmapDrawable, MovieClip, Sprite, Stage } from "flash/display";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { Matrix, Point, Rectangle } from "flash/geom";
import { getTimer } from "flash/utils";
import { BFOUNDATION, BYMConfig, CREEPS, Cubic, GLOBAL, GRID, IoPinchZoom, KeyboardInputHandler, LOGGER, Linear, MAPBG, MagmaPuddle, MonsterBase, PLANNER, RasterData, Renderer, Targeting, TweenLite, UI2 } from "@game";

export class MAP extends ASObject {
    static {
        as3.fields(this, { _renderer: null, _point: null });
    }

    public static _inited: boolean;

    public static _dragX: number;

    public static _dragY: number;

    public static tx: number;

    public static ty: number;

    public static targX: number;

    public static targY: number;

    public static d: number;

    public static _startX: number;

    public static _startY: number;

    public static _autoScroll: boolean;

    public static stage: Stage; // const

    public static _dragging: boolean;

    public static _dragged: boolean;

    public static _dragDistance: number;

    public static _EFFECTSBMP: BitmapData;

    public static _GROUND: Sprite;

    public static _EDGE: MovieClip;

    public static _UNDERLAY: MovieClip;

    public static _RESOURCES: MovieClip;

    public static _BUILDINGBASES: MovieClip;

    public static _WORKERS: MovieClip;

    public static _WALLS: MovieClip;

    public static _EFFECTS: Sprite;

    public static _CREEPSMC: MovieClip;

    public static _BUILDINGFOOTPRINTS: MovieClip;

    public static _BUILDINGINFO: MovieClip;

    public static _PROJECTILES: MovieClip;

    public static _FIREBALLS: MovieClip;

    public static _EFFECTSTOP: MovieClip;

    public static _BGTILES: MovieClip;

    public static _BUILDINGTOPS: Sprite;

    public static _damageGrid: any;

    public static _following: boolean;

    public static _sortTo: int;

    public static _canScroll: boolean;

    public static MAP_TYPE_GRASS: int; // const

    public static MAP_TYPE_ROCK: int; // const

    public static MAP_TYPE_SAND: int; // const

    public static MAP_TYPE_CRATER: int; // const

    public static MAP_TYPE_LAVA: int; // const

    public static DEPTH_SHADOW: uint; // const

    protected static _bmdTile: BitmapData;

    protected static s_texture: string;

    private static _instance: MAP;

    private static _canvas: BitmapData;

    private static _canvasContainer: Bitmap;

    public static MAP_WIDTH: uint; // const

    public static MAP_HEIGHT: uint; // const

    private static _viewRect: Rectangle; // const

    protected static _effectsRasterData: RasterData;

    public static vol: number;

    private static _ioButtonDown: boolean;

    /** getTimer() after which a camera glide that never finished no longer blocks dragging. */
    public static _autoScrollUntil: int;

    static {
        as3.lazyStatics(this, { _inited: false, _dragX: NaN, _dragY: NaN, tx: NaN, ty: NaN, targX: NaN, targY: NaN, d: NaN, _startX: NaN, _startY: NaN, _autoScroll: false, stage: null, _dragging: false, _dragged: false, _dragDistance: NaN, _EFFECTSBMP: null, _GROUND: null, _EDGE: null, _UNDERLAY: null, _RESOURCES: null, _BUILDINGBASES: null, _WORKERS: null, _WALLS: null, _EFFECTS: null, _CREEPSMC: null, _BUILDINGFOOTPRINTS: null, _BUILDINGINFO: null, _PROJECTILES: null, _FIREBALLS: null, _EFFECTSTOP: null, _BGTILES: null, _BUILDINGTOPS: null, _damageGrid: null, _following: false, _sortTo: 0, _canScroll: false, MAP_TYPE_GRASS: 0, MAP_TYPE_ROCK: 0, MAP_TYPE_SAND: 0, MAP_TYPE_CRATER: 0, MAP_TYPE_LAVA: 0, DEPTH_SHADOW: 0, _bmdTile: null, s_texture: null, _instance: null, _canvas: null, _canvasContainer: null, MAP_WIDTH: 0, MAP_HEIGHT: 0, _viewRect: null, _effectsRasterData: null, vol: NaN, _ioButtonDown: false, _autoScrollUntil: 0 }, () => {
            MAP._inited = false;
            MAP.stage = GLOBAL._ROOT.stage;
            MAP._sortTo = 0;
            MAP._canScroll = true;
            MAP.MAP_TYPE_GRASS = 0;
            MAP.MAP_TYPE_ROCK = 1;
            MAP.MAP_TYPE_SAND = 2;
            MAP.MAP_TYPE_CRATER = 3;
            MAP.MAP_TYPE_LAVA = 4;
            MAP.DEPTH_SHADOW = 1;
            MAP.MAP_WIDTH = 3994;
            MAP.MAP_HEIGHT = 1994;
            MAP._viewRect = new Rectangle();
            MAP.vol = 1;
            MAP._ioButtonDown = false;
            MAP._autoScrollUntil = 0;
        });
    }
    protected _renderer: Renderer;
    protected _point: Point;

    public $ctor(param1?: string): void {
        this._point = new Point();
        let rect: Rectangle = null;
        let efxbmp: Bitmap = null;
        let texture: string = param1;
        super.$ctor();
        MAP._instance = this;
        try {
            MAP.tx = GLOBAL._SCREENINIT.width / 2;
            MAP.ty = GLOBAL._SCREENINIT.height / 2;
            rect = GLOBAL._SCREEN;
            MAP._viewRect.x = GLOBAL._SCREEN.x + MAP.MAP_WIDTH / 2;
            MAP._viewRect.y = GLOBAL._SCREEN.y + MAP.MAP_HEIGHT / 2;
            MAP._viewRect.width = GLOBAL._SCREEN.width;
            MAP._viewRect.height = GLOBAL._SCREEN.height;
            // Inferno-only: a yard set up again without MAP.Clear between (two answers to base loads) left the
            // old ground listening, and its Scroll ran into the next cleared map (bug report #47)
            MAP.ioLetGo(MAP._GROUND);
            MAP._GROUND = as3.as(GLOBAL._layerMap.addChild(new Sprite()), Sprite);
            if (!BYMConfig.instance.RENDERER_ON) {
                MAP._BGTILES = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            }
            if (BYMConfig.instance.RENDERER_ON) {
                MAP._canvas = new BitmapData(MAP.MAP_WIDTH, MAP.MAP_HEIGHT, false, 0);
                MAP._canvasContainer = new Bitmap(MAP._canvas);
                MAP._canvasContainer.x -= MAP._canvasContainer.width / 2;
                MAP._canvasContainer.y -= MAP._canvasContainer.height / 2;
                MAP._GROUND.addChild(MAP._canvasContainer);
            }
        } catch (e) {
            LOGGER.Log("err", "MAP.Setup A: " + e.message + " | " + e.getStackTrace());
        }
        try {
            MAP._GROUND.x = MAP.tx;
            MAP._GROUND.y = MAP.ty;
            MAP._UNDERLAY = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            if (BYMConfig.instance.RENDERER_ON) {
                MAP._EFFECTSBMP = new BitmapData(MAP._canvas.width, MAP._canvas.height, false, 0);
                MAP._effectsRasterData = new RasterData(as3.cast(MAP._EFFECTSBMP, IBitmapDrawable), new Point((MAP._canvas.width - MAP._EFFECTSBMP.width) * 0.5, (MAP._canvas.height - MAP._EFFECTSBMP.height) * 0.5), 0, null, true);
            } else {
                MAP._EFFECTSBMP = new BitmapData(3200, 1800, true, 0);
                efxbmp = as3.as(MAP._GROUND.addChild(new Bitmap(MAP._EFFECTSBMP)), Bitmap);
                efxbmp.x = -MAP._EFFECTSBMP.width * 0.5;
                efxbmp.y = -MAP._EFFECTSBMP.height * 0.5;
            }
            MAP.s_texture = texture;
            MAP.swapBG(MAP.s_texture);
            MAP._EFFECTS = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._EFFECTS.mouseEnabled = false;
            MAP._EFFECTS.mouseChildren = false;
            MAP._EFFECTS.tabChildren = false;
            MAP._BUILDINGBASES = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._BUILDINGBASES.mouseEnabled = false;
            MAP._BUILDINGBASES.mouseChildren = true;
            MAP._BUILDINGBASES.tabChildren = false;
            MAP._BUILDINGFOOTPRINTS = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._BUILDINGFOOTPRINTS.mouseEnabled = false;
            MAP._BUILDINGFOOTPRINTS.mouseChildren = false;
            MAP._BUILDINGFOOTPRINTS.tabChildren = false;
            MAP._CREEPSMC = BYMConfig.instance.RENDERER_ON ? new MovieClip() : as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._CREEPSMC.mouseEnabled = false;
            MAP._CREEPSMC.mouseChildren = true;
            MAP._CREEPSMC.tabChildren = false;
            MAP._BUILDINGTOPS = as3.as(MAP._GROUND.addChild(new Sprite()), Sprite);
            MAP._BUILDINGTOPS.mouseEnabled = false;
            MAP._BUILDINGTOPS.mouseChildren = true;
            MAP._BUILDINGTOPS.tabChildren = false;
            MAP._RESOURCES = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._RESOURCES.mouseEnabled = false;
            MAP._RESOURCES.mouseChildren = false;
            MAP._RESOURCES.tabChildren = false;
            MAP._BUILDINGINFO = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._BUILDINGINFO.mouseEnabled = false;
            MAP._BUILDINGINFO.mouseChildren = true;
            MAP._BUILDINGINFO.tabChildren = false;
            MAP._PROJECTILES = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._PROJECTILES.mouseEnabled = false;
            MAP._PROJECTILES.mouseChildren = false;
            MAP._PROJECTILES.tabChildren = false;
            MAP._FIREBALLS = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._FIREBALLS.mouseEnabled = false;
            MAP._FIREBALLS.mouseChildren = false;
            MAP._FIREBALLS.tabChildren = false;
            MAP._EFFECTSTOP = as3.as(MAP._GROUND.addChild(new MovieClip()), MovieClip);
            MAP._EFFECTSTOP.mouseEnabled = false;
            MAP._EFFECTSTOP.mouseChildren = false;
            MAP._EFFECTSTOP.tabChildren = false;
            MAP._dragged = false;
            // A new yard starts with the camera free: nothing from the last yard may keep it locked.
            MAP._autoScroll = false;
            MAP._autoScrollUntil = 0;
            MAP._dragging = false;
            MAP._GROUND.addEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
            // Pinch to zoom on touch screens (installed once, on the stage).
            IoPinchZoom.Install(MAP._GROUND.stage);
            MAP._GROUND.addEventListener(Event.ENTER_FRAME, MAP.Scroll);
            // Button-state tracking that lives for the whole game (registered once, capture phase,
            // top priority: first to see every mouse event). Scroll() ends a drag the moment the
            // button is known to be up, whatever else went wrong in between.
            // On some players' setups the mouse-up never reaches the stage at all, in either phase,
            // while buttons (which need a mouse-up to make a click) work: so the release is also taken
            // from the ground itself and from the game root, and from a click anywhere. buttonDown on
            // mouse moves is not used: on those same setups it reads false while the button is held.
            let ioStage: Stage = MAP._GROUND.stage;
            ioStage.addEventListener(MouseEvent.MOUSE_DOWN, MAP.ioButtonDown, true, int.MAX_VALUE);
            ioStage.addEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp, true, int.MAX_VALUE);
            ioStage.addEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp);
            ioStage.addEventListener(MouseEvent.CLICK, MAP.ioButtonUp, true, int.MAX_VALUE);
            ioStage.addEventListener(Event.MOUSE_LEAVE, MAP.ioButtonUp);
            ioStage.addEventListener(Event.DEACTIVATE, MAP.ioButtonUp);
            GLOBAL._ROOT.addEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp);
            GLOBAL._ROOT.addEventListener(MouseEvent.CLICK, MAP.ioButtonUp);
            MAP._GROUND.addEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp);
            MAP._GROUND.addEventListener(MouseEvent.CLICK, MAP.ioButtonUp);
            MAP._GROUND.stage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(KeyboardInputHandler.instance, KeyboardInputHandler.instance.OnKeyDown));
            if (GLOBAL.DOES_USE_SCROLL) {
                MAP._GROUND.stage.addEventListener(MouseEvent.MOUSE_WHEEL, MAP.onMouseScroll);
            }
            MAP._GROUND.stage.addEventListener(KeyboardEvent.KEY_UP, MAP.KeyUp);
            MAP._EDGE = null;
        } catch (e) {
            LOGGER.Log("err", "MAP.Setup B: " + e.message + " | " + e.getStackTrace());
        }
        if (!BYMConfig.instance.RENDERER_ON) {
            MAP.Edge();
        }
        if (BYMConfig.instance.RENDERER_ON) {
            this._renderer = new Renderer(MAP._canvas, MAP._viewRect);
            GLOBAL._ROOT.addEventListener(Event.RENDER, as3.bind(this, this.render));
        }
        Targeting.init();
        MAP._inited = true;
    }

    public static get effectsBMD(): BitmapData {
        return MAP._EFFECTSBMP;
    }

    public static get texture(): string {
        return MAP.s_texture;
    }

    public static get instance(): MAP {
        return MAP._instance;
    }

    public static swapBG(param1: string): void {
        let _loc3_: DisplayObject = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        MAP.s_texture = param1;
        if (!BYMConfig.instance.RENDERER_ON) {
            while (MAP._BGTILES.numChildren) {
                MAP._BGTILES.removeChildAt(0);
            }
        }
        MAP._bmdTile = MAPBG.MakeTile(MAP.s_texture);
        let _loc2_: any[] = [];
        let _loc6_: Point = new Point();
        if (BYMConfig.instance.RENDERER_ON) {
            _loc4_ = 0;
            while (_loc4_ < 4) {
                _loc5_ = 0;
                while (_loc5_ < 4) {
                    _loc6_.x = _loc4_ * 1000;
                    _loc6_.y = _loc5_ * 500;
                    MAP._EFFECTSBMP.copyPixels(MAP._bmdTile, MAP._bmdTile.rect, _loc6_);
                    _loc5_++;
                }
                _loc4_++;
            }
            MAP._bmdTile.dispose();
            MAP._bmdTile = null;
            MAP.Edge();
        } else {
            _loc4_ = -2;
            while (_loc4_ < 2) {
                _loc5_ = -2;
                while (_loc5_ < 2) {
                    _loc3_ = MAP._BGTILES.addChild(new Bitmap(MAP._bmdTile));
                    _loc3_.x = _loc4_ * 998;
                    _loc3_.y = _loc5_ * 498;
                    _loc3_.cacheAsBitmap = true;
                    _loc5_++;
                }
                _loc4_++;
            }
        }
    }

    public static swapIntBG(param1: int): void {
        let _loc2_: string = null;
        switch (param1) {
            case MAP.MAP_TYPE_ROCK:
                _loc2_ = "rock";
                break;
            case MAP.MAP_TYPE_SAND:
                _loc2_ = "sand";
                break;
            case MAP.MAP_TYPE_CRATER:
                _loc2_ = "crater";
                break;
            case MAP.MAP_TYPE_LAVA:
                _loc2_ = "lava";
                break;
            case MAP.MAP_TYPE_GRASS:
            default:
                _loc2_ = "grass";
        }
        MAP.swapBG(_loc2_);
    }

    public static Clear(): void {
        if (MAP._GROUND) {
            MAP._GROUND.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
            MAP._GROUND.removeEventListener(Event.ENTER_FRAME, MAP.Scroll);
            MAP._GROUND.removeEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp);
            MAP._GROUND.removeEventListener(MouseEvent.CLICK, MAP.ioButtonUp);
            while (MAP._GROUND.numChildren) {
                MAP._GROUND.removeChildAt(0);
            }
        }
        if (MAP._BUILDINGTOPS) {
            while (MAP._BUILDINGTOPS.numChildren) {
                MAP._BUILDINGTOPS.removeChildAt(0);
            }
        }
        if (BYMConfig.instance.RENDERER_ON && GLOBAL._ROOT.hasEventListener(Event.RENDER)) {
            GLOBAL._ROOT.removeEventListener(Event.RENDER, as3.bind(MAP._instance, MAP._instance.render));
        }
        MAP._BGTILES = null;
        MAP._BUILDINGBASES = null;
        MAP._BUILDINGFOOTPRINTS = null;
        MAP._BUILDINGTOPS = null;
        MAP._RESOURCES = null;
        MAP._BUILDINGINFO = null;
        MAP._PROJECTILES = null;
        MAP._FIREBALLS = null;
        MAP._EFFECTS = null;
        MAP._EFFECTSTOP = null;
        MAP._GROUND = null;
        MAP.s_texture = null;
        MagmaPuddle.ClearAll();
        // Inferno-only: Clinkerjaw's puddles go with the map
        if (MAP._effectsRasterData) {
            MAP._effectsRasterData.clear();
        }
        if (MAP._bmdTile) {
            MAP._bmdTile.dispose();
        }
        if (MAP._canvas) {
            MAP._canvas.dispose();
        }
        if (MAP._EFFECTSBMP) {
            MAP._EFFECTSBMP.dispose();
        }
        MAP._effectsRasterData = null;
        MAP._bmdTile = null;
        MAP._canvas = null;
        MAP._EFFECTSBMP = null;
        MAP._inited = false;
    }

    public static Edge(): void {
        let iso: Point = null;
        if (GLOBAL.mode !== GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode !== GLOBAL.e_BASE_MODE.IBUILD) {
            return;
        }
        try {
            if (Boolean(MAP._EDGE) && MAP._EDGE.parent == MAP._UNDERLAY) {
                MAP._UNDERLAY.removeChild(MAP._EDGE);
            }
            MAP._EDGE = BYMConfig.instance.RENDERER_ON ? new MovieClip() : as3.as(MAP._UNDERLAY.addChild(new MovieClip()), MovieClip);
            MAP._EDGE.graphics.lineStyle(2, 16777215, 0.5);
            iso = GRID.ToISO((0 - GLOBAL._mapWidth) / 2, (0 - GLOBAL._mapHeight) / 2, 0);
            MAP._EDGE.graphics.moveTo(iso.x, iso.y);
            iso = GRID.ToISO(GLOBAL._mapWidth / 2, (0 - GLOBAL._mapHeight) / 2, 0);
            MAP._EDGE.graphics.lineTo(iso.x, iso.y);
            iso = GRID.ToISO(GLOBAL._mapWidth / 2, GLOBAL._mapHeight / 2, 0);
            MAP._EDGE.graphics.lineTo(iso.x, iso.y);
            iso = GRID.ToISO((0 - GLOBAL._mapWidth) / 2, GLOBAL._mapHeight / 2, 0);
            MAP._EDGE.graphics.lineTo(iso.x, iso.y);
            iso = GRID.ToISO((0 - GLOBAL._mapWidth) / 2, (0 - GLOBAL._mapHeight) / 2, 0);
            MAP._EDGE.graphics.lineTo(iso.x, iso.y);
            if (BYMConfig.instance.RENDERER_ON) {
                MAP._EFFECTSBMP.draw(as3.cast(MAP._EDGE, IBitmapDrawable), new Matrix(1, 0, 0, 1, MAP._EFFECTSBMP.width * 0.5, MAP._EFFECTSBMP.height * 0.5));
            } else {
                MAP._EDGE.cacheAsBitmap = true;
            }
        } catch (e) {
            LOGGER.Log("err", "MAP.Edge: " + e.message + " | " + e.getStackTrace());
        }
    }

    public static SortDepth(param1: boolean = false, param2: boolean = false): void {
        let _loc3_: DisplayObject = null;
        let _loc6_: int = 0;
        let _loc4_: any[] = [];
        let _loc5_: int = (MAP._BUILDINGTOPS.numChildren - 1) | 0;
        let ioDepth: number = NaN;
        if (BYMConfig.instance.RENDERER_ON) {
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            // Inferno-only: with the bitmap renderer only the buildings' hit clips live here; keep them in
            // the order the buildings are drawn, so the one in front takes the click.
            while (_loc5_ >= 0) {
                _loc3_ = MAP._BUILDINGTOPS.getChildAt(_loc5_);
                ioDepth = BFOUNDATION.ioHitDepth(_loc3_);
                _loc4_.push({ "depth": isNaN(ioDepth) ? _loc3_.y * 1000 + _loc3_.x : ioDepth, "mc": _loc3_ });
                _loc5_--;
            }
            as3.sortOn(_loc4_, "depth", Array.NUMERIC);
            _loc5_ = 0;
            while (_loc5_ < _loc4_.length) {
                if (MAP._BUILDINGTOPS.getChildIndex(as3.cast(_loc4_[_loc5_].mc, DisplayObject)) != _loc5_) {
                    MAP._BUILDINGTOPS.setChildIndex(as3.cast(_loc4_[_loc5_].mc, DisplayObject), _loc5_);
                }
                _loc5_++;
            }
            return;
        }
        while (_loc5_ >= 0) {
            _loc3_ = MAP._BUILDINGTOPS.getChildAt(_loc5_);
            _loc6_ = (_loc3_.height * 0.5) | 0;
            _loc4_.push({ "depth": (_loc3_.y + _loc6_) * 1000 + _loc3_.x, "mc": _loc3_ });
            _loc5_--;
        }
        as3.sortOn(_loc4_, "depth", Array.NUMERIC);
        _loc5_ = 0;
        while (_loc5_ < _loc4_.length) {
            if (MAP._BUILDINGTOPS.getChildIndex(as3.cast(_loc4_[_loc5_].mc, DisplayObject)) != _loc5_) {
                MAP._BUILDINGTOPS.setChildIndex(as3.cast(_loc4_[_loc5_].mc, DisplayObject), _loc5_);
            }
            _loc5_++;
        }
    }

    private static onMouseScroll(param1: MouseEvent): void {
        GLOBAL.magnification += param1.delta * 0.05;
    }

    public static KeyUp(param1: KeyboardEvent): void {
    }

    private static ioButtonDown(param1: MouseEvent): void {
        MAP._ioButtonDown = true;
    }

    private static ioButtonUp(param1: Event): void {
        MAP._ioButtonDown = false;
    }

    public static Click(param1: MouseEvent = null): void {
        if (UI2._scrollMap) {
            MAP._dragX = MAP.stage.mouseX - MAP._GROUND.x;
            MAP._dragY = MAP.stage.mouseY - MAP._GROUND.y;
            MAP._startX = MAP._GROUND.x;
            MAP._startY = MAP._GROUND.y;
            MAP._dragging = true;
            // A drag only starts on a mouse-down, so the button is down now. Don't rely on the stage's
            // capture-phase listener having seen it: on the setups where mouse events never reach the
            // stage, _ioButtonDown stayed false and Scroll() ended every drag on its first frame.
            MAP._ioButtonDown = true;
            MAP.stage.addEventListener(MouseEvent.MOUSE_UP, MAP.Release);
            // A drag only ended on that MOUSE_UP listener. Flash stops delivering an event the moment
            // any earlier listener throws, so one broken mouse-up handler anywhere in the game left the
            // yard following the mouse for good ("stuck dragging"): Release never ran. These listeners
            // are in the capture phase at top priority, which runs before every other listener and
            // before any of them can throw. The drag also ends when the mouse leaves the window, and on
            // the first mouse move that reports the button is no longer down.
            MAP.stage.addEventListener(MouseEvent.MOUSE_UP, MAP.ioDragEnd, true, int.MAX_VALUE);
            MAP.stage.addEventListener(Event.MOUSE_LEAVE, MAP.ioDragLeave);
            MAP.stage.addEventListener(Event.DEACTIVATE, MAP.ioDragLeave);
        }
    }

    private static ioDragEnd(param1: MouseEvent): void {
        // The bubbling Release still runs afterwards (harmless twice); this one cannot be skipped.
        MAP._dragging = false;
    }

    private static ioDragLeave(param1: Event): void {
        MAP.Release(null);
    }

    public static Release(param1: MouseEvent): void {
        MAP._dragging = false;
        MAP._dragged = false;
        MAP.stage.removeEventListener(MouseEvent.MOUSE_UP, MAP.Release);
        MAP.stage.removeEventListener(MouseEvent.MOUSE_UP, MAP.ioDragEnd, true);
        MAP.stage.removeEventListener(Event.MOUSE_LEAVE, MAP.ioDragLeave);
        MAP.stage.removeEventListener(Event.DEACTIVATE, MAP.ioDragLeave);
    }

    public static Focus(param1: number, param2: number): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (!GLOBAL._catchup) {
            MAP.tx = GLOBAL._SCREEN.x - (param1 - GLOBAL._SCREEN.width / 2);
            MAP.ty = GLOBAL._SCREEN.y - (param2 - GLOBAL._SCREEN.height / 2);
            _loc3_ = GLOBAL._SCREEN.width | 0;
            _loc4_ = GLOBAL._SCREEN.height | 0;
            MAP._GROUND.x = MAP.tx;
            MAP._GROUND.y = MAP.ty;
            MAP._instance.resizeViewRect();
        }
    }

    public static FocusTo(param1: int, param2: int, param3: number, param4: number = 0, param5: number = 0, param6: boolean = true, param7: Function = null): void {
        let callback: Function = null;
        let FocusToDone: Function = null;
        let w: int = 0;
        let h: int = 0;
        let X: int = param1;
        let Y: int = param2;
        let time: number = param3;
        let delay: number = param4;
        let pause: number = param5;
        let ease: boolean = param6;
        callback = param7;
        if (!GLOBAL._catchup) {
            FocusToDone = (): void => {
                // Cleared first: this used to return before it when the yard had been unloaded while
                // the camera was gliding, and _autoScroll stayed true for the rest of the session, so
                // the player could no longer drag the camera on any yard.
                MAP._autoScroll = false;
                MAP._autoScrollUntil = 0;
                if (!MAP._GROUND) {
                    return;
                }
                MAP.tx = MAP._GROUND.x;
                MAP.ty = MAP._GROUND.y;
                MAP._autoScroll = false;
                if (callback != null) {
                    callback();
                }
                MAP._instance.resizeViewRect();
                BFOUNDATION.updateAllRasterData();
            };
            if (pause > 0) {
                UI2.Hide("top");
                UI2.Hide("bottom");
            }
            MAP._autoScroll = true;
            // Backstop: if the glide never reports finishing (its tween cancelled), give the camera back.
            MAP._autoScrollUntil = (getTimer() + (((time + delay + pause) * 1000) | 0) + 2000) | 0;
            MAP.tx = 0 - (X - 380);
            MAP.ty = 0 - (Y - 340);
            w = MAP.stage.stageWidth;
            h = GLOBAL.GetGameHeight();
            if (ease) {
                TweenLite.to(MAP._GROUND, time, { "x": MAP.tx, "y": MAP.ty, "ease": Cubic.easeInOut, "delay": delay, "onUpdate": BFOUNDATION.updateAllRasterData, "onComplete": FocusToDone, "overwrite": false });
            } else {
                TweenLite.to(MAP._GROUND, time, { "x": MAP.tx, "y": MAP.ty, "ease": Linear.easeNone, "delay": delay, "onUpdate": BFOUNDATION.updateAllRasterData, "onComplete": FocusToDone, "overwrite": false });
            }
        }
    }

    public static FollowStart(): void {
        UI2.Hide("top");
        UI2.Hide("bottom");
        MAP._following = true;
    }

    public static FollowStop(): void {
        UI2.Show("top");
        UI2.Show("bottom");
        MAP._following = false;
    }

    /** Inferno-only: a map ground no longer in use stops listening (its Scroll, clicks and button-ups). */
    private static ioLetGo(ground: Sprite): void {
        if (!ground) {
            return;
        }
        ground.removeEventListener(Event.ENTER_FRAME, MAP.Scroll);
        ground.removeEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
        ground.removeEventListener(MouseEvent.MOUSE_UP, MAP.ioButtonUp);
        ground.removeEventListener(MouseEvent.CLICK, MAP.ioButtonUp);
    }

    public static Scroll(param1: Event = null): void {
        // Inferno-only: only the map on screen scrolls. Called from a ground that is not it (one left from an
        // earlier set-up), or with no map at all while the next yard loads, it lets go and does nothing
        // (bug report #47: "Cannot read properties of null (reading 'x')", on every frame until the next yard).
        if (!MAP._GROUND || param1 && param1.currentTarget && param1.currentTarget !== MAP._GROUND) {
            if (param1 && param1.currentTarget instanceof Sprite && param1.currentTarget !== MAP._GROUND) {
                MAP.ioLetGo(as3.as(param1.currentTarget, Sprite));
            }
            return;
        }
        if (MAP._dragging && !MAP._ioButtonDown) {
            MAP.Release(null);
        }
        if (MAP._autoScroll && MAP._autoScrollUntil > 0 && getTimer() > MAP._autoScrollUntil) {
            MAP._autoScroll = false;
            MAP._autoScrollUntil = 0;
        }
        let _loc12_: int = 0;
        let _loc13_: any = null;
        let _loc14_: MonsterBase = null;
        let _loc15_: number = NaN;
        let _loc16_: number = NaN;
        let _loc17_: number = NaN;
        let _loc18_: number = NaN;
        if (MAP._following) {
            _loc13_ = CREEPS._creeps;
            MAP.tx = 0;
            MAP.ty = 0;
            for (_loc14_ of as3.values(_loc13_)) {
                if (_loc14_._behaviour === "attack" || _loc14_._behaviour === "loot") {
                    _loc12_++;
                    MAP.tx += _loc14_.x;
                    MAP.ty += _loc14_.y;
                }
            }
            if (_loc12_ <= 0) {
                MAP.tx = MAP._dragX;
                MAP.ty = MAP._dragY;
                if (CREEPS._creepCount == 0) {
                    MAP.FollowStop();
                }
                return;
            }
            MAP.tx /= _loc12_;
            MAP.ty /= _loc12_;
            MAP.tx = 0 - MAP.tx + GLOBAL._ROOT.stage.stageWidth * 0.5;
            MAP.ty = 0 - MAP.ty + GLOBAL._ROOT.stage.stageHeight * 0.5;
            MAP._dragX = MAP.tx;
            MAP._dragY = MAP.ty;
            BFOUNDATION.updateAllRasterData();
        } else if (MAP._dragging && UI2._scrollMap && !MAP._autoScroll && MAP._canScroll) {
            _loc15_ = MAP.stage.mouseX;
            _loc16_ = MAP.stage.mouseY;
            MAP.tx = _loc15_ - MAP._dragX >> 0;
            MAP.ty = _loc16_ - MAP._dragY >> 0;
            _loc17_ = _loc15_ - (MAP._dragX + MAP._startX);
            _loc18_ = _loc16_ - (MAP._dragY + MAP._startY);
            MAP._dragDistance = Math.abs(_loc17_ * _loc17_ + _loc18_ * _loc18_);
            if (MAP._dragDistance > 100) {
                MAP._dragged = true;
                BFOUNDATION.updateAllRasterData();
            }
        }
        let _loc2_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc3_: int = GLOBAL._ROOT.stage.stageHeight;
        let _loc4_: int = -1615;
        let _loc5_: int = 2375;
        let _loc6_: int = -650;
        let _loc7_: int = 1325;
        let _loc8_: int = 670;
        let _loc9_: int = 760;
        let _loc10_: int = (_loc5_ - (_loc2_ >> 1)) | 0;
        let _loc11_: number = 2;
        if (GLOBAL._zoomed) {
            _loc10_ = ((_loc5_ - _loc2_ + _loc9_ / _loc11_) / _loc11_) | 0;
        }
        if (MAP.tx > _loc10_) {
            MAP.tx = _loc10_;
        }
        _loc10_ = (_loc4_ + (_loc2_ >> 1)) | 0;
        if (GLOBAL._zoomed) {
            _loc10_ = ((_loc4_ + _loc2_ + _loc9_ / _loc11_) / _loc11_) | 0;
        }
        if (MAP.tx < _loc10_) {
            MAP.tx = _loc10_;
        }
        _loc10_ = (_loc6_ + (_loc3_ >> 1)) | 0;
        if (GLOBAL._zoomed) {
            _loc10_ = ((_loc6_ + _loc3_ + _loc8_ / _loc11_) / _loc11_) | 0;
        }
        if (MAP.ty < _loc10_) {
            MAP.ty = _loc10_;
        }
        _loc10_ = (_loc7_ - (_loc3_ >> 1)) | 0;
        if (GLOBAL._zoomed) {
            _loc10_ = ((_loc7_ - _loc3_ + _loc8_ / _loc11_) / _loc11_) | 0;
        }
        if (MAP.ty > _loc10_) {
            MAP.ty = _loc10_;
        }
        MAP.d = 2;
        MAP.targX = MAP._GROUND.x;
        MAP.targY = MAP._GROUND.y;
        if (MAP.targX < MAP.tx) {
            MAP.targX += MAP.tx - MAP.targX >> 1;
        } else if (MAP.targX > MAP.tx) {
            MAP.targX -= MAP.targX - MAP.tx >> 1;
        }
        if (Math.abs(MAP.targX - MAP.tx) <= 2) {
            MAP.targX = MAP.tx;
            --MAP.d;
        }
        if (MAP.targY < MAP.ty - 1) {
            MAP.targY += MAP.ty - MAP.targY >> 1;
        } else {
            MAP.targY -= MAP.targY - MAP.ty >> 1;
        }
        if (Math.abs(MAP.targY - MAP.ty) <= 2) {
            MAP.targY = MAP.ty;
            --MAP.d;
        }
        if (!(MAP.d == 0 || MAP._autoScroll)) {
            MAP._GROUND.x = MAP.targX >> 0;
            MAP._GROUND.y = MAP.targY >> 0;
        }
        MAP._instance.resizeViewRect();
    }

    public get canvas(): BitmapData {
        return MAP._canvas;
    }

    public get canvasContainer(): Bitmap {
        return MAP._canvasContainer;
    }

    public get offset(): Point {
        this._point.x = MAP._canvasContainer.x;
        this._point.y = MAP._canvasContainer.y;
        return this._point;
    }

    public get viewRect(): Rectangle {
        return MAP._viewRect;
    }

    public resizeCanvas(): void {
        if (MAP._inited && MAP._canvas.width !== GLOBAL._SCREEN.width || MAP._canvas.height !== GLOBAL._SCREEN.height) {
            MAP._canvas = new BitmapData(GLOBAL._SCREEN.width, GLOBAL._SCREEN.height, true, 4278255360);
            MAP._canvasContainer.bitmapData = MAP._canvas;
            MAP._canvasContainer.x = GLOBAL._SCREEN.x;
            MAP._canvasContainer.y = GLOBAL._SCREEN.y;
            this._renderer.canvas = MAP._canvas;
        }
    }

    public resizeViewRect(): void {
        let _loc1_: Rectangle = GLOBAL._SCREEN;
        let _loc2_: int = 32;
        let _loc3_: int = 50;
        MAP._viewRect.width = _loc1_.width * (1 / MAP._GROUND.scaleX) + _loc2_;
        MAP._viewRect.height = _loc1_.height * (1 / MAP._GROUND.scaleY) + _loc2_;
        MAP._viewRect.x = -(MAP._GROUND.x * (1 / MAP._GROUND.scaleX)) - (1 / MAP._GROUND.scaleX - 1) * _loc3_ + (MAP.MAP_WIDTH >>> 1) + _loc1_.x - _loc2_;
        MAP._viewRect.y = -(MAP._GROUND.y * (1 / MAP._GROUND.scaleY)) - (1 / MAP._GROUND.scaleY - 1) * _loc3_ + (MAP.MAP_HEIGHT >>> 1) + _loc1_.y - _loc2_;
    }

    private render(param1: Event): void {
        if (PLANNER.ioCoversYard()) {
            return;
        }
        this._renderer.render();
    }
}
