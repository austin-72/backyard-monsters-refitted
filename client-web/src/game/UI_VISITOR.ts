import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ATTACK, BASE, BFOUNDATION, BUILDING11, BUILDINGS, EnumYardType, GLOBAL, InstanceManager, KEYS, LOGIN, MAP, MAPROOM_DESCENT, MapRoom3Cell, MapRoomCell, MapRoomManager, Maproom3AttackCostPopup, POPUPS, ResourceBar1, ResourceBar2, ResourceBar3, ResourceBar4, UI_VISITOR_CLIP, button_buildings, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class UI_VISITOR extends UI_VISITOR_CLIP {
    static {
        as3.fields(this, { m_resourceBar1: null, m_resourceBar2: null, m_resourceBar3: null, m_resourceBar4: null, m_oldScreen: null, attackCostPopup: null });
    }

    public static _helpButtons: MovieClip = null;

    private static s_mc: MovieClip = null;
    protected m_resourceBar1: ResourceBar1;
    protected m_resourceBar2: ResourceBar2;
    protected m_resourceBar3: ResourceBar3;
    protected m_resourceBar4: ResourceBar4;
    protected m_oldScreen: Rectangle;
    private attackCostPopup: Maproom3AttackCostPopup;

    public $ctor(): void {
        super.$ctor();
        UI_VISITOR.s_mc = this.mc;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            this.mc.mcBG.width = 100;
            this.mc.bReturn.SetupKey("btn_endattack");
            this.mc.bAttack.visible = false;
        } else if (MapRoomManager.instance.isInMapRoom2or3 && GLOBAL._currentCell && !BASE.usesInfernoBackend) {
            this.mc.bReturn.SetupKey("btn_openmap");
            if ((GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) && !MapRoomManager.instance.viewOnly && GLOBAL._currentCell && (MapRoomManager.instance.flingerInRange || GLOBAL.ioTestMode())) {
                if (GLOBAL._currentCell.isDestroyed && GLOBAL._currentCell.baseType != 2) {
                    this.mc.bAttack.SetupKey("newmap_take_btn");
                } else {
                    this.mc.bAttack.SetupKey("map_attack_btn");
                }
                this.mc.bAttack.visible = true;
                if (MapRoomManager.instance.isInMapRoom3) {
                    this.mc.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.AttackMR3));
                } else {
                    this.mc.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
                }
                if ((GLOBAL._currentCell.isLocked || this.isLevelLimited || !ATTACK.hasCreaturesToAttackWith) && !GLOBAL.ioTestMode()) {
                    this.mc.bAttack.Enabled = false;
                } else {
                    this.mc.bAttack.Enabled = true;
                }
            } else {
                this.mc.bAttack.visible = false;
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) {
                    this.mc.mcBG.width = 100;
                }
            }
        } else {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) {
                this.mc.mcBG.width = 100;
            }
            this.mc.bReturn.SetupKey("btn_returnhome");
            this.mc.bAttack.visible = false;
        }
        if (MapRoomManager.instance.isInMapRoom3 && this.mc.bAttack.visible && Boolean(this.mc.bAttack.Enabled)) {
        }
        this.mc.bReturn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ReturnCB));
        this.mc.gotoAndStop(1);
        this.Update();
    }

    public static get mc(): MovieClip {
        return UI_VISITOR.s_mc;
    }

    public static Focus(param1: BFOUNDATION): Function {
        let building: BFOUNDATION = null;
        building = param1;
        return (param1: MouseEvent = null): void => {
            MAP.FocusTo(building._mc.x | 0, building._mc.y | 0, 0.6);
            BASE.BuildingSelect(building, true);
        };
    }

    public get isLevelLimited(): boolean {
        return BASE.loadObject["canattack"] == false;
    }

    public Taunt(param1: MouseEvent = null): void {
        BUILDINGS.Show();
    }

    public Gift(param1: MouseEvent = null): void {
        BUILDINGS.Show();
    }

    public ReturnCB(param1: MouseEvent): void {
        let _loc2_: int = 0;
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            ATTACK.End();
        } else if (MapRoomManager.instance.isInMapRoom2or3 && GLOBAL._currentCell && GLOBAL._loadmode == GLOBAL.mode) {
            MapRoomManager.instance.SetupAndShow();
        } else if (BASE.usesInfernoBackend) {
            _loc2_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            if (MAPROOM_DESCENT.InDescent) {
                BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc2_);
            } else {
                BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, GLOBAL.e_BASE_MODE.IBUILD, false, EnumYardType.INFERNO_YARD);
            }
        } else {
            _loc2_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc2_);
        }
    }

    public AttackMR3(param1: MouseEvent): void {
        let _loc2_: MapRoom3Cell = as3.as(GLOBAL._currentCell, MapRoom3Cell);
        if (!_loc2_) {
            return;
        }
        if (!ATTACK.hasCreaturesToAttackWith) {
            GLOBAL.Message(KEYS.Get("msg_nocreaturesattack"));
            return;
        }
        if (_loc2_.isLocked) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_attack"));
            return;
        }
        if (this.isLevelLimited) {
            GLOBAL.Message(KEYS.Get("map_msg_leveltoolow"));
            return;
        }
        if (_loc2_.hasTruce) {
            GLOBAL.Message(KEYS.Get("newmap_truce"));
            return;
        }
        if (_loc2_.hasDamageProtection) {
            GLOBAL.Message(KEYS.Get("newmap_dp"));
            return;
        }
        if (_loc2_.isInAttackRange) {
            this.loadAttack();
        } else {
            if (!this.attackCostPopup) {
                this.attackCostPopup = new Maproom3AttackCostPopup(_loc2_);
                this.attackCostPopup.addEventListener(Maproom3AttackCostPopup.k_LOAD_ATTACK, as3.bind(this, this.clickedLoadAttack));
            }
            POPUPS.Push(this.attackCostPopup.graphic);
        }
    }

    protected clickedLoadAttack(param1: Event): void {
        this.attackCostPopup.removeEventListener(Maproom3AttackCostPopup.k_LOAD_ATTACK, as3.bind(this, this.clickedLoadAttack));
        POPUPS.Next();
        this.loadAttack(this.attackCostPopup.addtionalLoadParameters);
        this.attackCostPopup = null;
    }

    private loadAttack(param1: any = null): void {
        let _loc2_: MapRoom3Cell = null;
        _loc2_ = as3.as(GLOBAL._currentCell, MapRoom3Cell);
        let _loc3_: int = MapRoomManager.instance.CalculateCellId(_loc2_.cellX, _loc2_.cellY);
        BASE.LoadBase(null, 0, _loc2_.baseID, !_loc2_.userID ? GLOBAL.e_BASE_MODE.WMATTACK : GLOBAL.e_BASE_MODE.ATTACK, false, _loc2_.cellType, _loc3_, !(!param1) ? ["attackcost", JSON.stringify(param1)] : null);
    }

    public Attack(param1: MouseEvent): void {
        let _loc2_: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
        // Admin test mode: a practice attack on any yard.
        if (_loc2_ && GLOBAL.ioTestMode()) {
            MapRoom.showAttackWait = true;
            MapRoomManager.instance.Show();
            return;
        }
        if (_loc2_) {
        }
        if (Boolean(_loc2_) && _loc2_.isLocked) {
            if (_loc2_.online) {
                GLOBAL.Message(KEYS.Get("msg_cantattackoccupied"));
            } else {
                GLOBAL.Message(KEYS.Get("msg_cantattackbeingattacked"));
            }
        } else if (_loc2_) {
            if (_loc2_.isDestroyed) {
                MapRoom.showEnemyWait = true;
                MapRoomManager.instance.Show();
            } else if (!_loc2_.isProtected && !(_loc2_.truce && _loc2_.truce > GLOBAL.Timestamp())) {
                MapRoom.showAttackWait = true;
                MapRoomManager.instance.Show();
            } else if (_loc2_.isProtected) {
                GLOBAL.Message(KEYS.Get("newmap_dp"));
            } else if (Boolean(_loc2_.truce) && _loc2_.truce > GLOBAL.Timestamp()) {
                GLOBAL.Message(KEYS.Get("newmap_truce"));
            }
        }
    }

    public Update(): void {
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: boolean = false;
        let _loc5_: int = 0;
        let _loc6_: MovieClip = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            if (ATTACK._countdown < 0) {
                this.mc.bReturn.Highlight = true;
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP) {
            if (Boolean(UI_VISITOR._helpButtons) && this.mc.contains(UI_VISITOR._helpButtons)) {
                this.mc.removeChild(UI_VISITOR._helpButtons);
            }
            UI_VISITOR._helpButtons = as3.as(this.mc.addChild(new MovieClip()), MovieClip);
            UI_VISITOR._helpButtons.x = MapRoomManager.instance.isInMapRoom3 ? 310 : 210;
            UI_VISITOR._helpButtons.y = 5;
            _loc1_ = 0;
            _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc3_ of (_loc2_ ?? [])) {
                if (_loc3_._countdownBuild.Get() + _loc3_._countdownUpgrade.Get() + _loc3_._countdownFortify.Get() > 0) {
                    _loc4_ = false;
                    for (const $value of as3.values(_loc3_._helpList)) {
                        _loc5_ = $value | 0;
                        if (_loc5_ == LOGIN._playerID) {
                            _loc4_ = true;
                            break;
                        }
                    }
                    this.mc.gotoAndStop(2);
                    if (MapRoomManager.instance.isInMapRoom3) {
                        this.mc.getChildAt(2).x = 200;
                    }
                    (_loc6_ = new button_buildings()).gotoAndStop(_loc3_._type);
                    _loc6_.x = _loc1_ * 45;
                    if (!_loc4_) {
                        _loc6_.buttonMode = true;
                        _loc6_.addEventListener(MouseEvent.CLICK, UI_VISITOR.Focus(_loc3_));
                        _loc6_.mcTick.visible = false;
                    }
                    UI_VISITOR._helpButtons.addChild(_loc6_);
                    _loc1_++;
                }
            }
            if (_loc1_ > 0) {
                this.mc.mcBG.width = (MapRoomManager.instance.isInMapRoom3 ? 320 : 220) + _loc1_ * 45;
            } else {
                this.mc.mcBG.width = MapRoomManager.instance.isInMapRoom3 ? 210 : 100;
                this.mc.gotoAndStop(1);
            }
        }
        this.Resize();
    }

    public Resize(): void {
        if (!this.m_oldScreen || !GLOBAL._SCREEN.equals(this.m_oldScreen)) {
            GLOBAL.RefreshScreen();
            this.m_oldScreen = GLOBAL._SCREEN.clone();
        }
        this.mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this.mc.mcBG.width - 10;
        if (GLOBAL._flags.viximo) {
            this.mc.y = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - (this.mc.height + 10);
        } else {
            this.mc.y = GLOBAL._SCREENHUD.y - (this.mc.mcBG.height + 10);
        }
        let _loc1_: int = 4;
        while (_loc1_ > 0) {
            if (this["m_resourceBar" + _loc1_]) {
                this["m_resourceBar" + _loc1_].x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - 10 - this["m_resourceBar" + _loc1_].width * 0.5;
                this["m_resourceBar" + _loc1_].y = GLOBAL._SCREEN.y + _loc1_ * 40;
            }
            _loc1_--;
        }
    }

    public checkMapRoomHealth(): void {
        let _loc1_: BUILDING11 = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING11);
        if (_loc2_.length === 0) {
            return;
        }
        _loc1_ = as3.as(as3.vget(_loc2_, 0), BUILDING11);
        if (_loc1_.health < _loc1_.maxHealth / 2) {
            this.mc.bReturn.SetupKey("btn_returnhome");
        }
    }
}
