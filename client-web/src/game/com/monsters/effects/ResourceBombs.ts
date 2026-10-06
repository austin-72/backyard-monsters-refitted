import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BitmapData, MovieClip } from "flash/display";
import { Point } from "flash/geom";
import { ACHIEVEMENTS, ALLIANCES, ATTACK, BASE, BFOUNDATION, CATAPULTPOPUP, DROPZONE, Decoy, GLOBAL, ImageCache, InstanceManager, IoQuests, IoReplayRecorder, KEYS, LOGGER, MAP, MARKETING, ResourceBomb, SOUNDS, SecNum, SiegeWeapons, md5 } from "@game";

export class ResourceBombs extends ASObject {
    public static _activeBombs: any = {};

    public static bombcounter: int = 0;

    public static bmd_pebble: BitmapData = null;

    public static bmd_pebblehit: BitmapData = null;

    public static bmd_twigs: BitmapData = null;

    public static bmd_putty: BitmapData = null;

    public static _bombs: any = null;

    public static _bombid: string = null;

    public static _setup: boolean = false;

    public static _doneData: boolean = false;

    public static _mc: CATAPULTPOPUP = null;

    public static _state: int = 0;

    protected static _launchedBomb: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static get launchedBomb(): boolean {
        return ResourceBombs._launchedBomb;
    }

    public static Data(): void {
        ResourceBombs._bombs = { "tw0": { "used": false, "group": 0, "particles": 200, "name": KEYS.Get("bomb_tw0_name"), "description": "", "radius": 200, "damage": 2200, "cost": 10000, "resource": 1, "image": "bombbuttons/twigs1.png", "col": 0, "dropTarget": 2, "catapultLevel": 1 }, "tw1": { "used": false, "group": 0, "particles": 200, "name": KEYS.Get("bomb_tw1_name"), "description": "", "radius": 200, "damage": 7000, "cost": 100000, "resource": 1, "image": "bombbuttons/twigs2.png", "col": 1, "dropTarget": 2, "catapultLevel": 1 }, "tw2": { "used": false, "group": 0, "particles": 200, "name": KEYS.Get("bomb_tw2_name"), "description": "", "radius": 200, "damage": 50000, "cost": 5000000, "resource": 1, "image": "bombbuttons/twigs3.png", "col": 2, "dropTarget": 2, "catapultLevel": 1 }, "pb0": { "used": false, "group": 1, "particles": 200, "name": KEYS.Get("bomb_pb0_name"), "description": "", "radius": 200, "damage": 2400, "cost": 10000, "resource": 2, "image": "bombbuttons/pebbles1.png", "col": 0, "dropTarget": 2, "catapultLevel": 2 }, "pb1": { "used": false, "group": 1, "particles": 200, "name": KEYS.Get("bomb_pb1_name"), "description": "", "radius": 300, "damage": 9000, "cost": 100000, "resource": 2, "image": "bombbuttons/pebbles2.png", "col": 1, "dropTarget": 2, "catapultLevel": 2 }, "pb2": { "used": false, "group": 1, "particles": 200, "name": KEYS.Get("bomb_pb2_name"), "description": "", "radius": 350, "damage": 30000, "cost": 2000000, "resource": 2, "image": "bombbuttons/pebbles3.png", "col": 2, "dropTarget": 2, "catapultLevel": 2 }, "pb3": { "used": false, "group": 1, "particles": 200, "name": KEYS.Get("bomb_pb3_name"), "description": "", "radius": 400, "damage": 75000, "cost": 10000000, "resource": 2, "image": "bombbuttons/pebbles4.png", "col": 3, "dropTarget": 2, "catapultLevel": 2 }, "pu0": { "used": false, "group": 2, "particles": 25, "name": KEYS.Get("bomb_pu0_name"), "description": "bomb_pu_description", "damageMult": 0.2, "radius": 150, "damage": 0, "speed": 1.2, "speedlength": 10, "cost": 10000, "resource": 3, "image": "bombbuttons/putty1.png", "col": 0, "dropTarget": 3, "catapultLevel": 3 }, "pu1": { "used": false, "group": 2, "particles": 37, "name": KEYS.Get("bomb_pu1_name"), "description": "bomb_pu_description", "damageMult": 0.4, "radius": 150, "damage": 0, "speed": 1.4, "speedlength": 15, "cost": 100000, "resource": 3, "image": "bombbuttons/putty2.png", "col": 1, "dropTarget": 3, "catapultLevel": 3 }, "pu2": { "used": false, "group": 2, "particles": 43, "name": KEYS.Get("bomb_pu2_name"), "description": "bomb_pu_description", "damageMult": 0.7, "radius": 300, "damage": 0, "speed": 1.8, "speedlength": 30, "cost": 5000000, "resource": 3, "image": "bombbuttons/putty3.png", "col": 2, "dropTarget": 3, "catapultLevel": 3 }, "pu3": { "used": false, "group": 2, "particles": 50, "name": KEYS.Get("bomb_pu3_name"), "description": "bomb_pu_description", "damageMult": 0.9, "radius": 500, "damage": 0, "speed": 2, "speedlength": 40, "cost": 10000000, "resource": 3, "image": "bombbuttons/putty4.png", "col": 3, "dropTarget": 3, "catapultLevel": 3 } };
        if (GLOBAL.INFERNO_ONLY) {
            ResourceBombs.ioInfernoAmmo();
        }
    }

    /**
     * Inferno-only: the Catapult fires Chaos weapons instead of twigs and pebbles.
     *
     *   row 1  Marilyn Monstroe  lures defenders (also out of bunkers and Compounds), then explodes
     *   row 2  Candy Jars        jar every tower in range for a number of seconds (the glass cracks
     *                            as the end nears, then breaks)
     *   row 3  Sulfur Bomb       speed, and a shield: invulnerable at first, then armour (damage
     *                            removed) fading from `armor`% to 0
     *
     * Four sizes each, one per Catapult level. The slot ids are the stock ones (tw / pb / pu) because
     * the popup art is laid out by them; tw3 is new, the stock twig row only had three.
     * `costs` replaces the stock single resource + cost (r1 bone, r2 coal, r3 sulfur, r4 magma);
     * `resource` and `cost` are kept, as the main resource and the total, for the code that still
     * reads them. Each row can be fired once per attack, like the stock rows.
     * The server can override any number here: flag io_catapult, a JSON object keyed by slot id.
     */
    private static ioInfernoAmmo(): void {
        let sizes: any[] = [KEYS.Get("bomb_pb0_name"), KEYS.Get("bomb_pb1_name"), KEYS.Get("bomb_pb2_name"), KEYS.Get("bomb_pb3_name")];
        let decoy: any[] = [[500, 300, 8, 100000, 50000], [1500, 300, 12, 500000, 250000], [4000, 300, 16, 2500000, 1250000], [8000, 300, 20, 5000000, 2500000]];
        // radius, seconds jarred, bone and coal cost
        let jars: any[] = [[200, 15, 100000], [250, 25, 500000], [300, 40, 2000000], [350, 55, 5000000]];
        // radius, speed, invulnerable seconds, total seconds, armour % when the invulnerable part ends
        // (it fades to 0 by the end), sulfur cost
        let sulfur: any[] = [[150, 1.2, 0, 15, 40, 100000], [200, 1.4, 4, 25, 55, 500000], [300, 1.8, 8, 40, 70, 5000000], [500, 2, 12, 55, 85, 10000000]];
        let i: int = 0;
        ResourceBombs._bombs = {};
        while (i < 4) {
            ResourceBombs._bombs["tw" + i] = { "used": false, "group": 0, "kind": "decoy", "particles": 0, "name": sizes[i], "col": i, "damage": decoy[i][0], "radius": decoy[i][1], "fuse": decoy[i][2], "costs": { "r4": decoy[i][3], "r3": decoy[i][4] }, "resource": 4, "cost": decoy[i][3] + decoy[i][4], "image": "siegebuttons/decoy.png", "dropTarget": DROPZONE.SIEGEWEAPON_GROUND_SPECIAL, "catapultLevel": i + 1 };
            ResourceBombs._bombs["pb" + i] = { "used": false, "group": 1, "kind": "jars", "particles": 0, "name": sizes[i], "col": i, "damage": 0, "radius": jars[i][0], "seconds": jars[i][1], "costs": { "r1": jars[i][2], "r2": jars[i][2] }, "resource": 1, "cost": jars[i][2] * 2, "image": "siegebuttons/jars.png", "dropTarget": DROPZONE.SIEGEWEAPON_BUILDINGS, "catapultLevel": i + 1 };
            ResourceBombs._bombs["pu" + i] = { "used": false, "group": 2, "kind": "sulfur", "particles": 50, "name": sizes[i], "col": i, "damage": 0, "radius": sulfur[i][0], "speed": sulfur[i][1], "invuln": sulfur[i][2], "speedlength": sulfur[i][3], "armor": sulfur[i][4], "costs": { "r3": sulfur[i][5] }, "resource": 3, "cost": sulfur[i][5], "image": "bombbuttons/sulfur" + (i + 1) + ".png", "dropTarget": DROPZONE.MONSTERS, "catapultLevel": i + 1 };
            i++;
        }
        ResourceBombs.ioApplyServerAmmo();
    }

    /** Numbers sent by the server win over the built-in ones (flag io_catapult). */
    private static ioApplyServerAmmo(): void {
        let sent: any = null;
        let id: string = null;
        let field: string = null;
        if (!GLOBAL._flags || !GLOBAL._flags.io_catapult) {
            return;
        }
        try {
            sent = JSON.parse(String(GLOBAL._flags.io_catapult));
        } catch (e) {
            return;
        }
        for (id in sent) {
            if (ResourceBombs._bombs[id]) {
                for (field in sent[id]) {
                    ResourceBombs._bombs[id][field] = sent[id][field];
                }
                if (sent[id].costs) {
                    ResourceBombs._bombs[id].cost = 0;
                    for (field in sent[id].costs) {
                        ResourceBombs._bombs[id].cost += Number(sent[id].costs[field]);
                    }
                }
            }
        }
    }

    /** What a shot costs, as {rN: amount}. Stock ammunition has one resource, Inferno ammunition may have two. */
    public static costsOf(param1: any): any {
        let single: any = null;
        if (param1.costs) {
            return param1.costs;
        }
        single = {};
        single["r" + param1.resource] = param1.cost;
        return single;
    }

    public static canAfford(param1: any): boolean {
        let key: string = null;
        let costs: any = ResourceBombs.costsOf(param1);
        // Admin test mode: catapult shots are free.
        if (GLOBAL.ioTestMode()) {
            return true;
        }
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
    public static shortOf(param1: any): int {
        let key: string = null;
        let costs: any = ResourceBombs.costsOf(param1);
        for (key in costs) {
            if (!GLOBAL._attackersResources || !GLOBAL._attackersResources[key] || GLOBAL._attackersResources[key].Get() < costs[key]) {
                return Number(key.substr(1)) | 0;
            }
        }
        return 0;
    }

    /** "500K Magma + 250K Sulfur" */
    public static costText(param1: any): string {
        let key: string = null;
        let parts: any[] = [];
        let costs: any = ResourceBombs.costsOf(param1);
        let names: any[] = GLOBAL._resourceNames;
        for (const $value of as3.values(["r1", "r2", "r3", "r4"])) {
            key = as3.str($value);
            if (costs[key]) {
                parts.push(CATAPULTPOPUP.Format(Number(costs[key])) + " " + KEYS.Get(as3.str(names[(Number(key.substr(1)) | 0) - 1])));
            }
        }
        return parts.join(" + ");
    }

    private static charge(param1: any): void {
        let key: string = null;
        let costs: any = ResourceBombs.costsOf(param1);
        if (GLOBAL.ioTestMode()) {
            return;
        }
        for (key in costs) {
            GLOBAL._resources[key].Add(-costs[key]);
            GLOBAL._hpResources[key] -= costs[key];
            // Several shots in one attack can draw on the same resource: add to what is already owed.
            GLOBAL._attackersDeltaResources[key] = new SecNum((GLOBAL._attackersDeltaResources[key] ? GLOBAL._attackersDeltaResources[key].Get() : 0) - costs[key]);
        }
        GLOBAL._attackersDeltaResources.dirty = true;
    }

    public static Setup(): void {
        let _loc3_: any = null;
        let _loc4_: string = null;
        ImageCache.GetImageWithCallBack("effects/twigs.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack("effects/pebble.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack("effects/pebblehit.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack(GLOBAL.INFERNO_ONLY ? "effects/sulfur.png" : "effects/putty.png", ResourceBombs.onAssetLoaded, true, 6);
        if (GLOBAL.INFERNO_ONLY) {
            ResourceBombs.ioApplyServerAmmo();
            SiegeWeapons.ioClearOverrides();
        }
        let _loc1_: int = 0;
        let _loc2_: string = "tw0";
        ResourceBombs._bombid = "tw0";
        ResourceBombs._launchedBomb = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK) {
            for (_loc4_ in ResourceBombs._bombs) {
                _loc3_ = ResourceBombs._bombs[_loc4_];
                if (ResourceBombs.canAfford(_loc3_) && GLOBAL._attackersCatapult >= _loc3_.catapultLevel && _loc3_.cost <= 2000000) {
                    if (_loc3_.cost > _loc1_) {
                        _loc1_ = _loc3_.cost | 0;
                        _loc2_ = _loc4_;
                    }
                }
            }
            ResourceBombs._bombid = _loc2_;
        }
    }

    /** Inferno-only: the bombs' pictures, for a replay's catapult shots (IoReplayPlayer). */
    public static ioLoadArt(): void {
        ImageCache.GetImageWithCallBack("effects/twigs.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack("effects/pebble.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack("effects/pebblehit.png", ResourceBombs.onAssetLoaded, true, 6);
        ImageCache.GetImageWithCallBack(GLOBAL.INFERNO_ONLY ? "effects/sulfur.png" : "effects/putty.png", ResourceBombs.onAssetLoaded, true, 6);
    }

    public static Clear(): void {
        ResourceBombs._mc = null;
        ResourceBombs._launchedBomb = false;
    }

    public static onAssetLoaded(param1: string, param2: BitmapData): void {
        if (param1 == "effects/pebble.png") {
            ResourceBombs.bmd_pebble = param2;
        } else if (param1 == "effects/pebblehit.png") {
            ResourceBombs.bmd_pebblehit = param2;
        } else if (param1 == "effects/twigs.png") {
            ResourceBombs.bmd_twigs = param2;
        } else if (param1 == "effects/putty.png" || param1 == "effects/sulfur.png") {
            ResourceBombs.bmd_putty = param2;
        }
    }

    public static BombAdd(param1: any): void {
        ResourceBombs._state = 1;
        ATTACK.DropZone(param1.radius | 0, param1.dropTarget | 0);
        if (ResourceBombs._mc) {
            ResourceBombs._mc.Update();
        }
    }

    public static BombRemove(): void {
        if (ResourceBombs._state == 1) {
            ATTACK.RemoveDropZone();
            ResourceBombs._state = 0;
            if (ResourceBombs._mc) {
                ResourceBombs._mc.Update();
            }
        }
    }

    public static BombDrop(): void {
        let _loc4_: any = null;
        let _loc1_: int = 0;
        let _loc2_: any = ResourceBombs._bombs[ResourceBombs._bombid];
        let _loc3_: boolean = false;
        if (Boolean(ResourceBombs._mc) && ResourceBombs._mc.waitTime > GLOBAL.Timestamp()) {
            return;
        }
        ATTACK.RemoveDropZone();
        if (GLOBAL._attackersResources && ResourceBombs.canAfford(_loc2_)) {
            // A Chaos weapon needs the weapon slot to be free (Marilyn holds it until she explodes).
            if (!(_loc2_.kind == "decoy" && SiegeWeapons.activeWeapon)) {
                ResourceBombs.charge(_loc2_);
                _loc3_ = true;
            }
        }
        if (_loc3_) {
            // Inferno-only quest book: Marilyn, the Candy Jars, a Sulfur Bomb
            if (GLOBAL.INFERNO_ONLY && _loc2_.kind) {
                IoQuests.event("ammo_" + _loc2_.kind);
            }
            for (_loc4_ of as3.values(ResourceBombs._bombs)) {
                if (_loc4_.group == _loc2_.group) {
                    _loc4_.used = true;
                }
            }
            if (GLOBAL.INFERNO_ONLY && IoReplayRecorder.recording) {
                IoReplayRecorder.shot(_loc2_, MAP._GROUND.mouseX, MAP._GROUND.mouseY);
            }
            if (_loc2_.kind == "decoy" || _loc2_.kind == "jars") {
                ResourceBombs.ioLaunchChaosWeapon(_loc2_, MAP._GROUND.mouseX, MAP._GROUND.mouseY);
            } else {
                ResourceBombs.Trigger(MAP._BUILDINGBASES, new Point(MAP._GROUND.mouseX, MAP._GROUND.mouseY), _loc2_, 2);
            }
        }
        if (ResourceBombs._bombid == "pu3") {
            ACHIEVEMENTS.Check("hugerage", 1);
        }
        if (_loc2_.kind) {
            if (_loc3_) {
                ATTACK.Log("bomb" + ResourceBombs._bombid, "<font color=\"#A800FF\">" + _loc2_.name + " " + ResourceBombs.ioRowName(_loc2_) + " was catapulted in (" + ResourceBombs.costText(_loc2_) + ")</font>");
            }
        } else {
            ATTACK.Log("bomb" + ResourceBombs._bombid, "<font color=\"#A800FF\">" + KEYS.Get("attack_log_catapulted", { "v1": GLOBAL.FormatNumber(Number(_loc2_.cost)), "v2": GLOBAL._resourceNames[_loc2_.resource - 1] }) + "</font>");
        }
        ResourceBombs._state = 0;
        if (ResourceBombs._mc) {
            ResourceBombs._mc.Update();
        }
    }

    public static ioRowName(param1: any): string {
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
    private static ioLaunchChaosWeapon(param1: any, param2: number, param3: number): void {
        if (param1.kind == "decoy") {
            SiegeWeapons.ioActivate(Decoy.ID, { "damage": param1.damage, "range": param1.radius, "duration": param1.fuse }, param2, param3);
        } else {
            // Jarred for `seconds` (an older server may still send a `durability` only: then as before,
            // until the tower shoots its way out).
            SiegeWeapons.ioDropJars({ "range": param1.radius, "durability": param1.durability || 0, "seconds": Number(param1.seconds) || 0 }, param2, param3);
        }
        ResourceBombs._launchedBomb = true;
        if (ResourceBombs._mc) {
            ResourceBombs._mc.fired();
        }
        LOGGER.Stat([27, param1.resource, param1.col, param1.cost]);
    }

    public static Trigger(param1: MovieClip, param2: Point, param3: any, param4: int = 2): void {
        ResourceBombs._activeBombs[ResourceBombs.bombcounter] = new ResourceBomb(param1, param2, param3, param4);
        if (param3.group == 0) {
            SOUNDS.Play("twigbomb");
        } else if (param3.group == 1) {
            SOUNDS.Play("pebblebomb");
        } else if (param3.group == 2) {
            SOUNDS.Play("puttybomb");
        }
        ++ResourceBombs.bombcounter;
        ResourceBombs._launchedBomb = true;
        if (ResourceBombs._mc) {
            ResourceBombs._mc.fired();
        }
        if (ALLIANCES._myAlliance) {
            LOGGER.Stat([27, param3.resource, param3.col, param3.cost, ALLIANCES._allianceID]);
        } else {
            LOGGER.Stat([27, param3.resource, param3.col, param3.cost]);
        }
    }

    public static Tick(): void {
        let _loc1_: string = null;
        let _loc3_: any = null;
        let _loc4_: Vector<any> = null;
        let _loc5_: BFOUNDATION = null;
        let _loc2_: int = 0;
        for (_loc1_ in ResourceBombs._activeBombs) {
            _loc3_ = ResourceBombs._activeBombs[_loc1_];
            _loc2_++;
            if (_loc3_.Tick()) {
                BASE.Save();
                _loc3_.Freeze();
                delete ResourceBombs._activeBombs[_loc1_];
                _loc2_--;
                if (_loc2_ == 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                    _loc4_ = InstanceManager.getInstancesByClass(BFOUNDATION);
                    for (_loc5_ of (_loc4_ ?? [])) {
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

    public static Check(): string {
        let _loc3_: string = null;
        let _loc1_: any[] = [];
        let _loc2_: any[] = ["tw0", "tw1", "tw2", "pb0", "pb1", "pb2", "pb3", "pu0", "pu1", "pu2", "pu3"];
        for (const $value of as3.values(_loc2_)) {
            _loc3_ = as3.str($value);
            if (ResourceBombs._bombs[_loc3_].radius) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].radius);
            }
            if (ResourceBombs._bombs[_loc3_].damage) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].damage);
            }
            if (ResourceBombs._bombs[_loc3_].cost) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].cost);
            }
            if (ResourceBombs._bombs[_loc3_].resource) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].resource);
            }
            if (ResourceBombs._bombs[_loc3_].damageMult) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].damageMult);
            }
            if (ResourceBombs._bombs[_loc3_].speed) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].speed);
            }
            if (ResourceBombs._bombs[_loc3_].speedlength) {
                _loc1_.push(ResourceBombs._bombs[_loc3_].speedlength);
            }
        }
        return md5(JSON.stringify(_loc1_));
    }
}
