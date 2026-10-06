import * as as3 from "as3";
import { uint } from "as3";
import { Bitmap, BitmapData, DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { Chat, EventStorePopup, GLOBAL, IReplayableEventUI, ImageCache, KEYS, MR3EventHUD_CLIP, MapRoom3, ReplayableEvent, ReplayableEventHandler } from "@game";

export class Maproom3EventHUD extends MR3EventHUD_CLIP implements IReplayableEventUI {
    static {
        as3.implement(this, [IReplayableEventUI]);
        as3.fields(this, { m_state: 0, m_event: null, m_HUDImage: null });
    }

    private static readonly k_preEventState: uint = 1;

    private static readonly k_duringEventState: uint = 2;

    private static readonly k_postEventState: uint = 3;
    private m_state: uint;
    private m_event: ReplayableEvent;
    private m_HUDImage: Bitmap;

    public $ctor(): void {
        super.$ctor();
    }

    private getCurrentState(): uint {
        if (this.m_event.hasEventEnded) {
            return Maproom3EventHUD.k_postEventState;
        }
        if (this.m_event.hasEventStarted) {
            return Maproom3EventHUD.k_duringEventState;
        }
        return Maproom3EventHUD.k_preEventState;
    }

    public get eventUI(): DisplayObject {
        return this;
    }

    public setup(param1: ReplayableEvent): void {
        this.m_event = param1;
        this.bInfo.Setup(KEYS.Get("btn_info"));
        this.updateState();
        this.update();
        this.mouseEnabled = false;
    }

    protected clickedInfoButton(param1: MouseEvent): void {
        EventStorePopup.instance.Show(0);
    }

    public update(): void {
        if (this.m_state != this.getCurrentState()) {
            this.updateState();
        }
        if (this.m_state >= Maproom3EventHUD.k_duringEventState) {
            this.tExperience.text = ">" + GLOBAL.FormatNumber(ReplayableEventHandler.eventXP) + "XP";
            this.tCountdown.text = GLOBAL.ToTime(this.m_event.timeUntilNextDate | 0, true, false, false);
        } else {
            this.tCountdown.text = GLOBAL.ToTime(this.m_event.timeUntilNextDate | 0, true);
        }
        this.resize();
    }

    private updateState(): void {
        this.m_state = this.getCurrentState();
        this.bInfo.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedInfoButton), false, 0, true);
        if (this.m_state >= Maproom3EventHUD.k_duringEventState) {
            this.gotoAndStop(2);
            this.tExperience.visible = true;
            ImageCache.GetImageWithCallBack(this.m_event.eventHUDImageURL, as3.bind(this, this.loadedHUDImage));
        } else {
            this.gotoAndStop(1);
            this.tExperience.visible = false;
            ImageCache.GetImageWithCallBack(this.m_event.preEventHUDImageURL, as3.bind(this, this.loadedHUDImage));
        }
    }

    private resize(): void {
        this.x = GLOBAL._SCREEN.x;
        if (Boolean(MapRoom3.mapRoom3WindowHUD) && Boolean(MapRoom3.mapRoom3WindowHUD.leftMenuButtonsBar)) {
            this.y = MapRoom3.mapRoom3WindowHUD.leftMenuButtonsBar.y;
            this.y -= this.height;
        } else if (Chat._bymChat && Chat._bymChat.chatBox && Boolean(Chat._bymChat.chatBox.background)) {
            this.y = Chat._bymChat.y + Chat._bymChat.chatBox.background.y;
            this.y -= this.height;
        } else {
            this.y = GLOBAL._SCREEN.y + (GLOBAL._SCREEN.height - this.height);
        }
    }

    private loadedHUDImage(param1: string, param2: BitmapData): void {
        if (this.m_HUDImage) {
            this.removeChild(this.m_HUDImage);
        }
        this.m_HUDImage = new Bitmap(param2);
        this.addChildAt(this.m_HUDImage, 0);
    }
}
