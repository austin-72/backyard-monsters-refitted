import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Stage } from "flash/display";
import { KeyboardEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Dictionary, getTimer } from "flash/utils";
import { ConsoleCommands, ConsoleView, GLOBAL } from "@game";

export class Console extends ASObject {
    public static readonly PRINT: string = "print";

    public static readonly WARNING: string = "warning";

    public static readonly ERROR: string = "error";

    public static readonly keyCodes: Vector<uint> = Vector.from([223, 192], uint);

    public static view: ConsoleView = null;

    private static _commands: Dictionary = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static initialize(param1: Stage): void {
        if (!GLOBAL._aiDesignMode) {
            return;
        }
        Console.view = new ConsoleView();
        Console._commands = new Dictionary();
        param1.addChild(Console.view);
        param1.tabChildren = false;
        Console.view.deactivate();
        param1.addEventListener(KeyboardEvent.KEY_UP, Console.onKeyDown);
        ConsoleCommands.initialize();
    }

    protected static onKeyDown(param1: KeyboardEvent): void {
        if (Console.isKey(param1.keyCode) && Boolean(Console.view)) {
            Console.view.toggleActive();
            param1.stopImmediatePropagation();
        }
    }

    public static warning(param1: string = "", param2: boolean = false): void {
        Console.print("WARNING: " + param1, param2, Console.WARNING);
    }

    public static print(param1: any, param2: boolean = false, param3: string = "print"): void {
        let _loc5_: string = null;
        if (!GLOBAL._aiDesignMode) {
            return;
        }
        if (!(as3.is(param1, String))) {
            param1 = Object(param1).toString();
        }
        if (!GLOBAL._aiDesignMode) {
            return;
        }
        let _loc4_: int = (getTimer() / 1000) | 0;
        if (param2 && !ExternalInterface.available) {
            param1 = Console.getSource() + "|| " + param1;
        }
        Console.view.addLogMessage(param3, "", as3.str(param1));
    }

    public static processLine(param1: string): string {
        let arguments_: any[] = Array.from(arguments);
        let _loc6_: number = NaN;
        let _loc3_: int = (param1.indexOf(" ") + 1) | 0;
        let _loc4_: string = param1.substring(0, Number(!(!_loc3_) ? _loc3_ - 1 : param1.length)).toLowerCase();
        let _loc5_: Function = null;
        if ((_loc5_ = Console._commands.get(_loc4_)) != null) {
            arguments_ = [];
            _loc6_ = param1.indexOf(",", _loc3_);
            arguments_.push(param1.substring(_loc3_, Number(_loc6_ != -1 ? _loc6_ : param1.length)));
            _loc3_ = _loc6_ | 0;
            while (_loc6_ != -1) {
                arguments_.push(param1.substring(_loc3_, _loc6_));
                _loc6_ = param1.indexOf(",", _loc6_);
            }
            return as3.str(_loc5_.apply(null, arguments_));
        }
        Console.view.addLogMessage(Console.WARNING, "", "INVALID COMMAND");
        return null;
    }

    public static registerCommand(param1: string, param2: Function): void {
        Console._commands.set(param1.toLowerCase(), param2);
    }

    public static getSource(param1: uint = 4): string {
        if (ExternalInterface.available) {
            return "";
        }
        let _loc2_: string = Console.getStackTrace();
        _loc2_ = String(_loc2_.split("at ")[param1]);
        if (!_loc2_) {
            return "invalid stack trace";
        }
        let _loc3_: string = _loc2_.substring(_loc2_.lastIndexOf(":"), _loc2_.indexOf("]"));
        _loc2_ = _loc2_.substring(0, _loc2_.indexOf("()") + 2);
        _loc2_ = _loc2_.replace("Function", "");
        _loc2_ = _loc2_.replace("$", "");
        while (_loc2_.search("/") != -1) {
            _loc2_ = _loc2_.replace("/", ".");
        }
        return _loc2_ + _loc3_;
    }

    public static getStackTrace(): string {
        let stackTrace: string = null;
        try {
            throw new Error();
        } catch (e) {
            stackTrace = String(e.getStackTrace());
        }
        return stackTrace;
    }

    public static isKey(param1: uint): boolean {
        let _loc2_: int = 0;
        while (_loc2_ < Console.keyCodes.length) {
            if (as3.vget(Console.keyCodes, _loc2_) == param1) {
                return true;
            }
            _loc2_++;
        }
        return false;
    }

    public static get commands(): Dictionary {
        return Console._commands;
    }
}
