import { com_monsters_frontPage_messages_Message as Message } from "@game";

export class DebugMessage extends Message {
    public $ctor(): void {
        super.$ctor("debug", "debug");
    }

    public override get areRequirementsMet(): boolean {
        return false;
    }
}
