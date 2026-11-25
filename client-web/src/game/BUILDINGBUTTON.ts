import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BUILDINGBUTTON_CLIP, GLOBAL, ImageCache, InstanceManager, InventoryManager, IoMenuArt, KEYS, SOUNDS, STORE, IoAllianceBanner, IoChampionStatue, IoShop } from "@game";

export class BUILDINGBUTTON extends BUILDINGBUTTON_CLIP {
    static {
        as3.fields(this, { _buildingProps: null, _id: 0, ioArt: null });
    }

    private static s_LockedCallbacks: any[] = [];
    public _buildingProps: any;
    public _id: int;
    /** Inferno-only: the building drawn live (IoMenuArt), when it is. */
    public ioArt: IoMenuArt;

    public $ctor(): void {
        super.$ctor();
    }

    public static setOnClickedWhenLockedCallback(param1: int, param2: Function): void {
        BUILDINGBUTTON.s_LockedCallbacks[param1] = param2;
    }

    public Setup(param1: int, param2: boolean = true): void {
        let _loc7_: BFOUNDATION = null;
        let _loc8_: any = null;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: string = null;
        this._id = param1;
        this._buildingProps = GLOBAL._buildingProps[this._id - 1];
        this.mouseChildren = false;
        if (param2) {
            if (this.isLocked) {
                this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowLockedInfo));
            } else {
                this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ShowInfo));
            }
            this.buttonMode = true;
        }
        this.tName.htmlText = "<b>" + KEYS.Get(as3.str(this._buildingProps.name)) + "</b>";
        this.mcSale.visible = this._buildingProps.sale == 1;
        this.mcSale.t.htmlText = "<b>" + KEYS.Get("ui_sale_on") + "</b>";
        this.mcNew.t.htmlText = "<b>" + KEYS.Get("str_new_caps") + "</b>";
        let _loc3_: int = GLOBAL.GetBuildingTownHallLevel(this._buildingProps);
        let _loc4_: int = _loc3_ < this._buildingProps.quantity.length ? this._buildingProps.quantity[_loc3_] | 0 : this._buildingProps.quantity[this._buildingProps.quantity.length - 1] | 0;
        let _loc5_: int = 0;
        let _loc6_: Vector<any> = InstanceManager.getInstancesByClass(!(!this._buildingProps.cls) ? this._buildingProps.cls : BFOUNDATION);
        for (_loc7_ of (_loc6_ ?? [])) {
            if (_loc7_._type === this._id) {
                _loc5_++;
            }
        }
        if (this.isLocked) {
            this.tQuantity.htmlText = "";
        } else if (this._buildingProps.type == "decoration") {
            if ((_loc10_ = InventoryManager.buildingStorageCount(this._id)) > 0) {
                this.tQuantity.htmlText = "<font color=\"#0000CC\"><b>" + KEYS.Get("bdg_numinstorage", { "v1": _loc10_ }) + "</b></font>";
            } else {
                // (Inferno-only, 10 October: a free one says so; one with no price, a trophy placed, says nothing)
                let ioItem: any = STORE._storeItems["BUILDING" + this._id];
                if (GLOBAL.INFERNO_ONLY && IoChampionStatue.Is(this._id) && IoShop.tokens("statue") > 0) {
                    // (22 October: Champion Statues kept for the player: bought ahead in the Extras, or gifts)
                    this.tQuantity.htmlText = "<font color=\"#2E7D1E\"><b>" + KEYS.Get("io_shop_statue_kept", { "v1": IoShop.tokens("statue") }) + "</b></font>";
                } else if (GLOBAL.INFERNO_ONLY && (!ioItem || !(ioItem.c[0] > 0))) {
                    this.tQuantity.htmlText = ioItem ? "<font color=\"#2E7D1E\"><b>" + KEYS.Get("io_bb_free") + "</b></font>" : "";
                } else {
                    this.tQuantity.htmlText = "<font color=\"#333333\"><b>" + STORE._storeItems["BUILDING" + this._id].c[0] + " " + KEYS.Get("#r_shiny#") + "</b></font>";
                }
            }
        } else if (_loc5_ >= _loc4_) {
            this.tQuantity.htmlText = "<b><font color=\"#CC0000\">" + _loc5_ + " / " + _loc4_ + "</font></b>";
            // (Inferno-only, QoL #51: at the limit, when the hall's next levels allow more: "+1 at Under Hall 5")
            let more: any = GLOBAL.INFERNO_ONLY ? BUILDINGBUTTON.ioMoreAt(this._buildingProps.quantity, _loc3_) : null;
            if (more) {
                this.tQuantity.htmlText = "<b><font color=\"#CC0000\">" + _loc5_ + "/" + _loc4_ + "</font></b> <font color=\"#555555\">" + KEYS.Get("io_bb_more", { "v1": more.n - _loc4_, "v2": KEYS.Get("#bi_townhall#"), "v3": more.level }) + "</font>";
                GLOBAL.ioFitText(this.tQuantity);
            }
        } else {
            this.tQuantity.htmlText = "<b>" + _loc5_ + " / " + _loc4_ + "</b>";
        }
        if (_loc5_ <= 0 && Boolean(this._buildingProps.upgradeImgData)) {
            _loc11_ = int.MAX_VALUE;
            for (_loc12_ in this._buildingProps.upgradeImgData) {
                if (!isNaN(Number(_loc12_))) {
                    _loc11_ = Math.min(_loc11_, Number(_loc12_)) | 0;
                }
            }
            if (_loc11_ != int.MAX_VALUE && this._buildingProps.upgradeImgData[_loc11_].silhouette_img && !BASE.HasRequirements(this._buildingProps.costs[0]) && !this._buildingProps.rewarded) {
                _loc8_ = String(this._buildingProps.upgradeImgData.baseurl + this._buildingProps.upgradeImgData[_loc11_].silhouette_img);
            }
        }
        if (!_loc8_) {
            if (Boolean(this._buildingProps.buildingbuttons) && Boolean(BASE._buildingsStored["bl" + this._id]) && this._buildingProps.buildingbuttons.length >= BASE._buildingsStored["bl" + this._id].Get()) {
                _loc8_ = "buildingbuttons/" + this._buildingProps.buildingbuttons[BASE._buildingsStored["bl" + this._id].Get() - 1] + ".jpg";
            } else if (Boolean(this._buildingProps.buildingbuttons) && this._buildingProps.buildingbuttons.length > 0) {
                _loc8_ = "buildingbuttons/" + this._buildingProps.buildingbuttons[0] + ".jpg";
            } else {
                // (Inferno-only, 16 October: the Alliance Banner's card has the player's shield on it: IoAllianceBanner)
                _loc8_ = IoChampionStatue.cardKey(this._id, IoAllianceBanner.cardKey(this._id, "buildingbuttons/" + this._id + ".jpg"));
            }
        }
        let _loc9_: int = Math.max.apply(Math, this._buildingProps.quantity) | 0;
        this.mcShroud.visible = _loc5_ >= _loc4_ && _loc4_ > 0;
        this.mcCheck.visible = _loc5_ >= _loc9_ && _loc9_ > 0;
        this.mcNew.visible = false;
        if (GLOBAL._newThings && Boolean(this._buildingProps.isNew)) {
            this.mcNew.visible = true;
        }
        if (IoMenuArt.wanted(this._buildingProps) && !(GLOBAL.INFERNO_ONLY && _loc8_.indexOf("silhouette") >= 0)) {
            // Inferno-only: drawn live from its yard art (turning towers follow the mouse, animations play); a
            // building not unlocked yet shows its silhouette picture instead (inferno-missing-assets.zip)
            let level: int = Boolean(BASE._buildingsStored["bl" + this._id]) ? BASE._buildingsStored["bl" + this._id].Get() | 0 : 1;
            let silhouette: boolean = _loc8_.indexOf("silhouette") >= 0;
            let i: int = 1;
            while (i < this.mcBG.numChildren) {
                this.mcBG.getChildAt(i).visible = false;
                // (the picture's loading spinner)
                i++;
            }
            this.ioArt = as3.as(this.mcBG.addChild(new IoMenuArt(this._buildingProps, level, new Rectangle(0, 35, 120, 105), silhouette)), IoMenuArt);
        } else {
            ImageCache.GetImageWithCallBack(as3.str(_loc8_), as3.bind(this, this.ImageLoaded));
        }
        if (this.isLocked) {
            this.mcShroud.visible = true;
            if (this._buildingProps["lockedButtonOverlay"]) {
                ImageCache.GetImageWithCallBack(as3.str(this._buildingProps["lockedButtonOverlay"]), as3.bind(this, this.OnLockedOverlayLoaded));
            }
        }
    }

    /** QoL #51: the first hall level above `level` that allows more than now ({level, n}), or null. */
    public static ioMoreAt(quantity: any[], level: int): any {
        if (!quantity) {
            return null;
        }
        let now: int = level < quantity.length ? quantity[level] | 0 : quantity[quantity.length - 1] | 0;
        for (let i: int = (level + 1) | 0; i < quantity.length; i++) {
            if ((quantity[i] | 0) > now) {
                return { "level": i, "n": quantity[i] | 0 };
            }
        }
        return null;
    }

    public ImageLoaded(param1: string, param2: BitmapData): void {
        this.mcBG.addChild(new Bitmap(param2));
    }

    private OnLockedOverlayLoaded(param1: string, param2: BitmapData): void {
        this.mcShroud.addChild(new Bitmap(param2));
    }

    public ShowInfo(param1: MouseEvent): void {
        SOUNDS.Play("click1");
        as3.cast(this.parent.parent, MovieClip).ShowInfo(this._id);
    }

    private ShowLockedInfo(param1: MouseEvent): void {
        let _loc2_: Function = BUILDINGBUTTON.s_LockedCallbacks[this._id];
        if (_loc2_ == null) {
            return;
        }
        SOUNDS.Play("click1");
        _loc2_();
    }

    private get isLocked(): boolean {
        return Boolean(this._buildingProps) && Boolean(this._buildingProps["locked"]);
    }

    public Update(): void {
    }
}
