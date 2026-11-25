import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { ALLIANCES, AllianceArmamentBuff, AllianceBuildersGuildBuff, AllianceConquestBuff, AllianceDeclareWarBuff, AllianceHarvestMoonBuff, BASE, BaseBuffHandler, Console, GLOBAL, ImageCache, LOGIN, SecNum, ui_buffIcon_CLIP } from "@game";

export class POWERUPS extends ASObject {
    public static _powerups: any = null;

    public static _attpowerups: any = null;

    public static _powerupProps: any = null;

    public static _mypowerups: any = null;

    public static OFFENSE: boolean = false;

    public static DEFENSE: boolean = false;

    public static NORMAL: boolean = false;

    public static readonly ALLIANCE_TYPE_DEFENSE: string = "DEFENSE";

    public static readonly ALLIANCE_ARMAMENT: string = "ap_armament";

    public static readonly ALLIANCE_CONQUEST: string = "ap_conquest";

    public static readonly ALLIANCE_DECLAREWAR: string = "ap_declarewar";

    /** Inferno-only (22 October): every member's harvesters make 25% more (the stronger of it and Production Overdrive). */
    public static readonly ALLIANCE_HARVESTMOON: string = "ap_harvestmoon";

    /** Inferno-only (22 October): every member's builds and upgrades take 15% less time (the stronger of it and Sharper Tools). */
    public static readonly ALLIANCE_BUILDERSGUILD: string = "ap_buildersguild";

    /** Harvest Moon's production, times. */
    public static readonly HARVEST_MOON_MUL: number = 1.25;

    /** Builders' Guild's build and upgrade times, times. */
    public static readonly BUILDERS_GUILD_MUL: number = 0.85;

    public static readonly _expireRealTime: boolean = false;

    public static readonly _updateOnPage: boolean = true;

    public static _testToggleOffPowers: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: any[] = null, param2: any[] = null, param3: boolean = false): void {
        let _loc4_: int = 0;
        let _loc5_: SecNum = null;
        if (!POWERUPS._powerupProps) {
            POWERUPS._powerupProps = new Object();
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_ARMAMENT] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowArmament };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_CONQUEST] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowConquest };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_DECLAREWAR] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowDeclareWar };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_HARVESTMOON] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowHarvestMoon };
            POWERUPS._powerupProps[POWERUPS.ALLIANCE_BUILDERSGUILD] = { "id": 1, "endtime": 0, "duration": 0, "cooldown": 0, "mod": POWERUPS.PowBuildersGuild };
            if (!POWERUPS._powerups) {
                POWERUPS._powerups = new Object();
            }
            if (!POWERUPS._attpowerups) {
                POWERUPS._attpowerups = new Object();
            }
            if (!POWERUPS._mypowerups) {
                POWERUPS._mypowerups = new Object();
            }
        }
        POWERUPS.GetMode();
        POWERUPS.Clear(param3);
        if (POWERUPS._testToggleOffPowers || !POWERUPS._updateOnPage) {
            return;
        }
        if (param1) {
            _loc4_ = 0;
            while (_loc4_ < param1.length) {
                if (Boolean(param1[_loc4_].id) && Boolean(param1[_loc4_].endtime)) {
                    (_loc5_ = new SecNum(0)).Set(Number(param1[_loc4_].endtime));
                    POWERUPS._powerups[param1[_loc4_].id] = { "name": param1[_loc4_].id, "endtime": _loc5_ };
                    if (POWERUPS.DEFENSE) {
                        POWERUPS._mypowerups[param1[_loc4_].id] = { "name": param1[_loc4_].id, "endtime": _loc5_ };
                    }
                }
                _loc4_++;
            }
        }
        if (param2) {
            _loc4_ = 0;
            while (_loc4_ < param2.length) {
                if (Boolean(param2[_loc4_].id) && Boolean(param2[_loc4_].endtime)) {
                    (_loc5_ = new SecNum(0)).Set(Number(param2[_loc4_].endtime));
                    POWERUPS._attpowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    if (POWERUPS.OFFENSE) {
                        POWERUPS._mypowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    } else if (POWERUPS.NORMAL) {
                        POWERUPS._mypowerups[param2[_loc4_].id] = { "name": param2[_loc4_].id, "endtime": _loc5_ };
                    }
                }
                _loc4_++;
            }
        }
        POWERUPS.ioAddBuffs();
    }

    /**
     * Inferno-only (26 October): the running power-ups of the alliance of the yard being attacked, when it is another
     * player's (base/load's io_defpowerups): its Armament defends it in the attacker's game, which plays the defence.
     * (Its Armament was only ever put on in its owner's own game.)
     */
    public static _ioDefend: any[] = null;

    /** The yard being attacked has its alliance's Armament running. */
    public static ioDefArmament(): boolean {
        if (!GLOBAL.INFERNO_ONLY || !POWERUPS._ioDefend) {
            return false;
        }
        for (let p of as3.values(POWERUPS._ioDefend)) {
            if (p && p.id == POWERUPS.ALLIANCE_ARMAMENT && Number(p.endtime) > GLOBAL.Timestamp()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Inferno-only (26 October, the user's: "Make sure that every alliance power up ... actually works"): the power-ups'
     * buffs again once the yard is built (BaseBuffHandler.initialize, after BASE.ProcessD's buildings). The load's
     * Setup came before the yard's buildings were made, and on the first load of a session before the buffs could be
     * had at all: Armament's extra hit points and trap damage went on no building. Armament is taken off and put on
     * again, over the buildings there now: the player's own yard's in its own game, or (attacking another player) the
     * defender's when its alliance runs Armament.
     */
    public static ioRebuff(): void {
        if (!GLOBAL.INFERNO_ONLY || !POWERUPS._powerupProps) {
            return;
        }
        POWERUPS.GetMode();
        BaseBuffHandler.instance.ioRemoveBuffByID(AllianceArmamentBuff.ID);
        POWERUPS.ioAddBuffs();
        if (POWERUPS.OFFENSE && POWERUPS.ioDefArmament() && !BaseBuffHandler.instance.getBuffByID(AllianceArmamentBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceArmamentBuff.ID);
        }
    }

    /** The running power-ups' buffs not had yet (Armament: in the player's own yard). */
    private static ioAddBuffs(): void {
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_ARMAMENT) && POWERUPS.DEFENSE && !BaseBuffHandler.instance.getBuffByID(AllianceArmamentBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceArmamentBuff.ID);
        }
        if (Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_CONQUEST)) && !BaseBuffHandler.instance.getBuffByID(AllianceConquestBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceConquestBuff.ID);
        }
        if (Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR)) && !BaseBuffHandler.instance.getBuffByID(AllianceDeclareWarBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceDeclareWarBuff.ID);
        }
        // (Inferno-only, 22 October: their descriptions for the top bar's icons)
        if (GLOBAL.INFERNO_ONLY && Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_HARVESTMOON)) && !BaseBuffHandler.instance.getBuffByID(AllianceHarvestMoonBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceHarvestMoonBuff.ID);
        }
        if (GLOBAL.INFERNO_ONLY && Boolean(POWERUPS.CheckPowers(POWERUPS.ALLIANCE_BUILDERSGUILD)) && !BaseBuffHandler.instance.getBuffByID(AllianceBuildersGuildBuff.ID)) {
            BaseBuffHandler.instance.addBuffByID(AllianceBuildersGuildBuff.ID);
        }
    }

    /**
     * The top bar's (and the map's) little icon for a running power-up: the stock clip's frame for the first three; for
     * the Inferno's own (22 October: Harvest Moon, Builders' Guild), its tab icon (alliances/<id>_icon.jpg) at 32 x 32
     * in a clip of its own (the stock clip has no frame for them).
     */
    public static ioBuffIcon(name: string): MovieClip {
        if (name != POWERUPS.ALLIANCE_HARVESTMOON && name != POWERUPS.ALLIANCE_BUILDERSGUILD) {
            let clip: MovieClip = new ui_buffIcon_CLIP();
            clip.gotoAndStop(name);
            return clip;
        }
        let mc: MovieClip = new MovieClip();
        mc.graphics.beginFill(0x1A0C06, 1);
        mc.graphics.drawRoundRect(0, 0, 32, 32, 6, 6);
        mc.graphics.endFill();
        ImageCache.GetImageWithCallBack("alliances/" + name + "_icon.jpg", (k: string, bmd: BitmapData): void => {
            if (!bmd || bmd.width <= 0) {
                return;
            }
            let bm: Bitmap = new Bitmap(bmd);
            bm.smoothing = true;
            bm.scaleX = 30 / bmd.width;
            bm.scaleY = 30 / bmd.height;
            bm.x = 1;
            bm.y = 1;
            mc.addChild(bm);
        });
        return mc;
    }

    /**
     * Inferno-only (22 October): one of the player's alliance's power-ups running for their own yard now (a main yard or
     * an outpost, being built: the yard's load's `powerups`), and not run out on the clock since.
     */
    public static ioActive(name: string): boolean {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !POWERUPS._powerups) {
            return false;
        }
        let p: any = POWERUPS._powerups[name];
        return Boolean(p) && p.endtime && p.endtime.Get() > GLOBAL.Timestamp();
    }

    public static Apply(param1: string, param2: any[]): number {
        let _loc4_: Function = null;
        POWERUPS.GetMode();
        let _loc3_: number = 0;
        if (POWERUPS.NORMAL) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._mypowerups && Boolean(POWERUPS._mypowerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._mypowerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        if (POWERUPS.DEFENSE) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._powerups && Boolean(POWERUPS._powerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._powerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        if (POWERUPS.OFFENSE) {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._attpowerups && Boolean(POWERUPS._attpowerups[param1])) {
                _loc4_ = POWERUPS._powerupProps[param1].mod;
                if (POWERUPS._expireRealTime && POWERUPS._attpowerups[param1].endtime.Get() < GLOBAL.Timestamp()) {
                    _loc3_ = Number(param2[0]);
                } else {
                    _loc3_ = Number(_loc4_.apply(null, param2));
                }
            } else {
                _loc3_ = Number(param2[0]);
            }
        }
        return _loc3_;
    }

    public static CheckPowers(param1: string = null, param2: string = null): int {
        let _loc3_: any = null;
        let _loc4_: number = NaN;
        let _loc5_: string = null;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc3_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc3_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc3_ = POWERUPS._attpowerups;
        }
        if (param2) {
            if (param2 == "NORMAL") {
                _loc3_ = POWERUPS._mypowerups;
            }
            if (param2 == "DEFENSE") {
                _loc3_ = POWERUPS._powerups;
            }
            if (param2 == "OFFENSE") {
                _loc3_ = POWERUPS._attpowerups;
            }
        }
        if (param1) {
            if (Boolean(_loc3_) && Boolean(_loc3_[param1])) {
                if (POWERUPS._expireRealTime) {
                    if (_loc3_[param1].endtime.Get() < GLOBAL.Timestamp()) {
                        return 0;
                    }
                }
                return 1;
            }
            return 0;
        }
        _loc4_ = 0;
        for (_loc5_ in _loc3_) {
            if (POWERUPS._expireRealTime) {
                if (_loc3_[_loc5_].endtime.Get() > GLOBAL.Timestamp()) {
                    _loc4_++;
                }
            } else {
                _loc4_++;
            }
        }
        return _loc4_ | 0;
    }

    public static Timeleft(param1: string, param2: string = null): number {
        let _loc3_: any = null;
        let _loc4_: number = NaN;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc3_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc3_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc3_ = POWERUPS._attpowerups;
        }
        if (param2) {
            if (param2 == "NORMAL") {
                _loc3_ = POWERUPS._mypowerups;
            }
            if (param2 == "DEFENSE") {
                _loc3_ = POWERUPS._powerups;
            }
            if (param2 == "OFFENSE") {
                _loc3_ = POWERUPS._attpowerups;
            }
        }
        if (Boolean(_loc3_) && Boolean(_loc3_[param1])) {
            return _loc3_[param1].endtime.Get() - GLOBAL.Timestamp();
        }
        return 0;
    }

    public static Remove(param1: string, param2: string = null): void {
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL || param2 == "NORMAL") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._mypowerups && Boolean(POWERUPS._mypowerups[param1])) {
                POWERUPS._mypowerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
        if (POWERUPS.DEFENSE || param2 == "DEFENSE") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._powerups && Boolean(POWERUPS._powerups[param1])) {
                POWERUPS._powerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
        if (POWERUPS.OFFENSE || param2 == "OFFENSE") {
            if (POWERUPS._powerupProps && POWERUPS._powerupProps[param1] && POWERUPS._attpowerups && Boolean(POWERUPS._attpowerups[param1])) {
                POWERUPS._attpowerups[param1].endtime.Set(GLOBAL.Timestamp());
            }
        }
    }

    public static GetMode(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            POWERUPS.OFFENSE = true;
            POWERUPS.DEFENSE = false;
            POWERUPS.NORMAL = false;
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            POWERUPS.OFFENSE = false;
            POWERUPS.DEFENSE = true;
            POWERUPS.NORMAL = false;
        } else {
            POWERUPS.OFFENSE = false;
            POWERUPS.DEFENSE = false;
            POWERUPS.NORMAL = true;
        }
    }

    public static GetPowerups(param1: string = null): any {
        let _loc2_: any = null;
        POWERUPS.GetMode();
        if (POWERUPS.NORMAL) {
            _loc2_ = POWERUPS._mypowerups;
        }
        if (POWERUPS.DEFENSE) {
            _loc2_ = POWERUPS._powerups;
        }
        if (POWERUPS.OFFENSE) {
            _loc2_ = POWERUPS._attpowerups;
        }
        if (param1) {
            if (param1 == "NORMAL") {
                _loc2_ = POWERUPS._mypowerups;
            }
            if (param1 == "DEFENSE") {
                _loc2_ = POWERUPS._powerups;
            }
            if (param1 == "OFFENSE") {
                _loc2_ = POWERUPS._attpowerups;
            }
        }
        return _loc2_;
    }

    private static PowArmament(...rest: any[]): number {
        Console.warning("Alliance Armament shouldnt be called this way, it should be a base buff");
        return 0;
    }

    private static PowConquest(...rest: any[]): number {
        return Math.ceil(rest[0] * 0.75);
    }

    private static PowHarvestMoon(...rest: any[]): number {
        return Number(rest[0]) * POWERUPS.HARVEST_MOON_MUL;
    }

    private static PowBuildersGuild(...rest: any[]): number {
        return Number(rest[0]) * POWERUPS.BUILDERS_GUILD_MUL;
    }

    private static PowDeclareWar(...rest: any[]): number {
        let _loc2_: number = Number(rest[0]);
        return Number(rest[0] + 2);
    }

    public static Clear(param1: boolean = false): void {
        if (POWERUPS._updateOnPage || param1) {
            if (POWERUPS._powerups) {
                POWERUPS._powerups = null;
            }
            POWERUPS._powerups = new Object();
            if (POWERUPS._attpowerups) {
                POWERUPS._attpowerups = null;
            }
            POWERUPS._attpowerups = new Object();
            if (POWERUPS._mypowerups) {
                POWERUPS._mypowerups = null;
            }
            POWERUPS._mypowerups = new Object();
        }
    }

    public static Validate(): void {
        POWERUPS.GetMode();
        if (!ALLIANCES._myAlliance) {
            if (POWERUPS._mypowerups) {
                POWERUPS._mypowerups = null;
            }
            POWERUPS._mypowerups = new Object();
        }
        if (POWERUPS.DEFENSE && !ALLIANCES._allianceID && BASE._userID == LOGIN._playerID) {
            if (POWERUPS._powerups) {
                POWERUPS._powerups = null;
            }
            POWERUPS._powerups = new Object();
        }
        if (POWERUPS.OFFENSE && !ALLIANCES._allianceID && BASE._userID != LOGIN._playerID) {
            if (POWERUPS._attpowerups) {
                POWERUPS._attpowerups = null;
            }
            POWERUPS._attpowerups = new Object();
        }
    }
}
