package {
    import com.monsters.siege.SiegeWeapons;
    import com.monsters.display.ImageCache;
    import com.monsters.effects.ResourceBombs;
    import flash.display.Bitmap;
    import flash.display.BitmapData;
    import flash.display.Sprite;

    public class CATAPULTITEM extends CATAPULTITEM_view {

        public var _props:Object;

        public var _bombid:String;

        public var _enabled:Boolean;

        public var _image:Sprite;

        public var _locked:Boolean;

        public var _popX:int;

        public var _popY:int;

        public var _popup:bubblepopup3;

        private var _constant:Boolean;

        public function CATAPULTITEM() {
            super();
        }

        public function Setup(param1:String, param2:Boolean = false, param3:Boolean = false, param4:Boolean = true):void {
            this._props = ResourceBombs._bombs[param1];
            this._bombid = param1;
            _txtMC._tA.htmlText = "<b>" + this._props.name + "</b>";
            this._image = new Sprite();
            addChild(this._image);
            this._popup = new bubblepopup3();
            this._popup.x = 44;
            this._popup.y = 29;
            addChild(this._popup);
            this._popX = this._popup.x;
            this._popY = this._popup.y;
            this._constant = param2;
            if (this._constant) {
                this.Enabled = param3;
            }
            setChildIndex(this._image, 1);
            setChildIndex(_txtMC, 2);
            setChildIndex(this._popup, 3);
            ImageCache.GetImageWithCallBack(this._props.image, this.imageComplete);
            this.mouseEnabled = false;
            this.Hide();
            this.Update();
        }

        public function imageComplete(param1:String, param2:BitmapData):void {
            var _loc3_:Bitmap = new Bitmap(param2);
            this._image.addChild(_loc3_);
            _loc3_.width = 60;
            _loc3_.height = 60;
        }

        public function Update():void {
            this._props = ResourceBombs._bombs[this._bombid];
            if (this._constant) {
                return;
            }
            this._locked = this._props.catapultLevel > GLOBAL._attackersCatapult;
            if (!this._props.used) {
                if (!this._locked) {
                    // Marilyn needs the Chaos weapon slot, which she holds until she explodes.
                    this.Enabled = ResourceBombs.canAfford(this._props) && !(this._props.kind == "decoy" && SiegeWeapons.activeWeapon);
                }
                else {
                    this.Enabled = false;
                }
            }
            else {
                this.Enabled = false;
            }
        }

        public function ShowOver():void {
            var _loc1_:* = "<b>" + this._props.name + "</b>";
            if (this._props.kind) {
                _loc1_ = "<b>" + this._props.name + " " + ResourceBombs.ioRowName(this._props) + "</b><br>" + this.ioStats();
            }
            else if (this._props.description) {
                _loc1_ += "<br>" + KEYS.Get(this._props.description, {
                            "v1": this._props.speed * 100 + "%",
                            "v2": Math.round((1 - this._props.damageMult) * 100) + "%",
                            "v3": this._props.speedlength
                        });
            }
            _loc1_ += "<br><b>Cost: </b>" + ResourceBombs.costText(this._props) + "<br>";
            if (this._props.catapultLevel > GLOBAL._attackersCatapult) {
                _loc1_ += "<br>" + "<b><font color = \"#FF0000\">" + KEYS.Get("bomb_catapult_level", {"v1": this._props.catapultLevel}) + "</font></b>";
            }
            else if (!this._props.used && ResourceBombs.shortOf(this._props) > 0) {
                _loc1_ += "<br><b><font color = \"#FF0000\">" + KEYS.Get("bomb_need_resources", {"v1": KEYS.Get(GLOBAL._resourceNames[ResourceBombs.shortOf(this._props) - 1])}) + "</font></b>";
            }
            else if (!this._props.used && this._props.kind == "decoy" && SiegeWeapons.activeWeapon) {
                _loc1_ += "<br><b><font color = \"#FF0000\">Another Chaos weapon is still active</font></b>";
            }
            this._popup.mouseEnabled = false;
            this._popup.Setup(this._popX, this._popY, _loc1_);
            this._popup.visible = true;
        }

        /** The numbers that matter for this kind of Inferno ammunition. */
        private function ioStats():String {
            var p:Object = this._props;
            if (p.kind == "decoy") {
                return "Lures defending monsters, then explodes.<br><b>Damage: </b>" + GLOBAL.FormatNumber(p.damage) + "<br><b>Lure range: </b>" + p.radius + "<br><b>Fuse: </b>" + p.fuse + " seconds";
            }
            if (p.kind == "jars") {
                return "Jars every tower in range until it shoots its way out.<br><b>Range: </b>" + p.radius + "<br><b>Durability: </b>" + GLOBAL.FormatNumber(p.durability);
            }
            return "Enrages your monsters.<br><b>Radius: </b>" + p.radius + "<br><b>Speed: </b>" + Math.round(p.speed * 100) + "%<br><b>Armor: </b>" + Math.round((1 - p.damageMult) * 100) + "%<br><b>Lasts: </b>" + p.speedlength + " seconds";
        }

        public function Hide():void {
            this._popup.visible = false;
        }

        public function set Enabled(param1:Boolean):void {
            this._enabled = param1;
            var _loc2_:Number = this._enabled ? 1 : 0.5;
            _txtMC._tA.alpha = _loc2_;
            this._image.alpha = _loc2_;
            this.useHandCursor = this._enabled;
            this.buttonMode = this._enabled;
        }

        public function get Enabled():Boolean {
            return this._enabled;
        }
    }
}
