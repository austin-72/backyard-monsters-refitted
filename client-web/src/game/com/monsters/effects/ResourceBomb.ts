import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOWER, CREEPS, Enrage, GLOBAL, InstanceManager, IoSulfurShield, MAP, MonsterBase, PATHING, ResourceBombParticle, SPRITES, TemporaryComponent } from "@game";

export class ResourceBomb extends ASObject {
    static {
        as3.fields(this, { position: null, positionFromISO: null, size: 0, damage: 0, particles: null, i: 0, particleCount: 0, angle: NaN, distance: 0, damageSum: 0, targets: null, bomb: null, tempPoint: null, dist: 0, tempBuilding: null, mctop: null, mcbottom: null, totalDamage: 0, resourceid: 0, dpp: 0, ioPicture: false });
    }

    private static readonly k_PUTTY_BOMB_ENRAGE: string = "PuttyBombEnrage";
    private position: Point;
    private positionFromISO: Point;
    private size: int;
    private damage: int;
    private particles: any;
    private i: int;
    private particleCount: int;
    private angle: number;
    private distance: int;
    private damageSum: int;
    private targets: any[];
    private bomb: any;
    private tempPoint: Point;
    private dist: int;
    private tempBuilding: any[];
    private mctop: DisplayObject;
    private mcbottom: DisplayObject;
    private totalDamage: int;
    private resourceid: int;
    private dpp: int;
    /** Inferno-only: a replay's shot (IoReplayPlayer): only its picture, it hurts nothing. */
    public ioPicture: boolean;

    public $ctor(param1?: MovieClip, param2?: Point, param3?: any, param4?: int): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: Vector<any> = null;
        let _loc8_: BFOUNDATION = null;
        let _loc9_: Point = null;
        let _loc10_: number = NaN;
        let _loc11_: number = NaN;
        let _loc12_: number = NaN;
        let _loc13_: number = NaN;
        let _loc14_: number = NaN;
        let _loc15_: number = NaN;
        let _loc16_: any = null;
        let _loc17_: any = null;
        let _loc18_: any = null;
        let _loc19_: number = NaN;
        let _loc20_: number = NaN;
        let _loc21_: number = NaN;
        this.particles = {};
        this.targets = [];
        super.$ctor();
        this.position = param2;
        this.size = param3.radius | 0;
        this.bomb = param3;
        this.damage = param3.damage | 0;
        this.damageSum = 0;
        this.resourceid = param3.resource | 0;
        this.positionFromISO = PATHING.FromISO(this.position);
        if (this.resourceid != ResourceBombParticle.k_TYPE_PUTTY) {
            _loc7_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc8_ of (_loc7_ ?? [])) {
                _loc9_ = new Point(_loc8_._mc.x, _loc8_._mc.y + _loc8_._middle);
                if (!(_loc8_._class == "trap" || _loc8_.health <= 0 || _loc8_._class == "decoration" || _loc8_._class == "enemy" || _loc8_._class == "immovable")) {
                    _loc10_ = Math.atan2(this.position.y - _loc9_.y, this.position.x - _loc9_.x);
                    _loc11_ = BASE.EllipseEdgeDistanceSqrd(_loc10_, this.size, (this.size * BASE._angle) | 0);
                    _loc10_ = Math.atan2(_loc9_.y - this.position.y, _loc9_.x - this.position.x);
                    _loc12_ = BASE.EllipseEdgeDistanceSqrd(_loc10_, (_loc8_._size * 0.5) | 0, (_loc8_._size * 0.5 * BASE._angle) | 0);
                    _loc13_ = this.position.x - _loc9_.x;
                    _loc14_ = this.position.y - _loc9_.y;
                    _loc15_ = _loc13_ * _loc13_ + _loc14_ * _loc14_;
                    if (_loc15_ * _loc15_ < (_loc11_ + _loc12_) * (_loc11_ + _loc12_)) {
                        this.targets.push([_loc8_, 1 - 1 / (this.size * 0.5) * this.dist, this.tempPoint, _loc8_._footprint[0].width * 0.5]);
                    }
                }
            }
        } else {
            _loc18_ = CREEPS._creeps;
            for (_loc16_ of as3.values(_loc18_)) {
                this.tempPoint = PATHING.FromISO(new Point(_loc16_.x, _loc16_.y));
                if (_loc16_._creatureID.substr(0, 1) == "G") {
                    _loc17_ = SPRITES._sprites[_loc16_._spriteID];
                } else {
                    _loc17_ = SPRITES._sprites[_loc16_._creatureID];
                }
                this.tempPoint.add(as3.cast(_loc17_.middle, Point));
                _loc19_ = this.positionFromISO.x - this.tempPoint.x;
                _loc20_ = this.positionFromISO.y - this.tempPoint.y;
                _loc21_ = this.size * 0.5;
                if (_loc19_ * _loc19_ + _loc20_ * _loc20_ < _loc21_ * _loc21_) {
                    this.targets.push([_loc16_]);
                }
            }
        }
        this.mctop = MAP._BUILDINGTOPS.addChild(new MovieClip());
        this.mcbottom = MAP._BUILDINGBASES.addChild(new MovieClip());
        _loc6_ = this.bomb.particles | 0;
        while (_loc5_ < _loc6_) {
            _loc10_ = Math.random() * 360 * 0.0174532925;
            this.distance = (Math.random() * this.size / 2) | 0;
            this.particles[_loc5_] = new ResourceBombParticle(as3.cast(this.mctop, MovieClip), as3.cast(this.mcbottom, MovieClip), new Point(this.position.x + Math.sin(_loc10_) * this.distance, this.position.y + Math.cos(_loc10_) * this.distance * 0.5), this, as3.str(_loc5_.toString()), param4, this.resourceid);
            ++this.particleCount;
            _loc5_++;
        }
        this.dpp = (param3.damage / this.particleCount) | 0;
    }

    public RemoveParticle(param1: string): void {
        if (!this.particles[param1]) {
            return;
        }

        this.particles[param1].clear();
        delete this.particles[param1];
        --this.particleCount;
    }

    public Damage(param1: Point): void {
        if (this.ioPicture) {
            return;
        }
        let _loc2_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any[] = null;
        let _loc6_: BFOUNDATION = null;
        let _loc7_: number = NaN;
        let _loc8_: MonsterBase = null;
        let _loc3_: int = this.targets.length | 0;
        param1 = PATHING.FromISO(param1);
        if (this.resourceid !== ResourceBombParticle.k_TYPE_PUTTY) {
            for (_loc5_ of as3.values(this.targets)) {
                _loc6_ = as3.cast(_loc5_[0], BFOUNDATION);
                _loc7_ = _loc5_[1] * 0.5 + 0.5;
                _loc4_ = _loc6_._type != 6 ? (_loc7_ * this.dpp) | 0 : this.dpp;
                if (_loc6_._type == 6) {
                    _loc4_ = (_loc4_ * _loc6_._lvl.Get()) | 0;
                }
                if (_loc6_._class == "wall") {
                    _loc4_ = (_loc4_ * 0.06) | 0;
                }
                if (_loc6_._class == "tower") {
                    _loc4_ = (_loc4_ * 0.9) | 0;
                    if (_loc6_._type != 22 && _loc6_._type != 128 && (as3.as(_loc6_, BTOWER)).isJard) {
                        _loc4_ = 0;
                    }
                }
                if (_loc6_._type == 114) {
                    _loc4_ = 0;
                }
                this.totalDamage += _loc4_;
                _loc6_.modifyHealth(_loc4_);
            }
        } else {
            _loc2_ = 0;
            while (_loc2_ < _loc3_) {
                // (Inferno-only: a burrowed monster is not drawn, but a Sulfur Bomb still reaches it underground)
                if ((Boolean(this.targets[_loc2_][0]._visible) || GLOBAL.INFERNO_ONLY && this.targets[_loc2_][0] instanceof MonsterBase && as3.cast(this.targets[_loc2_][0], MonsterBase)._movement == "burrow" && as3.cast(this.targets[_loc2_][0], MonsterBase).health > 0) && !this.targets[_loc2_][0].dead) {
                    if (this.targets[_loc2_][0] instanceof MonsterBase) {
                        if (!(_loc8_ = as3.as(this.targets[_loc2_][0], MonsterBase)).getComponentByName(ResourceBomb.k_PUTTY_BOMB_ENRAGE)) {
                            if (this.bomb.kind == "sulfur" && GLOBAL.INFERNO_ONLY) {
                                // Inferno Sulfur Bomb: speed, invulnerable at first, then armour fading to 0
                                _loc8_.addComponent(new IoSulfurShield(Number(this.bomb.speed), Number(Number(this.bomb.invuln) || 0), Number(this.bomb.speedlength), Number(this.bomb.hasOwnProperty("armor") ? Number(this.bomb.armor) : 99)), ResourceBomb.k_PUTTY_BOMB_ENRAGE);
                            } else {
                                _loc8_.addComponent(new TemporaryComponent(new Enrage(Number(this.bomb.speed), Number(this.bomb.damageMult), this.bomb.kind == "sulfur" ? "IO_SULFUR" : null), Number(this.bomb.speedlength)), ResourceBomb.k_PUTTY_BOMB_ENRAGE);
                            }
                        }
                    }
                }
                _loc2_++;
            }
        }
    }

    public Tick(): boolean {
        return !this.particleCount;
    }

    /** Inferno-only (a replay going back to its start): the bomb and what it left on the ground, gone. */
    public ioRemove(): void {
        for (let id in this.particles) {
            this.RemoveParticle(id);
        }
        if (this.mctop && this.mctop.parent) {
            this.mctop.parent.removeChild(this.mctop);
        }
        if (this.mcbottom && this.mcbottom.parent) {
            this.mcbottom.parent.removeChild(this.mcbottom);
        }
    }

    public Freeze(): void {
        if (Boolean(this.mctop) && Boolean(this.mctop.parent)) {
            this.mctop.parent.removeChild(this.mctop);
            this.mcbottom.cacheAsBitmap = true;
        }
    }
}
