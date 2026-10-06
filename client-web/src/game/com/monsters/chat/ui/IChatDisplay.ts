import * as as3 from "as3";
import { IEventDispatcher } from "flash/events";

export interface IChatDisplay extends IEventDispatcher {
    clearChat(): void;

    init(): void;

    push(param1: string, param2?: string, param3?: string, param4?: string, param5?: boolean): void;

    update(): void;

    readonly inputText: string;

    clearInputText(): void;
}
export const IChatDisplay = as3.iface("com.monsters.chat.ui::IChatDisplay", [IEventDispatcher]);
