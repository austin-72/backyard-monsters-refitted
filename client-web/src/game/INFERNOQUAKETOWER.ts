import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Shape } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { Dictionary } from "flash/utils";
import { ATTACK, BASE, BTOWER, BuildingOverlay, GLOBAL, GRID, IAttackable, KEYS, MonsterBase, POPUPS, QUEUE, SOUNDS, Targeting, TweenLite, Vacuum, VacuumHose, popup_building } from "@game";

export class INFERNOQUAKETOWER extends BTOWER {
    static {
        as3.fields(this, { _shouldAnimate: false });
    }

    public static readonly UNDERHALL_ID: int = 999;

    public static readonly TYPE: int = 129;
    private _shouldAnimate: boolean;

    public $ctor(): void {
        super.$ctor();
        this._type = 129;
        this._top = 40;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
        this.Props();
        this.attackFlags = Targeting.getOldStyleTargets(-1);
    }

    public override PlaceB(): void {
        super.PlaceB();
        this._origin = new Point(this._mc.x, this._mc.y);
    }

    public override FollowMouseB(param1: Event = null): void {
        super.FollowMouseB(param1);
        this._origin = new Point(this._mc.x, this._mc.y);
    }

    public override StopMoveB(): void {
        super.StopMoveB();
        this._origin = new Point(this._mc.x, this._mc.y);
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (this._shake > 0) {
            this._mc.x = this._origin.x - 2 + Math.random() * 4;
            this._mc.y = this._origin.y - 2 + Math.random() * 4;
            this._mcBase.x = this._origin.x - 1 + Math.random() * 2;
            this._mcBase.y = this._origin.y - 1 + Math.random() * 2;
            --this._shake;
            if (this._shake == 0) {
                this._mc.x = this._origin.x;
                this._mc.y = this._origin.y;
                this._mcBase.x = this._origin.x;
                this._mcBase.y = this._origin.y;
            }
        }
    }

    public override Update(param1: boolean = false): void {
        let _loc2_: int = 0;
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        if (GLOBAL._render || param1) {
            _loc3_ = [];
            if (this._repairing == 1) {
                _loc4_ = 0;
                _loc5_ = this._lvl.Get() == 0 ? 0 : (this._lvl.Get() - 1) | 0;
                _loc4_ = Math.ceil(this.maxHealth / Math.min(3600, Number(this._buildingProps.repairTime[_loc5_]))) | 0;
                this._repairTime = (((this.maxHealth - this.health) | 0) / _loc4_) | 0;
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_repairing"), GLOBAL.ToTime(this._repairTime, true));
            } else if (this._countdownBuild.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_building"), GLOBAL.ToTime(this._countdownBuild.Get() | 0, true));
            } else if (this._countdownUpgrade.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_upgrading"), GLOBAL.ToTime(this._countdownUpgrade.Get() | 0, true));
            } else if (this._countdownFortify.Get() > 0) {
                QUEUE.Update("building" + this._id, KEYS.Get("ui_worker_stacktitle_fortifying"), GLOBAL.ToTime(this._countdownFortify.Get() | 0, true));
            }
            if (this._class != "mushroom") {
                BuildingOverlay.Update(this, param1);
            }
            if (this.health <= 0) {
                this.Render("destroyed");
            } else if (this.health < this.maxHealth * 0.5) {
                this.Render("damaged");
            } else {
                this.Render("");
            }
        }
    }

    public override TickAttack(): void {
        if (this.health <= 0) {
            this._animTick = 0;
            return;
        }
        if (this._shouldAnimate) {
            ++this._frameNumber;
            if (this._frameNumber % 6 == 0 || this._animTick >= this._animFrames - 4) {
                this.AnimFrame(false);
                if (this._animTick < this._animFrames) {
                    if (this._animTick == this._animFrames - 6) {
                        SOUNDS.Play("quake", !this.isJard ? 0.8 : 0.4);
                    }
                    ++this._animTick;
                } else {
                    this._shouldAnimate = false;
                    this.DelayedFire();
                }
            }
        } else {
            super.TickAttack();
        }
    }

    public override Fire(param1: IAttackable): void {
        if (this.health <= 0) {
            return;
        }
        this._shouldAnimate = true;
        this._animTick = 0;
        super.Fire(param1);
    }

    private DelayedFire(): void {
        let _loc3_: QuakeGraphic = null;
        let _loc1_: number = 1;
        let _loc2_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc2_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * 3 * _loc1_ * _loc2_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 3 * _loc1_ * _loc2_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else {
            this.Quake((this.damage * _loc1_ * _loc2_) | 0);
            // One ring per tower at a time. The stock ring carried a 20 px glow filter while it grew
            // to twice the tower's range, which Flash has to blur again on every frame at that size.
            // A yard with two Quake towers could afford that; converted tribe yards have many.
            if (!QuakeGraphic.isBusy(this._mc)) {
                _loc3_ = new QuakeGraphic(20, (this._range * 2) >>> 0, this._mc);
                _loc3_.graphic.y += this._top;
                this._mc.addChild(_loc3_.graphic);
            }
        }
        this._origin = new Point(this._mc.x, this._mc.y);
        this._shake = 10;
    }

    private Quake(param1: int): void {
        let _loc2_: any = null;
        let _loc3_: MonsterBase = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: VacuumHose = null;
        let _loc6_: any[] = this.GetCreepsInRange();
        for (_loc8_ in _loc6_) {
            _loc2_ = _loc6_[_loc8_];
            _loc3_ = as3.cast(_loc2_.creep, MonsterBase);
            if (Targeting.ioAirborne(_loc3_)) {
                continue;
            }
            _loc4_ = _loc2_.dist | 0;
            // Every monster on (or under) the ground in range is hit, less the further out it is, down to a
            // fifth of the blow at the edge (the stock tower never went below a third; balance pass,
            // 30 September).
            if ((_loc5_ = (param1 / this._range * (this._range - _loc4_)) | 0) < param1 / 5) {
                _loc5_ = (param1 / 5) | 0;
            }
            // The whole blow goes to the monster: its shield (a Sulfur Bomb) takes its share first, and
            // only then is it more than the health left. The stock tower cut it to the health left
            // first, so under a 50% shield a monster on 200 took 100, then 50, 25, ... and never died.
            // What it counts as done is what the monster lost.
            let ioBefore: number = _loc3_.health;
            _loc3_.modifyHealth(-_loc5_);
            _loc7_ = (_loc7_ + Math.max(0, ioBefore - Math.max(0, _loc3_.health))) | 0;
        }
        if ((Boolean(_loc9_ = Vacuum.getHose())) && GLOBAL.QuickDistance(this._position, new Point(_loc9_.x, _loc9_.y)) < this._range) {
            _loc5_ = (param1 / this._range * (this._range - GLOBAL.QuickDistance(this._position, GLOBAL.townHall._position))) | 0;
            _loc9_.modifyHealth(-_loc5_);
            _loc7_ += _loc5_;
        }
        ATTACK.Damage(this._mc.x, this._mc.y - this._top, _loc7_);
    }

    /** The closest monster on (or under) the ground in range: flyers never set a Quake Tower off. */
    public override FindTargets(param1: int, param2: int): void {
        this._hasTargets = false;
        if (this._position == null || !this._footprint || this._footprint.length == 0) {
            return;
        }
        // (as the stock tower: what is on the ground sets it off, not what is burrowed; its blow hits both)
        let all: any[] = Targeting.getCreepsInRange(this._range, this._position.add(new Point(0, this._footprint[0].height / 2)), Targeting.getOldStyleTargets(0));
        let ok: any[] = [];
        for (let c of as3.values(all)) {
            if (!Targeting.ioAirborne(as3.cast(c.creep, MonsterBase))) {
                ok.push(c);
            }
        }
        if (!ok.length) {
            return;
        }
        as3.sortOn(ok, ["dist"], Array.NUMERIC);
        this._targetCreeps = [];
        let i: int = 0;
        while (i < ok.length && i < param1) {
            this._targetCreeps.push({ "creep": ok[i].creep, "dist": ok[i].dist, "position": ok[i].pos });
            i++;
        }
        this._hasTargets = true;
    }

    private GetCreepsInRange(): any[] {
        if (this._position == null || !this._footprint || this._footprint.length == 0) {
            return [];
        }
        return Targeting.getCreepsInRange(this._range, this._position.add(new Point(0, this._footprint[0].height / 2)), this.attackFlags);
    }

    public override Upgraded(): void {
        let _loc1_: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.isInfernoMainYardOrOutpost) {
            _loc1_ = new popup_building();
            _loc1_.tA.htmlText = "<b>" + KEYS.Get("pop_tupgraded_title", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": this._lvl.Get() }) + "</b>";
            _loc1_.tB.htmlText = KEYS.Get("pop_tupgraded_body", { "v1": KEYS.Get(as3.str(this._buildingProps.name)) });
            _loc1_.bPost.SetupKey("btn_brag");
            _loc1_.bPost.addEventListener(MouseEvent.CLICK, as3.bind(this, this.UpgradedBrag));
            _loc1_.bPost.Highlight = true;
            POPUPS.Push(_loc1_, null, null, null, "build.v2.png");
        }
    }

    private UpgradedBrag(param1: MouseEvent): void {
        GLOBAL.CallJS("sendFeed", ["build-" + String(this._buildingProps.name).toLowerCase(), KEYS.Get("upgrade_quaketower_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("upgrade_quaketower_streambody"), "quests/quake_tower.png"]);
        POPUPS.Next();
    }

    public override Constructed(): void {
        let _loc1_: MovieClip = null;
        super.Constructed();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.isInfernoMainYardOrOutpost) {
            _loc1_ = new popup_building();
            _loc1_.tA.htmlText = "<b>" + KEYS.Get("pop_tupgraded_title", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": this._lvl.Get() }) + "</b>";
            _loc1_.tB.htmlText = KEYS.Get("pop_tbuild_body", { "v1": KEYS.Get(as3.str(this._buildingProps.name)) });
            _loc1_.bPost.SetupKey("btn_brag");
            _loc1_.bPost.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ConstructedBrag));
            _loc1_.bPost.Highlight = true;
            POPUPS.Push(_loc1_, null, null, null, "build.v2.png");
        }
    }

    private ConstructedBrag(param1: MouseEvent): void {
        GLOBAL.CallJS("sendFeed", ["build-" + String(this._buildingProps.name).toLowerCase(), KEYS.Get("build_quaketower_streamtitle"), KEYS.Get("build_quaketower_streambody"), "quests/quake_tower.png"]);
        POPUPS.Next();
    }

    public override Setup(param1: any): void {
        param1.t = this._type;
        super.Setup(param1);
        this._origin = new Point(this._mc.x, this._mc.y);
        this._animRandomStart = false;
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        let _loc2_: Point = GRID.FromISO(this._origin.x, this._origin.y);
        _loc1_.X = _loc2_.x;
        _loc1_.Y = _loc2_.y;
        return _loc1_;
    }
}

class QuakeGraphic extends ASObject {
    static {
        as3.fields(this, { graphic: null, _owner: null });
    }

    /** Towers (their clips) that currently show a ring. */
    private static s_busy: Dictionary = new Dictionary(true);
    public graphic: Shape;
    private _owner: any;

    public $ctor(param1?: uint, param2?: uint, param3: any = null): void {
        super.$ctor();
        this._owner = param3;
        if (param3) {
            QuakeGraphic.s_busy.set(param3, true);
        }
        this.graphic = new Shape();
        // Layered strokes stand in for the glow: a wide faint one under a thin bright one.
        this.graphic.graphics.lineStyle(4, 3379402, 0.18);
        this.graphic.graphics.drawEllipse(-param1, -param1 / 2, param1 * 2, param1);
        this.graphic.graphics.lineStyle(1.5, 3379402, 0.55);
        this.graphic.graphics.drawEllipse(-param1, -param1 / 2, param1 * 2, param1);
        this.graphic.graphics.lineStyle(0.3, 6710988, 0.5);
        this.graphic.graphics.drawEllipse(-param1 * 0.8, -param1 / 2.5, param1 * 1.6, param1 * 0.8);
        this.graphic.graphics.drawEllipse(-param1 * 0.6, -param1 / 3.333333, param1 * 1.2, param1 * 0.6);
        TweenLite.to(this.graphic, 1, { "width": param2 * 2, "height": param2, "alpha": 0, "onComplete": as3.bind(this, this.onComplete) });
    }

    public static isBusy(param1: any): boolean {
        return QuakeGraphic.s_busy.get(param1) === true;
    }

    private onComplete(): void {
        if (this._owner) {
            QuakeGraphic.s_busy.delete(this._owner);
        }
        if (this.graphic && this.graphic.parent) {
            this.graphic.parent.removeChild(this.graphic);
        }
        this.graphic = null;
        this._owner = null;
    }
}
