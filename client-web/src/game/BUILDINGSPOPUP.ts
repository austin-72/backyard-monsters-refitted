import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, BDECORATION, BFOUNDATION, BUILDINGBUTTON, BUILDINGBUTTONSOON, BUILDINGOPTIONSPOPUP, BUILDINGS, BUILDINGSPOPUP_CLIP, Button, Button_CLIP, GLOBAL, InstanceManager, InventoryManager, IoPetsPanel, IoTrapRearm, IoWallUpgrade, KEYS, POPUPSETTINGS, SOUNDS, TUTORIAL } from "@game";

export class BUILDINGSPOPUP extends BUILDINGSPOPUP_CLIP {
    static {
        as3.fields(this, { _subButtonsMC: null, _thumbnailsMC: null, _buildingInfoMC: null, _pageCount: 0, _excluded: null, _subButtons: null, _ioRowMC: null });
    }

    /**
     * Inferno-only (16 October, the user's: "reorganize how everything is grouped in the decorations tab"): the
     * Decorations tab's sub-tabs. They were the old game's (War, Nature, Leisure, Flags, Special) with Pets and
     * Animated after: Nature was empty (every one of its decorations retired: only one in storage shows), the
     * Inferno's own animated decorations came last, the Sign was among the flags and the earned trophies among the
     * bought ones. Now: Animated first, War, Yard (Leisure with Nature's retired ones), Trophies (the gold trophies and
     * landmarks, then the prizes won), Flags & Signs (the Alliance Banner, the Sign, the Pirate and Peace flags, the nations by name) and
     * Pets. A tab's decorations are in IO_DECO_TABS' order; one not listed goes by its old subgroup (ioDecoTabOf).
     */
    public static readonly IO_TAB_ANIMATED: int = 0;

    public static readonly IO_TAB_WAR: int = 1;

    public static readonly IO_TAB_YARD: int = 2;

    public static readonly IO_TAB_TROPHIES: int = 3;

    public static readonly IO_TAB_FLAGS: int = 4;

    /** Inferno-only: the Decorations' Pets tab (its sub-menu index). */
    public static readonly IO_PETS_TAB: int = 5;

    /** The decorations of each tab (but Pets), in their order (the flags after the Sign, Pirate and Peace: by name). */
    private static readonly IO_DECO_TABS: any[] = [
        [171, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169],
        [107, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85],
        [71, 65, 60, 61, 62, 108, 109, 68, 57, 58, 63, 64, 70, 102, 103, 104, 105, 106, 55, 56, 59, 66, 67, 69, 72, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
        [99, 100, 101, 96, 97, 98, 148, 149, 146, 147, 121, 122, 123, 124, 125, 126, 131, 110, 111, 135],
        [170, 150, 49, 50, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
    ];

    /**
     * The flags kept first in Flags & Signs (16 October: the Alliance Banner, then the Sign, the Pirate and Peace
     * flags); the others by their name.
     */
    private static readonly IO_FLAGS_FIRST: int = 4;

    /** The old subgroups' tabs, for a decoration IO_DECO_TABS doesn't list (War, Nature, Leisure, Flags, Special, -, Animated). */
    private static readonly IO_OLD_SUBGROUP: any[] = [1, 2, 2, 4, 3, -1, 0];

    /** Inferno-only: the Decorations sub-tab a decoration is on (-1: none of them). */
    public static ioDecoTabOf(id: int): int {
        for (let t: int = 0; t < BUILDINGSPOPUP.IO_DECO_TABS.length; t++) {
            if ((BUILDINGSPOPUP.IO_DECO_TABS[t] as any[]).indexOf(id) >= 0) {
                return t;
            }
        }
        let props: any = GLOBAL._buildingProps[id - 1];
        let old: int = props && props.subgroup != null ? props.subgroup | 0 : 2;
        return old >= 0 && old < BUILDINGSPOPUP.IO_OLD_SUBGROUP.length ? BUILDINGSPOPUP.IO_OLD_SUBGROUP[old] | 0 : -1;
    }

    /** A decoration's place in its tab (ioDecoTabOf): its list's order; the nations' flags by their name. */
    private static ioDecoRanks(tab: int): any {
        let list: any[] = tab >= 0 && tab < BUILDINGSPOPUP.IO_DECO_TABS.length ? (BUILDINGSPOPUP.IO_DECO_TABS[tab] as any[]).concat() : [];
        if (tab == BUILDINGSPOPUP.IO_TAB_FLAGS) {
            let first: any[] = list.slice(0, BUILDINGSPOPUP.IO_FLAGS_FIRST);
            let rest: any[] = list.slice(BUILDINGSPOPUP.IO_FLAGS_FIRST);
            let nameOf = (id: int): string => {
                let p: any = GLOBAL._buildingProps[id - 1];
                return p ? String(KEYS.Get(p.name)) : "";
            };
            rest.sort((a: int, b: int): number => nameOf(a).localeCompare(nameOf(b)));
            list = first.concat(rest);
        }
        let ranks: any = {};
        for (let i: int = 0; i < list.length; i++) {
            ranks[list[i]] = i;
        }
        return ranks;
    }

    /** The sub-tabs' names (Button.Setup draws them as HTML: "&" written out). */
    private static ioDecoTabNames(): any[] {
        return [KEYS.Get("btn_io_animated"), KEYS.Get("btn_evil"), KEYS.Get("io_deco_tab_yard"), KEYS.Get("io_deco_tab_trophies"), KEYS.Get("io_deco_tab_flags"), KEYS.Get("io_deco_tab_pets")].map((s: string): string => String(s).replace(/&(?!amp;)/g, "&amp;"));
    }
    public _subButtonsMC: MovieClip;
    public _thumbnailsMC: MovieClip;
    public _buildingInfoMC: BUILDINGOPTIONSPOPUP;
    public _pageCount: int;
    public _excluded: any[];
    public _subButtons: any[];
    /** Inferno-only (QoL #478): the Defensive tab's "Upgrade all walls" and "Re-arm all traps", in the sub-tabs' row. */
    public _ioRowMC: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this._subButtonsMC = null;
        this._thumbnailsMC = null;
        this._buildingInfoMC = null;
        this._pageCount = 0;
        this.mcNew.visible = GLOBAL._newThings;
        this.b1.SetupKey("btn_resources");
        this.b2.SetupKey("btn_buildings");
        this.b3.SetupKey("btn_defensive");
        this.b4.SetupKey("btn_decorations");
        this.b1.addEventListener(MouseEvent.CLICK, this.Switch(1, 1, 0));
        this.b2.addEventListener(MouseEvent.CLICK, this.Switch(2, 1, 0));
        this.b3.addEventListener(MouseEvent.CLICK, this.Switch(3, 1, 0));
        this.b4.addEventListener(MouseEvent.CLICK, this.Switch(4, 0, 0));
        this.bPrevious.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Previous));
        this.bPrevious.buttonMode = true;
        this.bNext.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Next));
        this.bNext.buttonMode = true;
        if (!GLOBAL.townHall) {
            this.SwitchB(2, 1, 0);
        } else {
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
        }
        if (BASE.isMainYard) {
            if (!GLOBAL._flags.radio) {
                GLOBAL._buildingProps[112].block = true;
                GLOBAL._buildingProps[11].order = 2;
            }
        }
    }

    public Switch(param1: int, param2: int, param3: int): Function {
        let a: int = 0;
        let b: int = 0;
        let p: int = 0;
        a = param1;
        b = param2;
        p = param3;
        return (param1: MouseEvent): void => {
            if (param1.target.Enabled) {
                SOUNDS.Play("click1");
                this.SwitchB(a, b, p);
            }
        };
    }

    public Exclude(param1: any[]): void {
        let _loc3_: int = 0;
        let _loc2_: int = 0;
        while (_loc2_ < param1.length) {
            if (as3.is(param1[_loc2_], Array)) {
                if (this._subButtons) {
                    if (param1[_loc2_].length == this._subButtons.length) {
                        _loc3_ = 0;
                        while (_loc3_ < param1[_loc2_].length) {
                            this._subButtons[param1[_loc2_][_loc3_]].Enabled = false;
                            _loc2_++;
                        }
                    }
                }
            } else {
                this["b" + param1[_loc2_]].Enabled = false;
            }
            _loc2_++;
        }
        this._excluded = param1;
    }

    public SwitchB(param1: int, param2: int, param3: int): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc8_: int = 0;
        let _loc10_: any = null;
        let _loc11_: BUILDINGBUTTON = null;
        BUILDINGS._menuA = param1;
        BUILDINGS._menuB = param2;
        BUILDINGS._page = param3;
        let _loc4_: int = 1;
        while (_loc4_ < 5) {
            this["b" + _loc4_].Highlight = false;
            _loc4_++;
        }
        this["b" + param1].Highlight = true;
        let ioDeco: boolean = GLOBAL.INFERNO_ONLY && param1 == 4;
        if (ioDeco && (BUILDINGS._menuB < 0 || BUILDINGS._menuB > BUILDINGSPOPUP.IO_PETS_TAB)) {
            // (a sub-tab of the old Decorations, remembered from before: the first)
            BUILDINGS._menuB = 0;
        }
        if (param1 == 4) {
            // Inferno-only (16 October): Animated, War, Yard, Trophies, Flags & Signs, Pets (see IO_DECO_TABS)
            this.SubMenu(GLOBAL.INFERNO_ONLY ? BUILDINGSPOPUP.ioDecoTabNames() : [KEYS.Get("btn_evil"), KEYS.Get("btn_plants"), KEYS.Get("btn_good"), KEYS.Get("btn_flags"), KEYS.Get("btn_premium")]);
        } else {
            this.SubMenu([]);
        }
        if (this._thumbnailsMC) {
            this.removeChild(this._thumbnailsMC);
        }
        this._thumbnailsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._thumbnailsMC.x = 60;
        this._thumbnailsMC.y = 115 + 25;
        if (GLOBAL.INFERNO_ONLY && param1 == 4 && BUILDINGS._menuB == BUILDINGSPOPUP.IO_PETS_TAB) {
            this._pageCount = IoPetsPanel.fill(this._thumbnailsMC, BUILDINGS._page, as3.bind(this, this.ioRefreshPets));
            this.bPrevious.Trigger(BUILDINGS._page > 0);
            this.bNext.Trigger(BUILDINGS._page < this._pageCount - 1);
            this.ioDefenceRow(param1);
            return;
        }
        let _loc7_: any[] = GLOBAL._buildingProps.concat();
        if (TUTORIAL.hasFinished) {
            this.SortBuildings(_loc7_);
        } else {
            as3.sortOn(_loc7_, "order", Array.NUMERIC);
        }
        // (Inferno-only, 16 October: a Decorations tab in its own order; the rest kept as they were sorted)
        let ioRanks: any = ioDeco ? BUILDINGSPOPUP.ioDecoRanks(BUILDINGS._menuB) : null;
        if (ioRanks) {
            let at: any = new Map<any, number>();
            _loc7_.forEach((p: any, i: number): void => {
                at.set(p, i);
            });
            _loc7_.sort((a: any, b: any): number => {
                let ra: number = a && ioRanks[a.id | 0] != null ? Number(ioRanks[a.id | 0]) : 100000 + Number(at.get(a));
                let rb: number = b && ioRanks[b.id | 0] != null ? Number(ioRanks[b.id | 0]) : 100000 + Number(at.get(b));
                return ra - rb;
            });
        }
        param2 = 0;
        while (param2 < _loc7_.length) {
            _loc10_ = _loc7_[param2];

            if (BASE.isInfernoMainYardOrOutpost && (_loc10_.id | 0) == 135) {
                param2++;
                continue;
            }

            let onTab: boolean = ioDeco ? BUILDINGSPOPUP.ioDecoTabOf(_loc10_.id | 0) == BUILDINGS._menuB : _loc10_.subgroup == null || (_loc10_.subgroup | 0) == BUILDINGS._menuB;
            if ((_loc10_.group | 0) == param1 && onTab && (!_loc10_.block || InventoryManager.buildingStorageCount(_loc10_.id | 0))) {
                if (_loc8_ >= 10 * BUILDINGS._page && _loc8_ < 10 + 10 * BUILDINGS._page) {
                    (_loc11_ = as3.as(this._thumbnailsMC.addChild(new BUILDINGBUTTON()), BUILDINGBUTTON)).x = _loc5_ * 130;
                    _loc11_.y = _loc6_ * 170;
                    _loc11_.Setup(_loc10_.id | 0);
                    // (QoL #48: a decoration with several in storage: "Place all" on its picture)
                    if (GLOBAL.INFERNO_ONLY && param1 == 4) {
                        this.ioPlaceAllChip(_loc11_, _loc10_.id | 0);
                    }
                    _loc5_++;
                    if (_loc5_ == 5) {
                        _loc5_ = 0;
                        _loc6_++;
                    }
                    if (_loc6_ == 2) {
                        _loc6_ = 0;
                    }
                }
                _loc8_++;
            }
            param2++;
        }
        let _loc9_: BUILDINGBUTTONSOON = null;
        (_loc9_ = new BUILDINGBUTTONSOON()).t.htmlText = KEYS.Get("building_coming_soon");
        if (_loc8_ == 0) {
            this._thumbnailsMC.addChild(_loc9_);
        }
        this._pageCount = Math.ceil(_loc8_ / 10) | 0;
        if (BUILDINGS._page > 0) {
            this.bPrevious.Trigger(true);
        } else {
            this.bPrevious.Trigger(false);
        }
        if (BUILDINGS._page < this._pageCount - 1 && TUTORIAL._stage >= 200) {
            this.bNext.Trigger(true);
        } else {
            this.bNext.Trigger(false);
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioDefenceRow(param1);
        }
    }

    /**
     * Inferno-only (QoL #478): on the Defensive tab (it has no sub-tabs), in their row: "Upgrade all walls (N)" and
     * "Re-arm all traps (N)", each while there is something for it. They do what the buttons in a wall's or a
     * trap's own panel do (IoWallUpgrade.Show, IoTrapRearm.Show: the cost first).
     */
    private ioDefenceRow(tab: int): void {
        if (this._ioRowMC) {
            if (this._ioRowMC.parent) {
                this._ioRowMC.parent.removeChild(this._ioRowMC);
            }
            this._ioRowMC = null;
        }
        if (tab != 3 || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode() || GLOBAL.ioTdMode()) {
            return;
        }
        let walls: int = IoWallUpgrade.ioCount();
        let traps: int = IoTrapRearm.disarmed().length;
        let items: any[] = [];
        if (walls > 0) {
            items.push(["ioYard2WallsAll", KEYS.Get("io_yard2_walls_all", { "v1": walls }), (): void => {
                IoWallUpgrade.Show();
            }]);
        }
        if (traps > 0) {
            items.push(["ioYard2TrapsAll", KEYS.Get("io_yard2_traps_all", { "v1": traps }), (): void => {
                IoTrapRearm.Show();
            }]);
        }
        if (!items.length) {
            return;
        }
        this._ioRowMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._ioRowMC.name = "ioYard2DefenceRow";
        let w: int = 200;
        for (let i: int = 0; i < items.length; i++) {
            let it: any[] = items[i];
            let b: Button_CLIP = as3.as(this._ioRowMC.addChild(new Button_CLIP()), Button_CLIP);
            b.name = String(it[0]);
            b.x = i * (w + 10);
            b.width = w;
            b.Setup(String(it[1]));
            let go: Function = it[2];
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                // (the cost is asked in a message over the yard: the menu closes first)
                BUILDINGS.Hide();
                go();
            });
        }
        this._ioRowMC.x = 380 - this._ioRowMC.width / 2;
        this._ioRowMC.y = 75 + 25;
    }

    /** QoL #48: "Place all (N)" over the bottom of a decoration's picture (BDECORATION.ioPlaceAll), at 2 or more stored. */
    private ioPlaceAllChip(button: BUILDINGBUTTON, type: int): void {
        let n: int = BDECORATION.ioStored(type);
        if (n < 2) {
            return;
        }
        let chip: Sprite = new Sprite();
        chip.name = "ioYard2PlaceAll" + type;
        chip.buttonMode = true;
        chip.mouseChildren = false;
        let t: TextField = new TextField();
        let f: TextFormat = new TextFormat("Verdana", 10, 0xFFF2C4, true);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = 100;
        t.height = 16;
        t.y = 1;
        t.text = KEYS.Get("io_yard2_deco_all", { "v1": n });
        t.filters = [new GlowFilter(0x1A0A00, 1, 2, 2, 4, 1)];
        chip.graphics.lineStyle(1, 0xE0A040, 1);
        chip.graphics.beginFill(0x4A2A08, 0.92);
        chip.graphics.drawRoundRect(0, 0, 100, 18, 10, 10);
        chip.graphics.endFill();
        chip.addChild(t);
        chip.x = button.x + 10;
        chip.y = button.y + 116;
        chip.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("click1");
            BUILDINGS.Hide();
            BDECORATION.ioPlaceAll(type);
        });
        this._thumbnailsMC.addChild(chip);
    }

    /** Inferno-only: the Pets tab drawn again (after a pet is bought, brought out or put away). */
    public ioRefreshPets(): void {
        if (BUILDINGS._mc == this && BUILDINGS._menuA == 4 && BUILDINGS._menuB == BUILDINGSPOPUP.IO_PETS_TAB) {
            this.SwitchB(4, BUILDINGSPOPUP.IO_PETS_TAB, BUILDINGS._page);
        }
    }

    public SortBuildings(param1: any[]): void {
        let _loc3_: any = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: string = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        let _loc4_: int = 0;
        while (_loc4_ < param1.length) {
            if ((_loc5_ = param1[_loc4_]).group == BUILDINGS._menuA && (_loc5_.subgroup == null || _loc5_.subgroup == BUILDINGS._menuB) && (!_loc5_.block || InventoryManager.buildingStorageCount(_loc5_.id | 0))) {
                _loc3_ = GLOBAL._buildingProps[_loc5_.id - 1];
                if (_loc3_.type != "decoration") {
                    _loc7_ = (_loc6_ = GLOBAL.GetBuildingTownHallLevel(_loc3_)) < _loc3_.quantity.length ? _loc3_.quantity[_loc6_] | 0 : _loc3_.quantity[_loc3_.quantity.length - 1] | 0;
                    _loc8_ = 0;
                    _loc3_.buildStatus = 1;
                    for (_loc9_ of (_loc2_ ?? [])) {
                        if (_loc9_._type == _loc5_.id) {
                            _loc8_++;
                        }
                    }
                    if (_loc8_ <= 0 && Boolean(_loc3_.upgradeImgData)) {
                        _loc11_ = int.MAX_VALUE;
                        for (_loc12_ in _loc3_.upgradeImgData) {
                            if (!isNaN(Number(_loc12_))) {
                                _loc11_ = Math.min(_loc11_, Number(_loc12_)) | 0;
                            }
                        }
                        if (_loc11_ != int.MAX_VALUE && _loc3_.upgradeImgData[_loc11_].silhouette_img && !BASE.HasRequirements(_loc3_.costs[0]) && !_loc3_.rewarded) {
                            _loc3_.buildStatus = 2;
                        }
                    } else if (_loc8_ >= _loc7_) {
                        _loc3_.buildStatus = 3;
                    }
                    _loc10_ = Math.max.apply(Math, _loc3_.quantity) | 0;
                    if (_loc8_ >= _loc10_ && _loc10_ > 0) {
                        _loc3_.buildStatus = 4;
                    }
                }
            }
            _loc4_++;
        }
        as3.sortOn(param1, ["buildStatus", "order"], Array.NUMERIC);
    }

    /** (Inferno-only) the tabs' widths in `room`: each name's own (at the buttons' 9 px bold), the rest shared. */
    private static ioTabWidths(labels: any[], room: number): number[] {
        let m: TextField = new TextField();
        m.defaultTextFormat = new TextFormat("Verdana", 9, 0, true);
        let need: number[] = [];
        let sum: number = 0;
        for (let l of labels) {
            m.htmlText = "<b>" + as3.str(l) + "</b>";
            let w: number = Math.max(60, m.textWidth + 22);
            need.push(w);
            sum += w;
        }
        let out: number[] = [];
        for (let w of need) {
            out.push(sum <= room ? w + (room - sum) / need.length : w * room / sum);
        }
        return out;
    }

    public SubMenu(param1: any[]): void {
        let _loc4_: Button = null;
        if (this._subButtonsMC) {
            this.removeChild(this._subButtonsMC);
        }
        this._subButtonsMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        let _loc2_: any[] = [];
        let _loc3_: int = 0;
        // (six tabs, the Inferno's Decorations with Pets: a little narrower, to fit)
        let ioStep: int = param1.length > 6 ? 94 : (param1.length > 5 ? 102 : 110);
        // (Inferno-only, 16 October: each tab as wide as its name needs, the room left shared out: in French
        // "Drapeaux et panneaux" was squeezed to 7 px in a tab as narrow as "Cour")
        let ioWidths: number[] = GLOBAL.INFERNO_ONLY ? BUILDINGSPOPUP.ioTabWidths(param1, param1.length * (ioStep - 5)) : null;
        let ioX: number = 0;
        while (_loc3_ < param1.length) {
            (_loc4_ = as3.as(this._subButtonsMC.addChild(new Button_CLIP()), Button_CLIP)).x = ioWidths ? Math.round(ioX) : _loc3_ * ioStep;
            _loc4_.width = ioWidths ? Math.round(ioWidths[_loc3_]) : ioStep - 5;
            if (ioWidths) {
                ioX += ioWidths[_loc3_] + 5;
            }
            _loc4_.Setup(as3.str(param1[_loc3_]));
            _loc2_.push(_loc4_);
            _loc4_.addEventListener(MouseEvent.CLICK, this.Switch(BUILDINGS._menuA, _loc3_, 0));
            if (_loc3_ == BUILDINGS._menuB) {
                _loc4_.Highlight = true;
            }
            _loc3_++;
        }
        this._subButtonsMC.x = 380 - this._subButtonsMC.width / 2;
        this._subButtonsMC.y = 75 + 25;
    }

    public ShowInfo(param1: int): void {
        BUILDINGS._buildingID = param1;
        if (this._buildingInfoMC) {
            this._buildingInfoMC.parent.removeChild(this._buildingInfoMC);
        }
        GLOBAL.BlockerAdd();
        this._buildingInfoMC = as3.as(GLOBAL._layerWindows.addChild(new BUILDINGOPTIONSPOPUP("build", param1)), BUILDINGOPTIONSPOPUP);
        this._buildingInfoMC.x = GLOBAL._SCREENCENTER.x;
        this._buildingInfoMC.y = GLOBAL._SCREENCENTER.y;
    }

    public HideInfo(): void {
        if (this._buildingInfoMC) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            this._buildingInfoMC.parent.removeChild(this._buildingInfoMC);
            this._buildingInfoMC = null;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        BUILDINGS.Hide();
    }

    public Previous(param1: MouseEvent = null): void {
        if (BUILDINGS._page > 0) {
            --BUILDINGS._page;
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
            SOUNDS.Play("click1");
        }
    }

    public Next(param1: MouseEvent = null): void {
        if (BUILDINGS._page < this._pageCount - 1) {
            ++BUILDINGS._page;
            this.SwitchB(BUILDINGS._menuA, BUILDINGS._menuB, BUILDINGS._page);
            SOUNDS.Play("click1");
        }
    }

    public Center(): void {
        POPUPSETTINGS.AlignToUpperLeft(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}
