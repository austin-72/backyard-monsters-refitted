import { ASObject, int } from "as3";
import { KeyboardEvent } from "flash/events";
import { Keyboard } from "flash/ui";
import { getTimer } from "flash/utils";

export class ArrowKeyState extends ASObject {
    private static _leftPressed: boolean = false;

    private static _rightPressed: boolean = false;

    private static _lastX: int = 0;

    private static _upPressed: boolean = false;

    private static _downPressed: boolean = false;

    private static _lastY: int = 0;

    private static readonly MINIMUM_LOG_DURATION: int = 500;

    private static _startPress: int = 0;

    private static _logged: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Reset(): void {
        ArrowKeyState._leftPressed = ArrowKeyState._rightPressed = ArrowKeyState._upPressed = ArrowKeyState._downPressed = false;
        ArrowKeyState._lastX = ArrowKeyState._lastY = 0;
    }

    public static KeyDown(param1: KeyboardEvent): void {
        let _loc2_: boolean = true;
        switch (param1.keyCode) {
            case Keyboard.LEFT:
                ArrowKeyState._leftPressed = true;
                ArrowKeyState._lastX = 1;
                break;
            case Keyboard.RIGHT:
                ArrowKeyState._rightPressed = true;
                ArrowKeyState._lastX = -1;
                break;
            case Keyboard.UP:
                ArrowKeyState._upPressed = true;
                ArrowKeyState._lastY = 1;
                break;
            case Keyboard.DOWN:
                ArrowKeyState._downPressed = true;
                ArrowKeyState._lastY = -1;
                break;
            default:
                _loc2_ = false;
        }
        if (!ArrowKeyState._logged && _loc2_ && !ArrowKeyState._startPress) {
            ArrowKeyState._startPress = getTimer();
        }
    }

    public static KeyUp(param1: KeyboardEvent): void {
        let _loc2_: boolean = true;
        switch (param1.keyCode) {
            case Keyboard.LEFT:
                ArrowKeyState._leftPressed = false;
                break;
            case Keyboard.RIGHT:
                ArrowKeyState._rightPressed = false;
                break;
            case Keyboard.UP:
                ArrowKeyState._upPressed = false;
                break;
            case Keyboard.DOWN:
                ArrowKeyState._downPressed = false;
                break;
            case Keyboard.CONTROL:
                ArrowKeyState._upPressed = ArrowKeyState._downPressed = ArrowKeyState._leftPressed = ArrowKeyState._rightPressed = false;
                break;
            default:
                _loc2_ = false;
        }
        if (!ArrowKeyState._logged && _loc2_ && Boolean(ArrowKeyState._startPress)) {
            if (getTimer() - ArrowKeyState._startPress >= ArrowKeyState.MINIMUM_LOG_DURATION) {
                ArrowKeyState._logged = true;
            }
            ArrowKeyState._startPress = 0;
        }
    }

    public static get ArrowKeyPressed(): boolean {
        return ArrowKeyState._upPressed || ArrowKeyState._downPressed || ArrowKeyState._leftPressed || ArrowKeyState._rightPressed;
    }

    public static get xDir(): int {
        let _loc1_: int = 0;
        if (ArrowKeyState._leftPressed && ArrowKeyState._rightPressed) {
            _loc1_ = ArrowKeyState._lastX;
        } else if (ArrowKeyState._leftPressed) {
            _loc1_ = 1;
        } else if (ArrowKeyState._rightPressed) {
            _loc1_ = -1;
        }
        return _loc1_;
    }

    public static get yDir(): int {
        let _loc1_: int = 0;
        if (ArrowKeyState._upPressed && ArrowKeyState._downPressed) {
            _loc1_ = ArrowKeyState._lastY;
        } else if (ArrowKeyState._upPressed) {
            _loc1_ = 1;
        } else if (ArrowKeyState._downPressed) {
            _loc1_ = -1;
        }
        return _loc1_;
    }
}
