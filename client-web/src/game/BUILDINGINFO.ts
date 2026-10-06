import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFieldAutoSize } from "flash/text";
import { ACADEMY, ALLIANCEWINDOW, AllianceMessagePopup, BASE, BFOUNDATION, BRESOURCE, BRIMSTONEPIT, BTRAP, BUILDING13, BUILDING14, BUILDINGOPTIONS, BUY, Button_CLIP, CHAMPIONCAGE, CHAMPIONCHAMBER, CREATURELOCKER, CREATURES, CasinoWindow, GLOBAL, HATCHERY, HATCHERYCC, HOUSING, INFERNOPORTAL, InstanceManager, IoHfoIce, IoTrapRearm, IoWallUpgrade, KEYS, LOGIN, MAP, MAPROOM, MAPROOM_DESCENT, MONSTERBAITER, MONSTERBUNKER, MONSTERLAB, MUSHROOMS, MapRoom3ConfirmMigrationPopup, MapRoom3RelocatePopup, MapRoomManager, PLANNER, RADIO, SALESPECIALSPOPUP, SIGNS, STORE, SiegeFactory, SiegeLab, TUTORIAL, buildingInfoData } from "@game";

export class BUILDINGINFO extends ASObject {
    public static _mc: MovieClip = null;

    public static _buttonsMC: MovieClip = null;

    public static _building: BFOUNDATION = null;

    public static _clickPoint: Point = null;

    public static _props: any = null;

    private static _positionSet: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: BFOUNDATION): void {
        if (Boolean(GLOBAL._selectedBuilding) && GLOBAL._selectedBuilding._moving) {
            return;
        }
        BUILDINGINFO._positionSet = false;
        BUILDINGINFO._building = param1;
        BUILDINGINFO._props = GLOBAL._buildingProps[BUILDINGINFO._building._type - 1];
        BUILDINGINFO._mc = as3.as(MAP._BUILDINGINFO.addChild(new buildingInfoData()), MovieClip);
        BUILDINGINFO._mc.tName.autoSize = TextFieldAutoSize.CENTER;
        let _loc2_: any = "<b>" + KEYS.Get(as3.str(BUILDINGINFO._building instanceof IoHfoIce ? as3.cast(BUILDINGINFO._building, IoHfoIce).nameKey : BUILDINGINFO._props.name)) + "</b>";
        let effectiveLvl: int = BUILDINGINFO._building.getEffectiveLevel();
        if (BUILDINGINFO._building._lvl.Get() > 0 && BUILDINGINFO._props.costs && BUILDINGINFO._props.costs.length > 1) {
            if (Boolean(BUILDINGINFO._props.names) && BUILDINGINFO._props.names.length > 1) {
                _loc2_ = "<b>" + KEYS.Get(as3.str(BUILDINGINFO._props.names[effectiveLvl - 1])) + "</b>";
            } else {
                _loc2_ += "<br><b>" + KEYS.Get("bdg_infopop_levelnum", { "v1": effectiveLvl }) + "</b>";
            }
            if (BUILDINGINFO._building._fortification.Get() > 0) {
                _loc2_ += "<br><b>" + KEYS.Get("bdg_fortified_level", { "v1": BUILDINGINFO._building._fortification.Get() }) + "</b>";
            }
            if (BUILDINGINFO._building._class == "tower" && BUILDINGINFO._building._type != 22 && GLOBAL._towerOverdrive && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp() && BUILDINGINFO._building._countdownBuild.Get() == 0 && BUILDINGINFO._building._countdownUpgrade.Get() == 0) {
                _loc2_ += "<font color=\"#0000ff\"> <br><b>" + KEYS.Get("bdg_25%boost") + "</b></font>";
            }
        }
        BUILDINGINFO._mc.tName.htmlText = _loc2_;
        // Inferno-only (bug report A10): the name centred over the buttons (x 6, 110 wide: the menu's
        // frame is wider when it has an info box beside them), and a long one ("Infernal Academy") made
        // smaller to stay over them
        if (GLOBAL.INFERNO_ONLY) {
            if (BUILDINGINFO._mc.tName.textWidth > 120) {
                BUILDINGINFO._mc.tName.autoSize = TextFieldAutoSize.NONE;
                BUILDINGINFO._mc.tName.width = 124;
                GLOBAL.ioFitText(as3.cast(BUILDINGINFO._mc.tName, TextField), 8);
            }
            // (by its drawn box: the library's text box starts 29 px right of the field's x)
            let ioNameBox: Rectangle = as3.cast(BUILDINGINFO._mc.tName.getBounds(BUILDINGINFO._mc), Rectangle);
            BUILDINGINFO._mc.tName.x += 6 + 55 - (ioNameBox.x + ioNameBox.width / 2);
        }
        BUILDINGINFO._mc.removeEventListener(Event.ENTER_FRAME, BUILDINGINFO.Tick);
        BUILDINGINFO._mc.addEventListener(Event.ENTER_FRAME, BUILDINGINFO.Tick);
        if (GLOBAL._zoomed) {
            BUILDINGINFO._mc.scaleX = BUILDINGINFO._mc.scaleY = 2;
        }
        BUILDINGINFO.Update();
    }

    public static Update(): void {
        let _loc4_: int = 0;
        let _loc5_: Vector<any> = null;
        let _loc6_: BFOUNDATION = null;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: boolean = false;
        let _loc13_: boolean = false;
        let _loc14_: Button_CLIP = null;
        let _loc15_: int = 0;
        let _loc16_: int = 0;
        let _loc17_: int = 0;
        let _loc18_: int = 0;
        let _loc19_: int = 0;
        let _loc20_: TextField = null;
        let _loc1_: any[] = [];
        let _loc2_: boolean = true;
        let _loc3_: boolean = MapRoomManager.instance.isInMapRoom3 && BASE.isOutpost;
        if (BUILDINGINFO._mc) {
            _loc5_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc6_ of (_loc5_ ?? [])) {
                if (_loc6_.health < _loc6_.maxHealth) {
                    _loc4_ += 1;
                }
            }
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                if (BUILDINGINFO._building.health < BUILDINGINFO._building.maxHealth) {
                    _loc2_ = false;
                    if (BUILDINGINFO._building._repairing == 0) {
                        _loc1_.push(["btn_repair", 30]);
                    } else {
                        _loc1_.push(["btn_speedup", 30, _loc4_ >= 2 ? false : true]);
                        if (_loc4_ >= 2) {
                            _loc1_.push(["btn_repairall", 30, true]);
                        }
                    }
                } else if (BUILDINGINFO._building._countdownBuild.Get() > 0) {
                    _loc2_ = false;
                    _loc1_.push(["btn_speedup", 30, true]);
                    if (TUTORIAL._stage > 100 && BUILDINGINFO._building._buildingProps.type != "decoration") {
                        _loc1_.push(["btn_stopbuild", 26]);
                    }
                } else if (BUILDINGINFO._building._countdownUpgrade.Get() > 0) {
                    _loc2_ = false;
                    _loc1_.push(["btn_speedup", 30, true]);
                    if (TUTORIAL._stage > 100) {
                        _loc1_.push(["btn_stopupgrade", 26]);
                    }
                } else if (BUILDINGINFO._building._countdownFortify.Get() > 0) {
                    _loc2_ = false;
                    _loc1_.push(["btn_speedup", 30, true]);
                    _loc1_.push(["btn_stopfortify", 26]);
                } else if (BUILDINGINFO._props.type == "resource") {
                    if (BASE.isOutpost) {
                        _loc1_.push(["btn_bank_disabled", 30, 0, true]);
                    } else {
                        if (TUTORIAL._stage != 20 && TUTORIAL._stage != 21) {
                            _loc1_.push(["btn_bank", 30, 0, GLOBAL.FormatNumber(BUILDINGINFO._building._stored.Get())]);
                        }
                        if (TUTORIAL._stage >= 200) {
                            _loc1_.push(["btn_bankall", 30]);
                        }
                    }
                }
                if (TUTORIAL._stage > 4) {
                    if (_loc2_) {
                        _loc12_ = true;
                        _loc13_ = false;
                        if (BUILDINGINFO._building._countdownBuild.Get() + BUILDINGINFO._building._countdownUpgrade.Get() + BUILDINGINFO._building._countdownFortify.Get() > 0 || BUILDINGINFO._building._repairing > 0) {
                            _loc1_.push(["btn_speedup", 30, true]);
                            _loc13_ = true;
                        }
                        if (BUILDINGINFO._props.id == 8) {
                            if (BASE.isInfernoMainYardOrOutpost) {
                                _loc1_.push(["btn_openstrongbox", 30, true]);
                            } else {
                                _loc1_.push(["btn_openlocker", 30, true]);
                            }
                            if (CREATURELOCKER._unlocking != null && !_loc13_) {
                                _loc1_.push(["btn_speedup", 30, true]);
                            }
                        } else if (BUILDINGINFO._props.id == 9) {
                            _loc1_.push(["btn_juicemonsters", 30, true]);
                            if (CREATURES._guardian) {
                                _loc1_.push(["btn_juiceguardian", 30, true]);
                            }
                        } else if (BUILDINGINFO._props.id == 10) {
                            _loc1_.push(["btn_yardplanner", 30, true]);
                        } else if (BUILDINGINFO._props.id == 11 || BUILDINGINFO._props.id == 5 || BUILDINGINFO._props.id == 51) {
                            // "New World Map" (Map Room 3 migration) is only shown once the player is on
                            // Map Room 2, at Town Hall 6+, and the Map Room is not mid-upgrade. An MR1
                            // player should upgrade the Map Room 1 -> 2 first rather than skip to MR3, and
                            // entering MR3 mid-upgrade force-promotes the Map Room to its max level with a
                            // still-pending countdown.
                            if (!GLOBAL.INFERNO_ONLY && MapRoomManager.instance.isInMapRoom2 && Boolean(GLOBAL._flags.maproom2) && GLOBAL.townHall != null && GLOBAL.townHall._lvl.Get() >= 6 && (GLOBAL._bMap == null || GLOBAL._bMap._countdownUpgrade.Get() == 0)) {
                                _loc1_.push(["btn_joinnwm", 30, _loc12_]);
                                _loc12_ = false;
                            }
                            _loc1_.push(["btn_viewmap", 30, _loc12_]);
                            if (!MapRoomManager.instance.isInMapRoom2or3 && Boolean(GLOBAL._flags.maproom2) && BUILDINGINFO._props.id == MAPROOM.TYPE) {
                                _loc1_.push(["btn_upgrade", 30]);
                            }
                            if (BUILDINGINFO._props.id == MAPROOM.TYPE && GLOBAL.alliancesEnabled) {
                                _loc1_.push(["btn_alliances", 30, false]);
                            }
                        } else if (BUILDINGINFO._props.id == 12) {
                            _loc1_.push(["btn_openstore", 30, true]);
                        } else if (BUILDINGINFO._props.id == 13) {
                            if (GLOBAL._bHatcheryCC) {
                                _loc1_.push(["btn_openhcc", 30, true]);
                            } else {
                                _loc1_.push([BASE.isInfernoMainYardOrOutpost ? "btn_viewincubator" : "btn_viewhatchery", 30, true]);
                            }
                            if (!GLOBAL._hatcheryOverdrive && !_loc13_ && TUTORIAL._stage > 200) {
                                _loc1_.push(["btn_speedup", 30, true]);
                            }
                        } else if (HOUSING.isHousingBuilding(BUILDINGINFO._props.id | 0)) {
                            if (BASE.isInfernoMainYardOrOutpost) {
                                _loc1_.push(["btn_viewcompound", 30, true]);
                            } else {
                                _loc1_.push(["btn_viewhousing", 30, true]);
                            }
                        } else if (BUILDINGINFO._props.id == 19) {
                            _loc1_.push(["btn_openbaiter", 30, true]);
                        } else if (BUILDINGINFO._props.id == 22) {
                            _loc1_.push(["btn_openbunker", 30, true]);
                        } else if (BUILDINGINFO._props.id == 16) {
                            _loc1_.push(["btn_openhcc", 30, true]);
                            if (!GLOBAL._hatcheryOverdrive && !_loc13_) {
                                _loc1_.push(["btn_speedup", 30, true]);
                            }
                        } else if (BUILDINGINFO._props.id == 26) {
                            _loc1_.push(["btn_openacademy", 30, true]);
                            if (Boolean(BUILDINGINFO._building._upgrading) && !_loc13_) {
                                _loc1_.push(["btn_speedup", 30, true]);
                            }
                        } else if (BUILDINGINFO._props.id == 113) {
                            _loc1_.push(["btn_openradio", 30, true]);
                        } else if (BUILDINGINFO._props.id == 114) {
                            _loc1_.push(["btn_opencage", 30, true]);
                        } else if (BUILDINGINFO._props.id == 116) {
                            _loc1_.push(["btn_openlab", 30, true]);
                        } else if (BUILDINGINFO._props.id == BRIMSTONEPIT.ID && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                            // Inferno-only: the casino, from the player's own yard
                            _loc1_.push([BRIMSTONEPIT.OPEN_BUTTON, 30, true]);
                        } else if (BUILDINGINFO._props.id == 119) {
                            _loc1_.push(["btn_openchamber", 30, true]);
                        } else if (BUILDINGINFO._props.id == SiegeFactory.ID) {
                            _loc1_.push([SiegeFactory.SIEGE_BUTTON, 30, true]);
                        } else if (BUILDINGINFO._props.id == SiegeLab.ID) {
                            _loc1_.push([SiegeLab.SIEGE_BUTTON, 30, true]);
                        } else if (BUILDINGINFO._props.id == BUILDING14.k_TYPE && MapRoomManager.instance.isInMapRoom3 && !BASE.isInfernoMainYardOrOutpost) {
                            _loc1_.push([MapRoom3RelocatePopup.k_RELOCATE_BUTTONINFO, 30, true]);
                        }
                    }
                    if (_loc2_ && BUILDINGINFO._props.type != "mushroom") {
                        if (BUILDINGINFO._props.type != "decoration" && BUILDINGINFO._props.id != MAPROOM.TYPE && !_loc3_) {
                            _loc1_.push(["btn_upgrade", 30]);
                        }
                        // Inferno-only: spent traps re-armed, all at once (IoTrapRearm, 3 October)
                        if (GLOBAL.INFERNO_ONLY && BUILDINGINFO._building instanceof BTRAP && IoTrapRearm.disarmed().length > 0) {
                            _loc1_.push(["io_btn_rearm", 30, 1]);
                        }
                        if (BUILDINGINFO._props.type == "wall" && !_loc3_) {
                            _loc1_.push(["btn_upgradeall", 30, 1]);
                            // Inferno-only: every wall upgraded at once for resources (IoWallUpgrade, 3 October)
                            if (GLOBAL.INFERNO_ONLY && !GLOBAL.ioDesignMode()) {
                                _loc1_.push(["io_btn_wallsres", 30, 1]);
                            }
                        }
                        if (BUILDINGINFO._props.type == "resource" && !_loc3_) {
                            if (!GLOBAL._harvesterOverdrive || GLOBAL._harvesterOverdrive < GLOBAL.Timestamp()) {
                                // (Inferno-only, bug report B23: it opens Production Overdrive, and says so)
                                _loc1_.push([GLOBAL.INFERNO_ONLY ? "io_btn_overdrive" : "btn_speedup", 30, 1]);
                            }
                        }
                        if (TUTORIAL._stage >= 200) {
                            if (Boolean(BUILDINGINFO._props.can_fortify) && !_loc3_) {
                                _loc1_.push(["btn_fortify", 30]);
                            }
                            if (!BUILDINGINFO._props.isNoMoreInfoButton) {
                                _loc1_.push(["btn_more", 30]);
                            }
                            if (!BUILDINGINFO._building.isImmobile || GLOBAL._aiDesignMode) {
                                _loc1_.push(["btn_move", 30]);
                            }
                        }
                    }
                    if (_loc2_ && BUILDINGINFO._props.type == "taunt") {
                        _loc1_.push(["btn_viewmessage", 30]);
                    }
                }
            } else if (LOGIN._playerID == BUILDINGINFO._building._senderid) {
                _loc1_.push(["btn_editmessage", 26]);
            } else if (BUILDINGINFO._props.type == "taunt") {
                _loc1_.push(["btn_viewmessage", 30]);
            } else {
                _loc1_.push(["btn_help", 30]);
            }
            if (BUILDINGINFO._building instanceof IoHfoIce) {
                // Hell Freezes Over's ice: a worker is sent to break it
                _loc1_.push(["hfo_btn_break", 30, true]);
            } else if (BUILDINGINFO._props.type == "mushroom") {
                _loc1_.push(["btn_pick", 30, true]);
            }
            _loc7_ = (BUILDINGINFO._mc.tName.y + BUILDINGINFO._mc.tName.height + 5) | 0;
            if (!BUILDINGINFO._positionSet) {
                BUILDINGINFO._positionSet = true;
                BUILDINGINFO._clickPoint = new Point(MAP._GROUND.mouseX, MAP._GROUND.mouseY);
                BUILDINGINFO._mc.x = (BUILDINGINFO._clickPoint.x | 0) - 60;
                BUILDINGINFO._mc.y = (BUILDINGINFO._clickPoint.y | 0) - _loc7_ - 15;
            }
            if (BUILDINGINFO._building == INFERNOPORTAL.building && INFERNOPORTAL.isAboveMaxLevel()) {
                if (BASE.isInfernoMainYardOrOutpost) {
                    _loc1_ = [[INFERNOPORTAL.EXIT_BUTTON, 30, true]];
                } else if (MAPROOM_DESCENT.DescentPassed && !GLOBAL.INFERNO_ONLY) {
                    _loc1_ = [[INFERNOPORTAL.ENTER_BUTTON, 30, true], [INFERNOPORTAL.ASCENSION_BUTTON, 30, false]];
                } else {
                    _loc1_ = [[INFERNOPORTAL.ENTER_BUTTON, 30, true]];
                }
            }
            if (BUILDINGINFO._buttonsMC) {
                BUILDINGINFO._mc.removeChild(BUILDINGINFO._buttonsMC);
            }
            BUILDINGINFO._buttonsMC = as3.as(BUILDINGINFO._mc.addChild(new MovieClip()), MovieClip);
            _loc8_ = 0;
            while (_loc8_ < _loc1_.length) {
                _loc14_ = new Button_CLIP();
                BUILDINGINFO._buttonsMC.addChild(_loc14_);
                if (_loc1_[_loc8_][0] == "btn_move") {
                    _loc14_.SetupKey(as3.str(_loc1_[_loc8_][0]), false, 52, _loc1_[_loc8_][1] | 0);
                    _loc14_.x = 6;
                    _loc14_.y = _loc7_;
                    _loc7_ = (_loc7_ + (_loc14_.height + 2)) | 0;
                } else if (_loc1_[_loc8_][0] == "btn_more") {
                    _loc14_.SetupKey(as3.str(_loc1_[_loc8_][0]), false, 55, _loc1_[_loc8_][1] | 0);
                    _loc14_.x = 60;
                    _loc14_.y = _loc7_;
                } else if (_loc1_[_loc8_][0] == "btn_bank") {
                    _loc14_.labelKey = "btn_bank";
                    _loc14_.Setup(KEYS.Get("btn_bank", { "v1": _loc1_[_loc8_][3] }), false, 110, _loc1_[_loc8_][1] | 0);
                    _loc14_.x = 6;
                    _loc14_.y = _loc7_;
                    _loc7_ = (_loc7_ + (_loc14_.height + 2)) | 0;
                } else if (_loc1_[_loc8_][0] == "btn_bankall") {
                    _loc14_.labelKey = "btn_bankall";
                    _loc14_.SetupKey(as3.str(_loc1_[_loc8_][0]), false, 110, _loc1_[_loc8_][1] | 0);
                    _loc14_.x = 6;
                    _loc14_.y = _loc7_;
                    _loc7_ = (_loc7_ + (_loc14_.height + 2)) | 0;
                } else {
                    _loc14_.SetupKey(as3.str(_loc1_[_loc8_][0]), false, 110, _loc1_[_loc8_][1] | 0);
                    _loc14_.x = 6;
                    _loc14_.y = _loc7_;
                    _loc7_ = (_loc7_ + (_loc14_.height + 2)) | 0;
                }
                _loc15_ = _loc1_[_loc8_][0] == "btn_bank" ? 4 : 3;
                if (_loc1_[_loc8_][2]) {
                    _loc14_.Highlight = true;
                }
                if (_loc1_[_loc8_][_loc15_]) {
                    _loc14_.Enabled = false;
                }
                _loc14_.addEventListener(MouseEvent.MOUSE_DOWN, BUILDINGINFO.Special);
                _loc8_++;
            }
            _loc7_ += 5;
            _loc9_ = "";
            if (BUILDINGINFO._building.health < BUILDINGINFO._building.maxHealth) {
                _loc10_ = 0;
                if (BUILDINGINFO._building._lvl.Get() == 0) {
                    _loc10_ = BUILDINGINFO._building._buildingProps.repairTime[0] | 0;
                } else {
                    _loc10_ = BUILDINGINFO._building._buildingProps.repairTime[BUILDINGINFO._building._lvl.Get() - 1] | 0;
                }
                _loc10_ = Math.min(3600, _loc10_) | 0;
                _loc10_ = Math.ceil(BUILDINGINFO._building.maxHealth / _loc10_) | 0;
                if (BUILDINGINFO._building._repairing) {
                    _loc9_ = KEYS.Get("ui_repairing", { "v1": GLOBAL.ToTime(((BUILDINGINFO._building.maxHealth - BUILDINGINFO._building.health) / _loc10_) | 0, true, true) });
                }
            } else if (BUILDINGINFO._building._countdownBuild.Get() > 0) {
                _loc9_ = KEYS.Get("ui_building", { "v1": GLOBAL.ToTime(BUILDINGINFO._building._countdownBuild.Get() | 0, true, true) });
            } else if (BUILDINGINFO._building._countdownUpgrade.Get() > 0) {
                _loc9_ = KEYS.Get("ui_upgrading", { "v1": GLOBAL.ToTime(BUILDINGINFO._building._countdownUpgrade.Get() | 0, true, true) });
            } else if (BUILDINGINFO._building._countdownFortify.Get() > 0) {
                _loc9_ = KEYS.Get("ui_fortifying", { "v1": GLOBAL.ToTime(BUILDINGINFO._building._countdownFortify.Get() | 0, true, true) });
            } else if (BUILDINGINFO._building._class == "resource") {
                if (BASE.isOutpost) {
                    _loc9_ = KEYS.Get("harvester_autobank_msg");
                } else if (BUILDINGINFO._building._producing) {
                    _loc16_ = (BUILDINGINFO._building._buildingProps.capacity[BUILDINGINFO._building._lvl.Get() - 1] - BUILDINGINFO._building._stored.Get()) | 0;
                    _loc17_ = (60 / BUILDINGINFO._building._buildingProps.cycleTime[BUILDINGINFO._building._lvl.Get() - 1] * BUILDINGINFO._building._buildingProps.produce[BUILDINGINFO._building._lvl.Get() - 1]) | 0;
                    if (BASE.isOutpost) {
                        _loc17_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc17_);
                    }
                    if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
                        _loc17_ = (_loc17_ * GLOBAL._harvesterOverdrivePower.Get()) | 0;
                    }
                    _loc18_ = (_loc16_ / _loc17_ * 60) | 0;
                    _loc19_ = (100 / BUILDINGINFO._building._buildingProps.capacity[BUILDINGINFO._building._lvl.Get() - 1] * BUILDINGINFO._building._stored.Get()) | 0;
                    _loc9_ = KEYS.Get("ui_producing", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[BUILDINGINFO._building._type - 1])), "v2": GLOBAL.ToTime(_loc18_, true, true), "v3": _loc19_ });
                } else {
                    _loc9_ = KEYS.Get("ui_buildingfull");
                }
            }
            if (_loc9_ != "") {
                if ((_loc11_ = (MAP._GROUND.x + BUILDINGINFO._mc.x) | 0) < 500) {
                    BUILDINGINFO._mc.gotoAndStop(2);
                    _loc20_ = as3.cast(BUILDINGINFO._mc.tInfoRight, TextField);
                } else {
                    BUILDINGINFO._mc.gotoAndStop(3);
                    _loc20_ = as3.cast(BUILDINGINFO._mc.tInfoLeft, TextField);
                }
                _loc20_.autoSize = TextFieldAutoSize.CENTER;
                _loc20_.htmlText = _loc9_;
                if (_loc20_.height + 10 > _loc7_) {
                    _loc7_ = (_loc20_.height + 10) | 0;
                }
                if (_loc20_.height < _loc7_) {
                    _loc20_.y = (_loc7_ - _loc20_.height) * 0.5;
                }
            }
            BUILDINGINFO._mc.mcBG.height = _loc7_;
        }
    }

    public static Tick(param1: Event): void {
        if (BUILDINGINFO._mc.mouseX > 150 || BUILDINGINFO._mc.mouseX < -30 || BUILDINGINFO._mc.mouseY > BUILDINGINFO._mc.mcBG.height + 20 || BUILDINGINFO._mc.mouseY < -50) {
            BUILDINGINFO.Hide();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (BUILDINGINFO._mc) {
            BUILDINGINFO._mc.removeEventListener(Event.ENTER_FRAME, BUILDINGINFO.Tick);
            if (MAP._BUILDINGINFO) {
                MAP._BUILDINGINFO.removeChild(BUILDINGINFO._mc);
            }
            BUILDINGINFO._mc = null;
            BUILDINGINFO._buttonsMC = null;
            if (!STORE._open && !HATCHERY._open && !HATCHERYCC._open && !CREATURELOCKER._open && !ACADEMY._open && !MONSTERBUNKER._open && !STORE._streamline) {
                BASE.BuildingDeselect();
            }
        }
    }

    public static Special(param1: MouseEvent): void {
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: MONSTERLAB = null;
        let _loc5_: boolean = false;
        if (param1.target.labelKey == "btn_bank") {
            BUILDINGINFO._building.Bank();
            SALESPECIALSPOPUP.Check();
        }
        if (param1.target.labelKey == "btn_bankall") {
            _loc2_ = InstanceManager.getInstancesByClass(BRESOURCE);
            for (_loc3_ of (_loc2_ ?? [])) {
                if (_loc3_._class === "resource" && _loc3_._countdownUpgrade.Get() === 0 && _loc3_._countdownBuild.Get() === 0 && _loc3_._countdownFortify.Get() === 0 && _loc3_.health === _loc3_.maxHealth) {
                    _loc3_.Bank();
                }
            }
            SALESPECIALSPOPUP.Check();
        }
        if (param1.target.labelKey == "btn_openlocker" || param1.target.labelKey == "btn_openstrongbox") {
            CREATURELOCKER.Show();
        }
        if (param1.target.labelKey == "btn_viewmap") {
            GLOBAL.ShowMap();
        }
        if (param1.target.labelKey == "btn_alliances") {
            if (MapRoomManager.instance.isInMapRoom2or3) {
                ALLIANCEWINDOW.Show();
            } else {
                new AllianceMessagePopup().Show(KEYS.Get("alliance_locked_title"), KEYS.Get("alliance_locked_desc"));
            }
        }
        if (param1.target.labelKey == "btn_openlab") {
            (_loc4_ = as3.as(GLOBAL._bLab, MONSTERLAB)).Show();
        }
        if (param1.target.labelKey == "btn_joinnwm" && !GLOBAL.INFERNO_ONLY) {
            MapRoom3ConfirmMigrationPopup.instance.Show();
        }
        if (param1.target.labelKey == "btn_viewhatchery" || param1.target.labelKey == "btn_viewincubator") {
            HATCHERY.Show(as3.as(BUILDINGINFO._building, BUILDING13));
        }
        if (param1.target.labelKey == "btn_viewhousing" || param1.target.labelKey == "btn_viewcompound" || param1.target.labelKey == "btn_juicemonsters") {
            HOUSING.Show();
        }
        if (param1.target.labelKey == "btn_juiceguardian") {
            CHAMPIONCAGE.ShowJuice();
        }
        if (param1.target.labelKey == "btn_openstore") {
            STORE.ShowB(1, 0);
        }
        if (param1.target.labelKey == "btn_yardplanner") {
            PLANNER.Show();
        }
        if (param1.target.labelKey == "btn_openbunker") {
            MONSTERBUNKER.Show();
        }
        if (param1.target.labelKey == "btn_stopbuild") {
            BUILDINGINFO._building.Recycle();
        }
        if (param1.target.labelKey == "btn_stopupgrade") {
            BUILDINGINFO._building.UpgradeCancel();
        }
        if (param1.target.labelKey == "btn_stopfortify") {
            BUILDINGINFO._building.FortifyCancel();
        }
        if (param1.target.labelKey == "btn_openhcc") {
            HATCHERYCC.Show();
        }
        if (param1.target.labelKey == "btn_openbaiter") {
            MONSTERBAITER.Show();
        }
        if (param1.target.labelKey == "btn_openacademy") {
            ACADEMY.Show(BUILDINGINFO._building);
        }
        if (param1.target.labelKey == "btn_repair") {
            BUILDINGINFO._building.Repair();
        }
        if (param1.target.labelKey == "btn_repairall") {
            STORE.ShowB(3, 1, ["FIX"], true);
        }
        if (param1.target.labelKey == "btn_help") {
            BUILDINGINFO._building.Help();
        }
        if (param1.target.labelKey == "btn_openradio") {
            RADIO.Show();
        }
        if (param1.target.labelKey == "btn_opencage") {
            CHAMPIONCAGE.Show();
        }
        if (param1.target.labelKey == "btn_openchamber") {
            CHAMPIONCHAMBER.Show();
        }
        if (param1.target.labelKey == INFERNOPORTAL.ENTER_BUTTON || param1.target.labelKey == INFERNOPORTAL.EXIT_BUTTON) {
            INFERNOPORTAL.EnterPortal();
        }
        if (param1.target.labelKey == INFERNOPORTAL.ASCENSION_BUTTON) {
            INFERNOPORTAL.AscendMonsters();
        }
        if (param1.target.labelKey == SiegeFactory.SIEGE_BUTTON) {
            SiegeFactory.Show();
        }
        if (param1.target.labelKey == BRIMSTONEPIT.OPEN_BUTTON) {
            CasinoWindow.Show();
        }
        if (param1.target.labelKey == SiegeLab.SIEGE_BUTTON) {
            SiegeLab.Show();
        }
        if (param1.target.labelKey == MapRoom3RelocatePopup.k_RELOCATE_BUTTONINFO) {
            MapRoom3RelocatePopup.instance.Show();
        }
        if (param1.target.labelKey == "btn_move") {
            BUILDINGINFO._building.StartMove();
        }
        if (param1.target.labelKey == "btn_upgrade") {
            if (BUILDINGINFO._building._type == 14 && BUILDINGINFO._building._lvl.Get() && BUILDINGINFO._building._lvl.Get() < BUILDINGINFO._building._buildingProps.costs.length) {
                _loc5_ = BUY.FBCNcpCheckEligibility();
                if (!_loc5_) {
                    BUILDINGOPTIONS.Show(BUILDINGINFO._building, "upgrade");
                }
            } else {
                BUILDINGOPTIONS.Show(BUILDINGINFO._building, "upgrade");
            }
        }
        if (param1.target.labelKey == "btn_fortify") {
            BUILDINGOPTIONS.Show(BUILDINGINFO._building, "fortify");
        }
        if (param1.target.labelKey == "io_btn_rearm") {
            IoTrapRearm.Show();
        }
        if (param1.target.labelKey == "io_btn_wallsres") {
            IoWallUpgrade.Show();
        }
        if (param1.target.labelKey == "btn_upgradeall") {
            if (BASE.isInfernoMainYardOrOutpost) {
                STORE.ShowB(1, 0, ["BLK2I", "BLK3I"]);
            } else {
                STORE.ShowB(1, 0, ["BLK2", "BLK3", "BLK4", "BLK5"]);
            }
        }
        if (param1.target.labelKey == "btn_more") {
            BUILDINGOPTIONS.Show(BUILDINGINFO._building, "more");
        }
        if (param1.target.labelKey == "btn_pick" || param1.target.labelKey == "hfo_btn_break") {
            MUSHROOMS.PickWorker(BUILDINGINFO._building);
        }
        if (param1.target.labelKey == "btn_speedup") {
            BUILDINGINFO.Update();
            if (Boolean(BUILDINGINFO._building._repairing) || BUILDINGINFO._building._countdownBuild.Get() + BUILDINGINFO._building._countdownUpgrade.Get() + BUILDINGINFO._building._countdownFortify.Get() > 0) {
                STORE.SpeedUp("SP4");
            } else if (BUILDINGINFO._props.id == 8) {
                STORE.SpeedUp("SP4");
            } else if (BUILDINGINFO._props.id == 13 || BUILDINGINFO._props.id == 16) {
                if (!BASE.isInfernoMainYardOrOutpost) {
                    STORE.ShowB(3, 1, ["HOD", "HOD2", "HOD3"]);
                } else {
                    STORE.ShowB(3, 1, ["HODI", "HOD2I", "HOD3I"]);
                }
            } else if (BUILDINGINFO._props.id == 26) {
                STORE.SpeedUp("SP4");
            } else if (BUILDINGINFO._props.type == "resource") {
                STORE.ShowB(3, 1, ["POD"]);
            }
        }
        if (param1.target.labelKey == "io_btn_overdrive") {
            STORE.ShowB(3, 1, ["POD"]);
        }
        if (param1.target.labelKey == "btn_viewmessage") {
            SIGNS.ShowMessage(BUILDINGINFO._building);
        }
        if (param1.target.labelKey == "btn_editmessage") {
            SIGNS.EditForBuilding(BUILDINGINFO._building);
        }
        BUILDINGINFO.Hide();
    }
}
