import { KeywordMessage } from "@game";

export class BrukkargWarEndMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("event_bruwarfinal");
    }
}
