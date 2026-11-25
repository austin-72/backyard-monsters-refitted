import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING13, BUILDING15, CREATURELOCKER, CREATURES, GLOBAL, GRID, HATCHERY, HATCHERYCC, HATCHERYCCPOPUP, HATCHERYPOPUP, HOUSINGBUNKER, HOUSINGPOPUP, HousingPersistentPopup, InstanceManager, IoToast, LOGGER, LOGIN, MAP, MAPROOM_DESCENT, MapRoomManager, MonsterBase, MonsterData, KEYS, SOUNDS, SecNum, TRIBES, IoDevil } from "@game";

export class HOUSING extends ASObject {
    public static _housingPopup: MovieClip = null;

    public static _open: boolean = false;

    public static _housingCapacity: SecNum = null;

    public static _housingUsed: SecNum = null;

    public static _housingSpace: SecNum = null;

    public static _housingBuildingUpgrading: boolean = false;

    public static readonly IO_TEST_CAPACITY: int = 9999999;

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: MouseEvent = null): void {
        HOUSING._open = true;
        GLOBAL.BlockerAdd();
        if (MapRoomManager.instance.isInMapRoom3) {
            HOUSING._housingPopup = new HousingPersistentPopup();
        } else {
            HOUSING._housingPopup = new HOUSINGPOPUP();
        }
        GLOBAL._layerWindows.addChild(HOUSING._housingPopup);
        HOUSING._housingPopup.Center();
        HOUSING._housingPopup.ScaleUp();
    }

    public static Hide(param1: MouseEvent = null): void {
        if (HOUSING._open) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(HOUSING._housingPopup);
            HOUSING._open = false;
            HOUSING._housingPopup = null;
        }
    }

    public static HousingSpace(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        HOUSING._housingCapacity = new SecNum(0);
        HOUSING._housingUsed = new SecNum(0);
        HOUSING._housingSpace = new SecNum(0);
        HOUSING._housingBuildingUpgrading = false;
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._countdownBuild.Get() <= 0 && (_loc3_.health > 10 || MapRoomManager.instance.isInMapRoom3)) {
                _loc6_ = _loc3_._buildingProps.capacity[_loc3_.getEffectiveLevel() - 1] | 0;
                if (GLOBAL._extraHousing >= GLOBAL.Timestamp() && GLOBAL._extraHousingPower.Get() > 0) {
                    _loc6_ = HOUSING.addHousingCapacityMultiplier(_loc6_);
                }
                HOUSING._housingCapacity.Add(_loc6_);
                _loc1_++;
            }
            if (_loc3_._countdownBuild.Get() + _loc3_._countdownUpgrade.Get() > 0) {
                HOUSING._housingBuildingUpgrading = true;
            }
        }
        // (Inferno-only, 13 November: the Devil's Contract's Thin the Ranks; the player's own yards)
        if (GLOBAL.INFERNO_ONLY && IoDevil.ownYard() && IoDevil.mul("housing") != 1) {
            HOUSING._housingCapacity.Set(Math.floor(HOUSING._housingCapacity.Get() * IoDevil.mul("housing")));
        }
        // Admin test mode: the Compound holds any number of monsters.
        if (GLOBAL.ioTestMode()) {
            HOUSING._housingCapacity.Set(HOUSING.IO_TEST_CAPACITY);
        }
        _loc4_ = GLOBAL.player.monsterList.length | 0;
        _loc5_ = 0;
        while (_loc5_ < _loc4_) {
            HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
            _loc5_++;
        }
        HOUSING._housingSpace.Set(HOUSING._housingCapacity.Get() - HOUSING._housingUsed.Get());
        // (Inferno-only, QoL #29: a full Compound is remembered, for Refill army)
        if (GLOBAL.INFERNO_ONLY) {
            HOUSING.ioNoteArmy();
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Inferno-only (QoL #29): Refill army
    // ---------------------------------------------------------------------------------------------
    /**
     * The last full Compound of each yard (its monsters and how many of each) is kept in this browser, written
     * whenever the Compound is full in the player's own yard (no room left for the smallest monster in it). The
     * Compound's Refill army (HOUSINGPOPUP) works out what's missing to get back to it (less what is housed,
     * queued and hatching, as far as the room allows, monsters unlocked only), says what it costs, and queues it
     * with the incubators' own queueing (HATCHERYPOPUP.ioQueueInto; the Incubation Control Station's,
     * HATCHERYCCPOPUP.ioQueueOne, when there is one), until the Magma or the queues run out.
     */
    public static readonly IO_ARMY_KEY: string = "bymr-army";

    /** What was last written (yard and army), so a Compound still full writes nothing more. */
    private static _ioArmyKept: string = null;

    /** This yard (player and yard): each yard has its own. */
    private static ioArmyYard(): string {
        return LOGIN._playerID + ":" + BASE._baseID;
    }

    private static ioArmyAll(): any {
        try {
            let raw: string = window.localStorage.getItem(HOUSING.IO_ARMY_KEY);
            let all: any = raw ? JSON.parse(raw) : null;
            return all && typeof all == "object" ? all : {};
        } catch (e) {
            return {};
        }
    }

    /** This yard's last full Compound: {"m": {monster: count}, "h": housing used, "t": when}, or null. */
    public static ioArmy(): any {
        let a: any = HOUSING.ioArmyAll()[HOUSING.ioArmyYard()];
        return a && a.m && typeof a.m == "object" ? a : null;
    }

    private static ioNoteArmy(): void {
        if ((GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD && GLOBAL.mode != GLOBAL.e_BASE_MODE.IBUILD) || BASE._loading || !GLOBAL.player || !GLOBAL.player.monsterList || GLOBAL.ioTestMode()) {
            return;
        }
        let cap: number = Number(HOUSING._housingCapacity.Get());
        let used: number = Number(HOUSING._housingUsed.Get());
        if (!(cap > 0) || !(used > 0)) {
            return;
        }
        let m: any = {};
        let smallest: number = 0;
        let n: int = GLOBAL.player.monsterList.length | 0;
        for (let i: int = 0; i < n; i++) {
            let md: MonsterData = as3.vget(GLOBAL.player.monsterList, i);
            if (!md || md.numCreeps <= 0) {
                continue;
            }
            m[md.m_creatureID] = md.numCreeps | 0;
            let size: number = CREATURES.GetProperty(md.m_creatureID, "cStorage", 0, true);
            if (size > 0 && (smallest <= 0 || size < smallest)) {
                smallest = size;
            }
        }
        if (smallest <= 0 || cap - used >= smallest) {
            return;
        }
        let yard: string = HOUSING.ioArmyYard();
        let key: string = yard + JSON.stringify(m);
        if (key == HOUSING._ioArmyKept) {
            return;
        }
        HOUSING._ioArmyKept = key;
        try {
            let all: any = HOUSING.ioArmyAll();
            all[yard] = { "m": m, "h": used, "t": GLOBAL.Timestamp() };
            window.localStorage.setItem(HOUSING.IO_ARMY_KEY, JSON.stringify(all));
        } catch (e) {
        }
    }

    /** The remembered army as a list: "40 Fangs, 12 Brains". */
    public static ioArmyNames(param1: any): string {
        let out: string[] = [];
        for (let id in param1) {
            let c: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[id] : null;
            out.push((param1[id] | 0) + " " + KEYS.Get(as3.str(c ? c.name : id)));
        }
        return out.join(", ");
    }

    /** Monsters on their way: queued in the incubators (and the Station) and hatching now, by kind. */
    private static ioOnTheWay(): any {
        let have: any = {};
        let add = (id: any, n: number): void => {
            if (id) {
                have[String(id)] = (have[String(id)] | 0) + (n | 0);
            }
        };
        for (let h of (InstanceManager.getInstancesByClass(BUILDING13) ?? [])) {
            for (let e of as3.values(as3.as(h._monsterQueue, Array) || [])) {
                add(e[0], e[1]);
            }
            if (h._inProduction) {
                add(h._inProduction, 1);
            }
        }
        if (GLOBAL._bHatcheryCC && GLOBAL._bHatcheryCC._monsterQueue) {
            for (let e of as3.values(as3.as(GLOBAL._bHatcheryCC._monsterQueue, Array) || [])) {
                add(e[0], e[1]);
            }
        }
        return have;
    }

    /**
     * What's missing to get back to this yard's last full Compound: {"list": [[monster, count], ...], "cost": Magma},
     * as far as the Compound's room (less what's on its way) allows; unlocked monsters only. null with none kept.
     */
    public static ioArmyMissing(): any {
        let a: any = HOUSING.ioArmy();
        if (!a) {
            return null;
        }
        HOUSING.HousingSpace();
        let coming: any = HOUSING.ioOnTheWay();
        let room: number = Number(HOUSING._housingSpace.Get());
        for (let id in coming) {
            room -= CREATURES.GetProperty(id, "cStorage", 0, true) * (coming[id] | 0);
        }
        let housed: any = {};
        let n: int = GLOBAL.player.monsterList.length | 0;
        for (let i: int = 0; i < n; i++) {
            let md: MonsterData = as3.vget(GLOBAL.player.monsterList, i);
            if (md) {
                housed[md.m_creatureID] = (housed[md.m_creatureID] | 0) + (md.numCreeps | 0);
            }
        }
        let list: any[] = [];
        let cost: number = 0;
        for (let id in a.m) {
            if (!CREATURELOCKER._creatures || !CREATURELOCKER._creatures[id] || !(CREATURELOCKER._lockerData[id] && CREATURELOCKER._lockerData[id].t == 2)) {
                continue;
            }
            let want: int = ((a.m[id] | 0) - (housed[id] | 0) - (coming[id] | 0)) | 0;
            let size: number = CREATURES.GetProperty(id, "cStorage", 0, true);
            if (size > 0) {
                want = Math.min(want, Math.floor(room / size)) | 0;
            }
            if (want <= 0) {
                continue;
            }
            room -= want * size;
            cost += want * CREATURES.GetProperty(id, "cResource");
            list.push([id, want]);
        }
        return { "list": list, "cost": cost };
    }

    /** Refill army's button: what's missing and its cost first, then queued on Yes. */
    public static ioRefillAsk(): void {
        let miss: any = HOUSING.ioArmyMissing();
        if (!miss) {
            GLOBAL.Message(KEYS.Get("io_yin_refill_none"));
            return;
        }
        if (miss.list.length == 0) {
            GLOBAL.Message(KEYS.Get("io_yin_refill_nothing"));
            return;
        }
        let hatcheries: any[] = HOUSING.ioHatcheries();
        if (!GLOBAL._bHatcheryCC && hatcheries.length == 0) {
            GLOBAL.Message(KEYS.Get("io_yin_refill_noinc"));
            return;
        }
        let names: string[] = [];
        for (let e of miss.list) {
            let c: any = CREATURELOCKER._creatures[e[0]];
            names.push((e[1] | 0) + " " + KEYS.Get(as3.str(c ? c.name : e[0])));
        }
        let have: number = Number(BASE._resources.r4.Get());
        let text: string = KEYS.Get("io_yin_refill_ask", { "v1": names.join(", "), "v2": GLOBAL.FormatNumber(Math.ceil(miss.cost)), "v3": GLOBAL.FormatNumber(have), "v4": KEYS.Get(as3.str(GLOBAL._resourceNames[3])) });
        if (have < miss.cost) {
            text += "<br><br>" + KEYS.Get("io_yin_refill_short");
        }
        GLOBAL.Message(text, KEYS.Get("io_yin_refill_yes"), (): void => {
            HOUSING.ioRefill(miss.list);
        }, null, KEYS.Get("io_yin_refill_no"), null);
    }

    /** The incubators that can take a queue (built, not being built). */
    private static ioHatcheries(): any[] {
        let out: any[] = [];
        for (let h of (InstanceManager.getInstancesByClass(BUILDING13) ?? [])) {
            if (h instanceof BUILDING13 && h._countdownBuild.Get() <= 0 && h._lvl.Get() > 0) {
                out.push(h);
            }
        }
        return out;
    }

    /** Queues `param1` ([[monster, count], ...]) as far as the Magma and the queues go; says how it went. */
    public static ioRefill(param1: any[]): void {
        let queued: int = 0;
        let wanted: int = 0;
        let stop: boolean = false;
        let hatcheries: any[] = HOUSING.ioHatcheries();
        for (let e of param1) {
            let id: string = String(e[0]);
            wanted += e[1] | 0;
            for (let k: int = 0; k < (e[1] | 0) && !stop; k++) {
                if (BASE._resources.r4.Get() < CREATURES.GetProperty(id, "cResource")) {
                    stop = true;
                    break;
                }
                let ok: boolean = false;
                if (GLOBAL._bHatcheryCC) {
                    ok = HATCHERYCCPOPUP.ioQueueOne(id);
                } else {
                    // (spread over the incubators: the one with the least queued that has room)
                    let best: any = null;
                    let bestN: int = 0;
                    for (let h of hatcheries) {
                        if (!HATCHERYPOPUP.ioRoomFor(h, id)) {
                            continue;
                        }
                        let n: int = 0;
                        for (let q of as3.values(as3.as(h._monsterQueue, Array) || [])) {
                            n += q[1] | 0;
                        }
                        if (!best || n < bestN) {
                            best = h;
                            bestN = n;
                        }
                    }
                    ok = best != null && HATCHERYPOPUP.ioQueueInto(best, id);
                }
                if (!ok) {
                    break;
                }
                queued++;
            }
            if (stop) {
                break;
            }
        }
        if (queued > 0) {
            if (GLOBAL._bHatcheryCC) {
                GLOBAL._bHatcheryCC.Tick(1);
            }
            BASE.Save();
            SOUNDS.Play("click1");
        } else {
            SOUNDS.Play("error1");
        }
        if (HATCHERY._mc) {
            HATCHERY._mc.Update();
        }
        if (HATCHERYCC._mc) {
            HATCHERYCC._mc.Update();
        }
        HOUSING.Update();
        let text: string = KEYS.Get("io_yin_refill_done", { "v1": queued, "v2": wanted });
        if (queued < wanted) {
            text += " " + KEYS.Get(stop ? "io_yin_refill_stop_magma" : "io_yin_refill_stop_queue");
        }
        IoToast.Show(text, 5000);
    }

    private static addHousingCapacityMultiplier(param1: int): int {
        // (Inferno-only, 26 October, the user's: "Make sure that ... everything you can buy in the shop actually works":
        // Housing Expansion's 25%. Its power is kept in a SecNum, which keeps whole numbers: 1.25 came back 1, and the
        // Expansion added no room at all)
        if (GLOBAL.INFERNO_ONLY) {
            return Math.floor(param1 * 1.25) | 0;
        }
        return (param1 * GLOBAL._extraHousingPower.Get()) | 0;
    }

    public static HousingStore(param1: string, param2: Point, param3: boolean = false, param4: int = 0): boolean {
        let _loc7_: MonsterBase = null;
        let _loc8_: MonsterBase = null;
        if (param4 > 0) {
            LOGGER.Log("hak", "Instant monster hack");
            GLOBAL.ErrorMessage("HOUSING insta monster hack");
            return false;
        }
        if (param1 == "C100") {
            param1 = "C12";
        }
        let _loc5_: int = CREATURES.GetProperty(param1, "cStorage", 0, true) | 0;
        let _loc6_: boolean = (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMVIEW) && TRIBES.TribeForBaseID(BASE._wmID).behaviour == "juice";
        HOUSING.HousingSpace();
        if (HOUSING._housingSpace.Get() < _loc5_ && !_loc6_) {
            return false;
        }
        if (!param3) {
            if (_loc6_) {
                _loc7_ = CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "juice", param2, 0);
                if (_loc7_) {
                    _loc7_.changeModeJuice();
                }
            } else {
                _loc8_ = HOUSING.createAndHouseCreep(param1, param2);
                if (!_loc8_) {
                    return false;
                }
                GLOBAL.player.addMonster(param1, _loc8_);
                // Inferno-only (10 October): a monster housed is saved soon (BASE.Save: within a couple of
                // seconds, many at once in one save). The map reads the yard's monsters from the last save, so
                // without this the monsters hatched since were missing from the map and from attacks.
                if (GLOBAL.INFERNO_ONLY && (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD)) {
                    BASE.Save();
                }
            }
        }
        return true;
    }

    public static createAndHouseCreep(param1: string, param2: Point): MonsterBase {
        let _loc3_: BFOUNDATION = HOUSING.getClosestHouseToPoint(param2);
        let _loc4_: MonsterBase = null;
        if (_loc3_) {
            _loc4_ = CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "housing", param2, 0, GRID.FromISO(_loc3_._mc.x, _loc3_._mc.y), _loc3_);
        }
        return _loc4_;
    }

    public static getClosestHouseToPoint(param1: Point): BFOUNDATION {
        let _loc4_: BFOUNDATION = null;
        let _loc5_: number = NaN;
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        let _loc2_: any[] = [];
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (_loc4_._countdownBuild.Get() <= 0 && (_loc4_.health > 0 || MapRoomManager.instance.isInMapRoom3)) {
                _loc5_ = _loc4_._mc.x - param1.x;
                _loc6_ = _loc4_._mc.y - param1.y;
                _loc7_ = _loc4_._creatures.length | 0;
                _loc2_.push({ "mc": _loc4_, "dist": _loc7_ });
            }
        }
        if (_loc2_.length == 0) {
            return null;
        }
        as3.sortOn(_loc2_, ["dist"], Array.NUMERIC);
        return as3.cast(_loc2_[0].mc, BFOUNDATION);
    }

    public static Cull(param1: boolean = false): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        HOUSING._housingCapacity = new SecNum(0);
        HOUSING._housingUsed = new SecNum(0);
        HOUSING._housingSpace = new SecNum(0);
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_._countdownBuild.Get() <= 0 && (_loc3_.health > 0 || MapRoomManager.instance.isInMapRoom3)) {
                _loc6_ = _loc3_._buildingProps.capacity[_loc3_.getEffectiveLevel() - 1] | 0;
                if (GLOBAL._extraHousing >= GLOBAL.Timestamp() && GLOBAL._extraHousingPower.Get() > 0) {
                    _loc6_ = HOUSING.addHousingCapacityMultiplier(_loc6_);
                }
                HOUSING._housingCapacity.Add(_loc6_);
            }
        }
        // (Inferno-only, 13 November: the Devil's Contract's Thin the Ranks; the player's own yards)
        if (GLOBAL.INFERNO_ONLY && IoDevil.ownYard() && IoDevil.mul("housing") != 1) {
            HOUSING._housingCapacity.Set(Math.floor(HOUSING._housingCapacity.Get() * IoDevil.mul("housing")));
        }
        // Admin test mode: the Compound holds any number of monsters.
        if (GLOBAL.ioTestMode()) {
            HOUSING._housingCapacity.Set(HOUSING.IO_TEST_CAPACITY);
        }
        _loc4_ = GLOBAL.player.monsterList.length | 0;
        _loc5_ = 0;
        while (_loc5_ < _loc4_) {
            if (as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps) {
                HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
            }
            _loc5_++;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #283, 14 October: one at a time from the kind there are most of, and said. One of each kind per
            // pass took a lone champion every time, and nothing was said.)
            let gone: any = {};
            let names: any[] = [];
            let guard: int = 0;
            while (HOUSING._housingUsed.Get() > HOUSING._housingCapacity.Get() && guard++ < 100000) {
                let most: MonsterData = null;
                for (let k: int = 0; k < _loc4_; k++) {
                    let md: MonsterData = as3.vget(GLOBAL.player.monsterList, k);
                    if (md.numCreeps > 0 && (!most || md.numCreeps > most.numCreeps)) {
                        most = md;
                    }
                }
                if (!most) {
                    break;
                }
                most.add(-1, null, true);
                HOUSING._housingUsed.Add(-CREATURES.GetProperty(most.m_creatureID, "cStorage", 0, true));
                if (!gone[most.m_creatureID]) {
                    gone[most.m_creatureID] = 0;
                    names.push(most.m_creatureID);
                }
                gone[most.m_creatureID]++;
            }
            if (names.length) {
                let list: string = names.map((id: string): string => gone[id] + " " + KEYS.Get(String(CREATURELOCKER._creatures[id] ? CREATURELOCKER._creatures[id].name : id))).join(", ");
                GLOBAL.Message(KEYS.Get("io_exh_culled", { "v1": list }));
            }
            HOUSING.HousingSpace();
            return;
        }
        while (HOUSING._housingUsed.Get() > HOUSING._housingCapacity.Get()) {
            HOUSING._housingUsed.Set(0);
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                if (as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps > 0) {
                    as3.vget(GLOBAL.player.monsterList, _loc5_).add(-1, null, true);
                    HOUSING._housingUsed.Add(CREATURES.GetProperty(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, "cStorage", 0, true) * as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps);
                }
                _loc5_++;
            }
        }
        HOUSING.HousingSpace();
    }

    public static Populate(): void {
        let _loc3_: BFOUNDATION = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: BFOUNDATION = null;
        let _loc10_: Point = null;
        let _loc1_: any[] = [];
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of (_loc2_ ?? [])) {
            if (_loc3_.health > 0 || MapRoomManager.instance.isInMapRoom3) {
                _loc1_.push(_loc3_);
            }
        }
        if (_loc1_.length > 0) {
            _loc4_ = GLOBAL.player.monsterList.length | 0;
            _loc5_ = 0;
            while (_loc5_ < _loc4_) {
                _loc6_ = as3.vget(GLOBAL.player.monsterList, _loc5_).numCreeps;
                _loc7_ = 0;
                while (_loc7_ < _loc6_) {
                    if (!as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).ownerID) {
                        _loc8_ = (Math.random() * _loc1_.length) | 0;
                        _loc9_ = as3.cast(_loc1_[_loc8_], BFOUNDATION);
                        _loc10_ = GRID.FromISO(_loc9_.x, _loc9_.y);
                        as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).self = CREATURES.Spawn(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creatureID, MAP._BUILDINGTOPS, MonsterBase.k_sBHVR_PEN, HOUSING.PointInHouse(_loc10_), Math.random() * 360, _loc10_, _loc9_, as3.vget(GLOBAL.player.monsterList, _loc5_).level, as3.vget(as3.vget(GLOBAL.player.monsterList, _loc5_).m_creeps, _loc7_).health | 0);
                    }
                    _loc7_++;
                }
                _loc5_++;
            }
        }
    }

    public static PointInHouse(param1: Point): Point {
        let _loc2_: Rectangle = new Rectangle(40, 40, 80, 80);
        // (Inferno-only, 16 October, bug report #91: a monster pacing in its pen with no pen to pace in (its point gone:
        // the pen moved or was sold, a monster sent home some other way) stopped the game; now the yard's pen, or
        // nowhere new (null: the caller leaves it where it is))
        if (param1 == null) {
            if (!GLOBAL.INFERNO_ONLY) {
                return GRID.ToISO(param1.x, param1.y, 0);
            }
            param1 = HOUSING.ioHouseCenter();
            if (param1 == null) {
                return null;
            }
        }
        return GRID.ToISO(param1.x + (_loc2_.x + Math.random() * _loc2_.width), param1.y + (_loc2_.y + Math.random() * _loc2_.height), 0);
    }

    /** (Inferno-only, bug report #91) a pen of the yard's: its grid point (as a monster's target), or null. */
    public static ioHouseCenter(): Point {
        let houses: any[] = [];
        let found: any = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (let h of (found ?? [])) {
            if (h && h.health > 0) {
                houses.push(h);
            }
        }
        let b: any = houses.length > 0 ? houses[(Math.random() * houses.length) | 0] : GLOBAL._bHousing;
        if (!b) {
            return null;
        }
        return GRID.FromISO(Number(b.x), Number(b.y));
    }

    public static Update(): void {
        if (HOUSING._open) {
            HOUSING._housingPopup.Update();
        }
    }

    public static catchupTick(param1: int): void {
        GLOBAL.player.tickHeal(param1);
    }

    public static isHousingBuilding(param1: int): boolean {
        return param1 == 15 || param1 == 128;
    }

    public static AddHouse(param1: BFOUNDATION): void {
        HOUSING.HousingSpace();
        GLOBAL._bHousing = param1;
    }

    public static RemoveHouse(param1: BFOUNDATION): void {
        GLOBAL._bHousing = null;
        HOUSING.HousingSpace();
    }

    public static GetHousingCreatures(): any[] {
        let _loc10_: string = null;
        let _loc11_: any = null;
        let _loc12_: string = null;
        let _loc13_: any = null;
        let _loc14_: int = 0;
        let _loc15_: int = 0;
        let _loc16_: MonsterData = null;
        let _loc17_: any = null;
        let _loc1_: any[] = [];
        let _loc2_: any[] = [];
        let _loc3_: any[] = [];
        let _loc4_: any = CREATURELOCKER.GetCreatures("above");
        let _loc5_: any = undefined;
        _loc5_ = !BASE.isInfernoMainYardOrOutpost;
        if (_loc5_) {
            for (_loc10_ in _loc4_) {
                if (!(_loc11_ = CREATURELOCKER._creatures[_loc10_]).blocked) {
                    _loc11_.id = _loc10_;
                    _loc1_.push(_loc11_);
                }
            }
            as3.sortOn(_loc1_, ["index"], Array.NUMERIC);
        }
        let _loc6_: any = CREATURELOCKER.GetCreatures("inferno");
        let _loc7_: boolean = false;
        _loc7_ = MAPROOM_DESCENT.DescentPassed;
        if (_loc7_) {
            for (_loc12_ in _loc6_) {
                if (!(_loc13_ = CREATURELOCKER._creatures[_loc12_]).blocked) {
                    _loc13_.id = _loc12_;
                    _loc2_.push(_loc13_);
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
        let _loc8_: any[] = [];
        let _loc9_: int = 0;
        while (_loc9_ < _loc3_.length) {
            _loc14_ = GLOBAL.player.monsterList.length | 0;
            _loc15_ = 0;
            while (_loc15_ < _loc14_) {
                if ((_loc16_ = as3.vget(GLOBAL.player.monsterList, _loc15_)).m_creatureID == _loc3_[_loc9_].id) {
                    if (_loc16_.numCreeps > 0) {
                        (_loc17_ = _loc3_[_loc9_]).quantity = _loc16_.numHousedCreeps;
                        _loc8_.push(_loc17_);
                    }
                }
                _loc15_++;
            }
            _loc9_++;
        }
        return _loc8_;
    }
}
