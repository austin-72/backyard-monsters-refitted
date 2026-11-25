import * as as3 from "as3";
import { int } from "as3";
import { Shape, Sprite } from "flash/display";
import { Event } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, GLOBAL, IoGauntlet, IoSiege, KEYS, MAPROOM_DESCENT, MapRoomManager } from "@game";

/**
 * Inferno-only (QoL #82, 14 October): the destruction bar with its 90% line in every map attack on a yard that is
 * taken over at 90% (an outpost or a tribe's yard), as Moloch's Gauntlet already had. Not in the Gauntlet (its own
 * bar), a Siege, the Descent or a player's main yard.
 */
export class IoTakeoverBar {
    private static readonly W: int = 260;

    private static readonly H: int = 12;

    private static readonly LINE: int = 90;

    private static _bar: Sprite = null;

    private static _fill: Shape = null;

    private static _text: TextField = null;

    private static _ticks: int = 0;

    private static _on: boolean = false;

    public static Setup(stage: any): void {
        if (IoTakeoverBar._on || !GLOBAL.INFERNO_ONLY || !stage) {
            return;
        }
        IoTakeoverBar._on = true;
        stage.addEventListener(Event.ENTER_FRAME, IoTakeoverBar.tick);
    }

    /** Shown in this attack? */
    public static get applies(): boolean {
        let mode: string = GLOBAL.mode;
        if (mode != GLOBAL.e_BASE_MODE.ATTACK && mode != GLOBAL.e_BASE_MODE.WMATTACK) {
            return false;
        }
        if (!MapRoomManager.instance.isInMapRoom2 || IoGauntlet.isGauntletBase(BASE._loadedBaseID) || IoSiege.inAttack() || MAPROOM_DESCENT.InDescent) {
            return false;
        }
        return mode == GLOBAL.e_BASE_MODE.WMATTACK || BASE.isOutpost;
    }

    private static tick(e: Event): void {
        if (++IoTakeoverBar._ticks % 6 != 0) {
            return;
        }
        if (!IoTakeoverBar.applies || !GLOBAL._layerUI) {
            if (IoTakeoverBar._bar) {
                IoTakeoverBar._bar.visible = false;
            }
            return;
        }
        if (!IoTakeoverBar._bar) {
            IoTakeoverBar.draw();
        }
        if (IoTakeoverBar._bar.parent != GLOBAL._layerUI) {
            GLOBAL._layerUI.addChild(IoTakeoverBar._bar);
        }
        let destroyed: int = IoGauntlet.percentDestroyed();
        let g: any = IoTakeoverBar._fill.graphics;
        g.clear();
        g.beginFill((destroyed >= IoTakeoverBar.LINE ? 0x4CC34C : 0xE0501C) >>> 0, 1);
        g.drawRect(1, 1, Math.max(0, (IoTakeoverBar.W - 2) * Math.min(100, destroyed) / 100), IoTakeoverBar.H - 2);
        g.endFill();
        IoTakeoverBar._text.text = KEYS.Get("io_takeover_bar", { "v1": destroyed, "v2": IoTakeoverBar.LINE });
        IoTakeoverBar._bar.x = (GLOBAL._SCREENCENTER.x - IoTakeoverBar.W * 0.5) | 0;
        IoTakeoverBar._bar.y = (GLOBAL._SCREEN.y + 100) | 0;
        IoTakeoverBar._bar.visible = true;
        if (IoTakeoverBar._bar.parent) {
            IoTakeoverBar._bar.parent.setChildIndex(IoTakeoverBar._bar, (IoTakeoverBar._bar.parent.numChildren - 1) | 0);
        }
    }

    private static draw(): void {
        let bar: Sprite = new Sprite();
        bar.name = "ioTakeoverBar";
        bar.mouseEnabled = false;
        bar.mouseChildren = false;
        bar.graphics.beginFill(1706501, 0.8);
        bar.graphics.drawRoundRect(-8, -24, IoTakeoverBar.W + 16, IoTakeoverBar.H + 32, 12, 12);
        bar.graphics.endFill();
        bar.graphics.lineStyle(1, 9071173, 1);
        bar.graphics.beginFill(3811866, 1);
        bar.graphics.drawRect(0, 0, IoTakeoverBar.W, IoTakeoverBar.H);
        bar.graphics.endFill();
        IoTakeoverBar._fill = new Shape();
        bar.addChild(IoTakeoverBar._fill);
        let line: Shape = new Shape();
        line.graphics.lineStyle(2, 16777215, 1);
        line.graphics.moveTo(IoTakeoverBar.W * IoTakeoverBar.LINE / 100, -3);
        line.graphics.lineTo(IoTakeoverBar.W * IoTakeoverBar.LINE / 100, IoTakeoverBar.H + 3);
        bar.addChild(line);
        let t: TextField = new TextField();
        t.selectable = false;
        t.mouseEnabled = false;
        t.width = IoTakeoverBar.W;
        t.height = 20;
        t.defaultTextFormat = new TextFormat("Verdana", 12, 16777215, true, false, false, null, null, TextFormatAlign.CENTER);
        t.y = -21;
        t.filters = [new GlowFilter(0, 1, 2, 2, 6, 1)];
        bar.addChild(t);
        IoTakeoverBar._text = t;
        IoTakeoverBar._bar = bar;
    }
}
