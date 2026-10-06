import * as as3 from "as3";
import { int, uint } from "as3";
import { Event, KeyboardEvent, MouseEvent } from "flash/events";
import { Keyboard } from "flash/ui";
import { EnumYardType, GLOBAL, IMapRoomCell, KEYS, MapRoomManager, MapRoomPopupJump, POPUPS } from "@game";

export class Maproom3JumpPopup extends MapRoomPopupJump {
    static {
        as3.fields(this, { targetCell: null });
    }

    public static readonly k_clickedJump: string = "clickedJumpButton";
    public targetCell: IMapRoomCell;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.addedToStage));
    }

    protected addedToStage(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.addedToStage));
        this.tMessage.htmlText = KEYS.Get("label_jumptolocation");
        this.tX.htmlText = "";
        this.tX.addEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.keyUpOnX));
        this.tY.htmlText = "";
        this.tY.addEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.keyUpOnY));
        this.bJump.SetupKey("btn_jump");
        this.bJump.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedJump));
        this.mcFrame.Setup(true);
        this.stage.focus = this.tX;
    }

    protected keyUpOnY(param1: KeyboardEvent): void {
        let _loc2_: uint = param1.keyCode;
        if (_loc2_ == Keyboard.NUMPAD_ENTER || _loc2_ == Keyboard.ENTER) {
            this.clickedJump();
        }
    }

    protected keyUpOnX(param1: KeyboardEvent): void {
        let _loc2_: uint = param1.keyCode;
    }

    protected clickedJump(param1: MouseEvent = null): void {
        this.targetCell = MapRoomManager.instance.FindCell(Number(this.tX.text) | 0, Number(this.tY.text) | 0);
        if (!this.targetCell || this.targetCell.baseType == EnumYardType.BORDER) {
            GLOBAL.Message(KEYS.Get("map_coordinateoffmap"));
            return;
        }
        this.dispatchEvent(new Event(Maproom3JumpPopup.k_clickedJump));
    }

    public Hide(): void {
        this.tX.removeEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.keyUpOnX));
        this.tY.removeEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.keyUpOnY));
        this.bJump.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedJump));
        POPUPS.Next();
    }
}
