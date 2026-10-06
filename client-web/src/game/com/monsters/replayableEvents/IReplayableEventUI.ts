import * as as3 from "as3";
import { DisplayObject } from "flash/display";
import { IEventDispatcher } from "flash/events";
import { ReplayableEvent } from "@game";

export interface IReplayableEventUI extends IEventDispatcher {
    readonly eventUI: DisplayObject;

    setup(param1: ReplayableEvent): void;

    update(): void;
}
export const IReplayableEventUI = as3.iface("com.monsters.replayableEvents::IReplayableEventUI", [IEventDispatcher]);
