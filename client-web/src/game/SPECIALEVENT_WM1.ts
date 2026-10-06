import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BTOTEM, CREEPS, CUSTOMATTACKS, ChampionBase, DEFENSEEVENTPOPUP_WM1, EnumInvasionType, GLOBAL, GRID, KEYS, LOGGER, MAP, POPUPS, SOUNDS, SPECIALEVENT, UI2, UI_BOTTOM, URLLoaderApi, WMATTACK, WMIEXTENSIONPOPUP_WM1, WMIROUNDCOMPLETE_WM1 } from "@game";

/*
 * This is the original SPECIALEVENT.as class for Wild Monster Invasion 1.
 * The original developers rewrote this class when Wild Monster Invasion 2 was released
 * instead of creating a new class.
 *
 * This file archives the original implementation for reference and renamed to SPECIALEVENT_WM1.
 */
export class SPECIALEVENT_WM1 extends ASObject {
    private static INVASIONPOP_OVERRIDE: int; // const

    private static _setupCalled: boolean;

    private static _lastTimestamp: number;

    private static _round: int;

    private static _wave: int;

    private static _randomDirection: number;

    private static _timeOfNextWave: number;

    private static _spawningWaves: boolean;

    private static _active: boolean;

    private static _isDebug: boolean;

    private static _retreatAllMonsters: boolean;

    private static _eventStartTime: number;

    private static _eventEndTime: number;

    private static _eventExtensionTime: number;

    public static _currentAttackers: any[];

    private static _knownFlag: int;

    public static WONSTAGE: any[]; // const

    private static DIR: any; // const

    private static CREEP: int; // const

    private static GUARDIAN: int; // const

    public static BONUSWAVE: int; // const

    public static BONUSWAVE2: int; // const

    public static EVENTEND: int; // const

    public static WAVES_DESC: any[]; // const

    private static WAVES: any[]; // const

    private static DEBUGCREATURES: any[]; // const

    static {
        as3.lazyStatics(this, { INVASIONPOP_OVERRIDE: 0, _setupCalled: false, _lastTimestamp: NaN, _round: 0, _wave: 0, _randomDirection: NaN, _timeOfNextWave: NaN, _spawningWaves: false, _active: false, _isDebug: false, _retreatAllMonsters: false, _eventStartTime: NaN, _eventEndTime: NaN, _eventExtensionTime: NaN, _currentAttackers: null, _knownFlag: 0, WONSTAGE: null, DIR: null, CREEP: 0, GUARDIAN: 0, BONUSWAVE: 0, BONUSWAVE2: 0, EVENTEND: 0, WAVES_DESC: null, WAVES: null, DEBUGCREATURES: null }, () => {
            SPECIALEVENT_WM1.INVASIONPOP_OVERRIDE = -1;
            SPECIALEVENT_WM1._setupCalled = false;
            SPECIALEVENT_WM1._lastTimestamp = 0;
            SPECIALEVENT_WM1._round = -1;
            SPECIALEVENT_WM1._wave = 0;
            SPECIALEVENT_WM1._randomDirection = 0;
            SPECIALEVENT_WM1._timeOfNextWave = -1;
            SPECIALEVENT_WM1._spawningWaves = false;
            SPECIALEVENT_WM1._active = false;
            SPECIALEVENT_WM1._isDebug = false;
            SPECIALEVENT_WM1._retreatAllMonsters = false;
            SPECIALEVENT_WM1._eventStartTime = -1;
            SPECIALEVENT_WM1._eventEndTime = -1;
            SPECIALEVENT_WM1._eventExtensionTime = -1;
            SPECIALEVENT_WM1._currentAttackers = new Array();
            SPECIALEVENT_WM1._knownFlag = -1;
            SPECIALEVENT_WM1.WONSTAGE = [1, 10, 20, 30, 31, 32];
            SPECIALEVENT_WM1.DIR = { "N": 270, "S": 90, "E": 0, "W": 180 };
            SPECIALEVENT_WM1.CREEP = 0;
            SPECIALEVENT_WM1.GUARDIAN = 1;
            SPECIALEVENT_WM1.BONUSWAVE = 31;
            SPECIALEVENT_WM1.BONUSWAVE2 = 32;
            SPECIALEVENT_WM1.EVENTEND = 33;
            SPECIALEVENT_WM1.WAVES_DESC = ["<b>Wave 1</b><br>5 Octo-oozes", "<b>Wave 2</b><br>4 Octo-oozes, 5 Bolts", "<b>Wave 3</b><br>5 Octo-oozes, 5 Pokeys", "<b>Wave 4</b><br>10 Pokeys, 10 Bolts", "<b>Wave 5</b><br>10 Finks", "<b>Wave 6</b><br>5 Octo-oozes, 2 Finks", "<b>Wave 7</b><br>10 Ichis, 50 Bolts", "<b>Wave 8</b><br>40 Pokeys, 8 Finks", "<b>Wave 9</b><br>10 Octo-oozes, 10 Pokeys, 10 Finks, 10 Bolts", "<b>Wave 10</b><br>8 Ichis, 8 Finks", "<b>Wave 11</b><br>10 Finks, 10 Banditos, 10 ??????", "<b>Wave 12</b><br>16 Ichis, 30 Banditos", "<b>Wave 13</b><br>16 Banditos, 30 Ichis", "<b>Wave 14</b><br>20 Ichis, 30 Banditos, 10 Fangs", "<b>Wave 15</b><br>20 Ichis, 15 Fangs", "<b>Wave 16</b><br>20 Banditos, 20 Fangs", "<b>Wave 17</b><br>24 Ichis, 36 Banditos, 15 Fangs", "<b>Wave 18</b><br>50 Banditos, 25 Fangs", "<b>Wave 19</b><br>20 Ichis, 20 Fangs, 30 Banditos", "<b>Wave 20</b><br>10 Eye-ras, 40 Banditos, 10 Project X\'s, 10 Crabatrons, Drull (L1)", "<b>Wave 21</b><br>30 Wormzers (Level 6, Splash Damage), 15 ??????", "<b>Wave 22</b><br>20 Bolts (L3), 10 Brains (L3, Invisibility), Gorgo (L3)", "<b>Wave 23</b><br>60 Crabatrons (L6), 5 Zafreetis (L5)", "<b>Wave 24</b><br>40 Pokeys (L6), 30 Ichis (L6), 20 Banditos (L6), 10 Crabatrons (L6), 5 D.A.V.E.s (L6)", "<b>Wave 25</b><br>30 Eye-ras (L6, Airburst 3), 30 Bolts (L6, Teleportation 3), 30 Wormzers (L6, Splash Damage 3), 30 Finks (L6, Claws 3), 30 Banditos (L6, Whirlwind 3), 30 Fangs (L6, Venom 3), 30 Brains (L6, Invisibility 3)", "<b>Wave 26</b><br>40 Eye-ras (L6, Airburst 3), 50 ?????? (L6), Drull (L6)", "<b>Wave 27</b><br>30 Teratorns (L6)", "<b>Wave 28</b><br>80 Project Xs (L6, Acid Spores 3), 80 Wormzers (L6, Splash Damage 3)", "<b>Wave 29</b><br>40 D.A.V.E.s (L6, Rockets 3)", "<b>Wave 30</b><br>30 D.A.V.E.s (L6, Rockets 3), 30 Wormzers (L6, Splash Damage 3), 10 Zafreetis (L5), Fomor (L6)", "<b>Bonus Wave</b><br>??????", "<b>Bonus Wave 2</b><br>??????"];
            SPECIALEVENT_WM1.WAVES = [[{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 4, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C3", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C1", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C1", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C3", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 2, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 2, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 5, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C3", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C1", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 2, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 1, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C1", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }, 5, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C3", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, 2, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.W, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 8, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 12, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 12, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 18, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 18, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 25, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 25, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 25, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C5", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C5", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 15, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 2, "level": 1, "angle": SPECIALEVENT_WM1.DIR.N, "direction": 0, "health": 12000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 30, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C11", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C11", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }, 30, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C10", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 1 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C10", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.S, 0, 1]], "powerup": 1, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 1 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C2", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 0, "level": 3 }, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 1, "level": 3, "angle": SPECIALEVENT_WM1.DIR.E, "direction": 0, "health": 120000, "foodbonus": 0 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C9", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 1, "level": 3 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 60, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 6, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 5 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C1", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C6", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 20, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C10", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C5", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C3", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C4", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C7", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C8", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C9", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C5", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 5, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 2, "level": 6, "angle": SPECIALEVENT_WM1.DIR.N, "direction": 0, "health": 60000, "foodbonus": 0 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 0, "level": 6 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C11", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 10, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 30, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C11", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.W, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 1]], "powerup": 3, "level": 6 }, 15, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.W, 0, 1]], "powerup": 3, "level": 6 }], [{ "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 3, "level": 6, "angle": SPECIALEVENT_WM1.DIR.N, "direction": 0, "health": 40000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 1]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, 30, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.E, 0, 1]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 6 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 5 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 5 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 3, "level": 5 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC1", "bounce", 50, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 3, "level": 5 }, 5, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 1, "level": 6, "angle": SPECIALEVENT_WM1.DIR.N, "direction": 0, "health": 200000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C10", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 4, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 6 }, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 2, "level": 6, "angle": SPECIALEVENT_WM1.DIR.S, "direction": 0, "health": 60000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C10", "bounce", 15, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 6, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 6 }, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 3, "level": 4, "angle": SPECIALEVENT_WM1.DIR.E, "direction": 0, "health": 40000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C12", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 3, "level": 6 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C15", "bounce", 4, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 6 }, 60, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 2, "level": 6, "angle": SPECIALEVENT_WM1.DIR.W, "direction": 0, "health": 60000, "foodbonus": 0 }, { "type": SPECIALEVENT_WM1.GUARDIAN, "guardianID": 2, "level": 6, "angle": SPECIALEVENT_WM1.DIR.E, "direction": 0, "health": 60000, "foodbonus": 0 }], [{ "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC2", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC2", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC2", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC2", "bounce", 40, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, 60, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6, "rage": 25 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 3, "level": 6, "rage": 25 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 3, "level": 6, "rage": 25 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C13", "bounce", 30, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 6, "rage": 25 }, 60, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["IC7", "bounce", 10, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 0, "level": 6, "rage": 30 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.N, 0, 0]], "powerup": 3, "level": 6, "rage": 10 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.W, 0, 0]], "powerup": 3, "level": 6, "rage": 10 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.S, 0, 0]], "powerup": 3, "level": 6, "rage": 10 }, { "type": SPECIALEVENT_WM1.CREEP, "wave": [["C14", "bounce", 5, 250, SPECIALEVENT_WM1.DIR.E, 0, 0]], "powerup": 3, "level": 6, "rage": 10 }]];
            SPECIALEVENT_WM1.DEBUGCREATURES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "IC1"];
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        if (SPECIALEVENT_WM1._setupCalled) {
            return;
        }

        if (GLOBAL._flags.activeInvasion != EnumInvasionType.WMI1) {
            return;
        }

        SPECIALEVENT_WM1._setupCalled = true;
        SPECIALEVENT_WM1._round = GLOBAL.StatGet("wmi_wave");
        SPECIALEVENT_WM1._wave = 0;
        SPECIALEVENT_WM1._knownFlag = SPECIALEVENT_WM1.invasionpop | 0;
        SPECIALEVENT_WM1.InitializeTimes();
    }

    private static InitializeTimes(): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "events/wmi?type=wmi1", null, (serverData: any): void => {
            if (serverData) {
                SPECIALEVENT_WM1._eventStartTime = Number(serverData.start);
                SPECIALEVENT_WM1._eventEndTime = Number(serverData.end);
                SPECIALEVENT_WM1._eventExtensionTime = Number(serverData.extension);
            }
        });
    }

    public static StartRound(): void {
        if (SPECIALEVENT_WM1._active) {
            return;
        }
        SPECIALEVENT_WM1._active = true;
        if (SPECIALEVENT_WM1._round == -1) {
            SPECIALEVENT_WM1._round = GLOBAL.StatGet("wmi_wave");
        }
        SPECIALEVENT_WM1._wave = 0;
        SPECIALEVENT_WM1._currentAttackers = new Array();
        SPECIALEVENT_WM1._retreatAllMonsters = false;
        SPECIALEVENT_WM1._randomDirection = Math.floor(Math.random() * 4) * 90;
        LOGGER.Stat([79, SPECIALEVENT_WM1._round]);
        SPECIALEVENT_WM1.SendWave();
    }

    public static EndRound(param1: boolean, param2: boolean = false): void {
        let _loc3_: MovieClip = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: any = undefined;
        let _loc8_: BFOUNDATION = null;
        if (param1) {
            LOGGER.Stat([80, SPECIALEVENT_WM1._round]);
            SPECIALEVENT_WM1.StartRepairs();
            if (SPECIALEVENT_WM1.isMajorWave(SPECIALEVENT_WM1._round) && SPECIALEVENT_WM1._round != 1) {
                BTOTEM.UpgradeTotem();
            }
            _loc3_ = new WMIROUNDCOMPLETE_WM1(SPECIALEVENT_WM1.wave);
            POPUPS.Push(_loc3_, null, null, null, null, false, "now");
            ++SPECIALEVENT_WM1._round;
            SPECIALEVENT.updateWaveDisplay(SPECIALEVENT_WM1.wave);
            GLOBAL.StatSet("wmi_wave", SPECIALEVENT_WM1._round);
        } else {
            LOGGER.Stat([81, SPECIALEVENT_WM1._round]);
            SPECIALEVENT_WM1.StartRepairs();
            _loc3_ = new WMIROUNDCOMPLETE_WM1(-1, param2);
            POPUPS.Push(_loc3_, null, null, null, null, false, "now");
        }
        if (GLOBAL._aiDesignMode) {
            _loc4_ = 0;
            _loc5_ = 0;
            for (_loc7_ in BASE._buildingsAll) {
                _loc8_ = as3.cast(BASE._buildingsAll[_loc7_], BFOUNDATION);
                if (!(_loc8_._class == "trap" && _loc8_._fired || _loc8_._type == 53 && _loc8_._expireTime < GLOBAL.Timestamp())) {
                    if (_loc8_._class != "wall") {
                        _loc4_ = (_loc4_ + _loc8_.health) | 0;
                        _loc5_ = (_loc5_ + _loc8_.maxHealth) | 0;
                    }
                }
            }
            _loc6_ = (100 - 100 / _loc5_ * _loc4_) | 0;
            GLOBAL.Message("Base is " + _loc6_ + " percent destroyed.");
        }
        SPECIALEVENT_WM1.ClearWildMonsterPowerups();
        SPECIALEVENT_WM1._active = false;
    }

    public static Surrender(): void {
        SPECIALEVENT_WM1._retreatAllMonsters = true;
        SPECIALEVENT_WM1._timeOfNextWave = -1;
        SPECIALEVENT_WM1.EndRound(false, true);
    }

    private static StartRepairs(): void {
        let _loc1_: BFOUNDATION = null;
        for (_loc1_ of as3.values(BASE._buildingsAll)) {
            if (_loc1_.health < _loc1_.maxHealth && _loc1_._repairing == 0) {
                _loc1_.Repair();
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
        let _loc7_: any = undefined;
        let _loc8_: number = NaN;
        let _loc9_: Point = null;
        // Original version had a CHAMPIONMONSTER.as class before the refactor to ChampionBase.as
        // var _loc10_:CHAMPIONMONSTER = null;
        let champion: ChampionBase = null;
        if (SPECIALEVENT_WM1._round >= SPECIALEVENT_WM1.WAVES.length) {
            return;
        }
        SOUNDS.PlayMusic("musicpanic");
        SPECIALEVENT_WM1._spawningWaves = true;
        switch (SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave].type) {
            case SPECIALEVENT_WM1.CREEP:
                _loc1_ = as3.cast(SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave].wave, Array);
                _loc2_ = as3.str(_loc1_[0][0]);
                _loc3_ = SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave].powerup | 0;
                _loc4_ = SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave].level | 0;
                _loc5_ = SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave].rage | 0;
                GLOBAL._wmCreaturePowerups[_loc2_] = _loc3_;
                GLOBAL._wmCreatureLevels[_loc2_] = _loc4_;
                _loc1_[0][4] = (_loc1_[0][4] + SPECIALEVENT_WM1._randomDirection) % 360;
                _loc1_[0][3] = GLOBAL._mapWidth * 0.25;
                if (_loc5_) {
                    WMATTACK._rage = _loc5_;
                }
                _loc6_ = CUSTOMATTACKS.WMIAttack(_loc1_);
                if (_loc5_) {
                    WMATTACK._rage = 0;
                }
                SPECIALEVENT_WM1._currentAttackers = SPECIALEVENT_WM1._currentAttackers.concat(_loc6_);
                break;
            case SPECIALEVENT_WM1.GUARDIAN:
                _loc7_ = SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave];
                _loc8_ = (_loc7_.angle + SPECIALEVENT_WM1._randomDirection) % 360;
                _loc9_ = GRID.ToISO(Math.cos(_loc8_ * 0.0174532925) * 900, Math.sin(_loc8_ * 0.0174532925) * 900, 0);
                champion = CREEPS.SpawnGuardian(_loc7_.guardianID | 0, MAP._BUILDINGTOPS, "bounce", _loc7_.level | 0, _loc9_, Number(_loc7_.direction), _loc7_.health | 0, _loc7_.foodbonus | 0, 0, true);
                SPECIALEVENT_WM1._currentAttackers.push([champion]);
        }
        SPECIALEVENT_WM1._timeOfNextWave = GLOBAL.Timestamp();
        while (++SPECIALEVENT_WM1._wave < SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round].length && as3.is(SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave], Number)) {
            SPECIALEVENT_WM1._timeOfNextWave = Number(SPECIALEVENT_WM1._timeOfNextWave + SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round][SPECIALEVENT_WM1._wave]);
        }
        if (SPECIALEVENT_WM1._wave >= SPECIALEVENT_WM1.WAVES[SPECIALEVENT_WM1._round].length) {
            SPECIALEVENT_WM1._spawningWaves = false;
            SPECIALEVENT_WM1._timeOfNextWave = -1;
        }
        SPECIALEVENT_WM1.updateWarningText();
    }

    private static updateWarningText(): void {
        let _loc1_: string = KEYS.Get("wmi_warning", { "v1": String(SPECIALEVENT_WM1.wave) });
        if (SPECIALEVENT_WM1.wave == SPECIALEVENT_WM1.BONUSWAVE) {
            _loc1_ = KEYS.Get("wmi_warningbonus");
        } else if (SPECIALEVENT_WM1.wave == SPECIALEVENT_WM1.BONUSWAVE2) {
            _loc1_ = KEYS.Get("wmi_warningbonus2");
        }
        UI2._warning.Update("<font size=\"26\">" + _loc1_ + "</font>");
    }

    public static ClearWildMonsterPowerups(): void {
        let _loc1_: any = undefined;
        let _loc2_: any = undefined;
        for (_loc1_ of as3.values(GLOBAL._wmCreaturePowerups)) {
            _loc1_ = null;
        }
        for (_loc2_ of as3.values(GLOBAL._wmCreatureLevels)) {
            _loc2_ = null;
        }
    }

    public static Tick(): void {
        let _loc1_: int = 0;
        let _loc2_: any[] = null;
        let _loc3_: uint = 0;
        if (Boolean(GLOBAL._flags.viximo) || Boolean(GLOBAL._flags.kongregate)) {
            return;
        }
        if (GLOBAL.Timestamp() == SPECIALEVENT_WM1._lastTimestamp) {
            return;
        }
        SPECIALEVENT_WM1._lastTimestamp = GLOBAL.Timestamp();
        if (SPECIALEVENT_WM1._knownFlag != SPECIALEVENT_WM1.invasionpop) {
            SPECIALEVENT_WM1.FlagChanged();
        }
        if (SPECIALEVENT_WM1._retreatAllMonsters) {
            _loc1_ = 0;
            for (_loc2_ of as3.values(SPECIALEVENT_WM1._currentAttackers)) {
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
                SPECIALEVENT_WM1._retreatAllMonsters = false;
            }
        }
        if (SPECIALEVENT_WM1._timeOfNextWave == -1) {
            return;
        }
        if (SPECIALEVENT_WM1._active) {
            GLOBAL.UpdateAFKTimer();
        }
        if (GLOBAL.Timestamp() >= SPECIALEVENT_WM1._timeOfNextWave || CREEPS._creepCount == 0) {
            SPECIALEVENT_WM1.SendWave();
        }
    }

    public static GetTimeUntilStart(): number {
        return SPECIALEVENT_WM1._eventStartTime - GLOBAL.Timestamp();
    }

    public static GetTimeUntilExtension(): number {
        return SPECIALEVENT_WM1._eventExtensionTime - GLOBAL.Timestamp();
    }

    public static GetTimeUntilEnd(): number {
        return SPECIALEVENT_WM1._eventEndTime - GLOBAL.Timestamp();
    }

    public static TimerClicked(param1: MouseEvent): void {
        if (!SPECIALEVENT_WM1._active) {
            if (SPECIALEVENT_WM1.invasionpop == 5) {
                SPECIALEVENT_WM1.ShowExtensionPopup("now");
            } else {
                SPECIALEVENT_WM1.ShowDefenseEventPopup("now");
            }
        }
    }

    public static ShowDefenseEventPopup(param1: string): void {
        let _loc2_: MovieClip = null;
        if (!DEFENSEEVENTPOPUP_WM1.open && !SPECIALEVENT_WM1._active) {
            _loc2_ = new DEFENSEEVENTPOPUP_WM1(SPECIALEVENT_WM1.invasionpop | 0);
            POPUPS.Push(_loc2_, null, null, null, null, false, param1);
            GLOBAL.StatSet("lasttdpopup", SPECIALEVENT_WM1.invasionpop | 0);
        }
    }

    public static ShowExtensionPopup(param1: string): void {
        let _loc2_: MovieClip = null;
        if (!WMIEXTENSIONPOPUP_WM1.open && !SPECIALEVENT_WM1._active) {
            _loc2_ = new WMIEXTENSIONPOPUP_WM1();
            POPUPS.Push(_loc2_, null, null, null, null, false, param1);
            GLOBAL.StatSet("lasttdpopup", SPECIALEVENT_WM1.invasionpop | 0);
        }
    }

    public static ShowTShirtPopup(param1: string): void {
        let _loc2_: MovieClip = null;
        if (!DEFENSEEVENTPOPUP_WM1.open && !SPECIALEVENT_WM1._active) {
            _loc2_ = new DEFENSEEVENTPOPUP_WM1(5);
            POPUPS.Push(_loc2_, null, null, null, null, false, param1);
            GLOBAL.StatSet("lasttdpopup", 6);
        }
    }

    public static ShowEventEndPopup(): void {
        let _loc1_: MovieClip = null;
        if (!WMIROUNDCOMPLETE_WM1.open && !SPECIALEVENT_WM1._active) {
            _loc1_ = new WMIROUNDCOMPLETE_WM1(SPECIALEVENT_WM1.EVENTEND);
            POPUPS.Push(_loc1_, null, null, null, null, false, "wait");
            GLOBAL.StatSet("wmi_end", 1);
        }
    }

    public static EventActive(): boolean {
        if (BASE.isOutpost || BASE.isInfernoMainYardOrOutpost) {
            return false;
        }
        return SPECIALEVENT_WM1.invasionpop == 4 || SPECIALEVENT_WM1.invasionpop == 5;
    }

    public static get invasionpop(): number {
        if (SPECIALEVENT_WM1.INVASIONPOP_OVERRIDE > 0) {
            return SPECIALEVENT_WM1.INVASIONPOP_OVERRIDE;
        }

        if (SPECIALEVENT_WM1._eventStartTime <= 0) {
            return -1;
        }

        if (GLOBAL._flags.invasionpop2 == -1) {
            return -1;
        }
        return Math.max(Number(GLOBAL._flags.invasionpop), Number(GLOBAL._flags.invasionpop2));
    }

    public static AllWavesSpawned(): boolean {
        return !SPECIALEVENT_WM1._spawningWaves;
    }

    public static FlagChanged(): void {
        SPECIALEVENT_WM1._knownFlag = SPECIALEVENT_WM1.invasionpop | 0;
        switch (SPECIALEVENT_WM1._knownFlag) {
            case -1:
            case 0:
                GLOBAL.StatSet("lasttdpopup", 0);
                break;
            case 1:
            case 2:
            case 3:
            case 4:
                if (GLOBAL.StatGet("lasttdpopup") < SPECIALEVENT_WM1._knownFlag) {
                    SPECIALEVENT_WM1.ShowDefenseEventPopup("wait");
                }
                break;
            case 5:
                if (GLOBAL.StatGet("lasttdpopup") < 5) {
                    if (SPECIALEVENT_WM1.wave == SPECIALEVENT_WM1.BONUSWAVE2 && UI_BOTTOM._nextwave_wm1 && !UI_BOTTOM._nextwave_wm1.visible) {
                        UI_BOTTOM._nextwave_wm1.visible = true;
                    }
                    SPECIALEVENT_WM1.ShowExtensionPopup("wait");
                } else if (GLOBAL.StatGet("lasttdpopup") == 5) {
                    SPECIALEVENT_WM1.ShowTShirtPopup("wait");
                }
        }
    }

    public static DEBUGOVERRIDEROUND(param1: int): void {
        SPECIALEVENT_WM1._round = param1;
        SPECIALEVENT.updateWaveDisplay(SPECIALEVENT_WM1.wave);
    }

    public static DebugToggleActive(param1: boolean): void {
        SPECIALEVENT_WM1._active = param1;
    }

    public static DebugSetRound(param1: number): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: any = undefined;
        SPECIALEVENT_WM1.ClearWildMonsterPowerups();
        switch (param1) {
            case 1:
                _loc2_ = 0;
                _loc3_ = 1;
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
                break;
            case 2:
                _loc2_ = 0;
                _loc3_ = 6;
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
                break;
            case 3:
                _loc2_ = 3;
                _loc3_ = 6;
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreatureLevels[_loc4_] = _loc3_;
                }
                for (_loc4_ of as3.values(SPECIALEVENT_WM1.DEBUGCREATURES)) {
                    GLOBAL._wmCreaturePowerups[_loc4_] = _loc2_;
                }
        }
    }

    public static get wave(): int {
        return (SPECIALEVENT_WM1._round + 1) | 0;
    }

    public static get active(): boolean {
        return SPECIALEVENT_WM1._active;
    }

    public static get numWaves(): int {
        return SPECIALEVENT_WM1.WAVES.length;
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
}
