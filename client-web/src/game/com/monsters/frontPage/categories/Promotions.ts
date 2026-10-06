import { Category } from "@game";

export class Promotions extends Category {
    public $ctor(): void {
        super.$ctor();
        this.name = "Promotions";
        this.priority = 1;
        this._doesViewRepeatedly = false;
    }
}
