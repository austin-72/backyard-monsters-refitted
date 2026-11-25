import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Point, Rectangle } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { BASE, BRESOURCE, BUILDING13, CREATURELOCKER, CREATURES, Circ, GLOBAL, HATCHERY, HATCHERYPOPUP_CLIP, HOUSING, HatcheryMonsterIcon_CLIP, ImageCache, InstanceManager, IoLockIcon, IoPhoneText, IoPinchZoom, KEYS, POPUPS, POPUPSETTINGS, ResourcePackages, SOUNDS, STORE, ScrollSet, TUTORIAL, UI2, TweenLite } from "@game";

export class HATCHERYPOPUP extends HATCHERYPOPUP_CLIP {
    static {
        as3.fields(this, { _hatchery: null, _monsterSlots: null, MONSTERSLOTSIZE: null, _scrollSet: null, _scrollSetContainer: null, _guidePage: 1, _ioHolding: false, _ioHoldN: 0, _ioHoldTick: 0, _ioRemoving: 0, _ioRemoveId: null, _ioRemoveTick: 0, _ioArmed: 0, _ioArmedAt: 0, _ioPicked: 0, _ioPickedTile: null, _ioPickedFilters: null });
    }

    public _hatchery: BUILDING13;
    public _monsterSlots: any[];
    private MONSTERSLOTSIZE: Rectangle;
    private _scrollSet: ScrollSet;
    private _scrollSetContainer: Sprite;
    public _guidePage: int;
    // ---- Inferno-only (3 October): hold a monster down to keep adding it, as the Incubation Control
    // Station does. The first press adds one; held for about a third of a second, one more every other
    // frame, until it is let go, the queue is full or the magma runs out.
    private _ioHolding: boolean;
    private _ioHoldN: int;
    private _ioHoldTick: int;
    // ---- and (10 October) hold a queued monster down to keep taking it out, the same way: the first press takes
    // one; held, one more every other frame, until it is let go or that slot's monsters are all out.
    private _ioRemoving: int;
    private _ioRemoveId: string;
    private _ioRemoveTick: int;

    public $ctor(): void {
        let _loc5_: any[] = null;
        let _loc7_: int = 0;
        let _loc8_: boolean = false;
        let _loc9_: int = 0;
        let _loc10_: MovieClip = null;
        this.MONSTERSLOTSIZE = new Rectangle(0, 0, 65, 50);
        super.$ctor();
        this.title_txt.htmlText = KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name));
        this.bSpeedup.tName.htmlText = "<b>" + KEYS.Get("btn_speedup") + "</b>";
        this.bSpeedup.mouseChildren = false;
        if (!BASE.isInfernoMainYardOrOutpost) {
            this.bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HOD", "HOD2", "HOD3"]));
        } else {
            this.bSpeedup.addEventListener(MouseEvent.CLICK, STORE.Show(3, 2, ["HODI", "HOD2I", "HOD3I"]));
        }
        this.bSpeedup.buttonMode = true;
        // Inferno-only (14 October, QoL #8): a monster hatches in about a second here, so Incubator Overdrive
        // (4x faster for an hour, for Shiny) can't speed anything up: no Speed Up button.
        if (GLOBAL.INFERNO_ONLY && GLOBAL.ioHatchSeconds <= 5) {
            this.bSpeedup.visible = false;
        }
        this.bFinish.tName.htmlText = "<b>" + KEYS.Get("str_finishnow") + "</b>";
        this.bFinish.mouseChildren = false;
        this.bFinish.addEventListener(MouseEvent.CLICK, as3.bind(this, this.FinishNow));
        this.bFinish.buttonMode = true;
        this._scrollSet = new ScrollSet();
        this._scrollSet.x = this.scroller.x;
        this._scrollSet.y = this.scroller.y;
        this._scrollSet.width = this.scroller.width;
        this._scrollSet.Init(this.monsterCanvas, this.monsterMask, ScrollSet.BROWN, this.monsterMask.y, this.monsterMask.height);
        this._scrollSet.AutoHideEnabled = false;
        this._scrollSet.isHiddenWhileUnnecessary = true;
        this._scrollSetContainer = new Sprite();
        this._scrollSetContainer.addChild(this._scrollSet);
        this.addChild(this._scrollSetContainer);
        this.scroller.visible = false;
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: int = 9;
        let _loc4_: int = 5;
        this._monsterSlots = [];
        _loc5_ = CREATURELOCKER.GetSortedCreatures(true);
        // (Inferno-only, QoL #361: the monsters that can be made first, the locked ones after them)
        if (GLOBAL.INFERNO_ONLY && _loc5_) {
            let open: any[] = [];
            let shut: any[] = [];
            for (let c of _loc5_) {
                if (c && !c.blocked && CREATURELOCKER._lockerData[c.id] && CREATURELOCKER._lockerData[c.id].t == 2) {
                    open.push(c);
                } else {
                    shut.push(c);
                }
            }
            _loc5_ = open.concat(shut);
        }
        let _loc6_: int = !BASE.isInfernoMainYardOrOutpost ? CREATURELOCKER.maxCreatures("above") : CREATURELOCKER.maxCreatures("inferno");
        _loc7_ = 0;
        while (_loc7_ < _loc6_) {
            _loc8_ = false;
            if (Boolean(_loc5_[_loc7_]) && _loc5_[_loc7_].blocked == true) {
                _loc2_++;
            } else {
                _loc9_ = _loc5_[_loc7_].id.substr(_loc5_[_loc7_].id.indexOf("C") + 1) | 0;
                (_loc10_ = new HatcheryMonsterIcon_CLIP()).width = this.MONSTERSLOTSIZE.width;
                _loc10_.height = this.MONSTERSLOTSIZE.height;
                _loc10_.addEventListener(MouseEvent.MOUSE_OVER, this.MonsterInfo(_loc9_));
                if (GLOBAL.INFERNO_ONLY) {
                    _loc10_.name = "ioHatchMonster:" + HATCHERYPOPUP.ioMonsterId(_loc9_);
                }
                _loc10_.x = _loc1_ % _loc3_ * (_loc10_.width + _loc4_);
                _loc10_.y = Math.floor(_loc1_ / _loc3_) * (_loc10_.height + _loc4_);
                this.monsterCanvas.addChild(_loc10_);
                this._monsterSlots.push(_loc10_);
                ImageCache.GetImageWithCallBack("monsters/" + _loc5_[_loc7_].id + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [_loc10_]);
                if (Boolean(CREATURELOCKER._lockerData[_loc5_[_loc7_].id]) && CREATURELOCKER._lockerData[_loc5_[_loc7_].id].t == 2) {
                    _loc10_.addEventListener(MouseEvent.MOUSE_DOWN, GLOBAL.INFERNO_ONLY ? this.ioHoldStart(_loc9_, _loc10_) : this.QueueAdd(_loc9_));
                    _loc10_.alpha = 1;
                    _loc10_.buttonMode = true;
                } else {
                    _loc10_.alpha = 0.5;
                    _loc10_.buttonMode = false;
                    if (GLOBAL.INFERNO_ONLY) {
                        IoLockIcon.mark(_loc10_, true);
                        // (QoL #360: a locked one says so when clicked, with Open the Strongbox)
                        _loc10_.buttonMode = true;
                        _loc10_.addEventListener(MouseEvent.MOUSE_DOWN, this.ioLockedClick(_loc5_[_loc7_].id, _loc9_, _loc10_));
                    }
                }
                _loc1_++;
            }
            _loc7_++;
        }
        this.mcMonsterInfo.speed_txt.htmlText = "<b>" + KEYS.Get("mon_att_speed") + "</b>";
        this.mcMonsterInfo.health_txt.htmlText = "<b>" + KEYS.Get("mon_att_health") + "</b>";
        this.mcMonsterInfo.damage_txt.htmlText = "<b>" + KEYS.Get("mon_att_damage") + "</b>";
        this.mcMonsterInfo.goo_txt.htmlText = "<b>" + KEYS.Get("mon_att_cost", { "v1": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) }) + "</b>";
        this.mcMonsterInfo.housing_txt.htmlText = "<b>" + KEYS.Get("mon_att_housing") + "</b>";
        this.mcMonsterInfo.time_txt.htmlText = "<b>" + KEYS.Get("mon_att_time") + "</b>";
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #351: damage per second where the hatching time was)
            this.mcMonsterInfo.time_txt.htmlText = "<b>" + KEYS.Get("io_mon2_dps_short") + "</b>";
        }
        this.MonsterInfoB(1);
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.removeChildAt(0);
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcImage.visible = true;
    }

    public MonsterInfo(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            this.MonsterInfoB(n);
        };
    }

    /*
     * This function has been rewritten.
     *
     * @autor: matiasbais
     *
     * @changes: Renamed local registers to readable names and removed unused logic
     *
     * @param {String} creatureID - the current creature's ID passed to MonsterInfoB
     */
    /**
     * The popup passes monsters around as bare numbers and used to rebuild the id as "IC" + number
     * in an Inferno yard. That is wrong for an overworld monster that has been let into the Inferno:
     * Rezghul is C19, and "IC19" does not exist, so hovering over him crashed and he could not be
     * queued. Use the Inferno id when there is one, the overworld id otherwise.
     */
    private static ioMonsterId(param1: int): string {
        if (BASE.isInfernoMainYardOrOutpost && CREATURELOCKER._creatures["IC" + param1]) {
            return "IC" + param1;
        }
        return "C" + param1;
    }

    public MonsterInfoB(creatureID: int): void {
        let currentCreature: string = null;
        let damageShown: int = 0;
        let creatureStringID: string = HATCHERYPOPUP.ioMonsterId(creatureID);
        let creature: any = CREATURELOCKER._creatures[creatureStringID];
        ImageCache.GetImageWithCallBack("monsters/" + creatureStringID + "-portrait.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this.portrait1]);
        let speed: number = 0;
        let health: int = 0;
        let damage: int = 0;
        let cTime: int = 0;
        let cResource: int = 0;
        let cStorage: int = 0;
        for (currentCreature in CREATURELOCKER._creatures) {
            if (CREATURES.GetProperty(currentCreature, "speed") > speed) {
                speed = CREATURES.GetProperty(currentCreature, "speed");
            }
            if (CREATURES.GetProperty(currentCreature, "health") > health) {
                health = CREATURES.GetProperty(currentCreature, "health") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "damage") > damage) {
                damage = CREATURES.GetProperty(currentCreature, "damage") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cTime") > cTime) {
                cTime = CREATURES.GetProperty(currentCreature, "cTime") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cResource") > cResource) {
                cResource = CREATURES.GetProperty(currentCreature, "cResource") | 0;
            }
            if (CREATURES.GetProperty(currentCreature, "cStorage") > cStorage) {
                cStorage = CREATURES.GetProperty(currentCreature, "cStorage") | 0;
            }
        }
        damageShown = CREATURES.GetProperty(creatureStringID, "damage") | 0;
        TweenLite.to(this.mcMonsterInfo.bSpeed.mcBar, 0.4, { "width": 100 / speed * CREATURES.GetProperty(creatureStringID, "speed"), "ease": Circ.easeInOut, "delay": 0 });
        TweenLite.to(this.mcMonsterInfo.bHealth.mcBar, 0.4, { "width": 100 / health * CREATURES.GetProperty(creatureStringID, "health"), "ease": Circ.easeInOut, "delay": 0.05 });
        TweenLite.to(this.mcMonsterInfo.bDamage.mcBar, 0.4, { "width": 100 / damage * Math.abs(damageShown), "ease": Circ.easeInOut, "delay": 0.1 });
        TweenLite.to(this.mcMonsterInfo.bTime.mcBar, 0.4, { "width": 100 / cTime * CREATURES.GetProperty(creatureStringID, "cTime"), "ease": Circ.easeInOut, "delay": 0.15 });
        TweenLite.to(this.mcMonsterInfo.bResource.mcBar, 0.4, { "width": 100 / cResource * CREATURES.GetProperty(creatureStringID, "cResource"), "ease": Circ.easeInOut, "delay": 0.2 });
        TweenLite.to(this.mcMonsterInfo.bStorage.mcBar, 0.4, { "width": 100 / cStorage * CREATURES.GetProperty(creatureStringID, "cStorage"), "ease": Circ.easeInOut, "delay": 0.25 });
        this.mcMonsterInfo.tSpeed.htmlText = KEYS.Get("mon_statsspeed", { "v1": CREATURES.GetProperty(creatureStringID, "speed") });
        this.mcMonsterInfo.tHealth.htmlText = GLOBAL.FormatNumber(CREATURES.GetProperty(creatureStringID, "health"));
        if (damageShown > 0) {
            this.mcMonsterInfo.tDamage.htmlText = damageShown;
        } else {
            this.mcMonsterInfo.tDamage.htmlText = -damageShown + " (" + KEYS.Get("str_heal") + ")";
        }
        this.mcMonsterInfo.tResource.htmlText = KEYS.Get("mon_att_costvalue", { "v1": GLOBAL.FormatNumber(CREATURES.GetProperty(creatureStringID, "cResource")), "v2": KEYS.Get(BRESOURCE.GetResourceNameKey(3)) });
        this.mcMonsterInfo.tStorage.htmlText = KEYS.Get("mon_att_housingvalue", { "v1": CREATURES.GetProperty(creatureStringID, "cStorage") });
        this.mcMonsterInfo.tTime.htmlText = GLOBAL.ToTime(CREATURES.GetProperty(creatureStringID, "cTime") | 0, true);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #351: its damage per second, the bar against the strongest)
            let ioMaxDps: number = CREATURELOCKER.ioMaxDps(CREATURELOCKER.GetAppropriateCreatures());
            TweenLite.to(this.mcMonsterInfo.bTime.mcBar, 0.4, { "width": ioMaxDps > 0 ? 100 / ioMaxDps * Math.abs(CREATURELOCKER.ioDps(creatureStringID)) : 0, "ease": Circ.easeInOut, "delay": 0.25 });
            this.mcMonsterInfo.tTime.htmlText = CREATURELOCKER.ioDpsText(creatureStringID);
        }
        let level: int = 1;
        if (Boolean(GLOBAL.player.m_upgrades[creatureStringID]) && GLOBAL.player.m_upgrades[creatureStringID].level > 1) {
            level = GLOBAL.player.m_upgrades[creatureStringID].level | 0;
        }
        this.mcMonsterInfo.tDescription.htmlText = "<b>" + KEYS.Get("hatcherypopup_level", { "v1": level }) + " " + KEYS.Get(as3.str(creature.name)) + "</b><br>" + KEYS.Get(as3.str(creature.description));
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #352: what it goes for, under its name)
            this.mcMonsterInfo.tDescription.htmlText = "<b>" + KEYS.Get("hatcherypopup_level", { "v1": level }) + " " + KEYS.Get(as3.str(creature.name)) + "</b><br><font color=\"#8A5A00\">" + CREATURELOCKER.ioTags(creatureStringID) + "</font><br>" + KEYS.Get(as3.str(creature.description));
            GLOBAL.ioFitHeight(this.mcMonsterInfo.tDescription, 9);
        }
        if (GLOBAL.INFERNO_ONLY && CREATURELOCKER._lockerData[creatureStringID] && CREATURELOCKER._lockerData[creatureStringID].t == 2) {
            // (QoL #27: Shift-click fills the Compound with it)
            this.mcMonsterInfo.tDescription.htmlText += "<br><font color=\"#B26A00\">" + KEYS.Get("io_hatch_fill_tip", { "v1": this.ioFillCount(creatureStringID) }) + "</font>";
        }
        if (Boolean(CREATURELOCKER._lockerData[creatureStringID]) && CREATURELOCKER._lockerData[creatureStringID].t == 2) {
            this.mcMonsterInfo.mcLocked.visible = false;
        } else {
            this.mcMonsterInfo.mcLocked.tText.htmlText = KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "incubator_unlockinlocker" : "hat_unlockinlocker", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[creatureStringID].name)), "v2": KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name)) });
            this.mcMonsterInfo.mcLocked.visible = true;
        }
        this.MonsterInfoShow();
    }

    public MonsterInfoShow(): void {
        this.mcMonsterInfo.visible = true;
    }

    public MonsterInfoHide(param1: MouseEvent = null): void {
        this.mcMonsterInfo.visible = false;
    }

    // ---- Inferno-only (QoL #552): on a touch screen the stats were the mouse's hover only, so a finger read them by
    // spending Magma: a finger's first tap on a monster shows its stats (the monster glowing, "Tap again to add one"),
    // the second tap on it adds (held, it keeps adding, as before). The mouse is unchanged.
    /** The monster tapped once (its number; 0: none), its tile, and the tile's own filters (a locked one's grey). */
    private _ioPicked: int;

    private _ioPickedTile: MovieClip;

    private _ioPickedFilters: any[];

    private static readonly IO_PICK_GLOW: GlowFilter = new GlowFilter(0xFFC000, 1, 8, 8, 4, 2);

    /** QoL #552: a finger on monster `n` not tapped before: its stats, and nothing more (true). */
    private ioTapFirst(n: int, tile: MovieClip): boolean {
        if (!GLOBAL.INFERNO_ONLY || !IoPinchZoom.fingerDown || this._ioPicked == n) {
            return false;
        }
        this.ioPick(n, tile);
        return true;
    }

    private ioPick(n: int, tile: MovieClip): void {
        if (this._ioPickedTile) {
            this._ioPickedTile.filters = this._ioPickedFilters || [];
        }
        this._ioPicked = n;
        this._ioPickedTile = tile;
        this._ioPickedFilters = tile ? tile.filters : null;
        if (tile) {
            tile.filters = (this._ioPickedFilters || []).concat([HATCHERYPOPUP.IO_PICK_GLOW]);
        }
        this.MonsterInfoB(n);
        let id: string = HATCHERYPOPUP.ioMonsterId(n);
        if (CREATURELOCKER._lockerData[id] && CREATURELOCKER._lockerData[id].t == 2) {
            this.mcMonsterInfo.tDescription.htmlText += "<br><font color=\"#B26A00\"><b>" + KEYS.Get("io_ph_tap_add") + "</b></font>";
            GLOBAL.ioFitHeight(this.mcMonsterInfo.tDescription, IoPhoneText.smallest(9));
        }
    }

    /** Inferno-only (QoL #360): a locked monster clicked: not unlocked yet, and Open the Strongbox (on it). */
    private ioLockedClick(id: string, n: int = 0, tile: MovieClip = null): Function {
        return (e: MouseEvent = null): void => {
            // (QoL #552: a finger's first tap only shows it)
            if (n > 0 && this.ioTapFirst(n, tile)) {
                return;
            }
            SOUNDS.Play("error1");
            let name: string = KEYS.Get(as3.str(CREATURELOCKER._creatures[id].name));
            GLOBAL.Message(KEYS.Get("io_hatch_locked", { "v1": name }), GLOBAL._bLocker ? KEYS.Get("io_hatch_open_box") : null, GLOBAL._bLocker ? (): void => {
                CREATURELOCKER._popupCreatureID = id;
                HATCHERY.Hide();
                CREATURELOCKER.Show();
            } : null);
        };
    }

    public QueueAdd(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc4_: any = undefined;
            let _loc5_: any = undefined;
            let _loc2_: any = HATCHERYPOPUP.ioMonsterId(n);
            let _loc3_: any = 1 + this._hatchery._lvl.Get();
            if (!BASE.Charge(4, CREATURES.GetProperty(as3.str(_loc2_), "cResource"), true)) {
                if (GLOBAL.INFERNO_ONLY && BASE.isInfernoMainYardOrOutpost) {
                    // (QoL #360: how much it costs, and Top up, rather than a bare "Not enough Magma.")
                    GLOBAL.Message(KEYS.Get("io_hatch_nomagma", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc2_].name)), "v2": GLOBAL.FormatNumber(CREATURES.GetProperty(as3.str(_loc2_), "cResource")), "v3": GLOBAL.FormatNumber(BASE._resources.r4.Get()) }), KEYS.Get("io_topup"), (): void => {
                        UI2._top.Topup(4)();
                    });
                } else if (BASE.isInfernoMainYardOrOutpost) {
                    GLOBAL.Message("Not enough Magma.");
                } else {
                    GLOBAL.Message(KEYS.Get("hat_notenoughgoo"));
                }
                return;
            }
            if (Boolean(CREATURELOCKER._lockerData[_loc2_]) && CREATURELOCKER._lockerData[_loc2_].t == 2) {
                _loc4_ = this._hatchery._monsterQueue;
                _loc5_ = 0;
                while (_loc5_ < _loc4_.length) {
                    if (_loc4_[_loc5_][0] == _loc2_ && _loc4_[_loc5_][1] < 20) {
                        ++_loc4_[_loc5_][1];
                        this.Charge(as3.str(_loc2_));
                        this.RenderQueue();
                        return;
                    }
                    _loc5_++;
                }
                if (_loc4_.length > 0 && _loc4_[_loc4_.length - 1][0] == _loc2_) {
                    if (_loc4_[_loc4_.length - 1][1] < 20) {
                        ++_loc4_[_loc4_.length - 1][1];
                        this.Charge(as3.str(_loc2_));
                    } else if (_loc4_.length < _loc3_) {
                        _loc4_.push([_loc2_, 1]);
                        this.Charge(as3.str(_loc2_));
                    } else {
                        SOUNDS.Play("error1");
                    }
                } else {
                    if (_loc4_.length < _loc3_) {
                        _loc4_.push([_loc2_, 1]);
                        this.Charge(as3.str(_loc2_));
                    } else {
                        SOUNDS.Play("error1");
                    }
                    if (!this._hatchery._inProduction) {
                        this._hatchery.StartProduction();
                    }
                    if (!this._ioHolding) {
                        BASE.Save();
                    }
                }
                this.RenderQueue();
            }
        };
    }

    /**
     * Inferno-only (QoL #29, Refill army): room in incubator `param1`'s queue for one more `param2` (as QueueAdd
     * fills it: an entry of it under 20, or a free entry of its 1 + level).
     */
    public static ioRoomFor(param1: BUILDING13, param2: string): boolean {
        if (!param1 || !param1._monsterQueue) {
            return false;
        }
        for (let entry of as3.values(param1._monsterQueue)) {
            if (entry[0] == param2 && entry[1] < 20) {
                return true;
            }
        }
        return param1._monsterQueue.length < 1 + param1._lvl.Get();
    }

    /**
     * Inferno-only (QoL #29, Refill army): one `param2` queued in incubator `param1` with the window closed, as
     * QueueAdd does it (paid in Magma, into an entry of it under 20 or a new entry, hatching started when idle).
     * False (nothing taken) when it is locked, there is no room, or not the Magma. The caller saves.
     */
    public static ioQueueInto(param1: BUILDING13, param2: string): boolean {
        if (!GLOBAL.INFERNO_ONLY || !param1 || !(CREATURELOCKER._lockerData[param2] && CREATURELOCKER._lockerData[param2].t == 2) || !HATCHERYPOPUP.ioRoomFor(param1, param2)) {
            return false;
        }
        let cost: number = CREATURES.GetProperty(param2, "cResource");
        if (!BASE.Charge(4, cost, true)) {
            return false;
        }
        let q: any[] = param1._monsterQueue;
        let entry: any[] = null;
        for (let e of as3.values(q)) {
            if (e[0] == param2 && e[1] < 20) {
                entry = e;
                break;
            }
        }
        if (entry) {
            ++entry[1];
        } else {
            q.push([param2, 1]);
        }
        BASE.Charge(4, cost);
        if (!param1._inProduction) {
            param1.StartProduction();
        }
        return true;
    }

    private Charge(param1: string): void {
        BASE.Charge(4, CREATURES.GetProperty(param1, "cResource"));
        ResourcePackages.Create(BASE.isInfernoMainYardOrOutpost ? 8 : 4, this._hatchery, CREATURES.GetProperty(param1, "cResource") | 0, true);
        if (!this._ioHolding) {
            BASE.Save();
        }
    }

    /**
     * Inferno-only (QoL #27): how many of `id` there's room for: the Compound's free room less what every incubator
     * has queued, the Magma, and this incubator's queue (its entries, 20 each).
     */
    public ioFillCount(id: string): int {
        let size: int = CREATURES.GetProperty(id, "cStorage", 0, true) | 0;
        let cost: int = CREATURES.GetProperty(id, "cResource") | 0;
        if (size <= 0 || !this._hatchery) {
            return 0;
        }
        HOUSING.HousingSpace();
        let queued: int = 0;
        for (let h of (InstanceManager.getInstancesByClass(BUILDING13) ?? [])) {
            for (let entry of as3.values(as3.as(h._monsterQueue, Array))) {
                queued += (CREATURES.GetProperty(String(entry[0]), "cStorage", 0, true) * (entry[1] | 0)) | 0;
            }
        }
        let n: int = Math.floor((HOUSING._housingSpace.Get() - queued) / size) | 0;
        if (cost > 0) {
            n = Math.min(n, Math.floor(BASE._resources["r4"].Get() / cost)) | 0;
        }
        let q: any[] = this._hatchery._monsterQueue;
        let slots: int = 0;
        for (let entry of as3.values(q)) {
            if (entry[0] == id) {
                slots += Math.max(0, 20 - (entry[1] | 0));
            }
        }
        slots += Math.max(0, 1 + this._hatchery._lvl.Get() - q.length) * 20;
        return Math.max(0, Math.min(n, slots)) | 0;
    }

    /** Queues as many as fit (ioFillCount), saved once. */
    private ioFill(n: int): void {
        let id: string = HATCHERYPOPUP.ioMonsterId(n);
        let count: int = this.ioFillCount(id);
        if (count <= 0) {
            SOUNDS.Play("error1");
            GLOBAL.Message(KEYS.Get("io_hatch_fill_none"));
            return;
        }
        this._ioHolding = true;
        for (let i: int = 0; i < count; i++) {
            if (!this.ioHasRoom(id) || !BASE.Charge(4, CREATURES.GetProperty(id, "cResource"), true)) {
                break;
            }
            this.QueueAdd(n)();
        }
        this._ioHolding = false;
        BASE.Save();
        this.MonsterInfoB(n);
    }

    private ioHoldStart(n: int, tile: MovieClip = null): Function {
        return (e: MouseEvent = null): void => {
            if (e && e.shiftKey) {
                this.ioFill(n);
                return;
            }
            // (QoL #552: a finger's first tap on it shows its stats; the next one adds)
            if (this.ioTapFirst(n, tile)) {
                return;
            }
            this.ioHoldStop();
            this._ioHoldN = n;
            this._ioHoldTick = 0;
            this._ioHolding = true;
            this.QueueAdd(n)();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
            this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioHoldStop));
            if (this.stage) {
                this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioHoldStop));
            }
        };
    }

    /** Room for one more of this monster: an entry of it under 20, or a free entry. */
    private ioHasRoom(id: string): boolean {
        let q: any[] = this._hatchery._monsterQueue;
        for (let entry of as3.values(q)) {
            if (entry[0] == id && entry[1] < 20) {
                return true;
            }
        }
        return q.length < 1 + this._hatchery._lvl.Get();
    }

    private ioHoldTick(e: Event = null): void {
        this._ioHoldTick++;
        if (this._ioHoldTick < 12 || this._ioHoldTick % 2 != 0) {
            return;
        }
        let id: string = HATCHERYPOPUP.ioMonsterId(this._ioHoldN);
        if (!this.ioHasRoom(id) || !BASE.Charge(4, CREATURES.GetProperty(id, "cResource"), true)) {
            this.ioHoldStop();
            return;
        }
        this.QueueAdd(this._ioHoldN)();
    }

    private ioHoldStop(e: Event = null): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioHoldTick));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioHoldStop));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioHoldStop));
        }
        if (this._ioHolding) {
            this._ioHolding = false;
            BASE.Save();
        }
    }

    /** (Inferno-only, QoL #553) on a touch screen, the queue slot tapped once (its X shown), and when */
    private _ioArmed: int;

    private _ioArmedAt: number;

    private ioRemoveStart(n: int): Function {
        return (e: MouseEvent = null): void => {
            // (QoL #553: on a touch screen a tap shows the slot's remove X; a second tap on it takes one out. A touch
            // took a monster out at once)
            if (GLOBAL.ioTouch && (this._ioArmed != n || getTimer() - this._ioArmedAt > 4000)) {
                let q0: any[] = this._hatchery._monsterQueue;
                if (q0.length >= n) {
                    if (this._ioArmed > 0 && this["mcRemove" + this._ioArmed]) {
                        this["mcRemove" + this._ioArmed].visible = false;
                    }
                    this._ioArmed = n;
                    this._ioArmedAt = getTimer();
                    if (this["mcRemove" + n]) {
                        this["mcRemove" + n].visible = true;
                    }
                    return;
                }
            }
            this.ioRemoveStop();
            let q: any[] = this._hatchery._monsterQueue;
            if (q.length < n) {
                this.QueueRemove(n)();
                return;
            }
            this._ioRemoving = n;
            this._ioRemoveId = String(q[n - 1][0]);
            this._ioRemoveTick = 0;
            this.QueueRemove(n)();
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioRemoveTick));
            this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioRemoveStop));
            if (this.stage) {
                this.stage.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRemoveStop));
            }
        };
    }

    private ioRemoveTick(e: Event = null): void {
        this._ioRemoveTick++;
        if (this._ioRemoveTick < 18 || this._ioRemoveTick % 2 != 0) {
            return;
        }
        let q: any[] = this._hatchery._monsterQueue;
        let n: int = this._ioRemoving;
        // (that slot emptied, or now holds the next entry: stop there)
        if (n <= 0 || q.length < n || String(q[n - 1][0]) != this._ioRemoveId) {
            this.ioRemoveStop();
            return;
        }
        let last: boolean = q[n - 1][1] <= 1;
        this.QueueRemove(n)();
        if (last) {
            this.ioRemoveStop();
        }
    }

    private ioRemoveStop(e: Event = null): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioRemoveTick));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.ioRemoveStop));
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.ioRemoveStop));
        }
        this._ioRemoving = 0;
    }

    public QueueRemove(param1: int): Function {
        let n: int = 0;
        n = param1;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = undefined;
            let _loc3_: any = undefined;
            if (n > 0) {
                _loc3_ = this._hatchery._monsterQueue;
                if (_loc3_.length >= n) {
                    _loc2_ = _loc3_[n - 1][0];
                    --_loc3_[n - 1][1];
                    if (_loc3_[n - 1][1] <= 0) {
                        _loc3_.splice(n - 1, 1);
                    }
                    BASE.Fund(4, CREATURES.GetProperty(as3.str(_loc2_), "cResource"), GLOBAL.INFERNO_ONLY);
                    BASE.Save();
                } else {
                    SOUNDS.Play("error1");
                }
            } else if (this._hatchery._inProduction != "") {
                BASE.Fund(4, CREATURES.GetProperty(this._hatchery._inProduction, "cResource"), GLOBAL.INFERNO_ONLY);
                this._hatchery.StartProduction();
            }
            this.RenderQueue();
        };
    }

    public RenderQueue(): void {
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc1_: int = (2 + this._hatchery._lvl.Get()) | 0;
        let _loc2_: any[] = this._hatchery._monsterQueue;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            ImageCache.GetImageWithCallBack("monsters/" + _loc2_[_loc3_][0] + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this["slot" + (_loc3_ + 1)]]);
            this["mcCount" + (_loc3_ + 1)].visible = true;
            this["mcCount" + (_loc3_ + 1)].tCounter.text = _loc2_[_loc3_][1];
            _loc3_++;
        }
        _loc3_ = _loc2_.length | 0;
        while (_loc3_ < _loc1_ - 1) {
            this["slot" + (_loc3_ + 1)].mcImage.visible = false;
            this["slot" + (_loc3_ + 1)].mcLoading.visible = false;
            this["mcCount" + (_loc3_ + 1)].visible = false;
            _loc3_++;
        }
        _loc3_ = (_loc1_ - 1) | 0;
        while (_loc3_ < 4) {
            this["slot" + (_loc3_ + 1)].tLabel.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("hat_slot_upgrade", { "v1": KEYS.Get(as3.str(GLOBAL._bHatchery._buildingProps.name)) }) + "</font>";
            this["slot" + (_loc3_ + 1)].mcImage.visible = false;
            this["slot" + (_loc3_ + 1)].mcLoading.visible = false;
            this["mcCount" + (_loc3_ + 1)].visible = false;
            _loc3_++;
        }
        if (this._hatchery._inProduction) {
            this.bFinish.gotoAndStop(2);
            this.bFinish.Enabled = true;
            ImageCache.GetImageWithCallBack("monsters/" + this._hatchery._inProduction + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [this.slot0]);
            _loc4_ = CREATURES.GetProperty(this._hatchery._inProduction, "cTime") | 0;
            if ((_loc5_ = (100 / _loc4_ * this._hatchery._countdownProduce.Get()) | 0) < 0) {
                _loc5_ = 0;
            }
            this.bProgress.mcBar.width = 100 - _loc5_;
            if (this._hatchery._countdownProduce.Get() > 0) {
                this.tProgress.htmlText = "<b>" + GLOBAL.ToTime(this._hatchery._countdownProduce.Get() | 0, true) + "</b>";
            } else {
                this.tProgress.htmlText = "<b>" + KEYS.Get("hat_status_waiting") + "</b>";
            }
            // (Inferno-only, QoL #564: the countdown on a phone not under 11)
            IoPhoneText.floor(this.tProgress, true);
            this.bProgress.visible = true;
            this.tProgress.visible = true;
            if (TUTORIAL._currentStage < 200 || GLOBAL._hatcheryOverdrivePower.Get() == 10) {
                this.bSpeedup.gotoAndStop(1);
            } else {
                this.bSpeedup.gotoAndStop(2);
            }
        } else {
            this.bFinish.gotoAndStop(1);
            this.bFinish.Enabled = false;
            this.slot0.mcImage.visible = false;
            this.slot0.mcLoading.visible = false;
            this.bProgress.visible = false;
            this.tProgress.visible = false;
            this.bSpeedup.gotoAndStop(1);
        }
    }

    public Setup(param1: BUILDING13): void {
        this._hatchery = param1;
        let _loc2_: int = (2 + this._hatchery._lvl.Get()) | 0;
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_) {
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_DOWN, GLOBAL.INFERNO_ONLY && _loc3_ > 0 ? this.ioRemoveStart(_loc3_) : this.QueueRemove(_loc3_));
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_OVER, this.ShowRemove(as3.cast(this["mcRemove" + _loc3_], MovieClip)));
            this["slot" + _loc3_].addEventListener(MouseEvent.MOUSE_OUT, this.HideRemove(as3.cast(this["mcRemove" + _loc3_], MovieClip)));
            this["slot" + _loc3_].buttonMode = true;
            _loc3_++;
        }
        _loc3_ = _loc2_;
        while (_loc3_ < 5) {
            this["slot" + _loc3_].gotoAndStop(1);
            _loc3_++;
        }
        _loc3_ = 0;
        while (_loc3_ < 5) {
            this["mcRemove" + _loc3_].visible = false;
            this["mcRemove" + _loc3_].mouseEnabled = false;
            _loc3_++;
        }
        this.MonsterInfoHide();
        this.Update();
    }

    public ShowRemove(param1: MovieClip): Function {
        let n: MovieClip = null;
        n = param1;
        return (param1: MouseEvent): void => {
            n.visible = true;
        };
    }

    public HideRemove(param1: MovieClip): Function {
        let n: MovieClip = null;
        n = param1;
        return (param1: MouseEvent): void => {
            n.visible = false;
        };
    }

    /** Inferno-only (QoL #28): the Compound's room, on the title's line. */
    private _ioRoom: TextField;

    private ioRoomLine(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.title_txt) {
            return;
        }
        if (!this._ioRoom) {
            this._ioRoom = new TextField();
            this._ioRoom.name = "ioHatchRoom";
            this._ioRoom.selectable = false;
            this._ioRoom.mouseEnabled = false;
            let f: TextFormat = new TextFormat("Verdana", 11, 0x3A2A1A, true);
            f.align = TextFormatAlign.RIGHT;
            this._ioRoom.defaultTextFormat = f;
            this._ioRoom.width = 300;
            this._ioRoom.height = 18;
            this.addChild(this._ioRoom);
        }
        HOUSING.HousingSpace();
        let queued: int = 0;
        for (let x of (InstanceManager.getInstancesByClass(BUILDING13) ?? [])) {
            for (let e of as3.values((x as any)._monsterQueue || [])) {
                queued += (CREATURES.GetProperty(e[0], "cStorage", 0, true) * e[1]) | 0;
            }
        }
        let used: int = HOUSING._housingUsed.Get() | 0;
        let cap: int = HOUSING._housingCapacity.Get() | 0;
        this._ioRoom.text = KEYS.Get(queued > 0 ? "io_hatch_room_queued" : "io_hatch_room", { "v1": GLOBAL.FormatNumber(used), "v2": GLOBAL.FormatNumber(cap), "v3": GLOBAL.FormatNumber(queued) });
        this._ioRoom.textColor = used + queued >= cap ? 0xB00000 : 0x3A2A1A;
        this._ioRoom.x = this.title_txt.x + this.title_txt.width - 304;
        this._ioRoom.y = this.title_txt.y + this.title_txt.height + 2;
    }

    public Update(): void {
        let _loc4_: boolean = false;
        let _loc5_: any[] = null;
        this.RenderQueue();
        this.ioRoomLine();
        let _loc1_: any[] = this._hatchery._monsterQueue;
        let _loc2_: any[] = [];
        let _loc3_: int = (1 + this._hatchery._lvl.Get()) | 0;
        if (_loc1_.length == 0 && !this._hatchery._inProduction) {
            _loc2_ = [1, "<font color=\"#CC0000\"><b>" + KEYS.Get("hat_nothinginproduction") + "</b></font> " + KEYS.Get("hat_producing_message")];
        } else if (this._hatchery._canFunction) {
            if (this._hatchery._productionStage.Get() == 2 && this._hatchery._inProduction && !HOUSING.HousingStore(this._hatchery._inProduction, new Point(this._hatchery._mc.x, this._hatchery._mc.y), true)) {
                _loc2_ = [2, KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "incubator_needhousing" : "hat_needhousing")];
            } else if (GLOBAL.INFERNO_ONLY && !CREATURELOCKER._creatures[this._hatchery._inProduction]) {
                // (Inferno-only, 15 October: a queue with nothing hatching yet (the next tick starts it), or a kind no
                // longer in the game, threw here and left the window half built)
                _loc2_ = [1, KEYS.Get("hat_producing_message")];
            } else {
                _loc2_ = [1, "<b>" + KEYS.Get("hat_producing_monsters", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[this._hatchery._inProduction].name)) }) + "</b>"];
                _loc4_ = true;
                if (_loc1_.length < _loc3_) {
                    _loc4_ = false;
                } else {
                    for (_loc5_ of as3.values(_loc1_)) {
                        if (_loc5_[1] < 20) {
                            _loc4_ = false;
                        }
                    }
                }
                if (!_loc4_) {
                    _loc2_[1] += " " + KEYS.Get("hat_producing_message");
                } else {
                    _loc2_[1] += " " + KEYS.Get("hat_queuefull");
                }
            }
        } else {
            _loc2_ = [2, KEYS.Get("hat_damaged")];
        }
        if (_loc2_[0] == 1) {
            this.mcMessage.gotoAndStop(1);
        } else {
            this.mcMessage.gotoAndStop(2);
        }
        this.mcMessage.tA.htmlText = _loc2_[1];
        if (GLOBAL._hatcheryOverdrive > 0) {
            this.mcOverdrive.t.htmlText = "<b>" + KEYS.Get("hat_xoverdrive", { "v1": GLOBAL._hatcheryOverdrivePower.Get(), "v2": GLOBAL.ToTime(GLOBAL._hatcheryOverdrive) }) + "</b>";
            this.mcOverdrive.visible = true;
        } else {
            this.mcOverdrive.visible = false;
        }
        this._scrollSet.Update();
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 4;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("hcc_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    private FinishNow(param1: MouseEvent): void {
        let _loc2_: any[] = null;
        let _loc3_: string = null;
        let _loc4_: any = null;
        let _loc5_: string = null;
        if (!this.bFinish.Enabled) {
            return;
        }
        if (Boolean(this._hatchery) && this._hatchery._finishCost.Get() > 0) {
            if (BASE._credits.Get() >= this._hatchery._finishCost.Get()) {
                _loc2_ = [];
                _loc4_ = this._hatchery._finishQueue;
                for (_loc5_ in _loc4_) {
                    if (_loc4_[_loc5_] > 0) {
                        _loc3_ = KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc5_].name));
                        _loc2_.push([_loc4_[_loc5_], _loc3_]);
                    }
                }
                GLOBAL.Array2String(_loc2_);
                if (this._hatchery._finishAll) {
                    GLOBAL.Message(KEYS.Get("msg_finishqueue", { "v1": GLOBAL.Array2String(_loc2_), "v2": this._hatchery._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                } else {
                    GLOBAL.Message(KEYS.Get("msg_fillhousing", { "v1": GLOBAL.Array2String(_loc2_), "v2": this._hatchery._finishCost.Get() }), KEYS.Get("str_finishnow"), as3.bind(this, this.DoFinish));
                }
            } else {
                POPUPS.DisplayGetShiny(param1);
            }
        } else if (this._hatchery._finishCost.Get() <= 0) {
            GLOBAL.Message(KEYS.Get(BASE.isInfernoMainYardOrOutpost ? "msg_compoundfull" : "msg_housingfull"));
        }
    }

    private DoFinish(): void {
        this._hatchery.FinishNow();
    }

    public Hide(param1: MouseEvent = null): void {
        HATCHERY.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
