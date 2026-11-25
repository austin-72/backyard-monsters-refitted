import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { CATAPULTITEM_view, GLOBAL, ImageCache, KEYS, ResourceBombs, SiegeWeapons, bubblepopup3 } from "@game";

export class CATAPULTITEM extends CATAPULTITEM_view {
    static {
        as3.fields(this, { _props: null, _bombid: null, _enabled: false, _image: null, _locked: false, _popX: 0, _popY: 0, _popup: null, _constant: false });
    }

    public _props: any;
    public _bombid: string;
    public _enabled: boolean;
    public _image: Sprite;
    public _locked: boolean;
    public _popX: int;
    public _popY: int;
    public _popup: bubblepopup3;
    private _constant: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: string, param2: boolean = false, param3: boolean = false, param4: boolean = true): void {
        this._props = ResourceBombs._bombs[param1];
        this._bombid = param1;
        this._txtMC._tA.htmlText = "<b>" + this._props.name + "</b>";
        this._image = new Sprite();
        this.addChild(this._image);
        this._popup = new bubblepopup3();
        this._popup.x = 44;
        this._popup.y = 29;
        this.addChild(this._popup);
        this._popX = this._popup.x | 0;
        this._popY = this._popup.y | 0;
        this._constant = param2;
        if (this._constant) {
            this.Enabled = param3;
        }
        this.setChildIndex(this._image, 1);
        this.setChildIndex(this._txtMC, 2);
        this.setChildIndex(this._popup, 3);
        ImageCache.GetImageWithCallBack(as3.str(this._props.image), as3.bind(this, this.imageComplete));
        this.mouseEnabled = false;
        this.Hide();
        this.Update();
    }

    public imageComplete(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = new Bitmap(param2);
        this._image.addChild(_loc3_);
        _loc3_.width = 60;
        _loc3_.height = 60;
    }

    public Update(): void {
        this._props = ResourceBombs._bombs[this._bombid];
        if (this._constant) {
            return;
        }
        this._locked = this._props.catapultLevel > GLOBAL._attackersCatapult;
        if (!this._props.used) {
            if (!this._locked) {
                // Marilyn needs the Chaos weapon slot, which she holds until she explodes.
                this.Enabled = ResourceBombs.canAfford(this._props) && !(this._props.kind == "decoy" && SiegeWeapons.activeWeapon);
            } else {
                this.Enabled = false;
            }
        } else {
            this.Enabled = false;
        }
    }

    public ShowOver(): void {
        let _loc1_: any = "<b>" + this._props.name + "</b>";
        if (this._props.kind) {
            _loc1_ = "<b>" + this._props.name + " " + ResourceBombs.ioRowName(this._props) + "</b><br>" + this.ioStats();
        } else if (this._props.description) {
            _loc1_ += "<br>" + KEYS.Get(as3.str(this._props.description), { "v1": this._props.speed * 100 + "%", "v2": Math.round((1 - this._props.damageMult) * 100) + "%", "v3": this._props.speedlength });
        }
        _loc1_ += "<br><b>" + (GLOBAL.INFERNO_ONLY ? KEYS.Get("io_t3k_cat_cost") : "Cost:") + " </b>" + ResourceBombs.costText(this._props) + "<br>"; // (QoL #235)
        if (this._props.catapultLevel > GLOBAL._attackersCatapult) {
            _loc1_ += "<br>" + "<b><font color = \"#FF0000\">" + KEYS.Get("bomb_catapult_level", { "v1": this._props.catapultLevel }) + "</font></b>";
        } else if (!this._props.used && ResourceBombs.shortOf(this._props) > 0) {
            _loc1_ += "<br><b><font color = \"#FF0000\">" + KEYS.Get("bomb_need_resources", { "v1": KEYS.Get(as3.str(GLOBAL._resourceNames[ResourceBombs.shortOf(this._props) - 1])) }) + "</font></b>";
        } else if (!this._props.used && this._props.kind == "decoy" && SiegeWeapons.activeWeapon) {
            _loc1_ += "<br><b><font color = \"#FF0000\">" + (GLOBAL.INFERNO_ONLY ? KEYS.Get("io_t3k_cat_chaos_active") : "Another Chaos weapon is still active") + "</font></b>";
        } else if (GLOBAL.INFERNO_ONLY && this._props.used) {
            // (QoL #362: a row fires once an attack: said, instead of a greyed button with no reason)
            _loc1_ += "<br><b><font color = \"#FF0000\">" + KEYS.Get("io_bat2_cat_fired") + "</font></b>";
        }
        this._popup.mouseEnabled = false;
        this._popup.Setup(this._popX, this._popY, as3.str(_loc1_));
        this._popup.visible = true;
    }

    /** The numbers that matter for this kind of Inferno ammunition. */
    private ioStats(): string {
        let p: any = this._props;
        if (p.kind == "decoy") {
            // (QoL #235: each line in the player's language)
            return KEYS.Get("io_t3k_cat_decoy", { "v1": GLOBAL.FormatNumber(Number(p.damage)), "v2": p.radius, "v3": p.fuse });
        }
        if (p.kind == "jars") {
            if (Number(p.seconds) > 0) {
                return KEYS.Get("io_t3k_cat_jars_timed", { "v1": p.radius, "v2": p.seconds });
            }
            return KEYS.Get("io_t3k_cat_jars", { "v1": p.radius, "v2": GLOBAL.FormatNumber(Number(p.durability)) });
        }
        let invuln: number = Number(Number(p.invuln) || 0);
        let armor: number = Number(p.hasOwnProperty("armor") ? Number(p.armor) : 99);
        let shield: string = KEYS.Get(invuln > 0 ? "io_t3k_cat_shield_invuln" : "io_t3k_cat_shield", { "v1": invuln, "v2": armor, "v3": p.speedlength - invuln });
        return KEYS.Get("io_t3k_cat_speed", { "v1": p.radius, "v2": Math.round(p.speed * 100), "v3": shield, "v4": p.speedlength });
    }

    public Hide(): void {
        this._popup.visible = false;
    }

    public set Enabled(param1: boolean) {
        this._enabled = param1;
        let _loc2_: number = Number(this._enabled ? 1 : 0.5);
        this._txtMC._tA.alpha = _loc2_;
        this._image.alpha = _loc2_;
        this.useHandCursor = this._enabled;
        this.buttonMode = this._enabled;
    }

    public get Enabled(): boolean {
        return this._enabled;
    }
}
