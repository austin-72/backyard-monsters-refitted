import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, Shape, Sprite, Stage } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Keyboard } from "flash/ui";
import { setTimeout } from "flash/utils";
import { BYMChat, Chat, GLOBAL, IoLeaderboards, LOGIN, SOUNDS } from "@game";

/**
 * Inferno-only: the menu a player's name opens in the chat (the user's, 2 October): Send a message,
 * Ignore / Unignore, Jump to their yard (on the player's own world: IoLeaderboards knows where it is),
 * Find on the leaderboards. Closed by a click elsewhere, Escape, or once a choice is made.
 */
export class IoChatMenu extends ASObject {
    private static readonly W: int = 190;

    private static readonly ROW_H: int = 26;

    private static _mc: Sprite = null;

    public static get isOpen(): boolean {
        return IoChatMenu._mc != null && IoChatMenu._mc.parent != null;
    }

    /**
     * `param6`: {staff: "admin" | "mod" | null (the viewer's role), lineId, channel (the clicked line),
     * targetRole}: staff also get Delete line and Mute (the server checks every request).
     */
    public static Show(param1: string, param2: string, param3: boolean, param4: number, param5: number, param6: any = null): void {
        let uid: string = null;
        let name: string = null;
        let lineId: string = null;
        let channel: string = null;
        let mc: Sprite = null;
        IoChatMenu.Hide();
        uid = param1;
        name = param2 ? param2 : "Player " + param1;
        let me: boolean = uid == String(LOGIN._playerID);
        let items: any[] = [];
        if (!me) {
            items.push(["Send a message", "ioChatMenuMessage", (): void => {
                BYMChat.ioMessagePlayer(uid, name);
            }]);
            items.push([param3 ? "Unignore" : "Ignore", "ioChatMenuIgnore", (): void => {
                if (Chat._bymChat == null) {
                    return;
                }
                if (param3) {
                    Chat._bymChat.unignoreUser(uid);
                } else {
                    Chat._bymChat.ignoreUser(uid, name);
                }
            }]);
            if (!param3) {
                items.push(["Jump to their yard", "ioChatMenuJump", (): void => {
                    IoLeaderboards.JumpToPlayer(Number(uid) | 0, name);
                }]);
            }
        }
        items.push(["Find on the leaderboards", "ioChatMenuFind", (): void => {
            IoLeaderboards.ShowPlayer(Number(uid) | 0, name);
        }]);
        let opts: any = param6 || {};
        let staff: string = opts.staff ? String(opts.staff) : null;
        if (staff && !me && Chat._bymChat != null) {
            let mod: any[] = [];
            lineId = opts.lineId ? String(opts.lineId) : null;
            channel = opts.channel ? String(opts.channel) : null;
            if (lineId && channel) {
                mod.push(["Delete this line", "ioChatMenuDelete", (): void => {
                    Chat._bymChat.ioDeleteLine(channel, lineId);
                }]);
            }
            let targetRole: string = opts.targetRole ? String(opts.targetRole) : null;
            if (targetRole != "admin" && (targetRole != "mod" || staff == "admin")) {
                for (let m of as3.values([["Mute 10 minutes", 10, "ioChatMenuMute10"], ["Mute 1 hour", 60, "ioChatMenuMute60"], ["Mute 1 day", 1440, "ioChatMenuMute1440"], ["Unmute", 0, "ioChatMenuUnmute"]])) {
                    mod.push([m[0], m[2], IoChatMenu.muteFn(uid, m[1] | 0)]);
                }
            }
            if (mod.length) {
                items.push(["-"]);
                items = items.concat(mod);
            }
        }
        mc = new Sprite();
        mc.name = "ioChatMenu";
        let rows: int = 0;
        let seps: int = 0;
        for (let it of as3.values(items)) {
            if (it[0] == "-") {
                seps++;
            } else {
                rows++;
            }
        }
        let h: int = (30 + rows * IoChatMenu.ROW_H + seps * 20 + 6) | 0;
        let bg: Shape = new Shape();
        bg.graphics.lineStyle(2, 14708778, 1);
        bg.graphics.beginFill(1970704, 0.97);
        bg.graphics.drawRoundRect(0, 0, IoChatMenu.W, h, 12, 12);
        bg.graphics.endFill();
        bg.graphics.lineStyle(1, 5913126, 1);
        bg.graphics.moveTo(8, 29);
        bg.graphics.lineTo(IoChatMenu.W - 8, 29);
        mc.addChild(bg);
        mc.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let title: TextField = IoChatMenu.label(BYMChat.ioEsc(name), 13, 16765514, true);
        title.x = 10;
        title.y = 6;
        title.width = IoChatMenu.W - 20;
        mc.addChild(title);
        let y: int = 33;
        for (let i: int = 0; i < items.length; i++) {
            if (items[i][0] == "-") {
                // (the moderation part: staff only)
                let line: Shape = new Shape();
                line.graphics.lineStyle(1, 5913126, 1);
                line.graphics.moveTo(8, y + 4);
                line.graphics.lineTo(IoChatMenu.W - 8, y + 4);
                mc.addChild(line);
                let head: TextField = IoChatMenu.label("Moderation", 10, 14708832, true);
                head.x = 10;
                head.y = y + 4;
                mc.addChild(head);
                y += 20;
                continue;
            }
            mc.addChild(IoChatMenu.row(as3.str(items[i][0]), as3.str(items[i][1]), items[i][2], y));
            y += IoChatMenu.ROW_H;
        }
        // Above the click (the chat is at the bottom of the screen), kept on the screen. On the stage itself:
        // the chat sits over the game's top layer, which hid the menu's lower rows behind its lines.
        let stage: Stage = GLOBAL._ROOT.stage;
        mc.x = Math.max(4, Math.min(stage.stageWidth - IoChatMenu.W - 4, param4 + 6));
        mc.y = Math.max(4, Math.min(stage.stageHeight - h - 4, param5 - h - 6));
        stage.addChild(mc);
        IoChatMenu._mc = mc;
        SOUNDS.Play("click1");
        // (after this click has finished: it would close the menu at once)
        setTimeout((): void => {
            if (IoChatMenu._mc == mc && mc.stage) {
                mc.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoChatMenu.onStageDown, true);
                mc.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoChatMenu.onKey);
            }
        }, 0);
    }

    private static muteFn(param1: string, param2: int): Function {
        return (): void => {
            if (Chat._bymChat != null) {
                Chat._bymChat.ioMute(param1, param2);
            }
        };
    }

    public static Hide(): void {
        if (IoChatMenu._mc == null) {
            return;
        }
        if (IoChatMenu._mc.stage) {
            IoChatMenu._mc.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoChatMenu.onStageDown, true);
            IoChatMenu._mc.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoChatMenu.onKey);
        }
        if (IoChatMenu._mc.parent) {
            IoChatMenu._mc.parent.removeChild(IoChatMenu._mc);
        }
        IoChatMenu._mc = null;
    }

    private static onStageDown(param1: MouseEvent): void {
        if (IoChatMenu._mc != null && !IoChatMenu._mc.contains(as3.as(param1.target, DisplayObject))) {
            IoChatMenu.Hide();
        }
    }

    private static onKey(param1: KeyboardEvent): void {
        if (param1.keyCode == Keyboard.ESCAPE) {
            IoChatMenu.Hide();
        }
    }

    private static row(param1: string, param2: string, param3: Function, param4: int): Sprite {
        let hover: Shape = null;
        let b: Sprite = new Sprite();
        b.name = param2;
        b.buttonMode = true;
        b.mouseChildren = false;
        b.x = 4;
        b.y = param4;
        hover = new Shape();
        hover.graphics.beginFill(6961678, 1);
        hover.graphics.drawRoundRect(0, 0, IoChatMenu.W - 8, IoChatMenu.ROW_H - 2, 8, 8);
        hover.graphics.endFill();
        hover.alpha = 0;
        b.addChild(hover);
        let t: TextField = IoChatMenu.label(param1, 12, 15918808, false);
        t.x = 8;
        t.y = 4;
        b.addChild(t);
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hover.alpha = 1;
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hover.alpha = 0;
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            IoChatMenu.Hide();
            SOUNDS.Play("click1");
            param3();
        });
        return b;
    }

    private static label(param1: string, param2: int, param3: uint, param4: boolean): TextField {
        let t: TextField = new TextField();
        t.defaultTextFormat = new TextFormat("Verdana", param2, param3, param4);
        t.selectable = false;
        t.mouseEnabled = false;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.htmlText = param1;
        return t;
    }
}
