import * as as3 from "as3";
import { Vector, int } from "as3";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { Sprite } from "flash/display";
import { ATTACK, BASE, BFOUNDATION, BTOWER, BUILDING22, CREEPS, DROPZONE_CLIP, GLOBAL, HOUSINGBUNKER, MAP, ResourceBombs, SIEGEWEAPONPOPUP, UI2 } from "@game";

export class DROPZONE extends DROPZONE_CLIP {
    static {
        as3.fields(this, { _size: 0, _middle: null, _dropTarget: 1, _targetedBuildings: null, _ioHit: null });
    }

    public static readonly GROUND: int = 1;

    public static readonly BUILDINGS: int = 2;

    public static readonly MONSTERS: int = 3;

    public static readonly SIEGEWEAPON_GROUND: int = 4;

    public static readonly SIEGEWEAPON_BUILDINGS: int = 5;

    public static readonly SIEGEWEAPON_GROUND_SPECIAL: int = 6;

    public static readonly SIEGEWEAPON_GROUND_SPECIAL_RADIUS: int = 30;
    public _size: int;
    public _middle: Point;
    public _dropTarget: int;
    private _targetedBuildings: Vector<BFOUNDATION>;

    public $ctor(param1: int = 32, param2: int = 1): void {
        this._middle = new Point(0, 0);
        this._targetedBuildings = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
        super.$ctor();
        this._size = param1;
        this._dropTarget = param2;
        this.ring1.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
        this.ring1.addEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
        this.ring1.mouseEnabled = true;
        this.ring1.buttonMode = true;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Follow));
        this.ring1.gotoAndStop(1);
        this.Update(this._size, param2);
    }

    public Update(param1: int, param2: int): void {
        this._size = param1;
        this._dropTarget = param2;
        this.ring1.width = this._size * 1.2;
        this.ring1.height = this._size * 1.2 * 0.5;
        this.ioMinHit();
    }

    /** Inferno-only (22 October): a ring smaller than a click (test mode's 0.01× to 0.1×) gets an unseen one round it. */
    private _ioHit: Sprite;

    private ioMinHit(): void {
        let w: number = this._size * 1.2;
        if (!GLOBAL.INFERNO_ONLY || w >= 40) {
            if (this._ioHit) {
                this._ioHit.visible = false;
            }
            return;
        }
        if (!this._ioHit) {
            // (a click a pixel or two off a ring 2 px across, or the ring a frame behind the pointer, went to the map:
            // nothing dropped; and so small its colour, where a drop is allowed, can't be seen: a cross marks it)
            let h: Sprite = new Sprite();
            h.graphics.beginFill(0, 0);
            h.graphics.drawEllipse(-20, -10, 40, 20);
            h.graphics.endFill();
            h.graphics.lineStyle(1, 0xffffff, 0.9);
            h.graphics.moveTo(-5, 0);
            h.graphics.lineTo(5, 0);
            h.graphics.moveTo(0, -3);
            h.graphics.lineTo(0, 3);
            h.buttonMode = true;
            h.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.Place));
            h.addEventListener(MouseEvent.MOUSE_DOWN, MAP.Click);
            this.addChild(h);
            this._ioHit = h;
        }
        this._ioHit.visible = true;
    }

    public Place(param1: MouseEvent): void {
        if (!MAP._dragged && ATTACK._countdown >= 0) {
            this.Drop();
        }
    }

    public Follow(param1: Event = null): void {
        if (MAP._GROUND) {
            this.x = MAP._GROUND.mouseX;
            this.y = MAP._GROUND.mouseY;
            switch (this._dropTarget) {
                case DROPZONE.GROUND:
                    if (!BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                        this.ring1.gotoAndStop(1);
                    } else {
                        this.ring1.gotoAndStop(2);
                    }
                    break;
                case DROPZONE.SIEGEWEAPON_GROUND:
                    if (!BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                        this.ring1.gotoAndStop(1);
                    } else {
                        this.ring1.gotoAndStop(2);
                    }
                    this.UpdateTargetBuildings(this.x, this.y, this._size);
                    break;
                case DROPZONE.SIEGEWEAPON_GROUND_SPECIAL:
                    if (!BASE.BuildingOverlap(new Point(this.x, this.y), DROPZONE.SIEGEWEAPON_GROUND_SPECIAL_RADIUS, true, true, true)) {
                        this.ring1.gotoAndStop(1);
                    } else {
                        this.ring1.gotoAndStop(2);
                    }
                    this.UpdateTargetBuildings(this.x, this.y, this._size);
                    break;
                case DROPZONE.BUILDINGS:
                case DROPZONE.SIEGEWEAPON_BUILDINGS:
                    if (BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                        this.ring1.gotoAndStop(1);
                    } else {
                        this.ring1.gotoAndStop(2);
                    }
                    this.UpdateTargetBuildings(this.x, this.y, this._size);
                    break;
                case DROPZONE.MONSTERS:
                    if (CREEPS.CreepOverlap(new Point(this.x, this.y), this._size)) {
                        this.ring1.gotoAndStop(1);
                    } else {
                        this.ring1.gotoAndStop(2);
                    }
            }
        }
    }

    public Clear(): void {
        while (this._targetedBuildings.length) {
            let b: BFOUNDATION = this._targetedBuildings.pop();
            if (GLOBAL.INFERNO_ONLY) {
                b.ioTarget(false);
            } else {
                b.disableHighlight();
            }
        }
    }

    public Destroy(): void {
        this.Clear();
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Follow));
    }

    public get isOverTarget(): boolean {
        return this._targetedBuildings.length > 0;
    }

    public UpdateTargetBuildings(param1: number, param2: number, param3: number): void {
        let _loc4_: int = 0;
        // (Inferno-only, 26 October: the yard's hover outline, not a tint; kept on the buildings still under the ring,
        // not taken off and made again every frame)
        let was: Vector<BFOUNDATION> = null;
        if (GLOBAL.INFERNO_ONLY) {
            was = this._targetedBuildings;
            this._targetedBuildings = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
        } else {
            this.Clear();
        }
        BASE.GetBuildingOverlap(param1, param2, param3, this._targetedBuildings);
        switch (this._dropTarget) {
            case DROPZONE.SIEGEWEAPON_BUILDINGS:
                _loc4_ = (this._targetedBuildings.length - 1) | 0;
                while (_loc4_ >= 0) {
                    if (!(as3.vget(this._targetedBuildings, _loc4_) instanceof BTOWER)) {
                        this._targetedBuildings.splice(_loc4_, 1);
                    }
                    _loc4_--;
                }
                break;
            case DROPZONE.SIEGEWEAPON_GROUND_SPECIAL:
                _loc4_ = (this._targetedBuildings.length - 1) | 0;
                while (_loc4_ >= 0) {
                    if (!(as3.vget(this._targetedBuildings, _loc4_) instanceof BUILDING22) && !(as3.vget(this._targetedBuildings, _loc4_) instanceof HOUSINGBUNKER)) {
                        this._targetedBuildings.splice(_loc4_, 1);
                    }
                    _loc4_--;
                }
        }
        if (was) {
            for (const b of as3.values(was)) {
                if (this._targetedBuildings.indexOf(b) < 0) {
                    b.ioTarget(false);
                }
            }
            for (const b of as3.values(this._targetedBuildings)) {
                b.ioTarget(true);
            }
            return;
        }
        _loc4_ = 0;
        while (_loc4_ < this._targetedBuildings.length) {
            as3.vget(this._targetedBuildings, _loc4_).highlight(3355545);
            _loc4_++;
        }
    }

    public Drop(): void {
        let _loc1_: SIEGEWEAPONPOPUP = null;
        switch (this._dropTarget) {
            case DROPZONE.GROUND:
                if (!BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                    ATTACK.Spawn(new Point(this.x, this.y), (this._size / 2) | 0);
                }
                break;
            case DROPZONE.BUILDINGS:
                if (BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                    ResourceBombs.BombDrop();
                }
                break;
            case DROPZONE.MONSTERS:
                if (CREEPS.CreepOverlap(new Point(this.x, this.y), this._size)) {
                    ResourceBombs.BombDrop();
                }
                break;
            case DROPZONE.SIEGEWEAPON_GROUND:
                if (BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                    break;
                }
                if (ResourceBombs._state == 1) {
                    ResourceBombs.BombDrop();
                    break;
                }
                _loc1_ = UI2._top._siegeweapon;
                if (Boolean(_loc1_) && _loc1_._state == 1) {
                    _loc1_.Fire(this.x | 0, this.y | 0);
                }
                break;
            case DROPZONE.SIEGEWEAPON_BUILDINGS:
                if (!BASE.BuildingOverlap(new Point(this.x, this.y), this._size, true, true, true)) {
                    break;
                }
                // The Inferno Catapult aims Candy Jars and Marilyn Monstroe with these same circles.
                if (ResourceBombs._state == 1) {
                    ResourceBombs.BombDrop();
                    break;
                }
                _loc1_ = UI2._top._siegeweapon;
                if (Boolean(_loc1_) && _loc1_._state == 1) {
                    _loc1_.Fire(this.x | 0, this.y | 0);
                }
                break;
            case DROPZONE.SIEGEWEAPON_GROUND_SPECIAL:
                if (BASE.BuildingOverlap(new Point(this.x, this.y), DROPZONE.SIEGEWEAPON_GROUND_SPECIAL_RADIUS, true, true, true)) {
                    break;
                }
                if (ResourceBombs._state == 1) {
                    ResourceBombs.BombDrop();
                    break;
                }
                _loc1_ = UI2._top._siegeweapon;
                if (Boolean(_loc1_) && _loc1_._state == 1) {
                    _loc1_.Fire(this.x | 0, this.y | 0);
                }
                break;
        }
    }
}
