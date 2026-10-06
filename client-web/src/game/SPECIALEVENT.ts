import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOTEM, CREEPS, CUSTOMATTACKS, ChampionBase, DEFENSEEVENTPOPUP, EnumInvasionType, GLOBAL, GRID, InstanceManager, KEYS, LOGGER, MAP, POPUPS, SOUNDS, SPECIALEVENT_WM1, SecNum, TUTORIAL, UI2, UI_BOTTOM, UI_NEXTWAVE, UI_NEXTWAVE_WM1, URLLoaderApi, WMATTACK, WMIEXTENSIONPOPUP, WMIROUNDCOMPLETE } from "@game";

export class SPECIALEVENT extends ASObject {
    private static _eventCount: SecNum;

    private static _setupCalled: boolean;

    private static _lastTimestamp: number;

    private static _wave: SecNum;

    private static _group: int;

    private static _randomDirection: number;

    private static _timeOfNextWave: number;

    private static _spawningWaves: boolean;

    private static _active: boolean;

    private static _isDebug: boolean;

    private static _retreatAllMonsters: boolean;

    private static _eventStartTime: SecNum;

    private static _eventEndTime: SecNum;

    public static _currentAttackers: any[];

    private static _knownFlag: int;

    public static _whatsNewComplete: boolean;

    private static ACTIVE_OVERRIDE: boolean; // const

    private static DIR: any; // const

    private static TIME_OFFSETS: any[]; // const

    private static CREEP: int; // const

    private static GUARDIAN: int; // const

    public static BANNERIMAGE: string; // const

    public static BONUSWAVE: int; // const

    public static BONUSWAVE2: int; // const

    public static EVENTEND: int; // const

    public static WAVES_DESC: any[]; // const

    private static WAVES: any[]; // const

    private static DEBUGCREATURES: any[]; // const

    static {
        as3.lazyStatics(this, { _eventCount: null, _setupCalled: false, _lastTimestamp: NaN, _wave: null, _group: 0, _randomDirection: NaN, _timeOfNextWave: NaN, _spawningWaves: false, _active: false, _isDebug: false, _retreatAllMonsters: false, _eventStartTime: null, _eventEndTime: null, _currentAttackers: null, _knownFlag: 0, _whatsNewComplete: false, ACTIVE_OVERRIDE: false, DIR: null, TIME_OFFSETS: null, CREEP: 0, GUARDIAN: 0, BANNERIMAGE: null, BONUSWAVE: 0, BONUSWAVE2: 0, EVENTEND: 0, WAVES_DESC: null, WAVES: null, DEBUGCREATURES: null }, () => {
            SPECIALEVENT._eventCount = new SecNum(1);
            SPECIALEVENT._setupCalled = false;
            SPECIALEVENT._lastTimestamp = 0;
            SPECIALEVENT._wave = new SecNum(-1);
            SPECIALEVENT._group = 0;
            SPECIALEVENT._randomDirection = 0;
            SPECIALEVENT._timeOfNextWave = -1;
            SPECIALEVENT._spawningWaves = false;
            SPECIALEVENT._active = false;
            SPECIALEVENT._isDebug = false;
            SPECIALEVENT._retreatAllMonsters = false;
            SPECIALEVENT._eventStartTime = new SecNum(-1);
            SPECIALEVENT._eventEndTime = new SecNum(-1);
            SPECIALEVENT._currentAttackers = new Array();
            SPECIALEVENT._knownFlag = -1;
            SPECIALEVENT._whatsNewComplete = false;
            SPECIALEVENT.ACTIVE_OVERRIDE = false;
            SPECIALEVENT.DIR = { "N": 270, "S": 90, "E": 0, "W": 180 };
            SPECIALEVENT.TIME_OFFSETS = [new SecNum(-604800), new SecNum(-345600), new SecNum(-86400), new SecNum(0), new SecNum(604800)];
            SPECIALEVENT.CREEP = 0;
            SPECIALEVENT.GUARDIAN = 1;
            SPECIALEVENT.BANNERIMAGE = "specialevent/wmi2_banner.jpg";
            SPECIALEVENT.BONUSWAVE = 31;
            SPECIALEVENT.BONUSWAVE2 = 32;
            SPECIALEVENT.EVENTEND = 33;
            SPECIALEVENT.WAVES_DESC = ["<b>Wave 1</b><br>10 Spurtz", "<b>Wave 2</b><br>6 Zagnoid, 6 Malphus", "<b>Wave 3</b><br>8 Zagnoid, 8 Spurtz", "<b>Wave 4</b><br>10 Zagnoid, 10 Spurtz, 10 Malphus", "<b>Wave 5</b><br>32 Spurtz", "<b>Wave 6</b><br>12 Zagnoid, 5 Spurtz", "<b>Wave 7</b><br>10 Zagnoid, 40 Malphus", "<b>Wave 8</b><br>40 Spurtz, 5 Balthazar", "<b>Wave 9</b><br>20 Zagnoid, 15 Spurtz, 3 Sabnox, 10 Malphus", "<b>Wave 10</b><br>20 Zagnoid, 5 Sabnox, 5 Valgos, 10 Malphus, 5 Balthazar", "<b>Wave 11</b><br>20 Valgos, 50 Spurtz", "<b>Wave 12</b><br>16 Valgos, 36 Zagnoids, 16 Grokus", "<b>Wave 13</b><br>30 Zagnoid, 6 Sabnox, 20 Spurtz, 20 Malphus, 8 Balthazar ", "<b>Wave 14</b><br>14 Sabnox, 20 Grokus", "<b>Wave 15</b><br>40 Spurtz, 36 Balthazars, 20 Malphus", "<b>Wave 16</b><br>60 enraged Spurtz", "<b>Wave 17</b><br>24 enraged Zagnoid, 60 Spurtz, 15 Balthazar", "<b>Wave 18</b><br>20 enraged Zagnoid, 10 Sabnox, 80 Spurtz", "<b>Wave 19</b><br>240 Spurtz", "<b>Wave 20</b><br>40 Valgos, 40 Balthazar, 10 Sabnox, 30 enraged Zagnoid, 10 Grokus, 10 enraged King Wormzer", "<b>Wave 21</b><br>60 L6 Balthazar, 30 enraged Grokus", "<b>Wave 22</b><br>120 Zagnoid, 60 Sabnox, 100 Grokus", "<b>Wave 23</b><br>60 King Wormzer, 30 Balthazar", "<b>Wave 24</b><br>100 Zagnoid, 20 Balthazar, 30 enraged Sabnox, 60 Grokus", "<b>Wave 25</b><br>60 enraged L6 Zagnoid, 30 enraged King Wormzer", "<b>Wave 26</b><br>80 L6 Spurtz, 30 L6 enraged Zagnoid, 20 L6 Sabnox, 20 L6 King Wormzer", "<b>Wave 27</b><br>80 MAX Valgos, 30 enraged King Wormzer", "<b>Wave 28</b><br>80 MAX Sabnox, 40 MAX King Wormzer", "<b>Wave 29</b><br>75 MAX King Wormzer", "<b>Wave 30</b><br>40 Max enraged Sabnox, 80 MAX enraged Grokus, 32 max enraged King Wormzer", "<b>Bonus Wave</b><br>??????", "<b>Bonus Wave 2</b><br>??????"];
            SPECIALEVENT.WAVES = [[{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 6, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 6, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 8, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 8, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 16, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 3 }, 6, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 16, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 0, "level": 3 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 12, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 3 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 40, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 40, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 3, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 3 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 2 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 5, 500, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 25, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 25, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 8, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 2 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 8, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 2 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 18, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 3 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 18, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 3 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 8, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 8, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 15, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 15, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 3, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 3, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 4, 400, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 15, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 4, 400, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 15, "level": 1 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 2 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 2 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 7, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 7, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 15], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 9, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 9, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 9, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 9, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 25, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 25, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 25, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 25, "level": 4 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 12, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "rage": 30, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 12, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 30, "level": 1 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 30, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 5 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 30, "level": 2 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 30, "level": 2 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 15], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 5 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 5 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 5 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 5 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 5 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 4 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 30, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 30, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 30, "level": 4 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 30, "level": 4 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 30, "level": 1 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 30, "level": 1 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 45, "level": 6 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 60, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 30, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 30, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 30, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 6 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 3 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 3 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 3 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 3 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 25, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 25, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 25, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 25, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 6 }, 10], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 20, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 3 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 20, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 3 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 20, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 3 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 30, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 0, "level": 3 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 45, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 60, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 30, "level": 6 }, 20, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "rage": 25, "level": 3 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 40, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 40, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 30, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 25, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 45, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 45, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 10, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 20, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 15, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 30, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 60, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 32, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC2", "bounce", 25, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 6, 400, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 6, 400, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 6, 400, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 6, 400, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 40, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 50, 400, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 0, "rage": 30, "level": 1 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 50, 400, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 0, "rage": 30, "level": 1 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 50, 400, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 30, "level": 1 }, 2, { "type": SPECIALEVENT.CREEP, "wave": [["IC3", "bounce", 50, 400, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 30, "level": 1 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 10, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }], [{ "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 12, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 12, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 12, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC4", "bounce", 12, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 20, "level": 6 }, 25, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 30, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 30, "level": 6 }, 60, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 25, 400, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, { "type": SPECIALEVENT.CREEP, "wave": [["IC5", "bounce", 25, 400, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 0, "rage": 35, "level": 6 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 1, { "type": SPECIALEVENT.CREEP, "wave": [["IC7", "bounce", 15, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 45, "level": 6 }, 40, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.N, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.E, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.S, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 5, { "type": SPECIALEVENT.CREEP, "wave": [["IC6", "bounce", 5, 250, SPECIALEVENT.DIR.W, 0, 0]], "powerup": 3, "rage": 15, "level": 6 }, 45, { "type": SPECIALEVENT.CREEP, "wave": [["IC8", "bounce", 60, 250, SPECIALEVENT.DIR.N, 0, 1]], "powerup": 3, "rage": 45, "level": 6 }, 5]];
            SPECIALEVENT.DEBUGCREATURES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "IC1"];
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        if (SPECIALEVENT._setupCalled) {
            return;
        }

        if (GLOBAL._flags.activeInvasion != EnumInvasionType.WMI2) {
            return;
        }

        SPECIALEVENT._setupCalled = true;
        SPECIALEVENT._wave = new SecNum(SPECIALEVENT.GetStat("wmi2_wave"));
        SPECIALEVENT._group = 0;
        SPECIALEVENT._knownFlag = SPECIALEVENT.invasionpop | 0;
        SPECIALEVENT.InitializeTimes();
    }

    private static InitializeTimes(): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "events/wmi?type=wmi2", null, (serverData: any): void => {
            if (serverData) {
                SPECIALEVENT._eventStartTime = new SecNum(Number(serverData.start));
                SPECIALEVENT._eventEndTime = new SecNum(SPECIALEVENT._eventStartTime.Get() + 60 * 60 * 24 * 7);
            }
        });
    }

    // Use server-provided activeInvasion flag to determine which event should be active
    public static getActiveSpecialEvent(): any {
        if (GLOBAL._flags.activeInvasion == EnumInvasionType.WMI1) {
            return SPECIALEVENT_WM1;
        }

        return SPECIALEVENT;
    }

    public static updateNextWaveUI(): void {
        if (UI_BOTTOM._nextwave) {
            UI_BOTTOM._nextwave.visible = false;
        }
        if (UI_BOTTOM._nextwave_wm1) {
            UI_BOTTOM._nextwave_wm1.visible = false;
        }

        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent) {
            if (activeEvent == SPECIALEVENT && UI_BOTTOM._nextwave && UI_NEXTWAVE.ShouldDisplay()) {
                UI_BOTTOM._nextwave.visible = true;
            } else if (activeEvent == SPECIALEVENT_WM1 && UI_BOTTOM._nextwave_wm1 && UI_NEXTWAVE_WM1.ShouldDisplay()) {
                UI_BOTTOM._nextwave_wm1.visible = true;
            }
        }
    }

    public static updateWaveDisplay(waveNumber: int): void {
        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent == SPECIALEVENT && UI_BOTTOM._nextwave) {
            UI_BOTTOM._nextwave.SetWave(waveNumber);
        } else if (activeEvent == SPECIALEVENT_WM1 && UI_BOTTOM._nextwave_wm1) {
            UI_BOTTOM._nextwave_wm1.SetWave(waveNumber);
        }
    }

    public static StartRound(): void {
        if (SPECIALEVENT._active) {
            return;
        }
        SPECIALEVENT._active = true;
        if (SPECIALEVENT._wave.Get() == -1) {
            SPECIALEVENT._wave.Set(SPECIALEVENT.GetStat("wmi2_wave"));
        }
        SPECIALEVENT._group = 0;
        SPECIALEVENT._currentAttackers = new Array();
        SPECIALEVENT._retreatAllMonsters = false;
        SPECIALEVENT._randomDirection = Math.floor(Math.random() * 4) * 90;
        LOGGER.Stat([83, SPECIALEVENT._wave.Get()]);
        SPECIALEVENT.SendWave();
    }

    public static EndRound(param1: boolean, param2: boolean = false): void {
        let _loc3_: MovieClip = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: Vector<any> = null;
        let _loc8_: BFOUNDATION = null;
        if (param1) {
            LOGGER.Stat([84, SPECIALEVENT._wave.Get()]);
            SPECIALEVENT.StartRepairs();
            if (SPECIALEVENT.isMajorWave(SPECIALEVENT.wave) && SPECIALEVENT.wave != 1) {
                BTOTEM.UpgradeTotem();
            }
            _loc3_ = new WMIROUNDCOMPLETE(SPECIALEVENT.wave);
            POPUPS.Push(_loc3_, null, null, null, null, false, "now");
            SPECIALEVENT._wave.Add(1);
            SPECIALEVENT.updateWaveDisplay(SPECIALEVENT.wave);
            SPECIALEVENT.SetStat("wmi2_wave", SPECIALEVENT._wave.Get() | 0);
        } else {
            LOGGER.Stat([85, SPECIALEVENT._wave.Get()]);
            SPECIALEVENT.StartRepairs();
            _loc3_ = new WMIROUNDCOMPLETE(-1, param2);
            POPUPS.Push(_loc3_, null, null, null, null, false, "now");
        }
        if (GLOBAL._aiDesignMode) {
            _loc4_ = 0;
            _loc5_ = 0;
            _loc7_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc8_ of (_loc7_ ?? [])) {
                if (_loc8_._class != "wall" && (_loc8_._type == 53 && _loc8_._expireTime < GLOBAL.Timestamp()) === false && (_loc8_._class == "trap" && _loc8_._fired) === false) {
                    _loc4_ = (_loc4_ + _loc8_.health) | 0;
                    _loc5_ = (_loc5_ + _loc8_.maxHealth) | 0;
                }
            }
            _loc6_ = (100 - 100 / _loc5_ * _loc4_) | 0;
            GLOBAL.Message("Base is " + _loc6_ + " percent destroyed.");
        }
        SPECIALEVENT.ClearWildMonsterPowerups();
        SPECIALEVENT._active = false;
    }

    public static Surrender(): void {
        SPECIALEVENT._retreatAllMonsters = true;
        SPECIALEVENT._timeOfNextWave = -1;
        SPECIALEVENT.EndRound(false, true);
    }

    private static StartRepairs(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_.health < _loc2_.maxHealth && _loc2_._repairing == 0) {
                _loc2_.Repair();
            }
        }
    }

    private static SendWave(): void {
        let _loc1_: any[] = null;
        let _loc2_: string = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: any[] = null;
        let _loc7_: any = null;
        let _loc8_: number = NaN;
        let _loc9_: Point = null;
        let _loc10_: ChampionBase = null;
        if (SPECIALEVENT._wave.Get() >= SPECIALEVENT.WAVES.length) {
            return;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicipanic");
        } else {
            SOUNDS.PlayMusic("musicpanic");
        }
        SPECIALEVENT._spawningWaves = true;
        switch (SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group].type) {
            case SPECIALEVENT.CREEP:
                _loc1_ = as3.cast(SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group].wave, Array);
                _loc2_ = String(_loc1_[0][0]);
                _loc3_ = SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group].powerup | 0;
                _loc4_ = SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group].level | 0;
                _loc5_ = SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group].rage | 0;
                GLOBAL._wmCreaturePowerups[_loc2_] = _loc3_;
                GLOBAL._wmCreatureLevels[_loc2_] = _loc4_;
                _loc1_[0][4] = (_loc1_[0][4] + SPECIALEVENT._randomDirection) % 360;
                _loc1_[0][3] = GLOBAL._mapWidth * 0.25;
                if (_loc5_) {
                    WMATTACK._rage = _loc5_;
                }
                _loc6_ = CUSTOMATTACKS.WMIAttack(_loc1_);
                if (_loc5_) {
                    WMATTACK._rage = 0;
                }
                SPECIALEVENT._currentAttackers = SPECIALEVENT._currentAttackers.concat(_loc6_);
                break;
            case SPECIALEVENT.GUARDIAN:
                _loc8_ = ((_loc7_ = SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group]).angle + SPECIALEVENT._randomDirection) % 360;
                _loc9_ = GRID.ToISO(Math.cos(_loc8_ * 0.0174532925) * 900, Math.sin(_loc8_ * 0.0174532925) * 900, 0);
                _loc10_ = CREEPS.SpawnGuardian(_loc7_.guardianID | 0, MAP._BUILDINGTOPS, "bounce", _loc7_.level | 0, _loc9_, Number(_loc7_.direction), _loc7_.health | 0, _loc7_.foodbonus | 0, 0, true);
                SPECIALEVENT._currentAttackers.push([_loc10_]);
        }
        SPECIALEVENT._timeOfNextWave = GLOBAL.Timestamp();
        while (++SPECIALEVENT._group < SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()].length && Boolean(as3.as(SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group], Number))) {
            SPECIALEVENT._timeOfNextWave = Number(SPECIALEVENT._timeOfNextWave + SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()][SPECIALEVENT._group]);
        }
        if (SPECIALEVENT._group >= SPECIALEVENT.WAVES[SPECIALEVENT._wave.Get()].length) {
            SPECIALEVENT._spawningWaves = false;
            SPECIALEVENT._timeOfNextWave = -1;
        }
        SPECIALEVENT.updateWarningText();
    }

    public static isMajorWave(param1: int): boolean {
        switch (param1) {
            case 1:
            case 10:
            case 20:
            case 30:
            case 31:
            case 32:
                return true;
            default:
                return false;
        }
    }

    private static updateWarningText(): void {
        let _loc1_: string = KEYS.Get("wmi_warning", { "v1": String(SPECIALEVENT.wave) });
        if (SPECIALEVENT.wave == SPECIALEVENT.BONUSWAVE) {
            _loc1_ = KEYS.Get("wmi_warningbonus");
        } else if (SPECIALEVENT.wave == SPECIALEVENT.BONUSWAVE2) {
            _loc1_ = KEYS.Get("wmi_warningbonus2");
        }
        UI2._warning.Update("<font size=\"26\">" + _loc1_ + "</font>");
    }

    public static ClearWildMonsterPowerups(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        for (const $value of as3.values(GLOBAL._wmCreaturePowerups)) {
            _loc1_ = $value | 0;
            _loc1_ = 0;
        }
        for (const $value of as3.values(GLOBAL._wmCreatureLevels)) {
            _loc2_ = $value | 0;
            _loc2_ = 0;
        }
    }

    public static Tick(): void {
        let _loc1_: int = 0;
        let _loc2_: any[] = null;
        let _loc3_: uint = 0;
        if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
            return;
        }
        if (!BASE.isMainYard) {
            return;
        }
        if (GLOBAL.Timestamp() == SPECIALEVENT._lastTimestamp) {
            return;
        }
        SPECIALEVENT._lastTimestamp = GLOBAL.Timestamp();
        if (SPECIALEVENT._knownFlag != SPECIALEVENT.invasionpop) {
            SPECIALEVENT.FlagChanged();
        }
        if (SPECIALEVENT._retreatAllMonsters) {
            _loc1_ = 0;
            for (_loc2_ of as3.values(SPECIALEVENT._currentAttackers)) {
                _loc3_ = 0;
                while (_loc3_ < _loc2_.length) {
                    if (_loc2_[_loc3_]._behaviour != "retreat") {
                        _loc1_++;
                        // Original implementation had a ModeRetreat function
                        // _loc2_[_loc3_].ModeRetreat();
                        _loc2_[_loc3_].changeModeRetreat();
                    }
                    _loc3_++;
                }
            }
            if (_loc1_ == 0) {
                SPECIALEVENT._retreatAllMonsters = false;
            }
        }
        if (SPECIALEVENT._timeOfNextWave == -1) {
            return;
        }
        if (SPECIALEVENT._active) {
            GLOBAL.UpdateAFKTimer();
        }
        if (GLOBAL.Timestamp() >= SPECIALEVENT._timeOfNextWave || CREEPS._creepCount == 0) {
            SPECIALEVENT.SendWave();
        }
    }

    public static MonstersRetreating(): boolean {
        return SPECIALEVENT._retreatAllMonsters || CREEPS._creepCount > 0;
    }

    public static GetTimeUntilStart(): number {
        return SPECIALEVENT._eventStartTime.Get() - GLOBAL.Timestamp();
    }

    public static GetTimeUntilEnd(): number {
        return SPECIALEVENT._eventEndTime.Get() - GLOBAL.Timestamp();
    }

    public static TimerClicked(param1: MouseEvent): void {
        if (!SPECIALEVENT._active) {
            SPECIALEVENT.ShowDefenseEventPopup("now");
        }
    }

    public static ShowDefenseEventPopup(param1: string): void {
        let _loc2_: MovieClip = null;
        if (!WMIROUNDCOMPLETE.open && !DEFENSEEVENTPOPUP.open && !WMIEXTENSIONPOPUP.open && !SPECIALEVENT._active) {
            _loc2_ = null;
            if (SPECIALEVENT.invasionpop == 4) {
                _loc2_ = new WMIEXTENSIONPOPUP();
            } else {
                _loc2_ = new DEFENSEEVENTPOPUP(SPECIALEVENT.invasionpop | 0);
            }
            POPUPS.Push(_loc2_, null, null, null, null, false, param1);
            SPECIALEVENT.SetStat("lasttdpopup", SPECIALEVENT.invasionpop | 0);
        }
    }

    public static ShowEventEndPopup(): void {
        let _loc1_: MovieClip = null;
        if (!WMIROUNDCOMPLETE.open && !DEFENSEEVENTPOPUP.open && !WMIEXTENSIONPOPUP.open && !SPECIALEVENT._active) {
            _loc1_ = new WMIROUNDCOMPLETE(SPECIALEVENT.EVENTEND);
            POPUPS.Push(_loc1_, null, null, null, null, false, "now");
            SPECIALEVENT.SetStat("wmi_end", 1);
        }
    }

    public static EventActive(): boolean {
        if (!BASE.isMainYard) {
            return false;
        }
        if (SPECIALEVENT.ACTIVE_OVERRIDE) {
            return true;
        }
        if (SPECIALEVENT_WM1.EventActive()) {
            return false;
        }
        return SPECIALEVENT.invasionpop == 4;
    }

    public static get invasionpop(): number {
        if (SPECIALEVENT._eventStartTime.Get() <= 0) {
            return -1;
        }
        let _loc1_: int = 0;
        _loc1_ = 0;
        while (_loc1_ < SPECIALEVENT.TIME_OFFSETS.length) {
            if (GLOBAL.Timestamp() < SPECIALEVENT._eventStartTime.Get() + SPECIALEVENT.TIME_OFFSETS[_loc1_].Get()) {
                return _loc1_;
            }
            _loc1_++;
        }
        return 0;
    }

    public static AllWavesSpawned(): boolean {
        return !SPECIALEVENT._spawningWaves;
    }

    public static FlagChanged(): void {
        if (!SPECIALEVENT._whatsNewComplete) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard || TUTORIAL._stage <= 200 || GLOBAL._sessionCount < 5) {
            return;
        }
        SPECIALEVENT._knownFlag = SPECIALEVENT.invasionpop | 0;
        switch (SPECIALEVENT._knownFlag) {
            case -1:
                if (SPECIALEVENT.GetStat("lasttdpopup") != 0) {
                    SPECIALEVENT.SetStat("lasttdpopup", 0);
                }
                break;
            case 1:
            case 2:
            case 3:
            case 4:
                if (SPECIALEVENT.GetStat("lasttdpopup") < SPECIALEVENT._knownFlag) {
                    SPECIALEVENT.ShowDefenseEventPopup("now");
                }
        }
    }

    public static DEBUGOVERRIDEWAVE(param1: int): void {
        SPECIALEVENT._wave.Set(param1);
        SPECIALEVENT.updateWaveDisplay(param1);
    }

    public static DebugToggleActive(param1: boolean): void {
        SPECIALEVENT._active = param1;
    }

    public static DebugSetRound(param1: number): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: string = null;
        SPECIALEVENT.ClearWildMonsterPowerups();
        switch (param1) {
            case 1:
                _loc2_ = 0;
                _loc3_ = 1;
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
                break;
            case 2:
                _loc2_ = 0;
                _loc3_ = 6;
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
                break;
            case 3:
                _loc2_ = 3;
                _loc3_ = 6;
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (const $value of as3.values(SPECIALEVENT.DEBUGCREATURES)) {
                    _loc4_ = as3.str($value);
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
        }
    }

    public static GetStat(param1: string): int {
        let _loc2_: int = GLOBAL.StatGet(param1);
        if (_loc2_ < SPECIALEVENT._eventCount.Get() * 100) {
            _loc2_ = 0;
        } else {
            _loc2_ = (_loc2_ % 100) | 0;
        }
        return _loc2_;
    }

    public static SetStat(param1: string, param2: int): void {
        if (param2 < 0) {
            param2 = 0;
        }
        param2 = (param2 + SPECIALEVENT._eventCount.Get() * 100) | 0;
        GLOBAL.StatSet(param1, param2);
    }

    public static get wave(): int {
        return (SPECIALEVENT._wave.Get() + 1) | 0;
    }

    public static get active(): boolean {
        return SPECIALEVENT._active;
    }

    public static get numWaves(): int {
        return SPECIALEVENT.WAVES.length;
    }
}
