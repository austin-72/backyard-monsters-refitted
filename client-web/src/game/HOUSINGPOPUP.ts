import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, DisplayObject, MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING15, CREATURELOCKER, CREATURES, GLOBAL, HOUSING, HOUSINGBUNKER, HOUSINGPOPUP_CLIP, HousingPopupMonster_CLIP, INFERNOPORTAL, ImageCache, InstanceManager, IoLockIcon, KEYS, MAP, MAPROOM_DESCENT, MonsterBase, POPUPSETTINGS, SOUNDS, ScrollSet } from "@game";

export class HOUSINGPOPUP extends HOUSINGPOPUP_CLIP {
    static {
        as3.fields(this, { _juiceList: null, _creatureList: null, _creatureData: null, _scroller: null });
    }

    public _juiceList: any;
    public _creatureList: any;
    public _creatureData: any;
    public _scroller: ScrollSet;

    public $ctor(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc13_: int = 0;
        let _loc14_: string = null;
        let _loc15_: HousingPopupMonster_CLIP = null;
        this._juiceList = {};
        this._creatureList = {};
        this._creatureData = {};
        super.$ctor();
        if (GLOBAL._bJuicer) {
            this.gotoAndStop(2);
            this.bJuice.SetupKey("mh_nomonsters_btn");
            this.bJuice.Enabled = false;
            this.bJuice.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Juice));
            this.bAll.SetupKey("mh_selectall_btn");
            this.bAll.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectAll));
            this.bCancel.SetupKey("mh_cancel_btn");
            this.bCancel.Enabled = false;
            this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectNone));
        } else {
            this.gotoAndStop(1);
        }
        this._juiceList = {};
        // (Inferno-only: the main yard is the Inferno yard; there is no Inferno to bring monsters up from.)
        if (MAPROOM_DESCENT.DescentPassed && BASE.isMainYard && !GLOBAL.INFERNO_ONLY) {
            this.bAscend.visible = true;
            this.bAscend.Enabled = true;
            this.bAscend.SetupKey("btn_ascendmonsters");
            this.bAscend.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Ascend));
        } else {
            this.ascend_desc_txt.visible = false;
            this.bAscend.visible = false;
            this.bAscend.Enabled = false;
        }
        _loc2_ = 3;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 215;
        let _loc7_: int = 40;
        let _loc8_: int = 6;
        let _loc9_: int = 3;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: any[] = [];
        _loc12_ = this.GetHousableCreatures();
        _loc1_ = 0;
        while (_loc1_ < _loc12_.length) {
            _loc13_ = _loc12_[_loc1_].id.substring(_loc12_[_loc1_].id.indexOf("C") + 1) | 0;
            _loc14_ = String(_loc12_[_loc1_].id);
            (_loc15_ = new HousingPopupMonster_CLIP()).x = _loc1_ * _loc6_ % (_loc2_ * _loc6_);
            _loc5_ = (_loc1_ / _loc2_) | 0;
            _loc15_.y = _loc5_ * _loc7_;
            _loc15_.mouseChildren = false;
            this.monsterContainer.addChild(_loc15_);
            this._creatureList["m" + _loc14_] = _loc15_;
            ImageCache.GetImageWithCallBack("monsters/" + _loc14_ + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [_loc15_.mcIcon]);
            _loc15_.tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc14_].name)) + "</b>";
            if (GLOBAL._bJuicer) {
                _loc15_.addEventListener(MouseEvent.CLICK, this.JuicerAdd(_loc14_));
                _loc15_.buttonMode = true;
                _loc15_.mouseChildren = false;
            }
            _loc1_++;
        }
        this._scroller = new ScrollSet();
        this._scroller.x = 310;
        this._scroller.y = -145;
        this._scroller.width = 21;
        this._scroller.AutoHideEnabled = false;
        this._scroller.isHiddenWhileUnnecessary = true;
        this.addChild(this._scroller);
        this.monsterContainer.mask = this.monsterContainerMask;
        this._scroller.Init(as3.as(this.monsterContainer, Sprite), as3.as(this.monsterContainerMask, MovieClip), 0, -145, 240, 30);
        if (BASE.isInfernoMainYardOrOutpost) {
            this.title_txt.htmlText = KEYS.Get("mhi_title");
        } else {
            this.title_txt.htmlText = KEYS.Get("mh_title");
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            this.capacity_desc_txt.htmlText = "<b>" + KEYS.Get("compound_capacity_desc") + "</b>";
        } else {
            this.capacity_desc_txt.htmlText = "<b>" + KEYS.Get("mh_capacity_desc") + "</b>";
        }
        if (GLOBAL._bJuicer) {
            this.juicefooter_desc_txt.htmlText = KEYS.Get("mh_juicefooter_desc");
        } else {
            this.footer_desc_txt.htmlText = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "hb_footer_desc" : "mh_footer_desc");
        }
        if (MAPROOM_DESCENT.DescentPassed) {
            this.ascend_desc_txt.htmlText = KEYS.Get("mh_ascension_desc");
        } else {
            this.ascend_desc_txt.htmlText = KEYS.Get("mh_ascension_noinf");
        }
        this.Update();
    }

    public GetHousableCreatures(): any[] {
        let _loc8_: string = null;
        let _loc9_: any = null;
        let _loc10_: string = null;
        let _loc11_: any = null;
        this._creatureData = {};
        let _loc1_: any[] = [];
        let _loc2_: any[] = [];
        let _loc3_: any[] = [];
        let _loc4_: any = CREATURELOCKER.GetCreatures("above");
        let _loc5_: any = undefined;
        _loc5_ = !BASE.isInfernoMainYardOrOutpost;
        if (_loc5_) {
            for (_loc8_ in _loc4_) {
                if (!(_loc9_ = CREATURELOCKER._creatures[_loc8_]).blocked) {
                    _loc9_.id = _loc8_;
                    _loc1_.push(_loc9_);
                    this._creatureData[_loc8_] = _loc9_;
                }
            }
            as3.sortOn(_loc1_, ["index"], Array.NUMERIC);
        }
        let _loc6_: any = CREATURELOCKER.GetCreatures("inferno");
        let _loc7_: boolean = false;
        _loc7_ = MAPROOM_DESCENT.DescentPassed;
        if (_loc7_) {
            for (_loc10_ in _loc6_) {
                if (!(_loc11_ = CREATURELOCKER._creatures[_loc10_]).blocked) {
                    _loc11_.id = _loc10_;
                    _loc2_.push(_loc11_);
                    this._creatureData[_loc10_] = _loc11_;
                }
            }
            as3.sortOn(_loc2_, ["index"], Array.NUMERIC);
        }
        if (_loc1_.length > 0) {
            _loc3_ = _loc3_.concat(_loc1_);
        }
        if (_loc2_.length > 0) {
            _loc3_ = _loc3_.concat(_loc2_);
        }
        return _loc3_;
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
        param3[0].mcLoading.visible = false;
    }

    public Update(): void {
        let _loc1_: string = null;
        let _loc2_: string = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc6_: any = false;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: number = NaN;
        let _loc13_: int = 0;
        let _loc14_: number = NaN;
        this.GetHousableCreatures();
        HOUSING.HousingSpace();
        _loc3_ = 0;
        for (_loc2_ in this._juiceList) {
            _loc3_ = (_loc3_ + CREATURELOCKER._creatures[_loc2_].props.cStorage * this._juiceList[_loc2_]) | 0;
        }
        HOUSING._housingUsed.Add(-_loc3_);
        _loc7_ = Math.round(100 / Number(HOUSING._housingCapacity.Get()) * Number(HOUSING._housingUsed.Get())) | 0;
        if (!GLOBAL.INFERNO_ONLY) {
            this.mcStorage.mcBar.width = 535 / HOUSING._housingCapacity.Get() * HOUSING._housingUsed.Get();
        } else {
            // Inferno-only: with no compound (0 / 0) the bar was NaN wide and ran out of the window (and a
            // NaN width, once set, stays: so it is never set)
            let ioCap: number = Number(HOUSING._housingCapacity.Get());
            this.mcStorage.mcBar.width = ioCap > 0 ? Math.max(0, Math.min(535, 535 / ioCap * Number(HOUSING._housingUsed.Get()))) : 0;
            if (!(ioCap > 0)) {
                _loc7_ = 0;
            }
        }
        this.mcStorage.mcBarB.width = 1;
        this.tStorage.htmlText = "<b>" + GLOBAL.FormatNumber(HOUSING._housingUsed.Get()) + " / " + GLOBAL.FormatNumber(HOUSING._housingCapacity.Get()) + " (" + _loc7_ + "%)</b>";
        for (_loc8_ in this._creatureData) {
            _loc11_ = Number(_loc8_.substring(_loc8_.indexOf("C") + 1)) | 0;
            _loc1_ = _loc8_;
            _loc6_ = _loc1_.substring(0, 2) == "IC";
            if (!(_loc6_ && !MAPROOM_DESCENT.DescentPassed)) {
                if (!_loc6_ && !CREATURELOCKER._lockerData[_loc1_]) {
                    if (BASE.isInfernoMainYardOrOutpost) {
                        this._creatureList["m" + _loc1_].tInfo.htmlText = KEYS.Get("compound_item_locked");
                    } else {
                        this._creatureList["m" + _loc1_].tInfo.htmlText = KEYS.Get("mh_item_locked");
                    }
                    this._creatureList["m" + _loc1_];
                } else if (!_loc6_ && CREATURELOCKER._lockerData[_loc1_].t == 1) {
                    this._creatureList["m" + _loc1_].tInfo.htmlText = KEYS.Get("mh_item_unlocking");
                    this._creatureList["m" + _loc1_].alpha = 0.5;
                } else {
                    this._creatureList["m" + _loc1_].tInfo.htmlText = KEYS.Get("mh_item_0housed");
                    this._creatureList["m" + _loc1_].alpha = 0.5;
                }
            }
        }
        if (GLOBAL.INFERNO_ONLY) {
            // the padlock on every monster not unlocked yet in the Strongbox
            for (_loc8_ in this._creatureData) {
                if (this._creatureList["m" + _loc8_] && this._creatureList["m" + _loc8_].mcIcon) {
                    IoLockIcon.mark(as3.cast(this._creatureList["m" + _loc8_].mcIcon, DisplayObject), IoLockIcon.lockedMonster(_loc8_));
                }
            }
        }
        _loc9_ = GLOBAL.player.monsterList.length | 0;
        _loc10_ = 0;
        while (_loc10_ < _loc9_) {
            _loc2_ = as3.vget(GLOBAL.player.monsterList, _loc10_).m_creatureID;
            _loc12_ = as3.vget(GLOBAL.player.monsterList, _loc10_).numCreeps;
            if (this._creatureList["m" + _loc2_]) {
                if (_loc12_ > 0) {
                    _loc5_ = CREATURELOCKER._creatures[_loc2_];
                    _loc13_ = Number(_loc2_.substring(_loc2_.indexOf("C") + 1)) | 0;
                    if (Boolean(this._juiceList[_loc2_]) && this._juiceList[_loc2_] > 0) {
                        this._creatureList["m" + _loc2_].tInfo.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("mh_selectedforjuicing", { "v1": this._juiceList[_loc2_], "v2": GLOBAL.FormatNumber(_loc12_) }) + "</font>";
                    } else {
                        this._creatureList["m" + _loc2_].tInfo.htmlText = KEYS.Get("mh_item_cost", { "v1": GLOBAL.FormatNumber(_loc12_), "v2": GLOBAL.FormatNumber(CREATURES.GetProperty(_loc2_, "cStorage") * _loc12_) });
                    }
                    this._creatureList["m" + _loc2_].alpha = 1;
                }
            }
            _loc10_++;
        }
        if (GLOBAL._bJuicer) {
            _loc3_ = 0;
            _loc4_ = 0;
            for (_loc2_ in this._juiceList) {
                _loc6_ = _loc2_.substring(0, 2) == "IC" && !BASE.isInfernoMainYardOrOutpost;
                if (!_loc6_) {
                    _loc3_ = (_loc3_ + this._juiceList[_loc2_]) | 0;
                    _loc14_ = 0.6;
                    if (GLOBAL._bJuicer._lvl.Get() == 2) {
                        _loc14_ = 0.8;
                    }
                    if (GLOBAL._bJuicer._lvl.Get() == 3) {
                        _loc14_ = 1;
                    }
                    _loc4_ = (_loc4_ + Math.ceil(CREATURES.GetProperty(_loc2_, "cResource") * _loc14_) * this._juiceList[_loc2_]) | 0;
                }
            }
            if (_loc3_ > 0) {
                this.bJuice.Enabled = true;
                this.bJuice.Highlight = true;
                this.bCancel.Enabled = true;
                if (_loc3_ == 1) {
                    this.bJuice.Setup(KEYS.Get("mh_juicemonsterX_btn", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc4_) }));
                } else {
                    this.bJuice.Setup(KEYS.Get("mh_juicemonstersX_btn", { "v1": _loc3_, "v2": GLOBAL.FormatNumber(_loc4_) }));
                }
            } else {
                this.bJuice.Enabled = false;
                this.bCancel.Enabled = false;
            }
            if (HOUSING._housingUsed.Get() == 0) {
                this.bAll.Enabled = false;
            } else {
                this.bAll.Enabled = true;
            }
        }
        this._scroller.Update();
    }

    public JuicerAdd(param1: string): Function {
        let isInfernoType: boolean = false;
        let n: string = null;
        isInfernoType = false;
        n = param1;
        // (Inferno-only: in the Inferno its own monsters are the ones juiced, 29 September; elsewhere not)
        isInfernoType = n.substring(0, 2) == "IC" && !BASE.isInfernoMainYardOrOutpost;
        return (param1: MouseEvent = null): void => {
            if (isInfernoType) {
                GLOBAL.Message(KEYS.Get("msg_juicernoinferno"));
                return;
            }
            if (GLOBAL._bJuicer._countdownUpgrade.Get() == 0) {
                if (GLOBAL._bJuicer.health > GLOBAL._bJuicer.maxHealth * 0.5) {
                    if (Boolean(GLOBAL.player.monsterListByID(n)) && GLOBAL.player.monsterListByID(n).numCreeps - (this._juiceList[n] | 0) > 0) {
                        this._juiceList[n] = (this._juiceList[n] | 0) + 1;
                    }
                    this.Update();
                } else {
                    GLOBAL.Message(KEYS.Get("msg_juicerdamaged"));
                }
            } else {
                GLOBAL.Message(KEYS.Get("msg_juicerupgrading"));
            }
        };
    }

    public Juice(param1: MouseEvent = null): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: BFOUNDATION = null;
        let _loc5_: MonsterBase = null;
        let _loc8_: int = 0;
        let _loc6_: any[] = [];
        let _loc7_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc4_ of (_loc7_ ?? [])) {
            _loc6_.push(_loc4_);
        }
        for (_loc2_ in this._juiceList) {
            GLOBAL.player.monsterListByID(_loc2_).add((-this._juiceList[_loc2_]) | 0);
            for (_loc5_ of as3.values(CREATURES._creatures)) {
                if (this._juiceList[_loc2_] > 0) {
                    if (_loc5_._creatureID == _loc2_ && _loc5_._behaviour != "juice") {
                        _loc5_.changeModeJuice();
                        let leftToJuice: int = this._juiceList[_loc2_] | 0;
                        this._juiceList[_loc2_] = --leftToJuice;
                    }
                }
            }
            _loc8_ = 0;
            while (_loc8_ < this._juiceList[_loc2_]) {
                _loc4_ = as3.cast(_loc6_[(Math.random() * _loc6_.length) | 0], BFOUNDATION);
                CREATURES.Spawn(_loc2_, MAP._BUILDINGTOPS, "juice", new Point(_loc4_.x, _loc4_.y).add(new Point(-60 + Math.random() * 135, 65 + Math.random() * 50)), Math.random() * 360);
                _loc8_++;
            }
        }
        this._juiceList = {};
        HOUSING.HousingSpace();
        BASE.Save();
        HOUSING.Hide();
    }

    public SelectAll(param1: MouseEvent = null): void {
        let _loc2_: int = 0;
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc5_: any = false;
        if (GLOBAL._bJuicer._countdownUpgrade.Get() == 0) {
            this._juiceList = {};
            _loc2_ = GLOBAL.player.monsterList.length | 0;
            _loc4_ = 0;
            while (_loc4_ < _loc2_) {
                _loc3_ = as3.vget(GLOBAL.player.monsterList, _loc4_).m_creatureID;
                _loc5_ = _loc3_.substring(0, 2) == "IC" && !BASE.isInfernoMainYardOrOutpost;
                if (as3.vget(GLOBAL.player.monsterList, _loc4_).numCreeps > 0 && !_loc5_) {
                    this._juiceList[_loc3_] = as3.vget(GLOBAL.player.monsterList, _loc4_).numCreeps;
                }
                _loc4_++;
            }
            this.Update();
        } else {
            GLOBAL.Message(KEYS.Get("msg_juicerupgrading"));
        }
    }

    public SelectNone(param1: MouseEvent = null): void {
        this._juiceList = {};
        this.bJuice.SetupKey("mh_nomonsters_btn");
        this.bJuice.Enabled = false;
        this.bJuice.Highlight = false;
        this.Update();
    }

    public Ascend(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        this.Hide();
        INFERNOPORTAL.AscendMonsters();
    }

    public Hide(): void {
        HOUSING.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
