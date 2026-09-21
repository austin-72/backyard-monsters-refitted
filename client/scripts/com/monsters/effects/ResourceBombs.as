package com.monsters.effects {

    import com.monsters.siege.weapons.Decoy;
    import com.monsters.siege.SiegeWeapons;
    import com.cc.utils.SecNum;
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.display.ImageCache;
    import com.monsters.managers.InstanceManager;
    import flash.display.BitmapData;
    import flash.display.MovieClip;
    import flash.geom.Point;

    public class ResourceBombs {

        public static var _activeBombs:Object = {};

        public static var bombcounter:int = 0;

        public static var bmd_pebble:BitmapData;

        public static var bmd_pebblehit:BitmapData;

        public static var bmd_twigs:BitmapData;

        public static var bmd_putty:BitmapData;

        public static var _bombs:Object;

        public static var _bombid:String;

        public static var _setup:Boolean;

        public static var _doneData:Boolean;

        public static var _mc:CATAPULTPOPUP;

        public static var _state:int;

        protected static var _launchedBomb:Boolean;

        public function ResourceBombs() {
            super();
        }

        public static function get launchedBomb():Boolean {
            return _launchedBomb;
        }

        public static function Data():void {
            _bombs = {
                    "tw0": {
                        "used": false,
                        "group": 0,
                        "particles": 200,
                        "name": KEYS.Get("bomb_tw0_name"),
                        "description": "",
                        "radius": 200,
                        "damage": 2200,
                        "cost": 10000,
                        "resource": 1,
                        "image": "bombbuttons/twigs1.png",
                        "col": 0,
                        "dropTarget": 2,
                        "catapultLevel": 1
                    },
                    "tw1": {
                        "used": false,
                        "group": 0,
                        "particles": 200,
                        "name": KEYS.Get("bomb_tw1_name"),
                        "description": "",
                        "radius": 200,
                        "damage": 7000,
                        "cost": 100000,
                        "resource": 1,
                        "image": "bombbuttons/twigs2.png",
                        "col": 1,
                        "dropTarget": 2,
                        "catapultLevel": 1
                    },
                    "tw2": {
                        "used": false,
                        "group": 0,
                        "particles": 200,
                        "name": KEYS.Get("bomb_tw2_name"),
                        "description": "",
                        "radius": 200,
                        "damage": 50000,
                        "cost": 5000000,
                        "resource": 1,
                        "image": "bombbuttons/twigs3.png",
                        "col": 2,
                        "dropTarget": 2,
                        "catapultLevel": 1
                    },
                    "pb0": {
                        "used": false,
                        "group": 1,
                        "particles": 200,
                        "name": KEYS.Get("bomb_pb0_name"),
                        "description": "",
                        "radius": 200,
                        "damage": 2400,
                        "cost": 10000,
                        "resource": 2,
                        "image": "bombbuttons/pebbles1.png",
                        "col": 0,
                        "dropTarget": 2,
                        "catapultLevel": 2
                    },
                    "pb1": {
                        "used": false,
                        "group": 1,
                        "particles": 200,
                        "name": KEYS.Get("bomb_pb1_name"),
                        "description": "",
                        "radius": 300,
                        "damage": 9000,
                        "cost": 100000,
                        "resource": 2,
                        "image": "bombbuttons/pebbles2.png",
                        "col": 1,
                        "dropTarget": 2,
                        "catapultLevel": 2
                    },
                    "pb2": {
                        "used": false,
                        "group": 1,
                        "particles": 200,
                        "name": KEYS.Get("bomb_pb2_name"),
                        "description": "",
                        "radius": 350,
                        "damage": 30000,
                        "cost": 2000000,
                        "resource": 2,
                        "image": "bombbuttons/pebbles3.png",
                        "col": 2,
                        "dropTarget": 2,
                        "catapultLevel": 2
                    },
                    "pb3": {
                        "used": false,
                        "group": 1,
                        "particles": 200,
                        "name": KEYS.Get("bomb_pb3_name"),
                        "description": "",
                        "radius": 400,
                        "damage": 75000,
                        "cost": 10000000,
                        "resource": 2,
                        "image": "bombbuttons/pebbles4.png",
                        "col": 3,
                        "dropTarget": 2,
                        "catapultLevel": 2
                    },
                    "pu0": {
                        "used": false,
                        "group": 2,
                        "particles": 25,
                        "name": KEYS.Get("bomb_pu0_name"),
                        "description": "bomb_pu_description",
                        "damageMult": 0.2,
                        "radius": 150,
                        "damage": 0,
                        "speed": 1.2,
                        "speedlength": 10,
                        "cost": 10000,
                        "resource": 3,
                        "image": "bombbuttons/putty1.png",
                        "col": 0,
                        "dropTarget": 3,
                        "catapultLevel": 3
                    },
                    "pu1": {
                        "used": false,
                        "group": 2,
                        "particles": 37,
                        "name": KEYS.Get("bomb_pu1_name"),
                        "description": "bomb_pu_description",
                        "damageMult": 0.4,
                        "radius": 150,
                        "damage": 0,
                        "speed": 1.4,
                        "speedlength": 15,
                        "cost": 100000,
                        "resource": 3,
                        "image": "bombbuttons/putty2.png",
                        "col": 1,
                        "dropTarget": 3,
                        "catapultLevel": 3
                    },
                    "pu2": {
                        "used": false,
                        "group": 2,
                        "particles": 43,
                        "name": KEYS.Get("bomb_pu2_name"),
                        "description": "bomb_pu_description",
                        "damageMult": 0.7,
                        "radius": 300,
                        "damage": 0,
                        "speed": 1.8,
                        "speedlength": 30,
                        "cost": 5000000,
                        "resource": 3,
                        "image": "bombbuttons/putty3.png",
                        "col": 2,
                        "dropTarget": 3,
                        "catapultLevel": 3
                    },
                    "pu3": {
                        "used": false,
                        "group": 2,
                        "particles": 50,
                        "name": KEYS.Get("bomb_pu3_name"),
                        "description": "bomb_pu_description",
                        "damageMult": 0.9,
                        "radius": 500,
                        "damage": 0,
                        "speed": 2,
                        "speedlength": 40,
                        "cost": 10000000,
                        "resource": 3,
                        "image": "bombbuttons/putty4.png",
                        "col": 3,
                        "dropTarget": 3,
                        "catapultLevel": 3
                    }
                };
            if (GLOBAL.INFERNO_ONLY) {
                ioInfernoAmmo();
            }
        }

        /**
         * Inferno-only: the Catapult fires Chaos weapons instead of twigs and pebbles.
         *
         *   row 1  Marilyn Monstroe  lures defenders (also out of bunkers and Compounds), then explodes
         *   row 2  Candy Jars        jar every tower in range until the tower shoots its way out
         *   row 3  Sulfur Bomb       Putty Rage under another name: speed and armour for your monsters
         *
         * Four sizes each, one per Catapult level. The slot ids are the stock ones (tw / pb / pu) because
         * the popup art is laid out by them; tw3 is new, the stock twig row only had three.
         * `costs` replaces the stock single resource + cost (r1 bone, r2 coal, r3 sulfur, r4 magma);
         * `resource` and `cost` are kept, as the main resource and the total, for the code that still
         * reads them. Each row can be fired once per attack, like the stock rows.
         * The server can override any number here: flag io_catapult, a JSON object keyed by slot id.
         */
        private static function ioInfernoAmmo():void {
            var sizes:Array = [KEYS.Get("bomb_pb0_name"), KEYS.Get("bomb_pb1_name"), KEYS.Get("bomb_pb2_name"), KEYS.Get("bomb_pb3_name")];
            var decoy:Array = [[500, 300, 8, 100000, 50000], [1500, 300, 12, 500000, 250000], [4000, 300, 16, 2500000, 1250000], [8000, 300, 20, 5000000, 2500000]];
            var jars:Array = [[200, 2000, 100000], [250, 4000, 250000], [300, 6000, 2000000], [350, 8000, 5000000]];
            var sulfur:Array = [[150, 1.2, 0.2, 10, 100000], [200, 1.4, 0.4, 15, 500000], [300, 1.8, 0.6, 30, 2500000], [500, 2, 0.8, 40, 5000000]];
            var i:int = 0;
            _bombs = {};
            while (i < 4) {
                _bombs["tw" + i] = {
                        "used": false, "group": 0, "kind": "decoy", "particles": 0, "name": sizes[i], "col": i,
                        "damage": decoy[i][0], "radius": decoy[i][1], "fuse": decoy[i][2],
                        "costs": {"r4": decoy[i][3], "r3": decoy[i][4]}, "resource": 4, "cost": decoy[i][3] + decoy[i][4],
                        "image": "siegebuttons/decoy.png", "dropTarget": DROPZONE.SIEGEWEAPON_GROUND_SPECIAL, "catapultLevel": i + 1
                    };
                _bombs["pb" + i] = {
                        "used": false, "group": 1, "kind": "jars", "particles": 0, "name": sizes[i], "col": i,
                        "damage": 0, "radius": jars[i][0], "durability": jars[i][1],
                        "costs": {"r1": jars[i][2], "r2": jars[i][2]}, "resource": 1, "cost": jars[i][2] * 2,
                        "image": "siegebuttons/jars.png", "dropTarget": DROPZONE.SIEGEWEAPON_BUILDINGS, "catapultLevel": i + 1
                    };
                _bombs["pu" + i] = {
                        "used": false, "group": 2, "kind": "sulfur", "particles": 50, "name": sizes[i], "col": i,
                        "damage": 0, "radius": sulfur[i][0], "speed": sulfur[i][1], "damageMult": sulfur[i][2], "speedlength": sulfur[i][3],
                        "costs": {"r3": sulfur[i][4]}, "resource": 3, "cost": sulfur[i][4],
                        "image": "bombbuttons/sulfur" + (i + 1) + ".png", "dropTarget": DROPZONE.MONSTERS, "catapultLevel": i + 1
                    };
                i++;
            }
            ioApplyServerAmmo();
        }

        /** Numbers sent by the server win over the built-in ones (flag io_catapult). */
        private static function ioApplyServerAmmo():void {
            var sent:Object = null;
            var id:String = null;
            var field:String = null;
            if (!GLOBAL._flags || !GLOBAL._flags.io_catapult) {
                return;
            }
            try {
                sent = JSON.parse(String(GLOBAL._flags.io_catapult));
            }
            catch (e:Error) {
                return;
            }
            for (id in sent) {
                if (_bombs[id]) {
                    for (field in sent[id]) {
                        _bombs[id][field] = sent[id][field];
                    }
                    if (sent[id].costs) {
                        _bombs[id].cost = 0;
                        for (field in sent[id].costs) {
                            _bombs[id].cost += Number(sent[id].costs[field]);
                        }
                    }
                }
            }
        }

        /** What a shot costs, as {rN: amount}. Stock ammunition has one resource, Inferno ammunition may have two. */
        public static function costsOf(param1:Object):Object {
            var single:Object = null;
            if (param1.costs) {
                return param1.costs;
            }
            single = {};
            single["r" + param1.resource] = param1.cost;
            return single;
        }

        public static function canAfford(param1:Object):Boolean {
            var key:String = null;
            var costs:Object = costsOf(param1);
            if (!GLOBAL._attackersResources) {
                return false;
            }
            for (key in costs) {
                if (!GLOBAL._attackersResources[key] || GLOBAL._attackersResources[key].Get() < costs[key]) {
                    return false;
                }
            }
            return true;
        }

        /** The first resource the attacker is short of (1-4), or 0. */
        public static function shortOf(param1:Object):int {
            var key:String = null;
            var costs:Object = costsOf(param1);
            for (key in costs) {
                if (!GLOBAL._attackersResources || !GLOBAL._attackersResources[key] || GLOBAL._attackersResources[key].Get() < costs[key]) {
                    return int(key.substr(1));
                }
            }
            return 0;
        }

        /** "500K Magma + 250K Sulfur" */
        public static function costText(param1:Object):String {
            var key:String = null;
            var parts:Array = [];
            var costs:Object = costsOf(param1);
            var names:Array = GLOBAL._resourceNames;
            for each (key in ["r1", "r2", "r3", "r4"]) {
                if (costs[key]) {
                    parts.push(CATAPULTPOPUP.Format(costs[key]) + " " + KEYS.Get(names[int(key.substr(1)) - 1]));
                }
            }
            return parts.join(" + ");
        }

        private static function charge(param1:Object):void {
            var key:String = null;
            var costs:Object = costsOf(param1);
            for (key in costs) {
                GLOBAL._resources[key].Add(-costs[key]);
                GLOBAL._hpResources[key] -= costs[key];
                // Several shots in one attack can draw on the same resource: add to what is already owed.
                GLOBAL._attackersDeltaResources[key] = new SecNum((GLOBAL._attackersDeltaResources[key] ? GLOBAL._attackersDeltaResources[key].Get() : 0) - costs[key]);
            }
            GLOBAL._attackersDeltaResources.dirty = true;
        }

        public static function Setup():void {
            var _loc3_:Object = null;
            var _loc4_:String = null;
            ImageCache.GetImageWithCallBack("effects/twigs.png", onAssetLoaded, true, 6);
            ImageCache.GetImageWithCallBack("effects/pebble.png", onAssetLoaded, true, 6);
            ImageCache.GetImageWithCallBack("effects/pebblehit.png", onAssetLoaded, true, 6);
            ImageCache.GetImageWithCallBack(GLOBAL.INFERNO_ONLY ? "effects/sulfur.png" : "effects/putty.png", onAssetLoaded, true, 6);
            if (GLOBAL.INFERNO_ONLY) {
                ioApplyServerAmmo();
                SiegeWeapons.ioClearOverrides();
            }
            var _loc1_:int = 0;
            var _loc2_:String = "tw0";
            _bombid = "tw0";
            _launchedBomb = false;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
                for (_loc4_ in _bombs) {
                    _loc3_ = _bombs[_loc4_];
                    if (canAfford(_loc3_) && GLOBAL._attackersCatapult >= _loc3_.catapultLevel && _loc3_.cost <= 2000000) {
                        if (_loc3_.cost > _loc1_) {
                            _loc1_ = int(_loc3_.cost);
                            _loc2_ = _loc4_;
                        }
                    }
                }
                _bombid = _loc2_;
            }
        }

        public static function Clear():void {
            _mc = null;
            _launchedBomb = false;
        }

        public static function onAssetLoaded(param1:String, param2:BitmapData):void {
            if (param1 == "effects/pebble.png") {
                bmd_pebble = param2;
            }
            else if (param1 == "effects/pebblehit.png") {
                bmd_pebblehit = param2;
            }
            else if (param1 == "effects/twigs.png") {
                bmd_twigs = param2;
            }
            else if (param1 == "effects/putty.png" || param1 == "effects/sulfur.png") {
                bmd_putty = param2;
            }
        }

        public static function BombAdd(param1:Object):void {
            _state = 1;
            ATTACK.DropZone(param1.radius, param1.dropTarget);
            if (_mc) {
                _mc.Update();
            }
        }

        public static function BombRemove():void {
            if (_state == 1) {
                ATTACK.RemoveDropZone();
                _state = 0;
                if (_mc) {
                    _mc.Update();
                }
            }
        }

        public static function BombDrop():void {
            var _loc4_:Object = null;
            var _loc1_:int = 0;
            var _loc2_:Object = _bombs[_bombid];
            var _loc3_:Boolean = false;
            if (Boolean(_mc) && _mc.waitTime > GLOBAL.Timestamp()) {
                return;
            }
            ATTACK.RemoveDropZone();
            if (GLOBAL._attackersResources && canAfford(_loc2_)) {
                // A Chaos weapon needs the weapon slot to be free (Marilyn holds it until she explodes).
                if (!(_loc2_.kind == "decoy" && SiegeWeapons.activeWeapon)) {
                    charge(_loc2_);
                    _loc3_ = true;
                }
            }
            if (_loc3_) {
                for each (_loc4_ in _bombs) {
                    if (_loc4_.group == _loc2_.group) {
                        _loc4_.used = true;
                    }
                }
                if (_loc2_.kind == "decoy" || _loc2_.kind == "jars") {
                    ioLaunchChaosWeapon(_loc2_, MAP._GROUND.mouseX, MAP._GROUND.mouseY);
                }
                else {
                    Trigger(MAP._BUILDINGBASES, new Point(MAP._GROUND.mouseX, MAP._GROUND.mouseY), _loc2_, 2);
                }
            }
            if (_bombid == "pu3") {
                ACHIEVEMENTS.Check("hugerage", 1);
            }
            if (_loc2_.kind) {
                if (_loc3_) {
                    ATTACK.Log("bomb" + ResourceBombs._bombid, "<font color=\"#A800FF\">" + _loc2_.name + " " + ioRowName(_loc2_) + " was catapulted in (" + costText(_loc2_) + ")</font>");
                }
            }
            else {
                ATTACK.Log("bomb" + ResourceBombs._bombid, "<font color=\"#A800FF\">" + KEYS.Get("attack_log_catapulted", {
                                "v1": GLOBAL.FormatNumber(_loc2_.cost),
                                "v2": GLOBAL._resourceNames[_loc2_.resource - 1]
                            }) + "</font>");
            }
            _state = 0;
            if (_mc) {
                _mc.Update();
            }
        }

        public static function ioRowName(param1:Object):String {
            if (param1.kind == "decoy") {
                return KEYS.Get("#w_decoy#");
            }
            if (param1.kind == "jars") {
                return KEYS.Get("#w_jars#");
            }
            return "Sulfur Bomb";
        }

        /**
         * Marilyn Monstroe and Candy Jars are the stock Chaos weapons, given this shot's numbers instead
         * of a level's. Marilyn takes the weapon slot until she explodes: monsters, bunkers and the attack
         * timer all look her up there. Jars do not need it: once dropped, each tower looks after its own
         * jar, so Marilyn can still be fired while towers are jarred.
         */
        private static function ioLaunchChaosWeapon(param1:Object, param2:Number, param3:Number):void {
            if (param1.kind == "decoy") {
                SiegeWeapons.ioActivate(Decoy.ID, {"damage": param1.damage, "range": param1.radius, "duration": param1.fuse}, param2, param3);
            }
            else {
                SiegeWeapons.ioDropJars({"range": param1.radius, "durability": param1.durability}, param2, param3);
            }
            _launchedBomb = true;
            if (_mc) {
                _mc.fired();
            }
            LOGGER.Stat([27, param1.resource, param1.col, param1.cost]);
        }

        public static function Trigger(param1:MovieClip, param2:Point, param3:Object, param4:int = 2):void {
            _activeBombs[bombcounter] = new ResourceBomb(param1, param2, param3, param4);
            if (param3.group == 0) {
                SOUNDS.Play("twigbomb");
            }
            else if (param3.group == 1) {
                SOUNDS.Play("pebblebomb");
            }
            else if (param3.group == 2) {
                SOUNDS.Play("puttybomb");
            }
            ++bombcounter;
            _launchedBomb = true;
            if (_mc) {
                _mc.fired();
            }
            if (ALLIANCES._myAlliance) {
                LOGGER.Stat([27, param3.resource, param3.col, param3.cost, ALLIANCES._allianceID]);
            }
            else {
                LOGGER.Stat([27, param3.resource, param3.col, param3.cost]);
            }
        }

        public static function Tick():void {
            var _loc1_:String = null;
            var _loc3_:* = null;
            var _loc4_:Vector.<Object> = null;
            var _loc5_:BFOUNDATION = null;
            var _loc2_:int = 0;
            for (_loc1_ in _activeBombs) {
                _loc3_ = _activeBombs[_loc1_];
                _loc2_++;
                if (_loc3_.Tick()) {
                    BASE.Save();
                    _loc3_.Freeze();
                    delete _activeBombs[_loc1_];
                    _loc2_--;
                    if (_loc2_ == 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                        _loc4_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                        for each (_loc5_ in _loc4_) {
                            if (_loc5_.health < _loc5_.maxHealth && _loc5_._repairing == 0) {
                                _loc5_.Repair();
                            }
                        }
                        MARKETING.Show("catapult");
                        BASE.Save();
                    }
                }
            }
        }

        public static function Check():String {
            var _loc3_:String = null;
            var _loc1_:Array = [];
            var _loc2_:Array = ["tw0", "tw1", "tw2", "pb0", "pb1", "pb2", "pb3", "pu0", "pu1", "pu2", "pu3"];
            for each (_loc3_ in _loc2_) {
                if (_bombs[_loc3_].radius) {
                    _loc1_.push(_bombs[_loc3_].radius);
                }
                if (_bombs[_loc3_].damage) {
                    _loc1_.push(_bombs[_loc3_].damage);
                }
                if (_bombs[_loc3_].cost) {
                    _loc1_.push(_bombs[_loc3_].cost);
                }
                if (_bombs[_loc3_].resource) {
                    _loc1_.push(_bombs[_loc3_].resource);
                }
                if (_bombs[_loc3_].damageMult) {
                    _loc1_.push(_bombs[_loc3_].damageMult);
                }
                if (_bombs[_loc3_].speed) {
                    _loc1_.push(_bombs[_loc3_].speed);
                }
                if (_bombs[_loc3_].speedlength) {
                    _loc1_.push(_bombs[_loc3_].speedlength);
                }
            }
            return md5(JSON.stringify(_loc1_));
        }
    }
}
