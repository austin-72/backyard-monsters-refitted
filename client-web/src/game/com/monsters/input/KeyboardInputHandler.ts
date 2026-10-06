import * as as3 from "as3";
import { ASObject, int } from "as3";
import { KeyboardEvent } from "flash/events";
import { SingletonLock, screenshot } from "@game";

export class KeyboardInputHandler extends ASObject {
    protected static s_Instance: KeyboardInputHandler = null;

    private static keyunlock: int = 0;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
    }

    protected static get singletonLock(): SingletonLock {
        return new SingletonLock();
    }

    public static get instance(): KeyboardInputHandler {
        KeyboardInputHandler.s_Instance ||= new KeyboardInputHandler(KeyboardInputHandler.singletonLock);
        return KeyboardInputHandler.s_Instance;
    }

    public OnKeyDown(param1: KeyboardEvent): void {
        if (param1.shiftKey) {
            if (KeyboardInputHandler.keyunlock == 0 && param1.keyCode == 38) {
                KeyboardInputHandler.keyunlock = 1;
            } else if (KeyboardInputHandler.keyunlock == 1 && param1.keyCode == 40) {
                KeyboardInputHandler.keyunlock = 2;
            } else if (KeyboardInputHandler.keyunlock == 2 && param1.keyCode == 37) {
                KeyboardInputHandler.keyunlock = 3;
            } else if (KeyboardInputHandler.keyunlock == 3 && param1.keyCode == 39) {
                screenshot.Show();
            } else {
                KeyboardInputHandler.keyunlock = 0;
            }
        }
    }
}
